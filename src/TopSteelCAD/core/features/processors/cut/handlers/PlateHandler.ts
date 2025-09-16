/**
 * PlateHandler.ts - Handler pour les plaques et tôles
 * Gère les blocks PL (Plates) du standard DSTV
 */

import * as THREE from 'three';
import { Feature } from '../types/CoreTypes';
import { PivotElement } from '../types/CoreTypes';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

/**
 * Types de plaques supportés
 */
enum PlateType {
  FLAT = 'flat',              // Plaque plate standard
  BENT = 'bent',              // Plaque pliée
  CURVED = 'curved',          // Plaque courbée
  PERFORATED = 'perforated',  // Plaque perforée
  CORRUGATED = 'corrugated',  // Plaque ondulée
  CUSTOM = 'custom'           // Forme personnalisée
}

/**
 * Configuration d'une plaque
 */
interface PlateConfig {
  thickness: number;
  width: number;
  length: number;
  material?: string;
  coating?: string;
  perforationPattern?: string;
  bendAngle?: number;
  bendRadius?: number;
}

/**
 * Handler pour les plaques et tôles (blocks PL dans DSTV)
 */
export class PlateHandler extends BaseCutHandler {
  readonly name = 'PlateHandler';
  readonly supportedTypes = [
    CutType.CONTOUR_CUT,
    CutType.THROUGH_CUT,
    CutType.PARTIAL_CUT
  ];
  readonly priority = 65; // Priorité moyenne-haute pour les plaques

  private geometryService = getGeometryService();

  /**
   * Vérifie si ce handler peut traiter cette feature
   */
  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Block DSTV PL explicite
    if (params.dstvBlock === 'PL' || params.blockType === 'PL') {
      return true;
    }
    
    // Type de profil plaque
    if (params.profileType === 'PLATE' || params.profileType === 'FLAT') {
      return true;
    }
    
    // Élément de type plaque
    if (params.element?.type === 'PLATE' || params.elementType === 'PLATE') {
      return true;
    }
    
    // Paramètres caractéristiques d'une plaque
    if (params.thickness && params.width && params.length && !params.height) {
      // Une plaque a typiquement épaisseur, largeur, longueur mais pas de hauteur
      return true;
    }
    
    // Pattern de plaque détecté
    if (params.isPlate || params.plateType) {
      return true;
    }
    
    return false;
  }

  /**
   * Validation spécifique pour les plaques
   */
  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    // Vérifier l'épaisseur
    if (params.thickness) {
      if (params.thickness <= 0) {
        errors.push('Plate thickness must be positive');
      }
      if (params.thickness > 100) {
        warnings.push(`Very thick plate (${params.thickness}mm) may require special processing`);
      }
    }
    
    // Vérifier les dimensions
    if (params.width && params.length) {
      if (params.width <= 0 || params.length <= 0) {
        errors.push('Plate dimensions must be positive');
      }
      
      const area = params.width * params.length;
      if (area > 1000000) { // 1m²
        warnings.push('Large plate area may impact performance');
      }
    }
    
    // Vérifier les perforations si présentes
    if (params.perforationPattern) {
      if (!this.isValidPerforationPattern(params.perforationPattern)) {
        warnings.push(`Unknown perforation pattern: ${params.perforationPattern}`);
      }
    }
    
    // Vérifier les pliages
    if (params.bendAngle) {
      if (Math.abs(params.bendAngle) > 180) {
        errors.push('Bend angle must be between -180 and 180 degrees');
      }
    }
    
    // Vérifier la compatibilité avec le contour
    if (params.points) {
      const bounds = this.getContourBounds(this.normalizePoints(params.points));
      
      if (params.width && Math.abs(bounds.width - params.width) > 1) {
        warnings.push('Contour width does not match specified width');
      }
      
      if (params.length && Math.abs(bounds.height - params.length) > 1) {
        warnings.push('Contour length does not match specified length');
      }
    }
  }

  /**
   * Les plaques peuvent fonctionner avec ou sans points de contour
   */
  protected requiresContourPoints(): boolean {
    return false;
  }

  /**
   * Crée la géométrie de plaque avec découpe
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const plateType = this.detectPlateType(params);
    
    console.log(`  🔲 Creating plate cut geometry:`, {
      type: plateType,
      thickness: params.thickness || 'auto',
      width: params.width || 'auto',
      length: params.length || 'auto'
    });
    
    switch (plateType) {
      case PlateType.BENT:
        return this.createBentPlate(params, element);
        
      case PlateType.CURVED:
        return this.createCurvedPlate(params, element);
        
      case PlateType.PERFORATED:
        return this.createPerforatedPlate(params, element);
        
      case PlateType.CORRUGATED:
        return this.createCorrugatedPlate(params, element);
        
      case PlateType.CUSTOM:
        return this.createCustomPlate(params, element);
        
      case PlateType.FLAT:
      default:
        return this.createFlatPlate(params, element);
    }
  }

  /**
   * Détecte le type de plaque
   */
  private detectPlateType(params: any): PlateType {
    if (params.plateType) {
      const type = params.plateType.toLowerCase();
      if (Object.values(PlateType).includes(type as PlateType)) {
        return type as PlateType;
      }
    }
    
    if (params.bendAngle || params.bendRadius) {
      return PlateType.BENT;
    }
    
    if (params.curvature || params.radius) {
      return PlateType.CURVED;
    }
    
    if (params.perforationPattern || params.holes) {
      return PlateType.PERFORATED;
    }
    
    if (params.corrugation || params.wavePattern) {
      return PlateType.CORRUGATED;
    }
    
    if (params.points && params.points.length > 4) {
      return PlateType.CUSTOM;
    }
    
    return PlateType.FLAT;
  }

  /**
   * Crée une plaque plate standard
   */
  private createFlatPlate(params: any, element: PivotElement): THREE.BufferGeometry {
    const config = this.extractPlateConfig(params, element);
    
    // Si on a un contour personnalisé
    if (params.points && params.points.length >= 3) {
      const shape = this.createShapeFromPoints(this.normalizePoints(params.points));
      
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: config.thickness,
        bevelEnabled: false,
        steps: 1
      };
      
      return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }
    
    // Sinon, créer une plaque rectangulaire
    const geometry = new THREE.BoxGeometry(
      config.width,
      config.thickness,
      config.length
    );
    
    // Positionner correctement
    this.positionPlateGeometry(geometry, params);
    
    return geometry;
  }

  /**
   * Crée une plaque pliée
   */
  private createBentPlate(params: any, element: PivotElement): THREE.BufferGeometry {
    const config = this.extractPlateConfig(params, element);
    const bendAngle = params.bendAngle || 90;
    const bendRadius = params.bendRadius || config.thickness * 2;
    
    // Créer le profil de la plaque pliée
    const shape = new THREE.Shape();
    
    const halfWidth = config.width / 2;
    
    // Partie plate gauche
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(-bendRadius, 0);
    
    // Courbe de pliage
    if (bendAngle > 0) {
      shape.absarc(0, 0, bendRadius, Math.PI, Math.PI - (bendAngle * Math.PI / 180), true);
    } else {
      shape.absarc(0, 0, bendRadius, 0, -bendAngle * Math.PI / 180, false);
    }
    
    // Partie plate droite
    const endX = bendRadius * Math.cos((180 - bendAngle) * Math.PI / 180);
    const endY = bendRadius * Math.sin((180 - bendAngle) * Math.PI / 180);
    shape.lineTo(endX + halfWidth * Math.cos(bendAngle * Math.PI / 180), 
                 endY + halfWidth * Math.sin(bendAngle * Math.PI / 180));
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: config.length,
      bevelEnabled: false,
      steps: Math.max(1, Math.floor(Math.abs(bendAngle) / 10))
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée une plaque courbée
   */
  private createCurvedPlate(params: any, element: PivotElement): THREE.BufferGeometry {
    const config = this.extractPlateConfig(params, element);
    const radius = params.radius || config.width;
    const angle = params.angle || 90;
    
    // Créer une forme courbée
    const shape = new THREE.Shape();
    
    const innerRadius = radius - config.thickness / 2;
    const outerRadius = radius + config.thickness / 2;
    const angleRad = angle * Math.PI / 180;
    
    shape.absarc(0, 0, outerRadius, 0, angleRad, false);
    shape.lineTo(
      innerRadius * Math.cos(angleRad),
      innerRadius * Math.sin(angleRad)
    );
    shape.absarc(0, 0, innerRadius, angleRad, 0, true);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: config.length,
      bevelEnabled: false,
      steps: Math.max(1, Math.floor(angle / 5))
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée une plaque perforée
   */
  private createPerforatedPlate(params: any, element: PivotElement): THREE.BufferGeometry {
    this.extractPlateConfig(params, element);
    
    // Créer la plaque de base
    const baseGeometry = this.createFlatPlate(params, element);
    
    // Ajouter les perforations (simplifié pour la démo)
    // En production, cela devrait soustraire les trous avec CSG
    
    // Pour l'instant, retourner la plaque de base
    console.log(`    Note: Perforation pattern '${params.pattern || 'default'}' not yet implemented`);
    
    return baseGeometry;
  }

  /**
   * Crée une plaque ondulée
   */
  private createCorrugatedPlate(params: any, element: PivotElement): THREE.BufferGeometry {
    const config = this.extractPlateConfig(params, element);
    const waveHeight = params.waveHeight || 20;
    const waveLength = params.waveLength || 50;
    const waves = Math.floor(config.width / waveLength);
    
    // Créer le profil ondulé
    const shape = new THREE.Shape();
    
    for (let i = 0; i <= waves; i++) {
      const x = i * waveLength;
      const y = (i % 2 === 0) ? 0 : waveHeight;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        // Créer une courbe sinusoïdale
        const cpX = x - waveLength / 2;
        const cpY = (i % 2 === 0) ? waveHeight : 0;
        shape.quadraticCurveTo(cpX, cpY, x, y);
      }
    }
    
    // Fermer le profil
    shape.lineTo(waves * waveLength, -config.thickness);
    shape.lineTo(0, -config.thickness);
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: config.length,
      bevelEnabled: false,
      steps: 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Crée une plaque avec forme personnalisée
   */
  private createCustomPlate(params: any, element: PivotElement): THREE.BufferGeometry {
    const config = this.extractPlateConfig(params, element);
    const points = this.normalizePoints(params.points);
    
    if (points.length < 3) {
      // Fallback vers plaque plate
      return this.createFlatPlate(params, element);
    }
    
    const shape = this.createShapeFromPoints(points);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: config.thickness,
      bevelEnabled: params.bevelEnabled || false,
      bevelThickness: params.bevelThickness || 0,
      bevelSize: params.bevelSize || 0,
      steps: params.steps || 1
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Extrait la configuration de la plaque
   */
  private extractPlateConfig(params: any, element: PivotElement): PlateConfig {
    const dims = element.dimensions || {};
    
    return {
      thickness: params.thickness || dims.thickness || 10,
      width: params.width || dims.width || 1000,
      length: params.length || dims.length || 2000,
      material: params.material || element.materialType || 'STEEL',
      coating: params.coating,
      perforationPattern: params.perforationPattern,
      bendAngle: params.bendAngle,
      bendRadius: params.bendRadius
    };
  }

  /**
   * Positionne la géométrie de la plaque
   */
  private positionPlateGeometry(geometry: THREE.BufferGeometry, params: any): void {
    const position = params.position || {};
    const x = position.x || params.x || 0;
    const y = position.y || params.y || 0;
    const z = position.z || params.z || 0;
    
    if (x !== 0 || y !== 0 || z !== 0) {
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(x, y, z);
      geometry.applyMatrix4(matrix);
    }
    
    // Rotation si nécessaire
    if (params.rotation) {
      const euler = new THREE.Euler(
        (params.rotation.x || 0) * Math.PI / 180,
        (params.rotation.y || 0) * Math.PI / 180,
        (params.rotation.z || 0) * Math.PI / 180
      );
      const matrix = new THREE.Matrix4();
      matrix.makeRotationFromEuler(euler);
      geometry.applyMatrix4(matrix);
    }
  }

  /**
   * Vérifie si un pattern de perforation est valide
   */
  private isValidPerforationPattern(pattern: string): boolean {
    const validPatterns = [
      'grid', 'staggered', 'diagonal', 
      'hexagonal', 'circular', 'custom'
    ];
    return validPatterns.includes(pattern.toLowerCase());
  }

  /**
   * Détecte le type de coupe pour les plaques
   */
  protected detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.isThrough || params.depth === 0) {
      return CutType.THROUGH_CUT;
    }
    
    if (params.depth && params.depth > 0) {
      return CutType.PARTIAL_CUT;
    }
    
    if (params.points || params.contour) {
      return CutType.CONTOUR_CUT;
    }
    
    return CutType.THROUGH_CUT;
  }

  /**
   * Génère les métadonnées pour la plaque
   */
  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element as any);
    const params = feature.parameters as any;
    const config = this.extractPlateConfig(params, element);
    const plateType = this.detectPlateType(params);
    
    return {
      ...baseMetadata,
      handler: 'PlateHandler',
      plateType,
      thickness: config.thickness,
      width: config.width,
      length: config.length,
      material: config.material,
      coating: config.coating,
      area: config.width * config.length,
      volume: config.width * config.length * config.thickness,
      weight: this.calculateWeight(config),
      perforated: !!params.perforationPattern,
      bent: plateType === PlateType.BENT,
      bendAngle: params.bendAngle
    };
  }

  /**
   * Calcule le poids approximatif de la plaque
   */
  private calculateWeight(config: PlateConfig): number {
    // Densité de l'acier : ~7.85 g/cm³
    const density = 7.85; // g/cm³
    const volume = (config.width * config.length * config.thickness) / 1000; // cm³
    return volume * density / 1000; // kg
  }
}