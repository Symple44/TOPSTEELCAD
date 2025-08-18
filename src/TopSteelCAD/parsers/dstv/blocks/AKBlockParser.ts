/**
 * AKBlockParser - Parser pour les blocs AK (contours)
 * Gère la détection des découpes vs formes de base
 * Porté depuis l'ancien parser avec logique complète
 */

import { DSTVToken, DSTVCut, ProfileFace, TokenType } from '../types';

/**
 * Parser pour les blocs AK (Aussenkontur - External Contour)
 * Détecte automatiquement si le contour est une forme de base ou une découpe
 */
export class AKBlockParser {
  
  /**
   * Parse les tokens d'un bloc AK
   */
  parse(tokens: DSTVToken[]): DSTVCut[] {
    const cuts: DSTVCut[] = [];
    const points: Array<[number, number]> = [];
    let contourFace: ProfileFace = ProfileFace.FRONT;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || 
          token.type === TokenType.BLOCK_START || 
          token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Traiter les lignes de données avec face
      if (token.type === TokenType.FACE_INDICATOR || this.hasContourData(token)) {
        const point = this.parseContourPoint(token);
        if (point) {
          points.push([point.x, point.y]);
          if (token.face) {
            contourFace = token.face;
          }
        }
      } else if (token.type === TokenType.NUMBER) {
        // Fallback pour parsing simple numérique
        const x = parseFloat(token.value);
        i++;
        if (i < tokens.length && tokens[i].type === TokenType.NUMBER) {
          const y = parseFloat(tokens[i].value);
          points.push([x, y]);
        } else {
          i--; // Reculer si pas de paire
        }
      }
    }
    
    // Analyser le contour pour déterminer s'il s'agit d'une découpe
    if (points.length >= 3) {
      const cutAnalysis = this.analyzeContour(points, contourFace);
      if (cutAnalysis.isCut) {
        cuts.push({
          face: contourFace,
          contour: cutAnalysis.cutRegion || points,
          depth: cutAnalysis.depth,
          isTransverse: cutAnalysis.isTransverse
        });
      }
      // Si ce n'est pas une découpe, c'est la forme de base (ignorée ici)
    }
    
    return cuts;
  }
  
  /**
   * Vérifie si un token contient des données de contour
   */
  private hasContourData(token: DSTVToken): boolean {
    return !!(token as any).values && Array.isArray((token as any).values);
  }
  
  /**
   * Parse un point de contour depuis un token
   */
  private parseContourPoint(token: DSTVToken): { x: number; y: number } | null {
    const values = (token as any).values;
    
    if (!values || values.length < 2) {
      return null;
    }
    
    return {
      x: values[0],
      y: values[1]
    };
  }
  
  /**
   * Analyse un contour pour déterminer s'il s'agit d'une découpe
   * Logique portée depuis l'ancien parser
   */
  private analyzeContour(points: Array<[number, number]>, face: ProfileFace): {
    isCut: boolean;
    cutRegion?: Array<[number, number]>;
    depth?: number;
    isTransverse?: boolean;
  } {
    // Vérifier si le contour est fermé
    const first = points[0];
    const last = points[points.length - 1];
    const isClosed = Math.abs(first[0] - last[0]) < 0.01 && Math.abs(first[1] - last[1]) < 0.01;
    
    // Analyser la forme du contour
    const bounds = this.getContourBounds(points);
    const isRectangular = this.isRectangular(points);
    
    // Cas 1: Contour rectangulaire simple commençant à l'origine = forme de base
    if (isRectangular && Math.abs(bounds.minX) < 1 && Math.abs(bounds.minY) < 1) {
      return { isCut: false };
    }
    
    // Cas 2: Contour avec 9+ points = probablement une encoche/découpe complexe
    if (points.length >= 9) {
      const cutRegion = this.extractCutRegion(points);
      if (cutRegion) {
        return {
          isCut: true,
          cutRegion,
          depth: 10 // Profondeur par défaut
        };
      }
    }
    
    // Cas 3: Contour rectangulaire ne commençant pas à l'origine = découpe
    if (isRectangular && (Math.abs(bounds.minX) > 1 || Math.abs(bounds.minY) > 1)) {
      return {
        isCut: true,
        cutRegion: points,
        depth: 10
      };
    }
    
    // Cas 4: Contour non rectangulaire = découpe complexe
    if (!isRectangular && points.length > 4) {
      return {
        isCut: true,
        cutRegion: points,
        depth: 10
      };
    }
    
    // Par défaut, considérer comme forme de base
    return { isCut: false };
  }
  
  /**
   * Extrait la région de découpe d'un contour complexe
   * Spécialement pour les contours à 9 points (encoches)
   */
  private extractCutRegion(points: Array<[number, number]>): Array<[number, number]> | null {
    if (points.length !== 9) {
      return null;
    }
    
    // Analyser les points pour trouver l'encoche
    const xValues = points.map(p => p[0]);
    const yValues = points.map(p => p[1]);
    
    // Trouver les valeurs X uniques
    const uniqueX = [...new Set(xValues.map(x => Math.round(x)))].sort((a, b) => a - b);
    
    if (uniqueX.length >= 3) {
      // Détecter l'extension (la partie qui dépasse)
      const xMax = Math.max(...xValues);
      const xMain = uniqueX[uniqueX.length - 2]; // Avant-dernière valeur X
      
      if (xMax - xMain > 20) { // Extension significative
        // Trouver les limites Y de l'extension
        const extensionPoints = points.filter(p => p[0] > xMain + 1);
        if (extensionPoints.length >= 2) {
          const extYValues = extensionPoints.map(p => p[1]);
          const extYMin = Math.min(...extYValues);
          const extYMax = Math.max(...extYValues);
          
          // Créer le rectangle de l'encoche
          return [
            [xMain, extYMin],
            [xMax, extYMin],
            [xMax, extYMax],
            [xMain, extYMax],
            [xMain, extYMin]
          ];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(points: Array<[number, number]>): boolean {
    if (points.length !== 5) return false;
    
    // Vérifier que le premier et dernier point sont identiques
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first[0] - last[0]) > 0.01 || Math.abs(first[1] - last[1]) > 0.01) {
      return false;
    }
    
    // Vérifier que les côtés sont parallèles aux axes
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const isHorizontal = Math.abs(p1[1] - p2[1]) < 0.01;
      const isVertical = Math.abs(p1[0] - p2[0]) < 0.01;
      
      if (!isHorizontal && !isVertical) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Obtient les limites d'un contour
   */
  private getContourBounds(points: Array<[number, number]>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    return { minX, maxX, minY, maxY };
  }
}