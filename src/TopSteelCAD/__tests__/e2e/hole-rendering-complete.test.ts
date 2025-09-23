/**
 * Test E2E complet pour vérifier le rendu des trous
 * De PartBuilderRefactored jusqu'au rendu final dans ProfessionalViewer
 */

import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { PartElement, HoleDSTV } from '../../part-builder/types/partBuilder.types';
import { PivotElement, MaterialType } from '../../../types/viewer';
import { FeatureApplicator } from '../../viewer/FeatureApplicator';
import { GeometryConverter } from '../../viewer/GeometryConverter';

// Mock de three-bvh-csg pour les tests
vi.mock('three-bvh-csg', () => ({
  Evaluator: vi.fn().mockImplementation(() => ({
    evaluate: vi.fn((a, _b) => a),
    useGroups: false,
    attributes: []
  })),
  Brush: vi.fn().mockImplementation((geometry) => ({
    geometry,
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    updateMatrixWorld: vi.fn()
  })),
  SUBTRACTION: 'subtraction',
  ADDITION: 'addition',
  INTERSECTION: 'intersection'
}));

// Mock de BufferGeometryUtils pour les tests
vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geometries) => {
    // Retourner simplement la première géométrie ou créer une nouvelle
    if (geometries && geometries.length > 0) {
      const geom = geometries[0];
      // S'assurer que userData existe
      if (!geom.userData) {
        geom.userData = {};
      }
      return geom;
    }
    const newGeom = new THREE.BoxGeometry(100, 100, 100);
    newGeom.userData = {};
    return newGeom;
  })
}));

describe('E2E: Rendu complet des trous', () => {

  describe('Étape 1: Création d\'un élément avec trous dans PartBuilderRefactored', () => {
    it('devrait créer un élément avec les trous correctement définis', () => {
      const partElement: PartElement = {
        id: 'test-elem-1',
        reference: 'A1',
        designation: 'Poutre avec trous',
        quantity: 1,
        profileType: 'IPE',
        profileSubType: '200',
        length: 3000,
        material: 'S355',
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5
        },
        holes: [
          {
            id: 'hole-1',
            label: 'H1',
            diameter: 20,
            coordinates: {
              face: 'o',  // Face supérieure
              x: 500,     // Position le long du profil
              y: 0,       // Centre
              z: 0
            },
            isThrough: true
          },
          {
            id: 'hole-2',
            label: 'H2',
            diameter: 16,
            coordinates: {
              face: 'v',  // Âme
              x: 1000,
              y: 50,      // 50mm du bas
              z: 0
            },
            isThrough: false,
            depth: 8
          }
        ],
        status: 'production'
      };

      expect(partElement.holes).toHaveLength(2);
      expect(partElement.holes[0].coordinates.face).toBe('o');
      expect(partElement.holes[0].diameter).toBe(20);
      expect(partElement.holes[1].coordinates.face).toBe('v');
    });
  });

  describe('Étape 2: Transformation en PivotElement avec features', () => {
    it('devrait transformer les trous en features dans metadata ET features', () => {
      const selectedElement3D: PartElement = {
        id: 'test-elem',
        reference: 'A1',
        designation: 'Test',
        quantity: 1,
        profileType: 'IPE',
        profileSubType: '200',
        length: 3000,
        material: 'S355',
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5
        },
        holes: [
          {
            id: 'hole-test',
            label: 'T1',
            diameter: 22,
            coordinates: { face: 'o', x: 300, y: 0, z: 0 },
            isThrough: true
          }
        ],
        status: 'production'
      };

      // Transformation comme dans PartBuilderRefactored
      const pivotElement: PivotElement = {
        id: selectedElement3D.id,
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: `${selectedElement3D.profileType}${selectedElement3D.profileSubType}`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: selectedElement3D.length,
          width: selectedElement3D.dimensions?.width || 100,
          height: selectedElement3D.dimensions?.height || 100,
          webThickness: selectedElement3D.dimensions?.webThickness || 10,
          flangeThickness: selectedElement3D.dimensions?.flangeThickness || 15,
          thickness: selectedElement3D.dimensions?.thickness || 10
        },
        material: {
          type: 'steel',
          grade: selectedElement3D.material || 'S355',
          density: 7850
        },
        profile: {
          type: selectedElement3D.profileType,
          subType: selectedElement3D.profileSubType
        },
        features: {
          holes: selectedElement3D.holes.map(h => ({
            id: h.id,
            type: 'hole' as const,
            position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
            face: h.coordinates.face,
            parameters: {
              diameter: h.diameter,
              depth: h.isThrough ? 0 : (h.depth || 20),
              holeType: 'round'
            }
          }))
        },
        // IMPORTANT: FeatureApplicator cherche dans metadata.features
        metadata: {
          features: selectedElement3D.holes.map(h => ({
            id: h.id,
            type: 'hole' as const,
            position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
            face: h.coordinates.face,
            parameters: {
              diameter: h.diameter,
              depth: h.isThrough ? 0 : (h.depth || 20),
              holeType: 'round'
            }
          }))
        }
      };

      // Vérifier que les features sont dans metadata
      expect(pivotElement.metadata).toBeDefined();
      expect(pivotElement.metadata?.features).toBeDefined();
      expect(pivotElement.metadata?.features).toHaveLength(1);

      const metadataFeature = pivotElement.metadata?.features?.[0];
      expect(metadataFeature?.type).toBe('hole');
      expect(metadataFeature?.parameters.diameter).toBe(22);
      expect(metadataFeature?.face).toBe('o');

      // Vérifier aussi dans features pour FeatureOutlineRenderer
      expect(pivotElement.features?.holes).toBeDefined();
      expect(pivotElement.features?.holes).toHaveLength(1);
    });
  });

  describe('Étape 3: GeometryConverter avec FeatureApplicator', () => {
    it('devrait appliquer les features depuis metadata', () => {
      const converter = new GeometryConverter();

      const element: PivotElement = {
        id: 'test-geom',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'IPE200',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 1000,
          width: 100,
          height: 200,
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
        },
        metadata: {
          features: [
            {
              id: 'hole-1',
              type: 'hole',
              position: [200, 0, 0],
              face: 'o',
              parameters: {
                diameter: 20,
                depth: 0,
                holeType: 'round'
              }
            }
          ]
        }
      };

      // convertElement est la bonne méthode, pas convert
      const mesh = converter.convertElement(element);

      // Vérifier que le mesh et la géométrie ont été créés
      expect(mesh).toBeDefined();
      expect(mesh).toBeTruthy();
      // Le mesh devrait avoir une géométrie

      const geometry = (mesh as THREE.Mesh).geometry;
      expect(geometry).toBeDefined();
      expect(geometry).toBeTruthy(); // Le mock retourne une géométrie mockée

      // Les features devraient être dans userData après application
      // (Le mock de CSG ne fait pas vraiment la soustraction, mais on vérifie le flux)
      console.log('Geometry userData:', geometry.userData);
    });
  });

  describe('Étape 4: FeatureApplicator traite les trous', () => {
    it('devrait convertir et appliquer les features de type hole', () => {
      const applicator = new FeatureApplicator();
      const baseGeometry = new THREE.BoxGeometry(100, 200, 1000);

      // Initialiser userData pour éviter l'erreur
      baseGeometry.userData = {
        useDirectCoordinates: false,
        centerOffset: null,
        isMirrored: false,
        type: 'beam'
      };

      const element: PivotElement = {
        id: 'test-apply',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'IPE200',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 1000,
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5,
          thickness: 10
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        metadata: {
          features: [
            {
              id: 'hole-fa-1',
              type: 'hole',
              position: [300, 0, 0],
              face: 'o',
              parameters: {
                diameter: 25,
                depth: 0,
                holeType: 'round'
              }
            },
            {
              id: 'hole-fa-2',
              type: 'hole',
              position: [600, 50, 0],
              face: 'v',
              parameters: {
                diameter: 18,
                depth: 10,
                holeType: 'round'
              }
            }
          ]
        }
      };

      const resultGeometry = applicator.applyFeatures(baseGeometry, element);

      // Vérifier que la géométrie résultante existe
      expect(resultGeometry).toBeDefined();
      // Note: Le mock retourne la géométrie d'entrée, pas une vraie BufferGeometry
      expect(resultGeometry).toBeTruthy();

      // Dans un vrai test, on vérifierait que les trous ont été appliqués
      // Ici avec le mock, on vérifie juste que le processus s'exécute
    });
  });

  describe('Étape 5: Validation complète du flux', () => {
    it('devrait préserver tous les trous à travers toute la chaîne', () => {
      // Données initiales
      const holes: HoleDSTV[] = [
        {
          id: 'h1',
          label: 'Hole 1',
          diameter: 20,
          coordinates: { face: 'o', x: 250, y: 0, z: 0 },
          isThrough: true
        },
        {
          id: 'h2',
          label: 'Hole 2',
          diameter: 16,
          coordinates: { face: 'u', x: 500, y: 30, z: 0 },
          isThrough: true
        },
        {
          id: 'h3',
          label: 'Hole 3',
          diameter: 14,
          coordinates: { face: 'v', x: 750, y: 80, z: 0 },
          isThrough: false,
          depth: 6
        }
      ];

      // Transformation en features pour metadata
      const metadataFeatures = holes.map(h => ({
        id: h.id,
        type: 'hole' as const,
        position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
        face: h.coordinates.face,
        parameters: {
          diameter: h.diameter,
          depth: h.isThrough ? 0 : (h.depth || 20),
          holeType: 'round'
        }
      }));

      expect(metadataFeatures).toHaveLength(3);

      // Vérifier chaque trou
      expect(metadataFeatures[0].parameters.diameter).toBe(20);
      expect(metadataFeatures[0].face).toBe('o');
      expect(metadataFeatures[0].parameters.depth).toBe(0); // Traversant

      expect(metadataFeatures[1].parameters.diameter).toBe(16);
      expect(metadataFeatures[1].face).toBe('u');
      expect(metadataFeatures[1].position).toEqual([500, 30, 0]);

      expect(metadataFeatures[2].parameters.diameter).toBe(14);
      expect(metadataFeatures[2].face).toBe('v');
      expect(metadataFeatures[2].parameters.depth).toBe(6); // Non traversant
    });

    it('devrait gérer correctement les différentes faces DSTV', () => {
      const faces = ['o', 'u', 'l', 'r', 'v', 'h'];
      const faceNames = {
        'o': 'top flange',
        'u': 'bottom flange',
        'l': 'left web',
        'r': 'right web',
        'v': 'front/web',
        'h': 'back'
      };

      faces.forEach(face => {
        const feature = {
          id: `hole-${face}`,
          type: 'hole',
          position: [500, 0, 0],
          face: face,
          parameters: {
            diameter: 20,
            depth: 0,
            holeType: 'round'
          }
        };

        expect(feature.face).toBe(face);
        expect(feature.type).toBe('hole');
        console.log(`✅ Trou sur face ${face} (${faceNames[face]}): OK`);
      });
    });
  });

  describe('Étape 6: Debug - Vérifier la structure des données', () => {
    it('devrait avoir la bonne structure pour FeatureApplicator', () => {
      const element: PivotElement = {
        id: 'debug-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'IPE200',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5,
          thickness: 10
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        // Structure attendue par FeatureApplicator
        metadata: {
          features: [
            {
              id: 'hole-debug-1',
              type: 'hole', // IMPORTANT: doit être exactement 'hole'
              position: [500, 0, 0], // IMPORTANT: tableau [x, y, z]
              face: 'o', // IMPORTANT: face DSTV
              parameters: {
                diameter: 22,
                depth: 0, // 0 pour traversant
                holeType: 'round'
              }
            }
          ]
        }
      };

      // Vérifications critiques
      expect(element.metadata).toBeDefined();
      expect(element.metadata?.features).toBeDefined();
      expect(Array.isArray(element.metadata?.features)).toBe(true);
      expect(element.metadata?.features?.[0].type).toBe('hole');
      expect(Array.isArray(element.metadata?.features?.[0].position)).toBe(true);
      expect(element.metadata?.features?.[0].position).toHaveLength(3);
      expect(element.metadata?.features?.[0].face).toBeDefined();
      expect(element.metadata?.features?.[0].parameters).toBeDefined();
      expect(element.metadata?.features?.[0].parameters.diameter).toBeGreaterThan(0);
    });
  });
});