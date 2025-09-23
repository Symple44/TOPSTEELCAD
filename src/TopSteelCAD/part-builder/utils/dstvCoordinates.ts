import { DSTVFace } from '../types/partBuilder.types';

/**
 * Utilitaire pour gérer les coordonnées DSTV
 * Chaque face a son propre système de coordonnées
 */

export interface FaceCoordinateSystem {
  face: DSTVFace;
  origin: { x: number; y: number; z: number };
  axes: {
    x: { label: string; direction: [number, number, number]; color: string };
    y: { label: string; direction: [number, number, number]; color: string };
    z: { label: string; direction: [number, number, number]; color: string };
  };
  description: string;
}

/**
 * Définition des systèmes de coordonnées pour chaque face selon DSTV
 */
export const FACE_COORDINATE_SYSTEMS: Record<DSTVFace, FaceCoordinateSystem> = {
  [DSTVFace.TOP]: {
    face: DSTVFace.TOP,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (Longueur)', direction: [1, 0, 0], color: '#ff0000' },
      y: { label: 'Y (Largeur)', direction: [0, 1, 0], color: '#00ff00' },
      z: { label: 'Z (↓ Profondeur)', direction: [0, 0, -1], color: '#0000ff' }
    },
    description: 'Face supérieure - Vue du dessus'
  },
  [DSTVFace.BOTTOM]: {
    face: DSTVFace.BOTTOM,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (Longueur)', direction: [1, 0, 0], color: '#ff0000' },
      y: { label: 'Y (Largeur)', direction: [0, -1, 0], color: '#00ff00' },
      z: { label: 'Z (↑ Profondeur)', direction: [0, 0, 1], color: '#0000ff' }
    },
    description: 'Face inférieure - Vue du dessous'
  },
  [DSTVFace.LEFT]: {
    face: DSTVFace.LEFT,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (Longueur)', direction: [1, 0, 0], color: '#ff0000' },
      y: { label: 'Y (↑ Hauteur)', direction: [0, 0, 1], color: '#00ff00' },
      z: { label: 'Z (→ Largeur)', direction: [0, 1, 0], color: '#0000ff' }
    },
    description: 'Face gauche - Vue de côté gauche'
  },
  [DSTVFace.RIGHT]: {
    face: DSTVFace.RIGHT,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (Longueur)', direction: [1, 0, 0], color: '#ff0000' },
      y: { label: 'Y (↑ Hauteur)', direction: [0, 0, 1], color: '#00ff00' },
      z: { label: 'Z (← Largeur)', direction: [0, -1, 0], color: '#0000ff' }
    },
    description: 'Face droite - Vue de côté droit'
  },
  [DSTVFace.FRONT]: {
    face: DSTVFace.FRONT,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (→ Largeur)', direction: [0, 1, 0], color: '#ff0000' },
      y: { label: 'Y (↑ Hauteur)', direction: [0, 0, 1], color: '#00ff00' },
      z: { label: 'Z (Profondeur)', direction: [-1, 0, 0], color: '#0000ff' }
    },
    description: 'Face avant - Vue de face'
  },
  [DSTVFace.BACK]: {
    face: DSTVFace.BACK,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (← Largeur)', direction: [0, -1, 0], color: '#ff0000' },
      y: { label: 'Y (↑ Hauteur)', direction: [0, 0, 1], color: '#00ff00' },
      z: { label: 'Z (Profondeur)', direction: [1, 0, 0], color: '#0000ff' }
    },
    description: 'Face arrière - Vue de dos'
  },
  [DSTVFace.RADIAL]: {
    face: DSTVFace.RADIAL,
    origin: { x: 0, y: 0, z: 0 },
    axes: {
      x: { label: 'X (Longueur)', direction: [1, 0, 0], color: '#ff0000' },
      y: { label: 'θ (Angle)', direction: [0, 1, 0], color: '#00ff00' },
      z: { label: 'R (Rayon)', direction: [0, 0, 1], color: '#0000ff' }
    },
    description: 'Position radiale - Coordonnées cylindriques'
  }
};

/**
 * Obtient les valeurs par défaut pour une position selon la face
 * Dans DSTV, chaque face a son propre système 2D avec origine au coin
 * Pour les profils I/H/L, l'origine est ajustée pour tenir compte des âmes et ailes
 */
export function getDefaultPositionForFace(
  face: DSTVFace,
  profileDimensions: {
    width: number;
    height: number;
    length: number;
    webThickness?: number;
    flangeThickness?: number;
    profileType?: string;
  }
): { x: number; y: number; z: number } {
  const { /* width, height, */ length, webThickness = 0, /* flangeThickness = 0, */ profileType } = profileDimensions;

  // Pour les profils I/H (IPE, HEA, HEB, HEM), ajuster la position Y sur les faces supérieures/inférieures
  const isIProfile = profileType && ['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType);
  // const isLProfile = profileType && profileType === 'L';

  switch (face) {
    case DSTVFace.TOP:
    case DSTVFace.BOTTOM:
      // Pour les faces supérieure et inférieure, l'origine est au centre de l'âme
      // X=0 est au début du profil, Y=0 est au centre de l'âme
      if (isIProfile && webThickness > 0) {
        // Position centrée, Y=0 au centre de l'âme
        return { x: length / 2, y: 0, z: 0 };
      }
      // Pour les autres profils, centre géométrique
      return { x: length / 2, y: 0, z: 0 };

    case DSTVFace.LEFT:
    case DSTVFace.RIGHT:
      // Pour les faces latérales, l'origine est au centre de l'âme
      // X=0 est au début du profil, Y=0 est au centre (milieu de la hauteur)
      return { x: length / 2, y: 0, z: 0 };

    case DSTVFace.FRONT:
      // Face avant: origine au centre
      return { x: 0, y: 0, z: 0 };

    case DSTVFace.BACK:
      // Face arrière: origine au centre
      return { x: 0, y: 0, z: 0 };

    default:
      return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Convertit les coordonnées d'une face vers le système global 3D
 * Prend en compte que les coordonnées locales sont dans le système 2D de la face (X,Y)
 * avec Z=0 par défaut (profondeur du trou)
 */
export function convertFaceToGlobalCoordinates(
  face: DSTVFace,
  localX: number,
  localY: number,
  localZ: number,
  profileDimensions: { width: number; height: number; length: number }
): { x: number; y: number; z: number } {
  const { width, height } = profileDimensions;

  switch (face) {
    case DSTVFace.TOP:
      // Face supérieure : X->X, Y->Y, surface à Z=height/2
      return {
        x: localX,
        y: localY - width / 2,  // Centrer en Y
        z: height / 2 - localZ   // Surface supérieure moins profondeur
      };

    case DSTVFace.BOTTOM:
      // Face inférieure : X->X, Y->-Y, surface à Z=-height/2
      return {
        x: localX,
        y: width / 2 - localY,   // Inversé et centré
        z: -height / 2 + localZ  // Surface inférieure plus profondeur
      };

    case DSTVFace.LEFT:
      // Face gauche : X->X, Y->Z, surface à Y=-width/2
      return {
        x: localX,
        y: -width / 2 + localZ,  // Surface gauche plus profondeur
        z: localY - height / 2   // Centrer en Z
      };

    case DSTVFace.RIGHT:
      // Face droite : X->X, Y->Z, surface à Y=width/2
      return {
        x: localX,
        y: width / 2 - localZ,   // Surface droite moins profondeur
        z: localY - height / 2   // Centrer en Z
      };

    case DSTVFace.FRONT:
      // Face avant : X->Y, Y->Z, surface à X=0
      return {
        x: 0 + localZ,           // Surface avant plus profondeur
        y: localX - width / 2,   // Centrer en Y
        z: localY - height / 2   // Centrer en Z
      };

    case DSTVFace.BACK:
      // Face arrière : X->-Y, Y->Z, surface à X=length
      return {
        x: profileDimensions.length - localZ, // Surface arrière moins profondeur
        y: width / 2 - localX,   // Inversé et centré
        z: localY - height / 2   // Centrer en Z
      };

    default:
      return { x: localX, y: localY, z: localZ };
  }
}

/**
 * Obtient les limites de position valides pour une face donnée
 * Retourne les limites dans le système de coordonnées 2D de la face
 * Avec origine au centre de l'âme pour les profils I/H
 */
export function getFaceBounds(
  face: DSTVFace,
  profileDimensions: {
    width: number;
    height: number;
    length: number;
    webThickness?: number;
    profileType?: string;
  }
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const { width, height, length, webThickness = width, profileType } = profileDimensions;

  // Pour les profils I/H, utiliser l'épaisseur de l'âme si disponible
  const isIProfile = profileType && ['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType);

  switch (face) {
    case DSTVFace.TOP:
    case DSTVFace.BOTTOM:
      // X le long de la longueur, Y centré sur l'âme
      if (isIProfile && webThickness > 0) {
        // Y=0 au centre de l'âme, limites de -largeur/2 à +largeur/2
        return {
          xMin: 0,
          xMax: length,
          yMin: -width / 2,
          yMax: width / 2
        };
      }
      return {
        xMin: 0,
        xMax: length,
        yMin: -width / 2,
        yMax: width / 2
      };

    case DSTVFace.LEFT:
    case DSTVFace.RIGHT:
      // X le long de la longueur, Y centré verticalement
      return {
        xMin: 0,
        xMax: length,
        yMin: -height / 2,
        yMax: height / 2
      };

    case DSTVFace.FRONT:
    case DSTVFace.BACK:
      // X et Y centrés
      return {
        xMin: -width / 2,
        xMax: width / 2,
        yMin: -height / 2,
        yMax: height / 2
      };

    default:
      return {
        xMin: 0,
        xMax: length,
        yMin: -Math.max(width, height) / 2,
        yMax: Math.max(width, height) / 2
      };
  }
}