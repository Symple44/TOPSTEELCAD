import { useReducer, useRef, useState, useCallback } from 'react';
import {
  PartElement,
  DisplayMode,
  HoleDSTV,
  PartBuilderState,
  PartBuilderAction
} from '../types/partBuilder.types';
import { ProfileDatabase } from '../../3DLibrary/database/ProfileDatabase';
import { ProfileType } from '../../3DLibrary/types/profile.types';
import { universalExporter, ExportFormat } from '../../core/export';
import { generateUniqueId } from '../utils/idGenerator';
import { parseCSVFile } from '../utils/csvParser';

// Instance de la base de données des profilés
const profileDB = ProfileDatabase.getInstance();

// Valeurs par défaut pour les dimensions
const DEFAULT_DIMENSIONS = {
  height: 200,
  width: 100,
  webThickness: 5.6,
  flangeThickness: 8.5
} as const;

// Reducer pour gérer l'état
const partBuilderReducer = (state: PartBuilderState, action: PartBuilderAction): PartBuilderState => {
  switch (action.type) {
    case 'ADD_ELEMENT':
      return {
        ...state,
        elements: [...state.elements, action.payload]
      };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.payload.id ? { ...el, ...action.payload.updates } : el
        )
      };
    case 'DELETE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload),
        selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId
      };
    case 'SELECT_ELEMENT':
      return {
        ...state,
        selectedElementId: action.payload
      };
    case 'SET_DISPLAY_MODE':
      return {
        ...state,
        displayMode: action.payload
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };
    case 'BATCH_UPDATE':
      return {
        ...state,
        elements: action.payload
      };
    case 'IMPORT_ELEMENTS':
      return {
        ...state,
        elements: [...state.elements, ...action.payload]
      };
    default:
      return state;
  }
};

// Hook principal pour la logique du Part Builder
export function usePartBuilder() {
  // État initial
  const initialState: PartBuilderState = {
    elements: [],
    selectedElementId: null,
    displayMode: DisplayMode.LIST,
    filters: {},
    sortBy: null,
    sortOrder: 'asc',
    editingCell: null
  };

  // États principaux
  const [state, dispatch] = useReducer(partBuilderReducer, initialState);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [selectedElement3D, setSelectedElement3D] = useState<PartElement | null>(null);
  const [viewerTheme, setViewerTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Génération d'un nouvel élément
  const createNewElement = useCallback(async (): Promise<PartElement> => {
    const id = generateUniqueId('el');
    const nextRef = `A${state.elements.length + 1}`;

    // Si c'est le premier élément, ne pas définir de profil par défaut
    // L'utilisateur devra choisir
    if (state.elements.length === 0) {
      return {
        id,
        reference: nextRef,
        designation: 'Nouvelle pièce',
        quantity: 1,
        profileType: '' as any, // Vide pour forcer le choix
        profileSubType: '',
        length: 3000,
        material: 'S355',
        dimensions: undefined,
        weight: undefined,
        holes: [],
        status: 'draft',
        notes: ''
      };
    }

    // Pour les éléments suivants, récupérer le dernier profil utilisé depuis localStorage
    let profileType: string;
    let profileSubType: string;
    let profileDesignation: string;

    try {
      const lastUsedProfileData = localStorage.getItem('lastUsedProfile');
      if (lastUsedProfileData) {
        const lastUsed = JSON.parse(lastUsedProfileData);
        profileType = lastUsed.profileType;
        profileSubType = lastUsed.profileSubType;
        profileDesignation = lastUsed.profileDesignation;
      } else {
        // Fallback sur IPE 200 si aucun profil n'est mémorisé
        profileType = ProfileType.IPE;
        profileSubType = '200';
        profileDesignation = 'IPE 200';
      }
    } catch {
      // Fallback en cas d'erreur
      profileType = ProfileType.IPE;
      profileSubType = '200';
      profileDesignation = 'IPE 200';
    }

    // Récupérer les dimensions depuis la base de données
    const profile = await profileDB.getProfile(profileDesignation);
    const dimensions = profile ? {
      height: profile.dimensions.height,
      width: profile.dimensions.width,
      webThickness: profile.dimensions.webThickness || DEFAULT_DIMENSIONS.webThickness,
      flangeThickness: profile.dimensions.flangeThickness || DEFAULT_DIMENSIONS.flangeThickness
    } : DEFAULT_DIMENSIONS;

    // Calculer le poids si disponible
    const weight = profile?.weight ? profile.weight * (3000 / 1000) : undefined;

    return {
      id,
      reference: nextRef,
      designation: 'Nouvelle pièce',
      quantity: 1,
      profileType: profileType as ProfileType,
      profileSubType: profileSubType,
      length: 3000,
      material: 'S355',
      dimensions,
      weight,
      holes: [],
      status: 'draft',
      notes: ''
    };
  }, [state.elements.length]);

  // Ajout d'un nouvel élément
  const handleAddElement = useCallback(async () => {
    setIsLoading(true);
    try {
      const newElement = await createNewElement();
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
      dispatch({ type: 'SELECT_ELEMENT', payload: newElement.id });
    } catch (err) {
      setError('Erreur lors de la création de l\'élément');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [createNewElement]);

  // Mise à jour d'un élément avec gestion des dimensions
  const handleUpdateElement = useCallback(async (
    elementId: string,
    field: keyof PartElement,
    value: unknown
  ) => {
    const element = state.elements.find(el => el.id === elementId);
    const updates: Partial<PartElement> = { [field]: value };

    // Si on change le type ou sous-type de profil, mettre à jour les dimensions
    if ((field === 'profileType' || field === 'profileSubType') && element) {
      const profileType = field === 'profileType' ? value as string : element.profileType;
      const profileSubType = field === 'profileSubType' ? value as string : element.profileSubType;

      if (profileType && profileSubType) {
        const designation = `${profileType} ${profileSubType}`;
        const profile = await profileDB.getProfile(designation);

        if (profile) {
          updates.dimensions = {
            height: profile.dimensions.height,
            width: profile.dimensions.width,
            webThickness: profile.dimensions.webThickness || 10,
            flangeThickness: profile.dimensions.flangeThickness || 15
          };
        }
      }
    }

    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: { id: elementId, updates }
    });
  }, [state.elements]);

  // Suppression d'un élément avec confirmation personnalisée
  const handleDeleteElement = useCallback((elementId: string, skipConfirm = false) => {
    const deleteAction = () => {
      dispatch({ type: 'DELETE_ELEMENT', payload: elementId });
    };

    if (skipConfirm) {
      deleteAction();
    } else {
      // TODO: Remplacer par un modal de confirmation personnalisé
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        deleteAction();
      }
    }
  }, []);

  // Duplication d'un élément
  const handleDuplicateElement = useCallback((elementId: string) => {
    const element = state.elements.find(el => el.id === elementId);
    if (element) {
      const newElement: PartElement = {
        ...element,
        id: generateUniqueId('el'),
        reference: `${element.reference}-copie`,
        designation: `${element.designation} (copie)`
      };
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
    }
  }, [state.elements]);

  // Affichage du détail
  const handleShowDetail = useCallback((elementId: string) => {
    dispatch({ type: 'SELECT_ELEMENT', payload: elementId });
    setShowDetailModal(true);
  }, []);

  // Affichage 3D
  const handleShow3D = useCallback((elementId: string) => {
    const element = state.elements.find(el => el.id === elementId);
    if (element) {
      setSelectedElement3D(element);
      setShow3DViewer(true);
    }
  }, [state.elements]);

  // Tri
  const handleSort = useCallback((column: keyof PartElement) => {
    const newOrder = state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch({
      type: 'SET_SORT',
      payload: { sortBy: column, sortOrder: newOrder }
    });
  }, [state.sortBy, state.sortOrder]);

  // Gestion des trous
  const handleAddHole = useCallback((holes: HoleDSTV | HoleDSTV[]) => {
    console.log('🎯 usePartBuilder.handleAddHole called with:', holes);
    console.log('📌 Selected element ID:', state.selectedElementId);

    if (state.selectedElementId) {
      const element = state.elements.find(el => el.id === state.selectedElementId);
      console.log('📦 Element found:', element);

      if (element) {
        const newHoles = Array.isArray(holes) ? holes : [holes];
        const updatedHoles = [...element.holes, ...newHoles];

        console.log('✅ Updating holes:', {
          elementId: element.id,
          oldCount: element.holes.length,
          newCount: updatedHoles.length,
          addedHoles: newHoles
        });

        handleUpdateElement(state.selectedElementId, 'holes', updatedHoles);
      }
    }
  }, [state.selectedElementId, state.elements, handleUpdateElement]);

  const handleEditHole = useCallback((holeId: string, hole: HoleDSTV) => {
    if (state.selectedElementId) {
      const element = state.elements.find(el => el.id === state.selectedElementId);
      if (element) {
        const updatedHoles = element.holes.map(h => h.id === holeId ? hole : h);
        handleUpdateElement(state.selectedElementId, 'holes', updatedHoles);
      }
    }
  }, [state.selectedElementId, state.elements, handleUpdateElement]);

  const handleDeleteHole = useCallback((holeId: string) => {
    if (state.selectedElementId) {
      const element = state.elements.find(el => el.id === state.selectedElementId);
      if (element) {
        const updatedHoles = element.holes.filter(h => h.id !== holeId);
        handleUpdateElement(state.selectedElementId, 'holes', updatedHoles);
      }
    }
  }, [state.selectedElementId, state.elements, handleUpdateElement]);

  // Export avec le nouveau système unifié
  const handleExport = useCallback(async (format: 'DSTV' | 'CSV' | 'JSON' | 'IFC' | 'STEP') => {
    setIsLoading(true);
    try {
      // Le système unifie peut accepter directement les PartElements
      // Il détectera automatiquement le type et fera la conversion
      const result = await universalExporter.export(state.elements, {
        format: format as ExportFormat,
        filename: `export_${Date.now()}`,
        includeMetadata: true,
        includeFeatures: true,
        units: 'mm'
      });

      if (!result.success) {
        setError(`Erreur lors de l'export ${format}: ${result.error?.message}`);
      } else {
        console.log(`✓ Export ${format} réussi`);
      }
    } catch (err) {
      setError(`Erreur lors de l'export ${format}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [state.elements]);

  // Import CSV avec gestion d'erreurs
  const handleImportCSV = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const newElements = await parseCSVFile(file, state.elements.length);
      dispatch({ type: 'IMPORT_ELEMENTS', payload: newElements });
    } catch (err) {
      setError('Erreur lors de l\'import du fichier CSV');
      console.error(err);
    } finally {
      setIsLoading(false);
      // Reset the input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [state.elements.length]);

  // Élément sélectionné
  const selectedElement = state.elements.find(el => el.id === state.selectedElementId);

  return {
    // État
    state,
    dispatch,
    showDetailModal,
    setShowDetailModal,
    show3DViewer,
    setShow3DViewer,
    selectedElement3D,
    setSelectedElement3D,
    viewerTheme,
    setViewerTheme,
    selectedElement,
    fileInputRef,
    isLoading,
    error,
    setError,

    // Actions
    handleAddElement,
    handleUpdateElement,
    handleDeleteElement,
    handleDuplicateElement,
    handleShowDetail,
    handleShow3D,
    handleSort,
    handleAddHole,
    handleEditHole,
    handleDeleteHole,
    handleExport,
    handleImportCSV
  };
}