/**
 * Tests complets pour DSTVLexer
 * Couverture cible: >80%
 */

import { DSTVLexer } from '../lexer/DSTVLexer';
import { TokenType, ProfileFace } from '../types';

describe('DSTVLexer - Complete Tests', () => {
  let lexer: DSTVLexer;
  
  beforeEach(() => {
    lexer = new DSTVLexer();
  });
  
  describe('Basic Tokenization', () => {
    test('should tokenize empty content', () => {
      const tokens = lexer.tokenize('');
      expect(tokens).toHaveLength(0);
    });
    
    test('should tokenize simple numbers', () => {
      const tokens = lexer.tokenize('100 200 300');
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({
        type: TokenType.NUMBER,
        value: '100'
      });
    });
    
    test('should tokenize scientific notation', () => {
      const tokens = lexer.tokenize('1.5e-3 2.0E+2');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].value).toBe('0.0015');
      expect(tokens[1].value).toBe('200');
    });
    
    test('should tokenize identifiers', () => {
      const tokens = lexer.tokenize('IPE200 HEA300');
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'IPE200'
      });
    });
    
    test('should handle mixed content', () => {
      const tokens = lexer.tokenize('IPE 200 300.5');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
    });
  });
  
  describe('Block Detection', () => {
    test('should detect ST block start', () => {
      const tokens = lexer.tokenize('ST\nIPE200');
      expect(tokens[0]).toMatchObject({
        type: TokenType.BLOCK_START,
        value: 'ST'
      });
    });
    
    test('should detect EN block end', () => {
      const tokens = lexer.tokenize('EN');
      expect(tokens[0]).toMatchObject({
        type: TokenType.BLOCK_END,
        value: 'EN'
      });
    });
    
    test('should detect AK block', () => {
      const tokens = lexer.tokenize('AK\n0 0\n1000 0');
      expect(tokens[0]).toMatchObject({
        type: TokenType.BLOCK_START,
        value: 'AK'
      });
    });
    
    test('should detect multiple block types', () => {
      const content = 'ST\nBO\nAK\nIK\nSC\nBR\nSI\nEN';
      const tokens = lexer.tokenize(content);
      const blockTokens = tokens.filter(t => 
        t.type === TokenType.BLOCK_START || t.type === TokenType.BLOCK_END
      );
      expect(blockTokens).toHaveLength(8);
    });
  });
  
  describe('Face Indicators', () => {
    test('should detect simple face indicator v', () => {
      const tokens = lexer.tokenize('v100 200');
      expect(tokens[0]).toMatchObject({
        type: TokenType.FACE_INDICATOR,
        face: ProfileFace.TOP
      });
    });
    
    test('should detect face indicator u', () => {
      const tokens = lexer.tokenize('u100 200');
      expect(tokens[0]).toMatchObject({
        type: TokenType.FACE_INDICATOR,
        face: ProfileFace.BOTTOM
      });
    });
    
    test('should detect face indicator o', () => {
      const tokens = lexer.tokenize('o100 200');
      expect(tokens[0]).toMatchObject({
        type: TokenType.FACE_INDICATOR,
        face: ProfileFace.FRONT
      });
    });
    
    test('should parse composite face notation v...u', () => {
      const tokens = lexer.tokenize('v100 200 u300');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].face).toBe(ProfileFace.TOP);
      expect(tokens[2].face).toBe(ProfileFace.BOTTOM);
    });
    
    test('should handle face with values', () => {
      const tokens = lexer.tokenize('v100 200 10');
      const token = tokens[0];
      expect(token.type).toBe(TokenType.FACE_INDICATOR);
      expect(token.face).toBe(ProfileFace.TOP);
      expect((token as any).values).toEqual([100, 200, 10]);
    });
  });
  
  describe('Hole Types', () => {
    test('should detect round holes', () => {
      const tokens = lexer.tokenize('BO\n100 200 25');
      const filtered = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(filtered).toHaveLength(3);
    });
    
    test('should detect slotted holes with l modifier', () => {
      const tokens = lexer.tokenize('BO\n100 200 25 l 50 45');
      const dataTokens = tokens.filter(t => t.type !== TokenType.BLOCK_START);
      expect(dataTokens.length).toBeGreaterThan(0);
      // Le lexer devrait détecter le modificateur 'l'
      const hasSlotted = tokens.some(t => (t as any).holeType === 'slotted');
      expect(hasSlotted).toBe(true);
    });
    
    test('should detect square holes with s modifier', () => {
      const tokens = lexer.tokenize('BO\n100 200 30 s');
      const hasSquare = tokens.some(t => (t as any).holeType === 'square');
      expect(hasSquare).toBe(true);
    });
    
    test('should detect rectangular holes with r modifier', () => {
      const tokens = lexer.tokenize('BO\n100 200 30 40 r');
      const hasRect = tokens.some(t => (t as any).holeType === 'rectangular');
      expect(hasRect).toBe(true);
    });
  });
  
  describe('Comments', () => {
    test('should detect single asterisk comment', () => {
      const tokens = lexer.tokenize('* This is a comment');
      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT,
        value: '* This is a comment'
      });
    });
    
    test('should detect double asterisk comment', () => {
      const tokens = lexer.tokenize('** DSTV comment');
      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT,
        value: '** DSTV comment'
      });
    });
    
    test('should handle inline comments', () => {
      const tokens = lexer.tokenize('100 200 ** comment\n300');
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(3);
      const comments = tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
    });
  });
  
  describe('Complex Scenarios', () => {
    test('should tokenize complete DSTV profile', () => {
      const dstv = `ST
Beam-1
1
1
S355
6000
200
300
10
** Comment
BO
v100 200 25
u300 400 30
AK
0 0
6000 0
6000 300
0 300
0 0
EN`;
      
      const tokens = lexer.tokenize(dstv);
      
      // Vérifier la structure
      expect(tokens[0].value).toBe('ST');
      expect(tokens[tokens.length - 1].value).toBe('EN');
      
      // Vérifier les blocs
      const blocks = tokens.filter(t => 
        t.type === TokenType.BLOCK_START || t.type === TokenType.BLOCK_END
      );
      expect(blocks.length).toBeGreaterThanOrEqual(4); // ST, BO, AK, EN
      
      // Vérifier les faces
      const faces = tokens.filter(t => t.type === TokenType.FACE_INDICATOR);
      expect(faces.length).toBeGreaterThanOrEqual(2);
    });
    
    test('should handle multiple profiles', () => {
      const dstv = `ST
Profile1
EN
ST
Profile2
EN`;
      
      const tokens = lexer.tokenize(dstv);
      const stBlocks = tokens.filter(t => t.value === 'ST');
      const enBlocks = tokens.filter(t => t.value === 'EN');
      
      expect(stBlocks).toHaveLength(2);
      expect(enBlocks).toHaveLength(2);
    });
    
    test('should preserve line and column information', () => {
      const dstv = `ST
100 200
300`;
      
      const tokens = lexer.tokenize(dstv);
      
      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);
      
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numberTokens[0].line).toBe(2);
      expect(numberTokens[2].line).toBe(3);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid characters gracefully', () => {
      const tokens = lexer.tokenize('100 @ 200 # 300');
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(3);
      const unknowns = tokens.filter(t => t.type === TokenType.UNKNOWN);
      expect(unknowns.length).toBeGreaterThanOrEqual(2);
    });
    
    test('should handle malformed numbers', () => {
      const tokens = lexer.tokenize('100.200.300');
      // Should parse as identifier or unknown
      expect(tokens.length).toBeGreaterThan(0);
    });
    
    test('should handle empty lines', () => {
      const dstv = `ST

100

200

EN`;
      const tokens = lexer.tokenize(dstv);
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(2);
    });
  });
  
  describe('Special Cases', () => {
    test('should handle negative numbers', () => {
      const tokens = lexer.tokenize('-100 -200.5');
      expect(tokens[0].value).toBe('-100');
      expect(tokens[1].value).toBe('-200.5');
    });
    
    test('should handle very large numbers', () => {
      const tokens = lexer.tokenize('999999999 0.000000001');
      expect(tokens).toHaveLength(2);
      expect(parseFloat(tokens[0].value)).toBe(999999999);
    });
    
    test('should handle text strings', () => {
      const tokens = lexer.tokenize('"Marking Text" Position1');
      const hasText = tokens.some(t => t.type === TokenType.TEXT);
      expect(hasText).toBe(true);
    });
    
    test('should maintain block context', () => {
      const dstv = `BO
100 200 25
AK
0 0`;
      
      const tokens = lexer.tokenize(dstv);
      
      // Find tokens after BO
      const boIndex = tokens.findIndex(t => t.value === 'BO');
      const akIndex = tokens.findIndex(t => t.value === 'AK');
      
      // Tokens between BO and AK should have BO context
      for (let i = boIndex + 1; i < akIndex; i++) {
        if (tokens[i].type === TokenType.NUMBER) {
          expect((tokens[i] as any).blockContext).toBe('BO');
        }
      }
    });
  });
  
  describe('Performance', () => {
    test('should handle large files efficiently', () => {
      // Generate large DSTV content
      let content = 'ST\n';
      for (let i = 0; i < 1000; i++) {
        content += `BO\nv${i * 10} ${i * 20} 25\n`;
      }
      content += 'EN';
      
      const startTime = Date.now();
      const tokens = lexer.tokenize(content);
      const duration = Date.now() - startTime;
      
      expect(tokens.length).toBeGreaterThan(3000);
      expect(duration).toBeLessThan(1000); // Should parse in less than 1 second
    });
    
    test('should handle deeply nested structures', () => {
      const dstv = `ST
AK
0 0
100 0
100 100
200 100
200 200
300 200
300 300
400 300
400 0
0 0
EN`;
      
      const tokens = lexer.tokenize(dstv);
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(20); // 10 points * 2 coordinates
    });
  });
});