/**
 * Calculateur de structure pour bâtiments
 * Calculs d'ossature, entraxes, surfaces, poids
 * Building Estimator - TopSteelCAD
 */

import {
  BuildingDimensions,
  BuildingParameters,
  Opening,
  WallType
} from '../types';

/**
 * Résultat des calculs d'ossature
 */
export interface FrameCalculationResult {
  // Quantités d'éléments
  postCount: number;
  rafterCount: number;
  purlinCount: number;
  railCount: number;

  // Longueurs
  totalPostLength: number;
  totalRafterLength: number;
  totalPurlinLength: number;
  totalRailLength: number;

  // Surfaces
  totalCladdingArea: number;
  netCladdingArea: number;
  totalRoofingArea: number;
  netRoofingArea: number;

  // Ouvertures
  totalOpeningArea: number;

  // Dimensions calculées
  heightRidge: number;
  rafterLength: number;
  roofSlope: number;
}

/**
 * Calculateur de structure pour bâtiment monopente
 */
export class FrameCalculator {
  /**
   * Calcule toute la structure du bâtiment monopente
   */
  static calculateMonoPenteFrame(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    openings: Opening[] = []
  ): FrameCalculationResult {
    // Calcul hauteur au faîtage
    const heightRidge = this.calculateHeightRidge(
      dimensions.heightWall,
      dimensions.width,
      dimensions.slope
    );

    // Calcul longueur arbalétrier
    const rafterLength = this.calculateRafterLength(
      dimensions.width,
      dimensions.slope
    );

    // Calcul pente réelle
    const roofSlope = this.calculateRoofSlope(
      dimensions.width,
      dimensions.slope
    );

    // Calcul nombre de poteaux
    const postCount = this.calculatePostCount(
      dimensions.length,
      parameters.postSpacing
    );

    // Nombre d'arbalétriers = nombre de poteaux (un par file)
    const rafterCount = postCount;

    // Calcul nombre de pannes
    const purlinCount = this.calculatePurlinCount(
      dimensions.length,
      rafterLength,
      parameters.purlinSpacing
    );

    // Calcul nombre de lisses
    const railCount = this.calculateRailCount(
      dimensions.length,
      dimensions.heightWall,
      heightRidge,
      parameters.railSpacing
    );

    // Calcul longueurs totales
    const totalPostLength = postCount * 2 * dimensions.heightWall; // 2 côtés
    const totalRafterLength = rafterCount * rafterLength;
    const totalPurlinLength = purlinCount * dimensions.length;
    const totalRailLength = railCount * dimensions.length;

    // Calcul surfaces
    const { totalCladdingArea, netCladdingArea, totalOpeningArea } =
      this.calculateCladdingAreas(dimensions, heightRidge, openings);

    const { totalRoofingArea, netRoofingArea } = this.calculateRoofingAreas(
      dimensions,
      rafterLength
    );

    return {
      postCount,
      rafterCount,
      purlinCount,
      railCount,
      totalPostLength,
      totalRafterLength,
      totalPurlinLength,
      totalRailLength,
      totalCladdingArea,
      netCladdingArea,
      totalRoofingArea,
      netRoofingArea,
      totalOpeningArea,
      heightRidge,
      rafterLength,
      roofSlope
    };
  }

  /**
   * Calcule la hauteur au faîtage
   */
  static calculateHeightRidge(
    heightWall: number,
    width: number,
    slope: number
  ): number {
    const rise = (width * slope) / 100;
    return heightWall + rise;
  }

  /**
   * Calcule la longueur de l'arbalétrier
   */
  static calculateRafterLength(width: number, slope: number): number {
    // Longueur = largeur / cos(angle)
    const angleRad = Math.atan(slope / 100);
    return width / Math.cos(angleRad);
  }

  /**
   * Calcule l'angle de pente en degrés
   */
  static calculateRoofSlope(width: number, slope: number): number {
    const angleRad = Math.atan(slope / 100);
    return (angleRad * 180) / Math.PI;
  }

  /**
   * Calcule le nombre de poteaux
   */
  static calculatePostCount(length: number, postSpacing: number): number {
    // Nombre d'intervalles + 1
    const intervals = Math.floor(length / postSpacing);
    return intervals + 1;
  }

  /**
   * Calcule le nombre de pannes
   */
  static calculatePurlinCount(
    length: number,
    rafterLength: number,
    purlinSpacing: number
  ): number {
    // Nombre de pannes sur la longueur du rampant
    const purlinCountPerRafter = Math.floor(rafterLength / purlinSpacing) + 1;

    // Nombre de files de pannes
    return purlinCountPerRafter;
  }

  /**
   * Calcule le nombre de lisses de bardage
   */
  static calculateRailCount(
    length: number,
    heightWall: number,
    heightRidge: number,
    railSpacing: number
  ): number {
    // Côté bas (hauteur constante)
    const railCountLow = Math.floor(heightWall / railSpacing) + 1;

    // Côté haut (hauteur variable)
    const railCountHigh = Math.floor(heightRidge / railSpacing) + 1;

    // Pignons
    const avgHeight = (heightWall + heightRidge) / 2;
    const railCountGable = Math.floor(avgHeight / railSpacing) + 1;

    // Total : 2 longs pans + 2 pignons
    return railCountLow + railCountHigh + railCountGable * 2;
  }

  /**
   * Calcule les surfaces de bardage
   */
  static calculateCladdingAreas(
    dimensions: BuildingDimensions,
    heightRidge: number,
    openings: Opening[]
  ): {
    totalCladdingArea: number;
    netCladdingArea: number;
    totalOpeningArea: number;
  } {
    const { length, width, heightWall } = dimensions;

    // Surface long pan bas (côté bas)
    const longPanLow = length * heightWall;

    // Surface long pan haut (côté haut)
    const longPanHigh = length * heightRidge;

    // Surface pignons (trapèzes)
    const gableArea = width * ((heightWall + heightRidge) / 2);

    // Surface totale
    const totalCladdingArea = longPanLow + longPanHigh + gableArea * 2;

    // Calcul surface ouvertures
    let totalOpeningArea = 0;
    for (const opening of openings) {
      totalOpeningArea +=
        (opening.dimensions.width * opening.dimensions.height) / 1_000_000; // mm² -> m²
    }

    // Surface nette
    const netCladdingArea = totalCladdingArea / 1_000_000 - totalOpeningArea;

    return {
      totalCladdingArea: totalCladdingArea / 1_000_000, // mm² -> m²
      netCladdingArea,
      totalOpeningArea
    };
  }

  /**
   * Calcule les surfaces de couverture
   */
  static calculateRoofingAreas(
    dimensions: BuildingDimensions,
    rafterLength: number
  ): {
    totalRoofingArea: number;
    netRoofingArea: number;
  } {
    const { length } = dimensions;

    // Surface de toiture = longueur × longueur rampant
    const totalRoofingArea = (length * rafterLength) / 1_000_000; // mm² -> m²

    // Pas de déduction pour MVP (pas d'exutoires)
    const netRoofingArea = totalRoofingArea;

    return {
      totalRoofingArea,
      netRoofingArea
    };
  }

  /**
   * Calcule le poids d'un profilé
   */
  static calculateProfileWeight(
    profileDesignation: string,
    length: number
  ): number {
    // Poids linéiques approximatifs (kg/m)
    const weights: Record<string, number> = {
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
      'HEB 280': 103.0,
      'HEB 300': 117.0,
      'UAP 65': 8.5,
      'UAP 80': 10.0,
      'UAP 100': 13.5,
      'UAP 120': 17.0,
      'UAP 150': 22.0
    };

    const weightPerMeter = weights[profileDesignation] || 20.0; // Valeur par défaut
    return (weightPerMeter * length) / 1000; // mm -> m
  }

  /**
   * Calcule le poids total de la structure
   */
  static calculateTotalSteelWeight(
    calculations: FrameCalculationResult,
    parameters: BuildingParameters
  ): {
    postWeight: number;
    rafterWeight: number;
    purlinWeight: number;
    railWeight: number;
    totalWeight: number;
  } {
    const postWeight = this.calculateProfileWeight(
      parameters.postProfile,
      calculations.totalPostLength
    );

    const rafterWeight = this.calculateProfileWeight(
      parameters.rafterProfile,
      calculations.totalRafterLength
    );

    const purlinWeight = this.calculateProfileWeight(
      parameters.purlinProfile,
      calculations.totalPurlinLength
    );

    const railWeight = this.calculateProfileWeight(
      parameters.railProfile,
      calculations.totalRailLength
    );

    const totalWeight = postWeight + rafterWeight + purlinWeight + railWeight;

    return {
      postWeight,
      rafterWeight,
      purlinWeight,
      railWeight,
      totalWeight
    };
  }

  /**
   * Valide les dimensions du bâtiment
   */
  static validateDimensions(dimensions: BuildingDimensions): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (dimensions.length < 3000) {
      errors.push('La longueur doit être au moins 3m');
    }
    if (dimensions.length > 100000) {
      errors.push('La longueur ne peut dépasser 100m');
    }

    if (dimensions.width < 3000) {
      errors.push('La largeur doit être au moins 3m');
    }
    if (dimensions.width > 50000) {
      errors.push('La largeur ne peut dépasser 50m');
    }

    if (dimensions.heightWall < 2500) {
      errors.push('La hauteur au mur doit être au moins 2.5m');
    }
    if (dimensions.heightWall > 20000) {
      errors.push('La hauteur au mur ne peut dépasser 20m');
    }

    if (dimensions.slope < 3) {
      errors.push('La pente doit être au moins 3%');
    }
    if (dimensions.slope > 50) {
      errors.push('La pente ne peut dépasser 50%');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
