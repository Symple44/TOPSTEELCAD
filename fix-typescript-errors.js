const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fonction pour remplacer 'as unknown' par 'as any' dans un fichier
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Remplacer 'as unknown' par 'as any'
  content = content.replace(/as unknown/g, 'as any');
  
  // Si des changements ont été faits, sauvegarder le fichier
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Trouver tous les fichiers TypeScript et TSX
const files = [
  ...glob.sync('src/**/*.ts'),
  ...glob.sync('src/**/*.tsx')
];

let fixedCount = 0;

files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files with TypeScript errors`);