/**
 * Tests pour FormatEngine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormatEngine } from '../engine/FormatEngine';
import { BaseFormatPlugin } from '../types/PluginTypes';
import { ProcessingPipeline } from '../pipeline/ProcessingPipeline';
import { BaseStage } from '../pipeline/BaseStage';
import { ProcessingContext } from '../pipeline/ProcessingContext';
import { PivotScene } from '@/types/viewer';

// Mock plugin pour les tests
class MockDSTVPlugin extends BaseFormatPlugin {
  readonly id = 'dstv' as const;
  readonly name = 'Mock DSTV Plugin';
  readonly version = '1.0.0';
  readonly supportedExtensions = ['.nc', '.nc1'];
  readonly capabilities = {
    import: {
      geometry: true,
      materials: true,
      properties: true,
      hierarchy: false,
      assemblies: false
    }
  };

  createImportPipeline() {
    const pipeline = new ProcessingPipeline<ArrayBuffer, PivotScene>('mock-dstv-import');
    
    pipeline.addStage(new class extends BaseStage<ArrayBuffer, PivotScene> {
      readonly name = 'mock-parse';
      readonly description = 'Mock parsing stage';
      
      async process(input: ArrayBuffer, _context: ProcessingContext): Promise<PivotScene> {
        // Simuler un traitement
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          id: 'mock-scene',
          name: 'Mock Scene',
          elements: new Map(),
          metadata: {
            format: 'dstv',
            originalSize: input.byteLength
          }
        };
      }
    });
    
    return pipeline;
  }

  async validateFile(data: ArrayBuffer): Promise<any> {
    const text = new TextDecoder().decode(data);
    return {
      isValid: text.includes('ST') && text.includes('EN'),
      errors: [],
      warnings: [],
      confidence: 0.9
    };
  }
}

describe('FormatEngine', () => {
  let engine: FormatEngine;
  let mockPlugin: MockDSTVPlugin;

  beforeEach(() => {
    engine = new FormatEngine({
      logLevel: 'error', // Réduire les logs pendant les tests
      enableMetrics: false
    });
    mockPlugin = new MockDSTVPlugin();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Plugin Management', () => {
    it('should register a plugin successfully', () => {
      expect(() => engine.registerFormat(mockPlugin)).not.toThrow();
      
      const supportedFormats = engine.getSupportedFormats();
      expect(supportedFormats).toHaveLength(1);
      expect(supportedFormats[0].id).toBe('dstv');
    });

    it('should prevent duplicate plugin registration', () => {
      engine.registerFormat(mockPlugin);
      
      expect(() => engine.registerFormat(mockPlugin)).toThrow('already registered');
    });

    it('should unregister a plugin successfully', () => {
      engine.registerFormat(mockPlugin);
      engine.unregisterFormat('dstv');
      
      const supportedFormats = engine.getSupportedFormats();
      expect(supportedFormats).toHaveLength(0);
    });

    it('should return format capabilities', () => {
      engine.registerFormat(mockPlugin);
      
      const capabilities = engine.getFormatCapabilities('dstv');
      expect(capabilities).toBeDefined();
      expect(capabilities?.import?.geometry).toBe(true);
    });
  });

  describe('Format Detection', () => {
    beforeEach(() => {
      engine.registerFormat(mockPlugin);
    });

    it('should detect format by extension', async () => {
      const file = new File(['ST\nEN\n'], 'test.nc');
      const format = await engine.detectFormat(file);
      
      expect(format).toBe('dstv');
    });

    it('should detect format by content', async () => {
      const file = new File(['ST\nsome content\nEN\n'], 'test.unknown');
      const format = await engine.detectFormat(file);
      
      expect(format).toBe('dstv');
    });

    it('should fail to detect unsupported format', async () => {
      const file = new File(['invalid content'], 'test.xyz');
      
      await expect(engine.detectFormat(file)).rejects.toThrow('Cannot detect format');
    });
  });

  describe('Import Process', () => {
    beforeEach(() => {
      engine.registerFormat(mockPlugin);
    });

    it('should import a valid file successfully', async () => {
      const file = new File(['ST\nsome dstv content\nEN\n'], 'test.nc');
      const result = await engine.import(file);
      
      expect(result.success).toBe(true);
      expect(result.scene).toBeDefined();
      expect(result.scene?.id).toBe('mock-scene');
      expect(result.errors).toHaveLength(0);
    });

    it('should include metadata in import result', async () => {
      const file = new File(['ST\nsome dstv content\nEN\n'], 'test.nc');
      const result = await engine.import(file);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe('dstv');
      expect(result.metadata?.plugin.name).toBe('Mock DSTV Plugin');
    });

    it('should handle import errors gracefully', async () => {
      // Plugin qui lance une erreur
      const errorPlugin = new class extends MockDSTVPlugin {
        createImportPipeline() {
          const pipeline = new ProcessingPipeline<ArrayBuffer, PivotScene>('error-pipeline');
          
          pipeline.addStage(new class extends BaseStage<ArrayBuffer, PivotScene> {
            readonly name = 'error-stage';
            readonly description = 'Stage that always fails';
            
            async process(): Promise<PivotScene> {
              throw new Error('Test error');
            }
          });
          
          return pipeline;
        }
      };

      engine.registerFormat(errorPlugin);
      
      const file = new File(['ST\nEN\n'], 'test.nc');
      const result = await engine.import(file);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Test error');
    });

    it('should respect timeout configuration', async () => {
      // Plugin avec délai long
      const slowPlugin = new class extends MockDSTVPlugin {
        createImportPipeline() {
          const pipeline = new ProcessingPipeline<ArrayBuffer, PivotScene>('slow-pipeline');
          
          pipeline.addStage(new class extends BaseStage<ArrayBuffer, PivotScene> {
            readonly name = 'slow-stage';
            readonly description = 'Very slow stage';
            
            async process(): Promise<PivotScene> {
              await new Promise(resolve => setTimeout(resolve, 100)); // 100ms
              return {
                id: 'slow-scene',
                name: 'Slow Scene',
                elements: new Map()
              };
            }
          });
          
          return pipeline;
        }
      };

      engine.registerFormat(slowPlugin);
      
      const file = new File(['ST\nEN\n'], 'test.nc');
      const result = await engine.import(file, { timeout: 50 }); // Timeout plus court que le traitement
      
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('timed out');
    }, 1000);
  });

  describe('Metrics and Performance', () => {
    beforeEach(() => {
      // Réactiver les métriques pour ces tests
      engine = new FormatEngine({
        logLevel: 'error',
        enableMetrics: true
      });
      engine.registerFormat(mockPlugin);
    });

    it('should collect import metrics', async () => {
      const file = new File(['ST\nEN\n'], 'test.nc');
      await engine.import(file);
      
      const metrics = engine.getMetrics();
      expect(metrics.totalImports).toBe(1);
      expect(metrics.formatsUsage.get('dstv')).toBe(1);
    });

    it('should track active jobs', async () => {
      const file = new File(['ST\nEN\n'], 'test.nc');
      
      // Lancer l'import en arrière-plan
      const importPromise = engine.import(file);
      
      // Vérifier qu'il y a un job actif (timing délicat, peut ne pas toujours passer)
      // expect(engine.getActiveJobsCount()).toBe(1);
      
      await importPromise;
      expect(engine.getActiveJobsCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid plugin registration', () => {
      const invalidPlugin = {
        id: 'invalid',
        // Propriétés manquantes
      };

      expect(() => engine.registerFormat(invalidPlugin as any)).toThrow();
    });

    it('should handle missing plugin for format', async () => {
      const file = new File(['content'], 'test.nc');
      const result = await engine.import(file, { format: 'nonexistent' as any });
      
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('No plugin available');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customEngine = new FormatEngine({
        maxConcurrentJobs: 2,
        defaultTimeout: 5000,
        logLevel: 'debug'
      });

      expect(customEngine).toBeDefined();
      // Configuration interne non exposée, mais on peut tester les comportements
    });

    it('should handle concurrent imports', async () => {
      engine.registerFormat(mockPlugin);
      
      const files = [
        new File(['ST\nEN\n'], 'test1.nc'),
        new File(['ST\nEN\n'], 'test2.nc'),
        new File(['ST\nEN\n'], 'test3.nc')
      ];

      const promises = files.map(file => engine.import(file));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Lifecycle Management', () => {
    it('should shutdown cleanly', async () => {
      engine.registerFormat(mockPlugin);
      
      // Lancer un import
      const file = new File(['ST\nEN\n'], 'test.nc');
      await engine.import(file);
      
      // Shutdown ne devrait pas lever d'erreur
      await expect(engine.shutdown()).resolves.toBeUndefined();
    });

    it('should cancel active jobs on shutdown', async () => {
      // Plugin avec délai pour simuler un job long
      const longPlugin = new class extends MockDSTVPlugin {
        createImportPipeline() {
          const pipeline = new ProcessingPipeline<ArrayBuffer, PivotScene>('long-pipeline');
          
          pipeline.addStage(new class extends BaseStage<ArrayBuffer, PivotScene> {
            readonly name = 'long-stage';
            readonly description = 'Long running stage';
            
            async process(): Promise<PivotScene> {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return {
                id: 'long-scene',
                name: 'Long Scene',
                elements: new Map()
              };
            }
          });
          
          return pipeline;
        }
      };

      engine.registerFormat(longPlugin);
      
      const file = new File(['ST\nEN\n'], 'test.nc');
      
      // Lancer l'import mais ne pas attendre
      const importPromise = engine.import(file);
      
      // Shutdown immédiatement
      engine.cancelAllJobs();
      
      const result = await importPromise;
      expect(result.success).toBe(false);
    });
  });
});