/**
 * SIBlockParser - Parser pour les blocs SI (marquages)
 * Gère l'extraction des informations de marquage
 */

import { DSTVToken, DSTVMarking } from '../types';

/**
 * Parser pour les blocs SI (Signieren - Marking)
 * Extrait les informations de marquage/signalétique
 */
export class SIBlockParser {
  
  /**
   * Parse les tokens d'un bloc SI
   */
  parse(tokens: DSTVToken[]): DSTVMarking[] {
    const markings: DSTVMarking[] = [];
    let i = 0;

    while (i < tokens.length) {
      // Try to parse a marking (text, x, y)
      const marking = this.parseMarking(tokens, i);
      
      if (marking) {
        markings.push(marking.marking);
        i = marking.nextIndex;
      } else {
        i++;
      }
    }

    return markings;
  }

  /**
   * Parse un marquage à partir de la position actuelle
   */
  private parseMarking(tokens: DSTVToken[], startIndex: number): { marking: DSTVMarking; nextIndex: number } | null {
    let i = startIndex;
    let text = '';
    let x = 0;
    let y = 0;

    // Parse text (TEXT token or IDENTIFIER)
    if (i < tokens.length) {
      if (tokens[i].type === 'TEXT') {
        text = tokens[i].value;
        i++;
      } else if (tokens[i].type === 'IDENTIFIER') {
        text = tokens[i].value;
        i++;
      } else {
        return null;
      }
    } else {
      return null;
    }

    // Parse x coordinate
    if (i < tokens.length && tokens[i].type === 'NUMBER') {
      x = parseFloat(tokens[i].value);
      i++;
    }

    // Parse y coordinate
    if (i < tokens.length && tokens[i].type === 'NUMBER') {
      y = parseFloat(tokens[i].value);
      i++;
    }

    return {
      marking: {
        text,
        x,
        y
      },
      nextIndex: i
    };
  }
}