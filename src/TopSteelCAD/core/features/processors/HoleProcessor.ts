/**
 * Processeur pour les trous (perçages)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult,
  ProfileFace 
} from '../types';
import { PivotElement, MaterialType } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class HoleProcessor implements IFeatureProcessor {
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
      
      // Calculer la position et l'orientation correctes
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Créer la géométrie du trou
      const holeGeometry = this.createHoleGeometry(
        feature.parameters.diameter!,
        position3D.depth
      );
      
      // Positionner et orienter le trou
      const holeBrush = new Brush(holeGeometry);
      
      // Appliquer la position
      holeBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      
      // Appliquer la rotation pour que le trou soit perpendiculaire à la surface
      holeBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      holeBrush.updateMatrixWorld();
      
      // Créer le brush pour la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Effectuer la soustraction CSG
      const resultBrush = this.evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);
      
      // Nettoyer les géométries temporaires
      holeGeometry.dispose();
      
      // Extraire et optimiser la géométrie résultante
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Nettoyer le brush résultant
      resultBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process hole: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    // Vérifier le diamètre
    if (!params.diameter || params.diameter <= 0) {
      errors.push(`Invalid hole diameter: ${params.diameter}`);
    }
    
    // Vérifier la profondeur si spécifiée
    if (params.depth !== undefined && params.depth <= 0) {
      errors.push(`Invalid hole depth: ${params.depth}`);
    }
    
    // Vérifier que le diamètre n'est pas plus grand que l'élément
    const minDimension = Math.min(
      element.dimensions.width || 100,
      element.dimensions.height || 100
    );
    
    if (params.diameter && params.diameter > minDimension) {
      errors.push(`Hole diameter (${params.diameter}) exceeds element dimensions`);
    }
    
    // Vérifier la position
    if (!this.isPositionValid(feature.position, element)) {
      errors.push(`Hole position out of bounds`);
    }
    
    return errors;
  }
  
  private createHoleGeometry(diameter: number, depth: number): THREE.BufferGeometry {
    // Créer un cylindre pour le trou
    // Ajouter 10% de longueur pour s'assurer de traverser complètement
    const actualDepth = depth * 1.1;
    const radius = diameter / 2;
    
    // Utiliser moins de segments pour les petits trous (optimisation)
    const segments = diameter < 10 ? 8 : diameter < 20 ? 12 : 16;
    
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      actualDepth,
      segments
    );
    
    // Rotation par défaut: cylindre orienté selon Y
    // Sera réorienté selon la face lors du positionnement
    
    return geometry;
  }
  
  private isPositionValid(position: THREE.Vector3, element: PivotElement): boolean {
    const dims = element.dimensions;
    const halfLength = (dims.length || 1000) / 2;
    const halfHeight = (dims.height || 100) / 2;
    const halfWidth = (dims.width || 100) / 2;
    
    // Permettre une petite marge pour les trous sur les bords
    const margin = 5;
    
    return (
      Math.abs(position.x) <= halfLength + margin &&
      Math.abs(position.y) <= halfHeight + margin &&
      Math.abs(position.z) <= halfWidth + margin
    );
  }
  
  /**
   * Optimisation: créer plusieurs trous en une seule opération
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    holes: Feature[],
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider tous les trous
      const allErrors: string[] = [];
      for (const hole of holes) {
        const errors = this.validateFeature(hole, element);
        if (errors.length > 0) {
          allErrors.push(`Hole ${hole.id}: ${errors.join('; ')}`);
        }
      }
      
      if (allErrors.length > 0) {
        return {
          success: false,
          error: allErrors.join('\n')
        };
      }
      
      // Créer le brush de base une seule fois
      let currentBrush = new Brush(geometry);
      currentBrush.updateMatrixWorld();
      
      // Appliquer tous les trous
      for (const hole of holes) {
        const position3D = this.positionCalculator.calculateFeaturePosition(
          element,
          hole.position,
          hole.face
        );
        
        const holeGeometry = this.createHoleGeometry(
          hole.parameters.diameter!,
          position3D.depth
        );
        
        const holeBrush = new Brush(holeGeometry);
        holeBrush.position.set(
          position3D.position[0],
          position3D.position[1],
          position3D.position[2]
        );
        holeBrush.rotation.set(
          position3D.rotation[0],
          position3D.rotation[1],
          position3D.rotation[2]
        );
        holeBrush.updateMatrixWorld();
        
        // Soustraire le trou
        const resultBrush = this.evaluator.evaluate(currentBrush, holeBrush, SUBTRACTION);
        
        // Nettoyer l'ancien brush
        if (currentBrush.geometry !== geometry) {
          currentBrush.geometry.dispose();
        }
        
        holeGeometry.dispose();
        currentBrush = resultBrush;
      }
      
      // Extraire la géométrie finale
      const resultGeometry = currentBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      currentBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process batch holes: ${error}`
      };
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}