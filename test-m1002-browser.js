/**
 * Browser Test for M1002.nc Cut Visibility
 * 
 * This script should be run in the browser console to test the actual
 * DSTV import and cut processing with the fixed CutProcessorMigrated.
 * 
 * Usage:
 * 1. Open TopSteelCAD in browser
 * 2. Open dev console
 * 3. Paste and execute this script
 * 4. Import M1002.nc file
 * 5. Check console output and 3D viewer for cuts
 */

console.log('🧪 M1002.nc Cut Visibility Test Started');
console.log('=' .repeat(50));

// Test configuration
const TEST_CONFIG = {
  MONITOR_PROCESSOR_CALLS: true,
  MONITOR_GEOMETRY_CHANGES: true,
  MONITOR_USERDATA_CUTS: true,
  MONITOR_OUTLINE_RENDERER: true,
  LOG_CSG_OPERATIONS: true
};

// Store original methods for monitoring
const originalMethods = {};

/**
 * Hook into CutProcessorMigrated to monitor its calls
 */
function hookCutProcessor() {
  // Try to find CutProcessorMigrated
  if (window.TopSteelCAD && window.TopSteelCAD.CutProcessorMigrated) {
    const processor = window.TopSteelCAD.CutProcessorMigrated.prototype;
    
    // Hook the process method
    if (processor.process) {
      originalMethods.process = processor.process;
      processor.process = function(geometry, feature, element) {
        console.log(`🔄 [HOOK] CutProcessorMigrated.process called:`);
        console.log(`   Feature: ${feature.id} (${feature.type})`);
        console.log(`   Geometry vertices before: ${geometry.attributes.position?.count || 0}`);
        console.log(`   Feature parameters:`, feature.parameters);
        
        const result = originalMethods.process.call(this, geometry, feature, element);
        
        console.log(`   Processing result:`, {
          success: result.success,
          hasGeometry: !!result.geometry,
          error: result.error,
          geometryVerticesAfter: result.geometry?.attributes?.position?.count || 0
        });
        
        if (result.geometry && result.geometry.userData.cuts) {
          console.log(`   userData.cuts count: ${result.geometry.userData.cuts.length}`);
          result.geometry.userData.cuts.forEach((cut, i) => {
            console.log(`     Cut[${i}]: ${cut.id} (${cut.type}) bounds:`, cut.bounds);
          });
        }
        
        return result;
      };
      console.log('✅ Hooked CutProcessorMigrated.process');
    }
  }
}

/**
 * Hook into FeatureOutlineRenderer to monitor cut outline creation
 */
function hookOutlineRenderer() {
  // Try to find FeatureOutlineRenderer
  if (window.TopSteelCAD && window.TopSteelCAD.FeatureOutlineRenderer) {
    const renderer = window.TopSteelCAD.FeatureOutlineRenderer.prototype;
    
    // Hook createFeatureOutlines method
    if (renderer.createFeatureOutlines) {
      originalMethods.createFeatureOutlines = renderer.createFeatureOutlines;
      renderer.createFeatureOutlines = function(element, mesh) {
        console.log(`🎨 [HOOK] FeatureOutlineRenderer.createFeatureOutlines called:`);
        console.log(`   Element: ${element.id}`);
        
        const geometry = mesh.geometry;
        console.log(`   Geometry userData.cuts: ${geometry.userData.cuts?.length || 0} cuts`);
        
        if (geometry.userData.cuts && geometry.userData.cuts.length > 0) {
          console.log('   Cuts found in geometry:');
          geometry.userData.cuts.forEach((cut, i) => {
            console.log(`     [${i}] ${cut.id}: type=${cut.type}, face=${cut.face}, bounds=`, cut.bounds);
          });
        }
        
        const result = originalMethods.createFeatureOutlines.call(this, element, mesh);
        
        console.log(`   Outline group children: ${result.children?.length || 0}`);
        
        return result;
      };
      console.log('✅ Hooked FeatureOutlineRenderer.createFeatureOutlines');
    }
  }
}

/**
 * Hook into DSTV import to monitor feature creation
 */
function hookDSTVImport() {
  // This is trickier as the DSTV import is deep in the plugin system
  // We'll monitor at the FeatureProcessorFactory level instead
  
  if (window.TopSteelCAD && window.TopSteelCAD.FeatureProcessorFactory) {
    const factory = window.TopSteelCAD.FeatureProcessorFactory;
    
    if (factory.process) {
      originalMethods.factoryProcess = factory.process;
      factory.process = function(geometry, feature, element) {
        console.log(`🏭 [HOOK] FeatureProcessorFactory.process called:`);
        console.log(`   Feature: ${feature.id} (${feature.type})`);
        
        const result = originalMethods.factoryProcess.call(this, geometry, feature, element);
        
        console.log(`   Factory result: success=${result.success}`);
        
        return result;
      };
      console.log('✅ Hooked FeatureProcessorFactory.process');
    }
  }
}

/**
 * Setup monitoring for file import
 */
function setupFileImportMonitoring() {
  console.log('📂 Setting up file import monitoring...');
  
  // Monitor file input changes (if there's a file input)
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('change', (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        console.log(`📄 File selected: ${files[0].name}`);
        if (files[0].name.toLowerCase().includes('m1002')) {
          console.log('🎯 M1002.nc detected - monitoring import...');
        }
      }
    });
  });
  
  console.log(`✅ Monitoring ${fileInputs.length} file inputs`);
}

/**
 * Monitor the 3D scene for geometry changes
 */
function monitorScene() {
  if (window.THREE && window.scene) {
    console.log('🎭 Monitoring 3D scene...');
    
    // Function to analyze scene contents
    function analyzeScene() {
      console.log('\n📊 Scene Analysis:');
      let meshCount = 0;
      let geometryWithCuts = 0;
      let totalCuts = 0;
      
      window.scene.traverse((object) => {
        if (object.isMesh) {
          meshCount++;
          if (object.geometry && object.geometry.userData && object.geometry.userData.cuts) {
            geometryWithCuts++;
            totalCuts += object.geometry.userData.cuts.length;
            console.log(`   Mesh "${object.name}" has ${object.geometry.userData.cuts.length} cuts`);
          }
        }
      });
      
      console.log(`   Total meshes: ${meshCount}`);
      console.log(`   Meshes with cuts: ${geometryWithCuts}`);
      console.log(`   Total cuts: ${totalCuts}`);
    }
    
    // Analyze scene now and set interval
    analyzeScene();
    setInterval(analyzeScene, 10000); // Every 10 seconds
  }
}

/**
 * Check current cut processor configuration
 */
function checkProcessorConfiguration() {
  console.log('\n⚙️ Checking Processor Configuration:');
  
  if (window.TopSteelCAD && window.TopSteelCAD.FeatureProcessorFactory) {
    const factory = window.TopSteelCAD.FeatureProcessorFactory.getInstance();
    
    if (factory.isUsingNewCutArchitecture) {
      const useNew = factory.isUsingNewCutArchitecture();
      console.log(`   Using new cut architecture: ${useNew ? '✅ YES' : '❌ NO'}`);
    }
    
    if (factory.getSupportedTypes) {
      const types = factory.getSupportedTypes();
      console.log(`   Supported feature types: ${types.length}`);
      console.log(`   END_CUT supported: ${types.includes('END_CUT') ? '✅ YES' : '❌ NO'}`);
    }
  }
}

/**
 * Initialize all monitoring
 */
function initializeTest() {
  try {
    hookCutProcessor();
    hookOutlineRenderer();
    hookDSTVImport();
    setupFileImportMonitoring();
    monitorScene();
    checkProcessorConfiguration();
    
    console.log('\n✅ All monitoring hooks initialized');
    console.log('📝 Now import M1002.nc and watch the console...');
    
    // Provide helper functions in global scope
    window.testHelpers = {
      analyzeGeometry: (mesh) => {
        if (mesh && mesh.geometry) {
          console.log('📊 Geometry Analysis:');
          console.log(`   Vertices: ${mesh.geometry.attributes.position?.count || 0}`);
          console.log(`   userData.cuts: ${mesh.geometry.userData?.cuts?.length || 0}`);
          if (mesh.geometry.userData?.cuts) {
            mesh.geometry.userData.cuts.forEach((cut, i) => {
              console.log(`     Cut[${i}]: ${cut.id} bounds:`, cut.bounds);
            });
          }
        }
      },
      
      findCutGeometry: () => {
        const meshesWithCuts = [];
        if (window.scene) {
          window.scene.traverse((object) => {
            if (object.isMesh && object.geometry?.userData?.cuts?.length > 0) {
              meshesWithCuts.push(object);
            }
          });
        }
        console.log(`Found ${meshesWithCuts.length} meshes with cuts`);
        return meshesWithCuts;
      },
      
      restoreOriginals: () => {
        // Restore original methods if needed
        Object.keys(originalMethods).forEach(key => {
          console.log(`Restoring ${key}...`);
        });
      }
    };
    
    console.log('🧰 Helper functions available: window.testHelpers');
    
  } catch (error) {
    console.error('❌ Test initialization failed:', error);
  }
}

// Start the test
initializeTest();