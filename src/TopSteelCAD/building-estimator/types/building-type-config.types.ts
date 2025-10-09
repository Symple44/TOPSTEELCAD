/**
 * Configuration centralisée des types de bâtiments
 * Définit quels composants/options sont disponibles pour chaque type
 * Building Estimator - TopSteelCAD
 */

import { BuildingStep } from '../components/types';

/**
 * Configuration des composants disponibles pour un type de bâtiment
 */
export interface BuildingTypeComponentConfig {
  // Step 2 - Equipment (Ossature secondaire)
  hasOpenings: boolean;          // Ouvertures (portes, fenêtres)
  hasGuardrail: boolean;         // Garde-corps
  hasAcrotere: boolean;          // Acrotères
  hasSolarArray: boolean;        // Panneaux solaires (ombrières)
  hasLocation: boolean;          // Localisation géographique (pour solaire)

  // Step 3 - Envelope
  hasCladding: boolean;          // Bardage
  hasRoofing: boolean;           // Couverture

  // Step 4 - Finishing
  hasPainting: boolean;          // Peinture
  hasAccessories: boolean;       // Accessoires
  hasOptions: boolean;           // Options diverses
}

/**
 * Configuration des étapes du workflow pour un type de bâtiment
 */
export interface BuildingTypeWorkflowConfig {
  visibleSteps: BuildingStep[];  // Étapes visibles dans le workflow
  requiredSteps: BuildingStep[]; // Étapes obligatoires (non skippables)
}

/**
 * Configuration complète d'un type de bâtiment
 */
export interface BuildingTypeConfig {
  // Métadonnées
  name: string;                  // Nom affiché
  description: string;           // Description
  icon: string;                  // Icône emoji

  // Composants disponibles
  components: BuildingTypeComponentConfig;

  // Workflow
  workflow: BuildingTypeWorkflowConfig;

  // Variantes structurelles disponibles
  hasStructuralVariants: boolean;
  structuralVariants?: string[]; // Liste des variantes disponibles

  // Dimensions spécifiques
  hasClearHeight: boolean;       // Hauteur libre (ombrières)
  hasTilt: boolean;              // Inclinaison (ombrières, panneaux)
  hasSlope: boolean;             // Pente de toit
  hasRidgeOffset: boolean;       // Déport faîtage (bipente asym)

  // Validation
  minLength?: number;            // Longueur minimale (mm)
  maxLength?: number;            // Longueur maximale (mm)
  minWidth?: number;             // Largeur minimale (mm)
  maxWidth?: number;             // Largeur maximale (mm)
}

/**
 * Helper type pour la sélection de composants
 */
export type BuildingComponentType = keyof BuildingTypeComponentConfig;

/**
 * Configuration par défaut (pour types non encore configurés)
 */
export const DEFAULT_BUILDING_TYPE_CONFIG: BuildingTypeConfig = {
  name: 'Bâtiment',
  description: 'Configuration par défaut',
  icon: '🏗️',
  components: {
    hasOpenings: true,
    hasGuardrail: true,
    hasAcrotere: true,
    hasSolarArray: false,
    hasLocation: false,
    hasCladding: true,
    hasRoofing: true,
    hasPainting: true,
    hasAccessories: true,
    hasOptions: true
  },
  workflow: {
    visibleSteps: [
      BuildingStep.DIMENSIONS,
      BuildingStep.EQUIPMENT,
      BuildingStep.ENVELOPE,
      BuildingStep.FINISHING,
      BuildingStep.SUMMARY
    ],
    requiredSteps: [BuildingStep.DIMENSIONS]
  },
  hasStructuralVariants: false,
  hasClearHeight: false,
  hasTilt: false,
  hasSlope: true,
  hasRidgeOffset: false,
  minLength: 3000,
  maxLength: 100000,
  minWidth: 3000,
  maxWidth: 50000
};
