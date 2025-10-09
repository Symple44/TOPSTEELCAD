/**
 * Moteur de calepinage avancé pour surfaces complexes
 * Building Estimator - TopSteelCAD
 *
 * Gère :
 * - Surfaces non rectangulaires (pignons avec pente)
 * - Obstacles (ouvertures : portes, fenêtres)
 * - Zones non couvrables
 * - Découpage automatique en zones calepinables
 */

import {
  LayoutElement,
  LayoutConstraints,
  LayoutOptions,
  LayoutResult,
  ElementPosition,
  calculateOptimalLayout,
  calculateElementPositions
} from './genericLayoutEngine';

/**
 * Point 2D (coordonnées en mm)
 */
export interface Point2D {
  x: number;
  z: number;
}

/**
 * Rectangle orienté (AABB - Axis-Aligned Bounding Box)
 */
export interface Rectangle {
  x: number;        // Position X du coin inférieur gauche
  z: number;        // Position Z du coin inférieur gauche
  width: number;    // Largeur (direction X)
  height: number;   // Hauteur (direction Z)
}

/**
 * Obstacle (ouverture, zone technique, etc.)
 */
export interface Obstacle {
  id: string;
  type: 'opening' | 'technical' | 'exclusion';
  bounds: Rectangle;
  margin?: number;  // Marge de sécurité autour de l'obstacle (mm)
}

/**
 * Polygone convexe ou concave
 */
export interface Polygon {
  points: Point2D[];
  isConvex?: boolean;
}

/**
 * Surface à calepin (peut être non rectangulaire)
 */
export interface LayoutSurface {
  id: string;
  type: 'rectangular' | 'triangular' | 'trapezoidal' | 'polygonal' | 'gable';

  // Pour surfaces simples
  bounds?: Rectangle;

  // Pour surfaces complexes (pignons, etc.)
  polygon?: Polygon;

  // Obstacles à éviter
  obstacles?: Obstacle[];

  // Pente (pour toitures, pignons)
  slope?: number;  // Pente en degrés ou %
  slopeDirection?: 'horizontal' | 'vertical' | 'diagonal';
}

/**
 * Zone calepinabale rectangulaire (résultat du découpage)
 */
export interface LayoutZone {
  id: string;
  bounds: Rectangle;
  surface: LayoutSurface;  // Référence à la surface parente

  // Résultat du calepinage pour cette zone
  layout?: LayoutResult;
  elements?: ElementPosition[];
}

/**
 * Résultat du calepinage avancé multi-zones
 */
export interface AdvancedLayoutResult {
  zones: LayoutZone[];
  totalElements: number;
  totalArea: number;          // Surface totale couverte (m²)
  coverageRatio: number;      // Taux de couverture global (%)
  totalPower?: number;        // Puissance totale (W) si applicable
  totalWeight?: number;       // Poids total (kg) si applicable
}

/**
 * Découpe une surface en zones rectangulaires calepinables
 * en évitant les obstacles
 *
 * @param surface - Surface à découper
 * @returns Liste de zones rectangulaires sans obstacles
 */
export function partitionSurfaceIntoZones(surface: LayoutSurface): LayoutZone[] {
  const zones: LayoutZone[] = [];

  // Cas simple : surface rectangulaire sans obstacles
  if (surface.type === 'rectangular' && (!surface.obstacles || surface.obstacles.length === 0)) {
    zones.push({
      id: `${surface.id}_zone_0`,
      bounds: surface.bounds!,
      surface
    });
    return zones;
  }

  // Cas surface rectangulaire avec obstacles
  if (surface.type === 'rectangular' && surface.obstacles && surface.obstacles.length > 0) {
    return partitionRectangleWithObstacles(surface);
  }

  // Cas pignon triangulaire/trapézoïdal
  if (surface.type === 'gable' || surface.type === 'triangular' || surface.type === 'trapezoidal') {
    return partitionGableSurface(surface);
  }

  // Cas polygonal complexe
  if (surface.type === 'polygonal' && surface.polygon) {
    return partitionPolygonalSurface(surface);
  }

  return zones;
}

/**
 * Découpe un rectangle en zones en évitant les obstacles
 * Algorithme de découpage par guillotine
 */
function partitionRectangleWithObstacles(surface: LayoutSurface): LayoutZone[] {
  const zones: LayoutZone[] = [];
  const bounds = surface.bounds!;
  const obstacles = surface.obstacles || [];

  // Trier les obstacles par position (de gauche à droite, de bas en haut)
  const sortedObstacles = [...obstacles].sort((a, b) => {
    if (Math.abs(a.bounds.z - b.bounds.z) < 10) {
      return a.bounds.x - b.bounds.x;
    }
    return a.bounds.z - b.bounds.z;
  });

  // Liste de rectangles à traiter (commence avec la surface complète)
  const rectanglesToProcess: Rectangle[] = [bounds];
  const processedZones: Rectangle[] = [];

  // Pour chaque obstacle, découper les rectangles existants
  for (const obstacle of sortedObstacles) {
    const obstacleRect = {
      ...obstacle.bounds,
      // Agrandir l'obstacle avec la marge
      x: obstacle.bounds.x - (obstacle.margin || 0),
      z: obstacle.bounds.z - (obstacle.margin || 0),
      width: obstacle.bounds.width + 2 * (obstacle.margin || 0),
      height: obstacle.bounds.height + 2 * (obstacle.margin || 0)
    };

    const newRectangles: Rectangle[] = [];

    for (const rect of rectanglesToProcess) {
      // Vérifier si l'obstacle intersecte ce rectangle
      if (!rectanglesIntersect(rect, obstacleRect)) {
        // Pas d'intersection : garder le rectangle tel quel
        newRectangles.push(rect);
        continue;
      }

      // L'obstacle intersecte : découper le rectangle en sous-rectangles
      const subRects = splitRectangleAroundObstacle(rect, obstacleRect);
      newRectangles.push(...subRects);
    }

    rectanglesToProcess.length = 0;
    rectanglesToProcess.push(...newRectangles);
  }

  // Convertir les rectangles en zones
  processedZones.push(...rectanglesToProcess);

  return processedZones.map((rect, index) => ({
    id: `${surface.id}_zone_${index}`,
    bounds: rect,
    surface
  }));
}

/**
 * Vérifie si deux rectangles se chevauchent
 */
function rectanglesIntersect(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect2.x + rect2.width <= rect1.x ||
    rect1.z + rect1.height <= rect2.z ||
    rect2.z + rect2.height <= rect1.z
  );
}

/**
 * Découpe un rectangle autour d'un obstacle (guillotine cut)
 * Retourne jusqu'à 4 sous-rectangles
 */
function splitRectangleAroundObstacle(rect: Rectangle, obstacle: Rectangle): Rectangle[] {
  const subRects: Rectangle[] = [];

  // Rectangle GAUCHE de l'obstacle
  if (obstacle.x > rect.x) {
    subRects.push({
      x: rect.x,
      z: rect.z,
      width: obstacle.x - rect.x,
      height: rect.height
    });
  }

  // Rectangle DROIT de l'obstacle
  if (obstacle.x + obstacle.width < rect.x + rect.width) {
    subRects.push({
      x: obstacle.x + obstacle.width,
      z: rect.z,
      width: (rect.x + rect.width) - (obstacle.x + obstacle.width),
      height: rect.height
    });
  }

  // Rectangle BAS de l'obstacle
  if (obstacle.z > rect.z) {
    const leftX = Math.max(rect.x, obstacle.x);
    const rightX = Math.min(rect.x + rect.width, obstacle.x + obstacle.width);

    if (rightX > leftX) {
      subRects.push({
        x: leftX,
        z: rect.z,
        width: rightX - leftX,
        height: obstacle.z - rect.z
      });
    }
  }

  // Rectangle HAUT de l'obstacle
  if (obstacle.z + obstacle.height < rect.z + rect.height) {
    const leftX = Math.max(rect.x, obstacle.x);
    const rightX = Math.min(rect.x + rect.width, obstacle.x + obstacle.width);

    if (rightX > leftX) {
      subRects.push({
        x: leftX,
        z: obstacle.z + obstacle.height,
        width: rightX - leftX,
        height: (rect.z + rect.height) - (obstacle.z + obstacle.height)
      });
    }
  }

  // Filtrer les rectangles trop petits (< 100mm)
  return subRects.filter(r => r.width >= 100 && r.height >= 100);
}

/**
 * Découpe une surface de pignon (triangulaire/trapézoïdale)
 * en bandes horizontales rectangulaires
 */
function partitionGableSurface(surface: LayoutSurface): LayoutZone[] {
  const zones: LayoutZone[] = [];

  if (!surface.polygon || surface.polygon.points.length < 3) {
    return zones;
  }

  const points = surface.polygon.points;

  // Trouver les limites Y (hauteur du pignon)
  const minZ = Math.min(...points.map(p => p.z));
  const maxZ = Math.max(...points.map(p => p.z));
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));

  // Découper en bandes horizontales de hauteur fixe (ex: 1000mm)
  const bandHeight = 1000;
  const numBands = Math.ceil((maxZ - minZ) / bandHeight);

  for (let i = 0; i < numBands; i++) {
    const bandMinZ = minZ + i * bandHeight;
    const bandMaxZ = Math.min(minZ + (i + 1) * bandHeight, maxZ);

    // Calculer la largeur disponible à cette hauteur
    // (dépend de la pente du pignon)
    const widthAtMinZ = calculateGableWidthAtHeight(surface, bandMinZ);
    const widthAtMaxZ = calculateGableWidthAtHeight(surface, bandMaxZ);

    // Utiliser la largeur minimale pour garantir que le rectangle reste dans le pignon
    const bandWidth = Math.min(widthAtMinZ, widthAtMaxZ);

    if (bandWidth < 100) continue; // Trop petit

    const bandCenterX = (minX + maxX) / 2;

    zones.push({
      id: `${surface.id}_gable_band_${i}`,
      bounds: {
        x: bandCenterX - bandWidth / 2,
        z: bandMinZ,
        width: bandWidth,
        height: bandMaxZ - bandMinZ
      },
      surface
    });
  }

  return zones;
}

/**
 * Calcule la largeur disponible dans un pignon à une hauteur donnée
 */
function calculateGableWidthAtHeight(surface: LayoutSurface, z: number): number {
  if (!surface.polygon) return 0;

  const points = surface.polygon.points;

  // Trouver les intersections du pignon avec une ligne horizontale à hauteur Z
  const intersections: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    // Vérifier si le segment traverse la hauteur Z
    if ((p1.z <= z && p2.z >= z) || (p1.z >= z && p2.z <= z)) {
      // Interpoler pour trouver X à cette hauteur
      const t = (z - p1.z) / (p2.z - p1.z);
      const x = p1.x + t * (p2.x - p1.x);
      intersections.push(x);
    }
  }

  if (intersections.length < 2) return 0;

  // Trier les intersections
  intersections.sort((a, b) => a - b);

  // La largeur est la distance entre la première et dernière intersection
  return intersections[intersections.length - 1] - intersections[0];
}

/**
 * Découpe une surface polygonale complexe
 * (pour l'instant, approximation par bounding box)
 */
function partitionPolygonalSurface(surface: LayoutSurface): LayoutZone[] {
  const zones: LayoutZone[] = [];

  if (!surface.polygon) return zones;

  // Pour l'instant, approximation simple par la bounding box
  const points = surface.polygon.points;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minZ = Math.min(...points.map(p => p.z));
  const maxZ = Math.max(...points.map(p => p.z));

  zones.push({
    id: `${surface.id}_zone_0`,
    bounds: {
      x: minX,
      z: minZ,
      width: maxX - minX,
      height: maxZ - minZ
    },
    surface
  });

  return zones;
}

/**
 * Calcule le calepinage avancé sur une ou plusieurs surfaces
 * avec gestion des formes complexes et obstacles
 *
 * @param surfaces - Liste des surfaces à calepin
 * @param element - Élément à disposer
 * @param constraints - Contraintes de disposition
 * @param options - Options de calcul
 * @returns Résultat du calepinage multi-zones
 */
export function calculateAdvancedLayout(
  surfaces: LayoutSurface[],
  element: LayoutElement,
  constraints: LayoutConstraints,
  options: LayoutOptions = {}
): AdvancedLayoutResult {
  const allZones: LayoutZone[] = [];
  let totalElements = 0;
  let totalArea = 0;
  let totalPower = 0;
  let totalWeight = 0;

  // Pour chaque surface, découper en zones et calculer le calepinage
  for (const surface of surfaces) {
    const zones = partitionSurfaceIntoZones(surface);

    for (const zone of zones) {
      // Calculer le calepinage pour cette zone
      const layout = calculateOptimalLayout(
        zone.bounds.width,
        zone.bounds.height,
        element,
        constraints,
        options
      );

      if (layout.totalElements > 0) {
        // Calculer les positions des éléments dans cette zone
        const elements = calculateElementPositions(layout, element);

        // Translater les positions dans le référentiel global
        const translatedElements = elements.map(el => ({
          ...el,
          x: el.x + zone.bounds.x,
          z: el.z + zone.bounds.z
        }));

        zone.layout = layout;
        zone.elements = translatedElements;

        totalElements += layout.totalElements;
        totalArea += (layout.totalElements * element.width * element.height) / 1_000_000;

        if (element.weight) {
          totalWeight += layout.totalWeight || 0;
        }
      }

      allZones.push(zone);
    }
  }

  // Calculer le taux de couverture global
  const totalAvailableArea = surfaces.reduce((sum, surface) => {
    if (surface.bounds) {
      return sum + (surface.bounds.width * surface.bounds.height) / 1_000_000;
    }
    return sum;
  }, 0);

  const coverageRatio = totalAvailableArea > 0 ? (totalArea / totalAvailableArea) * 100 : 0;

  return {
    zones: allZones,
    totalElements,
    totalArea,
    coverageRatio,
    totalWeight: element.weight ? totalWeight : undefined
  };
}

/**
 * Convertit une liste d'ouvertures en obstacles pour le calepinage
 */
export function openingsToObstacles(
  openings: Array<{
    id: string;
    position: { x: number; z: number };
    dimensions: { width: number; height: number };
  }>,
  margin: number = 100
): Obstacle[] {
  return openings.map(opening => ({
    id: opening.id,
    type: 'opening' as const,
    bounds: {
      x: opening.position.x - opening.dimensions.width / 2,
      z: opening.position.z,
      width: opening.dimensions.width,
      height: opening.dimensions.height
    },
    margin
  }));
}

/**
 * Crée une surface de pignon à partir des dimensions du bâtiment
 */
export function createGableSurface(
  id: string,
  side: 'left' | 'right',
  buildingWidth: number,
  wallHeight: number,
  ridgeHeight: number
): LayoutSurface {
  // Pignon = triangle ou trapèze
  const points: Point2D[] = [
    { x: 0, z: 0 },                           // Bas gauche
    { x: buildingWidth, z: 0 },                // Bas droit
    { x: buildingWidth, z: wallHeight },       // Haut droit mur
    { x: buildingWidth / 2, z: ridgeHeight },  // Faîtage
    { x: 0, z: wallHeight }                    // Haut gauche mur
  ];

  return {
    id,
    type: 'gable',
    polygon: { points },
    obstacles: []
  };
}
