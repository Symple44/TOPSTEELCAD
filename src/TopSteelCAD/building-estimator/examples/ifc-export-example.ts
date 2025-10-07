/**
 * Exemple d'export IFC avec profils précis
 * Building Estimator - TopSteelCAD
 */

import { BuildingEngine } from '../core/BuildingEngine';
import { IFCExporter } from '../services/IFCExporter';
import { ProfileIFCMapper } from '../services/ProfileIFCMapper';
import { OpeningType, WallType } from '../types';

/**
 * Exemple d'export IFC complet
 */
export function exportBuildingToIFC() {
  // 1. Créer un bâtiment
  const building = BuildingEngine.createMonoPenteBuilding({
    name: 'Hangar Exemple 20x12m',
    dimensions: {
      length: 20000,
      width: 12000,
      heightWall: 6000,
      slope: 10
    },
    parameters: {
      postSpacing: 5000,
      purlinSpacing: 1500,
      railSpacing: 1200,
      postProfile: 'IPE 240',
      rafterProfile: 'IPE 200',
      purlinProfile: 'IPE 140',
      railProfile: 'UAP 80',
      steelGrade: 'S235',
      includeGutters: true,
      includeDownspouts: true
    },
    openings: [
      {
        id: 'door-1',
        type: OpeningType.DOOR,
        wall: WallType.FRONT,
        position: { x: 5000, z: 0 },
        dimensions: { width: 3000, height: 4000 },
        reference: 'P1'
      },
      {
        id: 'window-1',
        type: OpeningType.WINDOW,
        wall: WallType.FRONT,
        position: { x: 15000, z: 2000 },
        dimensions: { width: 2000, height: 1500 },
        reference: 'F1'
      }
    ],
    finishes: {
      cladding: {
        type: 'sandwich_80mm' as any,
        color: 'RAL 9002',
        thickness: 80
      },
      roofing: {
        type: 'sandwich_80mm' as any,
        color: 'RAL 7016',
        thickness: 80
      },
      trim: {
        color: 'RAL 9006'
      }
    }
  });

  // 2. Exporter en IFC
  const result = IFCExporter.exportBuilding(building, {
    projectName: 'Projet Hangar Industriel',
    projectDescription: 'Bâtiment métallique de 20x12m',
    siteName: 'Site de production',
    buildingName: 'Hangar Exemple',
    includeGeometry: true,
    includeMaterials: true,
    includeProperties: true,
    includeQuantities: true,
    geometryPrecision: 3
  });

  // 3. Résultat
  if (result.success) {
    console.log('✅ Export IFC réussi!');
    console.log(`📄 Fichier: ${result.fileName}`);
    console.log(`📊 Taille: ${(result.fileSize! / 1024).toFixed(2)} Ko`);
    console.log(`🏗️ Entités: ${result.entityCount}`);
    console.log(`📅 Date: ${result.metadata?.timestamp.toLocaleString()}`);
    console.log(`💻 Application: ${result.metadata?.application}`);

    // Afficher un extrait du contenu IFC
    if (result.ifcContent) {
      console.log('\n📋 Extrait du fichier IFC (100 premiers caractères):');
      console.log(result.ifcContent.substring(0, 100) + '...');
    }

    return result.ifcContent;
  } else {
    console.error('❌ Échec de l\'export IFC');
    console.error('Erreurs:', result.errors);
    return null;
  }
}

/**
 * Exemple simplifié
 */
export function quickIFCExport() {
  // Utiliser un template par défaut
  const building = BuildingEngine.createFromTemplate('default');

  // Export IFC basique
  const result = IFCExporter.exportBuilding(building);

  if (result.success) {
    console.log('Export IFC réussi:', result.fileName);
    return result.ifcContent;
  } else {
    console.error('Export IFC échoué:', result.errors);
    return null;
  }
}

/**
 * Teste le mapping des profils
 */
export function testProfileMapping() {
  console.log('\n🔍 Test du mapping des profils IFC\n');

  const testProfiles = [
    'IPE 200',
    'HEA 240',
    'HEB 300',
    'UPN 100',
    'UAP 80',
    'L 100x100x10',
    'RHS 200x100x8',
    'SHS 150x10',
    'CHS 114x5'
  ];

  testProfiles.forEach((profileName) => {
    const profileData = ProfileIFCMapper.getProfileDimensions(profileName);
    const ifcType = ProfileIFCMapper.getIFCProfileType(profileName);

    console.log(`📐 ${profileName}:`);
    console.log(`   Type IFC: ${ifcType}`);
    console.log(`   Type détecté: ${profileData.type}`);

    switch (profileData.type) {
      case 'I_SHAPE':
        console.log(`   Dimensions: H=${profileData.dimensions.overallDepth}mm, B=${profileData.dimensions.overallWidth}mm`);
        console.log(`   Épaisseurs: âme=${profileData.dimensions.webThickness}mm, semelle=${profileData.dimensions.flangeThickness}mm`);
        if (profileData.dimensions.filletRadius) {
          console.log(`   Congé: r=${profileData.dimensions.filletRadius}mm`);
        }
        break;

      case 'U_SHAPE':
        console.log(`   Dimensions: H=${profileData.dimensions.depth}mm, B=${profileData.dimensions.flangeWidth}mm`);
        console.log(`   Épaisseurs: âme=${profileData.dimensions.webThickness}mm, semelle=${profileData.dimensions.flangeThickness}mm`);
        break;

      case 'L_SHAPE':
        console.log(`   Dimensions: H=${profileData.dimensions.depth}mm, B=${profileData.dimensions.width}mm`);
        console.log(`   Épaisseur: ${profileData.dimensions.thickness}mm`);
        break;

      case 'RECTANGLE_HOLLOW':
        console.log(`   Dimensions: H=${profileData.dimensions.height}mm, B=${profileData.dimensions.width}mm`);
        console.log(`   Épaisseur paroi: ${profileData.dimensions.wallThickness}mm`);
        break;

      case 'CIRCLE_HOLLOW':
        console.log(`   Diamètre: ${profileData.dimensions.diameter}mm`);
        console.log(`   Épaisseur paroi: ${profileData.dimensions.wallThickness}mm`);
        break;
    }

    console.log('');
  });

  // Afficher les statistiques
  const supportedProfiles = ProfileIFCMapper.getSupportedProfiles();
  console.log(`📊 Total de profils supportés: ${supportedProfiles.length}`);
  console.log(`   - IPE: ${ProfileIFCMapper.getProfilesByType('IPE').length}`);
  console.log(`   - HEA: ${ProfileIFCMapper.getProfilesByType('HEA').length}`);
  console.log(`   - HEB: ${ProfileIFCMapper.getProfilesByType('HEB').length}`);
  console.log(`   - HEM: ${ProfileIFCMapper.getProfilesByType('HEM').length}`);
  console.log(`   - UPN: ${ProfileIFCMapper.getProfilesByType('UPN').length}`);
  console.log(`   - UAP: ${ProfileIFCMapper.getProfilesByType('UAP').length}`);
  console.log(`   - UPE: ${ProfileIFCMapper.getProfilesByType('UPE').length}`);
}

// Exécution des exemples (décommenter pour tester)
// exportBuildingToIFC();
// testProfileMapping();
