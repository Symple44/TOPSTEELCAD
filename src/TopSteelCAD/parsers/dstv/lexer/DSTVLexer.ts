/**
 * DSTVLexer - Analyseur lexical pour fichiers DSTV
 * Responsable de la tokenisation du contenu DSTV
 */

import { DSTVToken, TokenType, HoleType, ProfileFace } from '../types';

/**
 * Lexer DSTV - Analyse lexicale optimisée
 */
export class DSTVLexer {
  private currentContext: string = ''; // Pour suivre le contexte actuel (BO, AK, SI, etc.)
  
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

      // Handle comments (both * and **)
      if (line.startsWith('**')) {
        tokens.push({
          type: TokenType.COMMENT,
          value: line,
          line: lineNumber,
          column: 1
        });
        continue;
      } else if (line.startsWith('*')) {
        tokens.push({
          type: TokenType.COMMENT,
          value: line,
          line: lineNumber,
          column: 1
        });
        continue;
      }

      // Handle block commands
      if (line === 'ST' || line === 'BO' || line === 'AK' || line === 'SI' || line === 'IK' || line === 'SC' || line === 'BR' || line === 'PU' || line === 'KO') {
        this.currentContext = line; // Mettre à jour le contexte
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

      // Parse data lines with face and values (format: v/u/o x y z ...)
      if (this.isFaceData(line)) {
        const faceToken = this.parseFaceData(line, lineNumber);
        if (faceToken) {
          tokens.push(faceToken);
        }
        continue;
      }
      
      // Check for inline comments first
      let workingLine = line;
      let commentPart = '';
      const commentMatch = line.match(/(.*)\s(\*\*.*)$/);
      if (commentMatch) {
        workingLine = commentMatch[1].trim();
        commentPart = commentMatch[2];
      }
      
      // Parse tokens within a line  
      let columnIndex = 1;
      const parts = workingLine.split(/\s+/);

      for (const part of parts) {
        if (!part) continue;
        
        // Add block context to all tokens
        const addContextToToken = (token: any) => {
          if (this.currentContext) {
            token.blockContext = this.currentContext;
          }
          return token;
        };

        // Check for face indicators
        if (part === 'v' || part === 'o' || part === 'u') {
          // Map DSTV face codes to ProfileFace enum
          const faceMap = {
            'v': 'top',     // aile supérieure
            'o': 'front',   // âme
            'u': 'bottom'   // aile inférieure
          };
          tokens.push(addContextToToken({
            type: TokenType.FACE_INDICATOR,
            value: part,
            line: lineNumber,
            column: columnIndex,
            face: faceMap[part as 'v'|'o'|'u'] as unknown
          }));
        }
        // Check for hole types (including modifiers)
        else if (part === 's' || part === 'c' || part === 't' || part === 'l' || part === 'r') {
          const holeTypeMap: { [key: string]: string } = {
            's': 'square',
            'c': 'counterbore', 
            't': 'tapped',
            'l': 'slotted',
            'r': 'rectangular'
          };
          
          tokens.push(addContextToToken({
            type: TokenType.HOLE_TYPE,
            value: part,
            line: lineNumber,
            column: columnIndex,
            holeType: holeTypeMap[part]
          }));
        }
        // Check for numbers (including negative and scientific notation)
        else if (/^[+-]?\d*\.?\d+([eE][+-]?\d+)?$/.test(part)) {
          tokens.push(addContextToToken({
            type: TokenType.NUMBER,
            value: part,
            line: lineNumber,
            column: columnIndex
          }));
        }
        // Check for invalid characters
        else if (/[^A-Za-z0-9._-]/.test(part) && !part.match(/^[+-]?\d*\.?\d+/)) {
          tokens.push(addContextToToken({
            type: TokenType.UNKNOWN,
            value: part,
            line: lineNumber,
            column: columnIndex
          }));
        }
        // Everything else is an identifier
        else {
          tokens.push(addContextToToken({
            type: TokenType.IDENTIFIER,
            value: part,
            line: lineNumber,
            column: columnIndex
          }));
        }

        columnIndex += part.length + 1; // +1 for the space
      }
      
      // Add inline comment token if found
      if (commentPart) {
        tokens.push({
          type: TokenType.COMMENT,
          value: commentPart,
          line: lineNumber,
          column: workingLine.length + 2
        });
      }
    }

    return tokens;
  }
  
  /**
   * Vérifie si une ligne contient des données avec face
   */
  private isFaceData(line: string): boolean {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const firstPart = parts[0];
      // Only treat as face data if it's a simple face indicator or face+number
      // and doesn't contain multiple separate face indicators
      if (/^[vuo]$/.test(firstPart) || /^[vuo][\d.-]+$/.test(firstPart)) {
        // Count face indicators - should be at most 1 in first part + 1 attached to a number
        let faceCount = 0;
        if (/^[vuo]/.test(firstPart)) faceCount++;
        
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          // If we find a standalone face indicator, this is not face data
          if (/^[vuo]$/.test(part) || /^[vuo][\d.-]+$/.test(part)) {
            return false; // Multiple face indicators = separate tokens
          }
          // If it's not a number (with optional attached face), reject
          if (!/^[\d.-]+[vuo]?$/.test(part)) {
            return false;
          }
          // Count attached faces
          if (/[vuo]$/.test(part)) faceCount++;
        }
        
        return faceCount <= 2; // At most start face + one attached face
      }
    }
    return false;
  }
  
  /**
   * Parse une ligne de données avec face (porté depuis l'ancien parser)
   */
  private parseFaceData(line: string, lineNumber: number): DSTVToken | null {
    const parts = line.split(/\s+/);
    const face = parts[0].charAt(0) as 'v' | 'u' | 'o';
    
    // Extraire les valeurs numériques et les modificateurs
    const values: number[] = [];
    let holeType: HoleType = 'round'; // Par défaut trou rond
    let slottedLength = 0;
    let slottedAngle = 0;
    let foundSlotted = false;
    
    // Détecter le format spécial "v  4703.00u" où la face secondaire est collée au nombre
    // Variables for future implementation:
    // let hasSecondaryFace = false;
    // let secondaryFace: 'v' | 'u' | 'o' | null = null;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Enlever le préfixe de face si présent
      let cleanPart = i === 0 ? part.substring(1) : part;
      
      // Vérifier si le nombre a une face collée à la fin (ex: "4703.00u")
      if (cleanPart.match(/^[\d.-]+[vuo]$/)) {
        // const lastChar = cleanPart.slice(-1); // For future implementation
        // Variables for future implementation:
        // secondaryFace = lastChar as 'v' | 'u' | 'o';
        cleanPart = cleanPart.slice(0, -1); // Enlever le dernier caractère
        // hasSecondaryFace = true;
        
        // Note: La conversion de face v...u -> o pour les trous est maintenant
        // gérée dans BOBlockParser qui a le contexte approprié
        // Le lexer se contente de capturer la notation brute
      }
      
      // Vérifier si c'est un modificateur 'l' pour trou oblong
      if (cleanPart.includes('l')) {
        holeType = 'slotted';
        foundSlotted = true;
        // La valeur avant le 'l' est la profondeur
        const beforeL = cleanPart.substring(0, cleanPart.indexOf('l'));
        if (beforeL) {
          const num = parseFloat(beforeL);
          if (!isNaN(num)) {
            values.push(num);
          }
        }
        // Regarder la valeur suivante pour la longueur d'élongation
        if (i + 1 < parts.length) {
          slottedLength = parseFloat(parts[i + 1]) || 0;
          // Avancer l'index pour éviter de retraiter cette valeur
          i++;
          // Regarder la valeur suivante pour l'angle
          if (i + 1 < parts.length) {
            slottedAngle = parseFloat(parts[i + 1]) || 0;
            i++;
          }
        }
      } else if (!foundSlotted) {
        const num = parseFloat(cleanPart.replace(/[vuo]/g, ''));
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    }
    
    // Ne pas mapper les faces DSTV - les garder telles quelles
    // 'v' = aile supérieure (top flange)
    // 'o' = âme (web)
    // 'u' = aile inférieure (bottom flange)
    
    // Créer un token enrichi avec toutes les informations
    const token: DSTVToken & { values?: number[]; holeType?: HoleType; slottedLength?: number; slottedAngle?: number } = {
      type: TokenType.FACE_INDICATOR,
      value: line,
      line: lineNumber,
      column: 1,
      face: this.mapDSTVFaceToProfileFace(face)
    };
    
    // Ajouter les propriétés optionnelles si nécessaires
    if (values.length > 0) {
      (token as unknown).values = values;
    }
    if (holeType !== 'round') {
      (token as unknown).holeType = holeType;
    }
    if (slottedLength > 0) {
      (token as unknown).slottedLength = slottedLength;
    }
    if (slottedAngle > 0) {
      (token as unknown).slottedAngle = slottedAngle;
    }
    
    return token as DSTVToken;
  }
  
  /**
   * Map DSTV face code to ProfileFace enum
   */
  private mapDSTVFaceToProfileFace(face: 'v' | 'u' | 'o'): ProfileFace {
    const faceMap: Record<'v' | 'u' | 'o', ProfileFace> = {
      'v': ProfileFace.TOP,     // aile supérieure
      'o': ProfileFace.FRONT,   // âme  
      'u': ProfileFace.BOTTOM   // aile inférieure
    };
    return faceMap[face];
  }
}

// Export par défaut pour compatibilité ES modules
export default DSTVLexer;
// Force refresh - faces DSTV corrigées
