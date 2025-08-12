/**
 * Processeur pour les découpes d'adaptation (coping) entre profils métalliques
 * Permet l'assemblage précis entre différents types de profils
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement, MaterialType } from '@/types/viewer';
import { PositionCalculator, ProfileGeometryType } from '../utils/PositionCalculator';

/**
 * Types de coping supportés
 */
export enum CopingType {
  STRAIGHT = 'straight',           // Coupe droite
  SINGLE_BEVEL = 'single_bevel',   // Biseau simple
  DOUBLE_BEVEL = 'double_bevel',   // Double biseau
  SADDLE = 'saddle',               // Selle (pour tube sur tube)
  NOTCH = 'notch',                 // Entaille
  PROFILE_FIT = 'profile_fit'      // Ajustement au profil
}

export class CopingProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;
  private positionCalculator: PositionCalculator;
  
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    this.positionCalculator = new PositionCalculator();
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider la feature
      const errors = this.validateFeature(feature, element);
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join('; ')
        };
      }
      
      const params = feature.parameters;
      
      // Paramètres du coping
      const copingType = params.copingType || CopingType.PROFILE_FIT;
      const targetProfile = params.targetProfile || 'IPE300';
      const connectionAngle = params.angle || 90;
      const clearance = params.clearance || 2; // Jeu entre les pièces
      
      // Déterminer le type de profil source et cible
      const sourceProfileType = this.getProfileType(element);
      const targetProfileType = this.parseTargetProfileType(targetProfile);
      
      // Créer la géométrie de coping selon les types de profils
      let copingGeometry: THREE.BufferGeometry;
      
      if (copingType === CopingType.PROFILE_FIT) {
        copingGeometry = this.createProfileFitCoping(
          element,
          sourceProfileType,
          targetProfileType,
          targetProfile,
          connectionAngle,
          clearance
        );
      } else if (copingType === CopingType.SADDLE) {
        copingGeometry = this.createSaddleCoping(
          element,
          targetProfile,
          connectionAngle,
          clearance
        );
      } else {
        copingGeometry = this.createSimpleCoping(
          element,
          copingType,
          connectionAngle,
          clearance
        );
      }
      
      // Calculer la position
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Positionner le coping
      const copingBrush = new Brush(copingGeometry);
      copingBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      copingBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      // Ajouter l'angle de connexion
      if (connectionAngle !== 90) {
        const angleRad = ((90 - connectionAngle) * Math.PI) / 180;
        copingBrush.rotation.y += angleRad;
      }
      
      copingBrush.updateMatrixWorld();
      
      // Soustraire de la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, copingBrush, SUBTRACTION);
      
      // Nettoyer
      copingGeometry.dispose();
      
      // Extraire et optimiser
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      resultBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process coping: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.targetProfile) {
      errors.push('Target profile is required for coping');
    }
    
    if (params.angle && (params.angle < 0 || params.angle > 180)) {
      errors.push(`Invalid connection angle: ${params.angle}`);
    }
    
    if (params.clearance && params.clearance < 0) {
      errors.push('Clearance must be positive');
    }
    
    return errors;
  }
  
  /**
   * Crée un coping qui s'adapte au profil cible
   */
  private createProfileFitCoping(
    element: PivotElement,
    sourceType: ProfileGeometryType,
    targetType: ProfileGeometryType,
    targetProfile: string,
    angle: number,
    clearance: number
  ): THREE.BufferGeometry {
    // Obtenir les dimensions du profil cible
    const targetDims = this.getProfileDimensions(targetProfile);
    
    if (targetType === ProfileGeometryType.I_PROFILE) {
      return this.createIProfileCoping(
        element,
        targetDims,
        angle,
        clearance
      );
    } else if (targetType === ProfileGeometryType.TUBE_ROUND) {
      return this.createRoundTubeCoping(
        element,
        targetDims.diameter || 100,
        angle,
        clearance
      );
    } else if (targetType === ProfileGeometryType.TUBE_RECT) {
      return this.createRectTubeCoping(
        element,
        targetDims,
        angle,
        clearance
      );
    } else {
      // Par défaut, créer une découpe rectangulaire simple
      return this.createSimpleCoping(
        element,
        CopingType.STRAIGHT,
        angle,
        clearance
      );
    }
  }
  
  /**
   * Crée un coping pour connexion avec profil en I
   */
  private createIProfileCoping(
    element: PivotElement,
    targetDims: any,
    angle: number,
    clearance: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    // Dimensions du profil cible
    const targetHeight = targetDims.height || 300;
    const targetWidth = targetDims.width || 150;
    const webThickness = targetDims.webThickness || 7;
    const flangeThickness = targetDims.flangeThickness || 11;
    
    // Créer la forme négative du profil en I avec clearance
    const h2 = targetHeight / 2 + clearance;
    const w2 = targetWidth / 2 + clearance;
    const tw = webThickness / 2 + clearance;
    const tf = flangeThickness + clearance;
    
    // Dessiner le contour de découpe
    shape.moveTo(-w2, -h2);
    shape.lineTo(w2, -h2);
    shape.lineTo(w2, -h2 + tf);
    shape.lineTo(tw, -h2 + tf);
    shape.lineTo(tw, h2 - tf);
    shape.lineTo(w2, h2 - tf);
    shape.lineTo(w2, h2);
    shape.lineTo(-w2, h2);
    shape.lineTo(-w2, h2 - tf);
    shape.lineTo(-tw, h2 - tf);
    shape.lineTo(-tw, -h2 + tf);
    shape.lineTo(-w2, -h2 + tf);
    shape.closePath();
    
    // Extruder pour créer le volume de découpe
    const depth = element.dimensions.width || 150;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth * 1.2,
      bevelEnabled: false
    });
    
    geometry.center();
    
    // Orienter selon l'angle de connexion
    if (angle !== 90) {
      const angleRad = ((90 - angle) * Math.PI) / 180;
      geometry.rotateY(angleRad);
    }
    
    return geometry;
  }
  
  /**
   * Crée un coping pour connexion avec tube rond (selle)
   */
  private createRoundTubeCoping(
    element: PivotElement,
    targetDiameter: number,
    angle: number,
    clearance: number
  ): THREE.BufferGeometry {
    const radius = targetDiameter / 2 + clearance;
    const sourceWidth = element.dimensions.width || 100;
    
    // Créer un cylindre pour la découpe en selle
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      sourceWidth * 1.2,
      32
    );
    
    // Orienter le cylindre horizontalement
    geometry.rotateZ(Math.PI / 2);
    
    // Ajuster l'angle de connexion
    if (angle !== 90) {
      const angleRad = ((90 - angle) * Math.PI) / 180;
      geometry.rotateY(angleRad);
    }
    
    return geometry;
  }
  
  /**
   * Crée un coping pour connexion avec tube rectangulaire
   */
  private createRectTubeCoping(
    element: PivotElement,
    targetDims: any,
    angle: number,
    clearance: number
  ): THREE.BufferGeometry {
    const targetHeight = targetDims.height || 100;
    const targetWidth = targetDims.width || 100;
    const sourceDepth = element.dimensions.width || 100;
    
    // Créer une box pour la découpe
    const geometry = new THREE.BoxGeometry(
      targetWidth + clearance * 2,
      targetHeight + clearance * 2,
      sourceDepth * 1.2
    );
    
    // Ajuster l'angle de connexion
    if (angle !== 90) {
      const angleRad = ((90 - angle) * Math.PI) / 180;
      geometry.rotateY(angleRad);
    }
    
    return geometry;
  }
  
  /**
   * Crée un coping en selle pour connexion tube sur tube
   */
  private createSaddleCoping(
    element: PivotElement,
    targetProfile: string,
    angle: number,
    clearance: number
  ): THREE.BufferGeometry {
    const targetDims = this.getProfileDimensions(targetProfile);
    const targetRadius = (targetDims.diameter || 100) / 2;
    const sourceRadius = (element.dimensions.width || 100) / 2;
    
    // Créer une géométrie complexe pour la selle
    const points: THREE.Vector2[] = [];
    const segments = 32;
    
    // Calculer l'intersection entre deux cylindres
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI;
      const y = targetRadius * Math.cos(theta);
      const x = Math.sqrt(Math.max(0, sourceRadius * sourceRadius - y * y));
      points.push(new THREE.Vector2(x + clearance, y));
    }
    
    // Créer une géométrie de révolution
    const geometry = new THREE.LatheGeometry(points, segments);
    
    // Ajuster l'angle
    if (angle !== 90) {
      const angleRad = ((90 - angle) * Math.PI) / 180;
      geometry.rotateY(angleRad);
    }
    
    return geometry;
  }
  
  /**
   * Crée un coping simple (droit, biseau)
   */
  private createSimpleCoping(
    element: PivotElement,
    copingType: string,
    angle: number,
    clearance: number
  ): THREE.BufferGeometry {
    const dims = element.dimensions;
    const width = dims.width || 100;
    const height = dims.height || 100;
    const depth = width * 0.5;
    
    let geometry: THREE.BufferGeometry;
    
    switch (copingType) {
      case CopingType.SINGLE_BEVEL:
        // Créer une forme biseautée
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(width + clearance, 0);
        shape.lineTo(width + clearance, height + clearance);
        shape.lineTo(width * 0.5, height + clearance);
        shape.closePath();
        
        geometry = new THREE.ExtrudeGeometry(shape, {
          depth: depth,
          bevelEnabled: false
        });
        break;
        
      case CopingType.DOUBLE_BEVEL:
        // Créer une forme à double biseau
        const shape2 = new THREE.Shape();
        shape2.moveTo(width * 0.25, 0);
        shape2.lineTo(width * 0.75 + clearance, 0);
        shape2.lineTo(width + clearance, height * 0.5);
        shape2.lineTo(width * 0.75 + clearance, height + clearance);
        shape2.lineTo(width * 0.25, height + clearance);
        shape2.lineTo(0, height * 0.5);
        shape2.closePath();
        
        geometry = new THREE.ExtrudeGeometry(shape2, {
          depth: depth,
          bevelEnabled: false
        });
        break;
        
      default:
        // Coupe droite simple
        geometry = new THREE.BoxGeometry(
          width + clearance * 2,
          height + clearance * 2,
          depth
        );
    }
    
    geometry.center();
    
    // Ajuster l'angle
    if (angle !== 90) {
      const angleRad = ((90 - angle) * Math.PI) / 180;
      geometry.rotateY(angleRad);
    }
    
    return geometry;
  }
  
  /**
   * Détermine le type de profil de l'élément
   */
  private getProfileType(element: PivotElement): ProfileGeometryType {
    const profile = element.metadata?.profile || element.partNumber || '';
    
    if (/^(IPE|HE)/i.test(profile)) {
      return ProfileGeometryType.I_PROFILE;
    } else if (/^(CHS|ROR)/i.test(profile)) {
      return ProfileGeometryType.TUBE_ROUND;
    } else if (/^(RHS|SHS)/i.test(profile)) {
      return ProfileGeometryType.TUBE_RECT;
    } else if (/^L/i.test(profile)) {
      return ProfileGeometryType.L_PROFILE;
    } else if (/^(UPN|UAP)/i.test(profile)) {
      return ProfileGeometryType.U_PROFILE;
    }
    
    return ProfileGeometryType.UNKNOWN;
  }
  
  /**
   * Parse le type de profil cible depuis une chaîne
   */
  private parseTargetProfileType(profile: string): ProfileGeometryType {
    if (/^(IPE|HE)/i.test(profile)) {
      return ProfileGeometryType.I_PROFILE;
    } else if (/^(CHS|ROR)/i.test(profile)) {
      return ProfileGeometryType.TUBE_ROUND;
    } else if (/^(RHS|SHS)/i.test(profile)) {
      return ProfileGeometryType.TUBE_RECT;
    }
    
    return ProfileGeometryType.UNKNOWN;
  }
  
  /**
   * Obtient les dimensions approximatives d'un profil
   */
  private getProfileDimensions(profile: string): any {
    // Parser le nom du profil pour extraire les dimensions
    // Par exemple: IPE300 -> height=300mm
    const match = profile.match(/(\d+)/);
    const size = match ? parseInt(match[1]) : 100;
    
    if (/^IPE/i.test(profile)) {
      return {
        height: size,
        width: size * 0.5,
        webThickness: size * 0.024,
        flangeThickness: size * 0.036
      };
    } else if (/^HEA/i.test(profile)) {
      return {
        height: size,
        width: size,
        webThickness: size * 0.025,
        flangeThickness: size * 0.04
      };
    } else if (/^HEB/i.test(profile)) {
      return {
        height: size,
        width: size,
        webThickness: size * 0.035,
        flangeThickness: size * 0.055
      };
    } else if (/^CHS/i.test(profile)) {
      return {
        diameter: size,
        wallThickness: size * 0.05
      };
    } else if (/^RHS/i.test(profile) || /^SHS/i.test(profile)) {
      return {
        height: size,
        width: size,
        wallThickness: size * 0.05
      };
    }
    
    // Dimensions par défaut
    return {
      height: size,
      width: size * 0.6,
      thickness: size * 0.05
    };
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}