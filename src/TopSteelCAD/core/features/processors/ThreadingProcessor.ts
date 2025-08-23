import * as THREE from 'three';
import {Feature, ProcessorResult, IFeatureProcessor, ProfileFace} from '../types';
import { PivotElement } from '@/types/viewer';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

/**
 * Processeur pour les filetages (threading)
 * Gère les blocs TO de la norme DSTV
 */
export class ThreadingProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;

  constructor() {
    this.evaluator = new Evaluator();
  }

  canProcess(type: string): boolean {
    return type === 'thread' || type === 'threading' || type === 'tapped';
  }

  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`🔩 ThreadingProcessor.process called for feature ${feature.id}`);
    console.log(`  - Feature params:`, feature.parameters);
    console.log(`  - Element:`, element.id, element.dimensions);
    
    try {
      // Paramètres du filetage
      const diameter = feature.parameters.diameter || 20;
      const depth = feature.parameters.depth || element.dimensions.thickness || 10;
      const pitch = feature.parameters.pitch || 2.5; // Pas du filetage
      const threadType = feature.parameters.threadType || 'metric'; // metric, imperial, etc.
      const position = feature.parameters.position || [0, 0, 0];
      const face = feature.parameters.face || ProfileFace.TOP;
      
      console.log(`  📐 Thread parameters:`);
      console.log(`    - Diameter: ${diameter}mm`);
      console.log(`    - Depth: ${depth}mm`);
      console.log(`    - Pitch: ${pitch}mm`);
      console.log(`    - Type: ${threadType}`);
      console.log(`    - Face: ${face}`);
      
      // Créer la géométrie du trou fileté
      // Pour l'instant, on utilise un cylindre simple avec un diamètre légèrement plus petit
      // Dans une vraie implémentation, on pourrait créer une hélice pour représenter le filetage
      const threadGeometry = this.createThreadGeometry(diameter, depth, pitch);
      
      if (!threadGeometry) {
        return {
          success: false,
          error: 'Failed to create thread geometry'
        };
      }
      
      // Positionner le filetage
      const threadBrush = new Brush(threadGeometry);
      
      // Convertir la position DSTV si nécessaire
      // Si la feature vient du pipeline DSTV, elle aura une position spécifique
      if (feature.parameters.position && Array.isArray(feature.parameters.position)) {
        const convertedPos = this.convertDSTVPosition(feature.parameters.position as number[], face, element);
        threadBrush.position.set(convertedPos.x, convertedPos.y, convertedPos.z);
      } else {
        threadBrush.position.copy(feature.position);
      }
      
      // Appliquer la rotation selon la face
      this.applyFaceRotation(threadBrush, face);
      threadBrush.updateMatrixWorld();
      
      console.log(`  - Thread positioned at:`, threadBrush.position);
      
      // Soustraire le filetage de la géométrie
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      console.log(`  - Performing CSG subtraction...`);
      const resultBrush = this.evaluator.evaluate(baseBrush, threadBrush, SUBTRACTION);
      
      // Extraire et optimiser la géométrie
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Nettoyer
      threadGeometry.dispose();
      resultBrush.geometry.dispose();
      
      console.log(`  ✅ Threading applied successfully`);
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to process threading: ${error}`);
      return {
        success: false,
        error: `Failed to process threading: ${error}`
      };
    }
  }

  /**
   * Crée la géométrie d'un filetage
   */
  private createThreadGeometry(
    diameter: number, 
    depth: number, 
    pitch: number
  ): THREE.BufferGeometry | null {
    try {
      // Diamètre du trou = diamètre nominal - pitch (approximation)
      const holeDiameter = diameter - pitch;
      
      // Créer un cylindre pour le trou fileté
      const geometry = new THREE.CylinderGeometry(
        holeDiameter / 2,  // Rayon supérieur
        holeDiameter / 2,  // Rayon inférieur
        depth,             // Hauteur
        16                 // Segments (16 pour un bon compromis qualité/performance)
      );
      
      // Rotation pour aligner avec l'axe Z (par défaut CylinderGeometry est sur Y)
      const rotMatrix = new THREE.Matrix4();
      rotMatrix.makeRotationX(Math.PI / 2);
      geometry.applyMatrix4(rotMatrix);
      
      // Optionnel : Ajouter des détails de filetage (hélice)
      // Pour une représentation visuelle plus réaliste, on pourrait
      // créer une géométrie hélicoïdale ici
      
      return geometry;
      
    } catch (error) {
      console.error(`Failed to create thread geometry: ${error}`);
      return null;
    }
  }

  /**
   * Convertit une position DSTV vers le système de coordonnées Three.js
   */
  private convertDSTVPosition(
    position: number[],
    face: ProfileFace | undefined,
    element: PivotElement
  ): { x: number; y: number; z: number } {
    const length = element.dimensions.length || 0;
    const width = element.dimensions.width || 0;
    const height = element.dimensions.height || 0;
    
    // Conversion basique DSTV -> Three.js
    // DSTV: origine au coin, Three.js: origine au centre
    return {
      x: position[0] - length / 2,
      y: position[1] - width / 2,
      z: position[2] || 0
    };
  }

  /**
   * Applique la rotation selon la face
   */
  private applyFaceRotation(brush: Brush, face: string): void {
    switch (face) {
      case ProfileFace.TOP:
      case 'v':
        // Pas de rotation, déjà aligné
        break;
      case 'bottom':
      case 'u':
        brush.rotation.x = Math.PI;
        break;
      case 'left':
        brush.rotation.z = Math.PI / 2;
        break;
      case 'right':
        brush.rotation.z = -Math.PI / 2;
        break;
      case 'front':
        brush.rotation.x = Math.PI / 2;
        break;
      case 'back':
        brush.rotation.x = -Math.PI / 2;
        break;
      case 'web':
      case 'o':
        brush.rotation.z = Math.PI / 2;
        break;
    }
  }

  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    
    // Validation basique
    if (!feature.parameters) {
      errors.push('Missing parameters');
      return errors;
    }
    
    // Validation spécifique au filetage
    const diameter = feature.parameters.diameter;
    if (diameter && (diameter <= 0 || diameter > 100)) {
      errors.push(`Invalid thread diameter: ${diameter}mm (must be between 0 and 100mm)`);
    }
    
    const depth = feature.parameters.depth;
    if (depth && depth <= 0) {
      errors.push(`Invalid thread depth: ${depth}mm (must be positive)`);
    }
    
    const pitch = feature.parameters.pitch;
    if (pitch && diameter && (pitch <= 0 || pitch > diameter / 2)) {
      errors.push(`Invalid thread pitch: ${pitch}mm`);
    }
    
    return errors;
  }

  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}