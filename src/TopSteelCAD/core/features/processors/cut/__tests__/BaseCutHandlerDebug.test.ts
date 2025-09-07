/**
 * Test de debug pour vérifier BaseCutHandler
 */

import { describe, test, expect } from 'vitest';
import { ExteriorCutHandler } from '../handlers/ExteriorCutHandler';
import { BaseCutHandler } from '../core/BaseCutHandler';
import { FeatureType } from '../../../types';
import * as THREE from 'three';

describe('BaseCutHandler Debug', () => {
  test('devrait vérifier la hiérarchie de classe et les méthodes', () => {
    console.log('\n🔍 ==> DEBUT DEBUG BASE CUT HANDLER <==');
    
    // 1. Créer une instance de ExteriorCutHandler
    console.log('🚀 Creating ExteriorCutHandler instance...');
    const handler = new ExteriorCutHandler();
    
    console.log('📋 Handler Analysis:');
    console.log('  Handler name:', handler.name);
    console.log('  Handler constructor:', handler.constructor.name);
    console.log('  Instanceof BaseCutHandler:', handler instanceof BaseCutHandler);
    
    // 2. Vérifier les méthodes héritées
    console.log('\n🔧 Method Analysis:');
    console.log('  Has canHandle:', 'canHandle' in handler);
    console.log('  Has validate:', 'validate' in handler);
    console.log('  Has process:', 'process' in handler);
    console.log('  Has createCutGeometry:', 'createCutGeometry' in handler);
    console.log('  Has generateMetadata:', 'generateMetadata' in handler);
    
    // 3. Analyser le prototype
    console.log('\n🎯 Prototype Analysis:');
    let proto = Object.getPrototypeOf(handler);
    let level = 0;
    while (proto && proto !== Object.prototype && level < 5) {
      console.log(`  Level ${level}: ${proto.constructor.name}`);
      const protoMethods = Object.getOwnPropertyNames(proto).filter(name => 
        typeof proto[name] === 'function' && name !== 'constructor'
      );
      console.log(`    Methods: [${protoMethods.join(', ')}]`);
      
      // Vérifier spécialement la méthode process
      if ('process' in proto) {
        console.log(`    ✅ process method found at level ${level}`);
        console.log(`    process type: ${typeof proto.process}`);
      }
      
      proto = Object.getPrototypeOf(proto);
      level++;
    }
    
    // 4. Tester l'accès direct à la méthode process
    console.log('\n🧪 Direct Method Access Test:');
    try {
      const processMethod = handler.process;
      console.log('  Process method accessible:', typeof processMethod);
      
      if (typeof processMethod === 'function') {
        console.log('  ✅ Process method is a function');
        
        // Tenter un appel test de base
        console.log('\n🚀 Testing process method call...');
        
        const testFeature = {
          id: 'test-feature',
          type: FeatureType.CUT,
          position: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          parameters: {
            points: [[0, 0], [10, 0], [10, 10], [0, 10]],
            closed: true
          }
        };
        
        const testElement = {
          id: 'test-element',
          type: 'TUBE_RECT',
          dimensions: { length: 100, height: 50, width: 50 }
        };
        
        const context = {
          feature: testFeature,
          element: testElement,
          baseGeometry: new THREE.BoxGeometry(10, 10, 10),
          cutType: 'EXTERIOR_CUT',
          options: {}
        };
        
        const result = processMethod.call(handler, context);
        console.log('  Process call result:', {
          success: result.success,
          hasGeometry: !!result.geometry,
          error: result.error
        });
        
      } else {
        console.log('  ❌ Process method not accessible or not a function');
      }
    } catch (error) {
      console.error('  ❌ Error accessing process method:', error.message);
    }
    
    // 5. Vérifications finales
    console.log('\n📊 Final Verification:');
    console.log('  Handler should be valid:', handler instanceof BaseCutHandler);
    expect(handler instanceof BaseCutHandler).toBe(true);
    
    console.log('  Process method should exist:', 'process' in handler);
    expect('process' in handler).toBe(true);
    
    console.log('  Process should be function:', typeof handler.process === 'function');
    expect(typeof handler.process).toBe('function');
    
    console.log('\n🏁 ==> FIN DEBUG BASE CUT HANDLER <==\n');
  });
});