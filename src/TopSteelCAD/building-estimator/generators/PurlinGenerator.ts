/**
 * Générateur de pannes 3D
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
  PurlinGeneratorOptions,
  GenerationResult,
  DEFAULT_MATERIALS
} from './types';
import { StructuralElement } from '../types';

/**
 * Générateur de pannes (poutres horizontales de toiture)
 */
export class PurlinGenerator implements IStructureGenerator {
  private element: StructuralElement;
  private profileDimensions?: PurlinGeneratorOptions['profileDimensions'];

  constructor(options: PurlinGeneratorOptions) {
    this.element = options.element;
    this.profileDimensions = options.profileDimensions;
  }

  /**
   * Génère la géométrie 3D de la panne
   */
  generate(options?: PurlinGeneratorOptions): GenerationResult {
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

    // Positionner la panne
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
      elementType: 'purlin',
      profile: this.element.profile,
      reference: this.element.reference,
      length: this.element.length,
      weight: this.element.weight
    };

    return {
      mesh,
      geometry,
      metadata: {
        elementType: 'purlin',
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
    flangeThickness: number;
  }): BufferGeometry {
    return new BoxGeometry(dims.width, dims.height, this.element.length);
  }

  /**
   * Génère une représentation détaillée
   */
  private generateDetailedProfile(dims: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  }): BufferGeometry {
    const { height, width, webThickness, flangeThickness } = dims;

    const shape = new Shape();

    // Profil en I
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2 + flangeThickness);
    shape.lineTo(webThickness / 2, -height / 2 + flangeThickness);
    shape.lineTo(webThickness / 2, height / 2 - flangeThickness);
    shape.lineTo(width / 2, height / 2 - flangeThickness);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2 - flangeThickness);
    shape.lineTo(-webThickness / 2, height / 2 - flangeThickness);
    shape.lineTo(-webThickness / 2, -height / 2 + flangeThickness);
    shape.lineTo(-width / 2, -height / 2 + flangeThickness);
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
      errors.push('La longueur de la panne doit être positive');
    }

    if (this.element.length > 50000) {
      errors.push('La longueur de la panne ne peut dépasser 50m');
    }

    if (!this.element.profile) {
      errors.push('Le profil de la panne doit être défini');
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
    flangeThickness: number;
  } {
    const profileDatabase: Record<string, [number, number, number, number]> = {
      'IPE 80': [80, 46, 3.8, 5.2],
      'IPE 100': [100, 55, 4.1, 5.7],
      'IPE 120': [120, 64, 4.4, 6.3],
      'IPE 140': [140, 73, 4.7, 6.9],
      'IPE 160': [160, 82, 5.0, 7.4],
      'IPE 180': [180, 91, 5.3, 8.0],
      'IPE 200': [200, 100, 5.6, 8.5],
      'IPE 220': [220, 110, 5.9, 9.2],
      'IPE 240': [240, 120, 6.2, 9.8],
      'IPE 270': [270, 135, 6.6, 10.2],
      'IPE 300': [300, 150, 7.1, 10.7]
    };

    const dimensions = profileDatabase[this.element.profile];

    if (dimensions) {
      return {
        height: dimensions[0],
        width: dimensions[1],
        webThickness: dimensions[2],
        flangeThickness: dimensions[3]
      };
    }

    return {
      height: 140,
      width: 73,
      webThickness: 4.7,
      flangeThickness: 6.9
    };
  }
}
