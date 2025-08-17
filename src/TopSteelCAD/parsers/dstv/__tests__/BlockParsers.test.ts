/**
 * Tests unitaires pour les block parsers DSTV
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { STBlockParser } from '../blocks/STBlockParser';
import { BOBlockParser } from '../blocks/BOBlockParser';
import { AKBlockParser } from '../blocks/AKBlockParser';
import { SIBlockParser } from '../blocks/SIBlockParser';
import { DSTVToken, TokenType, ProfileFace } from '../types';

describe('STBlockParser', () => {
  let parser: STBlockParser;

  beforeEach(() => {
    parser = new STBlockParser();
  });

  const createToken = (type: TokenType, value: string, line = 1): DSTVToken => ({
    type,
    value,
    line,
    column: 1
  });

  describe('parse', () => {
    it('should parse a valid ST block', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'ST'),
        createToken(TokenType.IDENTIFIER, 'HEA400'),
        createToken(TokenType.NUMBER, '6000.00'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const result = parser.parse(tokens);

      expect(result.designation).toBe('HEA400');
      expect(result.length).toBe(6000);
      expect(result.profileType).toBe('I_PROFILE');
    });

    it('should handle integer length values', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'ST'),
        createToken(TokenType.IDENTIFIER, 'IPE200'),
        createToken(TokenType.NUMBER, '4500'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const result = parser.parse(tokens);

      expect(result.length).toBe(4500);
    });

    it('should detect different profile types', () => {
      const testCases = [
        { designation: 'HEA400', expectedType: 'I_PROFILE' },
        { designation: 'HEB300', expectedType: 'I_PROFILE' },
        { designation: 'HEM200', expectedType: 'I_PROFILE' },
        { designation: 'IPE200', expectedType: 'I_PROFILE' },
        { designation: 'IPN180', expectedType: 'I_PROFILE' },
        { designation: 'UPN200', expectedType: 'U_PROFILE' },
        { designation: 'UPE180', expectedType: 'U_PROFILE' },
        { designation: 'UAP200', expectedType: 'U_PROFILE' },
        { designation: 'L100x100x10', expectedType: 'L_PROFILE' },
        { designation: 'L150x90x12', expectedType: 'L_PROFILE' },
        { designation: 'RND100', expectedType: 'ROUND_BAR' },
        { designation: 'RHS100x60x5', expectedType: 'TUBE' },
        { designation: 'SHS100x100x5', expectedType: 'TUBE' },
        { designation: 'CHS88.9x3.2', expectedType: 'TUBE' },
        { designation: 'FL100x10', expectedType: 'FLAT_BAR' },
        { designation: 'FB200x20', expectedType: 'FLAT_BAR' },
        { designation: 'PL20', expectedType: 'PLATE' },
        { designation: 'PLT15', expectedType: 'PLATE' }
      ];

      testCases.forEach(({ designation, expectedType }) => {
        const tokens: DSTVToken[] = [
          createToken(TokenType.BLOCK_START, 'ST'),
          createToken(TokenType.IDENTIFIER, designation),
          createToken(TokenType.NUMBER, '1000'),
          createToken(TokenType.BLOCK_END, 'EN')
        ];

        const result = parser.parse(tokens);
        expect(result.profileType).toBe(expectedType);
      });
    });

    it('should handle missing length', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'ST'),
        createToken(TokenType.IDENTIFIER, 'HEA400'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const result = parser.parse(tokens);

      expect(result.designation).toBe('HEA400');
      expect(result.length).toBe(0); // Default value
    });

    it('should handle missing designation', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'ST'),
        createToken(TokenType.NUMBER, '6000'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const result = parser.parse(tokens);

      expect(result.designation).toBe('');
      expect(result.length).toBe(6000);
    });

    it('should handle empty block', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'ST'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const result = parser.parse(tokens);

      expect(result.designation).toBe('');
      expect(result.length).toBe(0);
      expect(result.profileType).toBe('UNKNOWN');
    });

    it('should handle extra tokens', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'ST'),
        createToken(TokenType.IDENTIFIER, 'HEA400'),
        createToken(TokenType.NUMBER, '6000'),
        createToken(TokenType.IDENTIFIER, 'EXTRA'),
        createToken(TokenType.NUMBER, '999'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const result = parser.parse(tokens);

      expect(result.designation).toBe('HEA400');
      expect(result.length).toBe(6000);
    });
  });
});

describe('BOBlockParser', () => {
  let parser: BOBlockParser;

  beforeEach(() => {
    parser = new BOBlockParser();
  });

  const createToken = (type: TokenType, value: string, line = 1): DSTVToken => ({
    type,
    value,
    line,
    column: 1
  });

  const createFaceToken = (value: string, face: ProfileFace, line = 1): DSTVToken => ({
    type: TokenType.FACE_INDICATOR,
    value,
    face,
    line,
    column: 1
  });

  const createHoleTypeToken = (value: string, holeType: string, line = 1): DSTVToken => ({
    type: TokenType.HOLE_TYPE,
    value,
    holeType,
    line,
    column: 1
  });

  describe('parse', () => {
    it('should parse a single hole', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'BO'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '25.4'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const holes = parser.parse(tokens);

      expect(holes).toHaveLength(1);
      expect(holes[0]).toEqual({
        x: 100,
        y: 200,
        diameter: 25.4,
        face: ProfileFace.FRONT
      });
    });

    it('should parse multiple holes', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'BO'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.NUMBER, '20'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.NUMBER, '20'),
        createFaceToken('o', ProfileFace.TOP),
        createToken(TokenType.NUMBER, '300'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.NUMBER, '20'),
        createFaceToken('u', ProfileFace.BOTTOM),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const holes = parser.parse(tokens);

      expect(holes).toHaveLength(3);
      expect(holes[0].face).toBe(ProfileFace.FRONT);
      expect(holes[1].face).toBe(ProfileFace.TOP);
      expect(holes[2].face).toBe(ProfileFace.BOTTOM);
    });

    it('should handle hole types', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'BO'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '25'),
        createFaceToken('v', ProfileFace.FRONT),
        createHoleTypeToken('s', 'countersunk'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '30'),
        createFaceToken('v', ProfileFace.FRONT),
        createHoleTypeToken('c', 'counterbore'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const holes = parser.parse(tokens);

      expect(holes).toHaveLength(2);
      expect(holes[0].holeType).toBe('countersunk');
      expect(holes[1].holeType).toBe('counterbore');
    });

    it('should handle incomplete hole data', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'BO'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '200'),
        // Missing diameter and face
        createToken(TokenType.NUMBER, '300'),
        createToken(TokenType.NUMBER, '400'),
        createToken(TokenType.NUMBER, '25'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const holes = parser.parse(tokens);

      // Should only parse complete holes
      expect(holes.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty block', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'BO'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const holes = parser.parse(tokens);

      expect(holes).toEqual([]);
    });

    it('should default to FRONT face if not specified', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'BO'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '25'),
        // No face indicator
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const holes = parser.parse(tokens);

      expect(holes).toHaveLength(1);
      expect(holes[0].face).toBe(ProfileFace.FRONT);
    });
  });
});

describe('AKBlockParser', () => {
  let parser: AKBlockParser;

  beforeEach(() => {
    parser = new AKBlockParser();
  });

  const createToken = (type: TokenType, value: string, line = 1): DSTVToken => ({
    type,
    value,
    line,
    column: 1
  });

  const createFaceToken = (value: string, face: ProfileFace, line = 1): DSTVToken => ({
    type: TokenType.FACE_INDICATOR,
    value,
    face,
    line,
    column: 1
  });

  describe('parse', () => {
    it('should parse a simple rectangular contour', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'AK'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const cuts = parser.parse(tokens);

      expect(cuts).toHaveLength(1);
      expect(cuts[0].face).toBe(ProfileFace.FRONT);
      expect(cuts[0].contour).toEqual([
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]);
    });

    it('should parse multiple cuts on different faces', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'AK'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '50'),
        createFaceToken('o', ProfileFace.TOP),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '300'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '300'),
        createToken(TokenType.NUMBER, '50'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const cuts = parser.parse(tokens);

      expect(cuts).toHaveLength(2);
      expect(cuts[0].face).toBe(ProfileFace.FRONT);
      expect(cuts[0].contour).toHaveLength(3);
      expect(cuts[1].face).toBe(ProfileFace.TOP);
      expect(cuts[1].contour).toHaveLength(3);
    });

    it('should handle complex polygon contour', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'AK'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.NUMBER, '50'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const cuts = parser.parse(tokens);

      expect(cuts).toHaveLength(1);
      expect(cuts[0].contour).toHaveLength(6);
      expect(cuts[0].contour[2]).toEqual([150, 50]);
    });

    it('should handle incomplete coordinate pairs', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'AK'),
        createFaceToken('v', ProfileFace.FRONT),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '100'),
        // Missing y coordinate
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const cuts = parser.parse(tokens);

      expect(cuts).toHaveLength(1);
      expect(cuts[0].contour.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty block', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'AK'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const cuts = parser.parse(tokens);

      expect(cuts).toEqual([]);
    });

    it('should default to FRONT face if not specified', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'AK'),
        // No face indicator
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '0'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const cuts = parser.parse(tokens);

      expect(cuts).toHaveLength(1);
      expect(cuts[0].face).toBe(ProfileFace.FRONT);
    });
  });
});

describe('SIBlockParser', () => {
  let parser: SIBlockParser;

  beforeEach(() => {
    parser = new SIBlockParser();
  });

  const createToken = (type: TokenType, value: string, line = 1): DSTVToken => ({
    type,
    value,
    line,
    column: 1
  });

  const createTextToken = (value: string, line = 1): DSTVToken => ({
    type: TokenType.TEXT,
    value,
    line,
    column: 1
  });

  describe('parse', () => {
    it('should parse a simple marking', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createTextToken('POS-101'),
        createToken(TokenType.NUMBER, '2500'),
        createToken(TokenType.NUMBER, '150'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      expect(markings).toHaveLength(1);
      expect(markings[0]).toEqual({
        text: 'POS-101',
        x: 2500,
        y: 150
      });
    });

    it('should parse multiple markings', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createTextToken('MARK-A'),
        createToken(TokenType.NUMBER, '1000'),
        createToken(TokenType.NUMBER, '100'),
        createTextToken('MARK-B'),
        createToken(TokenType.NUMBER, '2000'),
        createToken(TokenType.NUMBER, '100'),
        createTextToken('MARK-C'),
        createToken(TokenType.NUMBER, '3000'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      expect(markings).toHaveLength(3);
      expect(markings[0].text).toBe('MARK-A');
      expect(markings[1].text).toBe('MARK-B');
      expect(markings[2].text).toBe('MARK-C');
    });

    it('should handle marking without position', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createTextToken('NO-POS'),
        // Missing x and y
        createTextToken('WITH-POS'),
        createToken(TokenType.NUMBER, '1000'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      // Should parse markings with complete data
      expect(markings.length).toBeLessThanOrEqual(1);
      if (markings.length > 0) {
        expect(markings[0].text).toBe('WITH-POS');
      }
    });

    it('should handle marking with partial position', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createTextToken('PARTIAL'),
        createToken(TokenType.NUMBER, '1000'),
        // Missing y
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      expect(markings).toHaveLength(1);
      expect(markings[0].x).toBe(1000);
      expect(markings[0].y).toBe(0); // Default value
    });

    it('should handle empty block', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      expect(markings).toEqual([]);
    });

    it('should handle identifiers as text if no TEXT token', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createToken(TokenType.IDENTIFIER, 'ID-TEXT'),
        createToken(TokenType.NUMBER, '500'),
        createToken(TokenType.NUMBER, '100'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      expect(markings).toHaveLength(1);
      expect(markings[0].text).toBe('ID-TEXT');
    });

    it('should handle special characters in text', () => {
      const tokens: DSTVToken[] = [
        createToken(TokenType.BLOCK_START, 'SI'),
        createTextToken('Special!@#$%^&*()_+-=[]{}|;:,.<>?'),
        createToken(TokenType.NUMBER, '1000'),
        createToken(TokenType.NUMBER, '200'),
        createToken(TokenType.BLOCK_END, 'EN')
      ];

      const markings = parser.parse(tokens);

      expect(markings).toHaveLength(1);
      expect(markings[0].text).toBe('Special!@#$%^&*()_+-=[]{}|;:,.<>?');
    });
  });
});