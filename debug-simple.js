/**
 * Script de debug simple pour vérifier le pipeline DSTV 
 * en utilisant uniquement le test existant
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Lancement test DSTV avec capture d\'erreurs spécifiques...');

try {
    // Exécuter le test avec le fichier h5004.nc1 
    const output = execSync(`set DSTV_TEST_FILE=test-files/dstv/h5004.nc1 && set DSTV_LOG_LEVEL=DEBUG && npx vitest run src/TopSteelCAD/plugins/dstv/__tests__/DSTVImportWithLogs.test.ts --reporter=verbose --no-truncate`, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 60000 // 60s timeout
    });
    
    console.log('📄 Sortie complète du test:');
    console.log(output);
    
} catch (error) {
    console.log('📄 Sortie avec erreur:');
    console.log(error.stdout || '');
    
    console.log('\n❌ Erreurs:');
    console.log(error.stderr || '');
    
    // Analyser les erreurs spécifiques
    const errorText = error.stderr + error.stdout;
    
    if (errorText.includes('Cannot convert undefined or null to object')) {
        console.log('\n🎯 PROBLÈME IDENTIFIÉ: "Cannot convert undefined or null to object"');
        console.log('   Ceci indique que la géométrie de base est null/undefined');
        console.log('   quand elle arrive aux processeurs de features');
    }
    
    if (errorText.includes('BufferGeometry')) {
        console.log('\n🎯 PROBLÈME GÉOMÉTRIE: Problème avec BufferGeometry Three.js');
    }
    
    if (errorText.includes('TubeGenerator') || errorText.includes('GeometryBridge')) {
        console.log('\n🎯 PROBLÈME GÉNÉRATION: Erreur dans la génération de géométrie');
    }
    
    if (errorText.includes('ProcessorBridge') || errorText.includes('FeatureProcessor')) {
        console.log('\n🎯 PROBLÈME PROCESSEUR: Erreur dans le traitement des features');
    }
}