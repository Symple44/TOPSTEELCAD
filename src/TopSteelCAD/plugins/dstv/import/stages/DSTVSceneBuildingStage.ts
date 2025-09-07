/**
 * Stage de construction de scène DSTV
 * 
 * Cinquième et dernière étape du pipeline - construit la scène 3D finale à partir des données normalisées.
 * Cette étape génère la représentation PivotScene utilisée par le viewer TopSteelCAD.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';
import { DSTVNormalizedData } from '../DSTVImportPipeline';
import { PivotScene, PivotElement, MaterialProperties, ElementType, MaterialType, FeatureType } from '../../../../../types/viewer';
import { NormalizedFeature, NormalizedFeatureType, NormalizedProfile } from './DSTVNormalizationStage';
import { ProcessorBridge } from '../../integration/ProcessorBridge';
import { GeometryBridge } from '../../integration/GeometryBridge';
import { dstvFeaturePriority } from '../DSTVFeaturePriority';
import * as THREE from 'three';

/**
 * Configuration de construction de scène
 */
interface DSTVSceneBuildingConfig {
  enableGeometryCache: boolean;
  generateLevelOfDetail: boolean;
  optimizeForRendering: boolean;
  includeBounds: boolean;
  generateMaterials: boolean;
}

/**
 * Cache géométrique pour optimiser les performances
 */
interface GeometryCache {
  profiles: Map<string, any>;
  features: Map<string, any>;
  materials: Map<string, MaterialProperties>;
}

/**
 * Stage de construction de scène DSTV
 */
export class DSTVSceneBuildingStage extends BaseStage<DSTVNormalizedData, PivotScene> {
  readonly name = 'dstv-scene-building';
  readonly description = 'DSTV Scene Building - Builds final 3D scene from normalized DSTV data';
  readonly estimatedDuration = 200; // 200ms en moyenne

  private sceneBuildingConfig: DSTVSceneBuildingConfig;
  private geometryCache: GeometryCache;
  private elementCounter = 0;
  private processorBridge: ProcessorBridge;
  private geometryBridge: GeometryBridge;

  constructor(config: any = {}) {
    super(config);
    
    this.sceneBuildingConfig = {
      enableGeometryCache: config.enableGeometryCache !== false,
      generateLevelOfDetail: config.generateLevelOfDetail !== false,
      optimizeForRendering: config.optimizeForRendering !== false,
      includeBounds: config.includeBounds !== false,
      generateMaterials: config.generateMaterials !== false,
      ...config.sceneBuilding
    };

    this.geometryCache = {
      profiles: new Map(),
      features: new Map(),
      materials: new Map()
    };

    // Initialiser les ponts vers les systèmes existants
    this.processorBridge = new ProcessorBridge();
    this.geometryBridge = new GeometryBridge();
  }

  /**
   * Construction de scène principale
   */
  async process(input: DSTVNormalizedData, context: ProcessingContext): Promise<PivotScene> {
    const stopTimer = this.startTimer();
    
    try {
      this.elementCounter = 0;
      
      this.log(context, 'info', `Starting scene building`, {
        profiles: input.profiles.length,
        totalFeatures: input.profiles.reduce((sum, p) => sum + p.features.length, 0)
      });

      // Créer la scène de base
      const scene = await this.createBaseScene(input, context);
      
      // Construire tous les éléments
      const elements = new Map<string, PivotElement>();
      
      for (const profile of input.profiles) {
        const profileElements = await this.buildProfileElements(profile as any, context);
        
        for (const [id, element] of profileElements) {
          elements.set(id, element);
        }
      }
      
      // Assigner les éléments à la scène
      scene.elements = elements;
      
      // Finaliser la scène
      await this.finalizeScene(scene, input, context);
      
      const duration = stopTimer();
      context.addMetric('scene_building_duration', duration);
      context.addMetric('elements_created', elements.size);
      
      this.log(context, 'info', `Scene building completed`, {
        elementsCreated: elements.size,
        sceneId: scene.id,
        duration: `${duration.toFixed(2)}ms`
      });

      return scene;

    } catch (error) {
      const duration = stopTimer();
      context.addMetric('scene_building_duration', duration);
      context.addMetric('scene_building_error', true);
      
      this.log(context, 'error', `Scene building failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Crée la scène de base
   */
  private async createBaseScene(input: DSTVNormalizedData, context: ProcessingContext): Promise<PivotScene> {
    const primaryProfile = input.profiles[0]; // DSTV = une pièce par fichier
    
    const scene: PivotScene = {
      id: this.generateSceneId(primaryProfile as any),
      name: `DSTV Scene - ${primaryProfile.id}`,
      elements: new Map(),
      metadata: {
        format: 'DSTV',
        originalProfile: primaryProfile.id,
        createdDate: new Date().toISOString(),
        processingMetadata: input.metadata,
        bounds: undefined, // Sera calculé plus tard
        stats: {
          profileCount: input.profiles.length,
          featureCount: input.profiles.reduce((sum, p) => sum + p.features.length, 0),
          materialCount: 0 // Sera mis à jour
        }
      }
    };

    this.log(context, 'debug', `Created base scene`, {
      sceneId: scene.id,
      sceneName: scene.name
    });

    return scene;
  }

  /**
   * Construit tous les éléments d'un profil
   */
  private async buildProfileElements(profile: NormalizedProfile, context: ProcessingContext): Promise<Map<string, PivotElement>> {
    const elements = new Map<string, PivotElement>();
    
    console.log('🚨 buildProfileElements - profile type:', profile.type, 'name:', profile.name);
    
    // Créer l'élément principal du profil
    const profileElement = await this.buildProfileElement(profile, context);
    elements.set(profileElement.id, profileElement);
    
    // Créer les éléments de features
    for (const feature of profile.features) {
      try {
        // Ignorer les features marquées comme "applyOnly" (ex: contours AK)
        if (feature.metadata.applyOnly) {
          this.log(context, 'debug', `Skipping visual creation for apply-only feature: ${feature.id} (${feature.type})`);
          continue;
        }
        
        const featureElement = await this.buildFeatureElement(feature, profile, context);
        if (featureElement) {
          elements.set(featureElement.id, featureElement);
        }
      } catch (error) {
        this.log(context, 'warn', `Failed to build feature element: ${error instanceof Error ? error.message : String(error)}`, {
          featureId: feature.id,
          featureType: feature.type
        });
      }
    }

    return elements;
  }

  /**
   * Construit l'élément principal du profil avec ses features appliquées
   */
  private async buildProfileElement(profile: NormalizedProfile, context: ProcessingContext): Promise<PivotElement> {
    const material = await this.resolveMaterial(profile.material, context);
    
    // Créer la géométrie de base du profil
    let profileGeometry = await this.createProfileBaseGeometry(profile, context);
    
    // UTILISER VOS PROCESSEURS ICI pour appliquer les features
    if (profile.features && profile.features.length > 0) {
      this.log(context, 'debug', `Applying ${profile.features.length} features using existing processors`);
      
      // Créer un élément temporaire pour les processeurs
      const tempElement: PivotElement = {
        id: profile.id,
        name: profile.id, // Use id since name doesn't exist in profile
        materialType: this.mapToMaterialType(profile.type),
        visible: true,
        material,
        dimensions: {
          length: profile.dimensions.length,
          width: profile.dimensions.crossSection?.width || 100,
          height: profile.dimensions.crossSection?.height || 200,
          thickness: profile.dimensions.crossSection?.webThickness || 10,
          flangeThickness: profile.dimensions.crossSection?.flangeThickness || 7.6
        },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        metadata: {
          elementType: ElementType.BEAM,
          profileType: profile.type,  // Add profile type for CutProcessor
          profileName: profile.name   // Add profile name for CutProcessor
        }
      };
      
      // Trier les features par priorité DSTV avant application
      const sortedFeatures = dstvFeaturePriority.sortFeaturesByPriority(profile.features);
      
      // Afficher le rapport de priorité en debug
      if (context.options?.enableDebugLogs) {
        const priorityReport = dstvFeaturePriority.generatePriorityReport(profile.features);
        console.log(`📊 Feature Priority Report for ${profile.id}:\n${priorityReport}`);
      }
      
      // VÉRIFICATION CRITIQUE : État de la géométrie avant application des features
      console.log('🔍 SceneBuildingStage: Geometry state before applying features:', {
        profileId: profile.id,
        isNull: profileGeometry === null,
        isUndefined: profileGeometry === undefined,
        hasAttributes: !!profileGeometry?.attributes,
        hasPositions: !!profileGeometry?.attributes?.position,
        originalVertexCount: profileGeometry?.attributes?.position?.count || 0,
        geometryType: profileGeometry?.constructor?.name || 'unknown'
      });
      
      if (!profileGeometry || !profileGeometry.attributes || !profileGeometry.attributes.position) {
        console.error('❌ SceneBuildingStage: GEOMETRY IS NULL BEFORE FEATURE APPLICATION!');
        console.error('❌ This is the root cause of the "Cannot convert undefined or null to object" error');
        console.error('❌ The GeometryBridge failed to create valid geometry');
        // Return early to avoid further processing
        throw new Error(`Invalid base geometry for profile ${profile.id}. GeometryBridge returned null/undefined geometry.`);
      }
      
      // Appliquer toutes les features via le ProcessorBridge
      console.log(`📦 Applying ${sortedFeatures.length} features to profile ${profile.id} (sorted by DSTV priority):`);
      sortedFeatures.forEach((f, i) => {
        const priorityInfo = dstvFeaturePriority.getFeaturePriorityInfo(f);
        console.log(`  Feature ${i}: id=${f.id}, type=${f.type}, priority=${priorityInfo.priority}, block=${priorityInfo.blockType}`);
      });
      
      const originalVertexCount = profileGeometry.attributes.position?.count || 0;
      console.log(`✅ SceneBuildingStage: Starting feature application with ${originalVertexCount} vertices`);
      
      profileGeometry = await this.processorBridge.applyFeatureBatch(
        profileGeometry,
        sortedFeatures,
        tempElement
      );
      
      const finalVertexCount = profileGeometry.attributes.position?.count || 0;
      console.log(`✅ SceneBuildingStage: Feature application completed: ${originalVertexCount} → ${finalVertexCount} vertices`);
      
      this.log(context, 'info', `Features applied successfully`, {
        originalVertices: originalVertexCount,
        finalVertices: finalVertexCount,
        verticesAdded: finalVertexCount - originalVertexCount,
        featuresApplied: profile.features.length
      });
    }
    
    const element: PivotElement = {
      id: profile.id,
      name: profile.id, // Use id since name doesn't exist
      materialType: this.mapToMaterialType(profile.type),
      visible: true,
      material,
      dimensions: {
        length: profile.dimensions.length,
        width: profile.dimensions.crossSection?.width || 100,
        height: profile.dimensions.crossSection?.height || 200,
        thickness: profile.dimensions.crossSection?.webThickness || 10,
        flangeThickness: profile.dimensions.crossSection?.flangeThickness
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      childIds: profile.features.map(f => f.id),
      // Add features directly to element for hierarchy display
      features: profile.features.map(f => ({
        id: f.id,
        type: this.mapFeatureType(f.type),
        elementId: profile.id,
        position: f.coordinates 
          ? [f.coordinates.x || 0, f.coordinates.y || 0, f.coordinates.z || 0] as [number, number, number]
          : [0, 0, 0] as [number, number, number],
        selectable: true,
        visible: true,
        metadata: f.parameters
      })),
      metadata: {
        elementType: ElementType.BEAM,
        profileType: profile.type,  // Ex: 'TUBE_RECT', 'I_PROFILE', etc.
        profileName: profile.name,  // Ex: 'HSS51X51X4.8' - Use profile.name not profile.profileName
        steelGrade: profile.material?.grade,
        originalData: profile,
        processingOrder: 0,
        quantity: (profile as any).metadata?.quantity,
        orderNumber: (profile as any).metadata?.orderNumber,
        drawingNumber: (profile as any).metadata?.drawingNumber,
        phaseNumber: (profile as any).metadata?.phaseNumber,
        pieceNumber: (profile as any).metadata?.pieceNumber,
        originalFormat: 'DSTV'
      }
    };

    // CRITICAL FIX: Attach the processed geometry to the element
    // This allows GeometryConverter to use the processed geometry instead of creating new one
    if (profileGeometry) {
      (element as any).geometry = profileGeometry;
      this.log(context, 'info', `✅ Attached processed geometry to element ${element.id}`, {
        vertexCount: profileGeometry.attributes.position?.count || 0,
        hasFeatures: profile.features.length > 0
      });
    }

    // Calculer les bounds si activé
    if (this.sceneBuildingConfig.includeBounds) {
      element.metadata.bounds = await this.calculateProfileBounds(profile);
    }

    this.log(context, 'debug', `Built profile element`, {
      elementId: element.id,
      elementName: element.name,
      featureCount: profile.features.length
    });

    return element;
  }

  /**
   * Construit un élément de feature
   */
  private async buildFeatureElement(feature: NormalizedFeature, profile: NormalizedProfile, context: ProcessingContext): Promise<PivotElement | null> {
    const elementType = this.mapFeatureTypeToElementType(feature.type);
    
    if (!elementType) {
      this.log(context, 'debug', `Skipping unsupported feature type: ${feature.type}`);
      return null;
    }

    const material = await this.resolveFeatureMaterial(feature, profile, context);
    
    const element: PivotElement = {
      id: feature.id,
      name: this.generateFeatureName(feature),
      materialType: MaterialType.CUSTOM, // Features are custom elements
      visible: true,
      material,
      dimensions: {
        length: (feature.parameters as any).length || 10,
        width: (feature.parameters as any).width || 10,
        height: (feature.parameters as any).height || 10,
        thickness: (feature.parameters as any).thickness || 1
      },
      position: Array.isArray(feature.coordinates) 
        ? (feature.coordinates as unknown as [number, number, number])
        : [feature.coordinates.x, feature.coordinates.y, feature.coordinates.z || 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      childIds: [],
      metadata: {
        elementType: elementType,
        featureType: feature.type,
        workPlane: (feature.metadata as any)?.workPlane,
        processingOrder: (feature.metadata as any)?.processingOrder,
        originalBlock: (feature.metadata as any)?.originalBlock,
        originalData: feature,
        parentProfile: profile.id,
        ...feature.parameters
      }
    };

    // Calculer les bounds si activé
    if (this.sceneBuildingConfig.includeBounds && feature.geometry) {
      element.metadata.bounds = (feature.geometry as any).bounds;
    }

    return element;
  }

  /**
   * Construit la géométrie d'une feature
   */
  private async buildFeatureGeometry(feature: NormalizedFeature): Promise<any> {
    switch (feature.type) {
      case NormalizedFeatureType.HOLE:
        return {
          type: 'cylinder',
          parameters: {
            radius: feature.parameters.diameter / 2,
            height: feature.parameters.depth !== undefined ? feature.parameters.depth : 10,
            radialSegments: 16
          }
        };

      case NormalizedFeatureType.CUT:
      case NormalizedFeatureType.END_CUT:
        return {
          type: 'box',
          parameters: {
            width: feature.parameters.width,
            height: feature.parameters.height,
            depth: 10, // Profondeur par défaut
            radiusCorner: feature.parameters.radius || 0
          }
        };

      case NormalizedFeatureType.CONTOUR:
        // Convertir les points du format {x, y} vers [x, y]
        const contourPoints = feature.parameters.points ? 
          feature.parameters.points.map((p: any) => {
            if (Array.isArray(p)) {
              return p; // Déjà au bon format
            } else if (typeof p === 'object' && p !== null && 'x' in p && 'y' in p) {
              return [p.x, p.y]; // Convertir objet vers tableau
            } else {
              console.warn('Invalid point format:', p);
              return [0, 0]; // Valeur par défaut
            }
          }) : [];
        
        return {
          type: 'extrudedShape',
          parameters: {
            points: contourPoints,
            depth: 10, // Profondeur par défaut
            closed: feature.parameters.closed,
            interpolation: feature.parameters.interpolation || 'linear'
          }
        };

      case NormalizedFeatureType.MARKING:
        return {
          type: 'text',
          parameters: {
            text: feature.parameters.text,
            height: feature.parameters.height || 10,
            depth: feature.parameters.depth || 0.1,
            font: feature.parameters.font || 'arial'
          }
        };

      case NormalizedFeatureType.PUNCH:
        return {
          type: 'cylinder',
          parameters: {
            radius: feature.parameters.diameter / 2,
            height: feature.parameters.depth,
            radialSegments: 8 // Moins de segments pour un pointage
          }
        };

      default:
        return {
          type: 'point',
          parameters: {}
        };
    }
  }

  /**
   * Crée la géométrie de base du profil en utilisant vos générateurs existants
   */
  private async createProfileBaseGeometry(profile: NormalizedProfile, context?: ProcessingContext): Promise<THREE.BufferGeometry> {
    try {
      // UTILISER VOS GÉNÉRATEURS DE GÉOMÉTRIE ICI
      const geometry = await this.geometryBridge.createProfileGeometry(profile);
      
      // Utiliser console.log au lieu de this.log si pas de contexte
      console.log(`Created ${profile.type} geometry using existing generator`);
      
      return geometry;
      
    } catch (error) {
      console.error(`Error creating profile geometry: ${error}`);
      
      // Fallback en cas d'erreur
      const length = profile.dimensions.length || 1000;
      const width = profile.dimensions.crossSection?.width || 100;
      const height = profile.dimensions.crossSection?.height || 200;
      
      return new THREE.BoxGeometry(length, height, width);
    }
  }

  /**
   * Finalise la scène
   */
  private async finalizeScene(scene: PivotScene, input: DSTVNormalizedData, context: ProcessingContext): Promise<void> {
    // Calculer les bounds globales de la scène
    if (this.sceneBuildingConfig.includeBounds && scene.metadata) {
      scene.metadata.bounds = await this.calculateSceneBounds(scene);
    }

    // Mettre à jour les statistiques
    if (!scene.metadata) scene.metadata = {};
    scene.metadata.stats = {
      profileCount: input.profiles.length,
      featureCount: input.profiles.reduce((sum, p) => sum + p.features.length, 0),
      materialCount: this.geometryCache.materials.size,
      elementCount: scene.elements.size
    };

    // Optimisations pour le rendu si activées
    if (this.sceneBuildingConfig.optimizeForRendering) {
      await this.optimizeSceneForRendering(scene, context);
    }

    // Générer des niveaux de détail si activés
    if (this.sceneBuildingConfig.generateLevelOfDetail) {
      await this.generateLevelOfDetail(scene, context);
    }

    this.log(context, 'debug', `Scene finalized`, {
      bounds: scene.metadata?.bounds,
      stats: scene.metadata?.stats
    });
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  private generateSceneId(profile: NormalizedProfile): string {
    return `dstv_scene_${profile.id}_${Date.now()}`;
  }

  private generateFeatureName(feature: NormalizedFeature): string {
    const typeNames: Partial<Record<NormalizedFeatureType, string>> = {
      [NormalizedFeatureType.HOLE]: 'Hole',
      [NormalizedFeatureType.CUT]: 'Cut',
      [NormalizedFeatureType.CONTOUR]: 'Contour',
      [NormalizedFeatureType.MARKING]: 'Marking',
      [NormalizedFeatureType.PUNCH]: 'Punch',
      [NormalizedFeatureType.WELD_PREP]: 'Weld Prep',
      [NormalizedFeatureType.THREAD]: 'Thread',
      [NormalizedFeatureType.BEND]: 'Bend',
      [NormalizedFeatureType.NOTCH]: 'Notch',
      [NormalizedFeatureType.PROFILE]: 'Profile',
      [NormalizedFeatureType.UNRESTRICTED_CONTOUR]: 'Unrestricted Contour',
      [NormalizedFeatureType.BEVEL]: 'Bevel',
      [NormalizedFeatureType.VOLUME]: 'Volume',
      [NormalizedFeatureType.NUMERIC_CONTROL]: 'NC',
      [NormalizedFeatureType.FREE_PROGRAM]: 'Free Program',
      [NormalizedFeatureType.LINE_PROGRAM]: 'Line Program',
      [NormalizedFeatureType.ROTATION]: 'Rotation',
      [NormalizedFeatureType.WASHING]: 'Washing',
      [NormalizedFeatureType.GROUP]: 'Group',
      [NormalizedFeatureType.VARIABLE]: 'Variable'
    };

    const baseName = typeNames[feature.type] || 'Feature';
    return `${baseName} ${feature.id.split('_').pop()}`;
  }

  private mapFeatureType(featureType: NormalizedFeatureType): FeatureType {
    // Map DSTV feature types to viewer FeatureType enum
    switch(featureType) {
      case NormalizedFeatureType.HOLE:
        return FeatureType.HOLE;
      case NormalizedFeatureType.THREAD:
        return FeatureType.THREAD;
      case NormalizedFeatureType.CUT:
        return FeatureType.CUT;
      case NormalizedFeatureType.END_CUT:
        return FeatureType.END_CUT;
      case NormalizedFeatureType.CUT_WITH_NOTCHES:
        return FeatureType.CUT;
      case NormalizedFeatureType.CONTOUR:
        return FeatureType.CONTOUR;
      case NormalizedFeatureType.UNRESTRICTED_CONTOUR:
        return FeatureType.UNRESTRICTED_CONTOUR;
      case NormalizedFeatureType.NOTCH:
        return FeatureType.NOTCH;
      case NormalizedFeatureType.BEVEL:
        return FeatureType.BEVEL;
      case NormalizedFeatureType.BEND:
        return FeatureType.BEND;
      case NormalizedFeatureType.MARKING:
        return FeatureType.MARKING;
      case NormalizedFeatureType.WELD_PREP:
        return FeatureType.WELD_PREP;
      case NormalizedFeatureType.PUNCH:
        return FeatureType.PUNCH;
      case NormalizedFeatureType.PROFILE:
        return FeatureType.PROFILE;
      case NormalizedFeatureType.VOLUME:
        return FeatureType.VOLUME;
      case NormalizedFeatureType.NUMERIC_CONTROL:
        return FeatureType.NUMERIC_CONTROL;
      case NormalizedFeatureType.FREE_PROGRAM:
        return FeatureType.FREE_PROGRAM;
      case NormalizedFeatureType.LINE_PROGRAM:
        return FeatureType.LINE_PROGRAM;
      case NormalizedFeatureType.ROTATION:
        return FeatureType.ROTATION;
      case NormalizedFeatureType.WASHING:
        return FeatureType.WASHING;
      case NormalizedFeatureType.GROUP:
        return FeatureType.GROUP;
      case NormalizedFeatureType.VARIABLE:
        return FeatureType.VARIABLE;
      default:
        return FeatureType.CUT; // Default fallback
    }
  }

  private mapFeatureTypeToElementType(featureType: NormalizedFeatureType): ElementType | null {
    const mapping: Partial<Record<NormalizedFeatureType, ElementType>> = {
      [NormalizedFeatureType.HOLE]: ElementType.HOLE,
      [NormalizedFeatureType.CUT]: ElementType.CUT,
      [NormalizedFeatureType.CONTOUR]: ElementType.FEATURE,
      [NormalizedFeatureType.MARKING]: ElementType.MARKING,
      [NormalizedFeatureType.PUNCH]: ElementType.FEATURE,
      [NormalizedFeatureType.WELD_PREP]: ElementType.WELD,
      [NormalizedFeatureType.THREAD]: ElementType.HOLE,
      [NormalizedFeatureType.BEND]: ElementType.FEATURE
    };

    return mapping[featureType] || null;
  }

  private async resolveMaterial(materialInfo: { grade: string; properties?: Record<string, any> }, context: ProcessingContext): Promise<MaterialProperties> {
    const cacheKey = `material_${materialInfo.grade}`;
    
    if (this.sceneBuildingConfig.enableGeometryCache && this.geometryCache.materials.has(cacheKey)) {
      return this.geometryCache.materials.get(cacheKey)!;
    }

    const material: MaterialProperties = {
      grade: materialInfo.grade,
      density: materialInfo.properties?.density || 7850, // kg/m³
      color: this.colorObjectToHex(this.getSteelColor(materialInfo.grade)),
      opacity: 1.0,
      metallic: 0.8,
      roughness: 0.3,
      reflectivity: 0.7
    };

    if (this.sceneBuildingConfig.enableGeometryCache) {
      this.geometryCache.materials.set(cacheKey, material);
    }

    return material;
  }

  private async resolveFeatureMaterial(feature: NormalizedFeature, profile: NormalizedProfile, context: ProcessingContext): Promise<MaterialProperties> {
    // Les features utilisent généralement le même matériau que le profil parent
    // mais peuvent avoir des propriétés visuelles différentes
    const baseMaterial = await this.resolveMaterial(profile.material, context);
    
    return {
      ...baseMaterial,
      color: this.colorObjectToHex(this.getFeatureColor(feature.type))
    };
  }

  private colorObjectToHex(color: { r: number; g: number; b: number; a: number }): string {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  private getSteelColor(grade: string): { r: number; g: number; b: number; a: number } {
    // Couleurs typiques pour différents grades d'acier
    const colors: Record<string, { r: number; g: number; b: number; a: number }> = {
      'S235': { r: 0.7, g: 0.7, b: 0.7, a: 1.0 }, // Gris clair
      'S275': { r: 0.6, g: 0.6, b: 0.6, a: 1.0 }, // Gris
      'S355': { r: 0.5, g: 0.5, b: 0.5, a: 1.0 }  // Gris foncé
    };
    
    return colors[grade.toUpperCase()] || { r: 0.6, g: 0.6, b: 0.6, a: 1.0 };
  }

  private mapToMaterialType(profileType: string): MaterialType {
    // Map DSTV profile types to MaterialType enum
    const type = profileType.toUpperCase();
    
    // Handle specific profile types
    if (type.includes('TUBE_RECT') || type.includes('TUBE_ROUND')) {
      return MaterialType.TUBE;
    }
    if (type.includes('I_PROFILE')) {
      return MaterialType.BEAM;
    }
    if (type.includes('L_PROFILE')) {
      return MaterialType.ANGLE;
    }
    if (type.includes('U_PROFILE') || type.includes('C_PROFILE')) {
      return MaterialType.CHANNEL;
    }
    if (type.includes('T_PROFILE')) {
      return MaterialType.TEE;
    }
    
    // Fallback to simpler checks
    switch (profileType.toLowerCase()) {
      case 'l':
      case 'angle':
        return MaterialType.ANGLE;
      case 'u':
      case 'channel':
        return MaterialType.CHANNEL;
      case 'i':
      case 'beam':
        return MaterialType.BEAM;
      case 't':
      case 'tee':
        return MaterialType.TEE;
      case 'plate':
        return MaterialType.PLATE;
      case 'tube':
        return MaterialType.TUBE;
      case 'bar':
        return MaterialType.BAR;
      default:
        return MaterialType.BEAM; // Default fallback
    }
  }

  private getFeatureColor(featureType: NormalizedFeatureType): { r: number; g: number; b: number; a: number } {
    const colors: Record<NormalizedFeatureType, { r: number; g: number; b: number; a: number }> = {
      [NormalizedFeatureType.HOLE]: { r: 0.2, g: 0.2, b: 0.8, a: 0.8 }, // Bleu
      [NormalizedFeatureType.CUT]: { r: 0.8, g: 0.2, b: 0.2, a: 0.8 },   // Rouge
      [NormalizedFeatureType.END_CUT]: { r: 0.9, g: 0.1, b: 0.1, a: 0.9 }, // Rouge vif pour les coupes d'extrémité
      [NormalizedFeatureType.CONTOUR]: { r: 0.2, g: 0.8, b: 0.2, a: 0.8 }, // Vert
      [NormalizedFeatureType.NOTCH]: { r: 0.8, g: 0.2, b: 0.2, a: 0.8 }, // Rouge foncé
      [NormalizedFeatureType.CUT_WITH_NOTCHES]: { r: 0.9, g: 0.3, b: 0.2, a: 0.8 }, // Rouge orangé
      [NormalizedFeatureType.MARKING]: { r: 0.8, g: 0.8, b: 0.2, a: 1.0 }, // Jaune
      [NormalizedFeatureType.PUNCH]: { r: 0.8, g: 0.4, b: 0.2, a: 1.0 }, // Orange
      [NormalizedFeatureType.WELD_PREP]: { r: 0.6, g: 0.2, b: 0.8, a: 0.8 }, // Violet
      [NormalizedFeatureType.THREAD]: { r: 0.2, g: 0.6, b: 0.8, a: 0.8 }, // Cyan
      [NormalizedFeatureType.BEND]: { r: 0.8, g: 0.2, b: 0.6, a: 0.8 }, // Magenta
      [NormalizedFeatureType.PROFILE]: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 }, // Gris
      [NormalizedFeatureType.UNRESTRICTED_CONTOUR]: { r: 0.2, g: 0.6, b: 0.2, a: 0.8 }, // Vert foncé
      [NormalizedFeatureType.BEVEL]: { r: 0.8, g: 0.6, b: 0.2, a: 0.8 }, // Orange doré
      [NormalizedFeatureType.VOLUME]: { r: 0.6, g: 0.6, b: 0.6, a: 0.5 }, // Gris translucide
      [NormalizedFeatureType.NUMERIC_CONTROL]: { r: 0.2, g: 0.8, b: 0.8, a: 1.0 }, // Cyan vif
      [NormalizedFeatureType.FREE_PROGRAM]: { r: 0.8, g: 0.2, b: 0.8, a: 1.0 }, // Magenta vif
      [NormalizedFeatureType.LINE_PROGRAM]: { r: 0.4, g: 0.8, b: 0.2, a: 1.0 }, // Vert lime
      [NormalizedFeatureType.ROTATION]: { r: 0.8, g: 0.4, b: 0.6, a: 0.8 }, // Rose
      [NormalizedFeatureType.WASHING]: { r: 0.4, g: 0.6, b: 0.8, a: 0.8 }, // Bleu clair
      [NormalizedFeatureType.GROUP]: { r: 0.7, g: 0.7, b: 0.7, a: 0.6 }, // Gris clair
      [NormalizedFeatureType.VARIABLE]: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 } // Gris neutre
    };
    
    return colors[featureType] || { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
  }

  private async calculateProfileBounds(profile: NormalizedProfile): Promise<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }> {
    // Calculer les bounds basées sur les dimensions du profil et les features
    const crossSection = profile.dimensions.crossSection;
    const length = profile.dimensions.length;
    
    const bounds = {
      min: { x: -crossSection.width / 2 || 0, y: -crossSection.height / 2 || 0, z: 0 },
      max: { x: crossSection.width / 2 || 0, y: crossSection.height / 2 || 0, z: length }
    };

    // Étendre les bounds pour inclure toutes les features
    for (const feature of profile.features) {
      if (feature.geometry?.bounds) {
        const featureBounds = feature.geometry.bounds;
        bounds.min.x = Math.min(bounds.min.x, featureBounds.min.x);
        bounds.min.y = Math.min(bounds.min.y, featureBounds.min.y);
        bounds.min.z = Math.min(bounds.min.z, featureBounds.min.z);
        bounds.max.x = Math.max(bounds.max.x, featureBounds.max.x);
        bounds.max.y = Math.max(bounds.max.y, featureBounds.max.y);
        bounds.max.z = Math.max(bounds.max.z, featureBounds.max.z);
      }
    }

    return bounds;
  }

  private async calculateSceneBounds(scene: PivotScene): Promise<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }> {
    let bounds = {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity }
    };

    for (const element of scene.elements.values()) {
      if ((element as any).bounds) {
        bounds.min.x = Math.min(bounds.min.x, (element as any).bounds.min.x);
        bounds.min.y = Math.min(bounds.min.y, (element as any).bounds.min.y);
        bounds.min.z = Math.min(bounds.min.z, (element as any).bounds.min.z);
        bounds.max.x = Math.max(bounds.max.x, (element as any).bounds.max.x);
        bounds.max.y = Math.max(bounds.max.y, (element as any).bounds.max.y);
        bounds.max.z = Math.max(bounds.max.z, (element as any).bounds.max.z);
      }
    }

    // Si pas de bounds trouvées, utiliser des valeurs par défaut
    if (bounds.min.x === Infinity) {
      bounds = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 }
      };
    }

    return bounds;
  }

  private async optimizeSceneForRendering(scene: PivotScene, context: ProcessingContext): Promise<void> {
    // Optimisations de rendu (instancing, merging, etc.)
    this.log(context, 'debug', 'Applying rendering optimizations');
    
    // TODO: Implémenter optimisations spécifiques
    // - Instancing pour features similaires
    // - Merging de géométries simples
    // - LOD automatique
  }

  private async generateLevelOfDetail(scene: PivotScene, context: ProcessingContext): Promise<void> {
    // Génération de niveaux de détail
    this.log(context, 'debug', 'Generating levels of detail');
    
    // TODO: Implémenter génération LOD
    // - Simplification géométrique
    // - Texture atlasing
    // - Distance-based switching
  }
}