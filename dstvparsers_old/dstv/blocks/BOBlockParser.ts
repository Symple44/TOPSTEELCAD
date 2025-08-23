/**
 * BOBlockParser - Parser pour les blocs BO (trous/perçages)
 * Gère tous les types de trous DSTV : round, slotted, square, rectangular
 */

import { DSTVToken, DSTVHole, TokenType } from '../types';
import { createModuleLogger } from '../../../utils/logger';

/**
 * Parser pour les blocs BO (Bohren - Drilling)
 * Supporte tous les types de trous de la spécification DSTV
 */
const log = createModuleLogger('BOBlockParser');

export class BOBlockParser {
  
  /**
   * Parse les tokens d'un bloc BO
   * @param tokens - Les tokens du bloc BO
   * @param profileContext - Contexte du profil (dimensions, type)
   */
  parse(tokens: DSTVToken[], profileContext?: any): DSTVHole[] {
    const holes: DSTVHole[] = [];
    console.log(`🔍 BOBlockParser: parsing ${tokens.length} tokens`);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      console.log(`  Token ${i}: type=${token.type}, value=${token.value}`);
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || 
          token.type === TokenType.BLOCK_START || 
          token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Traiter les tokens FACE_INDICATOR qui contiennent les données de trou
      if (token.type === TokenType.FACE_INDICATOR && token.value) {
        // Extraire l'indicateur de face (h, v, u, o) et les coordonnées
        const value = token.value.trim();
        const faceChar = value.charAt(0).toLowerCase();
        
        // Vérifier si c'est un indicateur de trou valide
        if (faceChar === 'h' || faceChar === 'v' || faceChar === 'u' || faceChar === 'o') {
          console.log(`  Found hole indicator '${faceChar}' in FACE_INDICATOR: ${value}`);
        
          // Extraire les valeurs numériques depuis le token FACE_INDICATOR
          // Format: "v  1857.15u   163.20  22.00   0.00"
          const parts = value.substring(1).split(/\s+/).filter(p => p);
          const values: number[] = [];
          
          for (const part of parts) {
            const numMatch = part.match(/^(\d+\.?\d*)/);
            if (numMatch) {
              values.push(parseFloat(numMatch[1]));
            }
          }
          
          console.log(`  Extracted values: ${values.join(', ')}`);
        
          // Créer le trou si on a au moins x, y et diamètre
          if (values.length >= 3) {
            // IMPORTANT: Pour DSTV, garder directement l'indicateur de face original
            // Le système en aval interprétera selon le contexte
            const hole: DSTVHole = {
              x: values[0],
              y: values[1],
              diameter: values[2],
              face: faceChar as any, // Garder 'v', 'u', 'o', 'h' tel quel
              depth: values[3] || 0
            };
            
            holes.push(hole);
            console.log(`  ✅ Added hole at (${hole.x}, ${hole.y}) diameter=${hole.diameter} on face '${faceChar}'`);
          } else {
            console.log(`  ⚠️ Not enough values for hole (need at least 3, got ${values.length})`);
          }
        }
      }
    }
    
    console.log(`🔍 BOBlockParser: returning ${holes.length} holes`);
    return holes;
  }
}

// Export par défaut pour compatibilité ES modules
export default BOBlockParser;