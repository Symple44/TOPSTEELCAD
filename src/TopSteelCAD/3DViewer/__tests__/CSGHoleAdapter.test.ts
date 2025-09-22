/**
 * Tests unitaires pour CSGHoleAdapter
 * Vérifie l'intégration entre DSTV et CSG pour l'enlèvement de matière
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CSGHoleAdapter, CSGHole } from '../integration/CSGHoleAdapter';
import DSTVTransformer, { DSTVFace, ProfileDimensions } from '../dstv/DSTVTransformer';

// Mock three-bvh-csg
vi.mock('three-bvh-csg', () => ({
  Evaluator: vi.fn(() => ({
    useGroups: false,
    attributes: [],
    evaluate: vi.fn((brushA, brushB, operation) => ({
      geometry: new THREE.BoxGeometry(100, 200, 1000)
    }))
  })),
  Brush: vi.fn((geometry) => ({
    geometry,
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    updateMatrixWorld: vi.fn()
  })),
  SUBTRACTION: 'SUBTRACTION'
}));

describe('CSGHoleAdapter', () => {
  let adapter: CSGHoleAdapter;
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
    adapter = new CSGHoleAdapter(transformer);
  });

  describe('validateHole()', () => {
    it('devrait valider un trou correct', () => {
      const hole: CSGHole = {
        id: 'hole-1',
        coordinate: {
          face: DSTVFace.TOP,
          x: 500,
          y: 0,
          z: 0
        },
        diameter: 20,
        isThrough: true
      };

      const errors = adapter.validateHole(hole);
      expect(errors).toHaveLength(0);
    });

    it('devrait rejeter un trou avec un diamètre invalide', () => {
      const hole: CSGHole = {
        id: 'hole-1',
        coordinate: {
          face: DSTVFace.TOP,
          x: 500,
          y: 0
        },
        diameter: 0,
        isThrough: true
      };

      const errors = adapter.validateHole(hole);
      expect(errors).toContain('Invalid hole diameter: 0');
    });

    it('devrait rejeter un trou borgne sans profondeur', () => {
      const hole: CSGHole = {
        id: 'hole-1',
        coordinate: {
          face: DSTVFace.TOP,
          x: 500,
          y: 0
        },
        diameter: 20,
        isThrough: false,
        depth: 0
      };

      const errors = adapter.validateHole(hole);
      expect(errors).toContain('Invalid depth for blind hole: 0');
    });

    it('devrait rejeter un trou avec des coordonnées invalides', () => {
      const hole: CSGHole = {
        id: 'hole-1',
        coordinate: {
          face: DSTVFace.TOP,
          x: 2000,  // Hors limites
          y: 0
        },
        diameter: 20,
        isThrough: true
      };

      const errors = adapter.validateHole(hole);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('applyHoles()', () => {
    it('devrait appliquer les trous à une géométrie', () => {
      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const holes: CSGHole[] = [
        {
          id: 'hole-1',
          coordinate: { face: DSTVFace.TOP, x: 300, y: 0 },
          diameter: 20,
          isThrough: true
        },
        {
          id: 'hole-2',
          coordinate: { face: DSTVFace.TOP, x: 700, y: 0 },
          diameter: 16,
          isThrough: true
        }
      ];

      const result = adapter.applyHoles(geometry, holes);

      expect(result).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.userData.holes).toHaveLength(2);
      expect(result.userData.holes[0].id).toBe('hole-1');
      expect(result.userData.holes[0].diameter).toBe(20);
    });

    it('devrait retourner la géométrie originale si aucun trou', () => {
      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const result = adapter.applyHoles(geometry, []);

      expect(result).toBe(geometry);
    });

    it('devrait gérer les erreurs de traitement', () => {
      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const holes: CSGHole[] = [
        {
          id: 'invalid-hole',
          coordinate: { face: 'invalid' as DSTVFace, x: 300, y: 0 },
          diameter: 20,
          isThrough: true
        }
      ];

      // Le traitement devrait continuer même avec des erreurs
      const result = adapter.applyHoles(geometry, holes);
      expect(result).toBeInstanceOf(THREE.BufferGeometry);
    });
  });

  describe('processBatch()', () => {
    it('devrait traiter un batch de trous', () => {
      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const holes: CSGHole[] = [
        {
          id: 'hole-1',
          coordinate: { face: DSTVFace.TOP, x: 200, y: 0 },
          diameter: 20,
          isThrough: true
        },
        {
          id: 'hole-2',
          coordinate: { face: DSTVFace.BOTTOM, x: 400, y: 0 },
          diameter: 18,
          isThrough: false,
          depth: 30
        },
        {
          id: 'hole-3',
          coordinate: { face: DSTVFace.LEFT, x: 600, y: 50 },
          diameter: 16,
          isThrough: true
        }
      ];

      const result = adapter.processBatch(geometry, holes);

      expect(result.success).toBe(true);
      expect(result.geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.errors).toBeUndefined();
    });

    it('devrait retourner des erreurs pour des trous invalides', () => {
      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const holes: CSGHole[] = [
        {
          id: 'invalid-1',
          coordinate: { face: DSTVFace.TOP, x: 500, y: 0 },
          diameter: -10,  // Diamètre négatif
          isThrough: true
        }
      ];

      const result = adapter.processBatch(geometry, holes);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid hole diameter');
    });
  });

  describe('createHolePreview()', () => {
    it('devrait créer un groupe de prévisualisation des trous', () => {
      const holes: CSGHole[] = [
        {
          id: 'hole-1',
          coordinate: { face: DSTVFace.TOP, x: 300, y: 0 },
          diameter: 20,
          isThrough: true
        },
        {
          id: 'hole-2',
          coordinate: { face: DSTVFace.LEFT, x: 600, y: 30 },
          diameter: 16,
          isThrough: false,
          depth: 25
        }
      ];

      const preview = adapter.createHolePreview(holes);

      expect(preview).toBeInstanceOf(THREE.Group);
      expect(preview.children).toHaveLength(2);
      expect(preview.children[0].name).toBe('HolePreview_hole-1');
      expect(preview.children[1].name).toBe('HolePreview_hole-2');
    });
  });

  describe('Calcul de profondeur des trous', () => {
    it('devrait calculer la profondeur correcte pour un trou traversant sur la semelle', () => {
      const hole: CSGHole = {
        id: 'hole-1',
        coordinate: { face: DSTVFace.TOP, x: 500, y: 0 },
        diameter: 20,
        isThrough: true
      };

      // La profondeur devrait être 2x l'épaisseur de la semelle
      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const result = adapter.applyHoles(geometry, [hole]);

      const holeData = result.userData.holes[0];
      expect(holeData.isThrough).toBe(true);
    });

    it('devrait utiliser la profondeur spécifiée pour un trou borgne', () => {
      const hole: CSGHole = {
        id: 'hole-1',
        coordinate: { face: DSTVFace.TOP, x: 500, y: 0 },
        diameter: 20,
        isThrough: false,
        depth: 35
      };

      const geometry = new THREE.BoxGeometry(100, 200, 1000);
      const result = adapter.applyHoles(geometry, [hole]);

      const holeData = result.userData.holes[0];
      expect(holeData.depth).toBe(35);
    });
  });
});

describe('CSGHoleAdapter - Intégration complète', () => {
  it('devrait traiter un cas réel avec plusieurs types de trous', () => {
    const dimensions: ProfileDimensions = {
      length: 1500,
      height: 300,
      width: 150,
      webThickness: 11,
      flangeThickness: 19,
      profileType: 'HEA300'
    };

    const transformer = new DSTVTransformer(dimensions);
    const adapter = new CSGHoleAdapter(transformer);

    const geometry = new THREE.BoxGeometry(
      dimensions.width,
      dimensions.height,
      dimensions.length
    );

    const holes: CSGHole[] = [
      // Trous sur la semelle supérieure
      {
        id: 'A1',
        coordinate: { face: DSTVFace.TOP, x: 200, y: 0 },
        diameter: 22,
        isThrough: true
      },
      {
        id: 'A2',
        coordinate: { face: DSTVFace.TOP, x: 750, y: -40 },
        diameter: 18,
        isThrough: true
      },
      {
        id: 'A3',
        coordinate: { face: DSTVFace.TOP, x: 750, y: 40 },
        diameter: 18,
        isThrough: true
      },
      // Trou sur la semelle inférieure
      {
        id: 'B1',
        coordinate: { face: DSTVFace.BOTTOM, x: 1300, y: 0 },
        diameter: 25,
        isThrough: false,
        depth: 10
      },
      // Trous sur les âmes
      {
        id: 'C1',
        coordinate: { face: DSTVFace.LEFT, x: 400, y: 0 },
        diameter: 16,
        isThrough: true
      },
      {
        id: 'C2',
        coordinate: { face: DSTVFace.RIGHT, x: 1100, y: 50 },
        diameter: 20,
        isThrough: true
      }
    ];

    const result = adapter.processBatch(geometry, holes);

    expect(result.success).toBe(true);
    expect(result.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(result.geometry!.userData.holes).toHaveLength(6);

    // Vérifier que chaque trou a les bonnes métadonnées
    const processedHoles = result.geometry!.userData.holes;

    const holeA1 = processedHoles.find((h: any) => h.id === 'A1');
    expect(holeA1).toBeDefined();
    expect(holeA1.face).toBe(DSTVFace.TOP);
    expect(holeA1.diameter).toBe(22);

    const holeB1 = processedHoles.find((h: any) => h.id === 'B1');
    expect(holeB1).toBeDefined();
    expect(holeB1.isThrough).toBe(false);
    expect(holeB1.depth).toBe(10);
  });
});