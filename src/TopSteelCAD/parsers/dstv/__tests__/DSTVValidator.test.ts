/**
 * Tests unitaires pour DSTVValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DSTVValidator } from '../validators/DSTVValidator';
import { DSTVProfile, ProfileFace, ValidationLevel } from '../types';

describe('DSTVValidator', () => {
  let validator: DSTVValidator;

  beforeEach(() => {
    validator = new DSTVValidator();
  });

  const createValidProfile = (): DSTVProfile => ({
    designation: 'HEA400',
    length: 6000,
    profileType: 'I_PROFILE',
    holes: [],
    cuts: [],
    markings: []
  });

  describe('validateProfile', () => {
    it('should validate a valid profile', () => {
      const profile = createValidProfile();
      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject profile without designation', () => {
      const profile = createValidProfile();
      profile.designation = '';

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Profile designation is required');
    });

    it('should reject profile with invalid length', () => {
      const profile = createValidProfile();
      profile.length = -100;

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Profile length must be positive');
    });

    it('should reject profile with zero length', () => {
      const profile = createValidProfile();
      profile.length = 0;

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Profile length must be positive');
    });

    it('should warn about unusually long profiles', () => {
      const profile = createValidProfile();
      profile.length = 25000; // 25 meters

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Profile length exceeds typical maximum (20000mm)');
    });

    it('should validate holes', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: 100, y: 200, diameter: 25.4, face: ProfileFace.FRONT },
        { x: 300, y: 200, diameter: 20, face: ProfileFace.TOP }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject holes with invalid diameter', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: 100, y: 200, diameter: -10, face: ProfileFace.FRONT }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hole 0: Invalid diameter (-10)');
    });

    it('should reject holes outside profile bounds', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: 7000, y: 200, diameter: 20, face: ProfileFace.FRONT } // x > length
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hole 0: Position outside profile bounds');
    });

    it('should warn about overlapping holes', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: 100, y: 200, diameter: 30, face: ProfileFace.FRONT },
        { x: 120, y: 200, diameter: 30, face: ProfileFace.FRONT } // Overlapping
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('overlapping'))).toBe(true);
    });

    it('should validate cuts', () => {
      const profile = createValidProfile();
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [[0, 0], [100, 0], [100, 50], [0, 50]]
        }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject cuts with less than 3 points', () => {
      const profile = createValidProfile();
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [[0, 0], [100, 0]] // Only 2 points
        }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cut 0: Contour must have at least 3 points');
    });

    it('should reject cuts outside profile bounds', () => {
      const profile = createValidProfile();
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [[0, 0], [8000, 0], [8000, 100], [0, 100]] // x > length
        }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cut 0: Contour point outside profile bounds');
    });

    it('should warn about self-intersecting cuts', () => {
      const profile = createValidProfile();
      profile.cuts = [
        {
          face: ProfileFace.FRONT,
          contour: [
            [0, 0], 
            [100, 100], 
            [100, 0], 
            [0, 100] // Creates a bow-tie shape (self-intersecting)
          ]
        }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('self-intersecting'))).toBe(true);
    });

    it('should validate markings', () => {
      const profile = createValidProfile();
      profile.markings = [
        { text: 'POS-101', x: 2500, y: 150 }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject markings without text', () => {
      const profile = createValidProfile();
      profile.markings = [
        { text: '', x: 2500, y: 150 }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Marking 0: Text is required');
    });

    it('should reject markings outside profile bounds', () => {
      const profile = createValidProfile();
      profile.markings = [
        { text: 'TEST', x: 7000, y: 150 } // x > length
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Marking 0: Position outside profile bounds');
    });

    it('should handle complex profile with multiple features', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: 100, y: 150, diameter: 22, face: ProfileFace.FRONT },
        { x: 200, y: 150, diameter: 22, face: ProfileFace.FRONT },
        { x: 300, y: 150, diameter: 22, face: ProfileFace.FRONT }
      ];
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
      profile.markings = [
        { text: 'A-123', x: 4000, y: 150 }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateProfiles', () => {
    it('should validate multiple profiles', () => {
      const profiles = [
        createValidProfile(),
        createValidProfile(),
        createValidProfile()
      ];
      profiles[1].designation = 'IPE200';
      profiles[2].designation = 'UPN180';

      const result = validator.validateProfiles(profiles);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.profileResults).toHaveLength(3);
      expect(result.profileResults.every(r => r.isValid)).toBe(true);
    });

    it('should collect errors from all profiles', () => {
      const profiles = [
        createValidProfile(),
        { ...createValidProfile(), designation: '' }, // Invalid
        { ...createValidProfile(), length: -100 } // Invalid
      ];

      const result = validator.validateProfiles(profiles);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.profileResults[0].isValid).toBe(true);
      expect(result.profileResults[1].isValid).toBe(false);
      expect(result.profileResults[2].isValid).toBe(false);
    });

    it('should handle empty array', () => {
      const result = validator.validateProfiles([]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe('No profiles to validate');
    });
  });

  describe('validation levels', () => {
    it('should skip dimension validation in BASIC mode', () => {
      validator = new DSTVValidator(ValidationLevel.BASIC);
      
      const profile = createValidProfile();
      profile.holes = [
        { x: 10000, y: 10000, diameter: 20, face: ProfileFace.FRONT } // Out of bounds
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true); // Should pass in BASIC mode
    });

    it('should perform all validations in STRICT mode', () => {
      validator = new DSTVValidator(ValidationLevel.STRICT);
      
      const profile = createValidProfile();
      profile.holes = [
        { x: 10000, y: 10000, diameter: 20, face: ProfileFace.FRONT } // Out of bounds
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false); // Should fail in STRICT mode
    });

    it('should skip structure validation in BASIC mode', () => {
      validator = new DSTVValidator(ValidationLevel.BASIC);
      
      const profile = {} as DSTVProfile; // Invalid structure

      const result = validator.validateProfile(profile);

      // Should not crash and return some result
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null profile', () => {
      const result = validator.validateProfile(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined features', () => {
      const profile = {
        designation: 'HEA400',
        length: 6000,
        profileType: 'I_PROFILE'
        // No holes, cuts, or markings properties
      } as DSTVProfile;

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(true);
    });

    it('should handle NaN values', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: NaN, y: 100, diameter: 20, face: ProfileFace.FRONT }
      ];

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid'))).toBe(true);
    });

    it('should handle Infinity values', () => {
      const profile = createValidProfile();
      profile.length = Infinity;

      const result = validator.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds'))).toBe(true);
    });

    it('should detect duplicate holes at same position', () => {
      const profile = createValidProfile();
      profile.holes = [
        { x: 100, y: 200, diameter: 20, face: ProfileFace.FRONT },
        { x: 100, y: 200, diameter: 20, face: ProfileFace.FRONT } // Exact duplicate
      ];

      const result = validator.validateProfile(profile);

      expect(result.warnings.some(w => w.includes('Duplicate') || w.includes('overlapping'))).toBe(true);
    });
  });
});