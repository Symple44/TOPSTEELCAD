/**
 * Stage d'analyse lexicale DSTV
 * 
 * Première étape du pipeline - tokenise le fichier DSTV brut selon la grammaire officielle.
 * Conforme à la norme DSTV 7ème édition (Juillet 1998).
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';
import { DSTVTokens } from '../DSTVImportPipeline';

/**
 * Types de tokens DSTV selon la norme officielle
 */
export enum DSTVTokenType {
  // Blocs principaux
  BLOCK_HEADER = 'BLOCK_HEADER',      // ST, BO, AK, IK, SI, SC, EN, etc.
  
  // Données numériques
  INTEGER = 'INTEGER',                 // Entiers
  FLOAT = 'FLOAT',                    // Nombres décimaux
  COORDINATE = 'COORDINATE',          // Coordonnées (x, y, z)
  
  // Chaînes de caractères
  STRING = 'STRING',                  // Chaînes libres
  IDENTIFIER = 'IDENTIFIER',          // Identifiants (noms de profils, etc.)
  
  // Séparateurs et contrôle
  NEWLINE = 'NEWLINE',               // Fin de ligne
  WHITESPACE = 'WHITESPACE',         // Espaces
  COMMENT = 'COMMENT',               // Commentaires (non standard)
  
  // Caractères spéciaux DSTV
  DELIMITER = 'DELIMITER',           // Délimiteurs de champs
  
  // Erreurs
  ERROR = 'ERROR',                   // Token invalide
  EOF = 'EOF'                        // Fin de fichier
}

/**
 * Token DSTV avec métadonnées
 */
export interface DSTVToken {
  type: DSTVTokenType;
  value: string;
  line: number;
  column: number;
  length: number;
  raw: string; // Valeur brute avant normalisation
}

/**
 * Configuration du lexer DSTV
 */
interface DSTVLexicalConfig {
  allowComments?: boolean;           // Autoriser commentaires (extension non standard)
  normalizeWhitespace?: boolean;     // Normaliser les espaces
  strictBlockNames?: boolean;        // Validation stricte des noms de blocs
}

/**
 * Stage d'analyse lexicale DSTV
 */
export class DSTVLexicalStage extends BaseStage<ArrayBuffer, DSTVTokens> {
  readonly name = 'dstv-lexical-analysis';
  readonly description = 'DSTV Lexical Analysis - Tokenizes DSTV file according to official grammar';
  readonly estimatedDuration = 100; // 100ms en moyenne

  private lexicalConfig: DSTVLexicalConfig;

  constructor(config: any = {}) {
    super(config);
    
    this.lexicalConfig = {
      allowComments: true,           // Activé pour supporter les commentaires ** générés par certains logiciels
      normalizeWhitespace: true,     // Normaliser selon la norme
      strictBlockNames: true,        // Validation stricte par défaut
      ...config.lexical
    };
  }

  /**
   * Analyse lexicale principale
   */
  async process(input: ArrayBuffer, context: ProcessingContext): Promise<DSTVTokens> {
    const stopTimer = this.startTimer();
    
    try {
      // Décoder le fichier en UTF-8 (standard DSTV)
      const content = new TextDecoder('utf-8').decode(input);
      this.log(context, 'info', `Starting lexical analysis`, {
        fileSize: input.byteLength,
        contentLength: content.length
      });

      // Tokenisation
      const tokens = await this.tokenize(content, context);
      
      // Statistiques
      const metadata = this.generateMetadata(tokens, content);
      
      const duration = stopTimer();
      context.addMetric('lexical_analysis_duration', duration);
      context.addMetric('tokens_generated', tokens.length);
      
      this.log(context, 'info', `Lexical analysis completed`, {
        tokensGenerated: tokens.length,
        duration: `${duration.toFixed(2)}ms`,
        blocksDetected: metadata.blockCount
      });

      return {
        tokens,
        metadata
      };

    } catch (error) {
      const duration = stopTimer();
      context.addMetric('lexical_analysis_duration', duration);
      context.addMetric('lexical_analysis_error', true);
      
      this.log(context, 'error', `Lexical analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Tokenisation du contenu DSTV
   */
  private async tokenize(content: string, context: ProcessingContext): Promise<DSTVToken[]> {
    const tokens: DSTVToken[] = [];
    const lines = content.split(/\r?\n/);
    
    let lineNumber = 1;
    let totalTokens = 0;

    for (const line of lines) {
      const lineTokens = this.tokenizeLine(line, lineNumber, context);
      tokens.push(...lineTokens);
      totalTokens += lineTokens.length;
      lineNumber++;

      // Progress reporting pour gros fichiers
      if (lineNumber % 1000 === 0) {
        context.addMetric('lexical_progress', lineNumber / lines.length);
      }
    }

    // Token EOF final
    tokens.push({
      type: DSTVTokenType.EOF,
      value: '',
      line: lineNumber,
      column: 1,
      length: 0,
      raw: ''
    });

    return tokens;
  }

  /**
   * Tokenise une ligne spécifique
   */
  private tokenizeLine(line: string, lineNumber: number, context: ProcessingContext): DSTVToken[] {
    const tokens: DSTVToken[] = [];
    let column = 1;
    let position = 0;

    while (position < line.length) {
      const char = line[position];
      
      // Ignorer les espaces en début/fin selon config
      if (this.isWhitespace(char)) {
        if (this.lexicalConfig.normalizeWhitespace) {
          position++;
          column++;
          continue;
        } else {
          const whitespace = this.consumeWhitespace(line, position);
          tokens.push({
            type: DSTVTokenType.WHITESPACE,
            value: whitespace.value,
            line: lineNumber,
            column,
            length: whitespace.length,
            raw: whitespace.value
          });
          position += whitespace.length;
          column += whitespace.length;
          continue;
        }
      }

      // Détecter le type de token
      let token: DSTVToken | null = null;

      // Bloc DSTV (début de ligne, 2 caractères majuscules)
      if (column === 1 && this.isBlockHeader(line, position)) {
        token = this.consumeBlockHeader(line, position, lineNumber, column);
      }
      // Nombre (entier ou décimal)
      else if (this.isNumericStart(char)) {
        token = this.consumeNumber(line, position, lineNumber, column);
      }
      // Chaîne de caractères ou identifiant
      else if (this.isAlphaStart(char)) {
        token = this.consumeString(line, position, lineNumber, column);
      }
      // Commentaire (extension non standard)
      // Support des commentaires DSTV qui commencent par ** ou #
      else if ((char === '#' || (char === '*' && line[position + 1] === '*')) && this.lexicalConfig.allowComments) {
        token = this.consumeComment(line, position, lineNumber, column);
      }
      // Caractères spéciaux ou erreur
      else {
        token = this.consumeSpecialCharacter(line, position, lineNumber, column, context);
      }

      if (token) {
        tokens.push(token);
        position += token.length;
        column += token.length;
      } else {
        // Caractère non reconnu - créer token d'erreur
        tokens.push({
          type: DSTVTokenType.ERROR,
          value: char,
          line: lineNumber,
          column,
          length: 1,
          raw: char
        });
        position++;
        column++;
        
        context.addWarning(`Unrecognized character '${char}' at line ${lineNumber}, column ${column}`);
      }
    }

    // Ajouter token newline à la fin de chaque ligne
    if (line.length > 0) {
      tokens.push({
        type: DSTVTokenType.NEWLINE,
        value: '\n',
        line: lineNumber,
        column: line.length + 1,
        length: 1,
        raw: '\n'
      });
    }

    return tokens;
  }

  /**
   * Détecte si c'est un header de bloc DSTV
   */
  private isBlockHeader(line: string, position: number): boolean {
    if (position !== 0) return false;
    
    const blockCandidate = line.substring(0, 2).toUpperCase();
    const knownBlocks = [
      'ST', 'BO', 'AK', 'IK', 'SI', 'SC', 'EN', 
      'PU', 'KO', 'TO', 'UE', 'PR', 'KA',
      'E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9',
      'IN'
    ];

    return knownBlocks.includes(blockCandidate);
  }

  /**
   * Consomme un header de bloc
   */
  private consumeBlockHeader(line: string, position: number, lineNumber: number, column: number): DSTVToken {
    const blockType = line.substring(position, position + 2).toUpperCase();
    
    return {
      type: DSTVTokenType.BLOCK_HEADER,
      value: blockType,
      line: lineNumber,
      column,
      length: 2,
      raw: line.substring(position, position + 2)
    };
  }

  /**
   * Consomme un nombre (entier ou décimal)
   */
  private consumeNumber(line: string, position: number, lineNumber: number, column: number): DSTVToken {
    let endPos = position;
    let hasDecimalPoint = false;
    let hasSign = false;

    // Sign optionnel au début
    if (line[endPos] === '+' || line[endPos] === '-') {
      hasSign = true;
      endPos++;
    }

    // Chiffres et point décimal
    while (endPos < line.length) {
      const char = line[endPos];
      
      if (char >= '0' && char <= '9') {
        endPos++;
      } else if (char === '.' && !hasDecimalPoint) {
        hasDecimalPoint = true;
        endPos++;
      } else {
        break;
      }
    }
    
    // Ignorer les suffixes comme 'u', 'r', etc. (unités ou indicateurs)
    // Ces suffixes sont parfois présents dans les fichiers DSTV
    while (endPos < line.length && /[a-zA-Z]/.test(line[endPos])) {
      endPos++;
    }

    // Extraire uniquement la partie numérique
    let numericValue = line.substring(position, endPos);
    // Supprimer les lettres du suffixe pour obtenir le nombre pur
    numericValue = numericValue.replace(/[a-zA-Z]+$/, '');
    
    const tokenType = hasDecimalPoint ? DSTVTokenType.FLOAT : DSTVTokenType.INTEGER;

    return {
      type: tokenType,
      value: numericValue,
      line: lineNumber,
      column,
      length: endPos - position,
      raw: line.substring(position, endPos)
    };
  }

  /**
   * Consomme une chaîne ou un identifiant
   */
  private consumeString(line: string, position: number, lineNumber: number, column: number): DSTVToken {
    let endPos = position;

    // Consommer caractères alphanumériques et certains spéciaux
    while (endPos < line.length) {
      const char = line[endPos];
      
      if (this.isAlphaNumeric(char) || char === '_' || char === '-' || char === '.') {
        endPos++;
      } else {
        break;
      }
    }

    const value = line.substring(position, endPos);
    
    // Déterminer si c'est un identifiant spécifique ou une string générique
    const tokenType = this.isIdentifier(value) ? DSTVTokenType.IDENTIFIER : DSTVTokenType.STRING;

    return {
      type: tokenType,
      value: value,
      line: lineNumber,
      column,
      length: endPos - position,
      raw: value
    };
  }

  /**
   * Consomme un commentaire (extension)
   */
  private consumeComment(line: string, position: number, lineNumber: number, column: number): DSTVToken {
    const value = line.substring(position); // Reste de la ligne
    
    return {
      type: DSTVTokenType.COMMENT,
      value: value,
      line: lineNumber,
      column,
      length: value.length,
      raw: value
    };
  }

  /**
   * Consomme un caractère spécial
   */
  private consumeSpecialCharacter(line: string, position: number, lineNumber: number, column: number, context: ProcessingContext): DSTVToken {
    const char = line[position];
    
    // Délimiteurs DSTV (espaces, tabs principalement)
    if (char === '\t') {
      return {
        type: DSTVTokenType.DELIMITER,
        value: char,
        line: lineNumber,
        column,
        length: 1,
        raw: char
      };
    }

    // Caractère non reconnu
    return {
      type: DSTVTokenType.ERROR,
      value: char,
      line: lineNumber,
      column,
      length: 1,
      raw: char
    };
  }

  /**
   * Consomme les espaces
   */
  private consumeWhitespace(line: string, position: number): { value: string; length: number } {
    let endPos = position;
    
    while (endPos < line.length && this.isWhitespace(line[endPos])) {
      endPos++;
    }
    
    return {
      value: line.substring(position, endPos),
      length: endPos - position
    };
  }

  /**
   * Génère les métadonnées de tokenisation
   */
  private generateMetadata(tokens: DSTVToken[], content: string): DSTVTokens['metadata'] {
    const blockTokens = tokens.filter(t => t.type === DSTVTokenType.BLOCK_HEADER);
    const lines = content.split(/\r?\n/).length;
    
    return {
      totalLines: lines,
      totalTokens: tokens.length,
      blockCount: blockTokens.length
    };
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t';
  }

  private isNumericStart(char: string): boolean {
    return (char >= '0' && char <= '9') || char === '+' || char === '-' || char === '.';
  }

  private isAlphaStart(char: string): boolean {
    return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlphaStart(char) || (char >= '0' && char <= '9');
  }

  private isIdentifier(value: string): boolean {
    // Identifiants typiques DSTV: noms de profils, matériaux, etc.
    const identifierPatterns = [
      /^[A-Z]{2,}$/, // Codes majuscules (IPE, HEB, etc.)
      /^[A-Z]\d+/, // Codes avec chiffres (S235, etc.)
      /^\d+[A-Z]+/ // Chiffres + lettres
    ];
    
    return identifierPatterns.some(pattern => pattern.test(value));
  }
}