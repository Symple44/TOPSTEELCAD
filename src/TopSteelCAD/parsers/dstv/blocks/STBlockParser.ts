/**
 * STBlockParser - Parser pour les blocs ST (profils)
 * Gère l'extraction complète des 16 champs du profil DSTV
 */

import { DSTVToken, TokenType } from '../types';

/**
 * Structure complète des données d'un bloc ST
 * Basé sur la spécification DSTV standard
 */
export interface STBlockData {
  // Ligne 1: Order number / Numéro de commande
  orderNumber: string;
  // Ligne 2: Part ID / Identifiant de la pièce
  id: string;
  // Ligne 3: Quantity / Quantité
  quantity: number;
  // Ligne 4: Steel grade / Nuance d'acier
  steelGrade: string;
  // Ligne 5: Item number / Numéro d'article
  itemNumber: string;
  // Ligne 6: Profile designation / Désignation du profil
  designation: string;
  // Ligne 7: Drawing number / Numéro de plan (optionnel)
  drawingNumber?: string;
  // Ligne 8: Length / Longueur (mm)
  length: number;
  // Ligne 9: Profile height / Hauteur du profil (mm)
  height: number;
  // Ligne 10: Profile width / Largeur du profil (mm)
  width: number;
  // Ligne 11: Radius / Rayon (optionnel)
  radius?: number;
  // Ligne 12: Web thickness / Épaisseur de l'âme (mm)
  webThickness: number;
  // Ligne 13: Flange thickness / Épaisseur de l'aile (mm)
  flangeThickness: number;
  // Ligne 14: Weight / Poids (kg)
  weight: number;
  // Ligne 15: Painting surface / Surface de peinture (m²)
  paintingSurface: number;
  // Ligne 16: Reserved / Réservé (optionnel)
  reserved?: string;
  
  // Type de profil détecté
  profileType: string;
}

/**
 * Parser pour les blocs ST (Start)
 * Extrait les informations générales complètes du profil
 */
export class STBlockParser {
  
  /**
   * Parse les tokens d'un bloc ST
   * @param tokens - Les tokens du bloc ST (sans ST et EN)
   * @returns Les données complètes du profil
   */
  parse(tokens: DSTVToken[]): STBlockData {
    const data: Partial<STBlockData> = {
      profileType: 'UNKNOWN'
    };
    
    // Parser les tokens en ordre
    let dataIndex = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || token.type === TokenType.BLOCK_START || token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Traiter les valeurs en fonction de leur position
      const value = token.value.trim();
      
      switch (dataIndex) {
        case 0: // Order number
          data.orderNumber = value;
          break;
        case 1: // Part ID
          data.id = value;
          break;
        case 2: // Quantity
          data.quantity = this.parseNumber(value, 1);
          break;
        case 3: // Steel grade
          data.steelGrade = value;
          break;
        case 4: // Item number
          data.itemNumber = value;
          break;
        case 5: // Profile designation
          data.designation = value;
          data.profileType = this.detectProfileType(value);
          break;
        case 6: // Drawing number (optionnel)
          if (value && value !== '0' && value !== '') {
            data.drawingNumber = value;
          }
          break;
        case 7: // Length
          data.length = this.parseNumber(value, 0);
          break;
        case 8: // Height
          data.height = this.parseNumber(value, 0);
          break;
        case 9: // Width
          data.width = this.parseNumber(value, 0);
          break;
        case 10: // Radius (optionnel)
          if (value && value !== '0') {
            data.radius = this.parseNumber(value, 0);
          }
          break;
        case 11: // Web thickness
          data.webThickness = this.parseNumber(value, 0);
          break;
        case 12: // Flange thickness
          data.flangeThickness = this.parseNumber(value, 0);
          break;
        case 13: // Weight
          data.weight = this.parseNumber(value, 0);
          break;
        case 14: // Painting surface
          data.paintingSurface = this.parseNumber(value, 0);
          break;
        case 15: // Reserved (optionnel)
          if (value && value !== '0' && value !== '') {
            data.reserved = value;
          }
          break;
      }
      
      dataIndex++;
    }
    
    // Valeurs par défaut pour les champs manquants
    return {
      orderNumber: data.orderNumber || '',
      id: data.id || '',
      quantity: data.quantity || 1,
      steelGrade: data.steelGrade || 'S235',
      itemNumber: data.itemNumber || '',
      designation: data.designation || '',
      drawingNumber: data.drawingNumber,
      length: data.length || 0,
      height: data.height || 0,
      width: data.width || 0,
      radius: data.radius,
      webThickness: data.webThickness || 0,
      flangeThickness: data.flangeThickness || 0,
      weight: data.weight || 0,
      paintingSurface: data.paintingSurface || 0,
      reserved: data.reserved,
      profileType: data.profileType || 'UNKNOWN'
    };
  }
  
  /**
   * Parse un nombre avec valeur par défaut
   */
  private parseNumber(value: string, defaultValue: number): number {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Détecte le type de profil basé sur la désignation
   * Supporte les normes européennes et américaines
   */
  private detectProfileType(designation: string): string {
    const upper = designation.toUpperCase();

    // I-Profiles européens
    if (upper.startsWith('HEA') || upper.startsWith('HEB') || upper.startsWith('HEM') ||
        upper.startsWith('IPE') || upper.startsWith('IPN')) {
      return 'I_PROFILE';
    }
    
    // I-Profiles britanniques
    if (upper.startsWith('UB') || upper.startsWith('UC') || upper.startsWith('UBP')) {
      return 'I_PROFILE';
    }
    
    // I-Profiles américains
    if (upper.match(/^W\d+/) || upper.match(/^S\d+/) || upper.match(/^HP\d+/)) {
      return 'I_PROFILE';
    }

    // U-Profiles (Channels)
    if (upper.startsWith('UPN') || upper.startsWith('UPE') || upper.startsWith('UAP') ||
        upper.startsWith('U') && upper.match(/^U\s*\d/)) {
      return 'U_PROFILE';
    }
    
    // C-Profiles américains
    if (upper.match(/^C\d+/) || upper.match(/^MC\d+/)) {
      return 'U_PROFILE';
    }

    // L-Profiles (Angles)
    if (upper.startsWith('L') && upper.includes('X')) {
      return 'L_PROFILE';
    }

    // T-Profiles
    if (upper.startsWith('T') && upper.match(/^T\s*\d/)) {
      return 'T_PROFILE';
    }

    // Tubes rectangulaires
    if (upper.startsWith('RHS') || upper.startsWith('SHS')) {
      return 'TUBE_RECT';
    }
    
    // Tubes circulaires
    if (upper.startsWith('CHS') || upper.startsWith('PIPE')) {
      return 'TUBE_ROUND';
    }

    // Barres rondes
    if (upper.startsWith('RND') || upper.startsWith('ROND') || upper.startsWith('RD')) {
      return 'ROUND_BAR';
    }

    // Barres plates
    if (upper.startsWith('FL') || upper.startsWith('FB') || upper.startsWith('FLAT')) {
      return 'FLAT_BAR';
    }

    // Plaques
    if (upper.startsWith('PL') || upper.startsWith('PLT') || upper.startsWith('PLATE')) {
      return 'PLATE';
    }
    
    // Z-Profiles
    if (upper.startsWith('Z') && upper.match(/^Z\s*\d/)) {
      return 'Z_PROFILE';
    }
    
    // Profils spéciaux ou custom
    if (upper.includes('CUSTOM') || upper.includes('SPECIAL')) {
      return 'CUSTOM';
    }

    return 'UNKNOWN';
  }
}