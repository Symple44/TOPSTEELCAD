/**
 * Factory pour créer des matériaux Three.js
 */

import { 
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  Material,
  Color
} from '../../lib/three-exports';

export interface MaterialOptions {
  type?: 'standard' | 'physical' | 'basic';
  color?: string | number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  emissive?: string | number;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  ior?: number;
  thickness?: number;
  transmission?: number;
}

/**
 * Crée un matériau métallique standard
 */
export function createMetalMaterial(options: MaterialOptions = {}): Material {
  const {
    type = 'standard',
    color = 0x8b9dc3,
    roughness = 0.4,
    metalness = 0.9,
    opacity = 1,
    transparent = false,
    ...rest
  } = options;
  
  switch (type) {
    case 'physical':
      return new MeshPhysicalMaterial({
        color,
        roughness,
        metalness,
        opacity,
        transparent,
        clearcoat: rest.clearcoat ?? 0.1,
        clearcoatRoughness: rest.clearcoatRoughness ?? 0.1,
        ior: rest.ior ?? 1.5,
        thickness: rest.thickness ?? 0,
        transmission: rest.transmission ?? 0,
        ...rest
      });
      
    case 'basic':
      return new MeshBasicMaterial({
        color,
        opacity,
        transparent
      });
      
    case 'standard':
    default:
      return new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        opacity,
        transparent,
        emissive: rest.emissive,
        emissiveIntensity: rest.emissiveIntensity
      });
  }
}

/**
 * Matériaux prédéfinis pour l'acier
 */
export const SteelMaterials = {
  // Acier brut
  raw: () => createMetalMaterial({
    color: 0x6b7280,
    roughness: 0.7,
    metalness: 0.8
  }),
  
  // Acier galvanisé
  galvanized: () => createMetalMaterial({
    color: 0x9ca3af,
    roughness: 0.3,
    metalness: 0.95,
    type: 'physical',
    clearcoat: 0.3,
    clearcoatRoughness: 0.2
  }),
  
  // Acier peint
  painted: (color: string | number = 0x3b82f6) => createMetalMaterial({
    color,
    roughness: 0.5,
    metalness: 0.3
  }),
  
  // Acier inoxydable
  stainless: () => createMetalMaterial({
    color: 0xe5e7eb,
    roughness: 0.2,
    metalness: 1.0,
    type: 'physical',
    clearcoat: 0.5,
    clearcoatRoughness: 0.1
  }),
  
  // Acier rouillé
  rusted: () => createMetalMaterial({
    color: 0x92400e,
    roughness: 0.9,
    metalness: 0.4,
    emissive: 0x451a03,
    emissiveIntensity: 0.1
  }),
  
  // Acier poli
  polished: () => createMetalMaterial({
    color: 0xf3f4f6,
    roughness: 0.05,
    metalness: 1.0,
    type: 'physical',
    clearcoat: 0.8,
    clearcoatRoughness: 0.01
  })
};

/**
 * Matériaux pour features et annotations
 */
export const FeatureMaterials = {
  // Trou
  hole: () => createMetalMaterial({
    color: 0x1f2937,
    roughness: 0.8,
    metalness: 0.6
  }),
  
  // Soudure
  weld: () => createMetalMaterial({
    color: 0xfbbf24,
    roughness: 0.6,
    metalness: 0.7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.2
  }),
  
  // Marquage
  marking: () => createMetalMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0xdc2626,
    emissiveIntensity: 0.5
  }),
  
  // Boulon
  bolt: () => createMetalMaterial({
    color: 0x4b5563,
    roughness: 0.4,
    metalness: 0.9
  }),
  
  // Sélection
  selected: () => createMetalMaterial({
    color: 0x3b82f6,
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x2563eb,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8
  }),
  
  // Hover
  hover: () => createMetalMaterial({
    color: 0x10b981,
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x059669,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.9
  })
};

/**
 * Matériaux de ligne
 */
export const LineMaterials = {
  // Ligne de construction
  construction: () => new LineBasicMaterial({
    color: 0x6b7280,
    linewidth: 1,
    linecap: 'round',
    linejoin: 'round'
  }),
  
  // Ligne de mesure
  measurement: () => new LineBasicMaterial({
    color: 0xfbbf24,
    linewidth: 2,
    linecap: 'round',
    linejoin: 'round'
  }),
  
  // Ligne de sélection
  selection: () => new LineBasicMaterial({
    color: 0x3b82f6,
    linewidth: 3,
    linecap: 'round',
    linejoin: 'round'
  }),
  
  // Grille
  grid: () => new LineBasicMaterial({
    color: 0x374151,
    linewidth: 1,
    transparent: true,
    opacity: 0.3
  })
};

/**
 * Clone un matériau avec de nouvelles propriétés
 */
export function cloneMaterial(material: Material, props?: Partial<MaterialOptions>): Material {
  const cloned = material.clone();
  
  if (props) {
    Object.assign(cloned, props);
  }
  
  return cloned;
}

/**
 * Applique un grade d'acier à un matériau
 */
export function applySteelGrade(material: Material, grade: string): Material {
  const gradeColors = {
    'S235': 0x6b7280,
    'S275': 0x4b5563,
    'S355': 0x374151,
    'S420': 0x1f2937,
    'S460': 0x111827
  };
  
  const color = gradeColors[grade as keyof typeof gradeColors] || 0x6b7280;
  
  if (material instanceof MeshStandardMaterial || material instanceof MeshPhysicalMaterial) {
    material.color = new Color(color);
  }
  
  return material;
}