/**
 * SCBlockParser - Parser pour les blocs SC (Schnitt - Cut)
 * Gère les coupes et sections dans les profils
 * Supporte les coupes droites, obliques et complexes
 */

import { DSTVToken, DSTVCut, ProfileFace, TokenType } from '../types';

/**
 * Parser pour les blocs SC (Schnitt - Cut/Section)
 * Traite les coupes et sections dans les profils
 */
export class SCBlockParser {
  
  /**
   * Parse les tokens d'un bloc SC
   */
  parse(tokens: DSTVToken[]): DSTVCut[] {
    const cuts: DSTVCut[] = [];
    
    let currentCut: Partial<DSTVCut> | null = null;
    let cutType: 'straight' | 'oblique' | 'curved' = 'straight';
    let cutAngle: number = 90; // Angle de coupe par défaut (perpendiculaire)
    let cutFace: ProfileFace = ProfileFace.FRONT;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || 
          token.type === TokenType.BLOCK_START || 
          token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Traiter les données de coupe
      if (this.hasCutData(token)) {
        const cutData = this.parseCutData(token);
        if (cutData) {
          // Créer une nouvelle coupe avec les données parsées
          const cut = this.createCut(cutData);
          if (cut) {
            cuts.push(cut);
          }
        }
      } else if (token.type === TokenType.FACE_INDICATOR) {
        // Mise à jour de la face courante
        if (token.face) {
          cutFace = token.face;
        }
      } else if (token.type === TokenType.NUMBER) {
        // Parser les valeurs numériques pour une coupe simple
        const values = this.parseNumericSequence(tokens, i);
        if (values.length >= 2) {
          // Créer une coupe simple avec les coordonnées
          const cut = this.createSimpleCut(values, cutFace);
          if (cut) {
            cuts.push(cut);
          }
          i += values.length - 1; // Avancer l'index
        }
      }
    }
    
    return cuts;
  }
  
  /**
   * Vérifie si un token contient des données de coupe
   */
  private hasCutData(token: DSTVToken): boolean {
    return !!(token as any).values && Array.isArray((token as any).values);
  }
  
  /**
   * Parse les données de coupe depuis un token
   */
  private parseCutData(token: DSTVToken): {
    position: [number, number];
    angle?: number;
    depth?: number;
    width?: number;
    face?: ProfileFace;
  } | null {
    const values = (token as any).values;
    
    if (!values || values.length < 2) {
      return null;
    }
    
    const data: any = {
      position: [values[0], values[1]]
    };
    
    // Paramètres optionnels
    if (values.length > 2) {
      data.angle = values[2]; // Angle de coupe
    }
    if (values.length > 3) {
      data.depth = values[3]; // Profondeur de coupe
    }
    if (values.length > 4) {
      data.width = values[4]; // Largeur de coupe
    }
    
    // Face depuis le token
    if (token.face) {
      data.face = token.face;
    }
    
    return data;
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
      } else {
        break;
      }
    }
    
    return values;
  }
  
  /**
   * Crée une coupe à partir des données parsées
   */
  private createCut(data: {
    position: [number, number];
    angle?: number;
    depth?: number;
    width?: number;
    face?: ProfileFace;
  }): DSTVCut {
    const angle = data.angle || 90;
    const depth = data.depth || -1; // -1 = traversant
    const width = data.width || 10; // Largeur par défaut
    
    // Calculer le contour de la coupe basé sur l'angle
    const contour = this.calculateCutContour(
      data.position,
      angle,
      width,
      depth
    );
    
    return {
      face: data.face || ProfileFace.FRONT,
      contour,
      depth,
      isTransverse: depth === -1,
      angle,
      cutType: this.determineCutType(angle)
    };
  }
  
  /**
   * Crée une coupe simple à partir de coordonnées
   */
  private createSimpleCut(values: number[], face: ProfileFace): DSTVCut | null {
    if (values.length < 2) {
      return null;
    }
    
    // Pour une coupe simple, on crée une ligne de coupe
    const x = values[0];
    const y = values[1];
    
    // Largeur et angle optionnels
    const width = values[2] || 10;
    const angle = values[3] || 90;
    const depth = values[4] || -1;
    
    // Créer le contour comme une ligne de coupe
    const contour = this.createLineCutContour(x, y, width, angle);
    
    return {
      face,
      contour,
      depth,
      isTransverse: depth === -1,
      angle,
      cutType: this.determineCutType(angle)
    };
  }
  
  /**
   * Calcule le contour d'une coupe basé sur ses paramètres
   */
  private calculateCutContour(
    position: [number, number],
    angle: number,
    width: number,
    depth: number
  ): Array<[number, number]> {
    const [x, y] = position;
    
    // Convertir l'angle en radians
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculer les points du contour de coupe
    const halfWidth = width / 2;
    
    // Direction perpendiculaire à la coupe
    const perpX = Math.cos(angleRad + Math.PI / 2);
    const perpY = Math.sin(angleRad + Math.PI / 2);
    
    // Direction de la coupe
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);
    
    // Longueur de la coupe (basée sur la profondeur ou une valeur par défaut)
    const length = depth > 0 ? depth : 100;
    
    // Points du contour rectangulaire de la coupe
    const contour: Array<[number, number]> = [
      [x - perpX * halfWidth, y - perpY * halfWidth],
      [x + perpX * halfWidth, y + perpY * halfWidth],
      [x + perpX * halfWidth + dirX * length, y + perpY * halfWidth + dirY * length],
      [x - perpX * halfWidth + dirX * length, y - perpY * halfWidth + dirY * length],
      [x - perpX * halfWidth, y - perpY * halfWidth] // Fermer le contour
    ];
    
    return contour;
  }
  
  /**
   * Crée un contour de ligne de coupe
   */
  private createLineCutContour(
    x: number,
    y: number,
    width: number,
    angle: number
  ): Array<[number, number]> {
    // Pour une ligne de coupe, on crée un rectangle très fin
    const angleRad = (angle * Math.PI) / 180;
    const halfWidth = width / 2;
    
    // Direction perpendiculaire
    const perpX = Math.cos(angleRad + Math.PI / 2);
    const perpY = Math.sin(angleRad + Math.PI / 2);
    
    // Créer un rectangle fin représentant la ligne de coupe
    const thickness = 2; // Épaisseur de la ligne
    const contour: Array<[number, number]> = [
      [x - perpX * halfWidth, y - perpY * halfWidth],
      [x + perpX * halfWidth, y + perpY * halfWidth],
      [x + perpX * halfWidth, y + perpY * halfWidth + thickness],
      [x - perpX * halfWidth, y - perpY * halfWidth + thickness],
      [x - perpX * halfWidth, y - perpY * halfWidth]
    ];
    
    return contour;
  }
  
  /**
   * Détermine le type de coupe basé sur l'angle
   */
  private determineCutType(angle: number): 'straight' | 'oblique' | 'curved' {
    // Normaliser l'angle entre 0 et 360
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    // Coupe droite : angle de 90° ou 270° (perpendiculaire)
    if (Math.abs(normalizedAngle - 90) < 1 || Math.abs(normalizedAngle - 270) < 1) {
      return 'straight';
    }
    
    // Coupe horizontale : angle de 0° ou 180°
    if (Math.abs(normalizedAngle) < 1 || Math.abs(normalizedAngle - 180) < 1) {
      return 'straight';
    }
    
    // Toute autre angle est une coupe oblique
    return 'oblique';
  }
}