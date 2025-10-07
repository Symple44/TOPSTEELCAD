/**
 * Script de démonstration du Building Estimator
 * Exécuter avec: npx ts-node src/TopSteelCAD/building-estimator/demo.ts
 */

import { BuildingEngine, FrameCalculator, NomenclatureBuilder } from './core';
import { OpeningType, WallType } from './types';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Building Estimator - Démonstration MVP Sprint 1          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ========================================
// 1. Créer un bâtiment depuis template
// ========================================
console.log('📐 1. CRÉATION BÂTIMENT DEPUIS TEMPLATE\n');

const building = BuildingEngine.createFromTemplate('default');

console.log(`✅ Bâtiment créé: ${building.name}`);
console.log(`   ID: ${building.id}`);
console.log(`   Type: ${building.type}`);
console.log(`   Créé le: ${building.createdAt.toLocaleString()}\n`);

// ========================================
// 2. Afficher les dimensions
// ========================================
console.log('📏 2. DIMENSIONS\n');

console.log(`   Longueur:     ${building.dimensions.length / 1000}m`);
console.log(`   Largeur:      ${building.dimensions.width / 1000}m`);
console.log(`   Hauteur mur:  ${building.dimensions.heightWall / 1000}m`);
console.log(`   Pente:        ${building.dimensions.slope}%`);

const heightRidge = FrameCalculator.calculateHeightRidge(
  building.dimensions.heightWall,
  building.dimensions.width,
  building.dimensions.slope
);
console.log(`   Hauteur faîtage: ${heightRidge / 1000}m (calculée)\n`);

// ========================================
// 3. Afficher la structure générée
// ========================================
console.log('🏗️  3. STRUCTURE GÉNÉRÉE\n');

console.log(`   Poteaux:       ${building.structure.posts.length} pcs`);
console.log(`   Arbalétriers:  ${building.structure.rafters.length} pcs`);
console.log(`   Pannes:        ${building.structure.purlins.length} pcs`);
console.log(`   Lisses:        ${building.structure.rails.length} pcs`);
console.log(`   Total éléments: ${
  building.structure.posts.length +
  building.structure.rafters.length +
  building.structure.purlins.length +
  building.structure.rails.length
} pcs\n`);

// ========================================
// 4. Calculs détaillés
// ========================================
console.log('🔢 4. CALCULS DÉTAILLÉS\n');

const calculations = FrameCalculator.calculateMonoPenteFrame(
  building.dimensions,
  building.parameters,
  building.openings
);

console.log('   Éléments:');
console.log(`      Poteaux:    ${calculations.postCount} pcs`);
console.log(`      Arbalétriers: ${calculations.rafterCount} pcs`);
console.log(`      Pannes:     ${calculations.purlinCount} pcs`);
console.log(`      Lisses:     ${calculations.railCount} pcs\n`);

console.log('   Longueurs totales:');
console.log(
  `      Poteaux:    ${(calculations.totalPostLength / 1000).toFixed(1)}m`
);
console.log(
  `      Arbalétriers: ${(calculations.totalRafterLength / 1000).toFixed(1)}m`
);
console.log(
  `      Pannes:     ${(calculations.totalPurlinLength / 1000).toFixed(1)}m`
);
console.log(
  `      Lisses:     ${(calculations.totalRailLength / 1000).toFixed(1)}m\n`
);

console.log('   Surfaces:');
console.log(
  `      Bardage brut:  ${calculations.totalCladdingArea.toFixed(2)} m²`
);
console.log(
  `      Bardage net:   ${calculations.netCladdingArea.toFixed(2)} m²`
);
console.log(
  `      Couverture:    ${calculations.totalRoofingArea.toFixed(2)} m²\n`
);

// ========================================
// 5. Ajouter des ouvertures
// ========================================
console.log('🚪 5. AJOUT DOUVERTURES\n');

const updatedBuilding = BuildingEngine.updateBuilding(building, {
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
    },
    {
      id: 'window-2',
      type: OpeningType.WINDOW,
      wall: WallType.FRONT,
      position: { x: 15000, z: 2000 },
      dimensions: { width: 1500, height: 1200 },
      reference: 'F2'
    }
  ]
});

console.log(`   ✅ ${updatedBuilding.openings.length} ouvertures ajoutées`);
for (const opening of updatedBuilding.openings) {
  console.log(
    `      ${opening.reference} - ${opening.type} (${opening.dimensions.width}x${opening.dimensions.height}mm)`
  );
}
console.log('');

// ========================================
// 6. Générer la nomenclature
// ========================================
console.log('📋 6. NOMENCLATURE\n');

const nomenclature = NomenclatureBuilder.buildFromBuilding(updatedBuilding);

console.log(`   Bâtiment: ${nomenclature.buildingName}`);
console.log(`   Généré le: ${nomenclature.generatedAt.toLocaleString()}\n`);

console.log('   OSSATURE PRINCIPALE:');
for (const item of nomenclature.sections.mainFrame.items) {
  console.log(
    `      ${item.ref} - ${item.designation}: ${item.quantity} pcs × ${(item.unitLength! / 1000).toFixed(1)}m = ${item.totalWeight?.toFixed(0)} kg`
  );
}
console.log(
  `      Sous-total: ${nomenclature.sections.mainFrame.subtotals?.totalWeight?.toFixed(0)} kg\n`
);

console.log('   OSSATURE SECONDAIRE:');
for (const item of nomenclature.sections.secondaryFrame.items) {
  console.log(
    `      ${item.ref} - ${item.designation}: ${item.quantity} pcs × ${(item.unitLength! / 1000).toFixed(1)}m = ${item.totalWeight?.toFixed(0)} kg`
  );
}
console.log(
  `      Sous-total: ${nomenclature.sections.secondaryFrame.subtotals?.totalWeight?.toFixed(0)} kg\n`
);

console.log('   BARDAGE:');
for (const item of nomenclature.sections.cladding.items) {
  console.log(
    `      ${item.ref} - ${item.designation}: ${item.quantity} ${item.unit}`
  );
}
console.log('');

console.log('   COUVERTURE:');
for (const item of nomenclature.sections.roofing.items) {
  console.log(
    `      ${item.ref} - ${item.designation}: ${item.quantity} ${item.unit}`
  );
}
console.log('');

console.log('   OUVERTURES:');
for (const item of nomenclature.sections.openings.items) {
  console.log(
    `      ${item.ref} - ${item.designation}: ${item.quantity} ${item.unit}`
  );
}
console.log('');

// ========================================
// 7. Totaux
// ========================================
console.log('💰 7. TOTAUX\n');

console.log('   Acier:');
console.log(
  `      Ossature principale:  ${nomenclature.totals.mainFrameWeight.toFixed(0)} kg`
);
console.log(
  `      Ossature secondaire:  ${nomenclature.totals.secondaryFrameWeight.toFixed(0)} kg`
);
console.log(
  `      ─────────────────────────────────────`
);
console.log(
  `      TOTAL ACIER:          ${nomenclature.totals.totalSteelWeight.toFixed(0)} kg\n`
);

console.log('   Surfaces:');
console.log(
  `      Bardage total:        ${nomenclature.totals.totalCladdingArea.toFixed(2)} m²`
);
console.log(
  `      Bardage net:          ${nomenclature.totals.netCladdingArea.toFixed(2)} m²`
);
console.log(
  `      Ouvertures:           ${nomenclature.totals.totalOpeningArea.toFixed(2)} m²`
);
console.log(
  `      Couverture:           ${nomenclature.totals.netRoofingArea.toFixed(2)} m²\n`
);

console.log('   Ouvertures:');
console.log(`      Portes:               ${nomenclature.totals.doorCount}`);
console.log(`      Fenêtres:             ${nomenclature.totals.windowCount}\n`);

// ========================================
// 8. Export CSV
// ========================================
console.log('📤 8. EXPORT CSV\n');

const csv = NomenclatureBuilder.exportToCSV(nomenclature);
console.log('   ✅ Nomenclature exportée en CSV');
console.log(`   Taille: ${csv.length} caractères`);
console.log(`   Lignes: ${csv.split('\n').length}\n`);

// Afficher un aperçu
console.log('   Aperçu (10 premières lignes):');
const lines = csv.split('\n').slice(0, 10);
for (const line of lines) {
  console.log(`      ${line}`);
}
console.log('      ...\n');

// ========================================
// 9. Validation
// ========================================
console.log('✔️  9. VALIDATION\n');

const validation = BuildingEngine.validateBuilding(updatedBuilding);

console.log(`   Statut: ${validation.isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
if (validation.errors.length > 0) {
  console.log('   Erreurs:');
  for (const error of validation.errors) {
    console.log(`      ❌ ${error}`);
  }
}
if (validation.warnings.length > 0) {
  console.log('   Avertissements:');
  for (const warning of validation.warnings) {
    console.log(`      ⚠️  ${warning}`);
  }
}
console.log('');

// ========================================
// Conclusion
// ========================================
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ✅ DÉMONSTRATION TERMINÉE AVEC SUCCÈS                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📊 Résumé:');
console.log(`   • Bâtiment créé: ${updatedBuilding.name}`);
console.log(
  `   • Dimensions: ${updatedBuilding.dimensions.length / 1000}x${updatedBuilding.dimensions.width / 1000}m`
);
console.log(
  `   • Éléments structurels: ${
    updatedBuilding.structure.posts.length +
    updatedBuilding.structure.rafters.length +
    updatedBuilding.structure.purlins.length +
    updatedBuilding.structure.rails.length
  } pcs`
);
console.log(`   • Ouvertures: ${updatedBuilding.openings.length}`);
console.log(
  `   • Poids acier: ${nomenclature.totals.totalSteelWeight.toFixed(0)} kg`
);
console.log(
  `   • Surface bardage: ${nomenclature.totals.netCladdingArea.toFixed(2)} m²`
);
console.log(
  `   • Surface couverture: ${nomenclature.totals.netRoofingArea.toFixed(2)} m²`
);
console.log('');

console.log('🚀 Prochaines étapes:');
console.log('   1. Sprint 2: Générateurs 3D');
console.log('   2. Sprint 3: Interface utilisateur');
console.log('   3. Sprint 4: Visualisation 3D');
console.log('   4. Sprint 5: Export IFC\n');
