/**
 * CutProcessorAdapter.ts - Adaptateur pour intégrer la nouvelle architecture avec le CutProcessor existant
 * Permet une migration progressive depuis l'ancienne architecture monolithique
 */

import * as THREE from 'three';
import { Feature, FeatureType } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { ProcessResult } from '../../FeatureProcessor';
import { 
  getCutHandlerFactory, 
  CutHandlerFactory,
  CutContext,
  CutType,
  cutLogger,
  LogLevel
} from '../index';

/**
 * Mode de fonctionnement de l'adaptateur
 */
export enum AdapterMode {
  LEGACY_ONLY = 'legacy',      // Utilise uniquement l'ancien système
  NEW_ONLY = 'new',            // Utilise uniquement le nouveau système
  HYBRID = 'hybrid',           // Essaie le nouveau, fallback sur l'ancien
  MIGRATION = 'migration'      // Mode de test avec comparaison
}

/**
 * Configuration de l'adaptateur
 */
export interface AdapterConfig {
  mode: AdapterMode;
  enableLogging: boolean;
  logLevel?: LogLevel;
  enableMetrics: boolean;
  fallbackOnError: boolean;
  compareResults: boolean;
}

/**
 * Adaptateur pour faire le pont entre l'ancienne et la nouvelle architecture
 */
export class CutProcessorAdapter {
  private factory: CutHandlerFactory;
  private config: AdapterConfig;
  private legacyProcessor: any; // Référence au CutProcessor existant
  private metricsCollector: Map<string, any>;

  constructor(config?: Partial<AdapterConfig>) {
    this.factory = getCutHandlerFactory();
    this.config = {
      mode: AdapterMode.HYBRID,
      enableLogging: true,
      logLevel: LogLevel.INFO,
      enableMetrics: true,
      fallbackOnError: true,
      compareResults: false,
      ...config
    };
    
    this.metricsCollector = new Map();
    this.configureLogger();
  }

  /**
   * Configure le logger selon la configuration
   */
  private configureLogger(): void {
    if (this.config.enableLogging) {
      cutLogger.setLogLevel(this.config.logLevel || LogLevel.INFO);
      cutLogger.setPerformanceTracking(this.config.enableMetrics);
    } else {
      cutLogger.setLogLevel(LogLevel.NONE);
    }
  }

  /**
   * Définit le processeur legacy pour le fallback
   */
  setLegacyProcessor(processor: any): void {
    this.legacyProcessor = processor;
    console.log('✅ Legacy CutProcessor connected to adapter');
  }

  /**
   * Point d'entrée principal - remplace CutProcessor.process()
   */
  async process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): Promise<ProcessResult> {
    
    // Déterminer quelle architecture utiliser
    switch (this.config.mode) {
      case AdapterMode.LEGACY_ONLY:
        return this.processWithLegacy(geometry, feature, element);
        
      case AdapterMode.NEW_ONLY:
        return this.processWithNew(geometry, feature, element);
        
      case AdapterMode.HYBRID:
        return this.processHybrid(geometry, feature, element);
        
      case AdapterMode.MIGRATION:
        return this.processMigration(geometry, feature, element);
        
      default:
        return this.processWithLegacy(geometry, feature, element);
    }
  }

  /**
   * Traite avec l'ancienne architecture uniquement
   */
  private async processWithLegacy(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): Promise<ProcessResult> {
    if (!this.legacyProcessor) {
      return {
        success: false,
        error: 'Legacy processor not configured'
      };
    }
    
    cutLogger.info('Processing with LEGACY architecture', {
      featureId: feature.id,
      featureType: feature.type
    });
    
    return this.legacyProcessor.process(geometry, feature, element);
  }

  /**
   * Traite avec la nouvelle architecture uniquement
   */
  private async processWithNew(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): Promise<ProcessResult> {
    const operationId = cutLogger.startCutOperation(feature, element);
    
    try {
      // Trouver le handler approprié
      const handler = this.factory.findBestHandler(feature);
      
      if (!handler) {
        throw new Error(`No handler found for feature type: ${feature.type}`);
      }
      
      cutLogger.logHandlerSelection(handler.name, 'Best match', operationId);
      
      // Créer le contexte
      const context: CutContext = {
        feature,
        element,
        baseGeometry: geometry,
        cutType: this.detectCutType(feature)
      };
      
      // Traiter avec le handler
      const result = handler.process(context);
      
      if (result.success) {
        cutLogger.endCutOperation(operationId, true);
        return {
          success: true,
          geometry: result.geometry
          // metadata: result.metadata
        };
      } else {
        throw new Error(result.error || 'Handler processing failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      cutLogger.endCutOperation(operationId, false, errorMessage);
      
      if (this.config.fallbackOnError && this.legacyProcessor) {
        cutLogger.warn('Falling back to legacy processor after error', { error: errorMessage });
        return this.processWithLegacy(geometry, feature, element);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Mode hybride - essaie le nouveau, fallback sur l'ancien si nécessaire
   */
  private async processHybrid(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): Promise<ProcessResult> {
    // Déterminer si on devrait utiliser le nouveau système
    if (this.shouldUseNewArchitecture(feature)) {
      cutLogger.info('Attempting NEW architecture', {
        featureId: feature.id,
        reason: 'Feature supported by new system'
      });
      
      const result = await this.processWithNew(geometry, feature, element);
      
      if (result.success || !this.config.fallbackOnError) {
        return result;
      }
      
      // Fallback si échec
      cutLogger.warn('NEW architecture failed, falling back to LEGACY', {
        error: result.error
      });
    }
    
    return this.processWithLegacy(geometry, feature, element);
  }

  /**
   * Mode migration - compare les résultats des deux architectures
   */
  private async processMigration(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): Promise<ProcessResult> {
    cutLogger.info('MIGRATION mode - comparing both architectures', {
      featureId: feature.id
    });
    
    // Cloner la géométrie pour éviter les effets de bord
    const geometryForNew = geometry.clone();
    const geometryForLegacy = geometry.clone();
    
    // Traiter avec les deux systèmes
    const [newResult, legacyResult] = await Promise.allSettled([
      this.processWithNew(geometryForNew, feature, element),
      this.processWithLegacy(geometryForLegacy, feature, element)
    ]);
    
    // Analyser les résultats
    const comparison = this.compareResults(newResult, legacyResult, feature);
    
    // Logger la comparaison
    cutLogger.info('Migration comparison results', comparison);
    
    // Collecter les métriques
    if (this.config.enableMetrics) {
      this.collectMigrationMetrics(feature, comparison);
    }
    
    // Retourner le résultat legacy par défaut (plus stable)
    if (legacyResult.status === 'fulfilled' && legacyResult.value.success) {
      return legacyResult.value;
    }
    
    // Si legacy a échoué, essayer new
    if (newResult.status === 'fulfilled' && newResult.value.success) {
      cutLogger.warn('Legacy failed but new succeeded - using new result');
      return newResult.value;
    }
    
    // Les deux ont échoué
    return {
      success: false,
      error: 'Both architectures failed in migration mode'
    };
  }

  /**
   * Détermine si on devrait utiliser la nouvelle architecture
   */
  private shouldUseNewArchitecture(feature: Feature): boolean {
    // Vérifier si un handler existe pour cette feature
    const handler = this.factory.findBestHandler(feature);
    if (!handler) {
      return false;
    }

    // Liste des features bien supportées par la nouvelle architecture
    const wellSupportedTypes: FeatureType[] = [
      FeatureType.END_CUT,
      FeatureType.NOTCH
    ];

    if (wellSupportedTypes.includes(feature.type)) {
      return true;
    }
    
    // Vérifier les paramètres spécifiques
    const params = feature.parameters as any;
    
    // Patterns bien supportés
    if (params.cutType === 'partial_notches') {
      return true; // PartialNotchHandler
    }
    
    if (params.isEndCut || params.cutType === 'end_cut') {
      return true; // EndCutHandler
    }
    
    if (params.dstvBlock === 'AK' || params.dstvBlock === 'IK') {
      return true; // ExteriorCutHandler / InteriorCutHandler
    }
    
    // Par défaut, utiliser l'ancien système pour la stabilité
    return false;
  }

  /**
   * Compare les résultats des deux architectures
   */
  private compareResults(
    newResult: PromiseSettledResult<ProcessResult>,
    legacyResult: PromiseSettledResult<ProcessResult>,
    feature: Feature
  ): any {
    const comparison: any = {
      featureId: feature.id,
      featureType: feature.type,
      newSuccess: newResult.status === 'fulfilled' && newResult.value.success,
      legacySuccess: legacyResult.status === 'fulfilled' && legacyResult.value.success,
      match: false,
      differences: []
    };
    
    // Si les deux ont réussi, comparer les géométries
    if (comparison.newSuccess && comparison.legacySuccess) {
      const newGeom = (newResult as PromiseFulfilledResult<ProcessResult>).value.geometry;
      const legacyGeom = (legacyResult as PromiseFulfilledResult<ProcessResult>).value.geometry;
      
      if (newGeom && legacyGeom) {
        // Comparer le nombre de vertices
        const newVertices = newGeom.attributes.position?.count || 0;
        const legacyVertices = legacyGeom.attributes.position?.count || 0;
        
        comparison.vertexCountNew = newVertices;
        comparison.vertexCountLegacy = legacyVertices;
        comparison.vertexDifference = Math.abs(newVertices - legacyVertices);
        
        // Tolérance de 5% pour considérer comme équivalent
        comparison.match = comparison.vertexDifference / legacyVertices < 0.05;
        
        if (!comparison.match) {
          comparison.differences.push(`Vertex count difference: ${comparison.vertexDifference}`);
        }
      }
    } else {
      // Différence de succès
      if (comparison.newSuccess !== comparison.legacySuccess) {
        comparison.differences.push('Success status mismatch');
      }
    }
    
    return comparison;
  }

  /**
   * Collecte des métriques de migration
   */
  private collectMigrationMetrics(feature: Feature, comparison: any): void {
    const key = `${feature.type}_${feature.parameters.cutType || 'default'}`;
    
    if (!this.metricsCollector.has(key)) {
      this.metricsCollector.set(key, {
        total: 0,
        newSuccess: 0,
        legacySuccess: 0,
        matches: 0,
        differences: []
      });
    }
    
    const metrics = this.metricsCollector.get(key);
    metrics.total++;
    
    if (comparison.newSuccess) metrics.newSuccess++;
    if (comparison.legacySuccess) metrics.legacySuccess++;
    if (comparison.match) metrics.matches++;
    
    if (comparison.differences.length > 0) {
      metrics.differences.push(...comparison.differences);
    }
  }

  /**
   * Détecte le type de coupe
   */
  private detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    // Utiliser le CutTypeDetector si disponible
    // Pour l'instant, détection basique
    if (feature.type === FeatureType.END_CUT) {
      return CutType.END_STRAIGHT;
    }
    
    if (params.cutType === 'partial_notches') {
      return CutType.NOTCH_PARTIAL;
    }
    
    if (params.dstvBlock === 'AK') {
      return CutType.EXTERIOR_CUT;
    }
    
    if (params.dstvBlock === 'IK') {
      return CutType.INTERIOR_CUT;
    }
    
    return CutType.STRAIGHT_CUT;
  }

  /**
   * Obtient les métriques collectées
   */
  getMetrics(): Map<string, any> {
    return new Map(this.metricsCollector);
  }

  /**
   * Réinitialise les métriques
   */
  resetMetrics(): void {
    this.metricsCollector.clear();
  }

  /**
   * Change le mode de l'adaptateur
   */
  setMode(mode: AdapterMode): void {
    this.config.mode = mode;
    cutLogger.info(`Adapter mode changed to: ${mode}`);
  }

  /**
   * Obtient le mode actuel
   */
  getMode(): AdapterMode {
    return this.config.mode;
  }

  /**
   * Obtient les statistiques du logger
   */
  getStatistics(): any {
    return cutLogger.getStatistics();
  }

  /**
   * Exporte un rapport de migration
   */
  exportMigrationReport(): string {
    const report = {
      mode: this.config.mode,
      metrics: Array.from(this.metricsCollector.entries()),
      statistics: cutLogger.getStatistics(),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(report, null, 2);
  }
}

/**
 * Instance singleton pour usage global
 */
let adapterInstance: CutProcessorAdapter | null = null;

export function getCutProcessorAdapter(config?: Partial<AdapterConfig>): CutProcessorAdapter {
  if (!adapterInstance) {
    adapterInstance = new CutProcessorAdapter(config);
  }
  return adapterInstance;
}

export function resetCutProcessorAdapter(): void {
  adapterInstance = null;
}