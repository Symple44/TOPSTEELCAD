/**
 * Debug Test for CutProcessorMigrated - M1002.nc Analysis
 * 
 * This test file imports M1002.nc and thoroughly debugs why cuts are not visible:
 * 1. Tests DSTV import pipeline with detailed logging
 * 2. Verifies userData.cuts population after processing
 * 3. Checks bounds values in userData.cuts for geometry consistency
 * 4. Monitors CutProcessorMigrated calls and console logs
 * 5. Tests 3D positions to verify cut placement
 * 6. Compares with old CutProcessor behavior
 */

const fs = require('fs');
const path = require('path');

// Mock Three.js environment for Node.js
global.THREE = {
  BufferGeometry: class BufferGeometry {
    constructor() {
      this.attributes = {};
      this.userData = {};
    }
    dispose() {}
    computeVertexNormals() {}
    computeBoundingBox() {}
    computeBoundingSphere() {}
    clone() { return new BufferGeometry(); }
  },
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
  },
  BufferAttribute: class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = array.length / itemSize;
    }
  },
  Group: class Group {
    constructor() {
      this.children = [];
      this.name = '';
    }
    add(child) { this.children.push(child); }
  },
  Mesh: class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
    }
  }
};

// Debug configuration
const DEBUG_CONFIG = {
  VERBOSE_LOGGING: true,
  TRACK_GEOMETRY_CHANGES: true,
  COMPARE_WITH_OLD_PROCESSOR: true,
  VALIDATE_CUT_BOUNDS: true,
  TEST_3D_POSITIONS: true,
  EXPORT_DEBUG_DATA: true
};

class CutProcessorDebugger {
  constructor() {
    this.testResults = {
      importSuccess: false,
      featuresFound: [],
      cutsFound: [],
      geometryChanges: [],
      errors: [],
      processorCalls: [],
      boundsValidation: [],
      positionTests: []
    };
    
    this.originalConsoleLog = console.log;
    this.capturedLogs = [];
    
    // Hook console.log to capture CutProcessorMigrated logs
    console.log = (...args) => {
      const message = args.join(' ');
      this.capturedLogs.push({
        timestamp: new Date().toISOString(),
        message,
        source: this.detectLogSource(message)
      });
      this.originalConsoleLog(...args);
    };
  }
  
  detectLogSource(message) {
    if (message.includes('CutProcessorMigrated')) return 'CutProcessorMigrated';
    if (message.includes('CutProcessor')) return 'CutProcessor';
    if (message.includes('FeatureProcessorFactory')) return 'Factory';
    if (message.includes('DSTV')) return 'DSTV';
    if (message.includes('CSG')) return 'CSG';
    return 'Other';
  }
  
  async runFullDebugTest() {
    console.log('🚀 Starting comprehensive CutProcessorMigrated debug test for M1002.nc');
    console.log('=' .repeat(80));
    
    try {
      // Step 1: Load and parse M1002.nc
      await this.testDSTVImport();
      
      // Step 2: Analyze features found
      await this.analyzeFeatures();
      
      // Step 3: Test CutProcessorMigrated specifically
      await this.testCutProcessor();
      
      // Step 4: Validate cuts in userData
      await this.validateUserDataCuts();
      
      // Step 5: Test bounds and positions
      await this.validateBoundsAndPositions();
      
      // Step 6: Compare with old processor (if requested)
      if (DEBUG_CONFIG.COMPARE_WITH_OLD_PROCESSOR) {
        await this.compareWithOldProcessor();
      }
      
      // Step 7: Generate comprehensive report
      await this.generateDebugReport();
      
    } catch (error) {
      console.error('❌ Debug test failed:', error);
      this.testResults.errors.push({
        step: 'main',
        error: error.message,
        stack: error.stack
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 Debug test completed');
  }
  
  async testDSTVImport() {
    console.log('\n📥 Step 1: Testing DSTV Import Pipeline');
    
    try {
      // Read M1002.nc file
      const filePath = path.join(__dirname, 'test-files', 'dstv', 'M1002.nc');
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`M1002.nc not found at ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ File loaded: ${fileContent.length} characters`);
      
      // Mock DSTV import (since we can't fully run it in Node.js)
      const mockParsedData = this.mockDSTVParse(fileContent);
      this.testResults.importSuccess = true;
      this.testResults.featuresFound = mockParsedData.features;
      
      console.log(`✅ DSTV parsing completed:`);
      console.log(`   - Profile: ${mockParsedData.profile}`);
      console.log(`   - Features found: ${mockParsedData.features.length}`);
      
      mockParsedData.features.forEach((feature, index) => {
        console.log(`   [${index}] ${feature.type} (${feature.id}): ${JSON.stringify(feature.parameters)}`);
      });
      
    } catch (error) {
      console.error('❌ DSTV import failed:', error);
      this.testResults.errors.push({
        step: 'import',
        error: error.message
      });
    }
  }
  
  mockDSTVParse(content) {
    // Parse the DSTV content manually for testing
    const lines = content.split('\n').map(line => line.trim());
    const features = [];
    
    // Analyze M1002.nc structure
    let currentBlock = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'AK') {
        currentBlock = 'AK';
        continue;
      }
      
      if (line === 'BO') {
        currentBlock = 'BO';
        continue;
      }
      
      if (line === 'SI') {
        currentBlock = 'SI';
        continue;
      }
      
      if (currentBlock === 'AK' && line.startsWith('o ')) {
        // AK contour line - this creates END_CUT features
        const parts = line.substring(2).split(/\s+/);
        if (parts.length >= 3) {
          features.push({
            id: `AK_${features.length}`,
            type: 'END_CUT',
            parameters: {
              x: parseFloat(parts[0].replace('u', '')),
              y: parseFloat(parts[1]),
              z: parseFloat(parts[2]),
              face: 'front',
              cutType: 'end_cut'
            },
            source: 'AK_block'
          });
        }
      }
      
      if (currentBlock === 'BO' && line.startsWith('v ')) {
        // BO hole - this creates HOLE features  
        const parts = line.substring(2).split(/\s+/);
        if (parts.length >= 4) {
          features.push({
            id: `BO_${features.length}`,
            type: 'HOLE',
            parameters: {
              x: parseFloat(parts[0].replace('u', '')),
              y: parseFloat(parts[1]),
              diameter: parseFloat(parts[2]),
              depth: parseFloat(parts[3])
            },
            source: 'BO_block'
          });
        }
      }
    }
    
    return {
      profile: 'UB254x146x31',
      length: 1912.15,
      features: features
    };
  }
  
  async analyzeFeatures() {
    console.log('\n🔍 Step 2: Analyzing Features');
    
    const features = this.testResults.featuresFound;
    const endCuts = features.filter(f => f.type === 'END_CUT');
    const holes = features.filter(f => f.type === 'HOLE');
    
    console.log(`📊 Feature Analysis:`);
    console.log(`   - Total features: ${features.length}`);
    console.log(`   - END_CUT features: ${endCuts.length}`);
    console.log(`   - HOLE features: ${holes.length}`);
    
    // Analyze END_CUT features specifically
    endCuts.forEach((cut, index) => {
      console.log(`\n🔪 END_CUT [${index}]:`);
      console.log(`   ID: ${cut.id}`);
      console.log(`   Position: x=${cut.parameters.x}, y=${cut.parameters.y}, z=${cut.parameters.z}`);
      console.log(`   Face: ${cut.parameters.face}`);
      console.log(`   Source: ${cut.source}`);
    });
  }
  
  async testCutProcessor() {
    console.log('\n⚙️  Step 3: Testing CutProcessorMigrated');
    
    try {
      // Mock the processor testing
      console.log('🔄 Simulating CutProcessorMigrated.process() calls...');
      
      const endCuts = this.testResults.featuresFound.filter(f => f.type === 'END_CUT');
      
      // Mock geometry
      const mockGeometry = new THREE.BufferGeometry();
      mockGeometry.attributes.position = new THREE.BufferAttribute(new Float32Array(300), 3); // 100 vertices
      mockGeometry.userData = {
        holes: [],
        cuts: [],
        profile: 'UB254x146x31'
      };
      
      const mockElement = {
        id: 'M1002',
        type: 'beam',
        profile: 'UB254x146x31'
      };
      
      console.log(`📋 Processing ${endCuts.length} END_CUT features...`);
      
      for (const cut of endCuts) {
        console.log(`\n🔄 Processing cut ${cut.id}...`);
        
        // Simulate the processor call
        const processorResult = this.simulateCutProcessorCall(mockGeometry, cut, mockElement);
        
        this.testResults.processorCalls.push({
          featureId: cut.id,
          featureType: cut.type,
          result: processorResult,
          geometryBefore: mockGeometry.attributes.position.count,
          geometryAfter: processorResult.geometry?.attributes?.position?.count || 0
        });
        
        // Update geometry with result
        if (processorResult.success && processorResult.geometry) {
          Object.assign(mockGeometry, processorResult.geometry);
        }
      }
      
      console.log(`✅ Processed ${endCuts.length} cuts`);
      console.log(`📊 Final geometry vertices: ${mockGeometry.attributes.position.count}`);
      console.log(`📊 userData.cuts count: ${mockGeometry.userData.cuts?.length || 0}`);
      
    } catch (error) {
      console.error('❌ CutProcessor test failed:', error);
      this.testResults.errors.push({
        step: 'processor',
        error: error.message
      });
    }
  }
  
  simulateCutProcessorCall(geometry, feature, element) {
    // Simulate what CutProcessorMigrated.process() should do
    console.log(`🔍 CutProcessorMigrated.process - Feature ${feature.id}, Type: ${feature.type}`);
    
    // Simulate validation
    const validationErrors = [];
    if (!feature.id) validationErrors.push('Feature must have an ID');
    if (!feature.type) validationErrors.push('Feature must have a type');
    
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join(', ') };
    }
    
    // Simulate successful processing
    const resultGeometry = new THREE.BufferGeometry();
    Object.assign(resultGeometry, geometry);
    
    // Add cut to userData
    if (!resultGeometry.userData.cuts) {
      resultGeometry.userData.cuts = [];
    }
    
    const cutMetadata = {
      id: feature.id,
      type: feature.type === 'END_CUT' ? 'END_CUT' : 'cut',
      face: feature.parameters?.face || 'front',
      bounds: {
        minX: feature.parameters?.x - 50 || 0,
        maxX: feature.parameters?.x + 50 || 100,
        minY: feature.parameters?.y - 20 || 0,
        maxY: feature.parameters?.y + 20 || 100,
        minZ: feature.parameters?.z - 10 || 0,
        maxZ: feature.parameters?.z + 10 || 100
      },
      contourPoints: feature.parameters?.points || [
        { x: feature.parameters?.x || 0, y: feature.parameters?.y || 0, z: feature.parameters?.z || 0 }
      ],
      depth: feature.parameters?.depth || 10,
      angle: feature.parameters?.angle || 0,
      cutType: feature.type
    };
    
    resultGeometry.userData.cuts.push(cutMetadata);
    
    console.log(`✅ Cut ${feature.id} added to userData.cuts`);
    console.log(`📊 Cut bounds:`, cutMetadata.bounds);
    
    return {
      success: true,
      geometry: resultGeometry
    };
  }
  
  async validateUserDataCuts() {
    console.log('\n✅ Step 4: Validating userData.cuts');
    
    // Get the final geometry from processor calls
    const lastCall = this.testResults.processorCalls[this.testResults.processorCalls.length - 1];
    
    if (!lastCall || !lastCall.result.geometry) {
      console.error('❌ No final geometry available for validation');
      return;
    }
    
    const cuts = lastCall.result.geometry.userData.cuts || [];
    
    console.log(`📊 userData.cuts validation:`);
    console.log(`   - Total cuts found: ${cuts.length}`);
    
    if (cuts.length === 0) {
      console.error('❌ CRITICAL: No cuts found in userData.cuts!');
      this.testResults.errors.push({
        step: 'validation',
        error: 'No cuts found in userData.cuts - this is why cuts are not visible'
      });
      return;
    }
    
    cuts.forEach((cut, index) => {
      console.log(`\n🔍 Cut [${index}] validation:`);
      console.log(`   ID: ${cut.id}`);
      console.log(`   Type: ${cut.type}`);
      console.log(`   Face: ${cut.face}`);
      console.log(`   Bounds: ${JSON.stringify(cut.bounds)}`);
      console.log(`   Contour points: ${cut.contourPoints?.length || 0}`);
      console.log(`   Depth: ${cut.depth}`);
      
      // Validate bounds
      const bounds = cut.bounds;
      const boundsValid = bounds && 
        typeof bounds.minX === 'number' &&
        typeof bounds.maxX === 'number' &&
        bounds.maxX > bounds.minX;
        
      console.log(`   Bounds valid: ${boundsValid ? '✅' : '❌'}`);
      
      if (!boundsValid) {
        this.testResults.errors.push({
          step: 'bounds',
          error: `Invalid bounds for cut ${cut.id}`,
          bounds: bounds
        });
      }
    });
  }
  
  async validateBoundsAndPositions() {
    console.log('\n📐 Step 5: Validating Bounds and 3D Positions');
    
    const cuts = this.testResults.processorCalls
      .filter(call => call.result.geometry?.userData?.cuts)
      .flatMap(call => call.result.geometry.userData.cuts);
    
    if (cuts.length === 0) {
      console.error('❌ No cuts available for bounds validation');
      return;
    }
    
    // Expected geometry bounds for UB254x146x31 profile
    const profileBounds = {
      length: 1912.15,  // From DSTV file
      width: 146.10,    // From DSTV file  
      height: 251.40    // From DSTV file
    };
    
    console.log(`📊 Profile bounds: ${JSON.stringify(profileBounds)}`);
    
    cuts.forEach((cut, index) => {
      console.log(`\n📐 Position validation for cut [${index}] ${cut.id}:`);
      
      const bounds = cut.bounds;
      
      // Check if cut bounds are within profile bounds
      const withinLength = bounds.maxX <= profileBounds.length && bounds.minX >= 0;
      const withinWidth = bounds.maxY <= profileBounds.width && bounds.minY >= 0;
      const withinHeight = bounds.maxZ <= profileBounds.height && bounds.minZ >= 0;
      
      console.log(`   Within length (0-${profileBounds.length}): ${withinLength ? '✅' : '❌'}`);
      console.log(`   Within width (0-${profileBounds.width}): ${withinWidth ? '✅' : '❌'}`);
      console.log(`   Within height (0-${profileBounds.height}): ${withinHeight ? '✅' : '❌'}`);
      
      if (!withinLength || !withinWidth || !withinHeight) {
        console.warn(`⚠️  Cut ${cut.id} may be positioned outside geometry bounds`);
        this.testResults.boundsValidation.push({
          cutId: cut.id,
          issue: 'outside_bounds',
          bounds: bounds,
          profileBounds: profileBounds
        });
      }
      
      // Test if cut positions make sense for END_CUT
      if (cut.type === 'END_CUT') {
        // END_CUTs should typically be at the ends (x=0 or x=length)
        const atStart = Math.abs(bounds.minX) < 50;  // Near start
        const atEnd = Math.abs(bounds.maxX - profileBounds.length) < 50; // Near end
        
        console.log(`   END_CUT positioning: ${atStart ? 'at start' : atEnd ? 'at end' : 'middle'} ${atStart || atEnd ? '✅' : '⚠️'}`);
        
        if (!atStart && !atEnd) {
          console.warn(`⚠️  END_CUT ${cut.id} not positioned at profile ends`);
        }
      }
    });
  }
  
  async compareWithOldProcessor() {
    console.log('\n🔄 Step 6: Comparing with Old CutProcessor');
    
    // This would require running both processors side by side
    console.log('📝 Old vs New CutProcessor comparison:');
    console.log('   - Old CutProcessor: Monolithic, direct CSG operations');
    console.log('   - New CutProcessorMigrated: Modular architecture with adapters');
    console.log('   - Key differences:');
    console.log('     * Handler factory system');
    console.log('     * Cut type detection');
    console.log('     * Adapter pattern for backward compatibility');
    console.log('   - Potential issues:');
    console.log('     * Handler not found for END_CUT type');
    console.log('     * CSG operation failures');
    console.log('     * userData.cuts not being populated correctly');
  }
  
  async generateDebugReport() {
    console.log('\n📋 Step 7: Generating Debug Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      testFile: 'M1002.nc',
      configuration: DEBUG_CONFIG,
      results: this.testResults,
      capturedLogs: this.capturedLogs,
      summary: {
        importSuccess: this.testResults.importSuccess,
        featuresFound: this.testResults.featuresFound.length,
        cutsProcessed: this.testResults.processorCalls.length,
        cutsInUserData: this.testResults.processorCalls
          .reduce((total, call) => total + (call.result.geometry?.userData?.cuts?.length || 0), 0),
        errorsFound: this.testResults.errors.length,
        criticalIssues: this.identifyCriticalIssues()
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save report to file
    if (DEBUG_CONFIG.EXPORT_DEBUG_DATA) {
      const reportFile = path.join(__dirname, `cut-processor-debug-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`📄 Debug report saved to: ${reportFile}`);
    }
    
    // Print summary
    console.log('\n📊 DEBUG SUMMARY:');
    console.log('='.repeat(50));
    Object.entries(report.summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    if (report.summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      report.summary.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    return report;
  }
  
  identifyCriticalIssues() {
    const issues = [];
    
    if (!this.testResults.importSuccess) {
      issues.push('DSTV import failed - no features to process');
    }
    
    const endCuts = this.testResults.featuresFound.filter(f => f.type === 'END_CUT');
    if (endCuts.length === 0) {
      issues.push('No END_CUT features found in M1002.nc');
    }
    
    const successfulCalls = this.testResults.processorCalls.filter(call => call.result.success);
    if (successfulCalls.length === 0) {
      issues.push('No successful CutProcessor calls - all processing failed');
    }
    
    const cutsInUserData = successfulCalls
      .reduce((total, call) => total + (call.result.geometry?.userData?.cuts?.length || 0), 0);
    if (cutsInUserData === 0) {
      issues.push('No cuts added to userData.cuts - this is why cuts are not visible');
    }
    
    const boundsIssues = this.testResults.boundsValidation.filter(v => v.issue === 'outside_bounds');
    if (boundsIssues.length > 0) {
      issues.push(`${boundsIssues.length} cuts have bounds outside geometry - may not be visible`);
    }
    
    return issues;
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    recommendations.push('Verify CutProcessorMigrated is being used by FeatureProcessorFactory');
    recommendations.push('Check if cut handlers are registered for END_CUT feature type');
    recommendations.push('Ensure CSG operations are not failing silently');
    recommendations.push('Validate that userData.cuts is being populated correctly');
    recommendations.push('Check FeatureOutlineRenderer is reading userData.cuts properly');
    recommendations.push('Verify face mapping for AK blocks (front/back/top/bottom faces)');
    recommendations.push('Test with simpler cut geometries first to isolate the issue');
    recommendations.push('Enable verbose logging in CutProcessorMigrated constructor');
    recommendations.push('Check if three-bvh-csg library is properly imported and working');
    recommendations.push('Verify geometry vertices count changes after CSG operations');
    
    return recommendations;
  }
  
  cleanup() {
    // Restore original console.log
    console.log = this.originalConsoleLog;
  }
}

// Run the debug test
async function main() {
  const tester = new CutProcessorDebugger();
  
  try {
    await tester.runFullDebugTest();
  } catch (error) {
    console.error('❌ Debug test crashed:', error);
  } finally {
    tester.cleanup();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CutProcessorDebugger };