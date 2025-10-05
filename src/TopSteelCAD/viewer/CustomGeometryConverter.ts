/**
 * Convertisseur de profils personnalisés vers géométrie THREE.js
 * Convertit Shape2D en THREE.ExtrudeGeometry
 */

import * as THREE from 'three';
import {
  CustomProfile,
  Shape2D,
  Contour2D,
  GeometrySegment,
  SegmentType,
  Point2D,
  ThreeJsConversionOptions,
  ThreeJsConversionResult
} from '../3DLibrary/types/custom-profile.types';

/**
 * Convertit un profil personnalisé en géométrie THREE.js
 */
export function convertCustomProfileToGeometry(
  profile: CustomProfile,
  length: number = 2000
): THREE.BufferGeometry {
  const options: ThreeJsConversionOptions = {
    length,
    scale: 1
  };

  const result = convertShape2DToGeometry(profile.shape, options);

  if (!result.success || !result.geometry) {
    throw new Error(`Failed to convert custom profile: ${result.errors?.join(', ')}`);
  }

  return result.geometry;
}

/**
 * Convertit une Shape2D en THREE.ExtrudeGeometry
 */
export function convertShape2DToGeometry(
  shape: Shape2D,
  options: ThreeJsConversionOptions
): ThreeJsConversionResult {
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    // Convertir le contour extérieur en THREE.Shape
    const threeShape = contourToThreeShape(shape.outerContour);

    // Ajouter les trous
    if (shape.holes && shape.holes.length > 0) {
      for (const hole of shape.holes) {
        const holePath = contourToThreePath(hole);
        threeShape.holes.push(holePath);
      }
    }

    // Options d'extrusion
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: options.length,
      bevelEnabled: false,
      curveSegments: 32
    };

    // Créer la géométrie extrudée
    const geometry = new THREE.ExtrudeGeometry(threeShape, extrudeSettings);

    // Centrer la géométrie sur l'origine
    geometry.center();

    // Rotation pour aligner avec l'axe Z (longueur)
    geometry.rotateX(Math.PI / 2);

    const conversionTime = performance.now() - startTime;

    return {
      geometry,
      shape: threeShape,
      success: true,
      stats: {
        vertexCount: geometry.attributes.position.count,
        faceCount: geometry.index ? geometry.index.count / 3 : 0,
        conversionTime
      }
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));

    return {
      geometry: null,
      shape: null,
      success: false,
      errors
    };
  }
}

/**
 * Convertit un Contour2D en THREE.Shape
 */
export function contourToThreeShape(contour: Contour2D): THREE.Shape {
  const shape = new THREE.Shape();

  if (contour.segments.length === 0) {
    return shape;
  }

  // Démarrer au premier point
  const firstPoint = getSegmentStartPoint(contour.segments[0]);
  shape.moveTo(firstPoint.x, firstPoint.y);

  // Ajouter tous les segments
  for (const segment of contour.segments) {
    addSegmentToShape(segment, shape);
  }

  return shape;
}

/**
 * Convertit un Contour2D en THREE.Path (pour les trous)
 */
export function contourToThreePath(contour: Contour2D): THREE.Path {
  const path = new THREE.Path();

  if (contour.segments.length === 0) {
    return path;
  }

  // Démarrer au premier point
  const firstPoint = getSegmentStartPoint(contour.segments[0]);
  path.moveTo(firstPoint.x, firstPoint.y);

  // Ajouter tous les segments
  for (const segment of contour.segments) {
    addSegmentToPath(segment, path);
  }

  return path;
}

/**
 * Ajoute un segment à une THREE.Shape
 */
function addSegmentToShape(segment: GeometrySegment, shape: THREE.Shape): void {
  switch (segment.type) {
    case SegmentType.LINE:
      shape.lineTo(segment.end.x, segment.end.y);
      break;

    case SegmentType.ARC: {
      const { center, radius, startAngle, endAngle, counterClockwise } = segment;
      shape.absarc(
        center.x,
        center.y,
        radius,
        startAngle,
        endAngle,
        counterClockwise !== false // THREE.js utilise counterClockwise par défaut
      );
      break;
    }

    case SegmentType.BEZIER_QUADRATIC: {
      const { control, end } = segment;
      shape.quadraticCurveTo(control.x, control.y, end.x, end.y);
      break;
    }

    case SegmentType.BEZIER_CUBIC: {
      const { control1, control2, end } = segment;
      shape.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
      break;
    }

    case SegmentType.ELLIPSE: {
      const { center, radiusX, radiusY, rotation, startAngle, endAngle, counterClockwise } = segment;
      shape.absellipse(
        center.x,
        center.y,
        radiusX,
        radiusY,
        startAngle,
        endAngle,
        counterClockwise !== false,
        rotation
      );
      break;
    }

    default:
      console.warn('Unknown segment type:', (segment as any).type);
  }
}

/**
 * Ajoute un segment à un THREE.Path
 */
function addSegmentToPath(segment: GeometrySegment, path: THREE.Path): void {
  switch (segment.type) {
    case SegmentType.LINE:
      path.lineTo(segment.end.x, segment.end.y);
      break;

    case SegmentType.ARC: {
      const { center, radius, startAngle, endAngle, counterClockwise } = segment;
      path.absarc(
        center.x,
        center.y,
        radius,
        startAngle,
        endAngle,
        counterClockwise !== false
      );
      break;
    }

    case SegmentType.BEZIER_QUADRATIC: {
      const { control, end } = segment;
      path.quadraticCurveTo(control.x, control.y, end.x, end.y);
      break;
    }

    case SegmentType.BEZIER_CUBIC: {
      const { control1, control2, end } = segment;
      path.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
      break;
    }

    case SegmentType.ELLIPSE: {
      const { center, radiusX, radiusY, rotation, startAngle, endAngle, counterClockwise } = segment;
      path.absellipse(
        center.x,
        center.y,
        radiusX,
        radiusY,
        startAngle,
        endAngle,
        counterClockwise !== false,
        rotation
      );
      break;
    }

    default:
      console.warn('Unknown segment type:', (segment as any).type);
  }
}

/**
 * Obtient le point de départ d'un segment
 */
function getSegmentStartPoint(segment: GeometrySegment): Point2D {
  switch (segment.type) {
    case SegmentType.LINE:
    case SegmentType.BEZIER_QUADRATIC:
    case SegmentType.BEZIER_CUBIC:
      return segment.start;

    case SegmentType.ARC: {
      const { center, radius, startAngle } = segment;
      return {
        x: center.x + radius * Math.cos(startAngle),
        y: center.y + radius * Math.sin(startAngle)
      };
    }

    case SegmentType.ELLIPSE: {
      const { center, radiusX, radiusY, rotation, startAngle } = segment;
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);
      const x0 = radiusX * Math.cos(startAngle);
      const y0 = radiusY * Math.sin(startAngle);

      return {
        x: center.x + x0 * cosRot - y0 * sinRot,
        y: center.y + x0 * sinRot + y0 * cosRot
      };
    }

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
    case SegmentType.BEZIER_QUADRATIC:
    case SegmentType.BEZIER_CUBIC:
      return segment.end;

    case SegmentType.ARC: {
      const { center, radius, endAngle } = segment;
      return {
        x: center.x + radius * Math.cos(endAngle),
        y: center.y + radius * Math.sin(endAngle)
      };
    }

    case SegmentType.ELLIPSE: {
      const { center, radiusX, radiusY, rotation, endAngle } = segment;
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);
      const x0 = radiusX * Math.cos(endAngle);
      const y0 = radiusY * Math.sin(endAngle);

      return {
        x: center.x + x0 * cosRot - y0 * sinRot,
        y: center.y + x0 * sinRot + y0 * cosRot
      };
    }

    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Crée une géométrie de prévisualisation 2D (lignes)
 */
export function createWireframePreview(shape: Shape2D): THREE.LineSegments {
  const points: THREE.Vector3[] = [];

  // Contour extérieur
  addContourToPoints(shape.outerContour, points);

  // Trous
  if (shape.holes) {
    for (const hole of shape.holes) {
      addContourToPoints(hole, points);
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });

  return new THREE.LineSegments(geometry, material);
}

/**
 * Ajoute les points d'un contour à un tableau de points
 */
function addContourToPoints(contour: Contour2D, points: THREE.Vector3[]): void {
  for (const segment of contour.segments) {
    const segmentPoints = discretizeSegment(segment, 12);

    for (let i = 0; i < segmentPoints.length - 1; i++) {
      points.push(
        new THREE.Vector3(segmentPoints[i].x, segmentPoints[i].y, 0),
        new THREE.Vector3(segmentPoints[i + 1].x, segmentPoints[i + 1].y, 0)
      );
    }
  }
}

/**
 * Discrétise un segment en points
 */
function discretizeSegment(segment: GeometrySegment, numPoints: number = 12): Point2D[] {
  switch (segment.type) {
    case SegmentType.LINE:
      return [segment.start, segment.end];

    case SegmentType.ARC: {
      const points: Point2D[] = [];
      const { center, radius, startAngle, endAngle } = segment;
      const angleRange = endAngle - startAngle;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const angle = startAngle + angleRange * t;
        points.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        });
      }
      return points;
    }

    case SegmentType.BEZIER_QUADRATIC: {
      const points: Point2D[] = [];
      const { start, control, end } = segment;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const mt = 1 - t;
        points.push({
          x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
          y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y
        });
      }
      return points;
    }

    case SegmentType.BEZIER_CUBIC: {
      const points: Point2D[] = [];
      const { start, control1, control2, end } = segment;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        points.push({
          x: mt3 * start.x + 3 * mt2 * t * control1.x + 3 * mt * t2 * control2.x + t3 * end.x,
          y: mt3 * start.y + 3 * mt2 * t * control1.y + 3 * mt * t2 * control2.y + t3 * end.y
        });
      }
      return points;
    }

    case SegmentType.ELLIPSE: {
      const points: Point2D[] = [];
      const { center, radiusX, radiusY, rotation, startAngle, endAngle } = segment;
      const angleRange = endAngle - startAngle;
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const angle = startAngle + angleRange * t;
        const x0 = radiusX * Math.cos(angle);
        const y0 = radiusY * Math.sin(angle);

        points.push({
          x: center.x + x0 * cosRot - y0 * sinRot,
          y: center.y + x0 * sinRot + y0 * cosRot
        });
      }
      return points;
    }

    default:
      return [];
  }
}
