/**
 * Processeur pour les chanfreins
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionService } from '../../services/PositionService';

export class ChamferProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;
  private positionService: PositionService;
  
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    this.positionService = PositionService.getInstance();
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
      
      // Paramètres du chanfrein
      const chamferSize = params.size || 5;
      const chamferAngle = params.angle || 45;
      const edgePosition = params.edgePosition || 'all'; // top, bottom, left, right, all, custom
      const length = params.length || element.dimensions.length || 1000;
      
      // Créer la géométrie du chanfrein
      const chamferGeometry = this.createChamferGeometry(
        chamferSize,
        chamferAngle,
        length,
        edgePosition,
        element
      );
      
      // Calculer la position
      const position3D = this.positionService.calculateFeaturePosition(
        element,
        feature.position,
        feature.face,
        'dstv'
      );
      
      // Positionner le chanfrein
      const chamferBrush = new Brush(chamferGeometry);
      chamferBrush.position.set(
        position3D.position.x,
        position3D.position.y,
        position3D.position.z
      );
      chamferBrush.rotation.set(
        position3D.rotation.x,
        position3D.rotation.y,
        position3D.rotation.z
      );
      
      // Ajouter rotation supplémentaire si spécifiée
      if (feature.rotation) {
        chamferBrush.rotation.x += feature.rotation.x;
        chamferBrush.rotation.y += feature.rotation.y;
        chamferBrush.rotation.z += feature.rotation.z;
      }
      
      chamferBrush.updateMatrixWorld();
      
      // Soustraire de la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, chamferBrush, SUBTRACTION);
      
      // Nettoyer
      chamferGeometry.dispose();
      
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
        error: `Failed to process chamfer: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (params.angle && (params.angle <= 0 || params.angle >= 90)) {
      errors.push(`Invalid chamfer angle: ${params.angle}`);
    }
    
    if (!params.size || params.size <= 0) {
      errors.push(`Invalid chamfer size: ${params.size}`);
    }
    
    if (params.edgePosition && !['top', 'bottom', 'left', 'right', 'all', 'custom'].includes(params.edgePosition)) {
      errors.push(`Invalid edge position: ${params.edgePosition}`);
    }
    
    return errors;
  }
  
  /**
   * Crée la géométrie d'un chanfrein
   */
  private createChamferGeometry(
    size: number,
    angle: number,
    length: number,
    edgePosition: string,
    element: PivotElement
  ): THREE.BufferGeometry {
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculer les dimensions du chanfrein
    const xOffset = size;
    const yOffset = size * Math.tan(angleRad);
    
    // Créer le profil triangulaire du chanfrein
    const shape = new THREE.Shape();
    
    // Triangle pour soustraire et créer le chanfrein
    shape.moveTo(0, 0);
    shape.lineTo(xOffset * 1.2, 0);
    shape.lineTo(xOffset * 1.2, yOffset * 1.2);
    shape.lineTo(0, yOffset);
    shape.closePath();
    
    // Extruder le long de l'arête
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer et positionner selon l'arête
    geometry.center();
    this.positionForEdge(geometry, edgePosition, element);
    
    return geometry;
  }
  
  /**
   * Positionne la géométrie du chanfrein selon l'arête
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
        // Arête supérieure
        geometry.translate(halfWidth, halfHeight, 0);
        geometry.rotateZ(-Math.PI / 4);
        break;
        
      case 'bottom':
        // Arête inférieure
        geometry.translate(halfWidth, -halfHeight, 0);
        geometry.rotateZ(Math.PI - Math.PI / 4);
        break;
        
      case 'left':
        // Arête gauche
        geometry.translate(-halfWidth, halfHeight, 0);
        geometry.rotateZ(-Math.PI / 2 - Math.PI / 4);
        break;
        
      case 'right':
        // Arête droite
        geometry.translate(halfWidth, halfHeight, 0);
        geometry.rotateZ(Math.PI / 4);
        break;
        
      case 'all':
        // Pour toutes les arêtes, on devrait créer 4 géométries séparées
        // Pour simplifier, on applique sur l'arête supérieure droite
        geometry.translate(halfWidth, halfHeight, 0);
        geometry.rotateZ(-Math.PI / 4);
        break;
        
      case 'custom':
        // Position personnalisée, pas de transformation supplémentaire
        break;
        
      default:
        // Par défaut, arête supérieure droite
        geometry.translate(halfWidth, halfHeight, 0);
        geometry.rotateZ(-Math.PI / 4);
    }
  }
  
  /**
   * Traitement par batch pour plusieurs chanfreins
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    chamfers: Feature[],
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider tous les chanfreins
      const allErrors: string[] = [];
      for (const chamfer of chamfers) {
        const errors = this.validateFeature(chamfer, element);
        if (errors.length > 0) {
          allErrors.push(`Chamfer ${chamfer.id}: ${errors.join('; ')}`);
        }
      }
      
      if (allErrors.length > 0) {
        return {
          success: false,
          error: allErrors.join('\n')
        };
      }
      
      // Créer le brush de base
      let currentBrush = new Brush(geometry);
      currentBrush.updateMatrixWorld();
      
      // Appliquer tous les chanfreins
      for (const chamfer of chamfers) {
        const params = chamfer.parameters;
        const chamferSize = params.size || 5;
        const chamferAngle = params.angle || 45;
        const edgePosition = params.edgePosition || 'all';
        const length = params.length || element.dimensions.length || 1000;
        
        const chamferGeometry = this.createChamferGeometry(
          chamferSize,
          chamferAngle,
          length,
          edgePosition,
          element
        );
        
        const position3D = this.positionService.calculateFeaturePosition(
          element,
          chamfer.position,
          chamfer.face,
          'dstv'
        );
        
        const chamferBrush = new Brush(chamferGeometry);
        chamferBrush.position.set(
          position3D.position.x,
          position3D.position.y,
          position3D.position.z
        );
        chamferBrush.rotation.set(
          position3D.rotation.x,
          position3D.rotation.y,
          position3D.rotation.z
        );
        
        if (chamfer.rotation) {
          chamferBrush.rotation.x += chamfer.rotation.x;
          chamferBrush.rotation.y += chamfer.rotation.y;
          chamferBrush.rotation.z += chamfer.rotation.z;
        }
        
        chamferBrush.updateMatrixWorld();
        
        const resultBrush = this.evaluator.evaluate(currentBrush, chamferBrush, SUBTRACTION);
        
        if (currentBrush.geometry !== geometry) {
          currentBrush.geometry.dispose();
        }
        chamferGeometry.dispose();
        
        currentBrush = resultBrush;
      }
      
      // Extraire la géométrie finale
      const resultGeometry = currentBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      currentBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process batch chamfers: ${error}`
      };
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}