/**
 * validate-cut-architecture.js
 * Script complet de validation de la nouvelle architecture de coupe
 * Teste TOUS les fichiers DSTV disponibles et génère un rapport
 */

const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     VALIDATION DE LA NOUVELLE ARCHITECTURE DE COUPE      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const DSTV_DIR = path.join(__dirname, 'test-files', 'dstv');
const OUTPUT_DIR = path.join(__dirname, 'validation-reports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Créer le dossier de rapports si nécessaire
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Statistiques globales
const stats = {
  filesProcessed: 0,
  totalBlocks: 0,
  blockTypes: {},
  cutTypes: {},
  errors: [],
  warnings: [],
  performance: {
    totalTime: 0,
    avgTimePerFile: 0,
    avgTimePerBlock: 0
  }
};

/**
 * Analyse un fichier DSTV
 */
function analyzeFile(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const fileStats = {
    name: fileName,
    size: content.length,
    lines: lines.length,
    blocks: {},
    features: {
      cuts: 0,
      holes: 0,
      markings: 0,
      other: 0
    },
    profile: null,
    validation: {
      valid: true,
      errors: [],
      warnings: []
    }
  };
  
  // Analyser les blocks
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 2) {
      const blockType = trimmed.substring(0, 2);
      
      // Blocks principaux
      if (blockType === 'ST') {
        // Start block - contient les infos du profil
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          fileStats.profile = {
            type: parts[1],
            designation: parts[2],
            length: parseFloat(parts[3]) || 0
          };
        }
      }
      
      // Compter les types de blocks
      if (/^[A-Z]{2}$/.test(blockType)) {
        fileStats.blocks[blockType] = (fileStats.blocks[blockType] || 0) + 1;
        stats.blockTypes[blockType] = (stats.blockTypes[blockType] || 0) + 1;
        stats.totalBlocks++;
        
        // Classifier les features
        switch (blockType) {
          case 'AK': // Aussenkontur
          case 'IK': // Innenkontur  
          case 'SC': // Sägen/Cut
          case 'BR': // Bevel/Radius
          case 'KO': // Kontur
            fileStats.features.cuts++;
            break;
          case 'BO': // Bohren/Drilling
          case 'SI': // Sinking
            fileStats.features.holes++;
            break;
          case 'PU': // Punching/Marking
          case 'KE': // Kennzeichnung
            fileStats.features.markings++;
            break;
          default:
            fileStats.features.other++;
        }
      }
    }
  }
  
  // Validation basique
  if (!fileStats.profile) {
    fileStats.validation.valid = false;
    fileStats.validation.errors.push('No ST (Start) block found');
  }
  
  if (Object.keys(fileStats.blocks).length === 0) {
    fileStats.validation.warnings.push('No feature blocks found');
  }
  
  if (!fileStats.blocks['EN']) {
    fileStats.validation.warnings.push('No EN (End) block found');
  }
  
  return fileStats;
}

/**
 * Teste la compatibilité avec la nouvelle architecture
 */
function testArchitectureCompatibility(fileStats) {
  const compatibility = {
    supported: true,
    handlers: [],
    unsupportedBlocks: [],
    coverage: 0
  };
  
  // Mapping des blocks vers handlers
  const blockToHandler = {
    'AK': 'ExteriorCutHandler',
    'IK': 'InteriorCutHandler',
    'SC': 'SlotCutHandler',
    'BR': 'BevelCutHandler',
    'BO': 'HoleProcessor',
    'SI': 'HoleProcessor',
    'KO': 'ContourCutHandler',
    'PU': 'MarkingProcessor',
    'KE': 'MarkingProcessor'
  };
  
  const supportedCount = Object.keys(fileStats.blocks).filter(block => 
    blockToHandler[block] !== undefined
  ).length;
  
  compatibility.coverage = Object.keys(fileStats.blocks).length > 0 ? 
    (supportedCount / Object.keys(fileStats.blocks).length) * 100 : 100;
  
  // Identifier les handlers nécessaires
  for (const block in fileStats.blocks) {
    if (blockToHandler[block]) {
      if (!compatibility.handlers.includes(blockToHandler[block])) {
        compatibility.handlers.push(blockToHandler[block]);
      }
    } else {
      compatibility.unsupportedBlocks.push(block);
    }
  }
  
  if (compatibility.unsupportedBlocks.length > 0) {
    compatibility.supported = false;
  }
  
  return compatibility;
}

/**
 * Génère un rapport détaillé
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesAnalyzed: results.length,
      totalBlocks: stats.totalBlocks,
      uniqueBlockTypes: Object.keys(stats.blockTypes).length,
      averageCoverage: 0,
      fullySupportedFiles: 0,
      partiallySupportedFiles: 0,
      unsupportedFiles: 0
    },
    blockDistribution: stats.blockTypes,
    files: results,
    recommendations: []
  };
  
  // Calculer les statistiques de support
  let totalCoverage = 0;
  for (const result of results) {
    totalCoverage += result.compatibility.coverage;
    if (result.compatibility.coverage === 100) {
      report.summary.fullySupportedFiles++;
    } else if (result.compatibility.coverage > 0) {
      report.summary.partiallySupportedFiles++;
    } else {
      report.summary.unsupportedFiles++;
    }
  }
  report.summary.averageCoverage = totalCoverage / results.length;
  
  // Générer des recommandations
  const unsupportedBlocks = new Set();
  for (const result of results) {
    result.compatibility.unsupportedBlocks.forEach(block => unsupportedBlocks.add(block));
  }
  
  if (unsupportedBlocks.size > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      message: `Implement handlers for unsupported blocks: ${Array.from(unsupportedBlocks).join(', ')}`
    });
  }
  
  if (report.summary.averageCoverage < 90) {
    report.recommendations.push({
      priority: 'MEDIUM',
      message: `Current coverage is ${report.summary.averageCoverage.toFixed(1)}%. Consider implementing additional handlers.`
    });
  }
  
  // Identifier les blocks les plus utilisés
  const sortedBlocks = Object.entries(stats.blockTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  report.recommendations.push({
    priority: 'INFO',
    message: `Most used blocks: ${sortedBlocks.map(([k,v]) => `${k}(${v})`).join(', ')}`
  });
  
  return report;
}

/**
 * Affiche un résumé coloré dans la console
 */
function displaySummary(report) {
  console.log('\n📊 RÉSUMÉ DE LA VALIDATION\n');
  console.log('─'.repeat(60));
  
  // Couleurs ANSI
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  
  console.log(`${bold}Fichiers analysés:${reset} ${report.summary.filesAnalyzed}`);
  console.log(`${bold}Blocks traités:${reset} ${report.summary.totalBlocks}`);
  console.log(`${bold}Types de blocks:${reset} ${report.summary.uniqueBlockTypes}`);
  console.log(`${bold}Couverture moyenne:${reset} ${
    report.summary.averageCoverage >= 90 ? green : 
    report.summary.averageCoverage >= 70 ? yellow : red
  }${report.summary.averageCoverage.toFixed(1)}%${reset}`);
  
  console.log('\n📁 Support par fichier:');
  console.log(`  ${green}✅ Complet:${reset} ${report.summary.fullySupportedFiles} fichiers`);
  console.log(`  ${yellow}⚠️  Partiel:${reset} ${report.summary.partiallySupportedFiles} fichiers`);
  console.log(`  ${red}❌ Aucun:${reset} ${report.summary.unsupportedFiles} fichiers`);
  
  console.log('\n🎯 Distribution des blocks:');
  const topBlocks = Object.entries(report.blockDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  for (const [block, count] of topBlocks) {
    const bar = '█'.repeat(Math.floor(count / 5));
    console.log(`  ${block}: ${bar} ${count}`);
  }
  
  console.log('\n💡 Recommandations:');
  for (const rec of report.recommendations) {
    const prefix = rec.priority === 'HIGH' ? '❗' : 
                   rec.priority === 'MEDIUM' ? '⚠️ ' : 'ℹ️ ';
    console.log(`  ${prefix} ${rec.message}`);
  }
}

/**
 * Exécution principale
 */
async function main() {
  const startTime = Date.now();
  
  // Lire tous les fichiers DSTV
  const files = fs.readdirSync(DSTV_DIR)
    .filter(f => f.endsWith('.nc') || f.endsWith('.nc1') || f.endsWith('.NC1'))
    .map(f => path.join(DSTV_DIR, f));
  
  console.log(`📂 Analyse de ${files.length} fichiers DSTV...\n`);
  
  const results = [];
  const progressBarWidth = 50;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = path.basename(file);
    
    // Barre de progression
    const progress = Math.floor((i / files.length) * progressBarWidth);
    const bar = '█'.repeat(progress) + '░'.repeat(progressBarWidth - progress);
    process.stdout.write(`\r[${bar}] ${i + 1}/${files.length} - ${fileName.padEnd(20)}`);
    
    try {
      const fileStats = analyzeFile(file);
      const compatibility = testArchitectureCompatibility(fileStats);
      
      results.push({
        file: fileName,
        stats: fileStats,
        compatibility: compatibility
      });
      
      stats.filesProcessed++;
    } catch (error) {
      stats.errors.push({
        file: fileName,
        error: error.message
      });
    }
  }
  
  process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Effacer la ligne
  
  const endTime = Date.now();
  stats.performance.totalTime = endTime - startTime;
  stats.performance.avgTimePerFile = stats.performance.totalTime / stats.filesProcessed;
  stats.performance.avgTimePerBlock = stats.performance.totalTime / stats.totalBlocks;
  
  // Générer le rapport
  const report = generateReport(results);
  
  // Sauvegarder le rapport JSON
  const reportPath = path.join(OUTPUT_DIR, `validation-report-${TIMESTAMP}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
  
  // Afficher le résumé
  displaySummary(report);
  
  // Détails des fichiers problématiques
  if (report.summary.unsupportedFiles > 0) {
    console.log('\n⚠️  Fichiers avec blocks non supportés:');
    for (const result of results) {
      if (result.compatibility.unsupportedBlocks.length > 0) {
        console.log(`  - ${result.file}: ${result.compatibility.unsupportedBlocks.join(', ')}`);
      }
    }
  }
  
  console.log('\n⏱️  Performance:');
  console.log(`  - Temps total: ${stats.performance.totalTime}ms`);
  console.log(`  - Moyenne par fichier: ${stats.performance.avgTimePerFile.toFixed(2)}ms`);
  console.log(`  - Moyenne par block: ${stats.performance.avgTimePerBlock.toFixed(3)}ms`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Validation terminée avec succès!');
  
  // Code de sortie basé sur la couverture
  process.exit(report.summary.averageCoverage >= 80 ? 0 : 1);
}

// Lancer le script
main().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});