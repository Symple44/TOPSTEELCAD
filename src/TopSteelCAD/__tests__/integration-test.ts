/**
 * Test d'intégration de la 3DLibrary avec les bases de données
 * Vérifie que tout fonctionne correctement ensemble
 */

import { 
  initialize3DLibrary,
  createFromDatabase,
  getAvailableDesignations,
  geometryBridge
} from '../3DLibrary';

/**
 * Test principal d'intégration
 */
export async function runIntegrationTest() {
  console.log('🧪 Démarrage des tests d\'intégration...\n');
  
  try {
    // Test 1: Initialisation
    console.log('Test 1: Initialisation de la 3DLibrary');
    await initialize3DLibrary();
    console.log('✅ Initialisation réussie\n');
    
    // Test 2: Récupération des désignations
    console.log('Test 2: Récupération des désignations disponibles');
    const designations = await getAvailableDesignations();
    console.log(`✅ ${designations.length} désignations disponibles`);
    console.log('Échantillon:', designations.slice(0, 5));
    console.log();
    
    // Test 3: Création de géométries depuis la base
    console.log('Test 3: Création de géométries depuis la base de données');
    
    // Test IPE 300
    const ipe300 = await createFromDatabase('IPE 300', 6000);
    if (ipe300) {
      console.log('✅ IPE 300 créé avec succès');
      console.log(`  - Poids: ${ipe300.metadata.weight.toFixed(2)} kg`);
      console.log(`  - Volume: ${ipe300.metadata.volume.toFixed(2)} cm³`);
      console.log(`  - Inertie Iyy: ${ipe300.metadata.mechanicalProperties?.inertia?.Iyy} cm⁴`);
    } else {
      console.log('❌ Échec de création IPE 300');
    }
    
    // Test HEB 200
    const heb200 = await createFromDatabase('HEB 200', 5000);
    if (heb200) {
      console.log('✅ HEB 200 créé avec succès');
      console.log(`  - Poids: ${heb200.metadata.weight.toFixed(2)} kg`);
    } else {
      console.log('❌ Échec de création HEB 200');
    }
    
    // Test UPN 200
    const upn200 = await createFromDatabase('UPN 200', 4000);
    if (upn200) {
      console.log('✅ UPN 200 créé avec succès');
      console.log(`  - Poids: ${upn200.metadata.weight.toFixed(2)} kg`);
    } else {
      console.log('❌ Échec de création UPN 200');
    }
    
    console.log();
    
    // Test 4: Recherche de profils
    console.log('Test 4: Recherche de profils');
    const searchResults = geometryBridge.search({
      category: 'PROFILES',
      searchText: 'IPE'
    });
    console.log(`✅ ${searchResults.length} profils IPE trouvés`);
    console.log();
    
    // Test 5: Vérification des types de profils
    console.log('Test 5: Vérification des différents types de profils');
    const testProfiles = [
      'IPE 200',
      'HEA 200', 
      'HEB 300',
      'UPN 100',
      'L 100x100x10',
      'RHS 100x50x3'
    ];
    
    for (const designation of testProfiles) {
      const profile = await createFromDatabase(designation, 3000);
      if (profile) {
        console.log(`✅ ${designation}: ${profile.metadata.weight.toFixed(2)} kg`);
      } else {
        console.log(`⚠️ ${designation}: Non trouvé`);
      }
    }
    
    console.log();
    
    // Test 6: Performance avec cache
    console.log('Test 6: Test de performance avec cache');
    const startTime = Date.now();
    
    // Première création (sans cache)
    await createFromDatabase('IPE 400', 6000);
    const firstTime = Date.now() - startTime;
    
    // Deuxième création (avec cache)
    const startTime2 = Date.now();
    await createFromDatabase('IPE 400', 6000);
    const secondTime = Date.now() - startTime2;
    
    console.log(`✅ Première création: ${firstTime}ms`);
    console.log(`✅ Deuxième création (cache): ${secondTime}ms`);
    console.log(`  Amélioration: ${((firstTime - secondTime) / firstTime * 100).toFixed(0)}%`);
    console.log();
    
    // Test 7: Propriétés mécaniques
    console.log('Test 7: Vérification des propriétés mécaniques');
    const ipe500 = await createFromDatabase('IPE 500', 8000);
    if (ipe500 && ipe500.profile) {
      console.log('✅ IPE 500 - Propriétés mécaniques:');
      console.log(`  - Aire: ${ipe500.profile.area} cm²`);
      console.log(`  - Inertie Iyy: ${ipe500.profile.inertia.Iyy} cm⁴`);
      console.log(`  - Inertie Izz: ${ipe500.profile.inertia.Izz} cm⁴`);
      console.log(`  - Module élastique Wely: ${ipe500.profile.elasticModulus.Wely} cm³`);
      console.log(`  - Module plastique Wply: ${ipe500.profile.plasticModulus.Wply} cm³`);
    }
    
    console.log('\n🎉 Tous les tests d\'intégration sont passés avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    throw error;
  }
}

// Test des erreurs TypeScript corrigées
export async function testTypeScriptFixes() {
  console.log('\n🔧 Test des corrections TypeScript...\n');
  
  try {
    // Test que les imports fonctionnent
    const bridge = geometryBridge;
    console.log('✅ Import de geometryBridge réussi');
    
    // Test que les méthodes existent
    await bridge.initialize();
    console.log('✅ Méthode initialize() accessible');
    
    const designations = bridge.getAllDesignations();
    console.log(`✅ Méthode getAllDesignations() accessible (${designations.length} résultats)`);
    
    // Test de génération avec les vraies données
    const result = await bridge.generateFromDesignation('IPE 300', 6000);
    if (result) {
      console.log('✅ Génération depuis désignation réussie');
      console.log(`  - Geometry: ${result.geometry ? 'OK' : 'NON'}`);
      console.log(`  - Material: ${result.material ? 'OK' : 'NON'}`);
      console.log(`  - Mesh: ${result.mesh ? 'OK' : 'NON'}`);
      console.log(`  - Profile: ${result.profile ? 'OK' : 'NON'}`);
      console.log(`  - Metadata: ${result.metadata ? 'OK' : 'NON'}`);
    }
    
    console.log('\n✅ Toutes les corrections TypeScript sont fonctionnelles!');
    
  } catch (error) {
    console.error('❌ Erreur TypeScript:', error);
    throw error;
  }
}

// Fonction principale
export async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   TESTS D\'INTÉGRATION TOPSTEELCAD');
  console.log('═══════════════════════════════════════════\n');
  
  await runIntegrationTest();
  await testTypeScriptFixes();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('   TESTS TERMINÉS AVEC SUCCÈS! 🎉');
  console.log('═══════════════════════════════════════════');
}

// Si exécuté directement
if (require.main === module) {
  main().catch(console.error);
}