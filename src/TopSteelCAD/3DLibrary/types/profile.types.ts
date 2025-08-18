/**
 * Types pour la base de données des profilés métalliques
 * Conforme aux normes EN 10025 et Eurocodes
 */

// Export MaterialType depuis material-types pour compatibilité
export { MaterialType } from './material-types';

// Énumérations pour les types de profilés
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
  L_EQUAL = 'L_EQUAL',
  L_UNEQUAL = 'L_UNEQUAL',
  
  // Tubes
  TUBE_SQUARE = 'TUBE_SQUARE',
  TUBE_RECTANGULAR = 'TUBE_RECTANGULAR',
  TUBE_CIRCULAR = 'TUBE_CIRCULAR',
  
  // Plats et barres
  FLAT = 'FLAT',
  ROUND_BAR = 'ROUND_BAR',
  SQUARE_BAR = 'SQUARE_BAR',
  
  // Profilés fermés
  RHS = 'RHS', // Rectangular Hollow Section
  SHS = 'SHS', // Square Hollow Section
  CHS = 'CHS', // Circular Hollow Section
  
  // Profilés en T
  T_PROFILE = 'T_PROFILE',
  TEE = 'TEE',
  
  // Profilés formés à froid
  Z_PROFILE = 'Z_PROFILE',
  C_PROFILE = 'C_PROFILE', 
  SIGMA_PROFILE = 'SIGMA_PROFILE',
  OMEGA_PROFILE = 'OMEGA_PROFILE',
  
  // Profilés américains AISC
  W_SHAPE = 'W_SHAPE',
  S_SHAPE = 'S_SHAPE', 
  HP_SHAPE = 'HP_SHAPE',
  
  // Types additionnels pour TopSteelCAD
  PLATE = 'PLATE',        // Plaques et tôles
  FASTENER = 'FASTENER',  // Éléments de fixation (boulons, écrous, etc.)
  WELD = 'WELD'           // Soudures
}

// Dimensions des profilés
export interface ProfileDimensions {
  // Identification (optionnel)
  designation?: string;  // Désignation du profil
  
  // Dimensions générales
  height?: number;       // Hauteur (h) en mm
  width?: number;        // Largeur (b) en mm
  length?: number;       // Longueur en mm
  
  // Épaisseurs
  webThickness?: number;     // Épaisseur de l'âme (tw) en mm
  flangeThickness?: number;  // Épaisseur de la semelle (tf) en mm
  thickness?: number;        // Épaisseur générale (t) en mm
  
  // Dimensions spécifiques aux tubes
  diameter?: number;         // Diamètre extérieur (D) en mm
  outerDiameter?: number;    // Diamètre extérieur (D) en mm (alias)
  innerDiameter?: number;    // Diamètre intérieur en mm
  wallThickness?: number;    // Épaisseur de paroi en mm
  
  // Rayons et angles
  rootRadius?: number;       // Rayon de raccordement (r) en mm
  toeRadius?: number;        // Rayon en bout de semelle en mm
  outerRadius?: number;      // Rayon extérieur (pour tubes) en mm
  innerRadius?: number;      // Rayon intérieur (pour tubes) en mm
  
  // Cornières
  leg1Length?: number;       // Longueur première aile en mm
  leg2Length?: number;       // Longueur deuxième aile en mm
  
  // Dimensions supplémentaires
  lipLength?: number;        // Longueur de lèvre (pour profilés formés à froid)
  lipAngle?: number;         // Angle de lèvre en degrés
  webAngle?: number;         // Angle de l'âme en degrés
  topWidth?: number;         // Largeur en tête (pour UPN)
}

// Propriétés simplifiées (pour tubes et autres profilés simples)
export interface ProfileProperties {
  momentOfInertiaY?: number;     // Moment d'inertie Y (cm⁴)
  momentOfInertiaZ?: number;     // Moment d'inertie Z (cm⁴)
  radiusOfGyrationY?: number;    // Rayon de giration Y (cm)
  radiusOfGyrationZ?: number;    // Rayon de giration Z (cm)
  elasticModulusY?: number;      // Module élastique Y (cm³)
  elasticModulusZ?: number;      // Module élastique Z (cm³)
  plasticModulusY?: number;      // Module plastique Y (cm³)
  plasticModulusZ?: number;      // Module plastique Z (cm³)
  torsionalConstant?: number;    // Constante de torsion (cm⁴)
  warpingConstant?: number;      // Constante de gauchissement (cm⁶)
}

// Propriétés d'inertie
export interface ProfileInertia {
  Iyy: number;  // Moment d'inertie selon l'axe fort (cm⁴)
  Izz: number;  // Moment d'inertie selon l'axe faible (cm⁴)
  Iyz?: number; // Produit d'inertie (cm⁴)
  It: number;   // Moment d'inertie de torsion (cm⁴)
  Iw?: number;  // Moment d'inertie de gauchissement (cm⁶)
}

// Modules élastiques
export interface ProfileElasticModulus {
  Wely: number;  // Module élastique selon l'axe fort (cm³)
  Welz: number;  // Module élastique selon l'axe faible (cm³)
}

// Modules plastiques
export interface ProfilePlasticModulus {
  Wply: number;  // Module plastique selon l'axe fort (cm³)
  Wplz: number;  // Module plastique selon l'axe faible (cm³)
}

// Rayons de giration
export interface ProfileRadiusOfGyration {
  iy: number;  // Rayon de giration selon l'axe fort (cm)
  iz: number;  // Rayon de giration selon l'axe faible (cm)
  iu?: number; // Rayon de giration selon l'axe u (cm)
  iv?: number; // Rayon de giration selon l'axe v (cm)
}

// Propriétés de section
export interface SectionProperties {
  // Position du centre de gravité
  zg?: number;  // Distance du CDG à la face extérieure (cm)
  yg?: number;  // Distance du CDG à la face extérieure (cm)
  
  // Facteurs de forme
  av?: number;  // Aire de cisaillement selon y (cm²)
  az?: number;  // Aire de cisaillement selon z (cm²)
  
  // Propriétés supplémentaires
  ss?: number;  // Paramètre de section (pour calcul de flambement)
  al?: number;  // Périmètre exposé au feu par unité de longueur (m²/m)
  ag?: number;  // Périmètre de la section brute (mm)
}

// Grade d'acier
export interface SteelGrade {
  designation: string;     // Ex: 'S355'
  yieldStrength: number;   // Limite élastique fy (MPa)
  tensileStrength: number; // Résistance à la traction fu (MPa)
  elongation?: number;     // Allongement à la rupture (%)
  impact?: number;         // Résilience (J)
  standard?: string;       // Norme de référence
}

// Résistances calculées
export interface ProfileResistance {
  // Efforts normaux
  tensionResistance: number;      // Résistance en traction (kN)
  compressionResistance: number;  // Résistance en compression (kN)
  
  // Moments
  elasticMomentY: number;  // Moment résistant élastique Mcy (kNm)
  elasticMomentZ: number;  // Moment résistant élastique Mcz (kNm)
  plasticMomentY: number;  // Moment résistant plastique Mpy (kNm)
  plasticMomentZ: number;  // Moment résistant plastique Mpz (kNm)
  
  // Efforts tranchants
  shearResistanceY: number;  // Résistance au cisaillement Vy (kN)
  shearResistanceZ: number;  // Résistance au cisaillement Vz (kN)
  
  // Flambement (optionnel, dépend de la longueur)
  bucklingResistance?: number;  // Résistance au flambement (kN)
  lateralBucklingMoment?: number; // Moment de déversement (kNm)
}

// Interface principale pour un profilé
export interface SteelProfile {
  // Identification
  id: string;                    // Identifiant unique
  type: ProfileType;             // Type de profilé
  designation: string;           // Désignation normalisée (ex: 'IPE 300')
  
  // Géométrie
  dimensions: ProfileDimensions; // Dimensions du profilé
  
  // Propriétés mécaniques
  weight: number;                // Poids linéique (kg/m)
  area: number;                  // Aire de la section (cm²)
  perimeter?: number;            // Périmètre (mm)
  
  // Caractéristiques mécaniques (optionnelles pour certains profilés)
  inertia?: ProfileInertia;
  elasticModulus?: ProfileElasticModulus;
  plasticModulus?: ProfilePlasticModulus;
  radiusOfGyration?: ProfileRadiusOfGyration;
  sectionProperties?: SectionProperties;
  
  // Propriétés simplifiées pour tubes (optionnel)
  properties?: ProfileProperties;
  
  // Références
  source?: string;               // Source/Norme (ex: 'EN 10365')
  origin?: string;               // Origine (database, generated, imported, etc.)
  category?: string;             // Catégorie (laminé à chaud, formé à froid, etc.)
  
  // Métadonnées
  metadata?: {
    manufacturer?: string;
    availableLengths?: number[];
    tolerance?: string;
    surfaceFinish?: string;
    [key: string]: any;
  };
  
  // Optimisation pour la recherche
  searchTags?: string[];         // Tags pour faciliter la recherche
  aliases?: string[];            // Désignations alternatives
}

// Filtre de recherche
export interface ProfileFilter {
  // Filtres par type
  types?: ProfileType[];
  
  // Filtres par dimensions
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minWeight?: number;
  maxWeight?: number;
  
  // Filtres par propriétés
  minArea?: number;
  maxArea?: number;
  minInertiaY?: number;
  maxInertiaY?: number;
  
  // Filtres par source/norme
  sources?: string[];
  categories?: string[];
  
  // Recherche textuelle
  searchText?: string;
  
  // Options de tri
  sortBy?: 'weight' | 'height' | 'width' | 'area' | 'designation';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

// Type pour les calculs
export interface ProfileCalculation {
  profile: SteelProfile;
  length: number;        // Longueur en mm
  steelGrade: SteelGrade;
  
  // Résultats calculés
  totalWeight?: number;  // Poids total en kg
  paintingSurface?: number; // Surface à peindre en m²
  resistance?: ProfileResistance;
  sectionClass?: number; // Classe de section (1, 2, 3 ou 4)
}

// Export des types pour utilisation externe
export type ProfileMap = Map<ProfileType, SteelProfile[]>;
export type ProfileIndex = Map<string, SteelProfile>;
export type ProfileSearchResult = {
  profile: SteelProfile;
  score?: number;  // Score de pertinence pour la recherche
};