/**
 * StraightCutStrategy - Stratégie pour les coupes droites perpendiculaires
 * Gère les coupes rectangulaires perpendiculaires à l'axe du profil
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace } from '../../types';
import { ExteriorCutStrategy } from './ExteriorCutStrategy';

/**
 * Stratégie pour les coupes droites (perpendiculaires)
 * Utilisée pour les découpes rectangulaires simples qui coupent perpendiculairement à l'axe
 */
export class StraightCutStrategy extends ExteriorCutStrategy {
  readonly name = 'StraightCut';
  
  canHandle(feature: Feature): boolean {
    // Vérifier d'abord que c'est une coupe extérieure
    if (!super.canHandle(feature)) {
      return false;
    }
    
    // Détecter si c'est spécifiquement une coupe droite via l'analyse des points
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    // Une coupe droite a typiquement 4-5 points formant un rectangle
    if (points.length >= 4 && points.length <= 5) {
      return this.isRectangular(points);
    }
    return false;
  }
  
  protected validateExteriorSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    // Vérifier que c'est bien rectangulaire (4-5 points)
    if (points.length < 4 || points.length > 5) {
      errors.push('Straight cut must have 4-5 points forming a rectangle');
      return;
    }
    
    // Vérifier que les points forment un rectangle
    if (!this.isRectangular(points)) {
      errors.push('Straight cut points must form a perfect rectangle');
    }
    
    // Vérifier que la coupe est perpendiculaire (pas d'angle)
    if (!this.isPerpendicular(points)) {
      errors.push('Straight cut must be perpendicular to the profile axis');
    }
  }
  
  protected createExteriorGeometry(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    console.log(`🔪 Creating straight cut geometry with ${points.length} points`);
    
    // Pour une coupe droite, créer un BoxGeometry simple et efficace
    const bounds = this.getContourBounds(points);
    const cutWidth = bounds.maxX - bounds.minX;
    const cutHeight = bounds.maxY - bounds.minY;
    
    // Calculer les dimensions du profil pour le centrage
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const profileWidth = dims.width || 150;
    
    console.log(`  Cut dimensions: ${cutWidth.toFixed(1)}mm x ${cutHeight.toFixed(1)}mm`);
    console.log(`  Profile dimensions: L=${profileLength}mm H=${profileHeight}mm W=${profileWidth}mm`);
    
    // Créer une BoxGeometry selon la face
    let geometry: THREE.BufferGeometry;
    
    if (this.isTubeProfile(element)) {
      // Pour les tubes, adapter selon la face
      geometry = this.createTubeStraightCut(bounds, depth, face, element);
    } else {
      // Pour les profils I/H standards
      geometry = this.createIBeamStraightCut(bounds, depth, face, element);
    }
    
    // Positionner la géométrie
    this.positionGeometry(geometry, bounds, face, element);
    
    return geometry;
  }
  
  /**
   * Crée une coupe droite pour un profil tubulaire
   */
  private createTubeStraightCut(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const cutWidth = bounds.maxX - bounds.minX;
    const cutHeight = bounds.maxY - bounds.minY;
    const wallThickness = element.dimensions?.thickness || 5;
    
    // Pour un tube, la profondeur doit traverser l'épaisseur de paroi
    const actualDepth = wallThickness * 2;
    
    console.log(`  Tube cut: traversing wall thickness ${wallThickness}mm`);
    
    // Orientation selon la face du tube avec support face 'h'
    switch (face) {
      case ProfileFace.FRONT: // face 'v' - avant du tube
      case ProfileFace.WEB:
      case 'v' as any:
        return new THREE.BoxGeometry(actualDepth, cutHeight, cutWidth);
        
      case ProfileFace.TOP: // face 'o' - dessus du tube  
      case ProfileFace.TOP_FLANGE:
      case 'o' as any:
        return new THREE.BoxGeometry(cutWidth, actualDepth, cutHeight);
        
      case ProfileFace.BOTTOM: // face 'u' - dessous du tube
      case ProfileFace.BOTTOM_FLANGE:
      case 'u' as any:
        return new THREE.BoxGeometry(cutWidth, actualDepth, cutHeight);
        
      case ProfileFace.BACK: // face 'h' - arrière du tube
      case 'h' as any:
        return new THREE.BoxGeometry(actualDepth, cutHeight, cutWidth);
        
      default:
        return new THREE.BoxGeometry(cutWidth, cutHeight, actualDepth);
    }
  }
  
  /**
   * Crée une coupe droite pour un profil I/H
   */
  private createIBeamStraightCut(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const cutWidth = bounds.maxX - bounds.minX;
    const cutHeight = bounds.maxY - bounds.minY;
    
    console.log(`  I-Beam cut on face ${face}`);
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE: {
        // Pour les ailes, créer une découpe qui traverse l'épaisseur
        const flangeThickness = element.dimensions?.flangeThickness || 50;
        return new THREE.BoxGeometry(cutWidth, flangeThickness, cutHeight);
      }
        
      case ProfileFace.WEB:
      default:
        // Pour l'âme, utiliser la profondeur fournie
        return new THREE.BoxGeometry(cutWidth, cutHeight, depth);
    }
  }
  
  /**
   * Positionne la géométrie de coupe
   */
  private positionGeometry(
    geometry: THREE.BufferGeometry,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    face: ProfileFace | undefined,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const profileWidth = dims.width || 150;
    
    // Position X (le long de la poutre)
    const centerX = (bounds.minX + bounds.maxX) / 2 - profileLength / 2;
    
    // Position Y et Z selon la face
    let centerY = 0;
    let centerZ = 0;
    
    if (this.isTubeProfile(element)) {
      // Positionnement pour tubes
      centerY = (bounds.minY + bounds.maxY) / 2 - profileHeight / 2;
      centerZ = 0;
      
      // Ajustement selon la face pour tubes
      switch (face) {
        case ProfileFace.FRONT:
        case ProfileFace.WEB:
        case 'v' as any:
          centerZ = profileWidth / 2; // Face avant
          break;
        case ProfileFace.TOP:
        case ProfileFace.TOP_FLANGE:
        case 'o' as any:
          centerY = profileHeight / 2; // Face supérieure
          break;
        case ProfileFace.BOTTOM:
        case ProfileFace.BOTTOM_FLANGE:
        case 'u' as any:
          centerY = -profileHeight / 2; // Face inférieure
          break;
        case ProfileFace.BACK:
        case 'h' as any:
          centerZ = -profileWidth / 2; // Face arrière
          break;
      }
    } else {
      // Positionnement pour profils I/H
      switch (face) {
        case ProfileFace.TOP_FLANGE:
          centerY = profileHeight / 2 - (dims.flangeThickness || 10) / 2;
          centerZ = (bounds.minY + bounds.maxY) / 2 - profileWidth / 2;
          break;
          
        case ProfileFace.BOTTOM_FLANGE:
          centerY = -profileHeight / 2 + (dims.flangeThickness || 10) / 2;
          centerZ = (bounds.minY + bounds.maxY) / 2 - profileWidth / 2;
          break;
          
        case ProfileFace.WEB:
        default:
          centerY = (bounds.minY + bounds.maxY) / 2 - profileHeight / 2;
          centerZ = 0;
          break;
      }
    }
    
    geometry.translate(centerX, centerY, centerZ);
    console.log(`  Positioned at: X=${centerX.toFixed(1)}, Y=${centerY.toFixed(1)}, Z=${centerZ.toFixed(1)}`);
  }
  
  /**
   * Vérifie si les points forment un rectangle parfait
   */
  private isRectangular(points: Array<[number, number] | { x: number; y: number }>): boolean {
    if (points.length < 4) return false;
    
    // Extraire les coordonnées X et Y uniques
    const xs = new Set<number>();
    const ys = new Set<number>();
    
    for (const point of points) {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      xs.add(x);
      ys.add(y);
    }
    
    // Un rectangle parfait a exactement 2 valeurs X et 2 valeurs Y distinctes
    return xs.size === 2 && ys.size === 2;
  }
  
  /**
   * Vérifie si la coupe est perpendiculaire (pas d'angle)
   */
  private isPerpendicular(points: Array<[number, number] | { x: number; y: number }>): boolean {
    // Pour une coupe droite perpendiculaire, tous les points doivent avoir
    // soit la même coordonnée X (coupe verticale) soit la même coordonnée Y (coupe horizontale)
    // ou former un rectangle parfait
    
    return this.isRectangular(points);
  }
  
  /**
   * Méthode utilitaire pour obtenir un élément factice
   */
  protected createDummyElement(): PivotElement {
    return {
      id: 'dummy',
      type: 'beam',
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      dimensions: {
        length: 1000,
        height: 300,
        width: 150,
        thickness: 5,
        flangeThickness: 10,
        webThickness: 8
      },
      name: 'dummy',
      materialType: 'STEEL' as any,
      scale: [1, 1, 1] as [number, number, number],
      material: { color: '#808080' },
      visible: true,
      metadata: {}
    } as PivotElement;
  }
}