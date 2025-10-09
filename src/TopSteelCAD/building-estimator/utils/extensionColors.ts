/**
 * Utilitaires pour les couleurs des extensions
 * Building Estimator - TopSteelCAD
 */

import { BuildingExtension } from '../types';

export interface ExtensionColor {
  border: string;
  bg: string;
  text: string;
}

/**
 * Palette de couleurs pour les extensions
 * Chaque extension aura une couleur unique dans cette palette
 */
const EXTENSION_COLOR_PALETTE: ExtensionColor[] = [
  // Orange
  {
    border: '#f59e0b',
    bg: '#fef3c7',
    text: '#f59e0b'
  },
  // Violet
  {
    border: '#a855f7',
    bg: '#f3e8ff',
    text: '#a855f7'
  },
  // Rose
  {
    border: '#ec4899',
    bg: '#fce7f3',
    text: '#ec4899'
  },
  // Vert
  {
    border: '#10b981',
    bg: '#d1fae5',
    text: '#10b981'
  },
  // Rouge
  {
    border: '#ef4444',
    bg: '#fee2e2',
    text: '#ef4444'
  },
  // Cyan
  {
    border: '#06b6d4',
    bg: '#cffafe',
    text: '#06b6d4'
  },
  // Indigo
  {
    border: '#6366f1',
    bg: '#e0e7ff',
    text: '#6366f1'
  },
  // Jaune
  {
    border: '#eab308',
    bg: '#fef9c3',
    text: '#eab308'
  }
];

/**
 * Obtient le niveau d'une extension dans la hiérarchie
 */
export function getExtensionLevel(
  extension: BuildingExtension,
  allExtensions: BuildingExtension[]
): number {
  if (!extension.parentId) return 1; // Directement attachée au bâtiment principal

  const parent = allExtensions.find(e => e.id === extension.parentId);
  if (!parent) return 1;

  return 1 + getExtensionLevel(parent, allExtensions);
}

/**
 * Obtient la couleur pour le bâtiment principal
 */
export function getMainBuildingColor(): ExtensionColor {
  return {
    border: '#1e40af',
    bg: '#dbeafe',
    text: '#1e40af'
  };
}

/**
 * Obtient la couleur unique pour une extension
 * Utilise le colorIndex permanent de l'extension si disponible
 */
export function getExtensionColor(
  extension: BuildingExtension,
  allExtensions: BuildingExtension[]
): ExtensionColor {
  // Utiliser le colorIndex permanent si défini
  if (extension.colorIndex !== undefined) {
    return EXTENSION_COLOR_PALETTE[extension.colorIndex % EXTENSION_COLOR_PALETTE.length];
  }

  // Fallback: utiliser l'index dans le tableau (pour rétrocompatibilité)
  const extensionIndex = allExtensions.findIndex(e => e.id === extension.id);
  const colorIndex = extensionIndex % EXTENSION_COLOR_PALETTE.length;

  return EXTENSION_COLOR_PALETTE[colorIndex];
}

/**
 * Obtient le prochain index de couleur disponible
 * Cherche le maximum + 1 pour éviter les duplications
 */
export function getNextColorIndex(allExtensions: BuildingExtension[]): number {
  if (allExtensions.length === 0) return 0;

  // Trouver le colorIndex maximum déjà utilisé
  const maxColorIndex = allExtensions.reduce((max, ext) => {
    if (ext.colorIndex === undefined) return max;
    return Math.max(max, ext.colorIndex);
  }, -1);

  return maxColorIndex + 1;
}
