/**
 * Générateur pour les profils spéciaux (W, S, Sigma, Omega, HP)
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType, ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class SpecialProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.W_SHAPE,
      ProfileType.S_SHAPE,
      ProfileType.HP_SHAPE,
      ProfileType.SIGMA_PROFILE,
      ProfileType.OMEGA_PROFILE
    ]);
  }

  getName(): string {
    return 'SpecialProfileGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const profileType = this.determineProfileType(dimensions);
    
    switch (profileType) {
      case ProfileType.W_SHAPE:
      case ProfileType.HP_SHAPE:
        // W et HP sont similaires aux profils I (wide flange)
        return this.generateWProfile(dimensions, length);
        
      case ProfileType.S_SHAPE:
        // S est similaire aux profils I mais avec semelles inclinées
        return this.generateSProfile(dimensions, length);
        
      case ProfileType.SIGMA_PROFILE:
        return this.generateSigmaProfile(dimensions, length);
        
      case ProfileType.OMEGA_PROFILE:
        return this.generateOmegaProfile(dimensions, length);
        
      default:
        return this.generateWProfile(dimensions, length);
    }
  }

  private determineProfileType(_dimensions: ProfileDimensions): ProfileType {
    // Logique pour déterminer le type si nécessaire
    // Pour l'instant, on suppose que le type est déjà défini
    return ProfileType.W_SHAPE;
  }

  /**
   * Génère un profil W (Wide Flange - similaire à I mais plus large)
   */
  private generateWProfile(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const {
      height = 200,
      width = 200,
      webThickness = 10,
      flangeThickness = 15,
      rootRadius = 0,
      toeRadius = 0
    } = dimensions;

    const profile = this.createWProfile({
      height,
      width,
      webThickness,
      flangeThickness,
      rootRadius,
      toeRadius
    });

    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 8
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);
    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Génère un profil S (American Standard Beam)
   */
  private generateSProfile(dimensions: ProfileDimensions, length: number): BufferGeometry {
    // Similaire au W mais avec des semelles inclinées
    return this.generateWProfile(dimensions, length);
  }

  /**
   * Génère un profil Sigma
   */
  private generateSigmaProfile(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const {
      height = 200,
      width = 100,
      webThickness = 6,
      flangeThickness = 8,
    } = dimensions;

    const profile = this.createSigmaProfile({
      height,
      width,
      webThickness,
      flangeThickness
    });

    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 8
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);
    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Génère un profil Omega
   */
  private generateOmegaProfile(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const {
      height = 200,
      width = 100,
      webThickness = 6,
      flangeThickness = 8,
    } = dimensions;

    const profile = this.createOmegaProfile({
      height,
      width,
      webThickness,
      flangeThickness
    });

    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 8
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);
    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Crée le profil 2D d'un W (similaire à I mais plus robuste)
   */
  private createWProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness } = params;
    
    const shape = new Shape();
    
    const hw = width / 2;
    const htw = webThickness / 2;
    const hh = height / 2;
    const tf = flangeThickness;
    
    // Profil W - similaire à I mais avec semelles plus épaisses
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, -hh + tf * 1.2);  // Semelles plus épaisses
    shape.lineTo(htw, -hh + tf * 1.2);
    shape.lineTo(htw, hh - tf * 1.2);
    shape.lineTo(hw, hh - tf * 1.2);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.lineTo(-hw, hh - tf * 1.2);
    shape.lineTo(-htw, hh - tf * 1.2);
    shape.lineTo(-htw, -hh + tf * 1.2);
    shape.lineTo(-hw, -hh + tf * 1.2);
    shape.closePath();
    
    return shape;
  }

  /**
   * Crée le profil 2D d'un Sigma
   */
  private createSigmaProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness } = params;
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const tw = webThickness;
    const tf = flangeThickness;
    const hw = w / 2;
    const hh = h / 2;
    
    // Profil Sigma - forme en Σ
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw * 0.6, -hh);
    shape.lineTo(hw * 0.6, -hh + tf);
    shape.lineTo(-hw + tw, -hh + tf);
    shape.lineTo(0, 0);  // Point central
    shape.lineTo(-hw + tw, hh - tf);
    shape.lineTo(hw * 0.6, hh - tf);
    shape.lineTo(hw * 0.6, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();
    
    return shape;
  }

  /**
   * Crée le profil 2D d'un Omega
   */
  private createOmegaProfile(params: {
    height: number;
    width: number;
    webThickness: number;
    flangeThickness: number;
  }): Shape {
    const { height, width, webThickness, flangeThickness } = params;
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const tw = webThickness;
    const tf = flangeThickness;
    const hw = w / 2;
    const hh = h / 2;
    
    // Profil Omega - forme en Ω (chapeau)
    shape.moveTo(-hw, -hh);
    shape.lineTo(-hw + tf, -hh);
    shape.lineTo(-hw + tf, 0);
    shape.lineTo(-hw + tf + tw, 0);
    shape.lineTo(-hw + tf + tw, hh - tf);
    shape.lineTo(hw - tf - tw, hh - tf);
    shape.lineTo(hw - tf - tw, 0);
    shape.lineTo(hw - tf, 0);
    shape.lineTo(hw - tf, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, -hh + tf);
    shape.lineTo(hw - tf, -hh + tf);
    shape.lineTo(hw - tf, 0 + tw);
    shape.lineTo(-hw + tf, 0 + tw);
    shape.lineTo(-hw + tf, -hh + tf);
    shape.lineTo(-hw, -hh + tf);
    shape.closePath();
    
    return shape;
  }
}