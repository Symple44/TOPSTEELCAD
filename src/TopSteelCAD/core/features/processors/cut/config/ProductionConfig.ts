/**
 * ProductionConfig.ts - Configuration de production pour le système de coupe
 * Centralise toute la configuration pour l'environnement de production
 */

import { CacheConfig } from '../cache/GeometryCache';
import { MonitorConfig } from '../monitoring/PerformanceMonitor';

/**
 * Environnement d'exécution
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Configuration globale de production
 */
export interface ProductionConfig {
  environment: Environment;
  
  // Configuration du monitoring
  monitoring: {
    enabled: boolean;
    config: Partial<MonitorConfig>;
  };
  
  // Configuration du cache
  cache: {
    enabled: boolean;
    config: Partial<CacheConfig>;
  };
  
  // Configuration des logs
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
    remoteEndpoint?: string;
    bufferSize: number;
  };
  
  // Configuration des alertes
  alerts: {
    enabled: boolean;
    channels: ('console' | 'email' | 'webhook')[];
    thresholds: {
      errorRatePercent: number;
      p95DurationMs: number;
      memoryUsageMB: number;
      cacheHitRatePercent: number;
    };
    webhookUrl?: string;
    emailRecipients?: string[];
  };
  
  // Configuration des performances
  performance: {
    enableWebWorkers: boolean;
    maxWorkers: number;
    enableGPU: boolean;
    batchSize: number;
    parallelProcessing: boolean;
    maxConcurrentOperations: number;
  };
  
  // Configuration de la sécurité
  security: {
    enableCSP: boolean;
    allowedOrigins: string[];
    maxFileSize: number;
    validateInputs: boolean;
  };
  
  // Configuration des features
  features: {
    enableExperimentalHandlers: boolean;
    enableDebugUI: boolean;
    enableMetricsExport: boolean;
    enableAutoRecovery: boolean;
    enableProgressiveRendering: boolean;
  };
}

/**
 * Configurations par environnement
 */
const configs: Record<Environment, ProductionConfig> = {
  [Environment.DEVELOPMENT]: {
    environment: Environment.DEVELOPMENT,
    
    monitoring: {
      enabled: true,
      config: {
        sampleRate: 1.0, // 100% sampling en dev
        maxMetrics: 50000,
        flushInterval: 30000, // 30 secondes
        aggregationInterval: 2000, // 2 secondes
        persistMetrics: true,
        alertThresholds: {
          errorRate: 0.1, // 10% en dev
          p95Duration: 2000, // 2 secondes
          throughput: 0.01
        }
      }
    },
    
    cache: {
      enabled: true,
      config: {
        maxSize: 200 * 1024 * 1024, // 200MB en dev
        maxEntries: 2000,
        ttl: 10 * 60 * 1000, // 10 minutes
        evictionPolicy: 'LRU',
        persistToStorage: true,
        compressionEnabled: false
      }
    },
    
    logging: {
      level: 'debug',
      enableConsole: true,
      enableRemote: false,
      bufferSize: 1000
    },
    
    alerts: {
      enabled: false,
      channels: ['console'],
      thresholds: {
        errorRatePercent: 10,
        p95DurationMs: 2000,
        memoryUsageMB: 500,
        cacheHitRatePercent: 30
      }
    },
    
    performance: {
      enableWebWorkers: false,
      maxWorkers: 2,
      enableGPU: false,
      batchSize: 10,
      parallelProcessing: false,
      maxConcurrentOperations: 5
    },
    
    security: {
      enableCSP: false,
      allowedOrigins: ['*'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      validateInputs: true
    },
    
    features: {
      enableExperimentalHandlers: true,
      enableDebugUI: true,
      enableMetricsExport: true,
      enableAutoRecovery: false,
      enableProgressiveRendering: false
    }
  },
  
  [Environment.STAGING]: {
    environment: Environment.STAGING,
    
    monitoring: {
      enabled: true,
      config: {
        sampleRate: 0.5, // 50% sampling en staging
        maxMetrics: 20000,
        flushInterval: 60000, // 1 minute
        aggregationInterval: 5000, // 5 secondes
        persistMetrics: true,
        alertThresholds: {
          errorRate: 0.05, // 5%
          p95Duration: 1000, // 1 seconde
          throughput: 0.1
        }
      }
    },
    
    cache: {
      enabled: true,
      config: {
        maxSize: 150 * 1024 * 1024, // 150MB
        maxEntries: 1500,
        ttl: 5 * 60 * 1000, // 5 minutes
        evictionPolicy: 'LRU',
        persistToStorage: true,
        compressionEnabled: true
      }
    },
    
    logging: {
      level: 'info',
      enableConsole: true,
      enableRemote: true,
      remoteEndpoint: 'https://staging-logs.topsteelcad.com/api/logs',
      bufferSize: 500
    },
    
    alerts: {
      enabled: true,
      channels: ['console', 'webhook'],
      thresholds: {
        errorRatePercent: 5,
        p95DurationMs: 1000,
        memoryUsageMB: 400,
        cacheHitRatePercent: 50
      },
      webhookUrl: 'https://staging-alerts.topsteelcad.com/webhook'
    },
    
    performance: {
      enableWebWorkers: true,
      maxWorkers: 4,
      enableGPU: true,
      batchSize: 20,
      parallelProcessing: true,
      maxConcurrentOperations: 10
    },
    
    security: {
      enableCSP: true,
      allowedOrigins: ['https://staging.topsteelcad.com'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      validateInputs: true
    },
    
    features: {
      enableExperimentalHandlers: true,
      enableDebugUI: true,
      enableMetricsExport: true,
      enableAutoRecovery: true,
      enableProgressiveRendering: true
    }
  },
  
  [Environment.PRODUCTION]: {
    environment: Environment.PRODUCTION,
    
    monitoring: {
      enabled: true,
      config: {
        sampleRate: 0.1, // 10% sampling en production
        maxMetrics: 10000,
        flushInterval: 120000, // 2 minutes
        aggregationInterval: 10000, // 10 secondes
        persistMetrics: false, // Désactivé en prod pour performance
        alertThresholds: {
          errorRate: 0.01, // 1%
          p95Duration: 500, // 500ms
          throughput: 1.0
        }
      }
    },
    
    cache: {
      enabled: true,
      config: {
        maxSize: 100 * 1024 * 1024, // 100MB
        maxEntries: 1000,
        ttl: 5 * 60 * 1000, // 5 minutes
        evictionPolicy: 'LFU', // Least Frequently Used en production
        persistToStorage: false,
        compressionEnabled: true
      }
    },
    
    logging: {
      level: 'warn',
      enableConsole: false,
      enableRemote: true,
      remoteEndpoint: 'https://logs.topsteelcad.com/api/logs',
      bufferSize: 200
    },
    
    alerts: {
      enabled: true,
      channels: ['webhook', 'email'],
      thresholds: {
        errorRatePercent: 1,
        p95DurationMs: 500,
        memoryUsageMB: 300,
        cacheHitRatePercent: 70
      },
      webhookUrl: 'https://alerts.topsteelcad.com/webhook',
      emailRecipients: ['alerts@topsteelcad.com', 'devops@topsteelcad.com']
    },
    
    performance: {
      enableWebWorkers: true,
      maxWorkers: navigator.hardwareConcurrency || 4,
      enableGPU: true,
      batchSize: 50,
      parallelProcessing: true,
      maxConcurrentOperations: 20
    },
    
    security: {
      enableCSP: true,
      allowedOrigins: ['https://www.topsteelcad.com', 'https://app.topsteelcad.com'],
      maxFileSize: 25 * 1024 * 1024, // 25MB
      validateInputs: true
    },
    
    features: {
      enableExperimentalHandlers: false,
      enableDebugUI: false,
      enableMetricsExport: false,
      enableAutoRecovery: true,
      enableProgressiveRendering: true
    }
  },
  
  [Environment.TEST]: {
    environment: Environment.TEST,
    
    monitoring: {
      enabled: false,
      config: {
        sampleRate: 0,
        maxMetrics: 100,
        flushInterval: 0,
        aggregationInterval: 0,
        persistMetrics: false,
        alertThresholds: {
          errorRate: 1,
          p95Duration: 10000,
          throughput: 0
        }
      }
    },
    
    cache: {
      enabled: false,
      config: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxEntries: 100,
        ttl: 1000,
        evictionPolicy: 'FIFO',
        persistToStorage: false,
        compressionEnabled: false
      }
    },
    
    logging: {
      level: 'error',
      enableConsole: false,
      enableRemote: false,
      bufferSize: 10
    },
    
    alerts: {
      enabled: false,
      channels: [],
      thresholds: {
        errorRatePercent: 100,
        p95DurationMs: 10000,
        memoryUsageMB: 1000,
        cacheHitRatePercent: 0
      }
    },
    
    performance: {
      enableWebWorkers: false,
      maxWorkers: 1,
      enableGPU: false,
      batchSize: 1,
      parallelProcessing: false,
      maxConcurrentOperations: 1
    },
    
    security: {
      enableCSP: false,
      allowedOrigins: ['*'],
      maxFileSize: 1024 * 1024, // 1MB
      validateInputs: false
    },
    
    features: {
      enableExperimentalHandlers: true,
      enableDebugUI: false,
      enableMetricsExport: false,
      enableAutoRecovery: false,
      enableProgressiveRendering: false
    }
  }
};

/**
 * Obtient l'environnement actuel
 */
export function getCurrentEnvironment(): Environment {
  // Détection automatique basée sur l'URL ou les variables d'environnement
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return Environment.DEVELOPMENT;
    } else if (hostname.includes('staging')) {
      return Environment.STAGING;
    } else if (hostname.includes('test')) {
      return Environment.TEST;
    } else {
      return Environment.PRODUCTION;
    }
  }
  
  // Pour Node.js
  const nodeEnv = process?.env?.NODE_ENV;
  switch (nodeEnv) {
    case 'development':
      return Environment.DEVELOPMENT;
    case 'staging':
      return Environment.STAGING;
    case 'test':
      return Environment.TEST;
    case 'production':
    default:
      return Environment.PRODUCTION;
  }
}

/**
 * Obtient la configuration pour l'environnement actuel
 */
export function getConfig(env?: Environment): ProductionConfig {
  const currentEnv = env || getCurrentEnvironment();
  return configs[currentEnv];
}

/**
 * Met à jour la configuration pour un environnement
 */
export function updateConfig(env: Environment, updates: Partial<ProductionConfig>): void {
  configs[env] = {
    ...configs[env],
    ...updates
  };
}

/**
 * Classe de gestion de la configuration
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: ProductionConfig;
  private listeners: ((config: ProductionConfig) => void)[] = [];
  
  private constructor() {
    this.config = getConfig();
  }
  
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }
  
  /**
   * Obtient la configuration actuelle
   */
  getConfig(): ProductionConfig {
    return this.config;
  }
  
  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<ProductionConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    this.notifyListeners();
  }
  
  /**
   * Ajoute un listener de changement de configuration
   */
  addListener(listener: (config: ProductionConfig) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Supprime un listener
   */
  removeListener(listener: (config: ProductionConfig) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
  }
  
  /**
   * Valide la configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validation du monitoring
    if (this.config.monitoring.config.sampleRate && (this.config.monitoring.config.sampleRate < 0 || this.config.monitoring.config.sampleRate > 1)) {
      errors.push('Sample rate must be between 0 and 1');
    }
    
    // Validation du cache
    if (this.config.cache.config.maxSize && this.config.cache.config.maxSize <= 0) {
      errors.push('Cache max size must be positive');
    }
    
    // Validation des alertes
    if (this.config.alerts.enabled && this.config.alerts.channels.length === 0) {
      errors.push('Alerts enabled but no channels configured');
    }
    
    // Validation des performances
    if (this.config.performance.maxWorkers < 1) {
      errors.push('Max workers must be at least 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton
export const configManager = ConfigurationManager.getInstance();