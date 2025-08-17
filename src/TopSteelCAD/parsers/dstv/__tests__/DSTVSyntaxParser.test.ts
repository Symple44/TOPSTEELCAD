/**
 * Tests unitaires pour DSTVSyntaxParser
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DSTVSyntaxParser } from '../parser/DSTVSyntaxParser';
import { DSTVProfile, ProfileFace } from '../types';

describe('DSTVSyntaxParser', () => {
  let parser: DSTVSyntaxParser;

  beforeEach(() => {
    parser = new DSTVSyntaxParser();
  });

  describe('parse', () => {
    it('should parse a simple profile with ST block', () => {
      const content = `ST
HEA400
6000.00
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].designation).toBe('HEA400');
      expect(profiles[0].length).toBe(6000);
      expect(profiles[0].profileType).toBe('I_PROFILE');
    });

    it('should parse multiple profiles', () => {
      const content = `ST
HEA400
6000
EN
ST
IPE200
4500
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(2);
      expect(profiles[0].designation).toBe('HEA400');
      expect(profiles[0].length).toBe(6000);
      expect(profiles[1].designation).toBe('IPE200');
      expect(profiles[1].length).toBe(4500);
    });

    it('should parse profile with holes', () => {
      const content = `ST
HEA400
6000
EN
BO
100 200 25.4 v
300 200 25.4 v
500 200 20.0 o
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].holes).toHaveLength(3);
      
      const hole1 = profiles[0].holes![0];
      expect(hole1.x).toBe(100);
      expect(hole1.y).toBe(200);
      expect(hole1.diameter).toBe(25.4);
      expect(hole1.face).toBe(ProfileFace.FRONT);
      
      const hole3 = profiles[0].holes![2];
      expect(hole3.face).toBe(ProfileFace.TOP);
      expect(hole3.diameter).toBe(20.0);
    });

    it('should parse profile with contours (cuts)', () => {
      const content = `ST
HEA400
6000
EN
AK
v
0 0
500 0
500 300
0 300
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].cuts).toHaveLength(1);
      
      const cut = profiles[0].cuts![0];
      expect(cut.face).toBe(ProfileFace.FRONT);
      expect(cut.contour).toHaveLength(4);
      expect(cut.contour[0]).toEqual([0, 0]);
      expect(cut.contour[1]).toEqual([500, 0]);
      expect(cut.contour[2]).toEqual([500, 300]);
      expect(cut.contour[3]).toEqual([0, 300]);
    });

    it('should parse profile with markings', () => {
      const content = `ST
IPE300
5000
EN
SI
"POS-101"
2500 150
EN
SI
"MARK-A"
1000 100
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].markings).toHaveLength(2);
      
      const marking1 = profiles[0].markings![0];
      expect(marking1.text).toBe('POS-101');
      expect(marking1.x).toBe(2500);
      expect(marking1.y).toBe(150);
      
      const marking2 = profiles[0].markings![1];
      expect(marking2.text).toBe('MARK-A');
      expect(marking2.x).toBe(1000);
      expect(marking2.y).toBe(100);
    });

    it('should handle complex profile with all feature types', () => {
      const content = `** Complex profile test
ST
HEB300
8000
EN
BO
100 150 22 v
200 150 22 v
300 150 22 v
EN
AK
v
0 0
200 0
200 100
0 100
EN
AK
o
5000 0
5200 0
5200 100
5000 100
EN
SI
"A-123"
4000 150
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      const profile = profiles[0];
      
      expect(profile.designation).toBe('HEB300');
      expect(profile.length).toBe(8000);
      expect(profile.holes).toHaveLength(3);
      expect(profile.cuts).toHaveLength(2);
      expect(profile.markings).toHaveLength(1);
      
      // Verify cuts on different faces
      expect(profile.cuts![0].face).toBe(ProfileFace.FRONT);
      expect(profile.cuts![1].face).toBe(ProfileFace.TOP);
    });

    it('should handle special hole types', () => {
      const content = `ST
UPN200
3000
EN
BO
100 50 20 v s
200 50 25 o c
300 50 16 u t
EN`;
      
      const profiles = parser.parse(content);
      const holes = profiles[0].holes!;
      
      expect(holes[0].holeType).toBe('countersunk');
      expect(holes[1].holeType).toBe('counterbore');
      expect(holes[2].holeType).toBe('tapped');
    });

    it('should handle empty blocks gracefully', () => {
      const content = `ST
HEA200
3000
EN
BO
EN
AK
EN
SI
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].holes).toEqual([]);
      expect(profiles[0].cuts).toEqual([]);
      expect(profiles[0].markings).toEqual([]);
    });

    it('should ignore unknown blocks', () => {
      const content = `ST
HEA400
6000
EN
XX
unknown data
EN
BO
100 100 20 v
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].holes).toHaveLength(1);
    });

    it('should handle profiles without EN terminator', () => {
      const content = `ST
HEA400
6000
BO
100 100 20 v
ST
IPE200
4000
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(2);
      expect(profiles[0].designation).toBe('HEA400');
      expect(profiles[0].holes).toHaveLength(1);
      expect(profiles[1].designation).toBe('IPE200');
    });

    it('should detect profile types correctly', () => {
      const testCases = [
        { designation: 'HEA400', expectedType: 'I_PROFILE' },
        { designation: 'HEB300', expectedType: 'I_PROFILE' },
        { designation: 'IPE200', expectedType: 'I_PROFILE' },
        { designation: 'UPN200', expectedType: 'U_PROFILE' },
        { designation: 'UPE180', expectedType: 'U_PROFILE' },
        { designation: 'L100x100x10', expectedType: 'L_PROFILE' },
        { designation: 'RND100', expectedType: 'ROUND_BAR' },
        { designation: 'RHS100x60x5', expectedType: 'TUBE' },
        { designation: 'CHS88.9x3.2', expectedType: 'TUBE' },
        { designation: 'FL100x10', expectedType: 'FLAT_BAR' },
        { designation: 'PL20', expectedType: 'PLATE' }
      ];

      testCases.forEach(({ designation, expectedType }) => {
        const content = `ST\n${designation}\n1000\nEN`;
        const profiles = parser.parse(content);
        expect(profiles[0].profileType).toBe(expectedType);
      });
    });

    it('should handle numeric profile designations', () => {
      const content = `ST
100x100x10
2000
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].designation).toBe('100x100x10');
    });

    it('should parse cuts with complex contours', () => {
      const content = `ST
HEA400
6000
EN
AK
v
0 0
100 0
150 50
150 100
100 150
0 150
EN`;
      
      const profiles = parser.parse(content);
      const cut = profiles[0].cuts![0];
      
      expect(cut.contour).toHaveLength(6);
      expect(cut.contour[2]).toEqual([150, 50]);
      expect(cut.contour[4]).toEqual([100, 150]);
    });

    it('should handle multiple cuts on same face', () => {
      const content = `ST
HEA400
6000
EN
AK
v
0 0
100 0
100 100
0 100
EN
AK
v
200 0
300 0
300 100
200 100
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles[0].cuts).toHaveLength(2);
      expect(profiles[0].cuts![0].face).toBe(ProfileFace.FRONT);
      expect(profiles[0].cuts![1].face).toBe(ProfileFace.FRONT);
    });
  });

  describe('error handling', () => {
    it('should handle empty input', () => {
      const profiles = parser.parse('');
      expect(profiles).toEqual([]);
    });

    it('should handle null input', () => {
      const profiles = parser.parse(null as any);
      expect(profiles).toEqual([]);
    });

    it('should handle malformed ST block', () => {
      const content = `ST
EN`;
      
      const profiles = parser.parse(content);
      expect(profiles).toEqual([]);
    });

    it('should handle invalid numbers gracefully', () => {
      const content = `ST
HEA400
abc
EN
BO
xyz 100 20 v
EN`;
      
      const profiles = parser.parse(content);
      
      expect(profiles).toHaveLength(1);
      expect(profiles[0].length).toBe(0); // Default value for invalid number
      expect(profiles[0].holes).toEqual([]); // Invalid hole should be skipped
    });

    it('should continue parsing after errors', () => {
      const content = `ST
INVALID
EN
ST
HEA400
6000
EN
ST
IPE200
INVALID
EN
ST
UPN200
3000
EN`;
      
      const profiles = parser.parse(content);
      
      // Should successfully parse valid profiles
      expect(profiles.length).toBeGreaterThanOrEqual(2);
      const validProfiles = profiles.filter(p => p.designation && p.length > 0);
      expect(validProfiles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('performance', () => {
    it('should handle large files efficiently', () => {
      let content = '';
      
      // Generate 100 profiles with features
      for (let i = 0; i < 100; i++) {
        content += `ST\nHEA${400 + i}\n${6000 + i * 100}\nEN\n`;
        
        // Add holes
        content += 'BO\n';
        for (let j = 0; j < 10; j++) {
          content += `${100 + j * 50} ${150} 20 v\n`;
        }
        content += 'EN\n';
        
        // Add cut
        content += 'AK\nv\n0 0\n100 0\n100 50\n0 50\nEN\n';
        
        // Add marking
        content += `SI\n"POS-${i}"\n2000 100\nEN\n`;
      }
      
      const startTime = performance.now();
      const profiles = parser.parse(content);
      const endTime = performance.now();
      
      expect(profiles).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in less than 500ms
      
      // Verify features were parsed
      profiles.forEach(profile => {
        expect(profile.holes?.length).toBe(10);
        expect(profile.cuts?.length).toBe(1);
        expect(profile.markings?.length).toBe(1);
      });
    });
  });
});