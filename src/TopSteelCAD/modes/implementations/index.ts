/**
 * Export des implémentations de modes
 */

export { minimalModeConfig } from './MinimalMode';
export { standardModeConfig } from './StandardMode';
export { professionalModeConfig } from './ProfessionalMode';

// Export par défaut des configurations
import { minimalModeConfig } from './MinimalMode';
import { standardModeConfig } from './StandardMode';
import { professionalModeConfig } from './ProfessionalMode';
import { ViewerModeConfig } from '../types';

export const modes = {
  minimal: minimalModeConfig,
  standard: standardModeConfig,
  professional: professionalModeConfig
} as const;

export type ModeId = keyof typeof modes;

/**
 * Obtient une configuration de mode par son ID
 */
export function getModeConfig(modeId: ModeId): ViewerModeConfig {
  return modes[modeId];
}

/**
 * Obtient tous les modes disponibles
 */
export function getAllModes(): ViewerModeConfig[] {
  return Object.values(modes);
}

/**
 * Mode par défaut
 */
export const defaultMode = standardModeConfig;

export default modes;