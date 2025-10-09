/**
 * Interface pour les stratégies de calcul de structure
 * Pattern Strategy - permet de varier les algorithmes de calcul
 * Building Estimator - TopSteelCAD
 */

import {
  BuildingDimensions,
  BuildingParameters,
  Opening,
  BuildingValidationResult
} from '../../types/building.types';

/**
 * Résultat détaillé des calculs de structure
 */
export interface FrameCalculations {
  // Comptages
  postCount: number;
  rafterCount: number;
  purlinCount: number;
  railCount: number;

  // Dimensions calculées
  heightRidge: number;
  rafterLength: number;
  purlinLength: number;

  // Surfaces
  totalRoofingArea: number;        // Surface totale toiture (m²)
  netRoofingArea: number;          // Surface nette (après ouvertures)
  totalCladdingArea: number;       // Surface totale bardage (m²)
  netCladdingArea: number;         // Surface nette (après ouvertures)

  // Poids
  totalSteelWeight: number;        // Poids total acier (kg)
  postWeight: number;
  rafterWeight: number;
  purlinWeight: number;
  railWeight: number;

  // Avertissements
  warnings: string[];
}

/**
 * Résultat des calculs de charges (optionnel)
 */
export interface LoadCalculations {
  // Charges permanentes (G)
  deadLoad: number;                // kN/m²
  roofingWeight: number;
  cladingWeight: number;
  structureWeight: number;

  // Charges d'exploitation (Q)
  liveLoad: number;                // kN/m²

  // Charges climatiques
  snowLoad?: number;               // kN/m² (selon zone)
  windLoad?: number;               // kN/m² (selon zone et exposition)

  // Combinaisons
  ulsLoad?: number;                // État Limite Ultime (ELU)
  slsLoad?: number;                // État Limite de Service (ELS)
}

/**
 * Options de calcul
 */
export interface CalculationOptions {
  // Normes à appliquer
  designCode?: 'eurocode' | 'custom';

  // Facteurs de sécurité
  safetyFactor?: number;

  // Localisation (pour charges neige/vent)
  location?: {
    latitude: number;
    longitude: number;
    altitude: number;
    snowZone?: string;
    windZone?: string;
  };

  // Optimisation
  optimizeProfiles?: boolean;      // Optimiser le choix des profils
}

/**
 * Interface principale pour les stratégies de calcul
 *
 * Permet de varier les algorithmes de calcul sans modifier le code client
 * Facilite l'ajout de nouvelles normes (Eurocode, AISC, etc.)
 */
export interface ICalculationStrategy {
  /**
   * Calcule l'ossature complète
   */
  calculateFrame(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    openings?: Opening[],
    options?: CalculationOptions
  ): FrameCalculations;

  /**
   * Calcule les charges (optionnel, selon la stratégie)
   */
  calculateLoads?(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    options?: CalculationOptions
  ): LoadCalculations;

  /**
   * Valide les dimensions selon les règles métier
   */
  validateDimensions(dimensions: BuildingDimensions): BuildingValidationResult;

  /**
   * Optimise le choix des profils (optionnel)
   */
  optimizeProfiles?(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    loads?: LoadCalculations
  ): {
    postProfile: string;
    rafterProfile: string;
    purlinProfile: string;
    railProfile: string;
  };

  /**
   * Nom de la stratégie
   */
  getName(): string;

  /**
   * Description de la stratégie
   */
  getDescription(): string;
}

/**
 * Classe abstraite de base pour les stratégies
 * Fournit des méthodes utilitaires communes
 */
export abstract class CalculationStrategyBase implements ICalculationStrategy {
  abstract calculateFrame(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    openings?: Opening[],
    options?: CalculationOptions
  ): FrameCalculations;

  abstract validateDimensions(dimensions: BuildingDimensions): BuildingValidationResult;

  abstract getName(): string;

  abstract getDescription(): string;

  /**
   * Calcule le nombre d'éléments selon l'entraxe
   */
  protected calculateElementCount(totalLength: number, spacing: number): number {
    return Math.floor(totalLength / spacing) + 1;
  }

  /**
   * Calcule la longueur d'un arbalétrier selon la pente
   */
  protected calculateRafterLength(span: number, slope: number): number {
    const rise = span * (slope / 100);
    return Math.sqrt(span * span + rise * rise);
  }

  /**
   * Calcule la hauteur au faîtage
   */
  protected calculateHeightRidge(
    heightWall: number,
    span: number,
    slope: number
  ): number {
    const rise = span * (slope / 100);
    return heightWall + rise;
  }

  /**
   * Calcule la surface d'un toit en pente
   */
  protected calculateRoofArea(length: number, rafterLength: number): number {
    return (length * rafterLength) / 1e6; // mm² -> m²
  }

  /**
   * Calcule la surface de bardage d'un mur
   */
  protected calculateWallArea(length: number, height: number): number {
    return (length * height) / 1e6; // mm² -> m²
  }

  /**
   * Déduit les surfaces des ouvertures
   */
  protected deductOpeningsArea(
    totalArea: number,
    openings: Opening[]
  ): number {
    const openingsArea = openings.reduce((sum, opening) => {
      const area = (opening.dimensions.width * opening.dimensions.height) / 1e6;
      return sum + area;
    }, 0);

    return Math.max(0, totalArea - openingsArea);
  }

  /**
   * Calcule le poids d'un profil
   */
  protected calculateProfileWeight(
    profile: string,
    length: number,
    count: number = 1
  ): number {
    const weightPerMeter = this.getProfileLinearWeight(profile);
    return weightPerMeter * (length / 1000) * count; // mm -> m
  }

  /**
   * Base de données des poids linéaires (kg/m)
   */
  protected getProfileLinearWeight(profile: string): number {
    const linearWeights: Record<string, number> = {
      'IPE 80': 6.0,
      'IPE 100': 8.1,
      'IPE 120': 10.4,
      'IPE 140': 12.9,
      'IPE 160': 15.8,
      'IPE 180': 18.8,
      'IPE 200': 22.4,
      'IPE 220': 26.2,
      'IPE 240': 30.7,
      'IPE 270': 36.1,
      'IPE 300': 42.2,
      'IPE 330': 49.1,
      'IPE 360': 57.1,
      'IPE 400': 66.3,
      'IPE 450': 77.6,
      'IPE 500': 90.7,
      'HEA 100': 16.7,
      'HEA 120': 19.9,
      'HEA 140': 24.7,
      'HEA 160': 30.4,
      'HEA 180': 35.5,
      'HEA 200': 42.3,
      'HEA 220': 50.5,
      'HEA 240': 60.3,
      'HEA 260': 68.2,
      'HEA 280': 76.4,
      'HEA 300': 88.3,
      'HEB 100': 20.4,
      'HEB 120': 26.7,
      'HEB 140': 33.7,
      'HEB 160': 42.6,
      'HEB 180': 51.2,
      'HEB 200': 61.3,
      'HEB 220': 71.5,
      'HEB 240': 83.2,
      'HEB 260': 93.0,
      'HEB 280': 103.1,
      'HEB 300': 117.0,
      'UAP 65': 7.09,
      'UAP 80': 8.64,
      'UAP 100': 10.6,
      'UAP 120': 13.4,
      'UAP 140': 16.0,
      'UAP 160': 18.8,
      'UAP 180': 22.0,
      'UAP 200': 25.3,
      'UPN 80': 8.64,
      'UPN 100': 10.6,
      'UPN 120': 13.4,
      'UPN 140': 16.0,
      'UPN 160': 18.8,
      'UPN 180': 22.0,
      'UPN 200': 25.3
    };

    return linearWeights[profile] || 30; // Valeur par défaut
  }
}
