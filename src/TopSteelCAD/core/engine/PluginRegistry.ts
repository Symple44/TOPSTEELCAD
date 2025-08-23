/**
 * PluginRegistry - Gestionnaire de plugins de formats
 * 
 * Enregistre, valide et gère les plugins de format
 */

import {
  FormatPlugin,
  IPluginRegistry,
  PluginInfo,
  SupportedFormat,
  ValidationResult
} from '../types/EngineTypes';
import { PluginError, PluginValidationError } from '../types/PluginTypes';

/**
 * Registry des plugins de format
 */
export class PluginRegistry implements IPluginRegistry {
  private plugins = new Map<string, FormatPlugin>();
  private pluginInfo = new Map<string, PluginInfo>();
  
  // Callbacks optionnels
  onPluginRegistered?: (plugin: FormatPlugin) => void;
  onPluginUnregistered?: (formatId: string) => void;

  /**
   * Enregistre un plugin
   */
  register(plugin: FormatPlugin): void {
    // 1. Validation du plugin
    const validation = this.validatePlugin(plugin);
    if (!validation.isValid) {
      throw new PluginValidationError(plugin.id, validation.errors);
    }
    
    // 2. Vérifier si déjà enregistré
    if (this.plugins.has(plugin.id)) {
      throw new PluginError(`Plugin already registered: ${plugin.id}`, plugin.id);
    }
    
    // 3. Vérifier les conflits d'extensions
    this.checkExtensionConflicts(plugin);
    
    // 4. Enregistrer le plugin
    this.plugins.set(plugin.id, plugin);
    
    // 5. Créer les métadonnées
    const info: PluginInfo = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      loaded: true,
      enabled: true,
      supportedExtensions: plugin.supportedExtensions,
      capabilities: plugin.capabilities,
      isBuiltIn: true, // TODO: déterminer automatiquement
      registeredAt: new Date(),
      usageCount: 0
    };
    this.pluginInfo.set(plugin.id, info);
    
    // 6. Exécuter le hook de registration
    if (plugin.onRegister) {
      plugin.onRegister();
    }
    
    // 7. Notifier les listeners
    if (this.onPluginRegistered) {
      this.onPluginRegistered(plugin);
    }
    
    console.log(`✅ Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Désenregistre un plugin
   */
  unregister(formatId: string): void {
    const plugin = this.plugins.get(formatId);
    if (!plugin) {
      throw new PluginError(`Plugin not found: ${formatId}`, formatId);
    }
    
    // 1. Exécuter le hook de déregistration
    if (plugin.onUnregister) {
      plugin.onUnregister();
    }
    
    // 2. Supprimer le plugin
    this.plugins.delete(formatId);
    this.pluginInfo.delete(formatId);
    
    // 3. Notifier les listeners
    if (this.onPluginUnregistered) {
      this.onPluginUnregistered(formatId);
    }
    
    console.log(`❌ Plugin unregistered: ${formatId}`);
  }

  /**
   * Récupère un plugin par ID
   */
  getPlugin(formatId: string): FormatPlugin | null {
    return this.plugins.get(formatId) || null;
  }

  /**
   * Récupère tous les plugins
   */
  getAllPlugins(): Map<string, FormatPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Vérifie si un plugin existe
   */
  hasPlugin(formatId: string): boolean {
    return this.plugins.has(formatId);
  }

  /**
   * Récupère les informations d'un plugin
   */
  getPluginInfo(formatId: string): PluginInfo | null {
    return this.pluginInfo.get(formatId) || null;
  }

  /**
   * Récupère un plugin par extension de fichier
   */
  getPluginByExtension(extension: string): FormatPlugin | null {
    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.supportedExtensions.includes(normalizedExt)) {
        return plugin;
      }
    }
    
    return null;
  }

  /**
   * Récupère tous les plugins supportant une extension
   */
  getPluginsByExtension(extension: string): FormatPlugin[] {
    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
    const matchingPlugins: FormatPlugin[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.supportedExtensions.includes(normalizedExt)) {
        matchingPlugins.push(plugin);
      }
    }
    
    return matchingPlugins;
  }

  /**
   * Met à jour les statistiques d'usage d'un plugin
   */
  updateUsageStats(formatId: string): void {
    const info = this.pluginInfo.get(formatId);
    if (info) {
      info.usageCount = (info.usageCount || 0) + 1;
      info.lastUsed = new Date();
    }
  }

  /**
   * Retourne les statistiques du registry
   */
  getStats(): {
    totalPlugins: number;
    pluginsByCapability: Record<string, number>;
    mostUsedPlugins: Array<{ id: string; usageCount: number }>;
    extensionsCovered: string[];
  } {
    const plugins = Array.from(this.plugins.values());
    const infos = Array.from(this.pluginInfo.values());
    
    // Statistiques par capacité
    const pluginsByCapability = {
      import: plugins.filter(p => p.capabilities.import).length,
      export: plugins.filter(p => p.capabilities.export).length,
      geometry: plugins.filter(p => p.capabilities.import?.geometry || p.capabilities.export?.geometry).length,
      materials: plugins.filter(p => p.capabilities.import?.materials || p.capabilities.export?.materials).length,
      features: plugins.filter(p => p.capabilities.import?.features || p.capabilities.export?.features).length
    };
    
    // Plugins les plus utilisés
    const mostUsedPlugins = infos
      .filter(info => info.usageCount && info.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map(info => ({ id: info.id, usageCount: info.usageCount || 0 }));
    
    // Extensions couvertes
    const extensionsCovered = Array.from(
      new Set(plugins.flatMap(p => p.supportedExtensions))
    ).sort();
    
    return {
      totalPlugins: plugins.length,
      pluginsByCapability,
      mostUsedPlugins,
      extensionsCovered
    };
  }

  // ================================
  // VALIDATION PRIVÉE
  // ================================

  /**
   * Valide la structure d'un plugin
   */
  private validatePlugin(plugin: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Vérifications obligatoires
    if (!plugin.id || typeof plugin.id !== 'string') {
      errors.push('Plugin must have a valid id (string)');
    }
    
    if (!plugin.name || typeof plugin.name !== 'string') {
      errors.push('Plugin must have a valid name (string)');
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      errors.push('Plugin must have a valid version (string)');
    }
    
    if (!Array.isArray(plugin.supportedExtensions) || plugin.supportedExtensions.length === 0) {
      errors.push('Plugin must support at least one file extension');
    }
    
    if (!plugin.capabilities || typeof plugin.capabilities !== 'object') {
      errors.push('Plugin must define capabilities');
    }
    
    if (typeof plugin.createImportPipeline !== 'function') {
      errors.push('Plugin must implement createImportPipeline()');
    }
    
    if (typeof plugin.validateFile !== 'function') {
      errors.push('Plugin must implement validateFile()');
    }
    
    // Validation des extensions
    if (Array.isArray(plugin.supportedExtensions)) {
      for (const ext of plugin.supportedExtensions) {
        if (typeof ext !== 'string' || !ext.startsWith('.')) {
          errors.push(`Invalid extension format: ${ext} (must start with '.')`);
        }
      }
    }
    
    // Validation des capacités
    if (plugin.capabilities) {
      if (plugin.capabilities.export && typeof plugin.createExportPipeline !== 'function') {
        warnings.push('Plugin declares export capability but does not implement createExportPipeline()');
      }
    }
    
    // Validation de la version (SemVer basique)
    if (plugin.version && typeof plugin.version === 'string') {
      const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/;
      if (!versionRegex.test(plugin.version)) {
        warnings.push(`Version ${plugin.version} does not follow SemVer format`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Vérifie les conflits d'extensions avec les plugins existants
   */
  private checkExtensionConflicts(newPlugin: FormatPlugin): void {
    const conflicts: string[] = [];
    
    for (const extension of newPlugin.supportedExtensions) {
      const existingPlugin = this.getPluginByExtension(extension);
      if (existingPlugin) {
        conflicts.push(
          `Extension ${extension} already handled by plugin ${existingPlugin.id}`
        );
      }
    }
    
    if (conflicts.length > 0) {
      console.warn(`⚠️ Extension conflicts detected for plugin ${newPlugin.id}:`, conflicts);
      // Pour l'instant, on continue avec un warning
      // En production, on pourrait implémenter un système de priorité
    }
  }

  /**
   * Nettoie le registry
   */
  clear(): void {
    // Désenregistrer proprement tous les plugins
    const pluginIds = Array.from(this.plugins.keys());
    for (const id of pluginIds) {
      try {
        this.unregister(id);
      } catch (error) {
        console.error(`Error unregistering plugin ${id}:`, error);
      }
    }
    
    this.plugins.clear();
    this.pluginInfo.clear();
  }

  /**
   * Export pour debugging
   */
  toDebugInfo(): Record<string, any> {
    const pluginsInfo: Record<string, any> = {};
    
    for (const [id, plugin] of this.plugins) {
      const info = this.pluginInfo.get(id);
      pluginsInfo[id] = {
        name: plugin.name,
        version: plugin.version,
        extensions: plugin.supportedExtensions,
        capabilities: plugin.capabilities,
        registeredAt: info?.registeredAt,
        usageCount: info?.usageCount || 0,
        lastUsed: info?.lastUsed
      };
    }
    
    return {
      totalPlugins: this.plugins.size,
      plugins: pluginsInfo,
      stats: this.getStats()
    };
  }
}