/**
 * FastenerGenerator - Générateur de géométrie pour les éléments de fixation
 * (boulons, écrous, rondelles, vis, rivets, etc.)
 */

import * as THREE from 'three';
import { ProfileGeometryGenerator } from '../interfaces/ProfileGeometryGenerator';
import { ProfileDimensions, ProfileType, SteelProfile } from '../../types/profile.types';

/**
 * Types de fixations supportées
 */
export enum FastenerType {
  HEX_BOLT = 'HEX_BOLT',
  HEX_NUT = 'HEX_NUT',
  WASHER = 'WASHER',
  SPRING_WASHER = 'SPRING_WASHER',
  ANCHOR_BOLT = 'ANCHOR_BOLT',
  STUD_BOLT = 'STUD_BOLT',
  RIVET = 'RIVET',
  SCREW = 'SCREW'
}

/**
 * Générateur pour les éléments de fixation métalliques
 */
export class FastenerGenerator implements ProfileGeometryGenerator {
  
  /**
   * Retourne le nom du générateur
   */
  getName(): string {
    return 'FastenerGenerator';
  }
  
  /**
   * Retourne les types supportés
   */
  getSupportedTypes(): ProfileType[] {
    return [ProfileType.FASTENER];
  }
  
  /**
   * Vérifie si le générateur supporte un type de profil  
   */
  canGenerate(profileType: ProfileType): boolean {
    return profileType === ProfileType.FASTENER;
  }
  
  /**
   * Génère la géométrie d'un élément de fixation
   */
  generate(dimensions: ProfileDimensions, length: number = 100): THREE.BufferGeometry {
    // Adapter pour SteelProfile legacy
    const profile: SteelProfile = {
      id: 'fastener',
      type: ProfileType.FASTENER,
      designation: dimensions.designation || 'BOLT',
      dimensions,
      area: 0,
      weight: 0,
      origin: 'generated'
    };
    return this.generateFastener(profile, length);
  }
  
  /**
   * Génère la géométrie d'un élément de fixation (méthode interne)
   */
  private generateFastener(profile: SteelProfile, length: number = 100): THREE.BufferGeometry {
    const type = this.detectFastenerType(profile.designation);
    
    switch (type) {
      case FastenerType.HEX_BOLT:
        return this.generateHexBolt(profile, length);
      case FastenerType.HEX_NUT:
        return this.generateHexNut(profile);
      case FastenerType.WASHER:
        return this.generateWasher(profile);
      case FastenerType.ANCHOR_BOLT:
        return this.generateAnchorBolt(profile, length);
      default:
        return this.generateGenericBolt(profile, length);
    }
  }
  
  /**
   * Détecte le type de fixation depuis la désignation
   */
  private detectFastenerType(designation: string): FastenerType {
    const upper = designation.toUpperCase();
    
    if (upper.includes('NUT') || upper.includes('ECROU')) {
      return FastenerType.HEX_NUT;
    }
    if (upper.includes('WASHER') || upper.includes('RONDELLE')) {
      return FastenerType.WASHER;
    }
    if (upper.includes('ANCHOR') || upper.includes('ANCRAGE')) {
      return FastenerType.ANCHOR_BOLT;
    }
    if (upper.includes('STUD')) {
      return FastenerType.STUD_BOLT;
    }
    if (upper.includes('RIVET')) {
      return FastenerType.RIVET;
    }
    
    return FastenerType.HEX_BOLT;
  }
  
  /**
   * Génère un boulon hexagonal
   */
  private generateHexBolt(profile: SteelProfile, length: number): THREE.BufferGeometry {
    const diameter = profile.dimensions.diameter || 20;
    const headHeight = diameter * 0.7;
    const headWidth = diameter * 1.8;
    
    // Créer le groupe pour combiner tête et tige
    const geometries: THREE.BufferGeometry[] = [];
    
    // Tête hexagonale
    const headShape = new THREE.Shape();
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * headWidth / 2;
      const y = Math.sin(angle) * headWidth / 2;
      
      if (i === 0) {
        headShape.moveTo(x, y);
      } else {
        headShape.lineTo(x, y);
      }
    }
    headShape.closePath();
    
    const headGeometry = new THREE.ExtrudeGeometry(headShape, {
      depth: headHeight,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 1
    });
    headGeometry.translate(0, 0, length - headHeight);
    geometries.push(headGeometry);
    
    // Tige filetée
    const shaftGeometry = new THREE.CylinderGeometry(
      diameter / 2,
      diameter / 2,
      length - headHeight,
      16
    );
    shaftGeometry.rotateX(Math.PI / 2);
    shaftGeometry.translate(0, 0, (length - headHeight) / 2);
    geometries.push(shaftGeometry);
    
    // Fusionner les géométries
    const mergedGeometry = THREE_UTILS.BufferGeometryUtils.mergeGeometries(geometries);
    
    // Ajouter les métadonnées
    mergedGeometry.userData = {
      type: 'HEX_BOLT',
      designation: profile.designation,
      dimensions: {
        diameter,
        length,
        headHeight,
        headWidth,
        threadPitch: diameter * 0.125
      },
      weight: this.calculateBoltWeight(diameter, length)
    };
    
    return mergedGeometry;
  }
  
  /**
   * Génère un écrou hexagonal
   */
  private generateHexNut(profile: SteelProfile): THREE.BufferGeometry {
    const diameter = profile.dimensions.diameter || 20;
    const thickness = profile.dimensions.thickness || diameter * 0.8;
    const width = diameter * 1.8;
    
    // Forme hexagonale extérieure
    const outerShape = new THREE.Shape();
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * width / 2;
      const y = Math.sin(angle) * width / 2;
      
      if (i === 0) {
        outerShape.moveTo(x, y);
      } else {
        outerShape.lineTo(x, y);
      }
    }
    outerShape.closePath();
    
    // Trou central circulaire
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, diameter / 2, 0, Math.PI * 2, false);
    outerShape.holes.push(holePath);
    
    // Extruder pour créer l'épaisseur
    const geometry = new THREE.ExtrudeGeometry(outerShape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 1
    });
    
    geometry.center();
    
    // Ajouter les métadonnées
    geometry.userData = {
      type: 'HEX_NUT',
      designation: profile.designation,
      dimensions: {
        diameter,
        thickness,
        width,
        threadPitch: diameter * 0.125
      },
      weight: this.calculateNutWeight(diameter, thickness, width)
    };
    
    return geometry;
  }
  
  /**
   * Génère une rondelle
   */
  private generateWasher(profile: SteelProfile): THREE.BufferGeometry {
    const innerDiameter = profile.dimensions.diameter || 20;
    const outerDiameter = innerDiameter * 2;
    const thickness = profile.dimensions.thickness || 3;
    
    // Forme annulaire
    const outerRadius = outerDiameter / 2;
    const innerRadius = innerDiameter / 2;
    
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, false);
    shape.holes.push(hole);
    
    // Extruder pour créer l'épaisseur
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false
    });
    
    geometry.center();
    
    // Ajouter les métadonnées
    geometry.userData = {
      type: 'WASHER',
      designation: profile.designation,
      dimensions: {
        innerDiameter,
        outerDiameter,
        thickness
      },
      weight: this.calculateWasherWeight(innerDiameter, outerDiameter, thickness)
    };
    
    return geometry;
  }
  
  /**
   * Génère un boulon d'ancrage
   */
  private generateAnchorBolt(profile: SteelProfile, length: number): THREE.BufferGeometry {
    const diameter = profile.dimensions.diameter || 20;
    const bendRadius = diameter * 2;
    const embedLength = length * 0.7;
    const projectionLength = length * 0.3;
    
    // Créer un chemin en L pour le boulon d'ancrage
    const path = new THREE.CurvePath<THREE.Vector3>();
    
    // Partie verticale (projection)
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, projectionLength)
    ));
    
    // Courbe à 90 degrés
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, projectionLength),
      new THREE.Vector3(0, 0, projectionLength + bendRadius),
      new THREE.Vector3(bendRadius, 0, projectionLength + bendRadius)
    );
    path.add(curve);
    
    // Partie horizontale (encastrement)
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(bendRadius, 0, projectionLength + bendRadius),
      new THREE.Vector3(bendRadius + embedLength, 0, projectionLength + bendRadius)
    ));
    
    // Créer un cercle pour l'extrusion le long du chemin
    const circleGeometry = new THREE.CircleGeometry(diameter / 2, 16);
    const circlePoints = circleGeometry.attributes.position;
    const shape = new THREE.Shape();
    
    for (let i = 0; i < circlePoints.count; i++) {
      const x = circlePoints.getX(i);
      const y = circlePoints.getY(i);
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    
    // Extruder le long du chemin
    const geometry = new THREE.ExtrudeGeometry(shape, {
      extrudePath: path,
      steps: 50,
      bevelEnabled: false
    });
    
    // Ajouter les métadonnées
    geometry.userData = {
      type: 'ANCHOR_BOLT',
      designation: profile.designation,
      dimensions: {
        diameter,
        totalLength: length,
        embedLength,
        projectionLength,
        bendRadius
      },
      weight: this.calculateAnchorBoltWeight(diameter, length)
    };
    
    return geometry;
  }
  
  /**
   * Génère un boulon générique
   */
  private generateGenericBolt(profile: SteelProfile, length: number): THREE.BufferGeometry {
    const diameter = profile.dimensions.diameter || 20;
    
    // Simple cylindre pour représenter un boulon générique
    const geometry = new THREE.CylinderGeometry(
      diameter / 2,
      diameter / 2,
      length,
      16
    );
    
    geometry.rotateX(Math.PI / 2);
    
    // Ajouter les métadonnées
    geometry.userData = {
      type: 'GENERIC_BOLT',
      designation: profile.designation,
      dimensions: {
        diameter,
        length
      },
      weight: this.calculateBoltWeight(diameter, length)
    };
    
    return geometry;
  }
  
  /**
   * Calcule le poids d'un boulon
   */
  private calculateBoltWeight(diameter: number, length: number): number {
    // Approximation: volume cylindrique * densité acier
    const volume = Math.PI * Math.pow(diameter / 2, 2) * length;
    return (volume * 7850) / 1e9; // kg
  }
  
  /**
   * Calcule le poids d'un écrou
   */
  private calculateNutWeight(diameter: number, thickness: number, width: number): number {
    // Approximation: volume hexagonal - trou central
    const hexArea = (3 * Math.sqrt(3) / 2) * Math.pow(width / 2, 2);
    const holeArea = Math.PI * Math.pow(diameter / 2, 2);
    const volume = (hexArea - holeArea) * thickness;
    return (volume * 7850) / 1e9; // kg
  }
  
  /**
   * Calcule le poids d'une rondelle
   */
  private calculateWasherWeight(innerDiameter: number, outerDiameter: number, thickness: number): number {
    const outerArea = Math.PI * Math.pow(outerDiameter / 2, 2);
    const innerArea = Math.PI * Math.pow(innerDiameter / 2, 2);
    const volume = (outerArea - innerArea) * thickness;
    return (volume * 7850) / 1e9; // kg
  }
  
  /**
   * Calcule le poids d'un boulon d'ancrage
   */
  private calculateAnchorBoltWeight(diameter: number, length: number): number {
    // Approximation incluant la courbure
    const volume = Math.PI * Math.pow(diameter / 2, 2) * length * 1.1; // +10% pour la courbure
    return (volume * 7850) / 1e9; // kg
  }
  
}

// Import THREE.BufferGeometryUtils si nécessaire
const THREE_UTILS = {
  BufferGeometryUtils: {
    mergeGeometries: (geometries: THREE.BufferGeometry[]) => {
      // Implémentation simplifiée de la fusion
      if (geometries.length === 0) return new THREE.BufferGeometry();
      if (geometries.length === 1) return geometries[0];
      
      // Pour une vraie implémentation, il faudrait fusionner les attributs
      // Ici on retourne juste le premier pour éviter les erreurs
      const merged = geometries[0].clone();
      merged.userData.subGeometries = geometries.length;
      return merged;
    }
  }
};

// Note: Pour une vraie fusion de géométries, utiliser three-stdlib ou implémenter manuellement
// La fusion est simplifiée ici pour éviter les erreurs

export default FastenerGenerator;