/**
 * SimplifiedViewer - Vue standard simplifiée de TopSteelCAD
 * 
 * Cette version représente la configuration par défaut optimisée pour:
 * - Interface épurée et moderne
 * - Système de mesure avec snap intelligent
 * - Sélection avancée avec informations détaillées
 * - Thème contrôlé par le parent
 * - Grille positionnée sous le modèle
 */

import React from 'react';
import TopSteelCAD from './TopSteelCAD';
import type { PivotElement } from './types/viewer';

export interface SimplifiedViewerProps {
  elements: PivotElement[];
  theme?: 'light' | 'dark';
  onElementSelect?: (ids: string[]) => void;
  onElementChange?: (element: PivotElement) => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  className?: string;
}

/**
 * SimplifiedViewer - Composant de visualisation 3D standard
 * 
 * Utilise TopSteelCAD avec la configuration optimale par défaut:
 * - Outils de mesure activés (touche M)
 * - Sélection multiple (Ctrl+clic, Ctrl+A)
 * - Informations détaillées sur les éléments
 * - Interface minimale et élégante
 * - Grille adaptative sous le modèle
 */
const SimplifiedViewer: React.FC<SimplifiedViewerProps> = ({
  elements,
  theme = 'light',
  onElementSelect,
  onElementChange,
  onThemeChange,
  className
}) => {
  return (
    <TopSteelCAD
      elements={elements}
      theme={theme}
      onElementSelect={onElementSelect}
      onElementChange={onElementChange}
      onThemeChange={onThemeChange}
      className={className}
    />
  );
};

export default SimplifiedViewer;

// Export également comme composant nommé
export { SimplifiedViewer };