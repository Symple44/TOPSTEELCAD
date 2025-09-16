/**
 * ProcessingContext - Contexte d'exécution pour les pipelines
 * 
 * Centralise l'état, les logs, métriques et données partagées
 * pendant l'exécution d'un pipeline de traitement
 */

import { 
  ProcessingContext as IProcessingContext,
  StageInfo,
  LogEntry,
  LogLevel 
} from '../types/PipelineTypes';

/**
 * Implémentation du contexte de traitement
 */
export class ProcessingContext implements IProcessingContext {
  readonly file?: File;
  readonly options: Record<string, any>;
  readonly startTime: number;
  
  // État du pipeline
  currentStage?: StageInfo;
  progress: number = 0;
  
  // Collecte de données
  errors: string[] = [];
  warnings: string[] = [];
  logs: LogEntry[] = [];
  metrics = new Map<string, any>();
  
  // Données partagées entre stages
  private sharedData = new Map<string, any>();
  
  // Configuration
  private maxLogsCount: number = 1000;
  private enableDebugLogs: boolean = false;

  constructor(
    file?: File, 
    options: Record<string, any> = {}, 
    startTime: number = performance.now()
  ) {
    this.file = file;
    this.options = options;
    this.startTime = startTime;
    
    // Configuration depuis les options
    if (options.maxLogsCount) this.maxLogsCount = options.maxLogsCount;
    if (options.enableDebugLogs) this.enableDebugLogs = options.enableDebugLogs;
    
    this.addLog('info', 'Processing context initialized', {
      file: file?.name,
      fileSize: file?.size,
      options: Object.keys(options)
    });
  }

  // ================================
  // GESTION DES ERREURS ET WARNINGS
  // ================================

  /**
   * Ajoute une erreur
   */
  addError(error: string): void {
    this.errors.push(error);
    this.addLog('error', error);
    
    // Émettre un événement si nécessaire
    this.notifyError(error);
  }

  /**
   * Ajoute un warning
   */
  addWarning(warning: string): void {
    this.warnings.push(warning);
    this.addLog('warn', warning);
  }

  /**
   * Ajoute plusieurs erreurs
   */
  addErrors(errors: string[]): void {
    errors.forEach(error => this.addError(error));
  }

  /**
   * Ajoute plusieurs warnings
   */
  addWarnings(warnings: string[]): void {
    warnings.forEach(warning => this.addWarning(warning));
  }

  /**
   * Vérifie s'il y a des erreurs
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Vérifie s'il y a des warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Retourne un résumé des problèmes
   */
  getProblemsSummary(): string {
    const errorCount = this.errors.length;
    const warningCount = this.warnings.length;
    
    if (errorCount === 0 && warningCount === 0) {
      return 'No problems detected';
    }
    
    const parts: string[] = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  }

  // ================================
  // GESTION DES LOGS
  // ================================

  /**
   * Ajoute un log
   */
  addLog(level: LogLevel, message: string, data?: any): void {
    // Filtrer les logs debug si désactivés
    if (level === 'debug' && !this.enableDebugLogs) {
      return;
    }
    
    const logEntry: LogEntry = {
      timestamp: performance.now(),
      level,
      message,
      data,
      stage: this.currentStage?.name
    };
    
    this.logs.push(logEntry);
    
    // Maintenir la limite de logs
    if (this.logs.length > this.maxLogsCount) {
      this.logs.shift(); // Supprimer le plus ancien
    }
    
    // Console output selon le niveau
    this.outputToConsole(logEntry);
  }

  /**
   * Raccourcis pour les différents niveaux de log
   */
  debug(message: string, data?: any): void {
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.addLog('error', message, data);
  }

  /**
   * Filtre les logs par niveau
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Filtre les logs par stage
   */
  getLogsByStage(stageName: string): LogEntry[] {
    return this.logs.filter(log => log.stage === stageName);
  }

  /**
   * Retourne les logs récents
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  // ================================
  // GESTION DES MÉTRIQUES
  // ================================

  /**
   * Ajoute une métrique
   */
  addMetric(key: string, value: any): void {
    this.metrics.set(key, value);
    this.addLog('debug', `Metric recorded: ${key}`, { value });
  }

  /**
   * Incrémente une métrique numérique
   */
  incrementMetric(key: string, increment: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + increment);
  }

  /**
   * Ajoute une métrique de timing
   */
  addTimingMetric(key: string, startTime: number, endTime: number = performance.now()): void {
    const duration = endTime - startTime;
    this.addMetric(`${key}_duration`, duration);
    this.addMetric(`${key}_start`, startTime);
    this.addMetric(`${key}_end`, endTime);
  }

  /**
   * Démarre un timer pour une métrique
   */
  startTimer(key: string): () => void {
    const startTime = performance.now();
    this.addMetric(`${key}_start`, startTime);
    
    return () => {
      this.addTimingMetric(key, startTime);
    };
  }

  /**
   * Récupère une métrique
   */
  getMetric<T>(key: string): T | undefined {
    return this.metrics.get(key);
  }

  /**
   * Vérifie si une métrique existe
   */
  hasMetric(key: string): boolean {
    return this.metrics.has(key);
  }

  /**
   * Exporte toutes les métriques
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.metrics) {
      result[key] = value;
    }
    return result;
  }

  // ================================
  // GESTION DU PROGRÈS
  // ================================

  /**
   * Met à jour le progrès (0-100)
   */
  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(100, progress));
    this.addMetric('progress', this.progress);
    
    if (this.currentStage) {
      this.addLog('debug', `Progress: ${this.progress.toFixed(1)}%`, {
        stage: this.currentStage.name,
        stageIndex: this.currentStage.index + 1,
        totalStages: this.currentStage.total
      });
    }
  }

  /**
   * Calcule le progrès automatiquement basé sur le stage courant
   */
  updateProgressFromStage(): void {
    if (!this.currentStage) return;
    
    const stageProgress = (this.currentStage.index / this.currentStage.total) * 100;
    this.setProgress(stageProgress);
  }

  /**
   * Met à jour le stage courant
   */
  setCurrentStage(stage: StageInfo): void {
    this.currentStage = stage;
    this.updateProgressFromStage();
    
    this.addLog('info', `Starting stage: ${stage.name}`, {
      stageIndex: stage.index + 1,
      totalStages: stage.total
    });
  }

  /**
   * Marque un stage comme terminé
   */
  completeCurrentStage(): void {
    if (!this.currentStage) return;
    
    const duration = performance.now() - this.currentStage.startTime;
    
    this.addLog('info', `Completed stage: ${this.currentStage.name}`, {
      duration: `${duration.toFixed(2)}ms`
    });
    
    this.addMetric(`stage_${this.currentStage.name}_duration`, duration);
    
    // Mettre à jour le progrès
    const newProgress = ((this.currentStage.index + 1) / this.currentStage.total) * 100;
    this.setProgress(newProgress);
  }

  // ================================
  // DONNÉES PARTAGÉES
  // ================================

  /**
   * Stocke des données partagées entre stages
   */
  setSharedData(key: string, value: any): void {
    this.sharedData.set(key, value);
    this.addLog('debug', `Shared data set: ${key}`, { hasValue: value !== undefined });
  }

  /**
   * Récupère des données partagées
   */
  getSharedData<T>(key: string): T | undefined {
    return this.sharedData.get(key);
  }

  /**
   * Vérifie si des données partagées existent
   */
  hasSharedData(key: string): boolean {
    return this.sharedData.has(key);
  }

  /**
   * Supprime des données partagées
   */
  removeSharedData(key: string): boolean {
    const existed = this.sharedData.delete(key);
    if (existed) {
      this.addLog('debug', `Shared data removed: ${key}`);
    }
    return existed;
  }

  /**
   * Exporte toutes les données partagées
   */
  getAllSharedData(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.sharedData) {
      result[key] = value;
    }
    return result;
  }

  // ================================
  // UTILITAIRES DE TEMPS
  // ================================

  /**
   * Retourne le temps écoulé depuis le début
   */
  getElapsedTime(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Retourne le temps écoulé depuis le début du stage courant
   */
  getStageElapsedTime(): number {
    if (!this.currentStage) return 0;
    return performance.now() - this.currentStage.startTime;
  }

  /**
   * Formate une durée en chaîne lisible
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(2)}ms`;
    }
    
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  }

  // ================================
  // EXPORT ET DÉBUGAGE
  // ================================

  /**
   * Exporte un résumé complet du contexte
   */
  getSummary(): {
    file?: { name: string; size: number };
    duration: string;
    progress: number;
    stage?: { name: string; index: number; total: number };
    problems: { errors: number; warnings: number };
    metrics: number;
    logs: number;
    sharedData: number;
  } {
    return {
      file: this.file ? { name: this.file.name, size: this.file.size } : undefined,
      duration: this.formatDuration(this.getElapsedTime()),
      progress: this.progress,
      stage: this.currentStage ? {
        name: this.currentStage.name,
        index: this.currentStage.index + 1,
        total: this.currentStage.total
      } : undefined,
      problems: {
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      metrics: this.metrics.size,
      logs: this.logs.length,
      sharedData: this.sharedData.size
    };
  }

  /**
   * Retourne les informations de debug (alias pour getSummary)
   */
  toDebugInfo(): any {
    return {
      ...this.getSummary(),
      errors: this.errors,
      warnings: this.warnings,
      recentLogs: this.getRecentLogs(20)
    };
  }

  /**
   * Exporte toutes les données pour débugage
   */
  toDebugObject(): Record<string, any> {
    return {
      file: this.file ? {
        name: this.file.name,
        size: this.file.size,
        type: this.file.type,
        lastModified: this.file.lastModified
      } : null,
      options: this.options,
      startTime: this.startTime,
      elapsedTime: this.getElapsedTime(),
      currentStage: this.currentStage,
      progress: this.progress,
      errors: this.errors,
      warnings: this.warnings,
      logs: this.logs,
      metrics: this.getAllMetrics(),
      sharedData: this.getAllSharedData()
    };
  }

  // ================================
  // MÉTHODES PRIVÉES
  // ================================

  /**
   * Affiche les logs dans la console
   */
  private outputToConsole(logEntry: LogEntry): void {
    const prefix = `[${logEntry.stage || 'Pipeline'}]`;
    const message = `${prefix} ${logEntry.message}`;
    
    switch (logEntry.level) {
      case 'debug':
        console.debug(message, logEntry.data || '');
        break;
      case 'info':
        console.info(message, logEntry.data || '');
        break;
      case 'warn':
        console.warn(message, logEntry.data || '');
        break;
      case 'error':
        console.error(message, logEntry.data || '');
        break;
    }
  }

  /**
   * Notifie une erreur (hook pour extensions futures)
   */
  private notifyError(_error: string): void {
    // Hook pour notifications externes
    // Peut être étendu pour envoyer des événements, etc.
  }

  // ================================
  // NETTOYAGE
  // ================================

  /**
   * Nettoie le contexte
   */
  cleanup(): void {
    this.addLog('debug', 'Context cleanup initiated');
    
    // Vider les grandes collections pour libérer la mémoire
    if (this.logs.length > 100) {
      this.logs.splice(0, this.logs.length - 100); // Garder seulement les 100 derniers
    }
    
    this.addLog('debug', 'Context cleanup completed');
  }
}