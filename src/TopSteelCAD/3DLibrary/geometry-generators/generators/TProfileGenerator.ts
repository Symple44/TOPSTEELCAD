/**
 * Générateur de géométries pour les profils en T
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType } from '../../types/profile.types';
import type { ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class TProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.T
    ]);
  }

  getName(): string {
    return 'TProfileGenerator';
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
      throw new Error(`Dimensions manquantes pour profil T: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Créer le profil 2D
    const profile = this.createTProfile({
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
   * Crée le profil 2D d'un T
   */
  private createTProfile(params: {
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
    
    // Profil T - tracé du contour réel (sens anti-horaire)
    // Commencer coin inférieur gauche de la semelle
    shape.moveTo(-hw, hh - tf);
    
    // Semelle horizontale
    shape.lineTo(hw, hh - tf);                // Base droite
    shape.lineTo(hw, hh);                     // Montée droite
    shape.lineTo(-hw, hh);                    // Sommet
    shape.lineTo(-hw, hh - tf);               // Descente gauche
    
    // Âme verticale
    shape.lineTo(-tw/2, hh - tf);             // Vers centre
    shape.lineTo(-tw/2, -hh);                 // Descente âme
    shape.lineTo(tw/2, -hh);                  // Base âme
    shape.lineTo(tw/2, hh - tf);              // Remontée âme
    
    // Fermer le profil
    shape.closePath();
    
    return shape;
  }
}