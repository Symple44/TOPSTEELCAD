/**
 * Service de stockage local pour les profils personnalisés
 * Gère LocalStorage et IndexedDB pour la persistance des profils créés par l'utilisateur
 */

import {
  CustomProfile,
  CustomProfileLibrary,
  CustomProfileExportFormat,
  ICustomProfileStorage,
  CUSTOM_PROFILES_STORAGE_KEY
} from '../../3DLibrary/types/custom-profile.types';

// ============================================================================
// LOCALSTORAGE IMPLEMENTATION
// ============================================================================

/**
 * Implémentation LocalStorage pour les profils personnalisés
 * Adapté pour les petites bibliothèques (< 5 MB)
 */
export class LocalStorageProfileStorage implements ICustomProfileStorage {
  private storageKey: string;

  constructor(storageKey: string = CUSTOM_PROFILES_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  /**
   * Charge tous les profils depuis LocalStorage
   */
  private loadAllProfiles(): CustomProfile[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading profiles from LocalStorage:', error);
      return [];
    }
  }

  /**
   * Sauvegarde tous les profils dans LocalStorage
   */
  private saveAllProfiles(profiles: CustomProfile[]): void {
    try {
      const data = JSON.stringify(profiles);
      localStorage.setItem(this.storageKey, data);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('LocalStorage quota exceeded. Consider using IndexedDB or removing old profiles.');
      }
      throw error;
    }
  }

  /**
   * Sauvegarde un profil
   */
  async save(profile: CustomProfile): Promise<void> {
    const profiles = this.loadAllProfiles();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);

    // Mettre à jour la date de modification
    const updatedProfile: CustomProfile = {
      ...profile,
      metadata: {
        ...profile.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    if (existingIndex >= 0) {
      // Mise à jour
      profiles[existingIndex] = updatedProfile;
    } else {
      // Nouveau profil
      profiles.push(updatedProfile);
    }

    this.saveAllProfiles(profiles);
  }

  /**
   * Charge un profil par son ID
   */
  async load(id: string): Promise<CustomProfile | null> {
    const profiles = this.loadAllProfiles();
    const profile = profiles.find(p => p.id === id);
    return profile || null;
  }

  /**
   * Liste tous les profils
   */
  async list(): Promise<CustomProfile[]> {
    return this.loadAllProfiles();
  }

  /**
   * Supprime un profil
   */
  async delete(id: string): Promise<void> {
    const profiles = this.loadAllProfiles();
    const filteredProfiles = profiles.filter(p => p.id !== id);
    this.saveAllProfiles(filteredProfiles);
  }

  /**
   * Exporte un profil en format JSON
   */
  async export(id: string): Promise<CustomProfileExportFormat> {
    const profile = await this.load(id);
    if (!profile) {
      throw new Error(`Profile with ID ${id} not found`);
    }

    return {
      formatVersion: '1.0',
      exportedAt: new Date().toISOString(),
      type: 'single',
      profile
    };
  }

  /**
   * Importe un profil depuis JSON
   */
  async import(data: CustomProfileExportFormat): Promise<CustomProfile> {
    if (data.type !== 'single' || !data.profile) {
      throw new Error('Invalid export format: expected single profile');
    }

    // Générer un nouvel ID pour éviter les conflits
    const importedProfile: CustomProfile = {
      ...data.profile,
      id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        ...data.profile.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    await this.save(importedProfile);
    return importedProfile;
  }

  /**
   * Recherche des profils
   */
  async search(query: string, filters?: any): Promise<CustomProfile[]> {
    const profiles = this.loadAllProfiles();
    const lowerQuery = query.toLowerCase();

    return profiles.filter(profile => {
      // Recherche textuelle
      const matchesQuery = !query ||
        profile.name.toLowerCase().includes(lowerQuery) ||
        profile.designation.toLowerCase().includes(lowerQuery) ||
        profile.description?.toLowerCase().includes(lowerQuery) ||
        profile.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

      if (!matchesQuery) return false;

      // Filtres additionnels
      if (filters?.category && profile.metadata.category !== filters.category) {
        return false;
      }

      if (filters?.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((tag: string) =>
          profile.metadata.tags?.includes(tag)
        );
        if (!hasTag) return false;
      }

      if (filters?.minArea && profile.properties.area < filters.minArea) {
        return false;
      }

      if (filters?.maxArea && profile.properties.area > filters.maxArea) {
        return false;
      }

      return true;
    });
  }

  /**
   * Efface tous les profils (avec confirmation)
   */
  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Obtient la taille utilisée (approximation)
   */
  getStorageSize(): number {
    const data = localStorage.getItem(this.storageKey);
    return data ? new Blob([data]).size : 0;
  }
}

// ============================================================================
// INDEXEDDB IMPLEMENTATION (pour grandes bibliothèques)
// ============================================================================

const DB_NAME = 'TopSteelCAD_CustomProfiles';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';

/**
 * Implémentation IndexedDB pour les profils personnalisés
 * Adapté pour les grandes bibliothèques (> 5 MB)
 */
export class IndexedDBProfileStorage implements ICustomProfileStorage {
  private dbName: string;
  private dbVersion: number;

  constructor(dbName: string = DB_NAME, dbVersion: number = DB_VERSION) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  /**
   * Ouvre la base de données IndexedDB
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer l'object store si nécessaire
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Index pour recherche rapide
          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('designation', 'designation', { unique: false });
          objectStore.createIndex('category', 'metadata.category', { unique: false });
          objectStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Sauvegarde un profil
   */
  async save(profile: CustomProfile): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Mettre à jour la date de modification
      const updatedProfile: CustomProfile = {
        ...profile,
        metadata: {
          ...profile.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      const request = store.put(updatedProfile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Charge un profil par son ID
   */
  async load(id: string): Promise<CustomProfile | null> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Liste tous les profils
   */
  async list(): Promise<CustomProfile[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Supprime un profil
   */
  async delete(id: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Exporte un profil en format JSON
   */
  async export(id: string): Promise<CustomProfileExportFormat> {
    const profile = await this.load(id);
    if (!profile) {
      throw new Error(`Profile with ID ${id} not found`);
    }

    return {
      formatVersion: '1.0',
      exportedAt: new Date().toISOString(),
      type: 'single',
      profile
    };
  }

  /**
   * Importe un profil depuis JSON
   */
  async import(data: CustomProfileExportFormat): Promise<CustomProfile> {
    if (data.type !== 'single' || !data.profile) {
      throw new Error('Invalid export format: expected single profile');
    }

    // Générer un nouvel ID pour éviter les conflits
    const importedProfile: CustomProfile = {
      ...data.profile,
      id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        ...data.profile.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    await this.save(importedProfile);
    return importedProfile;
  }

  /**
   * Recherche des profils
   */
  async search(query: string, filters?: any): Promise<CustomProfile[]> {
    const profiles = await this.list();
    const lowerQuery = query.toLowerCase();

    return profiles.filter(profile => {
      // Recherche textuelle
      const matchesQuery = !query ||
        profile.name.toLowerCase().includes(lowerQuery) ||
        profile.designation.toLowerCase().includes(lowerQuery) ||
        profile.description?.toLowerCase().includes(lowerQuery) ||
        profile.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

      if (!matchesQuery) return false;

      // Filtres additionnels
      if (filters?.category && profile.metadata.category !== filters.category) {
        return false;
      }

      if (filters?.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((tag: string) =>
          profile.metadata.tags?.includes(tag)
        );
        if (!hasTag) return false;
      }

      if (filters?.minArea && profile.properties.area < filters.minArea) {
        return false;
      }

      if (filters?.maxArea && profile.properties.area > filters.maxArea) {
        return false;
      }

      return true;
    });
  }

  /**
   * Efface tous les profils
   */
  async clear(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Compte le nombre de profils
   */
  async count(): Promise<number> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }
}

// ============================================================================
// STORAGE MANAGER (AUTO-SELECTION)
// ============================================================================

/**
 * Gestionnaire de stockage qui choisit automatiquement LocalStorage ou IndexedDB
 * selon la taille de la bibliothèque
 */
export class AdaptiveProfileStorage implements ICustomProfileStorage {
  private localStorageBackend: LocalStorageProfileStorage;
  private indexedDBBackend: IndexedDBProfileStorage;
  private threshold: number;

  constructor(sizeThresholdBytes: number = 5 * 1024 * 1024) { // 5 MB par défaut
    this.localStorageBackend = new LocalStorageProfileStorage();
    this.indexedDBBackend = new IndexedDBProfileStorage();
    this.threshold = sizeThresholdBytes;
  }

  /**
   * Sélectionne le backend approprié
   */
  private getBackend(): ICustomProfileStorage {
    const size = this.localStorageBackend.getStorageSize();
    return size > this.threshold ? this.indexedDBBackend : this.localStorageBackend;
  }

  async save(profile: CustomProfile): Promise<void> {
    return this.getBackend().save(profile);
  }

  async load(id: string): Promise<CustomProfile | null> {
    // Chercher dans les deux backends
    let profile = await this.localStorageBackend.load(id);
    if (!profile) {
      profile = await this.indexedDBBackend.load(id);
    }
    return profile;
  }

  async list(): Promise<CustomProfile[]> {
    // Combiner les deux backends
    const localProfiles = await this.localStorageBackend.list();
    const indexedProfiles = await this.indexedDBBackend.list();

    // Fusionner et dédupliquer
    const allProfiles = [...localProfiles, ...indexedProfiles];
    const uniqueProfiles = new Map<string, CustomProfile>();

    for (const profile of allProfiles) {
      uniqueProfiles.set(profile.id, profile);
    }

    return Array.from(uniqueProfiles.values());
  }

  async delete(id: string): Promise<void> {
    // Supprimer des deux backends
    await this.localStorageBackend.delete(id);
    await this.indexedDBBackend.delete(id);
  }

  async export(id: string): Promise<CustomProfileExportFormat> {
    return this.getBackend().export(id);
  }

  async import(data: CustomProfileExportFormat): Promise<CustomProfile> {
    return this.getBackend().import(data);
  }

  async search(query: string, filters?: any): Promise<CustomProfile[]> {
    // Chercher dans les deux backends
    const localResults = await this.localStorageBackend.search(query, filters);
    const indexedResults = await this.indexedDBBackend.search(query, filters);

    // Fusionner et dédupliquer
    const allResults = [...localResults, ...indexedResults];
    const uniqueResults = new Map<string, CustomProfile>();

    for (const profile of allResults) {
      uniqueResults.set(profile.id, profile);
    }

    return Array.from(uniqueResults.values());
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Instance singleton du service de stockage
 */
let storageInstance: ICustomProfileStorage | null = null;

/**
 * Obtient l'instance du service de stockage
 */
export function getCustomProfileStorage(): ICustomProfileStorage {
  if (!storageInstance) {
    storageInstance = new AdaptiveProfileStorage();
  }
  return storageInstance;
}

/**
 * Définit une instance personnalisée du service de stockage
 */
export function setCustomProfileStorage(storage: ICustomProfileStorage): void {
  storageInstance = storage;
}
