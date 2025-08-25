/**
 * Gestionnaire de Faces Unifié
 * 
 * Gère la résolution et la normalisation des faces
 * pour tous les types de profils et plugins.
 */

import * as THREE from 'three';
import { StandardFace } from './types';

/**
 * Définition d'une face
 */
export interface FaceDefinition {
  id: string;
  aliases: string[];
  normal: THREE.Vector3;
  origin: 'center' | 'edge' | 'corner';
  depth: number | 'thickness' | 'auto';
}

/**
 * Contexte pour la résolution de face
 */
export interface FaceContext {
  position?: THREE.Vector3;
  dimensions?: {
    length: number;
    height: number;
    width: number;
    thickness?: number;
  };
  profileType?: string;
}

export class FaceManager {
  private faces: Map<string, FaceDefinition> = new Map();
  private profileTypeFaces: Map<string, string[]> = new Map();
  private debugMode: boolean = false;
  
  // Mapping standard unifié pour DSTV
  private readonly DSTV_FACE_MAPPING: Record<string, StandardFace> = {
    // Mapping correct selon la norme DSTV pour profils I
    'v': StandardFace.TOP_FLANGE,    // v = Semelle supérieure (Vorderseite/top)
    'o': StandardFace.WEB,           // o = Âme (Oben/web) 
    'u': StandardFace.BOTTOM_FLANGE, // u = Semelle inférieure (Unten/bottom)
    'h': StandardFace.FRONT,         // h = Face avant (Hinten/front)
    
    // Mappings secondaires pour compatibilité
    'top': StandardFace.TOP_FLANGE,
    'bottom': StandardFace.BOTTOM_FLANGE,
    'web': StandardFace.WEB,
    'front': StandardFace.FRONT,
    'back': StandardFace.BACK,
    'left': StandardFace.LEFT,
    'right': StandardFace.RIGHT
  };
  
  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.initializeStandardFaces();
    this.initializeProfileTypes();
  }
  
  /**
   * Initialise les faces standard
   */
  private initializeStandardFaces(): void {
    // Faces pour profils en I/H
    this.registerFace('web', {
      id: 'web',
      aliases: ['o', 'ame', 'middle', 'vertical'],  // 'o' pour DSTV, PAS 'v'
      normal: new THREE.Vector3(1, 0, 0),
      origin: 'center',
      depth: 'thickness'
    });
    
    this.registerFace('top_flange', {
      id: 'top_flange',
      aliases: ['v', 'top', 'semelle_sup', 'upper_flange', 'tf'],  // 'v' pour DSTV
      normal: new THREE.Vector3(0, 1, 0),
      origin: 'edge',
      depth: 'thickness'
    });
    
    this.registerFace('bottom_flange', {
      id: 'bottom_flange',
      aliases: ['u', 'bottom', 'semelle_inf', 'lower_flange', 'bf'],
      normal: new THREE.Vector3(0, -1, 0),
      origin: 'edge',
      depth: 'thickness'
    });
    
    // Faces pour plaques
    this.registerFace('top', {
      id: 'top',
      aliases: ['upper', 'dessus', 'surface'],
      normal: new THREE.Vector3(0, 1, 0),
      origin: 'center',
      depth: 'thickness'
    });
    
    this.registerFace('bottom', {
      id: 'bottom',
      aliases: ['lower', 'dessous', 'under'],
      normal: new THREE.Vector3(0, -1, 0),
      origin: 'center',
      depth: 'thickness'
    });
    
    // Faces pour tubes rectangulaires
    this.registerFace('left', {
      id: 'left',
      aliases: ['gauche', 'l'],
      normal: new THREE.Vector3(-1, 0, 0),
      origin: 'center',
      depth: 'thickness'
    });
    
    this.registerFace('right', {
      id: 'right',
      aliases: ['droite', 'r'],
      normal: new THREE.Vector3(1, 0, 0),
      origin: 'center',
      depth: 'thickness'
    });
    
    // Faces avant/arrière
    this.registerFace('front', {
      id: 'front',
      aliases: ['h', 'avant', 'face'],
      normal: new THREE.Vector3(0, 0, -1),
      origin: 'edge',
      depth: 'auto'
    });
    
    this.registerFace('back', {
      id: 'back',
      aliases: ['arriere', 'rear'],
      normal: new THREE.Vector3(0, 0, 1),
      origin: 'edge',
      depth: 'auto'
    });
  }
  
  /**
   * Initialise les types de profils et leurs faces
   */
  private initializeProfileTypes(): void {
    // Profils I/H
    this.profileTypeFaces.set('I_PROFILE', [
      'web', 'top_flange', 'bottom_flange', 'front', 'back'
    ]);
    this.profileTypeFaces.set('H_PROFILE', [
      'web', 'top_flange', 'bottom_flange', 'front', 'back'
    ]);
    
    // Plaques
    this.profileTypeFaces.set('PLATE', [
      'top', 'bottom', 'front', 'back', 'left', 'right'
    ]);
    
    // Tubes rectangulaires
    this.profileTypeFaces.set('TUBE_RECT', [
      'top', 'bottom', 'left', 'right', 'front', 'back'
    ]);
    this.profileTypeFaces.set('TUBE_SQUARE', [
      'top', 'bottom', 'left', 'right', 'front', 'back'
    ]);
    
    // Profils L
    this.profileTypeFaces.set('L_PROFILE', [
      'leg1', 'leg2', 'front', 'back'
    ]);
    
    // Profils U
    this.profileTypeFaces.set('U_PROFILE', [
      'web', 'top_flange', 'bottom_flange', 'front', 'back'
    ]);
  }
  
  /**
   * Enregistre une face
   */
  registerFace(id: string, definition: FaceDefinition): void {
    this.faces.set(id, definition);
    
    if (this.debugMode) {
      console.log(`📋 Registered face: ${id}`, definition);
    }
  }
  
  /**
   * Résout une face à partir de son identifiant ou alias
   */
  resolveFace(
    faceId: string,
    profileType?: string,
    context?: FaceContext
  ): FaceDefinition | null {
    if (!faceId) {
      return this.getDefaultFace(profileType);
    }
    
    const faceLower = faceId.toLowerCase();
    
    // Recherche par ID exact
    if (this.faces.has(faceLower)) {
      return this.faces.get(faceLower)!;
    }
    
    // Recherche par alias
    for (const [id, face] of this.faces) {
      if (face.aliases.includes(faceLower)) {
        if (this.debugMode) {
          console.log(`🔍 Resolved face '${faceId}' to '${id}' via alias`);
        }
        return face;
      }
    }
    
    // Si contexte fourni, essayer de déduire la face
    if (context) {
      const deduced = this.deduceFaceFromContext(context, profileType);
      if (deduced) {
        if (this.debugMode) {
          console.log(`🎯 Deduced face from context: ${deduced.id}`);
        }
        return deduced;
      }
    }
    
    // Face par défaut selon le type de profil
    return this.getDefaultFace(profileType);
  }
  
  /**
   * Convertit un indicateur de face DSTV en face standard
   */
  resolveDSTVFace(
    dstvFaceIndicator: string,
    profileType?: string,
    context?: FaceContext
  ): StandardFace {
    const faceLower = dstvFaceIndicator.toLowerCase();
    
    // Utiliser le mapping DSTV unifié
    const standardFace = this.DSTV_FACE_MAPPING[faceLower];
    if (standardFace) {
      if (this.debugMode) {
        console.log(`🔄 DSTV face '${dstvFaceIndicator}' → ${standardFace}`);
      }
      return standardFace;
    }
    
    // Si le type de profil est spécifié, adapter selon le contexte
    if (profileType) {
      return this.resolveFaceForProfileType(faceLower, profileType, context);
    }
    
    // Par défaut, retourner WEB
    console.warn(`⚠️ Unknown DSTV face indicator: ${dstvFaceIndicator}, defaulting to WEB`);
    return StandardFace.WEB;
  }
  
  /**
   * Résout la face selon le type de profil
   */
  private resolveFaceForProfileType(
    faceIndicator: string,
    profileType: string,
    context?: FaceContext
  ): StandardFace {
    const upperType = profileType.toUpperCase();
    
    // Adaptation spécifique selon le type de profil
    if (upperType.includes('I_PROFILE') || upperType.includes('H_PROFILE')) {
      // Pour les profils I/H
      switch (faceIndicator) {
        case 'v':
          // Dans le contexte des profils I, 'v' est généralement l'âme
          // MAIS dans certains parsers (IKBlockParser), c'est TOP_FLANGE
          // On utilise le contexte pour décider
          if (context?.position && context.dimensions) {
            // Si la position Y est proche de la hauteur max, c'est probablement TOP_FLANGE
            const yRatio = Math.abs(context.position.y) / (context.dimensions.height / 2);
            if (yRatio > 0.8) {
              return StandardFace.TOP_FLANGE;
            }
          }
          return StandardFace.WEB;
          
        case 'o':
          // 'o' peut être WEB ou TOP_FLANGE selon le parser
          // On privilégie WEB pour la cohérence
          return StandardFace.WEB;
          
        case 'u':
          return StandardFace.BOTTOM_FLANGE;
          
        case 'h':
          return StandardFace.FRONT;
          
        default:
          return StandardFace.WEB;
      }
    } else if (upperType.includes('PLATE')) {
      // Pour les plaques
      switch (faceIndicator) {
        case 'v':
        case 'top':
          return StandardFace.TOP;
        case 'u':
        case 'bottom':
          return StandardFace.BOTTOM;
        default:
          return StandardFace.TOP;
      }
    } else if (upperType.includes('TUBE')) {
      // Pour les tubes
      switch (faceIndicator) {
        case 'v':
          return StandardFace.TOP;
        case 'u':
          return StandardFace.BOTTOM;
        case 'l':
          return StandardFace.LEFT;
        case 'r':
          return StandardFace.RIGHT;
        default:
          return StandardFace.TOP;
      }
    }
    
    // Par défaut
    return StandardFace.WEB;
  }
  
  /**
   * Déduit la face à partir du contexte
   */
  private deduceFaceFromContext(
    context: FaceContext,
    profileType?: string
  ): FaceDefinition | null {
    if (!context.position || !context.dimensions) {
      return null;
    }
    
    const { position, dimensions } = context;
    const { height, width } = dimensions;
    
    // Calculer les ratios de position
    const xRatio = Math.abs(position.x) / (width / 2);
    const yRatio = Math.abs(position.y) / (height / 2);
    
    if (profileType?.includes('I_PROFILE')) {
      // Pour les profils I
      if (xRatio < 0.2) {
        // Proche du centre en X → âme
        return this.faces.get('web') || null;
      } else if (yRatio > 0.8) {
        // Proche du haut → semelle supérieure
        return position.y > 0
          ? this.faces.get('top_flange') || null
          : this.faces.get('bottom_flange') || null;
      }
    } else if (profileType?.includes('PLATE')) {
      // Pour les plaques
      return position.y > 0
        ? this.faces.get('top') || null
        : this.faces.get('bottom') || null;
    }
    
    return null;
  }
  
  /**
   * Obtient la face par défaut pour un type de profil
   */
  private getDefaultFace(profileType?: string): FaceDefinition | null {
    if (!profileType) {
      return this.faces.get('web') || null;
    }
    
    const upperType = profileType.toUpperCase();
    
    if (upperType.includes('I_PROFILE') || upperType.includes('H_PROFILE')) {
      return this.faces.get('web') || null;
    } else if (upperType.includes('PLATE')) {
      return this.faces.get('top') || null;
    } else if (upperType.includes('TUBE')) {
      return this.faces.get('top') || null;
    }
    
    return this.faces.get('web') || null;
  }
  
  /**
   * Obtient les faces disponibles pour un type de profil
   */
  getFacesForProfileType(profileType: string): string[] {
    return this.profileTypeFaces.get(profileType) || [];
  }
  
  /**
   * Obtient la définition d'une face par son ID
   */
  getFaceDefinition(faceId: string): FaceDefinition | undefined {
    return this.faces.get(faceId);
  }
  
  /**
   * Calcule la profondeur pour une face
   */
  calculateDepth(
    face: FaceDefinition,
    dimensions: { thickness?: number; flangeThickness?: number; webThickness?: number }
  ): number {
    if (typeof face.depth === 'number') {
      return face.depth;
    }
    
    if (face.depth === 'thickness') {
      // Déterminer quelle épaisseur utiliser selon la face
      if (face.id.includes('flange')) {
        return dimensions.flangeThickness || dimensions.thickness || 10;
      } else if (face.id === 'web') {
        return dimensions.webThickness || dimensions.thickness || 10;
      }
      return dimensions.thickness || 10;
    }
    
    // Auto : calculer selon le contexte
    return dimensions.thickness || 10;
  }
  
  /**
   * Active/désactive le mode debug
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}