/**
 * KontourHandler.ts - Handler pour les contours complexes (blocks KO du DSTV)
 * Gère les contours multi-segments, courbes et splines selon la norme DSTV
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../../../types';
import { PivotElement } from '../types/CoreTypes';
import { CutType, CutCategory } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';
import { getCSGService } from '../services/CSGOperationService';

/**
 * Types de contours supportés par le KontourHandler
 */
enum KontourType {
  MULTI_SEGMENT = 'multi_segment',    // Contour multi-segments linéaires
  CURVED = 'curved',                  // Contour avec courbes
  SPLINE = 'spline',                  // Contour avec splines
  MIXED = 'mixed',                    // Contour mixte (segments + courbes)
  COMPLEX = 'complex',                // Contour complexe avec sous-contours
  FREEFORM = 'freeform'              // Contour libre sans contraintes
}

/**
 * Segment de contour
 */
interface KontourSegment {
  type: 'line' | 'arc' | 'spline' | 'bezier';
  startPoint: [number, number];
  endPoint: [number, number];
  controlPoints?: Array<[number, number]>; // Pour courbes et splines
  radius?: number;                          // Pour arcs
  center?: [number, number];               // Pour arcs
  bulge?: number;                          // Facteur de courbure DSTV
}

/**
 * Configuration du contour
 */
interface KontourConfig {
  segments: KontourSegment[];
  isClosed: boolean;
  tolerance: number;
  smoothing: boolean;
  subdivisions: number;
  simplification: boolean;
}

/**
 * Handler pour les contours complexes (blocks KO dans DSTV)
 * Priorité 68 (entre ExteriorCutHandler et InteriorCutHandler)
 */
export class KontourHandler extends BaseCutHandler {
  readonly name = 'KontourHandler';
  readonly supportedTypes = [
    CutType.CONTOUR_CUT,
    CutType.UNRESTRICTED_CONTOUR,
    CutType.EXTERIOR_CUT,
    CutType.INTERIOR_CUT
  ];
  readonly priority = 68;

  private geometryService = getGeometryService();
  private csgService = getCSGService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Block DSTV KO explicite
    if (params.dstvBlock === 'KO' || params.blockType === 'KO') {
      return true;
    }
    
    // Type de contour complexe
    if (params.kontourType || params.contourType === 'complex') {
      return true;
    }
    
    // Détection de contour multi-segments
    if (params.segments && Array.isArray(params.segments)) {
      return true;
    }
    
    // Points avec données de courbure (bulge)
    if (params.points && this.hasComplexContourData(params.points)) {
      return true;
    }
    
    // Contour avec courbes explicites
    if (params.curves || params.splines || params.arcs) {
      return true;
    }
    
    // Pattern de contour libre
    if (params.isUnrestrictedContour || params.isFreeform) {
      return true;
    }
    
    // Analyser la complexité du contour
    if (params.points && this.isComplexContour(params.points)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les contours complexes
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier la structure du contour
    if (params.segments) {
      const validationResult = this.validateKontourSegments(params.segments);
      errors.push(...validationResult.errors);
      warnings.push(...(validationResult.warnings || []));
    } else if (params.points) {
      const normalizedPoints = this.normalizePoints(params.points);
      
      // Vérifier le nombre minimum de points
      if (normalizedPoints.length < 3) {
        errors.push('Complex contour requires at least 3 points');
      }
      
      // Vérifier la continuité du contour
      if (!this.isContourContinuous(normalizedPoints)) {
        warnings.push('Contour has discontinuities, will be auto-repaired');
      }
      
      // Vérifier la complexité
      const complexity = this.analyzeComplexity(normalizedPoints);
      if (complexity.points > 500) {
        warnings.push(`Very complex contour with ${complexity.points} points may impact performance`);
      }
      
      if (complexity.selfIntersections > 0) {
        warnings.push(`Contour has ${complexity.selfIntersections} self-intersections`);
      }
    }
    
    // Vérifier les paramètres de tolérance
    if (params.tolerance !== undefined && params.tolerance <= 0) {
      errors.push('Tolerance must be positive');
    }
    
    // Vérifier les subdivisions
    if (params.subdivisions !== undefined && (params.subdivisions < 1 || params.subdivisions > 100)) {
      warnings.push('Subdivisions should be between 1 and 100');
    }
  }

  /**
   * Les contours complexes nécessitent des données de contour
   */
  protected requiresContourPoints(): boolean {
    return true;
  }

  /**
   * Crée la géométrie de contour complexe
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const kontourType = this.detectKontourType(params);
    const face: ProfileFace = params.face || ProfileFace.WEB;
    
    console.log(`  🌀 Creating complex contour geometry:`, {
      type: kontourType,
      segments: params.segments?.length || 0,
      points: params.points?.length || 0,
      face
    });
    
    // Extraire la configuration du contour
    const config = this.extractKontourConfig(params);
    
    switch (kontourType) {
      case KontourType.MULTI_SEGMENT:
        return this.createMultiSegmentContour(config, element, face as ProfileFace, params);
        
      case KontourType.CURVED:
        return this.createCurvedContour(config, element, face as ProfileFace, params);
        
      case KontourType.SPLINE:
        return this.createSplineContour(config, element, face as ProfileFace, params);
        
      case KontourType.MIXED:
        return this.createMixedContour(config, element, face as ProfileFace, params);
        
      case KontourType.COMPLEX:
        return this.createComplexContour(config, element, face as ProfileFace, params);
        
      case KontourType.FREEFORM:
        return this.createFreeformContour(config, element, face as ProfileFace, params);
        
      default:
        return this.createDefaultContour(config, element, face as ProfileFace, params);
    }
  }

  /**
   * Détecte le type de contour
   */
  private detectKontourType(params: any): KontourType {
    if (params.kontourType && Object.values(KontourType).includes(params.kontourType)) {
      return params.kontourType as KontourType;
    }
    
    if (params.segments) {
      const hasArcs = params.segments.some((s: any) => s.type === 'arc' || s.radius);
      const hasSplines = params.segments.some((s: any) => s.type === 'spline' || s.type === 'bezier');
      const hasLines = params.segments.some((s: any) => s.type === 'line' || !s.type);
      
      if (hasSplines) {
        return hasLines || hasArcs ? KontourType.MIXED : KontourType.SPLINE;
      }
      
      if (hasArcs) {
        return hasLines ? KontourType.MIXED : KontourType.CURVED;
      }
      
      if (params.segments.length > 10) {
        return KontourType.COMPLEX;
      }
      
      return KontourType.MULTI_SEGMENT;
    }
    
    if (params.isUnrestrictedContour || params.isFreeform) {
      return KontourType.FREEFORM;
    }
    
    if (params.points) {
      const complexity = this.analyzeComplexity(this.normalizePoints(params.points));
      
      if (complexity.hasSplines) return KontourType.SPLINE;
      if (complexity.hasCurves) return KontourType.CURVED;
      if (complexity.points > 50) return KontourType.COMPLEX;
      if (complexity.segments > 10) return KontourType.MULTI_SEGMENT;
    }
    
    return KontourType.MULTI_SEGMENT;
  }

  /**
   * Extrait la configuration du contour
   */
  private extractKontourConfig(params: any): KontourConfig {
    let segments: KontourSegment[] = [];
    
    if (params.segments) {
      segments = params.segments.map(this.normalizeSegment.bind(this));
    } else if (params.points) {
      segments = this.pointsToSegments(this.normalizePoints(params.points), params);
    }
    
    return {
      segments,
      isClosed: params.isClosed !== false, // Fermé par défaut
      tolerance: params.tolerance || 0.1,
      smoothing: params.smoothing || false,
      subdivisions: params.subdivisions || 10,
      simplification: params.simplification || false
    };
  }

  /**
   * Crée un contour multi-segments
   */
  private createMultiSegmentContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    let firstPoint = true;
    
    for (const segment of config.segments) {
      if (firstPoint) {
        shape.moveTo(segment.startPoint[0], segment.startPoint[1]);
        firstPoint = false;
      }
      
      // Tous les segments sont des lignes droites
      shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
    }
    
    if (config.isClosed) {
      shape.closePath();
    }
    
    return this.extrudeShape(shape, element, face, params);
  }

  /**
   * Crée un contour avec courbes
   */
  private createCurvedContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    let firstPoint = true;
    
    for (const segment of config.segments) {
      if (firstPoint) {
        shape.moveTo(segment.startPoint[0], segment.startPoint[1]);
        firstPoint = false;
      }
      
      if (segment.type === 'arc' && segment.center && segment.radius) {
        // Calculer les angles pour l'arc
        const startAngle = Math.atan2(
          segment.startPoint[1] - segment.center[1],
          segment.startPoint[0] - segment.center[0]
        );
        const endAngle = Math.atan2(
          segment.endPoint[1] - segment.center[1],
          segment.endPoint[0] - segment.center[0]
        );
        
        shape.absarc(
          segment.center[0],
          segment.center[1],
          segment.radius,
          startAngle,
          endAngle,
          false // Sens horaire
        );
      } else {
        shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
      }
    }
    
    if (config.isClosed) {
      shape.closePath();
    }
    
    return this.extrudeShape(shape, element, face, params);
  }

  /**
   * Crée un contour avec splines
   */
  private createSplineContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    let firstPoint = true;
    
    for (const segment of config.segments) {
      if (firstPoint) {
        shape.moveTo(segment.startPoint[0], segment.startPoint[1]);
        firstPoint = false;
      }
      
      if (segment.type === 'spline' || segment.type === 'bezier') {
        if (segment.controlPoints && segment.controlPoints.length >= 1) {
          if (segment.controlPoints.length === 1) {
            // Courbe quadratique
            shape.quadraticCurveTo(
              segment.controlPoints[0][0],
              segment.controlPoints[0][1],
              segment.endPoint[0],
              segment.endPoint[1]
            );
          } else {
            // Courbe de Bézier cubique
            shape.bezierCurveTo(
              segment.controlPoints[0][0],
              segment.controlPoints[0][1],
              segment.controlPoints[1][0],
              segment.controlPoints[1][1],
              segment.endPoint[0],
              segment.endPoint[1]
            );
          }
        } else {
          shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
        }
      } else {
        shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
      }
    }
    
    if (config.isClosed) {
      shape.closePath();
    }
    
    return this.extrudeShape(shape, element, face, params);
  }

  /**
   * Crée un contour mixte (lignes + courbes + splines)
   */
  private createMixedContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    let firstPoint = true;
    
    for (const segment of config.segments) {
      if (firstPoint) {
        shape.moveTo(segment.startPoint[0], segment.startPoint[1]);
        firstPoint = false;
      }
      
      switch (segment.type) {
        case 'arc':
          if (segment.center && segment.radius) {
            const startAngle = Math.atan2(
              segment.startPoint[1] - segment.center[1],
              segment.startPoint[0] - segment.center[0]
            );
            const endAngle = Math.atan2(
              segment.endPoint[1] - segment.center[1],
              segment.endPoint[0] - segment.center[0]
            );
            
            shape.absarc(
              segment.center[0],
              segment.center[1],
              segment.radius,
              startAngle,
              endAngle,
              false
            );
          } else {
            shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
          }
          break;
          
        case 'spline':
        case 'bezier':
          if (segment.controlPoints && segment.controlPoints.length >= 1) {
            if (segment.controlPoints.length === 1) {
              shape.quadraticCurveTo(
                segment.controlPoints[0][0],
                segment.controlPoints[0][1],
                segment.endPoint[0],
                segment.endPoint[1]
              );
            } else {
              shape.bezierCurveTo(
                segment.controlPoints[0][0],
                segment.controlPoints[0][1],
                segment.controlPoints[1][0],
                segment.controlPoints[1][1],
                segment.endPoint[0],
                segment.endPoint[1]
              );
            }
          } else {
            shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
          }
          break;
          
        case 'line':
        default:
          shape.lineTo(segment.endPoint[0], segment.endPoint[1]);
          break;
      }
    }
    
    if (config.isClosed) {
      shape.closePath();
    }
    
    return this.extrudeShape(shape, element, face, params);
  }

  /**
   * Crée un contour complexe avec sous-contours
   */
  private createComplexContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    // Pour les contours très complexes, utiliser une approche par tessellation
    const tessellatedPoints = this.tessellateComplexContour(config);
    
    const shape = new THREE.Shape();
    
    if (tessellatedPoints.length > 0) {
      shape.moveTo(tessellatedPoints[0][0], tessellatedPoints[0][1]);
      
      for (let i = 1; i < tessellatedPoints.length; i++) {
        shape.lineTo(tessellatedPoints[i][0], tessellatedPoints[i][1]);
      }
      
      if (config.isClosed) {
        shape.closePath();
      }
    }
    
    return this.extrudeShape(shape, element, face, params);
  }

  /**
   * Crée un contour libre sans contraintes
   */
  private createFreeformContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    // Pour les contours libres, utiliser le service de géométrie avec options avancées
    const points = config.segments.map(s => s.startPoint);
    if (config.segments.length > 0) {
      points.push(config.segments[config.segments.length - 1].endPoint);
    }
    
    return this.geometryService.createCutGeometry(points, element, {
      face: face as any,
      depth: params.depth || this.getExtrusionDepth(face, element.dimensions || {}),
      cutType: 'freeform'
    });
  }

  /**
   * Crée un contour par défaut
   */
  private createDefaultContour(
    config: KontourConfig,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    return this.createMultiSegmentContour(config, element, face, params);
  }

  /**
   * Extrude une forme THREE.Shape
   */
  private extrudeShape(
    shape: THREE.Shape,
    element: PivotElement,
    face: ProfileFace,
    params: any
  ): THREE.BufferGeometry {
    const depth = params.depth || this.getExtrusionDepth(face, element.dimensions || {});
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth,
      bevelEnabled: params.bevelEnabled || false,
      bevelThickness: params.bevelThickness || 0,
      bevelSize: params.bevelSize || 0,
      steps: params.steps || Math.max(1, Math.floor(depth / 10))
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer les transformations selon la face
    this.applyFaceTransform(geometry, face, element);
    
    return geometry;
  }

  /**
   * Normalise un segment
   */
  private normalizeSegment(segment: any): KontourSegment {
    return {
      type: segment.type || 'line',
      startPoint: [Number(segment.startPoint?.[0] || segment.x1 || 0), 
                   Number(segment.startPoint?.[1] || segment.y1 || 0)],
      endPoint: [Number(segment.endPoint?.[0] || segment.x2 || 0), 
                 Number(segment.endPoint?.[1] || segment.y2 || 0)],
      controlPoints: segment.controlPoints?.map((p: any) => [Number(p[0]), Number(p[1])]),
      radius: segment.radius ? Number(segment.radius) : undefined,
      center: segment.center ? [Number(segment.center[0]), Number(segment.center[1])] : undefined,
      bulge: segment.bulge ? Number(segment.bulge) : undefined
    };
  }

  /**
   * Convertit des points en segments
   */
  private pointsToSegments(points: Array<[number, number]>, params: any): KontourSegment[] {
    const segments: KontourSegment[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const segment: KontourSegment = {
        type: 'line',
        startPoint: points[i],
        endPoint: points[i + 1]
      };
      
      // Détecter les informations de courbure (bulge) si présentes
      if (params.bulges && params.bulges[i] !== undefined && params.bulges[i] !== 0) {
        const bulge = params.bulges[i];
        const midPoint = this.calculateBulgeArc(points[i], points[i + 1], bulge);
        
        if (midPoint) {
          segment.type = 'arc';
          segment.controlPoints = [midPoint];
          segment.bulge = bulge;
        }
      }
      
      segments.push(segment);
    }
    
    // Fermer le contour si nécessaire
    if (params.isClosed !== false && points.length > 2) {
      const lastPoint = points[points.length - 1];
      const firstPoint = points[0];
      const distance = Math.sqrt(
        Math.pow(lastPoint[0] - firstPoint[0], 2) + 
        Math.pow(lastPoint[1] - firstPoint[1], 2)
      );
      
      if (distance > 0.1) { // Tolérance
        segments.push({
          type: 'line',
          startPoint: lastPoint,
          endPoint: firstPoint
        });
      }
    }
    
    return segments;
  }

  /**
   * Vérifie si les points ont des données de contour complexe
   */
  private hasComplexContourData(points: any[]): boolean {
    return points.some(p => 
      p.bulge !== undefined || 
      p.controlPoints !== undefined || 
      p.radius !== undefined ||
      typeof p === 'object' && p !== null && (p.x === undefined || p.y === undefined)
    );
  }

  /**
   * Vérifie si un contour est complexe
   */
  private isComplexContour(points: Array<[number, number]>): boolean {
    // Un contour est considéré comme complexe s'il a plus de 20 points
    // ou s'il présente des variations d'angles significatives
    if (points.length > 20) return true;
    
    let significantAngleChanges = 0;
    let lastAngle: number | null = null;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const angle = Math.atan2(dy, dx);
      
      if (lastAngle !== null) {
        const angleDiff = Math.abs(angle - lastAngle);
        if (angleDiff > Math.PI / 4) { // 45 degrés
          significantAngleChanges++;
        }
      }
      lastAngle = angle;
    }
    
    return significantAngleChanges > 5;
  }

  /**
   * Valide les segments du contour
   */
  private validateKontourSegments(segments: any[]): {errors: string[], warnings?: string[]} {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (segments.length === 0) {
      errors.push('No segments provided for complex contour');
      return { errors, warnings };
    }
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Vérifier les points de début et fin
      if (!segment.startPoint || !segment.endPoint) {
        errors.push(`Segment ${i} missing start or end point`);
        continue;
      }
      
      // Vérifier la continuité
      if (i > 0) {
        const prevSegment = segments[i - 1];
        const distance = Math.sqrt(
          Math.pow(segment.startPoint[0] - prevSegment.endPoint[0], 2) +
          Math.pow(segment.startPoint[1] - prevSegment.endPoint[1], 2)
        );
        
        if (distance > 1.0) { // Tolérance de continuité
          warnings.push(`Gap detected between segments ${i-1} and ${i}`);
        }
      }
      
      // Vérifier les paramètres des arcs
      if (segment.type === 'arc') {
        if (segment.radius && segment.radius <= 0) {
          errors.push(`Segment ${i} has invalid radius`);
        }
        if (segment.center && (!Array.isArray(segment.center) || segment.center.length !== 2)) {
          errors.push(`Segment ${i} has invalid center point`);
        }
      }
      
      // Vérifier les points de contrôle des splines
      if ((segment.type === 'spline' || segment.type === 'bezier') && segment.controlPoints) {
        if (!Array.isArray(segment.controlPoints)) {
          errors.push(`Segment ${i} has invalid control points`);
        }
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Vérifie la continuité du contour
   */
  private isContourContinuous(points: Array<[number, number]>): boolean {
    const tolerance = 0.1;
    
    for (let i = 1; i < points.length; i++) {
      const distance = Math.sqrt(
        Math.pow(points[i][0] - points[i-1][0], 2) + 
        Math.pow(points[i][1] - points[i-1][1], 2)
      );
      
      if (distance > tolerance && distance < 0.01) {
        return false; // Discontinuité détectée
      }
    }
    
    return true;
  }

  /**
   * Analyse la complexité du contour
   */
  private analyzeComplexity(points: Array<[number, number]>): {
    points: number;
    segments: number;
    selfIntersections: number;
    hasSplines: boolean;
    hasCurves: boolean;
  } {
    return {
      points: points.length,
      segments: points.length - 1,
      selfIntersections: this.countSelfIntersections(points),
      hasSplines: false, // Détection simplifiée
      hasCurves: false   // Détection simplifiée
    };
  }

  /**
   * Compte les auto-intersections
   */
  private countSelfIntersections(points: Array<[number, number]>): number {
    let count = 0;
    
    // Algorithme simple pour détecter les intersections
    for (let i = 0; i < points.length - 3; i++) {
      for (let j = i + 2; j < points.length - 1; j++) {
        if (this.linesIntersect(points[i], points[i + 1], points[j], points[j + 1])) {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Vérifie si deux lignes se coupent
   */
  private linesIntersect(
    p1: [number, number], p2: [number, number],
    p3: [number, number], p4: [number, number]
  ): boolean {
    const det = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);
    if (Math.abs(det) < 0.01) return false; // Lignes parallèles
    
    const t = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / det;
    const u = -((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / det;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /**
   * Tesselle un contour complexe
   */
  private tessellateComplexContour(config: KontourConfig): Array<[number, number]> {
    const points: Array<[number, number]> = [];
    
    for (const segment of config.segments) {
      if (segment.type === 'arc' && segment.center && segment.radius) {
        // Tesseller l'arc
        const arcPoints = this.tessellateArc(segment, config.subdivisions);
        points.push(...arcPoints);
      } else if (segment.type === 'spline' || segment.type === 'bezier') {
        // Tesseller la spline/courbe
        const curvePoints = this.tessellateCurve(segment, config.subdivisions);
        points.push(...curvePoints);
      } else {
        // Segment linéaire
        points.push(segment.startPoint);
        if (segment === config.segments[config.segments.length - 1]) {
          points.push(segment.endPoint);
        }
      }
    }
    
    return points;
  }

  /**
   * Tesselle un arc
   */
  private tessellateArc(segment: KontourSegment, subdivisions: number): Array<[number, number]> {
    if (!segment.center || !segment.radius) {
      return [segment.startPoint, segment.endPoint];
    }
    
    const points: Array<[number, number]> = [];
    
    const startAngle = Math.atan2(
      segment.startPoint[1] - segment.center[1],
      segment.startPoint[0] - segment.center[0]
    );
    const endAngle = Math.atan2(
      segment.endPoint[1] - segment.center[1],
      segment.endPoint[0] - segment.center[0]
    );
    
    let angleRange = endAngle - startAngle;
    if (angleRange < 0) angleRange += 2 * Math.PI;
    
    for (let i = 0; i <= subdivisions; i++) {
      const angle = startAngle + (angleRange * i) / subdivisions;
      const x = segment.center[0] + segment.radius * Math.cos(angle);
      const y = segment.center[1] + segment.radius * Math.sin(angle);
      points.push([x, y]);
    }
    
    return points;
  }

  /**
   * Tesselle une courbe
   */
  private tessellateCurve(segment: KontourSegment, subdivisions: number): Array<[number, number]> {
    const points: Array<[number, number]> = [];
    
    if (!segment.controlPoints || segment.controlPoints.length === 0) {
      return [segment.startPoint, segment.endPoint];
    }
    
    for (let i = 0; i <= subdivisions; i++) {
      const t = i / subdivisions;
      let point: [number, number];
      
      if (segment.controlPoints.length === 1) {
        // Courbe quadratique
        point = this.quadraticBezier(segment.startPoint, segment.controlPoints[0], segment.endPoint, t);
      } else {
        // Courbe cubique (simplifiée)
        point = this.cubicBezier(
          segment.startPoint, 
          segment.controlPoints[0], 
          segment.controlPoints[1] || segment.controlPoints[0], 
          segment.endPoint, 
          t
        );
      }
      
      points.push(point);
    }
    
    return points;
  }

  /**
   * Calcule un point sur une courbe de Bézier quadratique
   */
  private quadraticBezier(
    p0: [number, number], 
    p1: [number, number], 
    p2: [number, number], 
    t: number
  ): [number, number] {
    const x = Math.pow(1 - t, 2) * p0[0] + 2 * (1 - t) * t * p1[0] + Math.pow(t, 2) * p2[0];
    const y = Math.pow(1 - t, 2) * p0[1] + 2 * (1 - t) * t * p1[1] + Math.pow(t, 2) * p2[1];
    return [x, y];
  }

  /**
   * Calcule un point sur une courbe de Bézier cubique
   */
  private cubicBezier(
    p0: [number, number], 
    p1: [number, number], 
    p2: [number, number], 
    p3: [number, number], 
    t: number
  ): [number, number] {
    const x = Math.pow(1 - t, 3) * p0[0] + 
              3 * Math.pow(1 - t, 2) * t * p1[0] + 
              3 * (1 - t) * Math.pow(t, 2) * p2[0] + 
              Math.pow(t, 3) * p3[0];
    const y = Math.pow(1 - t, 3) * p0[1] + 
              3 * Math.pow(1 - t, 2) * t * p1[1] + 
              3 * (1 - t) * Math.pow(t, 2) * p2[1] + 
              Math.pow(t, 3) * p3[1];
    return [x, y];
  }

  /**
   * Calcule l'arc pour un facteur bulge DSTV
   */
  private calculateBulgeArc(
    start: [number, number], 
    end: [number, number], 
    bulge: number
  ): [number, number] | null {
    if (Math.abs(bulge) < 0.001) return null;
    
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const chord = Math.sqrt(dx * dx + dy * dy);
    
    const sagitta = Math.abs(bulge) * chord / 2;
    
    // Direction perpendiculaire à la corde
    const perpX = -dy / chord;
    const perpY = dx / chord;
    
    const arcMidX = midX + sagitta * perpX * Math.sign(bulge);
    const arcMidY = midY + sagitta * perpY * Math.sign(bulge);
    
    return [arcMidX, arcMidY];
  }

  /**
   * Obtient la profondeur d'extrusion selon la face
   */
  private getExtrusionDepth(face: ProfileFace, dims: any): number {
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return dims.flangeThickness || 15;
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        return dims.webThickness || 10;
      default:
        return Math.max(dims.webThickness || 10, dims.flangeThickness || 15) + 50;
    }
  }

  /**
   * Applique les transformations selon la face
   */
  private applyFaceTransform(
    geometry: THREE.BufferGeometry,
    face: ProfileFace,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const matrix = new THREE.Matrix4();
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
        matrix.makeTranslation(0, dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        matrix.makeTranslation(0, -dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        // Rotation pour aligner avec l'âme
        matrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(matrix);
        break;
    }
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isUnrestrictedContour || params.isFreeform) {
      return CutType.UNRESTRICTED_CONTOUR;
    }
    
    if (params.dstvBlock === 'KO' || params.blockType === 'KO') {
      return CutType.CONTOUR_CUT;
    }
    
    return CutType.CONTOUR_CUT;
  }

  /**
   * Génère les métadonnées spécifiques
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element as any);
    const params = feature.parameters as any;
    const config = this.extractKontourConfig(params);
    const kontourType = this.detectKontourType(params);
    
    return {
      ...baseMetadata,
      handler: 'KontourHandler',
      kontourType,
      segmentCount: config.segments.length,
      isClosed: config.isClosed,
      hasArcs: config.segments.some(s => s.type === 'arc'),
      hasSplines: config.segments.some(s => s.type === 'spline' || s.type === 'bezier'),
      complexity: this.analyzeComplexity(
        config.segments.map(s => s.startPoint)
      ),
      tolerance: config.tolerance,
      smoothing: config.smoothing,
      subdivisions: config.subdivisions
    };
  }
}