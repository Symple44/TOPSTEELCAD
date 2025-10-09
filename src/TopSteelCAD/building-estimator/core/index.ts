/**
 * Core du Building Estimator
 * Exports centralisés
 */

// Anciens exports (pour compatibilité)
export * from './BuildingEngine';
export * from './FrameCalculator';
export * from './NomenclatureBuilder';

// Nouvelle architecture (Phase 1 Refactoring - Octobre 2025)
export * from './BuildingEngineBase';
export * from './MonoPenteEngine';
export * from './OmbriereEngine';
export * from './BuildingFactory';
export * from './strategies';

// Configuration centralisée par type (Phase 1.5 - Octobre 2025)
export * from './BuildingTypeConfigRegistry';
