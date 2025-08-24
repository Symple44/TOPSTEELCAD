/**
 * Système de Coordonnées Unifié (UCS)
 * 
 * Gère la conversion entre différents espaces de coordonnées
 * pour assurer une cohérence dans tout le système.
 */

import * as THREE from 'three';
import {
  CoordinateSpace,
  CoordinateTransform,
  TransformContext
} from './types';

export class UnifiedCoordinateSystem {
  private standardSpace: CoordinateSpace = {
    origin: 'center',
    axes: { x: 'width', y: 'height', z: 'length' },
    units: 'mm',
    handedness: 'right'
  };
  
  private transforms: Map<string, CoordinateTransform> = new Map();
  private debugMode: boolean = false;
  
  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.initializeStandardTransforms();
  }
  
  /**
   * Initialise les transformations standard
   */
  private initializeStandardTransforms(): void {
    // Transformation DSTV par défaut
    this.registerCoordinateSpace('dstv', {
      origin: 'corner',
      axes: { x: 'length', y: 'height', z: 'width' },
      units: 'mm',
      handedness: 'right'
    });
    
    // Transformation IFC (pour le futur)
    this.registerCoordinateSpace('ifc', {
      origin: 'corner',
      axes: { x: 'length', y: 'width', z: 'height' },
      units: 'mm',
      handedness: 'right'
    });
  }
  
  /**
   * Enregistre un espace de coordonnées pour un plugin
   */
  registerCoordinateSpace(
    pluginId: string,
    space: CoordinateSpace,
    customTransform?: Partial<CoordinateTransform>
  ): void {
    const transform = this.calculateTransform(space, this.standardSpace, customTransform);
    this.transforms.set(pluginId, transform);
    
    if (this.debugMode) {
      console.log(`📐 Registered coordinate space for ${pluginId}:`, space);
    }
  }
  
  /**
   * Calcule la transformation entre deux espaces
   */
  private calculateTransform(
    from: CoordinateSpace,
    to: CoordinateSpace,
    customTransform?: Partial<CoordinateTransform>
  ): CoordinateTransform {
    const transform: CoordinateTransform = {
      from,
      to,
      translation: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1)
    };
    
    // Calcul de la translation selon l'origine
    if (from.origin === 'corner' && to.origin === 'center') {
      // La translation sera calculée dynamiquement avec les dimensions
      // Placeholder pour l'instant
      transform.translation.set(0, 0, 0);
    } else if (from.origin === 'center' && to.origin === 'corner') {
      // Inverse
      transform.translation.set(0, 0, 0);
    }
    
    // Calcul de la rotation selon les axes
    const axisMap = this.calculateAxisMapping(from.axes, to.axes);
    transform.rotation = this.calculateRotationFromAxisMapping(axisMap);
    
    // Calcul de l'échelle selon les unités
    if (from.units !== to.units) {
      const scaleFactor = this.getUnitConversionFactor(from.units, to.units);
      transform.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
    
    // Appliquer les transformations personnalisées
    if (customTransform) {
      if (customTransform.translation) {
        transform.translation.add(customTransform.translation);
      }
      if (customTransform.rotation) {
        transform.rotation.x += customTransform.rotation.x;
        transform.rotation.y += customTransform.rotation.y;
        transform.rotation.z += customTransform.rotation.z;
      }
      if (customTransform.scale) {
        transform.scale.multiply(customTransform.scale);
      }
    }
    
    return transform;
  }
  
  /**
   * Calcule le mapping entre les axes
   */
  private calculateAxisMapping(
    fromAxes: CoordinateSpace['axes'],
    toAxes: CoordinateSpace['axes']
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    // Pour DSTV vers Three.js standard
    if (fromAxes.x === 'length' && toAxes.z === 'length') {
      mapping.x = 'z';
      mapping.y = 'y';
      mapping.z = 'x';
    } else if (fromAxes.x === 'length' && toAxes.x === 'width') {
      // Configuration Three.js standard
      mapping.x = 'z';
      mapping.y = 'y';
      mapping.z = 'x';
    } else {
      // Mapping par défaut
      mapping.x = 'x';
      mapping.y = 'y';
      mapping.z = 'z';
    }
    
    return mapping;
  }
  
  /**
   * Calcule la rotation à partir du mapping d'axes
   */
  private calculateRotationFromAxisMapping(
    axisMap: Record<string, string>
  ): THREE.Euler {
    // Pour l'instant, pas de rotation nécessaire
    // Les axes sont gérés par le remapping des coordonnées
    return new THREE.Euler(0, 0, 0);
  }
  
  /**
   * Obtient le facteur de conversion entre unités
   */
  private getUnitConversionFactor(from: string, to: string): number {
    const conversions: Record<string, number> = {
      'mm_to_m': 0.001,
      'm_to_mm': 1000,
      'mm_to_inch': 0.0393701,
      'inch_to_mm': 25.4,
      'm_to_inch': 39.3701,
      'inch_to_m': 0.0254
    };
    
    if (from === to) return 1;
    
    const key = `${from}_to_${to}`;
    return conversions[key] || 1;
  }
  
  /**
   * Transforme des coordonnées du système d'un plugin vers le système standard
   */
  toStandard(
    position: THREE.Vector3,
    pluginId: string,
    context?: TransformContext
  ): THREE.Vector3 {
    const transform = this.transforms.get(pluginId);
    if (!transform) {
      console.warn(`⚠️ No transform registered for plugin: ${pluginId}`);
      return position.clone();
    }
    
    if (this.debugMode) {
      console.log(`🔄 Converting from ${pluginId} to standard:`, {
        input: position,
        context
      });
    }
    
    return this.applyTransform(position, transform, context);
  }
  
  /**
   * Transforme des coordonnées du système standard vers celui d'un plugin
   */
  fromStandard(
    position: THREE.Vector3,
    pluginId: string,
    context?: TransformContext
  ): THREE.Vector3 {
    const transform = this.transforms.get(pluginId);
    if (!transform) {
      return position.clone();
    }
    
    return this.applyInverseTransform(position, transform, context);
  }
  
  /**
   * Applique une transformation
   */
  private applyTransform(
    position: THREE.Vector3,
    transform: CoordinateTransform,
    context?: TransformContext
  ): THREE.Vector3 {
    const result = position.clone();
    
    // Appliquer la translation dynamique selon le contexte
    if (transform.from.origin === 'corner' && transform.to.origin === 'center') {
      if (context?.profileDimensions) {
        const { length, height, width } = context.profileDimensions;
        
        // DSTV utilise X le long du profil, Y transversal, Z vertical (parfois)
        // Three.js utilise Z le long du profil, X transversal, Y vertical
        
        // Conversion DSTV -> Three.js
        const standardPosition = new THREE.Vector3(
          0,  // X sera calculé selon la face
          result.y - height / 2,  // Centrage vertical
          result.x - length / 2   // X DSTV devient Z Three.js
        );
        
        // Ajustement selon la face si nécessaire
        if (context.face) {
          standardPosition.x = this.calculateXFromFace(
            result.y,
            context.face,
            width
          );
        }
        
        return standardPosition;
      }
    }
    
    // Appliquer l'échelle
    result.multiply(transform.scale);
    
    // Appliquer la rotation
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromEuler(transform.rotation);
    result.applyMatrix4(matrix);
    
    // Appliquer la translation
    result.add(transform.translation);
    
    if (this.debugMode) {
      console.log(`  → Standard position:`, result);
    }
    
    return result;
  }
  
  /**
   * Calcule la coordonnée X selon la face
   */
  private calculateXFromFace(yDstv: number, face: string, width: number): number {
    const faceLower = face.toLowerCase();
    
    switch (faceLower) {
      case 'v':  // Top flange
      case 'u':  // Bottom flange
        // Pour les ailes, Y DSTV représente la position latérale
        return yDstv - width / 2;
        
      case 'o':  // Web
      case 'h':  // Front
      default:
        // Pour l'âme, X est au centre
        return 0;
    }
  }
  
  /**
   * Applique la transformation inverse
   */
  private applyInverseTransform(
    position: THREE.Vector3,
    transform: CoordinateTransform,
    context?: TransformContext
  ): THREE.Vector3 {
    const result = position.clone();
    
    // Appliquer la translation inverse
    result.sub(transform.translation);
    
    // Appliquer la rotation inverse
    const matrix = new THREE.Matrix4();
    const inverseRotation = transform.rotation.clone();
    inverseRotation.x = -inverseRotation.x;
    inverseRotation.y = -inverseRotation.y;
    inverseRotation.z = -inverseRotation.z;
    matrix.makeRotationFromEuler(inverseRotation);
    result.applyMatrix4(matrix);
    
    // Appliquer l'échelle inverse
    const inverseScale = new THREE.Vector3(
      1 / transform.scale.x,
      1 / transform.scale.y,
      1 / transform.scale.z
    );
    result.multiply(inverseScale);
    
    // Appliquer la translation dynamique inverse selon le contexte
    if (transform.from.origin === 'corner' && transform.to.origin === 'center') {
      if (context?.profileDimensions) {
        const { length, height, width } = context.profileDimensions;
        
        // Three.js -> DSTV
        const dstvPosition = new THREE.Vector3(
          result.z + length / 2,  // Z Three.js devient X DSTV
          result.y + height / 2,  // Décentralisation verticale
          0  // Z DSTV rarement utilisé
        );
        
        // Ajustement selon la face
        if (context.face) {
          dstvPosition.y = this.calculateYDstvFromFace(
            result.x,
            result.y,
            context.face,
            width,
            height
          );
        }
        
        return dstvPosition;
      }
    }
    
    return result;
  }
  
  /**
   * Calcule la coordonnée Y DSTV selon la face
   */
  private calculateYDstvFromFace(
    xStandard: number,
    yStandard: number,
    face: string,
    width: number,
    height: number
  ): number {
    const faceLower = face.toLowerCase();
    
    switch (faceLower) {
      case 'v':  // Top flange
      case 'u':  // Bottom flange
        // Pour les ailes, récupérer la position latérale
        return xStandard + width / 2;
        
      case 'o':  // Web
      case 'h':  // Front
      default:
        // Pour l'âme, récupérer la position verticale
        return yStandard + height / 2;
    }
  }
  
  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  /**
   * Obtient une transformation enregistrée
   */
  getTransform(pluginId: string): CoordinateTransform | undefined {
    return this.transforms.get(pluginId);
  }
  
  /**
   * Liste tous les plugins enregistrés
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.transforms.keys());
  }
}