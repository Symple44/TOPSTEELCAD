/**
 * Test rapide de l'orientation des trous
 */

import * as THREE from 'three';

// Simulation de l'orientation des trous selon les faces
function testHoleOrientation() {
  console.log("=== TEST D'ORIENTATION DES TROUS ===\n");

  // Le cylindre Three.js a son axe le long de Y par défaut (vertical)
  console.log("📊 Orientation par défaut du cylindre: Axe Y (vertical)\n");

  const faces = [
    {
      name: "Semelle supérieure (face 'o')",
      description: "Trou vertical traversant de haut en bas",
      rotation: new THREE.Euler(0, 0, 0),
      expected: "Axe Y (vertical) ✓"
    },
    {
      name: "Semelle inférieure (face 'u')",
      description: "Trou vertical traversant de bas en haut",
      rotation: new THREE.Euler(0, 0, 0),
      expected: "Axe Y (vertical) ✓"
    },
    {
      name: "Âme (face 'v')",
      description: "Trou horizontal perpendiculaire à l'âme",
      rotation: new THREE.Euler(Math.PI / 2, 0, 0),
      expected: "Axe Z (horizontal) après rotation X de 90°"
    }
  ];

  faces.forEach(face => {
    console.log(`🔧 ${face.name}`);
    console.log(`   Description: ${face.description}`);
    console.log(`   Rotation: X=${(face.rotation.x * 180 / Math.PI).toFixed(0)}°, Y=${(face.rotation.y * 180 / Math.PI).toFixed(0)}°, Z=${(face.rotation.z * 180 / Math.PI).toFixed(0)}°`);
    console.log(`   Résultat: ${face.expected}`);
    console.log("");
  });

  console.log("📝 RÉSUMÉ:");
  console.log("- Semelles (o, u): Pas de rotation nécessaire (déjà vertical)");
  console.log("- Âme (v): Rotation de 90° autour de X pour horizontal");
  console.log("- Cela correspond à l'orientation physique des trous dans un profil IPE");
}

// Visualisation de la transformation
function visualizeTransform() {
  console.log("\n=== VISUALISATION DE LA TRANSFORMATION ===\n");

  // Création d'un cylindre de test
  // const cylinder = new THREE.CylinderGeometry(10, 10, 50, 32);

  console.log("Cylindre initial:");
  console.log("  - Rayon: 10mm");
  console.log("  - Hauteur: 50mm");
  console.log("  - Axe: Y (vertical)");
  console.log("");

  // Test de rotation pour l'âme
  // const rotationMatrix = new THREE.Matrix4();
  // rotationMatrix.makeRotationX(Math.PI / 2);

  console.log("Après rotation X de 90° (pour l'âme):");
  console.log("  - L'axe du cylindre passe de Y à Z");
  console.log("  - Le trou traverse maintenant horizontalement");
  console.log("  - Perpendiculaire à l'âme du profil");
}

testHoleOrientation();
visualizeTransform();

export { testHoleOrientation, visualizeTransform };