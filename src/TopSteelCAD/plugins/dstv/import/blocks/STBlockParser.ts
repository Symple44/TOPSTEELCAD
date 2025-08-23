/**
 * Parser pour le bloc ST (Start/Header) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Gère l'extraction complète des 16+ champs du profil DSTV selon la norme officielle.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';

/**
 * Structure complète des données d'un bloc ST
 * Basée sur la spécification DSTV 7ème édition et l'ancien parser existant
 */
export interface STBlockData {
  // Champs obligatoires selon la norme DSTV
  orderNumber: string;         // Numéro de commande
  drawingNumber: string;       // Numéro de plan
  phaseNumber: string;         // Numéro de phase
  pieceNumber: string;         // Numéro de pièce
  steelGrade: string;          // Nuance d'acier
  quantity: number;            // Quantité
  profileName: string;         // Désignation du profil
  profileType: string;         // Type de profil détecté
  
  // Dimensions physiques
  length: number;              // Longueur (mm)
  height: number;              // Hauteur du profil (mm)
  width: number;               // Largeur du profil (mm)
  webThickness: number;        // Épaisseur de l'âme (mm)
  flangeThickness: number;     // Épaisseur de l'aile (mm)
  radius?: number;             // Rayon (optionnel)
  
  // Propriétés calculées
  weight: number;              // Poids (kg)
  paintingSurface: number;     // Surface de peinture (m²)
  
  // Champs optionnels
  itemNumber?: string;         // Numéro d'article
  createdDate?: string;        // Date de création
  createdTime?: string;        // Heure de création
  reserved?: string;           // Champs réservés
}

/**
 * Parser pour le bloc ST - Version moderne intégrée
 */
export class STBlockParser extends BaseStage<string[], STBlockData> {
  readonly name = 'st-block-parser';
  readonly description = 'Parses DSTV ST (Start/Header) block according to official standard with legacy compatibility';

  /**
   * Parse un bloc ST moderne
   */
  async process(input: string[]): Promise<STBlockData> {
    if (input.length < 8) {
      throw new Error('ST block requires at least 8 fields according to DSTV standard');
    }

    this.log(undefined as any, 'debug', `Parsing ST block with ${input.length} fields`);

    const data: STBlockData = {
      // Champs obligatoires selon la norme (lignes 0-7)
      orderNumber: this.cleanField(input[0]),
      drawingNumber: this.cleanField(input[1]),
      phaseNumber: this.cleanField(input[2]),
      pieceNumber: this.cleanField(input[3]),
      steelGrade: this.cleanField(input[4]) || 'S235',
      quantity: this.parseNumber(input[5], 1),
      profileName: this.cleanField(input[6]),
      profileType: this.detectProfileType(input[6], input[7]),
      
      // Dimensions par défaut
      length: 0,
      height: 0,
      width: 0,
      webThickness: 0,
      flangeThickness: 0,
      weight: 0,
      paintingSurface: 0
    };

    // Parser les champs étendus selon l'ancien format
    this.parseExtendedFields(input, data);

    this.log(undefined as any, 'debug', `Parsed ST: ${data.profileName} (${data.profileType}), L=${data.length}mm`);

    return data;
  }

  /**
   * Parse les champs étendus selon l'ancien parser
   */
  private parseExtendedFields(input: string[], data: STBlockData): void {
    try {
      // Champ 7: Type de profil ou numéro de plan (legacy logic)
      if (input[7]) {
        const field7 = input[7].trim();
        if (this.isProfileTypeCode(field7)) {
          data.profileType = this.mapProfileTypeCode(field7);
        } else if (!field7.match(/^[IULTMR]$/)) {
          // Si ce n'est pas un code de profil, c'est un numéro de plan
          if (!data.drawingNumber || data.drawingNumber === '-') {
            data.drawingNumber = field7;
          }
        }
      }

      // Champs 8-12: Dimensions (selon ancien parser)
      if (input[8]) data.length = this.parseNumber(input[8], 0);
      if (input[9]) data.width = this.parseNumber(input[9], 0);
      if (input[10]) data.height = this.parseNumber(input[10], 0);
      if (input[11]) data.webThickness = this.parseNumber(input[11], 0);
      if (input[12]) data.flangeThickness = this.parseNumber(input[12], 0);

      // Champs 13-15: Propriétés calculées
      if (input[13]) data.weight = this.parseNumber(input[13], 0);
      if (input[14]) data.paintingSurface = this.parseNumber(input[14], 0);
      if (input[15]) data.radius = this.parseNumber(input[15], 0);

      // Champs optionnels supplémentaires
      if (input[16] && input[16] !== '-' && input[16] !== '0') {
        data.itemNumber = input[16];
      }

      // Dates de création si présentes
      if (input[17] && this.isDateLike(input[17])) {
        data.createdDate = input[17];
      }
      if (input[18] && this.isTimeLike(input[18])) {
        data.createdTime = input[18];
      }

      // Champs réservés
      const reservedFields = input.slice(19).filter(f => f && f !== '-' && f !== '0' && f.trim() !== '');
      if (reservedFields.length > 0) {
        data.reserved = reservedFields.join(' ');
      }

    } catch (error) {
      console.warn('Warning parsing extended ST fields:', error);
    }
  }

  /**
   * Nettoie un champ d'entrée
   */
  private cleanField(field: string): string {
    if (!field) return '';
    const cleaned = field.trim();
    return (cleaned === '-' || cleaned === '0') ? '' : cleaned;
  }

  /**
   * Parse un nombre avec valeur par défaut
   */
  private parseNumber(value: string, defaultValue: number): number {
    if (!value || value === '-') return defaultValue;
    const num = parseFloat(value.trim());
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Vérifie si une chaîne est un code de type de profil
   */
  private isProfileTypeCode(code: string): boolean {
    return /^[IULTMR]$/.test(code.toUpperCase());
  }

  /**
   * Mappe un code de type de profil
   */
  private mapProfileTypeCode(code: string): string {
    const mapping: Record<string, string> = {
      'I': 'I_PROFILE',
      'U': 'U_PROFILE', 
      'L': 'L_PROFILE',
      'T': 'T_PROFILE',
      'M': 'TUBE_RECT',
      'R': 'TUBE_ROUND'
    };
    return mapping[code.toUpperCase()] || 'UNKNOWN';
  }

  /**
   * Détecte le type de profil basé sur la désignation (logique de l'ancien parser)
   */
  private detectProfileType(designation: string, typeCode?: string): string {
    // D'abord vérifier le code de type si présent
    if (typeCode && this.isProfileTypeCode(typeCode)) {
      return this.mapProfileTypeCode(typeCode);
    }

    if (!designation) return 'UNKNOWN';
    
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
        (upper.startsWith('U') && upper.match(/^U\s*\d/))) {
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
    
    // Tubes génériques
    if (upper.startsWith('TUBE') || upper.includes('TUBE')) {
      if (upper.includes('RECT')) return 'TUBE_RECT';
      if (upper.includes('CIRC') || upper.includes('ROUND')) return 'TUBE_ROUND';
      return 'TUBE_RECT'; // Par défaut
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
    
    // Profils spéciaux
    if (upper.includes('CUSTOM') || upper.includes('SPECIAL')) {
      return 'CUSTOM';
    }

    return 'UNKNOWN';
  }

  /**
   * Vérifie si une chaîne ressemble à une date
   */
  private isDateLike(value: string): boolean {
    return /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value) || /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value);
  }

  /**
   * Vérifie si une chaîne ressemble à une heure
   */
  private isTimeLike(value: string): boolean {
    return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
  }

  /**
   * Valide les données du bloc ST
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const data = input as any as STBlockData;
    if (!data || typeof data !== 'object') {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Vérifications obligatoires selon la norme DSTV
    if (!data.orderNumber && !data.drawingNumber && !data.pieceNumber) {
      errors.push('At least one of orderNumber, drawingNumber, or pieceNumber must be specified');
    }

    if (!data.profileName) {
      errors.push('Profile name is required');
    }

    if (data.quantity <= 0) {
      errors.push('Quantity must be positive');
    }

    // Vérifications des dimensions
    if (data.length < 0) {
      errors.push('Length cannot be negative');
    }

    if (data.height < 0 || data.width < 0) {
      errors.push('Profile dimensions cannot be negative');
    }

    if (data.webThickness < 0 || data.flangeThickness < 0) {
      errors.push('Thickness values cannot be negative');
    }

    // Avertissements pour valeurs suspectes
    if (data.length > 50000) { // 50m
      warnings.push(`Very long profile: ${data.length}mm`);
    }

    if (data.height > 2000 || data.width > 2000) { // 2m
      warnings.push('Very large profile dimensions');
    }

    if (data.profileType === 'UNKNOWN') {
      warnings.push(`Unknown profile type for designation: ${data.profileName}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convertit vers le format standardisé moderne
   */
  convertToStandardFormat(data: STBlockData): {
    type: 'profile_header';
    data: Record<string, any>;
  } {
    return {
      type: 'profile_header',
      data: {
        // Métadonnées principales
        orderNumber: data.orderNumber,
        drawingNumber: data.drawingNumber,
        phaseNumber: data.phaseNumber,
        pieceNumber: data.pieceNumber,
        quantity: data.quantity,
        
        // Informations matériau
        steelGrade: data.steelGrade,
        
        // Profil
        profileName: data.profileName,
        profileType: data.profileType,
        
        // Dimensions
        dimensions: {
          length: data.length,
          height: data.height,
          width: data.width,
          webThickness: data.webThickness,
          flangeThickness: data.flangeThickness,
          radius: data.radius
        },
        
        // Propriétés calculées
        weight: data.weight,
        paintingSurface: data.paintingSurface,
        
        // Métadonnées optionnelles
        itemNumber: data.itemNumber,
        createdDate: data.createdDate,
        createdTime: data.createdTime,
        reserved: data.reserved
      }
    };
  }
}