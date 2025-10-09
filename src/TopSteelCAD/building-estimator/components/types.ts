/**
 * Types pour les composants d'interface
 * Building Estimator - TopSteelCAD
 */

import {
  Building,
  MonoPenteBuilding,
  Opening,
  BuildingDimensions,
  BuildingParameters,
  Finishes,
  BuildingType,
  BuildingExtension,
  GuardrailConfig,
  AcrotereConfig,
  CladingConfig,
  RoofingConfig,
  PaintingConfig,
  AccessoriesConfig,
  OptionsConfig
} from '../types';
import { SolarArrayConfig, Location } from '../types/ombriere.types';
import { Nomenclature } from '../types/nomenclature.types';

/**
 * Étapes du workflow
 */
export enum BuildingStep {
  DIMENSIONS = 0,    // Structure principale (dimensions et composition)
  EQUIPMENT = 1,     // Ossature secondaire (ouvertures + garde-corps + acrotères)
  ENVELOPE = 2,      // Enveloppe (bardage + couverture)
  FINISHING = 3,     // Finitions (peinture + accessoires + options)
  SUMMARY = 4        // Résumé et export
}

/**
 * État du formulaire de création
 */
export interface BuildingFormState {
  // Étape courante
  currentStep: BuildingStep;

  // Données du formulaire - Step 1: Dimensions
  buildingType: BuildingType;
  name: string;
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  extensions: BuildingExtension[];

  // Données du formulaire - Step 2: Equipment (ossature secondaire)
  openings: Opening[];
  equipmentByStructure: {
    [structureId: string]: {
      guardrail?: GuardrailConfig;
      acrotere?: AcrotereConfig;
      solarArray?: SolarArrayConfig; // Pour ombrières
    }
  };

  // Localisation (pour calculs solaires)
  location?: Location;

  // Données du formulaire - Step 3: Envelope
  envelopeByStructure: {
    [structureId: string]: {
      clading?: CladingConfig;
      roofing?: RoofingConfig;
    }
  };

  // Données du formulaire - Step 4: Finishing
  finishingByStructure: {
    [structureId: string]: {
      painting?: PaintingConfig;
      accessories?: AccessoriesConfig;
      options?: OptionsConfig;
    }
  };

  // Ancienne propriété finishes (conservée pour compatibilité)
  finishes: Finishes;

  // Bâtiment généré (supporte tous les types)
  building: Building | null;
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
  | { type: 'SET_GUARDRAIL'; payload: { structureId: string; config: GuardrailConfig | undefined } }
  | { type: 'SET_ACROTERE'; payload: { structureId: string; config: AcrotereConfig | undefined } }
  | { type: 'SET_SOLAR_ARRAY'; payload: { structureId: string; config: SolarArrayConfig | undefined } }
  | { type: 'SET_LOCATION'; payload: Location | undefined }
  | { type: 'SET_CLADING'; payload: { structureId: string; config: CladingConfig | undefined } }
  | { type: 'SET_ROOFING'; payload: { structureId: string; config: RoofingConfig | undefined } }
  | { type: 'SET_PAINTING'; payload: { structureId: string; config: PaintingConfig | undefined } }
  | { type: 'SET_ACCESSORIES'; payload: { structureId: string; config: AccessoriesConfig | undefined } }
  | { type: 'SET_OPTIONS'; payload: { structureId: string; config: OptionsConfig | undefined } }
  | { type: 'SET_FINISHES'; payload: Partial<Finishes> }
  | { type: 'GENERATE_BUILDING' }
  | { type: 'SET_BUILDING'; payload: Building }
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
 * Props pour Step2_Equipment (ossature secondaire)
 */
export interface Step2EquipmentProps {
  openings: Opening[];
  equipmentByStructure: {
    [structureId: string]: {
      guardrail?: GuardrailConfig;
      acrotere?: AcrotereConfig;
      solarArray?: SolarArrayConfig;
    }
  };
  extensions: BuildingExtension[];
  buildingDimensions: BuildingDimensions;
  buildingParameters: BuildingParameters;
  buildingType: BuildingType;
  location?: Location;
  onAddOpening: (opening: Opening) => void;
  onUpdateOpening: (id: string, updates: Partial<Opening>) => void;
  onDeleteOpening: (id: string) => void;
  onSetGuardrail: (structureId: string, config: GuardrailConfig | undefined) => void;
  onSetAcrotere: (structureId: string, config: AcrotereConfig | undefined) => void;
  onSetSolarArray: (structureId: string, config: SolarArrayConfig | undefined) => void;
  onSetLocation: (location: Location | undefined) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Props pour Step3_Envelope (enveloppe)
 */
export interface Step3EnvelopeProps {
  envelopeByStructure: {
    [structureId: string]: {
      clading?: CladingConfig;
      roofing?: RoofingConfig;
    }
  };
  extensions: BuildingExtension[];
  buildingDimensions: BuildingDimensions;
  buildingParameters: BuildingParameters;
  buildingType: BuildingType;
  openings: Opening[];
  equipmentByStructure: {
    [structureId: string]: {
      guardrail?: GuardrailConfig;
      acrotere?: AcrotereConfig;
    }
  };
  onSetClading: (structureId: string, config: CladingConfig | undefined) => void;
  onSetRoofing: (structureId: string, config: RoofingConfig | undefined) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Props pour Step4_Finishing (finitions)
 */
export interface Step4FinishingProps {
  finishingByStructure: {
    [structureId: string]: {
      painting?: PaintingConfig;
      accessories?: AccessoriesConfig;
      options?: OptionsConfig;
    }
  };
  extensions: BuildingExtension[];
  buildingDimensions: BuildingDimensions;
  buildingParameters: BuildingParameters;
  buildingType: BuildingType;
  openings: Opening[];
  equipmentByStructure: {
    [structureId: string]: {
      guardrail?: GuardrailConfig;
      acrotere?: AcrotereConfig;
    }
  };
  onSetPainting: (structureId: string, config: PaintingConfig | undefined) => void;
  onSetAccessories: (structureId: string, config: AccessoriesConfig | undefined) => void;
  onSetOptions: (structureId: string, config: OptionsConfig | undefined) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Props pour Step5_Summary
 */
export interface Step5SummaryProps {
  building: Building | null;
  nomenclature: Nomenclature | null;
  isGenerating?: boolean;
  onPrevious: () => void;
  onExport: (format: 'csv' | 'json' | 'ifc' | 'html') => void;
  onReset: () => void;
}

/**
 * Props pour BuildingEstimator
 */
export interface BuildingEstimatorProps {
  // Bâtiment initial (pour édition)
  initialBuilding?: Building;

  // Callbacks
  onComplete?: (building: Building, nomenclature: Nomenclature) => void;
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
