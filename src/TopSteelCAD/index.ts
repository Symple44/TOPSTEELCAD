/**
 * TopSteelCAD - Modern 3D CAD Viewer for Steel Structures
 * Version: 2.0.0
 * 
 * Architecture modulaire avec Strategy/Factory Pattern
 * Voir ARCHITECTURE-FINALE.md pour la documentation complète
 */

// Initialiser le logger au démarrage
import './utils/logger';

// ========================================
// CORE ENGINE - Moteur principal
// ========================================
export { ViewerEngine } from './core/ViewerEngine';
export type { ViewerConfig, ViewerState } from './core/ViewerEngine';
export { EventBus } from './core/EventBus';
export { SceneManager } from './core/SceneManager';
export type { SceneConfig } from './core/SceneManager';
export { RenderingPipeline } from './core/RenderingPipeline';
export type { RenderingConfig, RenderStats } from './core/RenderingPipeline';

// ========================================
// CAMERA & CONTROLS - Caméras et contrôles
// ========================================
export { CameraController } from './cameras/CameraController';

// ========================================
// SELECTION - Système de sélection
// ========================================
export { SelectionManager } from './selection/SelectionManager';

// ========================================
// UI COMPONENTS - Composants interface (existants)
// ========================================
export { ViewCube } from './ui/ViewCube';
export { AxesHelper } from './ui/AxesHelper';

// ========================================
// MAIN COMPONENTS - Composants principaux
// ========================================
export { default } from './TopSteelCAD';

// ========================================
// TOOLS & I/O - Outils et fichiers
// ========================================
export { MeasurementTool } from './tools/MeasurementTool';
export type { MeasurementType, Measurement } from './tools/MeasurementTool';
export { FileManager } from './io/FileManager';
export type { FileFormat, ExportOptions, ImportOptions } from './io/FileManager';

// ========================================
// 3D LIBRARY - Architecture Strategy/Factory
// ========================================
// Note: Ces exports directs ne sont plus disponibles dans 3DLibrary
// Utiliser DatabaseGeometryBridge à la place

export { 
  GeometryGeneratorFactory, 
  DatabaseGeometryBridge
} from './3DLibrary';

// Export des types 3DLibrary
export type { 
  SteelProfile, 
  ProfileType,
  ProfileDimensions,
  MaterialCategory,
  UnifiedElement,
  GeometryGenerationResult
} from './3DLibrary';

// ========================================
// FEATURE PROCESSORS - Processeurs de features (lazy loaded)
// ========================================
// Processeurs chargés à la demande pour optimiser le bundle initial
export const FeatureProcessors = {
  async loadHoleProcessor() {
    const module = await import('./core/features/processors');
    return module.HoleProcessor;
  },
  async loadSlotProcessor() {
    const module = await import('./core/features/processors');
    return module.SlotProcessor;
  },
  async loadNotchProcessor() {
    const module = await import('./core/features/processors');
    return module.NotchProcessor;
  },
  async loadMarkingProcessor() {
    const module = await import('./core/features/processors');
    return module.MarkingProcessor;
  },
  async loadTextProcessor() {
    const module = await import('./core/features/processors');
    return module.TextProcessor;
  },
  async loadCopingProcessor() {
    const module = await import('./core/features/processors');
    return module.CopingProcessor;
  },
  async loadBevelProcessor() {
    const module = await import('./core/features/processors');
    return module.BevelProcessor;
  },
  async loadCutoutProcessor() {
    const module = await import('./core/features/processors');
    return module.CutoutProcessor;
  },
  async loadDrillPatternProcessor() {
    const module = await import('./core/features/processors');
    return module.DrillPatternProcessor;
  },
  async loadWeldProcessor() {
    const module = await import('./core/features/processors');
    return module.WeldProcessor;
  },
  async loadChamferProcessor() {
    const module = await import('./core/features/processors');
    return module.ChamferProcessor;
  },
  async loadContourProcessor() {
    const module = await import('./core/features/processors');
    return module.ContourProcessor;
  },
  async loadCounterSinkProcessor() {
    const module = await import('./core/features/processors');
    return module.CounterSinkProcessor;
  },
  async loadTappedHoleProcessor() {
    const module = await import('./core/features/processors');
    return module.TappedHoleProcessor;
  },
  
  // Helper pour charger tous les processeurs à la fois
  async loadAll() {
    const module = await import('./core/features/processors');
    return {
      HoleProcessor: module.HoleProcessor,
      SlotProcessor: module.SlotProcessor,
      NotchProcessor: module.NotchProcessor,
      MarkingProcessor: module.MarkingProcessor,
      TextProcessor: module.TextProcessor,
      CopingProcessor: module.CopingProcessor,
      BevelProcessor: module.BevelProcessor,
      CutoutProcessor: module.CutoutProcessor,
      DrillPatternProcessor: module.DrillPatternProcessor,
      WeldProcessor: module.WeldProcessor,
      ChamferProcessor: module.ChamferProcessor,
      ContourProcessor: module.ContourProcessor,
      CounterSinkProcessor: module.CounterSinkProcessor,
      TappedHoleProcessor: module.TappedHoleProcessor
    };
  }
};

// Export du système de features
export { FeatureSystem } from './core/features/FeatureSystem';
export type * from './core/features/types';

// ========================================
// PARSERS - Parseurs de fichiers (lazy loaded)
// ========================================
// DSTVPlugin chargé à la demande pour réduire le bundle initial
export const DSTVPlugin = {
  async load() {
    const module = await import('./plugins/dstv/DSTVPlugin');
    return module.DSTVPlugin;
  }
};
// TODO: Parsers à implémenter
// export { IFCParser } from './parsers/IFCParser';
// export { STEPParser } from './parsers/STEPParser';

// ========================================
// PLUGINS - Système de plugins
// ========================================
export { PluginManager } from './plugins/PluginManager';
// export { MeasurementPlugin } from './plugins/presets/MeasurementPlugin';
export type { ViewerPlugin, PluginConfig } from './plugins/types';

// ========================================
// THÈMES - Système de thèmes
// ========================================
export { ThemeProvider } from './themes/ThemeProvider';
export { lightTheme, darkTheme } from './themes/presets';
export { createTheme, applyTheme } from './themes/helpers';
export type { ThemeConfig, ThemeColors } from './themes/types';

// ========================================
// MODES - Modes de visualisation
// ========================================
// Export des composants de viewer au lieu des configs
export { MinimalViewer } from './MinimalViewer';
export { StandardViewer } from './StandardViewer'; 
export { ProfessionalViewer } from './ProfessionalViewer';
export type { ViewerModeConfig, ModeConfig } from './modes/types';

// ========================================
// HOOKS - Hooks React personnalisés
// ========================================
export { useViewer } from './hooks/useViewer';
export type { UseViewerReturn } from './hooks/useViewer';

// ========================================
// WEBWORKERS - Système de WebWorkers (lazy loaded)
// ========================================
export { CSGWorkerSystem, preloadCSGWorkers } from './workers';

// ========================================
// COMPONENTS - Composant viewer principal
// ========================================
// export { ViewerCore } from './components/ViewerCore';
// TODO: Composants non encore implémentés - désactivés temporairement
// export { TopSteelViewer } from './components/TopSteelViewer';
// export { useViewerStore } from './components/TopSteelViewer/store/useViewerStore';

// ========================================
// CONFIGURATION PAR DÉFAUT
// ========================================
export const defaultConfig = {
  viewer: {
    antialias: true,
    shadows: true,
    backgroundColor: '#1a1a1a',
    maxFPS: 60
  },
  performance: {
    enableLOD: true,
    enableFrustumCulling: true,
    enableInstancing: true,
    adaptiveQuality: true
  },
  ui: {
    theme: 'dark',
    showToolbar: true,
    showSidebar: true,
    showStatusBar: true,
    showViewCube: true,
    showAxesHelper: true
  }
} as const;

// ========================================
// HELPER FUNCTIONS - Fonctions utilitaires
// ========================================

/**
 * Initialise la 3DLibrary
 */
export async function initialize3DLibrary(): Promise<void> {
  // L'initialisation est maintenant gérée en interne par la 3DLibrary
  // Cette fonction est conservée pour la compatibilité
  return;
}

/**
 * Crée un élément géométrique à partir d'un profil
 */
export async function createFromDatabase(designation: string, length: number = 6000) {
  // Importer dynamiquement pour éviter les erreurs de compilation
  const { DatabaseGeometryBridge } = await import('./3DLibrary');
  const bridge = new DatabaseGeometryBridge();
  return await bridge.generateFromDesignation(designation, length);
}

/**
 * Obtient les statistiques des générateurs
 */
export async function getGeneratorStatistics() {
  const { GeometryGeneratorFactory } = await import('./3DLibrary');
  const factory = new GeometryGeneratorFactory();
  return factory.getStatistics();
}

// ========================================
// VERSION INFO
// ========================================
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();
export const ARCHITECTURE = 'Strategy/Factory Pattern with 3DLibrary';