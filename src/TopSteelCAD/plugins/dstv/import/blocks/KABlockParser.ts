/**
 * Parser pour le bloc KA (Contour Arc) selon la norme DSTV
 * 
 * Le bloc KA définit des contours avec arcs de cercle, utilisé pour
 * des formes complexes nécessitant des courbes et des rayons.
 * 
 * Format DSTV KA:
 * - Ligne 1: x y rayon angle1 angle2
 * - x, y: position du centre de l'arc
 * - rayon: rayon de l'arc
 * - angle1: angle de départ (degrés)
 * - angle2: angle de fin (degrés)
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Structure des données d'un bloc KA
 */
export interface KABlockData {
  blockType: 'KA';
  face?: string;           // Face sur laquelle le contour est défini
  contourType: 'arc';      // Type de contour (toujours arc pour KA)
  arcs: ArcElement[];      // Liste des arcs définissant le contour
}

/**
 * Élément d'arc
 */
export interface ArcElement {
  centerX: number;         // Position X du centre
  centerY: number;         // Position Y du centre
  radius: number;          // Rayon de l'arc
  startAngle: number;      // Angle de départ (degrés)
  endAngle: number;        // Angle de fin (degrés)
  clockwise?: boolean;     // Sens de parcours (optionnel)
}

/**
 * Parser pour le bloc KA
 */
export class KABlockParser extends BaseStage<string[], KABlockData> {
  readonly name = 'ka-block-parser';
  readonly description = 'Parses DSTV KA (Arc Contour) block for curved profiles';

  /**
   * Parse un bloc KA
   */
  async process(input: string[]): Promise<KABlockData> {
    if (input.length === 0) {
      throw new Error('KA block requires at least one arc definition');
    }

    this.log(undefined as any, 'debug', `Parsing KA block with ${input.length} fields`);
    
    // Détecter le format du bloc KA
    const format = this.detectFormat(input);
    
    // Parser selon le format détecté
    let result: KABlockData;
    if (format === 'SINGLE_LINE') {
      result = this.parseSingleLineFormat(input);
    } else if (format === 'MULTI_LINE') {
      result = this.parseMultiLineFormat(input);
    } else {
      result = this.parseLegacyFormat(input);
    }

    // Valider les données
    this.validateArcs(result.arcs);

    this.log(undefined as any, 'debug', `Parsed KA block with ${result.arcs.length} arcs`);
    
    return result;
  }

  /**
   * Détecte le format du bloc KA
   */
  private detectFormat(input: string[]): 'SINGLE_LINE' | 'MULTI_LINE' | 'LEGACY' {
    // Format single line: tous les paramètres sur une ligne
    if (input.length === 1 || (input.length >= 5 && input[0].includes('.'))) {
      return 'SINGLE_LINE';
    }
    
    // Format multi-lignes: chaque arc sur une ligne séparée
    if (input.length > 1 && !input[0].includes('.')) {
      // Vérifier si c'est un indicateur de face
      const firstField = input[0].trim().toLowerCase();
      if (['v', 'o', 'u', 'h', 's', 'vo', 'vu', 'hu', 'ho'].includes(firstField)) {
        return 'LEGACY';
      }
      return 'MULTI_LINE';
    }
    
    return 'LEGACY';
  }

  /**
   * Parse le format single line (tous les paramètres sur une ligne)
   */
  private parseSingleLineFormat(input: string[]): KABlockData {
    const fields = input[0].split(/\s+/).filter(f => f.trim() !== '');
    
    if (fields.length < 5) {
      throw new Error(`KA single line format requires at least 5 fields, got ${fields.length}`);
    }

    const arcs: ArcElement[] = [];
    
    // Parser les arcs (groupes de 5 valeurs)
    for (let i = 0; i < fields.length; i += 5) {
      if (i + 4 < fields.length) {
        arcs.push({
          centerX: this.parseNumber(fields[i], 0),
          centerY: this.parseNumber(fields[i + 1], 0),
          radius: this.parseNumber(fields[i + 2], 0),
          startAngle: this.parseNumber(fields[i + 3], 0),
          endAngle: this.parseNumber(fields[i + 4], 0)
        });
      }
    }

    return {
      blockType: 'KA',
      contourType: 'arc',
      arcs
    };
  }

  /**
   * Parse le format multi-lignes
   */
  private parseMultiLineFormat(input: string[]): KABlockData {
    const arcs: ArcElement[] = [];
    
    for (const line of input) {
      const fields = line.split(/\s+/).filter(f => f.trim() !== '');
      
      if (fields.length >= 5) {
        arcs.push({
          centerX: this.parseNumber(fields[0], 0),
          centerY: this.parseNumber(fields[1], 0),
          radius: this.parseNumber(fields[2], 0),
          startAngle: this.parseNumber(fields[3], 0),
          endAngle: this.parseNumber(fields[4], 0)
        });
      }
    }

    return {
      blockType: 'KA',
      contourType: 'arc',
      arcs
    };
  }

  /**
   * Parse le format legacy (avec indicateur de face)
   */
  private parseLegacyFormat(input: string[]): KABlockData {
    const arcs: ArcElement[] = [];
    let face: string | undefined;
    
    // Premier champ peut être un indicateur de face
    let startIndex = 0;
    const firstField = input[0]?.trim().toLowerCase();
    
    if (['v', 'o', 'u', 'h', 's', 'vo', 'vu', 'hu', 'ho'].includes(firstField)) {
      face = this.mapFaceIndicator(firstField);
      startIndex = 1;
    }
    
    // Parser les données d'arc
    // Format possible: face x1 y1 r1 a1 a2 x2 y2 r2 a2 a2 ...
    const allFields: string[] = [];
    for (let i = startIndex; i < input.length; i++) {
      const fields = input[i].split(/\s+/).filter(f => f.trim() !== '');
      allFields.push(...fields);
    }
    
    // Parser les arcs (groupes de 5 valeurs)
    for (let i = 0; i < allFields.length; i += 5) {
      if (i + 4 < allFields.length) {
        const centerX = this.parseNumber(allFields[i], 0);
        const centerY = this.parseNumber(allFields[i + 1], 0);
        const radius = this.parseNumber(allFields[i + 2], 0);
        const startAngle = this.parseNumber(allFields[i + 3], 0);
        const endAngle = this.parseNumber(allFields[i + 4], 0);
        
        // Ignorer les arcs invalides
        if (radius > 0) {
          arcs.push({
            centerX,
            centerY,
            radius,
            startAngle,
            endAngle
          });
        }
      }
    }

    return {
      blockType: 'KA',
      face,
      contourType: 'arc',
      arcs
    };
  }

  /**
   * Mappe un indicateur de face DSTV vers le nom de face interne
   */
  private mapFaceIndicator(indicator: string): string {
    const mapping: Record<string, string> = {
      'v': 'web',
      'o': 'top_flange',
      'u': 'bottom_flange',
      'h': 'front',
      's': 'back',
      'vo': 'web_top',
      'vu': 'web_bottom',
      'hu': 'front_bottom',
      'ho': 'front_top'
    };
    return mapping[indicator.toLowerCase()] || 'web';
  }

  /**
   * Parse un nombre avec valeur par défaut
   */
  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value || value === '-') return defaultValue;
    const num = parseFloat(value.trim());
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Valide les arcs
   */
  private validateArcs(arcs: ArcElement[]): void {
    for (const arc of arcs) {
      if (arc.radius <= 0) {
        console.warn(`⚠️ Invalid arc radius: ${arc.radius}`);
      }
      
      // Normaliser les angles entre 0 et 360
      arc.startAngle = this.normalizeAngle(arc.startAngle);
      arc.endAngle = this.normalizeAngle(arc.endAngle);
      
      // Déterminer le sens de parcours
      if (arc.endAngle < arc.startAngle) {
        arc.clockwise = false;
      } else {
        arc.clockwise = true;
      }
    }
  }

  /**
   * Normalise un angle entre 0 et 360 degrés
   */
  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  /**
   * Valide les données du bloc KA (surcharge pour compatibilité avec BaseStage)
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Valider l'entrée brute
    if (!input || input.length === 0) {
      errors.push('KA block requires at least one arc definition');
      return { isValid: false, errors, warnings };
    }

    try {
      // Parser les données pour validation
      const data = await this.process(input);
      
      if (!data.arcs || data.arcs.length === 0) {
        errors.push('KA block must contain at least one arc');
      }

      for (let i = 0; i < data.arcs.length; i++) {
        const arc = data.arcs[i];
        
        if (arc.radius <= 0) {
          errors.push(`Arc ${i + 1}: Invalid radius ${arc.radius}`);
        }
        
        if (Math.abs(arc.startAngle - arc.endAngle) < 0.001) {
          warnings.push(`Arc ${i + 1}: Start and end angles are identical`);
        }
        
        if (arc.radius > 10000) {
          warnings.push(`Arc ${i + 1}: Very large radius ${arc.radius}mm`);
        }
      }
    } catch (error) {
      errors.push(`Failed to parse KA block: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convertit vers le format standardisé
   */
  convertToStandardFormat(data: KABlockData): {
    type: 'contour';
    data: Record<string, any>;
  } {
    // Convertir les arcs en points pour le système de contour unifié
    const points: Array<[number, number]> = [];
    
    for (const arc of data.arcs) {
      // Approximer l'arc par des segments (10 points par arc)
      const segments = 10;
      const angleStep = (arc.endAngle - arc.startAngle) / segments;
      
      for (let i = 0; i <= segments; i++) {
        const angle = arc.startAngle + (i * angleStep);
        const radians = angle * Math.PI / 180;
        const x = arc.centerX + arc.radius * Math.cos(radians);
        const y = arc.centerY + arc.radius * Math.sin(radians);
        points.push([x, y]);
      }
    }

    return {
      type: 'contour',
      data: {
        blockType: 'KA',
        contourType: 'arc',
        face: data.face || 'web',
        points,
        closed: false,
        interpolation: 'curved',
        originalArcs: data.arcs
      }
    };
  }
}

export default KABlockParser;