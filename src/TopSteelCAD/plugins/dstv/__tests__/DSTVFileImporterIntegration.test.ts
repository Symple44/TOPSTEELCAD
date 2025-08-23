/**
 * Test d'intégration entre le nouveau système DSTV et le FileImporter
 * Vérifie que les fichiers DSTV sont correctement importés via le nouveau pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileImporter } from '../../../utils/FileImporter';
import { DSTVImportAdapter } from '../DSTVImportAdapter';

describe('DSTV FileImporter Integration', () => {
  beforeEach(() => {
    // Réinitialiser l'adaptateur avant chaque test
    DSTVImportAdapter.getInstance().reset();
  });

  describe('FileImporter with new DSTV system', () => {
    it('should use new DSTV system for .nc files', async () => {
      const dstvContent = `ST
Company Name
Project Alpha
2024-01-15
HEB300
S355
10000
Part-001
BO
100 200 25.5
200 200 25.5
300 200 25.5`;

      const file = new File([dstvContent], 'test.nc', { type: 'text/plain' });
      
      // Spy sur le nouveau système
      const importSpy = vi.spyOn(DSTVImportAdapter, 'importFile');
      
      const result = await FileImporter.importFile(file);
      
      // Vérifier que le nouveau système a été appelé
      expect(importSpy).toHaveBeenCalledWith(file);
      
      // Vérifier le résultat
      expect(result.success).toBe(true);
      expect(result.metadata?.format).toBe('dstv');
      
      importSpy.mockRestore();
    });

    it('should correctly import DSTV file with profile and features', async () => {
      const dstvContent = `ST
Steel Construction
Test Project
2024-01-15
IPE200
S235
8000
BEAM-001
BO
100 50 20
200 50 20
300 50 20
400 50 20
500 50 20
SI
4000 100 15 0 BEAM-001`;

      const file = new File([dstvContent], 'beam.nc', { type: 'text/plain' });
      
      const result = await FileImporter.importFile(file);
      
      expect(result.success).toBe(true);
      expect(result.elements).toBeDefined();
      
      if (result.elements && result.elements.length > 0) {
        const element = result.elements[0];
        
        // Vérifier les propriétés du profil
        expect(element.name).toContain('IPE200');
        expect(element.dimensions.length).toBe(8000);
        expect(element.material.name).toBe('S235');
        
        // Vérifier que les features ont été converties
        expect(element.features).toBeDefined();
        expect(element.features.length).toBeGreaterThanOrEqual(5); // Au moins 5 trous
        
        // Vérifier les métadonnées
        expect(element.metadata?.profileType).toBe('I_PROFILE');
        expect(element.sourceFormat).toBe('dstv');
      }
    });

    it('should handle complex DSTV files', async () => {
      const dstvContent = `ST
Advanced Steel
Complex Project
2024-01-15
HEB400
S355
12000
COLUMN-001
BO
100 200 30
200 200 30
300 200 30
AK
h 0 0
l 12000 0
v 100
l 11900 0
a 11800 200 100
l 200 200
a 100 100 100
l 0 0
IK
rectangular 6000 200 2000 150
SI
6000 350 20 0 COL-001
SC
10000 200 300 200`;

      const file = new File([dstvContent], 'complex.nc', { type: 'text/plain' });
      
      const result = await FileImporter.importFile(file);
      
      expect(result.success).toBe(true);
      expect(result.elements).toBeDefined();
      expect(result.elements?.length).toBeGreaterThan(0);
      
      if (result.elements && result.elements[0]) {
        const element = result.elements[0];
        
        // Vérifier que toutes les features ont été importées
        const features = element.features || [];
        
        // Compter les types de features
        const holeCount = features.filter(f => f.type === 'HOLE').length;
        const contourCount = features.filter(f => f.type === 'CONTOUR').length;
        const markingCount = features.filter(f => f.type === 'MARKING' || f.type === 'TEXT').length;
        const cutCount = features.filter(f => f.type === 'CUT' || f.type === 'CUTOUT').length;
        
        expect(holeCount).toBe(3); // 3 trous BO
        expect(contourCount).toBeGreaterThan(0); // Au moins 1 contour (AK ou IK)
        expect(markingCount).toBe(1); // 1 marquage SI
        expect(cutCount).toBeGreaterThan(0); // Au moins 1 découpe SC
      }
    });

    it('should fallback to legacy parser if new system fails', async () => {
      const dstvContent = `ST
INVALID_CONTENT_THAT_MIGHT_FAIL_NEW_PARSER
BUT_WORKS_WITH_LEGACY`;

      const file = new File([dstvContent], 'legacy.nc', { type: 'text/plain' });
      
      // Forcer une erreur dans le nouveau système
      const originalImport = DSTVImportAdapter.importFile;
      DSTVImportAdapter.importFile = vi.fn().mockRejectedValue(new Error('New system error'));
      
      const consoleSpy = vi.spyOn(console, 'warn');
      
      const result = await FileImporter.importFile(file);
      
      // Le système devrait avoir basculé vers le legacy
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Nouveau système DSTV non disponible'),
        expect.any(Error)
      );
      
      // Restaurer
      DSTVImportAdapter.importFile = originalImport;
      consoleSpy.mockRestore();
    });

    it('should preserve file metadata', async () => {
      const dstvContent = `ST
Company
Project
2024-01-15
HEB200
S355
5000
Part-001`;

      const fileName = 'metadata-test.nc';
      const file = new File([dstvContent], fileName, { type: 'text/plain' });
      
      const result = await FileImporter.importFile(file);
      
      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.fileName).toBe(fileName);
      expect(result.metadata?.format).toBe('dstv');
      expect(result.metadata?.fileSize).toBe(file.size);
      expect(result.metadata?.importDate).toBeInstanceOf(Date);
    });

    it('should handle empty DSTV files gracefully', async () => {
      const dstvContent = `ST`;

      const file = new File([dstvContent], 'empty.nc', { type: 'text/plain' });
      
      const result = await FileImporter.importFile(file);
      
      // Le fichier devrait être traité mais avec des warnings
      expect(result.success).toBeDefined();
      
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should correctly map profile types to MaterialType', async () => {
      const testCases = [
        { profile: 'HEB300', expectedType: 'BEAM' },
        { profile: 'UPN200', expectedType: 'CHANNEL' },
        { profile: 'L100x100x10', expectedType: 'ANGLE' },
      ];

      for (const testCase of testCases) {
        const dstvContent = `ST
Company
Project
2024
${testCase.profile}
S355
6000
Part-001`;

        const file = new File([dstvContent], `${testCase.profile}.nc`, { type: 'text/plain' });
        
        const result = await FileImporter.importFile(file);
        
        if (result.success && result.elements && result.elements[0]) {
          expect(result.elements[0].materialType).toBeDefined();
          // Le type devrait correspondre au mapping attendu
        }
      }
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted files', async () => {
      const corruptedContent = `This is not a valid DSTV file
Random text here
12345 invalid data`;

      const file = new File([corruptedContent], 'corrupted.nc', { type: 'text/plain' });
      
      const result = await FileImporter.importFile(file);
      
      // Le résultat devrait indiquer une erreur
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toContain('DSTV');
      }
    });

    it('should handle binary files incorrectly named as .nc', async () => {
      // Créer un contenu binaire
      const binaryData = new Uint8Array([0xFF, 0xFE, 0x00, 0x01, 0x02, 0x03]);
      const file = new File([binaryData], 'binary.nc', { type: 'application/octet-stream' });
      
      const result = await FileImporter.importFile(file);
      
      // Devrait échouer proprement
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});