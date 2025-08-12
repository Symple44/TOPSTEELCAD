/**
 * Processeur pour les soudures
 */

import * as THREE from 'three';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';

export class WeldProcessor implements IFeatureProcessor {
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    // Les soudures sont généralement ajoutées comme éléments visuels séparés
    // plutôt que modifiant la géométrie de base
    // Pour l'instant, retourner la géométrie sans modification
    return {
      success: true,
      geometry: geometry.clone(),
      warning: 'Weld visualization should be handled separately'
    };
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.weldType) {
      errors.push('Weld type is required');
    }
    
    if (!params.weldSize || params.weldSize <= 0) {
      errors.push(`Invalid weld size: ${params.weldSize}`);
    }
    
    return errors;
  }
  
  dispose(): void {
    // Rien à nettoyer
  }
}