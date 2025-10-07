/**
 * Building Estimator - Module de métré de bâtiments
 * TopSteelCAD
 *
 * Module complet pour créer, visualiser et chiffrer des bâtiments métalliques
 */

// Types
export * from './types';

// Core
export * from './core';

// Templates
export * from './templates/monopente.template';

// Générateurs 3D (Sprint 2) ✅
export * from './generators';

// Services (Sprint 2) ✅
export * from './services';

// TODO: Composants (Sprint 3)
// export * from './components/BuildingEstimator';

// TODO: Export IFC (Sprint 5)
// export * from './services/IFCExporter';

/**
 * Version du module
 */
export const VERSION = '0.2.0-mvp'; // Sprint 1 + Sprint 2 terminés

/**
 * Configuration par défaut
 */
export const DEFAULT_CONFIG = {
  postSpacing: 5000,
  purlinSpacing: 1500,
  railSpacing: 1200,
  steelGrade: 'S235'
};
