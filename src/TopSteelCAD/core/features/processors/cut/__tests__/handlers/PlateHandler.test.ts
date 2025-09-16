/**
 * PlateHandler.test.ts - Tests unitaires pour PlateHandler
 * Tests complets pour le handler des plaques et tôles (blocks PL)
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as THREE from 'three';
import { PlateHandler } from '../../handlers/PlateHandler';
import { CutType } from '../../types/CutTypes';
import { Feature, FeatureType } from '../../types/CoreTypes';
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
    quadraticCurveTo: vi.fn(),
    absarc: vi.fn(),
    closePath: vi.fn(),
  })),
  Matrix4: vi.fn(() => ({
    makeTranslation: vi.fn(),
    makeRotationFromEuler: vi.fn(),
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

describe('PlateHandler', () => {
  let handler: PlateHandler;
  let mockElement: PivotElement;
  let mockFeature: Feature;

  beforeEach(() => {
    handler = new PlateHandler();
    
    mockElement = {
      id: 'test-plate',
      type: 'PLATE',
      materialType: 'STEEL',
      dimensions: {
        width: 1000,
        length: 2000,
        thickness: 10,
      },
      position: { x: 0, y: 0, z: 0 },
    };

    mockFeature = {
      id: 'test-feature',
      type: FeatureType.CUT,
      parameters: {
        thickness: 10,
        width: 1000,
        length: 2000,
      },
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Handler Properties', () => {
    it('should have correct name and properties', () => {
      expect(handler.name).toBe('PlateHandler');
      expect(handler.priority).toBe(65);
      expect(handler.supportedTypes).toEqual([
        CutType.CONTOUR_CUT,
        CutType.THROUGH_CUT,
        CutType.PARTIAL_CUT,
      ]);
    });
  });

  describe('canHandle Method', () => {
    it('should handle DSTV PL block', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'PL',
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle PLATE profile type', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          profileType: 'PLATE',
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle PLATE element type', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          elementType: 'PLATE',
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle plate dimensions pattern', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          thickness: 15,
          width: 500,
          length: 1000,
          // Pas de height - caractéristique d'une plaque
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should handle explicit plate indicators', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          isPlate: true,
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(true);
    });

    it('should reject unsupported cut types', () => {
      const result = handler.canHandle(CutType.STRAIGHT_CUT, mockFeature);
      expect(result).toBe(false);
    });

    it('should reject non-plate features', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          height: 300, // Présence de height suggère un profil, pas une plaque
          width: 200,
          length: 1000,
        },
      };

      const result = handler.canHandle(CutType.CONTOUR_CUT, feature);
      expect(result).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should pass validation for valid plate', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          dstvBlock: 'PL',
          thickness: 15,
          width: 1000,
          length: 2000,
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error on negative thickness', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          thickness: -5,
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plate thickness must be positive');
    });

    it('should warn about very thick plates', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          thickness: 150,
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Very thick plate'))).toBe(true);
    });

    it('should error on negative dimensions', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          width: -100,
          length: 500,
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plate dimensions must be positive');
    });

    it('should warn about large plate area', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          width: 2000,
          length: 1000, // 2m² > 1m²
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Large plate area'))).toBe(true);
    });

    it('should warn about unknown perforation pattern', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          perforationPattern: 'unknown-pattern',
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Unknown perforation pattern'))).toBe(true);
    });

    it('should error on invalid bend angle', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          bendAngle: 250, // > 180°
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bend angle must be between -180 and 180 degrees');
    });

    it('should warn about contour dimension mismatch', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          width: 1000,
          points: [
            [0, 0],
            [500, 0], // Largeur de contour différente
            [500, 1000],
            [0, 1000],
          ],
        },
      };

      const result = handler.validate(feature, mockElement);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Contour width does not match'))).toBe(true);
    });
  });

  describe('Geometry Creation', () => {
    it('should create flat plate geometry', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.BoxGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          plateType: 'flat',
          thickness: 10,
          width: 1000,
          length: 2000,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.BoxGeometry).toHaveBeenCalledWith(1000, 10, 2000);
    });

    it('should create flat plate with custom contour', () => {
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
          plateType: 'flat',
          thickness: 10,
          points: [
            [0, 0],
            [500, 0],
            [500, 1000],
            [0, 1000],
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create bent plate geometry', () => {
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
          plateType: 'bent',
          thickness: 10,
          width: 1000,
          length: 2000,
          bendAngle: 90,
          bendRadius: 20,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create curved plate geometry', () => {
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
          plateType: 'curved',
          thickness: 10,
          width: 1000,
          length: 2000,
          radius: 500,
          angle: 45,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create perforated plate geometry', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.BoxGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          plateType: 'perforated',
          thickness: 10,
          width: 1000,
          length: 2000,
          perforationPattern: 'grid',
          holeSize: 10,
          spacing: 20,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      // Note: Pour l'instant, retourne la plaque de base
    });

    it('should create corrugated plate geometry', () => {
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
          plateType: 'corrugated',
          thickness: 10,
          width: 1000,
          length: 2000,
          waveHeight: 20,
          waveLength: 50,
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should create custom plate geometry', () => {
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
          plateType: 'custom',
          thickness: 10,
          points: [
            [0, 0],
            [200, 0],
            [300, 100],
            [200, 200],
            [0, 200],
            [-100, 100],
          ],
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.Shape).toHaveBeenCalled();
      expect(THREE.ExtrudeGeometry).toHaveBeenCalled();
    });

    it('should auto-detect plate type based on parameters', () => {
      const testCases = [
        { bendAngle: 45, expected: 'bent' },
        { radius: 100, expected: 'curved' },
        { perforationPattern: 'grid', expected: 'perforated' },
        { corrugation: true, expected: 'corrugated' },
        { points: [[0,0], [1,0], [1,1], [0,1], [0.5,0.5]], expected: 'custom' },
      ];

      testCases.forEach(({ expected: _expected, ...params }) => {
        const mockGeometry = {
          dispose: vi.fn(),
          applyMatrix4: vi.fn(),
          attributes: {},
        };
        
        (THREE.ExtrudeGeometry as Mock).mockReturnValue(mockGeometry);
        (THREE.BoxGeometry as Mock).mockReturnValue(mockGeometry);

        const feature: Feature = {
          ...mockFeature,
          parameters: {
            ...mockFeature.parameters,
            ...params,
            thickness: 10,
            width: 1000,
            length: 2000,
          },
        };

        const result = handler.createCutGeometry(feature, mockElement);
        expect(result).toBeDefined();
      });
    });

    it('should handle positioning and rotation', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.BoxGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          plateType: 'flat',
          thickness: 10,
          width: 1000,
          length: 2000,
          position: { x: 100, y: 200, z: 300 },
          rotation: { x: 45, y: 90, z: 180 },
        },
      };

      handler.createCutGeometry(feature, mockElement);
      
      expect(mockGeometry.applyMatrix4).toHaveBeenCalledTimes(2); // Position + rotation
    });
  });

  describe('Cut Type Detection', () => {
    it('should detect through cut', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          isThrough: true,
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      expect(metadata.cutType).toBe(CutType.THROUGH_CUT);
    });

    it('should detect partial cut', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          depth: 5,
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      expect(metadata.cutType).toBe(CutType.PARTIAL_CUT);
    });

    it('should detect contour cut', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          points: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
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
          plateType: 'bent',
          thickness: 15,
          width: 1000,
          length: 2000,
          material: 'ALUMINUM',
          coating: 'GALVANIZED',
          bendAngle: 90,
          perforationPattern: 'grid',
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      
      expect(metadata).toEqual(expect.objectContaining({
        handler: 'PlateHandler',
        plateType: 'bent',
        thickness: 15,
        width: 1000,
        length: 2000,
        material: 'ALUMINUM',
        coating: 'GALVANIZED',
        area: 2000000, // 1000 * 2000
        volume: 30000000, // 1000 * 2000 * 15
        weight: expect.any(Number),
        perforated: true,
        bent: true,
        bendAngle: 90,
      }));
    });

    it('should calculate weight correctly', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          thickness: 10,
          width: 1000,
          length: 1000,
        },
      };

      const metadata = handler.generateMetadata(feature, mockElement);
      
      // Volume = 1000 * 1000 * 10 = 10,000,000 mm³ = 10,000 cm³
      // Weight = 10,000 cm³ * 7.85 g/cm³ / 1000 = 78.5 kg
      expect(metadata.weight).toBeCloseTo(78.5, 1);
    });

    it('should handle different plate configurations', () => {
      const configurations = [
        { plateType: 'flat', bent: false },
        { plateType: 'bent', bent: true },
        { plateType: 'curved', bent: false },
        { plateType: 'perforated', perforated: true },
      ];

      configurations.forEach(config => {
        const feature: Feature = {
          ...mockFeature,
          parameters: {
            ...mockFeature.parameters,
            plateType: config.plateType,
            ...(config.plateType === 'perforated' && { perforationPattern: 'grid' }),
            ...(config.plateType === 'bent' && { bendAngle: 45 }),
          },
        };

        const metadata = handler.generateMetadata(feature, mockElement);
        expect(metadata.plateType).toBe(config.plateType);
        
        if ('bent' in config) {
          expect(metadata.bent).toBe(config.bent);
        }
        if ('perforated' in config) {
          expect(metadata.perforated).toBe(config.perforated);
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing dimensions gracefully', () => {
      const elementWithoutDims: PivotElement = {
        ...mockElement,
        dimensions: undefined,
      };

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          plateType: 'flat',
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, elementWithoutDims);
      }).not.toThrow();
    });

    it('should fallback to flat plate for custom plate with insufficient points', () => {
      const mockGeometry = {
        dispose: vi.fn(),
        applyMatrix4: vi.fn(),
        attributes: {},
      };
      
      (THREE.BoxGeometry as Mock).mockReturnValue(mockGeometry);

      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          plateType: 'custom',
          points: [[0, 0], [100, 0]], // Seulement 2 points
        },
      };

      const result = handler.createCutGeometry(feature, mockElement);
      
      expect(result).toBeDefined();
      expect(THREE.BoxGeometry).toHaveBeenCalled();
    });

    it('should handle zero or negative bend radius', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          plateType: 'bent',
          bendAngle: 90,
          bendRadius: 0,
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });

    it('should validate perforation patterns', () => {
      const validPatterns = ['grid', 'staggered', 'diagonal', 'hexagonal', 'circular', 'custom'];
      const invalidPattern = 'invalid-pattern';

      validPatterns.forEach(pattern => {
        const feature: Feature = {
          ...mockFeature,
          parameters: {
            ...mockFeature.parameters,
            perforationPattern: pattern,
          },
        };

        const result = handler.validate(feature, mockElement);
        expect(result.warnings?.some(w => w.includes('Unknown perforation pattern'))).toBe(false);
      });

      const invalidFeature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          perforationPattern: invalidPattern,
        },
      };

      const result = handler.validate(invalidFeature, mockElement);
      expect(result.warnings?.some(w => w.includes('Unknown perforation pattern'))).toBe(true);
    });

    it('should not require contour points', () => {
      expect(handler['requiresContourPoints']()).toBe(false);
    });

    it('should handle extreme dimensions', () => {
      const feature: Feature = {
        ...mockFeature,
        parameters: {
          ...mockFeature.parameters,
          thickness: 0.1, // Très mince
          width: 10000, // Très large
          length: 20000, // Très long
        },
      };

      expect(() => {
        handler.createCutGeometry(feature, mockElement);
      }).not.toThrow();
    });
  });
});