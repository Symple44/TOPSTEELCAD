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
    
    // Reconstruire les lignes complètes à partir des tokens
    const lines: string[] = [];
    let currentLine = '';
    let lastLineNumber = -1;
    
    console.log('📋 Parsing ST block with', tokens.length, 'tokens');
    
    for (const token of tokens) {
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || token.type === TokenType.BLOCK_START || token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Si on change de ligne, ajouter la ligne courante
      if (token.line !== lastLineNumber && currentLine) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      
      // Ajouter le token à la ligne courante
      if (currentLine) currentLine += ' ';
      currentLine += token.value;
      lastLineNumber = token.line;
    }
    
    // Ajouter la dernière ligne
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    
    console.log('📋 Reconstructed lines:', lines.length);
    
    // Parser les lignes reconstruites
    for (let dataIndex = 0; dataIndex < lines.length; dataIndex++) {
      const value = lines[dataIndex];
      
      // Log pour debug des tubes
      if (dataIndex >= 6 && dataIndex <= 13) {
        console.log(`  Line ${dataIndex}: "${value}"`);
      }
      
      switch (dataIndex) {
        case 0: // Skip first field (often empty or '-')
          break;
        case 1: // Order number / ID commande
          data.orderNumber = value;
          break;
        case 2: // Part ID / ID pièce
          data.id = value;
          break;
        case 3: // Part ID repetition
          if (value !== data.id && value !== '-') {
            data.itemNumber = value;
          }
          break;
        case 4: // Steel grade / Nuance acier
          data.steelGrade = value;
          break;
        case 5: // Quantity (optional)
          data.quantity = this.parseNumber(value, 1);
          break;
        case 6: // Profile designation / Désignation profil (peut contenir des espaces)
          data.designation = value;
          data.profileType = this.detectProfileType(value);
          console.log(`  -> Profile designation: "${value}", type: ${data.profileType}`);
          break;
        case 7: // Profile type letter (I, U, L, M, etc.) or drawing number
          // Handle profile type codes
          if (value === 'M') {
            // M = Tube rectangulaire (code spécifique DSTV)
            data.profileType = 'TUBE_RECT';
            console.log('🔍 Profile type code detected: M -> TUBE_RECT');
          } else if (value === 'R') {
            // R = Tube rond
            data.profileType = 'TUBE_ROUND';
          } else if (value === 'I') {
            data.profileType = 'I_PROFILE';
          } else if (value === 'U') {
            data.profileType = 'U_PROFILE';
          } else if (value === 'L') {
            data.profileType = 'L_PROFILE';
          } else if (value === 'T') {
            data.profileType = 'T_PROFILE';
          } else if (value && !value.match(/^[IULTMR]$/)) {
            // Si ce n'est pas un code de profil connu, c'est un numéro de plan
            data.drawingNumber = value;
          }
          break;
        case 8: // Longueur (359.37 dans F1000.nc)
          data.length = this.parseNumber(value, 0);
          console.log(`  -> Length: ${data.length}`);
          break;
        case 9: // Largeur (100.00 dans F1000.nc)
          data.width = this.parseNumber(value, 0);
          console.log(`  -> Width: ${data.width}`);
          break;
        case 10: // Hauteur (50.00 dans F1000.nc)
          data.height = this.parseNumber(value, 0);
          console.log(`  -> Height: ${data.height}`);
          break;
        case 11: // Épaisseur 1 (5.00 dans F1000.nc - épaisseur des parois)
          const thickness1 = this.parseNumber(value, 0);
          data.webThickness = thickness1;
          console.log(`  -> Web/Wall thickness: ${thickness1}`);
          break;
        case 12: // Épaisseur 2 (5.00 dans F1000.nc - peut être identique pour tubes)
          const thickness2 = this.parseNumber(value, 0);
          data.flangeThickness = thickness2;
          console.log(`  -> Flange thickness: ${thickness2}`);
          break;
        case 13: // Flange thickness / Épaisseur de l'aile
          data.flangeThickness = this.parseNumber(value, 0);
          break;
        case 14: // Weight / Poids
          data.weight = this.parseNumber(value, 0);
          break;
        case 15: // Painting surface / Surface peinture
          data.paintingSurface = this.parseNumber(value, 0);
          break;
        case 16: // Reserved 1
        case 17: // Reserved 2
        case 18: // Reserved 3
        case 19: // Reserved 4
        case 20: // Reserved 5
          // Skip reserved fields
          break;
        case 21: // Additional info
        case 22: // Additional info
          if (value && value !== '0' && value !== '-' && value !== '') {
            if (!data.reserved) data.reserved = value;
            else data.reserved += ' ' + value;
          }
          break;
      }
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
    if (upper.startsWith('RHS') || upper.startsWith('SHS') || upper.startsWith('TUBE RECT')) {
      return 'TUBE_RECT';
    }
    
    // Tubes circulaires
    if (upper.startsWith('CHS') || upper.startsWith('PIPE') || upper.startsWith('TUBE CIRC')) {
      return 'TUBE_ROUND';
    }
    
    // Tubes génériques (vérifier les dimensions pour déterminer le type)
    if (upper.startsWith('TUBE') || upper.includes('TUBE')) {
      // Si "rect" ou "rectangular" dans la désignation
      if (upper.includes('RECT')) {
        return 'TUBE_RECT';
      }
      // Si "circ" ou "round" dans la désignation
      if (upper.includes('CIRC') || upper.includes('ROUND')) {
        return 'TUBE_ROUND';
      }
      // Par défaut, considérer comme rectangulaire si non spécifié
      return 'TUBE_RECT';
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

// Export par défaut pour compatibilité ES modules
export default STBlockParser;