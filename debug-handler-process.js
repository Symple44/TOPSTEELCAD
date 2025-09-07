/**
 * Debug handler.process issue
 * 
 * Test direct du CutProcessorMigrated pour identifier le problème
 */

import { CutProcessorMigrated } from './src/TopSteelCAD/core/features/processors/CutProcessorMigrated.js';
import { FeatureType } from './src/TopSteelCAD/core/features/types.js';
import * as THREE from 'three';

async function debugHandlerProcess() {
  console.log('🔍 DEBUG: Handler.process issue analysis\n');

  // 1. Créer une instance de CutProcessorMigrated
  console.log('🚀 Creating CutProcessorMigrated instance...');
  const cutProcessor = new CutProcessorMigrated();
  
  // 2. Créer une feature test
  const testFeature = {
    id: 'test-cut',
    type: FeatureType.CUT,
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    parameters: {
      points: [[0, 0], [100, 0], [100, 50], [0, 50]],
      closed: true,
      cutType: 'straight',
      source: 'debug_test'
    }
  };
  
  // 3. Créer un élément test
  const testElement = {
    id: 'test-element',
    type: 'TUBE_RECT',
    dimensions: {
      length: 2000,
      height: 100,
      width: 100
    }
  };
  
  // 4. Créer une géométrie de base
  const baseGeometry = new THREE.BoxGeometry(100, 100, 20);
  
  console.log('📋 Test setup:');
  console.log('  Feature type:', testFeature.type);
  console.log('  Feature parameters:', Object.keys(testFeature.parameters));
  console.log('  Base geometry vertices:', baseGeometry.attributes.position.count);
  
  // 5. Tester le processeur
  console.log('\n🔧 Testing CutProcessorMigrated.process...');
  
  try {
    console.log('📌 Calling cutProcessor.process()...');
    const result = cutProcessor.process(baseGeometry, testFeature, testElement);
    
    console.log('✅ Process call succeeded!');
    console.log('📊 Result:', {
      success: result.success,
      hasGeometry: !!result.geometry,
      error: result.error,
      geometryVertices: result.geometry?.attributes?.position?.count || 0
    });
    
  } catch (error) {
    console.error('❌ Process call failed:', error.message);
    console.error('📍 Error stack:', error.stack);
    
    // Analyser l'erreur spécifique
    if (error.message.includes('process is not a function')) {
      console.log('\n🔍 Analyzing handler.process issue...');
      
      // Essayer d'accéder aux propriétés internes pour debug
      try {
        console.log('🔧 Accessing internal handlerFactory...');
        const factory = cutProcessor.handlerFactory;
        console.log('  Factory available:', !!factory);
        
        if (factory && factory.findBestHandler) {
          console.log('  findBestHandler available:', !!factory.findBestHandler);
          
          const handler = factory.findBestHandler(testFeature);
          console.log('  Handler found:', !!handler);
          console.log('  Handler name:', handler?.name);
          console.log('  Handler has process method:', !!(handler && handler.process));
          console.log('  Handler process type:', handler?.process ? typeof handler.process : 'undefined');
          
          if (handler) {
            console.log('  Handler properties:', Object.keys(handler));
            console.log('  Handler prototype:', Object.getPrototypeOf(handler).constructor.name);
          }
        }
      } catch (innerError) {
        console.error('❌ Failed to analyze internal state:', innerError.message);
      }
    }
  }
  
  console.log('\n🏁 Handler Process Debug Complete');
}

// Exécuter le debug
debugHandlerProcess().catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});