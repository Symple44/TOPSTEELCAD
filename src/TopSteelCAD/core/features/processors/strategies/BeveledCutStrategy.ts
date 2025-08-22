/**
 * BeveledCutStrategy - Stratégie pour découpes biseautées
 * Gère les découpes avec angles et chanfreins
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace, Point2D, pointsToArray, mapDSTVFaceToProfileFace } from '../../types';
import { BaseCutStrategy } from './CutStrategy';

/**
 * Stratégie pour découpes biseautées
 */
export class BeveledCutStrategy extends BaseCutStrategy {
  readonly name = 'BeveledCut';
  
  canHandle(feature: Feature): boolean {
    const params = feature.parameters || {};
    return params.isBeveled === true || params.bevelAngle !== undefined;
  }
  
  protected validateSpecific(
    feature: Feature, 
    element: PivotElement, 
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    
    // Vérifier l'angle de biseau
    if (params.bevelAngle !== undefined) {
      if (params.bevelAngle <= 0 || params.bevelAngle >= 90) {
        errors.push('Bevel angle must be between 0 and 90 degrees');
      }
    }
    
    // Vérifier la taille du biseau
    if (params.bevelSize !== undefined && params.bevelSize <= 0) {
      errors.push('Bevel size must be positive');
    }
    
    // Vérifier la profondeur
    if (!params.depth || params.depth <= 0) {
      errors.push('Beveled cut requires positive depth');
    }
  }
  
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters || {};
    const contourPoints = params.contourPoints || [];
    const depth = params.depth || 10;
    const bevelAngle = params.bevelAngle || 45;
    const bevelSize = params.bevelSize || 5;
    
    // Convertir et centrer les points
    const arrayPoints = pointsToArray(contourPoints as Point2D[]);
    const centeredPoints = this.centerContourPoints(arrayPoints, element);
    
    // Créer la forme
    const shape = this.createShape(centeredPoints);
    
    // Calculer les paramètres de biseau
    const bevelThickness = bevelSize * Math.cos(bevelAngle * Math.PI / 180);
    const bevelSegments = Math.max(2, Math.floor(bevelSize / 5));
    
    // Paramètres d'extrusion avec biseau
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: bevelThickness,
      bevelSize: bevelSize,
      bevelOffset: 0,
      bevelSegments: bevelSegments
    };
    
    // Créer la géométrie extrudée
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Orienter selon la face
    this.orientGeometry(geometry, params.face || feature.face || 'v', element);
    
    return geometry;
  }
  
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3 {
    const params = feature.parameters || {};
    const face = params.face || feature.face || 'v';
    const dims = element.dimensions;
    
    const position = new THREE.Vector3();
    
    // Ajuster la position en fonction du biseau
    const bevelOffset = (params.bevelSize || 0) / 2;
    
    // Mapper les codes DSTV vers ProfileFace si nécessaire
    const mappedFace = typeof face === 'string' && face.length === 1 
      ? mapDSTVFaceToProfileFace(face) 
      : face;
    
    switch (mappedFace) {
      case ProfileFace.WEB:
        position.z = 0;
        break;
        
      case ProfileFace.TOP_FLANGE:
        position.y = (dims.height || 0) / 2 - (dims.flangeThickness || 10) / 2 - bevelOffset;
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        position.y = -(dims.height || 0) / 2 + (dims.flangeThickness || 10) / 2 + bevelOffset;
        break;
    }
    
    return position;
  }
  
  /**
   * Oriente la géométrie selon la face
   */
  private orientGeometry(
    geometry: THREE.BufferGeometry, 
    face: string, 
    _element: PivotElement
  ): void {
    const rotationMatrix = new THREE.Matrix4();
    
    switch (face) {
      case 'v': // Face supérieure
        rotationMatrix.makeRotationX(-Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        break;
        
      case 'u': // Face inférieure
        rotationMatrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        break;
        
      case 'o': // Âme
        // Pas de rotation nécessaire
        break;
    }
  }
}