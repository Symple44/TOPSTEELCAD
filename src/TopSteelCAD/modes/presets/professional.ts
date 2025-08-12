/**
 * Mode professionnel - Configuration complète avec tous les outils CAO avancés
 */

import { ViewerModeConfig } from '../types';
import { 
  // Navigation
  Home,
  MousePointer,
  Move3D,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  
  // Visibilité
  Eye,
  EyeOff,
  Search,
  Filter,
  
  // Outils CAO
  Ruler,
  Compass,
  Square,
  Triangle,
  Circle,
  PenTool,
  Type,
  
  // Interface
  Layers,
  Info,
  Settings,
  Grid3X3,
  Camera,
  Download,
  Upload,
  Save,
  FolderOpen,
  
  // Avancé
  Scissors,
  Copy,
  RotateCw,
  Scale,
  Move,
  Trash2,
  Undo,
  Redo,
  
  // Analyse
  BarChart3,
  Calculator,
  FlaskConical,
  
  // Vue
  MoreVertical,
  ScanLine,
  Box
} from 'lucide-react';

export const professionalMode: ViewerModeConfig = {
  id: 'professional',
  name: 'Mode Professionnel',
  description: 'Interface complète avec tous les outils CAO, mesures avancées, annotations et export',
  
  features: [
    { id: 'viewer3d', enabled: true },
    { id: 'camera-controls', enabled: true },
    { id: 'selection', enabled: true, config: { multiSelect: true, boxSelect: true } },
    { id: 'measurements', enabled: true, config: { advanced: true } },
    { id: 'annotations', enabled: true },
    { id: 'materials', enabled: true, config: { fullAccess: true } },
    { id: 'export', enabled: true, config: { formats: ['dwg', 'dxf', 'step', 'iges', 'pdf', 'png'] } },
    { id: 'import', enabled: true, config: { formats: ['dwg', 'dxf', 'step', 'iges', 'ifc'] } },
    { id: 'shortcuts', enabled: true, config: { advanced: true } },
    { id: 'grid', enabled: true, config: { customizable: true } },
    { id: 'properties-panel', enabled: true },
    { id: 'scene-hierarchy', enabled: true },
    { id: 'tools-panel', enabled: true },
    { id: 'layer-management', enabled: true },
    { id: 'analysis-tools', enabled: true },
    { id: 'section-views', enabled: true },
    { id: 'animations', enabled: true },
    { id: 'collaboration', enabled: true }
  ],
  
  layout: {
    header: true,
    sidebar: 'both',
    statusBar: true,
    toolbar: 'top',
    responsive: true
  },
  
  tools: [
    // Navigation et sélection
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
      id: 'box-select',
      name: 'Sélection rectangle',
      icon: Square,
      tooltip: 'Sélection par rectangle (B)',
      group: 'navigation',
      shortcut: 'b',
      action: (api) => api.activateTool('box-select')
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
      id: 'fit-selection',
      name: 'Vue sur sélection',
      icon: Search,
      tooltip: 'Ajuster la vue sur la sélection (Shift+F)',
      group: 'navigation',
      shortcut: 'f',
      action: (api) => {
        const selected = api.getSelectedElement();
        if (selected) {
          api.fitToView([selected.id]);
        }
      }
    },
    
    // Outils de mesure avancés
    {
      id: 'measure-distance',
      name: 'Distance',
      icon: Ruler,
      tooltip: 'Mesurer une distance (M)',
      group: 'measurement',
      shortcut: 'm',
      action: (api) => api.startMeasurement('distance')
    },
    {
      id: 'measure-angle',
      name: 'Angle',
      icon: Compass,
      tooltip: 'Mesurer un angle (A)',
      group: 'measurement',
      shortcut: 'a',
      action: (api) => api.startMeasurement('angle')
    },
    {
      id: 'measure-area',
      name: 'Surface',
      icon: Triangle,
      tooltip: 'Mesurer une surface',
      group: 'measurement',
      action: (api) => api.startMeasurement('area')
    },
    {
      id: 'measure-volume',
      name: 'Volume',
      icon: Box,
      tooltip: 'Calculer le volume',
      group: 'measurement'
    },
    
    // Annotations
    {
      id: 'add-text',
      name: 'Texte',
      icon: Type,
      tooltip: 'Ajouter une annotation texte (T)',
      group: 'annotation',
      shortcut: 't',
      action: (api) => api.activateTool('text-annotation')
    },
    {
      id: 'add-arrow',
      name: 'Flèche',
      icon: PenTool,
      tooltip: 'Ajouter une flèche d\'annotation',
      group: 'annotation',
      action: (api) => api.activateTool('arrow-annotation')
    },
    {
      id: 'add-dimension',
      name: 'Cote',
      icon: Ruler,
      tooltip: 'Ajouter une cote',
      group: 'annotation',
      action: (api) => api.activateTool('dimension')
    },
    
    // Outils d'édition
    {
      id: 'move',
      name: 'Déplacer',
      icon: Move,
      tooltip: 'Déplacer les éléments sélectionnés',
      group: 'edit',
      action: (api) => api.activateTool('move')
    },
    {
      id: 'rotate',
      name: 'Rotation',
      icon: RotateCw,
      tooltip: 'Faire tourner les éléments sélectionnés',
      group: 'edit',
      action: (api) => api.activateTool('rotate')
    },
    {
      id: 'scale',
      name: 'Échelle',
      icon: Scale,
      tooltip: 'Redimensionner les éléments sélectionnés',
      group: 'edit',
      action: (api) => api.activateTool('scale')
    },
    {
      id: 'copy',
      name: 'Copier',
      icon: Copy,
      tooltip: 'Copier la sélection (Ctrl+C)',
      group: 'edit',
      shortcut: 'c',
      action: (api) => api.activateTool('copy')
    },
    {
      id: 'delete',
      name: 'Supprimer',
      icon: Trash2,
      tooltip: 'Supprimer la sélection (Suppr)',
      group: 'edit',
      shortcut: 'Delete',
      action: (api) => {
        const selected = api.getSelectedElement();
        if (selected) {
          api.deleteElement(selected.id);
        }
      }
    },
    
    // Historique
    {
      id: 'undo',
      name: 'Annuler',
      icon: Undo,
      tooltip: 'Annuler la dernière action (Ctrl+Z)',
      group: 'history',
      shortcut: 'z',
      action: (api) => api.emit('undo')
    },
    {
      id: 'redo',
      name: 'Refaire',
      icon: Redo,
      tooltip: 'Refaire l\'action annulée (Ctrl+Y)',
      group: 'history',
      shortcut: 'y',
      action: (api) => api.emit('redo')
    },
    
    // Visibilité avancée
    {
      id: 'layer-visibility',
      name: 'Couches',
      icon: Layers,
      tooltip: 'Gérer la visibilité des couches (L)',
      group: 'visibility',
      shortcut: 'l'
    },
    {
      id: 'filter-elements',
      name: 'Filtrer',
      icon: Filter,
      tooltip: 'Filtrer les éléments',
      group: 'visibility'
    },
    {
      id: 'section-view',
      name: 'Coupe',
      icon: ScanLine,
      tooltip: 'Créer une vue en coupe',
      group: 'visibility',
      action: (api) => api.activateTool('section')
    },
    
    // Analyse
    {
      id: 'calculate-weight',
      name: 'Poids',
      icon: Calculator,
      tooltip: 'Calculer le poids des éléments',
      group: 'analysis'
    },
    {
      id: 'material-analysis',
      name: 'Analyse matériaux',
      icon: FlaskConical,
      tooltip: 'Analyser les matériaux utilisés',
      group: 'analysis'
    },
    {
      id: 'statistics',
      name: 'Statistiques',
      icon: BarChart3,
      tooltip: 'Afficher les statistiques du projet',
      group: 'analysis'
    },
    
    // Import/Export
    {
      id: 'import',
      name: 'Importer',
      icon: Upload,
      tooltip: 'Importer un fichier (Ctrl+O)',
      group: 'file',
      shortcut: 'o',
      action: (api) => api.emit('import-dialog')
    },
    {
      id: 'export',
      name: 'Exporter',
      icon: Download,
      tooltip: 'Exporter vers un fichier (Ctrl+E)',
      group: 'file',
      shortcut: 'e',
      action: (api) => api.emit('export-dialog')
    },
    {
      id: 'save-project',
      name: 'Sauvegarder',
      icon: Save,
      tooltip: 'Sauvegarder le projet (Ctrl+S)',
      group: 'file',
      shortcut: 's',
      action: (api) => api.emit('save-project')
    },
    
    // Utilitaires
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
    {
      id: 'settings',
      name: 'Paramètres',
      icon: Settings,
      tooltip: 'Ouvrir les paramètres',
      group: 'tools'
    }
  ],
  
  panels: [
    {
      id: 'scene-hierarchy',
      title: 'Hiérarchie de la scène',
      icon: Layers,
      position: 'left',
      defaultOpen: true,
      resizable: true,
      collapsible: true,
      minWidth: 300
    },
    {
      id: 'layer-manager',
      title: 'Gestionnaire de couches',
      icon: Layers,
      position: 'left',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 250
    },
    {
      id: 'properties',
      title: 'Propriétés',
      icon: Info,
      position: 'right',
      defaultOpen: true,
      resizable: true,
      collapsible: true,
      minWidth: 300
    },
    {
      id: 'materials',
      title: 'Matériaux',
      icon: FlaskConical,
      position: 'right',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 250
    },
    {
      id: 'measurements',
      title: 'Mesures',
      icon: Ruler,
      position: 'right',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 250
    },
    {
      id: 'annotations',
      title: 'Annotations',
      icon: Type,
      position: 'right',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 250
    },
    {
      id: 'analysis',
      title: 'Analyse',
      icon: BarChart3,
      position: 'bottom',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minHeight: 200
    }
  ],
  
  shortcuts: [
    // Navigation
    { key: ' ', action: 'select', description: 'Mode sélection' },
    { key: 'b', action: 'box-select', description: 'Sélection rectangle' },
    { key: 'f', action: 'fit-to-view', description: 'Vue d\'ensemble' },
    { key: 'f', shift: true, action: 'fit-selection', description: 'Vue sur sélection' },
    
    // Mesures
    { key: 'm', action: 'measure-distance', description: 'Mesurer distance' },
    { key: 'a', action: 'measure-angle', description: 'Mesurer angle' },
    
    // Annotations
    { key: 't', action: 'add-text', description: 'Annotation texte' },
    
    // Édition
    { key: 'c', ctrl: true, action: 'copy', description: 'Copier' },
    { key: 'v', ctrl: true, action: 'paste', description: 'Coller' },
    { key: 'x', ctrl: true, action: 'cut', description: 'Couper' },
    { key: 'Delete', action: 'delete', description: 'Supprimer' },
    { key: 'z', ctrl: true, action: 'undo', description: 'Annuler' },
    { key: 'y', ctrl: true, action: 'redo', description: 'Refaire' },
    
    // Visibilité
    { key: 'h', action: 'show-all', description: 'Afficher tout' },
    { key: 'i', action: 'isolate-selection', description: 'Isoler sélection' },
    { key: 'l', action: 'layer-visibility', description: 'Gérer couches' },
    
    // Fichiers
    { key: 'o', ctrl: true, action: 'import', description: 'Importer fichier' },
    { key: 's', ctrl: true, action: 'save-project', description: 'Sauvegarder' },
    { key: 'e', ctrl: true, action: 'export', description: 'Exporter' },
    
    // Outils
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
  ],
  
  plugins: [
    'measurement-plugin',
    'annotation-plugin',
    'analysis-plugin',
    'export-plugin'
  ]
};

export default professionalMode;