/**
 * Processeur pour les entailles (notches)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class NotchProcessor implements IFeatureProcessor {
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
      
      // Récupérer les paramètres de l'entaille
      const params = feature.parameters;
      const notchType = params.notchType || 'rectangular';
      const length = params.length || 50;
      const width = params.width || 30;
      const depth = params.depth || element.dimensions.thickness || 10;
      const angle = params.angle || 90;
      
      // Créer la géométrie selon le type d'entaille
      let notchGeometry: THREE.BufferGeometry;
      
      switch (notchType) {
        case 'rectangular':
          notchGeometry = this.createRectangularNotch(length, width, depth);
          break;
          
        case 'rounded':
          notchGeometry = this.createRoundedNotch(length, width, depth);
          break;
          
        case 'angular':
          notchGeometry = this.createAngularNotch(length, width, depth, angle);
          break;
          
        case 'coping':
          // Entaille spéciale pour adaptation entre profils
          notchGeometry = this.createCopingNotch(length, width, depth, params);
          break;
          
        default:
          notchGeometry = this.createRectangularNotch(length, width, depth);
      }
      
      // Calculer la position
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Positionner l'entaille
      const notchBrush = new Brush(notchGeometry);
      notchBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      notchBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      // Ajouter rotation supplémentaire si spécifiée
      if (feature.rotation) {
        notchBrush.rotation.x += feature.rotation.x;
        notchBrush.rotation.y += feature.rotation.y;
        notchBrush.rotation.z += feature.rotation.z;
      }
      
      notchBrush.updateMatrixWorld();
      
      // Soustraire de la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, notchBrush, SUBTRACTION);
      
      // Nettoyer
      notchGeometry.dispose();
      
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
        error: `Failed to process notch: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.length || params.length <= 0) {
      errors.push('Invalid notch length');
    }
    
    if (!params.width || params.width <= 0) {
      errors.push('Invalid notch width');
    }
    
    if (params.angle !== undefined && (params.angle <= 0 || params.angle >= 180)) {
      errors.push(`Invalid notch angle: ${params.angle}`);
    }
    
    return errors;
  }
  
  /**
   * Crée une entaille rectangulaire simple
   */
  private createRectangularNotch(
    length: number,
    width: number,
    depth: number
  ): THREE.BufferGeometry {
    return new THREE.BoxGeometry(length, depth * 1.1, width);
  }
  
  /**
   * Crée une entaille arrondie
   */
  private createRoundedNotch(
    length: number,
    width: number,
    depth: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const radius = Math.min(length, width) * 0.2;
    
    // Créer un rectangle avec coins arrondis
    shape.moveTo(-length/2 + radius, -width/2);
    shape.lineTo(length/2 - radius, -width/2);
    shape.quadraticCurveTo(length/2, -width/2, length/2, -width/2 + radius);
    shape.lineTo(length/2, width/2 - radius);
    shape.quadraticCurveTo(length/2, width/2, length/2 - radius, width/2);
    shape.lineTo(-length/2 + radius, width/2);
    shape.quadraticCurveTo(-length/2, width/2, -length/2, width/2 - radius);
    shape.lineTo(-length/2, -width/2 + radius);
    shape.quadraticCurveTo(-length/2, -width/2, -length/2 + radius, -width/2);
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth * 1.1,
      bevelEnabled: false
    });
    
    geometry.center();
    geometry.rotateX(Math.PI / 2);
    
    return geometry;
  }
  
  /**
   * Crée une entaille angulaire
   */
  private createAngularNotch(
    length: number,
    width: number,
    depth: number,
    angle: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const angleRad = (angle * Math.PI) / 180;
    const offset = width * Math.tan(angleRad / 2);
    
    // Créer un trapèze
    shape.moveTo(-length/2, -width/2);
    shape.lineTo(length/2 - offset, -width/2);
    shape.lineTo(length/2, width/2);
    shape.lineTo(-length/2, width/2);
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth * 1.1,
      bevelEnabled: false
    });
    
    geometry.center();
    geometry.rotateX(Math.PI / 2);
    
    return geometry;
  }
  
  /**
   * Crée une entaille de coping (adaptation entre profils)
   */
  private createCopingNotch(
    length: number,
    width: number,
    depth: number,
    params: any
  ): THREE.BufferGeometry {
    // Pour une découpe de coping, on crée une forme qui épouse
    // le profil de la pièce à laquelle on se connecte
    const profileType = params.copingProfile || 'I';
    const shape = new THREE.Shape();
    
    if (profileType === 'I') {
      // Forme pour s'adapter à un profil en I
      const webThickness = params.webThickness || width * 0.3;
      const flangeThickness = params.flangeThickness || depth * 0.4;
      
      // Créer la forme négative du profil en I
      shape.moveTo(-length/2, -width/2);
      shape.lineTo(-webThickness/2, -width/2);
      shape.lineTo(-webThickness/2, -width/2 + flangeThickness);
      shape.lineTo(webThickness/2, -width/2 + flangeThickness);
      shape.lineTo(webThickness/2, -width/2);
      shape.lineTo(length/2, -width/2);
      shape.lineTo(length/2, width/2);
      shape.lineTo(-length/2, width/2);
      shape.closePath();
    } else {
      // Par défaut, entaille rectangulaire
      return this.createRectangularNotch(length, width, depth);
    }
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth * 1.1,
      bevelEnabled: false
    });
    
    geometry.center();
    geometry.rotateX(Math.PI / 2);
    
    return geometry;
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}