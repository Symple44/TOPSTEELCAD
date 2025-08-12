/**
 * Export centralisé des modes prédéfinis pour TopSteelCAD
 */

import { ViewerModeConfig } from '../types';

// Re-export des types depuis ../types
export type {
  ViewerModeConfig,
  ViewerFeature,
  LayoutConfig,
  ToolConfig,
  PanelConfig,
  ShortcutConfig,
  ViewerAPI,
  ViewerPlugin,
  ToolExtension,
  PanelExtension,
  CommandExtension,
  ShortcutExtension,
  FeatureExtension
} from '../types';

// Import des modes prédéfinis
import minimalMode from './minimal';
import standardMode from './standard';
import professionalMode from './professional';

// Export nommé de tous les modes
export {
  minimalMode,
  standardMode,
  professionalMode
};

// Registre des modes disponibles
export const modeRegistry: Record<string, ViewerModeConfig> = {
  minimal: minimalMode,
  standard: standardMode,
  professional: professionalMode
};

// Liste des modes disponibles pour l'interface utilisateur
export const availableModes = [
  {
    id: 'minimal' as const,
    name: 'Minimal',
    description: 'Interface épurée avec seulement les outils essentiels',
    icon: 'eye',
    config: minimalMode
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    description: 'Interface équilibrée avec navigation et outils de base',
    icon: 'layout-dashboard',
    config: standardMode
  },
  {
    id: 'professional' as const,
    name: 'Professionnel',
    description: 'Interface complète avec tous les outils CAO avancés',
    icon: 'settings',
    config: professionalMode
  }
] as const;

// Type pour les IDs de modes disponibles
export type AvailableModeId = typeof availableModes[number]['id'];

/**
 * Récupère un mode par son ID
 */
export function getModeById(id: string): ViewerModeConfig | undefined {
  return modeRegistry[id];
}

/**
 * Récupère la liste de tous les modes disponibles
 */
export function getAllModes(): ViewerModeConfig[] {
  return Object.values(modeRegistry);
}

/**
 * Crée un mode personnalisé basé sur un mode existant
 */
export function createCustomMode(
  baseMode: ViewerModeConfig,
  overrides: Partial<ViewerModeConfig>
): ViewerModeConfig {
  return {
    ...baseMode,
    ...overrides,
    id: 'custom',
    features: overrides.features || baseMode.features,
    layout: { ...baseMode.layout, ...overrides.layout },
    tools: overrides.tools || baseMode.tools,
    panels: overrides.panels || baseMode.panels,
    shortcuts: overrides.shortcuts || baseMode.shortcuts
  };
}

/**
 * Valide qu'un mode est correctement configuré
 */
export function validateMode(mode: ViewerModeConfig): boolean {
  // Vérifications de base
  if (!mode.id || !mode.name || !mode.features || !mode.layout) {
    return false;
  }

  // Vérification que toutes les fonctionnalités ont un ID
  if (mode.features.some(feature => !feature.id)) {
    return false;
  }

  // Vérification que tous les outils ont un ID
  if (mode.tools && mode.tools.some(tool => !tool.id)) {
    return false;
  }

  // Vérification que tous les panneaux ont un ID et une position
  if (mode.panels && mode.panels.some(panel => !panel.id || !panel.position)) {
    return false;
  }

  return true;
}

// Export par défaut du registre
export default modeRegistry;