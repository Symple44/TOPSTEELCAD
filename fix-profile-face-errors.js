const fs = require('fs');
const path = require('path');

// Fichiers à corriger
const filesToFix = [
  'src/TopSteelCAD/core/features/processors/ContourProcessor.ts',
  'src/TopSteelCAD/core/features/processors/CutProcessor.ts',
  'src/TopSteelCAD/core/features/processors/HoleProcessor.ts',
  'src/TopSteelCAD/core/features/processors/NotchProcessor.ts',
  'src/TopSteelCAD/core/features/processors/ThreadingProcessor.ts',
  'src/TopSteelCAD/core/features/processors/UnrestrictedContourProcessor.ts',
  'src/TopSteelCAD/core/features/utils/PositionCalculator.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ Fichier non trouvé: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Vérifier si ProfileFace est importé
  const hasProfileFaceImport = content.includes('ProfileFace');
  
  if (hasProfileFaceImport && !content.includes("import { ProfileFace")) {
    // Ajouter l'import si nécessaire
    const typesImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/types['"]/;
    const match = content.match(typesImportRegex);
    
    if (match) {
      // Ajouter ProfileFace à l'import existant
      const imports = match[1];
      if (!imports.includes('ProfileFace')) {
        const newImports = imports.trim() + ', ProfileFace';
        content = content.replace(match[0], `import {${newImports}} from '../types'`);
        console.log(`  ✅ Ajout de ProfileFace à l'import existant`);
      }
    } else {
      // Ajouter un nouvel import
      const importStatement = "import { ProfileFace } from '../types';\n";
      
      // Trouver où insérer l'import
      const firstImportIndex = content.indexOf('import ');
      if (firstImportIndex !== -1) {
        // Trouver la fin du dernier import
        let lastImportEnd = firstImportIndex;
        let currentIndex = firstImportIndex;
        
        while (currentIndex !== -1) {
          const nextImport = content.indexOf('\nimport ', currentIndex + 1);
          if (nextImport === -1) break;
          currentIndex = nextImport;
          const lineEnd = content.indexOf('\n', currentIndex + 1);
          if (lineEnd !== -1) {
            lastImportEnd = lineEnd;
          }
        }
        
        // Insérer après le dernier import
        content = content.slice(0, lastImportEnd + 1) + importStatement + content.slice(lastImportEnd + 1);
        console.log(`  ✅ Ajout d'un nouvel import ProfileFace`);
      }
    }
  }
  
  // Remplacer les comparaisons de face incorrectes
  content = content.replace(/face === ['"]v['"]/g, "face === ProfileFace.WEB");
  content = content.replace(/face === ['"]u['"]/g, "face === ProfileFace.BOTTOM");
  content = content.replace(/face === ['"]o['"]/g, "face === ProfileFace.TOP");
  content = content.replace(/face === ['"]h['"]/g, "face === ProfileFace.FRONT");
  
  // Remplacer les comparaisons avec ||
  content = content.replace(/\|\| ['"]v['"]/g, "|| ProfileFace.WEB");
  content = content.replace(/\|\| ['"]u['"]/g, "|| ProfileFace.BOTTOM");
  content = content.replace(/\|\| ['"]o['"]/g, "|| ProfileFace.TOP");
  content = content.replace(/\|\| ['"]h['"]/g, "|| ProfileFace.FRONT");
  
  // Remplacer les comparaisons avec ==
  content = content.replace(/face == ['"]v['"]/g, "face === ProfileFace.WEB");
  content = content.replace(/face == ['"]u['"]/g, "face === ProfileFace.BOTTOM");
  content = content.replace(/face == ['"]o['"]/g, "face === ProfileFace.TOP");
  content = content.replace(/face == ['"]h['"]/g, "face === ProfileFace.FRONT");
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Corrigé: ${filePath}`);
    return true;
  } else {
    console.log(`  ⏭️ Aucune modification: ${filePath}`);
    return false;
  }
}

console.log('🔧 Correction des erreurs ProfileFace...\n');

let fixedCount = 0;
for (const file of filesToFix) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ ${fixedCount} fichiers corrigés`);