const fs = require('fs');

console.log('=== ANALYSE DES ANGLES h5004 ===\n');

// Points du contour AK face 'o' selon le fichier DSTV
const points = [
  { x: 25.72, y: 0.00, angle: 29.20 },
  { x: 25.72, y: 50.80 },
  { x: 2177.64, y: 50.80, angle: 60.80 },
  { x: 2177.64, y: 0.00 },
  { x: 25.72, y: 0.00 }
];

console.log('Points du contour:');
points.forEach((p, i) => {
  console.log(`  Point ${i}: x=${p.x}, y=${p.y}${p.angle ? ', angle=' + p.angle : ''}`);
});

console.log('\n=== PROBLÈME IDENTIFIÉ ===');
console.log('1. Le code cherche des segments diagonaux avec Math.atan2(dy, dx)');
console.log('2. Mais les segments sont VERTICAUX (dx = 0) ou HORIZONTAUX (dy = 0)');
console.log('3. Les angles 29.20° et 60.80° sont STOCKÉS dans les données DSTV');
console.log('4. Ils ne sont PAS calculés à partir de la géométrie des segments');

// Analyse des segments
console.log('\n=== ANALYSE DES SEGMENTS ===');
for (let i = 1; i < points.length; i++) {
  const dx = points[i].x - points[i-1].x;
  const dy = points[i].y - points[i-1].y;
  const calculatedAngle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
  
  console.log(`Segment ${i-1} -> ${i}:`);
  console.log(`  dx = ${dx.toFixed(2)}, dy = ${dy.toFixed(2)}`);
  console.log(`  Angle calculé = ${calculatedAngle.toFixed(1)}°`);
  if (points[i-1].angle) {
    console.log(`  Angle stocké = ${points[i-1].angle}°`);
  }
  console.log('');
}

console.log('=== CORRECTION NÉCESSAIRE ===');
console.log('Le code doit lire les angles directement des données DSTV,');
console.log('pas les calculer avec Math.atan2 sur les segments.');