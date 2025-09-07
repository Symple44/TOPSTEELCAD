/**
 * PlateGenerator - Générateur de géométrie pour les plaques et tôles métalliques
 */

import * as THREE from 'three';
import { ProfileGeometryGenerator } from '../interfaces/ProfileGeometryGenerator';
import { ProfileDimensions, ProfileType, SteelProfile } from '../../types/profile.types';

/**
 * Générateur pour les plaques et tôles métalliques
 */
export class PlateGenerator implements ProfileGeometryGenerator {
  
  /**
   * Retourne le nom du générateur
   */
  getName(): string {
    return 'PlateGenerator';
  }
  
  /**
   * Retourne les types supportés
   */
  getSupportedTypes(): ProfileType[] {
    return [ProfileType.PLATE];
  }
  
  /**
   * Vérifie si le générateur supporte un type de profil
   */
  canGenerate(profileType: ProfileType): boolean {
    return profileType === ProfileType.PLATE;
  }
  
  /**
   * Génère la géométrie d'une plaque
   */
  generate(dimensions: ProfileDimensions, length: number = 1000): THREE.BufferGeometry {
    // Adapter pour SteelProfile legacy
    const profile: SteelProfile = {
      id: 'plate',
      type: ProfileType.PLATE,
      designation: dimensions.designation || 'PLATE',
      dimensions,
      area: 0,
      weight: 0,
      origin: 'generated'
    };
    return this.generatePlate(profile, length);
  }
  
  /**
   * Génère la géométrie d'une plaque (méthode interne)
   */
  private generatePlate(profile: SteelProfile, length: number = 1000): THREE.BufferGeometry {
    // Extraire les dimensions
    // Pour une plaque DSTV : length = longueur, width = largeur, thickness = épaisseur
    const plateLength = length;  // Utiliser directement le paramètre length passé (150mm pour F1003)
    const plateWidth = profile.dimensions.width || 100;
    const plateThickness = profile.dimensions.thickness || 10;
    
    // Pour une plaque horizontale : X = longueur, Y = épaisseur, Z = largeur
    // Cela place la plaque à plat dans le plan XZ avec l'épaisseur en Y
    const geometry = new THREE.BoxGeometry(plateLength, plateThickness, plateWidth);
    
    // Ajouter des métadonnées
    geometry.userData = {
      profile: profile.designation,
      type: 'PLATE',
      dimensions: {
        length: plateLength,
        width: plateWidth,
        thickness: plateThickness,
        area: plateWidth * plateThickness, // Aire de section transversale (largeur × épaisseur)
        volume: plateLength * plateWidth * plateThickness,
        weight: (plateLength * plateWidth * plateThickness * 7850) / 1e9 // kg (densité acier = 7850 kg/m³)
      }
    };
    
    return geometry;
  }
  
  /**
   * Génère la géométrie d'une plaque avec trous
   */
  generateWithHoles(
    profile: SteelProfile, 
    length: number = 1000,
    holes: Array<{ x: number; y: number; diameter: number }>
  ): THREE.BufferGeometry {
    // Créer la géométrie de base
    const baseGeometry = this.generatePlate(profile, length);
    
    // Pour une vraie soustraction, on devrait utiliser CSG
    // Pour l'instant, on ajoute juste les métadonnées des trous
    baseGeometry.userData.holes = holes;
    
    return baseGeometry;
  }
  
  /**
   * Génère la géométrie d'une plaque avec découpe personnalisée
   */
  generateWithCutout(
    profile: SteelProfile,
    length: number = 1000,
    cutoutPath: THREE.Vector2[]
  ): THREE.BufferGeometry {
    const width = profile.dimensions.width || 1000;
    const thickness = profile.dimensions.thickness || 10;
    
    // Créer une forme à partir du chemin de découpe
    const shape = new THREE.Shape();
    
    if (cutoutPath.length > 0) {
      shape.moveTo(cutoutPath[0].x, cutoutPath[0].y);
      for (let i = 1; i < cutoutPath.length; i++) {
        shape.lineTo(cutoutPath[i].x, cutoutPath[i].y);
      }
      shape.closePath();
    } else {
      // Forme rectangulaire par défaut
      shape.moveTo(-width / 2, -length / 2);
      shape.lineTo(width / 2, -length / 2);
      shape.lineTo(width / 2, length / 2);
      shape.lineTo(-width / 2, length / 2);
      shape.closePath();
    }
    
    // Extruder la forme pour créer la plaque
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: thickness,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer la géométrie
    geometry.center();
    
    // Ajouter les métadonnées
    geometry.userData = {
      profile: profile.designation,
      type: 'PLATE_WITH_CUTOUT',
      dimensions: {
        width,
        thickness,
        length,
        cutoutPath
      }
    };
    
    return geometry;
  }
  
  /**
   * Génère une plaque pliée (tôle pliée)
   */
  generateBentPlate(
    profile: SteelProfile,
    segments: Array<{ length: number; angle: number }>
  ): THREE.BufferGeometry {
    const width = profile.dimensions.width || 1000;
    const thickness = profile.dimensions.thickness || 10;
    
    // Créer un chemin pour la tôle pliée
    const path = new THREE.CurvePath<THREE.Vector3>();
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentAngle = 0;
    
    segments.forEach(segment => {
      const endPos = new THREE.Vector3(
        currentPos.x + segment.length * Math.cos(currentAngle),
        currentPos.y + segment.length * Math.sin(currentAngle),
        0
      );
      
      path.add(new THREE.LineCurve3(currentPos.clone(), endPos));
      
      currentPos = endPos;
      currentAngle += segment.angle * Math.PI / 180;
    });
    
    // Créer un profil rectangulaire pour l'extrusion
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -thickness / 2);
    shape.lineTo(width / 2, -thickness / 2);
    shape.lineTo(width / 2, thickness / 2);
    shape.lineTo(-width / 2, thickness / 2);
    shape.closePath();
    
    // Extruder le long du chemin
    const geometry = new THREE.ExtrudeGeometry(shape, {
      extrudePath: path,
      steps: segments.length * 10,
      bevelEnabled: false
    });
    
    // Ajouter les métadonnées
    geometry.userData = {
      profile: profile.designation,
      type: 'BENT_PLATE',
      dimensions: {
        width,
        thickness,
        segments
      }
    };
    
    return geometry;
  }
  
  /**
   * Génère une plaque ondulée (tôle ondulée)
   */
  generateCorrugatedPlate(
    profile: SteelProfile,
    length: number = 1000,
    waveHeight: number = 50,
    waveLength: number = 200
  ): THREE.BufferGeometry {
    const width = profile.dimensions.width || 1000;
    const thickness = profile.dimensions.thickness || 10;
    
    // Créer une forme ondulée
    const shape = new THREE.Shape();
    const segments = Math.floor(width / waveLength) * 4; // 4 points par onde
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width - width / 2;
      const y = Math.sin((i / segments) * Math.PI * 2 * (width / waveLength)) * waveHeight;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    
    // Fermer la forme avec l'épaisseur
    for (let i = segments; i >= 0; i--) {
      const x = (i / segments) * width - width / 2;
      const y = Math.sin((i / segments) * Math.PI * 2 * (width / waveLength)) * waveHeight - thickness;
      shape.lineTo(x, y);
    }
    
    shape.closePath();
    
    // Extruder pour créer la longueur
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    // Rotation pour orienter correctement
    geometry.rotateX(Math.PI / 2);
    geometry.center();
    
    // Ajouter les métadonnées
    geometry.userData = {
      profile: profile.designation,
      type: 'CORRUGATED_PLATE',
      dimensions: {
        width,
        thickness,
        length,
        waveHeight,
        waveLength
      }
    };
    
    return geometry;
  }
  
  /**
   * Génère une plaque perforée
   */
  generatePerforatedPlate(
    profile: SteelProfile,
    length: number = 1000,
    holePattern: {
      diameter: number;
      spacingX: number;
      spacingY: number;
      staggered?: boolean;
    }
  ): THREE.BufferGeometry {
    // Créer la géométrie de base
    const baseGeometry = this.generatePlate(profile, length);
    
    const width = profile.dimensions.width || 1000;
    
    // Calculer le pattern de trous
    const holesX = Math.floor(width / holePattern.spacingX);
    const holesY = Math.floor(length / holePattern.spacingY);
    const holes: Array<{ x: number; y: number; diameter: number }> = [];
    
    for (let i = 0; i < holesX; i++) {
      for (let j = 0; j < holesY; j++) {
        const x = (i + 0.5) * holePattern.spacingX - width / 2;
        let y = (j + 0.5) * holePattern.spacingY - length / 2;
        
        // Décalage pour motif en quinconce
        if (holePattern.staggered && i % 2 === 1) {
          y += holePattern.spacingY / 2;
        }
        
        // Vérifier que le trou est dans les limites
        if (Math.abs(y) < length / 2 - holePattern.diameter) {
          holes.push({
            x,
            y,
            diameter: holePattern.diameter
          });
        }
      }
    }
    
    // Ajouter les métadonnées des trous
    baseGeometry.userData.perforations = {
      pattern: holePattern,
      holes,
      openAreaRatio: (holes.length * Math.PI * Math.pow(holePattern.diameter / 2, 2)) / (width * length)
    };
    
    return baseGeometry;
  }
  
}

export default PlateGenerator;