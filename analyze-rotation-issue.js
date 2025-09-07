console.log('=== ANALYSE DU PROBLÈME DE ROTATION h5004 ===\n');

// Données du fichier h5004.nc1
const profileLength = 2259.98;
const angles = {
  start: 29.20,  // Angle au début 
  end: 60.80     // Angle à la fin
};

console.log('Données du profil:');
console.log(`  Longueur: ${profileLength} mm`);
console.log(`  Angle début: ${angles.start}°`);
console.log(`  Angle fin: ${angles.end}°`);

console.log('\n=== PROBLÈME IDENTIFIÉ ===');

console.log('1. LECTURE DES ANGLES:');
console.log('   ❌ AKBlockParser ignore les angles dans le champ 4');
console.log('   ❌ DSTVNormalizationStage calcule avec Math.atan2 sur des segments verticaux');
console.log('   ❌ Résultat: Math.atan2(50.80, 0) = 90° au lieu de 29.20°/60.80°');

console.log('\n2. APPLICATION DE LA ROTATION:');
console.log('   ❌ CutProcessor.applyChamferEndCut():');
console.log('       if (isAtStart) rotationAngle = angle * PI/180');  
console.log('       else rotationAngle = -angle * PI/180');
console.log('   ❌ FeatureOutlineRenderer:');
console.log('       if (position === "start") rotationAngle = angle * PI/180');
console.log('       else rotationAngle = -angle * PI/180');

console.log('\n3. PROBLÈMES DE ROTATION:');
const startRotation = angles.start * Math.PI / 180;
const endRotation = -angles.end * Math.PI / 180;
console.log(`   Début: ${angles.start}° → ${startRotation.toFixed(3)} rad`);
console.log(`   Fin: ${angles.end}° → ${endRotation.toFixed(3)} rad (négatif)`);
console.log('   ❌ L\'inversion de signe à la fin peut être incorrecte');

console.log('\n=== ANALYSE GÉOMÉTRIQUE ===');
console.log('Dans le système DSTV:');
console.log('- L\'angle semble être mesuré depuis l\'horizontale');
console.log('- 29.20° = coupe légèrement inclinée au début');
console.log('- 60.80° = coupe plus inclinée à la fin'); 
console.log('- Les deux coupes "mordent" dans le tube');

console.log('\n=== CORRECTIONS NÉCESSAIRES ===');
console.log('1. MODIFIER AKBlockParser:');
console.log('   - Lire le champ d\'angle (index 4) dans parseMatrixFormat');
console.log('   - Stocker l\'angle avec chaque point');

console.log('\n2. MODIFIER DSTVNormalizationStage:');
console.log('   - Ne PAS calculer avec Math.atan2');
console.log('   - Utiliser directement les angles des points DSTV');

console.log('\n3. VÉRIFIER CutProcessor.applyChamferEndCut():');
console.log('   - Vérifier que la rotation rotateY est correcte');
console.log('   - Vérifier les signes des angles');
console.log('   - S\'assurer que l\'orientation est cohérente');

console.log('\n4. VÉRIFIER FeatureOutlineRenderer:');
console.log('   - Synchroniser avec CutProcessor');
console.log('   - Même logique de rotation');