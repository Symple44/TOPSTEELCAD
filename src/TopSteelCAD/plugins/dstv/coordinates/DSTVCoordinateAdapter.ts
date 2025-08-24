/**
 * Adaptateur de Coordonnées DSTV
 * 
 * Gère la conversion entre le système de coordonnées DSTV
 * et le système standard unifié.
 */

import * as THREE from 'three';
import { UnifiedCoordinateSystem } from '../../../core/coordinates/UnifiedCoordinateSystem';
import { FaceManager } from '../../../core/coordinates/FaceManager';
import { TransformPipeline, BaseTransformStage } from '../../../core/coordinates/TransformPipeline';
import {
  StandardPosition,
  StandardFace,
  TransformData,
  TransformMetadata
} from '../../../core/coordinates/types';

/**
 * Contexte DSTV pour les transformations
 */
export interface DSTVContext {
  profileType: string;
  dimensions: {
    length: number;
    height: number;
    width: number;
    webThickness?: number;
    flangeThickness?: number;
  };
  face?: string;
  position?: { x: number; y: number; z?: number };
  blockType?: string;
}

/**
 * Transformation de l'origine DSTV
 */
class DSTVOriginTransform extends BaseTransformStage {
  constructor() {
    super('dstv-origin', 10);
  }
  
  canProcess(data: TransformData): boolean {
    return data.metadata.pluginId === 'dstv';
  }
  
  process(data: TransformData): TransformData {
    const { profileDimensions } = data.metadata;
    if (!profileDimensions) return data;
    
    const { length, height, width } = profileDimensions;
    
    // DSTV: origine au coin inférieur gauche
    // Standard: origine au centre
    // X DSTV → Z Standard (le long du profil)
    // Y DSTV → dépend de la face
    // Z DSTV → rarement utilisé
    
    const newPosition = new THREE.Vector3(
      0,  // X standard sera déterminé par la face
      data.current.y - height / 2,  // Centrage vertical
      data.current.x - length / 2   // X DSTV devient Z standard
    );
    
    data.current = newPosition;
    return data;
  }
}

/**
 * Transformation selon la face DSTV
 */
class DSTVFaceTransform extends BaseTransformStage {
  constructor(private faceManager: FaceManager) {
    super('dstv-face', 20);
  }
  
  canProcess(data: TransformData): boolean {
    return data.metadata.pluginId === 'dstv' && !!data.metadata.face;
  }
  
  process(data: TransformData): TransformData {
    const { face, profileDimensions, profileType } = data.metadata;
    if (!profileDimensions || !face) return data;
    
    const { width, height } = profileDimensions;
    const standardFace = this.faceManager.resolveDSTVFace(face, profileType);
    
    // Ajuster X selon la face
    switch (standardFace) {
      case StandardFace.WEB:
        // L'âme est au centre en X
        data.current.x = 0;
        // Y représente la position verticale sur l'âme
        // Déjà centré dans DSTVOriginTransform
        break;
        
      case StandardFace.TOP_FLANGE:
        // Semelle supérieure
        data.current.y = height / 2;
        // Pour les semelles, Y DSTV original représente la position latérale
        // Récupérer la valeur Y originale depuis les métadonnées
        if (data.metadata.originalData?.y !== undefined) {
          data.current.x = data.metadata.originalData.y - width / 2;
        }
        break;
        
      case StandardFace.BOTTOM_FLANGE:
        // Semelle inférieure
        data.current.y = -height / 2;
        // Position latérale
        if (data.metadata.originalData?.y !== undefined) {
          data.current.x = data.metadata.originalData.y - width / 2;
        }
        break;
        
      case StandardFace.FRONT:
        // Face avant
        data.current.z = -profileDimensions.length / 2;
        break;
        
      case StandardFace.BACK:
        // Face arrière
        data.current.z = profileDimensions.length / 2;
        break;
    }
    
    return data;
  }
}

/**
 * Transformation spécifique au type de profil
 */
class DSTVProfileTypeTransform extends BaseTransformStage {
  constructor() {
    super('dstv-profile-type', 30);
  }
  
  canProcess(data: TransformData): boolean {
    return data.metadata.pluginId === 'dstv' && !!data.metadata.profileType;
  }
  
  process(data: TransformData): TransformData {
    const { profileType } = data.metadata;
    
    // Ajustements spécifiques selon le type de profil
    if (profileType?.includes('PLATE')) {
      // Pour les plaques, rotation de 90° autour de X
      // pour que la plaque soit horizontale
      const matrix = new THREE.Matrix4();
      matrix.makeRotationX(-Math.PI / 2);
      data.current.applyMatrix4(matrix);
    }
    
    return data;
  }
}

/**
 * Adaptateur de coordonnées DSTV
 */
export class DSTVCoordinateAdapter {
  private coordinateSystem: UnifiedCoordinateSystem;
  private faceManager: FaceManager;
  private pipeline: TransformPipeline;
  private debugMode: boolean = false;
  
  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.coordinateSystem = new UnifiedCoordinateSystem(debugMode);
    this.faceManager = new FaceManager(debugMode);
    this.pipeline = new TransformPipeline(debugMode);
    
    this.initialize();
  }
  
  /**
   * Initialise l'adaptateur
   */
  private initialize(): void {
    // Enregistrer l'espace de coordonnées DSTV
    this.coordinateSystem.registerCoordinateSpace('dstv', {
      origin: 'corner',
      axes: { x: 'length', y: 'height', z: 'width' },
      units: 'mm',
      handedness: 'right'
    });
    
    // Ajouter les étapes de transformation
    this.pipeline.addStage(new DSTVOriginTransform());
    this.pipeline.addStage(new DSTVFaceTransform(this.faceManager));
    this.pipeline.addStage(new DSTVProfileTypeTransform());
  }
  
  /**
   * Convertit une position DSTV vers le format standard
   */
  toStandardPosition(
    dstvPosition: { x: number; y: number; z?: number },
    context: DSTVContext
  ): StandardPosition {
    // Créer le vecteur 3D
    const position3D = new THREE.Vector3(
      dstvPosition.x,
      dstvPosition.y,
      dstvPosition.z || 0
    );
    
    if (this.debugMode) {
      console.log('📍 DSTV → Standard conversion:', {
        input: dstvPosition,
        context
      });
    }
    
    // Préparer les métadonnées
    const metadata: TransformMetadata = {
      pluginId: 'dstv',
      profileType: context.profileType,
      profileDimensions: context.dimensions,
      face: context.face,
      originalData: dstvPosition,
      blockType: context.blockType
    };
    
    // Appliquer le pipeline de transformation
    const transformed = this.pipeline.transform(position3D, metadata);
    
    // Résoudre la face standard
    const standardFace = context.face
      ? this.faceManager.resolveDSTVFace(context.face, context.profileType)
      : undefined;
    
    // Calculer la profondeur et la normale
    const { depth, normal } = this.calculateDepthAndNormal(
      standardFace,
      context.dimensions
    );
    
    return {
      position: transformed.current,
      face: standardFace,
      metadata: {
        original: dstvPosition,
        transformations: transformed.transformations,
        source: 'dstv',
        depth,
        normal
      }
    };
  }
  
  /**
   * Convertit une face DSTV vers le format standard
   */
  toStandardFace(dstvFace: string, context: DSTVContext): StandardFace {
    return this.faceManager.resolveDSTVFace(
      dstvFace,
      context.profileType,
      {
        position: context.position ? new THREE.Vector3(
          context.position.x,
          context.position.y,
          context.position.z || 0
        ) : undefined,
        dimensions: context.dimensions,
        profileType: context.profileType
      }
    );
  }
  
  /**
   * Convertit une position standard vers le format DSTV
   */
  fromStandardPosition(
    standardPosition: StandardPosition,
    context: DSTVContext
  ): { x: number; y: number; z: number } {
    const { position, face } = standardPosition;
    const { dimensions } = context;
    
    // Conversion inverse : Standard → DSTV
    // Z Standard → X DSTV (position le long du profil)
    let dstvX = position.z + dimensions.length / 2;
    let dstvY = 0;
    let dstvZ = 0;
    
    // Ajuster Y selon la face
    switch (face) {
      case StandardFace.WEB:
        // Sur l'âme, Y = position verticale
        dstvY = position.y + dimensions.height / 2;
        break;
        
      case StandardFace.TOP_FLANGE:
      case StandardFace.BOTTOM_FLANGE:
        // Sur les semelles, Y = position latérale
        dstvY = position.x + dimensions.width / 2;
        break;
        
      default:
        dstvY = position.y + dimensions.height / 2;
    }
    
    return { x: dstvX, y: dstvY, z: dstvZ };
  }
  
  /**
   * Calcule la profondeur et la normale pour une face
   */
  private calculateDepthAndNormal(
    face?: StandardFace,
    dimensions?: DSTVContext['dimensions']
  ): { depth: number; normal: THREE.Vector3 } {
    let depth = 10;  // Valeur par défaut
    let normal = new THREE.Vector3(0, 1, 0);  // Par défaut vers le haut
    
    if (!face || !dimensions) {
      return { depth, normal };
    }
    
    switch (face) {
      case StandardFace.WEB:
        depth = dimensions.webThickness || dimensions.width || 10;
        normal = new THREE.Vector3(1, 0, 0);  // Perpendiculaire à l'âme
        break;
        
      case StandardFace.TOP_FLANGE:
        depth = dimensions.flangeThickness || 15;
        normal = new THREE.Vector3(0, 1, 0);  // Vers le haut
        break;
        
      case StandardFace.BOTTOM_FLANGE:
        depth = dimensions.flangeThickness || 15;
        normal = new THREE.Vector3(0, -1, 0);  // Vers le bas
        break;
        
      case StandardFace.FRONT:
        depth = dimensions.length;
        normal = new THREE.Vector3(0, 0, -1);  // Vers l'avant
        break;
        
      case StandardFace.BACK:
        depth = dimensions.length;
        normal = new THREE.Vector3(0, 0, 1);  // Vers l'arrière
        break;
    }
    
    return { depth, normal };
  }
  
  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.coordinateSystem.setDebugMode(enabled);
    this.faceManager.setDebugMode(enabled);
    this.pipeline.setDebugMode(enabled);
  }
  
  /**
   * Obtient les statistiques de transformation
   */
  getStatistics(): any {
    return this.pipeline.getStatistics();
  }
  
  /**
   * Exporte l'historique des transformations
   */
  exportHistory(): string {
    return this.pipeline.exportHistory();
  }
}