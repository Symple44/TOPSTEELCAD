import { describe, test, expect } from 'vitest';
import { convertPartElementToPivotElement } from './partToPivot';
import { PartElement, DSTVFace } from '../types/partBuilder.types';
import { MaterialType, FeatureType } from '../../../types/viewer';

describe('partToPivot converter', () => {
  const mockPartElement: PartElement = {
    id: 'test-element-1',
    reference: 'A1',
    designation: 'Poutre test',
    quantity: 2,
    profileType: 'IPE' as any,
    profileSubType: '200',
    length: 3000,
    material: 'S355',
    holes: [
      {
        id: 'hole-1',
        label: 'A',
        diameter: 16,
        coordinates: {
          face: DSTVFace.TOP,
          x: 100,
          y: 50,
          z: 0
        },
        isThrough: true
      },
      {
        id: 'hole-2',
        label: 'B',
        diameter: 20,
        coordinates: {
          face: DSTVFace.FRONT,
          x: 200,
          y: 30,
          z: 0
        },
        depth: 15,
        isThrough: false
      }
    ],
    status: 'draft',
    notes: 'Element de test',
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 5.6,
      flangeThickness: 8.5
    }
  };

  test('should convert PartElement to PivotElement correctly', () => {
    const result = convertPartElementToPivotElement(mockPartElement);

    // Test des propriétés de base
    expect(result.id).toBe('test-element-1');
    expect(result.name).toBe('IPE200');
    expect(result.description).toBe('Poutre test');
    expect(result.materialType).toBe(MaterialType.BEAM);
    expect(result.partNumber).toBe('A1');

    // Test des dimensions
    expect(result.dimensions.length).toBe(3000);
    expect(result.dimensions.width).toBe(100);
    expect(result.dimensions.height).toBe(200);
    expect(result.dimensions.webThickness).toBe(5.6);
    expect(result.dimensions.flangeThickness).toBe(8.5);

    // Test de la transformation spatiale (format tableau)
    expect(result.position).toEqual([0, 0, 0]);
    expect(result.rotation).toEqual([0, 0, 0]);
    expect(result.scale).toEqual([1, 1, 1]);

    // Test du matériau
    expect(result.material.grade).toBe('S355');
    expect(result.material.density).toBe(7850);
    expect(result.material.opacity).toBe(1.0);

    // Test des features sélectionnables
    expect(result.features).toHaveLength(2);
    expect(result.features![0].id).toBe('hole-1');
    expect(result.features![0].type).toBe(FeatureType.HOLE);
    expect(result.features![0].position).toEqual([100, 50, 0]);
    expect(result.features![0].selectable).toBe(true);

    // Test des features dans metadata pour FeatureApplicator
    expect(result.metadata.features).toHaveLength(2);
    expect(result.metadata.features[0].id).toBe('hole-1');
    expect(result.metadata.features[0].type).toBe('hole');
    expect(result.metadata.features[0].position).toEqual([100, 50, 0]);
    expect(result.metadata.features[0].parameters.diameter).toBe(16);
    expect(result.metadata.features[0].parameters.isThrough).toBe(true);

    // Test du deuxième trou (non traversant)
    expect(result.metadata.features[1].parameters.diameter).toBe(20);
    expect(result.metadata.features[1].parameters.depth).toBe(15);
    expect(result.metadata.features[1].parameters.isThrough).toBe(false);

    // Test des métadonnées étendues
    expect(result.metadata.originalElement).toEqual(mockPartElement);
    expect(result.metadata.quantity).toBe(2);
    expect(result.metadata.status).toBe('draft');
    expect(result.metadata.profileType).toBe('IPE');
    expect(result.metadata.profileSubType).toBe('200');

    // Test des données de fabrication
    expect(result.cuttingData?.profile).toBe('IPE200');
    expect(result.cuttingData?.length).toBe(3000);

    // Test de l'état d'affichage
    expect(result.visible).toBe(true);
    expect(result.selected).toBe(false);
    expect(result.highlighted).toBe(false);

    // Test des timestamps
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  test('should handle empty holes array', () => {
    const elementWithoutHoles: PartElement = {
      ...mockPartElement,
      holes: []
    };

    const result = convertPartElementToPivotElement(elementWithoutHoles);

    expect(result.features).toHaveLength(0);
    expect(result.metadata.features).toHaveLength(0);
  });

  test('should calculate volume correctly', () => {
    const result = convertPartElementToPivotElement(mockPartElement);

    // Volume = longueur * largeur * hauteur (en m³)
    // 3000mm * 100mm * 200mm = 0.06 m³
    const expectedVolume = (3000 / 1000) * (100 / 1000) * (200 / 1000);
    expect(result.volume).toBe(expectedVolume);
  });

  test('should handle missing dimensions gracefully', () => {
    const elementWithoutDimensions: PartElement = {
      ...mockPartElement,
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(elementWithoutDimensions);

    // Doit utiliser les valeurs par défaut
    expect(result.dimensions.width).toBe(100);
    expect(result.dimensions.height).toBe(100);
    expect(result.dimensions.webThickness).toBe(10);
    expect(result.dimensions.flangeThickness).toBe(15);
  });

  test('should determine MaterialType from ProfileType correctly', () => {
    const testCases = [
      { profileType: 'IPE', expected: MaterialType.BEAM },
      { profileType: 'HEA', expected: MaterialType.BEAM },
      { profileType: 'UPN', expected: MaterialType.CHANNEL },
      { profileType: 'L', expected: MaterialType.ANGLE },
      { profileType: 'TUBE_ROND', expected: MaterialType.TUBE },
      { profileType: 'PLAT', expected: MaterialType.PLATE },
      { profileType: 'UNKNOWN', expected: MaterialType.BEAM } // fallback
    ];

    testCases.forEach(({ profileType, expected }) => {
      const element: PartElement = {
        ...mockPartElement,
        profileType: profileType as any
      };

      const result = convertPartElementToPivotElement(element);
      expect(result.materialType).toBe(expected);
    });
  });

  test('should preserve original data for traceability', () => {
    const result = convertPartElementToPivotElement(mockPartElement);

    expect(result.sourceFormat).toBe('manual');
    expect(result.originalData).toEqual(mockPartElement);
    expect(result.metadata.originalElement).toEqual(mockPartElement);
  });
});