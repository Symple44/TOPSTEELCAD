/**
 * DSTVCoordinateConverter - Service unifié de conversion de coordonnées DSTV
 *
 * Fait le pont entre:
 * - Le système existant DSTVCoordinateAdapter (plugins/dstv)
 * - Le nouveau DSTVTransformer (3DViewer/dstv)
 * - Les processeurs CSG et Hole
 */

import * as THREE from 'three';
import { DSTVCoordinateAdapter, DSTVContext } from '../../plugins/dstv/coordinates/DSTVCoordinateAdapter';
import { StandardPosition, StandardFace } from '../../core/coordinates/types';
import { DSTVFace, DSTVCoordinate, ProfileDimensions } from './DSTVTransformer';

/**
 * Mapping entre les faces DSTV et les faces standard
 */
const DSTV_TO_STANDARD_FACE: Record<DSTVFace | string, StandardFace> = {
  // Mapping par valeur enum (qui sont des strings)
  [DSTVFace.TOP]: StandardFace.TOP_FLANGE,      // 'o'
  [DSTVFace.BOTTOM]: StandardFace.BOTTOM_FLANGE,   // 'u'
  [DSTVFace.LEFT]: StandardFace.WEB,             // 'l'
  [DSTVFace.RIGHT]: StandardFace.WEB,             // 'r'
  [DSTVFace.FRONT]: StandardFace.FRONT,           // 'v'
  [DSTVFace.BACK]: StandardFace.BACK             // 'h'
};

/**
 * Service unifié de conversion de coordonnées DSTV
 */
export class DSTVCoordinateConverter {
  private adapter: DSTVCoordinateAdapter;
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.adapter = new DSTVCoordinateAdapter(debugMode);
  }

  /**
   * Convertit des coordonnées DSTV brutes en position 3D standard
   * Utilise le DSTVCoordinateAdapter existant pour la logique complexe
   */
  convertToStandard(
    dstvCoord: DSTVCoordinate,
    dimensions: ProfileDimensions,
    featureType?: string
  ): StandardPosition {
    // Préparer le contexte pour l'adaptateur existant
    const context: DSTVContext = {
      profileType: this.determineProfileType(dimensions.profileType),
      dimensions: {
        length: dimensions.length,
        height: dimensions.height,
        width: dimensions.width,
        webThickness: dimensions.webThickness,
        flangeThickness: dimensions.flangeThickness,
        thickness: dimensions.webThickness || dimensions.flangeThickness || 10
      },
      face: dstvCoord.face,
      position: {
        x: dstvCoord.x,
        y: dstvCoord.y,
        z: dstvCoord.z || 0
      }
    };

    // Utiliser l'adaptateur existant pour la conversion
    const standardPos = this.adapter.toStandardPosition(
      {
        x: dstvCoord.x,
        y: dstvCoord.y,
        z: dstvCoord.z || 0,
        featureType: featureType || 'hole'
      },
      context
    );

    if (this.debugMode) {
      console.log('🔄 DSTVCoordinateConverter:', {
        input: dstvCoord,
        context,
        output: standardPos
      });
    }

    return standardPos;
  }

  /**
   * Convertit des coordonnées DSTV en position 3D simple
   * Version simplifiée pour compatibilité avec DSTVTransformer
   */
  convertToVector3(
    dstvCoord: DSTVCoordinate,
    dimensions: ProfileDimensions
  ): THREE.Vector3 {
    const standardPos = this.convertToStandard(dstvCoord, dimensions);
    return standardPos.position.clone();
  }

  /**
   * Obtient la rotation nécessaire pour un trou selon la face
   */
  getHoleRotation(face: DSTVFace | string): THREE.Euler {
    // Utiliser la face standard pour déterminer la rotation
    const standardFace = DSTV_TO_STANDARD_FACE[face] || StandardFace.TOP_FLANGE;

    switch (standardFace) {
      case StandardFace.TOP_FLANGE:
      case StandardFace.BOTTOM_FLANGE:
        // Trou vertical (cylindre le long de Y)
        return new THREE.Euler(0, 0, 0);

      case StandardFace.WEB:
        // Trou horizontal (cylindre le long de X)
        // Déterminer si c'est gauche ou droite
        if (face === DSTVFace.LEFT || face === 'l') {
          return new THREE.Euler(0, 0, Math.PI / 2);
        } else if (face === DSTVFace.RIGHT || face === 'r') {
          return new THREE.Euler(0, 0, -Math.PI / 2);
        }
        return new THREE.Euler(0, 0, Math.PI / 2);

      case StandardFace.FRONT:
      case StandardFace.BACK:
        // Trou longitudinal (cylindre le long de Z)
        return new THREE.Euler(Math.PI / 2, 0, 0);

      default:
        return new THREE.Euler(0, 0, 0);
    }
  }

  /**
   * Obtient la normale de la face
   */
  getFaceNormal(face: DSTVFace | string): THREE.Vector3 {
    const standardFace = DSTV_TO_STANDARD_FACE[face] || StandardFace.TOP_FLANGE;

    switch (standardFace) {
      case StandardFace.TOP_FLANGE:
        return new THREE.Vector3(0, 1, 0);   // Vers le haut
      case StandardFace.BOTTOM_FLANGE:
        return new THREE.Vector3(0, -1, 0);  // Vers le bas
      case StandardFace.WEB:
        // Déterminer la direction selon le côté
        if (face === DSTVFace.LEFT || face === 'l') {
          return new THREE.Vector3(-1, 0, 0); // Vers la gauche
        } else if (face === DSTVFace.RIGHT || face === 'r') {
          return new THREE.Vector3(1, 0, 0);  // Vers la droite
        }
        return new THREE.Vector3(1, 0, 0);
      case StandardFace.FRONT:
        return new THREE.Vector3(0, 0, -1);  // Vers l'avant
      case StandardFace.BACK:
        return new THREE.Vector3(0, 0, 1);   // Vers l'arrière
      default:
        return new THREE.Vector3(0, 1, 0);
    }
  }

  /**
   * Détermine le type de profil pour l'adaptateur
   */
  private determineProfileType(profileType?: string): string {
    if (!profileType) return 'UNKNOWN';

    const type = profileType.toUpperCase();

    // Profils en I
    if (type.includes('IPE') || type.includes('HE') || type.includes('HEB') || type.includes('HEA') || type.includes('HEM')) {
      return 'I_PROFILE';
    }

    // Profils en U
    if (type.includes('UPN') || type.includes('UAP') || type.includes('UPE')) {
      return 'U_PROFILE';
    }

    // Profils en L
    if (type.startsWith('L')) {
      return 'L_PROFILE';
    }

    // Plaques
    if (type.includes('PLATE') || type.includes('PLAT')) {
      return 'PLATE';
    }

    // Tubes
    if (type.includes('TUBE') || type.includes('ROND') || type.includes('CARRE') || type.includes('RECT')) {
      return 'TUBE';
    }

    return type;
  }

  /**
   * Valide une coordonnée DSTV
   */
  validateCoordinate(
    coord: DSTVCoordinate,
    dimensions: ProfileDimensions
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifier les limites selon la face
    const bounds = this.getFaceBounds(coord.face, dimensions);

    if (coord.x < bounds.xMin || coord.x > bounds.xMax) {
      errors.push(`X hors limites: ${coord.x} (${bounds.xMin}-${bounds.xMax})`);
    }

    if (coord.y < bounds.yMin || coord.y > bounds.yMax) {
      errors.push(`Y hors limites: ${coord.y} (${bounds.yMin}-${bounds.yMax})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtient les limites pour une face donnée
   */
  private getFaceBounds(
    face: DSTVFace | string,
    dimensions: ProfileDimensions
  ): { xMin: number; xMax: number; yMin: number; yMax: number } {
    const { length, height, width } = dimensions;

    switch (face) {
      case DSTVFace.TOP:
      case DSTVFace.BOTTOM:
      case 'o':
      case 'u':
        // Faces horizontales: X = longueur, Y = largeur
        return {
          xMin: 0,
          xMax: length,
          yMin: 0,
          yMax: width
        };

      case DSTVFace.LEFT:
      case DSTVFace.RIGHT:
      case 'l':
      case 'r':
      case 'v':
        // Faces verticales (âme): X = longueur, Y = hauteur
        return {
          xMin: 0,
          xMax: length,
          yMin: 0,
          yMax: height
        };

      case DSTVFace.FRONT:
      case DSTVFace.BACK:
      case 'h':
        // Faces avant/arrière: X = largeur, Y = hauteur
        return {
          xMin: 0,
          xMax: width,
          yMin: 0,
          yMax: height
        };

      default:
        return {
          xMin: 0,
          xMax: length,
          yMin: 0,
          yMax: Math.max(width, height)
        };
    }
  }

  /**
   * Convertit une position 3D standard en coordonnées DSTV
   * (Transformation inverse pour export)
   */
  convertToDSTV(
    position: THREE.Vector3,
    face: StandardFace,
    dimensions: ProfileDimensions
  ): DSTVCoordinate {
    const context: DSTVContext = {
      profileType: this.determineProfileType(dimensions.profileType),
      dimensions: {
        length: dimensions.length,
        height: dimensions.height,
        width: dimensions.width,
        webThickness: dimensions.webThickness,
        flangeThickness: dimensions.flangeThickness
      }
    };

    const standardPos: StandardPosition = {
      position,
      face,
      metadata: {
        original: { x: position.x, y: position.y, z: position.z },
        transformations: [],
        source: 'manual'
      }
    };

    // Utiliser l'adaptateur pour la conversion inverse
    const dstvPos = this.adapter.fromStandardPosition(standardPos, context);

    // Déterminer la face DSTV
    let dstvFace: DSTVFace = DSTVFace.TOP;
    for (const [key, value] of Object.entries(DSTV_TO_STANDARD_FACE)) {
      if (value === face) {
        dstvFace = key as DSTVFace;
        break;
      }
    }

    return {
      face: dstvFace,
      x: dstvPos.x,
      y: dstvPos.y,
      z: dstvPos.z
    };
  }

  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.adapter.setDebugMode(enabled);
  }
}

export default DSTVCoordinateConverter;