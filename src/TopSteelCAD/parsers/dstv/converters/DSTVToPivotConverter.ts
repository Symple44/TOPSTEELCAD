/**
 * DSTVToPivotConverter - Convertisseur DSTV vers format Pivot
 * Transforme les profils DSTV en scène Pivot
 */

import { DSTVProfile } from '../types';
import { MaterialType } from '../../../../types/viewer';
import { PivotScene, PivotElement, MetalDimensions, MaterialProperties } from '../../../../types/viewer';
import { createModuleLogger } from '../../../utils/logger';

const log = createModuleLogger('DSTVToPivotConverter');

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
    
    console.log('🏭 Converting DSTV Profile:', {
      profileType: profile.profileType,
      designation: profile.designation,
      width: profile.width,
      height: profile.height,
      thickness: profile.thickness,
      webThickness: profile.webThickness,
      flangeThickness: profile.flangeThickness
    });

    // Récupérer les dimensions directement depuis le profil
    let dimensions: MetalDimensions;
    
    // Gestion spéciale pour les tubes rectangulaires
    if (profile.profileType === 'TUBE_RECT') {
      dimensions = {
        length: profile.length || 1000,
        width: profile.width || 100,  // Largeur du tube
        height: profile.height || 50,  // Hauteur du tube
        thickness: profile.webThickness || 5,  // Épaisseur des parois
        webThickness: profile.webThickness || 5,
        flangeThickness: profile.flangeThickness || profile.webThickness || 5
      };
      console.log('🔧 TUBE_RECT final dimensions:', {
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        wallThickness: dimensions.thickness
      });
    } else if (profile.profileType === 'TUBE_ROUND' || profile.profileType === 'CHS') {
      dimensions = {
        length: profile.length || 1000,
        width: profile.width || 100,
        height: profile.height || profile.width || 100,
        thickness: profile.webThickness || profile.thickness || 5,
        webThickness: profile.webThickness,
        flangeThickness: profile.flangeThickness,
        diameter: profile.width || profile.height
      };
    } else {
      // Autres profils
      dimensions = {
        length: profile.length || 1000,
        width: profile.width || 100,
        thickness: profile.webThickness || profile.thickness || 10,
        height: profile.height,
        webThickness: profile.webThickness,
        flangeThickness: profile.flangeThickness
      };
    }
    
    // Log spécifique pour les tubes pour debug
    if (profile.profileType === 'TUBE_RECT' || profile.profileType === 'TUBE_ROUND') {
      console.log('📦 TUBE dimensions après conversion:', {
        type: profile.profileType,
        width: dimensions.width,
        height: dimensions.height,
        thickness: dimensions.thickness,
        webThickness: dimensions.webThickness,
        diameter: dimensions.diameter || 'N/A',
        length: dimensions.length
      });
    }
    
    const material: MaterialProperties = {
      grade: profile.steelGrade || (profile as unknown).steelGrade || 'S235',
      density: 7850,
      color: '#4b5563',
      opacity: 1,
      metallic: 0.7,
      roughness: 0.3,
      reflectivity: 0.5
    };

    const materialType = this.mapProfileType(profile.profileType, profile.designation);
    console.log('🎯 Mapped profile type:', profile.profileType, '->', materialType);
    
    const element: PivotElement = {
      id: (profile as unknown).id || `profile-${index}-${Date.now()}`,
      name: profile.designation || 'Unknown',
      description: `${profile.designation} - ${profile.profileType}`,
      materialType,
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
          // Pour les trous sur l'âme (face TOP), ajuster les coordonnées
          // Dans DSTV, pour face 'o' (TOP/web), Y est la position verticale sur la hauteur
          const position = [hole.x, hole.y, 0];
          
          // Si c'est un trou sur l'âme/web (face TOP), les coordonnées Y représentent
          // la position verticale sur la hauteur du profilé, pas la largeur
          // Pas besoin de transformation supplémentaire, le HoleProcessor gère cela
          
          // Debug: log face value
          const mappedFace = this.mapFace(hole.face);
          console.log('🔍 HOLE MAPPING:', {
            originalFace: hole.face,
            mappedFace: mappedFace,
            position: [hole.x, hole.y],
            diameter: hole.diameter
          });
          log.debug('Mapping hole face', {
            originalFace: hole.face,
            mappedFace: mappedFace,
            holeData: hole
          });
          
          const feature: any = {
            type: 'hole',
            position: position,
            diameter: hole.diameter,
            face: hole.face, // Garder la face DSTV originale ('v', 'u', 'o')
            holeType: hole.holeType || 'round',
            depth: hole.depth || -1
          };
          
          // Paramètres spécifiques pour trous oblongs
          if (hole.holeType === 'slotted' && (hole as unknown).slottedLength) {
            feature.slottedLength = (hole as unknown).slottedLength;
            feature.slottedAngle = (hole as unknown).slottedAngle || 0;
          }
          
          // Paramètres pour trous rectangulaires
          if ((hole.holeType === 'rectangular' || hole.holeType === 'square') && (hole as unknown).width) {
            feature.width = (hole as unknown).width;
            feature.height = (hole as unknown).height || (hole as unknown).width;
          }
          
          (element.metadata as unknown).features.push(feature);
        }
      });
    }

    // Convert cuts avec analyse de contour
    if (profile.cuts && profile.cuts.length > 0 && element.metadata) {
      console.log(`🔧 Converting ${profile.cuts.length} cuts to features`);
      profile.cuts.forEach((cut, idx) => {
        if (cut.contour && cut.contour.length >= 3) {
          const mappedFace = this.mapFace(cut.face);
          console.log(`  Cut ${idx + 1}: face ${cut.face} -> ${mappedFace}, ${cut.contour.length} points, transverse=${cut.isTransverse}`);
          
          // Debug les points du contour
          if (cut.face === 'v' || cut.face === 'u') {
            const bounds = this.getContourBounds(cut.contour);
            console.log(`    ${cut.face === 'v' ? 'Top' : 'Bottom'} cut: X(${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}), Y(${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)})`);
          }
          
          const feature: any = {
            type: this.determineCutType(cut),
            face: mappedFace,
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
          
          (element.metadata as unknown).features.push(feature);
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
          if ((marking as unknown).depth) feature.depth = (marking as unknown).depth;
          if ((marking as unknown).fontStyle) feature.fontStyle = (marking as unknown).fontStyle;
          if ((marking as unknown).alignment) feature.alignment = (marking as unknown).alignment;
          if ((marking as unknown).face) feature.face = this.mapFace((marking as unknown).face);
          
          (element.metadata as unknown).features.push(feature);
        }
      });
    }
    
    // Ajouter les métadonnées supplémentaires du profil
    if (element.metadata && profile) {
      // Données géométriques
      if ((profile as unknown).webThickness) element.metadata.webThickness = (profile as unknown).webThickness;
      if ((profile as unknown).flangeThickness) element.metadata.flangeThickness = (profile as unknown).flangeThickness;
      if ((profile as unknown).radius) element.metadata.radius = (profile as unknown).radius;
      
      // Données de fabrication
      if ((profile as unknown).orderNumber) element.metadata.orderNumber = (profile as unknown).orderNumber;
      if ((profile as unknown).quantity) element.metadata.quantity = (profile as unknown).quantity;
      if ((profile as unknown).phase) element.metadata.phase = (profile as unknown).phase;
      
      // Données physiques
      if ((profile as unknown).weight) element.metadata.weight = (profile as unknown).weight;
      if ((profile as unknown).paintingSurface) element.metadata.paintingSurface = (profile as unknown).paintingSurface;
      if ((profile as unknown).volume) element.metadata.volume = (profile as unknown).volume;
      
      // Nuance d'acier
      if ((profile as unknown).steelGrade) element.material.grade = (profile as unknown).steelGrade;
    }

    return element;
  }

  /**
   * Map profile type string to MaterialType enum
   * Détection complète de 25+ types de profils
   */
  private mapProfileType(profileType?: string, designation?: string): MaterialType {
    console.log('🔍 mapProfileType called with:', { profileType, designation });
    
    // Si on a une désignation, l'utiliser en priorité
    if (designation) {
      const result = this.detectMaterialTypeFromDesignation(designation);
      console.log('🎯 detectMaterialTypeFromDesignation result:', result);
      return result;
    }
    
    if (!profileType) return MaterialType.PLATE;

    const typeMap: { [key: string]: MaterialType } = {
      'I_PROFILE': MaterialType.BEAM,
      'U_PROFILE': MaterialType.CHANNEL,
      'L_PROFILE': MaterialType.ANGLE,
      'TUBE': MaterialType.TUBE,
      'TUBE_RECT': MaterialType.TUBE,  // Tube rectangulaire
      'TUBE_ROUND': MaterialType.TUBE, // Tube circulaire
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

    const mappedType = typeMap[profileType] || MaterialType.PLATE;
    
    // Log spécifique pour débugger le mapping
    console.log(`🔍 Profile type mapping: "${profileType}" -> "${mappedType}"`);
    console.log(`   MaterialType.ANGLE = "${MaterialType.ANGLE}"`);
    console.log(`   typeMap['L_PROFILE'] = "${typeMap['L_PROFILE']}"`);
    
    return mappedType;
  }
  
  /**
   * Détecte le type de matériau basé sur la désignation
   * Support complet des normes EU, UK, US
   */
  private detectMaterialTypeFromDesignation(designation: string): MaterialType {
    const upper = designation.toUpperCase();
    console.log('🔎 detectMaterialTypeFromDesignation checking:', upper);
    
    // ====== PROFILS EN I/H (POUTRELLES) ======
    // Normes européennes
    if (upper.match(/^(IPE|IPN|HE[ABML]|HD|HP|HL)/)) {
      return MaterialType.BEAM;
    }
    // Normes britanniques
    if (upper.match(/^(UB|UC|UBP|RSJ)/) || upper.match(/^UB\d+x\d+x\d+/)) {
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
    // RSA = Rolled Steel Angle, L = angle profile
    if (upper.match(/^(L\s*\d+|RSA)/) || upper.includes('ANGLE')) {
      return MaterialType.ANGLE;
    }
    
    // ====== TUBES ======
    // Tubes rectangulaires
    if (upper.match(/^(RHS|ROR)/) || upper.startsWith('TUBE RECT')) {
      return MaterialType.TUBE;
    }
    // Tubes carrés
    if (upper.match(/^(SHS|QRO)/)) {
      return MaterialType.TUBE;
    }
    // Tubes ronds
    if (upper.match(/^(CHS|PIPE)/) || upper.startsWith('TUBE CIRC')) {
      return MaterialType.TUBE;
    }
    // Tubes génériques (incluant "TUBE" ou "TUB")
    if (upper.match(/^TUB/)) {
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
    log.trace('mapFace called', { face, faceType: typeof face });
    
    // Si c'est déjà une string, on vérifie les codes DSTV ou les noms
    if (typeof face === 'string') {
      const faceLower = face.toLowerCase();
      
      // Mapping des codes DSTV vers les faces Three.js
      // o = âme (web)
      // v = aile supérieure (top flange)  
      // u = aile inférieure (bottom flange)
      switch(faceLower) {
        case 'o':
        case 'web':
          log.debug('Mapping to web', { original: face });
          return 'web';
        case 'v':
        case 'top_flange':
          log.debug('Mapping to top_flange', { original: face });
          return 'v';  // Garder 'v' pour l'aile supérieure
        case 'top':  
          // 'top' pour profil I = généralement l'âme vue du dessus dans DSTV
          log.debug('Mapping TOP to web for I-profile', { original: face });
          return 'web';
        case 'u':
        case 'bottom':  // 'bottom' depuis ProfileFace.BOTTOM -> aile inférieure  
        case 'bottom_flange':
          log.debug('Mapping to bottom_flange', { original: face });
          return 'u';  // Garder 'u' pour l'aile inférieure
        case 'front':
          return 'front';
        case 'back':
          return 'back';
        case 'left':
          return 'left';
        case 'right':
          return 'right';
        case 'bottom':
          return 'bottom';
        default:
          log.warn('Unknown face, defaulting to front', { face });
          return 'front';
      }
    }
    
    // Si c'est une valeur d'enum ProfileFace (string values)
    // ProfileFace.TOP = 'top' -> doit être mappé à 'web' pour les profils I
    const faceMap: { [key: string]: string } = {
      'front': 'front',
      'back': 'back',
      'top': 'web',     // Dans DSTV, TOP = âme/web pour les profils I
      'bottom': 'bottom',
      'left': 'left',
      'right': 'right'
    };

    const mapped = faceMap[face] || faceMap[String(face).toLowerCase()];
    log.trace('Face mapped', { original: face, mapped });
    return mapped || 'front';
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
   * Obtient les limites d'un contour
   */
  private getContourBounds(points: Array<[number, number]>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    return { minX, maxX, minY, maxY };
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

// Export par défaut pour compatibilité ES modules
export default DSTVToPivotConverter;