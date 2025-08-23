/**
 * Hook principal pour la gestion du viewer TopSteelCAD
 */

'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useViewerStore } from '../components/TopSteelViewer/store/useViewerStore';
import { useTheme } from '../themes/ThemeProvider';
import { 
  ViewerConfig, 
  ViewerModeConfig, 
  ViewerAPI, 
  ViewerPlugin
} from '../modes/types';
import { ThemeConfig } from '../themes/types';
import { PivotElement } from '@/types/viewer';

// Modes prédéfinis (seront importés depuis les presets)
const defaultMinimalMode: ViewerModeConfig = {
  id: 'minimal',
  name: 'Mode Minimal',
  description: 'Visualisation simple et épurée',
  features: [
    { id: 'scene3d', enabled: true },
    { id: 'controls', enabled: true },
    { id: 'grid', enabled: true },
    { id: 'viewcube', enabled: true }
  ],
  layout: {
    header: false,
    sidebar: 'none',
    statusBar: false,
    toolbar: 'none',
    responsive: true
  },
  tools: [],
  panels: []
};

const defaultStandardMode: ViewerModeConfig = {
  id: 'standard',
  name: 'Mode Standard',
  description: 'Outils de visualisation et navigation',
  features: [
    { id: 'scene3d', enabled: true },
    { id: 'controls', enabled: true },
    { id: 'grid', enabled: true },
    { id: 'axes', enabled: true },
    { id: 'viewcube', enabled: true },
    { id: 'selection', enabled: true },
    { id: 'hierarchy', enabled: true },
    { id: 'properties', enabled: true }
  ],
  layout: {
    header: true,
    sidebar: 'both',
    statusBar: true,
    toolbar: 'top',
    responsive: true
  },
  tools: [
    { id: 'select', group: 'basic' },
    { id: 'pan', group: 'basic' },
    { id: 'rotate', group: 'basic' },
    { id: 'zoom', group: 'basic' }
  ],
  panels: [
    { id: 'hierarchy', position: 'left', defaultOpen: true },
    { id: 'properties', position: 'right', defaultOpen: true }
  ]
};

/**
 * Hook useViewer - Gestion centralisée du viewer
 */
export function useViewer(config?: Partial<ViewerConfig>) {
  // Store Zustand
  const store = useViewerStore();
  
  // Thème
  const { theme: currentTheme, setTheme: setGlobalTheme } = useTheme();
  
  // État local
  const [mode, setMode] = useState<ViewerModeConfig>(() => {
    if (config?.mode) return config.mode;
    switch (config?.defaultMode) {
      case 'minimal': return defaultMinimalMode;
      case 'standard': return defaultStandardMode;
      default: return defaultStandardMode;
    }
  });
  
  const [plugins, setPlugins] = useState<Map<string, ViewerPlugin>>(new Map());
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  
  // Références
  const eventHandlers = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());
  const pluginCleanups = useRef<Map<string, (() => void)[]>>(new Map());
  
  // Gestion des événements
  const emit = useCallback((event: string, data?: any) => {
    const handlers = eventHandlers.current.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }, []);
  
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);
  }, []);
  
  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const handlers = eventHandlers.current.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);
  
  // API du viewer
  const api = useMemo<ViewerAPI>(() => ({
    // Gestion des éléments
    getElements: () => Array.from(store.elements),
    addElement: (element: PivotElement) => {
      store.addElement(element);
      emit('element:added', element);
    },
    updateElement: (id: string, updates: Partial<PivotElement>) => {
      store.updateElement(id, updates);
      emit('element:updated', { id, updates });
    },
    deleteElement: (id: string) => {
      store.deleteElement(id);
      emit('element:deleted', id);
    },
    
    // Sélection
    selectElement: (id: string | null) => {
      store.selectElement(id);
      emit('selection:changed', id);
    },
    getSelectedElement: () => {
      return store.elements.find(e => e.id === store.selectedElementId) || null;
    },
    selectMultiple: (ids: string[]) => {
      store.selectMultiple(ids);
      emit('selection:multiple', ids);
    },
    clearSelection: () => {
      store.clearSelection();
      emit('selection:cleared');
    },
    
    // Visibilité
    showElement: (id: string) => {
      store.showElement(id);
      emit('visibility:changed', { id, visible: true });
    },
    hideElement: (id: string) => {
      store.hideElement(id);
      emit('visibility:changed', { id, visible: false });
    },
    isolateElements: (ids: string[]) => {
      store.isolateElements(ids);
      emit('visibility:isolated', ids);
    },
    showAllElements: () => {
      store.showAllElements();
      emit('visibility:all');
    },
    
    // Camera
    fitToView: (elementIds?: string[]) => {
      store.fitToView(elementIds);
      emit('camera:fit', elementIds);
    },
    setView: (view) => {
      store.setView(view);
      emit('camera:view', view);
    },
    getCamera: () => store.camera,
    setCamera: (camera) => {
      store.updateCamera(camera);
      emit('camera:updated', camera);
    },
    
    // Outils
    activateTool: (toolId: string) => {
      setActiveTool(toolId);
      emit('tool:activated', toolId);
    },
    deactivateTool: () => {
      setActiveTool(null);
      emit('tool:deactivated');
    },
    getActiveTool: () => activeTool,
    
    // Mesures
    startMeasurement: (type) => {
      emit('measurement:start', type);
    },
    clearMeasurements: () => {
      setMeasurements([]);
      store.clearMeasurements();
      emit('measurements:cleared');
    },
    
    // Annotations
    addAnnotation: (annotation) => {
      const newAnnotation = { ...annotation, id: annotation.id || Date.now().toString() };
      setAnnotations(prev => [...prev, newAnnotation]);
      store.addAnnotation(newAnnotation);
      emit('annotation:added', newAnnotation);
    },
    removeAnnotation: (id) => {
      setAnnotations(prev => prev.filter(a => a.id !== id));
      store.removeAnnotation(id);
      emit('annotation:removed', id);
    },
    clearAnnotations: () => {
      setAnnotations([]);
      store.clearAnnotations();
      emit('annotations:cleared');
    },
    
    // Export
    exportScene: async (format, options) => {
      emit('export:start', { format, options });
      
      try {
        // Récupérer les éléments à exporter
        const elementsToExport = options?.selectedOnly 
          ? store.elements.filter((el: PivotElement) => el.id === store.selectedElementId)
          : store.elements;
        
        if (!elementsToExport || elementsToExport.length === 0) {
          throw new Error('Aucun élément à exporter');
        }
        
        let blob: Blob;
        
        switch (format) {
          case 'json': {
            const { JSONExporter } = await import('../utils/exporters/JSONExporter');
            const result = await JSONExporter.export(
              elementsToExport,
              'export.json',
              options || {}
            );
            blob = (result as any).blob || new Blob([result.data || ''], { type: 'application/json' });
            break;
          }
          
          case 'dstv': {
            const { DSTVExporter } = await import('../utils/exporters/DSTVExporter');
            const result = await DSTVExporter.export(
              elementsToExport,
              'export.zip',
              options || {}
            );
            blob = (result as any).blob || new Blob([result.data || ''], { type: 'application/json' });
            break;
          }
          
          case 'csv': {
            // Export CSV simple
            const headers = ['ID', 'Name', 'Type', 'Material', 'Length', 'Width', 'Height', 'Weight'];
            const rows = elementsToExport.map((el: PivotElement) => [
              el.id,
              el.name,
              el.materialType,
              (el.material as any)?.designation || '',
              el.dimensions?.length || 0,
              el.dimensions?.width || 0,
              el.dimensions?.height || 0,
              (el.material as any)?.weight || 0
            ]);
            
            const csvContent = [
              headers.join(','),
              ...rows.map((row: (string | number)[]) => row.join(','))
            ].join('\n');
            
            blob = new Blob([csvContent], { type: 'text/csv' });
            break;
          }
          
          default:
            throw new Error(`Format d'export non supporté: ${format}`);
        }
        
        emit('export:complete', { format, options, blob });
        return blob;
        
      } catch (error) {
        emit('export:error', { format, options, error });
        throw error;
      }
    },
    screenshot: async () => {
      emit('screenshot:start');
      
      try {
        // Récupérer le renderer depuis le ViewerEngine ou le document
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          throw new Error('Canvas non disponible');
        }
        
        // Vérifier que le canvas est valide
        if (!(canvas instanceof HTMLCanvasElement)) {
          throw new Error('Canvas invalide');
        }
        
        // Convertir le canvas en blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob: Blob | null) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Impossible de créer le blob'));
              }
            },
            'image/png',
            1.0
          );
        });
        
        emit('screenshot:complete', { blob });
        return blob;
        
      } catch (error) {
        emit('screenshot:error', { error });
        throw error;
      }
    },
    
    // Plugins
    registerPlugin: (plugin: ViewerPlugin) => {
      if (plugins.has(plugin.id)) {
        console.warn(`Plugin ${plugin.id} already registered`);
        return;
      }
      
      setPlugins(prev => new Map(prev).set(plugin.id, plugin));
      
      // Initialiser le plugin
      const cleanups: (() => void)[] = [];
      
      if (plugin.onInit) {
        plugin.onInit(api);
      }
      
      // Enregistrer les outils
      if (plugin.tools) {
        plugin.tools.forEach(_tool => {
          // TODO: Ajouter l'outil à la toolbar
        });
      }
      
      // Enregistrer les raccourcis
      if (plugin.shortcuts) {
        plugin.shortcuts.forEach(_shortcut => {
          // TODO: Enregistrer le raccourci
        });
      }
      
      pluginCleanups.current.set(plugin.id, cleanups);
      emit('plugin:registered', plugin);
    },
    
    unregisterPlugin: (pluginId: string) => {
      const plugin = plugins.get(pluginId);
      if (!plugin) return;
      
      // Nettoyer le plugin
      const cleanups = pluginCleanups.current.get(pluginId);
      if (cleanups) {
        cleanups.forEach(cleanup => cleanup());
        pluginCleanups.current.delete(pluginId);
      }
      
      if (plugin.onUnmount) {
        plugin.onUnmount(api);
      }
      
      if (plugin.onDestroy) {
        plugin.onDestroy();
      }
      
      setPlugins(prev => {
        const next = new Map(prev);
        next.delete(pluginId);
        return next;
      });
      
      emit('plugin:unregistered', pluginId);
    },
    
    // Events
    on,
    off,
    emit,
    
    // Mode et thème
    setMode: (newMode: ViewerModeConfig) => {
      setMode(newMode);
      emit('mode:changed', newMode);
    },
    getMode: () => mode,
    setTheme: (theme: ThemeConfig | 'light' | 'dark') => {
      setGlobalTheme(theme);
      emit('theme:changed', theme);
    },
    getTheme: () => currentTheme,
  }), [
    store, 
    mode, 
    currentTheme, 
    setGlobalTheme, 
    plugins, 
    activeTool, 
    measurements, 
    annotations,
    on, 
    off, 
    emit
  ]);
  
  // Initialiser les plugins au montage
  useEffect(() => {
    if (config?.plugins) {
      config.plugins.forEach(plugin => {
        api.registerPlugin(plugin);
      });
    }
    
    // Cleanup au démontage
    return () => {
      plugins.forEach(plugin => {
        if (plugin.onUnmount) {
          plugin.onUnmount(api);
        }
        if (plugin.onDestroy) {
          plugin.onDestroy();
        }
      });
      pluginCleanups.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Charger les éléments initiaux
  useEffect(() => {
    if (config?.initialElements) {
      store.loadElements(config.initialElements);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fonctions utilitaires
  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme.isDark ? 'light' : 'dark';
    setGlobalTheme(newTheme);
    emit('theme:toggled', newTheme);
  }, [currentTheme, setGlobalTheme, emit]);
  
  const toggleFeature = useCallback((featureId: string) => {
    setMode(current => ({
      ...current,
      features: current.features.map(f =>
        f.id === featureId 
          ? { ...f, enabled: !f.enabled }
          : f
      )
    }));
    emit('feature:toggled', featureId);
  }, [emit]);
  
  const setModePreset = useCallback((preset: 'minimal' | 'standard' | 'professional') => {
    let newMode: ViewerModeConfig;
    switch (preset) {
      case 'minimal':
        newMode = defaultMinimalMode;
        break;
      case 'standard':
        newMode = defaultStandardMode;
        break;
      default:
        newMode = defaultStandardMode;
    }
    setMode(newMode);
    emit('mode:preset', preset);
  }, [emit]);
  
  // Obtenir les outils actifs selon le mode
  const activeTools = useMemo(() => {
    const tools = [...mode.tools];
    
    // Ajouter les outils des plugins
    plugins.forEach(plugin => {
      if (plugin.tools) {
        plugin.tools.forEach(tool => {
          tools.push({
            id: tool.id,
            name: tool.name,
            tooltip: tool.tooltip,
            group: tool.group,
            action: () => tool.handler(api)
          });
        });
      }
    });
    
    return tools;
  }, [mode.tools, plugins, api]);
  
  // Obtenir les panneaux actifs selon le mode
  const activePanels = useMemo(() => {
    const panels = [...mode.panels];
    
    // Ajouter les panneaux des plugins
    plugins.forEach(plugin => {
      if (plugin.panels) {
        plugin.panels.forEach(panel => {
          panels.push({
            id: panel.id,
            title: panel.title,
            icon: panel.icon,
            position: panel.position,
            component: panel.component
          });
        });
      }
    });
    
    return panels;
  }, [mode.panels, plugins]);
  
  return {
    // État
    mode,
    theme: currentTheme,
    store,
    plugins: Array.from(plugins.values()),
    activeTool,
    measurements,
    annotations,
    
    // Outils et panneaux
    tools: activeTools,
    panels: activePanels,
    
    // API
    api,
    
    // Actions utilitaires
    toggleTheme,
    toggleFeature,
    setModePreset,
    
    // État du viewer
    isLoading: store.isLoading,
    error: store.error,
    elementsModified: store.elementsModified,
  };
}

// Export du type pour utilisation externe
export type UseViewerReturn = ReturnType<typeof useViewer>;