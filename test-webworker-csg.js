/**
 * Test rapide pour vérifier l'implémentation des WebWorkers CSG
 */

import { getCSGService } from './src/TopSteelCAD/core/features/processors/cut/services/CSGOperationService.js';
import { configManager } from './src/TopSteelCAD/core/features/processors/cut/config/ProductionConfig.js';
import * as THREE from 'three';

async function testWebWorkerCSG() {
  console.log('🧪 Testing WebWorker CSG implementation...\n');

  // 1. Vérifier la configuration
  const config = configManager.getConfig();
  console.log(`📋 Environment: ${config.environment}`);
  console.log(`⚙️ WebWorkers enabled: ${config.performance.enableWebWorkers}`);
  console.log(`👥 Max workers: ${config.performance.maxWorkers}`);
  
  // Forcer l'activation des WebWorkers pour le test
  configManager.updateConfig({
    performance: {
      ...config.performance,
      enableWebWorkers: true,
      maxWorkers: 2
    }
  });
  
  console.log('✅ WebWorkers enabled for testing\n');

  // 2. Créer des géométries de test
  console.log('🔧 Creating test geometries...');
  
  const baseGeometry = new THREE.BoxGeometry(100, 100, 100);
  const cutGeometry = new THREE.SphereGeometry(60, 16, 16);
  
  // S'assurer que les géométries ont suffisamment de vertices pour déclencher les workers
  console.log(`Base geometry vertices: ${baseGeometry.attributes.position.count}`);
  console.log(`Cut geometry vertices: ${cutGeometry.attributes.position.count}`);

  // 3. Obtenir le service CSG
  const csgService = getCSGService();
  
  // 4. Obtenir les stats initiales
  const initialStats = csgService.getServiceStats();
  console.log('\n📊 Initial CSG Service Stats:');
  console.log(`Worker enabled: ${initialStats.workerEnabled}`);
  if (initialStats.workers) {
    console.log(`Total workers: ${initialStats.workers.totalWorkers}`);
    console.log(`Initialized: ${initialStats.workers.initialized}`);
  }

  // 5. Attendre l'initialisation des workers
  console.log('\n⏳ Waiting for worker initialization...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 6. Effectuer une opération CSG
  console.log('\n🔄 Performing CSG subtraction operation...');
  
  try {
    const startTime = performance.now();
    
    const result = await csgService.performSubtraction(baseGeometry, cutGeometry, {
      performanceMode: 'fast', // Force l'utilisation des workers
      maxVertices: 1000 // Seuil bas pour forcer les workers
    });
    
    const duration = performance.now() - startTime;
    
    console.log(`✅ CSG operation completed in ${duration.toFixed(2)}ms`);
    console.log(`Success: ${result.success}`);
    
    if (result.performanceMetrics) {
      console.log(`Worker used: ${result.performanceMetrics.workerUsed || false}`);
      console.log(`Preparation time: ${result.performanceMetrics.preparationTime?.toFixed(2) || 'N/A'}ms`);
      console.log(`Operation time: ${result.performanceMetrics.operationTime?.toFixed(2) || 'N/A'}ms`);
      console.log(`Total time: ${result.performanceMetrics.totalTime?.toFixed(2) || 'N/A'}ms`);
      console.log(`Vertices before: ${result.performanceMetrics.vertexCountBefore}`);
      console.log(`Vertices after: ${result.performanceMetrics.vertexCountAfter}`);
    }
    
    if (result.geometry) {
      console.log(`Result geometry vertices: ${result.geometry.attributes.position?.count || 0}`);
      result.geometry.dispose();
    }
    
  } catch (error) {
    console.error('❌ CSG operation failed:', error.message);
  }

  // 7. Obtenir les stats finales
  const finalStats = csgService.getServiceStats();
  console.log('\n📊 Final CSG Service Stats:');
  console.log(`Worker enabled: ${finalStats.workerEnabled}`);
  if (finalStats.workers) {
    console.log(`Total workers: ${finalStats.workers.totalWorkers}`);
    console.log(`Busy workers: ${finalStats.workers.busyWorkers}`);
    console.log(`Free workers: ${finalStats.workers.freeWorkers}`);
    console.log(`Pending tasks: ${finalStats.workers.pendingTasks}`);
    console.log(`Total operations: ${finalStats.workers.totalOperations}`);
  }

  // 8. Nettoyer
  console.log('\n🧹 Cleaning up...');
  baseGeometry.dispose();
  cutGeometry.dispose();
  csgService.dispose();
  
  console.log('✅ Test completed!');
}

// Exécuter le test
testWebWorkerCSG().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});