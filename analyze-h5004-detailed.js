const fs = require('fs');

console.log('='.repeat(80));
console.log('ANALYSE DÉTAILLÉE DES CONTOURS AK DE h5004.nc1');
console.log('='.repeat(80));

const content = fs.readFileSync('test-files/dstv/h5004.nc1', 'utf8');
const lines = content.split('\n').map(l => l.replace('\r', ''));

// Extraire les dimensions du profil
let profileLength = 0;
let profileHeight = 0;
let profileWidth = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'ST') {
    if (lines[i+10]) profileLength = parseFloat(lines[i+10].trim());
    if (lines[i+11]) profileWidth = parseFloat(lines[i+11].trim());
    if (lines[i+12]) profileHeight = parseFloat(lines[i+12].trim());
    break;
  }
}

console.log('\nPROFIL HSS51X51X4.8:');
console.log(`  Longueur: ${profileLength} mm`);
console.log(`  Largeur/Hauteur: ${profileWidth} x ${profileHeight} mm`);
console.log('');

// Parser chaque bloc AK
let akBlockNumber = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'AK') {
    akBlockNumber++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BLOC AK #${akBlockNumber} (lignes ${i+1}-${i+6}):`);
    console.log(`${'='.repeat(60)}`);
    
    // Afficher les 5 lignes de données
    const dataLines = [];
    for (let j = 1; j <= 5 && i+j < lines.length; j++) {
      const line = lines[i+j];
      if (line.trim() && !['AK', 'BO', 'EN'].includes(line.trim())) {
        dataLines.push(line);
        console.log(`  Ligne ${j}: ${line}`);
      } else {
        break;
      }
    }
    
    // Parser les points
    const points = [];
    let face = '';
    
    for (const line of dataLines) {
      const fields = line.trim().split(/\s+/);
      
      // Premier champ de la première ligne = face
      if (!face && fields[0] && isNaN(parseFloat(fields[0]))) {
        face = fields[0];
      }
      
      // Lire les coordonnées par paires (en ignorant les indicateurs de face)
      for (let k = 0; k < fields.length - 1; k++) {
        const val1 = fields[k];
        const val2 = fields[k+1];
        
        // Si c'est une paire de nombres
        if (!isNaN(parseFloat(val1)) && !isNaN(parseFloat(val2))) {
          // Ignorer les indicateurs de face qui peuvent être au milieu
          if (k === 0 || !['v', 'o', 'u', 'h', 's'].includes(fields[k-1])) {
            points.push({
              x: parseFloat(val1),
              y: parseFloat(val2)
            });
            k++; // Sauter le deuxième nombre de la paire
          }
        }
      }
    }
    
    console.log(`\nFace: ${face}`);
    console.log(`Points extraits (${points.length}):`);
    points.forEach((p, idx) => {
      console.log(`  ${idx+1}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    });
    
    // Analyser la forme
    if (points.length > 0) {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      console.log(`\nAnalyse du contour:`);
      console.log(`  X: [${minX.toFixed(1)} → ${maxX.toFixed(1)}] = ${(maxX - minX).toFixed(1)} mm`);
      console.log(`  Y: [${minY.toFixed(1)} → ${maxY.toFixed(1)}] = ${(maxY - minY).toFixed(1)} mm`);
      
      // Interprétation pour tubes HSS
      console.log(`\nINTERPRÉTATION (tube HSS):`);
      
      if (face === 'v' || face === 'h') {
        // Face web (avant/arrière)
        console.log(`  Face: Web (${face === 'v' ? 'avant' : 'arrière'})`);
        
        if (Math.abs(maxX - profileLength) < 1) {
          console.log(`  ✅ Longueur complète du tube (${maxX.toFixed(1)} mm)`);
        } else {
          const missing = profileLength - maxX;
          console.log(`  ⚠️ Longueur réduite: ${maxX.toFixed(1)} mm`);
          console.log(`     → ${missing.toFixed(1)} mm manquants à la fin`);
        }
        
        if (minX > 1) {
          console.log(`  ⚠️ Début à ${minX.toFixed(1)} mm au lieu de 0`);
          console.log(`     → ${minX.toFixed(1)} mm manquants au début`);
        }
      } else if (face === 'o' || face === 'u') {
        // Face flange (haut/bas)
        console.log(`  Face: Flange (${face === 'o' ? 'haut' : 'bas'})`);
        
        const lengthDiff = profileLength - (maxX - minX);
        if (lengthDiff > 1) {
          console.log(`  ⚠️ Contour plus court que le profil de ${lengthDiff.toFixed(1)} mm`);
        }
      }
      
      // Détecter les coupes d'angle
      let hasAngleCut = false;
      for (let j = 1; j < points.length; j++) {
        const dx = Math.abs(points[j].x - points[j-1].x);
        const dy = Math.abs(points[j].y - points[j-1].y);
        
        if (dx > 10 && dy > 10) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          console.log(`  🔺 Segment diagonal détecté: angle=${angle.toFixed(1)}°`);
          hasAngleCut = true;
        }
      }
      
      if (hasAngleCut) {
        console.log(`  → COUPE D'ANGLE aux extrémités`);
      }
    }
    
    i += dataLines.length; // Sauter les lignes traitées
  }
}

console.log('\n');
console.log('='.repeat(80));
console.log('CONCLUSION:');
console.log('='.repeat(80));
console.log('Les contours AK définissent la forme FINALE du tube après coupe.');
console.log('Pour h5004, il semble y avoir des coupes d\'angle aux extrémités.');
console.log('La logique de coupe doit être plus subtile : analyser les contours');
console.log('pour déterminer précisément quelle partie du tube a été enlevée.');