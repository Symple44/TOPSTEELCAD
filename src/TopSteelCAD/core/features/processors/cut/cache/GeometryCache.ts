/**
 * GeometryCache.ts - Cache intelligent pour les géométries CSG
 * Optimise les performances en évitant les recalculs coûteux
 */

import * as THREE from 'three';
import { Feature } from '../types/CoreTypes';
import { CutType } from '../types/CutTypes';

/**
 * Clé de cache pour une géométrie
 */
interface CacheKey {
  featureId: string;
  cutType: CutType;
  hash: string;
  timestamp: number;
}

/**
 * Entrée du cache
 */
interface CacheEntry {
  key: CacheKey;
  geometry: THREE.BufferGeometry;
  hitCount: number;
  lastAccessed: number;
  size: number; // Taille approximative en octets
  metadata?: any;
}

/**
 * Statistiques du cache
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  maxSize: number;
  entryCount: number;
  hitRate: number;
  averageEntrySize: number;
  totalSaved: number; // Temps économisé en ms
}

/**
 * Configuration du cache
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number; // Taille maximale en octets
  maxEntries: number; // Nombre maximum d'entrées
  ttl: number; // Time to live en ms
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO'; // Least Recently Used, Least Frequently Used, First In First Out
  persistToStorage: boolean; // Sauvegarder dans localStorage
  compressionEnabled: boolean; // Compresser les géométries
}

/**
 * Cache intelligent pour les géométries CSG
 */
export class GeometryCache {
  private static instance: GeometryCache;
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB par défaut
      maxEntries: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      evictionPolicy: 'LRU',
      persistToStorage: false,
      compressionEnabled: false,
      ...config
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      entryCount: 0,
      hitRate: 0,
      averageEntrySize: 0,
      totalSaved: 0
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
      if (this.config.persistToStorage) {
        this.loadFromStorage();
      }
    }
  }

  /**
   * Obtient l'instance singleton
   */
  static getInstance(config?: Partial<CacheConfig>): GeometryCache {
    if (!GeometryCache.instance) {
      GeometryCache.instance = new GeometryCache(config);
    }
    return GeometryCache.instance;
  }

  /**
   * Génère une clé de cache pour une feature
   */
  generateKey(feature: Feature, cutType: CutType, additionalParams?: any): string {
    const params = feature.parameters as any;
    
    // Créer un objet avec les propriétés importantes pour le hash
    const keyObject = {
      id: feature.id,
      type: feature.type,
      cutType: cutType,
      // Paramètres géométriques importants
      points: params.points,
      depth: params.depth,
      angle: params.angle,
      radius: params.radius,
      width: params.width,
      height: params.height,
      face: params.face,
      // Paramètres additionnels
      ...additionalParams
    };

    // Générer un hash stable
    return this.hashObject(keyObject);
  }

  /**
   * Récupère une géométrie du cache
   */
  get(key: string): THREE.BufferGeometry | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Vérifier le TTL
    const now = Date.now();
    if (this.config.ttl > 0 && now - entry.key.timestamp > this.config.ttl) {
      this.evict(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Mettre à jour les statistiques
    entry.hitCount++;
    entry.lastAccessed = now;
    this.stats.hits++;
    this.updateHitRate();

    // Cloner la géométrie pour éviter les modifications
    return entry.geometry.clone();
  }

  /**
   * Stocke une géométrie dans le cache
   */
  set(key: string, geometry: THREE.BufferGeometry, cutType: CutType, metadata?: any): boolean {
    if (!this.config.enabled) return false;

    const size = this.estimateGeometrySize(geometry);
    
    // Vérifier la taille
    if (size > this.config.maxSize * 0.1) { // Ne pas cacher si > 10% de la taille max
      console.warn(`Geometry too large to cache: ${size} bytes`);
      return false;
    }

    // Éviction si nécessaire
    while (this.needsEviction(size)) {
      this.evictOne();
    }

    // Créer l'entrée
    const entry: CacheEntry = {
      key: {
        featureId: key,
        cutType: cutType,
        hash: key,
        timestamp: Date.now()
      },
      geometry: geometry.clone(), // Cloner pour éviter les modifications externes
      hitCount: 0,
      lastAccessed: Date.now(),
      size: size,
      metadata: metadata
    };

    // Stocker
    this.cache.set(key, entry);
    this.stats.currentSize += size;
    this.stats.entryCount++;
    this.updateAverageSize();

    // Persister si configuré
    if (this.config.persistToStorage) {
      this.saveToStorage(key, entry);
    }

    return true;
  }

  /**
   * Supprime une entrée du cache
   */
  evict(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.stats.currentSize -= entry.size;
    this.stats.entryCount--;
    this.stats.evictions++;
    this.updateAverageSize();

    // Disposer de la géométrie
    entry.geometry.dispose();

    // Supprimer du storage si nécessaire
    if (this.config.persistToStorage) {
      this.removeFromStorage(key);
    }

    return true;
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    // Disposer de toutes les géométries
    for (const entry of this.cache.values()) {
      entry.geometry.dispose();
    }

    this.cache.clear();
    this.stats.currentSize = 0;
    this.stats.entryCount = 0;

    if (this.config.persistToStorage) {
      this.clearStorage();
    }
  }

  /**
   * Vérifie si une éviction est nécessaire
   */
  private needsEviction(newSize: number): boolean {
    return (
      this.stats.currentSize + newSize > this.config.maxSize ||
      this.stats.entryCount >= this.config.maxEntries
    );
  }

  /**
   * Évince une entrée selon la politique configurée
   */
  private evictOne(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'LRU': {
        // Évince l'entrée utilisée le moins récemment
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.lastAccessed < oldestTime) {
            oldestTime = entry.lastAccessed;
            keyToEvict = key;
          }
        }
        break;
      }

      case 'LFU': {
        // Évince l'entrée utilisée le moins fréquemment
        let minHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hitCount < minHits) {
            minHits = entry.hitCount;
            keyToEvict = key;
          }
        }
        break;
      }

      case 'FIFO': {
        // Évince la première entrée (la plus ancienne)
        keyToEvict = this.cache.keys().next().value || null;
        break;
      }
    }

    if (keyToEvict) {
      this.evict(keyToEvict);
    }
  }

  /**
   * Estime la taille d'une géométrie en octets
   */
  private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;

    // Compter les attributs
    for (const name in geometry.attributes) {
      const attribute = geometry.attributes[name];
      if (attribute instanceof THREE.BufferAttribute) {
        size += attribute.array.byteLength;
      }
    }

    // Compter l'index si présent
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }

    return size;
  }

  /**
   * Génère un hash pour un objet
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, this.jsonReplacer);
    
    // Simple hash function (FNV-1a)
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    
    return hash.toString(36);
  }

  /**
   * Replacer pour JSON.stringify qui gère les types spéciaux
   */
  private jsonReplacer(key: string, value: any): any {
    // Gérer les nombres flottants avec précision limitée
    if (typeof value === 'number') {
      return Math.round(value * 1000) / 1000;
    }
    
    // Gérer les tableaux de points
    if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
      return value.map(p => p.map((v: number) => Math.round(v * 100) / 100));
    }
    
    return value;
  }

  /**
   * Met à jour le taux de succès
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Met à jour la taille moyenne
   */
  private updateAverageSize(): void {
    this.stats.averageEntrySize = this.stats.entryCount > 0 
      ? this.stats.currentSize / this.stats.entryCount 
      : 0;
  }

  /**
   * Démarre le timer de nettoyage
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Nettoyer toutes les minutes
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    if (this.config.ttl <= 0) return;

    const now = Date.now();
    const keysToEvict: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.key.timestamp > this.config.ttl) {
        keysToEvict.push(key);
      }
    }

    for (const key of keysToEvict) {
      this.evict(key);
    }

    if (keysToEvict.length > 0) {
      console.log(`GeometryCache: Cleaned up ${keysToEvict.length} expired entries`);
    }
  }

  /**
   * Charge le cache depuis le storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('geom-cache-'));
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data);
            // Reconstruire la géométrie depuis les données sérialisées
            // Note: Ceci est simplifié, une vraie implémentation devrait sérialiser/désérialiser correctement
            console.log(`Loaded cache entry from storage: ${key}`);
          }
        } catch (e) {
          console.error(`Failed to load cache entry: ${key}`, e);
        }
      }
    } catch (e) {
      console.error('Failed to load cache from storage', e);
    }
  }

  /**
   * Sauvegarde une entrée dans le storage
   */
  private saveToStorage(key: string, entry: CacheEntry): void {
    if (typeof localStorage === 'undefined') return;

    try {
      // Note: Sérialisation simplifiée, une vraie implémentation devrait gérer BufferGeometry
      const data = {
        key: entry.key,
        metadata: entry.metadata,
        size: entry.size
      };
      
      localStorage.setItem(`geom-cache-${key}`, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save cache entry to storage', e);
    }
  }

  /**
   * Supprime une entrée du storage
   */
  private removeFromStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.removeItem(`geom-cache-${key}`);
    } catch (e) {
      console.error('Failed to remove cache entry from storage', e);
    }
  }

  /**
   * Vide le storage
   */
  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('geom-cache-'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Failed to clear cache storage', e);
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Génère un rapport de performance
   */
  generateReport(): string {
    const stats = this.getStats();
    const sizeMB = (stats.currentSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (stats.maxSize / (1024 * 1024)).toFixed(2);
    const avgSizeKB = (stats.averageEntrySize / 1024).toFixed(2);
    const savedTime = (stats.totalSaved / 1000).toFixed(2);

    return `
=== Geometry Cache Report ===
Status: ${this.config.enabled ? 'Enabled' : 'Disabled'}
Policy: ${this.config.evictionPolicy}
TTL: ${this.config.ttl / 1000}s

=== Performance ===
Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%
Hits: ${stats.hits}
Misses: ${stats.misses}
Evictions: ${stats.evictions}
Time Saved: ${savedTime}s

=== Storage ===
Entries: ${stats.entryCount} / ${this.config.maxEntries}
Size: ${sizeMB} MB / ${maxSizeMB} MB
Average Entry: ${avgSizeKB} KB

=== Top Entries ===
${this.getTopEntries(5).map(e => 
  `- ${e.key.hash.substring(0, 20)}... (${e.hitCount} hits, ${(e.size / 1024).toFixed(1)} KB)`
).join('\n')}
    `.trim();
  }

  /**
   * Obtient les entrées les plus utilisées
   */
  private getTopEntries(count: number): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, count);
  }

  /**
   * Configure le cache
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enabled === false) {
      this.clear();
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
    } else if (config.enabled === true && !this.cleanupTimer) {
      this.startCleanupTimer();
    }
  }

  /**
   * Précharge des géométries dans le cache
   */
  async preload(features: Feature[], generateGeometry: (f: Feature) => THREE.BufferGeometry): Promise<void> {
    if (!this.config.enabled) return;

    console.log(`Preloading ${features.length} geometries into cache...`);
    
    for (const feature of features) {
      const key = this.generateKey(feature, CutType.STRAIGHT_CUT);
      
      if (!this.cache.has(key)) {
        try {
          const geometry = generateGeometry(feature);
          this.set(key, geometry, CutType.STRAIGHT_CUT);
        } catch (e) {
          console.error(`Failed to preload geometry for feature ${feature.id}`, e);
        }
      }
    }
    
    console.log(`Preloading complete. Cache now contains ${this.stats.entryCount} entries.`);
  }
}

// Export singleton
export const geometryCache = GeometryCache.getInstance();