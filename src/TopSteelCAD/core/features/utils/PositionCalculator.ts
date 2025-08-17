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
    featurePosition: THREE.Vector3 | number[],
    face?: ProfileFace | string
  ): Position3D {
    // Convertir en Vector3 si nécessaire
    const featurePos = Array.isArray(featurePosition)
      ? new THREE.Vector3(featurePosition[0], featurePosition[1], featurePosition[2] || 0)
      : featurePosition;
    
    const profileType = this.getProfileType(element);
    
    // Convertir la face string en ProfileFace si nécessaire
    let actualFace: ProfileFace;
    if (typeof face === 'string') {
      actualFace = this.convertFaceString(face, profileType);
    } else {
      actualFace = face || this.determineFace(element, featurePos, profileType);
    }
    
    // Obtenir les dimensions de l'élément
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 100;
    const width = dims.width || 100;
    const thickness = dims.thickness || 10;
    
    // Position de base (coordonnées locales)
    let localX = featurePos.x;
    let localY = featurePos.y;
    let localZ = featurePos.z;
    
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
        const plateResult = this.calculatePlatePosition(
          element, localX, localY, localZ, actualFace
        );
        position = plateResult.position;
        rotation = plateResult.rotation;
        depth = plateResult.depth;
        normal = plateResult.normal;
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
   * Convertit une face string en ProfileFace
   */
  private convertFaceString(face: string, profileType: ProfileGeometryType): ProfileFace {
    const faceLower = face.toLowerCase();
    
    // Pour les profils en I (IPE, HEB, etc.)
    if (profileType === ProfileGeometryType.I_PROFILE || profileType === ProfileGeometryType.H_PROFILE) {
      switch(faceLower) {
        case 'top':
        case 'v':
          return ProfileFace.TOP_FLANGE;
        case 'bottom':
        case 'u':
          return ProfileFace.BOTTOM_FLANGE;
        case 'web':
        case 'o':
          return ProfileFace.WEB;
        default:
          return ProfileFace.TOP_FLANGE;
      }
    }
    
    // Pour les plaques
    if (profileType === ProfileGeometryType.PLATE) {
      switch(faceLower) {
        case 'top':
        case 'v':
          return ProfileFace.TOP;
        case 'bottom':
        case 'u':
          return ProfileFace.BOTTOM;
        default:
          return ProfileFace.TOP;
      }
    }
    
    // Pour les tubes
    if (profileType === ProfileGeometryType.TUBE_RECT || profileType === ProfileGeometryType.TUBE_SQUARE) {
      switch(faceLower) {
        case 'top':
        case 'v':
          return ProfileFace.TOP;
        case 'bottom':
        case 'u':
          return ProfileFace.BOTTOM;
        case 'left':
          return ProfileFace.LEFT;
        case 'right':
          return ProfileFace.RIGHT;
        default:
          return ProfileFace.TOP;
      }
    }
    
    // Par défaut
    switch(faceLower) {
      case 'top':
      case 'v':
        return ProfileFace.TOP;
      case 'bottom':
      case 'u':
        return ProfileFace.BOTTOM;
      case 'web':
      case 'o':
        return ProfileFace.WEB;
      default:
        return ProfileFace.TOP;
    }
  }
  
  /**
   * Détermine le type de profil
   */
  private getProfileType(element: PivotElement): ProfileGeometryType {
    const profile = element.metadata?.profile || element.partNumber || '';
    const materialType = element.materialType;
    
    // Profils en I/H (européens et britanniques)
    if (/^(IPE|IPN|HEA|HEB|HEM|HD|HP|W\d|UB|UC|UBP)/i.test(profile)) {
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
    const webThickness = element.metadata?.webThickness || dims.webThickness || 7;
    const flangeThickness = element.metadata?.flangeThickness || dims.flangeThickness || 11;
    
    console.log(`📏 Profile dimensions: L=${length}, H=${height}, W=${width}, webT=${webThickness}, flangeT=${flangeThickness}`);
    
    let position: [number, number, number];
    let rotation: [number, number, number];
    let depth: number;
    let normal: THREE.Vector3;
    
    switch (face) {
      case ProfileFace.WEB:
        // Trou dans l'âme - perpendiculaire à l'âme (horizontal)
        // L'âme est verticale (dans le plan XY), les trous la traversent selon Z
        // DSTV : x = position le long de la poutre (0 à length)
        // DSTV : y = hauteur sur l'âme (0 = bas, height = haut)
        // Three.js : X=length, Y=height, Z=width
        const webX = x - length / 2;  // Position le long de la poutre (centrée)
        const webY = y - height / 2;  // Hauteur sur l'âme (centrée)
        const webZ = 0;               // Centré sur l'âme
        
        position = [webX, webY, webZ];
        // Le cylindre par défaut est orienté selon Y (vertical)
        // Pour traverser l'âme selon Z, on doit le tourner de 90° autour de X
        rotation = [Math.PI / 2, 0, 0]; // Rotation de 90° autour de X pour orienter selon Z
        depth = webThickness;
        normal = new THREE.Vector3(0, 0, 1);
        console.log(`🔩 Web hole: DSTV(${x}, ${y}) -> Three.js(${webX}, ${webY}, ${webZ})`);
        console.log(`   📐 Dimensions: L=${length}, H=${height}, webT=${webThickness}`);
        console.log(`   🔄 Rotation: [${rotation[0]}, ${rotation[1]}, ${rotation[2]}] (90° around X)`);
        break;
        
      case ProfileFace.TOP_FLANGE:
        // Trou dans l'aile supérieure - vertical
        position = [
          x - length / 2,                    // Position le long de la poutre
          height / 2 - flangeThickness / 2,  // Hauteur de l'aile supérieure
          y - width / 2                      // Position latérale sur l'aile (centrée)
        ];
        rotation = [0, 0, 0]; // Pas de rotation - cylindre déjà vertical (selon Y)
        depth = flangeThickness;
        normal = new THREE.Vector3(0, 1, 0);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        // Trou dans l'aile inférieure - vertical
        // DSTV : x = position le long de la poutre (0 à length)
        // DSTV : y = position latérale sur l'aile (0 à width)
        // Three.js : X=length, Y=height, Z=width (orientation corrigée)
        const xPos = x - length / 2;                      // Position le long de la poutre (centrée)
        const yPos = -height / 2 + flangeThickness / 2;   // Centre de l'aile inférieure
        const zPos = y - width / 2;                       // Position latérale (centrée)
        
        position = [xPos, yPos, zPos];
        rotation = [0, 0, 0]; // Pas de rotation - cylindre déjà vertical (selon Y)
        depth = flangeThickness;
        normal = new THREE.Vector3(0, -1, 0);
        console.log(`🔩 Bottom flange hole: DSTV(${x}, ${y}) -> Three.js(${xPos}, ${yPos}, ${zPos})`);
        console.log(`   📐 Dimensions: L=${length}, H=${height}, W=${width}, flangeT=${flangeThickness}`);
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
    
    // Pour les plaques DSTV, les coordonnées x et y sont données depuis le coin (0,0)
    // Three.js utilise le centre comme origine, donc on doit transformer
    // DSTV: (0,0) est au coin inférieur gauche
    // Three.js: (0,0) est au centre
    // Position du centre du trou
    // Le trou doit être centré sur la face, donc on place son centre au niveau de la surface
    const position: [number, number, number] = [
      x - length / 2,  // Transformer de [0, length] vers [-length/2, length/2]
      0,               // Centre du trou au milieu de l'épaisseur pour traverser complètement
      y - width / 2    // Transformer de [0, width] vers [-width/2, width/2]
    ];
    
    // Pour une plaque horizontale, le trou doit être vertical (aligné sur Y)
    // Pas de rotation nécessaire car le cylindre est déjà orienté selon Y
    const rotation: [number, number, number] = [0, 0, 0];
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