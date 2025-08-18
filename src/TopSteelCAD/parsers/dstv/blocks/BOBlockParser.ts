/**
 * BOBlockParser - Parser pour les blocs BO (trous/perçages)
 * Gère tous les types de trous DSTV : round, slotted, square, rectangular
 */

import { DSTVToken, DSTVHole, ProfileFace, TokenType, HoleType } from '../types';

/**
 * Parser pour les blocs BO (Bohren - Drilling)
 * Supporte tous les types de trous de la spécification DSTV
 */
export class BOBlockParser {
  
  /**
   * Parse les tokens d'un bloc BO
   */
  parse(tokens: DSTVToken[]): DSTVHole[] {
    const holes: DSTVHole[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || 
          token.type === TokenType.BLOCK_START || 
          token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Traiter les lignes de données avec face (depuis le lexer amélioré)
      if (token.type === TokenType.FACE_INDICATOR || this.hasHoleData(token)) {
        const hole = this.parseHoleFromToken(token);
        if (hole) {
          holes.push(hole);
        }
      }
    }

    return holes;
  }

  /**
   * Vérifie si un token contient des données de trou
   */
  private hasHoleData(token: DSTVToken): boolean {
    // Vérifier si le token a des valeurs numériques (provenant du lexer amélioré)
    return !!(token as any).values && Array.isArray((token as any).values);
  }
  
  /**
   * Parse un trou depuis un token enrichi par le lexer
   */
  private parseHoleFromToken(token: DSTVToken): DSTVHole | null {
    const values = (token as any).values;
    const face = token.face || ProfileFace.FRONT;
    
    // Besoin d'au moins x, y, diameter
    if (!values || values.length < 3) {
      return null;
    }
    
    const hole: DSTVHole = {
      x: values[0],
      y: values[1],
      diameter: values[2],
      face,
      depth: values[3] || 0 // Profondeur optionnelle
    };
    
    // Vérifier le type de trou (depuis le lexer amélioré)
    const holeType = (token as any).holeType;
    if (holeType) {
      hole.holeType = holeType;
      
      // Pour les trous oblongs (slotted)
      if (holeType === 'slotted') {
        (hole as any).slottedLength = (token as any).slottedLength || 0;
        (hole as any).slottedAngle = (token as any).slottedAngle || 0;
      }
      
      // Pour les trous rectangulaires
      if (holeType === 'rectangular' || holeType === 'square') {
        // Dans DSTV, les dimensions supplémentaires peuvent être dans values[4] et values[5]
        if (values.length > 4) {
          (hole as any).width = values[4];
          (hole as any).height = values[5] || values[4]; // Square si height non spécifiée
        }
      }
    }
    
    return hole;
  }
}