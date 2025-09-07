/**
 * NotchHandler.ts - Handler générique pour tous les types d'encoches
 * Gère les encoches rectangulaires, courbes et autres formes
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Types d'encoches supportées
 */
enum NotchShape {
  RECTANGULAR = 'rectangular',
  CIRCULAR = 'circular',
  CURVED = 'curved',
  TRIANGULAR = 'triangular',
  TRAPEZOIDAL = 'trapezoidal',
  CUSTOM = 'custom'
}

/**
 * Handler générique pour tous les types d'encoches
 */
export class NotchHandler extends BaseCutHandler {
  readonly name = 'NotchHandler';
  readonly supportedTypes = [
    CutType.NOTCH_RECTANGULAR,
    CutType.NOTCH_CURVED,
    CutType.NOTCH_PARTIAL,
    CutType.NOTCH_COMPOUND
  ];
  readonly priority = 65; // Priorité moyenne pour les encoches génériques

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    // Vérifier le type de feature
    if (feature.type === FeatureType.NOTCH) {
      const params = feature.parameters as any;
      
      // Ne pas traiter les patterns complexes (gérés par PartialNotchHandler)
      if (params.cutType === 'partial_notches' || (params.points && params.points.length === 9)) {
        return false;
      }
      
      return true;
    }
    
    const params = feature.parameters as any;
    
    // Type explicite d'encoche
    if (params.cutType === 'notch' || params.isNotch) {
      return true;
    }
    
    // Forme d'encoche définie
    if (params.notchShape && this.isValidNotchShape(params.notchShape)) {
      return true;
    }
    
    // Pattern d'encoche détecté
    if (params.points && this.isNotchPattern(params.points)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les encoches
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier les dimensions de l'encoche
    if (params.width && params.height) {
      const dims = element.dimensions || {};
      
      if (params.width > (dims.length || 1000)) {
        errors.push('Notch width exceeds profile length');
      }
      
      if (params.height > (dims.height || 300)) {
        warnings.push('Notch height exceeds profile height');
      }
    }
    
    // Vérifier le rayon pour les encoches circulaires/courbes
    if (params.radius) {
      if (params.radius <= 0) {
        errors.push('Notch radius must be positive');
      }
      
      const maxRadius = Math.min(
        element.dimensions?.height || 300,
        element.dimensions?.width || 150
      ) / 2;
      
      if (params.radius > maxRadius) {
        warnings.push('Notch radius exceeds profile dimensions');
      }
    }
    
    // Vérifier la position
    if (params.position) {
      const profileLength = element.dimensions?.length || 1000;
      
      if (params.position.x < 0 || params.position.x > profileLength) {
        warnings.push('Notch position outside profile bounds');
      }
    }
  }

  /**
   * Les encoches peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie d'encoche
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const notchShape = this.detectNotchShape(params);
    
    console.log(`  🔲 Creating notch geometry:`);
    console.log(`    Shape: ${notchShape}`);
    console.log(`    Face: ${params.face || 'default'}`);
    
    switch (notchShape) {
      case NotchShape.RECTANGULAR:
        return this.createRectangularNotch(params, element);
        
      case NotchShape.CIRCULAR:
        return this.createCircularNotch(params, element);
        
      case NotchShape.CURVED:
        return this.createCurvedNotch(params, element);
        
      case NotchShape.TRIANGULAR:
        return this.createTriangularNotch(params, element);
        
      case NotchShape.TRAPEZOIDAL:
        return this.createTrapezoidalNotch(params, element);
        
      case NotchShape.CUSTOM:
        return this.createCustomNotch(params, element);
        
      default:
        return this.createRectangularNotch(params, element);
    }
  }

  /**
   * Détecte la forme d'encoche
   */
  private detectNotchShape(params: any): NotchShape {
    // Forme explicite
    if (params.notchShape && this.isValidNotchShape(params.notchShape)) {
      return params.notchShape as NotchShape;
    }
    
    // Détection basée sur les paramètres
    if (params.radius && !params.width && !params.height) {
      return NotchShape.CIRCULAR;
    }
    
    if (params.radius && (params.width || params.height)) {
      return NotchShape.CURVED;
    }
    
    if (params.angle && params.width) {
      return NotchShape.TRIANGULAR;
    }
    
    if (params.topWidth && params.bottomWidth && params.topWidth !== params.bottomWidth) {
      return NotchShape.TRAPEZOIDAL;
    }
    
    // Détection basée sur les points
    if (params.points) {
      const points = this.normalizePoints(params.points);
      
      if (points.length === 3) {
        return NotchShape.TRIANGULAR;
      }
      
      if (points.length === 4 || points.length === 5) {
        if (this.isRectangular(points)) {
          return NotchShape.RECTANGULAR;
        }
        return NotchShape.TRAPEZOIDAL;
      }
      
      if (this.hasCurves(points)) {
        return NotchShape.CURVED;
      }
      
      return NotchShape.CUSTOM;
    }
    
    // Par défaut, rectangulaire
    return NotchShape.RECTANGULAR;
  }

  /**
   * Crée une encoche rectangulaire
   */
  private createRectangularNotch(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    // Dimensions de l'encoche
    const width = params.width || 50;
    const height = params.height || 30;
    const depth = params.depth || dims.webThickness || dims.flangeThickness || 10;
    
    // Position
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    // Créer la géométrie
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Positionner
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x + width / 2, y + height / 2, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une encoche circulaire
   */
  private createCircularNotch(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const radius = params.radius || 25;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer un cylindre
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, 32);
    
    // Orienter selon la face
    const face = params.face || ProfileFace.WEB;
    const matrix = new THREE.Matrix4();
    
    if (face === ProfileFace.WEB || face === ProfileFace.BOTTOM) {
      // Rotation pour aligner avec l'âme
      matrix.makeRotationZ(Math.PI / 2);
      geometry.applyMatrix4(matrix);
    }
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    matrix.makeTranslation(x, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une encoche courbe
   */
  private createCurvedNotch(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const radius = params.radius || 20;
    const width = params.width || 40;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer une forme avec coin arrondi
    const shape = new THREE.Shape();
    
    // Commencer en bas à gauche
    shape.moveTo(0, 0);
    shape.lineTo(width - radius, 0);
    
    // Coin arrondi en haut à droite
    shape.arc(0, 0, radius, 0, Math.PI / 2, false);
    
    // Haut
    shape.lineTo(0, radius);
    
    // Fermer
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une encoche triangulaire
   */
  private createTriangularNotch(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const width = params.width || 50;
    const height = params.height || 30;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer une forme triangulaire
    const shape = new THREE.Shape();
    
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width / 2, height);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une encoche trapézoïdale
   */
  private createTrapezoidalNotch(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const topWidth = params.topWidth || 30;
    const bottomWidth = params.bottomWidth || 50;
    const height = params.height || 30;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer une forme trapézoïdale
    const shape = new THREE.Shape();
    
    const offset = (bottomWidth - topWidth) / 2;
    
    shape.moveTo(0, 0);
    shape.lineTo(bottomWidth, 0);
    shape.lineTo(bottomWidth - offset, height);
    shape.lineTo(offset, height);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une encoche personnalisée à partir de points
   */
  private createCustomNotch(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const points = this.normalizePoints(params.points || []);
    const depth = params.depth || dims.webThickness || 10;
    
    if (points.length < 3) {
      // Fallback vers rectangulaire
      return this.createRectangularNotch(params, element);
    }
    
    // Créer une forme à partir des points
    const shape = this.createShapeFromPoints(points);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Vérifie si une forme d'encoche est valide
   */
  private isValidNotchShape(shape: string): boolean {
    return Object.values(NotchShape).includes(shape as NotchShape);
  }

  /**
   * Détermine si des points forment un pattern d'encoche
   */
  private isNotchPattern(points: any[]): boolean {
    const normalizedPoints = this.normalizePoints(points);
    
    if (normalizedPoints.length < 3 || normalizedPoints.length > 20) {
      return false;
    }
    
    // Vérifier que le contour forme une indentation
    const bounds = this.getContourBounds(normalizedPoints);
    
    // Une encoche a typiquement une largeur supérieure à sa hauteur
    // et est relativement petite par rapport au profil
    return bounds.width < 200 && bounds.height < 100;
  }

  /**
   * Vérifie si des points forment un rectangle
   */
  private isRectangular(points: Array<[number, number]>): boolean {
    if (points.length !== 4 && points.length !== 5) {
      return false;
    }
    
    // Vérifier que les angles sont droits
    for (let i = 0; i < Math.min(4, points.length - 1); i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      
      const v1 = [p2[0] - p1[0], p2[1] - p1[1]];
      const v2 = [p3[0] - p2[0], p3[1] - p2[1]];
      
      // Produit scalaire (doit être ~0 pour perpendiculaires)
      const dot = v1[0] * v2[0] + v1[1] * v2[1];
      
      if (Math.abs(dot) > 0.1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Détermine si des points contiennent des courbes
   */
  private hasCurves(points: Array<[number, number]>): boolean {
    if (points.length < 5) {
      return false;
    }
    
    // Vérifier la linéarité des segments
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[i + 1];
      
      // Calculer la déviation du point central par rapport à la ligne p1-p3
      const lineVec = [p3[0] - p1[0], p3[1] - p1[1]];
      const pointVec = [p2[0] - p1[0], p2[1] - p1[1]];
      
      // Projection du point sur la ligne
      const t = (pointVec[0] * lineVec[0] + pointVec[1] * lineVec[1]) / 
                (lineVec[0] * lineVec[0] + lineVec[1] * lineVec[1]);
      
      const projX = p1[0] + t * lineVec[0];
      const projY = p1[1] + t * lineVec[1];
      
      const deviation = Math.sqrt(
        Math.pow(p2[0] - projX, 2) + 
        Math.pow(p2[1] - projY, 2)
      );
      
      // Si la déviation est significative, c'est une courbe
      if (deviation > 5) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    const shape = this.detectNotchShape(params);
    
    if (shape === NotchShape.CURVED || this.hasCurves(this.normalizePoints(params.points || []))) {
      return CutType.NOTCH_CURVED;
    }
    
    if (params.depth && params.depth < (params.element?.dimensions?.webThickness || 10)) {
      return CutType.NOTCH_PARTIAL;
    }
    
    return CutType.NOTCH_RECTANGULAR;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const shape = this.detectNotchShape(params);
    
    return {
      ...baseMetadata,
      notchShape: shape,
      width: params.width,
      height: params.height,
      radius: params.radius,
      position: params.position || { x: params.x || 0, y: params.y || 0, z: params.z || 0 },
      isThrough: params.depth === 0 || params.isThrough
    };
  }
}