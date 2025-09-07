/**
 * AngleCutHandler.ts - Handler pour les coupes angulaires
 * Gère les coupes non perpendiculaires et les biseaux
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Handler pour les coupes angulaires
 */
export class AngleCutHandler extends BaseCutHandler {
  readonly name = 'AngleCutHandler';
  readonly supportedTypes = [
    CutType.ANGLE_CUT,
    CutType.BEVEL_CUT,
    CutType.CHAMFER_CUT
  ];
  readonly priority = 55;

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite
    if (params.cutType === 'angle' || params.isAngled) {
      return true;
    }
    
    // Présence d'un angle non nul
    if (params.angle && Math.abs(params.angle) > 1) { // Plus de 1 degré
      return true;
    }
    
    // Analyse du contour pour détecter des angles
    if (params.points && this.hasAngledSegments(params.points)) {
      return true;
    }
    
    // Détection de biseaux ou chanfreins
    if (params.bevelAngle || params.chamferAngle || params.isBevel || params.isChamfer) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes angulaires
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier l'angle
    if (params.angle !== undefined) {
      if (params.angle < -180 || params.angle > 180) {
        errors.push(`Invalid angle: ${params.angle}° (must be between -180° and 180°)`);
      }
      
      if (Math.abs(params.angle) < 1) {
        warnings.push('Angle is very small, consider using straight cut instead');
      }
      
      if (Math.abs(params.angle) > 85 && Math.abs(params.angle) < 95) {
        warnings.push('Angle is close to 90°, consider using straight cut for better performance');
      }
    }
    
    // Vérifier les angles multiples pour les biseaux composés
    if (params.angleX && params.angleY) {
      if (Math.abs(params.angleX) + Math.abs(params.angleY) > 180) {
        warnings.push('Combined angles may produce unexpected results');
      }
    }
  }

  /**
   * Les coupes angulaires peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de coupe angulaire
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const cutType = this.detectCutType(feature);
    
    console.log(`  📐 Creating angled cut geometry:`);
    console.log(`    Type: ${cutType}`);
    console.log(`    Angle: ${params.angle || 0}°`);
    
    switch (cutType) {
      case CutType.BEVEL_CUT:
        return this.createBevelCut(params, element);
      
      case CutType.CHAMFER_CUT:
        return this.createChamferCut(params, element);
      
      default:
        return this.createStandardAngledCut(params, element);
    }
  }

  /**
   * Crée une coupe angulaire standard
   */
  private createStandardAngledCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const angle = params.angle || 45;
    const face = params.face || ProfileFace.WEB;
    
    // Si on a des points de contour
    if (params.points && params.points.length >= 3) {
      const normalizedPoints = this.normalizePoints(params.points);
      
      // Créer la forme de base
      const shape = this.createShapeFromPoints(normalizedPoints);
      
      // Extruder avec l'angle
      const depth = params.depth || this.getDefaultDepth(element, face);
      const geometry = this.extrudeWithAngle(shape, depth, angle);
      
      // Appliquer les transformations de face
      this.applyFaceTransform(geometry, face, element);
      
      return geometry;
    }
    
    // Sans contour, créer une coupe angulaire simple
    return this.createSimpleAngledCut(params, element);
  }

  /**
   * Crée une coupe angulaire simple (sans contour)
   */
  private createSimpleAngledCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const angle = params.angle || 45;
    
    // Dimensions de la coupe
    const width = params.width || 100;
    const height = params.height || dims.height || 300;
    const depth = params.depth || 50;
    
    // Position
    const x = params.x || params.position?.x || 0;
    const y = params.position?.y || 0;
    
    // Créer un plan incliné
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Appliquer l'angle
    const matrix = new THREE.Matrix4();
    
    // Rotation autour de Y pour l'angle principal
    matrix.makeRotationY(angle * Math.PI / 180);
    geometry.applyMatrix4(matrix);
    
    // Translation vers la position
    matrix.makeTranslation(x + width / 2, y, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une coupe biseautée (pour préparation de soudure)
   */
  private createBevelCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const bevelAngle = params.bevelAngle || params.angle || 45;
    const face = params.face || ProfileFace.WEB;
    
    console.log(`    Creating bevel cut at ${bevelAngle}°`);
    
    // Si on a des points, utiliser le service de géométrie
    if (params.points && params.points.length >= 3) {
      const normalizedPoints = this.normalizePoints(params.points);
      return this.geometryService.createBevelCut(normalizedPoints, bevelAngle, element, {
        face,
        depth: params.depth
      });
    }
    
    // Sinon, créer un biseau standard
    const width = params.width || 50;
    const height = params.height || dims.height || 300;
    const depth = params.depth || 20;
    
    // Créer une forme trapézoïdale pour le biseau
    const shape = new THREE.Shape();
    const offset = depth * Math.tan(bevelAngle * Math.PI / 180);
    
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width - offset, height);
    shape.lineTo(offset, height);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée un chanfrein
   */
  private createChamferCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const chamferSize = params.chamferSize || 10;
    const chamferAngle = params.chamferAngle || params.angle || 45;
    
    console.log(`    Creating chamfer: size=${chamferSize}mm, angle=${chamferAngle}°`);
    
    // Position du chanfrein
    const x = params.x || params.position?.x || 0;
    const y = params.position?.y || 0;
    const isCorner = params.isCorner || false;
    
    if (isCorner) {
      // Chanfrein de coin
      return this.createCornerChamfer(x, y, chamferSize, chamferAngle, element);
    } else {
      // Chanfrein d'arête
      return this.createEdgeChamfer(x, y, chamferSize, chamferAngle, params, element);
    }
  }

  /**
   * Crée un chanfrein de coin
   */
  private createCornerChamfer(
    x: number,
    y: number,
    size: number,
    angle: number,
    element: PivotElement
  ): THREE.BufferGeometry {
    // Créer une forme triangulaire pour couper le coin
    const shape = new THREE.Shape();
    
    shape.moveTo(x, y);
    shape.lineTo(x + size, y);
    shape.lineTo(x, y + size);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: size,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer l'angle si nécessaire
    if (Math.abs(angle - 45) > 1) {
      const matrix = new THREE.Matrix4();
      matrix.makeRotationZ((angle - 45) * Math.PI / 180);
      geometry.applyMatrix4(matrix);
    }
    
    return geometry;
  }

  /**
   * Crée un chanfrein d'arête
   */
  private createEdgeChamfer(
    x: number,
    y: number,
    size: number,
    angle: number,
    params: any,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const length = params.length || dims.length || 1000;
    
    // Créer un prisme pour le chanfrein
    const shape = new THREE.Shape();
    const offset = size * Math.tan(angle * Math.PI / 180);
    
    shape.moveTo(0, 0);
    shape.lineTo(size, 0);
    shape.lineTo(0, offset);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner le chanfrein
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, y, -length / 2);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Extrude une forme avec un angle
   */
  private extrudeWithAngle(
    shape: THREE.Shape,
    depth: number,
    angle: number
  ): THREE.BufferGeometry {
    // Créer une extrusion basique
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: Math.max(1, Math.floor(Math.abs(angle) / 10)) // Plus de steps pour les grands angles
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer une déformation pour créer l'angle
    if (Math.abs(angle) > 1) {
      const positions = geometry.attributes.position;
      const array = positions.array as Float32Array;
      
      for (let i = 0; i < positions.count; i++) {
        const z = array[i * 3 + 2];
        const factor = z / depth; // 0 à 1 selon la profondeur
        
        // Déplacer les points selon l'angle
        const offset = factor * depth * Math.tan(angle * Math.PI / 180);
        array[i * 3] += offset; // Décalage en X
      }
      
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    
    return geometry;
  }

  /**
   * Détecte si un contour a des segments angulaires
   */
  private hasAngledSegments(points: any[]): boolean {
    const normalizedPoints = this.normalizePoints(points);
    
    if (normalizedPoints.length < 3) return false;
    
    // Vérifier les angles entre segments consécutifs
    for (let i = 1; i < normalizedPoints.length - 1; i++) {
      const p1 = normalizedPoints[i - 1];
      const p2 = normalizedPoints[i];
      const p3 = normalizedPoints[i + 1];
      
      // Vecteurs
      const v1 = [p2[0] - p1[0], p2[1] - p1[1]];
      const v2 = [p3[0] - p2[0], p3[1] - p2[1]];
      
      // Angle entre les vecteurs
      const angle = Math.atan2(v2[1], v2[0]) - Math.atan2(v1[1], v1[0]);
      const angleDeg = Math.abs(angle * 180 / Math.PI);
      
      // Si l'angle n'est pas proche de 0°, 90°, 180° ou 270°
      if (angleDeg % 90 > 5 && angleDeg % 90 < 85) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Applique les transformations de face
   */
  private applyFaceTransform(
    geometry: THREE.BufferGeometry,
    face: ProfileFace,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const matrix = new THREE.Matrix4();
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
        matrix.makeTranslation(0, dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        matrix.makeTranslation(0, -dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        matrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(matrix);
        break;
    }
  }

  /**
   * Obtient la profondeur par défaut
   */
  private getDefaultDepth(element: PivotElement, face?: ProfileFace): number {
    const dims = element.dimensions || {};
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return dims.flangeThickness || 15;
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        return dims.webThickness || 10;
      default:
        return 10;
    }
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isBevel || params.bevelAngle) {
      return CutType.BEVEL_CUT;
    }
    
    if (params.isChamfer || params.chamferSize || params.chamferAngle) {
      return CutType.CHAMFER_CUT;
    }
    
    return CutType.ANGLE_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    
    return {
      ...baseMetadata,
      angle: params.angle || 0,
      angleX: params.angleX,
      angleY: params.angleY,
      isBevel: this.detectCutType(feature) === CutType.BEVEL_CUT,
      isChamfer: this.detectCutType(feature) === CutType.CHAMFER_CUT,
      bevelAngle: params.bevelAngle,
      chamferSize: params.chamferSize,
      chamferAngle: params.chamferAngle
    };
  }
}