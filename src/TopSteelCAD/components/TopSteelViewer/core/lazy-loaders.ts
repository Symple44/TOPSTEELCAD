/**
 * Lazy loading et code splitting pour les renderers
 * Charge les composants à la demande pour optimiser le bundle
 */

import { lazy } from 'react';
// import type { ComponentType } from 'react';
import type { PivotElement } from '@/types/viewer';

// Les types sont définis localement pour éviter les erreurs de dépendances circulaires

// Types pour les props des renderers
export interface RendererProps {
  element: PivotElement;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export interface SceneProps {
  elements: PivotElement[];
  selectedElementId?: string | null;
  highlightedElementId?: string | null;
  enableAnimations?: boolean;
  onElementSelect?: (id: string | null) => void;
  onElementHover?: (id: string | null) => void;
}

/**
 * Renderer simple - Chargé par défaut car léger
 */
export const SimpleMachinedElement = lazy(() =>
  import('./SimpleMachinedRenderer').then(module => ({
    default: module.SimpleMachinedElement
  }))
);

/**
 * Renderer avec CSG - Chargé à la demande
 */
export const MachinedElementRenderer = lazy(() =>
  import('./MachinedElementRenderer').then(module => ({
    default: module.MachinedElementRenderer
  }))
);

/**
 * Scene avec CSG - Utilise MachinedElementRenderer directement
 */
export const MachinedScene = lazy(() =>
  import('./MachinedElementRenderer').then(module => ({
    default: module.MachinedElementRenderer // Utiliser le renderer comme composant de scène
  }))
);

/**
 * Renderer avancé avec LOD, cache et animations - Chargé à la demande
 */
export const AdvancedFeatureRenderer = lazy(() =>
  import('./AdvancedFeatureRenderer').then(module => ({
    default: module.AdvancedFeatureRenderer
  }))
);

/**
 * Scene avancée
 */
export const AdvancedFeatureScene = lazy(() =>
  import('./AdvancedFeatureRenderer').then(module => ({
    default: module.AdvancedFeatureScene
  }))
);

/**
 * Composants d'assemblage - Chargés à la demande
 */
export const BoltAssembly = lazy(() =>
  import('./AssemblyRenderer').then(module => ({
    default: module.BoltAssembly
  }))
);

export const FilletWeld = lazy(() =>
  import('./AssemblyRenderer').then(module => ({
    default: module.FilletWeld
  }))
);

export const ButtWeld = lazy(() =>
  import('./AssemblyRenderer').then(module => ({
    default: module.ButtWeld
  }))
);

/**
 * Hook pour précharger un renderer
 */
export const preloadRenderer = (type: 'simple' | 'machined' | 'advanced') => {
  switch (type) {
    case 'simple':
      return import('./SimpleMachinedRenderer');
    case 'machined':
      return import('./MachinedElementRenderer');
    case 'advanced':
      return import('./AdvancedFeatureRenderer');
    default:
      return Promise.resolve();
  }
};

/**
 * Hook pour précharger tous les renderers (en arrière-plan)
 */
export const preloadAllRenderers = () => {
  // Précharge en parallèle mais sans bloquer
  Promise.all([
    import('./SimpleMachinedRenderer'),
    import('./MachinedElementRenderer'),
    import('./AdvancedFeatureRenderer'),
    import('./AssemblyRenderer')
  ]).catch(err => {
    console.warn('Preload renderers warning:', err);
  });
};