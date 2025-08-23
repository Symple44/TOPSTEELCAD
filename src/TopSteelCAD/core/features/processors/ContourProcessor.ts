/**
 * Processeur pour les contours de découpe complexes
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import {Feature, 
  IFeatureProcessor, 
  ProcessorResult, ProfileFace} from '../types';
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
      if (feature.coordinateSystem === 'DSTV' && feature.parameters.contourType === 'outer') {
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
      
      const contourGeometry = this.createContourGeometry(
        feature.parameters.points! as Array<[number, number]>,
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
      
      // Pour les contours DSTV, aligner selon la face
      if (feature.coordinateSystem === 'DSTV' && feature.parameters.contourType === 'outer') {
        const face = feature.parameters.face || 'front';
        
        // Le profil I est centré sur Y=0, Z=0 et s'étend de X=-longueur/2 à X=+longueur/2
        // Les contours DSTV commencent à X=0, donc on doit les décaler
        const profileLength = element.dimensions.length || 1912.15;
        
        // Décaler le contour pour aligner avec le profil
        // Les contours DSTV commencent à X=0, le profil est centré
        contourBrush.position.set(-profileLength/2, 0, 0);
        
        // Ajuster selon la face
        if (face === ProfileFace.TOP || face === ProfileFace.BOTTOM) {
          // Pour les faces top/bottom, ajuster en Z
          const zOffset = face === ProfileFace.TOP 
            ? (element.dimensions.height || 251.4) / 2 
            : -(element.dimensions.height || 251.4) / 2;
          contourBrush.position.z = zOffset;
        } else if (face === ProfileFace.WEB) {
          // L'âme est déjà centrée
          contourBrush.position.y = 0;
        }
        
        console.log(`  - DSTV outer contour positioned for face ${face} at`, contourBrush.position);
      } else {
        contourBrush.position.copy(feature.position);
      }
      
      contourBrush.rotation.copy(feature.rotation);
      contourBrush.updateMatrixWorld();
      console.log(`  - Contour positioned at:`, contourBrush.position);
      
      // Créer le brush de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      console.log(`  - Base geometry vertices: ${geometry.attributes.position.count}`);
      
      // Pour les contours DSTV qui représentent des découpes, utiliser SUBTRACTION
      // Les contours qui ont été détectés comme des découpes (isContourACut = true) 
      // doivent être soustraits de la géométrie de base
      const isActuallyCut = feature.coordinateSystem === 'DSTV' && 
                            feature.parameters.contourType === 'outer' && 
                            this.isContourACut(feature, element);
      
      const operation = isActuallyCut ? 'SUBTRACTION' : 
                       (feature.coordinateSystem === 'DSTV' && feature.parameters.contourType === 'outer') 
                       ? 'INTERSECTION' 
                       : 'SUBTRACTION';
      
      console.log(`  - Performing CSG ${operation}...`);
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
    
    // Tolérance de 1mm pour les comparaisons
    const tolerance = 1;
    
    // Si le contour est significativement plus petit que le profil, c'est une découpe
    const face = feature.parameters.face || ProfileFace.WEB;
    
    if (face === ProfileFace.WEB) {
      // Pour l'âme, comparer avec longueur x hauteur
      const isFullLength = Math.abs(contourWidth - profileLength) < tolerance;
      const isFullHeight = Math.abs(contourHeight - profileHeight) < tolerance;
      return !(isFullLength && isFullHeight);
    } else if (face === ProfileFace.TOP || face === ProfileFace.BOTTOM || face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
      // Pour les ailes, comparer avec longueur x largeur
      const isFullLength = Math.abs(contourWidth - profileLength) < tolerance;
      const isFullWidth = Math.abs(contourHeight - profileWidth) < tolerance;
      return !(isFullLength && isFullWidth);
    }
    
    // Par défaut, considérer comme une découpe si différent des dimensions complètes
    return true;
  }

  private calculateEffectiveDepth(feature: Feature, element: PivotElement): number {
    // Si c'est un contour DSTV avec une profondeur spécifiée, l'utiliser
    if (feature.coordinateSystem === 'DSTV' && feature.parameters.depth) {
      const specifiedDepth = feature.parameters.depth;
      
      // Limiter la profondeur à des valeurs raisonnables (max 50mm pour les contours DSTV)
      if (specifiedDepth > 50) {
        console.warn(`DSTV contour depth ${specifiedDepth}mm seems too large, limiting to 50mm`);
        return 50;
      }
      
      return specifiedDepth;
    }
    
    // Pour les autres contours, utiliser l'épaisseur de l'élément
    const face = feature.parameters.face || 'front';
    const elementDims = element.dimensions;
    
    // Calculer la profondeur selon la face et le type d'élément
    switch (face) {
      case 'top':
      case 'bottom':
        // Pour les semelles d'une poutre I, utiliser l'épaisseur de semelle si disponible
        return Math.min(elementDims.flangeThickness || elementDims.thickness || 10, 15);
        
      case 'web':
        // Pour l'âme d'une poutre I, utiliser l'épaisseur d'âme si disponible
        return Math.min(elementDims.webThickness || elementDims.thickness || 8, 12);
        
      default:
        // Face avant/arrière : profondeur minimale
        return Math.min(elementDims.thickness || 10, 10);
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
      const face = feature.parameters.face || ProfileFace.WEB;
      
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
  private getFaceZOffset(face: ProfileFace | string | undefined, element: PivotElement): number {
    const height = element.dimensions.height || 0;
    
    switch (face) {
      case ProfileFace.TOP:
      case ProfileFace.TOP_FLANGE:
      case 'top':
        return height / 2;
      case ProfileFace.BOTTOM:
      case ProfileFace.BOTTOM_FLANGE:
      case 'bottom':
        return -height / 2;
      case ProfileFace.WEB:
      case 'web':
      default:
        return 0;
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}