/**
 * Test minimal du TubeGenerator pour diagnostiquer le problème des 3 vertices
 */

console.log('🧪 Test minimal du TubeGenerator');

// Test simple avec Three.js pure
const THREE = require('three');

console.log('✅ Three.js importé');

// Test 1: Créer un Shape simple
console.log('\n🔸 Test 1: Créer un Shape rectangulaire simple');
const outerShape = new THREE.Shape();
outerShape.moveTo(-25.4, -25.4);  // width/2 = 50.8/2, height/2 = 50.8/2
outerShape.lineTo(25.4, -25.4);
outerShape.lineTo(25.4, 25.4);
outerShape.lineTo(-25.4, 25.4);
outerShape.lineTo(-25.4, -25.4);

console.log('✅ Outer shape créé');

// Test 2: Créer un hole pour le tube
console.log('\n🔸 Test 2: Créer un hole intérieur');
const innerW = 50.8 - 2 * 4.78;  // width - 2*thickness
const innerH = 50.8 - 2 * 4.78;  // height - 2*thickness
console.log('Inner dimensions:', { innerW, innerH });

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
    console.log('❌ Inner dimensions invalides:', { innerW, innerH });
}

// Test 3: Extruder la forme
console.log('\n🔸 Test 3: Créer ExtrudeGeometry');
const extrudeSettings = {
    depth: 2259.98,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
};

console.log('Extrude settings:', extrudeSettings);

try {
    const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    
    console.log('✅ ExtrudeGeometry créé avec succès!');
    console.log('📊 Géométrie résultante:', {
        vertices: geometry.attributes?.position?.count || 0,
        faces: geometry.index?.count ? geometry.index.count / 3 : 0,
        hasPosition: !!geometry.attributes?.position,
        hasIndex: !!geometry.index,
        type: geometry.constructor.name
    });
    
    // Test des attributs
    if (geometry.attributes.position) {
        console.log('📍 Position attribute:', {
            itemSize: geometry.attributes.position.itemSize,
            count: geometry.attributes.position.count,
            array: geometry.attributes.position.array?.constructor?.name || 'unknown'
        });
        
        // Afficher quelques vertices pour debug
        const positions = geometry.attributes.position.array;
        console.log('🔍 First 9 vertices (x,y,z):');
        for (let i = 0; i < Math.min(9, positions.length / 3); i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];
            console.log(`  Vertex ${i}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        }
    }
    
    // Vérifier les bounds
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
        console.log('📦 Bounding box:', {
            min: `(${geometry.boundingBox.min.x.toFixed(1)}, ${geometry.boundingBox.min.y.toFixed(1)}, ${geometry.boundingBox.min.z.toFixed(1)})`,
            max: `(${geometry.boundingBox.max.x.toFixed(1)}, ${geometry.boundingBox.max.y.toFixed(1)}, ${geometry.boundingBox.max.z.toFixed(1)})`
        });
    }
    
} catch (error) {
    console.error('❌ Erreur lors de la création de ExtrudeGeometry:', error.message);
    console.error('Stack:', error.stack);
}

console.log('\n🏁 Test terminé');