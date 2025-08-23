/**
 * Parser pour le bloc EN (End) - Bloc de fin de fichier DSTV
 * 
 * Selon la norme DSTV 7ème édition, le bloc EN marque la fin du fichier et peut contenir
 * des métadonnées optionnelles sur le traitement ou des checksums de validation.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Structure des données du bloc EN
 */
export interface ENBlockData {
  endMarker: boolean;
  processingTime?: number;     // Temps de traitement en secondes (optionnel)
  checksum?: string;          // Checksum de validation (optionnel)
  recordCount?: number;       // Nombre d'enregistrements traités (optionnel)
  errors?: number;           // Nombre d'erreurs détectées (optionnel)
  warnings?: number;         // Nombre d'avertissements (optionnel)
}

/**
 * Parser pour le bloc EN (End)
 */
export class ENBlockParser extends BaseStage<string[], ENBlockData> {
  readonly name = 'en-block-parser';
  readonly description = 'Parses DSTV EN (End) block according to official standard';

  /**
   * Parse un bloc EN
   */
  async process(input: string[]): Promise<ENBlockData> {
    const data: ENBlockData = {
      endMarker: true
    };

    // Le bloc EN peut être vide ou contenir des métadonnées optionnelles
    if (input.length > 0) {
      try {
        // Champ 0: Temps de traitement (optionnel)
        if (input[0] && input[0].trim() !== '') {
          const processingTime = parseFloat(input[0]);
          if (!isNaN(processingTime) && processingTime >= 0) {
            data.processingTime = processingTime;
          }
        }

        // Champ 1: Checksum (optionnel)
        if (input[1] && input[1].trim() !== '') {
          data.checksum = input[1].trim();
        }

        // Champ 2: Nombre d'enregistrements (optionnel)
        if (input[2] && input[2].trim() !== '') {
          const recordCount = parseInt(input[2]);
          if (!isNaN(recordCount) && recordCount >= 0) {
            data.recordCount = recordCount;
          }
        }

        // Champ 3: Nombre d'erreurs (optionnel)
        if (input[3] && input[3].trim() !== '') {
          const errors = parseInt(input[3]);
          if (!isNaN(errors) && errors >= 0) {
            data.errors = errors;
          }
        }

        // Champ 4: Nombre d'avertissements (optionnel)
        if (input[4] && input[4].trim() !== '') {
          const warnings = parseInt(input[4]);
          if (!isNaN(warnings) && warnings >= 0) {
            data.warnings = warnings;
          }
        }

      } catch (error) {
        // En cas d'erreur de parsing, on considère le bloc comme valide
        // mais sans métadonnées (le bloc EN est principalement un marqueur)
        console.warn('Warning parsing EN block metadata:', error);
      }
    }

    return data;
  }

  /**
   * Valide les données du bloc EN
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const data = await this.process(input);
    
      // Le bloc EN est toujours valide s'il marque la fin
      if (!data.endMarker) {
        errors.push('EN block must have endMarker set to true');
      }

      // Validation des métadonnées optionnelles
      if (data.processingTime !== undefined) {
        if (data.processingTime < 0) {
          warnings.push('Processing time should not be negative');
        }
        if (data.processingTime > 3600) { // Plus d'1 heure semble excessif
          warnings.push('Very large processing time detected');
        }
      }

      if (data.recordCount !== undefined && data.recordCount < 0) {
        warnings.push('Record count should not be negative');
      }

      if (data.errors !== undefined && data.errors < 0) {
        warnings.push('Error count should not be negative');
      }

      if (data.warnings !== undefined && data.warnings < 0) {
        warnings.push('Warning count should not be negative');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data
      };
    } catch (error) {
      errors.push(`Failed to parse EN block: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }
}