/**
 * ExteriorCutHandler.ts - Handler pour les coupes extérieures
 * Gère les contours extérieurs (AK dans DSTV)
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType, CutCategory } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';
import { getCSGService } from '../services/CSGOperationService';

/**
 * Handler pour les coupes extérieures (contours AK)
 */
export class ExteriorCutHandler extends BaseCutHandler {
  readonly name = 'ExteriorCutHandler';
  readonly supportedTypes = [
    CutType.EXTERIOR_CUT,
    CutType.CONTOUR_CUT,
    CutType.COPING_CUT
  ];
  readonly priority = 70;

  private geometryService = getGeometryService();
  private csgService = getCSGService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Vérifier le block DSTV
    if (params.dstvBlock === 'AK' || params.blockType === 'AK') {
      return true;
    }
    
    // Vérifier le type de coupe
    if (params.cutType === 'exterior' || params.isExterior) {
      return true;
    }
    
    // Vérifier la catégorie
    if (params.category === CutCategory.EXTERIOR) {
      return true;
    }
    
    // Analyser la position du contour
    if (params.points && this.isExteriorContour(params.points, params.element)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes extérieures
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Les coupes extérieures nécessitent un contour fermé
    if (params.points && params.points.length > 0) {
      const normalizedPoints = this.normalizePoints(params.points);
      if (!this.isContourClosed(normalizedPoints)) {
        warnings.push('Exterior contour is not closed, will be auto-closed');
      }
      
      // Vérifier la complexité du contour
      if (normalizedPoints.length > 100) {
        warnings.push(`Complex contour with ${normalizedPoints.length} points may impact performance`);
      }
    }
    
    // Vérifier les dimensions
    if (!element.dimensions) {
      errors.push('Element dimensions required for exterior cut');
    }
  }

  /**
   * Les coupes extérieures nécessitent des points de contour
   */
  protected requiresContourPoints(): boolean {
    return true;
  }

  /**
   * Crée la géométrie de coupe extérieure
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const normalizedPoints = this.normalizePoints(params.points || []);
    const face = params.face || ProfileFace.WEB;
    
    // Analyser le contour pour déterminer le type de géométrie
    const contourAnalysis = this.analyzeContour(normalizedPoints, element);
    
    console.log(`  🔷 Creating exterior cut geometry:`);
    console.log(`    Contour type: ${contourAnalysis.type}`);
    console.log(`    Points: ${normalizedPoints.length}`);
    console.log(`    Face: ${face}`);
    
    // Créer la géométrie selon le type de contour
    if (contourAnalysis.type === 'redefinition') {
      // Redéfinition complète du contour extérieur
      return this.createContourRedefinition(normalizedPoints, element, face);
    } else if (contourAnalysis.type === 'coping') {
      // Coupe de préparation (coping)
      return this.createCopingCut(normalizedPoints, element, face);
    } else {
      // Coupe extérieure standard
      return this.createStandardExteriorCut(normalizedPoints, element, face, params);
    }
  }

  /**
   * Analyse le contour pour déterminer son type
   */
  private analyzeContour(
    points: Array<[number, number]>,
    element: PivotElement
  ): { type: string; complexity: string } {
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    
    // Si le contour couvre toute la longueur, c'est une redéfinition
    if (bounds.width > dims.length! * 0.95) {
      return { type: 'redefinition', complexity: 'full' };
    }
    
    // Si le contour a des courbes, c'est un coping
    if (this.hasComplexCurves(points)) {
      return { type: 'coping', complexity: 'complex' };
    }
    
    // Sinon, coupe standard
    return { type: 'standard', complexity: 'simple' };
  }

  /**
   * Crée une redéfinition complète du contour
   */
  private createContourRedefinition(
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    // Pour une redéfinition, on crée une nouvelle forme qui remplace le profil
    const shape = this.createShapeFromPoints(points);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: this.getExtrusionDepth(face, dims),
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer les transformations nécessaires
    this.applyFaceTransform(geometry, face, element);
    
    return geometry;
  }

  /**
   * Crée une coupe de préparation (coping)
   */
  private createCopingCut(
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace
  ): THREE.BufferGeometry {
    // Pour un coping, on crée une forme complexe qui suit le contour
    const bounds = this.getContourBounds(points);
    
    // Créer une série de boîtes pour approximer la courbe
    const geometries: THREE.BufferGeometry[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const width = Math.abs(p2[0] - p1[0]) || 10;
      const height = Math.abs(p2[1] - p1[1]) || 10;
      const depth = this.getExtrusionDepth(face, element.dimensions || {});
      
      const box = new THREE.BoxGeometry(width, height, depth);
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2,
        0
      );
      box.applyMatrix4(matrix);
      
      geometries.push(box);
    }
    
    // Fusionner toutes les géométries
    if (geometries.length === 1) {
      return geometries[0];
    }
    
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    
    return mergedGeometry;
  }

  /**
   * Crée une coupe extérieure standard
   */
  private createStandardExteriorCut(
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    // Utiliser le service de géométrie pour créer la coupe
    return this.geometryService.createCutGeometry(points, element, {
      face,
      depth: params.depth || this.getExtrusionDepth(face, element.dimensions || {}),
      cutType: 'exterior',
      extendToEdges: true
    });
  }

  /**
   * Détermine si un contour est extérieur
   */
  private isExteriorContour(points: any[], element: any): boolean {
    const normalizedPoints = this.normalizePoints(points);
    const bounds = this.getContourBounds(normalizedPoints);
    const dims = element?.dimensions || {};
    
    // Un contour est extérieur s'il dépasse les limites normales
    const profileLength = dims.length || 0;
    const profileHeight = dims.height || 0;
    
    return bounds.maxX > profileLength || 
           bounds.maxY > profileHeight / 2 || 
           bounds.minY < -profileHeight / 2;
  }

  /**
   * Vérifie si un contour est fermé
   */
  private isContourClosed(points: Array<[number, number]>): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    const distance = Math.sqrt(
      Math.pow(last[0] - first[0], 2) + 
      Math.pow(last[1] - first[1], 2)
    );
    
    return distance < 0.1; // Tolérance de 0.1mm
  }

  /**
   * Détermine si le contour a des courbes complexes
   */
  private hasComplexCurves(points: Array<[number, number]>): boolean {
    if (points.length < 5) return false;
    
    let angleChanges = 0;
    let lastAngle: number | null = null;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const angle = Math.atan2(dy, dx);
      
      if (lastAngle !== null) {
        const angleDiff = Math.abs(angle - lastAngle);
        if (angleDiff > Math.PI / 6) { // 30 degrés
          angleChanges++;
        }
      }
      lastAngle = angle;
    }
    
    return angleChanges > 3; // Plus de 3 changements d'angle significatifs
  }

  /**
   * Obtient la profondeur d'extrusion selon la face
   */
  private getExtrusionDepth(face: ProfileFace, dims: any): number {
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return dims.flangeThickness || 15;
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        return dims.webThickness || 10;
      default:
        return Math.max(dims.webThickness || 10, dims.flangeThickness || 15) + 50;
    }
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
        matrix.makeTranslation(0, dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        matrix.makeTranslation(0, -dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        // Rotation pour aligner avec l'âme
        matrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(matrix);
        break;
    }
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isCoping || params.cutType === 'coping') {
      return CutType.COPING_CUT;
    }
    
    if (params.isContour || params.cutType === 'contour') {
      return CutType.CONTOUR_CUT;
    }
    
    return CutType.EXTERIOR_CUT;
  }
}

// Import pour BufferGeometryUtils
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';