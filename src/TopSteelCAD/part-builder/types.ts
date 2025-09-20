import { Vector3 } from './utils/Vector3';

export type ProfileType = 'IPE' | 'HEA' | 'HEB' | 'UPE' | 'UAP' | 'L' | 'RHS' | 'CHS' | 'T' | 'PLATE';

export interface ProfileDimensions {
  height?: number;
  width?: number;
  webThickness?: number;
  flangeThickness?: number;
  radius?: number;
  thickness?: number;
}

export type FaceType = 'TOP_FLANGE' | 'BOTTOM_FLANGE' | 'WEB_LEFT' | 'WEB_RIGHT' | 'FRONT' | 'BACK';

export type HolePatternType = 'SINGLE' | 'LINE' | 'GRID' | 'CIRCULAR' | 'CUSTOM';

export interface HolePattern {
  type: HolePatternType;
  rows?: number;
  columns?: number;
  rowSpacing?: number;
  columnSpacing?: number;
  count?: number;
  radius?: number;
  angle?: number;
  customPositions?: Vector3[];
}

export interface Hole {
  id: string;
  diameter: number;
  position: Vector3;
  depth?: number;
  isThrough: boolean;
  pattern?: HolePattern;
  face: FaceType;
}

export type NotchType = 'RECTANGULAR' | 'CIRCULAR' | 'V_SHAPE' | 'U_SHAPE' | 'CUSTOM';

export interface Notch {
  id: string;
  type: NotchType;
  position: Vector3;
  width: number;
  height: number;
  depth: number;
  radius?: number;
  angle?: number;
  face: FaceType;
  customPath?: Vector3[];
}

export type CutType = 'STRAIGHT' | 'ANGLED' | 'CURVED' | 'COMPOUND';

export interface Cut {
  id: string;
  type: CutType;
  position: 'START' | 'END';
  angle?: number;
  radius?: number;
  normal?: Vector3;
}

export interface Feature {
  holes: Hole[];
  notches: Notch[];
  cuts: Cut[];
}

export interface Part {
  id: string;
  name: string;
  profileType: ProfileType;
  dimensions: ProfileDimensions;
  length: number;
  material?: string;
  features: Feature;
  position?: Vector3;
  rotation?: Vector3;
}

export interface PartBuilderState {
  currentPart: Part | null;
  selectedFeature: string | null;
  selectedFace: FaceType | null;
  previewMode: boolean;
  gridSnap: boolean;
  snapDistance: number;
}

export interface ExportFormat {
  type: 'JSON' | 'DSTV' | 'IFC' | 'STEP' | 'DXF';
  version?: string;
  options?: Record<string, any>;
}

export interface ImportResult {
  success: boolean;
  part?: Part;
  errors?: string[];
  warnings?: string[];
}