/**
 * Pipeline d'export DSTV conforme à la norme officielle
 * 
 * Processus d'export en 5 étapes:
 * 1. Data Validation - Validation des données d'entrée
 * 2. Geometry Transformation - Conversion géométrie 3D vers coordonnées DSTV
 * 3. Feature Extraction - Extraction des features (trous, contours, marquages)
 * 4. Block Serialization - Sérialisation en blocs DSTV conformes
 * 5. Format Encoding - Encodage final au format DSTV/NC
 */

// Version simplifiée sans dépendances externes
import { PivotScene, PivotElement, MaterialType } from '../../../../types/viewer';
import { DSTVPluginConfig } from '../DSTVPlugin';

// Import des stages d'export
import { DSTVDataValidationStage } from './stages/DSTVDataValidationStage';
import { DSTVGeometryTransformationStage } from './stages/DSTVGeometryTransformationStage';
import { DSTVFeatureExtractionStage } from './stages/DSTVFeatureExtractionStage';
import { DSTVBlockSerializationStage } from './stages/DSTVBlockSerializationStage';
import { DSTVFormatEncodingStage } from './stages/DSTVFormatEncodingStage';

// Types pour le pipeline d'export
export interface DSTVExportData {
  geometry: {
    profile: {
      type: string;      // IPE, HEA, HEB, UPN, etc.
      dimensions: {
        height: number;
        width: number;
        webThickness: number;
        flangeThickness: number;
        length: number;
      };
    };
    material: string;    // S235, S355, etc.
    partId: string;
  };
  features: {
    holes: Array<{
      x: number;
      y: number;
      diameter: number;
      face: string;
      type?: string;     // BO, SI, LO, etc.
    }>;
    contours: Array<{
      type: 'AK' | 'IK';
      face: string;
      points: Array<{ x: number; y: number }>;
      closed: boolean;
    }>;
    markings: Array<{
      x: number;
      y: number;
      text: string;
      height: number;
      face: string;
      angle?: number;
    }>;
    cuts: Array<{
      type: 'SC';
      geometry: any;
    }>;
  };
  metadata?: {
    units: 'mm' | 'inch';
    version: string;
    timestamp: Date;
  };
}

export interface DSTVBlocks {
  header: {
    profile: string;
    material: string;
    length: number;
    dimensions: Record<string, number>;
  };
  blocks: Array<{
    type: string;
    lines: string[];
  }>;
}

/**
 * Pipeline d'export DSTV moderne et conforme
 */
export class DSTVExportPipeline {
  private stages: any[] = [];
  private config: DSTVPluginConfig;

  constructor(config?: Partial<DSTVPluginConfig>) {
    this.config = {
      strictMode: true,
      supportAllBlocks: true,
      validateContourClosure: true,
      enableAdvancedHoles: true,
      enableWeldingPreparation: false,
      enablePlaneDefinition: true,
      enableBendingSupport: false,
      enableGeometryCache: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      parallelBlockProcessing: false,
      enableDebugLogs: false,
      exportParsingMetrics: false,
      validationLevel: 'standard' as any,
      ...config
    };

    // Initialiser les stages
    this.stages = [
      new DSTVDataValidationStage(this.config),
      new DSTVGeometryTransformationStage(this.config),
      new DSTVFeatureExtractionStage(this.config),
      new DSTVBlockSerializationStage(this.config),
      new DSTVFormatEncodingStage(this.config)
    ];
  }

  /**
   * Execute le pipeline d'export
   * Accepte soit une PivotScene (depuis FormatEngine) soit des DSTVExportData
   */
  async execute(data: DSTVExportData | PivotScene, context?: any): Promise<string> {
    // Convertir PivotScene en DSTVExportData si nécessaire
    const exportData = this.isPivotScene(data) 
      ? this.convertSceneToExportData(data)
      : data;
    let processContext = context || {
      input: exportData,
      output: exportData,
      metadata: {
        format: 'DSTV',
        version: '7.0',
        timestamp: new Date(),
        config: this.config
      }
    };

    try {
      // Exécuter chaque stage séquentiellement
      for (const stage of this.stages) {
        processContext = await stage.process(processContext);
      }
      
      // Le résultat final est une chaîne DSTV formatée
      return processContext.output as string;
    } catch (error: any) {
      if (this.config.enableDebugLogs) {
        console.error('[DSTVExport] Pipeline error:', error);
      }
      throw new Error(`DSTV Export failed: ${error.message}`);
    }
  }

  /**
   * Valide les données avant export
   */
  async validate(data: DSTVExportData): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validation du profil
    if (!data.geometry?.profile?.type) {
      errors.push('Profile type is required');
    }
    if (!data.geometry?.material) {
      errors.push('Material specification is required');
    }
    if (!data.geometry?.profile?.dimensions?.length || data.geometry.profile.dimensions.length <= 0) {
      errors.push('Profile length must be positive');
    }

    // Validation des features
    if (data.features?.holes) {
      for (const hole of data.features.holes) {
        if (hole.diameter <= 0) {
          errors.push(`Invalid hole diameter: ${hole.diameter}`);
        }
        if (!['v', 'u', 'o', 's', 'top_flange', 'bottom_flange', 'web'].includes(hole.face)) {
          errors.push(`Invalid face indicator: ${hole.face}`);
        }
      }
    }

    // Validation des contours
    if (data.features?.contours) {
      for (const contour of data.features.contours) {
        if (contour.points.length < 2) {
          errors.push('Contours must have at least 2 points');
        }
        if (this.config.validateContourClosure && contour.closed) {
          const first = contour.points[0];
          const last = contour.points[contour.points.length - 1];
          const distance = Math.sqrt(
            Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
          );
          if (distance > 0.01) {
            errors.push(`Contour not properly closed (gap: ${distance.toFixed(3)}mm)`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtient les capacités d'export du pipeline
   */
  getCapabilities(): Record<string, boolean> {
    return {
      profiles: true,
      holes: true,
      contours: true,
      markings: true,
      cuts: this.config.supportAllBlocks,
      welding: this.config.enableWeldingPreparation,
      bending: this.config.enableBendingSupport,
      multiPlane: this.config.enablePlaneDefinition
    };
  }

  /**
   * Vérifie si l'input est une PivotScene
   */
  private isPivotScene(data: any): data is PivotScene {
    return data && data.elements instanceof Map && !data.geometry;
  }

  /**
   * Convertit une PivotScene en DSTVExportData
   */
  private convertSceneToExportData(scene: PivotScene): DSTVExportData {
    // Prendre le premier élément de type poutre/profil
    const element = Array.from(scene.elements.values()).find(el => 
      el.type === MaterialType.BEAM || 
      el.type === MaterialType.COLUMN ||
      el.materialType === MaterialType.BEAM ||
      el.materialType === MaterialType.COLUMN ||
      el.materialType === MaterialType.TUBE ||
      el.materialType === MaterialType.ANGLE ||
      el.materialType === MaterialType.CHANNEL ||
      el.materialType === MaterialType.TEE ||
      el.metadata?.elementType === 'BEAM' ||
      el.metadata?.originalFormat === 'DSTV' ||
      el.profile
    );

    if (!element) {
      throw new Error('No beam or profile element found in scene');
    }

    // Extraire les données du profil
    const profileData = this.extractProfileData(element);
    const features = this.extractFeatures(element);

    return {
      geometry: {
        profile: profileData,
        material: (typeof element.material === 'string' 
                  ? element.material 
                  : element.material?.grade || 'S235'),
        partId: element.id || 'PART-001'
      },
      features: features,
      metadata: {
        units: 'mm',
        version: '7.0',
        timestamp: new Date()
      }
    };
  }

  /**
   * Extrait les données du profil depuis un PivotElement
   */
  private extractProfileData(element: PivotElement): DSTVExportData['geometry']['profile'] {
    // Parser le nom du profil depuis les métadonnées ou utiliser le type de matériau
    const profileName = element.profile || 
                       element.name || 
                       element.metadata?.originalData?.profileName ||
                       element.metadata?.originalData?.name ||
                       'TUBE_RECT';
    
    // Extraire les dimensions depuis element.dimensions ou les métadonnées
    const dims = element.dimensions;
    const bounds = element.bounds;
    const metadata = element.metadata || {};
    const originalData = metadata.originalData as any;
    
    return {
      type: profileName,
      dimensions: {
        height: dims?.height || originalData?.dimensions?.crossSection?.height || 
                metadata.height || (bounds ? bounds.max[1] - bounds.min[1] : 200),
        width: dims?.width || originalData?.dimensions?.crossSection?.width || 
               metadata.width || (bounds ? bounds.max[0] - bounds.min[0] : 100),
        webThickness: dims?.thickness || originalData?.dimensions?.crossSection?.webThickness || 
                      metadata.webThickness || 5.6,
        flangeThickness: originalData?.dimensions?.crossSection?.flangeThickness || 
                        metadata.flangeThickness || 8.5,
        length: dims?.length || originalData?.dimensions?.length || 
                metadata.length || (bounds ? bounds.max[2] - bounds.min[2] : 1000)
      }
    };
  }

  /**
   * Extrait les features depuis un PivotElement
   */
  private extractFeatures(element: PivotElement): DSTVExportData['features'] {
    const features: DSTVExportData['features'] = {
      holes: [],
      contours: [],
      markings: [],
      cuts: []
    };

    // Extraire les features depuis l'élément, les métadonnées ou originalData
    const elementFeatures = element.features || 
                           element.metadata?.features || 
                           (element.metadata?.originalData as any)?.features ||
                           [];
    
    // Convertir les features au format DSTV
    if (Array.isArray(elementFeatures) && elementFeatures.length > 0) {
      for (const feature of elementFeatures) {
          switch (feature.type) {
            case 'hole':
            case 'bore':
              features.holes.push({
                x: feature.position?.x || feature.x || 0,
                y: feature.position?.y || feature.y || 0,
                diameter: feature.diameter || feature.radius * 2 || 20,
                face: feature.face || 'o'
              });
              break;
              
            case 'marking':
            case 'text':
              features.markings.push({
                x: feature.position?.x || feature.x || 0,
                y: feature.position?.y || feature.y || 0,
                text: feature.text || feature.content || '',
                height: feature.height || 10,
                face: feature.face || 'o',
                angle: feature.angle
              });
              break;
              
            case 'contour':
            case 'cut':
              if (feature.points && feature.points.length > 1) {
                features.contours.push({
                  type: feature.external ? 'AK' : 'IK',
                  face: feature.face || 'o',
                  points: feature.points,
                  closed: feature.closed !== false
                });
              }
              break;
          }
      }
    }

    return features;
  }
}