/**
 * Script de diagnostic pour le système de coupes
 * Teste si les handlers de coupes sont bien appelés
 */

import { FeatureProcessorFactory } from './src/TopSteelCAD/core/features/processors/FeatureProcessorFactory.js';
import { FeatureType } from './src/TopSteelCAD/core/features/types.js';
import * as THREE from 'three';

async function testCutSystem() {
  console.log('🔍 Testing Cut System Integration...\n');

  // 1. Vérifier le FeatureProcessorFactory
  console.log('1. Testing FeatureProcessorFactory...');
  const factory = FeatureProcessorFactory.getInstance();
  
  console.log('✅ Factory initialized');
  console.log('Supported types:', factory.getSupportedTypes());
  
  // 2. Vérifier les processeurs de coupes
  console.log('\n2. Testing Cut Processors...');
  
  const cutTypes = [
    FeatureType.CUT,
    FeatureType.END_CUT,
    FeatureType.NOTCH,
    FeatureType.CONTOUR
  ];
  
  for (const type of cutTypes) {
    const hasProcessor = factory.hasProcessor(type);
    const processor = factory.getProcessor(type);
    console.log(`${type}: ${hasProcessor ? '✅' : '❌'} has processor, instance: ${processor?.constructor?.name || 'none'}`);
  }
  
  // 3. Tester un processeur de coupe avec des données simples
  console.log('\n3. Testing Cut Processing...');
  
  try {
    // Créer une géométrie de base simple
    const baseGeometry = new THREE.BoxGeometry(100, 100, 20);
    
    // Créer un élément mock
    const mockElement = {
      id: 'test-element',
      type: 'BEAM',
      dimensions: {
        length: 1000,
        width: 100,
        height: 200,
        webThickness: 10,
        flangeThickness: 15
      },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    };
    
    // Créer une feature de coupe simple
    const cutFeature = {
      id: 'test-cut',
      type: FeatureType.CUT,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        points: [
          [0, 0],
          [50, 0], 
          [50, 50],
          [0, 50]
        ],
        depth: 10,
        face: 'WEB'
      }
    };
    
    console.log('📝 Test feature created:', {
      id: cutFeature.id,
      type: cutFeature.type,
      pointsCount: cutFeature.parameters.points?.length,
      depth: cutFeature.parameters.depth
    });
    
    // Traiter la feature
    console.log('🔄 Processing feature...');
    const result = factory.process(baseGeometry, cutFeature, mockElement);
    
    console.log('📊 Processing result:', {
      success: result.success,
      hasGeometry: !!result.geometry,
      error: result.error
    });
    
    if (result.success) {
      console.log('✅ Cut processing succeeded!');
      if (result.geometry) {
        console.log(`📐 Result geometry vertices: ${result.geometry.attributes.position?.count || 0}`);
      }
    } else {
      console.log('❌ Cut processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
  
  console.log('\n🏁 Cut System Test Complete');
}

// Exécuter le test
testCutSystem().catch(error => {
  console.error('💥 Test script failed:', error);
});