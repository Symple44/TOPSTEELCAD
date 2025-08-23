/**
 * WABlockParser - Parser pour les blocs WA (Washing)
 * Gère les opérations de lavage et nettoyage
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken } from '../stages/DSTVLexicalStage';

export interface WABlockData {
  method: 'blast' | 'chemical' | 'water' | 'ultrasonic';
  intensity: number;        // Intensité 0-100
  duration?: number;        // Durée en secondes
  temperature?: number;     // Température en °C
  pressure?: number;        // Pression en bars
  chemical?: string;        // Produit chimique utilisé
}

export class WABlockParser extends BaseBlockParser<WABlockData> {
  
  parse(tokens: DSTVToken[]): WABlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const method = this.detectMethod();
    const numbers = this.getNextNumbers(4);
    
    return {
      method: method,
      intensity: numbers[0] || 50,
      duration: numbers[1],
      temperature: numbers[2],
      pressure: numbers[3],
      chemical: this.getNextString() || undefined
    };
  }
  
  private detectMethod(): 'blast' | 'chemical' | 'water' | 'ultrasonic' {
    for (const token of this.tokens) {
      const val = String(token.value).toUpperCase();
      if (val.includes('BLAST')) return 'blast';
      if (val.includes('CHEM')) return 'chemical';
      if (val.includes('WATER')) return 'water';
      if (val.includes('ULTRA')) return 'ultrasonic';
    }
    return 'water'; // Par défaut
  }
}