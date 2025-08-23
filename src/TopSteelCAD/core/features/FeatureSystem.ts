/**
 * Système unifié de gestion des features pour TopSteelCAD
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import {
  Feature,
  FeatureType,
  FeatureResult,
  IFeatureProcessor,
  FeatureSystemConfig
} from './types';
import {
  HoleProcessor,
  SlotProcessor,
  CutoutProcessor,
  ContourProcessor,
  ChamferProcessor,
  WeldProcessor,
  NotchProcessor,
  TappedHoleProcessor,
  CounterSinkProcessor,
  DrillPatternProcessor,
  BevelProcessor,
  MarkingProcessor,
  TextProcessor,
  CopingProcessor
} from './processors';

/**
 * Cache optimisé pour les géométries
 */
class GeometryCache {
  private cache = new Map<string, THREE.BufferGeometry>();
  private maxSize: number;
  private accessCount = new Map<string, number>();
  private lastAccess = new Map<string, number>();
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  generateKey(element: PivotElement, features: Feature[]): string {
    const elementKey = `${element.id}_${JSON.stringify(element.dimensions)}`;
    const featuresKey = features
      .map(f => `${f.type}_${f.id}_${f.position.toArray().join(',')}_${JSON.stringify(f.parameters)}`)
      .join('|');
    return `${elementKey}::${featuresKey}`;
  }
  
  get(key: string): THREE.BufferGeometry | null {
    const geometry = this.cache.get(key);
    if (geometry) {
      // Mettre à jour les statistiques d'accès
      this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
      this.lastAccess.set(key, Date.now());
      return geometry;
    }
    return null;
  }
  
  set(key: string, geometry: THREE.BufferGeometry): void {
    // Si le cache est plein, supprimer l'élément le moins récemment utilisé
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // Cloner la géométrie pour éviter les modifications externes
    const clonedGeometry = geometry.clone();
    this.cache.set(key, clonedGeometry);
    this.accessCount.set(key, 1);
    this.lastAccess.set(key, Date.now());
  }
  
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.lastAccess.entries()) {
      // Prioriser l'éviction des éléments peu utilisés
      const accessCount = this.accessCount.get(key) || 1;
      const score = time * accessCount; // Plus le score est bas, plus l'élément est candidat à l'éviction
      
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const geometry = this.cache.get(oldestKey);
      geometry?.dispose();
      this.cache.delete(oldestKey);
      this.accessCount.delete(oldestKey);
      this.lastAccess.delete(oldestKey);
    }
  }
  
  clear(): void {
    this.cache.forEach(geometry => geometry.dispose());
    this.cache.clear();
    this.accessCount.clear();
    this.lastAccess.clear();
  }
  
  getStatistics(): {
    size: number;
    hitRate: number;
    mostAccessed: string[];
  } {
    const totalAccesses = Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0);
    const hits = this.cache.size;
    
    // Trouver les éléments les plus accédés
    const sortedByAccess = Array.from(this.accessCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key);
    
    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? hits / totalAccesses : 0,
      mostAccessed: sortedByAccess
    };
  }
}

/**
 * Validateur de features
 */
class FeatureValidator {
  private config: FeatureSystemConfig;
  
  constructor(config: FeatureSystemConfig) {
    this.config = config;
  }
  
  validateFeatures(features: Feature[], element: PivotElement): string[] {
    if (!this.config.validateFeatures) {
      return [];
    }
    
    const errors: string[] = [];
    const bounds = this.getElementBounds(element);
    
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      // Vérifier la position
      if (!this.isPositionValid(feature.position, bounds)) {
        errors.push(`Feature ${feature.id} at index ${i}: Position out of bounds`);
      }
      
      // Vérifier les conflits entre features
      for (let j = i + 1; j < features.length; j++) {
        const other = features[j];
        const conflict = this.checkConflict(feature, other);
        if (conflict) {
          errors.push(`Feature ${feature.id} conflicts with ${other.id}: ${conflict}`);
        }
      }
    }
    
    return errors;
  }
  
  private getElementBounds(element: PivotElement): THREE.Box3 {
    const dims = element.dimensions;
    const halfLength = (dims.length || 1000) / 2;
    const halfHeight = (dims.height || 100) / 2;
    const halfWidth = (dims.width || 100) / 2;
    
    return new THREE.Box3(
      new THREE.Vector3(-halfLength, -halfHeight, -halfWidth),
      new THREE.Vector3(halfLength, halfHeight, halfWidth)
    );
  }
  
  private isPositionValid(position: THREE.Vector3, bounds: THREE.Box3): boolean {
    const expandedBounds = bounds.clone().expandByScalar(this.config.tolerances.position);
    return expandedBounds.containsPoint(position);
  }
  
  private checkConflict(f1: Feature, f2: Feature): string | null {
    // Vérifier les chevauchements de trous
    if (f1.type === FeatureType.HOLE && f2.type === FeatureType.HOLE) {
      const distance = f1.position.distanceTo(f2.position);
      const minDistance = (
        (f1.parameters.diameter || 0) + (f2.parameters.diameter || 0)
      ) / 2 + this.config.tolerances.hole;
      
      if (distance < minDistance) {
        return `Holes overlap (distance: ${distance.toFixed(2)}mm, min: ${minDistance.toFixed(2)}mm)`;
      }
    }
    
    return null;
  }
}

/**
 * Gestionnaire principal des features
 */
export class FeatureSystem {
  private static instance: FeatureSystem;
  private processors: Map<FeatureType, IFeatureProcessor>;
  private cache: GeometryCache;
  private validator: FeatureValidator;
  private config: FeatureSystemConfig;
  
  private constructor(config?: Partial<FeatureSystemConfig>) {
    this.config = {
      cacheEnabled: true,
      cacheSize: 100,
      validateFeatures: true,
      optimizeGeometry: true,
      mergeVertices: true,
      tolerances: {
        position: 1.0,
        angle: 0.01,
        hole: 0.5,
        cut: 0.5
      },
      ...config
    };
    
    this.processors = new Map();
    this.cache = new GeometryCache(this.config.cacheSize);
    this.validator = new FeatureValidator(this.config);
    
    this.registerDefaultProcessors();
  }
  
  static getInstance(config?: Partial<FeatureSystemConfig>): FeatureSystem {
    if (!FeatureSystem.instance) {
      FeatureSystem.instance = new FeatureSystem(config);
    }
    return FeatureSystem.instance;
  }
  
  /**
   * Enregistre les processeurs par défaut
   */
  private registerDefaultProcessors(): void {
    // Trous et perçages
    this.processors.set(FeatureType.HOLE, new HoleProcessor());
    this.processors.set(FeatureType.TAPPED_HOLE, new TappedHoleProcessor());
    this.processors.set(FeatureType.COUNTERSINK, new CounterSinkProcessor());
    this.processors.set(FeatureType.COUNTERBORE, new CounterSinkProcessor());
    this.processors.set(FeatureType.DRILL_PATTERN, new DrillPatternProcessor());
    
    // Découpes et contours
    this.processors.set(FeatureType.SLOT, new SlotProcessor());
    this.processors.set(FeatureType.CUTOUT, new CutoutProcessor());
    this.processors.set(FeatureType.CONTOUR, new ContourProcessor());
    this.processors.set(FeatureType.NOTCH, new NotchProcessor());
    this.processors.set(FeatureType.COPING, new CopingProcessor());
    
    // Finitions
    this.processors.set(FeatureType.CHAMFER, new ChamferProcessor());
    this.processors.set(FeatureType.BEVEL, new BevelProcessor());
    
    // Marquages et textes
    this.processors.set(FeatureType.MARKING, new MarkingProcessor());
    this.processors.set(FeatureType.TEXT, new TextProcessor());
    
    // Soudures
    this.processors.set(FeatureType.WELD, new WeldProcessor());
  }
  
  /**
   * Enregistre un processeur personnalisé
   */
  registerProcessor(type: FeatureType, processor: IFeatureProcessor): void {
    // Disposer l'ancien processeur s'il existe
    const oldProcessor = this.processors.get(type);
    oldProcessor?.dispose?.();
    
    this.processors.set(type, processor);
  }
  
  /**
   * Applique une liste de features à une géométrie
   */
  applyFeatures(
    baseGeometry: THREE.BufferGeometry,
    features: Feature[],
    element: PivotElement
  ): FeatureResult {
    // const startTime = performance.now(); // Timing disabled
    
    // Vérifier le cache si activé
    if (this.config.cacheEnabled) {
      const cacheKey = this.cache.generateKey(element, features);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // const endTime = performance.now(); // Timing disabled
        
        return {
          geometry: cached,
          boundingBox: new THREE.Box3().setFromBufferAttribute(
            cached.attributes.position as THREE.BufferAttribute
          ),
          volume: this.calculateVolume(cached),
          success: true
        };
      }
    }
    
    // Valider les features
    const validationErrors = this.validator.validateFeatures(features, element);
    if (validationErrors.length > 0 && this.config.validateFeatures) {
      console.warn('[FeatureSystem] Validation errors:', validationErrors);
      // Continuer malgré les erreurs de validation (avec avertissement)
    }
    
    // Grouper les features par type pour le traitement par batch
    const featuresByType = this.groupFeaturesByType(features);
    
    // Trier les types par priorité
    const sortedTypes = this.sortTypesByPriority(Array.from(featuresByType.keys()));
    
    // Appliquer les features
    let currentGeometry = baseGeometry.clone();
    const errors: string[] = [];
    const warnings: string[] = [...validationErrors];
    
    for (const type of sortedTypes) {
      const featuresOfType = featuresByType.get(type)!;
      const processor = this.processors.get(type);
      
      if (!processor) {
        errors.push(`No processor found for feature type: ${type}`);
        continue;
      }
      
      // Traiter par batch si possible
      if (featuresOfType.length > 1 && this.canProcessBatch(processor)) {
        const batchResult = (processor as any).processBatch?.(
          currentGeometry,
          featuresOfType,
          element
        );
        
        if (batchResult?.success && batchResult.geometry) {
          if (currentGeometry !== baseGeometry) {
            currentGeometry.dispose();
          }
          currentGeometry = batchResult.geometry;
        } else if (batchResult?.error) {
          errors.push(batchResult.error);
        }
      } else {
        // Traiter individuellement
        for (const feature of featuresOfType) {
          try {
            const result = processor.process(currentGeometry, feature, element);
            
            if (result.success && result.geometry) {
              if (currentGeometry !== baseGeometry) {
                currentGeometry.dispose();
              }
              currentGeometry = result.geometry;
            } else if (result.error) {
              errors.push(`Feature ${feature.id}: ${result.error}`);
            }
            
            if (result.warning) {
              warnings.push(`Feature ${feature.id}: ${result.warning}`);
            }
          } catch (error) {
            errors.push(`Feature ${feature.id}: ${error}`);
          }
        }
      }
    }
    
    // Optimiser la géométrie finale
    if (this.config.optimizeGeometry) {
      currentGeometry = this.optimizeGeometry(currentGeometry);
    }
    
    // Mettre en cache si activé
    if (this.config.cacheEnabled && errors.length === 0) {
      const cacheKey = this.cache.generateKey(element, features);
      this.cache.set(cacheKey, currentGeometry);
    }
    
    // Calculer les métriques
    const boundingBox = new THREE.Box3().setFromBufferAttribute(
      currentGeometry.attributes.position as THREE.BufferAttribute
    );
    
    // const endTime = performance.now(); // Timing disabled
    
    return {
      geometry: currentGeometry,
      boundingBox,
      volume: this.calculateVolume(currentGeometry),
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Groupe les features par type
   */
  private groupFeaturesByType(features: Feature[]): Map<FeatureType, Feature[]> {
    const grouped = new Map<FeatureType, Feature[]>();
    
    for (const feature of features) {
      const list = grouped.get(feature.type) || [];
      list.push(feature);
      grouped.set(feature.type, list);
    }
    
    return grouped;
  }
  
  /**
   * Trie les types par priorité d'application
   */
  private sortTypesByPriority(types: FeatureType[]): FeatureType[] {
    const priority: Record<FeatureType, number> = {
      // Contours et grandes découpes d'abord
      [FeatureType.CONTOUR]: 1,
      [FeatureType.CUT]: 2,
      [FeatureType.CUTOUT]: 3,
      [FeatureType.NOTCH]: 4,
      [FeatureType.COPING]: 5,
      
      // Puis les trous et perçages
      [FeatureType.SLOT]: 6,
      [FeatureType.DRILL_PATTERN]: 7,
      [FeatureType.HOLE]: 8,
      [FeatureType.TAPPED_HOLE]: 9,
      [FeatureType.COUNTERSINK]: 10,
      [FeatureType.COUNTERBORE]: 11,
      
      // Finitions
      [FeatureType.CHAMFER]: 12,
      [FeatureType.BEVEL]: 13,
      
      // Marquages et textes
      [FeatureType.MARKING]: 14,
      [FeatureType.TEXT]: 15,
      
      // Soudures en dernier
      [FeatureType.WELD]: 16,
      [FeatureType.WELD_PREP]: 17,
      
      // DSTV avancés
      [FeatureType.THREAD]: 18,
      [FeatureType.UNRESTRICTED_CONTOUR]: 19,
      [FeatureType.BEND]: 20,
      [FeatureType.PROFILE]: 21,
      [FeatureType.VOLUME]: 22,
      [FeatureType.NUMERIC_CONTROL]: 23,
      [FeatureType.FREE_PROGRAM]: 24,
      [FeatureType.LINE_PROGRAM]: 25,
      [FeatureType.ROTATION]: 26,
      [FeatureType.WASHING]: 27,
      [FeatureType.GROUP]: 28,
      [FeatureType.VARIABLE]: 29,
      [FeatureType.PUNCH]: 30,
      [FeatureType.WORK_PLANE]: 31,
      [FeatureType.INFORMATION]: 32
    };
    
    return types.sort((a, b) => (priority[a] || 99) - (priority[b] || 99));
  }
  
  /**
   * Vérifie si un processeur supporte le traitement par batch
   */
  private canProcessBatch(processor: IFeatureProcessor): boolean {
    return typeof (processor as any).processBatch === 'function';
  }
  
  /**
   * Optimise une géométrie
   */
  private optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.config.optimizeGeometry) {
      return geometry;
    }
    
    // Merger les vertices proches si activé
    if (this.config.mergeVertices) {
      // THREE.BufferGeometryUtils n'est pas directement disponible
      // Il faudrait l'importer depuis three/examples/jsm/utils/BufferGeometryUtils
      // Pour l'instant, on skip cette optimisation
    }
    
    // Recalculer les normales
    geometry.computeVertexNormals();
    
    // Calculer les bounding boxes
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
  }
  
  /**
   * Calcule le volume approximatif d'une géométrie
   */
  private calculateVolume(geometry: THREE.BufferGeometry): number {
    const box = new THREE.Box3().setFromBufferAttribute(
      geometry.attributes.position as THREE.BufferAttribute
    );
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Volume approximatif basé sur la bounding box
    // Pour un calcul précis, il faudrait utiliser une méthode plus sophistiquée
    return size.x * size.y * size.z;
  }
  
  /**
   * Obtient les statistiques du système
   */
  getStatistics(): {
    cacheStats: ReturnType<GeometryCache['getStatistics']>;
    processorsCount: number;
    config: FeatureSystemConfig;
  } {
    return {
      cacheStats: this.cache.getStatistics(),
      processorsCount: this.processors.size,
      config: this.config
    };
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.cache.clear();
    this.processors.forEach(processor => processor.dispose?.());
    this.processors.clear();
  }
  
  /**
   * Réinitialise le système
   */
  reset(): void {
    this.cache.clear();
    this.registerDefaultProcessors();
  }
}

// Export pour utilisation globale
export default FeatureSystem;