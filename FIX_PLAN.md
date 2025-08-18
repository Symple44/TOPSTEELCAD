# Plan de Correction TOPSTEELCAD

## 🚨 Corrections Urgentes (Pour compiler)

### 1. Créer le Logger manquant
```typescript
// src/TopSteelCAD/utils/Logger.ts
export class Logger {
  static debug(message: string, ...args: any[]) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
  
  static info(message: string, ...args: any[]) {
    console.info(`[INFO] ${message}`, ...args);
  }
  
  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }
  
  static error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
```

### 2. Corriger les types dans FeatureParameters
```typescript
// src/TopSteelCAD/core/features/types.ts
export interface FeatureParameters {
  // Existants
  diameter?: number;
  depth?: number;
  
  // À ajouter
  contourPoints?: Array<{x: number, y: number}>;
  bevelAngle?: number;
  bevelSize?: number;
  face?: ProfileFace;
  subContours?: Array<Array<{x: number, y: number}>>;
  operation?: 'union' | 'subtract' | 'intersect';
  isBeveled?: boolean;
  isCompound?: boolean;
}
```

### 3. Corriger CameraConfig
```typescript
// src/TopSteelCAD/cameras/types.ts (ou où CameraConfig est défini)
export interface CameraConfig {
  // Existants...
  minZoom?: number; // Ajouter cette propriété
}
```

### 4. Corriger les énumérations FeatureType
- Remplacer `FeatureType.COUNTER_SINK` par `FeatureType.COUNTERSINK`
- Remplacer `FeatureType.hole` par `FeatureType.HOLE`

### 5. Corriger les types Vector3/Euler
Dans FeatureBuilder.ts, remplacer :
```typescript
// Ancien
position: [0, 0, 0]
rotation: [0, 0, 0]

// Nouveau
position: new THREE.Vector3(0, 0, 0)
rotation: new THREE.Euler(0, 0, 0)
```

## ✅ État Après Corrections

Une fois ces corrections appliquées :
1. Le projet devrait compiler sans erreurs
2. L'import DSTV devrait fonctionner avec le parser existant
3. Les features devraient s'appliquer correctement

## 📊 Architecture Simplifiée Recommandée

```
TOPSTEELCAD/
├── src/
│   ├── core/           # Moteur 3D
│   ├── parsers/        # DSTVParser existant
│   ├── features/       # Système de features
│   ├── viewer/         # Composants viewer
│   ├── ui/            # Interface React
│   └── utils/         # Utilitaires (Logger, etc.)
```

## 🎯 Prochaines Étapes

1. **Immédiat** : Appliquer les corrections ci-dessus
2. **Court terme** : Tester l'import d'un fichier DSTV
3. **Moyen terme** : Optimiser les performances
4. **Long terme** : Ajouter plus de formats d'import

## Notes

- Le parser DSTV existant est complet et fonctionnel
- Pas besoin d'utiliser @erp/utils pour l'instant
- Focus sur la stabilisation avant d'ajouter des features