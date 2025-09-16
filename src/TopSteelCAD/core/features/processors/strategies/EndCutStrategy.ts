/**
 * EndCutStrategy - Stratégie pour les coupes aux extrémités
 * Gère les coupes qui enlèvent de la matière au début ou à la fin d'un profil
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace } from '../../types';
import { ExteriorCutStrategy } from './ExteriorCutStrategy';

/**
 * Stratégie pour les coupes d'extrémité
 * Détecte et traite les coupes qui enlèvent de la matière aux extrémités du profil
 */
export class EndCutStrategy extends ExteriorCutStrategy {
  readonly name = 'EndCut';
  
  canHandle(feature: Feature): boolean {
    // Vérifier d'abord que c'est une coupe extérieure
    if (!super.canHandle(feature)) {
      return false;
    }
    
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    if (points.length < 4) return false;
    
    // Obtenir les dimensions pour analyser
    const element = this.createDummyElement();
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    // Analyser si les points définissent une zone NON coupée (inverse de coupe)
    const bounds = this.getContourBounds(points);
    
    console.log(`🔍 EndCutStrategy analyzing face ${feature.face}: bounds X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}], profileLength=${profileLength.toFixed(1)}`);
    
    // Si le contour couvre toute la longueur (0 à profileLength), c'est une définition de forme, pas une coupe
    const coversFullLength = bounds.minX <= 10 && bounds.maxX >= profileLength - 10;
    if (coversFullLength) {
      console.log(`  📐 Contour covers full length - this is a profile shape definition, not a cut`);
      return false;
    }
    
    // Vérifier si c'est une coupe au début (zone commence après 0)
    const hasStartCut = bounds.minX > 10 && bounds.minX < profileLength * 0.2;
    
    // Vérifier si c'est une coupe à la fin (zone finit avant la longueur totale)
    const hasEndCut = bounds.maxX < profileLength - 10 && bounds.maxX > profileLength * 0.8;
    
    const result = hasStartCut || hasEndCut;
    console.log(`  📐 EndCut detection: startCut=${hasStartCut}, endCut=${hasEndCut}, canHandle=${result}`);
    
    return result;
  }
  
  protected validateExteriorSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[]
  ): void {
    const params = feature.parameters || {};
    const points = params.points || params.contourPoints || [];
    
    if (points.length < 4) {
      errors.push('End cut requires at least 4 points');
      return;
    }
    
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const bounds = this.getContourBounds(points);
    
    // Vérifier que c'est bien une coupe d'extrémité
    const hasStartCut = bounds.minX > 10 && bounds.minX < profileLength * 0.2;
    const hasEndCut = bounds.maxX < profileLength - 10 && bounds.maxX > profileLength * 0.8;
    
    if (!hasStartCut && !hasEndCut) {
      errors.push('Not a valid end cut - contour does not define cuts at extremities');
    }
  }
  
  protected createExteriorGeometry(
    points: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    console.log(`🔪 Creating end cut geometry with ${points.length} points`);
    
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    const profileHeight = dims.height || 300;
    const profileWidth = dims.width || 150;
    
    const bounds = this.getContourBounds(points);
    
    // Les points AK définissent la zone NON COUPÉE
    // Donc les coupes sont AVANT bounds.minX et APRÈS bounds.maxX
    
    const geometries: THREE.BufferGeometry[] = [];
    
    // Coupe au début (si la zone ne commence pas à 0)
    if (bounds.minX > 10) {
      console.log(`  📐 Start cut detected: 0 to ${bounds.minX.toFixed(1)}mm`);
      const startCutGeometry = this.createCutBox(
        0,                    // Début à 0
        bounds.minX,          // Fin à bounds.minX
        profileHeight,
        profileWidth,
        face,
        element
      );
      geometries.push(startCutGeometry);
    }
    
    // Coupe à la fin (si la zone ne va pas jusqu'à la fin)
    if (bounds.maxX < profileLength - 10) {
      console.log(`  📐 End cut detected: ${bounds.maxX.toFixed(1)} to ${profileLength.toFixed(1)}mm`);
      const endCutGeometry = this.createCutBox(
        bounds.maxX,          // Début à bounds.maxX
        profileLength,        // Fin à la longueur totale
        profileHeight,
        profileWidth,
        face,
        element
      );
      geometries.push(endCutGeometry);
    }
    
    // Combiner les géométries si nécessaire
    if (geometries.length === 0) {
      // Pas de coupe détectée, retourner une géométrie vide
      return new THREE.BufferGeometry();
    } else if (geometries.length === 1) {
      return geometries[0];
    } else {
      // Fusionner les coupes avec BufferGeometryUtils
      try {
        return BufferGeometryUtils.mergeGeometries(geometries, false);
      } catch (error) {
        // Fallback: retourner la première géométrie
        return geometries[0];
      }
    }
  }
  
  /**
   * Crée une boîte de coupe pour une extrémité
   */
  private createCutBox(
    startX: number,
    endX: number,
    height: number,
    width: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    const length = endX - startX;
    const centerX = (startX + endX) / 2;
    
    // Créer la géométrie selon la face
    let geometry: THREE.BufferGeometry;
    
    switch (face) {
      case ProfileFace.TOP:
      case ProfileFace.TOP_FLANGE:
      case 'o' as any:
        // Coupe sur le dessus
        geometry = new THREE.BoxGeometry(length, 10, width);
        geometry.translate(centerX - element.dimensions!.length! / 2, height / 2, 0);
        break;
        
      case ProfileFace.BOTTOM:
      case ProfileFace.BOTTOM_FLANGE:
      case 'u' as any:
        // Coupe sur le dessous
        geometry = new THREE.BoxGeometry(length, 10, width);
        geometry.translate(centerX - element.dimensions!.length! / 2, -height / 2, 0);
        break;
        
      case ProfileFace.WEB:
      case ProfileFace.FRONT:
      case 'v' as any:
        // Coupe sur l'avant
        geometry = new THREE.BoxGeometry(length, height, 10);
        geometry.translate(centerX - element.dimensions!.length! / 2, 0, width / 2);
        break;
        
      case ProfileFace.BACK:
      case 'h' as any:
        // Coupe sur l'arrière
        geometry = new THREE.BoxGeometry(length, height, 10);
        geometry.translate(centerX - element.dimensions!.length! / 2, 0, -width / 2);
        break;
        
      default:
        geometry = new THREE.BoxGeometry(length, height, width);
        geometry.translate(centerX - element.dimensions!.length! / 2, 0, 0);
        break;
    }
    
    return geometry;
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
        length: 2259.98,  // Utiliser la longueur de h5004 pour les tests
        height: 50.8,
        width: 50.8,
        thickness: 4.78,
        flangeThickness: 4.78,
        webThickness: 4.78
      },
      name: 'dummy',
      materialType: 'STEEL' as any,
      scale: [1, 1, 1] as [number, number, number],
      material: {
        color: '#808080',
        grade: 'S355',
        density: 7850,
        opacity: 1.0,
        metallic: 0.8,
        roughness: 0.2,
        shininess: 0.8,
        reflectivity: 0.5
      },
      visible: true,
      metadata: {
        profileType: 'TUBE_RECT',
        profileName: 'HSS51X51X4.8'
      }
    } as PivotElement;
  }
}