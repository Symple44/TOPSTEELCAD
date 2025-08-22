/**
 * Tests unitaires pour DSTVToPivotConverter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DSTVToPivotConverter } from '../converters/DSTVToPivotConverter';
import { DSTVProfile, ProfileFace } from '../types';
import { MaterialType } from '../../../3DLibrary/types/profile.types';

describe('DSTVToPivotConverter', () => {
  let converter: DSTVToPivotConverter;

  beforeEach(() => {
    converter = new DSTVToPivotConverter();
  });

  const createTestProfile = (): DSTVProfile => ({
    designation: 'HEA400',
    length: 6000,
    profileType: 'I_PROFILE',
    holes: [],
    cuts: [],
    markings: []
  });

  describe('convertProfiles', () => {
    it('should convert a single profile to PivotScene', () => {
      const profile = createTestProfile();
      const scene = converter.convertProfiles([profile]);

      expect(scene).toBeDefined();
      expect(scene.metadata.version).toBe('2.0');
      expect(scene.metadata.generator).toBe('DSTV-to-Pivot Converter');
      expect(scene.elements).toHaveLength(1);
      
      const element = scene.elements[0];
      expect(element.name).toBe('HEA400');
      expect(element.material.type).toBe(MaterialType.I_PROFILE);
      expect(element.dimensions.length).toBe(6000);
    });

    it('should convert multiple profiles', () => {
      const profiles = [
        createTestProfile(),
        { ...createTestProfile(), designation: 'IPE200', profileType: 'I_PROFILE' },
        { ...createTestProfile(), designation: 'UPN200', profileType: 'U_PROFILE' }
      ];

      const scene = converter.convertProfiles(profiles);

      expect(scene.elements).toHaveLength(3);
      expect(scene.elements[0].name).toBe('HEA400');
      expect(scene.elements[1].name).toBe('IPE200');
      expect(scene.elements[2].name).toBe('UPN200');
      expect(scene.elements[2].material.type).toBe(MaterialType.U_PROFILE);
    });

    it('should generate unique IDs for elements', () => {
      const profiles = [
        createTestProfile(),
        createTestProfile(),
        createTestProfile()
      ];

      const scene = converter.convertProfiles(profiles);
      
      const ids = scene.elements.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3); // All IDs should be unique
    });

    it('should convert holes to features', () => {
      const profile = createTestProfile();
      profile.holes = [
        { x: 100, y: 200, diameter: 25.4, face: ProfileFace.FRONT },
        { x: 300, y: 200, diameter: 20, face: ProfileFace.TOP, holeType: 'countersunk' }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;

      expect(features).toHaveLength(2);
      
      expect(features[0].type).toBe('hole');
      expect(features[0].parameters.diameter).toBe(25.4);
      expect(features[0].parameters.position).toEqual({ x: 100, y: 200, z: 0 });
      expect(features[0].parameters.face).toBe('front');
      
      expect(features[1].type).toBe('hole');
      expect(features[1].parameters.face).toBe('top');
      expect(features[1].parameters.holeType).toBe('countersunk');
    });

    it('should convert cuts to features', () => {
      const profile = createTestProfile();
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [[0, 0], [200, 0], [200, 100], [0, 100]]
        },
        {
          face: ProfileFace.TOP,
          contour: [[5000, 0], [5200, 0], [5200, 100], [5000, 100]]
        }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;

      expect(features).toHaveLength(2);
      
      expect(features[0].type).toBe('cut');
      expect(features[0].parameters.face).toBe('front');
      expect(features[0].parameters.contour).toEqual([[0, 0], [200, 0], [200, 100], [0, 100]]);
      
      expect(features[1].type).toBe('cut');
      expect(features[1].parameters.face).toBe('top');
      expect(features[1].parameters.contour[0]).toEqual([5000, 0]);
    });

    it('should convert markings to features', () => {
      const profile = createTestProfile();
      profile.markings = [
        { text: 'POS-101', x: 2500, y: 150 },
        { text: 'MARK-A', x: 1000, y: 100 }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;

      expect(features).toHaveLength(2);
      
      expect(features[0].type).toBe('marking');
      expect(features[0].parameters.text).toBe('POS-101');
      expect(features[0].parameters.position).toEqual({ x: 2500, y: 150, z: 0 });
      
      expect(features[1].type).toBe('marking');
      expect(features[1].parameters.text).toBe('MARK-A');
    });

    it('should handle profile with all feature types', () => {
      const profile = createTestProfile();
      profile.holes = [
        { x: 100, y: 150, diameter: 22, face: ProfileFace.FRONT },
        { x: 200, y: 150, diameter: 22, face: ProfileFace.FRONT }
      ];
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [[0, 0], [200, 0], [200, 100], [0, 100]]
        }
      ];
      profile.markings = [
        { text: 'A-123', x: 4000, y: 150 }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;

      expect(features).toHaveLength(4); // 2 holes + 1 cut + 1 marking
      
      const holeFeatures = features.filter(f => f.type === 'hole');
      expect(holeFeatures).toHaveLength(2);
      
      const cutFeatures = features.filter(f => f.type === 'cut');
      expect(cutFeatures).toHaveLength(1);
      
      const markingFeatures = features.filter(f => f.type === 'marking');
      expect(markingFeatures).toHaveLength(1);
    });

    it('should map profile types correctly', () => {
      const testCases = [
        { profileType: 'I_PROFILE', expected: MaterialType.I_PROFILE },
        { profileType: 'U_PROFILE', expected: MaterialType.U_PROFILE },
        { profileType: 'L_PROFILE', expected: MaterialType.L_PROFILE },
        { profileType: 'TUBE', expected: MaterialType.TUBE },
        { profileType: 'ROUND_BAR', expected: MaterialType.ROUND_BAR },
        { profileType: 'FLAT_BAR', expected: MaterialType.FLAT_BAR },
        { profileType: 'PLATE', expected: MaterialType.PLATE }
      ];

      testCases.forEach(({ profileType, expected }) => {
        const profile = { ...createTestProfile(), profileType };
        const scene = converter.convertProfiles([profile]);
        expect(scene.elements[0].material.type).toBe(expected);
      });
    });

    it('should handle unknown profile types', () => {
      const profile = { ...createTestProfile(), profileType: 'UNKNOWN_TYPE' };
      const scene = converter.convertProfiles([profile]);
      
      expect(scene.elements[0].material.type).toBe(MaterialType.CUSTOM);
    });

    it('should set correct timestamps', () => {
      const before = new Date().toISOString();
      const scene = converter.convertProfiles([createTestProfile()]);
      const after = new Date().toISOString();

      expect(scene.metadata.created).toBeDefined();
      expect(new Date(scene.metadata.created).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
      expect(new Date(scene.metadata.created).getTime()).toBeLessThanOrEqual(new Date(after).getTime());
    });

    it('should handle profiles without features', () => {
      const profile = createTestProfile();
      // No holes, cuts, or markings

      const scene = converter.convertProfiles([profile]);
      
      expect(scene.elements[0].features).toEqual([]);
    });

    it('should handle face mapping correctly', () => {
      const profile = createTestProfile();
      profile.holes = [
        { x: 100, y: 100, diameter: 20, face: ProfileFace.FRONT },
        { x: 100, y: 100, diameter: 20, face: ProfileFace.BACK },
        { x: 100, y: 100, diameter: 20, face: ProfileFace.TOP },
        { x: 100, y: 100, diameter: 20, face: ProfileFace.BOTTOM },
        { x: 100, y: 100, diameter: 20, face: ProfileFace.LEFT },
        { x: 100, y: 100, diameter: 20, face: ProfileFace.RIGHT }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;

      expect(features[0].parameters.face).toBe('front');
      expect(features[1].parameters.face).toBe('back');
      expect(features[2].parameters.face).toBe('top');
      expect(features[3].parameters.face).toBe('bottom');
      expect(features[4].parameters.face).toBe('left');
      expect(features[5].parameters.face).toBe('right');
    });

    it('should handle special hole types', () => {
      const profile = createTestProfile();
      profile.holes = [
        { x: 100, y: 100, diameter: 20, face: ProfileFace.FRONT, holeType: 'standard' },
        { x: 200, y: 100, diameter: 20, face: ProfileFace.FRONT, holeType: 'countersunk' },
        { x: 300, y: 100, diameter: 20, face: ProfileFace.FRONT, holeType: 'counterbore' },
        { x: 400, y: 100, diameter: 20, face: ProfileFace.FRONT, holeType: 'tapped' }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;

      expect(features[0].parameters.holeType).toBe('standard');
      expect(features[1].parameters.holeType).toBe('countersunk');
      expect(features[2].parameters.holeType).toBe('counterbore');
      expect(features[3].parameters.holeType).toBe('tapped');
    });

    it('should preserve cut contour precision', () => {
      const profile = createTestProfile();
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [
            [0.123456789, 0.987654321],
            [100.111111, 50.222222],
            [200.333333, 100.444444]
          ]
        }
      ];

      const scene = converter.convertProfiles([profile]);
      const cutFeature = scene.elements[0].features![0];

      expect(cutFeature.parameters.contour[0][0]).toBeCloseTo(0.123456789, 6);
      expect(cutFeature.parameters.contour[0][1]).toBeCloseTo(0.987654321, 6);
    });
  });

  describe('error handling', () => {
    it('should handle empty profile array', () => {
      const scene = converter.convertProfiles([]);
      
      expect(scene.elements).toEqual([]);
      expect(scene.metadata.profileCount).toBe(0);
    });

    it('should handle null/undefined profiles', () => {
      const profiles = [
        createTestProfile(),
        null as unknown,
        undefined as unknown,
        createTestProfile()
      ];

      const scene = converter.convertProfiles(profiles);
      
      expect(scene.elements).toHaveLength(2); // Only valid profiles
    });

    it('should handle profiles with invalid features', () => {
      const profile = createTestProfile();
      profile.holes = [
        { x: 100, y: 100, diameter: 20, face: ProfileFace.FRONT },
        null as unknown,
        { x: NaN, y: 100, diameter: 20, face: ProfileFace.FRONT }
      ];

      const scene = converter.convertProfiles([profile]);
      const features = scene.elements[0].features!;
      
      // Should skip invalid features
      expect(features.length).toBeLessThanOrEqual(1);
    });

    it('should handle missing profile properties gracefully', () => {
      const profile = {
        designation: 'TEST',
        // Missing length and profileType
      } as unknown;

      const scene = converter.convertProfiles([profile]);
      
      expect(scene.elements).toHaveLength(1);
      expect(scene.elements[0].dimensions.length).toBe(0); // Default value
      expect(scene.elements[0].material.type).toBe(MaterialType.CUSTOM); // Default type
    });
  });

  describe('performance', () => {
    it('should handle large number of profiles efficiently', () => {
      const profiles: DSTVProfile[] = [];
      
      // Create 1000 profiles with features
      for (let i = 0; i < 1000; i++) {
        const profile = createTestProfile();
        profile.designation = `HEA${400 + i}`;
        
        // Add some holes
        profile.holes = [
          { x: 100, y: 100, diameter: 20, face: ProfileFace.FRONT },
          { x: 200, y: 100, diameter: 20, face: ProfileFace.FRONT }
        ];
        
        profiles.push(profile);
      }

      const startTime = performance.now();
      const scene = converter.convertProfiles(profiles);
      const endTime = performance.now();

      expect(scene.elements).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in less than 500ms
      
      // Verify all elements have features
      scene.elements.forEach(element => {
        expect(element.features).toHaveLength(2);
      });
    });

    it('should handle complex contours efficiently', () => {
      const profile = createTestProfile();
      
      // Create a complex contour with many points
      const contour: Array<[number, number]> = [];
      for (let i = 0; i < 1000; i++) {
        contour.push([i * 10, Math.sin(i * 0.1) * 100]);
      }
      
      profile.cuts = [
        { face: ProfileFace.FRONT, contour }
      ];

      const startTime = performance.now();
      const scene = converter.convertProfiles([profile]);
      const endTime = performance.now();

      expect(scene.elements[0].features![0].parameters.contour).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast even with complex contours
    });
  });
});