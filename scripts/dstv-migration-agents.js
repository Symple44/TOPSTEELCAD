#!/usr/bin/env node

/**
 * DSTV Migration Agents - Scripts automatisés pour la migration
 * Exécute les vérifications de qualité, sécurité et build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  srcPath: 'src/TopSteelCAD/parsers/dstv',
  testPath: 'src/TopSteelCAD/parsers/dstv/__tests__',
  reportPath: 'reports/dstv-migration',
  colors: {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  }
};

// Utilitaires
class Logger {
  static log(message, color = 'reset') {
    console.log(`${CONFIG.colors[color]}${message}${CONFIG.colors.reset}`);
  }

  static section(title) {
    console.log('\n' + '='.repeat(60));
    this.log(`🤖 ${title}`, 'cyan');
    console.log('='.repeat(60));
  }

  static success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  static warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  static error(message) {
    this.log(`❌ ${message}`, 'red');
  }

  static info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }
}

// Agents
class MigrationAgents {
  constructor() {
    this.results = {
      quality: null,
      security: null,
      build: null,
      performance: null,
      tests: null,
      architecture: null
    };
  }

  /**
   * Agent: Quality Check
   * Vérifie la qualité du code (lint, typecheck)
   */
  async runQualityCheck() {
    Logger.section('Agent: Quality Check');
    
    try {
      // Lint
      Logger.info('Running ESLint...');
      execSync(`npm run lint -- ${CONFIG.srcPath}`, { stdio: 'inherit' });
      Logger.success('Lint passed');

      // TypeCheck
      Logger.info('Running TypeScript check...');
      execSync('npm run typecheck', { stdio: 'inherit' });
      Logger.success('TypeCheck passed');

      // Format check
      Logger.info('Checking code formatting...');
      execSync(`npx prettier --check "${CONFIG.srcPath}/**/*.ts"`, { stdio: 'inherit' });
      Logger.success('Formatting is correct');

      this.results.quality = { passed: true };
      return true;
    } catch (error) {
      Logger.error(`Quality check failed: ${error.message}`);
      this.results.quality = { passed: false, error: error.message };
      return false;
    }
  }

  /**
   * Agent: Security Check
   * Vérifie la sécurité (audit, scan)
   */
  async runSecurityCheck() {
    Logger.section('Agent: Security Check');
    
    try {
      // NPM Audit
      Logger.info('Running npm audit...');
      try {
        execSync('npm audit --json', { encoding: 'utf8' });
        Logger.success('No vulnerabilities found');
      } catch (auditError) {
        const auditResult = JSON.parse(auditError.stdout || '{}');
        if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
          const vulns = auditResult.metadata.vulnerabilities;
          if (vulns.high > 0 || vulns.critical > 0) {
            throw new Error(`Found ${vulns.high} high and ${vulns.critical} critical vulnerabilities`);
          } else {
            Logger.warning(`Found ${vulns.moderate} moderate and ${vulns.low} low vulnerabilities`);
          }
        }
      }

      // Check for dangerous patterns
      Logger.info('Scanning for dangerous patterns...');
      const dangerous = ['eval', 'Function(', 'innerHTML', 'document.write'];
      let foundDangerous = false;
      
      dangerous.forEach(pattern => {
        try {
          const result = execSync(
            `grep -r "${pattern}" ${CONFIG.srcPath} --include="*.ts" || true`,
            { encoding: 'utf8' }
          );
          if (result.trim()) {
            Logger.warning(`Found potentially dangerous pattern: ${pattern}`);
            foundDangerous = true;
          }
        } catch (e) {
          // Grep returns error if nothing found, which is good
        }
      });

      if (foundDangerous) {
        Logger.warning('Review dangerous patterns before deployment');
      } else {
        Logger.success('No dangerous patterns found');
      }

      this.results.security = { passed: true, warnings: foundDangerous };
      return true;
    } catch (error) {
      Logger.error(`Security check failed: ${error.message}`);
      this.results.security = { passed: false, error: error.message };
      return false;
    }
  }

  /**
   * Agent: Build Validation
   * Compile et vérifie le build
   */
  async runBuildValidation() {
    Logger.section('Agent: Build Validation');
    
    try {
      // Clean build
      Logger.info('Cleaning build directory...');
      execSync('rm -rf dist', { stdio: 'inherit' });

      // Build
      Logger.info('Building project...');
      execSync('npm run build', { stdio: 'inherit' });
      Logger.success('Build completed successfully');

      // Check bundle size
      Logger.info('Analyzing bundle size...');
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        const stats = this.getDirectorySize(distPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        
        if (stats.size > 5 * 1024 * 1024) {
          Logger.warning(`Bundle size is ${sizeMB}MB (target: <5MB)`);
        } else {
          Logger.success(`Bundle size: ${sizeMB}MB`);
        }
      }

      this.results.build = { passed: true };
      return true;
    } catch (error) {
      Logger.error(`Build validation failed: ${error.message}`);
      this.results.build = { passed: false, error: error.message };
      return false;
    }
  }

  /**
   * Agent: Performance Check
   * Mesure les performances
   */
  async runPerformanceCheck() {
    Logger.section('Agent: Performance Check');
    
    try {
      // Create performance test if not exists
      const perfTestPath = path.join(CONFIG.testPath, 'performance.test.ts');
      if (!fs.existsSync(perfTestPath)) {
        Logger.info('Creating performance test...');
        this.createPerformanceTest(perfTestPath);
      }

      // Run performance tests
      Logger.info('Running performance benchmarks...');
      execSync(`npm test -- ${perfTestPath}`, { stdio: 'inherit' });
      Logger.success('Performance tests passed');

      // Memory profiling
      Logger.info('Checking memory usage...');
      const memUsage = process.memoryUsage();
      const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      
      if (memUsage.heapUsed > 100 * 1024 * 1024) {
        Logger.warning(`High memory usage: ${heapMB}MB`);
      } else {
        Logger.success(`Memory usage: ${heapMB}MB`);
      }

      this.results.performance = { passed: true, heapMB };
      return true;
    } catch (error) {
      Logger.error(`Performance check failed: ${error.message}`);
      this.results.performance = { passed: false, error: error.message };
      return false;
    }
  }

  /**
   * Agent: Test Runner
   * Exécute tous les tests
   */
  async runTests() {
    Logger.section('Agent: Test Runner');
    
    try {
      // Unit tests
      Logger.info('Running unit tests...');
      execSync('npm test -- --coverage', { stdio: 'inherit' });
      Logger.success('Unit tests passed');

      // Integration tests
      if (fs.existsSync(path.join(CONFIG.testPath, 'integration'))) {
        Logger.info('Running integration tests...');
        execSync(`npm test -- ${CONFIG.testPath}/integration`, { stdio: 'inherit' });
        Logger.success('Integration tests passed');
      }

      // Coverage report
      Logger.info('Generating coverage report...');
      const coverageFile = 'coverage/coverage-summary.json';
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        const total = coverage.total;
        
        Logger.info(`Coverage: Lines ${total.lines.pct}% | Functions ${total.functions.pct}%`);
        
        if (total.lines.pct < 80) {
          Logger.warning('Coverage is below 80% target');
        } else {
          Logger.success('Coverage meets target (>80%)');
        }
      }

      this.results.tests = { passed: true };
      return true;
    } catch (error) {
      Logger.error(`Tests failed: ${error.message}`);
      this.results.tests = { passed: false, error: error.message };
      return false;
    }
  }

  /**
   * Agent: Architecture Check
   * Valide l'architecture et les patterns
   */
  async runArchitectureCheck() {
    Logger.section('Agent: Architecture Check');
    
    try {
      // Check file structure
      Logger.info('Validating module structure...');
      const requiredDirs = ['lexer', 'parser', 'blocks', 'converters', 'validators', 'types'];
      const missingDirs = [];
      
      requiredDirs.forEach(dir => {
        const dirPath = path.join(CONFIG.srcPath, dir);
        if (!fs.existsSync(dirPath)) {
          missingDirs.push(dir);
        }
      });
      
      if (missingDirs.length > 0) {
        Logger.warning(`Missing directories: ${missingDirs.join(', ')}`);
      } else {
        Logger.success('Module structure is complete');
      }

      // Check for circular dependencies
      Logger.info('Checking for circular dependencies...');
      try {
        execSync(`npx madge --circular ${CONFIG.srcPath}`, { encoding: 'utf8' });
        Logger.success('No circular dependencies found');
      } catch (e) {
        if (e.stdout && e.stdout.includes('No circular dependency found')) {
          Logger.success('No circular dependencies found');
        } else {
          Logger.warning('Found circular dependencies');
        }
      }

      // Check complexity
      Logger.info('Analyzing code complexity...');
      const files = this.getAllFiles(CONFIG.srcPath, '.ts');
      let highComplexity = 0;
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const functions = content.match(/function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{/g) || [];
        
        // Simple complexity check (lines per function)
        if (lines.length / Math.max(functions.length, 1) > 50) {
          highComplexity++;
        }
      });
      
      if (highComplexity > 0) {
        Logger.warning(`${highComplexity} files have high complexity`);
      } else {
        Logger.success('Code complexity is acceptable');
      }

      this.results.architecture = { passed: true };
      return true;
    } catch (error) {
      Logger.error(`Architecture check failed: ${error.message}`);
      this.results.architecture = { passed: false, error: error.message };
      return false;
    }
  }

  /**
   * Run all agents
   */
  async runAll() {
    Logger.section('DSTV Migration - All Agents');
    Logger.info(`Starting at ${new Date().toISOString()}`);
    
    const agents = [
      { name: 'Quality', fn: () => this.runQualityCheck() },
      { name: 'Security', fn: () => this.runSecurityCheck() },
      { name: 'Build', fn: () => this.runBuildValidation() },
      { name: 'Performance', fn: () => this.runPerformanceCheck() },
      { name: 'Tests', fn: () => this.runTests() },
      { name: 'Architecture', fn: () => this.runArchitectureCheck() }
    ];

    let allPassed = true;
    
    for (const agent of agents) {
      const passed = await agent.fn();
      if (!passed) {
        allPassed = false;
        if (agent.name === 'Quality' || agent.name === 'Build') {
          Logger.error(`Critical agent ${agent.name} failed - stopping`);
          break;
        }
      }
    }

    // Generate report
    this.generateReport();
    
    if (allPassed) {
      Logger.section('✅ All Agents Passed!');
      Logger.success('DSTV migration validation complete');
      process.exit(0);
    } else {
      Logger.section('❌ Some Agents Failed');
      Logger.error('Please fix the issues before proceeding');
      process.exit(1);
    }
  }

  /**
   * Generate HTML report
   */
  generateReport() {
    Logger.section('Generating Report');
    
    // Create reports directory
    const reportDir = path.join(process.cwd(), CONFIG.reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(reportDir, `report-${Date.now()}.json`);
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(r => r && r.passed).length,
        failed: Object.values(this.results).filter(r => r && !r.passed).length
      }
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    Logger.success(`Report saved to ${reportFile}`);
  }

  // Helper methods
  getDirectorySize(dir) {
    let size = 0;
    let files = 0;
    
    const walk = (currentPath) => {
      const entries = fs.readdirSync(currentPath);
      entries.forEach(entry => {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          size += stat.size;
          files++;
        }
      });
    };
    
    walk(dir);
    return { size, files };
  }

  getAllFiles(dir, ext) {
    const files = [];
    const walk = (currentPath) => {
      const entries = fs.readdirSync(currentPath);
      entries.forEach(entry => {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walk(fullPath);
        } else if (fullPath.endsWith(ext)) {
          files.push(fullPath);
        }
      });
    };
    walk(dir);
    return files;
  }

  createPerformanceTest(path) {
    const testContent = `
import { DSTVParser } from '../DSTVParser';
import { DSTVLexer } from '../lexer/DSTVLexer';

describe('Performance Tests', () => {
  const parser = new DSTVParser();
  const lexer = new DSTVLexer();
  
  it('should parse 1MB file in less than 100ms', () => {
    const largeContent = 'ST\\n' + 'test\\n'.repeat(200000) + 'EN\\n';
    const startTime = performance.now();
    
    lexer.tokenize(largeContent);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100);
  });
  
  it('should use less than 50MB memory', () => {
    const memBefore = process.memoryUsage().heapUsed;
    
    // Parse multiple files
    for (let i = 0; i < 10; i++) {
      parser.parse('ST\\ntest\\nEN');
    }
    
    const memAfter = process.memoryUsage().heapUsed;
    const memUsed = (memAfter - memBefore) / 1024 / 1024;
    
    expect(memUsed).toBeLessThan(50);
  });
});
`;
    fs.writeFileSync(path, testContent);
  }
}

// CLI
if (require.main === module) {
  const agents = new MigrationAgents();
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'all') {
    agents.runAll();
  } else {
    switch(args[0]) {
      case 'quality':
        agents.runQualityCheck();
        break;
      case 'security':
        agents.runSecurityCheck();
        break;
      case 'build':
        agents.runBuildValidation();
        break;
      case 'performance':
        agents.runPerformanceCheck();
        break;
      case 'tests':
        agents.runTests();
        break;
      case 'architecture':
        agents.runArchitectureCheck();
        break;
      default:
        Logger.error(`Unknown agent: ${args[0]}`);
        Logger.info('Available agents: quality, security, build, performance, tests, architecture, all');
        process.exit(1);
    }
  }
}

module.exports = MigrationAgents;