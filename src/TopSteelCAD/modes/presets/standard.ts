/**
 * Mode standard - Configuration équilibrée avec navigation, sélection et outils de base
 */

import { ViewerModeConfig } from '../types';
import { 
  Home,
  MousePointer,
  Move3D,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Search,
  Layers,
  Info,
  Settings,
  Grid3X3,
  Ruler,
  Camera,
  MoreVertical
} from 'lucide-react';

export const standardMode: ViewerModeConfig = {
  id: 'standard',
  name: 'Mode Standard',
  description: 'Interface complète avec outils de navigation, sélection et informations de base',
  
  features: [
    { id: 'viewer3d', enabled: true },
    { id: 'camera-controls', enabled: true },
    { id: 'selection', enabled: true },
    { id: 'measurements', enabled: true, config: { basicOnly: true } },
    { id: 'annotations', enabled: false },
    { id: 'materials', enabled: true, config: { readOnly: true } },
    { id: 'export', enabled: true, config: { formats: ['png', 'pdf'] } },
    { id: 'import', enabled: false },
    { id: 'shortcuts', enabled: true },
    { id: 'grid', enabled: true },
    { id: 'properties-panel', enabled: true }
  ],
  
  layout: {
    header: true,
    sidebar: 'right',
    statusBar: true,
    toolbar: 'top',
    responsive: true
  },
  
  tools: [
    // Navigation
    {
      id: 'select',
      name: 'Sélection',
      icon: MousePointer,
      tooltip: 'Sélectionner des éléments (Espace)',
      group: 'navigation',
      shortcut: ' ',
      action: (api) => api.activateTool('select')
    },
    {
      id: 'fit-to-view',
      name: 'Vue d\'ensemble',
      icon: Home,
      tooltip: 'Ajuster la vue (F)',
      group: 'navigation',
      shortcut: 'f',
      action: (api) => api.fitToView()
    },
    {
      id: 'zoom-in',
      name: 'Zoom +',
      icon: ZoomIn,
      tooltip: 'Zoomer (+)',
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
      tooltip: 'Dézoomer (-)',
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
      tooltip: 'Mode rotation (R)',
      group: 'navigation',
      shortcut: 'r'
    },
    {
      id: 'pan-view',
      name: 'Déplacement',
      icon: Move3D,
      tooltip: 'Mode déplacement (P)',
      group: 'navigation',
      shortcut: 'p'
    },
    
    // Visibilité
    {
      id: 'show-all',
      name: 'Tout afficher',
      icon: Eye,
      tooltip: 'Afficher tous les éléments (H)',
      group: 'visibility',
      shortcut: 'h',
      action: (api) => api.showAllElements()
    },
    {
      id: 'hide-selected',
      name: 'Masquer sélection',
      icon: EyeOff,
      tooltip: 'Masquer les éléments sélectionnés',
      group: 'visibility',
      action: (api) => {
        const selected = api.getSelectedElement();
        if (selected) {
          api.hideElement(selected.id);
        }
      }
    },
    {
      id: 'isolate-selection',
      name: 'Isoler',
      icon: Search,
      tooltip: 'Isoler la sélection (I)',
      group: 'visibility',
      shortcut: 'i',
      action: (api) => {
        const selected = api.getSelectedElement();
        if (selected) {
          api.isolateElements([selected.id]);
        }
      }
    },
    
    // Outils
    {
      id: 'measure-distance',
      name: 'Mesure distance',
      icon: Ruler,
      tooltip: 'Mesurer une distance (M)',
      group: 'tools',
      shortcut: 'm',
      action: (api) => api.startMeasurement('distance')
    },
    {
      id: 'toggle-grid',
      name: 'Grille',
      icon: Grid3X3,
      tooltip: 'Afficher/masquer la grille (G)',
      group: 'tools',
      shortcut: 'g'
    },
    {
      id: 'screenshot',
      name: 'Capture',
      icon: Camera,
      tooltip: 'Prendre une capture d\'écran',
      group: 'tools',
      action: (api) => api.screenshot()
    },
    
    // Vue
    {
      id: 'view-menu',
      name: 'Vues',
      icon: MoreVertical,
      tooltip: 'Menu des vues prédéfinies',
      group: 'view'
    }
  ],
  
  panels: [
    {
      id: 'scene-hierarchy',
      title: 'Hiérarchie',
      icon: Layers,
      position: 'right',
      defaultOpen: true,
      resizable: true,
      collapsible: true,
      minWidth: 250
    },
    {
      id: 'properties',
      title: 'Propriétés',
      icon: Info,
      position: 'right',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 250
    }
  ],
  
  shortcuts: [
    // Navigation
    { key: ' ', action: 'select', description: 'Mode sélection' },
    { key: 'f', action: 'fit-to-view', description: 'Vue d\'ensemble' },
    { key: '=', action: 'zoom-in', description: 'Zoomer' },
    { key: '-', action: 'zoom-out', description: 'Dézoomer' },
    { key: 'r', action: 'rotate-view', description: 'Mode rotation' },
    { key: 'p', action: 'pan-view', description: 'Mode déplacement' },
    
    // Visibilité
    { key: 'h', action: 'show-all', description: 'Afficher tout' },
    { key: 'i', action: 'isolate-selection', description: 'Isoler sélection' },
    
    // Outils
    { key: 'm', action: 'measure-distance', description: 'Mesurer distance' },
    { key: 'g', action: 'toggle-grid', description: 'Basculer grille' },
    
    // Sélection
    { key: 'Escape', action: 'clear-selection', description: 'Désélectionner' },
    { key: 'a', ctrl: true, action: 'select-all', description: 'Tout sélectionner' },
    
    // Vues prédéfinies
    { key: '1', action: 'view-front', description: 'Vue de face' },
    { key: '2', action: 'view-back', description: 'Vue arrière' },
    { key: '3', action: 'view-right', description: 'Vue droite' },
    { key: '4', action: 'view-left', description: 'Vue gauche' },
    { key: '5', action: 'view-top', description: 'Vue du dessus' },
    { key: '6', action: 'view-bottom', description: 'Vue du dessous' },
    { key: '7', action: 'view-iso', description: 'Vue isométrique' }
  ]
};

export default standardMode;