/**
 * DSTVValidator - Validateur complet pour les profils DSTV
 * Vérifie la cohérence et la validité des données avec détection avancée
 */

import { DSTVProfile, ValidationResult, ValidationResults, ValidationLevel } from '../types';

/**
 * Configuration pour la validation
 */
interface ValidationConfig {
  maxProfileLength?: number;
  minHoleDistance?: number;
  maxHoleDiameter?: number;
  allowOverlappingHoles?: boolean;
  checkSelfIntersection?: boolean;
  validateMaterialGrade?: boolean;
  validateDimensions?: boolean;
}

/**
 * Validateur DSTV avec différents niveaux de validation
 */
export class DSTVValidator {
  private level: ValidationLevel;
  private config: ValidationConfig;

  constructor(
    level: ValidationLevel = ValidationLevel.STANDARD,
    config?: ValidationConfig
  ) {
    this.level = level;
    this.config = {
      maxProfileLength: 20000,
      minHoleDistance: 10,
      maxHoleDiameter: 500,
      allowOverlappingHoles: false,
      checkSelfIntersection: true,
      validateMaterialGrade: true,
      validateDimensions: true,
      ...config
    };
  }

  /**
   * Valide le contenu brut d'un fichier DSTV
   */
  validateRawContent(content: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('File content is empty');
      return { isValid: false, errors, warnings };
    }

    const lines = content.split(/\r?\n/);
    
    // Vérifier la structure de base
    let hasStart = false;
    let hasEnd = false;
    let blockStack: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Vérifier les blocs ST/EN
      if (trimmed === 'ST') {
        if (hasStart && !hasEnd) {
          warnings.push(`Line ${index + 1}: New ST block before EN`);
        }
        hasStart = true;
        hasEnd = false;
        blockStack = ['ST'];
      } else if (trimmed === 'EN') {
        if (!hasStart) {
          errors.push(`Line ${index + 1}: EN without matching ST`);
        }
        hasEnd = true;
        blockStack = [];
      }
      
      // Vérifier les blocs imbriqués
      if (trimmed.match(/^(AK|IK|BO|SI|SC|BR|PU|KO)$/)) {
        if (!hasStart || hasEnd) {
          errors.push(`Line ${index + 1}: Block ${trimmed} outside of ST/EN`);
        }
        blockStack.push(trimmed);
      }
      
      // Vérifier les caractères invalides
      if (this.level === ValidationLevel.STRICT) {
        if (!/^[\x20-\x7E\r\n\t]*$/.test(line)) {
          warnings.push(`Line ${index + 1}: Contains non-ASCII characters`);
        }
      }
      
      // Vérifier la longueur des lignes
      if (line.length > 256) {
        warnings.push(`Line ${index + 1}: Exceeds recommended length (256 chars)`);
      }
    });
    
    if (hasStart && !hasEnd) {
      errors.push('Missing EN block at end of file');
    }
    
    if (!hasStart) {
      errors.push('No ST block found in file');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide un profil unique avec validation complète
   */
  validateProfile(profile: DSTVProfile | null): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!profile) {
      errors.push('Profile is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Validation structurelle
    if (this.level !== ValidationLevel.BASIC) {
      // Champs requis
      if (!profile.designation) {
        errors.push('Profile designation is required');
      }
      
      if (!profile.profileType && !profile.designation) {
        errors.push('Profile type cannot be determined');
      }

      // Dimensions
      if (this.config.validateDimensions) {
        if (typeof profile.length !== 'number' || profile.length <= 0) {
          errors.push('Profile length must be positive');
        } else if (profile.length > this.config.maxProfileLength!) {
          warnings.push(`Profile length exceeds maximum (${this.config.maxProfileLength}mm)`);
        }
        
        if (profile.width && profile.width <= 0) {
          errors.push('Profile width must be positive');
        }
        
        if (profile.height && profile.height <= 0) {
          errors.push('Profile height must be positive');
        }
      }
      
      // Nuance d'acier
      if (this.config.validateMaterialGrade && profile.steelGrade) {
        if (!this.isValidSteelGrade(profile.steelGrade)) {
          warnings.push(`Non-standard steel grade: ${profile.steelGrade}`);
        }
      }
    }

    // Validation des features
    if (this.level === ValidationLevel.STANDARD || this.level === ValidationLevel.STRICT) {
      // Valider les trous
      if (profile.holes) {
        this.validateHoles(profile, errors, warnings);
      }

      // Valider les découpes
      if (profile.cuts) {
        this.validateCuts(profile, errors, warnings);
      }

      // Valider les marquages
      if (profile.markings) {
        this.validateMarkings(profile, errors, warnings);
      }
      
      // Validation croisée des features
      if (this.level === ValidationLevel.STRICT) {
        this.validateFeatureInteractions(profile, errors, warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide les trous avec détection des superpositions
   */
  private validateHoles(
    profile: DSTVProfile,
    errors: string[],
    warnings: string[]
  ): void {
    const holes = profile.holes || [];
    
    holes.forEach((hole, index) => {
      // Validation basique
      if (hole.diameter <= 0) {
        errors.push(`Hole ${index}: Invalid diameter (${hole.diameter})`);
      } else if (hole.diameter > this.config.maxHoleDiameter!) {
        warnings.push(`Hole ${index}: Unusually large diameter (${hole.diameter}mm)`);
      }
      
      // Validation de position
      if (this.level === ValidationLevel.STRICT) {
        if (hole.x > profile.length || hole.x < 0) {
          errors.push(`Hole ${index}: X position outside profile bounds`);
        }
        
        // Vérifier selon le type de face
        const maxY = this.getMaxYForFace(profile, hole.face);
        if (hole.y > maxY || hole.y < 0) {
          errors.push(`Hole ${index}: Y position outside face bounds`);
        }
      }
      
      // Validation spécifique aux trous oblongs
      if (hole.holeType === 'slotted') {
        if ((hole as any).slottedLength && (hole as any).slottedLength <= hole.diameter) {
          warnings.push(`Hole ${index}: Slotted length should be greater than diameter`);
        }
      }
    });
    
    // Détection des trous superposés
    if (!this.config.allowOverlappingHoles) {
      for (let i = 0; i < holes.length; i++) {
        for (let j = i + 1; j < holes.length; j++) {
          const h1 = holes[i];
          const h2 = holes[j];
          
          if (h1.face === h2.face) {
            const distance = Math.sqrt(
              Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2)
            );
            
            const minDistance = (h1.diameter + h2.diameter) / 2 + this.config.minHoleDistance!;
            
            if (distance < (h1.diameter + h2.diameter) / 2) {
              errors.push(`Holes ${i} and ${j} are overlapping`);
            } else if (distance < minDistance) {
              warnings.push(`Holes ${i} and ${j} are too close (${distance.toFixed(1)}mm)`);
            }
          }
        }
      }
    }
  }

  /**
   * Valide les découpes avec détection des auto-intersections
   */
  private validateCuts(
    profile: DSTVProfile,
    errors: string[],
    warnings: string[]
  ): void {
    const cuts = profile.cuts || [];
    
    cuts.forEach((cut, index) => {
      // Validation du contour
      if (cut.contour.length < 3) {
        errors.push(`Cut ${index}: Contour must have at least 3 points`);
      }
      
      // Vérifier la fermeture du contour
      const first = cut.contour[0];
      const last = cut.contour[cut.contour.length - 1];
      const isClosed = Math.abs(first[0] - last[0]) < 0.01 && 
                      Math.abs(first[1] - last[1]) < 0.01;
      
      if (!isClosed && cut.contour.length > 3) {
        warnings.push(`Cut ${index}: Contour is not closed`);
      }
      
      // Validation des points
      if (this.level === ValidationLevel.STRICT) {
        for (let i = 0; i < cut.contour.length; i++) {
          const point = cut.contour[i];
          
          if (point[0] > profile.length + 100 || point[0] < -100) {
            errors.push(`Cut ${index}: Point ${i} X coordinate outside bounds`);
            break;
          }
          
          const maxY = this.getMaxYForFace(profile, cut.face);
          if (point[1] > maxY + 100 || point[1] < -100) {
            errors.push(`Cut ${index}: Point ${i} Y coordinate outside bounds`);
            break;
          }
        }
      }
      
      // Détection des auto-intersections
      if (this.config.checkSelfIntersection && cut.contour.length > 3) {
        if (this.isSelfIntersecting(cut.contour)) {
          errors.push(`Cut ${index}: Contour is self-intersecting`);
        }
      }
      
      // Validation de la profondeur
      if (cut.depth !== undefined) {
        if (cut.depth > 0 && cut.depth > profile.thickness) {
          warnings.push(`Cut ${index}: Depth exceeds material thickness`);
        }
      }
    });
  }

  /**
   * Valide les marquages
   */
  private validateMarkings(
    profile: DSTVProfile,
    errors: string[],
    warnings: string[]
  ): void {
    const markings = profile.markings || [];
    
    markings.forEach((marking, index) => {
      // Validation du texte
      if (!marking.text || marking.text.trim() === '') {
        errors.push(`Marking ${index}: Text is required`);
      } else if (marking.text.length > 50) {
        warnings.push(`Marking ${index}: Text is unusually long`);
      }
      
      // Validation de position
      if (this.level === ValidationLevel.STRICT) {
        if (marking.x > profile.length || marking.x < 0) {
          errors.push(`Marking ${index}: X position outside profile bounds`);
        }
        
        const maxY = this.getMaxYForFace(profile, ProfileFace.FRONT);
        if (marking.y > maxY || marking.y < 0) {
          warnings.push(`Marking ${index}: Y position may be outside visible area`);
        }
      }
      
      // Validation de la taille
      if (marking.size) {
        if (marking.size <= 0) {
          errors.push(`Marking ${index}: Invalid size`);
        } else if (marking.size > 100) {
          warnings.push(`Marking ${index}: Text size is unusually large`);
        }
      }
    });
  }

  /**
   * Valide les interactions entre features
   */
  private validateFeatureInteractions(
    profile: DSTVProfile,
    errors: string[],
    warnings: string[]
  ): void {
    const holes = profile.holes || [];
    const cuts = profile.cuts || [];
    
    // Vérifier les trous dans les zones de découpe
    holes.forEach((hole, hIndex) => {
      cuts.forEach((cut, cIndex) => {
        if (hole.face === cut.face) {
          if (this.isPointInPolygon([hole.x, hole.y], cut.contour)) {
            warnings.push(`Hole ${hIndex} is inside cut ${cIndex} area`);
          }
        }
      });
    });
    
    // Vérifier les découpes qui se chevauchent
    for (let i = 0; i < cuts.length; i++) {
      for (let j = i + 1; j < cuts.length; j++) {
        if (cuts[i].face === cuts[j].face) {
          if (this.contoursOverlap(cuts[i].contour, cuts[j].contour)) {
            warnings.push(`Cuts ${i} and ${j} may be overlapping`);
          }
        }
      }
    }
  }

  /**
   * Vérifie si un contour est auto-intersectant (version améliorée)
   */
  private isSelfIntersecting(contour: Array<[number, number]>): boolean {
    const n = contour.length;
    if (n < 4) return false;
    
    // Vérifier toutes les paires de segments non adjacents
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n - 1; j++) {
        // Skip si les segments sont adjacents
        if (i === 0 && j === n - 2) continue;
        
        if (this.doSegmentsIntersect(
          contour[i],
          contour[i + 1],
          contour[j],
          contour[j + 1]
        )) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Vérifie si deux segments de ligne s'intersectent
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

  /**
   * Vérifie si un point est dans un polygone
   */
  private isPointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
    let inside = false;
    const [x, y] = point;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Vérifie si deux contours se chevauchent
   */
  private contoursOverlap(
    contour1: Array<[number, number]>,
    contour2: Array<[number, number]>
  ): boolean {
    // Vérifier si un point de contour1 est dans contour2
    for (const point of contour1) {
      if (this.isPointInPolygon(point, contour2)) {
        return true;
      }
    }
    
    // Vérifier si un point de contour2 est dans contour1
    for (const point of contour2) {
      if (this.isPointInPolygon(point, contour1)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Obtient la dimension Y maximale pour une face donnée
   */
  private getMaxYForFace(profile: DSTVProfile, face: any): number {
    // Utiliser les dimensions appropriées selon la face
    if (face === 'web' || face === 'o') {
      return profile.height || profile.width || 1000;
    } else {
      return profile.width || 200;
    }
  }

  /**
   * Valide une nuance d'acier
   */
  private isValidSteelGrade(grade: string): boolean {
    const validGrades = [
      'S235', 'S275', 'S355', 'S420', 'S460',
      'S235JR', 'S235J0', 'S235J2',
      'S275JR', 'S275J0', 'S275J2',
      'S355JR', 'S355J0', 'S355J2', 'S355K2',
      'S420N', 'S420NL', 'S460N', 'S460NL',
      'A36', 'A572', 'A992', // US grades
      'Grade 43', 'Grade 50', 'Grade 55' // UK grades
    ];
    
    return validGrades.some(valid => 
      grade.toUpperCase().includes(valid.toUpperCase())
    );
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

    // Validation individuelle
    profiles.forEach((profile, index) => {
      const result = this.validateProfile(profile);
      profileResults.push(result);
      
      result.errors.forEach(e => errors.push(`Profile ${index}: ${e}`));
      result.warnings.forEach(w => warnings.push(`Profile ${index}: ${w}`));
    });
    
    // Validation globale
    if (this.level === ValidationLevel.STRICT) {
      // Vérifier les IDs dupliqués
      const ids = new Set<string>();
      profiles.forEach((profile, index) => {
        if (profile.id) {
          if (ids.has(profile.id)) {
            errors.push(`Duplicate profile ID: ${profile.id}`);
          }
          ids.add(profile.id);
        }
      });
      
      // Statistiques
      const totalWeight = profiles.reduce((sum, p) => 
        sum + ((p as any).weight || 0), 0
      );
      
      if (totalWeight > 100000) {
        warnings.push(`Total weight is very high: ${totalWeight.toFixed(1)}kg`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      profileResults
    };
  }
}

// Import pour ProfileFace (temporaire, à ajuster selon l'organisation)
enum ProfileFace {
  FRONT = 'front',
  BACK = 'back',
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right'
}