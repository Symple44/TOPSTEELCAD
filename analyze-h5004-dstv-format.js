const fs = require('fs');

console.log('=== ANALYSE DU FORMAT DSTV h5004 ===\n');

// Lignes AK de h5004.nc1
const akLines = [
  'AK',
  '  o      25.72s      0.00       0.00      29.20       0.00       0.00       0.00',
  '         25.72      50.80       0.00       0.00       0.00       0.00       0.00',
  '       2177.64      50.80       0.00      60.80       0.00       0.00       0.00',
  '       2177.64       0.00       0.00       0.00       0.00       0.00       0.00',
  '         25.72       0.00       0.00       0.00       0.00       0.00       0.00'
];

console.log('Lignes AK brutes:');
akLines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

// Parser les champs en mimant le code actuel
console.log('\n=== PARSING DES CHAMPS ===');

// Supprimer la ligne "AK"
const dataLines = akLines.slice(1);
let allFields = [];

dataLines.forEach(line => {
  const fields = line.trim().split(/\s+/);
  allFields.push(...fields);
});

console.log(`Total des champs: ${allFields.length}`);
console.log('Tous les champs:', allFields);

console.log('\n=== ANALYSE PAR GROUPES DE 7 ===');
// Le parser utilise un groupe de 7 par "point"
for (let i = 0; i < allFields.length; i += 7) {
  const group = allFields.slice(i, i + 7);
  if (group.length >= 7) {
    console.log(`Groupe ${Math.floor(i/7)}:`, group);
    console.log(`  Face: ${group[0]}`);
    console.log(`  X: ${group[1]}, Y: ${group[2]}, Z: ${group[3]}`);
    console.log(`  Angle: ${group[4]} ← ICI L'ANGLE !`);
    console.log(`  Autres: ${group[5]}, ${group[6]}`);
    console.log('');
  }
}

console.log('=== PROBLÈME IDENTIFIÉ ===');
console.log('1. Le parser AK lit seulement X et Y (champs 1 et 2)');
console.log('2. L\'angle est dans le champ 4 mais n\'est PAS lu');
console.log('3. Les angles 29.20° et 60.80° sont IGNORÉS');
console.log('4. Le code essaie ensuite de calculer les angles avec Math.atan2');
console.log('5. Mais il n\'y a pas de segments diagonaux à analyser !');

console.log('\n=== CORRECTION NÉCESSAIRE ===');
console.log('Modifier AKBlockParser pour lire le champ d\'angle (champ 4)');
console.log('Et stocker cet angle avec chaque point.'); 