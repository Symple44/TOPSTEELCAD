// Test rapide pour vérifier la géométrie des cornières

import { convertPartElementToPivotElement } from './src/TopSteelCAD/part-builder/converters/partToPivot';
import { PartElement } from './src/TopSteelCAD/part-builder/types/partBuilder.types';
import { GeometryConverter } from './src/TopSteelCAD/viewer/GeometryConverter';

// Test 1: Cornière à ailes égales L100x100x10
const angleEqual: PartElement = {
  id: 'test-L-equal',
  name: 'L100x100x10',
  profileType: 'L',
  profileSubType: '100x100x10',
  length: 2000,
  dimensions: {
    width: 100,
    height: 100,
    thickness: 10
  }
};

// Test 2: Cornière à ailes inégales LA150x100x12
const angleUnequal: PartElement = {
  id: 'test-LA-unequal',
  name: 'LA150x100x12',
  profileType: 'LA',
  profileSubType: '150x100x12',
  length: 3000,
  dimensions: {
    width: 150,
    height: 100,
    thickness: 12
  }
};

console.log('\n=== TEST GÉOMÉTRIE DES CORNIÈRES ===\n');

// Convertir en PivotElement
const pivotEqual = convertPartElementToPivotElement(angleEqual);
const pivotUnequal = convertPartElementToPivotElement(angleUnequal);

console.log('📐 Cornière L égale (100x100x10):');
console.log('  Dimensions converties:', pivotEqual.dimensions);
console.log('  MaterialType:', pivotEqual.materialType);

console.log('\n📐 Cornière LA inégale (150x100x12):');
console.log('  Dimensions converties:', pivotUnequal.dimensions);
console.log('  MaterialType:', pivotUnequal.materialType);

// Créer la géométrie
const converter = new GeometryConverter();

console.log('\n🔍 Création de géométrie pour L100x100x10:');
const geomEqual = converter.createGeometry(pivotEqual);
console.log('  Vertices count:', geomEqual.attributes.position?.count || 0);

console.log('\n🔍 Création de géométrie pour LA150x100x12:');
const geomUnequal = converter.createGeometry(pivotUnequal);
console.log('  Vertices count:', geomUnequal.attributes.position?.count || 0);

// Vérifications
console.log('\n=== VÉRIFICATIONS ===\n');

const checks = {
  'Dimensions width correctes': 
    pivotEqual.dimensions.width === 100 && pivotUnequal.dimensions.width === 150,
  'Dimensions height correctes': 
    pivotEqual.dimensions.height === 100 && pivotUnequal.dimensions.height === 100,
  'Épaisseur correcte (L)': 
    pivotEqual.dimensions.thickness === 10 || 
    pivotEqual.dimensions.webThickness === 10 || 
    pivotEqual.dimensions.flangeThickness === 10,
  'Épaisseur correcte (LA)': 
    pivotUnequal.dimensions.thickness === 12 ||
    pivotUnequal.dimensions.webThickness === 12 ||
    pivotUnequal.dimensions.flangeThickness === 12,
  'MaterialType ANGLE': 
    pivotEqual.materialType === 'angle' && pivotUnequal.materialType === 'angle',
  'Géométrie créée (L)': 
    geomEqual && geomEqual.attributes.position?.count > 0,
  'Géométrie créée (LA)': 
    geomUnequal && geomUnequal.attributes.position?.count > 0
};

for (const [check, passed] of Object.entries(checks)) {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
}

console.log('\n=== CODE CREATEANGLEGEOMETRY ===\n');
console.log(`
Source: GeometryConverter.ts lignes 342-390

private createAngleGeometry(dimensions: any): THREE.BufferGeometry {
  const {
    length = 2000,
    width = 100,
    height = 100,
    webThickness = 10,
    flangeThickness = 10
  } = dimensions;

  // Utiliser l'épaisseur la plus pertinente
  const thickness = webThickness || flangeThickness || 10;

  // Créer la forme en L
  const shape = new THREE.Shape();

  // Dessiner le profil en L (vue de face)
  // Aile horizontale puis aile verticale
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, thickness);
  shape.lineTo(thickness, thickness);
  shape.lineTo(thickness, height);
  shape.lineTo(0, height);
  shape.closePath();

  // Extruder le long de la longueur
  const extrudeSettings = {
    depth: length,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Centrer et orienter correctement
  geometry.translate(-width/2, -height/2, -length/2);

  return geometry;
}
`);
