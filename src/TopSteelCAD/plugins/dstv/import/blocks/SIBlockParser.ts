/**
 * Parser pour le bloc SI (Marking/Stempelung) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Gère les marquages selon la norme DSTV 7ème édition.
 * 
 * CORRECTIONS APPORTÉES:
 * - Intégration complète avec le système de coordonnées unifié
 * - Validation améliorée des coordonnées négatives
 * - Mapping correct des faces selon la norme DSTV
 * - Support complet pour tous les types de faces (web, top_flange, bottom_flange)
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
// StandardFace import removed - not used

/**
 * Structure des données d'un marquage SI
 */
export interface SIBlockData {
  x: number;                  // Coordonnée X du marquage (position le long du profil)
  y: number;                  // Coordonnée Y du marquage (position selon la face)
  text: string;               // Texte à marquer
  height?: number;           // Hauteur du texte (optionnel)
  angle?: number;            // Angle de rotation (optionnel)
  depth?: number;            // Profondeur de marquage (optionnel)
  face?: string;             // Face d'application sous forme de string (pour compatibilité DSTV)
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
   * Parse un bloc SI moderne avec support complet du système unifié
   */
  async process(input: string[]): Promise<SIBlockData> {
    if (input.length < 3) {
      throw new Error('SI block requires at least 3 fields (X, Y, text)');
    }

    // CORRECTION: Détecter et ignorer l'indicateur de face en début de données
    let startIdx = 0;
    let faceIndicator: string | undefined = undefined;
    
    // Vérifier si le premier élément est un indicateur de face DSTV
    if (input.length > 0 && /^[vVuUoOhH]$/.test(input[0])) {
      faceIndicator = input[0].toLowerCase();
      startIdx = 1;
    }
    
    // Vérifier qu'on a assez de champs après l'indicateur de face
    if (input.length < startIdx + 2) {
      throw new Error('SI block requires at least X and Y coordinates after face indicator');
    }

    // Champs obligatoires (en tenant compte de l'indicateur de face optionnel)
    const x = parseFloat(input[startIdx].replace(/u$/i, '')); // Enlever suffixe 'u' si présent
    const y = parseFloat(input[startIdx + 1].replace(/u$/i, ''));
    
    // Pour le texte, chercher dans les champs suivants
    let text = '';
    if (input.length > startIdx + 2) {
      // Si il y a un troisième champ et plus, analyser la structure
      const remainingFields = input.slice(startIdx + 2);
      
      // Le texte peut être dans un champ qui contient des lettres
      // ou dans un format comme "10rF1001"
      for (const field of remainingFields) {
        if (/r/.test(field)) {
          // Format DSTV avec séparateur 'r' : "10rF1001"
          const parts = field.split('r');
          if (parts.length >= 2) {
            text = parts[1]; // "F1001"
            break;
          }
        } else if (/[a-zA-Z]/.test(field)) {
          // Champ contenant des lettres
          text = field;
          break;
        }
      }
      
      // Si pas de texte trouvé, utiliser une valeur par défaut
      if (!text) {
        text = remainingFields[remainingFields.length - 1] || '0';
      }
    } else {
      text = '0'; // Valeur par défaut
    }

    // Validation améliorée des coordonnées
    if (isNaN(x) || isNaN(y)) {
      throw new Error('Invalid coordinates in SI block');
    }

    // CORRECTION: Permettre les coordonnées négatives légitimes
    // Les coordonnées négatives peuvent être valides selon le système de référence utilisé
    if (!this.areCoordinatesValid(x, y)) {
      throw new Error(`Invalid coordinate values: x=${x}, y=${y}`);
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

    // CORRECTION: Traiter l'indicateur de face détecté
    if (faceIndicator) {
      data.face = this.mapDSTVFaceIndicator(faceIndicator);
    }

    // Champs optionnels (en tenant compte du décalage dû à l'indicateur de face)
    const optionalFieldsStart = startIdx + 2; // Après X et Y
    this.parseOptionalFields(input.slice(optionalFieldsStart), data);

    // Valeurs par défaut avec validation
    if (data.height === undefined) data.height = 10; // 10mm par défaut
    if (data.angle === undefined) data.angle = 0;    // Horizontal par défaut
    if (data.depth === undefined) data.depth = 0.1;  // 0.1mm par défaut
    if (data.workPlane === undefined) data.workPlane = 'E0';
    
    // CORRECTION: Face par défaut seulement si pas d'indicateur détecté
    if (data.face === undefined) {
      data.face = 'web'; // Face par défaut selon la norme DSTV
    }

    this.log(undefined as any, 'debug', 
      `Parsed SI marking: "${data.text}" at (${data.x}, ${data.y}) on face "${data.face}", height=${data.height}mm`
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
        // CORRECTION: Traiter d'abord le format DSTV spécial "10rF1001"
        if (/r/.test(field)) {
          const parts = field.split('r');
          if (parts.length >= 2) {
            // Partie avant 'r' = hauteur
            const heightPart = parseFloat(parts[0]);
            if (!isNaN(heightPart) && data.height === undefined) {
              data.height = heightPart;
            }
            
            // Partie après 'r' = texte (déjà traité dans process)
            // Ne pas overrider le texte si déjà défini
            continue;
          }
        }

        // Essayer de parser comme nombre
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

        // CORRECTION: Indicateur de face selon la norme DSTV
        // v = semelle supérieure, u = semelle inférieure, o = âme, h = face avant
        if (/^[HVUO]$/.test(upperField)) {
          data.face = this.mapDSTVFaceIndicator(upperField.toLowerCase());
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
   * Mappe un indicateur de face DSTV vers la représentation interne
   * CORRECTION: Mapping conforme à la norme DSTV officielle
   */
  private mapDSTVFaceIndicator(indicator: string): string {
    // Mapping spécifique selon le type de profil et les tests
    // Pour les profils I : v = web, o = top_flange, u = bottom_flange  
    // Pour les profils L : différent selon les tests
    const mapping: Record<string, string> = {
      'v': 'web',             // v = web/âme pour les profils I
      'o': 'top_flange',      // o = semelle supérieure
      'u': 'bottom_flange',   // u = semelle inférieure
      'h': 'front'            // h = face avant/arrière
    };
    
    const result = mapping[indicator] || 'web';
    
    // Log pour le debugging
    if (this.name) {
      console.log(`🎯 DSTV face mapping: '${indicator}' → '${result}'`);
    }
    
    return result;
  }

  /**
   * Valide les coordonnées DSTV
   * CORRECTION: Validation améliorée qui permet les coordonnées négatives légitimes
   */
  private areCoordinatesValid(x: number, y: number): boolean {
    // Les coordonnées négatives peuvent être légitimes selon le système de référence
    // On vérifie seulement que les valeurs ne sont pas des valeurs aberrantes
    
    // Limites raisonnables pour des coordonnées de marquage DSTV (en mm)
    const MAX_COORDINATE = 100000; // 100m, largement suffisant pour tout profil industriel
    const MIN_COORDINATE = -100000;
    
    if (x < MIN_COORDINATE || x > MAX_COORDINATE) {
      console.warn(`⚠️ X coordinate out of reasonable range: ${x}mm`);
      return false;
    }
    
    if (y < MIN_COORDINATE || y > MAX_COORDINATE) {
      console.warn(`⚠️ Y coordinate out of reasonable range: ${y}mm`);
      return false;
    }
    
    return true;
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
   * Valide les données du bloc SI avec validation améliorée
   * CORRECTION: Validation plus robuste et cohérente avec le système unifié
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validation des champs obligatoires à partir de l'input brut
    if (!input || input.length < 3) {
      errors.push('SI block requires at least 3 fields (X, Y, text)');
      return { isValid: false, errors, warnings };
    }

    const x = parseFloat(input[0]);
    const y = parseFloat(input[1]);
    const text = input[2];

    // Validation des coordonnées
    if (isNaN(x) || isNaN(y)) {
      errors.push('SI block coordinates must be valid numbers');
    } else {
      // CORRECTION: Validation améliorée des coordonnées
      if (!this.areCoordinatesValid(x, y)) {
        errors.push(`SI block coordinates out of reasonable range: x=${x}, y=${y}`);
      }
    }

    // Validation du texte
    if (!text || text.trim() === '') {
      errors.push('SI block must have marking text');
    } else {
      if (text.length > 100) {
        warnings.push(`Very long marking text: ${text.length} characters`);
      }
      
      // Vérification de caractères spéciaux
      if (/[^\x20-\x7E]/.test(text)) {
        warnings.push('Marking text contains non-ASCII characters');
      }
    }

    // Validation des champs optionnels si présents
    for (let i = 3; i < input.length; i++) {
      const field = input[i].trim();
      if (!field) continue;

      const numValue = parseFloat(field);
      if (!isNaN(numValue)) {
        // Validation des valeurs numériques
        if (numValue > 0 && numValue < 100) {
          // Probablement une hauteur
          if (numValue > 200) {
            warnings.push(`Very large text height: ${numValue}mm`);
          }
          if (numValue < 1) {
            warnings.push(`Very small text height: ${numValue}mm`);
          }
        } else if (numValue >= -360 && numValue <= 360) {
          // Probablement un angle - acceptable
        } else if (numValue > 0 && numValue < 10) {
          // Probablement une profondeur
          if (numValue > 5) {
            warnings.push(`Very deep marking: ${numValue}mm`);
          }
        }
      } else {
        // Validation des champs textuels
        const upperField = field.toUpperCase();
        
        // Plan de travail
        if (/^E[0-9]$/.test(upperField)) {
          // Valide
        } else if (/^[HVUO]$/.test(upperField)) {
          // CORRECTION: Validation des faces DSTV valides
          // Toutes ces faces sont valides selon la norme DSTV
        } else if (['ENGRAVE', 'STAMP', 'LASER', 'PAINT'].includes(upperField)) {
          // Méthodes de marquage valides
        } else if (this.isFontName(field)) {
          // Nom de police valide
        } else {
          warnings.push(`Unknown optional field: ${field}`);
        }
      }
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
        face: data.face || 'web',
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