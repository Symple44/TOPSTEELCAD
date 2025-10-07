/**
 * FeatureBatcher - Traitement par lots des features
 * Optimise le traitement en groupant les opérations similaires
 */

import * as THREE from 'three';
import { Feature, FeatureType, IFeatureProcessor, ProcessorResult } from '../types';
import { PivotElement } from '@/types/viewer';
import { FeatureProcessorFactory } from '../processors/FeatureProcessorFactory';
import { GeometryCache } from '../cache/GeometryCache';
import { Logger } from '../../../utils/logger';

/**
 * Options de batching
 */
export interface BatchOptions {
  maxBatchSize: number;
  parallelProcessing: boolean;
  cacheResults: boolean;
  optimizeOrder: boolean;
  continueOnError: boolean;
}

/**
 * Résultat de batch
 */
export interface BatchResult {
  success: boolean;
  totalFeatures: number;
  processedFeatures: number;
  failedFeatures: number;
  geometry?: THREE.BufferGeometry;
  errors: Array<{ feature: Feature; error: string }>;
  performance: {
    totalTime: number;
    averageTime: number;
    batchedGroups: number;
  };
}

/**
 * Groupe de features pour traitement
 */
interface FeatureBatch {
  type: FeatureType;
  processor: IFeatureProcessor;
  features: Feature[];
}

/**
 * Gestionnaire de traitement par lots
 */
export class FeatureBatcher {
  private factory: FeatureProcessorFactory;
  private cache: GeometryCache;
  private logger = Logger;
  private options: BatchOptions;
  
  constructor(options?: Partial<BatchOptions>) {
    this.factory = FeatureProcessorFactory.getInstance();
    this.cache = new GeometryCache();
    this.options = {
      maxBatchSize: 50,
      parallelProcessing: false,
      cacheResults: true,
      optimizeOrder: true,
      continueOnError: true,
      ...options
    };
  }
  
  /**
   * Traite un lot de features
   */
  async processBatch(
    geometry: THREE.BufferGeometry,
    features: Feature[],
    element: PivotElement
  ): Promise<BatchResult> {
    const startTime = performance.now();
    
    this.logger.info(`Starting batch processing of ${features.length} features`);
    
    // Optimiser l'ordre si demandé
    const orderedFeatures = this.options.optimizeOrder 
      ? this.optimizeFeatureOrder(features)
      : features;
    
    // Grouper les features par type
    const batches = this.groupFeaturesByType(orderedFeatures);
    
    // Traiter les batches
    const result = await this.processBatches(geometry, batches, element);
    
    // Calculer les métriques
    const totalTime = performance.now() - startTime;
    result.performance = {
      totalTime,
      averageTime: totalTime / features.length,
      batchedGroups: batches.length
    };
    
    this.logger.info('Batch processing completed', {
      totalFeatures: result.totalFeatures,
      processedFeatures: result.processedFeatures,
      failedFeatures: result.failedFeatures,
      totalTime: `${totalTime.toFixed(2)}ms`
    });
    
    return result;
  }
  
  /**
   * Optimise l'ordre des features pour minimiser les opérations
   */
  private optimizeFeatureOrder(features: Feature[]): Feature[] {
    // Stratégie d'optimisation:
    // 1. Grouper par type
    // 2. Trier par complexité (simple -> complexe)
    // 3. Placer les découpes en dernier (plus coûteuses)
    
    const featureComplexity = (feature: Feature): number => {
      switch (feature.type) {
        case FeatureType.MARKING:
        case FeatureType.TEXT:
          return 1; // Très simple
        case FeatureType.HOLE:
        case FeatureType.DRILL_PATTERN:
          return 2; // Simple
        case FeatureType.CHAMFER:
        case FeatureType.BEVEL:
          return 3; // Moyen
        case FeatureType.SLOT:
        case FeatureType.NOTCH:
          return 4; // Complexe
        case FeatureType.CUTOUT:
        case FeatureType.COPING:
          return 5; // Très complexe
        default:
          return 3;
      }
    };
    
    return [...features].sort((a, b) => {
      const complexityA = featureComplexity(a);
      const complexityB = featureComplexity(b);
      
      if (complexityA !== complexityB) {
        return complexityA - complexityB;
      }
      
      // Si même complexité, grouper par type
      return a.type.localeCompare(b.type);
    });
  }
  
  /**
   * Groupe les features par type
   */
  private groupFeaturesByType(features: Feature[]): FeatureBatch[] {
    const groups = new Map<FeatureType, Feature[]>();
    
    // Grouper
    for (const feature of features) {
      if (!groups.has(feature.type)) {
        groups.set(feature.type, []);
      }
      groups.get(feature.type)!.push(feature);
    }
    
    // Créer les batches avec processors
    const batches: FeatureBatch[] = [];
    
    for (const [type, groupFeatures] of groups) {
      const processor = this.factory.getProcessor(type);
      
      if (processor) {
        // Diviser en sous-batches si trop grand
        const chunks = this.chunkArray(groupFeatures, this.options.maxBatchSize);
        
        for (const chunk of chunks) {
          batches.push({
            type,
            processor,
            features: chunk
          });
        }
      } else {
        this.logger.warn(`No processor found for type: ${type}`);
      }
    }
    
    return batches;
  }
  
  /**
   * Traite les batches
   */
  private async processBatches(
    initialGeometry: THREE.BufferGeometry,
    batches: FeatureBatch[],
    element: PivotElement
  ): Promise<BatchResult> {
    let currentGeometry = initialGeometry;
    let processedCount = 0;
    let failedCount = 0;
    const errors: Array<{ feature: Feature; error: string }> = [];
    const totalFeatures = batches.reduce((sum, b) => sum + b.features.length, 0);
    
    for (const batch of batches) {
      this.logger.debug(`Processing batch of ${batch.features.length} ${batch.type} features`);
      
      if (this.options.parallelProcessing && this.canParallelProcess(batch)) {
        // Traitement parallèle pour certains types
        const results = await this.processParallelBatch(
          currentGeometry, 
          batch, 
          element
        );
        
        // Appliquer les résultats
        for (const result of results) {
          if (result.success) {
            processedCount++;
            if (result.geometry) {
              currentGeometry = result.geometry;
            }
          } else {
            failedCount++;
            if (!this.options.continueOnError) {
              break;
            }
          }
        }
      } else {
        // Traitement séquentiel
        for (const feature of batch.features) {
          const result = await this.processFeature(
            currentGeometry,
            feature,
            batch.processor,
            element
          );
          
          if (result.success) {
            processedCount++;
            if (result.geometry) {
              // Disposer l'ancienne géométrie si ce n'est pas l'originale
              if (currentGeometry !== initialGeometry) {
                currentGeometry.dispose();
              }
              currentGeometry = result.geometry;
            }
          } else {
            failedCount++;
            errors.push({ 
              feature, 
              error: result.error || 'Unknown error' 
            });
            
            if (!this.options.continueOnError) {
              break;
            }
          }
        }
      }
      
      if (failedCount > 0 && !this.options.continueOnError) {
        break;
      }
    }
    
    return {
      success: failedCount === 0,
      totalFeatures,
      processedFeatures: processedCount,
      failedFeatures: failedCount,
      geometry: currentGeometry,
      errors,
      performance: {
        totalTime: 0,
        averageTime: 0,
        batchedGroups: batches.length
      }
    };
  }
  
  /**
   * Traite une feature individuelle
   */
  private async processFeature(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    processor: IFeatureProcessor,
    element: PivotElement
  ): Promise<ProcessorResult> {
    try {
      // Vérifier le cache si activé
      if (this.options.cacheResults) {
        const cacheKey = this.generateCacheKey(feature, element);
        const cachedGeometry = this.cache.get(cacheKey);
        
        if (cachedGeometry) {
          this.logger.debug(`Cache hit for feature ${feature.id}`);
          return {
            success: true,
            geometry: cachedGeometry
          };
        }
      }
      
      // Traiter
      const result = processor.process(geometry, feature, element);
      
      // Mettre en cache si succès
      if (result.success && result.geometry && this.options.cacheResults) {
        const cacheKey = this.generateCacheKey(feature, element);
        this.cache.set(cacheKey, result.geometry);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to process feature ${feature.id}`, error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Traitement parallèle d'un batch
   */
  private async processParallelBatch(
    geometry: THREE.BufferGeometry,
    batch: FeatureBatch,
    element: PivotElement
  ): Promise<ProcessorResult[]> {
    // Pour certains types de features qui ne modifient pas la géométrie
    // (comme les marquages), on peut les traiter en parallèle
    
    const promises = batch.features.map(feature => 
      this.processFeature(geometry, feature, batch.processor, element)
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Vérifie si un batch peut être traité en parallèle
   */
  private canParallelProcess(batch: FeatureBatch): boolean {
    // Seuls certains types peuvent être traités en parallèle
    // (ceux qui ne modifient pas la géométrie)
    const parallelizableTypes: FeatureType[] = [
      FeatureType.MARKING,
      FeatureType.TEXT,
      FeatureType.WELD
    ];

    return parallelizableTypes.includes(batch.type);
  }
  
  /**
   * Génère une clé de cache
   */
  private generateCacheKey(feature: Feature, element: PivotElement): string {
    return this.cache.generateKey({
      type: `${feature.type}_${feature.id}`,
      dimensions: element.dimensions,
      parameters: feature.parameters
    });
  }
  
  /**
   * Divise un tableau en chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Obtient les statistiques
   */
  getStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
  } {
    const stats = this.cache.getStatistics();
    return {
      cacheSize: stats.size,
      cacheHitRate: stats.hitRate
    };
  }
  
  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }
  
  /**
   * Dispose les ressources
   */
  dispose(): void {
    this.cache.dispose();
    this.logger.debug('FeatureBatcher disposed');
  }
}