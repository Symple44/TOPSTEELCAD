/**
 * CompoundCutStrategy - Stratégie pour découpes composées
 * Gère les découpes complexes avec multiples contours ou opérations combinées
 */

import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace, Point2D, pointsToArray, mapDSTVFaceToProfileFace } from '../../types';
import { BaseCutStrategy } from './CutStrategy';

/**
 * Stratégie pour découpes composées
 */
export class CompoundCutStrategy extends BaseCutStrategy {
  readonly name = 'CompoundCut';
  
  canHandle(feature: Feature): boolean {
    const params = feature.parameters || {};
    return params.isCompound === true || 
           (params.subContours !== undefined && params.subContours.length > 0);
  }
  
  protected validateSpecific(
    feature: Feature, 
    element: PivotElement, 
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    
    // Vérifier les sous-contours
    if (params.subContours) {
      if (!Array.isArray(params.subContours)) {
        errors.push('Sub-contours must be an array');
      } else {
        params.subContours.forEach((contour: any, index: number) => {
          if (!Array.isArray(contour) || contour.length < 3) {
            errors.push(`Sub-contour ${index} must have at least 3 points`);
          }
        });
      }
    }
    
    // Vérifier l'opération
    if (params.operation && !['union', 'subtract', 'intersect'].includes(params.operation)) {
      errors.push('Invalid compound operation');
    }
  }
  
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters || {};
    const mainContour = params.contourPoints || [];
    const subContours = params.subContours || [];
    const operation = params.operation || 'subtract';
    const depth = params.depth || 10;
    
    // Convertir et créer la géométrie principale
    const mainArrayPoints = pointsToArray(mainContour as Point2D[]);
    const mainGeometry = this.createContourGeometry(mainArrayPoints, depth, element);
    
    if (subContours.length === 0) {
      return mainGeometry;
    }
    
    // Créer les géométries secondaires et combiner
    let resultCSG = CSG.fromGeometry(mainGeometry);
    
    for (const subContour of subContours) {
      const subArrayPoints = pointsToArray(subContour as Point2D[]);
      const subGeometry = this.createContourGeometry(subArrayPoints, depth, element);
      const subCSG = CSG.fromGeometry(subGeometry);
      
      // Appliquer l'opération
      switch (operation) {
        case 'union':
          resultCSG = resultCSG.union(subCSG);
          break;
        case 'intersect':
          resultCSG = resultCSG.intersect(subCSG);
          break;
        case 'subtract':
        default:
          resultCSG = resultCSG.subtract(subCSG);
          break;
      }
      
      // Nettoyer
      subGeometry.dispose();
    }
    
    // Convertir en géométrie
    const resultGeometry = CSG.toGeometry(resultCSG, new THREE.Matrix4());
    
    // Nettoyer
    mainGeometry.dispose();
    
    // Orienter selon la face
    this.orientGeometry(resultGeometry, params.face || feature.face || 'v', element);
    
    return resultGeometry;
  }
  
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3 {
    const params = feature.parameters || {};
    const face = params.face || feature.face || 'v';
    const dims = element.dimensions;
    
    const position = new THREE.Vector3();
    
    // Position basée sur le centre de masse des contours
    const mainPoints = params.contourPoints || [];
    const subPoints = (params.subContours || []).flat();
    const allPointObjects = [...mainPoints, ...subPoints] as Point2D[];
    const allPoints = pointsToArray(allPointObjects);
    
    if (allPoints.length > 0) {
      const centerX = allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length;
      const centerY = allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length;
      
      position.x = centerX - dims.length / 2;
      
      // Mapper les codes DSTV vers ProfileFace si nécessaire
      const mappedFace = typeof face === 'string' && face.length === 1 
        ? mapDSTVFaceToProfileFace(face) 
        : face;
      
      switch (mappedFace) {
        case 'v': // Face supérieure
        case ProfileFace.TOP_FLANGE:
          position.y = (dims.height || 0) / 2 - (dims.flangeThickness || 10) / 2;
          break;
          
        case ProfileFace.BOTTOM_FLANGE:
          position.y = -(dims.height || 0) / 2 + (dims.flangeThickness || 10) / 2;
          break;
          
        case ProfileFace.WEB:
        default:
          // Use the web positioning logic
          position.y = centerY - (dims.height || dims.width || 100) / 2;
          break;
      }
    }
    
    return position;
  }
  
  /**
   * Crée une géométrie à partir d'un contour
   */
  private createContourGeometry(
    contourPoints: Array<[number, number]>,
    depth: number,
    element: PivotElement
  ): THREE.BufferGeometry {
    const centeredPoints = this.centerContourPoints(contourPoints, element);
    const shape = this.createShape(centeredPoints);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
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
        geometry.translate(0, -10, 0); // Ajuster pour la profondeur
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