/**
 * Types pour les générateurs de géométrie 3D
 * Building Estimator - TopSteelCAD
 */

import { Mesh, Group, Material, BufferGeometry } from 'three';
import { StructuralElement, Opening, Finishes } from '../types';

/**
 * Options de génération de géométrie
 */
export interface GeneratorOptions {
  // Niveau de détail
  levelOfDetail?: 'low' | 'medium' | 'high';

  // Matériaux
  material?: Material;
  overrideMaterial?: boolean;

  // Optimisations
  mergeGeometries?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;

  // Métadonnées
  includeMetadata?: boolean;
}

/**
 * Résultat de génération
 */
export interface GenerationResult {
  mesh: Mesh | Group;
  geometry?: BufferGeometry;
  metadata?: {
    elementType: string;
    profile?: string;
    length?: number;
    weight?: number;
    vertexCount?: number;
    triangleCount?: number;
  };
}

/**
 * Interface commune pour tous les générateurs
 */
export interface IStructureGenerator {
  /**
   * Génère la géométrie 3D
   */
  generate(options?: GeneratorOptions): GenerationResult;

  /**
   * Obtient les dimensions de l'élément
   */
  getDimensions(): {
    width: number;
    height: number;
    depth: number;
  };

  /**
   * Valide les paramètres
   */
  validate(): {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Options pour PostGenerator
 */
export interface PostGeneratorOptions extends GeneratorOptions {
  element: StructuralElement;
  profileDimensions?: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  };
}

/**
 * Options pour RafterGenerator
 */
export interface RafterGeneratorOptions extends GeneratorOptions {
  element: StructuralElement;
  slope: number; // Angle en radians
  profileDimensions?: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  };
}

/**
 * Options pour PurlinGenerator
 */
export interface PurlinGeneratorOptions extends GeneratorOptions {
  element: StructuralElement;
  profileDimensions?: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  };
}

/**
 * Options pour RaillGenerator
 */
export interface RaillGeneratorOptions extends GeneratorOptions {
  element: StructuralElement;
  profileDimensions?: {
    height: number;
    width: number;
    webThickness: number;
  };
}

/**
 * Options pour CladdingGenerator
 */
export interface CladdingGeneratorOptions extends GeneratorOptions {
  width: number;
  height: number;
  thickness: number;
  finishes: Finishes;
  openings?: Opening[];
}

/**
 * Options pour OpeningGenerator
 */
export interface OpeningGeneratorOptions extends GeneratorOptions {
  opening: Opening;
  wallThickness: number;
}

/**
 * Paramètres de couleur et matériau
 */
export interface MaterialConfig {
  color: number | string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
}

/**
 * Configuration des matériaux par défaut
 */
export const DEFAULT_MATERIALS = {
  steel: {
    color: 0x888888,
    metalness: 0.8,
    roughness: 0.3
  },
  cladding: {
    color: 0xcccccc,
    metalness: 0.2,
    roughness: 0.7
  },
  roofing: {
    color: 0x555555,
    metalness: 0.3,
    roughness: 0.6
  },
  opening: {
    color: 0x4488ff,
    metalness: 0.1,
    roughness: 0.9,
    opacity: 0.3,
    transparent: true
  }
};
