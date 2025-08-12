/**
 * Processeur pour les trous taraudés (filetés)
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

export class TappedHoleProcessor implements IFeatureProcessor {
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
      
      // Paramètres du trou taraudé
      const nominalDiameter = params.diameter || 20;
      const threadPitch = params.threadPitch || this.getStandardPitch(nominalDiameter);
      const depth = params.depth || element.dimensions.thickness || 10;
      const threadType = params.threadType || 'metric'; // metric, unc, unf
      const threadClass = params.threadClass || '6H'; // Classe de tolérance
      
      // Calculer les diamètres réels
      const coreDiameter = this.calculateCoreDiameter(nominalDiameter, threadPitch, threadType);
      const pitchDiameter = this.calculatePitchDiameter(nominalDiameter, threadPitch);
      
      // Créer la géométrie du trou taraudé
      const tappedHoleGeometry = this.createTappedHoleGeometry(
        coreDiameter,
        pitchDiameter,
        nominalDiameter,
        depth,
        threadPitch
      );
      
      // Calculer la position
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        feature.position,
        feature.face
      );
      
      // Positionner le trou
      const holeBrush = new Brush(tappedHoleGeometry);
      holeBrush.position.set(
        position3D.position[0],
        position3D.position[1],
        position3D.position[2]
      );
      holeBrush.rotation.set(
        position3D.rotation[0],
        position3D.rotation[1],
        position3D.rotation[2]
      );
      
      holeBrush.updateMatrixWorld();
      
      // Soustraire de la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);
      
      // Nettoyer
      tappedHoleGeometry.dispose();
      
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
        error: `Failed to process tapped hole: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.diameter || params.diameter <= 0) {
      errors.push('Invalid tapped hole diameter');
    }
    
    if (params.threadPitch && params.threadPitch <= 0) {
      errors.push('Invalid thread pitch');
    }
    
    if (params.threadType && !['metric', 'unc', 'unf', 'bsw'].includes(params.threadType)) {
      errors.push(`Unknown thread type: ${params.threadType}`);
    }
    
    return errors;
  }
  
  /**
   * Crée la géométrie d'un trou taraudé avec filetage simulé
   */
  private createTappedHoleGeometry(
    coreDiameter: number,
    pitchDiameter: number,
    nominalDiameter: number,
    depth: number,
    threadPitch: number
  ): THREE.BufferGeometry {
    // Pour la visualisation, on crée un trou avec un profil qui simule le filetage
    // En pratique, on utilise un cylindre légèrement plus petit que le diamètre nominal
    
    const segments = 32;
    const actualDepth = depth * 1.1;
    
    // Créer le profil du filetage (simplifié pour la visualisation)
    const points: THREE.Vector2[] = [];
    const numThreads = Math.floor(actualDepth / threadPitch);
    
    // Créer un profil en dents de scie pour simuler le filetage
    for (let i = 0; i <= numThreads; i++) {
      const y = (i * threadPitch);
      
      // Diamètre au fond du filet
      points.push(new THREE.Vector2(coreDiameter / 2, y));
      
      // Diamètre au sommet du filet (légèrement en dessous du nominal)
      if (i < numThreads) {
        points.push(new THREE.Vector2(pitchDiameter / 2, y + threadPitch * 0.5));
      }
    }
    
    // Si on a peu de filets, utiliser un cylindre simple
    if (numThreads < 3) {
      return new THREE.CylinderGeometry(
        coreDiameter / 2,
        coreDiameter / 2,
        actualDepth,
        segments
      );
    }
    
    // Créer une géométrie de révolution pour le filetage
    const latheGeometry = new THREE.LatheGeometry(points, segments);
    
    // Centrer et orienter
    latheGeometry.center();
    
    return latheGeometry;
  }
  
  /**
   * Calcule le diamètre au fond du filet (core diameter)
   */
  private calculateCoreDiameter(
    nominalDiameter: number,
    threadPitch: number,
    threadType: string
  ): number {
    switch (threadType) {
      case 'metric':
        // ISO metric: D1 = D - 1.0825 * P
        return nominalDiameter - 1.0825 * threadPitch;
        
      case 'unc':
      case 'unf':
        // Unified thread: approximation
        return nominalDiameter - 1.299 * threadPitch;
        
      case 'bsw':
        // British Standard Whitworth
        return nominalDiameter - 1.28 * threadPitch;
        
      default:
        // Approximation générale
        return nominalDiameter - 1.2 * threadPitch;
    }
  }
  
  /**
   * Calcule le diamètre primitif (pitch diameter)
   */
  private calculatePitchDiameter(
    nominalDiameter: number,
    threadPitch: number
  ): number {
    // Pour filetage métrique: D2 = D - 0.6495 * P
    return nominalDiameter - 0.6495 * threadPitch;
  }
  
  /**
   * Retourne le pas standard pour un diamètre donné (métrique)
   */
  private getStandardPitch(diameter: number): number {
    // Table des pas standards métriques (ISO)
    const standardPitches: Record<number, number> = {
      3: 0.5,
      4: 0.7,
      5: 0.8,
      6: 1.0,
      8: 1.25,
      10: 1.5,
      12: 1.75,
      14: 2.0,
      16: 2.0,
      18: 2.5,
      20: 2.5,
      22: 2.5,
      24: 3.0,
      27: 3.0,
      30: 3.5,
      33: 3.5,
      36: 4.0,
      39: 4.0,
      42: 4.5,
      45: 4.5,
      48: 5.0,
      52: 5.0,
      56: 5.5,
      60: 5.5,
      64: 6.0
    };
    
    // Trouver le pas le plus proche
    const closestDiameter = Object.keys(standardPitches)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - diameter) < Math.abs(prev - diameter) ? curr : prev
      );
    
    return standardPitches[closestDiameter] || 1.5;
  }
  
  /**
   * Traitement par batch pour plusieurs trous taraudés
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    holes: Feature[],
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider tous les trous
      const allErrors: string[] = [];
      for (const hole of holes) {
        const errors = this.validateFeature(hole, element);
        if (errors.length > 0) {
          allErrors.push(`Tapped hole ${hole.id}: ${errors.join('; ')}`);
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
      
      // Appliquer tous les trous taraudés
      for (const hole of holes) {
        const params = hole.parameters;
        const nominalDiameter = params.diameter || 20;
        const threadPitch = params.threadPitch || this.getStandardPitch(nominalDiameter);
        const depth = params.depth || element.dimensions.thickness || 10;
        const threadType = params.threadType || 'metric';
        
        const coreDiameter = this.calculateCoreDiameter(nominalDiameter, threadPitch, threadType);
        const pitchDiameter = this.calculatePitchDiameter(nominalDiameter, threadPitch);
        
        const position3D = this.positionCalculator.calculateFeaturePosition(
          element,
          hole.position,
          hole.face
        );
        
        const holeGeometry = this.createTappedHoleGeometry(
          coreDiameter,
          pitchDiameter,
          nominalDiameter,
          depth,
          threadPitch
        );
        
        const holeBrush = new Brush(holeGeometry);
        holeBrush.position.set(
          position3D.position[0],
          position3D.position[1],
          position3D.position[2]
        );
        holeBrush.rotation.set(
          position3D.rotation[0],
          position3D.rotation[1],
          position3D.rotation[2]
        );
        holeBrush.updateMatrixWorld();
        
        const resultBrush = this.evaluator.evaluate(currentBrush, holeBrush, SUBTRACTION);
        
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
        error: `Failed to process batch tapped holes: ${error}`
      };
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}