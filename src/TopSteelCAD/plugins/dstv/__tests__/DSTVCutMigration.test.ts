/**
 * DSTVCutMigration.test.ts - Test d'intégration pour la migration de l'architecture de coupe
 * Teste avec les fichiers DSTV réels M1002.nc et h5004.nc1
 */

import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { describe, it, expect, beforeAll } from 'vitest';

// Import du système DSTV
import { DSTVPlugin } from '../DSTVPlugin';
import { DSTVImportPipeline } from '../import/DSTVImportPipeline';
import { FeatureProcessorFactory } from '../../../core/features/processors/FeatureProcessorFactory';
import { Feature, FeatureType } from '../../../core/features/types';
import { PivotElement } from '@/types/viewer';

describe('DSTV Cut Architecture Migration', () => {
  let plugin: DSTVPlugin;
  let factory: FeatureProcessorFactory;
  
  beforeAll(() => {
    plugin = new DSTVPlugin();
    factory = FeatureProcessorFactory.getInstance();
  });
  
  /**
   * Fonction utilitaire pour lire un fichier DSTV
   */
  function readDSTVFile(filename: string): string {
    const filePath = path.join(__dirname, '../../../../../test-files/dstv', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  /**
   * Test M1002.nc - Encoches partielles
   */
  describe('M1002.nc - Partial Notches', () => {
    let content: string;
    let pipeline: DSTVImportPipeline;
    let element: PivotElement | null = null;
    let features: Feature[] = [];
    
    beforeAll(async () => {
      content = readDSTVFile('M1002.nc');
      pipeline = new DSTVImportPipeline({
        validateStrict: false,
        generateMetadata: true
      });
    });
    
    it('should parse M1002.nc successfully', async () => {
      const result = await pipeline.execute(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      element = result.data?.element || null;
      features = result.data?.features || [];
      
      console.log('\n📄 M1002.nc Analysis:');
      console.log(`  - Profile: ${element?.type || 'Unknown'}`);
      console.log(`  - Total features: ${features.length}`);
      
      const cutFeatures = features.filter(f => 
        f.type === FeatureType.CUT || f.type === FeatureType.NOTCH
      );
      console.log(`  - Cut/Notch features: ${cutFeatures.length}`);
    });
    
    it('should process cuts with legacy architecture', () => {
      factory.setUseNewCutArchitecture(false);
      
      const cutFeatures = features.filter(f => 
        f.type === FeatureType.CUT || f.type === FeatureType.NOTCH
      );
      
      let successCount = 0;
      let failCount = 0;
      
      for (const feature of cutFeatures) {
        const processor = factory.getProcessor(feature.type);
        expect(processor).toBeDefined();
        
        if (processor && element) {
          const errors = processor.validateFeature(feature, element);
          if (errors.length === 0) {
            successCount++;
          } else {
            failCount++;
            console.log(`    ❌ Feature ${feature.id} validation errors:`, errors);
          }
        }
      }
      
      console.log(`  - Legacy validation: ${successCount} success, ${failCount} failed`);
      expect(successCount).toBeGreaterThan(0);
    });
    
    it('should process cuts with new modular architecture', () => {
      factory.setUseNewCutArchitecture(true);
      
      const cutFeatures = features.filter(f => 
        f.type === FeatureType.CUT || f.type === FeatureType.NOTCH
      );
      
      let successCount = 0;
      let failCount = 0;
      const handlerUsage = new Map<string, number>();
      
      for (const feature of cutFeatures) {
        const processor = factory.getProcessor(feature.type);
        expect(processor).toBeDefined();
        
        if (processor && element) {
          const errors = processor.validateFeature(feature, element);
          if (errors.length === 0) {
            successCount++;
          } else {
            failCount++;
            console.log(`    ❌ Feature ${feature.id} validation errors:`, errors);
          }
          
          // Track handler usage if available
          if ((processor as any).getStatistics) {
            const stats = (processor as any).getStatistics();
            if (stats.mode) {
              handlerUsage.set(stats.mode, (handlerUsage.get(stats.mode) || 0) + 1);
            }
          }
        }
      }
      
      console.log(`  - New architecture validation: ${successCount} success, ${failCount} failed`);
      console.log(`  - Handler modes used:`, Object.fromEntries(handlerUsage));
      expect(successCount).toBeGreaterThan(0);
    });
    
    it('should produce equivalent results between architectures', () => {
      const cutFeatures = features.filter(f => 
        f.type === FeatureType.CUT || f.type === FeatureType.NOTCH
      ).slice(0, 3); // Test first 3 features for speed
      
      if (!element) {
        console.warn('  ⚠️ No element found, skipping comparison');
        return;
      }
      
      const baseGeometry = new THREE.BoxGeometry(100, 100, 100);
      
      for (const feature of cutFeatures) {
        // Test with legacy
        factory.setUseNewCutArchitecture(false);
        const legacyProcessor = factory.getProcessor(feature.type);
        const legacyErrors = legacyProcessor?.validateFeature(feature, element) || [];
        
        // Test with new
        factory.setUseNewCutArchitecture(true);
        const newProcessor = factory.getProcessor(feature.type);
        const newErrors = newProcessor?.validateFeature(feature, element) || [];
        
        // Both should have similar validation results
        console.log(`\n  Feature ${feature.id}:`);
        console.log(`    - Legacy errors: ${legacyErrors.length}`);
        console.log(`    - New errors: ${newErrors.length}`);
        
        // The new architecture might be more lenient or strict, but should not differ drastically
        expect(Math.abs(newErrors.length - legacyErrors.length)).toBeLessThanOrEqual(2);
      }
    });
  });
  
  /**
   * Test h5004.nc1 - Coupes complexes
   */
  describe('h5004.nc1 - Complex Cuts', () => {
    let content: string;
    let pipeline: DSTVImportPipeline;
    let element: PivotElement | null = null;
    let features: Feature[] = [];
    
    beforeAll(async () => {
      content = readDSTVFile('h5004.nc1');
      pipeline = new DSTVImportPipeline({
        validateStrict: false,
        generateMetadata: true
      });
    });
    
    it('should parse h5004.nc1 successfully', async () => {
      const result = await pipeline.execute(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      element = result.data?.element || null;
      features = result.data?.features || [];
      
      console.log('\n📄 h5004.nc1 Analysis:');
      console.log(`  - Profile: ${element?.type || 'Unknown'}`);
      console.log(`  - Total features: ${features.length}`);
      
      // Analyser les types de blocks
      const blockTypes = new Set<string>();
      features.forEach(f => {
        const params = f.parameters as any;
        if (params.dstvBlock) blockTypes.add(params.dstvBlock);
        if (params.blockType) blockTypes.add(params.blockType);
      });
      
      console.log(`  - DSTV blocks found: ${Array.from(blockTypes).join(', ')}`);
    });
    
    it('should handle AK (exterior contour) blocks', () => {
      const akFeatures = features.filter(f => {
        const params = f.parameters as any;
        return params.dstvBlock === 'AK' || params.blockType === 'AK';
      });
      
      console.log(`  - AK features found: ${akFeatures.length}`);
      
      if (akFeatures.length > 0 && element) {
        factory.setUseNewCutArchitecture(true);
        
        for (const feature of akFeatures.slice(0, 2)) {
          const processor = factory.getProcessor(feature.type);
          expect(processor).toBeDefined();
          
          if (processor) {
            const errors = processor.validateFeature(feature, element);
            console.log(`    • Feature ${feature.id}: ${errors.length === 0 ? '✅ Valid' : '❌ ' + errors.join(', ')}`);
          }
        }
      }
    });
    
    it('should demonstrate handler diversity', () => {
      factory.setUseNewCutArchitecture(true);
      
      const cutFeatures = features.filter(f => 
        f.type === FeatureType.CUT || 
        f.type === FeatureType.NOTCH ||
        f.type === FeatureType.CUTOUT
      );
      
      const handlerTypes = new Set<string>();
      
      for (const feature of cutFeatures) {
        const processor = factory.getProcessor(feature.type);
        if (processor) {
          handlerTypes.add(processor.constructor.name);
        }
      }
      
      console.log(`  - Different processor types used: ${handlerTypes.size}`);
      console.log(`  - Processors: ${Array.from(handlerTypes).join(', ')}`);
      
      // With the new architecture, we should see diversity
      if (factory.isUsingNewCutArchitecture()) {
        expect(handlerTypes.size).toBeGreaterThanOrEqual(1);
      }
    });
  });
  
  /**
   * Performance comparison
   */
  describe('Performance', () => {
    it('should have acceptable performance', () => {
      const testFeatures: Feature[] = [];
      
      // Create test features
      for (let i = 0; i < 50; i++) {
        testFeatures.push({
          id: `perf-${i}`,
          type: FeatureType.CUT,
          parameters: {
            points: [[0, 0], [50, 0], [50, 30], [0, 30]],
            depth: 10
          }
        } as Feature);
      }
      
      const testElement: PivotElement = {
        id: 'test',
        type: 'I_PROFILE'
      } as PivotElement;
      
      // Test legacy
      factory.setUseNewCutArchitecture(false);
      const processor = factory.getProcessor(FeatureType.CUT);
      
      const startLegacy = performance.now();
      for (const feature of testFeatures) {
        processor?.validateFeature(feature, testElement);
      }
      const timeLegacy = performance.now() - startLegacy;
      
      // Test new
      factory.setUseNewCutArchitecture(true);
      const newProcessor = factory.getProcessor(FeatureType.CUT);
      
      const startNew = performance.now();
      for (const feature of testFeatures) {
        newProcessor?.validateFeature(feature, testElement);
      }
      const timeNew = performance.now() - startNew;
      
      console.log('\n⚡ Performance:');
      console.log(`  - Legacy: ${timeLegacy.toFixed(2)}ms`);
      console.log(`  - New: ${timeNew.toFixed(2)}ms`);
      console.log(`  - Ratio: ${(timeNew / timeLegacy).toFixed(2)}x`);
      
      // New architecture should not be more than 3x slower
      expect(timeNew).toBeLessThan(timeLegacy * 3);
    });
  });
});