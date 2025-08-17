/**
 * Base de données singleton pour la gestion des profilés métalliques
 * Pattern Singleton avec lazy loading et cache optimisé
 */

import { 
  ProfileType, 
  SteelProfile, 
  ProfileFilter,
  ProfileSearchResult,
  ProfileMap,
  ProfileIndex
} from '../types/profile.types';
import { ProfileSearch } from './ProfileSearch';
import { ProfileCache } from './ProfileCache';

export class ProfileDatabase {
  private static instance: ProfileDatabase;
  private profiles: ProfileMap;
  private cache: ProfileCache;
  private searchEngine: ProfileSearch;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.profiles = new Map();
    this.cache = new ProfileCache();
    this.searchEngine = new ProfileSearch(this.profiles);
  }

  /**
   * Obtient l'instance unique de la base de données
   */
  public static getInstance(): ProfileDatabase {
    if (!ProfileDatabase.instance) {
      ProfileDatabase.instance = new ProfileDatabase();
    }
    return ProfileDatabase.instance;
  }

  /**
   * Initialise la base de données avec chargement différé
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadProfiles();
    await this.initializationPromise;
    this.isInitialized = true;
  }

  /**
   * Charge tous les profilés depuis les modules
   */
  private async loadProfiles(): Promise<void> {
    console.log('📚 Chargement de la base de données des profilés...');
    
    try {
      // Chargement parallèle de tous les types de profilés
      const loadPromises = [
        this.loadIPEProfiles(),
        this.loadHEAProfiles(),
        this.loadHEBProfiles(),
        this.loadHEMProfiles(),
        this.loadUPNProfiles(),
        this.loadUAPProfiles(),
        this.loadCornieresProfiles(),
        this.loadTubeProfiles(),
        this.loadNewProfiles(),
      ];

      await Promise.all(loadPromises);
      
      // Construire les index après le chargement
      this.searchEngine.buildIndexes();
      
      console.log(`✅ Base de données initialisée: ${this.getTotalProfileCount()} profilés chargés`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des profilés:', error);
      throw error;
    }
  }

  /**
   * Charge les profilés IPE
   */
  private async loadIPEProfiles(): Promise<void> {
    try {
      const { IPE_PROFILES } = await import('../data/profiles/ipe-profiles');
      this.profiles.set(ProfileType.IPE, IPE_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les profilés IPE:', error);
    }
  }

  /**
   * Charge les profilés HEA
   */
  private async loadHEAProfiles(): Promise<void> {
    try {
      const { HEA_PROFILES } = await import('../data/profiles/hea-profiles');
      this.profiles.set(ProfileType.HEA, HEA_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les profilés HEA:', error);
    }
  }

  /**
   * Charge les profilés HEB
   */
  private async loadHEBProfiles(): Promise<void> {
    try {
      const { HEB_PROFILES } = await import('../data/profiles/heb-profiles');
      this.profiles.set(ProfileType.HEB, HEB_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les profilés HEB:', error);
    }
  }

  /**
   * Charge les profilés HEM
   */
  private async loadHEMProfiles(): Promise<void> {
    try {
      const { HEM_PROFILES } = await import('../data/profiles/hem-profiles');
      this.profiles.set(ProfileType.HEM, HEM_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les profilés HEM:', error);
    }
  }

  /**
   * Charge les profilés UPN
   */
  private async loadUPNProfiles(): Promise<void> {
    try {
      const { UPN_PROFILES } = await import('../data/profiles/upn-profiles');
      this.profiles.set(ProfileType.UPN, UPN_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les profilés UPN:', error);
    }
  }

  /**
   * Charge les profilés UAP
   */
  private async loadUAPProfiles(): Promise<void> {
    try {
      const { UAP_PROFILES } = await import('../data/profiles/uap-profiles');
      this.profiles.set(ProfileType.UAP, UAP_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les profilés UAP:', error);
    }
  }

  /**
   * Charge les cornières
   */
  private async loadCornieresProfiles(): Promise<void> {
    try {
      const { L_EQUAL_PROFILES } = await import('../data/profiles/l-equal-profiles');
      const { L_UNEQUAL_PROFILES } = await import('../data/profiles/l-unequal-profiles');
      this.profiles.set(ProfileType.L_EQUAL, L_EQUAL_PROFILES);
      this.profiles.set(ProfileType.L_UNEQUAL, L_UNEQUAL_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les cornières:', error);
    }
  }

  /**
   * Charge les tubes
   */
  private async loadTubeProfiles(): Promise<void> {
    try {
      const { TUBE_SQUARE_PROFILES } = await import('../data/profiles/tube-square-profiles');
      const { TUBE_RECTANGULAR_PROFILES } = await import('../data/profiles/tube-rectangular-profiles');
      const { TUBE_CIRCULAR_PROFILES } = await import('../data/profiles/tube-circular-profiles');
      
      this.profiles.set(ProfileType.TUBE_SQUARE, TUBE_SQUARE_PROFILES);
      this.profiles.set(ProfileType.TUBE_RECTANGULAR, TUBE_RECTANGULAR_PROFILES);
      this.profiles.set(ProfileType.TUBE_CIRCULAR, TUBE_CIRCULAR_PROFILES);
    } catch (error) {
      console.warn('⚠️ Impossible de charger les tubes:', error);
    }
  }

  /**
   * Charge les nouveaux profils ajoutés
   */
  private async loadNewProfiles(): Promise<void> {
    try {
      // Profilés en T et TEE
      const { T_PROFILES } = await import('../data/profiles/t-profiles');
      this.profiles.set(ProfileType.T_PROFILE, T_PROFILES);
      this.profiles.set(ProfileType.TEE, T_PROFILES); // Les deux types pointent vers les mêmes données
      
      // Barres et profils plats
      const { FLAT_PROFILES } = await import('../data/profiles/flat-profiles');
      const { ROUND_BAR_PROFILES } = await import('../data/profiles/round-bar-profiles');
      const { SQUARE_BAR_PROFILES } = await import('../data/profiles/square-bar-profiles');
      
      this.profiles.set(ProfileType.FLAT, FLAT_PROFILES);
      this.profiles.set(ProfileType.ROUND_BAR, ROUND_BAR_PROFILES);
      this.profiles.set(ProfileType.SQUARE_BAR, SQUARE_BAR_PROFILES);
      
      // Profilés formés à froid
      const { Z_PROFILES } = await import('../data/profiles/z-profiles');
      const { C_PROFILES } = await import('../data/profiles/c-profiles');
      const { SIGMA_PROFILES } = await import('../data/profiles/sigma-profiles');
      const { OMEGA_PROFILES } = await import('../data/profiles/omega-profiles');
      
      this.profiles.set(ProfileType.Z_PROFILE, Z_PROFILES);
      this.profiles.set(ProfileType.C_PROFILE, C_PROFILES);
      this.profiles.set(ProfileType.SIGMA_PROFILE, SIGMA_PROFILES);
      this.profiles.set(ProfileType.OMEGA_PROFILE, OMEGA_PROFILES);
      
      // Profilés AISC américains
      const { W_PROFILES } = await import('../data/profiles/w-profiles');
      const { S_PROFILES } = await import('../data/profiles/s-profiles');
      const { HP_PROFILES } = await import('../data/profiles/hp-profiles');
      
      this.profiles.set(ProfileType.W_SHAPE, W_PROFILES);
      this.profiles.set(ProfileType.S_SHAPE, S_PROFILES);
      this.profiles.set(ProfileType.HP_SHAPE, HP_PROFILES);
      
    } catch (error) {
      console.warn('⚠️ Impossible de charger les nouveaux profils:', error);
    }
  }

  // ==================== MÉTHODES PUBLIQUES DE RECHERCHE ====================

  /**
   * Trouve un profilé par son ID unique
   */
  public async findById(id: string): Promise<SteelProfile | undefined> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `id:${id}`,
      () => this.searchEngine.findById(id)
    );
  }

  /**
   * Trouve un profilé par sa désignation
   */
  public async findByDesignation(designation: string): Promise<SteelProfile | undefined> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `designation:${designation}`,
      () => this.searchEngine.findByDesignation(designation)
    );
  }

  /**
   * Trouve tous les profilés d'un type donné
   */
  public async findByType(type: ProfileType): Promise<SteelProfile[]> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `type:${type}`,
      () => this.searchEngine.findByType(type)
    );
  }

  /**
   * Recherche avancée avec filtres
   */
  public async findByFilter(filter: ProfileFilter): Promise<SteelProfile[]> {
    await this.initialize();
    
    const cacheKey = this.generateFilterCacheKey(filter);
    return this.cache.getOrCompute(
      cacheKey,
      () => this.searchEngine.findByFilter(filter)
    );
  }

  /**
   * Recherche textuelle avec score de pertinence
   */
  public async search(query: string, limit: number = 10): Promise<ProfileSearchResult[]> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `search:${query}:${limit}`,
      () => this.searchEngine.textSearch(query, limit)
    );
  }

  // ==================== MÉTHODES D'ADMINISTRATION ====================

  /**
   * Ajoute un nouveau profilé à la base de données
   */
  public async registerProfile(profile: SteelProfile): Promise<void> {
    await this.initialize();
    
    const typeProfiles = this.profiles.get(profile.type) || [];
    typeProfiles.push(profile);
    this.profiles.set(profile.type, typeProfiles);
    
    // Reconstruire les index
    this.searchEngine.buildIndexes();
    
    // Invalider le cache
    this.cache.invalidate();
  }

  /**
   * Supprime un profilé de la base de données
   */
  public async removeProfile(id: string): Promise<boolean> {
    await this.initialize();
    
    let removed = false;
    
    for (const [type, profiles] of this.profiles) {
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        profiles.splice(index, 1);
        removed = true;
        break;
      }
    }
    
    if (removed) {
      this.searchEngine.buildIndexes();
      this.cache.invalidate();
    }
    
    return removed;
  }

  /**
   * Met à jour un profilé existant
   */
  public async updateProfile(id: string, updates: Partial<SteelProfile>): Promise<boolean> {
    await this.initialize();
    
    let updated = false;
    
    for (const [type, profiles] of this.profiles) {
      const profile = profiles.find(p => p.id === id);
      if (profile) {
        Object.assign(profile, updates);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      this.searchEngine.buildIndexes();
      this.cache.invalidate();
    }
    
    return updated;
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Obtient tous les types de profilés disponibles
   */
  public getAvailableTypes(): ProfileType[] {
    return Array.from(this.profiles.keys());
  }

  /**
   * Obtient toutes les sources/normes disponibles
   */
  public getAllSources(): string[] {
    const sources = new Set<string>();
    
    for (const profiles of this.profiles.values()) {
      for (const profile of profiles) {
        if (profile.source) {
          sources.add(profile.source);
        }
      }
    }
    
    return Array.from(sources);
  }

  /**
   * Obtient le nombre total de profilés
   */
  public getTotalProfileCount(): number {
    let count = 0;
    for (const profiles of this.profiles.values()) {
      count += profiles.length;
    }
    return count;
  }

  /**
   * Récupère tous les profils d'un type spécifique
   */
  public async getProfilesByType(type: ProfileType): Promise<SteelProfile[]> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `type:${type}`,
      () => {
        const profiles = this.profiles.get(type);
        return profiles ? [...profiles] : [];
      }
    );
  }

  /**
   * Récupère un profil par sa désignation
   */
  public async getProfile(designation: string): Promise<SteelProfile | undefined> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `designation:${designation}`,
      () => this.searchEngine.findByDesignation(designation)
    );
  }


  /**
   * Recherche par critères avec cache
   */
  public async searchProfiles(filter: ProfileFilter): Promise<SteelProfile[]> {
    await this.initialize();
    
    const cacheKey = this.generateFilterCacheKey(filter);
    return this.cache.getOrCompute(
      cacheKey,
      () => this.searchEngine.findByFilter(filter)
    );
  }

  /**
   * Recherche par désignation partielle
   */
  public async searchByDesignation(partialDesignation: string): Promise<SteelProfile[]> {
    await this.initialize();
    
    return this.cache.getOrCompute(
      `search:${partialDesignation}`,
      () => {
        const profile = this.searchEngine.findByDesignation(partialDesignation);
        return profile ? [profile] : [];
      }
    );
  }

  /**
   * Obtient les statistiques de la base de données
   */
  public getStatistics(): Record<string, any> {
    return {
      totalProfiles: this.getTotalProfileCount(),
      profilesByType: Object.fromEntries(
        Array.from(this.profiles.entries()).map(([type, profiles]) => [type, profiles.length])
      ),
      sources: this.getAllSources(),
      cacheSize: this.cache.getSize(),
      cacheHitRate: this.cache.getHitRate(),
    };
  }

  /**
   * Vide le cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Réinitialise la base de données
   */
  public async reset(): Promise<void> {
    this.profiles.clear();
    this.cache.clear();
    this.isInitialized = false;
    this.initializationPromise = null;
    await this.initialize();
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Génère une clé de cache pour un filtre
   */
  private generateFilterCacheKey(filter: ProfileFilter): string {
    const parts: string[] = ['filter'];
    
    if (filter.types) parts.push(`types:${filter.types.join(',')}`);
    if (filter.minHeight !== undefined) parts.push(`minh:${filter.minHeight}`);
    if (filter.maxHeight !== undefined) parts.push(`maxh:${filter.maxHeight}`);
    if (filter.minWeight !== undefined) parts.push(`minw:${filter.minWeight}`);
    if (filter.maxWeight !== undefined) parts.push(`maxw:${filter.maxWeight}`);
    if (filter.searchText) parts.push(`q:${filter.searchText}`);
    if (filter.sortBy) parts.push(`sort:${filter.sortBy}`);
    if (filter.sortOrder) parts.push(`order:${filter.sortOrder}`);
    if (filter.limit) parts.push(`limit:${filter.limit}`);
    if (filter.offset) parts.push(`offset:${filter.offset}`);
    
    return parts.join(':');
  }
}