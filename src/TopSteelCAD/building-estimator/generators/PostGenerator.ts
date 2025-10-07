/**
 * Générateur de poteaux 3D
 * Building Estimator - TopSteelCAD
 */

import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  BufferGeometry,
  ExtrudeGeometry,
  Shape,
  Vector3,
  Euler
} from 'three';
import {
  IStructureGenerator,
  PostGeneratorOptions,
  GenerationResult,
  DEFAULT_MATERIALS
} from './types';
import { StructuralElement } from '../types';

/**
 * Générateur de poteaux (colonnes verticales)
 */
export class PostGenerator implements IStructureGenerator {
  private element: StructuralElement;
  private profileDimensions?: PostGeneratorOptions['profileDimensions'];

  constructor(options: PostGeneratorOptions) {
    this.element = options.element;
    this.profileDimensions = options.profileDimensions;
  }

  /**
   * Génère la géométrie 3D du poteau
   */
  generate(options?: PostGeneratorOptions): GenerationResult {
    const levelOfDetail = options?.levelOfDetail || 'medium';

    // Obtenir dimensions du profil
    const dims = this.profileDimensions || this.getDefaultDimensions();

    let geometry: BufferGeometry;

    switch (levelOfDetail) {
      case 'low':
        // Représentation simple : une boîte
        geometry = this.generateSimpleBox(dims);
        break;

      case 'high':
        // Représentation détaillée : profil en I complet
        geometry = this.generateDetailedProfile(dims);
        break;

      case 'medium':
      default:
        // Représentation moyenne : forme approximative
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

    // Positionner le poteau
    mesh.position.set(
      this.element.position.x,
      this.element.position.y,
      this.element.position.z
    );

    // Rotation (les poteaux sont généralement verticaux)
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
      elementType: 'post',
      profile: this.element.profile,
      reference: this.element.reference,
      length: this.element.length,
      weight: this.element.weight
    };

    return {
      mesh,
      geometry,
      metadata: {
        elementType: 'post',
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
   * Génère une représentation simple (boîte)
   */
  private generateSimpleBox(dims: {
    height: number;
    width: number;
  }): BoxGeometry {
    return new BoxGeometry(dims.width, dims.height, this.element.length);
  }

  /**
   * Génère une représentation moyenne (profil simplifié)
   */
  private generateMediumProfile(dims: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  }): BufferGeometry {
    // Créer un profil en I simplifié (3 boîtes assemblées)
    const { height, width, webThickness, flangeThickness } = dims;
    const length = this.element.length;

    // Pour le MVP, on utilise une boîte simple
    // TODO: Implémenter profil en I complet dans version future
    return new BoxGeometry(width, height, length);
  }

  /**
   * Génère une représentation détaillée (profil en I complet)
   */
  private generateDetailedProfile(dims: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  }): BufferGeometry {
    const { height, width, webThickness, flangeThickness } = dims;

    // Créer la forme du profil en I
    const shape = new Shape();

    // Semelle inférieure
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2 + flangeThickness);

    // Âme (partie verticale)
    shape.lineTo(webThickness / 2, -height / 2 + flangeThickness);
    shape.lineTo(webThickness / 2, height / 2 - flangeThickness);

    // Semelle supérieure
    shape.lineTo(width / 2, height / 2 - flangeThickness);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2 - flangeThickness);

    // Retour âme
    shape.lineTo(-webThickness / 2, height / 2 - flangeThickness);
    shape.lineTo(-webThickness / 2, -height / 2 + flangeThickness);
    shape.lineTo(-width / 2, -height / 2 + flangeThickness);
    shape.lineTo(-width / 2, -height / 2);

    // Extruder le profil sur la longueur
    const extrudeSettings = {
      depth: this.element.length,
      bevelEnabled: false
    };

    return new ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Obtient les dimensions du profil
   */
  getDimensions(): { width: number; height: number; depth: number } {
    const dims = this.profileDimensions || this.getDefaultDimensions();
    return {
      width: dims.width,
      height: dims.height,
      depth: this.element.length
    };
  }

  /**
   * Valide les paramètres
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.element.length <= 0) {
      errors.push('La longueur du poteau doit être positive');
    }

    if (this.element.length > 50000) {
      errors.push('La longueur du poteau ne peut dépasser 50m');
    }

    if (!this.element.profile) {
      errors.push('Le profil du poteau doit être défini');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtient les dimensions par défaut selon le profil
   */
  private getDefaultDimensions(): {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  } {
    // Base de données simplifiée des dimensions de profils
    // Format: [hauteur, largeur, épaisseur âme, épaisseur semelle]
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
      'IPE 300': [300, 150, 7.1, 10.7],
      'IPE 330': [330, 160, 7.5, 11.5],
      'IPE 360': [360, 170, 8.0, 12.7],
      'IPE 400': [400, 180, 8.6, 13.5],
      'IPE 450': [450, 190, 9.4, 14.6],
      'IPE 500': [500, 200, 10.2, 16.0],
      'HEA 100': [96, 100, 5.0, 8.0],
      'HEA 120': [114, 120, 5.0, 8.0],
      'HEA 140': [133, 140, 5.5, 8.5],
      'HEA 160': [152, 160, 6.0, 9.0],
      'HEA 180': [171, 180, 6.0, 9.5],
      'HEA 200': [190, 200, 6.5, 10.0],
      'HEA 220': [210, 220, 7.0, 11.0],
      'HEA 240': [230, 240, 7.5, 12.0],
      'HEA 260': [250, 260, 7.5, 12.5],
      'HEA 280': [270, 280, 8.0, 13.0],
      'HEA 300': [290, 300, 8.5, 14.0],
      'HEB 100': [100, 100, 6.0, 10.0],
      'HEB 120': [120, 120, 6.5, 11.0],
      'HEB 140': [140, 140, 7.0, 12.0],
      'HEB 160': [160, 160, 8.0, 13.0],
      'HEB 180': [180, 180, 8.5, 14.0],
      'HEB 200': [200, 200, 9.0, 15.0],
      'HEB 220': [220, 220, 9.5, 16.0],
      'HEB 240': [240, 240, 10.0, 17.0],
      'HEB 260': [260, 260, 10.0, 17.5],
      'HEB 280': [280, 280, 10.5, 18.0],
      'HEB 300': [300, 300, 11.0, 19.0]
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

    // Dimensions par défaut si profil non trouvé
    return {
      height: 240,
      width: 120,
      webThickness: 6.2,
      flangeThickness: 9.8
    };
  }
}
