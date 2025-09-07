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
    console.log(`🔧 BOBlockParser.process called with ${input.length} lines:`, input);
    
    if (input.length < 3) {
      throw new Error('BO block requires at least 3 fields (X, Y, diameter)');
    }

    this.log(undefined as any, 'debug', `Parsing BO block with ${input.length} fields`);

    const holes: BOBlockData[] = [];

    // Traitement selon le format détecté
    const isLegacy = this.isLegacyFaceIndicatorFormat(input);
    console.log(`🔍 BO format detected: ${isLegacy ? 'LEGACY' : 'STANDARD'}`);
    
    if (isLegacy) {
      // Format legacy avec indicateurs de face
      const legacyHoles = this.parseLegacyFormat(input);
      console.log(`🔍 Legacy format parsed ${legacyHoles.length} holes`);
      holes.push(...legacyHoles);
    } else {
      // Format standard DSTV
      const standardHoles = this.parseStandardFormat(input);
      console.log(`🔍 Standard format parsed ${standardHoles.length} holes`);
      holes.push(...standardHoles);
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
    console.log(`🔍 BO parseLegacyFormat called with ${input.length} fields`);
    console.log(`  First few fields:`, input.slice(0, 5));

    // Gérer deux formats:
    // 1. Format condensé: ["v 1857.15u 163.20 22.00 0.00"]
    // 2. Format séparé: ["v", "1857.15", "163.20", "22.00", "0.00"]
    
    let i = 0;
    while (i < input.length) {
      const field = input[i].trim();
      
      // Si le champ contient des espaces, c'est le format condensé
      if (field.includes(' ') && this.containsFaceIndicator(field)) {
        const hole = this.parseLegacyHoleEntry(field);
        if (hole) {
          holes.push(hole);
        }
        i++;
      }
      // Si c'est juste un indicateur de face seul, c'est le format séparé
      else if (field.length === 1 && /^[hvuo]$/i.test(field)) {
        // Collecter les valeurs suivantes pour ce trou
        if (i + 3 < input.length) {
          const face = field.toLowerCase() as HoleFace;
          const x = parseFloat(input[i + 1]);
          const y = parseFloat(input[i + 2]);
          const diameter = parseFloat(input[i + 3]);
          const depth = i + 4 < input.length ? parseFloat(input[i + 4]) : 0;
          
          if (!isNaN(x) && !isNaN(y) && !isNaN(diameter)) {
            const hole: BOBlockData = {
              x,
              y,
              diameter,
              face,
              depth: !isNaN(depth) ? depth : 0,
              holeType: 'round'
            };
            
            console.log(`🔍 Parsed hole from separated format: face=${face}, x=${x}, y=${y}, d=${diameter}`);
            holes.push(hole);
          }
          
          // Avancer de 5 positions (face + x + y + diameter + depth)
          i += 5;
        } else {
          i++;
        }
      } else {
        i++;
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
      
      console.log(`🔍 BO parseLegacyHoleEntry: entry="${entry}", face="${faceChar}", numbers=${JSON.stringify(numbers)}`);
      console.log(`  📏 Extracted values: X=${numbers[0]}, Y=${numbers[1]}, diameter=${numbers[2]}, depth=${numbers[3]}`);
      
      if (numbers.length < 3) {
        console.warn(`Insufficient numbers for hole entry: ${entry}`);
        return null;
      }

      const parsedDepth = numbers[3] !== undefined ? numbers[3] : 0;
      console.log(`  📏 BO hole depth: raw="${numbers[3]}", parsed=${parsedDepth}, isThrough=${parsedDepth === 0}`);
      
      const hole: BOBlockData = {
        x: numbers[0],
        y: numbers[1],
        diameter: numbers[2],
        face: ['h', 'v', 'u', 'o'].includes(faceChar) ? faceChar : 'v',
        depth: parsedDepth,
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

        // Champs optionnels - IMPORTANT: depth=0 signifie trou traversant
        if (input[i + 3] !== undefined) {
          const depth = parseFloat(input[i + 3]);
          if (!isNaN(depth)) {
            hole.depth = depth;
            console.log(`  📏 BO standard hole depth: raw="${input[i + 3]}", parsed=${depth}, isThrough=${depth === 0}`);
          }
        } else {
          // Si pas de profondeur spécifiée, c'est un trou traversant (depth=0)
          hole.depth = 0;
          console.log(`  📏 BO standard hole: no depth specified, using 0 (through hole)`);
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
      // Gérer le suffixe 'u' qui peut apparaître après les nombres dans DSTV
      // Ex: "1857.15u" -> 1857.15
      const cleanPart = part.replace(/u$/i, '');
      
      // Extraire le nombre avec signe optionnel
      const match = cleanPart.match(/^(-?\d+\.?\d*)$/);
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
   * PHASE 1 - Validation spécifique aux types de trous selon DSTV
   */
  private validateHoleTypeSpecific(hole: BOBlockData, holeIndex: number, errors: string[], warnings: string[]): void {
    switch (hole.holeType) {
      case 'rectangular':
      case 'square':
        if (!hole.width || !hole.height) {
          errors.push(`Hole ${holeIndex}: ${hole.holeType} holes require width and height parameters`);
        } else {
          if (hole.width <= 0 || hole.height <= 0) {
            errors.push(`Hole ${holeIndex}: Width and height must be positive`);
          }
          if (hole.holeType === 'square' && Math.abs(hole.width - hole.height) > 0.01) {
            warnings.push(`Hole ${holeIndex}: Square hole has different width (${hole.width}) and height (${hole.height})`);
          }
        }
        break;
        
      case 'slotted':
        if (!hole.slotLength) {
          errors.push(`Hole ${holeIndex}: Slotted holes require slot length parameter`);
        } else if (hole.slotLength <= hole.diameter) {
          warnings.push(`Hole ${holeIndex}: Slot length (${hole.slotLength}) should be greater than diameter (${hole.diameter})`);
        }
        break;
        
      case 'round':
      default:
        // Validation spécifique aux trous ronds
        if (hole.diameter > 200) {
          warnings.push(`Hole ${holeIndex}: Large round hole diameter (${hole.diameter}mm)`);
        }
        break;
    }
  }
  
  /**
   * PHASE 1 - Validation des conflits entre trous selon DSTV
   * Détecte les chevauchements et positions problématiques
   */
  private validateHoleConflicts(holes: BOBlockData[], errors: string[], warnings: string[]): void {
    for (let i = 0; i < holes.length; i++) {
      for (let j = i + 1; j < holes.length; j++) {
        const hole1 = holes[i];
        const hole2 = holes[j];
        
        // Vérifier les trous sur la même face
        if (hole1.face === hole2.face) {
          const distance = Math.sqrt(
            Math.pow(hole2.x - hole1.x, 2) + Math.pow(hole2.y - hole1.y, 2)
          );
          
          const minDistance = (hole1.diameter + hole2.diameter) / 2 + 5; // 5mm marge minimum
          
          if (distance < minDistance) {
            warnings.push(
              `Holes ${i + 1} and ${j + 1} are very close (${distance.toFixed(1)}mm apart, ` +
              `minimum recommended: ${minDistance.toFixed(1)}mm) on face '${hole1.face}'`
            );
          }
          
          // Détecter les trous exactement superposés (erreur courante)
          if (distance < 0.1 && Math.abs(hole1.diameter - hole2.diameter) < 0.1) {
            errors.push(`Holes ${i + 1} and ${j + 1} are identical (duplicate holes on face '${hole1.face}')`);
          }
        }
      }
    }
    
    // Validation du nombre de trous (détection d'anomalies)
    if (holes.length > 1000) {
      warnings.push(`Very large number of holes (${holes.length}) - verify this is correct`);
    }
  }

  /**
   * Valide les données des trous selon le standard DSTV 7ème édition
   * AMÉLIORATIONS PHASE 1 :
   * - Validation stricte depth=0 = trou traversant (règle DSTV critique)
   * - Validation des coordonnées dans les limites du profil
   * - Conformité aux priorités de blocs (BO > AK > IK)
   * - Validation des faces DSTV (v, o, u, h)
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // First parse the input to get the data
      const holes = await this.process(input);

      if (holes.length === 0) {
        warnings.push('BO block contains no holes');
      }

      for (let i = 0; i < holes.length; i++) {
        const hole = holes[i];
        
        // DSTV RULE 1: Validation des coordonnées
        if (isNaN(hole.x) || isNaN(hole.y)) {
          errors.push(`Hole ${i + 1}: Invalid coordinates (x=${hole.x}, y=${hole.y})`);
        }
        
        // Validation des coordonnées dans des limites raisonnables
        if (Math.abs(hole.x) > 50000 || Math.abs(hole.y) > 50000) {
          warnings.push(`Hole ${i + 1}: Extreme coordinates (x=${hole.x.toFixed(1)}, y=${hole.y.toFixed(1)})`);
        }

        // DSTV RULE 2: Validation du diamètre
        if (isNaN(hole.diameter) || hole.diameter <= 0) {
          errors.push(`Hole ${i + 1}: Diameter must be positive (current: ${hole.diameter})`);
        }

        // Validation des diamètres selon standards industriels
        if (hole.diameter > 500) {
          warnings.push(`Hole ${i + 1}: Very large diameter ${hole.diameter}mm (exceeds typical steel fabrication limits)`);
        }

        if (hole.diameter < 1) {
          warnings.push(`Hole ${i + 1}: Very small diameter ${hole.diameter}mm (may be difficult to machine)`);
        }

        // DSTV RULE 3: VALIDATION CRITIQUE DE LA PROFONDEUR
        // Selon DSTV standard: depth=0 signifie trou traversant (through hole)
        // depth>0 signifie trou borgne (blind hole) avec profondeur spécifique
        if (hole.depth !== undefined) {
          if (hole.depth < 0) {
            errors.push(`Hole ${i + 1}: Depth cannot be negative (DSTV violation, current: ${hole.depth})`);
          }
          
          if (hole.depth === 0) {
            // Conforme DSTV : depth=0 = trou traversant
            warnings.push(`Hole ${i + 1}: Through hole (depth=0) as per DSTV standard`);
          } else if (hole.depth > 0 && hole.depth < 0.5) {
            warnings.push(`Hole ${i + 1}: Very shallow blind hole (${hole.depth}mm)`);
          } else if (hole.depth > 1000) {
            warnings.push(`Hole ${i + 1}: Very deep blind hole (${hole.depth}mm)`);
          }
        } else {
          // Si depth non spécifiée, elle devrait être 0 (trou traversant par défaut)
          warnings.push(`Hole ${i + 1}: Depth not specified, assuming through hole (depth=0)`);
        }

        // DSTV RULE 4: Validation de l'angle d'inclinaison
        if (hole.angle !== undefined) {
          if (hole.angle < -90 || hole.angle > 90) {
            errors.push(`Hole ${i + 1}: Angle ${hole.angle}° outside valid range [-90°, 90°] (DSTV violation)`);
          }
          
          if (Math.abs(hole.angle) > 45) {
            warnings.push(`Hole ${i + 1}: Large angle ${hole.angle}° may be difficult to machine`);
          }
        }

        // DSTV RULE 5: Validation stricte des faces DSTV
        if (hole.face) {
          if (!['h', 'v', 'u', 'o'].includes(hole.face)) {
            errors.push(`Hole ${i + 1}: Invalid DSTV face indicator '${hole.face}' (must be h/v/u/o)`);
          }
        } else {
          // Face par défaut devrait être spécifiée
          warnings.push(`Hole ${i + 1}: No face specified, using default 'v' (vertical/web)`);
        }

        // DSTV RULE 6: Validation du plan de travail
        if (hole.workPlane && !/^E[0-9]$/.test(hole.workPlane)) {
          errors.push(`Hole ${i + 1}: Invalid work plane '${hole.workPlane}' (must be E0-E9)`);
        }

        // DSTV RULE 7: Validation spécifique aux types de trous
        this.validateHoleTypeSpecific(hole, i + 1, errors, warnings);
      }
      
      // DSTV RULE 8: Validation globale des trous (détection de conflits)
      this.validateHoleConflicts(holes, errors, warnings);

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