/**
 * Part Builder Module
 * Module de création de pièces métalliques pour TopSteelCAD
 */

// Export des composants principaux
export { PartBuilderAdvanced } from './components/PartBuilderAdvanced';
export { HoleConfigurator } from './components/HoleConfigurator';
export { HoleConfiguratorSimple } from './components/HoleConfiguratorSimple';
export { Part3DViewer } from './components/Part3DViewer';

// Export des types si nécessaire
export type {
  PartDefinition,
  ProfileDefinition,
  PlateDefinition,
  PartType,
  MaterialDefinition,
  WorkflowStep
} from './types';