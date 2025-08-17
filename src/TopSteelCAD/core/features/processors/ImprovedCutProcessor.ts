/**
 * ImprovedCutProcessor - Version améliorée avec pattern Strategy
 * Utilise différentes stratégies selon le type de découpe
 */

import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { Feature, IFeatureProcessor, ProcessorResult } from '../types';
import { PivotElement } from '@/types/viewer';
import { logger, createComponentLogger } from '../../utils/Logger';
import { 
  ICutStrategy,
  SimpleCutStrategy,
  TransverseCutStrategy,
  BeveledCutStrategy,
  CompoundCutStrategy
} from './strategies';

/**
 * Processeur de découpes amélioré avec stratégies
 */
export class ImprovedCutProcessor implements IFeatureProcessor {
  private strategies: Map<string, ICutStrategy>;
  private defaultStrategy: ICutStrategy;
  private log = createComponentLogger('ImprovedCutProcessor');
  
  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = new SimpleCutStrategy();
    
    // Enregistrer les stratégies
    this.registerDefaultStrategies();
  }
  
  /**
   * Enregistre les stratégies par défaut
   */
  private registerDefaultStrategies(): void {
    const strategies = [
      new SimpleCutStrategy(),
      new TransverseCutStrategy(),
      new BeveledCutStrategy(),
      new CompoundCutStrategy()
    ];
    
    strategies.forEach(strategy => {
      this.strategies.set(strategy.name, strategy);
    });
    
    this.log.debug('Registered cut strategies', { 
      strategies: Array.from(this.strategies.keys()) 
    });
  }
  
  /**
   * Ajoute une stratégie personnalisée
   */
  registerStrategy(strategy: ICutStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.log.info(`Registered custom strategy: ${strategy.name}`);
  }
  
  /**
   * Sélectionne la stratégie appropriée
   */
  private selectStrategy(feature: Feature): ICutStrategy {
    // Parcourir les stratégies pour trouver celle qui peut gérer la feature
    for (const strategy of this.strategies.values()) {
      if (strategy.canHandle(feature)) {
        this.log.debug(`Selected strategy: ${strategy.name}`, { feature });
        return strategy;
      }
    }
    
    // Utiliser la stratégie par défaut
    this.log.debug('Using default strategy', { feature });
    return this.defaultStrategy;
  }
  
  /**
   * Traite une découpe
   */
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    const startTime = performance.now();
    
    try {
      // Sélectionner la stratégie
      const strategy = this.selectStrategy(feature);
      
      // Valider
      const errors = strategy.validate(feature, element);
      if (errors.length > 0) {
        this.log.warn('Cut validation failed', { errors, feature });
        return {
          success: false,
          error: errors.join('; ')
        };
      }
      
      // Créer la géométrie de découpe
      const cutGeometry = strategy.createCutGeometry(feature, element);
      
      // Calculer la position
      const position = strategy.calculatePosition(feature, element);
      cutGeometry.translate(position.x, position.y, position.z);
      
      // Log les dimensions pour debug
      this.logGeometryInfo(geometry, cutGeometry);
      
      // Effectuer l'opération CSG
      const resultGeometry = this.performCSGOperation(
        geometry, 
        cutGeometry, 
        feature
      );
      
      // Nettoyer
      cutGeometry.dispose();
      
      // Enregistrer les métadonnées
      this.recordMetadata(resultGeometry, feature, strategy.name);
      
      const duration = performance.now() - startTime;
      this.log.info(`Cut processed successfully in ${duration.toFixed(2)}ms`, {
        strategy: strategy.name,
        featureId: feature.id
      });
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      this.log.error('Cut processing failed', error as Error, { feature });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Valide une feature
   */
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const strategy = this.selectStrategy(feature);
    return strategy.validate(feature, element);
  }
  
  /**
   * Effectue l'opération CSG
   */
  private performCSGOperation(
    baseGeometry: THREE.BufferGeometry,
    cutGeometry: THREE.BufferGeometry,
    feature: Feature
  ): THREE.BufferGeometry {
    const baseCSG = CSG.fromGeometry(baseGeometry);
    const cutCSG = CSG.fromGeometry(cutGeometry);
    
    // Soustraire la découpe
    const resultCSG = baseCSG.subtract(cutCSG);
    
    // Convertir en géométrie
    const resultGeometry = CSG.toGeometry(
      resultCSG, 
      baseGeometry.matrixWorld || new THREE.Matrix4()
    );
    
    // Optimiser
    resultGeometry.computeVertexNormals();
    resultGeometry.computeBoundingBox();
    resultGeometry.computeBoundingSphere();
    
    return resultGeometry;
  }
  
  /**
   * Log les informations de géométrie pour debug
   */
  private logGeometryInfo(
    baseGeometry: THREE.BufferGeometry,
    cutGeometry: THREE.BufferGeometry
  ): void {
    if (this.log.getLevel() >= 3) { // DEBUG level
      baseGeometry.computeBoundingBox();
      cutGeometry.computeBoundingBox();
      
      const baseBbox = baseGeometry.boundingBox!;
      const cutBbox = cutGeometry.boundingBox!;
      
      this.log.debug('Geometry bounds', {
        base: {
          min: [baseBbox.min.x, baseBbox.min.y, baseBbox.min.z],
          max: [baseBbox.max.x, baseBbox.max.y, baseBbox.max.z]
        },
        cut: {
          min: [cutBbox.min.x, cutBbox.min.y, cutBbox.min.z],
          max: [cutBbox.max.x, cutBbox.max.y, cutBbox.max.z]
        }
      });
    }
  }
  
  /**
   * Enregistre les métadonnées
   */
  private recordMetadata(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    strategyName: string
  ): void {
    // Transférer les userData existantes
    if (!geometry.userData.cuts) {
      geometry.userData.cuts = [];
    }
    
    geometry.userData.cuts.push({
      id: feature.id,
      type: feature.type,
      strategy: strategyName,
      timestamp: new Date().toISOString(),
      parameters: feature.parameters
    });
  }
  
  /**
   * Obtient les statistiques
   */
  getStatistics(): {
    strategiesCount: number;
    strategiesNames: string[];
  } {
    return {
      strategiesCount: this.strategies.size,
      strategiesNames: Array.from(this.strategies.keys())
    };
  }
  
  /**
   * Dispose les ressources
   */
  dispose(): void {
    // Disposer les stratégies si nécessaire
    this.strategies.forEach(strategy => {
      if (strategy.dispose) {
        strategy.dispose();
      }
    });
    
    this.strategies.clear();
    this.log.debug('ImprovedCutProcessor disposed');
  }
}