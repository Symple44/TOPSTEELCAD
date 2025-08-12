/**
 * Générateur de géométries pour les cornières (L égales et inégales)
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType, ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class LProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.L_EQUAL,
      ProfileType.L_UNEQUAL
    ]);
  }

  getName(): string {
    return 'LProfileGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const {
      height,
      width,
      thickness,
      rootRadius = 0,
      toeRadius = 0
    } = dimensions;

    // Validation
    if (!height || !thickness) {
      throw new Error(`Dimensions manquantes pour cornière: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Pour cornières inégales, width est différent de height
    const actualWidth = width || height; // Si pas de width, c'est une cornière égale

    // Créer le profil 2D
    const profile = this.createLProfile({
      height,
      width: actualWidth,
      thickness,
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
   * Crée le profil 2D d'une cornière
   */
  private createLProfile(params: {
    height: number;
    width: number;
    thickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, thickness, rootRadius, toeRadius } = params;
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const t = thickness;
    const r1 = rootRadius;
    const r2 = toeRadius;
    
    // Commencer au coin inférieur gauche (extérieur)
    shape.moveTo(0, 0);
    
    // Aile verticale (extérieur)
    if (r2 > 0) {
      shape.lineTo(0, h - r2);
      shape.quadraticCurveTo(0, h, r2, h);
    } else {
      shape.lineTo(0, h);
    }
    
    // Semelle horizontale supérieure
    shape.lineTo(w - r2, h);
    
    // Coin supérieur droit
    if (r2 > 0) {
      shape.quadraticCurveTo(w, h, w, h - r2);
    } else {
      shape.lineTo(w, h);
    }
    
    // Descente côté droit
    shape.lineTo(w, h - t + r1);
    
    // Raccordement intérieur droit
    if (r1 > 0) {
      shape.quadraticCurveTo(w, h - t, w - r1, h - t);
    } else {
      shape.lineTo(w, h - t);
    }
    
    // Aile horizontale intérieure
    shape.lineTo(t + r1, h - t);
    
    // Raccordement central (âme)
    if (r1 > 0) {
      shape.quadraticCurveTo(t, h - t, t, h - t - r1);
    } else {
      shape.lineTo(t, h - t);
    }
    
    // Aile verticale intérieure
    shape.lineTo(t, t - r1);
    
    // Raccordement intérieur bas
    if (r1 > 0) {
      shape.quadraticCurveTo(t, t, t - r1, t);
    } else {
      shape.lineTo(t, t);
    }
    
    // Base horizontale
    shape.lineTo(r2, t);
    
    // Coin inférieur gauche
    if (r2 > 0) {
      shape.quadraticCurveTo(0, t, 0, t - r2);
    } else {
      shape.lineTo(0, t);
    }
    
    // Fermer le profil
    shape.lineTo(0, 0);
    shape.closePath();
    
    return shape;
  }
}