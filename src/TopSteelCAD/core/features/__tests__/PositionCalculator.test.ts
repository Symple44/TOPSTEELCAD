/**
 * Tests unitaires pour le calculateur de position
 */

import * as THREE from 'three';
import { PositionCalculator } from '../utils/PositionCalculator';
import { ProfileFace } from '../types';
import { PivotElement, MaterialType } from '@/types/viewer';

describe('PositionCalculator', () => {
  let calculator: PositionCalculator;

  beforeEach(() => {
    calculator = new PositionCalculator();
  });

  describe('IPE Profile Positioning', () => {
    const ipeElement: PivotElement = {
      id: 'ipe-test',
      name: 'IPE300',
      materialType: MaterialType.BEAM,
      partNumber: 'IPE300',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: {
        length: 6000,
        height: 300,
        width: 150,
        thickness: 10.7
      },
      metadata: {
        profile: 'IPE300',
        webThickness: 7.1,
        flangeThickness: 10.7
      }
    };

    test('devrait positionner correctement sur l\'âme', () => {
      const featurePos = new THREE.Vector3(1000, 0, 0);
      const result = calculator.calculateFeaturePosition(
        ipeElement,
        featurePos,
        ProfileFace.WEB
      );

      expect(result.position[0]).toBe(1000); // X reste inchangé
      expect(result.position[1]).toBe(0); // Y reste centré
      expect(result.position[2]).toBe(0); // Z sur l'âme
      expect(result.face).toBe(ProfileFace.WEB);
      expect(result.normal.z).toBeCloseTo(1); // Normal vers Z+
    });

    test('devrait positionner correctement sur l\'aile supérieure', () => {
      const featurePos = new THREE.Vector3(1000, 50, 140);
      const result = calculator.calculateFeaturePosition(
        ipeElement,
        featurePos,
        ProfileFace.TOP_FLANGE
      );

      expect(result.position[0]).toBe(1000);
      expect(result.position[1]).toBe(50); // Décalage Y conservé
      expect(result.position[2]).toBeGreaterThan(140); // Z sur l'aile supérieure
      expect(result.face).toBe(ProfileFace.TOP_FLANGE);
      expect(result.normal.y).toBeCloseTo(1); // Normal vers Y+
    });

    test('devrait positionner correctement sur l\'aile inférieure', () => {
      const featurePos = new THREE.Vector3(1000, -50, -140);
      const result = calculator.calculateFeaturePosition(
        ipeElement,
        featurePos,
        ProfileFace.BOTTOM_FLANGE
      );

      expect(result.position[0]).toBe(1000);
      expect(result.position[1]).toBe(-50);
      expect(result.position[2]).toBeLessThan(-140); // Z sur l'aile inférieure
      expect(result.face).toBe(ProfileFace.BOTTOM_FLANGE);
      expect(result.normal.y).toBeCloseTo(-1); // Normal vers Y-
    });

    test('devrait calculer la profondeur correcte pour un trou traversant', () => {
      const featurePos = new THREE.Vector3(500, 0, 0);
      const result = calculator.calculateFeaturePosition(
        ipeElement,
        featurePos,
        ProfileFace.WEB
      );

      // Pour l'âme, la profondeur doit être l'épaisseur de l'âme
      expect(result.depth).toBeCloseTo(7.1);
    });
  });

  describe('Plate Positioning', () => {
    const plateElement: PivotElement = {
      id: 'plate-test',
      name: 'Plate 20mm',
      materialType: MaterialType.PLATE,
      partNumber: 'PL20',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: {
        length: 1000,
        width: 500,
        thickness: 20
      }
    };

    test('devrait positionner correctement sur la face supérieure', () => {
      const featurePos = new THREE.Vector3(100, 100, 0);
      const result = calculator.calculateFeaturePosition(
        plateElement,
        featurePos,
        ProfileFace.TOP
      );

      expect(result.position[0]).toBe(100);
      expect(result.position[1]).toBeGreaterThanOrEqual(10); // Au-dessus de la plaque
      expect(result.position[2]).toBe(100); // Y DSTV → Z Three.js
      expect(result.face).toBe(ProfileFace.TOP);
      expect(result.normal.y).toBeCloseTo(1);
    });

    test('devrait calculer la profondeur traversante', () => {
      const featurePos = new THREE.Vector3(0, 0, 0);
      const result = calculator.calculateFeaturePosition(
        plateElement,
        featurePos,
        ProfileFace.TOP
      );

      expect(result.depth).toBe(20); // Épaisseur de la plaque
    });
  });

  describe('RHS Tube Positioning', () => {
    const rhsElement: PivotElement = {
      id: 'rhs-test',
      name: 'RHS200x100x5',
      materialType: MaterialType.TUBE,
      partNumber: 'RHS200x100x5',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: {
        length: 4000,
        height: 200,
        width: 100,
        thickness: 5
      },
      metadata: {
        profile: 'RHS200x100',
        wallThickness: 5
      }
    };

    test('devrait positionner sur la face droite', () => {
      const featurePos = new THREE.Vector3(500, 0, 95);
      const result = calculator.calculateFeaturePosition(
        rhsElement,
        featurePos,
        ProfileFace.RIGHT
      );

      expect(result.position[0]).toBe(500);
      expect(result.position[2]).toBeCloseTo(50); // Moitié de la largeur
      expect(result.face).toBe(ProfileFace.RIGHT);
      expect(result.normal.z).toBeCloseTo(1);
    });

    test('devrait positionner sur la face supérieure', () => {
      const featurePos = new THREE.Vector3(1000, 95, 0);
      const result = calculator.calculateFeaturePosition(
        rhsElement,
        featurePos,
        ProfileFace.TOP
      );

      expect(result.position[0]).toBe(1000);
      expect(result.position[1]).toBeCloseTo(100); // Moitié de la hauteur
      expect(result.face).toBe(ProfileFace.TOP);
      expect(result.normal.y).toBeCloseTo(1);
    });

    test('devrait positionner sur la face inférieure', () => {
      const featurePos = new THREE.Vector3(1500, -95, 0);
      const result = calculator.calculateFeaturePosition(
        rhsElement,
        featurePos,
        ProfileFace.BOTTOM
      );

      expect(result.position[0]).toBe(1500);
      expect(result.position[1]).toBeCloseTo(-100);
      expect(result.face).toBe(ProfileFace.BOTTOM);
      expect(result.normal.y).toBeCloseTo(-1);
    });

    test('devrait positionner sur la face gauche', () => {
      const featurePos = new THREE.Vector3(2000, 0, -45);
      const result = calculator.calculateFeaturePosition(
        rhsElement,
        featurePos,
        ProfileFace.LEFT
      );

      expect(result.position[0]).toBe(2000);
      expect(result.position[2]).toBeCloseTo(-50);
      expect(result.face).toBe(ProfileFace.LEFT);
      expect(result.normal.z).toBeCloseTo(-1);
    });
  });

  describe('L-Profile (Angle) Positioning', () => {
    const angleElement: PivotElement = {
      id: 'angle-test',
      name: 'L100x100x10',
      materialType: MaterialType.BEAM,
      partNumber: 'L100x100x10',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      dimensions: {
        length: 3000,
        height: 100,
        width: 100,
        thickness: 10
      },
      metadata: {
        profile: 'L100x100x10'
      }
    };

    test('devrait positionner sur la jambe gauche', () => {
      const featurePos = new THREE.Vector3(500, 0, -45);
      const result = calculator.calculateFeaturePosition(
        angleElement,
        featurePos,
        ProfileFace.LEFT_LEG
      );

      expect(result.position[0]).toBe(500);
      expect(result.position[2]).toBeLessThan(0); // Sur la jambe gauche
      expect(result.face).toBe(ProfileFace.LEFT_LEG);
      expect(result.depth).toBe(10); // Épaisseur de la jambe
    });

    test('devrait positionner sur la jambe droite', () => {
      const featurePos = new THREE.Vector3(1000, -45, 0);
      const result = calculator.calculateFeaturePosition(
        angleElement,
        featurePos,
        ProfileFace.RIGHT_LEG
      );

      expect(result.position[0]).toBe(1000);
      expect(result.position[1]).toBeLessThan(0); // Sur la jambe horizontale
      expect(result.face).toBe(ProfileFace.RIGHT_LEG);
      expect(result.depth).toBe(10);
    });
  });

  describe('Coordinate System Conversion', () => {
    const testElement: PivotElement = {
      id: 'coord-test',
      name: 'Test Element',
      materialType: MaterialType.BEAM,
      partNumber: 'TEST',
      position: [100, 200, 300], // Position globale
      rotation: [0, Math.PI / 4, 0], // Rotation 45° autour de Y
      dimensions: {
        length: 1000,
        height: 200,
        width: 100,
        thickness: 10
      }
    };

    test('devrait convertir les coordonnées DSTV vers Three.js', () => {
      // DSTV: X = longueur, Y = largeur, Z = hauteur
      // Three.js: X = longueur, Y = hauteur, Z = largeur
      
      const dstvPos = new THREE.Vector3(500, 50, 100); // DSTV
      const result = calculator.calculateFeaturePosition(
        testElement,
        dstvPos,
        ProfileFace.TOP
      );

      // X reste X
      expect(result.position[0]).toBe(500);
      // Z DSTV → Y Three.js (avec offset de face)
      expect(result.position[1]).toBeGreaterThan(100);
      // Y DSTV → Z Three.js
      expect(result.position[2]).toBe(50);
    });

    test('devrait prendre en compte la rotation de l\'élément', () => {
      const featurePos = new THREE.Vector3(0, 0, 0);
      const result = calculator.calculateFeaturePosition(
        testElement,
        featurePos,
        ProfileFace.TOP
      );

      // La rotation doit affecter la normale
      expect(result.rotation[1]).toBeCloseTo(Math.PI / 4);
    });
  });

  describe('Edge Cases', () => {
    test('devrait gérer un élément sans métadonnées', () => {
      const minimalElement: PivotElement = {
        id: 'minimal',
        name: 'Minimal',
        materialType: MaterialType.BEAM,
        partNumber: 'MIN',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        dimensions: {
          length: 1000,
          height: 100,
          width: 100
        }
        // Pas de metadata
      };

      const featurePos = new THREE.Vector3(0, 0, 0);
      const result = calculator.calculateFeaturePosition(
        minimalElement,
        featurePos
      );

      expect(result).toBeDefined();
      expect(result.position).toBeDefined();
      expect(result.face).toBe(ProfileFace.TOP); // Face par défaut
    });

    test('devrait gérer des dimensions manquantes', () => {
      const incompleteElement: PivotElement = {
        id: 'incomplete',
        name: 'Incomplete',
        materialType: MaterialType.BEAM,
        partNumber: 'INC',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        dimensions: {
          length: 1000
          // height et width manquants
        }
      };

      const featurePos = new THREE.Vector3(0, 0, 0);
      const result = calculator.calculateFeaturePosition(
        incompleteElement,
        featurePos
      );

      expect(result).toBeDefined();
      expect(result.depth).toBe(100); // Valeur par défaut
    });

    test('devrait détecter automatiquement la face selon la position', () => {
      const autoElement: PivotElement = {
        id: 'auto',
        name: 'Auto Face',
        materialType: MaterialType.BEAM,
        partNumber: 'AUTO',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        dimensions: {
          length: 1000,
          height: 300,
          width: 150,
          thickness: 10
        },
        metadata: {
          profile: 'IPE300'
        }
      };

      // Position sur l'âme (Z proche de 0)
      let result = calculator.calculateFeaturePosition(
        autoElement,
        new THREE.Vector3(500, 0, 5)
        // Pas de face spécifiée
      );
      expect(result.face).toBe(ProfileFace.WEB);

      // Position sur l'aile supérieure (Z élevé)
      result = calculator.calculateFeaturePosition(
        autoElement,
        new THREE.Vector3(500, 0, 140)
      );
      expect(result.face).toBe(ProfileFace.TOP_FLANGE);

      // Position sur l'aile inférieure (Z négatif)
      result = calculator.calculateFeaturePosition(
        autoElement,
        new THREE.Vector3(500, 0, -140)
      );
      expect(result.face).toBe(ProfileFace.BOTTOM_FLANGE);
    });
  });
});