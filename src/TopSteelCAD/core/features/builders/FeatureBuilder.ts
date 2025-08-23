/**
 * FeatureBuilder - Builder pattern pour construction de features
 * Facilite la création de features complexes avec une API fluide
 */

import * as THREE from 'three';
import {
  Feature,
  FeatureType,
  ProfileFace,
  // FeatureParameters,
  CoordinateSystem
} from '../types';

/**
 * Interface pour feature normalisée
 */
export interface NormalizedFeature extends Feature {
  version: string;
  validated: boolean;
  metadata: {
    createdAt: Date;
    source?: string;
    [key: string]: any;
  };
}

/**
 * Base abstract pour tous les builders
 */
export abstract class BaseFeatureBuilder<T extends BaseFeatureBuilder<T>> {
  protected feature: Partial<NormalizedFeature>;
  
  constructor() {
    this.feature = {
      id: this.generateId(),
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {},
      version: '1.0',
      validated: false,
      metadata: {
        createdAt: new Date()
      }
    };
  }
  
  /**
   * Définit l'ID de la feature
   */
  withId(id: string): T {
    this.feature.id = id;
    return this as any as T;
  }
  
  /**
   * Définit la position
   */
  withPosition(x: number, y: number, z: number = 0): T {
    this.feature.position = new THREE.Vector3(x, y, z);
    return this as any as T;
  }
  
  /**
   * Définit la rotation
   */
  withRotation(x: number, y: number, z: number): T {
    this.feature.rotation = new THREE.Euler(x, y, z);
    return this as any as T;
  }
  
  /**
   * Définit la face
   */
  withFace(face: ProfileFace): T {
    this.feature.face = face;
    return this as any as T;
  }
  
  /**
   * Définit le système de coordonnées
   */
  withCoordinateSystem(system: CoordinateSystem): T {
    this.feature.coordinateSystem = system;
    return this as any as T;
  }
  
  /**
   * Ajoute des métadonnées
   */
  withMetadata(key: string, value: any): T {
    if (!this.feature.metadata) {
      this.feature.metadata = { createdAt: new Date() };
    }
    this.feature.metadata[key] = value;
    return this as any as T;
  }
  
  /**
   * Définit la source
   */
  fromSource(source: string): T {
    if (!this.feature.metadata) {
      this.feature.metadata = { createdAt: new Date() };
    }
    this.feature.metadata.source = source;
    return this as any as T;
  }
  
  /**
   * Valide la feature
   */
  protected abstract validate(): string[];
  
  /**
   * Construit la feature finale
   */
  build(): NormalizedFeature {
    const errors = this.validate();
    if (errors.length > 0) {
      throw new Error(`Feature validation failed: ${errors.join(', ')}`);
    }
    
    this.feature.validated = true;
    return this.feature as NormalizedFeature;
  }
  
  /**
   * Génère un ID unique
   */
  protected generateId(): string {
    return `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Builder pour les trous
 */
export class HoleFeatureBuilder extends BaseFeatureBuilder<HoleFeatureBuilder> {
  constructor() {
    super();
    this.feature.type = FeatureType.HOLE;
  }
  
  /**
   * Définit le diamètre
   */
  withDiameter(diameter: number): HoleFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.diameter = diameter;
    return this;
  }
  
  /**
   * Définit la profondeur
   */
  withDepth(depth: number): HoleFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.depth = depth;
    return this;
  }
  
  /**
   * Définit le type de trou
   */
  withHoleType(type: 'round' | 'slotted' | 'square' | 'rectangular'): HoleFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.holeType = type;
    return this;
  }
  
  /**
   * Configure un trou oblong
   */
  asSlotted(length: number, angle: number = 0): HoleFeatureBuilder {
    this.withHoleType('slotted');
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.slottedLength = length;
    this.feature.parameters.slottedAngle = angle;
    return this;
  }
  
  /**
   * Configure un trou rectangulaire
   */
  asRectangular(width: number, height: number): HoleFeatureBuilder {
    this.withHoleType('rectangular');
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.width = width;
    this.feature.parameters.height = height;
    return this;
  }
  
  /**
   * Trou traversant (profondeur infinie)
   */
  throughAll(): HoleFeatureBuilder {
    return this.withDepth(9999);
  }
  
  protected validate(): string[] {
    const errors: string[] = [];
    const params = this.feature.parameters;
    
    if (!params?.diameter || params.diameter <= 0) {
      errors.push('Hole diameter must be positive');
    }
    
    if (params?.holeType === 'slotted' && !params.slottedLength) {
      errors.push('Slotted hole requires length');
    }
    
    if (params?.holeType === 'rectangular' && (!params.width || !params.height)) {
      errors.push('Rectangular hole requires width and height');
    }
    
    return errors;
  }
}

/**
 * Builder pour les découpes
 */
export class CutFeatureBuilder extends BaseFeatureBuilder<CutFeatureBuilder> {
  private contourPoints: Array<[number, number]> = [];
  
  constructor() {
    super();
    this.feature.type = FeatureType.CUTOUT;
  }
  
  /**
   * Ajoute un point au contour
   */
  addPoint(x: number, y: number): CutFeatureBuilder {
    this.contourPoints.push([x, y]);
    return this;
  }
  
  /**
   * Ajoute plusieurs points
   */
  withContour(points: Array<[number, number]>): CutFeatureBuilder {
    this.contourPoints = [...points];
    return this;
  }
  
  /**
   * Définit la profondeur
   */
  withDepth(depth: number): CutFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.depth = depth;
    return this;
  }
  
  /**
   * Marque comme découpe transversale
   */
  asTransverse(): CutFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.isTransverse = true;
    return this;
  }
  
  /**
   * Crée un rectangle
   */
  asRectangle(x: number, y: number, width: number, height: number): CutFeatureBuilder {
    this.contourPoints = [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y]
    ];
    return this;
  }
  
  /**
   * Ferme le contour
   */
  closeContour(): CutFeatureBuilder {
    if (this.contourPoints.length > 2) {
      const first = this.contourPoints[0];
      const last = this.contourPoints[this.contourPoints.length - 1];
      
      if (first[0] !== last[0] || first[1] !== last[1]) {
        this.contourPoints.push([first[0], first[1]]);
      }
    }
    return this;
  }
  
  protected validate(): string[] {
    const errors: string[] = [];
    
    if (this.contourPoints.length < 3) {
      errors.push('Cut requires at least 3 contour points');
    }
    
    if (!this.feature.parameters?.depth || this.feature.parameters.depth <= 0) {
      errors.push('Cut depth must be positive');
    }
    
    return errors;
  }
  
  build(): NormalizedFeature {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.contourPoints = this.contourPoints.map(([x, y]) => ({ x, y }));
    
    return super.build();
  }
}

/**
 * Builder pour les chanfreins
 */
export class ChamferFeatureBuilder extends BaseFeatureBuilder<ChamferFeatureBuilder> {
  constructor() {
    super();
    this.feature.type = FeatureType.CHAMFER;
  }
  
  /**
   * Définit la taille
   */
  withSize(size: number): ChamferFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.size = size;
    return this;
  }
  
  /**
   * Définit l'angle
   */
  withAngle(angle: number): ChamferFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.angle = angle;
    return this;
  }
  
  /**
   * Chanfrein standard à 45°
   */
  standard(size: number): ChamferFeatureBuilder {
    return this.withSize(size).withAngle(45);
  }
  
  protected validate(): string[] {
    const errors: string[] = [];
    const params = this.feature.parameters;
    
    if (!params?.size || params.size <= 0) {
      errors.push('Chamfer size must be positive');
    }
    
    if (params?.angle && (params.angle <= 0 || params.angle >= 90)) {
      errors.push('Chamfer angle must be between 0 and 90 degrees');
    }
    
    return errors;
  }
}

/**
 * Builder pour les marquages
 */
export class MarkingFeatureBuilder extends BaseFeatureBuilder<MarkingFeatureBuilder> {
  constructor() {
    super();
    this.feature.type = FeatureType.MARKING;
  }
  
  /**
   * Définit le texte
   */
  withText(text: string): MarkingFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.text = text;
    return this;
  }
  
  /**
   * Définit la taille
   */
  withSize(size: number): MarkingFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.size = size;
    return this;
  }
  
  /**
   * Définit l'angle
   */
  withAngle(angle: number): MarkingFeatureBuilder {
    if (!this.feature.parameters) {
      this.feature.parameters = {};
    }
    this.feature.parameters.angle = angle;
    return this;
  }
  
  protected validate(): string[] {
    const errors: string[] = [];
    const params = this.feature.parameters;
    
    if (!params?.text || params.text.trim().length === 0) {
      errors.push('Marking must have text');
    }
    
    if (params?.size && params.size <= 0) {
      errors.push('Marking size must be positive');
    }
    
    return errors;
  }
}

/**
 * Factory pour créer les builders appropriés
 */
export class FeatureBuilderFactory {
  static hole(): HoleFeatureBuilder {
    return new HoleFeatureBuilder();
  }
  
  static cut(): CutFeatureBuilder {
    return new CutFeatureBuilder();
  }
  
  static chamfer(): ChamferFeatureBuilder {
    return new ChamferFeatureBuilder();
  }
  
  static marking(): MarkingFeatureBuilder {
    return new MarkingFeatureBuilder();
  }
  
  /**
   * Crée un builder basé sur le type
   */
  static create(type: FeatureType): BaseFeatureBuilder<any> {
    switch (type) {
      case FeatureType.HOLE:
        return new HoleFeatureBuilder();
      case FeatureType.CUTOUT:
        return new CutFeatureBuilder();
      case FeatureType.CHAMFER:
        return new ChamferFeatureBuilder();
      case FeatureType.MARKING:
        return new MarkingFeatureBuilder();
      default:
        throw new Error(`No builder available for feature type: ${type}`);
    }
  }
}

// Export des helpers pour une utilisation simplifiée
export const hole = () => FeatureBuilderFactory.hole();
export const cut = () => FeatureBuilderFactory.cut();
export const chamfer = () => FeatureBuilderFactory.chamfer();
export const marking = () => FeatureBuilderFactory.marking();