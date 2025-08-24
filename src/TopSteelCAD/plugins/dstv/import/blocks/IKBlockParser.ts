/**
 * Parser pour le bloc IK (Inner contour/Innenkontur) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Gère les contours internes (découpes, ouvertures, etc.) selon la norme DSTV.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { StandardFace } from '../../../../core/coordinates/types';

/**
 * Point 2D pour contours internes
 */
interface Point2D {
  x: number;
  y: number;
}

/**
 * Types de contours internes détectés
 */
export type InternalContourType = 'rectangular' | 'circular' | 'oval' | 'irregular';

/**
 * Structure des données d'un contour IK
 */
export interface IKBlockData {
  points: Point2D[];                    // Points du contour intérieur
  contourType: InternalContourType;     // Type de contour détecté
  face?: StandardFace | undefined;                        // Face d'application
  depth?: number;                       // Profondeur de la découpe
  isTransverse?: boolean;               // Découpe traversante
  closed?: boolean;                     // Contour fermé
  workPlane?: string;                   // Plan de travail (E0-E9)
}

/**
 * Parser pour le bloc IK - Version moderne intégrée
 */
export class IKBlockParser extends BaseStage<string[], IKBlockData> {
  readonly name = 'ik-block-parser';
  readonly description = 'Parses DSTV IK (Inner contour) block according to official standard';

  /**
   * Parse un bloc IK moderne
   */
  async process(input: string[]): Promise<IKBlockData> {
    if (input.length < 6) { // Au minimum 3 points (6 coordonnées)
      throw new Error('IK block requires at least 6 fields (3 points minimum)');
    }

    this.log(undefined as any, 'debug', `Parsing IK block with ${input.length} fields`);

    const points: Point2D[] = [];
    let face: StandardFace | undefined = undefined;
    let depth = 10; // Profondeur par défaut pour contours internes

    // Détecter le format et parser
    if (this.isLegacyFormat(input)) {
      const parsed = this.parseLegacyFormat(input);
      points.push(...parsed.points);
      face = parsed.face;
      depth = parsed.depth;
    } else {
      points.push(...this.parseStandardFormat(input));
      
      // Chercher la profondeur dans les champs supplémentaires
      const extraFields = input.slice(points.length * 2);
      for (const field of extraFields) {
        const num = parseFloat(field);
        if (!isNaN(num) && num > 0 && num < 100) {
          depth = num;
          break;
        }
      }
    }

    // Analyser le contour
    const analysis = this.analyzeInternalContour(points);
    
    const data: IKBlockData = {
      points,
      contourType: analysis.contourType,
      face,
      depth: analysis.depth || depth,
      isTransverse: analysis.isTransverse,
      closed: this.isContourClosed(points)
    };

    this.log(undefined as any, 'debug', 
      `Parsed IK contour: ${analysis.contourType} with ${points.length} points, depth=${data.depth}mm`
    );

    return data;
  }

  /**
   * Détecte si c'est le format legacy
   */
  private isLegacyFormat(input: string[]): boolean {
    return input.some(field => {
      const trimmed = field.trim().toLowerCase();
      return /^[hvuo]/.test(trimmed) && /\d/.test(field);
    });
  }

  /**
   * Parse le format legacy avec indicateurs de face
   */
  private parseLegacyFormat(input: string[]): { points: Point2D[]; face: StandardFace | undefined; depth: number } {
    const points: Point2D[] = [];
    let face: StandardFace | undefined = undefined;
    let depth = 10;

    for (const field of input) {
      const trimmed = field.trim();
      
      if (this.containsFaceIndicator(trimmed)) {
        const faceChar = trimmed.charAt(0).toLowerCase();
        face = this.mapFaceIndicator(faceChar);
        
        // Extraire les coordonnées et profondeur
        const numbers = this.extractNumbers(trimmed.substring(1));
        
        if (numbers.length >= 2) {
          points.push({ x: numbers[0], y: numbers[1] });
          if (numbers[2] !== undefined) {
            depth = numbers[2];
          }
        }
      }
    }

    return { points, face, depth };
  }

  /**
   * Parse le format standard DSTV
   */
  private parseStandardFormat(input: string[]): Point2D[] {
    const points: Point2D[] = [];
    
    for (let i = 0; i < input.length - 1; i += 2) {
      const x = parseFloat(input[i]);
      const y = parseFloat(input[i + 1]);
      
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      } else {
        break; // Arrêter si on n'a plus de coordonnées valides
      }
    }

    return points;
  }

  /**
   * Vérifie si un champ contient un indicateur de face
   */
  private containsFaceIndicator(field: string): boolean {
    const lowerField = field.toLowerCase();
    return /^[hvuo]/.test(lowerField) && /\d/.test(field);
  }

  /**
   * Mappe un indicateur de face
   */
  private mapFaceIndicator(indicator: string): StandardFace | undefined {
    const mapping: Record<string, StandardFace> = {
      'v': StandardFace.TOP_FLANGE,
      'u': StandardFace.BOTTOM_FLANGE,
      'o': StandardFace.WEB,
      'h': StandardFace.WEB
    };
    return mapping[indicator] || undefined;
  }

  /**
   * Extrait les nombres d'une chaîne
   */
  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    const parts = text.split(/\s+/).filter(p => p.trim());
    
    for (const part of parts) {
      const match = part.match(/^-?(\d+\.?\d*)/);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    }
    
    return numbers;
  }

  /**
   * Analyse un contour interne pour déterminer ses caractéristiques
   */
  private analyzeInternalContour(points: Point2D[]): {
    contourType: InternalContourType;
    depth: number;
    isTransverse: boolean;
  } {
    const contourType = this.detectContourType(points);
    
    // Calculer l'aire approximative pour déterminer si c'est traversant
    const bounds = this.getContourBounds(points);
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    
    // Pour les grandes ouvertures, on assume une découpe traversante
    const isTransverse = area > 10000; // Plus de 100x100mm
    
    // Profondeur adaptative selon le type
    let depth = 10; // Par défaut
    if (isTransverse) {
      depth = -1; // Traversant (valeur spéciale)
    } else if (contourType === 'circular' || contourType === 'oval') {
      depth = 15; // Les trous ronds sont souvent plus profonds
    } else if (contourType === 'rectangular' && area > 2500) { // > 50x50mm
      depth = 20; // Grandes ouvertures rectangulaires
    }
    
    return {
      contourType,
      depth,
      isTransverse
    };
  }

  /**
   * Détecte le type de contour
   */
  private detectContourType(points: Point2D[]): InternalContourType {
    const numPoints = points.length;
    
    // Rectangulaire : 4-5 points avec angles droits
    if ((numPoints === 4 || numPoints === 5) && this.isRectangular(points)) {
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
    
    return 'irregular';
  }

  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(points: Point2D[]): boolean {
    if (points.length !== 4 && points.length !== 5) return false;
    
    // Si 5 points, vérifier la fermeture
    if (points.length === 5) {
      const first = points[0];
      const last = points[4];
      if (Math.abs(first.x - last.x) > 0.01 || Math.abs(first.y - last.y) > 0.01) {
        return false;
      }
    }
    
    // Vérifier que les segments sont orthogonaux
    const workingPoints = points.length === 5 ? points.slice(0, -1) : points;
    
    for (let i = 0; i < workingPoints.length; i++) {
      const p1 = workingPoints[i];
      const p2 = workingPoints[(i + 1) % workingPoints.length];
      
      const isHorizontal = Math.abs(p1.y - p2.y) < 0.01;
      const isVertical = Math.abs(p1.x - p2.x) < 0.01;
      
      if (!isHorizontal && !isVertical) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Vérifie si un contour est circulaire
   */
  private isCircular(points: Point2D[]): boolean {
    if (points.length < 12) return false;
    
    const center = this.getContourCenter(points);
    
    // Calculer les distances au centre
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2))
    );
    
    // Vérifier que toutes les distances sont similaires (tolérance 5%)
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgDistance)));
    
    return maxDeviation < avgDistance * 0.05;
  }

  /**
   * Vérifie si un contour est ovale
   */
  private isOval(points: Point2D[]): boolean {
    if (points.length < 12) return false;
    
    const bounds = this.getContourBounds(points);
    const aspectRatio = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
    
    // Un ovale a un rapport d'aspect différent de 1 mais pas trop extrême
    return aspectRatio > 1.2 && aspectRatio < 3.0;
  }

  /**
   * Vérifie si un contour est fermé
   */
  private isContourClosed(points: Point2D[]): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    const tolerance = 0.01;
    
    return Math.abs(first.x - last.x) < tolerance && 
           Math.abs(first.y - last.y) < tolerance;
  }

  /**
   * Calcule le centre d'un contour
   */
  private getContourCenter(points: Point2D[]): Point2D {
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  /**
   * Obtient les limites d'un contour
   */
  private getContourBounds(points: Point2D[]): {
    minX: number; maxX: number; minY: number; maxY: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return { minX, maxX, minY, maxY };
  }

  /**
   * Valide les données du bloc IK
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const data = await this.process(input);

      // Validation des points
      if (!data.points || data.points.length < 3) {
        errors.push('IK block must contain at least 3 points');
      }

      // Validation de chaque point
      for (let i = 0; i < data.points.length; i++) {
        const point = data.points[i];
        
        if (isNaN(point.x) || isNaN(point.y)) {
          errors.push(`Point ${i + 1} has invalid coordinates`);
        }
      }

      // Validation de la profondeur
      if (data.depth !== undefined) {
        if (data.depth <= 0 && data.depth !== -1) { // -1 = traversant
          errors.push('Depth must be positive or -1 for through cuts');
        }
        if (data.depth > 1000) {
          warnings.push(`Very deep internal cut: ${data.depth}mm`);
        }
      }

      // Validation du plan de travail
      if (data.workPlane && !/^E[0-9]$/.test(data.workPlane)) {
        errors.push(`Invalid work plane: ${data.workPlane} (must be E0-E9)`);
      }

      // Vérification de cohérence géométrique
      if (data.contourType === 'rectangular' && data.points.length > 6) {
        warnings.push('Too many points for rectangular contour');
      }

      if (data.contourType === 'circular' && data.points.length < 12) {
        warnings.push('Too few points for circular contour');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data
      };
    } catch (error) {
      errors.push(`Failed to parse IK block: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Convertit vers le format standardisé moderne
   */
  convertToStandardFormat(data: IKBlockData): {
    type: 'inner_contour';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    const center = this.getContourCenter(data.points);
    const bounds = this.getContourBounds(data.points);
    
    return {
      type: 'inner_contour',
      coordinates: {
        x: center.x,
        y: center.y,
        z: 0
      },
      parameters: {
        points: data.points,
        contourType: data.contourType,
        closed: data.closed || false,
        face: data.face || 'front',
        depth: data.depth || 10,
        isTransverse: data.isTransverse || false,
        workPlane: data.workPlane || 'E0',
        
        // Géométrie calculée
        bounds,
        center,
        area: (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY),
        perimeter: this.calculatePerimeter(data.points),
        
        originalFormat: 'DSTV_IK'
      }
    };
  }

  /**
   * Calcule le périmètre approximatif
   */
  private calculatePerimeter(points: Point2D[]): number {
    let perimeter = 0;
    
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
  }
}