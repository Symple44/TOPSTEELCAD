# Architecture de Coupe Modulaire

## Vue d'ensemble

La nouvelle architecture de coupe remplace l'ancien `CutProcessor` monolithique (2345 lignes) par un système modulaire basé sur des handlers spécialisés. Cette architecture permet une meilleure maintenabilité, testabilité et extensibilité.

## 🏗️ Structure

```
cut/
├── types/           # Types et interfaces
│   ├── CutTypes.ts         # Enums et types de coupe
│   ├── ICutHandler.ts      # Interfaces des handlers
│   └── CoreTypes.ts        # Types centralisés
├── core/            # Composants principaux
│   ├── BaseCutHandler.ts   # Classe abstraite de base
│   ├── CutTypeDetector.ts  # Détection automatique des types
│   └── CutHandlerFactory.ts # Factory pour les handlers
├── handlers/        # Handlers spécialisés (13)
│   ├── PartialNotchHandler.ts  # Priority: 100
│   ├── NotchHandler.ts         # Priority: 95
│   ├── EndCutHandler.ts        # Priority: 90
│   ├── CompoundCutHandler.ts   # Priority: 85
│   ├── CopingCutHandler.ts     # Priority: 80
│   ├── BevelCutHandler.ts      # Priority: 75
│   ├── ExteriorCutHandler.ts   # Priority: 70
│   ├── InteriorCutHandler.ts   # Priority: 60
│   ├── AngleCutHandler.ts      # Priority: 55
│   ├── StraightCutHandler.ts   # Priority: 50
│   ├── TransverseCutHandler.ts # Priority: 45
│   ├── SlotCutHandler.ts       # Priority: 40
│   └── LegacyFallbackHandler.ts # Priority: 0
├── services/        # Services partagés
│   ├── CSGOperationService.ts   # Opérations booléennes
│   └── GeometryCreationService.ts # Création de géométries
├── adapters/        # Adaptateurs pour migration
│   └── CutProcessorAdapter.ts   # Bridge vers l'ancien système
└── utils/           # Utilitaires
    └── CutLogger.ts             # Logging et monitoring
```

## 🚀 Utilisation

### Migration Progressive

```typescript
import { FeatureProcessorFactory } from './FeatureProcessorFactory';

// Obtenir l'instance singleton
const factory = FeatureProcessorFactory.getInstance();

// Activer la nouvelle architecture
factory.setUseNewCutArchitecture(true);

// Vérifier le statut
console.log(factory.isUsingNewCutArchitecture()); // true
```

### Modes de l'Adapter

```typescript
import { getCutProcessorAdapter, AdapterMode } from './cut/adapters/CutProcessorAdapter';

// Mode 1: Ancienne architecture seulement
const legacyAdapter = getCutProcessorAdapter({
  mode: AdapterMode.LEGACY_ONLY
});

// Mode 2: Nouvelle architecture seulement
const newAdapter = getCutProcessorAdapter({
  mode: AdapterMode.NEW_ONLY
});

// Mode 3: Hybride (recommandé pour migration)
const hybridAdapter = getCutProcessorAdapter({
  mode: AdapterMode.HYBRID,
  fallbackToLegacy: true
});

// Mode 4: Migration avec logging détaillé
const migrationAdapter = getCutProcessorAdapter({
  mode: AdapterMode.MIGRATION,
  enableLogging: true,
  logLevel: 'debug'
});
```

## 📊 Handlers et Priorités

Les handlers sont sélectionnés par priorité décroissante :

| Handler | Priorité | Description | Blocks DSTV |
|---------|----------|-------------|-------------|
| `PartialNotchHandler` | 100 | Encoches partielles complexes (M1002) | AK/IK partiels |
| `NotchHandler` | 95 | Encoches génériques | Tous types d'encoches |
| `EndCutHandler` | 90 | Coupes d'extrémité | AK en bout |
| `CompoundCutHandler` | 85 | Coupes composées multi-angles | Multiples |
| `CopingCutHandler` | 80 | Préparations d'assemblage | - |
| `BevelCutHandler` | 75 | Biseaux pour soudure | BR |
| `ExteriorCutHandler` | 70 | Contours extérieurs | AK |
| `InteriorCutHandler` | 60 | Contours intérieurs | IK |
| `AngleCutHandler` | 55 | Coupes angulaires | AK/IK avec angle |
| `StraightCutHandler` | 50 | Coupes droites simples | - |
| `TransverseCutHandler` | 45 | Coupes transversales | - |
| `SlotCutHandler` | 40 | Rainures et fentes | SC |
| `LegacyFallbackHandler` | 0 | Fallback pour compatibilité | Tous |

## 🔧 Configuration

### Initialisation du système

```typescript
import { initializeCutSystem } from './cut';

initializeCutSystem({
  enableLogging: true,
  logLevel: 'info',
  maxCSGComplexity: 10000,
  customHandlers: [
    // Ajouter des handlers personnalisés
    new MyCustomHandler()
  ]
});
```

### Créer un handler personnalisé

```typescript
import { BaseCutHandler } from './cut/core/BaseCutHandler';
import { CutType } from './cut/types/CutTypes';

export class MyCustomHandler extends BaseCutHandler {
  readonly name = 'MyCustomHandler';
  readonly supportedTypes = [CutType.CUSTOM];
  readonly priority = 65;

  protected canHandleSpecific(feature: Feature): boolean {
    // Logique de détection
    return feature.parameters.customType === 'myType';
  }

  protected validateSpecific(
    feature: Feature,
    element: PivotElement,
    errors: string[],
    warnings: string[]
  ): void {
    // Validation spécifique
  }

  protected requiresContourPoints(): boolean {
    return true;
  }

  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry {
    // Créer la géométrie
    return new THREE.BoxGeometry(100, 50, 10);
  }

  protected detectCutType(feature: Feature): CutType {
    return CutType.CUSTOM;
  }
}
```

## 📈 Monitoring et Performance

### Logger intégré

```typescript
import { cutLogger, LogLevel } from './cut/utils/CutLogger';

// Configurer le niveau de log
cutLogger.setLevel(LogLevel.DEBUG);

// Logging automatique des performances
cutLogger.logPerformance('operation', () => {
  // Code à mesurer
});
```

### Métriques disponibles

```typescript
const factory = getCutHandlerFactory();
const stats = factory.getStatistics();

console.log({
  totalHandlers: stats.totalHandlers,
  handlersByType: stats.handlersByType,
  highPriorityHandlers: stats.handlersWithHighPriority
});
```

## 🔄 Migration depuis l'ancien système

### Phase 1: Test en parallèle
```typescript
// Activer le mode hybride pour tests A/B
factory.setUseNewCutArchitecture(false); // Ancien
const legacyResult = processor.process(geometry, feature, element);

factory.setUseNewCutArchitecture(true); // Nouveau
const newResult = processor.process(geometry, feature, element);

// Comparer les résultats
```

### Phase 2: Migration progressive
```typescript
// Utiliser l'adapter en mode HYBRID
const adapter = getCutProcessorAdapter({
  mode: AdapterMode.HYBRID,
  fallbackToLegacy: true
});
```

### Phase 3: Full migration
```typescript
// Passer en mode NEW_ONLY
factory.setUseNewCutArchitecture(true);
```

## 🧪 Tests

### Tests unitaires par handler
```bash
npx vitest run src/TopSteelCAD/core/features/processors/cut/__tests__
```

### Tests d'intégration DSTV
```bash
npx vitest run src/TopSteelCAD/plugins/dstv/__tests__/DSTVCutMigration.test.ts
```

### Validation complète
```bash
node validate-cut-architecture.js
```

## 📊 Couverture DSTV

| Block | Support | Handler |
|-------|---------|---------|
| AK | ✅ | ExteriorCutHandler |
| IK | ✅ | InteriorCutHandler |
| SC | ✅ | SlotCutHandler |
| BR | ✅ | BevelCutHandler |
| BO | ✅ | HoleProcessor* |
| SI | ✅ | HoleProcessor* |
| KO | ✅ | ContourCutHandler |
| ST | ⚠️ | Metadata only |
| EN | ⚠️ | Metadata only |
| PU | ✅ | MarkingProcessor* |

*Utilise les processors existants du système

## 🎯 Avantages

1. **Modularité** : Chaque type de coupe a son handler dédié
2. **Maintenabilité** : Code organisé et facile à maintenir
3. **Extensibilité** : Ajout facile de nouveaux handlers
4. **Performance** : Sélection intelligente et cache
5. **Robustesse** : Fallback automatique et error recovery
6. **Testabilité** : Chaque handler est testable indépendamment
7. **Migration douce** : Pas de breaking changes

## 📝 TODO

- [ ] Ajouter support pour blocks DSTV manquants (PL, IP, etc.)
- [ ] Optimiser les performances CSG
- [ ] Ajouter plus de tests d'intégration
- [ ] Créer une UI de debug pour visualiser les handlers
- [ ] Documenter les patterns de coupe complexes

## 📚 Références

- [DSTV Standard](http://www.bauforumstahl.de)
- [Three.js CSG](https://github.com/gkjohnson/three-bvh-csg)
- [Architecture Pattern: Strategy](https://refactoring.guru/design-patterns/strategy)