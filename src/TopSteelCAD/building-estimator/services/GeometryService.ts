/**
 * Service de génération de géométrie 3D complète
 * Orchestre tous les générateurs pour créer le bâtiment
 * Building Estimator - TopSteelCAD
 */

import { Group, Mesh } from 'three';
import { MonoPenteBuilding } from '../types';
import {
  PostGenerator,
  RafterGenerator,
  PurlinGenerator,
  RaillGenerator,
  CladdingGenerator,
  OpeningGenerator
} from '../generators';
import { GeneratorOptions } from '../generators/types';
import { FrameCalculator } from '../core/FrameCalculator';

/**
 * Options de génération globale
 */
export interface BuildingGeometryOptions {
  levelOfDetail?: 'low' | 'medium' | 'high';
  showStructure?: boolean;
  showCladding?: boolean;
  showRoofing?: boolean;
  showOpenings?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Résultat de génération de géométrie
 */
export interface BuildingGeometryResult {
  scene: Group;
  elements: {
    structure: Group;
    cladding: Group;
    roofing: Group;
    openings: Group;
  };
  metadata: {
    totalVertexCount: number;
    totalTriangleCount: number;
    generationTime: number;
    elementCounts: {
      posts: number;
      rafters: number;
      purlins: number;
      rails: number;
      claddingPanels: number;
      roofingPanels: number;
      openings: number;
    };
  };
}

/**
 * Service de génération de géométrie 3D
 */
export class GeometryService {
  /**
   * Génère la géométrie 3D complète d'un bâtiment
   */
  static generateBuilding3D(
    building: MonoPenteBuilding,
    options?: BuildingGeometryOptions
  ): BuildingGeometryResult {
    const startTime = performance.now();

    // Options par défaut
    const opts: Required<BuildingGeometryOptions> = {
      levelOfDetail: options?.levelOfDetail || 'medium',
      showStructure: options?.showStructure !== false,
      showCladding: options?.showCladding !== false,
      showRoofing: options?.showRoofing !== false,
      showOpenings: options?.showOpenings !== false,
      castShadow: options?.castShadow !== false,
      receiveShadow: options?.receiveShadow !== false
    };

    // Groupes principaux
    const scene = new Group();
    scene.name = 'Building';

    const structureGroup = new Group();
    structureGroup.name = 'Structure';

    const claddingGroup = new Group();
    claddingGroup.name = 'Cladding';

    const roofingGroup = new Group();
    roofingGroup.name = 'Roofing';

    const openingsGroup = new Group();
    openingsGroup.name = 'Openings';

    // Générer la structure
    if (opts.showStructure) {
      this.generateStructure(building, structureGroup, opts);
    }

    // Générer le bardage
    if (opts.showCladding) {
      this.generateCladding(building, claddingGroup, opts);
    }

    // Générer la couverture
    if (opts.showRoofing) {
      this.generateRoofing(building, roofingGroup, opts);
    }

    // Générer les ouvertures
    if (opts.showOpenings && building.openings.length > 0) {
      this.generateOpenings(building, openingsGroup, opts);
    }

    // Assembler la scène
    scene.add(structureGroup);
    scene.add(claddingGroup);
    scene.add(roofingGroup);
    scene.add(openingsGroup);

    // Métadonnées
    const endTime = performance.now();
    const metadata = {
      totalVertexCount: 0, // À calculer si nécessaire
      totalTriangleCount: 0,
      generationTime: endTime - startTime,
      elementCounts: {
        posts: building.structure.posts.length,
        rafters: building.structure.rafters.length,
        purlins: building.structure.purlins.length,
        rails: building.structure.rails.length,
        claddingPanels: 4, // 4 murs
        roofingPanels: 1,  // 1 versant
        openings: building.openings.length
      }
    };

    return {
      scene,
      elements: {
        structure: structureGroup,
        cladding: claddingGroup,
        roofing: roofingGroup,
        openings: openingsGroup
      },
      metadata
    };
  }

  /**
   * Génère la structure (poteaux, arbalétriers, pannes, lisses)
   */
  private static generateStructure(
    building: MonoPenteBuilding,
    group: Group,
    options: Required<BuildingGeometryOptions>
  ): void {
    const genOpts: GeneratorOptions = {
      levelOfDetail: options.levelOfDetail,
      castShadow: options.castShadow,
      receiveShadow: options.receiveShadow
    };

    // Calcul de la pente
    const slope = Math.atan(building.dimensions.slope / 100);

    // Poteaux
    for (const post of building.structure.posts) {
      const generator = new PostGenerator({ element: post, ...genOpts });
      const result = generator.generate();
      group.add(result.mesh);
    }

    // Arbalétriers
    for (const rafter of building.structure.rafters) {
      const generator = new RafterGenerator({
        element: rafter,
        slope,
        ...genOpts
      });
      const result = generator.generate();
      group.add(result.mesh);
    }

    // Pannes
    for (const purlin of building.structure.purlins) {
      const generator = new PurlinGenerator({ element: purlin, ...genOpts });
      const result = generator.generate();
      group.add(result.mesh);
    }

    // Lisses
    for (const rail of building.structure.rails) {
      const generator = new RaillGenerator({ element: rail, ...genOpts });
      const result = generator.generate();
      group.add(result.mesh);
    }
  }

  /**
   * Génère le bardage
   */
  private static generateCladding(
    building: MonoPenteBuilding,
    group: Group,
    options: Required<BuildingGeometryOptions>
  ): void {
    const { length, width, heightWall } = building.dimensions;

    const heightRidge = FrameCalculator.calculateHeightRidge(
      heightWall,
      width,
      building.dimensions.slope
    );

    // Long pan bas (côté bas)
    const longPanLow = CladdingGenerator.forCladding(
      length,
      heightWall,
      building.finishes,
      building.openings.filter((o) => o.wall === 'front')
    );
    const lowResult = longPanLow.generate({ levelOfDetail: options.levelOfDetail });
    lowResult.mesh.position.set(length / 2, 0, heightWall / 2);
    lowResult.mesh.rotation.y = Math.PI / 2;
    group.add(lowResult.mesh);

    // Long pan haut (côté haut)
    const longPanHigh = CladdingGenerator.forCladding(
      length,
      heightRidge,
      building.finishes,
      building.openings.filter((o) => o.wall === 'back')
    );
    const highResult = longPanHigh.generate({ levelOfDetail: options.levelOfDetail });
    highResult.mesh.position.set(length / 2, width, heightRidge / 2);
    highResult.mesh.rotation.y = Math.PI / 2;
    group.add(highResult.mesh);

    // Pignon gauche
    const avgHeight = (heightWall + heightRidge) / 2;
    const gableLeft = CladdingGenerator.forCladding(
      width,
      avgHeight,
      building.finishes,
      building.openings.filter((o) => o.wall === 'left')
    );
    const leftResult = gableLeft.generate({ levelOfDetail: options.levelOfDetail });
    leftResult.mesh.position.set(0, width / 2, avgHeight / 2);
    group.add(leftResult.mesh);

    // Pignon droit
    const gableRight = CladdingGenerator.forCladding(
      width,
      avgHeight,
      building.finishes,
      building.openings.filter((o) => o.wall === 'right')
    );
    const rightResult = gableRight.generate({ levelOfDetail: options.levelOfDetail });
    rightResult.mesh.position.set(length, width / 2, avgHeight / 2);
    group.add(rightResult.mesh);
  }

  /**
   * Génère la couverture
   */
  private static generateRoofing(
    building: MonoPenteBuilding,
    group: Group,
    options: Required<BuildingGeometryOptions>
  ): void {
    const { length, width } = building.dimensions;

    const rafterLength = FrameCalculator.calculateRafterLength(
      width,
      building.dimensions.slope
    );

    const roofing = CladdingGenerator.forRoofing(
      length,
      rafterLength,
      building.finishes
    );

    const result = roofing.generate({ levelOfDetail: options.levelOfDetail });

    // Positionner et incliner la couverture
    const slope = Math.atan(building.dimensions.slope / 100);
    result.mesh.position.set(length / 2, 0, building.dimensions.heightWall);
    result.mesh.rotation.set(-slope, 0, 0);

    group.add(result.mesh);
  }

  /**
   * Génère les ouvertures
   */
  private static generateOpenings(
    building: MonoPenteBuilding,
    group: Group,
    options: Required<BuildingGeometryOptions>
  ): void {
    const wallThickness = building.finishes.cladding.thickness || 80;

    for (const opening of building.openings) {
      const generator = new OpeningGenerator({
        opening,
        wallThickness,
        levelOfDetail: options.levelOfDetail
      });

      const result = generator.generate();

      // Positionner selon le mur
      switch (opening.wall) {
        case 'front':
          result.mesh.position.y = 0;
          break;
        case 'back':
          result.mesh.position.y = building.dimensions.width;
          result.mesh.rotation.y = Math.PI;
          break;
        case 'left':
          result.mesh.position.x = 0;
          result.mesh.rotation.y = -Math.PI / 2;
          break;
        case 'right':
          result.mesh.position.x = building.dimensions.length;
          result.mesh.rotation.y = Math.PI / 2;
          break;
      }

      group.add(result.mesh);
    }
  }

  /**
   * Exporte la géométrie vers un format utilisable par ProfessionalViewer
   */
  static exportToPivotFormat(geometry: BuildingGeometryResult): any[] {
    // TODO: Convertir vers le format attendu par ProfessionalViewer
    // Pour le MVP, on retourne un format simplifié
    const elements: any[] = [];

    // Parcourir les groupes et extraire les mesh
    geometry.scene.traverse((object) => {
      if (object instanceof Mesh) {
        elements.push({
          id: object.userData.elementId || object.uuid,
          type: object.userData.elementType || 'unknown',
          geometry: object.geometry,
          material: object.material,
          position: object.position.toArray(),
          rotation: object.rotation.toArray(),
          scale: object.scale.toArray(),
          userData: object.userData
        });
      }
    });

    return elements;
  }
}
