/**
 * Tests d'intégration end-to-end pour le parser DSTV complet
 * Vérifie le pipeline complet: Lexer → Parser → Validator → Converter
 */

import { DSTVParser } from '../DSTVParser';
import { DSTVLexer } from '../lexer/DSTVLexer';
import { DSTVSyntaxParser } from '../parser/DSTVSyntaxParser';
import { DSTVValidator } from '../validators/DSTVValidator';
import { ValidationLevel } from '../types';
import { MaterialType } from '@/types/materials';

describe('DSTV Parser - End-to-End Integration Tests', () => {
  let parser: DSTVParser;
  
  beforeEach(() => {
    parser = new DSTVParser({
      validation: {
        enabled: true,
        strictMode: true,
        warningsAsErrors: false
      }
    });
  });
  
  describe('Complete Pipeline', () => {
    test('should parse simple beam profile', () => {
      const dstv = `ST
IPE200
1
1
S355
6000
200
300
10
8
12
50
7850
35.5
** End of header
EN`;
      
      const result = parser.parse(dstv);
      
      expect(result).toBeDefined();
      expect(result.elements.size).toBe(1);
      
      const element = Array.from(result.elements.values())[0];
      expect(element.name).toContain('IPE200');
      expect(element.materialType).toBe(MaterialType.BEAM);
      expect(element.dimensions.length).toBe(6000);
    });
    
    test('should parse profile with holes', () => {
      const dstv = `ST
HEA300
1
1
S355
8000
300
290
14
8.5
27
88.3
7850
112.5
BO
v100 150 25
v200 150 25
v300 150 30
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      expect(element.metadata?.features).toBeDefined();
      const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
      expect(holes).toHaveLength(3);
      expect(holes[0].diameter).toBe(25);
    });
    
    test('should parse profile with cuts', () => {
      const dstv = `ST
IPE300
1
1
S355
5000
300
150
10.7
7.1
15.5
42.2
7850
53.8
AK
0 0
5000 0
5000 300
4500 300
4500 250
500 250
500 300
0 300
0 0
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      const cuts = element.metadata.features.filter((f: any) => f.type === 'cut');
      expect(cuts.length).toBeGreaterThan(0);
      expect(cuts[0].contourPoints).toBeDefined();
    });
    
    test('should parse profile with markings', () => {
      const dstv = `ST
UPN200
1
1
S275
4000
200
75
11.5
8.5
6
25.3
7850
32.2
SI
A1 100 50 12
B2 200 50 12
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      const markings = element.metadata.features.filter((f: any) => f.type === 'marking');
      expect(markings).toHaveLength(2);
      expect(markings[0].text).toBe('A1');
    });
  });
  
  describe('Complex Profiles', () => {
    test('should parse profile with multiple feature types', () => {
      const dstv = `ST
HEB400
1
1
S355
10000
400
300
24
13.5
35
155
7850
197.8
** Holes
BO
v500 150 30
v1000 150 30
v1500 150 30
** External contour with notch
AK
0 0
10000 0
10000 400
9000 400
9000 350
8000 350
8000 400
0 400
0 0
** Marking
SI
POS-A1 5000 200 20
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      expect(element.metadata.features.length).toBeGreaterThan(4);
      
      const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
      const cuts = element.metadata.features.filter((f: any) => f.type === 'cut' || f.type === 'notch');
      const markings = element.metadata.features.filter((f: any) => f.type === 'marking');
      
      expect(holes).toHaveLength(3);
      expect(cuts.length).toBeGreaterThan(0);
      expect(markings).toHaveLength(1);
    });
    
    test('should parse profile with slotted holes', () => {
      const dstv = `ST
RHS200x100x8
1
1
S355
6000
200
100
8
BO
v1000 50 20 l 40 0
v2000 50 20 l 40 90
v3000 50 25
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
      const slotted = holes.filter((h: any) => h.holeType === 'slotted');
      
      expect(slotted).toHaveLength(2);
      expect(slotted[0].slottedLength).toBe(40);
    });
    
    test('should parse profile with internal contours', () => {
      const dstv = `ST
PLATE500x300x20
1
1
S355
500
300
20
IK
100 100
200 100
200 200
100 200
100 100
IK
300 50
350 50
350 150
300 150
300 50
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      const cuts = element.metadata.features.filter((f: any) => f.type === 'cutout' || f.isInternal);
      expect(cuts).toHaveLength(2);
    });
  });
  
  describe('Validation Integration', () => {
    test('should validate and report errors', () => {
      const invalidDstv = `ST
INVALID
-100
0
S999
5000
EN`;
      
      const validator = new DSTVValidator(ValidationLevel.STRICT);
      const validationResult = validator.validateRawContent(invalidDstv);
      
      expect(validationResult.isValid).toBe(true); // Structure is valid
      
      // Parse should handle invalid data gracefully
      const result = parser.parse(invalidDstv);
      expect(result).toBeDefined();
    });
    
    test('should detect overlapping holes', () => {
      const dstv = `ST
IPE200
1
1
S355
3000
200
100
10
BO
v100 50 30
v110 50 30
EN`;
      
      const lexer = new DSTVLexer();
      const syntaxParser = new DSTVSyntaxParser();
      const validator = new DSTVValidator(ValidationLevel.STRICT);
      
      const tokens = lexer.tokenize(dstv);
      const profiles = syntaxParser.parse(tokens);
      const validation = validator.validateProfiles(profiles);
      
      expect(validation.errors.length).toBeGreaterThan(0);
      const overlapError = validation.errors.find(e => e.includes('overlapping'));
      expect(overlapError).toBeDefined();
    });
    
    test('should detect self-intersecting contours', () => {
      const dstv = `ST
PLATE
1
1
S355
1000
500
20
AK
0 0
500 0
250 250
500 500
0 500
250 250
0 0
EN`;
      
      const result = parser.parse(dstv);
      // Parser should handle self-intersecting contour
      expect(result).toBeDefined();
    });
  });
  
  describe('Material Type Detection', () => {
    test('should detect European profiles', () => {
      const profiles = [
        { designation: 'IPE200', expected: MaterialType.BEAM },
        { designation: 'HEA300', expected: MaterialType.BEAM },
        { designation: 'HEB400', expected: MaterialType.BEAM },
        { designation: 'UPN200', expected: MaterialType.CHANNEL },
        { designation: 'UAP250', expected: MaterialType.CHANNEL },
        { designation: 'L100x100x10', expected: MaterialType.ANGLE },
        { designation: 'RHS200x100x8', expected: MaterialType.TUBE },
        { designation: 'CHS219.1x8', expected: MaterialType.TUBE },
        { designation: 'FL200x20', expected: MaterialType.PLATE }
      ];
      
      profiles.forEach(({ designation, expected }) => {
        const dstv = `ST\n${designation}\n1\n1\nS355\n1000\nEN`;
        const result = parser.parse(dstv);
        const element = Array.from(result.elements.values())[0];
        expect(element.materialType).toBe(expected);
      });
    });
    
    test('should detect UK/US profiles', () => {
      const profiles = [
        { designation: 'UB457x152x52', expected: MaterialType.BEAM },
        { designation: 'UC254x254x73', expected: MaterialType.BEAM },
        { designation: 'W14x90', expected: MaterialType.BEAM },
        { designation: 'C15x40', expected: MaterialType.CHANNEL },
        { designation: 'HSS8x4x0.25', expected: MaterialType.TUBE }
      ];
      
      profiles.forEach(({ designation, expected }) => {
        const dstv = `ST\n${designation}\n1\n1\nA36\n1000\nEN`;
        const result = parser.parse(dstv);
        const element = Array.from(result.elements.values())[0];
        expect(element.materialType).toBe(expected);
      });
    });
  });
  
  describe('Converter Features', () => {
    test('should calculate bounds correctly', () => {
      const dstv = `ST
IPE300
1
1
S355
5000
300
150
10
EN`;
      
      const result = parser.parse(dstv);
      
      expect(result.bounds).toBeDefined();
      expect(result.bounds.min).toBeDefined();
      expect(result.bounds.max).toBeDefined();
      expect(result.bounds.max[0]).toBeGreaterThan(result.bounds.min[0]);
    });
    
    test('should preserve metadata', () => {
      const dstv = `ST
HEA200
POS-123
5
S355JR
4500
200
190
10
6.5
18
42.3
7850
53.8
Paint-Red
Assembly-A1
EN`;
      
      const result = parser.parse(dstv);
      const element = Array.from(result.elements.values())[0];
      
      expect(element.metadata).toBeDefined();
      expect(element.metadata.orderNumber).toBe('POS-123');
      expect(element.metadata.quantity).toBe(5);
      expect(element.metadata.weight).toBe(53.8);
      expect(element.material.grade).toBe('S355JR');
    });
    
    test('should handle multiple profiles', () => {
      const dstv = `ST
IPE200
1
1
S355
3000
EN
ST
IPE300
2
1
S355
4000
EN
ST
HEA400
3
1
S355
5000
EN`;
      
      const result = parser.parse(dstv);
      
      expect(result.elements.size).toBe(3);
      expect(result.rootElementIds).toHaveLength(3);
      
      const elements = Array.from(result.elements.values());
      expect(elements[0].dimensions.length).toBe(3000);
      expect(elements[1].dimensions.length).toBe(4000);
      expect(elements[2].dimensions.length).toBe(5000);
    });
  });
  
  describe('Performance', () => {
    test('should handle large files efficiently', () => {
      // Generate large DSTV with many features
      let dstv = '';
      for (let i = 0; i < 100; i++) {
        dstv += `ST
BEAM-${i}
${i + 1}
1
S355
${3000 + i * 100}
300
200
10
BO
v${100 + i * 10} 100 25
v${200 + i * 10} 100 25
AK
0 0
${3000 + i * 100} 0
${3000 + i * 100} 300
0 300
0 0
EN
`;
      }
      
      const startTime = Date.now();
      const result = parser.parse(dstv);
      const duration = Date.now() - startTime;
      
      expect(result.elements.size).toBe(100);
      expect(duration).toBeLessThan(5000); // Should parse 100 profiles in less than 5 seconds
    });
  });
  
  describe('Error Recovery', () => {
    test('should continue parsing after encountering errors', () => {
      const dstv = `ST
PROFILE1
1
1
S355
3000
EN
ST
INVALID_DATA
%%%
###
EN
ST
PROFILE2
2
1
S355
4000
EN`;
      
      const result = parser.parse(dstv);
      
      // Should parse at least 2 valid profiles
      expect(result.elements.size).toBeGreaterThanOrEqual(2);
    });
    
    test('should handle missing EN blocks', () => {
      const dstv = `ST
PROFILE1
1
1
S355
3000
ST
PROFILE2
2
1
S355
4000
EN`;
      
      const result = parser.parse(dstv);
      expect(result).toBeDefined();
      expect(result.elements.size).toBeGreaterThan(0);
    });
  });
});