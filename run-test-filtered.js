// Script pour filtrer les logs du test
const { execSync } = require('child_process');

console.log('='.repeat(80));
console.log('EXTRACTION DES LOGS DE COUPE');
console.log('='.repeat(80));

try {
  // Exécuter le test avec la variable d'environnement
  process.env.DSTV_TEST_FILE = 'test-files/dstv/h5004.nc1';
  
  const output = execSync(
    'npx vitest run src/TopSteelCAD/plugins/dstv/__tests__/DSTVImportWithLogs.test.ts', 
    { 
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer
    }
  );
  
  // Filtrer les lignes importantes
  const lines = output.split('\n');
  const importantLines = lines.filter(line => {
    const cleanLine = line.replace(/\x1B\[[0-9;]*m/g, ''); // Supprimer les codes couleur
    return (
      cleanLine.includes('🔍 AK Processing') ||
      cleanLine.includes('🎯 TUBE DETECTED') ||
      cleanLine.includes('⏭️ Skipping AK') ||
      cleanLine.includes('✅ Creating') ||
      cleanLine.includes('📍 Cut position for') ||
      cleanLine.includes('🔧 Processing END_CUT') ||
      cleanLine.includes('📐 Feature parameters') ||
      cleanLine.includes('📍 Feature position details') ||
      cleanLine.includes('position.x =') ||
      cleanLine.includes('cutPosition param =') ||
      cleanLine.includes('🔺 Applying chamfer') ||
      cleanLine.includes('📏 Tube dimensions') ||
      cleanLine.includes('📐 Cut parameters') ||
      cleanLine.includes('📍 Cut will be at') ||
      cleanLine.includes('📦 Geometry bounds') ||
      cleanLine.includes('🔸 Cut box') ||
      cleanLine.includes('✅ Chamfer cuts applied') ||
      cleanLine.includes('📐 Tube AK contour analysis') ||
      cleanLine.includes('Points analysis:') ||
      cleanLine.includes('Point 1:') ||
      cleanLine.includes('Point 2:') ||
      cleanLine.includes('Point 3:') ||
      cleanLine.includes('Point 4:') ||
      cleanLine.includes('Point 5:') ||
      cleanLine.includes('🔍 START cut detected') ||
      cleanLine.includes('🔍 END cut detected') ||
      cleanLine.includes('✅ Creating START END_CUT') ||
      cleanLine.includes('✅ Creating END END_CUT') ||
      cleanLine.includes('🔑 Tracker key') ||
      cleanLine.includes('🆕 Created new tracker') ||
      cleanLine.includes('♻️ Using existing tracker') ||
      cleanLine.includes('📊 Tracker state') ||
      cleanLine.includes('first pass') ||
      cleanLine.includes('second pass') ||
      cleanLine.includes('✅ Chamfer cuts applied') ||
      cleanLine.includes('❌ Failed to apply') ||
      cleanLine.includes('🔄 Geometry result') ||
      cleanLine.includes('📦 Final geometry') ||
      cleanLine.includes('END_CUT for tube P2201') ||
      cleanLine.includes('Feature type: end_cut') ||
      cleanLine.includes('Chamfer cuts applied successfully') ||
      cleanLine.includes('CSG operation failed') ||
      cleanLine.includes('Error in applyChamferEndCut') ||
      cleanLine.includes('corners chamfered') ||
      cleanLine.includes('CSG chamfer operation failed') ||
      cleanLine.includes('Failed to apply chamfer cut') ||
      cleanLine.includes('❌')
    );
  });
  
  if (importantLines.length === 0) {
    console.log('❌ Aucun log de coupe trouvé !');
    console.log('Les logs recherchés n\'apparaissent pas dans la sortie.');
  } else {
    console.log(`📊 ${importantLines.length} lignes importantes trouvées:\n`);
    importantLines.forEach((line, index) => {
      const cleanLine = line.replace(/\x1B\[[0-9;]*m/g, '');
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${cleanLine.trim()}`);
    });
  }
  
} catch (error) {
  console.error('❌ Erreur lors de l\'exécution du test:', error.message);
  if (error.stdout) {
    console.log('\n📝 Sortie standard:');
    console.log(error.stdout.toString().substring(0, 2000) + '...');
  }
}

console.log('\n' + '='.repeat(80));