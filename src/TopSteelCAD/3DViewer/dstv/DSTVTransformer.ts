/**
 * DSTVTransformer - Transforme les coordonnées DSTV en coordonnées 3D globales
 *
 * Système DSTV:
 * - Origine (0,0) au centre de l'âme pour toutes les faces
 * - Chaque face a son propre système de coordonnées 2D
 * - Les coordonnées sont transformées selon la face active
 */

import * as THREE from 'three';

export enum DSTVFace {
  TOP = 'o',      // Face supérieure
  BOTTOM = 'u',   // Face inférieure
  LEFT = 'l',     // Face gauche
  RIGHT = 'r',    // Face droite
  FRONT = 'v',    // Face avant
  BACK = 'h'      // Face arrière
}

export interface DSTVCoordinate {
  face: DSTVFace;
  x: number;  // Position le long de l'axe principal (longueur pour la plupart des faces)
  y: number;  // Position sur l'axe secondaire (varie selon la face)
  z?: number; // Profondeur (optionnel, pour trous non traversants)
}

export interface ProfileDimensions {
  length: number;
  height: number;
  width: number;
  webThickness?: number;
  flangeThickness?: number;
  profileType?: string;
}

export class DSTVTransformer {
  public readonly dimensions: ProfileDimensions;

  constructor(dimensions: ProfileDimensions) {
    this.dimensions = dimensions;
  }

  /**
   * Transforme une coordonnée DSTV en position 3D globale
   */
  transform(coord: DSTVCoordinate): THREE.Vector3 {
    const { face, x, y, z = 0 } = coord;
    const { length, height, width } = this.dimensions;

    // Position le long du profil (commune à la plupart des faces)
    const longitudinalPos = x - length / 2; // Centrer sur l'origine

    switch (face) {
      case DSTVFace.TOP:
        // Face supérieure: X=longueur, Y=largeur (centré sur l'âme)
        return new THREE.Vector3(
          y,                    // Y DSTV → X Three.js (position latérale)
          height / 2 - z,       // Surface supérieure - profondeur
          longitudinalPos       // X DSTV → Z Three.js (position longitudinale)
        );

      case DSTVFace.BOTTOM:
        // Face inférieure: X=longueur, Y=largeur (centré sur l'âme)
        return new THREE.Vector3(
          y,                    // Y DSTV → X Three.js
          -height / 2 + z,      // Surface inférieure + profondeur
          longitudinalPos       // X DSTV → Z Three.js
        );

      case DSTVFace.LEFT:
        // Face gauche: X=longueur, Y=hauteur
        return new THREE.Vector3(
          -width / 2 + z,       // Surface gauche + profondeur
          y,                    // Y DSTV → Y Three.js (position verticale)
          longitudinalPos       // X DSTV → Z Three.js
        );

      case DSTVFace.RIGHT:
        // Face droite: X=longueur, Y=hauteur
        return new THREE.Vector3(
          width / 2 - z,        // Surface droite - profondeur
          y,                    // Y DSTV → Y Three.js
          longitudinalPos       // X DSTV → Z Three.js
        );

      case DSTVFace.FRONT:
        // Face avant: X=largeur, Y=hauteur
        return new THREE.Vector3(
          x,                    // X DSTV → X Three.js (position latérale)
          y,                    // Y DSTV → Y Three.js (position verticale)
          -length / 2 + z       // Début du profil + profondeur
        );

      case DSTVFace.BACK:
        // Face arrière: X=largeur, Y=hauteur
        return new THREE.Vector3(
          -x,                   // X DSTV inversé → X Three.js
          y,                    // Y DSTV → Y Three.js
          length / 2 - z        // Fin du profil - profondeur
        );

      default:
        console.warn(`Face DSTV inconnue: ${face}`);
        return new THREE.Vector3(0, 0, longitudinalPos);
    }
  }

  /**
   * Retourne l'orientation (normale) pour une face donnée
   */
  getFaceNormal(face: DSTVFace): THREE.Vector3 {
    switch (face) {
      case DSTVFace.TOP:
        return new THREE.Vector3(0, 1, 0);    // Vers le haut
      case DSTVFace.BOTTOM:
        return new THREE.Vector3(0, -1, 0);   // Vers le bas
      case DSTVFace.LEFT:
        return new THREE.Vector3(-1, 0, 0);   // Vers la gauche
      case DSTVFace.RIGHT:
        return new THREE.Vector3(1, 0, 0);    // Vers la droite
      case DSTVFace.FRONT:
        return new THREE.Vector3(0, 0, -1);   // Vers l'avant
      case DSTVFace.BACK:
        return new THREE.Vector3(0, 0, 1);    // Vers l'arrière
      default:
        return new THREE.Vector3(0, 1, 0);
    }
  }

  /**
   * Retourne la rotation Euler pour orienter un cylindre selon la face
   */
  getHoleRotation(face: DSTVFace): THREE.Euler {
    switch (face) {
      case DSTVFace.TOP:
      case DSTVFace.BOTTOM:
        // Cylindre vertical (par défaut)
        return new THREE.Euler(0, 0, 0);

      case DSTVFace.LEFT:
      case DSTVFace.RIGHT:
        // Cylindre horizontal sur l'axe X
        return new THREE.Euler(0, 0, Math.PI / 2);

      case DSTVFace.FRONT:
      case DSTVFace.BACK:
        // Cylindre horizontal sur l'axe Z
        return new THREE.Euler(Math.PI / 2, 0, 0);

      default:
        return new THREE.Euler(0, 0, 0);
    }
  }

  /**
   * Calcule les limites valides pour une face donnée
   */
  getFaceBounds(face: DSTVFace): { xMin: number; xMax: number; yMin: number; yMax: number } {
    const { length, height, width } = this.dimensions;

    switch (face) {
      case DSTVFace.TOP:
      case DSTVFace.BOTTOM:
        return {
          xMin: 0,
          xMax: length,
          yMin: -width / 2,
          yMax: width / 2
        };

      case DSTVFace.LEFT:
      case DSTVFace.RIGHT:
        return {
          xMin: 0,
          xMax: length,
          yMin: -height / 2,
          yMax: height / 2
        };

      case DSTVFace.FRONT:
      case DSTVFace.BACK:
        return {
          xMin: -width / 2,
          xMax: width / 2,
          yMin: -height / 2,
          yMax: height / 2
        };

      default:
        return { xMin: 0, xMax: length, yMin: -100, yMax: 100 };
    }
  }

  /**
   * Valide une coordonnée DSTV
   */
  validateCoordinate(coord: DSTVCoordinate): boolean {
    const bounds = this.getFaceBounds(coord.face);

    if (coord.x < bounds.xMin || coord.x > bounds.xMax) {
      console.warn(`Coordonnée X hors limites: ${coord.x} (limites: ${bounds.xMin}-${bounds.xMax})`);
      return false;
    }

    if (coord.y < bounds.yMin || coord.y > bounds.yMax) {
      console.warn(`Coordonnée Y hors limites: ${coord.y} (limites: ${bounds.yMin}-${bounds.yMax})`);
      return false;
    }

    return true;
  }

  /**
   * Obtient la position par défaut pour une face (centre de la zone valide)
   */
  getDefaultPosition(face: DSTVFace): DSTVCoordinate {
    const bounds = this.getFaceBounds(face);

    return {
      face,
      x: (bounds.xMin + bounds.xMax) / 2,
      y: 0, // Centre de l'âme
      z: 0
    };
  }
}

export default DSTVTransformer;