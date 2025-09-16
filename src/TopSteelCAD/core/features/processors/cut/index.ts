/**
 * index.ts - Point d'entrée principal pour l'architecture de coupe
 * Exporte tous les composants publics du système de coupe
 */

// Types et interfaces
export * from './types/CutTypes';
export * from './types/ICutHandler';

// Core
export { BaseCutHandler } from './core/BaseCutHandler';
export { CutTypeDetector } from './core/CutTypeDetector';
export { CutHandlerFactory, getCutHandlerFactory, resetCutHandlerFactory } from './core/CutHandlerFactory';

// Internal imports for initialization functions
import { getCutHandlerFactory } from './core/CutHandlerFactory';
import { getCSGService } from './services/CSGOperationService';

// Services
export { 
  CSGOperationService,
  getCSGService 
} from './services/CSGOperationService';

export type { 
  CSGOperation, 
  CSGOptions, 
  CSGResult
} from './services/CSGOperationService';

export {
  GeometryCreationService,
  getGeometryService
} from './services/GeometryCreationService';

export type {
  GeometryCreationOptions,
  ContourBounds
} from './services/GeometryCreationService';

// Handlers
export { PartialNotchHandler } from './handlers/PartialNotchHandler';
export { EndCutHandler } from './handlers/EndCutHandler';
export { ExteriorCutHandler } from './handlers/ExteriorCutHandler';
export { KontourHandler } from './handlers/KontourHandler';
export { PlateHandler } from './handlers/PlateHandler';
export { InteriorCutHandler } from './handlers/InteriorCutHandler';
export { StraightCutHandler } from './handlers/StraightCutHandler';
export { AngleCutHandler } from './handlers/AngleCutHandler';
export { BevelCutHandler } from './handlers/BevelCutHandler';
export { CompoundCutHandler } from './handlers/CompoundCutHandler';
export { NotchHandler } from './handlers/NotchHandler';
export { TransverseCutHandler } from './handlers/TransverseCutHandler';
export { SlotCutHandler } from './handlers/SlotCutHandler';
export { CopingCutHandler } from './handlers/CopingCutHandler';
export { LegacyFallbackHandler } from './handlers/LegacyFallbackHandler';

// Utils
export { CutLogger, cutLogger } from './utils/CutLogger';
export { LogLevel } from './utils/CutLogger';

// Adapters
export { 
  CutProcessorAdapter,
  getCutProcessorAdapter,
  resetCutProcessorAdapter,
  AdapterMode // Export as value, not just type
} from './adapters/CutProcessorAdapter';

export type { 
  AdapterConfig
} from './adapters/CutProcessorAdapter';

/**
 * Configuration et initialisation du système de coupe
 */
export interface CutSystemConfig {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  maxCSGComplexity?: number;
  defaultCSGOptions?: any;
  customHandlers?: any[];
}

/**
 * Initialise le système de coupe avec une configuration personnalisée
 */
export function initializeCutSystem(config?: CutSystemConfig): void {
  const factory = getCutHandlerFactory();
  
  // Enregistrer les handlers personnalisés si fournis
  if (config?.customHandlers) {
    for (const handler of config.customHandlers) {
      factory.registerHandler(handler);
    }
  }
  
  // Configurer les options CSG par défaut
  if (config?.defaultCSGOptions) {
    getCSGService(config.defaultCSGOptions);
    // Service configuré automatiquement
  }
  
  console.log('✅ Cut system initialized with configuration:', config);
}

/**
 * Obtient la version de l'architecture de coupe
 */
export function getCutSystemVersion(): string {
  return '2.0.0'; // Nouvelle architecture
}

/**
 * Vérifie l'état du système de coupe
 */
export function getCutSystemStatus(): {
  version: string;
  handlersCount: number;
  servicesReady: boolean;
  initialized: boolean;
} {
  const factory = getCutHandlerFactory();
  const stats = factory.getStatistics();
  
  return {
    version: getCutSystemVersion(),
    handlersCount: stats.totalHandlers,
    servicesReady: true, // Les services sont toujours prêts (singletons)
    initialized: stats.totalHandlers > 0
  };
}