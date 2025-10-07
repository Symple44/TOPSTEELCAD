/**
 * Optimiseur de performance pour grandes assemblées
 * Gère le LOD, l'instanciation et le culling intelligent
 */

import * as THREE from 'three';
import { Feature, FeatureType } from '../types';
import { PivotElement } from '@/types/viewer';

/**
 * Configuration de l'optimiseur
 */
export interface OptimizerConfig {
  enableLOD: boolean;
  enableInstancing: boolean;
  enableCulling: boolean;
  enableBatching: boolean;
  maxInstanceCount: number;
  lodDistances: {
    high: number;
    medium: number;
    low: number;
  };
  cullingDistance: number;
  batchSize: number;
}

/**
 * Niveau de détail
 */
export enum LODLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  CULLED = 'culled'
}

/**
 * Statistiques de performance
 */
export interface PerformanceStats {
  totalFeatures: number;
  visibleFeatures: number;
  culledFeatures: number;
  instancedFeatures: number;
  batchedOperations: number;
  cacheHitRate: number;
  processingTime: number;
  memoryUsage: number;
}

/**
 * Optimiseur de performance
 */
export class PerformanceOptimizer {
  private config: OptimizerConfig;
  private instancedMeshes: Map<string, THREE.InstancedMesh>;
  private lodGroups: Map<string, THREE.LOD>;
  private performanceStats: PerformanceStats;
  private frustum: THREE.Frustum;
  private camera?: THREE.Camera;
  
  constructor(config?: Partial<OptimizerConfig>) {
    this.config = {
      enableLOD: true,
      enableInstancing: true,
      enableCulling: true,
      enableBatching: true,
      maxInstanceCount: 1000,
      lodDistances: {
        high: 100,
        medium: 500,
        low: 1000
      },
      cullingDistance: 2000,
      batchSize: 50,
      ...config
    };
    
    this.instancedMeshes = new Map();
    this.lodGroups = new Map();
    this.frustum = new THREE.Frustum();
    
    this.performanceStats = {
      totalFeatures: 0,
      visibleFeatures: 0,
      culledFeatures: 0,
      instancedFeatures: 0,
      batchedOperations: 0,
      cacheHitRate: 0,
      processingTime: 0,
      memoryUsage: 0
    };
  }
  
  /**
   * Définit la caméra pour le culling
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  /**
   * Optimise un ensemble de features
   */
  optimizeFeatures(
    features: Feature[],
    elements: PivotElement[]
  ): OptimizedFeatureSet {
    const startTime = performance.now();
    
    // Réinitialiser les stats
    this.performanceStats.totalFeatures = features.length;
    this.performanceStats.visibleFeatures = 0;
    this.performanceStats.culledFeatures = 0;
    this.performanceStats.instancedFeatures = 0;
    this.performanceStats.batchedOperations = 0;
    
    // Grouper les features par type et géométrie similaire
    const featureGroups = this.groupFeaturesByType(features);
    
    // Appliquer les optimisations
    const optimizedSet: OptimizedFeatureSet = {
      instances: [],
      lodGroups: [],
      batches: [],
      individualFeatures: []
    };
    
    for (const [type, groupFeatures] of featureGroups) {
      // Instanciation pour features répétitives
      if (this.config.enableInstancing && this.canInstance(type, groupFeatures)) {
        const instances = this.createInstances(type, groupFeatures);
        optimizedSet.instances.push(...instances);
        this.performanceStats.instancedFeatures += groupFeatures.length;
      }
      
      // Batching pour opérations similaires
      else if (this.config.enableBatching && groupFeatures.length > this.config.batchSize) {
        const batches = this.createBatches(groupFeatures);
        optimizedSet.batches.push(...batches);
        this.performanceStats.batchedOperations += batches.length;
      }
      
      // Features individuelles
      else {
        optimizedSet.individualFeatures.push(...groupFeatures);
      }
    }
    
    // Appliquer le LOD si activé
    if (this.config.enableLOD) {
      optimizedSet.lodGroups = this.createLODGroups(optimizedSet, elements);
    }
    
    // Appliquer le culling
    if (this.config.enableCulling && this.camera) {
      this.applyCulling(optimizedSet);
    }
    
    this.performanceStats.processingTime = performance.now() - startTime;
    this.performanceStats.memoryUsage = this.estimateMemoryUsage(optimizedSet);
    
    return optimizedSet;
  }
  
  /**
   * Groupe les features par type
   */
  private groupFeaturesByType(features: Feature[]): Map<FeatureType, Feature[]> {
    const groups = new Map<FeatureType, Feature[]>();
    
    for (const feature of features) {
      const group = groups.get(feature.type) || [];
      group.push(feature);
      groups.set(feature.type, group);
    }
    
    return groups;
  }
  
  /**
   * Vérifie si les features peuvent être instanciées
   */
  private canInstance(type: FeatureType, features: Feature[]): boolean {
    // Les trous et motifs sont de bons candidats pour l'instanciation
    const instanceableTypes: FeatureType[] = [
      FeatureType.HOLE,
      FeatureType.TAPPED_HOLE,
      FeatureType.DRILL_PATTERN
    ];

    if (!instanceableTypes.includes(type)) {
      return false;
    }
    
    // Vérifier si les paramètres sont suffisamment similaires
    if (features.length < 3) {
      return false;
    }
    
    const firstParams = features[0].parameters;
    const diameter = firstParams.diameter;
    
    // Tous les trous doivent avoir le même diamètre pour être instanciés
    return features.every(f => f.parameters.diameter === diameter);
  }
  
  /**
   * Crée des instances pour les features répétitives
   */
  private createInstances(type: FeatureType, features: Feature[]): InstancedFeature[] {
    const instances: InstancedFeature[] = [];
    
    // Grouper par diamètre
    const byDiameter = new Map<number, Feature[]>();
    for (const feature of features) {
      const diameter = feature.parameters.diameter || 0;
      const group = byDiameter.get(diameter) || [];
      group.push(feature);
      byDiameter.set(diameter, group);
    }
    
    // Créer une instance pour chaque groupe
    for (const [diameter, groupFeatures] of byDiameter) {
      if (groupFeatures.length < 5) {
        // Pas assez pour instancier
        continue;
      }
      
      const geometry = this.createHoleGeometry(diameter);
      const material = this.createHoleMaterial(type);
      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        groupFeatures.length
      );
      
      // Positionner chaque instance
      const matrix = new THREE.Matrix4();
      groupFeatures.forEach((feature, i) => {
        matrix.makeTranslation(
          feature.position.x,
          feature.position.y,
          feature.position.z
        );
        instancedMesh.setMatrixAt(i, matrix);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      
      instances.push({
        type,
        mesh: instancedMesh,
        features: groupFeatures
      });
      
      // Stocker pour référence
      const key = `${type}_${diameter}`;
      this.instancedMeshes.set(key, instancedMesh);
    }
    
    return instances;
  }
  
  /**
   * Crée des batches pour traitement groupé
   */
  private createBatches(features: Feature[]): FeatureBatch[] {
    const batches: FeatureBatch[] = [];
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < features.length; i += batchSize) {
      const batchFeatures = features.slice(i, i + batchSize);
      batches.push({
        features: batchFeatures,
        priority: this.calculateBatchPriority(batchFeatures)
      });
    }
    
    // Trier par priorité
    batches.sort((a, b) => b.priority - a.priority);
    
    return batches;
  }
  
  /**
   * Calcule la priorité d'un batch
   */
  private calculateBatchPriority(features: Feature[]): number {
    // Prioriser les features visibles et proches de la caméra
    let priority = 0;
    
    for (const feature of features) {
      // Plus la feature est grande, plus elle est prioritaire
      const size = feature.parameters.diameter || 
                  feature.parameters.length || 
                  feature.parameters.width || 10;
      priority += size;
      
      // Les contours et découpes sont prioritaires
      if (feature.type === FeatureType.CONTOUR || 
          feature.type === FeatureType.CUTOUT) {
        priority += 100;
      }
    }
    
    return priority / features.length;
  }
  
  /**
   * Crée des groupes LOD
   */
  private createLODGroups(
    optimizedSet: OptimizedFeatureSet,
    elements: PivotElement[]
  ): THREE.LOD[] {
    const lodGroups: THREE.LOD[] = [];
    
    for (const element of elements) {
      const lod = new THREE.LOD();
      
      // Niveau HIGH - Toutes les features
      const highDetail = new THREE.Group();
      // Ajouter toutes les features
      lod.addLevel(highDetail, this.config.lodDistances.high);
      
      // Niveau MEDIUM - Features principales seulement
      const mediumDetail = new THREE.Group();
      // Ajouter seulement les grandes features
      lod.addLevel(mediumDetail, this.config.lodDistances.medium);
      
      // Niveau LOW - Géométrie simplifiée
      const lowDetail = new THREE.Group();
      // Ajouter une version très simplifiée
      lod.addLevel(lowDetail, this.config.lodDistances.low);
      
      lodGroups.push(lod);
      this.lodGroups.set(element.id, lod);
    }
    
    return lodGroups;
  }
  
  /**
   * Applique le frustum culling
   */
  private applyCulling(optimizedSet: OptimizedFeatureSet): void {
    if (!this.camera) return;
    
    // Mettre à jour le frustum
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(matrix);
    
    // Culling des instances
    for (const instance of optimizedSet.instances) {
      const visible = this.frustum.intersectsObject(instance.mesh);
      instance.mesh.visible = visible;
      
      if (!visible) {
        this.performanceStats.culledFeatures += instance.features.length;
      } else {
        this.performanceStats.visibleFeatures += instance.features.length;
      }
    }
    
    // Culling des features individuelles
    for (const feature of optimizedSet.individualFeatures) {
      const sphere = new THREE.Sphere(feature.position, 50);
      const visible = this.frustum.intersectsSphere(sphere);
      
      if (!visible) {
        this.performanceStats.culledFeatures++;
      } else {
        this.performanceStats.visibleFeatures++;
      }
    }
  }
  
  /**
   * Crée la géométrie d'un trou
   */
  private createHoleGeometry(diameter: number): THREE.BufferGeometry {
    return new THREE.CylinderGeometry(diameter / 2, diameter / 2, 100, 16);
  }
  
  /**
   * Crée le matériau pour un type de feature
   */
  private createHoleMaterial(type: FeatureType): THREE.Material {
    const color = type === FeatureType.TAPPED_HOLE ? 0x1e3a8a : 0x0f172a;
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.9,
      roughness: 0.1
    });
  }
  
  /**
   * Estime l'utilisation mémoire
   */
  private estimateMemoryUsage(optimizedSet: OptimizedFeatureSet): number {
    let memory = 0;
    
    // Instances
    for (const instance of optimizedSet.instances) {
      const geometry = instance.mesh.geometry;
      const vertexCount = geometry.attributes.position.count;
      memory += vertexCount * 3 * 4; // 3 floats par vertex, 4 bytes par float
      memory += instance.features.length * 64; // Matrix4 par instance
    }
    
    // Features individuelles
    memory += optimizedSet.individualFeatures.length * 1024; // Estimation
    
    return memory / (1024 * 1024); // Convertir en MB
  }
  
  /**
   * Obtient les statistiques de performance
   */
  getStats(): PerformanceStats {
    return { ...this.performanceStats };
  }
  
  /**
   * Réinitialise l'optimiseur
   */
  reset(): void {
    this.instancedMeshes.clear();
    this.lodGroups.clear();
    this.performanceStats = {
      totalFeatures: 0,
      visibleFeatures: 0,
      culledFeatures: 0,
      instancedFeatures: 0,
      batchedOperations: 0,
      cacheHitRate: 0,
      processingTime: 0,
      memoryUsage: 0
    };
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    for (const mesh of this.instancedMeshes.values()) {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }
    
    this.reset();
  }
}

/**
 * Feature instanciée
 */
interface InstancedFeature {
  type: FeatureType;
  mesh: THREE.InstancedMesh;
  features: Feature[];
}

/**
 * Batch de features
 */
interface FeatureBatch {
  features: Feature[];
  priority: number;
}

/**
 * Ensemble optimisé de features
 */
export interface OptimizedFeatureSet {
  instances: InstancedFeature[];
  lodGroups: THREE.LOD[];
  batches: FeatureBatch[];
  individualFeatures: Feature[];
}

// Export singleton
export const performanceOptimizer = new PerformanceOptimizer();