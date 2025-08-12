/**
 * Base de données unifiée de tous les matériaux et éléments pour le viewer 3D
 * Centralise : profilés, plaques, boulonnerie, soudures, accessoires
 */

import { UnifiedElement, MaterialCategory, ElementFilter } from '../types/material-types';
import { PLATES_DATABASE } from '../data/materials/plates';
import { FASTENERS_DATABASE } from '../data/materials/fasteners';
import { WELDS_ACCESSORIES_DATABASE } from '../data/materials/welds-accessories';

// Import des données de profilés existantes (adaptation)
import { ProfileDatabase } from './ProfileDatabase';
import { ProfileType, SteelProfile } from '../types/profile.types';

/**
 * Classe singleton pour gérer tous les matériaux de manière unifiée
 */
export class UnifiedMaterialsDatabase {
  private static instance: UnifiedMaterialsDatabase;
  private materials: Map<string, UnifiedElement> = new Map();
  private categorizedMaterials: Map<MaterialCategory, UnifiedElement[]> = new Map();
  private searchIndex: Map<string, UnifiedElement[]> = new Map();
  private initialized = false;

  private constructor() {}

  public static getInstance(): UnifiedMaterialsDatabase {
    if (!UnifiedMaterialsDatabase.instance) {
      UnifiedMaterialsDatabase.instance = new UnifiedMaterialsDatabase();
    }
    return UnifiedMaterialsDatabase.instance;
  }

  /**
   * Initialise la base de données avec tous les matériaux
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 Initialisation de la base de données unifiée des matériaux...');

    // Vider les collections existantes
    this.materials.clear();
    this.categorizedMaterials.clear();
    this.searchIndex.clear();

    // Charger toutes les données
    await this.loadProfiles();
    this.loadPlates();
    this.loadFasteners();
    this.loadWeldsAndAccessories();

    // Construire les index
    this.buildSearchIndex();
    this.buildCategoryIndex();

    this.initialized = true;
    console.log(`✅ Base de données initialisée avec ${this.materials.size} éléments`);
  }

  /**
   * Charge et adapte les profilés existants
   */
  private async loadProfiles(): Promise<void> {
    try {
      // Récupérer tous les types de profilés
      const profileTypes = Object.values(ProfileType);
      
      for (const type of profileTypes) {
        const profiles = await ProfileDatabase.getInstance().getProfilesByType(type);
        
        profiles.forEach(profile => {
          const unifiedElement = this.adaptProfileToUnified(profile);
          this.materials.set(unifiedElement.id, unifiedElement);
        });
      }
      
      console.log(`📐 Chargé ${profileTypes.length} types de profilés`);
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement des profilés:', error);
    }
  }

  /**
   * Adapte un profilé SteelProfile vers UnifiedElement
   */
  private adaptProfileToUnified(profile: SteelProfile): UnifiedElement {
    return {
      id: profile.id,
      name: profile.designation,
      description: `Profilé ${profile.designation} selon ${profile.source}`,
      category: MaterialCategory.PROFILES,
      type: profile.type as any,
      dimensions: {
        length: 6000, // Longueur standard
        width: profile.dimensions.width,
        height: profile.dimensions.height,
        thickness: profile.dimensions.webThickness,
        flangeThickness: profile.dimensions.flangeThickness,
        flangeWidth: profile.dimensions.width,
        webThickness: profile.dimensions.webThickness,
        rootRadius: profile.dimensions.rootRadius,
        toeRadius: profile.dimensions.toeRadius
      },
      material: {
        designation: 'S355', // Grade par défaut
        grade: 'S355' as any,
        finish: 'RAW' as any,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: profile.source
      },
      weight: profile.weight,
      area: profile.area ? profile.area / 10000 : undefined, // cm² → m²
      visual: {
        color: this.getProfileColor(profile.type),
        metalness: 0.8,
        roughness: 0.6,
        opacity: 1.0
      },
      standardLengths: [6000, 8000, 10000, 12000],
      searchTags: [
        'profilé',
        profile.type,
        profile.designation.replace(/\s+/g, ''),
        profile.source
      ],
      source: profile.source
    };
  }

  /**
   * Couleur par défaut selon le type de profilé
   */
  private getProfileColor(type: ProfileType): string {
    const colors: Record<string, string> = {
      [ProfileType.IPE]: '#3B82F6',
      [ProfileType.HEA]: '#10B981', 
      [ProfileType.HEB]: '#8B5CF6',
      [ProfileType.HEM]: '#F59E0B',
      [ProfileType.UPN]: '#EF4444',
      [ProfileType.UAP]: '#EC4899',
      [ProfileType.L_EQUAL]: '#06B6D4',
      [ProfileType.L_UNEQUAL]: '#84CC16',
      [ProfileType.TUBE_CIRCULAR]: '#6B7280',
      [ProfileType.TUBE_SQUARE]: '#374151',
      [ProfileType.TUBE_RECTANGULAR]: '#1F2937'
    };
    return colors[type] || '#6B7280';
  }

  /**
   * Charge les plaques et tôles
   */
  private loadPlates(): void {
    PLATES_DATABASE.forEach(plate => {
      this.materials.set(plate.id, plate);
    });
    console.log(`📋 Chargé ${PLATES_DATABASE.length} types de plaques`);
  }

  /**
   * Charge la boulonnerie et fixations
   */
  private loadFasteners(): void {
    FASTENERS_DATABASE.forEach(fastener => {
      this.materials.set(fastener.id, fastener);
    });
    console.log(`🔩 Chargé ${FASTENERS_DATABASE.length} éléments de boulonnerie`);
  }

  /**
   * Charge les soudures et accessoires
   */
  private loadWeldsAndAccessories(): void {
    WELDS_ACCESSORIES_DATABASE.forEach(item => {
      this.materials.set(item.id, item);
    });
    console.log(`⚡ Chargé ${WELDS_ACCESSORIES_DATABASE.length} soudures et accessoires`);
  }

  /**
   * Construit l'index de recherche textuelle
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear();
    
    this.materials.forEach(material => {
      // Mots-clés pour la recherche
      const keywords = [
        material.name.toLowerCase(),
        material.description?.toLowerCase() || '',
        material.type.toString().toLowerCase(),
        material.category.toLowerCase(),
        ...((material.searchTags || []).map(tag => tag.toLowerCase()))
      ];

      keywords.forEach(keyword => {
        const words = keyword.split(/\s+|[.-_]/);
        words.forEach(word => {
          if (word.length > 2) {
            if (!this.searchIndex.has(word)) {
              this.searchIndex.set(word, []);
            }
            this.searchIndex.get(word)!.push(material);
          }
        });
      });
    });
  }

  /**
   * Construit l'index par catégorie
   */
  private buildCategoryIndex(): void {
    this.categorizedMaterials.clear();
    
    Object.values(MaterialCategory).forEach(category => {
      this.categorizedMaterials.set(category, []);
    });

    this.materials.forEach(material => {
      const categoryMaterials = this.categorizedMaterials.get(material.category);
      if (categoryMaterials) {
        categoryMaterials.push(material);
      }
    });
  }

  // ==================== API PUBLIQUE ====================

  /**
   * Recherche un élément par ID
   */
  public async findById(id: string): Promise<UnifiedElement | undefined> {
    await this.initialize();
    return this.materials.get(id);
  }

  /**
   * Recherche par nom/désignation
   */
  public async findByName(name: string): Promise<UnifiedElement | undefined> {
    await this.initialize();
    
    // Recherche exacte d'abord
    for (const material of this.materials.values()) {
      if (material.name.toLowerCase() === name.toLowerCase()) {
        return material;
      }
    }
    
    // Recherche partielle
    for (const material of this.materials.values()) {
      if (material.name.toLowerCase().includes(name.toLowerCase())) {
        return material;
      }
    }
    
    return undefined;
  }

  /**
   * Recherche par catégorie
   */
  public async findByCategory(category: MaterialCategory): Promise<UnifiedElement[]> {
    await this.initialize();
    return this.categorizedMaterials.get(category) || [];
  }

  /**
   * Recherche avec filtres
   */
  public async search(filter: ElementFilter): Promise<UnifiedElement[]> {
    await this.initialize();
    
    let results = Array.from(this.materials.values());
    
    // Filtre par catégories
    if (filter.categories && filter.categories.length > 0) {
      results = results.filter(m => filter.categories!.includes(m.category));
    }
    
    // Filtre par types
    if (filter.types && filter.types.length > 0) {
      results = results.filter(m => filter.types!.includes(m.type.toString()));
    }
    
    // Filtre par grades
    if (filter.grades && filter.grades.length > 0) {
      results = results.filter(m => filter.grades!.includes(m.material.grade as any));
    }
    
    // Filtres dimensionnels
    if (filter.minLength) {
      results = results.filter(m => (m.dimensions.length || 0) >= filter.minLength!);
    }
    if (filter.maxLength) {
      results = results.filter(m => (m.dimensions.length || 0) <= filter.maxLength!);
    }
    if (filter.minDiameter) {
      results = results.filter(m => (m.dimensions.diameter || 0) >= filter.minDiameter!);
    }
    if (filter.maxDiameter) {
      results = results.filter(m => (m.dimensions.diameter || 0) <= filter.maxDiameter!);
    }
    if (filter.minThickness) {
      results = results.filter(m => (m.dimensions.thickness || 0) >= filter.minThickness!);
    }
    if (filter.maxThickness) {
      results = results.filter(m => (m.dimensions.thickness || 0) <= filter.maxThickness!);
    }
    
    // Filtre par poids
    if (filter.minWeight) {
      results = results.filter(m => (m.weight || 0) >= filter.minWeight!);
    }
    if (filter.maxWeight) {
      results = results.filter(m => (m.weight || 0) <= filter.maxWeight!);
    }
    
    // Recherche textuelle
    if (filter.searchText) {
      const searchTerms = filter.searchText.toLowerCase().split(/\s+/);
      results = results.filter(material => 
        searchTerms.every(term =>
          material.name.toLowerCase().includes(term) ||
          material.description?.toLowerCase().includes(term) ||
          material.type.toString().toLowerCase().includes(term) ||
          (material.searchTags || []).some(tag => tag.toLowerCase().includes(term))
        )
      );
    }
    
    // Tri
    if (filter.sortBy) {
      results.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (filter.sortBy) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'weight':
            aVal = a.weight || 0;
            bVal = b.weight || 0;
            break;
          case 'length':
            aVal = a.dimensions.length || 0;
            bVal = b.dimensions.length || 0;
            break;
          case 'diameter':
            aVal = a.dimensions.diameter || 0;
            bVal = b.dimensions.diameter || 0;
            break;
          default:
            return 0;
        }
        
        if (filter.sortOrder === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        } else {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
      });
    }
    
    // Pagination
    if (filter.offset || filter.limit) {
      const start = filter.offset || 0;
      const end = filter.limit ? start + filter.limit : undefined;
      results = results.slice(start, end);
    }
    
    return results;
  }

  /**
   * Récupère un élément par sa désignation
   */
  public async getByDesignation(designation: string): Promise<UnifiedElement | undefined> {
    await this.initialize();
    
    return this.materials.get(designation) || 
           Array.from(this.materials.values()).find(element => 
             element.name === designation ||
             element.id === designation
           );
  }

  /**
   * Récupère tous les éléments d'une catégorie
   */
  public async getByCategory(category: MaterialCategory): Promise<UnifiedElement[]> {
    await this.initialize();
    
    return this.categorizedMaterials.get(category) || [];
  }

  /**
   * Recherche textuelle rapide
   */
  public async quickSearch(query: string, limit: number = 20): Promise<UnifiedElement[]> {
    await this.initialize();
    
    const results = new Set<UnifiedElement>();
    const words = query.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      // Recherche dans l'index
      this.searchIndex.forEach((materials, key) => {
        if (key.includes(word)) {
          materials.forEach(material => results.add(material));
        }
      });
    });
    
    return Array.from(results).slice(0, limit);
  }

  /**
   * Statistiques de la base de données
   */
  public async getStatistics(): Promise<Record<string, any>> {
    await this.initialize();
    
    const stats: Record<string, any> = {
      totalElements: this.materials.size,
      byCategory: {}
    };
    
    // Statistiques par catégorie
    Object.values(MaterialCategory).forEach(category => {
      const categoryMaterials = this.categorizedMaterials.get(category) || [];
      stats.byCategory[category] = categoryMaterials.length;
    });
    
    return stats;
  }

  /**
   * Obtenir toutes les catégories disponibles
   */
  public getAvailableCategories(): MaterialCategory[] {
    return Object.values(MaterialCategory);
  }

  /**
   * Ajouter un élément personnalisé
   */
  public async addCustomElement(element: UnifiedElement): Promise<void> {
    await this.initialize();
    
    this.materials.set(element.id, element);
    
    // Mettre à jour les index
    const categoryMaterials = this.categorizedMaterials.get(element.category) || [];
    categoryMaterials.push(element);
    this.categorizedMaterials.set(element.category, categoryMaterials);
    
    // Reconstruire l'index de recherche (simple)
    this.buildSearchIndex();
  }

  /**
   * Supprimer un élément
   */
  public async removeElement(id: string): Promise<boolean> {
    await this.initialize();
    
    const element = this.materials.get(id);
    if (!element) return false;
    
    this.materials.delete(id);
    
    // Mettre à jour l'index par catégorie
    const categoryMaterials = this.categorizedMaterials.get(element.category) || [];
    const index = categoryMaterials.findIndex(m => m.id === id);
    if (index >= 0) {
      categoryMaterials.splice(index, 1);
    }
    
    // Reconstruire l'index de recherche
    this.buildSearchIndex();
    
    return true;
  }

  /**
   * Réinitialiser la base de données
   */
  public async reset(): Promise<void> {
    this.materials.clear();
    this.categorizedMaterials.clear();
    this.searchIndex.clear();
    this.initialized = false;
    
    await this.initialize();
  }

  /**
   * Vider le cache (pour compatibilité)
   */
  public clearCache(): void {
    // Pas de cache explicite dans cette implémentation
    console.log('Cache cleared');
  }
}

// Export de l'instance singleton
export const UnifiedDB = UnifiedMaterialsDatabase.getInstance();