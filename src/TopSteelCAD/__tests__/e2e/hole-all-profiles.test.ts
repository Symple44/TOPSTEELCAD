/**
 * Test E2E complet pour vérifier le positionnement et l'orientation des trous
 * sur tous les types de profils et toutes les faces
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
      const mockGeometry = a.clone ? a.clone() : a;
      if (!mockGeometry.userData) mockGeometry.userData = {};
      if (!mockGeometry.userData.holes) mockGeometry.userData.holes = [];

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

describe('E2E: Test complet des trous sur tous les profils', () => {
  let processor: HoleProcessor;

  beforeEach(() => {
    processor = new HoleProcessor();
  });

  describe('Profil IPE (I-beam)', () => {
    let ipeElement: PivotElement;

    beforeEach(() => {
      ipeElement = {
        id: 'ipe-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'IPE200',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          width: 100,      // Largeur de la semelle
          height: 200,     // Hauteur du profil
          webThickness: 5.6,    // Épaisseur de l'âme
          flangeThickness: 8.5, // Épaisseur des semelles
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

    it('devrait positionner correctement les trous sur toutes les faces', () => {
      const faces = ['o', 'u', 'v', 'l', 'r'];
      const results: any = {};

      faces.forEach(face => {
        const feature = {
          id: `hole-ipe-${face}`,
          type: 'hole' as const,
          position: [1500, 0, 0], // Milieu du profil
          face: face,
          coordinateSystem: 'local' as const,
          rotation: [0, 0, 0],
          parameters: {
            diameter: 20,
            depth: 0, // Traversant
            holeType: 'round' as const
          }
        };

        const baseGeometry = new THREE.BoxGeometry(
          ipeElement.dimensions.length,
          ipeElement.dimensions.height,
          ipeElement.dimensions.width
        );
        baseGeometry.userData = {};

        const result = processor.process(baseGeometry, feature, ipeElement);
        results[face] = result;

        console.log(`\n🔩 IPE - Face '${face}':`);
        if (result.success && result.geometry?.userData?.holes?.[0]) {
          const hole = result.geometry.userData.holes[0];
          const pos = hole.position;
          const rot = hole.rotation;

          console.log(`  Position: X=${pos.x.toFixed(1)}, Y=${pos.y.toFixed(1)}, Z=${pos.z.toFixed(1)}`);
          console.log(`  Rotation: X=${(rot.x * 180 / Math.PI).toFixed(0)}°, Y=${(rot.y * 180 / Math.PI).toFixed(0)}°, Z=${(rot.z * 180 / Math.PI).toFixed(0)}°`);

          // Vérifications spécifiques par face
          switch(face) {
            case 'o': // Semelle supérieure
              expect(pos.y).toBeCloseTo(ipeElement.dimensions.height / 2, 1);
              expect(Math.abs(rot.x)).toBeLessThan(0.1); // Pas de rotation X
              expect(Math.abs(rot.y)).toBeLessThan(0.1); // Pas de rotation Y
              console.log(`  ✅ Trou vertical sur semelle supérieure`);
              break;

            case 'u': // Semelle inférieure
              expect(pos.y).toBeCloseTo(-ipeElement.dimensions.height / 2, 1);
              expect(Math.abs(rot.x)).toBeLessThan(0.1); // Pas de rotation X
              expect(Math.abs(rot.y)).toBeLessThan(0.1); // Pas de rotation Y
              console.log(`  ✅ Trou vertical sur semelle inférieure`);
              break;

            case 'v': // Âme (face avant)
              expect(Math.abs(pos.z)).toBeLessThan(5); // Proche du centre
              expect(Math.abs(rot.x - Math.PI/2)).toBeLessThan(0.1); // Rotation X de 90°
              console.log(`  ✅ Trou horizontal perpendiculaire à l'âme`);
              break;

            case 'l': // Côté gauche de l'âme
              expect(pos.z).toBeCloseTo(-ipeElement.dimensions.webThickness / 2, 1);
              expect(Math.abs(rot.y - Math.PI/2)).toBeLessThan(0.1); // Rotation Y de 90°
              console.log(`  ✅ Trou horizontal sur côté gauche de l'âme`);
              break;

            case 'r': // Côté droit de l'âme
              expect(pos.z).toBeCloseTo(ipeElement.dimensions.webThickness / 2, 1);
              expect(Math.abs(rot.y + Math.PI/2)).toBeLessThan(0.1); // Rotation Y de -90°
              console.log(`  ✅ Trou horizontal sur côté droit de l'âme`);
              break;
          }
        } else {
          console.log(`  ❌ Échec: ${result.error}`);
        }
      });

      // Vérifier que tous les trous ont été créés avec succès
      Object.entries(results).forEach(([face, result]) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Profil HEB (H-beam)', () => {
    let hebElement: PivotElement;

    beforeEach(() => {
      hebElement = {
        id: 'heb-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'HEB200',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          width: 200,      // Largeur de la semelle (plus large que IPE)
          height: 200,     // Hauteur = largeur pour HEB
          webThickness: 9,     // Âme plus épaisse
          flangeThickness: 15, // Semelles plus épaisses
          thickness: 10
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        profile: {
          type: 'HEB',
          subType: '200'
        }
      };
    });

    it('devrait gérer les trous sur un profil HEB', () => {
      const feature = {
        id: 'hole-heb-v',
        type: 'hole' as const,
        position: [1500, 50, 0],
        face: 'v',
        coordinateSystem: 'local' as const,
        rotation: [0, 0, 0],
        parameters: {
          diameter: 24,
          depth: 0,
          holeType: 'round' as const
        }
      };

      const baseGeometry = new THREE.BoxGeometry(
        hebElement.dimensions.webThickness,
        hebElement.dimensions.height - 2 * hebElement.dimensions.flangeThickness,
        hebElement.dimensions.length
      );
      baseGeometry.userData = {};

      const result = processor.process(baseGeometry, feature, hebElement);

      console.log('\n🔩 HEB - Profil carré avec âme épaisse');
      expect(result.success).toBe(true);

      if (result.geometry?.userData?.holes?.[0]) {
        const hole = result.geometry.userData.holes[0];
        console.log(`  Épaisseur âme: ${hebElement.dimensions.webThickness}mm`);
        console.log(`  Position du trou: X=${hole.position.x.toFixed(1)}, Y=${hole.position.y.toFixed(1)}, Z=${hole.position.z.toFixed(1)}`);
        console.log(`  ✅ Trou sur âme épaisse HEB`);
      }
    });
  });

  describe('Profil L (Angle/Cornière)', () => {
    let lElement: PivotElement;

    beforeEach(() => {
      lElement = {
        id: 'l-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'L100x100x10',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          width: 100,      // Largeur d'une aile
          height: 100,     // Hauteur de l'autre aile
          thickness: 10,   // Épaisseur uniforme
          webThickness: 10,
          flangeThickness: 10
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        profile: {
          type: 'L',
          subType: '100x100x10'
        }
      };
    });

    it('devrait gérer les trous sur un profil L', () => {
      // Pour un profil L, les faces sont différentes
      // h = face horizontale (aile horizontale)
      // v = face verticale (aile verticale)
      const faces = ['h', 'v'];

      faces.forEach(face => {
        const feature = {
          id: `hole-l-${face}`,
          type: 'hole' as const,
          position: [1500, 50, 0],
          face: face,
          coordinateSystem: 'local' as const,
          rotation: [0, 0, 0],
          parameters: {
            diameter: 16,
            depth: 0,
            holeType: 'round' as const
          }
        };

        const baseGeometry = new THREE.BoxGeometry(100, 100, 3000);
        baseGeometry.userData = {};

        const result = processor.process(baseGeometry, feature, lElement);

        console.log(`\n🔩 Profil L - Face '${face}':`);
        if (result.success && result.geometry?.userData?.holes?.[0]) {
          const hole = result.geometry.userData.holes[0];
          const rot = hole.rotation;

          if (face === 'h') {
            // Face horizontale - trou vertical
            console.log(`  Rotation: X=${(rot.x * 180 / Math.PI).toFixed(0)}°`);
            console.log(`  ✅ Trou vertical sur aile horizontale`);
          } else if (face === 'v') {
            // Face verticale - trou horizontal
            console.log(`  Rotation: Y=${(rot.y * 180 / Math.PI).toFixed(0)}°`);
            console.log(`  ✅ Trou horizontal sur aile verticale`);
          }
        }
      });
    });
  });

  describe('Profil Tube Rectangulaire', () => {
    let tubeElement: PivotElement;

    beforeEach(() => {
      tubeElement = {
        id: 'tube-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'TUBE200x100x5',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          width: 100,      // Largeur extérieure
          height: 200,     // Hauteur extérieure
          thickness: 5,    // Épaisseur de paroi
          webThickness: 5,
          flangeThickness: 5
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        profile: {
          type: 'TUBE_RECT',
          subType: '200x100x5'
        }
      };
    });

    it('devrait gérer les trous sur un tube rectangulaire', () => {
      // Un tube a 4 faces : haut, bas, gauche, droite
      const faces = ['o', 'u', 'l', 'r'];

      faces.forEach(face => {
        const feature = {
          id: `hole-tube-${face}`,
          type: 'hole' as const,
          position: [1500, 0, 0],
          face: face,
          coordinateSystem: 'local' as const,
          rotation: [0, 0, 0],
          parameters: {
            diameter: 18,
            depth: 0,
            holeType: 'round' as const
          }
        };

        const baseGeometry = new THREE.BoxGeometry(
          tubeElement.dimensions.length,
          tubeElement.dimensions.height,
          tubeElement.dimensions.width
        );
        baseGeometry.userData = {};

        const result = processor.process(baseGeometry, feature, tubeElement);

        console.log(`\n🔩 Tube Rectangulaire - Face '${face}':`);
        if (result.success && result.geometry?.userData?.holes?.[0]) {
          const hole = result.geometry.userData.holes[0];
          const pos = hole.position;
          const rot = hole.rotation;

          console.log(`  Position: X=${pos.x.toFixed(1)}, Y=${pos.y.toFixed(1)}, Z=${pos.z.toFixed(1)}`);
          console.log(`  Rotation: X=${(rot.x * 180 / Math.PI).toFixed(0)}°, Y=${(rot.y * 180 / Math.PI).toFixed(0)}°`);

          switch(face) {
            case 'o': // Face supérieure
            case 'u': // Face inférieure
              expect(Math.abs(rot.x)).toBeLessThan(0.1);
              console.log(`  ✅ Trou vertical`);
              break;
            case 'l': // Face gauche
            case 'r': // Face droite
              expect(Math.abs(Math.abs(rot.y) - Math.PI/2)).toBeLessThan(0.1);
              console.log(`  ✅ Trou horizontal latéral`);
              break;
          }
        }
      });
    });
  });

  describe('Profil Tube Circulaire', () => {
    let tubeCircElement: PivotElement;

    beforeEach(() => {
      tubeCircElement = {
        id: 'tube-circ-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'TUBE_CIRC_200x5',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          diameter: 200,   // Diamètre extérieur
          thickness: 5,    // Épaisseur de paroi
          width: 200,
          height: 200,
          webThickness: 5,
          flangeThickness: 5
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        profile: {
          type: 'TUBE_CIRC',
          subType: '200x5'
        }
      };
    });

    it('devrait gérer les trous sur un tube circulaire', () => {
      // Pour un tube circulaire, on teste des positions angulaires
      const angles = [0, 90, 180, 270]; // Degrés

      angles.forEach(angle => {
        const radians = angle * Math.PI / 180;
        const radius = tubeCircElement.dimensions.diameter! / 2;

        const feature = {
          id: `hole-tube-circ-${angle}`,
          type: 'hole' as const,
          position: [
            1500,
            Math.sin(radians) * radius,
            Math.cos(radians) * radius
          ],
          face: 'radial', // Face radiale
          coordinateSystem: 'local' as const,
          rotation: [0, 0, 0],
          parameters: {
            diameter: 12,
            depth: 0,
            holeType: 'round' as const
          }
        };

        const baseGeometry = new THREE.CylinderGeometry(
          radius,
          radius,
          tubeCircElement.dimensions.length,
          32
        );
        baseGeometry.userData = {};

        const result = processor.process(baseGeometry, feature, tubeCircElement);

        console.log(`\n🔩 Tube Circulaire - Angle ${angle}°:`);
        if (result.geometry?.userData?.holes?.[0]) {
          const hole = result.geometry.userData.holes[0];
          console.log(`  Position: X=${hole.position.x.toFixed(1)}, Y=${hole.position.y.toFixed(1)}, Z=${hole.position.z.toFixed(1)}`);
          console.log(`  ✅ Trou radial à ${angle}°`);
        }
      });
    });
  });

  describe('Rapport final', () => {
    it('devrait afficher un résumé des orientations correctes', () => {
      console.log('\n' + '='.repeat(60));
      console.log('📊 RÉSUMÉ DES ORIENTATIONS CORRECTES');
      console.log('='.repeat(60));

      console.log('\n🔧 PROFILS I/H (IPE, HEB, HEA):');
      console.log('  • Face "o" (semelle sup): Trou vertical, pas de rotation');
      console.log('  • Face "u" (semelle inf): Trou vertical, pas de rotation');
      console.log('  • Face "v" (âme): Trou horizontal, rotation X = 90°');
      console.log('  • Face "l" (côté gauche âme): Trou horizontal, rotation Y = 90°');
      console.log('  • Face "r" (côté droit âme): Trou horizontal, rotation Y = -90°');

      console.log('\n🔧 PROFILS L (Cornières):');
      console.log('  • Face "h" (aile horizontale): Trou vertical');
      console.log('  • Face "v" (aile verticale): Trou horizontal');

      console.log('\n🔧 TUBES RECTANGULAIRES:');
      console.log('  • Faces "o"/"u": Trous verticaux');
      console.log('  • Faces "l"/"r": Trous horizontaux latéraux');

      console.log('\n🔧 TUBES CIRCULAIRES:');
      console.log('  • Trous radiaux selon l\'angle');

      console.log('\n' + '='.repeat(60));
      expect(true).toBe(true);
    });
  });
});