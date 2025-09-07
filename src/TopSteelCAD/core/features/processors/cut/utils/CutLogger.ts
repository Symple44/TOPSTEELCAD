/**
 * CutLogger.ts - Système de logging unifié pour l'architecture de coupe
 * Migré et adapté depuis le CutLogger existant
 */

import { Feature } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';

/**
 * Niveaux de log disponibles
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Structure d'un message de log
 */
interface LogEntry {
  timestamp: number;
  level: LogLevel;
  handler?: string;
  operation?: string;
  message: string;
  data?: any;
  performance?: {
    duration?: number;
    memory?: number;
  };
}

/**
 * Contexte d'une opération de coupe
 */
interface CutOperationContext {
  featureId: string;
  elementId: string;
  handler?: string;
  cutType?: CutType;
  startTime: number;
  logs: LogEntry[];
  performanceMarkers: Map<string, number>;
}

/**
 * Service de logging pour les opérations de coupe
 */
export class CutLogger {
  private static instance: CutLogger;
  private currentLevel: LogLevel = LogLevel.INFO;
  private activeOperations: Map<string, CutOperationContext> = new Map();
  private history: LogEntry[] = [];
  private maxHistorySize = 1000;
  private performanceTracking = true;
  private coloredOutput = true;

  // Couleurs pour les logs console
  private readonly colors = {
    debug: 'color: #888',
    info: 'color: #2196F3',
    warn: 'color: #FF9800',
    error: 'color: #F44336',
    success: 'color: #4CAF50',
    performance: 'color: #9C27B0'
  };

  private constructor() {
    // Singleton
  }

  /**
   * Obtient l'instance singleton
   */
  static getInstance(): CutLogger {
    if (!CutLogger.instance) {
      CutLogger.instance = new CutLogger();
    }
    return CutLogger.instance;
  }

  /**
   * Configure le niveau de log
   */
  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Active/désactive le tracking de performance
   */
  setPerformanceTracking(enabled: boolean): void {
    this.performanceTracking = enabled;
  }

  /**
   * Active/désactive les couleurs dans la console
   */
  setColoredOutput(enabled: boolean): void {
    this.coloredOutput = enabled;
  }

  /**
   * Démarre une nouvelle opération de coupe
   */
  startCutOperation(feature: Feature, element: PivotElement, handler?: string): string {
    const operationId = this.generateOperationId(feature, element);
    
    const context: CutOperationContext = {
      featureId: feature.id || 'unknown',
      elementId: element.id || 'unknown',
      handler,
      startTime: performance.now(),
      logs: [],
      performanceMarkers: new Map()
    };
    
    this.activeOperations.set(operationId, context);
    
    this.log(LogLevel.INFO, `🚀 Starting cut operation`, {
      featureId: feature.id,
      elementId: element.id,
      handler,
      featureType: feature.type,
      parameters: feature.parameters
    }, operationId);
    
    return operationId;
  }

  /**
   * Termine une opération de coupe
   */
  endCutOperation(operationId: string, success: boolean, error?: string): void {
    const context = this.activeOperations.get(operationId);
    if (!context) return;
    
    const duration = performance.now() - context.startTime;
    
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const icon = success ? '✅' : '❌';
    const status = success ? 'completed' : 'failed';
    
    this.log(level, `${icon} Cut operation ${status}`, {
      duration: `${duration.toFixed(2)}ms`,
      error,
      handler: context.handler,
      featureId: context.featureId,
      performanceMarkers: Array.from(context.performanceMarkers.entries())
    }, operationId);
    
    // Sauvegarder dans l'historique
    this.history.push(...context.logs);
    this.trimHistory();
    
    // Nettoyer
    this.activeOperations.delete(operationId);
  }

  /**
   * Log un message de debug
   */
  debug(message: string, data?: any, operationId?: string): void {
    this.log(LogLevel.DEBUG, message, data, operationId);
  }

  /**
   * Log un message d'information
   */
  info(message: string, data?: any, operationId?: string): void {
    this.log(LogLevel.INFO, message, data, operationId);
  }

  /**
   * Log un avertissement
   */
  warn(message: string, data?: any, operationId?: string): void {
    this.log(LogLevel.WARN, message, data, operationId);
  }

  /**
   * Log une erreur
   */
  error(message: string, error?: Error | any, operationId?: string): void {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error;
    
    this.log(LogLevel.ERROR, message, errorData, operationId);
  }

  /**
   * Log la sélection d'un handler
   */
  logHandlerSelection(handler: string, reason: string, operationId?: string): void {
    this.info(`🎯 Handler selected: ${handler}`, { reason }, operationId);
    
    if (operationId) {
      const context = this.activeOperations.get(operationId);
      if (context) {
        context.handler = handler;
      }
    }
  }

  /**
   * Log la création de géométrie
   */
  logGeometryCreation(
    geometry: THREE.BufferGeometry,
    type: string,
    operationId?: string
  ): void {
    const vertexCount = geometry.attributes.position?.count || 0;
    const hasNormals = !!geometry.attributes.normal;
    const hasUVs = !!geometry.attributes.uv;
    
    this.info(`📐 Geometry created: ${type}`, {
      vertices: vertexCount,
      hasNormals,
      hasUVs,
      boundingBox: geometry.boundingBox
    }, operationId);
  }

  /**
   * Log une opération CSG
   */
  logCSGOperation(
    operation: string,
    inputVertices: number,
    outputVertices: number,
    duration: number,
    operationId?: string
  ): void {
    const reduction = ((inputVertices - outputVertices) / inputVertices * 100).toFixed(1);
    
    this.info(`🔧 CSG ${operation} completed`, {
      inputVertices,
      outputVertices,
      reduction: `${reduction}%`,
      duration: `${duration.toFixed(2)}ms`
    }, operationId);
  }

  /**
   * Marque le début d'une mesure de performance
   */
  markPerformanceStart(marker: string, operationId?: string): void {
    if (!this.performanceTracking) return;
    
    if (operationId) {
      const context = this.activeOperations.get(operationId);
      if (context) {
        context.performanceMarkers.set(marker, performance.now());
      }
    }
  }

  /**
   * Marque la fin d'une mesure de performance
   */
  markPerformanceEnd(marker: string, operationId?: string): number {
    if (!this.performanceTracking) return 0;
    
    if (operationId) {
      const context = this.activeOperations.get(operationId);
      if (context) {
        const start = context.performanceMarkers.get(marker);
        if (start) {
          const duration = performance.now() - start;
          
          this.debug(`⏱️ Performance: ${marker}`, {
            duration: `${duration.toFixed(2)}ms`
          }, operationId);
          
          return duration;
        }
      }
    }
    
    return 0;
  }

  /**
   * Log détaillé du contour
   */
  logContourDetails(
    points: Array<[number, number]>,
    bounds: any,
    operationId?: string
  ): void {
    this.debug(`📊 Contour analysis`, {
      pointCount: points.length,
      bounds: {
        x: `[${bounds.minX?.toFixed(1)}, ${bounds.maxX?.toFixed(1)}]`,
        y: `[${bounds.minY?.toFixed(1)}, ${bounds.maxY?.toFixed(1)}]`,
        width: bounds.width?.toFixed(1),
        height: bounds.height?.toFixed(1)
      },
      firstPoint: points[0],
      lastPoint: points[points.length - 1],
      isClosed: this.isContourClosed(points)
    }, operationId);
  }

  /**
   * Log d'un batch d'opérations
   */
  logBatchOperation(
    operations: string[],
    results: { success: number; failed: number },
    duration: number,
    operationId?: string
  ): void {
    this.info(`📦 Batch operation completed`, {
      operations: operations.length,
      success: results.success,
      failed: results.failed,
      duration: `${duration.toFixed(2)}ms`,
      averageTime: `${(duration / operations.length).toFixed(2)}ms`
    }, operationId);
  }

  /**
   * Méthode de log principale
   */
  private log(level: LogLevel, message: string, data?: any, operationId?: string): void {
    if (level < this.currentLevel) return;
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      handler: operationId ? this.activeOperations.get(operationId)?.handler : undefined
    };
    
    // Ajouter à l'opération active si applicable
    if (operationId) {
      const context = this.activeOperations.get(operationId);
      if (context) {
        context.logs.push(entry);
      }
    } else {
      // Ajouter directement à l'historique
      this.history.push(entry);
      this.trimHistory();
    }
    
    // Afficher dans la console
    this.outputToConsole(entry);
  }

  /**
   * Affiche un log dans la console
   */
  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = entry.handler ? `[${entry.handler}]` : '[CUT]';
    
    if (this.coloredOutput && console.groupCollapsed) {
      const style = this.getConsoleStyle(entry.level);
      
      console.groupCollapsed(
        `%c${prefix} ${entry.message}`,
        style
      );
      
      if (entry.data) {
        console.log('Data:', entry.data);
      }
      
      if (entry.performance) {
        console.log('Performance:', entry.performance);
      }
      
      console.groupEnd();
    } else {
      // Fallback sans couleurs
      const output = `${prefix} [${levelName}] ${entry.message}`;
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(output, entry.data);
          break;
        case LogLevel.INFO:
          console.info(output, entry.data);
          break;
        case LogLevel.WARN:
          console.warn(output, entry.data);
          break;
        case LogLevel.ERROR:
          console.error(output, entry.data);
          break;
      }
    }
  }

  /**
   * Obtient le style console pour un niveau de log
   */
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return this.colors.debug;
      case LogLevel.INFO:
        return this.colors.info;
      case LogLevel.WARN:
        return this.colors.warn;
      case LogLevel.ERROR:
        return this.colors.error;
      default:
        return '';
    }
  }

  /**
   * Génère un ID unique pour une opération
   */
  private generateOperationId(feature: Feature, element: PivotElement): string {
    return `${feature.id || 'f'}_${element.id || 'e'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie si un contour est fermé
   */
  private isContourClosed(points: Array<[number, number]>): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    const distance = Math.sqrt(
      Math.pow(last[0] - first[0], 2) + 
      Math.pow(last[1] - first[1], 2)
    );
    
    return distance < 0.1;
  }

  /**
   * Limite la taille de l'historique
   */
  private trimHistory(): void {
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Obtient l'historique des logs
   */
  getHistory(filter?: {
    level?: LogLevel;
    handler?: string;
    since?: number;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.history];
    
    if (filter) {
      if (filter.level !== undefined) {
        filtered = filtered.filter(e => e.level >= filter.level!);
      }
      
      if (filter.handler) {
        filtered = filtered.filter(e => e.handler === filter.handler);
      }
      
      if (filter.since) {
        filtered = filtered.filter(e => e.timestamp >= filter.since!);
      }
      
      if (filter.limit) {
        filtered = filtered.slice(-filter.limit);
      }
    }
    
    return filtered;
  }

  /**
   * Exporte les logs au format JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Nettoie tous les logs
   */
  clear(): void {
    this.history = [];
    this.activeOperations.clear();
  }

  /**
   * Obtient des statistiques sur les opérations
   */
  getStatistics(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    handlerUsage: Map<string, number>;
  } {
    const stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      handlerUsage: new Map<string, number>()
    };
    
    let totalDuration = 0;
    
    for (const entry of this.history) {
      if (entry.message.includes('completed')) {
        stats.successfulOperations++;
        stats.totalOperations++;
      } else if (entry.message.includes('failed')) {
        stats.failedOperations++;
        stats.totalOperations++;
      }
      
      if (entry.handler) {
        const count = stats.handlerUsage.get(entry.handler) || 0;
        stats.handlerUsage.set(entry.handler, count + 1);
      }
      
      if (entry.data?.duration) {
        const duration = parseFloat(entry.data.duration);
        if (!isNaN(duration)) {
          totalDuration += duration;
        }
      }
    }
    
    if (stats.totalOperations > 0) {
      stats.averageDuration = totalDuration / stats.totalOperations;
    }
    
    return stats;
  }
}

// Export de l'instance singleton
export const cutLogger = CutLogger.getInstance();

// Import THREE pour les types
import * as THREE from 'three';