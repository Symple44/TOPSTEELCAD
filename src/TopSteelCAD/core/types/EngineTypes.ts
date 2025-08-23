/**
 * Types de base pour le Format Engine
 */

import { PivotScene, PivotElement } from '../../../types/viewer';
import type { ImportPipeline, ExportPipeline } from './PipelineTypes';

// ================================
// CORE ENGINE TYPES
// ================================

/**
 * Formats supportés par le système
 */
export type SupportedFormat = 'dstv' | 'ifc' | 'dxf' | 'step' | 'obj' | 'gltf' | 'json';

/**
 * Interface principale du Format Engine
 */
export interface IFormatEngine {
  registerFormat(plugin: FormatPlugin): void;
  unregisterFormat(formatId: string): void;
  import(file: File, options?: ImportOptions): Promise<ImportResult>;
  export(scene: PivotScene, format: SupportedFormat, options?: ExportOptions): Promise<ExportResult>;
  getSupportedFormats(): FormatInfo[];
  getFormatCapabilities(formatId: string): FormatCapabilities | null;
  detectFormat(file: File): Promise<string>;
}

/**
 * Options d'importation
 */
export interface ImportOptions {
  format?: SupportedFormat;
  unit?: 'mm' | 'inch' | 'm';
  coordinateSystem?: 'right' | 'left';
  mergeIdentical?: boolean;
  generateIds?: boolean;
  validateGeometry?: boolean;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  strictValidation?: boolean;
  customOptions?: Record<string, any>;
}

/**
 * Options d'exportation
 */
export interface ExportOptions {
  format: SupportedFormat;
  unit?: 'mm' | 'inch' | 'm';
  precision?: number;
  includeMetadata?: boolean;
  includeHierarchy?: boolean;
  compressed?: boolean;
  customOptions?: Record<string, any>;
}

/**
 * Résultat d'importation
 */
export interface ImportResult {
  success: boolean;
  scene?: PivotScene;
  errors: string[];
  warnings: string[];
  statistics: ImportStatistics;
  metadata?: Record<string, any>;
}

/**
 * Résultat d'exportation
 */
export interface ExportResult {
  success: boolean;
  data?: ArrayBuffer | string | Blob;
  filename?: string;
  errors: string[];
  warnings: string[];
  statistics: ExportStatistics;
}

/**
 * Statistiques d'importation
 */
export interface ImportStatistics {
  totalElements: number;
  importedElements: number;
  failedElements: number;
  processingTime: number;
  fileSize?: number;
  memoryUsage?: number;
}

/**
 * Statistiques d'exportation
 */
export interface ExportStatistics {
  totalElements: number;
  exportedElements: number;
  failedElements: number;
  fileSize: number;
  processingTime: number;
}

/**
 * Informations sur un format
 */
export interface FormatInfo {
  id: SupportedFormat;
  name: string;
  version: string;
  description: string;
  supportedExtensions: string[];
  capabilities: FormatCapabilities;
  isBuiltIn: boolean;
}

/**
 * Capacités d'un format
 */
export interface FormatCapabilities {
  import?: {
    geometry: boolean;
    materials: boolean;
    properties: boolean;
    hierarchy: boolean;
    assemblies: boolean;
    features?: boolean;
    holes?: boolean;
    cuts?: boolean;
    markings?: boolean;
  };
  export?: {
    geometry: boolean;
    materials: boolean;
    properties: boolean;
    hierarchy: boolean;
    assemblies: boolean;
    features?: boolean;
    holes?: boolean;
    cuts?: boolean;
    markings?: boolean;
  };
}

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence?: number; // 0-1, confiance dans la détection
}

/**
 * Métadonnées d'un format
 */
export interface FormatMetadata {
  format: SupportedFormat;
  version?: string;
  creator?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  elementCount?: number;
  fileSize?: number;
  customData?: Record<string, any>;
}

/**
 * Événements du Format Engine
 */
export interface EngineEvents {
  'format:registered': { plugin: FormatPlugin };
  'format:unregistered': { formatId: string };
  'import:started': { file: File; options: ImportOptions };
  'import:progress': { progress: number; stage: string };
  'import:completed': { result: ImportResult };
  'export:started': { scene: PivotScene; format: SupportedFormat };
  'export:progress': { progress: number; stage: string };
  'export:completed': { result: ExportResult };
  'error': { error: Error; context: string };
}

// ================================
// PLUGIN SYSTEM TYPES
// ================================

/**
 * Plugin de format
 */
export interface FormatPlugin {
  readonly id: SupportedFormat;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly supportedExtensions: string[];
  readonly capabilities: FormatCapabilities;
  
  // Pipeline factories
  createImportPipeline(): ImportPipeline;
  createExportPipeline?(): ExportPipeline;
  
  // Validation et détection
  validateFile(data: ArrayBuffer): Promise<ValidationResult>;
  extractMetadata?(data: ArrayBuffer): Promise<FormatMetadata>;
  
  // Lifecycle hooks
  onRegister?(): void | Promise<void>;
  onUnregister?(): void | Promise<void>;
}

/**
 * Plugin metadata info
 */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  loaded: boolean;
  enabled: boolean;
  lastLoaded?: Date;
  dependencies?: string[];
  supportedExtensions?: string[];
  capabilities?: FormatCapabilities;
  isBuiltIn?: boolean;
  usageCount?: number;
  lastUsed?: Date;
  registeredAt?: Date;
}

/**
 * Registry des plugins
 */
export interface IPluginRegistry {
  register(plugin: FormatPlugin): void;
  unregister(formatId: string): void;
  getPlugin(formatId: string): FormatPlugin | null;
  getAllPlugins(): Map<string, FormatPlugin>;
  hasPlugin(formatId: string): boolean;
}

// ================================
// DETECTION SYSTEM
// ================================

/**
 * Détecteur de format
 */
export interface FormatDetector {
  detect(file: File): Promise<DetectionResult>;
}

/**
 * Résultat de détection
 */
export interface DetectionResult {
  format: SupportedFormat | null;
  confidence: number; // 0-1
  reasons: string[];
  alternatives?: Array<{
    format: SupportedFormat;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Règle de détection
 */
export interface DetectionRule {
  readonly name: string;
  readonly priority: number; // Plus haut = plus prioritaire
  
  test(file: File, content?: ArrayBuffer): Promise<{
    matches: boolean;
    confidence: number;
    reason: string;
  }>;
}

// ================================
// RE-EXPORTS
// ================================

// Pipeline types are exported directly from PipelineTypes.ts through index.ts