/**
 * PerformanceMonitor.ts - Monitoring de performance pour l'architecture de coupe
 * Collecte et analyse les métriques de performance en temps réel
 */

import { Feature, FeatureType } from '../types/CoreTypes';
import { CutType } from '../types/CutTypes';
import { ICutHandler } from '../types/ICutHandler';

/**
 * Métriques de performance pour une opération
 */
interface PerformanceMetric {
  operation: string;
  handler?: string;
  cutType?: CutType;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

/**
 * Statistiques agrégées
 */
interface AggregatedStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  medianDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  operationsByHandler: Map<string, number>;
  operationsByCutType: Map<CutType, number>;
  errorRate: number;
  throughput: number; // Operations per second
}

/**
 * Configuration du monitor
 */
export interface MonitorConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of operations to track
  maxMetrics: number; // Maximum metrics to keep in memory
  flushInterval: number; // Interval to flush metrics (ms)
  aggregationInterval: number; // Interval for aggregation (ms)
  persistMetrics: boolean; // Save to localStorage
  alertThresholds: {
    errorRate: number; // Alert if error rate exceeds this
    p95Duration: number; // Alert if p95 exceeds this (ms)
    throughput: number; // Alert if throughput drops below this
  };
}

/**
 * Monitor de performance singleton
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private config: MonitorConfig;
  private startTime: number;
  private flushTimer?: NodeJS.Timeout;
  private aggregationTimer?: NodeJS.Timeout;
  private listeners: ((stats: AggregatedStats) => void)[] = [];

  private constructor(config?: Partial<MonitorConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      maxMetrics: 10000,
      flushInterval: 60000, // 1 minute
      aggregationInterval: 5000, // 5 seconds
      persistMetrics: false,
      alertThresholds: {
        errorRate: 0.05, // 5%
        p95Duration: 1000, // 1 second
        throughput: 0.1 // 0.1 ops/sec minimum
      },
      ...config
    };
    
    this.startTime = Date.now();
    
    if (this.config.enabled) {
      this.startTimers();
    }
  }

  /**
   * Obtient l'instance singleton
   */
  static getInstance(config?: Partial<MonitorConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Enregistre le début d'une opération
   */
  startOperation(operation: string, metadata?: any): string {
    if (!this.shouldSample()) return '';
    
    const id = `${operation}-${Date.now()}-${Math.random()}`;
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      success: false,
      metadata
    };
    
    // Stocker temporairement avec l'ID
    (metric as any).id = id;
    this.metrics.push(metric);
    
    // Nettoyer si trop de métriques
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }
    
    return id;
  }

  /**
   * Enregistre la fin d'une opération
   */
  endOperation(id: string, success: boolean = true, error?: string): void {
    if (!id) return;
    
    const metric = this.metrics.find((m: any) => m.id === id);
    if (!metric) return;
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    
    // Supprimer l'ID temporaire
    delete (metric as any).id;
    
    // Vérifier les seuils d'alerte
    this.checkAlerts(metric);
  }

  /**
   * Mesure une opération complète
   */
  measure<T>(
    operation: string,
    fn: () => T,
    metadata?: any
  ): T {
    const id = this.startOperation(operation, metadata);
    
    try {
      const result = fn();
      this.endOperation(id, true);
      return result;
    } catch (error) {
      this.endOperation(id, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Mesure une opération asynchrone
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const id = this.startOperation(operation, metadata);
    
    try {
      const result = await fn();
      this.endOperation(id, true);
      return result;
    } catch (error) {
      this.endOperation(id, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Enregistre une métrique de handler
   */
  recordHandlerMetric(
    handler: ICutHandler,
    feature: Feature,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.shouldSample()) return;
    
    const metric: PerformanceMetric = {
      operation: 'handler.process',
      handler: handler.name,
      cutType: (feature.parameters as any).cutType,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      success,
      error,
      metadata: {
        featureId: feature.id,
        featureType: feature.type,
        priority: handler.priority
      }
    };
    
    this.metrics.push(metric);
    this.checkAlerts(metric);
  }

  /**
   * Obtient les statistiques agrégées
   */
  getAggregatedStats(timeWindow?: number): AggregatedStats {
    const now = performance.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantMetrics = this.metrics.filter(m => m.endTime > windowStart);
    
    if (relevantMetrics.length === 0) {
      return this.getEmptyStats();
    }
    
    const successfulMetrics = relevantMetrics.filter(m => m.success);
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);
    
    const operationsByHandler = new Map<string, number>();
    const operationsByCutType = new Map<CutType, number>();
    
    relevantMetrics.forEach(m => {
      if (m.handler) {
        operationsByHandler.set(m.handler, (operationsByHandler.get(m.handler) || 0) + 1);
      }
      if (m.cutType) {
        operationsByCutType.set(m.cutType, (operationsByCutType.get(m.cutType) || 0) + 1);
      }
    });
    
    const timeRange = (relevantMetrics[relevantMetrics.length - 1].endTime - relevantMetrics[0].startTime) / 1000;
    
    return {
      totalOperations: relevantMetrics.length,
      successfulOperations: successfulMetrics.length,
      failedOperations: relevantMetrics.length - successfulMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
      medianDuration: durations[Math.floor(durations.length / 2)] || 0,
      minDuration: durations[0] || 0,
      maxDuration: durations[durations.length - 1] || 0,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
      operationsByHandler,
      operationsByCutType,
      errorRate: (relevantMetrics.length - successfulMetrics.length) / relevantMetrics.length,
      throughput: relevantMetrics.length / timeRange
    };
  }

  /**
   * Obtient les métriques brutes
   */
  getRawMetrics(limit?: number): PerformanceMetric[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Obtient un rapport de performance
   */
  generateReport(): string {
    const stats = this.getAggregatedStats();
    const uptime = (Date.now() - this.startTime) / 1000;
    
    const report = [
      '=== Performance Report ===',
      `Uptime: ${uptime.toFixed(1)}s`,
      `Total Operations: ${stats.totalOperations}`,
      `Success Rate: ${((1 - stats.errorRate) * 100).toFixed(2)}%`,
      `Throughput: ${stats.throughput.toFixed(2)} ops/sec`,
      '',
      '=== Timing Statistics ===',
      `Average: ${stats.averageDuration.toFixed(2)}ms`,
      `Median: ${stats.medianDuration.toFixed(2)}ms`,
      `Min: ${stats.minDuration.toFixed(2)}ms`,
      `Max: ${stats.maxDuration.toFixed(2)}ms`,
      `P95: ${stats.p95Duration.toFixed(2)}ms`,
      `P99: ${stats.p99Duration.toFixed(2)}ms`,
      '',
      '=== Handler Distribution ===',
      ...Array.from(stats.operationsByHandler.entries())
        .sort(([,a], [,b]) => b - a)
        .map(([handler, count]) => `${handler}: ${count} operations`),
      '',
      '=== Cut Type Distribution ===',
      ...Array.from(stats.operationsByCutType.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => `${type}: ${count} operations`)
    ];
    
    return report.join('\n');
  }

  /**
   * Ajoute un listener pour les statistiques
   */
  addStatsListener(listener: (stats: AggregatedStats) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Supprime un listener
   */
  removeStatsListener(listener: (stats: AggregatedStats) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }

  /**
   * Active/désactive le monitoring
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (enabled) {
      this.startTimers();
    } else {
      this.stopTimers();
    }
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Redémarrer les timers si nécessaire
    if (this.config.enabled) {
      this.stopTimers();
      this.startTimers();
    }
  }

  /**
   * Exporte les métriques
   */
  exportMetrics(): string {
    return JSON.stringify({
      config: this.config,
      metrics: this.metrics,
      aggregatedStats: this.getAggregatedStats(),
      report: this.generateReport(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Détermine si une opération doit être échantillonnée
   */
  private shouldSample(): boolean {
    if (!this.config.enabled) return false;
    if (this.config.sampleRate === 1) return true;
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Vérifie les alertes
   */
  private checkAlerts(metric: PerformanceMetric): void {
    const thresholds = this.config.alertThresholds;
    
    // Alerte sur la durée
    if (metric.duration > thresholds.p95Duration) {
      console.warn(`⚠️ Performance Alert: Operation '${metric.operation}' took ${metric.duration.toFixed(2)}ms (threshold: ${thresholds.p95Duration}ms)`);
    }
    
    // Alerte sur les erreurs
    if (!metric.success) {
      const recentMetrics = this.metrics.slice(-100);
      const errorCount = recentMetrics.filter(m => !m.success).length;
      const errorRate = errorCount / recentMetrics.length;
      
      if (errorRate > thresholds.errorRate) {
        console.warn(`⚠️ Error Rate Alert: ${(errorRate * 100).toFixed(2)}% (threshold: ${(thresholds.errorRate * 100).toFixed(2)}%)`);
      }
    }
  }

  /**
   * Démarre les timers
   */
  private startTimers(): void {
    // Timer de flush
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
    
    // Timer d'agrégation
    if (this.config.aggregationInterval > 0) {
      this.aggregationTimer = setInterval(() => {
        this.notifyListeners();
      }, this.config.aggregationInterval);
    }
  }

  /**
   * Arrête les timers
   */
  private stopTimers(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }
  }

  /**
   * Flush les métriques
   */
  private flush(): void {
    if (this.config.persistMetrics && typeof localStorage !== 'undefined') {
      try {
        const key = `cut-performance-metrics-${new Date().toISOString()}`;
        localStorage.setItem(key, JSON.stringify(this.metrics));
        
        // Nettoyer les anciennes métriques
        const keys = Object.keys(localStorage).filter(k => k.startsWith('cut-performance-metrics-'));
        if (keys.length > 10) {
          keys.slice(0, -10).forEach(k => localStorage.removeItem(k));
        }
      } catch (error) {
        console.error('Failed to persist metrics:', error);
      }
    }
    
    // Conserver seulement les métriques récentes
    const cutoff = performance.now() - 300000; // 5 minutes
    this.metrics = this.metrics.filter(m => m.endTime > cutoff);
  }

  /**
   * Notifie les listeners
   */
  private notifyListeners(): void {
    if (this.listeners.length === 0) return;
    
    const stats = this.getAggregatedStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in stats listener:', error);
      }
    });
  }

  /**
   * Retourne des statistiques vides
   */
  private getEmptyStats(): AggregatedStats {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      medianDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      operationsByHandler: new Map(),
      operationsByCutType: new Map(),
      errorRate: 0,
      throughput: 0
    };
  }
}

// Export singleton
export const performanceMonitor = PerformanceMonitor.getInstance();