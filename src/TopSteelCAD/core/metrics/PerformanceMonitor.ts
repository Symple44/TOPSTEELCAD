/**
 * PerformanceMonitor - Surveillance des performances et métriques
 * Collecte et analyse les métriques de performance en temps réel
 */

import { Logger } from '../../utils/logger';

/**
 * Type de métrique
 */
export enum MetricType {
  TIMING = 'timing',
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram'
}

/**
 * Métrique de base
 */
interface Metric {
  name: string;
  type: MetricType;
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

/**
 * Métrique de timing
 */
interface TimingMetric extends Metric {
  type: MetricType.TIMING;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Seuils d'alerte
 */
interface AlertThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  callback?: (metric: Metric) => void;
}

/**
 * Statistiques agrégées
 */
interface AggregatedStats {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Configuration du moniteur
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  sampleRate: number;
  retentionPeriod: number;
  flushInterval: number;
  maxMetrics: number;
}

/**
 * Moniteur de performance
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceMonitorConfig;
  private metrics: Map<string, Metric[]> = new Map();
  private timers: Map<string, number> = new Map();
  private thresholds: AlertThreshold[] = [];
  private flushTimer?: NodeJS.Timeout;
  private startupTime: number = Date.now();
  
  private constructor(config?: Partial<PerformanceMonitorConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      retentionPeriod: 3600000, // 1 heure
      flushInterval: 60000,     // 1 minute
      maxMetrics: 10000,
      ...config
    };
    
    if (this.config.enabled) {
      this.startFlushTimer();
      this.initializeBuiltInMetrics();
    }
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(config?: Partial<PerformanceMonitorConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Démarre un timer
   */
  startTimer(name: string, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    const key = this.generateKey(name, tags);
    this.timers.set(key, performance.now());
  }
  
  /**
   * Arrête un timer et enregistre la durée
   */
  endTimer(name: string, tags?: Record<string, string>): number {
    if (!this.shouldSample()) return 0;
    
    const key = this.generateKey(name, tags);
    const startTime = this.timers.get(key);
    
    if (!startTime) {
      Logger.warn(`Timer ${name} was not started`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.timers.delete(key);
    
    const metric: TimingMetric = {
      name,
      type: MetricType.TIMING,
      timestamp: Date.now(),
      value: duration,
      startTime,
      endTime,
      duration,
      tags
    };
    
    this.recordMetric(metric);
    
    return duration;
  }
  
  /**
   * Mesure le temps d'exécution d'une fonction
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    this.startTimer(name, tags);
    
    try {
      const result = await fn();
      this.endTimer(name, tags);
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, status: 'error' });
      throw error;
    }
  }
  
  /**
   * Incrémente un compteur
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    const metric: Metric = {
      name,
      type: MetricType.COUNTER,
      timestamp: Date.now(),
      value,
      tags
    };
    
    this.recordMetric(metric);
  }
  
  /**
   * Enregistre une valeur de gauge
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    const metric: Metric = {
      name,
      type: MetricType.GAUGE,
      timestamp: Date.now(),
      value,
      tags
    };
    
    this.recordMetric(metric);
  }
  
  /**
   * Enregistre une valeur dans un histogramme
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    const metric: Metric = {
      name,
      type: MetricType.HISTOGRAM,
      timestamp: Date.now(),
      value,
      tags
    };
    
    this.recordMetric(metric);
  }
  
  /**
   * Définit un seuil d'alerte
   */
  setThreshold(threshold: AlertThreshold): void {
    this.thresholds.push(threshold);
  }
  
  /**
   * Obtient les statistiques agrégées
   */
  getStats(metricName?: string): AggregatedStats[] {
    const stats: AggregatedStats[] = [];
    
    const metricsToProcess = metricName
      ? [metricName]
      : Array.from(this.metrics.keys());
    
    for (const name of metricsToProcess) {
      const metricList = this.metrics.get(name);
      if (!metricList || metricList.length === 0) continue;
      
      const values = metricList.map(m => m.value).sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      stats.push({
        name,
        count: values.length,
        sum,
        min: values[0],
        max: values[values.length - 1],
        avg: sum / values.length,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99)
      });
    }
    
    return stats;
  }
  
  /**
   * Obtient les métriques brutes
   */
  getRawMetrics(metricName?: string, since?: number): Metric[] {
    const result: Metric[] = [];
    const cutoff = since || 0;
    
    if (metricName) {
      const metricList = this.metrics.get(metricName) || [];
      result.push(...metricList.filter(m => m.timestamp >= cutoff));
    } else {
      for (const metricList of this.metrics.values()) {
        result.push(...metricList.filter(m => m.timestamp >= cutoff));
      }
    }
    
    return result;
  }
  
  /**
   * Obtient les métriques de performance système
   */
  getSystemMetrics(): {
    uptime: number;
    memoryUsage: number;
    metricCount: number;
    timerCount: number;
  } {
    const memoryUsage = typeof performance !== 'undefined' && 
                       'memory' in performance
      ? (performance as any).memory?.usedJSHeapSize || 0
      : 0;
    
    return {
      uptime: Date.now() - this.startupTime,
      memoryUsage,
      metricCount: this.getTotalMetricCount(),
      timerCount: this.timers.size
    };
  }
  
  /**
   * Exporte les métriques au format JSON
   */
  export(): string {
    const stats = this.getStats();
    const system = this.getSystemMetrics();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      system,
      statistics: stats,
      recentMetrics: this.getRawMetrics(undefined, Date.now() - 60000)
    }, null, 2);
  }
  
  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
    Logger.info('Performance metrics reset');
  }
  
  /**
   * Enregistre une métrique
   */
  private recordMetric(metric: Metric): void {
    if (!this.config.enabled) return;
    
    const key = metric.name;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricList = this.metrics.get(key)!;
    metricList.push(metric);
    
    // Vérifier les seuils
    this.checkThresholds(metric);
    
    // Limiter la taille si nécessaire
    if (this.getTotalMetricCount() > this.config.maxMetrics) {
      this.pruneOldMetrics();
    }
  }
  
  /**
   * Vérifie les seuils d'alerte
   */
  private checkThresholds(metric: Metric): void {
    for (const threshold of this.thresholds) {
      if (threshold.metric !== metric.name) continue;
      
      let triggered = false;
      
      switch (threshold.operator) {
        case 'gt':
          triggered = metric.value > threshold.threshold;
          break;
        case 'lt':
          triggered = metric.value < threshold.threshold;
          break;
        case 'gte':
          triggered = metric.value >= threshold.threshold;
          break;
        case 'lte':
          triggered = metric.value <= threshold.threshold;
          break;
        case 'eq':
          triggered = metric.value === threshold.threshold;
          break;
      }
      
      if (triggered) {
        Logger.warn(`Threshold alert: ${metric.name} = ${metric.value} ${threshold.operator} ${threshold.threshold}`);
        
        if (threshold.callback) {
          threshold.callback(metric);
        }
      }
    }
  }
  
  /**
   * Supprime les métriques anciennes
   */
  private pruneOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    for (const [key, metricList] of this.metrics) {
      const filtered = metricList.filter(m => m.timestamp > cutoff);
      
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
  }
  
  /**
   * Détermine si on doit échantillonner
   */
  private shouldSample(): boolean {
    return this.config.enabled && Math.random() < this.config.sampleRate;
  }
  
  /**
   * Génère une clé unique
   */
  private generateKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `${name}[${tagString}]`;
  }
  
  /**
   * Calcule un percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  /**
   * Obtient le nombre total de métriques
   */
  private getTotalMetricCount(): number {
    let count = 0;
    for (const metricList of this.metrics.values()) {
      count += metricList.length;
    }
    return count;
  }
  
  /**
   * Démarre le timer de flush
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  /**
   * Flush les métriques
   */
  private flush(): void {
    this.pruneOldMetrics();
    
    // Log un résumé périodique
    const stats = this.getStats();
    if (stats.length > 0) {
      Logger.debug('Performance metrics summary', {
        metricCount: stats.length,
        totalMeasurements: this.getTotalMetricCount()
      });
    }
  }
  
  /**
   * Initialise les métriques intégrées
   */
  private initializeBuiltInMetrics(): void {
    // Surveiller la mémoire toutes les 10 secondes
    setInterval(() => {
      const system = this.getSystemMetrics();
      this.gauge('system.memory.usage', system.memoryUsage);
      this.gauge('system.uptime', system.uptime);
      this.gauge('system.metrics.count', system.metricCount);
    }, 10000);
  }
  
  /**
   * Arrête le moniteur
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }
}

// Instance globale
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Décorateur pour mesurer automatiquement les performances
 */
export function Measure(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = async function (...args: unknown[]) {
      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args)
      );
    };
    
    return descriptor;
  };
}

/**
 * Helper pour créer un timer scope
 */
export class TimerScope {
  private name: string;
  private tags?: Record<string, string>;
  
  constructor(name: string, tags?: Record<string, string>) {
    this.name = name;
    this.tags = tags;
    performanceMonitor.startTimer(name, tags);
  }
  
  end(): number {
    return performanceMonitor.endTimer(this.name, this.tags);
  }
}