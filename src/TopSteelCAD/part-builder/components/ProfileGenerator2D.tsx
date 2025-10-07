// @ts-nocheck
/**
 * Composant éditeur 2D pour la création de profils personnalisés
 * Utilise Three.js en mode OrthographicCamera pour un éditeur CAO 2D
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  Point2D,
  GeometrySegment,
  SegmentType,
  Contour2D,
  Shape2D,
  CustomProfile
} from '../../3DLibrary/types/custom-profile.types';
import { createCustomProfile, createSimpleContour } from '../../3DLibrary/utils/customProfileHelpers';

type DrawMode = 'select' | 'line' | 'rectangle' | 'circle' | 'polygon' | 'arc' | 'fillet' | 'pan';

enum SnapPointType {
  GRID = 'GRID',
  ENDPOINT = 'ENDPOINT',
  MIDPOINT = 'MIDPOINT',
  CENTER = 'CENTER'
}

interface SnapPoint {
  type: SnapPointType;
  position: Point2D;
  description?: string;
}

interface GridSettings {
  enabled: boolean;
  spacing: number;
  visible: boolean;
  snapDistance: number;
  majorInterval: number;
  minorInterval: number;
  majorColor: string;
  minorColor: string;
  backgroundColor: string;
}

interface ProfileGenerator2DProps {
  onProfileCreated?: (profile: CustomProfile) => void;
  onClose?: () => void;
}

export const ProfileGenerator2D: React.FC<ProfileGenerator2DProps> = ({
  onProfileCreated,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);

  const [drawMode, setDrawMode] = useState<DrawMode>('select');
  const [currentPoints, setCurrentPoints] = useState<Point2D[]>([]);
  const [segments, setSegments] = useState<GeometrySegment[]>([]);
  const [mousePosition, setMousePosition] = useState<Point2D>({ x: 0, y: 0 });
  const [snapPoint, setSnapPoint] = useState<SnapPoint | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSurfaceClosed, setIsSurfaceClosed] = useState(false);
  const [intersections, setIntersections] = useState<Array<{segmentIndex1: number, segmentIndex2: number, point: Point2D}>>([]);

  // Gestion intelligente des contours multiples
  interface ClosedContour {
    id: string;
    segments: GeometrySegment[];
    isHole: boolean; // true si c'est un trou, false si c'est de la matière
    parentId?: string; // ID du contour parent (pour les trous)
  }
  const [closedContours, setClosedContours] = useState<ClosedContour[]>([]);

  // Paramètres de grille
  const [gridSettings] = useState<GridSettings>({
    enabled: true,
    spacing: 10,
    visible: true,
    snapDistance: 20,
    majorInterval: 5,
    minorInterval: 1,
    majorColor: '#666666',
    minorColor: '#cccccc',
    backgroundColor: '#f5f5f5'
  });

  // Initialisation de Three.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(gridSettings.backgroundColor);
    sceneRef.current = scene;

    // Camera orthographique pour vue 2D
    const aspect = width / height;
    const frustumSize = 500;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Raycaster
    raycasterRef.current = new THREE.Raycaster();

    // Créer la grille
    createGrid(scene, gridSettings);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
    };
  }, []);

  // Créer la grille
  const createGrid = (scene: THREE.Scene, settings: GridSettings) => {
    if (!settings.visible) return;

    const gridGroup = new THREE.Group();
    gridGroup.name = 'grid';

    const size = 1000;
    const divisions = size / settings.spacing;

    // Grille principale
    const gridHelper = new THREE.GridHelper(size, divisions, settings.majorColor, settings.minorColor);
    gridHelper.rotation.x = Math.PI / 2;
    gridGroup.add(gridHelper);

    // Axes X et Y
    const axesHelper = new THREE.AxesHelper(size / 2);
    gridGroup.add(axesHelper);

    scene.add(gridGroup);
  };

  // Convertir coordonnées écran -> monde
  const screenToWorld = (screenX: number, screenY: number): Point2D => {
    if (!canvasRef.current || !cameraRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(cameraRef.current);

    return { x: vector.x, y: vector.y };
  };

  // Snap à la grille
  const snapToGrid = (point: Point2D): Point2D => {
    if (!gridSettings.enabled) return point;

    const spacing = gridSettings.spacing;
    return {
      x: Math.round(point.x / spacing) * spacing,
      y: Math.round(point.y / spacing) * spacing
    };
  };

  // Détecter les points d'accroche
  const findSnapPoint = (worldPos: Point2D): SnapPoint | null => {
    if (!gridSettings.enabled) return null;

    // Tolérance de snap = 1/4 de l'espacement de grille
    const snapTolerance = gridSettings.spacing / 4;
    const firstPointTolerance = gridSettings.spacing * 1.5; // Tolérance plus grande pour le premier point

    // PRIORITÉ 1: Snap au premier point du contour actif (pour fermer la surface)
    const currentSegments = getCurrentContourSegments();
    if (currentSegments.length > 0) {
      const firstSeg = currentSegments[0];
      let firstPoint: Point2D | null = null;

      if (firstSeg.type === SegmentType.LINE) {
        firstPoint = firstSeg.start;
      } else if (firstSeg.type === SegmentType.ARC) {
        const angle = firstSeg.startAngle;
        firstPoint = {
          x: firstSeg.center.x + firstSeg.radius * Math.cos(angle),
          y: firstSeg.center.y + firstSeg.radius * Math.sin(angle)
        };
      }

      if (firstPoint) {
        const distToFirst = Math.sqrt(
          Math.pow(firstPoint.x - worldPos.x, 2) + Math.pow(firstPoint.y - worldPos.y, 2)
        );
        if (distToFirst < firstPointTolerance) {
          return {
            type: SnapPointType.ENDPOINT,
            position: firstPoint,
            description: '🔒 Premier point (cliquez pour fermer)'
          };
        }
      }
    }

    // PRIORITÉ 2: Snap aux extrémités de segments du contour actif
    for (let i = 0; i < currentSegments.length; i++) {
      const seg = currentSegments[i];
      if (seg.type === SegmentType.LINE) {
        // Point de départ
        const distStart = Math.sqrt(
          Math.pow(seg.start.x - worldPos.x, 2) + Math.pow(seg.start.y - worldPos.y, 2)
        );
        if (distStart < snapTolerance) {
          return {
            type: SnapPointType.ENDPOINT,
            position: seg.start,
            description: `Extrémité segment ${i + 1}`
          };
        }

        // Point de fin
        const distEnd = Math.sqrt(
          Math.pow(seg.end.x - worldPos.x, 2) + Math.pow(seg.end.y - worldPos.y, 2)
        );
        if (distEnd < snapTolerance) {
          return {
            type: SnapPointType.ENDPOINT,
            position: seg.end,
            description: `Extrémité segment ${i + 1}`
          };
        }

        // Point milieu
        const midPoint = {
          x: (seg.start.x + seg.end.x) / 2,
          y: (seg.start.y + seg.end.y) / 2
        };
        const distMid = Math.sqrt(
          Math.pow(midPoint.x - worldPos.x, 2) + Math.pow(midPoint.y - worldPos.y, 2)
        );
        if (distMid < snapTolerance) {
          return {
            type: SnapPointType.MIDPOINT,
            position: midPoint,
            description: `Milieu segment ${i + 1}`
          };
        }
      }
    }

    // PRIORITÉ 3: Snap à la grille
    const gridSnap = snapToGrid(worldPos);
    const distance = Math.sqrt(
      Math.pow(gridSnap.x - worldPos.x, 2) + Math.pow(gridSnap.y - worldPos.y, 2)
    );

    if (distance < snapTolerance) {
      return {
        type: SnapPointType.GRID,
        position: gridSnap,
        description: `Grille (${gridSnap.x.toFixed(0)}, ${gridSnap.y.toFixed(0)})`
      };
    }

    return null;
  };

  // Gestion des événements souris
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const worldPos = screenToWorld(event.clientX, event.clientY);
    setMousePosition(worldPos);

    // Détecter snap
    const snap = findSnapPoint(worldPos);
    setSnapPoint(snap);

    // Pan avec bouton milieu ou espace
    if (isPanning) {
      const dx = event.clientX - lastMousePos.x;
      const dy = event.clientY - lastMousePos.y;

      setCameraPosition(prev => ({
        x: prev.x - dx / cameraZoom,
        y: prev.y + dy / cameraZoom
      }));

      setLastMousePos({ x: event.clientX, y: event.clientY });
    }

    // Afficher prévisualisation selon le mode
    updatePreview(snap?.position || worldPos);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 1 || event.shiftKey) {
      // Pan mode
      setIsPanning(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
      return;
    }

    if (event.button === 0) {
      // Clic gauche - ajouter un point
      const worldPos = snapPoint?.position || mousePosition;
      handleAddPoint(worldPos);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setCameraZoom(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
  };

  // Attacher l'event listener wheel avec { passive: false }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Ajouter un point selon le mode de dessin
  const handleAddPoint = (point: Point2D) => {
    switch (drawMode) {
      case 'line':
        addLinePoint(point);
        break;
      case 'rectangle':
        addRectanglePoint(point);
        break;
      case 'circle':
        addCirclePoint(point);
        break;
      case 'arc':
        addArcPoint(point);
        break;
      case 'polygon':
        addPolygonPoint(point);
        break;
      case 'fillet':
        addFilletPoint(point);
        break;
    }
  };

  // Obtenir les segments du contour actif
  const getCurrentContourSegments = (): GeometrySegment[] => {
    return segments;
  };

  // Définir les segments du contour actif
  const setCurrentContourSegments = (newSegments: GeometrySegment[]) => {
    setSegments(newSegments);
  };

  // Ajouter un segment au contour actif
  const addSegmentToCurrentContour = (segment: GeometrySegment) => {
    setSegments(prev => [...prev, segment]);
  };

  // Dessiner une ligne
  const addLinePoint = (point: Point2D) => {
    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      if (newPoints.length === 2) {
        // Créer le segment
        const segment: GeometrySegment = {
          type: SegmentType.LINE,
          start: newPoints[0],
          end: newPoints[1]
        };
        addSegmentToCurrentContour(segment);
        return [];
      }
      return newPoints;
    });
  };

  // Dessiner un rectangle (2 points: coin opposés)
  const addRectanglePoint = (point: Point2D) => {
    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      if (newPoints.length === 2) {
        const [p1, p2] = newPoints;
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        // Créer 4 segments pour le rectangle
        const rectSegments: GeometrySegment[] = [
          { type: SegmentType.LINE, start: { x: minX, y: minY }, end: { x: maxX, y: minY } },
          { type: SegmentType.LINE, start: { x: maxX, y: minY }, end: { x: maxX, y: maxY } },
          { type: SegmentType.LINE, start: { x: maxX, y: maxY }, end: { x: minX, y: maxY } },
          { type: SegmentType.LINE, start: { x: minX, y: maxY }, end: { x: minX, y: minY } }
        ];
        rectSegments.forEach(seg => addSegmentToCurrentContour(seg));
        return [];
      }
      return newPoints;
    });
  };

  // Dessiner un cercle (2 points: centre + point sur périmètre)
  const addCirclePoint = (point: Point2D) => {
    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      if (newPoints.length === 2) {
        const [center, edgePoint] = newPoints;
        const radius = Math.sqrt(
          Math.pow(edgePoint.x - center.x, 2) + Math.pow(edgePoint.y - center.y, 2)
        );

        const segment: GeometrySegment = {
          type: SegmentType.ARC,
          center,
          radius,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterClockwise: false
        };
        addSegmentToCurrentContour(segment);
        return [];
      }
      return newPoints;
    });
  };

  // Dessiner un arc (3 points: début, milieu, fin)
  const addArcPoint = (point: Point2D) => {
    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      if (newPoints.length === 3) {
        const [start, mid, end] = newPoints;

        // Calculer le centre et le rayon de l'arc passant par 3 points
        const arc = calculateArcFrom3Points(start, mid, end);
        if (arc) {
          addSegmentToCurrentContour(arc);
        }
        return [];
      }
      return newPoints;
    });
  };

  // Dessiner un polygone (plusieurs points, double-clic pour terminer)
  const addPolygonPoint = (point: Point2D) => {
    setCurrentPoints(prev => [...prev, point]);
  };

  // Créer un angle arrondi (fillet) entre deux segments
  const addFilletPoint = (point: Point2D) => {
    // TODO: Implémenter la création d'un congé entre deux segments
    alert('Outil Fillet: Cliquez sur deux segments consécutifs pour créer un angle arrondi');
  };

  const finishPolygon = () => {
    if (currentPoints.length < 3) {
      alert('Un polygone nécessite au moins 3 points');
      return;
    }

    const polygonSegments: GeometrySegment[] = [];
    for (let i = 0; i < currentPoints.length; i++) {
      const start = currentPoints[i];
      const end = currentPoints[(i + 1) % currentPoints.length];
      polygonSegments.push({
        type: SegmentType.LINE,
        start,
        end
      });
    }
    setSegments(prev => [...prev, ...polygonSegments]);
    setCurrentPoints([]);
  };

  // Calculer un arc passant par 3 points
  const calculateArcFrom3Points = (p1: Point2D, p2: Point2D, p3: Point2D): GeometrySegment | null => {
    // Calcul du centre du cercle passant par 3 points
    const ax = p2.x - p1.x;
    const ay = p2.y - p1.y;
    const bx = p3.x - p1.x;
    const by = p3.y - p1.y;

    const d = 2 * (ax * by - ay * bx);
    if (Math.abs(d) < 0.001) {
      // Points alignés
      return null;
    }

    const aSq = ax * ax + ay * ay;
    const bSq = bx * bx + by * by;

    const cx = p1.x + (by * aSq - ay * bSq) / d;
    const cy = p1.y + (ax * bSq - bx * aSq) / d;

    const center = { x: cx, y: cy };
    const radius = Math.sqrt(Math.pow(p1.x - cx, 2) + Math.pow(p1.y - cy, 2));

    // Calculer les angles
    const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
    const endAngle = Math.atan2(p3.y - cy, p3.x - cx);

    // Vérifier si p2 est entre p1 et p3 dans le sens trigonométrique
    const midAngle = Math.atan2(p2.y - cy, p2.x - cx);
    let counterClockwise = false;

    // Normaliser les angles
    const normalizeAngle = (angle: number) => {
      while (angle < 0) angle += 2 * Math.PI;
      while (angle > 2 * Math.PI) angle -= 2 * Math.PI;
      return angle;
    };

    const start = normalizeAngle(startAngle);
    const mid = normalizeAngle(midAngle);
    const end = normalizeAngle(endAngle);

    // Déterminer le sens de l'arc
    if (start < end) {
      counterClockwise = mid > start && mid < end;
    } else {
      counterClockwise = mid > start || mid < end;
    }

    return {
      type: SegmentType.ARC,
      center,
      radius,
      startAngle,
      endAngle,
      counterClockwise
    };
  };

  // Détection d'intersection entre deux segments de ligne
  const lineSegmentsIntersect = (
    seg1: GeometrySegment,
    seg2: GeometrySegment
  ): Point2D | null => {
    if (seg1.type !== SegmentType.LINE || seg2.type !== SegmentType.LINE) {
      return null;
    }

    const p1 = seg1.start;
    const p2 = seg1.end;
    const p3 = seg2.start;
    const p4 = seg2.end;

    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    // Lignes parallèles
    if (Math.abs(denom) < 0.0001) {
      return null;
    }

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    // Vérifier si l'intersection est dans les limites des deux segments
    // On exclut les extrémités (endpoints) car c'est normal qu'ils se touchent
    const tolerance = 0.001;
    if (ua > tolerance && ua < (1 - tolerance) && ub > tolerance && ub < (1 - tolerance)) {
      return {
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y)
      };
    }

    return null;
  };

  // Détecter toutes les intersections
  const detectIntersections = (segmentsList: GeometrySegment[]) => {
    const found: Array<{segmentIndex1: number, segmentIndex2: number, point: Point2D}> = [];

    for (let i = 0; i < segmentsList.length; i++) {
      for (let j = i + 1; j < segmentsList.length; j++) {
        // Ne pas vérifier les segments adjacents (ils partagent un endpoint)
        if (Math.abs(i - j) === 1 || (i === 0 && j === segmentsList.length - 1)) {
          continue;
        }

        const intersection = lineSegmentsIntersect(segmentsList[i], segmentsList[j]);
        if (intersection) {
          found.push({
            segmentIndex1: i,
            segmentIndex2: j,
            point: intersection
          });
        }
      }
    }

    return found;
  };

  // Extraire tous les points d'un contour pour l'algorithme point-in-polygon
  const getContourPoints = (segments: GeometrySegment[]): Point2D[] => {
    const points: Point2D[] = [];

    segments.forEach(seg => {
      if (seg.type === SegmentType.LINE) {
        points.push(seg.start);
      } else if (seg.type === SegmentType.ARC) {
        // Pour un arc, approximer avec plusieurs points
        const numPoints = 20;
        for (let i = 0; i <= numPoints; i++) {
          const t = i / numPoints;
          const angle = seg.startAngle + t * (seg.endAngle - seg.startAngle);
          points.push({
            x: seg.center.x + seg.radius * Math.cos(angle),
            y: seg.center.y + seg.radius * Math.sin(angle)
          });
        }
      }
    });

    return points;
  };

  // Algorithme point-in-polygon (ray casting)
  const isPointInPolygon = (point: Point2D, polygonPoints: Point2D[]): boolean => {
    let inside = false;
    const n = polygonPoints.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygonPoints[i].x, yi = polygonPoints[i].y;
      const xj = polygonPoints[j].x, yj = polygonPoints[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  };

  // Vérifier si un contour est à l'intérieur d'un autre
  const isContourInsideContour = (innerSegments: GeometrySegment[], outerSegments: GeometrySegment[]): boolean => {
    const innerPoints = getContourPoints(innerSegments);
    const outerPoints = getContourPoints(outerSegments);

    // Vérifier si tous les points du contour intérieur sont dans le contour extérieur
    // On vérifie plusieurs points pour être sûr
    const sampleSize = Math.min(5, innerPoints.length);
    const step = Math.floor(innerPoints.length / sampleSize);

    for (let i = 0; i < sampleSize; i++) {
      const point = innerPoints[i * step];
      if (!isPointInPolygon(point, outerPoints)) {
        return false;
      }
    }

    return true;
  };

  // Calculer le centroïde d'un contour
  const getContourCentroid = (segments: GeometrySegment[]): Point2D => {
    const points = getContourPoints(segments);
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  };

  // Validation de surface fermée
  const validateClosedSurface = (segmentsList: GeometrySegment[]): boolean => {
    if (segmentsList.length === 0) return false;

    const tolerance = 0.1; // Tolérance de 0.1mm pour considérer deux points comme identiques

    // Récupérer le premier point du premier segment
    const firstSegment = segmentsList[0];
    let firstPoint: Point2D;

    if (firstSegment.type === SegmentType.LINE) {
      firstPoint = firstSegment.start;
    } else if (firstSegment.type === SegmentType.ARC) {
      const angle = firstSegment.startAngle;
      firstPoint = {
        x: firstSegment.center.x + firstSegment.radius * Math.cos(angle),
        y: firstSegment.center.y + firstSegment.radius * Math.sin(angle)
      };
    } else {
      return false;
    }

    // Récupérer le dernier point du dernier segment
    const lastSegment = segmentsList[segmentsList.length - 1];
    let lastPoint: Point2D;

    if (lastSegment.type === SegmentType.LINE) {
      lastPoint = lastSegment.end;
    } else if (lastSegment.type === SegmentType.ARC) {
      const angle = lastSegment.endAngle;
      lastPoint = {
        x: lastSegment.center.x + lastSegment.radius * Math.cos(angle),
        y: lastSegment.center.y + lastSegment.radius * Math.sin(angle)
      };
    } else {
      return false;
    }

    // Vérifier si les points sont identiques (avec tolérance)
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + Math.pow(lastPoint.y - firstPoint.y, 2)
    );

    return distance < tolerance;
  };

  // Mettre à jour la prévisualisation
  const updatePreview = (worldPos: Point2D) => {
    if (!sceneRef.current) return;

    // Supprimer l'ancienne prévisualisation et nettoyer
    const oldPreview = sceneRef.current.getObjectByName('preview');
    if (oldPreview) {
      oldPreview.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      sceneRef.current.remove(oldPreview);
    }

    // Créer nouvelle prévisualisation selon le mode
    const previewGroup = new THREE.Group();
    previewGroup.name = 'preview';

    if (drawMode === 'line' && currentPoints.length === 1) {
      const points = [
        new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, 0),
        new THREE.Vector3(worldPos.x, worldPos.y, 0)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      previewGroup.add(line);
    }

    if (drawMode === 'rectangle' && currentPoints.length === 1) {
      const p1 = currentPoints[0];
      const p2 = worldPos;
      const points = [
        new THREE.Vector3(p1.x, p1.y, 0),
        new THREE.Vector3(p2.x, p1.y, 0),
        new THREE.Vector3(p2.x, p2.y, 0),
        new THREE.Vector3(p1.x, p2.y, 0),
        new THREE.Vector3(p1.x, p1.y, 0)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      previewGroup.add(line);
    }

    if (drawMode === 'circle' && currentPoints.length === 1) {
      const center = currentPoints[0];
      const radius = Math.sqrt(
        Math.pow(worldPos.x - center.x, 2) + Math.pow(worldPos.y - center.y, 2)
      );
      const curve = new THREE.EllipseCurve(
        center.x, center.y,
        radius, radius,
        0, 2 * Math.PI,
        false,
        0
      );
      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, 0)));
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const circle = new THREE.Line(geometry, material);
      previewGroup.add(circle);
    }

    if (drawMode === 'arc') {
      if (currentPoints.length === 1) {
        // Montrer une ligne du point de départ au curseur
        const points = [
          new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, 0),
          new THREE.Vector3(worldPos.x, worldPos.y, 0)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffa500, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        previewGroup.add(line);
      } else if (currentPoints.length === 2) {
        // Montrer l'arc potentiel
        const [start, mid] = currentPoints;
        const arc = calculateArcFrom3Points(start, mid, worldPos);
        if (arc) {
          const curve = new THREE.EllipseCurve(
            arc.center.x, arc.center.y,
            arc.radius, arc.radius,
            arc.startAngle, arc.endAngle,
            arc.counterClockwise,
            0
          );
          const points = curve.getPoints(50);
          const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, 0)));
          const material = new THREE.LineBasicMaterial({ color: 0xffa500, linewidth: 2 });
          const arcLine = new THREE.Line(geometry, material);
          previewGroup.add(arcLine);
        }
      }
    }

    sceneRef.current.add(previewGroup);
  };

  // Créer le profil final
  const createProfile = () => {
    if (closedContours.length === 0) {
      alert('Aucun contour fermé. Dessinez au moins un contour extérieur fermé.');
      return;
    }

    // Trouver le contour extérieur (le plus grand non-trou)
    const outerContours = closedContours.filter(c => !c.isHole);
    if (outerContours.length === 0) {
      alert('⚠️ Aucun contour extérieur détecté.\nVous devez d\'abord dessiner un contour extérieur (matière pleine).');
      return;
    }

    // Prendre le premier contour extérieur comme principal
    const mainOuterContour = outerContours[0];

    // Trouver tous les trous de ce contour
    const holes = closedContours.filter(c => c.isHole && c.parentId === mainOuterContour.id);

    const name = prompt('Nom du profil:', 'Mon Profil Personnalisé');
    if (!name) return;

    const designation = prompt('Désignation (ex: CUSTOM-001):', 'CUSTOM-001');
    if (!designation) return;

    const contour: Contour2D = {
      id: mainOuterContour.id,
      segments: mainOuterContour.segments,
      closed: true
    };

    // Créer les contours des trous
    const holesContours: Contour2D[] | undefined = holes.length > 0
      ? holes.map((hole) => ({
          id: hole.id,
          segments: hole.segments,
          closed: true
        }))
      : undefined;

    const shape: Shape2D = {
      outerContour: contour,
      holes: holesContours
    };

    const profile = createCustomProfile({
      name,
      designation,
      description: 'Profil créé avec l\'éditeur 2D',
      shape,
      defaultMaterial: {
        grade: 'S355',
        density: 7.85,
        yieldStrength: 355,
        tensileStrength: 510
      }
    });

    if (onProfileCreated) {
      onProfileCreated(profile);
    }

    alert(`Profil "${name}" créé avec succès!`);
  };

  // Effacer tout
  const clearAll = () => {
    if (confirm('Effacer tous les contours?')) {
      setSegments([]);
      setClosedContours([]);
      setCurrentPoints([]);
    }
  };

  // Commencer un nouveau contour
  const startNewContour = () => {
    if (segments.length === 0) {
      alert('⚠️ Aucun segment à finaliser.');
      return;
    }

    if (!isSurfaceClosed) {
      if (confirm('Le contour actuel n\'est pas fermé. Voulez-vous quand même commencer un nouveau contour?\n(Le contour non fermé sera perdu)')) {
        setSegments([]);
        setCurrentPoints([]);
      }
      return;
    }

    // Le contour est déjà ajouté à closedContours par le useEffect
    // On réinitialise juste les segments actuels
    setSegments([]);
    setCurrentPoints([]);
    alert('✅ Nouveau contour commencé !\nDessinez votre prochain contour (extérieur ou intérieur).');
  };


  // Fermer automatiquement la surface
  const autoCloseSurface = () => {
    const currentSegments = getCurrentContourSegments();

    if (currentSegments.length === 0) {
      alert('Aucun segment dessiné.');
      return;
    }

    const isClosed = validateClosedSurface(currentSegments);
    if (isClosed) {
      alert('✅ La surface est déjà fermée !');
      return;
    }

    // Récupérer le premier et le dernier point
    const firstSeg = currentSegments[0];
    const lastSeg = currentSegments[currentSegments.length - 1];

    let firstPoint: Point2D | null = null;
    let lastPoint: Point2D | null = null;

    // Premier point
    if (firstSeg.type === SegmentType.LINE) {
      firstPoint = firstSeg.start;
    } else if (firstSeg.type === SegmentType.ARC) {
      const angle = firstSeg.startAngle;
      firstPoint = {
        x: firstSeg.center.x + firstSeg.radius * Math.cos(angle),
        y: firstSeg.center.y + firstSeg.radius * Math.sin(angle)
      };
    }

    // Dernier point
    if (lastSeg.type === SegmentType.LINE) {
      lastPoint = lastSeg.end;
    } else if (lastSeg.type === SegmentType.ARC) {
      const angle = lastSeg.endAngle;
      lastPoint = {
        x: lastSeg.center.x + lastSeg.radius * Math.cos(angle),
        y: lastSeg.center.y + lastSeg.radius * Math.sin(angle)
      };
    }

    if (!firstPoint || !lastPoint) {
      alert('Impossible de déterminer les points de fermeture.');
      return;
    }

    // Vérifier la distance
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + Math.pow(lastPoint.y - firstPoint.y, 2)
    );

    if (distance < 0.1) {
      alert('✅ La surface est déjà fermée (distance < 0.1mm).');
      return;
    }

    // Créer un segment de ligne pour fermer
    const closingSegment: GeometrySegment = {
      type: SegmentType.LINE,
      start: lastPoint,
      end: firstPoint
    };

    addSegmentToCurrentContour(closingSegment);
    alert(`✅ Contour fermé automatiquement !\nSegment de fermeture créé (${distance.toFixed(1)}mm)`);
  };

  // Update camera
  useEffect(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    camera.zoom = cameraZoom;
    camera.position.x = cameraPosition.x;
    camera.position.y = cameraPosition.y;
    camera.updateProjectionMatrix();
  }, [cameraZoom, cameraPosition]);

  // Render segments on canvas
  useEffect(() => {
    if (!sceneRef.current) return;

    // Supprimer l'ancien groupe de segments et nettoyer les ressources WebGL
    const oldSegmentsGroup = sceneRef.current.getObjectByName('segments');
    if (oldSegmentsGroup) {
      // Nettoyer toutes les géométries et matériaux pour éviter les erreurs WebGL
      oldSegmentsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      sceneRef.current.remove(oldSegmentsGroup);
    }

    // Créer nouveau groupe
    const segmentsGroup = new THREE.Group();
    segmentsGroup.name = 'segments';

    // Rendre d'abord les contours fermés avec remplissage
    closedContours.forEach((closedContour) => {
      const points = getContourPoints(closedContour.segments);

      if (points.length > 2) {
        // Créer une forme THREE.Shape pour le remplissage
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          shape.lineTo(points[i].x, points[i].y);
        }
        shape.closePath();

        // Créer la géométrie de remplissage
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: closedContour.isHole ? 0x2c3e50 : 0x3498db, // Gris foncé pour trous, bleu pour matière
          opacity: closedContour.isHole ? 0.4 : 0.25,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = 0.05;
        segmentsGroup.add(mesh);

        // Ajouter le contour (ligne)
        closedContour.segments.forEach((segment) => {
          if (segment.type === SegmentType.LINE) {
            const linePoints = [
              new THREE.Vector3(segment.start.x, segment.start.y, 0.08),
              new THREE.Vector3(segment.end.x, segment.end.y, 0.08)
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMaterial = new THREE.LineBasicMaterial({
              color: closedContour.isHole ? 0xe74c3c : 0x2980b9, // Rouge pour trous, bleu foncé pour matière
              linewidth: 2,
              depthTest: false,
              depthWrite: false
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            segmentsGroup.add(line);
          } else if (segment.type === SegmentType.ARC) {
            const curve = new THREE.EllipseCurve(
              segment.center.x, segment.center.y,
              segment.radius, segment.radius,
              segment.startAngle, segment.endAngle,
              segment.counterClockwise,
              0
            );
            const arcPoints = curve.getPoints(50);
            const arcGeometry = new THREE.BufferGeometry().setFromPoints(
              arcPoints.map(p => new THREE.Vector3(p.x, p.y, 0.08))
            );
            const arcMaterial = new THREE.LineBasicMaterial({
              color: closedContour.isHole ? 0xe74c3c : 0x2980b9,
              linewidth: 2,
              depthTest: false,
              depthWrite: false
            });
            const line = new THREE.Line(arcGeometry, arcMaterial);
            segmentsGroup.add(line);
          }
        });
      }
    });

    // Ajouter les segments en cours de dessin
    segments.forEach((segment, index) => {
      if (segment.type === SegmentType.LINE) {
        const points = [
          new THREE.Vector3(segment.start.x, segment.start.y, 0.1),
          new THREE.Vector3(segment.end.x, segment.end.y, 0.1)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0x3498db,
          linewidth: 3,
          depthTest: false,
          depthWrite: false
        });
        const line = new THREE.Line(geometry, material);
        segmentsGroup.add(line);

        // Ajouter des points aux extrémités
        // Le premier point du premier segment est spécial (point de fermeture)
        if (index === 0) {
          const firstPointMarker = createPointMarker(segment.start, 0xffd700, 10); // Or
          segmentsGroup.add(firstPointMarker);

          // Ajouter un anneau autour du premier point pour le rendre plus visible
          const ringGeometry = new THREE.RingGeometry(8, 12, 16);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.set(segment.start.x, segment.start.y, 0.15);
          segmentsGroup.add(ring);
        } else {
          const startMarker = createPointMarker(segment.start, 0x27ae60);
          segmentsGroup.add(startMarker);
        }

        const endMarker = createPointMarker(segment.end, 0xe74c3c);
        segmentsGroup.add(endMarker);
      } else if (segment.type === SegmentType.ARC) {
        const curve = new THREE.EllipseCurve(
          segment.center.x, segment.center.y,
          segment.radius, segment.radius,
          segment.startAngle, segment.endAngle,
          segment.counterClockwise,
          0
        );
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(
          points.map(p => new THREE.Vector3(p.x, p.y, 0.1))
        );
        const material = new THREE.LineBasicMaterial({
          color: 0x3498db,
          linewidth: 3,
          depthTest: false,
          depthWrite: false
        });
        const line = new THREE.Line(geometry, material);
        segmentsGroup.add(line);
      }
    });

    // Ajouter les points en cours
    currentPoints.forEach((point, index) => {
      const marker = createPointMarker(point, 0xf39c12, 8);
      segmentsGroup.add(marker);
    });

    sceneRef.current.add(segmentsGroup);
  }, [segments, currentPoints, closedContours]);

  // Vérifier si la surface est fermée et créer automatiquement le contour fermé
  useEffect(() => {
    const isClosed = validateClosedSurface(segments);
    setIsSurfaceClosed(isClosed);

    // Si le contour est fermé et qu'il n'est pas déjà dans closedContours
    if (isClosed && segments.length > 0) {
      const segmentsId = segments.map(s => JSON.stringify(s)).join('|');
      const alreadyExists = closedContours.some(c => {
        const existingId = c.segments.map(s => JSON.stringify(s)).join('|');
        return existingId === segmentsId;
      });

      if (!alreadyExists) {
        // Créer un nouveau contour fermé
        const newContourId = `contour-${Date.now()}-${Math.random()}`;

        // Déterminer si c'est un trou ou un contour extérieur
        let isHole = false;
        let parentId: string | undefined = undefined;

        // Vérifier si ce contour est à l'intérieur d'un autre
        for (const existingContour of closedContours) {
          if (!existingContour.isHole && isContourInsideContour(segments, existingContour.segments)) {
            isHole = true;
            parentId = existingContour.id;
            break;
          }
        }

        const newContour: ClosedContour = {
          id: newContourId,
          segments: [...segments],
          isHole,
          parentId
        };

        setClosedContours(prev => [...prev, newContour]);

        // Message informatif
        if (isHole) {
          console.log(`✅ Trou détecté automatiquement et ajouté (enlever matière)`);
        } else {
          console.log(`✅ Contour extérieur détecté (matière pleine)`);
        }
      }
    }
  }, [segments]);

  // Détecter les intersections
  useEffect(() => {
    setIntersections(detectIntersections(segments));
  }, [segments]);

  // Afficher les points d'intersection sur le canvas
  useEffect(() => {
    if (!sceneRef.current) return;

    // Supprimer l'ancien groupe d'intersections et nettoyer
    const oldIntersectionsGroup = sceneRef.current.getObjectByName('intersections');
    if (oldIntersectionsGroup) {
      oldIntersectionsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      sceneRef.current.remove(oldIntersectionsGroup);
    }

    if (intersections.length === 0) return;

    // Créer nouveau groupe pour les intersections
    const intersectionsGroup = new THREE.Group();
    intersectionsGroup.name = 'intersections';

    // Marquer chaque point d'intersection en rouge avec un X
    intersections.forEach((inter) => {
      const marker = createPointMarker(inter.point, 0xff0000, 10);
      intersectionsGroup.add(marker);

      // Ajouter un X pour indiquer le conflit
      const xSize = 15;
      const points1 = [
        new THREE.Vector3(inter.point.x - xSize, inter.point.y - xSize, 0.3),
        new THREE.Vector3(inter.point.x + xSize, inter.point.y + xSize, 0.3)
      ];
      const points2 = [
        new THREE.Vector3(inter.point.x - xSize, inter.point.y + xSize, 0.3),
        new THREE.Vector3(inter.point.x + xSize, inter.point.y - xSize, 0.3)
      ];
      const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
      const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
      const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3,
        depthTest: false,
        depthWrite: false
      });
      const line1 = new THREE.Line(geometry1, material);
      const line2 = new THREE.Line(geometry2, material);
      intersectionsGroup.add(line1);
      intersectionsGroup.add(line2);
    });

    sceneRef.current.add(intersectionsGroup);
  }, [intersections]);

  // Helper pour créer un marqueur de point
  const createPointMarker = (point: Point2D, color: number, size = 6) => {
    const geometry = new THREE.CircleGeometry(size, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false
    });
    const circle = new THREE.Mesh(geometry, material);
    circle.position.set(point.x, point.y, 0.2);
    return circle;
  };

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={toolGroupStyle}>
          <button
            style={toolButtonStyle(drawMode === 'select')}
            onClick={() => setDrawMode('select')}
            title="Sélection"
          >
            ✋ Sélection
          </button>
          <button
            style={toolButtonStyle(drawMode === 'line')}
            onClick={() => setDrawMode('line')}
            title="Ligne (2 points)"
          >
            📏 Ligne
          </button>
          <button
            style={toolButtonStyle(drawMode === 'rectangle')}
            onClick={() => setDrawMode('rectangle')}
            title="Rectangle (2 coins)"
          >
            ⬜ Rectangle
          </button>
          <button
            style={toolButtonStyle(drawMode === 'circle')}
            onClick={() => setDrawMode('circle')}
            title="Cercle (centre + rayon)"
          >
            ⭕ Cercle
          </button>
          <button
            style={toolButtonStyle(drawMode === 'polygon')}
            onClick={() => setDrawMode('polygon')}
            title="Polygone (plusieurs points)"
          >
            🔷 Polygone
          </button>
          <button
            style={toolButtonStyle(drawMode === 'arc')}
            onClick={() => setDrawMode('arc')}
            title="Arc (3 points: début, milieu, fin)"
          >
            🌙 Arc
          </button>
          <button
            style={toolButtonStyle(drawMode === 'fillet')}
            onClick={() => setDrawMode('fillet')}
            title="Arrondi d'angle (2 segments)"
          >
            ◠ Arrondi
          </button>
        </div>

        <div style={toolGroupStyle}>
          <button style={actionButtonStyle} onClick={finishPolygon} disabled={currentPoints.length < 3}>
            ✅ Terminer polygone
          </button>
          <button
            style={{
              ...actionButtonStyle,
              backgroundColor: isSurfaceClosed ? '#27ae60' : '#e67e22'
            }}
            onClick={autoCloseSurface}
            disabled={segments.length === 0}
            title="Ferme automatiquement la surface en reliant le dernier point au premier"
          >
            {isSurfaceClosed ? '🔒 Fermée' : '🔓 Fermer surface'}
          </button>
          <button
            style={{
              ...actionButtonStyle,
              backgroundColor: '#9b59b6'
            }}
            onClick={startNewContour}
            disabled={segments.length === 0 || !isSurfaceClosed}
            title="Commencer un nouveau contour (extérieur ou intérieur)"
          >
            ➕ Nouveau contour
          </button>
          <button style={actionButtonStyle} onClick={clearAll}>
            🗑️ Effacer tout
          </button>
          <button style={actionButtonStyle} onClick={createProfile} disabled={closedContours.length === 0}>
            💾 Créer profil
          </button>
          {onClose && (
            <button style={actionButtonStyle} onClick={onClose}>
              ❌ Fermer
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={canvasContainerStyle}>
        <canvas
          ref={canvasRef}
          style={canvasStyle}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />

        {/* Overlay info */}
        <div style={overlayInfoStyle}>
          <div>Mode: <strong>{drawMode}</strong></div>
          <div>Position: ({mousePosition.x.toFixed(1)}, {mousePosition.y.toFixed(1)})</div>
          {snapPoint && <div style={snapIndicatorStyle}>📍 Snap: {snapPoint.description}</div>}
          <div>Segments en cours: {segments.length}</div>
          {closedContours.length > 0 && (
            <>
              <div style={{ color: '#3498db', fontWeight: 'bold' }}>
                🔵 Contours matière: {closedContours.filter(c => !c.isHole).length}
              </div>
              {closedContours.filter(c => c.isHole).length > 0 && (
                <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                  🔴 Trous (vides): {closedContours.filter(c => c.isHole).length}
                </div>
              )}
            </>
          )}
          {segments.length > 0 && (
            <div style={isSurfaceClosed ? { color: '#27ae60', fontWeight: 'bold' } : { color: '#e74c3c', fontWeight: 'bold' }}>
              {isSurfaceClosed ? '✅ Surface fermée' : '⚠️ Surface ouverte'}
            </div>
          )}
          {intersections.length > 0 && (
            <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>
              ❌ {intersections.length} conflit{intersections.length > 1 ? 's' : ''} détecté{intersections.length > 1 ? 's' : ''}
            </div>
          )}
          <div>Zoom: {(cameraZoom * 100).toFixed(0)}%</div>
          <div style={helpTextStyle}>
            💡 {drawMode === 'select' && 'Cliquez pour sélectionner | Clic milieu ou Shift+clic pour déplacer'}
            {drawMode === 'line' && 'Cliquez 2 points pour tracer une ligne | Le snap vous aide à accrocher aux points'}
            {drawMode === 'rectangle' && 'Cliquez 2 coins opposés pour créer un rectangle'}
            {drawMode === 'circle' && 'Clic 1: centre | Clic 2: point sur le cercle'}
            {drawMode === 'arc' && 'Clic 1: début | Clic 2: milieu | Clic 3: fin de l\'arc'}
            {drawMode === 'polygon' && `Cliquez plusieurs points | Points: ${currentPoints.length} | Terminez avec le bouton ✅`}
            {drawMode === 'fillet' && 'Outil pour créer des angles arrondis entre segments'}
            {drawMode === 'pan' && 'Mode déplacement actif'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  backgroundColor: '#2c3e50'
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px',
  backgroundColor: '#34495e',
  borderBottom: '2px solid #1abc9c'
};

const toolGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '5px'
};

const toolButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  backgroundColor: active ? '#1abc9c' : '#7f8c8d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: active ? 'bold' : 'normal',
  transition: 'all 0.2s'
});

const actionButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s'
};

const canvasContainerStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden'
};

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'block'
};

const overlayInfoStyle: React.CSSProperties = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: 'rgba(44, 62, 80, 0.9)',
  color: 'white',
  padding: '15px',
  borderRadius: '8px',
  fontSize: '13px',
  fontFamily: 'monospace',
  lineHeight: '1.6',
  minWidth: '200px'
};

const snapIndicatorStyle: React.CSSProperties = {
  color: '#1abc9c',
  fontWeight: 'bold'
};

const helpTextStyle: React.CSSProperties = {
  marginTop: '10px',
  fontSize: '11px',
  color: '#95a5a6',
  fontStyle: 'italic'
};
