/**
 * EndCutHandler.ts - Handler pour les coupes d'extrémité
 * Gère les coupes aux extrémités des profils et tubes
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Handler pour les coupes d'extrémité
 */
export class EndCutHandler extends BaseCutHandler {
  readonly name = 'EndCutHandler';
  readonly supportedTypes = [
    CutType.END_STRAIGHT,
    CutType.END_ANGLE,
    CutType.END_COMPOUND,
    CutType.END_CHAMFER
  ];
  readonly priority = 90; // Haute priorité pour les coupes d'extrémité

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature spécifique
   */
  protected canHandleSpecific(feature: Feature): boolean {
    // Vérifier le type de feature
    if (feature.type === FeatureType.END_CUT) {
      return true;
    }
    
    // Vérifier les paramètres spécifiques
    const params = feature.parameters as any;
    if (params.isEndCut || params.cutType === 'end_cut') {
      return true;
    }
    
    // Vérifier si la position suggère une coupe d'extrémité
    if (params.points && Array.isArray(params.points)) {
      const normalizedPoints = this.normalizePoints(params.points);
      if (this.isAtExtremity(normalizedPoints, params.element || {})) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes d'extrémité
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier l'angle pour les coupes angulaires
    if (this.detectCutType(feature) === CutType.END_ANGLE) {
      if (params.angle === undefined || params.angle === null) {
        warnings.push('No angle specified for angled end cut, using 90°');
      } else if (params.angle < -90 || params.angle > 90) {
        errors.push(`Invalid angle for end cut: ${params.angle}° (must be between -90° and 90°)`);
      }
    }
    
    // Vérifier la position (début ou fin)
    if (!params.position && !params.points) {
      errors.push('End cut requires either position or points parameter');
    }
  }

  /**
   * Les coupes d'extrémité peuvent fonctionner avec ou sans points de contour
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de coupe d'extrémité
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    
    // Déterminer le type spécifique de coupe d'extrémité
    const cutType = this.detectCutType(feature);
    
    // Si on a des points de contour, les utiliser
    if (params.points && params.points.length >= 3) {
      return this.createContourBasedEndCut(params.points, element, params);
    }
    
    // Sinon, créer une coupe basée sur l'angle
    const angle = params.angle || 0;
    const position = this.determineEndPosition(params, element);
    
    switch (cutType) {
      case CutType.END_STRAIGHT:
        return this.createStraightEndCut(position, element);
        
      case CutType.END_ANGLE:
        return this.createAngledEndCut(angle, position, element);
        
      case CutType.END_COMPOUND:
        return this.createCompoundEndCut(params, position, element);
        
      case CutType.END_CHAMFER:
        return this.createChamferedEndCut(params, position, element);
        
      default:
        // Fallback vers une coupe droite
        return this.createStraightEndCut(position, element);
    }
  }

  /**
   * Crée une coupe d'extrémité basée sur un contour
   */
  private createContourBasedEndCut(
    points: any[],
    element: PivotElement,
    params: any
  ): THREE.BufferGeometry {
    const normalizedPoints = this.normalizePoints(points);
    const face = params.face || ProfileFace.WEB;
    
    // Utiliser le service de géométrie pour créer la coupe
    return this.geometryService.createCutGeometry(normalizedPoints, element, {
      face,
      depth: params.depth || this.getDefaultDepth(element, face),
      cutType: 'end_cut'
    });
  }

  /**
   * Crée une coupe d'extrémité droite (perpendiculaire)
   */
  private createStraightEndCut(
    position: 'start' | 'end',
    element: PivotElement
  ): THREE.BufferGeometry {
    return this.geometryService.createEndCut(0, position, element);
  }

  /**
   * Crée une coupe d'extrémité angulaire
   */
  private createAngledEndCut(
    angle: number,
    position: 'start' | 'end',
    element: PivotElement
  ): THREE.BufferGeometry {
    return this.geometryService.createEndCut(angle, position, element);
  }

  /**
   * Crée une coupe d'extrémité composée (multi-angles)
   */
  private createCompoundEndCut(
    params: any,
    position: 'start' | 'end',
    element: PivotElement
  ): THREE.BufferGeometry {
    // Pour une coupe composée, on pourrait avoir plusieurs angles
    const angleX = params.angleX || 0;
    const angleY = params.angleY || 0;
    
    // Créer une géométrie de base
    const geometry = this.geometryService.createEndCut(angleX, position, element);
    
    // Appliquer la rotation supplémentaire si nécessaire
    if (angleY !== 0) {
      const matrix = new THREE.Matrix4();
      matrix.makeRotationX(angleY * Math.PI / 180);
      geometry.applyMatrix4(matrix);
    }
    
    return geometry;
  }

  /**
   * Crée une coupe d'extrémité chanfreinée
   */
  private createChamferedEndCut(
    params: any,
    position: 'start' | 'end',
    element: PivotElement
  ): THREE.BufferGeometry {
    const chamferSize = params.chamferSize || 10;
    const angle = params.angle || 45;
    
    // Pour un chanfrein, on crée un contour spécifique
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const height = dims.height || 300;
    
    const x = position === 'start' ? 0 : profileLength;
    const points: Array<[number, number]> = [
      [x - chamferSize, -height / 2],
      [x + chamferSize, -height / 2],
      [x + chamferSize, height / 2],
      [x - chamferSize, height / 2],
      [x, height / 2 - chamferSize * Math.tan(angle * Math.PI / 180)],
      [x, -height / 2 + chamferSize * Math.tan(angle * Math.PI / 180)]
    ];
    
    return this.geometryService.createBevelCut(points, angle, element);
  }

  /**
   * Détermine la position de la coupe d'extrémité
   */
  private determineEndPosition(params: any, element: PivotElement): 'start' | 'end' {
    // Position explicite
    if (params.position === 'start' || params.position === 'end') {
      return params.position;
    }
    
    // Basé sur les coordonnées
    if (params.x !== undefined) {
      const profileLength = element.dimensions?.length || 1000;
      return params.x < profileLength / 2 ? 'start' : 'end';
    }
    
    // Basé sur les points de contour
    if (params.points && params.points.length > 0) {
      const normalizedPoints = this.normalizePoints(params.points);
      const bounds = this.getContourBounds(normalizedPoints);
      const profileLength = element.dimensions?.length || 1000;
      return bounds.centerX < profileLength / 2 ? 'start' : 'end';
    }
    
    // Par défaut, fin du profil
    return 'end';
  }

  /**
   * Détecte le type spécifique de coupe d'extrémité
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    // Type explicite
    if (params.endCutType) {
      switch (params.endCutType) {
        case 'straight': return CutType.END_STRAIGHT;
        case 'angle': return CutType.END_ANGLE;
        case 'compound': return CutType.END_COMPOUND;
        case 'chamfer': return CutType.END_CHAMFER;
      }
    }
    
    // Détection basée sur les paramètres
    if (params.angleX && params.angleY) {
      return CutType.END_COMPOUND;
    }
    
    if (params.chamferSize || params.isChamfer) {
      return CutType.END_CHAMFER;
    }
    
    if (params.angle && params.angle !== 0) {
      return CutType.END_ANGLE;
    }
    
    // Par défaut, coupe droite
    return CutType.END_STRAIGHT;
  }

  /**
   * Obtient la profondeur par défaut pour la face
   */
  private getDefaultDepth(element: PivotElement, face: ProfileFace): number {
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
   * Génère les métadonnées spécifiques aux coupes d'extrémité
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    
    return {
      ...baseMetadata,
      position: this.determineEndPosition(params, element),
      angle: params.angle || 0,
      isCompound: this.detectCutType(feature) === CutType.END_COMPOUND,
      isChamfered: this.detectCutType(feature) === CutType.END_CHAMFER
    };
  }
}