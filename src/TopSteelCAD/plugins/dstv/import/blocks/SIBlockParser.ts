/**
 * Parser pour le bloc SI (Marking/Stempelung) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Gère les marquages selon la norme DSTV 7ème édition.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { StandardFace } from '../../../../core/coordinates/types';

/**
 * Structure des données d'un marquage SI
 */
export interface SIBlockData {
  x: number;                  // Coordonnée X du marquage
  y: number;                  // Coordonnée Y du marquage
  text: string;               // Texte à marquer
  height?: number;           // Hauteur du texte (optionnel)
  angle?: number;            // Angle de rotation (optionnel)
  depth?: number;            // Profondeur de marquage (optionnel)
  face?: StandardFace | undefined;             // Face d'application (optionnel)
  workPlane?: string;        // Plan de travail (E0-E9, optionnel)
  font?: string;             // Police de caractères (optionnel)
  markingMethod?: 'engrave' | 'stamp' | 'laser' | 'paint'; // Méthode de marquage
}

/**
 * Parser pour le bloc SI - Version moderne intégrée
 */
export class SIBlockParser extends BaseStage<string[], SIBlockData> {
  readonly name = 'si-block-parser';
  readonly description = 'Parses DSTV SI (Marking) block according to official standard';

  /**
   * Parse un bloc SI moderne
   */
  async process(input: string[]): Promise<SIBlockData> {
    if (input.length < 3) {
      throw new Error('SI block requires at least 3 fields (X, Y, text)');
    }

    // Champs obligatoires
    const x = parseFloat(input[0]);
    const y = parseFloat(input[1]);
    const text = input[2];

    if (isNaN(x) || isNaN(y)) {
      throw new Error('Invalid coordinates in SI block');
    }

    if (!text || text.trim() === '') {
      throw new Error('SI block requires marking text');
    }

    const data: SIBlockData = {
      x,
      y,
      text: text.trim(),
      markingMethod: 'engrave' // Méthode par défaut
    };

    // Champs optionnels
    this.parseOptionalFields(input.slice(3), data);

    // Valeurs par défaut
    if (data.height === undefined) data.height = 10; // 10mm par défaut
    if (data.angle === undefined) data.angle = 0;    // Horizontal par défaut
    if (data.depth === undefined) data.depth = 0.1;  // 0.1mm par défaut
    if (data.workPlane === undefined) data.workPlane = 'E0';
    if (data.face === undefined) data.face = undefined as any;

    this.log(undefined as any, 'debug', 
      `Parsed SI marking: "${data.text}" at (${data.x}, ${data.y}), height=${data.height}mm`
    );

    return data;
  }

  /**
   * Parse les champs optionnels
   */
  private parseOptionalFields(fields: string[], data: SIBlockData): void {
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i].trim();
      
      if (!field) continue;

      try {
        // Essayer de parser comme nombre d'abord
        const numValue = parseFloat(field);
        if (!isNaN(numValue)) {
          // Heuristiques pour déterminer le type de valeur numérique
          if (data.height === undefined && numValue > 0 && numValue < 100) {
            data.height = numValue;
          } else if (data.angle === undefined && numValue >= -360 && numValue <= 360) {
            data.angle = numValue;
          } else if (data.depth === undefined && numValue > 0 && numValue < 10) {
            data.depth = numValue;
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

        // Méthode de marquage
        if (['ENGRAVE', 'STAMP', 'LASER', 'PAINT'].includes(upperField)) {
          data.markingMethod = upperField.toLowerCase() as any;
          continue;
        }

        // Nom de police
        if (this.isFontName(field)) {
          data.font = field;
          continue;
        }

      } catch (error) {
        console.warn(`Warning parsing SI optional field: ${field}`, error);
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
   * Vérifie si une chaîne ressemble à un nom de police
   */
  private isFontName(field: string): boolean {
    const commonFonts = [
      'arial', 'helvetica', 'times', 'courier', 'verdana', 'tahoma',
      'standard', 'sans', 'serif', 'mono', 'bold', 'italic'
    ];
    
    const lowerField = field.toLowerCase();
    return commonFonts.some(font => lowerField.includes(font)) ||
           /^[a-zA-Z][a-zA-Z0-9\-_]*$/.test(field);
  }

  /**
   * Valide les données du bloc SI
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const data = input as any as SIBlockData;
    if (!data || typeof data !== 'object') {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Validation des coordonnées
    if (isNaN(data.x) || isNaN(data.y)) {
      errors.push('SI block coordinates must be valid numbers');
    }

    // Validation du texte
    if (!data.text || data.text.trim() === '') {
      errors.push('SI block must have marking text');
    }

    if (data.text.length > 100) {
      warnings.push(`Very long marking text: ${data.text.length} characters`);
    }

    // Validation de la hauteur
    if (data.height !== undefined) {
      if (data.height <= 0) {
        errors.push('Text height must be positive');
      }
      if (data.height > 200) {
        warnings.push(`Very large text height: ${data.height}mm`);
      }
      if (data.height < 1) {
        warnings.push(`Very small text height: ${data.height}mm`);
      }
    }

    // Validation de l'angle
    if (data.angle !== undefined) {
      if (data.angle < -360 || data.angle > 360) {
        warnings.push(`Angle ${data.angle}° is outside normal range [-360°, 360°]`);
      }
    }

    // Validation de la profondeur
    if (data.depth !== undefined) {
      if (data.depth <= 0) {
        errors.push('Marking depth must be positive');
      }
      if (data.depth > 5) {
        warnings.push(`Very deep marking: ${data.depth}mm`);
      }
    }

    // Validation du plan de travail
    if (data.workPlane && !/^E[0-9]$/.test(data.workPlane)) {
      errors.push(`Invalid work plane: ${data.workPlane} (must be E0-E9)`);
    }

    // Vérification de caractères spéciaux
    if (/[^\x20-\x7E]/.test(data.text)) {
      warnings.push('Marking text contains non-ASCII characters');
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
  convertToStandardFormat(data: SIBlockData): {
    type: 'marking';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    return {
      type: 'marking',
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        text: data.text,
        height: data.height || 10,
        angle: data.angle || 0,
        depth: data.depth || 0.1,
        face: data.face || 'front',
        workPlane: data.workPlane || 'E0',
        markingMethod: data.markingMethod || 'engrave',
        font: data.font || 'standard',
        
        // Propriétés calculées
        textLength: data.text.length,
        estimatedWidth: (data.text.length * (data.height || 10) * 0.6), // Approximation
        
        originalFormat: 'DSTV_SI'
      }
    };
  }
}