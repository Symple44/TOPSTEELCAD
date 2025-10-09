/**
 * Utilitaires pour calculer la synthèse d'un bâtiment
 * Building Estimator - TopSteelCAD
 */

import { BuildingDimensions, BuildingParameters, BuildingType } from '../types';

export interface BuildingSummary {
  totalWeight: number; // kg
  roofingArea: number; // m²
  claddingArea: number; // m²
  floorArea: number; // m²
}

/**
 * Calcule une estimation rapide du poids total de l'ossature
 * Basé sur des coefficients moyens par type de profil
 */
export function calculateEstimatedWeight(
  dimensions: BuildingDimensions,
  parameters: BuildingParameters,
  buildingType: BuildingType
): number {
  const { length, width, heightWall, slope } = dimensions;
  const { postSpacing, purlinSpacing } = parameters;

  // Poids linéaires approximatifs (kg/m) selon les profils standards
  const getProfileWeight = (profile: string): number => {
    // Extraction de la hauteur du profil (ex: IPE200 -> 200, HEA240 -> 240)
    const match = profile.match(/\d+/);
    const height = match ? parseInt(match[0]) : 200;

    // Formules approximatives selon le type de profil
    if (profile.startsWith('IPE')) return height * 0.4;
    if (profile.startsWith('HE')) return height * 0.6;
    if (profile.startsWith('UAP')) return height * 0.3;
    if (profile.startsWith('UPN')) return height * 0.35;
    return height * 0.4; // Par défaut
  };

  const postWeight = getProfileWeight(parameters.postProfile);
  const rafterWeight = getProfileWeight(parameters.rafterProfile);
  const purlinWeight = getProfileWeight(parameters.purlinProfile);
  const railWeight = getProfileWeight(parameters.railProfile);

  // Calcul nombre de portiques
  const numPortals = Math.ceil(length / postSpacing) + 1;

  // Calcul hauteur au faîtage
  let ridgeHeight = heightWall;
  if (buildingType === BuildingType.MONO_PENTE) {
    ridgeHeight = heightWall + (width * slope) / 100;
  } else if (buildingType === BuildingType.BI_PENTE) {
    ridgeHeight = heightWall + (width * slope) / 200;
  } else if (buildingType === BuildingType.BI_PENTE_ASYM) {
    const ridgeOffset = dimensions.ridgeOffset || 50;
    const ridgeZ = (width * ridgeOffset) / 100;
    const leftSlope = dimensions.leftSlope || slope;
    const rightSlope = dimensions.rightSlope || slope;
    const leftHeight = (ridgeZ * leftSlope) / 100;
    const rightHeight = ((width - ridgeZ) * rightSlope) / 100;
    ridgeHeight = heightWall + Math.max(leftHeight, rightHeight);
  }

  // Poids des poteaux (mm -> m)
  const postLength = heightWall / 1000;
  const totalPostWeight = numPortals * 2 * postLength * postWeight;

  // Poids des arbalétriers
  const rafterLength = Math.sqrt(Math.pow(width / 1000, 2) + Math.pow((ridgeHeight - heightWall) / 1000, 2));
  const totalRafterWeight = numPortals * rafterLength * rafterWeight;

  // Poids des pannes
  const numPurlins = Math.ceil(width / purlinSpacing);
  const totalPurlinWeight = numPurlins * (length / 1000) * purlinWeight;

  // Poids des lisses (approximatif: 5 lisses par face)
  const totalRailWeight = 2 * 5 * (length / 1000) * railWeight;

  // Total ossature principale + secondaire
  const mainFrameWeight = totalPostWeight + totalRafterWeight;
  const secondaryFrameWeight = totalPurlinWeight + totalRailWeight;

  return Math.round(mainFrameWeight + secondaryFrameWeight);
}

/**
 * Calcule la surface de couverture avec débords
 */
export function calculateRoofingArea(
  dimensions: BuildingDimensions,
  buildingType: BuildingType
): number {
  const { length, width, heightWall, slope } = dimensions;
  const overhangLeft = dimensions.overhangGableLeft || 0;
  const overhangRight = dimensions.overhangGableRight || 0;
  const overhangFront = dimensions.overhangLongPanFront || 0;
  const overhangBack = dimensions.overhangLongPanBack || 0;

  // Longueur avec débords pignons
  const effectiveLength = (length + overhangLeft + overhangRight) / 1000; // en m

  // Largeur avec débords long-pans
  const effectiveWidth = (width + overhangFront + overhangBack) / 1000; // en m

  let area = 0;

  if (buildingType === BuildingType.MONO_PENTE) {
    // Surface rampante = longueur × largeur_projetée / cos(angle)
    const slopeAngle = Math.atan(slope / 100);
    const rampantWidth = effectiveWidth / Math.cos(slopeAngle);
    area = effectiveLength * rampantWidth;
  } else if (buildingType === BuildingType.BI_PENTE) {
    // Deux versants identiques
    const halfWidth = effectiveWidth / 2;
    const slopeAngle = Math.atan(slope / 100);
    const rampantWidth = halfWidth / Math.cos(slopeAngle);
    area = 2 * effectiveLength * rampantWidth;
  } else if (buildingType === BuildingType.BI_PENTE_ASYM) {
    // Deux versants différents
    const ridgeOffset = dimensions.ridgeOffset || 50;
    const ridgeZ = (width * ridgeOffset) / 100;
    const leftSlope = dimensions.leftSlope || slope;
    const rightSlope = dimensions.rightSlope || slope;

    const leftWidthProjected = (ridgeZ + overhangFront) / 1000;
    const rightWidthProjected = (width - ridgeZ + overhangBack) / 1000;

    const leftAngle = Math.atan(leftSlope / 100);
    const rightAngle = Math.atan(rightSlope / 100);

    const leftRampant = leftWidthProjected / Math.cos(leftAngle);
    const rightRampant = rightWidthProjected / Math.cos(rightAngle);

    area = effectiveLength * (leftRampant + rightRampant);
  } else if (buildingType === BuildingType.PLANCHER) {
    // Surface plane
    area = effectiveLength * effectiveWidth;
  } else if (buildingType === BuildingType.AUVENT || buildingType === BuildingType.OMBRIERE) {
    // Mono-pente simple
    const slopeAngle = Math.atan(slope / 100);
    const rampantWidth = effectiveWidth / Math.cos(slopeAngle);
    area = effectiveLength * rampantWidth;
  }

  return Math.round(area * 100) / 100; // Arrondi à 2 décimales
}

/**
 * Calcule la surface de bardage
 */
export function calculateCladdingArea(
  dimensions: BuildingDimensions,
  buildingType: BuildingType
): number {
  const { length, width, heightWall, slope } = dimensions;

  // Surface des longs-pans (2 faces)
  const longPanArea = 2 * (length / 1000) * (heightWall / 1000);

  // Surface des pignons
  let gableArea = 0;

  if (buildingType === BuildingType.MONO_PENTE) {
    // Trapèze
    const heightBottom = heightWall / 1000;
    const heightTop = (heightWall + (width * slope) / 100) / 1000;
    gableArea = 2 * (width / 1000) * (heightBottom + heightTop) / 2;
  } else if (buildingType === BuildingType.BI_PENTE) {
    // Triangle sur rectangle
    const ridgeHeight = (heightWall + (width * slope) / 200) / 1000;
    const rectangleArea = (width / 1000) * (heightWall / 1000);
    const triangleArea = (width / 1000) * ((ridgeHeight - heightWall / 1000)) / 2;
    gableArea = 2 * (rectangleArea + triangleArea);
  } else if (buildingType === BuildingType.BI_PENTE_ASYM) {
    // Trapèze asymétrique
    const ridgeOffset = dimensions.ridgeOffset || 50;
    const leftSlope = dimensions.leftSlope || slope;
    const rightSlope = dimensions.rightSlope || slope;

    const ridgeZ = (width * ridgeOffset) / 100;
    const leftHeight = (ridgeZ * leftSlope) / 100;
    const rightHeight = ((width - ridgeZ) * rightSlope) / 100;
    const ridgeHeight = (heightWall + Math.max(leftHeight, rightHeight)) / 1000;

    const heightBottom = heightWall / 1000;
    gableArea = 2 * (width / 1000) * (heightBottom + ridgeHeight) / 2;
  } else {
    // PLANCHER, AUVENT, OMBRIERE : pas de pignons fermés ou réduits
    gableArea = 0;
  }

  return Math.round((longPanArea + gableArea) * 100) / 100; // Arrondi à 2 décimales
}

/**
 * Calcule la surface au sol
 */
export function calculateFloorArea(dimensions: BuildingDimensions): number {
  const { length, width } = dimensions;
  return Math.round((length * width) / 1_000_000 * 100) / 100; // m² arrondi à 2 décimales
}

/**
 * Calcule la synthèse complète d'un bâtiment
 */
export function calculateBuildingSummary(
  dimensions: BuildingDimensions,
  parameters: BuildingParameters,
  buildingType: BuildingType
): BuildingSummary {
  return {
    totalWeight: calculateEstimatedWeight(dimensions, parameters, buildingType),
    roofingArea: calculateRoofingArea(dimensions, buildingType),
    claddingArea: calculateCladdingArea(dimensions, buildingType),
    floorArea: calculateFloorArea(dimensions)
  };
}
