/**
 * CutProcessor - Processeur pour les découpes et encoches
 * Gère les opérations de découpe définies par des contours (AK dans DSTV)
 */

import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { FeatureProcessor, ProcessResult } from './FeatureProcessor';
import { Feature, FeatureType } from '../types';
import { PivotElement } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class CutProcessor extends FeatureProcessor {
  private positionCalculator: PositionCalculator;
  
  constructor() {
    super();
    this.positionCalculator = new PositionCalculator();
  }
  
  canProcess(feature: Feature): boolean {
    return feature.type === FeatureType.CUTOUT || feature.type === FeatureType.NOTCH;
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessResult {
    console.log(`✂️ CutProcessor: Processing cut for element ${element.id}`);
    console.log(`  - Feature:`, feature);
    console.log(`  - Element dimensions:`, element.dimensions);
    
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
      
      console.log(`  🔪 Creating ${isTransverse ? 'transverse ' : ''}cut with ${contourPoints.length} points on face ${face}`);
      console.log(`  Points:`, contourPoints.map(p => `(${p[0]}, ${p[1]})`).join(', '));
      if (isTransverse) {
        console.log(`  🎯 This is a transverse cut (removes end of profile)`);
      }
      
      // Créer la géométrie de découpe
      const cutGeometry = isTransverse 
        ? this.createTransverseCutGeometry(contourPoints, element)
        : this.createCutGeometry(contourPoints, depth, face, element);
      
      // Positionner la géométrie de découpe
      // Les coordonnées sont déjà incluses dans la forme Shape,
      // on doit juste positionner le tout par rapport au centre de la pièce
      const position = this.calculateCutPosition(contourPoints, face, element);
      console.log(`    Translating cut to position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
      cutGeometry.translate(position.x, position.y, position.z);
      
      // Debug: afficher la position finale de la géométrie de découpe
      cutGeometry.computeBoundingBox();
      const finalBbox = cutGeometry.boundingBox!;
      console.log(`    Cut geometry final position: X(${finalBbox.min.x.toFixed(1)}, ${finalBbox.max.x.toFixed(1)}), Y(${finalBbox.min.y.toFixed(1)}, ${finalBbox.max.y.toFixed(1)}), Z(${finalBbox.min.z.toFixed(1)}, ${finalBbox.max.z.toFixed(1)})`);
      
      // Debug: afficher la position de la géométrie de base
      geometry.computeBoundingBox();
      const baseBbox = geometry.boundingBox!;
      console.log(`    Base geometry bounds: X(${baseBbox.min.x.toFixed(1)}, ${baseBbox.max.x.toFixed(1)}), Y(${baseBbox.min.y.toFixed(1)}, ${baseBbox.max.y.toFixed(1)}), Z(${baseBbox.min.z.toFixed(1)}, ${baseBbox.max.z.toFixed(1)})`);
      
      // Vérifier l'intersection
      const intersectsX = finalBbox.max.x >= baseBbox.min.x && finalBbox.min.x <= baseBbox.max.x;
      const intersectsY = finalBbox.max.y >= baseBbox.min.y && finalBbox.min.y <= baseBbox.max.y;
      const intersectsZ = finalBbox.max.z >= baseBbox.min.z && finalBbox.min.z <= baseBbox.max.z;
      console.log(`    Intersection check: X=${intersectsX}, Y=${intersectsY}, Z=${intersectsZ}`);
      
      if (!intersectsX || !intersectsY || !intersectsZ) {
        console.error(`    ❌ Cut geometry does not intersect with base geometry!`);
      }
      
      // Effectuer l'opération CSG de soustraction
      console.log(`  🔧 Performing CSG subtraction...`);
      console.log(`    Base geometry vertices: ${geometry.attributes.position.count}`);
      console.log(`    Cut geometry vertices: ${cutGeometry.attributes.position.count}`);
      
      const meshCSG = CSG.fromGeometry(geometry);
      const cutCSG = CSG.fromGeometry(cutGeometry);
      const resultCSG = meshCSG.subtract(cutCSG);
      const resultGeometry = CSG.toGeometry(resultCSG, new THREE.Matrix4());
      
      console.log(`    Result geometry vertices: ${resultGeometry.attributes.position.count}`);
      console.log(`    Vertices changed: ${geometry.attributes.position.count !== resultGeometry.attributes.position.count}`);
      
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
      
      // Vérifier que la géométrie a bien été modifiée
      if (geometry.attributes.position.count === resultGeometry.attributes.position.count) {
        console.warn(`  ⚠️ Cut may not have been applied - vertex count unchanged`);
      } else {
        console.log(`  ✅ Cut applied successfully - geometry modified`);
      }
      
      return {
        success: true,
        geometry: resultGeometry
      };
    } catch (error) {
      console.error('❌ Error applying cut:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
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
    const width = dims.width || 150;
    const height = dims.height || 300;
    
    // Créer une forme (Shape) à partir des points du contour
    // IMPORTANT: Transformer les coordonnées DSTV (depuis le coin) en coordonnées Three.js (centrées)
    // Pour les ailes, la forme doit être créée dans le plan XZ (horizontal)
    const shape = new THREE.Shape();
    
    // Transformer et ajouter les points
    // Pour la face 'v' (aile supérieure), les coordonnées représentent:
    // X = position le long de la poutre (0 à length)
    // Y = position sur la largeur totale du profil (0 à 251.4mm pour UB254x146x31)
    const transformedPoints = contourPoints.map(p => {
      if (face === 'v' || face === 'u') {
        // Pour les ailes, transformer les coordonnées DSTV en coordonnées Three.js centrées
        // Les coordonnées Y dans DSTV vont de 0 à 251.4 (hauteur totale du profil)
        // On doit les transformer en coordonnées centrées pour Three.js
        return [
          p[0] - length / 2,     // Centrer sur X (le long de la poutre)
          p[1] - height / 2      // Centrer sur Y (largeur du profil)
        ];
      } else {
        // Pour l'âme : X = position le long de la poutre, Y = hauteur
        return [
          p[0] - length / 2,
          p[1] - height / 2
        ];
      }
    });
    
    console.log(`    Transformed first point: (${transformedPoints[0][0].toFixed(1)}, ${transformedPoints[0][1].toFixed(1)})`);
    
    // Pour les ailes, créer la forme dans le bon plan
    if (face === 'v' || face === 'u') {
      // Pour les ailes : créer dans le plan XZ (X = longueur, Z = largeur)
      shape.moveTo(transformedPoints[0][0], transformedPoints[0][1]);
      for (let i = 1; i < transformedPoints.length; i++) {
        shape.lineTo(transformedPoints[i][0], transformedPoints[i][1]);
      }
    } else {
      // Pour l'âme : créer dans le plan XY comme avant
      shape.moveTo(transformedPoints[0][0], transformedPoints[0][1]);
      for (let i = 1; i < transformedPoints.length; i++) {
        shape.lineTo(transformedPoints[i][0], transformedPoints[i][1]);
      }
    }
    
    // Fermer la forme si nécessaire
    const firstPoint = transformedPoints[0];
    const lastPoint = transformedPoints[transformedPoints.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      shape.closePath();
    }
    
    // Paramètres d'extrusion
    // Pour l'aile, la profondeur doit traverser complètement l'épaisseur
    const flangeThickness = element.dimensions.flangeThickness || 10;
    // Pour une découpe dans l'aile, on doit traverser toute l'épaisseur
    // On utilise une grande valeur pour s'assurer de traverser complètement
    const actualDepth = face === 'v' || face === 'u' 
      ? 50  // Profondeur fixe large pour garantir la traversée complète de l'aile
      : depth * 2.0;
    
    const extrudeSettings = {
      depth: actualDepth,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };
    
    console.log(`    Extrusion depth: ${actualDepth.toFixed(1)}mm for face ${face}`);
    
    // Créer la géométrie extrudée
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Debug: afficher la taille de la géométrie avant transformation
    geometry.computeBoundingBox();
    let bbox = geometry.boundingBox!;
    console.log(`    Cut geometry initial size: X(${bbox.min.x.toFixed(1)}, ${bbox.max.x.toFixed(1)}), Y(${bbox.min.y.toFixed(1)}, ${bbox.max.y.toFixed(1)}), Z(${bbox.min.z.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);
    
    // Orienter la géométrie selon la face AVANT de la translater
    const rotationMatrix = new THREE.Matrix4();
    
    switch (face) {
      case 'v': // Face supérieure (top flange)
        // La découpe doit traverser l'aile supérieure verticalement (selon Y)
        // L'extrusion se fait selon Z, on doit la réorienter selon Y
        rotationMatrix.makeRotationX(-Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        // Après rotation, l'extrusion est maintenant selon Y (vers le bas)
        // Décaler pour que la découpe traverse bien l'aile
        geometry.translate(0, -actualDepth / 2, 0);
        break;
        
      case 'u': // Face inférieure (bottom flange) 
        // Même rotation que pour l'aile supérieure
        rotationMatrix.makeRotationX(-Math.PI / 2);
        geometry.applyMatrix4(rotationMatrix);
        // La découpe doit partir du bas de l'aile et monter
        break;
        
      case 'o': // Âme (web)
        // La découpe doit traverser l'âme horizontalement (selon Z)
        // L'extrusion se fait déjà selon Z, pas de rotation nécessaire
        // Centrer sur Z pour traverser l'âme
        geometry.translate(0, 0, -actualDepth / 2);
        break;
    }
    
    // Debug: afficher la taille après transformation
    geometry.computeBoundingBox();
    bbox = geometry.boundingBox!;
    console.log(`    Cut geometry after rotation: X(${bbox.min.x.toFixed(1)}, ${bbox.max.x.toFixed(1)}), Y(${bbox.min.y.toFixed(1)}, ${bbox.max.y.toFixed(1)}), Z(${bbox.min.z.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);
    
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
    const webThickness = dims.webThickness || 7;
    
    // Calculer les limites du contour
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of contourPoints) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    console.log(`    Cut bounds: X(${minX.toFixed(1)}, ${maxX.toFixed(1)}), Y(${minY.toFixed(1)}, ${maxY.toFixed(1)})`);
    
    // Ne pas centrer - utiliser directement les coordonnées DSTV
    // Les coordonnées DSTV sont déjà dans le repère local de la pièce
    const startX = minX;  // Position de début en X
    const startY = minY;  // Position de début en Y
    
    let position = new THREE.Vector3();
    
    switch (face) {
      case 'v': // Face supérieure (top flange)
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
        console.log(`    Cut on top flange at: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        console.log(`    Profile height: ${height}mm, Flange thickness: ${flangeThickness}mm, Center Y: ${topFlangeCenter}mm`);
        break;
        
      case 'u': // Face inférieure (bottom flange)
        const bottomFlangeY = -(height / 2) + (flangeThickness / 2);  // Centre de l'aile inférieure
        position.set(
          0,                     // Déjà centré sur X
          bottomFlangeY,         // Position Y au centre de l'aile
          0                      // Déjà centré sur Z
        );
        console.log(`    Cut on bottom flange at: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        console.log(`    Flange thickness: ${flangeThickness}mm, Bottom flange center Y: ${bottomFlangeY}mm`);
        break;
        
      case 'o': // Âme (web)
        // Si c'est un contour avec extension, le traiter comme l'aile supérieure
        if (contourPoints.length > 5) {
          position.set(
            startX - length / 2,
            height / 2 - flangeThickness,
            startY - width / 2
          );
          console.log(`    Complex cut treated as top flange`);
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
    
    console.log(`  📍 Cut position for face ${face}: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    
    return position;
  }
  
  /**
   * Crée une géométrie de découpe transversale qui traverse tout le profil
   */
  private createTransverseCutGeometry(
    contourPoints: Array<[number, number]>,
    element: PivotElement
  ): THREE.BufferGeometry {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const width = dims.width || 150;
    const height = dims.height || 300;
    
    console.log(`    Creating transverse cut geometry`);
    
    // Pour une découpe transversale, on crée un bloc qui traverse tout le profil
    // La forme est définie dans le plan XY (longueur x hauteur)
    const shape = new THREE.Shape();
    
    // Transformer les points pour les centrer
    const transformedPoints = contourPoints.map(p => [
      p[0] - length / 2,  // Centrer sur X
      p[1] - height / 2   // Centrer sur Y
    ]);
    
    // Créer la forme
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
    
    // Extruder sur toute la largeur du profil plus une marge
    const extrudeSettings = {
      depth: width * 1.5,  // 1.5x la largeur pour garantir la traversée complète
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };
    
    console.log(`    Transverse extrusion depth: ${extrudeSettings.depth.toFixed(1)}mm`);
    
    // Créer la géométrie extrudée
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer la géométrie sur Z
    geometry.translate(0, 0, -extrudeSettings.depth / 2);
    
    // Debug
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    console.log(`    Transverse cut geometry size: X(${bbox.min.x.toFixed(1)}, ${bbox.max.x.toFixed(1)}), Y(${bbox.min.y.toFixed(1)}, ${bbox.max.y.toFixed(1)}), Z(${bbox.min.z.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);
    
    return geometry;
  }
  
  dispose(): void {
    // Nettoyer les ressources si nécessaire
  }
}