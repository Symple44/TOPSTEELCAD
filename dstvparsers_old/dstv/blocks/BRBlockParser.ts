/**
 * BRBlockParser - Parser pour les blocs BR (Bevel/Chamfer)
 * Gère les chanfreins et biseaux sur les profils
 * Supporte les chanfreins simples et composés
 */

import { DSTVToken, ProfileFace, TokenType } from '../types';

/**
 * Interface pour les données de chanfrein
 */
export interface DSTVChamfer {
  face: ProfileFace;
  position: [number, number, number];
  angle: number;
  depth: number;
  length: number;
  edge?: 'top' | 'bottom' | 'left' | 'right' | 'all';
  type: 'simple' | 'double' | 'rounded';
}

/**
 * Parser pour les blocs BR (Bevel/Radius - Chanfrein)
 * Traite les chanfreins et arrondis sur les arêtes
 */
export class BRBlockParser {
  
  /**
   * Parse les tokens d'un bloc BR
   */
  parse(tokens: DSTVToken[]): DSTVChamfer[] {
    const chamfers: DSTVChamfer[] = [];
    
    let currentFace: ProfileFace = ProfileFace.FRONT;
    // let chamferType: 'simple' | 'double' | 'rounded' = 'simple'; // TODO: Use chamferType in chamfer creation
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || 
          token.type === TokenType.BLOCK_START || 
          token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Mise à jour de la face courante
      if (token.type === TokenType.FACE_INDICATOR && token.face) {
        currentFace = token.face;
      }
      
      // Traiter les données de chanfrein
      if (this.hasChamferData(token)) {
        const chamferData = this.parseChamferData(token, currentFace);
        if (chamferData) {
          chamfers.push(chamferData);
        }
      } else if (token.type === TokenType.NUMBER) {
        // Parser une séquence numérique pour un chanfrein simple
        const values = this.parseNumericSequence(tokens, i);
        if (values.length >= 3) {
          const chamfer = this.createSimpleChamfer(values, currentFace);
          if (chamfer) {
            chamfers.push(chamfer);
          }
          i += values.length - 1; // Avancer l'index
        }
      } else if (token.type === TokenType.IDENTIFIER) {
        // Détection du type de chanfrein
        const typeIndicator = token.value.toLowerCase();
        if (typeIndicator === 'r' || typeIndicator === 'round') {
          // chamferType = 'rounded'; // TODO: Use for rounded chamfers
        } else if (typeIndicator === 'd' || typeIndicator === 'double') {
          // chamferType = 'double'; // TODO: Use for double chamfers
        } else if (typeIndicator === 's' || typeIndicator === 'simple') {
          // chamferType = 'simple'; // TODO: Use for simple chamfers
        }
      }
    }
    
    return chamfers;
  }
  
  /**
   * Vérifie si un token contient des données de chanfrein
   */
  private hasChamferData(token: DSTVToken): boolean {
    return !!(token as unknown).values && Array.isArray((token as unknown).values);
  }
  
  /**
   * Parse les données de chanfrein depuis un token
   */
  private parseChamferData(token: DSTVToken, face: ProfileFace): DSTVChamfer | null {
    const values = (token as unknown).values;
    
    if (!values || values.length < 3) {
      return null;
    }
    
    // Format attendu : x, y, z, angle, depth, length
    const chamfer: DSTVChamfer = {
      face: token.face || face,
      position: [values[0], values[1], values[2] || 0],
      angle: values[3] || 45, // Angle par défaut de 45°
      depth: values[4] || 10,  // Profondeur par défaut
      length: values[5] || 100, // Longueur par défaut
      type: this.determineChamferType(values)
    };
    
    // Déterminer l'arête si spécifiée
    if (values.length > 6) {
      chamfer.edge = this.parseEdgeIndicator(values[6]);
    }
    
    return chamfer;
  }
  
  /**
   * Parse une séquence de valeurs numériques
   */
  private parseNumericSequence(tokens: DSTVToken[], startIndex: number): number[] {
    const values: number[] = [];
    
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.NUMBER) {
        values.push(parseFloat(token.value));
      } else if (token.type === TokenType.IDENTIFIER && i === startIndex + values.length) {
        // Peut être un indicateur d'arête après les nombres
        break;
      } else {
        break;
      }
    }
    
    return values;
  }
  
  /**
   * Crée un chanfrein simple à partir de valeurs numériques
   */
  private createSimpleChamfer(values: number[], face: ProfileFace): DSTVChamfer | null {
    if (values.length < 3) {
      return null;
    }
    
    return {
      face,
      position: [values[0], values[1], values[2] || 0],
      angle: values[3] || 45,
      depth: values[4] || 10,
      length: values[5] || 100,
      type: 'simple',
      edge: this.determineEdgeFromPosition([values[0], values[1], values[2] || 0])
    };
  }
  
  /**
   * Détermine le type de chanfrein basé sur les valeurs
   */
  private determineChamferType(values: number[]): 'simple' | 'double' | 'rounded' {
    // Si l'angle est 0, c'est probablement un arrondi
    if (values.length > 3 && values[3] === 0) {
      return 'rounded';
    }
    
    // Si on a deux angles différents, c'est un chanfrein double
    if (values.length > 7 && values[3] !== values[7]) {
      return 'double';
    }
    
    // Par défaut, chanfrein simple
    return 'simple';
  }
  
  /**
   * Parse un indicateur d'arête
   */
  private parseEdgeIndicator(value: any): 'top' | 'bottom' | 'left' | 'right' | 'all' {
    if (typeof value === 'string') {
      const indicator = value.toLowerCase();
      switch (indicator) {
        case 't':
        case 'top':
        case 'o': // Oben (allemand)
          return 'top';
        case 'b':
        case 'bottom':
        case 'u': // Unten (allemand)
          return 'bottom';
        case 'l':
        case 'left':
        case 'links':
          return 'left';
        case 'r':
        case 'right':
        case 'rechts':
          return 'right';
        case 'a':
        case 'all':
        case 'alle':
          return 'all';
      }
    } else if (typeof value === 'number') {
      // Codes numériques pour les arêtes
      switch (value) {
        case 1: return 'top';
        case 2: return 'right';
        case 3: return 'bottom';
        case 4: return 'left';
        case 0:
        case 9: return 'all';
      }
    }
    
    // Par défaut, on suppose que c'est sur toutes les arêtes
    return 'all';
  }
  
  /**
   * Détermine l'arête basée sur la position
   */
  private determineEdgeFromPosition(position: [number, number, number]): 'top' | 'bottom' | 'left' | 'right' | 'all' {
    const [x, y] = position; // z coordinate not used for edge determination
    
    // Heuristique simple basée sur la position
    // Si x est proche de 0, c'est probablement l'arête gauche
    if (Math.abs(x) < 10) {
      return 'left';
    }
    
    // Si y est proche de 0, c'est probablement l'arête inférieure
    if (Math.abs(y) < 10) {
      return 'bottom';
    }
    
    // Si x est grand, c'est probablement l'arête droite
    if (x > 500) {
      return 'right';
    }
    
    // Si y est grand, c'est probablement l'arête supérieure
    if (y > 200) {
      return 'top';
    }
    
    // Par défaut, on ne peut pas déterminer
    return 'all';
  }
  
  /**
   * Convertit les chanfreins en découpes pour compatibilité
   * Utilisé pour l'intégration avec le système de features existant
   */
  static chamfersToCuts(chamfers: DSTVChamfer[]): unknown[] {
    return chamfers.map(chamfer => {
      // Calculer le contour du chanfrein comme une découpe triangulaire
      const contour = this.calculateChamferContour(chamfer);
      
      return {
        face: chamfer.face,
        contour,
        depth: chamfer.depth,
        isTransverse: false,
        type: 'chamfer',
        chamferData: chamfer
      };
    });
  }
  
  /**
   * Calcule le contour d'un chanfrein comme une forme géométrique
   */
  private static calculateChamferContour(chamfer: DSTVChamfer): Array<[number, number]> {
    const [x, y] = chamfer.position;
    const angleRad = (chamfer.angle * Math.PI) / 180;
    
    // Calculer les points du triangle de chanfrein
    const depth = chamfer.depth;
    const length = chamfer.length;
    
    // Points selon l'arête
    let contour: Array<[number, number]> = [];
    
    switch (chamfer.edge) {
      case 'top':
        contour = [
          [x, y],
          [x + length, y],
          [x + length, y - depth * Math.tan(angleRad)],
          [x, y - depth * Math.tan(angleRad)],
          [x, y]
        ];
        break;
      case 'bottom':
        contour = [
          [x, y],
          [x + length, y],
          [x + length, y + depth * Math.tan(angleRad)],
          [x, y + depth * Math.tan(angleRad)],
          [x, y]
        ];
        break;
      case 'left':
        contour = [
          [x, y],
          [x, y + length],
          [x + depth * Math.tan(angleRad), y + length],
          [x + depth * Math.tan(angleRad), y],
          [x, y]
        ];
        break;
      case 'right':
        contour = [
          [x, y],
          [x, y + length],
          [x - depth * Math.tan(angleRad), y + length],
          [x - depth * Math.tan(angleRad), y],
          [x, y]
        ];
        break;
      default:
        // Pour 'all', on retourne un simple triangle
        contour = [
          [x, y],
          [x + depth, y],
          [x, y + depth],
          [x, y]
        ];
    }
    
    return contour;
  }
}
// Export par défaut pour compatibilité ES modules
export default BRBlockParser;
