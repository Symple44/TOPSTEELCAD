/**
 * SimpleCutStrategy - Stratégie pour découpes simples
 * Gère les découpes rectangulaires et polygonales basiques
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace, Point2D, pointsToArray, mapDSTVFaceToProfileFace } from '../../types';
import { BaseCutStrategy } from './CutStrategy';

/**
 * Stratégie pour découpes simples
 */
export class SimpleCutStrategy extends BaseCutStrategy {
  readonly name = 'SimpleCut';
  
  canHandle(feature: Feature): boolean {
    // Gère les découpes sans propriétés spéciales
    const params = feature.parameters || {};
    return !params.isTransverse && 
           !params.isBeveled && 
           !params.isCompound;
  }
  
  protected validateSpecific(
    feature: Feature, 
    element: PivotElement, 
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    
    // Vérifier la profondeur
    if (!params.depth || params.depth <= 0) {
      errors.push('Simple cut requires positive depth');
    }
    
    // Vérifier que les points sont dans les limites
    const dims = element.dimensions;
    const contourPoints = params.contourPoints || [];
    const height = dims.height || dims.width || 100;
    
    for (let i = 0; i < contourPoints.length; i++) {
      const point = contourPoints[i];
      if (point.x < 0 || point.x > dims.length) {
        errors.push(`Point ${i} X coordinate out of bounds`);
      }
      if (point.y < 0 || point.y > height) {
        errors.push(`Point ${i} Y coordinate out of bounds`);
      }
    }
  }
  
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters || {};
    const contourPoints = params.contourPoints || [];
    const depth = params.depth || 10;
    const face = params.face || feature.face || ProfileFace.WEB;
    
    // Convertir et centrer les points
    const arrayPoints = pointsToArray(contourPoints as Point2D[]);
    const centeredPoints = this.centerContourPoints(arrayPoints, element);
    
    // Créer la forme
    const shape = this.createShape(centeredPoints);
    
    // Paramètres d'extrusion
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };
    
    // Créer la géométrie extrudée
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Orienter selon la face
    this.orientGeometry(geometry, face, element);
    
    return geometry;
  }
  
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3 {
    const params = feature.parameters || {};
    const face = params.face || feature.face || ProfileFace.WEB;
    const dims = element.dimensions;
    
    const position = new THREE.Vector3();
    
    // Mapper les codes DSTV vers ProfileFace si nécessaire
    const mappedFace = typeof face === 'string' && face.length === 1 
      ? mapDSTVFaceToProfileFace(face) 
      : face;
    
    switch (mappedFace) {
      case ProfileFace.WEB: // v mapped to WEB
      case ProfileFace.TOP_FLANGE:
        position.y = (dims.height || 0) / 2 - (dims.flangeThickness || 10) / 2;
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        position.y = -(dims.height || 0) / 2 + (dims.flangeThickness || 10) / 2;
        break;
        
      case ProfileFace.WEB:
      default:
        // For web cuts, keep centered position
        position.z = 0;
        break;
    }
    
    return position;
  }
  
  /**
   * Oriente la géométrie selon la face
   */
  private orientGeometry(
    geometry: THREE.BufferGeometry, 
    face: ProfileFace | undefined, 
    _element: PivotElement
  ): void {
    const rotationMatrix = new THREE.Matrix4();
    
    switch (face) {
      case ProfileFace.WEB: // Face supérieure - rotation pour découpe verticale
        rotationMatrix.makeRotationX(-Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE: // Face inférieure
        rotationMatrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        break;
        
      case ProfileFace.TOP_FLANGE: // Âme - pas de rotation nécessaire
        break;
    }
  }
}