/**
 * CompoundCutHandler.ts - Handler pour les coupes composées
 * Gère les coupes complexes avec multiples angles et transformations
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';
import { getCSGService, CSGOperation } from '../services/CSGOperationService';

/**
 * Structure pour une coupe composée
 */
interface CompoundCutComponent {
  type: CutType;
  points?: Array<[number, number]>;
  angle?: number;
  depth?: number;
  offset?: THREE.Vector3;
  rotation?: THREE.Euler;
}

/**
 * Handler pour les coupes composées multi-angles et multi-opérations
 */
export class CompoundCutHandler extends BaseCutHandler {
  readonly name = 'CompoundCutHandler';
  readonly supportedTypes = [
    CutType.END_COMPOUND,
    CutType.NOTCH_COMPOUND
  ];
  readonly priority = 85; // Haute priorité pour les coupes complexes

  private geometryService = getGeometryService();
  private csgService = getCSGService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite de coupe composée
    if (params.cutType === 'compound' || params.isCompound) {
      return true;
    }
    
    // Multiples angles définis
    if (params.angleX && params.angleY) {
      return true;
    }
    
    // Multiples opérations définies
    if (params.operations && Array.isArray(params.operations)) {
      return true;
    }
    
    // Multiples composants de coupe
    if (params.components && Array.isArray(params.components)) {
      return true;
    }
    
    // Pattern complexe avec multiples transformations
    if (params.transforms && Array.isArray(params.transforms)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les coupes composées
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier les composants
    if (params.components) {
      if (!Array.isArray(params.components)) {
        errors.push('Components must be an array');
      } else if (params.components.length < 2) {
        warnings.push('Compound cut typically requires at least 2 components');
      } else if (params.components.length > 10) {
        warnings.push('Too many components may impact performance');
      }
    }
    
    // Vérifier les angles multiples
    if (params.angleX !== undefined && params.angleY !== undefined) {
      const totalAngle = Math.sqrt(params.angleX * params.angleX + params.angleY * params.angleY);
      if (totalAngle > 90) {
        warnings.push('Combined angles exceed 90°, may produce unexpected results');
      }
    }
    
    // Vérifier les opérations
    if (params.operations) {
      for (const op of params.operations) {
        if (!['subtract', 'add', 'intersect'].includes(op.type)) {
          errors.push(`Invalid operation type: ${op.type}`);
        }
      }
    }
  }

  /**
   * Les coupes composées peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de coupe composée
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    
    console.log(`  🔗 Creating compound cut geometry:`);
    console.log(`    Components: ${params.components?.length || 'auto-detected'}`);
    
    // Extraire les composants de la coupe
    const components = this.extractComponents(params, element);
    
    if (components.length === 0) {
      // Fallback vers une coupe simple si pas de composants
      return this.createSimpleCompoundCut(params, element);
    }
    
    // Créer et combiner les géométries des composants
    return this.combineComponentGeometries(components, element, params);
  }

  /**
   * Extrait les composants de la coupe composée
   */
  private extractComponents(params: any, element: PivotElement): CompoundCutComponent[] {
    const components: CompoundCutComponent[] = [];
    
    // Composants explicites
    if (params.components && Array.isArray(params.components)) {
      for (const comp of params.components) {
        components.push(this.parseComponent(comp, element));
      }
      return components;
    }
    
    // Décomposition automatique basée sur les paramètres
    if (params.angleX && params.angleY) {
      // Décomposer en deux coupes angulaires
      components.push({
        type: CutType.ANGLE_CUT,
        angle: params.angleX,
        rotation: new THREE.Euler(0, params.angleX * Math.PI / 180, 0),
        depth: params.depth
      });
      
      components.push({
        type: CutType.ANGLE_CUT,
        angle: params.angleY,
        rotation: new THREE.Euler(params.angleY * Math.PI / 180, 0, 0),
        depth: params.depth
      });
    }
    
    // Opérations multiples
    if (params.operations && Array.isArray(params.operations)) {
      for (const op of params.operations) {
        components.push({
          type: this.operationToCutType(op.type),
          points: op.points,
          depth: op.depth || params.depth,
          offset: op.offset ? new THREE.Vector3(op.offset.x, op.offset.y, op.offset.z) : undefined
        });
      }
    }
    
    return components;
  }

  /**
   * Parse un composant individuel
   */
  private parseComponent(comp: any, element: PivotElement): CompoundCutComponent {
    return {
      type: this.parseCutType(comp.type),
      points: comp.points,
      angle: comp.angle,
      depth: comp.depth || element.dimensions?.webThickness || 10,
      offset: comp.offset ? new THREE.Vector3(comp.offset.x, comp.offset.y, comp.offset.z) : undefined,
      rotation: comp.rotation ? new THREE.Euler(
        comp.rotation.x * Math.PI / 180,
        comp.rotation.y * Math.PI / 180,
        comp.rotation.z * Math.PI / 180
      ) : undefined
    };
  }

  /**
   * Combine les géométries des composants
   */
  private combineComponentGeometries(
    components: CompoundCutComponent[],
    element: PivotElement,
    params: any
  ): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    
    // Créer la géométrie pour chaque composant
    for (const component of components) {
      const geometry = this.createComponentGeometry(component, element);
      
      // Appliquer les transformations du composant
      if (component.offset) {
        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(component.offset.x, component.offset.y, component.offset.z);
        geometry.applyMatrix4(matrix);
      }
      
      if (component.rotation) {
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromEuler(component.rotation);
        geometry.applyMatrix4(matrix);
      }
      
      geometries.push(geometry);
    }
    
    // Stratégie de combinaison
    const combineStrategy = params.combineStrategy || 'union';
    
    switch (combineStrategy) {
      case 'union':
        return this.unionGeometries(geometries);
        
      case 'sequential':
        // Synchronous fallback
      return new THREE.BufferGeometry();
        
      case 'intersect':
        // Synchronous fallback
      return new THREE.BufferGeometry();
        
      default:
        return this.unionGeometries(geometries);
    }
  }

  /**
   * Crée la géométrie pour un composant
   */
  private createComponentGeometry(
    component: CompoundCutComponent,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    switch (component.type) {
      case CutType.ANGLE_CUT:
        return this.createAngledComponent(component, dims);
        
      case CutType.STRAIGHT_CUT:
        return this.createStraightComponent(component, dims);
        
      case CutType.NOTCH_RECTANGULAR:
        return this.createNotchComponent(component, dims);
        
      default:
        // Fallback vers une boîte simple
        return new THREE.BoxGeometry(
          100,
          50,
          component.depth || dims.webThickness || 10
        );
    }
  }

  /**
   * Crée un composant angulaire
   */
  private createAngledComponent(component: CompoundCutComponent, dims: any): THREE.BufferGeometry {
    const angle = component.angle || 45;
    const width = 100;
    const height = dims.height || 300;
    const depth = component.depth || dims.webThickness || 10;
    
    // Créer un prisme incliné
    const shape = new THREE.Shape();
    const offset = depth * Math.tan(angle * Math.PI / 180);
    
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width + offset, height);
    shape.lineTo(offset, height);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée un composant droit
   */
  private createStraightComponent(component: CompoundCutComponent, dims: any): THREE.BufferGeometry {
    if (component.points && component.points.length >= 3) {
      const shape = this.createShapeFromPoints(component.points);
      
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: component.depth || dims.webThickness || 10,
        bevelEnabled: false,
        steps: 1
      };
      
      return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }
    
    // Fallback vers une boîte
    return new THREE.BoxGeometry(100, 50, component.depth || 10);
  }

  /**
   * Crée un composant d'encoche
   */
  private createNotchComponent(component: CompoundCutComponent, dims: any): THREE.BufferGeometry {
    const width = 50;
    const height = 30;
    const depth = component.depth || dims.webThickness || 10;
    
    return new THREE.BoxGeometry(width, height, depth);
  }

  /**
   * Union de toutes les géométries
   */
  private unionGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) {
      return new THREE.BufferGeometry();
    }
    
    if (geometries.length === 1) {
      return geometries[0];
    }
    
    // Utiliser BufferGeometryUtils pour fusionner
    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    
    // Nettoyer les géométries individuelles
    geometries.forEach(g => g.dispose());
    
    return merged;
  }

  /**
   * Combinaison séquentielle (chaque géométrie soustrait de la précédente)
   */
  private async sequentialCombine(geometries: THREE.BufferGeometry[]): Promise<THREE.BufferGeometry> {
    if (geometries.length === 0) {
      return new THREE.BufferGeometry();
    }
    
    let result = geometries[0];
    
    for (let i = 1; i < geometries.length; i++) {
      const csgResult = await this.csgService.performSubtraction(result, geometries[i]);
      
      if (csgResult.success && csgResult.geometry) {
        if (i > 0) result.dispose(); // Nettoyer l'intermédiaire
        result = csgResult.geometry;
      }
    }
    
    return result;
  }

  /**
   * Intersection de toutes les géométries
   */
  private async intersectGeometries(geometries: THREE.BufferGeometry[]): Promise<THREE.BufferGeometry> {
    if (geometries.length === 0) {
      return new THREE.BufferGeometry();
    }
    
    let result = geometries[0];
    
    for (let i = 1; i < geometries.length; i++) {
      const csgResult = await this.csgService.performIntersection(result, geometries[i]);
      
      if (csgResult.success && csgResult.geometry) {
        if (i > 0) result.dispose();
        result = csgResult.geometry;
      }
    }
    
    return result;
  }

  /**
   * Crée une coupe composée simple (fallback)
   */
  private createSimpleCompoundCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    // Créer deux coupes angulaires combinées
    const angleX = params.angleX || 30;
    const angleY = params.angleY || 30;
    const depth = params.depth || dims.webThickness || 10;
    
    // Première coupe
    const cut1 = new THREE.BoxGeometry(100, dims.height || 300, depth);
    const matrix1 = new THREE.Matrix4();
    matrix1.makeRotationY(angleX * Math.PI / 180);
    cut1.applyMatrix4(matrix1);
    
    // Deuxième coupe
    const cut2 = new THREE.BoxGeometry(100, dims.height || 300, depth);
    const matrix2 = new THREE.Matrix4();
    matrix2.makeRotationX(angleY * Math.PI / 180);
    cut2.applyMatrix4(matrix2);
    
    // Fusionner
    const merged = BufferGeometryUtils.mergeGeometries([cut1, cut2]);
    
    cut1.dispose();
    cut2.dispose();
    
    return merged;
  }

  /**
   * Convertit un type d'opération en type de coupe
   */
  private operationToCutType(operation: string): CutType {
    switch (operation) {
      case 'subtract':
        return CutType.STRAIGHT_CUT;
      case 'notch':
        return CutType.NOTCH_RECTANGULAR;
      case 'angle':
        return CutType.ANGLE_CUT;
      default:
        return CutType.STRAIGHT_CUT;
    }
  }

  /**
   * Parse un type de coupe depuis une chaîne
   */
  private parseCutType(type: string): CutType {
    const upperType = type.toUpperCase();
    
    // Essayer de mapper directement
    if (upperType in CutType) {
      return CutType[upperType as keyof typeof CutType];
    }
    
    // Mappings alternatifs
    if (upperType.includes('ANGLE')) return CutType.ANGLE_CUT;
    if (upperType.includes('STRAIGHT')) return CutType.STRAIGHT_CUT;
    if (upperType.includes('NOTCH')) return CutType.NOTCH_RECTANGULAR;
    
    return CutType.STRAIGHT_CUT;
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (feature.type === FeatureType.NOTCH) {
      return CutType.NOTCH_COMPOUND;
    }
    
    return CutType.END_COMPOUND;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const components = this.extractComponents(params, element);
    
    return {
      ...baseMetadata,
      isCompound: true,
      componentCount: components.length,
      angleX: params.angleX,
      angleY: params.angleY,
      combineStrategy: params.combineStrategy || 'union',
      components: components.map(c => ({
        type: c.type,
        hasPoints: !!c.points,
        angle: c.angle,
        depth: c.depth
      }))
    };
  }
}