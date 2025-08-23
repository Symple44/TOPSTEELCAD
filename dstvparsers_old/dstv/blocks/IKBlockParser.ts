/**
 * IKBlockParser - Parser pour les blocs IK (contours internes)
 * Gère les contours internes comme les ouvertures et découpes intérieures
 * Similaire à AK mais pour l'intérieur des profils
 */

import { DSTVToken, DSTVCut, ProfileFace, TokenType } from '../types';

/**
 * Parser pour les blocs IK (Innenkontur - Internal Contour)
 * Traite les contours internes (découpes, ouvertures, etc.)
 */
export class IKBlockParser {
  
  /**
   * Parse les tokens d'un bloc IK
   */
  parse(tokens: DSTVToken[]): DSTVCut[] {
    const cuts: DSTVCut[] = [];
    const points: Array<[number, number]> = [];
    let contourFace: ProfileFace = ProfileFace.FRONT;
    let depth: number = 10; // Profondeur par défaut pour les contours internes
    
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
          // Récupérer la profondeur si présente
          if (point.depth !== undefined) {
            depth = point.depth;
          }
        }
      } else if (token.type === TokenType.NUMBER) {
        // Fallback pour parsing simple numérique
        const x = parseFloat(token.value);
        i++;
        if (i < tokens.length && tokens[i].type === TokenType.NUMBER) {
          const y = parseFloat(tokens[i].value);
          points.push([x, y]);
          // Vérifier si une profondeur suit
          if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.NUMBER) {
            const nextValue = parseFloat(tokens[i + 1].value);
            // Si la valeur semble être une profondeur (généralement < 100)
            if (nextValue > 0 && nextValue < 100) {
              depth = nextValue;
              i++;
            }
          }
        } else {
          i--; // Reculer si pas de paire
        }
      }
    }
    
    // Les contours internes sont toujours des découpes
    if (points.length >= 3) {
      const contourAnalysis = this.analyzeInternalContour(points);
      
      cuts.push({
        face: contourFace,
        contour: points,
        depth: contourAnalysis.depth || depth,
        isTransverse: contourAnalysis.isTransverse,
        isInternal: true // Marquer comme contour interne
      });
    }
    
    return cuts;
  }
  
  /**
   * Vérifie si un token contient des données de contour
   */
  private hasContourData(token: DSTVToken): boolean {
    return !!(token as unknown).values && Array.isArray((token as unknown).values);
  }
  
  /**
   * Parse un point de contour depuis un token
   */
  private parseContourPoint(token: DSTVToken): { x: number; y: number; depth?: number } | null {
    const values = (token as unknown).values;
    
    if (!values || values.length < 2) {
      return null;
    }
    
    return {
      x: values[0],
      y: values[1],
      depth: values[2] // La profondeur peut être le 3ème paramètre
    };
  }
  
  /**
   * Analyse un contour interne pour déterminer ses caractéristiques
   */
  private analyzeInternalContour(points: Array<[number, number]>): {
    depth: number;
    isTransverse: boolean;
    contourType: 'rectangular' | 'circular' | 'oval' | 'irregular';
  } {
    // TODO: Vérifier si le contour est fermé
    // const first = points[0];
    // const last = points[points.length - 1];
    // const isClosed = Math.abs(first[0] - last[0]) < 0.01 && Math.abs(first[1] - last[1]) < 0.01; // TODO: Use for closed contour detection
    
    // Déterminer le type de contour
    const contourType = this.detectContourType(points);
    
    // Calculer la profondeur basée sur la taille du contour
    const bounds = this.getContourBounds(points);
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    
    // Pour les grandes ouvertures, on assume une découpe traversante
    const isTransverse = area > 10000; // Plus de 100x100mm
    
    // Profondeur adaptative selon le type
    let depth = 10; // Par défaut
    if (isTransverse) {
      depth = -1; // Traversant
    } else if (contourType === 'circular' || contourType === 'oval') {
      depth = 15; // Les trous ronds sont souvent plus profonds
    }
    
    return {
      depth,
      isTransverse,
      contourType
    };
  }
  
  /**
   * Détecte le type de contour (rectangulaire, circulaire, etc.)
   */
  private detectContourType(points: Array<[number, number]>): 'rectangular' | 'circular' | 'oval' | 'irregular' {
    const numPoints = points.length;
    
    // Rectangulaire : 5 points (4 coins + fermeture)
    if (numPoints === 5 && this.isRectangular(points)) {
      return 'rectangular';
    }
    
    // Circulaire : beaucoup de points régulièrement espacés
    if (numPoints > 12 && this.isCircular(points)) {
      return 'circular';
    }
    
    // Ovale : beaucoup de points mais pas circulaire
    if (numPoints > 12 && this.isOval(points)) {
      return 'oval';
    }
    
    // Irrégulier pour le reste
    return 'irregular';
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
   * Vérifie si un contour est circulaire
   */
  private isCircular(points: Array<[number, number]>): boolean {
    if (points.length < 12) return false;
    
    // Calculer le centre
    const center = this.getContourCenter(points);
    
    // Calculer les distances au centre
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p[0] - center.x, 2) + Math.pow(p[1] - center.y, 2))
    );
    
    // Vérifier que toutes les distances sont similaires (tolérance 5%)
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgDistance)));
    
    return maxDeviation < avgDistance * 0.05;
  }
  
  /**
   * Vérifie si un contour est ovale
   */
  private isOval(points: Array<[number, number]>): boolean {
    if (points.length < 12) return false;
    
    // Un ovale a deux axes de symétrie
    const bounds = this.getContourBounds(points);
    const aspectRatio = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
    
    // Un ovale a un rapport d'aspect différent de 1 mais pas trop extrême
    return aspectRatio > 1.2 && aspectRatio < 3.0;
  }
  
  /**
   * Calcule le centre d'un contour
   */
  private getContourCenter(points: Array<[number, number]>): { x: number; y: number } {
    const sumX = points.reduce((sum, p) => sum + p[0], 0);
    const sumY = points.reduce((sum, p) => sum + p[1], 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
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
// Export par défaut pour compatibilité ES modules
export default IKBlockParser;
