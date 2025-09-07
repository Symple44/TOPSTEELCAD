/**
 * MonitoringIntegration.ts - Intégration du monitoring dans le système de coupe
 * Active automatiquement le monitoring et le configure selon l'environnement
 */

import { performanceMonitor, PerformanceMonitor } from './PerformanceMonitor';
import { geometryCache } from '../cache/GeometryCache';
import { configManager, Environment } from '../config/ProductionConfig';
import { ICutHandler } from '../types/ICutHandler';
import { Feature } from '../types/CoreTypes';

/**
 * Service d'intégration du monitoring
 */
export class MonitoringIntegration {
  private static instance: MonitoringIntegration;
  private monitor: PerformanceMonitor;
  private initialized: boolean = false;
  private statsInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  
  private constructor() {
    this.monitor = performanceMonitor;
  }
  
  static getInstance(): MonitoringIntegration {
    if (!MonitoringIntegration.instance) {
      MonitoringIntegration.instance = new MonitoringIntegration();
    }
    return MonitoringIntegration.instance;
  }
  
  /**
   * Initialise le monitoring selon la configuration
   */
  initialize(): void {
    if (this.initialized) return;
    
    const config = configManager.getConfig();
    
    // Configurer le monitor de performance
    if (config.monitoring.enabled) {
      this.monitor.updateConfig(config.monitoring.config);
      this.setupStatsReporting();
      this.setupAlertChecking();
      
      console.log(`📊 Performance monitoring initialized for ${config.environment} environment`);
      console.log(`   Sample rate: ${(config.monitoring.config.sampleRate! * 100).toFixed(0)}%`);
      console.log(`   Max metrics: ${config.monitoring.config.maxMetrics}`);
    }
    
    // Configurer le cache de géométries
    if (config.cache.enabled) {
      geometryCache.configure(config.cache.config);
      
      console.log(`💾 Geometry cache initialized`);
      console.log(`   Max size: ${(config.cache.config.maxSize! / (1024 * 1024)).toFixed(0)}MB`);
      console.log(`   Eviction policy: ${config.cache.config.evictionPolicy}`);
    }
    
    // Listener pour les changements de configuration
    configManager.addListener((newConfig) => {
      this.applyConfigChanges(newConfig);
    });
    
    this.initialized = true;
  }
  
  /**
   * Wrapper pour mesurer les opérations des handlers
   */
  wrapHandler(handler: ICutHandler): ICutHandler {
    const config = configManager.getConfig();
    if (!config.monitoring.enabled) return handler;
    
    return {
      ...handler,
      
      canHandle: (type: any, feature: Feature): boolean => {
        return this.monitor.measure(
          `${handler.name}.canHandle`,
          () => handler.canHandle(type, feature),
          { featureId: feature.id, handlerName: handler.name }
        );
      },
      
      validate: (feature: Feature, element: any): any => {
        return this.monitor.measure(
          `${handler.name}.validate`,
          () => handler.validate(feature, element),
          { featureId: feature.id, handlerName: handler.name }
        );
      },
      
      createCutGeometry: (feature: Feature, element: any): any => {
        const operationId = this.monitor.startOperation(
          `${handler.name}.createGeometry`,
          { 
            featureId: feature.id, 
            handlerName: handler.name,
            face: undefined,
            hasCache: geometryCache !== null
          }
        );
        
        try {
          // Vérifier le cache d'abord
          const cacheKey = geometryCache.generateKey(
            feature,
            (feature.parameters as any).cutType,
            { handler: handler.name, face: undefined }
          );
          
          let geometry = geometryCache.get(cacheKey);
          let cacheHit = false;
          
          if (!geometry) {
            // Pas dans le cache, créer la géométrie
            geometry = handler.createCutGeometry(feature, element);
            
            // Mettre en cache si valide
            if (geometry) {
              geometryCache.set(
                cacheKey,
                geometry,
                (feature.parameters as any).cutType,
                { handler: handler.name }
              );
            }
          } else {
            cacheHit = true;
          }
          
          this.monitor.endOperation(operationId, true);
          
          // Enregistrer les métriques de cache
          if (cacheHit) {
            this.monitor.measure('cache.hit', () => {}, { handler: handler.name });
          } else {
            this.monitor.measure('cache.miss', () => {}, { handler: handler.name });
          }
          
          return geometry;
        } catch (error) {
          this.monitor.endOperation(
            operationId,
            false,
            error instanceof Error ? error.message : String(error)
          );
          throw error;
        }
      },
      
      generateMetadata: handler.generateMetadata ? 
        ((feature: Feature, element: any): any => {
          return this.monitor.measure(
            `${handler.name}.generateMetadata`,
            () => handler.generateMetadata!(feature, element),
            { featureId: feature.id, handlerName: handler.name }
          );
        }) as any : (() => ({})) as any,
      
      // CORRECTIF CRITIQUE: Ajouter la méthode process qui était manquante
      process: (context: any): any => {
        const operationId = this.monitor.startOperation(
          `${handler.name}.process`,
          { 
            featureId: context.feature.id, 
            handlerName: handler.name,
            cutType: context.cutType
          }
        );
        
        try {
          const result = handler.process(context);
          this.monitor.endOperation(operationId, result.success);
          return result;
        } catch (error) {
          this.monitor.endOperation(
            operationId,
            false,
            error instanceof Error ? error.message : String(error)
          );
          throw error;
        }
      }
    };
  }
  
  /**
   * Configure le reporting des statistiques
   */
  private setupStatsReporting(): void {
    const config = configManager.getConfig();
    
    if (config.environment === Environment.DEVELOPMENT) {
      // En développement, afficher les stats toutes les 30 secondes
      this.statsInterval = setInterval(() => {
        this.printStats();
      }, 30000);
    }
    
    // Listener pour afficher les stats importantes
    this.monitor.addStatsListener((stats) => {
      // Log si performance dégradée
      if (stats.p95Duration > config.monitoring.config.alertThresholds!.p95Duration!) {
        console.warn(`⚠️ Performance degradation detected: P95 = ${stats.p95Duration.toFixed(0)}ms`);
      }
      
      // Log si taux d'erreur élevé
      if (stats.errorRate > config.monitoring.config.alertThresholds!.errorRate!) {
        console.error(`🚨 High error rate: ${(stats.errorRate * 100).toFixed(1)}%`);
      }
    });
  }
  
  /**
   * Configure la vérification des alertes
   */
  private setupAlertChecking(): void {
    const config = configManager.getConfig();
    
    if (!config.alerts.enabled) return;
    
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 60000); // Vérifier toutes les minutes
  }
  
  /**
   * Vérifie les alertes et les envoie si nécessaire
   */
  private async checkAlerts(): Promise<void> {
    const config = configManager.getConfig();
    const stats = this.monitor.getAggregatedStats(60000); // Dernière minute
    const cacheStats = geometryCache.getStats();
    
    const alerts: string[] = [];
    
    // Vérifier le taux d'erreur
    if (stats.errorRate * 100 > config.alerts.thresholds.errorRatePercent) {
      alerts.push(`Error rate: ${(stats.errorRate * 100).toFixed(1)}% (threshold: ${config.alerts.thresholds.errorRatePercent}%)`);
    }
    
    // Vérifier la performance P95
    if (stats.p95Duration > config.alerts.thresholds.p95DurationMs) {
      alerts.push(`P95 duration: ${stats.p95Duration.toFixed(0)}ms (threshold: ${config.alerts.thresholds.p95DurationMs}ms)`);
    }
    
    // Vérifier l'utilisation mémoire (approximation via cache)
    const memoryUsageMB = cacheStats.currentSize / (1024 * 1024);
    if (memoryUsageMB > config.alerts.thresholds.memoryUsageMB) {
      alerts.push(`Memory usage: ${memoryUsageMB.toFixed(0)}MB (threshold: ${config.alerts.thresholds.memoryUsageMB}MB)`);
    }
    
    // Vérifier le taux de hit du cache
    const cacheHitRate = cacheStats.hitRate * 100;
    if (cacheHitRate < config.alerts.thresholds.cacheHitRatePercent) {
      alerts.push(`Cache hit rate: ${cacheHitRate.toFixed(1)}% (threshold: ${config.alerts.thresholds.cacheHitRatePercent}%)`);
    }
    
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }
  
  /**
   * Envoie les alertes selon les canaux configurés
   */
  private async sendAlerts(alerts: string[]): Promise<void> {
    const config = configManager.getConfig();
    const alertMessage = `🚨 Production Alerts (${config.environment}):\n${alerts.join('\n')}`;
    
    for (const channel of config.alerts.channels) {
      switch (channel) {
        case 'console':
          console.error(alertMessage);
          break;
          
        case 'webhook':
          if (config.alerts.webhookUrl) {
            try {
              await fetch(config.alerts.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  environment: config.environment,
                  timestamp: new Date().toISOString(),
                  alerts: alerts,
                  stats: this.monitor.getAggregatedStats()
                })
              });
            } catch (error) {
              console.error('Failed to send webhook alert:', error);
            }
          }
          break;
          
        case 'email':
          // Email sending would require backend integration
          console.log('Email alerts not implemented (requires backend)');
          break;
      }
    }
  }
  
  /**
   * Affiche les statistiques dans la console
   */
  private printStats(): void {
    const stats = this.monitor.getAggregatedStats(60000); // Dernière minute
    const cacheStats = geometryCache.getStats();
    
    console.log('\n📊 === Performance Stats (Last Minute) ===');
    console.log(`Operations: ${stats.totalOperations} (${stats.successfulOperations} successful)`);
    console.log(`Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    console.log(`Throughput: ${stats.throughput.toFixed(2)} ops/sec`);
    console.log(`Timing: avg=${stats.averageDuration.toFixed(0)}ms, p95=${stats.p95Duration.toFixed(0)}ms, max=${stats.maxDuration.toFixed(0)}ms`);
    
    console.log('\n💾 === Cache Stats ===');
    console.log(`Hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);
    console.log(`Entries: ${cacheStats.entryCount}/${cacheStats.maxSize / (1024 * 1024)}MB`);
    console.log(`Size: ${(cacheStats.currentSize / (1024 * 1024)).toFixed(2)}MB`);
    
    if (stats.operationsByHandler.size > 0) {
      console.log('\n🔧 === Handler Distribution ===');
      Array.from(stats.operationsByHandler.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([handler, count]) => {
          console.log(`  ${handler}: ${count} ops`);
        });
    }
  }
  
  /**
   * Applique les changements de configuration
   */
  private applyConfigChanges(config: any): void {
    // Mettre à jour le monitoring
    if (config.monitoring.enabled !== this.monitor.getAggregatedStats().totalOperations > 0) {
      this.monitor.setEnabled(config.monitoring.enabled);
    }
    
    if (config.monitoring.enabled) {
      this.monitor.updateConfig(config.monitoring.config);
    }
    
    // Mettre à jour le cache
    geometryCache.configure(config.cache.config);
    
    // Redémarrer les intervals si nécessaire
    this.clearIntervals();
    if (config.monitoring.enabled) {
      this.setupStatsReporting();
      this.setupAlertChecking();
    }
  }
  
  /**
   * Nettoie les intervals
   */
  private clearIntervals(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = undefined;
    }
  }
  
  /**
   * Génère un rapport complet
   */
  generateReport(): string {
    const perfReport = this.monitor.generateReport();
    const cacheReport = geometryCache.generateReport();
    const config = configManager.getConfig();
    
    return `
=== PRODUCTION MONITORING REPORT ===
Environment: ${config.environment}
Timestamp: ${new Date().toISOString()}

${perfReport}

${cacheReport}

=== Configuration ===
Monitoring: ${config.monitoring.enabled ? 'Enabled' : 'Disabled'}
Cache: ${config.cache.enabled ? 'Enabled' : 'Disabled'}
Alerts: ${config.alerts.enabled ? 'Enabled' : 'Disabled'}
WebWorkers: ${config.performance.enableWebWorkers ? 'Enabled' : 'Disabled'}
    `.trim();
  }
  
  /**
   * Exporte toutes les métriques
   */
  exportMetrics(): any {
    return {
      timestamp: new Date().toISOString(),
      environment: configManager.getConfig().environment,
      performance: JSON.parse(this.monitor.exportMetrics()),
      cache: geometryCache.getStats(),
      config: configManager.getConfig()
    };
  }
  
  /**
   * Arrête le monitoring
   */
  shutdown(): void {
    this.clearIntervals();
    this.monitor.setEnabled(false);
    console.log('📊 Monitoring shutdown complete');
  }
}

// Export singleton
export const monitoringIntegration = MonitoringIntegration.getInstance();

// Auto-initialisation si en browser
if (typeof window !== 'undefined') {
  // Initialiser au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitoringIntegration.initialize();
    });
  } else {
    monitoringIntegration.initialize();
  }
  
  // Exposer globalement pour debug
  (window as any).__topsteelcad_monitoring = {
    integration: monitoringIntegration,
    monitor: performanceMonitor,
    cache: geometryCache,
    config: configManager,
    getReport: () => monitoringIntegration.generateReport(),
    getMetrics: () => monitoringIntegration.exportMetrics()
  };
}