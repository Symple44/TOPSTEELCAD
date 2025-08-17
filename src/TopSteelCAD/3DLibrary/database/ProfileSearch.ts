/**
 * Moteur de recherche pour les profilés métalliques
 * Avec indexation et recherche optimisée
 */

import { 
  ProfileType, 
  SteelProfile, 
  ProfileFilter,
  ProfileSearchResult,
  ProfileMap,
  ProfileIndex
} from '../types/profile.types';

export class ProfileSearch {
  private profiles: ProfileMap;
  private indexById: ProfileIndex;
  private indexByDesignation: ProfileIndex;
  private indexByType: Map<ProfileType, SteelProfile[]>;
  private searchIndex: Map<string, Set<SteelProfile>>;

  constructor(profiles: ProfileMap) {
    this.profiles = profiles;
    this.indexById = new Map();
    this.indexByDesignation = new Map();
    this.indexByType = new Map();
    this.searchIndex = new Map();
  }

  /**
   * Construit tous les index pour optimiser les recherches
   */
  public buildIndexes(): void {
    console.log('🔍 Construction des index de recherche...');
    
    // Réinitialiser les index
    this.indexById.clear();
    this.indexByDesignation.clear();
    this.indexByType.clear();
    this.searchIndex.clear();

    let profileCount = 0;

    for (const [type, profileList] of this.profiles) {
      // Index par type
      this.indexByType.set(type, profileList);

      for (const profile of profileList) {
        profileCount++;

        // Index par ID
        this.indexById.set(profile.id.toUpperCase(), profile);
        
        // Index par désignation (avec normalisation)
        const normalizedDesignation = this.normalizeDesignation(profile.designation);
        this.indexByDesignation.set(normalizedDesignation, profile);
        
        // Créer des alias pour les variantes courantes
        this.createAliases(profile);
        
        // Index de recherche textuelle
        this.indexForSearch(profile);
      }
    }

    console.log(`✅ Index construits pour ${profileCount} profilés`);
  }

  /**
   * Normalise une désignation pour la recherche
   */
  private normalizeDesignation(designation: string): string {
    return designation
      .toUpperCase()
      .replace(/\s+/g, '')      // Supprime les espaces
      .replace(/[^\w]/g, '');   // Supprime les caractères spéciaux
  }

  /**
   * Crée des alias pour faciliter la recherche
   */
  private createAliases(profile: SteelProfile): void {
    const baseDesignation = profile.designation;
    
    // Variantes communes
    const variants = [
      baseDesignation.replace(/\s+/g, ''),        // IPE300
      baseDesignation.replace(/\s+/g, '-'),       // IPE-300
      baseDesignation.replace(/\s+/g, '_'),       // IPE_300
      baseDesignation.toLowerCase(),              // ipe 300
      baseDesignation.replace(/\s+/g, '').toLowerCase(), // ipe300
    ];

    // Ajouter aussi les variantes avec zéros
    const match = baseDesignation.match(/([A-Z]+)\s*(\d+)/);
    if (match) {
      const [, prefix, number] = match;
      const paddedNumber = number.padStart(3, '0'); // IPE080 pour IPE80
      variants.push(`${prefix}${paddedNumber}`);
      variants.push(`${prefix} ${paddedNumber}`);
    }

    for (const variant of variants) {
      const normalized = this.normalizeDesignation(variant);
      if (!this.indexByDesignation.has(normalized)) {
        this.indexByDesignation.set(normalized, profile);
      }
    }
  }

  /**
   * Indexe un profilé pour la recherche textuelle
   */
  private indexForSearch(profile: SteelProfile): void {
    // Mots-clés à indexer
    const keywords = [
      profile.type,
      profile.designation,
      profile.source,
      profile.category,
      ...(profile.searchTags || []),
      ...(profile.aliases || []),
    ].filter(Boolean);

    // Ajouter aussi les parties de la désignation
    const designationParts = profile.designation.split(/[\s-_]/);
    keywords.push(...designationParts);

    // Indexer chaque mot-clé
    for (const keyword of keywords) {
      if (!keyword) continue;
      
      const normalized = keyword.toString().toLowerCase();
      
      // Index complet
      if (!this.searchIndex.has(normalized)) {
        this.searchIndex.set(normalized, new Set());
      }
      this.searchIndex.get(normalized)!.add(profile);

      // Index par préfixe (pour l'autocomplétion)
      for (let i = 1; i <= normalized.length && i <= 10; i++) {
        const prefix = normalized.substring(0, i);
        const prefixKey = `prefix:${prefix}`;
        
        if (!this.searchIndex.has(prefixKey)) {
          this.searchIndex.set(prefixKey, new Set());
        }
        this.searchIndex.get(prefixKey)!.add(profile);
      }
    }
  }

  // ==================== MÉTHODES DE RECHERCHE ====================

  /**
   * Trouve un profilé par son ID
   */
  public findById(id: string): SteelProfile | undefined {
    return this.indexById.get(id.toUpperCase());
  }

  /**
   * Trouve un profilé par sa désignation
   */
  public findByDesignation(designation: string): SteelProfile | undefined {
    const normalized = this.normalizeDesignation(designation);
    return this.indexByDesignation.get(normalized);
  }

  /**
   * Trouve tous les profilés d'un type donné
   */
  public findByType(type: ProfileType): SteelProfile[] {
    return this.indexByType.get(type) || [];
  }

  /**
   * Recherche avec filtres complexes
   */
  public findByFilter(filter: ProfileFilter): SteelProfile[] {
    let results: SteelProfile[] = [];
    
    // Commencer par le filtre le plus restrictif
    if (filter.types && filter.types.length > 0) {
      // Filtrer par types
      for (const type of filter.types) {
        const typeProfiles = this.indexByType.get(type) || [];
        results.push(...typeProfiles);
      }
    } else {
      // Tous les profilés
      for (const profiles of this.profiles.values()) {
        results.push(...profiles);
      }
    }

    // Appliquer les filtres
    results = results.filter(profile => this.matchesFilter(profile, filter));

    // Tri des résultats
    if (filter.sortBy) {
      results.sort(this.getSortComparator(filter.sortBy, filter.sortOrder));
    }

    // Pagination
    if (filter.limit) {
      const start = filter.offset || 0;
      results = results.slice(start, start + filter.limit);
    }

    return results;
  }

  /**
   * Recherche textuelle avec score de pertinence
   */
  public textSearch(query: string, limit: number = 10): ProfileSearchResult[] {
    const queryLower = query.toLowerCase();
    const queryParts = queryLower.split(/\s+/);
    const results = new Map<SteelProfile, number>();

    // Recherche exacte par désignation
    const exactMatch = this.findByDesignation(query);
    if (exactMatch) {
      results.set(exactMatch, 100);
    }

    // Recherche par mots-clés
    for (const part of queryParts) {
      const matches = this.searchIndex.get(part);
      if (matches) {
        for (const profile of matches) {
          const currentScore = results.get(profile) || 0;
          results.set(profile, currentScore + 10);
        }
      }

      // Recherche par préfixe
      const prefixMatches = this.searchIndex.get(`prefix:${part}`);
      if (prefixMatches) {
        for (const profile of prefixMatches) {
          const currentScore = results.get(profile) || 0;
          results.set(profile, currentScore + 5);
        }
      }
    }

    // Recherche floue (contient la chaîne)
    for (const profiles of this.profiles.values()) {
      for (const profile of profiles) {
        if (results.has(profile)) continue;

        const searchableText = [
          profile.designation,
          profile.type,
          profile.source,
          ...(profile.searchTags || [])
        ].join(' ').toLowerCase();

        if (searchableText.includes(queryLower)) {
          const currentScore = results.get(profile) || 0;
          results.set(profile, currentScore + 2);
        }
      }
    }

    // Convertir en tableau et trier par score
    const sortedResults = Array.from(results.entries())
      .map(([profile, score]) => ({ profile, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sortedResults;
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Vérifie si un profilé correspond aux filtres
   */
  private matchesFilter(profile: SteelProfile, filter: ProfileFilter): boolean {
    // Filtre par poids
    if (filter.minWeight !== undefined && profile.weight < filter.minWeight) return false;
    if (filter.maxWeight !== undefined && profile.weight > filter.maxWeight) return false;

    // Filtre par dimensions
    if (filter.minHeight !== undefined) {
      if (!profile.dimensions.height || profile.dimensions.height < filter.minHeight) return false;
    }
    if (filter.maxHeight !== undefined) {
      if (!profile.dimensions.height || profile.dimensions.height > filter.maxHeight) return false;
    }
    if (filter.minWidth !== undefined) {
      if (!profile.dimensions.width || profile.dimensions.width < filter.minWidth) return false;
    }
    if (filter.maxWidth !== undefined) {
      if (!profile.dimensions.width || profile.dimensions.width > filter.maxWidth) return false;
    }

    // Filtre par aire
    if (filter.minArea !== undefined && profile.area < filter.minArea) return false;
    if (filter.maxArea !== undefined && profile.area > filter.maxArea) return false;

    // Filtre par inertie
    if (filter.minInertiaY !== undefined && profile.inertia?.Iyy && profile.inertia.Iyy < filter.minInertiaY) return false;
    if (filter.maxInertiaY !== undefined && profile.inertia?.Iyy && profile.inertia.Iyy > filter.maxInertiaY) return false;

    // Filtre par source/norme
    if (filter.sources && filter.sources.length > 0) {
      if (!profile.source || !filter.sources.includes(profile.source)) return false;
    }

    // Filtre par catégorie
    if (filter.categories && filter.categories.length > 0) {
      if (!profile.category || !filter.categories.includes(profile.category)) return false;
    }

    // Recherche textuelle
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      const searchableText = [
        profile.designation,
        profile.id,
        profile.type,
        profile.source,
        profile.category,
        ...(profile.searchTags || [])
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) return false;
    }

    return true;
  }

  /**
   * Obtient une fonction de comparaison pour le tri
   */
  private getSortComparator(
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): (a: SteelProfile, b: SteelProfile) => number {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return (a: SteelProfile, b: SteelProfile) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'weight':
          aValue = a.weight;
          bValue = b.weight;
          break;
        case 'height':
          aValue = a.dimensions.height || 0;
          bValue = b.dimensions.height || 0;
          break;
        case 'width':
          aValue = a.dimensions.width || 0;
          bValue = b.dimensions.width || 0;
          break;
        case 'area':
          aValue = a.area;
          bValue = b.area;
          break;
        case 'designation':
          aValue = a.designation;
          bValue = b.designation;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * multiplier;
      }

      return (aValue - bValue) * multiplier;
    };
  }
}