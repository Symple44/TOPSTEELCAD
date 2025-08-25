/**
 * Processeur pour les motifs de perçage (patterns de trous)
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

export class DrillPatternProcessor implements IFeatureProcessor {
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
      
      // Paramètres du motif de perçage
      const patternType = params.patternType || 'linear'; // linear, circular, rectangular, staggered
      const holeDiameter = params.diameter || 10;
      const holeDepth = params.depth || element.dimensions.thickness || 10;
      
      // Générer les positions selon le type de motif
      let holePositions: THREE.Vector3[] = [];
      
      switch (patternType) {
        case 'linear':
          holePositions = this.generateLinearPattern(feature.position, params);
          break;
          
        case 'circular':
          holePositions = this.generateCircularPattern(feature.position, params);
          break;
          
        case 'rectangular':
          holePositions = this.generateRectangularPattern(feature.position, params);
          break;
          
        case 'staggered':
          holePositions = this.generateStaggeredPattern(feature.position, params);
          break;
          
        case 'custom':
          // Utiliser les positions fournies directement
          holePositions = params.customPositions?.map(p => 
            new THREE.Vector3(p.x, p.y, p.z || 0)
          ) || [];
          break;
          
        default:
          holePositions = [feature.position];
      }
      
      // Créer le brush de base
      let currentBrush = new Brush(geometry);
      currentBrush.updateMatrixWorld();
      
      // Appliquer chaque trou du motif
      for (const holePos of holePositions) {
        // Créer la géométrie du trou
        const holeGeometry = new THREE.CylinderGeometry(
          holeDiameter / 2,
          holeDiameter / 2,
          holeDepth * 1.1,
          16
        );
        
        // Calculer la position 3D
        const position3D = this.positionService.calculateFeaturePosition(
          element,
          holePos,
          feature.face,
          'dstv'
        );
        
        const holeBrush = new Brush(holeGeometry);
        holeBrush.position.set(
          position3D.position.x,
          position3D.position.y,
          position3D.position.z
        );
        holeBrush.rotation.set(
          position3D.rotation.x,
          position3D.rotation.y,
          position3D.rotation.z
        );
        holeBrush.updateMatrixWorld();
        
        // Soustraire le trou
        const resultBrush = this.evaluator.evaluate(currentBrush, holeBrush, SUBTRACTION);
        
        // Nettoyer
        if (currentBrush.geometry !== geometry) {
          currentBrush.geometry.dispose();
        }
        holeGeometry.dispose();
        
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
        error: `Failed to process drill pattern: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.diameter || params.diameter <= 0) {
      errors.push('Invalid hole diameter');
    }
    
    if (!params.patternType) {
      errors.push('Pattern type is required');
    }
    
    // Validation spécifique selon le type de motif
    switch (params.patternType) {
      case 'linear':
        if (!params.count || params.count < 2) {
          errors.push('Linear pattern requires at least 2 holes');
        }
        if (!params.spacing || params.spacing <= 0) {
          errors.push('Invalid spacing for linear pattern');
        }
        break;
        
      case 'circular':
        if (!params.count || params.count < 3) {
          errors.push('Circular pattern requires at least 3 holes');
        }
        if (!params.radius || params.radius <= 0) {
          errors.push('Invalid radius for circular pattern');
        }
        break;
        
      case 'rectangular':
        if (!params.rows || params.rows < 1) {
          errors.push('Invalid number of rows');
        }
        if (!params.columns || params.columns < 1) {
          errors.push('Invalid number of columns');
        }
        break;
    }
    
    return errors;
  }
  
  /**
   * Génère un motif linéaire de trous
   */
  private generateLinearPattern(
    origin: THREE.Vector3,
    params: any
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const count = params.count || 2;
    const spacing = params.spacing || 50;
    const direction = new THREE.Vector3(
      params.directionX || 1,
      params.directionY || 0,
      params.directionZ || 0
    ).normalize();
    
    for (let i = 0; i < count; i++) {
      const offset = direction.clone().multiplyScalar(i * spacing);
      positions.push(origin.clone().add(offset));
    }
    
    return positions;
  }
  
  /**
   * Génère un motif circulaire de trous
   */
  private generateCircularPattern(
    origin: THREE.Vector3,
    params: any
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const count = params.count || 6;
    const radius = params.radius || 50;
    const startAngle = params.startAngle || 0;
    const fullCircle = params.fullCircle !== false;
    const angleStep = fullCircle ? (2 * Math.PI) / count : (params.arcAngle || Math.PI) / (count - 1);
    
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const x = origin.x + radius * Math.cos(angle);
      const y = origin.y + radius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, y, origin.z));
    }
    
    return positions;
  }
  
  /**
   * Génère un motif rectangulaire de trous
   */
  private generateRectangularPattern(
    origin: THREE.Vector3,
    params: any
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const rows = params.rows || 2;
    const columns = params.columns || 2;
    const rowSpacing = params.rowSpacing || 50;
    const columnSpacing = params.columnSpacing || 50;
    const centered = params.centered !== false;
    
    // Calculer l'offset pour centrer le motif
    const offsetX = centered ? -(columns - 1) * columnSpacing / 2 : 0;
    const offsetY = centered ? -(rows - 1) * rowSpacing / 2 : 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = origin.x + col * columnSpacing + offsetX;
        const y = origin.y + row * rowSpacing + offsetY;
        positions.push(new THREE.Vector3(x, y, origin.z));
      }
    }
    
    return positions;
  }
  
  /**
   * Génère un motif en quinconce (staggered)
   */
  private generateStaggeredPattern(
    origin: THREE.Vector3,
    params: any
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const rows = params.rows || 3;
    const columns = params.columns || 3;
    const rowSpacing = params.rowSpacing || 50;
    const columnSpacing = params.columnSpacing || 50;
    const staggerOffset = params.staggerOffset || columnSpacing / 2;
    const centered = params.centered !== false;
    
    // Calculer l'offset pour centrer le motif
    const offsetX = centered ? -(columns - 1) * columnSpacing / 2 : 0;
    const offsetY = centered ? -(rows - 1) * rowSpacing / 2 : 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        // Décaler les lignes impaires
        const xOffset = row % 2 === 1 ? staggerOffset : 0;
        const x = origin.x + col * columnSpacing + xOffset + offsetX;
        const y = origin.y + row * rowSpacing + offsetY;
        
        // Ne pas ajouter les trous qui sortent des limites en cas de décalage
        if (row % 2 === 1 && col === columns - 1 && params.skipOverflow) {
          continue;
        }
        
        positions.push(new THREE.Vector3(x, y, origin.z));
      }
    }
    
    return positions;
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}