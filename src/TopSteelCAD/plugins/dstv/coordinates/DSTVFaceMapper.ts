/**
 * DSTVFaceMapper - Système unifié de mapping des faces DSTV
 * 
 * Gère la conversion entre les notations DSTV (v/o/u/h) et le système interne
 * selon le type de profil (I-beam, tubes, angles, etc.)
 * 
 * IMPORTANT: Ce mapper est critique pour la conformité DSTV
 * Toute modification doit être validée avec les tests de non-régression
 */

import { ProfileFace } from '@/TopSteelCAD/core/features/types';

/**
 * Types de profils supportés
 */
export enum ProfileType {
  I_PROFILE = 'I_PROFILE',       // Profils I/H (IPE, HEA, HEB, UB, UC, W)
  L_PROFILE = 'L_PROFILE',       // Cornières (L, angles)
  U_PROFILE = 'U_PROFILE',       // Profils U (UPN, C-channels)
  TUBE_RECT = 'TUBE_RECT',       // Tubes rectangulaires (HSS, RHS, SHS)
  TUBE_ROUND = 'TUBE_ROUND',     // Tubes ronds (CHS)
  T = 'T',                       // Profils T
  PLATE = 'PLATE',               // Platines/tôles
  UNKNOWN = 'UNKNOWN'
}

/**
 * Interface pour les règles de validation face-profil
 */
export interface FaceValidationRule {
  profileType: ProfileType;
  validFaces: string[];
  description: string;
}

/**
 * Mapper unifié pour les faces DSTV
 */
export class DSTVFaceMapper {
  private static instance: DSTVFaceMapper;
  
  /**
   * Mapping des faces DSTV vers les faces internes selon le type de profil
   */
  private readonly faceMapping = new Map<string, Map<string, ProfileFace>>([
    // Profils I/H
    [ProfileType.I_PROFILE, new Map([
      ['v', ProfileFace.WEB],           // Âme
      ['o', ProfileFace.TOP_FLANGE],    // Aile supérieure
      ['u', ProfileFace.BOTTOM_FLANGE], // Aile inférieure
      ['h', ProfileFace.BACK],          // Face arrière (rare pour I-beams)
    ])],
    
    // Tubes rectangulaires/carrés
    [ProfileType.TUBE_RECT, new Map([
      ['v', ProfileFace.FRONT],          // Face avant
      ['o', ProfileFace.TOP],            // Face supérieure
      ['u', ProfileFace.BOTTOM],         // Face inférieure
      ['h', ProfileFace.BACK],           // Face arrière
    ])],
    
    // Tubes ronds
    [ProfileType.TUBE_ROUND, new Map([
      ['v', ProfileFace.FRONT],          // Face avant (0°)
      ['o', ProfileFace.TOP],            // Face supérieure (90°)
      ['u', ProfileFace.BOTTOM],         // Face inférieure (270°)
      ['h', ProfileFace.BACK],           // Face arrière (180°)
    ])],
    
    // Cornières
    [ProfileType.L_PROFILE, new Map([
      ['v', ProfileFace.LEFT_LEG],      // Aile gauche
      ['o', ProfileFace.RIGHT_LEG],     // Aile droite
      ['u', ProfileFace.BOTTOM],        // Face inférieure
      ['h', ProfileFace.BACK],          // Face arrière
    ])],
    
    // Profils U
    [ProfileType.U_PROFILE, new Map([
      ['v', ProfileFace.WEB],           // Âme
      ['o', ProfileFace.TOP_FLANGE],    // Aile supérieure
      ['u', ProfileFace.BOTTOM_FLANGE], // Aile inférieure
      ['h', ProfileFace.BACK],          // Face arrière
    ])],
    
    // Profils T
    [ProfileType.T, new Map([
      ['v', ProfileFace.WEB],           // Âme verticale
      ['o', ProfileFace.TOP_FLANGE],    // Aile horizontale
      ['u', ProfileFace.BOTTOM],        // Face inférieure
      ['h', ProfileFace.BACK],          // Face arrière
    ])],
    
    // Platines/tôles
    [ProfileType.PLATE, new Map([
      ['v', ProfileFace.FRONT],         // Face principale
      ['o', ProfileFace.TOP],           // Chant supérieur
      ['u', ProfileFace.BOTTOM],        // Chant inférieur
      ['h', ProfileFace.BACK],          // Face arrière
    ])],
  ]);
  
  /**
   * Règles de validation pour chaque type de profil
   */
  private readonly validationRules: Map<ProfileType, FaceValidationRule> = new Map([
    [ProfileType.I_PROFILE, {
      profileType: ProfileType.I_PROFILE,
      validFaces: ['v', 'o', 'u'],
      description: 'I-profiles typically use v (web), o (top flange), u (bottom flange)'
    }],
    
    [ProfileType.TUBE_RECT, {
      profileType: ProfileType.TUBE_RECT,
      validFaces: ['v', 'o', 'u', 'h'],
      description: 'Rectangular tubes can use all four faces: v (front), o (top), u (bottom), h (back)'
    }],
    
    [ProfileType.TUBE_ROUND, {
      profileType: ProfileType.TUBE_ROUND,
      validFaces: ['v', 'o', 'u', 'h'],
      description: 'Round tubes can use all four faces representing 0°, 90°, 270°, 180°'
    }],
    
    [ProfileType.L_PROFILE, {
      profileType: ProfileType.L_PROFILE,
      validFaces: ['v', 'o'],
      description: 'L-profiles typically use v (left leg) and o (right leg)'
    }],
    
    [ProfileType.U_PROFILE, {
      profileType: ProfileType.U_PROFILE,
      validFaces: ['v', 'o', 'u'],
      description: 'U-profiles use v (web), o (top flange), u (bottom flange)'
    }],
    
    [ProfileType.T, {
      profileType: ProfileType.T,
      validFaces: ['v', 'o'],
      description: 'T-profiles use v (vertical web) and o (horizontal flange)'
    }],
    
    [ProfileType.PLATE, {
      profileType: ProfileType.PLATE,
      validFaces: ['v', 'h'],
      description: 'Plates primarily use v (front face) and h (back face)'
    }],
  ]);
  
  private constructor() {}
  
  static getInstance(): DSTVFaceMapper {
    if (!DSTVFaceMapper.instance) {
      DSTVFaceMapper.instance = new DSTVFaceMapper();
    }
    return DSTVFaceMapper.instance;
  }
  
  /**
   * Convertit une face DSTV vers le système interne
   */
  mapDSTVFace(dstvFace: string, profileType: ProfileType | string): ProfileFace {
    // Normaliser l'entrée
    const normalizedFace = dstvFace.toLowerCase().trim();
    const normalizedProfileType = this.normalizeProfileType(profileType);
    
    // Récupérer le mapping pour ce type de profil
    const profileMapping = this.faceMapping.get(normalizedProfileType);
    if (!profileMapping) {
      console.warn(`⚠️ No face mapping defined for profile type: ${normalizedProfileType}`);
      return this.getDefaultFace(normalizedFace);
    }
    
    // Récupérer la face mappée
    const mappedFace = profileMapping.get(normalizedFace);
    if (!mappedFace) {
      console.warn(`⚠️ Unknown DSTV face '${normalizedFace}' for profile type ${normalizedProfileType}`);
      return this.getDefaultFace(normalizedFace);
    }
    
    console.log(`🔄 Face mapping: DSTV '${normalizedFace}' → Internal '${mappedFace}' (${normalizedProfileType})`);
    return mappedFace;
  }
  
  /**
   * Convertit une face interne vers la notation DSTV
   */
  mapInternalFace(internalFace: ProfileFace, profileType: ProfileType | string): string {
    const normalizedProfileType = this.normalizeProfileType(profileType);
    const profileMapping = this.faceMapping.get(normalizedProfileType);
    
    if (!profileMapping) {
      return 'v'; // Défaut
    }
    
    // Recherche inverse
    for (const [dstvFace, mappedFace] of profileMapping.entries()) {
      if (mappedFace === internalFace) {
        return dstvFace;
      }
    }
    
    return 'v'; // Défaut
  }
  
  /**
   * Valide qu'une face est appropriée pour un type de profil
   */
  validateFace(dstvFace: string, profileType: ProfileType | string): boolean {
    const normalizedProfileType = this.normalizeProfileType(profileType);
    const rule = this.validationRules.get(normalizedProfileType);
    
    if (!rule) {
      console.warn(`⚠️ No validation rule for profile type: ${normalizedProfileType}`);
      return true; // Permissif par défaut
    }
    
    const isValid = rule.validFaces.includes(dstvFace.toLowerCase());
    
    if (!isValid) {
      console.warn(`⚠️ Face '${dstvFace}' is not typically used for ${normalizedProfileType}`);
      console.warn(`   ${rule.description}`);
      console.warn(`   Valid faces: ${rule.validFaces.join(', ')}`);
    }
    
    return isValid;
  }
  
  /**
   * Obtient toutes les faces valides pour un type de profil
   */
  getValidFaces(profileType: ProfileType | string): string[] {
    const normalizedProfileType = this.normalizeProfileType(profileType);
    const rule = this.validationRules.get(normalizedProfileType);
    return rule ? rule.validFaces : ['v', 'o', 'u', 'h'];
  }
  
  /**
   * Normalise le type de profil
   */
  private normalizeProfileType(profileType: ProfileType | string): ProfileType {
    if (typeof profileType === 'string') {
      // Essayer de mapper les chaînes vers les enums
      const upperType = profileType.toUpperCase();
      
      // Mapping des noms alternatifs
      if (upperType.includes('TUBE') && upperType.includes('RECT')) {
        return ProfileType.TUBE_RECT;
      }
      if (upperType.includes('TUBE') && upperType.includes('ROUND')) {
        return ProfileType.TUBE_ROUND;
      }
      if (upperType.includes('HSS') || upperType.includes('RHS') || upperType.includes('SHS')) {
        return ProfileType.TUBE_RECT;
      }
      if (upperType.includes('CHS')) {
        return ProfileType.TUBE_ROUND;
      }
      if (upperType === 'I' || upperType.includes('IPE') || upperType.includes('HE') || 
          upperType.includes('UB') || upperType.includes('UC') || upperType.includes('W')) {
        return ProfileType.I_PROFILE;
      }
      if (upperType === 'L' || upperType.includes('ANGLE')) {
        return ProfileType.L_PROFILE;
      }
      if (upperType === 'U' || upperType.includes('UPN') || upperType.includes('CHANNEL')) {
        return ProfileType.U_PROFILE;
      }
      if (upperType === 'T') {
        return ProfileType.T;
      }
      if (upperType.includes('PLATE') || upperType.includes('FLAT')) {
        return ProfileType.PLATE;
      }
      
      // Vérifier si c'est déjà un ProfileType valide
      if (Object.values(ProfileType).includes(upperType as ProfileType)) {
        return upperType as ProfileType;
      }
    }
    
    return profileType as ProfileType || ProfileType.UNKNOWN;
  }
  
  /**
   * Obtient une face par défaut basée sur la notation DSTV
   */
  private getDefaultFace(dstvFace: string): ProfileFace {
    // Mapping par défaut si le type de profil n'est pas reconnu
    switch (dstvFace.toLowerCase()) {
      case 'v': return ProfileFace.WEB;
      case 'o': return ProfileFace.TOP;
      case 'u': return ProfileFace.BOTTOM;
      case 'h': return ProfileFace.BACK;
      default: return ProfileFace.FRONT;
    }
  }
  
  /**
   * Détermine le type de profil à partir du nom
   */
  static detectProfileType(profileName: string): ProfileType {
    const upper = profileName.toUpperCase();
    
    // Tubes rectangulaires/carrés
    if (upper.includes('HSS') || upper.includes('RHS') || upper.includes('SHS')) {
      return ProfileType.TUBE_RECT;
    }
    
    // Tubes ronds
    if (upper.includes('CHS') || upper.includes('PIPE')) {
      return ProfileType.TUBE_ROUND;
    }
    
    // Profils I/H
    if (upper.includes('IPE') || upper.includes('HEA') || upper.includes('HEB') ||
        upper.includes('HEM') || upper.includes('UB') || upper.includes('UC') ||
        upper.includes('W') || upper.match(/^I\d+/)) {
      return ProfileType.I_PROFILE;
    }
    
    // Cornières
    if (upper.includes('L') || upper.includes('ANGLE')) {
      return ProfileType.L_PROFILE;
    }
    
    // Profils U
    if (upper.includes('UPN') || upper.includes('U') || upper.includes('CHANNEL')) {
      return ProfileType.U_PROFILE;
    }
    
    // Profils T
    if (upper.includes('T') && !upper.includes('PLATE')) {
      return ProfileType.T;
    }
    
    // Platines
    if (upper.includes('PLATE') || upper.includes('FLAT') || upper.includes('FL')) {
      return ProfileType.PLATE;
    }
    
    return ProfileType.UNKNOWN;
  }
}

// Export singleton instance
export const dstvFaceMapper = DSTVFaceMapper.getInstance();