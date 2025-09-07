/**
 * CSGOperationService.ts - Service pour les opérations CSG (Constructive Solid Geometry)
 * Gère les opérations booléennes entre géométries avec three-bvh-csg
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, ADDITION, INTERSECTION, DIFFERENCE } from 'three-bvh-csg';
import { getCSGWorkerManager } from '../workers/CSGWorkerManager';
import { configManager } from '../config/ProductionConfig';

/**
 * Types d'opérations CSG supportées
 */
export enum CSGOperation {
  SUBTRACTION = 'SUBTRACTION',
  ADDITION = 'ADDITION',
  INTERSECTION = 'INTERSECTION',
  DIFFERENCE = 'DIFFERENCE'
}

/**
 * Options pour les opérations CSG
 */
export interface CSGOptions {
  useGroups?: boolean;
  attributes?: string[];
  consolidateGroups?: boolean;
  performanceMode?: 'fast' | 'balanced' | 'quality';
  maxVertices?: number;
  validateResult?: boolean;
}

/**
 * Résultat d'une opération CSG
 */
export interface CSGResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  error?: string;
  performanceMetrics?: {
    preparationTime: number;
    operationTime: number;
    optimizationTime: number;
    totalTime: number;
    vertexCountBefore: number;
    vertexCountAfter: number;
    workerUsed?: boolean;
  };
}

/**
 * Service centralisant toutes les opérations CSG
 */
export class CSGOperationService {
  private evaluator: Evaluator;
  private defaultOptions: CSGOptions;
  private performanceMetrics: Map<string, any>;
  private workerManager: any;

  constructor(options?: CSGOptions) {
    this.evaluator = new Evaluator();
    this.defaultOptions = {
      useGroups: false,
      attributes: ['position', 'normal', 'uv'],
      consolidateGroups: false,
      performanceMode: 'balanced',
      maxVertices: 100000,
      validateResult: true,
      ...options
    };
    
    this.performanceMetrics = new Map();
    this.configureEvaluator();
    
    // Initialiser le gestionnaire de workers si activé
    const config = configManager.getConfig();
    if (config.performance.enableWebWorkers) {
      this.workerManager = getCSGWorkerManager();
    }
  }

  /**
   * Configure l'évaluateur CSG selon les options
   */
  private configureEvaluator(): void {
    this.evaluator.useGroups = this.defaultOptions.useGroups || false;
    this.evaluator.attributes = this.defaultOptions.attributes || ['position', 'normal'];
    // this.evaluator.consolidateGroups = this.defaultOptions.consolidateGroups || false;
  }

  /**
   * Effectue une soustraction CSG (retire cutGeometry de baseGeometry)
   */
  async performSubtraction(
    baseGeometry: THREE.BufferGeometry,
    cutGeometry: THREE.BufferGeometry,
    options?: CSGOptions
  ): Promise<CSGResult> {
    return this.performOperation(
      baseGeometry,
      cutGeometry,
      CSGOperation.SUBTRACTION,
      options
    );
  }

  /**
   * Effectue une addition CSG (combine les géométries)
   */
  async performAddition(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry,
    options?: CSGOptions
  ): Promise<CSGResult> {
    return this.performOperation(
      geometry1,
      geometry2,
      CSGOperation.ADDITION,
      options
    );
  }

  /**
   * Effectue une intersection CSG (garde uniquement la partie commune)
   */
  async performIntersection(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry,
    options?: CSGOptions
  ): Promise<CSGResult> {
    return this.performOperation(
      geometry1,
      geometry2,
      CSGOperation.INTERSECTION,
      options
    );
  }

  /**
   * Détermine si une opération doit être déchargée vers un WebWorker
   */
  private shouldUseWorker(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry,
    options?: CSGOptions
  ): boolean {
    const config = configManager.getConfig();
    
    // WebWorkers désactivés
    if (!config.performance.enableWebWorkers || !this.workerManager) {
      return false;
    }
    
    // Calculer la complexité
    const complexity = this.estimateComplexity(geometry1, geometry2);
    const totalVertices = 
      (geometry1.attributes.position?.count || 0) + 
      (geometry2.attributes.position?.count || 0);
    
    // Seuils pour déclencher l'utilisation des workers
    const COMPLEXITY_THRESHOLD = 10000; // Complexité élevée
    const VERTEX_THRESHOLD = 5000; // Nombre de vertices élevé
    
    // Utiliser un worker pour les opérations complexes
    if (complexity > COMPLEXITY_THRESHOLD || totalVertices > VERTEX_THRESHOLD) {
      return true;
    }
    
    // Mode performance 'quality' privilégie la précision (pas de worker)
    if (options?.performanceMode === 'quality') {
      return false;
    }
    
    // Mode performance 'fast' privilégie la vitesse (utiliser worker si disponible)
    if (options?.performanceMode === 'fast') {
      return true;
    }
    
    return false;
  }

  /**
   * Effectue une opération CSG générique
   */
  private async performOperation(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry,
    operation: CSGOperation,
    options?: CSGOptions
  ): Promise<CSGResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = performance.now();
    const metrics: any = {
      vertexCountBefore: geometry1.attributes.position?.count || 0
    };

    // Décider si utiliser un WebWorker
    if (this.shouldUseWorker(geometry1, geometry2, opts)) {
      console.log('🔄 Delegating CSG operation to WebWorker...');
      
      try {
        const workerOperation = this.mapCSGOperationToWorker(operation);
        const result = await this.workerManager.performCSGOperation(
          geometry1,
          geometry2,
          workerOperation,
          {
            useGroups: opts.useGroups,
            attributes: opts.attributes,
            performanceMode: opts.performanceMode,
            maxVertices: opts.maxVertices,
            priority: 1 // Haute priorité pour les opérations lourdes
          }
        );
        
        console.log('✅ WebWorker CSG operation completed');
        
        return {
          success: result.success,
          geometry: result.geometry,
          performanceMetrics: {
            ...result.performanceMetrics,
            workerUsed: true
          }
        };
        
      } catch (workerError) {
        console.warn('⚠️ WebWorker CSG failed, falling back to main thread:', workerError);
        // Continuer avec le traitement sur le thread principal
      }
    }

    try {
      // Phase 1: Préparation et validation
      const prepStart = performance.now();
      
      // Valider les géométries d'entrée
      this.validateGeometry(geometry1, 'base');
      this.validateGeometry(geometry2, 'cut');
      
      // Vérifier la complexité
      if (opts.maxVertices) {
        const totalVertices = 
          (geometry1.attributes.position?.count || 0) + 
          (geometry2.attributes.position?.count || 0);
        
        if (totalVertices > opts.maxVertices) {
          throw new Error(
            `Geometry too complex: ${totalVertices} vertices exceeds maximum of ${opts.maxVertices}`
          );
        }
      }

      // Préparer les géométries
      this.prepareGeometry(geometry1);
      this.prepareGeometry(geometry2);
      
      metrics.preparationTime = performance.now() - prepStart;

      // Phase 2: Création des brushes et opération CSG
      const opStart = performance.now();
      
      const brush1 = new Brush(geometry1);
      const brush2 = new Brush(geometry2);
      
      // Mettre à jour les matrices
      brush1.updateMatrixWorld();
      brush2.updateMatrixWorld();
      
      // Effectuer l'opération
      let resultBrush: Brush;
      const csgOperation = this.getCSGOperationType(operation);
      
      resultBrush = this.evaluator.evaluate(brush1, brush2, csgOperation);
      
      if (!resultBrush || !resultBrush.geometry) {
        throw new Error('CSG operation produced no result');
      }
      
      // Cloner la géométrie résultante
      const resultGeometry = resultBrush.geometry.clone();
      
      metrics.operationTime = performance.now() - opStart;

      // Phase 3: Optimisation et nettoyage
      const optStart = performance.now();
      
      // Optimiser la géométrie selon le mode de performance
      const optimizedGeometry = this.optimizeGeometry(resultGeometry, opts.performanceMode);
      
      // Valider le résultat si demandé
      if (opts.validateResult) {
        this.validateGeometry(optimizedGeometry, 'result');
      }
      
      metrics.optimizationTime = performance.now() - optStart;
      
      // Nettoyer les ressources
      this.disposeBrush(brush1);
      this.disposeBrush(brush2);
      this.disposeBrush(resultBrush);
      
      // Métriques finales
      metrics.vertexCountAfter = optimizedGeometry.attributes.position?.count || 0;
      metrics.totalTime = performance.now() - startTime;

      return {
        success: true,
        geometry: optimizedGeometry,
        performanceMetrics: metrics
      };

    } catch (error) {
      console.error('CSG operation failed:', error);
      
      // En cas d'erreur, essayer de retourner la géométrie originale
      return {
        success: false,
        geometry: geometry1.clone(),
        error: error instanceof Error ? error.message : 'CSG operation failed',
        performanceMetrics: {
          ...metrics,
          totalTime: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Prépare une géométrie pour les opérations CSG
   */
  private prepareGeometry(geometry: THREE.BufferGeometry): void {
    // S'assurer que les normales sont calculées
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    // Calculer la bounding box si nécessaire
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    
    // Optimiser l'indexation si nécessaire
    if (!geometry.index) {
      // Pour certaines géométries, l'indexation améliore les performances CSG
      const positions = geometry.attributes.position;
      if (positions && positions.count < 65536) { // Limite pour les indices 16 bits
        // Ne pas indexer automatiquement car cela peut causer des problèmes
        // avec certaines géométries
      }
    }
  }

  /**
   * Valide qu'une géométrie est valide pour CSG
   */
  private validateGeometry(geometry: THREE.BufferGeometry, name: string): void {
    if (!geometry) {
      throw new Error(`${name} geometry is null or undefined`);
    }
    
    if (!geometry.attributes || !geometry.attributes.position) {
      throw new Error(`${name} geometry has no position attribute`);
    }
    
    const positionCount = geometry.attributes.position.count;
    if (positionCount === 0) {
      throw new Error(`${name} geometry has no vertices`);
    }
    
    if (positionCount < 3) {
      throw new Error(`${name} geometry has insufficient vertices (${positionCount} < 3)`);
    }
    
    // Vérifier l'intégrité des données
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < Math.min(positions.length, 9); i++) {
      if (!isFinite(positions[i])) {
        throw new Error(`${name} geometry contains invalid vertex data (NaN or Infinity)`);
      }
    }
  }

  /**
   * Optimise une géométrie selon le mode de performance
   */
  private optimizeGeometry(
    geometry: THREE.BufferGeometry,
    mode?: 'fast' | 'balanced' | 'quality'
  ): THREE.BufferGeometry {
    const perfMode = mode || 'balanced';
    
    switch (perfMode) {
      case 'fast':
        // Mode rapide : optimisations minimales
        geometry.computeBoundingBox();
        return geometry;
        
      case 'balanced':
        // Mode équilibré : optimisations standards
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        
        // Nettoyer les attributs inutiles
        this.cleanupAttributes(geometry);
        return geometry;
        
      case 'quality':
        // Mode qualité : optimisations maximales
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        
        // Nettoyer et optimiser
        this.cleanupAttributes(geometry);
        this.mergeVertices(geometry);
        
        return geometry;
        
      default:
        return geometry;
    }
  }

  /**
   * Nettoie les attributs inutiles d'une géométrie
   */
  private cleanupAttributes(geometry: THREE.BufferGeometry): void {
    // Garder seulement les attributs essentiels
    const essentialAttributes = ['position', 'normal', 'uv', 'color'];
    
    for (const attrName in geometry.attributes) {
      if (!essentialAttributes.includes(attrName)) {
        geometry.deleteAttribute(attrName);
      }
    }
  }

  /**
   * Fusionne les vertices proches (simplification)
   */
  private mergeVertices(geometry: THREE.BufferGeometry, tolerance: number = 0.0001): void {
    // Implémenter une fusion de vertices pour simplifier la géométrie
    // Cette optimisation est complexe et dépend du cas d'usage
    // Pour l'instant, on ne fait rien pour éviter de corrompre la géométrie
  }

  /**
   * Map les opérations CSG pour les WebWorkers
   */
  private mapCSGOperationToWorker(operation: CSGOperation): string {
    switch (operation) {
      case CSGOperation.SUBTRACTION:
        return 'subtract';
      case CSGOperation.ADDITION:
        return 'add';
      case CSGOperation.INTERSECTION:
        return 'intersect';
      case CSGOperation.DIFFERENCE:
        return 'difference';
      default:
        return 'subtract';
    }
  }

  /**
   * Obtient le type d'opération CSG pour three-bvh-csg
   */
  private getCSGOperationType(operation: CSGOperation): number {
    switch (operation) {
      case CSGOperation.SUBTRACTION:
        return SUBTRACTION;
      case CSGOperation.ADDITION:
        return ADDITION;
      case CSGOperation.INTERSECTION:
        return INTERSECTION;
      case CSGOperation.DIFFERENCE:
        return DIFFERENCE;
      default:
        return SUBTRACTION;
    }
  }

  /**
   * Nettoie un brush CSG
   */
  private disposeBrush(brush: Brush | null): void {
    if (!brush) return;
    
    try {
      // three-bvh-csg n'a pas de méthode dispose explicite sur Brush
      // mais on peut nettoyer la géométrie si nécessaire
      if (brush.geometry && typeof brush.geometry.dispose === 'function') {
        // Ne pas disposer la géométrie car elle peut être utilisée ailleurs
      }
    } catch (error) {
      // Ignorer les erreurs de nettoyage
    }
  }

  /**
   * Effectue plusieurs opérations CSG en séquence
   */
  async performBatchOperations(
    baseGeometry: THREE.BufferGeometry,
    operations: Array<{
      geometry: THREE.BufferGeometry;
      operation: CSGOperation;
      options?: CSGOptions;
    }>
  ): Promise<CSGResult> {
    let currentGeometry = baseGeometry;
    const totalMetrics: any = {
      operations: [],
      totalTime: 0,
      workerOperations: 0,
      mainThreadOperations: 0
    };
    
    const batchStart = performance.now();
    
    // Optimisation: traiter les opérations par lot si WebWorkers disponibles
    const config = configManager.getConfig();
    if (config.performance.enableWebWorkers && 
        config.performance.parallelProcessing && 
        operations.length > 1) {
      
      console.log(`🔄 Processing ${operations.length} CSG operations in batch mode...`);
    }
    
    for (const op of operations) {
      const result = await this.performOperation(
        currentGeometry,
        op.geometry,
        op.operation,
        op.options
      );
      
      if (!result.success) {
        return {
          success: false,
          error: `Batch operation failed: ${result.error}`,
          performanceMetrics: {
            ...totalMetrics,
            totalTime: performance.now() - batchStart
          }
        };
      }
      
      if (currentGeometry !== baseGeometry) {
        currentGeometry.dispose(); // Nettoyer l'intermédiaire
      }
      
      currentGeometry = result.geometry!;
      totalMetrics.operations.push(result.performanceMetrics);
      
      // Compter les opérations par type
      if (result.performanceMetrics?.workerUsed) {
        totalMetrics.workerOperations++;
      } else {
        totalMetrics.mainThreadOperations++;
      }
    }
    
    totalMetrics.totalTime = performance.now() - batchStart;
    
    console.log(`✅ Batch completed: ${totalMetrics.workerOperations} worker ops, ${totalMetrics.mainThreadOperations} main thread ops`);
    
    return {
      success: true,
      geometry: currentGeometry,
      performanceMetrics: totalMetrics
    };
  }

  /**
   * Estime la complexité d'une opération CSG
   */
  estimateComplexity(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry
  ): number {
    const v1 = geometry1.attributes.position?.count || 0;
    const v2 = geometry2.attributes.position?.count || 0;
    
    // Estimation basée sur le produit des nombres de vertices
    // Plus les géométries sont complexes, plus l'opération sera longue
    return v1 * v2 / 1000;
  }

  /**
   * Obtient les statistiques du service incluant les WebWorkers
   */
  getServiceStats(): any {
    const baseStats = {
      performanceMetrics: this.performanceMetrics.size,
      defaultOptions: this.defaultOptions
    };

    // Ajouter les stats des WebWorkers si disponibles
    if (this.workerManager) {
      return {
        ...baseStats,
        workers: this.workerManager.getStats(),
        workerEnabled: true
      };
    }

    return {
      ...baseStats,
      workerEnabled: false
    };
  }

  /**
   * Force le flush des tâches WebWorker en attente
   */
  async flushPendingOperations(): Promise<void> {
    if (this.workerManager) {
      console.log('🔄 Flushing pending WebWorker CSG operations...');
      await this.workerManager.flush();
      console.log('✅ All WebWorker operations completed');
    }
  }

  /**
   * Nettoie les ressources du service
   */
  dispose(): void {
    this.performanceMetrics.clear();
    
    // Fermer le gestionnaire de workers
    if (this.workerManager) {
      console.log('🔄 Shutting down CSG WebWorkers...');
      this.workerManager.shutdown();
      this.workerManager = null;
    }
    
    // L'evaluator n'a pas de méthode dispose
  }
}

// Singleton pour usage global
let instance: CSGOperationService | null = null;

export function getCSGService(options?: CSGOptions): CSGOperationService {
  if (!instance) {
    instance = new CSGOperationService(options);
  }
  return instance;
}