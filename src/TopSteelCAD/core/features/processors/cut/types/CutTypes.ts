/**
 * CutTypes.ts - Définition des types de coupes pour l'industrie de la construction métallique
 * Basé sur les standards DSTV et les pratiques de l'industrie
 */

/**
 * Types de coupes géométriques
 * Organisés par catégorie fonctionnelle
 */
export enum CutType {
  // === Coupes basiques ===
  STRAIGHT_CUT = 'STRAIGHT_CUT',           // Coupe droite perpendiculaire
  ANGLE_CUT = 'ANGLE_CUT',                 // Coupe d'angle
  
  // === Coupes d'extrémité ===
  END_STRAIGHT = 'END_STRAIGHT',           // Coupe droite perpendiculaire
  END_ANGLE = 'END_ANGLE',                 // Coupe d'angle à l'extrémité
  END_COMPOUND = 'END_COMPOUND',           // Coupe composée multi-angles
  END_CHAMFER = 'END_CHAMFER',             // Chanfrein d'extrémité
  
  // === Coupes de type encoche (Notches) ===
  NOTCH_RECTANGULAR = 'NOTCH_RECTANGULAR', // Encoche rectangulaire standard
  NOTCH_CURVED = 'NOTCH_CURVED',           // Encoche arrondie/circulaire
  NOTCH_PARTIAL = 'NOTCH_PARTIAL',         // Encoche partielle (ne traverse pas)
  NOTCH_COMPOUND = 'NOTCH_COMPOUND',       // Encoche complexe multi-segments
  
  // === Coupes internes/externes sur profils ===
  INTERIOR_CUT = 'INTERIOR_CUT',           // Découpe à l'intérieur du profil
  EXTERIOR_CUT = 'EXTERIOR_CUT',           // Découpe sur le contour extérieur
  THROUGH_CUT = 'THROUGH_CUT',             // Traverse complètement le profil
  PARTIAL_CUT = 'PARTIAL_CUT',             // Coupe partielle en profondeur
  
  // === Coupes spécifiques plaques/préparation soudure ===
  BEVEL_CUT = 'BEVEL_CUT',                 // Coupe en biseau pour soudure
  CHAMFER_CUT = 'CHAMFER_CUT',             // Chanfrein général
  CONTOUR_CUT = 'CONTOUR_CUT',             // Découpe de contour complexe
  
  // === Coupes spécialisées ===
  COPING_CUT = 'COPING_CUT',               // Coupe d'assemblage profil-profil
  SLOT_CUT = 'SLOT_CUT',                   // Rainure/fente linéaire
  CUT_WITH_NOTCHES = 'CUT_WITH_NOTCHES',   // Coupe avec encoches préservées (M1002)
  UNRESTRICTED_CONTOUR = 'UNRESTRICTED_CONTOUR', // Contour libre sans contraintes
}

/**
 * Catégories de coupes (pour regroupement logique)
 */
export enum CutCategory {
  EXTERIOR = 'EXTERIOR',       // Modifie le contour extérieur
  INTERIOR = 'INTERIOR',       // Coupe interne au profil
  TRANSVERSE = 'TRANSVERSE',   // Traverse le profil
  COMPOUND = 'COMPOUND',       // Combinaison de plusieurs types
}

/**
 * Faces de profil selon DSTV
 */
export enum DSTVFace {
  V = 'v',  // Vorderseite - Web/Front face
  O = 'o',  // Oben - Top flange
  U = 'u',  // Unten - Bottom flange
  H = 'h',  // Hinten - Back face
}

/**
 * Paramètres de coupe communs
 */
export interface CutParameters {
  // Géométrie de base
  points?: Array<[number, number]>;        // Points du contour
  depth?: number;                           // Profondeur de coupe (0 = traverse)
  angle?: number;                           // Angle de coupe (degrés)
  radius?: number;                          // Rayon pour coupes arrondies
  
  // Positionnement
  position?: { x: number; y: number; z?: number };
  face?: DSTVFace | string;                // Face concernée
  
  // Paramètres spécialisés
  bevelAngle?: number;                      // Angle de biseau pour soudure
  chamferSize?: number;                     // Taille du chanfrein
  isTransverse?: boolean;                   // Traverse le profil
  cutType?: string;                         // Type spécifique (legacy)
  
  // Métadonnées
  id?: string;                              // Identifiant unique
  source?: 'DSTV' | 'USER' | 'SYSTEM';     // Origine de la coupe
}

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Métadonnées de coupe pour userData de la géométrie
 */
export interface CutMetadata {
  id: string;
  type: CutType;
  category: CutCategory;
  face?: DSTVFace | string;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  contourPoints?: Array<[number, number]>;
  depth?: number;
  angle?: number;
  timestamp?: number;
}

/**
 * Configuration de stratégie
 */
export interface StrategyConfig {
  priority: number;              // Ordre de priorité (plus élevé = plus prioritaire)
  enabled: boolean;              // Activé/désactivé
  fallbackStrategy?: string;     // Stratégie de repli si échec
}

/**
 * Types de profils supportés
 */
export enum ProfileType {
  I_PROFILE = 'I_PROFILE',       // Poutre I/H (IPE, HEA, HEB, etc.)
  U_PROFILE = 'U_PROFILE',       // Profil U (UPN, UAP, etc.)
  L_PROFILE = 'L_PROFILE',       // Cornière L
  T_PROFILE = 'T_PROFILE',       // Profil T
  TUBE_RECT = 'TUBE_RECT',      // Tube rectangulaire/carré (RHS/SHS)
  TUBE_ROUND = 'TUBE_ROUND',    // Tube rond (CHS)
  PLATE = 'PLATE',               // Plaque/tôle
  CUSTOM = 'CUSTOM',             // Profil personnalisé
}

/**
 * Mapping DSTV blocks vers types de coupe
 */
export const DSTVBlockToCutType: Record<string, CutType> = {
  'AK': CutType.EXTERIOR_CUT,    // Aussenkontur - Contour extérieur
  'IK': CutType.INTERIOR_CUT,    // Innenkontur - Contour intérieur
  'SC': CutType.SLOT_CUT,         // Sägen - Coupe/rainure
  'BR': CutType.CHAMFER_CUT,      // Bevel/Radius - Chanfrein/arrondi
};

/**
 * Priorités par défaut des stratégies
 */
export const DefaultStrategyPriorities: Record<string, number> = {
  'EndCutStrategy': 100,          // Plus haute priorité pour les coupes d'extrémité
  'BevelCutStrategy': 90,         // Préparation de soudure importante
  'NotchCutStrategy': 80,         // Encoches fréquentes
  'ExteriorCutStrategy': 70,      // Coupes extérieures
  'InteriorCutStrategy': 60,      // Coupes intérieures
  'ContourCutStrategy': 50,       // Contours complexes
  'DefaultStrategy': 10,          // Stratégie par défaut
};