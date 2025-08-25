/**
 * Stage de normalisation DSTV
 * 
 * Quatrième étape du pipeline - convertit les données DSTV validées vers le format pivot interne.
 * Cette étape transforme les structures DSTV spécifiques en représentations génériques réutilisables.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';
import { DSTVValidatedData, DSTVNormalizedData } from '../DSTVImportPipeline';
import { DSTVParsedBlock, DSTVBlockType } from './DSTVSyntaxStage';
import { StandardFace } from '../../../../core/coordinates/types';
import { PositionService } from '../../../../core/services/PositionService';

/**
 * Types de features normalisées
 */
export enum NormalizedFeatureType {
  HOLE = 'hole',
  CUT = 'cut',
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
    
    // Extraire les dimensions de la section
    const crossSection = this.extractCrossSectionFromSTData(data);
    
    // Stocker les dimensions pour la conversion des coordonnées
    this.currentProfileDimensions = {
      length: data.profileLength || 0,
      height: crossSection.height || 0,
      width: crossSection.width || 0
    };
    
    console.log(`📐 Profile dimensions set for coordinate conversion:`, this.currentProfileDimensions);
    
    const profile: NormalizedProfile = {
      id: this.generateProfileId(data),
      name: data.profileName || 'Unknown Profile',
      type: this.mapProfileTypeToStandard(data.profileName, data.profileType),
      material: {
        grade: data.steelGrade || 'Unknown',
        properties: this.extractMaterialProperties(data.steelGrade)
      },
      dimensions: {
        length: data.profileLength || 0,
        crossSection
      },
      features: [], // Sera rempli plus tard
      metadata: {
        orderNumber: data.orderNumber,
        drawingNumber: data.drawingNumber,
        phaseNumber: data.phaseNumber,
        pieceNumber: data.pieceNumber,
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
    
    for (const block of blocks) {
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
        return [await this.normalizeAKBlock(block)];
      case DSTVBlockType.IK:
        return [await this.normalizeIKBlock(block)];
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
        return [await this.normalizeUEBlock(block)];
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
      profileType: 'I_PROFILE',
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
        depth: data.depth || (dims as any).thickness || 10,
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
  private async normalizeUEBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    // Utiliser les dimensions stockées ou des valeurs par défaut
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Créer le contexte pour la conversion de face
    const positionContext = {
      profileType: 'I_PROFILE',
      dimensions: dims,
      face: data.face || 'web'
    };
    
    return {
      id: this.generateFeatureId('unrestricted_contour'),
      type: NormalizedFeatureType.UNRESTRICTED_CONTOUR,
      coordinates: this.calculateContourCenter(data.points),
      parameters: {
        points: data.points,
        closed: data.closed !== false,
        bulge: data.bulge || [],
        depth: data.depth || (dims as any).thickness || 10,
        operation: data.operation || 'subtract',
        subContours: data.subContours
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
          profileType: 'I_PROFILE',
          dimensions: dims,
          face: hole.face || 'web'
        };
        
        
        const standardPosition = this.positionService.convertPosition(
          { x: hole.x, y: hole.y, z: hole.z || 0 },
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
            diameter: hole.diameter,
            depth: hole.depth || 0,  // 0 = through hole
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
      profileType: 'I_PROFILE',
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
   */
  private async normalizeAKBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    // Vérifier si c'est un contour rectangulaire complet (forme de base du profil)
    const isProfileShape = this.isProfileBaseShape(data.points, data.face);
    
    if (isProfileShape) {
      // Ne pas créer de feature pour la forme de base du profil
      console.log(`  📐 AK block detected as profile base shape - skipping`);
      return null as any; // Sera filtré plus tard
    }
    
    // Analyser le type de contour avec la nouvelle méthode détaillée
    console.log(`  🔍 Analyzing contour type for ${data.points?.length || 0} points on face ${data.face || 'unknown'}`);
    const contourType = this.analyzeContourType(data.points, data.face);
    console.log(`  🔍 Contour type result: ${contourType}`);
    
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
        profileType: 'I_PROFILE',
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
      
      return feature;
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
        profileType: 'I_PROFILE',
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
      
      return feature;
    }
    
    // Si c'est un contour de forme de base (plus court que le profil), ne pas créer de feature
    if (contourType === 'CONTOUR') {
      const profileLength = this.currentProfileDimensions?.length || 0;
      
      // Calculer les bounds du contour
      let minX = Infinity;
      let maxX = -Infinity;
      for (const point of data.points) {
        const x = point.x !== undefined ? point.x : point[0];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      const contourLength = maxX - minX;
      
      if (profileLength - contourLength > 1) {
        console.log(`  📐 Skipping base shape contour: ${contourLength.toFixed(1)}mm < ${profileLength}mm`);
        return null as any; // Ne pas créer de feature pour les formes de base
      }
    }
    
    // Sinon, traiter comme un contour normal
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
      profileType: 'I_PROFILE',
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

    return feature;
  }

  /**
   * Normalise un bloc IK (Inner contour)
   */
  private async normalizeIKBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const feature = await this.normalizeAKBlock(block); // Logique similaire
    
    // Modifications spécifiques aux contours intérieurs
    feature.id = this.generateFeatureId('contour_inner');
    feature.parameters.contourType = 'inner';
    
    return feature;
  }

  /**
   * Normalise un bloc SI (Marking)
   */
  private async normalizeSIBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    console.log('🎯 normalizeSIBlock - Input data:', data);
    
    // Utiliser les dimensions stockées ou des valeurs par défaut
    const dims = this.currentProfileDimensions || {
      length: 1912.15,
      height: 251.4,
      width: 146.1
    };
    
    // Pour un marquage sur la face 'v' (top flange), nous ne devons PAS convertir les coordonnées
    // car elles sont déjà dans le bon système (X le long du profil, Y latéral sur l'aile)
    // La conversion les transforme incorrectement
    
    let standardCoords;
    
    if (data.face === 'v' || data.face === 'u') {
      // Pour les faces d'aile, garder les coordonnées DSTV directes
      // car elles représentent déjà la bonne position
      standardCoords = {
        x: data.x,  // Position le long du profil
        y: data.y,  // Position latérale sur l'aile
        z: data.z || 0
      };
      console.log('🎯 Using direct DSTV coords for flange face:', standardCoords);
    } else {
      // Pour les autres faces, utiliser la conversion
      const positionContext = {
        profileType: 'I_PROFILE',
        dimensions: dims,
        face: data.face || 'web'
      };
      
      const standardPosition = this.positionService.convertPosition(
        { x: data.x, y: data.y, z: data.z || 0 },
        'dstv',
        positionContext
      );
      
      standardCoords = {
        x: standardPosition.position.x,
        y: standardPosition.position.y,
        z: standardPosition.position.z
      };
      console.log('🎯 Using converted coords for web/other face:', standardCoords);
    }
    
    return {
      id: this.generateFeatureId('marking'),
      type: NormalizedFeatureType.MARKING,
      coordinates: standardCoords,
      parameters: {
        text: data.text,
        height: data.height || 10,
        angle: data.angle || 0,
        depth: data.depth || 0.1,
        font: 'standard',
        markingMethod: 'engrave',
        face: data.face || 'web'
      },
      metadata: {
        originalBlock: block.type,
        originalDSTVCoords: { x: data.x, y: data.y, z: data.z || 0 },
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type),
        applyOnly: true  // Les features DSTV sont appliquées à la géométrie, pas créées comme éléments séparés
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
      profileType: 'I_PROFILE',
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
   * Mappe le type de profil vers un type standard
   */
  private mapProfileTypeToStandard(profileName: string, profileType?: string): string {
    // Si on a un profileName, déduire le type à partir de celui-ci
    if (profileName) {
      const upperName = profileName.toUpperCase();
      
      // Profils I (HEA, HEB, HEM, IPE, IPN, UB, UC, etc.)
      if (upperName.startsWith('HE') || upperName.startsWith('IPE') || 
          upperName.startsWith('IPN') || upperName.startsWith('UB') || 
          upperName.startsWith('UC') || upperName.startsWith('W')) {
        return 'I_PROFILE';
      }
      
      // Profils U (UPN, UPE, UAP, etc.)
      if (upperName.startsWith('UPN') || upperName.startsWith('UPE') || 
          upperName.startsWith('UAP') || upperName.startsWith('U') && !upperName.startsWith('UB') && !upperName.startsWith('UC')) {
        return 'U_PROFILE';
      }
      
      // Cornières (L)
      if (upperName.startsWith('L') && upperName.match(/L\d+/)) {
        return 'L_PROFILE';
      }
      
      // Tubes
      if (upperName.includes('RHS') || upperName.includes('SHS')) {
        return 'TUBE_RECT';
      }
      if (upperName.includes('CHS') || upperName.includes('ROND')) {
        return 'TUBE_ROUND';
      }
      
      // Plats
      if (upperName.includes('FLAT') || upperName.includes('PLAT')) {
        return 'FLAT_BAR';
      }
      
      // Tôles
      if (upperName.includes('PLATE') || upperName.includes('TOLE')) {
        return 'PLATE';
      }
    }
    
    // Si on a un profileType explicite, l'utiliser
    if (profileType) {
      const upperType = profileType.toUpperCase();
      
      // Mapping direct
      const typeMapping: Record<string, string> = {
        'I': 'I_PROFILE',
        'U': 'U_PROFILE',
        'L': 'L_PROFILE',
        'T': 'T_PROFILE',
        'Z': 'Z_PROFILE',
        'C': 'C_PROFILE',
        'TUBE': 'TUBE_RECT',
        'PIPE': 'TUBE_ROUND',
        'PLATE': 'PLATE',
        'FLAT': 'FLAT_BAR'
      };
      
      if (typeMapping[upperType]) {
        return typeMapping[upperType];
      }
    }
    
    // Fallback
    return 'I_PROFILE'; // La plupart des profils sont des I
  }

  /**
   * Extrait les dimensions de la section transversale à partir des données réelles du bloc ST
   */
  private extractCrossSectionFromSTData(data: any): Record<string, number> {
    const dimensions: Record<string, number> = {};
    
    // Utiliser les dimensions réelles du fichier DSTV au lieu du nom
    if (data.profileHeight !== undefined) {
      dimensions.height = data.profileHeight;
    }
    if (data.profileWidth !== undefined) {
      dimensions.width = data.profileWidth;
    }
    if (data.webThickness !== undefined) {
      dimensions.webThickness = data.webThickness;
    }
    if (data.flangeThickness !== undefined) {
      dimensions.flangeThickness = data.flangeThickness;
    }
    if (data.rootRadius !== undefined) {
      dimensions.radius = data.rootRadius;
    }
    
    // Fallback vers extraction du nom si pas de données numériques
    if (Object.keys(dimensions).length === 0 && data.profileName) {
      console.warn('No ST dimension data found, falling back to name parsing for:', data.profileName);
      return this.extractCrossSectionDimensions(data.profileName, data.profileType);
    }
    
    console.log(`Extracted dimensions from ST data: height=${dimensions.height}, width=${dimensions.width}, webThickness=${dimensions.webThickness}, flangeThickness=${dimensions.flangeThickness}`);
    
    return dimensions;
  }

  private extractCrossSectionDimensions(profileName: string, profileType: string): Record<string, number> {
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
   * Vérifie si un contour est la forme de base du profil (rectangle complet)
   */
  private isProfileBaseShape(points: any[], face?: StandardFace | string | undefined): boolean {
    if (!points || points.length < 4) {
      return false;
    }
    
    const profileLength = this.currentProfileDimensions?.length || 0;
    const profileWidth = this.currentProfileDimensions?.width || 0;
    const profileHeight = this.currentProfileDimensions?.height || 0;
    
    // Analyser les dimensions du contour
    const xs = points.map(p => p.x || p[0] || 0);
    const ys = points.map(p => p.y || p[1] || 0);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const contourLength = maxX - minX;
    const contourHeight = maxY - minY;
    
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
   * Analyse détaillée du type de contour pour détecter les coupes avec encoches
   * Détecte les extensions et les encoches partielles (comme pour M1002)
   */
  private analyzeContourType(points: any[], face?: StandardFace | string | undefined): 'NOTCH' | 'CUT_WITH_NOTCHES' | 'CONTOUR' | null {
    if (!points || points.length < 3) {
      console.log(`  ❌ Invalid points: ${points?.length || 0} points`);
      return null;
    }
    
    const profileLength = this.currentProfileDimensions?.length || 0;
    if (profileLength === 0) {
      console.log(`  ❌ No profile length available`);
      return null;
    }
    
    console.log(`  🔍 Analyzing ${points.length} points on face ${face}, profile length=${profileLength}mm`);
    
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
    
    // Pour détecter les coupes avec encoches (M1002), analyser le pattern spécifique :
    // - 9 points exactement
    // - Contour qui dépasse la longueur habituelle (cas M1002: 1912.15 vs blocs standards de 1842.1)
    // - Face 'top' ou 'bottom' (ailes)
    
    const isComplexContour = points.length === 9;
    const isFlangeFace = (face === 'top' || face === 'v' || face === 'bottom' || face === 'u');
    
    // Pour M1002: détecter le pattern où le contour fait la longueur complète du profil
    // alors que les autres blocs AK font seulement 1842.1mm
    const isFullLengthContour = Math.abs(contourLength - profileLength) < 1.0; // Contour = longueur du profil
    
    console.log(`  🔧 Analysis: complex=${isComplexContour}, flange=${isFlangeFace}, fullLength=${isFullLengthContour}`);
    console.log(`  🔧 ContourLength=${contourLength.toFixed(1)}mm vs ProfileLength=${profileLength}mm`);
    
    // Pattern M1002 : 9 points + aile + contour pleine longueur
    if (isComplexContour && isFlangeFace && isFullLengthContour) {
      console.log(`  🔧 Cut with notches detected (M1002 pattern): Points=${points.length}, Face=${face}`);
      console.log(`  🔧 Contour: ${contourLength.toFixed(1)}x${contourHeight.toFixed(1)}mm`);
      return 'CUT_WITH_NOTCHES';
    }
    
    // Pour M1002, seules les faces avec extension (contour pleine longueur) créent des découpes
    // Les autres faces (contour court) représentent juste la forme sans découpe
    if (profileLength - contourLength > 1) {
      console.log(`  📐 No cutting needed: Contour=${contourLength.toFixed(1)}mm < Profile=${profileLength}mm`);
      console.log(`  📐 This represents the base shape without any cutting operation`);
      return 'CONTOUR'; // Pas de découpe, juste la forme de base
    }
    
    // Sinon c'est un contour normal
    console.log(`  📐 Regular contour detected: ${contourLength.toFixed(1)}mm`);
    return 'CONTOUR';
  }
}