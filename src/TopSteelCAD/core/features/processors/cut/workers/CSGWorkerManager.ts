/**
 * CSGWorkerManager.ts - Gestionnaire des WebWorkers pour les opérations CSG
 * Gère un pool de workers pour traiter les opérations CSG lourdes
 */

import * as THREE from 'three';
import { CSGWorkerMessage, CSGWorkerResponse, CSG_WORKER_URL } from './CSGWorker';
import { configManager } from '../config/ProductionConfig';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * Informations sur un worker dans le pool
 */
interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  operationsCount: number;
  lastUsed: number;
}

/**
 * Tâche CSG en attente
 */
interface PendingTask {
  id: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  message: CSGWorkerMessage;
  priority: number;
  timestamp: number;
}

/**
 * Gestionnaire du pool de WebWorkers pour CSG
 */
export class CSGWorkerManager {
  private workers: Map<string, WorkerInfo> = new Map();
  private pendingTasks: PendingTask[] = [];
  private taskCounter = 0;
  private initialized = false;
  private maxWorkers: number = 4;
  private minWorkers: number = 1;

  constructor() {
    this.updateConfigFromManager();
    
    // Écouter les changements de configuration
    configManager.addListener((config) => {
      this.updateConfig(config.performance);
    });
  }

  /**
   * Met à jour la configuration à partir du ConfigManager
   */
  private updateConfigFromManager(): void {
    const config = configManager.getConfig();
    this.updateConfig(config.performance);
  }

  /**
   * Met à jour la configuration des workers
   */
  private updateConfig(perfConfig: any): void {
    if (!perfConfig.enableWebWorkers) {
      this.shutdown();
      return;
    }

    this.maxWorkers = Math.max(1, Math.min(perfConfig.maxWorkers || 4, navigator.hardwareConcurrency || 4));
    this.minWorkers = Math.max(1, Math.min(this.minWorkers, this.maxWorkers));

    // Ajuster le nombre de workers si nécessaire
    if (this.initialized) {
      this.adjustWorkerPool();
    }
  }

  /**
   * Initialise le pool de workers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = configManager.getConfig();
    if (!config.performance.enableWebWorkers) {
      console.log('WebWorkers disabled in configuration');
      return;
    }

    console.log(`🔧 Initializing CSG Worker Manager with ${this.maxWorkers} max workers`);

    try {
      // Créer le nombre minimum de workers
      for (let i = 0; i < this.minWorkers; i++) {
        await this.createWorker();
      }

      this.initialized = true;
      console.log(`✅ CSG Worker Manager initialized with ${this.workers.size} workers`);

    } catch (error) {
      console.error('Failed to initialize CSG Worker Manager:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau worker
   */
  private async createWorker(): Promise<string> {
    const workerId = `csg-worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(CSG_WORKER_URL);
        
        const workerInfo: WorkerInfo = {
          worker,
          busy: false,
          operationsCount: 0,
          lastUsed: Date.now()
        };

        // Configurer les listeners du worker
        worker.addEventListener('message', (event) => {
          this.handleWorkerMessage(workerId, event.data);
        });

        worker.addEventListener('error', (error) => {
          console.error(`Worker ${workerId} error:`, error);
          this.handleWorkerError(workerId, error);
        });

        worker.addEventListener('messageerror', (error) => {
          console.error(`Worker ${workerId} message error:`, error);
        });

        // Attendre que le worker soit prêt
        const readyHandler = (event: MessageEvent) => {
          if (event.data.type === 'ready') {
            worker.removeEventListener('message', readyHandler);
            this.workers.set(workerId, workerInfo);
            console.log(`✅ Worker ${workerId} ready`);
            resolve(workerId);
          }
        };

        worker.addEventListener('message', readyHandler);

        // Timeout de 5 secondes pour l'initialisation
        setTimeout(() => {
          if (!this.workers.has(workerId)) {
            worker.removeEventListener('message', readyHandler);
            worker.terminate();
            reject(new Error(`Worker ${workerId} initialization timeout`));
          }
        }, 5000);

      } catch (error) {
        console.error(`Failed to create worker ${workerId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Gère les messages des workers
   */
  private handleWorkerMessage(workerId: string, data: any): void {
    if (data.type === 'ready') {
      return; // Déjà géré dans createWorker
    }

    // Trouver la tâche correspondante
    const taskIndex = this.pendingTasks.findIndex(task => task.id === data.id);
    if (taskIndex === -1) {
      console.warn(`Received response for unknown task: ${data.id}`);
      return;
    }

    const task = this.pendingTasks[taskIndex];
    this.pendingTasks.splice(taskIndex, 1);

    // Marquer le worker comme libre
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.operationsCount++;
      workerInfo.lastUsed = Date.now();
    }

    // Résoudre ou rejeter la promesse
    if (data.success) {
      // Reconstruire la géométrie THREE.js
      const geometry = this.reconstructGeometry(data.data.geometry);
      
      task.resolve({
        success: true,
        geometry,
        performanceMetrics: data.data.performanceMetrics
      });
    } else {
      task.reject(new Error(data.error || 'CSG operation failed'));
    }

    // Traiter la prochaine tâche en attente
    this.processNextTask();
  }

  /**
   * Gère les erreurs des workers
   */
  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    console.error(`Worker ${workerId} crashed:`, error);
    
    // Supprimer le worker défaillant
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.worker.terminate();
      this.workers.delete(workerId);
    }

    // Rejeter toutes les tâches assignées à ce worker
    const failedTasks = this.pendingTasks.filter(task => 
      task.message.id.includes(workerId)
    );

    failedTasks.forEach(task => {
      task.reject(new Error(`Worker crashed: ${error.message}`));
    });

    // Supprimer les tâches échouées
    this.pendingTasks = this.pendingTasks.filter(task => 
      !task.message.id.includes(workerId)
    );

    // Recréer un worker si nécessaire
    if (this.workers.size < this.minWorkers) {
      this.createWorker().catch(error => {
        console.error('Failed to recreate worker:', error);
      });
    }
  }

  /**
   * Traite la prochaine tâche en attente
   */
  private processNextTask(): void {
    if (this.pendingTasks.length === 0) {
      return;
    }

    // Trouver un worker libre
    const freeWorker = Array.from(this.workers.entries())
      .find(([_, info]) => !info.busy);

    if (!freeWorker) {
      // Essayer de créer un nouveau worker si on n'a pas atteint la limite
      if (this.workers.size < this.maxWorkers) {
        this.createWorker().then(() => {
          this.processNextTask();
        }).catch(error => {
          console.error('Failed to create additional worker:', error);
        });
      }
      return;
    }

    // Trier les tâches par priorité et timestamp
    this.pendingTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Priorité plus élevée en premier
      }
      return a.timestamp - b.timestamp; // Plus ancien en premier
    });

    const task = this.pendingTasks[0];
    const [workerId, workerInfo] = freeWorker;

    // Marquer le worker comme occupé
    workerInfo.busy = true;
    
    // Envoyer la tâche au worker
    workerInfo.worker.postMessage(task.message);

    console.log(`📤 Sent CSG task ${task.id} to worker ${workerId}`);
  }

  /**
   * Effectue une opération CSG via WebWorker
   */
  async performCSGOperation(
    baseGeometry: THREE.BufferGeometry,
    cutGeometry: THREE.BufferGeometry,
    operation: 'subtract' | 'add' | 'intersect' | 'difference',
    options?: {
      useGroups?: boolean;
      attributes?: string[];
      performanceMode?: 'fast' | 'balanced' | 'quality';
      maxVertices?: number;
      priority?: number;
    }
  ): Promise<any> {
    if (!this.initialized) {
      throw new Error('CSG Worker Manager not initialized');
    }

    const taskId = `csg-${++this.taskCounter}-${Date.now()}`;
    
    // Créer le message pour le worker
    const message: CSGWorkerMessage = {
      id: taskId,
      type: 'csg-operation',
      data: {
        operation,
        baseGeometry: this.serializeGeometry(baseGeometry),
        cutGeometry: this.serializeGeometry(cutGeometry),
        options
      }
    };

    // Créer une promesse pour la tâche
    return new Promise((resolve, reject) => {
      const task: PendingTask = {
        id: taskId,
        resolve,
        reject,
        message,
        priority: options?.priority || 0,
        timestamp: Date.now()
      };

      this.pendingTasks.push(task);
      
      // Essayer de traiter immédiatement
      this.processNextTask();

      // Timeout pour éviter les tâches bloquées
      setTimeout(() => {
        const taskIndex = this.pendingTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          this.pendingTasks.splice(taskIndex, 1);
          reject(new Error('CSG operation timeout'));
        }
      }, 30000); // 30 secondes
    });
  }

  /**
   * Sérialise une géométrie pour le worker
   */
  private serializeGeometry(geometry: THREE.BufferGeometry): any {
    const data: any = {
      attributes: {}
    };

    // Sérialiser les attributs
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      data.attributes[name] = {
        array: Array.from((attribute as THREE.BufferAttribute).array),
        itemSize: (attribute as THREE.BufferAttribute).itemSize,
        count: (attribute as THREE.BufferAttribute).count
      };
    }

    // Sérialiser l'index
    if (geometry.index) {
      data.index = {
        array: Array.from(geometry.index.array)
      };
    }

    return data;
  }

  /**
   * Reconstruit une géométrie à partir des données sérialisées
   */
  private reconstructGeometry(data: any): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Reconstruire les attributs
    for (const [name, attrData] of Object.entries(data.attributes)) {
      const attribute = new THREE.BufferAttribute(
        new Float32Array((attrData as any).array),
        (attrData as any).itemSize
      );
      geometry.setAttribute(name, attribute);
    }

    // Reconstruire l'index
    if (data.index) {
      geometry.setIndex(new THREE.BufferAttribute(
        new Uint32Array(data.index.array),
        1
      ));
    }

    return geometry;
  }

  /**
   * Ajuste le nombre de workers selon la charge
   */
  private adjustWorkerPool(): void {
    const busyWorkers = Array.from(this.workers.values()).filter(info => info.busy).length;
    const totalWorkers = this.workers.size;
    
    // Si tous les workers sont occupés et on a des tâches en attente
    if (busyWorkers === totalWorkers && this.pendingTasks.length > 0 && totalWorkers < this.maxWorkers) {
      this.createWorker().catch(error => {
        console.error('Failed to scale up worker pool:', error);
      });
    }
    
    // Si on a trop de workers inactifs
    if (busyWorkers === 0 && totalWorkers > this.minWorkers && this.pendingTasks.length === 0) {
      // Supprimer les workers les moins récemment utilisés
      const sortedWorkers = Array.from(this.workers.entries())
        .sort(([,a], [,b]) => a.lastUsed - b.lastUsed);
      
      const workersToRemove = Math.min(totalWorkers - this.minWorkers, Math.floor(totalWorkers * 0.3));
      
      for (let i = 0; i < workersToRemove; i++) {
        const [workerId, workerInfo] = sortedWorkers[i];
        workerInfo.worker.terminate();
        this.workers.delete(workerId);
        console.log(`🗑️ Terminated idle worker ${workerId}`);
      }
    }
  }

  /**
   * Obtient les statistiques du pool de workers
   */
  getStats(): any {
    const workers = Array.from(this.workers.values());
    
    return {
      totalWorkers: this.workers.size,
      busyWorkers: workers.filter(w => w.busy).length,
      freeWorkers: workers.filter(w => !w.busy).length,
      pendingTasks: this.pendingTasks.length,
      totalOperations: workers.reduce((sum, w) => sum + w.operationsCount, 0),
      initialized: this.initialized
    };
  }

  /**
   * Force le traitement de toutes les tâches en attente
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pendingTasks.length === 0) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (this.pendingTasks.length === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout après 1 minute
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 60000);
    });
  }

  /**
   * Ferme tous les workers
   */
  shutdown(): void {
    console.log('🔄 Shutting down CSG Worker Manager...');
    
    // Rejeter toutes les tâches en attente
    this.pendingTasks.forEach(task => {
      task.reject(new Error('Worker manager shutting down'));
    });
    this.pendingTasks = [];
    
    // Terminer tous les workers
    this.workers.forEach((workerInfo, workerId) => {
      workerInfo.worker.terminate();
      console.log(`🗑️ Terminated worker ${workerId}`);
    });
    
    this.workers.clear();
    this.initialized = false;
    
    console.log('✅ CSG Worker Manager shut down');
  }
}

// Singleton pour usage global
let instance: CSGWorkerManager | null = null;

export function getCSGWorkerManager(): CSGWorkerManager {
  if (!instance) {
    instance = new CSGWorkerManager();
  }
  return instance;
}

// Initialiser automatiquement en production
if (typeof window !== 'undefined') {
  // Initialisation différée pour éviter de bloquer le démarrage
  setTimeout(() => {
    const manager = getCSGWorkerManager();
    manager.initialize().catch(error => {
      console.error('Failed to auto-initialize CSG Worker Manager:', error);
    });
  }, 1000);
}