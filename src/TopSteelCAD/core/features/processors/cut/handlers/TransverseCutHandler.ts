/**
 * TransverseCutHandler.ts - Handler pour les coupes transversales
 * Gère les coupes perpendiculaires à l'axe du profil
 */

import * as THREE from 'three';
import { Feature, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType, CutCategory } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Handler pour les coupes transversales (perpendiculaires à l'axe)
 */
export class TransverseCutHandler extends BaseCutHandler {
  readonly name = 'TransverseCutHandler';
  readonly supportedTypes = [
    CutType.STRAIGHT_CUT,
    CutType.ANGLE_CUT,
    CutType.THROUGH_CUT
  ];
  readonly priority = 45; // Priorité basse car c'est un cas spécifique

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite transversal
    if (params.isTransverse || params.cutType === 'transverse') {
      return true;
    }
    
    // Catégorie transversale
    if (params.category === CutCategory.TRANSVERSE) {
      return true;
    }
    
    // Orientation perpendiculaire détectée
    if (params.orientation === 'perpendicular' || params.orientation === 'transverse') {
      return true;
    }
    
    // Analyse du contour pour détecter une coupe transversale
    if (params.points && this.isTransversePattern(params.points, params.element)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes transversales
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    const dims = element.dimensions || {};
    
    // Vérifier la position le long du profil
    if (params.position) {
      const profileLength = dims.length || 1000;
      
      if (params.position < 0 || params.position > profileLength) {
        errors.push(`Transverse cut position ${params.position} outside profile bounds [0, ${profileLength}]`);
      }
    }
    
    // Vérifier la largeur de la coupe
    if (params.width) {
      if (params.width <= 0) {
        errors.push('Transverse cut width must be positive');
      }
      
      if (params.width > (dims.length || 1000) / 2) {
        warnings.push('Very wide transverse cut may compromise structural integrity');
      }
    }
    
    // Vérifier l'angle pour les coupes transversales angulaires
    if (params.angle && Math.abs(params.angle) > 45) {
      warnings.push('Large angle for transverse cut may produce unexpected results');
    }
  }

  /**
   * Les coupes transversales peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de coupe transversale
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    
    console.log(`  ⊥ Creating transverse cut geometry:`);
    console.log(`    Position: ${params.position || 'center'}`);
    console.log(`    Width: ${params.width || 'auto'}`);
    console.log(`    Angle: ${params.angle || 0}°`);
    
    // Si on a des points, utiliser le service de géométrie
    if (params.points && params.points.length >= 3) {
      return this.createTransverseFromContour(params.points, element, params);
    }
    
    // Sinon, créer une coupe transversale standard
    return this.createStandardTransverseCut(params, element);
  }

  /**
   * Crée une coupe transversale à partir d'un contour
   */
  private createTransverseFromContour(
    points: any[],
    element: PivotElement,
    params: any
  ): THREE.BufferGeometry {
    const normalizedPoints = this.normalizePoints(points);
    
    // Utiliser le service pour créer une coupe transversale
    return this.geometryService.createTransverseCut(normalizedPoints, element, {
      face: params.face,
      isTransverse: true
    });
  }

  /**
   * Crée une coupe transversale standard
   */
  private createStandardTransverseCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    // Dimensions de la coupe
    const width = params.width || 10; // Largeur de la coupe (le long du profil)
    const height = params.height || dims.height || 300; // Hauteur totale du profil
    const depth = params.depth || Math.max(dims.width || 150, dims.flangeWidth || 150) + 50; // Profondeur traversante
    
    // Position le long du profil
    const position = this.calculateTransversePosition(params, dims);
    
    // Créer la géométrie de base
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Appliquer l'angle si nécessaire
    if (params.angle && Math.abs(params.angle) > 0.1) {
      const angleRad = params.angle * Math.PI / 180;
      const matrix = new THREE.Matrix4();
      
      // Rotation autour de l'axe Y pour incliner la coupe
      matrix.makeRotationY(angleRad);
      geometry.applyMatrix4(matrix);
    }
    
    // Positionner la coupe
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(position, 0, 0);
    geometry.applyMatrix4(matrix);
    
    // Ajuster selon la face si nécessaire
    if (params.face) {
      this.adjustForFace(geometry, params.face, element);
    }
    
    return geometry;
  }

  /**
   * Calcule la position de la coupe transversale
   */
  private calculateTransversePosition(params: any, dims: any): number {
    const profileLength = dims.length || 1000;
    
    // Position explicite
    if (params.position !== undefined && params.position !== null) {
      if (typeof params.position === 'number') {
        return params.position;
      }
      
      // Position relative
      if (params.position === 'start') return 50;
      if (params.position === 'end') return profileLength - 50;
      if (params.position === 'center') return profileLength / 2;
    }
    
    // Position basée sur X
    if (params.x !== undefined) {
      return params.x;
    }
    
    // Par défaut au centre
    return profileLength / 2;
  }

  /**
   * Ajuste la géométrie selon la face
   */
  private adjustForFace(geometry: THREE.BufferGeometry, face: ProfileFace, element: PivotElement): void {
    const dims = element.dimensions || {};
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
        // Limiter à la semelle supérieure
        this.limitToFlange(geometry, dims, true);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        // Limiter à la semelle inférieure
        this.limitToFlange(geometry, dims, false);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        // Limiter à l'âme
        this.limitToWeb(geometry, dims);
        break;
    }
  }

  /**
   * Limite la coupe à une semelle
   */
  private limitToFlange(geometry: THREE.BufferGeometry, dims: any, isTop: boolean): void {
    const flangeThickness = dims.flangeThickness || 15;
    const height = dims.height || 300;
    
    // Redimensionner pour ne couper que la semelle
    const scale = flangeThickness / height;
    const matrix = new THREE.Matrix4();
    matrix.makeScale(1, scale, 1);
    geometry.applyMatrix4(matrix);
    
    // Positionner sur la semelle
    const yOffset = isTop ? 
      (height / 2 - flangeThickness / 2) : 
      -(height / 2 - flangeThickness / 2);
    
    matrix.makeTranslation(0, yOffset, 0);
    geometry.applyMatrix4(matrix);
  }

  /**
   * Limite la coupe à l'âme
   */
  private limitToWeb(geometry: THREE.BufferGeometry, dims: any): void {
    const webThickness = dims.webThickness || 10;
    const width = dims.width || 150;
    
    // Redimensionner pour ne couper que l'âme
    const scale = webThickness / width;
    const matrix = new THREE.Matrix4();
    matrix.makeScale(1, 1, scale);
    geometry.applyMatrix4(matrix);
  }

  /**
   * Détermine si un contour représente une coupe transversale
   */
  private isTransversePattern(points: any[], element: any): boolean {
    const normalizedPoints = this.normalizePoints(points);
    const bounds = this.getContourBounds(normalizedPoints);
    const dims = element?.dimensions || {};
    
    // Une coupe transversale a typiquement :
    // - Une largeur très faible par rapport à la longueur du profil
    // - Une hauteur proche de la hauteur du profil
    const widthRatio = bounds.width / (dims.length || 1000);
    const heightRatio = bounds.height / (dims.height || 300);
    
    return widthRatio < 0.1 && heightRatio > 0.8;
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.angle && Math.abs(params.angle) > 1) {
      return CutType.ANGLE_CUT;
    }
    
    if (params.depth === 0 || params.isThrough) {
      return CutType.THROUGH_CUT;
    }
    
    return CutType.STRAIGHT_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const dims = element.dimensions || {};
    
    return {
      ...baseMetadata,
      isTransverse: true,
      position: this.calculateTransversePosition(params, dims),
      width: params.width || 10,
      angle: params.angle || 0,
      cutsThrough: params.depth === 0 || params.isThrough || !params.depth,
      face: params.face
    };
  }
}