/**
 * Processeur pour les biseaux et chanfreins d'arêtes
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class BevelProcessor implements IFeatureProcessor {
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
      
      // Paramètres du biseau
      const bevelType = params.bevelType || 'chamfer'; // chamfer, round, variable
      const bevelSize = params.size || 5;
      const bevelAngle = params.angle || 45;
      const edgePosition = params.edgePosition || 'top'; // top, bottom, left, right, all
      const length = params.length || element.dimensions.length || 1000;
      
      // Créer la géométrie du biseau selon le type
      let bevelGeometry: THREE.BufferGeometry;
      
      switch (bevelType) {
        case 'chamfer':
          bevelGeometry = this.createChamferGeometry(
            bevelSize,
            bevelAngle,
            length,
            edgePosition,
            element
          );
          break;
          
        case 'round':
          bevelGeometry = this.createRoundBevelGeometry(
            bevelSize,
            length,
            edgePosition,
            element
          );
          break;
          
        case 'variable':
          bevelGeometry = this.createVariableBevelGeometry(
            params.startSize || bevelSize,
            params.endSize || bevelSize * 0.5,
            bevelAngle,
            length,
            edgePosition,
            element
          );
          break;
          
        default:
          bevelGeometry = this.createChamferGeometry(
            bevelSize,
            bevelAngle,
            length,
            edgePosition,
            element
          );
      }
      
      // Calculer la position
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Positionner le biseau
      const bevelBrush = new Brush(bevelGeometry);
      bevelBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      bevelBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      bevelBrush.updateMatrixWorld();
      
      // Soustraire de la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, bevelBrush, SUBTRACTION);
      
      // Nettoyer
      bevelGeometry.dispose();
      
      // Extraire et optimiser
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      resultBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process bevel: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.size || params.size <= 0) {
      errors.push('Invalid bevel size');
    }
    
    if (params.angle && (params.angle <= 0 || params.angle >= 90)) {
      errors.push(`Invalid bevel angle: ${params.angle}`);
    }
    
    if (params.bevelType && !['chamfer', 'round', 'variable'].includes(params.bevelType)) {
      errors.push(`Invalid bevel type: ${params.bevelType}`);
    }
    
    return errors;
  }
  
  /**
   * Crée un chanfrein classique à angle fixe
   */
  private createChamferGeometry(
    size: number,
    angle: number,
    length: number,
    edgePosition: string,
    element: PivotElement
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculer les dimensions du chanfrein
    const xOffset = size;
    const yOffset = size * Math.tan(angleRad);
    
    // Créer le profil triangulaire du chanfrein
    shape.moveTo(0, 0);
    shape.lineTo(xOffset * 1.2, 0);
    shape.lineTo(xOffset * 1.2, yOffset * 1.2);
    shape.lineTo(0, yOffset);
    shape.closePath();
    
    // Extruder le long de l'arête
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    // Positionner selon l'arête
    geometry.center();
    this.positionForEdge(geometry, edgePosition, element);
    
    return geometry;
  }
  
  /**
   * Crée un biseau arrondi
   */
  private createRoundBevelGeometry(
    radius: number,
    length: number,
    edgePosition: string,
    element: PivotElement
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const segments = 16;
    
    // Créer un quart de cercle pour le profil arrondi
    shape.moveTo(0, 0);
    shape.lineTo(radius * 1.2, 0);
    shape.lineTo(radius * 1.2, radius * 1.2);
    
    // Arc de cercle
    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI / 2) * (i / segments);
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      shape.lineTo(x, y);
    }
    
    shape.lineTo(0, 0);
    
    // Extruder
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    geometry.center();
    this.positionForEdge(geometry, edgePosition, element);
    
    return geometry;
  }
  
  /**
   * Crée un biseau variable (taille change le long de l'arête)
   */
  private createVariableBevelGeometry(
    startSize: number,
    endSize: number,
    angle: number,
    length: number,
    edgePosition: string,
    element: PivotElement
  ): THREE.BufferGeometry {
    // Créer un biseau qui varie en taille
    const points: THREE.Vector3[] = [];
    const segments = 20;
    const angleRad = (angle * Math.PI) / 180;
    
    // Générer les points du biseau variable
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const currentSize = startSize + (endSize - startSize) * t;
      const z = (length * i) / segments;
      
      // Triangle du chanfrein à cette position
      points.push(new THREE.Vector3(0, 0, z));
      points.push(new THREE.Vector3(currentSize, 0, z));
      points.push(new THREE.Vector3(0, currentSize * Math.tan(angleRad), z));
    }
    
    // Créer la géométrie à partir des points
    // Simplifié: utiliser une box pour l'approximation
    const avgSize = (startSize + endSize) / 2;
    const geometry = new THREE.BoxGeometry(
      avgSize * 1.2,
      avgSize * Math.tan(angleRad) * 1.2,
      length
    );
    
    geometry.center();
    this.positionForEdge(geometry, edgePosition, element);
    
    return geometry;
  }
  
  /**
   * Positionne la géométrie du biseau selon l'arête
   */
  private positionForEdge(
    geometry: THREE.BufferGeometry,
    edgePosition: string,
    element: PivotElement
  ): void {
    const dims = element.dimensions;
    const halfHeight = (dims.height || 100) / 2;
    const halfWidth = (dims.width || 100) / 2;
    
    switch (edgePosition) {
      case 'top':
        geometry.translate(0, halfHeight, 0);
        break;
        
      case 'bottom':
        geometry.translate(0, -halfHeight, 0);
        geometry.rotateZ(Math.PI);
        break;
        
      case 'left':
        geometry.translate(-halfWidth, 0, 0);
        geometry.rotateZ(-Math.PI / 2);
        break;
        
      case 'right':
        geometry.translate(halfWidth, 0, 0);
        geometry.rotateZ(Math.PI / 2);
        break;
        
      case 'all':
        // Pour toutes les arêtes, il faudrait créer 4 géométries
        // Pour simplifier, on positionne en haut
        geometry.translate(0, halfHeight, 0);
        break;
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}