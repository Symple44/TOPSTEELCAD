/**
 * Point d'entrée principal pour les profils personnalisés
 * @module CustomProfiles
 *
 * @example
 * ```typescript
 * import {
 *   createCustomProfile,
 *   createSimpleContour,
 *   validateCustomProfile
 * } from '@/3DLibrary/custom-profiles';
 * ```
 */

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

export type {
  // Types principaux
  CustomProfile,
  CustomProfileMetadata,
  CustomProfileLibrary,
  CustomProfileStorage,
  CustomProfileExportFormat,
  CustomProfileWithDB,

  // Géométrie 2D
  Shape2D,
  Contour2D,
  Point2D,
  GeometrySegment,
  LineSegment,
  ArcSegment,
  BezierQuadraticSegment,
  BezierCubicSegment,
  EllipseSegment,

  // Propriétés calculées
  CalculatedGeometryProperties,

  // Paramètres de création
  CreateCustomProfileParams,
  SimpleContourParams,

  // Validation
  ValidationResult,
  ValidationRules,

  // Conversion THREE.js
  ThreeJsConversionOptions,
  ThreeJsConversionResult,

  // Migration BDD
  DatabaseMigrationFields,
  CustomToSteelProfileAdapter,

  // Versioning
  ProfileVersion

} from '../types/custom-profile.types';

export {
  // Enums
  SegmentType,
  CUSTOM_PROFILES_STORAGE_KEY
} from '../types/custom-profile.types';

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

export {
  // Création de profils
  createCustomProfile,
  createSimpleContour,
  createCustomIProfile,
  createCustomTProfile,

  // Calculs géométriques
  calculateGeometryProperties,
  calculateContourArea,
  calculateContourPerimeter,
  calculateCentroid,
  calculateWeight,
  calculateBoundingBox,
  calculateReferenceDimensions,

  // Validation
  validateCustomProfile,
  isContourClosed

} from '../utils/customProfileHelpers';

// ============================================================================
// EXEMPLES
// ============================================================================

export {
  example1_RectangularProfile,
  example2_TProfile,
  example3_IProfile,
  example4_ProfileWithHole,
  example5_LProfile,
  example6_RoundedRectangle,
  example7_OmegaProfile,
  example8_WeldedComposite,
  example9_CreateLibrary,
  example10_ValidateProfile,
  example11_CalculateProperties,
  example12_ExportToJSON,
  example13_ExportLibraryToJSON
} from '../examples/custom-profile-examples';

// ============================================================================
// VERSION
// ============================================================================

export const CUSTOM_PROFILES_VERSION = '1.0.0';
export const CUSTOM_PROFILES_SCHEMA_VERSION = '1.0.0';

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * @file Index des profils personnalisés
 *
 * Ce module fournit un système complet pour créer, manipuler et stocker
 * des profils métalliques personnalisés en 2D.
 *
 * ## Caractéristiques principales
 *
 * - **Géométrie flexible**: Support de lignes, arcs, courbes de Bézier, ellipses
 * - **Calculs automatiques**: Aire, périmètre, centre de gravité, poids
 * - **Validation robuste**: Vérification de fermeture, aire, trous
 * - **Stockage LocalStorage**: Persistance locale avec format JSON
 * - **Import/Export**: Partage de profils et bibliothèques
 * - **Conversion THREE.js**: Rendu 3D avec extrusion
 * - **Migration BDD**: Prêt pour PostgreSQL
 *
 * ## Installation
 *
 * ```typescript
 * import {
 *   createCustomProfile,
 *   createSimpleContour,
 *   SegmentType
 * } from '@/3DLibrary/custom-profiles';
 * ```
 *
 * ## Utilisation Rapide
 *
 * ### Créer un profil rectangulaire
 *
 * ```typescript
 * const contour = createSimpleContour({
 *   type: 'rectangle',
 *   width: 200,
 *   height: 100,
 *   center: { x: 0, y: 0 }
 * });
 *
 * const profile = createCustomProfile({
 *   name: 'Rectangle 200x100',
 *   designation: 'RECT-200x100',
 *   shape: { outerContour: contour },
 *   defaultMaterial: {
 *     grade: 'S355',
 *     density: 7.85
 *   }
 * });
 * ```
 *
 * ### Créer un profil en T
 *
 * ```typescript
 * const tProfile = createCustomTProfile(
 *   200,  // hauteur
 *   150,  // largeur semelle
 *   10,   // épaisseur âme
 *   15,   // épaisseur semelle
 *   'Mon Profil en T'
 * );
 * ```
 *
 * ### Valider un profil
 *
 * ```typescript
 * const result = validateCustomProfile(profile);
 *
 * if (!result.isValid) {
 *   console.error('Erreurs:', result.errors);
 * }
 * ```
 *
 * ### Profil avec trou
 *
 * ```typescript
 * const outerContour = createSimpleContour({
 *   type: 'rectangle',
 *   width: 300,
 *   height: 200
 * });
 *
 * const hole = createSimpleContour({
 *   type: 'circle',
 *   radius: 40,
 *   center: { x: 0, y: 0 }
 * });
 *
 * const profile = createCustomProfile({
 *   name: 'Plaque Percée',
 *   designation: 'PLATE-300x200-H80',
 *   shape: {
 *     outerContour,
 *     holes: [hole]
 *   },
 *   defaultMaterial: { grade: 'S355', density: 7.85 }
 * });
 * ```
 *
 * ### Profil avec courbes
 *
 * ```typescript
 * const profile = createCustomProfile({
 *   name: 'Profil Courbe',
 *   designation: 'CURVED-001',
 *   shape: {
 *     outerContour: {
 *       id: 'curved',
 *       segments: [
 *         {
 *           type: SegmentType.LINE,
 *           start: { x: 0, y: 0 },
 *           end: { x: 100, y: 0 }
 *         },
 *         {
 *           type: SegmentType.ARC,
 *           center: { x: 100, y: 50 },
 *           radius: 50,
 *           startAngle: -Math.PI / 2,
 *           endAngle: Math.PI / 2
 *         },
 *         {
 *           type: SegmentType.LINE,
 *           start: { x: 100, y: 100 },
 *           end: { x: 0, y: 100 }
 *         },
 *         {
 *           type: SegmentType.LINE,
 *           start: { x: 0, y: 100 },
 *           end: { x: 0, y: 0 }
 *         }
 *       ],
 *       closed: true
 *     }
 *   },
 *   defaultMaterial: { grade: 'S355', density: 7.85 }
 * });
 * ```
 *
 * ## Stockage LocalStorage
 *
 * ### Sauvegarder
 *
 * ```typescript
 * import { CUSTOM_PROFILES_STORAGE_KEY } from '@/3DLibrary/custom-profiles';
 *
 * const storage = JSON.parse(
 *   localStorage.getItem(CUSTOM_PROFILES_STORAGE_KEY) || '{}'
 * );
 *
 * storage.profiles = storage.profiles || [];
 * storage.profiles.push(profile);
 * storage.lastUpdated = new Date().toISOString();
 *
 * localStorage.setItem(
 *   CUSTOM_PROFILES_STORAGE_KEY,
 *   JSON.stringify(storage)
 * );
 * ```
 *
 * ### Charger
 *
 * ```typescript
 * const storage = JSON.parse(
 *   localStorage.getItem(CUSTOM_PROFILES_STORAGE_KEY) || '{}'
 * );
 *
 * const allProfiles = storage.profiles || [];
 * const profile = allProfiles.find(p => p.id === 'mon-id');
 * ```
 *
 * ## Export/Import JSON
 *
 * ### Export
 *
 * ```typescript
 * const exportData = {
 *   formatVersion: '1.0.0',
 *   exportedAt: new Date().toISOString(),
 *   type: 'single',
 *   profile: profile
 * };
 *
 * const json = JSON.stringify(exportData, null, 2);
 *
 * // Télécharger comme fichier
 * const blob = new Blob([json], { type: 'application/json' });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = `${profile.designation}.json`;
 * a.click();
 * ```
 *
 * ### Import
 *
 * ```typescript
 * const jsonString = await file.text();
 * const importedData = JSON.parse(jsonString);
 *
 * if (importedData.type === 'single' && importedData.profile) {
 *   const profile = importedData.profile;
 *   const validation = validateCustomProfile(profile);
 *
 *   if (validation.isValid) {
 *     // Ajouter au storage
 *   }
 * }
 * ```
 *
 * ## Calculs Géométriques
 *
 * ```typescript
 * import {
 *   calculateGeometryProperties,
 *   calculateWeight
 * } from '@/3DLibrary/custom-profiles';
 *
 * const properties = calculateGeometryProperties(shape);
 *
 * console.log('Aire:', properties.area, 'cm²');
 * console.log('Périmètre:', properties.perimeter, 'mm');
 * console.log('Centre de gravité:', properties.centroid);
 *
 * const weight = calculateWeight(properties.area, 7.85);
 * console.log('Poids:', weight, 'kg/m');
 * ```
 *
 * ## Conversion THREE.js
 *
 * ```typescript
 * import { Shape, ExtrudeGeometry } from 'three';
 *
 * // Convertir Shape2D → THREE.Shape
 * const threeShape = new Shape();
 *
 * for (const segment of shape.outerContour.segments) {
 *   switch (segment.type) {
 *     case SegmentType.LINE:
 *       threeShape.lineTo(segment.end.x, segment.end.y);
 *       break;
 *     case SegmentType.ARC:
 *       threeShape.absarc(
 *         segment.center.x, segment.center.y,
 *         segment.radius,
 *         segment.startAngle, segment.endAngle
 *       );
 *       break;
 *     // ...
 *   }
 * }
 *
 * // Extruder
 * const geometry = new ExtrudeGeometry(threeShape, {
 *   depth: 6000,
 *   bevelEnabled: false
 * });
 * ```
 *
 * ## Documentation Complète
 *
 * Pour plus d'informations, consulter:
 * - `CUSTOM_PROFILES_DESIGN.md` - Architecture complète
 * - `CUSTOM_PROFILES_QUICKSTART.md` - Guide rapide
 * - `CUSTOM_PROFILES_SUMMARY.md` - Résumé du projet
 *
 * @version 1.0.0
 * @author TopSteelCAD Team
 */
