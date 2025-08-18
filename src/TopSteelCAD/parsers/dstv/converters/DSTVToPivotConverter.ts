/**
 * DSTVToPivotConverter - Convertisseur DSTV vers format Pivot
 * Transforme les profils DSTV en scène Pivot
 */

import { DSTVProfile } from '../types';
import { MaterialType } from '@/types/viewer';
import { PivotScene, PivotElement, MetalDimensions, MaterialProperties } from '@/types/viewer';

/**
 * Convertisseur DSTV vers format Pivot
 */
export class DSTVToPivotConverter {
  
  /**
   * Convertit des profils DSTV en scène Pivot
   */
  convertProfiles(profiles: DSTVProfile[]): PivotScene {
    const elements = new Map<string, PivotElement>();
    const rootElementIds: string[] = [];
    
    const scene: PivotScene = {
      id: `dstv-scene-${Date.now()}`,
      name: 'DSTV Import',
      description: 'Imported from DSTV/NC file',
      elements,
      rootElementIds,
      bounds: { min: [0, 0, 0], max: [0, 0, 0] },
      metadata: {
        version: '2.0',
        generator: 'DSTV-to-Pivot Converter',
        created: new Date().toISOString(),
        profileCount: 0
      }
    };

    if (!profiles || !Array.isArray(profiles)) {
      return scene;
    }

    // Filter out invalid profiles
    const validProfiles = profiles.filter(p => p && p.designation);
    if (scene.metadata) {
      scene.metadata.profileCount = validProfiles.length;
    }

    // Convert each profile
    validProfiles.forEach((profile, index) => {
      const element = this.convertProfile(profile, index);
      if (element) {
        elements.set(element.id, element);
        rootElementIds.push(element.id);
      }
    });
    
    // Calculate bounds
    scene.bounds = this.calculateBounds(Array.from(elements.values()));

    return scene;
  }

  /**
   * Convertit un profil DSTV en élément Pivot
   */
  private convertProfile(profile: DSTVProfile, index: number): PivotElement | null {
    if (!profile) return null;

    const dimensions: MetalDimensions = {
      length: profile.length || 1000,
      width: (profile as any).width || 100,
      thickness: (profile as any).thickness || 10,
      height: (profile as any).height
    };
    
    const material: MaterialProperties = {
      grade: (profile as any).steelGrade || 'S235',
      density: 7850,
      color: '#4b5563',
      opacity: 1,
      metallic: 0.7,
      roughness: 0.3,
      reflectivity: 0.5
    };

    const element: PivotElement = {
      id: (profile as any).id || `profile-${index}-${Date.now()}`,
      name: profile.designation || 'Unknown',
      description: `${profile.designation} - ${profile.profileType}`,
      materialType: this.mapProfileType(profile.profileType, profile.designation),
      dimensions,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      material,
      metadata: {
        profile: profile.designation,
        profileType: profile.profileType,
        features: []
      },
      visible: true,
      createdAt: new Date()
    };

    // Convert holes avec paramètres complets
    if (profile.holes && profile.holes.length > 0 && element.metadata) {
      profile.holes.forEach(hole => {
        if (this.isValidHole(hole)) {
          const feature: any = {
            type: 'hole',
            position: [hole.x, hole.y, 0],
            diameter: hole.diameter,
            face: this.mapFace(hole.face),
            holeType: hole.holeType || 'round',
            depth: hole.depth || -1
          };
          
          // Paramètres spécifiques pour trous oblongs
          if (hole.holeType === 'slotted' && (hole as any).slottedLength) {
            feature.slottedLength = (hole as any).slottedLength;
            feature.slottedAngle = (hole as any).slottedAngle || 0;
          }
          
          // Paramètres pour trous rectangulaires
          if ((hole.holeType === 'rectangular' || hole.holeType === 'square') && (hole as any).width) {
            feature.width = (hole as any).width;
            feature.height = (hole as any).height || (hole as any).width;
          }
          
          (element.metadata as any).features.push(feature);
        }
      });
    }

    // Convert cuts avec analyse de contour
    if (profile.cuts && profile.cuts.length > 0 && element.metadata) {
      profile.cuts.forEach(cut => {
        if (cut.contour && cut.contour.length >= 3) {
          const feature: any = {
            type: this.determineCutType(cut),
            face: this.mapFace(cut.face),
            contourPoints: cut.contour,
            isTransverse: cut.isTransverse || false,
            depth: cut.depth || -1
          };
          
          // Ajouter les propriétés spécifiques
          if (cut.isInternal) feature.isInternal = true;
          if (cut.angle) feature.angle = cut.angle;
          if (cut.cutType) feature.cutType = cut.cutType;
          
          // Analyser le contour pour détecter les caractéristiques
          const analysis = this.analyzeContour(cut.contour);
          feature.contourType = analysis.type;
          feature.area = analysis.area;
          feature.perimeter = analysis.perimeter;
          
          (element.metadata as any).features.push(feature);
        }
      });
    }

    // Convert markings avec paramètres enrichis
    if (profile.markings && profile.markings.length > 0 && element.metadata) {
      profile.markings.forEach(marking => {
        if (marking.text) {
          const feature: any = {
            type: 'marking',
            text: marking.text,
            position: [marking.x, marking.y, 0],
            size: marking.size || 10,
            angle: marking.angle || 0
          };
          
          // Paramètres additionnels
          if ((marking as any).depth) feature.depth = (marking as any).depth;
          if ((marking as any).fontStyle) feature.fontStyle = (marking as any).fontStyle;
          if ((marking as any).alignment) feature.alignment = (marking as any).alignment;
          if ((marking as any).face) feature.face = this.mapFace((marking as any).face);
          
          (element.metadata as any).features.push(feature);
        }
      });
    }
    
    // Ajouter les métadonnées supplémentaires du profil
    if (element.metadata && profile) {
      // Données géométriques
      if ((profile as any).webThickness) element.metadata.webThickness = (profile as any).webThickness;
      if ((profile as any).flangeThickness) element.metadata.flangeThickness = (profile as any).flangeThickness;
      if ((profile as any).radius) element.metadata.radius = (profile as any).radius;
      
      // Données de fabrication
      if ((profile as any).orderNumber) element.metadata.orderNumber = (profile as any).orderNumber;
      if ((profile as any).quantity) element.metadata.quantity = (profile as any).quantity;
      if ((profile as any).phase) element.metadata.phase = (profile as any).phase;
      
      // Données physiques
      if ((profile as any).weight) element.metadata.weight = (profile as any).weight;
      if ((profile as any).paintingSurface) element.metadata.paintingSurface = (profile as any).paintingSurface;
      if ((profile as any).volume) element.metadata.volume = (profile as any).volume;
      
      // Nuance d'acier
      if ((profile as any).steelGrade) element.material.grade = (profile as any).steelGrade;
    }

    return element;
  }

  /**
   * Map profile type string to MaterialType enum
   * Détection complète de 25+ types de profils
   */
  private mapProfileType(profileType?: string, designation?: string): MaterialType {
    // Si on a une désignation, l'utiliser en priorité
    if (designation) {
      return this.detectMaterialTypeFromDesignation(designation);
    }
    
    if (!profileType) return MaterialType.PLATE;

    const typeMap: { [key: string]: MaterialType } = {
      'I_PROFILE': MaterialType.BEAM,
      'U_PROFILE': MaterialType.CHANNEL,
      'L_PROFILE': MaterialType.ANGLE,
      'TUBE': MaterialType.TUBE,
      'ROUND_BAR': MaterialType.TUBE,
      'FLAT_BAR': MaterialType.PLATE,
      'PLATE': MaterialType.PLATE,
      'T_PROFILE': MaterialType.BEAM,
      'C_PROFILE': MaterialType.CHANNEL,
      'Z_PROFILE': MaterialType.CHANNEL,
      'H_PROFILE': MaterialType.BEAM,
      'RHS': MaterialType.TUBE,
      'CHS': MaterialType.TUBE,
      'SHS': MaterialType.TUBE
    };

    return typeMap[profileType] || MaterialType.PLATE;
  }
  
  /**
   * Détecte le type de matériau basé sur la désignation
   * Support complet des normes EU, UK, US
   */
  private detectMaterialTypeFromDesignation(designation: string): MaterialType {
    const upper = designation.toUpperCase();
    
    // ====== PROFILS EN I/H (POUTRELLES) ======
    // Normes européennes
    if (upper.match(/^(IPE|IPN|HE[ABML]|HD|HP|HL)/)) {
      return MaterialType.BEAM;
    }
    // Normes britanniques
    if (upper.match(/^(UB|UC|UBP|RSJ)/)) {
      return MaterialType.BEAM;
    }
    // Normes américaines
    if (upper.match(/^(W|S|HP|M)\d+/)) {
      return MaterialType.BEAM;
    }
    
    // ====== PROFILS EN U (CHANNELS) ======
    // Normes européennes
    if (upper.match(/^(UPN|UAP|UPE|C)/)) {
      return MaterialType.CHANNEL;
    }
    // Normes américaines
    if (upper.match(/^(C|MC)\d+/)) {
      return MaterialType.CHANNEL;
    }
    
    // ====== CORNIÈRES (ANGLES) ======
    if (upper.match(/^L\s*\d+/) || upper.includes('ANGLE')) {
      return MaterialType.ANGLE;
    }
    
    // ====== TUBES ======
    // Tubes rectangulaires
    if (upper.match(/^(RHS|ROR)/)) {
      return MaterialType.TUBE;
    }
    // Tubes carrés
    if (upper.match(/^(SHS|QRO)/)) {
      return MaterialType.TUBE;
    }
    // Tubes ronds
    if (upper.match(/^(CHS|TUB|PIPE)/)) {
      return MaterialType.TUBE;
    }
    
    // ====== PLATS ET PLAQUES ======
    if (upper.match(/^(FL|FLAT|PL|PLATE)/)) {
      return MaterialType.PLATE;
    }
    
    // ====== PROFILS EN T ======
    if (upper.match(/^(T|WT)\d+/)) {
      return MaterialType.BEAM;
    }
    
    // ====== PROFILS EN Z ======
    if (upper.match(/^Z\d+/)) {
      return MaterialType.CHANNEL;
    }
    
    // ====== RONDS ======
    if (upper.match(/^(RD|ROND|ROD|BAR)/)) {
      return MaterialType.TUBE;
    }
    
    // ====== PROFILS SPÉCIAUX ======
    // Profils formés à froid
    if (upper.includes('CF') || upper.includes('COLD')) {
      return MaterialType.CHANNEL;
    }
    
    // Par défaut pour les formes complexes ou non reconnues
    return MaterialType.PLATE;
  }

  /**
   * Map ProfileFace enum to string
   */
  private mapFace(face: any): string {
    if (typeof face === 'string') return face.toLowerCase();
    
    // Handle enum values
    const faceMap: { [key: string]: string } = {
      'front': 'front',
      'back': 'back',
      'top': 'top',
      'bottom': 'bottom',
      'left': 'left',
      'right': 'right'
    };

    return faceMap[face] || 'front';
  }

  /**
   * Validate hole data
   */
  private isValidHole(hole: any): boolean {
    return hole && 
           typeof hole.x === 'number' && !isNaN(hole.x) &&
           typeof hole.y === 'number' && !isNaN(hole.y) &&
           typeof hole.diameter === 'number' && hole.diameter > 0;
  }
  
  /**
   * Détermine le type de découpe
   */
  private determineCutType(cut: any): string {
    if (cut.cutType === 'chamfer') return 'chamfer';
    if (cut.isInternal) return 'cutout';
    if (cut.isTransverse) return 'notch';
    if (cut.contour && cut.contour.length > 8) return 'coping';
    return 'cut';
  }
  
  /**
   * Analyse un contour pour détecter ses caractéristiques
   */
  private analyzeContour(contour: Array<[number, number]>): {
    type: 'rectangular' | 'circular' | 'polygonal' | 'complex';
    area: number;
    perimeter: number;
  } {
    if (!contour || contour.length < 3) {
      return { type: 'complex', area: 0, perimeter: 0 };
    }
    
    // Déterminer le type
    let type: 'rectangular' | 'circular' | 'polygonal' | 'complex' = 'complex';
    if (contour.length === 5 && this.isRectangular(contour)) {
      type = 'rectangular';
    } else if (contour.length > 12 && this.isCircular(contour)) {
      type = 'circular';
    } else if (contour.length <= 8) {
      type = 'polygonal';
    }
    
    // Calculer l'aire (shoelace formula)
    let area = 0;
    for (let i = 0; i < contour.length - 1; i++) {
      area += contour[i][0] * contour[i + 1][1] - contour[i + 1][0] * contour[i][1];
    }
    area = Math.abs(area / 2);
    
    // Calculer le périmètre
    let perimeter = 0;
    for (let i = 0; i < contour.length - 1; i++) {
      const dx = contour[i + 1][0] - contour[i][0];
      const dy = contour[i + 1][1] - contour[i][1];
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return { type, area, perimeter };
  }
  
  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(contour: Array<[number, number]>): boolean {
    if (contour.length !== 5) return false;
    
    // Vérifier que les côtés sont parallèles aux axes
    for (let i = 0; i < contour.length - 1; i++) {
      const dx = Math.abs(contour[i + 1][0] - contour[i][0]);
      const dy = Math.abs(contour[i + 1][1] - contour[i][1]);
      
      // Chaque segment doit être horizontal ou vertical
      if (dx > 0.01 && dy > 0.01) return false;
    }
    
    return true;
  }
  
  /**
   * Vérifie si un contour est circulaire
   */
  private isCircular(contour: Array<[number, number]>): boolean {
    if (contour.length < 12) return false;
    
    // Calculer le centre
    let cx = 0, cy = 0;
    for (const point of contour) {
      cx += point[0];
      cy += point[1];
    }
    cx /= contour.length;
    cy /= contour.length;
    
    // Vérifier que tous les points sont à distance similaire du centre
    const distances = contour.map(p => 
      Math.sqrt(Math.pow(p[0] - cx, 2) + Math.pow(p[1] - cy, 2))
    );
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgDistance)));
    
    return maxDeviation < avgDistance * 0.1; // Tolérance de 10%
  }
  
  /**
   * Calculate bounds for the scene
   */
  private calculateBounds(elements: PivotElement[]): { min: [number, number, number]; max: [number, number, number] } {
    if (elements.length === 0) {
      return { min: [0, 0, 0], max: [0, 0, 0] };
    }
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    elements.forEach(element => {
      const { length, width, height } = element.dimensions;
      minX = Math.min(minX, -length / 2);
      minY = Math.min(minY, -width / 2);
      minZ = Math.min(minZ, -(height || 0) / 2);
      maxX = Math.max(maxX, length / 2);
      maxY = Math.max(maxY, width / 2);
      maxZ = Math.max(maxZ, (height || 0) / 2);
    });
    
    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    };
  }
}