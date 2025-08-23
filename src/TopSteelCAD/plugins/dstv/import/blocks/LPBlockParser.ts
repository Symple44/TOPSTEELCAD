/**
 * LPBlockParser - Parser pour les blocs LP (Line Program)
 * Gère les programmes linéaires et trajectoires
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken } from '../stages/DSTVLexicalStage';

export interface LPBlockData {
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  operation: string;        // Type d'opération (CUT, MARK, etc.)
  speed: number;           // Vitesse de déplacement
  toolDiameter?: number;   // Diamètre d'outil
  depth?: number;          // Profondeur de coupe
  interpolation?: 'linear' | 'circular' | 'spline';
}

export class LPBlockParser extends BaseBlockParser<LPBlockData> {
  
  parse(tokens: DSTVToken[]): LPBlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const numbers = this.getNextNumbers(9);
    const operation = this.getNextString() || 'CUT';
    
    return {
      startPoint: {
        x: numbers[0] || 0,
        y: numbers[1] || 0,
        z: numbers[2] || 0
      },
      endPoint: {
        x: numbers[3] || 0,
        y: numbers[4] || 0,
        z: numbers[5] || 0
      },
      operation: operation,
      speed: numbers[6] || 100,
      toolDiameter: numbers[7],
      depth: numbers[8],
      interpolation: 'linear'
    };
  }
}