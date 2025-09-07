/**
 * GeometryCreationService.ts - Service centralisé pour la création de géométries de coupe
 * Extrait et unifie toutes les méthodes de création de géométrie du CutProcessor
 */

import * as THREE from 'three';
import { Feature, ProfileFace, ProfileType, PivotElement } from '../types/CoreTypes';
import { PositionService } from '../../../../services/PositionService';

/**
 * Options pour la création de géométrie
 */
export interface GeometryCreationOptions {
  depth?: number;
  face?: ProfileFace;
  isTransverse?: boolean;
  cutType?: string;
  margin?: number;
  extendToEdges?: boolean;
  preserveContour?: boolean;
}

/**
 * Information sur les limites d'un contour
 */
export interface ContourBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Service pour la création de toutes les géométries de coupe
 */
export class GeometryCreationService {
  private positionService: PositionService;
  private readonly DEFAULT_DEPTH = 10;
  private readonly DEFAULT_MARGIN = 100;
  private readonly TRANSVERSE_CUT_MARGIN = 50;

  constructor() {
    this.positionService = PositionService.getInstance();
  }

  /**
   * Helper pour appliquer une transformation Matrix4 de manière sécurisée
   */
  private safeApplyMatrixTransform(
    geometry: THREE.BufferGeometry,
    operation: 'translation' | 'rotation',
    matrixFn: (matrix: THREE.Matrix4) => void,
    errorContext: string
  ): void {
    try {
      const matrix = new THREE.Matrix4();
      matrixFn(matrix);
      geometry.applyMatrix4(matrix);
    } catch (error) {
      console.error(`❌ Matrix ${operation} error in ${errorContext}:`, error);
      console.warn(`⚠️ Skipping ${operation} for ${errorContext}`);
    }
  }

  /**
   * Crée une géométrie de coupe standard
   * Méthode principale qui délègue aux méthodes spécialisées
   */
  createCutGeometry(
    contourPoints: Array<[number, number]>,
    element: PivotElement,
    options: GeometryCreationOptions = {}
  ): THREE.BufferGeometry {
    const {
      depth = this.getDefaultDepth(element, options.face),
      face = ProfileFace.WEB,
      isTransverse = false,
      cutType
    } = options;

    // Délégation selon le type de coupe
    if (isTransverse && face !== ProfileFace.WEB && face !== ProfileFace.BOTTOM_FLANGE) {
      return this.createTransverseCut(contourPoints, element, options);
    }

    // Déterminer le type de géométrie à créer selon la face
    switch (face) {
      case ProfileFace.TOP_FLANGE:
        return this.createTopFlangeCut(contourPoints, depth, element, options);
      
      case ProfileFace.BOTTOM_FLANGE:
        return this.createBottomFlangeCut(contourPoints, depth, element, options);
      
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        return this.createWebCut(contourPoints, depth, element, options);
      
      default:
        return this.createGenericCut(contourPoints, depth, element, options);
    }
  }

  /**
   * Crée une géométrie de coupe pour l'âme (web)
   */
  private createWebCut(
    contourPoints: Array<[number, number]>,
    depth: number,
    element: PivotElement,
    options: GeometryCreationOptions
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const bounds = this.getContourBounds(contourPoints);
    
    console.log(`  📐 Creating web cut geometry:`);
    console.log(`    Contour: ${contourPoints.length} points`);
    console.log(`    Bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
    console.log(`    Depth: ${depth}mm`);

    // Créer la forme 2D à partir du contour
    const shape = this.createShapeFromContour(contourPoints);
    
    // Extruder la forme pour créer le volume 3D
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer les transformations selon le système de coordonnées DSTV
    this.applyDSTVTransform(geometry, options.face || ProfileFace.WEB, element, bounds);
    
    return geometry;
  }

  /**
   * Crée une géométrie de coupe pour la semelle supérieure
   */
  private createTopFlangeCut(
    contourPoints: Array<[number, number]>,
    depth: number,
    element: PivotElement,
    options: GeometryCreationOptions
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const bounds = this.getContourBounds(contourPoints);
    
    console.log(`  📐 Creating top flange cut geometry`);
    
    // Pour la semelle supérieure, adapter les coordonnées
    const adaptedPoints = this.adaptPointsForFlange(contourPoints, ProfileFace.TOP_FLANGE, element);
    const shape = this.createShapeFromContour(adaptedPoints);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth || dims.flangeThickness || this.DEFAULT_DEPTH,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner correctement sur la semelle supérieure
    const yOffset = (dims.height || 300) / 2 - (dims.flangeThickness || 20) / 2;
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(0, yOffset, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une géométrie de coupe pour la semelle inférieure
   */
  private createBottomFlangeCut(
    contourPoints: Array<[number, number]>,
    depth: number,
    element: PivotElement,
    options: GeometryCreationOptions
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const bounds = this.getContourBounds(contourPoints);
    
    console.log(`  📐 Creating bottom flange cut geometry`);
    
    // Pour la semelle inférieure, adapter les coordonnées
    const adaptedPoints = this.adaptPointsForFlange(contourPoints, ProfileFace.BOTTOM_FLANGE, element);
    const shape = this.createShapeFromContour(adaptedPoints);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth || dims.flangeThickness || this.DEFAULT_DEPTH,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner correctement sur la semelle inférieure
    const yOffset = -(dims.height || 300) / 2 + (dims.flangeThickness || 20) / 2;
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(0, yOffset, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une géométrie de coupe transversale
   */
  createTransverseCut(
    contourPoints: Array<[number, number]>,
    element: PivotElement,
    options: GeometryCreationOptions = {}
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const bounds = this.getContourBounds(contourPoints);
    
    console.log(`  📐 Creating transverse cut geometry`);
    console.log(`    Direction: perpendicular to beam axis`);
    
    // Pour une coupe transversale, on crée un volume qui traverse le profil
    const width = bounds.width || this.TRANSVERSE_CUT_MARGIN;
    const height = dims.height || 300;
    const depth = bounds.height || dims.webThickness || 50;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Positionner selon le contour
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(
      bounds.centerX,
      0, // Centré verticalement
      0
    );
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une géométrie de coupe générique
   */
  private createGenericCut(
    contourPoints: Array<[number, number]>,
    depth: number,
    element: PivotElement,
    options: GeometryCreationOptions
  ): THREE.BufferGeometry {
    console.log(`  📐 Creating generic cut geometry`);
    
    // Utiliser une boîte simple basée sur les limites du contour
    const bounds = this.getContourBounds(contourPoints);
    const geometry = new THREE.BoxGeometry(
      bounds.width || 100,
      bounds.height || 50,
      depth
    );
    
    // Centrer sur la position du contour
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(bounds.centerX, bounds.centerY, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une forme THREE.Shape à partir de points de contour
   */
  private createShapeFromContour(points: Array<[number, number]>): THREE.Shape {
    const shape = new THREE.Shape();
    
    if (points.length === 0) {
      return shape;
    }
    
    // Démarrer au premier point
    shape.moveTo(points[0][0], points[0][1]);
    
    // Ajouter les lignes vers les autres points
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    
    // Fermer le contour si nécessaire
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first[0] - last[0]) > 0.01 || Math.abs(first[1] - last[1]) > 0.01) {
      shape.lineTo(first[0], first[1]);
    }
    
    return shape;
  }

  /**
   * Adapte les points de contour pour une semelle
   */
  private adaptPointsForFlange(
    points: Array<[number, number]>,
    face: ProfileFace,
    element: PivotElement
  ): Array<[number, number]> {
    const dims = element.dimensions || {};
    const adapted: Array<[number, number]> = [];
    
    // Pour les semelles, on peut avoir besoin de transformer les coordonnées
    // selon le système de référence de la face
    for (const point of points) {
      // Les coordonnées X restent identiques (le long de la poutre)
      // Les coordonnées Y peuvent nécessiter une adaptation
      let x = point[0];
      let y = point[1];
      
      // Pour les semelles, Y représente la largeur, pas la hauteur
      if (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
        // Potentiellement inverser ou adapter Y selon le contexte
        // Pour l'instant, on garde tel quel
      }
      
      adapted.push([x, y]);
    }
    
    return adapted;
  }

  /**
   * Applique les transformations DSTV à la géométrie
   */
  private applyDSTVTransform(
    geometry: THREE.BufferGeometry,
    face: ProfileFace,
    element: PivotElement,
    bounds: ContourBounds
  ): void {
    const dims = element.dimensions || {};
    
    // Rotation et translation selon la face et le type de profil
    const matrix = new THREE.Matrix4();
    
    switch (face) {
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        // Pour l'âme, rotation de 90° autour de X pour orienter correctement
        matrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(matrix);
        
        // Translation pour centrer
        matrix.makeTranslation(0, 0, -(dims.webThickness || 10) / 2);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.TOP_FLANGE:
        // Pour la semelle supérieure
        matrix.makeTranslation(0, (dims.height || 100) / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        // Pour la semelle inférieure
        matrix.makeTranslation(0, -(dims.height || 100) / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
    }
  }

  /**
   * Crée une géométrie de coupe simple (boîte)
   */
  createSimpleCut(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number
  ): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x + width / 2, y + height / 2, z + depth / 2);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une géométrie de coupe complète (traverse tout le profil)
   */
  createFullCut(
    position: number,
    width: number,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const height = dims.height || 300;
    const depth = Math.max(
      dims.webThickness || 10,
      dims.flangeThickness || 20,
      dims.width || 150
    ) + this.DEFAULT_MARGIN;
    
    const geometry = new THREE.BoxGeometry(width, height + this.DEFAULT_MARGIN, depth);
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(position + width / 2, 0, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une géométrie de coupe d'extrémité pour tubes
   */
  createEndCut(
    angle: number,
    position: 'start' | 'end',
    element: PivotElement,
    options: GeometryCreationOptions = {}
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    // Créer un plan de coupe incliné
    const cutWidth = 200; // Largeur de la zone de coupe
    const cutHeight = (dims.height || 300) + this.DEFAULT_MARGIN;
    const cutDepth = (dims.width || 150) + this.DEFAULT_MARGIN;
    
    const geometry = new THREE.BoxGeometry(cutWidth, cutHeight, cutDepth);
    
    // Appliquer l'angle de coupe
    this.safeApplyMatrixTransform(
      geometry,
      'rotation',
      (matrix) => matrix.makeRotationY(angle * Math.PI / 180),
      'end cut'
    );
    
    // Positionner à l'extrémité
    const xPos = position === 'start' ? -cutWidth / 2 : profileLength + cutWidth / 2;
    this.safeApplyMatrixTransform(
      geometry,
      'translation',
      (matrix) => matrix.makeTranslation(xPos, 0, 0),
      'end cut positioning'
    );
    
    return geometry;
  }

  /**
   * Crée une géométrie pour une coupe biseautée (chanfrein)
   */
  createBevelCut(
    contourPoints: Array<[number, number]>,
    bevelAngle: number,
    element: PivotElement,
    options: GeometryCreationOptions = {}
  ): THREE.BufferGeometry {
    const shape = this.createShapeFromContour(contourPoints);
    
    // Créer une extrusion avec biseau
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: options.depth || this.getDefaultDepth(element, options.face),
      bevelEnabled: true,
      bevelThickness: 5,
      bevelSize: 5,
      bevelOffset: 0,
      bevelSegments: 2,
      steps: 2
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer l'angle de biseau
    const matrix = new THREE.Matrix4();
    matrix.makeRotationZ(bevelAngle * Math.PI / 180);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Calcule les limites d'un contour
   */
  getContourBounds(points: Array<[number, number]>): ContourBounds {
    if (points.length === 0) {
      return {
        minX: 0, maxX: 0, minY: 0, maxY: 0,
        width: 0, height: 0, centerX: 0, centerY: 0
      };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  /**
   * Obtient la profondeur par défaut selon le contexte
   */
  private getDefaultDepth(element: PivotElement, face?: ProfileFace): number {
    const dims = element.dimensions || {};
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return dims.flangeThickness || this.DEFAULT_DEPTH;
      
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        return dims.webThickness || this.DEFAULT_DEPTH;
      
      default:
        return this.DEFAULT_DEPTH;
    }
  }

  /**
   * Valide qu'un contour est utilisable
   */
  validateContour(points: Array<[number, number]>): boolean {
    if (!points || points.length < 3) {
      console.warn('Contour requires at least 3 points');
      return false;
    }
    
    // Vérifier que les points sont valides
    for (const point of points) {
      if (!Array.isArray(point) || point.length !== 2) {
        console.warn('Invalid point format in contour');
        return false;
      }
      if (!isFinite(point[0]) || !isFinite(point[1])) {
        console.warn('Invalid coordinates in contour point');
        return false;
      }
    }
    
    return true;
  }
}

// Export singleton
let instance: GeometryCreationService | null = null;

export function getGeometryService(): GeometryCreationService {
  if (!instance) {
    instance = new GeometryCreationService();
  }
  return instance;
}