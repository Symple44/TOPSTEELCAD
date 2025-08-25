/**
 * Service Central de Positionnement
 * 
 * Point d'entrée unique pour toutes les conversions de coordonnées
 * dans l'application.
 */

import * as THREE from 'three';
import { DSTVCoordinateAdapter } from '../../plugins/dstv/coordinates/DSTVCoordinateAdapter';
import {
  StandardPosition,
  StandardFace,
  PositionContext
} from '../coordinates/types';

/**
 * Cache de positions
 */
class PositionCache {
  private cache: Map<string, StandardPosition> = new Map();
  private maxSize: number = 1000;
  
  /**
   * Génère une clé de cache
   */
  private generateKey(
    position: any,
    plugin: string,
    context: PositionContext
  ): string {
    const posStr = JSON.stringify(position);
    const ctxStr = JSON.stringify({
      profileType: context.profileType,
      face: context.face,
      dimensions: context.dimensions
    });
    return `${plugin}:${posStr}:${ctxStr}`;
  }
  
  /**
   * Obtient une position du cache
   */
  get(
    position: any,
    plugin: string,
    context: PositionContext
  ): StandardPosition | undefined {
    const key = this.generateKey(position, plugin, context);
    return this.cache.get(key);
  }
  
  /**
   * Ajoute une position au cache
   */
  set(
    position: any,
    plugin: string,
    context: PositionContext,
    standardPosition: StandardPosition
  ): void {
    const key = this.generateKey(position, plugin, context);
    
    // Limiter la taille du cache
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, standardPosition);
  }
  
  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Obtient la taille du cache
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Validateur de positions
 */
class PositionValidator {
  /**
   * Valide une position standard
   */
  validate(
    position: StandardPosition,
    context: PositionContext
  ): {
    valid: boolean;
    errors: string[];
    corrections?: { position: THREE.Vector3 };
  } {
    const errors: string[] = [];
    let corrections: { position: THREE.Vector3 } | undefined;
    
    const { dimensions } = context;
    const pos = position.position;
    
    // Vérifier que la position est dans les limites du profil
    const halfHeight = dimensions.height / 2;
    const halfWidth = dimensions.width / 2;
    const tolerance = 5.0; // 5mm de tolérance
    
    // Vérification Z (longueur) - CORRECTION CRITIQUE pour DSTV
    // Le profil commence à Z=0 et va jusqu'à dimensions.length
    // Pas de centrage en Z pour les coordonnées converties depuis DSTV
    if (pos.z < -tolerance || pos.z > dimensions.length + tolerance) {
      errors.push(`Position Z (${pos.z}) hors limites [0, ${dimensions.length}] avec tolérance ${tolerance}mm`);
      
      // Correction : ramener dans les limites du profil (0 à length)
      if (!corrections) corrections = { position: pos.clone() };
      corrections.position.z = Math.max(0, Math.min(dimensions.length, pos.z));
    }
    
    // Vérification Y (hauteur)
    if (Math.abs(pos.y) > halfHeight * 1.5) {
      errors.push(`Position Y (${pos.y}) hors limites [-${halfHeight * 1.5}, ${halfHeight * 1.5}]`);
      
      if (!corrections) corrections = { position: pos.clone() };
      corrections.position.y = Math.max(-halfHeight * 1.5, Math.min(halfHeight * 1.5, pos.y));
    }
    
    // Vérification X (largeur)
    if (Math.abs(pos.x) > halfWidth * 1.5) {
      errors.push(`Position X (${pos.x}) hors limites [-${halfWidth * 1.5}, ${halfWidth * 1.5}]`);
      
      if (!corrections) corrections = { position: pos.clone() };
      corrections.position.x = Math.max(-halfWidth * 1.5, Math.min(halfWidth * 1.5, pos.x));
    }
    
    // Vérification de la cohérence face/position
    if (position.face) {
      const faceErrors = this.validateFacePosition(position.face, pos, dimensions);
      errors.push(...faceErrors);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      corrections
    };
  }
  
  /**
   * Valide la cohérence entre la face et la position
   */
  private validateFacePosition(
    face: StandardFace,
    position: THREE.Vector3,
    dimensions: PositionContext['dimensions']
  ): string[] {
    const errors: string[] = [];
    const tolerance = 5; // 5mm de tolérance
    
    switch (face) {
      case StandardFace.WEB:
        // L'âme devrait être proche de X=0
        if (Math.abs(position.x) > tolerance) {
          errors.push(`Position X (${position.x}) incohérente pour face WEB (attendu proche de 0)`);
        }
        break;
        
      case StandardFace.TOP_FLANGE:
        // Semelle supérieure devrait être proche de Y=height/2
        const expectedY = dimensions.height / 2;
        if (Math.abs(position.y - expectedY) > tolerance) {
          errors.push(`Position Y (${position.y}) incohérente pour TOP_FLANGE (attendu proche de ${expectedY})`);
        }
        break;
        
      case StandardFace.BOTTOM_FLANGE:
        // Semelle inférieure devrait être proche de Y=-height/2
        const expectedYBottom = -dimensions.height / 2;
        if (Math.abs(position.y - expectedYBottom) > tolerance) {
          errors.push(`Position Y (${position.y}) incohérente pour BOTTOM_FLANGE (attendu proche de ${expectedYBottom})`);
        }
        break;
    }
    
    return errors;
  }
}

/**
 * Service de positionnement
 */
export class PositionService {
  private static instance: PositionService;
  
  private adapters: Map<string, any> = new Map();
  private cache: PositionCache;
  private validator: PositionValidator;
  private debugMode: boolean = false;
  
  private constructor() {
    this.cache = new PositionCache();
    this.validator = new PositionValidator();
    this.initializeAdapters();
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(): PositionService {
    if (!PositionService.instance) {
      PositionService.instance = new PositionService();
    }
    return PositionService.instance;
  }
  
  /**
   * Initialise les adaptateurs par défaut
   */
  private initializeAdapters(): void {
    // Adaptateur DSTV
    this.registerAdapter('dstv', new DSTVCoordinateAdapter(this.debugMode));
    
    // Adaptateur IFC (placeholder pour le futur)
    // this.registerAdapter('ifc', new IFCCoordinateAdapter(this.debugMode));
  }
  
  /**
   * Enregistre un adaptateur
   */
  registerAdapter(pluginId: string, adapter: any): void {
    this.adapters.set(pluginId, adapter);
    
    if (this.debugMode) {
      console.log(`🔌 Registered adapter for plugin: ${pluginId}`);
    }
  }
  
  /**
   * Convertit une position vers le format standard
   */
  convertPosition(
    position: any,
    sourcePlugin: string,
    context: PositionContext
  ): StandardPosition {
    // Vérifier le cache
    const cached = this.cache.get(position, sourcePlugin, context);
    if (cached) {
      if (this.debugMode) {
        console.log(`📦 Position found in cache for ${sourcePlugin}`);
      }
      return cached;
    }
    
    // Obtenir l'adaptateur
    const adapter = this.adapters.get(sourcePlugin);
    if (!adapter) {
      throw new Error(`No adapter registered for plugin: ${sourcePlugin}`);
    }
    
    // Convertir la position
    let standardPosition: StandardPosition;
    
    if (sourcePlugin === 'dstv') {
      const dstvAdapter = adapter as DSTVCoordinateAdapter;
      standardPosition = dstvAdapter.toStandardPosition(position, {
        profileType: context.profileType,
        dimensions: context.dimensions,
        face: context.face,
        position
      });
    } else {
      // Pour d'autres plugins (futur)
      standardPosition = adapter.toStandardPosition(position, context);
    }
    
    // Valider le résultat
    const validation = this.validator.validate(standardPosition, context);
    if (!validation.valid) {
      if (this.debugMode) {
        console.warn(`⚠️ Position validation failed:`, validation.errors);
      }
      
      // Appliquer les corrections si disponibles
      if (validation.corrections) {
        standardPosition.position = validation.corrections.position;
        
        if (this.debugMode) {
          console.log(`🔧 Applied position corrections:`, validation.corrections);
        }
      }
    }
    
    // Mettre en cache
    this.cache.set(position, sourcePlugin, context, standardPosition);
    
    if (this.debugMode) {
      console.log(`✅ Converted position from ${sourcePlugin}:`, {
        input: position,
        output: standardPosition.position,
        face: standardPosition.face
      });
    }
    
    return standardPosition;
  }
  
  /**
   * Convertit une position standard vers le format d'un plugin
   */
  convertToPluginFormat(
    standardPosition: StandardPosition,
    targetPlugin: string,
    context: PositionContext
  ): any {
    const adapter = this.adapters.get(targetPlugin);
    if (!adapter) {
      throw new Error(`No adapter registered for plugin: ${targetPlugin}`);
    }
    
    if (targetPlugin === 'dstv') {
      const dstvAdapter = adapter as DSTVCoordinateAdapter;
      return dstvAdapter.fromStandardPosition(standardPosition, {
        profileType: context.profileType,
        dimensions: context.dimensions,
        face: context.face
      });
    }
    
    return adapter.fromStandardPosition(standardPosition, context);
  }
  
  /**
   * Convertit une face vers le format standard
   */
  convertFace(
    face: string,
    sourcePlugin: string,
    context: PositionContext
  ): StandardFace {
    const adapter = this.adapters.get(sourcePlugin);
    if (!adapter) {
      throw new Error(`No adapter registered for plugin: ${sourcePlugin}`);
    }
    
    if (sourcePlugin === 'dstv') {
      const dstvAdapter = adapter as DSTVCoordinateAdapter;
      return dstvAdapter.toStandardFace(face, {
        profileType: context.profileType,
        dimensions: context.dimensions,
        face
      });
    }
    
    return adapter.toStandardFace(face, context);
  }
  
  /**
   * Calcule la position 3D finale pour une feature
   */
  calculateFeaturePosition(
    element: any,
    featurePosition: any,
    face?: string,
    coordinateSystem: string = 'dstv'
  ): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    depth: number;
    normal: THREE.Vector3;
    face?: StandardFace;
  } {
    // Si les coordonnées sont déjà en format standard, pas de conversion nécessaire
    if (coordinateSystem === 'standard' || coordinateSystem === 'STANDARD') {
      if (this.debugMode) {
        console.log('PositionService.calculateFeaturePosition: STANDARD coordinates detected');
      }
      
      // Les coordonnées sont déjà converties, utiliser directement
      const standardFace = face ? this.mapToStandardFace(face) : StandardFace.WEB;
      const rotation = this.calculateRotationForFace(standardFace);
      
      // Calculer la profondeur selon la face
      let depth = 10;
      if (standardFace === StandardFace.WEB) {
        // Pour l'âme, utiliser l'épaisseur de l'âme (webThickness) et non la largeur totale
        depth = element.dimensions?.webThickness || element.dimensions?.thickness || 8.6;
      } else if (standardFace === StandardFace.TOP_FLANGE || standardFace === StandardFace.BOTTOM_FLANGE) {
        depth = element.dimensions?.flangeThickness || 15;
      }
      
      let finalPosition = featurePosition instanceof THREE.Vector3 ? featurePosition : new THREE.Vector3(featurePosition.x, featurePosition.y, featurePosition.z || 0);
      
      return {
        position: finalPosition,
        rotation,
        depth,
        normal: this.getNormalForFace(standardFace),
        face: standardFace
      };
    }
    
    // Sinon, utiliser le système de conversion normal
    const sourcePlugin = coordinateSystem === 'DSTV' ? 'dstv' : coordinateSystem.toLowerCase();
    
    // Contexte de conversion
    const context: PositionContext = {
      profileType: element.type || 'I_PROFILE',
      dimensions: {
        length: element.dimensions?.length || 0,
        height: element.dimensions?.height || 0,
        width: element.dimensions?.width || 0,
        thickness: element.dimensions?.thickness
      },
      face,
      feature: element
    };
    
    // Convertir la position
    const standardPosition = this.convertPosition(
      featurePosition,
      sourcePlugin,
      context
    );
    
    // Calculer la rotation selon la face
    const rotation = this.calculateRotationForFace(standardPosition.face);
    
    return {
      position: standardPosition.position,
      rotation,
      depth: standardPosition.metadata.depth || 10,
      normal: standardPosition.metadata.normal || new THREE.Vector3(0, 1, 0),
      face: standardPosition.face
    };
  }
  
  /**
   * Mappe une face string vers StandardFace
   */
  private mapToStandardFace(face: string): StandardFace {
    // Mapping des faces communes (cohérent avec DSTV)
    const faceMap: Record<string, StandardFace> = {
      'web': StandardFace.WEB,
      'o': StandardFace.WEB,           // o = web (DSTV)
      'v': StandardFace.TOP_FLANGE,    // v = top flange (DSTV) - CORRIGÉ!
      'top': StandardFace.TOP_FLANGE,
      'top_flange': StandardFace.TOP_FLANGE,
      'bottom': StandardFace.BOTTOM_FLANGE,
      'bottom_flange': StandardFace.BOTTOM_FLANGE,
      'u': StandardFace.BOTTOM_FLANGE, // u = bottom flange (DSTV)
      'front': StandardFace.FRONT,
      'h': StandardFace.FRONT,         // h = front (DSTV)
      'back': StandardFace.BACK
    };
    
    return faceMap[face.toLowerCase()] || StandardFace.WEB;
  }
  
  /**
   * Obtient la normale pour une face
   */
  private getNormalForFace(face: StandardFace): THREE.Vector3 {
    switch (face) {
      case StandardFace.WEB:
        return new THREE.Vector3(1, 0, 0);  // Perpendiculaire à l'âme
      case StandardFace.TOP_FLANGE:
        return new THREE.Vector3(0, 1, 0);  // Vers le haut
      case StandardFace.BOTTOM_FLANGE:
        return new THREE.Vector3(0, -1, 0);  // Vers le bas
      case StandardFace.FRONT:
        return new THREE.Vector3(0, 0, -1);  // Vers l'avant
      case StandardFace.BACK:
        return new THREE.Vector3(0, 0, 1);  // Vers l'arrière
      default:
        return new THREE.Vector3(0, 1, 0);
    }
  }
  
  /**
   * Calcule la rotation pour une face
   */
  private calculateRotationForFace(face?: StandardFace): THREE.Euler {
    if (!face) {
      return new THREE.Euler(0, 0, 0);
    }
    
    switch (face) {
      case StandardFace.WEB:
        // Pour l'âme, le cylindre doit traverser selon X
        // Le cylindre THREE.js est créé vertical (selon Y) par défaut
        // Rotation de 90° autour de Z pour orienter le cylindre selon X
        return new THREE.Euler(0, 0, Math.PI / 2);
        
      case StandardFace.TOP_FLANGE:
      case StandardFace.BOTTOM_FLANGE:
        // Pas de rotation, vertical par défaut (traverse selon Y)
        return new THREE.Euler(0, 0, 0);
        
      case StandardFace.FRONT:
      case StandardFace.BACK:
        // Rotation de 90° autour de X pour traverser selon Z
        return new THREE.Euler(Math.PI / 2, 0, 0);
        
      default:
        return new THREE.Euler(0, 0, 0);
    }
  }
  
  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    
    // Propager aux adaptateurs
    for (const adapter of this.adapters.values()) {
      if (adapter.setDebugMode) {
        adapter.setDebugMode(enabled);
      }
    }
  }
  
  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    
    if (this.debugMode) {
      console.log('🗑️ Position cache cleared');
    }
  }
  
  /**
   * Obtient les statistiques du service
   */
  getStatistics(): {
    cacheSize: number;
    adaptersCount: number;
    adapters: string[];
  } {
    return {
      cacheSize: this.cache.size,
      adaptersCount: this.adapters.size,
      adapters: Array.from(this.adapters.keys())
    };
  }
  
  /**
   * Exporte l'historique des transformations
   */
  exportHistory(pluginId?: string): string {
    if (pluginId) {
      const adapter = this.adapters.get(pluginId);
      if (adapter && adapter.exportHistory) {
        return adapter.exportHistory();
      }
    }
    
    // Exporter l'historique de tous les adaptateurs
    const history: Record<string, any> = {};
    for (const [id, adapter] of this.adapters) {
      if (adapter.exportHistory) {
        history[id] = JSON.parse(adapter.exportHistory());
      }
    }
    
    return JSON.stringify(history, null, 2);
  }
}