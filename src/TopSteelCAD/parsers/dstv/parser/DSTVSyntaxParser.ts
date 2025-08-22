/**
 * DSTVSyntaxParser - Parser syntaxique principal
 * Orchestre les différents parsers de blocs
 */

import { DSTVProfile, DSTVToken, TokenType } from '../types';
import { STBlockParser } from '../blocks/STBlockParser';
import { BOBlockParser } from '../blocks/BOBlockParser';
import { AKBlockParser } from '../blocks/AKBlockParser';
import { SIBlockParser } from '../blocks/SIBlockParser';

/**
 * Parser syntaxique principal pour DSTV
 */
export class DSTVSyntaxParser {
  private stParser: STBlockParser;
  private boParser: BOBlockParser;
  private akParser: AKBlockParser;
  private siParser: SIBlockParser;

  constructor() {
    this.stParser = new STBlockParser();
    this.boParser = new BOBlockParser();
    this.akParser = new AKBlockParser();
    this.siParser = new SIBlockParser();
  }

  /**
   * Parse les tokens DSTV en profils structurés
   */
  parse(tokens: DSTVToken[]): DSTVProfile[] {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    const profiles: DSTVProfile[] = [];
    let currentProfile: DSTVProfile | null = null;
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      // Check for ST block start
      if (token.type === TokenType.BLOCK_START && token.value === 'ST') {
        // Save previous profile if exists
        if (currentProfile) {
          profiles.push(currentProfile);
        }

        // Parse ST block
        const stBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === TokenType.BLOCK_END || (tokens[i].type === TokenType.BLOCK_START))) {
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
          markings: [],
          // Ajouter toutes les données du ST block
          id: stData.id,
          orderNumber: stData.orderNumber,
          steelGrade: stData.steelGrade,
          weight: stData.weight,
          // Dimensions directement sur le profil
          width: stData.width,
          height: stData.height,
          webThickness: stData.webThickness,
          flangeThickness: stData.flangeThickness,
          metadata: {
            quantity: stData.quantity,
            itemNumber: stData.itemNumber,
            drawingNumber: stData.drawingNumber,
            radius: stData.radius,
            paintingSurface: stData.paintingSurface,
            reserved: stData.reserved
          }
        } as DSTVProfile;

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === TokenType.BLOCK_END) {
          i++;
        }
      }
      // Check for BO block (holes)
      else if (token.type === TokenType.BLOCK_START && token.value === 'BO' && currentProfile) {
        console.log('📍 Parsing BO block for profile:', currentProfile.designation);
        const boBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === TokenType.BLOCK_END || tokens[i].type === TokenType.BLOCK_START)) {
          boBlockTokens.push(tokens[i]);
          i++;
        }
        
        console.log(`  Collected ${boBlockTokens.length} tokens for BO block`);
        // Passer le contexte du profil pour l'interprétation des faces
        const profileContext = {
          profileType: currentProfile.profileType,
          length: currentProfile.length,
          width: currentProfile.width,
          height: currentProfile.height,
          webThickness: currentProfile.webThickness,
          flangeThickness: currentProfile.flangeThickness
        };
        const holes = this.boParser.parse(boBlockTokens, profileContext);
        console.log(`  Parsed ${holes.length} holes from BO block`);
        currentProfile.holes = [...(currentProfile.holes || []), ...holes];

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === TokenType.BLOCK_END) {
          i++;
        }
      }
      // Check for AK block (cuts)
      else if (token.type === TokenType.BLOCK_START && token.value === 'AK' && currentProfile) {
        const akBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === TokenType.BLOCK_END || tokens[i].type === TokenType.BLOCK_START)) {
          akBlockTokens.push(tokens[i]);
          i++;
        }

        // Passer le contexte du profil pour l'analyse des coupes
        const profileContext = {
          profileType: currentProfile.profileType,
          length: currentProfile.length,
          width: currentProfile.width,
          height: currentProfile.height,
          webThickness: currentProfile.webThickness,
          flangeThickness: currentProfile.flangeThickness
        };
        const cuts = this.akParser.parse(akBlockTokens, profileContext);
        console.log(`🔪 AK block parsed: ${cuts.length} cut(s) found`);
        currentProfile.cuts = [...(currentProfile.cuts || []), ...cuts];

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === TokenType.BLOCK_END) {
          i++;
        }
      }
      // Check for SI block (markings)
      else if (token.type === TokenType.BLOCK_START && token.value === 'SI' && currentProfile) {
        const siBlockTokens = [];
        i++;
        while (i < tokens.length && !(tokens[i].type === TokenType.BLOCK_END || tokens[i].type === TokenType.BLOCK_START)) {
          siBlockTokens.push(tokens[i]);
          i++;
        }

        const markings = this.siParser.parse(siBlockTokens);
        currentProfile.markings = [...(currentProfile.markings || []), ...markings];

        // Skip EN if present
        if (i < tokens.length && tokens[i].type === TokenType.BLOCK_END) {
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

// Export par défaut pour compatibilité ES modules
export default DSTVSyntaxParser;