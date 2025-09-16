/**
 * CutTypeDetector.ts - Détection automatique du type de coupe
 * Analyse la géométrie et les paramètres pour identifier le type de coupe approprié
 */

import { Feature } from '../../../types';
import { PivotElement } from '@/types/viewer';
import { CutType, CutParameters, ProfileType } from '../types/CutTypes';

/**
 * Classe pour détecter automatiquement le type de coupe
 */
export class CutTypeDetector {
  private static instance: CutTypeDetector;
  
  /**
   * Singleton pattern
   */
  static getInstance(): CutTypeDetector {
    if (!CutTypeDetector.instance) {
      CutTypeDetector.instance = new CutTypeDetector();
    }
    return CutTypeDetector.instance;
  }
  
  /**
   * Détecte le type de coupe principal
   */
  detect(feature: Feature, element: PivotElement): CutType {
    const params = feature.parameters as CutParameters;
    
    // 1. Vérifications prioritaires basées sur les paramètres explicites
    if (params.cutType === 'end_cut') {
      return this.detectEndCutType(params, element);
    }
    
    if (params.cutType === 'bevel') {
      return CutType.BEVEL_CUT;
    }
    
    if (params.cutType === 'chamfer') {
      return CutType.CHAMFER_CUT;
    }
    
    if (params.cutType === 'slot') {
      return CutType.SLOT_CUT;
    }
    
    if (params.cutType === 'coping') {
      return CutType.COPING_CUT;
    }
    
    if (params.cutType === 'notch') {
      return this.detectNotchType(params, element);
    }
    
    // 2. Détection basée sur l'analyse géométrique
    if (params.points && params.points.length >= 3) {
      return this.detectFromContour(params, element);
    }
    
    // 3. Détection basée sur la position
    if (this.isAtExtremity(params, element)) {
      return this.detectEndCutType(params, element);
    }
    
    // 4. Type par défaut selon la profondeur
    if (params.depth === 0 || !params.depth) {
      return CutType.THROUGH_CUT;
    }
    
    return CutType.PARTIAL_CUT;
  }
  
  /**
   * Détecte le sous-type de coupe d'extrémité
   */
  private detectEndCutType(params: CutParameters, _element: PivotElement): CutType {
    // Angle de coupe défini
    if (params.angle && params.angle !== 90) {
      if (params.chamferSize) {
        return CutType.END_CHAMFER;
      }
      return CutType.END_ANGLE;
    }
    
    // Contour complexe avec multiples angles
    if (params.points && this.hasMultipleAngles(params.points)) {
      return CutType.END_COMPOUND;
    }
    
    // Coupe droite par défaut
    return CutType.END_STRAIGHT;
  }
  
  /**
   * Détecte le sous-type d'encoche
   */
  private detectNotchType(params: CutParameters, element: PivotElement): CutType {
    if (!params.points || params.points.length < 3) {
      return CutType.NOTCH_RECTANGULAR;
    }
    
    // Détection d'encoche courbe
    if (this.hasCurvedSegments(params.points)) {
      return CutType.NOTCH_CURVED;
    }
    
    // Détection d'encoche complexe
    if (params.points.length > 6) {
      return CutType.NOTCH_COMPOUND;
    }
    
    // Encoche partielle si profondeur limitée
    const profileThickness = this.getProfileThickness(element);
    if (params.depth && params.depth < profileThickness * 0.9) {
      return CutType.NOTCH_PARTIAL;
    }
    
    return CutType.NOTCH_RECTANGULAR;
  }
  
  /**
   * Détecte le type depuis l'analyse du contour
   */
  private detectFromContour(params: CutParameters, element: PivotElement): CutType {
    const points = params.points!;
    const dims = element.dimensions || {};
    
    // Détection de bevel cut (coupe biseautée)
    if (this.isBevelCut(points, params)) {
      return CutType.BEVEL_CUT;
    }
    
    // Détection de contour complexe non restreint
    if (points.length > 8 && this.hasIrregularPattern(points)) {
      return CutType.UNRESTRICTED_CONTOUR;
    }
    
    // Détection selon la position relative
    const bounds = this.calculateBounds(points);
    if (this.isExteriorCut(bounds, dims)) {
      return CutType.EXTERIOR_CUT;
    }
    
    if (this.isInteriorCut(bounds, dims)) {
      return CutType.INTERIOR_CUT;
    }
    
    // Détection d'encoche
    if (this.isNotchPattern(points, bounds, dims)) {
      return this.detectNotchType(params, element);
    }
    
    // Contour générique par défaut
    return CutType.CONTOUR_CUT;
  }
  
  /**
   * Vérifie si la coupe est à l'extrémité
   */
  private isAtExtremity(params: CutParameters, element: PivotElement): boolean {
    if (!params.position && !params.points) {
      return false;
    }
    
    const dims = element.dimensions || {};
    const length = dims.length || 1000;
    const threshold = length * 0.05; // 5% de la longueur
    
    if (params.position) {
      return params.position.x < threshold || params.position.x > length - threshold;
    }
    
    if (params.points) {
      const bounds = this.calculateBounds(params.points);
      return bounds.minX < threshold || bounds.maxX > length - threshold;
    }
    
    return false;
  }
  
  /**
   * Détecte si le contour a plusieurs angles
   */
  private hasMultipleAngles(points: Array<[number, number]>): boolean {
    if (points.length < 4) return false;
    
    let angleChanges = 0;
    let lastAngle: number | null = null;
    
    for (let i = 0; i < points.length - 1; i++) {
      const angle = Math.atan2(
        points[i + 1][1] - points[i][1],
        points[i + 1][0] - points[i][0]
      );
      
      if (lastAngle !== null && Math.abs(angle - lastAngle) > 0.1) {
        angleChanges++;
      }
      lastAngle = angle;
    }
    
    return angleChanges > 2;
  }
  
  /**
   * Détecte si le contour a des segments courbes
   */
  private hasCurvedSegments(points: Array<[number, number]>): boolean {
    if (points.length < 8) return false;
    
    // Analyse de colinéarité pour détecter les courbes
    for (let i = 0; i < points.length - 2; i++) {
      const v1 = {
        x: points[i + 1][0] - points[i][0],
        y: points[i + 1][1] - points[i][1]
      };
      const v2 = {
        x: points[i + 2][0] - points[i + 1][0],
        y: points[i + 2][1] - points[i + 1][1]
      };
      
      // Produit vectoriel pour détecter la courbure
      const cross = v1.x * v2.y - v1.y * v2.x;
      if (Math.abs(cross) > 0.01) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Détecte une coupe biseautée
   */
  private isBevelCut(points: Array<[number, number]>, params: CutParameters): boolean {
    // Bevel explicite
    if (params.bevelAngle && params.bevelAngle !== 90) {
      return true;
    }
    
    // Détection par analyse géométrique (4 points formant un biseau)
    if (points.length === 4) {
      const angles = this.calculateAngles(points);
      // Si deux angles opposés sont égaux et non droits
      if (angles.length === 4 && 
          Math.abs(angles[0] - angles[2]) < 5 &&
          Math.abs(angles[0] - 90) > 10) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Détecte un motif irrégulier
   */
  private hasIrregularPattern(points: Array<[number, number]>): boolean {
    // Calcul de la variance des distances entre points
    const distances: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dist = Math.sqrt(
        Math.pow(points[i + 1][0] - points[i][0], 2) +
        Math.pow(points[i + 1][1] - points[i][1], 2)
      );
      distances.push(dist);
    }
    
    const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / distances.length;
    
    // Pattern irrégulier si variance élevée
    return variance > avg * 0.5;
  }
  
  /**
   * Vérifie si c'est une coupe extérieure
   */
  private isExteriorCut(bounds: any, dims: any): boolean {
    const length = dims.length || 1000;
    const height = dims.height || 300;
    
    // Coupe aux extrémités en X
    if (bounds.minX < length * 0.1 || bounds.maxX > length * 0.9) {
      return true;
    }
    
    // Coupe aux bords en Y
    if (bounds.minY < height * 0.1 || bounds.maxY > height * 0.9) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Vérifie si c'est une coupe intérieure
   */
  private isInteriorCut(bounds: any, dims: any): boolean {
    const length = dims.length || 1000;
    const height = dims.height || 300;
    
    // Coupe centrale
    return bounds.minX > length * 0.2 && 
           bounds.maxX < length * 0.8 &&
           bounds.minY > height * 0.2 && 
           bounds.maxY < height * 0.8;
  }
  
  /**
   * Détecte un pattern d'encoche
   */
  private isNotchPattern(points: Array<[number, number]>, bounds: any, dims: any): boolean {
    // Pattern rectangulaire typique d'une encoche
    if (points.length >= 4 && points.length <= 6) {
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const aspectRatio = width / height;
      
      // Encoche typique : plus large que haute ou carrée
      if (aspectRatio > 0.5 && aspectRatio < 3) {
        // Position typique d'encoche
        return bounds.minX < dims.length * 0.3 || bounds.maxX > dims.length * 0.7;
      }
    }
    
    return false;
  }
  
  /**
   * Calcule les limites d'un contour
   */
  private calculateBounds(points: Array<[number, number]>): {
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
   * Calcule les angles d'un polygone
   */
  private calculateAngles(points: Array<[number, number]>): number[] {
    const angles: number[] = [];
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      
      const v1 = { x: p1[0] - p2[0], y: p1[1] - p2[1] };
      const v2 = { x: p3[0] - p2[0], y: p3[1] - p2[1] };
      
      const angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
      angles.push(Math.abs(angle * 180 / Math.PI));
    }
    
    return angles;
  }
  
  /**
   * Obtient l'épaisseur du profil selon son type
   */
  private getProfileThickness(element: PivotElement): number {
    const dims = element.dimensions || {};
    
    const profileType = this.getProfileType(element);
    switch (profileType) {
      case ProfileType.PLATE:
        return dims.thickness || 10;
      case ProfileType.TUBE_RECT:
      case ProfileType.TUBE_ROUND:
        return dims.thickness || 5; // Épaisseur de paroi
      default:
        return dims.webThickness || dims.thickness || 10;
    }
  }
  
  /**
   * Détermine le type de profil
   */
  getProfileType(element: PivotElement): ProfileType {
    const metadata = element.metadata || {};
    const profileName = metadata.profileName || '';
    const profileType = metadata.profileType || '';
    
    // Détection par type explicite
    if (profileType) {
      if (profileType.includes('TUBE_RECT')) return ProfileType.TUBE_RECT;
      if (profileType.includes('TUBE_ROUND')) return ProfileType.TUBE_ROUND;
      if (profileType.includes('I_')) return ProfileType.I_PROFILE;
      if (profileType.includes('U_')) return ProfileType.U_PROFILE;
      if (profileType.includes('L_')) return ProfileType.L_PROFILE;
      if (profileType.includes('PLATE')) return ProfileType.PLATE;
    }
    
    // Détection par nom de profil
    if (profileName.includes('IPE') || profileName.includes('HE') || 
        profileName.includes('UB') || profileName.includes('UC')) {
      return ProfileType.I_PROFILE;
    }
    if (profileName.includes('UPN') || profileName.includes('UAP')) {
      return ProfileType.U_PROFILE;
    }
    if (profileName.includes('L') && /\d+x\d+/.test(profileName)) {
      return ProfileType.L_PROFILE;
    }
    if (profileName.includes('RHS') || profileName.includes('SHS') || 
        profileName.includes('HSS')) {
      return ProfileType.TUBE_RECT;
    }
    if (profileName.includes('CHS')) {
      return ProfileType.TUBE_ROUND;
    }
    if (profileName.includes('PL') || profileName.includes('PLATE')) {
      return ProfileType.PLATE;
    }
    
    return ProfileType.CUSTOM;
  }
}