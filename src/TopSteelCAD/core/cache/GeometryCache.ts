/**
 * GeometryCache - Cache LRU pour optimiser les géométries répétitives
 * Réduit la charge mémoire et améliore les performances
 */

import * as THREE from 'three';
import { Logger } from '../../utils/Logger';

/**
 * Clé de cache pour identifier une géométrie unique
 */
export interface CacheKey {
  type: string;
  dimensions: string;
  features?: string;
}

/**
 * Entrée du cache avec métadonnées
 */
interface CacheEntry {
  geometry: THREE.BufferGeometry;
  lastAccessed: number;
  hitCount: number;
  size: number;
}

/**
 * Configuration du cache
 */
export interface GeometryCacheConfig {
  maxSize: number;        // Taille max en MB
  maxEntries: number;     // Nombre max d'entrées
  ttl: number;           // Time to live en ms
  cleanupInterval: number; // Intervalle de nettoyage en ms
}

/**
 * Cache LRU pour géométries Three.js
 */
export class GeometryCache {
  private static instance: GeometryCache;
  private cache: Map<string, CacheEntry> = new Map();
  private config: GeometryCacheConfig;
  private currentSize: number = 0;
  private cleanupTimer?: NodeJS.Timeout;
  private statistics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  };
  
  private constructor(config?: Partial<GeometryCacheConfig>) {
    this.config = {
      maxSize: 100,        // 100 MB par défaut
      maxEntries: 1000,    // 1000 entrées max
      ttl: 3600000,        // 1 heure
      cleanupInterval: 300000, // 5 minutes
      ...config
    };
    
    this.startCleanupTimer();
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(config?: Partial<GeometryCacheConfig>): GeometryCache {
    if (!GeometryCache.instance) {
      GeometryCache.instance = new GeometryCache(config);
    }
    return GeometryCache.instance;
  }
  
  /**
   * Génère une clé de cache à partir des paramètres
   */
  generateKey(key: CacheKey): string {
    const parts = [
      key.type,
      key.dimensions,
      key.features || ''
    ];
    
    return parts.join('|');
  }
  
  /**
   * Récupère une géométrie du cache
   */
  get(key: CacheKey): THREE.BufferGeometry | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.statistics.misses++;
      return null;
    }
    
    // Vérifier TTL
    const now = Date.now();
    if (now - entry.lastAccessed > this.config.ttl) {
      this.evict(cacheKey);
      this.statistics.misses++;
      return null;
    }
    
    // Mettre à jour les métadonnées
    entry.lastAccessed = now;
    entry.hitCount++;
    this.statistics.hits++;
    
    // Réorganiser pour LRU
    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, entry);
    
    // Cloner la géométrie pour éviter les modifications
    return entry.geometry.clone();
  }
  
  /**
   * Ajoute une géométrie au cache
   */
  set(key: CacheKey, geometry: THREE.BufferGeometry): void {
    const cacheKey = this.generateKey(key);
    
    // Calculer la taille approximative
    const size = this.calculateGeometrySize(geometry);
    
    // Vérifier si on doit faire de la place
    this.ensureCapacity(size);
    
    // Créer l'entrée
    const entry: CacheEntry = {
      geometry: geometry.clone(),
      lastAccessed: Date.now(),
      hitCount: 0,
      size
    };
    
    // Supprimer l'ancienne entrée si elle existe
    if (this.cache.has(cacheKey)) {
      const oldEntry = this.cache.get(cacheKey)!;
      this.currentSize -= oldEntry.size;
      oldEntry.geometry.dispose();
    }
    
    // Ajouter la nouvelle entrée
    this.cache.set(cacheKey, entry);
    this.currentSize += size;
    this.statistics.totalSize = this.currentSize;
  }
  
  /**
   * Supprime une entrée du cache
   */
  evict(cacheKey: string): void {
    const entry = this.cache.get(cacheKey);
    if (!entry) return;
    
    this.currentSize -= entry.size;
    entry.geometry.dispose();
    this.cache.delete(cacheKey);
    this.statistics.evictions++;
  }
  
  /**
   * Vide complètement le cache
   */
  clear(): void {
    for (const [key, entry] of this.cache) {
      entry.geometry.dispose();
    }
    
    this.cache.clear();
    this.currentSize = 0;
    
    Logger.info('GeometryCache cleared', {
      previousSize: this.statistics.totalSize,
      evictions: this.cache.size
    });
  }
  
  /**
   * Assure qu'il y a assez de capacité
   */
  private ensureCapacity(requiredSize: number): void {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    
    // Éviction par taille
    while (this.currentSize + requiredSize > maxSizeBytes && this.cache.size > 0) {
      const [oldestKey] = this.cache.keys();
      this.evict(oldestKey);
    }
    
    // Éviction par nombre d'entrées
    while (this.cache.size >= this.config.maxEntries) {
      const [oldestKey] = this.cache.keys();
      this.evict(oldestKey);
    }
  }
  
  /**
   * Calcule la taille approximative d'une géométrie
   */
  private calculateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;
    
    // Parcourir tous les attributs
    for (const name in geometry.attributes) {
      const attribute = geometry.attributes[name];
      if (attribute instanceof THREE.BufferAttribute) {
        // Taille = nombre d'éléments * taille par élément * itemSize
        size += attribute.array.length * attribute.array.BYTES_PER_ELEMENT;
      }
    }
    
    // Ajouter l'index si présent
    if (geometry.index) {
      size += geometry.index.array.length * geometry.index.array.BYTES_PER_ELEMENT;
    }
    
    return size;
  }
  
  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToEvict: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.lastAccessed > this.config.ttl) {
        keysToEvict.push(key);
      }
    }
    
    for (const key of keysToEvict) {
      this.evict(key);
    }
    
    if (keysToEvict.length > 0) {
      Logger.debug(`GeometryCache cleanup: evicted ${keysToEvict.length} expired entries`);
    }
  }
  
  /**
   * Démarre le timer de nettoyage
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Arrête le timer de nettoyage
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
  
  /**
   * Obtient les statistiques du cache
   */
  getStatistics(): {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    entries: number;
    sizeInMB: number;
  } {
    const total = this.statistics.hits + this.statistics.misses;
    const hitRate = total > 0 ? this.statistics.hits / total : 0;
    
    return {
      hits: this.statistics.hits,
      misses: this.statistics.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.statistics.evictions,
      entries: this.cache.size,
      sizeInMB: Math.round(this.currentSize / 1024 / 1024 * 100) / 100
    };
  }
  
  /**
   * Précharge des géométries communes
   */
  async preload(geometries: Array<{ key: CacheKey; geometry: THREE.BufferGeometry }>): Promise<void> {
    Logger.info(`Preloading ${geometries.length} geometries into cache`);
    
    for (const { key, geometry } of geometries) {
      this.set(key, geometry);
    }
    
    Logger.info('Preloading complete', this.getStatistics());
  }
  
  /**
   * Optimise le cache en supprimant les entrées peu utilisées
   */
  optimize(): void {
    const entries = Array.from(this.cache.entries());
    
    // Trier par score (hitCount / age)
    entries.sort(([keyA, entryA], [keyB, entryB]) => {
      const now = Date.now();
      const scoreA = entryA.hitCount / (now - entryA.lastAccessed + 1);
      const scoreB = entryB.hitCount / (now - entryB.lastAccessed + 1);
      return scoreA - scoreB;
    });
    
    // Supprimer le bottom 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.evict(entries[i][0]);
    }
    
    Logger.info(`Cache optimized: removed ${toRemove} low-usage entries`);
  }
  
  /**
   * Sauvegarde les statistiques pour analyse
   */
  exportStatistics(): string {
    const stats = this.getStatistics();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hitCount: entry.hitCount,
      size: entry.size,
      age: Date.now() - entry.lastAccessed
    }));
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      statistics: stats,
      entries: entries.slice(0, 20) // Top 20 seulement
    }, null, 2);
  }
}

// Instance globale
export const geometryCache = GeometryCache.getInstance();

/**
 * Décorateur pour cache automatique
 */
export function CacheGeometry(keyGenerator: (args: any[]) => CacheKey) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const cache = GeometryCache.getInstance();
      const key = keyGenerator(args);
      
      // Vérifier le cache
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }
      
      // Générer et cacher
      const result = originalMethod.apply(this, args);
      if (result instanceof THREE.BufferGeometry) {
        cache.set(key, result);
      }
      
      return result;
    };
    
    return descriptor;
  };
}