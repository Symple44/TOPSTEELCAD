/**
 * FeatureProcessorFactory - Factory avec pattern Registry
 * Gère l'enregistrement et la création des processors de features
 */

import * as THREE from 'three';
import { Feature, FeatureType, IFeatureProcessor, ProcessorResult } from '../types';
import { PivotElement } from '@/types/viewer';

// Import des processors existants
import { HoleProcessor } from './HoleProcessor';
import { CutProcessor } from './CutProcessor';
import { CutProcessorMigrated } from './CutProcessorMigrated'; // Nouveau processor modulaire
import { ChamferProcessor } from './ChamferProcessor';
import { WeldProcessor } from './WeldProcessor';
import { MarkingProcessor } from './MarkingProcessor';
import { SlotProcessor } from './SlotProcessor';
import { NotchProcessor } from './NotchProcessor';
import { CutoutProcessor } from './CutoutProcessor';
import { BevelProcessor } from './BevelProcessor';
import { CopingProcessor } from './CopingProcessor';
import { ContourProcessor } from './ContourProcessor';
import { DrillPatternProcessor } from './DrillPatternProcessor';
import { CounterSinkProcessor } from './CounterSinkProcessor';
import { TappedHoleProcessor } from './TappedHoleProcessor';
import { TextProcessor } from './TextProcessor';
import { ThreadingProcessor } from './ThreadingProcessor';
import { BendingProcessor } from './BendingProcessor';
import { ProfileProcessor } from './ProfileProcessor';
import { UnrestrictedContourProcessor } from './UnrestrictedContourProcessor';
import {
  VolumeProcessor,
  NumericControlProcessor,
  FreeProgramProcessor,
  LineProgramProcessor,
  RotationProcessor,
  WashingProcessor,
  GroupProcessor,
  VariableProcessor
} from './GenericProcessor';

/**
 * Singleton Factory pour les processors de features
 * Utilise le pattern Registry pour l'enregistrement dynamique
 */
export class FeatureProcessorFactory {
  private static instance: FeatureProcessorFactory;
  private processors: Map<FeatureType, IFeatureProcessor>;
  private processorCache: Map<string, IFeatureProcessor>;
  private useNewCutArchitecture: boolean = true; // NOUVEAU SYSTÈME ACTIVÉ PAR DÉFAUT
  
  private constructor() {
    this.processors = new Map();
    this.processorCache = new Map();
    this.registerDefaultProcessors();
  }
  
  /**
   * Obtient l'instance unique de la factory
   */
  static getInstance(): FeatureProcessorFactory {
    if (!FeatureProcessorFactory.instance) {
      FeatureProcessorFactory.instance = new FeatureProcessorFactory();
    }
    return FeatureProcessorFactory.instance;
  }
  
  /**
   * Enregistre un processor pour un type de feature
   */
  register(type: FeatureType, processor: IFeatureProcessor): void {
    this.processors.set(type, processor);
    // Invalider le cache pour ce type
    this.processorCache.delete(type);
  }
  
  /**
   * Désenregistre un processor
   */
  unregister(type: FeatureType): void {
    this.processors.delete(type);
    this.processorCache.delete(type);
  }
  
  /**
   * Obtient un processor pour un type de feature
   */
  getProcessor(type: FeatureType): IFeatureProcessor | null {
    // Vérifier le cache d'abord
    if (this.processorCache.has(type)) {
      return this.processorCache.get(type)!;
    }
    
    // Obtenir le processor du registre
    const processor = this.processors.get(type);
    if (processor) {
      // Mettre en cache pour les prochaines utilisations
      this.processorCache.set(type, processor);
      return processor;
    }
    
    return null;
  }
  
  /**
   * Vérifie si un processor existe pour un type
   */
  hasProcessor(type: FeatureType): boolean {
    return this.processors.has(type);
  }
  
  /**
   * Obtient tous les types de features supportés
   */
  getSupportedTypes(): FeatureType[] {
    return Array.from(this.processors.keys());
  }
  
  /**
   * Traite une feature avec le processor approprié
   */
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`🏭 FeatureProcessorFactory.process called for type: ${feature.type}, id: ${feature.id}`);
    
    const processor = this.getProcessor(feature.type);
    
    if (!processor) {
      console.error(`❌ No processor registered for feature type: ${feature.type}`);
      return {
        success: false,
        error: `No processor registered for feature type: ${feature.type}`
      };
    }
    
    console.log(`✅ Found processor for ${feature.type}, calling process...`);
    
    try {
      return processor.process(geometry, feature, element);
    } catch (error) {
      console.error(`❌ Processor threw error:`, error);
      return {
        success: false,
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Traite plusieurs features en batch
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    features: Feature[],
    element: PivotElement
  ): ProcessorResult[] {
    const results: ProcessorResult[] = [];
    let currentGeometry = geometry;
    
    for (const feature of features) {
      const result = this.process(currentGeometry, feature, element);
      results.push(result);
      
      // Si le traitement a réussi et a produit une nouvelle géométrie
      if (result.success && result.geometry) {
        // Disposer l'ancienne géométrie si ce n'est pas l'originale
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return results;
  }
  
  /**
   * Valide une feature avec le processor approprié
   */
  validate(feature: Feature, element: PivotElement): string[] {
    const processor = this.getProcessor(feature.type);
    
    if (!processor) {
      return [`No processor registered for feature type: ${feature.type}`];
    }
    
    return processor.validateFeature(feature, element);
  }
  
  /**
   * Enregistre tous les processors par défaut
   */
  private registerDefaultProcessors(): void {
    // Processors de base
    this.register(FeatureType.HOLE, new HoleProcessor());
    this.register(FeatureType.CHAMFER, new ChamferProcessor());
    this.register(FeatureType.WELD, new WeldProcessor());
    this.register(FeatureType.MARKING, new MarkingProcessor());
    
    // Utiliser la nouvelle architecture avec CSG désactivé pour test
    const cutProcessor = this.useNewCutArchitecture ? 
      new CutProcessorMigrated() : 
      new CutProcessor();
    
    this.register(FeatureType.CUT, cutProcessor);
    this.register(FeatureType.END_CUT, cutProcessor);  // Utiliser le même processor pour les coupes d'extrémité
    this.register(FeatureType.CUTOUT, new CutoutProcessor());
    this.register(FeatureType.NOTCH, new NotchProcessor());
    this.register(FeatureType.SLOT, new SlotProcessor());
    this.register(FeatureType.COPING, new CopingProcessor());
    
    // Processors de forme
    this.register(FeatureType.BEVEL, new BevelProcessor());
    this.register(FeatureType.CONTOUR, new ContourProcessor());
    
    // Processors spécialisés
    this.register(FeatureType.DRILL_PATTERN, new DrillPatternProcessor());
    this.register(FeatureType.COUNTERSINK, new CounterSinkProcessor());
    this.register(FeatureType.TAPPED_HOLE, new TappedHoleProcessor());
    this.register(FeatureType.TEXT, new TextProcessor());
    
    // Nouveaux processors DSTV
    this.register(FeatureType.THREAD, new ThreadingProcessor());
    this.register(FeatureType.BEND, new BendingProcessor());
    this.register(FeatureType.PROFILE, new ProfileProcessor());
    this.register(FeatureType.UNRESTRICTED_CONTOUR, new UnrestrictedContourProcessor());
    
    // Processors DSTV avancés pour 100% de conformité
    this.register(FeatureType.VOLUME, new VolumeProcessor());
    this.register(FeatureType.NUMERIC_CONTROL, new NumericControlProcessor());
    this.register(FeatureType.FREE_PROGRAM, new FreeProgramProcessor());
    this.register(FeatureType.LINE_PROGRAM, new LineProgramProcessor());
    this.register(FeatureType.ROTATION, new RotationProcessor());
    this.register(FeatureType.WASHING, new WashingProcessor());
    this.register(FeatureType.GROUP, new GroupProcessor());
    this.register(FeatureType.VARIABLE, new VariableProcessor());
    
    // Note: CutProcessor est maintenant mappé sur CUTOUT
    // Car "cut" n'est pas dans l'enum FeatureType
  }
  
  /**
   * Active/désactive la nouvelle architecture de coupe
   */
  setUseNewCutArchitecture(useNew: boolean): void {
    this.useNewCutArchitecture = useNew;
    // Ré-enregistrer les processors avec la nouvelle configuration
    this.processorCache.clear();
    this.registerDefaultProcessors();
    console.log(`🔄 Cut architecture switched to: ${useNew ? 'NEW (modular)' : 'LEGACY (monolithic)'}`);
  }
  
  /**
   * Obtient l'état de l'architecture de coupe
   */
  isUsingNewCutArchitecture(): boolean {
    return this.useNewCutArchitecture;
  }
  
  /**
   * Réinitialise la factory
   */
  reset(): void {
    this.processors.clear();
    this.processorCache.clear();
    this.registerDefaultProcessors();
  }
  
  /**
   * Obtient des statistiques sur les processors
   */
  getStatistics(): {
    registeredCount: number;
    cachedCount: number;
    supportedTypes: string[];
  } {
    return {
      registeredCount: this.processors.size,
      cachedCount: this.processorCache.size,
      supportedTypes: this.getSupportedTypes()
    };
  }
  
  /**
   * Clone un processor existant avec de nouveaux paramètres
   */
  cloneProcessor(type: FeatureType): IFeatureProcessor | null {
    const processor = this.getProcessor(type);
    if (!processor) return null;
    
    // Créer une nouvelle instance du même type
    const ProcessorClass = processor.constructor as new() => IFeatureProcessor;
    return new ProcessorClass();
  }
  
  /**
   * Dispose tous les processors pour libérer les ressources
   */
  dispose(): void {
    this.processors.forEach(processor => {
      if (processor.dispose) {
        processor.dispose();
      }
    });
    this.processors.clear();
    this.processorCache.clear();
  }
}

// Export d'une instance par défaut pour faciliter l'utilisation
export const featureProcessorFactory = FeatureProcessorFactory.getInstance();