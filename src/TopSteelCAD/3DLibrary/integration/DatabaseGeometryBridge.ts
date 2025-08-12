/**
 * Bridge entre les bases de données et la génération de géométries 3D
 * Version refactorisée utilisant GeometryGeneratorFactory
 * 
 * Utilise les vraies données de ProfileDatabase et UnifiedMaterialsDatabase
 * pour créer des géométries 3D précises avec la nouvelle architecture
 */

import { BufferGeometry, Mesh, Material, MeshStandardMaterial } from '../../lib/three-exports';
import { ProfileDatabase } from '../database/ProfileDatabase';
import { UnifiedMaterialsDatabase } from '../database/UnifiedMaterialsDatabase';
import { SteelProfile, ProfileType } from '../types/profile.types';
import { UnifiedElement, MaterialCategory } from '../types/material-types';
import { createMetalMaterial, SteelMaterials } from '../helpers/MaterialFactory';

// Import de la nouvelle architecture
import { GeometryGeneratorFactory, GeometryGenerationResult as FactoryResult } from '../geometry-generators/GeometryGeneratorFactory';

/**
 * Interface pour le résultat de génération (compatible avec l'ancienne)
 */
export interface GeometryGenerationResult {
  geometry: BufferGeometry;
  material: Material;
  mesh?: Mesh;
  profile?: SteelProfile;
  element?: UnifiedElement;
  metadata: {
    weight: number;
    volume: number;
    surfaceArea: number;
    mechanicalProperties?: any;
    // Nouvelles métadonnées de la factory
    generationTime?: number;
    vertexCount?: number;
    faceCount?: number;
  };
}

/**
 * Bridge refactorisé utilisant la GeometryGeneratorFactory
 */
export class DatabaseGeometryBridge {
  private profileDb: ProfileDatabase;
  private materialDb: UnifiedMaterialsDatabase;
  private geometryFactory: GeometryGeneratorFactory;
  private geometryCache: Map<string, BufferGeometry> = new Map();
  
  constructor() {
    this.profileDb = ProfileDatabase.getInstance();
    this.materialDb = UnifiedMaterialsDatabase.getInstance();
    this.geometryFactory = new GeometryGeneratorFactory();
  }
  
  /**
   * Initialise les bases de données et la factory
   */
  async initialize(): Promise<void> {
    await this.materialDb.initialize();
    // ProfileDatabase et GeometryGeneratorFactory s'initialisent automatiquement
    
    console.log('✅ DatabaseGeometryBridge refactorisé initialisé');
    console.log(`📊 Factory supporte ${this.geometryFactory.getSupportedTypes().length} types de profils`);
  }
  
  /**
   * Génère une géométrie à partir d'une désignation de profil
   * Point d'entrée principal - utilise la nouvelle architecture
   */
  async generateFromDesignation(
    designation: string,
    length: number = 6000
  ): Promise<GeometryGenerationResult | null> {
    // Chercher dans la base de données unifiée
    const element = await this.materialDb.getByDesignation(designation);
    
    if (!element) {
      console.warn(`Profil non trouvé: ${designation}`);
      return null;
    }
    
    // Si c'est un profil, utiliser la nouvelle génération
    if (element.category === MaterialCategory.PROFILES) {
      return this.generateFromProfileWithFactory(element, length);
    }
    
    // Autres éléments (plaques, etc.) - garder l'ancienne méthode
    return this.generateFromElement(element);
  }

  /**
   * Nouvelle méthode utilisant GeometryGeneratorFactory
   */
  private async generateFromProfileWithFactory(
    element: UnifiedElement,
    length: number
  ): Promise<GeometryGenerationResult> {
    // Obtenir le profil complet depuis ProfileDatabase
    const availableTypes = this.profileDb.getAvailableTypes();
    const profilePromises = availableTypes.map(type => 
      this.profileDb.getProfilesByType?.(type) || Promise.resolve([])
    );
    const profileArrays = await Promise.all(profilePromises);
    const profiles = profileArrays.flat();
    
    const profile = profiles.find(p => 
      p.designation === element.name || 
      p.id === element.id
    );
    
    if (!profile) {
      throw new Error(`Profil non trouvé dans ProfileDatabase: ${element.name}`);
    }

    // Vérifier si la factory supporte ce type
    if (!this.geometryFactory.isSupported(profile.type)) {
      throw new Error(
        `Type de profil ${profile.type} non supporté par GeometryGeneratorFactory. ` +
        `Types supportés: ${this.geometryFactory.getSupportedTypes().join(', ')}`
      );
    }

    // Utiliser la factory pour générer la géométrie
    let factoryResult: FactoryResult;
    try {
      factoryResult = this.geometryFactory.generate(profile, length);
    } catch (error) {
      throw new Error(`Erreur de génération pour ${profile.designation}: ${error}`);
    }

    // Créer le matériau
    const material = this.createMaterialFromProfile(profile, element);
    
    // Créer le mesh
    const mesh = new Mesh(factoryResult.geometry, material);
    
    // Attacher les métadonnées au mesh pour utilisation ultérieure
    mesh.userData = {
      profile,
      element,
      weight: factoryResult.metadata.volume * 0.00000785, // mm³ → kg (densité acier)
      designation: profile.designation,
      length,
      generatedBy: factoryResult.generatorName,
      generationTime: factoryResult.metadata.generationTime
    };
    
    // Calculer le poids réel
    const weight = profile.weight * (length / 1000); // kg
    
    return {
      geometry: factoryResult.geometry,
      material,
      mesh,
      profile,
      element,
      metadata: {
        weight,
        volume: profile.area * length / 1000, // cm² × mm → cm³
        surfaceArea: (profile.perimeter || 0) * length / 100, // mm × mm → cm²
        mechanicalProperties: {
          inertia: profile.inertia,
          elasticModulus: profile.elasticModulus,
          plasticModulus: profile.plasticModulus,
          radiusOfGyration: profile.radiusOfGyration
        },
        // Nouvelles métadonnées de performance
        generationTime: factoryResult.metadata.generationTime,
        vertexCount: factoryResult.metadata.vertexCount,
        faceCount: factoryResult.metadata.faceCount
      }
    };
  }

  /**
   * Génère une géométrie à partir d'un élément (non-profil)
   * Garde l'ancienne méthode pour compatibilité
   */
  private async generateFromElement(element: UnifiedElement): Promise<GeometryGenerationResult> {
    let geometry: BufferGeometry;
    
    switch (element.category) {
      case MaterialCategory.PLATES:
        geometry = this.generatePlateGeometry(element);
        break;
      case MaterialCategory.FASTENERS:
        geometry = this.generateFastenerGeometry(element);
        break;
      case MaterialCategory.WELDS:
        geometry = this.generateWeldGeometry(element);
        break;
      default:
        // Fallback to plate
        geometry = this.generatePlateGeometry(element);
    }
    
    const material = this.createMaterialFromElement(element);
    const mesh = new Mesh(geometry, material);
    
    return {
      geometry,
      material,
      mesh,
      element,
      metadata: {
        weight: element.weight || 0,
        volume: this.calculateVolume(element),
        surfaceArea: this.calculateSurfaceArea(element)
      }
    };
  }

  // ========================================
  // MÉTHODES UTILITAIRES (gardées de l'ancienne version)
  // ========================================

  /**
   * Génère une géométrie de plaque
   */
  private generatePlateGeometry(element: UnifiedElement): BufferGeometry {
    // TODO: Utiliser PlateGenerator quand créé
    throw new Error('PlateGenerator pas encore implémenté');
  }

  /**
   * Génère une géométrie de fixation
   */
  private generateFastenerGeometry(element: UnifiedElement): BufferGeometry {
    // TODO: Utiliser FastenerGenerator quand créé
    throw new Error('FastenerGenerator pas encore implémenté');
  }

  /**
   * Génère une géométrie de soudure
   */
  private generateWeldGeometry(element: UnifiedElement): BufferGeometry {
    // TODO: Utiliser WeldGenerator quand créé
    throw new Error('WeldGenerator pas encore implémenté');
  }

  /**
   * Crée un matériau à partir d'un profil
   */
  private createMaterialFromProfile(profile: SteelProfile, element: UnifiedElement): Material {
    const grade = element.material?.grade || 'S355';
    
    let material: Material;
    
    if ((element.material as any)?.treatment === 'GALVANIZED') {
      material = SteelMaterials.galvanized();
    } else if ((element.material as any)?.treatment === 'PAINTED') {
      material = SteelMaterials.painted((element.material as any).color);
    } else if ((element.material as any)?.treatment === 'STAINLESS') {
      material = SteelMaterials.stainless();
    } else {
      material = SteelMaterials.raw();
    }
    
    if (material instanceof MeshStandardMaterial) {
      material.name = `${grade}_${profile.designation}`;
      material.userData = {
        profile,
        grade,
        weight: profile.weight
      };
    }
    
    return material;
  }

  /**
   * Crée un matériau à partir d'un élément
   */
  private createMaterialFromElement(element: UnifiedElement): Material {
    const options = {
      color: (element.material as any)?.color,
      roughness: (element.material as any)?.roughness,
      metalness: (element.material as any)?.metalness
    };
    
    return createMetalMaterial(options);
  }

  /**
   * Calcule le volume d'un élément
   */
  private calculateVolume(element: UnifiedElement): number {
    const dims = element.dimensions;
    if (!dims) return 0;
    
    const length = dims.length || 1000;
    const width = dims.width || 100;
    const height = dims.height || dims.thickness || 10;
    
    return (length * width * height) / 1000000; // mm³ to cm³
  }

  /**
   * Calcule la surface d'un élément
   */
  private calculateSurfaceArea(element: UnifiedElement): number {
    const dims = element.dimensions;
    if (!dims) return 0;
    
    const length = dims.length || 1000;
    const width = dims.width || 100;
    const height = dims.height || dims.thickness || 10;
    
    return 2 * (length * width + length * height + width * height) / 10000; // mm² to cm²
  }

  // ========================================
  // API PUBLIQUE (compatible avec l'ancienne version)
  // ========================================

  /**
   * Obtient toutes les désignations disponibles
   */
  async getAllDesignations(): Promise<string[]> {
    // Cette méthode n'existe pas dans UnifiedMaterialsDatabase
    // On retourne un tableau vide pour l'instant
    console.warn('getAllDesignations not yet implemented in UnifiedMaterialsDatabase');
    return [];
  }

  /**
   * Recherche des éléments par critères
   */
  async search(criteria: any): Promise<UnifiedElement[]> {
    return this.materialDb.search(criteria);
  }

  /**
   * Obtient les statistiques de génération
   */
  getGenerationStatistics() {
    return this.geometryFactory.getStatistics();
  }

  /**
   * Nettoie le cache
   */
  clearCache(): void {
    this.geometryCache.forEach(geom => geom.dispose());
    this.geometryCache.clear();
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clearCache();
  }
}