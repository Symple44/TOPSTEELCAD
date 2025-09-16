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
    thickness?: number;
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
    const { profileDimensions, profileType } = data.metadata;
    if (!profileDimensions) return data;
    
    const { height } = profileDimensions;
    
    // DSTV: origine au coin inférieur gauche
    // Standard: dépend du type de profil
    // X DSTV → Z Standard (le long du profil)
    // Y DSTV → Y Standard (avec ajustement selon le profil)
    // Z DSTV → rarement utilisé
    
    // Sauvegarder les coordonnées originales
    data.metadata.originalDSTVCoords = {
      x: data.current.x,
      y: data.current.y,
      z: data.current.z
    };
    
    // Pour les profils I, centrer verticalement selon la face
    // DSTV Y=0 est au bas du profil, Standard Y=0 est au centre
    // Pour les profils L, garder l'origine au coin
    let yAdjustment = data.current.y;
    const face = data.metadata.face;
    console.log(`🔴 DSTVOriginTransform: profileType=${profileType}, face=${face}, Y=${data.current.y}, height=${height}`);
    
    let newPosition: THREE.Vector3;
    
    if (profileType === 'PLATE') {
      // Pour une plaque horizontale (posée à plat) :
      // - X DSTV reste X (longueur)
      // - Y DSTV devient Z (position sur la largeur)
      // - Z DSTV devient Y (profondeur dans l'épaisseur, 0 = surface supérieure)
      newPosition = new THREE.Vector3(
        data.current.x,  // X DSTV reste X (position le long de la longueur)
        data.current.z || 0,  // Z DSTV devient Y (profondeur, 0 = surface supérieure)
        data.current.y   // Y DSTV devient Z (position sur la largeur)
      );
      console.log(`🔲 PLATE: Converting coords: DSTV(X=${data.current.x},Y=${data.current.y},Z=${data.current.z}) → 3D(X=${newPosition.x},Y=${newPosition.y},Z=${newPosition.z})`);
    } else if (profileType === 'I_PROFILE' || profileType === 'I') {
      // DSTV: Y=0 au bas, Y=height au sommet
      // Standard: Y=-height/2 au bas, Y=+height/2 au sommet
      // Conversion standard : Y_standard = Y_dstv - height/2
      yAdjustment = data.current.y - height / 2;
      console.log(`🔴 I-PROFILE: Converting Y from ${data.current.y} to ${yAdjustment} (height=${height}, face=${face})`);
      newPosition = new THREE.Vector3(
        data.current.y,  // Conserver temporairement Y DSTV dans X, sera ajusté par DSTVFaceTransform
        yAdjustment,  // Y ajusté selon le type de profil
        data.current.x   // X DSTV devient Z standard
      );
    } else if (profileType === 'U_PROFILE' || profileType === 'U') {
      // Pour profil U: même logique que I
      yAdjustment = data.current.y - height / 2;
      console.log(`🔴 U-PROFILE: Converting Y from ${data.current.y} to ${yAdjustment} (height=${height}, face=${face})`);
      newPosition = new THREE.Vector3(
        data.current.y,  // Conserver temporairement Y DSTV dans X, sera ajusté par DSTVFaceTransform
        yAdjustment,  // Y ajusté selon le type de profil
        data.current.x   // X DSTV devient Z standard
      );
    } else {
      // Pour profil L et autres, pas de centrage (origine au coin)
      newPosition = new THREE.Vector3(
        data.current.y,  // Conserver temporairement Y DSTV dans X, sera ajusté par DSTVFaceTransform
        yAdjustment,  // Y sans ajustement
        data.current.x   // X DSTV devient Z standard
      );
    }
    
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
    
    const dimensions = profileDimensions as DSTVContext['dimensions'];
    const { width, height } = dimensions;
    const standardFace = this.faceManager.resolveDSTVFace(face, profileType);
    
    // Ajuster X selon la face
    switch (standardFace) {
      case StandardFace.WEB:
        // Pour l'âme/web
        if (profileType === 'L_PROFILE') {
          // Pour profil L, la face 'v' est une des ailes
          // X Three.js reste à 0 (sur l'aile)
          data.current.x = 0;
        } else if (profileType === 'I_PROFILE' || profileType === 'I') {
          // Pour profil I, 'v' est l'âme centrale
          // X Three.js = 0 (centre de l'âme)
          data.current.x = 0;
          // Y et Z sont déjà corrects depuis DSTVOriginTransform
        } else if (profileType === 'U_PROFILE' || profileType === 'U') {
          // Pour profil U, 'v' est l'âme verticale
          // X Three.js = 0 (sur l'âme)
          data.current.x = 0;
          // Y DSTV est la position verticale sur l'âme (déjà ajustée dans DSTVOriginTransform)
          // Z est la position longitudinale (déjà correcte)
        }
        break;
        
      case StandardFace.TOP_FLANGE:
        // Semelle supérieure
        if (profileType === 'U_PROFILE' || profileType === 'U') {
          // Pour profil U, aile supérieure horizontale
          // Y DSTV dans les métadonnées = position verticale sur l'aile (depuis le bas du profil)
          // X DSTV est toujours la position longitudinale (conservée dans Z)
          // La coordonnée X temporaire contient Y DSTV depuis DSTVOriginTransform
          const flangeThickness = dimensions.flangeThickness || 15;
          data.current.y = height / 2 - flangeThickness / 2;  // Position de l'aile supérieure
          data.current.x = data.current.x - width / 2;  // Position latérale sur l'aile (Y DSTV devient X 3D)
        } else {
          // Pour profil I
          data.current.y = height / 2;
          // Pour les semelles, Y DSTV original représente la position latérale
          // Récupérer la valeur Y originale depuis les métadonnées
          if (data.metadata.originalData?.y !== undefined) {
            data.current.x = data.metadata.originalData.y - width / 2;
          }
        }
        break;
        
      case StandardFace.BOTTOM_FLANGE:
        // Semelle inférieure
        if (profileType === 'U_PROFILE' || profileType === 'U') {
          // Pour profil U, aile inférieure horizontale
          const flangeThickness = dimensions.flangeThickness || 15;
          data.current.y = -height / 2 + flangeThickness / 2;  // Position de l'aile inférieure
          data.current.x = data.current.x - width / 2;  // Position latérale sur l'aile (Y DSTV devient X 3D)
        } else {
          // Pour profil I
          data.current.y = -height / 2;
          // Position latérale
          if (data.metadata.originalData?.y !== undefined) {
            data.current.x = data.metadata.originalData.y - width / 2;
          }
        }
        break;
        
      case StandardFace.FRONT:
        // Face avant (début du profil) - 'h' en DSTV
        // Pour les faces avant/arrière, les coordonnées DSTV sont sur le plan YZ
        if (data.metadata.originalDSTVCoords) {
          // X DSTV → Z Three.js (position le long du profil)
          data.current.z = data.metadata.originalDSTVCoords.x;
          
          // Y DSTV → Y Three.js 
          // Pour profil L, pas de centrage additionnel (déjà fait dans DSTVOriginTransform)
          // Les coordonnées Y sont déjà correctes
          // Ne pas modifier Y qui a déjà été ajusté dans DSTVOriginTransform
          
          // X Three.js est la profondeur depuis la face (0 pour la face avant)
          data.current.x = 0;
        } else {
          data.current.z = 0;
        }
        break;
        
      case StandardFace.BACK:
        // Face arrière (fin du profil)
        if (data.metadata.originalData) {
          // Similaire à FRONT mais décalé à la fin du profil
          data.current.z = profileDimensions.length - (data.metadata.originalData.x || 0);
          data.current.x = 0;
        } else {
          data.current.z = profileDimensions.length;
        }
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
    dstvPosition: { x: number; y: number; z?: number; featureType?: string },
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
        context,
        profileType: context.profileType,
        face: context.face,
        dimensions: context.dimensions,
        featureType: dstvPosition.featureType || (context as any).featureType
      });
    }
    
    // Préparer les métadonnées
    const metadata: TransformMetadata = {
      pluginId: 'dstv',
      profileType: context.profileType,
      profileDimensions: context.dimensions,
      face: context.face,
      originalData: dstvPosition,
      blockType: context.blockType,
      featureType: dstvPosition.featureType || (context as any).featureType || 'unknown'
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
    
    const result = {
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
    
    if (this.debugMode) {
      console.log('📍 DSTV Conversion result:', {
        originalDSTV: dstvPosition,
        transformedStandard: transformed.current,
        face: standardFace,
        appliedTransformations: transformed.transformations.length
      });
    }
    
    return result;
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
    // Plus de centrage : Z standard commence à 0
    const dstvX = position.z;  // Direct, car le profil commence à Z=0
    let dstvY = 0;
    const dstvZ = 0;
    
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