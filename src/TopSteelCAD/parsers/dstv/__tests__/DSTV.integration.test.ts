/**
 * Tests d'intégration pour le système DSTV complet
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DSTVLexer } from '../lexer/DSTVLexer';
import { DSTVSyntaxParser } from '../parser/DSTVSyntaxParser';
import { DSTVValidator } from '../validators/DSTVValidator';
import { DSTVToPivotConverter } from '../converters/DSTVToPivotConverter';
import { ValidationLevel } from '../types';

describe('DSTV Integration Tests', () => {
  let lexer: DSTVLexer;
  let parser: DSTVSyntaxParser;
  let validator: DSTVValidator;
  let converter: DSTVToPivotConverter;

  beforeEach(() => {
    lexer = new DSTVLexer();
    parser = new DSTVSyntaxParser();
    validator = new DSTVValidator(ValidationLevel.STANDARD);
    converter = new DSTVToPivotConverter();
  });

  describe('Complete DSTV Pipeline', () => {
    it('should process a simple DSTV file end-to-end', () => {
      const dstvContent = `** Simple DSTV file
ST
HEA400
6000
EN
BO
100 200 25.4 v
300 200 25.4 v
EN
SI
"POS-101"
3000 150
EN`;

      // Step 1: Lexical analysis
      const tokens = lexer.tokenize(dstvContent);
      expect(tokens.length).toBeGreaterThan(0);

      // Step 2: Syntax parsing
      const profiles = parser.parse(dstvContent);
      expect(profiles).toHaveLength(1);
      expect(profiles[0].designation).toBe('HEA400');
      expect(profiles[0].holes).toHaveLength(2);
      expect(profiles[0].markings).toHaveLength(1);

      // Step 3: Validation
      const validationResult = validator.validateProfiles(profiles);
      expect(validationResult.isValid).toBe(true);

      // Step 4: Conversion to Pivot format
      const pivotScene = converter.convertProfiles(profiles);
      expect(pivotScene.elements).toHaveLength(1);
      expect(pivotScene.elements[0].features).toHaveLength(3); // 2 holes + 1 marking
    });

    it('should process complex multi-profile DSTV', () => {
      const dstvContent = `** Complex DSTV with multiple profiles
** First profile - HEA with full features
ST
HEA400
8000
EN
BO
100 150 22 v
200 150 22 v
300 150 22 v
400 150 22 v s
500 150 25 o c
EN
AK
v
0 0
500 0
500 200
450 250
50 250
0 200
EN
AK
o
7500 0
7800 0
7800 100
7500 100
EN
SI
"BEAM-A1"
4000 200
EN
SI
"TOP"
1000 100
EN

** Second profile - IPE with holes
ST
IPE300
5500
EN
BO
100 100 20 v
200 100 20 v
5400 100 20 v
5300 100 20 v
EN
SI
"BEAM-B2"
2750 150
EN

** Third profile - UPN channel
ST
UPN200
3000
EN
AK
v
0 0
200 0
200 75
0 75
EN
BO
1500 100 18 v t
EN`;

      // Full pipeline
      const profiles = parser.parse(dstvContent);
      expect(profiles).toHaveLength(3);

      // Validate all profiles
      const validationResult = validator.validateProfiles(profiles);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.profileResults).toHaveLength(3);

      // Convert to Pivot
      const pivotScene = converter.convertProfiles(profiles);
      expect(pivotScene.elements).toHaveLength(3);

      // Check first profile features
      const firstElement = pivotScene.elements[0];
      expect(firstElement.name).toBe('HEA400');
      const holes1 = firstElement.features!.filter(f => f.type === 'hole');
      const cuts1 = firstElement.features!.filter(f => f.type === 'cut');
      const markings1 = firstElement.features!.filter(f => f.type === 'marking');
      expect(holes1).toHaveLength(5);
      expect(cuts1).toHaveLength(2);
      expect(markings1).toHaveLength(2);

      // Check second profile
      const secondElement = pivotScene.elements[1];
      expect(secondElement.name).toBe('IPE300');
      expect(secondElement.features).toHaveLength(5); // 4 holes + 1 marking

      // Check third profile
      const thirdElement = pivotScene.elements[2];
      expect(thirdElement.name).toBe('UPN200');
      expect(thirdElement.features).toHaveLength(2); // 1 cut + 1 hole
    });

    it('should handle real-world DSTV format variations', () => {
      // Test various real-world formatting issues
      const dstvContent = `ST
HEB300  
6000.0
EN
  BO  
  150.0   200.0   22.5 v
    250   200   22.5    v  
350 200 22.5 v


450 200 22.5 v
EN
   AK
v
0.0 0.0
  100.00   0.00
100 50.0
  0   50
  EN
SI
  "POS 123"  
  3000.0 150.0
EN`;

      const profiles = parser.parse(dstvContent);
      expect(profiles).toHaveLength(1);

      const profile = profiles[0];
      expect(profile.designation).toBe('HEB300');
      expect(profile.length).toBe(6000);
      expect(profile.holes).toHaveLength(4);
      expect(profile.cuts).toHaveLength(1);
      expect(profile.markings).toHaveLength(1);

      // Validate - should pass despite formatting
      const validationResult = validator.validateProfile(profile);
      expect(validationResult.isValid).toBe(true);
    });

    it('should handle error recovery gracefully', () => {
      const dstvContent = `** File with errors
ST
HEA400
INVALID_NUMBER
EN
BO
100 200 25
300 INVALID 25 v
500 200 25 v
EN
AK
v
0 0
100
200 100
EN
ST
IPE200
4000
EN
BO
100 100 20 v
EN`;

      // Should still parse what it can
      const profiles = parser.parse(dstvContent);
      expect(profiles.length).toBeGreaterThanOrEqual(1);

      // Second profile should be valid
      const validProfiles = profiles.filter(p => p.designation && p.length > 0);
      expect(validProfiles.length).toBeGreaterThanOrEqual(1);

      // Validation should identify issues
      const validationResult = validator.validateProfiles(profiles);
      if (profiles.length > 1) {
        // At least one profile might be valid
        const hasValidProfile = validationResult.profileResults.some(r => r.isValid);
        expect(hasValidProfile).toBe(true);
      }
    });

    it('should handle large DSTV files efficiently', () => {
      // Generate a large DSTV file
      let dstvContent = '';
      
      for (let i = 0; i < 50; i++) {
        dstvContent += `ST\nHEA${400 + i * 10}\n${6000 + i * 100}\nEN\n`;
        
        // Add holes
        dstvContent += 'BO\n';
        for (let j = 0; j < 20; j++) {
          dstvContent += `${100 + j * 100} ${150} 22 v\n`;
        }
        dstvContent += 'EN\n';
        
        // Add cuts
        dstvContent += 'AK\nv\n';
        for (let j = 0; j < 10; j++) {
          dstvContent += `${j * 100} ${j * 50}\n`;
        }
        dstvContent += 'EN\n';
        
        // Add markings
        dstvContent += `SI\n"PROFILE-${i}"\n3000 150\nEN\n`;
      }

      const startTime = performance.now();
      
      // Full pipeline
      const tokens = lexer.tokenize(dstvContent);
      const profiles = parser.parse(dstvContent);
      const validationResult = validator.validateProfiles(profiles);
      const pivotScene = converter.convertProfiles(profiles);
      
      const endTime = performance.now();

      // Should process efficiently
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      
      // Verify results
      expect(profiles).toHaveLength(50);
      expect(validationResult.profileResults).toHaveLength(50);
      expect(pivotScene.elements).toHaveLength(50);
      
      // Each element should have correct features
      pivotScene.elements.forEach((element, i) => {
        expect(element.features!.filter(f => f.type === 'hole')).toHaveLength(20);
        expect(element.features!.filter(f => f.type === 'cut')).toHaveLength(1);
        expect(element.features!.filter(f => f.type === 'marking')).toHaveLength(1);
      });
    });

    it('should validate and reject invalid DSTV content', () => {
      const invalidDstvContent = `ST
HEA400
-1000
EN
BO
10000 200 25 v
300 200 -10 v
EN`;

      const profiles = parser.parse(invalidDstvContent);
      const validationResult = validator.validateProfiles(profiles);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      // Should still convert but with warnings
      const pivotScene = converter.convertProfiles(profiles);
      expect(pivotScene.elements).toHaveLength(1);
      // Invalid features should be filtered out
      expect(pivotScene.elements[0].features!.length).toBeLessThan(2);
    });

    it('should handle different validation levels', () => {
      const dstvContent = `ST
HEA400
6000
EN
BO
8000 200 25 v
EN`;

      const profiles = parser.parse(dstvContent);

      // BASIC validation - should pass
      const basicValidator = new DSTVValidator(ValidationLevel.BASIC);
      const basicResult = basicValidator.validateProfiles(profiles);
      expect(basicResult.isValid).toBe(true);

      // STRICT validation - should fail (hole outside bounds)
      const strictValidator = new DSTVValidator(ValidationLevel.STRICT);
      const strictResult = strictValidator.validateProfiles(profiles);
      expect(strictResult.isValid).toBe(false);
    });

    it('should preserve metadata through the pipeline', () => {
      const dstvContent = `** Project: Bridge Construction
** Date: 2024-01-15
** Engineer: John Doe
ST
HEA400
6000
EN
BO
100 200 25.4 v s
EN
SI
"REF-2024-001"
3000 150
EN`;

      const profiles = parser.parse(dstvContent);
      const pivotScene = converter.convertProfiles(profiles);

      // Check metadata preservation
      expect(pivotScene.metadata.generator).toBe('DSTV-to-Pivot Converter');
      expect(pivotScene.metadata.profileCount).toBe(1);
      expect(pivotScene.metadata.created).toBeDefined();

      // Check feature details preservation
      const hole = pivotScene.elements[0].features!.find(f => f.type === 'hole');
      expect(hole?.parameters.holeType).toBe('countersunk');
      
      const marking = pivotScene.elements[0].features!.find(f => f.type === 'marking');
      expect(marking?.parameters.text).toBe('REF-2024-001');
    });

    it('should handle edge cases in the complete pipeline', () => {
      // Empty file
      let result = parser.parse('');
      expect(result).toEqual([]);

      // Only comments
      result = parser.parse('** Only comments\n** No data');
      expect(result).toEqual([]);

      // Minimal valid profile
      result = parser.parse('ST\nHEA400\n1000\nEN');
      expect(result).toHaveLength(1);
      expect(result[0].designation).toBe('HEA400');

      // Profile with no features
      const minimalDstv = 'ST\nIPE200\n3000\nEN';
      const minimalProfiles = parser.parse(minimalDstv);
      const minimalScene = converter.convertProfiles(minimalProfiles);
      expect(minimalScene.elements[0].features).toEqual([]);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets for typical files', () => {
      // Generate a typical DSTV file (10 profiles with features)
      let typicalContent = '';
      for (let i = 0; i < 10; i++) {
        typicalContent += `ST\nHEA${400 + i * 10}\n${6000 + i * 100}\nEN\n`;
        typicalContent += `BO\n`;
        for (let j = 0; j < 5; j++) {
          typicalContent += `${100 + j * 200} 150 22 v\n`;
        }
        typicalContent += `EN\n`;
        typicalContent += `SI\n"POS-${i}"\n3000 150\nEN\n`;
      }

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const profiles = parser.parse(typicalContent);
        validator.validateProfiles(profiles);
        converter.convertProfiles(profiles);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Should process a typical file in less than 10ms on average
      expect(avgTime).toBeLessThan(10);
    });
  });
});