/**
 * TransverseCutStrategy - Stratégie pour découpes transversales
 * Gère les découpes qui traversent complètement le profil
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, Point2D } from '../../types';
import { BaseCutStrategy } from './CutStrategy';

/**
 * Stratégie pour découpes transversales
 */
export class TransverseCutStrategy extends BaseCutStrategy {
  readonly name = 'TransverseCut';
  
  canHandle(feature: Feature): boolean {
    const params = feature.parameters || {};
    return params.isTransverse === true;
  }
  
  protected validateSpecific(
    feature: Feature, 
    element: PivotElement, 
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    const contourPoints = params.contourPoints || [];
    
    // Pour une découpe transversale, vérifier qu'elle traverse bien
    if (contourPoints.length > 0) {
      const xValues = (contourPoints as Point2D[]).map(p => p.x);
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      
      // Vérifier que la découpe est bien à une extrémité
      if (minX > 50 && maxX < element.dimensions.length - 50) {
        errors.push('Transverse cut should be at the end of the profile');
      }
    }
  }
  
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters || {};
    const contourPoints = params.contourPoints || [];
    const dims = element.dimensions;
    
    // Pour une découpe transversale, on crée un bloc qui traverse tout
    const length = dims.length || 1000;
    const width = dims.width || 150;
    const height = dims.height || 300;
    
    // Déterminer la position et taille de la découpe
    let cutStart = 0;
    let cutEnd = length;
    
    if (contourPoints.length >= 2) {
      const xValues = (contourPoints as Point2D[]).map(p => p.x);
      cutStart = Math.min(...xValues);
      cutEnd = Math.max(...xValues);
    }
    
    // Créer une forme rectangulaire pour la découpe transversale
    const shape = new THREE.Shape();
    
    // Rectangle dans le plan XY (longueur x hauteur)
    const halfLength = length / 2;
    const halfHeight = height / 2;
    
    shape.moveTo(cutStart - halfLength, -halfHeight);
    shape.lineTo(cutEnd - halfLength, -halfHeight);
    shape.lineTo(cutEnd - halfLength, halfHeight);
    shape.lineTo(cutStart - halfLength, halfHeight);
    shape.closePath();
    
    // Extruder sur toute la largeur avec marge
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: width * 1.5, // 1.5x la largeur pour garantir la traversée
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer sur Z
    const extrudeDepth = extrudeSettings.depth || (width * 1.5);
    geometry.translate(0, 0, -extrudeDepth / 2);
    
    return geometry;
  }
  
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3 {
    // Les découpes transversales sont centrées
    return new THREE.Vector3(0, 0, 0);
  }
}