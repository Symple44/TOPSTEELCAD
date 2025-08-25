// Types de base pour le viewer 3D TopSteel

// Removed unused imports: Vector3, Euler, Matrix4

// ================================
// OBJET PIVOT - STANDARD INTERNE
// ================================

/**
 * Matériaux supportés dans l'industrie métallique
 */
export enum MaterialType {
  PLATE = 'plate',           // Tôle/plaque
  BEAM = 'beam',             // Poutre (IPE, HEB, etc.)
  COLUMN = 'column',         // Colonne/Poteau
  TUBE = 'tube',             // Tube rond/carré
  ANGLE = 'angle',           // Cornière (L)
  CHANNEL = 'channel',       // UPN, UAP
  TEE = 'tee',              // Té
  BAR = 'bar',              // Barre ronde/carrée
  SHEET = 'sheet',          // Tôle mince
  BOLT = 'bolt',            // Boulon (tige filetée)
  NUT = 'nut',              // Écrou
  WASHER = 'washer',        // Rondelle
  BOLT_HEAD = 'bolt_head',  // Tête de boulon
  WELD = 'weld',            // Cordon de soudure
  
  // Accessoires spécialisés d'ancrage et levage
  ANCHOR_ROD = 'ANCHOR_ROD',           // Tige d'ancrage
  L_ANCHOR = 'L_ANCHOR',               // Crosse d'ancrage
  J_ANCHOR = 'J_ANCHOR',               // Ancrage en J
  LIFTING_EYE = 'LIFTING_EYE',         // Anneau de levage
  SHACKLE = 'SHACKLE',                 // Manille
  TURNBUCKLE = 'TURNBUCKLE',           // Ridoir
  BEARING_PAD = 'BEARING_PAD',         // Plaque d'appui
  EXPANSION_JOINT = 'EXPANSION_JOINT', // Joint de dilatation
  DRAINAGE_SCUPPER = 'DRAINAGE_SCUPPER', // Gargouille
  SAFETY_CABLE = 'SAFETY_CABLE',       // Câble de sécurité
  
  CUSTOM = 'custom'         // Forme personnalisée
}

/**
 * Types d'assemblages métalliques
 */
export enum AssemblyType {
  WELD = 'weld',            // Soudure
  BOLT = 'bolt',            // Boulonnage
  RIVET = 'rivet',          // Rivetage
  CLIP = 'clip',            // Clip/agrafe
  NONE = 'none'             // Pas d'assemblage
}

/**
 * Types d'éléments dans la scène 3D
 * Utilisé pour catégoriser les différents types d'objets
 */
export enum ElementType {
  // Éléments structurels principaux
  BEAM = 'beam',              // Poutre
  COLUMN = 'column',          // Colonne
  PLATE = 'plate',            // Plaque
  PROFILE = 'profile',        // Profilé générique
  
  // Features et modifications
  HOLE = 'hole',              // Trou
  CUT = 'cut',                // Découpe
  CUTOUT = 'cutout',          // Découpe complexe
  NOTCH = 'notch',            // Encoche
  SLOT = 'slot',              // Fente
  
  // Marquages et annotations
  MARKING = 'marking',        // Marquage
  TEXT = 'text',              // Texte
  ANNOTATION = 'annotation',  // Annotation générale
  
  // Assemblages et connexions
  WELD = 'weld',              // Soudure
  BOLT = 'bolt',              // Boulon
  CONNECTION = 'connection',  // Connexion générique
  
  // Autres
  FEATURE = 'feature',        // Feature générique
  ACCESSORY = 'accessory',    // Accessoire
  GROUP = 'group',            // Groupe d'éléments
  ASSEMBLY = 'assembly'       // Assemblage complet
}

/**
 * Types de features supportées
 * Mapping avec le système interne de features
 */
export enum FeatureType {
  // Trous et perçages
  HOLE = 'HOLE',
  TAPPED_HOLE = 'TAPPED_HOLE',
  COUNTERSINK = 'COUNTERSINK',
  COUNTERBORE = 'COUNTERBORE',
  DRILL_PATTERN = 'DRILL_PATTERN',
  THREAD = 'THREAD',
  
  // Découpes et contours
  CUT = 'CUT',
  SLOT = 'SLOT',
  CUTOUT = 'CUTOUT',
  CONTOUR = 'CONTOUR',
  UNRESTRICTED_CONTOUR = 'UNRESTRICTED_CONTOUR',
  NOTCH = 'NOTCH',
  COPING = 'COPING',
  
  // Finitions et déformations
  CHAMFER = 'CHAMFER',
  BEVEL = 'BEVEL',
  BEND = 'BEND',
  
  // Marquages et annotations
  MARKING = 'MARKING',
  TEXT = 'TEXT',
  
  // Soudures et assemblages
  WELD = 'WELD',
  WELD_PREP = 'WELD_PREP',
  
  // Features DSTV avancées
  VOLUME = 'VOLUME',
  NUMERIC_CONTROL = 'NUMERIC_CONTROL',
  FREE_PROGRAM = 'FREE_PROGRAM',
  LINE_PROGRAM = 'LINE_PROGRAM',
  ROTATION = 'ROTATION',
  WASHING = 'WASHING',
  GROUP = 'GROUP',
  VARIABLE = 'VARIABLE',
  
  // Autres
  PUNCH = 'PUNCH',
  PROFILE = 'PROFILE'
}

/**
 * Interface pour les features sélectionnables
 */
export interface SelectableFeature {
  id: string;
  type: FeatureType;
  elementId: string;
  position: [number, number, number];
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  selectable: boolean;
  visible: boolean;
  highlighted?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Dimensions d'un élément métallique
 */
export interface MetalDimensions {
  length: number;           // Longueur (mm)
  width: number;            // Largeur (mm)
  height?: number;          // Hauteur (mm) - optionnelle pour les tôles
  thickness: number;        // Épaisseur (mm)
  diameter?: number;        // Diamètre (mm) - pour les tubes/barres rondes
  radius?: number;          // Rayon (mm)
  
  // Propriétés spécifiques aux profilés métalliques
  flangeWidth?: number;     // Largeur des semelles (mm) - pour profilés IPE, HEA, HEB, etc.
  flangeThickness?: number; // Épaisseur des semelles (mm)
  webThickness?: number;    // Épaisseur de l'âme (mm)
  webHeight?: number;       // Hauteur de l'âme (mm)
  rootRadius?: number;      // Rayon de congé (mm)
}

/**
 * Propriétés du matériau
 */
export interface MaterialProperties {
  grade: string;            // Nuance d'acier (S235, S355, etc.)
  density: number;          // Densité (kg/m³)
  color: string;            // Couleur d'affichage
  opacity: number;          // Opacité (0-1)
  metallic: number;         // Métallicité (0-1)
  roughness: number;        // Rugosité (0-1)
  reflectivity: number;     // Réflectivité (0-1)
}

/**
 * Information d'assemblage
 */
export interface AssemblyInfo {
  type: AssemblyType;
  targetElementId?: string; // ID de l'élément cible
  position: [number, number, number]; // Position de l'assemblage
  metadata?: Record<string, any>; // Métadonnées spécifiques
}

/**
 * OBJET PIVOT - Le cœur du système
 * Structure standard pour tous les éléments 3D métalliques
 */
export interface PivotElement {
  // Identification
  id: string;
  name: string;
  description?: string;
  
  // Type et géométrie
  materialType: MaterialType;
  dimensions: MetalDimensions;
  
  // Transformation spatiale
  position: [number, number, number];  // x, y, z en mm
  rotation: [number, number, number];  // rx, ry, rz en radians
  scale: [number, number, number];     // sx, sy, sz
  
  // Propriétés matériau
  material: MaterialProperties;
  
  // Hiérarchie et assemblages
  parentId?: string;
  childIds?: string[];
  assemblies?: AssemblyInfo[];
  connections?: {
    elementId: string;
    type: 'bolted' | 'welded' | 'pinned' | 'fixed';
    position: [number, number, number];
  }[];
  
  // Features sélectionnables
  features?: SelectableFeature[];
  featureGroups?: {
    id: string;
    name: string;
    featureIds: string[];
    visible: boolean;
  }[];
  
  // Métadonnées métier
  partNumber?: string;        // Référence pièce
  weight?: number;            // Poids calculé (kg)
  volume?: number;            // Volume calculé (m³)
  surface?: number;           // Surface calculée (m²)
  
  // Données de fabrication
  cuttingData?: {
    profile: string;          // Profil de découpe
    length: number;           // Longueur de découpe
    angle?: number;           // Angle de découpe
  };
  
  // Métadonnées étendues
  metadata: Record<string, any>;
  
  // Données originales (pour traçabilité)
  sourceFormat?: 'dstv' | 'dwg' | 'ifc' | 'manual';
  originalData?: Record<string, any>;
  
  // État d'affichage
  visible: boolean;
  selected?: boolean;
  highlighted?: boolean;
  selectedFeatures?: string[];  // IDs des features sélectionnées
  highlightedFeature?: string;  // ID de la feature survolée
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Collection d'éléments avec hiérarchie
 */
export interface PivotScene {
  id: string;
  name: string;
  description?: string;
  elements: Map<string, PivotElement>;
  rootElementIds?: string[];   // IDs des éléments racine
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  metadata?: Record<string, any>;
}

// ================================
// INTERFACES VIEWER
// ================================

/**
 * Configuration du viewer
 */
export interface ViewerConfig {
  enableSelection: boolean;
  enableFeatureSelection: boolean;
  enableMeasurement: boolean;
  enableAnimation: boolean;
  backgroundColor: string;
  ambientLight: number;
  directionalLight: number;
  showGrid: boolean;
  showAxes: boolean;
  showViewCube: boolean;
  featureHighlightColor?: string;
  featureHighlightOpacity?: number;
}

/**
 * État du viewer
 */
export interface ViewerState {
  scene: PivotScene | null;
  selectedElementIds: string[];
  selectedFeatures: Array<{
    elementId: string;
    featureId: string;
  }>;
  highlightedElementId: string | null;
  highlightedFeature: {
    elementId: string;
    featureId: string;
  } | null;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  };
  measurements: MeasurementData[];
  config: ViewerConfig;
}

/**
 * Données de mesure
 */
export interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'volume' | 'radius' | 'diameter' | 'centroid' | 'perimeter';
  points: [number, number, number][];
  value: number;
  unit: string;
  label: string;
}

/**
 * Vues prédéfinies
 */
export enum PredefinedView {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  ISO = 'iso',
  ISO_BACK = 'iso_back'
}

/**
 * Configuration de vue
 */
export interface ViewConfiguration {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
}

// ================================
// INTERFACES PARSERS
// ================================

/**
 * Interface générique pour les parsers
 */
export interface FileParser {
  supportedExtensions: string[];
  parse(data: ArrayBuffer | string): Promise<PivotScene>;
  validate(data: ArrayBuffer | string): boolean;
}

/**
 * Résultat de parsing
 */
export interface ParseResult {
  success: boolean;
  scene?: PivotScene;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Configuration de parsing DSTV
 */
export interface DSTVConfig {
  unit: 'mm' | 'inch';
  coordinateSystem: 'right' | 'left';
  defaultMaterial: MaterialProperties;
}

/**
 * Configuration de parsing IFC
 */
export interface IFCConfig {
  extractMaterials: boolean;
  extractGeometry: boolean;
  extractProperties: boolean;
  filterTypes?: string[];
}