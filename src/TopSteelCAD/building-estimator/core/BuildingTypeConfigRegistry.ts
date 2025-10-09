/**
 * Registry centralisé des configurations par type de bâtiment
 * Définit quels composants sont disponibles pour chaque type
 * Building Estimator - TopSteelCAD
 */

import { BuildingType } from '../types/building.types';
import { BuildingStep } from '../components/types';
import {
  BuildingTypeConfig,
  BuildingComponentType,
  DEFAULT_BUILDING_TYPE_CONFIG
} from '../types/building-type-config.types';
import { OmbriereStructuralVariant } from '../types/ombriere.types';

/**
 * Registry centralisé : Configuration de chaque type de bâtiment
 */
export const BUILDING_TYPE_CONFIGS: Record<BuildingType, BuildingTypeConfig> = {
  // ============================================================================
  // MONOPENTE
  // ============================================================================
  [BuildingType.MONO_PENTE]: {
    name: 'Monopente',
    description: 'Bâtiment à une pente',
    icon: '🔻',

    components: {
      // Step 2 - Equipment
      hasOpenings: true,
      hasGuardrail: true,
      hasAcrotere: true,
      hasSolarArray: false,
      hasLocation: false,

      // Step 3 - Envelope
      hasCladding: true,
      hasRoofing: true,

      // Step 4 - Finishing
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
  },

  // ============================================================================
  // BIPENTE SYMÉTRIQUE
  // ============================================================================
  [BuildingType.BI_PENTE]: {
    name: 'Bipente symétrique',
    description: 'Bâtiment à deux pentes symétriques',
    icon: '🏠',

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
    minWidth: 6000,
    maxWidth: 50000
  },

  // ============================================================================
  // BIPENTE ASYMÉTRIQUE
  // ============================================================================
  [BuildingType.BI_PENTE_ASYM]: {
    name: 'Bipente asymétrique',
    description: 'Bâtiment à deux pentes asymétriques',
    icon: '🏘️',

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
    hasSlope: false, // Gère les pentes gauche/droite séparément
    hasRidgeOffset: true,

    minLength: 3000,
    maxLength: 100000,
    minWidth: 6000,
    maxWidth: 50000
  },

  // ============================================================================
  // AUVENT
  // ============================================================================
  [BuildingType.AUVENT]: {
    name: 'Auvent',
    description: 'Structure ouverte en appentis',
    icon: '⛱️',

    components: {
      hasOpenings: false,          // ❌ Pas d'ouvertures (structure ouverte)
      hasGuardrail: true,          // ✅ Peut avoir des garde-corps
      hasAcrotere: false,          // ❌ Pas d'acrotère
      hasSolarArray: false,
      hasLocation: false,
      hasCladding: false,          // ❌ Pas de bardage (structure ouverte)
      hasRoofing: true,            // ✅ Couverture uniquement
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
    maxLength: 50000,
    minWidth: 2000,
    maxWidth: 15000
  },

  // ============================================================================
  // PLANCHER
  // ============================================================================
  [BuildingType.PLANCHER]: {
    name: 'Plancher',
    description: 'Plancher/Mezzanine',
    icon: '🏢',

    components: {
      hasOpenings: true,
      hasGuardrail: true,          // ✅ Important pour sécurité plancher
      hasAcrotere: false,
      hasSolarArray: false,
      hasLocation: false,
      hasCladding: false,          // ❌ Pas de bardage
      hasRoofing: false,           // ❌ Pas de couverture (c'est un plancher)
      hasPainting: true,
      hasAccessories: true,
      hasOptions: true
    },

    workflow: {
      visibleSteps: [
        BuildingStep.DIMENSIONS,
        BuildingStep.EQUIPMENT,
        BuildingStep.FINISHING,
        BuildingStep.SUMMARY
      ],
      requiredSteps: [BuildingStep.DIMENSIONS]
    },

    hasStructuralVariants: false,
    hasClearHeight: false,
    hasTilt: false,
    hasSlope: false,
    hasRidgeOffset: false,

    minLength: 3000,
    maxLength: 100000,
    minWidth: 3000,
    maxWidth: 50000
  },

  // ============================================================================
  // OMBRIÈRE PHOTOVOLTAÏQUE
  // ============================================================================
  [BuildingType.OMBRIERE]: {
    name: 'Ombrière Photovoltaïque',
    description: 'Structure couverte avec panneaux solaires',
    icon: '☀️',

    components: {
      // Step 2 - Equipment
      hasOpenings: false,          // ❌ Pas d'ouvertures (structure ouverte)
      hasGuardrail: false,         // ❌ Pas de garde-corps
      hasAcrotere: false,          // ❌ Pas d'acrotère
      hasSolarArray: true,         // ✅ Panneaux solaires (composant principal)
      hasLocation: true,           // ✅ Localisation géographique (pour calculs solaires)

      // Step 3 - Envelope
      hasCladding: false,          // ❌ Pas de bardage (structure ouverte)
      hasRoofing: false,           // ❌ Pas de couverture (panneaux = couverture)

      // Step 4 - Finishing
      hasPainting: true,           // ✅ Peinture structure métallique
      hasAccessories: true,        // ✅ Accessoires (éclairage, signalétique parking)
      hasOptions: true             // ✅ Options diverses
    },

    workflow: {
      visibleSteps: [
        BuildingStep.DIMENSIONS,
        BuildingStep.EQUIPMENT,      // Panneaux solaires + localisation
        BuildingStep.FINISHING,       // Peinture + accessoires
        BuildingStep.SUMMARY
        // ❌ Pas de Step ENVELOPE (pas de bardage/couverture)
      ],
      requiredSteps: [BuildingStep.DIMENSIONS, BuildingStep.EQUIPMENT]
    },

    hasStructuralVariants: true,
    structuralVariants: [
      OmbriereStructuralVariant.CENTERED_POST,
      OmbriereStructuralVariant.DOUBLE_CENTERED_POST,
      OmbriereStructuralVariant.Y_SHAPED,
      OmbriereStructuralVariant.OFFSET_POST
    ],

    hasClearHeight: true,          // ✅ Hauteur libre pour véhicules
    hasTilt: true,                 // ✅ Inclinaison panneaux solaires
    hasSlope: false,               // ❌ Pas de pente de toit
    hasRidgeOffset: false,

    minLength: 5000,               // Minimum 5m (2 places parking)
    maxLength: 150000,             // Maximum 150m
    minWidth: 5000,                // Minimum 5m (1 rangée parking)
    maxWidth: 50000                // Maximum 50m
  }
};

/**
 * Helper: Récupérer la configuration d'un type de bâtiment
 */
export function getBuildingTypeConfig(buildingType: BuildingType): BuildingTypeConfig {
  return BUILDING_TYPE_CONFIGS[buildingType] || DEFAULT_BUILDING_TYPE_CONFIG;
}

/**
 * Helper: Vérifier si un composant est disponible pour un type
 */
export function hasComponent(
  buildingType: BuildingType,
  component: BuildingComponentType
): boolean {
  const config = getBuildingTypeConfig(buildingType);
  return config.components[component];
}

/**
 * Helper: Vérifier si une étape est visible pour un type
 */
export function isStepVisible(
  buildingType: BuildingType,
  step: BuildingStep
): boolean {
  const config = getBuildingTypeConfig(buildingType);
  return config.workflow.visibleSteps.includes(step);
}

/**
 * Helper: Vérifier si une étape est obligatoire pour un type
 */
export function isStepRequired(
  buildingType: BuildingType,
  step: BuildingStep
): boolean {
  const config = getBuildingTypeConfig(buildingType);
  return config.workflow.requiredSteps.includes(step);
}

/**
 * Helper: Récupérer toutes les variantes structurelles disponibles pour un type
 */
export function getStructuralVariants(buildingType: BuildingType): string[] {
  const config = getBuildingTypeConfig(buildingType);
  return config.hasStructuralVariants ? (config.structuralVariants || []) : [];
}

/**
 * Helper: Récupérer le nom affiché d'un type
 */
export function getBuildingTypeName(buildingType: BuildingType): string {
  const config = getBuildingTypeConfig(buildingType);
  return config.icon + ' ' + config.name;
}
