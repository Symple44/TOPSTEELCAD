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
    
    console.log('🔧 UProfileGenerator.generate called with:');
    console.log('  - height (hauteur âme):', height, 'mm');
    console.log('  - width (largeur ailes):', width, 'mm');
    console.log('  - webThickness:', webThickness, 'mm');
    console.log('  - flangeThickness:', flangeThickness, 'mm');
    console.log('  - length:', length, 'mm');

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
    
    console.log('📐 Creating U profile 2D shape:');
    console.log('  - Profile height (h):', height, 'mm');
    console.log('  - Flange width (w):', width, 'mm');
    console.log('  - Web thickness (tw):', webThickness, 'mm');
    console.log('  - Flange thickness (tf):', flangeThickness, 'mm');
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const tw = webThickness;
    const tf = flangeThickness;
    // const hw = w / 2;  // Non utilisé actuellement
    const hh = h / 2;
    
    // Profil U orienté avec l'âme à gauche et les ailes à droite
    // L'origine est au centre de l'âme
    // Dimensions: âme verticale de hauteur h, ailes horizontales de largeur w
    
    // Commencer coin inférieur gauche extérieur (base de l'aile inférieure)
    shape.moveTo(0, -hh);
    
    // Aile inférieure extérieure
    shape.lineTo(w, -hh);                     // Vers la droite (largeur de l'aile)
    shape.lineTo(w, -hh + tf);                // Monter de l'épaisseur de l'aile
    shape.lineTo(tw, -hh + tf);               // Retour vers l'âme (largeur - épaisseur âme)
    
    // Monter le long de l'âme intérieure
    shape.lineTo(tw, hh - tf);                // Monter jusqu'à l'aile supérieure
    
    // Aile supérieure intérieure
    shape.lineTo(w, hh - tf);                 // Vers la droite
    shape.lineTo(w, hh);                      // Monter de l'épaisseur
    shape.lineTo(0, hh);                      // Retour au bord gauche
    
    // Fermer en descendant le long de l'âme extérieure
    shape.closePath();
    
    return shape;
  }
}