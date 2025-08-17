/**
 * Processeur pour les contours de découpe complexes
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement } from '@/types/viewer';

export class ContourProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;
  
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
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
      
      // Créer la géométrie du contour
      const contourGeometry = this.createContourGeometry(
        feature.parameters.points!,
        feature.parameters.closed ?? true,
        feature.parameters.bulge,
        element.dimensions.thickness || 10
      );
      
      if (!contourGeometry) {
        return {
          success: false,
          error: 'Failed to create contour geometry'
        };
      }
      
      // Positionner le contour
      const contourBrush = new Brush(contourGeometry);
      contourBrush.position.copy(feature.position);
      contourBrush.rotation.copy(feature.rotation);
      contourBrush.updateMatrixWorld();
      
      // Créer le brush de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const resultBrush = this.evaluator.evaluate(baseBrush, contourBrush, SUBTRACTION);
      
      // Nettoyer
      contourGeometry.dispose();
      
      // Extraire et optimiser la géométrie
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
        error: `Failed to process contour: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    // Vérifier les points
    if (!params.points || params.points.length < 3) {
      errors.push('Contour requires at least 3 points');
    }
    
    // Vérifier que les points sont valides
    if (params.points) {
      for (let i = 0; i < params.points.length; i++) {
        const point = params.points[i];
        if (typeof point[0] !== 'number' || typeof point[1] !== 'number') {
          errors.push(`Invalid point at index ${i}`);
        }
      }
    }
    
    // Vérifier les bulges si présents
    if (params.bulge) {
      if (params.bulge.length !== params.points!.length) {
        errors.push('Bulge array must match points array length');
      }
    }
    
    return errors;
  }
  
  /**
   * Crée une géométrie à partir d'un contour avec support des arcs
   */
  private createContourGeometry(
    points: Array<[number, number]>,
    closed: boolean,
    bulges?: number[],
    depth: number = 10
  ): THREE.BufferGeometry | null {
    try {
      const shape = new THREE.Shape();
      
      if (points.length === 0) return null;
      
      // Déplacer au premier point
      shape.moveTo(points[0][0], points[0][1]);
      
      // Parcourir les points
      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];
        
        // Vérifier s'il y a un bulge (arc) entre les deux points
        if (bulges && bulges[i - 1] && bulges[i - 1] !== 0) {
          // Calculer l'arc à partir du bulge
          const arc = this.calculateArcFromBulge(
            prevPoint,
            currentPoint,
            bulges[i - 1]
          );
          
          if (arc) {
            // Ajouter une courbe quadratique pour approximer l'arc
            shape.quadraticCurveTo(
              arc.control.x,
              arc.control.y,
              currentPoint[0],
              currentPoint[1]
            );
          } else {
            // Ligne droite si l'arc ne peut pas être calculé
            shape.lineTo(currentPoint[0], currentPoint[1]);
          }
        } else {
          // Ligne droite
          shape.lineTo(currentPoint[0], currentPoint[1]);
        }
      }
      
      // Fermer le contour si nécessaire
      if (closed) {
        // Gérer le dernier segment
        if (bulges && bulges[points.length - 1] && bulges[points.length - 1] !== 0) {
          const arc = this.calculateArcFromBulge(
            points[points.length - 1],
            points[0],
            bulges[points.length - 1]
          );
          
          if (arc) {
            shape.quadraticCurveTo(
              arc.control.x,
              arc.control.y,
              points[0][0],
              points[0][1]
            );
          }
        }
        shape.closePath();
      }
      
      // Vérifier que le shape est valide
      if (!this.isShapeValid(shape)) {
        console.warn('Invalid shape created from contour');
        return null;
      }
      
      // Extruder le contour
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: depth * 1.1, // Légèrement plus profond pour assurer la découpe
        bevelEnabled: false,
        steps: 1
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.center();
      
      return geometry;
      
    } catch (error) {
      console.error('Failed to create contour geometry:', error);
      return null;
    }
  }
  
  /**
   * Calcule un arc à partir d'un bulge
   * Le bulge est la tangente de 1/4 de l'angle de l'arc
   */
  private calculateArcFromBulge(
    start: [number, number],
    end: [number, number],
    bulge: number
  ): { control: THREE.Vector2, radius: number, angle: number } | null {
    try {
      // Calculer la corde (distance entre les points)
      const chord = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
      if (chord === 0) return null;
      
      // Calculer la flèche (sagitta) à partir du bulge
      const sagitta = Math.abs(bulge) * chord / 2;
      
      // Calculer le rayon de l'arc
      const radius = (chord * chord / 4 + sagitta * sagitta) / (2 * sagitta);
      
      // Point milieu de la corde
      const midPoint = new THREE.Vector2(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2
      );
      
      // Direction perpendiculaire à la corde
      const chordDir = new THREE.Vector2(
        end[0] - start[0],
        end[1] - start[1]
      ).normalize();
      
      const perpDir = new THREE.Vector2(
        -chordDir.y,
        chordDir.x
      );
      
      // Le signe du bulge détermine la direction de l'arc
      const sign = Math.sign(bulge);
      
      // Point de contrôle pour la courbe quadratique
      const control = new THREE.Vector2(
        midPoint.x + perpDir.x * sagitta * sign,
        midPoint.y + perpDir.y * sagitta * sign
      );
      
      // Angle de l'arc
      const angle = 4 * Math.atan(Math.abs(bulge));
      
      return { control, radius, angle };
      
    } catch (error) {
      console.error('Failed to calculate arc from bulge:', error);
      return null;
    }
  }
  
  /**
   * Vérifie qu'un shape est valide
   */
  private isShapeValid(shape: THREE.Shape): boolean {
    try {
      // Vérifier que le shape a des points
      if (!shape.curves || shape.curves.length === 0) {
        return false;
      }
      
      // Vérifier que le shape n'est pas dégénéré
      const points = shape.getPoints();
      if (points.length < 3) {
        return false;
      }
      
      // Calculer l'aire pour vérifier que le shape n'est pas plat
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
      }
      area = Math.abs(area / 2);
      
      // Si l'aire est trop petite, le shape est dégénéré
      if (area < 0.001) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Optimisation: traiter plusieurs contours en une seule opération
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    contours: Feature[],
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider tous les contours
      const allErrors: string[] = [];
      for (const contour of contours) {
        const errors = this.validateFeature(contour, element);
        if (errors.length > 0) {
          allErrors.push(`Contour ${contour.id}: ${errors.join('; ')}`);
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
      
      // Appliquer tous les contours
      for (const contour of contours) {
        const contourGeometry = this.createContourGeometry(
          contour.parameters.points!,
          contour.parameters.closed ?? true,
          contour.parameters.bulge,
          element.dimensions.thickness || 10
        );
        
        if (!contourGeometry) {
          allErrors.push(`Failed to create geometry for contour ${contour.id}`);
          continue;
        }
        
        const contourBrush = new Brush(contourGeometry);
        contourBrush.position.copy(contour.position);
        contourBrush.rotation.copy(contour.rotation);
        contourBrush.updateMatrixWorld();
        
        // Soustraire le contour
        const resultBrush = this.evaluator.evaluate(currentBrush, contourBrush, SUBTRACTION);
        
        // Nettoyer
        if (currentBrush.geometry !== geometry) {
          currentBrush.geometry.dispose();
        }
        contourGeometry.dispose();
        
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
        geometry: resultGeometry,
        warning: allErrors.length > 0 ? allErrors.join('\n') : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process batch contours: ${error}`
      };
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}