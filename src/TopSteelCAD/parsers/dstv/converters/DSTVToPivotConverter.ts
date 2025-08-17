/**
 * DSTVToPivotConverter - Convertisseur DSTV vers format Pivot
 * Transforme les profils DSTV en scène Pivot
 */

import { DSTVProfile } from '../types';
import { MaterialType } from '../../../3DLibrary/types/profile.types';
import { PivotScene, PivotElement } from '@/types/viewer';

/**
 * Convertisseur DSTV vers format Pivot
 */
export class DSTVToPivotConverter {
  
  /**
   * Convertit des profils DSTV en scène Pivot
   */
  convertProfiles(profiles: DSTVProfile[]): PivotScene {
    const scene: PivotScene = {
      metadata: {
        version: '2.0',
        generator: 'DSTV-to-Pivot Converter',
        created: new Date().toISOString(),
        profileCount: 0
      },
      elements: []
    };

    if (!profiles || !Array.isArray(profiles)) {
      return scene;
    }

    // Filter out invalid profiles
    const validProfiles = profiles.filter(p => p && p.designation);
    scene.metadata.profileCount = validProfiles.length;

    // Convert each profile
    validProfiles.forEach((profile, index) => {
      const element = this.convertProfile(profile, index);
      if (element) {
        scene.elements.push(element);
      }
    });

    return scene;
  }

  /**
   * Convertit un profil DSTV en élément Pivot
   */
  private convertProfile(profile: DSTVProfile, index: number): PivotElement | null {
    if (!profile) return null;

    const element: PivotElement = {
      id: profile.id || `profile-${index}`,
      name: profile.designation || 'Unknown',
      type: 'profile',
      material: {
        type: this.mapProfileType(profile.profileType),
        grade: profile.steelGrade || 'S235',
        designation: profile.designation
      },
      dimensions: {
        length: profile.length || 0
      },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      features: []
    };

    // Convert holes
    if (profile.holes && profile.holes.length > 0) {
      profile.holes.forEach(hole => {
        if (this.isValidHole(hole)) {
          element.features!.push({
            type: 'hole',
            parameters: {
              position: { x: hole.x, y: hole.y, z: 0 },
              diameter: hole.diameter,
              face: this.mapFace(hole.face),
              holeType: hole.holeType || 'standard'
            }
          });
        }
      });
    }

    // Convert cuts
    if (profile.cuts && profile.cuts.length > 0) {
      profile.cuts.forEach(cut => {
        if (cut.contour && cut.contour.length >= 3) {
          element.features!.push({
            type: 'cut',
            parameters: {
              face: this.mapFace(cut.face),
              contour: cut.contour,
              isTransverse: cut.isTransverse
            }
          });
        }
      });
    }

    // Convert markings
    if (profile.markings && profile.markings.length > 0) {
      profile.markings.forEach(marking => {
        if (marking.text) {
          element.features!.push({
            type: 'marking',
            parameters: {
              text: marking.text,
              position: { x: marking.x, y: marking.y, z: 0 }
            }
          });
        }
      });
    }

    return element;
  }

  /**
   * Map profile type string to MaterialType enum
   */
  private mapProfileType(profileType?: string): MaterialType {
    if (!profileType) return MaterialType.CUSTOM;

    const typeMap: { [key: string]: MaterialType } = {
      'I_PROFILE': MaterialType.I_PROFILE,
      'U_PROFILE': MaterialType.U_PROFILE,
      'L_PROFILE': MaterialType.L_PROFILE,
      'TUBE': MaterialType.TUBE,
      'ROUND_BAR': MaterialType.ROUND_BAR,
      'FLAT_BAR': MaterialType.FLAT_BAR,
      'PLATE': MaterialType.PLATE,
      'T_PROFILE': MaterialType.TEE,
      'C_PROFILE': MaterialType.C_PROFILE,
      'Z_PROFILE': MaterialType.Z_PROFILE
    };

    return typeMap[profileType] || MaterialType.CUSTOM;
  }

  /**
   * Map ProfileFace enum to string
   */
  private mapFace(face: any): string {
    if (typeof face === 'string') return face.toLowerCase();
    
    // Handle enum values
    const faceMap: { [key: string]: string } = {
      'front': 'front',
      'back': 'back',
      'top': 'top',
      'bottom': 'bottom',
      'left': 'left',
      'right': 'right'
    };

    return faceMap[face] || 'front';
  }

  /**
   * Validate hole data
   */
  private isValidHole(hole: any): boolean {
    return hole && 
           typeof hole.x === 'number' && !isNaN(hole.x) &&
           typeof hole.y === 'number' && !isNaN(hole.y) &&
           typeof hole.diameter === 'number' && hole.diameter > 0;
  }
}