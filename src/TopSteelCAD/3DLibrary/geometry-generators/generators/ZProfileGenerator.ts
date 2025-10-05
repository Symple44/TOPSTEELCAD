/**
 * Générateur de géométries pour les profils en Z
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType } from '../../types/profile.types';
import type { ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class ZProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.Z
    ]);
  }

  getName(): string {
    return 'ZProfileGenerator';
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
      throw new Error(`Dimensions manquantes pour profil Z: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Créer le profil 2D
    const profile = this.createZProfile({
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
   * Crée le profil 2D d'un Z
   */
  private createZProfile(params: {
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
    
    // Profil Z - tracé du contour réel (sens anti-horaire)
    // Commencer semelle inférieure gauche
    shape.moveTo(-hw, -hh);
    
    // Semelle inférieure
    shape.lineTo(tw/2, -hh);                  // Vers âme
    shape.lineTo(tw/2, -hh + tf);             // Montée
    shape.lineTo(-hw, -hh + tf);              // Retour gauche
    
    // Raccord âme
    shape.lineTo(-tw/2, -hh + tf);            // Vers âme
    
    // Âme diagonale
    shape.lineTo(tw/2, hh - tf);              // Diagonale montante
    
    // Semelle supérieure
    shape.lineTo(hw, hh - tf);                // Vers droite
    shape.lineTo(hw, hh);                     // Montée finale
    shape.lineTo(-tw/2, hh);                  // Retour vers âme
    shape.lineTo(-tw/2, hh - tf);             // Descente
    
    // Retour via âme
    shape.lineTo(-tw/2, -hh + tf);            // Descente diagonale
    
    // Fermer le profil
    shape.closePath();
    
    return shape;
  }
}