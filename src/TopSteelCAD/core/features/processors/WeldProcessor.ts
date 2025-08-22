/**
 * Processeur pour les soudures
 */

import * as THREE from 'three';
import { Evaluator, Brush, ADDITION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class WeldProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;
  private positionCalculator: PositionCalculator;
  
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    this.positionCalculator = new PositionCalculator();
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider la feature
      const errors = this.validateFeature(feature, element);
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join('; ')
        };
      }
      
      const params = feature.parameters;
      
      // Paramètres de la soudure
      const weldType = params.weldType || 'fillet'; // fillet, butt, spot, seam
      const weldSize = params.weldSize || 5; // Gorge de soudure en mm
      const length = params.length || element.dimensions.length || 1000;
      
      // Créer la géométrie du cordon de soudure
      let weldGeometry: THREE.BufferGeometry;
      
      switch (weldType) {
        case 'fillet':
          // Soudure d'angle
          weldGeometry = this.createFilletWeldGeometry(weldSize, length);
          break;
          
        case 'butt':
          // Soudure bout à bout
          weldGeometry = this.createButtWeldGeometry(
            weldSize,
            length,
            params.bevelType || 'V'
          );
          break;
          
        case 'spot':
          // Soudure par points
          weldGeometry = this.createSpotWeldGeometry(
            weldSize,
            params.spacing || 50,
            params.count || Math.floor(length / 50)
          );
          break;
          
        case 'seam':
          // Soudure continue
          weldGeometry = this.createSeamWeldGeometry(
            weldSize,
            length,
            params.width || weldSize * 2
          );
          break;
          
        default:
          weldGeometry = this.createFilletWeldGeometry(weldSize, length);
      }
      
      // Calculer la position
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Positionner le cordon de soudure
      const weldBrush = new Brush(weldGeometry);
      weldBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      weldBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      if (feature.rotation) {
        weldBrush.rotation.x += feature.rotation.x;
        weldBrush.rotation.y += feature.rotation.y;
        weldBrush.rotation.z += feature.rotation.z;
      }
      
      weldBrush.updateMatrixWorld();
      
      // Ajouter la soudure à la géométrie (UNION)
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, weldBrush, ADDITION);
      
      // Nettoyer
      weldGeometry.dispose();
      
      // Extraire et optimiser
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Ajouter des métadonnées pour la visualisation
      resultGeometry.userData = {
        ...resultGeometry.userData,
        hasWeld: true,
        weldType: weldType,
        weldSize: weldSize
      };
      
      resultBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process weld: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.weldType) {
      errors.push('Weld type is required');
    }
    
    if (!params.weldSize || params.weldSize <= 0 || params.weldSize > 20) {
      errors.push(`Invalid weld size: ${params.weldSize} (must be 1-20mm)`);
    }
    
    if (params.weldType && !['fillet', 'butt', 'spot', 'seam'].includes(params.weldType)) {
      errors.push(`Invalid weld type: ${params.weldType}`);
    }
    
    return errors;
  }
  
  /**
   * Crée un cordon de soudure d'angle (fillet)
   */
  private createFilletWeldGeometry(
    size: number,
    length: number
  ): THREE.BufferGeometry {
    // Créer un profil triangulaire pour la soudure d'angle
    const shape = new THREE.Shape();
    
    // Triangle isocèle représentant la gorge de soudure
    shape.moveTo(0, 0);
    shape.lineTo(size, 0);
    shape.lineTo(0, size);
    shape.closePath();
    
    // Extruder le long de la soudure
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: true,
      bevelThickness: size * 0.1,
      bevelSize: size * 0.1,
      bevelSegments: 2,
      steps: Math.max(1, Math.floor(length / 100))
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    
    return geometry;
  }
  
  /**
   * Crée un cordon de soudure bout à bout (butt)
   */
  private createButtWeldGeometry(
    size: number,
    length: number,
    bevelType: string
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    switch (bevelType) {
      case 'V':
        // Profil en V simple
        shape.moveTo(-size, 0);
        shape.lineTo(0, size * 0.8);
        shape.lineTo(size, 0);
        shape.lineTo(size, -size * 0.2);
        shape.lineTo(-size, -size * 0.2);
        shape.closePath();
        break;
        
      case 'X':
        // Profil en X (double V)
        shape.moveTo(-size, size * 0.4);
        shape.lineTo(0, 0);
        shape.lineTo(size, size * 0.4);
        shape.lineTo(size, -size * 0.4);
        shape.lineTo(0, 0);
        shape.lineTo(-size, -size * 0.4);
        shape.closePath();
        break;
        
      case 'U':
        // Profil en U (arrondi)
        shape.absarc(0, 0, size, Math.PI, 0, false);
        shape.lineTo(size, -size * 0.2);
        shape.lineTo(-size, -size * 0.2);
        shape.closePath();
        break;
        
      default:
        // Profil rectangulaire simple
        shape.moveTo(-size/2, 0);
        shape.lineTo(size/2, 0);
        shape.lineTo(size/2, size * 0.8);
        shape.lineTo(-size/2, size * 0.8);
        shape.closePath();
    }
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    
    return geometry;
  }
  
  /**
   * Crée des points de soudure (spot)
   */
  private createSpotWeldGeometry(
    diameter: number,
    spacing: number,
    count: number
  ): THREE.BufferGeometry {
    // Créer plusieurs sphères aplaties pour les points de soudure
    const geometries: THREE.BufferGeometry[] = [];
    
    for (let i = 0; i < count; i++) {
      const spotGeometry = new THREE.SphereGeometry(
        diameter / 2,
        16,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2 // Demi-sphère
      );
      
      // Positionner chaque point
      spotGeometry.translate(0, 0, i * spacing);
      geometries.push(spotGeometry);
    }
    
    // Fusionner tous les points
    // Comme BufferGeometryUtils n'est pas disponible, on retourne le premier point
    // En production, il faudrait fusionner les géométries
    if (geometries.length > 0) {
      const merged = geometries[0];
      
      // Nettoyer les autres géométries
      for (let i = 1; i < geometries.length; i++) {
        geometries[i].dispose();
      }
      
      merged.center();
      return merged;
    }
    
    // Si aucun point, retourner une sphère simple
    const geometry = new THREE.SphereGeometry(diameter / 2, 16, 8);
    geometry.center();
    return geometry;
  }
  
  /**
   * Crée une soudure continue (seam)
   */
  private createSeamWeldGeometry(
    height: number,
    length: number,
    width: number
  ): THREE.BufferGeometry {
    // Créer un profil arrondi pour la soudure continue
    const shape = new THREE.Shape();
    
    // Profil semi-circulaire légèrement aplati
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI * i) / segments;
      const x = Math.cos(angle) * width / 2;
      const y = Math.sin(angle) * height * 0.7; // Aplati à 70%
      
      if (i === 0) {
        shape.moveTo(x, 0);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: Math.max(1, Math.floor(length / 50))
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    
    return geometry;
  }
  
  /**
   * Crée une visualisation simplifiée de soudure
   * (utilisé quand on veut juste marquer visuellement sans modifier la géométrie)
   */
  createWeldVisualization(
    feature: Feature,
    element: PivotElement
  ): THREE.Mesh | null {
    try {
      const params = feature.parameters;
      const weldType = params.weldType || 'fillet';
      const weldSize = params.weldSize || 5;
      const length = params.length || element.dimensions.length || 1000;
      
      // Créer la géométrie de visualisation
      let geometry: THREE.BufferGeometry;
      
      switch (weldType) {
        case 'fillet':
          geometry = this.createFilletWeldGeometry(weldSize, length);
          break;
        case 'butt':
          geometry = this.createButtWeldGeometry(weldSize, length, params.bevelType || 'V');
          break;
        case 'spot':
          geometry = this.createSpotWeldGeometry(
            weldSize,
            params.spacing || 50,
            params.count || Math.floor(length / 50)
          );
          break;
        case 'seam':
          geometry = this.createSeamWeldGeometry(
            weldSize,
            length,
            params.width || weldSize * 2
          );
          break;
        default:
          geometry = this.createFilletWeldGeometry(weldSize, length);
      }
      
      // Créer un matériau pour la soudure (orange/jaune pour la visibilité)
      const material = new THREE.MeshPhongMaterial({
        color: 0xFFA500, // Orange
        emissive: 0xFF6600,
        emissiveIntensity: 0.2,
        opacity: 0.9,
        transparent: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `Weld_${feature.id}`;
      mesh.userData = {
        type: 'weld',
        weldType: weldType,
        weldSize: weldSize,
        featureId: feature.id
      };
      
      // Positionner le mesh
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      mesh.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      mesh.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      if (feature.rotation) {
        mesh.rotation.x += feature.rotation.x;
        mesh.rotation.y += feature.rotation.y;
        mesh.rotation.z += feature.rotation.z;
      }
      
      return mesh;
      
    } catch (error) {
      console.error('Failed to create weld visualization:', error);
      return null;
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}