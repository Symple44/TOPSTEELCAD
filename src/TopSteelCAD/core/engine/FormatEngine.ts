/**
 * FormatEngine - Moteur central de traitement multi-formats
 * 
 * Architecture extensible avec système de plugins pour supporter
 * n'importe quel format industriel (DSTV, IFC, DXF, STEP, etc.)
 */

import {
  IFormatEngine,
  FormatPlugin,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  FormatInfo,
  FormatCapabilities,
  SupportedFormat,
  ValidationResult,
  DetectionResult,
  EngineEvents
} from '../types/EngineTypes';
import { PivotScene } from '../../../types/viewer';
import { PluginRegistry } from './PluginRegistry';
import { FormatDetector } from './FormatDetector';
import { ProcessingContext } from '../pipeline/ProcessingContext';
import { EventEmitter } from 'events';

/**
 * Configuration du FormatEngine
 */
export interface FormatEngineConfig {
  // Détection automatique
  enableAutoDetection: boolean;
  detectionConfidenceThreshold: number; // 0-1
  
  // Performance
  maxConcurrentJobs: number;
  defaultTimeout: number; // ms
  memoryLimit: number; // MB
  
  // Sécurité
  enableSandbox: boolean;
  allowedPluginSources: string[];
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  metricsInterval: number; // ms
}

/**
 * Moteur central de traitement de formats
 */
export class FormatEngine extends EventEmitter implements IFormatEngine {
  private registry: PluginRegistry;
  private detector: FormatDetector;
  private config: FormatEngineConfig;
  private activeJobs = new Map<string, AbortController>();
  private metrics = {
    totalImports: 0,
    totalExports: 0,
    totalErrors: 0,
    avgProcessingTime: 0,
    formatsUsage: new Map<string, number>()
  };

  constructor(config: Partial<FormatEngineConfig> = {}) {
    super();
    
    // Configuration par défaut
    this.config = {
      enableAutoDetection: true,
      detectionConfidenceThreshold: 0.8,
      maxConcurrentJobs: 4,
      defaultTimeout: 30000, // 30s
      memoryLimit: 500, // 500MB
      enableSandbox: false,
      allowedPluginSources: [],
      logLevel: 'info',
      enableMetrics: true,
      metricsInterval: 60000, // 1 minute
      ...config
    };
    
    // Initialiser les composants
    this.registry = new PluginRegistry();
    this.detector = new FormatDetector(this.registry);
    
    // Écouter les événements du registry
    this.setupRegistryEvents();
    
    // Démarrer les métriques si activées
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
    
    this.log('info', 'FormatEngine initialized', { config: this.config });
  }

  // ================================
  // PUBLIC API
  // ================================

  /**
   * Enregistre un plugin de format
   */
  registerFormat(plugin: FormatPlugin): void {
    try {
      this.registry.register(plugin);
      this.detector.addPlugin(plugin);
      
      this.emit('format:registered', { plugin });
      this.log('info', `Registered format plugin: ${plugin.name} v${plugin.version}`);
      
    } catch (error) {
      this.log('error', `Failed to register plugin ${plugin.id}`, { error });
      throw error;
    }
  }

  /**
   * Désenregistre un plugin de format
   */
  unregisterFormat(formatId: string): void {
    try {
      const plugin = this.registry.getPlugin(formatId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${formatId}`);
      }
      
      this.registry.unregister(formatId);
      this.detector.removePlugin(formatId);
      
      this.emit('format:unregistered', { formatId });
      this.log('info', `Unregistered format plugin: ${formatId}`);
      
    } catch (error) {
      this.log('error', `Failed to unregister plugin ${formatId}`, { error });
      throw error;
    }
  }

  /**
   * Importe un fichier
   */
  async import(file: File, options: ImportOptions = {}): Promise<ImportResult> {
    const jobId = this.generateJobId();
    const startTime = performance.now();
    
    try {
      this.log('debug', `Starting import job ${jobId}`, { 
        fileName: file.name, 
        fileSize: file.size,
        options 
      });
      
      // Créer le contexte de traitement
      const context = new ProcessingContext(file, options, startTime);
      const abortController = new AbortController();
      this.activeJobs.set(jobId, abortController);
      
      this.emit('import:started', { file, options });
      
      // 1. Détection du format
      const format = await this.resolveFormat(file, options.format);
      context.addLog('info', `Detected format: ${format}`);
      
      // 2. Récupérer le plugin
      const plugin = this.registry.getPlugin(format);
      if (!plugin) {
        throw new Error(`No plugin available for format: ${format}`);
      }
      
      // 3. Vérifier les capacités d'import
      if (!plugin.capabilities.import) {
        throw new Error(`Plugin ${format} does not support import`);
      }
      
      // 4. Créer et exécuter le pipeline
      const pipeline = plugin.createImportPipeline();
      const fileData = await file.arrayBuffer();
      
      // Vérifier l'annulation
      if (abortController.signal.aborted) {
        throw new Error('Import cancelled');
      }
      
      // 5. Exécuter le pipeline avec timeout
      const scene = await this.executeWithTimeout(
        pipeline.execute(fileData, context),
        (options as any).timeout || this.config.defaultTimeout,
        abortController.signal
      );
      
      // 6. Construire le résultat
      const processingTime = performance.now() - startTime;
      const result: ImportResult = {
        success: true,
        scene: scene as any,
        errors: context.errors,
        warnings: context.warnings,
        statistics: {
          totalElements: (scene as any).elements?.size || 0,
          importedElements: (scene as any).elements?.size || 0,
          failedElements: 0,
          processingTime,
          fileSize: file.size,
          memoryUsage: this.getCurrentMemoryUsage()
        },
        metadata: {
          format,
          plugin: {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version
          },
          context: context.getSharedData('metadata') || {}
        }
      };
      
      // Mettre à jour les métriques
      this.updateImportMetrics(format, processingTime, true);
      
      this.emit('import:completed', { result });
      this.log('info', `Import job ${jobId} completed successfully`, {
        format,
        elements: result.statistics.totalElements,
        duration: processingTime
      });
      
      return result;
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      // Construire le résultat d'erreur
      const result: ImportResult = {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        statistics: {
          totalElements: 0,
          importedElements: 0,
          failedElements: 1,
          processingTime,
          fileSize: file.size
        }
      };
      
      // Mettre à jour les métriques
      this.updateImportMetrics(options.format || 'unknown', processingTime, false);
      
      this.emit('error', { error: error as Error, context: `import:${jobId}` });
      this.log('error', `Import job ${jobId} failed`, { error });
      
      return result;
      
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Exporte une scène vers un format
   */
  async export(scene: PivotScene, format: SupportedFormat, options: ExportOptions = { format } as ExportOptions): Promise<ExportResult> {
    const jobId = this.generateJobId();
    const startTime = performance.now();
    
    try {
      this.log('debug', `Starting export job ${jobId}`, { 
        format,
        elements: scene.elements.size,
        options 
      });
      
      // Créer le contexte de traitement
      const context = new ProcessingContext(undefined, { ...options, format }, startTime);
      const abortController = new AbortController();
      this.activeJobs.set(jobId, abortController);
      
      this.emit('export:started', { scene, format });
      
      // 1. Récupérer le plugin
      const plugin = this.registry.getPlugin(format);
      if (!plugin) {
        throw new Error(`No plugin available for format: ${format}`);
      }
      
      // 2. Vérifier les capacités d'export
      if (!plugin.capabilities.export || !plugin.createExportPipeline) {
        throw new Error(`Plugin ${format} does not support export`);
      }
      
      // 3. Créer et exécuter le pipeline
      const pipeline = plugin.createExportPipeline();
      
      // Vérifier l'annulation
      if (abortController.signal.aborted) {
        throw new Error('Export cancelled');
      }
      
      // 4. Exécuter le pipeline avec timeout
      const data = await this.executeWithTimeout(
        pipeline.execute(scene, context),
        (options as any).timeout || this.config.defaultTimeout,
        abortController.signal
      );
      
      // 5. Construire le résultat
      const processingTime = performance.now() - startTime;
      const result: ExportResult = {
        success: true,
        data: data as any,
        filename: this.generateFileName(scene.name || 'export', format),
        errors: context.errors,
        warnings: context.warnings,
        statistics: {
          totalElements: scene.elements.size,
          exportedElements: scene.elements.size,
          failedElements: 0,
          fileSize: this.getDataSize(data as any),
          processingTime
        }
      };
      
      // Mettre à jour les métriques
      this.updateExportMetrics(format, processingTime, true);
      
      this.emit('export:completed', { result });
      this.log('info', `Export job ${jobId} completed successfully`, {
        format,
        elements: result.statistics.totalElements,
        duration: processingTime,
        fileSize: result.statistics.fileSize
      });
      
      return result;
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      // Construire le résultat d'erreur
      const result: ExportResult = {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        statistics: {
          totalElements: scene.elements.size,
          exportedElements: 0,
          failedElements: scene.elements.size,
          fileSize: 0,
          processingTime
        }
      };
      
      // Mettre à jour les métriques
      this.updateExportMetrics(format, processingTime, false);
      
      this.emit('error', { error: error as Error, context: `export:${jobId}` });
      this.log('error', `Export job ${jobId} failed`, { error });
      
      return result;
      
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Détecte le format d'un fichier
   */
  async detectFormat(file: File): Promise<string> {
    try {
      const detection = await this.detector.detect(file);
      
      if (!detection.format) {
        throw new Error(`Cannot detect format for file: ${file.name}`);
      }
      
      if (detection.confidence < this.config.detectionConfidenceThreshold) {
        this.log('warn', `Low confidence format detection`, {
          file: file.name,
          format: detection.format,
          confidence: detection.confidence
        });
      }
      
      this.emit('format:detected', { 
        format: detection.format, 
        confidence: detection.confidence 
      });
      
      return detection.format;
      
    } catch (error) {
      this.log('error', `Format detection failed for ${file.name}`, { error });
      throw error;
    }
  }

  /**
   * Retourne les formats supportés
   */
  getSupportedFormats(): FormatInfo[] {
    const plugins = this.registry.getAllPlugins();
    return Array.from(plugins.values()).map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description || '',
      supportedExtensions: plugin.supportedExtensions,
      capabilities: plugin.capabilities,
      isBuiltIn: true // TODO: déterminer si built-in ou tiers
    }));
  }

  /**
   * Retourne les capacités d'un format
   */
  getFormatCapabilities(formatId: string): FormatCapabilities | null {
    const plugin = this.registry.getPlugin(formatId);
    return plugin ? plugin.capabilities : null;
  }

  // ================================
  // UTILITAIRES PRIVÉS
  // ================================

  /**
   * Résout le format à utiliser
   */
  private async resolveFormat(file: File, explicitFormat?: SupportedFormat): Promise<string> {
    if (explicitFormat) {
      // Vérifier que le plugin existe
      if (!this.registry.hasPlugin(explicitFormat)) {
        throw new Error(`Plugin not available for format: ${explicitFormat}`);
      }
      
      // Validation optionnelle du fichier
      const plugin = this.registry.getPlugin(explicitFormat)!;
      const validation = await plugin.validateFile(await file.arrayBuffer());
      
      if (!validation.isValid) {
        this.log('warn', `File validation failed for format ${explicitFormat}`, {
          errors: validation.errors
        });
      }
      
      return explicitFormat;
    }
    
    // Détection automatique
    if (!this.config.enableAutoDetection) {
      throw new Error('Format not specified and auto-detection disabled');
    }
    
    return this.detectFormat(file);
  }

  /**
   * Exécute une promesse avec timeout et annulation
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
      
      // Signal d'annulation
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Operation cancelled'));
        });
      }
      
      // Promesse principale
      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Configure les événements du registry
   */
  private setupRegistryEvents(): void {
    this.registry.onPluginRegistered = (plugin) => {
      this.log('debug', `Plugin registered in registry`, { plugin: plugin.id });
    };
    
    this.registry.onPluginUnregistered = (formatId) => {
      this.log('debug', `Plugin unregistered from registry`, { formatId });
    };
  }

  /**
   * Met à jour les métriques d'import
   */
  private updateImportMetrics(format: string, duration: number, success: boolean): void {
    this.metrics.totalImports++;
    if (!success) this.metrics.totalErrors++;
    
    const usage = this.metrics.formatsUsage.get(format) || 0;
    this.metrics.formatsUsage.set(format, usage + 1);
    
    // Moyenne mobile du temps de traitement
    this.metrics.avgProcessingTime = 
      (this.metrics.avgProcessingTime + duration) / 2;
  }

  /**
   * Met à jour les métriques d'export
   */
  private updateExportMetrics(format: string, duration: number, success: boolean): void {
    this.metrics.totalExports++;
    if (!success) this.metrics.totalErrors++;
    
    const usage = this.metrics.formatsUsage.get(format) || 0;
    this.metrics.formatsUsage.set(format, usage + 1);
  }

  /**
   * Démarrer la collecte de métriques
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.log('debug', 'Engine metrics', { ...this.metrics });
    }, this.config.metricsInterval);
  }

  /**
   * Utilitaires
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFileName(baseName: string, format: SupportedFormat): string {
    const extension = this.getFormatExtension(format);
    return `${baseName}.${extension}`;
  }

  private getFormatExtension(format: SupportedFormat): string {
    const plugin = this.registry.getPlugin(format);
    return plugin?.supportedExtensions[0]?.replace('.', '') || format;
  }

  private getDataSize(data: ArrayBuffer | string): number {
    if (typeof data === 'string') {
      return new Blob([data]).size;
    }
    return data.byteLength;
  }

  private getCurrentMemoryUsage(): number {
    // Estimation basique - remplacer par une vraie mesure si disponible
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  private log(level: string, message: string, data?: any): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.config.logLevel];
    const messageLevel = levels[level as keyof typeof levels];
    
    if (messageLevel >= currentLevel) {
      (console as any)[level](`[FormatEngine] ${message}`, data || '');
    }
  }

  // ================================
  // PUBLIC GETTERS
  // ================================

  /**
   * Retourne les métriques actuelles
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Retourne le nombre de jobs actifs
   */
  getActiveJobsCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Annule tous les jobs actifs
   */
  cancelAllJobs(): void {
    for (const controller of this.activeJobs.values()) {
      controller.abort();
    }
    this.activeJobs.clear();
  }

  /**
   * Ferme proprement l'engine
   */
  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down FormatEngine');
    
    // Annuler tous les jobs actifs
    this.cancelAllJobs();
    
    // Nettoyer les plugins
    const plugins = this.registry.getAllPlugins();
    for (const plugin of plugins.values()) {
      if (plugin.onUnregister) {
        try {
          await plugin.onUnregister();
        } catch (error) {
          this.log('error', `Error during plugin cleanup: ${plugin.id}`, { error });
        }
      }
    }
    
    // Supprimer tous les listeners
    this.removeAllListeners();
    
    this.log('info', 'FormatEngine shutdown complete');
  }
}