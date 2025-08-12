/**
 * Gestionnaire de plugins pour TopSteelCAD
 * Gère le cycle de vie complet des plugins : chargement, activation, configuration, etc.
 */

import { ViewerAPI } from '../modes/types';
import {
  EnhancedViewerPlugin,
  PluginStatus,
  PluginState,
  PluginConfig,
  PluginLoadResult,
  PluginManagerOptions,
  PluginManagerEvent,
  PluginEventData,
  PluginRegistry,
  PluginFilter,
  PluginManagerStats,
  PluginContext,
  PluginStorage,
  PluginLogger,
  PluginEventEmitter,
  IPluginManager
} from './types';

/**
 * Implémentation du stockage pour les plugins
 */
class PluginStorageImpl implements PluginStorage {
  private storage = new Map<string, any>();
  
  constructor(private pluginId: string) {}
  
  async get<T = any>(key: string): Promise<T | undefined> {
    return this.storage.get(`${this.pluginId}:${key}`);
  }
  
  async set<T = any>(key: string, value: T): Promise<void> {
    this.storage.set(`${this.pluginId}:${key}`, value);
  }
  
  async delete(key: string): Promise<void> {
    this.storage.delete(`${this.pluginId}:${key}`);
  }
  
  async clear(): Promise<void> {
    const prefix = `${this.pluginId}:`;
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        this.storage.delete(key);
      }
    }
  }
  
  async keys(): Promise<string[]> {
    const prefix = `${this.pluginId}:`;
    return Array.from(this.storage.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length));
  }
}

/**
 * Implémentation du logger pour les plugins
 */
class PluginLoggerImpl implements PluginLogger {
  constructor(private pluginId: string) {}
  
  private log(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [Plugin:${this.pluginId}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, ...args);
        break;
      case 'info':
        console.info(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'error':
        console.error(logMessage, ...args);
        break;
      default:
        console.log(logMessage, ...args);
    }
  }
  
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

/**
 * Implémentation du gestionnaire d'événements pour les plugins
 */
class PluginEventEmitterImpl implements PluginEventEmitter {
  private handlers = new Map<string, Function[]>();
  
  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }
  
  off(event: string, handler: Function): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  emit(event: string, data?: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in plugin event handler for '${event}':`, error);
        }
      });
    }
  }
  
  once(event: string, handler: Function): void {
    const onceHandler = (data: any) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }
}

/**
 * Gestionnaire principal des plugins
 */
export class PluginManager implements IPluginManager {
  private plugins: PluginRegistry = {};
  private api: ViewerAPI;
  private eventEmitter = new PluginEventEmitterImpl();
  private options: Required<PluginManagerOptions>;
  
  constructor(api: ViewerAPI, options: PluginManagerOptions = {}) {
    this.api = api;
    this.options = {
      autoLoad: true,
      autoActivate: false,
      enableHotReload: false,
      maxLoadTime: 10000,
      validatePermissions: true,
      sandboxMode: false,
      allowDynamicImports: true,
      pluginDirectory: './plugins',
      configFile: 'plugins.json',
      ...options
    };
  }
  
  /**
   * Charge un plugin
   */
  async loadPlugin(plugin: EnhancedViewerPlugin): Promise<PluginLoadResult> {
    const startTime = Date.now();
    const pluginId = plugin.id;
    
    try {
      // Vérifier si le plugin est déjà chargé
      if (this.hasPlugin(pluginId)) {
        return {
          success: false,
          error: `Plugin '${pluginId}' is already loaded`,
          loadTime: Date.now() - startTime
        };
      }
      
      // Valider les métadonnées
      if (!this.validatePluginMetadata(plugin)) {
        return {
          success: false,
          error: `Plugin '${pluginId}' has invalid metadata`,
          loadTime: Date.now() - startTime
        };
      }
      
      // Vérifier les dépendances
      if (!this.validatePluginDependencies(pluginId, plugin.metadata.dependencies)) {
        return {
          success: false,
          error: `Plugin '${pluginId}' has unresolved dependencies`,
          loadTime: Date.now() - startTime
        };
      }
      
      // Créer le contexte du plugin
      const context = this.createPluginContext(plugin);
      plugin.context = context;
      
      // Initialiser le statut
      const status: PluginStatus = {
        id: pluginId,
        state: 'loading',
        loadTime: 0,
        dependencies: plugin.metadata.dependencies || []
      };
      
      // Obtenir la configuration
      const config = this.getPluginConfig(pluginId) || plugin.getDefaultConfig?.() || {};
      
      // Enregistrer le plugin
      this.plugins[pluginId] = {
        plugin,
        status,
        config
      };
      
      // Hooks de pré-initialisation
      if (plugin.onPreInit) {
        await this.executePluginHook(plugin, 'onPreInit', context);
      }
      
      // Initialisation du plugin
      if (plugin.onInit) {
        await this.executePluginHook(plugin, 'onInit', this.api);
      }
      
      // Hooks de post-initialisation
      if (plugin.onPostInit) {
        await this.executePluginHook(plugin, 'onPostInit', context);
      }
      
      // Marquer comme chargé
      status.state = 'loaded';
      status.loadTime = Date.now() - startTime;
      
      // Enregistrer les extensions
      this.registerPluginExtensions(plugin);
      
      // Auto-activation si configuré
      if (this.options.autoActivate && config.autoActivate !== false) {
        await this.activatePlugin(pluginId);
      }
      
      // Émettre l'événement
      this.eventEmitter.emit('plugin-loaded', { pluginId, plugin });
      
      return {
        success: true,
        plugin,
        loadTime: status.loadTime
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Marquer comme erreur
      if (this.plugins[pluginId]) {
        this.plugins[pluginId].status.state = 'error';
        this.plugins[pluginId].status.error = errorMessage;
      }
      
      // Émettre l'événement d'erreur
      this.eventEmitter.emit('plugin-error', { pluginId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
        loadTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Décharge un plugin
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const pluginEntry = this.plugins[pluginId];
      if (!pluginEntry) {
        return false;
      }
      
      const { plugin, status } = pluginEntry;
      
      // Désactiver le plugin s'il est actif
      if (status.state === 'active') {
        await this.deactivatePlugin(pluginId);
      }
      
      // Hooks de pré-démontage
      if (plugin.onPreUnmount && plugin.context) {
        await this.executePluginHook(plugin, 'onPreUnmount', plugin.context);
      }
      
      // Démontage du plugin
      if (plugin.onUnmount) {
        await this.executePluginHook(plugin, 'onUnmount', this.api);
      }
      
      // Hooks de post-démontage
      if (plugin.onPostUnmount && plugin.context) {
        await this.executePluginHook(plugin, 'onPostUnmount', plugin.context);
      }
      
      // Nettoyage final
      if (plugin.onDestroy) {
        await this.executePluginHook(plugin, 'onDestroy');
      }
      
      // Désenregistrer les extensions
      this.unregisterPluginExtensions(plugin);
      
      // Supprimer du registre
      delete this.plugins[pluginId];
      
      // Émettre l'événement
      this.eventEmitter.emit('plugin-unloaded', { pluginId });
      
      return true;
      
    } catch (error) {
      console.error(`Error unloading plugin '${pluginId}':`, error);
      return false;
    }
  }
  
  /**
   * Active un plugin
   */
  async activatePlugin(pluginId: string): Promise<boolean> {
    try {
      const pluginEntry = this.plugins[pluginId];
      if (!pluginEntry || pluginEntry.status.state !== 'loaded') {
        return false;
      }
      
      const { plugin, status } = pluginEntry;
      
      // Hooks de pré-montage
      if (plugin.onPreMount && plugin.context) {
        await this.executePluginHook(plugin, 'onPreMount', plugin.context);
      }
      
      // Montage du plugin
      if (plugin.onMount) {
        await this.executePluginHook(plugin, 'onMount', this.api);
      }
      
      // Hooks de post-montage
      if (plugin.onPostMount && plugin.context) {
        await this.executePluginHook(plugin, 'onPostMount', plugin.context);
      }
      
      // Activation
      if (plugin.onActivate && plugin.context) {
        await this.executePluginHook(plugin, 'onActivate', plugin.context);
      }
      
      // Marquer comme actif
      status.state = 'active';
      status.lastActivated = Date.now();
      
      // Émettre l'événement
      this.eventEmitter.emit('plugin-activated', { pluginId, plugin });
      
      return true;
      
    } catch (error) {
      console.error(`Error activating plugin '${pluginId}':`, error);
      return false;
    }
  }
  
  /**
   * Désactive un plugin
   */
  async deactivatePlugin(pluginId: string): Promise<boolean> {
    try {
      const pluginEntry = this.plugins[pluginId];
      if (!pluginEntry || pluginEntry.status.state !== 'active') {
        return false;
      }
      
      const { plugin, status } = pluginEntry;
      
      // Désactivation
      if (plugin.onDeactivate && plugin.context) {
        await this.executePluginHook(plugin, 'onDeactivate', plugin.context);
      }
      
      // Marquer comme inactif
      status.state = 'inactive';
      
      // Émettre l'événement
      this.eventEmitter.emit('plugin-deactivated', { pluginId, plugin });
      
      return true;
      
    } catch (error) {
      console.error(`Error deactivating plugin '${pluginId}':`, error);
      return false;
    }
  }
  
  /**
   * Configuration des plugins
   */
  getPluginConfig(pluginId: string): PluginConfig | undefined {
    return this.plugins[pluginId]?.config;
  }
  
  async setPluginConfig(pluginId: string, config: Partial<PluginConfig>): Promise<boolean> {
    try {
      const pluginEntry = this.plugins[pluginId];
      if (!pluginEntry) {
        return false;
      }
      
      const oldConfig = { ...pluginEntry.config };
      const newConfig = { ...oldConfig, ...config };
      
      // Valider la nouvelle configuration
      if (pluginEntry.plugin.validateConfig) {
        const isValid = await pluginEntry.plugin.validateConfig(newConfig);
        if (!isValid) {
          return false;
        }
      }
      
      // Appliquer la configuration
      pluginEntry.config = newConfig;
      
      // Hook de changement de configuration
      if (pluginEntry.plugin.onConfigChange) {
        await this.executePluginHook(
          pluginEntry.plugin,
          'onConfigChange',
          newConfig,
          oldConfig
        );
      }
      
      // Émettre l'événement
      this.eventEmitter.emit('plugin-config-changed', {
        pluginId,
        config: newConfig,
        oldConfig
      });
      
      return true;
      
    } catch (error) {
      console.error(`Error setting config for plugin '${pluginId}':`, error);
      return false;
    }
  }
  
  /**
   * Requêtes sur les plugins
   */
  getPlugin(pluginId: string): EnhancedViewerPlugin | undefined {
    return this.plugins[pluginId]?.plugin;
  }
  
  getPluginStatus(pluginId: string): PluginStatus | undefined {
    return this.plugins[pluginId]?.status;
  }
  
  getAllPlugins(): EnhancedViewerPlugin[] {
    return Object.values(this.plugins).map(entry => entry.plugin);
  }
  
  getActivePlugins(): EnhancedViewerPlugin[] {
    return Object.values(this.plugins)
      .filter(entry => entry.status.state === 'active')
      .map(entry => entry.plugin);
  }
  
  findPlugins(filter: PluginFilter): EnhancedViewerPlugin[] {
    return Object.values(this.plugins)
      .filter(entry => this.matchesFilter(entry, filter))
      .map(entry => entry.plugin);
  }
  
  hasPlugin(pluginId: string): boolean {
    return pluginId in this.plugins;
  }
  
  isPluginLoaded(pluginId: string): boolean {
    const status = this.getPluginStatus(pluginId);
    return status?.state === 'loaded' || status?.state === 'active' || status?.state === 'inactive';
  }
  
  isPluginActive(pluginId: string): boolean {
    return this.getPluginStatus(pluginId)?.state === 'active';
  }
  
  getPluginDependencies(pluginId: string): string[] {
    return this.getPluginStatus(pluginId)?.dependencies || [];
  }
  
  validatePluginDependencies(pluginId: string, dependencies?: string[]): boolean {
    if (!dependencies || dependencies.length === 0) {
      return true;
    }
    
    // Vérifier que toutes les dépendances sont chargées
    return dependencies.every(depId => this.isPluginLoaded(depId));
  }
  
  /**
   * Statistiques et monitoring
   */
  getStats(): PluginManagerStats {
    const plugins = Object.values(this.plugins);
    const loadedPlugins = plugins.filter(p => this.isPluginLoaded(p.plugin.id));
    const activePlugins = plugins.filter(p => p.status.state === 'active');
    const errorPlugins = plugins.filter(p => p.status.state === 'error');
    
    const loadTimes = plugins
      .map(p => p.status.loadTime)
      .filter(t => t !== undefined) as number[];
    
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
      : 0;
    
    return {
      totalPlugins: plugins.length,
      loadedPlugins: loadedPlugins.length,
      activePlugins: activePlugins.length,
      errorPlugins: errorPlugins.length,
      averageLoadTime
    };
  }
  
  getPluginPerformance(pluginId: string): any {
    const status = this.getPluginStatus(pluginId);
    return {
      loadTime: status?.loadTime,
      lastActivated: status?.lastActivated,
      state: status?.state
    };
  }
  
  /**
   * Gestion des événements
   */
  on(event: PluginManagerEvent, handler: (data: PluginEventData) => void): void {
    this.eventEmitter.on(event, handler);
  }
  
  off(event: PluginManagerEvent, handler: (data: PluginEventData) => void): void {
    this.eventEmitter.off(event, handler);
  }
  
  /**
   * Nettoyage
   */
  async dispose(): Promise<void> {
    const pluginIds = Object.keys(this.plugins);
    
    // Décharger tous les plugins
    for (const pluginId of pluginIds) {
      await this.unloadPlugin(pluginId);
    }
    
    // Nettoyer les handlers d'événements
    this.eventEmitter = new PluginEventEmitterImpl();
  }
  
  /**
   * Méthodes privées
   */
  private createPluginContext(plugin: EnhancedViewerPlugin): PluginContext {
    return {
      api: this.api,
      config: this.getPluginConfig(plugin.id) || {},
      storage: new PluginStorageImpl(plugin.id),
      logger: new PluginLoggerImpl(plugin.id),
      events: new PluginEventEmitterImpl()
    };
  }
  
  private async executePluginHook(
    plugin: EnhancedViewerPlugin,
    hookName: string,
    ...args: any[]
  ): Promise<void> {
    const hook = (plugin as any)[hookName];
    if (typeof hook === 'function') {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Plugin hook '${hookName}' timed out`)), this.options.maxLoadTime);
      });
      
      await Promise.race([
        hook.apply(plugin, args),
        timeoutPromise
      ]);
    }
  }
  
  private validatePluginMetadata(plugin: EnhancedViewerPlugin): boolean {
    const metadata = plugin.metadata;
    return !!(
      metadata &&
      metadata.id &&
      metadata.name &&
      metadata.version &&
      metadata.id === plugin.id
    );
  }
  
  private registerPluginExtensions(plugin: EnhancedViewerPlugin): void {
    // Enregistrer les outils
    if (plugin.tools) {
      plugin.tools.forEach(tool => {
        // TODO: Enregistrer l'outil auprès de l'API
      });
    }
    
    // Enregistrer les panneaux
    if (plugin.panels) {
      plugin.panels.forEach(panel => {
        // TODO: Enregistrer le panneau auprès de l'API
      });
    }
    
    // Enregistrer les commandes
    if (plugin.commands) {
      plugin.commands.forEach(command => {
        // TODO: Enregistrer la commande auprès de l'API
      });
    }
    
    // Enregistrer les raccourcis
    if (plugin.shortcuts) {
      plugin.shortcuts.forEach(shortcut => {
        // TODO: Enregistrer le raccourci auprès de l'API
      });
    }
  }
  
  private unregisterPluginExtensions(plugin: EnhancedViewerPlugin): void {
    // TODO: Implémenter le désenregistrement des extensions
  }
  
  private matchesFilter(entry: any, filter: PluginFilter): boolean {
    const { plugin, status, config } = entry;
    
    if (filter.category && plugin.metadata.category !== filter.category) {
      return false;
    }
    
    if (filter.state && status.state !== filter.state) {
      return false;
    }
    
    if (filter.author && plugin.metadata.author !== filter.author) {
      return false;
    }
    
    if (filter.keyword) {
      const searchText = `${plugin.metadata.name} ${plugin.metadata.description} ${plugin.metadata.keywords?.join(' ')}`.toLowerCase();
      if (!searchText.includes(filter.keyword.toLowerCase())) {
        return false;
      }
    }
    
    if (filter.enabled !== undefined && config.enabled !== filter.enabled) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Méthodes supplémentaires pour l'intégration avec ViewerCore
   */
  
  register(plugin: EnhancedViewerPlugin): void {
    this.loadPlugin(plugin).catch(error => {
      console.error(`Failed to register plugin ${plugin.id}:`, error);
    });
  }
  
  destroy(): void {
    this.dispose().catch(error => {
      console.error('Failed to dispose plugin manager:', error);
    });
  }
  
  getTools(): any[] {
    const tools: any[] = [];
    
    this.getActivePlugins().forEach(plugin => {
      if (plugin.tools) {
        plugin.tools.forEach(tool => {
          tools.push({
            id: tool.id,
            name: tool.name,
            tooltip: tool.tooltip,
            group: tool.group || 'plugin',
            action: () => {
              if (tool.handler) {
                tool.handler(this.api);
              }
            }
          });
        });
      }
    });
    
    return tools;
  }
  
  hasFeature(featureId: string): boolean {
    return this.getActivePlugins().some(plugin => {
      return plugin.features?.some(feature => feature.id === featureId);
    });
  }
  
  getFeatureComponent(featureId: string): React.ComponentType<any> | null {
    for (const plugin of this.getActivePlugins()) {
      if (plugin.features) {
        const feature = plugin.features.find(f => f.id === featureId);
        if (feature && feature.component) {
          return feature.component;
        }
      }
    }
    return null;
  }
}

export default PluginManager;