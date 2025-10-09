/**
 * Service de validation pour les bâtiments
 * Sépare la logique de validation de l'interface utilisateur
 * Building Estimator - TopSteelCAD
 */

import {
  Building,
  BuildingDimensions,
  BuildingParameters,
  BuildingOpening,
  BuildingExtension,
  BuildingValidationResult,
  BuildingValidationError
} from '../types/building.types';
import { BuildingStep } from '../components/types';

/**
 * Résultat de validation pour un champ spécifique
 */
export interface FieldValidationResult {
  field: string;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Résultat de validation pour une étape
 */
export interface StepValidationResult {
  step: BuildingStep;
  isValid: boolean;
  canProceed: boolean;
  errors: FieldValidationResult[];
  warnings: string[];
}

/**
 * Service de validation centralisé
 *
 * Responsabilités:
 * - Valider les dimensions
 * - Valider les paramètres
 * - Valider les ouvertures
 * - Valider les extensions
 * - Valider les étapes du workflow
 * - Fournir des messages d'erreur cohérents
 */
export class BuildingValidator {
  /**
   * Valide les dimensions du bâtiment
   */
  static validateDimensions(
    dimensions: BuildingDimensions
  ): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation longueur
    if (!dimensions.length || dimensions.length <= 0) {
      errors.push('La longueur est requise et doit être positive');
    } else {
      if (dimensions.length < 3000) {
        errors.push('La longueur minimale est de 3m (3000mm)');
      }
      if (dimensions.length > 100000) {
        errors.push('La longueur maximale est de 100m (100000mm)');
      }
      if (dimensions.length > 50000) {
        warnings.push('Grande portée: vérifier les calculs structurels');
      }
    }

    // Validation largeur
    if (!dimensions.width || dimensions.width <= 0) {
      errors.push('La largeur est requise et doit être positive');
    } else {
      if (dimensions.width < 3000) {
        errors.push('La largeur minimale est de 3m (3000mm)');
      }
      if (dimensions.width > 40000) {
        errors.push('La largeur maximale est de 40m (40000mm)');
      }
      if (dimensions.width > 25000) {
        warnings.push('Large portée: profils renforcés recommandés');
      }
    }

    // Validation hauteur
    if (!dimensions.heightWall || dimensions.heightWall <= 0) {
      errors.push('La hauteur au mur est requise et doit être positive');
    } else {
      if (dimensions.heightWall < 2000) {
        errors.push('La hauteur au mur minimale est de 2m (2000mm)');
      }
      if (dimensions.heightWall > 15000) {
        errors.push('La hauteur au mur maximale est de 15m (15000mm)');
      }
    }

    // Validation pente
    if (!dimensions.slope || dimensions.slope <= 0) {
      errors.push('La pente est requise et doit être positive');
    } else {
      if (dimensions.slope < 3) {
        warnings.push('Pente faible (<3%): risque d\'accumulation d\'eau');
      }
      if (dimensions.slope > 50) {
        warnings.push('Pente élevée (>50%): vérifier stabilité et fixations');
      }
    }

    // Validation proportions
    if (dimensions.length && dimensions.width) {
      const ratio = dimensions.width / dimensions.length;
      if (ratio > 2) {
        warnings.push('Proportions inhabituelles: largeur > 2x longueur');
      }
    }

    return {
      field: 'dimensions',
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide les paramètres de construction
   */
  static validateParameters(
    parameters: BuildingParameters,
    dimensions?: BuildingDimensions
  ): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation entraxe poteaux
    if (!parameters.postSpacing || parameters.postSpacing <= 0) {
      errors.push('L\'entraxe des poteaux est requis');
    } else {
      if (parameters.postSpacing < 3000) {
        warnings.push('Entraxe poteaux faible (<3m): structure dense');
      }
      if (parameters.postSpacing > 8000) {
        warnings.push('Entraxe poteaux important (>8m): vérifier dimensionnement');
      }
    }

    // Validation entraxe pannes
    if (!parameters.purlinSpacing || parameters.purlinSpacing <= 0) {
      errors.push('L\'entraxe des pannes est requis');
    } else {
      if (parameters.purlinSpacing > 2000) {
        warnings.push('Entraxe pannes important (>2m): vérifier couverture');
      }
    }

    // Validation entraxe lisses
    if (!parameters.railSpacing || parameters.railSpacing <= 0) {
      errors.push('L\'entraxe des lisses est requis');
    } else {
      if (parameters.railSpacing > 1500) {
        warnings.push('Entraxe lisses important (>1.5m): vérifier bardage');
      }
    }

    // Validation profils
    if (!parameters.postProfile) {
      errors.push('Le profil des poteaux est requis');
    }
    if (!parameters.rafterProfile) {
      errors.push('Le profil des arbalétriers est requis');
    }
    if (!parameters.purlinProfile) {
      errors.push('Le profil des pannes est requis');
    }
    if (!parameters.railProfile) {
      errors.push('Le profil des lisses est requis');
    }

    // Validation grade acier
    if (!parameters.steelGrade) {
      errors.push('Le grade d\'acier est requis');
    }

    // Validation cohérence avec dimensions
    if (dimensions) {
      if (
        parameters.postSpacing &&
        dimensions.length &&
        dimensions.length < parameters.postSpacing * 2
      ) {
        warnings.push(
          'Bâtiment très court: au moins 2 travées recommandées'
        );
      }
    }

    return {
      field: 'parameters',
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide une ouverture
   */
  static validateOpening(
    opening: BuildingOpening,
    dimensions?: BuildingDimensions
  ): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation nom
    if (!opening.name || opening.name.trim() === '') {
      errors.push('Le nom de l\'ouverture est requis');
    }

    // Validation dimensions
    if (!opening.dimensions.width || opening.dimensions.width <= 0) {
      errors.push('La largeur de l\'ouverture est requise');
    } else if (opening.dimensions.width > 10000) {
      warnings.push('Ouverture très large (>10m): vérifier structure');
    }

    if (!opening.dimensions.height || opening.dimensions.height <= 0) {
      errors.push('La hauteur de l\'ouverture est requise');
    } else if (opening.dimensions.height > 8000) {
      warnings.push('Ouverture très haute (>8m): vérifier structure');
    }

    // Validation positionnement
    if (opening.offsetY < 0) {
      errors.push('La hauteur au sol ne peut être négative');
    }

    // Validation cohérence avec bâtiment
    if (dimensions) {
      if (opening.offsetY + opening.dimensions.height > dimensions.heightWall) {
        errors.push('L\'ouverture dépasse la hauteur du mur');
      }

      if (
        opening.offsetX !== undefined &&
        opening.offsetX + opening.dimensions.width > dimensions.length
      ) {
        errors.push('L\'ouverture dépasse la longueur du bâtiment');
      }

      if (
        opening.offsetZ !== undefined &&
        opening.offsetZ + opening.dimensions.width > dimensions.width
      ) {
        errors.push('L\'ouverture dépasse la largeur du bâtiment');
      }
    }

    return {
      field: `opening-${opening.id}`,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide une extension
   */
  static validateExtension(
    extension: BuildingExtension,
    parentDimensions?: BuildingDimensions
  ): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation nom
    if (!extension.name || extension.name.trim() === '') {
      errors.push('Le nom de l\'extension est requis');
    }

    // Validation dimensions via validateDimensions
    const dimValidation = this.validateDimensions(extension.dimensions);
    errors.push(...dimValidation.errors);
    warnings.push(...(dimValidation.warnings || []));

    // Validation attachement
    if (extension.bayIndex !== undefined && extension.bayIndex < 0) {
      errors.push('L\'index de la travée ne peut être négatif');
    }

    // Validation cohérence avec parent
    if (parentDimensions) {
      // Extensions ne peuvent être plus hautes que le parent
      if (extension.dimensions.heightWall > parentDimensions.heightWall * 1.2) {
        warnings.push('Extension significativement plus haute que le bâtiment principal');
      }
    }

    return {
      field: `extension-${extension.id}`,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide une étape du workflow
   */
  static validateStep(
    step: BuildingStep,
    state: any
  ): StepValidationResult {
    const errors: FieldValidationResult[] = [];
    const warnings: string[] = [];

    switch (step) {
      case BuildingStep.DIMENSIONS:
        // Valider dimensions
        const dimValidation = this.validateDimensions(state.dimensions);
        if (!dimValidation.isValid) {
          errors.push(dimValidation);
        }
        warnings.push(...(dimValidation.warnings || []));

        // Valider paramètres
        const paramValidation = this.validateParameters(
          state.parameters,
          state.dimensions
        );
        if (!paramValidation.isValid) {
          errors.push(paramValidation);
        }
        warnings.push(...(paramValidation.warnings || []));
        break;

      case BuildingStep.EQUIPMENT:
        // Valider ouvertures
        if (state.openings && state.openings.length > 0) {
          state.openings.forEach((opening: BuildingOpening) => {
            const openingValidation = this.validateOpening(
              opening,
              state.dimensions
            );
            if (!openingValidation.isValid) {
              errors.push(openingValidation);
            }
          });
        }
        break;

      case BuildingStep.ENVELOPE:
        // Validation enveloppe (bardage, couverture)
        // Pour le MVP, pas de validation stricte
        break;

      case BuildingStep.FINISHING:
        // Validation finitions
        // Pour le MVP, pas de validation stricte
        break;

      case BuildingStep.SUMMARY:
        // Validation globale
        if (!state.building) {
          errors.push({
            field: 'building',
            isValid: false,
            errors: ['Le bâtiment n\'a pas été généré']
          });
        }
        break;
    }

    return {
      step,
      isValid: errors.length === 0,
      canProceed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide un bâtiment complet
   */
  static validateBuilding(building: Building): BuildingValidationResult {
    const errors: BuildingValidationError[] = [];

    // Validation dimensions
    const dimValidation = this.validateDimensions(building.dimensions);
    if (!dimValidation.isValid) {
      errors.push(
        ...dimValidation.errors.map(msg => ({
          field: 'dimensions',
          message: msg,
          severity: 'error' as const
        }))
      );
    }

    // Validation paramètres
    const paramValidation = this.validateParameters(building.parameters);
    if (!paramValidation.isValid) {
      errors.push(
        ...paramValidation.errors.map(msg => ({
          field: 'parameters',
          message: msg,
          severity: 'error' as const
        }))
      );
    }

    // Validation structure
    if (!building.structure || building.structure.posts.length === 0) {
      errors.push({
        field: 'structure',
        message: 'La structure n\'a pas été générée',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formate un message d'erreur pour affichage
   */
  static formatErrorMessage(validation: FieldValidationResult): string {
    if (validation.isValid) return '';
    return validation.errors.join(', ');
  }

  /**
   * Formate tous les messages d'erreur d'une étape
   */
  static formatStepErrors(validation: StepValidationResult): string[] {
    return validation.errors.flatMap(field => field.errors);
  }
}
