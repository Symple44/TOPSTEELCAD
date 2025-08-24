/**
 * BRBlockParser - Parser pour les blocs BR (Bevel/Radius)
 * Gère les chanfreins et rayons sur les arêtes
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken } from '../stages/DSTVLexicalStage';
import { StandardFace } from '../../../../core/coordinates/types';

export interface BRBlockData {
  face?: StandardFace | undefined;
  x: number;
  y: number;
  z?: number;
  angle: number;      // Angle du chanfrein en degrés
  size: number;       // Taille du chanfrein
  type: 'chamfer' | 'radius';  // Type de traitement
  edge?: string;      // Arête concernée
}

export class BRBlockParser extends BaseBlockParser<BRBlockData> {
  
  parse(tokens: DSTVToken[]): BRBlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const faceStr = this.getFaceIndicator();
    const numbers = this.getNextNumbers(5);
    
    return {
      face: this.mapFaceIndicator(faceStr) || StandardFace.WEB,
      x: numbers[0] || 0,
      y: numbers[1] || 0,
      z: numbers[2],
      angle: numbers[3] || 45,     // Angle par défaut 45°
      size: numbers[4] || 5,        // Taille par défaut 5mm
      type: this.detectType(),
      edge: this.detectEdge()
    };
  }
  
  private detectType(): 'chamfer' | 'radius' {
    // Recherche d'indicateurs de type
    for (const token of this.tokens) {
      if (token.value === 'R' || token.value === 'RADIUS') {
        return 'radius';
      }
    }
    return 'chamfer'; // Par défaut
  }
  
  private detectEdge(): string | undefined {
    // Recherche d'indicateurs d'arête
    for (const token of this.tokens) {
      const val = String(token.value).toUpperCase();
      if (['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'ALL'].includes(val)) {
        return val.toLowerCase();
      }
    }
    return undefined;
  }

  /**
   * Mappe un indicateur de face
   */
  private mapFaceIndicator(indicator: string | null): StandardFace | undefined {
    if (!indicator) return undefined;
    
    const mapping: Record<string, StandardFace> = {
      'v': StandardFace.WEB,              // Vertical = Âme/web
      'o': StandardFace.TOP_FLANGE,       // Over = Face supérieure/dessus
      'u': StandardFace.BOTTOM_FLANGE,    // Under = Face inférieure/dessous
      'h': StandardFace.WEB               // Face avant -> Web par défaut
    };
    return mapping[indicator.toLowerCase()] || undefined;
  }
}