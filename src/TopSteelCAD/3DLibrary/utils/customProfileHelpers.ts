/**
 * Fonctions utilitaires pour la création et manipulation de profils personnalisés
 * @module CustomProfileHelpers
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CustomProfile,
  Shape2D,
  Contour2D,
  GeometrySegment,
  SegmentType,
  Point2D,
  LineSegment,
  ArcSegment,
  CalculatedGeometryProperties,
  CreateCustomProfileParams,
  SimpleContourParams,
  ValidationResult,
  ValidationRules
} from '../types/custom-profile.types';

// ============================================================================
// CRÉATION DE PROFILS
// ============================================================================

/**
 * Crée un nouveau profil personnalisé avec les paramètres minimaux
 */
export function createCustomProfile(params: CreateCustomProfileParams): CustomProfile {
  const now = new Date().toISOString();

  // Calculer les propriétés géométriques
  const properties = calculateGeometryProperties(params.shape);

  // Calculer le poids si matériau fourni
  let weight: number | undefined;
  if (params.defaultMaterial) {
    weight = calculateWeight(properties.area, params.defaultMaterial.density);
  }

  // Calculer les dimensions de référence
  const referenceDimensions = calculateReferenceDimensions(params.shape);

  return {
    id: uuidv4(),
    name: params.name,
    designation: params.designation,
    description: params.description,
    profileType: 'CUSTOM',

    shape: params.shape,
    properties,
    weight,
    referenceDimensions,

    metadata: {
      author: params.author,
      organization: params.organization,
      createdAt: now,
      updatedAt: now,
      version: '1.0.0',
      tags: params.tags || [],
      category: 'Custom'
    },

    defaultMaterial: params.defaultMaterial,

    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      lastValidated: now
    },

    advanced: {
      editable: true,
      public: false
    }
  };
}

/**
 * Crée un contour simple (rectangle, cercle, polygone)
 */
export function createSimpleContour(params: SimpleContourParams): Contour2D {
  const segments: GeometrySegment[] = [];

  switch (params.type) {
    case 'rectangle':
      if (!params.width || !params.height) {
        throw new Error('Width and height required for rectangle');
      }
      segments.push(...createRectangleSegments(
        params.width,
        params.height,
        params.center || { x: 0, y: 0 }
      ));
      break;

    case 'circle':
      if (!params.radius) {
        throw new Error('Radius required for circle');
      }
      segments.push(createCircleSegment(
        params.radius,
        params.center || { x: 0, y: 0 }
      ));
      break;

    case 'polygon':
      if (!params.points || params.points.length < 3) {
        throw new Error('At least 3 points required for polygon');
      }
      segments.push(...createPolygonSegments(params.points));
      break;
  }

  return {
    id: uuidv4(),
    segments,
    closed: true,
    area: calculateContourArea(segments),
    perimeter: calculateContourPerimeter(segments)
  };
}

/**
 * Crée un profil en I personnalisé
 */
export function createCustomIProfile(
  height: number,
  flangeWidth: number,
  webThickness: number,
  flangeThickness: number,
  name?: string
): CustomProfile {
  const hw = flangeWidth / 2;
  const htw = webThickness / 2;
  const hh = height / 2;

  const segments: LineSegment[] = [
    { type: SegmentType.LINE, start: { x: -hw, y: -hh }, end: { x: hw, y: -hh } },
    { type: SegmentType.LINE, start: { x: hw, y: -hh }, end: { x: hw, y: -hh + flangeThickness } },
    { type: SegmentType.LINE, start: { x: hw, y: -hh + flangeThickness }, end: { x: htw, y: -hh + flangeThickness } },
    { type: SegmentType.LINE, start: { x: htw, y: -hh + flangeThickness }, end: { x: htw, y: hh - flangeThickness } },
    { type: SegmentType.LINE, start: { x: htw, y: hh - flangeThickness }, end: { x: hw, y: hh - flangeThickness } },
    { type: SegmentType.LINE, start: { x: hw, y: hh - flangeThickness }, end: { x: hw, y: hh } },
    { type: SegmentType.LINE, start: { x: hw, y: hh }, end: { x: -hw, y: hh } },
    { type: SegmentType.LINE, start: { x: -hw, y: hh }, end: { x: -hw, y: hh - flangeThickness } },
    { type: SegmentType.LINE, start: { x: -hw, y: hh - flangeThickness }, end: { x: -htw, y: hh - flangeThickness } },
    { type: SegmentType.LINE, start: { x: -htw, y: hh - flangeThickness }, end: { x: -htw, y: -hh + flangeThickness } },
    { type: SegmentType.LINE, start: { x: -htw, y: -hh + flangeThickness }, end: { x: -hw, y: -hh + flangeThickness } },
    { type: SegmentType.LINE, start: { x: -hw, y: -hh + flangeThickness }, end: { x: -hw, y: -hh } }
  ];

  const shape: Shape2D = {
    outerContour: {
      id: uuidv4(),
      segments,
      closed: true
    }
  };

  return createCustomProfile({
    name: name || `Custom I-Profile ${height}x${flangeWidth}`,
    designation: `CUSTOM-I-${height}x${flangeWidth}`,
    description: `Custom I-profile: height=${height}mm, flange width=${flangeWidth}mm, web=${webThickness}mm, flange=${flangeThickness}mm`,
    shape,
    defaultMaterial: {
      grade: 'S355',
      density: 7.85,
      yieldStrength: 355,
      tensileStrength: 510
    }
  });
}

/**
 * Crée un profil en T personnalisé
 */
export function createCustomTProfile(
  height: number,
  flangeWidth: number,
  webThickness: number,
  flangeThickness: number,
  name?: string
): CustomProfile {
  const hw = flangeWidth / 2;
  const htw = webThickness / 2;

  const segments: LineSegment[] = [
    { type: SegmentType.LINE, start: { x: -hw, y: 0 }, end: { x: hw, y: 0 } },
    { type: SegmentType.LINE, start: { x: hw, y: 0 }, end: { x: hw, y: flangeThickness } },
    { type: SegmentType.LINE, start: { x: hw, y: flangeThickness }, end: { x: htw, y: flangeThickness } },
    { type: SegmentType.LINE, start: { x: htw, y: flangeThickness }, end: { x: htw, y: height } },
    { type: SegmentType.LINE, start: { x: htw, y: height }, end: { x: -htw, y: height } },
    { type: SegmentType.LINE, start: { x: -htw, y: height }, end: { x: -htw, y: flangeThickness } },
    { type: SegmentType.LINE, start: { x: -htw, y: flangeThickness }, end: { x: -hw, y: flangeThickness } },
    { type: SegmentType.LINE, start: { x: -hw, y: flangeThickness }, end: { x: -hw, y: 0 } }
  ];

  const shape: Shape2D = {
    outerContour: {
      id: uuidv4(),
      segments,
      closed: true
    }
  };

  return createCustomProfile({
    name: name || `Custom T-Profile ${height}x${flangeWidth}`,
    designation: `CUSTOM-T-${height}x${flangeWidth}`,
    description: `Custom T-profile: height=${height}mm, flange width=${flangeWidth}mm, web=${webThickness}mm, flange=${flangeThickness}mm`,
    shape,
    defaultMaterial: {
      grade: 'S355',
      density: 7.85
    }
  });
}

// ============================================================================
// CALCULS GÉOMÉTRIQUES
// ============================================================================

/**
 * Calcule toutes les propriétés géométriques d'une forme 2D
 */
export function calculateGeometryProperties(shape: Shape2D): CalculatedGeometryProperties {
  // Aire nette (contour extérieur - trous)
  const outerArea = calculateContourArea(shape.outerContour.segments);
  let netArea = outerArea;

  if (shape.holes) {
    for (const hole of shape.holes) {
      netArea -= calculateContourArea(hole.segments);
    }
  }

  // Convertir mm² en cm²
  const areaInCm2 = netArea / 100;

  // Périmètre (uniquement contour extérieur)
  const perimeter = calculateContourPerimeter(shape.outerContour.segments);

  // Centre de gravité (simplifié - uniquement contour extérieur)
  const centroid = calculateCentroid(shape.outerContour.segments);

  return {
    area: areaInCm2,
    perimeter,
    centroid
    // inertia, radiusOfGyration, elasticModulus peuvent être ajoutés si nécessaires
  };
}

/**
 * Calcule l'aire d'un contour (formule de Shoelace)
 */
export function calculateContourArea(segments: GeometrySegment[]): number {
  const points = discretizeSegments(segments);

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2; // mm²
}

/**
 * Calcule le périmètre d'un contour
 */
export function calculateContourPerimeter(segments: GeometrySegment[]): number {
  let perimeter = 0;

  for (const segment of segments) {
    perimeter += calculateSegmentLength(segment);
  }

  return perimeter;
}

/**
 * Calcule la longueur d'un segment
 */
export function calculateSegmentLength(segment: GeometrySegment): number {
  switch (segment.type) {
    case SegmentType.LINE:
      return distance(segment.start, segment.end);

    case SegmentType.ARC:
      const arcAngle = normalizeAngle(segment.endAngle - segment.startAngle);
      return Math.abs(segment.radius * arcAngle);

    case SegmentType.BEZIER_QUADRATIC:
    case SegmentType.BEZIER_CUBIC:
      // Approximation par discrétisation
      const points = discretizeBezier(segment, 20);
      let length = 0;
      for (let i = 0; i < points.length - 1; i++) {
        length += distance(points[i], points[i + 1]);
      }
      return length;

    case SegmentType.ELLIPSE:
      // Approximation (formule de Ramanujan pour ellipse)
      const ellipseAngle = normalizeAngle(segment.endAngle - segment.startAngle);
      const h = Math.pow((segment.radiusX - segment.radiusY), 2) / Math.pow((segment.radiusX + segment.radiusY), 2);
      const circumference = Math.PI * (segment.radiusX + segment.radiusY) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
      return circumference * Math.abs(ellipseAngle) / (2 * Math.PI);

    default:
      return 0;
  }
}

/**
 * Calcule le centre de gravité d'un contour
 */
export function calculateCentroid(segments: GeometrySegment[]): Point2D {
  const points = discretizeSegments(segments);
  const area = calculateContourArea(segments);

  if (area === 0) return { x: 0, y: 0 };

  let cx = 0, cy = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }

  const factor = 1 / (6 * area);
  return {
    x: cx * factor,
    y: cy * factor
  };
}

/**
 * Calcule le poids linéique (kg/m)
 */
export function calculateWeight(areaCm2: number, densityKgDm3: number): number {
  return (areaCm2 * densityKgDm3) / 100;
}

/**
 * Calcule les dimensions de référence (bounding box)
 */
export function calculateReferenceDimensions(shape: Shape2D): {
  height: number;
  width: number;
  thickness?: number;
} {
  const bbox = calculateBoundingBox(shape);

  return {
    height: bbox.maxY - bbox.minY,
    width: bbox.maxX - bbox.minX
  };
}

/**
 * Calcule la bounding box d'une forme
 */
export function calculateBoundingBox(shape: Shape2D): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const points = discretizeSegments(shape.outerContour.segments);

  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, maxX, minY, maxY };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Valide un profil personnalisé selon des règles données
 */
export function validateCustomProfile(
  profile: CustomProfile,
  rules?: ValidationRules
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // Validation de base
  if (!profile.id || profile.id.trim() === '') {
    errors.push({ code: 'MISSING_ID', message: 'Profile ID is required' });
  }

  if (!profile.name || profile.name.trim() === '') {
    errors.push({ code: 'MISSING_NAME', message: 'Profile name is required' });
  }

  if (!profile.designation || profile.designation.trim() === '') {
    errors.push({ code: 'MISSING_DESIGNATION', message: 'Profile designation is required' });
  }

  // Validation de la forme
  if (!profile.shape || !profile.shape.outerContour) {
    errors.push({ code: 'MISSING_SHAPE', message: 'Profile shape is required' });
    return { isValid: false, errors, warnings };
  }

  // Vérifier que le contour est fermé
  if (rules?.requireClosed !== false) {
    if (!isContourClosed(profile.shape.outerContour)) {
      errors.push({
        code: 'CONTOUR_NOT_CLOSED',
        message: 'Outer contour must be closed',
        field: 'shape.outerContour'
      });
    }
  }

  // Validation des segments
  if (profile.shape.outerContour.segments.length === 0) {
    errors.push({
      code: 'NO_SEGMENTS',
      message: 'Outer contour must have at least one segment',
      field: 'shape.outerContour.segments'
    });
  }

  if (rules?.maxSegments && profile.shape.outerContour.segments.length > rules.maxSegments) {
    warnings.push({
      code: 'TOO_MANY_SEGMENTS',
      message: `Contour has ${profile.shape.outerContour.segments.length} segments (max recommended: ${rules.maxSegments})`,
      field: 'shape.outerContour.segments'
    });
  }

  // Validation de l'aire
  if (profile.properties.area <= 0) {
    errors.push({
      code: 'INVALID_AREA',
      message: 'Profile area must be positive',
      field: 'properties.area'
    });
  }

  if (rules?.minArea && profile.properties.area < rules.minArea) {
    errors.push({
      code: 'AREA_TOO_SMALL',
      message: `Profile area (${profile.properties.area} cm²) is below minimum (${rules.minArea} cm²)`,
      field: 'properties.area'
    });
  }

  if (rules?.maxArea && profile.properties.area > rules.maxArea) {
    errors.push({
      code: 'AREA_TOO_LARGE',
      message: `Profile area (${profile.properties.area} cm²) exceeds maximum (${rules.maxArea} cm²)`,
      field: 'properties.area'
    });
  }

  // Validation du périmètre
  if (rules?.minPerimeter && profile.properties.perimeter < rules.minPerimeter) {
    warnings.push({
      code: 'PERIMETER_TOO_SMALL',
      message: `Profile perimeter (${profile.properties.perimeter} mm) is below recommended minimum (${rules.minPerimeter} mm)`,
      field: 'properties.perimeter'
    });
  }

  // Validation des trous
  if (rules?.validateHoles !== false && profile.shape.holes) {
    for (let i = 0; i < profile.shape.holes.length; i++) {
      const hole = profile.shape.holes[i];

      if (!isContourClosed(hole)) {
        errors.push({
          code: 'HOLE_NOT_CLOSED',
          message: `Hole ${i} is not closed`,
          field: `shape.holes[${i}]`
        });
      }

      // Vérifier que le trou est à l'intérieur (simplifié)
      const holeCentroid = calculateCentroid(hole.segments);
      const outerPoints = discretizeSegments(profile.shape.outerContour.segments);

      if (!isPointInsidePolygon(holeCentroid, outerPoints)) {
        errors.push({
          code: 'HOLE_OUTSIDE_CONTOUR',
          message: `Hole ${i} is not inside the outer contour`,
          field: `shape.holes[${i}]`
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Vérifie si un contour est fermé
 */
export function isContourClosed(contour: Contour2D, tolerance: number = 0.01): boolean {
  if (contour.segments.length === 0) return false;

  const firstPoint = getSegmentStartPoint(contour.segments[0]);
  const lastPoint = getSegmentEndPoint(contour.segments[contour.segments.length - 1]);

  return distance(firstPoint, lastPoint) < tolerance;
}

// ============================================================================
// HELPERS PRIVÉS
// ============================================================================

/**
 * Crée les segments pour un rectangle
 */
function createRectangleSegments(width: number, height: number, center: Point2D): LineSegment[] {
  const hw = width / 2;
  const hh = height / 2;
  const cx = center.x;
  const cy = center.y;

  return [
    { type: SegmentType.LINE, start: { x: cx - hw, y: cy - hh }, end: { x: cx + hw, y: cy - hh } },
    { type: SegmentType.LINE, start: { x: cx + hw, y: cy - hh }, end: { x: cx + hw, y: cy + hh } },
    { type: SegmentType.LINE, start: { x: cx + hw, y: cy + hh }, end: { x: cx - hw, y: cy + hh } },
    { type: SegmentType.LINE, start: { x: cx - hw, y: cy + hh }, end: { x: cx - hw, y: cy - hh } }
  ];
}

/**
 * Crée un segment de cercle complet
 */
function createCircleSegment(radius: number, center: Point2D): ArcSegment {
  return {
    type: SegmentType.ARC,
    center,
    radius,
    startAngle: 0,
    endAngle: 2 * Math.PI,
    counterClockwise: false
  };
}

/**
 * Crée les segments pour un polygone
 */
function createPolygonSegments(points: Point2D[]): LineSegment[] {
  const segments: LineSegment[] = [];

  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    segments.push({ type: SegmentType.LINE, start, end });
  }

  return segments;
}

/**
 * Discrétise un tableau de segments en points
 */
function discretizeSegments(segments: GeometrySegment[], pointsPerCurve: number = 20): Point2D[] {
  const allPoints: Point2D[] = [];

  for (const segment of segments) {
    const points = discretizeSegment(segment, pointsPerCurve);
    // Éviter les doublons au point de jonction
    if (allPoints.length > 0) {
      points.shift();
    }
    allPoints.push(...points);
  }

  return allPoints;
}

/**
 * Discrétise un segment en points
 */
function discretizeSegment(segment: GeometrySegment, numPoints: number = 20): Point2D[] {
  switch (segment.type) {
    case SegmentType.LINE:
      return [segment.start, segment.end];

    case SegmentType.ARC:
      return discretizeArc(segment, numPoints);

    case SegmentType.BEZIER_QUADRATIC:
    case SegmentType.BEZIER_CUBIC:
      return discretizeBezier(segment, numPoints);

    case SegmentType.ELLIPSE:
      return discretizeEllipse(segment, numPoints);

    default:
      return [];
  }
}

/**
 * Discrétise un arc
 */
function discretizeArc(arc: ArcSegment, numPoints: number): Point2D[] {
  const points: Point2D[] = [];
  const angleRange = normalizeAngle(arc.endAngle - arc.startAngle);

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const angle = arc.startAngle + angleRange * t;
    points.push({
      x: arc.center.x + arc.radius * Math.cos(angle),
      y: arc.center.y + arc.radius * Math.sin(angle)
    });
  }

  return points;
}

/**
 * Discrétise une courbe de Bézier
 */
function discretizeBezier(bezier: any, numPoints: number): Point2D[] {
  const points: Point2D[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    let point: Point2D;

    if (bezier.type === SegmentType.BEZIER_QUADRATIC) {
      point = evaluateQuadraticBezier(bezier.start, bezier.control, bezier.end, t);
    } else {
      point = evaluateCubicBezier(bezier.start, bezier.control1, bezier.control2, bezier.end, t);
    }

    points.push(point);
  }

  return points;
}

/**
 * Discrétise une ellipse
 */
function discretizeEllipse(ellipse: any, numPoints: number): Point2D[] {
  const points: Point2D[] = [];
  const angleRange = normalizeAngle(ellipse.endAngle - ellipse.startAngle);

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const angle = ellipse.startAngle + angleRange * t;

    // Point sur ellipse (avant rotation)
    const x0 = ellipse.radiusX * Math.cos(angle);
    const y0 = ellipse.radiusY * Math.sin(angle);

    // Rotation
    const cosR = Math.cos(ellipse.rotation);
    const sinR = Math.sin(ellipse.rotation);
    const x = x0 * cosR - y0 * sinR + ellipse.center.x;
    const y = x0 * sinR + y0 * cosR + ellipse.center.y;

    points.push({ x, y });
  }

  return points;
}

/**
 * Évalue une courbe de Bézier quadratique au paramètre t
 */
function evaluateQuadraticBezier(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

/**
 * Évalue une courbe de Bézier cubique au paramètre t
 */
function evaluateCubicBezier(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

/**
 * Distance euclidienne entre deux points
 */
function distance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Normalise un angle en radians dans [0, 2π]
 */
function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle > 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

/**
 * Obtient le point de départ d'un segment
 */
function getSegmentStartPoint(segment: GeometrySegment): Point2D {
  switch (segment.type) {
    case SegmentType.LINE:
      return segment.start;
    case SegmentType.ARC:
      return {
        x: segment.center.x + segment.radius * Math.cos(segment.startAngle),
        y: segment.center.y + segment.radius * Math.sin(segment.startAngle)
      };
    case SegmentType.BEZIER_QUADRATIC:
    case SegmentType.BEZIER_CUBIC:
      return segment.start;
    case SegmentType.ELLIPSE:
      const cosR = Math.cos(segment.rotation);
      const sinR = Math.sin(segment.rotation);
      const x0 = segment.radiusX * Math.cos(segment.startAngle);
      const y0 = segment.radiusY * Math.sin(segment.startAngle);
      return {
        x: x0 * cosR - y0 * sinR + segment.center.x,
        y: x0 * sinR + y0 * cosR + segment.center.y
      };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Obtient le point de fin d'un segment
 */
function getSegmentEndPoint(segment: GeometrySegment): Point2D {
  switch (segment.type) {
    case SegmentType.LINE:
      return segment.end;
    case SegmentType.ARC:
      return {
        x: segment.center.x + segment.radius * Math.cos(segment.endAngle),
        y: segment.center.y + segment.radius * Math.sin(segment.endAngle)
      };
    case SegmentType.BEZIER_QUADRATIC:
    case SegmentType.BEZIER_CUBIC:
      return segment.end;
    case SegmentType.ELLIPSE:
      const cosR = Math.cos(segment.rotation);
      const sinR = Math.sin(segment.rotation);
      const x0 = segment.radiusX * Math.cos(segment.endAngle);
      const y0 = segment.radiusY * Math.sin(segment.endAngle);
      return {
        x: x0 * cosR - y0 * sinR + segment.center.x,
        y: x0 * sinR + y0 * cosR + segment.center.y
      };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Vérifie si un point est à l'intérieur d'un polygone (ray casting)
 */
function isPointInsidePolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}
