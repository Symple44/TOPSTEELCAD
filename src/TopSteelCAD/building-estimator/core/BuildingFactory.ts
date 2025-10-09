/**
 * Factory centrale pour la création de bâtiments
 * Pattern Abstract Factory + Registry Pattern
 * Building Estimator - TopSteelCAD
 */

import {
  Building,
  BuildingType,
  MonoPenteBuilding
} from '../types/building.types';
import { BuildingEngineBase, BuildingConfig } from './BuildingEngineBase';
import { MonoPenteEngine } from './MonoPenteEngine';
import { OmbriereEngine } from './OmbriereEngine';
import { ICalculationStrategy } from './strategies/ICalculationStrategy';

/**
 * Registry des engines disponibles
 */
class EngineRegistry {
  private static engines = new Map<BuildingType, BuildingEngineBase<any>>();

  /**
   * Enregistre un engine pour un type de bâtiment
   */
  static register(type: BuildingType, engine: BuildingEngineBase<any>): void {
    this.engines.set(type, engine);
  }

  /**
   * Récupère un engine pour un type donné
   */
  static get(type: BuildingType): BuildingEngineBase<any> | undefined {
    return this.engines.get(type);
  }

  /**
   * Vérifie si un type est supporté
   */
  static has(type: BuildingType): boolean {
    return this.engines.has(type);
  }

  /**
   * Liste tous les types supportés
   */
  static getSupportedTypes(): BuildingType[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Réinitialise le registry (utile pour les tests)
   */
  static clear(): void {
    this.engines.clear();
  }
}

/**
 * Factory centrale pour créer des bâtiments
 *
 * Avantages:
 * - Point d'entrée unique
 * - Support de multiples types de bâtiments
 * - Extensibilité via le registry
 * - Injection de dépendances (strategies)
 */
export class BuildingFactory {
  /**
   * Crée un bâtiment selon son type
   *
   * @param config - Configuration du bâtiment
   * @param calculationStrategy - Stratégie de calcul optionnelle
   * @returns Building créé
   * @throws Error si le type n'est pas supporté
   */
  static create<T extends Building = Building>(
    config: BuildingConfig,
    calculationStrategy?: ICalculationStrategy
  ): T {
    // Vérifier que le type est supporté
    if (!EngineRegistry.has(config.type)) {
      throw new Error(
        `Type de bâtiment non supporté: ${config.type}. ` +
        `Types disponibles: ${EngineRegistry.getSupportedTypes().join(', ')}`
      );
    }

    // Récupérer l'engine approprié
    const engine = EngineRegistry.get(config.type)!;

    // Injecter la stratégie si fournie
    if (calculationStrategy && engine.calculationStrategy !== calculationStrategy) {
      // Créer une nouvelle instance de l'engine avec la nouvelle stratégie
      const EngineClass = engine.constructor as new (strategy?: ICalculationStrategy) => BuildingEngineBase<any>;
      const engineWithStrategy = new EngineClass(calculationStrategy);
      return engineWithStrategy.create(config) as T;
    }

    // Créer le bâtiment
    return engine.create(config) as T;
  }

  /**
   * Crée un bâtiment monopente
   * Helper method pour type-safety
   */
  static createMonoPente(
    config: Omit<BuildingConfig, 'type'>,
    calculationStrategy?: ICalculationStrategy
  ): MonoPenteBuilding {
    return this.create<MonoPenteBuilding>(
      { ...config, type: BuildingType.MONO_PENTE },
      calculationStrategy
    );
  }

  /**
   * Crée un bâtiment depuis un template
   */
  static createFromTemplate(
    templateName: 'default' | 'small' | 'medium' | 'large',
    overrides?: Partial<BuildingConfig>
  ): Building {
    const templates: Record<string, BuildingConfig> = {
      default: {
        name: 'Bâtiment Standard',
        type: BuildingType.MONO_PENTE,
        dimensions: {
          length: 20000,
          width: 12000,
          heightWall: 6000,
          slope: 10
        },
        parameters: {
          postSpacing: 5000,
          purlinSpacing: 1500,
          railSpacing: 1200,
          postProfile: 'IPE 240',
          rafterProfile: 'IPE 200',
          purlinProfile: 'IPE 140',
          railProfile: 'UAP 80',
          steelGrade: 'S235',
          includeGutters: true,
          includeDownspouts: true
        }
      },
      small: {
        name: 'Petit Bâtiment',
        type: BuildingType.MONO_PENTE,
        dimensions: {
          length: 10000,
          width: 8000,
          heightWall: 4000,
          slope: 10
        },
        parameters: {
          postSpacing: 4000,
          purlinSpacing: 1500,
          railSpacing: 1200,
          postProfile: 'IPE 180',
          rafterProfile: 'IPE 160',
          purlinProfile: 'IPE 120',
          railProfile: 'UAP 65',
          steelGrade: 'S235',
          includeGutters: true,
          includeDownspouts: true
        }
      },
      medium: {
        name: 'Bâtiment Moyen',
        type: BuildingType.MONO_PENTE,
        dimensions: {
          length: 30000,
          width: 15000,
          heightWall: 7000,
          slope: 10
        },
        parameters: {
          postSpacing: 5000,
          purlinSpacing: 1500,
          railSpacing: 1200,
          postProfile: 'IPE 270',
          rafterProfile: 'IPE 220',
          purlinProfile: 'IPE 160',
          railProfile: 'UAP 100',
          steelGrade: 'S235',
          includeGutters: true,
          includeDownspouts: true
        }
      },
      large: {
        name: 'Grand Bâtiment',
        type: BuildingType.MONO_PENTE,
        dimensions: {
          length: 50000,
          width: 20000,
          heightWall: 8000,
          slope: 10
        },
        parameters: {
          postSpacing: 6000,
          purlinSpacing: 1500,
          railSpacing: 1200,
          postProfile: 'IPE 330',
          rafterProfile: 'IPE 270',
          purlinProfile: 'IPE 180',
          railProfile: 'UAP 120',
          steelGrade: 'S355',
          includeGutters: true,
          includeDownspouts: true
        }
      }
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template inconnu: ${templateName}`);
    }

    // Fusionner les overrides
    const config: BuildingConfig = {
      ...template,
      ...overrides,
      dimensions: {
        ...template.dimensions,
        ...overrides?.dimensions
      },
      parameters: {
        ...template.parameters,
        ...overrides?.parameters
      }
    };

    return this.create(config);
  }

  /**
   * Enregistre un nouveau type de bâtiment
   * Permet d'étendre la factory avec de nouveaux types
   */
  static registerEngine(
    type: BuildingType,
    engine: BuildingEngineBase<any>
  ): void {
    EngineRegistry.register(type, engine);
  }

  /**
   * Vérifie si un type est supporté
   */
  static isTypeSupported(type: BuildingType): boolean {
    return EngineRegistry.has(type);
  }

  /**
   * Liste tous les types de bâtiments supportés
   */
  static getSupportedTypes(): BuildingType[] {
    return EngineRegistry.getSupportedTypes();
  }
}

// ============================================================================
// INITIALISATION : Enregistrer les engines disponibles
// ============================================================================

// Enregistrer MonoPente Engine
BuildingFactory.registerEngine(BuildingType.MONO_PENTE, new MonoPenteEngine());

// Enregistrer Ombrière Engine (POC Phase 1 - Octobre 2025)
BuildingFactory.registerEngine(BuildingType.OMBRIERE, new OmbriereEngine());

// TODO: Enregistrer d'autres engines quand ils seront implémentés
// BuildingFactory.registerEngine(BuildingType.BI_PENTE, new BiPenteEngine());
// BuildingFactory.registerEngine(BuildingType.AUVENT, new AuventEngine());

/**
 * Export du registry pour usage avancé
 */
export { EngineRegistry };
