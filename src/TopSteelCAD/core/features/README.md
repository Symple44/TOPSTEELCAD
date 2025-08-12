# TopSteelCAD Feature System - Documentation API

## Vue d'ensemble

Le système de features TopSteelCAD est une architecture modulaire pour la modélisation et l'application de features (usinages, découpes, marquages) sur des éléments métalliques 3D. Il supporte l'ensemble des opérations standard DSTV/NC pour l'industrie métallurgique.

## Architecture

```
FeatureSystem (Singleton)
    ├── GeometryCache (LRU)
    ├── FeatureValidator
    └── Processors (13+)
         ├── HoleProcessor
         ├── TappedHoleProcessor
         ├── CounterSinkProcessor
         ├── DrillPatternProcessor
         ├── SlotProcessor
         ├── CutoutProcessor
         ├── ContourProcessor
         ├── NotchProcessor
         ├── CopingProcessor
         ├── BevelProcessor
         ├── ChamferProcessor
         ├── MarkingProcessor
         └── TextProcessor
```

## API Principale

### FeatureSystem

Gestionnaire principal du système de features.

```typescript
import { FeatureSystem } from '@/TopSteelCAD/core/features/FeatureSystem';

// Obtenir l'instance singleton
const featureSystem = FeatureSystem.getInstance({
  cacheEnabled: true,
  cacheSize: 100,
  validateFeatures: true,
  optimizeGeometry: true
});

// Appliquer des features
const result = featureSystem.applyFeatures(
  baseGeometry,  // THREE.BufferGeometry
  features,       // Feature[]
  element        // PivotElement
);

// result: FeatureResult
// {
//   geometry: THREE.BufferGeometry,
//   boundingBox: THREE.Box3,
//   volume: number,
//   success: boolean,
//   errors?: string[],
//   warnings?: string[]
// }
```

### Types de Features

```typescript
enum FeatureType {
  // Trous et perçages
  HOLE = 'hole',
  TAPPED_HOLE = 'tapped_hole',
  COUNTERSINK = 'countersink',
  COUNTERBORE = 'counterbore',
  DRILL_PATTERN = 'drill_pattern',
  
  // Découpes et contours
  SLOT = 'slot',
  CUTOUT = 'cutout',
  CONTOUR = 'contour',
  NOTCH = 'notch',
  COPING = 'coping',
  
  // Finitions
  CHAMFER = 'chamfer',
  BEVEL = 'bevel',
  
  // Marquages et textes
  MARKING = 'marking',
  TEXT = 'text',
  
  // Soudures
  WELD = 'weld'
}
```

### Structure d'une Feature

```typescript
interface Feature {
  id: string;
  type: FeatureType;
  coordinateSystem: CoordinateSystem;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  face?: ProfileFace;
  parameters: FeatureParameters;
  metadata?: Record<string, any>;
}
```

## Exemples d'utilisation

### 1. Créer un trou standard

```typescript
const holeFeature: Feature = {
  id: 'hole-1',
  type: FeatureType.HOLE,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(500, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  face: ProfileFace.WEB,
  parameters: {
    diameter: 22,
    depth: -1  // -1 = traversant
  }
};
```

### 2. Créer un trou taraudé

```typescript
const tappedHoleFeature: Feature = {
  id: 'tapped-1',
  type: FeatureType.TAPPED_HOLE,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(1000, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  parameters: {
    diameter: 20,
    depth: 30,
    threadType: 'metric',
    threadPitch: 2.5,
    threadClass: '6H'
  }
};
```

### 3. Créer un fraisage

```typescript
const countersinkFeature: Feature = {
  id: 'countersink-1',
  type: FeatureType.COUNTERSINK,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(1500, 50, 140),
  rotation: new THREE.Euler(0, 0, 0),
  face: ProfileFace.TOP_FLANGE,
  parameters: {
    diameter: 12,
    sinkDiameter: 24,
    sinkDepth: 6,
    sinkAngle: 90,
    sinkType: 'countersink'
  }
};
```

### 4. Créer un motif de perçage

```typescript
// Motif linéaire
const linearPattern: Feature = {
  id: 'pattern-linear',
  type: FeatureType.DRILL_PATTERN,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(2000, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  parameters: {
    patternType: 'linear',
    count: 5,
    spacing: 100,
    diameter: 12
  }
};

// Motif circulaire
const circularPattern: Feature = {
  id: 'pattern-circular',
  type: FeatureType.DRILL_PATTERN,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(3000, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  parameters: {
    patternType: 'circular',
    count: 8,
    radius: 80,
    diameter: 10,
    startAngle: 0
  }
};

// Motif rectangulaire
const rectangularPattern: Feature = {
  id: 'pattern-rectangular',
  type: FeatureType.DRILL_PATTERN,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(4000, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  parameters: {
    patternType: 'rectangular',
    rows: 3,
    columns: 4,
    rowSpacing: 50,
    columnSpacing: 60,
    diameter: 8
  }
};
```

### 5. Créer un contour complexe avec arcs

```typescript
const contourFeature: Feature = {
  id: 'contour-1',
  type: FeatureType.CONTOUR,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(0, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  parameters: {
    points: [
      new THREE.Vector2(-200, -150),
      new THREE.Vector2(-100, -150),
      new THREE.Vector2(-100, -50),
      new THREE.Vector2(0, -50),
      new THREE.Vector2(0, 50),
      new THREE.Vector2(100, 50),
      new THREE.Vector2(100, 150),
      new THREE.Vector2(-200, 150)
    ],
    closed: true,
    bulge: [0, 0.5, 0, -0.3, 0, 0, 0.7, 0]  // Arcs sur segments 2, 4 et 7
  }
};
```

### 6. Créer une découpe d'adaptation (coping)

```typescript
const copingFeature: Feature = {
  id: 'coping-1',
  type: FeatureType.COPING,
  coordinateSystem: CoordinateSystem.LOCAL,
  position: new THREE.Vector3(5900, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  parameters: {
    copingType: 'profile_fit',
    targetProfile: 'HEB200',
    angle: 90,
    clearance: 2
  }
};
```

## Intégration avec les Renderers

### MachinedElementRenderer (avec CSG)

```typescript
import { MachinedElementRenderer } from '@/TopSteelCAD/components/TopSteelViewer/core/MachinedElementRenderer';

<MachinedElementRenderer
  element={element}
  isSelected={isSelected}
  isHighlighted={isHighlighted}
  onClick={handleClick}
  onPointerOver={handleHover}
  onPointerOut={handleOut}
/>
```

### SimpleMachinedElement (superposition visuelle)

```typescript
import { SimpleMachinedElement } from '@/TopSteelCAD/components/TopSteelViewer/core/SimpleMachinedRenderer';

<SimpleMachinedElement
  element={element}
  isSelected={isSelected}
  isHighlighted={isHighlighted}
  useFeatureSystem={true}  // Active le nouveau système
/>
```

## Conversion DSTV

### Utilisation de l'adaptateur

```typescript
import { DSTVFeatureAdapter } from '@/TopSteelCAD/parsers/DSTVFeatureAdapter';

const adapter = new DSTVFeatureAdapter();

// Convertir une feature DSTV
const dstvFeature = {
  type: 'hole',
  position: [500, 0, 0],
  diameter: 22,
  depth: -1,
  metadata: { boltHole: true }
};

const feature = adapter.convertFeature(dstvFeature, 'IPE300');

// Convertir plusieurs features
const features = adapter.convertFeatures(dstvFeatures, profileType);
```

## PositionCalculator

Convertit les coordonnées DSTV vers l'espace 3D Three.js.

```typescript
import { PositionCalculator } from '@/TopSteelCAD/core/features/utils/PositionCalculator';

const calculator = new PositionCalculator();

const position3D = calculator.calculateFeaturePosition(
  element,        // PivotElement
  featurePos,     // THREE.Vector3 (coordonnées DSTV)
  face           // ProfileFace (optionnel)
);

// position3D: Position3D
// {
//   position: [x, y, z],
//   rotation: [rx, ry, rz],
//   face: ProfileFace,
//   depth: number,
//   normal: THREE.Vector3
// }
```

## Configuration

### Options du système

```typescript
interface FeatureSystemConfig {
  cacheEnabled: boolean;      // Active le cache LRU
  cacheSize: number;          // Taille max du cache
  validateFeatures: boolean;  // Valide les features
  optimizeGeometry: boolean;  // Optimise la géométrie finale
  mergeVertices: boolean;     // Fusionne les vertices proches
  tolerances: {
    position: number;         // Tolérance position (mm)
    angle: number;           // Tolérance angle (rad)
    hole: number;            // Tolérance trous (mm)
    cut: number;             // Tolérance découpes (mm)
  };
}
```

### Configuration par défaut

```typescript
const defaultConfig: FeatureSystemConfig = {
  cacheEnabled: true,
  cacheSize: 100,
  validateFeatures: true,
  optimizeGeometry: true,
  mergeVertices: true,
  tolerances: {
    position: 1.0,
    angle: 0.01,
    hole: 0.5,
    cut: 0.5
  }
};
```

## Performance

### Optimisations

1. **Cache LRU** : Géométries mises en cache avec éviction intelligente
2. **Traitement par batch** : Features du même type traitées ensemble
3. **Validation asynchrone** : Validation en parallèle
4. **Géométrie optimisée** : Vertices fusionnés, normales recalculées

### Statistiques

```typescript
const stats = featureSystem.getStatistics();
// {
//   cacheStats: {
//     size: 45,
//     hitRate: 0.78,
//     mostAccessed: ['key1', 'key2', ...]
//   },
//   processorsCount: 13,
//   config: { ... }
// }
```

## Tests

### Exécuter les tests

```bash
npm test -- processors.test.ts
npm test -- PositionCalculator.test.ts
```

### Couverture des tests

- ✅ Tous les processeurs
- ✅ Positionnement 3D
- ✅ Conversion DSTV
- ✅ Validation des features
- ✅ Cache et optimisations

## Dépannage

### Erreurs communes

1. **"Feature position out of bounds"**
   - Vérifier que la position est dans les limites de l'élément
   - Ajuster les tolérances si nécessaire

2. **"No processor found for feature type"**
   - Vérifier que le type de feature est supporté
   - Enregistrer un processeur custom si besoin

3. **"Holes overlap"**
   - Les trous sont trop proches
   - Augmenter l'espacement ou la tolérance

### Debug

```typescript
// Activer les logs détaillés
console.log('[FeatureSystem] Processing:', features);
console.log('[FeatureSystem] Result:', result);

// Vérifier le cache
console.log('Cache stats:', featureSystem.getStatistics());

// Valider manuellement
const errors = validator.validateFeatures(features, element);
console.log('Validation errors:', errors);
```

## Extension

### Créer un processeur custom

```typescript
import { IFeatureProcessor, ProcessorResult } from '@/TopSteelCAD/core/features/types';

class CustomProcessor implements IFeatureProcessor {
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    // Implémenter la logique
    return {
      success: true,
      geometry: modifiedGeometry
    };
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    // Valider les paramètres
    return errors;
  }
  
  dispose(): void {
    // Nettoyer les ressources
  }
}

// Enregistrer le processeur
featureSystem.registerProcessor(FeatureType.CUSTOM, new CustomProcessor());
```

## Support

Pour toute question ou problème :
- Consulter les tests unitaires pour des exemples
- Vérifier la démo dans `FeatureShowcase.ts`
- Ouvrir une issue sur le repository