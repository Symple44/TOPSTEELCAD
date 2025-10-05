/**
 * Tests unitaires pour la transformation des coordonnées 2D vers 3D
 */

import { describe, test, expect } from 'vitest';
import { transformHoleCoordinates, validateHolePosition, getFaceInfo } from './coordinateTransform';
import { PartElement, HoleDSTV, DSTVFace } from '../types/partBuilder.types';
import { ProfileType } from '../../3DLibrary/types/profile.types';

describe('coordinateTransform', () => {
  // Élément de test : IPE 200
  const createIPEElement = (): PartElement => ({
    id: 'test-ipe',
    reference: 'A1',
    designation: 'Poutre test',
    quantity: 1,
    profileType: ProfileType.IPE,
    profileSubType: '200',
    length: 3000,
    material: 'S355',
    holes: [],
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 5.6,
      flangeThickness: 8.5
    }
  });

  // Élément de test : UPN 200
  const createUPNElement = (): PartElement => ({
    id: 'test-upn',
    reference: 'B1',
    designation: 'Profile U',
    quantity: 1,
    profileType: 'UPN' as any,
    profileSubType: '200',
    length: 2000,
    material: 'S235',
    holes: [],
    dimensions: {
      height: 200,
      width: 75,
      webThickness: 8.5,
      flangeThickness: 11
    }
  });

  // Élément de test : Tube rond
  const createRoundTubeElement = (): PartElement => ({
    id: 'test-tube',
    reference: 'C1',
    designation: 'Tube rond',
    quantity: 1,
    profileType: 'TUBE_ROND' as any,
    profileSubType: '100',
    length: 1500,
    material: 'S355',
    holes: [],
    dimensions: {
      height: 100, // diamètre
      width: 100,
      webThickness: 5,
      flangeThickness: 5
    }
  });

  describe('transformHoleCoordinates - IPE Profile', () => {
    test('should transform coordinates for TOP face correctly', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-1',
        label: 'A',
        diameter: 20,
        coordinates: {
          face: DSTVFace.TOP,
          x: 1500, // Au milieu de la longueur
          y: 50    // Position sur la semelle (0-100mm)
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(1500); // Position longitudinale inchangée
      expect(result.y).toBe(0);    // 50 - 100/2 = 0 (centré sur Y)
      expect(result.z).toBe(100);  // 200/2 = 100 (en haut du profil)
    });

    test('should transform coordinates for BOTTOM face correctly', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-2',
        label: 'B',
        diameter: 20,
        coordinates: {
          face: DSTVFace.BOTTOM,
          x: 1000,
          y: 50
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(1000);
      expect(result.y).toBe(0);     // 50 - 100/2 = 0
      expect(result.z).toBe(-100);  // -200/2 = -100 (en bas du profil)
    });

    test('should transform coordinates for FRONT face (web) correctly', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-3',
        label: 'C',
        diameter: 16,
        coordinates: {
          face: DSTVFace.FRONT,
          x: 500,
          y: 100 // Position en hauteur sur l'âme (0-200mm)
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(500);
      expect(result.y).toBe(2.8);  // webThickness/2 = 5.6/2 = 2.8
      expect(result.z).toBe(0);    // 100 - 200/2 = 0 (centré en hauteur)
    });

    test('should transform coordinates for BACK face correctly', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-4',
        label: 'D',
        diameter: 16,
        coordinates: {
          face: DSTVFace.BACK,
          x: 2000,
          y: 150
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(2000);
      expect(result.y).toBe(-2.8); // -webThickness/2 = -5.6/2 = -2.8
      expect(result.z).toBe(50);   // 150 - 200/2 = 50
    });
  });

  describe('transformHoleCoordinates - UPN Profile', () => {
    test('should transform coordinates for UPN TOP face', () => {
      const element = createUPNElement();
      const hole: HoleDSTV = {
        id: 'hole-5',
        label: 'E',
        diameter: 18,
        coordinates: {
          face: DSTVFace.TOP,
          x: 1000,
          y: 37.5 // Centré sur la largeur
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(1000);
      expect(result.y).toBe(0);    // 37.5 - 75/2 = 0
      expect(result.z).toBe(100);  // 200/2 = 100
    });
  });

  describe('transformHoleCoordinates - Round Tube', () => {
    test('should transform coordinates for RADIAL face at 0 degrees', () => {
      const element = createRoundTubeElement();
      const hole: HoleDSTV = {
        id: 'hole-6',
        label: 'F',
        diameter: 12,
        coordinates: {
          face: DSTVFace.RADIAL,
          x: 750,  // Position longitudinale
          y: 0     // Angle en degrés
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(750);
      expect(result.y).toBeCloseTo(50, 1); // radius * cos(0) = 50
      expect(result.z).toBeCloseTo(0, 1);  // radius * sin(0) = 0
    });

    test('should transform coordinates for RADIAL face at 90 degrees', () => {
      const element = createRoundTubeElement();
      const hole: HoleDSTV = {
        id: 'hole-7',
        label: 'G',
        diameter: 12,
        coordinates: {
          face: DSTVFace.RADIAL,
          x: 750,
          y: 90 // 90 degrés
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(750);
      expect(result.y).toBeCloseTo(0, 1);  // radius * cos(90) ≈ 0
      expect(result.z).toBeCloseTo(50, 1); // radius * sin(90) = 50
    });

    test('should transform coordinates for RADIAL face at 180 degrees', () => {
      const element = createRoundTubeElement();
      const hole: HoleDSTV = {
        id: 'hole-8',
        label: 'H',
        diameter: 12,
        coordinates: {
          face: DSTVFace.RADIAL,
          x: 750,
          y: 180
        },
        isThrough: true,
        type: 'through'
      };

      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(750);
      expect(result.y).toBeCloseTo(-50, 1); // radius * cos(180) = -50
      expect(result.z).toBeCloseTo(0, 1);   // radius * sin(180) ≈ 0
    });
  });

  describe('validateHolePosition', () => {
    test('should validate a correct hole position', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-valid',
        label: 'A',
        diameter: 20,
        coordinates: {
          face: DSTVFace.TOP,
          x: 1500,
          y: 50
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject hole position outside longitudinal bounds', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-invalid-x',
        label: 'B',
        diameter: 20,
        coordinates: {
          face: DSTVFace.TOP,
          x: 3500, // Au-delà de la longueur de 3000mm
          y: 50
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Position X');
    });

    test('should reject hole position outside transversal bounds', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-invalid-y',
        label: 'C',
        diameter: 20,
        coordinates: {
          face: DSTVFace.TOP,
          x: 1500,
          y: 150 // Au-delà de la largeur de 100mm
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Position Y');
    });

    test('should reject hole that exceeds bounds with its diameter', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-diameter-overflow',
        label: 'D',
        diameter: 120, // Grand diamètre (120mm)
        coordinates: {
          face: DSTVFace.TOP,
          x: 60, // Position trop proche du bord
          y: 50  // Centré en Y
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      // 60 - 60 = 0 (OK), mais 60 + 60 = 120 > 100 (largeur face) = FAIL
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dépasse les limites');
    });

    test('should validate radial tube hole with valid angle', () => {
      const element = createRoundTubeElement();
      const hole: HoleDSTV = {
        id: 'hole-radial-valid',
        label: 'E',
        diameter: 12,
        coordinates: {
          face: DSTVFace.RADIAL,
          x: 750,
          y: 45 // Angle valide
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      expect(result.valid).toBe(true);
    });

    test('should reject radial tube hole with invalid angle', () => {
      const element = createRoundTubeElement();
      const hole: HoleDSTV = {
        id: 'hole-radial-invalid',
        label: 'F',
        diameter: 12,
        coordinates: {
          face: DSTVFace.RADIAL,
          x: 750,
          y: 400 // Angle > 360°
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Angle');
    });
  });

  describe('getFaceInfo', () => {
    test('should return correct face info for IPE TOP face', () => {
      const element = createIPEElement();
      const faceInfo = getFaceInfo(DSTVFace.TOP, element);

      expect(faceInfo.face).toBe(DSTVFace.TOP);
      expect(faceInfo.width).toBe(100);           // Largeur de la semelle
      expect(faceInfo.height).toBe(3000);         // Longueur de la pièce
      expect(faceInfo.normal).toEqual([0, 0, 1]); // Normale vers le haut
    });

    test('should return correct face info for IPE FRONT face (web)', () => {
      const element = createIPEElement();
      const faceInfo = getFaceInfo(DSTVFace.FRONT, element);

      expect(faceInfo.face).toBe(DSTVFace.FRONT);
      expect(faceInfo.width).toBe(5.6);           // Épaisseur de l'âme
      expect(faceInfo.height).toBe(200);          // Hauteur du profil
      expect(faceInfo.normal).toEqual([0, 1, 0]); // Normale vers l'avant
    });

    test('should return correct face info for round tube RADIAL', () => {
      const element = createRoundTubeElement();
      const faceInfo = getFaceInfo(DSTVFace.RADIAL, element);

      expect(faceInfo.face).toBe(DSTVFace.RADIAL);
      expect(faceInfo.width).toBe(360);  // Angle en degrés
      expect(faceInfo.height).toBe(1500); // Longueur de la pièce
    });
  });

  describe('Edge cases', () => {
    test('should handle element without dimensions (use defaults)', () => {
      const element: PartElement = {
        id: 'test-no-dims',
        reference: 'X1',
        designation: 'Test sans dimensions',
        quantity: 1,
        profileType: ProfileType.IPE,
        profileSubType: '200',
        length: 2000,
        material: 'S355',
        holes: []
        // pas de dimensions
      };

      const hole: HoleDSTV = {
        id: 'hole-default',
        label: 'A',
        diameter: 20,
        coordinates: {
          face: DSTVFace.TOP,
          x: 1000,
          y: 100
        },
        isThrough: true,
        type: 'through'
      };

      // Devrait utiliser les valeurs par défaut
      const result = transformHoleCoordinates(hole, element);

      expect(result.x).toBe(1000);
      expect(result.y).toBeDefined();
      expect(result.z).toBeDefined();
    });

    test('should handle negative coordinates (should fail validation)', () => {
      const element = createIPEElement();
      const hole: HoleDSTV = {
        id: 'hole-negative',
        label: 'A',
        diameter: 20,
        coordinates: {
          face: DSTVFace.TOP,
          x: -100, // Négatif
          y: 50
        },
        isThrough: true,
        type: 'through'
      };

      const result = validateHolePosition(hole, element);

      expect(result.valid).toBe(false);
    });
  });
});
