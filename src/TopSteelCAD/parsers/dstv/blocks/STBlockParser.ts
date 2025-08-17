/**
 * STBlockParser - Parser pour les blocs ST (profils)
 * Gère l'extraction des informations de base des profils
 */

import { DSTVToken } from '../types';

export interface STBlockData {
  designation: string;
  length: number;
  profileType: string;
}

/**
 * Parser pour les blocs ST (Start)
 * Extrait les informations générales du profil
 */
export class STBlockParser {
  
  /**
   * Parse les tokens d'un bloc ST
   */
  parse(tokens: DSTVToken[]): STBlockData {
    let designation = '';
    let length = 0;
    let profileType = 'UNKNOWN';

    // Extract designation (first identifier or data)
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'IDENTIFIER' && !designation) {
        designation = token.value;
        profileType = this.detectProfileType(designation);
      } else if (token.type === 'NUMBER' && designation && length === 0) {
        length = parseFloat(token.value) || 0;
      }
    }

    return {
      designation,
      length,
      profileType
    };
  }

  /**
   * Détecte le type de profil basé sur la désignation
   */
  private detectProfileType(designation: string): string {
    const upper = designation.toUpperCase();

    // I-Profiles
    if (upper.startsWith('HEA') || upper.startsWith('HEB') || upper.startsWith('HEM') ||
        upper.startsWith('IPE') || upper.startsWith('IPN')) {
      return 'I_PROFILE';
    }

    // U-Profiles
    if (upper.startsWith('UPN') || upper.startsWith('UPE') || upper.startsWith('UAP') ||
        upper.startsWith('U')) {
      return 'U_PROFILE';
    }

    // L-Profiles
    if (upper.startsWith('L') && upper.includes('X')) {
      return 'L_PROFILE';
    }

    // Tubes
    if (upper.startsWith('RHS') || upper.startsWith('SHS') || upper.startsWith('CHS')) {
      return 'TUBE';
    }

    // Round bars
    if (upper.startsWith('RND') || upper.startsWith('ROND')) {
      return 'ROUND_BAR';
    }

    // Flat bars
    if (upper.startsWith('FL') || upper.startsWith('FB') || upper.startsWith('FLAT')) {
      return 'FLAT_BAR';
    }

    // Plates
    if (upper.startsWith('PL') || upper.startsWith('PLT') || upper.startsWith('PLATE')) {
      return 'PLATE';
    }

    return 'UNKNOWN';
  }
}