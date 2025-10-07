/**
 * Générateur de bardage et couverture 3D
 * Building Estimator - TopSteelCAD
 */

import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  BufferGeometry,
  PlaneGeometry,
  Group,
  DoubleSide
} from 'three';
import {
  IStructureGenerator,
  CladdingGeneratorOptions,
  GenerationResult,
  DEFAULT_MATERIALS
} from './types';
import { Opening, CladdingType, RoofingType } from '../types';

/**
 * Générateur de bardage et couverture (panneaux)
 */
export class CladdingGenerator implements IStructureGenerator {
  private width: number;
  private height: number;
  private thickness: number;
  private finishes: CladdingGeneratorOptions['finishes'];
  private openings: Opening[];
  private type: 'cladding' | 'roofing';

  constructor(
    options: CladdingGeneratorOptions & { type: 'cladding' | 'roofing' }
  ) {
    this.width = options.width;
    this.height = options.height;
    this.thickness = options.thickness;
    this.finishes = options.finishes;
    this.openings = options.openings || [];
    this.type = options.type;
  }

  /**
   * Génère la géométrie 3D du bardage/couverture
   */
  generate(options?: CladdingGeneratorOptions): GenerationResult {
    const levelOfDetail = options?.levelOfDetail || 'medium';

    let mesh: Mesh | Group;

    if (levelOfDetail === 'low') {
      // Représentation simple : un seul panneau plat
      mesh = this.generateSimplePanel();
    } else {
      // Représentation avec épaisseur et ouvertures
      mesh = this.generateDetailedPanel();
    }

    // Options d'ombre
    if (options?.castShadow !== false) {
      mesh.castShadow = true;
    }
    if (options?.receiveShadow !== false) {
      mesh.receiveShadow = true;
    }

    // Métadonnées
    mesh.userData = {
      elementType: this.type,
      width: this.width,
      height: this.height,
      thickness: this.thickness,
      openingCount: this.openings.length
    };

    return {
      mesh,
      metadata: {
        elementType: this.type,
        vertexCount: 0, // À calculer si nécessaire
        triangleCount: 0
      }
    };
  }

  /**
   * Génère un panneau simple (plane)
   */
  private generateSimplePanel(): Mesh {
    const geometry = new PlaneGeometry(this.width, this.height);

    // Couleur selon le type
    const color = this.type === 'cladding'
      ? this.getCladdingColor()
      : this.getRoofingColor();

    const material = new MeshStandardMaterial({
      color: color,
      side: DoubleSide,
      metalness: 0.3,
      roughness: 0.7,
      opacity: 0.9,
      transparent: true
    });

    return new Mesh(geometry, material);
  }

  /**
   * Génère un panneau détaillé avec épaisseur
   */
  private generateDetailedPanel(): Group {
    const group = new Group();

    // Panneau principal
    const mainGeometry = new BoxGeometry(
      this.width,
      this.height,
      this.thickness
    );

    const color = this.type === 'cladding'
      ? this.getCladdingColor()
      : this.getRoofingColor();

    const mainMaterial = new MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.7,
      opacity: 0.85,
      transparent: true
    });

    const mainMesh = new Mesh(mainGeometry, mainMaterial);
    group.add(mainMesh);

    // TODO: Découper les ouvertures (pour version future)
    // Pour le MVP, on affiche juste le panneau complet

    return group;
  }

  /**
   * Obtient la couleur du bardage
   */
  private getCladdingColor(): number {
    const colorMap: Record<string, number> = {
      'RAL 9002': 0xe7ebda, // Blanc gris
      'RAL 9006': 0xa5a5a5, // Aluminium
      'RAL 7016': 0x383e42, // Gris anthracite
      'RAL 7035': 0xd7d7d7, // Gris clair
      'RAL 5012': 0x3b83bd, // Bleu clair
      'RAL 6011': 0x587246  // Vert réséda
    };

    const color = this.finishes.cladding.color || 'RAL 9002';
    return colorMap[color] || DEFAULT_MATERIALS.cladding.color;
  }

  /**
   * Obtient la couleur de la couverture
   */
  private getRoofingColor(): number {
    const colorMap: Record<string, number> = {
      'RAL 7016': 0x383e42, // Gris anthracite
      'RAL 8012': 0x592321, // Rouge brun
      'RAL 3009': 0x703731, // Rouge oxyde
      'RAL 6005': 0x2f4538, // Vert mousse
      'RAL 9006': 0xa5a5a5  // Aluminium
    };

    const color = this.finishes.roofing.color || 'RAL 7016';
    return colorMap[color] || DEFAULT_MATERIALS.roofing.color;
  }

  getDimensions(): { width: number; height: number; depth: number } {
    return {
      width: this.width,
      height: this.height,
      depth: this.thickness
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.width <= 0) {
      errors.push('La largeur doit être positive');
    }

    if (this.height <= 0) {
      errors.push('La hauteur doit être positive');
    }

    if (this.thickness <= 0) {
      errors.push("L'épaisseur doit être positive");
    }

    if (this.thickness > 500) {
      errors.push("L'épaisseur ne peut dépasser 500mm");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Crée un générateur pour le bardage
   */
  static forCladding(
    width: number,
    height: number,
    finishes: CladdingGeneratorOptions['finishes'],
    openings?: Opening[]
  ): CladdingGenerator {
    const thickness = finishes.cladding.thickness || 80;
    return new CladdingGenerator({
      width,
      height,
      thickness,
      finishes,
      openings,
      type: 'cladding'
    });
  }

  /**
   * Crée un générateur pour la couverture
   */
  static forRoofing(
    width: number,
    height: number,
    finishes: CladdingGeneratorOptions['finishes']
  ): CladdingGenerator {
    const thickness = finishes.roofing.thickness || 80;
    return new CladdingGenerator({
      width,
      height,
      thickness,
      finishes,
      type: 'roofing'
    });
  }
}
