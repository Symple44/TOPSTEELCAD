/**
 * Moteur de génération pour ombrières photovoltaïques
 * Implémente la logique spécifique aux ombrières solaires
 * Building Estimator - TopSteelCAD
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BuildingType,
  BuildingParameters,
  BuildingValidationResult,
  StructuralElement,
  StructuralElementType
} from '../types/building.types';
import {
  OmbriereBuilding,
  OmbriereDimensions,
  OmbriereStructure,
  SolarArrayConfig,
  SolarPanel,
  SolarPanelSpec,
  InverterConfig,
  CableTrayConfig,
  ElectricalDesign,
  COMMON_SOLAR_PANELS
} from '../types/ombriere.types';
import {
  BuildingEngineBase,
  BuildingConfig,
  BuildingCalculations
} from './BuildingEngineBase';
import {
  ICalculationStrategy,
  FrameCalculations
} from './strategies/ICalculationStrategy';
import {
  OmbriereCalculationStrategy,
  OmbriereCalculations
} from './strategies/OmbriereCalculationStrategy';

/**
 * Configuration spécifique pour créer une ombrière
 */
export interface OmbriereConfig extends BuildingConfig<OmbriereDimensions> {
  type: BuildingType.OMBRIERE;
  solarArray: SolarArrayConfig;
  location?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
}

/**
 * Moteur de génération pour ombrières photovoltaïques
 *
 * Caractéristiques:
 * - Structure plane (pas de pente de toit)
 * - Poteaux espacés pour places de parking
 * - Panneaux solaires inclinés sur la structure
 * - Système électrique complet (onduleurs, câblage)
 * - Calcul de production solaire
 */
export class OmbriereEngine extends BuildingEngineBase<
  OmbriereBuilding,
  OmbriereDimensions
> {
  /**
   * Constructeur
   */
  constructor(calculationStrategy?: ICalculationStrategy) {
    super(calculationStrategy || new OmbriereCalculationStrategy());
  }

  /**
   * Crée le bâtiment de base ombrière
   */
  protected createBaseBuilding(
    config: BuildingConfig<OmbriereDimensions>,
    parameters: BuildingParameters
  ): OmbriereBuilding {
    const ombriereConfig = config as OmbriereConfig;
    const now = this.now();

    // Calculer métriques solaires
    const solarMetrics = this.calculateSolarMetrics(
      ombriereConfig.dimensions,
      ombriereConfig.solarArray,
      ombriereConfig.location
    );

    // Layout parking
    const parkingLayout = {
      numberOfSpaces: solarMetrics.numberOfParkingSpaces,
      spaceWidth: ombriereConfig.dimensions.parkingSpaceWidth || 2500,
      spaceLength: ombriereConfig.dimensions.parkingSpaceLength || 5000,
      totalArea: solarMetrics.parkingArea
    };

    // Performance
    const performance = {
      annualProduction: solarMetrics.annualProduction,
      specificProduction: solarMetrics.specificProduction,
      performanceRatio: 0.80, // PR typique 80%
      carbonOffset: solarMetrics.annualProduction * 0.000057 // tonnes CO2/kWh (France)
    };

    // Design électrique initial (sera complété après génération)
    const electricalDesign: ElectricalDesign = {
      totalPower: solarMetrics.totalSolarPower,
      totalPanels: solarMetrics.totalSolarPanels,
      inverters: [],
      cableTrays: [],
      dcCableLength: 0,
      acCableLength: 0,
      earthingSystem: 'TT',
      surgeProt: true,
      annualProduction: solarMetrics.annualProduction,
      specificProduction: solarMetrics.specificProduction
    };

    return {
      id: this.generateId(),
      name: config.name,
      type: BuildingType.OMBRIERE,
      createdAt: now,
      updatedAt: now,
      dimensions: ombriereConfig.dimensions,
      parameters,
      structure: {
        posts: [],
        beams: [],
        purlins: [],
        rails: [],
        bracing: [],
        solarPanels: [],
        solarFraming: [],
        inverters: [],
        cableTrays: []
      },
      openings: [],
      finishes: {
        cladding: { type: 'NONE' as any, color: '' },
        roofing: { type: 'NONE' as any, color: '' }
      },
      solarArray: ombriereConfig.solarArray,
      electricalDesign,
      parkingLayout,
      performance,
      metadata: config.metadata
    };
  }

  /**
   * Génère la structure complète de l'ombrière
   */
  generateStructure(building: OmbriereBuilding): OmbriereStructure {
    const { dimensions, parameters, solarArray } = building;

    // 1. Générer poteaux
    const posts = this.generatePosts(
      dimensions.length,
      dimensions.clearHeight,
      dimensions.clearHeight, // Même hauteur partout (structure plane)
      parameters.postSpacing,
      parameters.postProfile
    );

    // 2. Générer poutres horizontales (entretoises entre poteaux)
    const beams = this.generateBeams(
      dimensions.length,
      dimensions.width,
      dimensions.clearHeight,
      parameters.postSpacing,
      parameters.rafterProfile
    );

    // 3. Générer pannes (supports pour panneaux solaires)
    const purlins = this.generatePurlins(
      dimensions.length,
      dimensions.width,
      dimensions.clearHeight,
      parameters.purlinSpacing || 2500,
      parameters.purlinProfile
    );

    // 4. Générer contreventement
    const bracing = this.generateBracing(
      dimensions.length,
      dimensions.width,
      dimensions.clearHeight,
      parameters.postSpacing
    );

    // 5. Générer panneaux solaires
    const solarPanels = this.generateSolarPanels(
      dimensions,
      solarArray
    );

    // 6. Générer ossature support panneaux
    const solarFraming = this.generateSolarFraming(
      dimensions,
      solarArray
    );

    // 7. Générer onduleurs
    const inverters = this.generateInverters(
      solarArray,
      dimensions
    );

    // 8. Générer chemins de câbles
    const cableTrays = this.generateCableTrays(
      dimensions,
      solarArray
    );

    return {
      posts,
      beams,
      purlins,
      rails: [], // Pas de lisses pour ombrière
      bracing,
      solarPanels,
      solarFraming,
      inverters,
      cableTrays
    };
  }

  /**
   * Génère les poutres horizontales
   */
  private generateBeams(
    length: number,
    width: number,
    height: number,
    postSpacing: number,
    profile: string
  ): StructuralElement[] {
    const beams: StructuralElement[] = [];
    const numberOfBays = Math.floor(length / postSpacing);

    // Poutres longitudinales (sens longueur)
    const beamCountPerRow = numberOfBays;
    const rowCount = 2; // Avant et arrière

    for (let row = 0; row < rowCount; row++) {
      const y = row === 0 ? 0 : width;

      for (let i = 0; i < beamCountPerRow; i++) {
        const x = i * postSpacing;

        beams.push({
          id: uuidv4(),
          type: StructuralElementType.BEAM,
          profile,
          length: postSpacing,
          position: { x, y, z: height },
          rotation: { x: 0, y: 0, z: 0 },
          weight: this.calculateProfileWeight(profile, postSpacing),
          reference: `POU-L-${row}-${i + 1}`
        });
      }
    }

    // Poutres transversales (sens largeur)
    const portalCount = Math.floor(length / postSpacing) + 1;

    for (let i = 0; i < portalCount; i++) {
      const x = i * postSpacing;

      beams.push({
        id: uuidv4(),
        type: StructuralElementType.BEAM,
        profile,
        length: width,
        position: { x, y: 0, z: height },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        weight: this.calculateProfileWeight(profile, width),
        reference: `POU-T-${i + 1}`
      });
    }

    return beams;
  }

  /**
   * Génère les pannes (supports panneaux)
   */
  private generatePurlins(
    length: number,
    width: number,
    height: number,
    purlinSpacing: number,
    profile: string
  ): StructuralElement[] {
    const purlins: StructuralElement[] = [];
    const purlinCount = Math.floor(width / purlinSpacing) + 1;

    for (let i = 0; i < purlinCount; i++) {
      const y = i * purlinSpacing;

      purlins.push({
        id: uuidv4(),
        type: StructuralElementType.PURLIN,
        profile,
        length: length,
        position: { x: 0, y, z: height + 200 }, // +200mm au-dessus des poutres
        rotation: { x: 0, y: 0, z: 0 },
        weight: this.calculateProfileWeight(profile, length),
        reference: `PAN-${i + 1}`
      });
    }

    return purlins;
  }

  /**
   * Génère le contreventement
   */
  private generateBracing(
    length: number,
    width: number,
    height: number,
    postSpacing: number
  ): StructuralElement[] {
    const bracing: StructuralElement[] = [];

    // Contreventement en croix de Saint-André
    // Entre chaque paire de poteaux

    const bayCount = Math.floor(length / postSpacing);

    for (let bay = 0; bay < bayCount; bay++) {
      const x = bay * postSpacing;
      const diagonal = Math.sqrt(postSpacing ** 2 + width ** 2);

      // Diagonale montante
      bracing.push({
        id: uuidv4(),
        type: StructuralElementType.BRACING,
        profile: 'L 50x50x5',
        length: diagonal,
        position: { x, y: 0, z: height },
        rotation: {
          x: 0,
          y: Math.atan(width / postSpacing),
          z: 0
        },
        weight: this.calculateProfileWeight('L 50x50x5', diagonal),
        reference: `CV-${bay + 1}-A`
      });

      // Diagonale descendante
      bracing.push({
        id: uuidv4(),
        type: StructuralElementType.BRACING,
        profile: 'L 50x50x5',
        length: diagonal,
        position: { x: x + postSpacing, y: 0, z: height },
        rotation: {
          x: 0,
          y: -Math.atan(width / postSpacing),
          z: 0
        },
        weight: this.calculateProfileWeight('L 50x50x5', diagonal),
        reference: `CV-${bay + 1}-B`
      });
    }

    return bracing;
  }

  /**
   * Génère les panneaux solaires
   */
  private generateSolarPanels(
    dimensions: OmbriereDimensions,
    solarArray: SolarArrayConfig
  ): SolarPanel[] {
    const panels: SolarPanel[] = [];
    const { panel, orientation, rows, columns, tilt, azimuth } = solarArray;

    // Dimensions selon orientation
    const panelWidth = orientation === 'landscape' ? panel.width : panel.height;
    const panelHeight = orientation === 'landscape' ? panel.height : panel.width;

    // Espacement
    const rowSpacing = solarArray.rowSpacing || 100;
    const columnSpacing = solarArray.columnSpacing || 50;

    // Position de départ (centré)
    const totalWidth = columns * panelWidth + (columns - 1) * columnSpacing;
    const totalLength = rows * panelHeight + (rows - 1) * rowSpacing;

    const startX = (dimensions.length - totalLength) / 2;
    const startY = (dimensions.width - totalWidth) / 2;

    // Hauteur des panneaux (au-dessus des pannes + inclinaison)
    const baseZ = dimensions.clearHeight + 300; // +300mm au-dessus des pannes

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = startX + row * (panelHeight + rowSpacing);
        const y = startY + col * (panelWidth + columnSpacing);

        panels.push({
          id: uuidv4(),
          spec: panel,
          row,
          column: col,
          position: { x, y, z: baseZ },
          orientation,
          tilt,
          azimuth,
          status: 'active'
        });
      }
    }

    return panels;
  }

  /**
   * Génère l'ossature support panneaux
   */
  private generateSolarFraming(
    dimensions: OmbriereDimensions,
    solarArray: SolarArrayConfig
  ): StructuralElement[] {
    const framing: StructuralElement[] = [];

    // Profils aluminium pour fixer les panneaux
    // Simplifié pour le MVP

    const { rows, columns } = solarArray;
    const baseZ = dimensions.clearHeight + 250;

    // Rails aluminium longitudinaux (2 par rangée de panneaux)
    for (let row = 0; row < rows; row++) {
      for (let railIndex = 0; railIndex < 2; railIndex++) {
        framing.push({
          id: uuidv4(),
          type: 'solar_rail' as any,
          profile: 'Rail Alu 40x40',
          length: dimensions.length,
          position: {
            x: 0,
            y: railIndex * 1000,
            z: baseZ
          },
          rotation: { x: 0, y: 0, z: 0 },
          weight: 2.5 * (dimensions.length / 1000), // Alu léger
          reference: `RAIL-SOL-${row}-${railIndex}`
        });
      }
    }

    return framing;
  }

  /**
   * Génère les onduleurs
   */
  private generateInverters(
    solarArray: SolarArrayConfig,
    dimensions: OmbriereDimensions
  ): InverterConfig[] {
    const totalPower = (solarArray.rows * solarArray.columns * solarArray.panel.power) / 1000; // kWc

    // Calculer nombre d'onduleurs nécessaires
    // Ratio 1 onduleur de 50kW pour ~55kWc
    const inverterPower = 50; // kW
    const numberOfInverters = Math.ceil(totalPower / (inverterPower * 1.1));

    const inverters: InverterConfig[] = [];

    for (let i = 0; i < numberOfInverters; i++) {
      inverters.push({
        manufacturer: 'Huawei',
        model: `SUN2000-${inverterPower}KTL`,
        power: inverterPower,
        efficiency: 98.6,
        numberOfMPPT: 4,
        quantity: 1,
        position: {
          x: 1000 + i * 2000, // Espacés de 2m
          y: dimensions.width - 1000, // Sur le côté
          z: dimensions.clearHeight - 500 // 50cm sous le toit
        }
      });
    }

    return inverters;
  }

  /**
   * Génère les chemins de câbles
   */
  private generateCableTrays(
    dimensions: OmbriereDimensions,
    solarArray: SolarArrayConfig
  ): CableTrayConfig[] {
    const trays: CableTrayConfig[] = [];

    // Chemin principal (longitudinal)
    trays.push({
      width: 300,
      height: 100,
      length: dimensions.length,
      material: 'galvanized_steel',
      elevation: dimensions.clearHeight - 300,
      coverType: 'perforated'
    });

    // Chemins secondaires (un par rangée de panneaux)
    for (let i = 0; i < solarArray.rows; i++) {
      trays.push({
        width: 200,
        height: 75,
        length: dimensions.width,
        material: 'aluminum',
        elevation: dimensions.clearHeight + 200,
        coverType: 'perforated'
      });
    }

    return trays;
  }

  /**
   * Valide l'ombrière
   */
  validate(building: OmbriereBuilding): BuildingValidationResult {
    const errors: string[] = [];

    // Validation dimensions via stratégie
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

    // Validation panneaux solaires
    if (building.structure.solarPanels.length === 0) {
      errors.push('Aucun panneau solaire défini');
    }

    // Validation puissance
    if (building.electricalDesign.totalPower < 10) {
      errors.push('Puissance installée trop faible (<10kWc)');
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
   * Calcule les métriques
   */
  calculate(building: OmbriereBuilding): BuildingCalculations {
    if (!this.calculationStrategy) {
      throw new Error('Aucune stratégie de calcul définie');
    }

    const frameCalc: FrameCalculations = this.calculationStrategy.calculateFrame(
      building.dimensions,
      building.parameters
    );

    return {
      postCount: frameCalc.postCount,
      rafterCount: frameCalc.rafterCount,
      purlinCount: frameCalc.purlinCount,
      railCount: frameCalc.railCount,
      totalSteelWeight: frameCalc.totalSteelWeight,
      heightRidge: frameCalc.heightRidge,
      rafterLength: 0,
      totalRoofingArea: frameCalc.totalRoofingArea,
      totalCladdingArea: 0,
      warnings: frameCalc.warnings
    };
  }

  /**
   * Calcule les métriques solaires
   */
  private calculateSolarMetrics(
    dimensions: OmbriereDimensions,
    solarArray: SolarArrayConfig,
    location?: { latitude: number; longitude: number }
  ): OmbriereCalculations {
    const strategy = this.calculationStrategy as OmbriereCalculationStrategy;
    return strategy.calculateSolarMetrics(dimensions, solarArray, location);
  }
}
