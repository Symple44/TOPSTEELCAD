# Custom Profiles - Profils Personnalisés

Module complet pour la création, manipulation et stockage de profils métalliques 2D personnalisés dans TopSteelCAD.

## Installation

```typescript
import {
  createCustomProfile,
  createSimpleContour,
  validateCustomProfile,
  SegmentType
} from '@/3DLibrary/custom-profiles';
```

## Démarrage Rapide

### Profil Rectangulaire

```typescript
const contour = createSimpleContour({
  type: 'rectangle',
  width: 200,
  height: 100
});

const profile = createCustomProfile({
  name: 'Rectangle 200x100',
  designation: 'RECT-200x100',
  shape: { outerContour: contour },
  defaultMaterial: { grade: 'S355', density: 7.85 }
});

console.log(profile.properties.area);     // 200 cm²
console.log(profile.weight);              // ~15.7 kg/m
```

### Profil en T

```typescript
const tProfile = createCustomTProfile(
  200,  // hauteur
  150,  // largeur semelle
  10,   // épaisseur âme
  15    // épaisseur semelle
);
```

### Profil avec Trou

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
  shape: { outerContour, holes: [hole] },
  defaultMaterial: { grade: 'S355', density: 7.85 }
});
```

## Fonctionnalités

### Types de Segments Supportés

- ✅ **LINE**: Lignes droites
- ✅ **ARC**: Arcs circulaires
- ✅ **BEZIER_QUADRATIC**: Courbes de Bézier quadratiques
- ✅ **BEZIER_CUBIC**: Courbes de Bézier cubiques
- ✅ **ELLIPSE**: Arcs elliptiques

### Calculs Automatiques

- ✅ Aire nette (cm²)
- ✅ Périmètre (mm)
- ✅ Centre de gravité
- ✅ Boîte englobante
- ✅ Poids linéique (kg/m)

### Validation

```typescript
const result = validateCustomProfile(profile);

if (!result.isValid) {
  console.error('Erreurs:', result.errors);
}
```

### Stockage LocalStorage

```typescript
import { CUSTOM_PROFILES_STORAGE_KEY } from '@/3DLibrary/custom-profiles';

// Sauvegarder
const storage = {
  schemaVersion: '1.0.0',
  lastUpdated: new Date().toISOString(),
  profiles: [profile]
};

localStorage.setItem(CUSTOM_PROFILES_STORAGE_KEY, JSON.stringify(storage));

// Charger
const loaded = JSON.parse(localStorage.getItem(CUSTOM_PROFILES_STORAGE_KEY));
```

### Export/Import JSON

```typescript
// Export
const exportData = {
  formatVersion: '1.0.0',
  exportedAt: new Date().toISOString(),
  type: 'single',
  profile
};

const json = JSON.stringify(exportData, null, 2);

// Import
const imported = JSON.parse(json);
const profile = imported.profile;
```

## Structure du Module

```
custom-profiles/
├── index.ts                    # Point d'entrée principal
├── README.md                   # Ce fichier
│
../types/
└── custom-profile.types.ts     # Définitions TypeScript complètes
│
../utils/
├── customProfileHelpers.ts     # Fonctions utilitaires
└── customProfileHelpers.test.ts # Tests unitaires
│
../examples/
└── custom-profile-examples.ts  # 13 exemples complets
```

## Documentation

- **[CUSTOM_PROFILES_DESIGN.md](../../../../CUSTOM_PROFILES_DESIGN.md)** - Architecture complète et schémas de données
- **[CUSTOM_PROFILES_QUICKSTART.md](../../../../CUSTOM_PROFILES_QUICKSTART.md)** - Guide de démarrage rapide
- **[CUSTOM_PROFILES_SUMMARY.md](../../../../CUSTOM_PROFILES_SUMMARY.md)** - Résumé et métriques

## Exemples

Consultez `../examples/custom-profile-examples.ts` pour 13 exemples complets:

1. Profil rectangulaire simple
2. Profil en T
3. Profil en I
4. Profil avec trou circulaire
5. Profil en L (cornière)
6. Rectangle avec coins arrondis
7. Profil Oméga avec courbes de Bézier
8. Profil composite soudé
9. Bibliothèque de profils
10. Validation de profils
11. Calculs de propriétés
12. Export JSON
13. Export de bibliothèque

## API Principale

### Création de Profils

```typescript
createCustomProfile(params: CreateCustomProfileParams): CustomProfile
createSimpleContour(params: SimpleContourParams): Contour2D
createCustomTProfile(height, flangeWidth, webThickness, flangeThickness, name?): CustomProfile
createCustomIProfile(height, flangeWidth, webThickness, flangeThickness, name?): CustomProfile
```

### Calculs

```typescript
calculateGeometryProperties(shape: Shape2D): CalculatedGeometryProperties
calculateContourArea(segments: GeometrySegment[]): number
calculateContourPerimeter(segments: GeometrySegment[]): number
calculateCentroid(segments: GeometrySegment[]): Point2D
calculateWeight(areaCm2: number, densityKgDm3: number): number
calculateBoundingBox(shape: Shape2D): BoundingBox
```

### Validation

```typescript
validateCustomProfile(profile: CustomProfile, rules?: ValidationRules): ValidationResult
isContourClosed(contour: Contour2D, tolerance?: number): boolean
```

## Types Principaux

```typescript
interface CustomProfile {
  id: string;
  name: string;
  designation: string;
  description?: string;
  shape: Shape2D;
  properties: CalculatedGeometryProperties;
  weight?: number;
  metadata: CustomProfileMetadata;
  defaultMaterial?: MaterialDefinition;
  validation?: ValidationState;
  profileType: 'CUSTOM';
}

interface Shape2D {
  outerContour: Contour2D;
  holes?: Contour2D[];
  boundingBox?: BoundingBox;
}

interface Contour2D {
  id: string;
  segments: GeometrySegment[];
  closed: boolean;
  area?: number;
  perimeter?: number;
}
```

## Conversion THREE.js

```typescript
import { Shape, ExtrudeGeometry } from 'three';

const threeShape = new Shape();

// Convertir les segments
for (const segment of profile.shape.outerContour.segments) {
  switch (segment.type) {
    case SegmentType.LINE:
      threeShape.lineTo(segment.end.x, segment.end.y);
      break;
    case SegmentType.ARC:
      threeShape.absarc(
        segment.center.x, segment.center.y,
        segment.radius,
        segment.startAngle, segment.endAngle
      );
      break;
  }
}

// Extruder
const geometry = new ExtrudeGeometry(threeShape, {
  depth: 6000,
  bevelEnabled: false
});
```

## Tests

Exécuter les tests unitaires:

```bash
npm test customProfileHelpers.test.ts
```

Les tests couvrent:
- Création de contours simples
- Création de profils personnalisés
- Calculs géométriques
- Validation
- Profils avec trous
- Cas limites

## Migration Base de Données

Le module est préparé pour une migration future vers PostgreSQL. Voir `CUSTOM_PROFILES_DESIGN.md` section 8 pour le schéma SQL complet.

## Roadmap

### Phase 1 - Services (Prochaine)
- [ ] `CustomProfileStorageService`
- [ ] `CustomProfileCalculator` (inertie, modules)
- [ ] `CustomProfileValidator` (auto-intersections)
- [ ] `CustomProfileConverter` (THREE.js)

### Phase 2 - Interface Utilisateur
- [ ] Éditeur graphique 2D
- [ ] Gestionnaire de bibliothèques
- [ ] Import/Export UI
- [ ] Aperçu 3D temps réel

### Phase 3 - Intégration
- [ ] Ajout `ProfileType.CUSTOM`
- [ ] Modification `ProfileDatabase`
- [ ] `CustomProfileGenerator`
- [ ] Tests d'intégration

## Support

Pour questions ou problèmes, consulter:
- Documentation complète dans `CUSTOM_PROFILES_DESIGN.md`
- Guide rapide dans `CUSTOM_PROFILES_QUICKSTART.md`
- Exemples dans `../examples/custom-profile-examples.ts`

## Version

**Version actuelle:** 1.0.0
**Schéma:** 1.0.0

## Licence

© TopSteelCAD - Tous droits réservés
