/**
 * Moteur principal du Building Estimator
 * Création et gestion de bâtiments
 * Building Estimator - TopSteelCAD
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MonoPenteBuilding,
  BuildingType,
  CreateBuildingConfig,
  StructuralElement,
  StructuralElementType,
  BuildingStructure,
  BuildingParameters,
  CladdingType,
  RoofingType
} from '../types/building.types';
import { FrameCalculator } from './FrameCalculator';
import { defaultMonoPenteTemplate } from '../templates/monopente.template';

/**
 * Moteur de création et gestion de bâtiments
 */
export class BuildingEngine {
  /**
   * Crée un nouveau bâtiment monopente
   */
  static createMonoPenteBuilding(
    config: CreateBuildingConfig
  ): MonoPenteBuilding {
    const now = new Date();

    // Fusion avec paramètres par défaut
    const parameters: BuildingParameters = {
      postSpacing: config.parameters?.postSpacing || 5000,
      purlinSpacing: config.parameters?.purlinSpacing || 1500,
      railSpacing: config.parameters?.railSpacing || 1200,
      postProfile: config.parameters?.postProfile || 'IPE 240',
      rafterProfile: config.parameters?.rafterProfile || 'IPE 200',
      purlinProfile: config.parameters?.purlinProfile || 'IPE 140',
      railProfile: config.parameters?.railProfile || 'UAP 80',
      steelGrade: config.parameters?.steelGrade || 'S235',
      includeGutters: config.parameters?.includeGutters ?? true,
      includeDownspouts: config.parameters?.includeDownspouts ?? true
    };

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

    // Créer le bâtiment de base
    const building: MonoPenteBuilding = {
      id: uuidv4(),
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

    // Générer la structure
    building.structure = this.generateStructure(building);

    return building;
  }

  /**
   * Génère la structure complète du bâtiment
   */
  static generateStructure(building: MonoPenteBuilding): BuildingStructure {
    // Calculs de base
    const heightRidge = FrameCalculator.calculateHeightRidge(
      building.dimensions.heightWall,
      building.dimensions.width,
      building.dimensions.slope
    );

    const rafterLength = FrameCalculator.calculateRafterLength(
      building.dimensions.width,
      building.dimensions.slope
    );

    const postCount = FrameCalculator.calculatePostCount(
      building.dimensions.length,
      building.parameters.postSpacing
    );

    // Générer poteaux
    const posts = this.generatePosts(
      building.dimensions.length,
      building.dimensions.heightWall,
      heightRidge,
      building.parameters.postSpacing,
      building.parameters.postProfile
    );

    // Générer arbalétriers
    const rafters = this.generateRafters(
      building.dimensions.length,
      rafterLength,
      building.dimensions.heightWall,
      heightRidge,
      building.parameters.postSpacing,
      building.parameters.rafterProfile
    );

    // Générer pannes
    const purlins = this.generatePurlins(
      building.dimensions.length,
      rafterLength,
      building.dimensions.heightWall,
      building.parameters.purlinSpacing,
      building.parameters.purlinProfile
    );

    // Générer lisses
    const rails = this.generateRails(
      building.dimensions.length,
      building.dimensions.heightWall,
      heightRidge,
      building.dimensions.width,
      building.parameters.railSpacing,
      building.parameters.railProfile
    );

    return {
      posts,
      rafters,
      purlins,
      rails
    };
  }

  /**
   * Génère les poteaux
   */
  private static generatePosts(
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
        weight: FrameCalculator.calculateProfileWeight(profile, heightWall),
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
        weight: FrameCalculator.calculateProfileWeight(profile, heightRidge),
        reference: `POT-${i * 2 + 2}`
      });
    }

    return posts;
  }

  /**
   * Génère les arbalétriers
   */
  private static generateRafters(
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
        weight: FrameCalculator.calculateProfileWeight(profile, rafterLength),
        reference: `ARB-${i + 1}`
      });
    }

    return rafters;
  }

  /**
   * Génère les pannes
   */
  private static generatePurlins(
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
      const z = heightWall + distanceAlongRafter * Math.sin(Math.atan(rafterLength / length));

      purlins.push({
        id: uuidv4(),
        type: StructuralElementType.PURLIN,
        profile,
        length: length,
        position: { x: 0, y: distanceAlongRafter, z },
        rotation: { x: 0, y: 0, z: 0 },
        weight: FrameCalculator.calculateProfileWeight(profile, length),
        reference: `PAN-${i + 1}`
      });
    }

    return purlins;
  }

  /**
   * Génère les lisses de bardage
   */
  private static generateRails(
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
        weight: FrameCalculator.calculateProfileWeight(profile, length),
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
        weight: FrameCalculator.calculateProfileWeight(profile, length),
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
          weight: FrameCalculator.calculateProfileWeight(profile, width),
          reference: `LIS-${railIndex++}`
        });
      }
    }

    return rails;
  }

  /**
   * Met à jour un bâtiment existant
   */
  static updateBuilding(
    building: MonoPenteBuilding,
    updates: Partial<MonoPenteBuilding>
  ): MonoPenteBuilding {
    const updated = {
      ...building,
      ...updates,
      updatedAt: new Date()
    };

    // Si dimensions ou paramètres changent, régénérer la structure
    if (updates.dimensions || updates.parameters) {
      updated.structure = this.generateStructure(updated);
    }

    return updated;
  }

  /**
   * Crée un bâtiment à partir d'un template
   */
  static createFromTemplate(
    templateName: 'default' | 'small' | 'large' = 'default'
  ): MonoPenteBuilding {
    const templates = {
      default: defaultMonoPenteTemplate,
      small: defaultMonoPenteTemplate, // TODO: importer autres templates
      large: defaultMonoPenteTemplate
    };

    const template = templates[templateName];
    return this.createMonoPenteBuilding(template);
  }

  /**
   * Valide un bâtiment
   */
  static validateBuilding(building: MonoPenteBuilding): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation dimensions
    const dimValidation = FrameCalculator.validateDimensions(
      building.dimensions
    );
    if (!dimValidation.isValid) {
      errors.push(...dimValidation.errors);
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
      errors,
      warnings
    };
  }

  /**
   * Clone un bâtiment
   */
  static cloneBuilding(
    building: MonoPenteBuilding,
    newName?: string
  ): MonoPenteBuilding {
    const now = new Date();

    return {
      ...building,
      id: uuidv4(),
      name: newName || `${building.name} (copie)`,
      createdAt: now,
      updatedAt: now
    };
  }
}
