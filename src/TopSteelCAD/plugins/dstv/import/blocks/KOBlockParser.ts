/**
 * Parser pour le bloc KO (Contour marking) - Marquage de contour DSTV
 * 
 * Selon la norme DSTV 7ème édition, le bloc KO définit un marquage suivant un contour
 * ou une trajectoire spécifique sur la pièce.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Point de marquage avec type optionnel
 */
export interface MarkingPoint {
  x: number;
  y: number;
  type?: 'line' | 'arc' | 'move'; // Type de trajectoire vers ce point
  bulge?: number;                 // Pour arcs circulaires (tangente de l'angle/4)
}

/**
 * Structure des données du bloc KO
 */
export interface KOBlockData {
  points: MarkingPoint[];         // Points du contour de marquage
  closed?: boolean;              // Indique si le contour est fermé
  depth?: number;               // Profondeur de marquage (optionnel)
  workPlane?: string;          // Plan de travail (E0-E9, optionnel)
  markingType?: 'scribe' | 'engrave' | 'paint'; // Type de marquage
  toolNumber?: number;         // Numéro d'outil (optionnel)
  feedRate?: number;          // Vitesse d'avance (optionnel)
}

/**
 * Parser pour le bloc KO (Contour marking)
 */
export class KOBlockParser extends BaseStage<string[], KOBlockData> {
  readonly name = 'ko-block-parser';
  readonly description = 'Parses DSTV KO (Contour marking) block according to official standard';

  /**
   * Parse un bloc KO
   */
  async process(input: string[]): Promise<KOBlockData> {
    if (input.length < 4) { // Au minimum 2 points (4 coordonnées)
      throw new Error('KO block requires at least 4 fields (2 points minimum)');
    }

    // Extraire les points du contour
    const points = this.extractMarkingPoints(input);
    
    if (points.length < 2) {
      throw new Error('KO block must contain at least 2 points');
    }

    const data: KOBlockData = {
      points,
      markingType: 'scribe' // Type par défaut
    };

    // Analyser les paramètres optionnels dans les derniers champs
    this.parseOptionalParameters(input, data, points.length * 2);

    // Déterminer si le contour est fermé (premier et dernier points identiques)
    data.closed = this.isContourClosed(points);

    return data;
  }

  /**
   * Extrait les points de marquage du tableau d'entrée
   */
  private extractMarkingPoints(input: string[]): MarkingPoint[] {
    const points: MarkingPoint[] = [];
    
    // Parcourir par paires de coordonnées
    for (let i = 0; i < input.length - 1; i += 2) {
      const xStr = input[i];
      const yStr = input[i + 1];
      
      // Arrêter si on arrive aux paramètres optionnels (non numériques)
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      
      if (isNaN(x) || isNaN(y)) {
        break; // Fin des coordonnées, début des paramètres optionnels
      }
      
      const point: MarkingPoint = { x, y };
      
      // Détecter les paramètres de trajectoire (extensions non-standard)
      if (input[i + 2] && this.isTrajectoryParameter(input[i + 2])) {
        this.parseTrajectoryParameter(point, input[i + 2]);
        i++; // Passer le paramètre de trajectoire
      }
      
      points.push(point);
    }
    
    return points;
  }

  /**
   * Parse les paramètres optionnels
   */
  private parseOptionalParameters(input: string[], data: KOBlockData, startIndex: number): void {
    for (let i = startIndex; i < input.length; i++) {
      const param = input[i].trim();
      
      if (!param) continue;
      
      try {
        // Essayer de parser comme nombre pour profondeur, vitesse, etc.
        const numValue = parseFloat(param);
        if (!isNaN(numValue)) {
          if (data.depth === undefined && numValue > 0 && numValue < 10) {
            data.depth = numValue; // Première valeur positive < 10mm = profondeur
          } else if (data.feedRate === undefined && numValue > 10) {
            data.feedRate = numValue; // Valeur > 10 = vitesse d'avance
          } else if (data.toolNumber === undefined && Number.isInteger(numValue) && numValue > 0) {
            data.toolNumber = numValue; // Entier positif = numéro d'outil
          }
          continue;
        }
        
        // Parser les paramètres textuels
        const upperParam = param.toUpperCase();
        
        // Plan de travail
        if (/^E[0-9]$/.test(upperParam)) {
          data.workPlane = upperParam;
          continue;
        }
        
        // Type de marquage
        if (['SCRIBE', 'ENGRAVE', 'PAINT'].includes(upperParam)) {
          data.markingType = upperParam.toLowerCase() as any;
          continue;
        }
        
      } catch (error) {
        console.warn(`Warning parsing KO parameter: ${param}`, error);
      }
    }
  }

  /**
   * Vérifie si un paramètre définit une trajectoire
   */
  private isTrajectoryParameter(param: string): boolean {
    const upperParam = param.toUpperCase();
    return ['ARC', 'LINE', 'MOVE'].includes(upperParam) || 
           (param.startsWith('B') && !isNaN(parseFloat(param.substring(1))));
  }

  /**
   * Parse un paramètre de trajectoire
   */
  private parseTrajectoryParameter(point: MarkingPoint, param: string): void {
    const upperParam = param.toUpperCase();
    
    if (upperParam === 'ARC') {
      point.type = 'arc';
    } else if (upperParam === 'LINE') {
      point.type = 'line';
    } else if (upperParam === 'MOVE') {
      point.type = 'move';
    } else if (param.startsWith('B') || param.startsWith('b')) {
      // Bulge factor pour arcs (format AutoCAD DXF)
      const bulge = parseFloat(param.substring(1));
      if (!isNaN(bulge)) {
        point.type = 'arc';
        point.bulge = bulge;
      }
    }
  }

  /**
   * Vérifie si le contour est fermé
   */
  private isContourClosed(points: MarkingPoint[]): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    const tolerance = 0.01; // 0.01mm de tolérance
    return Math.abs(first.x - last.x) < tolerance && 
           Math.abs(first.y - last.y) < tolerance;
  }

  /**
   * Valide les données du bloc KO
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const data = await this.process(input);

      // Validation des points
      if (!data.points || data.points.length < 2) {
        errors.push('KO block must contain at least 2 points');
      }

      // Validation de chaque point
      for (let i = 0; i < data.points.length; i++) {
        const point = data.points[i];
        
        if (isNaN(point.x) || isNaN(point.y)) {
          errors.push(`Point ${i + 1} has invalid coordinates`);
        }
        
        if (point.bulge !== undefined && (point.bulge < -1 || point.bulge > 1)) {
          warnings.push(`Point ${i + 1} has unusual bulge value: ${point.bulge}`);
        }
      }

      // Validation des paramètres optionnels
      if (data.depth !== undefined) {
        if (data.depth <= 0) {
          errors.push('Marking depth must be positive');
        }
        if (data.depth > 5) { // 5mm semble excessif pour un marquage
          warnings.push(`Very deep marking: ${data.depth}mm`);
        }
      }

      if (data.feedRate !== undefined) {
        if (data.feedRate <= 0) {
          warnings.push('Feed rate should be positive');
        }
        if (data.feedRate > 10000) { // 10m/min semble très rapide
          warnings.push(`Very high feed rate: ${data.feedRate}mm/min`);
        }
      }

      if (data.workPlane !== undefined) {
        if (!/^E[0-9]$/.test(data.workPlane)) {
          errors.push(`Invalid work plane: ${data.workPlane} (must be E0-E9)`);
        }
      }

      if (data.toolNumber !== undefined) {
        if (data.toolNumber <= 0 || data.toolNumber > 999) {
          warnings.push(`Tool number ${data.toolNumber} is outside typical range 1-999`);
        }
      }

      // Validation de la géométrie
      if (data.points.length > 1) {
        const totalLength = this.calculateContourLength(data.points);
        if (totalLength < 1) { // Moins de 1mm
          warnings.push('Very short marking contour');
        }
        if (totalLength > 10000) { // Plus de 10m
          warnings.push('Very long marking contour');
        }
      }

      // Vérification des segments dégénérés
      for (let i = 1; i < data.points.length; i++) {
        const prev = data.points[i - 1];
        const curr = data.points[i];
        const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        
        if (distance < 0.01) { // Points trop proches
          warnings.push(`Points ${i} and ${i + 1} are very close (${distance.toFixed(3)}mm)`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data
      };
    } catch (error) {
      errors.push(`Failed to parse KO block: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Calcule la longueur approximative du contour
   */
  private calculateContourLength(points: MarkingPoint[]): number {
    let length = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      if (curr.type === 'arc' && curr.bulge !== undefined) {
        // Calcul approximatif pour arc
        const chord = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        const arcLength = chord * (1 + Math.abs(curr.bulge) / 3); // Approximation
        length += arcLength;
      } else {
        // Segment linéaire
        length += Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      }
    }
    
    return length;
  }

  /**
   * Convertit les données KO vers le format standardisé
   */
  convertToStandardFormat(data: KOBlockData): {
    type: 'contour_marking';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    // Calculer le centre du contour
    const centerX = data.points.reduce((sum, p) => sum + p.x, 0) / data.points.length;
    const centerY = data.points.reduce((sum, p) => sum + p.y, 0) / data.points.length;
    
    return {
      type: 'contour_marking',
      coordinates: {
        x: centerX,
        y: centerY,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        points: data.points,
        closed: data.closed || false,
        depth: data.depth || 0.1,
        markingType: data.markingType || 'scribe',
        workPlane: data.workPlane || 'E0',
        toolNumber: data.toolNumber,
        feedRate: data.feedRate,
        totalLength: this.calculateContourLength(data.points)
      }
    };
  }
}