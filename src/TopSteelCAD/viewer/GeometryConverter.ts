/**
 * GeometryConverter - Convertit les PivotElement en géométries Three.js
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PivotElement, MaterialType } from '@/types/viewer';
import { FeatureApplicator } from './FeatureApplicator';

export class GeometryConverter {
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private featureApplicator: FeatureApplicator;
  
  constructor() {
    this.featureApplicator = new FeatureApplicator();
  }
  
  convertElement(element: PivotElement): THREE.Object3D {
    let geometry = this.createGeometry(element);
    
    // Appliquer les features si elles existent
    if (element.metadata?.features && element.metadata.features.length > 0) {
      geometry = this.featureApplicator.applyFeatures(geometry, element);
    }
    
    const material = this.createMaterial(element);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { element };
    return mesh;
  }
  
  createGeometry(element: PivotElement): THREE.BufferGeometry {
    const { materialType, dimensions } = element;
    
    switch (materialType) {
      case MaterialType.BEAM:
        return this.createBeamGeometry(dimensions, element.metadata);
        
      case MaterialType.PLATE:
        return this.createPlateGeometry(dimensions, element.metadata);
        
      case MaterialType.ANGLE:
        return this.createAngleGeometry(dimensions);
        
      case MaterialType.TUBE:
        console.log('🔧 Creating TUBE geometry with dimensions:', dimensions);
        return this.createTubeGeometry(dimensions);
        
      case MaterialType.CHANNEL:
        return this.createChannelGeometry(dimensions);
        
      case MaterialType.COLUMN:
        return this.createBeamGeometry(dimensions); // Les colonnes utilisent la même géométrie que les poutres
        
      default:
        // Géométrie de fallback simple sans warning
        return new THREE.BoxGeometry(
          dimensions?.width || 100,
          dimensions?.height || 100,
          dimensions?.length || 100
        );
    }
  }
  
  /**
   * Crée une géométrie de poutre en I (IPE, HEB, etc.)
   * Version optimisée pour le CSG avec des géométries simples
   */
  private createBeamGeometry(dimensions: any, metadata?: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(100, 100, 1000);
    
    const {
      length = 6000,
      height = 300,
      flangeThickness = 10.7,
      webThickness = 7.1,
      // Utiliser width d'abord, puis flangeWidth, puis valeur par défaut
      flangeWidth = dimensions.width || dimensions.flangeWidth || 150
    } = dimensions;
    
    // Vérifier si des contours sont définis (découpes sur les ailes)
    if (metadata?.contours && metadata.contours.length > 0) {
      // TODO: Implémenter les découpes sur les ailes
    }
    
    // Utiliser une approche par composition de BoxGeometry pour le CSG
    // Plus simple et plus robuste que ExtrudeGeometry
    return this.createBeamWithBoxes(length, height, flangeWidth, flangeThickness, webThickness);
  }
  
  /**
   * Crée une poutre en I avec des BoxGeometry fusionnées
   */
  private createBeamWithBoxes(
    length: number,
    height: number,
    flangeWidth: number,
    flangeThickness: number,
    webThickness: number
  ): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    
    // Orientation correcte : X=length, Y=height, Z=flangeWidth
    // Aile supérieure
    const topFlange = new THREE.BoxGeometry(length, flangeThickness, flangeWidth);
    topFlange.translate(0, (height - flangeThickness) / 2, 0);
    geometries.push(topFlange);
    
    // Aile inférieure  
    const bottomFlange = new THREE.BoxGeometry(length, flangeThickness, flangeWidth);
    bottomFlange.translate(0, -(height - flangeThickness) / 2, 0);
    geometries.push(bottomFlange);
    
    // Âme centrale
    const webHeight = height - 2 * flangeThickness;
    const web = new THREE.BoxGeometry(length, webHeight, webThickness);
    geometries.push(web);
    
    console.log(`🏗️ Created IPE beam: L=${length}, H=${height}, W=${flangeWidth}, webT=${webThickness}, flangeT=${flangeThickness}`);
    
    // Fusionner les géométries
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);
    
    // Nettoyer les géométries temporaires
    geometries.forEach(g => g.dispose());
    
    return mergedGeometry;
  }
  
  /**
   * Crée une géométrie de poutre en I (IPE, HEB, etc.) avec ExtrudeGeometry
   * Version originale pour fallback si nécessaire
   */
  private createBeamGeometryExtruded(dimensions: any): THREE.BufferGeometry {
    const {
      length = 6000,
      height = 300,
      // width = 150,
      flangeThickness = 10.7,
      webThickness = 7.1,
      flangeWidth = 150
    } = dimensions;
    
    // Créer la forme en I
    const shape = new THREE.Shape();
    
    // Dessiner le profil en I (vue de face)
    const hw = flangeWidth / 2;  // half width
    const hh = height / 2;  // half height
    const wt = webThickness / 2;  // half web thickness
    const ft = flangeThickness;  // flange thickness
    
    // Commencer en bas à gauche de la semelle inférieure
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);  // Bas de la semelle inférieure
    shape.lineTo(hw, -hh + ft);  // Haut de la semelle inférieure côté droit
    shape.lineTo(wt, -hh + ft);  // Jonction avec l'âme côté droit
    shape.lineTo(wt, hh - ft);  // Haut de l'âme côté droit
    shape.lineTo(hw, hh - ft);  // Jonction avec la semelle supérieure côté droit
    shape.lineTo(hw, hh);  // Haut de la semelle supérieure côté droit
    shape.lineTo(-hw, hh);  // Haut de la semelle supérieure côté gauche
    shape.lineTo(-hw, hh - ft);  // Bas de la semelle supérieure côté gauche
    shape.lineTo(-wt, hh - ft);  // Jonction avec l'âme côté gauche
    shape.lineTo(-wt, -hh + ft);  // Bas de l'âme côté gauche
    shape.lineTo(-hw, -hh + ft);  // Jonction avec la semelle inférieure côté gauche
    shape.closePath();
    
    // Extruder le long de la longueur
    // Augmenter les segments pour permettre les opérations CSG
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1,
      steps: Math.max(2, Math.ceil(length / 100)), // Plus de segments pour les longues poutres
      curveSegments: 12  // Plus de segments sur les courbes
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer la géométrie sur l'axe Z
    geometry.translate(0, 0, -length / 2);
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de plaque (avec support des contours)
   */
  private createPlateGeometry(dimensions: any, metadata?: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(400, 20, 400);
    
    const {
      length = 400,
      width = 400,
      thickness = 20
    } = dimensions;
    
    // Vérifier si un contour est défini
    if (metadata?.contour && Array.isArray(metadata.contour) && metadata.contour.length >= 3) {
      console.log(`🔺 Creating plate with custom contour (${metadata.contour.length} points)`);
      return this.createContourPlateGeometry(metadata.contour, thickness);
    }
    
    // BoxGeometry standard pour une plaque rectangulaire
    console.log(`📐 Creating rectangular plate geometry: ${length}x${thickness}x${width} (LxTxW)`);
    return new THREE.BoxGeometry(length, thickness, width);
  }
  
  /**
   * Crée une géométrie de plaque avec contour personnalisé
   */
  private createContourPlateGeometry(contourPoints: Array<[number, number]>, thickness: number): THREE.BufferGeometry {
    // Créer une forme (Shape) à partir des points du contour
    const shape = new THREE.Shape();
    
    // Déplacer au premier point
    shape.moveTo(contourPoints[0][0], contourPoints[0][1]);
    
    // Tracer les lignes vers les autres points
    for (let i = 1; i < contourPoints.length; i++) {
      shape.lineTo(contourPoints[i][0], contourPoints[i][1]);
    }
    
    // Fermer la forme si nécessaire
    const firstPoint = contourPoints[0];
    const lastPoint = contourPoints[contourPoints.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      shape.closePath();
    }
    
    // Paramètres d'extrusion pour donner de l'épaisseur
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };
    
    // Créer la géométrie extrudée
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Calculer le centre pour le centrage ET la symétrie
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    let centerOffset = { x: 0, y: 0 };
    if (boundingBox) {
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      
      // Stocker le décalage de centrage pour les markings
      centerOffset = { x: center.x, y: center.y };
      
      // Centrer la géométrie
      geometry.translate(-center.x, 0, -center.y);
      
      // Appliquer une symétrie (miroir) sur l'axe X pour inverser la pièce
      const mirrorMatrix = new THREE.Matrix4();
      mirrorMatrix.makeScale(-1, 1, 1); // Miroir sur X
      geometry.applyMatrix4(mirrorMatrix);
    }
    
    // Rotation pour orienter correctement (plaque horizontale)
    // Cette rotation transforme Y (vertical DSTV) en Z (profondeur Three.js)
    const matrix = new THREE.Matrix4();
    matrix.makeRotationX(-Math.PI / 2);
    geometry.applyMatrix4(matrix);
    
    // Après rotation, ajuster la position Y pour que la plaque soit au niveau 0
    // La plaque doit reposer sur le plan Y=0 (quadrillage)
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const minY = geometry.boundingBox.min.y;
      console.log(`📏 Bounding box after rotation: minY=${minY}, maxY=${geometry.boundingBox.max.y}`);
      
      // La pièce doit être positionnée de sorte que sa face inférieure soit juste au-dessus de Y=0
      // On veut que le bas de la pièce soit à Y=0
      if (minY !== 0) {
        const offsetY = -minY;
        geometry.translate(0, offsetY, 0);
        console.log(`⬆️ Adjusted Y position by ${offsetY} to place piece at grid level`);
      }
    }
    
    // Stocker le décalage et indiquer que la géométrie est inversée
    geometry.userData.centerOffset = centerOffset;
    geometry.userData.isMirrored = true;
    
    // Calculer les normales
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    // Ajouter des métadonnées
    geometry.userData = {
      type: 'CONTOUR_PLATE',
      thickness,
      contourPoints,
      pointCount: contourPoints.length
    };
    
    console.log(`✅ Created contour plate with ${contourPoints.length} vertices`);
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de cornière en L
   */
  private createAngleGeometry(dimensions: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(100, 100, 1000);
    
    const {
      length = 2000,
      width = 100,
      height = 100,
      thickness = 10
    } = dimensions;
    
    // Créer la forme en L
    const shape = new THREE.Shape();
    
    // Dessiner le profil en L (vue de face)
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, thickness);
    shape.lineTo(thickness, thickness);
    shape.lineTo(thickness, height);
    shape.lineTo(0, height);
    shape.closePath();
    
    // Extruder le long de la longueur
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer et orienter correctement
    geometry.translate(-width/2, -height/2, -length/2);
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de tube (circulaire ou rectangulaire)
   */
  private createTubeGeometry(dimensions: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(100, 100, 1000);
    
    const {
      length = 2000,
      width = 100,
      height = 100,
      diameter = 100,
      thickness = 5,
      webThickness = 5,
      flangeThickness = 5
    } = dimensions;
    
    // Déterminer si c'est un tube rectangulaire ou circulaire
    // Un tube est rectangulaire si:
    // 1. width et height sont définis et > 0
    // 2. ET diameter n'est pas défini ou égal à 0
    // 3. OU si width !== height (tubes rectangulaires non carrés)
    const isRectangular = (width > 0 && height > 0 && (!diameter || diameter === 0)) || 
                         (width > 0 && height > 0 && width !== height);
    
    // L'épaisseur doit être celle des parois, pas la largeur/hauteur!
    const actualThickness = thickness || webThickness || flangeThickness || 5;
    
    console.log('🔍 TUBE Detection:', {
      width,
      height,
      diameter,
      thickness: actualThickness,
      webThickness,
      flangeThickness,
      isRectangular,
      reason: isRectangular ? 'Rectangular tube' : 'Circular tube'
    });
    
    if (isRectangular) {
      // Tube rectangulaire/carré
      
      // Créer le tube rectangulaire avec épaisseur
      const outerShape = new THREE.Shape();
      outerShape.moveTo(-width/2, -height/2);
      outerShape.lineTo(width/2, -height/2);
      outerShape.lineTo(width/2, height/2);
      outerShape.lineTo(-width/2, height/2);
      outerShape.closePath();
      
      // Créer le trou intérieur (parois d'épaisseur actualThickness)
      const innerWidth = width - 2 * actualThickness;
      const innerHeight = height - 2 * actualThickness;
      
      console.log('📏 Tube rect dimensions:', {
        outer: `${width}x${height}`,
        inner: `${innerWidth}x${innerHeight}`,
        wallThickness: actualThickness
      });
      
      if (innerWidth > 0 && innerHeight > 0) {
        const hole = new THREE.Path();
        hole.moveTo(-innerWidth/2, -innerHeight/2);
        hole.lineTo(innerWidth/2, -innerHeight/2);
        hole.lineTo(innerWidth/2, innerHeight/2);
        hole.lineTo(-innerWidth/2, innerHeight/2);
        hole.closePath();
        outerShape.holes.push(hole);
      }
      
      // Extruder la forme
      const extrudeSettings = {
        depth: length,
        bevelEnabled: false
      };
      
      const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
      geometry.translate(0, 0, -length/2);
      
      return geometry;
    } else {
      // Tube circulaire
      // Utiliser diameter si défini, sinon utiliser width ou height (pour tubes carrés)
      const effectiveDiameter = diameter || width || height || 100;
      const outerRadius = effectiveDiameter / 2;
      // const innerRadius = outerRadius - thickness; // Currently unused
      
      const geometry = new THREE.CylinderGeometry(
        outerRadius,
        outerRadius,
        length,
        32,
        1,
        false
      );
      
      // Rotation pour avoir la longueur selon Z
      geometry.rotateX(Math.PI / 2);
      
      return geometry;
    }
  }
  
  /**
   * Crée une géométrie de U (UPN)
   */
  private createChannelGeometry(dimensions: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(100, 200, 1000);
    
    const {
      length = 2000,
      width = 100,
      height = 200,
      thickness = 10
    } = dimensions;
    
    // Créer la forme en U
    const shape = new THREE.Shape();
    
    // Dessiner le profil en U (vue de face)
    const hw = width / 2;
    const hh = height / 2;
    
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, -hh + thickness);
    shape.lineTo(-hw + thickness, -hh + thickness);
    shape.lineTo(-hw + thickness, hh - thickness);
    shape.lineTo(hw, hh - thickness);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();
    
    // Extruder le long de la longueur
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer la géométrie
    geometry.translate(0, 0, -length / 2);
    
    return geometry;
  }
  
  createMaterial(element: PivotElement): THREE.Material {
    const { material } = element;
    
    if (!material) {
      return new THREE.MeshStandardMaterial({
        color: 0x8b9dc3,
        metalness: 0.7,
        roughness: 0.3
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: material.color || '#8b9dc3',
      metalness: material.metallic || 0.7,
      roughness: material.roughness || 0.3,
      opacity: material.opacity || 1,
      transparent: (material.opacity || 1) < 1
    });
  }
  
  clearCache(): void {
    this.geometryCache.forEach(geom => geom.dispose());
    this.geometryCache.clear();
  }
  
  dispose(): void {
    this.clearCache();
    this.featureApplicator.dispose();
  }
}