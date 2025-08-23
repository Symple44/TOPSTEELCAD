/**
 * ProcessingPipeline - Pipeline de traitement générique
 * 
 * Exécute une séquence de stages avec middleware et gestion d'erreurs
 */

import {
  ProcessingPipeline as IProcessingPipeline,
  PipelineStage,
  PipelineMiddleware,
  ProcessingContext,
  StageInfo,
  PipelineError,
  StageError
} from '../types/PipelineTypes';

/**
 * Configuration du pipeline
 */
export interface PipelineConfig {
  name: string;
  enableParallelStages?: boolean;
  stageTimeout?: number; // ms
  maxRetries?: number;
  abortOnError?: boolean;
  enableProfiling?: boolean;
}

/**
 * Implémentation du pipeline de traitement
 */
export class ProcessingPipeline<TInput, TOutput> implements IProcessingPipeline<TInput, TOutput> {
  readonly name: string;
  readonly stages: PipelineStage<any, any>[] = [];
  readonly middleware: PipelineMiddleware[] = [];
  
  private config: Required<PipelineConfig>;
  private isExecuting = false;
  private abortController?: AbortController;

  constructor(name: string, config: Partial<PipelineConfig> = {}) {
    this.name = name;
    this.config = {
      name,
      enableParallelStages: false,
      stageTimeout: 30000, // 30s par défaut
      maxRetries: 0,
      abortOnError: true,
      enableProfiling: true,
      ...config
    };
  }

  // ================================
  // CONSTRUCTION DU PIPELINE
  // ================================

  /**
   * Ajoute un stage au pipeline
   */
  addStage<TStageOutput>(stage: PipelineStage<any, TStageOutput>): ProcessingPipeline<any, TStageOutput> {
    if (this.isExecuting) {
      throw new PipelineError('Cannot add stages while pipeline is executing', this.name);
    }
    
    this.stages.push(stage);
    return this as any;
  }

  /**
   * Ajoute plusieurs stages
   */
  addStages(stages: PipelineStage<any, any>[]): this {
    stages.forEach(stage => this.addStage(stage));
    return this;
  }

  /**
   * Insère un stage à une position spécifique
   */
  insertStage(index: number, stage: PipelineStage<any, any>): this {
    if (this.isExecuting) {
      throw new PipelineError('Cannot insert stages while pipeline is executing', this.name);
    }
    
    if (index < 0 || index > this.stages.length) {
      throw new PipelineError(`Invalid stage index: ${index}`, this.name);
    }
    
    this.stages.splice(index, 0, stage);
    return this;
  }

  /**
   * Supprime un stage par nom
   */
  removeStage(stageName: string): boolean {
    if (this.isExecuting) {
      throw new PipelineError('Cannot remove stages while pipeline is executing', this.name);
    }
    
    const index = this.stages.findIndex(stage => stage.name === stageName);
    if (index !== -1) {
      this.stages.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Ajoute un middleware
   */
  use(middleware: PipelineMiddleware): void {
    if (this.isExecuting) {
      throw new PipelineError('Cannot add middleware while pipeline is executing', this.name);
    }
    
    this.middleware.push(middleware);
    
    // Trier par priorité (plus haut = premier)
    this.middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // ================================
  // EXÉCUTION DU PIPELINE
  // ================================

  /**
   * Exécute le pipeline
   */
  async execute(input: TInput, context: ProcessingContext): Promise<TOutput> {
    if (this.isExecuting) {
      throw new PipelineError('Pipeline is already executing', this.name);
    }
    
    if (this.stages.length === 0) {
      throw new PipelineError('Pipeline has no stages', this.name);
    }
    
    this.isExecuting = true;
    this.abortController = new AbortController();
    
    const executionStart = performance.now();
    context.addLog('info', `Starting pipeline execution: ${this.name}`, {
      stageCount: this.stages.length,
      middlewareCount: this.middleware.length
    });
    
    try {
      // Exécuter middleware "before"
      await this.executeMiddlewareHook('before', context);
      
      // Exécuter les stages
      let currentData: any = input;
      
      for (let i = 0; i < this.stages.length; i++) {
        // Vérifier l'annulation
        this.checkAborted();
        
        const stage = this.stages[i];
        const stageInfo: StageInfo = {
          index: i,
          name: stage.name,
          total: this.stages.length,
          startTime: performance.now()
        };
        
        context.setCurrentStage(stageInfo);
        
        try {
          currentData = await this.executeStage(stage, currentData, context);
          context.completeCurrentStage();
          
        } catch (error) {
          const stageError = new StageError(
            stage.name,
            error instanceof Error ? error.message : String(error),
            error instanceof Error ? error : undefined,
            { stageIndex: i, totalStages: this.stages.length }
          );
          
          // Exécuter onError du stage si disponible
          if (stage.onError) {
            try {
              await stage.onError(stageError, context);
            } catch (onErrorError) {
              context.addError(`Stage onError hook failed: ${onErrorError}`);
            }
          }
          
          // Gérer l'erreur selon la configuration
          if (this.config.abortOnError) {
            throw stageError;
          } else {
            context.addError(stageError.message);
            // Continuer avec les données actuelles
          }
        }
      }
      
      // Exécuter middleware "after"
      await this.executeMiddlewareHook('after', context);
      
      const executionTime = performance.now() - executionStart;
      context.addMetric('pipeline_total_duration', executionTime);
      context.addLog('info', `Pipeline execution completed: ${this.name}`, {
        duration: context.formatDuration(executionTime),
        success: true
      });
      
      return currentData;
      
    } catch (error) {
      const executionTime = performance.now() - executionStart;
      context.addMetric('pipeline_total_duration', executionTime);
      context.addMetric('pipeline_failed', true);
      
      // Exécuter middleware onError
      await this.executeMiddlewareHook('onError', context, error as Error);
      
      context.addLog('error', `Pipeline execution failed: ${this.name}`, {
        duration: context.formatDuration(executionTime),
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof PipelineError) {
        throw error;
      } else {
        throw new PipelineError(
          `Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`,
          this.name,
          error instanceof Error ? error : undefined
        );
      }
      
    } finally {
      this.isExecuting = false;
      this.abortController = undefined;
    }
  }

  /**
   * Annule l'exécution du pipeline
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // ================================
  // EXÉCUTION DES STAGES
  // ================================

  /**
   * Exécute un stage avec gestion d'erreurs et timeouts
   */
  private async executeStage(
    stage: PipelineStage<any, any>,
    input: any,
    context: ProcessingContext
  ): Promise<any> {
    context.addLog('debug', `Executing stage: ${stage.name}`, {
      description: stage.description
    });
    
    // Middleware onStageStart
    await this.executeMiddlewareHook('onStageStart', context, undefined, stage);
    
    // Exécuter onStart du stage si disponible
    if (stage.onStart) {
      try {
        await stage.onStart(context);
      } catch (error) {
        context.addWarning(`Stage onStart hook failed: ${error}`);
      }
    }
    
    // Validation préalable si disponible
    if (stage.validate) {
      const validation = await stage.validate(input);
      if (!validation.isValid) {
        throw new Error(`Stage validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        context.addWarnings(validation.warnings);
      }
    }
    
    // Exécuter le stage avec timeout et retry
    const output = await this.executeWithRetry(
      () => this.executeWithTimeout(
        stage.process(input, context),
        this.config.stageTimeout,
        `Stage ${stage.name} timed out`
      ),
      this.config.maxRetries,
      stage.name
    );
    
    // Exécuter onComplete du stage si disponible
    if (stage.onComplete) {
      try {
        await stage.onComplete(output, context);
      } catch (error) {
        context.addWarning(`Stage onComplete hook failed: ${error}`);
      }
    }
    
    // Middleware onStageComplete
    await this.executeMiddlewareHook('onStageComplete', context, undefined, stage);
    
    return output;
  }

  /**
   * Exécute une fonction avec timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeout);
      
      // Signal d'annulation
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Pipeline execution cancelled'));
        });
      }
      
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
   * Exécute une fonction avec retry
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          console.warn(`${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, error);
          // Attendre avant de recommencer (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError || new Error(`${context} failed after ${maxRetries + 1} attempts`);
  }

  /**
   * Exécute les hooks de middleware
   */
  private async executeMiddlewareHook(
    hookName: keyof PipelineMiddleware,
    context: ProcessingContext,
    error?: Error,
    stage?: PipelineStage<any, any>
  ): Promise<void> {
    for (const middleware of this.middleware) {
      const hook = middleware[hookName];
      if (typeof hook === 'function') {
        try {
          if (hookName === 'onStageStart' || hookName === 'onStageComplete') {
            await (hook as any)(stage, context);
          } else if (hookName === 'onError') {
            await (hook as any)(error, context);
          } else {
            await (hook as any)(context);
          }
        } catch (middlewareError) {
          context.addWarning(
            `Middleware ${middleware.name} hook ${hookName} failed: ${middlewareError}`
          );
        }
      }
    }
  }

  // ================================
  // INTROSPECTION
  // ================================

  /**
   * Retourne le nombre de stages
   */
  getStageCount(): number {
    return this.stages.length;
  }

  /**
   * Retourne les noms des stages
   */
  getStageNames(): string[] {
    return this.stages.map(stage => stage.name);
  }

  /**
   * Estime la durée totale d'exécution
   */
  getEstimatedDuration(): number {
    return this.stages.reduce((total, stage) => {
      return total + (stage.estimatedDuration || 1000); // 1s par défaut
    }, 0);
  }

  /**
   * Vérifie si le pipeline est valide
   */
  isValid(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.stages.length === 0) {
      errors.push('Pipeline has no stages');
    }
    
    // Vérifier les noms de stages uniques
    const stageNames = new Set<string>();
    for (const stage of this.stages) {
      if (stageNames.has(stage.name)) {
        errors.push(`Duplicate stage name: ${stage.name}`);
      }
      stageNames.add(stage.name);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Retourne les informations de configuration
   */
  getConfig(): Readonly<Required<PipelineConfig>> {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<PipelineConfig>): void {
    if (this.isExecuting) {
      throw new PipelineError('Cannot update config while pipeline is executing', this.name);
    }
    
    this.config = { ...this.config, ...updates };
  }

  // ================================
  // UTILITAIRES
  // ================================

  /**
   * Vérifie si le pipeline a été annulé
   */
  private checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error('Pipeline execution was cancelled');
    }
  }

  /**
   * Délai d'attente
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clone le pipeline (sans l'état d'exécution)
   */
  clone(newName?: string): ProcessingPipeline<TInput, TOutput> {
    const cloned = new ProcessingPipeline<TInput, TOutput>(
      newName || `${this.name}_clone`,
      this.config
    );
    
    // Copier les stages
    cloned.stages.push(...this.stages);
    
    // Copier les middleware
    cloned.middleware.push(...this.middleware);
    
    return cloned;
  }

  /**
   * Export pour débugage
   */
  toDebugInfo(): Record<string, any> {
    return {
      name: this.name,
      config: this.config,
      stageCount: this.stages.length,
      middlewareCount: this.middleware.length,
      stages: this.stages.map(stage => ({
        name: stage.name,
        description: stage.description,
        estimatedDuration: stage.estimatedDuration
      })),
      middleware: this.middleware.map(mw => ({
        name: mw.name,
        priority: mw.priority
      })),
      isExecuting: this.isExecuting,
      validation: this.isValid()
    };
  }
}