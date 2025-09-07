/**
 * StraightCutHandler.ts - Handler pour les coupes droites
 * Gère les coupes rectangulaires simples et perpendiculaires
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Handler pour les coupes droites (perpendiculaires)
 */
export class StraightCutHandler extends BaseCutHandler {
  readonly name = 'StraightCutHandler';
  readonly supportedTypes = [
    CutType.STRAIGHT_CUT,
    CutType.NOTCH_RECTANGULAR
  ];
  readonly priority = 50;

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite
    if (params.cutType === 'straight' || params.isStraight) {
      return true;
    }
    
    // Vérifier si c'est une encoche rectangulaire
    if (feature.type === FeatureType.NOTCH && this.isRectangular(params.points)) {
      return true;
    }
    
    // Analyser le contour pour détecter une forme rectangulaire
    if (params.points && this.isRectangular(params.points)) {
      // Vérifier aussi que tous les angles sont droits
      return this.hasOnlyRightAngles(params.points);
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes droites
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    if (params.points) {
      const normalizedPoints = this.normalizePoints(params.points);
      
      // Vérifier que c'est bien rectangulaire
      if (!this.isRectangular(normalizedPoints)) {
        warnings.push('Contour is not perfectly rectangular, will be approximated');
      }
      
      // Vérifier l'orientation
      if (!this.isAxisAligned(normalizedPoints)) {
        warnings.push('Rectangle is not axis-aligned, may produce unexpected results');
      }
    }
    
    // Pour les coupes droites sans contour, on a besoin de dimensions
    if (!params.points && (!params.width || !params.height)) {
      errors.push('Straight cut requires either contour points or width/height dimensions');
    }
  }

  /**
   * Les coupes droites peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de coupe droite
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const dims = element.dimensions || {};
    
    console.log(`  📐 Creating straight cut geometry`);
    
    // Si on a des points, extraire le rectangle
    if (params.points && params.points.length > 0) {
      return this.createFromContour(params.points, element, params);
    }
    
    // Sinon, utiliser les dimensions fournies
    return this.createFromDimensions(params, element);
  }

  /**
   * Crée une coupe droite à partir d'un contour
   */
  private createFromContour(
    points: any[],
    element: PivotElement,
    params: any
  ): THREE.BufferGeometry {
    const normalizedPoints = this.normalizePoints(points);
    const bounds = this.getContourBounds(normalizedPoints);
    const face = params.face || ProfileFace.WEB;
    
    // Extraire les dimensions du rectangle
    const width = bounds.width;
    const height = bounds.height;
    const depth = params.depth || this.getDefaultDepth(element, face);
    
    console.log(`    Rectangle: ${width.toFixed(1)} x ${height.toFixed(1)} x ${depth.toFixed(1)}mm`);
    console.log(`    Position: X=${bounds.centerX.toFixed(1)}, Y=${bounds.centerY.toFixed(1)}`);
    
    // Créer une boîte simple
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Positionner au centre du rectangle
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(bounds.centerX, bounds.centerY, 0);
    geometry.applyMatrix4(matrix);
    
    // Appliquer les transformations de face si nécessaire
    this.applyFaceTransform(geometry, face, element);
    
    return geometry;
  }

  /**
   * Crée une coupe droite à partir de dimensions
   */
  private createFromDimensions(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    // Dimensions de la coupe
    const width = params.width || 100;
    const height = params.height || 50;
    const depth = params.depth || this.getDefaultDepth(element, params.face);
    
    // Position de la coupe
    const x = params.x || params.position?.x || 0;
    const y = params.position?.y || 0;
    const z = params.position?.z || 0;
    
    console.log(`    Box: ${width} x ${height} x ${depth}mm at (${x}, ${y}, ${z})`);
    
    return this.geometryService.createSimpleCut(x, y, z, width, height, depth);
  }

  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(points: any[]): boolean {
    if (!points || points.length < 4) return false;
    
    const normalizedPoints = this.normalizePoints(points);
    
    // Un rectangle a 4 ou 5 points (5 si fermé)
    if (normalizedPoints.length !== 4 && normalizedPoints.length !== 5) {
      return false;
    }
    
    // Si 5 points, vérifier que le dernier = premier (fermé)
    if (normalizedPoints.length === 5) {
      const first = normalizedPoints[0];
      const last = normalizedPoints[4];
      if (Math.abs(first[0] - last[0]) > 0.1 || Math.abs(first[1] - last[1]) > 0.1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Vérifie si tous les angles sont droits
   */
  private hasOnlyRightAngles(points: any[]): boolean {
    const normalizedPoints = this.normalizePoints(points);
    
    for (let i = 0; i < Math.min(4, normalizedPoints.length - 1); i++) {
      const p1 = normalizedPoints[i];
      const p2 = normalizedPoints[(i + 1) % normalizedPoints.length];
      const p3 = normalizedPoints[(i + 2) % normalizedPoints.length];
      
      // Vecteurs
      const v1 = [p2[0] - p1[0], p2[1] - p1[1]];
      const v2 = [p3[0] - p2[0], p3[1] - p2[1]];
      
      // Produit scalaire (devrait être ~0 pour des vecteurs perpendiculaires)
      const dot = v1[0] * v2[0] + v1[1] * v2[1];
      
      // Tolérance pour les angles droits
      if (Math.abs(dot) > 0.1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Vérifie si le rectangle est aligné avec les axes
   */
  private isAxisAligned(points: Array<[number, number]>): boolean {
    // Vérifier que tous les segments sont soit horizontaux soit verticaux
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dx = Math.abs(p2[0] - p1[0]);
      const dy = Math.abs(p2[1] - p1[1]);
      
      // Le segment doit être soit horizontal (dy~0) soit vertical (dx~0)
      if (dx > 0.1 && dy > 0.1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Applique les transformations selon la face
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
        // Déplacer vers la semelle supérieure
        matrix.makeTranslation(0, dims.height! / 2 - dims.flangeThickness! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        // Déplacer vers la semelle inférieure
        matrix.makeTranslation(0, -dims.height! / 2 + dims.flangeThickness! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        // Pour l'âme, rotation de 90° autour de X
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
    
    if (feature.type === FeatureType.NOTCH) {
      return CutType.NOTCH_RECTANGULAR;
    }
    
    return CutType.STRAIGHT_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    
    let dimensions = { width: 0, height: 0, depth: 0 };
    
    if (params.points) {
      const normalizedPoints = this.normalizePoints(params.points);
      const bounds = this.getContourBounds(normalizedPoints);
      dimensions = {
        width: bounds.width,
        height: bounds.height,
        depth: params.depth || this.getDefaultDepth(element, params.face)
      };
    } else {
      dimensions = {
        width: params.width || 100,
        height: params.height || 50,
        depth: params.depth || 10
      };
    }
    
    return {
      ...baseMetadata,
      isRectangular: true,
      isAxisAligned: params.points ? this.isAxisAligned(this.normalizePoints(params.points)) : true,
      dimensions
    };
  }
}