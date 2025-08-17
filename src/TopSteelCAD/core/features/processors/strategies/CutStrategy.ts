/**
 * CutStrategy - Interface et stratégies pour différents types de découpes
 * Pattern Strategy pour gérer les variations de découpes
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature } from '../../types';

/**
 * Interface pour une stratégie de découpe
 */
export interface ICutStrategy {
  /**
   * Nom de la stratégie
   */
  readonly name: string;
  
  /**
   * Vérifie si cette stratégie peut traiter la feature
   */
  canHandle(feature: Feature): boolean;
  
  /**
   * Valide la feature pour cette stratégie
   */
  validate(feature: Feature, element: PivotElement): string[];
  
  /**
   * Crée la géométrie de découpe
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry;
  
  /**
   * Calcule la position de la découpe
   */
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3;
  
  /**
   * Dispose les ressources
   */
  dispose?(): void;
}

/**
 * Stratégie de base abstraite
 */
export abstract class BaseCutStrategy implements ICutStrategy {
  abstract readonly name: string;
  
  abstract canHandle(feature: Feature): boolean;
  
  validate(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters || {};
    
    // Validations communes
    if (!params.contourPoints || !Array.isArray(params.contourPoints)) {
      errors.push('Cut feature requires contourPoints array');
    } else if (params.contourPoints.length < 3) {
      errors.push('Cut requires at least 3 contour points');
    }
    
    // Validations spécifiques à la stratégie
    this.validateSpecific(feature, element, errors);
    
    return errors;
  }
  
  /**
   * Validations spécifiques à implémenter
   */
  protected abstract validateSpecific(
    feature: Feature, 
    element: PivotElement, 
    errors: string[]
  ): void;
  
  abstract createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry;
  
  abstract calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3;
  
  /**
   * Crée une forme Shape à partir des points de contour
   */
  protected createShape(contourPoints: Array<[number, number]>): THREE.Shape {
    const shape = new THREE.Shape();
    
    if (contourPoints.length > 0) {
      shape.moveTo(contourPoints[0][0], contourPoints[0][1]);
      for (let i = 1; i < contourPoints.length; i++) {
        shape.lineTo(contourPoints[i][0], contourPoints[i][1]);
      }
    }
    
    return shape;
  }
  
  /**
   * Centre les points de contour
   */
  protected centerContourPoints(
    points: Array<[number, number]>, 
    element: PivotElement
  ): Array<[number, number]> {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 300;
    
    return points.map(p => [
      p[0] - length / 2,
      p[1] - height / 2
    ]);
  }
  
  dispose(): void {
    // Override si nécessaire
  }
}