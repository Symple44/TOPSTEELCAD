// Test rapide pour M1002 avec CSG
const fs = require('fs');
const path = require('path');

// Lire le fichier M1002
const m1002Path = 'test-files/dstv/M1002.nc';
if (!fs.existsSync(m1002Path)) {
  console.error('❌ Fichier M1002.nc non trouvé');
  process.exit(1);
}

const content = fs.readFileSync(m1002Path, 'utf-8');
console.log('📄 Contenu M1002.nc:');
console.log('='.repeat(40));
const lines = content.split('\n');
lines.forEach((line, i) => {
  console.log(`${(i+1).toString().padStart(3, '0')} | ${line}`);
});
console.log('='.repeat(40));

// Analyser tous les blocs AK
const akBlocks = [];
let currentAK = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line === 'AK') {
    if (currentAK) {
      akBlocks.push(currentAK);
    }
    currentAK = [];
  } else if (currentAK !== null) {
    if (line === 'EN' || line === 'BO' || line === 'SI' || line === 'ST' || line === 'AK') {
      akBlocks.push(currentAK);
      currentAK = null;
      if (line === 'AK') {
        currentAK = [];
      }
    } else if (line) {
      currentAK.push(lines[i]); // Garder l'indentation originale
    }
  }
}

if (currentAK) {
  akBlocks.push(currentAK);
}

console.log('\n📐 Analyse des blocs AK:');
console.log('='.repeat(40));
console.log(`Nombre de blocs AK trouvés: ${akBlocks.length}`);

// Chercher le bloc avec 9 lignes (contour web avec notches)
let webBlock = null;
for (let i = 0; i < akBlocks.length; i++) {
  console.log(`\nBloc AK #${i+1}: ${akBlocks[i].length} lignes`);
  if (akBlocks[i].length === 9) {
    // Vérifier si c'est le bloc web (face 'v')
    if (akBlocks[i][0].includes('v')) {
      webBlock = akBlocks[i];
      console.log('  ✅ Bloc web avec 9 points trouvé!');
    }
  }
}

// Analyser les coordonnées du bloc web
const points = [];
if (webBlock) {
  for (const line of webBlock) {
    const parts = line.trim().split(/\s+/);
    // Format: v X[u] Y Z
    if (parts.length >= 3) {
      const x = parseFloat(parts[1].replace('u', ''));
      const y = parseFloat(parts[2]);
      points.push([x, y]);
    }
  }
}

console.log(`\n🎯 Points du contour: ${points.length}`);
points.forEach((p, i) => {
  console.log(`  Point ${i+1}: [${p[0]}, ${p[1]}]`);
});

// Analyser les dimensions des notches
if (points.length === 9) {
  console.log('\n✅ Pattern M1002 détecté (9 points)');
  
  const xValues = points.map(p => p[0]);
  const yValues = points.map(p => p[1]);
  
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  
  console.log(`\n📊 Dimensions du contour:`);
  console.log(`  X: [${minX} → ${maxX}] = ${maxX - minX}mm`);
  console.log(`  Y: [${minY} → ${maxY}] = ${maxY - minY}mm`);
  
  // Identifier les notches
  const sortedX = [...new Set(xValues)].sort((a, b) => a - b);
  const sortedY = [...new Set(yValues)].sort((a, b) => a - b);
  
  console.log(`\n🔍 Valeurs X uniques: ${sortedX.join(', ')}`);
  console.log(`🔍 Valeurs Y uniques: ${sortedY.join(', ')}`);
  
  if (sortedX.length >= 2) {
    const baseEndX = sortedX[sortedX.length - 2];
    const extensionX = sortedX[sortedX.length - 1];
    const notchDepth = extensionX - baseEndX;
    
    console.log(`\n📐 Dimensions des notches:`);
    console.log(`  Fin de base: ${baseEndX}mm`);
    console.log(`  Extension: ${extensionX}mm`);
    console.log(`  Profondeur notch: ${notchDepth}mm`);
  }
  
  if (sortedY.length >= 3) {
    const notchY1 = sortedY[1];
    const notchY2 = sortedY[sortedY.length - 2];
    
    console.log(`\n📍 Positions Y des notches:`);
    console.log(`  Notch haute: 0 → ${notchY1}mm`);
    console.log(`  Notch basse: ${notchY2} → ${maxY}mm`);
  }
}

console.log('\n✅ Analyse terminée');