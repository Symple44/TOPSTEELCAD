/**
 * Générateur de géométries pour les profils en I (IPE, HEA, HEB, HEM)
 * Utilise les vraies dimensions des profils
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType, ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class IProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.IPE,
      ProfileType.HEA, 
      ProfileType.HEB,
      ProfileType.HEM
    ]);
  }

  getName(): string {
    return 'IProfileGenerator';
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

    // Validation des dimensions
    if (!height || !width || !webThickness || !flangeThickness) {
      throw new Error(`Dimensions manquantes pour profil I: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Créer le profil 2D
    const profile = this.createIProfile({
      height,
      width,
      webThickness,
      flangeThickness,
      rootRadius,
      toeRadius
    });

    // Extruder pour créer la 3D
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
   * Crée le profil 2D d'une poutre en I (tracé direct du contour)
   */
  private createIProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness } = params;
    
    const shape = new Shape();
    
    // Demi-dimensions
    const hw = width / 2;
    const htw = webThickness / 2;
    const hh = height / 2;
    const tf = flangeThickness;
    
    // Profil I - tracé du contour réel (sens anti-horaire)
    // Commencer par le coin inférieur gauche de la semelle inférieure
    shape.moveTo(-hw, -hh);
    
    // Semelle inférieure
    shape.lineTo(hw, -hh);                    // Base droite
    shape.lineTo(hw, -hh + tf);               // Montée droite
    shape.lineTo(htw, -hh + tf);              // Vers âme
    
    // Âme droite
    shape.lineTo(htw, hh - tf);               // Âme montée
    
    // Semelle supérieure
    shape.lineTo(hw, hh - tf);                // Vers semelle sup
    shape.lineTo(hw, hh);                     // Montée finale
    shape.lineTo(-hw, hh);                    // Sommet
    shape.lineTo(-hw, hh - tf);               // Descente gauche
    
    // Âme gauche  
    shape.lineTo(-htw, hh - tf);              // Vers âme gauche
    shape.lineTo(-htw, -hh + tf);             // Âme descente
    
    // Retour semelle inférieure
    shape.lineTo(-hw, -hh + tf);              // Vers semelle inf
    
    // Fermer le profil (retour au point de départ)
    shape.closePath();
    
    return shape;
  }
}