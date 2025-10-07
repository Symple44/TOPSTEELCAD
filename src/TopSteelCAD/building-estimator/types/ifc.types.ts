/**
 * Types pour l'export IFC (Industry Foundation Classes)
 * Building Estimator - TopSteelCAD
 */

/**
 * Version du schéma IFC
 */
export enum IFCSchemaVersion {
  IFC2X3 = 'IFC2X3',
  IFC4 = 'IFC4',
  IFC4X3 = 'IFC4X3'
}

/**
 * Type d'élément IFC
 */
export enum IFCElementType {
  PROJECT = 'IfcProject',
  SITE = 'IfcSite',
  BUILDING = 'IfcBuilding',
  BUILDING_STOREY = 'IfcBuildingStorey',
  COLUMN = 'IfcColumn',
  BEAM = 'IfcBeam',
  MEMBER = 'IfcMember',
  WALL = 'IfcWall',
  SLAB = 'IfcSlab',
  ROOF = 'IfcRoof',
  DOOR = 'IfcDoor',
  WINDOW = 'IfcWindow',
  COVERING = 'IfcCovering',
  PLATE = 'IfcPlate'
}

/**
 * Type de profil IFC
 */
export enum IFCProfileType {
  I_SHAPE = 'IfcIShapeProfileDef',
  U_SHAPE = 'IfcUShapeProfileDef',
  L_SHAPE = 'IfcLShapeProfileDef',
  T_SHAPE = 'IfcTShapeProfileDef',
  RECTANGULAR = 'IfcRectangleProfileDef',
  CIRCULAR = 'IfcCircleProfileDef',
  ARBITRARY = 'IfcArbitraryClosedProfileDef'
}

/**
 * Contexte géométrique IFC
 */
export interface IFCGeometricContext {
  coordinateSpaceDimension: number;
  precision?: number;
  worldCoordinateSystem: IFCAxis2Placement3D;
  trueNorth?: IFCDirection;
}

/**
 * Placement 3D IFC
 */
export interface IFCAxis2Placement3D {
  location: IFCCartesianPoint;
  axis?: IFCDirection;
  refDirection?: IFCDirection;
}

/**
 * Point cartésien IFC
 */
export interface IFCCartesianPoint {
  coordinates: [number, number, number];
}

/**
 * Direction IFC
 */
export interface IFCDirection {
  ratios: [number, number, number];
}

/**
 * Entité IFC de base
 */
export interface IFCEntity {
  id: number;
  type: string;
  guid: string;
  name?: string;
  description?: string;
  objectType?: string;
  objectPlacement?: IFCAxis2Placement3D;
  representation?: any;
}

/**
 * Élément de construction IFC
 */
export interface IFCBuildingElement extends IFCEntity {
  tag?: string;
  containedInStructure?: number; // Référence IfcBuildingStorey
  hasAssociations?: number[]; // Matériaux, etc.
  hasProperties?: number[]; // Property sets
}

/**
 * Profil IFC
 */
export interface IFCProfile {
  type: IFCProfileType;
  name: string;
  // Pour I-Shape
  overallWidth?: number;
  overallDepth?: number;
  webThickness?: number;
  flangeThickness?: number;
  filletRadius?: number;
  // Pour U-Shape
  flangeWidth?: number;
  // Pour Rectangle
  xDim?: number;
  yDim?: number;
  // Pour Circle
  radius?: number;
}

/**
 * Matériau IFC
 */
export interface IFCMaterial {
  id: number;
  name: string;
  description?: string;
  category?: string;
  // Propriétés physiques
  density?: number; // kg/m³
  youngsModulus?: number; // Pa
  poissonRatio?: number;
  thermalExpansionCoefficient?: number;
}

/**
 * Jeu de propriétés IFC
 */
export interface IFCPropertySet {
  id: number;
  name: string;
  description?: string;
  properties: IFCProperty[];
  relatedObjects: number[]; // IDs des objets associés
}

/**
 * Propriété IFC
 */
export interface IFCProperty {
  name: string;
  value: string | number | boolean;
  unit?: string;
  type?: 'Single' | 'Enumerated' | 'Bounded' | 'Table' | 'Reference';
}

/**
 * Options d'export IFC
 */
export interface IFCExportOptions {
  // Version du schéma
  schemaVersion?: IFCSchemaVersion;

  // Métadonnées du projet
  projectName?: string;
  projectDescription?: string;
  siteName?: string;
  buildingName?: string;

  // Coordonnées géographiques
  latitude?: number;
  longitude?: number;
  elevation?: number;

  // Options de géométrie
  includeGeometry?: boolean;
  geometryPrecision?: number; // Nombre de décimales
  tessellationQuality?: 'low' | 'medium' | 'high';

  // Options de données
  includeMaterials?: boolean;
  includeProperties?: boolean;
  includeQuantities?: boolean;
  includeClassifications?: boolean;

  // Options d'organisation
  groupByStorey?: boolean;
  groupByType?: boolean;

  // Optimisation
  optimizeGeometry?: boolean;
  mergeIdenticalProfiles?: boolean;
}

/**
 * Résultat de l'export IFC
 */
export interface IFCExportResult {
  success: boolean;
  ifcContent?: string;
  fileName?: string;
  fileSize?: number;
  entityCount?: number;
  warnings?: string[];
  errors?: string[];
  metadata?: {
    schemaVersion: IFCSchemaVersion;
    timestamp: Date;
    application: string;
    applicationVersion: string;
  };
}

/**
 * Relation spatiale IFC
 */
export interface IFCSpatialRelation {
  id: number;
  type: 'ContainedInSpatialStructure' | 'AggregatesElements' | 'ConnectsElements';
  relatingObject: number; // ID de l'objet parent
  relatedObjects: number[]; // IDs des objets enfants
}

/**
 * Classification IFC
 */
export interface IFCClassification {
  source: string; // Ex: "Uniformat", "Omniclass"
  edition?: string;
  editionDate?: Date;
  name: string;
  location?: string;
}

/**
 * Référence de classification IFC
 */
export interface IFCClassificationReference {
  id: number;
  location?: string;
  itemReference?: string;
  name: string;
  referencedSource: IFCClassification;
  relatedObjects: number[]; // IDs des objets classifiés
}

/**
 * Quantités IFC
 */
export interface IFCQuantitySet {
  id: number;
  name: string;
  description?: string;
  methodOfMeasurement?: string;
  quantities: IFCPhysicalQuantity[];
  relatedObjects: number[];
}

/**
 * Quantité physique IFC
 */
export interface IFCPhysicalQuantity {
  name: string;
  description?: string;
  unit?: string;
  // Types de quantités
  lengthValue?: number;
  areaValue?: number;
  volumeValue?: number;
  weightValue?: number;
  countValue?: number;
  timeValue?: number;
}

/**
 * Unité IFC
 */
export interface IFCUnit {
  type: 'Length' | 'Area' | 'Volume' | 'Mass' | 'Time' | 'Temperature' | 'Force' | 'Pressure';
  prefix?: 'MILLI' | 'CENTI' | 'KILO' | 'MEGA';
  name: 'METRE' | 'SQUARE_METRE' | 'CUBIC_METRE' | 'GRAM' | 'SECOND' | 'NEWTON' | 'PASCAL';
}

/**
 * Contexte de représentation IFC
 */
export interface IFCRepresentationContext {
  id: number;
  contextIdentifier?: string;
  contextType?: string;
  coordinateSpaceDimension: number;
  precision?: number;
  worldCoordinateSystem: IFCAxis2Placement3D;
  trueNorth?: IFCDirection;
  subContexts?: number[]; // IDs des sous-contextes
}
