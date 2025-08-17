/**
 * DSTVSyntaxParser - Parser syntaxique principal
 * Orchestre les différents parsers de blocs
 */

import { DSTVProfile } from '../types';
import { DSTVLexer } from '../lexer/DSTVLexer';
import { STBlockParser } from '../blocks/STBlockParser';
import { BOBlockParser } from '../blocks/BOBlockParser';
import { AKBlockParser } from '../blocks/AKBlockParser';
import { SIBlockParser } from '../blocks/SIBlockParser';

/**
 * Parser syntaxique principal pour DSTV
 */
export class DSTVSyntaxParser {
  private lexer: DSTVLexer;
  private stParser: STBlockParser;
  private boParser: BOBlockParser;
  private akParser: AKBlockParser;
  private siParser: SIBlockParser;

  constructor() {
    this.lexer = new DSTVLexer();
    this.stParser = new STBlockParser();
    this.boParser = new BOBlockParser();
    this.akParser = new AKBlockParser();
    this.siParser = new SIBlockParser();
  }

  /**
   * Parse le contenu DSTV en profils structurés
   */
  parse(content: string): DSTVProfile[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    // Tokenize the content
    const tokens = this.lexer.tokenize(content);
    
    if (tokens.length === 0) {
      return [];
    }

    const profiles: DSTVProfile[] = [];
    let currentProfile: DSTVProfile | null = null;
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      // Check for ST block start
      if (token.type === 'BLOCK_START' && token.value === 'ST') {
        // Save previous profile if exists
        if (currentProfile) {
          profiles.push(currentProfile);
        }

        // Parse ST block
        const stBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === 'BLOCK_END' || (tokens[i].type === 'BLOCK_START'))) {
          stBlockTokens.push(tokens[i]);
          i++;
        }

        // Create new profile from ST block
        const stData = this.stParser.parse(stBlockTokens);
        currentProfile = {
          designation: stData.designation,
          length: stData.length,
          profileType: stData.profileType,
          holes: [],
          cuts: [],
          markings: []
        };

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === 'BLOCK_END') {
          i++;
        }
      }
      // Check for BO block (holes)
      else if (token.type === 'BLOCK_START' && token.value === 'BO' && currentProfile) {
        const boBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === 'BLOCK_END' || tokens[i].type === 'BLOCK_START')) {
          boBlockTokens.push(tokens[i]);
          i++;
        }

        const holes = this.boParser.parse(boBlockTokens);
        currentProfile.holes = [...(currentProfile.holes || []), ...holes];

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === 'BLOCK_END') {
          i++;
        }
      }
      // Check for AK block (cuts)
      else if (token.type === 'BLOCK_START' && token.value === 'AK' && currentProfile) {
        const akBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === 'BLOCK_END' || tokens[i].type === 'BLOCK_START')) {
          akBlockTokens.push(tokens[i]);
          i++;
        }

        const cuts = this.akParser.parse(akBlockTokens);
        currentProfile.cuts = [...(currentProfile.cuts || []), ...cuts];

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === 'BLOCK_END') {
          i++;
        }
      }
      // Check for SI block (markings)
      else if (token.type === 'BLOCK_START' && token.value === 'SI' && currentProfile) {
        const siBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === 'BLOCK_END' || tokens[i].type === 'BLOCK_START')) {
          siBlockTokens.push(tokens[i]);
          i++;
        }

        const markings = this.siParser.parse(siBlockTokens);
        currentProfile.markings = [...(currentProfile.markings || []), ...markings];

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === 'BLOCK_END') {
          i++;
        }
      }
      else {
        i++;
      }
    }

    // Add the last profile if exists
    if (currentProfile) {
      profiles.push(currentProfile);
    }

    return profiles;
  }
}