import { PivotElement } from '@/types/viewer';
import { ExportOptions, ExportResult } from '../FileExporter';
import { ProfileDatabase } from '../../3DLibrary/database/ProfileDatabase';
import { ProfileFace } from '../../core/features/types';

/**
 * DSTVExporter - Export au format DSTV/NC1 conforme à la norme officielle
 * Deutscher Stahlbau-Verband (German Steel Construction Association)
 * 
 * Format ASCII strict pour machines CNC de découpe et perçage acier
 * Basé sur des exemples réels de fichiers DSTV/NC1
 */

/**
 * Interface pour les dimensions de profil issues de la base de données
 */
interface ProfileDimensions {
  height: number;
  width: number;
  flangeThickness: number;
  webThickness: number;
  rootRadius?: number;
  weight?: number;
  perimeter?: number;
}

/**
 * Interface pour les features DSTV
 */
interface DSTVFeature {
  type: string;
  face?: ProfileFace | undefined;
  position?: { x: number; y: number; z?: number };
  diameter?: number;
  width?: number;
  height?: number;
  radius?: number;
  refX?: string;
  points?: Array<{ x: number; y: number; radius?: number }>;
  start?: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  axis?: { start: { x: number; y: number }; end: { x: number; y: number } };
  angle?: number;
}

/**
 * Codes de face DSTV standard
 */
const FACE_CODES = {
  front: 'v',    // Âme avant (web front)
  top: 'o',      // Aile supérieure (top flange)  
  bottom: 'u',   // Aile inférieure (bottom flange)
  behind: 'h',   // Âme arrière (web behind)
  left: 'l',     // Gauche
  right: 'r'     // Droite
} as const;

/**
 * Codes de profil DSTV standard
 */
const PROFILE_CODES = {
  I: 'I',        // Profils I (IPE, IPN, HEA, HEB, HEM)
  U: 'U',        // Profils U (UPN, UAP, C)
  L: 'L',        // Cornières
  M: 'M',        // Tubes rectangulaires/carrés (RHS, SHS)
  RO: 'RO',      // Tubes ronds (CHS)
  RU: 'RU',      // Barres rondes
  B: 'B',        // Plats/Tôles (PL, FL)
  C: 'C',        // Profils C
  T: 'T',        // Profils T
  SO: 'SO'       // Profils spéciaux
} as const;

export class DSTVExporter {
  
  /**
   * Exporte les éléments au format DSTV (ZIP avec fichiers .nc1)
   */
  static async export(
    elements: PivotElement[],
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Charger JSZip dynamiquement
      const JSZip = await import('jszip').then(m => m.default);
      const zip = new JSZip();

      // Créer un fichier NC1 pour chaque élément
      elements.forEach((element, index) => {
        const ncContent = this.generateNC1File(element, index + 1, options);
        // Format de nom : numéro simple ou avec préfixe
        const elementFileName = `${index + 1}.nc`;
        zip.file(elementFileName, ncContent);
      });

      // Générer le ZIP
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Nom de fichier .zip
      const zipFileName = fileName.replace(/\.(dstv|nc1?)$/i, '.zip');

      return {
        success: true,
        fileName: zipFileName,
        data: blob,
        metadata: {
          format: 'dstv',
          elementsCount: elements.length,
          fileSize: blob.size,
          exportDate: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de l'export DSTV: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Génère un fichier NC1 complet pour un élément
   */
  private static generateNC1File(
    element: PivotElement,
    pieceNumber: number,
    options: ExportOptions
  ): string {
    const lines: string[] = [];
    
    // 1. Bloc ST (Start) - En-tête obligatoire
    lines.push(...this.generateSTBlock(element, pieceNumber, options));
    
    // 2. Bloc BO (Bohrung/Holes) - Trous
    if (options.includeFeatures && (element as any).features) {
      const holes = (element as any).features.filter((f: any) => f.type === 'hole');
      if (holes.length > 0) {
        lines.push(...this.generateBOBlock(holes));
      }
    }
    
    // 3. Bloc AK (Außenkontur) - Contour externe (si nécessaire)
    if (this.needsExternalContour(element)) {
      lines.push(...this.generateAKBlock(element));
    }
    
    // 4. Bloc IK (Innenkontur) - Contours internes/découpes
    if (options.includeFeatures && (element as any).features) {
      const notches = (element as any).features.filter((f: any) => 
        f.type === 'notch' || f.type === 'cutout' || f.type === 'cope'
      );
      notches.forEach((notch: any) => {
        lines.push(...this.generateIKBlock(notch));
      });
    }
    
    // 5. Bloc PU (Powder) - Marquage poudre
    if (options.includeFeatures && (element as any).features) {
      const powderMarks = (element as any).features.filter((f: any) => f.type === 'powder');
      if (powderMarks.length > 0) {
        lines.push(...this.generatePUBlock(powderMarks));
      }
    }
    
    // 6. Bloc KO (Mark/Punch) - Marquage poinçon
    if (options.includeFeatures && (element as any).features) {
      const punchMarks = (element as any).features.filter((f: any) => f.type === 'punch');
      if (punchMarks.length > 0) {
        lines.push(...this.generateKOBlock(punchMarks));
      }
    }
    
    // 7. Bloc SC (Cut) - Coupes spéciales
    if (options.includeFeatures && (element as any).features) {
      const cuts = (element as any).features.filter((f: any) => f.type === 'specialCut');
      if (cuts.length > 0) {
        lines.push(...this.generateSCBlock(cuts));
      }
    }
    
    // 8. Bloc TO (Tolerance) - Tolérances
    if ((element as any).tolerances) {
      lines.push(...this.generateTOBlock(element));
    }
    
    // 9. Bloc UE (Camber) - Cambrure
    if ((element as any).camber) {
      lines.push(...this.generateUEBlock(element));
    }
    
    // 10. Bloc PR (Profile) - Profils spéciaux
    if ((element as any).specialProfile) {
      lines.push(...this.generatePRBlock(element));
    }
    
    // 11. Bloc KA (Bending) - Pliage
    if ((element as any).bendings && (element as any).bendings.length > 0) {
      lines.push(...this.generateKABlock(element));
    }
    
    // 12. Bloc SI (Signierung) - Marquage/Numérotation
    if (options.includeMetadata !== false) {
      lines.push(...this.generateSIBlock(element, pieceNumber));
    }
    
    // 13. Bloc IN (Informations) - Informations complémentaires
    if (options.includeMetadata && element.metadata) {
      lines.push(...this.generateINBlock(element, options));
    }
    
    // 14. Bloc EN (End) - Fin obligatoire
    lines.push('EN');
    
    // Retourner avec saut de ligne final
    return lines.join('\n') + '\n';
  }

  /**
   * Génère le bloc ST (Start/Header)
   * Format exact basé sur les fichiers DSTV réels
   */
  private static generateSTBlock(
    element: PivotElement, 
    pieceNumber: number,
    _options: ExportOptions
  ): string[] {
    const lines: string[] = [];
    
    // En-tête du bloc
    lines.push('ST');
    
    // Ligne 2: Toujours un tiret selon la norme DSTV
    lines.push('  -');
    
    // Ligne 3: Identification de commande (format 001)
    lines.push(`  ${String(pieceNumber).padStart(3, '0')}`);
    
    // Ligne 4: Identification du dessin
    lines.push(`  ${pieceNumber}`);
    
    // Ligne 5: Identification de la pièce
    lines.push(`  ${pieceNumber}`);
    
    // Ligne 6: Nuance d'acier
    lines.push(`  ${element.material?.grade || 'S235JR'}`);
    
    // Ligne 7: Code de phase/catégorie (pas quantité!)
    // Utilise un code de catégorie basé sur le type de profil
    const categoryCode = this.getMaterialCategoryCode(element);
    lines.push(`  ${categoryCode}`);
    
    // Ligne 8: Description du profil (ex: IPE300, HEA200, PL 10)
    const profileDescription = this.getProfileDescription(element);
    lines.push(`  ${profileDescription}`);
    
    // Ligne 9: Code de profil DSTV
    lines.push(`  ${this.getProfileCode(element)}`);
    
    // Ligne 10: Longueur (avec 2 décimales, aligné à droite sur 12 caractères)
    const length = element.dimensions.length;
    lines.push(this.formatDimension(length, 12));
    
    // Lignes 11-15: Dimensions du profil selon le type
    const profileCode = this.getProfileCode(element);
    
    // Essayer de récupérer les dimensions depuis la base de données (profileDescription déjà déclarée ligne 237)
    const profileDimensions = this.getProfileDimensionsFromDatabase(profileDescription);
    
    if (profileCode === 'B') {
      // Pour les plats (voir exemple 10.nc): largeur, 0, 0, épaisseur
      lines.push(this.formatDimension(element.dimensions.width, 12));
      lines.push(this.formatDimension(0, 12));
      lines.push(this.formatDimension(0, 12));
      lines.push(this.formatDimension(element.dimensions.thickness, 12));
    } else if (profileCode === 'M') {
      // Pour les tubes (voir exemple 572Z.NC1): hauteur, largeur, épaisseur, épaisseur
      lines.push(this.formatDimension(element.dimensions.height || element.dimensions.width, 12));
      lines.push(this.formatDimension(element.dimensions.width, 12));
      lines.push(this.formatDimension(element.dimensions.thickness, 12));
      lines.push(this.formatDimension(element.dimensions.thickness, 12));
    } else if (profileCode === 'I') {
      // Pour les profils I: utiliser les vraies dimensions depuis la DB ou les dimensions fournies
      if (profileDimensions) {
        lines.push(this.formatDimension(profileDimensions.height, 12));
        lines.push(this.formatDimension(profileDimensions.width, 12));
        lines.push(this.formatDimension(profileDimensions.flangeThickness, 12));
        lines.push(this.formatDimension(profileDimensions.webThickness, 12));
      } else {
        // Fallback sur les dimensions de l'élément
        const { height, width, thickness } = element.dimensions;
        const flangeThickness = element.dimensions.flangeThickness || thickness;
        const webThickness = element.dimensions.webThickness || (thickness * 0.6);
        
        lines.push(this.formatDimension(height || 0, 12));
        lines.push(this.formatDimension(width, 12));
        lines.push(this.formatDimension(flangeThickness, 12));
        lines.push(this.formatDimension(webThickness, 12));
      }
    } else {
      // Autres profils: utiliser les dimensions disponibles
      lines.push(this.formatDimension(element.dimensions.height || 0, 12));
      lines.push(this.formatDimension(element.dimensions.width || 0, 12));
      lines.push(this.formatDimension(element.dimensions.thickness || 0, 12));
      lines.push(this.formatDimension(element.dimensions.thickness * 0.6 || 0, 12));
    }
    
    // Ligne 15: Rayon de congé
    const radius = profileDimensions?.rootRadius || element.dimensions.radius || 0;
    lines.push(this.formatDimension(radius, 12));
    
    // Ligne 16: Poids par mètre (kg/m)
    const weight = profileDimensions?.weight || this.calculateWeight(element);
    lines.push(this.formatDimension(weight, 12));
    
    // Ligne 17: Surface de peinture par mètre (m²/m)
    const paintingSurface = profileDimensions?.perimeter ? profileDimensions.perimeter / 1000 : this.calculatePaintingSurface(element);
    lines.push(this.formatDimension(paintingSurface, 12, 3));
    
    // Lignes 18-21: Angles de coupe (4 valeurs)
    lines.push(this.formatDimension(0, 12, 3));
    lines.push(this.formatDimension(0, 12, 3));
    lines.push(this.formatDimension(0, 12, 3));
    lines.push(this.formatDimension(0, 12, 3));
    
    // Lignes 22-25: 4 lignes de texte supplémentaire
    // Format cohérent avec les exemples (avec espaces ou sans)
    lines.push('  -');
    lines.push('  -');
    lines.push('  -');
    lines.push('  -');
    
    return lines;
  }

  /**
   * Détermine le code de catégorie/phase du matériau
   * Basé sur les exemples: IPE=12, Plats=2, Tubes=3, etc.
   */
  private static getMaterialCategoryCode(element: PivotElement): number {
    const profileCode = this.getProfileCode(element);
    const description = this.getProfileDescription(element);
    const upper = description.toUpperCase();
    
    // Codes basés sur les exemples fournis
    if (upper.includes('IPE')) return 12;
    if (upper.match(/HE[ABM]/)) return 1;
    if (profileCode === 'B' || upper.includes('PL')) return 2;  // Plats
    if (profileCode === 'M') return 3;  // Tubes
    if (profileCode === 'L') return 4;  // Cornières
    if (profileCode === 'U' || profileCode === 'C') return 5;  // U/C
    if (profileCode === 'T') return 6;  // T
    if (profileCode === 'RO') return 7;  // Tubes ronds
    if (profileCode === 'RU') return 8;  // Barres rondes
    
    // Par défaut
    return 1;
  }

  /**
   * Génère le bloc BO (Holes/Trous)
   */
  private static generateBOBlock(holes: DSTVFeature[]): string[] {
    const lines: string[] = ['BO'];
    
    holes.forEach(hole => {
      const face = FACE_CODES[hole.face as keyof typeof FACE_CODES] || 'v';
      const x = hole.position?.x || 0;
      const y = hole.position?.y || 0;
      const diameter = hole.diameter || 20;
      
      // Format: face x ref_x y diameter
      // ref_x peut être u (bottom), s (center), o (top)
      const refX = hole.refX || 'u';
      
      lines.push(`  ${face}${this.formatCoordinate(x)}${refX}${this.formatCoordinate(y)}${this.formatCoordinate(diameter)}`);
    });
    
    return lines;
  }

  /**
   * Génère le bloc AK (External Contour)
   * Format selon les exemples réels (T1.NC1, 572Z.NC1)
   */
  private static generateAKBlock(element: PivotElement): string[] {
    const lines: string[] = [];
    
    const { width, height } = element.dimensions;
    // const profileCode = this.getProfileCode(element); // For future implementation
    
    // Générer les contours pour chaque face nécessaire
    const faces = this.getRequiredFaces(element);
    
    faces.forEach(face => {
      // Début du bloc AK pour chaque face
      lines.push('AK');
      
      // Format des exemples: face x u y z (avec espaces corrects)
      if (face === 'v' || face === 'h') {
        // Face avant/arrière : longueur x hauteur
        const length = element.dimensions.length;
        
        // Premier point
        lines.push(`  ${face}${this.formatCoordinate(0)}u${this.formatCoordinate(0)}${this.formatCoordinate(0)}`);
        // Deuxième point
        lines.push(`${this.formatCoordinate(length)}${this.formatCoordinate(0)}${this.formatCoordinate(0)}`);
        // Troisième point
        lines.push(`${this.formatCoordinate(length)}${this.formatCoordinate(height || 0)}${this.formatCoordinate(0)}`);
        // Quatrième point
        lines.push(`${this.formatCoordinate(0)}${this.formatCoordinate(height || 0)}${this.formatCoordinate(0)}`);
        // Fermeture (retour au premier point)
        lines.push(`${this.formatCoordinate(0)}${this.formatCoordinate(0)}${this.formatCoordinate(0)}`);
      } else {
        // Face top/bottom : longueur x largeur
        const length = element.dimensions.length;
        
        // Premier point
        lines.push(`  ${face}${this.formatCoordinate(0)}u${this.formatCoordinate(0)}${this.formatCoordinate(0)}`);
        // Deuxième point
        lines.push(`${this.formatCoordinate(0)}${this.formatCoordinate(width)}${this.formatCoordinate(0)}`);
        // Troisième point
        lines.push(`${this.formatCoordinate(length)}${this.formatCoordinate(width)}${this.formatCoordinate(0)}`);
        // Quatrième point
        lines.push(`${this.formatCoordinate(length)}${this.formatCoordinate(0)}${this.formatCoordinate(0)}`);
        // Fermeture
        lines.push(`${this.formatCoordinate(0)}${this.formatCoordinate(0)}${this.formatCoordinate(0)}`);
      }
    });
    
    return lines;
  }

  /**
   * Génère le bloc IK (Internal Contour)
   */
  private static generateIKBlock(feature: DSTVFeature): string[] {
    const lines: string[] = ['IK'];
    
    const face = FACE_CODES[feature.face as keyof typeof FACE_CODES] || 'v';
    const x = feature.position?.x || 0;
    const y = feature.position?.y || 0;
    const w = feature.width || 50;
    const h = feature.height || 50;
    
    // Premier point avec face et référence
    lines.push(`  ${face}${this.formatCoordinate(x)}u${this.formatCoordinate(y)}${this.formatCoordinate(0)}`);
    
    // Contour rectangulaire
    lines.push(`${this.formatCoordinate(x + w)}${this.formatCoordinate(y)}${this.formatCoordinate(0)}`);
    lines.push(`${this.formatCoordinate(x + w)}${this.formatCoordinate(y + h)}${this.formatCoordinate(0)}`);
    lines.push(`${this.formatCoordinate(x)}${this.formatCoordinate(y + h)}${this.formatCoordinate(0)}`);
    
    // Fermeture
    lines.push(`${this.formatCoordinate(x)}${this.formatCoordinate(y)}${this.formatCoordinate(0)}`);
    
    return lines;
  }

  /**
   * Génère le bloc SI (Marking/Signierung)
   * Format exact selon les exemples DSTV
   */
  private static generateSIBlock(element: PivotElement, pieceNumber: number): string[] {
    const lines: string[] = ['SI'];
    
    // Format exact des exemples: face x.xx u y.yy angle height text
    const face = 'v';
    const x = 2.0;
    const y = 2.0;
    const angle = 0.0;
    const height = 10;
    const text = `r${pieceNumber}`;
    
    // Format identique aux exemples: v    2.00u    2.00  0.00  10r1
    lines.push(`  ${face}${this.formatCoordinate(x)}u${this.formatCoordinate(y)}  ${angle.toFixed(2)}  ${height}${text}`);
    
    return lines;
  }

  /**
   * Génère le bloc PU (Powder marking)
   * Format identique au bloc IK mais pour marquage poudre
   */
  private static generatePUBlock(marks: DSTVFeature[]): string[] {
    const lines: string[] = ['PU'];
    
    marks.forEach(mark => {
      const face = FACE_CODES[mark.face as keyof typeof FACE_CODES] || 'v';
      const x = mark.position?.x || 0;
      const y = mark.position?.y || 0;
      const radius = mark.radius || 0;
      
      lines.push(`  ${face}${this.formatCoordinate(x)}u${this.formatCoordinate(y)}${this.formatCoordinate(radius)}`);
      
      // Points du contour si spécifiés
      if (mark.points) {
        mark.points.forEach((point: any) => {
          lines.push(`${this.formatCoordinate(point.x)}${this.formatCoordinate(point.y)}${this.formatCoordinate(point.radius || 0)}`);
        });
      }
    });
    
    return lines;
  }

  /**
   * Génère le bloc KO (Mark/Punch)
   * Pour marquage par poinçon
   */
  private static generateKOBlock(marks: DSTVFeature[]): string[] {
    const lines: string[] = ['KO'];
    
    marks.forEach(mark => {
      const face = FACE_CODES[mark.face as keyof typeof FACE_CODES] || 'v';
      const x = mark.position?.x || 0;
      const y = mark.position?.y || 0;
      const radius = mark.radius || 0;
      
      lines.push(`  ${face}${this.formatCoordinate(x)}u${this.formatCoordinate(y)}${this.formatCoordinate(radius)}`);
    });
    
    return lines;
  }

  /**
   * Génère le bloc SC (Cut/Saw)
   * Pour coupes spéciales 3D
   */
  private static generateSCBlock(cuts: DSTVFeature[]): string[] {
    const lines: string[] = ['SC'];
    
    cuts.forEach(cut => {
      // Point de départ et vecteur normal de coupe
      const startX = cut.start?.x || 0;
      const startY = cut.start?.y || 0;
      const startZ = cut.start?.z || 0;
      const normalX = cut.normal?.x || 0;
      const normalY = cut.normal?.y || 0;
      const normalZ = cut.normal?.z || 0;
      
      lines.push(`  ${this.formatCoordinate(startX)}${this.formatCoordinate(startY)}${this.formatCoordinate(startZ)}${this.formatCoordinate(normalX)}${this.formatCoordinate(normalY)}${this.formatCoordinate(normalZ)}`);
    });
    
    return lines;
  }

  /**
   * Génère le bloc TO (Tolerance)
   * Tolérances de longueur
   */
  private static generateTOBlock(element: PivotElement): string[] {
    const lines: string[] = ['TO'];
    
    // Tolérances min et max (en mm)
    const minTolerance = (element as any).tolerances?.min || -1.0;
    const maxTolerance = (element as any).tolerances?.max || 1.0;
    
    lines.push(`  ${this.formatCoordinate(minTolerance)}${this.formatCoordinate(maxTolerance)}`);
    
    return lines;
  }

  /**
   * Génère le bloc UE (Camber/Preform)
   * Pour pièces cambrées
   */
  private static generateUEBlock(element: PivotElement): string[] {
    const lines: string[] = ['UE'];
    
    if ((element as any).camber) {
      const face = FACE_CODES[(element as any).camber.face as keyof typeof FACE_CODES] || 'v';
      const camberX = (element as any).camber.x || 0;
      const camberY = (element as any).camber.y || 0;
      
      lines.push(`  ${face}${this.formatCoordinate(camberX)}${this.formatCoordinate(camberY)}`);
    }
    
    return lines;
  }

  /**
   * Génère le bloc PR (Profile)
   * Pour profils spéciaux définis par contour
   */
  private static generatePRBlock(element: PivotElement): string[] {
    const lines: string[] = ['PR'];
    
    if ((element as any).specialProfile) {
      // Contours externes (+)
      (element as any).specialProfile.externalContours?.forEach((contour: any) => {
        contour.points.forEach((point: any) => {
          lines.push(`  +${this.formatCoordinate(point.y || 0)}${this.formatCoordinate(point.z || 0)}${this.formatCoordinate(point.radius || 0)}`);
        });
      });
      
      // Contours internes (-)
      (element as any).specialProfile.internalContours?.forEach((contour: any) => {
        contour.points.forEach((point: any) => {
          lines.push(`  -${this.formatCoordinate(point.y || 0)}${this.formatCoordinate(point.z || 0)}${this.formatCoordinate(point.radius || 0)}`);
        });
      });
    }
    
    return lines;
  }

  /**
   * Génère le bloc KA (Bending/Pliage)
   * Pour pièces pliées
   */
  private static generateKABlock(element: PivotElement): string[] {
    const lines: string[] = ['KA'];
    
    if ((element as any).bendings) {
      (element as any).bendings.forEach((bend: any) => {
        const x1 = bend.axis?.start?.x || 0;
        const y1 = bend.axis?.start?.y || 0;
        const x2 = bend.axis?.end?.x || 0;
        const y2 = bend.axis?.end?.y || 0;
        const angle = bend.angle || 0;
        const radius = bend.radius || 0;
        
        lines.push(`  ${this.formatCoordinate(x1)}${this.formatCoordinate(y1)}${this.formatCoordinate(x2)}${this.formatCoordinate(y2)}${this.formatCoordinate(angle)}${this.formatCoordinate(radius)}`);
      });
    }
    
    return lines;
  }

  /**
   * Génère le bloc IN (Informations)
   * Informations complémentaires
   */
  private static generateINBlock(element: PivotElement, options: ExportOptions): string[] {
    const lines: string[] = ['IN'];
    
    if (options.includeMetadata && element.metadata) {
      // Informations standard DSTV
      if (element.metadata.customer) {
        lines.push(`  BESTELLER : ${element.metadata.customer}`);
      }
      if (element.metadata.project) {
        lines.push(`  OBJEKT : ${element.metadata.project}`);
      }
      if (element.metadata.drawingNumber) {
        lines.push(`  ZEICHNUNG : ${element.metadata.drawingNumber}`);
      }
      if (element.metadata.painter) {
        lines.push(`  GRUNDANSTRICH : ${element.metadata.painter}`);
      }
      if (element.metadata.galvanized) {
        lines.push(`  VERZINKUNG : ${element.metadata.galvanized}`);
      }
    }
    
    return lines;
  }

  /**
   * Formate une dimension avec alignement et nombre de décimales
   * Respecte le format DSTV avec alignement à droite
   */
  private static formatDimension(value: number, width: number, decimals: number = 2): string {
    const formatted = value.toFixed(decimals);
    return formatted.padStart(width, ' ');
  }

  /**
   * Formate une coordonnée pour les blocs AK, IK, BO, SI
   * Format DSTV standard avec alignement à droite sur 12 caractères
   */
  private static formatCoordinate(value: number): string {
    return value.toFixed(2).padStart(12, ' ');
  }

  /**
   * Détermine le code de profil selon la norme DSTV
   */
  private static getProfileCode(element: PivotElement): string {
    const type = element.materialType?.toUpperCase() || '';
    const name = element.name?.toUpperCase() || '';
    const combined = `${type} ${name}`.toUpperCase();
    
    // Plats et tôles
    if (combined.match(/^(PL|PLAT|FL|FLAT|SHEET|PLATE|TOLE)/)) {
      return PROFILE_CODES.B;
    }
    
    // Tubes rectangulaires/carrés
    if (combined.match(/(TUBE|RHS|SHS|MSH|RECT)/)) {
      return PROFILE_CODES.M;
    }
    
    // Profils I (tous les types)
    if (combined.match(/(IPE|IPN|HE[ABM]|HD|HP|W|UB|UC)/)) {
      return PROFILE_CODES.I;
    }
    
    // Profils U et C
    if (combined.match(/(UPN|UAP|UPE|^C\d|PFC)/)) {
      return PROFILE_CODES.U;
    }
    
    // Cornières
    if (combined.match(/^L\d/)) {
      return PROFILE_CODES.L;
    }
    
    // Tubes ronds
    if (combined.match(/(CHS|ROND|PIPE)/)) {
      return PROFILE_CODES.RO;
    }
    
    // Barres rondes
    if (combined.match(/(BAR|RU|ROND)/)) {
      return PROFILE_CODES.RU;
    }
    
    // Profils T
    if (combined.match(/^T\d/)) {
      return PROFILE_CODES.T;
    }
    
    // Profils spéciaux/autres
    return PROFILE_CODES.SO;
  }

  /**
   * Obtient la description du profil pour le bloc ST
   */
  private static getProfileDescription(element: PivotElement): string {
    // Si le nom contient déjà la désignation complète
    const name = element.name || '';
    const type = element.materialType || '';
    
    // Extraire la désignation du profil depuis le nom
    // Ex: "IPE 300 - Poutre principale" -> "IPE300"
    const profileMatch = name.match(/(IPE|IPN|HE[ABM]|UPN|UAP|RHS|SHS|CHS|L|T|C|PL)\s*(\d+[xX]?\d*)/i);
    if (profileMatch) {
      return `${profileMatch[1]}${profileMatch[2]}`.replace(/\s+/g, '');
    }
    
    // Sinon utiliser le type tel quel
    if (type && type !== 'beam' && type !== 'column') {
      return type;
    }
    
    // Par défaut
    return 'UNKNOWN';
  }

  /**
   * Récupère les dimensions réelles du profil depuis la base de données
   */
  private static getProfileDimensionsFromDatabase(profileDescription: string): ProfileDimensions | null {
    try {
      const db = ProfileDatabase.getInstance();
      
      // Essayer différents formats de recherche
      let profile = db.findByDesignation(profileDescription);
      
      // Si pas trouvé, essayer avec des espaces
      if (!profile) {
        const withSpace = profileDescription.replace(/(IPE|HE[ABM]|UPN|L|T|C)(\d+)/, '$1 $2');
        profile = db.findByDesignation(withSpace);
      }
      
      if (profile && (profile as any).dimensions) {
        return {
          height: (profile as any).dimensions.height,
          width: (profile as any).dimensions.width,
          flangeThickness: (profile as any).dimensions.flangeThickness,
          webThickness: (profile as any).dimensions.webThickness,
          rootRadius: (profile as any).dimensions.rootRadius,
          weight: (profile as any).weight,
          perimeter: (profile as any).perimeter
        };
      }
    } catch (error) {
      // Si la base de données n'est pas disponible, retourner null
      console.warn(`Profile ${profileDescription} not found in database:`, error);
    }
    
    return null;
  }

  /**
   * Détermine si un contour externe est nécessaire
   * Basé sur les exemples: T1.NC1 et 572Z.NC1 ont des blocs AK
   */
  private static needsExternalContour(element: PivotElement): boolean {
    const profileCode = this.getProfileCode(element);
    
    // Les tubes nécessitent toujours un contour AK (voir exemple 572Z.NC1)
    if (profileCode === PROFILE_CODES.M) {
      return true;
    }
    
    // Les profils I peuvent avoir des contours AK (voir exemple T1.NC1)
    // Particulièrement pour les HE
    if (profileCode === PROFILE_CODES.I) {
      const type = element.materialType.toUpperCase();
      // HE profiles souvent avec AK
      if (type.includes('HE')) {
        return true;
      }
      // Ou si des features spéciales
      if ((element as any).features?.some((f: any) => 
        f.type === 'cut' || f.type === 'miter' || f.type === 'cope'
      )) {
        return true;
      }
    }
    
    // Les profils spéciaux
    if (profileCode === PROFILE_CODES.SO) {
      return true;
    }
    
    return false;
  }

  /**
   * Détermine les faces requises pour le contour
   * Basé sur les exemples réels
   */
  private static getRequiredFaces(element: PivotElement): string[] {
    const profileCode = this.getProfileCode(element);
    const type = element.materialType.toUpperCase();
    
    // Pour les tubes (exemple 572Z.NC1) : 4 faces v, o, u, h
    if (profileCode === PROFILE_CODES.M) {
      return ['v', 'o', 'u', 'h'];
    }
    
    // Pour les profils HE (exemple T1.NC1) : 3 faces v, o, u
    if (profileCode === PROFILE_CODES.I && type.includes('HE')) {
      return ['v', 'o', 'u'];
    }
    
    // Autres profils I : peut nécessiter des faces selon les features
    if (profileCode === PROFILE_CODES.I) {
      if ((element as any).features?.some((f: any) => f.type === 'cut' || f.type === 'cope')) {
        return ['v', 'o', 'u'];
      }
    }
    
    // Par défaut : pas de bloc AK
    return [];
  }

  /**
   * Calcule le poids par mètre en kg/m
   * Utilise les dimensions spécifiques si disponibles
   */
  private static calculateWeight(element: PivotElement): number {
    const dims = element.dimensions;
    const profileCode = this.getProfileCode(element);
    
    // Surface de section en mm²
    let area = 0;
    
    switch (profileCode) {
      case PROFILE_CODES.I: {
        // Profils I/H : âme + 2 ailes
        // Utilise les dimensions spécifiques si disponibles
        const webThickness = dims.webThickness || (dims.thickness * 0.6);
        const flangeThickness = dims.flangeThickness || dims.thickness;
        const webHeight = dims.webHeight || ((dims.height || 0) - 2 * flangeThickness);
        const flangeWidth = dims.flangeWidth || dims.width;
        
        const webArea = webHeight * webThickness;
        const flangeArea = 2 * flangeWidth * flangeThickness;
        area = webArea + flangeArea;
        break;
      }
        
      case PROFILE_CODES.U: {
        // Profils U/C
        const uHeight = dims.height || 0;
        const uWidth = dims.width || 0;
        const uThickness = dims.thickness || 0;
        area = uHeight * uThickness * 0.7 + 2 * uWidth * uThickness * 0.8;
        break;
      }
        
      case PROFILE_CODES.L: {
        // Cornières
        const lWidth = dims.width || 0;
        const lHeight = dims.height || lWidth; // Cornières égales par défaut
        const lThickness = dims.thickness || 0;
        area = lThickness * (lWidth + lHeight - lThickness);
        break;
      }
        
      case PROFILE_CODES.M: {
        // Tubes rectangulaires/carrés
        const tubeWidth = dims.width || 0;
        const tubeHeight = dims.height || tubeWidth; // Carré par défaut
        const tubeThickness = dims.thickness || 0;
        const perimetre = 2 * (tubeWidth + tubeHeight);
        area = perimetre * tubeThickness - 4 * tubeThickness * tubeThickness;
        break;
      }
        
      case PROFILE_CODES.RO: {
        // Tubes ronds
        const diameter = dims.diameter || dims.width || 0;
        const roThickness = dims.thickness || 0;
        const rExt = diameter / 2;
        const rInt = rExt - roThickness;
        area = Math.PI * (rExt * rExt - rInt * rInt);
        break;
      }
        
      case PROFILE_CODES.B:
        // Plats/Tôles
        area = (dims.width || 0) * (dims.thickness || 0);
        break;
        
      default:
        // Approximation générale
        area = (dims.width || 100) * (dims.height || 100) * 0.15;
    }
    
    // Conversion en m³/m et calcul du poids (densité acier = 7850 kg/m³)
    const volumePerMeter = area / 1e6; // mm² vers m²
    const density = element.material?.density || 7850; // kg/m³
    return volumePerMeter * density;
  }

  /**
   * Calcule la surface de peinture par mètre en m²/m
   */
  private static calculatePaintingSurface(element: PivotElement): number {
    const { width, height, thickness } = element.dimensions;
    const profileCode = this.getProfileCode(element);
    
    // Périmètre en mm selon le type de profil
    let perimeter = 0;
    
    switch (profileCode) {
      case PROFILE_CODES.I:
        // Profils I/H : contour complet
        perimeter = 4 * width + 2 * (height || 0) - 2 * thickness;
        break;
        
      case PROFILE_CODES.U:
        // Profils U/C
        perimeter = 2 * width + 2 * (height || 0);
        break;
        
      case PROFILE_CODES.L:
        // Cornières
        perimeter = 2 * (width + (height || 0));
        break;
        
      case PROFILE_CODES.M:
        // Tubes rectangulaires : périmètre externe uniquement
        perimeter = 2 * (width + (height || 0));
        break;
        
      case PROFILE_CODES.RO:
        // Tubes ronds : circonférence
        perimeter = Math.PI * width;
        break;
        
      case PROFILE_CODES.B:
        // Plats : 2 grandes faces + 2 chants
        perimeter = 2 * width + 2 * thickness;
        break;
        
      default:
        // Approximation par défaut
        perimeter = 2 * (width + (height || 0));
    }
    
    // Conversion en m²/m
    return perimeter / 1000;
  }
}