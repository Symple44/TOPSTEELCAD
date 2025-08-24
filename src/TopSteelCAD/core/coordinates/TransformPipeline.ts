/**
 * Pipeline de Transformation
 * 
 * Gère l'application séquentielle de transformations
 * avec historique et débogage.
 */

import * as THREE from 'three';
import {
  TransformData,
  TransformMetadata,
  TransformationRecord,
  TransformHistory,
  HistoryFilter
} from './types';

/**
 * Étape de transformation
 */
export interface TransformStage {
  name: string;
  priority: number;
  canProcess(data: TransformData): boolean;
  process(data: TransformData): TransformData;
}

export class TransformPipeline {
  private stages: TransformStage[] = [];
  private history: TransformHistory[] = [];
  private maxHistorySize: number = 1000;
  private debugMode: boolean = false;
  
  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }
  
  /**
   * Ajoute une étape au pipeline
   */
  addStage(stage: TransformStage): void {
    this.stages.push(stage);
    this.stages.sort((a, b) => a.priority - b.priority);
    
    if (this.debugMode) {
      console.log(`🔧 Added transform stage: ${stage.name} (priority: ${stage.priority})`);
    }
  }
  
  /**
   * Retire une étape du pipeline
   */
  removeStage(stageName: string): boolean {
    const index = this.stages.findIndex(s => s.name === stageName);
    if (index !== -1) {
      this.stages.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Transforme une position à travers le pipeline
   */
  transform(
    position: THREE.Vector3,
    metadata: TransformMetadata
  ): TransformData {
    let data: TransformData = {
      original: position.clone(),
      current: position.clone(),
      metadata,
      transformations: []
    };
    
    if (this.debugMode) {
      console.log(`🚀 Starting pipeline transformation:`, {
        position,
        metadata,
        stages: this.stages.map(s => s.name)
      });
    }
    
    // Appliquer chaque étape
    for (const stage of this.stages) {
      if (stage.canProcess(data)) {
        const before = data.current.clone();
        
        try {
          data = stage.process(data);
          
          // Enregistrer la transformation
          const transformation: TransformationRecord = {
            stage: stage.name,
            before,
            after: data.current.clone(),
            metadata: { ...data.metadata },
            timestamp: Date.now()
          };
          
          data.transformations.push(transformation);
          
          if (this.debugMode) {
            console.log(`  ✓ ${stage.name}: [${before.x.toFixed(2)}, ${before.y.toFixed(2)}, ${before.z.toFixed(2)}] → [${data.current.x.toFixed(2)}, ${data.current.y.toFixed(2)}, ${data.current.z.toFixed(2)}]`);
          }
        } catch (error) {
          console.error(`❌ Error in stage ${stage.name}:`, error);
          // Continuer avec la position actuelle
        }
      }
    }
    
    // Sauvegarder l'historique
    this.addToHistory({
      timestamp: Date.now(),
      input: position,
      output: data.current,
      transformations: data.transformations
    });
    
    if (this.debugMode) {
      console.log(`✨ Pipeline complete: [${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}] → [${data.current.x.toFixed(2)}, ${data.current.y.toFixed(2)}, ${data.current.z.toFixed(2)}]`);
    }
    
    return data;
  }
  
  /**
   * Transforme un lot de positions
   */
  transformBatch(
    positions: THREE.Vector3[],
    metadata: TransformMetadata
  ): TransformData[] {
    return positions.map(pos => this.transform(pos, metadata));
  }
  
  /**
   * Ajoute une entrée à l'historique
   */
  private addToHistory(entry: TransformHistory): void {
    this.history.push(entry);
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Obtient l'historique des transformations
   */
  getHistory(filter?: HistoryFilter): TransformHistory[] {
    if (!filter) {
      return [...this.history];
    }
    
    return this.history.filter(h => {
      // Appliquer les filtres
      if (filter.startTime && h.timestamp < filter.startTime) return false;
      if (filter.endTime && h.timestamp > filter.endTime) return false;
      if (filter.pluginId) {
        const hasPlugin = h.transformations.some(
          t => t.metadata.pluginId === filter.pluginId
        );
        if (!hasPlugin) return false;
      }
      if (filter.stages && filter.stages.length > 0) {
        const hasStage = h.transformations.some(
          t => filter.stages!.includes(t.stage)
        );
        if (!hasStage) return false;
      }
      return true;
    });
  }
  
  /**
   * Vide l'historique
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * Obtient les statistiques du pipeline
   */
  getStatistics(): {
    totalTransformations: number;
    stageCount: number;
    averageStagesPerTransform: number;
    mostUsedStages: { name: string; count: number }[];
  } {
    const stageUsage: Record<string, number> = {};
    let totalStages = 0;
    
    for (const entry of this.history) {
      for (const transform of entry.transformations) {
        stageUsage[transform.stage] = (stageUsage[transform.stage] || 0) + 1;
        totalStages++;
      }
    }
    
    const mostUsedStages = Object.entries(stageUsage)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalTransformations: this.history.length,
      stageCount: this.stages.length,
      averageStagesPerTransform: this.history.length > 0
        ? totalStages / this.history.length
        : 0,
      mostUsedStages
    };
  }
  
  /**
   * Configure la taille maximale de l'historique
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(0, size);
    
    // Tronquer l'historique si nécessaire
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  /**
   * Obtient la liste des étapes
   */
  getStages(): TransformStage[] {
    return [...this.stages];
  }
  
  /**
   * Exporte l'historique en JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.history, (key, value) => {
      if (value instanceof THREE.Vector3) {
        return { x: value.x, y: value.y, z: value.z };
      }
      return value;
    }, 2);
  }
}

/**
 * Étape de transformation de base (abstraite)
 */
export abstract class BaseTransformStage implements TransformStage {
  constructor(
    public readonly name: string,
    public readonly priority: number
  ) {}
  
  abstract canProcess(data: TransformData): boolean;
  abstract process(data: TransformData): TransformData;
}