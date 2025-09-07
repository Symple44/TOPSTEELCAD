/**
 * PartialNotchHandler.ts - Handler pour les encoches partielles
 * Version simplifiée pour corriger les erreurs de compilation
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';
import { PivotElement } from '@/types/viewer';
import { CutType } from '../types/CutTypes';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { getGeometryService } from '../services/GeometryCreationService';

export class PartialNotchHandler extends BaseCutHandler {
  readonly name = 'PartialNotchHandler';
  readonly supportedTypes = [CutType.NOTCH_PARTIAL, CutType.NOTCH_COMPOUND, CutType.CUT_WITH_NOTCHES];
  readonly priority = 100;

  protected canHandleSpecific(feature: Feature): boolean {
    const params = feature.parameters as any;
    return params.cutType === 'partial_notches' || 
           params.cutType === 'notch_compound' ||
           (params.points && Array.isArray(params.points) && params.points.length === 9);
  }

  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    const params = feature.parameters as any;
    
    if (!params.points || !Array.isArray(params.points)) {
      errors.push('Points array is required for partial notch');
      return;
    }
    
    if (params.points.length < 3) {
      errors.push('At least 3 points required for notch geometry');
    }
    
    // Validation spécifique aux encoches partielles
    if (params.points.length === 9) {
      // Vérifier que le contour forme une géométrie valide
      const bounds = this.getContourBounds(params.points);
      if (bounds.width <= 0 || bounds.height <= 0) {
        errors.push('Invalid notch geometry bounds');
      }
    }
  }

  protected requiresContourPoints(): boolean {
    return true;
  }

  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    const params = feature.parameters as any;
    const geometryService = getGeometryService();
    
    console.log(`🔧 PartialNotchHandler.createCutGeometry for M1002 pattern`);
    console.log(`  Points: ${params.points?.length || 0}`);
    
    // Pour M1002: créer seulement les encoches aux extrémités, pas tout le contour
    if (params.points && params.points.length === 9) {
      return this.createM1002NotchGeometry(params.points, element);
    }
    
    try {
      const options = {
        face: params.face || ProfileFace.WEB,
        depth: params.depth || this.calculateDefaultDepth(element),
        bevelEnabled: false
      };
      
      return geometryService.createCutGeometry(
        params.points,
        element,
        options
      );
    } catch (error) {
      console.error('Failed to create partial notch geometry:', error);
      // Fallback: créer une géométrie rectangulaire simple
      return new THREE.BoxGeometry(
        params.width || 50,
        params.height || 50,
        params.depth || 25
      );
    }
  }

  detectCutType(feature: Feature): CutType {
    const params = feature.parameters as any;
    
    if (params.cutType === 'partial_notches' || 
        (params.points && Array.isArray(params.points) && params.points.length === 9)) {
      return CutType.NOTCH_PARTIAL;
    }
    
    if (params.cutType === 'notch_compound') {
      return CutType.NOTCH_COMPOUND;
    }
    
    return CutType.NOTCH_PARTIAL;
  }

  private createM1002NotchGeometry(points: any[], element: PivotElement): THREE.BufferGeometry {
    console.log(`🎯 Creating M1002 notch geometry (TWO SEPARATE NOTCHES like old ContourProcessor)`);
    
    // Dimensions du profil
    const profileLength = element.dimensions?.length || 1912.15;
    const profileHeight = element.dimensions?.height || 251.4;
    const profileWidth = element.dimensions?.width || 146.1;
    const webThickness = element.dimensions?.webThickness || 8.6;
    
    // Analyse des points pour déterminer les zones de notches
    // Points M1002: [0,18.6], [0,232.8], [1842.1,232.8], [1842.1,251.4], [1912.15,251.4], [1912.15,0], [1842.1,0], [1842.1,18.6], [0,18.6]
    // Cela crée deux notches: un au début (0-70mm) et un à la fin (1842.1-1912.2mm)
    
    const notchDepth = 70.05;  // Profondeur des encoches (1912.15 - 1842.1)
    const notchTopY = 232.8;    // Haut de l'encoche
    const notchBottomY = 18.6;  // Bas de l'encoche
    const notchHeight = notchTopY - notchBottomY;  // Hauteur de l'encoche (214.2mm)
    const notchWidth = webThickness * 3; // Largeur pour bien traverser l'âme
    
    console.log(`📐 M1002 notch dimensions:`);
    console.log(`   Depth (Z): ${notchDepth}mm`);
    console.log(`   Height (Y): ${notchHeight}mm (from Y=${notchBottomY} to Y=${notchTopY})`);
    console.log(`   Width (X): ${notchWidth}mm`);
    console.log(`   Creating TWO notches: at start and end`);
    
    // Utiliser BufferGeometryUtils pour fusionner les deux encoches
    const geometries: THREE.BufferGeometry[] = [];
    
    // NOTCH 1 : Au DÉBUT du profil (Z négatif)
    const notch1 = new THREE.BoxGeometry(
      notchWidth,    // X: largeur (traverse l'âme)
      notchHeight,   // Y: hauteur de l'encoche  
      notchDepth     // Z: profondeur de l'encoche
    );
    
    // Le profil va de -profileLength/2 à +profileLength/2 en Z
    // Notch 1 doit être à l'extrémité gauche (Z négatif)
    const notch1PosZ = -profileLength/2 + notchDepth/2; // Début du profil
    const notch1PosY = (notchTopY + notchBottomY)/2 - profileHeight/2; // Centrer l'encoche en Y
    
    notch1.translate(0, notch1PosY, notch1PosZ);
    geometries.push(notch1);
    
    console.log(`   Notch 1 (début): Z=${notch1PosZ - notchDepth/2} to ${notch1PosZ + notchDepth/2}, Y=${notch1PosY - notchHeight/2} to ${notch1PosY + notchHeight/2}`);
    
    // NOTCH 2 : À la FIN du profil (Z positif)
    const notch2 = new THREE.BoxGeometry(
      notchWidth,    // X: largeur (traverse l'âme)
      notchHeight,   // Y: hauteur de l'encoche  
      notchDepth     // Z: profondeur de l'encoche
    );
    
    // Notch 2 doit être à l'extrémité droite (Z positif)
    const notch2PosZ = profileLength/2 - notchDepth/2; // Fin du profil
    const notch2PosY = (notchTopY + notchBottomY)/2 - profileHeight/2; // Même position Y que notch 1
    
    notch2.translate(0, notch2PosY, notch2PosZ);
    geometries.push(notch2);
    
    console.log(`   Notch 2 (fin): Z=${notch2PosZ - notchDepth/2} to ${notch2PosZ + notchDepth/2}, Y=${notch2PosY - notchHeight/2} to ${notch2PosY + notchHeight/2}`);
    
    // Fusionner les deux géométries
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    
    console.log(`✅ Created M1002 notch geometry (TWO NOTCHES):`);
    console.log(`   Total vertices: ${mergedGeometry.attributes.position?.count || 0}`);
    
    // Calculer et afficher les bounds pour vérification
    mergedGeometry.computeBoundingBox();
    if (mergedGeometry.boundingBox) {
      console.log(`   Combined bounds: (${mergedGeometry.boundingBox.min.x.toFixed(1)}, ${mergedGeometry.boundingBox.min.y.toFixed(1)}, ${mergedGeometry.boundingBox.min.z.toFixed(1)}) → (${mergedGeometry.boundingBox.max.x.toFixed(1)}, ${mergedGeometry.boundingBox.max.y.toFixed(1)}, ${mergedGeometry.boundingBox.max.z.toFixed(1)})`);
    }
    
    return mergedGeometry;
  }
  
  private calculateDefaultDepth(element: PivotElement): number {
    const dims = element.dimensions;
    if (dims?.webThickness) {
      return dims.webThickness;
    }
    if (dims?.thickness) {
      return dims.thickness;
    }
    return 25; // Profondeur par défaut
  }

  generateMetadata(feature: Feature, element: PivotElement): any {
    const baseMetadata = super.generateMetadata(feature, element);
    const params = feature.parameters as any;
    
    return {
      ...baseMetadata,
      handlerType: 'PartialNotchHandler',
      cutType: this.detectCutType(feature),
      pointsCount: params.points ? params.points.length : 0,
      hasExtension: this.hasExtension(params.points, element),
      estimatedVolume: this.estimateVolume(params, element)
    };
  }

  private hasExtension(points: any[], element: PivotElement): boolean {
    if (!points || !Array.isArray(points)) return false;
    
    const bounds = this.getContourBounds(points);
    const profileLength = element.dimensions?.length || 0;
    
    return profileLength > 0 && bounds.maxX > profileLength + 50;
  }

  private estimateVolume(params: any, element: PivotElement): number {
    if (params.points && Array.isArray(params.points)) {
      const bounds = this.getContourBounds(params.points);
      const depth = this.calculateDefaultDepth(element);
      return bounds.width * bounds.height * depth;
    }
    
    const width = params.width || 50;
    const height = params.height || 50;
    const depth = params.depth || this.calculateDefaultDepth(element);
    
    return width * height * depth;
  }
}