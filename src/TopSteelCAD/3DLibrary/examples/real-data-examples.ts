/**
 * Exemples concrets avec VRAIES données industrielles
 * Architecture Strategy/Factory Pattern - Production Ready
 */

import { ProfileDatabase } from '../database/ProfileDatabase';
import { UnifiedMaterialsDatabase } from '../database/UnifiedMaterialsDatabase';
import { DatabaseGeometryBridge } from '../integration/DatabaseGeometryBridge';
import { GeometryGeneratorFactory } from '../geometry-generators/GeometryGeneratorFactory';
import { ProfileType } from '../types/profile.types';
import { MaterialCategory } from '../types/material-types';

// ========================================
// 1. INITIALISATION AVEC LAZY LOADING
// ========================================

export async function initializeAndExplore() {
  console.log('🚀 Initialisation de la 3DLibrary...');
  
  // Les singletons s'initialisent automatiquement
  const profileDb = ProfileDatabase.getInstance();
  const materialDb = UnifiedMaterialsDatabase.getInstance();
  const bridge = new DatabaseGeometryBridge();
  
  // Statistiques de la base
  const stats = profileDb.getStatistics();
  console.log(`📊 Base de données ProfileDatabase:`);
  console.log(`   - ${stats.totalProfiles} profils chargés`);
  console.log(`   - ${stats.typeCount} types différents`);
  console.log(`   - Mémoire cache: ${stats.cacheSize}/${stats.maxCacheSize}`);
  
  // Explorer les types disponibles
  const types = profileDb.getAvailableTypes();
  console.log('🔧 Types de profils disponibles:', types);
  
  // Compter les profils par type
  for (const type of types) {
    const profiles = await profileDb.getProfilesByType(type);
    console.log(`   - ${type}: ${profiles.length} profils`);
  }
  
  return { profileDb, materialDb, bridge, stats };
}

// ========================================
// 2. CRÉATION AVEC STRATEGY/FACTORY
// ========================================

export async function demonstrateFactoryPattern() {
  console.log('\n🔨 Démonstration du Pattern Strategy/Factory:');
  console.log('=============================================');
  
  const bridge = new DatabaseGeometryBridge();
  const factory = new GeometryGeneratorFactory();
  
  // Test avec différents types de profils
  const testProfiles = [
    { name: 'IPE 300', type: 'I-Profile' },
    { name: 'HEA 200', type: 'I-Profile' },
    { name: 'UPN 160', type: 'U-Profile' },
    { name: 'L 100x100x10', type: 'L-Profile' },
    { name: 'RHS 100x50x3', type: 'Tube-Profile' }
  ];
  
  const results = [];
  
  for (const { name, type } of testProfiles) {
    console.log(`\n📐 Génération: ${name}`);
    
    const startTime = performance.now();
    const result = await bridge.generateFromDesignation(name, 6000);
    const totalTime = performance.now() - startTime;
    
    if (result) {
      console.log(`   ✅ Succès généré`); // console.log(`   ✅ Succès avec ${result.metadata.generator}`);
      console.log(`   ⏱️  Temps total: ${totalTime.toFixed(2)}ms`);
      console.log(`   📏 Vertices: ${result.metadata.vertexCount}`);
      console.log(`   ⚖️  Poids: ${result.metadata.weight.toFixed(2)} kg`);
      
      results.push({
        name,
        type,
        // generator: result.metadata.generator, // Propriété non disponible
        generated: true,
        time: totalTime,
        weight: result.metadata.weight,
        vertices: result.metadata.vertexCount
      });
    } else {
      console.log(`   ❌ Échec de génération`);
    }
  }
  
  // Statistiques globales
  const factoryStats = factory.getStatistics();
  console.log(`\n📊 Statistiques Factory:`);
  console.log(`   - Générateurs enregistrés: ${factoryStats.totalGenerators}`);
  console.log(`   - Types supportés: ${factoryStats.totalSupportedTypes}`);
  console.log(`   - Détails: ${factoryStats.generatorDetails.length} générateurs`);
  
  return results;
}

// ========================================
// 3. STRUCTURE COMPLÈTE AVEC VRAIES DONNÉES
// ========================================

export async function createIndustrialStructure() {
  console.log('\n🏗️ Création Structure Industrielle:');
  console.log('===================================');
  
  const bridge = new DatabaseGeometryBridge();
  const structure = {
    name: 'Bâtiment Industriel Type',
    elements: [] as any[],
    totalWeight: 0,
    bom: new Map<string, any>()
  };
  
  // Définition de la structure
  const structureDefinition = [
    // Colonnes principales
    { profile: 'HEB 300', quantity: 8, length: 8000, description: 'Colonnes principales' },
    
    // Poutres principales
    { profile: 'IPE 400', quantity: 4, length: 12000, description: 'Poutres de portique' },
    { profile: 'IPE 300', quantity: 6, length: 6000, description: 'Poutres secondaires' },
    
    // Pannes de toiture
    { profile: 'IPE 200', quantity: 20, length: 6000, description: 'Pannes de toiture' },
    
    // Contreventements
    { profile: 'L 80x80x8', quantity: 16, length: 4000, description: 'Contreventements' },
    
    // Lisses de bardage
    { profile: 'UPN 120', quantity: 24, length: 6000, description: 'Lisses de bardage' }
  ];
  
  // Génération de tous les éléments
  for (const item of structureDefinition) {
    console.log(`\n📦 Génération: ${item.quantity}x ${item.profile} (${item.description})`);
    
    const sampleElement = await bridge.generateFromDesignation(item.profile, item.length);
    
    if (sampleElement) {
      const unitWeight = sampleElement.metadata.weight;
      const totalWeight = unitWeight * item.quantity;
      const totalLength = (item.length / 1000) * item.quantity; // en mètres
      
      // Ajouter au BOM
      structure.bom.set(item.profile, {
        designation: item.profile,
        description: item.description,
        quantity: item.quantity,
        unitLength: item.length,
        totalLength: totalLength,
        unitWeight: unitWeight,
        totalWeight: totalWeight,
        profile: sampleElement.profile
      });
      
      structure.totalWeight += totalWeight;
      
      console.log(`   📏 Longueur unitaire: ${item.length}mm`);
      console.log(`   ⚖️  Poids unitaire: ${unitWeight.toFixed(2)} kg`);
      console.log(`   📊 Poids total: ${totalWeight.toFixed(2)} kg`);
      console.log(`   📐 Hauteur profil: ${sampleElement.profile?.dimensions.height}mm`);
      
      // Propriétés mécaniques
      if (sampleElement.profile?.inertia?.Iyy) {
        console.log(`   🔧 Inertie Iyy: ${sampleElement.profile.inertia.Iyy} cm⁴`);
      }
    }
  }
  
  return structure;
}

// ========================================
// 4. COMPARAISON PERFORMANCE PROFILS
// ========================================

export async function profilePerformanceComparison() {
  console.log('\n🏆 Comparaison Performance des Profils:');
  console.log('======================================');
  
  const profileDb = ProfileDatabase.getInstance();
  
  // Profils à comparer (même hauteur ~300mm)
  const testProfiles = ['IPE 300', 'HEA 280', 'HEB 300', 'HEM 300'];
  const comparison = [];
  
  for (const designation of testProfiles) {
    const profile = await profileDb.getProfile(designation);
    
    if (profile) {
      const efficiency = (profile.inertia?.Iyy || 0) / profile.weight; // Efficacité structurelle
      const slenderness = (profile.dimensions.height || 0) / (profile.dimensions.webThickness || 1);
      
      const data = {
        designation,
        height: profile.dimensions.height,
        width: profile.dimensions.width,
        weight: profile.weight,
        area: profile.area,
        inertiayy: profile.inertia?.Iyy || 0,
        wely: profile.elasticModulus?.Wely || 0,
        efficiency: efficiency,
        slenderness: slenderness,
        classification: profile.source
      };
      
      comparison.push(data);
      
      console.log(`\n${designation}:`);
      console.log(`   Dimensions: ${data.height}×${data.width} mm`);
      console.log(`   Poids: ${data.weight} kg/m`);
      console.log(`   Inertie Iyy: ${data.inertiayy} cm⁴`);
      console.log(`   Efficacité: ${data.efficiency.toFixed(2)} cm⁴/(kg/m)`);
      console.log(`   Élancement: ${data.slenderness.toFixed(1)}`);
    }
  }
  
  // Classement par efficacité
  comparison.sort((a, b) => b.efficiency - a.efficiency);
  
  console.log(`\n🥇 Classement par efficacité structurelle:`);
  comparison.forEach((profile, index) => {
    console.log(`   ${index + 1}. ${profile.designation} - ${profile.efficiency.toFixed(2)} cm⁴/(kg/m)`);
  });
  
  return comparison;
}

// ========================================
// 5. RECHERCHE AVANCÉE ET FILTRES
// ========================================

export async function advancedSearchExamples() {
  console.log('\n🔍 Exemples de Recherche Avancée:');
  console.log('=================================');
  
  const profileDb = ProfileDatabase.getInstance();
  
  // 1. Profils légers pour charpente légère
  console.log('\n1. Charpente légère (poids < 30 kg/m):');
  const lightProfiles = await profileDb.searchProfiles({
    maxWeight: 30,
    minHeight: 100
  });
  console.log(`   Trouvés: ${lightProfiles.length} profils`);
  lightProfiles.slice(0, 5).forEach(p => {
    console.log(`   - ${p.designation}: ${p.weight} kg/m, h=${p.dimensions.height}mm`);
  });
  
  // 2. Poutres principales (inertie élevée)
  console.log('\n2. Poutres principales (Iyy > 10000 cm⁴):');
  const heavyBeams = await profileDb.searchProfiles({
    minInertiaY: 10000
  });
  console.log(`   Trouvés: ${heavyBeams.length} profils`);
  heavyBeams.slice(0, 5).forEach(p => {
    console.log(`   - ${p.designation}: Iyy=${p.inertia?.Iyy} cm⁴, ${p.weight} kg/m`);
  });
  
  // 3. Profils économiques (bon rapport performance/poids)
  console.log('\n3. Profils économiques:');
  const allIPE = await profileDb.getProfilesByType(ProfileType.IPE);
  const economical = allIPE
    .map(p => ({
      ...p,
      efficiency: (p.inertia?.Iyy || 0) / p.weight
    }))
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 5);
    
  economical.forEach(p => {
    console.log(`   - ${p.designation}: Efficacité=${p.efficiency.toFixed(2)} cm⁴/(kg/m)`);
  });
  
  // 4. Profils pour contreventement
  console.log('\n4. Profils pour contreventement (cornières):');
  const angles = await profileDb.getProfilesByType(ProfileType.L_EQUAL);
  const bracingAngles = angles
    .filter(p => (p.dimensions.height || 0) <= 100 && p.weight <= 15)
    .slice(0, 5);
    
  bracingAngles.forEach(p => {
    console.log(`   - ${p.designation}: ${p.dimensions.height}×${p.dimensions.width}mm, ${p.weight} kg/m`);
  });
  
  return {
    lightProfiles: lightProfiles.length,
    heavyBeams: heavyBeams.length,
    economical: economical.length,
    bracingAngles: bracingAngles.length
  };
}

// ========================================
// 6. CALCULS STRUCTURELS RÉELS
// ========================================

export async function realStructuralCalculations() {
  console.log('\n🧮 Calculs Structurels Réels:');
  console.log('============================');
  
  const bridge = new DatabaseGeometryBridge();
  
  // Cas d'étude: Poutre IPE 300 portée 6m
  const beamSpan = 6000; // mm
  const designation = 'IPE 300';
  
  console.log(`\n📐 Étude: Poutre ${designation}, portée ${beamSpan}mm`);
  
  const result = await bridge.generateFromDesignation(designation, beamSpan);
  
  if (result && result.profile) {
    const profile = result.profile;
    
    // Propriétés de base
    const h = profile.dimensions.height; // mm
    const b = profile.dimensions.width; // mm
    const tw = profile.dimensions.webThickness || 0; // mm
    const tf = profile.dimensions.flangeThickness || 0; // mm
    const A = profile.area || 0; // cm²
    const Iyy = profile.inertia?.Iyy || 0; // cm⁴
    const Wely = profile.elasticModulus?.Wely || 0; // cm³
    const weight = profile.weight; // kg/m
    
    console.log(`\n🔧 Propriétés géométriques:`);
    console.log(`   Hauteur: ${h} mm`);
    console.log(`   Largeur: ${b} mm`);
    console.log(`   Épaisseur âme: ${tw} mm`);
    console.log(`   Épaisseur semelle: ${tf} mm`);
    console.log(`   Aire: ${A} cm²`);
    console.log(`   Inertie Iyy: ${Iyy} cm⁴`);
    console.log(`   Module élastique: ${Wely} cm³`);
    console.log(`   Poids: ${weight} kg/m`);
    
    // Calculs de résistance (S355)
    const fy = 355; // MPa
    const gamma_M0 = 1.0;
    const E = 210000; // MPa
    
    // Résistance à la flexion
    const Mrd = (Wely * fy / gamma_M0) / 1000; // kN.m
    const selfWeight = weight * 9.81 / 1000; // kN/m
    const maxMoment = selfWeight * beamSpan * beamSpan / 8 / 1000000; // kN.m (poids propre)
    
    console.log(`\n💪 Résistance:`);
    console.log(`   Moment résistant: ${Mrd.toFixed(2)} kN.m`);
    console.log(`   Moment poids propre: ${maxMoment.toFixed(3)} kN.m`);
    console.log(`   Taux d'utilisation: ${(maxMoment / Mrd * 100).toFixed(1)}%`);
    
    // Charge admissible
    const qAdm = 8 * Mrd * 1000 / (beamSpan * beamSpan) - selfWeight; // kN/m
    
    console.log(`   Charge admissible: ${qAdm.toFixed(2)} kN/m`);
    
    // Flèche
    const I_mm4 = Iyy * 10000; // mm⁴
    const deflectionSelf = 5 * selfWeight * 1000 * Math.pow(beamSpan, 4) / (384 * E * I_mm4); // mm
    const deflectionUnit = 5 * 1 * Math.pow(beamSpan, 4) / (384 * E * I_mm4); // mm pour 1 N/mm
    
    console.log(`\n📏 Déformations:`);
    console.log(`   Flèche poids propre: ${deflectionSelf.toFixed(2)} mm`);
    console.log(`   Flèche pour 1 kN/m: ${(deflectionUnit * 1000).toFixed(2)} mm`);
    console.log(`   Ratio L/f (1 kN/m): L/${(beamSpan / (deflectionUnit * 1000)).toFixed(0)}`);
    
    // Classification
    let classification = 'Classe 1'; // Simplification
    const slendernessRatio = (h || 0) / tw;
    if (slendernessRatio > 72 * Math.sqrt(235 / fy)) classification = 'Classe 4';
    else if (slendernessRatio > 42 * Math.sqrt(235 / fy)) classification = 'Classe 3';
    else if (slendernessRatio > 33 * Math.sqrt(235 / fy)) classification = 'Classe 2';
    
    console.log(`\n📋 Classification:`);
    console.log(`   Élancement âme: ${((h || 0) / tw).toFixed(1)}`);
    console.log(`   Classification: ${classification}`);
    
    return {
      profile: designation,
      span: beamSpan,
      momentResistance: Mrd,
      allowableLoad: qAdm,
      deflectionRatio: beamSpan / (deflectionUnit * 1000),
      classification,
      utilizationRatio: maxMoment / Mrd * 100
    };
  }
  
  return null;
}

// ========================================
// 7. GÉNÉRATION BILL OF MATERIALS
// ========================================

export async function generateDetailedBOM() {
  console.log('\n📋 Génération Bill of Materials Détaillé:');
  console.log('========================================');
  
  const structure = await createIndustrialStructure();
  const bom = Array.from(structure.bom.values());
  
  // Ajouter des colonnes calculées
  const detailedBOM = bom.map(item => {
    const profile = item.profile;
    const unitPrice = estimateUnitPrice(profile.weight); // €/tonne
    const totalPrice = (item.totalWeight / 1000) * unitPrice;
    
    return {
      ...item,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      paintingSurface: estimatePaintingSurface(profile, item.totalLength),
      cuttingTime: estimateCuttingTime(item.quantity),
    };
  });
  
  // Trier par poids total décroissant
  detailedBOM.sort((a, b) => b.totalWeight - a.totalWeight);
  
  console.log('\n📊 Bill of Materials Détaillé:');
  console.table(detailedBOM.map(item => ({
    'Désignation': item.designation,
    'Qté': item.quantity,
    'Long. unit (m)': (item.unitLength / 1000).toFixed(1),
    'Long. total (m)': item.totalLength.toFixed(1),
    'Poids unit (kg)': item.unitWeight.toFixed(1),
    'Poids total (kg)': item.totalWeight.toFixed(1),
    'Prix unitaire (€/t)': item.unitPrice,
    'Prix total (€)': item.totalPrice.toFixed(0),
  })));
  
  // Totaux
  const totals = detailedBOM.reduce((acc, item) => ({
    totalWeight: acc.totalWeight + item.totalWeight,
    totalPrice: acc.totalPrice + item.totalPrice,
    totalLength: acc.totalLength + item.totalLength,
    totalPaintingSurface: acc.totalPaintingSurface + item.paintingSurface
  }), { totalWeight: 0, totalPrice: 0, totalLength: 0, totalPaintingSurface: 0 });
  
  console.log(`\n💰 TOTAUX:`);
  console.log(`   Poids total: ${totals.totalWeight.toFixed(0)} kg (${(totals.totalWeight/1000).toFixed(1)} tonnes)`);
  console.log(`   Longueur totale: ${totals.totalLength.toFixed(0)} m`);
  console.log(`   Surface peinture: ${totals.totalPaintingSurface.toFixed(0)} m²`);
  console.log(`   Coût matière estimé: ${totals.totalPrice.toFixed(0)} € HT`);
  
  return detailedBOM;
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function estimateUnitPrice(weightPerMeter: number): number {
  // Estimation simplifiée basée sur le poids (€/tonne)
  if (weightPerMeter < 20) return 1200; // Profils légers
  if (weightPerMeter < 50) return 1100; // Profils moyens
  if (weightPerMeter < 100) return 1000; // Profils lourds
  return 950; // Très lourds (dégressif)
}

function estimatePaintingSurface(profile: any, totalLength: number): number {
  // Surface de peinture estimée (m²) basée sur le périmètre
  const h = profile.dimensions.height / 1000; // m
  const b = profile.dimensions.width / 1000; // m
  const perimeter = 2 * (h + b); // Approximation
  return perimeter * totalLength;
}

function estimateCuttingTime(quantity: number): number {
  // Temps de débit estimé (minutes)
  return quantity * 5; // 5 min par coupe (simplification)
}

// ========================================
// EXPORT PRINCIPAL
// ========================================

export default {
  initializeAndExplore,
  demonstrateFactoryPattern,
  createIndustrialStructure,
  profilePerformanceComparison,
  advancedSearchExamples,
  realStructuralCalculations,
  generateDetailedBOM
};