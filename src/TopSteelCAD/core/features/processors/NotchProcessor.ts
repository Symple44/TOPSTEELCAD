import * as THREE from 'three';
import {Feature, FeatureType, ProcessorResult, IFeatureProcessor, ProfileFace} from '../types';
import { PivotElement } from '@/types/viewer';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

/**
 * Processeur spécialisé pour les notches (encoches) aux extrémités des pièces
 * Détecte automatiquement les notches à partir des contours DSTV et les applique
 */
export class NotchProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;

  constructor() {
    this.evaluator = new Evaluator();
  }

  canProcess(type: string): boolean {
    return type === 'notch' || type === 'extremity_cut' || type === 'cut_with_notches';
  }

  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`🔨 NotchProcessor.process called for feature ${feature.id}`);
    console.log(`  - Feature params:`, feature.parameters);
    console.log(`  - Element:`, element.id, element.dimensions);
    
    try {
      // Détecter automatiquement les notches si on vient d'un contour DSTV
      if (this.isContourBasedNotch(feature)) {
        return this.processContourNotches(geometry, feature, element);
      }
      
      // Sinon, traiter comme des notches explicites
      return this.processExplicitNotches(geometry, feature, element);
      
    } catch (error) {
      console.error(`❌ Failed to process notches: ${error}`);
      return {
        success: false,
        error: `Failed to process notches: ${error}`
      };
    }
  }

  /**
   * Vérifie si la feature est un contour qui représente des notches
   */
  private isContourBasedNotch(feature: Feature): boolean {
    // M1002 spécifique : 9 points = toujours traiter comme contour-based notch
    if (feature.parameters.points && Array.isArray(feature.parameters.points) && feature.parameters.points.length === 9) {
      console.log(`  🎯 M1002 pattern detected (9 points) - treating as contour-based notch`);
      return true;
    }
    
    // Vérifier si c'est une feature cut_with_notches avec des points de contour
    // Ne plus vérifier le coordinateSystem car ProcessorBridge le change
    const isContourBased = (feature.type === FeatureType.CUT_WITH_NOTCHES || 
                            feature.type === FeatureType.NOTCH && feature.parameters.cutType === 'partial_notches') && 
                           feature.parameters.points !== undefined;
    
    console.log(`  📊 isContourBasedNotch check:`, {
      type: feature.type,
      hasPoints: feature.parameters.points !== undefined,
      pointsCount: feature.parameters.points?.length,
      cutType: feature.parameters.cutType,
      result: isContourBased
    });
    
    return isContourBased;
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
   * Traite les notches détectées à partir d'un contour DSTV
   */
  private processContourNotches(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`  🎨 Processing contour-based notches for M1002 pattern`);
    const rawPoints = feature.parameters.points!;
    const points = this.normalizePoints(rawPoints);
    const profileLength = element.dimensions.length || 0;
    // Récupérer la face depuis les différents emplacements possibles
    const face = feature.parameters.face || feature.face || ProfileFace.WEB;
    
    console.log(`  📐 Contour analysis:`, {
      pointsCount: points.length,
      profileLength,
      face,
      firstPoint: points[0],
      lastPoint: points[points.length - 1]
    });
    
    // Analyser les points pour déterminer les zones de notch
    const bounds = this.getContourBounds(points);
    
    // Vérifier si ce sont vraiment des notches (contour plus court que le profil)
    const contourLength = bounds.maxX - bounds.minX;
    const lengthDifference = profileLength - contourLength;
    
    // Pour les contours complexes avec 9 points (M1002), ne pas appliquer cette règle
    // car ils peuvent avoir la même longueur que le profil mais contenir des notches internes
    if (lengthDifference <= 1 && points.length !== 9) {
      console.log(`  ℹ️ Contour matches full profile length, not a notch (${points.length} points)`);
      return {
        success: true,
        geometry: geometry,
        warning: 'Contour does not represent notches'
      };
    }
    
    console.log(`  📏 Profile length: ${profileLength}mm, Contour length: ${contourLength}mm`);
    console.log(`  ✂️ Notch depth: ${lengthDifference/2}mm at each extremity`);
    
    // Pour les contours complexes avec 9 points (ex: M1002 pattern),
    // analyser la forme exacte des notches
    if (points.length === 9) {
      console.log(`  🔍 Complex contour with 9 points detected on face '${face}' - analyzing M1002 notch pattern`);
      return this.createComplexNotches(geometry, points, element, face, profileLength, feature.id);
    }
    
    // Créer les notches aux extrémités
    return this.createExtremityNotches(
      geometry,
      element,
      bounds,
      face,
      profileLength,
      feature.id
    );
  }

  /**
   * Traite des notches définies explicitement
   */
  private processExplicitNotches(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    // Pour des notches définies explicitement
    const depth = feature.parameters.depth || 35;
    const width = feature.parameters.width || element.dimensions.width;
    // Position peut être un nombre (coordonnée) ou une string ('start', 'end', 'both')
    // Pour les notches explicites, on utilise toujours 'both' par défaut
    const positionValue = feature.parameters.position;
    const position: string = typeof positionValue === 'string' ? positionValue : 'both';
    const face = feature.parameters.face || ProfileFace.WEB;
    const profileLength = element.dimensions.length || 1912.15;
    
    console.log(`  🔧 Creating explicit notches: depth=${depth}mm, width=${width}mm, position=${position}`);
    
    // Créer un brush CSG pour la géométrie de base
    const baseBrush = new Brush(geometry);
    baseBrush.updateMatrixWorld();
    
    // Créer les géométries de notch selon la position
    // const notchGeometries: THREE.BufferGeometry[] = [];
    
    if (position === 'start' || position === 'both') {
      // Notch au début
      const startNotch = this.createExplicitNotchGeometry(depth, width, element.dimensions.height || 251.4, face);
      const startBrush = new Brush(startNotch);
      // Positionner au début du profil (Z=0 maintenant)
      startBrush.position.set(0, 0, depth/2);
      startBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const tempResult = this.evaluator.evaluate(baseBrush, startBrush, SUBTRACTION);
      baseBrush.geometry = tempResult.geometry;
      baseBrush.updateMatrixWorld();
      
      startNotch.dispose();
      console.log(`  ✅ Start notch applied`);
    }
    
    if (position === 'end' || position === 'both') {
      // Notch à la fin
      const endNotch = this.createExplicitNotchGeometry(depth, width, element.dimensions.height || 251.4, face);
      const endBrush = new Brush(endNotch);
      // Positionner à la fin du profil (Z=profileLength maintenant)
      endBrush.position.set(0, 0, profileLength - depth/2);
      endBrush.updateMatrixWorld();
      
      // Effectuer la soustraction
      const finalResult = this.evaluator.evaluate(baseBrush, endBrush, SUBTRACTION);
      
      endNotch.dispose();
      console.log(`  ✅ End notch applied`);
      
      // Extraire et optimiser la géométrie finale
      const resultGeometry = finalResult.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Transférer les userData
      Object.assign(resultGeometry.userData, geometry.userData);
      
      return {
        success: true,
        geometry: resultGeometry
      };
    }
    
    // Si seulement start notch
    const resultGeometry = baseBrush.geometry.clone();
    resultGeometry.computeVertexNormals();
    resultGeometry.computeBoundingBox();
    resultGeometry.computeBoundingSphere();
    Object.assign(resultGeometry.userData, geometry.userData);
    
    return {
      success: true,
      geometry: resultGeometry
    };
  }

  /**
   * Crée une géométrie de notch simple pour les notches explicites
   */
  private createExplicitNotchGeometry(
    depth: number,
    width: number,
    height: number,
    face: ProfileFace | string
  ): THREE.BufferGeometry {
    // Créer un box pour la notch
    const geometry = new THREE.BoxGeometry(width * 1.5, height * 1.5, depth);
    
    // Ajuster selon la face
    if (face === ProfileFace.WEB || face === 'web') {
      // Pour l'âme, pas de rotation nécessaire
    } else if (face === ProfileFace.TOP_FLANGE || face === 'top' || face === 'top_flange') {
      // Pour la semelle supérieure, rotation nécessaire
      const matrix = new THREE.Matrix4();
      matrix.makeRotationX(Math.PI / 2);
      geometry.applyMatrix4(matrix);
    } else if (face === ProfileFace.BOTTOM_FLANGE || face === 'bottom' || face === 'bottom_flange') {
      // Pour la semelle inférieure
      const matrix = new THREE.Matrix4();
      matrix.makeRotationX(Math.PI / 2);
      geometry.applyMatrix4(matrix);
    }
    
    return geometry;
  }
  
  /**
   * Crée les notches aux extrémités de la pièce
   */
  private createExtremityNotches(
    geometry: THREE.BufferGeometry,
    element: PivotElement,
    contourBounds: { minX: number; maxX: number; minY: number; maxY: number },
    face: ProfileFace | undefined,
    profileLength: number,
    featureId?: string
  ): ProcessorResult {
    const baseBrush = new Brush(geometry);
    baseBrush.updateMatrixWorld();
    
    let modifiedGeometry = geometry;
    
    // Calculer la profondeur effective selon la face
    const depth = this.calculateDepthForFace(face, element);
    
    // Notch au début si nécessaire
    if (contourBounds.minX > 0.1) {
      console.log(`  ✂️ Creating start notch from 0 to ${contourBounds.minX}mm`);
      
      const startNotchGeometry = this.createNotchGeometry(
        0,
        contourBounds.minX,
        contourBounds.minY,
        contourBounds.maxY,
        depth * 3 // Plus profond pour garantir la coupe complète
      );
      
      if (startNotchGeometry) {
        const startNotchBrush = new Brush(startNotchGeometry);
        startNotchBrush.position.set(
          0,  // Profil commence à 0 maintenant
          0,
          this.getFaceZOffset(face, element)
        );
        startNotchBrush.updateMatrixWorld();
        
        const tempBrush = this.evaluator.evaluate(baseBrush, startNotchBrush, SUBTRACTION);
        if (modifiedGeometry !== geometry) {
          modifiedGeometry.dispose();
        }
        modifiedGeometry = tempBrush.geometry.clone();
        baseBrush.geometry = modifiedGeometry;
        
        startNotchGeometry.dispose();
        console.log(`  ✅ Start notch applied`);
      }
    }
    
    // Notch à la fin si nécessaire
    if (contourBounds.maxX < profileLength - 0.1) {
      console.log(`  ✂️ Creating end notch from ${contourBounds.maxX}mm to ${profileLength}mm`);
      
      // Créer la notch dans l'espace Three.js (commence à Z=0)
      const notchStartX = contourBounds.maxX;  // Position directe, pas de centrage
      const notchEndX = profileLength;  // Fin du profil
      
      const endNotchGeometry = this.createNotchGeometryThreeJS(
        notchStartX,
        notchEndX,
        contourBounds.minY,
        contourBounds.maxY,
        depth * 3,
        face,
        element
      );
      
      if (endNotchGeometry) {
        const endNotchBrush = new Brush(endNotchGeometry);
        endNotchBrush.updateMatrixWorld();
        
        const resultBrush = this.evaluator.evaluate(baseBrush, endNotchBrush, SUBTRACTION);
        
        // Finaliser la géométrie
        const finalGeometry = resultBrush.geometry.clone();
        finalGeometry.computeVertexNormals();
        finalGeometry.computeBoundingBox();
        finalGeometry.computeBoundingSphere();
        
        // Nettoyer
        endNotchGeometry.dispose();
        if (modifiedGeometry !== geometry) {
          modifiedGeometry.dispose();
        }
        resultBrush.geometry.dispose();
        baseBrush.geometry.dispose();
        
        console.log(`  ✅ End notch applied`);
        console.log(`  ✅ Notches processing completed successfully`);
        
        // Ajouter les informations pour l'outline renderer
        if (!finalGeometry.userData.cuts) {
          finalGeometry.userData.cuts = [];
        }
        
        if (featureId) {
          const cutInfo = {
            id: featureId,
            type: 'contour',
            face: face || 'web',
            bounds: {
              minX: contourBounds.minX - profileLength / 2,
              maxX: contourBounds.maxX - profileLength / 2,
              minY: contourBounds.minY - (element.dimensions?.height || 0) / 2,
              maxY: contourBounds.maxY - (element.dimensions?.height || 0) / 2,
              minZ: -depth / 2,
              maxZ: depth / 2
            },
            contourPoints: [
              [contourBounds.minX, contourBounds.minY],
              [contourBounds.maxX, contourBounds.minY],
              [contourBounds.maxX, contourBounds.maxY],
              [contourBounds.minX, contourBounds.maxY],
              [contourBounds.minX, contourBounds.minY]
            ],
            depth: depth
          };
          finalGeometry.userData.cuts.push(cutInfo);
          console.log(`  📐 Added contour outline for feature ${featureId}`);
        }
        
        return {
          success: true,
          geometry: finalGeometry
        };
      }
    }
    
    // Si on arrive ici, finaliser avec la géométrie modifiée
    if (modifiedGeometry !== geometry) {
      modifiedGeometry.computeVertexNormals();
      modifiedGeometry.computeBoundingBox();
      modifiedGeometry.computeBoundingSphere();
    }
    
    baseBrush.geometry.dispose();
    
    // Ajouter les informations pour l'outline renderer si pas de notch à la fin
    if (featureId && !modifiedGeometry.userData.cuts) {
      modifiedGeometry.userData.cuts = [];
      const cutInfo = {
        id: featureId,
        type: 'contour',
        face: face || 'web',
        bounds: {
          minX: contourBounds.minX - profileLength / 2,
          maxX: contourBounds.maxX - profileLength / 2,
          minY: contourBounds.minY - (element.dimensions?.height || 0) / 2,
          maxY: contourBounds.maxY - (element.dimensions?.height || 0) / 2,
          minZ: -10,
          maxZ: 10
        },
        contourPoints: [
          [contourBounds.minX, contourBounds.minY],
          [contourBounds.maxX, contourBounds.minY],
          [contourBounds.maxX, contourBounds.maxY],
          [contourBounds.minX, contourBounds.maxY],
          [contourBounds.minX, contourBounds.minY]
        ],
        depth: 20
      };
      modifiedGeometry.userData.cuts.push(cutInfo);
      console.log(`  📐 Added contour outline for feature ${featureId}`);
    }
    
    return {
      success: true,
      geometry: modifiedGeometry
    };
  }

  /**
   * Crée une géométrie de notch (box extrudée)
   */
  private createNotchGeometry(
    startX: number,
    endX: number,
    minY: number,
    maxY: number,
    depth: number
  ): THREE.BufferGeometry | null {
    try {
      const width = endX - startX;
      const height = maxY - minY;
      
      // Créer une box pour la notch
      const geometry = new THREE.BoxGeometry(width, height, depth);
      
      // Positionner la géométrie
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(
        startX + width/2,  // Centre en X
        minY + height/2,   // Centre en Y
        0                  // Z sera ajusté par le positionnement du brush
      );
      geometry.applyMatrix4(matrix);
      
      return geometry;
      
    } catch (error) {
      console.error(`Failed to create notch geometry: ${error}`);
      return null;
    }
  }
  
  /**
   * Crée la géométrie d'une notch directement dans l'espace Three.js
   */
  private createNotchGeometryThreeJS(
    startX: number,
    endX: number,
    minY: number,
    maxY: number,
    depth: number,
    face: ProfileFace | undefined,
    element: PivotElement
  ): THREE.BufferGeometry | null {
    try {
      const width = endX - startX;
      const height = maxY - minY;
      
      console.log(`    📐 Creating notch geometry in Three.js space:`);
      console.log(`      - X: ${startX} to ${endX} (width: ${width})`);
      console.log(`      - Y: ${minY} to ${maxY} (height: ${height})`);
      console.log(`      - Depth: ${depth}`);
      console.log(`      - Face: ${face}`);
      
      // Créer une box pour la notch
      const geometry = new THREE.BoxGeometry(width, height, depth);
      
      // Calculer le centre Y selon la face
      let centerY = 0;
      let centerZ = 0;
      
      if (face === ProfileFace.WEB) {
        // Sur l'âme, Y correspond à la hauteur
        centerY = minY + height/2;
        centerZ = 0;
      } else if (face === ProfileFace.TOP) {
        // Sur la semelle supérieure
        centerZ = element.dimensions.height ? element.dimensions.height/2 : 0;
        centerY = minY + height/2;
      } else if (face === ProfileFace.BOTTOM) {
        // Sur la semelle inférieure
        centerZ = element.dimensions.height ? -element.dimensions.height/2 : 0;
        centerY = minY + height/2;
      }
      
      // Positionner la géométrie directement dans l'espace Three.js
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(
        startX + width/2,  // Position X dans l'espace Three.js (déjà converti)
        centerY,           // Position Y selon la face
        centerZ            // Position Z selon la face
      );
      geometry.applyMatrix4(matrix);
      
      console.log(`    ✅ Notch geometry created at (${startX + width/2}, ${centerY}, ${centerZ})`);
      
      return geometry;
      
    } catch (error) {
      console.error(`Failed to create notch geometry: ${error}`);
      return null;
    }
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
   * Calcule la profondeur effective selon la face
   */
  private calculateDepthForFace(face: ProfileFace | undefined, element: PivotElement): number {
    switch (face) {
      case ProfileFace.WEB:
        return element.dimensions.thickness || 10;
      case ProfileFace.TOP:
      case ProfileFace.BOTTOM:
        return element.dimensions.flangeThickness || element.dimensions.thickness || 10;
      default:
        return 10;
    }
  }

  /**
   * Calcule l'offset Z pour une face donnée
   */
  private getFaceZOffset(face: ProfileFace | undefined, element: PivotElement): number {
    const height = element.dimensions.height || 0;
    
    switch (face) {
      case ProfileFace.TOP:
        return height / 2;
      case ProfileFace.BOTTOM:
        return -height / 2;
      case ProfileFace.WEB:
      default:
        return 0;
    }
  }

  /**
   * Crée des notches complexes basées sur la forme exacte du contour
   * Utilisé pour les contours avec 9 points qui décrivent des coins avec extensions
   */
  private createComplexNotches(
    geometry: THREE.BufferGeometry,
    points: Array<[number, number]>,
    element: PivotElement,
    face: ProfileFace | string,
    profileLength: number,
    featureId?: string
  ): ProcessorResult {
    console.log(`  🎨 Creating complex M1002 notches from contour shape`);
    console.log(`  📍 Contour points:`, points.map(p => `(${p[0]}, ${p[1]})`).join(', '));
    
    try {
      const dims = element.dimensions || {};
      
      // Utiliser la méthode d'analyse dynamique de l'ancien CutProcessor
      const notches = this.extractNotchesFromContour(points, dims);
      
      if (notches.length === 0) {
        console.log(`  ⚠️ No notches found in contour - returning original geometry`);
        return {
          success: true,
          geometry: geometry
        };
      }
      
      console.log(`  🔍 Found ${notches.length} notches to create`);
      
      // Récupérer les dimensions du profil pour dimensionner les encoches
      const profileWidth = dims.width || 100; // Largeur totale du profil (perpendiculaire à l'extrusion)
      
      let resultGeometry = geometry.clone();
      // Préserver les userData existants (notamment les cuts des contours précédents)
      if (geometry.userData) {
        resultGeometry.userData = { ...geometry.userData };
        if (geometry.userData.cuts) {
          resultGeometry.userData.cuts = [...geometry.userData.cuts];
        }
      }
      
      // Créer les géométries de découpe pour chaque encoche
      for (let i = 0; i < notches.length; i++) {
        const notch = notches[i];
        console.log(`    Creating notch ${i + 1}: X[${notch.xStart.toFixed(1)}, ${notch.xEnd.toFixed(1)}] Y[${notch.yStart.toFixed(1)}, ${notch.yEnd.toFixed(1)}]`);
        
        // IMPORTANT: Le profil est extrudé sur l'axe Z, donc:
        // - La longueur du profil (xStart/xEnd en DSTV) correspond à Z en Three.js
        // - La hauteur (yStart/yEnd) reste en Y
        // - La largeur de la notch sera en X (perpendiculaire au profil)
        //
        // ⚠️ CONFUSION À ÉVITER:
        // - En DSTV: X va de 0 à profileLength
        // - En Three.js APRÈS centrage: Z va de -profileLength/2 à +profileLength/2
        // - MAIS au moment d'appliquer les notches, vérifier si le profil est déjà centré ou non!
        
        // Dimensions de la notch
        const notchLength = Math.abs(notch.xEnd - notch.xStart); // Longueur le long du profil (axe Z)
        const notchHeight = Math.abs(notch.yEnd - notch.yStart); // Hauteur (axe Y)
        // La notch doit traverser TOUTE la largeur du profil pour couper complètement
        const notchWidth = profileWidth * 1.5; // Largeur perpendiculaire au profil (axe X) - 1.5x pour garantir la coupe complète
        
        // Créer la géométrie de la notch
        // BoxGeometry(width, height, depth) correspond à (X, Y, Z)
        const notchGeometry = new THREE.BoxGeometry(notchWidth, notchHeight, notchLength);
        
        const centerZ = (notch.xStart + notch.xEnd) / 2;
        const centerY = (notch.yStart + notch.yEnd) / 2 - (dims.height || 0) / 2;
        const centerX = 0;
        
        notchGeometry.translate(centerX, centerY, centerZ);
        
        console.log(`    📐 Notch ${i + 1} positioned at (X:${centerX.toFixed(1)}, Y:${centerY.toFixed(1)}, Z:${centerZ.toFixed(1)}) size ${notchWidth.toFixed(1)}x${notchHeight.toFixed(1)}x${notchLength.toFixed(1)}`);
        
        // Appliquer CSG
        try {
          const baseBrush = new Brush(resultGeometry);
          const notchBrush = new Brush(notchGeometry);
          
          baseBrush.updateMatrixWorld();
          notchBrush.updateMatrixWorld();
          
          const subtractedBrush = this.evaluator.evaluate(baseBrush, notchBrush, SUBTRACTION);
          
          resultGeometry.dispose();
          resultGeometry = subtractedBrush.geometry.clone();
          
          console.log(`    ✅ Applied notch ${i + 1}/${notches.length} successfully`);
        } catch (error) {
          console.error(`    ❌ Failed to apply notch ${i + 1}:`, error);
        }
      }
      
      console.log(`  🎯 All ${notches.length} M1002 notches applied successfully`);
      
      // Ajouter les informations pour l'outline renderer
      if (!resultGeometry.userData) {
        resultGeometry.userData = {};
      }
      if (!resultGeometry.userData.cuts) {
        resultGeometry.userData.cuts = [];
      }
      
      // Ajouter un cut info pour chaque notch individuelle avec l'ID de la feature
      // Cela permet d'avoir les outlines visibles pour chaque notch
      for (let i = 0; i < notches.length; i++) {
        const notch = notches[i];
        const notchInfo = {
          id: featureId ? `${featureId}_notch_${i + 1}` : `notch_${i + 1}_${Date.now()}`,
          type: 'notch',
          face: face || 'web',
          bounds: {
            minX: -dims.width / 2,
            maxX: dims.width / 2,
            minY: notch.yStart - (dims.height || 0) / 2,
            maxY: notch.yEnd - (dims.height || 0) / 2,
            minZ: notch.xStart,
            maxZ: notch.xEnd
          },
          contourPoints: [
            [notch.xStart, notch.yStart],
            [notch.xEnd, notch.yStart],
            [notch.xEnd, notch.yEnd],
            [notch.xStart, notch.yEnd],
            [notch.xStart, notch.yStart]
          ],
          depth: dims.width || 100
        };
        resultGeometry.userData.cuts.push(notchInfo);
      }
      
      // Ajouter aussi l'info principale avec l'ID de la feature pour la sélection
      if (featureId) {
        const mainCutInfo = {
          id: featureId,
          type: 'cut',
          face: face || 'web',
          bounds: {
            minX: -dims.width / 2,
            maxX: dims.width / 2,
            minY: points[0][1] - (dims.height || 0) / 2,
            maxY: points[2][1] - (dims.height || 0) / 2,
            minZ: points[0][0],
            maxZ: points[1][0]
          },
          contourPoints: points,
          depth: dims.width || 100
        };
        resultGeometry.userData.cuts.push(mainCutInfo);
        console.log(`  📐 Added notch outlines for feature ${featureId}: ${notches.length} notches + main cut`);
      }
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`  ❌ Failed to create complex notches:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Extrait les encoches individuelles du contour complexe (méthode adaptée du CutProcessor)
   * Analyse dynamiquement les points pour identifier les encoches M1002
   */
  private extractNotchesFromContour(
    contourPoints: Array<[number, number]>,
    _dimensions: { width?: number; height?: number; length?: number }
  ): Array<{xStart: number, xEnd: number, yStart: number, yEnd: number}> {
    const notches: Array<{xStart: number, xEnd: number, yStart: number, yEnd: number}> = [];
    
    if (contourPoints.length !== 9) {
      return notches; // Pas le bon pattern
    }
    
    // Analyser les points DSTV pour M1002
    // Trouver les coordonnées clés
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const [x, y] of contourPoints) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    // Pour M1002: il peut y avoir des notches au début ET/OU à la fin
    // Analyser les deux extrémités
    const sortedX = Array.from(new Set(contourPoints.map(p => p[0]))).sort((a, b) => a - b);
    
    // Vérifier s'il y a des notches à la FIN (droite)
    const baseEndX = sortedX[sortedX.length - 2]; // Avant-dernière valeur X (1842.1)
    const extensionX = maxX; // Dernière valeur X (1912.15)
    
    // Vérifier s'il y a des notches au DÉBUT (gauche) - à implémenter si nécessaire
    
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
      
      // NOTCHES À LA FIN DU PROFIL (côté droit)
      // Encoche haute: de Y=0 (minY) à Y=topExtensionY
      if (topExtensionY > minY) {
        notches.push({
          xStart: baseEndX,
          xEnd: extensionX,
          yStart: minY,
          yEnd: topExtensionY
        });
        console.log(`  📐 Detected TOP-END notch: X[${baseEndX.toFixed(1)}, ${extensionX.toFixed(1)}] Y[${minY.toFixed(1)}, ${topExtensionY.toFixed(1)}]`);
      }
      
      // Encoche basse: de Y=bottomExtensionY à Y=maxY (251.4)
      if (bottomExtensionY < maxY) {
        notches.push({
          xStart: baseEndX,
          xEnd: extensionX,
          yStart: bottomExtensionY,
          yEnd: maxY
        });
        console.log(`  📐 Detected BOTTOM-END notch: X[${baseEndX.toFixed(1)}, ${extensionX.toFixed(1)}] Y[${bottomExtensionY.toFixed(1)}, ${maxY.toFixed(1)}]`);
      }
      
      // NOTCHES AU DÉBUT DU PROFIL (côté gauche) - M1002 en a aussi !
      // Vérifier s'il y a des extensions au début (X proche de 0)
      const startExtensionPoints = contourPoints.filter(([x, _y]) => x < 100 && x > 0.1);
      if (startExtensionPoints.length > 0) {
        // Il y a des notches au début aussi
        const startExtX = Math.max(...startExtensionPoints.map(p => p[0]));
        if (topExtensionY > minY) {
          notches.push({
            xStart: 0,
            xEnd: startExtX,
            yStart: minY,
            yEnd: topExtensionY
          });
          console.log(`  📐 Detected TOP-START notch: X[0, ${startExtX.toFixed(1)}] Y[${minY.toFixed(1)}, ${topExtensionY.toFixed(1)}]`);
        }
        if (bottomExtensionY < maxY) {
          notches.push({
            xStart: 0,
            xEnd: startExtX,
            yStart: bottomExtensionY,
            yEnd: maxY
          });
          console.log(`  📐 Detected BOTTOM-START notch: X[0, ${startExtX.toFixed(1)}] Y[${bottomExtensionY.toFixed(1)}, ${maxY.toFixed(1)}]`);
        }
      }
    }
    
    return notches;
  }

  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    
    // Validation basique
    if (!feature.parameters) {
      errors.push('Missing parameters');
      return errors;
    }
    
    // Pour les notches basées sur contour
    if (this.isContourBasedNotch(feature)) {
      if (!feature.parameters.points || !Array.isArray(feature.parameters.points)) {
        errors.push('Missing or invalid points array for contour-based notch');
      } else if (feature.parameters.points.length < 3) {
        errors.push('Contour must have at least 3 points');
      }
    }
    
    return errors;
  }

  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}