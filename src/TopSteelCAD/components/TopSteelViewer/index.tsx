'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ViewerMode, TopSteelViewerProps } from './types';
import { ViewerProvider } from './context/ViewerContext';
import { ViewerCore } from '../ViewerCore';
import { useViewerStore } from './store/useViewerStore';
import { getModeById } from '../../modes/presets';

/**
 * TopSteelViewer - Composant viewer 3D modulaire pour structures métalliques
 * 
 * @component
 * @description
 * Viewer 3D professionnel pour visualiser et éditer des structures métalliques
 * avec support des formats DSTV, IFC, DWG et autres formats CAO.
 * 
 * @param {TopSteelViewerProps} props - Props du composant
 * @param {'simple' | 'complete' | 'editor'} props.mode - Mode de visualisation
 * @param {PivotElement[]} props.elements - Éléments 3D à afficher
 * @param {string} [props.selectedElementId] - ID de l'élément sélectionné
 * @param {Function} [props.onElementSelect] - Callback de sélection
 * @param {Function} [props.onElementsChange] - Callback de modification (mode editor)
 * @param {Object} [props.config] - Configuration du viewer
 * @param {string} [props.className] - Classes CSS additionnelles
 * @param {boolean} [props.showElementList=true] - Afficher la liste des éléments
 * @param {string[]} [props.tools] - Outils à activer
 * @param {'light' | 'dark'} [props.theme='dark'] - Thème de l'interface
 * 
 * @example
 * // Mode simple - Visualisation basique
 * <TopSteelViewer 
 *   mode="simple"
 *   elements={elements}
 *   onElementSelect={handleSelect}
 * />
 * 
 * @example
 * // Mode complet - Outils CAO
 * <TopSteelViewer 
 *   mode="complete"
 *   elements={elements}
 *   tools={['measure', 'export', 'screenshot']}
 *   config={{ showGrid: true, showAxes: true }}
 * />
 * 
 * @example
 * // Mode éditeur - Modification de géométrie
 * <TopSteelViewer 
 *   mode="editor"
 *   elements={elements}
 *   onElementsChange={handleChange}
 *   config={{ enableSnapping: true, enableGizmos: true }}
 * />
 * 
 * @returns {JSX.Element} Composant viewer 3D
 */
export const TopSteelViewer: React.FC<TopSteelViewerProps> = ({
  mode = 'simple',
  elements = [],
  selectedElementId,
  onElementSelect,
  onElementsChange,
  config = {},
  className = '',
  showElementList: _showElementList = true,
  tools: _tools = [],
  theme = 'dark'
}) => {
  const store = useViewerStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Configuration par défaut selon le mode
  const defaultConfig = useMemo(() => {
    const baseConfig = {
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
      gridColor: theme === 'dark' ? '#333333' : '#cccccc',
      ambientLight: 0.6,
      directionalLight: 1.0,
      enableShadows: true,
      antialiasing: true
    };

    switch (mode) {
      case 'simple':
        return {
          ...baseConfig,
          showGrid: true,
          showAxes: false,
          showViewCube: false,
          enableSelection: true,
          enableRotation: true,
          enableZoom: true,
          enablePan: false,
          enableMeasurement: false,
          enableAnnotations: false
        };

      case 'complete':
        return {
          ...baseConfig,
          showGrid: true,
          showAxes: true,
          showViewCube: true,
          enableSelection: true,
          enableRotation: true,
          enableZoom: true,
          enablePan: true,
          enableMeasurement: true,
          enableAnnotations: true,
          enableExport: true,
          enableScreenshot: true,
          showProperties: true,
          showLayers: true,
          showMinimap: false
        };

      case 'editor':
        return {
          ...baseConfig,
          showGrid: true,
          showAxes: true,
          showViewCube: true,
          enableSelection: true,
          enableRotation: true,
          enableZoom: true,
          enablePan: true,
          enableMeasurement: true,
          enableAnnotations: true,
          enableExport: true,
          enableScreenshot: true,
          showProperties: true,
          showLayers: true,
          showMinimap: true,
          enableSnapping: true,
          enableGizmos: true,
          enableUndo: true,
          enableRedo: true,
          enableCopy: true,
          enablePaste: true,
          enableDelete: true,
          enableTransform: true,
          enableWeldPoints: true,
          enableAssemblyPoints: true
        };

      default:
        return baseConfig;
    }
  }, [mode, theme]);

  // Fusion de la config utilisateur avec les défauts
  const mergedConfig = useMemo(() => ({
    ...defaultConfig,
    ...config
  }), [defaultConfig, config]);

  // Initialisation du store
  useEffect(() => {
    store.initialize({
      mode,
      config: mergedConfig,
      elements
    });
    setIsInitialized(true);
  }, []);

  // Mise à jour des éléments
  useEffect(() => {
    if (isInitialized && elements) {
      store.loadElements(elements);
    }
  }, [elements, isInitialized]);

  // Gestion de la sélection externe
  useEffect(() => {
    if (selectedElementId !== undefined) {
      store.selectElement(selectedElementId);
    }
  }, [selectedElementId]);

  // Propagation des changements
  useEffect(() => {
    const unsubscribe = useViewerStore.subscribe((state) => {
      if (state.selectedElementId !== selectedElementId) {
        onElementSelect?.(state.selectedElementId);
      }

      if (state.elementsModified && onElementsChange) {
        onElementsChange(state.elements);
        store.clearModifiedFlag();
      }
    });

    return unsubscribe;
  }, [onElementSelect, onElementsChange, selectedElementId]);

  // Rendu du mode approprié avec ViewerCore unifié
  const renderViewer = () => {
    // Mapper les anciens modes vers les nouveaux
    const modeMapping: Record<ViewerMode, 'minimal' | 'standard' | 'professional'> = {
      'simple': 'minimal',
      'complete': 'professional', 
      'editor': 'professional'
    };
    
    const newModeId = modeMapping[mode] || 'minimal';
    const modeConfig = getModeById(newModeId);
    
    // Si le mode n'est pas trouvé, on utilise minimal par défaut
    if (!modeConfig) {
      console.warn(`Mode ${newModeId} not found, falling back to minimal`);
      const fallbackMode = getModeById('minimal');
      if (!fallbackMode) {
        console.error('Minimal mode not found - this should not happen');
        return <div>Error: No viewer modes available</div>;
      }
    }
    
    return (
      <ViewerCore 
        elements={elements}
        selectedElementId={selectedElementId}
        onElementSelect={onElementSelect}
        config={mergedConfig}
        className={className}
      />
    );
  };

  if (!isInitialized) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initialisation du viewer...</p>
        </div>
      </div>
    );
  }

  return (
    <ViewerProvider store={store}>
      <div className={`topsteel-viewer topsteel-viewer--${mode} ${className}`} style={{ width: '100%', height: '100%' }}>
        {renderViewer()}
      </div>
    </ViewerProvider>
  );
};

// Export des types pour utilisation externe
export type { ViewerMode, TopSteelViewerProps } from './types';
export { useViewerContext } from './context/ViewerContext';
export { ViewerCore } from './core/ViewerCore';

// Export par défaut
export default TopSteelViewer;