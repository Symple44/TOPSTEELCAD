/**
 * AngleCutStrategy - Stratégie pour les coupes d'angle et biseaux
 * Gère les coupes angulaires, chanfreins et biseaux aux extrémités des profils
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace } from '../../types';
import { ExteriorCutStrategy } from './ExteriorCutStrategy';
import { ProfileType } from '@/TopSteelCAD/3DLibrary/types/profile.types';

/**
 * Stratégie pour les coupes d'angle et biseaux
 * Gère les coupes non-perpendiculaires qui créent des angles ou des chanfreins
 */
export class AngleCutStrategy extends ExteriorCutStrategy {
  readonly name = 'AngleCut';
  
  canHandle(feature: Feature): boolean {
    // Vérifier d'abord que c'est une coupe extérieure
    if (!super.canHandle(feature)) {
      return false;
    }
    
    // Détecter si c'est spécifiquement une coupe d'angle
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    // Vérifier si c'est une coupe qui traverse toute la longueur
    // (ce n'est pas une coupe d'angle mais une redéfinition de contour)
    const element = this.createDummyElement();
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    if (points.length > 0) {
      const bounds = this.getContourBounds(points);
      const lengthCoverage = (bounds.maxX - bounds.minX) / profileLength;
      
      console.log(`🔍 AngleCutStrategy analyzing: bounds X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}], coverage=${(lengthCoverage * 100).toFixed(1)}%`);
      
      // Si le contour couvre toute la longueur (0 à profileLength), c'est une définition de forme, pas une coupe
      const coversFullLength = bounds.minX <= 10 && bounds.maxX >= profileLength - 10;
      if (coversFullLength) {
        console.log(`  📐 Contour covers full length - this is a profile shape definition, not an angle cut`);
        return false;
      }
      
      // Si la coupe couvre plus de 80% de la longueur, c'est une redéfinition de contour
      if (lengthCoverage > 0.8) {
        console.log(`  📐 Large contour coverage - letting TubeContourStrategy handle this`);
        return false; // Laisser TubeContourStrategy gérer cela
      }
    }
    
    // Une coupe d'angle a des points non rectangulaires avec un angle
    if (points.length >= 4 && points.length <= 6) {
      return !this.isRectangular(points);
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
    
    // Vérifier le nombre de points (4-6 pour une coupe d'angle)
    if (points.length < 4 || points.length > 6) {
      errors.push('Angle cut should have 4-6 points');
      return;
    }
    
    // Vérifier qu'il y a bien un angle (pas rectangulaire)
    if (this.isRectangular(points)) {
      errors.push('Angle cut must not be rectangular (use StraightCutStrategy instead)');
    }
    
    // Vérifier que l'angle est dans une plage raisonnable
    const angle = this.calculateCutAngle(points as Array<[number, number]>);
    if (angle !== null) {
      const angleDegrees = (angle * 180) / Math.PI;
      if (angleDegrees < 15 || angleDegrees > 75) {
        errors.push(`Cut angle ${angleDegrees.toFixed(1)}° is outside reasonable range (15°-75°)`);
      }
    }
  }
  
  protected createExteriorGeometry(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    console.log(`🔪 Creating angle cut geometry with ${points.length} points`);
    
    const bounds = this.getContourBounds(points);
    const angle = this.calculateCutAngle(points);
    
    console.log(`  Cut angle: ${angle ? (angle * 180 / Math.PI).toFixed(1) : 'unknown'}°`);
    console.log(`  Cut bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
    
    // Pour une coupe d'angle, utiliser ExtrudeGeometry pour la forme précise
    if (this.isTubeProfile(element)) {
      return this.createTubeAngleCut(points, depth, face, element);
    } else {
      return this.createIBeamAngleCut(points, depth, face, element);
    }
  }
  
  /**
   * Crée une coupe d'angle pour un profil tubulaire
   */
  private createTubeAngleCut(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const wallThickness = dims.thickness || 5;
    
    // Analyser si la coupe est au début ou à la fin de la pièce
    const bounds = this.getContourBounds(points);
    const isAtStart = bounds.minX < 100; // Coupe au début si elle commence près de 0
    const isAtEnd = bounds.maxX > profileLength - 100; // Coupe à la fin si elle finit près de la longueur
    
    // Ajuster les points selon la position de la coupe
    let centeredPoints: Array<[number, number]>;
    if (isAtEnd && !isAtStart) {
      // Coupe uniquement à la fin - la positionner à l'extrémité droite
      centeredPoints = points.map(p => [
        p[0] - profileLength / 2,  // Garder la position relative depuis le centre
        p[1] - profileHeight / 2
      ] as [number, number]);
    } else if (isAtStart && !isAtEnd) {
      // Coupe uniquement au début - la positionner à l'extrémité gauche
      centeredPoints = points.map(p => [
        p[0] - profileLength / 2,  // Garder la position relative depuis le centre
        p[1] - profileHeight / 2
      ] as [number, number]);
    } else {
      // Coupe traversante ou au milieu - centrer normalement
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
    
    // Paramètres d'extrusion selon la face
    const extrudeDepth = wallThickness * 2; // Traverser la paroi du tube
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: extrudeDepth,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Orientation selon la face du tube
    this.orientTubeGeometry(geometry, face, element);
    
    return geometry;
  }
  
  /**
   * Crée une coupe d'angle pour un profil I/H
   */
  private createIBeamAngleCut(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const profileWidth = dims.width || 150;
    
    // Centrer les points selon la face
    let centeredPoints: Array<[number, number]>;
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        // Pour les ailes, mapper sur le plan XZ
        centeredPoints = points.map(p => [
          p[0] - profileLength / 2,  // Position le long de la poutre
          p[1] - profileWidth / 2    // Position sur la largeur de l'aile
        ]);
        break;
        
      case ProfileFace.WEB:
      default:
        // Pour l'âme, mapper sur le plan XY
        centeredPoints = points.map(p => [
          p[0] - profileLength / 2,  // Position le long de la poutre
          p[1] - profileHeight / 2   // Position verticale
        ]);
        break;
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
    
    // Calculer la profondeur selon la face
    const actualDepth = this.calculateActualDepth(face, element, depth);
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: actualDepth,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Orientation selon la face du profil I
    this.orientIBeamGeometry(geometry, face, element);
    
    return geometry;
  }
  
  /**
   * Oriente la géométrie pour un tube
   */
  private orientTubeGeometry(
    geometry: THREE.BufferGeometry,
    face: ProfileFace | undefined,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    
    // Utiliser le mapper DSTV pour les tubes
    switch (face) {
      case ProfileFace.FRONT: // face 'v' - avant du tube
      case ProfileFace.WEB:
      case 'v' as any:
        geometry.rotateY(Math.PI / 2);
        geometry.translate((dims.width || 50) / 2, 0, 0);
        break;
        
      case ProfileFace.TOP: // face 'o' - dessus du tube
      case ProfileFace.TOP_FLANGE:
      case 'o' as any:
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, (dims.height || 50) / 2, 0);
        break;
        
      case ProfileFace.BOTTOM: // face 'u' - dessous du tube
      case ProfileFace.BOTTOM_FLANGE:
      case 'u' as any:
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, -(dims.height || 50) / 2, 0);
        break;
        
      case ProfileFace.BACK: // face 'h' - arrière du tube
      case 'h' as any:
        geometry.rotateY(-Math.PI / 2);
        geometry.translate(-(dims.width || 50) / 2, 0, 0);
        break;
    }
  }
  
  /**
   * Oriente la géométrie pour un profil I/H
   */
  private orientIBeamGeometry(
    geometry: THREE.BufferGeometry,
    face: ProfileFace | undefined,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const flangeThickness = dims.flangeThickness || 10;
    const profileHeight = dims.height || 300;
    
    switch (face) {
      case ProfileFace.TOP_FLANGE: {
        // Positionner pour traverser l'aile supérieure
        const topFlangeCenter = (profileHeight / 2) - (flangeThickness / 2);
        geometry.translate(0, topFlangeCenter, 0);
        break;
      }
        
      case ProfileFace.BOTTOM_FLANGE: {
        // Positionner pour traverser l'aile inférieure
        const bottomFlangeCenter = -(profileHeight / 2) + (flangeThickness / 2);
        geometry.translate(0, bottomFlangeCenter, 0);
        break;
      }
        
      case ProfileFace.WEB:
      default:
        // Pour l'âme, positionner au centre avec extrusion vers l'arrière
        geometry.translate(0, 0, -this.calculateActualDepth(face, element, 0) / 2);
        break;
    }
  }
  
  /**
   * Calcule l'angle de coupe à partir des points
   */
  private calculateCutAngle(points: Array<[number, number]>): number | null {
    if (points.length < 3) return null;
    
    // Trouver les deux segments les plus longs pour calculer l'angle
    let maxLength = 0;
    let bestSegment: Array<[number, number]> | null = null;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const length = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
      
      if (length > maxLength) {
        maxLength = length;
        bestSegment = [p1, p2];
      }
    }
    
    if (!bestSegment) return null;
    
    // Calculer l'angle par rapport à l'horizontale
    const dx = bestSegment[1][0] - bestSegment[0][0];
    const dy = bestSegment[1][1] - bestSegment[0][1];
    
    return Math.atan2(Math.abs(dy), Math.abs(dx));
  }
  
  /**
   * Calcule la profondeur réelle selon la face
   */
  private calculateActualDepth(face: ProfileFace | undefined, element: PivotElement, defaultDepth: number): number {
    const dims = element.dimensions || {};
    
    switch (face) {
      case ProfileFace.TOP_FLANGE:
      case ProfileFace.BOTTOM_FLANGE:
        return dims.flangeThickness || 50;
        
      case ProfileFace.WEB:
      default:
        return defaultDepth || dims.webThickness || 20;
    }
  }
  
  /**
   * Vérifie si les points forment un rectangle (pour éviter le conflit avec StraightCutStrategy)
   */
  private isRectangular(points: Array<[number, number] | { x: number; y: number }>): boolean {
    if (points.length !== 4 && points.length !== 5) return false;
    
    const xs = new Set<number>();
    const ys = new Set<number>();
    
    for (const point of points) {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      xs.add(Math.round(x * 100) / 100); // Arrondir pour éviter les erreurs de précision
      ys.add(Math.round(y * 100) / 100);
    }
    
    return xs.size === 2 && ys.size === 2;
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
  
  /**
   * Détecte le type de profil pour le mapping DSTV
   */
  private detectProfileType(element: PivotElement): ProfileType {
    const profileName = element.metadata?.profileName || '';
    const elementType = element.type || element.metadata?.profileType || '';
    
    // Détection basée sur le type d'élément
    if (elementType === 'TUBE_RECT' || elementType === 'TUBE_ROUND') {
      return elementType === 'TUBE_ROUND' ? ProfileType.CHS : ProfileType.RHS;
    }

    // Détection basée sur le nom du profil
    const upperName = profileName.toUpperCase();
    if (upperName.includes('RHS')) {
      return ProfileType.RHS;
    }
    if (upperName.includes('SHS')) {
      return ProfileType.SHS;
    }
    if (upperName.includes('CHS') || upperName.includes('PIPE')) {
      return ProfileType.CHS;
    }
    if (upperName.includes('IPE') || upperName.includes('HE') || upperName.includes('UB') || upperName.includes('UC')) {
      return ProfileType.IPE;
    }
    if (upperName.includes('L') || upperName.includes('ANGLE')) {
      return ProfileType.L;
    }
    if (upperName.includes('UPN') || upperName.includes('CHANNEL')) {
      return ProfileType.UPN;
    }
    
    // Par défaut, considérer comme profil I
    return ProfileType.IPE;
  }
}