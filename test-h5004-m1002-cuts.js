/**
 * Test spécifique pour les coupes H5004 et M1002
 * Diagnostic détaillé du système de coupes DSTV
 */

import { DSTVPlugin } from './src/TopSteelCAD/plugins/dstv/DSTVPlugin.js';
import { FeatureProcessorFactory } from './src/TopSteelCAD/core/features/processors/FeatureProcessorFactory.js';
import * as fs from 'fs';

async function testDSTVCuts() {
  console.log('🔍 Testing DSTV Cut Processing for H5004 and M1002...\n');

  // 1. Vérifier que les fichiers existent
  const testFiles = [
    'test-files/dstv/h5004.nc1',
    'test-files/dstv/M1002.nc'
  ];
  
  for (const file of testFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Test file not found: ${file}`);
      return;
    } else {
      console.log(`✅ Found test file: ${file}`);
    }
  }

  // 2. Initialiser le plugin DSTV
  console.log('\n📦 Initializing DSTV Plugin...');
  const dstvPlugin = new DSTVPlugin();
  
  // 3. Traiter chaque fichier
  for (const filePath of testFiles) {
    console.log(`\n🔄 Processing file: ${filePath}`);
    console.log('=' .repeat(50));
    
    try {
      // Lire le contenu du fichier
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`📄 File size: ${content.length} characters`);
      
      // Analyser le contenu pour compter les features de coupe
      const lines = content.split('\n');
      let cutFeatures = 0;
      let akBlocks = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('AK')) {
          akBlocks++;
          // Vérifier si c'est une coupe (contient des coordonnées de contour)
          if (trimmed.includes('AK') && trimmed.split(' ').length > 5) {
            cutFeatures++;
          }
        }
      }
      
      console.log(`📊 Found ${akBlocks} AK blocks, estimated ${cutFeatures} cut features`);
      
      // Importer le fichier via le plugin
      console.log('🔄 Importing via DSTV Plugin...');
      const result = await dstvPlugin.importDSTVFile(content, {
        fileName: filePath.split('/').pop(),
        validate: true,
        optimizeGeometry: true
      });
      
      console.log(`📋 Import result:`, {
        success: result.success,
        elementsCount: result.elements ? result.elements.length : 0,
        hasErrors: !!result.errors,
        errorCount: result.errors ? result.errors.length : 0,
        hasWarnings: !!result.warnings,
        warningCount: result.warnings ? result.warnings.length : 0
      });
      
      if (result.errors && result.errors.length > 0) {
        console.log('❌ Import errors:');
        result.errors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more errors`);
        }
      }
      
      if (result.elements && result.elements.length > 0) {
        console.log(`\n📐 Analyzing elements...`);
        
        for (let i = 0; i < Math.min(result.elements.length, 3); i++) {
          const element = result.elements[i];
          console.log(`\nElement ${i + 1}: ${element.id}`);
          console.log(`  Type: ${element.type}`);
          console.log(`  Features: ${element.features ? element.features.length : 0}`);
          
          if (element.features && element.features.length > 0) {
            console.log('  Feature types:');
            const featureTypes = new Map();
            
            element.features.forEach(feature => {
              const type = feature.type;
              featureTypes.set(type, (featureTypes.get(type) || 0) + 1);
            });
            
            for (const [type, count] of featureTypes.entries()) {
              console.log(`    ${type}: ${count}`);
            }
            
            // Tester le traitement d'une feature de coupe
            const cutFeature = element.features.find(f => 
              f.type === 'cut' || f.type === 'CUT' || 
              f.type === 'contour' || f.type === 'CONTOUR' ||
              f.type === 'notch' || f.type === 'NOTCH'
            );
            
            if (cutFeature) {
              console.log(`\n🔧 Testing cut feature processing...`);
              console.log(`  Feature ID: ${cutFeature.id}`);
              console.log(`  Feature type: ${cutFeature.type}`);
              console.log(`  Has points: ${!!cutFeature.parameters?.points}`);
              console.log(`  Points count: ${cutFeature.parameters?.points?.length || 0}`);
              
              // Tenter de traiter la feature avec le nouveau système
              try {
                const factory = FeatureProcessorFactory.getInstance();
                
                // Créer une géométrie de base simple pour le test
                const { BoxGeometry } = await import('three');
                const baseGeometry = new BoxGeometry(100, 100, 20);
                
                console.log('🔄 Processing feature with FeatureProcessorFactory...');
                const processResult = factory.process(baseGeometry, cutFeature, element);
                
                console.log('📊 Processing result:', {
                  success: processResult.success,
                  hasGeometry: !!processResult.geometry,
                  error: processResult.error,
                  geometryVertices: processResult.geometry?.attributes?.position?.count || 0
                });
                
                baseGeometry.dispose();
                if (processResult.geometry && processResult.geometry !== baseGeometry) {
                  processResult.geometry.dispose();
                }
                
              } catch (error) {
                console.error('❌ Feature processing failed:', error.message);
              }
            } else {
              console.log('⚠️ No cut features found in first few elements');
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}:`, error.message);
    }
  }
  
  console.log('\n🏁 DSTV Cut Test Complete');
}

// Exécuter le test
testDSTVCuts().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});