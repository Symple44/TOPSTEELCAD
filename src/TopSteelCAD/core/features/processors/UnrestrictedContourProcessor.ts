import * as THREE from 'three';
import {Feature, ProcessorResult, IFeatureProcessor, ProfileFace} from '../types';
import { PivotElement } from '@/types/viewer';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

/**
 * Processeur pour les contours non restreints (unrestricted contours)
 * Gère les blocs UE de la norme DSTV
 * Les contours non restreints permettent des formes complexes avec des courbes et des arcs
 */
export class UnrestrictedContourProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;

  constructor() {
    this.evaluator = new Evaluator();
  }

  canProcess(type: string): boolean {
    return type === 'unrestricted_contour' || type === 'unrestricted' || type === 'free_contour';
  }

  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`🎨 UnrestrictedContourProcessor.process called for feature ${feature.id}`);
    console.log(`  - Feature params:`, feature.parameters);
    console.log(`  - Element:`, element.id, element.dimensions);
    
    try {
      // Paramètres du contour non restreint
      const points = feature.parameters.points || feature.parameters.contourPoints || [];
      const closed = feature.parameters.closed !== false; // Par défaut fermé
      const depth = feature.parameters.depth || element.dimensions.thickness || 10;
      const operation = feature.parameters.operation || 'subtract';
      const face = feature.parameters.face || ProfileFace.WEB;
      const rawBulges = feature.parameters.bulge || [];
      const bulges = Array.isArray(rawBulges) ? rawBulges : (rawBulges !== undefined ? [rawBulges] : []); // Pour les arcs
      
      console.log(`  📐 Unrestricted contour parameters:`);
      console.log(`    - Points count: ${points.length}`);
      console.log(`    - Closed: ${closed}`);
      console.log(`    - Depth: ${depth}mm`);
      console.log(`    - Operation: ${operation}`);
      console.log(`    - Face: ${face}`);
      console.log(`    - Has arcs: ${bulges.length > 0}`);
      
      if (points.length < 2) {
        return {
          success: false,
          error: 'Unrestricted contour requires at least 2 points'
        };
      }
      
      // Créer la géométrie du contour non restreint
      const contourGeometry = this.createUnrestrictedContourGeometry(points, bulges, depth, closed, feature);
      
      if (!contourGeometry) {
        return {
          success: false,
          error: 'Failed to create unrestricted contour geometry'
        };
      }
      
      // Positionner le contour
      const contourBrush = new Brush(contourGeometry);
      
      // Appliquer la position et rotation
      // Si la feature vient du pipeline DSTV, elle aura une position spécifique
      if (feature.parameters.position && Array.isArray(feature.parameters.position)) {
        const convertedPos = this.convertDSTVPosition(feature.parameters.position || [0, 0, 0], face, element);
        contourBrush.position.set(convertedPos.x, convertedPos.y, convertedPos.z);
      } else {
        contourBrush.position.copy(feature.position);
      }
      
      // Appliquer la rotation selon la face
      this.applyFaceRotation(contourBrush, face);
      contourBrush.updateMatrixWorld();
      
      console.log(`  - Contour positioned at:`, contourBrush.position);
      
      // Appliquer l'opération CSG
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      let resultBrush;
      if (operation === 'subtract') {
        console.log(`  - Performing CSG subtraction...`);
        resultBrush = this.evaluator.evaluate(baseBrush, contourBrush, SUBTRACTION);
      } else if (operation === 'intersect') {
        console.log(`  - Performing CSG intersection...`);
        resultBrush = this.evaluator.evaluate(baseBrush, contourBrush, INTERSECTION);
      } else {
        // Par défaut, soustraction
        console.log(`  - Performing CSG subtraction (default)...`);
        resultBrush = this.evaluator.evaluate(baseBrush, contourBrush, SUBTRACTION);
      }
      
      // Extraire et optimiser la géométrie
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Nettoyer
      contourGeometry.dispose();
      resultBrush.geometry.dispose();
      
      console.log(`  ✅ Unrestricted contour applied successfully`);
      console.log(`    - Result vertices: ${resultGeometry.attributes.position.count}`);
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to process unrestricted contour: ${error}`);
      return {
        success: false,
        error: `Failed to process unrestricted contour: ${error}`
      };
    }
  }

  /**
   * Crée la géométrie d'un contour non restreint avec support des arcs
   */
  private createUnrestrictedContourGeometry(
    points: any[],
    bulges: number[],
    depth: number,
    closed: boolean,
    feature?: Feature
  ): THREE.BufferGeometry | null {
    try {
      const shape = new THREE.Shape();
      
      // Normaliser les points
      const normalizedPoints = this.normalizePoints(points);
      
      if (normalizedPoints.length === 0) {
        return null;
      }
      
      // Commencer le shape
      shape.moveTo(normalizedPoints[0].x, normalizedPoints[0].y);
      
      // Parcourir les points et créer les segments/arcs
      for (let i = 1; i < normalizedPoints.length; i++) {
        const prevPoint = normalizedPoints[i - 1];
        const currPoint = normalizedPoints[i];
        const bulge = bulges[i - 1] || 0;
        
        if (Math.abs(bulge) > 0.001) {
          // Créer un arc si bulge est défini
          const arc = this.createArcFromBulge(prevPoint, currPoint, bulge);
          if (arc) {
            shape.quadraticCurveTo(
              arc.control.x, arc.control.y,
              currPoint.x, currPoint.y
            );
          } else {
            shape.lineTo(currPoint.x, currPoint.y);
          }
        } else {
          // Ligne droite
          shape.lineTo(currPoint.x, currPoint.y);
        }
      }
      
      // Fermer le contour si nécessaire
      if (closed) {
        const lastBulge = bulges[normalizedPoints.length - 1] || 0;
        if (Math.abs(lastBulge) > 0.001) {
          const arc = this.createArcFromBulge(
            normalizedPoints[normalizedPoints.length - 1],
            normalizedPoints[0],
            lastBulge
          );
          if (arc) {
            shape.quadraticCurveTo(
              arc.control.x, arc.control.y,
              normalizedPoints[0].x, normalizedPoints[0].y
            );
          }
        }
        shape.closePath();
      }
      
      // Vérifier si le shape a des sous-contours (trous)
      const subContours = feature?.parameters?.subContours;
      if (subContours && subContours.length > 0) {
        for (const subContour of subContours) {
          const hole = new THREE.Path();
          const holePoints = this.normalizePoints(subContour);
          
          if (holePoints.length > 0) {
            hole.moveTo(holePoints[0].x, holePoints[0].y);
            for (let i = 1; i < holePoints.length; i++) {
              hole.lineTo(holePoints[i].x, holePoints[i].y);
            }
            hole.closePath();
            shape.holes.push(hole);
          }
        }
      }
      
      // Extruder le shape
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth,
        bevelEnabled: false
      });
      
      // Centrer la géométrie
      geometry.translate(0, 0, -depth / 2);
      
      return geometry;
      
    } catch (error) {
      console.error(`Failed to create unrestricted contour geometry: ${error}`);
      return null;
    }
  }

  /**
   * Normalise les points pour être compatibles avec THREE.Shape
   */
  private normalizePoints(points: any[]): { x: number; y: number }[] {
    if (!points || points.length === 0) return [];
    
    return points.map(point => {
      if (Array.isArray(point)) {
        return { x: point[0] || 0, y: point[1] || 0 };
      } else if (typeof point === 'object') {
        return { x: point.x || 0, y: point.y || 0 };
      }
      return { x: 0, y: 0 };
    });
  }

  /**
   * Crée un arc à partir d'un bulge (courbure)
   * Le bulge est la tangente d'1/4 de l'angle inclus
   */
  private createArcFromBulge(
    start: { x: number; y: number },
    end: { x: number; y: number },
    bulge: number
  ): { control: { x: number; y: number } } | null {
    try {
      // Calculer le point de contrôle pour l'arc
      const chord = {
        x: end.x - start.x,
        y: end.y - start.y
      };
      
      const chordLength = Math.sqrt(chord.x * chord.x + chord.y * chord.y);
      if (chordLength < 0.001) return null;
      
      // Le bulge est tan(theta/4) où theta est l'angle inclus
      const sagitta = bulge * chordLength / 2;
      
      // Point milieu de la corde
      const midpoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      };
      
      // Vecteur perpendiculaire à la corde
      const perpendicular = {
        x: -chord.y / chordLength,
        y: chord.x / chordLength
      };
      
      // Point de contrôle pour la courbe quadratique
      const control = {
        x: midpoint.x + perpendicular.x * sagitta,
        y: midpoint.y + perpendicular.y * sagitta
      };
      
      return { control };
      
    } catch (error) {
      console.error(`Failed to create arc from bulge: ${error}`);
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
    
    // Conversion basique DSTV -> Three.js
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
      case 'top':
      case 'v':
        // Pas de rotation
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
      case ProfileFace.WEB:
      case 'o':
        brush.rotation.z = Math.PI / 2;
        break;
    }
  }

  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    
    // Validation basique
    if (!feature.parameters) {
      errors.push('Missing parameters');
      return errors;
    }
    
    // Validation spécifique au contour non restreint
    const points = feature.parameters.points || feature.parameters.contourPoints || [];
    if (points.length < 2) {
      errors.push(`Insufficient points for unrestricted contour: ${points.length} (minimum 2)`);
    }
    
    // Validation des bulges si présents
    const rawBulges = feature.parameters.bulge || [];
    const bulges = Array.isArray(rawBulges) ? rawBulges : (rawBulges !== undefined ? [rawBulges] : []);
    if (bulges.length > 0 && bulges.length !== points.length - 1) {
      errors.push(`Bulge array length mismatch: ${bulges.length} bulges for ${points.length} points`);
    }
    
    // Validation de la profondeur
    const depth = feature.parameters.depth;
    if (depth !== undefined && depth <= 0) {
      errors.push(`Invalid contour depth: ${depth}mm (must be positive)`);
    }
    
    return errors;
  }

  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}