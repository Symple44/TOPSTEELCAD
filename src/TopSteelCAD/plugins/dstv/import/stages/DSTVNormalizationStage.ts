/**
 * Stage de normalisation DSTV
 * 
 * Quatrième étape du pipeline - convertit les données DSTV validées vers le format pivot interne.
 * Cette étape transforme les structures DSTV spécifiques en représentations génériques réutilisables.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';
import { DSTVValidatedData, DSTVNormalizedData } from '../DSTVImportPipeline';
import { DSTVParsedBlock } from './DSTVSyntaxStage';
import { DSTVBlockType } from '../types/dstv-types';
import { StandardFace } from '../../../../core/coordinates/types';
import { PositionService } from '../../../../core/services/PositionService';

/**
 * Types de features normalisées
 */
export enum NormalizedFeatureType {
  HOLE = 'hole',
  CUT = 'cut',
  END_CUT = 'end_cut',  // Coupe droite d'extrémité (pas un contour)
  CONTOUR = 'contour',
  NOTCH = 'notch',
  CUT_WITH_NOTCHES = 'cut_with_notches',  // Nouveau type pour les coupes avec encoches partielles
  MARKING = 'marking',
  PUNCH = 'punch',
  WELD_PREP = 'weld_preparation',
  THREAD = 'thread',
  BEND = 'bend',
  PROFILE = 'profile',
  UNRESTRICTED_CONTOUR = 'unrestricted_contour',
  BEVEL = 'bevel',
  VOLUME = 'volume',
  NUMERIC_CONTROL = 'numeric_control',
  FREE_PROGRAM = 'free_program',
  LINE_PROGRAM = 'line_program',
  ROTATION = 'rotation',
  WASHING = 'washing',
  GROUP = 'group',
  VARIABLE = 'variable'
}

/**
 * Feature normalisée générique
 */
export interface NormalizedFeature {
  id: string;
  type: NormalizedFeatureType;
  coordinates: {
    x: number;
    y: number;
    z?: number;
  };
  parameters: Record<string, any>;
  metadata: {
    originalBlock: DSTVBlockType;
    workPlane: string;
    processingOrder?: number;
    applyOnly?: boolean;  // Si true, la feature est appliquée à la géométrie mais pas créée comme élément séparé
    originalDSTVCoords?: { x: number; y: number; z?: number };  // Coordonnées DSTV originales pour débogage
    face?: StandardFace | undefined;  // Face sur laquelle la feature est appliquée
    [key: string]: any;  // Permettre d'autres propriétés metadata
  };
  geometry?: {
    bounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
    area?: number;
    perimeter?: number;
  };
}

/**
 * Profil normalisé
 */
export interface NormalizedProfile {
  id: string;
  name: string;
  type: string;
  material: {
    grade: string;
    properties?: Record<string, any>;
  };
  dimensions: {
    length: number;
    crossSection: Record<string, number>;
  };
  features: NormalizedFeature[];
  metadata: {
    orderNumber?: string;
    drawingNumber?: string;
    phaseNumber?: string;
    pieceNumber?: string;
    quantity: number;
    createdDate?: string;
    originalFormat: 'DSTV';
  };
}

/**
 * Configuration de la normalisation
 */
interface DSTVNormalizationConfig {
  enableGeometryCache: boolean;
  coordinateSystem: 'right-handed' | 'left-handed';
  units: 'mm' | 'inch';
  featureIdPrefix: string;
  generateGeometryInfo: boolean;
}

/**
 * Stage de normalisation DSTV
 */
export class DSTVNormalizationStage extends BaseStage<DSTVValidatedData, DSTVNormalizedData> {
  readonly name = 'dstv-normalization';
  readonly description = 'DSTV Normalization - Converts DSTV data to normalized internal format';
  readonly estimatedDuration = 100; // 100ms en moyenne

  private normalizationConfig: DSTVNormalizationConfig;
  private featureCounter = 0;
  private currentProfileDimensions: { length: number; height: number; width: number } | null = null;
  private currentProfileType: string = 'I_PROFILE';
  private positionService: PositionService;

  constructor(config: any = {}) {
    super(config);
    
    this.normalizationConfig = {
      enableGeometryCache: config.enableGeometryCache !== false,
      coordinateSystem: config.coordinateSystem || 'right-handed',
      units: config.units || 'mm',
      featureIdPrefix: config.featureIdPrefix || 'dstv_',
      generateGeometryInfo: config.generateGeometryInfo !== false,
      ...config.normalization
    };
    
    this.positionService = PositionService.getInstance();
  }

  /**
   * Normalisation principale
   */
  async process(input: DSTVValidatedData, context: ProcessingContext): Promise<DSTVNormalizedData> {
    const stopTimer = this.startTimer();
    
    try {
      this.featureCounter = 0;
      
      this.log(context, 'info', `Starting normalization`, {
        validBlocks: input.validBlocks.length,
        conformityScore: `${(input.conformityScore * 100).toFixed(1)}%`
      });

      // Extraire le profil principal du bloc ST
      const profile = await this.extractProfile(input.validBlocks as any, context);
      
      // Normaliser toutes les features
      const features = await this.normalizeAllFeatures(input.validBlocks as any, context);
      
      // Assigner les features au profil
      profile.features = features;
      
      // Calculer les métadonnées globales
      const metadata = this.generateNormalizationMetadata(input, profile);
      
      const duration = stopTimer();
      context.addMetric('normalization_duration', duration);
      context.addMetric('features_normalized', features.length);
      
      this.log(context, 'info', `Normalization completed`, {
        featuresNormalized: features.length,
        profileName: profile.name,
        duration: `${duration.toFixed(2)}ms`
      });

      return {
        profiles: [profile as any], // DSTV = une pièce par fichier
        metadata
      };

    } catch (error) {
      const duration = stopTimer();
      context.addMetric('normalization_duration', duration);
      context.addMetric('normalization_error', true);
      
      this.log(context, 'error', `Normalization failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Extrait le profil principal du bloc ST
   */
  private async extractProfile(blocks: DSTVParsedBlock[], context: ProcessingContext): Promise<NormalizedProfile> {
    const stBlock = blocks.find(b => b.type === DSTVBlockType.ST);
    
    if (!stBlock) {
      throw new Error('Cannot normalize profile: missing ST block');
    }

    const data = stBlock.data;
    console.log(`📦 ST Block data received:`, JSON.stringify(data, null, 2));
    
    // Extraire les dimensions de la section
    const crossSection = this.extractCrossSectionFromSTData(data);
    
    // Stocker le type de profil pour la conversion des coordonnées
    // Mapper le code DSTV vers le type de profil interne
    const profileTypeMapping: Record<string, string> = {
      'I': 'I_PROFILE',
      'U': 'U_PROFILE',
      'L': 'L_PROFILE',
      'T': 'T_PROFILE',
      'Z': 'Z_PROFILE',
      'C': 'C_PROFILE',
      'M': 'TUBE_RECT',
      'R': 'TUBE_ROUND',
      'P': 'PIPE',
      'B': 'PLATE'  // Ajout du type plaque
    };
    
    const dstvProfileType = data.profileType || crossSection.profileType;
    this.currentProfileType = profileTypeMapping[dstvProfileType] || dstvProfileType || 'I_PROFILE';
    
    console.log(`📐 Profile type mapping: DSTV="${dstvProfileType}" → Internal="${this.currentProfileType}"`);
    
    // Stocker les dimensions pour la conversion des coordonnées
    // Pour les plaques, la longueur est stockée dans crossSection.height
    let profileLength = data.length || data.profileLength || 0;
    if ((dstvProfileType === 'B' || this.currentProfileType === 'PLATE') && crossSection.height > 0) {
      profileLength = crossSection.height;  // Pour une plaque, la hauteur est en fait la longueur
    }
    
    this.currentProfileDimensions = {
      length: profileLength,
      height: crossSection.height || 0,
      width: crossSection.width || 0
    };
    
    console.log(`📐 Profile dimensions set for coordinate conversion:`, this.currentProfileDimensions);
    
    const mappedType = this.mapProfileTypeToStandard(data.profileName, data.profileType);
    console.log(`🔍 Mapping profile type: profileName="${data.profileName}", profileType="${data.profileType}" → mappedType="${mappedType}"`);
    
    const profile: NormalizedProfile = {
      id: this.generateProfileId(data),
      // Privilégier pieceNumber (M1002) pour l'affichage plutôt que profileName (UB254x146x31)
      name: data.pieceNumber || data.profileName || 'Unknown Profile',
      type: mappedType,
      material: {
        grade: data.steelGrade || 'Unknown',
        properties: this.extractMaterialProperties(data.steelGrade)
      },
      dimensions: {
        length: profileLength,  // Utiliser la longueur corrigée
        crossSection
      },
      features: [], // Sera rempli plus tard
      metadata: {
        orderNumber: data.orderNumber,
        drawingNumber: data.drawingNumber,
        phaseNumber: data.phaseNumber,
        pieceNumber: data.pieceNumber,
        profileName: data.profileName,  // Stocker le nom du profil original (ex: UB254x146x31)
        quantity: data.quantity || 1,
        createdDate: data.createdDate,
        originalFormat: 'DSTV'
      }
    };

    this.log(context, 'debug', `Extracted profile`, {
      name: profile.name,
      type: profile.type,
      material: profile.material.grade,
      dimensions: this.currentProfileDimensions
    });

    return profile;
  }

  /**
   * Normalise toutes les features
   */
  private async normalizeAllFeatures(blocks: DSTVParsedBlock[], context: ProcessingContext): Promise<NormalizedFeature[]> {
    const features: NormalizedFeature[] = [];
    
    // Détecter et fusionner les patterns M1002 (3 blocs AK, pas forcément consécutifs)
    const processedIndices = new Set<number>();
    
    // D'abord, collecter tous les blocs AK
    const akBlocks: { index: number; block: DSTVParsedBlock }[] = [];
    blocks.forEach((block, index) => {
      if (block.type === DSTVBlockType.AK) {
        akBlocks.push({ index, block });
      }
    });
    
    // Vérifier si on a un pattern de notches (plusieurs blocs AK liés)
    if (akBlocks.length >= 2) {
      // Analyser tous les blocs AK pour détecter un pattern
      const allAkBlocks = akBlocks.map(item => item.block);
      
      if (this.isNotchPattern(allAkBlocks)) {
        console.log(`  🎯 Détection d'un pattern de notches : traitement de ${akBlocks.length} blocs AK`);
        
        // Identifier le bloc principal (celui avec le plus de points ou sur l'âme)
        let mainBlockIndex = akBlocks.findIndex(item => 
          item.block.data.face === 'web' || item.block.data.face === 'v'
        );
        
        // Si pas de bloc sur l'âme, prendre celui avec le plus de points
        if (mainBlockIndex === -1) {
          mainBlockIndex = 0;
          let maxPoints = 0;
          akBlocks.forEach((item, index) => {
            const pointCount = item.block.data.points?.length || 0;
            if (pointCount > maxPoints) {
              maxPoints = pointCount;
              mainBlockIndex = index;
            }
          });
        }
        
        // Créer la feature de notches à partir du bloc principal
        const mainBlock = akBlocks[mainBlockIndex];
        const notchFeatures = await this.createNotchFeatures(mainBlock.block, allAkBlocks, context);
        features.push(...notchFeatures);
        
        // Marquer tous les blocs AK comme traités
        akBlocks.forEach(item => processedIndices.add(item.index));
      }
    }
    
    // Traiter les autres blocs normalement
    for (let i = 0; i < blocks.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const block = blocks[i];
      
      if (block.type === DSTVBlockType.ST || block.type === DSTVBlockType.EN) {
        continue; // Ignorer les blocs non-feature
      }

      try {
        const normalizedFeatures = await this.normalizeBlockToFeatures(block, context);
        // Filtrer les features nulles (forme de base du profil)
        const validFeatures = normalizedFeatures.filter(f => f !== null && f !== undefined);
        features.push(...validFeatures);
      } catch (error) {
        this.log(context, 'warn', `Failed to normalize block ${block.type}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Trier les features par ordre de traitement recommandé
    features.sort(this.getFeatureProcessingOrder.bind(this));

    return features;
  }

  /**
   * Normalise un bloc en une ou plusieurs features
   */
  private async normalizeBlockToFeatures(block: DSTVParsedBlock, context: ProcessingContext): Promise<NormalizedFeature[]> {
    switch (block.type) {
      case DSTVBlockType.BO:
        return await this.normalizeBOBlock(block);  // Retourne maintenant un tableau
      case DSTVBlockType.AK:
        return await this.normalizeAKBlock(block); // Retourne déjà un tableau
      case DSTVBlockType.IK:
        return await this.normalizeIKBlock(block); // Retourne déjà un tableau
      case DSTVBlockType.SI:
        return [await this.normalizeSIBlock(block)];
      case DSTVBlockType.SC:
        return [await this.normalizeSCBlock(block)];
      case DSTVBlockType.PU:
        return [await this.normalizePUBlock(block)];
      case DSTVBlockType.KO:
        return [await this.normalizeKOBlock(block)];
      case DSTVBlockType.TO:
        return [await this.normalizeTOBlock(block)];
      case DSTVBlockType.KA:
        return [await this.normalizeKABlock(block)];
      case DSTVBlockType.PR:
        return [await this.normalizePRBlock(block)];
      case DSTVBlockType.UE:
        return await this.normalizeUEBlock(block);
      case DSTVBlockType.BR:
        return [await this.normalizeBRBlock(block)];
      case DSTVBlockType.VO:
        return [await this.normalizeVOBlock(block)];
      case DSTVBlockType.NU:
        return [await this.normalizeNUBlock(block)];
      case DSTVBlockType.FP:
        return [await this.normalizeFPBlock(block)];
      case DSTVBlockType.LP:
        return [await this.normalizeLPBlock(block)];
      case DSTVBlockType.RT:
        return [await this.normalizeRTBlock(block)];
      case DSTVBlockType.WA:
        return [await this.normalizeWABlock(block)];
      // Blocs moins courants - traitement générique
      case DSTVBlockType.EB:
      case DSTVBlockType.VB:
      case DSTVBlockType.GR:
      case DSTVBlockType.FB:
      case DSTVBlockType.BF:
      case DSTVBlockType.KL:
      case DSTVBlockType.KN:
      case DSTVBlockType.RO:
        return [await this.normalizeGenericBlock(block)];
      default:
        this.log(context, 'debug', `Skipping unsupported block type: ${block.type}`);
        return [];
    }
  }

  // ================================
  // NORMALISEURS SPÉCIFIQUES PAR BLOC
  // ================================

  /**
   * Normalise un bloc TO (Threading)
   */
  private async normalizeTOBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    // Utiliser les dimensions stockées ou des valeurs par défaut
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Utiliser le nouveau système de coordonnées
    const positionContext = {
      profileType: this.currentProfileType || 'I_PROFILE',
      dimensions: dims,
      face: data.face || 'web'
    };
    
    const standardPosition = this.positionService.convertPosition(
      { x: data.x, y: data.y, z: data.z || 0 },
      'dstv',
      positionContext
    );
    
    const standardCoords = {
      x: standardPosition.position.x,
      y: standardPosition.position.y,
      z: standardPosition.position.z
    };
    
    return {
      id: this.generateFeatureId('thread'),
      type: NormalizedFeatureType.THREAD,
      coordinates: standardCoords,
      parameters: {
        diameter: data.diameter,
        depth: data.depth !== undefined ? data.depth : ((dims as any).thickness || 10),
        pitch: data.pitch || 2.5,
        threadType: data.threadType || 'metric',
        threadClass: data.threadClass
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
        originalDSTVCoords: { x: data.x, y: data.y, z: data.z || 0 },
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc KA (Bending)
   */
  private async normalizeKABlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('bend'),
      type: NormalizedFeatureType.BEND,
      coordinates: {
        x: data.x || 0,
        y: data.y || 0,
        z: data.z || 0
      },
      parameters: {
        angle: data.angle || 90,
        radius: data.radius || 5,
        position: data.position || 0,
        axis: data.axis || 'x',
        direction: data.direction || 'up'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc PR (Profile)
   */
  private async normalizePRBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('profile'),
      type: NormalizedFeatureType.PROFILE,
      coordinates: {
        x: 0,
        y: 0,
        z: 0
      },
      parameters: {
        profileType: data.profileType || this.mapProfileTypeToStandard(data.profileName),
        profileName: data.profileName,
        dimensions: {
          length: data.length,
          width: data.width,
          height: data.height,
          thickness: data.thickness,
          webThickness: data.webThickness,
          flangeThickness: data.flangeThickness
        },
        material: data.material || 'S235'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: 'E0',
        processingOrder: 0, // Le profil est toujours traité en premier
        applyOnly: true // Le profil définit la géométrie de base
      }
    };
  }

  /**
   * Normalise un bloc UE (Unrestricted Contour)
   */
  private async normalizeUEBlock(block: DSTVParsedBlock): Promise<NormalizedFeature[]> {
    const data = block.data;
    
    // Utiliser les dimensions stockées ou des valeurs par défaut
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Créer le contexte pour la conversion de face
    const positionContext = {
      profileType: this.currentProfileType || 'I_PROFILE',
      dimensions: dims,
      face: data.face || 'web'
    };
    
    return [{
      id: this.generateFeatureId('unrestricted_contour'),
      type: NormalizedFeatureType.UNRESTRICTED_CONTOUR,
      coordinates: this.calculateContourCenter(data.points),
      parameters: {
        points: data.points,
        closed: data.closed !== false,
        bulge: data.bulge || [],
        depth: data.depth !== undefined ? data.depth : ((dims as any).thickness || 10),
        operation: data.operation || 'subtract',
        subContours: data.subContours
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    }];
  }

  /**
   * Normalise un bloc BO (Hole)
   */
  private async normalizeBOBlock(block: DSTVParsedBlock): Promise<NormalizedFeature[]> {
    const data = block.data;
    
    // Utiliser les dimensions stockées ou des valeurs par défaut
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Si le bloc contient un tableau de trous
    if (data.holes && Array.isArray(data.holes)) {
      const features: NormalizedFeature[] = [];
      
      for (const hole of data.holes) {
        // Utiliser le nouveau système de coordonnées
        const positionContext = {
          profileType: this.currentProfileType || 'I_PROFILE',
          dimensions: dims,
          face: hole.face || 'web',
          featureType: 'hole'  // Ajouter le type de feature pour la conversion correcte
        };
        
        
        const standardPosition = this.positionService.convertPosition(
          { x: hole.x, y: hole.y, z: hole.z || 0, featureType: 'hole' },
          'dstv',
          positionContext
        );
        
        const standardCoords = {
          x: standardPosition.position.x,
          y: standardPosition.position.y,
          z: standardPosition.position.z
        };
        
        
        const holeDepth = hole.depth !== undefined ? hole.depth : 0;
        console.log(`  📐 BO normalization: hole.depth=${hole.depth}, normalized depth=${holeDepth}`);
        
        const feature: NormalizedFeature = {
          id: this.generateFeatureId('hole'),
          type: NormalizedFeatureType.HOLE,
          coordinates: standardCoords,
          parameters: {
            diameter: hole.diameter,
            depth: holeDepth,  // 0 = through hole
            angle: hole.angle || 0,
            tolerance: hole.tolerance,
            holeType: 'round',
            face: hole.face || 'web'
          },
          metadata: {
            originalBlock: block.type,
            workPlane: hole.plane || 'E0',
            processingOrder: this.getBlockProcessingPriority(block.type),
            originalDSTVCoords: { x: hole.x, y: hole.y, z: hole.z || 0 },
            profileType: this.currentProfileType,  // Ajouter le type de profil pour le mapping des faces
            applyOnly: true  // Les features DSTV sont appliquées à la géométrie, pas créées comme éléments séparés
          }
        };

        // Calculer les informations géométriques
        if (this.normalizationConfig.generateGeometryInfo) {
          const radius = hole.diameter / 2;
          feature.geometry = {
            bounds: {
              min: { x: hole.x - radius, y: hole.y - radius, z: 0 },
              max: { x: hole.x + radius, y: hole.y + radius, z: hole.depth || 0 }
            },
            area: Math.PI * radius * radius,
            perimeter: 2 * Math.PI * radius
          };
        }
        
        features.push(feature);
      }
      
      return features;
    } 
    
    // Ancien format avec un seul trou (pour compatibilité)
    const positionContext = {
      profileType: this.currentProfileType || 'I_PROFILE',
      dimensions: dims,
      face: data.face || 'web'
    };
    
    const standardPosition = this.positionService.convertPosition(
      { x: data.x, y: data.y, z: data.z || 0 },
      'dstv',
      positionContext
    );
    
    const standardCoords = {
      x: standardPosition.position.x,
      y: standardPosition.position.y,
      z: standardPosition.position.z
    };
    
    
    const feature: NormalizedFeature = {
      id: this.generateFeatureId('hole'),
      type: NormalizedFeatureType.HOLE,
      coordinates: standardCoords,
      parameters: {
        diameter: data.diameter,
        depth: data.depth || 0,  // 0 = through hole
        angle: data.angle || 0,
        tolerance: data.tolerance,
        holeType: 'round',
        face: data.face || 'web'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type),
        originalDSTVCoords: { x: data.x, y: data.y, z: data.z || 0 },
        applyOnly: true  // Les features DSTV sont appliquées à la géométrie, pas créées comme éléments séparés
      }
    };

    // Calculer les informations géométriques
    if (this.normalizationConfig.generateGeometryInfo) {
      const radius = data.diameter / 2;
      feature.geometry = {
        bounds: {
          min: { x: data.x - radius, y: data.y - radius, z: 0 },
          max: { x: data.x + radius, y: data.y + radius, z: data.depth || 0 }
        },
        area: Math.PI * radius * radius,
        perimeter: 2 * Math.PI * radius
      };
    }

    return [feature];
  }

  /**
   * Normalise un bloc AK (Outer contour)
   * Détecte automatiquement si le contour représente des notches aux extrémités
   * Pour les tubes, peut retourner plusieurs features (START et END cuts)
   */
  private async normalizeAKBlock(block: DSTVParsedBlock): Promise<NormalizedFeature[]> {
    const data = block.data;
    
    // IMPORTANT: Pour les tubes HSS, les contours AK définissent la FORME FINALE
    // après coupe, PAS ce qu'il faut couper (inverse des profils I)
    const profileType = this.currentProfileType;
    console.log(`  🔍 AK Processing - Current profile type: ${profileType}`);
    console.log(`  🔍 AK Processing - Profile dimensions:`, this.currentProfileDimensions);
    
    if (profileType === 'TUBE_RECT' || profileType === 'TUBE_ROUND') {
      console.log(`  🎯 TUBE DETECTED (${profileType}): Processing AK as final shape`);
      const tubeFeatures = await this.processTubeAKContour(block);
      return tubeFeatures; // Retourne un tableau de features pour les tubes
    }
    
    // Vérifier si c'est un contour rectangulaire complet (forme de base du profil)
    const isProfileShape = this.isProfileBaseShape(data.points, data.face);
    
    if (isProfileShape) {
      // Ne pas créer de feature pour la forme de base du profil
      console.log(`  📐 AK block detected as profile base shape - skipping`);
      return []; // Retourne un tableau vide au lieu de null
    }
    
    // Analyser le type de contour avec la nouvelle méthode détaillée
    console.log(`  🔍 Analyzing contour type for ${data.points?.length || 0} points on face ${data.face || 'unknown'}`);
    const contourType = this.analyzeContourType(data.points, data.face);
    console.log(`  🔍 Contour type result: ${contourType}`);
    
    // Traitement des coupes d'angle complètes sur tubes
    if (contourType === 'ANGLE_CUT') {
      console.log(`  🔺 AK block detected as ANGLE CUT on tube`);
      
      // Calculer les dimensions pour la conversion de coordonnées
      const dims = this.currentProfileDimensions || {
        length: 2259.98,
        height: 50.8,
        width: 50.8
      };
      
      // Convertir le centre du contour vers le nouveau système
      const contourCenter = this.calculateContourCenter(data.points);
      const positionContext = {
        profileType: this.currentProfileType || 'TUBE_RECT',
        dimensions: dims,
        face: data.face || 'web'
      };
      
      const standardPosition = this.positionService.convertPosition(
        contourCenter,
        'dstv',
        positionContext
      );
      
      const standardCoords = {
        x: standardPosition.position.x,
        y: standardPosition.position.y,
        z: standardPosition.position.z
      };
      
      const feature: NormalizedFeature = {
        id: this.generateFeatureId('angle-cut'),
        type: NormalizedFeatureType.CUT,
        coordinates: standardCoords,
        parameters: {
          // Convertir les points pour le CutProcessor
          points: data.points ? data.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : [],
          closed: true, // Les coupes d'angle sont toujours fermées
          contourType: 'outer',
          interpolation: 'linear',
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          // Informations spécifiques aux coupes d'angle
          cutType: 'angle',
          source: 'tube_angle_cut'
        },
        metadata: {
          originalBlock: DSTVBlockType.AK,
          workPlane: 'E0',
          isValid: true,
          processingFlags: ['skip_plane_validation']
        }
      };
      
      console.log(`  ✅ Created ANGLE CUT feature:`, {
        id: feature.id,
        type: feature.type,
        face: feature.parameters.face,
        points: feature.parameters.points?.length,
        cutType: feature.parameters.cutType
      });
      
      return [feature]; // Retourne un tableau avec une seule feature
    }
    
    // Traitement des coupes droites sur tubes (très courant)
    if (contourType === 'STRAIGHT_CUT') {
      console.log(`  ✂️ AK block detected as straight cut on tube`);
      
      // Calculer les dimensions pour la conversion de coordonnées
      const dims = this.currentProfileDimensions || {
        length: 2259.98,
        height: 50.8,
        width: 50.8
      };
      
      // Convertir le centre du contour vers le nouveau système
      const contourCenter = this.calculateContourCenter(data.points);
      const positionContext = {
        profileType: this.currentProfileType || 'TUBE_RECT',
        dimensions: dims,
        face: data.face || 'web'
      };
      
      const standardPosition = this.positionService.convertPosition(
        contourCenter,
        'dstv',
        positionContext
      );
      
      const standardCoords = {
        x: standardPosition.position.x,
        y: standardPosition.position.y,
        z: standardPosition.position.z
      };
      
      const feature: NormalizedFeature = {
        id: this.generateFeatureId('straight-cut'),
        type: NormalizedFeatureType.CUT,
        coordinates: standardCoords,
        parameters: {
          // Convertir les points pour le CutProcessor
          points: data.points ? data.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : [],
          closed: true, // Les coupes droites sur tubes sont toujours fermées
          contourType: 'outer',
          interpolation: 'linear',
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          // Informations spécifiques aux coupes droites
          cutType: 'straight',
          source: 'tube_cut'
        },
        metadata: {
          originalBlock: DSTVBlockType.AK,
          workPlane: 'E0',
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          processingOrder: this.getBlockProcessingPriority(DSTVBlockType.AK)
        }
      };
      
      console.log(`  ✂️ Created straight cut feature on face ${feature.parameters.face}`);
      return [feature]; // Retourne un tableau avec une seule feature
    }
    
    if (contourType === 'CUT_WITH_NOTCHES') {
      console.log(`  🔧 AK block detected as cut with partial notches (M1002 pattern)`);
      
      // Créer une feature de type CUT_WITH_NOTCHES pour les encoches partielles
      // Calculer les dimensions pour la conversion de coordonnées
      const dims = this.currentProfileDimensions || {
        length: 1912.15,
        height: 251.4,
        width: 146.1
      };
      
      // Convertir le centre du contour vers le nouveau système
      const contourCenter = this.calculateContourCenter(data.points);
      const positionContext = {
        profileType: this.currentProfileType || 'I_PROFILE',
        dimensions: dims,
        face: data.face || 'web'
      };
      
      const standardPosition = this.positionService.convertPosition(
        contourCenter,
        'dstv',
        positionContext
      );
      
      const standardCoords = {
        x: standardPosition.position.x,
        y: standardPosition.position.y,
        z: standardPosition.position.z
      };
      
      const feature: NormalizedFeature = {
        id: this.generateFeatureId('cut-with-notches'),
        type: NormalizedFeatureType.CUT_WITH_NOTCHES,
        coordinates: standardCoords,
        parameters: {
          // Convertir les points pour le CutProcessor
          points: data.points ? data.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : [],
          closed: data.closed !== false,
          contourType: 'outer',
          interpolation: 'linear',
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          // Informations spécifiques aux coupes avec encoches
          cutType: 'partial_notches',
          hasExtension: true,
          source: 'contour_detection'
        },
        metadata: {
          originalBlock: block.type,
          workPlane: data.plane || 'E0',
          processingOrder: this.getBlockProcessingPriority(block.type),
          applyOnly: true,
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          detectedAsCutWithNotches: true
        }
      };
      
      return [feature]; // Retourne un tableau avec une seule feature
    }
    
    if (contourType === 'NOTCH') {
      console.log(`  🔧 AK block detected as simple notches at extremities`);
      
      // Créer une feature de type NOTCH pour les notches simples
      // Calculer les dimensions pour la conversion de coordonnées
      const dims = this.currentProfileDimensions || {
        length: 1912.15,
        height: 251.4,
        width: 146.1
      };
      
      // Convertir le centre du contour vers le nouveau système
      const contourCenter = this.calculateContourCenter(data.points);
      const positionContext = {
        profileType: this.currentProfileType || 'I_PROFILE',
        dimensions: dims,
        face: data.face || 'web'
      };
      
      const standardPosition = this.positionService.convertPosition(
        contourCenter,
        'dstv',
        positionContext
      );
      
      const standardCoords = {
        x: standardPosition.position.x,
        y: standardPosition.position.y,
        z: standardPosition.position.z
      };
      
      const feature: NormalizedFeature = {
        id: this.generateFeatureId('notch'),
        type: NormalizedFeatureType.NOTCH,
        coordinates: standardCoords,
        parameters: {
          // Convertir les points pour le NotchProcessor
          points: data.points ? data.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : [],
          closed: data.closed !== false,
          contourType: 'outer',
          interpolation: 'linear',
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          // Informations spécifiques aux notches
          notchType: 'extremity',
          source: 'contour_detection'
        },
        metadata: {
          originalBlock: block.type,
          workPlane: data.plane || 'E0',
          processingOrder: this.getBlockProcessingPriority(block.type),
          applyOnly: true,
          face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
          detectedAsNotch: true
        }
      };
      
      return [feature]; // Retourne un tableau avec une seule feature
    }
    
    // IMPORTANT: TOUS les contours AK doivent être traités car ils définissent les découpes du profil
    // Ne jamais skipper les contours !
    // Calculer les dimensions pour la conversion de coordonnées
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Pour les contours, utiliser la position X minimale (début du contour)
    // car le contour doit être positionné à son point de départ, pas au centre
    const contourPosition = this.getContourPosition(data.points, data.face || 'front');
    const positionContext = {
      profileType: this.currentProfileType || 'I_PROFILE',
      dimensions: dims,
      face: data.face || 'front'
    };
    
    const standardPosition = this.positionService.convertPosition(
      contourPosition,
      'dstv',
      positionContext
    );
    
    const standardCoords = {
      x: standardPosition.position.x,
      y: standardPosition.position.y,
      z: standardPosition.position.z
    };
    
    const feature: NormalizedFeature = {
      id: this.generateFeatureId('contour_outer'),
      type: NormalizedFeatureType.CONTOUR,
      coordinates: standardCoords,
      parameters: {
        // Convertir Point2D[] vers Array<[number, number]> pour le ContourProcessor
        points: data.points ? data.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : [],
        closed: data.closed !== false,
        contourType: 'outer',
        interpolation: 'linear', // Par défaut, peut être 'spline' ou 'arc'
        face: data.face || 'front'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type),
        // Les contours AK définissent la forme finale, ils sont appliqués mais pas affichés séparément
        applyOnly: true,
        face: data.face || 'front'
      }
    };

    // Calculer les informations géométriques
    if (this.normalizationConfig.generateGeometryInfo) {
      const bounds = this.calculatePointsBounds(data.points);
      const area = Math.abs(this.calculatePolygonArea(data.points));
      const perimeter = this.calculatePolygonPerimeter(data.points);

      feature.geometry = { bounds, area, perimeter };
    }

    return [feature];
  }

  /**
   * Normalise un bloc IK (Inner contour)
   */
  private async normalizeIKBlock(block: DSTVParsedBlock): Promise<NormalizedFeature[]> {
    const features = await this.normalizeAKBlock(block); // Retourne maintenant un tableau
    
    // Modifications spécifiques aux contours intérieurs
    for (const feature of features) {
      if (feature) {
        feature.id = this.generateFeatureId('contour_inner');
        feature.parameters.contourType = 'inner';
      }
    }
    
    return features;
  }

  /**
   * Normalise un bloc SI (Marking) avec le système de coordonnées unifié
   * CORRECTION MAJEURE: Integration complète avec PositionService pour toutes les faces
   */
  private async normalizeSIBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    console.log('🎯 normalizeSIBlock - Input data:', data);
    console.log('🎯 Face value:', data.face, 'Type:', typeof data.face);
    
    // Utiliser les dimensions stockées ou des valeurs par défaut
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // CORRECTION CRITIQUE: Utiliser PositionService.convertPosition() pour TOUTES les faces
    // Ceci assure une transformation cohérente des coordonnées spécifique à chaque face
    
    // Pour les tubes, les coordonnées DSTV sont déjà directes et ne nécessitent pas de transformation
    let standardCoords;
    let standardFace;
    
    if (this.currentProfileType && (this.currentProfileType.includes('TUBE') || this.currentProfileType === 'L_PROFILE')) {
      // Pour les tubes et cornières : coordonnées directes sans transformation
      standardCoords = {
        x: data.x,
        y: data.y, 
        z: data.z || 0
      };
      
      // Mapping simple des faces pour les tubes
      if (data.face === 'v' || data.face === 'top_flange') {
        standardFace = 'top';
      } else if (data.face === 'u' || data.face === 'bottom_flange') {
        standardFace = 'bottom';
      } else {
        standardFace = 'web'; // Face latérale par défaut
      }
    } else {
      // Pour les autres profils (I, L, etc.) : utiliser le PositionService
      let profileType = 'I_PROFILE';
      if (this.currentProfileType) {
        if (this.currentProfileType.includes('L_PROFILE')) {
          profileType = 'L_PROFILE';
        }
      }
      
      const positionContext = {
        profileType: profileType,
        dimensions: dims,
        face: data.face || 'web'
      };
      
      // Pour le marquage SI, si la face est l'âme (web/v), on le déplace sur l'aile supérieure
      // pour qu'il soit visible de l'extérieur
      // X = position le long du profil (reste X)
      // Y = position sur l'aile
      // Z = position verticale (hauteur du profil)
      
      // Pour les plaques (PLATE), traitement simple
      if (this.currentProfileType === 'PLATE' && (data.face === 'v' || data.face === 'web')) {
        // Pour une plaque horizontale, transformer les coordonnées DSTV
        // DSTV X reste X, DSTV Y devient Z, Y=0 pour être sur la surface supérieure
        standardCoords = {
          x: data.x,  // Position X sur la longueur de la plaque
          y: 0,       // Y=0 pour être sur la surface supérieure (pas dans la matière)
          z: data.y   // DSTV Y devient Z (position sur la largeur)
        };
        standardFace = 'top'; // Face supérieure de la plaque
        console.log(`📍 Plate marking at X=${data.x}mm, Z=${data.y}mm on top face (Y=0 for surface)`);
      } else if (data.face === 'web' || data.face === 'v') {
        // CORRECTION: Respecter la face DSTV originale au lieu de forcer sur top_flange
        // Utiliser PositionService pour la conversion correcte des coordonnées
        console.log(`🔄 Processing marking on WEB face - using PositionService for correct placement`);
        
        const standardPosition = this.positionService.convertPosition(
          { x: data.x, y: data.y, z: data.z || 0, featureType: 'marking' },
          'dstv',
          positionContext
        );
        
        standardCoords = standardPosition.position;
        standardFace = standardPosition.face;
        
        console.log(`📍 WEB marking: DSTV[${data.x}, ${data.y}] -> Standard[${standardCoords.x.toFixed(1)}, ${standardCoords.y.toFixed(1)}, ${standardCoords.z.toFixed(1)}] on face ${standardFace}`);
      } else {
        // Pour les autres faces, utiliser la transformation standard
        const standardPosition = this.positionService.convertPosition(
          { x: data.x, y: data.y, z: data.z || 0, featureType: 'marking' },
          'dstv',
          positionContext
        );
        
        standardCoords = standardPosition.position;
        standardFace = standardPosition.face;
        
        console.log(`📍 Other face marking: DSTV[${data.x}, ${data.y}] -> Standard[${standardCoords.x.toFixed(1)}, ${standardCoords.y.toFixed(1)}, ${standardCoords.z.toFixed(1)}] on face ${standardFace}`);
      }
    }
    
    console.log('🎯 UNIFIED coordinate conversion complete:', {
      originalDSTV: { x: data.x, y: data.y, z: data.z || 0 },
      standardCoords: standardCoords,
      originalFace: data.face,
      standardFace: standardFace,
      positionService: 'SUCCESS'
    });
    
    return {
      id: this.generateFeatureId('marking'),
      type: NormalizedFeatureType.MARKING,
      coordinates: standardCoords,
      parameters: {
        text: data.text,
        height: data.height || 10,
        angle: data.angle || 0,
        depth: data.depth || 0.1,
        font: data.font || 'standard',
        markingMethod: data.markingMethod || 'engrave',
        face: standardFace,  // Utiliser standardFace qui peut être modifié en top_flange
        // AJOUT: Préservation des données originales pour débogage
        originalFaceIndicator: data.face,
        // Ajouter les épaisseurs pour le positionnement correct
        webThickness: (dims as any).webThickness || 6,
        flangeThickness: (dims as any).flangeThickness || 8.6
      },
      metadata: {
        originalBlock: block.type,
        originalDSTVCoords: { x: data.x, y: data.y, z: data.z || 0 },
        workPlane: data.workPlane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type),
        face: standardFace as StandardFace,
        profileType: this.currentProfileType,  // Ajouter le type de profil pour le mapping des faces
        applyOnly: true,  // Les features DSTV sont appliquées à la géométrie, pas créées comme éléments séparés
        // AJOUT: Métadonnées pour la validation et le débogage
        coordinateConversion: {
          system: 'unified',
          service: 'PositionService',
          originalFace: data.face,
          convertedFace: standardFace
        }
      }
    };
  }

  /**
   * Normalise un bloc SC (Cut)
   */
  private async normalizeSCBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    const feature: NormalizedFeature = {
      id: this.generateFeatureId('cut'),
      type: NormalizedFeatureType.CUT,
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0
      },
      parameters: {
        width: data.width,
        height: data.height,
        angle: data.angle || 0,
        radius: data.radius || 0,
        cutType: 'rectangular',
        throughCut: true
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };

    // Calculer les informations géométriques
    if (this.normalizationConfig.generateGeometryInfo) {
      const halfWidth = data.width / 2;
      const halfHeight = data.height / 2;
      
      feature.geometry = {
        bounds: {
          min: { x: data.x - halfWidth, y: data.y - halfHeight, z: 0 },
          max: { x: data.x + halfWidth, y: data.y + halfHeight, z: 0 }
        },
        area: data.width * data.height,
        perimeter: 2 * (data.width + data.height)
      };
    }

    return feature;
  }

  /**
   * Normalise un bloc PU (Punch mark)
   */
  private async normalizePUBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('punch'),
      type: NormalizedFeatureType.PUNCH,
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0
      },
      parameters: {
        depth: data.depth || 0.5,
        diameter: data.diameter || 3,
        punchType: 'standard'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc BR (Bevel/Radius)
   */
  private async normalizeBRBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    const positionContext = {
      profileType: this.currentProfileType || 'I_PROFILE',
      dimensions: dims,
      face: data.face || 'web'
    };
    
    const standardPosition = this.positionService.convertPosition(
      { x: data.x, y: data.y, z: data.z || 0 },
      'dstv',
      positionContext
    );
    
    const standardCoords = {
      x: standardPosition.position.x,
      y: standardPosition.position.y,
      z: standardPosition.position.z
    };
    
    return {
      id: this.generateFeatureId('bevel'),
      type: NormalizedFeatureType.BEVEL,
      coordinates: standardCoords,
      parameters: {
        angle: data.angle || 45,
        size: data.size || 5,
        bevelType: data.type || 'chamfer',
        edge: data.edge || 'all'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        face: this.positionService.convertFace(data.face || 'web', 'dstv', positionContext),
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc VO (Volume)
   */
  private async normalizeVOBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('volume'),
      type: NormalizedFeatureType.VOLUME,
      coordinates: data.position || { x: 0, y: 0, z: 0 },
      parameters: {
        operation: data.operation || 'check',
        volume: data.volume,
        dimensions: data.dimensions,
        material: data.material,
        density: data.density || 7850
      },
      metadata: {
        originalBlock: block.type,
        workPlane: 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc NU (Numerically Controlled)
   */
  private async normalizeNUBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('numeric_control'),
      type: NormalizedFeatureType.NUMERIC_CONTROL,
      coordinates: data.position || { x: 0, y: 0, z: 0 },
      parameters: {
        machineType: data.machineType,
        toolNumber: data.toolNumber,
        operation: data.operation,
        feedRate: data.feedRate,
        spindleSpeed: data.spindleSpeed,
        parameters: data.parameters,
        gCode: data.gCode
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc FP (Free Program)
   */
  private async normalizeFPBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('free_program'),
      type: NormalizedFeatureType.FREE_PROGRAM,
      coordinates: { x: 0, y: 0, z: 0 },
      parameters: {
        programType: data.programType,
        programCode: data.programCode,
        language: data.language,
        parameters: data.parameters
      },
      metadata: {
        originalBlock: block.type,
        workPlane: 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc LP (Line Program)
   */
  private async normalizeLPBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('line_program'),
      type: NormalizedFeatureType.LINE_PROGRAM,
      coordinates: data.startPoint || { x: 0, y: 0, z: 0 },
      parameters: {
        startPoint: data.startPoint,
        endPoint: data.endPoint,
        operation: data.operation,
        speed: data.speed,
        toolDiameter: data.toolDiameter,
        depth: data.depth,
        interpolation: data.interpolation
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc RT (Rotation)
   */
  private async normalizeRTBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('rotation'),
      type: NormalizedFeatureType.ROTATION,
      coordinates: data.center || { x: 0, y: 0, z: 0 },
      parameters: {
        axis: data.axis,
        angle: data.angle,
        speed: data.speed,
        direction: data.direction
      },
      metadata: {
        originalBlock: block.type,
        workPlane: 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc WA (Washing)
   */
  private async normalizeWABlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('washing'),
      type: NormalizedFeatureType.WASHING,
      coordinates: { x: 0, y: 0, z: 0 },
      parameters: {
        method: data.method,
        intensity: data.intensity,
        duration: data.duration,
        temperature: data.temperature,
        pressure: data.pressure,
        chemical: data.chemical
      },
      metadata: {
        originalBlock: block.type,
        workPlane: 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc générique
   */
  private async normalizeGenericBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId(block.type.toLowerCase()),
      type: NormalizedFeatureType.VARIABLE,
      coordinates: { x: 0, y: 0, z: 0 },
      parameters: {
        blockType: block.type,
        values: data.values || [],
        strings: data.strings || [],
        metadata: data.metadata || {}
      },
      metadata: {
        originalBlock: block.type,
        workPlane: 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Normalise un bloc KO (Contour marking)
   */
  private async normalizeKOBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    return {
      id: this.generateFeatureId('marking_contour'),
      type: NormalizedFeatureType.MARKING,
      coordinates: this.calculateContourCenter(data.points),
      parameters: {
        points: data.points,
        markingType: 'contour',
        depth: 0.1,
        markingMethod: 'scribe'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
      }
    };
  }

  /**
   * Génère les métadonnées de normalisation
   */
  private generateNormalizationMetadata(input: DSTVValidatedData, profile: NormalizedProfile): Record<string, any> {
    return {
      format: 'DSTV',
      version: '7th Edition (1998)',
      normalizationDate: new Date().toISOString(),
      originalConformityScore: input.conformityScore,
      coordinateSystem: this.normalizationConfig.coordinateSystem,
      units: this.normalizationConfig.units,
      profile: {
        name: profile.name,
        type: profile.type,
        material: profile.material.grade,
        featureCount: profile.features.length,
        featureTypes: this.getFeatureTypeDistribution(profile.features)
      },
      processing: {
        errors: input.errors.length,
        warnings: input.warnings.length,
        blocksProcessed: input.validBlocks.length
      }
    };
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  private generateProfileId(stData: any): string {
    // Préférer le numéro de pièce (ex: M1002) pour l'ID
    // Si pas disponible, utiliser les autres informations
    if (stData.pieceNumber && stData.pieceNumber !== 'unknown') {
      // Nettoyer le numéro de pièce et l'utiliser comme ID principal
      const cleanPieceNumber = stData.pieceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (stData.orderNumber && stData.orderNumber !== 'unknown') {
        return `${stData.orderNumber}_${cleanPieceNumber}`;
      }
      return cleanPieceNumber;
    }
    
    // Fallback sur l'ancienne méthode si pas de numéro de pièce
    const parts = [
      stData.orderNumber || 'unknown',
      stData.drawingNumber || 'unknown', 
      stData.pieceNumber || 'unknown'
    ];
    return parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private generateFeatureId(type: string): string {
    return `${this.normalizationConfig.featureIdPrefix}${type}_${++this.featureCounter}`;
  }

  private extractMaterialProperties(steelGrade: string): Record<string, any> | undefined {
    if (!steelGrade) return undefined;
    
    // Base de données simplifiée des propriétés d'acier
    const materialProperties: Record<string, any> = {
      'S235': { yieldStrength: 235, tensileStrength: 360, density: 7850 },
      'S275': { yieldStrength: 275, tensileStrength: 430, density: 7850 },
      'S355': { yieldStrength: 355, tensileStrength: 510, density: 7850 }
    };
    
    return materialProperties[steelGrade.toUpperCase()];
  }

  // Fonction convertDSTVToStandardCoordinates supprimée - utilise maintenant PositionService.convertPosition()

  /**
   * Mappe le type de profil vers un type standard avec détection robuste
   * Prend en compte les standards européens, américains et internationaux
   */
  private mapProfileTypeToStandard(profileName: string, profileType?: string): string {
    console.log(`🔍 Profile type detection: name="${profileName}", type="${profileType}"`);
    
    // Si on a un profileName, déduire le type à partir de celui-ci
    if (profileName) {
      const upperName = profileName.toUpperCase().trim();
      
      // ===== TUBES - Vérifier EN PREMIER avant autres profils =====
      // Tubes génériques avec mots-clés
      if (upperName.includes('TUBE')) {
        if (upperName.includes('RECT') || upperName.includes('RHS') || upperName.includes('SHS') || 
            upperName.includes('SQUARE') || upperName.includes('RECTANGULAIRE')) {
          console.log(`✅ Detected TUBE_RECT from generic tube keyword: ${profileName}`);
          return 'TUBE_RECT';
        }
        if (upperName.includes('CIRC') || upperName.includes('ROND') || upperName.includes('CHS') || 
            upperName.includes('ROUND') || upperName.includes('CIRCULAIRE')) {
          console.log(`✅ Detected TUBE_ROUND from generic tube keyword: ${profileName}`);
          return 'TUBE_ROUND';
        }
        // Fallback pour tube générique
        console.log(`✅ Detected TUBE_RECT (fallback) from tube keyword: ${profileName}`);
        return 'TUBE_RECT';
      }
      
      // Tubes avec codes spécifiques
      if (upperName.match(/^(HSS|RHS|SHS)\d+/) || upperName.includes('HSS') || 
          upperName.includes('RHS') || upperName.includes('SHS')) {
        console.log(`✅ Detected TUBE_RECT from HSS/RHS/SHS: ${profileName}`);
        return 'TUBE_RECT';
      }
      
      if (upperName.match(/^CHS\d+/) || upperName.includes('CHS')) {
        console.log(`✅ Detected TUBE_ROUND from CHS: ${profileName}`);
        return 'TUBE_ROUND';
      }
      
      // Tubes avec notation dimensionnelle (ex: "Ø48.3x3.2", "102x76x5", etc.)
      if (upperName.match(/Ø\d+/) || (upperName.includes('Ø') && upperName.match(/\d+/))) {
        console.log(`✅ Detected TUBE_ROUND from diameter notation: ${profileName}`);
        return 'TUBE_ROUND';
      }
      
      // ===== PROFILS I - Standards européens, américains et internationaux =====
      // Profils I européens complets
      if (upperName.match(/^(HEA|HEB|HEM|HP)\d+/) ||
          upperName.match(/^IPE\d+/) || upperName.match(/^IPN\d+/) ||
          upperName.startsWith('HEA') || upperName.startsWith('HEB') || 
          upperName.startsWith('HEM') || upperName.startsWith('HP') ||
          upperName.startsWith('IPE') || upperName.startsWith('IPN')) {
        console.log(`✅ Detected I_PROFILE from European standard: ${profileName}`);
        return 'I_PROFILE';
      }
      
      // Profils I britanniques et américains
      if (upperName.match(/^(UB|UC)\d+/) || upperName.startsWith('UB') || upperName.startsWith('UC') ||
          upperName.match(/^W\d+/) || (upperName.startsWith('W') && upperName.match(/\d+/))) {
        console.log(`✅ Detected I_PROFILE from British/American standard: ${profileName}`);
        return 'I_PROFILE';
      }
      
      // Profils I avec notation générique
      if (upperName.includes('BEAM') && (upperName.includes('I') || upperName.includes('H'))) {
        console.log(`✅ Detected I_PROFILE from beam notation: ${profileName}`);
        return 'I_PROFILE';
      }
      
      // ===== CORNIÈRES (L) - Standards internationaux =====
      // Cornières avec format standard (L50x50x5, L100x75x8, etc.)
      if (upperName.match(/^L\d+[xX×]\d+/) || 
          (upperName.startsWith('L') && upperName.match(/\d+[xX×]\d+/))) {
        console.log(`✅ Detected L_PROFILE from standard L notation: ${profileName}`);
        return 'L_PROFILE';
      }
      
      // Cornières avec codes spéciaux
      if (upperName.startsWith('RSA') || upperName.startsWith('UKA') || 
          upperName.startsWith('EA') || upperName.match(/^ANGLE/)) {
        console.log(`✅ Detected L_PROFILE from special angle codes: ${profileName}`);
        return 'L_PROFILE';
      }
      
      // Vérification plus stricte pour L simple
      if (upperName.match(/^L\d+$/) || (upperName.startsWith('L') && upperName.length <= 6 && upperName.match(/\d/))) {
        console.log(`✅ Detected L_PROFILE from simple L notation: ${profileName}`);
        return 'L_PROFILE';
      }
      
      // ===== PROFILS U - Standards européens et américains =====
      // Profils U européens
      if (upperName.match(/^(UPN|UPE|UAP)\d+/) || 
          upperName.startsWith('UPN') || upperName.startsWith('UPE') || upperName.startsWith('UAP')) {
        console.log(`✅ Detected U_PROFILE from European U standard: ${profileName}`);
        return 'U_PROFILE';
      }
      
      // Channels américains (C150x15.6, C200, etc.) - IMPORTANT: exclure UB, UC, UKA
      if ((upperName.match(/^C\d+/) || (upperName.startsWith('C') && upperName.match(/\d+/))) &&
          !upperName.startsWith('CHS')) {  // Exclure CHS qui est un tube
        console.log(`✅ Detected U_PROFILE from American channel: ${profileName}`);
        return 'U_PROFILE';
      }
      
      // Profils U génériques - ATTENTION: exclure UB, UC, UKA qui ne sont pas des U
      if ((upperName.startsWith('U') && upperName.match(/\d/)) &&
          !upperName.startsWith('UB') && !upperName.startsWith('UC') && !upperName.startsWith('UKA')) {
        console.log(`✅ Detected U_PROFILE from generic U notation: ${profileName}`);
        return 'U_PROFILE';
      }
      
      // ===== PROFILS T =====
      if (upperName.match(/^T\d+/) || upperName.startsWith('TE') || 
          (upperName.startsWith('T') && upperName.match(/\d+[xX×]\d+/))) {
        console.log(`✅ Detected T_PROFILE: ${profileName}`);
        return 'T_PROFILE';
      }
      
      // ===== PROFILS Z =====
      if (upperName.match(/^Z\d+/) || upperName.startsWith('ZED') ||
          (upperName.startsWith('Z') && upperName.match(/\d+[xX×]\d+/))) {
        console.log(`✅ Detected Z_PROFILE: ${profileName}`);
        return 'Z_PROFILE';
      }
      
      // ===== BARRES PLATES =====
      if (upperName.includes('FLAT') || upperName.includes('PLAT') ||
          upperName.match(/^FL\d+/) || upperName.startsWith('FB') ||
          upperName.match(/BAR.*FLAT/) || upperName.match(/FLAT.*BAR/)) {
        console.log(`✅ Detected FLAT_BAR: ${profileName}`);
        return 'FLAT_BAR';
      }
      
      // ===== TÔLES ET PLAQUES =====
      if (upperName.includes('PLATE') || upperName.includes('TOLE') || upperName.includes('TÔLE') ||
          upperName.match(/^PL\d+/) || upperName.startsWith('PL') ||
          upperName.includes('SHEET') || upperName.includes('PLAQUE')) {
        console.log(`✅ Detected PLATE: ${profileName}`);
        return 'PLATE';
      }
    }
    
    // Si on a un profileType explicite, l'utiliser avec mapping étendu
    if (profileType) {
      const upperType = profileType.toUpperCase().trim();
      console.log(`🔍 Using explicit profile type: ${upperType}`);
      
      // Mapping direct étendu
      const typeMapping: Record<string, string> = {
        'I': 'I_PROFILE',
        'U': 'U_PROFILE', 
        'L': 'L_PROFILE',
        'T': 'T_PROFILE',
        'Z': 'Z_PROFILE',
        'C': 'U_PROFILE',      // C = Channel (profil U)
        'B': 'PLATE',          // B = Blech (plate in German)
        'M': 'TUBE_RECT',      // M = rectangular tube (German/DSTV standard)
        'R': 'TUBE_ROUND',     // R = round tube (German/DSTV standard)
        'TUBE': 'TUBE_RECT',
        'PIPE': 'TUBE_ROUND',
        'PLATE': 'PLATE',
        'FLAT': 'FLAT_BAR',
        'BEAM': 'I_PROFILE',
        'CHANNEL': 'U_PROFILE',
        'ANGLE': 'L_PROFILE'
      };
      
      if (typeMapping[upperType]) {
        console.log(`✅ Mapped type "${upperType}" to "${typeMapping[upperType]}"`);
        return typeMapping[upperType];
      }
    }
    
    // Fallback intelligent basé sur les patterns de noms courants
    if (profileName) {
      const upperName = profileName.toUpperCase();
      
      // Dernière chance pour les profils I basé sur la forme du nom
      if (upperName.match(/^\w{2,4}\d+/) && !upperName.startsWith('L') && 
          !upperName.startsWith('U') && !upperName.startsWith('T') && !upperName.startsWith('Z')) {
        console.log(`⚠️ Fallback to I_PROFILE based on name pattern: ${profileName}`);
        return 'I_PROFILE';
      }
    }
    
    // Fallback final
    console.log(`⚠️ No specific type detected, using I_PROFILE fallback for: ${profileName}`);
    return 'I_PROFILE'; // La plupart des profils structuraux sont des I
  }

  /**
   * Extrait les dimensions de la section transversale à partir des données réelles du bloc ST
   */
  private extractCrossSectionFromSTData(data: any): Record<string, number> {
    const dimensions: Record<string, number> = {};
    
    console.log(`🔍🔍🔍 extractCrossSectionFromSTData - profileType: "${data.profileType}", profileName: "${data.profileName}"`);
    console.log(`  Raw data fields: height=${data.height}, width=${data.width}, profileHeight=${data.profileHeight}, profileWidth=${data.profileWidth}`);
    console.log(`  webThickness=${data.webThickness}, flangeThickness=${data.flangeThickness}`);
    
    // Mapping spécifique pour les plaques (profileType = 'B' ou 'PLATE')
    if (data.profileType === 'B' || data.profileType === 'PLATE') {
      // Pour une plaque : longueur x largeur x épaisseur
      // Les données du ST block contiennent length, width et thickness
      if (data.length !== undefined && data.length > 0) {
        dimensions.height = data.length;  // Pour une plaque, la "hauteur" du profil est sa longueur
      } else if (data.profileHeight !== undefined && data.profileHeight > 0) {
        dimensions.height = data.profileHeight;  // Fallback: utiliser profileHeight comme longueur
      }
      
      if (data.width !== undefined && data.width > 0) {
        dimensions.width = data.width;  // Largeur de la plaque
      } else if (data.profileWidth !== undefined && data.profileWidth > 0) {
        dimensions.width = data.profileWidth;  // Fallback
      }
      
      // L'épaisseur de la plaque
      if (data.thickness !== undefined && data.thickness > 0) {
        dimensions.thickness = data.thickness;
      } else if (data.rootRadius !== undefined && data.rootRadius > 0) {
        // Dans le format DSTV, pour une plaque, le champ rootRadius contient l'épaisseur
        dimensions.thickness = data.rootRadius;
      }
      
      // Pour une plaque, on stocke aussi le rayon si présent (coins arrondis)
      if (data.radius !== undefined && data.radius > 0) {
        dimensions.radius = data.radius;
      }
      
      console.log(`🔲 Extracted PLATE dimensions from ST data: length=${dimensions.height}, width=${dimensions.width}, thickness=${dimensions.thickness}`);
      
    } else if (data.profileType === 'M' || data.profileType === 'TUBE_RECT') {
      // Tube rectangulaire : utiliser les bonnes propriétés
      if (data.height !== undefined && data.height > 0) {
        dimensions.height = data.height;
      } else if (data.profileHeight !== undefined) {
        dimensions.height = data.profileHeight;
      }
      
      if (data.width !== undefined && data.width > 0) {
        dimensions.width = data.width;
      } else if (data.profileWidth !== undefined) {
        dimensions.width = data.profileWidth;
      }
      
      if (data.wallThickness !== undefined && data.wallThickness > 0) {
        dimensions.thickness = data.wallThickness;        // Pour les tubes, on utilise 'thickness'
        dimensions.wallThickness = data.wallThickness;    // Aussi disponible sous ce nom
      } else if (data.webThickness !== undefined && data.webThickness > 0) {
        // Fallback si wallThickness n'est pas défini
        dimensions.thickness = data.webThickness;
        dimensions.wallThickness = data.webThickness;
      }
      
      if (data.radius !== undefined && data.radius > 0) {
        dimensions.radius = data.radius;
      } else if (data.rootRadius !== undefined) {
        dimensions.radius = data.rootRadius;
      }
      
      console.log(`✅ Extracted TUBE dimensions from ST data: height=${dimensions.height}, width=${dimensions.width}, thickness=${dimensions.thickness}, radius=${dimensions.radius}`);
      
    } else {
      // Profils I, U, L, etc. (mapping générique existant)
      // IMPORTANT: Pour les profils I, DSTV utilise cette convention :
      // - profileHeight (position 9) = hauteur du profil (depth)
      // - profileWidth (position 10) = largeur des ailes (flange width)
      
      // Pour un profil UB254x146x31 :
      // - height = 251.4mm (hauteur réelle selon DSTV, position 9)  
      // - width = 146.1mm (largeur des ailes, position 10)
      
      // Le STBlockParser retourne 'height' et 'width', pas 'profileHeight' et 'profileWidth'
      if (data.height !== undefined && data.height > 0) {
        dimensions.height = data.height;  // Hauteur du profil
      } else if (data.profileHeight !== undefined && data.profileHeight > 0) {
        dimensions.height = data.profileHeight;  // Fallback pour compatibilité
      }
      
      if (data.width !== undefined && data.width > 0) {
        dimensions.width = data.width;    // Largeur des ailes
      } else if (data.profileWidth !== undefined && data.profileWidth > 0) {
        dimensions.width = data.profileWidth;    // Fallback pour compatibilité
      }
      
      if (data.webThickness !== undefined && data.webThickness > 0) {
        dimensions.webThickness = data.webThickness;
      }
      
      if (data.flangeThickness !== undefined && data.flangeThickness > 0) {
        dimensions.flangeThickness = data.flangeThickness;
      }
      
      if (data.radius !== undefined && data.radius > 0) {
        dimensions.radius = data.radius;
      } else if (data.rootRadius !== undefined) {
        dimensions.radius = data.rootRadius;
      }
      
      console.log(`Extracted standard dimensions from ST data: height=${dimensions.height}, width=${dimensions.width}, webThickness=${dimensions.webThickness}, flangeThickness=${dimensions.flangeThickness}`);
      
      // Specific handling for L_PROFILE: set thickness from webThickness
      if (data.profileType === 'L' && dimensions.webThickness !== undefined) {
        dimensions.thickness = dimensions.webThickness;
        console.log(`L_PROFILE: Set thickness=${dimensions.thickness} from webThickness`);
      }
    }
    
    // Fallback vers extraction du nom si pas de données numériques
    if (Object.keys(dimensions).length === 0 && data.profileName) {
      console.warn('No ST dimension data found, falling back to name parsing for:', data.profileName);
      return this.extractCrossSectionDimensions(data.profileName, data.profileType);
    }
    
    return dimensions;
  }

  private extractCrossSectionDimensions(profileName: string, _profileType: string): Record<string, number> {
    // Parser pour extraire dimensions des noms de profils
    const dimensions: Record<string, number> = {};
    
    if (profileName) {
      const upperName = profileName.toUpperCase();
      
      // Pattern pour UB254x146x31 ou UC254x254x73
      const ubUcMatch = upperName.match(/U[BC](\d+)x(\d+)x(\d+)/);
      if (ubUcMatch) {
        const [, depth, width, weight] = ubUcMatch;
        dimensions.height = parseInt(depth);
        dimensions.width = parseInt(width);
        dimensions.webThickness = Math.max(6, parseInt(weight) / 10); // Estimation basée sur le poids
        dimensions.flangeThickness = dimensions.webThickness * 1.5; // Estimation
        dimensions.radius = 5; // Rayon de congé standard pour profils UB/UC
        console.log(`Parsed UB/UC profile: height=${dimensions.height}, width=${dimensions.width}, webThickness=${dimensions.webThickness}, flangeThickness=${dimensions.flangeThickness}`);
        return dimensions;
      }
      
      // Pattern pour W460x74, W310x52, etc.
      const wMatch = upperName.match(/W(\d+)x(\d+)/);
      if (wMatch) {
        const [, depth, weight] = wMatch;
        dimensions.height = parseInt(depth);
        dimensions.width = parseInt(depth) * 0.65; // Estimation typique pour profils W
        dimensions.webThickness = Math.max(6, parseInt(weight) / 10);
        dimensions.flangeThickness = dimensions.webThickness * 1.5;
        dimensions.radius = 8; // Rayon de congé standard pour profils W
        console.log(`Parsed W profile: height=${dimensions.height}, width=${dimensions.width}, radius=${dimensions.radius}`);
        return dimensions;
      }
      
      // Pattern pour HEA200, IPE300, etc.
      const standardMatch = upperName.match(/([A-Z]+)(\d+)/);
      if (standardMatch) {
        const [, type, height] = standardMatch;
        dimensions.height = parseInt(height);
        
        // Largeurs et épaisseurs typiques selon le type
        const profileData: Record<string, { widthRatio: number; webThickness: number; flangeThickness: number; radius: number }> = {
          'IPE': { widthRatio: 0.55, webThickness: 6, flangeThickness: 9, radius: 5 },
          'IPN': { widthRatio: 0.58, webThickness: 7, flangeThickness: 11, radius: 6 },
          'HEA': { widthRatio: 0.96, webThickness: 8, flangeThickness: 12, radius: 12 },
          'HEB': { widthRatio: 1.0, webThickness: 10, flangeThickness: 15, radius: 12 },
          'HEM': { widthRatio: 1.06, webThickness: 12, flangeThickness: 20, radius: 12 },
          'UPN': { widthRatio: 0.55, webThickness: 6, flangeThickness: 10, radius: 5 },
          'UPE': { widthRatio: 0.52, webThickness: 5, flangeThickness: 9, radius: 5 }
        };
        
        const data = profileData[type] || { widthRatio: 0.6, webThickness: 8, flangeThickness: 12, radius: 5 };
        dimensions.width = parseInt(height) * data.widthRatio;
        dimensions.webThickness = data.webThickness;
        dimensions.flangeThickness = data.flangeThickness;
        dimensions.radius = data.radius;
        
        console.log(`Parsed ${type} profile: height=${dimensions.height}, width=${dimensions.width}, radius=${dimensions.radius}`);
        return dimensions;
      }
      
      // Pattern pour tubes RHS200x100x6 ou CHS219x8
      const tubeMatch = upperName.match(/(RHS|SHS|CHS)(\d+)x(\d+)(?:x(\d+))?/);
      if (tubeMatch) {
        const [, tubeType, dim1, dim2, thickness] = tubeMatch;
        if (tubeType === 'CHS') {
          dimensions.diameter = parseInt(dim1);
          dimensions.thickness = parseInt(dim2);
        } else {
          dimensions.height = parseInt(dim1);
          dimensions.width = parseInt(dim2);
          dimensions.thickness = thickness ? parseInt(thickness) : 6;
        }
        console.log(`Parsed ${tubeType} tube: dimensions parsed`);
        return dimensions;
      }
      
      // Pattern pour cornières L100x100x10
      const angleMatch = upperName.match(/L(\d+)x(\d+)x(\d+)/);
      if (angleMatch) {
        const [, leg1, leg2, thickness] = angleMatch;
        dimensions.height = parseInt(leg1);
        dimensions.width = parseInt(leg2);
        dimensions.thickness = parseInt(thickness);
        console.log(`Parsed angle: ${leg1}x${leg2}x${thickness}`);
        return dimensions;
      }
    }
    
    // Valeurs par défaut si aucun pattern ne match
    console.warn(`Could not parse dimensions for profile: ${profileName}, using defaults`);
    dimensions.height = 200;
    dimensions.width = 100;
    dimensions.webThickness = 8;
    dimensions.flangeThickness = 12;
    
    return dimensions;
  }

  private calculateContourCenter(points: Array<{ x: number; y: number }>): { x: number; y: number; z: number } {
    if (points.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    console.debug(`📐 Calculating center for ${points.length} points:`, points);
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    
    const center = {
      x: sumX / points.length,
      y: sumY / points.length,
      z: 0
    };
    
    console.debug(`📐 Contour center: (${center.x}, ${center.y})`);
    return center;
  }

  /**
   * Obtient la position de référence d'un contour
   * CORRECTION MAJEURE: Meilleure détection des contours partiels (notches)
   */
  private getContourPosition(points: Array<{ x: number; y: number }>, face: string): { x: number; y: number; z: number } {
    if (points.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    // Calculer les dimensions du contour
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const profileLength = this.currentProfileDimensions?.length || 1912.15;
    const contourLength = maxX - minX;
    
    // CORRECTION: Meilleure détection des contours partiels
    // Un contour est partiel (découpe/notch) si :
    // 1. Il ne commence pas près de 0 ET ne finit pas près de la longueur totale
    // 2. OU sa longueur est significativement plus courte que le profil
    const tolerance = 2.0;  // Tolérance augmentée à 2mm
    const startsNearZero = Math.abs(minX) < tolerance;
    const endsNearLength = Math.abs(maxX - profileLength) < tolerance;
    const isFullLength = Math.abs(contourLength - profileLength) < tolerance;
    
    const isPartialContour = !isFullLength || (!startsNearZero || !endsNearLength);
    
    console.debug(`📐 Contour analysis for face ${face}:`, {
      bounds: `X[${minX} to ${maxX}], Y[${minY} to ${maxY}]`,
      contourLength: contourLength,
      profileLength: profileLength,
      startsNearZero,
      endsNearLength,
      isFullLength,
      isPartialContour
    });
    
    let position: { x: number; y: number; z: number };
    
    if (isPartialContour) {
      // DÉCOUPE PARTIELLE : Utiliser le centre de la zone découpée
      position = {
        x: (minX + maxX) / 2,  // Centre X de la découpe
        y: (minY + maxY) / 2,  // Centre Y de la découpe  
        z: 0
      };
      console.debug(`  → PARTIAL CONTOUR (cut/notch) position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    } else {
      // CONTOUR COMPLET : Utiliser le point de départ (bord gauche)
      const pointsAtMinX = points.filter(p => Math.abs(p.x - minX) < 0.01);
      const avgY = pointsAtMinX.length > 0 
        ? pointsAtMinX.reduce((sum, p) => sum + p.y, 0) / pointsAtMinX.length
        : points[0].y;
      
      position = {
        x: minX,
        y: avgY,
        z: 0
      };
      console.debug(`  → FULL CONTOUR position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    }
    
    return position;
  }

  private calculatePointsBounds(points: Array<{ x: number; y: number }>): { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } {
    if (points.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 }
      };
    }
    
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    return {
      min: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        z: 0
      },
      max: {
        x: Math.max(...xs),
        y: Math.max(...ys),
        z: 0
      }
    };
  }

  private calculatePolygonArea(points: Array<{ x: number; y: number }>): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  private calculatePolygonPerimeter(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
  }

  private getBlockProcessingPriority(blockType: DSTVBlockType): number {
    // Ordre de traitement recommandé
    const priorities: Record<DSTVBlockType, number> = {
      [DSTVBlockType.AK]: 1,  // Contours extérieurs d'abord
      [DSTVBlockType.IK]: 2,  // Puis contours intérieurs
      [DSTVBlockType.SC]: 3,  // Découpes
      [DSTVBlockType.BO]: 4,  // Trous
      [DSTVBlockType.SI]: 5,  // Marquages
      [DSTVBlockType.PU]: 6,  // Pointages
      [DSTVBlockType.KO]: 7,  // Marquages de contour
      [DSTVBlockType.ST]: 0,  // Header (non traité)
      [DSTVBlockType.EN]: 999, // End (non traité)
      // Autres types...
    } as any;
    
    return priorities[blockType] || 10;
  }

  private getFeatureProcessingOrder(a: NormalizedFeature, b: NormalizedFeature): number {
    const priorityA = a.metadata.processingOrder || 10;
    const priorityB = b.metadata.processingOrder || 10;
    return priorityA - priorityB;
  }

  private getFeatureTypeDistribution(features: NormalizedFeature[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const feature of features) {
      const type = feature.type;
      distribution[type] = (distribution[type] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * DEPRECATED: Cette méthode est remplacée par PositionService.convertFace()
   * Conservée temporairement pour compatibilité avec d'autres blocs
   * CORRECTION: Les marquages SI utilisent désormais exclusivement PositionService
   */
  private normalizeFaceIndicator(face: string | undefined): string {
    console.warn('⚠️  normalizeFaceIndicator is deprecated - use PositionService.convertFace() instead');
    
    if (!face) return 'web';
    
    const mapping: Record<string, string> = {
      'v': 'top_flange',
      'u': 'bottom_flange',
      'o': 'web',
      'h': 'web',
      'top': 'top_flange',
      'bottom': 'bottom_flange',
      'web': 'web',
      'top_flange': 'top_flange',
      'bottom_flange': 'bottom_flange'
    };
    
    return mapping[face.toLowerCase()] || 'web';
  }

  /**
   * Vérifie si un contour est la forme de base du profil (rectangle complet)
   */
  private isProfileBaseShape(points: any[], face?: StandardFace | string | undefined): boolean {
    if (!points || points.length < 4) {
      return false;
    }
    
    const profileLength = this.currentProfileDimensions?.length || 0;
    const profileWidth = this.currentProfileDimensions?.width || 0;
    const profileType = this.currentProfileType;
    
    // Analyser les dimensions du contour
    const xs = points.map(p => p.x || p[0] || 0);
    const ys = points.map(p => p.y || p[1] || 0);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const contourLength = maxX - minX;
    const contourHeight = maxY - minY;
    
    // Pour les tubes HSS: Les contours AK définissent la FORME FINALE après coupe
    // PAS ce qu'il faut couper ! C'est l'inverse des profils I
    if ((profileType === 'TUBE_RECT' || profileType === 'TUBE_ROUND')) {
      console.log(`  🎯 TUBE DETECTED: AK contours define FINAL SHAPE, not cuts to make`);
      console.log(`  📐 Contour bounds: X[${minX.toFixed(1)}, ${maxX.toFixed(1)}], Length=${profileLength.toFixed(1)}`);
      
      // Pour l'instant, on ignore tous les contours AK de tubes
      // Car ils représentent la forme finale, pas les coupes
      console.log(`  ℹ️ TUBE: Returning false to skip AK contour processing`);
      return false; // Ne pas créer de feature pour les tubes
    }
    
    // Vérifier si c'est un rectangle qui correspond aux dimensions du profil
    const tolerance = 5; // 5mm de tolérance
    
    // Pour les faces web et bottom
    // Vérifier si c'est une face où on s'attend à un contour rectangulaire
    const isRelevantFace = (typeof face === 'string' && (face === 'web' || face === 'o' || face === 'bottom' || face === 'u')) ||
                           face === StandardFace.WEB || face === StandardFace.BOTTOM_FLANGE;
    
    if (isRelevantFace) {
      // Le contour devrait avoir la longueur et la largeur du profil
      const isFullLength = Math.abs(contourLength - profileLength) < tolerance;
      const isFullWidth = Math.abs(contourHeight - profileWidth) < tolerance;
      
      if (isFullLength && isFullWidth) {
        console.log(`  📐 Profile base shape detected: ${contourLength}x${contourHeight} matches ${profileLength}x${profileWidth}`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Détecte si un contour représente des notches aux extrémités
   * Analyse la différence entre la longueur du contour et la longueur du profil
   */
  private detectNotchesFromContour(points: any[], face?: StandardFace | string | undefined): boolean {
    if (!points || points.length < 3) {
      return false;
    }
    
    // Utiliser les dimensions du profil courant
    const profileLength = this.currentProfileDimensions?.length || 0;
    if (profileLength === 0) {
      return false;
    }
    
    // Trouver les coordonnées X min et max du contour
    let minX = Infinity;
    let maxX = -Infinity;
    
    for (const point of points) {
      const x = point.x !== undefined ? point.x : point[0];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    
    // Si le contour est plus court que le profil, c'est probablement des notches
    const contourLength = maxX - minX;
    const lengthDifference = profileLength - contourLength;
    
    // Tolérance de 1mm pour les erreurs d'arrondi
    if (lengthDifference > 1) {
      console.log(`  📏 Notch detection: Contour length=${contourLength}mm, Profile length=${profileLength}mm`);
      console.log(`  📏 Difference=${lengthDifference}mm - Notches detected!`);
      console.log(`  📏 Face: ${face || 'unknown'}`);
      return true;
    }
    
    return false;
  }

  /**
   * Traite les contours AK pour les tubes HSS
   * Pour les tubes, les contours AK représentent la forme FINALE après coupe
   * Il faut donc inverser la logique pour créer les features de coupe
   */
  // Track which cuts have been created for this tube to avoid duplicates
  // Static to persist across multiple stage instances
  private static tubeEndCutTracker: Map<string, { startCreated: boolean, endCreated: boolean }> = new Map();
  
  // Liste des features de tube en attente (pour gérer les multiples features)
  private pendingTubeFeatures: NormalizedFeature[] = [];

  private async processTubeAKContour(block: DSTVParsedBlock): Promise<NormalizedFeature[]> {
    const data = block.data;
    const points = data.points || [];
    const face = data.face;
    
    if (!points || points.length < 3) {
      console.log(`  ❌ Invalid AK contour for tube: ${points?.length || 0} points`);
      return []; // Retourne un tableau vide
    }
    
    // IMPORTANT: Pour éviter les coupes multiples sur la même extrémité,
    // ne traiter que les contours de la face principale (v/web)
    // Les autres faces ont des contours similaires qui représentent la même coupe
    if (face !== 'v' && face !== 'web') {
      console.log(`  ⏭️ Skipping AK contour for tube on face ${face} (only processing main face 'v'/'web')`);
      return []; // Retourne un tableau vide
    }

    // Create unique key for this tube to track cuts
    // IMPORTANT: Utiliser une clé SANS la face pour éviter les duplications
    // Un tube ne doit avoir qu'une seule coupe par extrémité, peu importe la face
    const tubeKey = `${this.currentProfileType || 'unknown'}_${this.currentProfileDimensions?.length || 0}`;
    
    if (!DSTVNormalizationStage.tubeEndCutTracker.has(tubeKey)) {
      DSTVNormalizationStage.tubeEndCutTracker.set(tubeKey, { startCreated: false, endCreated: false });
    }
    
    const tracker = DSTVNormalizationStage.tubeEndCutTracker.get(tubeKey)!;
    
    const profileLength = this.currentProfileDimensions?.length || 0;
    
    // Analyser les points du contour pour détecter les coupes
    const xs = points.map((p: any) => p.x || p[0] || 0);
    
    
    // Pour les tubes HSS, l'AK contour montre la forme FINALE après coupe
    // Analyser les extrémités du contour pour détecter les coupes
    let startCut = false;
    let endCut = false;
    let startCutLength = 0;
    let endCutLength = 0;
    
    // Analyser les extrémités X du contour
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    
    console.log(`     Contour X bounds: [${minX.toFixed(1)}, ${maxX.toFixed(1)}]`);
    console.log(`     Profile length: ${profileLength.toFixed(1)}`);
    
    // Pour les tubes HSS, chercher les points intermédiaires qui indiquent les coupes
    // Si le contour a des points aux extrémités (0 et profileLength) mais aussi des points intermédiaires,
    // ces points intermédiaires indiquent la position finale après coupe
    
    // Trier les points X pour analysis
    const sortedXs = [...xs].sort((a, b) => a - b);
    console.log(`     Sorted X points: [${sortedXs.map(x => x.toFixed(1)).join(', ')}]`);
    
    // Chercher le premier point non-zéro significatif (coupe START)
    let firstSignificantX = 0;
    for (const x of sortedXs) {
      if (x > 10) { // Plus de 10mm depuis le début
        firstSignificantX = x;
        break;
      }
    }
    
    // Chercher le dernier point significatif avant la fin (coupe END)  
    let lastSignificantX = profileLength;
    for (let i = sortedXs.length - 1; i >= 0; i--) {
      const x = sortedXs[i];
      if (x < profileLength - 10) { // Plus de 10mm avant la fin
        lastSignificantX = x;
        break;
      }
    }
    
    console.log(`     Significant points: START=${firstSignificantX.toFixed(1)}, END=${lastSignificantX.toFixed(1)}`);
    
    // Détecter coupe START
    if (firstSignificantX > 10) {
      startCut = true;
      startCutLength = firstSignificantX;
      console.log(`     🔍 START cut detected: cut from 0 to X=${firstSignificantX.toFixed(1)} -> cut length = ${startCutLength.toFixed(1)}mm`);
    }
    
    // Détecter coupe END
    if (lastSignificantX < profileLength - 10) {
      endCut = true;
      endCutLength = profileLength - lastSignificantX;
      console.log(`     🔍 END cut detected: cut from X=${lastSignificantX.toFixed(1)} to ${profileLength.toFixed(1)} -> cut length = ${endCutLength.toFixed(1)}mm`);
    }
    
    // Pour h5004, on a des coupes angulaires complexes aux extrémités
    // Détectons les segments diagonaux qui indiquent une coupe d'angle
    let startAngle = 90; // Angle par défaut pour coupe droite
    let endAngle = 90;   // Angle par défaut pour coupe droite
    
    // Calculer l'angle de la coupe de début
    if (startCut) {
      // Chercher le segment diagonal au début
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        
        // Si on trouve un segment diagonal significatif au début (x < 100mm)
        if (Math.abs(dx) > 10 && Math.abs(dy) > 10 && points[i-1].x < 100) {
          // Calculer l'angle en degrés
          // L'angle DSTV semble être depuis la verticale, pas l'horizontale
          // Pour h5004: dx=28.39, dy=50.80 donne atan2(dx,dy)=29.2° qui correspond au DSTV
          startAngle = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
          console.log(`     🔺 START Angle cut detected:`);
          console.log(`        - Points: (${points[i-1].x.toFixed(1)}, ${points[i-1].y.toFixed(1)}) → (${points[i].x.toFixed(1)}, ${points[i].y.toFixed(1)})`);
          console.log(`        - dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
          console.log(`        - atan2(${Math.abs(dx).toFixed(1)}, ${Math.abs(dy).toFixed(1)}) = ${startAngle.toFixed(1)}° (from vertical)`);
          break;
        }
      }
    }
    
    // Calculer l'angle de la coupe de fin
    if (endCut) {
      // Chercher le segment diagonal à la fin
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        
        // Si on trouve un segment diagonal significatif à la fin (x > profileLength - 200)
        if (Math.abs(dx) > 10 && Math.abs(dy) > 10 && points[i].x > profileLength - 200) {
          // Calculer l'angle en degrés
          // L'angle DSTV est depuis la verticale, pas l'horizontale
          // Pour h5004: dx=90.89, dy=50.80 donne atan2(dx,dy)=60.8° qui correspond au DSTV
          endAngle = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
          console.log(`     🔺 END Angle cut detected:`);
          console.log(`        - Points: (${points[i-1].x.toFixed(1)}, ${points[i-1].y.toFixed(1)}) → (${points[i].x.toFixed(1)}, ${points[i].y.toFixed(1)})`);
          console.log(`        - dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
          console.log(`        - atan2(${Math.abs(dx).toFixed(1)}, ${Math.abs(dy).toFixed(1)}) = ${endAngle.toFixed(1)}° (from vertical)`);
          break;
        }
      }
    }
    
    // IMPORTANT: Un tube peut avoir des coupes aux DEUX extrémités
    // Nous devons créer les DEUX features en même temps pour éviter le problème du tracker
    const features: NormalizedFeature[] = [];
    
    // Créer les deux coupes si elles n'ont pas déjà été créées
    if (startCut && !tracker.startCreated) {
      
      tracker.startCreated = true;
      
      // Feature pour la coupe de début
      // IMPORTANT: La coupe est à l'extrémité (0), pas au point de transition
      const startFeature = await this.createTubeEndCutFeature(
        block,
        data,
        points,
        face,
        0,  // Position réelle de l'extrémité du tube
        startCutLength,
        startAngle, // Utiliser l'angle calculé
        'start'
      );
      if (startFeature) {
        features.push(startFeature);
      }
    }
    
    if (endCut && !tracker.endCreated) {
      tracker.endCreated = true;
      
      // Créer UNE SEULE feature pour la coupe de fin
      // L'angle dépend de la face du contour
      // IMPORTANT: La coupe est à l'extrémité, pas au point de transition
      const endFeature = await this.createTubeEndCutFeature(
        block,
        data,
        points,
        face,
        profileLength,  // Position réelle de l'extrémité du tube
        endCutLength,
        endAngle, // Utiliser l'angle calculé
        'end'
      );
      if (endFeature) {
        endFeature.id = this.generateFeatureId('end_cut_end');
        features.push(endFeature);
      }
    }
    
    // Si on a créé des features, les retourner TOUTES
    if (features.length > 0) {
      return features;
    }
    
    // Si les deux coupes ont déjà été créées, ne rien faire
    if ((startCut && tracker.startCreated) && (endCut && tracker.endCreated)) {
      return [];
    }
    
    // Si pas de coupe détectée
    return [];
  }
  
  /**
   * Crée une feature de coupe d'extrémité pour un tube
   */
  private async createTubeEndCutFeature(
    block: DSTVParsedBlock,
    data: any,
    points: any[],
    face: string,
    xPosition: number,
    cutLength: number,
    angle: number,
    position: 'start' | 'end'
  ): Promise<NormalizedFeature> {
    // Position de la coupe
    // IMPORTANT: Le tube est orienté sur l'axe Z, pas X !
    // Les coupes doivent être positionnées sur l'axe Z
    const standardCoords = { 
      x: 0,
      y: 0, 
      z: xPosition  // Position sur l'axe Z (0 pour début, profileLength pour fin)
    };
    
    
    // Créer la feature de coupe d'extrémité DROITE (pas de contour)
    const feature: NormalizedFeature = {
      id: this.generateFeatureId(`end_cut_${position}`),
      type: NormalizedFeatureType.END_CUT,  // Utiliser END_CUT au lieu de CUT
      coordinates: standardCoords,
      parameters: {
        face: (face as StandardFace) || StandardFace.WEB,
        chamferLength: cutLength, // Utiliser chamferLength pour CutProcessor
        angle: angle,  
        position: position,  // 'start' ou 'end'
        cutType: 'end_cut',  // Type spécifique pour éviter la validation des points
        isEndCut: true,  // Flag explicite pour le CutProcessor
        cutPosition: position,  // Position de la coupe pour le processor
        // Pas de points pour une coupe droite simple
      },
      metadata: {
        source: 'dstv',
        blockType: 'AK',
        originalBlock: DSTVBlockType.AK,
        workPlane: 'dstv',
        originalData: data,
        profileType: this.currentProfileType,
        interpretation: `tube_${position}_cut_from_final_shape`,
        processingOrder: 950,
        applyOnly: true
      }
    };
    
    return feature;
  }
  
  /**
   * Analyse détaillée du type de contour pour détecter les coupes avec encoches
   * Détecte les extensions et les encoches partielles (comme pour M1002)
   */
  private analyzeContourType(points: any[], face?: StandardFace | string | undefined): 'NOTCH' | 'CUT_WITH_NOTCHES' | 'STRAIGHT_CUT' | 'ANGLE_CUT' | 'CONTOUR' | null {
    if (!points || points.length < 3) {
      console.log(`  ❌ Invalid points: ${points?.length || 0} points`);
      return null;
    }
    
    const profileLength = this.currentProfileDimensions?.length || 0;
    const profileType = this.currentProfileType;
    const isTube = profileType === 'TUBE_RECT' || profileType === 'TUBE_ROUND';
    
    // Détecter les coupes d'angle complètes (diagonales) sur tubes
    if (isTube && points.length >= 4) {
      // Vérifier si il y a des segments diagonaux
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(points[i].x - points[i-1].x);
        const dy = Math.abs(points[i].y - points[i-1].y);
        
        // Un segment diagonal a des changements significatifs en X et Y
        if (dx > 10 && dy > 10) {
          console.log(`  🔺 ANGLE CUT detected on tube - diagonal segment: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
          return 'ANGLE_CUT';
        }
      }
    }
    
    if (profileLength === 0) {
      console.log(`  ❌ No profile length available`);
      return null;
    }
    
    console.log(`  🔍 Analyzing ${points.length} points on face ${face}, profile length=${profileLength}mm, isTube=${isTube}`);
    
    // Analyser les coordonnées du contour
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const point of points) {
      const x = point.x !== undefined ? point.x : point[0];
      const y = point.y !== undefined ? point.y : point[1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    const contourLength = maxX - minX;
    const contourHeight = maxY - minY;
    
    console.log(`  📏 Contour bounds: X[${minX.toFixed(1)}, ${maxX.toFixed(1)}] = ${contourLength.toFixed(1)}mm`);
    console.log(`  📏 Contour height: Y[${minY.toFixed(1)}, ${maxY.toFixed(1)}] = ${contourHeight.toFixed(1)}mm`);
    
    
    // NOUVEAU: Détecter les coupes droites sur tubes (très courant)
    // Caractéristiques: 5 points (rectangle fermé), sur tube HSS
    if (isTube && points.length === 5) { // Réactivé après correction
      // Vérifier si c'est un rectangle fermé
      const firstPoint = points[0];
      const lastPoint = points[4];
      const firstX = firstPoint.x !== undefined ? firstPoint.x : firstPoint[0];
      const firstY = firstPoint.y !== undefined ? firstPoint.y : firstPoint[1];
      const lastX = lastPoint.x !== undefined ? lastPoint.x : lastPoint[0];
      const lastY = lastPoint.y !== undefined ? lastPoint.y : lastPoint[1];
      
      const isClosed = Math.abs(firstX - lastX) < 0.1 && Math.abs(firstY - lastY) < 0.1;
      
      if (isClosed) {
        console.log(`  ✂️ STRAIGHT CUT detected on tube face ${face}`);
        return 'STRAIGHT_CUT';
      }
    }
    
    // Pour détecter les coupes avec encoches (M1002), analyser le pattern spécifique :
    // - 9 points exactement
    // - Contour qui dépasse la longueur habituelle (cas M1002: 1912.15 vs blocs standards de 1842.1)
    // - Face 'top' ou 'bottom' (ailes)
    
    const isComplexContour = points.length === 9;
    const isFlangeFace = (face === 'top' || face === 'o' || face === 'bottom' || face === 'u');
    const isWebFace = (face === 'web' || face === 'v');
    
    // Pour M1002: détecter le pattern où le contour fait la longueur complète du profil
    // alors que les autres blocs AK font seulement 1842.1mm
    const isFullLengthContour = Math.abs(contourLength - profileLength) < 1.0; // Contour = longueur du profil
    
    console.log(`  🔧 Analysis: complex=${isComplexContour}, flange=${isFlangeFace}, fullLength=${isFullLengthContour}`);
    console.log(`  🔧 ContourLength=${contourLength.toFixed(1)}mm vs ProfileLength=${profileLength}mm`);
    
    // Pattern M1002 : 9 points sur le web = découpe avec encoches
    if (isComplexContour && isWebFace) {
      console.log(`  🔧 Web cut with notches detected (M1002 pattern): Points=${points.length}, Face=${face}`);
      console.log(`  🔧 Contour: ${contourLength.toFixed(1)}x${contourHeight.toFixed(1)}mm`);
      return 'CUT_WITH_NOTCHES';
    }
    
    // Pattern M1002 : contour pleine longueur sur aile = découpe
    if (isFlangeFace && isFullLengthContour) {
      console.log(`  🔧 Flange cut detected (full length): Points=${points.length}, Face=${face}`);
      return 'CUT_WITH_NOTCHES';
    }
    
    // Pour les profils I, un contour AK sur les ailes représente une découpe
    // Si c'est un contour rectangulaire simple sur une aile, c'est une découpe
    if (isFlangeFace && points.length >= 4 && points.length <= 5) {
      // Vérifier si c'est un rectangle (4 ou 5 points avec le dernier = premier)
      const isRectangle = points.length === 5 ? 
        (Math.abs(points[0].x - points[4].x) < 0.01 && Math.abs(points[0].y - points[4].y) < 0.01) : true;
      
      if (isRectangle && contourLength < profileLength) {
        console.log(`  🔧 Flange cut detected: Rectangle on ${face} face, ${contourLength.toFixed(1)}mm < ${profileLength}mm`);
        return 'CUT_WITH_NOTCHES'; // Découpe sur l'aile
      }
    }
    
    // Pour les profils I, un contour AK est une coupe SEULEMENT si :
    // 1. Il est significativement plus court que le profil (coupe partielle)
    // 2. Il n'est pas un simple rectangle couvrant toute la face
    const isIProfile = this.currentProfileType === 'I_PROFILE' || this.currentProfileType === 'I';
    if (isIProfile && points.length >= 4) {
      // Vérifier si c'est une vraie coupe ou juste la forme de base
      const xs = points.map((p: any) => p.x || p[0] || 0);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const contourXLength = maxX - minX;
      
      // Si le contour couvre presque toute la longueur du profil, c'est la forme de base, pas une coupe
      const profileLength = this.currentProfileDimensions?.length || 2000;
      const isFullLength = contourXLength >= profileLength * 0.95; // 95% ou plus de la longueur
      
      if (!isFullLength && contourLength > 10) {
        // C'est une vraie coupe partielle
        return 'CUT_WITH_NOTCHES';
      }
    }
    
    // Sinon c'est un contour normal
    return 'CONTOUR';
  }
  
  /**
   * Détecte si plusieurs blocs AK forment un pattern de notches cohérent
   */
  private isNotchPattern(blocks: DSTVParsedBlock[]): boolean {
    // Vérifier que tous les blocs sont des AK
    if (!blocks.every(b => b.type === DSTVBlockType.AK)) {
      return false;
    }
    
    if (blocks.length < 2) return false;
    
    // Analyser les caractéristiques pour détecter un pattern de notches
    const faces = blocks.map(b => b.data.face);
    const pointCounts = blocks.map(b => b.data.points?.length || 0);
    
    // Pattern générique de notches : 
    // - Au moins un bloc avec plus de 5 points (contour complexe)
    // - Blocs sur différentes faces ou même face avec pattern répétitif
    const hasComplexContour = pointCounts.some(count => count > 5);
    const hasMultipleFaces = new Set(faces).size > 1;
    
    // Détecter les patterns récurrents de notches
    if (hasComplexContour || hasMultipleFaces) {
      // Analyser si les contours décrivent des notches
      for (const block of blocks) {
        const contourType = this.analyzeContourType(block.data.points, block.data.face);
        if (contourType === 'CUT_WITH_NOTCHES' || contourType === 'NOTCH') {
          console.log(`  🎯 Pattern de notches détecté (${blocks.length} blocs AK)`);
          blocks.forEach((b, i) => {
            console.log(`    - Bloc ${i + 1} : ${b.data.points?.length} points sur ${b.data.face}`);
          });
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Crée les features de notches à partir des blocs AK
   */
  private async createNotchFeatures(
    mainBlock: DSTVParsedBlock,
    allBlocks: DSTVParsedBlock[],
    _context: ProcessingContext
  ): Promise<NormalizedFeature[]> {
    const data = mainBlock.data;
    
    // Calculer les dimensions pour la conversion de coordonnées
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Calculer le centre du contour principal (9 points)
    const contourCenter = this.calculateContourCenter(data.points);
    const positionContext = {
      profileType: this.currentProfileType || 'I_PROFILE',
      dimensions: dims,
      face: 'web' // Toujours sur l'âme pour M1002
    };
    
    const standardPosition = this.positionService.convertPosition(
      contourCenter,
      'dstv',
      positionContext
    );
    
    const standardCoords = {
      x: standardPosition.position.x,
      y: standardPosition.position.y,
      z: standardPosition.position.z
    };
    
    // Créer une feature principale pour le contour avec notches
    const mainFeature: NormalizedFeature = {
      id: this.generateFeatureId('cut-with-notches'),
      type: NormalizedFeatureType.CUT_WITH_NOTCHES,
      coordinates: standardCoords,
      parameters: {
        // Points du contour principal (9 points sur l'âme)
        points: data.points ? data.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : [],
        closed: true,
        contourType: 'outer',
        interpolation: 'linear',
        face: 'web',
        // Informations spécifiques M1002
        cutType: 'partial_notches',
        source: 'notch_pattern_detection'
      },
      metadata: {
        originalBlock: DSTVBlockType.AK,
        workPlane: 'E0',
        processingOrder: this.getBlockProcessingPriority(DSTVBlockType.AK),
        applyOnly: true,
        face: StandardFace.WEB,
        isNotchPattern: true,
        mergedAkBlocks: allBlocks.length
      }
    };
    
    console.log(`  ✅ Créé feature de notches principale : ${mainFeature.id}`);
    console.log(`    - Type : ${mainFeature.type}`);
    console.log(`    - Points : ${mainFeature.parameters.points?.length}`);
    console.log(`    - Blocs AK fusionnés : ${allBlocks.length}`);
    
    // Note: Les notches individuelles seront extraites automatiquement par NotchProcessor
    
    return [mainFeature];
  }
}