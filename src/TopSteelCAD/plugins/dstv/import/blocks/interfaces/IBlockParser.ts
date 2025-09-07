/**
 * Interface unifiée pour tous les parsers de blocs DSTV
 * Permet l'implémentation du pattern Factory
 */

import { DSTVBlockType } from '../../types/dstv-types';
import { ProcessingContext } from '../../../../../core/pipeline/ProcessingContext';

/**
 * Format standard pour les features
 */
export interface StandardFeatureFormat {
  type: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  parameters: Record<string, any>;
}

/**
 * Interface principale pour tous les parsers de blocs DSTV
 */
export interface IBlockParser<T = any> {
  readonly blockType: DSTVBlockType;
  readonly name: string;
  readonly description: string;
  
  /**
   * Parse les données brutes du bloc
   */
  parse(rawData: string[], context?: ProcessingContext): Promise<T>;
  
  /**
   * Valide les données du bloc
   */
  validate(rawData: string[]): Promise<ValidationResult>;
  
  /**
   * Convertit les données parsées en format standard (optionnel)
   */
  convertToStandardFormat?(data: T): StandardFeatureFormat;
}

/**
 * Résultat de validation d'un bloc
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

/**
 * Configuration de parser
 */
export interface ParserConfig {
  strictMode?: boolean;
  enableValidation?: boolean;
  enableDebugLogs?: boolean;
}

/**
 * Type pour les constructeurs de parsers
 */
export type ParserConstructor<T = any> = new (config?: ParserConfig) => IBlockParser<T>;