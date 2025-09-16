import * as THREE from 'three';
import { Feature, ProcessorResult, IFeatureProcessor } from '../types';
import { PivotElement } from '@/types/viewer';

/**
 * Processeur pour les définitions de profils
 * Gère les blocs PR de la norme DSTV
 * Les profils définissent la forme de base de la pièce
 */
export class ProfileProcessor implements IFeatureProcessor {

  constructor() {}

  canProcess(type: string): boolean {
    return type === 'profile' || type === 'profile_definition';
  }

  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    console.log(`📐 ProfileProcessor.process called for feature ${feature.id}`);
    console.log(`  - Feature params:`, feature.parameters);
    console.log(`  - Element:`, element.id, element.dimensions);
    
    try {
      // Paramètres du profil
      const profileType = feature.parameters.profileType || 'custom';
      const profileName = feature.parameters.profileName || 'Unknown';
      const dimensions = feature.parameters.dimensions || {};
      const material = feature.parameters.material || 'S235';
      
      console.log(`  📊 Profile parameters:`);
      console.log(`    - Type: ${profileType}`);
      console.log(`    - Name: ${profileName}`);
      console.log(`    - Material: ${material}`);
      console.log(`    - Dimensions:`, dimensions);
      
      // Le bloc PR définit généralement les propriétés du profil
      // plutôt que de modifier la géométrie directement
      // Ces informations sont utilisées lors de la création initiale du profil
      
      // Stocker les métadonnées du profil dans la géométrie
      if (!geometry.userData) {
        geometry.userData = {};
      }
      
      geometry.userData.profile = {
        type: profileType,
        name: profileName,
        material: material,
        dimensions: dimensions,
        sourceBlock: 'PR'
      };
      
      // Si le profil nécessite une mise à jour de la géométrie
      if (this.shouldUpdateGeometry(profileType, dimensions, element)) {
        console.log(`  🔄 Updating geometry based on profile definition`);
        
        // Créer une nouvelle géométrie basée sur le profil
        const newGeometry = this.createProfileGeometry(profileType, dimensions);
        
        if (newGeometry) {
          // Copier les attributs userData
          newGeometry.userData = geometry.userData;
          
          // Nettoyer l'ancienne géométrie
          geometry.dispose();
          
          console.log(`  ✅ Profile geometry updated successfully`);
          
          return {
            success: true,
            geometry: newGeometry
          };
        }
      }
      
      console.log(`  ✅ Profile metadata applied successfully`);
      
      return {
        success: true,
        geometry: geometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to process profile: ${error}`);
      return {
        success: false,
        error: `Failed to process profile: ${error}`
      };
    }
  }

  /**
   * Détermine si la géométrie doit être mise à jour
   */
  private shouldUpdateGeometry(
    profileType: string,
    dimensions: any,
    element: PivotElement
  ): boolean {
    // Vérifier si les dimensions du profil diffèrent significativement
    // de celles de l'élément actuel
    if (!dimensions || !element.dimensions) {
      return false;
    }
    
    const tolerance = 0.1; // 0.1mm de tolérance
    
    if (dimensions.height && element.dimensions.height && Math.abs(dimensions.height - element.dimensions.height) > tolerance) {
      return true;
    }
    
    if (dimensions.width && Math.abs(dimensions.width - element.dimensions.width) > tolerance) {
      return true;
    }
    
    if (dimensions.length && Math.abs(dimensions.length - element.dimensions.length) > tolerance) {
      return true;
    }
    
    return false;
  }

  /**
   * Crée une géométrie basée sur le type de profil
   */
  private createProfileGeometry(
    profileType: string,
    dimensions: any
  ): THREE.BufferGeometry | null {
    try {
      const length = dimensions.length || 1000;
      const width = dimensions.width || 100;
      const height = dimensions.height || 100;
      const thickness = dimensions.thickness || 10;
      
      switch (profileType.toUpperCase()) {
        case 'I':
        case 'IPE':
        case 'HEA':
        case 'HEB':
          return this.createIProfileGeometry(length, width, height, thickness);
          
        case 'L':
        case 'ANGLE':
          return this.createLProfileGeometry(length, width, height, thickness);
          
        case 'U':
        case 'CHANNEL':
          return this.createUProfileGeometry(length, width, height, thickness);
          
        case 'T':
          return this.createTProfileGeometry(length, width, height, thickness);
          
        case 'RECT':
        case 'RECTANGULAR':
          return this.createRectProfileGeometry(length, width, height, thickness);
          
        case 'ROUND':
        case 'CIRCULAR':
          return this.createRoundProfileGeometry(length, width / 2);
          
        default:
          console.warn(`Unknown profile type: ${profileType}`);
          return null;
      }
      
    } catch (error) {
      console.error(`Failed to create profile geometry: ${error}`);
      return null;
    }
  }

  /**
   * Crée une géométrie de profil en I
   */
  private createIProfileGeometry(
    length: number,
    width: number,
    height: number,
    thickness: number
  ): THREE.BufferGeometry {
    // Créer un profil en I simplifié
    // Dans une vraie implémentation, utiliser le générateur de profil existant
    const shape = new THREE.Shape();
    
    // Aile supérieure
    shape.moveTo(-width / 2, height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(width / 2, height / 2 - thickness);
    shape.lineTo(thickness / 2, height / 2 - thickness);
    
    // Âme
    shape.lineTo(thickness / 2, -height / 2 + thickness);
    
    // Aile inférieure
    shape.lineTo(width / 2, -height / 2 + thickness);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(-width / 2, -height / 2);
    shape.lineTo(-width / 2, -height / 2 + thickness);
    shape.lineTo(-thickness / 2, -height / 2 + thickness);
    
    // Retour à l'âme
    shape.lineTo(-thickness / 2, height / 2 - thickness);
    
    // Fermer l'aile supérieure
    shape.lineTo(-width / 2, height / 2 - thickness);
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    // Centrer la géométrie
    geometry.translate(0, 0, -length / 2);
    
    return geometry;
  }

  /**
   * Crée une géométrie de profil en L
   */
  private createLProfileGeometry(
    length: number,
    width: number,
    height: number,
    thickness: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, thickness);
    shape.lineTo(thickness, thickness);
    shape.lineTo(thickness, height);
    shape.lineTo(0, height);
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    geometry.translate(-width / 2, -height / 2, -length / 2);
    
    return geometry;
  }

  /**
   * Crée une géométrie de profil en U
   */
  private createUProfileGeometry(
    length: number,
    width: number,
    height: number,
    thickness: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(width / 2 - thickness, height / 2);
    shape.lineTo(width / 2 - thickness, -height / 2 + thickness);
    shape.lineTo(-width / 2 + thickness, -height / 2 + thickness);
    shape.lineTo(-width / 2 + thickness, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    geometry.translate(0, 0, -length / 2);
    
    return geometry;
  }

  /**
   * Crée une géométrie de profil en T
   */
  private createTProfileGeometry(
    length: number,
    width: number,
    height: number,
    thickness: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    // Barre horizontale (haut)
    shape.moveTo(-width / 2, height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(width / 2, height / 2 - thickness);
    shape.lineTo(thickness / 2, height / 2 - thickness);
    
    // Barre verticale
    shape.lineTo(thickness / 2, -height / 2);
    shape.lineTo(-thickness / 2, -height / 2);
    shape.lineTo(-thickness / 2, height / 2 - thickness);
    
    // Fermer
    shape.lineTo(-width / 2, height / 2 - thickness);
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false
    });
    
    geometry.translate(0, 0, -length / 2);
    
    return geometry;
  }

  /**
   * Crée une géométrie de profil rectangulaire
   */
  private createRectProfileGeometry(
    length: number,
    width: number,
    height: number,
    thickness: number
  ): THREE.BufferGeometry {
    // Pour un tube rectangulaire
    if (thickness > 0 && thickness < Math.min(width, height) / 2) {
      const shape = new THREE.Shape();
      
      // Contour extérieur
      shape.moveTo(-width / 2, -height / 2);
      shape.lineTo(width / 2, -height / 2);
      shape.lineTo(width / 2, height / 2);
      shape.lineTo(-width / 2, height / 2);
      shape.closePath();
      
      // Trou intérieur
      const hole = new THREE.Path();
      hole.moveTo(-width / 2 + thickness, -height / 2 + thickness);
      hole.lineTo(width / 2 - thickness, -height / 2 + thickness);
      hole.lineTo(width / 2 - thickness, height / 2 - thickness);
      hole.lineTo(-width / 2 + thickness, height / 2 - thickness);
      hole.closePath();
      
      shape.holes.push(hole);
      
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: length,
        bevelEnabled: false
      });
      
      geometry.translate(0, 0, -length / 2);
      
      return geometry;
    } else {
      // Profil plein
      return new THREE.BoxGeometry(width, height, length);
    }
  }

  /**
   * Crée une géométrie de profil circulaire
   */
  private createRoundProfileGeometry(
    length: number,
    radius: number
  ): THREE.BufferGeometry {
    return new THREE.CylinderGeometry(
      radius,
      radius,
      length,
      32
    );
  }

  validateFeature(feature: Feature, _element: PivotElement): string[] {
    const errors: string[] = [];
    
    // Validation basique
    if (!feature.parameters) {
      errors.push('Missing parameters');
      return errors;
    }
    
    // Validation spécifique au profil
    const profileType = feature.parameters.profileType;
    if (!profileType) {
      errors.push('Missing profile type');
    }
    
    const dimensions = feature.parameters.dimensions;
    if (dimensions) {
      if (dimensions.length !== undefined && dimensions.length <= 0) {
        errors.push(`Invalid profile length: ${dimensions.length}mm`);
      }
      if (dimensions.width !== undefined && dimensions.width <= 0) {
        errors.push(`Invalid profile width: ${dimensions.width}mm`);
      }
      if (dimensions.height !== undefined && dimensions.height <= 0) {
        errors.push(`Invalid profile height: ${dimensions.height}mm`);
      }
    }
    
    return errors;
  }

  dispose(): void {
    // Pas de ressources à libérer
  }
}