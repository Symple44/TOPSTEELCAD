/**
 * Test de debug pour identifier le problème handler.process
 */

import { describe, test, expect } from 'vitest';
import { CutProcessorMigrated } from '../../CutProcessorMigrated';
import { FeatureType } from '../../../types';
import * as THREE from 'three';

describe('Handler Process Debug', () => {
  test('devrait identifier pourquoi handler.process échoue', () => {
    console.log('\n🔍 ==> DEBUT DEBUG HANDLER.PROCESS <==');
    
    // 1. Créer une instance de CutProcessorMigrated
    console.log('🚀 Creating CutProcessorMigrated instance...');
    const cutProcessor = new CutProcessorMigrated();
    
    // 2. Créer une feature test similaire à ce que DSTV génère
    const testFeature = {
      id: 'debug-straight-cut',
      type: FeatureType.CUT,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        points: [[0, 0], [2259.98, 0], [2169.09, 50.8], [28.39, 50.8]],
        closed: true,
        cutType: 'straight',
        source: 'tube_cut',
        face: 'web'
      }
    };
    
    // 3. Créer un élément test
    const testElement = {
      id: 'debug-element',
      type: 'TUBE_RECT',
      dimensions: {
        length: 2259.98,
        height: 50.8,
        width: 50.8
      },
      profileType: 'TUBE_RECT',
      material: 'S235'
    };
    
    // 4. Créer une géométrie de base
    console.log('📦 Creating base geometry...');
    const baseGeometry = new THREE.BoxGeometry(100, 100, 20);
    console.log(`📊 Base geometry has ${baseGeometry.attributes.position.count} vertices`);
    
    console.log('\n📋 Test Configuration:');
    console.log('  Feature type:', testFeature.type);
    console.log('  Feature ID:', testFeature.id);
    console.log('  Cut type:', testFeature.parameters.cutType);
    console.log('  Points count:', testFeature.parameters.points?.length);
    console.log('  Element type:', testElement.type);
    
    // 5. Tester l'accès aux propriétés internes AVANT l'appel process
    console.log('\n🔧 Analyzing internal state...');
    
    // Accéder au handlerFactory
    const handlerFactory = (cutProcessor as any).handlerFactory;
    console.log('  Handler Factory available:', !!handlerFactory);
    
    if (handlerFactory) {
      console.log('  Handler Factory type:', handlerFactory.constructor.name);
      console.log('  findBestHandler available:', typeof handlerFactory.findBestHandler);
      
      // Essayer de trouver un handler
      try {
        console.log('\n🎯 Testing handler selection...');
        const handler = handlerFactory.findBestHandler(testFeature);
        
        console.log('  Handler found:', !!handler);
        if (handler) {
          console.log('  Handler name:', handler.name);
          console.log('  Handler type:', handler.constructor.name);
          console.log('  Handler has process method:', 'process' in handler);
          console.log('  Handler process type:', typeof handler.process);
          console.log('  Handler prototype chain:', Object.getPrototypeOf(handler).constructor.name);
          
          // Vérifier toutes les méthodes disponibles
          const methods = [];
          let obj = handler;
          while (obj && obj !== Object.prototype) {
            methods.push(...Object.getOwnPropertyNames(obj));
            obj = Object.getPrototypeOf(obj);
          }
          console.log('  Available methods:', methods.filter(m => typeof (handler as any)[m] === 'function').sort());
          
          // Tester l'appel direct du handler si possible
          if (handler.process) {
            console.log('\n🧪 Testing direct handler.process call...');
            try {
              const context = {
                feature: testFeature,
                element: testElement,
                baseGeometry: baseGeometry,
                cutType: 'STRAIGHT_CUT',
                options: {}
              };
              
              console.log('  Context created, calling handler.process...');
              const handlerResult = handler.process(context);
              console.log('  ✅ Direct handler call succeeded!');
              console.log('  Result:', {
                success: handlerResult.success,
                hasGeometry: !!handlerResult.geometry,
                error: handlerResult.error
              });
            } catch (handlerError) {
              console.error('  ❌ Direct handler call failed:', handlerError.message);
            }
          }
        } else {
          console.log('  ❌ No handler found for this feature');
        }
        
      } catch (selectionError) {
        console.error('  ❌ Handler selection failed:', selectionError.message);
      }
    }
    
    // 6. Maintenant tester l'appel complet via CutProcessorMigrated
    console.log('\n🚀 Testing full CutProcessorMigrated.process call...');
    
    try {
      const result = cutProcessor.process(baseGeometry, testFeature, testElement);
      
      console.log('✅ CutProcessorMigrated.process succeeded!');
      console.log('📊 Final result:', {
        success: result.success,
        hasGeometry: !!result.geometry,
        error: result.error,
        geometryVertices: result.geometry?.attributes?.position?.count || 0
      });
      
      // Le test ne devrait pas échouer s'il arrive ici
      expect(result).toBeDefined();
      
    } catch (error) {
      console.error('❌ CutProcessorMigrated.process failed:', error.message);
      console.error('📍 Error type:', error.constructor.name);
      
      // Analyser l'erreur spécifique
      if (error.message.includes('process is not a function')) {
        console.log('\n💡 DIAGNOSTIC: handler.process is not a function');
        console.log('   This indicates a mismatch in the handler interface implementation.');
        console.log('   The handler was found but does not have the expected process method.');
      }
      
      // Re-throw pour que le test échoue et montre l'erreur
      throw error;
    }
    
    console.log('\n🏁 ==> FIN DEBUG HANDLER.PROCESS <==\n');
  });
});