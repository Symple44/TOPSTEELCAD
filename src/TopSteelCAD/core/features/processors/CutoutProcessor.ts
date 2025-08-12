/**
 * Processeur pour les découpes rectangulaires
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

export class CutoutProcessor implements IFeatureProcessor {
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
      
      // Calculer la position et l'orientation
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Créer la géométrie de la découpe
      const cutoutGeometry = this.createCutoutGeometry(
        feature.parameters.length!,
        feature.parameters.width!,
        position3D.depth
      );
      
      // Positionner et orienter la découpe
      const cutoutBrush = new Brush(cutoutGeometry);
      cutoutBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      cutoutBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      // Ajouter rotation supplémentaire si spécifiée
      if (feature.rotation) {
        cutoutBrush.rotation.x += feature.rotation.x;
        cutoutBrush.rotation.y += feature.rotation.y;
        cutoutBrush.rotation.z += feature.rotation.z;
      }
      
      cutoutBrush.updateMatrixWorld();
      
      // Créer le brush de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const resultBrush = this.evaluator.evaluate(baseBrush, cutoutBrush, SUBTRACTION);
      
      // Nettoyer
      cutoutGeometry.dispose();
      
      // Extraire et optimiser la géométrie
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
        error: `Failed to process cutout: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    // Vérifier la longueur
    if (!params.length || params.length <= 0) {
      errors.push(`Invalid cutout length: ${params.length}`);
    }
    
    // Vérifier la largeur
    if (!params.width || params.width <= 0) {
      errors.push(`Invalid cutout width: ${params.width}`);
    }
    
    // Vérifier les dimensions par rapport à l'élément
    const maxLength = element.dimensions.length || 1000;
    const maxWidth = Math.max(
      element.dimensions.width || 100,
      element.dimensions.height || 100
    );
    
    if (params.length && params.length > maxLength * 1.5) {
      errors.push(`Cutout length exceeds reasonable bounds`);
    }
    
    if (params.width && params.width > maxWidth * 1.5) {
      errors.push(`Cutout width exceeds reasonable bounds`);
    }
    
    return errors;
  }
  
  /**
   * Crée une géométrie de découpe rectangulaire
   */
  private createCutoutGeometry(
    length: number,
    width: number,
    depth: number
  ): THREE.BufferGeometry {
    // Créer un simple box pour la découpe
    // Ajouter 10% de profondeur pour s'assurer de traverser
    const geometry = new THREE.BoxGeometry(
      length,
      depth * 1.1,
      width
    );
    
    return geometry;
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}