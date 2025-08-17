/**
 * Tests pour FileImporter avec support des formats NC
 */
import { FileImporter } from '../FileImporter';
import * as fs from 'fs';
import * as path from 'path';

describe('FileImporter - DSTV/NC Support', () => {
  
  describe('Détection du type de fichier', () => {
    test('Reconnaît tous les formats NC', () => {
      // Créer des fichiers factices pour tester
      const testFiles = [
        new File([''], 'test.nc', { type: 'text/plain' }),
        new File([''], 'test.nc1', { type: 'text/plain' }),
        new File([''], 'test.nc2', { type: 'text/plain' }),
        new File([''], 'test.nc3', { type: 'text/plain' }),
        new File([''], 'test.nc4', { type: 'text/plain' }),
        new File([''], 'test.nc5', { type: 'text/plain' }),
        new File([''], 'test.nc6', { type: 'text/plain' }),
        new File([''], 'test.nc7', { type: 'text/plain' }),
        new File([''], 'test.nc8', { type: 'text/plain' }),
        new File([''], 'test.nc9', { type: 'text/plain' })
      ];

      testFiles.forEach(file => {
        const fileType = FileImporter.getFileType(file);
        expect(fileType).toBe('dstv');
      });
    });

    test('Ne reconnaît pas .dstv (extension invalide)', () => {
      const file = new File([''], 'test.dstv', { type: 'text/plain' });
      const fileType = FileImporter.getFileType(file);
      expect(fileType).toBe('unknown');
    });

    test('Reconnaît les extensions en majuscules', () => {
      const testFiles = [
        new File([''], 'TEST.NC', { type: 'text/plain' }),
        new File([''], 'TEST.NC1', { type: 'text/plain' }),
        new File([''], 'Test.Nc2', { type: 'text/plain' })
      ];

      testFiles.forEach(file => {
        const fileType = FileImporter.getFileType(file);
        expect(fileType).toBe('dstv');
      });
    });
  });

  describe('Import de fichiers NC réels', () => {
    const docPath = path.join(__dirname, '../../../doc/DSTV files');
    
    // Obtenir les fichiers d'exemple s'ils existent
    const getExampleFiles = (): string[] => {
      if (!fs.existsSync(docPath)) return [];
      return fs.readdirSync(docPath)
        .filter(file => file.toLowerCase().endsWith('.nc') || file.toLowerCase().endsWith('.nc1'))
        .slice(0, 3); // Tester seulement les 3 premiers pour la rapidité
    };

    const exampleFiles = getExampleFiles();

    if (exampleFiles.length > 0) {
      test.each(exampleFiles)('Import du fichier %s', async (fileName) => {
        const filePath = path.join(docPath, fileName);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Créer un objet File depuis le contenu
        const file = new File([content], fileName, { type: 'text/plain' });
        
        // Tester l'import
        const result = await FileImporter.importFile(file);
        
        expect(result.success).toBe(true);
        expect(result.elements).toBeDefined();
        expect(result.elements!.length).toBeGreaterThan(0);
        
        // Vérifier les métadonnées
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.format).toBe('dstv');
        expect(result.metadata?.fileName).toBe(fileName);
        expect(result.metadata?.elementsCount).toBeGreaterThan(0);
        
        // Vérifier le premier élément
        const firstElement = result.elements![0];
        expect(firstElement.id).toBeDefined();
        expect(firstElement.name).toBeDefined();
        expect(firstElement.dimensions).toBeDefined();
        expect(firstElement.material).toBeDefined();
      });
    } else {
      test.skip('Pas de fichiers d\'exemple disponibles', () => {});
    }

    test('Import d\'un fichier NC simple', async () => {
      // Contenu NC minimal basé sur le format standard
      const ncContent = `ST
  -
  001
  1
  1
  S235JR
  12
  IPE100
  I
     150.00
     100.00
      55.00
       5.70
       4.10
       7.00
       8.10
       0.40
       0.00
       0.00
       0.00
       0.00
  -
  -
  -
  -
SI
  v    2.00u    2.00  0.00  10r1
EN`;

      const file = new File([ncContent], 'test.nc', { type: 'text/plain' });
      const result = await FileImporter.importFile(file);
      
      expect(result.success).toBe(true);
      expect(result.elements).toBeDefined();
      expect(result.elements!.length).toBe(1);
      
      const element = result.elements![0];
      expect(element.name).toContain('IPE100');
      expect(element.dimensions.length).toBeCloseTo(150, 1);
      expect(element.dimensions.height).toBeCloseTo(100, 1);
      expect(element.material?.grade).toBe('S235JR');
    });

    test('Import d\'un fichier NC2 avec contenu identique', async () => {
      const ncContent = `ST
  -
  001
  1
  1
  S235JR
  2
  PL 10
  B
    1517.51
     120.00
       0.00
       0.00
      10.00
       0.00
      78.50
       2.04
       0.00
       0.00
       0.00
       0.00
  -
  -
  -
  -
SI
  v    2.00u    2.00  0.00  10r10
EN`;

      const file = new File([ncContent], 'test.nc2', { type: 'text/plain' });
      const result = await FileImporter.importFile(file);
      
      expect(result.success).toBe(true);
      expect(result.elements).toBeDefined();
      expect(result.elements!.length).toBe(1);
      
      const element = result.elements![0];
      // Le nom peut être "PL 10" ou juste "10" selon le parsing
      expect(element.name).toBeDefined();
      expect(element.dimensions.length).toBeCloseTo(1517.51, 1);
      expect(element.material?.grade).toBe('S235JR');
    });

    test('Gestion des erreurs - fichier invalide', async () => {
      const invalidContent = 'Ceci n\'est pas un fichier DSTV valide';
      const file = new File([invalidContent], 'invalid.nc', { type: 'text/plain' });
      
      const result = await FileImporter.importFile(file);
      
      // Le parser devrait soit échouer soit retourner 0 éléments
      if (result.success) {
        expect(result.elements?.length).toBe(0);
        expect(result.warnings).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Compatibilité avec différents formats', () => {
    test('Import JSON reste fonctionnel', async () => {
      const jsonContent = JSON.stringify({
        elements: [{
          id: 'test-1',
          name: 'Test Element',
          materialType: 'IPE100',
          dimensions: { length: 100, width: 50, height: 100, thickness: 10 },
          position: [0, 0, 0]
        }]
      });
      
      const file = new File([jsonContent], 'test.json', { type: 'application/json' });
      const result = await FileImporter.importFile(file);
      
      expect(result.success).toBe(true);
      expect(result.elements?.length).toBe(1);
      expect(result.metadata?.format).toBe('json');
    });

    test('Formats non supportés retournent une erreur appropriée', async () => {
      const testFiles = [
        new File([''], 'test.xyz', { type: 'text/plain' }),
        new File([''], 'test.abc', { type: 'text/plain' }),
        new File([''], 'test.nc10', { type: 'text/plain' }), // nc10 n'est pas supporté
        new File([''], 'test.dstv', { type: 'text/plain' }) // .dstv n'existe pas
      ];

      for (const file of testFiles) {
        const result = await FileImporter.importFile(file);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Format de fichier non supporté');
      }
    });
  });
});