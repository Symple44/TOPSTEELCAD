/**
 * Système de cache LRU (Least Recently Used) pour les profilés
 * Optimise les performances des recherches répétées
 */

export class ProfileCache {
  private cache: Map<string, any>;
  private timestamps: Map<string, number>;
  private accessCount: Map<string, number>;
  private maxSize: number;
  private ttl: number; // Time to live en millisecondes
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000, ttl: number = 3600000) { // 1 heure par défaut
    this.cache = new Map();
    this.timestamps = new Map();
    this.accessCount = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Récupère une valeur du cache
   */
  public get<T>(key: string): T | undefined {
    const timestamp = this.timestamps.get(key);
    
    // Vérifier l'expiration
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.remove(key);
      this.misses++;
      return undefined;
    }

    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Mettre à jour l'ordre LRU
      this.cache.delete(key);
      this.cache.set(key, value);
      
      // Incrémenter le compteur d'accès
      const count = this.accessCount.get(key) || 0;
      this.accessCount.set(key, count + 1);
      
      this.hits++;
      return value;
    }

    this.misses++;
    return undefined;
  }

  /**
   * Ajoute ou met à jour une valeur dans le cache
   */
  public set<T>(key: string, value: T): void {
    // Si la clé existe déjà, la supprimer pour la réinsérer à la fin
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Si le cache est plein, supprimer l'élément le moins récemment utilisé
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.remove(firstKey);
      }
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    this.accessCount.set(key, 0);
  }

  /**
   * Récupère une valeur ou la calcule si elle n'est pas en cache
   */
  public getOrCompute<T>(key: string, compute: () => T): T {
    let value = this.get<T>(key);
    
    if (value === undefined) {
      value = compute();
      if (value !== undefined) {
        this.set(key, value);
      }
    }

    return value as T;
  }

  /**
   * Récupère une valeur ou la calcule de manière asynchrone
   */
  public async getOrComputeAsync<T>(
    key: string, 
    compute: () => Promise<T>
  ): Promise<T> {
    let value = this.get<T>(key);
    
    if (value === undefined) {
      value = await compute();
      if (value !== undefined) {
        this.set(key, value);
      }
    }

    return value as T;
  }

  /**
   * Invalide une ou plusieurs entrées du cache
   */
  public invalidate(pattern?: string): void {
    if (!pattern) {
      // Invalider tout le cache
      this.cache.clear();
      this.timestamps.clear();
      this.accessCount.clear();
    } else {
      // Invalider les clés correspondant au pattern
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (key.includes(pattern) || this.matchesWildcard(key, pattern)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.remove(key);
      }
    }
  }

  /**
   * Supprime une entrée spécifique du cache
   */
  public remove(key: string): boolean {
    const existed = this.cache.has(key);
    
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.accessCount.delete(key);
    
    return existed;
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  public has(key: string): boolean {
    const timestamp = this.timestamps.get(key);
    
    // Vérifier l'expiration
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.remove(key);
      return false;
    }

    return this.cache.has(key);
  }

  /**
   * Vide complètement le cache
   */
  public clear(): void {
    this.cache.clear();
    this.timestamps.clear();
    this.accessCount.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Obtient la taille actuelle du cache
   */
  public getSize(): number {
    return this.cache.size;
  }

  /**
   * Obtient la taille maximale du cache
   */
  public getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Modifie la taille maximale du cache
   */
  public setMaxSize(newSize: number): void {
    this.maxSize = newSize;
    
    // Si le nouveau max est plus petit, purger les éléments excédentaires
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.remove(firstKey);
      } else {
        break;
      }
    }
  }

  /**
   * Obtient le TTL actuel
   */
  public getTTL(): number {
    return this.ttl;
  }

  /**
   * Modifie le TTL
   */
  public setTTL(newTTL: number): void {
    this.ttl = newTTL;
  }

  /**
   * Obtient le taux de succès du cache
   */
  public getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  /**
   * Obtient les statistiques du cache
   */
  public getStatistics(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    avgAccessCount: number;
    ttl: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    mostAccessed: { key: string; count: number } | null;
  } {
    let totalAccess = 0;
    let mostAccessed: { key: string; count: number } | null = null;
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    for (const [key, count] of this.accessCount) {
      totalAccess += count;
      if (!mostAccessed || count > mostAccessed.count) {
        mostAccessed = { key, count };
      }
    }

    for (const timestamp of this.timestamps.values()) {
      if (oldestTimestamp === null || timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
      }
      if (newestTimestamp === null || timestamp > newestTimestamp) {
        newestTimestamp = timestamp;
      }
    }

    const avgAccessCount = this.cache.size === 0 
      ? 0 
      : totalAccess / this.cache.size;

    const now = Date.now();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      avgAccessCount,
      ttl: this.ttl,
      oldestEntry: oldestTimestamp ? now - oldestTimestamp : null,
      newestEntry: newestTimestamp ? now - newestTimestamp : null,
      mostAccessed
    };
  }

  /**
   * Purge les entrées expirées
   */
  public purgeExpired(): number {
    const now = Date.now();
    let purgedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, timestamp] of this.timestamps) {
      if (now - timestamp > this.ttl) {
        keysToDelete.push(key);
        purgedCount++;
      }
    }

    for (const key of keysToDelete) {
      this.remove(key);
    }

    return purgedCount;
  }

  /**
   * Précharge des valeurs dans le cache
   */
  public preload<T>(entries: Array<[string, T]>): void {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  /**
   * Obtient les clés les plus fréquemment accédées
   */
  public getMostFrequentKeys(limit: number = 10): Array<{ key: string; count: number }> {
    return Array.from(this.accessCount.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Vérifie si une clé correspond à un pattern avec wildcards
   */
  private matchesWildcard(key: string, pattern: string): boolean {
    // Convertir le pattern en regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Échapper les caractères spéciaux
      .replace(/\*/g, '.*')  // * devient .*
      .replace(/\?/g, '.');  // ? devient .
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Sérialise le cache pour sauvegarde
   */
  public serialize(): string {
    const data = {
      cache: Array.from(this.cache.entries()),
      timestamps: Array.from(this.timestamps.entries()),
      accessCount: Array.from(this.accessCount.entries()),
      hits: this.hits,
      misses: this.misses
    };
    return JSON.stringify(data);
  }

  /**
   * Désérialise et restaure le cache
   */
  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      this.cache = new Map(parsed.cache);
      this.timestamps = new Map(parsed.timestamps);
      this.accessCount = new Map(parsed.accessCount);
      this.hits = parsed.hits || 0;
      this.misses = parsed.misses || 0;

      // Purger les entrées expirées après restauration
      this.purgeExpired();
    } catch (error) {
      console.error('Erreur lors de la désérialisation du cache:', error);
      this.clear();
    }
  }
}