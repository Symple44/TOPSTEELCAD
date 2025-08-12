/**
 * Factory principale qui orchestre tous les générateurs de géométries
 * Pattern Factory + Strategy pour une architecture propre et évolutive
 */

import { BufferGeometry } from '../../lib/three-exports';
import { ProfileType, SteelProfile } from '../types/profile.types';
import { ProfileGeometryGenerator } from './interfaces/ProfileGeometryGenerator';

// Import des générateurs
import { IProfileGenerator } from './generators/IProfileGenerator';
import { UProfileGenerator } from './generators/UProfileGenerator';
import { LProfileGenerator } from './generators/LProfileGenerator';
import { TubeGenerator } from './generators/TubeGenerator';

/**
 * Résultat d'une génération avec métadonnées
 */
export interface GeometryGenerationResult {
  /** Géométrie 3D générée */
  geometry: BufferGeometry;
  
  /** Type de générateur utilisé */
  generatorName: string;
  
  /** Profil utilisé pour la génération */
  profile: SteelProfile;
  
  /** Métadonnées de génération */
  metadata: {
    /** Temps de génération en ms */
    generationTime: number;
    
    /** Nombre de vertices dans la géométrie */
    vertexCount: number;
    
    /** Nombre de faces dans la géométrie */
    faceCount: number;
    
    /** Volume approximatif en mm³ */
    volume: number;
    
    /** Longueur du profil */
    length: number;
  };
}

/**
 * Factory principale pour la génération de géométries
 */
export class GeometryGeneratorFactory {
  private generators: ProfileGeometryGenerator[] = [];
  private generatorCache: Map<ProfileType, ProfileGeometryGenerator> = new Map();
  
  constructor() {
    this.initializeGenerators();
  }

  /**
   * Initialise tous les générateurs disponibles
   */
  private initializeGenerators(): void {
    this.generators = [
      new IProfileGenerator(),
      new UProfileGenerator(), 
      new LProfileGenerator(),
      new TubeGenerator()
    ];

    // Pré-calculer le cache des correspondances
    this.buildGeneratorCache();
  }

  /**
   * Construit le cache des correspondances ProfileType → Generator
   */
  private buildGeneratorCache(): void {
    this.generatorCache.clear();
    
    for (const generator of this.generators) {
      for (const profileType of generator.getSupportedTypes()) {
        this.generatorCache.set(profileType, generator);
      }
    }
  }

  /**
   * Génère une géométrie à partir d'un profil
   */
  generate(profile: SteelProfile, length: number): GeometryGenerationResult {
    const startTime = performance.now();

    // Validation
    if (!profile) {
      throw new Error('Profil manquant pour génération de géométrie');
    }
    
    if (!profile.type) {
      throw new Error(`Type de profil manquant: ${JSON.stringify(profile)}`);
    }
    
    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Trouver le générateur approprié
    const generator = this.findGenerator(profile.type);
    if (!generator) {
      throw new Error(
        `Aucun générateur trouvé pour le type ${profile.type}. ` +
        `Types supportés: ${this.getSupportedTypes().join(', ')}`
      );
    }

    // Générer la géométrie
    let geometry: BufferGeometry;
    try {
      geometry = generator.generate(profile.dimensions, length);
    } catch (error) {
      throw new Error(
        `Erreur lors de la génération avec ${generator.getName()}: ${error}`
      );
    }

    // Calculer les métadonnées
    const endTime = performance.now();
    const metadata = this.calculateMetadata(geometry, profile, length, endTime - startTime);

    return {
      geometry,
      generatorName: generator.getName(),
      profile,
      metadata
    };
  }

  /**
   * Trouve le générateur pour un type de profil
   */
  private findGenerator(profileType: ProfileType): ProfileGeometryGenerator | null {
    return this.generatorCache.get(profileType) || null;
  }

  /**
   * Calcule les métadonnées de génération
   */
  private calculateMetadata(
    geometry: BufferGeometry, 
    profile: SteelProfile,
    length: number,
    generationTime: number
  ) {
    // Forcer le calcul des attributs si pas fait
    if (!geometry.attributes.position) {
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }

    const positionAttribute = geometry.attributes.position;
    const vertexCount = positionAttribute ? positionAttribute.count : 0;
    
    const indexAttribute = geometry.index;
    const faceCount = indexAttribute ? indexAttribute.count / 3 : vertexCount / 3;

    // Estimation du volume (aire section × longueur)
    const volume = profile.area ? profile.area * length : 0; // cm² × mm = mm³

    return {
      generationTime: Math.round(generationTime * 100) / 100, // 2 décimales
      vertexCount,
      faceCount: Math.floor(faceCount),
      volume,
      length
    };
  }

  /**
   * Retourne tous les types de profils supportés
   */
  getSupportedTypes(): ProfileType[] {
    return Array.from(this.generatorCache.keys());
  }

  /**
   * Vérifie si un type de profil est supporté
   */
  isSupported(profileType: ProfileType): boolean {
    return this.generatorCache.has(profileType);
  }

  /**
   * Obtient des informations sur les générateurs
   */
  getGeneratorInfo(): Array<{
    name: string;
    supportedTypes: ProfileType[];
    typeCount: number;
  }> {
    return this.generators.map(generator => ({
      name: generator.getName(),
      supportedTypes: generator.getSupportedTypes(),
      typeCount: generator.getSupportedTypes().length
    }));
  }

  /**
   * Ajoute un générateur personnalisé
   */
  addGenerator(generator: ProfileGeometryGenerator): void {
    this.generators.push(generator);
    this.buildGeneratorCache();
  }

  /**
   * Supprime un générateur
   */
  removeGenerator(generatorName: string): boolean {
    const index = this.generators.findIndex(g => g.getName() === generatorName);
    if (index >= 0) {
      this.generators.splice(index, 1);
      this.buildGeneratorCache();
      return true;
    }
    return false;
  }

  /**
   * Réinitialise tous les générateurs
   */
  reset(): void {
    this.generators.length = 0;
    this.generatorCache.clear();
    this.initializeGenerators();
  }

  /**
   * Statistiques de la factory
   */
  getStatistics(): {
    totalGenerators: number;
    totalSupportedTypes: number;
    generatorDetails: Array<{
      name: string;
      supportedTypes: string[];
    }>;
  } {
    return {
      totalGenerators: this.generators.length,
      totalSupportedTypes: this.generatorCache.size,
      generatorDetails: this.generators.map(g => ({
        name: g.getName(),
        supportedTypes: g.getSupportedTypes().map(t => t.toString())
      }))
    };
  }
}

// Export d'une instance singleton pour usage global
export const geometryFactory = new GeometryGeneratorFactory();