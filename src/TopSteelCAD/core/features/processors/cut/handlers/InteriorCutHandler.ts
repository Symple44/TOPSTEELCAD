/**
 * InteriorCutHandler.ts - Handler pour les coupes intérieures
 * Gère les contours intérieurs (IK dans DSTV)
 */

import * as THREE from 'three';
import { Feature, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType, CutCategory } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Handler pour les coupes intérieures (contours IK)
 */
export class InteriorCutHandler extends BaseCutHandler {
  readonly name = 'InteriorCutHandler';
  readonly supportedTypes = [
    CutType.INTERIOR_CUT,
    CutType.THROUGH_CUT,
    CutType.PARTIAL_CUT,
    CutType.SLOT_CUT
  ];
  readonly priority = 60;

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Vérifier le block DSTV
    if (params.dstvBlock === 'IK' || params.blockType === 'IK') {
      return true;
    }
    
    // Vérifier le type de coupe
    if (params.cutType === 'interior' || params.isInterior) {
      return true;
    }
    
    // Vérifier la catégorie
    if (params.category === CutCategory.INTERIOR) {
      return true;
    }
    
    // Vérifier si c'est une coupe traversante
    if (params.isThrough || params.depth === 0) {
      return true;
    }
    
    // Analyser la position du contour
    if (params.points && this.isInteriorContour(params.points, params.element)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes intérieures
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier les points du contour
    if (params.points) {
      const normalizedPoints = this.normalizePoints(params.points);
      const bounds = this.getContourBounds(normalizedPoints);
      const dims = element.dimensions || {};
      
      // Vérifier que le contour est bien à l'intérieur
      if (bounds.maxX > (dims.length || 1000)) {
        warnings.push('Interior contour extends beyond profile length');
      }
      
      if (bounds.maxY > (dims.height || 300) / 2 || bounds.minY < -(dims.height || 300) / 2) {
        warnings.push('Interior contour extends beyond profile height');
      }
    }
    
    // Vérifier la profondeur pour les coupes partielles
    if (params.depth && params.depth < 0) {
      errors.push('Negative depth not allowed for interior cuts');
    }
  }

  /**
   * Les coupes intérieures nécessitent des points de contour
   */
  protected requiresContourPoints(): boolean {
    return true;
  }

  /**
   * Crée la géométrie de coupe intérieure
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const normalizedPoints = this.normalizePoints(params.points || []);
    const face = params.face || ProfileFace.WEB;
    const depth = params.depth;
    
    console.log(`  🔶 Creating interior cut geometry:`);
    console.log(`    Points: ${normalizedPoints.length}`);
    console.log(`    Depth: ${depth || 'through'}`);
    console.log(`    Face: ${face}`);
    
    // Déterminer le type spécifique de coupe intérieure
    const cutType = this.detectSpecificInteriorType(params, normalizedPoints, element);
    
    switch (cutType) {
      case 'slot':
        return this.createSlotCut(normalizedPoints, element, face, params);
      
      case 'through':
        return this.createThroughCut(normalizedPoints, element, face);
      
      case 'partial':
        return this.createPartialCut(normalizedPoints, depth!, element, face);
      
      default:
        return this.createStandardInteriorCut(normalizedPoints, element, face, params);
    }
  }

  /**
   * Détermine le type spécifique de coupe intérieure
   */
  private detectSpecificInteriorType(
    params: any,
    points: Array<[number, number]>,
    _element: PivotElement
  ): string {
    // Type explicite
    if (params.interiorType) {
      return params.interiorType;
    }
    
    // Slot si le contour est allongé et étroit
    if (this.isSlotShape(points)) {
      return 'slot';
    }
    
    // Through si pas de profondeur ou profondeur = 0
    if (params.depth === 0 || params.isThrough) {
      return 'through';
    }
    
    // Partial si profondeur spécifiée
    if (params.depth && params.depth > 0) {
      return 'partial';
    }
    
    return 'standard';
  }

  /**
   * Crée une coupe en fente (slot)
   */
  private createSlotCut(
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    
    // Pour un slot, on crée une forme allongée
    const width = bounds.width || 10;
    const height = bounds.height || 5;
    const depth = params.depth || this.getDefaultDepthForFace(face, dims);
    
    // Créer une géométrie arrondie aux extrémités si nécessaire
    if (params.rounded || width / height > 3) {
      return this.createRoundedSlot(bounds, depth);
    } else {
      return this.createRectangularSlot(bounds, depth);
    }
  }

  /**
   * Crée un slot rectangulaire
   */
  private createRectangularSlot(bounds: any, depth: number): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(
      bounds.width,
      bounds.height,
      depth
    );
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(bounds.centerX, bounds.centerY, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée un slot arrondi
   */
  private createRoundedSlot(bounds: any, depth: number): THREE.BufferGeometry {
    // Créer une forme avec des extrémités arrondies
    const shape = new THREE.Shape();
    const radius = bounds.height / 2;
    
    // Commencer par le côté gauche arrondi
    shape.moveTo(bounds.minX + radius, bounds.minY);
    shape.arc(0, radius, radius, -Math.PI / 2, Math.PI / 2, false);
    
    // Ligne du haut
    shape.lineTo(bounds.maxX - radius, bounds.maxY);
    
    // Côté droit arrondi
    shape.arc(0, -radius, radius, Math.PI / 2, -Math.PI / 2, false);
    
    // Ligne du bas retour
    shape.lineTo(bounds.minX + radius, bounds.minY);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée une coupe traversante
   */
  private createThroughCut(
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    // Pour une coupe traversante, la profondeur est l'épaisseur totale
    const depth = this.getThroughDepth(face, dims);
    
    return this.geometryService.createCutGeometry(points, element, {
      face,
      depth,
      cutType: 'through'
    });
  }

  /**
   * Crée une coupe partielle
   */
  private createPartialCut(
    points: Array<[number, number]>,
    depth: number,
    element: PivotElement,
    face: ProfileFace
  ): THREE.BufferGeometry {
    // Pour une coupe partielle, on utilise la profondeur spécifiée
    return this.geometryService.createCutGeometry(points, element, {
      face,
      depth,
      cutType: 'partial',
      preserveContour: true
    });
  }

  /**
   * Crée une coupe intérieure standard
   */
  private createStandardInteriorCut(
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const depth = params.depth || this.getDefaultDepthForFace(face, dims);
    
    return this.geometryService.createCutGeometry(points, element, {
      face,
      depth,
      cutType: 'interior'
    });
  }

  /**
   * Détermine si un contour est intérieur
   */
  private isInteriorContour(points: any[], element: any): boolean {
    const normalizedPoints = this.normalizePoints(points);
    const bounds = this.getContourBounds(normalizedPoints);
    const dims = element?.dimensions || {};
    
    // Un contour est intérieur s'il reste dans les limites
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    
    return bounds.minX >= 0 && 
           bounds.maxX <= profileLength && 
           bounds.maxY <= profileHeight / 2 && 
           bounds.minY >= -profileHeight / 2;
  }

  /**
   * Détermine si la forme est un slot
   */
  private isSlotShape(points: Array<[number, number]>): boolean {
    const bounds = this.getContourBounds(points);
    const aspectRatio = bounds.width / bounds.height;
    
    // Un slot est typiquement allongé (ratio > 3) ou très petit
    return (aspectRatio > 3 || aspectRatio < 0.33) && bounds.width < 100;
  }

  /**
   * Obtient la profondeur par défaut pour une face
   */
  private getDefaultDepthForFace(face: ProfileFace, dims: any): number {
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
   * Obtient la profondeur pour une coupe traversante
   */
  private getThroughDepth(face: ProfileFace, dims: any): number {
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return (dims.flangeThickness || 15) + 10; // Avec marge
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        return (dims.webThickness || 10) + 10; // Avec marge
      default:
        return 50; // Profondeur généreuse par défaut
    }
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isSlot || params.cutType === 'slot') {
      return CutType.SLOT_CUT;
    }
    
    if (params.isThrough || params.depth === 0) {
      return CutType.THROUGH_CUT;
    }
    
    if (params.depth && params.depth > 0) {
      return CutType.PARTIAL_CUT;
    }
    
    return CutType.INTERIOR_CUT;
  }

  /**
   * Génère les métadonnées spécifiques
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const normalizedPoints = this.normalizePoints(params.points || []);
    
    return {
      ...baseMetadata,
      isThrough: params.depth === 0 || params.isThrough,
      isSlot: this.isSlotShape(normalizedPoints),
      depth: params.depth || 'through',
      interiorType: this.detectSpecificInteriorType(params, normalizedPoints, element)
    };
  }
}