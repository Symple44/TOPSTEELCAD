const fs = require('fs');
const path = require('path');

const handlersDir = path.join(__dirname, 'src/TopSteelCAD/core/features/processors/cut/handlers');
const servicesDir = path.join(__dirname, 'src/TopSteelCAD/core/features/processors/cut/services');
const adaptersDir = path.join(__dirname, 'src/TopSteelCAD/core/features/processors/cut/adapters');
const utilsDir = path.join(__dirname, 'src/TopSteelCAD/core/features/processors/cut/utils');

// Fonction pour corriger les imports dans un fichier
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remplacer les imports incorrects
  content = content.replace(
    /import \{ Feature, FeatureType, ProfileFace \} from '\.\.\/\.\.\/\.\.\/\.\.\/types';?/g,
    "import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';"
  );
  
  // Pour les handlers (dans le dossier handlers/)
  if (filePath.includes('/handlers/')) {
    content = content.replace(
      /import \{ Feature, FeatureType, ProfileFace \} from '\.\.\/\.\.\/\.\.\/\.\.\/types';?/g,
      "import { Feature, FeatureType, ProfileFace } from '../types/CoreTypes';"
    );
  }
  
  // Pour les services
  if (filePath.includes('/services/')) {
    content = content.replace(
      /import \{ Feature, ProfileFace, ProfileType \} from '\.\.\/\.\.\/\.\.\/\.\.\/types';?/g,
      "import { Feature, ProfileFace, ProfileType } from '../types/CoreTypes';"
    );
  }
  
  // Pour les adapters
  if (filePath.includes('/adapters/')) {
    content = content.replace(
      /import \{ Feature, FeatureType \} from '\.\.\/\.\.\/\.\.\/\.\.\/types';?/g,
      "import { Feature, FeatureType } from '../types/CoreTypes';"
    );
  }
  
  // Pour les utils
  if (filePath.includes('/utils/')) {
    content = content.replace(
      /import \{ Feature \} from '\.\.\/\.\.\/\.\.\/\.\.\/types';?/g,
      "import { Feature } from '../types/CoreTypes';"
    );
  }
  
  // Corriger l'import de BufferGeometryUtils
  content = content.replace(
    /THREE\.BufferGeometryUtils\.mergeGeometries/g,
    "BufferGeometryUtils.mergeGeometries"
  );
  
  // Ajouter l'import de BufferGeometryUtils si nécessaire et s'il n'existe pas déjà
  if (content.includes('BufferGeometryUtils.mergeGeometries') && !content.includes("import * as BufferGeometryUtils")) {
    // Trouver la dernière ligne d'import
    const lastImportMatch = content.match(/(import[^;]+;[\r\n]+)(?!import)/);
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPos) + 
                "import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';\n" +
                content.slice(insertPos);
    }
  }
  
  // Sauvegarder le fichier modifié
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Fixed imports in: ${path.basename(filePath)}`);
}

// Traiter tous les fichiers TypeScript dans les dossiers
function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      const filePath = path.join(dir, file);
      fixImports(filePath);
    }
  });
}

// Traiter tous les dossiers
console.log('🔧 Fixing imports in cut architecture...\n');
processDirectory(handlersDir);
processDirectory(servicesDir);
processDirectory(adaptersDir);
processDirectory(utilsDir);
console.log('\n✨ Import fixes complete!');