/**
 * LegacyFallbackHandler.ts - Handler de secours pour coupes non reconnues
 * Utilise l'ancien CutProcessor comme fallback pour compatibilité maximale
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Handler de fallback pour toutes les coupes non gérées par les handlers spécialisés
 * Assure une compatibilité maximale en utilisant une logique générique
 */
export class LegacyFallbackHandler extends BaseCutHandler {
  readonly name = 'LegacyFallbackHandler';
  readonly supportedTypes = Object.values(CutType); // Supporte TOUS les types
  readonly priority = 0; // Priorité la plus basse - dernier recours

  private geometryService = getGeometryService();

  /**
   * Ce handler peut toujours traiter une feature (dernier recours)
   */
  protected canHandleSpecific(feature: Feature): boolean {
    // Accepte toujours si c'est une feature de type CUT ou NOTCH
    return feature.type === FeatureType.CUT || 
           feature.type === FeatureType.NOTCH ||
           (feature.type as any) === 'GROOVE';
  }

  /**
   * Validation minimale pour le fallback
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Avertissement que le fallback est utilisé
    warnings.push(`Using fallback handler for cut type: ${params.cutType || 'unknown'}`);
    
    // Validation basique des dimensions
    if (params.width && params.width <= 0) {
      errors.push('Cut width must be positive');
    }
    
    if (params.height && params.height <= 0) {
      errors.push('Cut height must be positive');
    }
    
    if (params.depth && params.depth < 0) {
      errors.push('Cut depth cannot be negative');
    }
    
    // Avertissement si pas de points ou de dimensions
    if (!params.points && !params.width && !params.height) {
      warnings.push('No geometry information found, using defaults');
    }
  }

  /**
   * Le fallback peut fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée une géométrie générique basée sur les informations disponibles
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const dims = element.dimensions || {};
    
    console.log(`  ⚠️ Using legacy fallback for cut:`, {
      type: feature.type,
      cutType: params.cutType,
      hasPoints: !!params.points,
      hasDimensions: !!(params.width || params.height)
    });
    
    // Stratégie 1: Si on a des points de contour
    if (params.points && params.points.length >= 3) {
      return this.createGeometryFromPoints(params, dims);
    }
    
    // Stratégie 2: Si on a des dimensions explicites
    if (params.width || params.height || params.radius) {
      return this.createGeometryFromDimensions(params, dims);
    }
    
    // Stratégie 3: Géométrie basée sur le type de feature
    switch (feature.type) {
      case FeatureType.NOTCH:
        return this.createDefaultNotchGeometry(params, dims);
      case 'GROOVE' as any:
        return this.createDefaultGrooveGeometry(params, dims);
      default:
        return this.createDefaultCutGeometry(params, dims);
    }
  }

  /**
   * Crée une géométrie à partir de points
   */
  private createGeometryFromPoints(params: any, dims: any): THREE.BufferGeometry {
    const points = this.normalizePoints(params.points);
    const bounds = this.getContourBounds(points);
    
    // Créer une forme 2D
    const shape = this.createShapeFromPoints(points);
    
    // Profondeur d'extrusion
    const depth = this.calculateDepth(params, dims, bounds);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: params.bevelEnabled || false,
      bevelThickness: params.bevelThickness || 0,
      bevelSize: params.bevelSize || 0,
      bevelSegments: params.bevelSegments || 1,
      steps: params.steps || 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner si nécessaire
    this.positionGeometry(geometry, params, dims);
    
    return geometry;
  }

  /**
   * Crée une géométrie à partir de dimensions
   */
  private createGeometryFromDimensions(params: any, dims: any): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    if (params.radius) {
      // Géométrie cylindrique
      geometry = new THREE.CylinderGeometry(
        params.radius,
        params.radius2 || params.radius,
        params.height || params.length || 100,
        params.segments || 32
      );
    } else if (params.width && params.height) {
      // Géométrie rectangulaire
      const depth = params.depth || dims.webThickness || 10;
      geometry = new THREE.BoxGeometry(
        params.width,
        params.height,
        depth
      );
    } else {
      // Géométrie par défaut
      geometry = this.createDefaultCutGeometry(params, dims);
    }
    
    // Appliquer les transformations
    this.applyTransformations(geometry, params);
    
    // Positionner
    this.positionGeometry(geometry, params, dims);
    
    return geometry;
  }

  /**
   * Crée une géométrie d'encoche par défaut
   */
  private createDefaultNotchGeometry(params: any, dims: any): THREE.BufferGeometry {
    const width = params.width || 50;
    const height = params.height || 30;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer une forme d'encoche basique (rectangulaire)
    const shape = new THREE.Shape();
    
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, height);
    shape.lineTo(width * 0.7, height); // Petite pente
    shape.lineTo(width * 0.3, height * 0.8);
    shape.lineTo(0, height * 0.8);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée une géométrie de rainure par défaut
   */
  private createDefaultGrooveGeometry(params: any, dims: any): THREE.BufferGeometry {
    const length = params.length || 100;
    const width = params.width || 20;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer une rainure simple
    return new THREE.BoxGeometry(length, width, depth);
  }

  /**
   * Crée une géométrie de coupe par défaut
   */
  private createDefaultCutGeometry(params: any, dims: any): THREE.BufferGeometry {
    // Dimensions par défaut basées sur le profil
    const width = params.width || Math.min(100, dims.length || 100);
    const height = params.height || dims.height || 50;
    const depth = params.depth || dims.webThickness || 10;
    
    console.log(`  📦 Creating default cut geometry:`, {
      width,
      height,
      depth
    });
    
    return new THREE.BoxGeometry(width, height, depth);
  }

  /**
   * Calcule la profondeur de la coupe
   */
  private calculateDepth(params: any, dims: any, bounds: any): number {
    // Profondeur explicite
    if (params.depth !== undefined && params.depth !== null) {
      return params.depth;
    }
    
    // Profondeur basée sur la face
    if (params.face) {
      switch (params.face) {
        case ProfileFace.WEB:
        case ProfileFace.BOTTOM:
          return dims.webThickness || 10;
        case ProfileFace.TOP_FLANGE:
        case ProfileFace.BOTTOM_FLANGE:
          return dims.flangeThickness || 15;
        default:
          return dims.webThickness || 10;
      }
    }
    
    // Profondeur basée sur le type
    if (params.isThrough || params.cutType === 'through') {
      return Math.max(
        dims.width || 150,
        dims.flangeWidth || 150,
        bounds.width || 100
      ) + 50;
    }
    
    // Profondeur par défaut
    return dims.webThickness || 10;
  }

  /**
   * Positionne la géométrie
   */
  private positionGeometry(geometry: THREE.BufferGeometry, params: any, dims: any): void {
    const matrix = new THREE.Matrix4();
    
    // Position explicite
    const x = params.position?.x || params.x || 0;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    if (x !== 0 || y !== 0 || z !== 0) {
      matrix.makeTranslation(x, y, z);
      geometry.applyMatrix4(matrix);
    }
    
    // Offset pour certaines faces
    if (params.face === ProfileFace.TOP_FLANGE) {
      const yOffset = (dims.height || 300) / 2 - (dims.flangeThickness || 15) / 2;
      matrix.makeTranslation(0, yOffset, 0);
      geometry.applyMatrix4(matrix);
    } else if (params.face === ProfileFace.BOTTOM_FLANGE) {
      const yOffset = -(dims.height || 300) / 2 + (dims.flangeThickness || 15) / 2;
      matrix.makeTranslation(0, yOffset, 0);
      geometry.applyMatrix4(matrix);
    }
  }

  /**
   * Applique les transformations (rotation, scale, etc.)
   */
  private applyTransformations(geometry: THREE.BufferGeometry, params: any): void {
    const matrix = new THREE.Matrix4();
    
    // Rotation
    if (params.rotation) {
      const euler = new THREE.Euler(
        (params.rotation.x || 0) * Math.PI / 180,
        (params.rotation.y || 0) * Math.PI / 180,
        (params.rotation.z || 0) * Math.PI / 180
      );
      matrix.makeRotationFromEuler(euler);
      geometry.applyMatrix4(matrix);
    }
    
    // Angle simple
    if (params.angle && Math.abs(params.angle) > 0.1) {
      matrix.makeRotationZ(params.angle * Math.PI / 180);
      geometry.applyMatrix4(matrix);
    }
    
    // Scale
    if (params.scale) {
      matrix.makeScale(
        params.scale.x || 1,
        params.scale.y || 1,
        params.scale.z || 1
      );
      geometry.applyMatrix4(matrix);
    }
  }

  /**
   * Détecte le type de coupe (best effort)
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    // Type explicite
    if (params.cutType) {
      const upperType = params.cutType.toUpperCase();
      if (upperType in CutType) {
        return CutType[upperType as keyof typeof CutType];
      }
    }
    
    // Détection basée sur les paramètres
    if (params.angle && Math.abs(params.angle) > 1) {
      return CutType.ANGLE_CUT;
    }
    
    if (params.bevel || params.bevelAngle) {
      return CutType.BEVEL_CUT;
    }
    
    if (feature.type === FeatureType.NOTCH) {
      return CutType.NOTCH_RECTANGULAR;
    }
    
    if ((feature.type as any) === 'GROOVE') {
      return CutType.SLOT_CUT;
    }
    
    // Type par défaut
    return CutType.STRAIGHT_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    
    return {
      ...baseMetadata,
      isLegacyFallback: true,
      originalType: params.cutType || 'unknown',
      hasPoints: !!params.points,
      hasDimensions: !!(params.width || params.height || params.radius),
      featureType: feature.type,
      warning: 'Processed with legacy fallback handler'
    };
  }
}