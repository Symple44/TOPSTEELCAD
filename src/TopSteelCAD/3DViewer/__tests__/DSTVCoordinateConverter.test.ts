/**
 * Tests pour le convertisseur unifié de coordonnées DSTV
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { DSTVCoordinateConverter } from '../dstv/DSTVCoordinateConverter';
import { DSTVFace, ProfileDimensions } from '../dstv/DSTVTransformer';
import { StandardFace } from '../../core/coordinates/types';

describe('DSTVCoordinateConverter', () => {
  let converter: DSTVCoordinateConverter;

  const dimensions: ProfileDimensions = {
    length: 1000,
    height: 200,
    width: 100,
    webThickness: 10,
    flangeThickness: 15,
    profileType: 'IPE200'
  };

  beforeEach(() => {
    converter = new DSTVCoordinateConverter(false);
  });

  describe('convertToStandard()', () => {
    it('devrait utiliser DSTVCoordinateAdapter pour la conversion complexe', () => {
      const dstvCoord = {
        face: DSTVFace.TOP,
        x: 500,  // Milieu du profil
        y: 50,   // Position sur la semelle
        z: 0
      };

      const result = converter.convertToStandard(dstvCoord, dimensions, 'hole');

      // Vérifier que le résultat contient les bonnes propriétés
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('face');
      expect(result).toHaveProperty('metadata');
      expect(result.position).toBeDefined();
    });

    it('devrait gérer la face de l\'âme (web) correctement', () => {
      const dstvCoord = {
        face: 'v' as DSTVFace,  // Âme
        x: 300,
        y: 100,  // Milieu de la hauteur
        z: 0
      };

      const result = converter.convertToStandard(dstvCoord, dimensions, 'hole');

      expect(result.face).toBe(StandardFace.WEB);
      expect(result.position).toBeDefined();
    });

    it('devrait gérer les différents types de profils', () => {
      const testCases = [
        { profileType: 'HEA300', expectedType: 'I_PROFILE' },
        { profileType: 'UPN200', expectedType: 'U_PROFILE' },
        { profileType: 'L100x100', expectedType: 'L_PROFILE' },
        { profileType: 'PLATE', expectedType: 'PLATE' }
      ];

      testCases.forEach(testCase => {
        const testDimensions = { ...dimensions, profileType: testCase.profileType };
        const coord = {
          face: DSTVFace.TOP,
          x: 100,
          y: 50,
          z: 0
        };

        const result = converter.convertToStandard(coord, testDimensions);
        expect(result).toBeDefined();
        expect(result.position).toBeDefined();
      });
    });
  });

  describe('convertToVector3()', () => {
    it('devrait retourner un Vector3 simple', () => {
      const dstvCoord = {
        face: DSTVFace.TOP,
        x: 200,
        y: 30,
        z: 0
      };

      const result = converter.convertToVector3(dstvCoord, dimensions);

      // Vérifier que c'est un objet avec x, y, z
      expect(result).toBeDefined();
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(result).toHaveProperty('z');
      expect(result.x).toBeTypeOf('number');
      expect(result.y).toBeTypeOf('number');
      expect(result.z).toBeTypeOf('number');
    });
  });

  describe('getHoleRotation()', () => {
    it('devrait retourner la rotation correcte pour chaque face', () => {
      const testCases = [
        { face: DSTVFace.TOP, expectedRotation: new THREE.Euler(0, 0, 0) },
        { face: DSTVFace.BOTTOM, expectedRotation: new THREE.Euler(0, 0, 0) },
        { face: DSTVFace.LEFT, expectedRotation: new THREE.Euler(0, 0, Math.PI / 2) },
        { face: DSTVFace.RIGHT, expectedRotation: new THREE.Euler(0, 0, -Math.PI / 2) },
        { face: DSTVFace.FRONT, expectedRotation: new THREE.Euler(Math.PI / 2, 0, 0) },
        { face: DSTVFace.BACK, expectedRotation: new THREE.Euler(Math.PI / 2, 0, 0) }
      ];

      testCases.forEach(({ face, expectedRotation }) => {
        const rotation = converter.getHoleRotation(face);

        // Vérifier que les valeurs sont proches (avec tolérance)
        expect(rotation.x).toBeCloseTo(expectedRotation.x, 5);
        expect(rotation.y).toBeCloseTo(expectedRotation.y, 5);
        expect(rotation.z).toBeCloseTo(expectedRotation.z, 5);
      });
    });

    it('devrait gérer les alias de faces DSTV', () => {
      const aliases = [
        { alias: 'o', expected: DSTVFace.TOP },
        { alias: 'u', expected: DSTVFace.BOTTOM },
        { alias: 'l', expected: DSTVFace.LEFT },
        { alias: 'r', expected: DSTVFace.RIGHT },
        { alias: 'v', expected: DSTVFace.LEFT },  // Âme
        { alias: 'h', expected: DSTVFace.FRONT }
      ];

      aliases.forEach(({ alias }) => {
        const rotation = converter.getHoleRotation(alias);
        expect(rotation).toBeDefined();
        expect(rotation).toHaveProperty('x');
        expect(rotation).toHaveProperty('y');
        expect(rotation).toHaveProperty('z');
      });
    });
  });

  describe('getFaceNormal()', () => {
    it('devrait retourner la normale correcte pour chaque face', () => {
      const testCases = [
        { face: DSTVFace.TOP, expectedNormal: new THREE.Vector3(0, 1, 0) },
        { face: DSTVFace.BOTTOM, expectedNormal: new THREE.Vector3(0, -1, 0) },
        { face: DSTVFace.LEFT, expectedNormal: new THREE.Vector3(-1, 0, 0) },
        { face: DSTVFace.RIGHT, expectedNormal: new THREE.Vector3(1, 0, 0) },
        { face: DSTVFace.FRONT, expectedNormal: new THREE.Vector3(0, 0, -1) },
        { face: DSTVFace.BACK, expectedNormal: new THREE.Vector3(0, 0, 1) }
      ];

      testCases.forEach(({ face, expectedNormal }) => {
        const normal = converter.getFaceNormal(face);

        // Vérifier que les composantes sont correctes
        expect(normal.x).toBeCloseTo(expectedNormal.x, 5);
        expect(normal.y).toBeCloseTo(expectedNormal.y, 5);
        expect(normal.z).toBeCloseTo(expectedNormal.z, 5);
      });
    });
  });

  describe('validateCoordinate()', () => {
    it('devrait valider les coordonnées dans les limites', () => {
      const coord = {
        face: DSTVFace.TOP,
        x: 500,   // Dans [0, 1000]
        y: 50     // Dans [0, 100]
      };

      const result = converter.validateCoordinate(coord, dimensions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter les coordonnées hors limites', () => {
      const coord = {
        face: DSTVFace.TOP,
        x: 1500,  // Hors limites
        y: 150    // Hors limites
      };

      const result = converter.validateCoordinate(coord, dimensions);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('X hors limites');
      expect(result.errors[1]).toContain('Y hors limites');
    });

    it('devrait gérer les différentes limites selon la face', () => {
      const testCases = [
        {
          face: DSTVFace.TOP,
          maxY: dimensions.width  // Largeur pour face horizontale
        },
        {
          face: DSTVFace.LEFT,
          maxY: dimensions.height // Hauteur pour face verticale
        },
        {
          face: DSTVFace.FRONT,
          maxX: dimensions.width  // Largeur pour face avant
        }
      ];

      testCases.forEach(({ face, maxY, maxX }) => {
        const coord = {
          face,
          x: maxX ? maxX - 1 : 100,
          y: maxY ? maxY - 1 : 50
        };

        const result = converter.validateCoordinate(coord, dimensions);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('convertToDSTV()', () => {
    it('devrait faire la conversion inverse Standard -> DSTV', () => {
      const position3D = new THREE.Vector3(0, 100, 0);
      const face = StandardFace.TOP_FLANGE;

      const dstvCoord = converter.convertToDSTV(position3D, face, dimensions);

      expect(dstvCoord).toHaveProperty('face');
      expect(dstvCoord).toHaveProperty('x');
      expect(dstvCoord).toHaveProperty('y');
      expect(dstvCoord).toHaveProperty('z');

      // La position devrait être dans les limites DSTV
      expect(dstvCoord.x).toBeGreaterThanOrEqual(0);
      expect(dstvCoord.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration avec CSGHoleAdapter', () => {
    it('devrait fournir les données nécessaires pour le traitement CSG', () => {
      const holes = [
        {
          face: 'o',
          x: 200,
          y: 50,
          diameter: 20
        },
        {
          face: 'v',
          x: 500,
          y: 100,
          diameter: 16
        }
      ];

      holes.forEach(hole => {
        const coord = {
          face: hole.face as DSTVFace,
          x: hole.x,
          y: hole.y,
          z: 0
        };

        const standardPos = converter.convertToStandard(coord, dimensions, 'hole');
        const rotation = converter.getHoleRotation(hole.face);
        const normal = converter.getFaceNormal(hole.face);

        // Vérifier que toutes les données nécessaires sont présentes
        expect(standardPos.position).toBeDefined();
        expect(rotation).toBeDefined();
        expect(normal).toBeDefined();

        // Vérifier les métadonnées
        expect(standardPos.metadata).toBeDefined();
        expect(standardPos.metadata.source).toBe('dstv');
      });
    });
  });
});