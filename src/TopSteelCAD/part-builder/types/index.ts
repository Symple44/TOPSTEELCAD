import * as THREE from 'three';

// Import and re-export types from TopSteelCAD
import { ProfileType } from '../../3DLibrary/types';
import { FeatureType, ProfileFace } from '../../core/features/types';

// Re-export for convenience
export { ProfileType, ProfileFace, FeatureType };

// ProfileDimensions is an interface, so we need to re-declare it here
export interface ProfileDimensions {
  designation?: string;
  height?: number;
  width?: number;
  length?: number;
  webThickness?: number;
  flangeThickness?: number;
  thickness?: number;
  diameter?: number;
  outerDiameter?: number;
  innerDiameter?: number;
  wallThickness?: number;
  rootRadius?: number;
  toeRadius?: number;
  outerRadius?: number;
  innerRadius?: number;
  leg1Length?: number;
  leg2Length?: number;
  lipLength?: number;
  lipAngle?: number;
  webAngle?: number;
  topWidth?: number;
}

// Feature type - simplified version
export interface Feature {
  id: string;
  type: FeatureType;
  coordinateSystem: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  face?: ProfileFace;
  parameters: any;
}

export enum PartType {
  PROFILE = 'PROFILE',
  PLATE = 'PLATE',
  CUSTOM = 'CUSTOM'
}

export enum WorkflowStep {
  SELECT_TYPE = 'SELECT_TYPE',
  CONFIGURE_BASE = 'CONFIGURE_BASE',
  ADD_FEATURES = 'ADD_FEATURES',
  POSITIONING = 'POSITIONING',
  VALIDATION = 'VALIDATION',
  FINALIZE = 'FINALIZE'
}

export interface CutDefinition {
  angle: number;
  plane: 'XY' | 'XZ' | 'YZ';
  offset?: number;
}

export interface NotchDefinition {
  type: 'rectangular' | 'circular' | 'custom';
  width: number;
  depth: number;
  position?: 'center' | 'left' | 'right';
}

export interface HolePattern {
  type: 'linear' | 'circular' | 'grid';
  count: number;
  spacing?: number;
  angle?: number;
  rows?: number;
  columns?: number;
}

export interface ProfileDefinition {
  type: ProfileType;
  designation: string;
  dimensions: ProfileDimensions;
  length: number;
  startCut?: CutDefinition;
  endCut?: CutDefinition;
  startNotch?: NotchDefinition;
  endNotch?: NotchDefinition;
}

export interface PlateContourPoint {
  x: number;
  y: number;
  radius?: number;
}

export interface PlateDefinition {
  thickness: number;
  material: string;
  contour: PlateContourPoint[];
  holes: Feature[];
}

export interface MaterialDefinition {
  grade: string;
  density: number;
  yieldStrength?: number;
  tensileStrength?: number;
  elasticModulus?: number;
}

export interface PartDefinition {
  id: string;
  name: string;
  type: PartType;
  profileDefinition?: ProfileDefinition;
  plateDefinition?: PlateDefinition;
  material: MaterialDefinition;
  features: Feature[];
  metadata?: Record<string, any>;
}

export interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  partDefinition: Partial<PartDefinition>;
  validationErrors: ValidationError[];
  isDirty: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PositioningSuggestion {
  id: string;
  name: string;
  description: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  face?: ProfileFace;
  confidence: number;
  preview?: THREE.BufferGeometry;
}

export interface PartTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  baseDefinition: Partial<PartDefinition>;
  parameters: TemplateParameter[];
  constraints: TemplateConstraint[];
}

export interface TemplateParameter {
  id: string;
  name: string;
  type: 'number' | 'string' | 'select' | 'boolean';
  defaultValue: any;
  constraints?: {
    min?: number;
    max?: number;
    options?: string[];
    pattern?: string;
  };
}

export interface TemplateConstraint {
  type: 'dependency' | 'validation' | 'calculation';
  source: string[];
  target: string;
  rule: string;
}

export interface SeriesDefinition {
  type: 'holes' | 'notches' | 'cuts';
  pattern: HolePattern;
  baseFeature: Feature;
  startPosition: THREE.Vector3;
  face?: ProfileFace;
}

export interface PartBuilderConfig {
  enableValidation: boolean;
  enableAutoSave: boolean;
  enablePreview: boolean;
  maxFeatures: number;
  defaultMaterial: MaterialDefinition;
  units: 'mm' | 'inch';
}

export interface GeneratedPart {
  geometry: THREE.BufferGeometry;
  features: Feature[];
  metadata: {
    volume: number;
    weight: number;
    surfaceArea: number;
    centerOfMass: THREE.Vector3;
    boundingBox: THREE.Box3;
  };
  exportData?: {
    dstv?: string;
    step?: string;
    ifc?: string;
  };
}

export interface FeatureEditData {
  feature: Feature;
  isNew: boolean;
  originalFeature?: Feature;
  validationErrors: string[];
}

export interface ProfileLibraryFilter {
  types?: ProfileType[];
  searchTerm?: string;
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  standards?: string[];
}

export interface PlateContourEditor {
  points: PlateContourPoint[];
  selectedIndex: number | null;
  mode: 'add' | 'edit' | 'delete' | 'move';
  snapToGrid: boolean;
  gridSize: number;
}

export type PartBuilderMode = 'create' | 'edit' | 'template' | 'import';

export interface PartBuilderSession {
  id: string;
  mode: PartBuilderMode;
  startTime: Date;
  lastModified: Date;
  workflow: WorkflowState;
  history: PartDefinition[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface HolePositionAssist {
  referenceType: 'absolute' | 'relative' | 'center' | 'edge';
  referencePoint?: THREE.Vector3;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  face: ProfileFace;
  alignment?: 'left' | 'center' | 'right' | 'top' | 'bottom';
}

export interface BatchFeatureOperation {
  type: 'add' | 'modify' | 'delete';
  features: Feature[];
  pattern?: HolePattern;
  transform?: THREE.Matrix4;
}

export interface PartExportOptions {
  format: 'dstv' | 'step' | 'ifc' | 'dxf' | 'json';
  includeFeatures: boolean;
  includeMetadata: boolean;
  units: 'mm' | 'inch';
  precision: number;
}

export interface PartImportResult {
  success: boolean;
  partDefinition?: PartDefinition;
  errors?: string[];
  warnings?: string[];
}