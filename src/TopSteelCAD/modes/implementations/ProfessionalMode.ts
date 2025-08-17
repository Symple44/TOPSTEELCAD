/**
 * Mode Professionnel - Interface complète avec tous les outils avancés
 */

import { ViewerModeConfig } from '../types';

export const professionalModeConfig: ViewerModeConfig = {
  id: 'professional',
  name: 'Mode Professionnel',
  description: 'Interface complète avec tous les outils avancés pour les professionnels',
  
  features: [
    { id: 'rotation', enabled: true },
    { id: 'zoom', enabled: true },
    { id: 'pan', enabled: true },
    { id: 'selection', enabled: true },
    { id: 'multiselection', enabled: true },
    { id: 'box-selection', enabled: true },
    { id: 'viewcube', enabled: true },
    { id: 'axes', enabled: true },
    { id: 'grid', enabled: true },
    { id: 'shadows', enabled: true },
    { id: 'antialiasing', enabled: true },
    { id: 'stats', enabled: true },
    { id: 'measurements', enabled: true },
    { id: 'annotations', enabled: true },
    { id: 'sections', enabled: true },
    { id: 'explode', enabled: true },
    { id: 'clash-detection', enabled: true },
    { id: 'snap', enabled: true },
    { id: 'undo-redo', enabled: true }
  ],
  
  layout: {
    header: true,
    sidebar: 'both',
    statusBar: true,
    toolbar: 'top',
    responsive: true,
    compact: false
  },
  
  tools: [
    // Fichier
    {
      id: 'import',
      name: 'Importer',
      tooltip: 'Importer un fichier (DSTV, IFC, STEP)',
      group: 'file',
      shortcut: 'ctrl+o'
    },
    {
      id: 'export',
      name: 'Exporter',
      tooltip: 'Exporter le modèle',
      group: 'file',
      shortcut: 'ctrl+e'
    },
    {
      id: 'save',
      name: 'Sauvegarder',
      tooltip: 'Sauvegarder le projet',
      group: 'file',
      shortcut: 'ctrl+s'
    },
    
    // Navigation
    {
      id: 'fit-view',
      name: 'Ajuster',
      tooltip: 'Ajuster la vue',
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
      tooltip: 'Vue orthographique/perspective',
      group: 'navigation',
      shortcut: 'o'
    },
    {
      id: 'walk-mode',
      name: 'Mode marche',
      tooltip: 'Navigation première personne',
      group: 'navigation',
      shortcut: 'w'
    },
    
    // Sélection et visibilité
    {
      id: 'select',
      name: 'Sélectionner',
      tooltip: 'Mode sélection',
      group: 'selection',
      shortcut: 's'
    },
    {
      id: 'box-select',
      name: 'Sélection zone',
      tooltip: 'Sélection par zone',
      group: 'selection',
      shortcut: 'b'
    },
    {
      id: 'isolate',
      name: 'Isoler',
      tooltip: 'Isoler les éléments',
      group: 'selection',
      shortcut: 'i'
    },
    {
      id: 'hide',
      name: 'Masquer',
      tooltip: 'Masquer la sélection',
      group: 'selection',
      shortcut: 'h'
    },
    {
      id: 'show-all',
      name: 'Tout afficher',
      tooltip: 'Afficher tous les éléments',
      group: 'selection',
      shortcut: 'shift+a'
    },
    {
      id: 'transparency',
      name: 'Transparence',
      tooltip: 'Rendre transparent',
      group: 'selection',
      shortcut: 't'
    },
    
    // Mesures et annotations
    {
      id: 'measure-distance',
      name: 'Distance',
      tooltip: 'Mesurer distance',
      group: 'measure',
      shortcut: 'd'
    },
    {
      id: 'measure-angle',
      name: 'Angle',
      tooltip: 'Mesurer angle',
      group: 'measure'
    },
    {
      id: 'measure-area',
      name: 'Surface',
      tooltip: 'Mesurer surface',
      group: 'measure'
    },
    {
      id: 'measure-volume',
      name: 'Volume',
      tooltip: 'Calculer volume',
      group: 'measure'
    },
    {
      id: 'annotate',
      name: 'Annoter',
      tooltip: 'Ajouter annotation',
      group: 'measure',
      shortcut: 'n'
    },
    {
      id: 'dimension',
      name: 'Coter',
      tooltip: 'Ajouter cotation',
      group: 'measure'
    },
    
    // Outils avancés
    {
      id: 'section',
      name: 'Coupe',
      tooltip: 'Plan de coupe',
      group: 'advanced',
      shortcut: 'c'
    },
    {
      id: 'explode',
      name: 'Éclater',
      tooltip: 'Vue éclatée',
      group: 'advanced',
      shortcut: 'e'
    },
    {
      id: 'clash',
      name: 'Conflits',
      tooltip: 'Détection de conflits',
      group: 'advanced'
    },
    {
      id: 'bom',
      name: 'Nomenclature',
      tooltip: 'Liste des éléments',
      group: 'advanced'
    },
    {
      id: 'timeline',
      name: 'Timeline',
      tooltip: 'Animation temporelle',
      group: 'advanced'
    },
    
    // Édition
    {
      id: 'undo',
      name: 'Annuler',
      tooltip: 'Annuler',
      group: 'edit',
      shortcut: 'ctrl+z'
    },
    {
      id: 'redo',
      name: 'Refaire',
      tooltip: 'Refaire',
      group: 'edit',
      shortcut: 'ctrl+y'
    },
    {
      id: 'copy',
      name: 'Copier',
      tooltip: 'Copier',
      group: 'edit',
      shortcut: 'ctrl+c'
    },
    {
      id: 'paste',
      name: 'Coller',
      tooltip: 'Coller',
      group: 'edit',
      shortcut: 'ctrl+v'
    },
    {
      id: 'delete',
      name: 'Supprimer',
      tooltip: 'Supprimer',
      group: 'edit',
      shortcut: 'Delete'
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
      minWidth: 250
    },
    {
      id: 'properties',
      title: 'Propriétés',
      position: 'right',
      defaultOpen: true,
      resizable: true,
      collapsible: true,
      minWidth: 300
    },
    {
      id: 'layers',
      title: 'Calques',
      position: 'left',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 200
    },
    {
      id: 'materials',
      title: 'Matériaux',
      position: 'right',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minWidth: 250
    },
    {
      id: 'measurements',
      title: 'Mesures',
      position: 'bottom',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minHeight: 150
    },
    {
      id: 'console',
      title: 'Console',
      position: 'bottom',
      defaultOpen: false,
      resizable: true,
      collapsible: true,
      minHeight: 100
    }
  ],
  
  shortcuts: [
    // Fichier
    { key: 'o', ctrl: true, action: 'import', description: 'Importer' },
    { key: 'e', ctrl: true, action: 'export', description: 'Exporter' },
    { key: 's', ctrl: true, action: 'save', description: 'Sauvegarder' },
    { key: 'p', ctrl: true, action: 'print', description: 'Imprimer' },
    
    // Navigation
    { key: 'f', action: 'fit-view', description: 'Ajuster vue' },
    { key: 'r', action: 'reset-view', description: 'Réinitialiser' },
    { key: 'o', action: 'orthographic', description: 'Orthographique' },
    { key: 'w', action: 'walk-mode', description: 'Mode marche' },
    
    // Vues prédéfinies
    { key: '1', action: 'view-front', description: 'Vue face' },
    { key: '2', action: 'view-back', description: 'Vue arrière' },
    { key: '3', action: 'view-left', description: 'Vue gauche' },
    { key: '4', action: 'view-right', description: 'Vue droite' },
    { key: '5', action: 'view-top', description: 'Vue dessus' },
    { key: '6', action: 'view-bottom', description: 'Vue dessous' },
    { key: '7', action: 'view-iso', description: 'Vue iso' },
    { key: '0', action: 'view-custom', description: 'Vue personnalisée' },
    
    // Sélection
    { key: 's', action: 'select-mode', description: 'Mode sélection' },
    { key: 'b', action: 'box-select', description: 'Sélection zone' },
    { key: 'i', action: 'isolate', description: 'Isoler' },
    { key: 'h', action: 'hide', description: 'Masquer' },
    { key: 't', action: 'transparency', description: 'Transparence' },
    { key: 'a', ctrl: true, action: 'select-all', description: 'Tout sélectionner' },
    { key: 'a', shift: true, action: 'show-all', description: 'Tout afficher' },
    { key: 'Escape', action: 'clear-selection', description: 'Annuler sélection' },
    
    // Mesures
    { key: 'd', action: 'measure-distance', description: 'Distance' },
    { key: 'n', action: 'annotate', description: 'Annotation' },
    { key: 'Delete', shift: true, action: 'clear-measurements', description: 'Effacer mesures' },
    
    // Outils avancés
    { key: 'c', action: 'section', description: 'Coupe' },
    { key: 'e', action: 'explode', description: 'Éclater' },
    { key: 'x', action: 'x-ray', description: 'Rayons X' },
    
    // Édition
    { key: 'z', ctrl: true, action: 'undo', description: 'Annuler' },
    { key: 'y', ctrl: true, action: 'redo', description: 'Refaire' },
    { key: 'c', ctrl: true, action: 'copy', description: 'Copier' },
    { key: 'v', ctrl: true, action: 'paste', description: 'Coller' },
    { key: 'x', ctrl: true, action: 'cut', description: 'Couper' },
    { key: 'Delete', action: 'delete', description: 'Supprimer' },
    
    // Interface
    { key: 'F11', action: 'fullscreen', description: 'Plein écran' },
    { key: 'Tab', action: 'toggle-panels', description: 'Afficher/Masquer panneaux' },
    { key: 'F1', action: 'help', description: 'Aide' }
  ],
  
  plugins: [
    'measurement-advanced',
    'clash-detection',
    'bom-generator',
    'timeline-animation',
    'export-advanced'
  ]
};

export default professionalModeConfig;