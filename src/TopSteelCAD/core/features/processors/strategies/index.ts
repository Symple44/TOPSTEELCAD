/**
 * Export centralisé des stratégies de découpe
 */

export type { ICutStrategy } from './CutStrategy';
export { BaseCutStrategy } from './CutStrategy';
export { SimpleCutStrategy } from './SimpleCutStrategy';
export { TransverseCutStrategy } from './TransverseCutStrategy';
export { BeveledCutStrategy } from './BeveledCutStrategy';
export { CompoundCutStrategy } from './CompoundCutStrategy';

// Nouvelles stratégies spécialisées
export { ExteriorCutStrategy } from './ExteriorCutStrategy';
export { StraightCutStrategy } from './StraightCutStrategy';
export { AngleCutStrategy } from './AngleCutStrategy';
export { TubeContourStrategy } from './TubeContourStrategy';
export { BevelCutStrategy } from './BevelCutStrategy';
export { EndCutStrategy } from './EndCutStrategy';