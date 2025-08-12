/**
 * Mode minimal - Configuration basique avec seulement la 3D et les contrôles essentiels
 */

import { ViewerModeConfig } from '../types';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Home,
  Move3D,
  Eye,
  EyeOff
} from 'lucide-react';

export const minimalMode: ViewerModeConfig = {
  id: 'minimal',
  name: 'Mode Minimal',
  description: 'Interface épurée avec seulement les outils de navigation 3D essentiels',
  
  features: [
    { id: 'viewer3d', enabled: true },
    { id: 'camera-controls', enabled: true },
    { id: 'selection', enabled: false },
    { id: 'measurements', enabled: false },
    { id: 'annotations', enabled: false },
    { id: 'materials', enabled: false },
    { id: 'export', enabled: false },
    { id: 'import', enabled: false },
    { id: 'shortcuts', enabled: true, config: { minimal: true } }
  ],
  
  layout: {
    header: false,
    sidebar: 'none',
    statusBar: false,
    toolbar: 'top',
    responsive: true,
    compact: true
  },
  
  tools: [
    {
      id: 'fit-to-view',
      name: 'Vue d\'ensemble',
      icon: Home,
      tooltip: 'Ajuster la vue pour voir tous les éléments',
      group: 'navigation',
      shortcut: 'f',
      action: (api) => api.fitToView()
    },
    {
      id: 'zoom-in',
      name: 'Zoom +',
      icon: ZoomIn,
      tooltip: 'Zoomer',
      group: 'navigation',
      shortcut: '+',
      action: (api) => {
        const camera = api.getCamera();
        if (camera?.zoom) {
          camera.zoom *= 1.2;
          camera.updateProjectionMatrix();
        }
      }
    },
    {
      id: 'zoom-out',
      name: 'Zoom -',
      icon: ZoomOut,
      tooltip: 'Dézoomer',
      group: 'navigation',
      shortcut: '-',
      action: (api) => {
        const camera = api.getCamera();
        if (camera?.zoom) {
          camera.zoom /= 1.2;
          camera.updateProjectionMatrix();
        }
      }
    },
    {
      id: 'rotate-view',
      name: 'Rotation',
      icon: RotateCcw,
      tooltip: 'Mode rotation (clic droit + glisser)',
      group: 'navigation'
    },
    {
      id: 'pan-view',
      name: 'Déplacement',
      icon: Move3D,
      tooltip: 'Mode déplacement (molette + glisser)',
      group: 'navigation'
    },
    {
      id: 'show-all',
      name: 'Tout afficher',
      icon: Eye,
      tooltip: 'Afficher tous les éléments',
      group: 'visibility',
      action: (api) => api.showAllElements()
    },
    {
      id: 'hide-selected',
      name: 'Masquer',
      icon: EyeOff,
      tooltip: 'Masquer l\'élément sélectionné',
      group: 'visibility',
      disabled: true // Sera activé quand un élément est sélectionné
    }
  ],
  
  panels: [],
  
  shortcuts: [
    {
      key: 'f',
      action: 'fit-to-view',
      description: 'Vue d\'ensemble'
    },
    {
      key: '=',
      action: 'zoom-in',
      description: 'Zoomer'
    },
    {
      key: '-',
      action: 'zoom-out',
      description: 'Dézoomer'
    },
    {
      key: 'h',
      action: 'show-all',
      description: 'Afficher tout'
    },
    {
      key: 'Escape',
      action: 'clear-selection',
      description: 'Désélectionner'
    }
  ]
};

export default minimalMode;