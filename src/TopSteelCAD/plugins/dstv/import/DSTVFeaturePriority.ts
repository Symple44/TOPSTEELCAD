/**
 * DSTVFeaturePriority - Système de priorité pour les features DSTV
 * 
 * Selon la norme DSTV, certains blocs ont priorité sur d'autres lors du traitement :
 * - AK (contours) définissent la forme finale et doivent être traités en premier
 * - SC (coupes simples) viennent après les contours
 * - BO (trous) sont appliqués après les modifications de forme
 * - SI (marquages) sont toujours appliqués en dernier (non-structurels)
 * 
 * Cette hiérarchie garantit que les opérations CSG sont appliquées dans le bon ordre
 * et évite les conflits géométriques.
 */

import { NormalizedFeature, NormalizedFeatureType } from './stages/DSTVNormalizationStage';

/**
 * Niveaux de priorité DSTV (plus élevé = traité en premier)
 */
export enum DSTVPriority {
  // Modifications structurelles majeures
  CONTOUR = 1000,           // AK - Contours complets et redéfinitions
  CUT_WITH_NOTCHES = 900,   // AK - Coupes avec entailles (M1002 pattern)
  BEVEL_CUT = 850,          // AK - Chanfreins de soudure
  ANGLE_CUT = 800,          // AK - Coupes d'angle
  STRAIGHT_CUT = 750,       // SC - Coupes droites
  
  // Modifications structurelles mineures
  HOLE = 500,               // BO - Trous et perçages
  SLOT = 450,               // Oblongs et rainures
  
  // Modifications non-structurelles
  MARKING = 100,            // SI - Marquages et gravures
  TEXT = 50,                // Textes
  
  // Par défaut
  DEFAULT = 0
}

/**
 * Mapping des types de features vers les priorités
 */
const FEATURE_PRIORITY_MAP = new Map<NormalizedFeatureType | string, DSTVPriority>([
  // Contours et coupes majeures
  ['contour', DSTVPriority.CONTOUR],
  ['unrestricted_contour', DSTVPriority.CONTOUR],
  ['cut_with_notches', DSTVPriority.CUT_WITH_NOTCHES],
  ['bevel_cut', DSTVPriority.BEVEL_CUT],
  ['angle_cut', DSTVPriority.ANGLE_CUT],
  ['straight_cut', DSTVPriority.STRAIGHT_CUT],
  ['cut', DSTVPriority.STRAIGHT_CUT],
  
  // Trous et perçages
  ['hole', DSTVPriority.HOLE],
  ['tapped_hole', DSTVPriority.HOLE],
  ['countersink', DSTVPriority.HOLE],
  ['counterbore', DSTVPriority.HOLE],
  ['slot', DSTVPriority.SLOT],
  
  // Marquages
  ['marking', DSTVPriority.MARKING],
  ['text', DSTVPriority.TEXT],
]);

/**
 * Informations de priorité pour une feature
 */
export interface FeaturePriorityInfo {
  feature: NormalizedFeature;
  priority: number;
  blockType: string;
  requiresCSG: boolean;
  canBatch: boolean;
}

/**
 * Gestionnaire de priorités DSTV
 */
export class DSTVFeaturePriorityManager {
  private static instance: DSTVFeaturePriorityManager;
  
  private constructor() {}
  
  static getInstance(): DSTVFeaturePriorityManager {
    if (!DSTVFeaturePriorityManager.instance) {
      DSTVFeaturePriorityManager.instance = new DSTVFeaturePriorityManager();
    }
    return DSTVFeaturePriorityManager.instance;
  }
  
  /**
   * Obtient la priorité d'une feature
   */
  getFeaturePriority(feature: NormalizedFeature): number {
    const type = feature.type as string;
    
    // Priorité explicite dans les métadonnées
    if (feature.metadata?.priority !== undefined) {
      return feature.metadata.priority as number;
    }
    
    // Priorité basée sur le type
    const priority = FEATURE_PRIORITY_MAP.get(type);
    if (priority !== undefined) {
      return priority;
    }
    
    // Détection par pattern pour les types composés
    if (type.includes('contour')) {
      return DSTVPriority.CONTOUR;
    }
    if (type.includes('cut')) {
      if (type.includes('notch')) {
        return DSTVPriority.CUT_WITH_NOTCHES;
      }
      if (type.includes('bevel')) {
        return DSTVPriority.BEVEL_CUT;
      }
      if (type.includes('angle')) {
        return DSTVPriority.ANGLE_CUT;
      }
      return DSTVPriority.STRAIGHT_CUT;
    }
    if (type.includes('hole') || type.includes('drill')) {
      return DSTVPriority.HOLE;
    }
    if (type.includes('mark') || type.includes('text')) {
      return DSTVPriority.MARKING;
    }
    
    return DSTVPriority.DEFAULT;
  }
  
  /**
   * Trie les features par priorité DSTV
   */
  sortFeaturesByPriority(features: NormalizedFeature[]): NormalizedFeature[] {
    return [...features].sort((a, b) => {
      const priorityA = this.getFeaturePriority(a);
      const priorityB = this.getFeaturePriority(b);
      
      // Tri décroissant (priorité élevée en premier)
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // Si même priorité, garder l'ordre d'origine (stable sort)
      const indexA = features.indexOf(a);
      const indexB = features.indexOf(b);
      return indexA - indexB;
    });
  }
  
  /**
   * Groupe les features par priorité pour traitement par batch
   */
  groupFeaturesByPriority(features: NormalizedFeature[]): Map<number, NormalizedFeature[]> {
    const groups = new Map<number, NormalizedFeature[]>();
    
    for (const feature of features) {
      const priority = this.getFeaturePriority(feature);
      
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      
      groups.get(priority)!.push(feature);
    }
    
    // Trier les clés par priorité décroissante
    const sortedGroups = new Map(
      [...groups.entries()].sort((a, b) => b[0] - a[0])
    );
    
    return sortedGroups;
  }
  
  /**
   * Obtient des informations détaillées sur la priorité d'une feature
   */
  getFeaturePriorityInfo(feature: NormalizedFeature): FeaturePriorityInfo {
    const priority = this.getFeaturePriority(feature);
    const type = feature.type as string;
    
    // Déterminer le type de bloc DSTV d'origine
    let blockType = 'UNKNOWN';
    if (feature.metadata?.sourceBlock) {
      blockType = feature.metadata.sourceBlock as string;
    } else if (type.includes('contour') || type.includes('cut')) {
      blockType = 'AK';
    } else if (type.includes('hole')) {
      blockType = 'BO';
    } else if (type.includes('mark') || type.includes('text')) {
      blockType = 'SI';
    }
    
    // Déterminer si CSG est requis
    const requiresCSG = priority >= DSTVPriority.HOLE;
    
    // Déterminer si peut être traité par batch
    const canBatch = priority === DSTVPriority.HOLE || priority === DSTVPriority.MARKING;
    
    return {
      feature,
      priority,
      blockType,
      requiresCSG,
      canBatch
    };
  }
  
  /**
   * Valide l'ordre des features selon les règles DSTV
   */
  validateFeatureOrder(features: NormalizedFeature[]): { 
    valid: boolean; 
    errors: string[]; 
    warnings: string[] 
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let lastPriority = Infinity;
    let valid = true;
    
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const priority = this.getFeaturePriority(feature);
      
      if (priority > lastPriority) {
        const msg = `Feature ${feature.id} (type: ${feature.type}, priority: ${priority}) appears after lower priority feature (priority: ${lastPriority})`;
        warnings.push(msg);
        
        // C'est un avertissement, pas une erreur fatale
        // car l'ordre peut être ajusté automatiquement
      }
      
      // Vérifications spécifiques DSTV
      if (feature.type === 'marking' && priority > DSTVPriority.HOLE) {
        errors.push(`Marking ${feature.id} has incorrect priority ${priority}, should be ${DSTVPriority.MARKING}`);
        valid = false;
      }
      
      lastPriority = priority;
    }
    
    return { valid, errors, warnings };
  }
  
  /**
   * Optimise l'ordre des features pour les performances CSG
   */
  optimizeFeatureOrder(features: NormalizedFeature[]): NormalizedFeature[] {
    // D'abord trier par priorité DSTV
    const sorted = this.sortFeaturesByPriority(features);
    
    // Ensuite optimiser au sein de chaque groupe de priorité
    const optimized: NormalizedFeature[] = [];
    const groups = this.groupFeaturesByPriority(sorted);
    
    for (const [priority, groupFeatures] of groups) {
      if (priority === DSTVPriority.HOLE) {
        // Grouper les trous par face pour minimiser les changements de contexte
        const byFace = new Map<string, NormalizedFeature[]>();
        
        for (const feature of groupFeatures) {
          const face = (feature.parameters?.face || 'default') as string;
          if (!byFace.has(face)) {
            byFace.set(face, []);
          }
          byFace.get(face)!.push(feature);
        }
        
        // Ajouter par groupe de face
        for (const faceFeatures of byFace.values()) {
          optimized.push(...faceFeatures);
        }
      } else {
        // Pour les autres types, garder l'ordre de priorité simple
        optimized.push(...groupFeatures);
      }
    }
    
    return optimized;
  }
  
  /**
   * Affiche un rapport de priorité pour debug
   */
  generatePriorityReport(features: NormalizedFeature[]): string {
    const lines: string[] = [];
    lines.push('=== DSTV Feature Priority Report ===');
    lines.push(`Total features: ${features.length}`);
    lines.push('');
    
    const groups = this.groupFeaturesByPriority(features);
    
    for (const [priority, groupFeatures] of groups) {
      const priorityName = this.getPriorityName(priority);
      lines.push(`Priority ${priority} (${priorityName}): ${groupFeatures.length} features`);
      
      for (const feature of groupFeatures) {
        const info = this.getFeaturePriorityInfo(feature);
        lines.push(`  - ${feature.id}: type=${feature.type}, block=${info.blockType}, CSG=${info.requiresCSG}`);
      }
    }
    
    // Validation
    const validation = this.validateFeatureOrder(features);
    if (validation.errors.length > 0) {
      lines.push('');
      lines.push('ERRORS:');
      validation.errors.forEach(e => lines.push(`  ❌ ${e}`));
    }
    
    if (validation.warnings.length > 0) {
      lines.push('');
      lines.push('WARNINGS:');
      validation.warnings.forEach(w => lines.push(`  ⚠️ ${w}`));
    }
    
    return lines.join('\n');
  }
  
  /**
   * Obtient le nom lisible d'une priorité
   */
  private getPriorityName(priority: number): string {
    for (const [name, value] of Object.entries(DSTVPriority)) {
      if (value === priority) {
        return name;
      }
    }
    return 'CUSTOM';
  }
}

// Export singleton
export const dstvFeaturePriority = DSTVFeaturePriorityManager.getInstance();