/**
 * Parser pour le bloc SC (Cut/Sägen) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Gère les découpes spéciales selon la norme DSTV 7ème édition.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProfileFace } from '../../../../core/features/types';

/**
 * Types de découpes SC
 */
export type CutType = 'rectangular' | 'circular' | 'angular' | 'beveled' | 'custom';

/**
 * Structure des données d'une découpe SC
 */
export interface SCBlockData {
  x: number;                  // Coordonnée X du centre de découpe
  y: number;                  // Coordonnée Y du centre de découpe
  width: number;              // Largeur de la découpe
  height: number;             // Hauteur de la découpe
  angle?: number;            // Angle de rotation (optionnel)
  radius?: number;           // Rayon des coins arrondis (optionnel)
  cutType?: CutType;         // Type de découpe
  depth?: number;            // Profondeur de découpe (optionnel)
  face?: ProfileFace | undefined;             // Face d'application (optionnel)
  workPlane?: string;        // Plan de travail (E0-E9, optionnel)
  toolNumber?: number;       // Numéro d'outil (optionnel)
  feedRate?: number;         // Vitesse d'avance (optionnel)
}

/**
 * Parser pour le bloc SC - Version moderne intégrée
 */
export class SCBlockParser extends BaseStage<string[], SCBlockData> {
  readonly name = 'sc-block-parser';
  readonly description = 'Parses DSTV SC (Cut) block according to official standard';

  /**
   * Parse un bloc SC moderne
   */
  async process(input: string[]): Promise<SCBlockData> {
    if (input.length < 4) {
      throw new Error('SC block requires at least 4 fields (X, Y, width, height)');
    }

    // Champs obligatoires
    const x = parseFloat(input[0]);
    const y = parseFloat(input[1]);
    const width = parseFloat(input[2]);
    const height = parseFloat(input[3]);

    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      throw new Error('Invalid coordinates or dimensions in SC block');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('SC cut dimensions must be positive');
    }

    const data: SCBlockData = {
      x,
      y,
      width,
      height,
      cutType: this.determineCutType(width, height)
    };

    // Champs optionnels
    this.parseOptionalFields(input.slice(4), data);

    // Valeurs par défaut
    if (data.angle === undefined) data.angle = 0;
    if (data.workPlane === undefined) data.workPlane = 'E0';
    if (data.face === undefined) data.face = undefined as any;

    this.log(undefined as any, 'debug', 
      `Parsed SC cut: ${data.cutType} ${data.width}x${data.height}mm at (${data.x}, ${data.y})`
    );

    return data;
  }

  /**
   * Détermine le type de découpe basé sur les dimensions
   */
  private determineCutType(width: number, height: number): CutType {
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    
    // Découpe circulaire si largeur ≈ hauteur
    if (aspectRatio < 1.1) {
      return 'circular';
    }
    
    // Découpe rectangulaire standard
    if (aspectRatio < 3) {
      return 'rectangular';
    }
    
    // Découpe très allongée (possiblement angulaire)
    return 'angular';
  }

  /**
   * Parse les champs optionnels
   */
  private parseOptionalFields(fields: string[], data: SCBlockData): void {
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i].trim();
      
      if (!field) continue;

      try {
        // Essayer de parser comme nombre
        const numValue = parseFloat(field);
        if (!isNaN(numValue)) {
          // Heuristiques pour déterminer le type de valeur numérique
          if (data.angle === undefined && numValue >= -180 && numValue <= 180) {
            data.angle = numValue;
          } else if (data.radius === undefined && numValue > 0 && numValue < Math.min(data.width, data.height) / 2) {
            data.radius = numValue;
          } else if (data.depth === undefined && numValue > 0 && numValue < 1000) {
            data.depth = numValue;
          } else if (data.toolNumber === undefined && Number.isInteger(numValue) && numValue > 0 && numValue < 1000) {
            data.toolNumber = numValue;
          } else if (data.feedRate === undefined && numValue > 10 && numValue < 50000) {
            data.feedRate = numValue;
          }
          continue;
        }

        // Parser les paramètres textuels
        const upperField = field.toUpperCase();

        // Plan de travail
        if (/^E[0-9]$/.test(upperField)) {
          data.workPlane = upperField;
          continue;
        }

        // Indicateur de face (legacy)
        if (/^[HVUO]$/.test(upperField)) {
          data.face = this.mapFaceIndicator(upperField.toLowerCase()) as any;
          continue;
        }

        // Type de découpe explicite
        if (['RECTANGULAR', 'CIRCULAR', 'ANGULAR', 'BEVELED', 'CUSTOM'].includes(upperField)) {
          data.cutType = upperField.toLowerCase() as CutType;
          continue;
        }

      } catch (error) {
        console.warn(`Warning parsing SC optional field: ${field}`, error);
      }
    }
  }

  /**
   * Mappe un indicateur de face legacy
   */
  private mapFaceIndicator(indicator: string): string {
    const mapping: Record<string, string> = {
      'v': 'top',
      'u': 'bottom',
      'o': 'web', 
      'h': 'front'
    };
    return mapping[indicator] || 'front';
  }

  /**
   * Valide les données du bloc SC
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const data = input as any as SCBlockData;
    if (!data || typeof data !== 'object') {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Validation des coordonnées
    if (isNaN(data.x) || isNaN(data.y)) {
      errors.push('SC block coordinates must be valid numbers');
    }

    // Validation des dimensions
    if (data.width <= 0 || data.height <= 0) {
      errors.push('Cut dimensions must be positive');
    }

    if (data.width > 2000 || data.height > 2000) {
      warnings.push(`Very large cut dimensions: ${data.width}x${data.height}mm`);
    }

    if (data.width < 0.1 || data.height < 0.1) {
      warnings.push(`Very small cut dimensions: ${data.width}x${data.height}mm`);
    }

    // Validation de l'angle
    if (data.angle !== undefined) {
      if (data.angle < -180 || data.angle > 180) {
        warnings.push(`Cut angle ${data.angle}° is outside normal range [-180°, 180°]`);
      }
    }

    // Validation du rayon
    if (data.radius !== undefined) {
      if (data.radius <= 0) {
        errors.push('Corner radius must be positive');
      }
      if (data.radius > Math.min(data.width, data.height) / 2) {
        errors.push('Corner radius cannot be larger than half the smallest dimension');
      }
    }

    // Validation de la profondeur
    if (data.depth !== undefined) {
      if (data.depth <= 0) {
        errors.push('Cut depth must be positive');
      }
      if (data.depth > 1000) {
        warnings.push(`Very deep cut: ${data.depth}mm`);
      }
    }

    // Validation du plan de travail
    if (data.workPlane && !/^E[0-9]$/.test(data.workPlane)) {
      errors.push(`Invalid work plane: ${data.workPlane} (must be E0-E9)`);
    }

    // Validation du numéro d'outil
    if (data.toolNumber !== undefined) {
      if (data.toolNumber <= 0 || data.toolNumber > 999) {
        warnings.push(`Tool number ${data.toolNumber} is outside typical range 1-999`);
      }
    }

    // Validation de la vitesse d'avance
    if (data.feedRate !== undefined) {
      if (data.feedRate <= 0) {
        warnings.push('Feed rate should be positive');
      }
      if (data.feedRate > 50000) {
        warnings.push(`Very high feed rate: ${data.feedRate}mm/min`);
      }
    }

    // Vérifications de cohérence
    if (data.cutType === 'circular' && Math.abs(data.width - data.height) > Math.min(data.width, data.height) * 0.1) {
      warnings.push('Circular cut should have similar width and height');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convertit vers le format standardisé moderne
   */
  convertToStandardFormat(data: SCBlockData): {
    type: 'cut';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    return {
      type: 'cut',
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        width: data.width,
        height: data.height,
        angle: data.angle || 0,
        radius: data.radius || 0,
        cutType: data.cutType || 'rectangular',
        depth: data.depth,
        face: data.face || 'front',
        workPlane: data.workPlane || 'E0',
        toolNumber: data.toolNumber,
        feedRate: data.feedRate,
        
        // Propriétés calculées
        area: data.width * data.height,
        perimeter: 2 * (data.width + data.height),
        aspectRatio: Math.max(data.width, data.height) / Math.min(data.width, data.height),
        
        // Bounds de la découpe
        bounds: {
          minX: data.x - data.width / 2,
          maxX: data.x + data.width / 2,
          minY: data.y - data.height / 2,
          maxY: data.y + data.height / 2
        },
        
        originalFormat: 'DSTV_SC'
      }
    };
  }
}