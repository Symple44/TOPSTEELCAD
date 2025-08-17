/**
 * Mode Minimal - Interface épurée pour une visualisation simple
 */

import { ViewerModeConfig } from '../types';

export const minimalModeConfig: ViewerModeConfig = {
  id: 'minimal',
  name: 'Mode Minimal',
  description: 'Interface épurée pour une visualisation simple et rapide',
  
  features: [
    { id: 'rotation', enabled: true },
    { id: 'zoom', enabled: true },
    { id: 'pan', enabled: true },
    { id: 'selection', enabled: true },
    { id: 'viewcube', enabled: false },
    { id: 'axes', enabled: false },
    { id: 'grid', enabled: false },
    { id: 'shadows', enabled: false },
    { id: 'antialiasing', enabled: false },
    { id: 'stats', enabled: false }
  ],
  
  layout: {
    header: false,
    sidebar: 'none',
    statusBar: false,
    toolbar: 'none',
    responsive: true,
    compact: true
  },
  
  tools: [
    {
      id: 'fit-view',
      name: 'Ajuster la vue',
      tooltip: 'Centrer sur tous les éléments',
      shortcut: 'f'
    },
    {
      id: 'reset-view',
      name: 'Réinitialiser',
      tooltip: 'Revenir à la vue par défaut',
      shortcut: 'r'
    }
  ],
  
  panels: [],
  
  shortcuts: [
    {
      key: 'f',
      action: 'fit-view',
      description: 'Ajuster la vue'
    },
    {
      key: 'r',
      action: 'reset-view',
      description: 'Réinitialiser la vue'
    },
    {
      key: 'Escape',
      action: 'clear-selection',
      description: 'Annuler la sélection'
    }
  ],
  
  plugins: []
};

export default minimalModeConfig;