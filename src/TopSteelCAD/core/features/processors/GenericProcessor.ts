/**
 * GenericProcessor - Processeur générique pour les features DSTV avancées
 * Utilisé pour les blocs moins courants qui n'ont pas d'impact géométrique direct
 */

import * as THREE from 'three';
import { Feature, ProcessorResult, IFeatureProcessor } from '../types';
import { PivotElement } from '@/types/viewer';

/**
 * Processeur générique pour les features non-géométriques
 */
export class GenericProcessor implements IFeatureProcessor {
  private supportedTypes: Set<string>;
  
  constructor(supportedTypes: string[]) {
    this.supportedTypes = new Set(supportedTypes);
  }
  
  canProcess(type: string): boolean {
    return this.supportedTypes.has(type);
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`📄 GenericProcessor: Processing ${feature.type} feature ${feature.id}`);
    console.log(`  - Parameters:`, feature.parameters);
    
    // Les features génériques n'affectent pas directement la géométrie
    // Elles sont stockées comme métadonnées
    if (!geometry.userData) {
      geometry.userData = {};
    }
    
    if (!geometry.userData.features) {
      geometry.userData.features = [];
    }
    
    geometry.userData.features.push({
      type: feature.type,
      id: feature.id,
      parameters: feature.parameters
    });
    
    console.log(`  ✅ Feature metadata stored`);
    
    return {
      success: true,
      geometry: geometry
    };
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    
    if (!feature.parameters) {
      errors.push('Missing parameters');
    }
    
    return errors;
  }
  
  dispose(): void {
    // Rien à disposer
  }
}

// Créer des instances spécialisées pour chaque type
export class VolumeProcessor extends GenericProcessor {
  constructor() { super(['volume']); }
}

export class NumericControlProcessor extends GenericProcessor {
  constructor() { super(['numeric_control']); }
}

export class FreeProgramProcessor extends GenericProcessor {
  constructor() { super(['free_program']); }
}

export class LineProgramProcessor extends GenericProcessor {
  constructor() { super(['line_program']); }
}

export class RotationProcessor extends GenericProcessor {
  constructor() { super(['rotation']); }
}

export class WashingProcessor extends GenericProcessor {
  constructor() { super(['washing']); }
}

export class GroupProcessor extends GenericProcessor {
  constructor() { super(['group']); }
}

export class VariableProcessor extends GenericProcessor {
  constructor() { super(['variable']); }
}