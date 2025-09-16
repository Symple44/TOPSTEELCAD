/**
 * testSetup.ts - Configuration commune pour les tests des handlers
 * Fournit des utilitaires et mocks communs pour tous les tests
 */

import { vi, expect, beforeEach } from 'vitest';
import { Feature, FeatureType } from '../../types/CoreTypes';
import { PivotElement } from '../../types/CoreTypes';

/**
 * Crée un élément PivotElement de test standard
 */
export function createMockElement(overrides: Partial<PivotElement> = {}): PivotElement {
  return {
    id: 'test-element',
    type: 'BEAM',
    materialType: 'STEEL',
    dimensions: {
      length: 1000,
      width: 200,
      height: 300,
      webThickness: 10,
      flangeThickness: 15,
      thickness: 10,
    },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    ...overrides,
  };
}

/**
 * Crée une feature de test standard
 */
export function createMockFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'test-feature',
    type: FeatureType.CUT,
    parameters: {
      points: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      face: 'WEB' as any,
    },
    ...overrides
  } as Feature;
}

/**
 * Crée un élément de type plaque pour les tests PlateHandler
 */
export function createMockPlateElement(overrides: Partial<PivotElement> = {}): PivotElement {
  return createMockElement({
    id: 'test-plate',
    type: 'PLATE',
    dimensions: {
      width: 1000,
      length: 2000,
      thickness: 10,
    },
    ...overrides,
  });
}

/**
 * Crée une feature avec des segments pour les tests KontourHandler
 */
export function createMockKontourFeature(segments: any[], overrides: Partial<Feature> = {}): Feature {
  return createMockFeature({
    parameters: {
      // dstvBlock: 'KO',
      // segments,
      face: 'WEB' as any,
      ...overrides.parameters,
    },
    ...overrides,
  });
}

/**
 * Générateur de points pour contours complexes
 */
export function generateComplexPoints(count: number): Array<[number, number]> {
  return Array.from({ length: count }, (_, i) => [
    i * 10,
    Math.sin(i * 0.3) * 20 + Math.cos(i * 0.1) * 10,
  ] as [number, number]);
}

/**
 * Générateur de segments linéaires
 */
export function generateLineSegments(points: Array<[number, number]>): any[] {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      type: 'line',
      startPoint: points[i],
      endPoint: points[i + 1],
    });
  }
  return segments;
}

/**
 * Générateur de segments mixtes (lignes + arcs + splines)
 */
export function generateMixedSegments(): any[] {
  return [
    {
      type: 'line',
      startPoint: [0, 0],
      endPoint: [50, 0],
    },
    {
      type: 'arc',
      startPoint: [50, 0],
      endPoint: [100, 50],
      center: [50, 50],
      radius: 50,
    },
    {
      type: 'spline',
      startPoint: [100, 50],
      endPoint: [50, 100],
      controlPoints: [[110, 80]],
    },
    {
      type: 'bezier',
      startPoint: [50, 100],
      endPoint: [0, 100],
      controlPoints: [[30, 120], [20, 110]],
    },
    {
      type: 'line',
      startPoint: [0, 100],
      endPoint: [0, 0],
    },
  ];
}

/**
 * Mock des services géométriques
 */
export function setupServiceMocks() {
  const mockGeometryService = {
    createCutGeometry: vi.fn(() => ({
      dispose: vi.fn(),
      applyMatrix4: vi.fn(),
      attributes: {},
    })),
    createShape: vi.fn(),
    extrudeGeometry: vi.fn(),
  };

  const mockCSGService = {
    subtract: vi.fn(),
    union: vi.fn(),
    intersect: vi.fn(),
    difference: vi.fn(),
  };

  vi.doMock('../../services/GeometryCreationService', () => ({
    getGeometryService: () => mockGeometryService,
  }));

  vi.doMock('../../services/CSGOperationService', () => ({
    getCSGService: () => mockCSGService,
  }));

  return { mockGeometryService, mockCSGService };
}

/**
 * Assertions communes pour les tests de géométrie
 */
export const geometryAssertions = {
  /**
   * Vérifie qu'une géométrie THREE.js a été créée correctement
   */
  expectValidGeometry(geometry: any) {
    expect(geometry).toBeDefined();
    expect(geometry).toHaveProperty('dispose');
    expect(geometry).toHaveProperty('applyMatrix4');
    expect(geometry).toHaveProperty('attributes');
  },

  /**
   * Vérifie qu'une Shape THREE.js a été utilisée correctement
   */
  expectShapeUsage(mockShape: any, expectedMethods: string[] = ['moveTo', 'lineTo']) {
    expectedMethods.forEach(method => {
      expect(mockShape[method]).toHaveBeenCalled();
    });
  },

  /**
   * Vérifie qu'une ExtrudeGeometry a été créée avec les bons paramètres
   */
  expectExtrudeGeometry(mockConstructor: any, expectedCalls: number = 1) {
    expect(mockConstructor).toHaveBeenCalledTimes(expectedCalls);
    expect(mockConstructor).toHaveBeenCalledWith(
      expect.any(Object), // shape
      expect.any(Object)  // extrudeSettings
    );
  },
};

/**
 * Utilitaires de validation pour les tests
 */
export const validationUtils = {
  /**
   * Crée un résultat de validation d'erreur
   */
  createErrorResult(errors: string[], warnings: string[] = []): any {
    return {
      isValid: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Crée un résultat de validation de succès
   */
  createSuccessResult(warnings: string[] = []): any {
    return {
      isValid: true,
      errors: [],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Vérifie qu'un résultat de validation contient les erreurs attendues
   */
  expectValidationErrors(result: any, expectedErrors: string[]) {
    expect(result.isValid).toBe(false);
    expectedErrors.forEach(error => {
      expect(result.errors).toContain(error);
    });
  },

  /**
   * Vérifie qu'un résultat de validation contient les avertissements attendus
   */
  expectValidationWarnings(result: any, expectedWarnings: string[]) {
    expectedWarnings.forEach(warning => {
      expect(result.warnings?.some((w: string) => w.includes(warning))).toBe(true);
    });
  },
};

/**
 * Données de test communes
 */
export const testData = {
  // Points standards pour contours simples
  rectangularPoints: [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ] as Array<[number, number]>,

  // Points pour contour en L
  lShapePoints: [
    [0, 0],
    [100, 0],
    [100, 50],
    [50, 50],
    [50, 100],
    [0, 100],
  ] as Array<[number, number]>,

  // Points pour contour complexe
  complexCurvePoints: generateComplexPoints(25),

  // Segments standards
  simpleLineSegments: generateLineSegments([
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
    [0, 0],
  ]),

  // Segments mixtes
  mixedSegments: generateMixedSegments(),

  // Données DSTV avec bulges
  dstvPointsWithBulges: {
    points: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ] as Array<[number, number]>,
    bulges: [0.5, 0, -0.3, 0],
  },
};

/**
 * Setup global pour tous les tests
 */
export function setupTestEnvironment() {
  // Clear all mocks avant chaque test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  return {
    mocks: setupServiceMocks(),
    utils: {
      geometryAssertions,
      validationUtils,
    },
    data: testData,
    factories: {
      createMockElement,
      createMockFeature,
      createMockPlateElement,
      createMockKontourFeature,
    },
  };
}