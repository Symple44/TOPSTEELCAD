/**
 * BevelCutHandler.ts - Handler pour les coupes biseautées
 * Gère spécifiquement les préparations de soudure et les biseaux
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Types de biseaux pour préparation de soudure
 */
enum BevelType {
  V_GROOVE = 'V_GROOVE',      // Chanfrein en V
  X_GROOVE = 'X_GROOVE',      // Chanfrein en X (double V)
  U_GROOVE = 'U_GROOVE',      // Chanfrein en U
  J_GROOVE = 'J_GROOVE',      // Chanfrein en J
  K_GROOVE = 'K_GROOVE',      // Chanfrein en K (asymétrique)
  SINGLE_BEVEL = 'SINGLE',    // Biseau simple
  DOUBLE_BEVEL = 'DOUBLE'     // Biseau double
}

/**
 * Handler spécialisé pour les coupes biseautées et préparations de soudure
 */
export class BevelCutHandler extends BaseCutHandler {
  readonly name = 'BevelCutHandler';
  readonly supportedTypes = [
    CutType.BEVEL_CUT,
    CutType.END_CHAMFER
  ];
  readonly priority = 75; // Priorité élevée pour les préparations de soudure

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite de biseau
    if (params.cutType === 'bevel' || params.isBevel || params.weldPrep) {
      return true;
    }
    
    // Block DSTV BR (Bevel/Radius)
    if (params.dstvBlock === 'BR' || params.blockType === 'BR') {
      return true;
    }
    
    // Paramètres spécifiques aux biseaux
    if (params.bevelAngle || params.grooveAngle || params.rootGap) {
      return true;
    }
    
    // Type de chanfrein pour soudure
    if (params.grooveType && this.isValidGrooveType(params.grooveType)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les biseaux
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier l'angle du biseau
    if (params.bevelAngle) {
      if (params.bevelAngle < 15 || params.bevelAngle > 75) {
        warnings.push(`Bevel angle ${params.bevelAngle}° is outside typical range (15-75°)`);
      }
    }
    
    // Vérifier l'épaisseur pour la préparation
    if (params.thickness) {
      const dims = element.dimensions || {};
      const maxThickness = Math.max(
        dims.webThickness || 10,
        dims.flangeThickness || 15
      );
      
      if (params.thickness > maxThickness) {
        errors.push(`Bevel thickness ${params.thickness}mm exceeds material thickness ${maxThickness}mm`);
      }
    }
    
    // Vérifier le root gap pour les soudures
    if (params.rootGap) {
      if (params.rootGap < 0 || params.rootGap > 10) {
        warnings.push(`Root gap ${params.rootGap}mm is outside typical range (0-10mm)`);
      }
    }
    
    // Vérifier le type de chanfrein
    if (params.grooveType && !this.isValidGrooveType(params.grooveType)) {
      warnings.push(`Unknown groove type: ${params.grooveType}`);
    }
  }

  /**
   * Les biseaux peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de biseau
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const grooveType = this.detectGrooveType(params);
    
    console.log(`  ⚒️ Creating bevel cut geometry:`);
    console.log(`    Groove type: ${grooveType}`);
    console.log(`    Bevel angle: ${params.bevelAngle || 45}°`);
    console.log(`    Root gap: ${params.rootGap || 0}mm`);
    
    switch (grooveType) {
      case BevelType.V_GROOVE:
        return this.createVGroove(params, element);
        
      case BevelType.X_GROOVE:
        return this.createXGroove(params, element);
        
      case BevelType.U_GROOVE:
        return this.createUGroove(params, element);
        
      case BevelType.J_GROOVE:
        return this.createJGroove(params, element);
        
      case BevelType.K_GROOVE:
        return this.createKGroove(params, element);
        
      case BevelType.DOUBLE_BEVEL:
        return this.createDoubleBevel(params, element);
        
      default:
        return this.createSingleBevel(params, element);
    }
  }

  /**
   * Crée un chanfrein en V
   */
  private createVGroove(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const angle = params.bevelAngle || 30; // Angle par rapport à la verticale
    const depth = params.thickness || dims.webThickness || 10;
    const rootGap = params.rootGap || 2;
    const rootFace = params.rootFace || 2;
    const length = params.length || 100;
    
    // Créer le profil en V
    const shape = new THREE.Shape();
    
    // Points du chanfrein en V
    const topWidth = depth * Math.tan(angle * Math.PI / 180) * 2;
    
    shape.moveTo(-topWidth / 2, 0);
    shape.lineTo(topWidth / 2, 0);
    shape.lineTo(rootGap / 2, -depth + rootFace);
    shape.lineTo(rootGap / 2, -depth);
    shape.lineTo(-rootGap / 2, -depth);
    shape.lineTo(-rootGap / 2, -depth + rootFace);
    shape.closePath();
    
    // Extruder le long de la longueur
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner correctement
    this.positionBevelGeometry(geometry, params, element);
    
    return geometry;
  }

  /**
   * Crée un chanfrein en X (double V)
   */
  private createXGroove(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const angle = params.bevelAngle || 30;
    const depth = params.thickness || dims.webThickness || 10;
    const rootGap = params.rootGap || 2;
    const length = params.length || 100;
    
    // Créer deux chanfreins en V opposés
    const geometries: THREE.BufferGeometry[] = [];
    
    // V supérieur
    const topV = this.createVGroove({
      ...params,
      thickness: depth / 2
    }, element);
    geometries.push(topV);
    
    // V inférieur (inversé)
    const bottomV = this.createVGroove({
      ...params,
      thickness: depth / 2
    }, element);
    
    // Inverser le V inférieur
    const matrix = new THREE.Matrix4();
    matrix.makeScale(1, -1, 1);
    matrix.setPosition(0, -depth / 2, 0);
    bottomV.applyMatrix4(matrix);
    geometries.push(bottomV);
    
    // Combiner les géométries
    const combined = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    
    return combined;
  }

  /**
   * Crée un chanfrein en U
   */
  private createUGroove(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const radius = params.radius || 5;
    const depth = params.thickness || dims.webThickness || 10;
    const rootGap = params.rootGap || 2;
    const length = params.length || 100;
    
    // Créer le profil en U avec des coins arrondis
    const shape = new THREE.Shape();
    
    const width = radius * 2 + rootGap;
    
    // Commencer en haut à gauche
    shape.moveTo(-width / 2 - 5, 0);
    shape.lineTo(-radius - rootGap / 2, 0);
    
    // Arc gauche
    shape.arc(0, -radius, radius, Math.PI / 2, Math.PI, false);
    
    // Fond
    shape.lineTo(-rootGap / 2, -depth);
    shape.lineTo(rootGap / 2, -depth);
    
    // Arc droit
    shape.lineTo(radius + rootGap / 2, -depth + radius);
    shape.arc(0, radius, radius, Math.PI, Math.PI / 2, true);
    
    // Haut à droite
    shape.lineTo(width / 2 + 5, 0);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    this.positionBevelGeometry(geometry, params, element);
    
    return geometry;
  }

  /**
   * Crée un chanfrein en J
   */
  private createJGroove(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const radius = params.radius || 5;
    const angle = params.bevelAngle || 15;
    const depth = params.thickness || dims.webThickness || 10;
    const rootGap = params.rootGap || 2;
    const length = params.length || 100;
    
    // Créer le profil en J (combinaison de V et U)
    const shape = new THREE.Shape();
    
    const topOffset = depth * Math.tan(angle * Math.PI / 180);
    
    // Côté droit (droit)
    shape.moveTo(rootGap / 2 + 5, 0);
    shape.lineTo(rootGap / 2, 0);
    shape.lineTo(rootGap / 2, -depth);
    
    // Fond arrondi
    shape.arc(-rootGap / 2 - radius, 0, radius, 0, Math.PI / 2, false);
    
    // Côté gauche (incliné)
    shape.lineTo(-rootGap / 2 - radius, -depth + radius);
    shape.lineTo(-rootGap / 2 - topOffset, 0);
    shape.lineTo(-rootGap / 2 - topOffset - 5, 0);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    this.positionBevelGeometry(geometry, params, element);
    
    return geometry;
  }

  /**
   * Crée un chanfrein en K (asymétrique)
   */
  private createKGroove(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const angle1 = params.bevelAngle1 || 45;
    const angle2 = params.bevelAngle2 || 15;
    const depth = params.thickness || dims.webThickness || 10;
    const rootGap = params.rootGap || 2;
    const length = params.length || 100;
    
    // Créer le profil en K (double biseau asymétrique)
    const shape = new THREE.Shape();
    
    const offset1 = (depth / 2) * Math.tan(angle1 * Math.PI / 180);
    const offset2 = (depth / 2) * Math.tan(angle2 * Math.PI / 180);
    
    // Partie supérieure
    shape.moveTo(-offset1 - 5, 0);
    shape.lineTo(-offset1, 0);
    shape.lineTo(-rootGap / 2, -depth / 2);
    
    // Partie inférieure
    shape.lineTo(-rootGap / 2, -depth);
    shape.lineTo(rootGap / 2, -depth);
    shape.lineTo(rootGap / 2, -depth / 2);
    
    // Fermer
    shape.lineTo(offset2, 0);
    shape.lineTo(offset2 + 5, 0);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    this.positionBevelGeometry(geometry, params, element);
    
    return geometry;
  }

  /**
   * Crée un biseau double
   */
  private createDoubleBevel(params: any, element: PivotElement): THREE.BufferGeometry {
    // Similaire au X-groove mais avec des angles potentiellement différents
    return this.createXGroove(params, element);
  }

  /**
   * Crée un biseau simple
   */
  private createSingleBevel(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const angle = params.bevelAngle || 45;
    const depth = params.thickness || params.depth || dims.webThickness || 10;
    const length = params.length || 100;
    const face = params.face || ProfileFace.WEB;
    
    // Si on a des points de contour
    if (params.points && params.points.length >= 3) {
      const normalizedPoints = this.normalizePoints(params.points);
      return this.geometryService.createBevelCut(normalizedPoints, angle, element, {
        face,
        depth
      });
    }
    
    // Créer un biseau simple
    const width = params.width || depth * Math.tan(angle * Math.PI / 180);
    
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(0, -depth);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    this.positionBevelGeometry(geometry, params, element);
    
    return geometry;
  }

  /**
   * Positionne la géométrie de biseau
   */
  private positionBevelGeometry(
    geometry: THREE.BufferGeometry,
    params: any,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const x = params.x || params.position?.x || 0;
    const y = params.position?.y || 0;
    const z = params.position?.z || 0;
    
    // Centrer sur la longueur
    const length = params.length || 100;
    const matrix = new THREE.Matrix4();
    
    // Rotation pour orienter correctement
    if (params.orientation === 'vertical') {
      matrix.makeRotationZ(Math.PI / 2);
      geometry.applyMatrix4(matrix);
    }
    
    // Translation vers la position
    matrix.makeTranslation(x, y, z - length / 2);
    geometry.applyMatrix4(matrix);
    
    // Appliquer les transformations de face
    if (params.face) {
      this.applyFaceTransform(geometry, params.face, element);
    }
  }

  /**
   * Applique les transformations de face
   */
  private applyFaceTransform(
    geometry: THREE.BufferGeometry,
    face: ProfileFace,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const matrix = new THREE.Matrix4();
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
        matrix.makeTranslation(0, dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        matrix.makeTranslation(0, -dims.height! / 2, 0);
        geometry.applyMatrix4(matrix);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.BOTTOM:
        matrix.makeRotationX(Math.PI / 2);
        geometry.applyMatrix4(matrix);
        break;
    }
  }

  /**
   * Détecte le type de chanfrein
   */
  private detectGrooveType(params: any): BevelType {
    // Type explicite
    if (params.grooveType) {
      const type = params.grooveType.toUpperCase();
      if (type in BevelType) {
        return type as BevelType;
      }
    }
    
    // Détection basée sur les paramètres
    if (params.isDouble || params.bevelAngle1 && params.bevelAngle2) {
      if (params.bevelAngle1 !== params.bevelAngle2) {
        return BevelType.K_GROOVE;
      }
      return BevelType.X_GROOVE;
    }
    
    if (params.radius && !params.bevelAngle) {
      return BevelType.U_GROOVE;
    }
    
    if (params.radius && params.bevelAngle) {
      return BevelType.J_GROOVE;
    }
    
    if (params.bevelAngle && params.rootGap) {
      return BevelType.V_GROOVE;
    }
    
    return BevelType.SINGLE_BEVEL;
  }

  /**
   * Vérifie si un type de chanfrein est valide
   */
  private isValidGrooveType(type: string): boolean {
    const upperType = type.toUpperCase();
    return upperType in BevelType ||
           ['V', 'X', 'U', 'J', 'K', 'SINGLE', 'DOUBLE'].includes(upperType);
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isEndChamfer || params.position === 'end') {
      return CutType.END_CHAMFER;
    }
    
    return CutType.BEVEL_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const grooveType = this.detectGrooveType(params);
    
    return {
      ...baseMetadata,
      grooveType,
      bevelAngle: params.bevelAngle || 45,
      bevelAngle1: params.bevelAngle1,
      bevelAngle2: params.bevelAngle2,
      rootGap: params.rootGap || 0,
      rootFace: params.rootFace || 0,
      radius: params.radius,
      weldPrep: true,
      isDouble: grooveType === BevelType.X_GROOVE || grooveType === BevelType.DOUBLE_BEVEL
    };
  }
}

// BufferGeometryUtils already imported at the top