/**
 * Parser pour le bloc BO (Hole/Bohren) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Gère tous les types de trous DSTV selon la norme officielle 7ème édition.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Types de faces pour trous DSTV
 */
export type HoleFace = 'h' | 'v' | 'u' | 'o'; // horizontal, vertical, upper, opposite

/**
 * Types de trous supportés
 */
export type HoleType = 'round' | 'slotted' | 'square' | 'rectangular';

/**
 * Structure des données d'un trou BO
 */
export interface BOBlockData {
  x: number;                  // Coordonnée X du trou
  y: number;                  // Coordonnée Y du trou
  diameter: number;           // Diamètre du trou
  depth?: number;            // Profondeur du trou (optionnel)
  angle?: number;            // Angle d'inclinaison (optionnel)
  face?: HoleFace;          // Face de perçage (optionnel, défaut 'v')
  workPlane?: string;       // Plan de travail (E0-E9, optionnel)
  holeType?: HoleType;      // Type de trou (optionnel, défaut 'round')
  tolerance?: number;       // Tolérance d'usinage (optionnel)
  toolNumber?: number;      // Numéro d'outil (optionnel)
  
  // Paramètres pour trous non-circulaires
  width?: number;           // Largeur pour trous rectangulaires/carrés
  height?: number;          // Hauteur pour trous rectangulaires/carrés
  slotLength?: number;      // Longueur pour trous oblongs
}

/**
 * Parser pour le bloc BO - Version moderne intégrée
 */
export class BOBlockParser extends BaseStage<string[], BOBlockData[]> {
  readonly name = 'bo-block-parser';
  readonly description = 'Parses DSTV BO (Hole) block according to official standard with legacy compatibility';

  /**
   * Parse un bloc BO moderne
   */
  async process(input: string[]): Promise<BOBlockData[]> {
    if (input.length < 3) {
      throw new Error('BO block requires at least 3 fields (X, Y, diameter)');
    }

    this.log(undefined as any, 'debug', `Parsing BO block with ${input.length} fields`);

    const holes: BOBlockData[] = [];

    // Traitement selon le format détecté
    if (this.isLegacyFaceIndicatorFormat(input)) {
      // Format legacy avec indicateurs de face
      holes.push(...this.parseLegacyFormat(input));
    } else {
      // Format standard DSTV
      holes.push(...this.parseStandardFormat(input));
    }

    this.log(undefined as any, 'debug', `Parsed ${holes.length} holes from BO block`);

    return holes;
  }

  /**
   * Détecte si le format utilise les anciens indicateurs de face
   */
  private isLegacyFaceIndicatorFormat(input: string[]): boolean {
    // Vérifier si le premier champ contient un indicateur de face (h, v, u, o)
    const firstField = input[0]?.trim().toLowerCase();
    return firstField ? /^[hvuo]/.test(firstField) : false;
  }

  /**
   * Parse le format legacy avec indicateurs de face
   */
  private parseLegacyFormat(input: string[]): BOBlockData[] {
    const holes: BOBlockData[] = [];

    for (let i = 0; i < input.length; i++) {
      const field = input[i].trim();
      
      if (this.containsFaceIndicator(field)) {
        const hole = this.parseLegacyHoleEntry(field);
        if (hole) {
          holes.push(hole);
        }
      }
    }

    return holes;
  }

  /**
   * Vérifie si un champ contient un indicateur de face
   */
  private containsFaceIndicator(field: string): boolean {
    const lowerField = field.toLowerCase();
    return /^[hvuo]/.test(lowerField) && /\d/.test(field);
  }

  /**
   * Parse une entrée de trou au format legacy
   */
  private parseLegacyHoleEntry(entry: string): BOBlockData | null {
    try {
      const faceChar = entry.charAt(0).toLowerCase() as HoleFace;
      
      // Extraire les valeurs numériques
      // Format: "v  1857.15u   163.20  22.00   0.00"
      const numberPart = entry.substring(1);
      const numbers = this.extractNumbers(numberPart);
      
      if (numbers.length < 3) {
        console.warn(`Insufficient numbers for hole entry: ${entry}`);
        return null;
      }

      const hole: BOBlockData = {
        x: numbers[0],
        y: numbers[1],
        diameter: numbers[2],
        face: ['h', 'v', 'u', 'o'].includes(faceChar) ? faceChar : 'v',
        depth: numbers[3] || 0,
        holeType: 'round'
      };

      // Paramètres additionnels si présents
      if (numbers[4] !== undefined) hole.angle = numbers[4];
      if (numbers[5] !== undefined) hole.tolerance = numbers[5];

      return hole;
      
    } catch (error) {
      console.warn(`Error parsing legacy hole entry: ${entry}`, error);
      return null;
    }
  }

  /**
   * Parse le format standard DSTV
   */
  private parseStandardFormat(input: string[]): BOBlockData[] {
    const holes: BOBlockData[] = [];
    
    // Traiter les trous par groupes de 3+ champs
    for (let i = 0; i < input.length; i += 3) {
      if (i + 2 >= input.length) break;

      try {
        const hole: BOBlockData = {
          x: parseFloat(input[i]),
          y: parseFloat(input[i + 1]),
          diameter: parseFloat(input[i + 2]),
          holeType: 'round',
          face: 'v' // Face par défaut (vertical)
        };

        if (isNaN(hole.x) || isNaN(hole.y) || isNaN(hole.diameter)) {
          console.warn(`Invalid coordinates in BO block at position ${i}`);
          continue;
        }

        // Champs optionnels
        if (input[i + 3]) {
          const depth = parseFloat(input[i + 3]);
          if (!isNaN(depth)) hole.depth = depth;
        }

        if (input[i + 4]) {
          const angle = parseFloat(input[i + 4]);
          if (!isNaN(angle)) hole.angle = angle;
        }

        if (input[i + 5]) {
          const workPlane = input[i + 5].trim().toUpperCase();
          if (/^E[0-9]$/.test(workPlane)) {
            hole.workPlane = workPlane;
          }
        }

        holes.push(hole);
        
        // Ajuster l'incrément si des champs optionnels ont été traités
        let fieldsProcessed = 3;
        if (input[i + 3]) fieldsProcessed++;
        if (input[i + 4]) fieldsProcessed++;
        if (input[i + 5]) fieldsProcessed++;
        
        i += fieldsProcessed - 3; // -3 car la boucle fait déjà +3
        
      } catch (error) {
        console.warn(`Error parsing standard hole at position ${i}:`, error);
      }
    }

    return holes;
  }

  /**
   * Extrait les nombres d'une chaîne
   */
  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    
    // Diviser par espaces et extraire les nombres
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
   * Valide les données des trous
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // First parse the input to get the data
      const holes = await this.process(input);

      for (let i = 0; i < holes.length; i++) {
        const hole = holes[i];
        
        // Validation des coordonnées
        if (isNaN(hole.x) || isNaN(hole.y)) {
          errors.push(`Hole ${i + 1}: Invalid coordinates`);
        }

        // Validation du diamètre
        if (isNaN(hole.diameter) || hole.diameter <= 0) {
          errors.push(`Hole ${i + 1}: Diameter must be positive`);
        }

        if (hole.diameter > 500) { // 500mm semble excessif
          warnings.push(`Hole ${i + 1}: Very large diameter ${hole.diameter}mm`);
        }

        if (hole.diameter < 0.1) { // 0.1mm semble très petit
          warnings.push(`Hole ${i + 1}: Very small diameter ${hole.diameter}mm`);
        }

        // Validation de la profondeur
        if (hole.depth !== undefined) {
          if (hole.depth < 0) {
            errors.push(`Hole ${i + 1}: Depth cannot be negative`);
          }
          if (hole.depth > 1000) { // 1m semble excessif
            warnings.push(`Hole ${i + 1}: Very deep hole ${hole.depth}mm`);
          }
        }

        // Validation de l'angle
        if (hole.angle !== undefined && (hole.angle < -90 || hole.angle > 90)) {
          warnings.push(`Hole ${i + 1}: Angle ${hole.angle}° is outside typical range [-90°, 90°]`);
        }

        // Validation de la face
        if (hole.face && !['h', 'v', 'u', 'o'].includes(hole.face)) {
          errors.push(`Hole ${i + 1}: Invalid face indicator '${hole.face}'`);
        }

        // Validation du plan de travail
        if (hole.workPlane && !/^E[0-9]$/.test(hole.workPlane)) {
          errors.push(`Hole ${i + 1}: Invalid work plane '${hole.workPlane}'`);
        }

        // Validation des dimensions pour trous non-circulaires
        if (hole.holeType === 'rectangular' || hole.holeType === 'square') {
          if (!hole.width || !hole.height) {
            errors.push(`Hole ${i + 1}: ${hole.holeType} holes require width and height`);
          }
        }

        if (hole.holeType === 'slotted' && !hole.slotLength) {
          errors.push(`Hole ${i + 1}: Slotted holes require slot length`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: holes
      };
    } catch (error) {
      errors.push(`Failed to parse BO block: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  convertToStandardFormat(holes: BOBlockData[]): Array<{
    type: 'hole';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  }> {
    return holes.map((hole, index) => ({
      type: 'hole' as const,
      coordinates: {
        x: hole.x,
        y: hole.y,
        z: 0 // DSTV est 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        diameter: hole.diameter,
        depth: hole.depth || 0,
        angle: hole.angle || 0,
        face: hole.face || 'v',
        workPlane: hole.workPlane || 'E0',
        holeType: hole.holeType || 'round',
        tolerance: hole.tolerance,
        toolNumber: hole.toolNumber,
        
        // Dimensions pour trous non-circulaires
        width: hole.width,
        height: hole.height,
        slotLength: hole.slotLength,
        
        // Métadonnées
        holeIndex: index,
        originalFormat: 'DSTV_BO'
      }
    }));
  }
}