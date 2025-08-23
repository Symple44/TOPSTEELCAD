/**
 * Parser pour le bloc TO (Threading) - Filetage DSTV
 * 
 * Selon la norme DSTV 7ème édition, le bloc TO définit un filetage sur un trou existant.
 * Ce bloc doit être utilisé après un bloc BO (hole) correspondant.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Types de filetage standard
 */
export type ThreadType = 'metric' | 'imperial' | 'whitworth' | 'gas' | 'pipe';

/**
 * Direction de filetage
 */
export type ThreadDirection = 'right' | 'left';

/**
 * Structure des données du bloc TO
 */
export interface TOBlockData {
  x: number;                    // Coordonnée X du filetage
  y: number;                    // Coordonnée Y du filetage
  diameter: number;             // Diamètre nominal du filetage
  pitch?: number;              // Pas du filetage (optionnel)
  depth?: number;              // Profondeur du filetage (optionnel)
  threadType?: ThreadType;     // Type de filetage (métrique, impérial, etc.)
  threadDirection?: ThreadDirection; // Direction du filetage (droite/gauche)
  threadClass?: string;        // Classe de précision (6H, 6g, etc.)
  workPlane?: string;         // Plan de travail (E0-E9, optionnel)
  toolNumber?: number;        // Numéro d'outil (optionnel)
  threadStandard?: string;    // Norme du filetage (ISO, ANSI, etc.)
}

/**
 * Parser pour le bloc TO (Threading)
 */
export class TOBlockParser extends BaseStage<string[], TOBlockData> {
  readonly name = 'to-block-parser';
  readonly description = 'Parses DSTV TO (Threading) block according to official standard';

  /**
   * Parse un bloc TO
   */
  async process(input: string[]): Promise<TOBlockData> {
    if (input.length < 3) {
      throw new Error('TO block requires at least 3 fields (X, Y, diameter)');
    }

    // Champs obligatoires
    const x = parseFloat(input[0]);
    const y = parseFloat(input[1]);
    const diameter = parseFloat(input[2]);

    if (isNaN(x) || isNaN(y) || isNaN(diameter)) {
      throw new Error('Invalid coordinates or diameter in TO block');
    }

    if (diameter <= 0) {
      throw new Error('Thread diameter must be positive');
    }

    const data: TOBlockData = { x, y, diameter };

    // Champs optionnels
    try {
      // Champ 3: Pas du filetage (optionnel)
      if (input[3] && input[3].trim() !== '') {
        const pitch = parseFloat(input[3]);
        if (!isNaN(pitch) && pitch > 0) {
          data.pitch = pitch;
        }
      }

      // Champ 4: Profondeur du filetage (optionnel)
      if (input[4] && input[4].trim() !== '') {
        const depth = parseFloat(input[4]);
        if (!isNaN(depth) && depth > 0) {
          data.depth = depth;
        }
      }

      // Champ 5: Type de filetage (optionnel)
      if (input[5] && input[5].trim() !== '') {
        const threadType = this.parseThreadType(input[5].trim());
        if (threadType) {
          data.threadType = threadType;
        }
      }

      // Champ 6: Direction du filetage (optionnel)
      if (input[6] && input[6].trim() !== '') {
        const direction = input[6].trim().toLowerCase();
        if (direction === 'left' || direction === 'l') {
          data.threadDirection = 'left';
        } else if (direction === 'right' || direction === 'r') {
          data.threadDirection = 'right';
        }
      }

      // Champ 7: Classe de précision (optionnel)
      if (input[7] && input[7].trim() !== '') {
        const threadClass = input[7].trim().toUpperCase();
        if (this.isValidThreadClass(threadClass)) {
          data.threadClass = threadClass;
        }
      }

      // Champ 8: Plan de travail (optionnel)
      if (input[8] && input[8].trim() !== '') {
        const workPlane = input[8].trim().toUpperCase();
        if (/^E[0-9]$/.test(workPlane)) {
          data.workPlane = workPlane;
        }
      }

      // Champ 9: Numéro d'outil (optionnel)
      if (input[9] && input[9].trim() !== '') {
        const toolNumber = parseInt(input[9]);
        if (!isNaN(toolNumber) && toolNumber > 0) {
          data.toolNumber = toolNumber;
        }
      }

      // Champ 10: Norme du filetage (optionnel)
      if (input[10] && input[10].trim() !== '') {
        data.threadStandard = input[10].trim().toUpperCase();
      }

    } catch (error) {
      console.warn('Warning parsing optional TO block fields:', error);
    }

    // Valeurs par défaut selon la norme et pratiques courantes
    if (data.threadType === undefined) {
      data.threadType = 'metric'; // Métrique par défaut
    }

    if (data.threadDirection === undefined) {
      data.threadDirection = 'right'; // Droite par défaut
    }

    if (data.workPlane === undefined) {
      data.workPlane = 'E0'; // Plan principal par défaut
    }

    // Calculer le pas standard si non spécifié
    if (data.pitch === undefined) {
      data.pitch = this.calculateStandardPitch(data.diameter, data.threadType);
    }

    // Calculer la profondeur standard si non spécifiée
    if (data.depth === undefined) {
      data.depth = data.pitch * 3; // Profondeur = 3 fois le pas (règle générale)
    }

    return data;
  }

  /**
   * Parse le type de filetage à partir d'une chaîne
   */
  private parseThreadType(typeStr: string): ThreadType | undefined {
    const upperType = typeStr.toUpperCase();
    
    if (upperType.includes('METRIC') || upperType === 'M') {
      return 'metric';
    }
    if (upperType.includes('IMPERIAL') || upperType.includes('UNC') || upperType.includes('UNF')) {
      return 'imperial';
    }
    if (upperType.includes('WHITWORTH') || upperType === 'W') {
      return 'whitworth';
    }
    if (upperType.includes('GAS') || upperType === 'G') {
      return 'gas';
    }
    if (upperType.includes('PIPE') || upperType.includes('NPT')) {
      return 'pipe';
    }
    
    return undefined;
  }

  /**
   * Valide une classe de filetage
   */
  private isValidThreadClass(threadClass: string): boolean {
    // Classes courantes: 6H, 6G, 6g, 4H, 5H, etc.
    return /^[1-9][HGhg]?$/.test(threadClass) || 
           /^[1-9][A-Za-z]$/.test(threadClass);
  }

  /**
   * Calcule le pas standard pour un diamètre et type donnés
   */
  private calculateStandardPitch(diameter: number, threadType: ThreadType): number {
    switch (threadType) {
      case 'metric':
        return this.getMetricStandardPitch(diameter);
      case 'imperial':
        return this.getImperialStandardPitch(diameter);
      default:
        // Règle générale: pas ≈ diamètre / 4
        return Math.max(0.5, diameter / 4);
    }
  }

  /**
   * Pas standard pour filetage métrique
   */
  private getMetricStandardPitch(diameter: number): number {
    // Table simplifiée des pas métriques standard
    if (diameter <= 3) return 0.5;
    if (diameter <= 6) return 1.0;
    if (diameter <= 10) return 1.5;
    if (diameter <= 16) return 2.0;
    if (diameter <= 24) return 3.0;
    if (diameter <= 39) return 4.0;
    return 6.0;
  }

  /**
   * Pas standard pour filetage impérial (TPI -> pas en mm)
   */
  private getImperialStandardPitch(diameter: number): number {
    // Conversion approximative TPI vers pas en mm
    // Formule: pas_mm = 25.4 / TPI
    const diameterInch = diameter / 25.4;
    
    if (diameterInch <= 0.25) return 25.4 / 20; // 20 TPI
    if (diameterInch <= 0.5) return 25.4 / 13;  // 13 TPI
    if (diameterInch <= 1.0) return 25.4 / 8;   // 8 TPI
    return 25.4 / 6; // 6 TPI
  }

  /**
   * Valide les données du bloc TO
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const data = input as any as TOBlockData;
    if (!data || typeof data !== 'object') {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Validation des coordonnées et diamètre
    if (isNaN(data.x) || isNaN(data.y)) {
      errors.push('TO block coordinates must be valid numbers');
    }

    if (data.diameter <= 0) {
      errors.push('Thread diameter must be positive');
    }

    if (data.diameter > 200) { // 200mm semble excessif
      warnings.push(`Very large thread diameter: ${data.diameter}mm`);
    }

    if (data.diameter < 1) { // 1mm semble très petit
      warnings.push(`Very small thread diameter: ${data.diameter}mm`);
    }

    // Validation du pas
    if (data.pitch !== undefined) {
      if (data.pitch <= 0) {
        errors.push('Thread pitch must be positive');
      }
      
      if (data.pitch > data.diameter) {
        warnings.push('Thread pitch is larger than diameter (unusual)');
      }
      
      if (data.pitch < data.diameter / 100) {
        warnings.push('Thread pitch is very small compared to diameter');
      }
    }

    // Validation de la profondeur
    if (data.depth !== undefined) {
      if (data.depth <= 0) {
        errors.push('Thread depth must be positive');
      }
      
      if (data.depth > data.diameter) {
        warnings.push('Thread depth is larger than diameter');
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

    // Vérifications de cohérence
    if (data.pitch && data.depth && data.depth < data.pitch) {
      warnings.push('Thread depth is less than pitch (shallow thread)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convertit les données TO vers le format standardisé
   */
  convertToStandardFormat(data: TOBlockData): {
    type: 'thread';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    return {
      type: 'thread',
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        diameter: data.diameter,
        pitch: data.pitch,
        depth: data.depth,
        threadType: data.threadType || 'metric',
        threadDirection: data.threadDirection || 'right',
        threadClass: data.threadClass,
        workPlane: data.workPlane || 'E0',
        toolNumber: data.toolNumber,
        threadStandard: data.threadStandard,
        // Calculs dérivés
        majorDiameter: data.diameter,
        minorDiameter: data.diameter - (2 * (data.depth || 0)),
        effectiveDiameter: data.diameter - (data.depth || 0)
      }
    };
  }
}