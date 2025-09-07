/**
 * Test d'import DSTV avec affichage complet des logs
 * Permet de spécifier le fichier à importer en paramètre
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DSTVImportPipeline } from '../import/DSTVImportPipeline';

// Désactiver les mocks Three.js pour ce test
vi.unmock('three');
import { MaterialType } from '@/types/viewer';

// Récupérer le fichier depuis les arguments de la ligne de commande ou une variable d'environnement
const TEST_FILE = process.env.DSTV_TEST_FILE || process.argv.find(arg => arg.endsWith('.nc') || arg.endsWith('.NC1'));

describe('DSTV Import avec logs complets', () => {
  let pipeline: DSTVImportPipeline;

  beforeEach(() => {
    // Configuration avec logs debug activés
    const config = {
      strictMode: false,
      enableDebugLogs: true,
      maxFileSize: 10 * 1024 * 1024,
      supportedVersions: ['1.0'],
      validateGeometry: true,
      optimizeGeometry: false
    };
    
    pipeline = new DSTVImportPipeline(config);
  });

  describe('Import avec logs détaillés', () => {
    it('devrait importer le fichier et afficher tous les logs', async () => {
      // Si aucun fichier n'est spécifié, utiliser un fichier de test par défaut
      const filePath = TEST_FILE || 'test-files/dstv/M1002.nc';
      
      console.log('\n');
      console.log('='.repeat(80));
      console.log('🚀 DÉBUT DE L\'IMPORT DSTV AVEC LOGS COMPLETS');
      console.log('='.repeat(80));
      console.log(`📁 Fichier: ${filePath}`);
      console.log('='.repeat(80));
      console.log('\n');

      // Lire le contenu du fichier
      let fileContent: string;
      
      try {
        if (fs.existsSync(filePath)) {
          fileContent = fs.readFileSync(filePath, 'utf-8');
        } else {
          // Si le fichier n'existe pas, utiliser un contenu de test
          console.log('⚠️  Fichier non trouvé, utilisation du contenu de test M1002');
          fileContent = `ST
  UB254x146x31
  M1002
  M1002
  001
  001
  001
  S235JR+AR
  1
  UB254x146x31
  I
    2700.00
     251.40
     146.10
       6.00
       8.60
      10.80
     451.90
     451.90
      18.25
       0.00
       0.00
       0.00
       0.00
SI
  v    2.00u    2.00  0.00  10rM1002
BO
  o   200.00u      0.00  15.00   10.00
  o  2500.00u      0.00  15.00   10.00
EN`;
        }
      } catch (error) {
        console.log(`⚠️  Erreur lecture fichier: ${error}`);
        // Utiliser le contenu de test
        fileContent = `ST
  UB254x146x31
  M1002
  M1002
  001
  001
  001
  S235JR+AR
  1
  UB254x146x31
  I
    2700.00
     251.40
     146.10
       6.00
       8.60
      10.80
     451.90
     451.90
      18.25
       0.00
       0.00
       0.00
       0.00
SI
  v    2.00u    2.00  0.00  10rM1002
BO
  o   200.00u      0.00  15.00   10.00
  o  2500.00u      0.00  15.00   10.00
EN`;
      }

      // Afficher le contenu du fichier
      console.log('📄 CONTENU DU FICHIER:');
      console.log('-'.repeat(40));
      const lines = fileContent.split('\n');
      lines.forEach((line, index) => {
        console.log(`  ${(index + 1).toString().padStart(3, '0')} | ${line}`);
      });
      console.log('-'.repeat(40));
      console.log('\n');

      // Convertir le contenu en ArrayBuffer
      const encoder = new TextEncoder();
      const buffer = encoder.encode(fileContent);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      // Intercepter les logs du pipeline
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const logs: string[] = [];

      console.log = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push(`[LOG] ${message}`);
        originalLog(...args);
      };

      console.warn = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push(`[WARN] ${message}`);
        originalWarn(...args);
      };

      console.error = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push(`[ERROR] ${message}`);
        originalError(...args);
      };

      // Exécution du pipeline
      console.log('🔧 DÉBUT DU PIPELINE D\'IMPORT');
      console.log('='.repeat(40));
      
      const startTime = Date.now();
      let result: any;
      let error: any = null;
      
      try {
        result = await pipeline.execute(arrayBuffer);
      } catch (e) {
        error = e;
        result = {
          success: false,
          errors: [error?.message || 'Unknown error'],
          data: null
        };
      }
      
      const endTime = Date.now();
      
      // Restaurer les fonctions de log originales
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;

      console.log('='.repeat(40));
      console.log(`⏱️  Temps d'exécution: ${endTime - startTime}ms`);
      console.log('\n');

      // Afficher le résultat
      console.log('📊 RÉSULTAT DE L\'IMPORT:');
      console.log('='.repeat(40));
      
      const success = !error && result;
      console.log(`  Success: ${success ? '✅' : '❌'}`);
      
      if (error) {
        console.log('\n  ❌ ERREUR PRINCIPALE:');
        console.log(`    ${error.message || error}`);
        if (error.stack) {
          console.log('\n  Stack trace:');
          console.log(error.stack.split('\n').map(line => `    ${line}`).join('\n'));
        }
      }
      
      if (result?.errors && result.errors.length > 0) {
        console.log('\n  ❌ ERREURS:');
        result.errors.forEach((error, index) => {
          console.log(`    ${index + 1}. ${error}`);
        });
      }

      if (result?.warnings && result.warnings.length > 0) {
        console.log('\n  ⚠️  AVERTISSEMENTS:');
        result.warnings.forEach((warning, index) => {
          console.log(`    ${index + 1}. ${warning}`);
        });
      }

      // Le résultat est directement un PivotScene, pas un objet avec .data
      if (result && result.elements) {
        const elementsArray = Array.from(result.elements.values());
        console.log(`\n  📦 Éléments importés: ${elementsArray.length}`);
        
        elementsArray.forEach((element, index) => {
          console.log(`\n  🔹 Élément ${index + 1}:`);
          console.log(`     - ID: ${element.id}`);
          console.log(`     - Type: ${element.materialType}`);
          console.log(`     - Profil: ${element.profileName}`);
          console.log(`     - Matériau: ${element.material || 'N/A'}`);
          console.log(`     - Dimensions:`);
          console.log(`       • Longueur: ${element.dimensions?.length || 0}mm`);
          console.log(`       • Largeur: ${element.dimensions?.width || 0}mm`);
          console.log(`       • Hauteur: ${element.dimensions?.height || 0}mm`);
          
          if (element.features && element.features.length > 0) {
            console.log(`     - Features: ${element.features.length}`);
            
            element.features.forEach((feature, fIndex) => {
              console.log(`\n       📌 Feature ${fIndex + 1}:`);
              console.log(`          Type: ${feature.type}`);
              console.log(`          ID: ${feature.id}`);
              console.log(`          Face: ${feature.face || 'N/A'}`);
              console.log(`          Position: (${feature.position.x}, ${feature.position.y}, ${feature.position.z})`);
              
              if (feature.type === 'hole') {
                console.log(`          Diamètre: ${feature.parameters.diameter}mm`);
                console.log(`          Profondeur: ${feature.parameters.depth}mm`);
              } else if (feature.type === 'marking') {
                console.log(`          Texte: "${feature.parameters.text}"`);
                console.log(`          Hauteur: ${feature.parameters.height}mm`);
                console.log(`          Angle: ${feature.parameters.angle || 0}°`);
              }
            });
          }

          if (element.geometry) {
            console.log(`     - Géométrie: ✅ Créée`);
            const geometry = element.geometry;
            if (geometry.attributes && geometry.attributes.position) {
              console.log(`       • Vertices: ${geometry.attributes.position.count}`);
            }
          } else {
            console.log(`     - Géométrie: ❌ Non créée`);
          }
        });
      }

      console.log('\n');
      console.log('='.repeat(40));
      console.log('📝 METADATA DU RÉSULTAT:');
      console.log('='.repeat(40));
      
      if (result?.metadata) {
        console.log(JSON.stringify(result.metadata, null, 2).split('\n').map(line => `  ${line}`).join('\n'));
      } else {
        console.log('  Aucune metadata disponible');
      }

      console.log('\n');
      console.log('='.repeat(80));
      console.log('✅ FIN DE L\'IMPORT DSTV');
      console.log('='.repeat(80));
      console.log('\n');

      // Assertions de base
      if (error) {
        console.log('\n⚠️  Test échoué à cause d\'une erreur d\'import');
        expect(error).toBeNull(); // Ceci fera échouer le test si il y a une erreur
      } else {
        expect(result).toBeDefined();
        expect(result.elements).toBeDefined();
        expect(result.elements).toBeInstanceOf(Map);
      }
    });
  });

  describe('Import d\'un fichier spécifique', () => {
    it.skipIf(!TEST_FILE)('devrait importer le fichier spécifié en paramètre', async () => {
      if (!TEST_FILE) {
        console.log('ℹ️  Aucun fichier spécifié. Utilisez: DSTV_TEST_FILE=chemin/vers/fichier.nc npm test');
        return;
      }

      console.log(`\n🎯 Import du fichier spécifique: ${TEST_FILE}`);
      
      const fileContent = fs.readFileSync(TEST_FILE, 'utf-8');
      
      // Convertir en ArrayBuffer
      const encoder = new TextEncoder();
      const buffer = encoder.encode(fileContent);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      const result = await pipeline.execute(arrayBuffer);
      
      expect(result).toBeDefined();
      
      console.log(`\n📊 Résultat: SUCCESS`);
      
      if (result.elements) {
        console.log(`📦 ${result.elements.size} élément(s) importé(s)`);
      }
    });
  });
});

// Instructions d'utilisation
console.log('\n');
console.log('📚 UTILISATION:');
console.log('='.repeat(60));
console.log('1. Pour tester avec un fichier spécifique:');
console.log('   DSTV_TEST_FILE=chemin/vers/fichier.nc npm test DSTVImportWithLogs');
console.log('\n2. Pour exécuter directement:');
console.log('   npx vitest run src/TopSteelCAD/plugins/dstv/__tests__/DSTVImportWithLogs.test.ts');
console.log('\n3. Avec un fichier spécifique:');
console.log('   DSTV_TEST_FILE=test-files/F1001.nc npx vitest run DSTVImportWithLogs');
console.log('='.repeat(60));
console.log('\n');