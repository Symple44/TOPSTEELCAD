/**
 * CopingCutHandler.ts - Handler pour les coupes de préparation d'assemblage
 * Gère les découpes complexes pour l'assemblage de poutres (coping)
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace, ProfileType } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';
import { getCSGService } from '../services/CSGOperationService';

/**
 * Types de coping (préparation d'assemblage)
 */
enum CopingType {
  BEAM_TO_BEAM = 'beam_to_beam',       // Assemblage poutre sur poutre
  BEAM_TO_COLUMN = 'beam_to_column',   // Assemblage poutre sur colonne
  WEB_COPING = 'web_coping',           // Découpe de l'âme uniquement
  FLANGE_COPING = 'flange_coping',     // Découpe des semelles
  FULL_COPING = 'full_coping',         // Découpe complète
  SADDLE_CUT = 'saddle_cut',           // Découpe en selle
  FISH_MOUTH = 'fish_mouth'            // Découpe en gueule de poisson (tubes)
}

/**
 * Handler pour les coupes de préparation d'assemblage (coping)
 */
export class CopingCutHandler extends BaseCutHandler {
  readonly name = 'CopingCutHandler';
  readonly supportedTypes = [
    CutType.COPING_CUT,
    CutType.CONTOUR_CUT
  ];
  readonly priority = 80; // Priorité élevée pour les assemblages

  private geometryService = getGeometryService();
  private csgService = getCSGService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite de coping
    if (params.cutType === 'coping' || params.isCoping) {
      return true;
    }
    
    // Type d'assemblage défini
    if (params.copingType && this.isValidCopingType(params.copingType)) {
      return true;
    }
    
    // Paramètres d'assemblage
    if (params.connectionType || params.assemblyType) {
      return true;
    }
    
    // Profile de connexion défini
    if (params.connectedProfile || params.targetProfile) {
      return true;
    }
    
    // Pattern de coping détecté dans le contour
    if (params.points && this.isCopingPattern(params.points, params.element)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour le coping
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier l'angle de connexion
    if (params.connectionAngle) {
      if (params.connectionAngle < 0 || params.connectionAngle > 180) {
        errors.push(`Invalid connection angle: ${params.connectionAngle}°`);
      }
      
      if (params.connectionAngle < 30 || params.connectionAngle > 150) {
        warnings.push('Extreme connection angles may require special consideration');
      }
    }
    
    // Vérifier les dimensions du profil connecté
    if (params.connectedProfile) {
      const targetHeight = params.connectedProfile.height;
      const currentHeight = element.dimensions?.height || 300;
      
      if (targetHeight && targetHeight > currentHeight) {
        warnings.push('Connected profile is larger than current profile');
      }
    }
    
    // Vérifier le dégagement (clearance)
    if (params.clearance) {
      if (params.clearance < 0) {
        errors.push('Clearance cannot be negative');
      }
      
      if (params.clearance > 20) {
        warnings.push('Large clearance may affect structural integrity');
      }
    }
  }

  /**
   * Le coping nécessite généralement des points de contour
   */
  protected requiresContourPoints(): boolean {
    return true;
  }

  /**
   * Crée la géométrie de coping
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const copingType = this.detectCopingType(params, element);
    
    console.log(`  🔧 Creating coping cut geometry:`);
    console.log(`    Type: ${copingType}`);
    console.log(`    Connection angle: ${params.connectionAngle || 90}°`);
    
    switch (copingType) {
      case CopingType.BEAM_TO_BEAM:
        return this.createBeamToBeamCoping(params, element);
        
      case CopingType.BEAM_TO_COLUMN:
        return this.createBeamToColumnCoping(params, element);
        
      case CopingType.WEB_COPING:
        return this.createWebCoping(params, element);
        
      case CopingType.FLANGE_COPING:
        return this.createFlangeCoping(params, element);
        
      case CopingType.SADDLE_CUT:
        return this.createSaddleCut(params, element);
        
      case CopingType.FISH_MOUTH:
        return this.createFishMouthCut(params, element);
        
      case CopingType.FULL_COPING:
      default:
        return this.createFullCoping(params, element);
    }
  }

  /**
   * Détecte le type de coping
   */
  private detectCopingType(params: any, element: PivotElement): CopingType {
    // Type explicite
    if (params.copingType && this.isValidCopingType(params.copingType)) {
      return params.copingType as CopingType;
    }
    
    // Détection basée sur le type de profil
    if (element.type === 'tube' || element.type === 'pipe') {
      if (params.connectionAngle && params.connectionAngle !== 90) {
        return CopingType.FISH_MOUTH;
      }
    }
    
    // Détection basée sur les paramètres
    if (params.connectedProfile) {
      const targetType = params.connectedProfile.type;
      if (targetType === 'column') {
        return CopingType.BEAM_TO_COLUMN;
      }
      return CopingType.BEAM_TO_BEAM;
    }
    
    if (params.cutWebOnly) {
      return CopingType.WEB_COPING;
    }
    
    if (params.cutFlangesOnly) {
      return CopingType.FLANGE_COPING;
    }
    
    if (params.saddleDepth) {
      return CopingType.SADDLE_CUT;
    }
    
    return CopingType.FULL_COPING;
  }

  /**
   * Crée un coping poutre sur poutre
   */
  private createBeamToBeamCoping(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const targetDims = params.connectedProfile || {};
    const angle = params.connectionAngle || 90;
    const clearance = params.clearance || 5;
    
    // Calculer la profondeur de coupe basée sur le profil cible
    const targetHeight = targetDims.height || dims.height || 300;
    const targetWidth = targetDims.width || dims.width || 150;
    
    // Créer le contour de découpe
    const shape = new THREE.Shape();
    
    // Forme basique pour intersection à angle droit
    if (Math.abs(angle - 90) < 1) {
      // Découpe rectangulaire simple
      shape.moveTo(0, -targetHeight / 2);
      shape.lineTo(targetWidth + clearance, -targetHeight / 2);
      shape.lineTo(targetWidth + clearance, targetHeight / 2);
      shape.lineTo(0, targetHeight / 2);
    } else {
      // Découpe angulaire
      const offset = targetHeight * Math.tan((90 - angle) * Math.PI / 180);
      
      shape.moveTo(0, -targetHeight / 2);
      shape.lineTo(targetWidth + clearance, -targetHeight / 2);
      shape.lineTo(targetWidth + clearance + offset, targetHeight / 2);
      shape.lineTo(offset, targetHeight / 2);
    }
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: dims.webThickness || 10,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée un coping poutre sur colonne
   */
  private createBeamToColumnCoping(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const columnDims = params.connectedProfile || {};
    const clearance = params.clearance || 5;
    
    // Pour une connexion sur colonne, on découpe généralement les semelles
    const columnWidth = columnDims.width || 200;
    const flangeThickness = dims.flangeThickness || 15;
    
    // Créer deux découpes pour les semelles
    const geometries: THREE.BufferGeometry[] = [];
    
    // Découpe semelle supérieure
    const topCut = new THREE.BoxGeometry(
      columnWidth + clearance,
      flangeThickness,
      dims.width || 150
    );
    const topMatrix = new THREE.Matrix4();
    topMatrix.makeTranslation(0, (dims.height || 300) / 2 - flangeThickness / 2, 0);
    topCut.applyMatrix4(topMatrix);
    geometries.push(topCut);
    
    // Découpe semelle inférieure
    const bottomCut = new THREE.BoxGeometry(
      columnWidth + clearance,
      flangeThickness,
      dims.width || 150
    );
    const bottomMatrix = new THREE.Matrix4();
    bottomMatrix.makeTranslation(0, -(dims.height || 300) / 2 + flangeThickness / 2, 0);
    bottomCut.applyMatrix4(bottomMatrix);
    geometries.push(bottomCut);
    
    // Fusionner les géométries
    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    
    return merged;
  }

  /**
   * Crée un coping de l'âme uniquement
   */
  private createWebCoping(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const depth = params.depth || 50;
    const height = params.height || dims.height || 300;
    
    // Découpe rectangulaire dans l'âme
    const geometry = new THREE.BoxGeometry(
      depth,
      height - 2 * (dims.flangeThickness || 15), // Hauteur sans les semelles
      dims.webThickness || 10
    );
    
    // Positionner à l'extrémité
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(depth / 2, 0, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée un coping des semelles uniquement
   */
  private createFlangeCoping(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const depth = params.depth || 50;
    const width = dims.width || 150;
    const flangeThickness = dims.flangeThickness || 15;
    
    const geometries: THREE.BufferGeometry[] = [];
    
    // Découpe semelle supérieure
    const topFlange = new THREE.BoxGeometry(depth, flangeThickness, width);
    const topMatrix = new THREE.Matrix4();
    topMatrix.makeTranslation(depth / 2, (dims.height || 300) / 2 - flangeThickness / 2, 0);
    topFlange.applyMatrix4(topMatrix);
    geometries.push(topFlange);
    
    // Découpe semelle inférieure
    const bottomFlange = new THREE.BoxGeometry(depth, flangeThickness, width);
    const bottomMatrix = new THREE.Matrix4();
    bottomMatrix.makeTranslation(depth / 2, -(dims.height || 300) / 2 + flangeThickness / 2, 0);
    bottomFlange.applyMatrix4(bottomMatrix);
    geometries.push(bottomFlange);
    
    // Fusionner
    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    
    return merged;
  }

  /**
   * Crée une découpe en selle
   */
  private createSaddleCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const saddleDepth = params.saddleDepth || dims.height! / 3;
    const saddleWidth = params.saddleWidth || 100;
    
    // Créer une forme en U inversé
    const shape = new THREE.Shape();
    
    shape.moveTo(0, 0);
    shape.lineTo(0, -saddleDepth);
    shape.lineTo(saddleWidth, -saddleDepth);
    shape.lineTo(saddleWidth, 0);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: dims.width || 150,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner au sommet du profil
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(0, (dims.height || 300) / 2, -(dims.width || 150) / 2);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une découpe en gueule de poisson (pour tubes)
   */
  private createFishMouthCut(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const diameter = dims.diameter || dims.width || 100;
    const targetDiameter = params.connectedProfile?.diameter || diameter;
    const angle = params.connectionAngle || 90;
    
    // Créer une forme cylindrique qui intersecte le tube
    const cylinderHeight = diameter * 2;
    const cylinderRadius = targetDiameter / 2;
    
    const geometry = new THREE.CylinderGeometry(
      cylinderRadius,
      cylinderRadius,
      cylinderHeight,
      32
    );
    
    // Orienter selon l'angle de connexion
    const matrix = new THREE.Matrix4();
    
    // Rotation pour l'angle de connexion
    matrix.makeRotationZ((90 - angle) * Math.PI / 180);
    geometry.applyMatrix4(matrix);
    
    // Positionner à l'extrémité
    matrix.makeTranslation(0, 0, 0);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée un coping complet
   */
  private createFullCoping(params: any, element: PivotElement): THREE.BufferGeometry {
    // Si on a des points de contour, les utiliser
    if (params.points && params.points.length >= 3) {
      const normalizedPoints = this.normalizePoints(params.points);
      return this.geometryService.createCutGeometry(normalizedPoints, element, {
        face: params.face,
        depth: params.depth || element.dimensions?.webThickness || 10,
        cutType: 'coping'
      });
    }
    
    // Sinon, créer une découpe complète standard
    const dims = element.dimensions || {};
    const depth = params.depth || 100;
    const height = dims.height || 300;
    const width = dims.width || 150;
    
    return new THREE.BoxGeometry(depth, height, width);
  }

  /**
   * Vérifie si un type de coping est valide
   */
  private isValidCopingType(type: string): boolean {
    return Object.values(CopingType).includes(type as CopingType);
  }

  /**
   * Détermine si des points forment un pattern de coping
   */
  private isCopingPattern(points: any[], element: any): boolean {
    const normalizedPoints = this.normalizePoints(points);
    const bounds = this.getContourBounds(normalizedPoints);
    const dims = element?.dimensions || {};
    
    // Un coping affecte généralement une grande partie du profil
    const heightRatio = bounds.height / (dims.height || 300);
    
    // Vérifier si le contour suggère une découpe d'assemblage
    return heightRatio > 0.5 && bounds.width < (dims.length || 1000) * 0.3;
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isContour) {
      return CutType.CONTOUR_CUT;
    }
    
    return CutType.COPING_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const copingType = this.detectCopingType(params, element);
    
    return {
      ...baseMetadata,
      copingType,
      connectionAngle: params.connectionAngle || 90,
      clearance: params.clearance || 5,
      connectedProfile: params.connectedProfile,
      cutWebOnly: params.cutWebOnly,
      cutFlangesOnly: params.cutFlangesOnly,
      saddleDepth: params.saddleDepth
    };
  }
}

// Import pour BufferGeometryUtils
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';