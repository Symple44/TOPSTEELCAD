/**
 * ProcessorBridge - Pont entre le pipeline DSTV et les processeurs de features existants
 * 
 * Ce module connecte la nouvelle architecture DSTV avec vos processeurs de features
 * existants, permettant la réutilisation complète de votre logique de traitement 3D.
 */

import * as THREE from 'three';
import { Feature, FeatureType, CoordinateSystem, ProfileFace } from '../../../core/features/types';
import { FeatureProcessorFactory } from '../../../core/features/processors/FeatureProcessorFactory';
import { PivotElement } from '@/types/viewer';
import { NormalizedFeature, NormalizedFeatureType } from '../import/stages/DSTVNormalizationStage';
import { BOBlockData } from '../import/blocks/BOBlockParser';
import { AKBlockData } from '../import/blocks/AKBlockParser';
import { IKBlockData } from '../import/blocks/IKBlockParser';
import { SIBlockData } from '../import/blocks/SIBlockParser';
import { SCBlockData } from '../import/blocks/SCBlockParser';

/**
 * Pont entre les features DSTV et les processeurs existants
 */
export class ProcessorBridge {
  private processorFactory: FeatureProcessorFactory;
  
  constructor() {
    this.processorFactory = FeatureProcessorFactory.getInstance();
  }

  /**
   * Applique une feature DSTV normalisée à une géométrie en utilisant les processeurs existants
   */
  async applyNormalizedFeature(
    geometry: THREE.BufferGeometry,
    normalizedFeature: NormalizedFeature,
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    console.log(`🔧 ProcessorBridge: Applying normalized feature ${normalizedFeature.id} of type ${normalizedFeature.type}`);
    
    // Convertir la feature normalisée vers le format des processeurs existants
    const feature = this.convertToProcessorFeature(normalizedFeature);
    
    if (!feature) {
      console.warn(`❌ Cannot convert normalized feature type: ${normalizedFeature.type}`);
      return geometry;
    }

    console.log(`✅ Converted feature ${feature.id} type ${feature.type}, using processor factory...`);
    console.log(`📋 Feature details:`, {
      type: feature.type,
      id: feature.id,
      position: feature.position,
      rotation: feature.rotation,
      parameters: feature.parameters
    });
    
    // Utiliser le processeur existant
    const result = this.processorFactory.process(geometry, feature, element);
    
    console.log(`📊 Processing result for ${feature.id}:`, {
      success: result.success,
      hasGeometry: !!result.geometry,
      error: result.error,
      warning: result.warning
    });
    
    if (result.success && result.geometry) {
      return result.geometry;
    }
    
    if (result.error) {
      console.error(`❌ Feature processing failed: ${result.error}`);
    }
    
    return geometry;
  }

  /**
   * Applique un bloc BO (trous) en utilisant HoleProcessor existant
   */
  async applyBOBlock(
    geometry: THREE.BufferGeometry,
    boData: BOBlockData[],
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    let currentGeometry = geometry;
    
    for (const hole of boData) {
      const feature: Feature = {
        type: FeatureType.HOLE,
        id: `hole_${Date.now()}_${Math.random()}`,
        coordinateSystem: CoordinateSystem.DSTV,
        rotation: new THREE.Euler(0, 0, 0),
        position: new THREE.Vector3(hole.x, hole.y, 0),
        parameters: {
          diameter: hole.diameter,
          depth: hole.depth || -1, // -1 = traversant
          angle: hole.angle || 0,
          face: this.mapFaceToDSTVStandard(hole.face as any) as ProfileFace | undefined,
          holeType: hole.holeType || 'round',
          tolerance: hole.tolerance
        }
      };

      // Si c'est un trou taraudé
      if (hole.toolNumber && hole.toolNumber > 100) {
        feature.type = FeatureType.TAPPED_HOLE;
        feature.parameters.threadPitch = 1.5; // Valeur par défaut
      }

      const result = this.processorFactory.process(currentGeometry, feature, element);
      
      if (result.success && result.geometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = result.geometry;
      }
    }
    
    return currentGeometry;
  }

  /**
   * Applique un bloc AK (contours extérieurs) en utilisant ContourProcessor
   */
  async applyAKBlock(
    geometry: THREE.BufferGeometry,
    akData: AKBlockData,
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    let currentGeometry = geometry;
    
    // Traiter les régions de découpe calculées
    if (akData.cutRegions) {
      for (const region of akData.cutRegions) {
        const feature: Feature = {
          type: FeatureType.CONTOUR,
          id: `contour_${Date.now()}_${Math.random()}`,
          position: this.calculateCenterPosition(region.points),
          rotation: new THREE.Euler(0, 0, 0),
          coordinateSystem: CoordinateSystem.DSTV,
          parameters: {
            // Convertir les points en format tableau [x, y]
            points: region.points.map(p => {
              console.debug(`Converting AK point: {x: ${p.x}, y: ${p.y}} -> [${p.x}, ${p.y}]`);
              return [p.x, p.y];
            }),
            closed: true, // Les régions de découpe sont toujours fermées
            depth: Math.min(region.depth || 10, 15), // Limiter la profondeur
            isTransverse: region.isTransverse,
            contourType: 'cut',
            face: (akData.face || 'front') as any
          }
        };

        const result = this.processorFactory.process(currentGeometry, feature, element);
        
        if (result.success && result.geometry) {
          if (currentGeometry !== geometry) {
            currentGeometry.dispose();
          }
          currentGeometry = result.geometry;
        }
      }
    }
    
    return currentGeometry;
  }

  /**
   * Applique un bloc IK (contours intérieurs) en utilisant CutoutProcessor
   */
  async applyIKBlock(
    geometry: THREE.BufferGeometry,
    ikData: IKBlockData,
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    const featureType = this.mapContourTypeToFeatureType(ikData.contourType);
    
    const feature: Feature = {
      type: featureType,
      id: `inner_contour_${Date.now()}_${Math.random()}`,
      position: this.calculateCenterPosition(ikData.points),
      rotation: new THREE.Euler(0, 0, 0),
      coordinateSystem: CoordinateSystem.DSTV,
      parameters: {
        // Convertir les points en format tableau [x, y]
        points: ikData.points.map(p => {
          console.debug(`Converting IK point: {x: ${p.x}, y: ${p.y}} -> [${p.x}, ${p.y}]`);
          return [p.x, p.y];
        }),
        closed: ikData.closed !== false, // Par défaut fermé
        depth: ikData.depth || 10,
        isTransverse: ikData.isTransverse || false,
        contourType: ikData.contourType,
        face: (ikData.face || 'front') as any
      }
    };

    const result = this.processorFactory.process(geometry, feature, element);
    
    if (result.success && result.geometry) {
      return result.geometry;
    }
    
    return geometry;
  }

  /**
   * Applique un bloc SI (marquages) en utilisant MarkingProcessor ou TextProcessor
   */
  async applySIBlock(
    geometry: THREE.BufferGeometry,
    siData: SIBlockData,
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    const feature: Feature = {
      type: siData.text.length > 1 ? FeatureType.TEXT : FeatureType.MARKING,
      id: `marking_${Date.now()}_${Math.random()}`,
      position: new THREE.Vector3(siData.x, siData.y, 0),
      rotation: new THREE.Euler(0, 0, 0),
      coordinateSystem: CoordinateSystem.DSTV,
      parameters: {
        text: siData.text,
        height: siData.height || 10,
        depth: siData.depth || 0.1,
        angle: siData.angle || 0,
        font: siData.font || 'Arial',
        markingMethod: siData.markingMethod || 'engrave'
      }
    };

    const result = this.processorFactory.process(geometry, feature, element);
    
    if (result.success && result.geometry) {
      return result.geometry;
    }
    
    return geometry;
  }

  /**
   * Applique un bloc SC (découpes) en utilisant CutoutProcessor
   */
  async applySCBlock(
    geometry: THREE.BufferGeometry,
    scData: SCBlockData,
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    const featureType = this.mapCutTypeToFeatureType(scData.cutType);
    
    const feature: Feature = {
      type: featureType,
      id: `cut_${Date.now()}_${Math.random()}`,
      position: new THREE.Vector3(scData.x, scData.y, 0),
      rotation: new THREE.Euler(0, 0, 0),
      coordinateSystem: CoordinateSystem.DSTV,
      parameters: {
        width: scData.width,
        height: scData.height,
        depth: scData.depth || -1, // -1 = traversant
        angle: scData.angle || 0,
        radius: scData.radius || 0,
        cutType: scData.cutType || 'rectangular'
      }
    };

    const result = this.processorFactory.process(geometry, feature, element);
    
    if (result.success && result.geometry) {
      return result.geometry;
    }
    
    return geometry;
  }

  /**
   * Convertit une feature normalisée vers le format des processeurs
   */
  private convertToProcessorFeature(normalizedFeature: NormalizedFeature): Feature | null {
    const typeMapping: Record<NormalizedFeatureType, FeatureType> = {
      [NormalizedFeatureType.HOLE]: FeatureType.HOLE,
      [NormalizedFeatureType.CUT]: FeatureType.CUTOUT,
      [NormalizedFeatureType.CONTOUR]: FeatureType.CONTOUR,
      [NormalizedFeatureType.NOTCH]: FeatureType.NOTCH,
      [NormalizedFeatureType.MARKING]: FeatureType.MARKING,
      [NormalizedFeatureType.PUNCH]: FeatureType.DRILL_PATTERN,
      [NormalizedFeatureType.WELD_PREP]: FeatureType.WELD,
      [NormalizedFeatureType.THREAD]: FeatureType.THREAD,
      [NormalizedFeatureType.BEND]: FeatureType.BEND,
      [NormalizedFeatureType.PROFILE]: FeatureType.PROFILE,
      [NormalizedFeatureType.UNRESTRICTED_CONTOUR]: FeatureType.UNRESTRICTED_CONTOUR,
      [NormalizedFeatureType.BEVEL]: FeatureType.BEVEL,
      [NormalizedFeatureType.VOLUME]: FeatureType.VOLUME,
      [NormalizedFeatureType.NUMERIC_CONTROL]: FeatureType.NUMERIC_CONTROL,
      [NormalizedFeatureType.FREE_PROGRAM]: FeatureType.FREE_PROGRAM,
      [NormalizedFeatureType.LINE_PROGRAM]: FeatureType.LINE_PROGRAM,
      [NormalizedFeatureType.ROTATION]: FeatureType.ROTATION,
      [NormalizedFeatureType.WASHING]: FeatureType.WASHING,
      [NormalizedFeatureType.GROUP]: FeatureType.GROUP,
      [NormalizedFeatureType.VARIABLE]: FeatureType.VARIABLE
    };

    const featureType = typeMapping[normalizedFeature.type];
    if (!featureType) {
      return null;
    }

    // Convertir les points si c'est un contour ou une notch
    const parameters = { ...normalizedFeature.parameters };
    if ((normalizedFeature.type === NormalizedFeatureType.CONTOUR || 
         normalizedFeature.type === NormalizedFeatureType.NOTCH) && parameters.points) {
      console.log(`🔄 Converting ${parameters.points.length} points for ${normalizedFeature.type} ${normalizedFeature.id}`);
      console.log(`🔄 Input points type:`, typeof parameters.points[0], 'First point:', parameters.points[0]);
      
      // Convertir les points du format {x, y} vers [x, y]
      parameters.points = parameters.points.map((p: any, index: number) => {
        if (Array.isArray(p)) {
          console.debug(`  Point ${index} already in array format: [${p[0]}, ${p[1]}]`);
          return p; // Déjà au bon format
        } else if (typeof p === 'object' && p !== null && 'x' in p && 'y' in p) {
          console.debug(`  Converting point ${index}: {x: ${p.x}, y: ${p.y}} -> [${p.x}, ${p.y}]`);
          return [p.x, p.y]; // Convertir objet vers tableau
        } else {
          console.warn(`  ❌ Invalid point format in contour at index ${index}:`, p);
          return [0, 0]; // Valeur par défaut
        }
      });
      
      console.log(`✅ Converted points result:`, parameters.points);
    }
    
    return {
      type: featureType,
      id: normalizedFeature.id,
      position: new THREE.Vector3(
        normalizedFeature.coordinates.x,
        normalizedFeature.coordinates.y,
        normalizedFeature.coordinates.z || 0
      ),
      rotation: new THREE.Euler(0, 0, 0), // Rotation par défaut
      coordinateSystem: CoordinateSystem.DSTV, // Système de coordonnées DSTV
      face: parameters.face || normalizedFeature.metadata?.face, // Ajouter la face au niveau racine
      parameters
    };
  }

  /**
   * Mappe un type de contour vers un FeatureType
   */
  private mapContourTypeToFeatureType(contourType: string): FeatureType {
    switch (contourType) {
      case 'rectangular':
        return FeatureType.CUTOUT;
      case 'circular':
        return FeatureType.HOLE;
      case 'oval':
        return FeatureType.SLOT;
      default:
        return FeatureType.CONTOUR;
    }
  }

  /**
   * Mappe un type de découpe vers un FeatureType
   */
  private mapCutTypeToFeatureType(cutType?: string): FeatureType {
    switch (cutType) {
      case 'angular':
        return FeatureType.BEVEL;
      case 'beveled':
        return FeatureType.CHAMFER;
      case 'circular':
        return FeatureType.HOLE;
      default:
        return FeatureType.CUTOUT;
    }
  }

  /**
   * Calcule la position centrale d'un ensemble de points
   */
  private calculateCenterPosition(points: Array<{ x: number; y: number }>): THREE.Vector3 {
    if (points.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    
    return new THREE.Vector3(
      sumX / points.length,
      sumY / points.length,
      0
    );
  }

  /**
   * Mappe les indicateurs de face DSTV vers le standard
   */
  private mapFaceToDSTVStandard(face?: ProfileFace | undefined): ProfileFace | undefined {
    if (!face) return ProfileFace.FRONT;
    
    const mapping: Record<string, ProfileFace> = {
      'h': ProfileFace.FRONT,
      'v': ProfileFace.TOP,
      'u': ProfileFace.BOTTOM,
      'o': ProfileFace.WEB
    };
    
    return mapping[face as string] || face;
  }

  /**
   * Applique un batch de features en utilisant les processeurs existants
   */
  async applyFeatureBatch(
    geometry: THREE.BufferGeometry,
    features: NormalizedFeature[],
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    let currentGeometry = geometry;
    
    // Trier les features par ordre de traitement
    const sortedFeatures = [...features].sort((a, b) => 
      (a.metadata.processingOrder || 999) - (b.metadata.processingOrder || 999)
    );

    for (const normalizedFeature of sortedFeatures) {
      const newGeometry = await this.applyNormalizedFeature(
        currentGeometry,
        normalizedFeature,
        element
      );
      
      if (newGeometry !== currentGeometry) {
        if (currentGeometry !== geometry) {
          currentGeometry.dispose();
        }
        currentGeometry = newGeometry;
      }
    }
    
    return currentGeometry;
  }

  /**
   * Valide qu'une feature peut être traitée
   */
  validateFeature(normalizedFeature: NormalizedFeature, element: PivotElement): string[] {
    const feature = this.convertToProcessorFeature(normalizedFeature);
    
    if (!feature) {
      return [`Cannot convert feature type: ${normalizedFeature.type}`];
    }

    return this.processorFactory.validate(feature, element);
  }

  /**
   * Obtient les types de features supportés
   */
  getSupportedFeatureTypes(): string[] {
    return this.processorFactory.getSupportedTypes();
  }

  /**
   * Dispose les ressources
   */
  dispose(): void {
    // La factory est un singleton, on ne la dispose pas ici
  }
}