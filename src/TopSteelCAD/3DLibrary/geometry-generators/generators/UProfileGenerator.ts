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
   * Crée le profil 2D d'un U
   */
  private createUProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness, rootRadius, toeRadius } = params;
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const tw = webThickness;
    const tf = flangeThickness;
    const r1 = rootRadius;
    const r2 = toeRadius;
    
    // Commencer en bas à gauche (extérieur)
    shape.moveTo(-w, -h / 2);
    
    // Base du U (semelle inférieure)
    if (r2 > 0) {
      shape.lineTo(w - r2, -h / 2);
      shape.quadraticCurveTo(w, -h / 2, w, -h / 2 + r2);
    } else {
      shape.lineTo(w, -h / 2);
    }
    
    // Montée côté droit (âme droite extérieure)
    shape.lineTo(w, h / 2 - r2);
    
    // Coin supérieur droit extérieur
    if (r2 > 0) {
      shape.quadraticCurveTo(w, h / 2, w - r2, h / 2);
    } else {
      shape.lineTo(w, h / 2);
    }
    
    // Semelle supérieure droite
    shape.lineTo(w - tf + r1, h / 2);
    
    // Raccordement intérieur droit
    if (r1 > 0) {
      shape.quadraticCurveTo(w - tf, h / 2, w - tf, h / 2 - r1);
    } else {
      shape.lineTo(w - tf, h / 2);
    }
    
    // Descente intérieure droite
    shape.lineTo(w - tf, -h / 2 + tf + r1);
    
    // Raccordement âme-semelle intérieur droit
    if (r1 > 0) {
      shape.quadraticCurveTo(w - tf, -h / 2 + tf, w - tf - r1, -h / 2 + tf);
    } else {
      shape.lineTo(w - tf, -h / 2 + tf);
    }
    
    // Base intérieure (âme inférieure)
    shape.lineTo(-w + tw + r1, -h / 2 + tf);
    
    // Raccordement âme-semelle intérieur gauche
    if (r1 > 0) {
      shape.quadraticCurveTo(-w + tw, -h / 2 + tf, -w + tw, -h / 2 + tf + r1);
    } else {
      shape.lineTo(-w + tw, -h / 2 + tf);
    }
    
    // Montée intérieure gauche
    shape.lineTo(-w + tw, h / 2 - r1);
    
    // Raccordement intérieur gauche haut
    if (r1 > 0) {
      shape.quadraticCurveTo(-w + tw, h / 2, -w + tw - r1, h / 2);
    } else {
      shape.lineTo(-w + tw, h / 2);
    }
    
    // Semelle supérieure gauche
    shape.lineTo(-w + r2, h / 2);
    
    // Coin supérieur gauche extérieur
    if (r2 > 0) {
      shape.quadraticCurveTo(-w, h / 2, -w, h / 2 - r2);
    } else {
      shape.lineTo(-w, h / 2);
    }
    
    // Descente côté gauche (fermeture)
    shape.lineTo(-w, -h / 2 + r2);
    
    // Coin inférieur gauche
    if (r2 > 0) {
      shape.quadraticCurveTo(-w, -h / 2, -w + r2, -h / 2);
    } else {
      shape.lineTo(-w, -h / 2);
    }
    
    // Fermer le profil
    shape.closePath();
    
    return shape;
  }
}