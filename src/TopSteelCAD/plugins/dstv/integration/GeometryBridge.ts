/**
 * GeometryBridge - Pont entre le pipeline DSTV et les générateurs de géométrie existants
 * 
 * Ce module connecte la nouvelle architecture DSTV avec vos générateurs de géométrie
 * existants pour créer les géométries de base des profils.
 */

import * as THREE from 'three';
import { GeometryGeneratorFactory } from '../../../3DLibrary/geometry-generators/GeometryGeneratorFactory';
import { IProfileGenerator } from '../../../3DLibrary/geometry-generators/generators/IProfileGenerator';
import { UProfileGenerator } from '../../../3DLibrary/geometry-generators/generators/UProfileGenerator';
import { LProfileGenerator } from '../../../3DLibrary/geometry-generators/generators/LProfileGenerator';
import { TProfileGenerator } from '../../../3DLibrary/geometry-generators/generators/TProfileGenerator';
import { CProfileGenerator } from '../../../3DLibrary/geometry-generators/generators/CProfileGenerator';
import { ZProfileGenerator } from '../../../3DLibrary/geometry-generators/generators/ZProfileGenerator';
import { TubeGenerator } from '../../../3DLibrary/geometry-generators/generators/TubeGenerator';
import { PlateGenerator } from '../../../3DLibrary/geometry-generators/generators/PlateGenerator';
import { FlatBarGenerator } from '../../../3DLibrary/geometry-generators/generators/FlatBarGenerator';
import { NormalizedProfile } from '../import/stages/DSTVNormalizationStage';

/**
 * Pont entre les données DSTV et les générateurs de géométrie existants
 */
export class GeometryBridge {
  private generatorFactory: GeometryGeneratorFactory;
  private generators: Map<string, any>;

  constructor() {
    this.generatorFactory = new GeometryGeneratorFactory();
    this.generators = new Map();
    this.initializeGenerators();
  }

  /**
   * Initialise les générateurs disponibles
   */
  private initializeGenerators(): void {
    // Enregistrer tous les générateurs disponibles
    this.generators.set('I_PROFILE', new IProfileGenerator());
    this.generators.set('U_PROFILE', new UProfileGenerator());
    this.generators.set('L_PROFILE', new LProfileGenerator());
    this.generators.set('T_PROFILE', new TProfileGenerator());
    this.generators.set('C_PROFILE', new CProfileGenerator());
    this.generators.set('Z_PROFILE', new ZProfileGenerator());
    this.generators.set('TUBE_RECT', new TubeGenerator());
    this.generators.set('TUBE_ROUND', new TubeGenerator());
    this.generators.set('PLATE', new PlateGenerator());
    this.generators.set('FLAT_BAR', new FlatBarGenerator());
  }

  /**
   * Crée la géométrie de base pour un profil DSTV normalisé
   */
  async createProfileGeometry(profile: NormalizedProfile): Promise<THREE.BufferGeometry> {
    const profileType = profile.type;
    const generator = this.generators.get(profileType);

    if (generator) {
      return this.generateWithExistingGenerator(generator, profile);
    }

    // Fallback vers une géométrie simple si pas de générateur spécifique
    return this.createFallbackGeometry(profile);
  }

  /**
   * Utilise un générateur existant pour créer la géométrie
   */
  private async generateWithExistingGenerator(generator: any, profile: NormalizedProfile): Promise<THREE.BufferGeometry> {
    try {
      // Préparer les paramètres selon le format attendu par vos générateurs
      const params = this.prepareGeneratorParams(profile);
      
      // Les générateurs de profils attendent (dimensions, length) comme paramètres séparés
      // Extraire la longueur des paramètres
      const { length, ...dimensions } = params;
      
      // Appeler la méthode generate du générateur avec les bons paramètres
      if (typeof generator.generate === 'function') {
        // Vérifier si c'est un générateur de profil qui attend (dimensions, length)
        if (generator.getName && generator.getName().includes('ProfileGenerator')) {
          console.log(`Calling ${generator.getName()} with dimensions:`, dimensions, 'and length:', length);
          return generator.generate(dimensions, length || 1000);
        } else {
          // Autres générateurs qui attendent un seul objet params
          return generator.generate(params);
        }
      } else if (typeof generator.createGeometry === 'function') {
        return generator.createGeometry(params);
      }
      
      // Si pas de méthode connue, utiliser le fallback
      return this.createFallbackGeometry(profile);
      
    } catch (error) {
      console.error(`Error generating geometry for ${profile.type}:`, error);
      return this.createFallbackGeometry(profile);
    }
  }

  /**
   * Prépare les paramètres pour les générateurs existants
   */
  private prepareGeneratorParams(profile: NormalizedProfile): any {
    const dimensions = profile.dimensions;
    const crossSection = dimensions.crossSection || {};
    
    // Fonction de validation pour éviter les NaN
    const validateDimension = (value: any, defaultValue: number, name: string): number => {
      const num = Number(value);
      if (isNaN(num) || num <= 0 || !isFinite(num)) {
        console.warn(`Invalid ${name} dimension: ${value}, using default: ${defaultValue}`);
        return defaultValue;
      }
      return num;
    };
    
    // Format commun pour tous les générateurs avec validation
    const params: any = {
      length: validateDimension(dimensions.length, 1000, 'length'),
      height: validateDimension(crossSection.height, 200, 'height'),
      width: validateDimension(crossSection.width, 100, 'width'),
      profileType: profile.type,
      profileName: profile.name
    };

    // Paramètres spécifiques par type de profil
    switch (profile.type) {
      case 'I_PROFILE':
      case 'HEA':
      case 'HEB':
      case 'HEM':
      case 'IPE':
        params.webThickness = validateDimension(crossSection.webThickness, 10, 'webThickness');
        params.flangeThickness = validateDimension(crossSection.flangeThickness, 15, 'flangeThickness');
        params.radius = validateDimension(crossSection.radius, 5, 'radius');
        break;

      case 'U_PROFILE':
      case 'UPN':
      case 'UPE':
        params.webThickness = validateDimension(crossSection.webThickness, 8, 'webThickness');
        params.flangeThickness = validateDimension(crossSection.flangeThickness, 12, 'flangeThickness');
        params.legHeight = validateDimension(crossSection.legHeight || params.width, params.width, 'legHeight');
        break;

      case 'L_PROFILE':
        params.legWidth = validateDimension(crossSection.legWidth || params.width, params.width, 'legWidth');
        params.legHeight = validateDimension(crossSection.legHeight || params.height, params.height, 'legHeight');
        params.thickness = validateDimension(crossSection.thickness, 10, 'thickness');
        break;

      case 'TUBE_RECT':
      case 'TUBE_ROUND':
        params.wallThickness = validateDimension(crossSection.wallThickness, 5, 'wallThickness');
        params.outerRadius = validateDimension(crossSection.outerRadius || params.width / 2, params.width / 2, 'outerRadius');
        params.innerRadius = Math.max(0, params.outerRadius - params.wallThickness);
        params.isRound = profile.type === 'TUBE_ROUND';
        break;

      case 'T_PROFILE':
        params.webThickness = validateDimension(crossSection.webThickness, 10, 'webThickness');
        params.flangeThickness = validateDimension(crossSection.flangeThickness, 15, 'flangeThickness');
        params.flangeWidth = validateDimension(crossSection.flangeWidth || params.width, params.width, 'flangeWidth');
        break;

      case 'PLATE':
        params.thickness = validateDimension(crossSection.thickness, 20, 'thickness');
        break;

      case 'FLAT_BAR':
        params.thickness = validateDimension(crossSection.thickness || params.height, params.height, 'thickness');
        break;

      case 'Z_PROFILE':
        params.webThickness = validateDimension(crossSection.webThickness, 8, 'webThickness');
        params.flangeThickness = validateDimension(crossSection.flangeThickness, 10, 'flangeThickness');
        params.flangeWidth = validateDimension(crossSection.flangeWidth || params.width, params.width, 'flangeWidth');
        break;

      case 'C_PROFILE':
        params.webThickness = validateDimension(crossSection.webThickness, 8, 'webThickness');
        params.flangeThickness = validateDimension(crossSection.flangeThickness, 10, 'flangeThickness');
        params.lipHeight = validateDimension(crossSection.lipHeight, 20, 'lipHeight');
        break;
    }

    // Ajouter les métadonnées du matériau
    if (profile.material) {
      params.material = profile.material.grade;
      params.density = profile.material.properties?.density || 7850;
    }

    return params;
  }

  /**
   * Crée une géométrie de fallback simple
   */
  private createFallbackGeometry(profile: NormalizedProfile): THREE.BufferGeometry {
    const length = profile.dimensions.length || 1000;
    const width = profile.dimensions.crossSection?.width || 100;
    const height = profile.dimensions.crossSection?.height || 200;

    console.warn(`Using fallback geometry for profile type: ${profile.type}`);

    // Créer une boîte simple comme fallback
    const geometry = new THREE.BoxGeometry(length, height, width);
    
    // Centrer la géométrie sur l'axe de longueur
    geometry.translate(length / 2, 0, 0);
    
    return geometry;
  }

  /**
   * Crée une géométrie pour un type de profil spécifique avec paramètres custom
   */
  async createCustomProfileGeometry(
    profileType: string,
    params: Record<string, any>
  ): Promise<THREE.BufferGeometry> {
    const generator = this.generators.get(profileType);
    
    if (generator && typeof generator.generate === 'function') {
      try {
        return generator.generate(params);
      } catch (error) {
        console.error(`Error generating custom geometry for ${profileType}:`, error);
      }
    }

    // Fallback
    return new THREE.BoxGeometry(
      params.length || 1000,
      params.height || 200,
      params.width || 100
    );
  }

  /**
   * Obtient les types de profils supportés
   */
  getSupportedProfileTypes(): string[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Vérifie si un type de profil est supporté
   */
  isProfileTypeSupported(profileType: string): boolean {
    return this.generators.has(profileType);
  }

  /**
   * Applique des transformations post-génération à la géométrie
   */
  applyPostProcessing(
    geometry: THREE.BufferGeometry,
    profile: NormalizedProfile
  ): THREE.BufferGeometry {
    // Appliquer des transformations si nécessaire
    
    // Optimiser la géométrie
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    // Calculer les normales si nécessaire
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }

    return geometry;
  }

  /**
   * Dispose les ressources
   */
  dispose(): void {
    // Nettoyer les générateurs si nécessaire
    this.generators.clear();
  }
}