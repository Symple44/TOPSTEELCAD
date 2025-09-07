/**
 * CutCategoryDetector - Détecte et catégorise les types de coupes
 * Classifie les coupes en : EXTERIOR, INTERIOR, NOTCH
 */

import { Feature, ProfileFace } from '../types';
import { PivotElement } from '@/types/viewer';

export enum CutCategory {
  EXTERIOR = 'EXTERIOR',     // Coupes modifiant le contour externe
  INTERIOR = 'INTERIOR',     // Découpes intérieures (trous, ouvertures)
  NOTCH = 'NOTCH',          // Encoches partielles préservant une partie
  MIXED = 'MIXED'           // Combinaison (ex: coupe avec encoches)
}

export enum CutType {
  // Coupes extérieures
  STRAIGHT_CUT = 'STRAIGHT_CUT',           // Coupe droite perpendiculaire
  ANGLE_CUT = 'ANGLE_CUT',                 // Coupe d'angle complète aux extrémités
  BEVEL_CUT = 'BEVEL_CUT',                 // Chanfrein/préparation de soudure
  CONTOUR_CUT = 'CONTOUR_CUT',            // Redéfinition du contour
  
  // Coupes intérieures
  HOLE = 'HOLE',                           // Trou circulaire
  OBLONG_HOLE = 'OBLONG_HOLE',            // Trou oblong
  RECTANGULAR_CUTOUT = 'RECTANGULAR_CUTOUT', // Découpe rectangulaire
  COMPLEX_CUTOUT = 'COMPLEX_CUTOUT',      // Découpe forme complexe
  
  // Encoches
  PARTIAL_NOTCH = 'PARTIAL_NOTCH',        // Encoche partielle simple
  COPE_NOTCH = 'COPE_NOTCH',              // Encoche d'assemblage
  COMPLEX_NOTCH = 'COMPLEX_NOTCH',        // Encoche avec préservation (M1002)
  
  // Mixte
  CUT_WITH_NOTCHES = 'CUT_WITH_NOTCHES',  // Coupe avec encoches préservées
  
  // Indéterminé
  UNKNOWN = 'UNKNOWN'
}

export class CutCategoryDetector {
  
  /**
   * Normalise les points vers le format [number, number][]
   */
  private normalizePoints(points: Array<[number, number] | { x: number; y: number }>): Array<[number, number]> {
    return points.map(p => {
      if (Array.isArray(p)) {
        return p;
      } else {
        return [p.x, p.y] as [number, number];
      }
    });
  }
  
  /**
   * Détecte la catégorie principale de la coupe
   */
  detectCategory(feature: Feature, element: PivotElement): CutCategory {
    const contourPoints = feature.parameters?.points || [];
    const cutType = feature.parameters?.cutType;
    const face = feature.face;
    const profileType = element.metadata?.profileType;
    
    // Vérification explicite du type de coupe si défini
    if (cutType === 'partial_notches' || cutType === 'cut_with_notches') {
      return CutCategory.MIXED;
    }
    
    // Analyse basée sur la position et la géométrie
    if (this.isInteriorCut(contourPoints as Array<[number, number]>, element)) {
      return CutCategory.INTERIOR;
    }
    
    if (this.isNotch(contourPoints as Array<[number, number]>, element, face)) {
      return CutCategory.NOTCH;
    }
    
    if (this.isMixedCut(contourPoints as Array<[number, number]>, element)) {
      return CutCategory.MIXED;
    }
    
    // Par défaut, les coupes AK sont extérieures
    return CutCategory.EXTERIOR;
  }
  
  /**
   * Détecte le type spécifique de coupe
   */
  detectType(feature: Feature, element: PivotElement): CutType {
    const contourPoints = feature.parameters?.points || [];
    const cutType = feature.parameters?.cutType;
    const face = feature.face;
    const profileType = element.metadata?.profileType;
    const category = this.detectCategory(feature, element);
    
    console.log(`🔍 CutCategoryDetector.detectType for ${feature.id}:`);
    console.log(`   cutType parameter: "${cutType}"`);
    console.log(`   profileType: "${profileType}"`);
    console.log(`   face: "${face}"`);
    
    // Types explicites depuis DSTV
    if (cutType === 'partial_notches') {
      console.log(`   ✅ FORCING CUT_WITH_NOTCHES for M1002 pattern`);
      return CutType.CUT_WITH_NOTCHES;
    }
    
    if (cutType === 'hole') {
      return CutType.HOLE;
    }
    
    // NOUVEAU - PRIORITÉ 1: Détecter les coupes d'extrémités pour tubes/profilés
    const isTube = profileType?.includes('TUBE') || profileType?.includes('HSS');
    const isProfile = profileType === 'I_PROFILE' || profileType === 'H_PROFILE' || profileType === 'U_PROFILE' || profileType === 'L_PROFILE';
    
    if (isTube || isProfile) {
      if (this.isEndCut(feature, element)) {
        console.log(`  🔪 END CUT detected for ${profileType}: angles may indicate assembly preparation, not bevel`);
        return CutType.ANGLE_CUT; // Les coupes d'extrémité peuvent avoir des angles d'assemblage
      }
    }
    
    // PRIORITÉ 2: BEVEL CUT uniquement pour platines
    const bevelDetection = this.isBevelCut(feature, element);
    if (bevelDetection.isBevel) {
      console.log(`  🔥 BEVEL CUT detected: confidence=${bevelDetection.confidence.toFixed(2)}, reason="${bevelDetection.reason}"`);
      return CutType.BEVEL_CUT;
    }
    
    // Analyse selon la catégorie
    switch (category) {
      case CutCategory.EXTERIOR:
        return this.detectExteriorType(contourPoints as Array<[number, number]>, element);
        
      case CutCategory.INTERIOR:
        return this.detectInteriorType(contourPoints as Array<[number, number]>, element);
        
      case CutCategory.NOTCH:
        return this.detectNotchType(contourPoints as Array<[number, number]>, element, face);
        
      case CutCategory.MIXED:
        return CutType.CUT_WITH_NOTCHES;
        
      default:
        return CutType.UNKNOWN;
    }
  }
  
  /**
   * Détecte si c'est une coupe intérieure
   */
  private isInteriorCut(points: Array<[number, number]>, element: PivotElement): boolean {
    if (points.length < 3) return false;
    
    const dims = element.dimensions || {};
    const length = dims.length || 1000;
    const width = dims.width || 100;
    const height = dims.height || 200;
    
    // Vérifier si le contour est entièrement à l'intérieur
    const bounds = this.getContourBounds(points);
    const margin = 5; // 5mm de marge
    
    // Si le contour ne touche aucun bord, c'est intérieur
    const isInsideLength = bounds.minX > margin && bounds.maxX < (length - margin);
    const isInsideWidth = bounds.minY > margin && bounds.maxY < (Math.max(width, height) - margin);
    
    return isInsideLength && isInsideWidth;
  }
  
  /**
   * Détecte si c'est une encoche
   */
  private isNotch(points: Array<[number, number]>, element: PivotElement, face?: ProfileFace): boolean {
    if (points.length < 4) return false;
    
    const dims = element.dimensions || {};
    const length = dims.length || 1000;
    
    // Une encoche touche un bord mais pas toute la largeur/hauteur
    const bounds = this.getContourBounds(points);
    const touchesStart = bounds.minX < 1;
    const touchesEnd = bounds.maxX > (length - 1);
    const partialWidth = (bounds.maxY - bounds.minY) < (dims.height || 200) * 0.8;
    
    return (touchesStart || touchesEnd) && partialWidth;
  }
  
  /**
   * Détecte si c'est une coupe mixte (avec encoches préservées)
   */
  private isMixedCut(points: Array<[number, number]>, element: PivotElement): boolean {
    // Pattern M1002 : 8-9 points avec forme complexe
    if (points.length >= 8 && points.length <= 9) {
      // Vérifier la complexité de la forme
      return this.hasComplexPattern(points);
    }
    
    return false;
  }
  
  /**
   * NOUVEAU - Détecte les coupes d'extrémités pour tubes et profilés
   * Les coupes aux extrémités (0-5% ou 95-100% de la longueur) ne sont jamais des bevel cuts
   */
  private isEndCut(feature: Feature, element: PivotElement): boolean {
    const params = feature.parameters || {};
    const points = params.points || [];
    
    if (points.length < 3) return false;
    
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const bounds = this.getContourBounds(this.normalizePoints(points));
    
    // Marge de 5% aux extrémités pour considérer comme coupe d'extrémité
    const startThreshold = profileLength * 0.05;
    const endThreshold = profileLength * 0.95;
    
    // Coupe au début (0-5% de la longueur)
    const isAtStart = bounds.minX <= startThreshold;
    
    // Coupe à la fin (95-100% de la longueur)  
    const isAtEnd = bounds.maxX >= endThreshold;
    
    // Analyser si c'est bien une coupe d'extrémité (pas une forme de préservation)
    if (isAtStart || isAtEnd) {
      // Pour h5004: les coupes d'extrémité peuvent avoir des angles d'assemblage
      // mais ce ne sont pas des bevel cuts de soudure
      const lengthCoverage = bounds.maxX - bounds.minX;
      const isSignificantCut = lengthCoverage > profileLength * 0.05; // Au moins 5% de longueur
      
      return isSignificantCut;
    }
    
    return false;
  }
  
  /**
   * Détecte le type spécifique de coupe extérieure
   */
  private detectExteriorType(points: Array<[number, number]>, element: PivotElement): CutType {
    const dims = element.dimensions || {};
    const length = dims.length || 1000;
    const width = dims.width || 100;
    
    // Rectangle sur semelle qui commence à 0 = CONTOUR de redéfinition
    if (points.length === 5 && this.isRectangular(points)) {
      const bounds = this.getContourBounds(points);
      
      // Si le rectangle commence à 0 et couvre toute la largeur de la semelle
      // C'est une redéfinition du contour final, pas une coupe
      if (bounds.minX < 1 && bounds.maxX < length - 10) {
        // Rectangle couvrant de 0 à une valeur < longueur totale
        // = définition de la forme finale après coupe
        return CutType.CONTOUR_CUT;
      }
      
      return CutType.STRAIGHT_CUT;
    }
    
    // Coupe d'angle : 4-5 points avec angle diagonal
    if (points.length >= 4 && points.length <= 6 && !this.isRectangular(points)) {
      // Vérifier si c'est une coupe d'angle complète (pas un bevel)
      if (this.isFullAngleCut(points, element)) {
        return CutType.ANGLE_CUT;
      }
    }
    
    // Contour complexe : redéfinition complète
    if (points.length > 5) {
      const bounds = this.getContourBounds(points);
      // Si le contour couvre toute la longueur, c'est une redéfinition
      if (Math.abs(bounds.maxX - bounds.minX - length) < 10) {
        return CutType.CONTOUR_CUT;
      }
    }
    
    return CutType.ANGLE_CUT;
  }
  
  /**
   * Détecte le type spécifique de coupe intérieure
   */
  private detectInteriorType(points: Array<[number, number]>, element: PivotElement): CutType {
    // Trou : forme circulaire (paramètre diameter présent)
    if (element.features?.some(f => (f as any).parameters?.diameter)) {
      return CutType.HOLE;
    }
    
    // Rectangle : 4-5 points formant un rectangle
    if (points.length === 5 && this.isRectangular(points)) {
      return CutType.RECTANGULAR_CUTOUT;
    }
    
    // Oblong : forme allongée avec coins arrondis
    if (this.isOblong(points)) {
      return CutType.OBLONG_HOLE;
    }
    
    // Forme complexe
    return CutType.COMPLEX_CUTOUT;
  }
  
  /**
   * Détecte le type spécifique d'encoche
   */
  private detectNotchType(points: Array<[number, number]>, element: PivotElement, face?: ProfileFace): CutType {
    // Encoche d'assemblage (cope) : sur semelle pour assemblage
    if (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
      return CutType.COPE_NOTCH;
    }
    
    // Encoche complexe : pattern M1002
    if (points.length >= 8) {
      return CutType.COMPLEX_NOTCH;
    }
    
    return CutType.PARTIAL_NOTCH;
  }
  
  /**
   * Vérifie si les points forment un rectangle
   */
  private isRectangular(points: Array<[number, number]>): boolean {
    if (points.length !== 5) return false;
    
    // Un rectangle a 4 angles droits
    // Vérifier l'alignement des points
    const xs = points.map(p => p[0]).filter((v, i, a) => a.indexOf(v) === i);
    const ys = points.map(p => p[1]).filter((v, i, a) => a.indexOf(v) === i);
    
    // Un rectangle parfait a exactement 2 valeurs X et 2 valeurs Y uniques
    return xs.length === 2 && ys.length === 2;
  }
  
  /**
   * Vérifie si la forme est oblongue
   */
  private isOblong(points: Array<[number, number]>): boolean {
    if (points.length < 8) return false;
    
    const bounds = this.getContourBounds(points);
    const ratio = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
    
    // Oblong si ratio > 2 ou < 0.5
    return ratio > 2 || ratio < 0.5;
  }
  
  /**
   * Vérifie si c'est une coupe d'angle complète (pas un simple chanfrein)
   */
  private isFullAngleCut(points: Array<[number, number]>, element: PivotElement): boolean {
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    
    // Une coupe d'angle complète est aux extrémités du profil
    const isAtStart = bounds.minX < 100;
    const isAtEnd = bounds.maxX > profileLength - 100;
    
    if (!isAtStart && !isAtEnd) {
      return false; // Pas aux extrémités
    }
    
    // Vérifier la présence d'un segment diagonal significatif
    for (let i = 1; i < points.length; i++) {
      const dx = Math.abs(points[i][0] - points[i-1][0]);
      const dy = Math.abs(points[i][1] - points[i-1][1]);
      
      // Un segment diagonal significatif (pas juste un petit chanfrein)
      if (dx > 20 && dy > 20) {
        const ratio = Math.min(dx, dy) / Math.max(dx, dy);
        // Angle entre 15° et 75° (ratio entre 0.27 et 1)
        if (ratio > 0.25) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Vérifie si le contour a un pattern complexe
   */
  private hasComplexPattern(points: Array<[number, number]>): boolean {
    // Analyser les changements de direction
    let directionChanges = 0;
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      const dir1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
      const dir2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
      
      if (Math.abs(dir2 - dir1) > Math.PI / 4) {
        directionChanges++;
      }
    }
    
    // Pattern complexe si plus de 4 changements de direction
    return directionChanges > 4;
  }
  
  /**
   * CORRIGÉ - Détection des bevel cuts UNIQUEMENT pour platines
   * Les bevel cuts sont des chanfreins de préparation de soudure sur platines/tôles
   * RÈGLE: Jamais de bevel cut sur tubes, profilés I/H/U/L - ce sont des END_CUTS
   */
  private isBevelCut(feature: Feature, element: PivotElement): {
    isBevel: boolean;
    confidence: number;
    reason: string;
    detectedAngles?: number[];
  } {
    const params = feature.parameters || {};
    const points = params.points || [];
    const profileType = element.metadata?.profileType;
    
    // VALIDATION PRÉALABLE: Bevel cuts uniquement pour platines
    const isPlate = profileType === 'PLATE' || profileType === 'FLAT_BAR' || profileType === 'SHEET';
    if (!isPlate) {
      return {
        isBevel: false,
        confidence: 0,
        reason: `Bevel cuts restricted to plates only. Profile type: ${profileType} → use END_CUT instead`
      };
    }
    
    // CRITÈRE 1: Paramètres de soudure explicites DSTV (pour platines uniquement)
    if ((params as any).weldPreparation || (params as any).bevelAngle) {
      return {
        isBevel: true,
        confidence: 0.95,
        reason: 'Explicit DSTV welding parameters found on plate'
      };
    }
    
    // CRITÈRE 2: Détection des angles négatifs pour platines (chanfreins de soudage)
    if ((params as any).rawData && Array.isArray((params as any).rawData)) {
      const negativeAngles = (params as any).rawData
        .filter((val: any) => {
          if (typeof val === 'number' || typeof val === 'string') {
            const numVal = parseFloat(String(val));
            // Angles de chanfrein DSTV standard pour platines: -75° à -15°
            return numVal < -15 && numVal > -75;
          }
          return false;
        })
        .map((val: any) => parseFloat(String(val)));
        
      if (negativeAngles.length > 0) {
        return {
          isBevel: true,
          confidence: 0.85,
          reason: `Plate bevel angles detected: ${negativeAngles.join(', ')}°`,
          detectedAngles: negativeAngles
        };
      }
    }
    
    // CRITÈRE 3: Plus de logique spéciale pour tubes - tout a été déplacé vers END_CUT
    // Les platines peuvent avoir une analyse géométrique pour bevel cuts si nécessaire
    
    // Pour les platines, on peut ajouter ici des analyses géométriques spécifiques
    if (false) { // Code désactivé temporairement
      const normalizedPts = this.normalizePoints(points);
      const bounds = this.getContourBounds(normalizedPts);
      const dims = element.dimensions || {};
      const profileLength = dims.length || 1000;
      const profileHeight = dims.height || 50;
      
      // Vérifier si c'est aux extrémités (condition bevel cut)
      const isAtStart = bounds.minX < 100;
      const isAtEnd = bounds.maxX > profileLength - 100;
      const atExtremity = isAtStart || isAtEnd;
      
      if (atExtremity) {
        // Analyser la taille relative pour distinguer bevel vs angle cut
        const cutWidth = bounds.maxX - bounds.minX;
        const cutHeight = bounds.maxY - bounds.minY;
        
        const widthRatio = cutWidth / profileLength;
        const heightRatio = cutHeight / profileHeight;
        
        // Bevel cut = petit chanfrein (< 15% des dimensions)
        // Angle cut = coupe diagonale complète (> 20% des dimensions)
        const isBevelSize = (widthRatio < 0.15 && heightRatio < 0.8) || 
                           (heightRatio < 0.15 && widthRatio < 0.8);
        
        if (isBevelSize) {
          return {
            isBevel: true,
            confidence: 0.75,
            reason: `HSS tube small cut at extremity: ${cutWidth.toFixed(1)}x${cutHeight.toFixed(1)}mm (${(widthRatio*100).toFixed(1)}%x${(heightRatio*100).toFixed(1)}%)`
          };
        }
      }
    }
    
    // CRITÈRE 4: Analyse des segments diagonaux (bevel vs angle)
    if (points.length >= 4 && points.length <= 6) {
      const normalizedPoints = this.normalizePoints(points);
      const diagonalSegments = this.detectDiagonalSegments(normalizedPoints);
      
      if (diagonalSegments.length > 0) {
        const maxDiagonalLength = Math.max(...diagonalSegments.map(s => s.length));
        const avgDiagonalAngle = diagonalSegments.reduce((sum, s) => sum + Math.abs(s.angle), 0) / diagonalSegments.length;
        
        // Bevel cut = segments diagonaux courts avec angles typés (30-60°)
        const isBevelPattern = maxDiagonalLength < 100 && 
                              avgDiagonalAngle > 30 && avgDiagonalAngle < 60;
        
        if (isBevelPattern) {
          return {
            isBevel: true,
            confidence: 0.65,
            reason: `Geometric bevel pattern: ${diagonalSegments.length} diagonal segments, max=${maxDiagonalLength.toFixed(1)}mm, avg angle=${avgDiagonalAngle.toFixed(1)}°`
          };
        }
      }
    }
    
    return {
      isBevel: false,
      confidence: 0.0,
      reason: 'No bevel cut indicators found'
    };
  }
  
  /**
   * PHASE 2 - Détection des segments diagonaux avec analyse d'angle
   */
  private detectDiagonalSegments(points: Array<[number, number]>): Array<{
    index: number;
    angle: number;
    length: number;
  }> {
    const segments = [];
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Segment diagonal significatif
      if (Math.abs(dx) > 5 && Math.abs(dy) > 5) { // Seuil abaissé pour détecter les petits bevel cuts
        const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        segments.push({ index: i, angle, length });
      }
    }
    
    return segments;
  }
  
  /**
   * Calcule les limites du contour
   */
  private getContourBounds(points: Array<[number, number]>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    return { minX, maxX, minY, maxY };
  }
}

// Export singleton instance
export const cutCategoryDetector = new CutCategoryDetector();