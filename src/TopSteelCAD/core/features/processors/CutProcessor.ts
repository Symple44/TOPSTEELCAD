/**
 * CutProcessor - Processeur pour les découpes et encoches
 * Gère les opérations de découpe définies par des contours (AK dans DSTV)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FeatureProcessor, ProcessResult } from './FeatureProcessor';
import {Feature, FeatureType, ProfileFace} from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionService } from '../../services/PositionService';

export class CutProcessor extends FeatureProcessor {
  private positionService: PositionService;
  private evaluator: Evaluator;
  
  constructor() {
    super();
    this.positionService = PositionService.getInstance();
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    // Force reload - v5
  }
  
  canProcess(feature: Feature): boolean {
    return feature.type === FeatureType.CUT || 
           feature.type === FeatureType.CUTOUT || 
           feature.type === FeatureType.NOTCH;
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessResult {
    
    // Valider la feature
    const validationErrors = this.validateFeature(feature, element);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join(', ')
      };
    }
    
    try {
      // Récupérer les points du contour
      const rawContourPoints = feature.parameters.points || [];
      const contourPoints = this.normalizePoints(rawContourPoints);
      const face = feature.face || ProfileFace.WEB;
      const depth = feature.parameters.depth || element.dimensions.flangeThickness || 10;
      const isTransverse = feature.parameters.isTransverse || false;
      const cutType = feature.parameters.cutType;
      
      if (contourPoints.length < 3) {
        return {
          success: false,
          error: 'Cut requires at least 3 contour points'
        };
      }
      
      console.log(`🔪 Processing cut with ${contourPoints.length} points on face ${face}`);
      
      // Détecter si c'est une coupe avec encoches partielles (M1002 pattern)
      if (cutType === 'partial_notches' || this.isPartialNotchPattern(contourPoints, element)) {
        console.log(`  🔧 Detected partial notches pattern (M1002 type)`);
        return this.processPartialNotches(geometry, contourPoints, face, element, feature);
      }
      
      if (face === ProfileFace.WEB || face === ProfileFace.BOTTOM) {
        const bounds = this.getContourBounds(contourPoints);
        console.log(`    Original bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
        
        // Vérifier si les découpes sont à l'extrémité
        const isAtEnd = bounds.minX > element.dimensions.length * 0.9;
        if (isAtEnd) {
          console.log(`    ⚠️ Cut is at beam extremity (X > ${(element.dimensions.length * 0.9).toFixed(1)})`);
        }
      }
      
      // Pour la face 'v' et 'u', toujours utiliser createCutGeometry normal
      // car createTransverseCutGeometry ne fonctionne pas correctement pour les ailes
      const cutGeometry = (isTransverse && face !== ProfileFace.WEB && face !== ProfileFace.BOTTOM_FLANGE)
        ? this.createTransverseCutGeometry(contourPoints, element, face)
        : this.createCutGeometry(contourPoints, depth, face, element);
      
      // Les coordonnées sont déjà transformées dans createCutGeometry
      // Pas besoin de translation supplémentaire
      // Perform geometry bounds validation
      cutGeometry.computeBoundingBox();
      geometry.computeBoundingBox();
      
      // Effectuer l'opération CSG de soustraction avec three-bvh-csg
      console.log(`🔪 Applying cut with ${contourPoints.length} points on face ${face}`);
      console.log(`  Cut geometry bounds:`, cutGeometry.boundingBox);
      console.log(`  Original geometry vertex count:`, geometry.attributes.position?.count || 0);
      
      // Créer les brushes pour CSG
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const cutBrush = new Brush(cutGeometry);
      cutBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const resultBrush = this.evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
      const resultGeometry = resultBrush.geometry.clone();
      
      // Nettoyer le brush résultant
      resultBrush.geometry.dispose();
      
      // Calculer les normales et optimiser la géométrie
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      console.log(`  Result geometry vertex count:`, resultGeometry.attributes.position?.count || 0);
      
      // Vérifier si la géométrie a changé
      const originalVertexCount = geometry.attributes.position?.count || 0;
      const resultVertexCount = resultGeometry.attributes.position?.count || 0;
      
      if (resultVertexCount === originalVertexCount) {
        console.warn(`⚠️ Cut operation did not modify geometry - cut may be outside bounds`);
        // Continuer quand même car certaines découpes peuvent ne pas modifier le nombre de vertices
      }
      
      // Nettoyer
      cutGeometry.dispose();
      
      // Transférer les userData
      Object.assign(resultGeometry.userData, geometry.userData);
      
      // Ajouter les informations de la découpe
      if (!resultGeometry.userData.cuts) {
        resultGeometry.userData.cuts = [];
      }
      resultGeometry.userData.cuts.push({
        id: feature.id,  // Ajouter l'ID de la feature DSTV
        contourPoints,
        face,
        depth
      });
      
      
      return {
        success: true,
        geometry: resultGeometry
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters || {};
    
    if (!params.points || !Array.isArray(params.points)) {
      errors.push('Cut feature requires points array');
    } else if (params.points.length < 3) {
      errors.push('Cut requires at least 3 points');
    }
    
    return errors;
  }
  
  /**
   * Normalise les points vers le format [number, number]
   */
  private normalizePoints(points: Array<[number, number] | { x: number; y: number; }>): Array<[number, number]> {
    return points.map(point => {
      if (Array.isArray(point)) {
        return point;
      } else {
        return [point.x, point.y] as [number, number];
      }
    });
  }

  /**
   * Obtient les limites d'un contour
   */
  private getContourBounds(points: Array<[number, number]>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    return { minX, maxX, minY, maxY };
  }
  
  /**
   * Crée la géométrie de découpe à partir des points du contour
   */
  private createCutGeometry(
    contourPoints: Array<[number, number]>,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry {
    // Calculer les dimensions de l'élément pour centrer la forme
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 300;
    
    console.log(`  Creating cut geometry for face ${face}:`);
    console.log(`    Element dims: L=${dims.length}, H=${dims.height}, W=${dims.width}`);
    console.log(`    Original contour points:`, contourPoints);
    
    // Créer une forme (Shape) à partir des points du contour
    const shape = new THREE.Shape();
    
    // Transformer et centrer les points selon la face
    const transformedPoints = contourPoints.map(p => {
      if (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
        // Pour les ailes : forme dans le plan XZ (horizontal)
        const transformedPoint = [
          p[0] - length / 2,     // Position le long de la poutre
          p[1] - dims.width / 2  // Position sur la largeur
        ];
        console.log(`      Point [${p[0].toFixed(1)}, ${p[1].toFixed(1)}] -> X=${transformedPoint[0].toFixed(1)}, Z=${transformedPoint[1].toFixed(1)}`);
        return transformedPoint;
      } else {
        // Pour l'âme : forme dans le plan XY (vertical)
        return [
          p[0] - length / 2,     // Position le long de la poutre
          p[1] - height / 2      // Position verticale
        ];
      }
    });
    
    // Créer la forme 2D
    shape.moveTo(transformedPoints[0][0], transformedPoints[0][1]);
    for (let i = 1; i < transformedPoints.length; i++) {
      shape.lineTo(transformedPoints[i][0], transformedPoints[i][1]);
    }
    
    // Fermer la forme si nécessaire
    const firstPoint = transformedPoints[0];
    const lastPoint = transformedPoints[transformedPoints.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      shape.closePath();
    }
    
    // Paramètres d'extrusion
    // Pour l'aile, la profondeur doit traverser complètement l'épaisseur
    // IMPORTANT: flangeThickness est 7.6mm pour UB254x146x31
    const flangeThickness = element.dimensions.flangeThickness || element.metadata?.flangeThickness || 7.6;
    console.log(`    Using flangeThickness: ${flangeThickness}mm from element:`, {
      fromDimensions: element.dimensions.flangeThickness,
      fromMetadata: element.metadata?.flangeThickness,
      fallback: 7.6
    });
    // Profondeur de la découpe selon la face
    const actualDepth = (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE)
      ? 50  // Profondeur fixe pour traverser complètement l'aile
      : depth * 2.0;  // Pour l'âme, utiliser la profondeur fournie
    
    let geometry: THREE.BufferGeometry;
    
    if (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
      // Pour les ailes, créer un BoxGeometry directement à partir des bounds
      const bounds = this.getContourBounds(contourPoints);
      const cutWidth = bounds.maxX - bounds.minX;
      const cutDepth = bounds.maxY - bounds.minY;
      
      geometry = new THREE.BoxGeometry(cutWidth, actualDepth, cutDepth);
      
      // Positionner le box aux bonnes coordonnées
      const centerX = (bounds.minX + bounds.maxX) / 2 - length / 2;
      const centerZ = (bounds.minY + bounds.maxY) / 2 - dims.width / 2;
      
      geometry.translate(centerX, 0, centerZ);
      console.log(`    Created box for face ${face}: size=${cutWidth}x${actualDepth}x${cutDepth} at X=${centerX.toFixed(1)}, Z=${centerZ.toFixed(1)}`);
    } else {
      // Pour l'âme, utiliser ExtrudeGeometry
      const extrudeSettings = {
        depth: actualDepth,
        bevelEnabled: false,
        bevelThickness: 0,
        bevelSize: 0,
        bevelSegments: 1
      };
      
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }
    
    geometry.computeBoundingBox();
    
    // Orienter la géométrie selon la face AVANT de la translater
    const rotationMatrix = new THREE.Matrix4();
    
    switch (face) {
      case ProfileFace.TOP_FLANGE: { // Aile supérieure
        // Positionner la découpe pour traverser l'aile supérieure
        const topFlangeBottom = (height / 2) - flangeThickness;
        const topFlangeTop = height / 2;
        
        // Le BoxGeometry doit être positionné pour que son centre soit aligné avec l'aile
        // Pour garantir qu'il traverse complètement l'aile, on le centre sur l'aile
        // mais on s'assure qu'il dépasse largement de chaque côté
        const cutCenterY = (topFlangeBottom + topFlangeTop) / 2;
        
        // Positionner le centre du BoxGeometry au centre de l'aile
        geometry.translate(0, cutCenterY, 0);
        
        // Vérifier l'intersection - IMPORTANT: recalculer après translation
        geometry.computeBoundingBox();
        const cutMinY = geometry.boundingBox!.min.y;
        const cutMaxY = geometry.boundingBox!.max.y;
        
        console.log(`    Face v cut positioning:`);
        console.log(`      Top flange: Y[${topFlangeBottom.toFixed(1)}, ${topFlangeTop.toFixed(1)}] (thickness=${flangeThickness}mm)`);
        console.log(`      Cut box: Y[${cutMinY.toFixed(1)}, ${cutMaxY.toFixed(1)}] (height=${actualDepth}mm)`);
        console.log(`      Cut center: Y=${cutCenterY.toFixed(1)}`);
        
        // Vérifier que la découpe intersecte bien l'aile
        const intersects = cutMaxY >= topFlangeBottom && cutMinY <= topFlangeTop;
        if (!intersects) {
          console.warn(`      ⚠️ Cut does NOT intersect top flange!`);
        } else {
          const overlapBottom = Math.max(0, topFlangeBottom - cutMinY);
          const overlapTop = Math.max(0, cutMaxY - topFlangeTop);
          console.log(`      ✓ Cut intersects flange (overlap: ${overlapBottom.toFixed(1)}mm below, ${overlapTop.toFixed(1)}mm above)`);
        }
        
        break;
      }
        
      case ProfileFace.BOTTOM_FLANGE: { // Aile inférieure
        // Positionner la découpe pour traverser l'aile inférieure
        const bottomFlangeBottom = -height / 2;
        const bottomFlangeTop = bottomFlangeBottom + flangeThickness;
        const cutCenterY = (bottomFlangeBottom + bottomFlangeTop) / 2;
        
        geometry.translate(0, cutCenterY, 0);
        break;
      }
        
      case ProfileFace.WEB: // Âme
        // Centrer la découpe sur l'âme
        geometry.translate(0, 0, -actualDepth / 2);
        break;
        
      default:
        // Par défaut, traiter comme l'âme
        geometry.translate(0, 0, -actualDepth / 2);
        break;
    }
    
    geometry.computeBoundingBox();
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de découpe transversale qui traverse tout le profil
   * 
   * Types de découpes supportées:
   * 1. Découpe complète : enlève toute l'extrémité du profil
   * 2. Découpe en L : garde le centre, enlève les coins haut et bas
   * 3. Découpe partielle haute : enlève seulement le haut
   * 4. Découpe partielle basse : enlève seulement le bas
   * 
   * @param contourPoints Points définissant le contour de la partie à GARDER
   * @param element Élément sur lequel appliquer la découpe
   */
  private createTransverseCutGeometry(
    contourPoints: Array<[number, number]>,
    element: PivotElement,
    face?: ProfileFace | undefined
  ): THREE.BufferGeometry {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const width = dims.width || 150;
    const height = dims.height || 300;
    
    // Analyser les limites du contour
    const bounds = this.getContourBounds(contourPoints);
    
    // Déterminer le type de découpe basé sur les coordonnées Y
    // Pour face v/u, Y représente la largeur, donc on compare avec width
    // Pour face o/web, Y représente la hauteur, donc on compare avec height
    const yDimension = (face === ProfileFace.WEB || face === ProfileFace.BOTTOM) ? width : height;
    const cutType = this.determineCutType(bounds, yDimension);
    
    // Créer les géométries de découpe selon le type
    switch (cutType) {
      case 'L_SHAPE':
        return this.createLShapeCut(bounds, length, width, height);
      case 'TOP_CUT':
        return this.createTopCut(bounds, length, width, height, face);
      case 'BOTTOM_CUT':
        return this.createBottomCut(bounds, length, width, height, face);
      case 'FULL_CUT':
        return this.createFullCut(bounds, length, width, height);
      default:
        // Cas standard : utiliser les limites du contour
        return this.createSimpleCut(bounds, length, width, height);
    }
  }

  /**
   * Détermine le type de découpe basé sur les coordonnées Y
   * @param bounds - Les limites du contour
   * @param dimension - La dimension maximale Y (width pour face v/u, height pour face o)
   */
  private determineCutType(bounds: any, dimension: number): string {
    const tolerance = 10; // Tolérance en mm
    const hasBottomGap = bounds.minY > tolerance;
    const hasTopGap = bounds.maxY < dimension - tolerance;
    
    if (hasBottomGap && hasTopGap) {
      return 'L_SHAPE'; // Découpe en L : garde le centre
    } else if (hasTopGap && !hasBottomGap) {
      return 'TOP_CUT'; // Découpe du haut seulement
    } else if (hasBottomGap && !hasTopGap) {
      return 'BOTTOM_CUT'; // Découpe du bas seulement
    } else if (bounds.minY < tolerance && bounds.maxY > dimension - tolerance) {
      return 'FULL_CUT'; // Découpe complète de l'extrémité
    }
    return 'CUSTOM'; // Découpe personnalisée
  }

  /**
   * Crée une découpe en forme de L (enlève les coins haut et bas)
   */
  private createLShapeCut(
    bounds: any,
    length: number,
    width: number,
    height: number
  ): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    
    // Rectangle du bas (de 0 à bounds.minY)
    if (bounds.minY > 1) {
      const shape1 = new THREE.Shape();
      const x1 = bounds.minX - length / 2;
      const x2 = bounds.maxX - length / 2;
      const y1 = -height / 2;
      const y2 = bounds.minY - height / 2;
        
      shape1.moveTo(x1, y1);
      shape1.lineTo(x2, y1);
      shape1.lineTo(x2, y2);
      shape1.lineTo(x1, y2);
      shape1.closePath();
      
      const extrudeSettings = {
        depth: width * 2.0,
        bevelEnabled: false
      };
      
      const geom1 = new THREE.ExtrudeGeometry(shape1, extrudeSettings);
      geom1.translate(0, 0, -width);
      geometries.push(geom1);
      
    }
    
    // Rectangle du haut (de bounds.maxY à height)
    if (bounds.maxY < height - 1) {
      const shape2 = new THREE.Shape();
      const x1 = bounds.minX - length / 2;
      const x2 = bounds.maxX - length / 2;
      const y1 = bounds.maxY - height / 2;
      const y2 = height / 2;
      
      shape2.moveTo(x1, y1);
      shape2.lineTo(x2, y1);
      shape2.lineTo(x2, y2);
      shape2.lineTo(x1, y2);
      shape2.closePath();
      
      const extrudeSettings = {
        depth: width * 2.0,
        bevelEnabled: false
      };
      
      const geom2 = new THREE.ExtrudeGeometry(shape2, extrudeSettings);
      geom2.translate(0, 0, -width);
      geometries.push(geom2);
      
    }
    
    // Fusionner les géométries
    if (geometries.length > 0) {
      const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
      return mergedGeometry;
    }
    
    // Fallback : retourner une géométrie vide si aucune découpe
    return new THREE.BufferGeometry();
  }

  /**
   * Crée une découpe du haut seulement
   * Pour face 'v': découpe en haut de l'aile (Y=0 à Y=bounds.maxY)
   */
  private createTopCut(
    bounds: any,
    length: number,
    width: number,
    height: number,
    face?: ProfileFace | undefined
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x1 = bounds.minX - length / 2;
    const x2 = bounds.maxX - length / 2;
    
    // Pour face 'v', créer dans le plan XZ et positionner correctement
    if (face === ProfileFace.WEB) {
      // Découpe du haut de l'aile : de Z=-width/2 à Z=bounds.maxY-width/2
      const z1 = -width / 2;  // Bord gauche de l'aile
      const z2 = bounds.maxY - width / 2;  // Limite de la découpe
      
      // Créer la forme dans le plan XZ
      shape.moveTo(x1, z1);
      shape.lineTo(x2, z1);
      shape.lineTo(x2, z2);
      shape.lineTo(x1, z2);
      shape.closePath();
      
      const extrudeSettings = {
        depth: 50,  // Profondeur pour traverser l'épaisseur de l'aile
        bevelEnabled: false
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Rotation pour orienter correctement (extrusion selon Y)
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationX(-Math.PI / 2);
      geometry.applyMatrix4(rotationMatrix);
      
      // Positionner à la hauteur de l'aile supérieure
      const flangeThickness = 10;  // Épaisseur typique de l'aile
      const topFlangeY = height / 2 - flangeThickness / 2;
      geometry.translate(0, topFlangeY, 0);
      
      console.log(`    Top cut (face v): X(${x1.toFixed(1)}, ${x2.toFixed(1)}), Z(${z1.toFixed(1)}, ${z2.toFixed(1)})`);
      return geometry;
    }
    
    // Code original pour les autres faces
    const y1 = -width / 2;
    const y2 = bounds.maxY - width / 2;
    
    shape.moveTo(x1, y1);
    shape.lineTo(x2, y1);
    shape.lineTo(x2, y2);
    shape.lineTo(x1, y2);
    shape.closePath();
    
    const extrudeSettings = {
      depth: width * 2.0,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -width);
    
    console.log(`    Top cut: X(${x1.toFixed(1)}, ${x2.toFixed(1)}), Y(${y1.toFixed(1)}, ${y2.toFixed(1)})`);
    return geometry;
  }

  /**
   * Crée une découpe du bas seulement
   * Pour face 'v': découpe en bas de l'aile (Y=bounds.minY à Y=width)
   */
  private createBottomCut(
    bounds: any,
    length: number,
    width: number,
    height: number,
    face?: ProfileFace | undefined
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x1 = bounds.minX - length / 2;
    const x2 = bounds.maxX - length / 2;
    // Pour face 'v', Y représente la largeur, donc on utilise width pas height
    const y1 = bounds.minY - width / 2;  // Limite basse de la découpe
    const y2 = width / 2;  // Bord supérieur de l'aile en coordonnées Three.js
    
    shape.moveTo(x1, y1);
    shape.lineTo(x2, y1);
    shape.lineTo(x2, y2);
    shape.lineTo(x1, y2);
    shape.closePath();
    
    const extrudeSettings = {
      depth: width * 2.0,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -width);
    
    console.log(`    Bottom cut: X(${x1.toFixed(1)}, ${x2.toFixed(1)}), Y(${y1.toFixed(1)}, ${y2.toFixed(1)})`);
    return geometry;
  }

  /**
   * Crée une découpe complète de l'extrémité
   */
  private createFullCut(
    bounds: any,
    length: number,
    width: number,
    height: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x1 = bounds.minX - length / 2;
    const x2 = bounds.maxX - length / 2;
    const y1 = -height / 2 - 10;
    const y2 = height / 2 + 10;
    
    shape.moveTo(x1, y1);
    shape.lineTo(x2, y1);
    shape.lineTo(x2, y2);
    shape.lineTo(x1, y2);
    shape.closePath();
    
    const extrudeSettings = {
      depth: width * 2.0,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -width);
    
    return geometry;
  }

  /**
   * Crée une découpe simple basée sur les limites du contour
   */
  private createSimpleCut(
    bounds: any,
    length: number,
    width: number,
    height: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x1 = bounds.minX - length / 2;
    const x2 = bounds.maxX - length / 2;
    const y1 = bounds.minY - height / 2;
    const y2 = bounds.maxY - height / 2;
    
    shape.moveTo(x1, y1);
    shape.lineTo(x2, y1);
    shape.lineTo(x2, y2);
    shape.lineTo(x1, y2);
    shape.closePath();
    
    const extrudeSettings = {
      depth: width * 2.0,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -width);
    
    return geometry;
  }
  
  /**
   * Détecte si le contour représente un pattern d'encoches partielles (M1002)
   */
  private isPartialNotchPattern(contourPoints: Array<[number, number]>, element: PivotElement): boolean {
    // Détection du pattern M1002: 9 points avec extension
    if (contourPoints.length !== 9) {
      return false;
    }
    
    const bounds = this.getContourBounds(contourPoints);
    const profileLength = element.dimensions.length;
    
    // Vérifier s'il y a une extension au-delà de la longueur du profil
    const hasExtension = bounds.maxX > profileLength + 1;
    
    if (hasExtension) {
      console.log(`  📐 Partial notch pattern detected: ${contourPoints.length} points, extension=${(bounds.maxX - profileLength).toFixed(1)}mm`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Traite les encoches partielles avec extension (M1002 pattern)
   */
  private processPartialNotches(
    geometry: THREE.BufferGeometry,
    contourPoints: Array<[number, number]>,
    face: ProfileFace | undefined,
    element: PivotElement,
    feature: Feature
  ): ProcessResult {
    try {
      const dims = element.dimensions;
      const bounds = this.getContourBounds(contourPoints);
      
      console.log(`  🔧 Processing partial notches with extension:`);
      console.log(`    Contour bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
      console.log(`    Profile length: ${dims.length}mm, Extension: ${(bounds.maxX - dims.length).toFixed(1)}mm`);
      
      // Analyser les points pour identifier les encoches
      // Pour M1002: les encoches sont définies par les changements de Y aux extrémités
      const notches = this.extractNotchesFromContour(contourPoints, dims);
      
      // Créer les géométries de découpe pour chaque encoche
      const cutGeometries: THREE.BufferGeometry[] = [];
      
      // Récupérer l'épaisseur de l'aile pour dimensionner les encoches
      const flangeThickness = element.dimensions.flangeThickness || element.metadata?.flangeThickness || 7.6;
      
      // Calculer les dimensions une fois pour réutilisation
      const profileHeight = dims.height || 251.4;
      let globalCenterY = 0;
      if (face === ProfileFace.TOP_FLANGE && dims.height) {
        const topFlangeBottom = (dims.height / 2) - flangeThickness;
        globalCenterY = topFlangeBottom + (flangeThickness / 2);
      }
      
      for (const notch of notches) {
        console.log(`    Creating notch: X[${notch.xStart.toFixed(1)}, ${notch.xEnd.toFixed(1)}] Y[${notch.yStart.toFixed(1)}, ${notch.yEnd.toFixed(1)}]`);
        
        // Créer un box pour chaque encoche
        // Pour face 'v' (TOP_FLANGE), Y représente la hauteur du profil
        // Mapping : DSTV X -> Three.js Z, DSTV Y -> Three.js Y
        const notchDepthZ = notch.xEnd - notch.xStart;           // Profondeur de l'encoche
        const notchHeightY = notch.yEnd - notch.yStart;          // Hauteur de l'encoche
        const notchWidthX = dims.width + 20;                     // Largeur totale avec marge de sécurité
        
        // BoxGeometry(width_X, height_Y, depth_Z) en coordonnées Three.js
        const boxGeometry = new THREE.BoxGeometry(notchWidthX, notchHeightY, notchDepthZ);
        
        console.log(`        Box dimensions: X=${notchWidthX.toFixed(1)}mm Y=${notchHeightY.toFixed(1)}mm Z=${notchDepthZ.toFixed(1)}mm`);
        
        // Positionner le box dans l'espace 3D
        // Système de coordonnées Three.js pour profil I :
        // X = largeur, Y = hauteur, Z = longueur de la poutre
        
        // Position le long de la poutre (Z)
        const centerZ = (notch.xStart + notch.xEnd) / 2;
        
        // Position latérale (X) - centré sur l'âme
        const centerX = 0;
        
        // Position verticale (Y) - conversion DSTV vers Three.js
        const centerY = (notch.yStart + notch.yEnd) / 2 - profileHeight / 2;
        
        console.log(`      Box position: X=${centerX.toFixed(1)}mm Y=${centerY.toFixed(1)}mm Z=${centerZ.toFixed(1)}mm`);
        
        // Appliquer la transformation immédiatement pour éviter les problèmes de fusion
        boxGeometry.translate(centerX, centerY, centerZ);
        
        // Forcer le calcul des attributs
        boxGeometry.computeBoundingBox();
        boxGeometry.computeBoundingSphere();
        
        // Vérifier la position finale APRÈS translation
        console.log(`      Box final bounds:`, 
          `X[${boxGeometry.boundingBox?.min.x.toFixed(1)}, ${boxGeometry.boundingBox?.max.x.toFixed(1)}]`,
          `Y[${boxGeometry.boundingBox?.min.y.toFixed(1)}, ${boxGeometry.boundingBox?.max.y.toFixed(1)}]`,
          `Z[${boxGeometry.boundingBox?.min.z.toFixed(1)}, ${boxGeometry.boundingBox?.max.z.toFixed(1)}]`
        );
        
        // Vérifier l'intersection avec la géométrie originale
        const originalBounds = geometry.boundingBox;
        if (originalBounds && boxGeometry.boundingBox) {
          const intersectsX = boxGeometry.boundingBox.max.x >= originalBounds.min.x && 
                             boxGeometry.boundingBox.min.x <= originalBounds.max.x;
          const intersectsY = boxGeometry.boundingBox.max.y >= originalBounds.min.y && 
                             boxGeometry.boundingBox.min.y <= originalBounds.max.y;
          const intersectsZ = boxGeometry.boundingBox.max.z >= originalBounds.min.z && 
                             boxGeometry.boundingBox.min.z <= originalBounds.max.z;
          
          console.log(`      Intersection check: X=${intersectsX}, Y=${intersectsY}, Z=${intersectsZ}`);
          
          if (!intersectsX || !intersectsY || !intersectsZ) {
            console.warn(`      ⚠️ WARNING: Box does not intersect with original geometry!`);
          }
        }
        
        cutGeometries.push(boxGeometry);
      }
      
      // Fusionner toutes les géométries de découpe
      let mergedCutGeometry: THREE.BufferGeometry;
      if (cutGeometries.length > 1) {
        mergedCutGeometry = BufferGeometryUtils.mergeGeometries(cutGeometries, false);
      } else {
        mergedCutGeometry = cutGeometries[0];
      }
      
      // Appliquer la découpe à la géométrie
      console.log(`  🔧 Applying CSG subtraction: ${notches.length} notch(es)`);
      
      // Calculer les bounding boxes pour vérifier l'intersection
      geometry.computeBoundingBox();
      mergedCutGeometry.computeBoundingBox();
      
      console.log(`    Original geometry bounds:`, 
        `X[${geometry.boundingBox?.min.x.toFixed(1)}, ${geometry.boundingBox?.max.x.toFixed(1)}]`,
        `Y[${geometry.boundingBox?.min.y.toFixed(1)}, ${geometry.boundingBox?.max.y.toFixed(1)}]`,
        `Z[${geometry.boundingBox?.min.z.toFixed(1)}, ${geometry.boundingBox?.max.z.toFixed(1)}]`
      );
      console.log(`    Cut geometry bounds:`, 
        `X[${mergedCutGeometry.boundingBox?.min.x.toFixed(1)}, ${mergedCutGeometry.boundingBox?.max.x.toFixed(1)}]`,
        `Y[${mergedCutGeometry.boundingBox?.min.y.toFixed(1)}, ${mergedCutGeometry.boundingBox?.max.y.toFixed(1)}]`,
        `Z[${mergedCutGeometry.boundingBox?.min.z.toFixed(1)}, ${mergedCutGeometry.boundingBox?.max.z.toFixed(1)}]`
      );
      
      const originalBrush = new Brush(geometry);
      originalBrush.updateMatrixWorld();
      const cutBrush = new Brush(mergedCutGeometry);
      cutBrush.updateMatrixWorld();
      
      console.log(`    Original geometry vertices: ${geometry.attributes.position.count}`);
      console.log(`    Cut geometry vertices: ${mergedCutGeometry.attributes.position.count}`);
      
      const resultBrush = this.evaluator.evaluate(originalBrush, cutBrush, SUBTRACTION);
      const resultGeometry = resultBrush.geometry;
      
      console.log(`    Result geometry vertices: ${resultGeometry.attributes.position.count}`);
      console.log(`    Vertices change: ${resultGeometry.attributes.position.count - geometry.attributes.position.count}`);
      
      // Ajouter les informations de découpe à userData pour les outlines
      if (!resultGeometry.userData.cuts) {
        resultGeometry.userData.cuts = [];
      }
      
      // Ajouter chaque encoche avec ses bounds
      for (const notch of notches) {
        // Créer un ID unique qui combine l'ID de la feature parent et l'index du notch
        const notchIndex = notches.indexOf(notch);
        const notchId = feature.id ? `${feature.id}_notch_${notchIndex}` : `notch_${notchIndex}`;
        const cutInfo = {
          id: notchId,  // ID unique pour la notch
          parentFeatureId: feature.id,  // Garder une référence à la feature parent
          type: 'notch',
          face: face,
          bounds: {
            minX: -(dims.width + 20) / 2,           // Encoche traverse toute la largeur avec marge
            maxX: (dims.width + 20) / 2,
            minY: notch.yStart - profileHeight / 2,   // Position verticale de l'encoche
            maxY: notch.yEnd - profileHeight / 2,
            minZ: notch.xStart,                     // Position le long de la poutre
            maxZ: notch.xEnd
          }
        };
        resultGeometry.userData.cuts.push(cutInfo);
        console.log(`  📐 Added cut info to userData:`, cutInfo);
      }
      
      // Nettoyer
      mergedCutGeometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error('Error processing partial notches:', error);
      return {
        success: false,
        error: `Failed to process partial notches: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Extrait les encoches individuelles du contour complexe
   * Analyse dynamiquement les points pour identifier les encoches M1002
   */
  private extractNotchesFromContour(
    contourPoints: Array<[number, number]>,
    dimensions: any
  ): Array<{xStart: number, xEnd: number, yStart: number, yEnd: number}> {
    const notches: Array<{xStart: number, xEnd: number, yStart: number, yEnd: number}> = [];
    
    if (contourPoints.length !== 9) {
      return notches; // Pas le bon pattern
    }
    
    // Analyser les points DSTV pour M1002
    // Points: [(1912.15,18.6), (1912.15,232.8), (1842.1,232.8), (1842.1,251.4), (0,251.4), (0,0), (1842.1,0), (1842.1,18.6), (1912.15,18.6)]
    
    // Trouver les coordonnées clés
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const [x, y] of contourPoints) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    // Pour M1002: baseEndX = 1842.1, extensionX = 1912.15
    const sortedX = Array.from(new Set(contourPoints.map(p => p[0]))).sort((a, b) => a - b);
    const baseEndX = sortedX[sortedX.length - 2]; // Avant-dernière valeur X (1842.1)
    const extensionX = maxX; // Dernière valeur X (1912.15)
    
    // Identifier les zones d'extension (où X = extensionX)
    const extensionPoints = contourPoints.filter(([x, y]) => Math.abs(x - extensionX) < 0.1);
    const extensionYValues = extensionPoints.map(([x, y]) => y).sort((a, b) => a - b);
    
    console.log(`  🔍 Extension analysis: baseX=${baseEndX}, extensionX=${extensionX}`);
    console.log(`  🔍 Extension Y values:`, extensionYValues);
    
    // Pour M1002, les extensions sont aux extrémités Y
    // Encoche haute: Y[0, 18.6] -> extension Y=18.6 mais pas à la base
    // Encoche basse: Y[232.8, 251.4] -> extension Y=232.8 mais pas à la base
    
    if (extensionYValues.length >= 2) {
      const topExtensionY = extensionYValues[0]; // 18.6
      const bottomExtensionY = extensionYValues[extensionYValues.length - 1]; // 232.8
      
      // Encoche haute: de Y=0 (minY) à Y=topExtensionY
      if (topExtensionY > minY) {
        notches.push({
          xStart: baseEndX,
          xEnd: extensionX,
          yStart: minY,
          yEnd: topExtensionY
        });
        console.log(`  📐 Detected TOP notch: X[${baseEndX.toFixed(1)}, ${extensionX.toFixed(1)}] Y[${minY.toFixed(1)}, ${topExtensionY.toFixed(1)}]`);
      }
      
      // Encoche basse: de Y=bottomExtensionY à Y=maxY (251.4)
      if (bottomExtensionY < maxY) {
        notches.push({
          xStart: baseEndX,
          xEnd: extensionX,
          yStart: bottomExtensionY,
          yEnd: maxY
        });
        console.log(`  📐 Detected BOTTOM notch: X[${baseEndX.toFixed(1)}, ${extensionX.toFixed(1)}] Y[${bottomExtensionY.toFixed(1)}, ${maxY.toFixed(1)}]`);
      }
    }
    
    return notches;
  }
  
  dispose(): void {
    // Nettoyer les ressources si nécessaire
  }
}
