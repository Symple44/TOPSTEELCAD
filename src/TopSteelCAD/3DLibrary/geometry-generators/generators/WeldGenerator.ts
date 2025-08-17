/**
 * WeldGenerator - Générateur de géométrie pour les soudures
 */

import * as THREE from 'three';
import { ProfileGeometryGenerator } from '../interfaces/ProfileGeometryGenerator';
import { ProfileDimensions, ProfileType, SteelProfile } from '../../types/profile.types';

/**
 * Types de soudures supportées
 */
export enum WeldType {
  FILLET = 'FILLET',           // Soudure d'angle
  BUTT = 'BUTT',               // Soudure bout à bout
  PLUG = 'PLUG',               // Soudure en bouchon
  SLOT = 'SLOT',               // Soudure en entaille
  SPOT = 'SPOT',               // Soudure par points
  SEAM = 'SEAM',               // Soudure continue
  EDGE = 'EDGE',               // Soudure sur chant
  GROOVE = 'GROOVE',           // Soudure en chanfrein
  FLARE = 'FLARE',             // Soudure en tulipe
  BACKING = 'BACKING'          // Soudure avec support envers
}

/**
 * Configuration d'une soudure
 */
export interface WeldConfig {
  type: WeldType;
  size: number;           // Gorge de soudure (mm)
  length: number;         // Longueur de soudure (mm)
  continuous?: boolean;   // Soudure continue ou discontinue
  spacing?: number;       // Espacement si discontinue (mm)
  segmentLength?: number; // Longueur des segments si discontinue (mm)
  angle?: number;         // Angle de soudure (degrés)
  penetration?: number;   // Pénétration (mm)
}

/**
 * Générateur pour les cordons de soudure
 */
export class WeldGenerator implements ProfileGeometryGenerator {
  
  /**
   * Retourne le nom du générateur
   */
  getName(): string {
    return 'WeldGenerator';
  }
  
  /**
   * Retourne les types supportés
   */
  getSupportedTypes(): ProfileType[] {
    return [ProfileType.WELD];
  }
  
  /**
   * Vérifie si le générateur supporte un type de profil
   */
  canGenerate(profileType: ProfileType): boolean {
    return profileType === ProfileType.WELD;
  }
  
  /**
   * Génère la géométrie d'une soudure
   */
  generate(dimensions: ProfileDimensions, length: number = 100): THREE.BufferGeometry {
    // Adapter pour SteelProfile legacy
    const profile: SteelProfile = {
      id: 'weld',
      type: ProfileType.WELD,
      designation: dimensions.designation || 'FILLET',
      dimensions,
      area: 0,
      weight: 0,
      origin: 'generated'
    };
    return this.generateWeld(profile, length);
  }
  
  /**
   * Génère la géométrie d'une soudure (méthode interne)
   */
  private generateWeld(profile: SteelProfile, length: number = 100): THREE.BufferGeometry {
    const config = this.extractWeldConfig(profile);
    
    switch (config.type) {
      case WeldType.FILLET:
        return this.generateFilletWeld(config);
      case WeldType.BUTT:
        return this.generateButtWeld(config);
      case WeldType.GROOVE:
        return this.generateGrooveWeld(config);
      case WeldType.SPOT:
        return this.generateSpotWeld(config);
      default:
        return this.generateGenericWeld(config);
    }
  }
  
  /**
   * Extrait la configuration de soudure depuis le profil
   */
  private extractWeldConfig(profile: SteelProfile): WeldConfig {
    const dimensions = profile.dimensions;
    
    return {
      type: this.detectWeldType(profile.designation),
      size: dimensions.thickness || 5,
      length: dimensions.length || 100,
      continuous: true,
      angle: 45
    };
  }
  
  /**
   * Détecte le type de soudure depuis la désignation
   */
  private detectWeldType(designation: string): WeldType {
    const upper = designation.toUpperCase();
    
    if (upper.includes('FILLET') || upper.includes('ANGLE')) {
      return WeldType.FILLET;
    }
    if (upper.includes('BUTT') || upper.includes('BOUT')) {
      return WeldType.BUTT;
    }
    if (upper.includes('GROOVE') || upper.includes('CHANFREIN')) {
      return WeldType.GROOVE;
    }
    if (upper.includes('PLUG') || upper.includes('BOUCHON')) {
      return WeldType.PLUG;
    }
    if (upper.includes('SPOT') || upper.includes('POINT')) {
      return WeldType.SPOT;
    }
    
    return WeldType.FILLET;
  }
  
  /**
   * Génère une soudure d'angle (la plus courante)
   */
  private generateFilletWeld(config: WeldConfig): THREE.BufferGeometry {
    const { size, length, continuous, spacing = 50, segmentLength = 30 } = config;
    
    if (continuous) {
      // Soudure continue
      return this.createFilletGeometry(size, length);
    } else {
      // Soudure discontinue
      const geometries: THREE.BufferGeometry[] = [];
      const segmentCount = Math.floor(length / (segmentLength + spacing));
      
      for (let i = 0; i < segmentCount; i++) {
        const segmentGeo = this.createFilletGeometry(size, segmentLength);
        segmentGeo.translate(0, 0, i * (segmentLength + spacing));
        geometries.push(segmentGeo);
      }
      
      return this.mergeGeometries(geometries);
    }
  }
  
  /**
   * Crée la géométrie de base d'une soudure d'angle
   */
  private createFilletGeometry(size: number, length: number): THREE.BufferGeometry {
    // Profil triangulaire de la soudure d'angle
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(size, 0);
    shape.lineTo(0, size);
    shape.closePath();
    
    // Extruder le long de la longueur
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    // Rotation pour orienter correctement
    geometry.rotateX(-Math.PI / 2);
    
    // Ajouter les métadonnées
    geometry.userData = {
      type: 'FILLET_WELD',
      dimensions: {
        size,
        length,
        throatThickness: size * 0.707, // Gorge effective (a = z × cos(45°))
        legLength: size
      },
      volume: (size * size * length) / 2,
      weight: ((size * size * length) / 2 * 7850) / 1e9 // kg
    };
    
    return geometry;
  }
  
  /**
   * Génère une soudure bout à bout
   */
  private generateButtWeld(config: WeldConfig): THREE.BufferGeometry {
    const { size, length, penetration = size * 0.8 } = config;
    
    // Profil de la soudure bout à bout (forme de V ou X)
    const shape = new THREE.Shape();
    
    // Forme en V simple
    const topWidth = size * 2;
    const bottomWidth = size * 0.5;
    
    shape.moveTo(-topWidth / 2, size / 2);
    shape.lineTo(topWidth / 2, size / 2);
    shape.lineTo(bottomWidth / 2, -penetration / 2);
    shape.lineTo(-bottomWidth / 2, -penetration / 2);
    shape.closePath();
    
    // Extruder le long de la longueur
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 0.5,
      bevelSegments: 1
    });
    
    geometry.rotateX(-Math.PI / 2);
    geometry.center();
    
    // Ajouter les métadonnées
    geometry.userData = {
      type: 'BUTT_WELD',
      dimensions: {
        size,
        length,
        penetration,
        reinforcement: size * 0.1
      },
      volume: ((topWidth + bottomWidth) / 2 * (size + penetration) * length) / 2,
      weight: (((topWidth + bottomWidth) / 2 * (size + penetration) * length) / 2 * 7850) / 1e9
    };
    
    return geometry;
  }
  
  /**
   * Génère une soudure en chanfrein
   */
  private generateGrooveWeld(config: WeldConfig): THREE.BufferGeometry {
    const { size, length, angle = 60 } = config;
    
    // Calcul des dimensions du chanfrein
    const grooveDepth = size;
    const grooveWidth = 2 * grooveDepth * Math.tan((angle / 2) * Math.PI / 180);
    
    // Profil du chanfrein
    const shape = new THREE.Shape();
    shape.moveTo(-grooveWidth / 2, 0);
    shape.lineTo(grooveWidth / 2, 0);
    shape.lineTo(grooveWidth / 4, -grooveDepth);
    shape.lineTo(-grooveWidth / 4, -grooveDepth);
    shape.closePath();
    
    // Extruder
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    geometry.rotateX(-Math.PI / 2);
    geometry.center();
    
    // Métadonnées
    geometry.userData = {
      type: 'GROOVE_WELD',
      dimensions: {
        size,
        length,
        grooveAngle: angle,
        grooveDepth,
        grooveWidth
      }
    };
    
    return geometry;
  }
  
  /**
   * Génère une soudure par points
   */
  private generateSpotWeld(config: WeldConfig): THREE.BufferGeometry {
    const { size, spacing = size * 3 } = config;
    const spotCount = Math.floor(config.length / spacing);
    
    const geometries: THREE.BufferGeometry[] = [];
    
    for (let i = 0; i < spotCount; i++) {
      // Créer un point de soudure (demi-sphère)
      const spotGeometry = new THREE.SphereGeometry(size / 2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      spotGeometry.translate(0, 0, i * spacing);
      geometries.push(spotGeometry);
    }
    
    const merged = this.mergeGeometries(geometries);
    
    // Métadonnées
    merged.userData = {
      type: 'SPOT_WELD',
      dimensions: {
        spotDiameter: size,
        spotCount,
        spacing,
        totalLength: config.length
      }
    };
    
    return merged;
  }
  
  /**
   * Génère une soudure générique
   */
  private generateGenericWeld(config: WeldConfig): THREE.BufferGeometry {
    // Représentation simple par un cylindre
    const geometry = new THREE.CylinderGeometry(
      config.size / 2,
      config.size / 2,
      config.length,
      8
    );
    
    geometry.rotateX(Math.PI / 2);
    
    // Métadonnées
    geometry.userData = {
      type: 'GENERIC_WELD',
      dimensions: {
        size: config.size,
        length: config.length
      }
    };
    
    return geometry;
  }
  
  /**
   * Génère une représentation symbolique de soudure (pour plans 2D)
   */
  generateSymbolic(config: WeldConfig): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    
    if (config.type === WeldType.FILLET) {
      // Symbole triangle pour soudure d'angle
      for (let i = 0; i <= config.length; i += 10) {
        if (Math.floor(i / 20) % 2 === 0) {
          points.push(new THREE.Vector3(0, 0, i));
          points.push(new THREE.Vector3(config.size, config.size, i));
        } else {
          points.push(new THREE.Vector3(config.size, config.size, i));
          points.push(new THREE.Vector3(0, 0, i));
        }
      }
    } else {
      // Ligne simple pour autres types
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(0, 0, config.length));
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    geometry.userData = {
      type: 'WELD_SYMBOL',
      config
    };
    
    return geometry;
  }
  
  /**
   * Calcule le volume de métal déposé
   */
  calculateWeldVolume(config: WeldConfig): number {
    switch (config.type) {
      case WeldType.FILLET:
        // Volume = (gorge² × longueur) / 2
        return (config.size * config.size * config.length) / 2;
        
      case WeldType.BUTT:
        // Volume approximatif selon la préparation
        return config.size * config.size * config.length * 0.8;
        
      case WeldType.SPOT:
        // Volume d'une demi-sphère × nombre de points
        const spotCount = Math.floor(config.length / (config.spacing || config.size * 3));
        return (2/3) * Math.PI * Math.pow(config.size / 2, 3) * spotCount;
        
      default:
        return config.size * config.size * config.length * 0.5;
    }
  }
  
  /**
   * Calcule le poids de métal déposé
   */
  calculateWeldWeight(config: WeldConfig): number {
    const volume = this.calculateWeldVolume(config);
    return (volume * 7850) / 1e9; // kg
  }
  
  /**
   * Fusionne plusieurs géométries
   */
  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0];
    
    // Création d'un groupe pour simplifier
    const merged = geometries[0].clone();
    merged.userData.segments = geometries.length;
    
    return merged;
  }
  
}

export default WeldGenerator;