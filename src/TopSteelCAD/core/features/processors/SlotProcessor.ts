/**
 * Processeur pour les oblongs (slots)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionService } from '../../services/PositionService';

export class SlotProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;
  private positionService: PositionService;
  
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    this.positionService = PositionService.getInstance();
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
      const position3D = this.positionService.calculateFeaturePosition(
        element,
        feature.position,
        feature.face,
        'dstv'
      );
      
      // Créer la géométrie de l'oblong
      const slotGeometry = this.createSlotGeometry(
        feature.parameters.length!,
        feature.parameters.width!,
        position3D.depth
      );
      
      // Positionner et orienter l'oblong
      const slotBrush = new Brush(slotGeometry);
      slotBrush.position.set(
        position3D.position.x,
        position3D.position.y,
        position3D.position.z
      );
      slotBrush.rotation.set(
        position3D.rotation.x,
        position3D.rotation.y,
        position3D.rotation.z
      );
      
      // Ajouter rotation supplémentaire si spécifiée
      if (feature.rotation) {
        slotBrush.rotation.x += feature.rotation.x;
        slotBrush.rotation.y += feature.rotation.y;
        slotBrush.rotation.z += feature.rotation.z;
      }
      
      slotBrush.updateMatrixWorld();
      
      // Créer le brush de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const resultBrush = this.evaluator.evaluate(baseBrush, slotBrush, SUBTRACTION);
      
      // Nettoyer
      slotGeometry.dispose();
      
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
        error: `Failed to process slot: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    // Vérifier la longueur
    if (!params.length || params.length <= 0) {
      errors.push(`Invalid slot length: ${params.length}`);
    }
    
    // Vérifier la largeur
    if (!params.width || params.width <= 0) {
      errors.push(`Invalid slot width: ${params.width}`);
    }
    
    // Vérifier que la longueur est supérieure à la largeur
    if (params.length && params.width && params.length < params.width) {
      errors.push('Slot length must be greater than width');
    }
    
    // Vérifier les dimensions par rapport à l'élément
    const maxDimension = Math.max(
      element.dimensions.length || 1000,
      element.dimensions.width || 100,
      element.dimensions.height || 100
    );
    
    if (params.length && params.length > maxDimension) {
      errors.push(`Slot length exceeds element dimensions`);
    }
    
    return errors;
  }
  
  /**
   * Crée une géométrie d'oblong (forme de capsule)
   */
  private createSlotGeometry(
    length: number,
    width: number,
    depth: number
  ): THREE.BufferGeometry {
    // Un oblong est essentiellement un rectangle avec des demi-cercles aux extrémités
    const shape = new THREE.Shape();
    
    const radius = width / 2;
    const straightLength = length - width;
    
    if (straightLength <= 0) {
      // Si la longueur est égale à la largeur, c'est un cercle
      const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        depth * 1.1,
        16
      );
      return geometry;
    }
    
    // Créer le contour de l'oblong
    // Commencer en bas à gauche
    shape.moveTo(-straightLength / 2, -radius);
    
    // Ligne droite vers la droite
    shape.lineTo(straightLength / 2, -radius);
    
    // Demi-cercle droit
    shape.arc(0, radius, radius, -Math.PI / 2, Math.PI / 2, false);
    
    // Ligne droite vers la gauche
    shape.lineTo(-straightLength / 2, radius);
    
    // Demi-cercle gauche
    shape.arc(0, -radius, radius, Math.PI / 2, 3 * Math.PI / 2, false);
    
    // Extruder pour créer le volume
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth * 1.1,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer et orienter
    geometry.center();
    geometry.rotateX(Math.PI / 2); // Orienter pour que l'extrusion soit selon Y
    
    return geometry;
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}