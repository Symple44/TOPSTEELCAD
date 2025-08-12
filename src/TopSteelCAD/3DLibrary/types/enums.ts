/**
 * Énumérations communes pour les profilés métalliques
 */

// Catégories de profilés
export enum ProfileCategory {
  HOT_ROLLED = 'HOT_ROLLED',           // Laminé à chaud
  COLD_FORMED = 'COLD_FORMED',         // Formé à froid
  WELDED = 'WELDED',                   // Soudé
  EXTRUDED = 'EXTRUDED',               // Extrudé
}

// Normes de référence
export enum ProfileStandard {
  EN_10025 = 'EN 10025',   // Aciers de construction
  EN_10365 = 'EN 10365',   // Profilés en I et H laminés à chaud
  EN_10056 = 'EN 10056',   // Cornières à ailes égales et inégales
  EN_10279 = 'EN 10279',   // Profilés en U laminés à chaud
  EN_10210 = 'EN 10210',   // Profilés creux finis à chaud
  EN_10219 = 'EN 10219',   // Profilés creux soudés formés à froid
  DIN_1025 = 'DIN 1025',   // Ancienne norme allemande pour IPE/HEA/HEB
  NF_A_45 = 'NF A 45',     // Norme française
  ASTM_A36 = 'ASTM A36',   // Norme américaine
  BS_4 = 'BS 4',           // Norme britannique
}

// Classes de section selon Eurocode 3
export enum SectionClass {
  CLASS_1 = 1,  // Section plastique
  CLASS_2 = 2,  // Section compacte
  CLASS_3 = 3,  // Section semi-compacte
  CLASS_4 = 4,  // Section élancée
}

// Types de finition de surface
export enum SurfaceFinish {
  BLACK = 'BLACK',             // Brut de laminage
  GALVANIZED = 'GALVANIZED',   // Galvanisé
  PAINTED = 'PAINTED',         // Peint
  PRIMED = 'PRIMED',           // Avec primaire
  SHOT_BLASTED = 'SHOT_BLASTED', // Grenaillé
}

// Grades d'acier courants
export enum SteelGradeType {
  S235 = 'S235',
  S275 = 'S275',
  S355 = 'S355',
  S420 = 'S420',
  S460 = 'S460',
  S500 = 'S500',
  S550 = 'S550',
  S620 = 'S620',
  S690 = 'S690',
  S890 = 'S890',
  S960 = 'S960',
}

// Variantes de qualité
export enum QualityVariant {
  JR = 'JR',   // 27J à 20°C
  J0 = 'J0',   // 27J à 0°C
  J2 = 'J2',   // 27J à -20°C
  K2 = 'K2',   // 40J à -20°C
  M = 'M',     // Laminage thermomécanique
  N = 'N',     // Laminage normalisant
  Q = 'Q',     // Trempé et revenu
  W = 'W',     // Résistant aux intempéries
}

// Applications typiques
export enum ProfileApplication {
  STRUCTURAL = 'STRUCTURAL',           // Structure porteuse
  SECONDARY = 'SECONDARY',             // Structure secondaire
  FACADE = 'FACADE',                   // Façade
  ROOF = 'ROOF',                       // Toiture
  FOUNDATION = 'FOUNDATION',           // Fondation
  CRANE_RAIL = 'CRANE_RAIL',          // Rail de pont roulant
  BRIDGE = 'BRIDGE',                   // Pont
  INDUSTRIAL = 'INDUSTRIAL',           // Bâtiment industriel
  RESIDENTIAL = 'RESIDENTIAL',         // Bâtiment résidentiel
  COMMERCIAL = 'COMMERCIAL',           // Bâtiment commercial
}

// Méthodes de fabrication
export enum ManufacturingMethod {
  HOT_ROLLING = 'HOT_ROLLING',         // Laminage à chaud
  COLD_ROLLING = 'COLD_ROLLING',       // Laminage à froid
  COLD_FORMING = 'COLD_FORMING',       // Formage à froid
  WELDING = 'WELDING',                 // Soudage
  EXTRUSION = 'EXTRUSION',             // Extrusion
}

// Types de connexion
export enum ConnectionType {
  BOLTED = 'BOLTED',                   // Boulonné
  WELDED = 'WELDED',                   // Soudé
  RIVETED = 'RIVETED',                 // Riveté
  PINNED = 'PINNED',                   // Articulé
  RIGID = 'RIGID',                     // Encastré
  SEMI_RIGID = 'SEMI_RIGID',           // Semi-rigide
}

// Types de charges
export enum LoadType {
  DEAD = 'DEAD',                       // Charge permanente
  LIVE = 'LIVE',                       // Charge d'exploitation
  WIND = 'WIND',                       // Charge de vent
  SNOW = 'SNOW',                       // Charge de neige
  SEISMIC = 'SEISMIC',                 // Charge sismique
  THERMAL = 'THERMAL',                 // Charge thermique
  ACCIDENTAL = 'ACCIDENTAL',           // Charge accidentelle
}

// États limites
export enum LimitState {
  ULS = 'ULS',  // Ultimate Limit State (ELU)
  SLS = 'SLS',  // Serviceability Limit State (ELS)
  FLS = 'FLS',  // Fatigue Limit State
  ALS = 'ALS',  // Accidental Limit State
}

// Coefficients partiels de sécurité
export const SafetyFactors = {
  GAMMA_M0: 1.00,  // Résistance des sections
  GAMMA_M1: 1.00,  // Résistance au flambement
  GAMMA_M2: 1.25,  // Résistance des assemblages
  GAMMA_M3: 1.25,  // Glissement des assemblages précontraints
  GAMMA_M4: 1.00,  // Résistance des tiges d'ancrage
  GAMMA_M5: 1.00,  // Résistance au voilement
} as const;

// Tolérances dimensionnelles (EN 10034)
export enum ToleranceClass {
  NORMAL = 'NORMAL',       // Tolérances normales
  SPECIAL = 'SPECIAL',     // Tolérances spéciales
  PRECISION = 'PRECISION', // Tolérances de précision
}

// Export des constantes utiles
export const STEEL_DENSITY = 7850; // kg/m³
export const STEEL_ELASTIC_MODULUS = 210000; // MPa (Module de Young)
export const STEEL_SHEAR_MODULUS = 81000; // MPa (Module de cisaillement)
export const STEEL_POISSON_RATIO = 0.3; // Coefficient de Poisson
export const STEEL_THERMAL_EXPANSION = 12e-6; // 1/°C (Coefficient de dilatation thermique)