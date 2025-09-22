/**
 * Tests unitaires pour DSTVTransformer
 * Vérifie la transformation correcte des coordonnées DSTV en positions 3D
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import DSTVTransformer, { DSTVFace, DSTVCoordinate, ProfileDimensions } from '../dstv/DSTVTransformer';

describe('DSTVTransformer', () => {
  let transformer: DSTVTransformer;
  const dimensions: ProfileDimensions = {
    length: 1000,
    height: 200,
    width: 100,
    webThickness: 10,
    flangeThickness: 15,
    profileType: 'IPE200'
  };

  beforeEach(() => {
    transformer = new DSTVTransformer(dimensions);
  });

  describe('transform()', () => {
    it('devrait transformer correctement les coordonnées de la face supérieure (o)', () => {
      const coord: DSTVCoordinate = {
        face: DSTVFace.TOP,
        x: 500,  // Milieu du profil
        y: 0,    // Centre de l'âme
        z: 0
      };

      const position = transformer.transform(coord);

      expect(position.x).toBe(0);  // Y=0 → centre de l'âme
      expect(position.y).toBe(100); // height/2 = 200/2 = 100
      expect(position.z).toBe(0);   // x=500 - length/2 = 0
    });

    it('devrait transformer correctement les coordonnées de la face inférieure (u)', () => {
      const coord: DSTVCoordinate = {
        face: DSTVFace.BOTTOM,
        x: 100,
        y: -30,
        z: 0
      };

      const position = transformer.transform(coord);

      expect(position.x).toBe(-30); // y DSTV → x Three.js
      expect(position.y).toBe(-100); // -height/2
      expect(position.z).toBe(-400); // 100 - 500 = -400
    });

    it('devrait transformer correctement les coordonnées de la face gauche (l)', () => {
      const coord: DSTVCoordinate = {
        face: DSTVFace.LEFT,
        x: 300,
        y: 50,
        z: 0
      };

      const position = transformer.transform(coord);

      expect(position.x).toBe(-50); // -width/2
      expect(position.y).toBe(50);  // y DSTV → y Three.js
      expect(position.z).toBe(-200); // 300 - 500 = -200
    });

    it('devrait transformer correctement les coordonnées de la face droite (r)', () => {
      const coord: DSTVCoordinate = {
        face: DSTVFace.RIGHT,
        x: 700,
        y: -25,
        z: 5
      };

      const position = transformer.transform(coord);

      expect(position.x).toBe(45);  // width/2 - z = 50 - 5 = 45
      expect(position.y).toBe(-25); // y DSTV → y Three.js
      expect(position.z).toBe(200);  // 700 - 500 = 200
    });

    it('devrait gérer la profondeur z pour les trous non traversants', () => {
      const coord: DSTVCoordinate = {
        face: DSTVFace.TOP,
        x: 500,
        y: 0,
        z: 10  // Profondeur de 10mm
      };

      const position = transformer.transform(coord);

      expect(position.y).toBe(90); // height/2 - z = 100 - 10 = 90
    });
  });

  describe('getFaceNormal()', () => {
    it('devrait retourner la normale correcte pour chaque face', () => {
      expect(transformer.getFaceNormal(DSTVFace.TOP)).toEqual(new THREE.Vector3(0, 1, 0));
      expect(transformer.getFaceNormal(DSTVFace.BOTTOM)).toEqual(new THREE.Vector3(0, -1, 0));
      expect(transformer.getFaceNormal(DSTVFace.LEFT)).toEqual(new THREE.Vector3(-1, 0, 0));
      expect(transformer.getFaceNormal(DSTVFace.RIGHT)).toEqual(new THREE.Vector3(1, 0, 0));
      expect(transformer.getFaceNormal(DSTVFace.FRONT)).toEqual(new THREE.Vector3(0, 0, -1));
      expect(transformer.getFaceNormal(DSTVFace.BACK)).toEqual(new THREE.Vector3(0, 0, 1));
    });
  });

  describe('getHoleRotation()', () => {
    it('devrait retourner la rotation correcte pour orienter les cylindres', () => {
      const topRotation = transformer.getHoleRotation(DSTVFace.TOP);
      expect(topRotation.x).toBe(0);
      expect(topRotation.y).toBe(0);
      expect(topRotation.z).toBe(0);

      const leftRotation = transformer.getHoleRotation(DSTVFace.LEFT);
      expect(leftRotation.z).toBe(Math.PI / 2);

      const frontRotation = transformer.getHoleRotation(DSTVFace.FRONT);
      expect(frontRotation.x).toBe(Math.PI / 2);
    });
  });

  describe('validateCoordinate()', () => {
    it('devrait valider les coordonnées dans les limites', () => {
      const validCoord: DSTVCoordinate = {
        face: DSTVFace.TOP,
        x: 500,
        y: 40  // Dans les limites de width/2 = 50
      };

      expect(transformer.validateCoordinate(validCoord)).toBe(true);
    });

    it('devrait rejeter les coordonnées hors limites', () => {
      const invalidCoord: DSTVCoordinate = {
        face: DSTVFace.TOP,
        x: 500,
        y: 100  // Hors limites (> width/2 = 50)
      };

      expect(transformer.validateCoordinate(invalidCoord)).toBe(false);
    });

    it('devrait valider x dans [0, length] pour toutes les faces longitudinales', () => {
      const coord: DSTVCoordinate = {
        face: DSTVFace.TOP,
        x: 0,  // Début du profil
        y: 0
      };

      expect(transformer.validateCoordinate(coord)).toBe(true);

      coord.x = 1000; // Fin du profil
      expect(transformer.validateCoordinate(coord)).toBe(true);

      coord.x = -100; // Hors limites
      expect(transformer.validateCoordinate(coord)).toBe(false);

      coord.x = 1100; // Hors limites
      expect(transformer.validateCoordinate(coord)).toBe(false);
    });
  });

  describe('getFaceBounds()', () => {
    it('devrait retourner les limites correctes pour la face supérieure', () => {
      const bounds = transformer.getFaceBounds(DSTVFace.TOP);

      expect(bounds.xMin).toBe(0);
      expect(bounds.xMax).toBe(1000);  // length
      expect(bounds.yMin).toBe(-50);   // -width/2
      expect(bounds.yMax).toBe(50);    // width/2
    });

    it('devrait retourner les limites correctes pour les faces latérales', () => {
      const bounds = transformer.getFaceBounds(DSTVFace.LEFT);

      expect(bounds.xMin).toBe(0);
      expect(bounds.xMax).toBe(1000);  // length
      expect(bounds.yMin).toBe(-100);  // -height/2
      expect(bounds.yMax).toBe(100);   // height/2
    });
  });

  describe('getDefaultPosition()', () => {
    it('devrait retourner la position par défaut au centre de la face', () => {
      const defaultPos = transformer.getDefaultPosition(DSTVFace.TOP);

      expect(defaultPos.face).toBe(DSTVFace.TOP);
      expect(defaultPos.x).toBe(500);  // Milieu de la longueur
      expect(defaultPos.y).toBe(0);    // Centre de l'âme
      expect(defaultPos.z).toBe(0);
    });
  });
});

describe('DSTVTransformer - Cas d\'usage réels', () => {
  it('devrait gérer correctement un ensemble de trous sur différentes faces', () => {
    const dimensions: ProfileDimensions = {
      length: 1200,
      height: 300,
      width: 150,
      webThickness: 11,
      flangeThickness: 19,
      profileType: 'IPE300'
    };

    const transformer = new DSTVTransformer(dimensions);

    // Trous de test
    const holes = [
      { face: DSTVFace.TOP, x: 100, y: 0, diameter: 20 },
      { face: DSTVFace.TOP, x: 600, y: -40, diameter: 16 },
      { face: DSTVFace.TOP, x: 600, y: 40, diameter: 16 },
      { face: DSTVFace.BOTTOM, x: 300, y: 0, diameter: 22 },
      { face: DSTVFace.LEFT, x: 900, y: 50, diameter: 18 },
      { face: DSTVFace.RIGHT, x: 900, y: -50, diameter: 18 }
    ];

    holes.forEach(hole => {
      const coord: DSTVCoordinate = {
        face: hole.face,
        x: hole.x,
        y: hole.y,
        z: 0
      };

      // Vérifier que la transformation fonctionne
      const position = transformer.transform(coord);
      expect(position).toBeInstanceOf(THREE.Vector3);

      // Vérifier que la validation passe
      expect(transformer.validateCoordinate(coord)).toBe(true);

      // Vérifier que la normale est correcte
      const normal = transformer.getFaceNormal(hole.face);
      expect(normal.length()).toBeCloseTo(1, 5); // Vecteur unitaire
    });
  });

  it('devrait préserver l\'origine au centre de l\'âme pour toutes les faces', () => {
    const dimensions: ProfileDimensions = {
      length: 1000,
      height: 200,
      width: 100,
      profileType: 'HEA200'
    };

    const transformer = new DSTVTransformer(dimensions);

    // Pour y=0, tous les trous doivent être alignés au centre de l'âme
    const faces = [DSTVFace.TOP, DSTVFace.BOTTOM];

    faces.forEach(face => {
      const coord: DSTVCoordinate = {
        face,
        x: 500,
        y: 0,  // Centre de l'âme
        z: 0
      };

      const position = transformer.transform(coord);

      // Pour y=0, x doit être 0 (centre de l'âme en coordonnées 3D)
      expect(Math.abs(position.x)).toBeLessThan(0.001);
    });
  });
});