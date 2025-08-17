/**
 * Générateur de géométries pour tous les tubes (rectangulaires, carrés, circulaires)
 */

import { Shape, ExtrudeGeometry, BufferGeometry, CylinderGeometry } from '../../../lib/three-exports';
import { ProfileType, ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class TubeGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.TUBE_RECTANGULAR,
      ProfileType.TUBE_SQUARE,
      ProfileType.TUBE_CIRCULAR
    ]);
  }

  getName(): string {
    return 'TubeGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const { thickness } = dimensions;

    // Validation commune
    if (!thickness || thickness <= 0) {
      throw new Error(`Épaisseur manquante ou invalide pour tube: ${thickness}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Déterminer le type de profil pour générer la bonne géométrie
    const profileType = this.determineProfileType(dimensions);

    switch (profileType) {
      case ProfileType.TUBE_CIRCULAR:
        return this.generateCircularTube(dimensions, length);
        
      case ProfileType.TUBE_RECTANGULAR:
      case ProfileType.TUBE_SQUARE:
        return this.generateRectangularTube(dimensions, length);
        
      default:
        throw new Error(`Type de tube non supporté: ${profileType}`);
    }
  }

  /**
   * Détermine le type de profil à partir des dimensions
   */
  private determineProfileType(dimensions: ProfileDimensions): ProfileType {
    if (dimensions.diameter || dimensions.outerDiameter) {
      return ProfileType.TUBE_CIRCULAR;
    }
    
    if (dimensions.height === dimensions.width) {
      return ProfileType.TUBE_SQUARE;
    }
    
    return ProfileType.TUBE_RECTANGULAR;
  }

  /**
   * Génère un tube circulaire (CHS) avec profile Shape et ExtrudeGeometry
   */
  private generateCircularTube(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const outerDiameter = dimensions.outerDiameter || dimensions.diameter;
    const thickness = dimensions.thickness;

    if (!outerDiameter) {
      throw new Error('Diamètre externe manquant pour tube circulaire');
    }

    const outerRadius = outerDiameter / 2;
    const innerRadius = outerRadius - (thickness || 0);

    if (innerRadius <= 0 || !thickness) {
      throw new Error(`Épaisseur invalide (${thickness}) pour diamètre ${outerDiameter}`);
    }

    // Créer le profil 2D circulaire avec trou
    const profile = this.createCircularTubeProfile(outerRadius, innerRadius);

    // Extruder
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);

    // Rotation pour avoir la longueur selon Z
    geometry.rotateX(Math.PI / 2);

    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Crée le profil 2D d'un tube circulaire
   */
  private createCircularTubeProfile(outerRadius: number, innerRadius: number): Shape {
    // Cercle extérieur
    const outerShape = new Shape();
    outerShape.moveTo(outerRadius, 0);
    outerShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    
    // Cercle intérieur (trou)
    const innerShape = new Shape();
    innerShape.moveTo(innerRadius, 0);
    innerShape.absarc(0, 0, innerRadius, 0, Math.PI * 2, false);
    
    // Ajouter le trou
    outerShape.holes.push(innerShape);
    
    return outerShape;
  }

  /**
   * Génère un tube rectangulaire ou carré (RHS/SHS)
   */
  private generateRectangularTube(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const { height, width, thickness, outerRadius = 0 } = dimensions;

    if (!height || !width) {
      throw new Error('Hauteur et largeur manquantes pour tube rectangulaire');
    }

    // Créer le profil 2D
    const profile = this.createRectangularTubeProfile({
      height,
      width,
      thickness: thickness || 5, // Valeur par défaut si undefined
      outerRadius
    });

    // Extruder
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: outerRadius > 0 ? 8 : 1
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);

    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Crée le profil 2D d'un tube rectangulaire
   */
  private createRectangularTubeProfile(params: {
    height: number;
    width: number;
    thickness: number;
    outerRadius: number;
  }): Shape {
    const { height, width, thickness, outerRadius } = params;
    
    const h = height;
    const w = width;
    const t = thickness;
    const r = outerRadius;
    
    // Contour extérieur
    const outerShape = new Shape();
    
    if (r > 0) {
      // Avec rayons arrondis
      outerShape.moveTo(-w/2 + r, -h/2);
      outerShape.lineTo(w/2 - r, -h/2);
      outerShape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
      outerShape.lineTo(w/2, h/2 - r);
      outerShape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
      outerShape.lineTo(-w/2 + r, h/2);
      outerShape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
      outerShape.lineTo(-w/2, -h/2 + r);
      outerShape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
    } else {
      // Sans rayons
      outerShape.moveTo(-w/2, -h/2);
      outerShape.lineTo(w/2, -h/2);
      outerShape.lineTo(w/2, h/2);
      outerShape.lineTo(-w/2, h/2);
      outerShape.lineTo(-w/2, -h/2);
    }
    
    // Contour intérieur (trou)
    const innerShape = new Shape();
    const innerW = w - 2 * t;
    const innerH = h - 2 * t;
    const innerR = Math.max(0, r - t);
    
    if (innerW > 0 && innerH > 0) {
      if (innerR > 0) {
        // Avec rayons arrondis intérieurs
        innerShape.moveTo(-innerW/2 + innerR, -innerH/2);
        innerShape.lineTo(innerW/2 - innerR, -innerH/2);
        innerShape.quadraticCurveTo(innerW/2, -innerH/2, innerW/2, -innerH/2 + innerR);
        innerShape.lineTo(innerW/2, innerH/2 - innerR);
        innerShape.quadraticCurveTo(innerW/2, innerH/2, innerW/2 - innerR, innerH/2);
        innerShape.lineTo(-innerW/2 + innerR, innerH/2);
        innerShape.quadraticCurveTo(-innerW/2, innerH/2, -innerW/2, innerH/2 - innerR);
        innerShape.lineTo(-innerW/2, -innerH/2 + innerR);
        innerShape.quadraticCurveTo(-innerW/2, -innerH/2, -innerW/2 + innerR, -innerH/2);
      } else {
        // Sans rayons intérieurs
        innerShape.moveTo(-innerW/2, -innerH/2);
        innerShape.lineTo(innerW/2, -innerH/2);
        innerShape.lineTo(innerW/2, innerH/2);
        innerShape.lineTo(-innerW/2, innerH/2);
        innerShape.lineTo(-innerW/2, -innerH/2);
      }
      
      // Ajouter le trou au profil
      outerShape.holes.push(innerShape);
    }
    
    return outerShape;
  }
}