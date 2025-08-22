/**
 * Types pour le système de modes du viewer
 */

import { PivotElement } from '@/types/viewer';
import { ThemeConfig } from '../themes/types';

// Configuration d'une fonctionnalité
export interface ViewerFeature {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Position de la toolbar
export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right' | 'floating' | 'none';

// Configuration du layout
export interface LayoutConfig {
  header: boolean;
  sidebar: 'left' | 'right' | 'both' | 'none';
  statusBar: boolean;
  toolbar: ToolbarPosition;
  responsive: boolean;
  compact?: boolean;
}

// Configuration d'un outil
export interface ToolConfig {
  id: string;
  name?: string;
  icon?: React.ComponentType<any>;
  tooltip?: string;
  group?: string;
  shortcut?: string;
  disabled?: boolean;
  hidden?: boolean;
  action?: (api: ViewerAPI) => void;
}

// Configuration d'un panneau
export interface PanelConfig {
  id: string;
  title?: string;
  icon?: React.ComponentType<any>;
  position: 'left' | 'right' | 'bottom' | 'floating';
  defaultOpen?: boolean;
  resizable?: boolean;
  collapsible?: boolean;
  minWidth?: number;
  minHeight?: number;
  component?: React.ComponentType<any>;
}

// Configuration d'un mode complet
export interface ViewerModeConfig {
  id: 'minimal' | 'standard' | 'professional' | 'custom';
  name: string;
  description: string;
  features: ViewerFeature[];
  layout: LayoutConfig;
  tools: ToolConfig[];
  panels: PanelConfig[];
  shortcuts?: ShortcutConfig[];
  plugins?: string[];
}

// Configuration des raccourcis clavier
export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description?: string;
}

// API du viewer
export interface ViewerAPI {
  // Gestion des éléments
  getElements: () => PivotElement[];
  addElement: (element: PivotElement) => void;
  updateElement: (id: string, updates: Partial<PivotElement>) => void;
  deleteElement: (id: string) => void;
  
  // Sélection
  selectElement: (id: string | null) => void;
  getSelectedElement: () => PivotElement | null;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Visibilité
  showElement: (id: string) => void;
  hideElement: (id: string) => void;
  isolateElements: (ids: string[]) => void;
  showAllElements: () => void;
  
  // Camera
  fitToView: (elementIds?: string[]) => void;
  setView: (view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso') => void;
  getCamera: () => any;
  setCamera: (camera: any) => void;
  
  // Outils
  activateTool: (toolId: string) => void;
  deactivateTool: () => void;
  getActiveTool: () => string | null;
  
  // Mesures
  startMeasurement: (type: 'distance' | 'angle' | 'area') => void;
  clearMeasurements: () => void;
  
  // Annotations
  addAnnotation: (annotation: any) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  
  // Export
  exportScene: (format: string, options?: any) => Promise<Blob>;
  screenshot: () => Promise<Blob>;
  
  // Plugins
  registerPlugin: (plugin: ViewerPlugin) => void;
  unregisterPlugin: (pluginId: string) => void;
  
  // Events
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: any) => void;
  
  // Mode et thème
  setMode: (mode: ViewerModeConfig) => void;
  getMode: () => ViewerModeConfig;
  setTheme: (theme: ThemeConfig | 'light' | 'dark') => void;
  getTheme: () => ThemeConfig;
}

// Plugin du viewer
export interface ViewerPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // Hooks du cycle de vie
  onInit?: (api: ViewerAPI) => void;
  onMount?: (api: ViewerAPI) => void;
  onUnmount?: (api: ViewerAPI) => void;
  onDestroy?: () => void;
  
  // Extensions
  tools?: ToolExtension[];
  panels?: PanelExtension[];
  commands?: CommandExtension[];
  shortcuts?: ShortcutExtension[];
  features?: FeatureExtension[];
}

// Extensions de plugin
export interface ToolExtension {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  tooltip?: string;
  group?: string;
  handler: (api: ViewerAPI) => void;
}

export interface PanelExtension {
  id: string;
  title: string;
  icon?: React.ComponentType<any>;
  position: 'left' | 'right' | 'bottom';
  component: React.ComponentType<any>;
}

export interface CommandExtension {
  id: string;
  name: string;
  description?: string;
  handler: (api: ViewerAPI, ...args: unknown[]) => any;
}

export interface ShortcutExtension {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (api: ViewerAPI) => void;
  description?: string;
}

export interface FeatureExtension {
  id: string;
  name: string;
  component?: React.ComponentType<any>;
  config?: any;
}

// Type alias pour compatibilité
export type ModeConfig = ViewerModeConfig;

// Configuration complète du viewer
export interface ViewerConfig {
  mode?: ViewerModeConfig;
  theme?: ThemeConfig | 'light' | 'dark';
  defaultMode?: 'minimal' | 'standard' | 'professional';
  defaultTheme?: 'light' | 'dark';
  plugins?: ViewerPlugin[];
  initialElements?: PivotElement[];
  enableShortcuts?: boolean;
  enableTooltips?: boolean;
  enableAnimations?: boolean;
  performance?: {
    maxElements?: number;
    lodDistance?: number;
    shadowQuality?: 'low' | 'medium' | 'high';
    antialias?: boolean;
  };
}