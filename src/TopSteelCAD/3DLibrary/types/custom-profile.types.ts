/**
 * Modèle de données pour les profils personnalisés (Custom Profiles)
 * Permet la création, stockage et manipulation de profils 2D définis par l'utilisateur
 *
 * @module CustomProfileTypes
 * @version 1.0.0
 */

import { ProfileType, SteelProfile, ProfileDimensions } from './profile.types';

// ============================================================================
// TYPES DE SEGMENTS GÉOMÉTRIQUES
// ============================================================================

/**
 * Type de segment pour la définition de forme 2D
 */
export enum SegmentType {
  /** Ligne droite entre deux points */
  LINE = 'LINE',
  /** Arc circulaire défini par centre, rayon et angles */
  ARC = 'ARC',
  /** Courbe de Bézier quadratique (3 points de contrôle) */
  BEZIER_QUADRATIC = 'BEZIER_QUADRATIC',
  /** Courbe de Bézier cubique (4 points de contrôle) */
  BEZIER_CUBIC = 'BEZIER_CUBIC',
  /** Ellipse ou arc elliptique */
  ELLIPSE = 'ELLIPSE'
}

/**
 * Point 2D dans le plan XY
 */
export interface Point2D {
  /** Coordonnée X en millimètres */
  x: number;
  /** Coordonnée Y en millimètres */
  y: number;
}

/**
 * Segment de ligne droite
 */
export interface LineSegment {
  type: SegmentType.LINE;
  /** Point de départ */
  start: Point2D;
  /** Point d'arrivée */
  end: Point2D;
}

/**
 * Arc circulaire
 */
export interface ArcSegment {
  type: SegmentType.ARC;
  /** Centre de l'arc */
  center: Point2D;
  /** Rayon en millimètres */
  radius: number;
  /** Angle de départ en radians */
  startAngle: number;
  /** Angle de fin en radians */
  endAngle: number;
  /** Sens de rotation (true = anti-horaire, false = horaire) */
  counterClockwise?: boolean;
}

/**
 * Courbe de Bézier quadratique (3 points)
 */
export interface BezierQuadraticSegment {
  type: SegmentType.BEZIER_QUADRATIC;
  /** Point de départ */
  start: Point2D;
  /** Point de contrôle */
  control: Point2D;
  /** Point d'arrivée */
  end: Point2D;
}

/**
 * Courbe de Bézier cubique (4 points)
 */
export interface BezierCubicSegment {
  type: SegmentType.BEZIER_CUBIC;
  /** Point de départ */
  start: Point2D;
  /** Premier point de contrôle */
  control1: Point2D;
  /** Deuxième point de contrôle */
  control2: Point2D;
  /** Point d'arrivée */
  end: Point2D;
}

/**
 * Arc elliptique
 */
export interface EllipseSegment {
  type: SegmentType.ELLIPSE;
  /** Centre de l'ellipse */
  center: Point2D;
  /** Rayon sur l'axe X en millimètres */
  radiusX: number;
  /** Rayon sur l'axe Y en millimètres */
  radiusY: number;
  /** Rotation de l'ellipse en radians */
  rotation: number;
  /** Angle de départ en radians */
  startAngle: number;
  /** Angle de fin en radians */
  endAngle: number;
  /** Sens de rotation (true = anti-horaire, false = horaire) */
  counterClockwise?: boolean;
}

/**
 * Union de tous les types de segments possibles
 */
export type GeometrySegment =
  | LineSegment
  | ArcSegment
  | BezierQuadraticSegment
  | BezierCubicSegment
  | EllipseSegment;

// ============================================================================
// DÉFINITION DE FORME 2D
// ============================================================================

/**
 * Contour fermé représentant un profil ou un trou
 */
export interface Contour2D {
  /** Identifiant unique du contour */
  id: string;
  /** Liste ordonnée de segments formant le contour */
  segments: GeometrySegment[];
  /** Le contour est-il fermé? (validé automatiquement) */
  closed: boolean;
  /** Aire du contour en mm² (calculée, peut être négative pour les trous) */
  area?: number;
  /** Périmètre du contour en mm (calculé) */
  perimeter?: number;
}

/**
 * Forme 2D complète avec contour principal et trous optionnels
 */
export interface Shape2D {
  /** Contour extérieur du profil */
  outerContour: Contour2D;
  /** Trous intérieurs (pour profils creux) */
  holes?: Contour2D[];
  /** Boîte englobante (calculée automatiquement) */
  boundingBox?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

// ============================================================================
// PROPRIÉTÉS GÉOMÉTRIQUES CALCULÉES
// ============================================================================

/**
 * Propriétés géométriques calculées du profil
 */
export interface CalculatedGeometryProperties {
  /** Aire nette de la section en cm² */
  area: number;
  /** Périmètre total en mm */
  perimeter: number;

  /** Centre de gravité */
  centroid: Point2D;

  /** Moments d'inertie */
  inertia?: {
    /** Moment d'inertie selon X en cm⁴ */
    Ixx: number;
    /** Moment d'inertie selon Y en cm⁴ */
    Iyy: number;
    /** Produit d'inertie en cm⁴ */
    Ixy: number;
  };

  /** Rayons de giration */
  radiusOfGyration?: {
    /** Rayon de giration selon X en cm */
    rx: number;
    /** Rayon de giration selon Y en cm */
    ry: number;
  };

  /** Modules élastiques approximatifs (si calculables) */
  elasticModulus?: {
    /** Module élastique selon X en cm³ */
    Wx: number;
    /** Module élastique selon Y en cm³ */
    Wy: number;
  };
}

// ============================================================================
// MÉTADONNÉES ET VERSIONING
// ============================================================================

/**
 * Métadonnées du profil personnalisé
 */
export interface CustomProfileMetadata {
  /** Auteur/créateur du profil */
  author?: string;
  /** Organisation/entreprise */
  organization?: string;
  /** Date de création (ISO 8601) */
  createdAt: string;
  /** Date de dernière modification (ISO 8601) */
  updatedAt: string;
  /** Version du profil (semver: 1.0.0, 1.1.0, etc.) */
  version: string;
  /** Notes ou commentaires */
  notes?: string;
  /** Tags pour classification */
  tags?: string[];
  /** Catégorie personnalisée */
  category?: string;
}

/**
 * Historique des versions d'un profil
 */
export interface ProfileVersion {
  /** Numéro de version */
  version: string;
  /** Date de la version */
  timestamp: string;
  /** Auteur de la modification */
  author?: string;
  /** Description des changements */
  changeLog?: string;
  /** Données du profil à cette version (snapshot) */
  data?: CustomProfile;
}

// ============================================================================
// INTERFACE PRINCIPALE CUSTOMPROFILE
// ============================================================================

/**
 * Définition complète d'un profil personnalisé
 */
export interface CustomProfile {
  // ========== IDENTIFICATION ==========
  /** Identifiant unique (UUID v4) */
  id: string;
  /** Nom du profil (ex: "Profile en T inversé", "Poutrelle composite") */
  name: string;
  /** Description détaillée */
  description?: string;
  /** Désignation normalisée ou personnalisée (ex: "CUSTOM-T-001") */
  designation: string;

  // ========== GÉOMÉTRIE 2D ==========
  /** Forme 2D du profil */
  shape: Shape2D;

  // ========== PROPRIÉTÉS PHYSIQUES ==========
  /** Propriétés géométriques calculées */
  properties: CalculatedGeometryProperties;
  /** Poids linéique en kg/m (calculé: area(cm²) × density(kg/dm³) / 100) */
  weight?: number;

  // ========== DIMENSIONS DE RÉFÉRENCE ==========
  /**
   * Dimensions de référence pour compatibilité avec ProfileDimensions
   * Ces valeurs sont extraites ou dérivées de la géométrie
   */
  referenceDimensions?: {
    /** Hauteur totale (boundingBox.maxY - boundingBox.minY) */
    height?: number;
    /** Largeur totale (boundingBox.maxX - boundingBox.minX) */
    width?: number;
    /** Épaisseur moyenne ou typique */
    thickness?: number;
  };

  // ========== MÉTADONNÉES ==========
  /** Métadonnées et informations de versioning */
  metadata: CustomProfileMetadata;

  // ========== PARAMÈTRES D'EXTRUSION ==========
  /**
   * Paramètres pour la conversion en géométrie 3D
   */
  extrusionSettings?: {
    /** Longueur par défaut en mm */
    defaultLength?: number;
    /** Biseautage activé */
    bevelEnabled?: boolean;
    /** Taille du biseau en mm */
    bevelSize?: number;
    /** Segments du biseau */
    bevelSegments?: number;
    /** Nombre de segments pour les courbes */
    curveSegments?: number;
  };

  // ========== MATÉRIAU PAR DÉFAUT ==========
  /**
   * Matériau par défaut pour ce profil
   */
  defaultMaterial?: {
    /** Grade d'acier (ex: "S235", "S355") */
    grade: string;
    /** Densité en kg/dm³ (7.85 pour acier) */
    density: number;
    /** Limite élastique en MPa */
    yieldStrength?: number;
    /** Résistance à la traction en MPa */
    tensileStrength?: number;
  };

  // ========== VALIDATION ET ÉTAT ==========
  /**
   * État de validation du profil
   */
  validation?: {
    /** Le profil est-il valide? */
    isValid: boolean;
    /** Liste des erreurs de validation */
    errors?: string[];
    /** Avertissements (non bloquants) */
    warnings?: string[];
    /** Date de la dernière validation */
    lastValidated?: string;
  };

  // ========== COMPATIBILITÉ ==========
  /**
   * Type de profil pour intégration (toujours CUSTOM)
   */
  profileType: ProfileType.CUSTOM | 'CUSTOM';

  // ========== OPTIONS AVANCÉES ==========
  /**
   * Options avancées pour usages spécifiques
   */
  advanced?: {
    /** Permettre l'édition du profil */
    editable?: boolean;
    /** Profil public/partageable */
    public?: boolean;
    /** Icône ou aperçu (data URL ou chemin) */
    thumbnail?: string;
    /** Données personnalisées */
    customData?: Record<string, any>;
  };
}

// ============================================================================
// BIBLIOTHÈQUE DE PROFILS PERSONNALISÉS
// ============================================================================

/**
 * Bibliothèque regroupant plusieurs profils personnalisés
 */
export interface CustomProfileLibrary {
  /** Identifiant de la bibliothèque */
  id: string;
  /** Nom de la bibliothèque */
  name: string;
  /** Description */
  description?: string;
  /** Version de la bibliothèque */
  version: string;
  /** Profils contenus */
  profiles: CustomProfile[];
  /** Métadonnées de la bibliothèque */
  metadata: {
    author?: string;
    organization?: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
  };
}

// ============================================================================
// FORMATS D'IMPORT/EXPORT
// ============================================================================

/**
 * Format pour l'import/export JSON
 */
export interface CustomProfileExportFormat {
  /** Version du format d'export */
  formatVersion: string;
  /** Date d'export */
  exportedAt: string;
  /** Type: profil unique ou bibliothèque */
  type: 'single' | 'library';
  /** Données du profil (si type = single) */
  profile?: CustomProfile;
  /** Données de la bibliothèque (si type = library) */
  library?: CustomProfileLibrary;
}

// ============================================================================
// STOCKAGE LOCALSTORAGE
// ============================================================================

/**
 * Structure pour le stockage dans LocalStorage
 */
export interface CustomProfileStorageData {
  /** Version du schéma de stockage */
  schemaVersion: string;
  /** Date de dernière mise à jour */
  lastUpdated: string;
  /** Profils stockés localement */
  profiles: CustomProfile[];
  /** Bibliothèques stockées */
  libraries?: CustomProfileLibrary[];
}

/**
 * Filtres de recherche pour profils personnalisés
 */
export interface CustomProfileSearchFilter {
  category?: string;
  tags?: string[];
  author?: string;
  minArea?: number;
  maxArea?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Interface pour les services de stockage
 */
export interface ICustomProfileStorage {
  save(profile: CustomProfile): Promise<void>;
  load(id: string): Promise<CustomProfile | null>;
  list(): Promise<CustomProfile[]>;
  delete(id: string): Promise<void>;
  export(id: string): Promise<CustomProfileExportFormat>;
  import(data: CustomProfileExportFormat): Promise<CustomProfile>;
  search(query: string, filters?: CustomProfileSearchFilter): Promise<CustomProfile[]>;
}

/**
 * Clé LocalStorage pour les profils personnalisés
 */
export const CUSTOM_PROFILES_STORAGE_KEY = 'topsteelcad:custom-profiles';

// ============================================================================
// CONVERSION VERS THREE.JS
// ============================================================================

/**
 * Options de conversion vers THREE.Shape
 */
export interface ThreeJsConversionOptions {
  /** Longueur d'extrusion en mm */
  length: number;
  /** Appliquer une mise à l'échelle */
  scale?: number;
  /** Translation après conversion */
  offset?: { x: number; y: number };
  /** Simplifier les courbes (moins de segments) */
  simplifyCurves?: boolean;
  /** Tolérance de simplification */
  simplificationTolerance?: number;
}

/**
 * Résultat de la conversion THREE.js
 */
export interface ThreeJsConversionResult {
  /** Géométrie Three.js générée */
  geometry: any; // THREE.ExtrudeGeometry
  /** Forme 2D Three.js */
  shape: any; // THREE.Shape
  /** Succès de la conversion */
  success: boolean;
  /** Erreurs éventuelles */
  errors?: string[];
  /** Statistiques de conversion */
  stats?: {
    /** Nombre de vertices */
    vertexCount: number;
    /** Nombre de faces */
    faceCount: number;
    /** Temps de conversion en ms */
    conversionTime: number;
  };
}

// ============================================================================
// VALIDATIONS
// ============================================================================

/**
 * Règles de validation pour un profil personnalisé
 */
export interface ValidationRules {
  /** Aire minimale acceptable en cm² */
  minArea?: number;
  /** Aire maximale acceptable en cm² */
  maxArea?: number;
  /** Périmètre minimal en mm */
  minPerimeter?: number;
  /** Nombre maximal de segments */
  maxSegments?: number;
  /** Le contour doit être fermé */
  requireClosed?: boolean;
  /** Vérifier l'absence d'auto-intersections */
  checkSelfIntersection?: boolean;
  /** Vérifier que les trous sont bien à l'intérieur */
  validateHoles?: boolean;
}

/**
 * Résultat de validation
 */
export interface ValidationResult {
  /** Le profil est-il valide? */
  isValid: boolean;
  /** Erreurs critiques (bloquantes) */
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  /** Avertissements (non bloquants) */
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  /** Informations supplémentaires */
  info?: Array<{
    code: string;
    message: string;
  }>;
}

// ============================================================================
// HELPERS ET UTILITAIRES
// ============================================================================

/**
 * Helper pour créer un profil personnalisé minimal
 */
export interface CreateCustomProfileParams {
  name: string;
  designation: string;
  description?: string;
  shape: Shape2D;
  author?: string;
  organization?: string;
  tags?: string[];
  defaultMaterial?: CustomProfile['defaultMaterial'];
}

/**
 * Helper pour créer un contour simple (rectangle, cercle, polygone)
 */
export interface SimpleContourParams {
  type: 'rectangle' | 'circle' | 'polygon';
  /** Pour rectangle: largeur */
  width?: number;
  /** Pour rectangle: hauteur */
  height?: number;
  /** Pour cercle: rayon */
  radius?: number;
  /** Pour polygone: liste de points */
  points?: Point2D[];
  /** Centre du contour */
  center?: Point2D;
}

// ============================================================================
// MIGRATION VERS BASE DE DONNÉES
// ============================================================================

/**
 * Champs additionnels pour future migration vers base de données
 */
export interface DatabaseMigrationFields {
  /** ID de la base de données (auto-incrémenté) */
  dbId?: number;
  /** Utilisateur propriétaire (ID utilisateur) */
  ownerId?: string;
  /** Permissions de partage */
  permissions?: {
    public: boolean;
    sharedWith?: string[]; // IDs utilisateurs
    allowFork?: boolean; // Permettre la duplication
  };
  /** Statistiques d'utilisation */
  usage?: {
    viewCount?: number;
    useCount?: number;
    forkCount?: number;
    lastUsed?: string;
  };
  /** Informations de synchronisation */
  sync?: {
    syncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'conflict';
    remoteId?: string;
  };
}

/**
 * Extension du CustomProfile pour migration BDD
 */
export interface CustomProfileWithDB extends CustomProfile {
  db?: DatabaseMigrationFields;
}

// ============================================================================
// INTÉGRATION AVEC PROFILETYPE EXISTANT
// ============================================================================

/**
 * Note: ProfileType.CUSTOM a été ajouté directement dans profile.types.ts
 */

/**
 * Adaptateur pour convertir CustomProfile vers SteelProfile
 */
export interface CustomToSteelProfileAdapter {
  /**
   * Convertit un CustomProfile en SteelProfile standard
   */
  convert(customProfile: CustomProfile): SteelProfile;

  /**
   * Convertit un SteelProfile en CustomProfile (si possible)
   */
  reverse(steelProfile: SteelProfile): CustomProfile | null;
}
