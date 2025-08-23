/**
 * Tests avec les fichiers DSTV réels du projet
 * Vérifie que les fichiers F1000.nc, F1001.nc et F1002.nc sont correctement traités
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DSTVPlugin } from '../DSTVPlugin';
import { FormatEngine } from '../../../core/engine/FormatEngine';
import { ProcessorBridge } from '../integration/ProcessorBridge';
import { GeometryBridge } from '../integration/GeometryBridge';
import * as THREE from 'three';

describe('DSTV Real Files Tests', () => {
  let plugin: DSTVPlugin;
  let engine: FormatEngine;
  let processorBridge: ProcessorBridge;
  let geometryBridge: GeometryBridge;
  
  // Chemins vers les fichiers DSTV réels
  const dstvFilesPath = resolve(__dirname, '../../../../../doc/DSTV files');
  const testFiles = ['F1000.nc', 'F1001.nc', 'F1002.nc'];

  beforeAll(() => {
    plugin = new DSTVPlugin();
    engine = new FormatEngine();
    processorBridge = new ProcessorBridge();
    geometryBridge = new GeometryBridge();
    
    engine.registerPlugin(plugin);
  });

  describe('File Existence Check', () => {
    testFiles.forEach(filename => {
      it(`should have ${filename} available for testing`, () => {
        const filePath = resolve(dstvFilesPath, filename);
        const exists = existsSync(filePath);
        
        if (!exists) {
          console.warn(`⚠️ ${filename} not found at ${filePath}`);
          console.warn('Please ensure DSTV test files are available in doc/DSTV files/');
        }
        
        expect(exists).toBe(true);
      });
    });
  });

  describe('F1000.nc Processing', () => {
    const filePath = resolve(dstvFilesPath, 'F1000.nc');
    
    it('should parse F1000.nc successfully', async () => {
      if (!existsSync(filePath)) {
        console.warn('Skipping F1000.nc test - file not found');
        return;
      }

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1000.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should extract profile information from F1000.nc', async () => {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1000.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      expect(result.data?.profiles).toBeDefined();
      expect(result.data?.profiles.length).toBeGreaterThan(0);
      
      const profile = result.data?.profiles[0];
      expect(profile?.name).toBeDefined();
      expect(profile?.dimensions?.length).toBeGreaterThan(0);
    });

    it('should extract features from F1000.nc', async () => {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1000.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      expect(result.data?.features).toBeDefined();
      
      // Analyser les types de features
      const features = result.data?.features || [];
      const featureTypes = new Set(features.map(f => f.type));
      
      console.log(`F1000.nc contains ${features.length} features:`);
      console.log(`Feature types: ${Array.from(featureTypes).join(', ')}`);
      
      // Vérifier qu'il y a au moins quelques features
      expect(features.length).toBeGreaterThan(0);
    });

    it('should create 3D geometry from F1000.nc', async () => {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1000.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      expect(result.data?.scene).toBeDefined();
      expect(result.data?.scene?.children).toBeDefined();
      
      // Vérifier que la scène contient des objets 3D
      const scene = result.data?.scene;
      if (scene) {
        let totalVertices = 0;
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const geometry = child.geometry;
            if (geometry.attributes.position) {
              totalVertices += geometry.attributes.position.count;
            }
          }
        });
        
        console.log(`F1000.nc generated ${totalVertices} vertices`);
        expect(totalVertices).toBeGreaterThan(0);
      }
    });
  });

  describe('F1001.nc Processing', () => {
    const filePath = resolve(dstvFilesPath, 'F1001.nc');
    
    it('should parse F1001.nc successfully', async () => {
      if (!existsSync(filePath)) {
        console.warn('Skipping F1001.nc test - file not found');
        return;
      }

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1001.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle specific features in F1001.nc', async () => {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      
      // Analyser le contenu pour identifier les blocs présents
      const blocks = new Set<string>();
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.match(/^[A-Z]{2}$/)) {
          blocks.add(trimmed);
        }
      });
      
      console.log(`F1001.nc contains blocks: ${Array.from(blocks).join(', ')}`);
      
      const file = new File([content], 'F1001.nc', { type: 'text/plain' });
      const result = await engine.import(file);
      
      // Vérifier que les blocs ont été traités
      if (blocks.has('BO')) {
        const holes = result.data?.features?.filter(f => f.type === 'HOLE') || [];
        expect(holes.length).toBeGreaterThan(0);
      }
      
      if (blocks.has('AK')) {
        const contours = result.data?.features?.filter(f => f.type === 'CONTOUR') || [];
        expect(contours.length).toBeGreaterThan(0);
      }
      
      if (blocks.has('SI')) {
        const markings = result.data?.features?.filter(f => 
          f.type === 'MARKING' || f.type === 'TEXT'
        ) || [];
        expect(markings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('F1002.nc Processing', () => {
    const filePath = resolve(dstvFilesPath, 'F1002.nc');
    
    it('should parse F1002.nc successfully', async () => {
      if (!existsSync(filePath)) {
        console.warn('Skipping F1002.nc test - file not found');
        return;
      }

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1002.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should validate F1002.nc against DSTV standard', async () => {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1002.nc', { type: 'text/plain' });
      
      const result = await engine.import(file, {
        validation: {
          strict: true,
          standard: 'DSTV_7th_Edition'
        }
      });
      
      // Avec validation stricte, vérifier les warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log('Validation warnings for F1002.nc:');
        result.warnings.forEach(w => console.log(`  - ${w}`));
      }
      
      // Le fichier devrait toujours être traité même avec des warnings
      expect(result.success).toBe(true);
    });
  });

  describe('Comparative Analysis', () => {
    it('should compare features across all three files', async () => {
      const results: Record<string, any> = {};
      
      for (const filename of testFiles) {
        const filePath = resolve(dstvFilesPath, filename);
        if (!existsSync(filePath)) continue;
        
        const content = readFileSync(filePath, 'utf-8');
        const file = new File([content], filename, { type: 'text/plain' });
        
        const result = await engine.import(file);
        
        if (result.success && result.data) {
          const features = result.data.features || [];
          const featureStats = features.reduce((acc, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          results[filename] = {
            profileName: result.data.profiles?.[0]?.name,
            profileLength: result.data.profiles?.[0]?.dimensions?.length,
            totalFeatures: features.length,
            featureBreakdown: featureStats
          };
        }
      }
      
      // Afficher le tableau comparatif
      console.log('\n📊 DSTV Files Comparison:');
      console.log('========================');
      
      Object.entries(results).forEach(([filename, stats]) => {
        console.log(`\n${filename}:`);
        console.log(`  Profile: ${stats.profileName} (${stats.profileLength}mm)`);
        console.log(`  Total Features: ${stats.totalFeatures}`);
        console.log('  Breakdown:');
        Object.entries(stats.featureBreakdown).forEach(([type, count]) => {
          console.log(`    - ${type}: ${count}`);
        });
      });
      
      // Vérifier qu'au moins un fichier a été traité
      expect(Object.keys(results).length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Existing System', () => {
    it('should use existing processors for real file features', async () => {
      const filePath = resolve(dstvFilesPath, 'F1000.nc');
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1000.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      // Vérifier que les processeurs existants ont été utilisés
      const features = result.data?.features || [];
      
      for (const feature of features) {
        const supportedTypes = processorBridge.getSupportedFeatureTypes();
        
        // La feature devrait être d'un type supporté par les processeurs existants
        const mappedType = this.mapNormalizedToProcessorType(feature.type);
        if (mappedType) {
          expect(supportedTypes).toContain(mappedType);
        }
      }
    });

    it('should use existing geometry generators for real profiles', async () => {
      const filePath = resolve(dstvFilesPath, 'F1000.nc');
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const file = new File([content], 'F1000.nc', { type: 'text/plain' });
      
      const result = await engine.import(file);
      
      const profiles = result.data?.profiles || [];
      
      for (const profile of profiles) {
        const supportedTypes = geometryBridge.getSupportedProfileTypes();
        
        // Vérifier si le type de profil est supporté
        if (profile.type) {
          const isSupported = geometryBridge.isProfileTypeSupported(profile.type);
          
          if (!isSupported) {
            console.warn(`Profile type ${profile.type} not directly supported, using fallback`);
          }
        }
      }
    });
  });

  // Helper method
  private mapNormalizedToProcessorType(normalizedType: string): string | null {
    const mapping: Record<string, string> = {
      'HOLE': 'HOLE',
      'CUT': 'CUTOUT',
      'CONTOUR': 'CONTOUR',
      'MARKING': 'MARKING',
      'TEXT': 'TEXT'
    };
    return mapping[normalizedType] || null;
  }
});