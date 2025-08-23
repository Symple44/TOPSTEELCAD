/**
 * RTBlockParser - Parser pour les blocs RT (Rotation)
 * Gère les rotations de pièces
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken } from '../stages/DSTVLexicalStage';

export interface RTBlockData {
  axis: 'X' | 'Y' | 'Z';    // Axe de rotation
  angle: number;            // Angle en degrés
  center?: {                // Centre de rotation (optionnel)
    x: number;
    y: number;
    z: number;
  };
  speed?: number;           // Vitesse de rotation
  direction?: 'CW' | 'CCW'; // Sens horaire ou anti-horaire
}

export class RTBlockParser extends BaseBlockParser<RTBlockData> {
  
  parse(tokens: DSTVToken[]): RTBlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const axis = this.detectAxis();
    const numbers = this.getNextNumbers(5);
    
    return {
      axis: axis,
      angle: numbers[0] || 0,
      center: numbers[1] !== undefined ? {
        x: numbers[1] || 0,
        y: numbers[2] || 0,
        z: numbers[3] || 0
      } : undefined,
      speed: numbers[4],
      direction: this.detectDirection()
    };
  }
  
  private detectAxis(): 'X' | 'Y' | 'Z' {
    for (const token of this.tokens) {
      const val = String(token.value).toUpperCase();
      if (val === 'X' || val === 'Y' || val === 'Z') {
        return val as 'X' | 'Y' | 'Z';
      }
    }
    return 'Z'; // Par défaut
  }
  
  private detectDirection(): 'CW' | 'CCW' {
    for (const token of this.tokens) {
      const val = String(token.value).toUpperCase();
      if (val === 'CW' || val === 'CLOCKWISE') return 'CW';
      if (val === 'CCW' || val === 'COUNTERCLOCKWISE') return 'CCW';
    }
    return 'CW'; // Par défaut
  }
}