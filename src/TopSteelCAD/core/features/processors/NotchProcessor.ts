import * as THREE from 'three';
import {Feature, ProcessorResult, IFeatureProcessor, ProfileFace, CoordinateSystem} from '../types';
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
    return type === 'notch' || type === 'extremity_cut';
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
    const coordinateSystem = 'coordinateSystem' in feature ? feature.coordinateSystem : CoordinateSystem.DSTV;
    return feature.parameters.contourType === 'outer' && 
           coordinateSystem === CoordinateSystem.DSTV &&
           feature.parameters.points !== undefined;
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
    const rawPoints = feature.parameters.points!;
    const points = this.normalizePoints(rawPoints);
    const profileLength = element.dimensions.length || 0;
    const face = feature.parameters.face || ProfileFace.WEB;
    
    // Analyser les points pour déterminer les zones de notch
    const bounds = this.getContourBounds(points);
    
    // Vérifier si ce sont vraiment des notches (contour plus court que le profil)
    const contourLength = bounds.maxX - bounds.minX;
    const lengthDifference = profileLength - contourLength;
    
    if (lengthDifference <= 1) {
      console.log(`  ℹ️ Contour matches full profile length, not a notch`);
      return {
        success: true,
        geometry: geometry,
        warning: 'Contour does not represent notches'
      };
    }
    
    console.log(`  📏 Profile length: ${profileLength}mm, Contour length: ${contourLength}mm`);
    console.log(`  ✂️ Notch depth: ${lengthDifference/2}mm at each extremity`);
    
    // Créer les notches aux extrémités
    return this.createExtremityNotches(
      geometry,
      element,
      bounds,
      face,
      profileLength
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
    // Pour des notches définies explicitement (future fonctionnalité)
    const depth = feature.parameters.depth || 35;
    const width = feature.parameters.width || element.dimensions.width;
    const position = feature.parameters.position || 'both'; // 'start', 'end', 'both'
    
    console.log(`  🔧 Creating explicit notches: depth=${depth}mm, width=${width}mm, position=${position}`);
    
    // Implémenter la création de notches explicites
    // Pour l'instant, on retourne la géométrie inchangée
    return {
      success: true,
      geometry: geometry,
      warning: 'Explicit notches not yet implemented'
    };
  }

  /**
   * Crée les notches aux extrémités de la pièce
   */
  private createExtremityNotches(
    geometry: THREE.BufferGeometry,
    element: PivotElement,
    contourBounds: { minX: number; maxX: number; minY: number; maxY: number },
    face: ProfileFace | undefined,
    profileLength: number
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
          -profileLength/2,
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
      
      // Créer la notch dans l'espace Three.js centré
      const notchStartX = contourBounds.maxX - profileLength/2;  // Convertir en coordonnées Three.js
      const notchEndX = profileLength/2;  // Fin du profil en Three.js
      
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

  validateFeature(feature: Feature, element: PivotElement): string[] {
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