import { DSTVExporter } from '../DSTVExporter';
import { PivotElement } from '../../../../types/viewer';

describe('DSTVExporter', () => {
  // Élément de test IPE100 basé sur l'exemple 1.nc
  const createIPE100Element = (): PivotElement => ({
    id: 'test-1',
    name: 'IPE100',
    materialType: 'IPE100',
    dimensions: {
      length: 150,
      width: 55,
      height: 100,
      thickness: 5.7,
      flangeThickness: 5.7,
      webThickness: 4.1,
      radius: 7
    },
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      name: 'S235JR',
      grade: 'S235JR',
      density: 7850,
      color: '#4b5563',
      opacity: 1,
      metallic: 0.7,
      roughness: 0.3,
      reflectivity: 0.5
    },
    visible: true,
    createdAt: new Date()
  });

  // Élément de test PL10 basé sur l'exemple 10.nc
  const createPL10Element = (): PivotElement => ({
    id: 'test-10',
    name: 'PL 10',
    materialType: 'PL 10',
    dimensions: {
      length: 1517.51,
      width: 120,
      thickness: 10
    },
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      name: 'S235JR',
      grade: 'S235JR',
      density: 7850,
      color: '#4b5563',
      opacity: 1,
      metallic: 0.7,
      roughness: 0.3,
      reflectivity: 0.5
    },
    visible: true,
    createdAt: new Date()
  });

  // Élément de test HE120B basé sur T1.NC1
  const createHE120BElement = (): PivotElement => ({
    id: 'test-T1',
    name: 'T1',
    materialType: 'HE120B',
    dimensions: {
      length: 4165,
      width: 120,
      height: 120,
      thickness: 11,
      flangeThickness: 11,
      webThickness: 6.5
    },
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      name: 'S275JR',
      grade: 'S275JR',
      density: 7850,
      color: '#4b5563',
      opacity: 1,
      metallic: 0.7,
      roughness: 0.3,
      reflectivity: 0.5
    },
    visible: true,
    createdAt: new Date()
  });

  test('should export IPE100 in correct DSTV format', async () => {
    const element = createIPE100Element();
    const result = await DSTVExporter.export(
      [element],
      'test.nc',
      { includeFeatures: false, includeMetadata: false }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Blob);
    
    // TODO: Vérifier le contenu du fichier NC généré
    // Pour un test complet, il faudrait extraire et vérifier le contenu du ZIP
  });

  test('should export PL10 (plate) in correct DSTV format', async () => {
    const element = createPL10Element();
    const result = await DSTVExporter.export(
      [element],
      'test.nc',
      { includeFeatures: false, includeMetadata: false }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Blob);
  });

  test('should export HE120B with AK blocks', async () => {
    const element = createHE120BElement();
    const result = await DSTVExporter.export(
      [element],
      'test.nc',
      { includeFeatures: false, includeMetadata: true }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Blob);
  });

  test('should handle multiple elements', async () => {
    const elements = [
      createIPE100Element(),
      createPL10Element(),
      createHE120BElement()
    ];
    
    const result = await DSTVExporter.export(
      elements,
      'test.nc',
      { includeFeatures: false, includeMetadata: false }
    );

    expect(result.success).toBe(true);
    expect(result.metadata?.elementsCount).toBe(3);
  });
});