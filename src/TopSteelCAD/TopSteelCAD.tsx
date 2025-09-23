'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PivotElement, MaterialType } from '../types/viewer';
import { Loader2 } from 'lucide-react';
import { ViewerEngine } from './core/ViewerEngine';
import { EventBus } from './core/EventBus';
import { SimpleMeasurementTool } from './tools/SimpleMeasurementTool';
import { ViewCube } from './ui/ViewCube';
import { preloadCSGWorkers } from './workers';

/**
 * Props du composant TopSteelCAD
 */
interface TopSteelCADProps {
  elements?: PivotElement[];
  selectedElementIds?: string[];  // Add prop for controlled selection
  onElementSelect?: (ids: string[]) => void;
  onElementChange?: (element: PivotElement) => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  className?: string;
  theme?: 'light' | 'dark';
}

/**
 * TopSteelCAD - Composant principal du viewer 3D (Version simplifiée)
 * 
 * Viewer 3D de base pour la visualisation d'éléments métalliques
 * Version temporaire sans les modules UI supprimés
 */
export const TopSteelCAD: React.FC<TopSteelCADProps> = ({
  elements: initialElements = [],
  selectedElementIds,
  onElementSelect,
  onElementChange: _onElementChange,
  onThemeChange,
  className = '',
  theme = 'light'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedElementIds || []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const measurementToolRef = useRef<SimpleMeasurementTool | null>(null);
  const cameraControllerRef = useRef<any>(null);
  const [snapInfo, setSnapInfo] = useState<{ type: string; hasSnap: boolean } | null>(null);
  const [measurementProgress, setMeasurementProgress] = useState<{ pointsCount: number; total: number }>({ pointsCount: 0, total: 2 });

  // Référence au moteur de rendu
  const engineRef = useRef<ViewerEngine | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const elementsAddedRef = useRef(false);

  // Sync selectedElementIds prop with internal state
  useEffect(() => {
    if (selectedElementIds !== undefined && JSON.stringify(selectedElementIds) !== JSON.stringify(selectedIds)) {
      setSelectedIds(selectedElementIds);
      // Update visual selection
      if (engineRef.current) {
        updateSelectionVisuals(selectedElementIds);
      }
    }
  }, [selectedElementIds, selectedIds]);

  /**
   * Calcule la bounding box de tous les éléments
   */
  const calculateSceneBounds = () => {
    if (!engineRef.current || initialElements.length === 0) {
      return { size: 10000, center: new THREE.Vector3(0, 0, 0), minY: 0 };
    }

    const bounds = new THREE.Box3();
    
    // Calculer les bounds depuis les éléments initiaux
    initialElements.forEach(element => {
      const pos = new THREE.Vector3(element.position[0], element.position[1], element.position[2]);
      const size = new THREE.Vector3(
        element.dimensions.length || element.dimensions.width, 
        element.dimensions.height || element.dimensions.thickness,
        element.dimensions.width || element.dimensions.length
      );
      
      bounds.expandByPoint(pos.clone().sub(size.clone().multiplyScalar(0.5)));
      bounds.expandByPoint(pos.clone().add(size.clone().multiplyScalar(0.5)));
    });

    if (bounds.isEmpty()) {
      return { size: 10000, center: new THREE.Vector3(0, 0, 0), minY: 0 };
    }

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const minY = bounds.min.y; // Point le plus bas
    
    // Marge plus raisonnable : 20% avec arrondi intelligent
    let gridSize: number;
    if (maxDim <= 1000) {
      // Petites pièces : arrondir à 500mm
      gridSize = Math.ceil((maxDim * 1.2) / 500) * 500;
    } else if (maxDim <= 5000) {
      // Pièces moyennes : arrondir à 1m  
      gridSize = Math.ceil((maxDim * 1.2) / 1000) * 1000;
    } else {
      // Grandes pièces : arrondir à 2m
      gridSize = Math.ceil((maxDim * 1.15) / 2000) * 2000;
    }
    
    return { size: Math.max(gridSize, 1000), center, minY }; // Minimum 1m
  };

  /**
   * Crée une grille adaptative basée sur la taille du contenu
   */
  const createAdaptiveGrid = (isDark: boolean = false) => {
    const { size, minY } = calculateSceneBounds();
    
    // Espacement fixe de 100mm par case comme demandé
    const divisions = size / 100; // 100mm par case TOUJOURS

    const colorMain = isDark ? '#4b5563' : '#d1d5db';   // Gray 600 / 300
    const colorCenter = isDark ? '#374151' : '#e5e7eb'; // Gray 700 / 200
    
    const grid = new THREE.GridHelper(size, Math.floor(divisions), colorMain, colorCenter);
    grid.name = 'AdaptiveGrid';
    
    // Positionner la grille au niveau du point le plus bas
    // On soustrait un petit offset pour que la grille soit légèrement en dessous
    grid.position.y = minY - 10; // 10mm en dessous du point le plus bas
    
    // Configuration anti-scintillement
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.opacity = isDark ? 0.3 : 0.4;
    gridMaterial.transparent = true;
    gridMaterial.linewidth = 1;
    gridMaterial.depthWrite = false; // Crucial anti-scintillement
    gridMaterial.depthTest = true;
    
    return grid;
  };

  /**
   * Met à jour la grille selon le contenu actuel
   */
  const updateAdaptiveGrid = (isDark: boolean = false) => {
    if (!engineRef.current) return;
    
    const scene = engineRef.current.getScene();
    if (!scene) return;
    
    // Supprimer TOUTES les grilles existantes pour éviter les doublons
    const gridsToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.GridHelper) {
        gridsToRemove.push(child);
      }
    });
    
    gridsToRemove.forEach(grid => {
      scene.remove(grid);
    });
    
    // Créer la nouvelle grille adaptée
    const newGrid = createAdaptiveGrid(isDark);
    scene.add(newGrid);
    
    calculateSceneBounds();
  };

  useEffect(() => {
    // Initialisation du viewer 3D uniquement côté client
    if (canvasRef.current && containerRef.current && !engineRef.current) {
      
      try {
        // Créer l'EventBus
        eventBusRef.current = new EventBus();
        
        // Créer et initialiser le moteur de rendu
        const initEngine = async () => {
          engineRef.current = new ViewerEngine();
          
          await engineRef.current.initialize({
            canvas: canvasRef.current!,
            antialias: true,
            shadows: false, // Désactivé pour CAD technique
            backgroundColor: theme === 'dark' ? '#1f2937' : '#e6f2ff', // Adapté au thème
            maxFPS: 60,
            // Configuration qualité CAD
            logarithmicDepthBuffer: true, // Anti Z-fighting
            precision: 'highp', // Haute précision
            powerPreference: 'high-performance'
          });

          // Préchargement optimisé des WebWorkers CSG après l'initialisation du viewer
          preloadCSGWorkers().catch(err => {
            console.debug('CSG WebWorkers preload warning:', err);
          });
          
          // Expose references for tools (ProfessionalViewer)
          if (canvasRef.current) {
            (canvasRef.current as any).__renderer = engineRef.current.getRenderer();
            (canvasRef.current as any).__scene = engineRef.current.getScene();
            (canvasRef.current as any).__camera = engineRef.current.getCamera();
          }
          
          // Récupérer le CameraController pour le ViewCube
          cameraControllerRef.current = engineRef.current.getCameraController();
        
        
        // Forcer un resize immédiat après l'initialisation
        if (containerRef.current && canvasRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          engineRef.current.handleResize(width, height);
        }
        
        setIsEngineReady(true);
        
        // Configuration CAD professionnelle - Zone limitée
        const scene = engineRef.current.getScene();
        if (scene) {
          // Background adapté au thème
          const bgColor = theme === 'dark' ? '#1f2937' : '#e6f2ff';
          scene.background = new THREE.Color(bgColor);
          
          // Pas de fog - Vision claire à toutes les distances
          scene.fog = null;
          
          // Configurer les limites de zoom adaptatives
          const controlsManager = engineRef.current?.getControlsManager();
          if (controlsManager) {
            const { size: sceneSize } = calculateSceneBounds();
            controlsManager.updateZoomLimits(sceneSize);
          }
          
          // === ÉCLAIRAGE CAD TECHNIQUE ===
          
          // Lumière ambiante uniforme pour CAD
          const ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
          scene.add(ambientLight);
          
          // Éclairage directionnel doux sans reflets intenses
          const mainLight = new THREE.DirectionalLight('#ffffff', 0.5);
          mainLight.position.set(1, 1, 1);
          mainLight.castShadow = false; // Pas d'ombres pour CAD technique
          scene.add(mainLight);
          
          // Éclairage de remplissage opposé
          const fillLight = new THREE.DirectionalLight('#ffffff', 0.3);
          fillLight.position.set(-1, 0.5, -1);
          scene.add(fillLight);
          
          // === GRILLE ADAPTATIVE UNIQUE ===
          
          // Créer une grille par défaut (sera remplacée si éléments présents)
          setTimeout(() => {
            updateAdaptiveGrid(false);
          }, 50);
          
          // === AXES TECHNIQUES ===
          
          // Axes plus visibles mais discrets
          const axesHelper = new THREE.AxesHelper(1500);
          const axesMaterials = (axesHelper as any).material as THREE.LineBasicMaterial[];
          if (axesMaterials && axesMaterials.length >= 3) {
            axesMaterials[0].color = new THREE.Color('#dc2626'); // X - Rouge CAD
            axesMaterials[1].color = new THREE.Color('#16a34a'); // Y - Vert CAD  
            axesMaterials[2].color = new THREE.Color('#2563eb'); // Z - Bleu CAD
            axesMaterials.forEach(mat => {
              mat.opacity = 0.9;
              mat.linewidth = 2;
            });
          }
          axesHelper.name = 'Axes';
          scene.add(axesHelper);
          
          // === PLAN DE RÉFÉRENCE TECHNIQUE ===
          
          // Calculer la position du plan basée sur les éléments
          const { minY: planeY } = calculateSceneBounds();
          
          // Plan de travail subtil bleuté
          const workplaneGeometry = new THREE.PlaneGeometry(30000, 30000, 1, 1);
          const workplaneMaterial = new THREE.MeshBasicMaterial({ 
            color: '#cce7ff',
            transparent: true,
            opacity: 0.02,
            side: THREE.DoubleSide
          });
          const workplane = new THREE.Mesh(workplaneGeometry, workplaneMaterial);
          workplane.rotation.x = -Math.PI / 2;
          workplane.position.y = planeY - 10; // Même niveau que la grille
          workplane.name = 'Workplane';
          scene.add(workplane);
          
        }
        
        // Positionner la caméra
        const camera = engineRef.current.getCamera();
        if (camera) {
          camera.position.set(3000, 3000, 3000);
          camera.lookAt(0, 0, 0);
        }
        
        // Initialiser l'outil de mesure
        if (scene && camera && canvasRef.current) {
          measurementToolRef.current = new SimpleMeasurementTool(scene, camera, canvasRef.current);
          
          // Configuration des événements de l'outil de mesure
          if (eventBusRef.current) {
            eventBusRef.current.on('snap-measurement:snapDetected', (data: any) => {
              setSnapInfo({ type: data.type, hasSnap: true });
            });
            
            eventBusRef.current.on('snap-measurement:snapCleared', () => {
              setSnapInfo(null);
            });
            
            eventBusRef.current.on('snap-measurement:pointAdded', (data: any) => {
              setMeasurementProgress({ pointsCount: data.index, total: data.total });
            });
            
            eventBusRef.current.on('snap-measurement:created', (_data: any) => {
              setMeasurementProgress({ pointsCount: 0, total: 2 });
            });
          }
        }
        
        // Ne PAS ajouter les éléments ici - attendre que le moteur soit complètement prêt
        };
        
        // Appeler la fonction async
        initEngine();
      } catch (err) {
        setError('Erreur lors de l\'initialisation du viewer 3D');
      }
    }
    
    return () => {
      // Nettoyage
      if (measurementToolRef.current) {
        measurementToolRef.current.dispose();
        measurementToolRef.current = null;
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (eventBusRef.current) {
        eventBusRef.current.removeAllListeners();
        eventBusRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]); // Ne pas avoir de dépendances pour éviter les re-renders
  
  // Configurer les événements de sélection après l'initialisation
  useEffect(() => {
    if (engineRef.current && canvasRef.current && eventBusRef.current) {
      const cleanup = setupSelectionEvents();
      return cleanup;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, measurementMode, hoveredId, initialElements, onElementSelect]); // Recréer quand selectedIds change
  
  /**
   * Configure les événements de sélection et d'interaction
   */
  const setupSelectionEvents = () => {
    if (!canvasRef.current || !eventBusRef.current) return;
    
    const canvas = canvasRef.current;
    const eventBus = eventBusRef.current;
    
    // Raycaster pour la détection de clics
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    
    // Variables pour distinguer clic/drag
    let isMouseDown = false;
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };
    let hasMoved = false;
    
    // Gestion du mousedown
    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseDownTime = Date.now();
      mouseDownPos = { x: event.clientX, y: event.clientY };
      hasMoved = false;
    };
    
    // Gestion du mousemove pour le snap de mesure
    const handleMouseMove = (event: MouseEvent) => {
      if (!engineRef.current) return;
      
      // Si en mode mesure, utiliser l'outil de mesure pour le snap
      if (measurementMode && measurementToolRef.current) {
        measurementToolRef.current.handleMouseMove(event);
      }
    };
    
    // Gestion du mousemove combiné (drag + survol)
    const handleMouseMoveCombi = (event: MouseEvent) => {
      // Détecter le drag si souris enfoncée
      if (isMouseDown) {
        const deltaX = Math.abs(event.clientX - mouseDownPos.x);
        const deltaY = Math.abs(event.clientY - mouseDownPos.y);
        if (deltaX > 3 || deltaY > 3) { // Seuil de 3px pour éviter les micro-mouvements
          hasMoved = true;
        }
      }
      
      // Survol normal (hors mode mesure)
      if (!isMouseDown && !measurementMode && engineRef.current) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const camera = engineRef.current.getCamera();
        const scene = engineRef.current.getScene();
        
        if (camera && scene) {
          raycaster.setFromCamera(pointer, camera);
          
          // Mode survol normal
          const meshes: THREE.Mesh[] = [];
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.elementId) {
              meshes.push(child);
            }
          });
          
          const intersects = raycaster.intersectObjects(meshes, false);
          
          if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            const elementId = hoveredObject.userData.elementId;
            
            if (elementId !== hoveredId) {
              setHoveredId(elementId);
              canvas.style.cursor = 'pointer';
              eventBus.emit('hover:changed', { id: elementId });
            }
          } else {
            if (hoveredId) {
              setHoveredId(null);
              canvas.style.cursor = 'default';
              eventBus.emit('hover:changed', { id: null });
            }
          }
        }
      }
    };
    
    // Gestion du mouseup pour sélection
    const handleMouseUp = (event: MouseEvent) => {
      if (!isMouseDown) return;
      
      isMouseDown = false;
      const clickDuration = Date.now() - mouseDownTime;
      
      // Ne traiter comme un clic que si :
      // 1. Pas de mouvement significatif (< 3px)
      // 2. Durée courte (< 200ms)
      // 3. Bouton gauche uniquement
      if (!hasMoved && clickDuration < 200 && event.button === 0) {
        handleSelection(event);
      }
    };
    
    // Fonction de sélection/mesure séparée
    const handleSelection = (event: MouseEvent) => {
      if (!engineRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const camera = engineRef.current.getCamera();
      const scene = engineRef.current.getScene();
      
      if (camera && scene) {
        raycaster.setFromCamera(pointer, camera);
        
        // Si en mode mesure, utiliser l'outil de mesure
        if (measurementMode && measurementToolRef.current) {
          const handled = measurementToolRef.current.handleClick(event);
          if (handled) return;
        }
        
        // Mode sélection normal
        const meshes: THREE.Mesh[] = [];
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.userData.elementId) {
            meshes.push(child);
          }
        });
        
        const intersects = raycaster.intersectObjects(meshes, false);
        
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          const elementId = clickedObject.userData.elementId;
          
          if (elementId) {
            // Gérer la sélection avec Ctrl/Cmd pour multi-sélection
            let newSelection: string[];
            if (event.ctrlKey || event.metaKey) {
              newSelection = selectedIds.includes(elementId)
                ? selectedIds.filter(id => id !== elementId)
                : [...selectedIds, elementId];
            } else {
              newSelection = [elementId];
              
              // Mettre à jour le point de rotation des contrôles
              updateOrbitTarget(clickedObject.position);
            }
            
            setSelectedIds(newSelection);
            onElementSelect?.(newSelection);
            eventBus.emit('selection:changed', { ids: newSelection });
            
            // Mettre à jour visuellement la sélection
            updateSelectionVisuals(newSelection);
            
          }
        } else {
          // Clic dans le vide - désélectionner seulement si pas de Ctrl/Cmd
          if (!event.ctrlKey && !event.metaKey) {
            setSelectedIds([]);
            onElementSelect?.([]);
            eventBus.emit('selection:changed', { ids: [] });
            
            // Réinitialiser le point de rotation
            updateOrbitTarget(new THREE.Vector3(0, 0, 0));
            
            // Mettre à jour visuellement
            updateSelectionVisuals([]);
            
          }
        }
      }
    };
    
    
    
    // Gestion des raccourcis clavier - Améliorer la détection d'Escape
    const handleKeyDown = (event: KeyboardEvent) => {
      
      switch (event.key.toLowerCase()) {
        case 'escape':
          // Désélectionner tout et sortir du mode mesure
          event.preventDefault();
          if (measurementMode) {
            setMeasurementMode(false);
            if (measurementToolRef.current) {
              measurementToolRef.current.setActive(false);
            }
            setSnapInfo(null);
            setMeasurementProgress({ pointsCount: 0, total: 2 });
            canvas.style.cursor = 'default';
          } else {
            setSelectedIds([]);
            onElementSelect?.([]);
            eventBusRef.current?.emit('selection:changed', { ids: [] });
            updateSelectionVisuals([]);
            updateOrbitTarget(new THREE.Vector3(0, 0, 0));
          }
          break;
          
        case 'm': {
          // Activer/Désactiver le mode mesure
          event.preventDefault();
          const newMeasureMode = !measurementMode;
          setMeasurementMode(newMeasureMode);
          
          if (measurementToolRef.current) {
            measurementToolRef.current.setActive(newMeasureMode);
          }
          
          if (!newMeasureMode) {
            setSnapInfo(null);
            setMeasurementProgress({ pointsCount: 0, total: 2 });
          }
          
          canvas.style.cursor = newMeasureMode ? 'crosshair' : 'default';
          
          // Feedback temporaire dans la console pour debug
          console.log(`📏 Mode mesure: ${newMeasureMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
          break;
        }
          
        case 'c':
          // Effacer toutes les mesures (Clear measurements)
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (measurementToolRef.current) {
              measurementToolRef.current.clearAllMeasurements();
              console.log('🗑️ Mesures effacées');
            }
          }
          break;
          
        case 'Delete':
          // Supprimer les éléments sélectionnés (si autorisé)
          if (selectedIds.length > 0) {
            // TODO: Implémenter la suppression si nécessaire
          }
          break;
          
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            // Sélectionner tout
            event.preventDefault();
            const allIds = initialElements.map(e => e.id);
            setSelectedIds(allIds);
            onElementSelect?.(allIds);
            eventBusRef.current?.emit('selection:changed', { ids: allIds });
            
            // Mettre à jour visuellement la sélection
            updateSelectionVisuals(allIds);
          }
          break;
          
        case 'f':
          // Focus sur la sélection
          if (selectedIds.length > 0) {
            focusOnSelection();
          }
          break;
      }
    };
    
    // Ajouter les écouteurs - Nouvelle approche pour éviter conflit avec rotation
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMoveCombi);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Focus sur canvas pour capturer les événements clavier
    canvas.tabIndex = -1; // Permettre le focus sur canvas
    canvas.addEventListener('click', () => canvas.focus()); // Focus au clic
    document.addEventListener('keydown', handleKeyDown);
    
    // Nettoyer les écouteurs lors du démontage
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMoveCombi);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  };
  
  /**
   * Met à jour le point de rotation des contrôles OrbitControls
   */
  const updateOrbitTarget = (position: THREE.Vector3) => {
    if (!engineRef.current) return;
    
    // Accéder aux contrôles via le ViewerEngine
    const controlsManager = engineRef.current.getControlsManager();
    if (controlsManager) {
      const controls = controlsManager.getOrbitControls();
      if (controls) {
        controls.target.copy(position);
        controls.update();
      }
    }
  };
  
  /**
   * Met à jour l'apparence visuelle de la sélection
   */
  const updateSelectionVisuals = (selectedIds: string[]) => {
    if (!engineRef.current) return;
    
    const scene = engineRef.current.getScene();
    if (!scene) return;
    
    // Parcourir tous les objets de la scène
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.elementId) {
        const isSelected = selectedIds.includes(child.userData.elementId);
        
        // Gérer différents types de matériaux
        if (child.material) {
          // Si c'est un MeshStandardMaterial, utiliser l'émission
          if (child.material instanceof THREE.MeshStandardMaterial) {
            if (isSelected) {
              // Ajouter une légère émission orange pour la sélection
              child.material.emissive = new THREE.Color('#ff6600');
              child.material.emissiveIntensity = 0.3;
              child.material.needsUpdate = true;
            } else {
              // Réinitialiser l'émission
              child.material.emissive = new THREE.Color('#000000');
              child.material.emissiveIntensity = 0;
              child.material.needsUpdate = true;
            }
          } 
          // Pour les autres types de matériaux, changer la couleur
          else if (child.material instanceof THREE.MeshBasicMaterial || 
                   child.material instanceof THREE.MeshPhongMaterial ||
                   child.material instanceof THREE.MeshLambertMaterial) {
            // Stocker la couleur originale si pas déjà fait
            if (!child.userData.originalColor) {
              child.userData.originalColor = child.material.color.getHex();
            }
            
            if (isSelected) {
              // Appliquer une teinte orange pour la sélection
              child.material.color = new THREE.Color('#ff9900');
            } else {
              // Restaurer la couleur originale
              child.material.color = new THREE.Color(child.userData.originalColor);
            }
            child.material.needsUpdate = true;
          }
        }
      }
    });
  };
  







  /**
   * Centre la caméra sur les éléments sélectionnés
   */
  const focusOnSelection = () => {
    if (!engineRef.current || selectedIds.length === 0) return;
    
    const scene = engineRef.current.getScene();
    const camera = engineRef.current.getCamera();
    
    if (scene && camera) {
      const box = new THREE.Box3();
      let hasObjects = false;
      
      // Calculer la boîte englobante de la sélection
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && selectedIds.includes(child.userData.elementId)) {
          box.expandByObject(child);
          hasObjects = true;
        }
      });
      
      if (hasObjects) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;
        
        // Positionner la caméra
        const direction = new THREE.Vector3(1, 1, 1).normalize();
        camera.position.copy(center).add(direction.multiplyScalar(distance));
        
        // Mettre à jour le point de rotation
        updateOrbitTarget(center);
        
      }
    }
  };
  
  // Gérer le changement de thème professionnel
  useEffect(() => {
    if (engineRef.current && engineRef.current.isInitialized) {
      // Définir la couleur selon le thème
      const bgColor = theme === 'dark' ? '#1f2937' : '#e6f2ff';
      
      // Changer la couleur de fond via ViewerEngine
      engineRef.current.setBackgroundColor(bgColor);
      
      // Mettre à jour la grille adaptative selon le thème
      updateAdaptiveGrid(theme === 'dark');
      
      // Mettre à jour le plan de travail
      const scene = engineRef.current.getScene();
      if (scene) {
        const workplane = scene.getObjectByName('Workplane');
        if (workplane && workplane instanceof THREE.Mesh) {
          const workplaneMaterial = workplane.material as THREE.MeshBasicMaterial;
          workplaneMaterial.color = new THREE.Color(theme === 'dark' ? '#1f2937' : '#cce7ff');
          workplaneMaterial.opacity = theme === 'dark' ? 0.01 : 0.015;
        }
      }
      
    }
  }, [theme]);

  // Gestion du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        engineRef.current.handleResize(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Appel initial

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Chargement des éléments UNIQUEMENT quand le moteur est prêt et une seule fois
  useEffect(() => {
    if (isEngineReady && engineRef.current && !elementsAddedRef.current && initialElements.length > 0) {
      elementsAddedRef.current = true;
      setIsLoading(true);

      // Ajouter les éléments une seule fois
      initialElements.forEach(element => {
        engineRef.current?.addElement(element);
      });

      // Mettre à jour la grille selon le nouveau contenu
      updateAdaptiveGrid(theme === 'dark');

      // Mettre à jour les limites de zoom selon le nouveau contenu
      const { size } = calculateSceneBounds();
      const controlsManager = engineRef.current?.getControlsManager();
      if (controlsManager) {
        controlsManager.updateZoomLimits(size);
      }

      // Centrer la vue sur les éléments avec positionnement intelligent
      setTimeout(() => {
        const { size, center } = calculateSceneBounds();
        const camera = engineRef.current?.getCamera();
        if (camera) {
          // Vue très rapprochée - ajuster le FOV pour une vue plus serrée
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 35; // Réduire le champ de vision (défaut: 75°)
            camera.updateProjectionMatrix();
          }

          // Distance beaucoup plus proche pour vue resserrée
          const distance = Math.max(size * 0.4, 2000); // 40% ou minimum 2m
          camera.position.set(
            center.x + distance * 0.6,
            center.y + distance * 0.8,
            center.z + distance * 0.6
          );
          camera.lookAt(center);
        }
        setIsLoading(false);
      }, 100);
    }
  }, [isEngineReady, theme, initialElements]); // Ajouter theme pour la mise à jour de grille

  return (
    <div 
      ref={containerRef}
      className={`topsteelcad-container ${className} ${theme}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: theme === 'dark' ? '#0a0a0a' : '#e6f2ff',
        overflow: 'hidden'
      }}
    >
      {/* Canvas principal */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      {/* Indicateur de chargement */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Loader2 
            size={48} 
            style={{
              animation: 'spin 1s linear infinite',
              color: theme === 'dark' ? '#0ea5e9' : '#3b82f6'
            }}
          />
          <span style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
            Initialisation de la scène 3D...
          </span>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem'
        }}>
          {error}
        </div>
      )}

      {/* Logo/Nom du viewer en bas à gauche - positionné par rapport au canvas */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        left: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: theme === 'dark' 
          ? 'rgba(15, 23, 42, 0.9)' 
          : 'rgba(255, 255, 255, 0.9)',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
        boxShadow: theme === 'dark'
          ? '0 4px 6px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000
      }}>
        <div style={{
          fontSize: '1.5rem',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center'
        }}>
          🏗️
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem'
        }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: '700',
            color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
            letterSpacing: '0.025em'
          }}>
            TopSteelCAD
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: theme === 'dark' ? '#64748b' : '#94a3b8',
            fontWeight: '400'
          }}>
            3D Steel Viewer
          </div>
        </div>
      </div>

      {/* Contrôles professionnels */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        right: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {/* Bouton Thème */}
        <button
          onClick={() => {
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            // Notifier le parent via callback
            onThemeChange?.(newTheme);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            color: theme === 'dark' ? '#e2e8f0' : '#334155',
            border: `1px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`,
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            backdropFilter: 'blur(8px)',
            boxShadow: theme === 'dark' 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'dark' 
              ? 'rgba(51, 65, 85, 0.9)' 
              : 'rgba(248, 250, 252, 0.9)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'dark' 
              ? 'rgba(30, 41, 59, 0.9)' 
              : 'rgba(255, 255, 255, 0.9)';
          }}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Clair' : 'Sombre'}
        </button>
        
        {/* Bouton Reset View */}
        <button
          onClick={() => {
            if (engineRef.current) {
              const { size, center } = calculateSceneBounds();
              const camera = engineRef.current.getCamera();
              if (camera) {
                // Vue resserrée avec FOV réduit
                if (camera instanceof THREE.PerspectiveCamera) {
                  camera.fov = 35; 
                  camera.updateProjectionMatrix();
                }
                
                // Distance proche pour vue détaillée  
                const distance = Math.max(size * 0.4, 2000);
                camera.position.set(
                  center.x + distance * 0.6,
                  center.y + distance * 0.8, 
                  center.z + distance * 0.6
                );
                camera.lookAt(center);
                
                // Point de rotation au centre du contenu
                updateOrbitTarget(center);
              }
              
              // Désélectionner tout
              setSelectedIds([]);
              onElementSelect?.([]);
            }
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            color: theme === 'dark' ? '#e2e8f0' : '#334155',
            border: `1px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`,
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            backdropFilter: 'blur(8px)',
            boxShadow: theme === 'dark' 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'dark' 
              ? 'rgba(51, 65, 85, 0.9)' 
              : 'rgba(248, 250, 252, 0.9)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'dark' 
              ? 'rgba(30, 41, 59, 0.9)' 
              : 'rgba(255, 255, 255, 0.9)';
          }}
        >
          <span>🔄</span>
          Reset View
        </button>
        
        {/* Info-bulle raccourcis clavier */}
        <div style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          border: `1px solid ${theme === 'dark' ? '#475569' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          fontSize: '0.7rem',
          backdropFilter: 'blur(8px)',
          boxShadow: theme === 'dark' 
            ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)' 
            : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
          maxWidth: '200px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>
            ⌨️ Raccourcis
          </div>
          <div style={{ lineHeight: '1.3' }}>
            <div><span style={{ fontWeight: '500' }}>M</span> - Mode mesure</div>
            <div><span style={{ fontWeight: '500' }}>Échap</span> - Annuler/Désélectionner</div>
            <div><span style={{ fontWeight: '500' }}>F</span> - Focus sélection</div>
            <div><span style={{ fontWeight: '500' }}>Ctrl+C</span> - Effacer mesures</div>
            <div><span style={{ fontWeight: '500' }}>Ctrl+A</span> - Tout sélectionner</div>
          </div>
        </div>
      </div>
      
      {/* VIEWCUBE - Cube de navigation 3D */}
      {isEngineReady && cameraControllerRef.current && (
        <ViewCube
          cameraController={cameraControllerRef.current}
          theme={theme}
          size={100}
          position="top-right"
          onViewChange={(view) => {
            console.log(`🎯 ViewCube: Changement de vue vers ${view}`);
          }}
          enableDrag={true}
          enableDoubleClick={true}
          animationDuration={500}
        />
      )}
      
      {/* Zone des indicateurs - en bas de l'écran */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {/* Informations de sélection */}
        {selectedIds.length > 0 && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.1)',
            color: theme === 'dark' ? '#dbeafe' : '#1e40af',
            border: `1px solid ${theme === 'dark' ? '#3b82f6' : '#93c5fd'}`,
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            backdropFilter: 'blur(8px)',
            boxShadow: theme === 'dark' 
              ? '0 2px 4px -1px rgba(59, 130, 246, 0.3)' 
              : '0 2px 4px -1px rgba(59, 130, 246, 0.1)'
          }}>
            {selectedIds.length === 1 ? (
              // Afficher les détails si un seul élément sélectionné
              (() => {
                const element = initialElements.find(e => e.id === selectedIds[0]);
                if (!element) return `1 élément sélectionné`;
                
                // Déterminer le type d'élément
                const isPlate = element.materialType === MaterialType.PLATE || 
                               element.name?.toLowerCase().includes('plaque') ||
                               element.name?.toLowerCase().includes('plate');
                // const isBeam = element.materialType === MaterialType.BEAM || 
                //               element.metadata?.profile;
                
                return (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {isPlate ? '🔲' : '📐'} {element.name || 'Élément'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', fontSize: '0.7rem', opacity: 0.9 }}>
                      {/* Profil pour les poutres */}
                      {element.metadata?.profile && (
                        <div>Profil: <span style={{ fontWeight: '500' }}>{element.metadata.profile}</span></div>
                      )}
                      
                      {/* Dimensions selon le type */}
                      {isPlate ? (
                        <>
                          <div>Longueur: <span style={{ fontWeight: '500' }}>{element.dimensions.length?.toFixed(0) || 0} mm</span></div>
                          <div>Largeur: <span style={{ fontWeight: '500' }}>{element.dimensions.width?.toFixed(0) || 0} mm</span></div>
                          <div>Épaisseur: <span style={{ fontWeight: '500' }}>
                            {(element.dimensions.thickness || element.metadata?.thickness || 0).toFixed(0)} mm
                          </span></div>
                        </>
                      ) : (
                        <>
                          <div>Longueur: <span style={{ fontWeight: '500' }}>{element.dimensions.length?.toFixed(0) || 0} mm</span></div>
                          {element.dimensions.height && element.dimensions.height > 0 && (
                            <div>Hauteur: <span style={{ fontWeight: '500' }}>{element.dimensions.height.toFixed(0)} mm</span></div>
                          )}
                          {element.dimensions.width && (
                            <div>Largeur: <span style={{ fontWeight: '500' }}>{element.dimensions.width.toFixed(0)} mm</span></div>
                          )}
                          {element.dimensions.webThickness && (
                            <div>Âme: <span style={{ fontWeight: '500' }}>{element.dimensions.webThickness.toFixed(1)} mm</span></div>
                          )}
                          {element.dimensions.flangeThickness && (
                            <div>Aile: <span style={{ fontWeight: '500' }}>{element.dimensions.flangeThickness.toFixed(1)} mm</span></div>
                          )}
                        </>
                      )}
                      
                      {/* Propriétés communes */}
                      {element.metadata?.weight && (
                        <div>Poids: <span style={{ fontWeight: '500' }}>{element.metadata.weight.toFixed(1)} kg</span></div>
                      )}
                      {element.material?.grade && (
                        <div>Nuance: <span style={{ fontWeight: '500' }}>{element.material.grade}</span></div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              // Afficher le nombre si plusieurs éléments
              `${selectedIds.length} éléments sélectionnés`
            )}
          </div>
        )}
        
        {/* Indicateur de survol */}
        {hoveredId && !selectedIds.includes(hoveredId) && !measurementMode && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: theme === 'dark' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(251, 191, 36, 0.1)',
            color: theme === 'dark' ? '#fef3c7' : '#92400e',
            border: `1px solid ${theme === 'dark' ? '#f59e0b' : '#fcd34d'}`,
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            backdropFilter: 'blur(8px)',
            boxShadow: theme === 'dark' 
              ? '0 2px 4px -1px rgba(251, 191, 36, 0.3)' 
              : '0 2px 4px -1px rgba(251, 191, 36, 0.1)'
          }}>
            Survol: {hoveredId}
          </div>
        )}
        
        {/* Indicateur du mode mesure */}
        {measurementMode && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: snapInfo?.hasSnap 
              ? (theme === 'dark' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.1)') 
              : (theme === 'dark' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.1)'),
            color: snapInfo?.hasSnap 
              ? (theme === 'dark' ? '#dcfce7' : '#166534') 
              : (theme === 'dark' ? '#dbeafe' : '#1e40af'),
            border: `2px solid ${snapInfo?.hasSnap 
              ? (theme === 'dark' ? '#22c55e' : '#4ade80') 
              : (theme === 'dark' ? '#3b82f6' : '#60a5fa')}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            backdropFilter: 'blur(8px)',
            boxShadow: snapInfo?.hasSnap
              ? (theme === 'dark' 
                ? '0 4px 6px -1px rgba(34, 197, 94, 0.3)' 
                : '0 4px 6px -1px rgba(34, 197, 94, 0.1)')
              : (theme === 'dark' 
                ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' 
                : '0 4px 6px -1px rgba(59, 130, 246, 0.1)'),
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}>
            <span>{snapInfo?.hasSnap ? '🎯' : '📏'}</span>
            <div style={{ flex: 1 }}>
              <div>{snapInfo?.hasSnap ? `Snap: ${snapInfo.type}` : 'Mode Mesure ACTIF'}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.125rem' }}>
                {measurementProgress.pointsCount === 0 
                  ? 'Cliquez pour placer le 1er point' 
                  : `Cliquez pour placer le 2ème point`}
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', opacity: 0.6, textAlign: 'right' }}>
              <div>Échap - Quitter</div>
              <div>Ctrl+C - Effacer</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export par défaut pour compatibilité
export default TopSteelCAD;