/**
 * Script de debug pour le pipeline de géométrie DSTV
 * Teste spécifiquement la création et l'application de features sur la géométrie
 */

const fs = require('fs');

// Test direct du TubeGenerator
async function testTubeGenerator() {
    console.log('\n🧪 Test direct du TubeGenerator');
    console.log('='.repeat(50));
    
    try {
        // Import du module TubeGenerator
        const { TubeGenerator } = await import('./src/TopSteelCAD/3DLibrary/geometry-generators/generators/TubeGenerator.js');
        
        const generator = new TubeGenerator();
        console.log('✅ TubeGenerator créé:', generator.getName());
        
        // Dimensions du tube HSS51X51X4.8
        const dimensions = {
            height: 50.8,
            width: 50.8,
            thickness: 4.78
        };
        const length = 2259.98;
        
        console.log('📏 Dimensions:', dimensions, 'Length:', length);
        
        const geometry = generator.generate(dimensions, length);
        console.log('✅ Géométrie générée:');
        console.log('  - Vertices:', geometry.attributes.position?.count || 0);
        console.log('  - Faces:', geometry.index?.count ? geometry.index.count / 3 : 0);
        console.log('  - BoundingBox:', geometry.boundingBox ? 
            `min(${geometry.boundingBox.min.x.toFixed(1)}, ${geometry.boundingBox.min.y.toFixed(1)}, ${geometry.boundingBox.min.z.toFixed(1)}) max(${geometry.boundingBox.max.x.toFixed(1)}, ${geometry.boundingBox.max.y.toFixed(1)}, ${geometry.boundingBox.max.z.toFixed(1)})` : 
            'null - calculating...');
        
        // Calculer manuellement si pas de boundingBox
        if (!geometry.boundingBox) {
            geometry.computeBoundingBox();
            console.log('  - BoundingBox (calculated):', 
                `min(${geometry.boundingBox.min.x.toFixed(1)}, ${geometry.boundingBox.min.y.toFixed(1)}, ${geometry.boundingBox.min.z.toFixed(1)}) max(${geometry.boundingBox.max.x.toFixed(1)}, ${geometry.boundingBox.max.y.toFixed(1)}, ${geometry.boundingBox.max.z.toFixed(1)})`);
        }
        
        return geometry;
        
    } catch (error) {
        console.error('❌ Erreur dans testTubeGenerator:', error.message);
        console.error('Stack:', error.stack);
        return null;
    }
}

// Test direct de l'application d'une feature de type END_CUT
async function testEndCutFeature(baseGeometry) {
    if (!baseGeometry) return null;
    
    console.log('\n🔧 Test application END_CUT feature');
    console.log('='.repeat(50));
    
    try {
        // Import des modules nécessaires
        const { FeatureProcessorFactory } = await import('./src/TopSteelCAD/core/features/processors/FeatureProcessorFactory.js');
        const { FeatureType, CoordinateSystem } = await import('./src/TopSteelCAD/core/features/types.js');
        const THREE = await import('three');
        
        console.log('✅ Modules importés');
        
        const factory = FeatureProcessorFactory.getInstance();
        console.log('✅ Factory obtenue');
        
        // Créer une feature END_CUT simple
        const endCutFeature = {
            type: FeatureType.END_CUT,
            id: 'debug_end_cut_start',
            position: new THREE.Vector3(0, 0, 0), // Au début du tube
            rotation: new THREE.Euler(0, 0, 0),
            coordinateSystem: CoordinateSystem.STANDARD,
            parameters: {
                position: 0,
                chamferLength: 14.2,
                chamferHeight: 7.1,
                face: 'web'
            }
        };
        
        // Élément temporaire pour le processeur
        const tempElement = {
            id: 'debug_tube',
            name: 'Debug HSS Tube',
            dimensions: {
                length: 2259.98,
                width: 50.8,
                height: 50.8,
                thickness: 4.78
            },
            metadata: {
                profileType: 'TUBE_RECT',
                profileName: 'HSS51X51X4.8'
            }
        };
        
        console.log('🔧 Feature créée:', endCutFeature.type, endCutFeature.id);
        console.log('📦 Element créé:', tempElement.id, tempElement.metadata.profileType);
        
        console.log('📊 État de la géométrie de base avant traitement:');
        console.log('  - Is valid:', baseGeometry !== null && baseGeometry !== undefined);
        console.log('  - Has position attribute:', !!baseGeometry.attributes?.position);
        console.log('  - Vertex count:', baseGeometry.attributes?.position?.count || 0);
        
        // Appliquer la feature
        const result = factory.process(baseGeometry, endCutFeature, tempElement);
        
        console.log('📊 Résultat du processeur:');
        console.log('  - Success:', result.success);
        console.log('  - Has geometry:', !!result.geometry);
        console.log('  - Error:', result.error || 'none');
        console.log('  - Warning:', result.warning || 'none');
        
        if (result.geometry) {
            console.log('  - Vertices après:', result.geometry.attributes?.position?.count || 0);
            console.log('  - Type géométrie:', result.geometry.constructor.name);
        }
        
        return result.geometry || baseGeometry;
        
    } catch (error) {
        console.error('❌ Erreur dans testEndCutFeature:', error.message);
        console.error('Stack:', error.stack);
        return baseGeometry;
    }
}

// Test direct d'un trou
async function testHoleFeature(baseGeometry) {
    if (!baseGeometry) return null;
    
    console.log('\n🕳️ Test application HOLE feature');
    console.log('='.repeat(50));
    
    try {
        const { FeatureProcessorFactory } = await import('./src/TopSteelCAD/core/features/processors/FeatureProcessorFactory.js');
        const { FeatureType, CoordinateSystem } = await import('./src/TopSteelCAD/core/features/types.js');
        const THREE = await import('three');
        
        const factory = FeatureProcessorFactory.getInstance();
        
        // Créer une feature HOLE simple (un des trous du fichier h5004.nc1)
        const holeFeature = {
            type: FeatureType.HOLE,
            id: 'debug_hole_1',
            position: new THREE.Vector3(89.01, 25.4, 0), // Premier trou du fichier
            rotation: new THREE.Euler(0, 0, Math.PI/2), // Rotation pour percer selon X
            coordinateSystem: CoordinateSystem.STANDARD,
            parameters: {
                diameter: 17.5,
                depth: -1, // Traversant
                face: 'top_flange'
            }
        };
        
        const tempElement = {
            id: 'debug_tube',
            dimensions: { length: 2259.98, width: 50.8, height: 50.8, thickness: 4.78 },
            metadata: { profileType: 'TUBE_RECT' }
        };
        
        console.log('🕳️ Trou créé:', holeFeature.id, `Ø${holeFeature.parameters.diameter}mm`);
        console.log('📍 Position:', `(${holeFeature.position.x}, ${holeFeature.position.y}, ${holeFeature.position.z})`);
        
        const result = factory.process(baseGeometry, holeFeature, tempElement);
        
        console.log('📊 Résultat du trou:');
        console.log('  - Success:', result.success);
        console.log('  - Has geometry:', !!result.geometry);
        console.log('  - Error:', result.error || 'none');
        
        if (result.geometry) {
            console.log('  - Vertices après trou:', result.geometry.attributes?.position?.count || 0);
        }
        
        return result.geometry || baseGeometry;
        
    } catch (error) {
        console.error('❌ Erreur dans testHoleFeature:', error.message);
        console.error('Stack:', error.stack);
        return baseGeometry;
    }
}

// Test principal
async function runPipelineDebug() {
    console.log('🚀 Debug Pipeline Géométrie DSTV');
    console.log('='.repeat(70));
    
    // 1. Générer la géométrie de base du tube
    let geometry = await testTubeGenerator();
    if (!geometry) {
        console.error('❌ Impossible de continuer sans géométrie de base');
        return;
    }
    
    // 2. Tester l'application d'une coupe END_CUT
    geometry = await testEndCutFeature(geometry);
    
    // 3. Tester l'application d'un trou
    geometry = await testHoleFeature(geometry);
    
    console.log('\n✅ Tests terminés');
    console.log('📊 Géométrie finale:');
    console.log('  - Vertices:', geometry?.attributes?.position?.count || 0);
    console.log('  - Is valid:', geometry !== null && geometry !== undefined);
}

// Exécution
runPipelineDebug().catch(error => {
    console.error('❌ Erreur globale:', error);
});