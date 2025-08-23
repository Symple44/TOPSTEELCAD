/**
 * Export centralisé de tous les types du Core Engine
 */

// Engine Types (specific exports to avoid conflicts)
export type {
  SupportedFormat,
  FormatInfo,
  FormatCapabilities,
  DetectionResult,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  IFormatEngine,
  FormatPlugin,
  EngineEvents,
  ValidationResult as EngineValidationResult,
  IPluginRegistry as EngineIPluginRegistry,
  PluginInfo as EnginePluginInfo
} from './EngineTypes';

// Pipeline Types
export type {
  ProcessingPipeline as IPipelinePipeline,
  ImportPipeline,
  ExportPipeline,
  ProcessingContext as IProcessingContext,
  StageInfo,
  LogEntry,
  LogLevel,
  PipelineStage,
  PipelineMiddleware,
  PipelineFactory,
  ValidationResult as PipelineValidationResult
} from './PipelineTypes';

// Plugin Types  
export type {
  IPluginRegistry,
  PluginInfo,
  PluginConfig
} from './PluginTypes';

// Utilitaires de type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Type helper pour les événements
 */
export type EventHandler<T> = (event: T) => void | Promise<void>;

/**
 * Type helper pour les callbacks avec erreur
 */
export type NodeCallback<T> = (error: Error | null, result?: T) => void;

/**
 * Type helper pour les promesses résolvables
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}