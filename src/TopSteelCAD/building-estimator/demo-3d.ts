/**
 * Script de démonstration de génération 3D
 * Démontre le Sprint 2 - Générateurs 3D
 *
 * Exécuter avec: npx ts-node src/TopSteelCAD/building-estimator/demo-3d.ts
 */

import { BuildingEngine } from './core';
import { GeometryService } from './services';
import { OpeningType, WallType } from './types';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Building Estimator - Démonstration 3D Sprint 2           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ========================================
// 1. Créer un bâtiment avec ouvertures
// ========================================
console.log('🏗️  1. CRÉATION BÂTIMENT AVEC OUVERTURES\n');

const building = BuildingEngine.createMonoPenteBuilding({
  name: 'Hangar Demo 3D',
  dimensions: {
    length: 20000,    // 20m
    width: 12000,     // 12m
    heightWall: 6000, // 6m
    slope: 10         // 10%
  },
  parameters: {
    postSpacing: 5000,
    purlinSpacing: 1500,
    railSpacing: 1200,
    postProfile: 'IPE 240',
    rafterProfile: 'IPE 200',
    purlinProfile: 'IPE 140',
    railProfile: 'UAP 80'
  },
  openings: [
    {
      id: 'door-1',
      type: OpeningType.DOOR,
      wall: WallType.FRONT,
      position: { x: 8000, z: 0 },
      dimensions: { width: 3000, height: 4000 },
      reference: 'P1'
    },
    {
      id: 'door-2',
      type: OpeningType.DOOR,
      wall: WallType.BACK,
      position: { x: 12000, z: 0 },
      dimensions: { width: 3000, height: 4000 },
      reference: 'P2'
    },
    {
      id: 'window-1',
      type: OpeningType.WINDOW,
      wall: WallType.FRONT,
      position: { x: 5000, z: 2000 },
      dimensions: { width: 1500, height: 1200 },
      reference: 'F1'
    }
  ]
});

console.log(`✅ Bâtiment créé: ${building.name}`);
console.log(`   Dimensions: ${building.dimensions.length/1000}x${building.dimensions.width/1000}m`);
console.log(`   Ouvertures: ${building.openings.length}\n`);

// ========================================
// 2. Génération 3D - Niveau LOW
// ========================================
console.log('📦 2. GÉNÉRATION 3D - NIVEAU LOW (Performance)\n');

const startLow = performance.now();
const geometryLow = GeometryService.generateBuilding3D(building, {
  levelOfDetail: 'low',
  showStructure: true,
  showCladding: true,
  showRoofing: true,
  showOpenings: true
});
const endLow = performance.now();

console.log(`   Temps de génération: ${(endLow - startLow).toFixed(2)}ms`);
console.log(`   Éléments générés:`);
console.log(`      - Poteaux: ${geometryLow.metadata.elementCounts.posts}`);
console.log(`      - Arbalétriers: ${geometryLow.metadata.elementCounts.rafters}`);
console.log(`      - Pannes: ${geometryLow.metadata.elementCounts.purlins}`);
console.log(`      - Lisses: ${geometryLow.metadata.elementCounts.rails}`);
console.log(`      - Panneaux bardage: ${geometryLow.metadata.elementCounts.claddingPanels}`);
console.log(`      - Panneaux couverture: ${geometryLow.metadata.elementCounts.roofingPanels}`);
console.log(`      - Ouvertures: ${geometryLow.metadata.elementCounts.openings}\n`);

// ========================================
// 3. Génération 3D - Niveau MEDIUM
// ========================================
console.log('📦 3. GÉNÉRATION 3D - NIVEAU MEDIUM (Standard MVP)\n');

const startMedium = performance.now();
const geometryMedium = GeometryService.generateBuilding3D(building, {
  levelOfDetail: 'medium',
  showStructure: true,
  showCladding: true,
  showRoofing: true,
  showOpenings: true
});
const endMedium = performance.now();

console.log(`   Temps de génération: ${(endMedium - startMedium).toFixed(2)}ms`);
console.log(`   Qualité: Profils simplifiés avec épaisseur`);
console.log(`   Recommandé: Visualisation standard\n`);

// ========================================
// 4. Génération 3D - Niveau HIGH
// ========================================
console.log('📦 4. GÉNÉRATION 3D - NIVEAU HIGH (Qualité maximale)\n');

const startHigh = performance.now();
const geometryHigh = GeometryService.generateBuilding3D(building, {
  levelOfDetail: 'high',
  showStructure: true,
  showCladding: true,
  showRoofing: true,
  showOpenings: true
});
const endHigh = performance.now();

console.log(`   Temps de génération: ${(endHigh - startHigh).toFixed(2)}ms`);
console.log(`   Qualité: Profils en I détaillés, poignées, croisillons`);
console.log(`   Recommandé: Présentations clients\n`);

// ========================================
// 5. Comparaison des niveaux
// ========================================
console.log('📊 5. COMPARAISON DES NIVEAUX\n');

console.log(`   Niveau    | Temps (ms) | Qualité`);
console.log(`   ──────────|────────────|─────────────────────`);
console.log(`   LOW       | ${(endLow - startLow).toFixed(2).padEnd(10)} | Boîtes simples`);
console.log(`   MEDIUM    | ${(endMedium - startMedium).toFixed(2).padEnd(10)} | Profils standard`);
console.log(`   HIGH      | ${(endHigh - startHigh).toFixed(2).padEnd(10)} | Profils détaillés\n`);

// ========================================
// 6. Génération avec contrôle visibilité
// ========================================
console.log('👁️  6. GÉNÉRATION AVEC CONTRÔLE VISIBILITÉ\n');

// Structure seule (squelette)
const structureOnly = GeometryService.generateBuilding3D(building, {
  levelOfDetail: 'medium',
  showStructure: true,
  showCladding: false,
  showRoofing: false,
  showOpenings: false
});

console.log(`   Structure seule:`);
console.log(`      - Groupes affichés: Structure`);
console.log(`      - Éléments: ${
  structureOnly.metadata.elementCounts.posts +
  structureOnly.metadata.elementCounts.rafters +
  structureOnly.metadata.elementCounts.purlins +
  structureOnly.metadata.elementCounts.rails
}`);

// Enveloppe seule (bardage + couverture)
const envelopeOnly = GeometryService.generateBuilding3D(building, {
  levelOfDetail: 'medium',
  showStructure: false,
  showCladding: true,
  showRoofing: true,
  showOpenings: true
});

console.log(`\n   Enveloppe seule:`);
console.log(`      - Groupes affichés: Bardage, Couverture, Ouvertures`);
console.log(`      - Panneaux: ${
  envelopeOnly.metadata.elementCounts.claddingPanels +
  envelopeOnly.metadata.elementCounts.roofingPanels
}`);
console.log(`      - Ouvertures: ${envelopeOnly.metadata.elementCounts.openings}\n`);

// ========================================
// 7. Hiérarchie de la scène
// ========================================
console.log('🌲 7. HIÉRARCHIE DE LA SCÈNE 3D\n');

console.log(`   ${geometryMedium.scene.name} (Group)`);
console.log(`   ├── ${geometryMedium.elements.structure.name} (Group)`);
console.log(`   │   ├── Posts (${building.structure.posts.length} meshes)`);
console.log(`   │   ├── Rafters (${building.structure.rafters.length} meshes)`);
console.log(`   │   ├── Purlins (${building.structure.purlins.length} meshes)`);
console.log(`   │   └── Rails (${building.structure.rails.length} meshes)`);
console.log(`   ├── ${geometryMedium.elements.cladding.name} (Group)`);
console.log(`   │   ├── Front Wall (mesh)`);
console.log(`   │   ├── Back Wall (mesh)`);
console.log(`   │   ├── Left Gable (mesh)`);
console.log(`   │   └── Right Gable (mesh)`);
console.log(`   ├── ${geometryMedium.elements.roofing.name} (Group)`);
console.log(`   │   └── Roof Panel (mesh)`);
console.log(`   └── ${geometryMedium.elements.openings.name} (Group)`);
console.log(`       ├── Door 1 (group)`);
console.log(`       ├── Door 2 (group)`);
console.log(`       └── Window 1 (group)\n`);

// ========================================
// 8. Métadonnées des éléments
// ========================================
console.log('📋 8. MÉTADONNÉES DES ÉLÉMENTS\n');

// Parcourir et afficher les métadonnées de quelques éléments
let count = 0;
geometryMedium.scene.traverse((object) => {
  if (object.userData && object.userData.elementType && count < 5) {
    console.log(`   ${object.userData.elementType}:`);
    if (object.userData.profile) {
      console.log(`      - Profil: ${object.userData.profile}`);
    }
    if (object.userData.length) {
      console.log(`      - Longueur: ${object.userData.length}mm`);
    }
    if (object.userData.weight) {
      console.log(`      - Poids: ${object.userData.weight.toFixed(1)}kg`);
    }
    if (object.userData.reference) {
      console.log(`      - Référence: ${object.userData.reference}`);
    }
    console.log('');
    count++;
  }
});

// ========================================
// Conclusion
// ========================================
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ✅ DÉMONSTRATION 3D TERMINÉE AVEC SUCCÈS                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📊 Résumé Sprint 2:');
console.log(`   • 6 générateurs 3D créés`);
console.log(`   • 3 niveaux de détail disponibles`);
console.log(`   • 54+ profils métalliques supportés`);
console.log(`   • 10+ couleurs RAL`);
console.log(`   • Hiérarchie de groupes organisée`);
console.log(`   • Métadonnées complètes sur chaque élément`);
console.log(`   • Contrôle visibilité par catégorie`);
console.log('');

console.log('🚀 Prochaines étapes:');
console.log('   1. Sprint 3: Interface utilisateur React');
console.log('   2. Sprint 4: Visualisation 3D interactive');
console.log('   3. Sprint 5: Export IFC\n');

console.log('💡 Utilisation dans Three.js:');
console.log('   ```typescript');
console.log('   const scene = new THREE.Scene();');
console.log('   const geometry = GeometryService.generateBuilding3D(building);');
console.log('   scene.add(geometry.scene);');
console.log('   ```\n');
