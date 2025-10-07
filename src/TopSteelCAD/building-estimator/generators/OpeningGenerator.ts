/**
 * Générateur d'ouvertures 3D
 * Building Estimator - TopSteelCAD
 */

import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Group,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial
} from 'three';
import {
  IStructureGenerator,
  OpeningGeneratorOptions,
  GenerationResult,
  DEFAULT_MATERIALS
} from './types';
import { Opening, OpeningType } from '../types';

/**
 * Générateur d'ouvertures (portes, fenêtres)
 */
export class OpeningGenerator implements IStructureGenerator {
  private opening: Opening;
  private wallThickness: number;

  constructor(options: OpeningGeneratorOptions) {
    this.opening = options.opening;
    this.wallThickness = options.wallThickness;
  }

  /**
   * Génère la géométrie 3D de l'ouverture
   */
  generate(options?: OpeningGeneratorOptions): GenerationResult {
    const levelOfDetail = options?.levelOfDetail || 'medium';

    let mesh: Mesh | Group;

    switch (levelOfDetail) {
      case 'low':
        // Représentation minimale : rectangle transparent
        mesh = this.generateSimpleOpening();
        break;

      case 'high':
        // Représentation détaillée : avec cadre et détails
        mesh = this.generateDetailedOpening();
        break;

      case 'medium':
      default:
        // Représentation moyenne : cadre simple
        mesh = this.generateMediumOpening();
        break;
    }

    // Positionner l'ouverture
    mesh.position.set(
      this.opening.position.x,
      0, // Y sera défini selon le mur
      this.opening.position.z
    );

    // Métadonnées
    mesh.userData = {
      openingId: this.opening.id,
      openingType: this.opening.type,
      reference: this.opening.reference,
      width: this.opening.dimensions.width,
      height: this.opening.dimensions.height,
      wall: this.opening.wall
    };

    return {
      mesh,
      metadata: {
        elementType: 'opening',
        vertexCount: 0,
        triangleCount: 0
      }
    };
  }

  /**
   * Génère une représentation simple
   */
  private generateSimpleOpening(): Mesh {
    const geometry = new BoxGeometry(
      this.opening.dimensions.width,
      this.opening.dimensions.height,
      this.wallThickness
    );

    const material = new MeshStandardMaterial({
      color: DEFAULT_MATERIALS.opening.color,
      metalness: DEFAULT_MATERIALS.opening.metalness,
      roughness: DEFAULT_MATERIALS.opening.roughness,
      opacity: DEFAULT_MATERIALS.opening.opacity,
      transparent: DEFAULT_MATERIALS.opening.transparent
    });

    return new Mesh(geometry, material);
  }

  /**
   * Génère une représentation moyenne avec cadre
   */
  private generateMediumOpening(): Group {
    const group = new Group();

    // Panneau principal (transparent)
    const panelGeometry = new BoxGeometry(
      this.opening.dimensions.width,
      this.opening.dimensions.height,
      this.wallThickness * 0.5
    );

    const panelMaterial = new MeshStandardMaterial({
      color: this.getOpeningColor(),
      metalness: 0.1,
      roughness: 0.9,
      opacity: 0.4,
      transparent: true
    });

    const panel = new Mesh(panelGeometry, panelMaterial);
    group.add(panel);

    // Cadre métallique
    const frameThickness = 50; // 50mm
    const frame = this.createFrame(frameThickness);
    group.add(frame);

    return group;
  }

  /**
   * Génère une représentation détaillée
   */
  private generateDetailedOpening(): Group {
    const group = this.generateMediumOpening();

    // Ajouter des détails selon le type
    switch (this.opening.type) {
      case OpeningType.DOOR:
        // Ajouter poignée pour porte
        const handle = this.createDoorHandle();
        group.add(handle);
        break;

      case OpeningType.WINDOW:
        // Ajouter croisillons pour fenêtre
        const crossbars = this.createWindowCrossbars();
        group.add(crossbars);
        break;
    }

    return group;
  }

  /**
   * Crée le cadre métallique de l'ouverture
   */
  private createFrame(thickness: number): Group {
    const frameGroup = new Group();
    const { width, height } = this.opening.dimensions;

    const frameMaterial = new MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.6,
      roughness: 0.4
    });

    // Montant gauche
    const leftGeom = new BoxGeometry(thickness, height, this.wallThickness);
    const left = new Mesh(leftGeom, frameMaterial);
    left.position.set(-width / 2 - thickness / 2, 0, 0);
    frameGroup.add(left);

    // Montant droit
    const right = new Mesh(leftGeom, frameMaterial);
    right.position.set(width / 2 + thickness / 2, 0, 0);
    frameGroup.add(right);

    // Traverse haute
    const topGeom = new BoxGeometry(width + thickness * 2, thickness, this.wallThickness);
    const top = new Mesh(topGeom, frameMaterial);
    top.position.set(0, height / 2 + thickness / 2, 0);
    frameGroup.add(top);

    // Traverse basse
    const bottom = new Mesh(topGeom, frameMaterial);
    bottom.position.set(0, -height / 2 - thickness / 2, 0);
    frameGroup.add(bottom);

    return frameGroup;
  }

  /**
   * Crée une poignée de porte
   */
  private createDoorHandle(): Mesh {
    const handleGeom = new BoxGeometry(100, 30, 50);
    const handleMat = new MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.2
    });

    const handle = new Mesh(handleGeom, handleMat);
    handle.position.set(
      this.opening.dimensions.width / 2 - 200, // 200mm du bord
      0, // Milieu hauteur
      this.wallThickness / 2 + 25
    );

    return handle;
  }

  /**
   * Crée les croisillons de fenêtre
   */
  private createWindowCrossbars(): Group {
    const crossbarsGroup = new Group();
    const { width, height } = this.opening.dimensions;

    const crossbarMat = new LineBasicMaterial({
      color: 0x444444,
      linewidth: 2
    });

    // Croisillon horizontal (milieu)
    const horzGeom = new BoxGeometry(width, 20, 10);
    const horzEdges = new EdgesGeometry(horzGeom);
    const horzLine = new LineSegments(horzEdges, crossbarMat);
    horzLine.position.set(0, 0, this.wallThickness / 2);
    crossbarsGroup.add(horzLine);

    // Croisillon vertical (milieu)
    const vertGeom = new BoxGeometry(20, height, 10);
    const vertEdges = new EdgesGeometry(vertGeom);
    const vertLine = new LineSegments(vertEdges, crossbarMat);
    vertLine.position.set(0, 0, this.wallThickness / 2);
    crossbarsGroup.add(vertLine);

    return crossbarsGroup;
  }

  /**
   * Obtient la couleur selon le type d'ouverture
   */
  private getOpeningColor(): number {
    switch (this.opening.type) {
      case OpeningType.DOOR:
        return 0x8b6914; // Marron (porte bois)
      case OpeningType.WINDOW:
        return 0x87ceeb; // Bleu ciel (vitre)
      case OpeningType.SECTIONAL_DOOR:
        return 0x999999; // Gris (porte sectionnelle)
      default:
        return DEFAULT_MATERIALS.opening.color;
    }
  }

  getDimensions(): { width: number; height: number; depth: number } {
    return {
      width: this.opening.dimensions.width,
      height: this.opening.dimensions.height,
      depth: this.wallThickness
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.opening.dimensions.width <= 0) {
      errors.push("La largeur de l'ouverture doit être positive");
    }

    if (this.opening.dimensions.height <= 0) {
      errors.push("La hauteur de l'ouverture doit être positive");
    }

    if (this.opening.dimensions.width > 10000) {
      errors.push("La largeur de l'ouverture ne peut dépasser 10m");
    }

    if (this.opening.dimensions.height > 10000) {
      errors.push("La hauteur de l'ouverture ne peut dépasser 10m");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
