/**
 * Tests unitaires pour DSTVLexer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DSTVLexer } from '../lexer/DSTVLexer';
import { TokenType, ProfileFace } from '../types';

describe('DSTVLexer', () => {
  let lexer: DSTVLexer;

  beforeEach(() => {
    lexer = new DSTVLexer();
  });

  describe('tokenize', () => {
    it('should tokenize a simple ST block', () => {
      const content = 'ST\nHEA400\n40000.00\n';
      const tokens = lexer.tokenize(content);

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({
        type: TokenType.BLOCK_START,
        value: 'ST',
        line: 1,
        column: 1
      });
      expect(tokens[1]).toEqual({
        type: TokenType.IDENTIFIER,
        value: 'HEA400',
        line: 2,
        column: 1
      });
      expect(tokens[2]).toEqual({
        type: TokenType.NUMBER,
        value: '40000.00',
        line: 3,
        column: 1
      });
    });

    it('should tokenize multiple blocks', () => {
      const content = 'ST\nHEA400\nEN\nBO\n100.0 v\nEN\n';
      const tokens = lexer.tokenize(content);

      expect(tokens).toContainEqual({
        type: TokenType.BLOCK_START,
        value: 'ST',
        line: 1,
        column: 1
      });
      expect(tokens).toContainEqual({
        type: TokenType.BLOCK_END,
        value: 'EN',
        line: 3,
        column: 1
      });
      expect(tokens).toContainEqual({
        type: TokenType.BLOCK_START,
        value: 'BO',
        line: 4,
        column: 1
      });
    });

    it('should handle face indicators correctly', () => {
      const content = '100 v\n200 o\n300 u\n400 x\n';
      const tokens = lexer.tokenize(content);

      expect(tokens[0]).toEqual({
        type: TokenType.NUMBER,
        value: '100',
        line: 1,
        column: 1
      });
      expect(tokens[1]).toEqual({
        type: TokenType.FACE_INDICATOR,
        value: 'v',
        line: 1,
        column: 5,
        face: ProfileFace.FRONT
      });
      expect(tokens[3]).toEqual({
        type: TokenType.FACE_INDICATOR,
        value: 'o',
        line: 2,
        column: 5,
        face: ProfileFace.TOP
      });
      expect(tokens[5]).toEqual({
        type: TokenType.FACE_INDICATOR,
        value: 'u',
        line: 3,
        column: 5,
        face: ProfileFace.BOTTOM
      });
    });

    it('should handle hole types correctly', () => {
      const content = 'BO\n100 200 25.4 s\nEN\n';
      const tokens = lexer.tokenize(content);

      const holeTypeToken = tokens.find(t => t.type === TokenType.HOLE_TYPE);
      expect(holeTypeToken).toBeDefined();
      expect(holeTypeToken?.value).toBe('s');
      expect(holeTypeToken?.holeType).toBe('countersunk');
    });

    it('should handle negative numbers', () => {
      const content = '-100.5\n+200.0\n-0.001\n';
      const tokens = lexer.tokenize(content);

      expect(tokens[0]).toEqual({
        type: TokenType.NUMBER,
        value: '-100.5',
        line: 1,
        column: 1
      });
      expect(tokens[1]).toEqual({
        type: TokenType.NUMBER,
        value: '+200.0',
        line: 2,
        column: 1
      });
    });

    it('should handle text strings', () => {
      const content = 'SI\n"Test marking"\n100 200\nEN\n';
      const tokens = lexer.tokenize(content);

      const textToken = tokens.find(t => t.type === TokenType.TEXT);
      expect(textToken).toBeDefined();
      expect(textToken?.value).toBe('Test marking');
    });

    it('should handle comments', () => {
      const content = '** Comment line\nST\n** Another comment\nHEA400\n';
      const tokens = lexer.tokenize(content);

      const commentTokens = tokens.filter(t => t.type === TokenType.COMMENT);
      expect(commentTokens).toHaveLength(2);
      expect(commentTokens[0].value).toBe('Comment line');
    });

    it('should handle empty lines', () => {
      const content = 'ST\n\n\nHEA400\n\nEN\n';
      const tokens = lexer.tokenize(content);

      // Empty lines should be ignored
      expect(tokens).toHaveLength(3);
    });

    it('should track line and column numbers correctly', () => {
      const content = 'ST\n  HEA400  \n    1000.0\n';
      const tokens = lexer.tokenize(content);

      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);
      expect(tokens[1].line).toBe(2);
      expect(tokens[1].column).toBe(3); // After 2 spaces
      expect(tokens[2].line).toBe(3);
      expect(tokens[2].column).toBe(5); // After 4 spaces
    });

    it('should handle AK block contours', () => {
      const content = 'AK\nv\n0 0\n1000 0\n1000 500\n0 500\nEN\n';
      const tokens = lexer.tokenize(content);

      expect(tokens[0].type).toBe(TokenType.BLOCK_START);
      expect(tokens[0].value).toBe('AK');
      expect(tokens[1].type).toBe(TokenType.FACE_INDICATOR);
      
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(8); // 4 coordinate pairs
    });

    it('should handle special characters in identifiers', () => {
      const content = 'IPE-200\nHEB_300\nL100x100x10\n';
      const tokens = lexer.tokenize(content);

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('IPE-200');
      expect(tokens[1].value).toBe('HEB_300');
      expect(tokens[2].value).toBe('L100x100x10');
    });

    it('should detect scientific notation', () => {
      const content = '1.5e-3\n2.0E+10\n-3.14e2\n';
      const tokens = lexer.tokenize(content);

      expect(tokens).toHaveLength(3);
      expect(tokens[0].value).toBe('1.5e-3');
      expect(tokens[1].value).toBe('2.0E+10');
      expect(tokens[2].value).toBe('-3.14e2');
    });

    it('should handle mixed content', () => {
      const content = `** DSTV File
ST
HEA400
6000.00
EN
BO
100 200 25.4 v s
150 300 20.0 o
EN
AK
v
0 0
1000 0
1000 500
EN
SI
"POS-101"
500 250
EN
`;
      const tokens = lexer.tokenize(content);

      // Verify basic structure
      const blockStarts = tokens.filter(t => t.type === TokenType.BLOCK_START);
      expect(blockStarts).toHaveLength(4); // ST, BO, AK, SI

      const blockEnds = tokens.filter(t => t.type === TokenType.BLOCK_END);
      expect(blockEnds).toHaveLength(4);

      // Verify content types
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers.length).toBeGreaterThan(10);

      const faces = tokens.filter(t => t.type === TokenType.FACE_INDICATOR);
      expect(faces.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle null input', () => {
      const tokens = lexer.tokenize(null as any);
      expect(tokens).toEqual([]);
    });

    it('should handle undefined input', () => {
      const tokens = lexer.tokenize(undefined as any);
      expect(tokens).toEqual([]);
    });

    it('should handle empty string', () => {
      const tokens = lexer.tokenize('');
      expect(tokens).toEqual([]);
    });

    it('should tokenize unrecognized patterns as UNKNOWN', () => {
      const content = '@#$%^\n&*()[\n';
      const tokens = lexer.tokenize(content);

      tokens.forEach(token => {
        if (token.type !== TokenType.UNKNOWN) {
          expect(['@', '#', '$', '%', '^', '&', '*', '(', ')', '['].includes(token.value)).toBeFalsy();
        }
      });
    });
  });

  describe('performance', () => {
    it('should handle large files efficiently', () => {
      // Generate a large DSTV content
      let content = 'ST\nHEA400\n6000\nEN\n';
      
      // Add 1000 holes
      content += 'BO\n';
      for (let i = 0; i < 1000; i++) {
        content += `${i * 100} ${i * 50} 25.4 v\n`;
      }
      content += 'EN\n';

      const startTime = performance.now();
      const tokens = lexer.tokenize(content);
      const endTime = performance.now();

      expect(tokens.length).toBeGreaterThan(3000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});