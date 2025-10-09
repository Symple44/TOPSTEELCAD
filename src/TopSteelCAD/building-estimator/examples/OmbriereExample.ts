/**
 * Exemple d'utilisation de l'Ombrière Photovoltaïque
 * Démontre la nouvelle architecture extensible
 * Building Estimator - TopSteelCAD
 */

import {
  BuildingFactory,
  BuildingType
} from '../core';
import {
  OmbriereBuilding,
  COMMON_SOLAR_PANELS,
  DEFAULT_OMBRIERE_CONFIG
} from '../types';

/**
 * Exemple 1: Créer une ombrière avec configuration par défaut
 */
export function createDefaultOmbriere(): OmbriereBuilding {
  console.log('=== EXEMPLE 1: Ombrière par défaut ===\n');

  const ombriere = BuildingFactory.create<OmbriereBuilding>({
    name: 'Ombrière Parking Entreprise',
    type: BuildingType.OMBRIERE,
    dimensions: DEFAULT_OMBRIERE_CONFIG.dimensions,
    solarArray: DEFAULT_OMBRIERE_CONFIG.solarArray,
    location: {
      latitude: 45.75, // Lyon, France
      longitude: 4.85,
      altitude: 200
    }
  });

  // Afficher résultats
  console.log(`✅ Ombrière créée: ${ombriere.name}`);
  console.log(`📐 Dimensions: ${ombriere.dimensions.length/1000}m x ${ombriere.dimensions.width/1000}m`);
  console.log(`🚗 Places de parking: ${ombriere.parkingLayout?.numberOfSpaces}`);
  console.log(`☀️ Panneaux solaires: ${ombriere.structure.solarPanels.length}`);
  console.log(`⚡ Puissance installée: ${ombriere.electricalDesign.totalPower.toFixed(1)} kWc`);
  console.log(`🔋 Production annuelle: ${ombriere.performance?.annualProduction.toFixed(0)} kWh/an`);
  console.log(`🌱 Économie CO2: ${ombriere.performance?.carbonOffset.toFixed(1)} tonnes/an`);
  console.log(`🏗️ Poids acier: ${ombriere.structure.posts.reduce((sum, p) => sum + p.weight, 0).toFixed(0)} kg\n`);

  return ombriere;
}

/**
 * Exemple 2: Créer une ombrière personnalisée
 */
export function createCustomOmbriere(): OmbriereBuilding {
  console.log('=== EXEMPLE 2: Ombrière personnalisée ===\n');

  // Configuration pour 40 places de parking
  const ombriere = BuildingFactory.create<OmbriereBuilding>({
    name: 'Grande Ombrière Centre Commercial',
    type: BuildingType.OMBRIERE,
    dimensions: {
      length: 100000,        // 100m (20 places x 5m)
      width: 25000,          // 25m (5 rangées x 5m)
      clearHeight: 2800,     // 2.8m de hauteur libre
      slope: 0,
      tilt: 20,              // 20° d'inclinaison optimale
      numberOfParkingSpaces: 100,
      parkingSpaceWidth: 2500,
      parkingSpaceLength: 5000
    },
    parameters: {
      postSpacing: 5000,
      purlinSpacing: 2500,
      railSpacing: 0,
      postProfile: 'IPE 300',      // Profils renforcés
      rafterProfile: 'IPE 240',
      purlinProfile: 'IPE 160',
      railProfile: 'UAP 80',
      steelGrade: 'S355',          // Acier haute résistance
      includeGutters: false,
      includeDownspouts: false
    },
    solarArray: {
      panel: COMMON_SOLAR_PANELS['trina-600w'],  // Panneaux plus puissants
      orientation: 'landscape',
      rows: 5,
      columns: 40,
      rowSpacing: 100,
      columnSpacing: 50,
      tilt: 20,
      azimuth: 180,            // Plein sud
      antiReflectiveCoating: true,
      hailResistance: true
    },
    location: {
      latitude: 43.30,         // Marseille (Sud de la France)
      longitude: 5.40,
      altitude: 50
    },
    metadata: {
      author: 'Bureau d\'études XYZ',
      project: 'Centre Commercial Méditerranée',
      notes: 'Ombrière parking extérieur - Zone ventée'
    }
  });

  // Afficher résultats détaillés
  console.log(`✅ Ombrière créée: ${ombriere.name}`);
  console.log('\n📐 DIMENSIONS:');
  console.log(`  - Longueur: ${ombriere.dimensions.length/1000}m`);
  console.log(`  - Largeur: ${ombriere.dimensions.width/1000}m`);
  console.log(`  - Hauteur libre: ${ombriere.dimensions.clearHeight/1000}m`);
  console.log(`  - Inclinaison panneaux: ${ombriere.dimensions.tilt}°`);

  console.log('\n🚗 PARKING:');
  console.log(`  - Nombre de places: ${ombriere.parkingLayout?.numberOfSpaces}`);
  console.log(`  - Surface parking: ${ombriere.parkingLayout?.totalArea.toFixed(0)} m²`);

  console.log('\n☀️ SYSTÈME SOLAIRE:');
  console.log(`  - Nombre de panneaux: ${ombriere.structure.solarPanels.length}`);
  console.log(`  - Modèle: ${ombriere.solarArray.panel.manufacturer} ${ombriere.solarArray.panel.model}`);
  console.log(`  - Puissance unitaire: ${ombriere.solarArray.panel.power}Wc`);
  console.log(`  - Puissance totale: ${ombriere.electricalDesign.totalPower.toFixed(1)} kWc`);
  console.log(`  - Surface panneaux: ${(ombriere.structure.solarPanels.length * ombriere.solarArray.panel.width * ombriere.solarArray.panel.height / 1e6).toFixed(1)} m²`);

  console.log('\n⚡ ÉLECTRIQUE:');
  console.log(`  - Nombre d\'onduleurs: ${ombriere.structure.inverters.length}`);
  console.log(`  - Puissance onduleurs: ${ombriere.structure.inverters[0]?.power}kW chacun`);
  console.log(`  - Système de terre: ${ombriere.electricalDesign.earthingSystem}`);

  console.log('\n🔋 PERFORMANCE:');
  console.log(`  - Production annuelle: ${ombriere.performance?.annualProduction.toFixed(0)} kWh/an`);
  console.log(`  - Production spécifique: ${ombriere.performance?.specificProduction.toFixed(0)} kWh/kWc/an`);
  console.log(`  - Performance Ratio: ${(ombriere.performance?.performanceRatio! * 100).toFixed(0)}%`);
  console.log(`  - Économie CO2: ${ombriere.performance?.carbonOffset.toFixed(1)} tonnes/an`);

  console.log('\n🏗️ STRUCTURE:');
  console.log(`  - Nombre de poteaux: ${ombriere.structure.posts.length}`);
  console.log(`  - Nombre de poutres: ${ombriere.structure.beams.length}`);
  console.log(`  - Nombre de pannes: ${ombriere.structure.purlins.length}`);
  console.log(`  - Contreventement: ${ombriere.structure.bracing.length} éléments`);

  const totalWeight =
    ombriere.structure.posts.reduce((sum, p) => sum + p.weight, 0) +
    ombriere.structure.beams.reduce((sum, b) => sum + b.weight, 0) +
    ombriere.structure.purlins.reduce((sum, p) => sum + p.weight, 0) +
    ombriere.structure.bracing.reduce((sum, b) => sum + b.weight, 0);
  console.log(`  - Poids acier total: ${totalWeight.toFixed(0)} kg`);

  const solarWeight = ombriere.structure.solarPanels.length * ombriere.solarArray.panel.weight;
  console.log(`  - Poids panneaux: ${solarWeight.toFixed(0)} kg`);
  console.log(`  - Poids total: ${(totalWeight + solarWeight).toFixed(0)} kg\n`);

  return ombriere;
}

/**
 * Exemple 3: Créer une petite ombrière résidentielle
 */
export function createResidentialOmbriere(): OmbriereBuilding {
  console.log('=== EXEMPLE 3: Petite ombrière résidentielle ===\n');

  const ombriere = BuildingFactory.create<OmbriereBuilding>({
    name: 'Ombrière Maison Individuelle',
    type: BuildingType.OMBRIERE,
    dimensions: {
      length: 10000,         // 10m (2 places)
      width: 5000,           // 5m (1 rangée)
      clearHeight: 2300,     // 2.3m
      slope: 0,
      tilt: 15,              // 15°
      numberOfParkingSpaces: 2,
      parkingSpaceWidth: 2500,
      parkingSpaceLength: 5000
    },
    solarArray: {
      panel: COMMON_SOLAR_PANELS['longi-540w'],
      orientation: 'landscape',
      rows: 2,
      columns: 4,
      rowSpacing: 100,
      columnSpacing: 50,
      tilt: 15,
      azimuth: 180,
      antiReflectiveCoating: true,
      hailResistance: true
    },
    location: {
      latitude: 48.85,       // Paris
      longitude: 2.35,
      altitude: 100
    }
  });

  console.log(`✅ ${ombriere.name}`);
  console.log(`🚗 Places: ${ombriere.parkingLayout?.numberOfSpaces}`);
  console.log(`☀️ Panneaux: ${ombriere.structure.solarPanels.length}`);
  console.log(`⚡ Puissance: ${ombriere.electricalDesign.totalPower.toFixed(1)} kWc`);
  console.log(`🔋 Production: ${ombriere.performance?.annualProduction.toFixed(0)} kWh/an`);
  console.log(`💡 Autoconsommation estimée: 70-80%`);
  console.log(`💰 Économie annuelle: ~${(ombriere.performance?.annualProduction! * 0.7 * 0.20).toFixed(0)} €/an\n`);

  return ombriere;
}

/**
 * Exemple 4: Comparer différentes configurations
 */
export function compareConfigurations(): void {
  console.log('=== EXEMPLE 4: Comparaison configurations ===\n');

  const configs = [
    { name: 'Résidentielle', tilt: 15, rows: 2, columns: 4 },
    { name: 'PME', tilt: 20, rows: 4, columns: 20 },
    { name: 'Industrielle', tilt: 25, rows: 10, columns: 40 }
  ];

  console.log('Configuration  | Places | Panneaux | Puissance | Production/an');
  console.log('---------------|--------|----------|-----------|---------------');

  configs.forEach(config => {
    const ombriere = BuildingFactory.create<OmbriereBuilding>({
      name: `Ombrière ${config.name}`,
      type: BuildingType.OMBRIERE,
      dimensions: {
        length: config.columns * 2500,
        width: config.rows * 5000,
        clearHeight: 2500,
        slope: 0,
        tilt: config.tilt,
        numberOfParkingSpaces: config.rows * config.columns / 2,
        parkingSpaceWidth: 2500,
        parkingSpaceLength: 5000
      },
      solarArray: {
        panel: COMMON_SOLAR_PANELS['longi-540w'],
        orientation: 'landscape',
        rows: config.rows,
        columns: config.columns,
        rowSpacing: 100,
        columnSpacing: 50,
        tilt: config.tilt,
        azimuth: 180,
        antiReflectiveCoating: true,
        hailResistance: true
      }
    });

    const places = ombriere.parkingLayout?.numberOfSpaces || 0;
    const panneaux = ombriere.structure.solarPanels.length;
    const puissance = ombriere.electricalDesign.totalPower.toFixed(0);
    const production = (ombriere.performance?.annualProduction! / 1000).toFixed(0);

    console.log(
      `${config.name.padEnd(14)} | ${String(places).padStart(6)} | ` +
      `${String(panneaux).padStart(8)} | ${String(puissance).padStart(7)}kWc | ` +
      `${String(production).padStart(10)}MWh`
    );
  });

  console.log('');
}

/**
 * Fonction principale pour exécuter tous les exemples
 */
export function runAllExamples(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   EXEMPLES OMBRIÈRE PHOTOVOLTAÏQUE - POC PHASE 1         ║');
  console.log('║   Architecture Extensible - Building Estimator            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Exemple 1: Configuration par défaut
    createDefaultOmbriere();

    console.log('-----------------------------------------------------------\n');

    // Exemple 2: Configuration personnalisée
    createCustomOmbriere();

    console.log('-----------------------------------------------------------\n');

    // Exemple 3: Résidentiel
    createResidentialOmbriere();

    console.log('-----------------------------------------------------------\n');

    // Exemple 4: Comparaison
    compareConfigurations();

    console.log('✅ Tous les exemples exécutés avec succès !');
    console.log('\n💡 La nouvelle architecture permet de créer facilement');
    console.log('   de nouveaux types de structures sans modifier le code existant.\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des exemples:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Exécuter les exemples si ce fichier est lancé directement
if (require.main === module) {
  runAllExamples();
}
