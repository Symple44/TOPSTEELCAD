/**
 * Générateur de lisses 3D
 * Building Estimator - TopSteelCAD
 */

import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  BufferGeometry,
  ExtrudeGeometry,
  Shape
} from 'three';
import {
  IStructureGenerator,
  RaillGeneratorOptions,
  GenerationResult,
  DEFAULT_MATERIALS
} from './types';
import { StructuralElement } from '../types';

/**
 * Générateur de lisses de bardage (profils UAP/UPN)
 */
export class RaillGenerator implements IStructureGenerator {
  private element: StructuralElement;
  private profileDimensions?: RaillGeneratorOptions['profileDimensions'];

  constructor(options: RaillGeneratorOptions) {
    this.element = options.element;
    this.profileDimensions = options.profileDimensions;
  }

  /**
   * Génère la géométrie 3D de la lisse
   */
  generate(options?: RaillGeneratorOptions): GenerationResult {
    const levelOfDetail = options?.levelOfDetail || 'medium';

    // Obtenir dimensions du profil
    const dims = this.profileDimensions || this.getDefaultDimensions();

    let geometry: BufferGeometry;

    switch (levelOfDetail) {
      case 'low':
        geometry = this.generateSimpleBox(dims);
        break;

      case 'high':
        geometry = this.generateDetailedProfile(dims);
        break;

      case 'medium':
      default:
        geometry = this.generateMediumProfile(dims);
        break;
    }

    // Créer le matériau
    const material =
      options?.material ||
      new MeshStandardMaterial({
        color: DEFAULT_MATERIALS.steel.color,
        metalness: DEFAULT_MATERIALS.steel.metalness,
        roughness: DEFAULT_MATERIALS.steel.roughness
      });

    // Créer le mesh
    const mesh = new Mesh(geometry, material);

    // Positionner la lisse
    mesh.position.set(
      this.element.position.x,
      this.element.position.y,
      this.element.position.z
    );

    // Rotation
    mesh.rotation.set(
      this.element.rotation.x,
      this.element.rotation.y,
      this.element.rotation.z
    );

    // Options d'ombre
    if (options?.castShadow !== false) {
      mesh.castShadow = true;
    }
    if (options?.receiveShadow !== false) {
      mesh.receiveShadow = true;
    }

    // Métadonnées
    mesh.userData = {
      elementId: this.element.id,
      elementType: 'rail',
      profile: this.element.profile,
      reference: this.element.reference,
      length: this.element.length,
      weight: this.element.weight
    };

    return {
      mesh,
      geometry,
      metadata: {
        elementType: 'rail',
        profile: this.element.profile,
        length: this.element.length,
        weight: this.element.weight,
        vertexCount: geometry.attributes.position.count,
        triangleCount: geometry.index
          ? geometry.index.count / 3
          : geometry.attributes.position.count / 3
      }
    };
  }

  /**
   * Génère une représentation simple
   */
  private generateSimpleBox(dims: {
    height: number;
    width: number;
  }): BoxGeometry {
    return new BoxGeometry(dims.width, dims.height, this.element.length);
  }

  /**
   * Génère une représentation moyenne
   */
  private generateMediumProfile(dims: {
    height: number;
    width: number;
    webThickness: number;
  }): BufferGeometry {
    return new BoxGeometry(dims.width, dims.height, this.element.length);
  }

  /**
   * Génère une représentation détaillée (profil en U)
   */
  private generateDetailedProfile(dims: {
    height: number;
    width: number;
    webThickness: number;
  }): BufferGeometry {
    const { height, width, webThickness } = dims;

    const shape = new Shape();

    // Profil en U
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(width / 2 - webThickness, height / 2);
    shape.lineTo(width / 2 - webThickness, -height / 2 + webThickness);
    shape.lineTo(-width / 2 + webThickness, -height / 2 + webThickness);
    shape.lineTo(-width / 2 + webThickness, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.lineTo(-width / 2, -height / 2);

    const extrudeSettings = {
      depth: this.element.length,
      bevelEnabled: false
    };

    return new ExtrudeGeometry(shape, extrudeSettings);
  }

  getDimensions(): { width: number; height: number; depth: number } {
    const dims = this.profileDimensions || this.getDefaultDimensions();
    return {
      width: dims.width,
      height: dims.height,
      depth: this.element.length
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.element.length <= 0) {
      errors.push('La longueur de la lisse doit être positive');
    }

    if (this.element.length > 50000) {
      errors.push('La longueur de la lisse ne peut dépasser 50m');
    }

    if (!this.element.profile) {
      errors.push('Le profil de la lisse doit être défini');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getDefaultDimensions(): {
    height: number;
    width: number;
    webThickness: number;
  } {
    // Base de données profils UAP/UPN
    const profileDatabase: Record<string, [number, number, number]> = {
      'UAP 50': [50, 38, 5.0],
      'UAP 65': [65, 42, 5.5],
      'UAP 80': [80, 45, 6.0],
      'UAP 100': [100, 50, 6.0],
      'UAP 120': [120, 55, 7.0],
      'UAP 150': [150, 65, 7.5],
      'UAP 175': [175, 70, 8.0],
      'UAP 200': [200, 75, 8.5],
      'UPN 50': [50, 38, 5.0],
      'UPN 65': [65, 42, 5.5],
      'UPN 80': [80, 45, 6.0],
      'UPN 100': [100, 50, 6.0],
      'UPN 120': [120, 55, 7.0],
      'UPN 140': [140, 60, 7.0],
      'UPN 160': [160, 65, 7.5],
      'UPN 180': [180, 70, 8.0],
      'UPN 200': [200, 75, 8.5]
    };

    const dimensions = profileDatabase[this.element.profile];

    if (dimensions) {
      return {
        height: dimensions[0],
        width: dimensions[1],
        webThickness: dimensions[2]
      };
    }

    return {
      height: 80,
      width: 45,
      webThickness: 6.0
    };
  }
}
