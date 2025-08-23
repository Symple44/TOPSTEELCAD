/**
 * NUBlockParser - Parser pour les blocs NU (Numerically Controlled)
 * Gère les opérations à commande numérique
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken } from '../stages/DSTVLexicalStage';

export interface NUBlockData {
  machineType: string;      // Type de machine CNC
  toolNumber: number;       // Numéro d'outil
  operation: string;        // Code d'opération
  feedRate: number;         // Vitesse d'avance mm/min
  spindleSpeed: number;     // Vitesse de broche tr/min
  position: {
    x: number;
    y: number;
    z: number;
  };
  parameters: {            // Paramètres spécifiques
    depth?: number;
    diameter?: number;
    angle?: number;
    coolant?: boolean;
  };
  gCode?: string[];        // Codes G optionnels
}

export class NUBlockParser extends BaseBlockParser<NUBlockData> {
  
  parse(tokens: DSTVToken[]): NUBlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const machineType = this.getNextString() || 'MILL';
    const numbers = this.getNextNumbers(8);
    const gCodes = this.extractGCodes();
    
    return {
      machineType: machineType,
      toolNumber: numbers[0] || 1,
      operation: this.getNextString() || 'DRILL',
      feedRate: numbers[1] || 100,
      spindleSpeed: numbers[2] || 1000,
      position: {
        x: numbers[3] || 0,
        y: numbers[4] || 0,
        z: numbers[5] || 0
      },
      parameters: {
        depth: numbers[6],
        diameter: numbers[7],
        coolant: true
      },
      gCode: gCodes.length > 0 ? gCodes : undefined
    };
  }
  
  private extractGCodes(): string[] {
    const codes: string[] = [];
    for (const token of this.tokens) {
      const val = String(token.value);
      if (val.match(/^[GM]\d+/)) {
        codes.push(val);
      }
    }
    return codes;
  }
}