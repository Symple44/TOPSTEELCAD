/**
 * FPBlockParser - Parser pour les blocs FP (Free Program)
 * Gère les programmes libres et codes personnalisés
 */

import { BaseBlockParser } from './BaseBlockParser';
import { DSTVToken, DSTVTokenType } from '../stages/DSTVLexicalStage';

export interface FPBlockData {
  programType: string;      // Type de programme
  programCode: string[];    // Lignes de code du programme
  language: string;         // Langage (GCODE, ISO, etc.)
  parameters?: Record<string, any>;  // Paramètres du programme
}

export class FPBlockParser extends BaseBlockParser<FPBlockData> {
  
  parse(tokens: DSTVToken[]): FPBlockData {
    this.tokens = tokens; // On garde tous les tokens pour le programme libre
    this.reset();
    
    const language = this.detectLanguage();
    const programCode = this.extractProgramCode();
    
    return {
      programType: 'FREE',
      programCode: programCode,
      language: language,
      parameters: this.extractParameters()
    };
  }
  
  private detectLanguage(): string {
    // Détection du langage basée sur les premiers tokens
    for (const token of this.tokens.slice(0, 5)) {
      const val = String(token.value).toUpperCase();
      if (val.includes('G') || val.includes('M')) return 'GCODE';
      if (val.includes('ISO')) return 'ISO';
      if (val.includes('FANUC')) return 'FANUC';
    }
    return 'GENERIC';
  }
  
  private extractProgramCode(): string[] {
    const code: string[] = [];
    let inProgram = false;
    
    for (const token of this.tokens) {
      if (token.type === DSTVTokenType.BLOCK_HEADER) {
        inProgram = true;
        continue;
      }
      if (token.type === DSTVTokenType.NEWLINE && token.value === '**') {
        break;
      }
      if (inProgram && token.type === DSTVTokenType.STRING) {
        code.push(String(token.value));
      }
    }
    return code;
  }
  
  private extractParameters(): Record<string, any> {
    const params: Record<string, any> = {};
    // Extraction basique des paramètres
    let key: string | null = null;
    
    for (const token of this.tokens) {
      if (token.type === DSTVTokenType.IDENTIFIER && !key) {
        key = token.value;
      } else if (key && (token.type === DSTVTokenType.INTEGER || token.type === DSTVTokenType.FLOAT)) {
        params[key] = token.value;
        key = null;
      }
    }
    return params;
  }
}