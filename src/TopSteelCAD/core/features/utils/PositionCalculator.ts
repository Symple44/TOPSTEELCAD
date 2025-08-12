/**
 * Calculateur de positions 3D pour les features
 * Gère la conversion des coordonnées DSTV vers des positions 3D réelles
 */

import * as THREE from 'three';
import { PivotElement, MaterialType } from '@/types/viewer';
import { ProfileFace, Position3D } from '../types';

export enum ProfileGeometryType {
  I_PROFILE = 'I_PROFILE',
  H_PROFILE = 'H_PROFILE',
  TUBE_RECT = 'TUBE_RECT',
  TUBE_SQUARE = 'TUBE_SQUARE',
  TUBE_ROUND = 'TUBE_ROUND',
  L_PROFILE = 'L_PROFILE',
  U_PROFILE = 'U_PROFILE',
  PLATE = 'PLATE',
  FLAT_BAR = 'FLAT_BAR',
  ROUND_BAR = 'ROUND_BAR',
  UNKNOWN = 'UNKNOWN'
}

export class PositionCalculator {
  
  /**
   * Calcule la position 3D d'une feature
   */
  calculateFeaturePosition(
    element: PivotElement,
    featurePosition: THREE.Vector3,
    face?: ProfileFace
  ): Position3D {
    const profileType = this.getProfileType(element);
    const actualFace = face || this.determineFace(element, featurePosition, profileType);
    
    // Obtenir les dimensions de l'élément
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 100;
    const width = dims.width || 100;
    const thickness = dims.thickness || 10;
    
    // Position de base (coordonnées locales)
    let localX = featurePosition.x;
    let localY = featurePosition.y;
    let localZ = featurePosition.z;
    
    // Position 3D finale et rotation
    let position: [number, number, number] = [0, 0, 0];
    let rotation: [number, number, number] = [0, 0, 0];
    let depth = thickness;
    let normal = new THREE.Vector3(0, 1, 0);
    
    switch (profileType) {
      case ProfileGeometryType.I_PROFILE:
      case ProfileGeometryType.H_PROFILE:
        const result = this.calculateIProfilePosition(
          element, localX, localY, localZ, actualFace
        );
        position = result.position;
        rotation = result.rotation;
        depth = result.depth;
        normal = result.normal;
        break;
        
      case ProfileGeometryType.PLATE:
        position = this.calculatePlatePosition(
          element, localX, localY, localZ, actualFace
        ).position;
        rotation = [Math.PI / 2, 0, 0]; // Trous perpendiculaires à la plaque
        depth = thickness;
        normal = new THREE.Vector3(0, 1, 0);
        break;
        
      case ProfileGeometryType.TUBE_RECT:
      case ProfileGeometryType.TUBE_SQUARE:
        const tubeResult = this.calculateTubePosition(
          element, localX, localY, localZ, actualFace
        );
        position = tubeResult.position;
        rotation = tubeResult.rotation;
        depth = tubeResult.depth;
        normal = tubeResult.normal;
        break;
        
      case ProfileGeometryType.L_PROFILE:
        const lResult = this.calculateLProfilePosition(
          element, localX, localY, localZ, actualFace
        );
        position = lResult.position;
        rotation = lResult.rotation;
        depth = lResult.depth;
        normal = lResult.normal;
        break;
        
      default:
        // Position par défaut
        position = [localX, localY, localZ];
        rotation = [0, 0, 0];
        depth = thickness;
    }
    
    return {
      position,
      rotation,
      face: actualFace,
      depth,
      normal
    };
  }
  
  /**
   * Détermine le type de profil
   */
  private getProfileType(element: PivotElement): ProfileGeometryType {
    const profile = element.metadata?.profile || element.partNumber || '';
    const materialType = element.materialType;
    
    // Profils en I/H
    if (/^(IPE|IPN|HEA|HEB|HEM|HD|HP|W\d)/i.test(profile)) {
      return ProfileGeometryType.I_PROFILE;
    }
    
    // Profils en U
    if (/^(UPN|UAP|UPE|C\d)/i.test(profile)) {
      return ProfileGeometryType.U_PROFILE;
    }
    
    // Cornières
    if (/^L\d/i.test(profile)) {
      return ProfileGeometryType.L_PROFILE;
    }
    
    // Tubes
    if (/^(RHS|SHS|CHS|ROR)/i.test(profile) || materialType === MaterialType.TUBE) {
      if (/^(CHS|ROR)/i.test(profile)) return ProfileGeometryType.TUBE_ROUND;
      if (/^SHS/i.test(profile)) return ProfileGeometryType.TUBE_SQUARE;
      return ProfileGeometryType.TUBE_RECT;
    }
    
    // Plaques
    if (materialType === MaterialType.PLATE || materialType === MaterialType.SHEET) {
      return ProfileGeometryType.PLATE;
    }
    
    // Barres
    if (materialType === MaterialType.BAR) {
      if (/^RO/i.test(profile)) return ProfileGeometryType.ROUND_BAR;
      return ProfileGeometryType.FLAT_BAR;
    }
    
    // Par défaut pour les poutres
    if (materialType === MaterialType.BEAM) {
      return ProfileGeometryType.I_PROFILE;
    }
    
    return ProfileGeometryType.UNKNOWN;
  }
  
  /**
   * Détermine la face selon les coordonnées
   */
  private determineFace(
    element: PivotElement,
    position: THREE.Vector3,
    profileType: ProfileGeometryType
  ): ProfileFace {
    const z = position.z;
    const y = position.y;
    
    switch (profileType) {
      case ProfileGeometryType.I_PROFILE:
      case ProfileGeometryType.H_PROFILE:
        // Utiliser la coordonnée Z pour déterminer la face
        if (Math.abs(z) < 1) return ProfileFace.WEB;
        if (z > 0) return ProfileFace.TOP_FLANGE;
        return ProfileFace.BOTTOM_FLANGE;
        
      case ProfileGeometryType.PLATE:
        return z >= 0 ? ProfileFace.TOP : ProfileFace.BOTTOM;
        
      case ProfileGeometryType.TUBE_RECT:
      case ProfileGeometryType.TUBE_SQUARE:
        // Déterminer la face selon la position relative
        const absY = Math.abs(y);
        const absZ = Math.abs(z);
        
        if (absY > absZ) {
          return y > 0 ? ProfileFace.TOP : ProfileFace.BOTTOM;
        } else {
          return z > 0 ? ProfileFace.RIGHT : ProfileFace.LEFT;
        }
        
      default:
        return ProfileFace.TOP;
    }
  }
  
  /**
   * Calcule la position pour un profil en I
   */
  private calculateIProfilePosition(
    element: PivotElement,
    x: number,
    y: number,
    z: number,
    face: ProfileFace
  ): Position3D {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 300;
    const width = dims.width || 150;
    const webThickness = element.metadata?.webThickness || 7;
    const flangeThickness = element.metadata?.flangeThickness || 11;
    
    let position: [number, number, number];
    let rotation: [number, number, number];
    let depth: number;
    let normal: THREE.Vector3;
    
    switch (face) {
      case ProfileFace.WEB:
        // Trou dans l'âme - perpendiculaire à l'âme (horizontal)
        position = [
          x - length / 2,  // Position le long de la poutre
          y,               // Hauteur sur l'âme
          0                // Centré sur l'âme
        ];
        rotation = [0, 0, Math.PI / 2]; // Rotation pour traverser l'âme horizontalement
        depth = webThickness;
        normal = new THREE.Vector3(0, 0, 1);
        break;
        
      case ProfileFace.TOP_FLANGE:
        // Trou dans l'aile supérieure - vertical
        position = [
          x - length / 2,                    // Position le long de la poutre
          height / 2 - flangeThickness / 2,  // Hauteur de l'aile supérieure
          y                                  // Position latérale sur l'aile
        ];
        rotation = [Math.PI / 2, 0, 0]; // Rotation pour traverser verticalement
        depth = flangeThickness;
        normal = new THREE.Vector3(0, 1, 0);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        // Trou dans l'aile inférieure - vertical
        position = [
          x - length / 2,                      // Position le long de la poutre
          -height / 2 + flangeThickness / 2,  // Hauteur de l'aile inférieure
          y                                    // Position latérale sur l'aile
        ];
        rotation = [Math.PI / 2, 0, 0]; // Rotation pour traverser verticalement
        depth = flangeThickness;
        normal = new THREE.Vector3(0, -1, 0);
        break;
        
      default:
        position = [x - length / 2, y, z];
        rotation = [0, 0, 0];
        depth = webThickness;
        normal = new THREE.Vector3(0, 1, 0);
    }
    
    return { position, rotation, face, depth, normal };
  }
  
  /**
   * Calcule la position pour une plaque
   */
  private calculatePlatePosition(
    element: PivotElement,
    x: number,
    y: number,
    z: number,
    face: ProfileFace
  ): Position3D {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const width = dims.width || 1000;
    const thickness = dims.thickness || 10;
    
    // Pour les plaques, x et y sont les coordonnées sur la surface
    // z détermine la face (top/bottom)
    const position: [number, number, number] = [
      x - length / 2,
      face === ProfileFace.TOP ? thickness / 2 : -thickness / 2,
      y - width / 2
    ];
    
    const rotation: [number, number, number] = [Math.PI / 2, 0, 0];
    const normal = face === ProfileFace.TOP 
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, -1, 0);
    
    return {
      position,
      rotation,
      face,
      depth: thickness,
      normal
    };
  }
  
  /**
   * Calcule la position pour un tube rectangulaire/carré
   */
  private calculateTubePosition(
    element: PivotElement,
    x: number,
    y: number,
    z: number,
    face: ProfileFace
  ): Position3D {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 100;
    const width = dims.width || 100;
    const wallThickness = element.metadata?.wallThickness || dims.thickness || 5;
    
    let position: [number, number, number];
    let rotation: [number, number, number];
    let normal: THREE.Vector3;
    
    switch (face) {
      case ProfileFace.TOP:
        position = [x - length / 2, height / 2, y];
        rotation = [Math.PI / 2, 0, 0];
        normal = new THREE.Vector3(0, 1, 0);
        break;
        
      case ProfileFace.BOTTOM:
        position = [x - length / 2, -height / 2, y];
        rotation = [Math.PI / 2, 0, 0];
        normal = new THREE.Vector3(0, -1, 0);
        break;
        
      case ProfileFace.LEFT:
        position = [x - length / 2, y, -width / 2];
        rotation = [0, 0, Math.PI / 2];
        normal = new THREE.Vector3(-1, 0, 0);
        break;
        
      case ProfileFace.RIGHT:
        position = [x - length / 2, y, width / 2];
        rotation = [0, 0, Math.PI / 2];
        normal = new THREE.Vector3(1, 0, 0);
        break;
        
      default:
        position = [x - length / 2, y, z];
        rotation = [0, 0, 0];
        normal = new THREE.Vector3(0, 1, 0);
    }
    
    return {
      position,
      rotation,
      face,
      depth: wallThickness,
      normal
    };
  }
  
  /**
   * Calcule la position pour une cornière
   */
  private calculateLProfilePosition(
    element: PivotElement,
    x: number,
    y: number,
    z: number,
    face: ProfileFace
  ): Position3D {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 100;
    const width = dims.width || 100;
    const thickness = dims.thickness || 10;
    
    let position: [number, number, number];
    let rotation: [number, number, number];
    let normal: THREE.Vector3;
    
    switch (face) {
      case ProfileFace.LEFT_LEG:
        // Jambe verticale
        position = [x - length / 2, y, -width / 2 + thickness / 2];
        rotation = [0, 0, Math.PI / 2];
        normal = new THREE.Vector3(-1, 0, 0);
        break;
        
      case ProfileFace.RIGHT_LEG:
        // Jambe horizontale
        position = [x - length / 2, -height / 2 + thickness / 2, y];
        rotation = [Math.PI / 2, 0, 0];
        normal = new THREE.Vector3(0, -1, 0);
        break;
        
      default:
        position = [x - length / 2, y, z];
        rotation = [0, 0, 0];
        normal = new THREE.Vector3(0, 1, 0);
    }
    
    return {
      position,
      rotation,
      face,
      depth: thickness,
      normal
    };
  }
}