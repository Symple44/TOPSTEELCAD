/**
 * Export centralisé du système de plugins TopSteelCAD
 */

// Export du gestionnaire principal
export { default as PluginManager } from './PluginManager';

// Export des types
export type * from './types';

// Export des plugins prédéfinis
export { default as MeasurementPlugin } from './presets/MeasurementPlugin';

// Registre des plugins disponibles
import MeasurementPlugin from './presets/MeasurementPlugin';

export const availablePlugins = [
  MeasurementPlugin
] as const;

/**
 * Crée une instance du gestionnaire de plugins avec les plugins prédéfinis
 */
export function createPluginManager(api: any, options: any = {}) {
  const { PluginManager } = require('./PluginManager');
  return new PluginManager(api, options);
}

/**
 * Récupère un plugin par son ID
 */
export function getPluginById(id: string) {
  return availablePlugins.find(plugin => plugin.id === id);
}

/**
 * Récupère tous les plugins disponibles
 */
export function getAllPlugins() {
  return availablePlugins;
}