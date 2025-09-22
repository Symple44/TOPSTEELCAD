/**
 * HoleGenerator - Générateur de trous pour les profils métalliques
 * Gère la création et le positionnement des trous selon DSTV
 */

import * as THREE from 'three';
import { DSTVTransformer, DSTVCoordinate, DSTVFace } from '../../dstv/DSTVTransformer';

export interface HoleDefinition {
  id: string;
  label?: string;
  diameter: number;
  coordinate: DSTVCoordinate;
  isThrough: boolean;
  depth?: number;
}

export interface HoleGeneratorOptions {
  showLabels?: boolean;
  labelSize?: number;
  holeColor?: number;
  holeOpacity?: number;
  labelColor?: number;
}

export class HoleGenerator {
  private transformer: DSTVTransformer;
  private options: HoleGeneratorOptions;
  private holeGroup: THREE.Group;
  private labelGroup: THREE.Group;

  constructor(transformer: DSTVTransformer, options?: HoleGeneratorOptions) {
    this.transformer = transformer;
    this.options = {
      showLabels: true,
      labelSize: 5,
      holeColor: 0xff0000,
      holeOpacity: 0.4,
      labelColor: 0xffff00,
      ...options
    };
    this.holeGroup = new THREE.Group();
    this.holeGroup.name = 'Holes';
    this.labelGroup = new THREE.Group();
    this.labelGroup.name = 'Labels';
  }

  /**
   * Génère un groupe de trous
   */
  generateHoles(holes: HoleDefinition[]): THREE.Group {
    const mainGroup = new THREE.Group();
    mainGroup.name = 'HolesAndLabels';

    holes.forEach(hole => {
      // Valider la coordonnée
      if (!this.transformer.validateCoordinate(hole.coordinate)) {
        console.warn(`Coordonnée invalide pour le trou ${hole.id}`);
        return;
      }

      // Créer le mesh du trou
      const holeMesh = this.createHoleMesh(hole);
      if (holeMesh) {
        this.holeGroup.add(holeMesh);
      }

      // Créer le label si nécessaire
      if (this.options.showLabels && hole.label) {
        const labelMesh = this.createLabelMesh(hole);
        if (labelMesh) {
          this.labelGroup.add(labelMesh);
        }
      }
    });

    mainGroup.add(this.holeGroup);
    mainGroup.add(this.labelGroup);

    return mainGroup;
  }

  /**
   * Crée le mesh pour un trou
   */
  private createHoleMesh(hole: HoleDefinition): THREE.Mesh | null {
    try {
      // Obtenir la position 3D
      const position = this.transformer.transform(hole.coordinate);
      const rotation = this.transformer.getHoleRotation(hole.coordinate.face);

      // Déterminer la profondeur
      const depth = hole.isThrough ? this.getMaxDepth(hole.coordinate.face) : (hole.depth || 20);

      // Créer la géométrie
      const geometry = new THREE.CylinderGeometry(
        hole.diameter / 2,
        hole.diameter / 2,
        depth,
        32,
        1
      );

      // Créer le matériau
      const material = new THREE.MeshPhongMaterial({
        color: this.options.holeColor,
        transparent: true,
        opacity: this.options.holeOpacity,
        side: THREE.DoubleSide
      });

      // Créer le mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      mesh.name = `Hole_${hole.id}`;
      mesh.userData = {
        type: 'hole',
        id: hole.id,
        label: hole.label,
        diameter: hole.diameter,
        face: hole.coordinate.face
      };

      // Activer les ombres
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      return mesh;

    } catch (error) {
      console.error(`Erreur lors de la création du trou ${hole.id}:`, error);
      return null;
    }
  }

  /**
   * Crée le label pour un trou
   */
  private createLabelMesh(hole: HoleDefinition): THREE.Mesh | THREE.Sprite | null {
    try {
      const position = this.transformer.transform(hole.coordinate);
      const normal = this.transformer.getFaceNormal(hole.coordinate.face);

      // Option 1: Utiliser une sphère comme indicateur
      const geometry = new THREE.SphereGeometry(this.options.labelSize!, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: this.options.labelColor,
        emissive: this.options.labelColor,
        emissiveIntensity: 0.3
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Positionner le label décalé du trou
      const offset = normal.multiplyScalar(hole.diameter / 2 + this.options.labelSize! * 2);
      mesh.position.copy(position).add(offset);
      mesh.name = `Label_${hole.id}`;
      mesh.userData = {
        type: 'label',
        holeId: hole.id,
        text: hole.label
      };

      return mesh;

    } catch (error) {
      console.error(`Erreur lors de la création du label pour ${hole.id}:`, error);
      return null;
    }
  }

  /**
   * Crée un sprite de texte pour le label (alternative)
   */
  createTextSprite(text: string, position: THREE.Vector3): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;

    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#000000';
    context.font = 'bold 36px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      sizeAttenuation: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(0.2, 0.1, 1);

    return sprite;
  }

  /**
   * Obtient la profondeur maximale selon la face
   */
  private getMaxDepth(face: DSTVFace): number {
    // À adapter selon les dimensions réelles du profil
    switch (face) {
      case DSTVFace.TOP:
      case DSTVFace.BOTTOM:
        return 200; // Hauteur typique

      case DSTVFace.LEFT:
      case DSTVFace.RIGHT:
        return 100; // Largeur typique

      case DSTVFace.FRONT:
      case DSTVFace.BACK:
        return 50; // Épaisseur typique

      default:
        return 100;
    }
  }

  /**
   * Met à jour les options
   */
  updateOptions(options: Partial<HoleGeneratorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.holeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.labelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.holeGroup.clear();
    this.labelGroup.clear();
  }
}

export default HoleGenerator;