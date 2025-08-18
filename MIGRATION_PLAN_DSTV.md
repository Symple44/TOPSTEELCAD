# 🚀 Plan de Migration Complet - Parser DSTV Modulaire

## 📊 Vue d'ensemble
Migration complète du parser monolithique (1448 lignes) vers l'architecture modulaire avec **59 tâches** organisées en **9 phases** et **7 agents automatisés**.

---

## 📋 Phase 1: Analyse et Préparation
**Objectif**: Comprendre l'écart entre les deux implémentations

### Tâches
- [ ] Créer une matrice de comparaison des fonctionnalités
- [ ] Identifier toutes les features à migrer
- [ ] Créer des tests de régression basés sur le parser actuel
- [ ] Sauvegarder des fichiers DSTV de test pour validation

### Checklist de Features à Migrer
```typescript
// Parser Monolithique - Features à porter
✅ Lexer avancé:
  - Trous oblongs (modificateur 'l')
  - Faces composées (v...u -> web)
  - Notation scientifique
  - Commentaires (**)

✅ Blocs DSTV:
  - ST: 16 champs de données
  - BO: Trous (round, slotted, square, rectangular)
  - AK: Contours externes avec détection découpes
  - IK: Contours internes
  - SI: Marquages avec angles
  - SC: Coupes
  - BR: Chanfreins
  - PU: Program units
  - KO: Commentaires

✅ Logique métier:
  - Détection forme base vs découpe
  - Découpes transversales
  - Contours complexes (9+ points)
  - Calcul des bounds
  - Détection types matériaux
```

---

## 📦 Phase 2: Migration du Lexer
**Objectif**: Porter toutes les capacités de tokenisation

### Tâches Détaillées
```typescript
// DSTVLexer.ts - Améliorations nécessaires

class DSTVLexer {
  tokenize(content: string): DSTVToken[] {
    // AJOUTER:
    
    // 1. Trous oblongs
    if (cleanPart.includes('l')) {
      holeType = 'slotted';
      slottedLength = parseFloat(parts[i + 1]);
      slottedAngle = parseFloat(parts[i + 2]);
    }
    
    // 2. Faces composées
    if (line.match(/^v\s+[\d.-]+u$/)) {
      face = 'o'; // web pour notation v...u
    }
    
    // 3. Notation scientifique
    if (/^[+-]?\d*\.?\d+([eE][+-]?\d+)?$/.test(part)) {
      // Parser correctement
    }
    
    // 4. Commentaires
    if (line.startsWith('**')) {
      token.type = TokenType.COMMENT;
    }
  }
}
```

### 🔧 Agent: Quality Check
```bash
npm run lint src/TopSteelCAD/parsers/dstv/lexer/
npm run typecheck
npm test -- DSTVLexer
```

---

## 🔨 Phase 3: Migration des Block Parsers
**Objectif**: Enrichir tous les parsers de blocs

### STBlockParser - Données Complètes
```typescript
interface STBlockData {
  // Actuellement: 3 champs
  // À migrer: 16 champs
  orderNumber: string;      // Ligne 1
  id: string;              // Ligne 2
  quantity: number;        // Ligne 3
  steelGrade: string;      // Ligne 4
  profile: string;         // Ligne 5
  designation: string;     // Ligne 6
  length: number;          // Ligne 8
  height: number;          // Ligne 9
  width: number;           // Ligne 10
  webThickness: number;    // Ligne 12
  flangeThickness: number; // Ligne 13
  weight: number;          // Ligne 14
  paintingSurface: number; // Ligne 15
  // + autres métadonnées
}
```

### BOBlockParser - Trous Avancés
```typescript
interface DSTVHole {
  // Support complet des types
  type: 'round' | 'slotted' | 'square' | 'rectangular';
  
  // Pour trous oblongs
  slottedLength?: number;
  slottedAngle?: number;
  
  // Pour trous rectangulaires
  width?: number;
  height?: number;
  
  // Détection face web (v...u)
  face: ProfileFace;
}
```

### AKBlockParser - Logique Complexe
```typescript
class AKBlockParser {
  parse(tokens: DSTVToken[]): DSTVCut[] {
    // AJOUTER:
    
    // 1. Détection forme base vs découpe
    if (this.isBaseShapeContour(points, profile)) {
      return null; // Pas une découpe
    }
    
    // 2. Extraction région de découpe
    const cutRegion = this.extractCutRegion(points, profile);
    
    // 3. Détection découpe transversale
    if (profile.length > maxContourLength + 10) {
      cuts.push(this.createTransverseCut());
    }
    
    // 4. Gestion contours 9+ points (encoches)
    if (points.length === 9) {
      const notch = this.extractNotch(points);
    }
  }
}
```

### Nouveaux Parsers à Créer
- [ ] **IKBlockParser**: Contours internes
- [ ] **SCBlockParser**: Coupes/Schneiden
- [ ] **BRBlockParser**: Chanfreins/Brechen
- [ ] **PUBlockParser**: Program units
- [ ] **KOBlockParser**: Commentaires

### 🔧 Agent: Security Check
```bash
# Scanner pour vulnérabilités
npm audit
# Vérifier injections possibles
grep -r "eval\|Function\|innerHTML" src/TopSteelCAD/parsers/dstv/
# Valider les limites
npm run test:security
```

---

## 🎯 Phase 4: Migration du Converter
**Objectif**: Conversion complète sans perte de données

### DSTVToPivotConverter - Enrichissement
```typescript
class DSTVToPivotConverter {
  convertProfile(profile: DSTVProfile): PivotElement {
    // CORRIGER la structure:
    
    return {
      id: profile.id,
      name: profile.designation,
      materialType: this.detectMaterialType(profile.designation),
      
      // Dimensions complètes
      dimensions: {
        length: profile.length,
        width: profile.width,
        height: profile.height,
        thickness: profile.thickness,
        webThickness: profile.webThickness,
        flangeThickness: profile.flangeThickness
      },
      
      // Matériau complet
      material: {
        grade: profile.steelGrade,
        density: 7850,
        color: '#4b5563',
        metallic: 0.7,
        roughness: 0.3
      },
      
      // Métadonnées essentielles
      metadata: {
        weight: profile.weight,
        paintingSurface: profile.paintingSurface,
        features: this.convertAllFeatures(profile),
        contours: profile.contours,
        source: 'DSTV'
      }
    };
  }
  
  // Détection complète des types
  detectMaterialType(designation: string): MaterialType {
    const patterns = {
      BEAM: /IPE|HEA|HEB|HEM|UB|UC/,
      CHANNEL: /UPN|UAP|UPE/,
      ANGLE: /^L\s*\d/,
      TUBE: /RHS|CHS|SHS|TUBE/,
      PLATE: /^PL|PLAT|PLATE/,
      // ... tous les types
    };
  }
}
```

### 🔧 Agent: Build Validation
```bash
# Compiler
npm run build

# Vérifier les types
npm run typecheck

# Analyser le bundle
npm run analyze

# Vérifier les imports
npm run lint:unused
```

---

## 🛡️ Phase 5: Validation et Sécurité
**Objectif**: Robustesse et fiabilité

### DSTVValidator - Complet
```typescript
class DSTVValidator {
  // AJOUTER la validation du fichier brut
  validate(data: string | ArrayBuffer): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Vérifier la structure
    if (!this.hasValidStructure(data)) {
      errors.push('Invalid DSTV structure');
    }
    
    // 2. Vérifier les limites
    if (data.length > this.config.maxFileSize) {
      errors.push('File too large');
    }
    
    // 3. Scanner les commandes
    const commands = this.extractCommands(data);
    if (!this.validateCommands(commands)) {
      errors.push('Unknown commands found');
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  // Détection trous superposés
  validateHoleOverlaps(holes: DSTVHole[]): string[] {
    const warnings: string[] = [];
    for (let i = 0; i < holes.length; i++) {
      for (let j = i + 1; j < holes.length; j++) {
        if (this.holesOverlap(holes[i], holes[j])) {
          warnings.push(`Holes ${i} and ${j} overlap`);
        }
      }
    }
    return warnings;
  }
}
```

### ErrorHandler Centralisé
```typescript
// core/ErrorHandler.ts
export class DSTVErrorHandler {
  private static errors = new Map<string, ErrorDefinition>();
  
  static {
    // Définir tous les codes d'erreur
    this.register('DSTV001', 'Invalid file structure');
    this.register('DSTV002', 'Missing ST block');
    this.register('DSTV003', 'Invalid token type');
    // ...
  }
  
  static handle(code: string, context?: any): never {
    const error = this.errors.get(code);
    throw new DSTVError(code, error.message, context);
  }
}
```

### Logger Structuré
```typescript
// core/Logger.ts
export class DSTVLogger {
  private static instance: DSTVLogger;
  
  log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      module: 'DSTV'
    };
    
    // Output selon config
    if (this.config.console) console.log(entry);
    if (this.config.file) this.writeToFile(entry);
    if (this.config.telemetry) this.sendTelemetry(entry);
  }
}
```

### 🔧 Agent: Performance Check
```bash
# Mesurer les performances
npm run benchmark

# Profiler la mémoire
npm run profile:memory

# Analyser la complexité
npm run analyze:complexity

# Générer rapport
npm run report:performance
```

---

## 🧪 Phase 6: Tests Complets
**Objectif**: Couverture >80% et confiance totale

### Structure des Tests
```
__tests__/
├── unit/
│   ├── lexer/
│   │   ├── DSTVLexer.test.ts
│   │   ├── tokenization.test.ts
│   │   └── edge-cases.test.ts
│   ├── parsers/
│   │   ├── STBlockParser.test.ts
│   │   ├── BOBlockParser.test.ts
│   │   └── ...
│   └── validators/
│       └── DSTVValidator.test.ts
├── integration/
│   ├── end-to-end.test.ts
│   ├── real-files.test.ts
│   └── regression.test.ts
├── performance/
│   ├── benchmark.test.ts
│   └── memory.test.ts
└── security/
    ├── injection.test.ts
    └── overflow.test.ts
```

### Tests de Régression
```typescript
// regression.test.ts
describe('DSTV Parser Regression', () => {
  const oldParser = new DSTVParser(); // Ancien
  const newParser = new ModularDSTVParser(); // Nouveau
  
  testFiles.forEach(file => {
    it(`should produce same output for ${file}`, async () => {
      const oldResult = await oldParser.parse(file);
      const newResult = await newParser.parse(file);
      
      // Comparer les résultats
      expect(newResult.elements).toEqual(oldResult.elements);
      expect(newResult.metadata).toEqual(oldResult.metadata);
    });
  });
});
```

### 🔧 Agent: Test Runner
```bash
# Exécuter tous les tests
npm test

# Coverage report
npm run test:coverage

# Tests de sécurité
npm run test:security

# Tests de performance
npm run test:performance

# Rapport complet
npm run test:report
```

---

## ⚡ Phase 7: Optimisations
**Objectif**: Performance maximale

### GeometryCache LRU
```typescript
// core/features/cache/GeometryCache.ts
export class GeometryCache {
  private cache = new LRUCache<string, BufferGeometry>({
    max: 100 * 1024 * 1024, // 100MB
    ttl: 5 * 60 * 1000,      // 5 minutes
    dispose: (geometry) => geometry.dispose()
  });
  
  get(key: string): BufferGeometry | null {
    const hit = this.cache.get(key);
    if (hit) this.metrics.hits++;
    else this.metrics.misses++;
    return hit;
  }
}
```

### FeatureBatcher
```typescript
// core/features/batch/FeatureBatcher.ts
export class FeatureBatcher {
  batch(features: Feature[], batchSize = 100): BatchedFeatures[] {
    const batches: BatchedFeatures[] = [];
    
    // Grouper par type et face
    const grouped = this.groupByTypeAndFace(features);
    
    // Créer des batches optimaux
    for (const group of grouped) {
      if (group.length > batchSize) {
        batches.push(...this.splitIntoBatches(group, batchSize));
      } else {
        batches.push(new BatchedFeatures(group));
      }
    }
    
    return batches;
  }
  
  async processBatches(batches: BatchedFeatures[]): Promise<void> {
    // Traitement parallèle avec limite
    const limit = pLimit(4); // Max 4 threads
    
    await Promise.all(
      batches.map(batch => 
        limit(() => this.processBatch(batch))
      )
    );
  }
}
```

### PerformanceMonitor
```typescript
// core/metrics/PerformanceMonitor.ts
export class PerformanceMonitor {
  private metrics = new Map<string, Metric>();
  
  startTimer(name: string): void {
    this.metrics.set(name, {
      start: performance.now(),
      memory: process.memoryUsage()
    });
  }
  
  endTimer(name: string): MetricResult {
    const metric = this.metrics.get(name);
    if (!metric) return null;
    
    return {
      duration: performance.now() - metric.start,
      memoryDelta: this.calculateMemoryDelta(metric.memory),
      timestamp: new Date()
    };
  }
  
  report(): PerformanceReport {
    return {
      parseTime: this.getMetric('parse'),
      tokenizeTime: this.getMetric('tokenize'),
      convertTime: this.getMetric('convert'),
      cacheHitRate: this.cache.getHitRate(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
  }
}
```

### 🔧 Agent: Architecture Check
```bash
# Vérifier les patterns
npm run check:patterns

# Analyser les dépendances
npm run analyze:dependencies

# Détecter les cycles
npm run detect:cycles

# Valider l'architecture
npm run validate:architecture
```

---

## 🔄 Phase 8: Migration et Transition
**Objectif**: Migration sans interruption

### Mode Compatibilité
```typescript
// parsers/DSTVParserAdapter.ts
export class DSTVParserAdapter {
  private useNewParser: boolean;
  private oldParser: DSTVParser;
  private newParser: ModularDSTVParser;
  
  constructor(config: { useNew?: boolean }) {
    this.useNewParser = config.useNew ?? false;
    this.oldParser = new DSTVParser();
    this.newParser = new ModularDSTVParser();
  }
  
  async parse(data: string | ArrayBuffer): Promise<PivotScene> {
    if (this.useNewParser) {
      try {
        return await this.newParser.parse(data);
      } catch (error) {
        console.warn('New parser failed, falling back', error);
        return await this.oldParser.parse(data);
      }
    }
    return await this.oldParser.parse(data);
  }
}
```

### Comparateur de Résultats
```typescript
// tools/ParserComparator.ts
export class ParserComparator {
  compare(old: PivotScene, new: PivotScene): ComparisonResult {
    const differences: Difference[] = [];
    
    // Comparer les éléments
    if (old.elements.size !== new.elements.size) {
      differences.push({
        type: 'element_count',
        old: old.elements.size,
        new: new.elements.size
      });
    }
    
    // Comparer les features
    for (const [id, oldElement] of old.elements) {
      const newElement = new.elements.get(id);
      if (!newElement) {
        differences.push({ type: 'missing_element', id });
        continue;
      }
      
      // Comparer en détail
      this.compareElements(oldElement, newElement, differences);
    }
    
    return {
      identical: differences.length === 0,
      differences,
      similarity: this.calculateSimilarity(old, new)
    };
  }
}
```

### 🔧 Agent: Final Quality Check
```bash
# Validation complète
npm run validate:all

# Rapport de qualité
npm run quality:report

# Audit de sécurité
npm audit fix

# Documentation
npm run docs:generate
```

---

## 🚀 Phase 9: Finalisation
**Objectif**: Déploiement en production

### Checklist Finale
- [ ] Tous les tests passent (>80% coverage)
- [ ] Performance validée (<100ms pour 1MB)
- [ ] Mémoire optimisée (<50MB)
- [ ] Documentation complète
- [ ] Guide de migration créé
- [ ] Équipe formée

### Migration Guide
```markdown
# Guide de Migration DSTV Parser

## Breaking Changes
- Types renommés: DSTVTokenOld -> DSTVToken
- Face system: 'v/u/o' -> ProfileFace enum
- API changes: voir tableau ci-dessous

## Migration Steps
1. Installer la nouvelle version
2. Mettre à jour les imports
3. Adapter les types
4. Tester en mode compatibilité
5. Basculer en production

## API Mapping
| Ancien | Nouveau |
|--------|---------|
| DSTVParser | ModularDSTVParser |
| parse() | parse() (identique) |
| validate() | validate() (enrichi) |
```

### 🔧 Agent: Deployment Check
```bash
# Pre-deployment
npm run predeploy:check

# Build production
npm run build:prod

# Run smoke tests
npm run test:smoke

# Deploy
npm run deploy

# Post-deployment verification
npm run postdeploy:verify
```

---

## 📊 Métriques de Succès

| Métrique | Actuel | Cible | Status |
|----------|---------|--------|---------|
| Lignes par fichier | 1448 | <200 | ⏳ |
| Complexité cyclomatique | >30 | <10 | ⏳ |
| Couverture tests | ~0% | >80% | ⏳ |
| Temps parsing (1MB) | ? | <100ms | ⏳ |
| Mémoire utilisée | ? | <50MB | ⏳ |
| Vulnérabilités | ? | 0 | ⏳ |

---

## 🤖 Agents Automatisés

### Configuration des Agents
```typescript
// .github/workflows/dstv-migration.yml
name: DSTV Migration Pipeline

on:
  push:
    paths:
      - 'src/TopSteelCAD/parsers/dstv/**'

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run lint
      - run: npm run typecheck
  
  security-check:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit
      - run: npm run scan:security
  
  build-validation:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: npm run test
  
  performance-check:
    runs-on: ubuntu-latest
    steps:
      - run: npm run benchmark
      - run: npm run profile
```

### Scripts NPM pour Agents
```json
{
  "scripts": {
    "agent:quality": "npm run lint && npm run typecheck",
    "agent:security": "npm audit && npm run scan:security",
    "agent:build": "npm run build && npm run test",
    "agent:performance": "npm run benchmark && npm run profile",
    "agent:test": "npm run test:all && npm run test:coverage",
    "agent:architecture": "npm run check:patterns && npm run analyze:deps",
    "agent:deploy": "npm run predeploy && npm run deploy && npm run postdeploy",
    "agent:all": "npm run agent:quality && npm run agent:security && npm run agent:build"
  }
}
```

---

## ⏱️ Timeline Estimée

| Phase | Durée | Dépendances | Priorité |
|-------|-------|-------------|----------|
| Phase 1 | 1 jour | - | 🔴 Critique |
| Phase 2 | 2 jours | Phase 1 | 🔴 Critique |
| Phase 3 | 3 jours | Phase 2 | 🔴 Critique |
| Phase 4 | 2 jours | Phase 3 | 🔴 Critique |
| Phase 5 | 2 jours | Phase 4 | 🟠 Important |
| Phase 6 | 3 jours | Phase 5 | 🟠 Important |
| Phase 7 | 2 jours | Phase 6 | 🟡 Nice-to-have |
| Phase 8 | 2 jours | Phase 7 | 🟠 Important |
| Phase 9 | 1 jour | Phase 8 | 🔴 Critique |

**Total: ~18 jours de développement**

---

## 🚨 Points d'Attention

### Risques Critiques
1. **Régression fonctionnelle** - Mitigation: Tests exhaustifs
2. **Performance dégradée** - Mitigation: Benchmarks continus
3. **Incompatibilité API** - Mitigation: Mode compatibilité

### Dépendances Externes
- Three.js pour les géométries
- TypeScript 5.x minimum
- Node.js 18+ pour performances

### Ressources Nécessaires
- Développeur senior TypeScript
- Accès fichiers DSTV réels
- Environnement de test isolé
- CI/CD pipeline configuré

---

*Plan de migration créé le ${new Date().toISOString()}*
*59 tâches | 9 phases | 7 agents automatisés*