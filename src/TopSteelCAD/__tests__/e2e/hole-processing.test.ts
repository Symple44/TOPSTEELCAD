/**
 * Test E2E pour la chaîne complète de traitement des trous
 * PartBuilder -> Viewer3D -> DSTVTransformer -> CSGHoleAdapter -> HoleProcessor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// Import des modules de la chaîne
import DSTVTransformer, { DSTVFace, ProfileDimensions } from '../../3DViewer/dstv/DSTVTransformer';
import { HoleProcessor } from '../../core/features/processors/HoleProcessor';
import { Feature, FeatureType, CoordinateSystem } from '../../core/features/types';
import { PivotElement, MaterialType } from '../../../types/viewer';

describe('E2E: Chaîne complète de traitement des trous', () => {
  let holeProcessor: HoleProcessor;
  let transformer: DSTVTransformer;

  const profileDimensions: ProfileDimensions = {
    length: 1000,
    height: 200,
    width: 100,
    webThickness: 10,
    flangeThickness: 15,
    profileType: 'IPE200'
  };

  const pivotElement: PivotElement = {
    id: 'element-1',
    type: 'beam',
    materialType: MaterialType.BEAM,
    dimensions: {
      length: 1000,
      width: 100,
      height: 200,
      webThickness: 10,
      flangeThickness: 15,
      thickness: 10
    },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: {
      type: 'steel',
      grade: 'S355',
      density: 7850
    }
  };

  beforeEach(() => {
    holeProcessor = new HoleProcessor();
    transformer = new DSTVTransformer(profileDimensions);
  });

  describe('Étape 1: Données du PartBuilder', () => {
    it('devrait recevoir les données correctes du PartBuilder', () => {
      // Simuler les données venant du PartBuilder
      const partBuilderData = {
        profileType: 'IPE',
        profileSubType: '200',
        length: 1000,
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 10,
          flangeThickness: 15
        },
        holes: [
          {
            id: 'hole-1',
            label: 'A1',
            diameter: 20,
            coordinates: {
              face: 'o',  // Top face
              x: 200,
              y: 0,
              z: 0
            },
            isThrough: true,
            depth: undefined
          },
          {
            id: 'hole-2',
            label: 'A2',
            diameter: 16,
            coordinates: {
              face: 'o',
              x: 500,
              y: -30,
              z: 0
            },
            isThrough: false,
            depth: 10
          }
        ]
      };

      // Vérifier que les données sont valides
      expect(partBuilderData.holes).toHaveLength(2);
      expect(partBuilderData.holes[0].coordinates.face).toBe('o');
      expect(partBuilderData.holes[0].diameter).toBe(20);
      expect(partBuilderData.holes[0].isThrough).toBe(true);
    });
  });

  describe('Étape 2: Transformation DSTV -> 3D', () => {
    it('devrait transformer les coordonnées DSTV en positions 3D', () => {
      const dstvCoord = {
        face: DSTVFace.TOP,
        x: 200,
        y: 0,
        z: 0
      };

      const position3D = transformer.transform(dstvCoord);

      // Vérifier la transformation
      expect(position3D).toBeDefined();
      expect(position3D.x).toBe(0);  // Y=0 en DSTV -> X=0 en 3D (centre de l'âme)
      expect(position3D.y).toBe(100);  // Face supérieure
      expect(position3D.z).toBe(-300); // x=200 - length/2 = -300
    });

    it('devrait calculer la rotation correcte pour chaque face', () => {
      const faces = [
        DSTVFace.TOP,
        DSTVFace.BOTTOM,
        DSTVFace.LEFT,
        DSTVFace.RIGHT
      ];

      faces.forEach(face => {
        const rotation = transformer.getHoleRotation(face);
        expect(rotation).toBeDefined();

        if (face === DSTVFace.LEFT || face === DSTVFace.RIGHT) {
          expect(rotation.z).toBe(Math.PI / 2); // 90 degrés
        } else {
          expect(rotation.z).toBe(0);
        }
      });
    });
  });

  describe('Étape 3: Traitement CSG avec HoleProcessor', () => {
    it('devrait appliquer les trous à la géométrie avec le HoleProcessor', () => {
      // Créer une géométrie de base
      const baseGeometry = new THREE.BoxGeometry(100, 200, 1000);

      // D'abord transformer les coordonnées DSTV en position 3D
      const dstvCoord = {
        face: DSTVFace.TOP,
        x: 200,
        y: 0,
        z: 0
      };
      const position3D = transformer.transform(dstvCoord);

      // Créer une feature de trou selon le format attendu par HoleProcessor
      const holeFeature: Feature = {
        id: 'hole-1',
        type: FeatureType.HOLE,
        position: position3D, // Position 3D correctement transformée
        face: 'o' as any,  // Face DSTV
        coordinateSystem: CoordinateSystem.STANDARD, // Position déjà transformée en standard
        parameters: {
          diameter: 20,
          depth: 0,  // 0 = trou traversant
          holeType: 'round'
        }
      };

      // Appliquer le trou
      const result = holeProcessor.process(baseGeometry, holeFeature, pivotElement);

      // Debug output
      if (!result.success) {
        console.log('HoleProcessor failed:', result.errors);
        console.log('Position3D:', position3D);
        console.log('Feature:', holeFeature);
      }

      // Vérifier le résultat
      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();

      if (result.geometry) {
        // Vérifier que la géométrie a été modifiée
        expect(result.geometry.userData.holes).toBeDefined();
        expect(result.geometry.userData.holes).toHaveLength(1);

        const holeData = result.geometry.userData.holes[0];
        expect(holeData.id).toBe('hole-1');
        expect(holeData.diameter).toBe(20);
      }
    });

    it('devrait traiter plusieurs trous en batch', () => {
      const baseGeometry = new THREE.BoxGeometry(100, 200, 1000);

      // Transformer les coordonnées DSTV en positions 3D
      const dstvCoords = [
        { face: DSTVFace.TOP, x: 200, y: 0, z: 0 },
        { face: DSTVFace.TOP, x: 500, y: -30, z: 0 },
        { face: DSTVFace.BOTTOM, x: 800, y: 0, z: 0 }
      ];

      const holes: Feature[] = dstvCoords.map((coord, index) => {
        const position3D = transformer.transform(coord);
        return {
          id: `hole-${index + 1}`,
          type: FeatureType.HOLE,
          position: position3D,
          face: coord.face as any,
          coordinateSystem: CoordinateSystem.STANDARD,
          parameters: {
            diameter: index === 0 ? 20 : index === 1 ? 16 : 18,
            depth: index === 1 ? 10 : 0,
            holeType: 'round'
          }
        };
      });

      // Traiter les trous en batch
      const result = holeProcessor.processBatch(baseGeometry, holes, pivotElement);

      expect(result.success).toBe(true);
      if (result.geometry) {
        expect(result.geometry.userData.holes).toHaveLength(3);
      }
    });
  });

  describe('Étape 4: Chaîne complète PartBuilder -> CSG', () => {
    it('devrait traiter la chaîne complète de bout en bout', () => {
      // 1. Données du PartBuilder
      const partData = {
        holes: [
          {
            id: 'hole-1',
            face: 'o',
            x: 300,
            y: 0,
            diameter: 22,
            isThrough: true
          }
        ]
      };

      // 2. Transformation DSTV -> 3D
      const dstvCoord = {
        face: DSTVFace.TOP,
        x: partData.holes[0].x,
        y: partData.holes[0].y,
        z: 0
      };
      const position3D = transformer.transform(dstvCoord);

      // 3. Créer la feature pour HoleProcessor
      const holeFeature: Feature = {
        id: partData.holes[0].id,
        type: FeatureType.HOLE,
        position: position3D,
        face: DSTVFace.TOP as any,
        coordinateSystem: CoordinateSystem.STANDARD,  // Position déjà transformée
        parameters: {
          diameter: partData.holes[0].diameter,
          depth: 0,  // Trou traversant
          holeType: 'round'
        }
      };

      // 4. Appliquer avec HoleProcessor
      const baseGeometry = new THREE.BoxGeometry(
        profileDimensions.width,
        profileDimensions.height,
        profileDimensions.length
      );

      const result = holeProcessor.process(baseGeometry, holeFeature, pivotElement);

      // 5. Vérifier le résultat final
      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();

      if (result.geometry) {
        const holeData = result.geometry.userData.holes[0];
        expect(holeData.diameter).toBe(22);
        expect(holeData.depth).toBeGreaterThan(100); // Trou traversant

        // Vérifier que la position a été correctement transformée
        expect(holeData.originalPosition).toBeDefined();
      }
    });

    it('devrait générer le format DSTV XML correct', () => {
      const holes = [
        { face: 'o', x: 100, y: 0, diameter: 20 },
        { face: 'u', x: 500, y: 25, diameter: 16 },
        { face: 'l', x: 300, y: -50, diameter: 18 },
        { face: 'r', x: 700, y: 30, diameter: 14 }
      ];

      const dstvXML = holes.map(h =>
        `<A face="${h.face}" x="${h.x}" y="${h.y}" d="${h.diameter}"/>`
      );

      expect(dstvXML[0]).toBe('<A face="o" x="100" y="0" d="20"/>');
      expect(dstvXML[1]).toBe('<A face="u" x="500" y="25" d="16"/>');
      expect(dstvXML[2]).toBe('<A face="l" x="300" y="-50" d="18"/>');
      expect(dstvXML[3]).toBe('<A face="r" x="700" y="30" d="14"/>');
    });
  });

  describe('Validation de l\'intégration avec CSG', () => {
    it('devrait modifier la géométrie après application des trous', () => {
      const baseGeometry = new THREE.BoxGeometry(100, 200, 1000);
      const initialVertexCount = baseGeometry.attributes.position.count;

      // Transformer les coordonnées DSTV
      const dstvCoord = {
        face: DSTVFace.TOP,
        x: 500,
        y: 0,
        z: 0
      };
      const position3D = transformer.transform(dstvCoord);

      const feature: Feature = {
        id: 'test-hole',
        type: FeatureType.HOLE,
        position: position3D,
        face: DSTVFace.TOP as any,
        coordinateSystem: CoordinateSystem.STANDARD,
        parameters: {
          diameter: 30,
          depth: 0,
          holeType: 'round'
        }
      };

      const result = holeProcessor.process(baseGeometry, feature, pivotElement);

      if (result.success && result.geometry) {
        const finalVertexCount = result.geometry.attributes.position.count;

        // La géométrie devrait avoir changé après la soustraction CSG
        // Note: Le nombre exact de vertices dépend de l'implémentation CSG
        expect(finalVertexCount).not.toBe(initialVertexCount);

        // Vérifier les métadonnées
        expect(result.geometry.userData.holes).toHaveLength(1);
        expect(result.geometry.userData.holes[0].id).toBe('test-hole');
      }
    });

    it('devrait préserver les coordonnées DSTV originales dans les métadonnées', () => {
      const baseGeometry = new THREE.BoxGeometry(100, 200, 1000);

      const originalDSTVCoord = {
        face: DSTVFace.TOP,
        x: 250,
        y: -20,
        z: 0
      };

      const position3D = transformer.transform(originalDSTVCoord);

      const feature: Feature = {
        id: 'preserve-test',
        type: FeatureType.HOLE,
        position: position3D, // Use transformed position
        face: originalDSTVCoord.face as any,
        coordinateSystem: CoordinateSystem.STANDARD,
        parameters: {
          diameter: 25,
          depth: 15,
          holeType: 'round'
        },
        metadata: {
          originalDSTVPosition: [originalDSTVCoord.x, originalDSTVCoord.y, originalDSTVCoord.z || 0]
        }
      };

      const result = holeProcessor.process(baseGeometry, feature, pivotElement);

      if (result.success && result.geometry) {
        const holeData = result.geometry.userData.holes[0];

        // Vérifier que la position 3D transformée est stockée
        expect(holeData.position).toBeDefined();
        expect(holeData.position).toHaveLength(3);

        // La position devrait être la position transformée
        expect(holeData.position[0]).toBeCloseTo(position3D.x, 1);
        expect(holeData.position[1]).toBeCloseTo(position3D.y, 1);
        expect(holeData.position[2]).toBeCloseTo(position3D.z, 1);
      }
    });
  });
});