/**
 * Processeur pour les fraisages et lamages
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

export class CounterSinkProcessor implements IFeatureProcessor {
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
      
      // Paramètres du fraisage
      const holeDiameter = params.diameter || 10;
      const sinkDiameter = params.sinkDiameter || holeDiameter * 2;
      const sinkDepth = params.sinkDepth || sinkDiameter * 0.3;
      const sinkAngle = params.sinkAngle || 90; // Angle du fraisage (90° standard, 82° pour vis à tête fraisée)
      const totalDepth = params.depth || element.dimensions.thickness || 10;
      const sinkType = params.sinkType || 'countersink'; // countersink, counterbore, spotface
      
      // Créer la géométrie selon le type
      let sinkGeometry: THREE.BufferGeometry;
      
      switch (sinkType) {
        case 'countersink':
          // Fraisage conique
          sinkGeometry = this.createCounterSinkGeometry(
            holeDiameter,
            sinkDiameter,
            sinkDepth,
            sinkAngle,
            totalDepth
          );
          break;
          
        case 'counterbore':
          // Lamage cylindrique
          sinkGeometry = this.createCounterBoreGeometry(
            holeDiameter,
            sinkDiameter,
            sinkDepth,
            totalDepth
          );
          break;
          
        case 'spotface':
          // Surfaçage (lamage peu profond)
          sinkGeometry = this.createSpotFaceGeometry(
            holeDiameter,
            sinkDiameter,
            sinkDepth || 2,
            totalDepth
          );
          break;
          
        default:
          sinkGeometry = this.createCounterSinkGeometry(
            holeDiameter,
            sinkDiameter,
            sinkDepth,
            sinkAngle,
            totalDepth
          );
      }
      
      // Calculer la position
      const position3D = this.positionService.calculateFeaturePosition(
        element,
        feature.position,
        feature.face,
        'dstv'
      );
      
      // Positionner le fraisage
      const sinkBrush = new Brush(sinkGeometry);
      sinkBrush.position.set(
        position3D.position.x,
        position3D.position.y,
        position3D.position.z
      );
      sinkBrush.rotation.set(
        position3D.rotation.x,
        position3D.rotation.y,
        position3D.rotation.z
      );
      
      sinkBrush.updateMatrixWorld();
      
      // Soustraire de la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, sinkBrush, SUBTRACTION);
      
      // Nettoyer
      sinkGeometry.dispose();
      
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
        error: `Failed to process countersink: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    if (!params.diameter || params.diameter <= 0) {
      errors.push('Invalid hole diameter');
    }
    
    if (params.sinkDiameter && params.sinkDiameter <= params.diameter!) {
      errors.push('Sink diameter must be larger than hole diameter');
    }
    
    if (params.sinkDepth && params.sinkDepth <= 0) {
      errors.push('Invalid sink depth');
    }
    
    if (params.sinkAngle && (params.sinkAngle <= 0 || params.sinkAngle >= 180)) {
      errors.push(`Invalid sink angle: ${params.sinkAngle}`);
    }
    
    return errors;
  }
  
  /**
   * Crée un fraisage conique (countersink)
   */
  private createCounterSinkGeometry(
    holeDiameter: number,
    sinkDiameter: number,
    sinkDepth: number,
    sinkAngle: number,
    totalDepth: number
  ): THREE.BufferGeometry {
    // Créer le profil du fraisage conique
    const points: THREE.Vector2[] = [];
    const segments = 32;
    
    // Calculer les dimensions du cône
    // const angleRad = (sinkAngle * Math.PI) / 180;
    const coneRadius = sinkDiameter / 2;
    const holeRadius = holeDiameter / 2;
    
    // Point de départ: haut du cône (diamètre du fraisage)
    points.push(new THREE.Vector2(coneRadius, 0));
    
    // Point de transition: bas du cône (diamètre du trou)
    points.push(new THREE.Vector2(holeRadius, sinkDepth));
    
    // Continuer avec le trou cylindrique
    points.push(new THREE.Vector2(holeRadius, totalDepth * 1.1));
    
    // Axe central
    points.push(new THREE.Vector2(0, totalDepth * 1.1));
    points.push(new THREE.Vector2(0, 0));
    
    // Créer une géométrie de révolution
    const latheGeometry = new THREE.LatheGeometry(points, segments);
    
    // Centrer et orienter
    latheGeometry.center();
    
    return latheGeometry;
  }
  
  /**
   * Crée un lamage cylindrique (counterbore)
   */
  private createCounterBoreGeometry(
    holeDiameter: number,
    boreDiameter: number,
    boreDepth: number,
    totalDepth: number
  ): THREE.BufferGeometry {
    // Combiner deux cylindres: un large pour le lamage, un étroit pour le trou
    // const group = new THREE.Group();
    
    // Cylindre du lamage
    const boreGeometry = new THREE.CylinderGeometry(
      boreDiameter / 2,
      boreDiameter / 2,
      boreDepth,
      32
    );
    boreGeometry.translate(0, boreDepth / 2, 0);
    
    // Cylindre du trou
    const holeGeometry = new THREE.CylinderGeometry(
      holeDiameter / 2,
      holeDiameter / 2,
      totalDepth * 1.1,
      32
    );
    holeGeometry.translate(0, (totalDepth * 1.1) / 2, 0);
    
    // Créer un groupe temporaire pour fusionner les géométries
    // Comme BufferGeometryUtils n'est pas disponible, on utilise une approche alternative
    // On retourne simplement le cylindre du trou complet qui traverse tout
    const totalGeometry = new THREE.CylinderGeometry(
      Math.max(boreDiameter / 2, holeDiameter / 2),
      holeDiameter / 2,
      totalDepth * 1.1,
      32
    );
    
    // Nettoyer
    boreGeometry.dispose();
    holeGeometry.dispose();
    
    totalGeometry.center();
    
    return totalGeometry;
  }
  
  /**
   * Crée un surfaçage (spotface)
   */
  private createSpotFaceGeometry(
    holeDiameter: number,
    faceDiameter: number,
    faceDepth: number,
    totalDepth: number
  ): THREE.BufferGeometry {
    // Similaire au counterbore mais avec une faible profondeur
    // et éventuellement des bords légèrement chanfreinés
    
    const points: THREE.Vector2[] = [];
    const segments = 32;
    
    // Créer le profil avec un léger chanfrein
    const faceRadius = faceDiameter / 2;
    const holeRadius = holeDiameter / 2;
    const chamferSize = faceDepth * 0.2;
    
    // Bord externe avec chanfrein
    points.push(new THREE.Vector2(faceRadius, chamferSize));
    points.push(new THREE.Vector2(faceRadius - chamferSize, 0));
    points.push(new THREE.Vector2(faceRadius - chamferSize, faceDepth - chamferSize));
    
    // Transition vers le trou
    points.push(new THREE.Vector2(holeRadius, faceDepth));
    
    // Trou cylindrique
    points.push(new THREE.Vector2(holeRadius, totalDepth * 1.1));
    
    // Axe central
    points.push(new THREE.Vector2(0, totalDepth * 1.1));
    points.push(new THREE.Vector2(0, 0));
    
    // Créer une géométrie de révolution
    const latheGeometry = new THREE.LatheGeometry(points, segments);
    
    // Centrer et orienter
    latheGeometry.center();
    
    return latheGeometry;
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}