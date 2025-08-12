/**
 * Types pour le système de plugins TopSteelCAD
 */

import { ViewerAPI, ViewerPlugin, ToolExtension, PanelExtension, CommandExtension, ShortcutExtension, FeatureExtension } from '../modes/types';

// État du plugin
export type PluginState = 'unloaded' | 'loading' | 'loaded' | 'active' | 'inactive' | 'error';

// Informations sur l'état d'un plugin
export interface PluginStatus {
  id: string;
  state: PluginState;
  error?: string;
  loadTime?: number;
  lastActivated?: number;
  dependencies?: string[];
  dependents?: string[];
}

// Métadonnées étendues du plugin
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: string[];
  peerDependencies?: string[];
  minimumViewerVersion?: string;
  category?: 'tools' | 'analysis' | 'export' | 'visualization' | 'utility' | 'integration';
  icon?: string;
  screenshots?: string[];
}

// Configuration du plugin
export interface PluginConfig {
  enabled?: boolean;
  autoActivate?: boolean;
  settings?: Record<string, any>;
  permissions?: PluginPermission[];
}

// Permissions du plugin
export type PluginPermission = 
  | 'read-elements'
  | 'modify-elements'
  | 'delete-elements'
  | 'export-data'
  | 'import-data'
  | 'file-system'
  | 'network'
  | 'notifications'
  | 'camera-control'
  | 'scene-modification'
  | 'user-interface';

// Contexte fourni au plugin lors de l'initialisation
export interface PluginContext {
  api: ViewerAPI;
  config: PluginConfig;
  storage: PluginStorage;
  logger: PluginLogger;
  events: PluginEventEmitter;
}

// Interface de stockage pour le plugin
export interface PluginStorage {
  get<T = any>(key: string): Promise<T | undefined>;
  set<T = any>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// Interface de logging pour le plugin
export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Gestionnaire d'événements du plugin
export interface PluginEventEmitter {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
  once(event: string, handler: Function): void;
}

// Plugin étendu avec métadonnées et contexte
export interface EnhancedViewerPlugin extends ViewerPlugin {
  metadata: PluginMetadata;
  context?: PluginContext;
  
  // Hooks étendus du cycle de vie
  onPreInit?: (context: PluginContext) => Promise<void> | void;
  onPostInit?: (context: PluginContext) => Promise<void> | void;
  onPreMount?: (context: PluginContext) => Promise<void> | void;
  onPostMount?: (context: PluginContext) => Promise<void> | void;
  onPreUnmount?: (context: PluginContext) => Promise<void> | void;
  onPostUnmount?: (context: PluginContext) => Promise<void> | void;
  onActivate?: (context: PluginContext) => Promise<void> | void;
  onDeactivate?: (context: PluginContext) => Promise<void> | void;
  onConfigChange?: (newConfig: PluginConfig, oldConfig: PluginConfig) => Promise<void> | void;
  onError?: (error: Error, context: PluginContext) => Promise<void> | void;
  
  // Validation et configuration
  validateConfig?: (config: PluginConfig) => boolean | Promise<boolean>;
  getDefaultConfig?: () => PluginConfig;
  getConfigSchema?: () => any; // JSON Schema pour la validation
}

// Résultat du chargement d'un plugin
export interface PluginLoadResult {
  success: boolean;
  plugin?: EnhancedViewerPlugin;
  error?: string;
  warnings?: string[];
  loadTime: number;
}

// Options pour le gestionnaire de plugins
export interface PluginManagerOptions {
  autoLoad?: boolean;
  autoActivate?: boolean;
  enableHotReload?: boolean;
  maxLoadTime?: number;
  validatePermissions?: boolean;
  sandboxMode?: boolean;
  allowDynamicImports?: boolean;
  pluginDirectory?: string;
  configFile?: string;
}

// Événements du gestionnaire de plugins
export type PluginManagerEvent = 
  | 'plugin-loaded'
  | 'plugin-unloaded'
  | 'plugin-activated'
  | 'plugin-deactivated'
  | 'plugin-error'
  | 'plugin-config-changed'
  | 'plugins-scan-start'
  | 'plugins-scan-complete';

// Data des événements
export interface PluginEventData {
  pluginId: string;
  plugin?: EnhancedViewerPlugin;
  error?: string;
  config?: PluginConfig;
  oldConfig?: PluginConfig;
}

// Registre des plugins
export interface PluginRegistry {
  [pluginId: string]: {
    plugin: EnhancedViewerPlugin;
    status: PluginStatus;
    config: PluginConfig;
  };
}

// Filtre pour la recherche de plugins
export interface PluginFilter {
  category?: string;
  state?: PluginState;
  author?: string;
  keyword?: string;
  enabled?: boolean;
  hasPermission?: PluginPermission;
}

// Statistiques du gestionnaire de plugins
export interface PluginManagerStats {
  totalPlugins: number;
  loadedPlugins: number;
  activePlugins: number;
  errorPlugins: number;
  averageLoadTime: number;
  memoryUsage?: number;
}

// Interface du gestionnaire de plugins
export interface IPluginManager {
  // Gestion de base
  loadPlugin(plugin: EnhancedViewerPlugin): Promise<PluginLoadResult>;
  unloadPlugin(pluginId: string): Promise<boolean>;
  activatePlugin(pluginId: string): Promise<boolean>;
  deactivatePlugin(pluginId: string): Promise<boolean>;
  
  // Configuration
  getPluginConfig(pluginId: string): PluginConfig | undefined;
  setPluginConfig(pluginId: string, config: Partial<PluginConfig>): Promise<boolean>;
  
  // Requête
  getPlugin(pluginId: string): EnhancedViewerPlugin | undefined;
  getPluginStatus(pluginId: string): PluginStatus | undefined;
  getAllPlugins(): EnhancedViewerPlugin[];
  getActivePlugins(): EnhancedViewerPlugin[];
  findPlugins(filter: PluginFilter): EnhancedViewerPlugin[];
  
  // Utilitaires
  hasPlugin(pluginId: string): boolean;
  isPluginLoaded(pluginId: string): boolean;
  isPluginActive(pluginId: string): boolean;
  getPluginDependencies(pluginId: string): string[];
  validatePluginDependencies(pluginId: string): boolean;
  
  // Statistiques et monitoring
  getStats(): PluginManagerStats;
  getPluginPerformance(pluginId: string): any;
  
  // Événements
  on(event: PluginManagerEvent, handler: (data: PluginEventData) => void): void;
  off(event: PluginManagerEvent, handler: (data: PluginEventData) => void): void;
  
  // Nettoyage
  dispose(): Promise<void>;
}

export * from '../modes/types';