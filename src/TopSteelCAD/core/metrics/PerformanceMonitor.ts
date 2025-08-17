/**
 * PerformanceMonitor - Système de métriques pour monitoring performance
 * Collecte et analyse les métriques de performance en temps réel
 */

import { logger, createModuleLogger } from '../../utils/Logger';

/**
 * Types de métriques
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Métrique de base
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Statistiques d'une métrique
 */
export interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Configuration du moniteur
 */
export interface MonitorConfig {
  enabled: boolean;
  sampleRate: number;
  maxMetrics: number;
  flushInterval: number;
  enableAutoReport: boolean;
}

/**
 * Moniteur de performance
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: MonitorConfig;
  private metrics: Map<string, Metric[]>;
  private timers: Map<string, number>;
  private log = createModuleLogger('PerformanceMonitor');
  private flushTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      maxMetrics: 10000,
      flushInterval: 60000, // 1 minute
      enableAutoReport: true
    };
    
    this.metrics = new Map();
    this.timers = new Map();
    
    this.startFlushTimer();
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Configure le moniteur
   */
  configure(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled) {
      this.startFlushTimer();
    } else {
      this.stopFlushTimer();
    }
  }
  
  /**
   * Incrémente un compteur
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Enregistre une gauge (valeur instantanée)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Enregistre une valeur dans un histogramme
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Démarre un timer
   */
  startTimer(name: string): () => void {
    const startTime = performance.now();
    
    // Retourne une fonction pour arrêter le timer
    return () => {
      const duration = performance.now() - startTime;
      this.timer(name, duration);
    };
  }
  
  /**
   * Enregistre une durée
   */
  timer(name: string, duration: number, tags?: Record<string, string>): void {
    if (!this.shouldSample()) return;
    
    this.recordMetric({
      name,
      type: MetricType.TIMER,
      value: duration,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Mesure une fonction
   */
  async measure<T>(
    name: string, 
    fn: () => T | Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const stop = this.startTimer(name);
    
    try {
      const result = await fn();
      stop();
      return result;
    } catch (error) {
      stop();
      this.increment(`${name}.error`, 1, tags);
      throw error;
    }
  }
  
  /**
   * Obtient les statistiques d'une métrique
   */
  getStats(name: string): MetricStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    
    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count,
      sum,
      min: values[0],
      max: values[count - 1],
      mean: sum / count,
      median: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99)
    };
  }
  
  /**
   * Obtient toutes les métriques
   */
  getAllMetrics(): Map<string, MetricStats> {
    const stats = new Map<string, MetricStats>();
    
    for (const [name] of this.metrics) {
      const stat = this.getStats(name);
      if (stat) {
        stats.set(name, stat);
      }
    }
    
    return stats;
  }
  
  /**
   * Obtient les métriques système
   */
  getSystemMetrics(): {
    memory: {
      used: number;
      limit: number;
      percent: number;
    };
    fps?: number;
    renderTime?: number;
  } {
    const metrics: any = {
      memory: {
        used: 0,
        limit: 0,
        percent: 0
      }
    };
    
    // Métriques mémoire (browser)
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memory = {
        used: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    
    // FPS si disponible
    const fpsStats = this.getStats('render.fps');
    if (fpsStats) {
      metrics.fps = fpsStats.mean;
    }
    
    // Temps de rendu
    const renderStats = this.getStats('render.time');
    if (renderStats) {
      metrics.renderTime = renderStats.mean;
    }
    
    return metrics;
  }
  
  /**
   * Génère un rapport
   */
  generateReport(): string {
    const allStats = this.getAllMetrics();
    const systemMetrics = this.getSystemMetrics();
    
    let report = '=== Performance Report ===\n\n';
    
    // Métriques système
    report += 'System Metrics:\n';
    report += `  Memory: ${(systemMetrics.memory.used / 1024 / 1024).toFixed(2)}MB / ${(systemMetrics.memory.limit / 1024 / 1024).toFixed(2)}MB (${systemMetrics.memory.percent.toFixed(1)}%)\n`;
    if (systemMetrics.fps) {
      report += `  FPS: ${systemMetrics.fps.toFixed(1)}\n`;
    }
    if (systemMetrics.renderTime) {
      report += `  Render Time: ${systemMetrics.renderTime.toFixed(2)}ms\n`;
    }
    report += '\n';
    
    // Métriques applicatives
    report += 'Application Metrics:\n';
    for (const [name, stats] of allStats) {
      report += `  ${name}:\n`;
      report += `    Count: ${stats.count}\n`;
      report += `    Mean: ${stats.mean.toFixed(2)}\n`;
      report += `    Median: ${stats.median.toFixed(2)}\n`;
      report += `    P95: ${stats.p95.toFixed(2)}\n`;
      report += `    P99: ${stats.p99.toFixed(2)}\n`;
    }
    
    return report;
  }
  
  /**
   * Enregistre une métrique
   */
  private recordMetric(metric: Metric): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(metric);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key)!;
    metrics.push(metric);
    
    // Limiter la taille
    if (metrics.length > this.config.maxMetrics) {
      metrics.shift();
    }
  }
  
  /**
   * Génère une clé pour la métrique
   */
  private getMetricKey(metric: Metric): string {
    let key = metric.name;
    
    if (metric.tags) {
      const tagStr = Object.entries(metric.tags)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(',');
      
      if (tagStr) {
        key += `{${tagStr}}`;
      }
    }
    
    return key;
  }
  
  /**
   * Détermine si on doit échantillonner
   */
  private shouldSample(): boolean {
    return this.config.enabled && Math.random() < this.config.sampleRate;
  }
  
  /**
   * Calcule un percentile
   */
  private percentile(values: number[], p: number): number {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }
  
  /**
   * Démarre le timer de flush
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    if (this.config.enableAutoReport) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }
  
  /**
   * Arrête le timer de flush
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  /**
   * Flush les métriques
   */
  flush(): void {
    if (!this.config.enableAutoReport) return;
    
    const report = this.generateReport();
    this.log.info('Performance Report\n' + report);
    
    // Optionnel: envoyer à un serveur de métriques
    this.sendMetrics();
  }
  
  /**
   * Envoie les métriques à un serveur
   */
  private async sendMetrics(): Promise<void> {
    // À implémenter selon le backend de métriques
    // Ex: Prometheus, Grafana, DataDog, etc.
  }
  
  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
    this.log.debug('Metrics reset');
  }
  
  /**
   * Dispose le moniteur
   */
  dispose(): void {
    this.stopFlushTimer();
    this.reset();
  }
}

// Instance globale
export const performanceMonitor = PerformanceMonitor.getInstance();

// Décorateur pour mesurer les méthodes
export function Measure(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(metricName, () => method.apply(this, args));
    };
  };
}

// Helpers pour métriques communes
export function measureRenderTime(duration: number): void {
  performanceMonitor.timer('render.time', duration);
}

export function measureFPS(fps: number): void {
  performanceMonitor.gauge('render.fps', fps);
}

export function measureMemory(): void {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    performanceMonitor.gauge('memory.used', memory.usedJSHeapSize);
    performanceMonitor.gauge('memory.limit', memory.jsHeapSizeLimit);
  }
}

export function measureFeatureProcessing(featureType: string, duration: number): void {
  performanceMonitor.timer('feature.processing', duration, { type: featureType });
}

export function measureCacheHit(hit: boolean): void {
  performanceMonitor.increment(hit ? 'cache.hit' : 'cache.miss');
}