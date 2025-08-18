/**
 * DSTV Parser - Parseur pour le format DSTV/NC (Norme allemande pour structures métalliques)
 * 
 * Le format DSTV est un standard industriel pour l'échange de données de structures métalliques
 * incluant les profils, trous, découpes, soudures, etc.
 * 
 * Architecture modulaire avec Lexer + Parser pour une meilleure évolutivité
 */

import { 
  PivotElement, 
  MaterialType, 
  MetalDimensions,
  MaterialProperties,
  FileParser,
  PivotScene,
  DSTVConfig
} from '@/types/viewer';

/**
 * Types de tokens DSTV
 */
enum DSTVTokenType {
  // Commandes principales
  ST = 'ST', // Start
  EN = 'EN', // End
  
  // Profils et géométrie
  AK = 'AK', // Aussenkontur (contour externe)
  IK = 'IK', // Innenkontur (contour interne)
  PL = 'PL', // Plate
  
  // Usinages
  BO = 'BO', // Bohren (perçage/hole)
  SI = 'SI', // Signieren (marquage/marking)
  SC = 'SC', // Schneiden (coupe/cut)
  BR = 'BR', // Brechen (chanfrein/bevel)
  
  // Autres
  KO = 'KO', // Kommentar (commentaire)
  PU = 'PU', // Program unit
  
  // Données
  DATA = 'DATA', // Ligne de données
  EMPTY = 'EMPTY', // Ligne vide
  UNKNOWN = 'UNKNOWN' // Non reconnu
}

/**
 * Structure d'un token DSTV
 */
interface DSTVToken {
  type: DSTVTokenType;
  line: number;
  raw: string;
  command?: string;
  parameters?: string[];
  face?: 'v' | 'u' | 'o';
  values?: number[];
  // Pour les trous oblongs
  holeType?: 'round' | 'slotted' | 'square' | 'rectangular';
  slottedLength?: number;
  slottedAngle?: number;
}

/**
 * Point DSTV avec face optionnelle
 */
interface DSTVPoint {
  x: number;
  y: number;
  z?: number;
  face?: 'v' | 'u' | 'o'; // v=visible/top, u=bottom, o=side
}

/**
 * Structure d'un trou DSTV
 */
interface DSTVHole {
  position: DSTVPoint;
  diameter: number;
  depth: number;
  type: 'round' | 'slotted' | 'square' | 'rectangular';
  // Pour les trous oblongs (slotted)
  slottedLength?: number;  // Longueur d'élongation
  slottedAngle?: number;   // Angle d'orientation en degrés
  // Pour les trous rectangulaires
  width?: number;
  height?: number;
}

/**
 * Structure d'un marquage DSTV
 */
interface DSTVMarking {
  position: DSTVPoint;
  text: string;
  size: number;
  angle?: number;
}

/**
 * Structure d'un contour DSTV
 */
interface DSTVContour {
  points: DSTVPoint[];
  closed: boolean;
}

/**
 * Structure d'un profil DSTV complet
 */
interface DSTVProfile {
  // Informations de base
  id: string;
  orderNumber: string;
  designation: string;
  steelGrade: string;
  
  // Dimensions
  length: number;
  width: number;
  height: number;
  thickness: number;
  webThickness?: number;
  flangeThickness?: number;
  
  // Poids et surface
  weight: number;
  paintingSurface: number;
  
  // Contours (pour formes complexes) - plusieurs contours possibles sur différentes faces
  contours: DSTVContour[];
  
  // Features
  holes: DSTVHole[];
  markings: DSTVMarking[];
  slots: any[];
  cuts: any[];
}

/**
 * Lexer DSTV - Analyse lexicale
 */
class DSTVLexer {
  private lines: string[] = [];
  private currentLine: number = 0;
  private tokens: DSTVToken[] = [];
  private currentContext: string = ''; // Pour suivre le contexte actuel (BO, AK, SI, etc.)
  
  /**
   * Analyse le contenu d'un fichier DSTV
   */
  tokenize(content: string): DSTVToken[] {
    this.lines = content.split(/\r?\n/);
    this.tokens = [];
    this.currentLine = 0;
    
    while (this.currentLine < this.lines.length) {
      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
      this.currentLine++;
    }
    
    return this.tokens;
  }
  
  /**
   * Obtient le prochain token
   */
  private nextToken(): DSTVToken | null {
    const line = this.lines[this.currentLine];
    const trimmed = line.trim();
    
    // Ligne vide
    if (trimmed.length === 0) {
      return {
        type: DSTVTokenType.EMPTY,
        line: this.currentLine + 1,
        raw: line
      };
    }
    
    // Vérifier les commandes DSTV (2 premiers caractères)
    const potentialCommand = trimmed.substring(0, 2).toUpperCase();
    
    // Si c'est une commande reconnue seule sur sa ligne
    if (this.isCommand(potentialCommand) && trimmed.length === 2) {
      this.currentContext = potentialCommand; // Mettre à jour le contexte
      return {
        type: potentialCommand as DSTVTokenType,
        line: this.currentLine + 1,
        raw: line,
        command: potentialCommand
      };
    }
    
    // Ligne de données avec face et valeurs (format: v/u/o x y z ...)
    if (this.isFaceData(trimmed)) {
      return this.parseFaceData(trimmed);
    }
    
    // Ligne de données simple
    return {
      type: DSTVTokenType.DATA,
      line: this.currentLine + 1,
      raw: line,
      parameters: [trimmed]
    };
  }
  
  /**
   * Vérifie si une chaîne est une commande DSTV valide
   */
  private isCommand(str: string): boolean {
    return Object.values(DSTVTokenType).includes(str as DSTVTokenType);
  }
  
  /**
   * Vérifie si une ligne contient des données avec face
   */
  private isFaceData(line: string): boolean {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const firstPart = parts[0];
      // Vérifier si ça commence par v, u ou o suivi de nombres
      // Accepter aussi le format avec 'u' collé au nombre (ex: v  4703.00u)
      return /^[vuo]\s+[\d.-]+/.test(line) || /^[vuo][\d.-]+/.test(firstPart) || /^[vuo]\s+[\d.-]+[vuo]/.test(line);
    }
    return false;
  }
  
  /**
   * Parse une ligne de données avec face
   */
  private parseFaceData(line: string): DSTVToken {
    const parts = line.split(/\s+/);
    let face = parts[0].charAt(0) as 'v' | 'u' | 'o';
    
    // Extraire les valeurs numériques et les modificateurs
    const values: number[] = [];
    let holeType: 'round' | 'slotted' = 'round'; // Par défaut trou rond
    let slottedLength = 0;
    let slottedAngle = 0;
    let foundSlotted = false;
    
    // Détecter le format spécial "v  4703.00u" où la face secondaire est collée au nombre
    let hasSecondaryFace = false;
    let secondaryFace: 'v' | 'u' | 'o' | null = null;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Enlever le préfixe de face si présent
      let cleanPart = i === 0 ? part.substring(1) : part;
      
      // Vérifier si le nombre a une face collée à la fin (ex: "4703.00u")
      if (cleanPart.match(/^[\d.-]+[vuo]$/)) {
        const lastChar = cleanPart.slice(-1);
        secondaryFace = lastChar as 'v' | 'u' | 'o';
        cleanPart = cleanPart.slice(0, -1); // Enlever le dernier caractère
        hasSecondaryFace = true;
        
        // Pour les trous (BO), la notation "v...u" signifie souvent un trou dans l'âme
        // Mais pour les contours (AK), garder la face originale 'v'
        if (face === 'v' && secondaryFace === 'u' && this.currentContext === 'BO') {
          face = 'o'; // 'o' = âme (web) dans le système DSTV pour les trous
          console.log(`  🔧 Detected web hole notation: v...u -> face='o' (web)`);
        } else if (face === 'v' && secondaryFace === 'u' && this.currentContext === 'AK') {
          // Pour les contours AK, garder la face 'v' même avec le format v...u
          console.log(`  📍 Keeping face 'v' for AK contour despite u suffix`);
        }
      }
      
      // Vérifier si c'est un modificateur 'l' pour trou oblong
      if (cleanPart.includes('l')) {
        holeType = 'slotted';
        foundSlotted = true;
        // La valeur avant le 'l' est la profondeur
        const beforeL = cleanPart.substring(0, cleanPart.indexOf('l'));
        if (beforeL) {
          const num = parseFloat(beforeL);
          if (!isNaN(num)) {
            values.push(num);
          }
        }
        // Regarder la valeur suivante pour la longueur d'élongation
        if (i + 1 < parts.length) {
          slottedLength = parseFloat(parts[i + 1]) || 0;
          console.log(`  📏 Slotted hole detected: elongation=${slottedLength}mm`);
        }
      } else if (foundSlotted && i === parts.length - 1) {
        // Dernier paramètre après un 'l' = angle
        slottedAngle = parseFloat(cleanPart) || 0;
      } else {
        const num = parseFloat(cleanPart.replace(/[vuo]/g, ''));
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    }
    
    return {
      type: DSTVTokenType.DATA,
      line: this.currentLine + 1,
      raw: line,
      face,
      values,
      parameters: parts,
      holeType,
      slottedLength,
      slottedAngle
    };
  }
}

/**
 * Parseur DSTV/NC pour structures métalliques
 */
export class DSTVParser implements FileParser {
  // Extensions DSTV standards
  public readonly supportedExtensions = ['.nc', '.nc1', '.nc2', '.nc3', '.nc4', '.nc5', '.nc6', '.nc7', '.nc8', '.nc9'];
  
  private config: DSTVConfig = {
    unit: 'mm',
    coordinateSystem: 'right',
    defaultMaterial: {
      grade: 'S355',
      density: 7850,
      color: '#4b5563',
      opacity: 1,
      metallic: 0.7,
      roughness: 0.3,
      reflectivity: 0.5
    }
  };
  
  private lexer: DSTVLexer;
  private profiles: DSTVProfile[] = [];
  private currentProfile: DSTVProfile | null = null;
  
  constructor(config?: Partial<DSTVConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.lexer = new DSTVLexer();
  }
  
  /**
   * Parse un fichier DSTV
   */
  async parse(data: ArrayBuffer | string): Promise<PivotScene> {
    const content = typeof data === 'string' 
      ? data 
      : new TextDecoder('utf-8').decode(data);
    
    // Réinitialiser
    this.profiles = [];
    this.currentProfile = null;
    
    // 1. Analyse lexicale
    const tokens = this.lexer.tokenize(content);
    console.log(`📋 Tokenized ${tokens.length} tokens`);
    
    // 2. Analyse syntaxique
    this.parseTokens(tokens);
    console.log(`📦 Parsed ${this.profiles.length} profiles`);
    
    // 3. Conversion vers PivotScene
    return this.convertToPivotScene();
  }
  
  /**
   * Parse les tokens en document structuré
   */
  private parseTokens(tokens: DSTVToken[]): void {
    let i = 0;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      switch (token.type) {
        case DSTVTokenType.ST:
          // Début d'un nouveau profil
          i = this.parseSTBlock(tokens, i);
          break;
          
        case DSTVTokenType.BO:
          // Bloc de trous
          i = this.parseBOBlock(tokens, i);
          break;
          
        case DSTVTokenType.SI:
          // Bloc de marquage
          i = this.parseSIBlock(tokens, i);
          break;
          
        case DSTVTokenType.AK:
          // Bloc de contour
          i = this.parseAKBlock(tokens, i);
          break;
          
        default:
          i++;
      }
    }
    
    // Sauvegarder le dernier profil si nécessaire
    if (this.currentProfile) {
      this.profiles.push(this.currentProfile);
    }
  }
  
  /**
   * Parse un bloc ST (profil)
   */
  private parseSTBlock(tokens: DSTVToken[], startIndex: number): number {
    // Si on avait un profil en cours, le sauvegarder
    if (this.currentProfile) {
      this.profiles.push(this.currentProfile);
    }
    
    // Créer un nouveau profil
    this.currentProfile = {
      id: '',
      orderNumber: '',
      designation: '',
      steelGrade: '',
      length: 0,
      width: 0,
      height: 0,
      thickness: 0,
      weight: 0,
      paintingSurface: 0,
      contours: [],  // Tableau de contours
      holes: [],
      markings: [],
      slots: [],
      cuts: []
    };
    
    let i = startIndex + 1;
    let dataIndex = 0;
    
    // Parser les lignes de données du bloc ST
    while (i < tokens.length && tokens[i].type !== DSTVTokenType.EN) {
      const token = tokens[i];
      
      // Si on rencontre un nouveau bloc de commande, arrêter
      if ([DSTVTokenType.BO, DSTVTokenType.SI, DSTVTokenType.AK, DSTVTokenType.SC].includes(token.type)) {
        break;
      }
      
      if (token.type === DSTVTokenType.DATA && token.parameters) {
        const value = token.parameters[0].trim();
        
        switch (dataIndex) {
          case 1: // ID commande
            this.currentProfile.orderNumber = value;
            break;
          case 2: // ID pièce
            this.currentProfile.id = value;
            break;
          case 4: // Nuance acier
            this.currentProfile.steelGrade = value;
            break;
          case 6: // Désignation profil
            this.currentProfile.designation = value;
            break;
          case 8: // Longueur
            this.currentProfile.length = parseFloat(value) || 0;
            break;
          case 9: // Hauteur du profil
            this.currentProfile.height = parseFloat(value) || 0;
            break;
          case 10: // Largeur du profil
            this.currentProfile.width = parseFloat(value) || 0;
            break;
          case 12: // Épaisseur de l'âme (web thickness)
            this.currentProfile.webThickness = parseFloat(value) || 0;
            break;
          case 13: // Épaisseur de l'aile (flange thickness)
            this.currentProfile.flangeThickness = parseFloat(value) || 0;
            break;
          case 14: // Poids
            this.currentProfile.weight = parseFloat(value) || 0;
            break;
          case 15: // Surface peinture
            this.currentProfile.paintingSurface = parseFloat(value) || 0;
            break;
        }
        dataIndex++;
      }
      
      i++;
    }
    
    console.log(`📄 Parsed profile: ${this.currentProfile.designation} (${this.currentProfile.length}x${this.currentProfile.height}x${this.currentProfile.thickness})`);
    console.log(`    Profile has ${this.currentProfile.contours?.length || 0} contours`);
    
    return i;
  }
  
  /**
   * Parse un bloc BO (trous)
   */
  private parseBOBlock(tokens: DSTVToken[], startIndex: number): number {
    if (!this.currentProfile) return startIndex + 1;
    
    let i = startIndex + 1;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      // Arrêter si on rencontre un nouveau bloc
      if (token.type !== DSTVTokenType.DATA && token.type !== DSTVTokenType.EMPTY) {
        break;
      }
      
      if (token.face && token.values && token.values.length >= 3) {
        const hole: DSTVHole = {
          position: {
            x: token.values[0],
            y: token.values[1],
            z: 0,
            face: token.face
          },
          diameter: token.values[2],
          depth: token.values[3] || 0,
          type: token.holeType || 'round'
        };
        
        // Si c'est un trou oblong, ajouter les paramètres supplémentaires
        if (token.holeType === 'slotted') {
          hole.slottedLength = token.slottedLength || 0;
          hole.slottedAngle = token.slottedAngle || 0;
          console.log(`  🔧 Added slotted hole: Ø${hole.diameter}mm, length=${hole.slottedLength}mm, angle=${hole.slottedAngle}° at (${hole.position.x}, ${hole.position.y})`);
        } else {
          console.log(`  🔩 Added round hole: Ø${hole.diameter}mm at (${hole.position.x}, ${hole.position.y})`);
        }
        
        this.currentProfile.holes.push(hole);
      }
      
      i++;
    }
    
    return i;
  }
  
  /**
   * Parse un bloc SI (marquage)
   */
  private parseSIBlock(tokens: DSTVToken[], startIndex: number): number {
    if (!this.currentProfile) return startIndex + 1;
    
    let i = startIndex + 1;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token.type !== DSTVTokenType.DATA && token.type !== DSTVTokenType.EMPTY) {
        break;
      }
      
      if (token.face && token.raw) {
        // Extraire le texte du marquage
        const match = token.raw.match(/(\d+)r(\d+)/);
        let text = '';
        let size = 10;
        
        if (match) {
          size = parseFloat(match[1]);
          text = match[2];
        }
        
        const marking: DSTVMarking = {
          position: {
            x: token.values?.[0] || 0,
            y: token.values?.[1] || 0,
            z: 0,
            face: token.face
          },
          text,
          size
        };
        
        this.currentProfile.markings.push(marking);
        console.log(`  📝 Added marking: "${text}" at (${marking.position.x}, ${marking.position.y})`);
      }
      
      i++;
    }
    
    return i;
  }
  
  /**
   * Parse un bloc AK (contour)
   */
  private parseAKBlock(tokens: DSTVToken[], startIndex: number): number {
    console.log(`  🔺 parseAKBlock called at index ${startIndex}`);
    if (!this.currentProfile) {
      console.log(`    ⚠️ No current profile, skipping`);
      return startIndex + 1;
    }
    
    const points: DSTVPoint[] = [];
    let i = startIndex + 1;
    let contourFace: 'v' | 'u' | 'o' | null = null;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      // Arrêter si on rencontre un nouveau bloc ou EN
      if (token.type !== DSTVTokenType.DATA && token.type !== DSTVTokenType.EMPTY) {
        break;
      }
      
      if (token.face && token.values && token.values.length >= 2) {
        // Capturer la face du premier point du contour
        if (contourFace === null) {
          contourFace = token.face;
        }
        
        points.push({
          x: token.values[0],
          y: token.values[1],
          z: token.values[2] || 0,
          face: token.face
        });
      }
      
      i++;
    }
    
    if (points.length >= 3) {
      // Vérifier si le contour est fermé
      const first = points[0];
      const last = points[points.length - 1];
      const closed = Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01;
      
      // Ajouter le contour au tableau de contours
      this.currentProfile.contours.push({
        points,
        closed
      });
      
      const faceLabel = contourFace === 'v' ? 'top' : contourFace === 'u' ? 'bottom' : 'web';
      console.log(`  🔺 Added ${faceLabel} contour with ${points.length} points (${closed ? 'closed' : 'open'})`);
    }
    
    return i;
  }
  
  /**
   * Convertit les profils DSTV en PivotScene
   */
  private convertToPivotScene(): PivotScene {
    const elements: PivotElement[] = [];
    
    this.profiles.forEach((profile, index) => {
      const element = this.convertProfileToElement(profile, index);
      if (element) {
        elements.push(element);
      }
    });
    
    return {
      id: `dstv-scene-${Date.now()}`,
      name: 'DSTV Import',
      description: 'Imported from DSTV/NC file',
      elements: new Map(elements.map(e => [e.id, e])),
      rootElementIds: elements.map(e => e.id),
      bounds: this.calculateBounds(elements),
      metadata: {
        format: 'DSTV',
        version: '2.0',
        importDate: new Date().toISOString(),
        elementCount: elements.length
      }
    };
  }
  
  /**
   * Convertit un profil DSTV en PivotElement
   */
  private convertProfileToElement(profile: DSTVProfile, index: number): PivotElement {
    console.log(`
🏭 Converting profile ${index}: ${profile.designation}`);
    console.log(`  - Holes: ${profile.holes.length}`);
    console.log(`  - Markings: ${profile.markings.length}`);
    console.log(`  - Contours: ${profile.contours?.length || 0}`);
    
    const materialType = this.detectMaterialType(profile.designation);
    
    // Dimensions adaptées selon le type
    let dimensions: MetalDimensions;
    if (materialType === MaterialType.PLATE) {
      dimensions = {
        length: profile.length,
        width: profile.height, // Dans DSTV, height est la largeur pour les plaques
        height: 0,
        thickness: profile.thickness || 10
      };
    } else {
      dimensions = {
        length: profile.length,
        width: profile.width,
        height: profile.height,
        thickness: profile.thickness,
        webThickness: profile.webThickness,
        flangeThickness: profile.flangeThickness
      };
    }
    
    // Convertir les features
    const features: any[] = [];
    console.log(`  🎯 Starting feature conversion for profile ${profile.designation}`);
    
    // Ajouter les trous
    profile.holes.forEach(hole => {
      const holeFeature: any = {
        type: 'hole',
        face: hole.position.face,
        position: [hole.position.x, hole.position.y, hole.position.z || 0],
        diameter: hole.diameter,
        depth: hole.depth,
        holeType: hole.type
      };
      
      // Ajouter les paramètres spécifiques pour les trous oblongs
      if (hole.type === 'slotted') {
        holeFeature.slottedLength = hole.slottedLength;
        holeFeature.slottedAngle = hole.slottedAngle;
      } else if (hole.type === 'rectangular') {
        holeFeature.width = hole.width;
        holeFeature.height = hole.height;
      }
      
      features.push(holeFeature);
    });
    
    // Ajouter les marquages
    profile.markings.forEach(marking => {
      features.push({
        type: 'marking',
        face: marking.position.face,
        position: [marking.position.x, marking.position.y, marking.position.z || 0],
        size: marking.size,
        metadata: {
          markingText: marking.text
        }
      });
    });
    
    // Ajouter les découpes (contours AK)
    // Les contours peuvent définir soit la forme de base, soit des découpes
    console.log(`  📊 Profile has ${profile.contours?.length || 0} contours`);
    
    // Détecter d'abord une découpe transversale basée sur la différence de longueur
    if (profile.contours && profile.contours.length > 0) {
      // Trouver la longueur maximale des contours
      let maxContourLength = 0;
      profile.contours.forEach(contour => {
        const xValues = contour.points.map(p => p.x);
        const contourLength = Math.max(...xValues);
        if (contourLength > maxContourLength) {
          maxContourLength = contourLength;
        }
      });
      
      console.log(`  📉 Profile length: ${profile.length}mm, Max contour length: ${maxContourLength}mm`);
      console.log(`  📐 Difference: ${profile.length - maxContourLength}mm`);
      
      // Si la longueur du profil est supérieure à la longueur max des contours
      // Cela indique une découpe transversale
      if (profile.length > maxContourLength + 10) {  // Tolérance de 10mm
        const cutLength = profile.length - maxContourLength;
        console.log(`  ✂️ Detected transverse cut: ${cutLength}mm removed from end`);
        
        // Créer une découpe transversale qui enlève la fin du profil
        // Cette découpe traverse tout le profil (hauteur et largeur complètes)
        const transverseCut: Array<[number, number]> = [
          [maxContourLength, 0],           // Bas gauche de la coupe
          [profile.length, 0],              // Bas droit
          [profile.length, profile.height], // Haut droit
          [maxContourLength, profile.height], // Haut gauche
          [maxContourLength, 0]             // Fermer le contour
        ];
        
        features.push({
          type: 'cut',
          face: 'o',  // Découpe sur l'âme (traverse tout)
          position: [0, 0, 0],
          contourPoints: transverseCut,
          depth: profile.width * 1.5,  // Profondeur suffisante pour traverser tout le profil
          isTransverse: true  // Marqueur pour indiquer une coupe transversale
        });
        
        console.log(`  ✂️ Added transverse cut removing ${cutLength}mm from end`);
      }
    }
    
    if (profile.contours && profile.contours.length > 0) {
      console.log(`  🔍 Processing ${profile.contours.length} contours for additional cuts...`);
      // Analyser chaque contour pour déterminer s'il s'agit d'une découpe
      profile.contours.forEach((contour, index) => {
        if (contour.points.length < 3) return;
        
        const face = contour.points[0]?.face || 'v';
        const contourPoints = contour.points.map(p => [p.x, p.y] as [number, number]);
        
        // Debug: Afficher les points du contour
        console.log(`\n  🔍 Analyzing contour #${index + 1} on face '${face}': ${contourPoints.length} points`);
        console.log(`    First point: (${contourPoints[0][0].toFixed(1)}, ${contourPoints[0][1].toFixed(1)})`);
        console.log(`    Last point: (${contourPoints[contourPoints.length-1][0].toFixed(1)}, ${contourPoints[contourPoints.length-1][1].toFixed(1)})`);
        console.log(`    Profile: L=${profile.length}, W=${profile.width}, H=${profile.height}`);
        
        // Déterminer si c'est une découpe ou une forme de base
        // Un contour rectangulaire simple couvrant toute la pièce est probablement la forme de base
        const isBaseShape = this.isBaseShapeContour(contourPoints, profile, face);
        console.log(`    Is base shape: ${isBaseShape}`);
        
        if (!isBaseShape) {
          // C'est une découpe - l'analyser pour extraire la vraie zone de découpe
          const cutRegion = this.extractCutRegion(contourPoints, profile, face);
          console.log(`    Extracted cut region:`, cutRegion ? `${cutRegion.length} points` : 'null');
          
          if (cutRegion && cutRegion.length >= 3) {
            // Créer une feature de type 'cut' pour cette découpe
            features.push({
              type: 'cut',
              face,
              position: [0, 0, 0], // La position sera calculée par le CutProcessor
              contourPoints: cutRegion,
              depth: face === 'o' ? (profile.webThickness || 7) : (profile.flangeThickness || 10)
            });
            
            console.log(`  ✂️ Added cut with ${cutRegion.length} points on face ${face}`);
          } else {
            console.log(`  ⚠️ No valid cut region extracted for face ${face}`);
          }
        } else {
          console.log(`  📦 Contour on face ${face} is the base shape (not a cut)`);
        }
      });
    }
    
    // Convertir les contours si présents
    // Pour l'instant, on prend le premier contour de face 'v' (top) ou 'o' (web) pour la forme principale
    let contourPoints: Array<[number, number]> | undefined;
    if (profile.contours && profile.contours.length > 0) {
      // Prioriser les contours dans l'ordre : face 'o' (web), puis 'v' (top), puis 'u' (bottom)
      const contour = profile.contours.find(c => c.points[0]?.face === 'o') ||
                      profile.contours.find(c => c.points[0]?.face === 'v') ||
                      profile.contours[0];
      
      if (contour && contour.points.length >= 3) {
        contourPoints = contour.points.map(p => [p.x, p.y]);
        const face = contour.points[0]?.face || 'unknown';
        console.log(`🔺 Element "${profile.designation}" using ${face} contour with ${contourPoints.length} points`);
      }
    }
    
    // Afficher le résumé des features
    console.log(`  📦 Total features created: ${features.length}`);
    const cutFeatures = features.filter(f => f.type === 'cut');
    const holeFeatures = features.filter(f => f.type === 'hole');
    const markingFeatures = features.filter(f => f.type === 'marking');
    console.log(`    - Cuts: ${cutFeatures.length}`);
    console.log(`    - Holes: ${holeFeatures.length}`);
    console.log(`    - Markings: ${markingFeatures.length}`);
    
    // Afficher les détails des découpes
    cutFeatures.forEach((cut, idx) => {
      console.log(`    Cut ${idx + 1}: face=${cut.face}, points=${cut.contourPoints.length}, transverse=${cut.isTransverse || false}`);
    });
    
    const element: PivotElement = {
      id: `profile-${index}-${Date.now()}`,
      name: profile.designation || `Profile ${profile.id}`,
      description: `${profile.designation} - Order ${profile.orderNumber}`,
      materialType,
      dimensions,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      material: {
        grade: profile.steelGrade || 'S235JR',
        density: 7850,
        color: '#4b5563',
        opacity: 1,
        metallic: 0.7,
        roughness: 0.3,
        reflectivity: 0.5
      },
      metadata: {
        profile: profile.designation,
        weight: profile.weight,
        paintingSurface: profile.paintingSurface,
        features,
        contour: contourPoints, // IMPORTANT: Ajouter le contour ici
        source: 'DSTV',
        webThickness: profile.webThickness,
        flangeThickness: profile.flangeThickness
      },
      visible: true,
      createdAt: new Date()
    };
    
    return element;
  }
  
  /**
   * Détecte le type de matériau basé sur la désignation
   */
  private detectMaterialType(designation: string): MaterialType {
    const upper = designation.toUpperCase();
    
    // Profils en I/H (européens et britanniques)
    if (upper.includes('IPE') || upper.includes('HEA') || upper.includes('HEB') || upper.includes('HEM') ||
        upper.includes('UB') || upper.includes('UC') || upper.includes('UBP')) {
      return MaterialType.BEAM;
    }
    if (upper.includes('UPN') || upper.includes('UAP')) {
      return MaterialType.CHANNEL;
    }
    if (upper.includes('TUBE') || upper.includes('RHS') || upper.includes('CHS')) {
      return MaterialType.TUBE;
    }
    if (upper.includes('PLAT') || upper.startsWith('PL ') || upper === 'PL') {
      return MaterialType.PLATE;
    }
    if (upper.startsWith('L ') || upper === 'L') {
      return MaterialType.ANGLE;
    }
    
    return MaterialType.PLATE; // Par défaut pour les formes complexes
  }
  
  /**
   * Calcule les limites de la scène
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
  
  /**
   * Détermine si un contour représente la forme de base ou une découpe
   */
  private isBaseShapeContour(contourPoints: Array<[number, number]>, profile: DSTVProfile, face: string): boolean {
    const isRect = this.isRectangular(contourPoints);
    console.log(`      isRectangular: ${isRect}`);
    
    // Si le contour est un simple rectangle couvrant presque toute la pièce, c'est la forme de base
    if (isRect) {
      const bounds = this.getContourBounds(contourPoints);
      console.log(`      bounds: (${bounds.minX}, ${bounds.minY}) to (${bounds.maxX}, ${bounds.maxY})`);
      
      // Vérifier si le rectangle couvre la majorité de la pièce
      const lengthCoverage = (bounds.maxX - bounds.minX) / profile.length;
      // Pour l'âme (face 'o'), la dimension Y correspond à la largeur de l'aile (146.1)
      // Pour les ailes (face 'v' ou 'u'), la dimension Y correspond à la hauteur (251.4)
      const expectedWidth = face === 'o' ? profile.width : profile.height;
      const widthCoverage = (bounds.maxY - bounds.minY) / expectedWidth;
      
      console.log(`      coverage: length=${lengthCoverage.toFixed(2)}, width=${widthCoverage.toFixed(2)}`);
      
      // Si le contour couvre plus de 90% dans les deux dimensions, c'est la forme de base
      // Exception: Un contour complexe (plus de 5 points) pourrait avoir une encoche intégrée
      // Pour les faces 'u' et 'o', un rectangle simple est généralement la forme de base
      let isBaseShape = false;
      
      if (face === 'u') {
        // Pour l'aile inférieure, un rectangle qui commence à (0,0) et couvre >90% est la forme de base
        const startsAtOrigin = Math.abs(bounds.minX) < 1 && Math.abs(bounds.minY) < 1;
        isBaseShape = startsAtOrigin && lengthCoverage > 0.90 && widthCoverage > 0.90;
        console.log(`        Face 'u': startsAtOrigin=${startsAtOrigin}`);
      } else if (face === 'o') {
        // Pour l'âme, un rectangle couvrant >90% est la forme de base
        isBaseShape = lengthCoverage > 0.90 && widthCoverage > 0.90;
      } else if (face === 'v') {
        // Pour l'aile supérieure, seulement si c'est un rectangle simple (5 points) qui commence à l'origine
        const startsAtOrigin = Math.abs(bounds.minX) < 1 && Math.abs(bounds.minY) < 1;
        isBaseShape = startsAtOrigin && lengthCoverage > 0.90 && widthCoverage > 0.90 && contourPoints.length <= 5;
        console.log(`        Face 'v': startsAtOrigin=${startsAtOrigin}, pointCount=${contourPoints.length}`);
      }
      
      console.log(`      isBaseShape: ${isBaseShape} (points: ${contourPoints.length})`);
      return isBaseShape;
    }
    
    // Pour les contours non rectangulaires avec beaucoup de points
    // Vérifier s'ils définissent le contour extérieur complet
    if (contourPoints.length > 4) {
      console.log(`      Complex contour with ${contourPoints.length} points - treating as potential cut`);
      return false; // Pour l'instant, considérer les contours complexes comme des découpes
    }
    
    return false;
  }
  
  /**
   * Extrait la région de découpe d'un contour complexe
   */
  private extractCutRegion(contourPoints: Array<[number, number]>, profile: DSTVProfile, face: string): Array<[number, number]> | null {
    console.log(`      extractCutRegion: analyzing ${contourPoints.length} points`);
    
    // Cas spécial pour contour avec 9 points (typique d'une encoche)
    // Ce type de contour sur la face 'v' ou 'o' a généralement une extension
    if (contourPoints.length === 9 && (face === 'v' || face === 'o')) {
      console.log(`      Special case: 9-point contour on face ${face}, analyzing for notch`);
      console.log(`      First 5 points: ${contourPoints.slice(0, 5).map(p => `(${p[0]},${p[1]})`).join(', ')}`);
      
      // Analyser les points pour trouver l'encoche
      // Chercher la partie qui dépasse les limites normales
      const xValues = contourPoints.map(p => p[0]);
      const yValues = contourPoints.map(p => p[1]);
      const xMax = Math.max(...xValues);
      const xMin = Math.min(...xValues);
      const yMax = Math.max(...yValues);
      const yMin = Math.min(...yValues);
      
      // Trouver la deuxième plus grande valeur X (limite du rectangle principal)
      const uniqueX = [...new Set(xValues)].sort((a, b) => b - a);
      console.log(`      uniqueX values: ${uniqueX.slice(0, 3).join(', ')}`);
      
      if (uniqueX.length >= 2) {
        const xExtension = uniqueX[0];  // Valeur X maximale (extension)
        const xMain = uniqueX[1];       // Deuxième valeur X (limite du rectangle principal)
        const extensionWidth = xExtension - xMain;
        
        console.log(`      Extension detected: from ${xMain} to ${xExtension} (width=${extensionWidth})`);
        
        if (extensionWidth > 20) {  // Extension significative (plus de 20mm)
          // Trouver les limites Y de l'extension
          const extensionPoints = contourPoints.filter(p => p[0] > xMain + 1);
          console.log(`      Extension has ${extensionPoints.length} points`);
          
          if (extensionPoints.length >= 2) {
            const extYValues = extensionPoints.map(p => p[1]);
            const extYMin = Math.min(...extYValues);
            const extYMax = Math.max(...extYValues);
            
            // Créer le rectangle de l'encoche
            const notchRect: Array<[number, number]> = [
              [xMain, extYMin],      // Point de jonction bas gauche
              [xExtension, extYMin], // Coin bas droit
              [xExtension, extYMax], // Coin haut droit  
              [xMain, extYMax],      // Point de jonction haut gauche
              [xMain, extYMin]       // Fermer le contour
            ];
            
            console.log(`      Created notch rectangle: ${notchRect.map(p => `(${p[0].toFixed(1)},${p[1].toFixed(1)})`).join(', ')}`);
            return notchRect;
          }
        }
      }
    }
    
    // Cas général : contour avec extension
    if (contourPoints.length > 5 && !this.isRectangular(contourPoints)) {
      console.log(`      trying to find extension in complex contour`);
      // Trouver le rectangle principal et l'extension
      const mainRect = this.findMainRectangle(contourPoints);
      console.log(`      mainRect:`, mainRect);
      const extension = this.findExtension(contourPoints, mainRect);
      console.log(`      extension:`, extension ? `${extension.length} points` : 'null');
      
      if (extension && extension.length >= 3) {
        console.log(`      🔍 Found extension/notch with ${extension.length} points`);
        return extension;
      }
    }
    
    // Pour les contours rectangulaires qui ne sont pas la forme de base
    // Vérifier s'ils représentent une découpe partielle
    if (this.isRectangular(contourPoints)) {
      console.log(`      rectangular contour, checking if it's a cut`);
      const bounds = this.getContourBounds(contourPoints);
      
      // Si le contour commence à (0,0) et couvre toute la largeur, c'est probablement la forme de base
      const startsAtOrigin = Math.abs(bounds.minX) < 1 && Math.abs(bounds.minY) < 1;
      if (startsAtOrigin && face === 'u') {
        console.log(`      Face 'u' contour starts at origin - likely base shape, not a cut`);
        return null;
      }
      
      // Vérifier si c'est une découpe partielle
      const lengthRatio = (bounds.maxX - bounds.minX) / profile.length;
      const expectedWidth = face === 'o' ? profile.width : profile.height;
      const widthRatio = (bounds.maxY - bounds.minY) / expectedWidth;
      
      console.log(`      size ratios: length=${lengthRatio.toFixed(2)}, width=${widthRatio.toFixed(2)}`);
      
      // Si le contour ne commence pas à l'origine, c'est une découpe
      if (!startsAtOrigin) {
        console.log(`      doesn't start at origin - treating as cut`);
        return contourPoints;
      }
      
      // Si le contour couvre moins de 90% de la pièce, c'est probablement une découpe
      if (lengthRatio < 0.90 || widthRatio < 0.90) {
        console.log(`      treating as partial cut`);
        return contourPoints;
      }
    }
    
    console.log(`      no cut region extracted`);
    return null;
  }
  
  /**
   * Trouve le rectangle principal dans un contour complexe
   */
  private findMainRectangle(points: Array<[number, number]>): {minX: number, maxX: number, minY: number, maxY: number} | null {
    console.log(`        findMainRectangle: analyzing ${points.length} points`);
    
    // Pour un contour avec 9 points (typique d'un rectangle avec une encoche)
    // Analyser la forme pour détecter l'encoche
    if (points.length === 9) {
      // Analyser les points pour trouver l'encoche
      // Typiquement: le contour suit le périmètre avec une excursion
      const xValues = points.map(p => p[0]);
      const yValues = points.map(p => p[1]);
      
      // Trouver les valeurs X et Y uniques
      const uniqueX = [...new Set(xValues.map(x => Math.round(x)))].sort((a, b) => a - b);
      const uniqueY = [...new Set(yValues.map(y => Math.round(y)))].sort((a, b) => a - b);
      
      console.log(`        uniqueX: ${uniqueX.slice(0, 5).join(', ')}`);
      console.log(`        uniqueY: ${uniqueY.slice(0, 5).join(', ')}`);
      
      // Si on a plus de 2 valeurs X uniques, il y a probablement une encoche
      if (uniqueX.length > 2) {
        // Trouver la valeur X la plus fréquente (c'est probablement le bord principal)
        const xCounts = new Map<number, number>();
        for (const x of xValues) {
          const rounded = Math.round(x);
          xCounts.set(rounded, (xCounts.get(rounded) || 0) + 1);
        }
        
        // Trier par fréquence
        const xFrequent = Array.from(xCounts.entries()).sort((a, b) => b[1] - a[1]);
        console.log(`        xFrequent:`, xFrequent);
        
        // Si on a au moins 3 valeurs X différentes et une valeur X peu fréquente
        // c'est probablement l'encoche
        if (xFrequent.length >= 3) {
          // Prendre les deux valeurs les plus fréquentes comme limites du rectangle principal
          const mainXValues = xFrequent.slice(0, 2).map(e => e[0]).sort((a, b) => a - b);
          
          return {
            minX: Math.min(...uniqueX.slice(0, -1)), // Exclure la dernière valeur X qui pourrait être l'extension
            maxX: mainXValues[mainXValues.length - 1],
            minY: Math.min(...yValues),
            maxY: Math.max(...yValues)
          };
        }
      }
    }
    
    // Méthode générale pour d'autres cas
    const xValues = points.map(p => p[0]).sort((a, b) => a - b);
    const yValues = points.map(p => p[1]).sort((a, b) => a - b);
    
    // Compter les occurrences de chaque valeur X et Y
    const xCounts = new Map<number, number>();
    const yCounts = new Map<number, number>();
    
    for (const p of points) {
      const x = Math.round(p[0] * 100) / 100;
      const y = Math.round(p[1] * 100) / 100;
      xCounts.set(x, (xCounts.get(x) || 0) + 1);
      yCounts.set(y, (yCounts.get(y) || 0) + 1);
    }
    
    // Trouver les valeurs X et Y les plus fréquentes
    const xFrequent = Array.from(xCounts.entries()).sort((a, b) => b[1] - a[1]);
    const yFrequent = Array.from(yCounts.entries()).sort((a, b) => b[1] - a[1]);
    
    if (xFrequent.length >= 2 && yFrequent.length >= 2) {
      const xSorted = [xFrequent[0][0], xFrequent[1][0]].sort((a, b) => a - b);
      const ySorted = [yFrequent[0][0], yFrequent[1][0]].sort((a, b) => a - b);
      
      return {
        minX: xSorted[0],
        maxX: xSorted[1],
        minY: ySorted[0],
        maxY: ySorted[1]
      };
    }
    
    return null;
  }
  
  /**
   * Trouve l'extension/encoche qui dépasse du rectangle principal
   * Version simplifiée pour le debug
   */
  private findExtension(points: Array<[number, number]>, mainRect: {minX: number, maxX: number, minY: number, maxY: number} | null): Array<[number, number]> | null {
    console.log(`        findExtension called with ${points.length} points`);
    console.log(`        mainRect:`, mainRect);
    
    if (!mainRect) {
      console.log(`        no mainRect, using simple approach`);
      // Approche simplifiée: si on a plus de 5 points, créer une découpe rectangulaire simple
      if (points.length > 5) {
        const bounds = this.getContourBounds(points);
        // Créer un rectangle simple pour la découpe
        const simpleRect: Array<[number, number]> = [
          [bounds.minX, bounds.minY],
          [bounds.maxX, bounds.minY],
          [bounds.maxX, bounds.maxY],
          [bounds.minX, bounds.maxY],
          [bounds.minX, bounds.minY]
        ];
        console.log(`        created simple rect:`, simpleRect);
        return simpleRect;
      }
      return null;
    }
    
    const extensionPoints: Array<[number, number]> = [];
    const tolerance = 10.0; // Tolérance plus large
    
    // Identifier les points qui sont en dehors du rectangle principal
    for (const point of points) {
      const outsideX = point[0] < mainRect.minX - tolerance || point[0] > mainRect.maxX + tolerance;
      const outsideY = point[1] < mainRect.minY - tolerance || point[1] > mainRect.maxY + tolerance;
      
      if (outsideX || outsideY) {
        extensionPoints.push(point);
        console.log(`        extension point: (${point[0]}, ${point[1]})`);
      }
    }
    
    if (extensionPoints.length === 0) {
      console.log(`        no extension points found`);
      return null;
    }
    
    console.log(`        found ${extensionPoints.length} extension points`);
    
    // Créer un rectangle simple autour des points d'extension
    const extBounds = this.getContourBounds(extensionPoints);
    const simpleExtension: Array<[number, number]> = [
      [extBounds.minX, extBounds.minY],
      [extBounds.maxX, extBounds.minY],
      [extBounds.maxX, extBounds.maxY],
      [extBounds.minX, extBounds.maxY],
      [extBounds.minX, extBounds.minY]
    ];
    
    console.log(`        created extension rect:`, simpleExtension);
    return simpleExtension;
  }
  
  /**
   * Détecte les régions d'encoche dans un contour
   */
  private detectNotchRegions(contourPoints: Array<[number, number]>, profile: DSTVProfile, face: string): Array<Array<[number, number]>> | null {
    const regions: Array<Array<[number, number]>> = [];
    
    // Trouver le rectangle englobant principal
    const bounds = this.getContourBounds(contourPoints);
    
    // Analyser le contour pour détecter les changements de direction inhabituels
    // qui indiquent une encoche ou une découpe
    const segments = this.analyzeContourSegments(contourPoints);
    
    // Détecter les segments qui forment des "excroissances" ou des "creux"
    for (const segment of segments) {
      if (segment.type === 'notch' || segment.type === 'protrusion') {
        regions.push(segment.points);
      }
    }
    
    return regions.length > 0 ? regions : null;
  }
  
  /**
   * Analyse les segments d'un contour pour détecter les types de formes
   */
  private analyzeContourSegments(points: Array<[number, number]>): Array<{type: string, points: Array<[number, number]>}> {
    const segments: Array<{type: string, points: Array<[number, number]>}> = [];
    
    // Trouver les extrema du contour
    const bounds = this.getContourBounds(points);
    const tolerance = 1.0; // Tolérance pour les comparaisons
    
    // Détecter les changements de direction et les segments spéciaux
    let currentSegment: Array<[number, number]> = [];
    let segmentType = 'normal';
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || points[0];
      
      currentSegment.push(p1);
      
      // Détecter un changement de direction inattendu
      // Par exemple, si on va vers l'intérieur puis vers l'extérieur
      const dir1 = this.getDirection(p1, p2);
      const dir2 = this.getDirection(p2, p3);
      
      if (dir1 !== dir2 && dir1 !== 'none' && dir2 !== 'none') {
        // Changement de direction - potentielle encoche
        // Vérifier si ce segment forme une "excroissance"
        if (this.isProtrusionOrNotch(currentSegment, bounds)) {
          currentSegment.push(p2); // Ajouter le dernier point
          segments.push({
            type: 'notch',
            points: [...currentSegment]
          });
          currentSegment = [];
        }
      }
    }
    
    return segments;
  }
  
  /**
   * Détermine la direction d'un segment
   */
  private getDirection(p1: [number, number], p2: [number, number]): string {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const tolerance = 0.01;
    
    if (Math.abs(dx) < tolerance && Math.abs(dy) < tolerance) return 'none';
    if (Math.abs(dx) < tolerance) return dy > 0 ? 'up' : 'down';
    if (Math.abs(dy) < tolerance) return dx > 0 ? 'right' : 'left';
    return 'diagonal';
  }
  
  /**
   * Vérifie si un segment forme une excroissance ou une encoche
   */
  private isProtrusionOrNotch(segment: Array<[number, number]>, bounds: {minX: number, maxX: number, minY: number, maxY: number}): boolean {
    if (segment.length < 2) return false;
    
    // Vérifier si au moins un point du segment est proche d'un bord
    // mais pas tous les points
    const tolerance = 10; // Tolérance en mm
    let nearEdgeCount = 0;
    
    for (const point of segment) {
      const nearLeftEdge = Math.abs(point[0] - bounds.minX) < tolerance;
      const nearRightEdge = Math.abs(point[0] - bounds.maxX) < tolerance;
      const nearTopEdge = Math.abs(point[1] - bounds.maxY) < tolerance;
      const nearBottomEdge = Math.abs(point[1] - bounds.minY) < tolerance;
      
      if (nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge) {
        nearEdgeCount++;
      }
    }
    
    // Si certains points sont près du bord mais pas tous, c'est potentiellement une encoche
    return nearEdgeCount > 0 && nearEdgeCount < segment.length;
  }
  
  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(points: Array<[number, number]>): boolean {
    if (points.length !== 5) return false;
    
    // Vérifier que le premier et dernier point sont identiques (contour fermé)
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first[0] - last[0]) > 0.01 || Math.abs(first[1] - last[1]) > 0.01) {
      return false;
    }
    
    // Vérifier que les angles sont droits (les côtés sont parallèles aux axes)
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      // Chaque segment doit être soit horizontal, soit vertical
      const isHorizontal = Math.abs(p1[1] - p2[1]) < 0.01;
      const isVertical = Math.abs(p1[0] - p2[0]) < 0.01;
      
      if (!isHorizontal && !isVertical) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Obtient les limites d'un contour
   */
  private getContourBounds(points: Array<[number, number]>): { minX: number; maxX: number; minY: number; maxY: number } {
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
   * Valide un fichier DSTV
   */
  validate(data: ArrayBuffer | string): boolean {
    try {
      const content = typeof data === 'string' 
        ? data 
        : new TextDecoder('utf-8').decode(data);
      
      return content.includes('ST') && content.includes('EN');
    } catch {
      return false;
    }
  }
}

// Export par défaut
export default DSTVParser;