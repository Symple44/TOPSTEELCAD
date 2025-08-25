/**
 * Parser pour le bloc AK (Outer contour/Aussenkontur) - Version intégrée
 * 
 * Migré depuis l'ancien parser avec améliorations pour l'architecture moderne.
 * Utilise une approche géométrique universelle qui fonctionne pour tous types de profils.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { StandardFace } from '../../../../core/coordinates/types';

/**
 * Point 2D pour contours
 */
interface Point2D {
  x: number;
  y: number;
}

/**
 * Rectangle de référence
 */
interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Structure des données d'un contour AK
 */
export interface AKBlockData {
  points: Point2D[];           // Points du contour extérieur
  face?: StandardFace | undefined;               // Face d'application ('v', 'u', 'o', 'h')
  closed?: boolean;            // Indique si le contour est fermé
  workPlane?: string;          // Plan de travail (E0-E9, optionnel)
  cutRegions?: Array<{         // Régions de découpe calculées
    points: Point2D[];
    isTransverse: boolean;
    depth: number;
  }>;
}

/**
 * Parser pour le bloc AK - Version moderne intégrée
 */
export class AKBlockParser extends BaseStage<string[], AKBlockData> {
  readonly name = 'ak-block-parser';
  readonly description = 'Parses DSTV AK (Outer contour) block with universal geometric approach';

  /**
   * Parse un bloc AK moderne
   */
  async process(input: string[], profileContext?: any): Promise<AKBlockData> {
    if (input.length < 4) {
      throw new Error('AK block requires at least 4 fields (2 points minimum)');
    }

    this.log(null as any, 'debug', `Parsing AK block with ${input.length} fields`);

    const points: Point2D[] = [];
    let face: StandardFace | undefined = undefined; // Face par défaut

    // Détecter le format et parser les points
    if (this.isLegacyFaceIndicatorFormat(input)) {
      const parsed = this.parseLegacyFormat(input);
      points.push(...parsed.points);
      face = parsed.face;
    } else {
      points.push(...this.parseStandardFormat(input));
    }

    // Analyser le contour avec l'approche universelle
    // TEMPORAIREMENT DÉSACTIVÉ : les cutRegions causent des géométries énormes
    const cutRegions: Point2D[][] = []; // this.calculateMissingRegions(points, profileContext, face);

    const data: AKBlockData = {
      points,
      face,
      closed: this.isContourClosed(points),
      cutRegions: cutRegions.map(region => ({
        points: region,
        isTransverse: this.isTransverseCut(region, profileContext),
        depth: this.calculateCutDepth(face, profileContext) // Profondeur adaptée à la face
      }))
    };

    this.log(null as any, 'debug', 
      `Parsed AK contour with ${points.length} points, ${cutRegions.length} cut regions on face ${face}`
    );
    
    // Debug: afficher les régions de découpe
    cutRegions.forEach((region, i) => {
      const bounds = this.getContourBounds(region);
      console.log(`AK Cut Region ${i + 1}: bounds=[${bounds.minX},${bounds.minY}]-[${bounds.maxX},${bounds.maxY}], size=${bounds.maxX-bounds.minX}x${bounds.maxY-bounds.minY}`);
    });

    return data;
  }

  /**
   * Détecte si le format utilise les anciens indicateurs de face
   */
  private isLegacyFaceIndicatorFormat(input: string[]): boolean {
    return input.some(field => {
      const trimmed = field.trim().toLowerCase();
      return /^[hvuo]/.test(trimmed) && /\d/.test(field);
    });
  }

  /**
   * Parse le format legacy avec indicateurs de face
   */
  private parseLegacyFormat(input: string[]): { points: Point2D[]; face: StandardFace | undefined } {
    const points: Point2D[] = [];
    let face: StandardFace | undefined = undefined;

    // Dans le format DSTV, chaque ligne a le format : "indicateur X Y Z"
    // Les champs sont dans l'ordre : [indicateur+X, Y, Z] pour chaque point
    for (let i = 0; i < input.length; i += 3) {
      if (i + 1 >= input.length) break; // Assurer qu'on a au moins X et Y
      
      const fieldX = input[i].trim();
      const fieldY = input[i + 1].trim();
      // Z est optionnel (input[i + 2])
      
      // Détecter l'indicateur de face dans le premier champ X
      if (this.containsFaceIndicator(fieldX)) {
        const faceChar = fieldX.charAt(0).toLowerCase();
        face = this.mapFaceIndicator(faceChar);
      }
      
      // Extraire les valeurs numériques
      const x = this.extractNumericValue(fieldX);
      const y = this.extractNumericValue(fieldY);
      
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
        console.log(`✅ AK Point parsed: [${x}, ${y}] from fields [${fieldX}, ${fieldY}]`);
      } else {
        console.warn(`❌ AK Invalid point: x=${x} (from "${fieldX}"), y=${y} (from "${fieldY}")`);
      }
    }

    return { points, face };
  }

  /**
   * Parse le format standard DSTV
   */
  private parseStandardFormat(input: string[]): Point2D[] {
    const points: Point2D[] = [];
    
    for (let i = 0; i < input.length - 1; i += 2) {
      const x = parseFloat(input[i]);
      const y = parseFloat(input[i + 1]);
      
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      }
    }

    return points;
  }

  /**
   * Vérifie si un champ contient un indicateur de face
   */
  private containsFaceIndicator(field: string): boolean {
    const lowerField = field.toLowerCase();
    return /^[hvuo]/.test(lowerField) && /\d/.test(field);
  }

  /**
   * Mappe un indicateur de face vers sa signification
   */
  private mapFaceIndicator(indicator: string): StandardFace | undefined {
    const mapping: Record<string, StandardFace> = {
      'v': StandardFace.TOP_FLANGE,       // v = Semelle supérieure (DSTV)
      'o': StandardFace.WEB,              // o = Âme/web (DSTV)
      'u': StandardFace.BOTTOM_FLANGE,    // u = Semelle inférieure (DSTV)
      'h': StandardFace.FRONT             // h = Face avant (DSTV)
    };
    return mapping[indicator] || undefined;
  }

  /**
   * Extrait les nombres d'une chaîne
   */
  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    const parts = text.split(/\s+/).filter(p => p.trim());
    
    for (const part of parts) {
      const match = part.match(/^-?(\d+\.?\d*)/);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    }
    
    return numbers;
  }

  /**
   * Extrait une valeur numérique d'un champ DSTV
   * Gère les préfixes (v, o, u, h) et les suffixes (u)
   */
  private extractNumericValue(field: string): number {
    const trimmed = field.trim();
    
    // Enlever le préfixe de face s'il existe
    let numStr = trimmed;
    if (/^[hvuoHVUO]/.test(trimmed)) {
      numStr = trimmed.substring(1);
    }
    
    // Enlever le suffixe 'u' s'il existe
    numStr = numStr.replace(/u\s*$/i, '');
    
    // Parser la valeur numérique
    const value = parseFloat(numStr);
    return value;
  }

  /**
   * Calcule les régions manquantes par différence géométrique
   * APPROCHE UNIVERSELLE : Compare le contour avec le rectangle de référence
   */
  private calculateMissingRegions(
    contourPoints: Point2D[],
    profileContext?: any,
    face: StandardFace | undefined = undefined
  ): Point2D[][] {
    if (contourPoints.length < 3) return [];

    const regions: Point2D[][] = [];
    
    // Obtenir les dimensions de référence selon la face
    const referenceDims = this.getReferenceDimensions(face, profileContext);
    
    // Rectangle de référence (forme complète sans découpe)
    const reference: Rectangle = {
      minX: 0,
      maxX: referenceDims.length,
      minY: 0,
      maxY: referenceDims.height
    };
    
    // Limites du contour donné
    const contourBounds = this.getContourBounds(contourPoints);
    
    // CAS SPÉCIAL : Contour complexe avec 9 points
    if (contourPoints.length === 9) {
      const internalCuts = this.findInternalCuts(contourPoints, reference);
      if (internalCuts.length > 0) {
        return internalCuts;
      }
    }
    
    // STRATÉGIE 1: Découpes aux extrémités (X)
    if (contourBounds.minX > reference.minX + 1) {
      // Découpe au début
      regions.push([
        { x: reference.minX, y: reference.minY },
        { x: contourBounds.minX, y: reference.minY },
        { x: contourBounds.minX, y: reference.maxY },
        { x: reference.minX, y: reference.maxY },
        { x: reference.minX, y: reference.minY }
      ]);
    }
    
    if (contourBounds.maxX < reference.maxX - 1) {
      // Découpe à la fin
      regions.push([
        { x: contourBounds.maxX, y: reference.minY },
        { x: reference.maxX, y: reference.minY },
        { x: reference.maxX, y: reference.maxY },
        { x: contourBounds.maxX, y: reference.maxY },
        { x: contourBounds.maxX, y: reference.minY }
      ]);
    }
    
    // STRATÉGIE 2: Contours complexes (non-rectangulaires)
    if (!this.isRectangular(contourPoints) && contourPoints.length > 5 && contourPoints.length !== 9) {
      const internalCuts = this.findInternalCuts(contourPoints, reference);
      regions.push(...internalCuts);
    }
    
    return regions;
  }

  /**
   * Trouve les découpes internes dans un contour complexe
   */
  private findInternalCuts(
    points: Point2D[],
    reference: Rectangle
  ): Point2D[][] {
    const cuts: Point2D[][] = [];
    
    // Cas spécial : contour avec 9 points (extensions avec encoches)
    if (points.length === 9) {
      const xValues = points.map(p => p.x);
      const uniqueX = [...new Set(xValues.map(x => Math.round(x)))].sort((a, b) => a - b);
      
      if (uniqueX.length >= 2) {
        const mainX = uniqueX[uniqueX.length - 2] || uniqueX[0];
        const extX = uniqueX[uniqueX.length - 1];
        
        // Trouver les points dans l'extension
        const extensionPoints = points.filter(p => p.x > mainX + 1);
        
        if (extensionPoints.length >= 2) {
          const yValuesExt = extensionPoints.map(p => p.y).sort((a, b) => a - b);
          const minYExt = yValuesExt[0];
          const maxYExt = yValuesExt[yValuesExt.length - 1];
          
          // Découpe haute
          if (minYExt > reference.minY + 1) {
            cuts.push([
              { x: mainX, y: reference.minY },
              { x: extX, y: reference.minY },
              { x: extX, y: minYExt },
              { x: mainX, y: minYExt },
              { x: mainX, y: reference.minY }
            ]);
          }
          
          // Découpe basse
          if (maxYExt < reference.maxY - 1) {
            cuts.push([
              { x: mainX, y: maxYExt },
              { x: extX, y: maxYExt },
              { x: extX, y: reference.maxY },
              { x: mainX, y: reference.maxY },
              { x: mainX, y: maxYExt }
            ]);
          }
        }
      }
    }
    
    return cuts;
  }

  /**
   * Obtient les dimensions de référence selon la face
   */
  private getReferenceDimensions(
    face: StandardFace | undefined,
    profileContext?: any
  ): { length: number; height: number } {
    if (!profileContext) {
      return { length: 2000, height: 300 };
    }
    
    const length = profileContext.length || 2000;
    let height: number;
    
    switch (face) {
      case 'top':
      case 'bottom':
        height = profileContext.width || 150;
        break;
      case 'web':
        height = profileContext.height || 300;
        break;
      default:
        height = Math.max(
          profileContext.width || 150,
          profileContext.height || 300
        );
    }
    
    return { length, height };
  }

  /**
   * Vérifie si un contour est fermé
   */
  private isContourClosed(points: Point2D[]): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    const tolerance = 0.01;
    
    return Math.abs(first.x - last.x) < tolerance && 
           Math.abs(first.y - last.y) < tolerance;
  }

  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(points: Point2D[]): boolean {
    if (points.length !== 5) return false;
    
    // Vérifier fermeture
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first.x - last.x) > 0.1 || Math.abs(first.y - last.y) > 0.1) {
      return false;
    }
    
    // Vérifier segments orthogonaux
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      
      if (dx > 0.1 && dy > 0.1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Détermine si une découpe est transversale
   */
  private isTransverseCut(contour: Point2D[], profileContext?: any): boolean {
    const bounds = this.getContourBounds(contour);
    const referenceLength = profileContext?.length || 2000;
    
    // Une découpe est transversale si elle est proche des extrémités
    return bounds.minX > referenceLength * 0.8 || bounds.maxX < referenceLength * 0.2;
  }

  /**
   * Calcule la profondeur de découpe appropriée selon la face
   */
  private calculateCutDepth(face: StandardFace | undefined, profileContext?: any): number {
    if (!profileContext) {
      return 12; // Profondeur par défaut raisonnable
    }
    
    // Utiliser les épaisseurs réelles du profil
    switch (face) {
      case 'top':
      case 'bottom':
        // Découpe sur les semelles : utiliser l'épaisseur de semelle + marge
        return (profileContext.flangeThickness || 10) * 1.2;
      case 'web':
        // Découpe sur l'âme : utiliser l'épaisseur d'âme + marge
        return (profileContext.webThickness || 8) * 1.2;
      default:
        // Face avant/arrière : profondeur minimale pour traverser le profil
        return Math.min(
          profileContext.webThickness || 8,
          profileContext.flangeThickness || 10
        ) * 1.2;
    }
  }

  /**
   * Obtient les limites d'un contour
   */
  private getContourBounds(points: Point2D[]): Rectangle {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return { minX, maxX, minY, maxY };
  }

  /**
   * Valide les données du bloc AK
   */
  async validate(input: string[]): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; data?: any }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // First parse the input to get the data
      const data = await this.process(input);

      // Validation des points
      if (!data.points || data.points.length < 3) {
        errors.push('AK block must contain at least 3 points');
      }

      // Validation de chaque point
      for (let i = 0; i < data.points.length; i++) {
        const point = data.points[i];
        
        if (isNaN(point.x) || isNaN(point.y)) {
          errors.push(`Point ${i + 1} has invalid coordinates`);
        }
      }

      // Validation de la fermeture si spécifiée
      if (data.closed && !this.isContourClosed(data.points)) {
        warnings.push('Contour marked as closed but first and last points do not match');
      }

      // Validation du plan de travail
      if (data.workPlane && !/^E[0-9]$/.test(data.workPlane)) {
        errors.push(`Invalid work plane: ${data.workPlane} (must be E0-E9)`);
      }

      // Vérification de l'aire du contour
      const area = this.calculatePolygonArea(data.points);
      if (area < 1) {
        warnings.push('Very small contour area');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data
      };
    } catch (error) {
      errors.push(`Failed to parse AK block: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Calcule l'aire d'un polygone
   */
  private calculatePolygonArea(points: Point2D[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  /**
   * Convertit vers le format standardisé moderne
   */
  convertToStandardFormat(data: AKBlockData): {
    type: 'outer_contour';
    coordinates: { x: number; y: number; z: number };
    parameters: Record<string, any>;
  } {
    // Calculer le centre du contour
    const centerX = data.points.reduce((sum, p) => sum + p.x, 0) / data.points.length;
    const centerY = data.points.reduce((sum, p) => sum + p.y, 0) / data.points.length;
    
    return {
      type: 'outer_contour',
      coordinates: {
        x: centerX,
        y: centerY,
        z: 0
      },
      parameters: {
        points: data.points,
        closed: data.closed || false,
        face: data.face || 'front',
        workPlane: data.workPlane || 'E0',
        contourType: 'outer',
        area: this.calculatePolygonArea(data.points),
        cutRegions: data.cutRegions || [],
        originalFormat: 'DSTV_AK'
      }
    };
  }
}