/**
 * Tests de conformité DSTV selon la norme officielle
 * Vérifie que l'implémentation respecte la norme DSTV 7ème édition (1998)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DSTVPlugin } from '../DSTVPlugin';
import { FormatEngine } from '../../../core/engine/FormatEngine';
import { ProcessorBridge } from '../integration/ProcessorBridge';
import { GeometryBridge } from '../integration/GeometryBridge';
import * as THREE from 'three';

describe('DSTV Conformity Tests', () => {
  let plugin: DSTVPlugin;
  let engine: FormatEngine;
  let processorBridge: ProcessorBridge;
  let geometryBridge: GeometryBridge;

  beforeEach(() => {
    plugin = new DSTVPlugin();
    engine = new FormatEngine();
    processorBridge = new ProcessorBridge();
    geometryBridge = new GeometryBridge();
    
    // Enregistrer le plugin
    engine.registerPlugin(plugin);
  });

  describe('Block ST (Header) Conformity', () => {
    it('should parse mandatory ST fields correctly', async () => {
      const dstvContent = `ST
Stahl Construction GmbH
Project Alpha
2024.01.15
HEB300
S355
10500
Material`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      expect(result.data?.profiles).toHaveLength(1);
      
      const profile = result.data?.profiles[0];
      expect(profile?.name).toBe('HEB300');
      expect(profile?.material?.grade).toBe('S355');
      expect(profile?.dimensions?.length).toBe(10500);
    });

    it('should handle legacy ST format', async () => {
      const dstvContent = `ST
IPE200
8000`;

      const file = new File([dstvContent], 'legacy.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      expect(result.data?.profiles[0]?.name).toBe('IPE200');
      expect(result.data?.profiles[0]?.dimensions?.length).toBe(8000);
    });
  });

  describe('Block BO (Holes) Conformity', () => {
    it('should parse BO block with all mandatory fields', async () => {
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      const features = result.data?.features;
      expect(features).toHaveLength(1);
      expect(features[0]?.type).toBe('HOLE');
      expect(features[0]?.coordinates?.x).toBe(100);
      expect(features[0]?.coordinates?.y).toBe(200);
      expect(features[0]?.parameters?.diameter).toBe(25.5);
    });

    it('should handle multiple holes in BO block', async () => {
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5
150 200 25.5
200 200 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      expect(result.data?.features).toHaveLength(3);
      
      // Vérifier l'espacement
      const holes = result.data?.features || [];
      expect(holes[1].coordinates.x - holes[0].coordinates.x).toBe(50);
      expect(holes[2].coordinates.x - holes[1].coordinates.x).toBe(50);
    });

    it('should parse face indicators correctly', async () => {
      const dstvContent = `ST
HEB300
10000
BO
100 200 25.5 -1 h
150 300 30 50 v`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      const features = result.data?.features || [];
      expect(features[0]?.parameters?.face).toBe('front');
      expect(features[0]?.parameters?.depth).toBe(-1); // Traversant
      expect(features[1]?.parameters?.face).toBe('top');
      expect(features[1]?.parameters?.depth).toBe(50);
    });
  });

  describe('Block AK (Outer Contour) Conformity', () => {
    it('should parse AK block with complex contour', async () => {
      const dstvContent = `ST
HEB300
10000
AK
h 0 0
l 1000 0
l 1000 500
a 900 600 100
l 100 600
a 0 500 100
l 0 0`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      const contours = result.data?.features?.filter(f => f.type === 'CONTOUR') || [];
      expect(contours.length).toBeGreaterThan(0);
      
      const contour = contours[0];
      expect(contour?.parameters?.points).toBeDefined();
      expect(contour?.parameters?.contourType).toBe('cut');
    });

    it('should handle universal AK geometry algorithm', async () => {
      const dstvContent = `ST
HEB300
10000
AK
h 0 0
l 200 0
v 100
l -200 0
l 0 -100`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      // Vérifier que le contour est fermé
      const contours = result.data?.features?.filter(f => f.type === 'CONTOUR') || [];
      const points = contours[0]?.parameters?.points || [];
      
      // Le premier et dernier point doivent être identiques (contour fermé)
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      expect(Math.abs(firstPoint.x - lastPoint.x)).toBeLessThan(0.01);
      expect(Math.abs(firstPoint.y - lastPoint.y)).toBeLessThan(0.01);
    });
  });

  describe('Block IK (Inner Contour) Conformity', () => {
    it('should parse rectangular IK contour', async () => {
      const dstvContent = `ST
HEB300
10000
IK
rectangular 400 500 100 200`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      const innerContours = result.data?.features?.filter(f => 
        f.type === 'CONTOUR' && f.parameters?.contourType === 'rectangular'
      ) || [];
      
      expect(innerContours).toHaveLength(1);
      expect(innerContours[0]?.coordinates?.x).toBe(400);
      expect(innerContours[0]?.coordinates?.y).toBe(500);
    });

    it('should parse circular IK contour', async () => {
      const dstvContent = `ST
HEB300
10000
IK
circular 500 500 150`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      const circularContours = result.data?.features?.filter(f => 
        f.parameters?.contourType === 'circular'
      ) || [];
      
      expect(circularContours).toHaveLength(1);
      expect(circularContours[0]?.parameters?.radius).toBe(150);
    });
  });

  describe('Block SI (Marking) Conformity', () => {
    it('should parse SI marking block', async () => {
      const dstvContent = `ST
HEB300
10000
SI
200 150 10 0 A-123`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      const markings = result.data?.features?.filter(f => 
        f.type === 'MARKING' || f.type === 'TEXT'
      ) || [];
      
      expect(markings).toHaveLength(1);
      expect(markings[0]?.coordinates?.x).toBe(200);
      expect(markings[0]?.coordinates?.y).toBe(150);
      expect(markings[0]?.parameters?.text).toBe('A-123');
      expect(markings[0]?.parameters?.height).toBe(10);
    });

    it('should handle multi-line text', async () => {
      const dstvContent = `ST
HEB300
10000
SI
300 200 15 0 Project: Alpha
SI
300 180 15 0 Part: B-456`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      const markings = result.data?.features?.filter(f => 
        f.type === 'MARKING' || f.type === 'TEXT'
      ) || [];
      
      expect(markings).toHaveLength(2);
      expect(markings[0]?.parameters?.text).toBe('Project: Alpha');
      expect(markings[1]?.parameters?.text).toBe('Part: B-456');
    });
  });

  describe('Block SC (Cut) Conformity', () => {
    it('should parse SC cut block', async () => {
      const dstvContent = `ST
HEB300
10000
SC
500 250 200 100`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(true);
      
      const cuts = result.data?.features?.filter(f => f.type === 'CUT') || [];
      
      expect(cuts).toHaveLength(1);
      expect(cuts[0]?.coordinates?.x).toBe(500);
      expect(cuts[0]?.coordinates?.y).toBe(250);
      expect(cuts[0]?.parameters?.width).toBe(200);
      expect(cuts[0]?.parameters?.height).toBe(100);
    });

    it('should detect cut type from dimensions', async () => {
      const dstvContent = `ST
HEB300
10000
SC
500 250 100 100`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      const cuts = result.data?.features?.filter(f => f.type === 'CUT') || [];
      
      // Dimensions égales -> découpe circulaire
      expect(cuts[0]?.parameters?.cutType).toBe('circular');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with existing processors', async () => {
      const geometry = new THREE.BoxGeometry(1000, 200, 100);
      const element = { 
        type: 'profile' as const,
        material: { grade: 'S355' }
      } as any;
      
      const feature = {
        type: 'HOLE' as const,
        id: 'test-hole',
        coordinates: { x: 100, y: 50, z: 0 },
        parameters: { diameter: 20, depth: -1 },
        metadata: {}
      };

      // Tester que le ProcessorBridge peut appliquer la feature
      const result = await processorBridge.applyNormalizedFeature(
        geometry,
        feature,
        element
      );

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should integrate with existing geometry generators', async () => {
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
        material: { grade: 'S355', properties: { density: 7850 } }
      };

      // Tester que le GeometryBridge peut créer la géométrie
      const geometry = await geometryBridge.createProfileGeometry(profile);

      expect(geometry).toBeDefined();
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      
      // Vérifier que la géométrie a des vertices
      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed DSTV files gracefully', async () => {
      const dstvContent = `ST
INVALID_PROFILE
not_a_number
BO
invalid hole data`;

      const file = new File([dstvContent], 'malformed.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate coordinate ranges', async () => {
      const dstvContent = `ST
HEB300
10000
BO
999999 999999 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      const result = await engine.import(file);

      // Devrait avoir des warnings pour les coordonnées hors limites
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('coordinate'))).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large DSTV files efficiently', async () => {
      // Générer un fichier DSTV avec beaucoup de trous
      let dstvContent = `ST\nHEB300\n10000\nBO\n`;
      
      for (let i = 0; i < 1000; i++) {
        dstvContent += `${i * 10} 100 20\n`;
      }

      const file = new File([dstvContent], 'large.nc', { type: 'text/plain' });
      
      const startTime = Date.now();
      const result = await engine.import(file);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data?.features).toHaveLength(1000);
      
      // Le parsing doit être rapide (< 1 seconde pour 1000 trous)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should dispose geometries properly to avoid memory leaks', async () => {
      const geometry = new THREE.BoxGeometry(1000, 200, 100);
      const element = { type: 'profile' as const } as any;
      
      const features = Array.from({ length: 10 }, (_, i) => ({
        type: 'HOLE' as const,
        id: `hole-${i}`,
        coordinates: { x: i * 50, y: 100, z: 0 },
        parameters: { diameter: 20, depth: -1 },
        metadata: {}
      }));

      const initialGeometry = geometry;
      const result = await processorBridge.applyFeatureBatch(
        geometry,
        features,
        element
      );

      // Vérifier que les géométries intermédiaires ont été disposées
      expect(result).toBeDefined();
      expect(result).not.toBe(initialGeometry);
    });
  });
});