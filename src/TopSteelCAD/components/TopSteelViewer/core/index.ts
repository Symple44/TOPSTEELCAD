// Export des renderers principaux
export { ViewerCore } from './ViewerCore';
export { MachinedElementRenderer } from './MachinedElementRenderer';
export { SimpleMachinedElement } from './SimpleMachinedRenderer';
export { AdvancedFeatureRenderer, AdvancedFeatureScene } from './AdvancedFeatureRenderer';
export { 
  BoltAssembly, 
  FilletWeld, 
  ButtWeld,
  AssemblyRenderer 
} from './AssemblyRenderer';

// Types de renderers disponibles
export enum RendererType {
  SIMPLE = 'simple',        // Rendu basique avec superposition
  MACHINED = 'machined',    // Rendu CSG standard
  ADVANCED = 'advanced'     // Rendu avancé avec LOD, cache et animations
}

// Configuration du renderer
export interface RendererConfig {
  type: RendererType;
  enableAnimations?: boolean;
  enableLOD?: boolean;
  enableCache?: boolean;
  enableShaders?: boolean;
  maxCacheSize?: number;
  lodDistances?: {
    high: number;
    medium: number;
    low: number;
  };
}