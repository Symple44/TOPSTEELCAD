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
    // CORRIGÉ : Les coordonnées sont maintenant transformées correctement selon la face
    expect(result.features).toHaveLength(2);
    expect(result.features![0].id).toBe('hole-1');
    expect(result.features![0].type).toBe(FeatureType.HOLE);
    // hole-1: face TOP, DSTV(x=100, y=50) → transformé en coords globales [X, Y, Z]
    // Convention HoleProcessor: X=largeur, Y=hauteur, Z=longueur
    // Face TOP: globalX = y - width/2 = 50-50 = 0, globalY = height/2 = 100, globalZ = x = 100
    expect(result.features![0].position).toEqual([0, 100, 100]);
    expect(result.features![0].selectable).toBe(true);

    // Test des features dans metadata pour FeatureApplicator
    // CORRIGÉ : Les coordonnées transformées sont également dans metadata.features
    expect(result.metadata.features).toHaveLength(2);
    expect(result.metadata.features[0].id).toBe('hole-1');
    expect(result.metadata.features[0].type).toBe('hole');
    expect(result.metadata.features[0].position).toEqual([0, 100, 100]);
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

    // IPE200 : doit parser "200" → height=200, width=100 (fallback)
    // Sans dimensions définies, thickness=10 (fallback), donc flangeThickness=thickness=10
    expect(result.dimensions.width).toBe(100);
    expect(result.dimensions.height).toBe(200); // Parsé depuis "200"
    expect(result.dimensions.webThickness).toBe(10);
    expect(result.dimensions.flangeThickness).toBe(10); // = thickness (fallback)
  });

  test('should parse dimensions from profileSubType for RHS', () => {
    const rhsElement: PartElement = {
      ...mockPartElement,
      profileType: 'RHS' as any,
      profileSubType: '40x20x2',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(rhsElement);

    // Doit parser "40x20x2" → width=40, height=20, thickness=2
    expect(result.dimensions.width).toBe(40);
    expect(result.dimensions.height).toBe(20);
    expect(result.dimensions.thickness).toBe(2);
  });

  test('should parse dimensions from profileSubType for SHS', () => {
    const shsElement: PartElement = {
      ...mockPartElement,
      profileType: 'SHS' as any,
      profileSubType: '50x50x3',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(shsElement);

    // Doit parser "50x50x3" → width=50, height=50, thickness=3
    expect(result.dimensions.width).toBe(50);
    expect(result.dimensions.height).toBe(50);
    expect(result.dimensions.thickness).toBe(3);
  });

  test('should parse dimensions from profileSubType for CHS', () => {
    const chsElement: PartElement = {
      ...mockPartElement,
      profileType: 'CHS' as any,
      profileSubType: '60.3x2.9',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(chsElement);

    // Doit parser "60.3x2.9" → diameter=60.3, thickness=2.9
    expect(result.dimensions.diameter).toBe(60.3);
    expect(result.dimensions.thickness).toBe(2.9);
    // Pour CHS, width et height doivent être égaux au diamètre
    expect(result.dimensions.width).toBe(60.3);
    expect(result.dimensions.height).toBe(60.3);
  });

  test('should parse dimensions from profileSubType for FLAT', () => {
    const flatElement: PartElement = {
      ...mockPartElement,
      profileType: 'FLAT' as any,
      profileSubType: '50x10',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(flatElement);

    // Doit parser "50x10" → width=50, thickness=10
    expect(result.dimensions.width).toBe(50);
    expect(result.dimensions.thickness).toBe(10);
    expect(result.dimensions.height).toBe(10); // height = thickness pour plats
  });

  test('should parse dimensions from profileSubType for ROUND_BAR', () => {
    const roundBarElement: PartElement = {
      ...mockPartElement,
      profileType: 'ROUND_BAR' as any,
      profileSubType: '25',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(roundBarElement);

    // Doit parser "25" → diameter=25
    expect(result.dimensions.diameter).toBe(25);
    expect(result.dimensions.width).toBe(25);
    expect(result.dimensions.height).toBe(25);
  });

  test('should parse dimensions from profileSubType for SQUARE_BAR', () => {
    const squareBarElement: PartElement = {
      ...mockPartElement,
      profileType: 'SQUARE_BAR' as any,
      profileSubType: '30',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(squareBarElement);

    // Doit parser "30" → width=30, height=30
    expect(result.dimensions.width).toBe(30);
    expect(result.dimensions.height).toBe(30);
  });

  test('should parse dimensions from profileSubType for T profile', () => {
    const tElement: PartElement = {
      ...mockPartElement,
      profileType: 'T' as any,
      profileSubType: '80x80x8',
      dimensions: undefined
    };

    const result = convertPartElementToPivotElement(tElement);

    // Doit parser "80x80x8" → width=80, height=80, thickness=8
    expect(result.dimensions.width).toBe(80);
    expect(result.dimensions.height).toBe(80);
    expect(result.dimensions.thickness).toBe(8);
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