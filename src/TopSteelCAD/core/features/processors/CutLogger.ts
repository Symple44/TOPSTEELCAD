/**
 * CutLogger - Système de logging structuré pour le debug des coupes
 * Fournit un logging conditionnel avec niveaux et formatage pour les opérations de découpe
 */

import { Feature, ProfileFace } from '../types';
import { PivotElement } from '@/types/viewer';
import { CutCategory, CutType } from './CutCategoryDetector';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface CutLogContext {
  featureId: string;
  elementId: string;
  cutType?: CutType;
  cutCategory?: CutCategory;
  face?: ProfileFace;
  profileType?: string;
  timestamp?: number;
  performance?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
}

/**
 * Logger structuré pour les opérations de découpe
 */
export class CutLogger {
  private static instance: CutLogger;
  private logLevel: LogLevel;
  private context: CutLogContext | null = null;
  private performanceMarks: Map<string, number> = new Map();
  
  private constructor() {
    // Définir le niveau de log selon l'environnement
    // En mode navigateur, utiliser INFO par défaut
    const envLogLevel = typeof process !== 'undefined' && process.env?.DSTV_LOG_LEVEL 
      ? process.env.DSTV_LOG_LEVEL 
      : 'INFO';
    this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel] || LogLevel.INFO;
  }
  
  static getInstance(): CutLogger {
    if (!CutLogger.instance) {
      CutLogger.instance = new CutLogger();
    }
    return CutLogger.instance;
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  /**
   * Démarre un nouveau contexte de logging pour une opération de découpe
   */
  startCutOperation(feature: Feature, element: PivotElement): void {
    this.context = {
      featureId: feature.id,
      elementId: element.id,
      face: feature.face,
      profileType: element.metadata?.profileType as string,
      timestamp: Date.now(),
      performance: {
        startTime: performance.now()
      }
    };
    
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔪 CUT OPERATION START`);
      console.log(`${'='.repeat(80)}`);
      console.log(`📋 Feature: ${feature.id} | Type: ${feature.type}`);
      console.log(`🏗️ Element: ${element.id} | Profile: ${this.context.profileType || 'unknown'}`);
      console.log(`📍 Face: ${feature.face || 'none'}`);
      console.log(`${'='.repeat(80)}`);
    }
  }
  
  /**
   * Termine le contexte de logging et affiche le résumé
   */
  endCutOperation(success: boolean, error?: string): void {
    if (!this.context) return;
    
    if (this.context.performance) {
      this.context.performance.endTime = performance.now();
      this.context.performance.duration = 
        this.context.performance.endTime - this.context.performance.startTime;
    }
    
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔪 CUT OPERATION ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (error) {
        console.log(`❌ Error: ${error}`);
      }
      if (this.context.performance?.duration) {
        console.log(`⏱️ Duration: ${this.context.performance.duration.toFixed(2)}ms`);
      }
      console.log(`${'='.repeat(80)}\n`);
    }
    
    this.context = null;
    this.performanceMarks.clear();
  }
  
  /**
   * Log la détection du type de coupe
   */
  logCutDetection(cutCategory: CutCategory, cutType: CutType): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    if (this.context) {
      this.context.cutCategory = cutCategory;
      this.context.cutType = cutType;
    }
    
    console.log(`\n🔍 CUT DETECTION:`);
    console.log(`  Category: ${cutCategory}`);
    console.log(`  Type: ${cutType}`);
  }
  
  /**
   * Log les détails du contour
   */
  logContourDetails(points: Array<[number, number]>, bounds?: any): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    console.log(`\n📐 CONTOUR DETAILS:`);
    console.log(`  Points: ${points.length}`);
    
    if (bounds) {
      console.log(`  Bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] ` +
                  `Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
    }
    
    // Afficher les premiers et derniers points
    if (points.length > 0) {
      console.log(`  First point: [${points[0][0].toFixed(1)}, ${points[0][1].toFixed(1)}]`);
      if (points.length > 1) {
        const last = points[points.length - 1];
        console.log(`  Last point: [${last[0].toFixed(1)}, ${last[1].toFixed(1)}]`);
      }
    }
    
    // Détecter les segments diagonaux
    const diagonalSegments = this.detectDiagonalSegments(points);
    if (diagonalSegments.length > 0) {
      console.log(`  Diagonal segments: ${diagonalSegments.length}`);
      diagonalSegments.forEach((seg, i) => {
        console.log(`    Segment ${i + 1}: angle=${seg.angle.toFixed(1)}°, length=${seg.length.toFixed(1)}mm`);
      });
    }
  }
  
  /**
   * Log la sélection de stratégie
   */
  logStrategySelection(strategyName: string, reason?: string): void {
    if (this.logLevel > LogLevel.INFO) return;
    
    console.log(`\n🎯 STRATEGY SELECTION:`);
    console.log(`  Selected: ${strategyName}`);
    if (reason) {
      console.log(`  Reason: ${reason}`);
    }
  }
  
  /**
   * Log les détails de la géométrie créée
   */
  logGeometryCreation(geometry: any, type: string): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    const vertexCount = geometry.attributes.position?.count || 0;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    
    console.log(`\n🏗️ GEOMETRY CREATION:`);
    console.log(`  Type: ${type}`);
    console.log(`  Vertices: ${vertexCount}`);
    if (bbox) {
      console.log(`  Bounds: X[${bbox.min.x.toFixed(1)}, ${bbox.max.x.toFixed(1)}] ` +
                  `Y[${bbox.min.y.toFixed(1)}, ${bbox.max.y.toFixed(1)}] ` +
                  `Z[${bbox.min.z.toFixed(1)}, ${bbox.max.z.toFixed(1)}]`);
    }
  }
  
  /**
   * Log les opérations CSG
   */
  logCSGOperation(operation: string, inputVertices: number, outputVertices?: number): void {
    if (this.logLevel > LogLevel.INFO) return;
    
    console.log(`\n⚙️ CSG OPERATION:`);
    console.log(`  Operation: ${operation}`);
    console.log(`  Input vertices: ${inputVertices}`);
    if (outputVertices !== undefined) {
      console.log(`  Output vertices: ${outputVertices}`);
      const change = outputVertices - inputVertices;
      console.log(`  Vertex change: ${change > 0 ? '+' : ''}${change}`);
    }
  }
  
  /**
   * PHASE 1 AMÉLIORÉ - Log les paramètres de soudure (pour bevel cuts)
   * Ajout de la détection automatique des angles négatifs DSTV
   */
  logWeldingParameters(params: any, rawData?: any[]): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    console.log(`\n🔥 WELDING PARAMETERS (DSTV Standard):`);
    
    // Détecter automatiquement les angles de préparation soudure dans rawData
    if (rawData && Array.isArray(rawData)) {
      const negativeAngles = rawData
        .filter(val => {
          const num = parseFloat(String(val));
          return !isNaN(num) && num < -10 && num > -85;
        })
        .map(val => parseFloat(String(val)));
        
      if (negativeAngles.length > 0) {
        console.log(`  🔍 DSTV Detected Bevel Angles: [${negativeAngles.map(a => a.toFixed(1) + '°').join(', ')}]`);
        
        negativeAngles.forEach((angle, i) => {
          const absAngle = Math.abs(angle);
          let weldType = 'Unknown';
          if (absAngle >= 60) weldType = 'Deep V-groove';
          else if (absAngle >= 45) weldType = 'V-groove';
          else if (absAngle >= 30) weldType = 'Bevel';
          else weldType = 'Light bevel';
          
          console.log(`    Angle ${i + 1}: ${angle.toFixed(1)}° → ${weldType} preparation`);
        });
      }
    }
    
    // Paramètres explicites
    if (params.bevelAngle) {
      console.log(`  🔥 Explicit bevel angle: ${params.bevelAngle}°`);
    }
    if (params.bevelDistance) {
      console.log(`  📜 Bevel distance: ${params.bevelDistance}mm`);
    }
    if (params.weldingType) {
      console.log(`  ⚙️ Welding type: ${params.weldingType}`);
    }
    if (params.rootFace) {
      console.log(`  🎯 Root face: ${params.rootFace}mm`);
    }
    if (params.rootGap) {
      console.log(`  🕳️ Root gap: ${params.rootGap}mm`);
    }
  }
  
  /**
   * Marque le début d'une opération pour mesurer les performances
   */
  markPerformanceStart(operation: string): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    this.performanceMarks.set(operation, performance.now());
  }
  
  /**
   * Marque la fin d'une opération et log le temps écoulé
   */
  markPerformanceEnd(operation: string): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    const startTime = this.performanceMarks.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`  ⏱️ ${operation}: ${duration.toFixed(2)}ms`);
      this.performanceMarks.delete(operation);
    }
  }
  
  /**
   * Log un avertissement
   */
  warn(message: string, details?: any): void {
    if (this.logLevel > LogLevel.WARN) return;
    
    console.warn(`⚠️ WARNING: ${message}`);
    if (details) {
      console.warn('  Details:', details);
    }
  }
  
  /**
   * Log une erreur
   */
  error(message: string, error?: Error): void {
    if (this.logLevel > LogLevel.ERROR) return;
    
    console.error(`❌ ERROR: ${message}`);
    if (error) {
      console.error('  Stack:', error.stack);
    }
  }
  
  /**
   * Log de debug conditionnel
   */
  debug(message: string, data?: any): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    console.log(`🐛 DEBUG: ${message}`);
    if (data) {
      console.log('  Data:', data);
    }
  }
  
  /**
   * PHASE 1 AMÉLIORÉ - Log détaillé pour la géométrie des tubes HSS
   * Spécialisation pour les profils tubulaires avec contours complexes
   */
  logTubeGeometryDetails(points: Array<[number, number]>, element: PivotElement): void {
    if (this.logLevel > LogLevel.DEBUG) return;
    
    const profileType = element.metadata?.profileType;
    const profileName = element.metadata?.profileName;
    const isHSS = profileType === 'TUBE_RECT' || profileName?.includes('HSS');
    
    if (!isHSS) return;
    
    console.log(`\n🟠 HSS TUBE GEOMETRY ANALYSIS:`);
    console.log(`  Profile: ${profileName} (${profileType})`);
    console.log(`  Contour points: ${points.length}`);
    
    if (points.length > 20) {
      console.log(`  ⚠️ Complex contour detected (${points.length} points) - consider simplification`);
      
      // Analyser la complexité
      const complexity = this.analyzeContourComplexity(points);
      console.log(`  Complexity metrics:`);
      console.log(`    Direction changes: ${complexity.directionChanges}`);
      console.log(`    Max segment length: ${complexity.maxSegmentLength.toFixed(1)}mm`);
      console.log(`    Min segment length: ${complexity.minSegmentLength.toFixed(1)}mm`);
      console.log(`    Aspect ratio: ${complexity.aspectRatio.toFixed(2)}`);
    }
    
    // Détecter les coupes d'angle vs bevel cuts
    const angleDetection = this.detectHSSCutType(points, element);
    console.log(`  Cut type analysis: ${angleDetection.type}`);
    if (angleDetection.confidence) {
      console.log(`  Confidence: ${(angleDetection.confidence * 100).toFixed(1)}%`);
    }
  }
  
  /**
   * PHASE 1 AMÉLIORÉ - Métriques CSG détaillées avec analyse de performance
   */
  logCSGMetrics(operation: string, inputGeometry: any, outputGeometry: any, duration: number): void {
    if (this.logLevel > LogLevel.INFO) return;
    
    const inputVertices = inputGeometry.attributes.position?.count || 0;
    const outputVertices = outputGeometry.attributes.position?.count || 0;
    const vertexChange = outputVertices - inputVertices;
    const vertexChangePercent = inputVertices > 0 ? (vertexChange / inputVertices) * 100 : 0;
    
    console.log(`\n⚙️ CSG DETAILED METRICS:`);
    console.log(`  Operation: ${operation}`);
    console.log(`  Performance: ${duration.toFixed(2)}ms`);
    console.log(`  Input vertices: ${inputVertices.toLocaleString()}`);
    console.log(`  Output vertices: ${outputVertices.toLocaleString()}`);
    console.log(`  Vertex change: ${vertexChange > 0 ? '+' : ''}${vertexChange.toLocaleString()} (${vertexChangePercent.toFixed(1)}%)`);
    
    // Analyse de performance
    let performanceRating = 'Excellent';
    if (duration > 500) performanceRating = 'Slow';
    else if (duration > 200) performanceRating = 'Moderate';
    else if (duration > 50) performanceRating = 'Good';
    
    console.log(`  Performance rating: ${performanceRating}`);
    
    if (duration > 200) {
      console.log(`  ⚠️ Performance warning: CSG operation took ${duration.toFixed(2)}ms`);
      if (inputVertices > 10000) {
        console.log(`    💡 Suggestion: Consider geometry simplification (${inputVertices.toLocaleString()} vertices)`);
      }
    }
    
    // Vérifier la validité du résultat
    this.validateCSGResult(inputGeometry, outputGeometry);
  }
  
  /**
   * PHASE 1 - Analyse de la complexité d'un contour
   */
  private analyzeContourComplexity(points: Array<[number, number]>): {
    directionChanges: number;
    maxSegmentLength: number;
    minSegmentLength: number;
    aspectRatio: number;
  } {
    let directionChanges = 0;
    let maxSegmentLength = 0;
    let minSegmentLength = Infinity;
    
    let prevDirection: number | null = null;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const length = Math.sqrt(dx * dx + dy * dy);
      const direction = Math.atan2(dy, dx);
      
      maxSegmentLength = Math.max(maxSegmentLength, length);
      minSegmentLength = Math.min(minSegmentLength, length);
      
      if (prevDirection !== null) {
        const angleDiff = Math.abs(direction - prevDirection);
        if (angleDiff > Math.PI / 4) { // 45°
          directionChanges++;
        }
      }
      
      prevDirection = direction;
    }
    
    // Calculer l'aspect ratio
    const bounds = this.getContourBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const aspectRatio = width > 0 && height > 0 ? Math.max(width, height) / Math.min(width, height) : 1;
    
    return {
      directionChanges,
      maxSegmentLength,
      minSegmentLength: minSegmentLength === Infinity ? 0 : minSegmentLength,
      aspectRatio
    };
  }
  
  /**
   * PHASE 1 - Détection du type de coupe pour tubes HSS
   */
  private detectHSSCutType(points: Array<[number, number]>, element: PivotElement): {
    type: 'ANGLE_CUT' | 'BEVEL_CUT' | 'STRAIGHT_CUT' | 'COMPLEX';
    confidence: number;
  } {
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    // Vérifier position (extrémités)
    const isAtStart = bounds.minX < 100;
    const isAtEnd = bounds.maxX > profileLength - 100;
    const atExtremity = isAtStart || isAtEnd;
    
    // Analyser les segments diagonaux
    const diagonalSegments = this.detectDiagonalSegments(points);
    
    if (diagonalSegments.length === 0) {
      return { type: 'STRAIGHT_CUT', confidence: 0.9 };
    }
    
    // Si aux extrémités avec diagonal significatif
    if (atExtremity && diagonalSegments.length > 0) {
      const maxDiagonalLength = Math.max(...diagonalSegments.map(s => s.length));
      
      if (maxDiagonalLength > 50) {
        return { type: 'ANGLE_CUT', confidence: 0.8 };
      } else {
        return { type: 'BEVEL_CUT', confidence: 0.7 };
      }
    }
    
    if (points.length > 10) {
      return { type: 'COMPLEX', confidence: 0.6 };
    }
    
    return { type: 'BEVEL_CUT', confidence: 0.5 };
  }
  
  /**
   * PHASE 1 - Validation du résultat CSG
   */
  private validateCSGResult(inputGeometry: any, outputGeometry: any): void {
    if (!outputGeometry || !outputGeometry.attributes || !outputGeometry.attributes.position) {
      console.log(`  ❌ CSG result validation: Invalid output geometry`);
      return;
    }
    
    const outputVertices = outputGeometry.attributes.position.count;
    if (outputVertices === 0) {
      console.log(`  ❌ CSG result validation: Empty result (0 vertices)`);
      return;
    }
    
    // Vérifier la bounding box
    try {
      outputGeometry.computeBoundingBox();
      const bbox = outputGeometry.boundingBox;
      if (!bbox || !isFinite(bbox.min.x) || !isFinite(bbox.max.x)) {
        console.log(`  ❌ CSG result validation: Invalid bounding box`);
        return;
      }
    } catch (error) {
      console.log(`  ❌ CSG result validation: Failed to compute bounding box`);
      return;
    }
    
    console.log(`  ✅ CSG result validation: Valid geometry with ${outputVertices.toLocaleString()} vertices`);
  }
  
  /**
   * Utilitaire pour calculer les bounds d'un contour
   */
  private getContourBounds(points: Array<[number, number]>): {
    minX: number; maxX: number; minY: number; maxY: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return { minX, maxX, minY, maxY };
  }
  
  /**
   * Détecte les segments diagonaux dans un contour
   */
  private detectDiagonalSegments(points: Array<[number, number]>): Array<{
    index: number;
    angle: number;
    length: number;
  }> {
    const segments = [];
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Segment diagonal significatif
      if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        segments.push({ index: i, angle, length });
      }
    }
    
    return segments;
  }
}

// Export singleton instance
export const cutLogger = CutLogger.getInstance();