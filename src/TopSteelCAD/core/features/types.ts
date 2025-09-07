/**
 * Types et interfaces pour le système de features
 */

import * as THREE from 'three';
// Import temporairement commenté pour éviter problème d'alias
// import { PivotElement } from '@/types/viewer';

// Interface stub temporaire
interface PivotElement {
  id: string;
  dimensions?: any;
  [key: string]: any;
}

/**
 * Types de features supportées
 */
export enum FeatureType {
  // Trous et perçages
  HOLE = 'hole',
  TAPPED_HOLE = 'tapped_hole',
  COUNTERSINK = 'countersink',
  COUNTERBORE = 'counterbore',
  DRILL_PATTERN = 'drill_pattern',
  THREAD = 'thread',
  
  // Découpes et contours
  CUT = 'cut',
  SLOT = 'slot',
  CUTOUT = 'cutout',
  CONTOUR = 'contour',
  UNRESTRICTED_CONTOUR = 'unrestricted_contour',
  NOTCH = 'notch',
  COPING = 'coping',
  END_CUT = 'end_cut',
  
  // Finitions et déformations
  CHAMFER = 'chamfer',
  BEVEL = 'bevel',
  BEND = 'bend',
  
  // Profils
  PROFILE = 'profile',
  
  // Marquages et textes
  MARKING = 'marking',
  TEXT = 'text',
  
  // Soudures
  WELD = 'weld',
  WELD_PREP = 'weld_preparation',
  
  // Autres
  PUNCH = 'punch',
  WORK_PLANE = 'work_plane',
  INFORMATION = 'information',
  
  // Blocs DSTV avancés pour 100% conformité
  VOLUME = 'volume',
  NUMERIC_CONTROL = 'numeric_control',
  FREE_PROGRAM = 'free_program',
  LINE_PROGRAM = 'line_program',
  ROTATION = 'rotation',
  WASHING = 'washing',
  GROUP = 'group',
  VARIABLE = 'variable'
}

/**
 * Système de coordonnées pour les features
 */
export enum CoordinateSystem {
  LOCAL = 'local',    // Relatif à l'élément
  GLOBAL = 'global',  // Relatif à la scène
  FACE = 'face',      // Relatif à une face spécifique
  DSTV = 'DSTV',      // Système de coordonnées DSTV
  STANDARD = 'standard' // Système de coordonnées standard unifié
}

/**
 * Face d'un profil métallique
 */
export enum ProfileFace {
  WEB = 'web',
  TOP_FLANGE = 'top_flange',
  BOTTOM_FLANGE = 'bottom_flange',
  LEFT_LEG = 'left_leg',
  RIGHT_LEG = 'right_leg',
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  FRONT = 'front',
  BACK = 'back'
}

/**
 * Interface de base pour une feature
 */
export interface Feature {
  id: string;
  type: FeatureType;
  coordinateSystem: CoordinateSystem;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  face?: ProfileFace;
  parameters: FeatureParameters;
  metadata?: Record<string, unknown>;
}

/**
 * Paramètres spécifiques selon le type de feature
 */
export interface FeatureParameters {
  // Pour trous standards
  diameter?: number;
  depth?: number;
  holeType?: 'round' | 'slotted' | 'square' | 'rectangular';
  
  // Pour trous oblongs (slotted holes)
  slottedLength?: number;  // Longueur d'élongation
  slottedAngle?: number;   // Angle d'orientation en degrés
  
  // Pour trous rectangulaires/carrés
  height?: number;
  
  // Pour trous taraudés
  threadPitch?: number;
  threadType?: string;
  threadClass?: string;
  
  // Pour fraisages
  sinkDiameter?: number;
  sinkDepth?: number;
  sinkAngle?: number;
  sinkType?: string;
  
  // Pour motifs de perçage
  patternType?: string;
  count?: number;
  spacing?: number;
  radius?: number;
  rows?: number;
  columns?: number;
  rowSpacing?: number;
  columnSpacing?: number;
  startAngle?: number;
  customPositions?: Array<{x: number, y: number, z?: number}>;
  
  // Pour oblongs
  length?: number;
  width?: number;
  
  // Pour contours (unify both point formats)
  points?: Array<[number, number] | {x: number, y: number}>;
  closed?: boolean;
  bulge?: number | number[];  // Pour les arcs dans les contours
  
  // Pour entailles
  notchType?: string;
  copingProfile?: string;
  webThickness?: number;
  flangeThickness?: number;
  
  // Pour chanfreins et biseaux
  angle?: number;
  size?: number;
  bevelType?: string;
  edgePosition?: string;
  startSize?: number;
  endSize?: number;
  
  // Pour marquages
  markingType?: string;
  markingMethod?: string;
  
  // Pour texte
  text?: string;
  font?: string;
  fontSize?: number;
  textType?: string;
  
  // Pour soudures
  weldType?: 'fillet' | 'butt' | 'spot' | 'seam';
  weldSize?: number;
  
  // Pour coping
  copingType?: string;
  targetProfile?: string;
  clearance?: number;
  
  // Pour les découpes
  isTransverse?: boolean;
  cutType?: string;
  
  // Pour bending (pliage)
  position?: number | number[];
  axis?: string;
  direction?: string;
  
  // Pour profils
  profileType?: string;
  profileName?: string;
  dimensions?: any;
  material?: string;
  
  // Pour filetage
  pitch?: number;
  tolerance?: number;
  
  // Propriétés manquantes identifiées dans les erreurs de compilation
  contourPoints?: Array<{x: number, y: number}>;
  bevelAngle?: number;
  bevelSize?: number;
  face?: ProfileFace;
  subContours?: Array<Array<{x: number, y: number}>>;
  operation?: 'union' | 'subtract' | 'intersect';
  isBeveled?: boolean;
  isCompound?: boolean;
  
  // Pour contours (additional properties)
  contourType?: string;
}

/**
 * Résultat de l'application d'une feature
 */
export interface FeatureResult {
  geometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
  volume: number;
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Interface pour les processeurs de features
 */
export interface IFeatureProcessor {
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult;
  
  validateFeature(feature: Feature, element: PivotElement): string[];
  
  dispose?(): void;
}

/**
 * Résultat du traitement d'une feature
 */
export interface ProcessorResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  error?: string;
  warning?: string;
}

/**
 * Configuration pour le système de features
 */
export interface FeatureSystemConfig {
  cacheEnabled: boolean;
  cacheSize: number;
  validateFeatures: boolean;
  optimizeGeometry: boolean;
  mergeVertices: boolean;
  tolerances: {
    position: number;
    angle: number;
    hole: number;
    cut: number;
  };
}

/**
 * Contexte de traitement d'une feature
 */
export interface FeatureContext {
  element: PivotElement;
  featureIndex: number;
  totalFeatures: number;
  previousGeometry?: THREE.BufferGeometry;
  csgEvaluator?: any;  // THREE-BVH-CSG Evaluator
}

/**
 * Informations de positionnement 3D
 */
export interface Position3D {
  position: [number, number, number];
  rotation: [number, number, number];
  face: ProfileFace;
  depth: number;
  normal: THREE.Vector3;
}

/**
 * Types unifiés pour les points 2D
 */
export type Point2D = { x: number; y: number };
export type ContourPoints = Point2D[];

/**
 * Fonctions de conversion pour les points
 */
export function pointsToArray(points: Point2D[]): [number, number][] {
  return points.map(p => [p.x, p.y]);
}

export function arrayToPoints(array: [number, number][]): Point2D[] {
  return array.map(([x, y]) => ({ x, y }));
}

/**
 * Mapping DSTV vers ProfileFace
 * Selon la norme DSTV officielle :
 * - v = Vorderseite = âme/web (face verticale centrale)
 * - o = Oben = aile supérieure (top flange)
 * - u = Unten = aile inférieure (bottom flange)
 * - h = Hinten = face arrière
 */
export const DSTV_FACE_MAPPING: Record<string, ProfileFace> = {
  'v': ProfileFace.WEB,            // v = web/âme (Vorderseite)
  'o': ProfileFace.TOP_FLANGE,     // o = top flange (Oben = dessus)
  'u': ProfileFace.BOTTOM_FLANGE,  // u = bottom flange (Unten = dessous)
  'h': ProfileFace.FRONT,          // h = front face (Hinten = arrière)
  'l': ProfileFace.LEFT_LEG,       // l = jambe gauche (profil L)
  'r': ProfileFace.RIGHT_LEG,      // r = jambe droite (profil L)
  
  // Mappings directs pour les valeurs déjà converties
  'web': ProfileFace.WEB,
  'top_flange': ProfileFace.TOP_FLANGE,
  'bottom_flange': ProfileFace.BOTTOM_FLANGE,
  'front': ProfileFace.FRONT,
  'left_leg': ProfileFace.LEFT_LEG,
  'right_leg': ProfileFace.RIGHT_LEG
};

/**
 * Helper pour mapper les faces DSTV
 */
export function mapDSTVFaceToProfileFace(dstvFace: string): ProfileFace {
  return DSTV_FACE_MAPPING[dstvFace.toLowerCase()] || ProfileFace.WEB;
}