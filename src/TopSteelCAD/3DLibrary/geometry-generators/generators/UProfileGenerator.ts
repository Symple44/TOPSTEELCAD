/**
 * Générateur de géométries pour les profils en U (UPN, UAP) 
 * Utilise les vraies dimensions des profils
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType, ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class UProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.UPN,
      ProfileType.UAP
    ]);
  }

  getName(): string {
    return 'UProfileGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const {
      height,
      width,
      webThickness,
      flangeThickness,
      rootRadius = 0,
      toeRadius = 0
    } = dimensions;

    // Validation
    if (!height || !width || !webThickness || !flangeThickness) {
      throw new Error(`Dimensions manquantes pour profil U: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Créer le profil 2D
    const profile = this.createUProfile({
      height,
      width,
      webThickness,
      flangeThickness,
      rootRadius,
      toeRadius
    });

    // Extruder
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 8
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);

    // Centrer la géométrie
    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Crée le profil 2D d'un U (tracé direct du contour)
   */
  private createUProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness } = params;
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const tw = webThickness;
    const tf = flangeThickness;
    const hw = w / 2;
    const hh = h / 2;
    
    // Profil U - tracé du contour réel (sens anti-horaire)
    // Commencer coin inférieur gauche extérieur
    shape.moveTo(-hw, -hh);
    
    // Base extérieure
    shape.lineTo(hw, -hh);                    // Base droite
    shape.lineTo(hw, hh);                     // Montée droite extérieure
    shape.lineTo(hw - tf, hh);                // Semelle sup droite
    shape.lineTo(hw - tf, -hh + tf);          // Descente intérieure droite
    
    // Base intérieure
    shape.lineTo(-hw + tw, -hh + tf);         // Base intérieure
    
    // Remontée gauche
    shape.lineTo(-hw + tw, hh);               // Montée intérieure gauche
    shape.lineTo(-hw, hh);                    // Semelle sup gauche
    
    // Fermer le profil
    shape.closePath();
    
    return shape;
  }
}