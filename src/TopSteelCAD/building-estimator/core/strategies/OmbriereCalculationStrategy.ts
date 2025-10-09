/**
 * Stratégie de calcul pour ombrières photovoltaïques
 * Calculs spécifiques: charges panneaux, ombrage, production électrique
 * Building Estimator - TopSteelCAD
 */

import {
  BuildingDimensions,
  BuildingParameters,
  Opening,
  BuildingValidationResult
} from '../../types/building.types';
import {
  OmbriereDimensions,
  SolarArrayConfig,
  SolarPanelSpec
} from '../../types/ombriere.types';
import {
  ICalculationStrategy,
  FrameCalculations,
  CalculationOptions,
  CalculationStrategyBase
} from './ICalculationStrategy';

/**
 * Résultat des calculs spécifiques ombrière
 */
export interface OmbriereCalculations extends FrameCalculations {
  // Solaire
  totalSolarPanels: number;
  totalSolarPower: number;            // kWc
  totalSolarArea: number;             // m²
  annualProduction: number;           // kWh/an
  specificProduction: number;         // kWh/kWc/an

  // Parking
  numberOfParkingSpaces: number;
  parkingArea: number;                // m²
  coveredRatio: number;               // Ratio surface couverte (%, 100 = entièrement couvert)

  // Charges supplémentaires
  solarPanelWeight: number;           // kg (poids total panneaux)
  additionalSnowLoad: number;         // kN/m² (charge neige sur panneaux inclinés)
  windLoad: number;                   // kN/m² (charge vent)
}

/**
 * Stratégie de calcul pour ombrières photovoltaïques
 *
 * Caractéristiques:
 * - Structure plane (pas de pente)
 * - Poteaux espacés pour places de parking
 * - Panneaux solaires inclinés sur structure
 * - Calcul d'ombrage entre rangées
 * - Production électrique estimée
 */
export class OmbriereCalculationStrategy extends CalculationStrategyBase {
  getName(): string {
    return 'Ombrière Photovoltaïque';
  }

  getDescription(): string {
    return 'Calculs pour ombrières photovoltaïques avec production solaire';
  }

  /**
   * Calcule l'ossature d'une ombrière
   */
  calculateFrame(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    openings: Opening[] = [],
    options?: CalculationOptions
  ): FrameCalculations {
    const ombriereDims = dimensions as OmbriereDimensions;

    // Validation
    const validation = this.validateDimensions(dimensions);
    if (!validation.isValid) {
      throw new Error(`Dimensions invalides: ${validation.errors.join(', ')}`);
    }

    // 1. Calcul structure porteuse
    const postCount = this.calculatePostCount(
      ombriereDims.length,
      parameters.postSpacing
    );

    // 2. Calcul pannes (supports panneaux)
    // Pour ombrière: une panne tous les ~2-3m perpendiculairement
    const purlinSpacing = parameters.purlinSpacing || 2500;
    const purlinCount = Math.floor(ombriereDims.width / purlinSpacing) + 1;

    // 3. Pas d'arbalétriers (structure plane)
    const rafterCount = 0;

    // 4. Pas de lisses (structure ouverte)
    const railCount = 0;

    // 5. Poutres horizontales (entretoises entre poteaux)
    const beamCount = postCount - 1;

    // 6. Calcul surfaces
    const totalRoofingArea = (ombriereDims.length * ombriereDims.width) / 1e6; // m²
    const netRoofingArea = totalRoofingArea; // Pas d'ouvertures en toiture pour ombrière

    // Pas de bardage pour ombrière
    const totalCladdingArea = 0;
    const netCladdingArea = 0;

    // 7. Calcul poids structure
    const postWeight = this.calculateProfileWeight(
      parameters.postProfile,
      ombriereDims.clearHeight,
      postCount
    );

    const purlinWeight = this.calculateProfileWeight(
      parameters.purlinProfile,
      ombriereDims.length,
      purlinCount
    );

    const beamWeight = this.calculateProfileWeight(
      parameters.rafterProfile, // Réutiliser profil arbalétrier pour poutres
      ombriereDims.width,
      beamCount
    );

    const rafterWeight = 0;
    const railWeight = 0;

    const totalSteelWeight = postWeight + purlinWeight + beamWeight;

    // 8. Collecte warnings
    const warnings = this.collectWarnings(
      ombriereDims,
      parameters,
      options
    );

    return {
      // Comptages
      postCount,
      rafterCount,
      purlinCount,
      railCount,

      // Dimensions
      heightRidge: ombriereDims.clearHeight, // Hauteur = hauteur libre
      rafterLength: 0,
      purlinLength: ombriereDims.length,

      // Surfaces
      totalRoofingArea,
      netRoofingArea,
      totalCladdingArea,
      netCladdingArea,

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
   * Calcule les métriques solaires complètes
   */
  calculateSolarMetrics(
    dimensions: OmbriereDimensions,
    solarArray: SolarArrayConfig,
    location?: { latitude: number; longitude: number }
  ): OmbriereCalculations {
    const frameCalc = this.calculateFrame(dimensions, {
      postSpacing: dimensions.parkingSpaceLength || 5000,
      purlinSpacing: 2500,
      railSpacing: 0,
      postProfile: 'IPE 240',
      rafterProfile: 'IPE 200',
      purlinProfile: 'IPE 140',
      railProfile: 'UAP 80',
      steelGrade: 'S235',
      includeGutters: false,
      includeDownspouts: false
    });

    // Calcul panneaux solaires
    const totalPanels = solarArray.rows * solarArray.columns;
    const totalPower = (totalPanels * solarArray.panel.power) / 1000; // kWc

    // Surface panneaux
    const panelArea = (solarArray.panel.width * solarArray.panel.height) / 1e6; // m²
    const totalSolarArea = totalPanels * panelArea;

    // Production annuelle estimée
    const { annualProduction, specificProduction } = this.estimateAnnualProduction(
      totalPower,
      dimensions.tilt,
      location
    );

    // Parking
    const parkingSpaceLength = dimensions.parkingSpaceLength || 5000;
    const parkingSpaceWidth = dimensions.parkingSpaceWidth || 2500;
    const numberOfSpaces = Math.floor(dimensions.length / parkingSpaceLength) *
                           Math.floor(dimensions.width / parkingSpaceWidth);
    const parkingArea = (dimensions.length * dimensions.width) / 1e6; // m²

    // Ratio de couverture
    const coveredRatio = (totalSolarArea / parkingArea) * 100;

    // Charges supplémentaires
    const solarPanelWeight = totalPanels * solarArray.panel.weight;

    // Charge neige sur panneaux inclinés (simplifié)
    const additionalSnowLoad = this.calculateSnowLoadOnTilt(dimensions.tilt);

    // Charge vent (simplifié)
    const windLoad = this.calculateWindLoad(dimensions.tilt, totalSolarArea);

    return {
      ...frameCalc,

      // Métriques solaires
      totalSolarPanels: totalPanels,
      totalSolarPower: totalPower,
      totalSolarArea,
      annualProduction,
      specificProduction,

      // Parking
      numberOfParkingSpaces: numberOfSpaces,
      parkingArea,
      coveredRatio,

      // Charges
      solarPanelWeight,
      additionalSnowLoad,
      windLoad
    };
  }

  /**
   * Estime la production annuelle
   */
  private estimateAnnualProduction(
    powerKwc: number,
    tilt: number,
    location?: { latitude: number; longitude: number }
  ): { annualProduction: number; specificProduction: number } {
    // Production spécifique selon l'inclinaison et la latitude
    // Valeurs typiques pour la France (latitude ~45°)

    // Production spécifique de base (kWh/kWc/an)
    let baseProduction = 1000; // France moyenne

    // Ajustement selon latitude (si fournie)
    if (location) {
      if (location.latitude < 40) {
        baseProduction = 1300; // Sud
      } else if (location.latitude > 50) {
        baseProduction = 900; // Nord
      }
    }

    // Ajustement selon inclinaison
    // Optimum ~30-35° en France
    const tiltFactor = this.getTiltFactor(tilt);
    const specificProduction = baseProduction * tiltFactor;

    // Production totale
    const annualProduction = powerKwc * specificProduction;

    return {
      annualProduction,
      specificProduction
    };
  }

  /**
   * Facteur de correction selon l'inclinaison
   */
  private getTiltFactor(tilt: number): number {
    // Courbe simplifiée (optimum à 30-35°)
    if (tilt <= 0) return 0.85;
    if (tilt <= 15) return 0.90 + (tilt / 15) * 0.05;
    if (tilt <= 30) return 0.95 + (tilt - 15) / 15 * 0.05;
    if (tilt <= 35) return 1.0;
    if (tilt <= 45) return 1.0 - (tilt - 35) / 10 * 0.05;
    return 0.90;
  }

  /**
   * Calcule la charge de neige sur panneaux inclinés
   */
  private calculateSnowLoadOnTilt(tilt: number): number {
    // Charge neige réduite avec l'inclinaison
    // Formule simplifiée selon Eurocode
    const baseSnowLoad = 0.45; // kN/m² (France zone A)

    if (tilt < 15) {
      return baseSnowLoad;
    } else if (tilt < 30) {
      return baseSnowLoad * (1 - (tilt - 15) / 30);
    } else {
      return baseSnowLoad * 0.5; // Réduit de 50% au-delà de 30°
    }
  }

  /**
   * Calcule la charge de vent
   */
  private calculateWindLoad(tilt: number, area: number): number {
    // Charge vent augmente avec l'inclinaison
    // Formule simplifiée
    const baseWindPressure = 0.8; // kN/m²
    const tiltFactor = 1 + (tilt / 90); // +100% à 90°

    return baseWindPressure * tiltFactor;
  }

  /**
   * Valide les dimensions d'une ombrière
   */
  validateDimensions(dimensions: BuildingDimensions): BuildingValidationResult {
    const ombriereDims = dimensions as OmbriereDimensions;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation longueur
    if (ombriereDims.length < 5000) {
      errors.push('La longueur minimale est de 5m (1 place de parking)');
    }
    if (ombriereDims.length > 100000) {
      errors.push('La longueur maximale est de 100m');
    }

    // Validation largeur
    if (ombriereDims.width < 5000) {
      errors.push('La largeur minimale est de 5m (1 rangée de parking)');
    }
    if (ombriereDims.width > 40000) {
      errors.push('La largeur maximale est de 40m');
    }

    // Validation hauteur libre
    if (ombriereDims.clearHeight < 2000) {
      errors.push('La hauteur libre minimale est de 2m');
    }
    if (ombriereDims.clearHeight > 4000) {
      warnings.push('Hauteur libre importante (>4m): coût structure augmenté');
    }

    // Validation inclinaison panneaux
    if (ombriereDims.tilt < 0) {
      errors.push('L\'inclinaison ne peut être négative');
    }
    if (ombriereDims.tilt > 30) {
      warnings.push('Inclinaison >30°: production réduite et charge vent augmentée');
    }
    if (ombriereDims.tilt < 10) {
      warnings.push('Inclinaison <10°: production sous-optimale');
    }

    // Validation places de parking
    if (ombriereDims.numberOfParkingSpaces) {
      const minLength = ombriereDims.numberOfParkingSpaces * (ombriereDims.parkingSpaceLength || 5000);
      if (ombriereDims.length < minLength) {
        errors.push(`Longueur insuffisante pour ${ombriereDims.numberOfParkingSpaces} places`);
      }
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
   * Collecte les avertissements
   */
  private collectWarnings(
    dimensions: OmbriereDimensions,
    parameters: BuildingParameters,
    options?: CalculationOptions
  ): string[] {
    const warnings: string[] = [];

    // Avertissement entraxe poteaux
    if (parameters.postSpacing > 6000) {
      warnings.push('Entraxe poteaux important (>6m): vérifier dimensionnement poutres');
    }

    // Avertissement hauteur
    if (dimensions.clearHeight > 3000) {
      warnings.push('Grande hauteur libre: prévoir contreventement renforcé');
    }

    // Avertissement inclinaison
    if (dimensions.tilt < 10) {
      warnings.push('Faible inclinaison: production solaire réduite (~5-10%)');
    }

    // Avertissement surface
    const totalArea = (dimensions.length * dimensions.width) / 1e6;
    if (totalArea > 2000) {
      warnings.push('Grande surface: prévoir études de sol et fondations adaptées');
    }

    return warnings;
  }
}

/**
 * Instance par défaut
 */
export const defaultOmbriereStrategy = new OmbriereCalculationStrategy();
