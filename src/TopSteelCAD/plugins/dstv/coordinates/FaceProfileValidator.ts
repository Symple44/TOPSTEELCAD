/**
 * FaceProfileValidator - Validation des combinaisons face-profil
 * 
 * Assure la cohérence entre les faces DSTV et les types de profils
 * Détecte les incohérences et suggère des corrections
 */

// ProfileFace import removed - not used
import { ProfileType, dstvFaceMapper } from './DSTVFaceMapper';

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Contexte de validation
 */
export interface ValidationContext {
  dstvFace: string;
  profileType: ProfileType | string;
  profileName?: string;
  featureType?: string;
  position?: { x: number; y: number; z?: number };
}

/**
 * Règle de validation personnalisée
 */
export interface CustomValidationRule {
  name: string;
  description: string;
  applies: (context: ValidationContext) => boolean;
  validate: (context: ValidationContext) => ValidationResult;
}

/**
 * Validateur de combinaisons face-profil
 */
export class FaceProfileValidator {
  private static instance: FaceProfileValidator;
  private customRules: CustomValidationRule[] = [];
  
  /**
   * Contraintes géométriques par type de profil
   */
  private readonly geometricConstraints = new Map<ProfileType, {
    maxFaces: number;
    preferredFaces: string[];
    incompatibleFeatures?: Map<string, string[]>;
  }>([
    [ProfileType.I_PROFILE, {
      maxFaces: 3,
      preferredFaces: ['v', 'o', 'u'],
      incompatibleFeatures: new Map([
        ['h', ['Face arrière rarement utilisée sur profils I']],
      ])
    }],
    
    [ProfileType.TUBE_RECT, {
      maxFaces: 4,
      preferredFaces: ['v', 'o', 'u', 'h'],
    }],
    
    [ProfileType.TUBE_ROUND, {
      maxFaces: 4,
      preferredFaces: ['v', 'o', 'u', 'h'],
    }],
    
    [ProfileType.L_PROFILE, {
      maxFaces: 2,
      preferredFaces: ['v', 'o'],
      incompatibleFeatures: new Map([
        ['u', ['Face inférieure non standard pour cornières']],
        ['h', ['Face arrière non standard pour cornières']],
      ])
    }],
    
    [ProfileType.U_PROFILE, {
      maxFaces: 3,
      preferredFaces: ['v', 'o', 'u'],
      incompatibleFeatures: new Map([
        ['h', ['Face arrière rarement utilisée sur profils U']],
      ])
    }],
    
    [ProfileType.PLATE, {
      maxFaces: 2,
      preferredFaces: ['v', 'h'],
      incompatibleFeatures: new Map([
        ['o', ['Chant supérieur rarement usiné sur platines']],
        ['u', ['Chant inférieur rarement usiné sur platines']],
      ])
    }],
  ]);
  
  private constructor() {
    this.initializeDefaultRules();
  }
  
  static getInstance(): FaceProfileValidator {
    if (!FaceProfileValidator.instance) {
      FaceProfileValidator.instance = new FaceProfileValidator();
    }
    return FaceProfileValidator.instance;
  }
  
  /**
   * Valide une combinaison face-profil
   */
  validate(context: ValidationContext): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
    
    // Normaliser le type de profil
    const profileType = typeof context.profileType === 'string' 
      ? dstvFaceMapper['normalizeProfileType'](context.profileType)
      : context.profileType;
    
    // Validation de base
    this.validateBasicConstraints(context, profileType, result);
    
    // Validation géométrique
    this.validateGeometricConstraints(context, profileType, result);
    
    // Validation des features spécifiques
    this.validateFeatureCompatibility(context, profileType, result);
    
    // Appliquer les règles personnalisées
    this.applyCustomRules(context, result);
    
    // Générer des suggestions
    this.generateSuggestions(context, profileType, result);
    
    // Déterminer le statut final
    result.isValid = result.errors.length === 0;
    
    return result;
  }
  
  /**
   * Ajoute une règle de validation personnalisée
   */
  addCustomRule(rule: CustomValidationRule): void {
    this.customRules.push(rule);
  }
  
  /**
   * Validation des contraintes de base
   */
  private validateBasicConstraints(
    context: ValidationContext, 
    profileType: ProfileType, 
    result: ValidationResult
  ): void {
    const validFaces = dstvFaceMapper.getValidFaces(profileType);
    
    if (!validFaces.includes(context.dstvFace.toLowerCase())) {
      result.errors.push(
        `Face '${context.dstvFace}' n'est pas valide pour le type de profil ${profileType}`
      );
    }
  }
  
  /**
   * Validation des contraintes géométriques
   */
  private validateGeometricConstraints(
    context: ValidationContext,
    profileType: ProfileType,
    result: ValidationResult
  ): void {
    const constraints = this.geometricConstraints.get(profileType);
    
    if (!constraints) {
      return;
    }
    
    // Vérifier les faces préférées
    if (!constraints.preferredFaces.includes(context.dstvFace.toLowerCase())) {
      result.warnings.push(
        `Face '${context.dstvFace}' n'est pas une face préférée pour ${profileType}`
      );
    }
    
    // Vérifier les incompatibilités
    const incompatibilities = constraints.incompatibleFeatures?.get(context.dstvFace.toLowerCase());
    if (incompatibilities) {
      incompatibilities.forEach(msg => result.warnings.push(msg));
    }
  }
  
  /**
   * Validation de la compatibilité des features
   */
  private validateFeatureCompatibility(
    context: ValidationContext,
    profileType: ProfileType,
    result: ValidationResult
  ): void {
    // Règles spécifiques selon le type de feature
    if (context.featureType === 'HOLE' || context.featureType === 'BO') {
      this.validateHolePosition(context, profileType, result);
    }
    
    if (context.featureType === 'CUT' || context.featureType === 'AK') {
      this.validateCutPosition(context, profileType, result);
    }
    
    if (context.featureType === 'MARKING' || context.featureType === 'SI') {
      this.validateMarkingPosition(context, profileType, result);
    }
  }
  
  /**
   * Validation de la position des trous
   */
  private validateHolePosition(
    context: ValidationContext,
    profileType: ProfileType,
    result: ValidationResult
  ): void {
    // Les trous sur la face 'h' (arrière) sont rares pour les profils I
    if (profileType === ProfileType.I_PROFILE && context.dstvFace === 'h') {
      result.warnings.push(
        'Les trous sur la face arrière sont inhabituels pour les profils I'
      );
    }
    
    // Pour les platines, les trous sont généralement sur 'v' (face principale)
    if (profileType === ProfileType.PLATE && context.dstvFace !== 'v') {
      result.warnings.push(
        'Les trous sur platines sont généralement sur la face principale (v)'
      );
    }
  }
  
  /**
   * Validation de la position des coupes
   */
  private validateCutPosition(
    context: ValidationContext,
    profileType: ProfileType,
    result: ValidationResult
  ): void {
    // Les coupes sur tubes peuvent être sur toutes les faces
    if (profileType === ProfileType.TUBE_RECT || profileType === ProfileType.TUBE_ROUND) {
      return; // Pas de restriction
    }
    
    // Pour les cornières, éviter les coupes sur 'h'
    if (profileType === ProfileType.L_PROFILE && context.dstvFace === 'h') {
      result.errors.push(
        'Les coupes sur la face arrière ne sont pas supportées pour les cornières'
      );
    }
  }
  
  /**
   * Validation de la position des marquages
   */
  private validateMarkingPosition(
    context: ValidationContext,
    profileType: ProfileType,
    result: ValidationResult
  ): void {
    // Les marquages sont généralement sur les faces visibles
    const visibleFaces = this.getVisibleFaces(profileType);
    
    if (!visibleFaces.includes(context.dstvFace.toLowerCase())) {
      result.warnings.push(
        `Le marquage sur la face '${context.dstvFace}' pourrait ne pas être visible`
      );
    }
  }
  
  /**
   * Applique les règles personnalisées
   */
  private applyCustomRules(context: ValidationContext, result: ValidationResult): void {
    for (const rule of this.customRules) {
      if (rule.applies(context)) {
        const ruleResult = rule.validate(context);
        result.errors.push(...ruleResult.errors);
        result.warnings.push(...ruleResult.warnings);
        result.suggestions.push(...ruleResult.suggestions);
      }
    }
  }
  
  /**
   * Génère des suggestions d'amélioration
   */
  private generateSuggestions(
    context: ValidationContext,
    profileType: ProfileType,
    result: ValidationResult
  ): void {
    // Si face invalide, suggérer les faces valides
    if (result.errors.length > 0) {
      const validFaces = dstvFaceMapper.getValidFaces(profileType);
      result.suggestions.push(
        `Faces valides pour ${profileType}: ${validFaces.join(', ')}`
      );
    }
    
    // Si face non préférée, suggérer les faces préférées
    const constraints = this.geometricConstraints.get(profileType);
    if (constraints && !constraints.preferredFaces.includes(context.dstvFace.toLowerCase())) {
      result.suggestions.push(
        `Faces recommandées: ${constraints.preferredFaces.join(', ')}`
      );
    }
  }
  
  /**
   * Obtient les faces visibles pour un type de profil
   */
  private getVisibleFaces(profileType: ProfileType): string[] {
    switch (profileType) {
      case ProfileType.I_PROFILE:
        return ['v', 'o']; // Âme et aile supérieure
      case ProfileType.TUBE_RECT:
      case ProfileType.TUBE_ROUND:
        return ['v', 'o', 'u', 'h']; // Toutes les faces
      case ProfileType.L_PROFILE:
        return ['v', 'o']; // Les deux ailes
      case ProfileType.PLATE:
        return ['v']; // Face principale uniquement
      default:
        return ['v', 'o'];
    }
  }
  
  /**
   * Initialise les règles par défaut
   */
  private initializeDefaultRules(): void {
    // Règle: Avertir pour les features sur face 'h' des profils I
    this.addCustomRule({
      name: 'i-profile-back-face-warning',
      description: 'Avertit pour l\'utilisation de la face arrière sur profils I',
      applies: (ctx) => ctx.profileType === ProfileType.I_PROFILE && ctx.dstvFace === 'h',
      validate: (_ctx) => ({
        isValid: true,
        errors: [],
        warnings: ['La face arrière (h) est rarement utilisée sur les profils I'],
        suggestions: ['Considérer l\'utilisation de la face v (âme) ou o/u (ailes)']
      })
    });
    
    // Règle: Position des trous sur tubes
    this.addCustomRule({
      name: 'tube-hole-symmetry',
      description: 'Vérifie la symétrie des trous sur tubes',
      applies: (ctx) => (ctx.profileType === ProfileType.TUBE_RECT || ctx.profileType === ProfileType.TUBE_ROUND) 
                        && ctx.featureType === 'HOLE',
      validate: (_ctx) => {
        // Cette règle pourrait vérifier la symétrie des trous
        // Pour l'instant, juste un placeholder
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };
      }
    });
    
    // Règle: Marquages sur platines
    this.addCustomRule({
      name: 'plate-marking-face',
      description: 'Vérifie que les marquages sur platines sont sur la face principale',
      applies: (ctx) => ctx.profileType === ProfileType.PLATE && ctx.featureType === 'MARKING',
      validate: (ctx) => {
        if (ctx.dstvFace !== 'v') {
          return {
            isValid: false,
            errors: ['Les marquages sur platines doivent être sur la face principale (v)'],
            warnings: [],
            suggestions: ['Utiliser la face v pour les marquages sur platines']
          };
        }
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };
      }
    });
  }
}

// Export singleton instance
export const faceProfileValidator = FaceProfileValidator.getInstance();