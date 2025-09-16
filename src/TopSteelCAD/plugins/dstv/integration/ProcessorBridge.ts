/**
 * ProcessorBridge - Pont entre le pipeline DSTV et les processeurs de features existants
 * 
 * Ce module connecte la nouvelle architecture DSTV avec vos processeurs de features
 * existants, permettant la réutilisation complète de votre logique de traitement 3D.
 */

import * as THREE from 'three';
import { Feature, FeatureType, CoordinateSystem, ProfileFace, mapDSTVFaceToProfileFace } from '../../../core/features/types';
import { FeatureProcessorFactory } from '../../../core/features/processors/FeatureProcessorFactory';
import { PivotElement } from '@/types/viewer';
import { NormalizedFeature, NormalizedFeatureType } from '../import/stages/DSTVNormalizationStage';
import { BOBlockData } from '../import/blocks/BOBlockParser';
import { AKBlockData } from '../import/blocks/AKBlockParser';
import { IKBlockData } from '../import/blocks/IKBlockParser';
import { SIBlockData } from '../import/blocks/SIBlockParser';
import { SCBlockData } from '../import/blocks/SCBlockParser';
import { StandardFace } from '../../../core/coordinates/types';
import { dstvFeaturePriority } from '../import/DSTVFeaturePriority';

/**
 * Convertit StandardFace en ProfileFace
 */
function standardFaceToProfileFace(face: StandardFace | undefined): ProfileFace | undefined {
  if (!face) return undefined;
  
  switch (face) {
    case StandardFace.WEB:
      return ProfileFace.WEB;
    case StandardFace.TOP_FLANGE:
      return ProfileFace.TOP_FLANGE;
    case StandardFace.BOTTOM_FLANGE:
      return ProfileFace.BOTTOM_FLANGE;
    case StandardFace.LEFT:
      return ProfileFace.LEFT_LEG;
    case StandardFace.RIGHT:
      return ProfileFace.RIGHT_LEG;
    default:
      return ProfileFace.WEB;
  }
}

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
    
    // VÉRIFICATION CRITIQUE : État de la géométrie d'entrée
    console.log('🔍 ProcessorBridge: Input geometry state:', {
      isNull: geometry === null,
      isUndefined: geometry === undefined,
      hasAttributes: !!geometry?.attributes,
      hasPositions: !!geometry?.attributes?.position,
      vertexCount: geometry?.attributes?.position?.count || 0,
      geometryType: geometry?.constructor?.name || 'unknown'
    });
    
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
      console.error('❌ ProcessorBridge: GEOMETRY IS NULL/INVALID - this is the root cause!');
      console.error('❌ ProcessorBridge: Cannot process feature on invalid geometry');
      return geometry; // Return the invalid geometry as-is to avoid further errors
    }
    
    // VÉRIFICATION SPÉCIFIQUE M1002: Log détaillé pour debug
    if (normalizedFeature.id.includes('M1002') || 
        (normalizedFeature.parameters?.points && 
         Array.isArray(normalizedFeature.parameters.points) && 
         normalizedFeature.parameters.points.length === 9)) {
      console.log('🎯 M1002 DEBUGGING in ProcessorBridge:');
      console.log('  Feature type:', normalizedFeature.type);
      console.log('  Feature coordinates:', normalizedFeature.coordinates);
      console.log('  Feature points count:', normalizedFeature.parameters?.points?.length || 0);
      console.log('  Element dimensions:', element.dimensions);
    }
    
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
      console.log('✅ ProcessorBridge: Feature processed successfully, returning new geometry with', result.geometry.attributes?.position?.count || 0, 'vertices');
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
            points: region.points.map(p => [p.x, p.y]),
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
        points: ikData.points.map(p => [p.x, p.y]),
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
    // Log the raw SI data to debug
    console.log('🎯 ProcessorBridge.applySIBlock - Raw SI data:', siData);
    
    // Convert StandardFace to ProfileFace
    const profileFace = standardFaceToProfileFace(siData.face as StandardFace) || ProfileFace.WEB;
    
    // Calculate proper rotation for marking to lie flat on the face
    // Note: We don't have direct access to element type here, so we'll keep it simple for now
    const rotation = this.calculateMarkingRotationForFace(profileFace);
    
    console.log(`🎯 ProcessorBridge.applySIBlock - Calculated rotation for face ${profileFace}:`, {
      x: rotation.x / Math.PI * 180 + '°',
      y: rotation.y / Math.PI * 180 + '°', 
      z: rotation.z / Math.PI * 180 + '°'
    });
    
    const feature: Feature = {
      type: siData.text.length > 1 ? FeatureType.TEXT : FeatureType.MARKING,
      id: `marking_${Date.now()}_${Math.random()}`,
      position: new THREE.Vector3(siData.x, siData.y, 0),
      rotation: rotation,
      coordinateSystem: CoordinateSystem.DSTV,
      parameters: {
        text: siData.text,
        height: siData.height || 10,
        depth: siData.depth || 0.1,
        angle: siData.angle || 0,
        font: siData.font || 'Arial',
        markingMethod: siData.markingMethod || 'engrave',
        face: profileFace
      }
    };

    console.log('🎯 ProcessorBridge.applySIBlock - Feature created:', feature);

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
    console.log(`🚀 NEW ProcessorBridge.convertToProcessorFeature called for ${normalizedFeature.id}`);
    const typeMapping: Record<NormalizedFeatureType, FeatureType> = {
      [NormalizedFeatureType.HOLE]: FeatureType.HOLE,
      [NormalizedFeatureType.CUT]: FeatureType.CUT,  // CORRIGÉ: router vers CutProcessor pour coupes droites
      [NormalizedFeatureType.END_CUT]: FeatureType.END_CUT,  // Coupe droite d'extrémité (pas un contour)
      [NormalizedFeatureType.CONTOUR]: FeatureType.CONTOUR,
      [NormalizedFeatureType.NOTCH]: FeatureType.NOTCH,
      [NormalizedFeatureType.CUT_WITH_NOTCHES]: FeatureType.NOTCH,  // Router vers NotchProcessor spécialisé
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

    // Convertir les points si c'est un contour, une notch ou une coupe avec encoches
    const parameters = { ...normalizedFeature.parameters };
    if ((normalizedFeature.type === NormalizedFeatureType.CONTOUR || 
         normalizedFeature.type === NormalizedFeatureType.NOTCH ||
         normalizedFeature.type === NormalizedFeatureType.CUT_WITH_NOTCHES) && parameters.points) {
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
    
    // Map the DSTV face indicator to ProfileFace enum
    const rawFace = normalizedFeature.parameters.face || normalizedFeature.metadata?.face;
    
    // Les coordonnées sont déjà ajustées dans DSTVNormalizationStage
    // Pas besoin d'ajustement supplémentaire ici
    const adjustedZ = normalizedFeature.coordinates.z || 0;
    const isMarking = normalizedFeature.type === NormalizedFeatureType.MARKING;
    
    // Log pour vérification
    if (isMarking) {
      console.log(`📍 Marking position: X=${normalizedFeature.coordinates.x}, Y=${normalizedFeature.coordinates.y}, Z=${adjustedZ} on face ${rawFace}`);
    }
    
    const position = new THREE.Vector3(
      normalizedFeature.coordinates.x,
      normalizedFeature.coordinates.y,
      adjustedZ
    );
    
    // Pour les plaques, adapter le mapping des faces
    // 'v' sur une plaque = face supérieure (TOP), pas web
    let mappedFace = rawFace ? mapDSTVFaceToProfileFace(rawFace) : undefined;
    
    // Si c'est une plaque, remapper les faces correctement
    if (normalizedFeature.metadata?.profileType === 'PLATE') {
      if (rawFace === 'v' || rawFace === 'web') {
        mappedFace = ProfileFace.TOP_FLANGE; // Surface supérieure de la plaque
        console.log(`🔲 PLATE face remapped: ${rawFace} → TOP_FLANGE`);
      } else if (rawFace === 'u') {
        mappedFace = ProfileFace.BOTTOM_FLANGE; // Surface inférieure de la plaque
      }
    }
    
    // Remove face from parameters to avoid confusion
    if (parameters.face) {
      delete parameters.face;
    }
    
    console.log(`🔄 ProcessorBridge - Feature mapping:`, {
      featureId: normalizedFeature.id,
      featureType: normalizedFeature.type,
      inputCoords: normalizedFeature.coordinates,
      outputPosition: { x: position.x, y: position.y, z: position.z },
      rawFace: rawFace,
      mappedFace: mappedFace,
      timestamp: Date.now()
    });
    
    // Calculate rotation based on face and feature type
    // Holes need to be perpendicular to the face (traverse through)
    // Markings/Text need to be parallel to the face (lie on the surface)
    const isMarkingType = featureType === FeatureType.MARKING || featureType === FeatureType.TEXT;
    const rotation = isMarkingType 
      ? this.calculateMarkingRotationForFace(mappedFace)
      : this.calculateRotationForFace(mappedFace);
    
    return {
      type: featureType,
      id: normalizedFeature.id,
      position: position,
      rotation: rotation,
      coordinateSystem: CoordinateSystem.STANDARD, // Les coordonnées sont déjà converties en standard dans DSTVNormalizationStage
      face: mappedFace, // Use the mapped ProfileFace enum value
      parameters
    };
  }

  /**
   * Calculate rotation based on face to ensure holes are perpendicular to the face
   */
  private calculateRotationForFace(face?: ProfileFace): THREE.Euler {
    if (!face) {
      return new THREE.Euler(0, 0, 0);
    }
    
    // Based on ProfileFace enum, calculate the rotation needed
    // CylinderGeometry in Three.js is created vertical (along Y axis) by default
    switch (face) {
      case ProfileFace.WEB:
        // For I-profiles: web is vertical (YZ plane), hole must traverse along X axis
        // Rotate 90° around Z to orient cylinder along X axis
        console.log(`  → WEB face: rotation (0, 0, π/2) - hole through web along X axis`);
        return new THREE.Euler(0, 0, Math.PI / 2);
        
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        // Hole must traverse along Y axis (perpendicular to flanges)
        // No rotation needed as cylinder is already vertical
        console.log(`  → TOP/BOTTOM_FLANGE face: no rotation - hole perpendicular to flange`);
        return new THREE.Euler(0, 0, 0);
        
      case ProfileFace.FRONT:
      case ProfileFace.BACK:
        // For L-profiles: FRONT face is perpendicular to X axis
        // Hole must traverse along X axis to go through the face
        // Rotate 90° around Z axis to orient cylinder along X
        console.log(`  → FRONT/BACK face: rotation (0, 0, π/2) - hole perpendicular to face`);
        return new THREE.Euler(0, 0, Math.PI / 2);
        
      case ProfileFace.LEFT:
      case ProfileFace.RIGHT:
        // Hole must traverse along Z axis
        // Rotate 90° around X axis to orient cylinder along Z
        console.log(`  → LEFT/RIGHT face: rotation (π/2, 0, 0) - hole perpendicular to face`);
        return new THREE.Euler(Math.PI / 2, 0, 0);
        
      default:
        return new THREE.Euler(0, 0, 0);
    }
  }

  /**
   * Calculate rotation for markings/text to be ON the face (parallel to surface)
   */
  private calculateMarkingRotationForFace(face?: ProfileFace, profileType?: string): THREE.Euler {
    if (!face) {
      return new THREE.Euler(0, 0, 0);
    }
    
    // Markings need to lie ON the face, not go through it
    // Text geometry in Three.js is created facing the camera (in XY plane, facing +Z)
    // We need to rotate it to lie flat on each face
    switch (face) {
      case ProfileFace.WEB:
        // WEB orientation depends on profile type:
        // - For L-profiles: vertical face (ZY plane at X=0), rotate -90° around Y
        // - For I-profiles: vertical central web, no rotation needed (text faces forward)
        if (profileType === 'L_PROFILE' || profileType === 'angle') {
          console.log(`  → WEB marking (L-profile): rotation (0, -π/2, 0) - text on vertical web face`);
          return new THREE.Euler(0, -Math.PI / 2, 0);
        } else {
          console.log(`  → WEB marking (I-profile): rotation (0, 0, 0) - text on web face`);
          return new THREE.Euler(0, 0, 0);
        }
        
      case ProfileFace.TOP_FLANGE:
        // Text on top flange - rotate to lie flat facing up
        console.log(`  → TOP_FLANGE marking: rotation (-π/2, 0, 0) - text flat on top`);
        return new THREE.Euler(-Math.PI / 2, 0, 0);
        
      case ProfileFace.BOTTOM_FLANGE:
        // Text on bottom flange - rotate to lie flat facing down
        console.log(`  → BOTTOM_FLANGE marking: rotation (π/2, 0, 0) - text flat on bottom`);
        return new THREE.Euler(Math.PI / 2, 0, 0);
        
      case ProfileFace.FRONT:
        // For L-profiles: FRONT is the vertical face (YZ plane at X=0)
        // Text needs to rotate 90° around Y to face along X axis
        console.log(`  → FRONT marking: rotation (0, π/2, 0) - text on vertical front face`);
        return new THREE.Euler(0, Math.PI / 2, 0);
        
      case ProfileFace.BACK:
        // Text on back face - rotate to face backward
        console.log(`  → BACK marking: rotation (0, -π/2, 0) - text on back face`);
        return new THREE.Euler(0, -Math.PI / 2, 0);
        
      case ProfileFace.LEFT:
        // Text on left side face
        console.log(`  → LEFT marking: rotation (0, 0, 0) - text on left face`);
        return new THREE.Euler(0, 0, 0);
        
      case ProfileFace.RIGHT:
        // Text on right side face - rotate 180° to face opposite direction
        console.log(`  → RIGHT marking: rotation (0, π, 0) - text on right face`);
        return new THREE.Euler(0, Math.PI, 0);
        
      default:
        return new THREE.Euler(0, 0, 0);
    }
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
   * avec optimisation par priorité DSTV
   */
  async applyFeatureBatch(
    geometry: THREE.BufferGeometry,
    features: NormalizedFeature[],
    element: PivotElement
  ): Promise<THREE.BufferGeometry> {
    let currentGeometry = geometry;
    
    // Les features sont déjà triées par priorité dans DSTVSceneBuildingStage
    // mais on peut optimiser davantage par groupes
    const priorityGroups = dstvFeaturePriority.groupFeaturesByPriority(features);
    
    console.log(`🎯 Processing ${features.length} features in ${priorityGroups.size} priority groups`);
    
    for (const [priority, groupFeatures] of priorityGroups) {
      const priorityInfo = dstvFeaturePriority.getFeaturePriorityInfo(groupFeatures[0]);
      console.log(`\n📦 Processing priority group ${priority} (${priorityInfo.blockType}): ${groupFeatures.length} features`);
      
      // Traiter les features du groupe
      if (priorityInfo.canBatch && groupFeatures.length > 1) {
        // Traitement optimisé par batch pour les trous et marquages
        console.log(`  ⚡ Batch processing ${groupFeatures.length} ${priorityInfo.blockType} features`);
        currentGeometry = await this.processBatchOptimized(
          currentGeometry,
          groupFeatures,
          element,
          priority
        );
      } else {
        // Traitement séquentiel pour les coupes et contours (ordre important)
        for (const normalizedFeature of groupFeatures) {
          console.log(`  🔧 Processing ${normalizedFeature.type} feature ${normalizedFeature.id}`);
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
      }
    }
    
    return currentGeometry;
  }
  
  /**
   * Traitement optimisé par batch pour les features qui peuvent être groupées
   */
  private async processBatchOptimized(
    geometry: THREE.BufferGeometry,
    features: NormalizedFeature[],
    element: PivotElement,
    _priority: number
  ): Promise<THREE.BufferGeometry> {
    let currentGeometry = geometry;
    
    // Grouper par face pour minimiser les changements de contexte
    const byFace = new Map<string, NormalizedFeature[]>();
    
    for (const feature of features) {
      const face = (feature.parameters?.face || 'default') as string;
      if (!byFace.has(face)) {
        byFace.set(face, []);
      }
      byFace.get(face)!.push(feature);
    }
    
    // Traiter par groupe de face
    for (const [face, faceFeatures] of byFace) {
      console.log(`    📐 Processing ${faceFeatures.length} features on face ${face}`);
      
      for (const normalizedFeature of faceFeatures) {
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