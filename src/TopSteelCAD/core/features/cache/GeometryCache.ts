/**
 * GeometryCache - Cache pour les géométries Three.js
 * Optimise les performances en réutilisant les géométries identiques
 */

import * as THREE from 'three';
// import { createHash } from 'crypto';

/**
 * Entrée du cache
 */
interface CacheEntry {
  geometry: THREE.BufferGeometry;
  lastAccessed: number;
  accessCount: number;
  size: number;
}

/**
 * Options de configuration du cache
 */
export interface GeometryCacheOptions {
  maxSize: number;        // Taille maximale en octets
  maxEntries: number;     // Nombre maximum d'entrées
  ttl: number;           // Time to live en millisecondes
  cleanupInterval: number; // Intervalle de nettoyage en ms
}

/**
 * Cache LRU (Least Recently Used) pour les géométries
 */
export class GeometryCache {
  private cache: Map<string, CacheEntry>;
  private options: GeometryCacheOptions;
  private currentSize: number;
  private cleanupTimer: NodeJS.Timeout | null;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };
  
  constructor(options?: Partial<GeometryCacheOptions>) {
    this.cache = new Map();
    this.options = {
      maxSize: 100 * 1024 * 1024,      // 100MB par défaut
      maxEntries: 1000,                 // 1000 entrées max
      ttl: 5 * 60 * 1000,               // 5 minutes
      cleanupInterval: 60 * 1000,       // Nettoyage toutes les minutes
      ...options
    };
    this.currentSize = 0;
    this.cleanupTimer = null;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    
    this.startCleanupTimer();
  }
  
  /**
   * Génère une clé unique pour une géométrie
   */
  generateKey(params: {
    type: string;
    dimensions?: any;
    parameters?: any;
  }): string {
    const data = JSON.stringify({
      type: params.type,
      dimensions: params.dimensions,
      parameters: params.parameters
    });
    
    // Utiliser un hash simple pour la clé
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${params.type}_${hash.toString(36)}`;
  }
  
  /**
   * Obtient une géométrie du cache ou la crée
   */
  getOrCreate(
    key: string,
    factory: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    // Vérifier si la géométrie existe dans le cache
    const entry = this.cache.get(key);
    
    if (entry) {
      // Hit - mettre à jour les métadonnées
      this.stats.hits++;
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      
      // Cloner la géométrie pour éviter les modifications
      return entry.geometry.clone();
    }
    
    // Miss - créer une nouvelle géométrie
    this.stats.misses++;
    const geometry = factory();
    
    // Calculer la taille approximative
    const size = this.calculateGeometrySize(geometry);
    
    // Vérifier si on doit faire de la place
    this.ensureCapacity(size);
    
    // Ajouter au cache
    const newEntry: CacheEntry = {
      geometry: geometry.clone(), // Stocker une copie
      lastAccessed: Date.now(),
      accessCount: 1,
      size
    };
    
    this.cache.set(key, newEntry);
    this.currentSize += size;
    
    return geometry;
  }
  
  /**
   * Obtient une géométrie du cache sans la créer
   */
  get(key: string): THREE.BufferGeometry | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.stats.hits++;
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      return entry.geometry.clone();
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * Ajoute une géométrie au cache
   */
  set(key: string, geometry: THREE.BufferGeometry): void {
    const size = this.calculateGeometrySize(geometry);
    
    // Vérifier si on doit faire de la place
    this.ensureCapacity(size);
    
    // Si l'entrée existe déjà, la supprimer d'abord
    if (this.cache.has(key)) {
      this.remove(key);
    }
    
    // Ajouter la nouvelle entrée
    const entry: CacheEntry = {
      geometry: geometry.clone(),
      lastAccessed: Date.now(),
      accessCount: 1,
      size
    };
    
    this.cache.set(key, entry);
    this.currentSize += size;
  }
  
  /**
   * Supprime une entrée du cache
   */
  remove(key: string): void {
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.geometry.dispose();
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }
  
  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.forEach(entry => {
      entry.geometry.dispose();
    });
    this.cache.clear();
    this.currentSize = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  /**
   * Calcule la taille approximative d'une géométrie
   */
  private calculateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;
    
    // Calculer la taille des attributs
    for (const name in geometry.attributes) {
      const attribute = geometry.attributes[name];
      if (attribute instanceof THREE.BufferAttribute) {
        size += attribute.array.byteLength;
      }
    }
    
    // Ajouter la taille de l'index si présent
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }
    
    return size;
  }
  
  /**
   * S'assure qu'il y a assez de place dans le cache
   */
  private ensureCapacity(requiredSize: number): void {
    // Si la taille requise dépasse la taille max, ne pas mettre en cache
    if (requiredSize > this.options.maxSize) {
      return;
    }
    
    // Éviction LRU si nécessaire
    while (
      (this.currentSize + requiredSize > this.options.maxSize ||
       this.cache.size >= this.options.maxEntries) &&
      this.cache.size > 0
    ) {
      // Trouver l'entrée la moins récemment utilisée
      let lruKey: string | null = null;
      let lruTime = Infinity;
      
      this.cache.forEach((entry, key) => {
        if (entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruKey = key;
        }
      });
      
      if (lruKey) {
        this.remove(lruKey);
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }
  
  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.lastAccessed > this.options.ttl) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      this.remove(key);
      this.stats.evictions++;
    });
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
    }, this.options.cleanupInterval);
  }
  
  /**
   * Arrête le timer de nettoyage
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Obtient les statistiques du cache
   */
  getStatistics(): {
    size: number;
    entries: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      size: this.currentSize,
      entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate
    };
  }
  
  /**
   * Optimise le cache en supprimant les entrées peu utilisées
   */
  optimize(): void {
    const avgAccessCount = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0) / this.cache.size;
    
    const keysToRemove: string[] = [];
    
    this.cache.forEach((entry, key) => {
      // Supprimer les entrées avec un accès inférieur à 25% de la moyenne
      if (entry.accessCount < avgAccessCount * 0.25) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      this.remove(key);
    });
  }
  
  /**
   * Précharge des géométries communes
   */
  preload(items: Array<{
    key: string;
    factory: () => THREE.BufferGeometry;
  }>): void {
    items.forEach(item => {
      if (!this.cache.has(item.key)) {
        this.getOrCreate(item.key, item.factory);
      }
    });
  }
  
  /**
   * Dispose le cache et libère toutes les ressources
   */
  dispose(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

// Instance singleton globale
let globalCache: GeometryCache | null = null;

/**
 * Obtient l'instance globale du cache
 */
export function getGlobalGeometryCache(): GeometryCache {
  if (!globalCache) {
    globalCache = new GeometryCache();
  }
  return globalCache;
}

/**
 * Réinitialise le cache global
 */
export function resetGlobalGeometryCache(): void {
  if (globalCache) {
    globalCache.dispose();
    globalCache = null;
  }
}