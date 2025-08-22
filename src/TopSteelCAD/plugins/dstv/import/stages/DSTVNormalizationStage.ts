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

/**
 * Types de features normalisées
 */
export enum NormalizedFeatureType {
  HOLE = 'hole',
  CUT = 'cut',
  CONTOUR = 'contour',
  MARKING = 'marking',
  PUNCH = 'punch',
  WELD_PREP = 'weld_preparation',
  THREAD = 'thread',
  BEND = 'bend'
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
      const profile = await this.extractProfile(input.validBlocks, context);
      
      // Normaliser toutes les features
      const features = await this.normalizeAllFeatures(input.validBlocks, context);
      
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
        profiles: [profile], // DSTV = une pièce par fichier
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
        crossSection: this.extractCrossSectionFromSTData(data)
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
      material: profile.material.grade
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
        features.push(...normalizedFeatures);
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
        return [await this.normalizeBOBlock(block)];
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
      // TODO: Ajouter autres types de blocs
      default:
        this.log(context, 'debug', `Skipping unsupported block type: ${block.type}`);
        return [];
    }
  }

  // ================================
  // NORMALISEURS SPÉCIFIQUES PAR BLOC
  // ================================

  /**
   * Normalise un bloc BO (Hole)
   */
  private async normalizeBOBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    const feature: NormalizedFeature = {
      id: this.generateFeatureId('hole'),
      type: NormalizedFeatureType.HOLE,
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0 // DSTV 2D, Z sera calculé selon le plan de travail
      },
      parameters: {
        diameter: data.diameter,
        depth: data.depth,
        angle: data.angle || 0,
        tolerance: data.tolerance,
        holeType: 'round'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
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

    return feature;
  }

  /**
   * Normalise un bloc AK (Outer contour)
   */
  private async normalizeAKBlock(block: DSTVParsedBlock): Promise<NormalizedFeature> {
    const data = block.data;
    
    const feature: NormalizedFeature = {
      id: this.generateFeatureId('contour_outer'),
      type: NormalizedFeatureType.CONTOUR,
      coordinates: this.calculateContourCenter(data.points),
      parameters: {
        // Convertir Point2D[] vers Array<[number, number]> pour le ContourProcessor
        points: data.points ? data.points.map(p => [p.x, p.y] as [number, number]) : [],
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
    
    return {
      id: this.generateFeatureId('marking'),
      type: NormalizedFeatureType.MARKING,
      coordinates: {
        x: data.x,
        y: data.y,
        z: 0
      },
      parameters: {
        text: data.text,
        height: data.height || 10,
        angle: data.angle || 0,
        depth: data.depth || 0.1,
        font: 'standard',
        markingMethod: 'engrave'
      },
      metadata: {
        originalBlock: block.type,
        workPlane: data.plane || 'E0',
        processingOrder: this.getBlockProcessingPriority(block.type)
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
    
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length,
      z: 0
    };
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
}