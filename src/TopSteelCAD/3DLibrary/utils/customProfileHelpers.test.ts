/**
 * Tests unitaires pour les helpers de profils personnalisés
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createCustomProfile,
  createSimpleContour,
  createCustomIProfile,
  createCustomTProfile,
  validateCustomProfile,
  calculateGeometryProperties,
  calculateContourArea,
  calculateContourPerimeter,
  calculateCentroid,
  calculateWeight,
  calculateBoundingBox,
  isContourClosed
} from './customProfileHelpers';

import {
  CustomProfile,
  Shape2D,
  SegmentType,
  Point2D
} from '../types/custom-profile.types';

describe('CustomProfileHelpers', () => {

  // ========================================================================
  // CRÉATION DE CONTOURS SIMPLES
  // ========================================================================

  describe('createSimpleContour', () => {

    it('devrait créer un contour rectangulaire', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 200,
        height: 100,
        center: { x: 0, y: 0 }
      });

      expect(contour).toBeDefined();
      expect(contour.segments).toHaveLength(4); // 4 côtés
      expect(contour.closed).toBe(true);
      expect(contour.area).toBeCloseTo(20000, 0); // 200 * 100 = 20000 mm²
    });

    it('devrait créer un contour circulaire', () => {
      const contour = createSimpleContour({
        type: 'circle',
        radius: 50,
        center: { x: 0, y: 0 }
      });

      expect(contour).toBeDefined();
      expect(contour.segments).toHaveLength(1); // 1 arc
      expect(contour.segments[0].type).toBe(SegmentType.ARC);
      expect(contour.closed).toBe(true);
    });

    it('devrait créer un contour polygonal', () => {
      const points: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];

      const contour = createSimpleContour({
        type: 'polygon',
        points
      });

      expect(contour).toBeDefined();
      expect(contour.segments).toHaveLength(4);
      expect(contour.closed).toBe(true);
    });

    it('devrait échouer si dimensions manquantes pour rectangle', () => {
      expect(() => {
        createSimpleContour({
          type: 'rectangle',
          width: 200
          // height manquant
        } as any);
      }).toThrow();
    });

    it('devrait échouer si rayon manquant pour cercle', () => {
      expect(() => {
        createSimpleContour({
          type: 'circle'
          // radius manquant
        } as any);
      }).toThrow();
    });

  });

  // ========================================================================
  // CRÉATION DE PROFILS
  // ========================================================================

  describe('createCustomProfile', () => {

    it('devrait créer un profil personnalisé complet', () => {
      const rectangle = createSimpleContour({
        type: 'rectangle',
        width: 200,
        height: 100
      });

      const profile = createCustomProfile({
        name: 'Test Rectangle',
        designation: 'RECT-200x100',
        description: 'Profil de test',
        shape: { outerContour: rectangle },
        author: 'Test Author',
        tags: ['test', 'rectangle'],
        defaultMaterial: {
          grade: 'S355',
          density: 7.85
        }
      });

      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Test Rectangle');
      expect(profile.designation).toBe('RECT-200x100');
      expect(profile.properties.area).toBeCloseTo(200, 0); // 20000 mm² = 200 cm²
      expect(profile.weight).toBeDefined();
      expect(profile.metadata).toBeDefined();
      expect(profile.metadata.author).toBe('Test Author');
      expect(profile.metadata.tags).toContain('test');
    });

    it('devrait calculer les propriétés automatiquement', () => {
      const rectangle = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 50
      });

      const profile = createCustomProfile({
        name: 'Test',
        designation: 'TEST-001',
        shape: { outerContour: rectangle },
        defaultMaterial: { grade: 'S235', density: 7.85 }
      });

      // Aire: 100 * 50 = 5000 mm² = 50 cm²
      expect(profile.properties.area).toBeCloseTo(50, 0);

      // Périmètre: 2 * (100 + 50) = 300 mm
      expect(profile.properties.perimeter).toBeCloseTo(300, 0);

      // Centre de gravité au centre
      expect(profile.properties.centroid.x).toBeCloseTo(0, 1);
      expect(profile.properties.centroid.y).toBeCloseTo(0, 1);

      // Poids: 50 cm² * 7.85 kg/dm³ / 100 = 3.925 kg/m
      expect(profile.weight).toBeCloseTo(3.925, 2);
    });

  });

  describe('createCustomTProfile', () => {

    it('devrait créer un profil en T', () => {
      const profile = createCustomTProfile(200, 150, 10, 15, 'Test T-Profile');

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Test T-Profile');
      expect(profile.designation).toContain('CUSTOM-T-');
      expect(profile.shape.outerContour.segments.length).toBeGreaterThan(0);
      expect(profile.properties.area).toBeGreaterThan(0);
    });

  });

  describe('createCustomIProfile', () => {

    it('devrait créer un profil en I', () => {
      const profile = createCustomIProfile(300, 150, 7.1, 10.7, 'Test I-Profile');

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Test I-Profile');
      expect(profile.designation).toContain('CUSTOM-I-');
      expect(profile.shape.outerContour.segments.length).toBe(12); // Profil I a 12 segments
      expect(profile.properties.area).toBeGreaterThan(0);
    });

  });

  // ========================================================================
  // CALCULS GÉOMÉTRIQUES
  // ========================================================================

  describe('calculateContourArea', () => {

    it('devrait calculer l\'aire d\'un rectangle', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 50
      });

      const area = calculateContourArea(contour.segments);
      expect(area).toBeCloseTo(5000, 0); // 100 * 50 = 5000 mm²
    });

    it('devrait calculer l\'aire d\'un triangle', () => {
      const points: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 }
      ];

      const contour = createSimpleContour({
        type: 'polygon',
        points
      });

      const area = calculateContourArea(contour.segments);
      expect(area).toBeCloseTo(5000, 0); // base * hauteur / 2 = 100 * 100 / 2
    });

  });

  describe('calculateContourPerimeter', () => {

    it('devrait calculer le périmètre d\'un carré', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 100
      });

      const perimeter = calculateContourPerimeter(contour.segments);
      expect(perimeter).toBeCloseTo(400, 0); // 4 * 100
    });

    it('devrait calculer le périmètre d\'un rectangle', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 200,
        height: 100
      });

      const perimeter = calculateContourPerimeter(contour.segments);
      expect(perimeter).toBeCloseTo(600, 0); // 2 * (200 + 100)
    });

  });

  describe('calculateCentroid', () => {

    it('devrait calculer le centre de gravité d\'un rectangle centré', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 50,
        center: { x: 0, y: 0 }
      });

      const centroid = calculateCentroid(contour.segments);
      expect(centroid.x).toBeCloseTo(0, 1);
      expect(centroid.y).toBeCloseTo(0, 1);
    });

    it('devrait calculer le centre de gravité d\'un rectangle décalé', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 50,
        center: { x: 50, y: 25 }
      });

      const centroid = calculateCentroid(contour.segments);
      expect(centroid.x).toBeCloseTo(50, 1);
      expect(centroid.y).toBeCloseTo(25, 1);
    });

  });

  describe('calculateWeight', () => {

    it('devrait calculer le poids linéique', () => {
      const area = 50; // cm²
      const density = 7.85; // kg/dm³

      const weight = calculateWeight(area, density);
      expect(weight).toBeCloseTo(3.925, 2); // 50 * 7.85 / 100
    });

    it('devrait calculer le poids pour différents matériaux', () => {
      const area = 100; // cm²

      const steelWeight = calculateWeight(area, 7.85); // Acier
      const aluminumWeight = calculateWeight(area, 2.70); // Aluminium

      expect(steelWeight).toBeCloseTo(7.85, 2);
      expect(aluminumWeight).toBeCloseTo(2.70, 2);
      expect(steelWeight).toBeGreaterThan(aluminumWeight);
    });

  });

  describe('calculateBoundingBox', () => {

    it('devrait calculer la bounding box d\'un rectangle', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 200,
        height: 100,
        center: { x: 0, y: 0 }
      });

      const bbox = calculateBoundingBox({ outerContour: contour });

      expect(bbox.minX).toBeCloseTo(-100, 0);
      expect(bbox.maxX).toBeCloseTo(100, 0);
      expect(bbox.minY).toBeCloseTo(-50, 0);
      expect(bbox.maxY).toBeCloseTo(50, 0);
    });

  });

  // ========================================================================
  // VALIDATION
  // ========================================================================

  describe('validateCustomProfile', () => {

    let validProfile: CustomProfile;

    beforeEach(() => {
      const rectangle = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 50
      });

      validProfile = createCustomProfile({
        name: 'Valid Profile',
        designation: 'VALID-001',
        shape: { outerContour: rectangle },
        defaultMaterial: { grade: 'S355', density: 7.85 }
      });
    });

    it('devrait valider un profil correct', () => {
      const result = validateCustomProfile(validProfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait détecter un ID manquant', () => {
      const invalidProfile = { ...validProfile, id: '' };
      const result = validateCustomProfile(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
    });

    it('devrait détecter un nom manquant', () => {
      const invalidProfile = { ...validProfile, name: '' };
      const result = validateCustomProfile(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('devrait détecter une aire invalide', () => {
      const invalidProfile = {
        ...validProfile,
        properties: { ...validProfile.properties, area: -10 }
      };
      const result = validateCustomProfile(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_AREA')).toBe(true);
    });

    it('devrait valider avec règles personnalisées - aire minimum', () => {
      const result = validateCustomProfile(validProfile, {
        minArea: 100 // Le profil a 50 cm², donc doit échouer
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'AREA_TOO_SMALL')).toBe(true);
    });

    it('devrait valider avec règles personnalisées - aire maximum', () => {
      const result = validateCustomProfile(validProfile, {
        maxArea: 25 // Le profil a 50 cm², donc doit échouer
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'AREA_TOO_LARGE')).toBe(true);
    });

    it('devrait accepter un profil dans la plage valide', () => {
      const result = validateCustomProfile(validProfile, {
        minArea: 40,
        maxArea: 60
      });

      expect(result.isValid).toBe(true);
    });

  });

  describe('isContourClosed', () => {

    it('devrait détecter un contour fermé', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 100,
        height: 50
      });

      const closed = isContourClosed(contour);
      expect(closed).toBe(true);
    });

    it('devrait détecter un contour ouvert', () => {
      const openContour = {
        id: 'open',
        segments: [
          {
            type: SegmentType.LINE,
            start: { x: 0, y: 0 },
            end: { x: 100, y: 0 }
          },
          {
            type: SegmentType.LINE,
            start: { x: 100, y: 0 },
            end: { x: 100, y: 100 }
          }
          // Pas de retour au point de départ
        ],
        closed: false
      };

      const closed = isContourClosed(openContour);
      expect(closed).toBe(false);
    });

  });

  // ========================================================================
  // PROFILS AVEC TROUS
  // ========================================================================

  describe('Profils avec trous', () => {

    it('devrait calculer l\'aire nette (contour - trou)', () => {
      const outerContour = createSimpleContour({
        type: 'rectangle',
        width: 200,
        height: 100,
        center: { x: 0, y: 0 }
      });

      const hole = createSimpleContour({
        type: 'rectangle',
        width: 50,
        height: 30,
        center: { x: 0, y: 0 }
      });

      const shape: Shape2D = {
        outerContour,
        holes: [hole]
      };

      const properties = calculateGeometryProperties(shape);

      // Aire extérieure: 200 * 100 = 20000 mm² = 200 cm²
      // Aire trou: 50 * 30 = 1500 mm² = 15 cm²
      // Aire nette: 200 - 15 = 185 cm²
      expect(properties.area).toBeCloseTo(185, 0);
    });

    it('devrait calculer l\'aire avec plusieurs trous', () => {
      const outerContour = createSimpleContour({
        type: 'rectangle',
        width: 300,
        height: 200
      });

      const hole1 = createSimpleContour({
        type: 'circle',
        radius: 25,
        center: { x: -50, y: 0 }
      });

      const hole2 = createSimpleContour({
        type: 'circle',
        radius: 25,
        center: { x: 50, y: 0 }
      });

      const shape: Shape2D = {
        outerContour,
        holes: [hole1, hole2]
      };

      const properties = calculateGeometryProperties(shape);

      // Aire extérieure: 300 * 200 = 60000 mm² = 600 cm²
      // Aire 2 trous: 2 * π * 25² ≈ 3927 mm² ≈ 39.27 cm²
      // Aire nette: 600 - 39.27 ≈ 560.73 cm²
      expect(properties.area).toBeCloseTo(560.73, 0);
    });

  });

  // ========================================================================
  // CAS LIMITES
  // ========================================================================

  describe('Cas limites', () => {

    it('devrait gérer un profil très petit', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 1,
        height: 1
      });

      const profile = createCustomProfile({
        name: 'Tiny',
        designation: 'TINY-001',
        shape: { outerContour: contour },
        defaultMaterial: { grade: 'S355', density: 7.85 }
      });

      expect(profile.properties.area).toBeCloseTo(0.01, 2); // 1mm² = 0.01cm²
    });

    it('devrait gérer un profil très grand', () => {
      const contour = createSimpleContour({
        type: 'rectangle',
        width: 10000,
        height: 5000
      });

      const profile = createCustomProfile({
        name: 'Large',
        designation: 'LARGE-001',
        shape: { outerContour: contour },
        defaultMaterial: { grade: 'S355', density: 7.85 }
      });

      expect(profile.properties.area).toBeCloseTo(5000, 0); // 50000000mm² = 5000cm²
    });

    it('devrait gérer un contour vide', () => {
      const emptyContour = {
        id: 'empty',
        segments: [],
        closed: false
      };

      expect(() => {
        calculateContourArea(emptyContour.segments);
      }).not.toThrow();
    });

  });

});
