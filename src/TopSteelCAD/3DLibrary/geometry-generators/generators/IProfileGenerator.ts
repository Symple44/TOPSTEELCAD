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
   * Crée le profil 2D d'une poutre en I
   */
  private createIProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness, rootRadius, toeRadius } = params;
    
    const shape = new Shape();
    
    // Dimensions calculées
    const h = height;
    const w = width;
    const tw = webThickness;
    const tf = flangeThickness;
    const r1 = rootRadius;
    const r2 = toeRadius;
    
    // Demi-largeur de semelle et d'âme
    const hw = w / 2;
    const htw = tw / 2;
    
    // Hauteur entre les semelles
    const webHeight = h - 2 * tf;
    
    // Commencer en bas à gauche de la semelle inférieure
    shape.moveTo(-hw, -h / 2);
    
    // Semelle inférieure (de gauche à droite)
    if (r2 > 0) {
      shape.lineTo(hw - r2, -h / 2);
      shape.quadraticCurveTo(hw, -h / 2, hw, -h / 2 + r2);
    } else {
      shape.lineTo(hw, -h / 2);
    }
    
    // Montée côté droit semelle inférieure
    shape.lineTo(hw, -h / 2 + tf - r1);
    
    // Raccordement âme-semelle inférieure droite
    if (r1 > 0) {
      shape.quadraticCurveTo(hw, -h / 2 + tf, htw + r1, -h / 2 + tf);
      shape.lineTo(htw, -h / 2 + tf + r1);
    } else {
      shape.lineTo(htw, -h / 2 + tf);
    }
    
    // Âme côté droit
    shape.lineTo(htw, h / 2 - tf - r1);
    
    // Raccordement âme-semelle supérieure droite  
    if (r1 > 0) {
      shape.quadraticCurveTo(htw, h / 2 - tf, htw + r1, h / 2 - tf);
      shape.lineTo(hw, h / 2 - tf);
    } else {
      shape.lineTo(hw, h / 2 - tf);
    }
    
    // Montée côté droit semelle supérieure
    if (r1 > 0) {
      shape.lineTo(hw, h / 2 - r2);
    } else {
      shape.lineTo(hw, h / 2 - r2);
    }
    
    // Semelle supérieure côté droit
    if (r2 > 0) {
      shape.quadraticCurveTo(hw, h / 2, hw - r2, h / 2);
    } else {
      shape.lineTo(hw, h / 2);
    }
    
    // Semelle supérieure (de droite à gauche)
    shape.lineTo(-hw + r2, h / 2);
    
    // Coin supérieur gauche
    if (r2 > 0) {
      shape.quadraticCurveTo(-hw, h / 2, -hw, h / 2 - r2);
    } else {
      shape.lineTo(-hw, h / 2);
    }
    
    // Descente côté gauche semelle supérieure
    shape.lineTo(-hw, h / 2 - tf + r1);
    
    // Raccordement âme-semelle supérieure gauche
    if (r1 > 0) {
      shape.quadraticCurveTo(-hw, h / 2 - tf, -htw - r1, h / 2 - tf);
      shape.lineTo(-htw, h / 2 - tf - r1);
    } else {
      shape.lineTo(-htw, h / 2 - tf);
    }
    
    // Âme côté gauche
    shape.lineTo(-htw, -h / 2 + tf + r1);
    
    // Raccordement âme-semelle inférieure gauche
    if (r1 > 0) {
      shape.quadraticCurveTo(-htw, -h / 2 + tf, -htw - r1, -h / 2 + tf);
      shape.lineTo(-hw, -h / 2 + tf);
    } else {
      shape.lineTo(-hw, -h / 2 + tf);
    }
    
    // Descente côté gauche semelle inférieure
    shape.lineTo(-hw, -h / 2 + r2);
    
    // Coin inférieur gauche
    if (r2 > 0) {
      shape.quadraticCurveTo(-hw, -h / 2, -hw + r2, -h / 2);
    } else {
      shape.lineTo(-hw, -h / 2);
    }
    
    // Fermer le profil
    shape.closePath();
    
    return shape;
  }
}