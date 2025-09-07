const fs = require('fs');

console.log('='.repeat(80));
console.log('ANALYSE DES BLOCS AK DE h5004.nc1');
console.log('='.repeat(80));

const content = fs.readFileSync('test-files/dstv/h5004.nc1', 'utf8');
const lines = content.split('\n');

// Extraire les dimensions du profil depuis ST block
let profileLength = 0;
let profileHeight = 0;
let profileWidth = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'ST') {
    // Ligne 11: longueur
    if (lines[i+10]) profileLength = parseFloat(lines[i+10].trim());
    // Ligne 12: largeur  
    if (lines[i+11]) profileWidth = parseFloat(lines[i+11].trim());
    // Ligne 13: hauteur
    if (lines[i+12]) profileHeight = parseFloat(lines[i+12].trim());
    break;
  }
}

console.log('\nDIMENSIONS DU PROFIL HSS51X51X4.8:');
console.log(`  Longueur: ${profileLength} mm`);
console.log(`  Largeur: ${profileWidth} mm`);
console.log(`  Hauteur: ${profileHeight} mm`);
console.log('');

// Analyser chaque bloc AK
let akBlockNumber = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'AK') {
    akBlockNumber++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BLOC AK #${akBlockNumber}:`);
    console.log(`${'='.repeat(60)}`);
    
    // Parser la ligne de données AK
    const dataLine = lines[i+1];
    console.log(`Ligne de données: ${dataLine}`);
    
    // Extraire les valeurs
    const fields = dataLine.trim().split(/\s+/);
    console.log(`\nNombre de champs: ${fields.length}`);
    
    // Analyser la face
    const face = fields[0];
    console.log(`\nFace: ${face}`);
    
    // Analyser les points (groupes de 2 valeurs après la face)
    const points = [];
    for (let j = 1; j < fields.length; j += 2) {
      if (j+1 < fields.length) {
        const x = parseFloat(fields[j]);
        const y = parseFloat(fields[j+1]);
        if (!isNaN(x) && !isNaN(y)) {
          points.push({x, y});
        }
      }
    }
    
    console.log(`\nPoints du contour (${points.length} points):`);
    points.forEach((p, idx) => {
      console.log(`  Point ${idx+1}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    });
    
    // Analyser les dimensions du contour
    if (points.length > 0) {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      console.log(`\nDimensions du contour:`);
      console.log(`  X: [${minX.toFixed(2)} → ${maxX.toFixed(2)}] = ${(maxX - minX).toFixed(2)} mm`);
      console.log(`  Y: [${minY.toFixed(2)} → ${maxY.toFixed(2)}] = ${(maxY - minY).toFixed(2)} mm`);
      
      // Comparer avec les dimensions du profil
      const contourLength = maxX - minX;
      const contourHeight = maxY - minY;
      
      console.log(`\nComparaison avec le profil:`);
      console.log(`  Longueur contour: ${contourLength.toFixed(2)} vs profil: ${profileLength.toFixed(2)}`);
      console.log(`  Hauteur contour: ${contourHeight.toFixed(2)} vs profil: ${profileHeight.toFixed(2)}`);
      
      // Détecter le type de modification
      if (Math.abs(contourLength - profileLength) > 1) {
        const diff = profileLength - contourLength;
        console.log(`\n⚠️ CONTOUR MODIFIÉ:`);
        console.log(`  Le contour est ${diff.toFixed(2)} mm plus court que le profil`);
        console.log(`  → Coupe probable aux extrémités`);
        
        // Analyser la forme
        const isRectangular = points.length === 5 && 
          Math.abs(points[0].x - points[4].x) < 0.1 && 
          Math.abs(points[0].y - points[4].y) < 0.1;
          
        if (!isRectangular) {
          console.log(`  → Forme complexe (${points.length} points), coupe angulaire probable`);
        }
      }
    }
  }
}

console.log('\n');
console.log('='.repeat(80));
console.log('RÉSUMÉ:');
console.log('='.repeat(80));
console.log(`Nombre total de blocs AK: ${akBlockNumber}`);
console.log('\nPour les tubes HSS, les blocs AK définissent la FORME FINALE après coupe.');
console.log('Il faut inverser la logique: calculer ce qui a été coupé en comparant');
console.log('avec la forme originale du profil.');