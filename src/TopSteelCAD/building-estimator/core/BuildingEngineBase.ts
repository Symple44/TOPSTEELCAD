/**
 * Classe abstraite de base pour tous les moteurs de génération de bâtiments
 * Implémente le pattern Abstract Factory pour permettre l'ajout facile de nouveaux types
 * Building Estimator - TopSteelCAD
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Building,
  BuildingType,
  BuildingDimensions,
  BuildingParameters,
  BuildingStructure,
  StructuralElement,
  StructuralElementType,
  BuildingValidationResult,
  Opening
} from '../types/building.types';

/**
 * Configuration générique pour créer un bâtiment
 */
export interface BuildingConfig<T extends BuildingDimensions = BuildingDimensions> {
  name: string;
  type: BuildingType;
  dimensions: T;
  parameters?: Partial<BuildingParameters>;
  openings?: Opening[];
  finishes?: any;
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Résultat des calculs de structure
 */
export interface BuildingCalculations {
  postCount: number;
  rafterCount: number;
  purlinCount: number;
  railCount: number;
  totalSteelWeight: number;
  heightRidge?: number;
  rafterLength?: number;
  totalRoofingArea?: number;
  totalCladdingArea?: number;
  warnings?: string[];
}

/**
 * Interface pour les stratégies de calcul
 * (sera implémentée dans la prochaine étape)
 */
export interface ICalculationStrategy {
  calculateFrame(
    dimensions: BuildingDimensions,
    parameters: BuildingParameters,
    openings?: Opening[]
  ): BuildingCalculations;
}

/**
 * Classe abstraite de base pour tous les moteurs de génération
 *
 * @template T - Type de bâtiment spécifique (MonoPenteBuilding, OmbriereBuilding, etc.)
 * @template D - Type de dimensions spécifiques
 *
 * Responsabilités:
 * - Définir le contrat pour créer un bâtiment
 * - Fournir des méthodes utilitaires communes
 * - Déléguer la logique spécifique aux sous-classes
 * - Gérer l'injection de dépendances (calculators, validators)
 */
export abstract class BuildingEngineBase<
  T extends Building,
  D extends BuildingDimensions = BuildingDimensions
> {
  protected calculationStrategy?: ICalculationStrategy;

  constructor(calculationStrategy?: ICalculationStrategy) {
    this.calculationStrategy = calculationStrategy;
  }

  /**
   * Crée un bâtiment complet
   * Template Method Pattern - squelette de l'algorithme
   */
  create(config: BuildingConfig<D>): T {
    // 1. Valider la configuration
    this.validateConfig(config);

    // 2. Appliquer les paramètres par défaut
    const parameters = this.applyDefaultParameters(config.parameters || {});

    // 3. Créer le bâtiment de base
    const building = this.createBaseBuilding(config, parameters);

    // 4. Générer la structure
    building.structure = this.generateStructure(building);

    // 5. Post-traitement spécifique
    return this.postProcess(building);
  }

  /**
   * Crée le bâtiment de base (à implémenter par les sous-classes)
   */
  protected abstract createBaseBuilding(
    config: BuildingConfig<D>,
    parameters: BuildingParameters
  ): T;

  /**
   * Génère la structure complète
   */
  abstract generateStructure(building: T): BuildingStructure;

  /**
   * Valide le bâtiment
   */
  abstract validate(building: T): BuildingValidationResult;

  /**
   * Calcule les métriques du bâtiment
   */
  abstract calculate(building: T): BuildingCalculations;

  /**
   * Valide la configuration avant création
   */
  protected validateConfig(config: BuildingConfig<D>): void {
    if (!config.name || config.name.trim() === '') {
      throw new Error('Le nom du bâtiment est requis');
    }

    if (!config.dimensions) {
      throw new Error('Les dimensions sont requises');
    }

    this.validateDimensions(config.dimensions);
  }

  /**
   * Valide les dimensions (peut être surchargé)
   */
  protected validateDimensions(dimensions: D): void {
    if (dimensions.length <= 0) {
      throw new Error('La longueur doit être positive');
    }

    if (dimensions.width <= 0) {
      throw new Error('La largeur doit être positive');
    }

    if (dimensions.heightWall <= 0) {
      throw new Error('La hauteur au mur doit être positive');
    }
  }

  /**
   * Applique les paramètres par défaut
   */
  protected applyDefaultParameters(
    params: Partial<BuildingParameters>
  ): BuildingParameters {
    return {
      postSpacing: params.postSpacing || 5000,
      purlinSpacing: params.purlinSpacing || 1500,
      railSpacing: params.railSpacing || 1200,
      postProfile: params.postProfile || 'IPE 240',
      rafterProfile: params.rafterProfile || 'IPE 200',
      purlinProfile: params.purlinProfile || 'IPE 140',
      railProfile: params.railProfile || 'UAP 80',
      steelGrade: params.steelGrade || 'S235',
      includeGutters: params.includeGutters ?? true,
      includeDownspouts: params.includeDownspouts ?? true,
      ...params
    };
  }

  /**
   * Post-traitement du bâtiment (hook pour les sous-classes)
   */
  protected postProcess(building: T): T {
    // Par défaut, ne fait rien
    // Les sous-classes peuvent surcharger pour ajouter des traitements
    return building;
  }

  /**
   * Clone un bâtiment
   */
  clone(building: T, newName?: string): T {
    const now = new Date();

    return {
      ...building,
      id: uuidv4(),
      name: newName || `${building.name} (copie)`,
      createdAt: now,
      updatedAt: now
    } as T;
  }

  /**
   * Met à jour un bâtiment existant
   */
  update(building: T, updates: Partial<T>): T {
    const updated = {
      ...building,
      ...updates,
      updatedAt: new Date()
    } as T;

    // Si dimensions ou paramètres changent, régénérer la structure
    if (updates.dimensions || updates.parameters) {
      updated.structure = this.generateStructure(updated);
    }

    return updated;
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES COMMUNES (réutilisables par toutes les sous-classes)
  // ============================================================================

  /**
   * Génère les poteaux (logique commune)
   */
  protected generatePosts(
    length: number,
    heightWall: number,
    heightRidge: number,
    postSpacing: number,
    profile: string
  ): StructuralElement[] {
    const posts: StructuralElement[] = [];
    const postCount = Math.floor(length / postSpacing) + 1;

    for (let i = 0; i < postCount; i++) {
      const x = i * postSpacing;

      // Poteau côté bas
      posts.push({
        id: uuidv4(),
        type: StructuralElementType.POST,
        profile,
        length: heightWall,
        position: { x, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        weight: this.calculateProfileWeight(profile, heightWall),
        reference: `POT-${i * 2 + 1}`
      });

      // Poteau côté haut
      posts.push({
        id: uuidv4(),
        type: StructuralElementType.POST,
        profile,
        length: heightRidge,
        position: { x, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        weight: this.calculateProfileWeight(profile, heightRidge),
        reference: `POT-${i * 2 + 2}`
      });
    }

    return posts;
  }

  /**
   * Calcule le nombre de poteaux
   */
  protected calculatePostCount(length: number, spacing: number): number {
    return Math.floor(length / spacing) + 1;
  }

  /**
   * Calcule la longueur d'un arbalétrier
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
   * Calcule le poids d'un profil
   * (Base de données simplifiée - à améliorer avec ProfileLibrary)
   */
  protected calculateProfileWeight(profile: string, length: number): number {
    // Base de données simplifiée poids linéaire (kg/m)
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

    const weightPerMeter = linearWeights[profile] || 30; // Valeur par défaut
    return weightPerMeter * (length / 1000); // length en mm -> m
  }

  /**
   * Génère un ID unique
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Crée un timestamp
   */
  protected now(): Date {
    return new Date();
  }
}
