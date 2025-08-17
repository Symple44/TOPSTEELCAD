/**
 * BOBlockParser - Parser pour les blocs BO (trous/perçages)
 * Gère l'extraction des informations de perçage
 */

import { DSTVToken, DSTVHole, ProfileFace } from '../types';

/**
 * Parser pour les blocs BO (Bohren - Drilling)
 * Extrait les informations de perçage
 */
export class BOBlockParser {
  
  /**
   * Parse les tokens d'un bloc BO
   */
  parse(tokens: DSTVToken[]): DSTVHole[] {
    const holes: DSTVHole[] = [];
    let i = 0;

    while (i < tokens.length) {
      // Try to parse a hole (x, y, diameter, face, [holeType])
      const hole = this.parseHole(tokens, i);
      
      if (hole) {
        holes.push(hole.hole);
        i = hole.nextIndex;
      } else {
        i++;
      }
    }

    return holes;
  }

  /**
   * Parse un trou à partir de la position actuelle
   */
  private parseHole(tokens: DSTVToken[], startIndex: number): { hole: DSTVHole; nextIndex: number } | null {
    let i = startIndex;
    let x: number | null = null;
    let y: number | null = null;
    let diameter: number | null = null;
    let face: ProfileFace = ProfileFace.FRONT; // Default face
    let holeType: string | undefined;

    // Parse x coordinate
    if (i < tokens.length && tokens[i].type === 'NUMBER') {
      x = parseFloat(tokens[i].value);
      i++;
    } else {
      return null;
    }

    // Parse y coordinate
    if (i < tokens.length && tokens[i].type === 'NUMBER') {
      y = parseFloat(tokens[i].value);
      i++;
    } else {
      return null;
    }

    // Parse diameter
    if (i < tokens.length && tokens[i].type === 'NUMBER') {
      diameter = parseFloat(tokens[i].value);
      i++;
    } else {
      return null;
    }

    // Parse optional face indicator
    if (i < tokens.length && tokens[i].type === 'FACE_INDICATOR') {
      face = tokens[i].face || ProfileFace.FRONT;
      i++;
    }

    // Parse optional hole type
    if (i < tokens.length && tokens[i].type === 'HOLE_TYPE') {
      holeType = tokens[i].holeType;
      i++;
    }

    return {
      hole: {
        x,
        y,
        diameter,
        face,
        holeType
      },
      nextIndex: i
    };
  }
}