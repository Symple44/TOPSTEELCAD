/**
 * GenericBlockParser - Parser générique pour les blocs DSTV simples
 * Utilisé pour les blocs moins courants
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken, DSTVTokenType } from '../stages/DSTVLexicalStage';

export interface GenericBlockData {
  type: string;
  values: number[];
  strings: string[];
  metadata?: Record<string, any>;
}

export class GenericBlockParser extends BaseBlockParser<GenericBlockData> {
  private blockType: string;
  
  constructor(blockType: string) {
    super();
    this.blockType = blockType;
  }
  
  parse(tokens: DSTVToken[]): GenericBlockData {
    this.tokens = this.filterDataTokens(tokens);
    this.reset();
    
    const values: number[] = [];
    const strings: string[] = [];
    
    for (const token of this.tokens) {
      if (token.type === DSTVTokenType.FLOAT || token.type === DSTVTokenType.INTEGER) {
        values.push(Number(token.value));
      } else if (token.type === DSTVTokenType.IDENTIFIER || token.type === DSTVTokenType.STRING) {
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