const fs = require('fs');

console.log('='.repeat(80));
console.log('ANALYSE DES BLOCS AK DE h5004.nc1 - VERSION CORRIGÉE');
console.log('='.repeat(80));

const content = fs.readFileSync('test-files/dstv/h5004.nc1', 'utf8');
const lines = content.split('\n').map(l => l.replace('\r', ''));

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
console.log(`  Largeur: ${profileWidth} mm (web width)`);
console.log(`  Hauteur: ${profileHeight} mm (flange height)`);
console.log('');

// Fonction pour parser un bloc AK multi-lignes
function parseAKBlock(startIdx, lines) {
  const points = [];
  let face = '';
  let i = startIdx + 1; // Commencer après 'AK'
  
  // Lire toutes les lignes jusqu'au prochain bloc ou EN
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line === 'BO' || line === 'EN' || line === 'AK' || line === 'SI') {
      break;
    }
    
    // Parser la ligne de données
    const fields = line.split(/\s+/);
    
    // Premier champ peut être un indicateur de face (v, o, u, h)
    let startField = 0;
    if (fields[0] && isNaN(parseFloat(fields[0]))) {
      face = fields[0];
      startField = 1;
    }
    
    // Lire les coordonnées par paires
    for (let j = startField; j < fields.length - 1; j += 2) {
      const x = parseFloat(fields[j]);
      const y = parseFloat(fields[j + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        points.push({x, y});
      }
    }
    
    i++;
  }
  
  return {face, points, endIdx: i};
}

// Analyser chaque bloc AK
let akBlockNumber = 0;
const akBlocks = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'AK') {
    akBlockNumber++;
    const block = parseAKBlock(i, lines);
    akBlocks.push(block);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BLOC AK #${akBlockNumber}:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Face: ${block.face || 'non spécifiée'}`);
    console.log(`Nombre de points: ${block.points.length}`);
    
    // Afficher les points
    console.log(`\nPoints du contour:`);
    block.points.forEach((p, idx) => {
      console.log(`  Point ${idx+1}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    });
    
    // Analyser les dimensions du contour
    if (block.points.length > 0) {
      const xs = block.points.map(p => p.x);
      const ys = block.points.map(p => p.y);
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
      
      // Déterminer quelle dimension comparer selon la face
      let expectedLength = profileLength;
      let expectedHeight = 0;
      
      if (block.face === 'v' || block.face === 'h') {
        // Face web: longueur x hauteur
        expectedHeight = profileHeight;
      } else if (block.face === 'o' || block.face === 'u') {
        // Face flange: longueur x largeur
        expectedHeight = profileWidth;
      }
      
      console.log(`  Longueur contour: ${contourLength.toFixed(2)} vs attendu: ${expectedLength.toFixed(2)}`);
      console.log(`  Hauteur contour: ${contourHeight.toFixed(2)} vs attendu: ${expectedHeight.toFixed(2)}`);
      
      // Détecter le type de modification
      const lengthDiff = expectedLength - contourLength;
      const isFullLength = Math.abs(lengthDiff) < 1;
      const isFullHeight = Math.abs(contourHeight - expectedHeight) < 1;
      
      if (!isFullLength) {
        console.log(`\n⚠️ CONTOUR MODIFIÉ EN LONGUEUR:`);
        console.log(`  Différence: ${lengthDiff.toFixed(2)} mm`);
        
        if (minX > 1) {
          console.log(`  → Coupe au début: ${minX.toFixed(2)} mm enlevés`);
        }
        if (maxX < expectedLength - 1) {
          console.log(`  → Coupe à la fin: ${(expectedLength - maxX).toFixed(2)} mm enlevés`);
        }
      }
      
      if (!isFullHeight) {
        console.log(`\n⚠️ CONTOUR MODIFIÉ EN HAUTEUR:`);
        console.log(`  Hauteur réduite de ${expectedHeight.toFixed(2)} à ${contourHeight.toFixed(2)} mm`);
      }
      
      // Analyser la forme
      const isRectangular = block.points.length === 5 && 
        Math.abs(block.points[0].x - block.points[4].x) < 0.1 && 
        Math.abs(block.points[0].y - block.points[4].y) < 0.1;
      
      if (isRectangular) {
        console.log(`\n✅ Forme rectangulaire (5 points, fermé)`);
      } else {
        console.log(`\n⚠️ Forme complexe (${block.points.length} points)`);
        
        // Détecter les angles
        for (let j = 1; j < block.points.length - 1; j++) {
          const p1 = block.points[j - 1];
          const p2 = block.points[j];
          const p3 = block.points[j + 1];
          
          const dx1 = p2.x - p1.x;
          const dy1 = p2.y - p1.y;
          const dx2 = p3.x - p2.x;
          const dy2 = p3.y - p2.y;
          
          // Si les deux segments ont des changements significatifs en X et Y
          if (Math.abs(dx1) > 1 && Math.abs(dy1) > 1) {
            console.log(`  → Segment diagonal détecté: Point ${j} à ${j+1}`);
          }
        }
      }
    }
    
    i = block.endIdx - 1; // Continuer après ce bloc
  }
}

console.log('\n');
console.log('='.repeat(80));
console.log('RÉSUMÉ DE L\'ANALYSE:');
console.log('='.repeat(80));
console.log(`Nombre total de blocs AK: ${akBlockNumber}`);
console.log('\nINTERPRÉTATION POUR TUBES HSS:');
console.log('- Les contours AK définissent la FORME FINALE du tube après coupe');
console.log('- Pour créer les coupes, il faut:');
console.log('  1. Comparer chaque contour AK avec la forme originale du profil');
console.log('  2. Calculer la différence (ce qui a été enlevé)');
console.log('  3. Créer des features de coupe pour ces zones');
console.log('\nEXEMPLE:');
console.log('- Si le tube fait 2260mm et le contour AK fait 2170mm');
console.log('- Alors il y a une coupe de 90mm (probablement aux extrémités)');