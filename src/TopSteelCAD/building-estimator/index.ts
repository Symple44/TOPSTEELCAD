/**
 * Building Estimator Module
 * Module de métré et chiffrage de bâtiments métalliques
 * TopSteelCAD
 */

// Composant principal
export { BuildingEstimator } from './components/BuildingEstimator';
export type { BuildingEstimatorProps } from './components/BuildingEstimator';

// Hook
export { useBuildingEstimator } from './hooks/useBuildingEstimator';

// Types
export * from './types';

// Core
export { BuildingEngine } from './core/BuildingEngine';
export { FrameCalculator } from './core/FrameCalculator';
export { NomenclatureBuilder } from './core/NomenclatureBuilder';

// Generators
export { PostGenerator } from './generators/PostGenerator';
export { RafterGenerator } from './generators/RafterGenerator';
export { PurlinGenerator } from './generators/PurlinGenerator';
export { CladdingGenerator } from './generators/CladdingGenerator';
export { OpeningGenerator } from './generators/OpeningGenerator';

// Services
export { GeometryService } from './services/GeometryService';
export { IFCExporter } from './services/IFCExporter';
export { ProfileIFCMapper } from './services/ProfileIFCMapper';

// Utils
export * from './utils';

// Styles
export * from './styles/buildingEstimator.styles';
