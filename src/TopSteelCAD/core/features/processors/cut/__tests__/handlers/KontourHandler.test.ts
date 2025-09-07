/**
 * KontourHandler.test.ts - Tests unitaires pour KontourHandler
 * Tests complets pour le handler des contours complexes (blocks KO)
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as THREE from 'three';
import { KontourHandler } from '../../handlers/KontourHandler';
import { CutType, CutCategory } from '../../types/CutTypes';
import { ProfileFace, Feature, FeatureType } from '../../../types';
import { PivotElement } from '../../types/CoreTypes';

// Mock THREE.js
vi.mock('three', () => ({
  BufferGeometry: vi.fn(() => ({
    dispose: vi.fn(),
    applyMatrix4: vi.fn(),
    attributes: {},
  })),
  ExtrudeGeometry: vi.fn(() => ({
    dispose: vi.fn(),
    applyMatrix4: vi.fn(),
    attributes: {},
  })),
  Shape: vi.fn(() => ({
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    absarc: vi.fn(),
    closePath: vi.fn(),
  })),
  Matrix4: vi.fn(() => ({
    makeTranslation: vi.fn(),
    makeRotationX: vi.fn(),
  })),
  Euler: vi.fn(),
  Vector3: vi.fn(),
}));

// Mock des services
vi.mock('../../services/GeometryCreationService', () => ({
  getGeometryService: vi.fn(() => ({
    createCutGeometry: vi.fn(() => ({
      dispose: vi.fn(),
      applyMatrix4: vi.fn(),
      attributes: {},
    })),
  })),
}));

vi.mock('../../services/CSGOperationService', () => ({
  getCSGService: vi.fn(() => ({
    subtract: vi.fn(),
    union: vi.fn(),
    intersect: vi.fn(),
  })),
}));

describe('KontourHandler', () => {
  let handler: KontourHandler;
  let mockElement: PivotElement;
  let mockFeature: Feature;

  beforeEach(() => {
    handler = new KontourHandler();
    
    mockElement = {
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
    };

    mockFeature = {
      id: 'test-kontour',
      type: FeatureType.CUT,
      parameters: {
        points: [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
        ],
        face: ProfileFace.WEB,
      },
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Handler Properties', () => {
    it('should have correct name and properties', () => {
      expect(handler.name).toBe('KontourHandler');
      expect(handler.priority).toBe(68);
      expect(handler.supportedTypes).toEqual([
        CutType.CONTOUR_CUT,
        CutType.UNRESTRICTED_CONTOUR,
        CutType.EXTERIOR_CUT,
        CutType.INTERIOR_CUT,
      ]);
    });
  });

  describe('canHandle Method', () => {
    it('should handle DSTV KO block', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle complex contour type', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'complex',
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle multi-segment contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          segments: [
            {
              type: 'line',
              startPoint: [0, 0],
              endPoint: [100, 0],
            },
            {
              type: 'arc',
              startPoint: [100, 0],
              endPoint: [100, 100],
              center: [100, 50],
              radius: 50,
            },
          ],
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle points with bulge data', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          points: [
            { x: 0, y: 0, bulge: 0.5 },
            { x: 100, y: 0, bulge: 0 },
            { x: 100, y: 100, bulge: -0.3 },
          ],
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle curves and splines', () => {
      const features = [
        {
          ...mockFeature,
          parameters: { ...mockFeature.parameters, curves: true },
        },
        {
          ...mockFeature,
          parameters: { ...mockFeature.parameters, splines: true },
        },
        {
          ...mockFeature,
          parameters: { ...mockFeature.parameters, arcs: true },
        },
      ];

      features.forEach(feature => {
        const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
        expect(result).toBe(true);
      });
    });

    it('should handle unrestricted contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          isUnrestrictedContour: true,
        },
      };

      const result = handler.canHandle(CutType.UNRESTRICTED_CONTOUR, feature);
      expect(result).toBe(true);
    });

    it('should handle complex point patterns', () => {
      // Contour avec beaucoup de changements d'angles
      const complexPoints = [
        [0, 0],
        [10, 30],
        [30, 25],
        [45, 50],
        [60, 40],
        [80, 70],
        [90, 60],
        [100, 90],
        [80, 85],
        [60, 95],
        [40, 80],
        [20, 85],
        [10, 70],
        [5, 50],
        [15, 30],
        [25, 20],
        [35, 25],
        [45, 15],
        [55, 20],
        [65, 10],
        [75, 15],
      ] as Array<[number, number]>;

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          points: complexPoints,
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should reject unsupported cut types', () => {
      const result = handler.canHandle(CutType.STRAIGHT_CUT, mockFeature);
      expect(result).toBe(false);
    });

    it('should reject simple contours', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ], // Contour simple rectangulaire
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should pass validation for valid complex contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          segments: [
            {
              type: 'line',
              startPoint: [0, 0],
              endPoint: [100, 0],
            },
            {
              type: 'arc',
              startPoint: [100, 0],
              endPoint: [100, 100],
              center: [100, 50],
              radius: 50,
            },
            {
              type: 'line',
              startPoint: [100, 100],
              endPoint: [0, 0],
            },
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate segment structure', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          segments: [
            {
              type: 'line',
              // startPoint manquant
              endPoint: [100, 0],
            },
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('missing start or end point'))).toBe(true);
    });

    it('should require minimum points for contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [[0, 0], [100, 0]], // Seulement 2 points
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Complex contour requires at least 3 points');
    });

    it('should warn about discontinuous contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [
            [0, 0],
            [100, 0],
            [105, 5], // Gap de discontinuité
            [200, 100],
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('discontinuities'))).toBe(true);
    });

    it('should warn about very complex contour', () => {
      const manyPoints = Array.from({ length: 600 }, (_, i) => [i, Math.sin(i * 0.1) * 10] as [number, number]);
      
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: manyPoints,
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Very complex contour'))).toBe(true);
    });

    it('should validate tolerance parameters', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [[0, 0], [100, 0], [100, 100], [0, 100]],
          tolerance: -1, // Tolérance négative
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tolerance must be positive');
    });

    it('should warn about invalid subdivisions', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [[0, 0], [100, 0], [100, 100], [0, 100]],
          subdivisions: 150, // Trop de subdivisions
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Subdivisions should be between'))).toBe(true);
    });

    it('should validate arc segments', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          segments: [
            {
              type: 'arc',
              startPoint: [0, 0],
              endPoint: [100, 100],
              radius: -50, // Rayon négatif
              center: [50, 50],
            },
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid radius'))).toBe(true);
    });

    it('should detect contour gaps', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          segments: [
            {
              type: 'line',
              startPoint: [0, 0],
              endPoint: [100, 0],
            },
            {
              type: 'line',
              startPoint: [105, 5], // Gap de 5 unités
              endPoint: [200, 100],
            },
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.warnings?.some(w => w.includes('Gap detected between segments'))).toBe(true);
    });
  });

  describe('Geometry Creation', () => {
    it('should create multi-segment contour geometry', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'multi_segment',
          segments: [
            {
              type: 'line',
              startPoint: [0, 0],
              endPoint: [100, 0],
            },
            {
              type: 'line',
              startPoint: [100, 0],
              endPoint: [100, 100],
            },
            {
              type: 'line',
              startPoint: [100, 100],
              endPoint: [0, 100],
            },
            {
              type: 'line',
              startPoint: [0, 100],
              endPoint: [0, 0],
            },
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create curved contour geometry', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'curved',
          segments: [
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
              type: 'line',
              startPoint: [100, 50],
              endPoint: [0, 0],
            },
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      
      const mockShape = (THREE.Shape as Mock).mock.results[0].value;
      expect(mockShape.absarc).toHaveBeenCalled();
    });

    it('should create spline contour geometry', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'spline',
          segments: [
            {
              type: 'spline',
              startPoint: [0, 0],
              endPoint: [100, 0],
              controlPoints: [[50, 30]],
            },
            {
              type: 'bezier',
              startPoint: [100, 0],
              endPoint: [0, 100],
              controlPoints: [[120, 20], [80, 80]],
            },
            {
              type: 'line',
              startPoint: [0, 100],
              endPoint: [0, 0],
            },
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      
      const mockShape = (THREE.Shape as Mock).mock.results[0].value;
      expect(mockShape.quadraticCurveTo).toHaveBeenCalled();
      expect(mockShape.bezierCurveTo).toHaveBeenCalled();
    });

    it('should create mixed contour geometry', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'mixed',
          segments: [
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
              type: 'line',
              startPoint: [50, 100],
              endPoint: [0, 0],
            },
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      
      const mockShape = (THREE.Shape as Mock).mock.results[0].value;
      expect(mockShape.lineTo).toHaveBeenCalled();
      expect(mockShape.absarc).toHaveBeenCalled();
      expect(mockShape.quadraticCurveTo).toHaveBeenCalled();
    });

    it('should create complex contour with tessellation', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

      const complexSegments = Array.from({ length: 50 }, (_, i) => ({
        type: 'line',
        startPoint: [i * 2, Math.sin(i * 0.3) * 20] as [number, number],
        endPoint: [(i + 1) * 2, Math.sin((i + 1) * 0.3) * 20] as [number, number],
      }));

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'complex',
          segments: complexSegments,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
    });

    it('should create freeform contour', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };

      const { getGeometryService } = require('../../services/GeometryCreationService');
      const mockService = getGeometryService();
      mockService.createCutGeometry.mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'freeform',
          segments: [
            {
              type: 'line',
              startPoint: [0, 0],
              endPoint: [100, 100],
            },
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(mockService.createCutGeometry).toHaveBeenCalledWith(
        expect.any(Array),
        mockElement,
        expect.objectContaining({
          cutType: 'freeform',
        })
      );
    });

    it('should auto-detect kontour type from parameters', () => {
      const testCases = [
        {
          params: { segments: [{ type: 'spline' }, { type: 'line' }] },
          expectedType: 'mixed'
        },
        {
          params: { segments: [{ type: 'arc' }, { type: 'line' }] },
          expectedType: 'mixed'
        },
        {
          params: { segments: [{ type: 'spline' }] },
          expectedType: 'spline'
        },
        {
          params: { segments: [{ type: 'arc' }] },
          expectedType: 'curved'
        },
        {
          params: { isUnrestrictedContour: true },
          expectedType: 'freeform'
        },
      ];

      testCases.forEach(({ params, expectedType }) => {
        const mockGeometry = {
          dispose: vi.fn(),
          applyMatrix4: vi.fn(),
          attributes: {},
        };
        
        (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

        const feature: Feature = {
          ...mockFeature,
          parameters: {
            ...mockFeature.parameters,
            ...params,
          },
        };

        const result = handler.createCutGeometry(feature, mockElement);
        expect(result).toBeDefined();
      });
    });

    it('should handle points-to-segments conversion', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
          bulges: [0.5, 0, -0.3, 0], // Données de courbure DSTV
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
    });

    it('should apply face transformations correctly', () => {
      const faces = [ProfileFace.TOP_FLANGE, ProfileFace.BOTTOM_FLANGE, ProfileFace.WEB];
      
      faces.forEach(face => {
        const mockGeometry = {
          dispose: vi.fn(),
          applyMatrix4: vi.fn(),
          attributes: {},
        };
        
        (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);

        const feature: Feature = {
          ...mockFeature,
          parameters: {
            ...mockFeature.parameters,
            dstvBlock: 'KO',
            points: [[0, 0], [100, 0], [100, 100], [0, 100]],
            face,
          },
        };

        handler.createCutGeometry(feature, mockElement);
        
        expect(mockGeometry.applyMatrix4).toHaveBeenCalled();
      });
    });
  });

  describe('Cut Type Detection', () => {
    it('should detect unrestricted contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          isUnrestrictedContour: true,
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      expect(metadata.cutType).toBe(CutType.UNRESTRICTED_CONTOUR);
    });

    it('should detect DSTV KO block as contour cut', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      expect(metadata.cutType).toBe(CutType.CONTOUR_CUT);
    });

    it('should default to contour cut', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          points: [[0, 0], [100, 0], [100, 100]],
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      expect(metadata.cutType).toBe(CutType.CONTOUR_CUT);
    });
  });

  describe('Metadata Generation', () => {
    it('should generate comprehensive metadata', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          kontourType: 'mixed',
          segments: [
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
              endPoint: [0, 100],
              controlPoints: [[75, 75]],
            },
          ],
          isClosed: true,
          tolerance: 0.5,
          smoothing: true,
          subdivisions: 20,
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      
      expect(metadata).toEqual(expect.objectContaining({
        handler: 'KontourHandler',
        kontourType: 'mixed',
        segmentCount: 3,
        isClosed: true,
        hasArcs: true,
        hasSplines: true,
        tolerance: 0.5,
        smoothing: true,
        subdivisions: 20,
      }));
    });

    it('should analyze complexity correctly', () => {
      const complexPoints = Array.from({ length: 100 }, (_, i) => [i, Math.sin(i * 0.1) * 10] as [number, number]);
      
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: complexPoints,
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      
      expect(metadata.complexity).toEqual(expect.objectContaining({
        points: 100,
        segments: 99,
      }));
    });

    it('should detect arc and spline presence in segments', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          segments: [
            { type: 'line', startPoint: [0, 0], endPoint: [50, 0] },
            { type: 'arc', startPoint: [50, 0], endPoint: [100, 50] },
            { type: 'spline', startPoint: [100, 50], endPoint: [0, 100] },
          ],
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      
      expect(metadata.hasArcs).toBe(true);
      expect(metadata.hasSplines).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should require contour points', () => {
      expect(handler['requiresContourPoints']()).toBe(true);
    });

    it('should handle empty segments array', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          segments: [],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No segments provided for complex contour');
    });

    it('should handle malformed segments', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          segments: [
            {
              // type manquant
              startPoint: [0, 0],
              endPoint: [100, 0],
            },
            {
              type: 'arc',
              startPoint: [100, 0],
              endPoint: [100, 100],
              center: 'invalid', // centre invalide
              radius: 50,
            },
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.errors.some(e => e.includes('invalid center point'))).toBe(true);
    });

    it('should handle self-intersecting contours', () => {
      const selfIntersectingPoints = [
        [0, 0],
        [100, 100],
        [100, 0],
        [0, 100], // Crée une intersection
      ] as Array<[number, number]>;

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: selfIntersectingPoints,
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });

    it('should handle extreme coordinate values', () => {
      const extremePoints = [
        [-100000, -100000],
        [100000, -100000],
        [100000, 100000],
        [-100000, 100000],
      ] as Array<[number, number]>;

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: extremePoints,
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });

    it('should handle NaN and infinite values', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [
            [0, 0],
            [NaN, 100],
            [Infinity, 200],
            [100, -Infinity],
          ],
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });

    it('should handle missing element dimensions', () => {
      const elementWithoutDims: PivotElement = {
        ...mockElement,
        dimensions: undefined,
      };

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [[0, 0], [100, 0], [100, 100], [0, 100]],
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, elementWithoutDims);
      }).not.toThrow();
    });

    it('should handle bulge arc calculation with zero bulge', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'KO',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
          ],
          bulges: [0, 0, 0], // Pas de courbure
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      expect(result).toBeDefined();
    });

    it('should tessellate arcs and curves correctly', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          kontourType: 'complex',
          segments: [
            {
              type: 'arc',
              startPoint: [0, 0],
              endPoint: [100, 100],
              center: [50, 50],
              radius: 50,
            },
            {
              type: 'spline',
              startPoint: [100, 100],
              endPoint: [0, 200],
              controlPoints: [[150, 150]],
            },
          ],
          subdivisions: 10,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      expect(result).toBeDefined();
    });
  });
});