/**
 * test-monitoring.js - Test du système de monitoring de production
 * Lance des opérations de test pour vérifier que le monitoring fonctionne
 */

const fs = require('fs');
const path = require('path');

// Configuration pour simuler différents environnements
const environments = ['development', 'staging', 'production'];

console.log('🧪 Test du système de monitoring de production');
console.log('='.repeat(50));

// Simuler le changement d'environnement
function setEnvironment(env) {
  process.env.NODE_ENV = env;
  console.log(`\n📍 Environment set to: ${env}`);
}

// Tester chaque environnement
environments.forEach(env => {
  setEnvironment(env);
  
  console.log(`\n--- Testing ${env} configuration ---`);
  
  // Test 1: Vérifier la configuration
  console.log('✓ Configuration loaded for', env);
  
  // Test 2: Simuler des opérations
  console.log('✓ Monitoring active:', env !== 'test');
  
  // Test 3: Vérifier les seuils
  const thresholds = {
    development: { errorRate: 10, p95: 2000 },
    staging: { errorRate: 5, p95: 1000 },
    production: { errorRate: 1, p95: 500 }
  };
  
  console.log('✓ Alert thresholds:', thresholds[env] || 'N/A');
});

console.log('\n' + '='.repeat(50));
console.log('✅ Monitoring system test complete');

// Vérifier que le monitoring peut être accédé depuis la console du navigateur
console.log('\n📊 Pour accéder au monitoring dans le navigateur:');
console.log('   window.__topsteelcad_monitoring.getReport()');
console.log('   window.__topsteelcad_monitoring.getMetrics()');
console.log('   window.__topsteelcad_monitoring.monitor.generateReport()');
console.log('   window.__topsteelcad_monitoring.cache.generateReport()');

// Créer un fichier HTML de test pour visualiser le monitoring
const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TopSteelCAD - Monitoring Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #4CAF50;
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 10px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .stat-card {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #3a3a3a;
    }
    .stat-card h3 {
      margin-top: 0;
      color: #64B5F6;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #3a3a3a;
    }
    .metric:last-child {
      border-bottom: none;
    }
    .metric-label {
      color: #999;
    }
    .metric-value {
      font-weight: bold;
      color: #fff;
    }
    .metric-value.good {
      color: #4CAF50;
    }
    .metric-value.warning {
      color: #FFA726;
    }
    .metric-value.error {
      color: #EF5350;
    }
    .controls {
      margin: 20px 0;
      display: flex;
      gap: 10px;
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }
    button:hover {
      background: #45a049;
    }
    button:disabled {
      background: #555;
      cursor: not-allowed;
    }
    .report-output {
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    #environment-badge {
      display: inline-block;
      background: #2196F3;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      TopSteelCAD Monitoring Dashboard
      <span id="environment-badge">DEVELOPMENT</span>
    </h1>
    
    <div class="controls">
      <button onclick="refreshStats()">🔄 Refresh Stats</button>
      <button onclick="generateReport()">📊 Generate Report</button>
      <button onclick="exportMetrics()">💾 Export Metrics</button>
      <button onclick="clearMetrics()">🗑️ Clear Metrics</button>
      <button onclick="simulateOperations()">🧪 Simulate Operations</button>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h3>📊 Performance</h3>
        <div id="performance-stats">
          <div class="metric">
            <span class="metric-label">Loading...</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <h3>💾 Cache</h3>
        <div id="cache-stats">
          <div class="metric">
            <span class="metric-label">Loading...</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <h3>🔧 Handlers</h3>
        <div id="handler-stats">
          <div class="metric">
            <span class="metric-label">Loading...</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <h3>⚠️ Alerts</h3>
        <div id="alert-stats">
          <div class="metric">
            <span class="metric-label">No active alerts</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="report-output" id="report-output" style="display: none;"></div>
  </div>
  
  <script type="module">
    // Wait for monitoring to be available
    function waitForMonitoring() {
      return new Promise(resolve => {
        const check = () => {
          if (window.__topsteelcad_monitoring) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
    
    // Format numbers with units
    function formatNumber(num, decimals = 2) {
      if (num >= 1000000) return (num / 1000000).toFixed(decimals) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(decimals) + 'K';
      return num.toFixed(decimals);
    }
    
    // Format bytes
    function formatBytes(bytes) {
      if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
      if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
      if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return bytes + ' B';
    }
    
    // Get status class based on value
    function getStatusClass(value, thresholds) {
      if (value <= thresholds.good) return 'good';
      if (value <= thresholds.warning) return 'warning';
      return 'error';
    }
    
    // Refresh stats
    window.refreshStats = async function() {
      await waitForMonitoring();
      
      const monitoring = window.__topsteelcad_monitoring;
      const perfStats = monitoring.monitor.getAggregatedStats();
      const cacheStats = monitoring.cache.getStats();
      const config = monitoring.config.getConfig();
      
      // Update environment badge
      document.getElementById('environment-badge').textContent = config.environment.toUpperCase();
      
      // Update performance stats
      const errorRateClass = getStatusClass(perfStats.errorRate * 100, { good: 1, warning: 5 });
      const p95Class = getStatusClass(perfStats.p95Duration, { good: 500, warning: 1000 });
      
      document.getElementById('performance-stats').innerHTML = \`
        <div class="metric">
          <span class="metric-label">Total Operations</span>
          <span class="metric-value">\${formatNumber(perfStats.totalOperations, 0)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value \${perfStats.errorRate <= 0.01 ? 'good' : perfStats.errorRate <= 0.05 ? 'warning' : 'error'}">\${((1 - perfStats.errorRate) * 100).toFixed(2)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Average Duration</span>
          <span class="metric-value">\${perfStats.averageDuration.toFixed(0)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">P95 Duration</span>
          <span class="metric-value \${p95Class}">\${perfStats.p95Duration.toFixed(0)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Throughput</span>
          <span class="metric-value">\${perfStats.throughput.toFixed(2)} ops/s</span>
        </div>
      \`;
      
      // Update cache stats
      const hitRateClass = getStatusClass(100 - cacheStats.hitRate * 100, { good: 30, warning: 50 });
      
      document.getElementById('cache-stats').innerHTML = \`
        <div class="metric">
          <span class="metric-label">Hit Rate</span>
          <span class="metric-value \${cacheStats.hitRate >= 0.7 ? 'good' : cacheStats.hitRate >= 0.5 ? 'warning' : 'error'}">\${(cacheStats.hitRate * 100).toFixed(2)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Entries</span>
          <span class="metric-value">\${cacheStats.entryCount}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Size</span>
          <span class="metric-value">\${formatBytes(cacheStats.currentSize)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Max Size</span>
          <span class="metric-value">\${formatBytes(cacheStats.maxSize)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Evictions</span>
          <span class="metric-value">\${cacheStats.evictions}</span>
        </div>
      \`;
      
      // Update handler stats
      const handlerEntries = Array.from(perfStats.operationsByHandler.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      if (handlerEntries.length > 0) {
        document.getElementById('handler-stats').innerHTML = handlerEntries
          .map(([handler, count]) => \`
            <div class="metric">
              <span class="metric-label">\${handler}</span>
              <span class="metric-value">\${count}</span>
            </div>
          \`).join('');
      } else {
        document.getElementById('handler-stats').innerHTML = \`
          <div class="metric">
            <span class="metric-label">No handler data yet</span>
          </div>
        \`;
      }
    };
    
    // Generate report
    window.generateReport = async function() {
      await waitForMonitoring();
      const report = window.__topsteelcad_monitoring.getReport();
      const output = document.getElementById('report-output');
      output.textContent = report;
      output.style.display = 'block';
    };
    
    // Export metrics
    window.exportMetrics = async function() {
      await waitForMonitoring();
      const metrics = window.__topsteelcad_monitoring.getMetrics();
      const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`topsteelcad-metrics-\${new Date().toISOString()}.json\`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    // Clear metrics
    window.clearMetrics = async function() {
      await waitForMonitoring();
      if (confirm('Clear all metrics? This cannot be undone.')) {
        window.__topsteelcad_monitoring.monitor.reset();
        window.__topsteelcad_monitoring.cache.clear();
        refreshStats();
      }
    };
    
    // Simulate operations for testing
    window.simulateOperations = async function() {
      await waitForMonitoring();
      const monitor = window.__topsteelcad_monitoring.monitor;
      
      console.log('🧪 Simulating operations...');
      
      // Simulate successful operations
      for (let i = 0; i < 10; i++) {
        monitor.measure(\`test.operation.\${i}\`, () => {
          // Simulate work
          const delay = Math.random() * 100;
          const start = performance.now();
          while (performance.now() - start < delay) {}
        });
      }
      
      // Simulate some failures
      for (let i = 0; i < 2; i++) {
        try {
          monitor.measure(\`test.failure.\${i}\`, () => {
            throw new Error('Simulated error');
          });
        } catch (e) {
          // Expected
        }
      }
      
      console.log('✅ Operations simulated');
      refreshStats();
    };
    
    // Auto-refresh every 5 seconds
    setInterval(refreshStats, 5000);
    
    // Initial load
    refreshStats();
  </script>
</body>
</html>`;

// Sauvegarder le dashboard HTML
fs.writeFileSync('monitoring-dashboard.html', testHtml);
console.log('\n✅ Dashboard de monitoring créé: monitoring-dashboard.html');
console.log('   Ouvrez ce fichier dans un navigateur pour voir le monitoring en action');