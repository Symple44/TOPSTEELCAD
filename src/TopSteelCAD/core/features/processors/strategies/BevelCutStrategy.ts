/**
 * BevelCutStrategy - Stratégie pour les chanfreins et préparations de soudure
 * Gère les coupes de préparation pour soudage selon la norme DSTV
 * 
 * IMPORTANT: Les bevel cuts sont différents des angle cuts:
 * - Bevel cut: Chanfrein sur une arête pour préparation de soudure
 * - Angle cut: Coupe diagonale complète aux extrémités
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace } from '../../types';
import { ExteriorCutStrategy } from './ExteriorCutStrategy';

/**
 * Paramètres spécifiques aux bevel cuts
 */
export interface BevelCutParameters {
  bevelAngle: number;      // Angle de chanfrein (ex: -60.80° pour h5004)
  bevelDistance?: number;  // Distance depuis l'arête
  weldingType?: 'groove' | 'fillet' | 'butt'; // Type de soudure
  rootFace?: number;       // Face racine optionnelle
  rootGap?: number;        // Écart racine optionnel
}

/**
 * Stratégie pour les chanfreins de préparation de soudure
 * Traite les paramètres de soudure DSTV (angles négatifs dans AK blocks)
 */
export class BevelCutStrategy extends ExteriorCutStrategy {
  readonly name = 'BevelCut';
  
  canHandle(feature: Feature): boolean {
    // Vérifier d'abord que c'est une coupe extérieure
    if (!super.canHandle(feature)) {
      return false;
    }
    
    // Détecter si c'est spécifiquement un bevel cut
    const params = feature.parameters || {};
    
    // Vérifier les paramètres de soudure ou angles négatifs
    if ((params as any).weldPreparation || (params as any).bevelAngle) {
      return true;
    }
    
    // Vérifier les valeurs négatives dans rawData (angles de chanfrein)
    if ((params as any).rawData && Array.isArray((params as any).rawData)) {
      return (params as any).rawData.some((val: any) => {
        const numVal = parseFloat(String(val));
        return numVal < -15 && numVal > -75;
      });
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
    
    // Vérifier le nombre de points (généralement 4-6 pour un chanfrein)
    if (points.length < 3 || points.length > 8) {
      errors.push('Bevel cut should have 3-8 points');
      return;
    }
    
    // Extraire les paramètres de bevel
    const bevelParams = this.extractBevelParameters(feature);
    
    // Valider l'angle de chanfrein
    if (bevelParams.bevelAngle) {
      const angle = Math.abs(bevelParams.bevelAngle);
      if (angle < 15 || angle > 75) {
        errors.push(`Bevel angle ${angle}° is outside standard range (15°-75°)`);
      }
    } else {
      errors.push('Bevel cut requires a bevel angle parameter');
    }
    
    // Valider que le chanfrein est sur une arête (pas au milieu)
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    const isAtEdge = bounds.minX < 100 || bounds.maxX > profileLength - 100 ||
                      bounds.minY < 10 || bounds.maxY > (dims.height || 300) - 10;
    
    if (!isAtEdge) {
      errors.push('Bevel cut should be located at an edge for welding preparation');
    }
  }
  
  protected createExteriorGeometry(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    console.log(`🔪 Creating bevel cut geometry with ${points.length} points`);
    
    const bevelParams = this.extractBevelParameters({ parameters: { points } } as Feature);
    console.log(`  Bevel parameters:`, bevelParams);
    
    // Pour les tubes, créer un chanfrein sur l'arête
    if (this.isTubeProfile(element)) {
      return this.createTubeBevelGeometry(points, bevelParams, face, element);
    } else {
      // Pour les profils I/H, créer un chanfrein sur l'aile ou l'âme
      return this.createIBeamBevelGeometry(points, bevelParams, face, element);
    }
  }
  
  /**
   * Extrait les paramètres de bevel depuis la feature
   */
  private extractBevelParameters(feature: Feature): BevelCutParameters {
    const params = feature.parameters || {};
    
    // Récupérer l'angle depuis les données brutes DSTV
    let bevelAngle = params.bevelAngle || 45; // Angle par défaut
    
    // Pour h5004, chercher les valeurs négatives dans rawData
    if ((params as any).rawData && Array.isArray((params as any).rawData)) {
      const negativeValues = (params as any).rawData
        .filter((val: any) => {
          const numVal = parseFloat(String(val));
          return numVal < -15 && numVal > -75;
        })
        .map((val: any) => parseFloat(String(val)));
      
      if (negativeValues.length > 0) {
        bevelAngle = Math.abs(negativeValues[0]); // Prendre la première valeur négative
        console.log(`  📐 Extracted bevel angle from DSTV: ${bevelAngle}°`);
      }
    }
    
    return {
      bevelAngle,
      bevelDistance: (params as any).bevelDistance || 0,
      weldingType: params.weldType || (params as any).weldingType || 'groove',
      rootFace: (params as any).rootFace,
      rootGap: (params as any).rootGap
    };
  }
  
  /**
   * Crée la géométrie de chanfrein pour un tube
   */
  private createTubeBevelGeometry(
    points: Array<[number, number]>,
    bevelParams: BevelCutParameters,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 50;
    const wallThickness = dims.thickness || 5;
    
    // Calculer les bounds à partir des points
    const bounds = {
      minX: Math.min(...points.map(p => p[0])),
      maxX: Math.max(...points.map(p => p[0])),
      minY: Math.min(...points.map(p => p[1])),
      maxY: Math.max(...points.map(p => p[1]))
    };
    
    // Calculer la profondeur du chanfrein basée sur l'angle
    const angleRad = (bevelParams.bevelAngle * Math.PI) / 180;
    const bevelDepth = wallThickness * Math.tan(angleRad);
    
    console.log(`  Creating tube bevel: angle=${bevelParams.bevelAngle}°, depth=${bevelDepth.toFixed(2)}mm`);
    
    // Créer une forme trapézoïdale pour le chanfrein
    const shape = new THREE.Shape();
    
    // Déterminer si c'est au début ou à la fin
    const isAtStart = bounds.minX < 100;
    const isAtEnd = bounds.maxX > profileLength - 100;
    
    if (isAtStart || isAtEnd) {
      // Chanfrein aux extrémités
      const startX = isAtStart ? 0 : profileLength - bevelDepth;
      const endX = isAtStart ? bevelDepth : profileLength;
      
      // Créer la forme du chanfrein (trapèze)
      shape.moveTo(startX - profileLength/2, -profileHeight/2);
      shape.lineTo(endX - profileLength/2, -profileHeight/2 + bevelDepth);
      shape.lineTo(endX - profileLength/2, profileHeight/2 - bevelDepth);
      shape.lineTo(startX - profileLength/2, profileHeight/2);
      shape.closePath();
    } else {
      // Chanfrein sur une arête latérale
      const centerX = (bounds.minX + bounds.maxX) / 2 - profileLength / 2;
      const width = bounds.maxX - bounds.minX;
      
      shape.moveTo(centerX - width/2, -profileHeight/2);
      shape.lineTo(centerX + width/2, -profileHeight/2);
      shape.lineTo(centerX + width/2 - bevelDepth, -profileHeight/2 + bevelDepth);
      shape.lineTo(centerX - width/2 + bevelDepth, -profileHeight/2 + bevelDepth);
      shape.closePath();
    }
    
    // Extruder à travers l'épaisseur de paroi
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: wallThickness * 1.5, // Assurer la pénétration complète
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Orienter selon la face
    this.orientTubeBevelGeometry(geometry, face, element, isAtStart, isAtEnd);
    
    return geometry;
  }
  
  /**
   * Crée la géométrie de chanfrein pour un profil I/H
   */
  private createIBeamBevelGeometry(
    points: Array<[number, number]>,
    bevelParams: BevelCutParameters,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const flangeThickness = dims.flangeThickness || 10;
    const webThickness = dims.webThickness || 8;
    
    // Calculer la profondeur du chanfrein
    const angleRad = (bevelParams.bevelAngle * Math.PI) / 180;
    const thickness = (face === ProfileFace.WEB) ? webThickness : flangeThickness;
    const bevelDepth = thickness * Math.tan(angleRad);
    
    console.log(`  Creating I-beam bevel on ${face}: angle=${bevelParams.bevelAngle}°, depth=${bevelDepth.toFixed(2)}mm`);
    
    // Créer la forme du chanfrein
    const shape = new THREE.Shape();
    
    // Centrer les points
    const centeredPoints = points.map(p => [
      p[0] - profileLength / 2,
      p[1] - profileHeight / 2
    ] as [number, number]);
    
    // Créer la forme depuis les points
    if (centeredPoints.length > 0) {
      shape.moveTo(centeredPoints[0][0], centeredPoints[0][1]);
      for (let i = 1; i < centeredPoints.length; i++) {
        shape.lineTo(centeredPoints[i][0], centeredPoints[i][1]);
      }
      shape.closePath();
    }
    
    // Extruder selon l'épaisseur
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: thickness * 1.2, // Légère sur-extrusion pour assurer la pénétration
      bevelEnabled: true,
      bevelThickness: bevelDepth / 2,
      bevelSize: bevelDepth / 2,
      bevelSegments: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Positionner selon la face
    this.positionIBeamBevelGeometry(geometry, face, element);
    
    return geometry;
  }
  
  /**
   * Oriente la géométrie de chanfrein pour un tube
   */
  private orientTubeBevelGeometry(
    geometry: THREE.BufferGeometry,
    face: ProfileFace | undefined,
    element: PivotElement,
    isAtStart: boolean,
    isAtEnd: boolean
  ): void {
    const dims = element.dimensions || {};
    
    // Rotation selon la face
    switch (face) {
      case ProfileFace.WEB: // face 'v' - avant
      case 'v' as any:
        geometry.rotateY(Math.PI / 2);
        geometry.translate((dims.width || 50) / 2, 0, 0);
        break;
        
      case ProfileFace.TOP_FLANGE: // face 'o' - dessus
      case 'o' as any:
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, (dims.height || 50) / 2, 0);
        break;
        
      case ProfileFace.BOTTOM_FLANGE: // face 'u' - dessous
      case 'u' as any:
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, -(dims.height || 50) / 2, 0);
        break;
        
      case ProfileFace.BACK: // face 'h' - arrière
      case 'h' as any:
        geometry.rotateY(-Math.PI / 2);
        geometry.translate(-(dims.width || 50) / 2, 0, 0);
        break;
    }
    
    // Ajustement supplémentaire pour les chanfreins aux extrémités
    if (isAtStart) {
      // Chanfrein au début - peut nécessiter une rotation supplémentaire
      console.log(`  Bevel at start of tube on face ${face}`);
    } else if (isAtEnd) {
      // Chanfrein à la fin
      console.log(`  Bevel at end of tube on face ${face}`);
    }
  }
  
  /**
   * Positionne la géométrie de chanfrein pour un profil I/H
   */
  private positionIBeamBevelGeometry(
    geometry: THREE.BufferGeometry,
    face: ProfileFace | undefined,
    element: PivotElement
  ): void {
    const dims = element.dimensions || {};
    const profileHeight = dims.height || 300;
    const flangeThickness = dims.flangeThickness || 10;
    
    switch (face) {
      case ProfileFace.TOP_FLANGE: {
        // Positionner sur l'aile supérieure
        const topY = (profileHeight / 2) - (flangeThickness / 2);
        geometry.translate(0, topY, 0);
        break;
      }
        
      case ProfileFace.BOTTOM_FLANGE: {
        // Positionner sur l'aile inférieure
        const bottomY = -(profileHeight / 2) + (flangeThickness / 2);
        geometry.translate(0, bottomY, 0);
        break;
      }
        
      case ProfileFace.WEB:
      default:
        // Centrer sur l'âme
        geometry.translate(0, 0, 0);
        break;
    }
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
        flangeThickness: 10,
        webThickness: 8,
        thickness: 5 // Pour les tubes
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