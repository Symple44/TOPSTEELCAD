/**
 * DSTVLexer - Analyseur lexical pour fichiers DSTV
 * Responsable de la tokenisation du contenu DSTV
 */

import { DSTVToken, TokenType, ProfileFace, HoleType } from '../types';

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
  
  /**
   * Vérifie si une ligne contient des données avec face
   */
  private isFaceData(line: string): boolean {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const firstPart = parts[0];
      // Vérifier si ça commence par v, u ou o suivi de nombres
      // Accepter aussi le format avec 'u' collé au nombre (ex: v  4703.00u)
      return /^[vuo]\s+[\d.-]+/.test(line) || /^[vuo][\d.-]+/.test(firstPart) || /^[vuo]\s+[\d.-]+[vuo]/.test(line);
    }
    return false;
  }
  
  /**
   * Parse une ligne de données avec face (porté depuis l'ancien parser)
   */
  private parseFaceData(line: string, lineNumber: number): DSTVToken | null {
    const parts = line.split(/\s+/);
    let face = parts[0].charAt(0) as 'v' | 'u' | 'o';
    
    // Extraire les valeurs numériques et les modificateurs
    const values: number[] = [];
    let holeType: HoleType = 'round'; // Par défaut trou rond
    let slottedLength = 0;
    let slottedAngle = 0;
    let foundSlotted = false;
    
    // Détecter le format spécial "v  4703.00u" où la face secondaire est collée au nombre
    let hasSecondaryFace = false;
    let secondaryFace: 'v' | 'u' | 'o' | null = null;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Enlever le préfixe de face si présent
      let cleanPart = i === 0 ? part.substring(1) : part;
      
      // Vérifier si le nombre a une face collée à la fin (ex: "4703.00u")
      if (cleanPart.match(/^[\d.-]+[vuo]$/)) {
        const lastChar = cleanPart.slice(-1);
        secondaryFace = lastChar as 'v' | 'u' | 'o';
        cleanPart = cleanPart.slice(0, -1); // Enlever le dernier caractère
        hasSecondaryFace = true;
        
        // Pour les trous (BO), la notation "v...u" signifie souvent un trou dans l'âme
        if (face === 'v' && secondaryFace === 'u' && this.currentContext === 'BO') {
          face = 'o'; // 'o' = âme (web) dans le système DSTV pour les trous
        }
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
    
    // Mapper la face au nouveau système
    const faceMap: { [key: string]: ProfileFace } = {
      'v': ProfileFace.FRONT,
      'o': ProfileFace.TOP,
      'u': ProfileFace.BOTTOM
    };
    
    // Créer un token enrichi avec toutes les informations
    const token: DSTVToken & { values?: number[]; holeType?: HoleType; slottedLength?: number; slottedAngle?: number } = {
      type: TokenType.FACE_INDICATOR,
      value: line,
      line: lineNumber,
      column: 1,
      face: faceMap[face]
    };
    
    // Ajouter les propriétés optionnelles si nécessaires
    if (values.length > 0) {
      (token as any).values = values;
    }
    if (holeType !== 'round') {
      (token as any).holeType = holeType;
    }
    if (slottedLength > 0) {
      (token as any).slottedLength = slottedLength;
    }
    if (slottedAngle > 0) {
      (token as any).slottedAngle = slottedAngle;
    }
    
    return token as DSTVToken;
  }
}