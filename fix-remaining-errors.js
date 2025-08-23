const fs = require('fs');
const path = require('path');

// Fonction pour corriger un fichier
function fixFile(filePath, fixes) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ Fichier non trouvé: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Appliquer toutes les corrections
  for (const fix of fixes) {
    if (fix.regex) {
      content = content.replace(fix.regex, fix.replacement);
    } else {
      content = content.replace(fix.search, fix.replacement);
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Corrigé: ${filePath}`);
    return true;
  }
  return false;
}

// Corrections pour ContourProcessor.ts
console.log('🔧 Correction de ContourProcessor.ts...');
fixFile('src/TopSteelCAD/core/features/processors/ContourProcessor.ts', [
  // Corriger getContourBounds
  {
    search: 'for (const point of points as Array<[number, number] | {x: number, y: number}>) {\n      minX = Math.min(minX, point[0]);\n      maxX = Math.max(maxX, point[0]);\n      minY = Math.min(minY, y);\n      maxY = Math.max(maxY, y);',
    replacement: `for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);`
  },
  // Corriger detectNotches
  {
    search: 'for (const point of points as Array<[number, number] | {x: number, y: number}>) {\n      minX = Math.min(minX, point[0]);\n      maxX = Math.max(maxX, point[0]);',
    replacement: `for (const point of points) {
      const x = Array.isArray(point) ? point[0] : (point as any).x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);`
  },
  // Corriger applyNotches
  {
    search: 'for (const point of points as Array<[number, number] | {x: number, y: number}>) {\n        minX = Math.min(minX, point[0]);\n        maxX = Math.max(maxX, point[0]);',
    replacement: `for (const point of points) {
        const x = Array.isArray(point) ? point[0] : (point as any).x;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);`
  }
]);

// Corrections pour HoleProcessor.ts
console.log('🔧 Correction de HoleProcessor.ts...');
fixFile('src/TopSteelCAD/core/features/processors/HoleProcessor.ts', [
  // Remplacer toutes les références ProfileFace non qualifiées
  {
    regex: /\bProfileFace\.TOP\b/g,
    replacement: 'feature.parameters.face === ProfileFace.TOP'
  },
  {
    regex: /\bProfileFace\.WEB\b/g,
    replacement: 'feature.parameters.face === ProfileFace.WEB'
  },
  {
    regex: /\bProfileFace\.BOTTOM\b/g,
    replacement: 'feature.parameters.face === ProfileFace.BOTTOM'
  }
]);

// Corrections pour NotchProcessor.ts  
console.log('🔧 Correction de NotchProcessor.ts...');
fixFile('src/TopSteelCAD/core/features/processors/NotchProcessor.ts', [
  // Supprimer toutes les références à NormalizedFeature
  {
    regex: /NormalizedFeature/g,
    replacement: 'Feature'
  }
]);

// Corrections pour strategies
const strategyFiles = [
  'src/TopSteelCAD/core/features/processors/strategies/BeveledCutStrategy.ts',
  'src/TopSteelCAD/core/features/processors/strategies/CompoundCutStrategy.ts',
  'src/TopSteelCAD/core/features/processors/strategies/SimpleCutStrategy.ts'
];

for (const file of strategyFiles) {
  console.log(`🔧 Correction de ${path.basename(file)}...`);
  fixFile(file, [
    // Remplacer les comparaisons de strings avec ProfileFace
    {
      regex: /face === ['"]v['"]/g,
      replacement: 'face === ProfileFace.WEB'
    },
    {
      regex: /face === ['"]u['"]/g,
      replacement: 'face === ProfileFace.BOTTOM_FLANGE'
    },
    {
      regex: /face === ['"]o['"]/g,
      replacement: 'face === ProfileFace.TOP_FLANGE'
    },
    // Corriger les arguments de fonction
    {
      regex: /\(ProfileFace \| "v"\)/g,
      replacement: '(ProfileFace)'
    }
  ]);
}

// Corrections pour CutProcessor.ts
console.log('🔧 Correction de CutProcessor.ts...');
fixFile('src/TopSteelCAD/core/features/processors/CutProcessor.ts', [
  // Remplacer "WEB" par ProfileFace.WEB
  {
    regex: /"WEB"/g,
    replacement: 'ProfileFace.WEB'
  },
  // Remplacer les comparaisons avec 'v', 'u', 'o'
  {
    regex: /=== ['"]v['"]/g,
    replacement: '=== ProfileFace.WEB'
  },
  {
    regex: /=== ['"]u['"]/g,
    replacement: '=== ProfileFace.BOTTOM_FLANGE'
  },
  {
    regex: /=== ['"]o['"]/g,
    replacement: '=== ProfileFace.TOP_FLANGE'
  }
]);

// Corrections pour ThreadingProcessor.ts et UnrestrictedContourProcessor.ts
console.log('🔧 Correction de ThreadingProcessor.ts et UnrestrictedContourProcessor.ts...');
fixFile('src/TopSteelCAD/core/features/processors/ThreadingProcessor.ts', [
  {
    regex: /"top"/g,
    replacement: 'ProfileFace.TOP'
  }
]);

fixFile('src/TopSteelCAD/core/features/processors/UnrestrictedContourProcessor.ts', [
  {
    regex: /"web"/g,
    replacement: 'ProfileFace.WEB'
  }
]);

console.log('\n✨ Corrections terminées!');