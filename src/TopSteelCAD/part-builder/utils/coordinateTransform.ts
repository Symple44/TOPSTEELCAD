/**
 * Module de transformation des coordonnées 2D (sur une face) vers 3D (globales)
 * Gère la conversion selon le type de profil et la face sélectionnée (DSTV)
 */

import { DSTVFace, HoleDSTV, PartElement } from '../types/partBuilder.types';

/**
 * Coordonnées 3D dans le repère global
 */
export interface GlobalCoordinates3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Information sur la face avec ses limites
 */
export interface FaceInfo {
  face: DSTVFace;
  width: number;   // Largeur de la face
  height: number;  // Hauteur de la face
  normal: [number, number, number]; // Vecteur normal
  uAxis: [number, number, number];  // Axe U local (largeur)
  vAxis: [number, number, number];  // Axe V local (hauteur)
}

/**
 * Transforme les coordonnées 2D d'une face en coordonnées 3D globales
 *
 * Convention DSTV :
 * - x : position longitudinale (le long de la pièce)
 * - y : position transversale (sur la face)
 * - face : orientation de perçage
 *
 * @param hole Trou avec coordonnées 2D
 * @param element Élément contenant le profil
 * @returns Coordonnées 3D dans le repère global
 */
export function transformHoleCoordinates(
  hole: HoleDSTV,
  element: PartElement
): GlobalCoordinates3D {
  const { face, x, y } = hole.coordinates;
  const dimensions = element.dimensions || {
    height: 200,
    width: 100,
    webThickness: 5.6,
    flangeThickness: 8.5
  };

  console.log('🔄 transformHoleCoordinates INPUT:', {
    holeId: hole.id,
    face,
    dstvX: x,
    dstvY: y,
    elementLength: element.length,
    dimensions
  });

  // Convention HoleProcessor :
  // X = largeur du profil (-width/2 à width/2)
  // Y = hauteur du profil (-height/2 à height/2)
  // Z = longueur de la pièce (0 à length)
  //
  // DSTV x = position longitudinale (le long de la pièce)
  // DSTV y = position transversale ou verticale selon la face

  let globalX = 0;  // Largeur
  let globalY = 0;  // Hauteur
  let globalZ = x;  // Longueur = DSTV x (position longitudinale)

  const profileType = element.profileType.toUpperCase();

  // Transformation selon le type de profil et la face
  // Les fonctions retournent (X, Y) dans le système HoleProcessor
  if (['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType)) {
    // Profils en I/H
    transformIPECoordinates(face, y, dimensions, (xPos, yPos) => {
      globalX = xPos;
      globalY = yPos;
    });
  } else if (['UPN', 'UAP', 'UPE'].includes(profileType)) {
    // Profils en U
    transformUCoordinates(face, y, dimensions, (xPos, yPos) => {
      globalX = xPos;
      globalY = yPos;
    });
  } else if (profileType === 'L' || profileType === 'CORNIERE') {
    // Cornières
    transformLCoordinates(face, y, dimensions, (xPos, yPos) => {
      globalX = xPos;
      globalY = yPos;
    });
  } else if (['RHS', 'SHS'].includes(profileType)) {
    // Tubes rectangulaires et carrés
    transformRectangularTubeCoordinates(face, y, dimensions, (xPos, yPos) => {
      globalX = xPos;
      globalY = yPos;
    });
  } else if (['TUBE_ROND', 'CHS'].includes(profileType)) {
    // Tubes ronds
    transformRoundTubeCoordinates(face, y, dimensions, (xPos, yPos) => {
      globalX = xPos;
      globalY = yPos;
    });
  } else {
    // Par défaut : profil simple
    globalX = 0;
    globalY = y;
  }

  const result = { x: globalX, y: globalY, z: globalZ };
  console.log('🔄 transformHoleCoordinates OUTPUT:', result);

  return result;
}

/**
 * Transformation pour profils IPE/HEA/HEB/HEM
 * Système HoleProcessor : X=largeur, Y=hauteur, Z=longueur
 */
function transformIPECoordinates(
  face: DSTVFace,
  y: number,
  dimensions: any,
  callback: (x: number, y: number) => void
): void {
  const height = dimensions.height || 200;
  const width = dimensions.width || 100;
  const webThickness = dimensions.webThickness || 5.6;

  switch (face) {
    case DSTVFace.TOP: // Semelle supérieure
      // DSTV y = position sur largeur semelle (0 à width)
      // X global = largeur (centré: y - width/2)
      // Y global = hauteur (en haut: height/2)
      callback(y - width / 2, height / 2);
      break;

    case DSTVFace.BOTTOM: // Semelle inférieure
      // DSTV y = position sur largeur semelle (0 à width)
      // X global = y - width/2
      // Y global = -height/2 (en bas)
      callback(y - width / 2, -height / 2);
      break;

    case DSTVFace.FRONT: // Âme (face avant)
      // DSTV y = position en hauteur (0 à height)
      // X global = 0 (au centre) ou proche
      // Y global = hauteur (centré: y - height/2)
      callback(0, y - height / 2);
      break;

    case DSTVFace.BACK: // Âme (face arrière)
      // DSTV y = position en hauteur (0 à height)
      // X global = 0
      // Y global = y - height/2
      callback(0, y - height / 2);
      break;

    default:
      callback(0, y);
  }
}

/**
 * Transformation pour profils UPN/UAP/UPE
 */
function transformUCoordinates(
  face: DSTVFace,
  y: number,
  dimensions: any,
  callback: (y: number, z: number) => void
): void {
  const height = dimensions.height || 200;
  const width = dimensions.width || 100;
  const webThickness = dimensions.webThickness || 5.6;

  switch (face) {
    case DSTVFace.TOP: // Aile supérieure
      callback(y - width / 2, height / 2);
      break;

    case DSTVFace.BOTTOM: // Aile inférieure
      callback(y - width / 2, -height / 2);
      break;

    case DSTVFace.FRONT: // Âme (intérieur du U)
      callback(webThickness / 2, y - height / 2);
      break;

    case DSTVFace.BACK: // Dos du U
      callback(-webThickness / 2, y - height / 2);
      break;

    default:
      callback(y, 0);
  }
}

/**
 * Transformation pour cornières (profils L)
 */
function transformLCoordinates(
  face: DSTVFace,
  y: number,
  dimensions: any,
  callback: (y: number, z: number) => void
): void {
  const height = dimensions.height || 100;
  const width = dimensions.width || 100;

  switch (face) {
    case DSTVFace.LEFT: // Aile verticale
      callback(-width / 2, y - height / 2);
      break;

    case DSTVFace.RIGHT: // Aile horizontale
      callback(y - width / 2, -height / 2);
      break;

    case DSTVFace.FRONT: // Face avant
      callback(y - width / 2, 0);
      break;

    case DSTVFace.BACK: // Face arrière
      callback(y - width / 2, 0);
      break;

    default:
      callback(y, 0);
  }
}

/**
 * Transformation pour tubes rectangulaires et carrés
 */
function transformRectangularTubeCoordinates(
  face: DSTVFace,
  y: number,
  dimensions: any,
  callback: (y: number, z: number) => void
): void {
  const height = dimensions.height || 100;
  const width = dimensions.width || 100;

  switch (face) {
    case DSTVFace.TOP:
      callback(y - width / 2, height / 2);
      break;

    case DSTVFace.BOTTOM:
      callback(y - width / 2, -height / 2);
      break;

    case DSTVFace.LEFT:
      callback(-width / 2, y - height / 2);
      break;

    case DSTVFace.RIGHT:
      callback(width / 2, y - height / 2);
      break;

    default:
      callback(y, 0);
  }
}

/**
 * Transformation pour tubes ronds
 */
function transformRoundTubeCoordinates(
  face: DSTVFace,
  y: number,
  dimensions: any,
  callback: (y: number, z: number) => void
): void {
  const diameter = dimensions.height || 100;
  const radius = diameter / 2;

  if (face === DSTVFace.RADIAL) {
    // y représente l'angle en degrés (0-360)
    const angleRad = (y * Math.PI) / 180;
    const yPos = radius * Math.cos(angleRad);
    const zPos = radius * Math.sin(angleRad);
    callback(yPos, zPos);
  } else {
    callback(y, 0);
  }
}

/**
 * Obtient les informations sur une face (dimensions et orientation)
 */
export function getFaceInfo(face: DSTVFace, element: PartElement): FaceInfo {
  const dimensions = element.dimensions || {
    height: 200,
    width: 100,
    webThickness: 5.6,
    flangeThickness: 8.5
  };

  const profileType = element.profileType.toUpperCase();
  const profileHeight = dimensions.height || 200;
  const profileWidth = dimensions.width || 100;
  const webThickness = dimensions.webThickness || 5.6;

  // Par défaut : largeur de face et hauteur de face (pas du profil!)
  let faceWidth = profileWidth;
  let faceDepth = element.length; // Profondeur = longueur de la pièce
  let normal: [number, number, number] = [0, 0, 1];
  let uAxis: [number, number, number] = [1, 0, 0];
  let vAxis: [number, number, number] = [0, 1, 0];

  if (['IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UAP', 'UPE'].includes(profileType)) {
    switch (face) {
      case DSTVFace.TOP:
      case DSTVFace.BOTTOM:
        // Semelle : x DSTV = le long de la pièce (0→length), y DSTV = sur la largeur (0→width)
        // faceWidth = plage de X = longueur de la pièce
        // faceDepth = plage de Y = largeur de la semelle
        faceWidth = element.length;
        faceDepth = profileWidth;
        normal = [0, 0, face === DSTVFace.TOP ? 1 : -1];
        uAxis = [1, 0, 0];  // x = le long de la pièce
        vAxis = [0, 1, 0];  // y = largeur de la semelle
        break;

      case DSTVFace.FRONT:
      case DSTVFace.BACK:
        // Âme : x DSTV = le long de la pièce (0→length), y DSTV = en hauteur (0→height)
        // faceWidth = plage de X = longueur de la pièce
        // faceDepth = plage de Y = hauteur du profil
        faceWidth = element.length;
        faceDepth = profileHeight;
        normal = [0, face === DSTVFace.FRONT ? 1 : -1, 0];
        uAxis = [1, 0, 0];  // x = le long de la pièce
        vAxis = [0, 0, 1];  // z = hauteur du profil
        break;
    }
  } else if (['RHS', 'SHS'].includes(profileType)) {
    switch (face) {
      case DSTVFace.TOP:
      case DSTVFace.BOTTOM:
        faceWidth = element.length;
        faceDepth = profileWidth;
        normal = [0, 0, face === DSTVFace.TOP ? 1 : -1];
        break;

      case DSTVFace.LEFT:
      case DSTVFace.RIGHT:
        faceWidth = element.length;
        faceDepth = profileHeight;
        normal = [0, face === DSTVFace.RIGHT ? 1 : -1, 0];
        break;
    }
  } else if (['TUBE_ROND', 'CHS'].includes(profileType)) {
    faceWidth = element.length;  // x = le long de la pièce
    faceDepth = 360;             // y = angle en degrés
  } else if (profileType === 'L' || profileType === 'CORNIERE') {
    switch (face) {
      case DSTVFace.LEFT:
        faceWidth = element.length;
        faceDepth = profileHeight;
        break;
      case DSTVFace.RIGHT:
        faceWidth = element.length;
        faceDepth = profileWidth;
        break;
      default:
        faceWidth = element.length;
        faceDepth = Math.max(profileHeight, profileWidth);
    }
  }

  return {
    face,
    width: faceWidth,
    height: faceDepth,
    normal,
    uAxis,
    vAxis
  };
}

/**
 * Valide qu'un trou est dans les limites de la face
 */
export function validateHolePosition(
  hole: HoleDSTV,
  element: PartElement
): { valid: boolean; error?: string } {
  const faceInfo = getFaceInfo(hole.coordinates.face, element);
  const { x, y } = hole.coordinates;

  // Vérifier la position longitudinale
  if (x < 0 || x > element.length) {
    return {
      valid: false,
      error: `Position X (${x}mm) hors limites. Doit être entre 0 et ${element.length}mm`
    };
  }

  // Vérifier la position transversale
  if (hole.coordinates.face === DSTVFace.RADIAL) {
    if (y < 0 || y > 360) {
      return {
        valid: false,
        error: `Angle (${y}°) hors limites. Doit être entre 0° et 360°`
      };
    }
  } else {
    if (y < 0 || y > faceInfo.height) {
      return {
        valid: false,
        error: `Position Y (${y}mm) hors limites. Doit être entre 0 et ${faceInfo.height}mm`
      };
    }
  }

  // Vérifier que le diamètre ne dépasse pas (longitudinal)
  const margin = hole.diameter / 2;
  if (x - margin < 0 || x + margin > element.length) {
    return {
      valid: false,
        error: `Le trou dépasse les limites longitudinales (diamètre ${hole.diameter}mm)`
    };
  }

  // Vérifier que le diamètre ne dépasse pas (transversal)
  if (hole.coordinates.face !== DSTVFace.RADIAL) {
    if (y - margin < 0 || y + margin > faceInfo.height) {
      return {
        valid: false,
        error: `Le trou dépasse les limites transversales (diamètre ${hole.diameter}mm)`
      };
    }
  }

  return { valid: true };
}
