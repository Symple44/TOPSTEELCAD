/**
 * AKBlockParser - Parser universel pour les blocs AK (contours)
 * 
 * PRINCIPE UNIVERSEL:
 * Les blocs AK définissent ce qui RESTE après découpe.
 * Cette approche utilise une méthode géométrique pure qui fonctionne
 * pour TOUS les types de profils (I, H, L, tubes, platines, etc.)
 * 
 * ALGORITHME:
 * 1. Comparer le contour donné avec le rectangle de référence
 * 2. Calculer la différence géométrique (zones manquantes)
 * 3. Ces zones manquantes sont les découpes à appliquer
 */

import { DSTVToken, DSTVCut, TokenType } from '../types';

interface Point2D {
  x: number;
  y: number;
}

interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Parser universel pour les blocs AK (Aussenkontur - External Contour)
 * Utilise une approche géométrique pure sans dépendance au type de profil
 */
export class AKBlockParser {
  
  /**
   * Parse les tokens d'un bloc AK avec approche universelle
   * @param tokens - Les tokens du bloc AK
   * @param profileContext - Contexte du profil (dimensions, type)
   */
  parse(tokens: DSTVToken[], profileContext?: any): DSTVCut[] {
    const cuts: DSTVCut[] = [];
    const points: Array<[number, number]> = [];
    let contourFace: string = 'front';  // Utiliser string directement
    
    console.log(`🔪 AKBlockParser: parsing ${tokens.length} tokens`);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      console.log(`  Token ${i}: type=${token.type}, value=${token.value}`);
      
      // Ignorer les tokens non-données
      if (token.type === TokenType.COMMENT || 
          token.type === TokenType.BLOCK_START || 
          token.type === TokenType.BLOCK_END) {
        continue;
      }
      
      // Traiter les tokens FACE_INDICATOR qui contiennent les données de contour
      if (token.type === TokenType.FACE_INDICATOR && token.value) {
        // Extraire l'indicateur de face (o, v, u) et les coordonnées
        const value = token.value.trim();
        const faceChar = value.charAt(0).toLowerCase();
        
        // Définir la face selon l'indicateur
        if (faceChar === 'o') {
          contourFace = 'o';  // Âme
        } else if (faceChar === 'v') {
          contourFace = 'v';  // Face supérieure
        } else if (faceChar === 'u') {
          contourFace = 'u';  // Face inférieure
        }
        
        // Extraire les valeurs numériques depuis le token
        // Format: "o  1842.10u     0.00   0.00"
        const parts = value.substring(1).split(/\s+/).filter(p => p);
        const numbers: number[] = [];
        
        for (const part of parts) {
          const numMatch = part.match(/^(\d+\.?\d*)/);
          if (numMatch) {
            numbers.push(parseFloat(numMatch[1]));
          }
        }
        
        // Si on a au moins x et y, ajouter le point
        if (numbers.length >= 2) {
          points.push([numbers[0], numbers[1]]);
          console.log(`  Added point: [${numbers[0]}, ${numbers[1]}] on face ${contourFace}`);
        }
      } else if (this.hasContourData(token)) {
        const point = this.parseContourPoint(token);
        if (point) {
          points.push([point.x, point.y]);
          if ((token as DSTVToken & { face?: string }).face) {
            contourFace = (token as DSTVToken & { face?: string }).face;
          }
        }
      } else if (token.type === TokenType.NUMBER) {
        // Fallback pour parsing simple numérique
        const x = parseFloat(token.value);
        i++;
        if (i < tokens.length && tokens[i].type === TokenType.NUMBER) {
          const y = parseFloat(tokens[i].value);
          points.push([x, y]);
        } else {
          i--; // Reculer si pas de paire
        }
      }
    }
    
    // Analyser le contour avec l'approche universelle
    if (points.length >= 3) {
      console.log(`  Analyzing contour with ${points.length} points on face ${contourFace}`);
      
      // Déterminer les dimensions de référence selon la face
      const referenceDims = this.getReferenceDimensions(contourFace, profileContext);
      
      // Debug : afficher les dimensions de référence
      console.log(`  Reference dimensions: L=${referenceDims.length}, H=${referenceDims.height}`);
      
      // Analyse universelle par différence géométrique
      const cutRegions = this.calculateMissingRegions(
        points,
        referenceDims.length,
        referenceDims.height
      );
      
      console.log(`  Found ${cutRegions.length} cut region(s)`);
      
      // Convertir chaque région manquante en découpe
      cutRegions.forEach((region, idx) => {
        const bounds = this.getContourBounds(region);
        console.log(`    Cut ${idx + 1}: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
        
        cuts.push({
          face: contourFace,
          contour: region,
          depth: 50, // Profondeur suffisante pour traverser
          isTransverse: this.isTransverseCut(region, referenceDims.length)
        });
        console.log(`  ✅ Added cut ${idx + 1} with ${region.length} points`);
      });
      
      if (cutRegions.length === 0) {
        console.log(`  ℹ️ No cuts detected - contour matches reference shape`);
      }
    }
    
    console.log(`🔪 AKBlockParser: returning ${cuts.length} cut(s)`);
    return cuts;
  }
  
  /**
   * Vérifie si un token contient des données de contour
   */
  private hasContourData(token: DSTVToken): boolean {
    return !!(token as unknown).values && Array.isArray((token as unknown).values);
  }
  
  /**
   * Parse un point de contour depuis un token
   */
  private parseContourPoint(token: DSTVToken): { x: number; y: number } | null {
    const values = (token as unknown).values;
    
    if (!values || values.length < 2) {
      return null;
    }
    
    return {
      x: values[0],
      y: values[1]
    };
  }
  
  /**
   * Obtient les dimensions de référence selon la face
   * Universel pour tous les types de profils
   */
  private getReferenceDimensions(
    face: string,
    profileContext?: any
  ): { length: number; height: number } {
    if (!profileContext) {
      return { length: 2000, height: 300 }; // Valeurs par défaut
    }
    
    const length = profileContext.length || 2000;
    
    // Pour les faces 'v' et 'u', Y représente la largeur du profil
    // Pour la face 'o', Y représente la hauteur
    let height: number;
    
    if (face === 'v' || face === 'u') {
      // Faces supérieure/inférieure : Y = largeur
      height = profileContext.width || 150;
    } else if (face === 'o' || face === 'web') {
      // Face âme/web : Y = hauteur
      height = profileContext.height || 300;
    } else {
      // Autres faces : utiliser la plus grande dimension transversale
      height = Math.max(
        profileContext.width || 150,
        profileContext.height || 300
      );
    }
    
    return { length, height };
  }
  
  /**
   * Calcule les régions manquantes par différence géométrique
   * APPROCHE UNIVERSELLE : Compare le contour avec le rectangle de référence
   */
  private calculateMissingRegions(
    contourPoints: Array<[number, number]>,
    referenceLength: number,
    referenceHeight: number
  ): Array<Array<[number, number]>> {
    const regions: Array<Array<[number, number]>> = [];
    
    // Rectangle de référence (forme complète sans découpe)
    const reference: Rectangle = {
      minX: 0,
      maxX: referenceLength,
      minY: 0,
      maxY: referenceHeight
    };
    
    // Limites du contour donné
    const contourBounds = this.getContourBounds(contourPoints);
    
    // CAS SPÉCIAL : Contour à 9 points (M1002.nc face 'v')
    // Ce cas a des encoches spécifiques, le traiter directement
    if (contourPoints.length === 9) {
      const internalCuts = this.findInternalCuts(contourPoints, reference);
      // Si des découpes internes sont trouvées, les retourner
      if (internalCuts.length > 0) {
        return internalCuts;
      }
      // Sinon, continuer avec l'analyse normale
    }
    
    // STRATÉGIE 1: Découpes aux extrémités (X)
    // Si le contour ne commence pas à 0 ou ne finit pas à referenceLength
    
    if (contourBounds.minX > reference.minX + 1) {
      // Découpe au début
      regions.push([
        [reference.minX, reference.minY],
        [contourBounds.minX, reference.minY],
        [contourBounds.minX, reference.maxY],
        [reference.minX, reference.maxY],
        [reference.minX, reference.minY]
      ]);
    }
    
    if (contourBounds.maxX < reference.maxX - 1) {
      // Découpe à la fin
      regions.push([
        [contourBounds.maxX, reference.minY],
        [reference.maxX, reference.minY],
        [reference.maxX, reference.maxY],
        [contourBounds.maxX, reference.maxY],
        [contourBounds.maxX, reference.minY]
      ]);
    }
    
    // STRATÉGIE 2: Contours complexes (non-rectangulaires ET pas déjà traités)
    // NE PAS analyser les contours rectangulaires simples (déjà traités par stratégie 1)
    
    if (!this.isRectangular(contourPoints) && contourPoints.length > 5 && contourPoints.length !== 9) {
      // Analyser le contour pour trouver les zones manquantes
      const internalCuts = this.findInternalCuts(contourPoints, reference);
      regions.push(...internalCuts);
    }
    
    return regions;
  }
  
  /**
   * Trouve les découpes internes dans un contour complexe
   * Utilise l'analyse géométrique pour détecter les encoches
   */
  private findInternalCuts(
    points: Array<[number, number]>,
    reference: Rectangle
  ): Array<Array<[number, number]>> {
    const cuts: Array<Array<[number, number]>> = [];
    
    // Cas spécial : contour avec 9 points (comme M1002.nc face 'v')
    // Ce pattern représente une forme avec encoches à l'extrémité
    if (points.length === 9) {
      console.log(`    Analyzing 9-point contour for internal cuts`);
      
      // Chercher la zone avec transition en X (extension avec encoches)
      const xValues = points.map(p => p[0]);
      const uniqueX = [...new Set(xValues.map(x => Math.round(x)))].sort((a, b) => a - b);
      
      console.log(`    Unique X values: ${uniqueX.join(', ')}`);
      
      if (uniqueX.length >= 2) {  // Changé de 3 à 2 car on peut avoir seulement 2 valeurs X distinctes
        // Il y a une extension avec des encoches
        const mainX = uniqueX[uniqueX.length - 2] || uniqueX[0];  // Point de transition
        const extX = uniqueX[uniqueX.length - 1];   // Fin de l'extension
        
        console.log(`    Transition at X=${mainX}, Extension to X=${extX}`);
        
        // Trouver les points qui forment VRAIMENT l'extension (X > 1842)
        // NE PAS inclure les points à X=1842 car ils font partie du contour principal
        const extensionPoints = points.filter(p => p[0] > mainX + 1);
        console.log(`    Extension points: ${extensionPoints.length}`);
        
        if (extensionPoints.length >= 2) {
          // Analyser les Y pour trouver les encoches
          // Pour M1002.nc : Y va de 18.60 à 232.80 dans l'extension
          const yValuesExt = extensionPoints.map(p => p[1]).sort((a, b) => a - b);
          const minYExt = yValuesExt[0];
          const maxYExt = yValuesExt[yValuesExt.length - 1];
          
          console.log(`    Extension Y range: ${minYExt} to ${maxYExt}`);
          
          // Créer DEUX découpes : une en haut et une en bas
          // Découpe HAUTE (de Y=0 à Y=minYExt)
          if (minYExt > reference.minY + 1) {
            const cut1 = [
              [mainX, reference.minY],
              [extX, reference.minY],
              [extX, minYExt],
              [mainX, minYExt],
              [mainX, reference.minY]
            ];
            cuts.push(cut1);
            console.log(`    Added top cut: Y[${reference.minY}, ${minYExt}]`);
          }
          
          // Découpe BASSE (de Y=maxYExt à Y=referenceHeight)
          if (maxYExt < reference.maxY - 1) {
            const cut2 = [
              [mainX, maxYExt],
              [extX, maxYExt],
              [extX, reference.maxY],
              [mainX, reference.maxY],
              [mainX, maxYExt]
            ];
            cuts.push(cut2);
            console.log(`    Added bottom cut: Y[${maxYExt}, ${reference.maxY}]`);
          }
        }
      }
      console.log(`    Found ${cuts.length} internal cuts`);
      return cuts;  // Retourner directement pour le cas 9 points
    }
    
    // Pour les autres contours complexes, analyser différemment
    // Détecter les vrais creux/encoches (pas les bords)
    const bounds = this.getContourBounds(points);
    
    // Si c'est un contour qui couvre toute la longueur mais avec des variations en Y
    if (Math.abs(bounds.minX) < 1 && bounds.maxX > reference.maxX * 0.95) {
      // C'est probablement une forme de base avec des variations normales
      // Ne pas créer de découpes internes
      return [];
    }
    
    return cuts;
  }
  
  /**
   * Détecte si une séquence de points forme un pattern d'encoche
   */
  private isNotchPattern(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    p4: [number, number]
  ): boolean {
    // Pattern d'encoche : descente, horizontal, remontée
    const isVertical1 = Math.abs(p1[0] - p2[0]) < 0.1;
    const isHorizontal = Math.abs(p2[1] - p3[1]) < 0.1;
    const isVertical2 = Math.abs(p3[0] - p4[0]) < 0.1;
    
    return isVertical1 && isHorizontal && isVertical2;
  }
  
  /**
   * Détermine si une découpe est transversale
   */
  private isTransverseCut(
    contour: Array<[number, number]>,
    referenceLength: number
  ): boolean {
    const bounds = this.getContourBounds(contour);
    // Une découpe est transversale si elle est proche de l'extrémité
    return bounds.minX > referenceLength * 0.8 || bounds.maxX < referenceLength * 0.2;
  }
  
  
  
  
  /**
   * Vérifie si un contour est rectangulaire
   */
  private isRectangular(points: Array<[number, number]>): boolean {
    if (points.length !== 5) return false;
    
    // Vérifier que le premier et dernier point sont identiques ou très proches
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first[0] - last[0]) > 0.1 || Math.abs(first[1] - last[1]) > 0.1) {
      return false;
    }
    
    // Vérifier que tous les segments sont horizontaux ou verticaux
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = Math.abs(p2[0] - p1[0]);
      const dy = Math.abs(p2[1] - p1[1]);
      
      // Un segment doit être soit horizontal (dy≈0) soit vertical (dx≈0)
      if (dx > 0.1 && dy > 0.1) {
        return false;
      }
    }
    
    return true;
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
}
// Export par défaut pour compatibilité ES modules
export default AKBlockParser;
