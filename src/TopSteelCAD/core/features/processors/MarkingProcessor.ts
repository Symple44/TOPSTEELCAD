/**
 * Processeur pour les marquages et gravures
 */

import * as THREE from 'three';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class MarkingProcessor implements IFeatureProcessor {
  private positionCalculator: PositionCalculator;
  
  constructor() {
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
      const markingType = params.markingType || 'center_punch';
      
      // Les marquages sont généralement des indications visuelles
      // qui n'affectent pas significativement la géométrie
      // Pour une simulation réaliste, on pourrait créer une légère dépression
      
      if (params.depth && params.depth > 0.5) {
        // Si la profondeur est significative, créer une petite dépression
        return this.createMarkingDepression(geometry, feature, element);
      }
      
      // Sinon, retourner la géométrie sans modification
      // (le marquage sera visible via texture ou couleur)
      return {
        success: true,
        geometry: geometry.clone(),
        warning: 'Marking is visual only - consider adding visual indicators in the renderer'
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process marking: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.markingType) {
      params.markingType = 'center_punch'; // Valeur par défaut
    }
    
    const validTypes = [
      'center_punch',
      'drill_point',
      'scribe_line',
      'stamp',
      'laser_mark',
      'paint_mark'
    ];
    
    if (!validTypes.includes(params.markingType)) {
      errors.push(`Invalid marking type: ${params.markingType}`);
    }
    
    return errors;
  }
  
  /**
   * Crée une légère dépression pour un marquage physique
   */
  private createMarkingDepression(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    const params = feature.parameters;
    const markingType = params.markingType || 'center_punch';
    
    // Pour l'instant, retourner la géométrie sans modification
    // Une implémentation complète nécessiterait CSG pour créer
    // une petite dépression conique ou sphérique
    
    return {
      success: true,
      geometry: geometry.clone(),
      warning: `Physical marking (${markingType}) simplified - depth not rendered`
    };
  }
  
  dispose(): void {
    // Rien à nettoyer
  }
}