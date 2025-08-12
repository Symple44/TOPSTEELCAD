import { PivotElement, PivotScene } from '@/types/viewer';

/**
 * Modes de fonctionnement du viewer
 */
export type ViewerMode = 'simple' | 'complete' | 'editor';

/**
 * Configuration du viewer
 */
export interface ViewerConfig {
  // Affichage
  backgroundColor?: string;
  gridColor?: string;
  sectionColor?: string;
  ambientLight?: number;
  directionalLight?: number;
  enableShadows?: boolean;
  antialiasing?: boolean;
  
  // Éléments visuels
  showGrid?: boolean;
  showAxes?: boolean;
  showViewCube?: boolean;
  showProperties?: boolean;
  showLayers?: boolean;
  showMinimap?: boolean;
  
  // Interactions
  enableSelection?: boolean;
  enableRotation?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableMeasurement?: boolean;
  enableAnnotations?: boolean;
  enableExport?: boolean;
  enableScreenshot?: boolean;
  
  // Mode éditeur
  enableSnapping?: boolean;
  enableGizmos?: boolean;
  enableUndo?: boolean;
  enableRedo?: boolean;
  enableCopy?: boolean;
  enablePaste?: boolean;
  enableDelete?: boolean;
  enableTransform?: boolean;
  enableWeldPoints?: boolean;
  enableAssemblyPoints?: boolean;
  
  // Performance
  maxRenderDistance?: number;
  lodEnabled?: boolean;
  instancedRenderingThreshold?: number;
}

/**
 * Outils disponibles dans la barre d'outils
 */
export type ViewerTool = 
  | 'select'
  | 'measure'
  | 'section'
  | 'annotate'
  | 'export'
  | 'screenshot'
  | 'dimension'
  | 'weld'
  | 'bolt'
  | 'cut'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'copy'
  | 'paste'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'fit'
  | 'hide'
  | 'isolate';

/**
 * Props du composant TopSteelViewer
 */
export interface TopSteelViewerProps {
  /**
   * Mode de fonctionnement
   * @default 'simple'
   */
  mode?: ViewerMode;
  
  /**
   * Éléments à afficher
   */
  elements?: PivotElement[];
  
  /**
   * Scène complète (alternative à elements)
   */
  scene?: PivotScene;
  
  /**
   * ID de l'élément sélectionné
   */
  selectedElementId?: string | null;
  
  /**
   * Callback lors de la sélection d'un élément
   */
  onElementSelect?: (elementId: string | null) => void;
  
  /**
   * Callback lors de la modification d'éléments (mode editor)
   */
  onElementsChange?: (elements: PivotElement[]) => void;
  
  /**
   * Configuration personnalisée
   */
  config?: Partial<ViewerConfig>;
  
  /**
   * Classes CSS additionnelles
   */
  className?: string;
  
  /**
   * Afficher la liste des éléments (mode simple)
   * @default true
   */
  showElementList?: boolean;
  
  /**
   * Position de la liste (mode simple)
   * @default 'left'
   */
  listPosition?: 'left' | 'right' | 'bottom';
  
  /**
   * Outils à afficher dans la barre d'outils
   */
  tools?: ViewerTool[];
  
  /**
   * Thème visuel
   * @default 'dark'
   */
  theme?: 'dark' | 'light';
  
  /**
   * Hauteur du viewer
   * @default '100%'
   */
  height?: string | number;
  
  /**
   * Chargement de fichiers activé
   * @default false
   */
  enableFileUpload?: boolean;
  
  /**
   * Types de fichiers acceptés
   */
  acceptedFileTypes?: string[];
  
  /**
   * Callback lors du chargement d'un fichier
   */
  onFileLoad?: (file: File, parsedData: PivotScene) => void;
  
  /**
   * Callback d'erreur
   */
  onError?: (error: Error) => void;
  
  /**
   * Langue de l'interface
   * @default 'fr'
   */
  locale?: 'fr' | 'en';
}

/**
 * État du viewer
 */
export interface ViewerState {
  mode: ViewerMode;
  elements: PivotElement[];
  selectedElementId: string | null;
  highlightedElementId: string | null;
  hiddenElementIds: Set<string>;
  isolatedElementIds: Set<string>;
  visibleElements: Set<string>;
  measurements: Measurement[];
  annotations: Annotation[];
  sectionPlanes: SectionPlane[];
  camera: CameraState;
  config: ViewerConfig;
  isLoading: boolean;
  error: string | null;
  elementsModified: boolean;
  history: HistoryState;
}

/**
 * Mesure
 */
export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'radius' | 'area' | 'volume' | 'perimeter';
  points: [number, number, number][];
  value: number;
  unit: string;
  visible: boolean;
}

/**
 * Annotation
 */
export interface Annotation {
  id: string;
  elementId?: string;
  position: [number, number, number];
  text: string;
  style?: {
    color?: string;
    fontSize?: number;
    background?: boolean;
    icon?: string;
  };
  visible: boolean;
  metadata?: {
    author?: string;
    createdAt?: string;
    type?: string;
  };
}

/**
 * Plan de coupe
 */
export interface SectionPlane {
  id: string;
  normal: [number, number, number];
  position: [number, number, number];
  active: boolean;
  inverted: boolean;
  color?: string;
  opacity?: number;
  metadata?: {
    createdAt?: string;
    mode?: string;
  };
}

/**
 * État de la caméra
 */
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

/**
 * État de l'historique (undo/redo)
 */
export interface HistoryState {
  past: ViewerState[];
  future: ViewerState[];
  maxSize: number;
}

/**
 * Actions du store
 */
export interface ViewerActions {
  // Initialisation
  initialize: (options: { mode: ViewerMode; config: ViewerConfig; elements?: PivotElement[] }) => void;
  
  // Éléments
  loadElements: (elements: PivotElement[]) => void;
  addElement: (element: PivotElement) => void;
  updateElement: (id: string, updates: Partial<PivotElement>) => void;
  deleteElement: (id: string) => void;
  
  // Sélection
  selectElement: (id: string | null) => void;
  highlightElement: (id: string | null) => void;
  selectMultiple: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Visibilité
  hideElement: (id: string) => void;
  showElement: (id: string) => void;
  isolateElements: (ids: string[]) => void;
  showAllElements: () => void;
  
  // Mesures et annotations
  addMeasurement: (measurement: Measurement) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  
  // Plans de coupe
  addSectionPlane: (plane: SectionPlane) => void;
  updateSectionPlane: (id: string, updates: Partial<SectionPlane>) => void;
  removeSectionPlane: (id: string) => void;
  
  // Caméra
  updateCamera: (state: Partial<CameraState>) => void;
  fitToView: (elementIds?: string[]) => void;
  fitToElement: (elementId: string) => void;
  focusOnPosition: (position: [number, number, number], distance?: number) => void;
  setView: (view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso') => void;
  
  // Historique
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Utilitaires
  clearModifiedFlag: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Store complet
 */
export type ViewerStore = ViewerState & ViewerActions;