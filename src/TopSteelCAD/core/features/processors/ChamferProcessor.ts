/**
 * Processeur pour les chanfreins
 */

import * as THREE from 'three';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';

export class ChamferProcessor implements IFeatureProcessor {
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    // TODO: Implémenter le traitement des chanfreins
    // Pour l'instant, retourner la géométrie sans modification
    return {
      success: true,
      geometry: geometry.clone(),
      warning: 'Chamfer processing not yet implemented'
    };
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.angle || params.angle <= 0 || params.angle >= 90) {
      errors.push(`Invalid chamfer angle: ${params.angle}`);
    }
    
    if (!params.size || params.size <= 0) {
      errors.push(`Invalid chamfer size: ${params.size}`);
    }
    
    return errors;
  }
  
  dispose(): void {
    // Rien à nettoyer
  }
}