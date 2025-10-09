/**
 * Moteur de génération pour bâtiments monopente
 * Implémente la logique spécifique au type monopente
 * Building Estimator - TopSteelCAD
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MonoPenteBuilding,
  BuildingType,
  BuildingDimensions,
  BuildingParameters,
  BuildingStructure,
  StructuralElement,
  StructuralElementType,
  CladdingType,
  RoofingType,
  BuildingValidationResult,
  Opening
} from '../types/building.types';
import {
  BuildingEngineBase,
  BuildingConfig,
  BuildingCalculations
} from './BuildingEngineBase';
import {
  ICalculationStrategy,
  FrameCalculations
} from './strategies/ICalculationStrategy';
import { MonoPenteCalculationStrategy } from './strategies/MonoPenteCalculationStrategy';
import { FrameCalculator } from './FrameCalculator';

/**
 * Configuration spécifique pour créer un bâtiment monopente
 */
export interface MonoPenteConfig extends BuildingConfig<BuildingDimensions> {
  type: BuildingType.MONO_PENTE;
}

/**
 * Moteur de génération pour bâtiments monopente
 *
 * Étend BuildingEngineBase avec la logique spécifique monopente:
 * - 2 hauteurs de poteaux (bas et haut)
 * - Arbalétriers inclinés
 * - Pannes sur pente
 * - Lisses adaptées aux hauteurs variables
 */
export class MonoPenteEngine extends BuildingEngineBase<
  MonoPenteBuilding,
  BuildingDimensions
> {
  /**
   * Constructeur
   * @param calculationStrategy - Stratégie de calcul (par défaut: MonoPenteCalculationStrategy)
   */
  constructor(calculationStrategy?: ICalculationStrategy) {
    super(calculationStrategy || new MonoPenteCalculationStrategy());
  }

  /**
   * Crée le bâtiment de base monopente
   */
  protected createBaseBuilding(
    config: BuildingConfig<BuildingDimensions>,
    parameters: BuildingParameters
  ): MonoPenteBuilding {
    const now = this.now();

    // Finitions par défaut
    const finishes = {
      cladding: {
        type: config.finishes?.cladding?.type || CladdingType.SANDWICH_80MM,
        color: config.finishes?.cladding?.color || 'RAL 9002',
        thickness: config.finishes?.cladding?.thickness || 80
      },
      roofing: {
        type: config.finishes?.roofing?.type || RoofingType.SANDWICH_80MM,
        color: config.finishes?.roofing?.color || 'RAL 7016',
        thickness: config.finishes?.roofing?.thickness || 80
      },
      trim: {
        color: config.finishes?.trim?.color || 'RAL 9006'
      }
    };

    return {
      id: this.generateId(),
      name: config.name,
      type: BuildingType.MONO_PENTE,
      createdAt: now,
      updatedAt: now,
      dimensions: config.dimensions,
      parameters,
      structure: {
        posts: [],
        rafters: [],
        purlins: [],
        rails: []
      },
      openings: config.openings || [],
      finishes,
      metadata: config.metadata
    };
  }

  /**
   * Génère la structure complète du bâtiment monopente
   */
  generateStructure(building: MonoPenteBuilding): BuildingStructure {
    const { dimensions, parameters } = building;

    // Calculs de base
    const heightRidge = this.calculateHeightRidge(
      dimensions.heightWall,
      dimensions.width,
      dimensions.slope
    );

    const rafterLength = this.calculateRafterLength(
      dimensions.width,
      dimensions.slope
    );

    // Générer poteaux
    const posts = this.generatePosts(
      dimensions.length,
      dimensions.heightWall,
      heightRidge,
      parameters.postSpacing,
      parameters.postProfile
    );

    // Générer arbalétriers
    const rafters = this.generateRafters(
      dimensions.length,
      rafterLength,
      dimensions.heightWall,
      heightRidge,
      parameters.postSpacing,
      parameters.rafterProfile
    );

    // Générer pannes
    const purlins = this.generatePurlins(
      dimensions.length,
      rafterLength,
      dimensions.heightWall,
      parameters.purlinSpacing,
      parameters.purlinProfile
    );

    // Générer lisses
    const rails = this.generateRails(
      dimensions.length,
      dimensions.heightWall,
      heightRidge,
      dimensions.width,
      parameters.railSpacing,
      parameters.railProfile
    );

    return {
      posts,
      rafters,
      purlins,
      rails
    };
  }

  /**
   * Génère les arbalétriers
   */
  private generateRafters(
    length: number,
    rafterLength: number,
    heightWall: number,
    heightRidge: number,
    postSpacing: number,
    profile: string
  ): StructuralElement[] {
    const rafters: StructuralElement[] = [];
    const rafterCount = Math.floor(length / postSpacing) + 1;
    const angle = Math.atan((heightRidge - heightWall) / length);

    for (let i = 0; i < rafterCount; i++) {
      const x = i * postSpacing;

      rafters.push({
        id: uuidv4(),
        type: StructuralElementType.RAFTER,
        profile,
        length: rafterLength,
        position: { x, y: 0, z: heightWall },
        rotation: { x: 0, y: angle, z: 0 },
        weight: this.calculateProfileWeight(profile, rafterLength),
        reference: `ARB-${i + 1}`
      });
    }

    return rafters;
  }

  /**
   * Génère les pannes
   */
  private generatePurlins(
    length: number,
    rafterLength: number,
    heightWall: number,
    purlinSpacing: number,
    profile: string
  ): StructuralElement[] {
    const purlins: StructuralElement[] = [];
    const purlinCount = Math.floor(rafterLength / purlinSpacing) + 1;

    for (let i = 0; i < purlinCount; i++) {
      const distanceAlongRafter = i * purlinSpacing;
      const z =
        heightWall +
        distanceAlongRafter * Math.sin(Math.atan(rafterLength / length));

      purlins.push({
        id: uuidv4(),
        type: StructuralElementType.PURLIN,
        profile,
        length: length,
        position: { x: 0, y: distanceAlongRafter, z },
        rotation: { x: 0, y: 0, z: 0 },
        weight: this.calculateProfileWeight(profile, length),
        reference: `PAN-${i + 1}`
      });
    }

    return purlins;
  }

  /**
   * Génère les lisses de bardage
   */
  private generateRails(
    length: number,
    heightWall: number,
    heightRidge: number,
    width: number,
    railSpacing: number,
    profile: string
  ): StructuralElement[] {
    const rails: StructuralElement[] = [];
    let railIndex = 1;

    // Long pan bas (hauteur constante)
    const railCountLow = Math.floor(heightWall / railSpacing) + 1;
    for (let i = 0; i < railCountLow; i++) {
      const z = i * railSpacing;
      rails.push({
        id: uuidv4(),
        type: StructuralElementType.RAIL,
        profile,
        length: length,
        position: { x: 0, y: 0, z },
        rotation: { x: 0, y: 0, z: 0 },
        weight: this.calculateProfileWeight(profile, length),
        reference: `LIS-${railIndex++}`
      });
    }

    // Long pan haut (hauteur variable)
    const railCountHigh = Math.floor(heightRidge / railSpacing) + 1;
    for (let i = 0; i < railCountHigh; i++) {
      const z = i * railSpacing;
      rails.push({
        id: uuidv4(),
        type: StructuralElementType.RAIL,
        profile,
        length: length,
        position: { x: 0, y: width, z },
        rotation: { x: 0, y: 0, z: 0 },
        weight: this.calculateProfileWeight(profile, length),
        reference: `LIS-${railIndex++}`
      });
    }

    // Pignons (2 pignons)
    const avgHeight = (heightWall + heightRidge) / 2;
    const railCountGable = Math.floor(avgHeight / railSpacing) + 1;

    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < railCountGable; i++) {
        const z = i * railSpacing;
        const x = side === 0 ? 0 : length;

        rails.push({
          id: uuidv4(),
          type: StructuralElementType.RAIL,
          profile,
          length: width,
          position: { x, y: 0, z },
          rotation: { x: 0, y: Math.PI / 2, z: 0 },
          weight: this.calculateProfileWeight(profile, width),
          reference: `LIS-${railIndex++}`
        });
      }
    }

    return rails;
  }

  /**
   * Valide le bâtiment monopente
   */
  validate(building: MonoPenteBuilding): BuildingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation dimensions via la stratégie
    if (this.calculationStrategy) {
      const dimValidation = this.calculationStrategy.validateDimensions(
        building.dimensions
      );
      if (!dimValidation.isValid) {
        errors.push(...dimValidation.errors.map(e => e.message));
      }
    }

    // Validation structure
    if (building.structure.posts.length === 0) {
      errors.push('Aucun poteau défini');
    }

    if (building.structure.rafters.length === 0) {
      errors.push('Aucun arbalétrier défini');
    }

    // Warnings
    if (building.openings.length === 0) {
      warnings.push('Aucune ouverture définie');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(msg => ({
        field: 'building',
        message: msg,
        severity: 'error'
      }))
    };
  }

  /**
   * Calcule les métriques du bâtiment
   */
  calculate(building: MonoPenteBuilding): BuildingCalculations {
    if (!this.calculationStrategy) {
      throw new Error('Aucune stratégie de calcul définie');
    }

    const frameCalc: FrameCalculations = this.calculationStrategy.calculateFrame(
      building.dimensions,
      building.parameters,
      building.openings
    );

    return {
      postCount: frameCalc.postCount,
      rafterCount: frameCalc.rafterCount,
      purlinCount: frameCalc.purlinCount,
      railCount: frameCalc.railCount,
      totalSteelWeight: frameCalc.totalSteelWeight,
      heightRidge: frameCalc.heightRidge,
      rafterLength: frameCalc.rafterLength,
      totalRoofingArea: frameCalc.totalRoofingArea,
      totalCladdingArea: frameCalc.totalCladdingArea,
      warnings: frameCalc.warnings
    };
  }
}
