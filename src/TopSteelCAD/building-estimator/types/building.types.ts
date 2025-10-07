/**
 * Types pour la structure des bâtiments
 * Building Estimator - TopSteelCAD
 */

import { Vector3, Euler } from 'three';

/**
 * Type de bâtiment supporté
 */
export enum BuildingType {
  MONO_PENTE = 'monopente',
  BI_PENTE = 'bipente',
  BI_PENTE_ASYM = 'bipente_asymetrique',  // Bipente avec hauteurs de poteaux différentes
  AUVENT = 'auvent',
  PLANCHER = 'plancher'                    // Structure plane horizontale
}

/**
 * Type d'attachement pour les extensions
 */
export enum ExtensionAttachmentType {
  TRAVEE = 'travee',              // Extension sur une travée spécifique
  LONG_PAN = 'long_pan',          // Extension sur toute la longueur
  PIGNON_GAUCHE = 'pignon_gauche', // Extension sur le pignon gauche (x=0)
  PIGNON_DROIT = 'pignon_droit'    // Extension sur le pignon droit (x=length)
}

/**
 * Type de mur
 */
export enum WallType {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right'
}

/**
 * Type d'ouverture
 */
export enum OpeningType {
  DOOR = 'door',
  WINDOW = 'window',
  SECTIONAL_DOOR = 'sectional_door',  // Future
  CURTAIN = 'curtain'                  // Future
}

/**
 * Type d'élément structurel
 */
export enum StructuralElementType {
  POST = 'post',           // Poteau
  RAFTER = 'rafter',       // Arbalétrier
  PURLIN = 'purlin',       // Panne
  RAIL = 'rail',           // Lisse de bardage
  BRACING = 'bracing',     // Contreventement (Future)
  BEAM = 'beam'            // Poutre (Future)
}

/**
 * Dimensions principales du bâtiment
 */
export interface BuildingDimensions {
  length: number;          // Longueur (mm)
  width: number;           // Largeur/Portée (mm)
  heightWall: number;      // Hauteur au mur (mm)
  slope: number;           // Pente en % (ex: 10 pour 10%)
  heightRidge?: number;    // Hauteur au faîtage (calculée)

  // Propriétés optionnelles pour les types dérivés
  leftSlope?: number;         // Pente côté gauche (%)
  rightSlope?: number;        // Pente côté droit (%)
  leftWallHeight?: number;    // Hauteur au mur côté gauche (mm)
  rightWallHeight?: number;   // Hauteur au mur côté droit (mm)
  ridgeOffset?: number;       // Position du faîtage (% de la largeur)
  backHeight?: number;        // Hauteur arrière pour auvent (mm)
  hasBackWall?: boolean;      // Mur arrière fermé (auvent)
  hasSideWalls?: boolean;     // Murs latéraux fermés (auvent)
}

/**
 * Travée personnalisée pour le mode personnalisé
 */
export interface CustomBay {
  bayIndex: number;        // Index de la travée (0-based)
  spacing: number;         // Entraxe de cette travée (mm)
}

/**
 * Portique personnalisé pour le mode personnalisé
 * Chaque portique a 2 poteaux (avant et arrière)
 */
export interface CustomPortal {
  portalIndex: number;       // Index du portique (0-based)
  frontPostYOffset: number;  // Décalage vertical poteau avant (mm)
  backPostYOffset: number;   // Décalage vertical poteau arrière (mm)
}

/**
 * Configuration d'un acrotère
 */
export interface AcrotereConfig {
  enabled: boolean;         // Activer l'acrotère
  height: number;          // Hauteur de l'acrotère (mm)
  profile: string;         // Profil de l'acrotère (ex: 'IPE 100')
  placement: 'contour' | 'specific';  // Contour complet ou faces spécifiques
  sides?: Array<'front' | 'back' | 'left' | 'right'>;  // Faces spécifiques (si placement = 'specific')
}

/**
 * Configuration d'un garde-corps
 */
export interface GuardrailConfig {
  enabled: boolean;         // Activer le garde-corps
  height: number;          // Hauteur du garde-corps (mm) - généralement 1000-1100mm
  postProfile: string;     // Profil des poteaux (ex: 'UAP 50')
  railProfile: string;     // Profil des lisses horizontales (ex: 'Tube 40x40')
  postSpacing: number;     // Espacement des poteaux (mm) - max 1500mm selon normes
  numberOfRails: number;   // Nombre de lisses horizontales (2 ou 3)
  sides: Array<'front' | 'back' | 'left' | 'right'>;  // Côtés où placer le garde-corps
}

/**
 * Paramètres de construction
 */
export interface BuildingParameters {
  // Entraxes
  postSpacing: number;     // Entraxe poteaux (mm)
  purlinSpacing: number;   // Entraxe pannes (mm)
  railSpacing: number;     // Entraxe lisses (mm)

  // Profils par défaut
  postProfile: string;     // ex: 'IPE 240'
  rafterProfile: string;   // ex: 'IPE 200'
  purlinProfile: string;   // ex: 'IPE 140'
  railProfile: string;     // ex: 'UAP 80'

  // Matériaux
  steelGrade: string;      // ex: 'S235', 'S355'

  // Options
  includeGutters?: boolean;
  includeDownspouts?: boolean;

  // Mode personnalisé pour les entraxes
  customSpacingMode?: boolean;         // Activer le mode personnalisé
  customBays?: CustomBay[];            // Configuration de chaque travée
  customPortals?: CustomPortal[];      // Configuration de chaque portique (avec ses 2 poteaux)

  // Acrotères et garde-corps
  acrotere?: AcrotereConfig;           // Configuration de l'acrotère
  guardrail?: GuardrailConfig;         // Configuration du garde-corps

  // Plancher (pour type PLANCHER uniquement)
  intermediatePostsCount?: number;     // Nombre de poteaux intermédiaires par portique
}

/**
 * Position d'un élément
 */
export interface ElementPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Rotation d'un élément
 */
export interface ElementRotation {
  x: number;
  y: number;
  z: number;
}

/**
 * Élément structurel du bâtiment
 */
export interface StructuralElement {
  id: string;
  type: StructuralElementType;
  profile: string;              // Désignation du profil (ex: 'IPE 240')
  length: number;               // Longueur (mm)
  position: ElementPosition;    // Position dans l'espace
  rotation: ElementRotation;    // Rotation
  weight: number;               // Poids unitaire (kg)
  reference?: string;           // Référence (ex: 'POT-01')
}

/**
 * Structure du bâtiment (ossature)
 */
export interface BuildingStructure {
  posts: StructuralElement[];      // Poteaux
  rafters: StructuralElement[];    // Arbalétriers
  purlins: StructuralElement[];    // Pannes
  rails: StructuralElement[];      // Lisses de bardage
  bracing?: StructuralElement[];   // Contreventement (Future)
}

/**
 * Ouverture dans un mur
 */
export interface Opening {
  id: string;
  type: OpeningType;
  wall: WallType;
  position: {
    x: number;     // Position X sur le mur (mm)
    z: number;     // Position Z (hauteur) (mm)
  };
  dimensions: {
    width: number;  // Largeur (mm)
    height: number; // Hauteur (mm)
  };
  reference?: string;  // Référence (ex: 'P1', 'F1')
}

/**
 * Type de bardage
 */
export enum CladdingType {
  SANDWICH_80MM = 'sandwich_80mm',
  SANDWICH_100MM = 'sandwich_100mm',
  SANDWICH_120MM = 'sandwich_120mm',
  STEEL_PANEL_SINGLE = 'steel_panel_single',
  CUSTOM = 'custom'
}

/**
 * Type de couverture
 */
export enum RoofingType {
  STEEL_PANEL_075MM = 'steel_panel_0.75mm',
  STEEL_PANEL_100MM = 'steel_panel_1.00mm',
  SANDWICH_80MM = 'sandwich_80mm',
  SANDWICH_100MM = 'sandwich_100mm',
  CUSTOM = 'custom'
}

/**
 * Finitions du bâtiment
 */
export interface Finishes {
  cladding: {
    type: CladdingType;
    color?: string;          // Couleur (ex: 'RAL 9002')
    thickness?: number;      // Épaisseur (mm)
  };
  roofing: {
    type: RoofingType;
    color?: string;          // Couleur (ex: 'RAL 7016')
    thickness?: number;      // Épaisseur (mm)
  };
  trim?: {
    color?: string;          // Couleur habillage
  };
}

/**
 * Extension de bâtiment
 */
export interface BuildingExtension {
  id: string;
  name: string;
  type: BuildingType;                        // Type d'extension (MONO_PENTE, BI_PENTE, AUVENT)
  attachmentType: ExtensionAttachmentType;   // Type d'attachement

  // Hiérarchie
  parentId?: string;                         // ID du parent (undefined = bâtiment principal)

  // Position
  bayIndex?: number;                         // Index de la travée (si TRAVEE)
  side: 'front' | 'back' | 'left' | 'right'; // Côté d'attachement

  // Dimensions
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;

  // Options de pente
  reversedSlope?: boolean;                   // Inverser le sens de la pente (bas côté bâtiment ou extérieur)

  // Suivi des dimensions du parent
  followParentDimensions?: boolean;          // Suivre automatiquement les modifications du parent (default: true)

  // Structure générée
  structure?: BuildingStructure;

  // Ouvertures
  openings?: Opening[];

  // Finitions
  finishes?: Partial<Finishes>;
}

/**
 * Bâtiment monopente (MVP)
 */
export interface MonoPenteBuilding {
  id: string;
  name: string;
  type: BuildingType.MONO_PENTE;
  createdAt: Date;
  updatedAt: Date;

  // Données de base
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;

  // Structure
  structure: BuildingStructure;

  // Ouvertures
  openings: Opening[];

  // Finitions
  finishes: Finishes;

  // Extensions
  extensions?: BuildingExtension[];

  // Métadonnées
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Configuration pour créer un bâtiment
 */
export interface CreateBuildingConfig {
  name: string;
  dimensions: BuildingDimensions;
  parameters?: Partial<BuildingParameters>;
  openings?: Opening[];
  finishes?: Partial<Finishes>;
  metadata?: MonoPenteBuilding['metadata'];
}

/**
 * Résultat de la génération de structure
 */
export interface StructureGenerationResult {
  structure: BuildingStructure;
  calculations: {
    postCount: number;
    rafterCount: number;
    purlinCount: number;
    railCount: number;
    totalSteelWeight: number;
  };
  warnings?: string[];
}

/**
 * Validation errors
 */
export interface BuildingValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Résultat de validation
 */
export interface BuildingValidationResult {
  isValid: boolean;
  errors: BuildingValidationError[];
}

/**
 * Dimensions spécifiques au bâtiment bipente
 */
export interface BiPenteDimensions extends BuildingDimensions {
  leftSlope: number;         // Pente côté gauche (%)
  rightSlope: number;        // Pente côté droit (%)
  ridgeHeight?: number;      // Hauteur au faîtage (calculée si non fournie)
}

/**
 * Dimensions spécifiques au bâtiment bipente asymétrique
 */
export interface BiPenteAsymDimensions extends BuildingDimensions {
  leftSlope: number;          // Pente côté gauche (%)
  rightSlope: number;         // Pente côté droit (%)
  leftWallHeight: number;     // Hauteur au mur côté gauche (mm)
  rightWallHeight: number;    // Hauteur au mur côté droit (mm)
  ridgeOffset?: number;       // Position du faîtage (% de la largeur, 50 = centre)
  ridgeHeight?: number;       // Hauteur au faîtage (calculée si non fournie)
}

/**
 * Dimensions spécifiques au plancher
 */
export interface PlancherDimensions extends BuildingDimensions {
  heightWall: number;         // Hauteur uniforme des poteaux (mm)
  slope: 0;                   // Pente = 0 pour un plancher
}

/**
 * Bâtiment bipente (toit à double pente)
 */
export interface BiPenteBuilding {
  id: string;
  name: string;
  type: BuildingType.BI_PENTE;
  createdAt: Date;
  updatedAt: Date;

  // Données de base
  dimensions: BiPenteDimensions;
  parameters: BuildingParameters;

  // Structure (avec poutre faîtière en plus)
  structure: BuildingStructure & {
    ridgeBeam?: StructuralElement;  // Poutre faîtière
  };

  // Ouvertures
  openings: Opening[];

  // Finitions
  finishes: Finishes;

  // Extensions
  extensions?: BuildingExtension[];

  // Métadonnées
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Dimensions spécifiques au bâtiment auvent
 */
export interface AuventDimensions extends BuildingDimensions {
  backHeight: number;        // Hauteur arrière (mm)
  hasBackWall: boolean;      // Mur arrière fermé ou non
  hasSideWalls: boolean;     // Murs latéraux fermés ou non
}

/**
 * Bâtiment auvent (structure ouverte)
 */
export interface AuventBuilding {
  id: string;
  name: string;
  type: BuildingType.AUVENT;
  createdAt: Date;
  updatedAt: Date;

  // Données de base
  dimensions: AuventDimensions;
  parameters: BuildingParameters;

  // Structure
  structure: BuildingStructure;

  // Ouvertures (limitées pour un auvent)
  openings: Opening[];

  // Finitions (limitées pour un auvent)
  finishes: Partial<Finishes>;

  // Extensions
  extensions?: BuildingExtension[];

  // Métadonnées
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Bâtiment bipente asymétrique (hauteurs de poteaux différentes)
 */
export interface BiPenteAsymBuilding {
  id: string;
  name: string;
  type: BuildingType.BI_PENTE_ASYM;
  createdAt: Date;
  updatedAt: Date;

  // Données de base
  dimensions: BiPenteAsymDimensions;
  parameters: BuildingParameters;

  // Structure (avec poutre faîtière en plus)
  structure: BuildingStructure & {
    ridgeBeam?: StructuralElement;  // Poutre faîtière
  };

  // Ouvertures
  openings: Opening[];

  // Finitions
  finishes: Finishes;

  // Extensions
  extensions?: BuildingExtension[];

  // Métadonnées
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Bâtiment plancher (structure plane horizontale)
 */
export interface PlancherBuilding {
  id: string;
  name: string;
  type: BuildingType.PLANCHER;
  createdAt: Date;
  updatedAt: Date;

  // Données de base
  dimensions: PlancherDimensions;
  parameters: BuildingParameters;

  // Structure
  structure: BuildingStructure;

  // Ouvertures
  openings: Opening[];

  // Finitions
  finishes: Partial<Finishes>;

  // Extensions
  extensions?: BuildingExtension[];

  // Métadonnées
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Union type pour tous les types de bâtiments
 */
export type Building = MonoPenteBuilding | BiPenteBuilding | BiPenteAsymBuilding | AuventBuilding | PlancherBuilding;
