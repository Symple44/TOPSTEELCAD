/**
 * SlotCutHandler.ts - Handler pour les rainures et fentes
 * Gère les coupes allongées de type rainure (SC dans DSTV)
 */

import * as THREE from 'three';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Types de rainures
 */
enum SlotType {
  STRAIGHT = 'straight',      // Rainure droite
  ROUNDED = 'rounded',        // Rainure aux extrémités arrondies
  KEYHOLE = 'keyhole',        // Rainure en trou de serrure
  T_SLOT = 't_slot',          // Rainure en T
  DOVETAIL = 'dovetail',      // Rainure en queue d'aronde
  CUSTOM = 'custom'           // Forme personnalisée
}

/**
 * Handler pour les rainures et fentes
 */
export class SlotCutHandler extends BaseCutHandler {
  readonly name = 'SlotCutHandler';
  readonly supportedTypes = [
    CutType.SLOT_CUT
  ];
  readonly priority = 40; // Priorité basse car très spécialisé

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Type explicite de rainure
    if (params.cutType === 'slot' || params.isSlot) {
      return true;
    }
    
    // Block DSTV SC (Sägen/Cut)
    if (params.dstvBlock === 'SC' || params.blockType === 'SC') {
      return true;
    }
    
    // Type de rainure défini
    if (params.slotType && this.isValidSlotType(params.slotType)) {
      return true;
    }
    
    // Pattern de rainure détecté
    if (params.points && this.isSlotPattern(params.points)) {
      return true;
    }
    
    // Dimensions caractéristiques d'une rainure
    if (params.length && params.width && params.length / params.width > 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les rainures
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    const dims = element.dimensions || {};
    
    // Vérifier les dimensions
    if (params.length && params.width) {
      if (params.length <= params.width) {
        warnings.push('Slot length should be greater than width');
      }
      
      if (params.length > (dims.length || 1000)) {
        errors.push('Slot length exceeds profile length');
      }
      
      if (params.width > Math.min(dims.height || 300, dims.width || 150)) {
        warnings.push('Slot width exceeds profile dimensions');
      }
    }
    
    // Vérifier la profondeur
    if (params.depth) {
      const maxDepth = params.face === ProfileFace.WEB ? 
        dims.webThickness : dims.flangeThickness;
      
      if (params.depth > (maxDepth || 15)) {
        warnings.push('Slot depth exceeds material thickness');
      }
    }
    
    // Vérifier le rayon pour les rainures arrondies
    if (params.slotType === 'rounded' && params.radius) {
      if (params.radius > (params.width || 10) / 2) {
        errors.push('Slot radius cannot exceed half the width');
      }
    }
  }

  /**
   * Les rainures peuvent fonctionner avec ou sans points
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de rainure
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const slotType = this.detectSlotType(params);
    
    console.log(`  ▬ Creating slot cut geometry:`);
    console.log(`    Type: ${slotType}`);
    console.log(`    Length: ${params.length || 'auto'}mm`);
    console.log(`    Width: ${params.width || 'auto'}mm`);
    
    switch (slotType) {
      case SlotType.ROUNDED:
        return this.createRoundedSlot(params, element);
        
      case SlotType.KEYHOLE:
        return this.createKeyholeSlot(params, element);
        
      case SlotType.T_SLOT:
        return this.createTSlot(params, element);
        
      case SlotType.DOVETAIL:
        return this.createDovetailSlot(params, element);
        
      case SlotType.CUSTOM:
        return this.createCustomSlot(params, element);
        
      case SlotType.STRAIGHT:
      default:
        return this.createStraightSlot(params, element);
    }
  }

  /**
   * Détecte le type de rainure
   */
  private detectSlotType(params: any): SlotType {
    // Type explicite
    if (params.slotType && this.isValidSlotType(params.slotType)) {
      return params.slotType as SlotType;
    }
    
    // Détection basée sur les paramètres
    if (params.radius || params.rounded) {
      return SlotType.ROUNDED;
    }
    
    if (params.headDiameter && params.shaftDiameter) {
      return SlotType.KEYHOLE;
    }
    
    if (params.topWidth && params.bottomWidth && params.topWidth > params.bottomWidth) {
      return SlotType.T_SLOT;
    }
    
    if (params.angle && (params.angle === 60 || params.angle === 45)) {
      return SlotType.DOVETAIL;
    }
    
    if (params.points && params.points.length > 6) {
      return SlotType.CUSTOM;
    }
    
    return SlotType.STRAIGHT;
  }

  /**
   * Crée une rainure droite
   */
  private createStraightSlot(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    const length = params.length || 100;
    const width = params.width || 20;
    const depth = params.depth || dims.webThickness || 10;
    
    // Position et orientation
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    const angle = params.angle || 0;
    
    // Créer la géométrie de base
    const geometry = new THREE.BoxGeometry(length, width, depth);
    
    // Appliquer la rotation si nécessaire
    if (Math.abs(angle) > 0.1) {
      const matrix = new THREE.Matrix4();
      matrix.makeRotationZ(angle * Math.PI / 180);
      geometry.applyMatrix4(matrix);
    }
    
    // Positionner
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x + length / 2, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une rainure aux extrémités arrondies
   */
  private createRoundedSlot(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    const length = params.length || 100;
    const width = params.width || 20;
    const depth = params.depth || dims.webThickness || 10;
    const radius = params.radius || width / 2;
    
    // Créer la forme avec extrémités arrondies
    const shape = new THREE.Shape();
    
    // Commencer en bas à gauche du rectangle central
    shape.moveTo(radius, -width / 2);
    
    // Arc gauche
    shape.arc(-radius, width / 2, radius, -Math.PI / 2, Math.PI / 2, false);
    
    // Ligne du haut
    shape.lineTo(length - radius, width / 2);
    
    // Arc droit
    shape.arc(0, -width / 2, radius, Math.PI / 2, -Math.PI / 2, false);
    
    // Ligne du bas pour fermer
    shape.lineTo(radius, -width / 2);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une rainure en trou de serrure
   */
  private createKeyholeSlot(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    const headDiameter = params.headDiameter || 30;
    const shaftDiameter = params.shaftDiameter || 15;
    const length = params.length || 100;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer la forme en trou de serrure
    const shape = new THREE.Shape();
    
    // Tête circulaire
    const headRadius = headDiameter / 2;
    const shaftRadius = shaftDiameter / 2;
    
    // Commencer par le cercle de la tête
    shape.arc(0, 0, headRadius, 0, Math.PI * 2, false);
    
    // Ajouter la tige
    shape.moveTo(shaftRadius, 0);
    shape.lineTo(shaftRadius, -length);
    shape.arc(-shaftRadius, 0, shaftRadius, 0, Math.PI, false);
    shape.lineTo(-shaftRadius, 0);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une rainure en T
   */
  private createTSlot(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    const topWidth = params.topWidth || 30;
    const bottomWidth = params.bottomWidth || 15;
    const topHeight = params.topHeight || 10;
    const totalHeight = params.totalHeight || 20;
    const length = params.length || 100;
    const depth = params.depth || dims.webThickness || 10;
    
    // Créer la forme en T
    const shape = new THREE.Shape();
    
    // Base du T
    const baseOffset = (topWidth - bottomWidth) / 2;
    
    shape.moveTo(-bottomWidth / 2, 0);
    shape.lineTo(-bottomWidth / 2, totalHeight - topHeight);
    shape.lineTo(-topWidth / 2, totalHeight - topHeight);
    shape.lineTo(-topWidth / 2, totalHeight);
    shape.lineTo(topWidth / 2, totalHeight);
    shape.lineTo(topWidth / 2, totalHeight - topHeight);
    shape.lineTo(bottomWidth / 2, totalHeight - topHeight);
    shape.lineTo(bottomWidth / 2, 0);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Rotation pour orienter correctement
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationY(Math.PI / 2);
    geometry.applyMatrix4(rotMatrix);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x + length / 2, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une rainure en queue d'aronde
   */
  private createDovetailSlot(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    
    const topWidth = params.topWidth || 15;
    const bottomWidth = params.bottomWidth || 25;
    const height = params.height || 15;
    const length = params.length || 100;
    const depth = params.depth || dims.webThickness || 10;
    const angle = params.angle || 60;
    
    // Créer la forme en queue d'aronde
    const shape = new THREE.Shape();
    
    const offset = (bottomWidth - topWidth) / 2;
    
    shape.moveTo(-bottomWidth / 2, 0);
    shape.lineTo(-topWidth / 2, height);
    shape.lineTo(topWidth / 2, height);
    shape.lineTo(bottomWidth / 2, 0);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Rotation pour orienter correctement
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationY(Math.PI / 2);
    geometry.applyMatrix4(rotMatrix);
    
    // Positionner
    const x = params.position?.x || params.x || 100;
    const y = params.position?.y || params.y || 0;
    const z = params.position?.z || params.z || 0;
    
    const matrix = new THREE.Matrix4();
    matrix.makeTranslation(x + length / 2, y, z);
    geometry.applyMatrix4(matrix);
    
    return geometry;
  }

  /**
   * Crée une rainure personnalisée à partir de points
   */
  private createCustomSlot(params: any, element: PivotElement): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const points = this.normalizePoints(params.points || []);
    
    if (points.length < 3) {
      // Fallback vers rainure droite
      return this.createStraightSlot(params, element);
    }
    
    // Créer la forme à partir des points
    const shape = this.createShapeFromPoints(points);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: params.depth || dims.webThickness || 10,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Vérifie si un type de rainure est valide
   */
  private isValidSlotType(type: string): boolean {
    return Object.values(SlotType).includes(type as SlotType);
  }

  /**
   * Détermine si des points forment un pattern de rainure
   */
  private isSlotPattern(points: any[]): boolean {
    const normalizedPoints = this.normalizePoints(points);
    const bounds = this.getContourBounds(normalizedPoints);
    
    // Une rainure est typiquement allongée
    const aspectRatio = bounds.width / bounds.height;
    
    return (aspectRatio > 3 || aspectRatio < 0.33) && 
           bounds.width < 200 && 
           bounds.height < 50;
  }

  /**
   * Détecte le type de coupe
   */
  protected detectCutType(feature: Feature): CutType {
    return CutType.SLOT_CUT;
  }

  /**
   * Génère les métadonnées
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    const slotType = this.detectSlotType(params);
    
    return {
      ...baseMetadata,
      slotType,
      length: params.length,
      width: params.width,
      depth: params.depth,
      radius: params.radius,
      angle: params.angle,
      isThrough: params.depth === 0 || params.isThrough
    };
  }
}