/**
 * Template par défaut pour bâtiment monopente
 * Building Estimator - TopSteelCAD
 */

import {
  BuildingType,
  CladdingType,
  RoofingType,
  CreateBuildingConfig
} from '../types';

/**
 * Template de bâtiment monopente standard
 * Dimensions : 20m x 12m x 6m
 * Pente : 10%
 */
export const defaultMonoPenteTemplate: CreateBuildingConfig = {
  name: 'Bâtiment Monopente Standard',

  dimensions: {
    length: 20000,          // 20m
    width: 12000,           // 12m
    heightWall: 6000,       // 6m
    slope: 10               // 10%
  },

  parameters: {
    // Entraxes
    postSpacing: 5000,      // 5m
    purlinSpacing: 1500,    // 1.5m
    railSpacing: 1200,      // 1.2m

    // Profils par défaut
    postProfile: 'IPE 240',
    rafterProfile: 'IPE 200',
    purlinProfile: 'IPE 140',
    railProfile: 'UAP 80',

    // Matériaux
    steelGrade: 'S235',

    // Options
    includeGutters: true,
    includeDownspouts: true
  },

  openings: [],

  finishes: {
    cladding: {
      type: CladdingType.SANDWICH_80MM,
      color: 'RAL 9002',
      thickness: 80
    },
    roofing: {
      type: RoofingType.SANDWICH_80MM,
      color: 'RAL 7016',
      thickness: 80
    },
    trim: {
      color: 'RAL 9006'
    }
  },

  metadata: {
    notes: 'Template standard généré automatiquement'
  }
};

/**
 * Template petit bâtiment monopente
 * Dimensions : 10m x 8m x 4m
 */
export const smallMonoPenteTemplate: CreateBuildingConfig = {
  name: 'Petit Bâtiment Monopente',

  dimensions: {
    length: 10000,          // 10m
    width: 8000,            // 8m
    heightWall: 4000,       // 4m
    slope: 8                // 8%
  },

  parameters: {
    postSpacing: 4000,      // 4m
    purlinSpacing: 1500,    // 1.5m
    railSpacing: 1200,      // 1.2m

    postProfile: 'IPE 180',
    rafterProfile: 'IPE 160',
    purlinProfile: 'IPE 120',
    railProfile: 'UAP 65',

    steelGrade: 'S235'
  },

  finishes: {
    cladding: {
      type: CladdingType.STEEL_PANEL_SINGLE,
      color: 'RAL 9002'
    },
    roofing: {
      type: RoofingType.STEEL_PANEL_075MM,
      color: 'RAL 7016'
    }
  }
};

/**
 * Template grand bâtiment monopente
 * Dimensions : 40m x 20m x 8m
 */
export const largeMonoPenteTemplate: CreateBuildingConfig = {
  name: 'Grand Bâtiment Monopente',

  dimensions: {
    length: 40000,          // 40m
    width: 20000,           // 20m
    heightWall: 8000,       // 8m
    slope: 12               // 12%
  },

  parameters: {
    postSpacing: 6000,      // 6m
    purlinSpacing: 1500,    // 1.5m
    railSpacing: 1200,      // 1.2m

    postProfile: 'HEA 300',
    rafterProfile: 'IPE 330',
    purlinProfile: 'IPE 180',
    railProfile: 'UAP 100',

    steelGrade: 'S355'
  },

  finishes: {
    cladding: {
      type: CladdingType.SANDWICH_100MM,
      color: 'RAL 9002',
      thickness: 100
    },
    roofing: {
      type: RoofingType.SANDWICH_100MM,
      color: 'RAL 7016',
      thickness: 100
    }
  }
};

/**
 * Obtenir un template par nom
 */
export function getMonoPenteTemplate(
  type: 'default' | 'small' | 'large' = 'default'
): CreateBuildingConfig {
  switch (type) {
    case 'small':
      return smallMonoPenteTemplate;
    case 'large':
      return largeMonoPenteTemplate;
    case 'default':
    default:
      return defaultMonoPenteTemplate;
  }
}

/**
 * Liste de tous les templates disponibles
 */
export const allMonoPenteTemplates = {
  default: defaultMonoPenteTemplate,
  small: smallMonoPenteTemplate,
  large: largeMonoPenteTemplate
};
