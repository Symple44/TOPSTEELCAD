/**
 * CutProcessor - Processeur pour les découpes et encoches
 * Gère les opérations de découpe définies par des contours (AK dans DSTV)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FeatureProcessor, ProcessResult } from './FeatureProcessor';
import { Feature, FeatureType } from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class CutProcessor extends FeatureProcessor {
  private positionCalculator: PositionCalculator;
  private evaluator: Evaluator;
  
  constructor() {
    super();
    this.positionCalculator = new PositionCalculator();
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
      const contourPoints = feature.parameters.points || [];
      const face = feature.face || 'WEB';
      const depth = feature.parameters.depth || element.dimensions.flangeThickness || 10;
      const isTransverse = feature.parameters.isTransverse || false;
      
      if (contourPoints.length < 3) {
        return {
          success: false,
          error: 'Cut requires at least 3 contour points'
        };
      }
      
      console.log(`🔪 Processing cut with ${contourPoints.length} points on face ${face}`);
      if (face === 'v' || face === 'u') {
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
      const cutGeometry = (isTransverse && face !== 'v' && face !== 'u')
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
    face: string,
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
    // IMPORTANT: Pour les ailes (face v/u), créer la forme dans le plan XZ (horizontal)
    const shape = new THREE.Shape();
    
    // Transformer et ajouter les points
    const transformedPoints = contourPoints.map(p => {
      if (face === 'v' || face === 'u') {
        // Pour les ailes, créer une forme dans le plan XZ
        // X = position le long de la poutre
        // Z = position sur la largeur de l'aile
        const transformedPoint = [
          p[0] - length / 2,     // X: centrer sur la longueur
          p[1] - dims.width / 2  // Z: centrer sur la largeur
        ];
        console.log(`      Point [${p[0].toFixed(1)}, ${p[1].toFixed(1)}] -> X=${transformedPoint[0].toFixed(1)}, Z=${transformedPoint[1].toFixed(1)}`);
        return transformedPoint;
      } else {
        // Pour l'âme, forme dans le plan XY
        return [
          p[0] - length / 2,     // X
          p[1] - height / 2      // Y
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
    // Pour une découpe dans l'aile, on doit traverser toute l'épaisseur
    // On utilise une grande valeur pour s'assurer de traverser complètement
    const actualDepth = face === 'v' || face === 'u' 
      ? 50  // Profondeur fixe large pour garantir la traversée complète de l'aile
      : depth * 2.0;
    
    let geometry: THREE.BufferGeometry;
    
    if (face === 'v' || face === 'u') {
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
      case 'v': { // Face supérieure (top flange)
        // Pour face 'v', le BoxGeometry est créé centré à l'origine
        // On doit le positionner pour qu'il traverse l'aile supérieure
        
        // IMPORTANT: Pour un profil UB254x146x31:
        // - height = 146.1mm (hauteur totale du profil)
        // - flangeThickness = 7.6mm (épaisseur de l'aile)
        // L'aile supérieure est située de Y = (height/2 - flangeThickness) à Y = height/2
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
        
      case 'u': { // Face inférieure (bottom flange) 
        // Même rotation que pour l'aile supérieure
        rotationMatrix.makeRotationX(-Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        // Positionner pour que la découpe traverse l'aile inférieure
        // L'aile inférieure est à Y = -height/2 jusqu'à Y = -height/2 + flangeThickness
        const bottomFlangeBottom = -height / 2;
        // La géométrie doit partir du bas et monter à travers l'aile
        // Après rotation et inversion, on positionne depuis le bas
        geometry.translate(0, bottomFlangeBottom + actualDepth, 0);
        break;
      }
        
      case 'o': // Âme (web)
      case 'web':
        // La découpe doit traverser l'âme horizontalement (selon Z)
        // L'extrusion se fait déjà selon Z, pas de rotation nécessaire
        // Centrer sur Z pour traverser l'âme
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
   * Calcule la position de la découpe en fonction de la face
   */
  private calculateCutPosition(
    contourPoints: Array<[number, number]>,
    face: string,
    element: PivotElement
  ): THREE.Vector3 {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 300;
    const width = dims.width || 150;
    const flangeThickness = dims.flangeThickness || 10;
    
    // Calculer les limites du contour
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of contourPoints) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    // Ne pas centrer - utiliser directement les coordonnées DSTV
    // Les coordonnées DSTV sont déjà dans le repère local de la pièce
    const startX = minX;  // Position de début en X
    const startY = minY;  // Position de début en Y
    
    const position = new THREE.Vector3();
    
    switch (face) {
      case 'v': { // Face supérieure (top flange)
        // Positionner la découpe au niveau de l'aile supérieure
        // La hauteur du profil UB254x146x31 est 251.4mm
        // L'épaisseur de l'aile est 7.6mm
        // On veut que la découpe soit centrée sur l'épaisseur de l'aile
        const topFlangeCenter = (height / 2) - (flangeThickness / 2);  // Centre de l'aile supérieure
        position.set(
          0,                     // Déjà centré sur X
          topFlangeCenter,       // Position Y au centre de l'aile
          0                      // Déjà centré sur Z
        );
break;
      }
        
      case 'u': { // Face inférieure (bottom flange)
        const bottomFlangeY = -(height / 2) + (flangeThickness / 2);  // Centre de l'aile inférieure
        position.set(
          0,                     // Déjà centré sur X
          bottomFlangeY,         // Position Y au centre de l'aile
          0                      // Déjà centré sur Z
        );
break;
      }
        
      case 'o': // Âme (web)
        // Si c'est un contour avec extension, le traiter comme l'aile supérieure
        if (contourPoints.length > 5) {
          position.set(
            startX - length / 2,
            height / 2 - flangeThickness,
            startY - width / 2
          );
} else {
          position.set(
            startX - length / 2,
            startY - height / 2,
            0
          );
        }
        break;
        
      default:
        position.set(startX - length / 2, startY - height / 2, 0);
    }
    
    return position;
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
    face?: string
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
    const yDimension = (face === 'v' || face === 'u') ? width : height;
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
    face?: string
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x1 = bounds.minX - length / 2;
    const x2 = bounds.maxX - length / 2;
    
    // Pour face 'v', créer dans le plan XZ et positionner correctement
    if (face === 'v') {
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
    face?: string
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
  
  dispose(): void {
    // Nettoyer les ressources si nécessaire
  }
}
