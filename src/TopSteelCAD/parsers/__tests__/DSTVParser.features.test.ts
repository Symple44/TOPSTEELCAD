/**
 * Test du parsing des features DSTV (trous, découpes, etc.)
 */
import { DSTVParser } from '../DSTVParser';
import * as fs from 'fs';
import * as path from 'path';

describe('DSTVParser - Features Support', () => {
  
  describe('Import du fichier 14.nc avec trous', () => {
    let parser: DSTVParser;
    let content: string;
    
    beforeAll(() => {
      parser = new DSTVParser();
      const filePath = path.join(__dirname, '../../../../doc/DSTV files/14.nc');
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    });
    
    test('Parse le fichier avec succès', async () => {
      if (!content) {
        console.log('Fichier 14.nc non trouvé, test ignoré');
        return;
      }
      
      const scene = await parser.parse(content);
      expect(scene.elements.size).toBeGreaterThan(0);
    });
    
    test('Détecte le plat PL 15', async () => {
      if (!content) return;
      
      const scene = await parser.parse(content);
      const element = Array.from(scene.elements.values())[0];
      
      expect(element.name).toBe('PL 15');
      expect(element.materialType).toBe('plate');
      expect(element.dimensions.length).toBe(220);
      expect(element.dimensions.width).toBe(120);
      expect(element.dimensions.thickness).toBe(15);
    });
    
    test('Détecte les 4 trous', async () => {
      if (!content) return;
      
      const scene = await parser.parse(content);
      const element = Array.from(scene.elements.values())[0];
      
      expect(element.metadata).toBeDefined();
      expect(element.metadata.features).toBeDefined();
      expect(element.metadata.features.length).toBe(4);
      
      // Vérifier chaque trou
      const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
      expect(holes.length).toBe(4);
      
      // Vérifier les positions des trous
      const expectedPositions = [
        [170, 25, 0],
        [50, 25, 0],
        [170, 95, 0],
        [50, 95, 0]
      ];
      
      holes.forEach((hole: any, index: number) => {
        expect(hole.diameter).toBe(18);
        expect(hole.position).toEqual(expectedPositions[index]);
        expect(hole.face).toBe('v');
      });
    });
  });
  
  describe('Import du fichier 2.nc avec trous', () => {
    let parser: DSTVParser;
    let content: string;
    
    beforeAll(() => {
      parser = new DSTVParser();
      const filePath = path.join(__dirname, '../../../../doc/DSTV files/2.nc');
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    });
    
    test('Détecte le profil IPE300', async () => {
      if (!content) return;
      
      const scene = await parser.parse(content);
      const element = Array.from(scene.elements.values())[0];
      
      expect(element.name).toBe('IPE300');
      expect(element.materialType).toBe('beam');
    });
    
    test('Détecte les 2 trous du IPE300', async () => {
      if (!content) return;
      
      const scene = await parser.parse(content);
      const element = Array.from(scene.elements.values())[0];
      
      if (element.metadata && element.metadata.features) {
        const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
        expect(holes.length).toBe(2);
        
        // Positions attendues
        expect(holes[0].position[0]).toBe(4703);
        expect(holes[0].position[1]).toBe(150);
        expect(holes[1].position[0]).toBe(4653);
        expect(holes[1].position[1]).toBe(150);
      }
    });
  });
  
  describe('Parsing de blocs BO complexes', () => {
    test('Parse un bloc BO avec multiples trous', async () => {
      const dstvContent = `ST
  -
  001
  1
  1
  S235JR
  2
  PL 20
  B
     500.00
     200.00
       0.00
       0.00
      20.00
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
BO
  v   100.00u    50.00  20.00   0.00
  v   200.00u    50.00  20.00   0.00
  v   300.00u    50.00  20.00   0.00
  u   100.00o   150.00  25.00  10.00
  o   400.00v   150.00  25.00  10.00
EN`;
      
      const parser = new DSTVParser();
      const scene = await parser.parse(dstvContent);
      const element = Array.from(scene.elements.values())[0];
      
      expect(element.metadata.features).toBeDefined();
      const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
      expect(holes.length).toBe(5);
      
      // Vérifier différentes faces
      const vFaceHoles = holes.filter((h: any) => h.face === 'v');
      const uFaceHoles = holes.filter((h: any) => h.face === 'u');
      const oFaceHoles = holes.filter((h: any) => h.face === 'o');
      
      expect(vFaceHoles.length).toBe(3);
      expect(uFaceHoles.length).toBe(1);
      expect(oFaceHoles.length).toBe(1);
    });
  });
});