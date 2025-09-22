import { ProfileType, ProfileDimensions } from './index';

// Enum pour les modes d'affichage
export enum DisplayMode {
  LIST = 'list',
  EXTENDED = 'extended'
}

// Enum pour les faces selon DSTV
export enum DSTVFace {
  TOP = 'o',    // face supérieure
  BOTTOM = 'u', // face inférieure
  LEFT = 'l',   // face gauche
  RIGHT = 'r',  // face droite
  FRONT = 'v',  // face avant
  BACK = 'h',   // face arrière
  RADIAL = 'radial' // pour tubes ronds
}

// Type pour les coordonnées DSTV
export interface DSTVCoordinate {
  face: DSTVFace;
  x: number;
  y: number;
  z?: number;
}

// Type pour un trou avec format DSTV
export interface HoleDSTV {
  id: string;
  label: string; // A, B, C, etc.
  diameter: number;
  coordinates: DSTVCoordinate;
  depth?: number;
  isThrough: boolean;
  type?: string; // Type de trou (through, blind, threaded, etc.)
}

// Type pour la coupe aux extrémités
export interface EndCut {
  angle: number;
  direction: 'X' | 'Y' | 'Z';
}

// Type pour un élément/barre
export interface PartElement {
  id: string;
  reference: string; // Repère (ex: A1, B2, etc.)
  designation: string; // Texte libre de désignation
  quantity: number;
  profileType: ProfileType;
  profileSubType: string; // ex: "300" pour IPE300, "30x30x3" pour L30x30x3
  length: number;
  material: string;
  holes: HoleDSTV[];
  startCut?: EndCut;
  endCut?: EndCut;
  weight?: number;
  status?: 'draft' | 'validated' | 'production' | 'completed';
  notes?: string;
  dimensions?: ProfileDimensions; // Dimensions automatiques depuis la bibliothèque
}

// Type pour le formatage DSTV des trous
export interface DSTVHoleFormat {
  label: string;
  count: number;
  diameter: number;
  coordinates: string; // Format: "<A x='100' y='50' d='10'/>"
}

// Type pour les données de vue détaillée
export interface DetailViewData {
  element: PartElement;
  views: {
    face: ViewProjection;
    top: ViewProjection;
    bottom: ViewProjection;
    side: ViewProjection;
  };
}

// Type pour une projection de vue
export interface ViewProjection {
  width: number;
  height: number;
  holes: Array<{
    x: number;
    y: number;
    diameter: number;
    label: string;
  }>;
  cuts?: {
    start?: EndCut;
    end?: EndCut;
  };
}

// Type pour les colonnes du DataTable
export interface PartTableColumn {
  key: keyof PartElement | 'holesDisplay' | 'dstvCoordinates' | 'actions';
  label: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  render?: (item: PartElement) => React.ReactNode;
}

// Type pour les options d'export
export interface ExportOptions {
  format: 'DSTV' | 'CSV' | 'JSON' | 'IFC' | 'STEP';
  includeHoles: boolean;
  includeCoordinates: boolean;
  units: 'mm' | 'inch';
}

// Type pour la configuration du composant
export interface PartBuilderConfig {
  displayMode: DisplayMode;
  enableValidation: boolean;
  enableAutoSave: boolean;
  maxElements: number;
  defaultMaterial: string;
  profileLibrary: ProfileLibraryConfig;
}

// Type pour la configuration de la bibliothèque de profilés
export interface ProfileLibraryConfig {
  types: ProfileType[];
  customProfiles?: Array<{
    type: string;
    sizes: string[];
    dimensions: ProfileDimensions[];
  }>;
}

// Type pour les paramètres de la modale de détail
export interface DetailModalProps {
  element: PartElement;
  isOpen: boolean;
  onClose: () => void;
  onSave: (element: PartElement) => void;
  onAddHole?: (holes: HoleDSTV | HoleDSTV[]) => void;
  onEditHole?: (holeId: string, hole: HoleDSTV) => void;
  onDeleteHole?: (holeId: string) => void;
}

// Type pour les paramètres du viewer 3D
export interface Part3DViewerProps {
  element: PartElement;
  width?: number;
  height?: number;
  enableControls?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
}

// Type pour la gestion des états
export interface PartBuilderState {
  elements: PartElement[];
  selectedElementId: string | null;
  displayMode: DisplayMode;
  filters: PartFilters;
  sortBy: keyof PartElement | null;
  sortOrder: 'asc' | 'desc';
  editingCell: { elementId: string; field: string } | null;
}

// Type pour les filtres
export interface PartFilters {
  reference?: string;
  profileType?: ProfileType;
  material?: string;
  status?: string;
  hasHoles?: boolean;
}

// Type pour les actions du reducer
export type PartBuilderAction =
  | { type: 'ADD_ELEMENT'; payload: PartElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<PartElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'SET_DISPLAY_MODE'; payload: DisplayMode }
  | { type: 'SET_FILTERS'; payload: Partial<PartFilters> }
  | { type: 'SET_SORT'; payload: { sortBy: keyof PartElement; sortOrder: 'asc' | 'desc' } }
  | { type: 'BATCH_UPDATE'; payload: PartElement[] }
  | { type: 'IMPORT_ELEMENTS'; payload: PartElement[] };