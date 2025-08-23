/**
 * Types pour le système de pipelines de traitement
 */

import { PivotScene } from '../../../types/viewer';

// ================================
// PIPELINE CORE TYPES
// ================================

/**
 * Pipeline de traitement générique
 */
export interface ProcessingPipeline<TInput, TOutput> {
  readonly name: string;
  readonly stages: PipelineStage<any, any>[];
  readonly middleware: PipelineMiddleware[];
  
  addStage<TStageOutput>(stage: PipelineStage<any, TStageOutput>): ProcessingPipeline<any, TStageOutput>;
  use(middleware: PipelineMiddleware): void;
  execute(input: TInput, context: ProcessingContext): Promise<TOutput>;
  
  // Introspection
  getStageCount(): number;
  getStageNames(): string[];
  getEstimatedDuration(): number;
}

/**
 * Étape de pipeline
 */
export interface PipelineStage<TInput, TOutput> {
  readonly name: string;
  readonly description?: string;
  readonly estimatedDuration?: number;
  
  process(input: TInput, context: ProcessingContext): Promise<TOutput>;
  validate?(input: TInput): Promise<ValidationResult>;
  
  // Lifecycle hooks
  onStart?(context: ProcessingContext): void | Promise<void>;
  onComplete?(output: TOutput, context: ProcessingContext): void | Promise<void>;
  onError?(error: Error, context: ProcessingContext): void | Promise<void>;
}

/**
 * Pipeline d'importation
 */
export interface ImportPipeline extends ProcessingPipeline<ArrayBuffer, PivotScene> {
  readonly type: 'import';
}

/**
 * Pipeline d'exportation
 */
export interface ExportPipeline extends ProcessingPipeline<PivotScene, ArrayBuffer | string> {
  readonly type: 'export';
}

// ================================
// CONTEXT & STATE
// ================================

/**
 * Contexte d'exécution du pipeline
 */
export interface ProcessingContext {
  readonly file?: File;
  readonly options: Record<string, any>;
  readonly startTime: number;
  
  // État du pipeline
  currentStage?: StageInfo;
  progress: number; // 0-100
  
  // Collecte de données
  errors: string[];
  warnings: string[];
  logs: LogEntry[];
  metrics: Map<string, any>;
  
  // Méthodes utilitaires
  addError(error: string): void;
  addWarning(warning: string): void;
  addLog(level: LogLevel, message: string, data?: any): void;
  addMetric(key: string, value: any): void;
  
  setProgress(progress: number): void;
  getElapsedTime(): number;
  
  // Stage management
  setCurrentStage(stage: StageInfo): void;
  completeCurrentStage(): void;
  
  // Metrics and utilities
  getMetric<T>(key: string): T | undefined;
  formatDuration(milliseconds: number): string;
  addWarnings(warnings: string[]): void;
  
  // Données partagées entre stages
  setSharedData(key: string, value: any): void;
  getSharedData<T>(key: string): T | undefined;
}

/**
 * Information sur un stage en cours
 */
export interface StageInfo {
  index: number;
  name: string;
  total: number;
  startTime: number;
}

/**
 * Entrée de log
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  stage?: string;
}

/**
 * Niveaux de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ================================
// MIDDLEWARE SYSTEM
// ================================

/**
 * Middleware de pipeline
 */
export interface PipelineMiddleware {
  readonly name: string;
  readonly priority?: number; // Plus haut = exécuté en premier
  
  before?(context: ProcessingContext): void | Promise<void>;
  after?(context: ProcessingContext): void | Promise<void>;
  onStageStart?(stage: PipelineStage<any, any>, context: ProcessingContext): void | Promise<void>;
  onStageComplete?(stage: PipelineStage<any, any>, context: ProcessingContext): void | Promise<void>;
  onError?(error: Error, context: ProcessingContext): void | Promise<void>;
}

/**
 * Configuration de middleware
 */
export interface MiddlewareConfig {
  enabled: boolean;
  priority?: number;
  options?: Record<string, any>;
}

// ================================
// BUILT-IN MIDDLEWARE TYPES
// ================================

/**
 * Configuration du middleware de logging
 */
export interface LoggingMiddlewareConfig extends MiddlewareConfig {
  options?: {
    logLevel?: LogLevel;
    logToConsole?: boolean;
    logToFile?: boolean;
    filename?: string;
    includeStageMetrics?: boolean;
  };
}

/**
 * Configuration du middleware de métriques
 */
export interface MetricsMiddlewareConfig extends MiddlewareConfig {
  options?: {
    collectMemoryUsage?: boolean;
    collectCpuUsage?: boolean;
    collectStageMetrics?: boolean;
    exportMetrics?: boolean;
    metricsEndpoint?: string;
  };
}

/**
 * Configuration du middleware de validation
 */
export interface ValidationMiddlewareConfig extends MiddlewareConfig {
  options?: {
    validateInput?: boolean;
    validateOutput?: boolean;
    validateStageOutputs?: boolean;
    strictMode?: boolean;
    customValidators?: Array<(data: any) => ValidationResult>;
  };
}

/**
 * Configuration du middleware de cache
 */
export interface CacheMiddlewareConfig extends MiddlewareConfig {
  options?: {
    enableInputCache?: boolean;
    enableStageCache?: boolean;
    cacheSize?: number; // En MB
    ttl?: number; // Time to live en ms
    cacheKey?: (input: any) => string;
  };
}

// ================================
// STAGE IMPLEMENTATIONS
// ================================

/**
 * Stage de base abstrait
 */
export abstract class BaseStage<TInput, TOutput> implements PipelineStage<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly description: string;
  readonly estimatedDuration?: number;
  
  abstract process(input: TInput, context: ProcessingContext): Promise<TOutput>;
  
  async validate?(input: TInput): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }
  
  onStart?(context: ProcessingContext): void | Promise<void> {
    context.addLog('info', `Starting stage: ${this.name}`);
  }
  
  onComplete?(output: TOutput, context: ProcessingContext): void | Promise<void> {
    const elapsed = context.getElapsedTime();
    context.addLog('info', `Completed stage: ${this.name}`, { elapsed });
  }
  
  onError?(error: Error, context: ProcessingContext): void | Promise<void> {
    context.addError(`Stage ${this.name} failed: ${error.message}`);
  }
}

// ================================
// FACTORY TYPES
// ================================

/**
 * Factory de pipelines
 */
export interface PipelineFactory {
  createImportPipeline<T extends PivotScene>(format: string): ImportPipeline;
  createExportPipeline<T extends ArrayBuffer | string>(format: string): ExportPipeline;
  createCustomPipeline<TInput, TOutput>(
    name: string, 
    stages: PipelineStage<any, any>[]
  ): ProcessingPipeline<TInput, TOutput>;
}

/**
 * Configuration de factory
 */
export interface PipelineFactoryConfig {
  defaultMiddleware?: MiddlewareConfig[];
  stageTimeout?: number;
  maxConcurrentStages?: number;
  memoryLimit?: number;
}

// ================================
// VALIDATION TYPES
// ================================

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

/**
 * Validateur personnalisé
 */
export interface CustomValidator<T> {
  readonly name: string;
  validate(data: T): ValidationResult | Promise<ValidationResult>;
}

// ================================
// PERFORMANCE & MONITORING
// ================================

/**
 * Métriques de performance
 */
export interface PerformanceMetrics {
  totalDuration: number;
  stageMetrics: Map<string, StageMetrics>;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  throughput: {
    elementsPerSecond: number;
    bytesPerSecond: number;
  };
}

/**
 * Métriques d'un stage
 */
export interface StageMetrics {
  name: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  inputSize: number;
  outputSize: number;
  errors: number;
  warnings: number;
}

// ================================
// ERROR HANDLING
// ================================

/**
 * Erreur de pipeline
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly stage?: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

/**
 * Erreur de stage
 */
export class StageError extends PipelineError {
  constructor(
    stage: string,
    message: string,
    cause?: Error,
    context?: Record<string, any>
  ) {
    super(`Stage ${stage}: ${message}`, stage, cause, context);
    this.name = 'StageError';
  }
}

/**
 * Erreur de validation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
    public readonly warnings: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}