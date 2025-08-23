import * as THREE from 'three';
import { Feature, ProcessorResult, IFeatureProcessor } from '../types';
import { PivotElement } from '@/types/viewer';

/**
 * Processeur pour les pliages (bending)
 * Gère les blocs KA de la norme DSTV
 */
export class BendingProcessor implements IFeatureProcessor {

  constructor() {}

  canProcess(type: string): boolean {
    return type === 'bend' || type === 'bending' || type === 'fold';
  }

  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`🔄 BendingProcessor.process called for feature ${feature.id}`);
    console.log(`  - Feature params:`, feature.parameters);
    console.log(`  - Element:`, element.id, element.dimensions);
    
    try {
      // Paramètres du pliage
      const angle = feature.parameters.angle || 90; // Angle de pliage en degrés
      const radius = feature.parameters.radius || 5; // Rayon de pliage
      const position = typeof feature.parameters.position === 'number' ? feature.parameters.position : 0; // Position le long de l'axe
      const axis = feature.parameters.axis || 'x'; // Axe de pliage
      const direction = feature.parameters.direction || 'up'; // Direction du pliage
      
      console.log(`  📐 Bend parameters:`);
      console.log(`    - Angle: ${angle}°`);
      console.log(`    - Radius: ${radius}mm`);
      console.log(`    - Position: ${position}mm`);
      console.log(`    - Axis: ${axis}`);
      console.log(`    - Direction: ${direction}`);
      
      // Créer une copie de la géométrie pour la modifier
      const bentGeometry = geometry.clone();
      
      // Appliquer la transformation de pliage
      this.applyBending(bentGeometry, angle, radius, position, axis, direction, element);
      
      // Recalculer les normales et les limites
      bentGeometry.computeVertexNormals();
      bentGeometry.computeBoundingBox();
      bentGeometry.computeBoundingSphere();
      
      console.log(`  ✅ Bending applied successfully`);
      
      return {
        success: true,
        geometry: bentGeometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to process bending: ${error}`);
      return {
        success: false,
        error: `Failed to process bending: ${error}`
      };
    }
  }

  /**
   * Applique une transformation de pliage à la géométrie
   */
  private applyBending(
    geometry: THREE.BufferGeometry,
    angle: number,
    radius: number,
    position: number,
    axis: string,
    direction: string,
    element: PivotElement
  ): void {
    const positions = geometry.attributes.position;
    const angleRad = (angle * Math.PI) / 180;
    
    // Déterminer l'axe et le plan de pliage
    let bendAxisIndex = 0; // x par défaut
    let perpAxis1 = 1; // y
    let perpAxis2 = 2; // z
    
    switch (axis.toLowerCase()) {
      case 'x':
        bendAxisIndex = 0;
        perpAxis1 = 1;
        perpAxis2 = 2;
        break;
      case 'y':
        bendAxisIndex = 1;
        perpAxis1 = 0;
        perpAxis2 = 2;
        break;
      case 'z':
        bendAxisIndex = 2;
        perpAxis1 = 0;
        perpAxis2 = 1;
        break;
    }
    
    // Direction du pliage
    const directionSign = direction === 'up' || direction === 'positive' ? 1 : -1;
    
    // Appliquer la transformation à chaque vertex
    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      
      // Distance du vertex par rapport à la ligne de pliage
      const distanceFromBend = vertex.toArray()[bendAxisIndex] - position;
      
      // Appliquer le pliage seulement aux vertices après la position de pliage
      if (distanceFromBend > 0) {
        // Calculer la position après pliage
        const bendAmount = Math.min(distanceFromBend / radius, angleRad);
        const newDistance = radius * Math.sin(bendAmount);
        const heightOffset = radius * (1 - Math.cos(bendAmount)) * directionSign;
        
        // Mettre à jour la position
        const newPos = vertex.toArray();
        newPos[bendAxisIndex] = position + newDistance;
        newPos[perpAxis2] += heightOffset;
        
        positions.setXYZ(i, newPos[0], newPos[1], newPos[2]);
      }
    }
    
    // Marquer la géométrie comme nécessitant une mise à jour
    positions.needsUpdate = true;
  }

  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    
    // Validation basique
    if (!feature.parameters) {
      errors.push('Missing parameters');
      return errors;
    }
    
    // Validation spécifique au pliage
    const angle = feature.parameters.angle;
    if (angle !== undefined && (angle < 0 || angle > 180)) {
      errors.push(`Invalid bend angle: ${angle}° (must be between 0 and 180)`);
    }
    
    const radius = feature.parameters.radius;
    if (radius !== undefined && radius <= 0) {
      errors.push(`Invalid bend radius: ${radius}mm (must be positive)`);
    }
    
    const axis = feature.parameters.axis;
    if (axis && !['x', 'y', 'z'].includes(axis.toLowerCase())) {
      errors.push(`Invalid bend axis: ${axis} (must be x, y, or z)`);
    }
    
    return errors;
  }

  dispose(): void {
    // Pas de ressources à libérer
  }
}