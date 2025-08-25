/**
 * Processeur pour les textes gravés ou en relief
 */

import * as THREE from 'three';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionService } from '../../services/PositionService';

export class TextProcessor implements IFeatureProcessor {
  private positionService: PositionService;
  
  constructor() {
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
      
      const params = feature.parameters;
      const text = params.text || '';
      // const fontSize = params.fontSize || 10;
      // Unused variables for future implementation
      // const depth = params.depth || 1;
      // const textType = params.textType || 'engraved'; // engraved, embossed, stencil
      
      // La création de texte 3D nécessite TextGeometry de Three.js
      // qui nécessite le chargement de fonts
      // Pour une implémentation complète, il faudrait:
      // 1. Charger une font (FontLoader)
      // 2. Créer TextGeometry
      // 3. Appliquer CSG pour graver ou embosser
      
      // Pour l'instant, retourner la géométrie sans modification
      // avec un avertissement
      
      return {
        success: true,
        geometry: geometry.clone(),
        warning: `Text "${text}" not rendered - TextGeometry requires font loading. Consider using visual overlays instead.`
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process text: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.text || params.text.length === 0) {
      errors.push('Text content is required');
    }
    
    if (params.fontSize && params.fontSize <= 0) {
      errors.push('Invalid font size');
    }
    
    if (params.textType && !['engraved', 'embossed', 'stencil'].includes(params.textType)) {
      errors.push(`Invalid text type: ${params.textType}`);
    }
    
    return errors;
  }
  
  dispose(): void {
    // Rien à nettoyer
  }
}