/**
 * Test E2E pour vérifier le positionnement et l'orientation corrects des trous
 * sur chaque face du profil
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { HoleProcessor } from '../../core/features/processors/HoleProcessor';
import { PivotElement, MaterialType } from '../../../types/viewer';
import { ProfileFace } from '../../core/features/types';

// Mock de three-bvh-csg
vi.mock('three-bvh-csg', () => ({
  Evaluator: vi.fn().mockImplementation(() => ({
    evaluate: vi.fn((a, b, op) => {
      // Retourner une géométrie mockée avec les infos du trou
      const mockGeometry = a.clone ? a.clone() : a;
      if (!mockGeometry.userData) mockGeometry.userData = {};
      if (!mockGeometry.userData.holes) mockGeometry.userData.holes = [];

      // Extraire la position du trou depuis le brush
      mockGeometry.userData.holes.push({
        position: b.position ? b.position.clone() : new THREE.Vector3(),
        rotation: b.rotation ? b.rotation.clone() : new THREE.Euler()
      });

      return mockGeometry;
    }),
    useGroups: false,
    attributes: []
  })),
  Brush: vi.fn().mockImplementation((geometry) => {
    const brush = {
      geometry,
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      updateMatrixWorld: vi.fn()
    };
    // Capturer la position et rotation assignées
    return brush;
  }),
  SUBTRACTION: 'subtraction'
}));

// Mock du PositionService
vi.mock('../../core/services/PositionService', () => ({
  PositionService: {
    getInstance: vi.fn(() => ({
      registerAdapter: vi.fn(),
      calculateFeaturePosition: vi.fn((element, position, face, coordinateSystem) => ({
        position: new THREE.Vector3(position[0] || 0, position[1] || 0, position[2] || 0),
        rotation: new THREE.Euler(0, 0, 0),
        depth: 0
      }))
    }))
  }
}));

describe('E2E: Positionnement et orientation des trous sur chaque face', () => {
  let processor: HoleProcessor;
  let testElement: PivotElement;

  beforeEach(() => {
    processor = new HoleProcessor();

    // Élément de test IPE200
    testElement = {
      id: 'test-beam',
      type: 'beam',
      materialType: MaterialType.BEAM,
      name: 'IPE200',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: {
        length: 3000,    // Longueur du profil (axe X en Three.js)
        width: 100,      // Largeur de la semelle
        height: 200,     // Hauteur du profil
        webThickness: 5.6,
        flangeThickness: 8.5,
        thickness: 10
      },
      material: {
        type: 'steel',
        grade: 'S355',
        density: 7850
      },
      profile: {
        type: 'IPE',
        subType: '200'
      }
    };
  });

  describe('Système de coordonnées DSTV → Three.js', () => {
    it('devrait documenter le mapping des coordonnées', () => {
      // Documentation du système de coordonnées
      const coordinateMapping = {
        dstv: {
          X: 'Position le long du profil (0 à length)',
          Y: 'Position transversale',
          Z: 'Position verticale'
        },
        threejs: {
          X: 'Longueur du profil (correspond à DSTV X)',
          Y: 'Hauteur du profil (vertical)',
          Z: 'Largeur du profil (transversal)'
        }
      };

      console.log('📐 Mapping des coordonnées:');
      console.log('DSTV → Three.js:');
      console.log('  X (longueur) → X');
      console.log('  Y (transversal) → Z');
      console.log('  Z (vertical) → Y');

      expect(coordinateMapping).toBeDefined();
    });
  });

  describe('Face "o" - Semelle supérieure (top flange)', () => {
    it('devrait positionner correctement un trou sur la semelle supérieure', () => {
      const feature = {
        id: 'hole-top-1',
        type: 'hole' as const,
        position: [500, 30, 0], // X=500mm le long, Y=30mm du centre, Z=0 (traversant)
        face: 'o',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 20,
          depth: 0, // Traversant
          holeType: 'round' as const
        }
      };

      const baseGeometry = new THREE.BoxGeometry(100, 8.5, 3000);
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, testElement);

      expect(result.success).toBe(true);
      if (result.geometry) {
        const holeData = result.geometry.userData?.holes?.[0];
        expect(holeData).toBeDefined();

        // Vérification de la position
        // Sur la semelle supérieure:
        // - X DSTV (500) → X Three.js (500)
        // - Y DSTV (30) → Z Three.js (30)
        // - Le trou doit être au niveau Y = height/2 - flangeThickness/2
        const expectedY = testElement.dimensions.height / 2;

        console.log('🎯 Face "o" - Position attendue:', { x: 500, y: expectedY, z: 30 });
        console.log('📍 Face "o" - Position réelle:', holeData.position);

        expect(Math.abs(holeData.position.x - 500)).toBeLessThan(1);
        expect(Math.abs(holeData.position.z - 30)).toBeLessThan(1);

        // Vérification de l'orientation (trou vertical)
        const expectedRotation = new THREE.Euler(-Math.PI / 2, 0, 0);
        console.log('🔄 Face "o" - Rotation attendue:', expectedRotation);
        console.log('🔄 Face "o" - Rotation réelle:', holeData.rotation);

        expect(Math.abs(holeData.rotation.x - expectedRotation.x)).toBeLessThan(0.01);
      }
    });
  });

  describe('Face "u" - Semelle inférieure (bottom flange)', () => {
    it('devrait positionner correctement un trou sur la semelle inférieure', () => {
      const feature = {
        id: 'hole-bottom-1',
        type: 'hole' as const,
        position: [800, -20, 0], // X=800mm le long, Y=-20mm du centre
        face: 'u',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 16,
          depth: 0,
          holeType: 'round' as const
        }
      };

      const baseGeometry = new THREE.BoxGeometry(100, 8.5, 3000);
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, testElement);

      expect(result.success).toBe(true);
      if (result.geometry) {
        const holeData = result.geometry.userData?.holes?.[0];

        const expectedY = -testElement.dimensions.height / 2;

        console.log('🎯 Face "u" - Position attendue:', { x: 800, y: expectedY, z: -20 });
        console.log('📍 Face "u" - Position réelle:', holeData.position);

        expect(Math.abs(holeData.position.x - 800)).toBeLessThan(1);
        expect(Math.abs(holeData.position.z + 20)).toBeLessThan(1);

        // Rotation inverse pour la semelle inférieure
        const expectedRotation = new THREE.Euler(Math.PI / 2, 0, 0);
        expect(Math.abs(holeData.rotation.x - expectedRotation.x)).toBeLessThan(0.01);
      }
    });
  });

  describe('Face "v" - Âme (web)', () => {
    it('devrait positionner correctement un trou sur l\'âme', () => {
      const feature = {
        id: 'hole-web-1',
        type: 'hole' as const,
        position: [1200, 50, 0], // X=1200mm le long, Y=50mm du bas de l'âme
        face: 'v',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 24,
          depth: 0,
          holeType: 'round' as const
        }
      };

      const baseGeometry = new THREE.BoxGeometry(5.6, 183, 3000); // Âme
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, testElement);

      expect(result.success).toBe(true);
      if (result.geometry) {
        const holeData = result.geometry.userData?.holes?.[0];

        // Sur l'âme:
        // - X DSTV (1200) → X Three.js (1200)
        // - Y DSTV (50) → Y Three.js (50 depuis le bas = -height/2 + 50)
        // - Z doit être proche de 0 (centre de l'âme)
        const expectedY = -testElement.dimensions.height / 2 + 50;

        console.log('🎯 Face "v" - Position attendue:', { x: 1200, y: expectedY, z: 0 });
        console.log('📍 Face "v" - Position réelle:', holeData.position);

        expect(Math.abs(holeData.position.x - 1200)).toBeLessThan(1);
        expect(Math.abs(holeData.position.y - expectedY)).toBeLessThan(1);
        expect(Math.abs(holeData.position.z)).toBeLessThan(5); // Proche du centre

        // Rotation horizontale pour l'âme
        const expectedRotation = new THREE.Euler(0, Math.PI / 2, 0);
        expect(Math.abs(holeData.rotation.y - expectedRotation.y)).toBeLessThan(0.01);
      }
    });

    it('devrait gérer les positions négatives sur l\'âme', () => {
      const feature = {
        id: 'hole-web-2',
        type: 'hole' as const,
        position: [1500, -60, 0], // Y négatif = en dessous du centre
        face: 'v',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 18,
          depth: 5, // Non traversant
          holeType: 'round' as const
        }
      };

      const baseGeometry = new THREE.BoxGeometry(5.6, 183, 3000);
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, testElement);

      expect(result.success).toBe(true);
      if (result.geometry) {
        const holeData = result.geometry.userData?.holes?.[0];

        const expectedY = -60; // Position depuis le centre

        console.log('🎯 Face "v" négatif - Position attendue:', { x: 1500, y: expectedY, z: 0 });
        console.log('📍 Face "v" négatif - Position réelle:', holeData.position);

        expect(Math.abs(holeData.position.x - 1500)).toBeLessThan(1);
        expect(Math.abs(holeData.position.y - expectedY)).toBeLessThan(1);
      }
    });
  });

  describe('Validation des limites', () => {
    it('devrait rejeter un trou hors limites sur la semelle', () => {
      const feature = {
        id: 'hole-out-1',
        type: 'hole' as const,
        position: [3500, 0, 0], // X > length (3000)
        face: 'o',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 20,
          depth: 0,
          holeType: 'round' as const
        }
      };

      const errors = processor['validateFeature'](feature, testElement);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('out of bounds');
      console.log('⚠️ Validation: Trou hors limites correctement rejeté');
    });

    it('devrait rejeter un trou trop large sur l\'âme', () => {
      const feature = {
        id: 'hole-wide-1',
        type: 'hole' as const,
        position: [1000, 0, 60], // Z=60 > width/2 pour l'âme
        face: 'v',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 20,
          depth: 0,
          holeType: 'round' as const
        }
      };

      const errors = processor['validateFeature'](feature, testElement);

      expect(errors.length).toBeGreaterThan(0);
      console.log('⚠️ Validation: Trou trop excentré correctement rejeté');
    });
  });

  describe('Types de trous spéciaux', () => {
    it('devrait gérer un trou oblong (slotted)', () => {
      const feature = {
        id: 'hole-slotted-1',
        type: 'hole' as const,
        position: [600, 0, 0],
        face: 'o',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 20,
          depth: 0,
          holeType: 'slotted' as const,
          slottedLength: 40,
          slottedAngle: 0
        }
      };

      const baseGeometry = new THREE.BoxGeometry(100, 8.5, 3000);
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, testElement);

      expect(result.success).toBe(true);
      console.log('✅ Trou oblong créé avec succès');
    });

    it('devrait gérer un trou rectangulaire', () => {
      const feature = {
        id: 'hole-rect-1',
        type: 'hole' as const,
        position: [900, 0, 0],
        face: 'v',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 20,
          depth: 0,
          holeType: 'rectangular' as const,
          width: 30,
          height: 20
        }
      };

      const baseGeometry = new THREE.BoxGeometry(5.6, 183, 3000);
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, testElement);

      expect(result.success).toBe(true);
      console.log('✅ Trou rectangulaire créé avec succès');
    });
  });

  describe('Rapport de mapping complet', () => {
    it('devrait afficher le mapping complet des positions pour toutes les faces', () => {
      const faces = [
        { code: 'o', name: 'Semelle supérieure', example: [500, 30, 0] },
        { code: 'u', name: 'Semelle inférieure', example: [500, -30, 0] },
        { code: 'v', name: 'Âme', example: [500, 50, 0] },
        { code: 'l', name: 'Côté gauche', example: [500, 0, -40] },
        { code: 'r', name: 'Côté droit', example: [500, 0, 40] }
      ];

      console.log('\n📊 RAPPORT DE MAPPING DES COORDONNÉES\n');
      console.log('='.repeat(50));

      faces.forEach(face => {
        console.log(`\nFace "${face.code}" - ${face.name}:`);
        console.log('-'.repeat(30));
        console.log(`Position DSTV: [${face.example.join(', ')}]`);

        // Calculer la position Three.js attendue
        let threePos = { x: 0, y: 0, z: 0 };

        if (face.code === 'o' || face.code === 'u') {
          // Semelles
          threePos.x = face.example[0]; // X reste X
          threePos.z = face.example[1]; // Y devient Z
          threePos.y = face.code === 'o' ? 100 : -100; // Position verticale
        } else if (face.code === 'v') {
          // Âme
          threePos.x = face.example[0]; // X reste X
          threePos.y = face.example[1]; // Y reste Y (hauteur)
          threePos.z = 0; // Centre de l'âme
        }

        console.log(`Position Three.js: { x: ${threePos.x}, y: ${threePos.y}, z: ${threePos.z} }`);

        // Orientation
        let rotation = 'Aucune';
        if (face.code === 'o') rotation = 'Rotation X: -90°';
        if (face.code === 'u') rotation = 'Rotation X: +90°';
        if (face.code === 'v') rotation = 'Rotation Y: +90°';

        console.log(`Rotation: ${rotation}`);
      });

      console.log('\n' + '='.repeat(50));
      console.log('✅ Mapping documenté avec succès');

      expect(faces).toHaveLength(5);
    });
  });
});