/**
 * Types unifiés pour le parser DSTV
 * Architecture modulaire et extensible
 */

// ============================================================================
// Types de base DSTV
// ============================================================================

/**
 * Types de tokens DSTV reconnus pour le nouveau lexer
 */
export enum TokenType {
  // Blocks
  BLOCK_START = 'BLOCK_START',
  BLOCK_END = 'BLOCK_END',
  
  // Data types
  NUMBER = 'NUMBER',
  IDENTIFIER = 'IDENTIFIER',
  TEXT = 'TEXT',
  COMMENT = 'COMMENT',
  
  // Special indicators
  FACE_INDICATOR = 'FACE_INDICATOR',
  HOLE_TYPE = 'HOLE_TYPE',
  
  // Other
  UNKNOWN = 'UNKNOWN'
}

/**
 * Ancien enum pour compatibilité
 */
export enum DSTVTokenType {
  // Commandes principales
  ST = 'ST', // Start - Début d'un profil
  EN = 'EN', // End - Fin d'un profil
  
  // Profils et géométrie
  AK = 'AK', // Aussenkontur - Contour externe
  IK = 'IK', // Innenkontur - Contour interne
  PL = 'PL', // Plate - Plaque
  
  // Usinages
  BO = 'BO', // Bohren - Perçage/trou
  SI = 'SI', // Signieren - Marquage
  SC = 'SC', // Schneiden - Coupe
  BR = 'BR', // Brechen - Chanfrein
  
  // Autres
  KO = 'KO', // Kommentar - Commentaire
  PU = 'PU', // Program unit
  
  // Données
  DATA = 'DATA', // Ligne de données
  EMPTY = 'EMPTY', // Ligne vide
  UNKNOWN = 'UNKNOWN' // Non reconnu
}

/**
 * Face d'un profil - Enum pour le nouveau système
 */
export enum ProfileFace {
  FRONT = 'front',
  BACK = 'back',
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right'
}

/**
 * Face d'un profil dans le système DSTV (ancien)
 */
export type DSTVFace = 'v' | 'u' | 'o';
// v = visible/top (aile supérieure)
// u = bottom (aile inférieure)
// o = side/web (âme)

/**
 * Token pour le nouveau lexer
 */
export interface DSTVToken {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  face?: ProfileFace;
  holeType?: string;
}

/**
 * Token DSTV analysé par l'ancien lexer
 */
export interface DSTVTokenOld {
  type: DSTVTokenType;
  line: number;
  raw: string;
  command?: string;
  parameters?: string[];
  face?: DSTVFace;
  values?: number[];
  // Pour les trous spéciaux
  holeType?: HoleType;
  slottedLength?: number;
  slottedAngle?: number;
}

/**
 * Point 3D avec face optionnelle
 */
export interface DSTVPoint {
  x: number;
  y: number;
  z?: number;
  face?: DSTVFace;
}

// ============================================================================
// Types de features
// ============================================================================

/**
 * Types de trous supportés
 */
export type HoleType = 'round' | 'slotted' | 'square' | 'rectangular';

/**
 * Structure d'un trou DSTV (nouveau système)
 */
export interface DSTVHole {
  x: number;
  y: number;
  diameter: number;
  face: ProfileFace;
  holeType?: string;
  depth?: number;
}

/**
 * Structure d'un marquage DSTV (nouveau système)
 */
export interface DSTVMarking {
  x: number;
  y: number;
  text: string;
  size?: number;
  angle?: number;
}

/**
 * Structure d'une coupe DSTV (nouveau système)
 */
export interface DSTVCut {
  face: DSTVFace | ProfileFace | string;  // Accepter les 3 types pour compatibilité
  contour: Array<[number, number]>;
  depth?: number;
  isTransverse?: boolean;
  isInternal?: boolean; // Pour les contours internes (IK)
  angle?: number; // Pour les coupes obliques (SC)
  cutType?: 'straight' | 'oblique' | 'curved' | 'chamfer'; // Type de coupe
  chamferData?: any; // Données spécifiques aux chanfreins (BR)
}

/**
 * Structure d'un trou DSTV (ancien système)
 */
export interface DSTVHoleOld {
  position: DSTVPoint;
  diameter: number;
  depth: number;
  type: HoleType;
  // Pour les trous oblongs
  slottedLength?: number;
  slottedAngle?: number;
  // Pour les trous rectangulaires
  width?: number;
  height?: number;
}

/**
 * Structure d'un marquage DSTV (ancien système)
 */
export interface DSTVMarkingOld {
  position: DSTVPoint;
  text: string;
  size: number;
  angle?: number;
}

/**
 * Structure d'une coupe DSTV (ancien système)
 */
export interface DSTVCutOld {
  contourPoints: Array<[number, number]>;
  face: DSTVFace;
  depth: number;
  isTransverse?: boolean;
}

/**
 * Structure d'un contour DSTV
 */
export interface DSTVContour {
  points: DSTVPoint[];
  closed: boolean;
  face?: DSTVFace;
}

/**
 * Structure d'un chanfrein DSTV
 */
export interface DSTVChamfer {
  edge: 'start' | 'end' | 'top' | 'bottom';
  angle: number;
  size: number;
}

// ============================================================================
// Types de profils
// ============================================================================

/**
 * Profil DSTV complet avec toutes les features (nouveau système)
 */
export interface DSTVProfile {
  // Identification
  designation: string;
  length: number;
  profileType: string;
  
  // Dimensions
  width?: number;
  height?: number;
  thickness?: number;
  webThickness?: number;
  flangeThickness?: number;
  
  // Features d'usinage
  holes?: DSTVHole[];
  markings?: DSTVMarking[];
  cuts?: DSTVCut[];
  
  // Métadonnées optionnelles
  id?: string;
  orderNumber?: string;
  steelGrade?: string;
  weight?: number;
  paintingSurface?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Profil DSTV complet (ancien système)
 */
export interface DSTVProfileOld {
  // Identification
  id: string;
  orderNumber: string;
  designation: string;
  steelGrade: string;
  
  // Dimensions principales
  length: number;
  width: number;
  height: number;
  thickness: number;
  webThickness?: number;
  flangeThickness?: number;
  
  // Propriétés physiques
  weight: number;
  paintingSurface: number;
  
  // Géométrie
  contours: DSTVContour[];
  
  // Features d'usinage
  holes: DSTVHoleOld[];
  markings: DSTVMarkingOld[];
  cuts: DSTVCutOld[];
  chamfers: DSTVChamfer[];
  
  // Métadonnées
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Types de configuration
// ============================================================================

/**
 * Configuration du parser DSTV
 */
export interface DSTVParserConfig {
  unit: 'mm' | 'inch';
  coordinateSystem: 'left' | 'right';
  defaultMaterial: {
    grade: string;
    density: number;
    color: string;
    opacity: number;
    metallic: number;
    roughness: number;
    reflectivity: number;
  };
  validation?: {
    strictMode: boolean;
    maxFileSize?: number;
    allowUnknownCommands?: boolean;
  };
  performance?: {
    enableCache: boolean;
    batchSize: number;
    parallelProcessing: boolean;
  };
}

// ============================================================================
// Types de résultats
// ============================================================================

/**
 * Résultat du parsing DSTV
 */
export interface DSTVParseResult {
  success: boolean;
  profiles: DSTVProfile[];
  errors?: string[];
  warnings?: string[];
  statistics?: {
    profileCount: number;
    featureCount: number;
    parseTime: number;
  };
}

// Ré-export de ValidationLevel depuis son propre fichier
export { ValidationLevel } from './ValidationLevel';
export type { ValidationLevelType } from './ValidationLevel';
export const ValidationLevels = { BASIC: 'basic', STANDARD: 'standard', STRICT: 'strict' } as const;

/**
 * Résultat de validation pour un profil
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Résultat de validation pour plusieurs profils
 */
export interface ValidationResults {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  profileResults: ValidationResult[];
}

// ============================================================================
// Interfaces pour les composants
// ============================================================================

/**
 * Interface pour le lexer
 */
export interface IDSTVLexer {
  tokenize(content: string): DSTVToken[];
  reset(): void;
}

/**
 * Interface pour les parsers de blocs
 */
export interface IBlockParser {
  canParse(token: DSTVToken): boolean;
  parse(tokens: DSTVToken[], startIndex: number, profile: DSTVProfile): number;
}

/**
 * Interface pour le convertisseur
 */
export interface IDSTVConverter {
  convert(profiles: DSTVProfile[]): any; // Retourne PivotScene
}

/**
 * Interface pour le validateur
 */
export interface IDSTVValidator {
  validate(data: string | ArrayBuffer): ValidationResult;
  validateProfile(profile: DSTVProfile): ValidationResult;
  validateFeature(feature: any, profile: DSTVProfile): ValidationResult;
}

// Note: Les exports sont déjà faits en haut du fichier, pas besoin de les ré-exporter