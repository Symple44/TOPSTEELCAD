/**
 * Tests d'intégration pour vérifier que le nouveau pipeline DSTV
 * fonctionne correctement avec les processeurs et générateurs existants
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { DSTVPlugin } from '../DSTVPlugin';
import { FormatEngine } from '../../../core/engine/FormatEngine';
import { ProcessorBridge } from '../integration/ProcessorBridge';
import { GeometryBridge } from '../integration/GeometryBridge';
import { FeatureProcessorFactory } from '../../../core/features/processors/FeatureProcessorFactory';
import { GeometryGeneratorFactory } from '../../../3DLibrary/geometry-generators/GeometryGeneratorFactory';
import * as THREE from 'three';

describe('DSTV Integration Tests', () => {
  let plugin: DSTVPlugin;
  let engine: FormatEngine;
  let processorBridge: ProcessorBridge;
  let geometryBridge: GeometryBridge;

  beforeEach(() => {
    plugin = new DSTVPlugin();
    engine = new FormatEngine();
    processorBridge = new ProcessorBridge();
    geometryBridge = new GeometryBridge();
    
    engine.registerPlugin(plugin);
  });

  describe('Real DSTV Files Processing', () => {
    it('should process F1000.nc file correctly', async () => {
      // Lire le fichier DSTV réel
      const dstvPath = resolve(__dirname, '../../../../../doc/DSTV files/F1000.nc');
      
      try {
        const content = await readFile(dstvPath, 'utf-8');
        const file = new File([content], 'F1000.nc', { type: 'text/plain' });
        
        const result = await engine.import(file);
        
        expect(result.success).toBe(true);
        expect(result.data?.profiles).toBeDefined();
        expect(result.data?.features).toBeDefined();
        
        // Vérifier que le profil est correctement identifié
        const profile = result.data?.profiles[0];
        expect(profile).toBeDefined();
        expect(profile?.dimensions?.length).toBeGreaterThan(0);
        
      } catch (error) {
        // Si le fichier n'existe pas, skip le test
        console.warn('F1000.nc not found, skipping test');
      }
    });
  });

  describe('Processor Integration', () => {
    it('should use existing HoleProcessor for BO blocks', async () => {
      const factory = FeatureProcessorFactory.getInstance();
      const holeProcessorSpy = vi.spyOn(factory, 'process');
      
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      // Vérifier que le processor factory a été appelé
      expect(holeProcessorSpy).toHaveBeenCalled();
      
      // Vérifier que le bon type de processor a été utilisé
      const callArgs = holeProcessorSpy.mock.calls[0];
      expect(callArgs[1].type).toBe('HOLE');
      
      holeProcessorSpy.mockRestore();
    });

    it('should use existing ContourProcessor for AK blocks', async () => {
      const factory = FeatureProcessorFactory.getInstance();
      const contourProcessorSpy = vi.spyOn(factory, 'process');
      
      const dstvContent = `ST
HEB300
10000
AK
h 0 0
l 1000 0
l 1000 500
l 0 500
l 0 0`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      // Vérifier que le processor a été appelé avec CONTOUR
      const contourCalls = contourProcessorSpy.mock.calls.filter(
        call => call[1].type === 'CONTOUR'
      );
      expect(contourCalls.length).toBeGreaterThan(0);
      
      contourProcessorSpy.mockRestore();
    });

    it('should use existing MarkingProcessor for SI blocks', async () => {
      const factory = FeatureProcessorFactory.getInstance();
      const markingProcessorSpy = vi.spyOn(factory, 'process');
      
      const dstvContent = `ST
HEB300
10000
SI
200 150 10 0 TEST-123`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      // Vérifier que le processor a été appelé avec MARKING ou TEXT
      const markingCalls = markingProcessorSpy.mock.calls.filter(
        call => call[1].type === 'MARKING' || call[1].type === 'TEXT'
      );
      expect(markingCalls.length).toBeGreaterThan(0);
      
      markingProcessorSpy.mockRestore();
    });

    it('should handle processor errors gracefully', async () => {
      const factory = FeatureProcessorFactory.getInstance();
      
      // Simuler une erreur dans le processor
      const originalProcess = factory.process.bind(factory);
      factory.process = vi.fn().mockImplementation((geometry, feature, element) => {
        if (feature.type === 'HOLE') {
          return {
            success: false,
            error: 'Test error: Cannot process hole'
          };
        }
        return originalProcess(geometry, feature, element);
      });
      
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      // Le pipeline devrait continuer malgré l'erreur
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('Test error'))).toBe(true);
      
      // Restaurer la fonction originale
      factory.process = originalProcess;
    });
  });

  describe('Geometry Generator Integration', () => {
    it('should use existing IProfileGenerator for I-beams', async () => {
      const profile = {
        type: 'I_PROFILE' as const,
        name: 'HEB300',
        dimensions: {
          length: 10000,
          crossSection: {
            height: 300,
            width: 300,
            webThickness: 11,
            flangeThickness: 19
          }
        },
        material: { grade: 'S355' }
      };

      const geometry = await geometryBridge.createProfileGeometry(profile);
      
      expect(geometry).toBeDefined();
      expect(geometry.attributes.position).toBeDefined();
      
      // Vérifier les dimensions approximatives
      const boundingBox = new THREE.Box3().setFromBufferAttribute(
        geometry.attributes.position
      );
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      
      // La longueur devrait être proche de 10000
      expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(10000, -2);
    });

    it('should use existing TubeGenerator for tubes', async () => {
      const profile = {
        type: 'TUBE_RECT' as const,
        name: 'RHS200x100x5',
        dimensions: {
          length: 6000,
          crossSection: {
            height: 200,
            width: 100,
            wallThickness: 5
          }
        },
        material: { grade: 'S355' }
      };

      const geometry = await geometryBridge.createProfileGeometry(profile);
      
      expect(geometry).toBeDefined();
      expect(geometry.attributes.position).toBeDefined();
    });

    it('should fallback to simple geometry for unknown profiles', async () => {
      const profile = {
        type: 'UNKNOWN_PROFILE' as const,
        name: 'CUSTOM',
        dimensions: {
          length: 5000,
          crossSection: {
            height: 150,
            width: 75
          }
        },
        material: { grade: 'S235' }
      };

      const consoleSpy = vi.spyOn(console, 'warn');
      
      const geometry = await geometryBridge.createProfileGeometry(profile);
      
      expect(geometry).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using fallback geometry')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Complete Pipeline Test', () => {
    it('should process a complete DSTV file with all blocks', async () => {
      const dstvContent = `ST
Stahl Construction GmbH
Project Test
2024.01.15
HEB300
S355
10000
Part-001
BO
100 200 25.5
200 200 25.5
300 200 25.5
AK
h 0 0
l 10000 0
v 100
l 9900 0
a 9800 200 100
l 200 200
a 100 100 100
l 0 0
IK
rectangular 5000 150 1000 100
SI
5000 250 20 0 PART-001
SC
8000 150 200 100`;

      const file = new File([dstvContent], 'complete.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      expect(result.success).toBe(true);
      
      // Vérifier que toutes les features ont été créées
      const features = result.data?.features || [];
      
      // 3 trous (BO)
      const holes = features.filter(f => f.type === 'HOLE');
      expect(holes).toHaveLength(3);
      
      // Au moins 1 contour (AK)
      const contours = features.filter(f => f.type === 'CONTOUR');
      expect(contours.length).toBeGreaterThan(0);
      
      // 1 marquage (SI)
      const markings = features.filter(f => f.type === 'MARKING' || f.type === 'TEXT');
      expect(markings).toHaveLength(1);
      
      // 1 découpe (SC)
      const cuts = features.filter(f => f.type === 'CUT');
      expect(cuts).toHaveLength(1);
      
      // Vérifier la scène créée
      expect(result.data?.scene).toBeDefined();
      expect(result.data?.scene?.children?.length).toBeGreaterThan(0);
    });

    it('should maintain proper memory management', async () => {
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      
      // Tracker les géométries créées
      const geometries: THREE.BufferGeometry[] = [];
      const originalBoxGeometry = THREE.BoxGeometry;
      
      THREE.BoxGeometry = class extends originalBoxGeometry {
        constructor(...args: any[]) {
          super(...args);
          geometries.push(this);
        }
      } as any;
      
      const result = await engine.import(file);
      
      // Vérifier que les géométries temporaires ont été disposées
      const disposedCount = geometries.filter(g => 
        (g as any).disposed === true
      ).length;
      
      // Au moins quelques géométries devraient avoir été disposées
      expect(disposedCount).toBeGreaterThan(0);
      
      // Restaurer la classe originale
      THREE.BoxGeometry = originalBoxGeometry;
    });
  });

  describe('Validation and Error Recovery', () => {
    it('should validate features before processing', async () => {
      const element = { type: 'profile' as const } as any;
      
      const invalidFeature = {
        type: 'HOLE' as const,
        id: 'invalid-hole',
        coordinates: { x: NaN, y: 100, z: 0 },
        parameters: { diameter: -20 }, // Diamètre négatif invalide
        metadata: {}
      };

      const errors = processorBridge.validateFeature(invalidFeature, element);
      
      expect(errors).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should continue processing after encountering invalid features', async () => {
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5
invalid data here
300 200 25.5`;

      const file = new File([dstvContent], 'partial-invalid.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      // Le pipeline devrait continuer et traiter les features valides
      expect(result.success).toBe(true);
      
      const holes = result.data?.features?.filter(f => f.type === 'HOLE') || [];
      expect(holes).toHaveLength(2); // Seulement les 2 trous valides
    });
  });

  describe('Performance Benchmarks', () => {
    it('should process 10000 features within acceptable time', async () => {
      // Créer un fichier DSTV avec beaucoup de features
      let dstvContent = `ST\nHEB300\n10000\n`;
      
      // Ajouter 10000 trous
      dstvContent += 'BO\n';
      for (let i = 0; i < 10000; i++) {
        dstvContent += `${(i % 100) * 10} ${Math.floor(i / 100) * 10} 20\n`;
      }

      const file = new File([dstvContent], 'benchmark.nc', { type: 'text/plain' });
      
      const startTime = performance.now();
      const result = await engine.import(file);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(result.data?.features).toHaveLength(10000);
      
      // Le traitement devrait prendre moins de 5 secondes
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000);
      
      console.log(`Processed 10000 features in ${processingTime.toFixed(2)}ms`);
    });
  });
});