/**
 * DebugUI.tsx - Interface de debug pour visualiser les opérations de coupe
 * Affiche en temps réel les métriques, handlers et opérations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { geometryCache } from '../cache/GeometryCache';
import { configManager } from '../config/ProductionConfig';
import { getCSGService } from '../services/CSGOperationService';
import './DebugUI.css';

export interface DebugUIProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxHeight?: string;
}

interface HandlerMetric {
  name: string;
  count: number;
  avgDuration: number;
  successRate: number;
}

interface RecentOperation {
  id: string;
  operation: string;
  handler?: string;
  duration: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

export const DebugUI: React.FC<DebugUIProps> = ({
  visible = true,
  position = 'bottom-right',
  maxHeight = '400px'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'handlers' | 'cache' | 'operations' | 'workers' | 'config'>('overview');
  const [stats, setStats] = useState<any>({
    totalOperations: 0,
    successfulOperations: 0,
    errorRate: 0,
    averageDuration: 0,
    p95Duration: 0,
    throughput: 0,
    operationsByHandler: new Map(),
    operationsByCutType: new Map()
  });
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([]);
  const [handlerMetrics, setHandlerMetrics] = useState<HandlerMetric[]>([]);
  const [workerStats, setWorkerStats] = useState<any>(null);
  const operationsRef = useRef<RecentOperation[]>([]);
  const updateInterval = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialisation et nettoyage
  useEffect(() => {
    if (!visible) return;

    // Charger la configuration initiale
    setConfig(configManager.getConfig());

    // Listener pour les changements de configuration
    const configListener = (newConfig: any) => {
      setConfig(newConfig);
    };
    configManager.addListener(configListener);

    // Mise à jour périodique des stats
    const updateStats = () => {
      // Stats de performance
      const perfStats = performanceMonitor.getAggregatedStats(60000); // Dernière minute
      if (perfStats) {
        setStats(perfStats);
      }

      // Stats du cache
      const cacheStatsData = geometryCache.getStats();
      setCacheStats(cacheStatsData);

      // Stats des WebWorkers
      try {
        const csgService = getCSGService();
        const serviceStats = csgService.getServiceStats();
        setWorkerStats(serviceStats);
      } catch (error) {
        // Ignorer les erreurs d'accès au service CSG
      }

      // Métriques par handler
      if (perfStats && perfStats.operationsByHandler && perfStats.operationsByHandler.size > 0) {
        const metrics: HandlerMetric[] = [];
        perfStats.operationsByHandler.forEach((count, handler) => {
          metrics.push({
            name: handler,
            count,
            avgDuration: perfStats.averageDuration,
            successRate: 1 - perfStats.errorRate
          });
        });
        setHandlerMetrics(metrics.sort((a, b) => b.count - a.count));
      }

      // Opérations récentes
      const rawMetrics = performanceMonitor.getRawMetrics(20);
      const recent: RecentOperation[] = rawMetrics.map((m: any, i: number) => ({
        id: `op-${i}`,
        operation: m.operation,
        handler: m.handler,
        duration: m.duration,
        success: m.success,
        timestamp: m.endTime,
        error: m.error
      })).reverse();

      operationsRef.current = recent;
      setRecentOperations(recent);
    };

    // Mise à jour initiale
    updateStats();

    // Mise à jour périodique
    updateInterval.current = setInterval(updateStats, 2000);

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      configManager.removeListener(configListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Formater les nombres
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(decimals) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
  };

  // Formater les octets
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  };

  // Obtenir la classe de statut
  const getStatusClass = (value: number, good: number, warning: number): string => {
    if (value <= good) return 'status-good';
    if (value <= warning) return 'status-warning';
    return 'status-error';
  };

  // Exporter les métriques
  const handleExport = useCallback(() => {
    const metrics = {
      timestamp: new Date().toISOString(),
      environment: config?.environment,
      performance: stats,
      cache: cacheStats,
      recentOperations: operationsRef.current,
      handlers: handlerMetrics
    };

    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-metrics-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats, cacheStats, config, handlerMetrics]);

  // Réinitialiser les métriques
  const handleReset = useCallback(() => {
    if (window.confirm('Reset all metrics? This cannot be undone.')) {
      performanceMonitor.reset();
      geometryCache.clear();
      setRecentOperations([]);
      operationsRef.current = [];
    }
  }, []);

  if (!visible) return null;

  return (
    <div className={`debug-ui debug-ui-${position} ${isMinimized ? 'minimized' : ''}`}>
      <div className="debug-header">
        <span className="debug-title">
          🔧 Cut System Debug
          {config && (
            <span className={`env-badge env-${config.environment}`}>
              {config.environment.toUpperCase()}
            </span>
          )}
        </span>
        <div className="debug-controls">
          <button onClick={handleExport} title="Export Metrics">💾</button>
          <button onClick={handleReset} title="Reset Metrics">🗑️</button>
          <button onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="debug-tabs">
            <button
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={activeTab === 'handlers' ? 'active' : ''}
              onClick={() => setActiveTab('handlers')}
            >
              Handlers
            </button>
            <button
              className={activeTab === 'cache' ? 'active' : ''}
              onClick={() => setActiveTab('cache')}
            >
              Cache
            </button>
            <button
              className={activeTab === 'operations' ? 'active' : ''}
              onClick={() => setActiveTab('operations')}
            >
              Operations
            </button>
            <button
              className={activeTab === 'workers' ? 'active' : ''}
              onClick={() => setActiveTab('workers')}
            >
              Workers
            </button>
            <button
              className={activeTab === 'config' ? 'active' : ''}
              onClick={() => setActiveTab('config')}
            >
              Config
            </button>
          </div>

          <div className="debug-content" style={{ maxHeight }}>
            {activeTab === 'overview' && stats && (
              <div className="tab-content">
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-label">Operations</span>
                    <span className="metric-value">{formatNumber(stats.totalOperations, 0)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Success Rate</span>
                    <span className={`metric-value ${getStatusClass(stats.errorRate * 100, 1, 5)}`}>
                      {((1 - stats.errorRate) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Avg Duration</span>
                    <span className="metric-value">{stats.averageDuration.toFixed(0)}ms</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">P95 Duration</span>
                    <span className={`metric-value ${getStatusClass(stats.p95Duration, 500, 1000)}`}>
                      {stats.p95Duration.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Throughput</span>
                    <span className="metric-value">{stats.throughput.toFixed(2)} ops/s</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Cache Hit Rate</span>
                    <span className={`metric-value ${cacheStats ? getStatusClass(100 - cacheStats.hitRate * 100, 30, 50) : ''}`}>
                      {cacheStats ? (cacheStats.hitRate * 100).toFixed(2) : '0.00'}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'handlers' && (
              <div className="tab-content">
                {handlerMetrics.length > 0 ? (
                  <table className="metrics-table">
                    <thead>
                      <tr>
                        <th>Handler</th>
                        <th>Operations</th>
                        <th>Avg Duration</th>
                        <th>Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handlerMetrics.map(metric => (
                        <tr key={metric.name}>
                          <td>{metric.name}</td>
                          <td>{metric.count}</td>
                          <td>{metric.avgDuration.toFixed(0)}ms</td>
                          <td className={getStatusClass((1 - metric.successRate) * 100, 1, 5)}>
                            {(metric.successRate * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">No handler data available</div>
                )}
              </div>
            )}

            {activeTab === 'cache' && cacheStats && (
              <div className="tab-content">
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-label">Hit Rate</span>
                    <span className={`metric-value ${getStatusClass(100 - cacheStats.hitRate * 100, 30, 50)}`}>
                      {(cacheStats.hitRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Hits</span>
                    <span className="metric-value">{cacheStats.hits}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Misses</span>
                    <span className="metric-value">{cacheStats.misses}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Entries</span>
                    <span className="metric-value">{cacheStats.entryCount}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Size</span>
                    <span className="metric-value">{formatBytes(cacheStats.currentSize)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Max Size</span>
                    <span className="metric-value">{formatBytes(cacheStats.maxSize)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Evictions</span>
                    <span className="metric-value">{cacheStats.evictions}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Avg Entry</span>
                    <span className="metric-value">{formatBytes(cacheStats.averageEntrySize)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="tab-content operations-list">
                {recentOperations.length > 0 ? (
                  recentOperations.map(op => (
                    <div key={op.id} className={`operation-item ${op.success ? 'success' : 'error'}`}>
                      <div className="operation-header">
                        <span className="operation-name">{op.operation}</span>
                        <span className="operation-duration">{op.duration.toFixed(0)}ms</span>
                      </div>
                      {op.handler && (
                        <div className="operation-detail">Handler: {op.handler}</div>
                      )}
                      {op.error && (
                        <div className="operation-error">Error: {op.error}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-data">No recent operations</div>
                )}
              </div>
            )}

            {activeTab === 'workers' && (
              <div className="tab-content">
                {workerStats ? (
                  <>
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <span className="metric-label">Workers Enabled</span>
                        <span className={`metric-value ${workerStats.workerEnabled ? 'status-good' : 'status-warning'}`}>
                          {workerStats.workerEnabled ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {workerStats.workers && (
                        <>
                          <div className="metric-item">
                            <span className="metric-label">Total Workers</span>
                            <span className="metric-value">{workerStats.workers.totalWorkers}</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Busy Workers</span>
                            <span className="metric-value">{workerStats.workers.busyWorkers}</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Free Workers</span>
                            <span className="metric-value">{workerStats.workers.freeWorkers}</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Pending Tasks</span>
                            <span className={`metric-value ${getStatusClass(workerStats.workers.pendingTasks, 0, 5)}`}>
                              {workerStats.workers.pendingTasks}
                            </span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Total Operations</span>
                            <span className="metric-value">{workerStats.workers.totalOperations}</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Initialization</span>
                            <span className={`metric-value ${workerStats.workers.initialized ? 'status-good' : 'status-error'}`}>
                              {workerStats.workers.initialized ? 'Ready' : 'Not Ready'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {!workerStats.workerEnabled && (
                      <div className="worker-disabled-notice">
                        <p>⚠️ WebWorkers are disabled in configuration</p>
                        <p>Enable them in the Config tab for better performance on heavy CSG operations</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-data">No worker data available</div>
                )}
              </div>
            )}

            {activeTab === 'config' && config && (
              <div className="tab-content">
                <div className="config-section">
                  <h4>Environment</h4>
                  <div className="config-item">
                    <span>Mode:</span>
                    <span>{config.environment}</span>
                  </div>
                </div>
                
                <div className="config-section">
                  <h4>Monitoring</h4>
                  <div className="config-item">
                    <span>Enabled:</span>
                    <span>{config.monitoring.enabled ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span>Sample Rate:</span>
                    <span>{(config.monitoring.config.sampleRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="config-section">
                  <h4>Cache</h4>
                  <div className="config-item">
                    <span>Enabled:</span>
                    <span>{config.cache.enabled ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span>Policy:</span>
                    <span>{config.cache.config.evictionPolicy}</span>
                  </div>
                </div>
                
                <div className="config-section">
                  <h4>Performance</h4>
                  <div className="config-item">
                    <span>WebWorkers:</span>
                    <span>{config.performance.enableWebWorkers ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span>Max Workers:</span>
                    <span>{config.performance.maxWorkers}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DebugUI;