/**
 * Parser pour le bloc UE (Unrestricted contour) - Contour libre DSTV
 * 
 * Selon la norme DSTV 7ème édition, le bloc UE définit un contour libre pouvant contenir
 * des segments linéaires, des arcs circulaires et des courbes complexes.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Types de segments pour contour libre
 */
export type SegmentType = 'line' | 'arc' | 'bezier' | 'spline';

/**
 * Point de contour avec informations étendues
 */
export interface ContourPoint {
  x: number;
  y: number;
  segmentType?: SegmentType;    // Type du segment vers ce point
  radius?: number;              // Rayon pour arcs circulaires
  centerX?: number;             // Centre X pour arcs
  centerY?: number;             // Centre Y pour arcs
  bulge?: number;               // Facteur de courbure (AutoCAD style)
  controlX1?: number;           // Point de contrôle 1 pour courbes Bézier
  controlY1?: number;
  controlX2?: number;           // Point de contrôle 2 pour courbes Bézier
  controlY2?: number;
  tension?: number;             // Tension pour splines
}

/**
 * Structure des données du bloc UE
 */
export interface UEBlockData {
  points: ContourPoint[];       // Points du contour libre
  closed?: boolean;            // Indique si le contour est fermé
  contourType?: 'outer' | 'inner' | 'feature'; // Type de contour
  workPlane?: string;          // Plan de travail (E0-E9, optionnel)
  tolerance?: number;          // Tolérance d'usinage (optionnel)
  finishing?: 'rough' | 'semi' | 'finish'; // Type de finition
  toolCompensation?: 'left' | 'right' | 'none'; // Compensation d'outil
  feedRate?: number;           // Vitesse d'avance (optionnel)
  spindleSpeed?: number;       // Vitesse de broche (optionnel)
}

/**
 * Parser pour le bloc UE (Unrestricted contour)
 */
export class UEBlockParser extends BaseStage<string[], UEBlockData> {
  readonly name = 'ue-block-parser';
  readonly description = 'Parses DSTV UE (Unrestricted contour) block according to official standard';

  /**
   * Parse un bloc UE
   */
  async process(input: string[]): Promise<UEBlockData> {
    if (input.length < 4) { // Au minimum 2 points (4 coordonnées)
      throw new Error('UE block requires at least 4 fields (2 points minimum)');
    }

    // Parser les points du contour avec leurs segments
    const parseResult = this.parseContourData(input);
    
    const data: UEBlockData = {
      points: parseResult.points,
      contourType: 'feature' // Type par défaut
    };

    // Parser les paramètres optionnels
    this.parseOptionalParameters(input, data, parseResult.endIndex);

    // Déterminer si le contour est fermé
    data.closed = this.isContourClosed(data.points);

    return data;
  }

  /**
   * Parse les données de contour complexes
   */
  private parseContourData(input: string[]): { points: ContourPoint[]; endIndex: number } {
    const points: ContourPoint[] = [];
    let i = 0;

    while (i < input.length - 1) {
      const token = input[i];
      
      // Vérifier si c'est une coordonnée
      const x = parseFloat(token);
      if (isNaN(x)) break;
      
      const y = parseFloat(input[i + 1]);
      if (isNaN(y)) break;
      
      const point: ContourPoint = { x, y };
      i += 2;

      // Parser les paramètres de segment qui suivent
      while (i < input.length && this.parseSegmentParameter(input[i], point)) {
        i++;
      }

      points.push(point);
    }

    return { points, endIndex: i };
  }

  /**
   * Parse un paramètre de segment
   */
  private parseSegmentParameter(param: string, point: ContourPoint): boolean {
    const upperParam = param.toUpperCase();
    
    try {
      // Type de segment
      if (upperParam === 'LINE' || upperParam === 'L') {
        point.segmentType = 'line';
        return true;
      }
      
      if (upperParam === 'ARC' || upperParam === 'A') {
        point.segmentType = 'arc';
        return true;
      }
      
      if (upperParam === 'BEZIER' || upperParam === 'B') {
        point.segmentType = 'bezier';
        return true;
      }
      
      if (upperParam === 'SPLINE' || upperParam === 'S') {
        point.segmentType = 'spline';
        return true;
      }

      // Paramètres numériques avec préfixes
      if (param.startsWith('R') || param.startsWith('r')) {
        // Rayon: R12.5
        const radius = parseFloat(param.substring(1));
        if (!isNaN(radius) && radius > 0) {
          point.radius = radius;
          point.segmentType = 'arc';
          return true;
        }
      }

      if (param.startsWith('CX') || param.startsWith('cx')) {
        // Centre X: CX100.5
        const centerX = parseFloat(param.substring(2));
        if (!isNaN(centerX)) {
          point.centerX = centerX;
          point.segmentType = 'arc';
          return true;
        }
      }

      if (param.startsWith('CY') || param.startsWith('cy')) {
        // Centre Y: CY200.5
        const centerY = parseFloat(param.substring(2));
        if (!isNaN(centerY)) {
          point.centerY = centerY;
          point.segmentType = 'arc';
          return true;
        }
      }

      if (param.startsWith('B') && param.length > 1) {
        // Bulge factor: B0.5
        const bulge = parseFloat(param.substring(1));
        if (!isNaN(bulge)) {
          point.bulge = bulge;
          point.segmentType = 'arc';
          return true;
        }
      }

      if (param.startsWith('T') && param.length > 1) {
        // Tension pour spline: T0.8
        const tension = parseFloat(param.substring(1));
        if (!isNaN(tension) && tension >= 0 && tension <= 1) {
          point.tension = tension;
          point.segmentType = 'spline';
          return true;
        }
      }

      // Points de contrôle Bézier (format étendu)
      if (param.startsWith('C1X')) {
        const controlX1 = parseFloat(param.substring(3));
        if (!isNaN(controlX1)) {
          point.controlX1 = controlX1;
          point.segmentType = 'bezier';
          return true;
        }
      }

      if (param.startsWith('C1Y')) {
        const controlY1 = parseFloat(param.substring(3));
        if (!isNaN(controlY1)) {
          point.controlY1 = controlY1;
          point.segmentType = 'bezier';
          return true;
        }
      }

      if (param.startsWith('C2X')) {
        const controlX2 = parseFloat(param.substring(3));
        if (!isNaN(controlX2)) {
          point.controlX2 = controlX2;
          point.segmentType = 'bezier';
          return true;
        }
      }

      if (param.startsWith('C2Y')) {
        const controlY2 = parseFloat(param.substring(3));
        if (!isNaN(controlY2)) {
          point.controlY2 = controlY2;
          point.segmentType = 'bezier';
          return true;
        }
      }

    } catch (error) {
      console.warn(`Warning parsing UE segment parameter: ${param}`, error);
    }

    return false; // Paramètre non reconnu comme segment
  }

  /**
   * Parse les paramètres optionnels du bloc
   */
  private parseOptionalParameters(input: string[], data: UEBlockData, startIndex: number): void {
    for (let i = startIndex; i < input.length; i++) {
      const param = input[i].trim();
      if (!param) continue;

      try {
        const upperParam = param.toUpperCase();

        // Plan de travail
        if (/^E[0-9]$/.test(upperParam)) {
          data.workPlane = upperParam;
          continue;
        }

        // Type de contour
        if (['OUTER', 'INNER', 'FEATURE'].includes(upperParam)) {
          data.contourType = upperParam.toLowerCase() as any;
          continue;
        }

        // Type de finition
        if (['ROUGH', 'SEMI', 'FINISH'].includes(upperParam)) {
          data.finishing = upperParam.toLowerCase() as any;
          continue;
        }

        // Compensation d'outil
        if (['LEFT', 'RIGHT', 'NONE'].includes(upperParam)) {
          data.toolCompensation = upperParam.toLowerCase() as any;
          continue;
        }

        // Paramètres numériques
        const numValue = parseFloat(param);
        if (!isNaN(numValue)) {
          // Heuristiques pour déterminer le type de valeur
          if (numValue > 0 && numValue < 1 && data.tolerance === undefined) {
            data.tolerance = numValue; // Valeurs < 1 = tolérance
          } else if (numValue >= 1 && numValue <= 10000 && data.feedRate === undefined) {
            data.feedRate = numValue; // Valeurs moyennes = vitesse d'avance
          } else if (numValue > 10000 && data.spindleSpeed === undefined) {
            data.spindleSpeed = numValue; // Valeurs élevées = vitesse de broche
          }
        }

      } catch (error) {
        console.warn(`Warning parsing UE parameter: ${param}`, error);
      }
    }

    // Valeurs par défaut
    if (data.workPlane === undefined) {
      data.workPlane = 'E0';
    }
    
    if (data.finishing === undefined) {
      data.finishing = 'finish';
    }
    
    if (data.toolCompensation === undefined) {
      data.toolCompensation = 'none';
    }
  }

  /**
   * Vérifie si le contour est fermé
   */
  private isContourClosed(points: ContourPoint[]): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    const tolerance = 0.01; // 0.01mm de tolérance
    return Math.abs(first.x - last.x) < tolerance && 
           Math.abs(first.y - last.y) < tolerance;
  }

  /**
   * Valide les données du bloc UE
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const data = input as any as UEBlockData;
    if (!data || typeof data !== 'object') {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Validation des points
    if (!data.points || data.points.length < 2) {
      errors.push('UE block must contain at least 2 points');
    }

    // Validation de chaque point et ses paramètres de segment
    for (let i = 0; i < data.points.length; i++) {
      const point = data.points[i];
      
      if (isNaN(point.x) || isNaN(point.y)) {
        errors.push(`Point ${i + 1} has invalid coordinates`);
      }

      // Validation des paramètres d'arc
      if (point.segmentType === 'arc') {
        if (point.radius !== undefined && point.radius <= 0) {
          errors.push(`Point ${i + 1}: Arc radius must be positive`);
        }
        
        if (point.bulge !== undefined && Math.abs(point.bulge) > 10) {
          warnings.push(`Point ${i + 1}: Unusual bulge value ${point.bulge}`);
        }
        
        // Vérifier cohérence centre/rayon
        if (point.centerX !== undefined && point.centerY !== undefined && point.radius !== undefined) {
          const calculatedRadius = Math.sqrt(
            Math.pow(point.x - point.centerX, 2) + 
            Math.pow(point.y - point.centerY, 2)
          );
          const tolerance = 0.01;
          
          if (Math.abs(calculatedRadius - point.radius) > tolerance) {
            warnings.push(`Point ${i + 1}: Inconsistent arc center/radius definition`);
          }
        }
      }

      // Validation des courbes Bézier
      if (point.segmentType === 'bezier') {
        const hasControl1 = point.controlX1 !== undefined && point.controlY1 !== undefined;
        const hasControl2 = point.controlX2 !== undefined && point.controlY2 !== undefined;
        
        if (!hasControl1 && !hasControl2) {
          warnings.push(`Point ${i + 1}: Bezier curve without control points`);
        }
      }

      // Validation des splines
      if (point.segmentType === 'spline') {
        if (point.tension !== undefined && (point.tension < 0 || point.tension > 1)) {
          errors.push(`Point ${i + 1}: Spline tension must be between 0 and 1`);
        }
      }
    }

    // Validation des paramètres globaux
    if (data.tolerance !== undefined) {
      if (data.tolerance <= 0) {
        errors.push('Tolerance must be positive');
      }
      if (data.tolerance > 1) {
        warnings.push(`Large tolerance value: ${data.tolerance}mm`);
      }
    }

    if (data.feedRate !== undefined) {
      if (data.feedRate <= 0) {
        warnings.push('Feed rate should be positive');
      }
      if (data.feedRate > 50000) {
        warnings.push(`Very high feed rate: ${data.feedRate}mm/min`);
      }
    }

    if (data.spindleSpeed !== undefined) {
      if (data.spindleSpeed <= 0) {
        warnings.push('Spindle speed should be positive');
      }
      if (data.spindleSpeed > 30000) {
        warnings.push(`Very high spindle speed: ${data.spindleSpeed}rpm`);
      }
    }

    if (data.workPlane && !/^E[0-9]$/.test(data.workPlane)) {
      errors.push(`Invalid work plane: ${data.workPlane} (must be E0-E9)`);
    }

    // Validation de la complexité géométrique
    const totalLength = this.calculateContourLength(data.points);
    if (totalLength < 1) {
      warnings.push('Very short contour');
    }
    if (totalLength > 50000) {
      warnings.push('Very long contour');
    }

    const complexSegments = data.points.filter(p => 
      p.segmentType === 'bezier' || p.segmentType === 'spline'
    ).length;
    
    if (complexSegments > data.points.length / 2) {
      warnings.push('High proportion of complex curve segments');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calcule la longueur approximative du contour
   */
  private calculateContourLength(points: ContourPoint[]): number {
    let length = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      const segmentLength = this.calculateSegmentLength(prev, curr);
      length += segmentLength;
    }
    
    return length;
  }

  /**
   * Calcule la longueur d'un segment
   */
  private calculateSegmentLength(start: ContourPoint, end: ContourPoint): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const straightDistance = Math.sqrt(dx * dx + dy * dy);
    
    switch (end.segmentType) {
      case 'arc':
        if (end.radius) {
          // Calcul de l'arc basé sur le rayon et les points
          const chord = straightDistance;
          const radius = end.radius;
          const centralAngle = 2 * Math.asin(Math.min(1, chord / (2 * radius)));
          return radius * centralAngle;
        }
        if (end.bulge !== undefined) {
          // Calcul basé sur le facteur de courbure
          const arcFactor = 1 + Math.abs(end.bulge);
          return straightDistance * arcFactor;
        }
        return straightDistance * 1.2; // Approximation conservative
        
      case 'bezier':
        // Approximation pour courbe de Bézier
        return straightDistance * 1.3;
        
      case 'spline': {
        // Approximation pour spline
        const tension = end.tension || 0.5;
        return straightDistance * (1 + tension * 0.5);
      }
        
      default:
        return straightDistance;
    }
  }

  /**
   * Convertit les données UE vers le format standardisé
   */
  convertToStandardFormat(data: UEBlockData): {
    type: 'unrestricted_contour';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    // Calculer le centre du contour
    const centerX = data.points.reduce((sum, p) => sum + p.x, 0) / data.points.length;
    const centerY = data.points.reduce((sum, p) => sum + p.y, 0) / data.points.length;
    
    return {
      type: 'unrestricted_contour',
      coordinates: {
        x: centerX,
        y: centerY,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        points: data.points,
        closed: data.closed || false,
        contourType: data.contourType || 'feature',
        workPlane: data.workPlane || 'E0',
        tolerance: data.tolerance,
        finishing: data.finishing || 'finish',
        toolCompensation: data.toolCompensation || 'none',
        feedRate: data.feedRate,
        spindleSpeed: data.spindleSpeed,
        totalLength: this.calculateContourLength(data.points),
        segmentTypes: [...new Set(data.points.map(p => p.segmentType).filter(Boolean))],
        complexity: this.assessComplexity(data.points)
      }
    };
  }

  /**
   * Évalue la complexité du contour
   */
  private assessComplexity(points: ContourPoint[]): 'simple' | 'moderate' | 'complex' {
    const complexSegments = points.filter(p => 
      p.segmentType === 'bezier' || p.segmentType === 'spline'
    ).length;
    
    const arcSegments = points.filter(p => p.segmentType === 'arc').length;
    
    if (complexSegments > points.length * 0.3) {
      return 'complex';
    } else if (arcSegments > points.length * 0.5 || complexSegments > 0) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }
}