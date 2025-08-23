const fs = require('fs');
const path = require('path');

// Fichiers à corriger pour les types de points
const filesToFix = [
  'src/TopSteelCAD/core/features/processors/ContourProcessor.ts',
  'src/TopSteelCAD/plugins/dstv/integration/ProcessorBridge.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ Fichier non trouvé: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Fix 1: Corriger les accès point[0] et point[1] pour les points de type union
  // Remplacer les accès directs par une vérification de type
  content = content.replace(
    /const x = Array\.isArray\(point\) \? point\[0\] : point\.x;/g,
    'const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;'
  );
  
  content = content.replace(
    /const y = Array\.isArray\(point\) \? point\[1\] : point\.y;/g,
    'const y = Array.isArray(point) ? point[1] : (point as {x: number, y: number}).y;'
  );
  
  // Fix 2: Pour les boucles sur points, ajouter une assertion de type
  content = content.replace(
    /for \(const point of points\) \{/g,
    'for (const point of points as Array<[number, number] | {x: number, y: number}>) {'
  );
  
  // Fix 3: Dans isContourACut, corriger l'accès aux points
  const isContourACutRegex = /for \(const point of points\) \{\s+minX = Math\.min\(minX, point\[0\]\);\s+maxX = Math\.max\(maxX, point\[0\]\);/g;
  content = content.replace(isContourACutRegex, `for (const point of points) {
      const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;
      const y = Array.isArray(point) ? point[1] : (point as {x: number, y: number}).y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);`);
  
  // Fix 4: Corriger la suite de isContourACut
  content = content.replace(
    /minY = Math\.min\(minY, point\[1\]\);\s+maxY = Math\.max\(maxY, point\[1\]\);/g,
    `minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);`
  );
  
  // Fix 5: Dans detectNotches, corriger l'accès aux points
  content = content.replace(
    /for \(const point of points\) \{\s+minX = Math\.min\(minX, point\[0\]\);\s+maxX = Math\.max\(maxX, point\[0\]\);/g,
    `for (const point of points) {
      const x = Array.isArray(point) ? point[0] : (point as {x: number, y: number}).x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);`
  );
  
  // Fix 6: Dans calculatePolygonArea
  content = content.replace(
    /area \+= points\[i\]\[0\] \* points\[j\]\[1\];/g,
    `const xi = Array.isArray(points[i]) ? points[i][0] : (points[i] as {x: number, y: number}).x;
      const yi = Array.isArray(points[i]) ? points[i][1] : (points[i] as {x: number, y: number}).y;
      const xj = Array.isArray(points[j]) ? points[j][0] : (points[j] as {x: number, y: number}).x;
      const yj = Array.isArray(points[j]) ? points[j][1] : (points[j] as {x: number, y: number}).y;
      area += xi * yj;`
  );
  
  content = content.replace(
    /area -= points\[j\]\[0\] \* points\[i\]\[1\];/g,
    `area -= xj * yi;`
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Corrigé: ${filePath}`);
    return true;
  } else {
    console.log(`  ⏭️ Aucune modification: ${filePath}`);
    return false;
  }
}

console.log('🔧 Correction des types de points...\n');

let fixedCount = 0;
for (const file of filesToFix) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ ${fixedCount} fichiers corrigés`);