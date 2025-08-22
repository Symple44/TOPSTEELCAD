import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  // ViewerState, 
  // ViewerActions, 
  ViewerStore,
  // Measurement,
  // Annotation,
  // SectionPlane,
  // CameraState,
  // ViewerMode,
  // ViewerConfig
} from '../types';
// import { PivotElement } from '@/types/viewer';

/**
 * Store Zustand pour la gestion d'état centralisée du viewer
 */
export const useViewerStore = create<ViewerStore>()(
  subscribeWithSelector((set, get) => ({
    // État initial
    mode: 'simple',
    elements: [],
    selectedElementId: null,
    highlightedElementId: null,
    hiddenElementIds: new Set(),
    isolatedElementIds: new Set(),
    measurements: [],
    annotations: [],
    sectionPlanes: [],
    camera: {
      position: [2000, 2000, 2000],
      target: [0, 0, 0],
      up: [0, 1, 0],
      fov: 45,
      near: 1,
      far: 50000
    },
    config: {},
    isLoading: false,
    error: null,
    elementsModified: false,
    visibleElements: new Set(),
    history: {
      past: [],
      future: [],
      maxSize: 50
    },

    // Actions
    initialize: ({ mode, config, elements = [] }) => {
      set({
        mode,
        config,
        elements,
        isLoading: false,
        error: null
      });
    },

    // Gestion des éléments
    loadElements: (elements) => {
      set({ 
        elements,
        elementsModified: false,
        selectedElementId: null,
        highlightedElementId: null,
        visibleElements: new Set(elements.map(e => e.id))
      });
    },

    addElement: (element) => {
      const { elements, history, visibleElements } = get();
      const newElements = [...elements, element];
      const newVisibleElements = new Set(visibleElements);
      newVisibleElements.add(element.id);
      
      // Sauvegarder dans l'historique
      const newHistory = {
        past: [...history.past, { ...get(), elements }].slice(-history.maxSize),
        future: [],
        maxSize: history.maxSize
      };
      
      set({
        elements: newElements,
        elementsModified: true,
        visibleElements: newVisibleElements,
        history: newHistory
      });
    },

    updateElement: (id, updates) => {
      const { elements, history } = get();
      const index = elements.findIndex(e => e.id === id);
      
      if (index === -1) return;
      
      const newElements = [...elements];
      newElements[index] = { ...newElements[index], ...updates };
      
      // Sauvegarder dans l'historique
      const newHistory = {
        past: [...history.past, { ...get(), elements }].slice(-history.maxSize),
        future: [],
        maxSize: history.maxSize
      };
      
      set({
        elements: newElements,
        elementsModified: true,
        history: newHistory
      });
    },

    deleteElement: (id) => {
      const { elements, history, selectedElementId, visibleElements } = get();
      const newElements = elements.filter(e => e.id !== id);
      const newVisibleElements = new Set(visibleElements);
      newVisibleElements.delete(id);
      
      // Sauvegarder dans l'historique
      const newHistory = {
        past: [...history.past, { ...get(), elements }].slice(-history.maxSize),
        future: [],
        maxSize: history.maxSize
      };
      
      set({
        elements: newElements,
        elementsModified: true,
        selectedElementId: selectedElementId === id ? null : selectedElementId,
        visibleElements: newVisibleElements,
        history: newHistory
      });
    },

    // Sélection
    selectElement: (id) => {
      set({ selectedElementId: id });
    },

    highlightElement: (id) => {
      set({ highlightedElementId: id });
    },

    selectMultiple: (ids) => {
      // Pour une sélection multiple, on garde le dernier ID
      set({ selectedElementId: ids[ids.length - 1] || null });
    },

    selectAll: () => {
      const { elements } = get();
      if (elements.length > 0) {
        set({ selectedElementId: elements[0].id });
      }
    },

    clearSelection: () => {
      set({ 
        selectedElementId: null,
        highlightedElementId: null 
      });
    },

    // Visibilité
    hideElement: (id) => {
      const { hiddenElementIds, visibleElements } = get();
      const newHidden = new Set(hiddenElementIds);
      const newVisible = new Set(visibleElements);
      newHidden.add(id);
      newVisible.delete(id);
      set({ hiddenElementIds: newHidden, visibleElements: newVisible });
    },

    showElement: (id) => {
      const { hiddenElementIds, visibleElements } = get();
      const newHidden = new Set(hiddenElementIds);
      const newVisible = new Set(visibleElements);
      newHidden.delete(id);
      newVisible.add(id);
      set({ hiddenElementIds: newHidden, visibleElements: newVisible });
    },

    isolateElements: (ids) => {
      // const { elements } = get();
      set({ 
        isolatedElementIds: new Set(ids),
        hiddenElementIds: new Set(),
        visibleElements: new Set(ids)
      });
    },

    showAllElements: () => {
      const { elements } = get();
      set({ 
        hiddenElementIds: new Set(),
        isolatedElementIds: new Set(),
        visibleElements: new Set(elements.map(e => e.id))
      });
    },

    // Mesures et annotations
    addMeasurement: (measurement) => {
      const { measurements } = get();
      set({ measurements: [...measurements, measurement] });
    },

    removeMeasurement: (id) => {
      const { measurements } = get();
      set({ measurements: measurements.filter(m => m.id !== id) });
    },

    clearMeasurements: () => {
      set({ measurements: [] });
    },

    addAnnotation: (annotation) => {
      const { annotations } = get();
      set({ annotations: [...annotations, annotation] });
    },

    removeAnnotation: (id) => {
      const { annotations } = get();
      set({ annotations: annotations.filter(a => a.id !== id) });
    },

    clearAnnotations: () => {
      set({ annotations: [] });
    },

    // Plans de coupe
    addSectionPlane: (plane) => {
      const { sectionPlanes } = get();
      set({ sectionPlanes: [...sectionPlanes, plane] });
    },

    updateSectionPlane: (id, updates) => {
      const { sectionPlanes } = get();
      const index = sectionPlanes.findIndex(p => p.id === id);
      
      if (index === -1) return;
      
      const newPlanes = [...sectionPlanes];
      newPlanes[index] = { ...newPlanes[index], ...updates };
      set({ sectionPlanes: newPlanes });
    },

    removeSectionPlane: (id) => {
      const { sectionPlanes } = get();
      set({ sectionPlanes: sectionPlanes.filter(p => p.id !== id) });
    },

    // Caméra
    updateCamera: (state) => {
      const { camera } = get();
      set({ camera: { ...camera, ...state } });
    },

    fitToView: (elementIds) => {
      const { elements } = get();
      const targetElements = elementIds 
        ? elements.filter(e => elementIds.includes(e.id))
        : elements;
      
      if (targetElements.length === 0) return;
      
      // Calculer la boîte englobante
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      
      targetElements.forEach(element => {
        const [x, y, z] = element.position;
        const dims = element.dimensions;
        
        minX = Math.min(minX, x - dims.length / 2);
        minY = Math.min(minY, y - (dims.height || dims.width) / 2);
        minZ = Math.min(minZ, z - dims.width / 2);
        
        maxX = Math.max(maxX, x + dims.length / 2);
        maxY = Math.max(maxY, y + (dims.height || dims.width) / 2);
        maxZ = Math.max(maxZ, z + dims.width / 2);
      });
      
      const center: [number, number, number] = [
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2
      ];
      
      const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
      const distance = size * 2;
      
      set({
        camera: {
          ...get().camera,
          position: [
            center[0] + distance,
            center[1] + distance,
            center[2] + distance
          ],
          target: center
        }
      });
    },

    // Focus sur un élément spécifique
    fitToElement: (elementId: string) => {
      get().fitToView([elementId]);
    },

    // Focus sur une position spécifique avec zoom
    focusOnPosition: (position: [number, number, number], distance = 500) => {
      set({
        camera: {
          ...get().camera,
          position: [
            position[0] + distance,
            position[1] + distance,
            position[2] + distance
          ],
          target: position
        }
      });
    },

    setView: (view) => {
      const { camera } = get();
      const target = camera.target;
      const distance = 5000;
      
      const positions: Record<string, [number, number, number]> = {
        front: [target[0], target[1], target[2] + distance],
        back: [target[0], target[1], target[2] - distance],
        left: [target[0] - distance, target[1], target[2]],
        right: [target[0] + distance, target[1], target[2]],
        top: [target[0], target[1] + distance, target[2]],
        bottom: [target[0], target[1] - distance, target[2]],
        iso: [
          target[0] + distance * 0.577,
          target[1] + distance * 0.577,
          target[2] + distance * 0.577
        ]
      };
      
      const ups: Record<string, [number, number, number]> = {
        front: [0, 1, 0],
        back: [0, 1, 0],
        left: [0, 1, 0],
        right: [0, 1, 0],
        top: [0, 0, -1],
        bottom: [0, 0, 1],
        iso: [0, 1, 0]
      };
      
      set({
        camera: {
          ...camera,
          position: positions[view] || positions.iso,
          up: ups[view] || ups.iso
        }
      });
    },

    // Historique
    undo: () => {
      const { history } = get();
      if (history.past.length === 0) return;
      
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      const newFuture = [get(), ...history.future].slice(0, history.maxSize);
      
      set({
        ...previous,
        history: {
          ...history,
          past: newPast,
          future: newFuture
        }
      });
    },

    redo: () => {
      const { history } = get();
      if (history.future.length === 0) return;
      
      const next = history.future[0];
      const newPast = [...history.past, get()].slice(-history.maxSize);
      const newFuture = history.future.slice(1);
      
      set({
        ...next,
        history: {
          ...history,
          past: newPast,
          future: newFuture
        }
      });
    },

    clearHistory: () => {
      set({
        history: {
          past: [],
          future: [],
          maxSize: get().history.maxSize
        }
      });
    },

    // Utilitaires
    clearModifiedFlag: () => {
      set({ elementsModified: false });
    },

    setError: (error) => {
      set({ error });
    },

    setLoading: (loading) => {
      set({ isLoading: loading });
    }
  }))
);