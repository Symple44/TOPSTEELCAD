/**
 * SIBlockParser - Parser pour les blocs SI (marquages)
 * Gère l'extraction complète des informations de marquage
 * Supporte texte, position, angle, taille, police, etc.
 */

import { DSTVToken, DSTVMarking, TokenType, ProfileFace } from '../types';

/**
 * Parser pour les blocs SI (Signieren - Marking/Signing)
 * Extrait les informations de marquage/signalétique avec tous les paramètres
 */
export class SIBlockParser {
  
  /**
   * Parse les tokens d'un bloc SI
   */
  parse(tokens: DSTVToken[]): DSTVMarking[] {
    const markings: DSTVMarking[] = [];
    let currentFace: ProfileFace = ProfileFace.FRONT;
    
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
      
      // Détecter les données de marquage
      if (this.hasMarkingData(token)) {
        const marking = this.parseMarkingFromToken(token, currentFace);
        if (marking) {
          markings.push(marking);
        }
      } else if (token.type === TokenType.TEXT || token.type === TokenType.IDENTIFIER) {
        // Format classique : texte suivi de coordonnées
        const marking = this.parseClassicMarking(tokens, i, currentFace);
        if (marking) {
          markings.push(marking.marking);
          i = marking.nextIndex - 1; // -1 car la boucle for incrémente
        }
      }
    }

    return markings;
  }

  /**
   * Vérifie si un token contient des données de marquage enrichies
   */
  private hasMarkingData(token: DSTVToken): boolean {
    return !!(token as any).values && 
           Array.isArray((token as any).values) && 
           (token as any).text;
  }
  
  /**
   * Parse un marquage depuis un token enrichi
   */
  private parseMarkingFromToken(token: DSTVToken, face: ProfileFace): DSTVMarking | null {
    const values = (token as any).values;
    const text = (token as any).text;
    
    if (!text || !values || values.length < 2) {
      return null;
    }
    
    const marking: DSTVMarking = {
      text,
      x: values[0],
      y: values[1],
      size: values[2] || 10,      // Taille par défaut
      angle: values[3] || 0        // Angle par défaut
    };
    
    // Paramètres additionnels optionnels
    if (values.length > 4) {
      (marking as any).depth = values[4]; // Profondeur de gravure
    }
    if (values.length > 5) {
      (marking as any).fontStyle = this.parseFontStyle(values[5]);
    }
    if (values.length > 6) {
      (marking as any).alignment = this.parseAlignment(values[6]);
    }
    
    // Ajouter la face si disponible
    if (face) {
      (marking as any).face = face;
    }
    
    return marking;
  }

  /**
   * Parse un marquage au format classique (texte, x, y, ...)
   */
  private parseClassicMarking(
    tokens: DSTVToken[], 
    startIndex: number,
    face: ProfileFace
  ): { marking: DSTVMarking; nextIndex: number } | null {
    let i = startIndex;
    let text = '';
    const values: number[] = [];

    // Récupérer le texte
    if (i < tokens.length) {
      const token = tokens[i];
      if (token.type === TokenType.TEXT || token.type === TokenType.IDENTIFIER) {
        text = token.value;
        // Nettoyer le texte (enlever les guillemets si présents)
        text = text.replace(/^["']|["']$/g, '');
        i++;
      } else {
        return null;
      }
    }

    // Récupérer les valeurs numériques qui suivent
    while (i < tokens.length && tokens[i].type === TokenType.NUMBER) {
      values.push(parseFloat(tokens[i].value));
      i++;
      
      // Maximum 7 valeurs (x, y, size, angle, depth, fontStyle, alignment)
      if (values.length >= 7) break;
    }

    // Besoin d'au moins x et y
    if (values.length < 2) {
      // Essayer avec des valeurs par défaut
      if (values.length === 0) {
        values.push(0, 0); // Position par défaut
      } else if (values.length === 1) {
        values.push(0); // Y par défaut
      }
    }

    const marking: DSTVMarking = {
      text,
      x: values[0],
      y: values[1],
      size: values[2] || this.getDefaultSize(text),
      angle: values[3] || 0
    };
    
    // Paramètres optionnels
    if (values[4] !== undefined) {
      (marking as any).depth = values[4];
    }
    if (values[5] !== undefined) {
      (marking as any).fontStyle = this.parseFontStyle(values[5]);
    }
    if (values[6] !== undefined) {
      (marking as any).alignment = this.parseAlignment(values[6]);
    }
    
    // Ajouter la face
    if (face) {
      (marking as any).face = face;
    }

    return {
      marking,
      nextIndex: i
    };
  }

  /**
   * Détermine la taille par défaut basée sur le contenu
   */
  private getDefaultSize(text: string): number {
    // Taille adaptative selon le type de texte
    if (text.length <= 3) {
      return 15; // Repères courts (A1, B2, etc.)
    } else if (text.length <= 10) {
      return 12; // Textes moyens
    } else {
      return 10; // Textes longs
    }
  }

  /**
   * Parse le style de police depuis un code numérique
   */
  private parseFontStyle(code: number): string {
    const styles: { [key: number]: string } = {
      0: 'normal',
      1: 'bold',
      2: 'italic',
      3: 'bold-italic',
      4: 'outline',
      5: 'underline'
    };
    
    return styles[Math.floor(code)] || 'normal';
  }

  /**
   * Parse l'alignement depuis un code numérique
   */
  private parseAlignment(code: number): string {
    const alignments: { [key: number]: string } = {
      0: 'left',
      1: 'center',
      2: 'right',
      3: 'top-left',
      4: 'top-center',
      5: 'top-right',
      6: 'bottom-left',
      7: 'bottom-center',
      8: 'bottom-right'
    };
    
    return alignments[Math.floor(code)] || 'left';
  }
  
  /**
   * Convertit les marquages pour compatibilité avec le système de features
   */
  static markingsToFeatures(markings: DSTVMarking[]): any[] {
    return markings.map(marking => ({
      type: 'marking',
      text: marking.text,
      position: [marking.x, marking.y, 0],
      size: marking.size || 10,
      angle: marking.angle || 0,
      face: (marking as any).face || ProfileFace.FRONT,
      depth: (marking as any).depth || 0.5,
      fontStyle: (marking as any).fontStyle || 'normal',
      alignment: (marking as any).alignment || 'left'
    }));
  }
}