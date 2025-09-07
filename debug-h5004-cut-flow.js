/**
 * Debug H5004 Cut Processing Flow
 * 
 * Suite le flux complet depuis le parsing AK jusqu'au rendu
 */

import { DSTVPlugin } from './src/TopSteelCAD/plugins/dstv/DSTVPlugin.js';
import { FeatureProcessorFactory } from './src/TopSteelCAD/core/features/processors/FeatureProcessorFactory.js';
import * as fs from 'fs';

async function debugH5004CutFlow() {
  console.log('🔍 DEBUG: H5004 Cut Processing Flow Analysis\n');

  // 1. Lire et parser le fichier H5004
  const filePath = 'test-files/dstv/h5004.nc1';
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 File content preview:');
  const lines = content.split('\n').slice(0, 30);
  lines.forEach((line, i) => {
    if (line.trim().startsWith('AK')) {
      console.log(`  ${i + 1}: ${line} <<<< AK BLOCK`);
    } else {
      console.log(`  ${i + 1}: ${line}`);
    }
  });

  // 2. Importer via le plugin DSTV
  console.log('\n🚀 Starting DSTV Plugin import...');
  const dstvPlugin = new DSTVPlugin();
  
  const result = await dstvPlugin.importDSTVFile(content, {
    fileName: 'h5004.nc1',
    validate: true,
    optimizeGeometry: false, // Désactiver pour simplifier le debug
    logProcessing: true
  });

  console.log('\n📊 Import Result Summary:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Elements: ${result.elements ? result.elements.length : 0}`);
  console.log(`  Errors: ${result.errors ? result.errors.length : 0}`);
  console.log(`  Warnings: ${result.warnings ? result.warnings.length : 0}`);

  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.slice(0, 3).forEach(error => console.log(`  - ${error}`));
  }

  if (!result.elements || result.elements.length === 0) {
    console.log('\n💥 No elements created - stopping analysis');
    return;
  }

  // 3. Analyser les éléments créés
  console.log('\n📐 Analyzing created elements...');
  for (let i = 0; i < result.elements.length; i++) {
    const element = result.elements[i];
    console.log(`\nElement ${i + 1}: ${element.id}`);
    console.log(`  Type: ${element.type}`);
    console.log(`  Features: ${element.features ? element.features.length : 0}`);
    
    if (element.features && element.features.length > 0) {
      console.log('  📋 Features Details:');
      
      element.features.forEach((feature, j) => {
        console.log(`    Feature ${j + 1}: ${feature.id}`);
        console.log(`      Type: ${feature.type}`);
        console.log(`      Position: ${feature.position ? `(${feature.position.x}, ${feature.position.y}, ${feature.position.z})` : 'undefined'}`);
        console.log(`      Has Parameters: ${!!feature.parameters}`);
        
        if (feature.parameters) {
          console.log(`      Parameters keys: ${Object.keys(feature.parameters)}`);
          if (feature.parameters.points) {
            console.log(`      Points count: ${feature.parameters.points.length}`);
            console.log(`      First point: ${JSON.stringify(feature.parameters.points[0])}`);
          }
          if (feature.parameters.face) {
            console.log(`      Face: ${feature.parameters.face}`);
          }
        }
        
        // 4. Tester si cette feature serait traitée par le FeatureProcessorFactory
        console.log(`      🔧 Testing FeatureProcessorFactory routing...`);
        
        try {
          const factory = FeatureProcessorFactory.getInstance();
          const processor = factory.getProcessorForType(feature.type);
          
          if (processor) {
            console.log(`      ✅ Feature routed to: ${processor.constructor.name}`);
            
            // Test si on peut valider cette feature
            if (processor.validateFeature && typeof processor.validateFeature === 'function') {
              try {
                const validationErrors = processor.validateFeature(feature, element);
                if (validationErrors && validationErrors.length > 0) {
                  console.log(`      ⚠️ Validation errors: ${validationErrors.join(', ')}`);
                } else {
                  console.log(`      ✅ Feature validates successfully`);
                }
              } catch (validationError) {
                console.log(`      ❌ Validation failed: ${validationError.message}`);
              }
            }
            
            // Vérifier si c'est le nouveau CutProcessor
            if (processor.constructor.name === 'CutProcessorMigrated') {
              console.log(`      🎯 Feature will use NEW cut processing system!`);
            } else {
              console.log(`      🔄 Feature will use legacy processor: ${processor.constructor.name}`);
            }
            
          } else {
            console.log(`      ❌ NO PROCESSOR FOUND for type: ${feature.type}`);
          }
        } catch (error) {
          console.log(`      💥 Factory error: ${error.message}`);
        }
      });
    } else {
      console.log('  ❌ No features found in element');
    }
  }

  console.log('\n🏁 H5004 Cut Flow Analysis Complete');
}

// Exécuter l'analyse
debugH5004CutFlow().catch(error => {
  console.error('💥 Debug failed:', error);
  console.error(error.stack);
  process.exit(1);
});