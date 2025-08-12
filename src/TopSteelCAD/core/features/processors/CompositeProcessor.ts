/**
 * Processeur pour features composées
 * Permet de combiner plusieurs features en une seule opération complexe
 */

import * as THREE from 'three';
import { IFeatureProcessor, Feature, ProcessorResult, FeatureType } from '../types';
import { PivotElement } from '@/types/viewer';
import { HoleProcessor } from './HoleProcessor';
import { SlotProcessor } from './SlotProcessor';
import { ContourProcessor } from './ContourProcessor';
import { ChamferProcessor } from './ChamferProcessor';
import { TappedHoleProcessor } from './TappedHoleProcessor';
import { CounterSinkProcessor } from './CounterSinkProcessor';

/**
 * Types de features composées prédéfinies
 */
export enum CompositeFeatureType {
  // Trou avec fraisage et chanfrein
  COUNTERSUNK_TAPPED_HOLE = 'countersunk_tapped_hole',
  
  // Découpe avec arrondis et chanfreins
  ROUNDED_CUTOUT = 'rounded_cutout',
  
  // Motif de trous avec oblongs aux extrémités
  SLOTTED_HOLE_PATTERN = 'slotted_hole_pattern',
  
  // Contour avec trous de fixation
  MOUNTING_PLATE = 'mounting_plate',
  
  // Découpe en T avec trous
  T_SLOT = 't_slot',
  
  // Custom - défini par l'utilisateur
  CUSTOM = 'custom'
}

/**
 * Définition d'une feature composée
 */
export interface CompositeFeature extends Feature {
  compositeType: CompositeFeatureType;
  subFeatures: Feature[];
  sequence?: 'parallel' | 'sequential';
  dependencies?: Map<string, string[]>; // ID feature -> IDs dépendances
}

/**
 * Processeur pour features composées
 */
export class CompositeProcessor implements IFeatureProcessor {
  private processors: Map<FeatureType, IFeatureProcessor>;
  
  constructor() {
    
    // Initialiser les processeurs pour sous-features
    this.processors = new Map();
    this.processors.set(FeatureType.HOLE, new HoleProcessor());
    this.processors.set(FeatureType.TAPPED_HOLE, new TappedHoleProcessor());
    this.processors.set(FeatureType.COUNTERSINK, new CounterSinkProcessor());
    this.processors.set(FeatureType.SLOT, new SlotProcessor());
    this.processors.set(FeatureType.CONTOUR, new ContourProcessor());
    this.processors.set(FeatureType.CHAMFER, new ChamferProcessor());
  }
  
  /**
   * Traite une feature composée
   */
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    const compositeFeature = feature as CompositeFeature;
    
    if (!compositeFeature.subFeatures || compositeFeature.subFeatures.length === 0) {
      return {
        success: false,
        error: 'Feature composée sans sous-features'
      };
    }
    
    // Traiter selon le type
    switch (compositeFeature.compositeType) {
      case CompositeFeatureType.COUNTERSUNK_TAPPED_HOLE:
        return this.processCountersunkTappedHole(geometry, compositeFeature, element);
        
      case CompositeFeatureType.ROUNDED_CUTOUT:
        return this.processRoundedCutout(geometry, compositeFeature, element);
        
      case CompositeFeatureType.SLOTTED_HOLE_PATTERN:
        return this.processSlottedHolePattern(geometry, compositeFeature, element);
        
      case CompositeFeatureType.MOUNTING_PLATE:
        return this.processMountingPlate(geometry, compositeFeature, element);
        
      case CompositeFeatureType.T_SLOT:
        return this.processTSlot(geometry, compositeFeature, element);
        
      case CompositeFeatureType.CUSTOM:
      default:
        return this.processCustomComposite(geometry, compositeFeature, element);
    }
  }
  
  /**
   * Traite un trou taraudé avec fraisage
   */
  private processCountersunkTappedHole(
    geometry: THREE.BufferGeometry,
    feature: CompositeFeature,
    element: PivotElement
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Ordre: 1. Fraisage, 2. Trou taraudé
    const orderedFeatures = this.orderFeatures(feature.subFeatures, [
      FeatureType.COUNTERSINK,
      FeatureType.TAPPED_HOLE
    ]);
    
    for (const subFeature of orderedFeatures) {
      const processor = this.processors.get(subFeature.type);
      if (!processor) {
        return {
          success: false,
          error: `Processeur non trouvé pour ${subFeature.type}`
        };
      }
      
      const result = processor.process(currentGeometry, subFeature, element);
      if (!result.success) {
        return result;
      }
      
      if (result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return {
      success: true,
      geometry: currentGeometry
    };
  }
  
  /**
   * Traite une découpe avec arrondis
   */
  private processRoundedCutout(
    geometry: THREE.BufferGeometry,
    feature: CompositeFeature,
    element: PivotElement
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Créer le contour principal avec arrondis
    const contourFeature = feature.subFeatures.find(f => f.type === FeatureType.CONTOUR);
    if (!contourFeature) {
      return {
        success: false,
        error: 'Contour manquant pour découpe arrondie'
      };
    }
    
    // Ajouter les arrondis aux coins
    this.addRoundedCorners(contourFeature);
    
    // Appliquer le contour
    const processor = this.processors.get(FeatureType.CONTOUR);
    if (!processor) {
      return {
        success: false,
        error: 'Processeur de contour non disponible'
      };
    }
    
    return processor.process(currentGeometry, contourFeature, element);
  }
  
  /**
   * Traite un motif avec oblongs aux extrémités
   */
  private processSlottedHolePattern(
    geometry: THREE.BufferGeometry,
    feature: CompositeFeature,
    element: PivotElement
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Séparer les trous et les oblongs
    const holes = feature.subFeatures.filter(f => f.type === FeatureType.HOLE);
    const slots = feature.subFeatures.filter(f => f.type === FeatureType.SLOT);
    
    // Appliquer d'abord les oblongs (plus grands)
    for (const slot of slots) {
      const processor = this.processors.get(FeatureType.SLOT);
      if (!processor) continue;
      
      const result = processor.process(currentGeometry, slot, element);
      if (result.success && result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    // Puis les trous
    for (const hole of holes) {
      const processor = this.processors.get(FeatureType.HOLE);
      if (!processor) continue;
      
      const result = processor.process(currentGeometry, hole, element);
      if (result.success && result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return {
      success: true,
      geometry: currentGeometry
    };
  }
  
  /**
   * Traite une plaque de montage (contour + trous)
   */
  private processMountingPlate(
    geometry: THREE.BufferGeometry,
    feature: CompositeFeature,
    element: PivotElement
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Ordre: 1. Contour externe, 2. Trous de montage
    const contours = feature.subFeatures.filter(f => f.type === FeatureType.CONTOUR);
    const holes = feature.subFeatures.filter(f => f.type === FeatureType.HOLE);
    
    // Appliquer le contour
    for (const contour of contours) {
      const processor = this.processors.get(FeatureType.CONTOUR);
      if (!processor) continue;
      
      const result = processor.process(currentGeometry, contour, element);
      if (result.success && result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    // Appliquer les trous
    for (const hole of holes) {
      const processor = this.processors.get(FeatureType.HOLE);
      if (!processor) continue;
      
      const result = processor.process(currentGeometry, hole, element);
      if (result.success && result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return {
      success: true,
      geometry: currentGeometry
    };
  }
  
  /**
   * Traite une découpe en T
   */
  private processTSlot(
    geometry: THREE.BufferGeometry,
    feature: CompositeFeature,
    element: PivotElement
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Créer la forme en T à partir des sous-features
    const slots = feature.subFeatures.filter(f => f.type === FeatureType.SLOT);
    
    if (slots.length < 2) {
      return {
        success: false,
        error: 'Découpe en T nécessite au moins 2 oblongs'
      };
    }
    
    // Positionner les oblongs en T
    this.arrangeTShape(slots);
    
    // Appliquer les oblongs
    for (const slot of slots) {
      const processor = this.processors.get(FeatureType.SLOT);
      if (!processor) continue;
      
      const result = processor.process(currentGeometry, slot, element);
      if (result.success && result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return {
      success: true,
      geometry: currentGeometry
    };
  }
  
  /**
   * Traite une feature composée custom
   */
  private processCustomComposite(
    geometry: THREE.BufferGeometry,
    feature: CompositeFeature,
    element: PivotElement
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Traiter selon la séquence définie
    const sequence = feature.sequence || 'sequential';
    
    if (sequence === 'parallel') {
      // Traiter toutes les features en parallèle (batch)
      return this.processParallel(currentGeometry, feature.subFeatures, element);
    } else {
      // Traiter séquentiellement avec respect des dépendances
      return this.processSequential(currentGeometry, feature.subFeatures, element, feature.dependencies);
    }
  }
  
  /**
   * Traite les features en parallèle
   */
  private processParallel(
    geometry: THREE.BufferGeometry,
    features: Feature[],
    element: PivotElement
  ): ProcessorResult {
    // Grouper par type pour batch processing
    const grouped = new Map<FeatureType, Feature[]>();
    
    for (const feature of features) {
      const group = grouped.get(feature.type) || [];
      group.push(feature);
      grouped.set(feature.type, group);
    }
    
    let currentGeometry = geometry;
    
    // Traiter chaque groupe
    for (const [type, groupFeatures] of grouped) {
      const processor = this.processors.get(type);
      if (!processor) continue;
      
      // Si le processeur supporte le batch
      if ((processor as any).processBatch) {
        const result = (processor as any).processBatch(currentGeometry, groupFeatures, element);
        if (result.success && result.geometry) {
          if (currentGeometry !== geometry) {
            currentGeometry.dispose();
          }
          currentGeometry = result.geometry;
        }
      } else {
        // Traiter individuellement
        for (const feature of groupFeatures) {
          const result = processor.process(currentGeometry, feature, element);
          if (result.success && result.geometry) {
            if (currentGeometry !== geometry) {
              currentGeometry.dispose();
            }
            currentGeometry = result.geometry;
          }
        }
      }
    }
    
    return {
      success: true,
      geometry: currentGeometry
    };
  }
  
  /**
   * Traite les features séquentiellement avec dépendances
   */
  private processSequential(
    geometry: THREE.BufferGeometry,
    features: Feature[],
    element: PivotElement,
    dependencies?: Map<string, string[]>
  ): ProcessorResult {
    let currentGeometry = geometry;
    
    // Trier selon les dépendances
    const sorted = dependencies ? 
      this.topologicalSort(features, dependencies) : 
      features;
    
    // Traiter dans l'ordre
    for (const feature of sorted) {
      const processor = this.processors.get(feature.type);
      if (!processor) {
        console.warn(`Processeur non trouvé pour ${feature.type}`);
        continue;
      }
      
      const result = processor.process(currentGeometry, feature, element);
      if (!result.success) {
        return result;
      }
      
      if (result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return {
      success: true,
      geometry: currentGeometry
    };
  }
  
  /**
   * Trie les features selon un ordre spécifique
   */
  private orderFeatures(features: Feature[], order: FeatureType[]): Feature[] {
    return features.sort((a, b) => {
      const indexA = order.indexOf(a.type);
      const indexB = order.indexOf(b.type);
      
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  }
  
  /**
   * Ajoute des arrondis aux coins d'un contour
   */
  private addRoundedCorners(contourFeature: Feature): void {
    const radius = (contourFeature.parameters as any).cornerRadius || 10;
    
    // Modifier les points pour ajouter des bulges aux coins
    if (contourFeature.parameters.points && Array.isArray(contourFeature.parameters.points)) {
      const points = contourFeature.parameters.points as THREE.Vector2[];
      const bulges = new Array(points.length).fill(0);
      
      // Détecter les coins (changement d'angle > 45°)
      for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        const angleDiff = Math.abs(angle2 - angle1);
        
        if (angleDiff > Math.PI / 4) {
          // C'est un coin, ajouter un bulge
          bulges[i] = 0.414; // Approximation pour un quart de cercle
        }
      }
      
      contourFeature.parameters.bulge = bulges;
    }
  }
  
  /**
   * Arrange les features en forme de T
   */
  private arrangeTShape(slots: Feature[]): void {
    if (slots.length < 2) return;
    
    // Premier slot horizontal
    const horizontal = slots[0];
    horizontal.rotation = new THREE.Euler(0, 0, 0);
    
    // Deuxième slot vertical
    const vertical = slots[1];
    vertical.rotation = new THREE.Euler(0, 0, Math.PI / 2);
    
    // Positionner le vertical au centre de l'horizontal
    vertical.position.x = horizontal.position.x;
    vertical.position.y = horizontal.position.y + (horizontal.parameters.length || 100) / 2;
  }
  
  /**
   * Tri topologique pour respecter les dépendances
   */
  private topologicalSort(
    features: Feature[],
    dependencies: Map<string, string[]>
  ): Feature[] {
    const sorted: Feature[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (featureId: string) => {
      if (visited.has(featureId)) return;
      if (visiting.has(featureId)) {
        console.warn('Dépendance circulaire détectée');
        return;
      }
      
      visiting.add(featureId);
      
      const deps = dependencies.get(featureId) || [];
      for (const depId of deps) {
        visit(depId);
      }
      
      visiting.delete(featureId);
      visited.add(featureId);
      
      const feature = features.find(f => f.id === featureId);
      if (feature) {
        sorted.push(feature);
      }
    };
    
    for (const feature of features) {
      visit(feature.id);
    }
    
    return sorted;
  }
  
  /**
   * Valide une feature composée
   */
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const compositeFeature = feature as CompositeFeature;
    
    if (!compositeFeature.subFeatures || compositeFeature.subFeatures.length === 0) {
      errors.push('Feature composée doit avoir au moins une sous-feature');
    }
    
    // Valider chaque sous-feature
    for (const subFeature of compositeFeature.subFeatures || []) {
      const processor = this.processors.get(subFeature.type);
      if (processor) {
        const subErrors = processor.validateFeature(subFeature, element);
        errors.push(...subErrors.map(e => `${subFeature.id}: ${e}`));
      }
    }
    
    return errors;
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    for (const processor of this.processors.values()) {
      processor.dispose?.();
    }
    this.processors.clear();
  }
}

/**
 * Factory pour créer des features composées prédéfinies
 */
export class CompositeFeatureFactory {
  /**
   * Crée un trou taraudé avec fraisage
   */
  static createCountersunkTappedHole(
    position: THREE.Vector3,
    diameter: number,
    depth: number,
    sinkDiameter: number,
    threadPitch: number
  ): CompositeFeature {
    return {
      id: `composite-${Date.now()}`,
      type: FeatureType.COUNTERSINK, // Type principal
      compositeType: CompositeFeatureType.COUNTERSUNK_TAPPED_HOLE,
      coordinateSystem: 'local' as any,
      position,
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {},
      subFeatures: [
        {
          id: 'sink',
          type: FeatureType.COUNTERSINK,
          coordinateSystem: 'local' as any,
          position: position.clone(),
          rotation: new THREE.Euler(0, 0, 0),
          parameters: {
            diameter,
            sinkDiameter,
            sinkDepth: 6,
            sinkAngle: 90
          }
        },
        {
          id: 'thread',
          type: FeatureType.TAPPED_HOLE,
          coordinateSystem: 'local' as any,
          position: position.clone(),
          rotation: new THREE.Euler(0, 0, 0),
          parameters: {
            diameter,
            depth,
            threadPitch,
            threadType: 'metric'
          }
        }
      ],
      sequence: 'sequential'
    };
  }
}