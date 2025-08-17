/**
 * Mode Standard - Interface équilibrée avec les outils essentiels
 */

import { ViewerModeConfig } from '../types';

export const standardModeConfig: ViewerModeConfig = {
  id: 'standard',
  name: 'Mode Standard',
  description: 'Interface équilibrée avec les fonctionnalités essentielles',
  
  features: [
    { id: 'rotation', enabled: true },
    { id: 'zoom', enabled: true },
    { id: 'pan', enabled: true },
    { id: 'selection', enabled: true },
    { id: 'multiselection', enabled: true },
    { id: 'viewcube', enabled: true },
    { id: 'axes', enabled: true },
    { id: 'grid', enabled: true },
    { id: 'shadows', enabled: true },
    { id: 'antialiasing', enabled: true },
    { id: 'stats', enabled: false },
    { id: 'measurements', enabled: true },
    { id: 'annotations', enabled: false }
  ],
  
  layout: {
    header: true,
    sidebar: 'left',
    statusBar: true,
    toolbar: 'top',
    responsive: true,
    compact: false
  },
  
  tools: [
    // Navigation
    {
      id: 'fit-view',
      name: 'Ajuster',
      tooltip: 'Ajuster la vue aux éléments',
      group: 'navigation',
      shortcut: 'f'
    },
    {
      id: 'reset-view',
      name: 'Réinitialiser',
      tooltip: 'Vue par défaut',
      group: 'navigation',
      shortcut: 'r'
    },
    {
      id: 'orthographic',
      name: 'Orthographique',
      tooltip: 'Basculer vue orthographique',
      group: 'navigation',
      shortcut: 'o'
    },
    
    // Sélection
    {
      id: 'select',
      name: 'Sélectionner',
      tooltip: 'Mode sélection',
      group: 'selection',
      shortcut: 's'
    },
    {
      id: 'isolate',
      name: 'Isoler',
      tooltip: 'Isoler les éléments sélectionnés',
      group: 'selection',
      shortcut: 'i'
    },
    {
      id: 'hide',
      name: 'Masquer',
      tooltip: 'Masquer les éléments sélectionnés',
      group: 'selection',
      shortcut: 'h'
    },
    {
      id: 'show-all',
      name: 'Tout afficher',
      tooltip: 'Afficher tous les éléments',
      group: 'selection',
      shortcut: 'a'
    },
    
    // Mesures
    {
      id: 'measure-distance',
      name: 'Distance',
      tooltip: 'Mesurer la distance',
      group: 'measure',
      shortcut: 'd'
    },
    {
      id: 'measure-angle',
      name: 'Angle',
      tooltip: 'Mesurer un angle',
      group: 'measure'
    },
    {
      id: 'clear-measurements',
      name: 'Effacer mesures',
      tooltip: 'Effacer toutes les mesures',
      group: 'measure'
    }
  ],
  
  panels: [
    {
      id: 'hierarchy',
      title: 'Hiérarchie',
      position: 'left',
      defaultOpen: true,
      resizable: true,
      collapsible: true,
      minWidth: 200
    },
    {
      id: 'properties',
      title: 'Propriétés',
      position: 'left',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 200
    }
  ],
  
  shortcuts: [
    // Navigation
    { key: 'f', action: 'fit-view', description: 'Ajuster la vue' },
    { key: 'r', action: 'reset-view', description: 'Réinitialiser' },
    { key: 'o', action: 'orthographic', description: 'Vue orthographique' },
    
    // Vues prédéfinies
    { key: '1', action: 'view-front', description: 'Vue de face' },
    { key: '2', action: 'view-back', description: 'Vue arrière' },
    { key: '3', action: 'view-left', description: 'Vue gauche' },
    { key: '4', action: 'view-right', description: 'Vue droite' },
    { key: '5', action: 'view-top', description: 'Vue dessus' },
    { key: '6', action: 'view-bottom', description: 'Vue dessous' },
    { key: '7', action: 'view-iso', description: 'Vue isométrique' },
    
    // Sélection
    { key: 's', action: 'select-mode', description: 'Mode sélection' },
    { key: 'i', action: 'isolate', description: 'Isoler' },
    { key: 'h', action: 'hide', description: 'Masquer' },
    { key: 'a', ctrl: true, action: 'select-all', description: 'Tout sélectionner' },
    { key: 'Escape', action: 'clear-selection', description: 'Annuler sélection' },
    
    // Mesures
    { key: 'd', action: 'measure-distance', description: 'Mesurer distance' },
    { key: 'Delete', action: 'clear-measurements', description: 'Effacer mesures' }
  ],
  
  plugins: []
};

export default standardModeConfig;