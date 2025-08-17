/**
 * DSTVLexer - Analyseur lexical pour fichiers DSTV
 * Responsable de la tokenisation du contenu DSTV
 */

import { DSTVToken, TokenType, ProfileFace } from '../types';

/**
 * Lexer DSTV - Analyse lexicale optimisée
 */
export class DSTVLexer {
  /**
   * Tokenise le contenu d'un fichier DSTV
   */
  tokenize(content: string): DSTVToken[] {
    if (!content) {
      return [];
    }

    const tokens: DSTVToken[] = [];
    const lines = content.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex].trim();
      const lineNumber = lineIndex + 1;

      if (!line) {
        // Skip empty lines
        continue;
      }

      // Handle comments
      if (line.startsWith('**')) {
        tokens.push({
          type: TokenType.COMMENT,
          value: line.substring(2).trim(),
          line: lineNumber,
          column: 1
        });
        continue;
      }

      // Handle block commands
      if (line === 'ST' || line === 'BO' || line === 'AK' || line === 'SI') {
        tokens.push({
          type: TokenType.BLOCK_START,
          value: line,
          line: lineNumber,
          column: 1
        });
        continue;
      }

      if (line === 'EN') {
        tokens.push({
          type: TokenType.BLOCK_END,
          value: line,
          line: lineNumber,
          column: 1
        });
        continue;
      }

      // Handle text strings (for SI blocks)
      if (line.startsWith('"') && line.endsWith('"')) {
        tokens.push({
          type: TokenType.TEXT,
          value: line.substring(1, line.length - 1),
          line: lineNumber,
          column: 1
        });
        continue;
      }

      // Parse tokens within a line
      let columnIndex = 1;
      const parts = line.split(/\s+/);

      for (const part of parts) {
        if (!part) continue;

        // Check for face indicators
        if (part === 'v' || part === 'o' || part === 'u') {
          const faceMap: { [key: string]: ProfileFace } = {
            'v': ProfileFace.FRONT,
            'o': ProfileFace.TOP,
            'u': ProfileFace.BOTTOM
          };
          
          tokens.push({
            type: TokenType.FACE_INDICATOR,
            value: part,
            line: lineNumber,
            column: columnIndex,
            face: faceMap[part]
          });
        }
        // Check for hole types
        else if (part === 's' || part === 'c' || part === 't') {
          const holeTypeMap: { [key: string]: string } = {
            's': 'countersunk',
            'c': 'counterbore',
            't': 'tapped'
          };
          
          tokens.push({
            type: TokenType.HOLE_TYPE,
            value: part,
            line: lineNumber,
            column: columnIndex,
            holeType: holeTypeMap[part]
          });
        }
        // Check for numbers (including negative and scientific notation)
        else if (/^[+-]?\d*\.?\d+([eE][+-]?\d+)?$/.test(part)) {
          tokens.push({
            type: TokenType.NUMBER,
            value: part,
            line: lineNumber,
            column: columnIndex
          });
        }
        // Everything else is an identifier
        else {
          tokens.push({
            type: TokenType.IDENTIFIER,
            value: part,
            line: lineNumber,
            column: columnIndex
          });
        }

        columnIndex += part.length + 1; // +1 for the space
      }
    }

    return tokens;
  }
}