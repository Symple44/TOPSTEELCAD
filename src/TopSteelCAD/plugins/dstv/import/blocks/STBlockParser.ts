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
  wallThickness?: number;      // Épaisseur de paroi (tubes)
  thickness?: number;          // Épaisseur (pour plaques)
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
   * Parse un bloc ST avec une logique simplifiée et robuste
   */
  async process(input: string[]): Promise<STBlockData> {
    if (input.length < 8) {
      throw new Error('ST block requires at least 8 fields according to DSTV standard');
    }

    this.log(undefined as any, 'debug', `Parsing ST block with ${input.length} fields`);
    
    // DEBUG: Logging pour analyse
    console.log('🔍 ST Block raw input:');
    for (let i = 0; i < Math.min(15, input.length); i++) {
      console.log(`  [${i}]: "${input[i]}"`);
    }

    // Analyser et nettoyer les données du ST
    const parsedData = this.parseSTBlockStructure(input);
    
    console.log(`🎯 Detected profileType: "${parsedData.profileType}" for profile "${parsedData.profileName}"`);
    console.log(`📊 Parsed dimensions: L=${parsedData.length}, H=${parsedData.height}, W=${parsedData.width}`);
    
    this.log(undefined as any, 'debug', `Parsed ST: ${parsedData.profileName} (${parsedData.profileType}), L=${parsedData.length}mm, H=${parsedData.height}mm, W=${parsedData.width}mm`);

    return parsedData;
  }

  /**
   * Nouvelle méthode simplifiée pour parser la structure du bloc ST
   */
  private parseSTBlockStructure(input: string[]): STBlockData {
    // Initialiser avec les valeurs par défaut
    const data: STBlockData = {
      orderNumber: this.cleanField(input[0]),
      drawingNumber: this.cleanField(input[1]),
      phaseNumber: this.cleanField(input[2]),
      pieceNumber: this.cleanField(input[3]),
      steelGrade: this.cleanField(input[4]) || 'S235',
      quantity: this.parseNumber(input[5], 1),
      profileName: '',
      profileType: 'UNKNOWN',
      length: 0,
      height: 0,
      width: 0,
      webThickness: 0,
      flangeThickness: 0,
      weight: 0,
      paintingSurface: 0
    };

    // Détecter le format et extraire le nom du profil et le type
    const profileInfo = this.detectProfileFormat(input);
    data.profileName = profileInfo.name;
    data.profileType = profileInfo.type;

    // Parser les dimensions selon le type de profil détecté
    this.parseDimensions(input, data, profileInfo);

    // Parser les propriétés additionnelles (poids, surface, etc.)
    this.parseAdditionalProperties(input, data, profileInfo);

    return data;
  }

  /**
   * Détecte le format du profil et retourne les informations structurées
   */
  private detectProfileFormat(input: string[]): {
    name: string;
    type: string;
    dimensionStartIndex: number;
    format: 'STANDARD' | 'PLATE' | 'TUBE' | 'SPECIAL';
  } {
    // Vérifier d'abord si c'est une plaque (PL)
    if (input[6] === 'PL' && input[8] === 'B') {
      return {
        name: `PL ${input[7]}`,  // "PL 10", "PL 12", etc.
        type: 'PLATE',
        dimensionStartIndex: 9,
        format: 'PLATE'
      };
    }

    // Vérifier si c'est un tube spécial multi-champs
    if (input[6] === 'Tube' && input[7] === 'rect.') {
      const dimensions = [input[8], input[9], input[10]].filter(d => d && d !== '-').join('x');
      return {
        name: `Tube rect. ${dimensions}`,
        type: 'TUBE_RECT',
        dimensionStartIndex: 12,
        format: 'TUBE'
      };
    }

    // FORMAT IMPORTANT : Beaucoup de fichiers DSTV ont le nom en position 7 et le type en position 8
    // Exemple : T1.NC1 a "HE120B" en position 7 et "I" en position 8
    // Exemple : U101.nc1 a "C150X15.6" en position 7 et "U" en position 8
    
    // Vérifier si la position 9 contient un code de type valide (format T1.NC1)
    // Format: steelGrade(6), quantity(7), profileName(8), typeCode(9)
    if (input[9] && this.isProfileTypeCode(input[9])) {
      console.log(`🔍 Format détecté: nom en position 8, type en position 9`);
      const profileName = this.cleanField(input[8]);
      const profileType = this.mapProfileTypeCode(input[9]);
      
      return {
        name: profileName,
        type: profileType,
        dimensionStartIndex: 10,  // Les dimensions commencent en position 10
        format: 'STANDARD'
      };
    }
    
    // Vérifier si la position 8 contient un code de type valide
    if (input[8] && this.isProfileTypeCode(input[8])) {
      console.log(`🔍 Format détecté: nom en position 7, type en position 8`);
      const profileName = this.cleanField(input[7]);
      const profileType = this.mapProfileTypeCode(input[8]);
      
      return {
        name: profileName,
        type: profileType,
        dimensionStartIndex: 9,  // Les dimensions commencent en position 9
        format: 'STANDARD'
      };
    }
    
    // Vérifier le format où le type est en position 7
    if (input[7] && this.isProfileTypeCode(input[7])) {
      const profileName = this.cleanField(input[6]);
      const profileType = this.mapProfileTypeCode(input[7]);
      
      return {
        name: profileName,
        type: profileType,
        dimensionStartIndex: 8,
        format: 'STANDARD'
      };
    }

    // Format standard: nom du profil en position 6, type en position 7
    let profileName = this.cleanField(input[6]);
    let profileTypeCode = input[7];
    let dimensionStart = 8;

    // Cas spéciaux où le type est intégré dans le nom
    if (profileName && !this.isProfileTypeCode(profileTypeCode)) {
      // Le type pourrait être en position 8
      if (input[8] && this.isProfileTypeCode(input[8])) {
        profileTypeCode = input[8];
        dimensionStart = 9;
      } else {
        // Essayer de déduire le type depuis le nom
        profileTypeCode = this.inferTypeFromName(profileName);
      }
    }

    const profileType = this.mapProfileTypeCode(profileTypeCode) || this.detectProfileType(profileName, profileTypeCode);

    return {
      name: profileName,
      type: profileType,
      dimensionStartIndex: dimensionStart,
      format: 'STANDARD'
    };
  }

  /**
   * Infère le type de profil depuis son nom
   */
  private inferTypeFromName(name: string): string {
    const upper = name.toUpperCase();
    if (upper.startsWith('HE') || upper.startsWith('IPE') || upper.startsWith('UB')) return 'I';
    if (upper.startsWith('UPN') || upper.startsWith('C')) return 'U';
    if (upper.startsWith('L') || upper.startsWith('RSA')) return 'L';
    if (upper.startsWith('HSS') || upper.startsWith('RHS') || upper.startsWith('SHS')) return 'M';
    if (upper.startsWith('PL')) return 'B';
    return '';
  }

  /**
   * Parse les dimensions selon le format détecté
   */
  private parseDimensions(input: string[], data: STBlockData, profileInfo: any): void {
    const startIdx = profileInfo.dimensionStartIndex;
    
    // Vérifier qu'on a assez de champs
    if (startIdx >= input.length) {
      console.warn(`⚠️ Not enough fields for dimensions, startIdx=${startIdx}, length=${input.length}`);
      return;
    }

    console.log(`📐 Parsing dimensions from index ${startIdx} for type ${profileInfo.type}`);
    console.log(`  Raw values: [${startIdx}]="${input[startIdx]}", [${startIdx+1}]="${input[startIdx+1]}", [${startIdx+2}]="${input[startIdx+2]}"`);

    switch (profileInfo.format) {
      case 'PLATE':
        // Format plaque: longueur, largeur, (skip), (skip), épaisseur
        data.length = this.parseNumber(input[startIdx], 0);
        data.width = this.parseNumber(input[startIdx + 1], 0);
        data.thickness = this.parseNumber(input[startIdx + 4], 0); // L'épaisseur est au +4
        data.height = data.thickness; // Pour une plaque, hauteur = épaisseur
        break;
        
      case 'TUBE':
        // Format tube: longueur, hauteur, largeur, épaisseur1, épaisseur2
        data.length = this.parseNumber(input[startIdx], 0);
        data.height = this.parseNumber(input[startIdx + 1], 0);
        data.width = this.parseNumber(input[startIdx + 2], 0);
        data.wallThickness = this.parseNumber(input[startIdx + 3], 0);
        const wall2 = this.parseNumber(input[startIdx + 4], 0);
        if (wall2 > 0 && data.wallThickness === 0) {
          data.wallThickness = wall2;
        }
        break;
        
      default:
        // Format standard pour I, U, L, etc.: longueur, hauteur, largeur, épaisseur âme, épaisseur aile
        data.length = this.parseNumber(input[startIdx], 0);
        data.height = this.parseNumber(input[startIdx + 1], 0);
        data.width = this.parseNumber(input[startIdx + 2], 0);
        data.webThickness = this.parseNumber(input[startIdx + 3], 0);
        data.flangeThickness = this.parseNumber(input[startIdx + 4], 0);
        break;
    }

    // Validation et correction des dimensions
    this.validateAndFixDimensions(data, profileInfo);
  }

  /**
   * Valide et corrige les dimensions si nécessaire
   */
  private validateAndFixDimensions(data: STBlockData, profileInfo: any): void {
    // Si la longueur est 0 ou NaN, essayer de la déduire
    if (!data.length || isNaN(data.length)) {
      console.warn(`⚠️ Invalid length detected, setting default value`);
      data.length = 1000; // Longueur par défaut 1m
    }

    // Pour les plaques, s'assurer que l'épaisseur est définie
    if (profileInfo.type === 'PLATE' && (!data.thickness || data.thickness === 0)) {
      // Essayer d'extraire l'épaisseur du nom (ex: "PL 10" -> 10mm)
      const match = data.profileName.match(/PL\s*(\d+)/);
      if (match) {
        data.thickness = parseFloat(match[1]);
        data.height = data.thickness;
      }
    }

    // Correction des valeurs NaN
    if (isNaN(data.height)) data.height = 100;
    if (isNaN(data.width)) data.width = 100;
    if (isNaN(data.webThickness)) data.webThickness = 0;
    if (isNaN(data.flangeThickness)) data.flangeThickness = 0;
  }

  /**
   * Parse les propriétés additionnelles (poids, surface, etc.)
   */
  private parseAdditionalProperties(input: string[], data: STBlockData, profileInfo: any): void {
    const baseIdx = profileInfo.dimensionStartIndex;
    
    // Indices standards pour les propriétés (après les 5 dimensions)
    const weightIdx = baseIdx + 5;
    const surfaceIdx = baseIdx + 6;
    const radiusIdx = baseIdx + 7;

    if (input[weightIdx]) {
      data.weight = this.parseNumber(input[weightIdx], 0);
    }
    
    if (input[surfaceIdx]) {
      data.paintingSurface = this.parseNumber(input[surfaceIdx], 0);
    }
    
    if (input[radiusIdx]) {
      data.radius = this.parseNumber(input[radiusIdx], 0);
    }

    // Dates et métadonnées si disponibles
    for (let i = baseIdx + 8; i < input.length; i++) {
      const field = input[i];
      if (field && field !== '-' && field !== '0') {
        if (this.isDateLike(field)) {
          data.createdDate = field;
        } else if (this.isTimeLike(field)) {
          data.createdTime = field;
        }
      }
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
    return /^[IULTMRB]$/.test(code.toUpperCase());
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
      'R': 'TUBE_ROUND',
      'B': 'PLATE'
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

    // L-Profiles (Angles) - IMPORTANT: Check BEFORE generic U profiles
    if ((upper.startsWith('L') && upper.includes('X')) ||
        upper.startsWith('RSA') || // Profils angulaires RSA (ex: RSA100x100x8)
        upper.startsWith('RS') ||   // Autres profils angulaires RS
        upper.startsWith('UKA') || // Profils cornières égales UKA (ex: UKA80x80x10)
        upper.startsWith('ANGLE')) { // Profils angulaires génériques
      return 'L_PROFILE';
    }

    // U-Profiles (Channels) - Check AFTER UKA
    if (upper.startsWith('UPN') || upper.startsWith('UPE') || upper.startsWith('UAP') ||
        (upper.startsWith('U') && upper.match(/^U\s*\d/))) {
      return 'U_PROFILE';
    }
    
    // C-Profiles américains
    if (upper.match(/^C\d+/) || upper.match(/^MC\d+/)) {
      return 'U_PROFILE';
    }

    // T-Profiles
    if (upper.startsWith('T') && upper.match(/^T\s*\d/)) {
      return 'T_PROFILE';
    }

    // Tubes rectangulaires (HSS = Hollow Structural Section)
    if (upper.startsWith('HSS') || upper.startsWith('RHS') || upper.startsWith('SHS') || upper.startsWith('TUBE RECT')) {
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