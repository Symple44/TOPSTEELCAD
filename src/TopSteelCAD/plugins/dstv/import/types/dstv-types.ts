/**
 * Types DSTV centralisés pour le plugin DSTV
 * 
 * Ce fichier centralise tous les types utilisés par le plugin DSTV
 * pour éviter les dépendances circulaires et améliorer la maintenabilité.
 */

/**
 * Types de blocs DSTV selon la norme officielle
 */
export enum DSTVBlockType {
  // Blocs obligatoires
  ST = 'ST',    // Start/Header - Données de la pièce
  EN = 'EN',    // End - Fin du fichier
  
  // Blocs de géométrie
  BO = 'BO',    // Hole - Trou rond
  AK = 'AK',    // Outer contour - Contour extérieur
  IK = 'IK',    // Inner contour - Contour intérieur
  KA = 'KA',    // Arc contour - Contour avec arcs de cercle
  
  // Blocs de marquage et traitement
  SI = 'SI',    // Marking - Marquage pièce
  SC = 'SC',    // Cut - Découpe spéciale
  PU = 'PU',    // Punch mark - Pointage
  
  // Blocs d'évidement
  BR = 'BR',    // Brake/Notch - Évidement en V
  LP = 'LP',    // Line of cut - Ligne de découpe
  RT = 'RT',    // Rotation - Rotation pièce
  
  // Blocs de traitement thermique
  WA = 'WA',    // Heat treatment area - Zone de traitement thermique
  VO = 'VO',    // Groove - Rainure
  
  // Blocs de tolérance et qualité
  TO = 'TO',    // Tolerance - Tolérance
  KO = 'KO',    // Quality - Contrôle qualité
  
  // Blocs de fixation
  FP = 'FP',    // Fastener position - Position fixation
  UE = 'UE',    // User extension - Extension utilisateur
  NU = 'NU',    // Numbering - Numérotation
  
  // Blocs avancés additionnels
  PR = 'PR',    // Profile - Définition profil
  EB = 'EB',    // End of Batch - Fin de lot
  VB = 'VB',    // Variable Block - Bloc variable
  GR = 'GR',    // Group - Groupement d'opérations
  FB = 'FB',    // Face Block - Bloc de face
  BF = 'BF',    // Bending Force - Force de pliage
  KL = 'KL',    // Clamping - Serrage
  KN = 'KN',    // Knurling - Moletage
  RO = 'RO',    // Roll - Laminage
  
  // Blocs techniques spéciaux
  UNKNOWN = 'UNKNOWN'  // Type inconnu pour la gestion d'erreurs
}

/**
 * Types de tokens DSTV
 */
export enum DSTVTokenType {
  BLOCK_START = 'BLOCK_START',
  BLOCK_ID = 'BLOCK_ID',           // For 2-letter block identifiers like ST, BO, etc.
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  COORDINATE = 'COORDINATE',
  DIMENSION = 'DIMENSION',
  ANGLE = 'ANGLE',
  IDENTIFIER = 'IDENTIFIER',
  COMMENT = 'COMMENT',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN',
  EMPTY = 'EMPTY',                  // For empty fields
  INTEGER = 'INTEGER',              // Integer numbers
  FLOAT = 'FLOAT'                   // Float numbers
}

/**
 * Token DSTV avec position et type
 */
export interface DSTVToken {
  type: DSTVTokenType;
  value: string;
  line: number;
  column: number;
  length: number;
  raw: string;
  // Optional position object for compatibility
  position?: {
    line: number;
    column: number;
  };
}

/**
 * Nœud de l'AST DSTV
 */
export interface DSTVASTNode {
  type: DSTVBlockType;
  tokens: DSTVToken[];
  children?: DSTVASTNode[];
  metadata: {
    line: number;
    column: number;
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };
}

/**
 * Structure de données pour un bloc DSTV parsé
 */
export interface DSTVBlock {
  type: DSTVBlockType;
  data: Record<string, any>;
  metadata: {
    lineNumber: number;
    originalText: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Coordonnées 3D DSTV
 */
export interface DSTVCoordinate {
  x: number;
  y: number;
  z?: number;
}

/**
 * Paramètres pour un trou (BO block)
 */
export interface DSTVHoleParameters {
  position: DSTVCoordinate;
  diameter: number;
  depth?: number;
  type?: 'through' | 'blind';
  face?: 'v' | 'u' | 'o' | 'h'; // Face d'application
}

/**
 * Paramètres pour un contour (AK/IK block)
 */
export interface DSTVContourParameters {
  points: DSTVCoordinate[];
  closed: boolean;
  type: 'outer' | 'inner';
  face?: 'v' | 'u' | 'o' | 'h';
}

/**
 * Paramètres pour un marquage (SI block)
 */
export interface DSTVMarkingParameters {
  position: DSTVCoordinate;
  text: string;
  size?: number;
  angle?: number;
  face?: 'v' | 'u' | 'o' | 'h';
  depth?: number;
}

/**
 * Configuration d'export DSTV
 */
export interface DSTVExportOptions {
  version?: string;
  precision?: number;
  includeComments?: boolean;
  validateOutput?: boolean;
  format?: 'standard' | 'extended';
}

/**
 * Résultat d'import DSTV
 */
export interface DSTVImportResult {
  success: boolean;
  blocks: DSTVBlock[];
  errors: string[];
  warnings: string[];
  metadata: {
    version?: string;
    partName?: string;
    material?: string;
    dimensions?: {
      length: number;
      width?: number;
      height?: number;
      thickness?: number;
    };
  };
}

/**
 * Résultat d'export DSTV
 */
export interface DSTVExportResult {
  success: boolean;
  content: string;
  errors: string[];
  warnings: string[];
  metadata: {
    blockCount: number;
    fileSize: number;
    version: string;
  };
}