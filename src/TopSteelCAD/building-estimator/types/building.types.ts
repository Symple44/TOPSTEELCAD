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
  PLANCHER = 'plancher',                   // Structure plane horizontale
  OMBRIERE = 'ombriere'                    // Ombrière photovoltaïque (POC Phase 1)
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
 * Étapes de configuration du bâtiment
 */
export enum BuildingConfigStep {
  DIMENSIONS = 'dimensions',           // Étape 1: Dimensions et structure
  EQUIPMENT = 'equipment',             // Étape 2: Équipements (ouvertures, GC, acrotères)
  ENVELOPE = 'envelope',               // Étape 3: Enveloppe (bardage, couverture)
  FINISHING = 'finishing'              // Étape 4: Finitions
}

/**
 * Type d'ouverture
 */
export enum OpeningType {
  // Ouvertures verticales
  PEDESTRIAN_DOOR = 'pedestrian_door',           // Porte piétonne
  SECTIONAL_DOOR = 'sectional_door',             // Porte sectionnelle
  ROLLER_SHUTTER = 'roller_shutter',             // Rideau métallique
  WINDOW = 'window',                              // Fenêtre
  GLAZED_BAY = 'glazed_bay',                     // Baie vitrée

  // Ouvertures en couverture
  SMOKE_VENT = 'smoke_vent',                     // Exutoire de fumée
  ROOF_WINDOW = 'roof_window',                   // Fenêtre de toit (Velux, etc.)
  SKYLIGHT = 'skylight'                          // Lanterneau
}

/**
 * Position d'une ouverture
 */
export enum OpeningPosition {
  LONG_PAN_FRONT = 'long_pan_front',             // Long-pan avant
  LONG_PAN_BACK = 'long_pan_back',               // Long-pan arrière
  GABLE_LEFT = 'gable_left',                     // Pignon gauche
  GABLE_RIGHT = 'gable_right',                   // Pignon droit
  ROOF = 'roof'                                   // En couverture
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

  // Débords de couverture (valeurs positives = débord, négatives = retrait)
  overhangLongPanFront?: number;   // Débord long-pan avant (mm)
  overhangLongPanBack?: number;    // Débord long-pan arrière (mm)
  overhangGableLeft?: number;      // Débord pignon gauche (mm)
  overhangGableRight?: number;     // Débord pignon droit (mm)

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
 * Types de garde-corps disponibles
 */
export enum GuardrailType {
  HORIZONTAL_RAILS = 'horizontal_rails',     // Lisses horizontales (standard)
  VERTICAL_BARS = 'vertical_bars',           // Barreaux verticaux
  CABLE = 'cable',                            // Câbles inox tendus
  MESH_PANEL = 'mesh_panel',                 // Grillage/treillis soudé
  SOLID_PANEL = 'solid_panel',               // Panneaux pleins (tôle)
  PERFORATED_PANEL = 'perforated_panel',     // Panneaux perforés (tôle décorative)
  MIXED_RAILS_BARS = 'mixed_rails_bars',     // Mixte lisses + barreaux
  MIXED_RAILS_MESH = 'mixed_rails_mesh',     // Mixte lisses + grillage
  GLASS = 'glass'                             // Vitrage securit
}

/**
 * Configuration d'un garde-corps
 */
export interface GuardrailConfig {
  enabled: boolean;                          // Activer le garde-corps
  type: GuardrailType;                       // Type de garde-corps
  height: number;                            // Hauteur du garde-corps (mm) - généralement 1000-1100mm
  postProfile: string;                       // Profil des poteaux (ex: 'UAP 50', 'UAP 80')
  postSpacing: number;                       // Espacement des poteaux (mm) - max 1500mm selon normes
  sides: Array<'front' | 'back' | 'left' | 'right'>;  // Côtés où placer le garde-corps

  // Options communes
  withToeboard?: boolean;                    // Ajouter une plinthe (150mm minimum selon norme)
  toeboardHeight?: number;                   // Hauteur de la plinthe (mm) - 150-200mm
  color?: string;                            // Couleur (ex: '#059669', 'RAL 6005')

  // Spécifique HORIZONTAL_RAILS
  railProfile?: string;                      // Profil des lisses (ex: 'Tube 40x40')
  numberOfRails?: number;                    // Nombre de lisses horizontales (2-4)

  // Spécifique VERTICAL_BARS
  barSpacing?: number;                       // Espacement des barreaux (mm) - max 110mm pour ERP
  barProfile?: string;                       // Profil des barreaux (ex: 'Rond Ø12', 'Carré 10x10')

  // Spécifique CABLE
  cableCount?: number;                       // Nombre de câbles (4-6)
  cableDiameter?: number;                    // Diamètre du câble (mm) - 6 ou 8mm

  // Spécifique MESH_PANEL
  meshSize?: string;                         // Taille de maille (ex: '50x50', '100x100')
  meshWireDiameter?: number;                 // Diamètre du fil (mm) - 5 ou 6mm

  // Spécifique SOLID_PANEL / PERFORATED_PANEL
  panelThickness?: number;                   // Épaisseur tôle (mm) - 2, 2.5, 3mm
  perforationPattern?: string;               // Motif de perforation (ex: 'R5T8', 'decorative')

  // Spécifique GLASS
  glassThickness?: number;                   // Épaisseur du verre (mm) - 10 ou 12mm
  glassType?: 'laminated' | 'tempered';      // Type de verre (feuilleté ou trempé)

  // Spécifique MIXED types
  mixedLowerFillHeight?: number;             // Hauteur du remplissage inférieur (mm) - pour mixtes
}

/**
 * Dimensions d'une ouverture
 */
export interface OpeningDimensions {
  width: number;          // Largeur de l'ouverture (mm)
  height: number;         // Hauteur de l'ouverture (mm)
  depth?: number;         // Profondeur (pour exutoires/lanterneaux en couverture)
}

/**
 * Ossature secondaire pour une ouverture
 */
export interface OpeningFraming {
  // Ossature secondaire
  verticalPosts: boolean;      // Potelets verticaux
  lintel: boolean;             // Linteau horizontal
  sill: boolean;               // Seuil/appui
  cheveture: boolean;          // Chevêtre (couverture)

  // Profils utilisés
  postProfile?: string;        // Profil potelets (ex: 'UAP 80')
  lintelProfile?: string;      // Profil linteau (ex: 'IPE 120')
  sillProfile?: string;        // Profil seuil (ex: 'UAP 65')

  // Renforts
  reinforcement?: boolean;     // Renfort supplémentaire
  reinforcementProfile?: string; // Profil de renfort
}

/**
 * Configuration d'une ouverture
 */
export interface BuildingOpening {
  id: string;
  name: string;
  type: OpeningType;
  position: OpeningPosition;

  // Référence à la structure (bâtiment principal ou extension)
  structureId?: string;        // undefined = bâtiment principal, sinon ID extension

  // Positionnement précis
  bayIndex?: number;           // Index de travée (pour long-pan et couverture)
  offsetX?: number;            // Décalage horizontal dans la travée (mm)
  offsetY: number;             // Hauteur depuis sol (mm) - ou position sur pente
  offsetZ?: number;            // Position en largeur (pour pignon et couverture)

  // Dimensions
  dimensions: OpeningDimensions;

  // Ossature secondaire
  framing: OpeningFraming;

  // Propriétés spécifiques
  properties?: {
    // Portes
    openingDirection?: 'left' | 'right' | 'up';  // Sens d'ouverture
    motorized?: boolean;                          // Motorisée (sectionnelle, rideau)

    // Fenêtres/baies
    glazingType?: 'single' | 'double' | 'triple'; // Type de vitrage
    frameColor?: string;                           // Couleur châssis
    frameMaterial?: 'aluminum' | 'pvc' | 'wood';  // Matériau châssis

    // Exutoires
    smokeVentClass?: 'DENFC' | 'NFC';             // Classe exutoire
    openingSystem?: 'manual' | 'automatic';        // Système d'ouverture
    openingPercentage?: number;                    // Pourcentage d'ouverture (%)
  };
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

// ============================================================================
// ENVELOPPE : BARDAGE ET COUVERTURE
// ============================================================================

/**
 * Types de bardage
 */
export enum CladingType {
  BAC_ACIER = 'bac_acier',                    // Bac acier simple peau
  PANNEAU_SANDWICH = 'panneau_sandwich',      // Panneau sandwich isolant
  BARDAGE_BOIS = 'bardage_bois',              // Bardage bois
  BARDAGE_COMPOSITE = 'bardage_composite',    // Bardage composite
  BARDAGE_FIBROCIMENT = 'bardage_fibrociment', // Fibro-ciment
  BARDAGE_METALLIQUE = 'bardage_metallique',  // Cassettes métalliques
  NONE = 'none'                               // Pas de bardage
}

/**
 * Types de couverture
 */
export enum RoofingType {
  BAC_ACIER = 'bac_acier',                    // Bac acier simple peau
  PANNEAU_SANDWICH = 'panneau_sandwich',      // Panneau sandwich isolant
  TUILES = 'tuiles',                          // Tuiles terre cuite/béton
  ARDOISES = 'ardoises',                      // Ardoises naturelles/synthétiques
  MEMBRANE_ETANCHEITE = 'membrane_etancheite', // Membrane d'étanchéité (toit plat)
  BETON = 'beton',                            // Dalle béton (toit plat)
  NONE = 'none'                               // Pas de couverture
}

/**
 * Profils de bac acier
 */
export enum SteelProfileType {
  T20 = 'T20',       // Trapèze 20mm
  T35 = 'T35',       // Trapèze 35mm
  T40 = 'T40',       // Trapèze 40mm
  T45 = 'T45',       // Trapèze 45mm
  T60 = 'T60',       // Trapèze 60mm
  T100 = 'T100',     // Trapèze 100mm
  T150 = 'T150',     // Trapèze 150mm
  ONDULE = 'ondule'  // Tôle ondulée
}

/**
 * Sens de pose du bardage
 */
export enum CladingOrientation {
  VERTICAL = 'vertical',     // Pose verticale (lames verticales)
  HORIZONTAL = 'horizontal'  // Pose horizontale (lames horizontales)
}

/**
 * Configuration du bardage
 */
export interface CladingConfig {
  enabled: boolean;
  type: CladingType;

  // Faces équipées
  sides?: string[];  // ['front', 'back', 'left', 'right']

  // Spécifications techniques
  profile?: SteelProfileType;        // Pour bac acier
  thickness?: number;                // Épaisseur (mm) pour panneaux sandwich
  insulation?: number;               // Épaisseur isolant (mm) pour panneaux sandwich
  orientation?: CladingOrientation;  // Sens de pose

  // Finitions
  color?: string;                    // Couleur (RAL ou hex)
  finish?: 'mat' | 'brillant' | 'satine';  // Finition de surface

  // Options
  withVapourBarrier?: boolean;       // Pare-vapeur
  withWindBarrier?: boolean;         // Pare-pluie
}

/**
 * Configuration de la couverture
 */
export interface RoofingConfig {
  enabled: boolean;
  type: RoofingType;

  // Spécifications techniques
  profile?: SteelProfileType;        // Pour bac acier
  thickness?: number;                // Épaisseur (mm) pour panneaux sandwich
  insulation?: number;               // Épaisseur isolant (mm) pour panneaux sandwich

  // Finitions
  color?: string;                    // Couleur (RAL ou hex)
  finish?: 'mat' | 'brillant' | 'satine';  // Finition de surface

  // Options
  withVapourBarrier?: boolean;       // Pare-vapeur
  withWaterproofing?: boolean;       // Étanchéité supplémentaire
  slope?: number;                    // Pente minimale (%) pour évacuation

  // Spécificités tuiles/ardoises
  tileModel?: string;                // Modèle de tuile
  overlap?: number;                  // Recouvrement (mm)
}

/**
 * Configuration complète de l'enveloppe par structure
 */
export interface EnvelopeConfig {
  clading?: CladingConfig;
  roofing?: RoofingConfig;
}

// ============================================================================
// FINITIONS : PEINTURE, TRAITEMENT ET OPTIONS
// ============================================================================

/**
 * Types de peinture disponibles
 */
export enum PaintingType {
  NONE = 'none',
  GALVANISATION = 'galvanisation',
  THERMOLAQUAGE = 'thermolaquage',
  PEINTURE_LIQUIDE = 'peinture_liquide',
  PEINTURE_POUDRE = 'peinture_poudre',
  METALLISATION = 'metallisation'
}

/**
 * Types de traitement de surface
 */
export enum SurfaceTreatmentType {
  NONE = 'none',
  SABLAGE = 'sablage',
  GRENAILLAGE = 'grenaillage',
  PASSIVATION = 'passivation',
  PHOSPHATATION = 'phosphatation',
  ANODISATION = 'anodisation'
}

/**
 * Finition de peinture
 */
export enum PaintFinish {
  MAT = 'mat',
  SATINE = 'satine',
  BRILLANT = 'brillant',
  TEXTURE = 'texture'
}

/**
 * Application de la peinture/traitement
 */
export interface PaintingApplication {
  structure?: boolean;          // Structure porteuse
  secondaryFraming?: boolean;   // Ossature secondaire
  envelope?: boolean;           // Enveloppe (bardage/couverture)
  equipment?: boolean;          // Équipements (garde-corps, acrotères)
}

/**
 * Configuration de peinture et traitement
 */
export interface PaintingConfig {
  enabled: boolean;
  paintingType: PaintingType;
  surfaceTreatment?: SurfaceTreatmentType;
  color?: string;
  ralCode?: string;
  finish?: PaintFinish;
  thickness?: number;               // Épaisseur en microns
  coats?: number;                   // Nombre de couches
  application?: PaintingApplication;
  withPrimer?: boolean;            // Sous-couche
  withTopCoat?: boolean;           // Couche de finition
}

/**
 * Types d'accessoires disponibles
 */
export enum AccessoryType {
  GUTTERS = 'gutters',                    // Gouttières
  DOWNSPOUTS = 'downspouts',              // Descentes EP
  FLASHINGS = 'flashings',                // Bavettes et bandes de rives
  RIDGE_CAPS = 'ridge_caps',              // Faîtages
  VENTILATION = 'ventilation',            // Ventilations naturelles
  SMOKE_VENTS = 'smoke_vents',            // Exutoires de fumée
  LIGHTNING_PROTECTION = 'lightning_protection',  // Paratonnerre
  FALL_PROTECTION = 'fall_protection',    // Ligne de vie
  ACCESS_LADDER = 'access_ladder',        // Échelle d'accès
  WALKWAYS = 'walkways',                  // Passerelles de circulation
  INSULATION_STOPS = 'insulation_stops',  // Arrêts de neige
  BIRD_PROTECTION = 'bird_protection'     // Protection oiseaux
}

/**
 * Configuration d'un accessoire
 */
export interface AccessoryItem {
  id: string;
  type: AccessoryType;
  enabled: boolean;
  quantity?: number;
  length?: number;              // Longueur totale en mm
  color?: string;
  material?: string;
  position?: string;            // Description de la position
  sides?: string[];             // Faces concernées
  notes?: string;
}

/**
 * Configuration des accessoires
 */
export interface AccessoriesConfig {
  enabled: boolean;
  items: AccessoryItem[];
}

/**
 * Types d'options diverses
 */
export enum OptionType {
  THERMAL_BRIDGE_BREAK = 'thermal_bridge_break',     // Rupteur de ponts thermiques
  ACOUSTIC_INSULATION = 'acoustic_insulation',       // Isolation acoustique renforcée
  FIRE_PROTECTION = 'fire_protection',               // Protection incendie
  SEISMIC_REINFORCEMENT = 'seismic_reinforcement',   // Renforcement sismique
  WIND_BRACING = 'wind_bracing',                     // Contreventement renforcé
  CONDENSATION_CONTROL = 'condensation_control',     // Contrôle de condensation
  EXTENDED_WARRANTY = 'extended_warranty',           // Garantie étendue
  MAINTENANCE_CONTRACT = 'maintenance_contract',     // Contrat de maintenance
  BIM_MODEL = 'bim_model',                          // Modèle BIM fourni
  EXECUTION_DRAWINGS = 'execution_drawings',         // Plans d'exécution
  STRUCTURAL_CALCULATIONS = 'structural_calculations', // Notes de calcul
  ASSEMBLY_INSTRUCTIONS = 'assembly_instructions'    // Notice de montage
}

/**
 * Configuration d'une option
 */
export interface OptionItem {
  id: string;
  type: OptionType;
  enabled: boolean;
  level?: string;               // Niveau de l'option (standard, renforcé, maximum)
  duration?: number;            // Durée (pour garantie, maintenance) en mois
  format?: string;              // Format (pour documents)
  notes?: string;
}

/**
 * Configuration des options diverses
 */
export interface OptionsConfig {
  enabled: boolean;
  items: OptionItem[];
}

/**
 * Configuration complète des finitions par structure
 */
export interface FinishingConfig {
  painting?: PaintingConfig;
  accessories?: AccessoriesConfig;
  options?: OptionsConfig;
}

/**
 * Union type pour tous les types de bâtiments
 * Note: OmbriereBuilding est importé via type import pour éviter les dépendances circulaires
 */
export type Building =
  | MonoPenteBuilding
  | BiPenteBuilding
  | BiPenteAsymBuilding
  | AuventBuilding
  | PlancherBuilding
  | import('./ombriere.types').OmbriereBuilding;
