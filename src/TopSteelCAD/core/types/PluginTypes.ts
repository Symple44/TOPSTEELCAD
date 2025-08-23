/**
 * Types pour le système de plugins
 */

import { 
  FormatPlugin, 
  FormatCapabilities, 
  ValidationResult, 
  FormatMetadata,
  SupportedFormat 
} from './EngineTypes';
import { ImportPipeline, ExportPipeline } from './PipelineTypes';

// ================================
// PLUGIN REGISTRY TYPES
// ================================

/**
 * Registry des plugins de format
 */
export interface IPluginRegistry {
  register(plugin: FormatPlugin): void;
  unregister(formatId: string): void;
  getPlugin(formatId: string): FormatPlugin | null;
  getAllPlugins(): Map<string, FormatPlugin>;
  hasPlugin(formatId: string): boolean;
  getPluginInfo(formatId: string): PluginInfo | null;
  
  // Events
  onPluginRegistered?(plugin: FormatPlugin): void;
  onPluginUnregistered?(formatId: string): void;
}

/**
 * Information sur un plugin
 */
export interface PluginInfo {
  id: SupportedFormat;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  supportedExtensions: string[];
  capabilities: FormatCapabilities;
  isBuiltIn: boolean;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount?: number;
}

/**
 * Événements du registry
 */
export interface PluginRegistryEvents {
  'plugin:registered': { plugin: FormatPlugin };
  'plugin:unregistered': { formatId: string };
  'plugin:error': { formatId: string; error: Error };
}

// ================================
// PLUGIN BASE CLASSES
// ================================

/**
 * Plugin de base abstrait
 */
export abstract class BaseFormatPlugin implements FormatPlugin {
  abstract readonly id: SupportedFormat;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly supportedExtensions: string[];
  abstract readonly capabilities: FormatCapabilities;
  
  readonly description?: string;
  readonly author?: string;
  readonly homepage?: string;
  
  // Implémentations par défaut
  abstract createImportPipeline(): ImportPipeline;
  createExportPipeline?(): ExportPipeline;
  
  abstract validateFile(data: ArrayBuffer): Promise<ValidationResult>;
  
  async extractMetadata(data: ArrayBuffer): Promise<FormatMetadata> {
    return {
      format: this.id,
      fileSize: data.byteLength,
      customData: {}
    };
  }
  
  async onRegister(): Promise<void> {
    console.log(`✅ Registered plugin: ${this.name} v${this.version}`);
  }
  
  async onUnregister(): Promise<void> {
    console.log(`❌ Unregistered plugin: ${this.name}`);
  }
  
  // Utilitaires pour les plugins
  protected createValidationError(message: string, errors: string[] = []): ValidationResult {
    return {
      isValid: false,
      errors: [message, ...errors],
      warnings: []
    };
  }
  
  protected createValidationSuccess(warnings: string[] = []): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings
    };
  }
}

// ================================
// PLUGIN DISCOVERY & LOADING
// ================================

/**
 * Chargeur de plugins
 */
export interface PluginLoader {
  loadPlugin(path: string): Promise<FormatPlugin>;
  loadPluginsFromDirectory(directory: string): Promise<FormatPlugin[]>;
  unloadPlugin(plugin: FormatPlugin): Promise<void>;
  
  // Validation
  validatePlugin(plugin: any): ValidationResult;
  getPluginDependencies(plugin: FormatPlugin): string[];
}

/**
 * Configuration de plugin
 */
export interface PluginConfig {
  id: SupportedFormat;
  enabled: boolean;
  priority?: number;
  options?: Record<string, any>;
  dependencies?: string[];
}

/**
 * Descripteur de plugin (plugin.json)
 */
export interface PluginDescriptor {
  id: SupportedFormat;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  license?: string;
  
  // Métadonnées
  main: string; // Point d'entrée
  supportedExtensions: string[];
  capabilities: FormatCapabilities;
  
  // Dépendances
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // Configuration
  defaultConfig?: Record<string, any>;
  
  // Compatibilité
  engineVersion?: string; // Version minimale du moteur
  compatibility?: {
    node?: string;
    browser?: boolean;
  };
  
  // Métadonnées étendues
  keywords?: string[];
  repository?: string;
  bugs?: string;
}

// ================================
// PLUGIN VALIDATION
// ================================

/**
 * Validateur de plugin
 */
export interface PluginValidator {
  validateStructure(plugin: any): ValidationResult;
  validateCapabilities(capabilities: FormatCapabilities): ValidationResult;
  validateExtensions(extensions: string[]): ValidationResult;
  validateVersion(version: string): ValidationResult;
  validateDependencies(dependencies: string[]): ValidationResult;
}

/**
 * Règles de validation des plugins
 */
export interface PluginValidationRule {
  name: string;
  validate(plugin: any): ValidationResult;
}

// ================================
// PLUGIN MANAGER
// ================================

/**
 * Gestionnaire de plugins
 */
export interface IPluginManager {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Plugin management
  installPlugin(source: string | PluginDescriptor): Promise<void>;
  uninstallPlugin(pluginId: string): Promise<void>;
  enablePlugin(pluginId: string): Promise<void>;
  disablePlugin(pluginId: string): Promise<void>;
  updatePlugin(pluginId: string, version?: string): Promise<void>;
  
  // Discovery
  discoverPlugins(directory?: string): Promise<PluginDescriptor[]>;
  getInstalledPlugins(): PluginDescriptor[];
  getAvailableUpdates(): Promise<Array<{ plugin: string; currentVersion: string; latestVersion: string }>>;
  
  // Configuration
  setPluginConfig(pluginId: string, config: Partial<PluginConfig>): void;
  getPluginConfig(pluginId: string): PluginConfig | null;
  
  // Status
  isPluginEnabled(pluginId: string): boolean;
  getPluginStatus(pluginId: string): PluginStatus;
  getDependencyTree(pluginId: string): PluginDependency[];
}

/**
 * État d'un plugin
 */
export enum PluginStatus {
  NOT_INSTALLED = 'not_installed',
  INSTALLED = 'installed',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  UPDATING = 'updating'
}

/**
 * Dépendance de plugin
 */
export interface PluginDependency {
  id: string;
  version: string;
  required: boolean;
  satisfied: boolean;
  status: PluginStatus;
}

// ================================
// THIRD-PARTY PLUGINS
// ================================

/**
 * Source de plugins tiers
 */
export interface PluginSource {
  name: string;
  url: string;
  type: 'npm' | 'git' | 'file' | 'url';
  trusted: boolean;
}

/**
 * Registre de plugins (comme npm)
 */
export interface PluginRegistry {
  name: string;
  url: string;
  
  search(query: string): Promise<PluginSearchResult[]>;
  getPlugin(id: string): Promise<PluginDescriptor>;
  getVersions(id: string): Promise<string[]>;
  download(id: string, version: string): Promise<ArrayBuffer>;
}

/**
 * Résultat de recherche de plugin
 */
export interface PluginSearchResult {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  downloads?: number;
  rating?: number;
  tags?: string[];
  lastUpdate?: Date;
}

// ================================
// PLUGIN SECURITY
// ================================

/**
 * Sandbox de plugin
 */
export interface PluginSandbox {
  execute<T>(plugin: FormatPlugin, method: string, ...args: any[]): Promise<T>;
  getPermissions(pluginId: string): PluginPermissions;
  setPermissions(pluginId: string, permissions: PluginPermissions): void;
}

/**
 * Permissions de plugin
 */
export interface PluginPermissions {
  fileSystem: {
    read: boolean;
    write: boolean;
    allowedPaths?: string[];
  };
  network: {
    allowed: boolean;
    allowedHosts?: string[];
  };
  system: {
    execCommands: boolean;
    accessEnv: boolean;
  };
  customPermissions?: Record<string, boolean>;
}

// ================================
// PLUGIN TESTING
// ================================

/**
 * Suite de tests pour plugin
 */
export interface PluginTestSuite {
  pluginId: string;
  tests: PluginTest[];
  
  runAll(): Promise<PluginTestResult>;
  runTest(testName: string): Promise<TestResult>;
}

/**
 * Test de plugin
 */
export interface PluginTest {
  name: string;
  description?: string;
  testFile?: string;
  expectedResult?: any;
  
  run(plugin: FormatPlugin): Promise<TestResult>;
}

/**
 * Résultat de test
 */
export interface TestResult {
  passed: boolean;
  error?: Error;
  duration: number;
  details?: any;
}

/**
 * Résultat de suite de tests
 */
export interface PluginTestResult {
  pluginId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: Map<string, TestResult>;
}

// ================================
// PLUGIN HOOKS & EVENTS
// ================================

/**
 * Hooks disponibles pour les plugins
 */
export interface PluginHooks {
  'before:import': { file: File; options: any };
  'after:import': { scene: any; metadata: any };
  'before:export': { scene: any; format: string; options: any };
  'after:export': { result: ArrayBuffer | string; metadata: any };
  'validation:failed': { errors: string[]; warnings: string[] };
  'format:detected': { format: string; confidence: number };
}

/**
 * Plugin avec hooks
 */
export interface HookablePlugin extends FormatPlugin {
  hooks?: Partial<{
    [K in keyof PluginHooks]: (data: PluginHooks[K]) => void | Promise<void>;
  }>;
}

// ================================
// BUILT-IN PLUGINS
// ================================

/**
 * Configuration des plugins built-in
 */
export interface BuiltInPluginsConfig {
  dstv: {
    enabled: boolean;
    strictValidation: boolean;
    supportAllBlocks: boolean;
  };
  ifc: {
    enabled: boolean;
    version: '2x3' | '4';
    extractProperties: boolean;
  };
  // Autres formats...
}

// ================================
// ERROR TYPES
// ================================

/**
 * Erreur de plugin
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginId: string,
    public readonly cause?: Error
  ) {
    super(`Plugin ${pluginId}: ${message}`);
    this.name = 'PluginError';
  }
}

/**
 * Erreur de chargement de plugin
 */
export class PluginLoadError extends PluginError {
  constructor(pluginId: string, cause: Error) {
    super(`Failed to load plugin`, pluginId, cause);
    this.name = 'PluginLoadError';
  }
}

/**
 * Erreur de validation de plugin
 */
export class PluginValidationError extends PluginError {
  constructor(
    pluginId: string, 
    public readonly validationErrors: string[]
  ) {
    super(`Validation failed: ${validationErrors.join(', ')}`, pluginId);
    this.name = 'PluginValidationError';
  }
}