/**
 * BaseStage - Classe de base pour les stages de pipeline
 * 
 * Fournit une implémentation de base avec logging, métriques et hooks
 */

import {
  PipelineStage,
  ProcessingContext,
  ValidationResult
} from '../types/PipelineTypes';

/**
 * Configuration pour un stage de base
 */
export interface BaseStageConfig {
  enableProfiling?: boolean;
  enableValidation?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
}

/**
 * Classe de base abstraite pour tous les stages
 */
export abstract class BaseStage<TInput, TOutput> implements PipelineStage<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly description: string;
  readonly estimatedDuration?: number;
  
  protected config: Required<BaseStageConfig>;
  private executionCount = 0;
  private totalDuration = 0;
  private lastExecutionDuration = 0;

  constructor(config: BaseStageConfig = {}) {
    this.config = {
      enableProfiling: true,
      enableValidation: true,
      logLevel: 'info',
      timeout: 30000,
      ...config
    };
  }

  // ================================
  // MÉTHODE ABSTRAITE À IMPLÉMENTER
  // ================================

  /**
   * Traitement principal du stage - à implémenter dans les classes dérivées
   */
  abstract process(input: TInput, context: ProcessingContext): Promise<TOutput>;

  // ================================
  // LIFECYCLE HOOKS
  // ================================

  /**
   * Hook exécuté avant le traitement
   */
  async onStart(context: ProcessingContext): Promise<void> {
    if (this.shouldLog('info')) {
      context.addLog('info', `Starting stage: ${this.name}`, {
        description: this.description,
        estimatedDuration: this.estimatedDuration ? `${this.estimatedDuration}ms` : 'unknown'
      });
    }
    
    if (this.config.enableProfiling) {
      context.addMetric(`stage_${this.name}_start_time`, performance.now());
      this.executionCount++;
    }
  }

  /**
   * Hook exécuté après le traitement réussi
   */
  async onComplete(output: TOutput, context: ProcessingContext): Promise<void> {
    if (this.config.enableProfiling) {
      const endTime = performance.now();
      const startTime = context.getMetric<number>(`stage_${this.name}_start_time`) || endTime;
      this.lastExecutionDuration = endTime - startTime;
      this.totalDuration += this.lastExecutionDuration;
      
      context.addMetric(`stage_${this.name}_duration`, this.lastExecutionDuration);
      context.addMetric(`stage_${this.name}_execution_count`, this.executionCount);
      context.addMetric(`stage_${this.name}_avg_duration`, this.totalDuration / this.executionCount);
    }
    
    if (this.shouldLog('info')) {
      context.addLog('info', `Completed stage: ${this.name}`, {
        duration: this.config.enableProfiling ? `${this.lastExecutionDuration.toFixed(2)}ms` : 'unknown',
        outputType: this.getOutputType(output)
      });
    }
    
    // Validation de sortie optionnelle
    if (this.config.enableValidation) {
      const validation = await this.validateOutput(output, context);
      if (!validation.isValid) {
        context.addWarning(`Output validation warnings: ${validation.errors.join(', ')}`);
      }
    }
  }

  /**
   * Hook exécuté en cas d'erreur
   */
  async onError(error: Error, context: ProcessingContext): Promise<void> {
    if (this.config.enableProfiling) {
      context.addMetric(`stage_${this.name}_error_count`, 
        (context.getMetric<number>(`stage_${this.name}_error_count`) || 0) + 1
      );
    }
    
    context.addLog('error', `Stage failed: ${this.name}`, {
      error: error.message,
      stack: this.shouldLog('debug') ? error.stack : undefined
    });
    
    // Hook personnalisé pour nettoyage en cas d'erreur
    await this.onErrorCleanup(error, context);
  }

  // ================================
  // VALIDATION
  // ================================

  /**
   * Validation d'entrée (optionnelle)
   */
  async validate(input: TInput): Promise<ValidationResult> {
    if (!this.config.enableValidation) {
      return this.createValidationSuccess();
    }
    
    try {
      return await this.validateInput(input);
    } catch (error) {
      return this.createValidationError(
        `Input validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validation d'entrée spécifique - à surcharger si nécessaire
   */
  protected async validateInput(input: TInput): Promise<ValidationResult> {
    // Validation basique: vérifier que l'entrée n'est pas null/undefined
    if (input === null || input === undefined) {
      return this.createValidationError('Input cannot be null or undefined');
    }
    
    return this.createValidationSuccess();
  }

  /**
   * Validation de sortie spécifique - à surcharger si nécessaire
   */
  protected async validateOutput(output: TOutput, context: ProcessingContext): Promise<ValidationResult> {
    // Validation basique: vérifier que la sortie n'est pas null/undefined
    if (output === null || output === undefined) {
      return this.createValidationError('Output cannot be null or undefined');
    }
    
    return this.createValidationSuccess();
  }

  // ================================
  // MÉTHODES UTILITAIRES PROTÉGÉES
  // ================================

  /**
   * Log avec niveau configurable
   */
  protected log(context: ProcessingContext, level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.shouldLog(level)) {
      context.addLog(level, `[${this.name}] ${message}`, data);
    }
  }

  /**
   * Démarre un timer pour mesurer une opération
   */
  protected startTimer(): () => number {
    const startTime = performance.now();
    return () => performance.now() - startTime;
  }

  /**
   * Vérifie si un fichier/données correspond à un type attendu
   */
  protected checkInputType<T>(input: any, expectedType: string): input is T {
    if (typeof expectedType === 'string') {
      return typeof input === expectedType;
    }
    return input instanceof (expectedType as any);
  }

  /**
   * Crée un résultat de validation réussi
   */
  protected createValidationSuccess(warnings: string[] = []): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings
    };
  }

  /**
   * Crée un résultat de validation échoué
   */
  protected createValidationError(message: string, additionalErrors: string[] = []): ValidationResult {
    return {
      isValid: false,
      errors: [message, ...additionalErrors],
      warnings: []
    };
  }

  /**
   * Exécute une opération avec gestion d'erreurs et retry optionnel
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 0,
    retryDelay: number = 1000,
    context?: ProcessingContext
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          if (context) {
            this.log(context, 'warn', `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, {
              error: lastError.message,
              retryIn: retryDelay
            });
          }
          
          await this.delay(retryDelay);
          retryDelay *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Traite un batch d'éléments avec contrôle de concurrence
   */
  protected async processBatch<TItem, TResult>(
    items: TItem[],
    processor: (item: TItem, index: number) => Promise<TResult>,
    batchSize: number = 10,
    context?: ProcessingContext
  ): Promise<TResult[]> {
    const results: TResult[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      if (context) {
        this.log(context, 'debug', `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`, {
          batchSize: batch.length,
          totalItems: items.length
        });
      }
      
      const batchResults = await Promise.all(
        batch.map((item, batchIndex) => processor(item, i + batchIndex))
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Hook de nettoyage en cas d'erreur - à surcharger si nécessaire
   */
  protected async onErrorCleanup(error: Error, context: ProcessingContext): Promise<void> {
    // Implémentation par défaut: ne rien faire
    // Les classes dérivées peuvent surcharger pour nettoyer des ressources
  }

  // ================================
  // MÉTHODES PRIVÉES
  // ================================

  /**
   * Vérifie si on doit logger selon le niveau configuré
   */
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.config.logLevel];
  }

  /**
   * Détermine le type de sortie pour logging
   */
  private getOutputType(output: TOutput): string {
    if (output === null) return 'null';
    if (output === undefined) return 'undefined';
    if (Array.isArray(output)) return `Array<${output.length}>`;
    if (typeof output === 'object') return output.constructor.name;
    return typeof output;
  }

  /**
   * Délai d'attente
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ================================
  // GETTERS PUBLICS
  // ================================

  /**
   * Retourne les statistiques d'exécution
   */
  getExecutionStats(): {
    executionCount: number;
    totalDuration: number;
    lastExecutionDuration: number;
    averageDuration: number;
  } {
    return {
      executionCount: this.executionCount,
      totalDuration: this.totalDuration,
      lastExecutionDuration: this.lastExecutionDuration,
      averageDuration: this.executionCount > 0 ? this.totalDuration / this.executionCount : 0
    };
  }

  /**
   * Retourne la configuration actuelle
   */
  getConfig(): Readonly<Required<BaseStageConfig>> {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<BaseStageConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset des statistiques
   */
  resetStats(): void {
    this.executionCount = 0;
    this.totalDuration = 0;
    this.lastExecutionDuration = 0;
  }

  /**
   * Export pour débugage
   */
  toDebugInfo(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      estimatedDuration: this.estimatedDuration,
      config: this.config,
      stats: this.getExecutionStats()
    };
  }
}