/**
 * Test simple pour vérifier le round-trip DSTV
 */
import { DSTVParser } from '../../../parsers/DSTVParser';
import * as fs from 'fs';
import * as path from 'path';

describe('DSTV Round-Trip Test', () => {
  
  test('Le parser peut lire le fichier exemple 1.nc', async () => {
    const examplePath = path.join(__dirname, '../../../../../doc/DSTV files/1.nc');
    if (fs.existsSync(examplePath)) {
      const content = fs.readFileSync(examplePath, 'utf-8');
      
      const parser = new DSTVParser();
      const scene = await parser.parse(content);
      
      expect(scene.elements.size).toBe(1);
      const element = Array.from(scene.elements.values())[0];
      
      // Vérifications de base
      expect(element.name).toBe('IPE100');
      expect(element.dimensions.length).toBeCloseTo(150, 1);
      expect(element.dimensions.height).toBeCloseTo(100, 1);
      expect(element.dimensions.width).toBeCloseTo(55, 1);
      expect(element.material?.grade).toBe('S235JR');
    }
  });

  test('Le parser peut lire le fichier exporté', async () => {
    const exportedPath = path.join(__dirname, '../../../../../export/1.nc');
    if (fs.existsSync(exportedPath)) {
      const content = fs.readFileSync(exportedPath, 'utf-8');
      
      const parser = new DSTVParser();
      const scene = await parser.parse(content);
      
      expect(scene.elements.size).toBe(1);
      const element = Array.from(scene.elements.values())[0];
      
      // Vérifications basiques
      expect(element).toBeDefined();
      expect(element.name).toBeDefined();
      expect(element.dimensions).toBeDefined();
    }
  });

  test('Format exporté conforme après corrections', () => {
    const testResultPath = path.join(__dirname, '../../../../../export/test-export-result.nc');
    const examplePath = path.join(__dirname, '../../../../../doc/DSTV files/1.nc');
    
    if (fs.existsSync(testResultPath) && fs.existsSync(examplePath)) {
      const testContent = fs.readFileSync(testResultPath, 'utf-8');
      const exampleContent = fs.readFileSync(examplePath, 'utf-8');
      
      const testLines = testContent.split(/\r?\n/).filter(line => line.trim());
      const exampleLines = exampleContent.split(/\r?\n/).filter(line => line.trim());
      
      // Comparer les lignes critiques
      expect(testLines[0]).toBe(exampleLines[0]); // ST
      expect(testLines[1]).toBe(exampleLines[1]); // -
      expect(testLines[7]).toBe(exampleLines[7]); // IPE100
      expect(testLines[8]).toBe(exampleLines[8]); // I
      
      // Vérifier les dimensions (lignes 9-14)
      for (let i = 9; i <= 14; i++) {
        const testValue = parseFloat(testLines[i].trim());
        const exampleValue = parseFloat(exampleLines[i].trim());
        expect(testValue).toBeCloseTo(exampleValue, 2);
      }
      
      // Fin
      expect(testLines[testLines.length - 1]).toBe('EN');
    }
  });
});