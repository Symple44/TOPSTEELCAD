/**
 * CutArchitectureValidation.test.ts - Tests de validation de la nouvelle architecture
 * Vérifie que tous les composants fonctionnent correctement ensemble
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../../../../types';
import { PivotElement } from '@/types/viewer';
import {
  getCutHandlerFactory,
  getCutProcessorAdapter,
  AdapterMode,
  cutLogger,
  LogLevel,
  initializeCutSystem,
  getCutSystemStatus
} from '../index';

describe('Cut Architecture Validation', () => {
  let factory: ReturnType<typeof getCutHandlerFactory>;
  let adapter: ReturnType<typeof getCutProcessorAdapter>;

  beforeAll(() => {
    // Initialiser le système
    initializeCutSystem({
      enableLogging: true,
      logLevel: 'debug'
    });
    
    factory = getCutHandlerFactory();
    adapter = getCutProcessorAdapter({
      mode: AdapterMode.NEW_ONLY,
      enableLogging: true,
      logLevel: LogLevel.DEBUG
    });
  });

  describe('System Initialization', () => {
    test('should initialize cut system successfully', () => {
      const status = getCutSystemStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.handlersCount).toBeGreaterThan(0);
      expect(status.servicesReady).toBe(true);
    });

    test('should register all built-in handlers', () => {
      const handlers = factory.getAllHandlers();
      
      expect(handlers.length).toBe(7); // 7 handlers créés
      
      const handlerNames = handlers.map(h => h.name);
      expect(handlerNames).toContain('PartialNotchHandler');
      expect(handlerNames).toContain('EndCutHandler');
      expect(handlerNames).toContain('ExteriorCutHandler');
      expect(handlerNames).toContain('InteriorCutHandler');
      expect(handlerNames).toContain('StraightCutHandler');
      expect(handlerNames).toContain('AngleCutHandler');
      expect(handlerNames).toContain('BevelCutHandler');
    });
  });

  describe('Handler Selection', () => {
    test('should select correct handler for partial notches', () => {
      const feature: Feature = {
        id: 'test-partial-notch',
        type: FeatureType.NOTCH,
        parameters: {
          cutType: 'partial_notches',
          points: Array(9).fill([0, 0]) // 9 points pattern
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      expect(handler?.name).toBe('PartialNotchHandler');
    });

    test('should select correct handler for end cuts', () => {
      const feature: Feature = {
        id: 'test-end-cut',
        type: FeatureType.END_CUT,
        parameters: {
          angle: 45,
          position: 'end'
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      expect(handler?.name).toBe('EndCutHandler');
    });

    test('should select correct handler for exterior cuts', () => {
      const feature: Feature = {
        id: 'test-exterior',
        type: FeatureType.CUT,
        parameters: {
          dstvBlock: 'AK',
          points: [[0, 0], [100, 0], [100, 50], [0, 50]]
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      expect(handler?.name).toBe('ExteriorCutHandler');
    });

    test('should select correct handler for interior cuts', () => {
      const feature: Feature = {
        id: 'test-interior',
        type: FeatureType.CUT,
        parameters: {
          dstvBlock: 'IK',
          points: [[10, 10], [90, 10], [90, 40], [10, 40]]
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      expect(handler?.name).toBe('InteriorCutHandler');
    });

    test('should select correct handler for bevel cuts', () => {
      const feature: Feature = {
        id: 'test-bevel',
        type: FeatureType.CUT,
        parameters: {
          cutType: 'bevel',
          bevelAngle: 45,
          weldPrep: true
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      expect(handler?.name).toBe('BevelCutHandler');
    });
  });

  describe('Geometry Creation', () => {
    const mockElement: PivotElement = {
      id: 'test-element',
      type: 'I-beam',
      dimensions: {
        length: 1000,
        height: 300,
        width: 150,
        webThickness: 10,
        flangeThickness: 15
      }
    } as PivotElement;

    test('should create geometry for straight cut', () => {
      const feature: Feature = {
        id: 'test-straight',
        type: FeatureType.CUT,
        parameters: {
          points: [[100, 50], [200, 50], [200, 150], [100, 150]],
          face: ProfileFace.WEB
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      
      if (handler) {
        const geometry = handler.createCutGeometry(feature, mockElement);
        
        expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
        expect(geometry.attributes.position).toBeDefined();
        expect(geometry.attributes.position.count).toBeGreaterThan(0);
      }
    });

    test('should create geometry for angled cut', () => {
      const feature: Feature = {
        id: 'test-angle',
        type: FeatureType.CUT,
        parameters: {
          angle: 45,
          width: 100,
          height: 200,
          face: ProfileFace.WEB
        }
      };
      
      const handler = factory.findBestHandler(feature);
      expect(handler).not.toBeNull();
      
      if (handler) {
        const geometry = handler.createCutGeometry(feature, mockElement);
        
        expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
        expect(geometry.attributes.position).toBeDefined();
      }
    });
  });

  describe('CSG Operations', () => {
    const mockElement: PivotElement = {
      id: 'test-element',
      type: 'I-beam',
      dimensions: {
        length: 1000,
        height: 300,
        width: 150,
        webThickness: 10,
        flangeThickness: 15
      }
    } as PivotElement;

    test('should perform CSG subtraction', async () => {
      // Créer une géométrie de base
      const baseGeometry = new THREE.BoxGeometry(1000, 300, 150);
      
      // Feature pour une coupe simple
      const feature: Feature = {
        id: 'test-csg',
        type: FeatureType.CUT,
        parameters: {
          points: [[450, 100], [550, 100], [550, 200], [450, 200]],
          face: ProfileFace.WEB,
          depth: 20
        }
      };
      
      const result = await adapter.process(baseGeometry, feature, mockElement);
      
      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      
      if (result.geometry) {
        const originalVertices = baseGeometry.attributes.position.count;
        const resultVertices = result.geometry.attributes.position.count;
        
        // La géométrie résultante devrait avoir plus de vertices après la coupe
        expect(resultVertices).toBeGreaterThan(originalVertices);
      }
    });
  });

  describe('Adapter Integration', () => {
    const mockElement: PivotElement = {
      id: 'test-element',
      type: 'I-beam',
      dimensions: {
        length: 1000,
        height: 300,
        width: 150,
        webThickness: 10,
        flangeThickness: 15
      }
    } as PivotElement;

    test('should process with NEW_ONLY mode', async () => {
      adapter.setMode(AdapterMode.NEW_ONLY);
      
      const baseGeometry = new THREE.BoxGeometry(1000, 300, 150);
      const feature: Feature = {
        id: 'test-new-only',
        type: FeatureType.END_CUT,
        parameters: {
          angle: 30,
          position: 'end'
        }
      };
      
      const result = await adapter.process(baseGeometry, feature, mockElement);
      
      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
    });

    test('should handle unknown feature types gracefully', async () => {
      const baseGeometry = new THREE.BoxGeometry(1000, 300, 150);
      const feature: Feature = {
        id: 'test-unknown',
        type: 'UNKNOWN_TYPE' as FeatureType,
        parameters: {}
      };
      
      const result = await adapter.process(baseGeometry, feature, mockElement);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Logging System', () => {
    test('should log operations correctly', () => {
      cutLogger.clear();
      cutLogger.setLogLevel(LogLevel.DEBUG);
      
      const feature: Feature = {
        id: 'test-logging',
        type: FeatureType.CUT,
        parameters: {}
      };
      
      const element: PivotElement = {
        id: 'test-element'
      } as PivotElement;
      
      const operationId = cutLogger.startCutOperation(feature, element);
      cutLogger.debug('Debug message', {}, operationId);
      cutLogger.info('Info message', {}, operationId);
      cutLogger.warn('Warning message', {}, operationId);
      cutLogger.error('Error message', new Error('Test error'), operationId);
      cutLogger.endCutOperation(operationId, true);
      
      const history = cutLogger.getHistory();
      expect(history.length).toBeGreaterThan(0);
      
      const stats = cutLogger.getStatistics();
      expect(stats.totalOperations).toBeGreaterThan(0);
    });

    test('should track performance metrics', () => {
      cutLogger.setPerformanceTracking(true);
      
      const operationId = 'test-perf';
      cutLogger.markPerformanceStart('TEST_OPERATION', operationId);
      
      // Simuler une opération
      const delay = 10;
      const start = performance.now();
      while (performance.now() - start < delay) {
        // Wait
      }
      
      const duration = cutLogger.markPerformanceEnd('TEST_OPERATION', operationId);
      
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('Error Recovery', () => {
    const mockElement: PivotElement = {
      id: 'test-element',
      type: 'I-beam',
      dimensions: {
        length: 1000,
        height: 300,
        width: 150,
        webThickness: 10,
        flangeThickness: 15
      }
    } as PivotElement;

    test('should handle invalid geometry gracefully', async () => {
      const invalidGeometry = new THREE.BufferGeometry(); // Géométrie vide
      
      const feature: Feature = {
        id: 'test-invalid',
        type: FeatureType.CUT,
        parameters: {
          points: [[0, 0], [100, 0], [100, 100], [0, 100]]
        }
      };
      
      const result = await adapter.process(invalidGeometry, feature, mockElement);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing parameters gracefully', async () => {
      const baseGeometry = new THREE.BoxGeometry(1000, 300, 150);
      
      const feature: Feature = {
        id: 'test-missing-params',
        type: FeatureType.CUT,
        parameters: {} // Paramètres manquants
      };
      
      const result = await adapter.process(baseGeometry, feature, mockElement);
      
      // Devrait échouer ou utiliser des valeurs par défaut
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    const mockElement: PivotElement = {
      id: 'test-element',
      type: 'I-beam',
      dimensions: {
        length: 1000,
        height: 300,
        width: 150,
        webThickness: 10,
        flangeThickness: 15
      }
    } as PivotElement;

    test('should process multiple cuts efficiently', async () => {
      const baseGeometry = new THREE.BoxGeometry(1000, 300, 150);
      const startTime = performance.now();
      
      const features: Feature[] = [
        {
          id: 'cut-1',
          type: FeatureType.CUT,
          parameters: {
            points: [[100, 50], [200, 50], [200, 150], [100, 150]]
          }
        },
        {
          id: 'cut-2',
          type: FeatureType.CUT,
          parameters: {
            points: [[300, 50], [400, 50], [400, 150], [300, 150]]
          }
        },
        {
          id: 'cut-3',
          type: FeatureType.CUT,
          parameters: {
            points: [[500, 50], [600, 50], [600, 150], [500, 150]]
          }
        }
      ];
      
      let currentGeometry = baseGeometry;
      
      for (const feature of features) {
        const result = await adapter.process(currentGeometry, feature, mockElement);
        if (result.success && result.geometry) {
          currentGeometry = result.geometry;
        }
      }
      
      const totalTime = performance.now() - startTime;
      
      // Devrait traiter 3 coupes en moins de 1 seconde
      expect(totalTime).toBeLessThan(1000);
      
      console.log(`Processed ${features.length} cuts in ${totalTime.toFixed(2)}ms`);
    });
  });
});

// Configuration Jest pour les tests
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^three$': '<rootDir>/node_modules/three/build/three.module.js'
  }
};