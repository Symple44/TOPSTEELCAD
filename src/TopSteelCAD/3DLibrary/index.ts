/**
 * 📚 3D Library - Bibliothèque centralisée de formes 3D
 * 
 * Toutes les géométries et formes 3D utilisées dans TopSteelCAD
 * sont centralisées ici pour une meilleure organisation et réutilisabilité
 */

// ========================================
// EXPORTS PRINCIPAUX
// ========================================

// Intégration avec les bases de données existantes
export { DatabaseGeometryBridge } from './integration/DatabaseGeometryBridge';
export type { GeometryGenerationResult } from './integration/DatabaseGeometryBridge';

// Import des générateurs pour ShapeFactory
import { FastenerGenerator } from './geometry-generators/generators/FastenerGenerator';
import { WeldGenerator } from './geometry-generators/generators/WeldGenerator';
import { ProfileType } from './types/profile.types';
import * as THREE from 'three';
import { GeometryGeneratorFactory } from './geometry-generators/GeometryGeneratorFactory';

// Nouvelle architecture avec Factory Pattern
export { GeometryGeneratorFactory, geometryFactory } from './geometry-generators/GeometryGeneratorFactory';
export type { ProfileGeometryGenerator } from './geometry-generators/interfaces/ProfileGeometryGenerator';
export { IProfileGenerator } from './geometry-generators/generators/IProfileGenerator';
export { UProfileGenerator } from './geometry-generators/generators/UProfileGenerator';
export { LProfileGenerator } from './geometry-generators/generators/LProfileGenerator';
export { TubeGenerator } from './geometry-generators/generators/TubeGenerator';

// Helpers et utilitaires
export * from './helpers/MaterialFactory';

// Re-export THREE pour les exemples
export { THREE } from '../lib/three-exports';

// Types - Export sélectif pour éviter les conflits
export * from './types/profile.types';
export { 
  MaterialCategory,
  PlateType,
  FastenerType,
  WeldType,
  SteelGrade,
  BoltStrengthClass,
  SurfaceFinish
} from './types/material-types';
export type {
  UnifiedElement,
  ElementFilter
} from './types/material-types';
export * from './types/enums';

// ========================================
// FACTORY PRINCIPAL - Point d'entrée unique
// ========================================

import { DatabaseGeometryBridge } from './integration/DatabaseGeometryBridge';


/**
 * Instance globale du bridge avec les bases de données
 */
export const geometryBridge = new DatabaseGeometryBridge();

/**
 * Initialise la 3DLibrary avec les bases de données
 */
export async function initialize3DLibrary(): Promise<void> {
  await geometryBridge.initialize();
  console.log('✅ 3DLibrary initialisée avec les bases de données');
}

/**
 * Factory pour créer rapidement des formes 3D
 */
export class ShapeFactory {
  private static geometryFactory = new GeometryGeneratorFactory();
  private static bridge = new DatabaseGeometryBridge();
  
  /**
   * Crée une forme basique
   */
  static createBasicShape(type: string, params: ShapeParams): THREE.BufferGeometry | null {
    switch (type.toLowerCase()) {
      case 'box':
        return new THREE.BoxGeometry(
          params.width || 100,
          params.height || 100,
          params.depth || 100
        );
        
      case 'sphere':
        return new THREE.SphereGeometry(
          params.radius || 50,
          params.widthSegments || 32,
          params.heightSegments || 16
        );
        
      case 'cylinder':
        return new THREE.CylinderGeometry(
          params.radiusTop || 50,
          params.radiusBottom || 50,
          params.height || 100,
          params.radialSegments || 32
        );
        
      case 'plane':
        return new THREE.PlaneGeometry(
          params.width || 100,
          params.height || 100,
          params.widthSegments || 1,
          params.heightSegments || 1
        );
        
      default:
        return null;
    }
  }
  
  /**
   * Crée un profil métallique
   */
  static async createSteelProfile(designation: string, length: number = 6000): Promise<import('./integration/DatabaseGeometryBridge').GeometryGenerationResult | null> {
    try {
      await this.bridge.initialize();
      return await this.bridge.generateFromDesignation(designation, length);
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      return null;
    }
  }
  
  /**
   * Crée une plaque métallique
   */
  static createPlate(width: number, height: number, thickness: number): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(width, thickness, height);
    geometry.userData = {
      type: 'PLATE',
      dimensions: { width, height, thickness },
      weight: (width * height * thickness * 7850) / 1e9 // kg
    };
    return geometry;
  }
  
  /**
   * Crée un boulon
   */
  static createBolt(diameter: number, length: number): THREE.BufferGeometry {
    const fastenerGen = new FastenerGenerator();
    return fastenerGen.generate({
      designation: `M${diameter}`,
      type: ProfileType.FASTENER,
      dimensions: { diameter, length }
    } as any, length);
  }
  
  /**
   * Crée une soudure
   */
  static createWeld(type: 'fillet' | 'butt', size: number, length: number): THREE.BufferGeometry {
    const weldGen = new WeldGenerator();
    return weldGen.generate({
      designation: type.toUpperCase(),
      type: ProfileType.WELD,
      dimensions: { thickness: size, length }
    } as any, length);
  }
}

// Interface pour les paramètres de forme
interface ShapeParams {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  widthSegments?: number;
  heightSegments?: number;
  radialSegments?: number;
}

/**
 * Fonction utilitaire pour créer rapidement une forme
 */
export function createShape(type: string, params: any = {}) {
  return ShapeFactory.createBasicShape(type, params);
}

/**
 * Crée une géométrie à partir d'une désignation de profil
 * Utilise les vraies données de la base
 */
export async function createFromDatabase(designation: string, length: number = 6000) {
  return geometryBridge.generateFromDesignation(designation, length);
}

// ========================================
// PRESETS - Configurations prédéfinies
// Note: Pour les vraies dimensions, utiliser createFromDatabase()
// ========================================

export const ShapePresets = {
  // Poutres standards
  IPE300: {
    type: 'i-beam',
    height: 300,
    width: 150,
    webThickness: 7.1,
    flangeThickness: 10.7,
    length: 6000
  },
  
  HEB200: {
    type: 'i-beam',
    height: 200,
    width: 200,
    webThickness: 9,
    flangeThickness: 15,
    length: 6000
  },
  
  // Tubes standards
  RHS100x50: {
    type: 'rectangular-tube',
    height: 100,
    width: 50,
    thickness: 3,
    length: 6000
  },
  
  CHS60: {
    type: 'circular-tube',
    diameter: 60.3,
    thickness: 3.2,
    length: 6000
  },
  
  // Plaques standards
  BasePlate20: {
    type: 'plate',
    width: 400,
    height: 400,
    thickness: 20
  }
};

// ========================================
// CATALOG - Catalogue de formes disponibles
// ========================================

/**
 * Obtient toutes les désignations disponibles dans la base
 */
export async function getAvailableDesignations(): Promise<string[]> {
  await geometryBridge.initialize();
  return geometryBridge.getAllDesignations();
}

export const ShapeCatalog = {
  profiles: [
    'i-beam',
    'h-beam',
    'u-channel',
    'angle-equal',
    'angle-unequal',
    't-section',
    'rectangular-tube',
    'square-tube',
    'circular-tube',
    'flat-bar',
    'round-bar',
    'square-bar'
  ],
  
  features: [
    'circular-hole',
    'slotted-hole',
    'rectangular-cutout',
    'notch',
    'coping',
    'bevel',
    'chamfer'
  ],
  
  accessories: [
    'hex-bolt',
    'hex-nut',
    'washer',
    'anchor-bolt',
    'shear-stud',
    'end-plate',
    'stiffener',
    'gusset-plate'
  ],
  
  connections: [
    'fillet-weld',
    'butt-weld',
    'plug-weld',
    'bolted-connection',
    'riveted-connection'
  ]
};