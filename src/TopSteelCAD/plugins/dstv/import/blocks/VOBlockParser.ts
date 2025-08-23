/**
 * VOBlockParser - Parser pour les blocs VO (Volume)
 * Gère les opérations de volume et de matière
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken } from '../stages/DSTVLexicalStage';

export interface VOBlockData {
  operation: 'add' | 'remove' | 'check';
  volume: number;           // Volume en mm³
  position?: {
    x: number;
    y: number;
    z: number;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  material?: string;        // Grade de matériau
  density?: number;         // Densité en kg/m³
}

export class VOBlockParser extends BaseBlockParser<VOBlockData> {
  
  parse(tokens: DSTVToken[]): VOBlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const operation = this.detectOperation();
    const numbers = this.getNextNumbers(7);
    
    return {
      operation: operation,
      volume: numbers[0] || 0,
      position: numbers[1] !== undefined ? {
        x: numbers[1] || 0,
        y: numbers[2] || 0,
        z: numbers[3] || 0
      } : undefined,
      dimensions: numbers[4] !== undefined ? {
        length: numbers[4] || 0,
        width: numbers[5] || 0,
        height: numbers[6] || 0
      } : undefined,
      material: this.getNextString() || undefined,
      density: 7850 // Densité par défaut de l'acier
    };
  }
  
  private detectOperation(): 'add' | 'remove' | 'check' {
    for (const token of this.tokens) {
      const val = String(token.value).toUpperCase();
      if (val === 'A' || val === 'ADD') return 'add';
      if (val === 'R' || val === 'REMOVE') return 'remove';
      if (val === 'C' || val === 'CHECK') return 'check';
    }
    return 'check'; // Par défaut, vérification du volume
  }
}