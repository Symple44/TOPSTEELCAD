/**
 * Générateur de géométries pour les plats et barres plates
 */

import { BoxGeometry, BufferGeometry } from '../../../lib/three-exports';
import { ProfileType, ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class FlatBarGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.FLAT,
      ProfileType.SQUARE_BAR,
      ProfileType.ROUND_BAR
    ]);
  }

  getName(): string {
    return 'FlatBarGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const profileType = this.determineProfileType(dimensions);
    
    switch (profileType) {
      case ProfileType.ROUND_BAR:
        return this.generateRoundBar(dimensions, length);
      case ProfileType.SQUARE_BAR:
        return this.generateSquareBar(dimensions, length);
      default:
        return this.generateFlatBar(dimensions, length);
    }
  }

  private determineProfileType(dimensions: ProfileDimensions): ProfileType {
    if (dimensions.diameter) {
      return ProfileType.ROUND_BAR;
    }
    if (dimensions.width === dimensions.height || dimensions.width === dimensions.thickness) {
      return ProfileType.SQUARE_BAR;
    }
    return ProfileType.FLAT;
  }

  /**
   * Génère une barre plate
   */
  private generateFlatBar(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const width = dimensions.width || 100;
    const thickness = dimensions.thickness || dimensions.height || 10;
    
    // Créer une boîte simple
    const geometry = new BoxGeometry(width, thickness, length);
    
    // Centrer la géométrie
    this.centerGeometry(geometry, length);
    
    return geometry;
  }

  /**
   * Génère une barre carrée
   */
  private generateSquareBar(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const size = dimensions.width || dimensions.height || dimensions.thickness || 50;
    
    // Créer une boîte carrée
    const geometry = new BoxGeometry(size, size, length);
    
    // Centrer la géométrie
    this.centerGeometry(geometry, length);
    
    return geometry;
  }

  /**
   * Génère une barre ronde
   */
  private generateRoundBar(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const { CylinderGeometry } = require('../../../lib/three-exports');
    
    const diameter = dimensions.diameter || dimensions.width || 50;
    const radius = diameter / 2;
    
    // Créer un cylindre
    const geometry = new CylinderGeometry(radius, radius, length, 32);
    
    // Rotation pour avoir la longueur selon Z
    geometry.rotateX(Math.PI / 2);
    
    // Centrer la géométrie
    this.centerGeometry(geometry, length);
    
    return geometry;
  }
}