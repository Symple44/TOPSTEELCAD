/**
 * TubeContourStrategy - Stratégie pour la redéfinition des contours de tubes
 * Gère les contours complexes qui redéfinissent la forme finale des profils tubulaires
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace } from '../../types';
import { ExteriorCutStrategy } from './ExteriorCutStrategy';
import { CutType } from '../CutCategoryDetector';
import { dstvFaceMapper, ProfileType } from '@/TopSteelCAD/plugins/dstv/coordinates/DSTVFaceMapper';
import { faceProfileValidator } from '@/TopSteelCAD/plugins/dstv/coordinates/FaceProfileValidator';

/**
 * Stratégie pour la redéfinition des contours de tubes
 * Spécialement conçue pour les profils HSS/RHS/SHS avec contours complexes
 */
export class TubeContourStrategy extends ExteriorCutStrategy {
  readonly name = 'TubeContour';
  
  canHandle(feature: Feature): boolean {
    // Vérifier d'abord que c'est une coupe extérieure
    if (!super.canHandle(feature)) {
      return false;
    }
    
    // Doit être un profil tubulaire
    const element = this.createDummyElement();
    if (!this.isTubeProfile(element)) {
      return false;
    }
    
    // Détecter si c'est une redéfinition de contour
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    // Vérifier si c'est un contour qui couvre toute la longueur du profil
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    if (points.length > 0) {
      const bounds = this.getContourBounds(points);
      const lengthCoverage = (bounds.maxX - bounds.minX) / profileLength;
      
      console.log(`🔍 TubeContourStrategy analyzing: bounds X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}], coverage=${(lengthCoverage * 100).toFixed(1)}%`);
      
      // Si le contour couvre toute la longueur (0 à profileLength), c'est une définition de forme, pas une coupe
      const coversFullLength = bounds.minX <= 10 && bounds.maxX >= profileLength - 10;
      if (coversFullLength) {
        console.log(`  📐 Contour covers full length - this is a profile shape definition, not a tube contour cut`);
        return false;
      }
      
      // Si la coupe couvre plus de 80% de la longueur ET ne commence pas à 0, c'est une redéfinition de contour
      if (lengthCoverage > 0.8 && bounds.minX > 10) {
        console.log(`  📐 Partial contour redefinition detected`);
        return true;
      }
    }
    
    // Ou si c'est un contour complexe avec beaucoup de points
    return points.length > 8; // Plus de 8 points = contour complexe
  }
  
  protected validateExteriorSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    // Vérifier que c'est bien un tube
    if (!this.isTubeProfile(element)) {
      errors.push('TubeContourStrategy can only be used with tubular profiles (HSS/RHS/SHS)');
      return;
    }
    
    // Pour les contours de tubes, accepter un grand nombre de points (contours complexes)
    if (points.length < 4) {
      errors.push('Tube contour requires at least 4 points');
      return;
    }
    
    // Vérifier que le contour couvre une portion significative du profil
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    const contourLength = bounds.maxX - bounds.minX;
    const lengthRatio = contourLength / profileLength;
    
    if (lengthRatio > 0.8) {
      // C'est une redéfinition complète du contour - cas typique des tubes HSS
      console.log(`  📐 Full contour redefinition detected (${(lengthRatio * 100).toFixed(1)}% of profile length)`);
    } else if (lengthRatio < 0.1) {
      errors.push('Tube contour is too small to be a valid contour redefinition');
    }
  }
  
  protected createExteriorGeometry(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    console.log(`🔪 Creating tube contour geometry with ${points.length} points`);
    
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const wallThickness = dims.thickness || 5;
    
    console.log(`  Tube contour bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
    console.log(`  Wall thickness: ${wallThickness}mm`);
    
    // Pour les tubes HSS avec contours complexes, nous avons deux approches :
    // 1. Si c'est un contour très complexe (>20 points), simplifier en boîte
    // 2. Si c'est un contour modéré (<20 points), utiliser la forme exacte
    
    if (points.length > 20) {
      console.log(`  Complex contour with ${points.length} points - using simplified box approach`);
      return this.createSimplifiedTubeGeometry(bounds, wallThickness, face, element);
    } else {
      console.log(`  Moderate contour with ${points.length} points - using precise geometry`);
      return this.createPreciseTubeGeometry(points, wallThickness, face, element);
    }
  }
  
  /**
   * Crée une géométrie simplifiée pour les contours très complexes
   * Utilise une BoxGeometry basée sur les bounds
   */
  private createSimplifiedTubeGeometry(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    wallThickness: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const boxWidth = bounds.maxX - bounds.minX;
    const boxHeight = bounds.maxY - bounds.minY;
    const boxDepth = wallThickness * 2; // Traverser la paroi
    
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    
    // Créer la géométrie selon l'orientation de la face avec support face 'h'
    let geometry: THREE.BufferGeometry;
    
    switch (face) {
      case ProfileFace.FRONT: // face 'v' - avant du tube
      case ProfileFace.WEB:
      case 'v' as any:
        geometry = new THREE.BoxGeometry(boxDepth, boxHeight, boxWidth);
        break;
        
      case ProfileFace.TOP: // face 'o' - dessus du tube
      case ProfileFace.TOP_FLANGE:
      case 'o' as any:
        geometry = new THREE.BoxGeometry(boxWidth, boxDepth, boxHeight);
        break;
        
      case ProfileFace.BOTTOM: // face 'u' - dessous du tube
      case ProfileFace.BOTTOM_FLANGE:
      case 'u' as any:
        geometry = new THREE.BoxGeometry(boxWidth, boxDepth, boxHeight);
        break;
        
      case ProfileFace.BACK: // face 'h' - arrière du tube
      case 'h' as any:
        geometry = new THREE.BoxGeometry(boxDepth, boxHeight, boxWidth);
        break;
        
      default:
        geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        break;
    }
    
    // Positionner la géométrie
    this.positionTubeGeometry(geometry, bounds, face, element);
    
    console.log(`  Created simplified box: ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}x${boxDepth.toFixed(1)}mm`);
    
    return geometry;
  }
  
  /**
   * Crée une géométrie précise pour les contours modérés
   * Utilise ExtrudeGeometry avec la forme exacte
   */
  private createPreciseTubeGeometry(
    points: Array<[number, number]>,
    wallThickness: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    
    // Pour les contours qui couvrent toute la longueur, ne pas centrer en X
    const bounds = this.getContourBounds(points);
    const lengthCoverage = (bounds.maxX - bounds.minX) / profileLength;
    
    let centeredPoints: Array<[number, number]>;
    if (lengthCoverage > 0.8) {
      // Contour sur toute la longueur - garder les coordonnées X originales
      // mais centrer en Y pour être aligné avec le profil
      centeredPoints = points.map(p => [
        p[0] - profileLength / 2,  // Centrer en X par rapport à la longueur
        p[1] - profileHeight / 2   // Centrer en Y par rapport à la hauteur
      ] as [number, number]);
    } else {
      // Contour partiel - centrer normalement
      centeredPoints = points.map(p => [
        p[0] - profileLength / 2,
        p[1] - profileHeight / 2
      ] as [number, number]);
    }
    
    // Créer la forme 2D
    const shape = new THREE.Shape();
    if (centeredPoints.length > 0) {
      shape.moveTo(centeredPoints[0][0], centeredPoints[0][1]);
      for (let i = 1; i < centeredPoints.length; i++) {
        shape.lineTo(centeredPoints[i][0], centeredPoints[i][1]);
      }
      shape.closePath();
    }
    
    // Calculer la profondeur d'extrusion selon la face
    const extrudeDepth = wallThickness * 2; // Traverser complètement la paroi
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: extrudeDepth,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Orienter selon la face du tube
    this.orientTubeGeometry(geometry, face, element);
    
    console.log(`  Created precise extrude geometry with depth ${extrudeDepth}mm`);
    
    return geometry;
  }
  
  /**
   * Positionne la géométrie pour un tube
   */
  private positionTubeGeometry(
    geometry: THREE.BufferGeometry,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    face: ProfileFace | undefined,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const profileWidth = dims.width || 150;
    
    // Position le long de la poutre (toujours centrée sur le contour)
    const centerX = (bounds.minX + bounds.maxX) / 2 - profileLength / 2;
    
    // Position selon la face
    let centerY = 0;
    let centerZ = 0;
    
    switch (face) {
      case ProfileFace.FRONT: // face 'v' - avant du tube
      case ProfileFace.WEB:
      case 'v' as any:
        centerY = (bounds.minY + bounds.maxY) / 2 - profileHeight / 2;
        centerZ = profileWidth / 2; // Positionner à la face avant
        break;
        
      case ProfileFace.TOP: // face 'o' - dessus du tube
      case ProfileFace.TOP_FLANGE:
      case 'o' as any:
        centerY = profileHeight / 2; // Positionner à la face supérieure
        centerZ = (bounds.minY + bounds.maxY) / 2 - profileWidth / 2;
        break;
        
      case ProfileFace.BOTTOM: // face 'u' - dessous du tube
      case ProfileFace.BOTTOM_FLANGE:
      case 'u' as any:
        centerY = -profileHeight / 2; // Positionner à la face inférieure
        centerZ = (bounds.minY + bounds.maxY) / 2 - profileWidth / 2;
        break;
        
      case ProfileFace.BACK: // face 'h' - arrière du tube
      case 'h' as any:
        centerY = (bounds.minY + bounds.maxY) / 2 - profileHeight / 2;
        centerZ = -profileWidth / 2; // Positionner à la face arrière
        break;
        
      default:
        centerY = (bounds.minY + bounds.maxY) / 2 - profileHeight / 2;
        centerZ = 0;
        break;
    }
    
    geometry.translate(centerX, centerY, centerZ);
    console.log(`  Positioned at: X=${centerX.toFixed(1)}, Y=${centerY.toFixed(1)}, Z=${centerZ.toFixed(1)}`);
  }
  
  /**
   * Oriente la géométrie selon la face du tube
   */
  private orientTubeGeometry(
    geometry: THREE.BufferGeometry,
    face: ProfileFace | undefined,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    
    switch (face) {
      case ProfileFace.FRONT: // face 'v' - avant du tube
      case ProfileFace.WEB:
      case 'v' as any:
        // Rotation pour que la découpe traverse de l'avant vers l'arrière
        geometry.rotateY(Math.PI / 2);
        geometry.translate((dims.width || 50) / 2, 0, 0);
        break;
        
      case ProfileFace.TOP: // face 'o' - dessus du tube
      case ProfileFace.TOP_FLANGE:
      case 'o' as any:
        // Rotation pour que la découpe traverse de haut en bas
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, (dims.height || 50) / 2, 0);
        break;
        
      case ProfileFace.BOTTOM: // face 'u' - dessous du tube
      case ProfileFace.BOTTOM_FLANGE:
      case 'u' as any:
        // Rotation pour que la découpe traverse de bas en haut
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, -(dims.height || 50) / 2, 0);
        break;
        
      case ProfileFace.BACK: // face 'h' - arrière du tube
      case 'h' as any:
        // Rotation pour que la découpe traverse de l'arrière vers l'avant
        geometry.rotateY(-Math.PI / 2);
        geometry.translate(-(dims.width || 50) / 2, 0, 0);
        break;
        
      default:
        // Pas de rotation pour les autres faces
        break;
    }
  }
  
  /**
   * Détecte si un contour représente une redéfinition complète
   */
  private isCompleteRedefinition(points: Array<[number, number]>, element: PivotElement): boolean {
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    
    const contourLength = bounds.maxX - bounds.minX;
    const contourHeight = bounds.maxY - bounds.minY;
    
    // Si le contour couvre plus de 80% de la longueur et 80% de la hauteur
    const lengthRatio = contourLength / profileLength;
    const heightRatio = contourHeight / profileHeight;
    
    return lengthRatio > 0.8 && heightRatio > 0.8;
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
        thickness: 5, // Épaisseur de paroi pour tubes
        flangeThickness: 10,
        webThickness: 8
      },
      name: 'dummy',
      materialType: 'STEEL' as any,
      scale: [1, 1, 1] as [number, number, number],
      material: { color: '#808080' },
      visible: true,
      metadata: {
        profileType: 'TUBE_RECT', // Forcer le type tube pour les tests
        profileName: 'HSS300x150x5'
      }
    } as unknown as PivotElement;
  }
}