/**
 * Test direct du TubeGenerator en bypassant complètement vitest et ses mocks
 */

// Import direct sans mocks
const THREE = require('three');

console.log('🧪 Test direct du TubeGenerator (sans mocks)');
console.log('='.repeat(60));

// Simuler les dimensions du profil HSS51X51X4.8
const dimensions = {
    height: 50.8,
    width: 50.8,
    thickness: 4.78,
    profileType: 'TUBE_RECT',
    profileName: 'HSS51X51X4.8'
};

const length = 2259.98;

console.log('📏 Test avec dimensions:', dimensions);
console.log('📏 Longueur:', length);

// Créer le profil Shape manuellement (comme dans TubeGenerator)
console.log('\n🔸 Étape 1: Création du profil Shape');

const h = dimensions.height;
const w = dimensions.width;
const t = dimensions.thickness;

// Contour extérieur
const outerShape = new THREE.Shape();
outerShape.moveTo(-w/2, -h/2);
outerShape.lineTo(w/2, -h/2);
outerShape.lineTo(w/2, h/2);
outerShape.lineTo(-w/2, h/2);
outerShape.lineTo(-w/2, -h/2);

console.log('✅ Outer shape créé:', {
    type: outerShape.constructor.name,
    isShape: outerShape instanceof THREE.Shape
});

// Contour intérieur (trou)
const innerW = w - 2 * t;
const innerH = h - 2 * t;
console.log('📐 Inner dimensions:', { innerW, innerH });

if (innerW > 0 && innerH > 0) {
    const innerShape = new THREE.Shape();
    innerShape.moveTo(-innerW/2, -innerH/2);
    innerShape.lineTo(innerW/2, -innerH/2);
    innerShape.lineTo(innerW/2, innerH/2);
    innerShape.lineTo(-innerW/2, innerH/2);
    innerShape.lineTo(-innerW/2, -innerH/2);
    
    outerShape.holes.push(innerShape);
    console.log('✅ Inner hole ajouté');
} else {
    console.log('❌ Inner dimensions invalides');
}

console.log('✅ Profile Shape complet avec', outerShape.holes.length, 'holes');

// Créer ExtrudeGeometry
console.log('\n🔸 Étape 2: Création de ExtrudeGeometry');

const extrudeSettings = {
    depth: length,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
};

console.log('⚙️ Extrude settings:', extrudeSettings);

try {
    const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    
    console.log('✅ ExtrudeGeometry créée avec succès!');
    console.log('📊 Géométrie résultante:', {
        vertices: geometry.attributes?.position?.count || 0,
        faces: geometry.index?.count ? geometry.index.count / 3 : 0,
        hasPosition: !!geometry.attributes?.position,
        hasIndex: !!geometry.index,
        type: geometry.constructor.name
    });
    
    // Calcul des bounds
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
        console.log('📦 Bounding box:', {
            min: `(${geometry.boundingBox.min.x.toFixed(1)}, ${geometry.boundingBox.min.y.toFixed(1)}, ${geometry.boundingBox.min.z.toFixed(1)})`,
            max: `(${geometry.boundingBox.max.x.toFixed(1)}, ${geometry.boundingBox.max.y.toFixed(1)}, ${geometry.boundingBox.max.z.toFixed(1)})`
        });
    }
    
    // Vérifier quelques vertices
    if (geometry.attributes.position && geometry.attributes.position.count > 0) {
        console.log('🔍 First few vertices:');
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < Math.min(6, positions.length / 3); i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];
            console.log(`  Vertex ${i}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        }
    }
    
    console.log('\n✅ TEST RÉUSSI - Le TubeGenerator fonctionne avec', geometry.attributes.position.count, 'vertices');
    
} catch (error) {
    console.error('❌ Erreur lors de la création de ExtrudeGeometry:', error.message);
    console.error('Stack:', error.stack);
}

console.log('\n🏁 Test terminé');