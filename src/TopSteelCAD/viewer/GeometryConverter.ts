/**
 * GeometryConverter - Convertit les PivotElement en géométries Three.js
 */
import * as THREE from 'three';
import { PivotElement, MaterialType } from '@/types/viewer';

export class GeometryConverter {
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  
  convertElement(element: PivotElement): THREE.Object3D {
    const geometry = this.createGeometry(element);
    const material = this.createMaterial(element);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { element };
    return mesh;
  }
  
  createGeometry(element: PivotElement): THREE.BufferGeometry {
    const { materialType, dimensions } = element;
    
    switch (materialType) {
      case MaterialType.BEAM:
        return this.createBeamGeometry(dimensions);
        
      case MaterialType.PLATE:
        return this.createPlateGeometry(dimensions);
        
      case MaterialType.ANGLE:
        return this.createAngleGeometry(dimensions);
        
      case MaterialType.TUBE:
        return this.createTubeGeometry(dimensions);
        
      case MaterialType.CHANNEL:
        return this.createChannelGeometry(dimensions);
        
      default:
        console.warn(`Type de matériau non supporté: ${materialType}`);
        return new THREE.BoxGeometry(
          dimensions?.width || 100,
          dimensions?.height || 100,
          dimensions?.length || 100
        );
    }
  }
  
  /**
   * Crée une géométrie de poutre en I (IPE, HEB, etc.)
   */
  private createBeamGeometry(dimensions: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(100, 100, 1000);
    
    const {
      length = 6000,
      height = 300,
      width = 150,
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
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer la géométrie sur l'axe Z
    geometry.translate(0, 0, -length / 2);
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de plaque
   */
  private createPlateGeometry(dimensions: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(400, 20, 400);
    
    const {
      length = 400,
      width = 400,
      thickness = 20
    } = dimensions;
    
    return new THREE.BoxGeometry(width, thickness, length);
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
   * Crée une géométrie de tube
   */
  private createTubeGeometry(dimensions: any): THREE.BufferGeometry {
    if (!dimensions) return new THREE.BoxGeometry(100, 100, 1000);
    
    const {
      length = 2000,
      diameter = 100,
      thickness = 5
    } = dimensions;
    
    // Tube circulaire simplifié
    const outerRadius = diameter / 2;
    const innerRadius = outerRadius - thickness;
    
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
  }
}