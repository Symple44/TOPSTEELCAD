/**
 * Service centralisé pour la gestion des types de profils
 *
 * Ce service fournit :
 * - Normalisation des noms de profils (anciens → nouveaux)
 * - Mapping vers MaterialType pour le viewer 3D
 * - Métadonnées sur les profils (préfixes, descriptions, etc.)
 * - Validation et conversion des types
 */

import { ProfileType } from '../../3DLibrary/types/profile.types';
import { MaterialType } from '../../../types/viewer';

/**
 * Métadonnées pour chaque type de profil
 */
export interface ProfileTypeMetadata {
  /** Type officiel dans ProfileType enum */
  type: ProfileType;

  /** Nom d'affichage convivial */
  displayName: string;

  /** Description du profil */
  description: string;

  /** Préfixe utilisé dans les désignations (ex: "IPE", "TR", "TC") */
  designationPrefix: string;

  /** Catégorie pour regroupement UI */
  category: 'I-Beams' | 'U-Channels' | 'Angles' | 'Tubes' | 'Bars' | 'Plates' | 'T-Profiles' | 'Cold-Formed' | 'Special';

  /** MaterialType correspondant pour le viewer 3D */
  materialType: MaterialType;

  /** Anciens noms/alias acceptés (pour rétrocompatibilité) */
  aliases: string[];
}

/**
 * Registry complet de tous les types de profils avec leurs métadonnées
 */
const PROFILE_REGISTRY: ProfileTypeMetadata[] = [
  // ==================== PROFILS EN I ====================
  {
    type: ProfileType.IPE,
    displayName: 'IPE',
    description: 'Poutrelles européennes à ailes parallèles',
    designationPrefix: 'IPE',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['IPE']
  },
  {
    type: ProfileType.HEA,
    displayName: 'HEA',
    description: 'Poutrelles H européennes légères',
    designationPrefix: 'HEA',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['HEA']
  },
  {
    type: ProfileType.HEB,
    displayName: 'HEB',
    description: 'Poutrelles H européennes moyennes',
    designationPrefix: 'HEB',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['HEB']
  },
  {
    type: ProfileType.HEM,
    displayName: 'HEM',
    description: 'Poutrelles H européennes lourdes',
    designationPrefix: 'HEM',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['HEM']
  },
  {
    type: ProfileType.W,
    displayName: 'W',
    description: 'Poutrelles américaines AISC W-Shape',
    designationPrefix: 'W',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['W', 'W_SHAPE']
  },
  {
    type: ProfileType.S,
    displayName: 'S',
    description: 'Poutrelles américaines AISC S-Shape',
    designationPrefix: 'S',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['S', 'S_SHAPE']
  },
  {
    type: ProfileType.HP,
    displayName: 'HP',
    description: 'Profilés américains AISC HP (pieux)',
    designationPrefix: 'HP',
    category: 'I-Beams',
    materialType: MaterialType.BEAM,
    aliases: ['HP', 'HP_SHAPE']
  },

  // ==================== PROFILS EN U ====================
  {
    type: ProfileType.UPN,
    displayName: 'UPN',
    description: 'Profilés U normaux européens',
    designationPrefix: 'UPN',
    category: 'U-Channels',
    materialType: MaterialType.CHANNEL,
    aliases: ['UPN']
  },
  {
    type: ProfileType.UAP,
    displayName: 'UAP',
    description: 'Profilés U à ailes parallèles',
    designationPrefix: 'UAP',
    category: 'U-Channels',
    materialType: MaterialType.CHANNEL,
    aliases: ['UAP']
  },
  {
    type: ProfileType.UPE,
    displayName: 'UPE',
    description: 'Profilés U européens à ailes parallèles',
    designationPrefix: 'UPE',
    category: 'U-Channels',
    materialType: MaterialType.CHANNEL,
    aliases: ['UPE']
  },
  {
    type: ProfileType.C,
    displayName: 'C',
    description: 'Profilés en C formés à froid',
    designationPrefix: 'C',
    category: 'Cold-Formed',
    materialType: MaterialType.CHANNEL,
    aliases: ['C', 'C_PROFILE']
  },

  // ==================== CORNIÈRES ====================
  {
    type: ProfileType.L,
    displayName: 'L égales',
    description: 'Cornières à ailes égales',
    designationPrefix: 'L',
    category: 'Angles',
    materialType: MaterialType.ANGLE,
    aliases: ['L', 'L_EQUAL', 'CORNIERE', 'ANGLE']
  },
  {
    type: ProfileType.LA,
    displayName: 'LA inégales',
    description: 'Cornières à ailes inégales',
    designationPrefix: 'LA',
    category: 'Angles',
    materialType: MaterialType.ANGLE,
    aliases: ['LA', 'L_UNEQUAL', 'UNEQUAL_ANGLE']
  },

  // ==================== PROFILS EN T ====================
  {
    type: ProfileType.T,
    displayName: 'T',
    description: 'Profilés en T',
    designationPrefix: 'T',
    category: 'T-Profiles',
    materialType: MaterialType.TEE,
    aliases: ['T', 'T_PROFILE', 'TEE']
  },

  // ==================== TUBES ====================
  {
    type: ProfileType.CHS,
    displayName: 'CHS',
    description: 'Tubes circulaires creux (Circular Hollow Section)',
    designationPrefix: 'CHS',
    category: 'Tubes',
    materialType: MaterialType.TUBE,
    aliases: [
      'CHS',
      'TUBE_CIRCULAR',
      'TUBE_ROUND',
      'TUBE_ROND',
      'TUBES_ROND' // Ancien nom de PartDataTable
    ]
  },
  {
    type: ProfileType.SHS,
    displayName: 'SHS',
    description: 'Tubes carrés creux (Square Hollow Section)',
    designationPrefix: 'SHS',
    category: 'Tubes',
    materialType: MaterialType.TUBE,
    aliases: [
      'SHS',
      'TUBE_SQUARE',
      'TUBES_CARRE' // Ancien nom de PartDataTable
    ]
  },
  {
    type: ProfileType.RHS,
    displayName: 'RHS',
    description: 'Tubes rectangulaires creux (Rectangular Hollow Section)',
    designationPrefix: 'RHS',
    category: 'Tubes',
    materialType: MaterialType.TUBE,
    aliases: [
      'RHS',
      'TUBE_RECTANGULAR',
      'TUBE_RECT',
      'TUBES_RECT' // Ancien nom de PartDataTable
    ]
  },

  // ==================== BARRES ====================
  {
    type: ProfileType.ROUND_BAR,
    displayName: 'Barre ronde',
    description: 'Barres rondes pleines',
    designationPrefix: 'Ø',
    category: 'Bars',
    materialType: MaterialType.BAR,
    aliases: ['ROUND_BAR', 'ROND', 'ROUND']
  },
  {
    type: ProfileType.SQUARE_BAR,
    displayName: 'Barre carrée',
    description: 'Barres carrées pleines',
    designationPrefix: '□',
    category: 'Bars',
    materialType: MaterialType.BAR,
    aliases: ['SQUARE_BAR', 'CARRE', 'SQUARE']
  },

  // ==================== PLATS ====================
  {
    type: ProfileType.FLAT,
    displayName: 'Plat',
    description: 'Plats et bandes',
    designationPrefix: 'PLAT',
    category: 'Plates',
    materialType: MaterialType.PLATE,
    aliases: ['FLAT', 'PLAT']
  },
  {
    type: ProfileType.PLATE,
    displayName: 'Tôle',
    description: 'Plaques et tôles',
    designationPrefix: 'TOLE',
    category: 'Plates',
    materialType: MaterialType.PLATE,
    aliases: ['PLATE', 'TOLE']
  },

  // ==================== PROFILS FORMÉS À FROID ====================
  {
    type: ProfileType.Z,
    displayName: 'Z',
    description: 'Profilés en Z formés à froid',
    designationPrefix: 'Z',
    category: 'Cold-Formed',
    materialType: MaterialType.CHANNEL,
    aliases: ['Z', 'Z_PROFILE']
  },
  {
    type: ProfileType.SIGMA,
    displayName: 'Sigma',
    description: 'Profilés Sigma formés à froid',
    designationPrefix: 'Σ',
    category: 'Cold-Formed',
    materialType: MaterialType.CHANNEL,
    aliases: ['SIGMA', 'SIGMA_PROFILE']
  },
  {
    type: ProfileType.OMEGA,
    displayName: 'Omega',
    description: 'Profilés Omega formés à froid',
    designationPrefix: 'Ω',
    category: 'Cold-Formed',
    materialType: MaterialType.CHANNEL,
    aliases: ['OMEGA', 'OMEGA_PROFILE']
  },

  // ==================== SPÉCIAUX ====================
  {
    type: ProfileType.FASTENER,
    displayName: 'Fixation',
    description: 'Éléments de fixation',
    designationPrefix: '',
    category: 'Special',
    materialType: MaterialType.PLATE,
    aliases: ['FASTENER']
  },
  {
    type: ProfileType.WELD,
    displayName: 'Soudure',
    description: 'Cordons de soudure',
    designationPrefix: '',
    category: 'Special',
    materialType: MaterialType.PLATE,
    aliases: ['WELD']
  }
];

/**
 * Service de gestion des types de profils
 */
export class ProfileTypeService {
  private static metadataMap: Map<ProfileType, ProfileTypeMetadata> = new Map();
  private static aliasMap: Map<string, ProfileTypeMetadata> = new Map();

  /**
   * Initialisation du service
   */
  static {
    // Construire les maps pour un accès rapide
    for (const metadata of PROFILE_REGISTRY) {
      this.metadataMap.set(metadata.type, metadata);

      // Enregistrer tous les alias
      for (const alias of metadata.aliases) {
        this.aliasMap.set(alias.toUpperCase(), metadata);
      }
    }
  }

  /**
   * Normalise un nom de profil vers le ProfileType officiel
   * @param profileName Nom du profil (peut être un alias)
   * @returns ProfileType normalisé
   */
  static normalize(profileName: string): ProfileType {
    const normalized = profileName.toUpperCase().trim();
    const metadata = this.aliasMap.get(normalized);

    if (metadata) {
      return metadata.type;
    }

    // Fallback sur IPE si non trouvé
    console.warn(`⚠️ Profile type "${profileName}" not found, defaulting to IPE`);
    return ProfileType.IPE;
  }

  /**
   * Obtient les métadonnées d'un type de profil
   */
  static getMetadata(profileType: ProfileType | string): ProfileTypeMetadata | undefined {
    // Si c'est une string, normaliser d'abord
    if (typeof profileType === 'string') {
      const normalized = this.normalize(profileType);
      return this.metadataMap.get(normalized);
    }
    return this.metadataMap.get(profileType);
  }

  /**
   * Convertit un ProfileType vers MaterialType pour le viewer 3D
   */
  static toMaterialType(profileType: ProfileType | string): MaterialType {
    const metadata = this.getMetadata(profileType);
    return metadata?.materialType || MaterialType.BEAM;
  }

  /**
   * Obtient le préfixe de désignation d'un profil
   * Exemple: "TR" pour TUBE_RECTANGULAR, "IPE" pour IPE
   */
  static getDesignationPrefix(profileType: ProfileType | string): string {
    const metadata = this.getMetadata(profileType);
    return metadata?.designationPrefix || '';
  }

  /**
   * Extrait le sous-type d'une désignation complète
   * Exemple: "TR 40x20x2" → "40x20x2", "IPE 200" → "200"
   */
  static extractSubType(designation: string, profileType: ProfileType | string): string {
    const prefix = this.getDesignationPrefix(profileType);
    if (!prefix) return designation;

    // Retirer le préfixe et les espaces
    return designation
      .replace(new RegExp(`^${prefix}\\s*`, 'i'), '')
      .trim();
  }

  /**
   * Construit une désignation complète à partir d'un type et sous-type
   * Exemple: (TUBE_RECTANGULAR, "40x20x2") → "TR 40x20x2"
   */
  static buildDesignation(profileType: ProfileType | string, subType: string): string {
    const prefix = this.getDesignationPrefix(profileType);
    if (!prefix) return subType;
    return `${prefix} ${subType}`;
  }

  /**
   * Obtient tous les profils d'une catégorie
   */
  static getByCategory(category: ProfileTypeMetadata['category']): ProfileTypeMetadata[] {
    return PROFILE_REGISTRY.filter(m => m.category === category);
  }

  /**
   * Obtient tous les profils pour l'UI (groupés par catégorie)
   */
  static getAllGroupedByCategory(): Record<string, ProfileTypeMetadata[]> {
    const grouped: Record<string, ProfileTypeMetadata[]> = {};

    for (const metadata of PROFILE_REGISTRY) {
      if (!grouped[metadata.category]) {
        grouped[metadata.category] = [];
      }
      grouped[metadata.category].push(metadata);
    }

    return grouped;
  }

  /**
   * Vérifie si un nom de profil est valide
   */
  static isValid(profileName: string): boolean {
    const normalized = profileName.toUpperCase().trim();
    return this.aliasMap.has(normalized);
  }

  /**
   * Obtient la liste de tous les ProfileType disponibles
   */
  static getAllTypes(): ProfileType[] {
    return Array.from(this.metadataMap.keys());
  }

  /**
   * Obtient la liste de toutes les métadonnées
   */
  static getAllMetadata(): ProfileTypeMetadata[] {
    return PROFILE_REGISTRY;
  }
}
