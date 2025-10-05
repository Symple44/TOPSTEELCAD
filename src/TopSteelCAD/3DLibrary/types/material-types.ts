/**
 * Types centralisés pour tous les matériaux et éléments utilisés dans le viewer 3D
 * Centralise : profilés, plaques, boulonnerie, soudures, fixations
 */

// Types de matériaux principaux
export enum MaterialCategory {
  PROFILES = 'PROFILES',      // Profilés métalliques (IPE, HEA, etc.)
  PLATES = 'PLATES',          // Plaques et tôles
  FASTENERS = 'FASTENERS',    // Boulonnerie et fixations
  WELDS = 'WELDS',            // Soudures
  ACCESSORIES = 'ACCESSORIES'  // Accessoires divers
}

// Types de matériaux (pour compatibilité avec parsers)
export enum MaterialType {
  STEEL = 'STEEL',
  ALUMINUM = 'ALUMINUM',
  STAINLESS_STEEL = 'STAINLESS_STEEL',
  CAST_IRON = 'CAST_IRON',
  BRASS = 'BRASS',
  COPPER = 'COPPER',
  OTHER = 'OTHER'
}

// Types de profilés métalliques (existant, mais centralisé)
export enum ProfileType {
  // Profilés en I
  IPE = 'IPE',
  HEA = 'HEA', 
  HEB = 'HEB',
  HEM = 'HEM',
  
  // Profilés en U
  UPN = 'UPN',
  UAP = 'UAP',
  UPE = 'UPE',
  
  // Cornières
  L = 'L',
  LA = 'LA',

  // Tubes
  SHS = 'SHS',
  RHS = 'RHS',
  CHS = 'CHS',

  // Plats et barres
  FLAT = 'FLAT',
  ROUND_BAR = 'ROUND_BAR',
  SQUARE_BAR = 'SQUARE_BAR',

  // Profilé T
  T = 'T'
}

// Types de plaques et tôles
export enum PlateType {
  // Plaques standard
  STEEL_PLATE = 'STEEL_PLATE',
  STAINLESS_PLATE = 'STAINLESS_PLATE',
  ALUMINUM_PLATE = 'ALUMINUM_PLATE',
  
  // Tôles spécialisées
  CHECKERED_PLATE = 'CHECKERED_PLATE',      // Tôle larmée/striée
  PERFORATED_PLATE = 'PERFORATED_PLATE',    // Tôle perforée
  CORRUGATED_SHEET = 'CORRUGATED_SHEET',    // Tôle ondulée
  EXPANDED_METAL = 'EXPANDED_METAL',         // Métal déployé
  
  // Revêtements
  GALVANIZED_SHEET = 'GALVANIZED_SHEET',    // Tôle galvanisée
  PAINTED_SHEET = 'PAINTED_SHEET',          // Tôle pré-peinte
  
  // Tôles de couverture
  ROOF_SHEET = 'ROOF_SHEET',                // Bac acier de couverture
  WALL_SHEET = 'WALL_SHEET'                 // Bac acier de bardage
}

// Types de boulonnerie et fixations
export enum FastenerType {
  // Boulons standard
  HEX_BOLT = 'HEX_BOLT',                    // Boulon à tête hexagonale
  SOCKET_HEAD_BOLT = 'SOCKET_HEAD_BOLT',    // Boulon à tête cylindrique
  COUNTERSUNK_BOLT = 'COUNTERSUNK_BOLT',    // Boulon à tête fraisée
  
  // Vis
  HEX_SCREW = 'HEX_SCREW',                  // Vis à tête hexagonale
  PHILLIPS_SCREW = 'PHILLIPS_SCREW',        // Vis cruciforme
  TORX_SCREW = 'TORX_SCREW',                // Vis Torx
  
  // Écrous
  HEX_NUT = 'HEX_NUT',                      // Écrou hexagonal
  LOCK_NUT = 'LOCK_NUT',                    // Écrou de blocage
  SQUARE_NUT = 'SQUARE_NUT',                // Écrou carré
  
  // Rondelles
  PLAIN_WASHER = 'PLAIN_WASHER',            // Rondelle plate
  SPRING_WASHER = 'SPRING_WASHER',          // Rondelle grower
  LOCK_WASHER = 'LOCK_WASHER',              // Rondelle de blocage
  
  // Tiges filetées et accessoires
  THREADED_ROD = 'THREADED_ROD',            // Tige filetée
  COUPLING_NUT = 'COUPLING_NUT',            // Manchon de raccordement
  
  // Fixations spécialisées
  ANCHOR_BOLT = 'ANCHOR_BOLT',              // Boulon d'ancrage
  STUD_BOLT = 'STUD_BOLT',                  // Goujon fileté
  U_BOLT = 'U_BOLT',                        // Boulon en U
  EYE_BOLT = 'EYE_BOLT',                    // Boulon à œil
  
  // Rivets
  BLIND_RIVET = 'BLIND_RIVET',              // Rivet aveugle
  SOLID_RIVET = 'SOLID_RIVET',              // Rivet plein
  
  // Fixations pour structures
  BEAM_CLAMP = 'BEAM_CLAMP',                // Bride de poutre
  CHANNEL_CLIP = 'CHANNEL_CLIP',            // Clip de rail
  STRUT_CLAMP = 'STRUT_CLAMP',              // Collier de serrage
  
  // Ancrages et scellements
  ANCHOR_ROD = 'ANCHOR_ROD',                // Tige d'ancrage
  L_ANCHOR = 'L_ANCHOR',                    // Crosse d'ancrage
  J_ANCHOR = 'J_ANCHOR',                    // Ancrage en J
  HOOK_ANCHOR = 'HOOK_ANCHOR',              // Crochet d'ancrage
  WEDGE_ANCHOR = 'WEDGE_ANCHOR',            // Cheville à expansion
  CHEMICAL_ANCHOR = 'CHEMICAL_ANCHOR',       // Scellement chimique
  
  // Accessoires de levage
  LIFTING_EYE = 'LIFTING_EYE',              // Anneau de levage
  SHACKLE = 'SHACKLE',                      // Manille
  TURNBUCKLE = 'TURNBUCKLE',                // Ridoir
  WIRE_ROPE_CLIP = 'WIRE_ROPE_CLIP',        // Serre-câble
  
  // Accessoires de charpente
  BEARING_PAD = 'BEARING_PAD',              // Plaque d'appui
  EXPANSION_JOINT = 'EXPANSION_JOINT',       // Joint de dilatation
  DRAINAGE_SCUPPER = 'DRAINAGE_SCUPPER',     // Gargouille d'évacuation
  SAFETY_CABLE = 'SAFETY_CABLE'             // Câble de sécurité
}

// Types de soudures
export enum WeldType {
  FILLET_WELD = 'FILLET_WELD',              // Soudure d'angle
  BUTT_WELD = 'BUTT_WELD',                  // Soudure bout à bout
  GROOVE_WELD = 'GROOVE_WELD',              // Soudure en chanfrein
  PLUG_WELD = 'PLUG_WELD',                  // Soudure bouchon
  SEAM_WELD = 'SEAM_WELD',                  // Soudure continue
  SPOT_WELD = 'SPOT_WELD',                  // Soudure par points
  INTERMITTENT_WELD = 'INTERMITTENT_WELD'   // Soudure discontinue
}

// Grades d'acier standard
export enum SteelGrade {
  S235 = 'S235',
  S275 = 'S275',
  S355 = 'S355',
  S420 = 'S420',
  S460 = 'S460',
  INOX_304 = 'INOX_304',
  INOX_316 = 'INOX_316',
  ALUMINUM_5754 = 'ALUMINUM_5754',
  ALUMINUM_6061 = 'ALUMINUM_6061'
}

// Classes de résistance pour boulonnerie
export enum BoltStrengthClass {
  CLASS_4_6 = '4.6',
  CLASS_5_6 = '5.6', 
  CLASS_6_8 = '6.8',
  CLASS_8_8 = '8.8',
  CLASS_10_9 = '10.9',
  CLASS_12_9 = '12.9',
  INOX_A2_70 = 'A2-70',
  INOX_A4_80 = 'A4-80'
}

// Finitions de surface
export enum SurfaceFinish {
  RAW = 'RAW',                              // Brut
  GALVANIZED = 'GALVANIZED',                // Galvanisé
  PAINTED = 'PAINTED',                      // Peint
  POWDER_COATED = 'POWDER_COATED',          // Thermolaqué
  STAINLESS = 'STAINLESS',                  // Inoxydable
  ANODIZED = 'ANODIZED',                    // Anodisé (aluminium)
  ZINC_PLATED = 'ZINC_PLATED',              // Zingué
  CHROME_PLATED = 'CHROME_PLATED'           // Chromé
}

// Interface pour les dimensions génériques
export interface GenericDimensions {
  length?: number;        // Longueur (mm)
  width?: number;         // Largeur (mm)  
  height?: number;        // Hauteur (mm)
  thickness?: number;     // Épaisseur (mm)
  diameter?: number;      // Diamètre (mm)
  
  // Dimensions spécifiques aux profilés
  webThickness?: number;      // Épaisseur âme
  flangeThickness?: number;   // Épaisseur semelle
  flangeWidth?: number;       // Largeur semelle
  rootRadius?: number;        // Rayon de raccordement
  toeRadius?: number;         // Rayon en bout
  
  // Dimensions spécifiques aux fixations
  threadPitch?: number;       // Pas de vis
  headDiameter?: number;      // Diamètre de tête
  headHeight?: number;        // Hauteur de tête
  socketSize?: number;        // Taille d'empreinte
  driveSize?: number;         // Taille de clé
}

// Interface pour les propriétés matériau
export interface MaterialProperties {
  // Identification
  designation: string;        // Désignation (ex: "S355", "A4-80")
  grade: SteelGrade;         // Grade matériau
  finish: SurfaceFinish;     // Finition de surface
  
  // Propriétés mécaniques
  yieldStrength?: number;     // Limite élastique (MPa)
  tensileStrength?: number;   // Résistance traction (MPa) 
  elongation?: number;        // Allongement (%)
  hardness?: number;          // Dureté (HV/HB)
  
  // Propriétés physiques
  density?: number;           // Densité (kg/m³)
  thermalConductivity?: number; // Conductivité thermique
  coefficient?: number;       // Coeff. dilatation thermique
  
  // Standards et certifications
  standard?: string;          // Norme de référence
  certification?: string[];   // Certifications
}

// Interface unifiée pour tous les éléments
export interface UnifiedElement {
  // Identification
  id: string;
  name: string;
  description?: string;
  
  // Classification
  category: MaterialCategory;
  type: ProfileType | PlateType | FastenerType | WeldType;
  
  // Géométrie
  dimensions: GenericDimensions;
  
  // Matériau
  material: MaterialProperties;
  
  // Propriétés calculées
  weight?: number;            // Poids (kg/m ou kg/pièce)
  area?: number;              // Surface (m²)
  volume?: number;            // Volume (m³)
  
  // Métadonnées
  manufacturer?: string;
  partNumber?: string;
  availableLengths?: number[];
  minQuantity?: number;
  standardLengths?: number[];
  
  // Pour le rendu 3D
  visual?: {
    color?: string;
    metalness?: number;
    roughness?: number;
    opacity?: number;
    textureMap?: string;
  };
  
  // Tags pour recherche
  searchTags?: string[];
  aliases?: string[];
  
  // Source des données
  source: string;             // Norme ou catalogue
  dateAdded?: Date;
  dateModified?: Date;
}

// Types pour la recherche et filtrage
export interface ElementFilter {
  categories?: MaterialCategory[];
  types?: string[];
  grades?: SteelGrade[];
  finishes?: SurfaceFinish[];
  
  // Filtres dimensionnels
  minLength?: number;
  maxLength?: number;
  minDiameter?: number;
  maxDiameter?: number;
  minThickness?: number;
  maxThickness?: number;
  
  // Filtres par propriétés
  minWeight?: number;
  maxWeight?: number;
  
  // Recherche textuelle
  searchText?: string;
  manufacturers?: string[];
  standards?: string[];
  
  // Tri et pagination
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Export des énums pour compatibilité
export { MaterialCategory as Category };