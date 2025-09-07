/**
 * Adaptateurs pour rendre les parsers existants compatibles avec l'interface IBlockParser
 * Pattern Adapter pour la migration progressive
 */

import { DSTVBlockType, DSTVTokenType } from '../../types/dstv-types';
import { DSTVToken } from '../../stages/DSTVLexicalStage';
import { IBlockParser, ValidationResult, ParserConfig, StandardFeatureFormat } from '../interfaces/IBlockParser';
import { ProcessingContext } from '../../../../../core/pipeline/ProcessingContext';
import { BaseStage } from '../../../../../core/pipeline/BaseStage';
import { BaseBlockParser } from '../BaseBlockParser';

/**
 * Adaptateur pour les parsers basés sur BaseStage
 */
export class BaseStageParserAdapter<T> implements IBlockParser<T> {
  public readonly name: string;
  public readonly description: string;
  
  constructor(
    private parser: BaseStage<string[], T>,
    public readonly blockType: DSTVBlockType,
    private config?: ParserConfig
  ) {
    this.name = parser.name || blockType;
    this.description = parser.description || `Parser for ${blockType} block`;
  }
  
  async parse(rawData: string[], context?: ProcessingContext): Promise<T> {
    // Utiliser le contexte fourni ou en créer un nouveau
    const ctx = context || new ProcessingContext();
    
    try {
      // Appeler la méthode process du BaseStage
      const result = await this.parser.process(rawData, ctx);
      
      // Logger si debug activé
      if (this.config?.enableDebugLogs) {
        console.log(`[${this.blockType}] Parsed successfully:`, result);
      }
      
      return result;
    } catch (error) {
      // Logger l'erreur
      if (this.config?.enableDebugLogs) {
        console.error(`[${this.blockType}] Parse error:`, error);
      }
      throw error;
    }
  }
  
  async validate(rawData: string[]): Promise<ValidationResult> {
    // Vérifier si le parser a une méthode validate
    if ('validate' in this.parser && typeof (this.parser as any).validate === 'function') {
      try {
        const isValid = await (this.parser as any).validate(rawData);
        if (typeof isValid === 'boolean') {
          return {
            isValid,
            errors: isValid ? [] : ['Validation failed'],
            warnings: []
          };
        } else if (typeof isValid === 'object' && 'isValid' in isValid) {
          return isValid;
        }
      } catch (error: any) {
        return {
          isValid: false,
          errors: [error.message || 'Validation error'],
          warnings: []
        };
      }
    }
    
    // Validation par défaut basée sur la structure
    return this.defaultValidation(rawData);
  }
  
  private defaultValidation(rawData: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validation basique
    if (!rawData || rawData.length === 0) {
      errors.push('No data provided');
    }
    
    // Validation spécifique par type de bloc
    switch (this.blockType) {
      case DSTVBlockType.ST:
        if (rawData.length < 3) {
          errors.push('ST block requires at least 3 fields');
        }
        break;
      case DSTVBlockType.BO:
        if (rawData.length < 2) {
          errors.push('BO block requires at least 2 fields');
        }
        break;
      case DSTVBlockType.SI:
        if (rawData.length < 3) {
          errors.push('SI block requires at least 3 fields');
        }
        break;
      // Ajouter d'autres validations spécifiques si nécessaire
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  convertToStandardFormat(data: T): StandardFeatureFormat {
    // Vérifier si le parser original a cette méthode
    if ('convertToStandardFormat' in this.parser && 
        typeof (this.parser as any).convertToStandardFormat === 'function') {
      return (this.parser as any).convertToStandardFormat(data);
    }
    
    // Conversion par défaut
    return {
      type: 'generic',
      coordinates: { x: 0, y: 0, z: 0 },
      parameters: data as any
    };
  }
}

/**
 * Adaptateur pour les parsers basés sur BaseBlockParser
 */
export class BaseBlockParserAdapter<T> implements IBlockParser<T> {
  public readonly name: string;
  public readonly description: string;
  
  constructor(
    private parser: BaseBlockParser<T>,
    public readonly blockType: DSTVBlockType,
    private config?: ParserConfig
  ) {
    this.name = blockType;
    this.description = `Parser for ${blockType} block`;
  }
  
  async parse(rawData: string[], context?: ProcessingContext): Promise<T> {
    try {
      // Convertir les strings en tokens pour BaseBlockParser
      const tokens = this.convertToTokens(rawData);
      
      // Appeler la méthode parse du BaseBlockParser
      const result = await this.parser.parse(tokens);
      
      // Logger si debug activé
      if (this.config?.enableDebugLogs) {
        console.log(`[${this.blockType}] Parsed successfully:`, result);
      }
      
      return result;
    } catch (error) {
      // Logger l'erreur
      if (this.config?.enableDebugLogs) {
        console.error(`[${this.blockType}] Parse error:`, error);
      }
      throw error;
    }
  }
  
  async validate(rawData: string[]): Promise<ValidationResult> {
    // Vérifier si le parser a une méthode validate
    if ('validate' in this.parser && typeof (this.parser as any).validate === 'function') {
      try {
        const tokens = this.convertToTokens(rawData);
        const isValid = await (this.parser as any).validate(tokens);
        if (typeof isValid === 'boolean') {
          return {
            isValid,
            errors: isValid ? [] : ['Validation failed'],
            warnings: []
          };
        } else if (typeof isValid === 'object' && 'isValid' in isValid) {
          return isValid;
        }
      } catch (error: any) {
        return {
          isValid: false,
          errors: [error.message || 'Validation error'],
          warnings: []
        };
      }
    }
    
    // Validation par défaut
    return this.defaultValidation(rawData);
  }
  
  private convertToTokens(rawData: string[]): DSTVToken[] {
    return rawData.map((value, index) => ({
      type: this.detectTokenType(value),
      value,
      line: 0,
      column: index,
      length: value.length,
      raw: value
    }));
  }
  
  private detectTokenType(value: string): any {
    // Détecter le type de token basé sur la valeur
    if (!value || value.trim() === '') {
      return 'WHITESPACE';  // Utiliser la valeur string pour éviter le conflit
    }
    
    // Vérifier si c'est un nombre entier
    if (/^-?\d+$/.test(value)) {
      return 'INTEGER';
    }
    
    // Vérifier si c'est un nombre décimal
    if (/^-?\d+\.\d+$/.test(value)) {
      return 'FLOAT';
    }
    
    // Vérifier si c'est un identifiant de bloc
    if (/^[A-Z]{2}$/.test(value)) {
      return 'BLOCK_HEADER';
    }
    
    // Vérifier si c'est un commentaire
    if (value.startsWith('**')) {
      return 'COMMENT';
    }
    
    // Par défaut, c'est une chaîne
    return 'STRING';
  }
  
  private defaultValidation(rawData: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validation basique
    if (!rawData || rawData.length === 0) {
      errors.push('No data provided');
    }
    
    // Validation de format basique
    for (let i = 0; i < rawData.length; i++) {
      const field = rawData[i];
      if (field === null || field === undefined) {
        warnings.push(`Field ${i} is null or undefined`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  convertToStandardFormat(data: T): StandardFeatureFormat {
    // Conversion par défaut
    return {
      type: 'generic',
      coordinates: { x: 0, y: 0, z: 0 },
      parameters: data as any
    };
  }
}

/**
 * Adaptateur pour le GenericBlockParser
 */
export class GenericParserAdapter implements IBlockParser<any> {
  public readonly name: string = 'GenericParser';
  public readonly description: string = 'Generic parser for unknown block types';
  
  constructor(
    public readonly blockType: DSTVBlockType,
    private config?: ParserConfig
  ) {}
  
  async parse(rawData: string[], context?: ProcessingContext): Promise<any> {
    // Parser générique simple
    const result: any = {
      blockType: this.blockType,
      fields: rawData,
      raw: rawData.join(' ')
    };
    
    // Essayer d'extraire des données structurées
    if (rawData.length >= 2) {
      const [x, y, ...rest] = rawData;
      if (this.isNumeric(x) && this.isNumeric(y)) {
        result.coordinates = {
          x: parseFloat(x),
          y: parseFloat(y)
        };
        result.parameters = rest;
      }
    }
    
    return result;
  }
  
  async validate(rawData: string[]): Promise<ValidationResult> {
    const warnings: string[] = [];
    
    if (!rawData || rawData.length === 0) {
      return {
        isValid: false,
        errors: ['No data provided'],
        warnings
      };
    }
    
    warnings.push(`Using generic parser for block type ${this.blockType}`);
    
    return {
      isValid: true,
      errors: [],
      warnings
    };
  }
  
  private isNumeric(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }
}