/**
 * Parser pour le bloc PU (Punch mark) - Marquage par pointage DSTV
 * 
 * Selon la norme DSTV 7ème édition, le bloc PU définit un pointage ou marquage
 * par poinçonnage à une position spécifique sur la pièce.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Structure des données du bloc PU
 */
export interface PUBlockData {
  x: number;                  // Coordonnée X du pointage
  y: number;                  // Coordonnée Y du pointage
  depth?: number;            // Profondeur du pointage (optionnel)
  diameter?: number;         // Diamètre du poinçon (optionnel)
  angle?: number;           // Angle d'inclinaison (optionnel)
  workPlane?: string;       // Plan de travail (E0-E9, optionnel)
  toolNumber?: number;      // Numéro d'outil (optionnel)
}

/**
 * Parser pour le bloc PU (Punch mark)
 */
export class PUBlockParser extends BaseStage<string[], PUBlockData> {
  readonly name = 'pu-block-parser';
  readonly description = 'Parses DSTV PU (Punch mark) block according to official standard';

  /**
   * Parse un bloc PU
   */
  async process(input: string[]): Promise<PUBlockData> {
    if (input.length < 2) {
      throw new Error('PU block requires at least 2 fields (X, Y coordinates)');
    }

    // Champs obligatoires
    const x = parseFloat(input[0]);
    const y = parseFloat(input[1]);

    if (isNaN(x) || isNaN(y)) {
      throw new Error('Invalid coordinates in PU block');
    }

    const data: PUBlockData = { x, y };

    // Champs optionnels
    try {
      // Champ 2: Profondeur du pointage (optionnel)
      if (input[2] && input[2].trim() !== '') {
        const depth = parseFloat(input[2]);
        if (!isNaN(depth) && depth > 0) {
          data.depth = depth;
        }
      }

      // Champ 3: Diamètre du poinçon (optionnel)
      if (input[3] && input[3].trim() !== '') {
        const diameter = parseFloat(input[3]);
        if (!isNaN(diameter) && diameter > 0) {
          data.diameter = diameter;
        }
      }

      // Champ 4: Angle d'inclinaison (optionnel)
      if (input[4] && input[4].trim() !== '') {
        const angle = parseFloat(input[4]);
        if (!isNaN(angle)) {
          // Normaliser l'angle entre -90 et 90 degrés
          data.angle = Math.max(-90, Math.min(90, angle));
        }
      }

      // Champ 5: Plan de travail (optionnel, défaut E0)
      if (input[5] && input[5].trim() !== '') {
        const workPlane = input[5].trim().toUpperCase();
        if (/^E[0-9]$/.test(workPlane)) {
          data.workPlane = workPlane;
        }
      }

      // Champ 6: Numéro d'outil (optionnel)
      if (input[6] && input[6].trim() !== '') {
        const toolNumber = parseInt(input[6]);
        if (!isNaN(toolNumber) && toolNumber > 0) {
          data.toolNumber = toolNumber;
        }
      }

    } catch (error) {
      // Les champs optionnels en erreur ne rendent pas le bloc invalide
      console.warn('Warning parsing optional PU block fields:', error);
    }

    // Valeurs par défaut selon la norme
    if (data.depth === undefined) {
      data.depth = 0.5; // 0.5mm par défaut
    }
    
    if (data.diameter === undefined) {
      data.diameter = 3.0; // 3mm par défaut
    }
    
    if (data.angle === undefined) {
      data.angle = 0; // Perpendiculaire par défaut
    }
    
    if (data.workPlane === undefined) {
      data.workPlane = 'E0'; // Plan principal par défaut
    }

    return data;
  }

  /**
   * Valide les données du bloc PU
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Si input est un tableau de strings, on ne peut pas valider les données
    // Cette méthode est appelée avec les données parsées, pas les tokens
    const data = input as any as PUBlockData;
    if (!data || typeof data !== 'object') {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Validation des coordonnées obligatoires
    if (data.x === undefined || data.y === undefined) {
      errors.push('PU block must have X and Y coordinates');
    }

    if (isNaN(data.x) || isNaN(data.y)) {
      errors.push('PU coordinates must be valid numbers');
    }

    // Validation des paramètres optionnels
    if (data.depth !== undefined) {
      if (data.depth <= 0) {
        errors.push('Punch depth must be positive');
      }
      if (data.depth > 20) { // 20mm semble excessif pour un pointage
        warnings.push(`Very large punch depth: ${data.depth}mm`);
      }
    }

    if (data.diameter !== undefined) {
      if (data.diameter <= 0) {
        errors.push('Punch diameter must be positive');
      }
      if (data.diameter > 50) { // 50mm semble excessif pour un poinçon
        warnings.push(`Very large punch diameter: ${data.diameter}mm`);
      }
      if (data.diameter < 0.1) {
        warnings.push(`Very small punch diameter: ${data.diameter}mm`);
      }
    }

    if (data.angle !== undefined) {
      if (data.angle < -90 || data.angle > 90) {
        errors.push('Punch angle must be between -90° and 90°');
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

    // Vérifications de cohérence
    if (data.diameter && data.depth && data.diameter > data.depth * 10) {
      warnings.push('Punch diameter seems very large compared to depth');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convertit les données PU vers le format standardisé
   */
  convertToStandardFormat(data: PUBlockData): {
    type: 'punch';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    return {
      type: 'punch',
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        depth: data.depth || 0.5,
        diameter: data.diameter || 3.0,
        angle: data.angle || 0,
        workPlane: data.workPlane || 'E0',
        toolNumber: data.toolNumber,
        punchType: 'standard'
      }
    };
  }
}