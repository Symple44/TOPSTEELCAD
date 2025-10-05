# Guide Rapide - Profils Personnalisés

## Installation & Import

```typescript
import {
  CustomProfile,
  Shape2D,
  SegmentType
} from './src/TopSteelCAD/3DLibrary/types/custom-profile.types';

import {
  createCustomProfile,
  createSimpleContour,
  createCustomTProfile,
  validateCustomProfile
} from './src/TopSteelCAD/3DLibrary/utils/customProfileHelpers';
```

---

## Cas d'Usage Rapides

### 1. Créer un Profil Rectangulaire

```typescript
const rectangle = createSimpleContour({
  type: 'rectangle',
  width: 200,
  height: 100,
  center: { x: 0, y: 0 }
});

const profile = createCustomProfile({
  name: 'Rectangle 200x100',
  designation: 'RECT-200x100',
  description: 'Profil rectangulaire simple',
  shape: { outerContour: rectangle },
  defaultMaterial: {
    grade: 'S355',
    density: 7.85
  }
});

// Résultat:
// - Aire: 200 cm²
// - Périmètre: 600 mm
// - Poids: ~15.7 kg/m
```

### 2. Créer un Profil en T

```typescript
const tProfile = createCustomTProfile(
  200,  // hauteur: 200mm
  150,  // largeur semelle: 150mm
  10,   // épaisseur âme: 10mm
  15,   // épaisseur semelle: 15mm
  'Mon Profil en T'
);

// Propriétés calculées automatiquement
console.log(tProfile.properties.area);      // Aire en cm²
console.log(tProfile.properties.centroid);  // Centre de gravité
console.log(tProfile.weight);               // Poids kg/m
```

### 3. Créer un Profil avec Trou

```typescript
const outerContour = createSimpleContour({
  type: 'rectangle',
  width: 300,
  height: 200
});

const hole = createSimpleContour({
  type: 'circle',
  radius: 40,
  center: { x: 0, y: 0 }
});

const profile = createCustomProfile({
  name: 'Plaque Percée',
  designation: 'PLATE-300x200-H80',
  shape: {
    outerContour,
    holes: [hole]
  },
  defaultMaterial: { grade: 'S355', density: 7.85 }
});

// L'aire est calculée automatiquement: aire_rectangle - aire_trou
```

### 4. Profil avec Coins Arrondis

```typescript
const profile = {
  outerContour: {
    segments: [
      // Ligne
      { type: SegmentType.LINE, start: {x: 10, y: 0}, end: {x: 90, y: 0} },

      // Arc de coin
      {
        type: SegmentType.ARC,
        center: {x: 90, y: 10},
        radius: 10,
        startAngle: -Math.PI/2,
        endAngle: 0
      },

      // Ligne
      { type: SegmentType.LINE, start: {x: 100, y: 10}, end: {x: 100, y: 90} },

      // ... autres segments
    ]
  }
};
```

---

## Validation

```typescript
const result = validateCustomProfile(profile);

if (!result.isValid) {
  console.error('Erreurs:', result.errors);
  // Exemple: [{ code: 'CONTOUR_NOT_CLOSED', message: '...' }]
}

if (result.warnings.length > 0) {
  console.warn('Avertissements:', result.warnings);
}
```

### Validation Stricte

```typescript
const result = validateCustomProfile(profile, {
  minArea: 50,          // Minimum 50 cm²
  maxArea: 500,         // Maximum 500 cm²
  maxSegments: 50,      // Max 50 segments
  requireClosed: true,  // Contour doit être fermé
  validateHoles: true   // Vérifier que trous sont à l'intérieur
});
```

---

## Stockage LocalStorage

### Sauvegarder

```typescript
import { CUSTOM_PROFILES_STORAGE_KEY } from './types/custom-profile.types';

// Charger le storage existant
const storageData = localStorage.getItem(CUSTOM_PROFILES_STORAGE_KEY);
const storage = storageData ? JSON.parse(storageData) : {
  schemaVersion: '1.0.0',
  lastUpdated: new Date().toISOString(),
  profiles: []
};

// Ajouter le nouveau profil
storage.profiles.push(profile);
storage.lastUpdated = new Date().toISOString();

// Sauvegarder
localStorage.setItem(CUSTOM_PROFILES_STORAGE_KEY, JSON.stringify(storage));
```

### Charger

```typescript
const storageData = localStorage.getItem(CUSTOM_PROFILES_STORAGE_KEY);
if (storageData) {
  const storage = JSON.parse(storageData);
  const allProfiles = storage.profiles;

  // Chercher par ID
  const profile = allProfiles.find(p => p.id === 'mon-id');

  // Chercher par designation
  const profileByName = allProfiles.find(p => p.designation === 'RECT-200x100');
}
```

---

## Export/Import JSON

### Export Profil Unique

```typescript
const exportData = {
  formatVersion: '1.0.0',
  exportedAt: new Date().toISOString(),
  type: 'single',
  profile: profile
};

const json = JSON.stringify(exportData, null, 2);

// Télécharger comme fichier
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${profile.designation}.json`;
a.click();
```

### Import Profil

```typescript
// Lecture du fichier JSON
const jsonString = await file.text();
const importedData = JSON.parse(jsonString);

if (importedData.type === 'single' && importedData.profile) {
  const profile = importedData.profile;

  // Valider avant d'ajouter
  const validation = validateCustomProfile(profile);

  if (validation.isValid) {
    // Ajouter au storage
    // ...
  }
}
```

---

## Conversion THREE.js

```typescript
import { Shape, ExtrudeGeometry } from 'three';

function convertToThreeShape(shape2D: Shape2D): Shape {
  const threeShape = new Shape();

  // Parcourir les segments du contour extérieur
  const segments = shape2D.outerContour.segments;

  for (const segment of segments) {
    switch (segment.type) {
      case SegmentType.LINE:
        threeShape.lineTo(segment.end.x, segment.end.y);
        break;

      case SegmentType.ARC:
        threeShape.absarc(
          segment.center.x,
          segment.center.y,
          segment.radius,
          segment.startAngle,
          segment.endAngle
        );
        break;

      case SegmentType.BEZIER_QUADRATIC:
        threeShape.quadraticCurveTo(
          segment.control.x,
          segment.control.y,
          segment.end.x,
          segment.end.y
        );
        break;
    }
  }

  // Ajouter les trous
  if (shape2D.holes) {
    for (const hole of shape2D.holes) {
      const holePath = new Shape();
      // ... convertir le trou
      threeShape.holes.push(holePath);
    }
  }

  return threeShape;
}

// Extrusion
const threeShape = convertToThreeShape(profile.shape);
const geometry = new ExtrudeGeometry(threeShape, {
  depth: 6000,  // Longueur en mm
  bevelEnabled: false
});
```

---

## Calculs Géométriques

### Aire et Périmètre

```typescript
import { calculateGeometryProperties } from './utils/customProfileHelpers';

const properties = calculateGeometryProperties(shape);

console.log('Aire:', properties.area, 'cm²');
console.log('Périmètre:', properties.perimeter, 'mm');
console.log('Centre de gravité:', properties.centroid);
```

### Poids Linéique

```typescript
import { calculateWeight } from './utils/customProfileHelpers';

const weight = calculateWeight(
  properties.area,    // cm²
  7.85                // densité kg/dm³ (acier)
);

console.log('Poids:', weight, 'kg/m');
```

### Dimensions de Référence

```typescript
const bbox = calculateBoundingBox(shape);

console.log('Largeur:', bbox.maxX - bbox.minX, 'mm');
console.log('Hauteur:', bbox.maxY - bbox.minY, 'mm');
```

---

## Exemples Complets

### Profil en L (Cornière)

```typescript
const lProfile = createCustomProfile({
  name: 'Cornière 100x100x10',
  designation: 'L-100x100x10',
  shape: {
    outerContour: {
      segments: [
        { type: SegmentType.LINE, start: {x:0, y:0}, end: {x:100, y:0} },
        { type: SegmentType.LINE, start: {x:100, y:0}, end: {x:100, y:10} },
        { type: SegmentType.LINE, start: {x:100, y:10}, end: {x:10, y:10} },
        { type: SegmentType.LINE, start: {x:10, y:10}, end: {x:10, y:100} },
        { type: SegmentType.LINE, start: {x:10, y:100}, end: {x:0, y:100} },
        { type: SegmentType.LINE, start: {x:0, y:100}, end: {x:0, y:0} }
      ],
      closed: true
    }
  },
  defaultMaterial: { grade: 'S275', density: 7.85 }
});
```

### Profil avec Courbes de Bézier

```typescript
const curvedProfile = createCustomProfile({
  name: 'Profil Courbe',
  designation: 'CURVED-001',
  shape: {
    outerContour: {
      segments: [
        { type: SegmentType.LINE, start: {x:0, y:0}, end: {x:100, y:0} },
        {
          type: SegmentType.BEZIER_QUADRATIC,
          start: {x:100, y:0},
          control: {x:120, y:50},
          end: {x:100, y:100}
        },
        { type: SegmentType.LINE, start: {x:100, y:100}, end: {x:0, y:100} },
        { type: SegmentType.LINE, start: {x:0, y:100}, end: {x:0, y:0} }
      ],
      closed: true
    }
  },
  defaultMaterial: { grade: 'S355', density: 7.85 }
});
```

---

## Checklist Création de Profil

- [ ] Définir les segments du contour extérieur
- [ ] Vérifier que le contour est fermé
- [ ] Ajouter les trous si nécessaires
- [ ] Définir le matériau par défaut
- [ ] Valider le profil
- [ ] Calculer les propriétés géométriques
- [ ] Tester la conversion THREE.js
- [ ] Sauvegarder dans LocalStorage ou exporter en JSON

---

## Erreurs Courantes

### Contour Non Fermé

**Problème:** Le dernier segment ne rejoint pas le premier
**Solution:**
```typescript
// Vérifier que le dernier point = premier point
const first = segments[0].start;
const last = segments[segments.length - 1].end;
// distance(first, last) doit être < 0.01mm
```

### Trou en Dehors du Contour

**Problème:** Un trou est défini en dehors du contour extérieur
**Solution:**
```typescript
// Vérifier avec validateCustomProfile
const result = validateCustomProfile(profile, {
  validateHoles: true
});
```

### Aire Négative

**Problème:** L'aire calculée est négative
**Solution:** Les segments sont dans le mauvais sens (horaire au lieu d'anti-horaire)

---

## Ressources

- **Types complets:** `src/TopSteelCAD/3DLibrary/types/custom-profile.types.ts`
- **Helpers:** `src/TopSteelCAD/3DLibrary/utils/customProfileHelpers.ts`
- **Exemples:** `src/TopSteelCAD/3DLibrary/examples/custom-profile-examples.ts`
- **Documentation:** `CUSTOM_PROFILES_DESIGN.md`

---

## Support

Pour plus d'informations, consulter la documentation complète dans `CUSTOM_PROFILES_DESIGN.md`.
