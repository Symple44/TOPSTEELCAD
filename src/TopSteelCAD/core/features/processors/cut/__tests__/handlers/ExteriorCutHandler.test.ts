/**
 * ExteriorCutHandler.test.ts - Tests unitaires pour ExteriorCutHandler
 * Tests complets pour le handler des coupes extérieures (contours AK)
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as THREE from 'three';
import { ExteriorCutHandler } from '../../handlers/ExteriorCutHandler';
import { CutType, CutCategory } from '../../types/CutTypes';
import { ProfileFace, Feature, FeatureType } from '../../types/CoreTypes';
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
  BoxGeometry: vi.fn(() => ({
    dispose: vi.fn(),
    applyMatrix4: vi.fn(),
    attributes: {},
  })),
  Shape: vi.fn(() => ({
    moveTo: vi.fn(),
    lineTo: vi.fn(),
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

// Mock BufferGeometryUtils
vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn(() => ({
    dispose: vi.fn(),
    applyMatrix4: vi.fn(),
    attributes: {},
  })),
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

describe('ExteriorCutHandler', () => {
  let handler: ExteriorCutHandler;
  let mockElement: PivotElement;
  let mockFeature: Feature;

  beforeEach(() => {
    handler = new ExteriorCutHandler();
    
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
      id: 'test-feature',
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
      expect(handler.name).toBe('ExteriorCutHandler');
      expect(handler.priority).toBe(70);
      expect(handler.supportedTypes).toEqual([
        CutType.EXTERIOR_CUT,
        CutType.CONTOUR_CUT,
        CutType.COPING_CUT,
      ]);
    });
  });

  describe('canHandle Method', () => {
    it('should handle DSTV AK block', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
        },
      };

      const result = handler.canHandle(CutType.EXTERIOR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle explicit exterior cut type', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          cutType: 'exterior',
        },
      };

      const result = handler.canHandle(CutType.EXTERIOR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle exterior category', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          category: CutCategory.EXTERIOR,
        },
      };

      const result = handler.canHandle(CutType.EXTERIOR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle exterior contour based on points analysis', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          points: [
            [0, 0],
            [2000, 0], // Points qui dépassent les dimensions normales
            [2000, 400],
            [0, 400],
          ],
          element: mockElement,
        },
      };

      const result = handler.canHandle(CutType.EXTERIOR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should reject unsupported cut types', () => {
      const result = handler.canHandle(CutType.STRAIGHT_CUT, mockFeature);
      expect(result).toBe(false);
    });

    it('should reject features without exterior indicators', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          points: [
            [10, 10],
            [50, 10],
            [50, 50],
            [10, 50],
          ],
        },
      };

      const result = handler.canHandle(CutType.EXTERIOR_CUT, feature);
      expect(result).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should pass validation for valid exterior cut', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
            [0, 0], // Contour fermé
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about non-closed contour', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
            [10, 10], // Contour non fermé
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Exterior contour is not closed, will be auto-closed');
    });

    it('should warn about complex contour with many points', () => {
      const manyPoints = Array.from({ length: 150 }, (_, i) => [i, Math.sin(i * 0.1) * 10] as [number, number]);
      
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: manyPoints,
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Complex contour'))).toBe(true);
    });

    it('should error when element dimensions are missing', () => {
      const elementWithoutDims: PivotElement = {
        ...mockElement,
        dimensions: undefined,
      };

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
        },
      };

      const result = handler.validate(feature, elementWithoutDims);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Element dimensions required for exterior cut');
    });

    it('should require contour points', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          dstvBlock: 'AK',
          // Pas de points
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ExteriorCutHandler requires at least 3 contour points');
    });
  });

  describe('Geometry Creation', () => {
    it('should create standard exterior cut geometry', () => {
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
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
          face: ProfileFace.WEB,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create contour redefinition for full-length contour', () => {
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
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [1000, 0], // Contour couvrant toute la longueur
            [1000, 200],
            [0, 200],
          ],
          face: ProfileFace.WEB,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create coping cut for complex curves', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.BoxGeometry as Mock).mockReturnValue(mockGeometry);

      // Créer des points qui forment des courbes complexes
      const curvedPoints = [
        [0, 0],
        [20, 30],
        [50, 45],
        [80, 30],
        [100, 0],
        [80, -30],
        [50, -45],
        [20, -30],
      ] as Array<[number, number]>;

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: curvedPoints,
          face: ProfileFace.WEB,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
    });

    it('should handle different profile faces correctly', () => {
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
            dstvBlock: 'AK',
            points: [
              [0, 0],
              [100, 0],
              [100, 100],
              [0, 100],
            ],
            face,
          },
        };

        const result = handler.createCutGeometry(feature, mockElement);
        
        expect(result).toBeDefined();
        expect(mockGeometry.applyMatrix4).toHaveBeenCalled();
      });
    });

    it('should use geometry service for standard cuts', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [50, 0],
            [50, 50],
            [0, 50],
          ],
          face: ProfileFace.WEB,
        },
      };

      handler.createCutGeometry(feature, mockElement);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getGeometryService } = (require('../../services/GeometryCreationService') as any);
      const mockService = getGeometryService();
      expect(mockService.createCutGeometry).toHaveBeenCalledWith(
        expect.any(Array),
        mockElement,
        expect.objectContaining({
          face: ProfileFace.WEB,
          cutType: 'exterior',
          extendToEdges: true,
        })
      );
    });
  });

  describe('Metadata Generation', () => {
    it('should generate comprehensive metadata', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          isCoping: true,
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      
      expect(metadata).toEqual(expect.objectContaining({
        handler: 'ExteriorCutHandler',
        cutType: CutType.COPING_CUT,
        face: ProfileFace.WEB,
        pointCount: 4,
      }));
    });

    it('should detect different cut types correctly', () => {
      // Test coping cut detection
      const copingFeature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          isCoping: true,
        },
      };

      let metadata = handler.generateMetadata(copingFeature, mockElement);
      expect(metadata.cutType).toBe(CutType.COPING_CUT);

      // Test contour cut detection
      const contourFeature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          isContour: true,
        },
      };

      metadata = handler.generateMetadata(contourFeature, mockElement);
      expect(metadata.cutType).toBe(CutType.CONTOUR_CUT);

      // Test default exterior cut
      const defaultFeature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
        },
      };

      metadata = handler.generateMetadata(defaultFeature, mockElement);
      expect(metadata.cutType).toBe(CutType.EXTERIOR_CUT);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty points array', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
    });

    it('should handle null/undefined element', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [[0, 0], [100, 0], [100, 100]],
        },
      };

      expect(() => {
        handler.validate(feature, null as any);
      }).not.toThrow();
    });

    it('should handle malformed points', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [NaN, 0], // Point malformé
            [100, 100],
            [0, 100],
          ],
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });

    it('should handle missing face parameter', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
          // face manquant
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      expect(result).toBeDefined();
    });

    it('should handle extreme contour bounds', () => {
      const extremePoints = [
        [-10000, -10000],
        [10000, -10000],
        [10000, 10000],
        [-10000, 10000],
      ] as Array<[number, number]>;

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'AK',
          points: extremePoints,
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });
  });
});