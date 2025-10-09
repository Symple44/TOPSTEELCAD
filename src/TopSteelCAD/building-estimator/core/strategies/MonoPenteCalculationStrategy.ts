/**
 * Stratégie de calcul pour bâtiments monopente
 * Encapsule la logique de calcul spécifique au type monopente
 * Building Estimator - TopSteelCAD
 */

import {
  BuildingDimensions,
  BuildingParameters,
  Opening,
  WallType,
  BuildingValidationResult
} from '../../types/building.types';
import {
  ICalculationStrategy,
  FrameCalculations,
  CalculationOptions,
  CalculationStrategyBase
} from './ICalculationStrategy';
import { FrameCalculator } from '../FrameCalculator';

/**
 * Implémentation de la stratégie de calcul pour monopente
 *
 * Réutilise la logique existante de FrameCalculator pour assurer
 * la compatibilité avec le code existant
 */
export class MonoPenteCalculationStrategy extends CalculationStrategyBase {
  getName(): string {
    return 'MonoPente Standard';
  }

  getDescription(): string {
    return 'Calculs standards pour bâtiments à simple pente';
  }

  /**
   * Calcule l'ossature complète d'un bâtiment monopente
   */
  calculateFrame(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    openings: Opening[] = [],
    options?: CalculationOptions
  ): FrameCalculations {
    // Validation
    const validation = this.validateDimensions(dimensions);
    if (!validation.isValid) {
      throw new Error(`Dimensions invalides: ${validation.errors.join(', ')}`);
    }

    // Utiliser le FrameCalculator existant
    const frameResult = FrameCalculator.calculateMonoPenteFrame(
      dimensions,
      parameters,
      openings
    );

    // Calculer les poids
    const postWeight = this.calculateProfileWeight(
      parameters.postProfile,
      frameResult.totalPostLength,
      frameResult.postCount
    );

    const rafterWeight = this.calculateProfileWeight(
      parameters.rafterProfile,
      frameResult.rafterLength,
      frameResult.rafterCount
    );

    const purlinWeight = this.calculateProfileWeight(
      parameters.purlinProfile,
      dimensions.length,
      frameResult.purlinCount
    );

    const railWeight = this.calculateProfileWeight(
      parameters.railProfile,
      frameResult.totalRailLength / frameResult.railCount,
      frameResult.railCount
    );

    const totalSteelWeight = postWeight + rafterWeight + purlinWeight + railWeight;

    // Collecter les avertissements
    const warnings = this.collectWarnings(
      dimensions,
      parameters,
      frameResult,
      options
    );

    return {
      // Comptages
      postCount: frameResult.postCount,
      rafterCount: frameResult.rafterCount,
      purlinCount: frameResult.purlinCount,
      railCount: frameResult.railCount,

      // Dimensions calculées
      heightRidge: frameResult.heightRidge,
      rafterLength: frameResult.rafterLength,
      purlinLength: dimensions.length,

      // Surfaces
      totalRoofingArea: frameResult.totalRoofingArea,
      netRoofingArea: frameResult.netRoofingArea,
      totalCladdingArea: frameResult.totalCladdingArea,
      netCladdingArea: frameResult.netCladdingArea,

      // Poids
      totalSteelWeight,
      postWeight,
      rafterWeight,
      purlinWeight,
      railWeight,

      // Avertissements
      warnings
    };
  }

  /**
   * Valide les dimensions d'un bâtiment monopente
   */
  validateDimensions(dimensions: BuildingDimensions): BuildingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation longueur
    if (dimensions.length < 3000) {
      errors.push('La longueur minimale est de 3m');
    }
    if (dimensions.length > 100000) {
      errors.push('La longueur maximale est de 100m');
    }
    if (dimensions.length > 50000) {
      warnings.push('Grande portée: vérifier les calculs structurels');
    }

    // Validation largeur
    if (dimensions.width < 3000) {
      errors.push('La largeur minimale est de 3m');
    }
    if (dimensions.width > 40000) {
      errors.push('La largeur maximale est de 40m');
    }
    if (dimensions.width > 25000) {
      warnings.push('Large portée: profils renforcés recommandés');
    }

    // Validation hauteur
    if (dimensions.heightWall < 2000) {
      errors.push('La hauteur au mur minimale est de 2m');
    }
    if (dimensions.heightWall > 15000) {
      errors.push('La hauteur au mur maximale est de 15m');
    }

    // Validation pente
    if (dimensions.slope < 3) {
      warnings.push('Pente faible: risque d\'accumulation d\'eau');
    }
    if (dimensions.slope > 50) {
      warnings.push('Pente élevée: vérifier stabilité et fixations');
    }

    // Validation proportions
    const ratio = dimensions.width / dimensions.length;
    if (ratio > 2) {
      warnings.push('Proportions inhabituelles: largeur > 2x longueur');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(msg => ({
        field: 'dimensions',
        message: msg,
        severity: 'error'
      }))
    };
  }

  /**
   * Collecte les avertissements selon la configuration
   */
  private collectWarnings(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    frameResult: any,
    options?: CalculationOptions
  ): string[] {
    const warnings: string[] = [];

    // Avertissement entraxe poteaux
    if (parameters.postSpacing > 8000) {
      warnings.push('Entraxe poteaux important (>8m): vérifier dimensionnement');
    }

    // Avertissement entraxe pannes
    if (parameters.purlinSpacing > 2000) {
      warnings.push('Entraxe pannes important (>2m): vérifier couverture');
    }

    // Avertissement pente
    if (dimensions.slope < 5) {
      warnings.push('Pente faible: prévoir étanchéité renforcée');
    }

    // Avertissement surface toiture
    if (frameResult.totalRoofingArea > 2000) {
      warnings.push('Grande surface de toiture: prévoir calculs neige/vent');
    }

    // Avertissement optimisation
    if (options?.optimizeProfiles) {
      warnings.push('Profils à optimiser selon calculs Eurocode');
    }

    return warnings;
  }

  /**
   * Optimise les profils selon les charges (optionnel)
   */
  optimizeProfiles(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters
  ): {
    postProfile: string;
    rafterProfile: string;
    purlinProfile: string;
    railProfile: string;
  } {
    // Pour le MVP, on retourne les profils existants
    // TODO: Implémenter optimisation selon Eurocode 3
    return {
      postProfile: parameters.postProfile,
      rafterProfile: parameters.rafterProfile,
      purlinProfile: parameters.purlinProfile,
      railProfile: parameters.railProfile
    };
  }
}

/**
 * Instance par défaut de la stratégie
 */
export const defaultMonoPenteStrategy = new MonoPenteCalculationStrategy();
