/**
 * Processeur pour les contours de découpe complexes
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import {Feature, 
  IFeatureProcessor, 
  ProcessorResult, 
  ProfileFace,
  CoordinateSystem} from '../types';
import { StandardFace } from '../../coordinates/types';
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
    console.log(`🎯 ContourProcessor.process called for feature ${feature.id}`);
    console.log(`  - Feature params:`, feature.parameters);
    console.log(`  - Element:`, element.id, element.dimensions);
    
    try {
      // Pour les contours DSTV de type "outer", vérifier s'ils doivent être appliqués
      if (feature.coordinateSystem === CoordinateSystem.DSTV && feature.parameters.contourType === 'outer') {
        // Vérifier si le contour représente une découpe
        const isActuallyCut = this.isContourACut(feature, element);
        
        if (!isActuallyCut) {
          console.log(`  ⚠️ Skipping DSTV outer contour ${feature.id} - matches full profile shape`);
          return {
            success: true,
            geometry: geometry,
            warning: 'DSTV outer contour matches the complete profile shape and is not applied as cut'
          };
        }
        
        console.log(`  ✂️ DSTV outer contour ${feature.id} represents a cut - will be applied`);
        // Note: Les notches sont maintenant détectées et traitées en amont dans DSTVNormalizationStage
        // Les contours qui arrivent ici sont des contours normaux, pas des notches
      }
      
      // Valider la feature (pour les contours non-DSTV ou non-notches)
      const errors = this.validateFeature(feature, element);
      console.log(`  - Validation errors:`, errors);
      if (errors.length > 0) {
        console.error(`❌ Validation failed for ${feature.id}: ${errors.join('; ')}`);
        return {
          success: false,
          error: errors.join('; ')
        };
      }
      console.log(`✅ Validation passed for ${feature.id}`);
      
      // Créer la géométrie du contour normal (pas des notches)
      // Pour les contours DSTV, utiliser la profondeur spécifiée ou l'épaisseur adaptée à la face
      const effectiveDepth = this.calculateEffectiveDepth(feature, element);
      console.log(`  - Effective depth: ${effectiveDepth}mm`);
      console.log(`  - Creating contour geometry with ${feature.parameters.points!.length} points...`);
      
      // Pour les contours DSTV, normaliser les points autour de l'origine
      let normalizedPoints = feature.parameters.points! as Array<[number, number]>;
      let contourCenterOffset = { x: 0, y: 0 };
      
      if (feature.coordinateSystem === CoordinateSystem.DSTV) {
        // Pour les contours DSTV, les points sont en coordonnées absolues le long du profil
        // Il faut les transformer en coordonnées relatives centrées pour le CSG
        
        // Trouver les dimensions du contour
        const minX = Math.min(...normalizedPoints.map(p => p[0]));
        const maxX = Math.max(...normalizedPoints.map(p => p[0]));
        const minY = Math.min(...normalizedPoints.map(p => p[1]));
        const maxY = Math.max(...normalizedPoints.map(p => p[1]));
        
        console.log(`  - DSTV contour bounds: X[${minX} to ${maxX}], Y[${minY} to ${maxY}]`);
        console.log(`  - Contour size: ${maxX - minX} x ${maxY - minY}`);
        
        // DÉTECTION CRITIQUE: Vérifier si c'est un pattern de notches (U inversé)
        const profileLength = element.dimensions.length || 1912.15;
        const contourLength = maxX - minX;
        
        // Détecter le pattern de notches : contour qui couvre toute la longueur mais avec un saut
        let hasLargeGap = false;
        for (let i = 1; i < normalizedPoints.length; i++) {
          const prevX = normalizedPoints[i-1][0];
          const currX = normalizedPoints[i][0];
          const gap = Math.abs(currX - prevX);
          // Un saut > 500mm indique un pattern de notches
          if (gap > 500) {
            hasLargeGap = true;
            console.log(`  - Large gap detected: ${gap}mm between points ${i-1} and ${i}`);
            break;
          }
        }
        
        const isNotchPattern = hasLargeGap && Math.abs(contourLength - profileLength) < 100;
        const isPartialContour = Math.abs(contourLength - profileLength) > 2.0 && !isNotchPattern;
        
        console.log(`  - Contour analysis: length=${contourLength}mm vs profile=${profileLength}mm`);
        console.log(`  - Has large gap: ${hasLargeGap}`);
        console.log(`  - Is notch pattern: ${isNotchPattern}`);
        console.log(`  - Is partial contour (cut): ${isPartialContour}`);
        
        if (isNotchPattern) {
          // PATTERN DE NOTCHES : Ce contour devrait créer 2 notches aux extrémités
          console.log(`  ⚠️ NOTCH PATTERN DETECTED - This should create 2 notches at extremities`);
          // Traiter ce contour spécialement pour créer 2 notches
          return this.processNotchPattern(geometry, normalizedPoints, feature, element);
        } else if (isPartialContour) {
          // CONTOUR PARTIEL (découpe) : Garder les coordonnées absolues DSTV
          console.log(`  - Keeping absolute DSTV coordinates for partial contour`);
        } else {
          // CONTOUR COMPLET : Normaliser autour de l'origine pour CSG
          console.log(`  - Normalizing full contour coordinates around origin`);
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          normalizedPoints = normalizedPoints.map(point => [
            point[0] - centerX,
            point[1] - centerY
          ] as [number, number]);
          
          contourCenterOffset = { x: centerX, y: centerY };
        }
        
        console.log(`  - Contour bounds: X[${minX} to ${maxX}], Y[${minY} to ${maxY}]`);
        console.log(`  - First normalized point: [${normalizedPoints[0][0]}, ${normalizedPoints[0][1]}]`);
        console.log(`  - Feature position for CSG:`, feature.position);
      }
      
      const contourGeometry = this.createContourGeometry(
        normalizedPoints,
        feature.parameters.closed ?? true,
        Array.isArray(feature.parameters.bulge) ? feature.parameters.bulge : undefined,
        effectiveDepth
      );
      
      if (!contourGeometry) {
        console.error(`❌ Failed to create contour geometry for ${feature.id}`);
        return {
          success: false,
          error: 'Failed to create contour geometry'
        };
      }
      
      console.log(`✅ Contour geometry created successfully`);
      
      // Positionner le contour normalement
      const contourBrush = new Brush(contourGeometry);
      
      // CORRECTION CRITIQUE: Vérifier la validité de feature.position
      // Si la position semble incorrecte (distance > 500mm du centre), recalculer
      const distanceFromCenter = feature.position.length();
      
      if (distanceFromCenter > 500) {
        console.warn(`⚠️ feature.position seems incorrect (distance: ${distanceFromCenter.toFixed(2)}mm), attempting correction`);
        
        // Recalculer une position plus logique pour le contour avec pénétration
        const face = feature.parameters.face as any as StandardFace | undefined;
        const correctedPosition = new THREE.Vector3(0, 0, 0);
        const penetrationOffset = 2; // Décalage de 2mm pour garantir la pénétration
        
        // Positionner selon la face avec décalage de pénétration
        const faceStr = face?.toString()?.toLowerCase();
        if (faceStr === 'top' || faceStr === 'v' || face === StandardFace.TOP_FLANGE) {
          // Pour la face supérieure, positionner légèrement EN DESSOUS de la surface
          correctedPosition.y = (element.dimensions.height || 0) / 2 - penetrationOffset;
        } else if (faceStr === 'bottom' || faceStr === 'u' || face === StandardFace.BOTTOM_FLANGE) {
          // Pour la face inférieure, positionner légèrement AU DESSUS de la surface
          correctedPosition.y = -(element.dimensions.height || 0) / 2 + penetrationOffset;
        } else if (faceStr === 'web' || faceStr === 'o' || face === StandardFace.WEB) {
          correctedPosition.x = 0; // Au centre de l'âme
          correctedPosition.y = 0; // Centré verticalement
        }
        
        contourBrush.position.copy(correctedPosition);
        console.log(`  - Using corrected position:`, contourBrush.position);
      } else {
        contourBrush.position.copy(feature.position);
        console.log(`  - Using original feature.position:`, contourBrush.position);
      }
      console.log(`  - Contour positioned using feature.position:`, contourBrush.position);
      
      // IMPORTANT: Orienter le contour selon la face
      // Par défaut, l'extrusion est en +Z, mais pour TOP/BOTTOM il faut l'orienter en Y
      const face = feature.parameters.face as any as StandardFace | undefined;
      const faceStr = face?.toString()?.toLowerCase();
      
      if (faceStr === 'top' || faceStr === 'v' || face === StandardFace.TOP_FLANGE) {
        // Pour la face TOP: rotation de -90° autour de X pour que l'extrusion soit vers le bas (-Y)
        contourBrush.rotation.x = -Math.PI / 2;
      } else if (faceStr === 'bottom' || faceStr === 'u' || face === StandardFace.BOTTOM_FLANGE) {
        // Pour la face BOTTOM: rotation de +90° autour de X pour que l'extrusion soit vers le haut (+Y)
        contourBrush.rotation.x = Math.PI / 2;
      } else if (faceStr === 'web' || faceStr === 'o' || face === StandardFace.WEB) {
        // Pour l'âme: rotation de 90° autour de Y pour que l'extrusion soit en X
        contourBrush.rotation.y = Math.PI / 2;
      } else {
        // Utiliser la rotation de la feature si définie
        contourBrush.rotation.copy(feature.rotation);
      }
      
      contourBrush.updateMatrixWorld();
      console.log(`  - Contour positioned at:`, contourBrush.position);
      console.log(`  - Contour rotation:`, `x=${(contourBrush.rotation.x * 180/Math.PI).toFixed(1)}°, y=${(contourBrush.rotation.y * 180/Math.PI).toFixed(1)}°, z=${(contourBrush.rotation.z * 180/Math.PI).toFixed(1)}°`);
      
      // Créer le brush de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      console.log(`  - Base geometry vertices: ${geometry.attributes.position.count}`);
      
      // Pour les contours DSTV qui représentent des découpes, utiliser SUBTRACTION
      // Les contours qui ont été détectés comme des découpes (isContourACut = true) 
      // doivent être soustraits de la géométrie de base
      const isActuallyCut = feature.coordinateSystem === CoordinateSystem.DSTV && 
                            feature.parameters.contourType === 'outer' && 
                            this.isContourACut(feature, element);
      
      const operation = isActuallyCut ? 'SUBTRACTION' : 
                       (feature.coordinateSystem === CoordinateSystem.DSTV && feature.parameters.contourType === 'outer') 
                       ? 'INTERSECTION' 
                       : 'SUBTRACTION';
      
      console.log(`  - Performing CSG ${operation}...`);
      
      // Debug CSG - logs détaillés pour comprendre le problème
      console.log(`🔍 CSG Debug before operation:`);
      console.log(`  - Base geometry vertices: ${geometry.attributes.position.count}`);
      console.log(`  - Base geometry boundingBox:`, geometry.boundingBox);
      console.log(`  - Contour geometry vertices: ${contourGeometry.attributes.position.count}`);
      console.log(`  - Contour geometry boundingBox:`, contourGeometry.boundingBox);
      console.log(`  - Base brush position:`, baseBrush.position);
      console.log(`  - Contour brush position:`, contourBrush.position);
      console.log(`  - Distance between brushes:`, baseBrush.position.distanceTo(contourBrush.position));
      
      // Vérifier si les géométries se chevauchent
      // CORRECTION: Forcer le calcul des bounding boxes si nécessaires
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      if (!contourGeometry.boundingBox) {
        contourGeometry.computeBoundingBox();
      }
      
      const baseBox = geometry.boundingBox?.clone();
      const contourBox = contourGeometry.boundingBox?.clone();
      if (baseBox && contourBox) {
        // Translater les boundingBoxes selon les positions des brushes
        baseBox.translate(baseBrush.position);
        contourBox.translate(contourBrush.position);
        console.log(`  - Base box after translation:`, baseBox);
        console.log(`  - Contour box after translation:`, contourBox);
        const intersects = baseBox.intersectsBox(contourBox);
        console.log(`  - Boxes intersect:`, intersects);
        
        // CORRECTION CRITIQUE: Si pas d'intersection, ajuster la position du contour
        if (!intersects) {
          console.warn(`⚠️ No intersection detected between base and contour geometries!`);
          console.log(`  - Attempting position correction...`);
          
          // Repositionner le contour au centre de la géométrie de base
          const baseCenter = baseBox.getCenter(new THREE.Vector3());
          contourBrush.position.copy(baseCenter);
          
          // IMPORTANT: Positionner le contour pour qu'il PÉNÈTRE dans la géométrie
          // Le contour doit être légèrement décalé pour traverser la surface
          const face = feature.parameters.face as any as StandardFace | undefined;
          const faceStr = face?.toString()?.toLowerCase();
          const penetrationOffset = 2; // Décalage de 2mm pour garantir la pénétration
          
          if (faceStr === 'top' || faceStr === 'v' || face === StandardFace.TOP_FLANGE) {
            // Pour la face supérieure, positionner légèrement EN DESSOUS de la surface
            contourBrush.position.y = (element.dimensions.height || 0) / 2 - penetrationOffset;
          } else if (faceStr === 'bottom' || faceStr === 'u' || face === StandardFace.BOTTOM_FLANGE) {
            // Pour la face inférieure, positionner légèrement AU DESSUS de la surface
            contourBrush.position.y = -(element.dimensions.height || 0) / 2 + penetrationOffset;
          } else {
            // Pour l'âme (web), centrer en Y
            contourBrush.position.y = 0;
          }
          
          contourBrush.updateMatrixWorld();
          console.log(`  - Corrected contour position:`, contourBrush.position);
          
          // Vérifier à nouveau l'intersection
          const correctedBox = contourGeometry.boundingBox?.clone();
          if (correctedBox) {
            correctedBox.translate(contourBrush.position);
            const newIntersects = baseBox.intersectsBox(correctedBox);
            console.log(`  - After correction, boxes intersect:`, newIntersects);
          }
        }
      }
      
      const resultBrush = this.evaluator.evaluate(
        baseBrush, 
        contourBrush, 
        operation === 'SUBTRACTION' ? SUBTRACTION : INTERSECTION
      );
      console.log(`  - CSG operation completed`);
      
      // Nettoyer
      contourGeometry.dispose();
      
      // Extraire et optimiser la géométrie
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      console.log(`  - Result geometry vertices: ${resultGeometry.attributes.position.count}`);
      console.log(`  - Vertices changed: ${geometry.attributes.position.count} -> ${resultGeometry.attributes.position.count}`);
      
      resultBrush.geometry.dispose();
      
      console.log(`✅ Returning modified geometry for ${feature.id}`);
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
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    // Vérifier les points
    if (!params.points || params.points.length < 3) {
      errors.push('Contour requires at least 3 points');
    }
    
    // Vérifier que les points sont valides
    if (params.points) {
      for (let i = 0; i < params.points.length; i++) {
        const point = params.points[i] as [number, number] | {x: number, y: number};
        const x = Array.isArray(point) ? point[0] : point.x;
        const y = Array.isArray(point) ? point[1] : point.y;
        if (typeof x !== 'number' || typeof y !== 'number') {
          errors.push(`Invalid point at index ${i}`);
        }
      }
    }
    
    // Vérifier les bulges si présents
    if (params.bulge && Array.isArray(params.bulge)) {
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
      
      // Vérifier que les points sont valides
      console.debug(`🔍 createContourGeometry: Validating ${points.length} contour points for geometry creation...`);
      console.debug(`🔍 Raw input points:`, points);
      console.debug(`🔍 Closed: ${closed}, Depth: ${depth}mm, Has bulges: ${bulges ? 'yes' : 'no'}`);
      
      for (let i = 0; i < points.length; i++) {
        if (!Array.isArray(points[i]) || points[i].length < 2 || 
            typeof points[i][0] !== 'number' || typeof points[i][1] !== 'number' ||
            isNaN(points[i][0]) || isNaN(points[i][1])) {
          console.error(`❌ Invalid point at index ${i}:`, points[i], 'Type:', typeof points[i]);
          return null;
        }
        console.debug(`  Point ${i}: [${points[i][0]}, ${points[i][1]}]`);
      }
      
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
      
      // Calculer l'aire directement avec les points d'entrée pour comparaison
      const inputArea = this.calculatePolygonArea(points);
      console.debug(`📊 Direct input area calculation: ${inputArea}mm² from ${points.length} input points`);
      
      // Vérifier que le shape est valide
      if (!this.isShapeValid(shape)) {
        // Le shape n'est pas valide, essayer de créer une simple géométrie rectangulaire
        // basée sur les limites du contour
        const bounds = this.getContourBounds(points);
        const rectShape = new THREE.Shape();
        rectShape.moveTo(bounds.minX, bounds.minY);
        rectShape.lineTo(bounds.maxX, bounds.minY);
        rectShape.lineTo(bounds.maxX, bounds.maxY);
        rectShape.lineTo(bounds.minX, bounds.maxY);
        rectShape.closePath();
        
        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: depth, // Profondeur exacte
          bevelEnabled: false,
          steps: 1
        };
        
        const geometry = new THREE.ExtrudeGeometry(rectShape, extrudeSettings);
        // Ne pas centrer pour préserver les coordonnées absolues DSTV
        // geometry.center();
        return geometry;
      }
      
      // Extruder le contour
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: depth, // Profondeur exacte sans facteur multiplicateur
        bevelEnabled: false,
        steps: 1
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      // Ne pas centrer pour préserver les coordonnées absolues DSTV
      // geometry.center();
      
      // IMPORTANT: L'extrusion se fait toujours en +Z
      // Pour les faces TOP/BOTTOM, il faut faire une rotation pour que l'extrusion soit en Y
      // Cela sera géré par le positionnement et la rotation du brush
      
      return geometry;
      
    } catch (error) {
      console.error('Failed to create contour geometry:', error);
      return null;
    }
  }
  
  /**
   * Calcule la profondeur effective pour l'extrusion du contour
   */
  /**
   * Détermine si un contour représente une découpe ou la forme complète du profil
   */
  private isContourACut(feature: Feature, element: PivotElement): boolean {
    const points = feature.parameters.points;
    if (!points || points.length === 0) return false;
    
    // Obtenir les limites du contour
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points as Array<[number, number] | {x: number, y: number}>) {
      const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;
      const y = Array.isArray(point) ? point[1] : (point as {x: number, y: number}).y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    const contourWidth = maxX - minX;
    const contourHeight = maxY - minY;
    
    // Comparer avec les dimensions du profil
    const profileLength = element.dimensions.length || 1912.15;
    const profileWidth = element.dimensions.width || 146.1;
    const profileHeight = element.dimensions.height || 251.4;
    
    console.log(`🔍 isContourACut analysis:`);
    console.log(`  - Contour bounds: X[${minX} to ${maxX}], Y[${minY} to ${maxY}]`);
    console.log(`  - Contour size: ${contourWidth} x ${contourHeight}`);
    console.log(`  - Profile dimensions: ${profileLength} x ${profileWidth} x ${profileHeight}`);
    
    // Tolérance de 1mm pour les comparaisons
    const tolerance = 1;
    
    // Tests plus précis pour détecter les contours partiels
    const face = (feature.parameters.face as any as StandardFace) || StandardFace.WEB;
    
    if (face === StandardFace.WEB) {
      // Pour l'âme, vérifier si le contour couvre la totalité
      const isFullLength = Math.abs(contourWidth - profileLength) < tolerance;
      const isFullHeight = Math.abs(contourHeight - profileHeight) < tolerance;
      const startsAtZero = Math.abs(minX) < tolerance;
      const endsAtLength = Math.abs(maxX - profileLength) < tolerance;
      
      console.log(`  - Web analysis: fullLength=${isFullLength}, fullHeight=${isFullHeight}, startsAtZero=${startsAtZero}, endsAtLength=${endsAtLength}`);
      
      // Si le contour ne commence pas à 0 OU ne finit pas à la longueur totale OU n'a pas les bonnes dimensions, c'est une découpe
      const isCut = !startsAtZero || !endsAtLength || !isFullLength || !isFullHeight;
      console.log(`  - Web result: ${isCut ? 'CUT' : 'FULL PROFILE'}`);
      return isCut;
      
    } else if (face === StandardFace.TOP_FLANGE || face === StandardFace.BOTTOM_FLANGE) {
      // Pour les semelles, vérifier position et dimensions
      const isFullLength = Math.abs(contourWidth - profileLength) < tolerance;
      const isFullWidth = Math.abs(contourHeight - profileWidth) < tolerance;
      const startsAtZero = Math.abs(minX) < tolerance;
      const endsAtLength = Math.abs(maxX - profileLength) < tolerance;
      
      console.log(`  - Flange analysis: fullLength=${isFullLength}, fullWidth=${isFullWidth}, startsAtZero=${startsAtZero}, endsAtLength=${endsAtLength}`);
      
      // Si le contour ne commence pas à 0 OU ne finit pas à la longueur totale OU n'a pas les bonnes dimensions, c'est une découpe
      const isCut = !startsAtZero || !endsAtLength || !isFullLength || !isFullWidth;
      console.log(`  - Flange result: ${isCut ? 'CUT' : 'FULL PROFILE'}`);
      return isCut;
    }
    
    // Par défaut, considérer comme une découpe si différent des dimensions complètes
    console.log(`  - Default result: CUT`);
    return true;
  }

  private calculateEffectiveDepth(feature: Feature, element: PivotElement): number {
    // Si c'est un contour DSTV avec une profondeur spécifiée, l'utiliser
    if (feature.coordinateSystem === CoordinateSystem.DSTV && feature.parameters.depth) {
      const specifiedDepth = feature.parameters.depth;
      
      // Limiter la profondeur à des valeurs raisonnables (max 50mm pour les contours DSTV)
      if (specifiedDepth > 50) {
        console.warn(`DSTV contour depth ${specifiedDepth}mm seems too large, limiting to 50mm`);
        return 50;
      }
      
      return Math.max(specifiedDepth, 5); // Minimum 5mm pour assurer la coupe
    }
    
    // Pour les autres contours, utiliser l'épaisseur de l'élément
    const face = (feature.parameters.face as any as StandardFace) || StandardFace.WEB;
    const elementDims = element.dimensions;
    
    // CORRECTION: Utiliser des profondeurs plus importantes pour assurer la coupe CSG
    // Calculer la profondeur selon la face et le type d'élément
    const faceStr = face?.toString()?.toLowerCase();
    
    if (face === StandardFace.TOP_FLANGE || face === StandardFace.BOTTOM_FLANGE || faceStr === 'top' || faceStr === 'bottom' || faceStr === 'v' || faceStr === 'u') {
      // Pour les semelles, utiliser l'épaisseur de semelle + marge de sécurité
      const flangeThickness = elementDims.flangeThickness || elementDims.thickness || 10;
      return Math.max(flangeThickness * 1.5, 15); // Minimum 15mm
    } else if (face === StandardFace.WEB || faceStr === 'web' || faceStr === 'o') {
      // Pour l'âme, utiliser l'épaisseur d'âme + marge de sécurité  
      const webThickness = elementDims.webThickness || elementDims.thickness || 8;
      return Math.max(webThickness * 1.5, 12); // Minimum 12mm
    } else {
      // Face avant/arrière : profondeur suffisante pour traverser
      return Math.max(elementDims.thickness || 10, 20); // Minimum 20mm
    }
  }

  /**
   * Obtient les limites d'un ensemble de points
   */
  private getContourBounds(points: Array<[number, number]>): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points as Array<[number, number] | {x: number, y: number}>) {
      const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;
      const y = Array.isArray(point) ? point[1] : (point as {x: number, y: number}).y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return { minX, maxX, minY, maxY };
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
      console.debug(`🔍 Shape.getPoints() returned ${points.length} points`);
      if (points.length < 3) {
        console.debug(`❌ Shape has < 3 points: ${points.length}`);
        return false;
      }
      
      // Calculer l'aire pour vérifier que le shape n'est pas plat
      // Utilise l'algorithme de la formule de Shoelace
      console.debug(`Raw contour points from shape:`, points.map(p => `(${p.x}, ${p.y})`));
      
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        const term1 = points[i].x * points[j].y;
        const term2 = points[j].x * points[i].y;
        area += term1;
        area -= term2;
        if (i < 5) { // Log premiers termes pour debug
          console.debug(`  Shoelace term ${i}: ${points[i].x}*${points[j].y} - ${points[j].x}*${points[i].y} = ${term1} - ${term2} = ${term1 - term2}`);
        }
      }
      area = Math.abs(area / 2);
      
      console.debug(`Contour area calculation: ${points.length} points -> ${area}mm²`);
      
      // Si l'aire est trop petite, le shape est dégénéré
      // Tolérance adaptée aux unités DSTV (millimètres)
      const minArea = 10.0; // 10mm² minimum pour contours DSTV réels
      if (area < minArea) {
        console.warn(`Small contour area detected: ${area}mm² (minimum: ${minArea}mm²)`);
        // Accepter les aires > 1mm² pour les contours potentiellement valides
        return area > 1.0;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Calcule l'aire d'un polygone à partir de points [x,y] 
   * Utilise l'algorithme de Shoelace
   */
  private calculatePolygonArea(points: Array<[number, number]>): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const pointI = points[i] as [number, number] | {x: number, y: number};
      const pointJ = points[j] as [number, number] | {x: number, y: number};
      const xi = Array.isArray(pointI) ? pointI[0] : pointI.x;
      const yi = Array.isArray(pointI) ? pointI[1] : pointI.y;
      const xj = Array.isArray(pointJ) ? pointJ[0] : pointJ.x;
      const yj = Array.isArray(pointJ) ? pointJ[1] : pointJ.y;
      area += xi * yj;
      area -= xj * yi;
    }
    return Math.abs(area / 2);
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
          contour.parameters.points! as Array<[number, number]>,
          contour.parameters.closed ?? true,
          Array.isArray(contour.parameters.bulge) ? contour.parameters.bulge : undefined,
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
  
  
  /**
   * Détecte si le contour représente des notches aux extrémités
   */
  private detectNotches(feature: Feature, element: PivotElement): boolean {
    if (!feature.parameters.points || feature.parameters.points.length < 3) {
      return false;
    }
    
    const points = feature.parameters.points;
    const profileLength = element.dimensions.length || 0;
    
    // Trouver les coordonnées X min et max du contour
    let minX = Infinity;
    let maxX = -Infinity;
    
    for (const point of points as Array<[number, number] | {x: number, y: number}>) {
      const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    
    // Si le contour est plus court que le profil, c'est probablement des notches
    const contourLength = maxX - minX;
    const lengthDifference = profileLength - contourLength;
    
    // Tolérance de 1mm pour les erreurs d'arrondi
    if (lengthDifference > 1) {
      console.log(`  📏 Contour length: ${contourLength}mm, Profile length: ${profileLength}mm`);
      console.log(`  📏 Difference: ${lengthDifference}mm - Notches detected!`);
      return true;
    }
    
    return false;
  }
  
  /**
   * DEPRECATED: Maintenant géré par NotchProcessor
   * @deprecated Use NotchProcessor instead
   */
  private applyNotches(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    try {
      const points = feature.parameters.points!;
      const profileLength = element.dimensions.length || 0;
      const face = (feature.parameters.face as any as StandardFace) || StandardFace.WEB;
      
      // Analyser les points pour déterminer les zones de notch
      let minX = Infinity;
      let maxX = -Infinity;
      
      for (const point of points as Array<[number, number] | {x: number, y: number}>) {
        const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      
      const contourLength = maxX - minX;
      const notchDepth = (profileLength - contourLength) / 2;
      
      console.log(`  🔨 Creating notches: ${notchDepth}mm at each end`);
      
      // Créer le brush de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Créer les géométries de notch pour chaque extrémité
      const depth = this.calculateEffectiveDepth(feature, element);
      
      // Notch au début (X=0)
      if (minX > 0.1) {
        const firstPoint = points[0] as [number, number] | {x: number, y: number};
        const lastPoint = points[points.length-1] as [number, number] | {x: number, y: number};
        const firstY = Array.isArray(firstPoint) ? firstPoint[1] : firstPoint.y;
        const lastY = Array.isArray(lastPoint) ? lastPoint[1] : lastPoint.y;
        
        const startNotchPoints: Array<[number, number]> = [
          [0, firstY],
          [minX, firstY],
          [minX, lastY],
          [0, lastY],
          [0, firstY]
        ];
        
        const startNotchGeometry = this.createContourGeometry(
          startNotchPoints,
          true,
          undefined,
          depth * 3 // Plus profond pour assurer la coupe complète
        );
        
        if (startNotchGeometry) {
          const startNotchBrush = new Brush(startNotchGeometry);
          // Positionner au début de la pièce
          startNotchBrush.position.set(-profileLength/2, 0, this.getFaceZOffset(face, element));
          startNotchBrush.updateMatrixWorld();
          
          console.log(`  ✂️ Applying start notch at X=0`);
          const tempBrush = this.evaluator.evaluate(baseBrush, startNotchBrush, SUBTRACTION);
          baseBrush.geometry.dispose();
          startNotchGeometry.dispose();
          baseBrush.geometry = tempBrush.geometry;
        }
      }
      
      // Notch à la fin (X=profileLength)
      if (maxX < profileLength - 0.1) {
        const firstPoint = points[0] as [number, number] | {x: number, y: number};
        const lastPoint = points[points.length-1] as [number, number] | {x: number, y: number};
        const firstY = Array.isArray(firstPoint) ? firstPoint[1] : firstPoint.y;
        const lastY = Array.isArray(lastPoint) ? lastPoint[1] : lastPoint.y;
        
        const endNotchPoints: Array<[number, number]> = [
          [maxX, firstY],
          [profileLength, firstY],
          [profileLength, lastY],
          [maxX, lastY],
          [maxX, firstY]
        ];
        
        const endNotchGeometry = this.createContourGeometry(
          endNotchPoints,
          true,
          undefined,
          depth * 3
        );
        
        if (endNotchGeometry) {
          const endNotchBrush = new Brush(endNotchGeometry);
          // Positionner à la fin de la pièce
          endNotchBrush.position.set(-profileLength/2, 0, this.getFaceZOffset(face, element));
          endNotchBrush.updateMatrixWorld();
          
          console.log(`  ✂️ Applying end notch at X=${profileLength}`);
          const resultBrush = this.evaluator.evaluate(baseBrush, endNotchBrush, SUBTRACTION);
          endNotchGeometry.dispose();
          
          // Extraire la géométrie finale
          const resultGeometry = resultBrush.geometry.clone();
          resultGeometry.computeVertexNormals();
          resultGeometry.computeBoundingBox();
          resultGeometry.computeBoundingSphere();
          
          resultBrush.geometry.dispose();
          baseBrush.geometry.dispose();
          
          console.log(`  ✅ Notches applied successfully`);
          return {
            success: true,
            geometry: resultGeometry
          };
        }
      }
      
      // Si on arrive ici, extraire la géométrie modifiée
      const resultGeometry = baseBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      baseBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to apply notches: ${error}`);
      return {
        success: false,
        error: `Failed to apply notches: ${error}`
      };
    }
  }
  
  /**
   * Calcule l'offset Z pour une face donnée
   */
  private getFaceZOffset(face: ProfileFace | StandardFace | string | undefined, element: PivotElement): number {
    const height = element.dimensions.height || 0;
    
    switch (face) {
      case ProfileFace.TOP:
      case StandardFace.TOP_FLANGE:
      case 'top':
        return height / 2;
      case ProfileFace.BOTTOM:
      case StandardFace.BOTTOM_FLANGE:
      case 'bottom':
        return -height / 2;
      case ProfileFace.WEB:
      case StandardFace.WEB:
      case 'web':
      default:
        return 0;
    }
  }
  
  /**
   * Traite un contour en pattern de notches (U inversé)
   * Crée 2 notches aux extrémités au lieu d'une découpe au centre
   */
  private processNotchPattern(
    geometry: THREE.BufferGeometry,
    points: Array<[number, number]>,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`🔨 Processing notch pattern for ${feature.id}`);
    
    try {
      const profileLength = element.dimensions.length || 1912.15;
      const depth = this.calculateEffectiveDepth(feature, element);
      
      // Identifier les 2 zones de notches
      // Zone 1: Points avec X proche de 0
      // Zone 2: Points avec X proche de profileLength
      
      const notch1Points: Array<[number, number]> = [];
      const notch2Points: Array<[number, number]> = [];
      
      // Analyser le contour pour identifier les zones de notches
      // Le pattern en U inversé a des points aux deux extrémités
      const tolerance = 1.0;
      
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const nextPoint = points[(i + 1) % points.length];
        
        // Zone de début (X proche de 0)
        if (Math.abs(point[0]) < tolerance) {
          notch1Points.push(point);
        }
        // Zone de fin (X proche de profileLength)  
        else if (Math.abs(point[0] - profileLength) < tolerance || point[0] > 1800) {
          notch2Points.push(point);
        }
        
        // Détecter les transitions pour compléter les zones
        const gap = Math.abs(nextPoint[0] - point[0]);
        if (gap > 500) {
          // Grand saut détecté, ajouter les points de transition
          if (point[0] > 1800) {
            notch2Points.push(point);
          }
          if (nextPoint[0] < 100) {
            notch1Points.push(nextPoint);
          }
        }
      }
      
      console.log(`  - Notch 1: ${notch1Points.length} points near start`);
      if (notch1Points.length > 0) {
        console.log(`    Points: ${notch1Points.map(p => `(${p[0]},${p[1]})`).join(', ')}`);
      }
      console.log(`  - Notch 2: ${notch2Points.length} points near end`);
      if (notch2Points.length > 0) {
        console.log(`    Points: ${notch2Points.map(p => `(${p[0]},${p[1]})`).join(', ')}`);
      }
      
      let resultGeometry = geometry.clone();
      const baseBrush = new Brush(resultGeometry);
      baseBrush.updateMatrixWorld();
      
      // Créer et appliquer le premier notch (début)
      // Même avec seulement 2 points, on peut créer un notch si on connaît les dimensions
      if (notch1Points.length >= 2 || (notch1Points.length === 0 && notch2Points.length > 0)) {
        // Si on n'a pas de points au début mais qu'on a des points à la fin, c'est un notch complet
        const minY = notch1Points.length > 0 
          ? Math.min(...notch1Points.map(p => p[1]))
          : 0;
        const maxY = notch1Points.length > 0 
          ? Math.max(...notch1Points.map(p => p[1]))
          : element.dimensions.width || 146.1;
        const notchDepth = 70; // Profondeur du notch en X
        
        console.log(`  - Notch 1 Y range: ${minY} to ${maxY}`);
        console.log(`  - Notch 1 depth: ${notchDepth}mm`);
        
        const notch1Rect: Array<[number, number]> = [
          [0, minY],
          [notchDepth, minY],
          [notchDepth, maxY],
          [0, maxY],
          [0, minY]
        ];
        
        console.log(`  - Creating notch 1 rectangle: ${notch1Rect.map(p => `(${p[0]},${p[1]})`).join(', ')}`);
        console.log(`  - Depth for notch 1: ${depth * 2}mm`);
        const notch1Geometry = this.createContourGeometry(notch1Rect, true, undefined, depth * 2);
        console.log(`  - Notch 1 geometry created: ${notch1Geometry ? 'YES' : 'NO'}`);
        
        if (!notch1Geometry) {
          console.warn('⚠️ Failed to create notch 1 geometry!');
        }
        if (notch1Geometry) {
          // Debug: vérifier les vertices
          console.log(`  - Notch 1 geometry vertices: ${notch1Geometry.attributes.position?.count || 0}`);
          const notch1Brush = new Brush(notch1Geometry);
          // Positionner au début du profil
          const notch1X = -profileLength/2 + notchDepth/2; // Centrer le notch dans sa zone
          notch1Brush.position.set(
            notch1X,
            (element.dimensions.height || 0) / 2 - 2,
            0
          );
          console.log(`  - Notch 1 brush position: (${notch1X}, ${(element.dimensions.height || 0) / 2 - 2}, 0)`);
          
          // Orienter pour la face TOP
          notch1Brush.rotation.x = -Math.PI / 2;
          notch1Brush.updateMatrixWorld();
          
          console.log(`  - Applying notch 1 at start`);
          console.log(`  - Base geometry vertices before: ${baseBrush.geometry.attributes.position?.count || 0}`);
          const tempBrush = this.evaluator.evaluate(baseBrush, notch1Brush, SUBTRACTION);
          console.log(`  - Base geometry vertices after notch 1: ${tempBrush.geometry.attributes.position?.count || 0}`);
          resultGeometry.dispose();
          resultGeometry = tempBrush.geometry.clone();
          baseBrush.geometry = resultGeometry;
          notch1Geometry.dispose();
        }
      }
      
      // Créer et appliquer le second notch (fin)
      if (notch2Points.length >= 2) {
        // Créer un rectangle pour le notch de fin
        const minY = Math.min(...notch2Points.map(p => p[1]));
        const maxY = Math.max(...notch2Points.map(p => p[1]));
        const notchStart = profileLength - 70; // Commence 70mm avant la fin
        
        const notch2Rect: Array<[number, number]> = [
          [notchStart, minY],
          [profileLength, minY],
          [profileLength, maxY],
          [notchStart, maxY],
          [notchStart, minY]
        ];
        
        const notch2Geometry = this.createContourGeometry(notch2Rect, true, undefined, depth * 2);
        if (notch2Geometry) {
          const notch2Brush = new Brush(notch2Geometry);
          // Positionner à la fin du profil (notchStart - profileLength/2 pour centrer)
          const notch2X = notchStart + 35 - profileLength/2; // Centrer le notch dans sa zone
          notch2Brush.position.set(
            notch2X,
            (element.dimensions.height || 0) / 2 - 2,
            0
          );
          console.log(`  - Notch 2 brush position: (${notch2X}, ${(element.dimensions.height || 0) / 2 - 2}, 0)`);
          
          // Orienter pour la face TOP
          notch2Brush.rotation.x = -Math.PI / 2;
          notch2Brush.updateMatrixWorld();
          
          console.log(`  - Applying notch 2 at end`);
          console.log(`  - Base geometry vertices before: ${baseBrush.geometry.attributes.position?.count || 0}`);
          const finalBrush = this.evaluator.evaluate(baseBrush, notch2Brush, SUBTRACTION);
          console.log(`  - Base geometry vertices after notch 2: ${finalBrush.geometry.attributes.position?.count || 0}`);
          resultGeometry.dispose();
          resultGeometry = finalBrush.geometry.clone();
          notch2Geometry.dispose();
        }
      }
      
      // Finaliser la géométrie
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      console.log(`✅ Notch pattern processed successfully`);
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to process notch pattern: ${error}`);
      return {
        success: false,
        error: `Failed to process notch pattern: ${error}`
      };
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}