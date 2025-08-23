/**
 * Export principal du Core Engine TopSteelCAD
 * 
 * Point d'entrée unique pour toute l'architecture multi-formats
 */

// ================================
// CORE ENGINE
// ================================

// Main engine
import { FormatEngine as FormatEngineClass } from './engine/FormatEngine';
import { ProcessingPipeline as ProcessingPipelineClass } from './pipeline';

export { FormatEngine } from './engine/FormatEngine';
export { PluginRegistry } from './engine/PluginRegistry';
export { FormatDetector } from './engine/FormatDetector';

// ================================
// PIPELINE SYSTEM
// ================================

export {
  ProcessingPipeline,
  ProcessingContext,
  BaseStage,
  PipelineUtils
} from './pipeline';

// ================================
// TYPE SYSTEM
// ================================

export * from './types';

// ================================
// CONVENIENCE FACTORIES
// ================================

/**
 * Factory principale pour créer un moteur configuré
 */
export const EngineFactory = {
  /**
   * Crée un FormatEngine avec configuration par défaut
   */
  createDefault() {
    return new FormatEngineClass({
      enableAutoDetection: true,
      detectionConfidenceThreshold: 0.8,
      maxConcurrentJobs: 4,
      defaultTimeout: 30000,
      logLevel: 'info',
      enableMetrics: true
    });
  },

  /**
   * Crée un FormatEngine pour développement avec logs détaillés
   */
  createDevelopment() {
    return new FormatEngineClass({
      enableAutoDetection: true,
      detectionConfidenceThreshold: 0.6, // Plus permissif
      maxConcurrentJobs: 2,
      defaultTimeout: 60000, // Plus de temps pour debug
      logLevel: 'debug',
      enableMetrics: true,
      metricsInterval: 30000 // Métriques plus fréquentes
    });
  },

  /**
   * Crée un FormatEngine pour production avec performance optimisée
   */
  createProduction() {
    return new FormatEngineClass({
      enableAutoDetection: true,
      detectionConfidenceThreshold: 0.9, // Plus strict
      maxConcurrentJobs: 8, // Plus de concurrence
      defaultTimeout: 15000, // Plus rapide
      logLevel: 'warn', // Moins de logs
      enableMetrics: true,
      metricsInterval: 300000 // Métriques moins fréquentes
    });
  }
};

/**
 * Factory pour les pipelines courants
 */
export const PipelineFactory = {
  /**
   * Crée un pipeline d'import générique
   */
  createImportPipeline(name: string) {
    return new ProcessingPipelineClass(name, {
      abortOnError: true,
      enableProfiling: true,
      stageTimeout: 30000
    });
  },

  /**
   * Crée un pipeline d'export générique
   */
  createExportPipeline(name: string) {
    return new ProcessingPipelineClass(name, {
      abortOnError: true,
      enableProfiling: true,
      stageTimeout: 20000 // Export généralement plus rapide
    });
  }
};

// ================================
// VERSION INFO
// ================================

export const CoreVersion = {
  version: '2.0.0',
  build: 'alpha',
  date: new Date().toISOString(),
  features: [
    'Multi-format support',
    'Plugin architecture',
    'Processing pipelines',
    'Auto-detection',
    'Performance monitoring'
  ]
} as const;