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
import { CutCategory, cutCategoryDetector } from './CutCategoryDetector';
import { ICutStrategy, StraightCutStrategy, AngleCutStrategy, TubeContourStrategy, BevelCutStrategy, EndCutStrategy } from './strategies';
import { cutLogger } from './CutLogger';

export class CutProcessor extends FeatureProcessor {
  private positionService: PositionService;
  private evaluator: Evaluator;
  private strategies: ICutStrategy[];
  
  constructor() {
    super();
    this.positionService = PositionService.getInstance();
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    
    // Initialiser les stratégies de découpe
    this.strategies = [
      new EndCutStrategy(),         // Priorité aux coupes d'extrémité (h5004)
      new BevelCutStrategy(),      // Puis bevel cuts (préparations de soudure)
      new StraightCutStrategy(),
      new AngleCutStrategy(), 
      new TubeContourStrategy()
    ];
    
    // Force reload - v5
  }
  
  canProcess(feature: Feature): boolean {
    return feature.type === FeatureType.CUT || 
           feature.type === FeatureType.CUTOUT || 
           feature.type === FeatureType.NOTCH ||
           feature.type === FeatureType.END_CUT;
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessResult {
    // Démarrer le contexte de logging
    cutLogger.startCutOperation(feature, element);
    
    // Valider la feature
    const validationErrors = this.validateFeature(feature, element);
    if (validationErrors.length > 0) {
      cutLogger.error('Feature validation failed', new Error(validationErrors.join(', ')));
      cutLogger.endCutOperation(false, validationErrors.join(', '));
      return {
        success: false,
        error: validationErrors.join(', ')
      };
    }
    
    try {
      // Debug: Afficher les paramètres de la feature
      if (feature.id?.includes('end_cut')) {
        console.log(`  🔍 Checking end_cut feature ${feature.id}:`, {
          type: feature.type,
          isEndCut: (feature.parameters as Record<string, unknown>)?.isEndCut,
          cutType: feature.parameters?.cutType,
          params: feature.parameters
        });
      }
      
      // Traitement spécial pour les coupes d'extrémité (tubes)
      if (feature.type === FeatureType.END_CUT || (feature.parameters as Record<string, unknown>)?.isEndCut || feature.parameters?.cutType === 'end_cut') {
        console.log(`  🔧 Processing END_CUT feature for tube`);
        return this.processEndCut(geometry, feature, element);
      }
      
      // Récupérer les points du contour
      const rawContourPoints = feature.parameters.points || [];
      const contourPoints = this.normalizePoints(rawContourPoints);
      // CORRECTION: La face est directement sur feature, pas dans parameters
      const face = feature.face || feature.parameters?.face || ProfileFace.WEB;
      const depth = feature.parameters.depth || element.dimensions?.flangeThickness || 10;
      const isTransverse = feature.parameters.isTransverse || false;
      const cutType = feature.parameters.cutType;
      
      if (contourPoints.length < 3) {
        return {
          success: false,
          error: 'Cut requires at least 3 contour points'
        };
      }
      
      // Logger les détails du contour
      const bounds = this.getContourBounds(contourPoints);
      cutLogger.logContourDetails(contourPoints, bounds);
      
      // Détecter la catégorie et le type de coupe
      const category = cutCategoryDetector.detectCategory(feature, element);
      const cutTypeDetected = cutCategoryDetector.detectType(feature, element);
      cutLogger.logCutDetection(category, cutTypeDetected);
      
      // NOUVELLE DÉTECTION: Contours de redéfinition sur semelles (M1002 flanges)
      // DOIT être testé AVANT le pattern de notches pour éviter le traitement incorrect
      if (this.isFlangeFinalContour(contourPoints, face, element)) {
        cutLogger.logStrategySelection('FlangeContourCut', 'Flange final contour detected');
        const result = this.processFlangeContourCut(geometry, contourPoints, face, element, feature);
        cutLogger.endCutOperation(result.success, result.error);
        return result;
      }
      
      // CRITIQUE: PRÉSERVER ABSOLUMENT LE CODE M1002 - Détecter si c'est une coupe avec encoches partielles (M1002 pattern)
      if (cutType === 'partial_notches' || this.isPartialNotchPattern(contourPoints, element)) {
        cutLogger.logStrategySelection('PartialNotches', 'M1002 pattern detected - using LEGACY processing');
        const result = this.processPartialNotches(geometry, contourPoints, face, element, feature);
        cutLogger.endCutOperation(result.success, result.error);
        return result;
      }
      
      // NOUVELLE ARCHITECTURE: Essayer d'utiliser les stratégies pour les coupes extérieures
      if (category === CutCategory.EXTERIOR && !isTransverse) {
        cutLogger.debug('Trying strategy-based processing for exterior cut');
        const strategyResult = this.tryProcessWithStrategies(geometry, feature, element);
        if (strategyResult.success) {
          cutLogger.logStrategySelection(strategyResult.strategyUsed || 'Unknown', 'Strategy successfully handled the cut');
          cutLogger.endCutOperation(true);
          return strategyResult.result as ProcessResult;
        } else {
          cutLogger.warn('Strategy processing failed, falling back to legacy', { error: strategyResult.error });
          // Continue with legacy processing
        }
      }
      
      if (face === ProfileFace.WEB || face === ProfileFace.BOTTOM) {
        const bounds = this.getContourBounds(contourPoints);
        console.log(`    Original bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
        
        // Vérifier si les découpes sont à l'extrémité
        const profileLength = element.dimensions?.length || 2260;
        const isAtEnd = bounds.minX > profileLength * 0.9;
        if (isAtEnd) {
          console.log(`    ⚠️ Cut is at beam extremity (X > ${(profileLength * 0.9).toFixed(1)})`);
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
      
      // Logger la création de la géométrie
      cutLogger.logGeometryCreation(cutGeometry, isTransverse ? 'TransverseCut' : 'StandardCut');
      
      // Effectuer l'opération CSG de soustraction avec three-bvh-csg
      const originalVertexCount = geometry.attributes.position?.count || 0;
      cutLogger.markPerformanceStart('CSG_SUBTRACTION');
      
      // Créer les brushes pour CSG
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const cutBrush = new Brush(cutGeometry);
      cutBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        cutLogger.error('Invalid base geometry for CSG');
        cutLogger.endCutOperation(false, 'Invalid base geometry for CSG');
        return { success: false, error: 'Invalid base geometry for CSG' };
      }
      if (!cutGeometry || !cutGeometry.attributes || !cutGeometry.attributes.position) {
        cutLogger.error('Invalid cut geometry for CSG');
        cutLogger.endCutOperation(false, 'Invalid cut geometry for CSG');
        return { success: false, error: 'Invalid cut geometry for CSG' };
      }
      
      const resultBrush = this.evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
      const resultGeometry = resultBrush.geometry.clone();
      cutLogger.markPerformanceEnd('CSG_SUBTRACTION');
      
      // Nettoyer le brush résultant
      resultBrush.geometry.dispose();
      
      // Calculer les normales et optimiser la géométrie
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      const resultVertexCount = resultGeometry.attributes.position?.count || 0;
      cutLogger.logCSGOperation('SUBTRACTION', originalVertexCount, resultVertexCount);
      
      // Vérifier si la géométrie a changé
      if (resultVertexCount === originalVertexCount) {
        cutLogger.warn('Cut operation did not modify geometry - cut may be outside bounds');
        // Continuer quand même car certaines découpes peuvent ne pas modifier le nombre de vertices
      }
      
      // Nettoyer
      cutGeometry.dispose();
      
      // Transférer les userData
      Object.assign(resultGeometry.userData, geometry.userData);
      
      // Ajouter les informations de la découpe avec bounds pour les outlines
      if (!resultGeometry.userData) {
        resultGeometry.userData = {};
      }
      if (!resultGeometry.userData.cuts) {
        resultGeometry.userData.cuts = [];
      }
      
      // Calculer les bounds de la découpe pour les outlines
      const cutBounds = this.getContourBounds(contourPoints);
      const dims = element.dimensions || {};
      const profileLength = dims.length || 1000;
      const profileHeight = dims.height || 300;
      
      // Détecter si c'est une coupe de biais pour l'inclure dans cutInfo
      const isBevelCut = element.type === 'TUBE_RECT' && this.isBevelCut(contourPoints);
      
      const cutInfo = {
        id: feature.id || `cut_${Date.now()}`,
        type: isBevelCut ? 'bevel' : (cutType === 'partial_notches' ? 'notch' : 'cut'),
        face: face,
        bounds: {
          minX: cutBounds.minX - profileLength / 2,
          maxX: cutBounds.maxX - profileLength / 2,
          minY: cutBounds.minY - profileHeight / 2,
          maxY: cutBounds.maxY - profileHeight / 2,
          minZ: -depth / 2,
          maxZ: depth / 2
        },
        contourPoints,
        depth,
        isBevelCut
      };
      
      resultGeometry.userData.cuts.push(cutInfo);
      console.log(`  📐 Added cut info to userData:`, cutInfo);
      
      
      cutLogger.endCutOperation(true);
      return {
        success: true,
        geometry: resultGeometry
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      cutLogger.error('Cut processing failed', error instanceof Error ? error : new Error(errorMessage));
      cutLogger.endCutOperation(false, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters || {};
    
    // Pour les coupes d'extrémité, pas besoin de points de contour
    if ((params as Record<string, unknown>).isEndCut || params.cutType === 'end_cut') {
      return errors; // Pas de validation spécifique pour les coupes d'extrémité
    }
    
    // Pour les autres coupes, vérifier les points
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
    const dims = element.dimensions || {};
    const length = dims.length || 1000;
    const height = dims.height || 300;
    const width = dims.width || 100;
    
    console.log(`  Creating cut geometry for face ${face}:`);
    console.log(`    Element dims: L=${dims.length}, H=${dims.height}, W=${dims.width}`);
    console.log(`    Original contour points:`, contourPoints);
    
    // Vérifier si c'est un tube
    console.log(`    Element metadata:`, element.metadata);
    console.log(`    Profile type:`, element.metadata?.profileType);
    console.log(`    Profile name:`, element.metadata?.profileName);
    
    const isTubeProfile = element.metadata?.profileType === 'TUBE_RECT' || 
                          element.metadata?.profileType === 'TUBE_ROUND' ||
                          element.metadata?.profileName?.includes('HSS') ||
                          element.metadata?.profileName?.includes('RHS') ||
                          element.metadata?.profileName?.includes('SHS');
    
    console.log(`    Is tube profile: ${isTubeProfile}`);
    
    // PHASE 2 AMÉLIORÉ - Simplification intelligente pour tubes HSS complexes
    if (isTubeProfile && this.shouldSimplifyTubeGeometry(contourPoints, element)) {
      console.log(`    🔄 Complex HSS tube contour with ${contourPoints.length} points - applying intelligent simplification`);
      
      // Utiliser le nouveau logging amélioré Phase 1
      if (cutLogger?.logTubeGeometryDetails) {
        cutLogger.logTubeGeometryDetails(contourPoints, element);
      }
      
      // Simplification avec analyse de complexité
      const simplifiedGeometry = this.createSimplifiedTubeGeometry(contourPoints, element, face);
      
      // Logging CSG Phase 1 si disponible
      const originalVertices = contourPoints.length * 2; // Approximation
      if (cutLogger?.logCSGMetrics) {
        // Créer un objet simulé pour les métriques
        const mockGeometry = new THREE.BufferGeometry();
        const positionAttribute = new THREE.BufferAttribute(new Float32Array(originalVertices * 3), 3);
        mockGeometry.setAttribute('position', positionAttribute);
        
        cutLogger.logCSGMetrics('tube_simplification', 
          mockGeometry,
          simplifiedGeometry, 
          0 // Pas de temps de calcul pour simplification
        );
      }
      
      return simplifiedGeometry;
    }
    
    // Créer une forme (Shape) à partir des points du contour
    const shape = new THREE.Shape();
    
    // Transformer et centrer les points selon la face
    const transformedPoints = contourPoints.map(p => {
      if (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
        // Pour les ailes : forme dans le plan XZ (horizontal)
        const transformedPoint = [
          p[0] - length / 2,     // Position le long de la poutre
          p[1] - width / 2       // Position sur la largeur (utiliser width variable)
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
    const flangeThickness = element.dimensions?.flangeThickness || element.metadata?.flangeThickness || 7.6;
    console.log(`    Using flangeThickness: ${flangeThickness}mm from element:`, {
      fromDimensions: element.dimensions?.flangeThickness,
      fromMetadata: element.metadata?.flangeThickness,
      fallback: 7.6
    });
    // Vérifier si c'est un tube (HSS, RHS, etc.)
    const isTube = element.metadata?.profileType === 'TUBE_RECT' || 
                   element.metadata?.profileType === 'TUBE_ROUND' ||
                   element.metadata?.profileName?.includes('HSS') ||
                   element.metadata?.profileName?.includes('RHS') ||
                   element.metadata?.profileName?.includes('SHS');
    
    // Profondeur de la découpe selon la face
    let actualDepth: number;
    if (isTube) {
      // Pour les tubes, utiliser l'épaisseur de paroi
      const wallThickness = element.dimensions?.thickness || 4.8;
      actualDepth = wallThickness * 2; // Traverser complètement la paroi
      console.log(`    Tube profile detected - using wall thickness: ${wallThickness}mm`);
    } else {
      actualDepth = (face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE)
        ? 50  // Profondeur fixe pour traverser complètement l'aile
        : depth * 2.0;  // Pour l'âme, utiliser la profondeur fournie
    }
    
    let geometry: THREE.BufferGeometry | undefined;
    
    console.log(`    Geometry creation: isTube=${isTube}, face=${face}`);
    
    // Pour les tubes ou les ailes, créer un BoxGeometry
    if (isTube || face === ProfileFace.TOP_FLANGE || face === ProfileFace.BOTTOM_FLANGE) {
      // Pour les tubes et les ailes, créer un BoxGeometry directement à partir des bounds
      const bounds = this.getContourBounds(contourPoints);
      const cutWidth = bounds.maxX - bounds.minX;
      const cutDepth = bounds.maxY - bounds.minY;
      
      // Pour les tubes, créer une géométrie triangulaire pour les coupes de biais
      if (isTube) {
        console.log(`    📐 Processing tube cut - checking for angle cut`);
        console.log(`    Contour points (${contourPoints.length}):`, contourPoints);
        
        // Détecter si c'est une coupe d'angle (diagonale complète)
        const isAngleCut = this.isAngleCut(contourPoints, element);
        console.log(`    Angle cut detection result: ${isAngleCut}`);
        
        if (isAngleCut && contourPoints.length >= 4) {
          console.log(`    🔺 ANGLE CUT detected - creating prism geometry to remove corner`);
          console.log(`    Face: ${face}, Element type: ${element.type}`);
          
          // Déterminer si c'est une coupe au début ou à la fin
          const profileLength = dims.length || 2259.98;
          const isStartCut = bounds.minX < 100; // Coupe au début si X < 100mm
          const isEndCut = bounds.maxX > profileLength - 100; // Coupe à la fin
          
          console.log(`    Cut position: ${isStartCut ? 'START' : isEndCut ? 'END' : 'MIDDLE'}`);
          
          // Créer un prisme qui traverse complètement le tube
          // Pour une coupe d'angle, on crée un BoxGeometry qu'on positionne en diagonale
          const cutLength = bounds.maxX - bounds.minX;
          const tubeSize = Math.max(height, width);
          
          // Créer un grand box qui sera positionné en diagonale
          geometry = new THREE.BoxGeometry(
            cutLength * 2,  // Longueur du prisme (sur-dimensionné)
            tubeSize * 2,    // Hauteur (sur-dimensionné)
            tubeSize * 2     // Profondeur pour traverser tout le tube
          );
          
          // Calculer l'angle de la coupe
          let angle = 0;
          for (let i = 1; i < contourPoints.length; i++) {
            const dx = contourPoints[i][0] - contourPoints[i-1][0];
            const dy = contourPoints[i][1] - contourPoints[i-1][1];
            if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
              angle = Math.atan2(dy, dx);
              break;
            }
          }
          
          console.log(`    Cut angle: ${(angle * 180 / Math.PI).toFixed(1)}°`);
          
          // Positionner et orienter le prisme
          if (isStartCut) {
            // Coupe au début : positionner à X=0
            geometry.rotateZ(angle);
            geometry.translate(
              -profileLength/2 + cutLength/2,
              -height/2,
              0
            );
          } else if (isEndCut) {
            // Coupe à la fin : positionner à X=profileLength
            geometry.rotateZ(-angle);
            geometry.translate(
              profileLength/2 - cutLength/2,
              -height/2,
              0
            );
          }
          
          console.log(`    ✅ Created ANGLE CUT prism geometry for tube`);
        } else {
          // Coupe droite sur tube
          geometry = new THREE.BoxGeometry(cutWidth * 1.2, actualDepth * 2, cutDepth * 1.2);
          console.log(`    Created straight cut geometry for tube`);
        }
      } else {
        geometry = new THREE.BoxGeometry(cutWidth, actualDepth, cutDepth);
        
        // Positionner le box aux bonnes coordonnées
        const centerX = (bounds.minX + bounds.maxX) / 2 - length / 2;
        const centerZ = (bounds.minY + bounds.maxY) / 2 - dims.width / 2;
        
        geometry.translate(centerX, 0, centerZ);
        console.log(`    Created box for face ${face}: size=${cutWidth}x${actualDepth}x${cutDepth} at X=${centerX.toFixed(1)}, Z=${centerZ.toFixed(1)}`);
      }
    } else {
      // Pour l'âme des profils I, utiliser ExtrudeGeometry
      const extrudeSettings = {
        depth: actualDepth,
        bevelEnabled: false,
        bevelThickness: 0,
        bevelSize: 0,
        bevelSegments: 1
      };
      
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }
    
    // Vérifier que la géométrie a été créée
    if (!geometry) {
      console.error(`    ❌ Geometry was not created! Creating fallback geometry`);
      geometry = new THREE.BoxGeometry(100, 50, 10);
    }
    
    geometry.computeBoundingBox();
    
    // Vérifier que la géométrie est valide
    if (!geometry.boundingBox || 
        !isFinite(geometry.boundingBox.min.x) || 
        !isFinite(geometry.boundingBox.max.x)) {
      console.error(`    ❌ Invalid geometry bounding box after creation!`);
      console.error(`    BoundingBox:`, geometry.boundingBox);
      // Créer une géométrie simple de fallback
      geometry = new THREE.BoxGeometry(100, 50, 10);
      geometry.computeBoundingBox();
    }
    
    // Orienter la géométrie selon la face AVANT de la translater
    // const rotationMatrix = new THREE.Matrix4();
    
    // Pour les tubes, traiter différemment selon la face
    if (isTube) {
      // Les tubes ont des faces v, o, u, h
      // v = front, o = top, u = bottom, h = back
      const faceStr = face as string;
      switch (faceStr) {
        case ProfileFace.WEB: // face 'v' - avant du tube
        case 'v':
        case 'front':
          // Rotation pour face avant - découpe traverse selon Z
          geometry.rotateY(Math.PI / 2);
          geometry.translate((dims.width || 50) / 2, 0, 0);
          console.log(`    Tube cut on front face (v)`);
          break;
          
        case ProfileFace.TOP_FLANGE: // face 'o' - dessus du tube
        case 'o':
        case 'top':
          // Rotation pour face supérieure - découpe traverse selon Y
          geometry.rotateX(Math.PI / 2);
          geometry.translate(0, (dims.height || 50) / 2, 0);
          console.log(`    Tube cut on top face (o)`);
          break;
          
        case ProfileFace.BOTTOM_FLANGE: // face 'u' - dessous du tube
        case 'u':
        case 'bottom':
          // Rotation pour face inférieure - découpe traverse selon Y
          geometry.rotateX(-Math.PI / 2);
          geometry.translate(0, -(dims.height || 50) / 2, 0);
          console.log(`    Tube cut on bottom face (u)`);
          break;
          
        case 'h': // face 'h' - arrière du tube
        case 'back':
          // Rotation pour face arrière - découpe traverse selon Z
          geometry.rotateY(-Math.PI / 2);
          geometry.translate(-(dims.width || 50) / 2, 0, 0);
          console.log(`    Tube cut on back face (h)`);
          break;
          
        default:
          console.warn(`    Unknown tube face: ${face}`);
          break;
      }
    } else {
      // Profils I standards
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
        const cutMinY = geometry.boundingBox?.min.y ?? 0;
        const cutMaxY = geometry.boundingBox?.max.y ?? 0;
        
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
    const dims = element.dimensions || {};
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
  private determineCutType(bounds: { minX: number; maxX: number; minY: number; maxY: number }, dimension: number): string {
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
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
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
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
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
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    length: number,
    width: number,
    _height: number,
    _face?: ProfileFace | undefined
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
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
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
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
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
   * Détecte si le contour représente une coupe d'angle complète (angle cut)
   * Différent d'un bevel cut qui est un chanfrein pour soudure
   */
  private isAngleCut(contourPoints: Array<[number, number]>, element: PivotElement): boolean {
    if (contourPoints.length < 4) {
      return false;
    }
    
    // Pour les tubes, vérifier si on a une coupe diagonale aux extrémités
    const isTube = element.type === 'TUBE_RECT' || element.type === 'TUBE_ROUND' ||
                   element.metadata?.profileType === 'TUBE_RECT' || 
                   element.metadata?.profileType === 'TUBE_ROUND' ||
                   element.metadata?.profileName?.includes('HSS') ||
                   element.metadata?.profileName?.includes('RHS') ||
                   element.metadata?.profileName?.includes('SHS');
    
    if (!isTube) {
      return false;
    }
    
    // Vérifier si la coupe est aux extrémités
    const bounds = this.getContourBounds(contourPoints);
    const profileLength = element.dimensions?.length || 1000;
    
    const isAtStart = bounds.minX < 100;
    const isAtEnd = bounds.maxX > profileLength - 100;
    
    if (!isAtStart && !isAtEnd) {
      console.log(`    ⚠️ Not an angle cut - not at extremities (X: ${bounds.minX.toFixed(1)}-${bounds.maxX.toFixed(1)})`);
      return false;
    }
    
    // Vérifier si les points forment une diagonale significative
    // let hasDiagonalSegment = false; // Variable was unused and removed
    let maxDiagonalLength = 0;
    
    for (let i = 1; i < contourPoints.length; i++) {
      const dx = Math.abs(contourPoints[i][0] - contourPoints[i-1][0]);
      const dy = Math.abs(contourPoints[i][1] - contourPoints[i-1][1]);
      
      // Si on a un segment avec des changements significatifs en X et Y
      if (dx > 10 && dy > 10) {
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        if (segmentLength > maxDiagonalLength) {
          maxDiagonalLength = segmentLength;
          // hasDiagonalSegment = true; // Variable was unused
        }
        
        // Vérifier l'angle du segment (entre 15° et 75°)
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        console.log(`    📐 Diagonal segment: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, angle=${angle.toFixed(1)}°`);
        
        // Un angle cut a typiquement un angle entre 15° et 75°
        if (Math.abs(angle) > 15 && Math.abs(angle) < 75) {
          console.log(`    ✅ Valid angle cut detected at ${isAtStart ? 'start' : 'end'} with angle ${angle.toFixed(1)}°`);
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Détecte si le contour représente un bevel cut (chanfrein pour soudure)
   * Typiquement sur une platine ou l'épaisseur d'une face
   */
  private isBevelCut(_contourPoints: Array<[number, number]>): boolean {
    // Pour l'instant, retourner false car on gère les angle cuts
    // Les vrais bevel cuts seront implémentés plus tard pour les platines
    return false;
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
    const profileLength = element.dimensions?.length || 2260;
    
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
      const dims = element.dimensions || {};
      const bounds = this.getContourBounds(contourPoints);
      
      console.log(`  🔧 Processing partial notches with extension:`);
      console.log(`    Contour bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}] Y[${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`);
      console.log(`    Profile length: ${dims.length}mm, Extension: ${(bounds.maxX - dims.length).toFixed(1)}mm`);
      
      // Pour les contours rectangulaires (5 points), traiter comme une découpe simple
      if (contourPoints.length === 5) {
        console.log(`  📐 Rectangular contour detected - processing as simple cut`);
        // Créer une découpe simple pour les contours rectangulaires des ailes
        const depth = feature.parameters.depth || dims.flangeThickness || 10;
        const cutGeometry = this.createCutGeometry(contourPoints, depth, face || ProfileFace.WEB, element);
        
        // Vérifier que la géométrie de découpe est valide
        if (!cutGeometry || !cutGeometry.attributes || !cutGeometry.attributes.position) {
          console.error('  ❌ Invalid cut geometry created - returning original geometry');
          return {
            success: false,
            geometry: geometry,
            error: 'Failed to create valid cut geometry'
          };
        }
        
        try {
          // Appliquer la découpe CSG
          const brush1 = new Brush(geometry);
          const brush2 = new Brush(cutGeometry);
          brush1.updateMatrixWorld();
          brush2.updateMatrixWorld();
          
          const resultBrush = this.evaluator.evaluate(brush1, brush2, SUBTRACTION);
          const resultGeometry = resultBrush.geometry;
          
          if (!resultGeometry || !resultGeometry.attributes.position) {
            console.error('  ❌ CSG operation failed - returning original geometry');
            return {
              success: false,
              geometry: geometry,
              error: 'CSG subtraction failed'
            };
          }
          
          // Ajouter les informations de découpe à userData pour les outlines
          if (!resultGeometry.userData) {
            resultGeometry.userData = {};
          }
          if (!resultGeometry.userData.cuts) {
            resultGeometry.userData.cuts = [];
          }
          
          // Ajouter les informations du contour rectangulaire
          const contourBounds = this.getContourBounds(contourPoints);
          const rectElementHeight = dims.height || 200;  // Hauteur générique
          const rectElementLength = dims.length || 1000;  // Longueur générique
          
          const cutInfo = {
            id: feature.id || `cut_${Date.now()}`,
            parentFeatureId: feature.id,
            type: 'cut',
            face: face,
            bounds: {
              minX: contourBounds.minX - rectElementLength / 2,
              maxX: contourBounds.maxX - rectElementLength / 2,
              minY: contourBounds.minY - rectElementHeight / 2,
              maxY: contourBounds.maxY - rectElementHeight / 2,
              minZ: -depth / 2,
              maxZ: depth / 2
            }
          };
          
          resultGeometry.userData.cuts.push(cutInfo);
          console.log(`  📐 Added rectangular cut info to userData:`, cutInfo);
          
          return {
            success: true,
            geometry: resultGeometry
          };
        } catch (csgError) {
          console.error('  ❌ CSG operation error:', csgError);
          return {
            success: false,
            geometry: geometry,
            error: `CSG error: ${csgError instanceof Error ? csgError.message : 'Unknown error'}`
          };
        }
      }
      
      // Analyser les points pour identifier les encoches
      // Pour M1002: les encoches sont définies par les changements de Y aux extrémités
      const notches = this.extractNotchesFromContour(contourPoints, dims);
      
      // Si pas d'encoches trouvées, retourner la géométrie originale
      if (notches.length === 0) {
        console.log(`  ⚠️ No notches found in contour - returning original geometry`);
        return {
          success: true,
          geometry: geometry
        };
      }
      
      // Créer les géométries de découpe pour chaque encoche
      const cutGeometries: THREE.BufferGeometry[] = [];
      
      // Récupérer l'épaisseur de l'aile pour dimensionner les encoches
      // const flangeThickness = element.dimensions?.flangeThickness || element.metadata?.flangeThickness || 7.6; // Variable was unused
      
      // Calculer les dimensions une fois pour réutilisation
      const profHeight = dims.height || 200;  // Hauteur générique pour tous types de profils
      // let globalCenterY = 0; // Variable was unused and removed
      if (face === ProfileFace.TOP_FLANGE && dims.height) {
        // const topFlangeBottom = (dims.height / 2) - flangeThickness; // Variable was unused
        // globalCenterY = topFlangeBottom + (flangeThickness / 2); // Variable was unused
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
        const centerY = (notch.yStart + notch.yEnd) / 2 - profHeight / 2;
        
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
      
      // Vérifier que nous avons des géométries valides avant de fusionner
      if (cutGeometries.length === 0) {
        console.log(`  ⚠️ No cut geometries created - returning original geometry`);
        return {
          success: true,
          geometry: geometry
        };
      }
      
      // Filtrer les géométries invalides
      const validCutGeometries = cutGeometries.filter(geom => {
        if (!geom || !geom.attributes || !geom.attributes.position) {
          console.warn(`  ⚠️ Invalid geometry detected - skipping`);
          return false;
        }
        return true;
      });
      
      if (validCutGeometries.length === 0) {
        console.log(`  ⚠️ No valid cut geometries after filtering - returning original geometry`);
        return {
          success: true,
          geometry: geometry
        };
      }
      
      // Fusionner toutes les géométries de découpe
      let mergedCutGeometry: THREE.BufferGeometry | undefined;
      if (validCutGeometries.length > 1) {
        try {
          mergedCutGeometry = BufferGeometryUtils.mergeGeometries(validCutGeometries, false);
        } catch (mergeError) {
          console.error(`  ❌ Failed to merge cut geometries:`, mergeError);
          // Essayer d'utiliser la première géométrie valide
          mergedCutGeometry = validCutGeometries[0];
        }
      } else if (validCutGeometries.length === 1) {
        mergedCutGeometry = validCutGeometries[0];
      }
      
      // Si pas de géométrie de découpe, retourner la géométrie originale
      if (!mergedCutGeometry) {
        console.log(`  ⚠️ No merged cut geometry created for partial notches`);
        return {
          success: true,
          geometry: geometry
        };
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
      
      let resultGeometry: THREE.BufferGeometry;
      
      try {
        const originalBrush = new Brush(geometry);
        originalBrush.updateMatrixWorld();
        const cutBrush = new Brush(mergedCutGeometry);
        cutBrush.updateMatrixWorld();
        
        console.log(`    Original geometry vertices: ${geometry.attributes?.position?.count || 0}`);
        console.log(`    Cut geometry vertices: ${mergedCutGeometry.attributes?.position?.count || 0}`);
        
        const resultBrush = this.evaluator.evaluate(originalBrush, cutBrush, SUBTRACTION);
        resultGeometry = resultBrush.geometry;
      } catch (csgError) {
        console.error(`  ❌ CSG operation failed:`, csgError);
        // En cas d'erreur CSG, retourner la géométrie originale
        return {
          success: false,
          geometry: geometry,
          error: `CSG operation failed: ${csgError instanceof Error ? csgError.message : 'Unknown error'}`
        };
      }
      
      console.log(`    Result geometry vertices: ${resultGeometry.attributes?.position?.count || 0}`);
      console.log(`    Vertices change: ${(resultGeometry.attributes?.position?.count || 0) - (geometry.attributes?.position?.count || 0)}`);
      
      // Ajouter les informations de découpe à userData pour les outlines
      if (!resultGeometry.userData) {
        resultGeometry.userData = {};
      }
      if (!resultGeometry.userData.cuts) {
        resultGeometry.userData.cuts = [];
      }
      
      // Récupérer les dimensions du profil pour le calcul des positions
      // Ces valeurs par défaut sont génériques et seront adaptées selon le profil
      const elementHeight = dims.height || 200;  // Hauteur générique du profil
      const elementWidth = dims.width || 100;    // Largeur générique du profil
      
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
            minX: -(elementWidth + 20) / 2,           // Encoche traverse toute la largeur avec marge
            maxX: (elementWidth + 20) / 2,
            minY: notch.yStart - elementHeight / 2,   // Position verticale de l'encoche
            maxY: notch.yEnd - elementHeight / 2,
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
    _dimensions: Record<string, unknown>
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
    const extensionPoints = contourPoints.filter(([x, _y]) => Math.abs(x - extensionX) < 0.1);
    const extensionYValues = extensionPoints.map(([_x, y]) => y).sort((a, b) => a - b);
    
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
  
  /**
   * Essaie de traiter la feature avec les nouvelles stratégies
   * Cette méthode permet d'introduire les stratégies progressivement
   * sans casser le code M1002 existant qui fonctionne
   */
  private tryProcessWithStrategies(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): { success: boolean; result?: ProcessResult; strategyUsed?: string; error?: string } {
    try {
      // Trouver la stratégie appropriée
      const strategy = this.strategies.find(s => s.canHandle(feature));
      
      if (!strategy) {
        return {
          success: false,
          error: 'No suitable strategy found for this cut type'
        };
      }
      
      console.log(`    🔧 Using strategy: ${strategy.name}`);
      
      // Valider avec la stratégie
      const validationErrors = strategy.validate(feature, element);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Strategy validation failed: ${validationErrors.join(', ')}`
        };
      }
      
      // Créer la géométrie de découpe avec la stratégie
      const cutGeometry = strategy.createCutGeometry(feature, element);
      if (!cutGeometry || !cutGeometry.attributes || !cutGeometry.attributes.position) {
        return {
          success: false,
          error: 'Strategy failed to create valid cut geometry'
        };
      }
      
      // Effectuer la soustraction CSG
      cutGeometry.computeBoundingBox();
      geometry.computeBoundingBox();
      
      console.log(`    🔧 Applying CSG SUBTRACTION with strategy geometry`);
      console.log(`      Cut geometry bounds:`, cutGeometry.boundingBox);
      console.log(`      Original geometry vertex count:`, geometry.attributes.position?.count || 0);
      
      // Créer les brushes pour CSG
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const cutBrush = new Brush(cutGeometry);
      cutBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const resultBrush = this.evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
      const resultGeometry = resultBrush.geometry.clone();
      
      console.log(`      ✅ CSG operation completed successfully`);
      console.log(`      Result geometry vertex count:`, resultGeometry.attributes.position?.count || 0);
      
      // Nettoyer
      resultBrush.geometry.dispose();
      cutGeometry.dispose();
      
      // Calculer les normales et optimiser
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Transférer les userData
      Object.assign(resultGeometry.userData, geometry.userData);
      
      // Ajouter les informations de découpe pour les outlines
      this.addCutInfoToUserData(resultGeometry, feature, element, strategy);
      
      return {
        success: true,
        result: {
          success: true,
          geometry: resultGeometry
        },
        strategyUsed: strategy.name
      };
      
    } catch (error) {
      console.error('    ❌ Strategy processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown strategy error'
      };
    }
  }
  
  /**
   * Ajoute les informations de découpe aux userData pour les outlines
   */
  private addCutInfoToUserData(
    resultGeometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement,
    strategy: ICutStrategy
  ): void {
    if (!resultGeometry.userData) {
      resultGeometry.userData = {};
    }
    if (!resultGeometry.userData.cuts) {
      resultGeometry.userData.cuts = [];
    }
    
    const params = feature.parameters || {};
    const rawPoints = params.points || params.contourPoints || [];
    const points = this.normalizePoints(rawPoints);
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const depth = params.depth || dims.flangeThickness || 10;
    
    const cutInfo = {
      id: feature.id || `cut_${Date.now()}`,
      type: 'cut',
      face: feature.face,
      strategy: strategy.name,
      bounds: {
        minX: bounds.minX - (dims.length || 1000) / 2,
        maxX: bounds.maxX - (dims.length || 1000) / 2,
        minY: bounds.minY - (dims.height || 300) / 2,
        maxY: bounds.maxY - (dims.height || 300) / 2,
        minZ: -depth / 2,
        maxZ: depth / 2
      },
      contourPoints: points,
      depth
    };
    
    resultGeometry.userData.cuts.push(cutInfo);
    console.log(`      📐 Added cut info to userData (strategy: ${strategy.name}):`, cutInfo);
  }

  /**
   * Détecte si un contour sur une semelle représente la forme finale
   * (et non une coupe à soustraire)
   */
  private isFlangeFinalContour(
    contourPoints: Array<[number, number]>,
    face: ProfileFace,
    element: PivotElement
  ): boolean {
    // Seulement pour les semelles
    if (face !== ProfileFace.TOP_FLANGE && face !== ProfileFace.BOTTOM_FLANGE) {
      return false;
    }
    
    // Rectangle de 5 points
    if (contourPoints.length !== 5) {
      return false;
    }
    
    const bounds = this.getContourBounds(contourPoints);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    console.log(`    🔍 Checking flange contour: face=${face}, points=${contourPoints.length}`);
    console.log(`    🔍 Bounds: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}], profileLength=${profileLength}`);
    
    // Si le contour commence à 0 et se termine avant la fin du profil
    // C'est une redéfinition de la forme finale (cas M1002)
    if (bounds.minX < 1 && bounds.maxX < profileLength - 10 && bounds.maxX > profileLength * 0.8) {
      console.log(`    📐 Flange contour detected: X[0, ${bounds.maxX.toFixed(1)}] - Final shape definition`);
      return true;
    }
    
    return false;
  }

  /**
   * Traite un contour de semelle comme une coupe d'extrémité
   * (enlève la partie APRÈS le contour, pas avant)
   */
  private processFlangeContourCut(
    geometry: THREE.BufferGeometry,
    contourPoints: Array<[number, number]>,
    face: ProfileFace,
    element: PivotElement,
    feature: Feature
  ): ProcessResult {
    try {
      const bounds = this.getContourBounds(contourPoints);
      const dims = element.dimensions || {};
      const profileLength = dims.length || 1000;
      const profileWidth = dims.width || 146;
      const depth = dims.flangeThickness || 10;
      
      console.log(`  📐 Processing flange contour as end cut`);
      console.log(`    Original contour: X[${bounds.minX.toFixed(1)}, ${bounds.maxX.toFixed(1)}]`);
      console.log(`    Will remove: X[${bounds.maxX.toFixed(1)}, ${profileLength.toFixed(1)}]`);
      
      // Créer un rectangle de coupe pour enlever la partie APRÈS le contour
      const cutPoints: Array<[number, number]> = [
        [bounds.maxX, 0],           // Début de la coupe
        [profileLength, 0],          // Fin du profil
        [profileLength, profileWidth], // Largeur complète
        [bounds.maxX, profileWidth],   // Retour
        [bounds.maxX, 0]             // Fermeture
      ];
      
      // Utiliser la méthode standard avec les nouveaux points
      const cutGeometry = this.createCutGeometry(cutPoints, depth * 2, face, element);
      
      // Effectuer l'opération CSG
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      const cutBrush = new Brush(cutGeometry);
      cutBrush.updateMatrixWorld();
      
      const resultBrush = this.evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
      const resultGeometry = resultBrush.geometry.clone();
      
      // Nettoyer
      resultBrush.geometry.dispose();
      cutGeometry.dispose();
      
      // Optimiser
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Ajouter les infos de découpe
      if (!resultGeometry.userData) resultGeometry.userData = {};
      if (!resultGeometry.userData.cuts) resultGeometry.userData.cuts = [];
      
      resultGeometry.userData.cuts.push({
        id: feature.id || `flange_cut_${Date.now()}`,
        type: 'flange_contour',
        face: face,
        originalContour: contourPoints,
        actualCut: cutPoints,
        bounds: {
          minX: bounds.maxX - profileLength / 2,
          maxX: profileLength / 2,
          minY: -profileWidth / 2,
          maxY: profileWidth / 2,
          minZ: -depth,
          maxZ: depth
        }
      });
      
      console.log(`  ✅ Flange contour cut applied successfully`);
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`  ❌ Flange contour cut failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Traite les coupes d'extrémité pour les tubes HSS
   * Ces coupes sont créées à partir de l'inversion des contours AK
   */
  private processEndCut(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessResult {
    console.log(`  🔧 Processing END_CUT for tube ${element.id}`);
    console.log(`  📐 Feature parameters:`, {
      angle: feature.parameters.angle,
      length: feature.parameters.length,
      position: feature.position,
      cutPosition: (feature.parameters as Record<string, unknown>).cutPosition,
      hasContourPoints: !!feature.parameters.contourPoints
    });
    
    // Log détaillé de la position
    console.log(`  📍 Feature position details:`);
    console.log(`     - position.x = ${feature.position.x}`);
    console.log(`     - position.y = ${feature.position.y}`);
    console.log(`     - position.z = ${feature.position.z}`);
    console.log(`     - cutPosition param = ${(feature.parameters as Record<string, unknown>).cutPosition}`);
    
    try {
      const angle = feature.parameters.angle || 90;
      const position = feature.position;
      const length = feature.parameters.length || 50; // Réduire la longueur par défaut
      // const contourPoints = feature.parameters.contourPoints || []; // Variable was unused
      
      // Déterminer si c'est au début ou à la fin
      // Utiliser le paramètre cutPosition s'il est disponible, sinon se baser sur la position X
      const profileLength = element.dimensions?.length || 0;
      const cutPositionParam = (feature.parameters as Record<string, unknown>).cutPosition;
      const isAtStart = cutPositionParam === 'start' ? true : 
                        cutPositionParam === 'end' ? false :
                        position.z < profileLength / 2;  // Utiliser Z car le tube est sur l'axe Z
      
      console.log(`    Position: ${isAtStart ? 'START' : 'END'} (z=${position.z.toFixed(1)})`);
      console.log(`    Cut angle: ${angle}°`);
      console.log(`    Cut length: ${length.toFixed(1)} mm`);
      
      // Pour les tubes HSS, créer des chanfreins aux coins plutôt que des coupes complètes
      if (element.metadata?.profileType === 'TUBE_RECT' || element.metadata?.profileName?.includes('HSS')) {
        return this.applyChamferEndCut(geometry, feature, element, isAtStart);
      }
      
      // Pour les tubes, créer une coupe simple à l'extrémité
      // En utilisant CSG pour couper la géométrie
      if (!geometry.attributes.position) {
        return {
          success: false,
          error: 'Geometry has no position attribute'
        };
      }
      
      // Créer une boîte de coupe positionnée à l'extrémité
      const cutBoxGeometry = new THREE.BoxGeometry(
        length * 2, // Largeur de la boîte (dans la direction X)
        (element.dimensions?.height || 50) * 2, // Hauteur
        (element.dimensions?.width || 50) * 2   // Profondeur
      );
      
      // Positionner la boîte de coupe
      const cutBoxPosition = new THREE.Vector3();
      if (isAtStart) {
        cutBoxPosition.x = -length; // Positionner avant le début
      } else {
        cutBoxPosition.x = profileLength + length; // Positionner après la fin
      }
      
      // Si c'est une coupe d'angle, faire pivoter la boîte
      if (angle !== 90) {
        cutBoxGeometry.rotateZ(THREE.MathUtils.degToRad(angle - 90));
      }
      
      cutBoxGeometry.translate(cutBoxPosition.x, cutBoxPosition.y, cutBoxPosition.z);
      
      // Appliquer la coupe CSG
      try {
        // Import Brush using ES6 import at top of file instead of require
        // const Brush = (window as any).Brush || require('three-bvh-csg').Brush;
        // Import SUBTRACTION using ES6 import at top of file instead of require
        // const SUBTRACTION = (window as any).SUBTRACTION || require('three-bvh-csg').SUBTRACTION;
        // Import Evaluator using ES6 import at top of file instead of require
        // const Evaluator = (window as any).Evaluator || require('three-bvh-csg').Evaluator;
        
        const baseBrush = new Brush(geometry);
        const cutBrush = new Brush(cutBoxGeometry);
        
        const evaluator = new Evaluator();
        const result = evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
        
        if (result && result.geometry) {
          // Remplacer la géométrie par le résultat
          geometry.copy(result.geometry);
          console.log(`    ✅ End cut applied successfully`);
          return { success: true };
        }
      } catch (csgError) {
        console.error(`    ❌ CSG operation failed:`, csgError);
        // Fallback: modifier directement les vertices
        this.applySimpleEndCut(geometry, isAtStart, length, element);
        return { success: true };
      }
      
      return { success: true };
      
    } catch (error) {
      console.error(`  ❌ Failed to process end cut:`, error);
      return {
        success: false,
        error: `End cut processing failed: ${error}`
      };
    }
  }
  
  /**
   * Applique une coupe d'extrémité simple en modifiant les vertices
   * ATTENTION: Cette méthode est destructive et ne devrait être utilisée qu'en dernier recours
   */
  private applySimpleEndCut(
    geometry: THREE.BufferGeometry,
    isAtStart: boolean,
    cutLength: number,
    element: PivotElement
  ): void {
    console.warn(`    ⚠️ Using destructive simple end cut - should be avoided`);
    const positions = geometry.attributes.position;
    const profileLength = element.dimensions?.length || 0;
    
    // Limiter la longueur de coupe pour éviter de détruire le profil
    const maxCutLength = Math.min(cutLength, profileLength * 0.1); // Max 10% de la longueur
    
    // Parcourir tous les vertices et couper ceux qui sont dans la zone de coupe
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      
      if (isAtStart && x < maxCutLength) {
        // Ramener les points au début de la coupe
        positions.setX(i, maxCutLength);
      } else if (!isAtStart && x > profileLength - maxCutLength) {
        // Ramener les points à la fin de la coupe
        positions.setX(i, profileLength - maxCutLength);
      }
    }
    
    positions.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    console.log(`    ✅ Simple end cut applied (limited to ${maxCutLength.toFixed(1)}mm)`);
  }
  
  /**
   * Applique une coupe d'extrémité sur un tube HSS
   * Utilise CSG pour créer des coupes droites ou angulaires aux extrémités
   */
  private applyChamferEndCut(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement,
    isAtStart: boolean
  ): ProcessResult {
    // Constantes pour les marges de sécurité
    // const CUT_MARGIN = 100; // Variable was unused
    const BOX_SIZE_MULTIPLIER = 3; // Multiplicateur pour la taille de la boîte de coupe
    
    try {
      const profileLength = element.dimensions?.length || 0;
      const width = element.dimensions?.width || 50;
      const height = element.dimensions?.height || 50;
      const cutDepth = (feature.parameters as Record<string, unknown>).chamferLength || feature.parameters.length || 30;
      const angle = feature.parameters.angle || 90;
      
      // Calculer la bounding box avant modification
      geometry.computeBoundingBox();
      
      // IMPORTANT: Créer une SEULE boîte de coupe qui traverse TOUTE l'épaisseur du tube
      // Dimensions de la boîte de coupe : plus grande que le profil pour garantir une coupe complète
      // IMPORTANT: Pour un tube sur l'axe Z, la boîte doit couper dans la direction Z
      
      // Calculer les dimensions de la boîte selon la position
      let boxDepth;
      let boxCenter;
      
      // const featureZ = feature.position.z; // Variable was unused
      
      if (isAtStart) {
        // Coupe au début : la boîte doit couper depuis 0
        // La boîte doit être centrée avant le point 0 pour couper correctement
        boxDepth = width * 4; // Boîte suffisamment grande pour coupe angulaire
        boxCenter = -boxDepth / 2; // Centre de la boîte avant le début (moitié de la boîte est avant 0)
        console.log(`    📦 START cut box: center=${boxCenter.toFixed(1)}, depth=${boxDepth}`);
      } else {
        // Coupe à la fin : la boîte doit couper depuis profileLength
        boxDepth = width * 4; // Boîte suffisamment grande pour coupe angulaire
        boxCenter = profileLength + boxDepth / 2; // Centre de la boîte après la fin
        console.log(`    📦 END cut box: center=${boxCenter.toFixed(1)}, depth=${boxDepth}, profileLength=${profileLength}`);
      }
      
      // Créer la boîte de coupe
      let cutGeometry;
      
      // Si l'angle n'est pas droit (90°), appliquer une rotation
      if (Math.abs(angle - 90) > 0.1) {  // Si l'angle n'est pas 90° (avec tolérance)
        // Créer la boîte centrée à l'origine
        cutGeometry = new THREE.BoxGeometry(
          width * BOX_SIZE_MULTIPLIER,
          height * BOX_SIZE_MULTIPLIER,
          boxDepth
        );
        
        // Appliquer la rotation AVANT la translation
        // Pour un tube sur l'axe Z, une coupe angulaire tourne autour de Y
        // L'angle DSTV est depuis la verticale, donc on doit le convertir pour Three.js
        // Pour une coupe qui penche vers l'avant (angle positif), on veut une rotation positive
        let rotationAngle;
        if (isAtStart) {
          // Au début : angle depuis la verticale
          // Pour h5004: 29.2° depuis verticale = coupe qui penche vers l'avant
          rotationAngle = -angle * Math.PI / 180;  // Négatif pour pencher vers l'avant
        } else {
          // À la fin : angle inversé (miroir)
          // Pour h5004: 60.8° depuis verticale = coupe qui penche vers l'arrière
          rotationAngle = -angle * Math.PI / 180;  // Négatif comme le début (miroir)
        }
        cutGeometry.rotateY(rotationAngle);
        
        console.log(`    📐 END_CUT rotation:`);
        console.log(`       - position: ${isAtStart ? 'START' : 'END'}`);
        console.log(`       - input angle: ${angle}° (from vertical)`);
        console.log(`       - rotation applied: ${rotationAngle} rad = ${(rotationAngle * 180 / Math.PI).toFixed(1)}°`);
        console.log(`       - sign: ${isAtStart ? 'negative (forward tilt)' : 'positive (backward tilt)'}`);
        
        // Puis translater à la position finale
        cutGeometry.translate(0, 0, boxCenter);
      } else {
        // Pas de rotation, créer directement à la bonne position
        cutGeometry = new THREE.BoxGeometry(
          width * BOX_SIZE_MULTIPLIER,
          height * BOX_SIZE_MULTIPLIER,
          boxDepth
        );
        cutGeometry.translate(0, 0, boxCenter);
      }
      
      // Appliquer la soustraction CSG
      try {
        const originalBrush = new Brush(geometry);
        originalBrush.updateMatrixWorld();
        const cutBrush = new Brush(cutGeometry);
        cutBrush.updateMatrixWorld();
        
        const resultBrush = this.evaluator.evaluate(originalBrush, cutBrush, SUBTRACTION);
        const resultGeometry = resultBrush.geometry;
        
        // Calculer la bounding box après la coupe
        resultGeometry.computeBoundingBox();
        
        // Transférer d'abord les userData existants
        resultGeometry.userData = { ...geometry.userData };
        
        // Ensuite ajouter les infos de découpe pour les outlines (inlines)
        if (!resultGeometry.userData.cuts) resultGeometry.userData.cuts = [];
        
        // La position de la coupe sur l'axe Z
        const cutPosition = feature.position.z;
        
        // Calculer les bounds de la coupe
        // Pour les END_CUT, utiliser la position exacte de la feature
        const cutBounds = {
          minX: cutPosition,  // Position exacte de la coupe sur Z
          maxX: cutPosition,  // Même position (c'est un plan, pas un volume)
          minY: -height / 2,
          maxY: height / 2,
          minZ: -width / 2,
          maxZ: width / 2
        };
        
        const cutInfo = {
          id: feature.id || `end_cut_${Date.now()}`,
          type: 'END_CUT',
          face: 'end',
          position: isAtStart ? 'start' : 'end',
          angle: angle,
          bounds: cutBounds,
          depth: cutDepth
        };
        
        resultGeometry.userData.cuts.push(cutInfo);
        console.log(`    📐 Added END_CUT info to userData:`, cutInfo);
        console.log(`    📐 Total cuts in userData: ${resultGeometry.userData.cuts.length}`);
        
        // IMPORTANT: Retourner la nouvelle géométrie au lieu de remplacer l'ancienne
        // Cela préserve les trous et autres features déjà appliqués
        return { 
          success: true,
          geometry: resultGeometry 
        };
        
      } catch (csgError) {
        console.error(`    ❌ CSG straight cut operation failed:`, csgError);
        return {
          success: false,
          error: `Straight cut CSG operation failed: ${csgError}`
        };
      } finally {
        // Nettoyer la géométrie temporaire
        cutGeometry.dispose();
      }
      
    } catch (error) {
      console.error(`  ❌ Failed to apply chamfer cut:`, error);
      return {
        success: false,
        error: `Chamfer cut failed: ${error}`
      };
    }
  }
  
  /**
   * PHASE 2 - Détermine si un contour de tube doit être simplifié
   * Critères intelligents basés sur l'analyse de l'expert
   */
  private shouldSimplifyTubeGeometry(contourPoints: Array<[number, number]>, element: PivotElement): boolean {
    // Seuil de base : plus de 20 points
    if (contourPoints.length <= 20) {
      return false;
    }
    
    const profileType = element.metadata?.profileType;
    const isHSS = profileType === 'TUBE_RECT' || element.metadata?.profileName?.includes('HSS');
    
    // Appliquer seulement aux tubes HSS/rectangulaires
    if (!isHSS) {
      return false;
    }
    
    // Analyse de complexité - si trop de changements de direction
    const complexity = this.analyzeContourComplexity(contourPoints);
    
    // Simplifier si:
    // 1. Plus de 30 points OU
    // 2. Plus de 20 points avec haute complexité OU  
    // 3. Plus de 15 changements de direction
    const shouldSimplify = contourPoints.length > 30 ||
                          (contourPoints.length > 20 && complexity.aspectRatio > 10) ||
                          complexity.directionChanges > 15;
                          
    if (shouldSimplify) {
      console.log(`    ⚠️ Tube simplification triggered:`);
      console.log(`      Points: ${contourPoints.length} (threshold: 20+)`);
      console.log(`      Direction changes: ${complexity.directionChanges} (threshold: 15)`);
      console.log(`      Aspect ratio: ${complexity.aspectRatio.toFixed(2)} (threshold: 10)`);
    }
    
    return shouldSimplify;
  }
  
  /**
   * PHASE 2 - Crée une géométrie simplifiée intelligente pour tubes
   * Préserve les caractéristiques importantes (angles, chanfreins)
   */
  private createSimplifiedTubeGeometry(
    contourPoints: Array<[number, number]>, 
    element: PivotElement, 
    _face?: ProfileFace
  ): THREE.BufferGeometry {
    const bounds = this.getContourBounds(contourPoints);
    const dims = element.dimensions || {};
    const length = dims.length || 1000;
    const height = dims.height || 50;
    const wallThickness = dims.thickness || 4.8;
    
    // Analyser le type de coupe pour choisir la simplification appropriée
    const cutType = this.detectTubeCutType(contourPoints, element);
    
    let geometry: THREE.BufferGeometry;
    
    switch (cutType.type) {
      case 'ANGLE_CUT':
        // Coupe d'angle - utiliser un prisme trapézoïdal
        geometry = this.createAngleCutGeometry(bounds, wallThickness, cutType.angle);
        console.log(`    🔶 Created angle cut geometry: ${cutType.angle.toFixed(1)}°`);
        break;
        
      case 'BEVEL_CUT':
        // Chanfrein - utiliser une géométrie de chanfrein
        geometry = this.createBevelCutGeometry(bounds, wallThickness, cutType.angle);
        console.log(`    🔥 Created bevel cut geometry: ${cutType.angle.toFixed(1)}°`);
        break;
        
      case 'COMPLEX_NOTCH':
        // Encoche complexe - utiliser géométrie multi-segments
        geometry = this.createComplexNotchGeometry(contourPoints, wallThickness);
        console.log(`    🔍 Created complex notch geometry`);
        break;
        
      case 'STRAIGHT_CUT':
      default: {
        // Coupe droite simple - boîte
        const boxWidth = bounds.maxX - bounds.minX;
        const boxHeight = bounds.maxY - bounds.minY;
        geometry = new THREE.BoxGeometry(boxWidth, boxHeight, wallThickness * 1.5);
        console.log(`    🟦 Created simple box geometry: ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);
        break;
      }
    }
    
    // Positionner géométrie
    const centerX = (bounds.minX + bounds.maxX) / 2 - length / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2 - height / 2;
    geometry.translate(centerX, centerY, 0);
    
    return geometry;
  }
  
  /**
   * PHASE 2 - Analyse la complexité d'un contour (from CutLogger pattern)
   */
  private analyzeContourComplexity(points: Array<[number, number]>): {
    directionChanges: number;
    aspectRatio: number;
    maxSegmentLength: number;
    minSegmentLength: number;
  } {
    let directionChanges = 0;
    let maxSegmentLength = 0;
    let minSegmentLength = Infinity;
    let prevDirection: number | null = null;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const length = Math.sqrt(dx * dx + dy * dy);
      const direction = Math.atan2(dy, dx);
      
      maxSegmentLength = Math.max(maxSegmentLength, length);
      minSegmentLength = Math.min(minSegmentLength, length);
      
      if (prevDirection !== null) {
        const angleDiff = Math.abs(direction - prevDirection);
        if (angleDiff > Math.PI / 4) { // 45° de changement
          directionChanges++;
        }
      }
      prevDirection = direction;
    }
    
    // Calculer aspect ratio
    const bounds = this.getContourBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const aspectRatio = width > 0 && height > 0 ? Math.max(width, height) / Math.min(width, height) : 1;
    
    return {
      directionChanges,
      aspectRatio,
      maxSegmentLength,
      minSegmentLength: minSegmentLength === Infinity ? 0 : minSegmentLength
    };
  }
  
  /**
   * PHASE 2 - Détection du type de coupe pour tubes
   */
  private detectTubeCutType(points: Array<[number, number]>, element: PivotElement): {
    type: 'ANGLE_CUT' | 'BEVEL_CUT' | 'STRAIGHT_CUT' | 'COMPLEX_NOTCH';
    angle: number;
    confidence: number;
  } {
    const bounds = this.getContourBounds(points);
    const dims = element.dimensions || {};
    const profileLength = dims.length || 1000;
    
    // Vérifier position (extrémités vs milieu)
    const isAtStart = bounds.minX < 100;
    const isAtEnd = bounds.maxX > profileLength - 100;
    const atExtremity = isAtStart || isAtEnd;
    
    // Analyser les segments pour détecter les angles
    const diagonalSegments = this.findDiagonalSegments(points);
    
    if (diagonalSegments.length === 0) {
      return { type: 'STRAIGHT_CUT', angle: 0, confidence: 0.9 };
    }
    
    const avgAngle = diagonalSegments.reduce((sum, s) => sum + Math.abs(s.angle), 0) / diagonalSegments.length;
    const maxLength = Math.max(...diagonalSegments.map(s => s.length));
    
    // Logique de décision
    if (atExtremity) {
      if (maxLength > 50 && avgAngle > 20) {
        return { type: 'ANGLE_CUT', angle: avgAngle, confidence: 0.8 };
      } else if (maxLength < 30 && avgAngle > 15) {
        return { type: 'BEVEL_CUT', angle: avgAngle, confidence: 0.7 };
      }
    }
    
    if (points.length > 15 && diagonalSegments.length > 3) {
      return { type: 'COMPLEX_NOTCH', angle: avgAngle, confidence: 0.6 };
    }
    
    return { type: 'STRAIGHT_CUT', angle: 0, confidence: 0.5 };
  }
  
  /**
   * PHASE 2 - Trouve segments diagonaux significatifs
   */
  private findDiagonalSegments(points: Array<[number, number]>): Array<{
    index: number;
    angle: number;
    length: number;
  }> {
    const segments = [];
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i-1][0];
      const dy = points[i][1] - points[i-1][1];
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Segment diagonal significatif
      if (Math.abs(dx) > 3 && Math.abs(dy) > 3 && length > 5) {
        const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
        segments.push({ index: i, angle, length });
      }
    }
    
    return segments;
  }
  
  /**
   * PHASE 2 - Crée géométrie pour coupe d'angle
   */
  private createAngleCutGeometry(bounds: { minX: number; maxX: number; minY: number; maxY: number }, thickness: number, _angle: number): THREE.BufferGeometry {
    // Pour une coupe d'angle, créer un prisme avec l'angle approprié
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    // Utiliser une géométrie de boîte comme base, plus tard on peut améliorer
    return new THREE.BoxGeometry(width, height, thickness * 1.5);
  }
  
  /**
   * PHASE 2 - Crée géométrie pour chanfrein
   */
  private createBevelCutGeometry(bounds: { minX: number; maxX: number; minY: number; maxY: number }, thickness: number, _angle: number): THREE.BufferGeometry {
    // Pour un chanfrein, créer une géométrie plus petite et précise
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    // Chanfrein plus petit que la coupe d'angle
    return new THREE.BoxGeometry(width * 0.8, height * 0.8, thickness);
  }
  
  /**
   * PHASE 2 - Crée géométrie pour encoche complexe
   */
  private createComplexNotchGeometry(points: Array<[number, number]>, thickness: number): THREE.BufferGeometry {
    // Pour une encoche complexe, utiliser la forme simplifiée basée sur les bounds
    const bounds = this.getContourBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    return new THREE.BoxGeometry(width, height, thickness);
  }

  dispose(): void {
    // Nettoyer les stratégies
    if (this.strategies) {
      this.strategies.forEach(strategy => {
        if (strategy.dispose) {
          strategy.dispose();
        }
      });
    }
    
    // Nettoyer les ressources si nécessaire
  }
}
