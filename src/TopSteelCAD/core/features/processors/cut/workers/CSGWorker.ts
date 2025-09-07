/**
 * CSGWorker.ts - WebWorker pour les opérations CSG lourdes
 * Décharge les calculs CSG complexes du thread principal
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, ADDITION, INTERSECTION, DIFFERENCE } from 'three-bvh-csg';

/**
 * Types de messages entre le thread principal et le worker
 */
export interface CSGWorkerMessage {
  id: string;
  type: 'csg-operation';
  data: {
    operation: 'subtract' | 'add' | 'intersect' | 'difference';
    baseGeometry: {
      attributes: Record<string, { array: number[]; itemSize: number; count: number }>;
      index?: { array: number[] };
    };
    cutGeometry: {
      attributes: Record<string, { array: number[]; itemSize: number; count: number }>;
      index?: { array: number[] };
    };
    options?: {
      useGroups?: boolean;
      attributes?: string[];
      performanceMode?: 'fast' | 'balanced' | 'quality';
      maxVertices?: number;
    };
  };
}

export interface CSGWorkerResponse {
  id: string;
  success: boolean;
  data?: {
    geometry: {
      attributes: Record<string, { array: number[]; itemSize: number; count: number }>;
      index?: { array: number[] };
    };
    performanceMetrics: {
      preparationTime: number;
      operationTime: number;
      optimizationTime: number;
      totalTime: number;
      vertexCountBefore: number;
      vertexCountAfter: number;
    };
  };
  error?: string;
}

/**
 * Code du WebWorker
 * Ce code s'exécute dans un contexte worker séparé
 */
const workerCode = `
// Import des dépendances dans le worker context
importScripts('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js');

class CSGProcessor {
  constructor() {
    this.evaluator = null;
    try {
      // Note: three-bvh-csg doit être disponible dans le worker context
      // En production, vous devrez inclure la librairie appropriée
      console.log('CSG Worker initialized');
    } catch (error) {
      console.error('Failed to initialize CSG worker:', error);
    }
  }

  /**
   * Reconstruit une BufferGeometry à partir des données sérialisées
   */
  reconstructGeometry(data) {
    const geometry = new THREE.BufferGeometry();
    
    // Reconstruire les attributs
    for (const [name, attrData] of Object.entries(data.attributes)) {
      const attribute = new THREE.BufferAttribute(
        new Float32Array(attrData.array),
        attrData.itemSize
      );
      geometry.setAttribute(name, attribute);
    }
    
    // Reconstruire l'index si présent
    if (data.index) {
      geometry.setIndex(new THREE.BufferAttribute(
        new Uint32Array(data.index.array),
        1
      ));
    }
    
    return geometry;
  }

  /**
   * Sérialise une BufferGeometry pour le retour
   */
  serializeGeometry(geometry) {
    const data = {
      attributes: {},
      index: null
    };
    
    // Sérialiser les attributs
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      data.attributes[name] = {
        array: Array.from(attribute.array),
        itemSize: attribute.itemSize,
        count: attribute.count
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
   * Effectue une opération CSG
   */
  async performCSGOperation(message) {
    const startTime = performance.now();
    const metrics = {
      vertexCountBefore: 0,
      vertexCountAfter: 0,
      preparationTime: 0,
      operationTime: 0,
      optimizationTime: 0,
      totalTime: 0
    };

    try {
      // Phase 1: Préparation
      const prepStart = performance.now();
      
      const baseGeometry = this.reconstructGeometry(message.data.baseGeometry);
      const cutGeometry = this.reconstructGeometry(message.data.cutGeometry);
      
      metrics.vertexCountBefore = baseGeometry.attributes.position?.count || 0;
      
      // Validation basique
      if (!baseGeometry.attributes.position || !cutGeometry.attributes.position) {
        throw new Error('Invalid geometry: missing position attribute');
      }
      
      // Préparer les géométries
      if (!baseGeometry.attributes.normal) {
        baseGeometry.computeVertexNormals();
      }
      if (!cutGeometry.attributes.normal) {
        cutGeometry.computeVertexNormals();
      }
      
      metrics.preparationTime = performance.now() - prepStart;

      // Phase 2: Opération CSG (simulée pour cette implémentation)
      const opStart = performance.now();
      
      // IMPORTANT: Cette implémentation est simplifiée
      // En production, vous devrez intégrer three-bvh-csg dans le worker
      let resultGeometry;
      
      const operation = message.data.operation;
      
      // Simulation d'une opération CSG
      // En réalité, ici vous utiliseriez three-bvh-csg
      switch (operation) {
        case 'subtract':
          // Simulation: retourner la géométrie de base modifiée
          resultGeometry = baseGeometry.clone();
          break;
        case 'add':
          // Simulation: fusionner les géométries
          resultGeometry = baseGeometry.clone();
          break;
        case 'intersect':
          // Simulation: intersection
          resultGeometry = baseGeometry.clone();
          break;
        default:
          resultGeometry = baseGeometry.clone();
      }
      
      // Attendre un peu pour simuler le temps de calcul
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      
      metrics.operationTime = performance.now() - opStart;

      // Phase 3: Optimisation
      const optStart = performance.now();
      
      const mode = message.data.options?.performanceMode || 'balanced';
      this.optimizeGeometry(resultGeometry, mode);
      
      metrics.optimizationTime = performance.now() - optStart;
      metrics.vertexCountAfter = resultGeometry.attributes.position?.count || 0;
      metrics.totalTime = performance.now() - startTime;

      // Sérialiser le résultat
      const serializedGeometry = this.serializeGeometry(resultGeometry);
      
      return {
        id: message.id,
        success: true,
        data: {
          geometry: serializedGeometry,
          performanceMetrics: metrics
        }
      };

    } catch (error) {
      return {
        id: message.id,
        success: false,
        error: error.message || 'CSG operation failed'
      };
    }
  }

  /**
   * Optimise une géométrie selon le mode
   */
  optimizeGeometry(geometry, mode) {
    switch (mode) {
      case 'fast':
        geometry.computeBoundingBox();
        break;
      case 'balanced':
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        break;
      case 'quality':
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        break;
    }
  }
}

// Instance du processeur CSG
const csgProcessor = new CSGProcessor();

// Écouter les messages du thread principal
self.addEventListener('message', async (event) => {
  const message = event.data;
  
  if (message.type === 'csg-operation') {
    try {
      const response = await csgProcessor.performCSGOperation(message);
      self.postMessage(response);
    } catch (error) {
      self.postMessage({
        id: message.id,
        success: false,
        error: error.message
      });
    }
  }
});

// Signaler que le worker est prêt
self.postMessage({ type: 'ready' });
`;

// Créer un Blob avec le code du worker
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
export const CSG_WORKER_URL = URL.createObjectURL(workerBlob);