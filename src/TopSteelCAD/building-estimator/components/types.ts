/**
 * Types pour les composants d'interface
 * Building Estimator - TopSteelCAD
 */

import { MonoPenteBuilding, Opening, BuildingDimensions, BuildingParameters, Finishes, BuildingType, BuildingExtension } from '../types';
import { Nomenclature } from '../types/nomenclature.types';

/**
 * Étapes du workflow
 */
export enum BuildingStep {
  DIMENSIONS = 0,
  OPENINGS = 1,
  FINISHES = 2,
  SUMMARY = 3
}

/**
 * État du formulaire de création
 */
export interface BuildingFormState {
  // Étape courante
  currentStep: BuildingStep;

  // Données du formulaire
  buildingType: BuildingType;
  name: string;
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  openings: Opening[];
  extensions: BuildingExtension[];
  finishes: Finishes;

  // Bâtiment généré
  building: MonoPenteBuilding | null;
  nomenclature: Nomenclature | null;

  // État UI
  isGenerating: boolean;
  errors: Record<string, string>;
  hasUnsavedChanges: boolean;
}

/**
 * Actions du formulaire
 */
export type BuildingFormAction =
  | { type: 'SET_STEP'; payload: BuildingStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_BUILDING_TYPE'; payload: BuildingType }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_DIMENSIONS'; payload: Partial<BuildingDimensions> }
  | { type: 'SET_PARAMETERS'; payload: Partial<BuildingParameters> }
  | { type: 'ADD_OPENING'; payload: Opening }
  | { type: 'UPDATE_OPENING'; payload: { id: string; updates: Partial<Opening> } }
  | { type: 'DELETE_OPENING'; payload: string }
  | { type: 'ADD_EXTENSION'; payload: BuildingExtension }
  | { type: 'UPDATE_EXTENSION'; payload: { id: string; updates: Partial<BuildingExtension> } }
  | { type: 'DELETE_EXTENSION'; payload: string }
  | { type: 'SET_FINISHES'; payload: Partial<Finishes> }
  | { type: 'GENERATE_BUILDING' }
  | { type: 'SET_BUILDING'; payload: MonoPenteBuilding }
  | { type: 'SET_NOMENCLATURE'; payload: Nomenclature }
  | { type: 'SET_ERROR'; payload: { field: string; message: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'RESET_FORM' };

/**
 * Props pour Step1_Dimensions
 */
export interface Step1DimensionsProps {
  buildingType: BuildingType;
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  extensions: BuildingExtension[];
  errors: Record<string, string>;
  onBuildingTypeChange: (type: BuildingType) => void;
  onDimensionsChange: (dimensions: Partial<BuildingDimensions>) => void;
  onParametersChange: (parameters: Partial<BuildingParameters>) => void;
  onAddExtension: (extension: BuildingExtension) => void;
  onUpdateExtension: (id: string, updates: Partial<BuildingExtension>) => void;
  onDeleteExtension: (id: string) => void;
  onNext: () => void;
}

/**
 * Props pour Step2_Openings
 */
export interface Step2OpeningsProps {
  openings: Opening[];
  buildingDimensions: BuildingDimensions;
  onAddOpening: (opening: Opening) => void;
  onUpdateOpening: (id: string, updates: Partial<Opening>) => void;
  onDeleteOpening: (id: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Props pour Step3_Finishes
 */
export interface Step3FinishesProps {
  finishes: Finishes;
  onFinishesChange: (finishes: Partial<Finishes>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Props pour Step4_Summary
 */
export interface Step4SummaryProps {
  building: MonoPenteBuilding;
  nomenclature: Nomenclature;
  isGenerating: boolean;
  onPrevious: () => void;
  onExport: (format: 'csv' | 'json' | 'ifc') => void;
  onReset: () => void;
}

/**
 * Props pour BuildingEstimator
 */
export interface BuildingEstimatorProps {
  // Bâtiment initial (pour édition)
  initialBuilding?: MonoPenteBuilding;

  // Callbacks
  onComplete?: (building: MonoPenteBuilding, nomenclature: Nomenclature) => void;
  onCancel?: () => void;

  // Options
  showHeader?: boolean;
  showFooter?: boolean;
  mode?: 'create' | 'edit';
}

/**
 * Options de visualisation 3D
 */
export interface Viewer3DOptions {
  showStructure: boolean;
  showCladding: boolean;
  showRoofing: boolean;
  showOpenings: boolean;
  levelOfDetail: 'low' | 'medium' | 'high';
}
