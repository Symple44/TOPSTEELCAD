/**
 * ExteriorCutStrategy - Stratégie de base pour les coupes extérieures
 * Gère les coupes qui modifient le contour externe des profils
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace, Point2D } from '../../types';
import { BaseCutStrategy } from './CutStrategy';

/**
 * Stratégie de base pour les coupes extérieures
 * Classe abstraite qui définit le comportement commun des coupes externes
 */
export abstract class ExteriorCutStrategy extends BaseCutStrategy {
  
  canHandle(feature: Feature): boolean {
    // const points = params.points || params.contourPoints || [];
    
    // Une coupe extérieure est généralement aux extrémités ou sur les bords
    // On vérifie basiquement si c'est une coupe AK (contour)
    return feature.type === 'contour' || feature.type === 'cut';
  }
  
  protected validateSpecific(
    feature: Feature, 
    element: PivotElement, 
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    
    // Vérifications communes aux coupes extérieures
    if (!params.points && !params.contourPoints) {
      errors.push('Exterior cut requires points or contourPoints');
      return;
    }
    
    const points = params.points || params.contourPoints || [];
    if (points.length < 3) {
      errors.push('Exterior cut requires at least 3 points');
      return;
    }
    
    // Vérifier que la coupe affecte réellement le contour externe
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    // Une coupe extérieure doit toucher au moins un bord du profil
    const touchesStart = bounds.minX < 10;
    const touchesEnd = bounds.maxX > (profileLength - 10);
    
    if (!touchesStart && !touchesEnd) {
      errors.push('Exterior cut must touch at least one edge of the profile');
    }
    
    // Validations spécifiques selon le type de coupe
    this.validateExteriorSpecific(feature, element, errors);
  }
  
  /**
   * Validations spécifiques au type de coupe extérieure
   * À implémenter dans les classes filles
   */
  protected abstract validateExteriorSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[]
  ): void;
  
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    const depth = this.calculateDepth(feature, element);
    const face = feature.face || ProfileFace.WEB;
    
    // Normaliser les points vers le format [number, number]
    const normalizedPoints = this.normalizePoints(points);
    
    // Créer la géométrie selon le type spécifique
    return this.createExteriorGeometry(normalizedPoints, depth, face, element);
  }
  
  /**
   * Crée la géométrie spécifique pour la coupe extérieure
   * À implémenter dans les classes filles
   */
  protected abstract createExteriorGeometry(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry;
  
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3 {
    const face = feature.face || ProfileFace.WEB;
    const dims = element.dimensions || {};
    const position = new THREE.Vector3();
    
    // Position selon la face du profil
    switch (face) {
      case ProfileFace.TOP_FLANGE:
        position.y = (dims.height || 0) / 2 - (dims.flangeThickness || 10) / 2;
        break;
        
      case ProfileFace.BOTTOM_FLANGE:
        position.y = -(dims.height || 0) / 2 + (dims.flangeThickness || 10) / 2;
        break;
        
      case ProfileFace.WEB:
      default:
        position.y = 0; // Centré sur l'âme
        break;
    }
    
    return position;
  }
  
  /**
   * Calcule la profondeur appropriée pour la coupe
   */
  protected calculateDepth(feature: Feature, element: PivotElement): number {
    const params = feature.parameters || {};
    const face = feature.face || ProfileFace.WEB;
    const dims = element.dimensions || {};
    
    // Si une profondeur explicite est fournie
    if (params.depth && params.depth > 0) {
      return params.depth;
    }
    
    // Calculer selon la face et le type de profil
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return dims.flangeThickness || 50; // Traverser l'aile
        
      case ProfileFace.WEB:
      default:
        return dims.webThickness || 20; // Profondeur pour l'âme
    }
  }
  
  /**
   * Vérifie si c'est un profil tubulaire
   */
  protected isTubeProfile(element: PivotElement): boolean {
    const metadata = element.metadata || {};
    return metadata.profileType === 'TUBE_RECT' || 
           metadata.profileType === 'TUBE_ROUND' ||
           (metadata.profileName && (
             metadata.profileName.includes('HSS') ||
             metadata.profileName.includes('RHS') ||
             metadata.profileName.includes('SHS')
           ));
  }
  
  /**
   * Normalise les points vers le format [number, number]
   */
  private normalizePoints(points: Array<[number, number] | Point2D>): Array<[number, number]> {
    return points.map(point => {
      if (Array.isArray(point)) {
        return point as [number, number];
      } else {
        return [point.x, point.y] as [number, number];
      }
    });
  }
  
  /**
   * Calcule les limites du contour
   */
  protected getContourBounds(points: Array<[number, number] | Point2D>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return { minX, maxX, minY, maxY };
  }
  
  /**
   * Méthode utilitaire pour obtenir un élément factice pour les tests
   * Utilisé par cutCategoryDetector.detectCategory
   */
  private getDummyElement(): PivotElement {
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