/**
 * Hook principal pour gérer l'état du Building Estimator
 * Building Estimator - TopSteelCAD
 */

import { useReducer, useCallback, useEffect } from 'react';
import {
  BuildingFormState,
  BuildingFormAction,
  BuildingStep
} from '../components/types';
import {
  BuildingType,
  CladdingType,
  RoofingType,
  MonoPenteBuilding
} from '../types';
import { BuildingEngine } from '../core/BuildingEngine';
import { NomenclatureBuilder } from '../core/NomenclatureBuilder';
import {
  downloadNomenclatureCSV,
  downloadNomenclatureHTML,
  downloadBuildingJSON,
  downloadBuildingIFC
} from '../utils/ExportUtils';

/**
 * État initial du formulaire
 */
const initialState: BuildingFormState = {
  currentStep: BuildingStep.DIMENSIONS,
  buildingType: BuildingType.MONO_PENTE,
  name: 'Nouveau Bâtiment',
  dimensions: {
    length: 20000,
    width: 12000,
    heightWall: 6000,
    slope: 10
  },
  parameters: {
    postSpacing: 5000,
    purlinSpacing: 1500,
    railSpacing: 1200,
    postProfile: 'IPE 240',
    rafterProfile: 'IPE 200',
    purlinProfile: 'IPE 140',
    railProfile: 'UAP 80',
    steelGrade: 'S235',
    includeGutters: true,
    includeDownspouts: true
  },
  openings: [],
  extensions: [],
  finishes: {
    cladding: {
      type: CladdingType.SANDWICH_80MM,
      color: 'RAL 9002',
      thickness: 80
    },
    roofing: {
      type: RoofingType.SANDWICH_80MM,
      color: 'RAL 7016',
      thickness: 80
    },
    trim: {
      color: 'RAL 9006'
    }
  },
  building: null,
  nomenclature: null,
  isGenerating: false,
  errors: {},
  hasUnsavedChanges: false
};

/**
 * Reducer pour gérer les actions
 */
function buildingFormReducer(
  state: BuildingFormState,
  action: BuildingFormAction
): BuildingFormState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT_STEP':
      if (state.currentStep < BuildingStep.SUMMARY) {
        return { ...state, currentStep: state.currentStep + 1 };
      }
      return state;

    case 'PREV_STEP':
      if (state.currentStep > BuildingStep.DIMENSIONS) {
        return { ...state, currentStep: state.currentStep - 1 };
      }
      return state;

    case 'SET_NAME':
      return {
        ...state,
        name: action.payload,
        hasUnsavedChanges: true
      };

    case 'SET_BUILDING_TYPE':
      return {
        ...state,
        buildingType: action.payload,
        hasUnsavedChanges: true
      };

    case 'SET_DIMENSIONS':
      return {
        ...state,
        dimensions: { ...state.dimensions, ...action.payload },
        hasUnsavedChanges: true
      };

    case 'SET_PARAMETERS':
      return {
        ...state,
        parameters: { ...state.parameters, ...action.payload },
        hasUnsavedChanges: true
      };

    case 'ADD_OPENING':
      return {
        ...state,
        openings: [...state.openings, action.payload],
        hasUnsavedChanges: true
      };

    case 'UPDATE_OPENING':
      return {
        ...state,
        openings: state.openings.map((opening) =>
          opening.id === action.payload.id
            ? { ...opening, ...action.payload.updates }
            : opening
        ),
        hasUnsavedChanges: true
      };

    case 'DELETE_OPENING':
      return {
        ...state,
        openings: state.openings.filter((o) => o.id !== action.payload),
        hasUnsavedChanges: true
      };

    case 'ADD_EXTENSION':
      return {
        ...state,
        extensions: [...state.extensions, action.payload],
        hasUnsavedChanges: true
      };

    case 'UPDATE_EXTENSION':
      return {
        ...state,
        extensions: state.extensions.map((extension) =>
          extension.id === action.payload.id
            ? { ...extension, ...action.payload.updates }
            : extension
        ),
        hasUnsavedChanges: true
      };

    case 'DELETE_EXTENSION':
      return {
        ...state,
        extensions: state.extensions.filter((e) => e.id !== action.payload),
        hasUnsavedChanges: true
      };

    case 'SET_FINISHES':
      return {
        ...state,
        finishes: {
          cladding: { ...state.finishes.cladding, ...action.payload.cladding },
          roofing: { ...state.finishes.roofing, ...action.payload.roofing },
          trim: { ...state.finishes.trim, ...action.payload.trim }
        },
        hasUnsavedChanges: true
      };

    case 'GENERATE_BUILDING':
      return { ...state, isGenerating: true };

    case 'SET_BUILDING':
      return {
        ...state,
        building: action.payload,
        isGenerating: false,
        hasUnsavedChanges: false
      };

    case 'SET_NOMENCLATURE':
      return { ...state, nomenclature: action.payload };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.field]: action.payload.message }
      };

    case 'CLEAR_ERROR':
      const { [action.payload]: _, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };

    case 'RESET_FORM':
      return initialState;

    default:
      return state;
  }
}

/**
 * Hook principal
 */
export function useBuildingEstimator(initialBuilding?: MonoPenteBuilding) {
  const [state, dispatch] = useReducer(buildingFormReducer, initialState);

  // Initialiser avec un bâtiment existant si fourni
  useEffect(() => {
    if (initialBuilding) {
      dispatch({ type: 'SET_BUILDING', payload: initialBuilding });
      dispatch({ type: 'SET_NAME', payload: initialBuilding.name });
      dispatch({ type: 'SET_DIMENSIONS', payload: initialBuilding.dimensions });
      dispatch({ type: 'SET_PARAMETERS', payload: initialBuilding.parameters });
      dispatch({ type: 'SET_FINISHES', payload: initialBuilding.finishes });

      // Générer nomenclature
      const nomenclature = NomenclatureBuilder.buildFromBuilding(initialBuilding);
      dispatch({ type: 'SET_NOMENCLATURE', payload: nomenclature });
    }
  }, [initialBuilding]);

  /**
   * Génère le bâtiment avec les données actuelles
   */
  const generateBuilding = useCallback(() => {
    dispatch({ type: 'GENERATE_BUILDING' });

    try {
      // Créer le bâtiment
      const building = BuildingEngine.createMonoPenteBuilding({
        name: state.name,
        dimensions: state.dimensions,
        parameters: state.parameters,
        openings: state.openings,
        finishes: state.finishes
      });

      // Valider
      const validation = BuildingEngine.validateBuilding(building);
      if (!validation.isValid) {
        validation.errors.forEach((error) => {
          dispatch({
            type: 'SET_ERROR',
            payload: { field: 'building', message: error }
          });
        });
        return;
      }

      // Générer nomenclature
      const nomenclature = NomenclatureBuilder.buildFromBuilding(building);

      dispatch({ type: 'SET_BUILDING', payload: building });
      dispatch({ type: 'SET_NOMENCLATURE', payload: nomenclature });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          field: 'building',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      });
    }
  }, [state.name, state.dimensions, state.parameters, state.openings, state.finishes]);

  /**
   * Passer à l'étape suivante
   */
  const nextStep = useCallback(() => {
    // Validation selon l'étape
    switch (state.currentStep) {
      case BuildingStep.DIMENSIONS:
        // Valider les dimensions
        if (state.dimensions.length < 3000 || state.dimensions.length > 100000) {
          dispatch({
            type: 'SET_ERROR',
            payload: { field: 'length', message: 'Longueur invalide (3-100m)' }
          });
          return;
        }
        break;

      case BuildingStep.FINISHES:
        // Générer le bâtiment avant d'aller au résumé
        generateBuilding();
        break;
    }

    dispatch({ type: 'NEXT_STEP' });
  }, [state.currentStep, state.dimensions, generateBuilding]);

  /**
   * Revenir à l'étape précédente
   */
  const previousStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  /**
   * Aller à une étape spécifique
   */
  const goToStep = useCallback((step: BuildingStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  /**
   * Mettre à jour le nom
   */
  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', payload: name });
  }, []);

  /**
   * Mettre à jour le type de bâtiment
   */
  const setBuildingType = useCallback((buildingType: BuildingType) => {
    dispatch({ type: 'SET_BUILDING_TYPE', payload: buildingType });
  }, []);

  /**
   * Mettre à jour les dimensions
   */
  const setDimensions = useCallback((dimensions: Partial<typeof state.dimensions>) => {
    dispatch({ type: 'SET_DIMENSIONS', payload: dimensions });
    dispatch({ type: 'CLEAR_ERROR', payload: 'dimensions' });
  }, []);

  /**
   * Mettre à jour les paramètres
   */
  const setParameters = useCallback((parameters: Partial<typeof state.parameters>) => {
    dispatch({ type: 'SET_PARAMETERS', payload: parameters });
  }, []);

  /**
   * Ajouter une ouverture
   */
  const addOpening = useCallback((opening: typeof state.openings[0]) => {
    dispatch({ type: 'ADD_OPENING', payload: opening });
  }, []);

  /**
   * Mettre à jour une ouverture
   */
  const updateOpening = useCallback(
    (id: string, updates: Partial<typeof state.openings[0]>) => {
      dispatch({ type: 'UPDATE_OPENING', payload: { id, updates } });
    },
    []
  );

  /**
   * Supprimer une ouverture
   */
  const deleteOpening = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OPENING', payload: id });
  }, []);

  /**
   * Ajouter une extension
   */
  const addExtension = useCallback((extension: typeof state.extensions[0]) => {
    dispatch({ type: 'ADD_EXTENSION', payload: extension });
  }, []);

  /**
   * Mettre à jour une extension
   */
  const updateExtension = useCallback(
    (id: string, updates: Partial<typeof state.extensions[0]>) => {
      dispatch({ type: 'UPDATE_EXTENSION', payload: { id, updates } });
    },
    []
  );

  /**
   * Supprimer une extension
   */
  const deleteExtension = useCallback((id: string) => {
    dispatch({ type: 'DELETE_EXTENSION', payload: id });
  }, []);

  /**
   * Mettre à jour les finitions
   */
  const setFinishes = useCallback((finishes: Partial<typeof state.finishes>) => {
    dispatch({ type: 'SET_FINISHES', payload: finishes });
  }, []);

  /**
   * Réinitialiser le formulaire
   */
  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  /**
   * Exporter
   */
  const exportBuilding = useCallback(
    (format: 'csv' | 'json' | 'ifc' | 'html') => {
      if (!state.building || !state.nomenclature) return;

      switch (format) {
        case 'csv':
          downloadNomenclatureCSV(state.nomenclature);
          break;

        case 'html':
          downloadNomenclatureHTML(state.nomenclature);
          break;

        case 'json':
          downloadBuildingJSON(state.building, state.building.name);
          break;

        case 'ifc':
          downloadBuildingIFC(state.building, {
            projectName: state.building.name,
            includeGeometry: true,
            includeMaterials: true,
            includeProperties: true
          });
          break;
      }
    },
    [state.building, state.nomenclature]
  );

  return {
    // État
    state,

    // Navigation
    nextStep,
    previousStep,
    goToStep,

    // Modifications
    setName,
    setBuildingType,
    setDimensions,
    setParameters,
    addOpening,
    updateOpening,
    deleteOpening,
    addExtension,
    updateExtension,
    deleteExtension,
    setFinishes,

    // Actions
    generateBuilding,
    exportBuilding,
    resetForm
  };
}
