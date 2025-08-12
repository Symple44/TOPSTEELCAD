/**
 * Service de validation pour les profilés métalliques
 * Vérifie la conformité des données selon les normes
 */

import { 
  SteelProfile, 
  ProfileType,
  ProfileDimensions,
  ProfileInertia,
  ProfileElasticModulus,
  ProfilePlasticModulus,
  ProfileRadiusOfGyration
} from '../types/profile.types';

export class ProfileValidator {
  
  /**
   * Valide un profilé complet ou partiel
   */
  public static validate(profile: Partial<SteelProfile>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation des champs obligatoires
    if (!profile.id) {
      errors.push('ID est requis');
    }

    if (!profile.type) {
      errors.push('Type est requis');
    } else if (!Object.values(ProfileType).includes(profile.type)) {
      errors.push(`Type invalide: ${profile.type}`);
    }

    if (!profile.designation) {
      errors.push('Désignation est requise');
    } else if (!ProfileValidator.isValidDesignation(profile.designation)) {
      warnings.push(`Format de désignation non standard: ${profile.designation}`);
    }

    // Validation des dimensions
    if (profile.dimensions) {
      const dimErrors = ProfileValidator.validateDimensions(profile.dimensions, profile.type);
      errors.push(...dimErrors);
    } else {
      errors.push('Dimensions sont requises');
    }

    // Validation des propriétés mécaniques
    if (profile.weight !== undefined && profile.weight <= 0) {
      errors.push('Le poids doit être positif');
    }

    if (profile.area !== undefined && profile.area <= 0) {
      errors.push('L\'aire doit être positive');
    }

    // Validation de l'inertie
    if (profile.inertia) {
      const inertiaErrors = ProfileValidator.validateInertia(profile.inertia);
      errors.push(...inertiaErrors);
    }

    // Validation des modules
    if (profile.elasticModulus) {
      const modulusErrors = ProfileValidator.validateElasticModulus(profile.elasticModulus);
      errors.push(...modulusErrors);
    }

    if (profile.plasticModulus) {
      const plasticErrors = ProfileValidator.validatePlasticModulus(profile.plasticModulus);
      errors.push(...plasticErrors);
    }

    // Validation des rayons de giration
    if (profile.radiusOfGyration) {
      const radiusErrors = ProfileValidator.validateRadiusOfGyration(profile.radiusOfGyration);
      errors.push(...radiusErrors);
    }

    // Vérifications de cohérence
    if (profile.weight && profile.area) {
      const impliedDensity = (profile.weight * 10000) / profile.area; // kg/m / cm² -> kg/m³
      if (Math.abs(impliedDensity - 7850) > 500) {
        warnings.push(`Densité implicite inhabituelle: ${impliedDensity.toFixed(0)} kg/m³`);
      }
    }

    if (profile.elasticModulus && profile.plasticModulus) {
      // Le module plastique doit être supérieur au module élastique
      if (profile.plasticModulus.Wply < profile.elasticModulus.Wely) {
        errors.push('Module plastique Wply doit être ≥ module élastique Wely');
      }
      if (profile.plasticModulus.Wplz < profile.elasticModulus.Welz) {
        errors.push('Module plastique Wplz doit être ≥ module élastique Welz');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide les dimensions d'un profilé
   */
  private static validateDimensions(dims: ProfileDimensions, type?: ProfileType): string[] {
    const errors: string[] = [];

    // Vérifications générales
    Object.entries(dims).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'number') {
          errors.push(`${key} doit être un nombre`);
        } else if (value < 0) {
          errors.push(`${key} ne peut pas être négatif`);
        }
      }
    });

    if (!type) return errors;

    // Vérifications spécifiques au type
    switch (type) {
      case ProfileType.IPE:
      case ProfileType.HEA:
      case ProfileType.HEB:
      case ProfileType.HEM:
        if (!dims.height) errors.push('Hauteur requise pour profilé en I');
        if (!dims.width) errors.push('Largeur requise pour profilé en I');
        if (!dims.webThickness) errors.push('Épaisseur d\'âme requise pour profilé en I');
        if (!dims.flangeThickness) errors.push('Épaisseur de semelle requise pour profilé en I');
        
        // Vérifications de cohérence
        if (dims.height && dims.width && dims.height < dims.width) {
          errors.push('La hauteur doit être ≥ à la largeur pour un profilé en I');
        }
        if (dims.webThickness && dims.flangeThickness && dims.webThickness > dims.flangeThickness) {
          errors.push('L\'épaisseur d\'âme est généralement < épaisseur de semelle');
        }
        break;

      case ProfileType.UPN:
      case ProfileType.UAP:
      case ProfileType.UPE:
        if (!dims.height) errors.push('Hauteur requise pour profilé en U');
        if (!dims.width) errors.push('Largeur requise pour profilé en U');
        if (!dims.webThickness) errors.push('Épaisseur d\'âme requise pour profilé en U');
        if (!dims.flangeThickness) errors.push('Épaisseur de semelle requise pour profilé en U');
        break;

      case ProfileType.L_EQUAL:
        if (!dims.width && !dims.leg1Length) {
          errors.push('Dimension des ailes requise pour cornière à ailes égales');
        }
        if (!dims.thickness) errors.push('Épaisseur requise pour cornière');
        if (dims.leg1Length && dims.leg2Length && dims.leg1Length !== dims.leg2Length) {
          errors.push('Les ailes doivent être égales pour L_EQUAL');
        }
        break;

      case ProfileType.L_UNEQUAL:
        if (!dims.leg1Length) errors.push('Longueur première aile requise pour cornière');
        if (!dims.leg2Length) errors.push('Longueur deuxième aile requise pour cornière');
        if (!dims.thickness) errors.push('Épaisseur requise pour cornière');
        if (dims.leg1Length && dims.leg2Length && dims.leg1Length === dims.leg2Length) {
          errors.push('Les ailes doivent être inégales pour L_UNEQUAL');
        }
        break;

      case ProfileType.TUBE_CIRCULAR:
      case ProfileType.CHS:
        if (!dims.diameter) errors.push('Diamètre requis pour tube circulaire');
        if (!dims.wallThickness && !dims.thickness) {
          errors.push('Épaisseur de paroi requise pour tube');
        }
        break;

      case ProfileType.TUBE_SQUARE:
      case ProfileType.SHS:
        if (!dims.width && !dims.height) {
          errors.push('Dimension requise pour tube carré');
        }
        if (dims.width && dims.height && dims.width !== dims.height) {
          errors.push('Largeur et hauteur doivent être égales pour tube carré');
        }
        if (!dims.wallThickness && !dims.thickness) {
          errors.push('Épaisseur de paroi requise pour tube');
        }
        break;

      case ProfileType.TUBE_RECTANGULAR:
      case ProfileType.RHS:
        if (!dims.width) errors.push('Largeur requise pour tube rectangulaire');
        if (!dims.height) errors.push('Hauteur requise pour tube rectangulaire');
        if (!dims.wallThickness && !dims.thickness) {
          errors.push('Épaisseur de paroi requise pour tube');
        }
        break;
    }

    return errors;
  }

  /**
   * Valide les propriétés d'inertie
   */
  private static validateInertia(inertia: ProfileInertia): string[] {
    const errors: string[] = [];

    if (inertia.Iyy <= 0) errors.push('Inertie Iyy doit être positive');
    if (inertia.Izz <= 0) errors.push('Inertie Izz doit être positive');
    if (inertia.It <= 0) errors.push('Inertie de torsion It doit être positive');
    
    // Généralement Iyy > Izz pour les profilés standards
    if (inertia.Iyy < inertia.Izz) {
      errors.push('Attention: Iyy < Izz (axes peut-être inversés?)');
    }

    if (inertia.Iw !== undefined && inertia.Iw <= 0) {
      errors.push('Inertie de gauchissement Iw doit être positive');
    }

    return errors;
  }

  /**
   * Valide les modules élastiques
   */
  private static validateElasticModulus(modulus: ProfileElasticModulus): string[] {
    const errors: string[] = [];

    if (modulus.Wely <= 0) errors.push('Module élastique Wely doit être positif');
    if (modulus.Welz <= 0) errors.push('Module élastique Welz doit être positif');

    // Généralement Wely > Welz
    if (modulus.Wely < modulus.Welz) {
      errors.push('Attention: Wely < Welz (axes peut-être inversés?)');
    }

    return errors;
  }

  /**
   * Valide les modules plastiques
   */
  private static validatePlasticModulus(modulus: ProfilePlasticModulus): string[] {
    const errors: string[] = [];

    if (modulus.Wply <= 0) errors.push('Module plastique Wply doit être positif');
    if (modulus.Wplz <= 0) errors.push('Module plastique Wplz doit être positif');

    // Généralement Wply > Wplz
    if (modulus.Wply < modulus.Wplz) {
      errors.push('Attention: Wply < Wplz (axes peut-être inversés?)');
    }

    return errors;
  }

  /**
   * Valide les rayons de giration
   */
  private static validateRadiusOfGyration(radius: ProfileRadiusOfGyration): string[] {
    const errors: string[] = [];

    if (radius.iy <= 0) errors.push('Rayon de giration iy doit être positif');
    if (radius.iz <= 0) errors.push('Rayon de giration iz doit être positif');

    // Généralement iy > iz
    if (radius.iy < radius.iz) {
      errors.push('Attention: iy < iz (axes peut-être inversés?)');
    }

    if (radius.iu !== undefined && radius.iu <= 0) {
      errors.push('Rayon de giration iu doit être positif');
    }

    if (radius.iv !== undefined && radius.iv <= 0) {
      errors.push('Rayon de giration iv doit être positif');
    }

    return errors;
  }

  /**
   * Vérifie si une désignation est valide
   */
  public static isValidDesignation(designation: string): boolean {
    // Patterns courants pour les désignations
    const patterns = [
      /^IPE\s*\d{2,4}$/i,        // IPE 300
      /^HE[ABM]\s*\d{2,4}$/i,    // HEA 300, HEB 300, HEM 300
      /^UPN\s*\d{2,4}$/i,        // UPN 300
      /^UAP\s*\d{2,4}$/i,        // UAP 300
      /^UPE\s*\d{2,4}$/i,        // UPE 300
      /^L\s*\d+x\d+(x\d+)?$/i,   // L 100x100x10
      /^T\s*\d+x\d+(x\d+)?$/i,   // T 100x100x10 (tubes)
      /^RHS\s*\d+x\d+x[\d.]+$/i, // RHS 100x50x3
      /^SHS\s*\d+x[\d.]+$/i,     // SHS 100x5
      /^CHS\s*\d+x[\d.]+$/i,     // CHS 88.9x3.2
      /^FL\s*\d+x\d+$/i,          // FL 100x10 (plats)
      /^RD\s*\d+$/i,              // RD 20 (ronds)
      /^SQ\s*\d+$/i,              // SQ 20 (carrés)
    ];

    return patterns.some(pattern => pattern.test(designation.trim()));
  }

  /**
   * Normalise une désignation
   */
  public static normalizeDesignation(designation: string): string {
    return designation
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')     // Normaliser les espaces
      .replace(/\s*x\s*/gi, 'x') // Normaliser les x
      .replace(/\s*-\s*/g, ' '); // Remplacer les tirets par des espaces
  }

  /**
   * Extrait le type depuis une désignation
   */
  public static extractTypeFromDesignation(designation: string): ProfileType | null {
    const normalized = ProfileValidator.normalizeDesignation(designation);
    
    if (normalized.startsWith('IPE')) return ProfileType.IPE;
    if (normalized.startsWith('HEA')) return ProfileType.HEA;
    if (normalized.startsWith('HEB')) return ProfileType.HEB;
    if (normalized.startsWith('HEM')) return ProfileType.HEM;
    if (normalized.startsWith('UPN')) return ProfileType.UPN;
    if (normalized.startsWith('UAP')) return ProfileType.UAP;
    if (normalized.startsWith('UPE')) return ProfileType.UPE;
    if (normalized.startsWith('L ')) {
      // Déterminer si égal ou inégal
      const match = normalized.match(/L\s*(\d+)x(\d+)/);
      if (match) {
        const [, dim1, dim2] = match;
        return dim1 === dim2 ? ProfileType.L_EQUAL : ProfileType.L_UNEQUAL;
      }
    }
    if (normalized.startsWith('RHS')) return ProfileType.RHS;
    if (normalized.startsWith('SHS')) return ProfileType.SHS;
    if (normalized.startsWith('CHS')) return ProfileType.CHS;
    if (normalized.startsWith('FL')) return ProfileType.FLAT;
    if (normalized.startsWith('RD')) return ProfileType.ROUND_BAR;
    if (normalized.startsWith('SQ')) return ProfileType.SQUARE_BAR;
    
    return null;
  }
}