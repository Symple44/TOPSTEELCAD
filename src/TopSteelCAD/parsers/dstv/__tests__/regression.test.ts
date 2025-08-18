/**
 * Tests de régression - Compare l'ancien et le nouveau parser DSTV
 * Assure la parité fonctionnelle pendant la migration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import DSTVParserOld from '../../DSTVParser'; // Ancien parser monolithique
import { DSTVParser as DSTVParserNew } from '../DSTVParser'; // Nouveau parser modulaire
import { PivotScene } from '@/types/viewer';

describe('DSTV Parser Regression Tests', () => {
  let oldParser: DSTVParserOld;
  let newParser: DSTVParserNew;

  beforeAll(() => {
    oldParser = new DSTVParserOld();
    newParser = new DSTVParserNew();
  });

  describe('Basic Parsing', () => {
    it('should parse empty file identically', async () => {
      const content = 'ST\nEN\n';
      
      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      expect(newResult.elements.size).toBe(oldResult.elements.size);
    });

    it('should parse simple profile identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
300
150
7.1
10.7
35.5
2.45
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      expect(newResult.elements.size).toBe(oldResult.elements.size);
      
      // Compare first element
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement && newElement) {
        expect(newElement.name).toBe(oldElement.name);
        expect(newElement.dimensions.length).toBe(oldElement.dimensions.length);
      }
    });
  });

  describe('Holes Parsing', () => {
    it('should parse round holes identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
BO
v 500 75 22 10
v 1000 75 22 10
v 1500 75 22 10
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.features && newElement?.metadata?.features) {
        const oldHoles = oldElement.metadata.features.filter((f: any) => f.type === 'hole');
        const newHoles = newElement.metadata.features.filter((f: any) => f.type === 'hole');
        
        expect(newHoles.length).toBe(oldHoles.length);
      }
    });

    it('should parse slotted holes identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
BO
v 500 75 22 10l 50 45
v 1000 75 22 10l 30 90
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.features && newElement?.metadata?.features) {
        const oldHoles = oldElement.metadata.features.filter((f: any) => f.type === 'hole');
        const newHoles = newElement.metadata.features.filter((f: any) => f.type === 'hole');
        
        expect(newHoles.length).toBe(oldHoles.length);
        
        // Check slotted properties
        newHoles.forEach((hole: any, index: number) => {
          if (hole.holeType === 'slotted') {
            expect(hole.slottedLength).toBeDefined();
            expect(hole.slottedAngle).toBeDefined();
          }
        });
      }
    });

    it('should parse web holes (v...u notation) identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
BO
v 500u 75 22 10
v 1000u 75 22 10
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.features && newElement?.metadata?.features) {
        const oldHoles = oldElement.metadata.features.filter((f: any) => f.type === 'hole' && f.face === 'o');
        const newHoles = newElement.metadata.features.filter((f: any) => f.type === 'hole' && f.face === 'o');
        
        expect(newHoles.length).toBe(oldHoles.length);
      }
    });
  });

  describe('Contours and Cuts', () => {
    it('should parse simple contours identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
AK
v 0 0
v 5000 0
v 5000 300
v 0 300
v 0 0
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.contour && newElement?.metadata?.contour) {
        expect(newElement.metadata.contour.length).toBe(oldElement.metadata.contour.length);
      }
    });

    it('should detect transverse cuts identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
AK
v 0 0
v 4500 0
v 4500 300
v 0 300
v 0 0
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.features && newElement?.metadata?.features) {
        const oldCuts = oldElement.metadata.features.filter((f: any) => f.type === 'cut' && f.isTransverse);
        const newCuts = newElement.metadata.features.filter((f: any) => f.type === 'cut' && f.isTransverse);
        
        expect(newCuts.length).toBe(oldCuts.length);
      }
    });

    it('should parse complex 9-point contours identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
AK
v 0 0
v 4703 0
v 4703 100
v 5000 100
v 5000 150
v 4703 150
v 4703 300
v 0 300
v 0 0
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.features && newElement?.metadata?.features) {
        const oldCuts = oldElement.metadata.features.filter((f: any) => f.type === 'cut');
        const newCuts = newElement.metadata.features.filter((f: any) => f.type === 'cut');
        
        // Should detect the notch/extension
        expect(newCuts.length).toBeGreaterThan(0);
        expect(newCuts.length).toBe(oldCuts.length);
      }
    });
  });

  describe('Markings', () => {
    it('should parse markings identically', async () => {
      const content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
SI
v 100 150 10r"A1"
v 200 150 10r"B2"
EN`;

      const oldResult = await oldParser.parse(content);
      const newResult = await newParser.parse(content);
      
      const oldElement = Array.from(oldResult.elements.values())[0];
      const newElement = Array.from(newResult.elements.values())[0];
      
      if (oldElement?.metadata?.features && newElement?.metadata?.features) {
        const oldMarkings = oldElement.metadata.features.filter((f: any) => f.type === 'marking');
        const newMarkings = newElement.metadata.features.filter((f: any) => f.type === 'marking');
        
        expect(newMarkings.length).toBe(oldMarkings.length);
      }
    });
  });

  describe('Material Type Detection', () => {
    const testCases = [
      { designation: 'IPE300', expectedType: 'BEAM' },
      { designation: 'HEA200', expectedType: 'BEAM' },
      { designation: 'HEB300', expectedType: 'BEAM' },
      { designation: 'UPN200', expectedType: 'CHANNEL' },
      { designation: 'L 100x100x10', expectedType: 'ANGLE' },
      { designation: 'RHS100x50x5', expectedType: 'TUBE' },
      { designation: 'PL 20', expectedType: 'PLATE' },
      { designation: 'FLAT 100x10', expectedType: 'PLATE' }
    ];

    testCases.forEach(({ designation, expectedType }) => {
      it(`should detect ${designation} as ${expectedType}`, async () => {
        const content = `ST
1001
P001
1
S355
5
${designation}
10
5000
EN`;

        const oldResult = await oldParser.parse(content);
        const newResult = await newParser.parse(content);
        
        const oldElement = Array.from(oldResult.elements.values())[0];
        const newElement = Array.from(newResult.elements.values())[0];
        
        if (oldElement && newElement) {
          expect(newElement.materialType).toBe(oldElement.materialType);
        }
      });
    });
  });

  describe('Validation', () => {
    it('should validate files identically', () => {
      const validContent = 'ST\nTest\nEN\n';
      const invalidContent = 'Invalid DSTV';
      
      expect(newParser.validate(validContent)).toBe(oldParser.validate(validContent));
      expect(newParser.validate(invalidContent)).toBe(oldParser.validate(invalidContent));
    });
  });

  describe('Performance Comparison', () => {
    it('should parse large file within acceptable time difference', async () => {
      // Generate large content
      let content = `ST
1001
P001
1
S355
5
IPE300
10
5000
EN
BO\n`;
      
      // Add 100 holes
      for (let i = 0; i < 100; i++) {
        content += `v ${i * 50} 75 22 10\n`;
      }
      content += 'EN\n';
      
      const oldStart = performance.now();
      await oldParser.parse(content);
      const oldTime = performance.now() - oldStart;
      
      const newStart = performance.now();
      await newParser.parse(content);
      const newTime = performance.now() - newStart;
      
      // New parser should not be more than 2x slower
      expect(newTime).toBeLessThan(oldTime * 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input similarly', async () => {
      const malformedInputs = [
        '',
        'ST',
        'ST\n',
        'BO\nv 100 200\nEN',
        'ST\n\n\n\nEN',
        'ST\nInvalid\nData\nEN'
      ];
      
      for (const input of malformedInputs) {
        let oldError: Error | null = null;
        let newError: Error | null = null;
        
        try {
          await oldParser.parse(input);
        } catch (e) {
          oldError = e as Error;
        }
        
        try {
          await newParser.parse(input);
        } catch (e) {
          newError = e as Error;
        }
        
        // Both should either succeed or fail
        expect(!!newError).toBe(!!oldError);
      }
    });
  });
});

describe('Feature Completeness Check', () => {
  const newParser = new DSTVParserNew();
  
  it('should have all required methods', () => {
    expect(typeof newParser.parse).toBe('function');
    expect(typeof newParser.validate).toBe('function');
    expect(newParser.supportedExtensions).toContain('.nc');
    expect(newParser.supportedExtensions).toContain('.nc1');
  });
  
  it('should export correct types', () => {
    expect(newParser).toBeInstanceOf(DSTVParserNew);
  });
});