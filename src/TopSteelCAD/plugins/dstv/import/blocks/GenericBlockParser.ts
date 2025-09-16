/**
 * GenericBlockParser - Parser générique pour les blocs DSTV simples
 * Utilisé pour les blocs moins courants
 */

// BaseBlockParser import removed - not used
import { DSTVToken as LexicalDSTVToken } from '../stages/DSTVLexicalStage';
import { DSTVToken, DSTVTokenType, DSTVBlockType } from '../types/dstv-types';
import { IBlockParser, ValidationResult, ParserConfig } from './interfaces/IBlockParser';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';

export interface GenericBlockData {
  type: string;
  values: number[];
  strings: string[];
  metadata?: Record<string, any>;
}

export class GenericBlockParser implements IBlockParser<GenericBlockData> {
  public readonly blockType: DSTVBlockType;
  public readonly name: string;
  public readonly description: string;
  private config?: ParserConfig;
  protected tokens: any[] = [];
  protected currentIndex: number = 0;
  
  constructor(blockType: string | DSTVBlockType, config?: ParserConfig) {
    this.blockType = blockType as DSTVBlockType;
    this.name = `Generic${blockType}Parser`;
    this.description = `Generic parser for ${blockType} blocks`;
    this.config = config;
  }
  
  /**
   * Parse depuis des données brutes (interface IBlockParser)
   */
  async parse(rawData: string[] | DSTVToken[] | LexicalDSTVToken[], _context?: ProcessingContext): Promise<GenericBlockData> {
    // Si on reçoit des strings, les convertir en tokens
    const tokens = this.isTokenArray(rawData) 
      ? rawData as DSTVToken[]
      : this.convertToTokens(rawData as string[]);
    
    return this.parseTokens(tokens);
  }
  
  /**
   * Parse pour BaseBlockParser (méthode héritée)
   */
  parseBaseBlock(tokens: LexicalDSTVToken[]): GenericBlockData {
    // Convertir les tokens du format Lexical au format standard
    const standardTokens = tokens.map(t => ({
      ...t,
      type: this.mapLexicalTokenType(t.type)
    })) as DSTVToken[];
    return this.parseTokens(standardTokens);
  }
  
  /**
   * Parse des tokens (méthode existante)
   */
  private parseTokens(tokens: DSTVToken[]): GenericBlockData {
    // Convertir les tokens au format attendu
    const lexicalTokens = tokens as any[];
    this.tokens = lexicalTokens;
    this.currentIndex = 0;
    
    const values: number[] = [];
    const strings: string[] = [];
    
    for (const token of this.tokens) {
      // Utiliser des comparaisons de strings pour éviter les conflits de types
      const tokenType = token.type as string;
      if (tokenType === 'FLOAT' || tokenType === 'INTEGER') {
        values.push(Number(token.value));
      } else if (tokenType === 'IDENTIFIER' || tokenType === 'STRING') {
        strings.push(String(token.value));
      }
    }
    
    return {
      type: this.blockType,
      values: values,
      strings: strings,
      metadata: {}
    };
  }
  
  /**
   * Valide les données du bloc
   */
  async validate(rawData: string[]): Promise<ValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!rawData || rawData.length === 0) {
      errors.push('No data provided for generic block');
    }
    
    // Avertissement pour l'utilisation du parser générique
    warnings.push(`Using generic parser for block type ${this.blockType}`);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Vérifie si les données sont des tokens
   */
  private isTokenArray(data: any[]): boolean {
    return data.length > 0 && 'type' in data[0] && 'value' in data[0];
  }
  
  /**
   * Convertit des strings en tokens
   */
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
  
  /**
   * Détecte le type de token
   */
  private detectTokenType(value: string): DSTVTokenType {
    if (!value || value.trim() === '') {
      return DSTVTokenType.EMPTY;
    }
    
    if (/^-?\d+$/.test(value)) {
      return DSTVTokenType.INTEGER;
    }
    
    if (/^-?\d+\.\d+$/.test(value)) {
      return DSTVTokenType.FLOAT;
    }
    
    if (/^[A-Z]{2}$/.test(value)) {
      return DSTVTokenType.BLOCK_ID;
    }
    
    return DSTVTokenType.STRING;
  }
  
  /**
   * Mappe les types de tokens Lexical vers les types standard
   */
  private mapLexicalTokenType(lexicalType: any): DSTVTokenType {
    // Map depuis le type DSTVTokenType du module DSTVLexicalStage
    const mapping: Record<string, DSTVTokenType> = {
      'INTEGER': DSTVTokenType.INTEGER,
      'FLOAT': DSTVTokenType.FLOAT,
      'STRING': DSTVTokenType.STRING,
      'IDENTIFIER': DSTVTokenType.IDENTIFIER,
      'BLOCK_HEADER': DSTVTokenType.BLOCK_ID,
      'COMMENT': DSTVTokenType.COMMENT,
      'NEWLINE': DSTVTokenType.NEWLINE,
      'WHITESPACE': DSTVTokenType.EMPTY,
      'DELIMITER': DSTVTokenType.STRING,
      'COORDINATE': DSTVTokenType.COORDINATE,
      'EOF': DSTVTokenType.EOF
    };
    
    return mapping[lexicalType] || DSTVTokenType.UNKNOWN;
  }
}

// Créer des alias pour les blocs restants
export class EBBlockParser extends GenericBlockParser {
  constructor() { super('EB'); }
}

export class VBBlockParser extends GenericBlockParser {
  constructor() { super('VB'); }
}

export class GRBlockParser extends GenericBlockParser {
  constructor() { super('GR'); }
}

export class FBBlockParser extends GenericBlockParser {
  constructor() { super('FB'); }
}

export class BFBlockParser extends GenericBlockParser {
  constructor() { super('BF'); }
}

export class KLBlockParser extends GenericBlockParser {
  constructor() { super('KL'); }
}

export class KNBlockParser extends GenericBlockParser {
  constructor() { super('KN'); }
}

export class ROBlockParser extends GenericBlockParser {
  constructor() { super('RO'); }
}