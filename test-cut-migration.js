/**
 * test-cut-migration.js - Script de test pour valider la migration de l'architecture de coupe
 * Teste avec les fichiers DSTV réels M1002.nc et h5004.nc1
 */

const fs = require('fs');
const path = require('path');

// Désactiver temporairement certains modules pour le test CLI
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
global.navigator = global.navigator || { userAgent: 'node' };
global.HTMLElement = global.HTMLElement || class {};

console.log('🔬 Test de migration de l\'architecture de coupe\n');
console.log('=' .repeat(60));

async function runTest() {
  try {
    // Importer les modules nécessaires
    const { FeatureProcessorFactory } = require('./src/TopSteelCAD/core/features/processors/FeatureProcessorFactory');
    const { FeatureType } = require('./src/TopSteelCAD/core/features/types');
    
    // Créer une instance de la factory
    const factory = FeatureProcessorFactory.getInstance();
    
    console.log('\n📊 État initial:');
    console.log(`  - Architecture de coupe: ${factory.isUsingNewCutArchitecture() ? 'NOUVELLE' : 'ANCIENNE'}`);
    console.log(`  - Types supportés: ${factory.getSupportedTypes().length}`);
    
    // Test avec l'ancienne architecture
    console.log('\n🔧 Test avec l\'ANCIENNE architecture (monolithique):');
    factory.setUseNewCutArchitecture(false);
    testArchitecture(factory, 'ANCIENNE');
    
    // Test avec la nouvelle architecture
    console.log('\n🔧 Test avec la NOUVELLE architecture (modulaire):');
    factory.setUseNewCutArchitecture(true);
    testArchitecture(factory, 'NOUVELLE');
    
    // Lire et tester avec un fichier DSTV réel
    console.log('\n📄 Test avec fichiers DSTV réels:');
    await testWithDSTVFiles();
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

function testArchitecture(factory, name) {
  // Créer une feature de test
  const testFeature = {
    id: 'test-cut-001',
    type: FeatureType.CUT,
    parameters: {
      points: [
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50]
      ],
      depth: 10,
      face: 'v'
    }
  };
  
  // Créer un élément de test
  const testElement = {
    id: 'beam-001',
    type: 'I_PROFILE',
    dimensions: {
      length: 1000,
      height: 300,
      width: 150,
      webThickness: 10,
      flangeThickness: 15
    }
  };
  
  // Obtenir le processor
  const processor = factory.getProcessor(FeatureType.CUT);
  console.log(`  - Processor obtenu: ${processor ? processor.constructor.name : 'AUCUN'}`);
  
  if (processor) {
    // Valider la feature
    const errors = processor.validateFeature(testFeature, testElement);
    console.log(`  - Validation: ${errors.length === 0 ? '✅ OK' : '❌ ' + errors.join(', ')}`);
    
    // Vérifier les capacités
    if (processor.getStatistics) {
      const stats = processor.getStatistics();
      console.log(`  - Statistiques disponibles:`, stats);
    }
  }
}

async function testWithDSTVFiles() {
  try {
    // Chemins des fichiers de test
    const testFiles = [
      'test-files/dstv/M1002.nc',
      'test-files/dstv/h5004.nc1'
    ];
    
    for (const filePath of testFiles) {
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️ Fichier non trouvé: ${filePath}`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      console.log(`\n  📋 ${fileName}:`);
      console.log(`    - Taille: ${content.length} caractères`);
      console.log(`    - Lignes: ${content.split('\n').length}`);
      
      // Analyser le contenu pour trouver les blocks
      const blocks = analyzeBlocks(content);
      console.log(`    - Blocks trouvés: ${Object.keys(blocks).join(', ')}`);
      
      // Afficher les statistiques des blocks de coupe
      if (blocks['AK']) console.log(`      • AK (Contour extérieur): ${blocks['AK']} occurrences`);
      if (blocks['IK']) console.log(`      • IK (Contour intérieur): ${blocks['IK']} occurrences`);
      if (blocks['SC']) console.log(`      • SC (Coupe/Scie): ${blocks['SC']} occurrences`);
      if (blocks['BR']) console.log(`      • BR (Biseau/Rayon): ${blocks['BR']} occurrences`);
    }
    
  } catch (error) {
    console.error('  ❌ Erreur lors de la lecture des fichiers:', error);
  }
}

function analyzeBlocks(content) {
  const blocks = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 2) {
      const blockType = trimmed.substring(0, 2);
      if (/^[A-Z]{2}$/.test(blockType)) {
        blocks[blockType] = (blocks[blockType] || 0) + 1;
      }
    }
  }
  
  return blocks;
}

// Test de performance
async function performanceTest() {
  console.log('\n⚡ Test de performance:');
  
  const testCount = 100;
  const features = [];
  
  // Créer des features de test
  for (let i = 0; i < testCount; i++) {
    features.push({
      id: `perf-test-${i}`,
      type: FeatureType.CUT,
      parameters: {
        points: [
          [i * 10, 0],
          [i * 10 + 50, 0],
          [i * 10 + 50, 30],
          [i * 10, 30]
        ],
        depth: 5 + (i % 10)
      }
    });
  }
  
  const factory = FeatureProcessorFactory.getInstance();
  const element = {
    id: 'test-beam',
    type: 'I_PROFILE',
    dimensions: {
      length: 6000,
      height: 300,
      width: 150,
      webThickness: 10,
      flangeThickness: 15
    }
  };
  
  // Test avec l'ancienne architecture
  factory.setUseNewCutArchitecture(false);
  const startOld = Date.now();
  const processor = factory.getProcessor(FeatureType.CUT);
  
  for (const feature of features) {
    processor.validateFeature(feature, element);
  }
  const timeOld = Date.now() - startOld;
  
  // Test avec la nouvelle architecture
  factory.setUseNewCutArchitecture(true);
  const startNew = Date.now();
  const newProcessor = factory.getProcessor(FeatureType.CUT);
  
  for (const feature of features) {
    newProcessor.validateFeature(feature, element);
  }
  const timeNew = Date.now() - startNew;
  
  console.log(`  - Ancienne architecture: ${timeOld}ms pour ${testCount} features`);
  console.log(`  - Nouvelle architecture: ${timeNew}ms pour ${testCount} features`);
  console.log(`  - Ratio: ${(timeNew / timeOld).toFixed(2)}x`);
}

// Exécuter les tests
(async function main() {
  await runTest();
  await performanceTest();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Tests de migration terminés avec succès!');
})().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});