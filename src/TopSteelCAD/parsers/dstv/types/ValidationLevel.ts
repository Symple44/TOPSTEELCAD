/**
 * Niveau de validation - Fichier séparé pour éviter les problèmes d'import/export
 */

// Export comme objet constant pour meilleure compatibilité ES modules
export const ValidationLevel = {
  BASIC: 'basic',
  STANDARD: 'standard', 
  STRICT: 'strict'
} as const;

// Type pour TypeScript
export type ValidationLevelType = typeof ValidationLevel[keyof typeof ValidationLevel];

// Export par défaut aussi
export default ValidationLevel;