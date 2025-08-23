/**
 * Export centralisé du système de pipelines
 */

// Core pipeline classes
export { ProcessingPipeline } from './ProcessingPipeline';
export { ProcessingContext } from './ProcessingContext';
export { BaseStage } from './BaseStage';

// Types
export * from '../types/PipelineTypes';

// Utilities
export { PipelineUtils } from './PipelineUtils';

// Middleware (sera ajouté dans la prochaine étape)
// export * from './middleware';