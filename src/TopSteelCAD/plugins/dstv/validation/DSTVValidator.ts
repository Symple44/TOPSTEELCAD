/**
 * Validateur DSTV selon la norme officielle
 * Vérifie la conformité des données avec la norme DSTV 7ème édition
 */

import { NormalizedProfile, NormalizedFeature, NormalizedFeatureType } from '../import/stages/DSTVNormalizationStage';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  code: string;
  message: string;
  location?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  location?: string;
  severity: 'warning';
}

export interface ValidationInfo {
  code: string;
  message: string;
  location?: string;
  severity: 'info';
}

export enum ValidationLevel {
  STRICT = 'strict',      // Conformité totale à la norme
  STANDARD = 'standard',  // Conformité normale avec tolérances
  RELAXED = 'relaxed'     // Conformité minimale
}

/**
 * Validateur pour le format DSTV
 */
export class DSTVValidator {
  private level: ValidationLevel;
  
  constructor(level: ValidationLevel = ValidationLevel.STANDARD) {
    this.level = level;
  }

  /**
   * Valide un profil normalisé
   */
  validateProfile(profile: NormalizedProfile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Validation du nom du profil
    if (!profile.name) {
      errors.push({
        code: 'PROF_001',
        message: 'Profile name is required',
        location: 'ST block',
        severity: 'error'
      });
    }

    // Validation de la longueur
    if (!profile.dimensions?.length || profile.dimensions.length <= 0) {
      errors.push({
        code: 'PROF_002',
        message: 'Profile length must be positive',
        location: 'ST block',
        severity: 'error'
      });
    } else if (profile.dimensions.length > 20000) {
      warnings.push({
        code: 'PROF_003',
        message: `Profile length ${profile.dimensions.length}mm exceeds typical maximum`,
        location: 'ST block',
        severity: 'warning'
      });
    }

    // Validation du matériau
    if (!profile.material?.grade) {
      if (this.level === ValidationLevel.STRICT) {
        errors.push({
          code: 'MAT_001',
          message: 'Material grade is required in strict mode',
          location: 'ST block',
          severity: 'error'
        });
      } else {
        warnings.push({
          code: 'MAT_001',
          message: 'Material grade not specified, using default S235',
          location: 'ST block',
          severity: 'warning'
        });
      }
    }

    // Validation des dimensions de section
    if (profile.dimensions?.crossSection) {
      const cs = profile.dimensions.crossSection;
      
      if (cs.height && cs.height <= 0) {
        errors.push({
          code: 'DIM_001',
          message: 'Cross section height must be positive',
          location: 'ST block',
          severity: 'error'
        });
      }
      
      if (cs.width && cs.width <= 0) {
        errors.push({
          code: 'DIM_002',
          message: 'Cross section width must be positive',
          location: 'ST block',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Valide une feature normalisée
   */
  validateFeature(feature: NormalizedFeature): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Validation des coordonnées
    if (isNaN(feature.coordinates.x) || isNaN(feature.coordinates.y)) {
      errors.push({
        code: 'COORD_001',
        message: 'Feature coordinates must be valid numbers',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    }

    // Validation spécifique par type de feature
    switch (feature.type) {
      case NormalizedFeatureType.HOLE:
        this.validateHole(feature, errors, warnings);
        break;
      case NormalizedFeatureType.CUT:
        this.validateCut(feature, errors, warnings);
        break;
      case NormalizedFeatureType.CONTOUR:
        this.validateContour(feature, errors, warnings);
        break;
      case NormalizedFeatureType.MARKING:
        this.validateMarking(feature, errors, warnings);
        break;
    }

    // Vérification des limites de coordonnées
    if (Math.abs(feature.coordinates.x) > 50000 || Math.abs(feature.coordinates.y) > 50000) {
      warnings.push({
        code: 'COORD_002',
        message: `Coordinates (${feature.coordinates.x}, ${feature.coordinates.y}) are unusually large`,
        location: `Feature ${feature.id}`,
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Valide un trou
   */
  private validateHole(
    feature: NormalizedFeature,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const diameter = feature.parameters?.diameter;
    
    if (!diameter || diameter <= 0) {
      errors.push({
        code: 'HOLE_001',
        message: 'Hole diameter must be positive',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    } else if (diameter < 1) {
      warnings.push({
        code: 'HOLE_002',
        message: `Hole diameter ${diameter}mm is very small`,
        location: `Feature ${feature.id}`,
        severity: 'warning'
      });
    } else if (diameter > 200) {
      warnings.push({
        code: 'HOLE_003',
        message: `Hole diameter ${diameter}mm is unusually large`,
        location: `Feature ${feature.id}`,
        severity: 'warning'
      });
    }

    // Validation de la profondeur
    const depth = feature.parameters?.depth;
    if (depth !== undefined && depth !== -1 && depth <= 0) {
      errors.push({
        code: 'HOLE_004',
        message: 'Hole depth must be positive or -1 (through)',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    }
  }

  /**
   * Valide une découpe
   */
  private validateCut(
    feature: NormalizedFeature,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const width = feature.parameters?.width;
    const height = feature.parameters?.height;
    
    if (!width || width <= 0) {
      errors.push({
        code: 'CUT_001',
        message: 'Cut width must be positive',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    }
    
    if (!height || height <= 0) {
      errors.push({
        code: 'CUT_002',
        message: 'Cut height must be positive',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    }

    // Vérification du rayon des coins
    const radius = feature.parameters?.radius;
    if (radius !== undefined) {
      if (radius < 0) {
        errors.push({
          code: 'CUT_003',
          message: 'Corner radius cannot be negative',
          location: `Feature ${feature.id}`,
          severity: 'error'
        });
      } else if (width && height && radius > Math.min(width, height) / 2) {
        errors.push({
          code: 'CUT_004',
          message: 'Corner radius exceeds half of smallest dimension',
          location: `Feature ${feature.id}`,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Valide un contour
   */
  private validateContour(
    feature: NormalizedFeature,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const points = feature.parameters?.points;
    
    if (!points || !Array.isArray(points)) {
      errors.push({
        code: 'CONT_001',
        message: 'Contour must have points array',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
      return;
    }

    if (points.length < 3) {
      errors.push({
        code: 'CONT_002',
        message: 'Contour must have at least 3 points',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    }

    // Vérifier si le contour est fermé
    if (points.length > 2) {
      const first = points[0];
      const last = points[points.length - 1];
      const distance = Math.sqrt(
        Math.pow(last.x - first.x, 2) + 
        Math.pow(last.y - first.y, 2)
      );
      
      if (distance > 0.01) {
        if (this.level === ValidationLevel.STRICT) {
          errors.push({
            code: 'CONT_003',
            message: 'Contour is not closed',
            location: `Feature ${feature.id}`,
            severity: 'error'
          });
        } else {
          warnings.push({
            code: 'CONT_003',
            message: 'Contour is not closed',
            location: `Feature ${feature.id}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  /**
   * Valide un marquage
   */
  private validateMarking(
    feature: NormalizedFeature,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const text = feature.parameters?.text;
    
    if (!text || text.length === 0) {
      errors.push({
        code: 'MARK_001',
        message: 'Marking must have text content',
        location: `Feature ${feature.id}`,
        severity: 'error'
      });
    }

    const height = feature.parameters?.height;
    if (height !== undefined) {
      if (height <= 0) {
        errors.push({
          code: 'MARK_002',
          message: 'Text height must be positive',
          location: `Feature ${feature.id}`,
          severity: 'error'
        });
      } else if (height < 1) {
        warnings.push({
          code: 'MARK_003',
          message: `Text height ${height}mm is very small`,
          location: `Feature ${feature.id}`,
          severity: 'warning'
        });
      } else if (height > 100) {
        warnings.push({
          code: 'MARK_004',
          message: `Text height ${height}mm is unusually large`,
          location: `Feature ${feature.id}`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Valide un ensemble de données DSTV complet
   */
  validateComplete(
    profiles: NormalizedProfile[],
    features: NormalizedFeature[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Valider chaque profil
    profiles.forEach(profile => {
      const result = this.validateProfile(profile);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      info.push(...result.info);
    });

    // Valider chaque feature
    features.forEach(feature => {
      const result = this.validateFeature(feature);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      info.push(...result.info);
    });

    // Validations globales
    if (profiles.length === 0) {
      errors.push({
        code: 'GLOBAL_001',
        message: 'DSTV file must contain at least one profile',
        severity: 'error'
      });
    }

    // Statistiques
    info.push({
      code: 'STATS_001',
      message: `Validated ${profiles.length} profiles and ${features.length} features`,
      severity: 'info'
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Définit le niveau de validation
   */
  setLevel(level: ValidationLevel): void {
    this.level = level;
  }

  /**
   * Obtient le niveau de validation actuel
   */
  getLevel(): ValidationLevel {
    return this.level;
  }
}