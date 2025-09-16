/**
 * Test d'import DSTV utilisant le vrai Three.js (sans mocks)
 * Ce test bypasse les mocks de vitest pour tester le fonctionnement réel du TubeGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
// path import removed - not used
import { DSTVImportPipeline } from '../import/DSTVImportPipeline';

// Désactiver les mocks Three.js pour ce test
import { vi } from 'vitest';
vi.unmock('three');

// Récupérer le fichier depuis les variables d'environnement
const TEST_FILE = process.env.DSTV_TEST_FILE || 'test-files/dstv/h5004.nc1';

describe('DSTV Import avec vrai Three.js', () => {
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

  describe('Import avec Three.js réel', () => {
    it('devrait créer une géométrie valide avec plus de 3 vertices', async () => {
      console.log('\n🚀 Test DSTV avec Three.js réel');
      console.log('='.repeat(50));
      console.log(`📁 Fichier: ${TEST_FILE}`);

      let fileContent: string;
      
      try {
        if (fs.existsSync(TEST_FILE)) {
          fileContent = fs.readFileSync(TEST_FILE, 'utf-8');
        } else {
          // Utiliser un contenu de test si le fichier n'existe pas
          fileContent = `ST
  UB254x146x31
  M1002
  M1002
  001
  001
  001
  S235JR+AR
  1
  HSS51X51X4.8
  M
    2259.98
      50.80
      50.80
       4.78
       4.78
       9.56
      6.450
      0.187
    -29.202
     60.798
      0.000
      0.000
AK
  v       0.00o      0.00       0.00       0.00       0.00       0.00       0.00
        2259.98       0.00       0.00       0.00       0.00       0.00       0.00
        2169.09      50.80       0.00       0.00       0.00       0.00       0.00
          28.39      50.80       0.00       0.00       0.00       0.00       0.00
           0.00       0.00       0.00       0.00       0.00       0.00       0.00
BO
  o      89.01s     25.40      17.50
  o     174.93s     25.40      17.50
EN`;
        }
      } catch (error) {
        console.log(`⚠️  Erreur lecture fichier: ${error}`);
        // Fallback vers contenu de test
        fileContent = `ST
  HSS51X51X4.8
  M
    2259.98
      50.80
      50.80
       4.78
BO
  o      89.01s     25.40      17.50
EN`;
      }

      console.log('📄 Contenu du fichier lu');

      // Convertir le contenu en ArrayBuffer
      const encoder = new TextEncoder();
      const buffer = encoder.encode(fileContent);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      // Exécution du pipeline
      console.log('🔧 Lancement du pipeline DSTV...');
      
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
      
      console.log(`⏱️  Temps d'exécution: ${endTime - startTime}ms`);

      // Vérifications
      console.log('📊 Résultat de l\'import:');
      console.log(`  Success: ${!error && result ? '✅' : '❌'}`);
      
      if (error) {
        console.log(`  ❌ Erreur: ${error.message || error}`);
      }

      if (result && result.elements) {
        const elementsArray = Array.from(result.elements.values());
        console.log(`  📦 Éléments importés: ${elementsArray.length}`);
        
        // Vérifier chaque élément
        elementsArray.forEach((element, index) => {
          console.log(`\n  🔹 Élément ${index + 1}:`);
          console.log(`     - ID: ${element.id}`);
          console.log(`     - Type: ${element.materialType}`);
          console.log(`     - Profil: ${element.profileName || element.name}`);
          
          // Vérifier la géométrie
          if (element.geometry) {
            const vertexCount = element.geometry.attributes?.position?.count || 0;
            console.log(`     - Géométrie: ✅ ${vertexCount} vertices`);
            
            // ASSERTION CRITIQUE: Vérifier qu'on a plus de 3 vertices
            if (vertexCount > 3) {
              console.log(`     - ✅ Géométrie valide (> 3 vertices)`);
            } else {
              console.log(`     - ❌ Géométrie invalide (${vertexCount} vertices)`);
            }
          } else {
            console.log(`     - Géométrie: ❌ Non créée`);
          }
          
          if (element.features && element.features.length > 0) {
            console.log(`     - Features: ${element.features.length}`);
            // Afficher les features de type END_CUT
            const endCuts = element.features.filter((f: any) => f.type === 'end_cut' || f.type === 'END_CUT');
            if (endCuts.length > 0) {
              console.log(`     - END_CUT features: ${endCuts.length}`);
              endCuts.forEach((cut: any, idx: number) => {
                console.log(`       • Cut ${idx + 1}: pos=${cut.coordinates?.x}, angle=${cut.parameters?.angle}°`);
              });
            }
          }
          
          // Vérifier les dimensions de la bounding box
          if (element.geometry) {
            element.geometry.computeBoundingBox();
            const bbox = element.geometry.boundingBox;
            if (bbox) {
              console.log(`     - Bounding Box:`);
              console.log(`       X: [${bbox.min.x.toFixed(1)}, ${bbox.max.x.toFixed(1)}] (longueur: ${(bbox.max.x - bbox.min.x).toFixed(1)}mm)`);
              console.log(`       Y: [${bbox.min.y.toFixed(1)}, ${bbox.max.y.toFixed(1)}]`);
              console.log(`       Z: [${bbox.min.z.toFixed(1)}, ${bbox.max.z.toFixed(1)}]`);
            }
          }
        });
      }

      console.log('\n✅ Test terminé');

      // Assertions
      if (error) {
        console.log('\n⚠️  Test échoué à cause d\'une erreur d\'import');
        expect.fail(`Erreur lors de l'import DSTV: ${error.message}`);
      } else {
        expect(result).toBeDefined();
        expect(result.elements).toBeDefined();
        expect(result.elements).toBeInstanceOf(Map);
        expect(result.elements.size).toBeGreaterThan(0);
        
        // Vérifier que chaque élément a une géométrie valide
        const elementsArray = Array.from(result.elements.values());
        for (const element of elementsArray) {
          if (element.geometry) {
            const vertexCount = element.geometry.attributes?.position?.count || 0;
            expect(vertexCount).toBeGreaterThan(3);
            console.log(`✅ Element ${element.id} has ${vertexCount} vertices (> 3)`);
          }
        }
      }
    });
  });
});