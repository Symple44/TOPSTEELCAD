/**
 * Générateur de géométries pour les profils en C
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType } from '../../types/profile.types';
import type { ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class CProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.C
    ]);
  }

  getName(): string {
    return 'CProfileGenerator';
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
      throw new Error(`Dimensions manquantes pour profil C: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Créer le profil 2D
    const profile = this.createCProfile({
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
   * Crée le profil 2D d'un C
   */
  private createCProfile(params: {
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
    
    // Profil C - tracé du contour réel (sens anti-horaire)
    // Commencer coin inférieur gauche extérieur
    shape.moveTo(-tw/2, -hh);
    
    // Semelle inférieure
    shape.lineTo(hw, -hh);                    // Base droite ext
    shape.lineTo(hw, -hh + tf);               // Montée droite
    shape.lineTo(-tw/2, -hh + tf);            // Retour vers âme
    
    // Âme montée intérieure
    shape.lineTo(-tw/2, hh - tf);             // Montée intérieure
    
    // Semelle supérieure
    shape.lineTo(hw, hh - tf);                // Vers droite
    shape.lineTo(hw, hh);                     // Montée finale
    shape.lineTo(-tw/2, hh);                  // Retour gauche ext
    
    // Fermer le profil
    shape.closePath();
    
    return shape;
  }
}