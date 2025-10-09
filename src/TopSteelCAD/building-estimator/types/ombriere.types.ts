/**
 * Types pour les ombrières photovoltaïques
 * Building Estimator - TopSteelCAD
 */

import {
  Building,
  BuildingType,
  BuildingDimensions,
  BuildingParameters,
  BuildingStructure,
  StructuralElement,
  Opening
} from './building.types';

/**
 * Variantes structurelles d'ombrières
 * Définit le type de support et disposition des poteaux
 */
export enum OmbriereStructuralVariant {
  /**
   * Poteaux centrés
   * 1 poteau au centre de chaque travée
   * Avantages: Simple, économique
   * Usage: Petites/moyennes ombrières (< 20m portée)
   */
  CENTERED_POST = 'centered_post',

  /**
   * Double poteaux centrés
   * 2 poteaux espacés au centre de chaque travée
   * Avantages: Meilleure résistance, modulaire
   * Usage: Ombrières moyennes (15-30m portée)
   */
  DOUBLE_CENTERED_POST = 'double_centered_post',

  /**
   * En Y (poteau central bas, traverses hautes)
   * Un poteau central bas avec deux traverses latérales hautes descendant en pente
   * Avantages: Design élégant, bonne rigidité, drainage latéral
   * Usage: Ombrières design (10-25m portée), esthétique moderne
   */
  Y_SHAPED = 'y_shaped',

  /**
   * Poteau déporté unique (porte-à-faux)
   * Un seul poteau côté bas, poutre en console vers le haut
   * Avantages: Espace libre maximal, circulation optimale
   * Usage: Grandes ombrières (> 20m portée), parkings VL/PL
   */
  OFFSET_POST = 'offset_post'
}

/**
 * Dimensions spécifiques à une ombrière photovoltaïque
 */
export interface OmbriereDimensions {
  // Variante structurelle
  structuralVariant: OmbriereStructuralVariant;  // Type de structure porteuse

  // Dimensions de base
  length: number;                    // Longueur (mm)
  width: number;                     // Largeur (mm)
  clearHeight: number;               // Hauteur libre pour véhicules (mm)
  slope: number;                     // Pente (toujours 0 pour ombrière - structure plane)

  // Spécifique ombrière
  tilt: number;                      // Inclinaison panneaux solaires (degrés, 0-30°)
  numberOfParkingSpaces?: number;    // Nombre de places de parking
  parkingSpaceWidth?: number;        // Largeur d'une place (mm, défaut: 2500mm)
  parkingSpaceLength?: number;       // Longueur d'une place (mm, défaut: 5000mm)

  // Hauteur calculée
  maxHeight?: number;                // Hauteur maximale (clearHeight + hauteur structure + panneaux)
}

/**
 * Localisation géographique
 * Pour calculs de production solaire
 */
export interface Location {
  latitude: number;                  // Latitude (degrés, -90 à 90)
  longitude: number;                 // Longitude (degrés, -180 à 180)
  altitude: number;                  // Altitude (m)
}

/**
 * Configuration d'un panneau solaire
 */
export interface SolarPanelSpec {
  // Identification
  manufacturer: string;              // Fabricant (ex: "Longi", "JA Solar")
  model: string;                     // Modèle (ex: "LR5-72HPH-540M")

  // Dimensions physiques
  width: number;                     // Largeur (mm)
  height: number;                    // Hauteur (mm)
  thickness: number;                 // Épaisseur (mm)
  weight: number;                    // Poids (kg)

  // Caractéristiques électriques
  power: number;                     // Puissance nominale (Wc)
  voltage: number;                   // Tension nominale (V)
  current: number;                   // Courant nominal (A)
  efficiency: number;                // Rendement (%, 15-22%)

  // Technologie
  cellType: 'monocrystalline' | 'polycrystalline' | 'thin-film';
  numberOfCells: number;             // Nombre de cellules

  // Garanties
  powerWarranty?: number;            // Garantie puissance (années, 25-30)
  productWarranty?: number;          // Garantie produit (années, 10-15)
}

/**
 * Types de systèmes d'intégration pour panneaux solaires
 */
export enum MountingSystemType {
  // Systèmes à rails
  SINGLE_RAIL = 'single_rail',           // 1 rail par panneau (espacement minimal)
  DOUBLE_RAIL = 'double_rail',           // 2 rails par panneau (standard)
  TRIPLE_RAIL = 'triple_rail',           // 3 rails (poids neige élevé)

  // Systèmes sans rails
  DIRECT_CLAMP = 'direct_clamp',         // Fixation directe sur pannes (espacement minimal)

  // Systèmes avec structure
  BEAM_SYSTEM = 'beam_system',           // Système poutrelles (espacement variable)
  BALLASTED = 'ballasted'                // Système lesté (toiture terrasse)
}

/**
 * Configuration d'un système d'intégration
 */
export interface MountingSystemConfig {
  type: MountingSystemType;

  // Espacements typiques pour ce système (en mm)
  minRowSpacing: number;             // Espacement minimum entre rangées
  minColumnSpacing: number;          // Espacement minimum entre colonnes
  recommendedRowSpacing: number;     // Espacement recommandé entre rangées
  recommendedColumnSpacing: number;  // Espacement recommandé entre colonnes

  // Marges de sécurité
  edgeMarginLongitudinal: number;    // Marge côté long (mm)
  edgeMarginTransverse: number;      // Marge côté transverse (mm)

  // Compatibilité
  supportsPortrait: boolean;         // Supporte orientation portrait
  supportsLandscape: boolean;        // Supporte orientation paysage
  maxPanelWeight: number;            // Poids max du panneau (kg)
}

/**
 * Résultat du calepinage automatique
 */
export interface PanelLayoutResult {
  // Configuration optimale trouvée
  rows: number;                      // Nombre de rangées
  columns: number;                   // Nombre de colonnes
  orientation: 'landscape' | 'portrait';

  // Espacements utilisés
  rowSpacing: number;                // Espacement entre rangées (mm)
  columnSpacing: number;             // Espacement entre colonnes (mm)

  // Résultats
  totalPanels: number;               // Nombre total de panneaux
  totalPower: number;                // Puissance totale (Wc)
  coverageRatio: number;             // Taux de couverture (%)

  // Dimensions utilisées
  usedLength: number;                // Longueur utilisée (mm)
  usedWidth: number;                 // Largeur utilisée (mm)

  // Marges restantes
  marginFront: number;               // Marge avant (mm)
  marginBack: number;                // Marge arrière (mm)
  marginLeft: number;                // Marge gauche (mm)
  marginRight: number;               // Marge droite (mm)
}

/**
 * Configuration du système solaire
 */
export interface SolarArrayConfig {
  // Panneaux
  panel: SolarPanelSpec;             // Spécifications du panneau
  orientation: 'landscape' | 'portrait';  // Orientation des panneaux

  // Système d'intégration
  mountingSystem?: MountingSystemConfig;  // Système d'intégration

  // Disposition (peut être calculée automatiquement)
  rows?: number;                     // Nombre de rangées (auto si absent)
  columns?: number;                  // Nombre de colonnes par rangée (auto si absent)
  rowSpacing?: number;               // Espacement entre rangées (mm, auto si absent)
  columnSpacing?: number;            // Espacement entre colonnes (mm, auto si absent)

  // Options de calepinage automatique
  autoLayout?: boolean;              // Activer le calepinage automatique
  optimizeFor?: 'quantity' | 'coverage' | 'balanced';  // Critère d'optimisation

  // Marges personnalisées (optionnel, sinon utilise celles du système)
  customEdgeMarginLongitudinal?: number;
  customEdgeMarginTransverse?: number;

  // Optimisation
  tilt: number;                      // Inclinaison optimale (degrés)
  azimuth: number;                   // Azimut (degrés, 0=Nord, 180=Sud)

  // Protection
  antiReflectiveCoating: boolean;    // Traitement anti-reflet
  hailResistance: boolean;           // Résistance à la grêle

  // Calculs dérivés
  layout?: PanelLayoutResult;        // Résultat du calepinage
  totalPanels?: number;              // Nombre total de panneaux
  totalPower?: number;               // Puissance totale installée (kWc)
  totalArea?: number;                // Surface totale panneaux (m²)
}

/**
 * Configuration onduleur
 */
export interface InverterConfig {
  // Identification
  manufacturer: string;              // Fabricant (ex: "Huawei", "SMA")
  model: string;                     // Modèle

  // Caractéristiques
  power: number;                     // Puissance nominale (kW)
  efficiency: number;                // Rendement (%, 95-99%)
  numberOfMPPT: number;              // Nombre de MPPT

  // Installation
  quantity: number;                  // Nombre d'onduleurs
  position: {                        // Position
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Configuration chemin de câbles
 */
export interface CableTrayConfig {
  // Dimensions
  width: number;                     // Largeur (mm)
  height: number;                    // Hauteur (mm)
  length: number;                    // Longueur (mm)

  // Matériau
  material: 'aluminum' | 'galvanized_steel' | 'stainless_steel';

  // Position
  elevation: number;                 // Hauteur par rapport au sol (mm)

  // Protection
  coverType?: 'none' | 'perforated' | 'solid';
}

/**
 * Design électrique complet
 */
export interface ElectricalDesign {
  // Puissance
  totalPower: number;                // Puissance totale (kWc)
  totalPanels: number;               // Nombre total de panneaux

  // Onduleurs
  inverters: InverterConfig[];

  // Câblage
  cableTrays: CableTrayConfig[];
  dcCableLength: number;             // Longueur câbles DC (m)
  acCableLength: number;             // Longueur câbles AC (m)

  // Protection
  earthingSystem: 'TT' | 'TN' | 'IT'; // Système de mise à la terre
  surgeProt: boolean;                // Protection parafoudre

  // Production estimée
  annualProduction?: number;         // Production annuelle estimée (kWh/an)
  specificProduction?: number;       // Production spécifique (kWh/kWc/an)
}

/**
 * Panneau solaire (élément individuel)
 */
export interface SolarPanel {
  id: string;

  // Référence au modèle
  spec: SolarPanelSpec;

  // Position dans la grille
  row: number;
  column: number;

  // Position 3D
  position: {
    x: number;
    y: number;
    z: number;
  };

  // Orientation
  orientation: 'landscape' | 'portrait';
  tilt: number;                      // Inclinaison (degrés)
  azimuth: number;                   // Azimut (degrés)

  // État
  status: 'active' | 'inactive' | 'defective';

  // Connexions
  stringId?: string;                 // ID de la string
  inverterId?: string;               // ID de l'onduleur
}

/**
 * Structure spécifique ombrière
 */
export interface OmbriereStructure extends BuildingStructure {
  // Structure porteuse (comme hangar)
  posts: StructuralElement[];        // Poteaux
  beams: StructuralElement[];        // Poutres horizontales
  purlins: StructuralElement[];      // Pannes pour supporter panneaux
  bracing: StructuralElement[];      // Contreventement

  // Spécifique solaire
  solarPanels: SolarPanel[];         // Panneaux solaires
  solarFraming: StructuralElement[]; // Ossature support panneaux

  // Équipements électriques
  inverters: InverterConfig[];
  cableTrays: CableTrayConfig[];
}

/**
 * Bâtiment ombrière photovoltaïque
 */
export interface OmbriereBuilding {
  // Identification
  id: string;
  name: string;
  type: BuildingType.OMBRIERE;
  createdAt: Date;
  updatedAt: Date;

  // Données de base
  dimensions: OmbriereDimensions;
  parameters: BuildingParameters;

  // Structure
  structure: OmbriereStructure;

  // Ouvertures et finitions (non utilisées pour ombrières mais présentes pour compatibilité)
  openings: Opening[];
  finishes: any;  // Finishes type from building.types

  // Configuration solaire
  solarArray: SolarArrayConfig;
  electricalDesign: ElectricalDesign;

  // Parking
  parkingLayout?: {
    numberOfSpaces: number;
    spaceWidth: number;
    spaceLength: number;
    totalArea: number;               // Surface parking (m²)
  };

  // Performance
  performance?: {
    annualProduction: number;        // Production annuelle (kWh/an)
    specificProduction: number;      // Production spécifique (kWh/kWc/an)
    performanceRatio: number;        // Performance Ratio (%, 75-85%)
    carbonOffset: number;            // Économie CO2 (tonnes/an)
  };

  // Économie
  economics?: {
    installationCost: number;        // Coût installation (€)
    maintenanceCostPerYear: number;  // Coût maintenance annuel (€/an)
    energyValuePerYear: number;      // Valeur énergie produite (€/an)
    paybackPeriod: number;           // Retour sur investissement (années)
    roi25Years: number;              // ROI sur 25 ans (%)
  };

  // Métadonnées
  metadata?: {
    author?: string;
    project?: string;
    notes?: string;
  };
}

/**
 * Spécifications de panneaux solaires courants
 */
export const COMMON_SOLAR_PANELS: Record<string, SolarPanelSpec> = {
  'longi-540w': {
    manufacturer: 'LONGi',
    model: 'LR5-72HPH-540M',
    width: 2278,
    height: 1134,
    thickness: 35,
    weight: 28.6,
    power: 540,
    voltage: 49.5,
    current: 10.91,
    efficiency: 20.9,
    cellType: 'monocrystalline',
    numberOfCells: 144,
    powerWarranty: 30,
    productWarranty: 15
  },
  'ja-solar-550w': {
    manufacturer: 'JA Solar',
    model: 'JAM72S30-550/MR',
    width: 2278,
    height: 1134,
    thickness: 35,
    weight: 28.5,
    power: 550,
    voltage: 49.8,
    current: 11.04,
    efficiency: 21.3,
    cellType: 'monocrystalline',
    numberOfCells: 144,
    powerWarranty: 30,
    productWarranty: 12
  },
  'trina-600w': {
    manufacturer: 'Trina Solar',
    model: 'TSM-DEG21C.20',
    width: 2384,
    height: 1303,
    thickness: 35,
    weight: 33.2,
    power: 600,
    voltage: 45.7,
    current: 13.13,
    efficiency: 21.5,
    cellType: 'monocrystalline',
    numberOfCells: 156,
    powerWarranty: 30,
    productWarranty: 15
  }
};

/**
 * Systèmes d'intégration prédéfinis
 */
export const MOUNTING_SYSTEMS: Record<string, MountingSystemConfig> = {
  'single-rail-standard': {
    type: MountingSystemType.SINGLE_RAIL,
    minRowSpacing: 30,
    minColumnSpacing: 20,
    recommendedRowSpacing: 50,
    recommendedColumnSpacing: 30,
    edgeMarginLongitudinal: 200,
    edgeMarginTransverse: 150,
    supportsPortrait: true,
    supportsLandscape: true,
    maxPanelWeight: 35
  },
  'double-rail-standard': {
    type: MountingSystemType.DOUBLE_RAIL,
    minRowSpacing: 40,
    minColumnSpacing: 25,
    recommendedRowSpacing: 80,
    recommendedColumnSpacing: 50,
    edgeMarginLongitudinal: 250,
    edgeMarginTransverse: 200,
    supportsPortrait: true,
    supportsLandscape: true,
    maxPanelWeight: 40
  },
  'double-rail-heavy': {
    type: MountingSystemType.DOUBLE_RAIL,
    minRowSpacing: 50,
    minColumnSpacing: 30,
    recommendedRowSpacing: 100,
    recommendedColumnSpacing: 60,
    edgeMarginLongitudinal: 300,
    edgeMarginTransverse: 250,
    supportsPortrait: true,
    supportsLandscape: true,
    maxPanelWeight: 45
  },
  'triple-rail-snow': {
    type: MountingSystemType.TRIPLE_RAIL,
    minRowSpacing: 60,
    minColumnSpacing: 35,
    recommendedRowSpacing: 120,
    recommendedColumnSpacing: 70,
    edgeMarginLongitudinal: 350,
    edgeMarginTransverse: 300,
    supportsPortrait: true,
    supportsLandscape: true,
    maxPanelWeight: 50
  },
  'direct-clamp-minimal': {
    type: MountingSystemType.DIRECT_CLAMP,
    minRowSpacing: 20,
    minColumnSpacing: 15,
    recommendedRowSpacing: 30,
    recommendedColumnSpacing: 20,
    edgeMarginLongitudinal: 150,
    edgeMarginTransverse: 100,
    supportsPortrait: true,
    supportsLandscape: true,
    maxPanelWeight: 30
  },
  'beam-system-optimized': {
    type: MountingSystemType.BEAM_SYSTEM,
    minRowSpacing: 50,
    minColumnSpacing: 30,
    recommendedRowSpacing: 100,
    recommendedColumnSpacing: 50,
    edgeMarginLongitudinal: 300,
    edgeMarginTransverse: 250,
    supportsPortrait: true,
    supportsLandscape: true,
    maxPanelWeight: 50
  }
};

/**
 * Configuration par défaut pour une ombrière
 */
export const DEFAULT_OMBRIERE_CONFIG = {
  dimensions: {
    length: 50000,                   // 50m (10 places x 5m)
    width: 20000,                    // 20m (4 rangées x 5m)
    clearHeight: 2500,               // 2.5m de hauteur libre
    slope: 0,
    tilt: 15,                        // 15° d'inclinaison
    numberOfParkingSpaces: 20,
    parkingSpaceWidth: 2500,
    parkingSpaceLength: 5000
  },
  solarArray: {
    panel: COMMON_SOLAR_PANELS['longi-540w'],
    orientation: 'landscape' as const,
    rows: 4,
    columns: 20,
    rowSpacing: 100,                 // 10cm entre panneaux
    columnSpacing: 50,               // 5cm entre panneaux
    tilt: 15,
    azimuth: 180,                    // Plein sud
    antiReflectiveCoating: true,
    hailResistance: true
  }
};
