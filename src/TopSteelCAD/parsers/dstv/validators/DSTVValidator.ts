/**
 * DSTVValidator - Validateur pour les profils DSTV
 * Vérifie la cohérence et la validité des données
 */

import { DSTVProfile, ValidationResult, ValidationResults, ValidationLevel } from '../types';

/**
 * Validateur DSTV avec différents niveaux de validation
 */
export class DSTVValidator {
  private level: ValidationLevel;

  constructor(level: ValidationLevel = ValidationLevel.STANDARD) {
    this.level = level;
  }

  /**
   * Valide un profil unique
   */
  validateProfile(profile: DSTVProfile | null): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!profile) {
      errors.push('Profile is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Structure validation
    if (this.level !== ValidationLevel.BASIC) {
      if (!profile.designation) {
        errors.push('Profile designation is required');
      }

      if (typeof profile.length !== 'number' || profile.length <= 0) {
        errors.push('Profile length must be positive');
      }

      if (profile.length > 20000) {
        warnings.push('Profile length exceeds typical maximum (20000mm)');
      }
    }

    // Features validation
    if (this.level === ValidationLevel.STANDARD || this.level === ValidationLevel.STRICT) {
      // Validate holes
      if (profile.holes) {
        profile.holes.forEach((hole, index) => {
          if (hole.diameter <= 0) {
            errors.push(`Hole ${index}: Invalid diameter (${hole.diameter})`);
          }
          if (this.level === ValidationLevel.STRICT) {
            if (hole.x > profile.length || hole.x < 0) {
              errors.push(`Hole ${index}: Position outside profile bounds`);
            }
          }
        });

        // Check for overlapping holes
        for (let i = 0; i < profile.holes.length; i++) {
          for (let j = i + 1; j < profile.holes.length; j++) {
            const h1 = profile.holes[i];
            const h2 = profile.holes[j];
            if (h1.face === h2.face) {
              const distance = Math.sqrt((h1.x - h2.x) ** 2 + (h1.y - h2.y) ** 2);
              const minDistance = (h1.diameter + h2.diameter) / 2;
              if (distance < minDistance) {
                warnings.push(`Holes ${i} and ${j} may be overlapping`);
              }
            }
          }
        }
      }

      // Validate cuts
      if (profile.cuts) {
        profile.cuts.forEach((cut, index) => {
          if (cut.contour.length < 3) {
            errors.push(`Cut ${index}: Contour must have at least 3 points`);
          }
          
          if (this.level === ValidationLevel.STRICT) {
            // Check if points are within bounds
            for (const point of cut.contour) {
              if (point[0] > profile.length || point[0] < -100) {
                errors.push(`Cut ${index}: Contour point outside profile bounds`);
                break;
              }
            }
          }

          // Check for self-intersecting
          if (this.isSelfIntersecting(cut.contour)) {
            warnings.push(`Cut ${index}: Contour appears to be self-intersecting`);
          }
        });
      }

      // Validate markings
      if (profile.markings) {
        profile.markings.forEach((marking, index) => {
          if (!marking.text || marking.text.trim() === '') {
            errors.push(`Marking ${index}: Text is required`);
          }
          
          if (this.level === ValidationLevel.STRICT) {
            if (marking.x > profile.length || marking.x < 0) {
              errors.push(`Marking ${index}: Position outside profile bounds`);
            }
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide plusieurs profils
   */
  validateProfiles(profiles: DSTVProfile[]): ValidationResults {
    const errors: string[] = [];
    const warnings: string[] = [];
    const profileResults: ValidationResult[] = [];

    if (!profiles || profiles.length === 0) {
      warnings.push('No profiles to validate');
      return { isValid: true, errors, warnings, profileResults };
    }

    profiles.forEach((profile, index) => {
      const result = this.validateProfile(profile);
      profileResults.push(result);
      
      result.errors.forEach(e => errors.push(`Profile ${index}: ${e}`));
      result.warnings.forEach(w => warnings.push(`Profile ${index}: ${w}`));
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      profileResults
    };
  }

  /**
   * Check if a contour is self-intersecting (simple check)
   */
  private isSelfIntersecting(contour: Array<[number, number]>): boolean {
    if (contour.length < 4) return false;

    // Simple bow-tie check for 4 points
    if (contour.length === 4) {
      const [p1, p2, p3, p4] = contour;
      // Check if diagonals intersect
      return this.doSegmentsIntersect(p1, p3, p2, p4);
    }

    return false;
  }

  /**
   * Check if two line segments intersect
   */
  private doSegmentsIntersect(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    p4: [number, number]
  ): boolean {
    const ccw = (A: [number, number], B: [number, number], C: [number, number]) => {
      return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
    };

    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }
}