# Guide d'utilisation du moteur de calepinage avancé

## Vue d'ensemble

Le système de calepinage intelligent gère :
- ✅ **Surfaces complexes** : rectangles, pignons, trapèzes, polygones
- ✅ **Obstacles** : ouvertures (portes, fenêtres), zones techniques
- ✅ **Découpage automatique** : division en zones calepinables
- ✅ **Optimisation** : maximiser le nombre d'éléments, la couverture, ou un compromis

## Architecture

```
genericLayoutEngine.ts      → Calepinage simple (rectangles sans obstacles)
advancedLayoutEngine.ts     → Calepinage avancé (formes complexes + obstacles)
SolarArrayEditor.tsx        → Interface utilisateur
BuildingPreview3D.tsx       → Rendu 3D
```

## Cas d'usage

### 1. Surface rectangulaire sans obstacles (ombrière simple)

```typescript
import { calculateOptimalLayout } from './genericLayoutEngine';

const element = {
  width: 2278,      // Largeur panneau (mm)
  height: 1134,     // Hauteur panneau (mm)
  weight: 32,       // Poids (kg)
  reference: 'LONGi 540W'
};

const constraints = {
  minRowSpacing: 50,
  minColumnSpacing: 30,
  recommendedRowSpacing: 100,
  recommendedColumnSpacing: 50,
  edgeMarginLongitudinal: 500,  // Marges avant/arrière
  edgeMarginTransverse: 300,     // Marges gauche/droite
  allowLandscape: true,
  allowPortrait: true
};

const options = {
  orientation: 'auto',        // ou 'landscape' / 'portrait'
  optimizeFor: 'quantity',    // ou 'coverage' / 'balanced'
  useRecommendedSpacing: true
};

const layout = calculateOptimalLayout(
  50000,  // Longueur disponible (mm)
  10000,  // Largeur disponible (mm)
  element,
  constraints,
  options
);

console.log(`${layout.totalElements} panneaux`);
console.log(`${layout.rows} rangées × ${layout.columns} colonnes`);
console.log(`Couverture: ${layout.coverageRatio.toFixed(1)}%`);
```

### 2. Surface avec obstacles (ouvertures)

```typescript
import {
  calculateAdvancedLayout,
  openingsToObstacles
} from './advancedLayoutEngine';

// Définir les ouvertures
const ouvertures = [
  {
    id: 'porte-1',
    position: { x: 10000, z: 0 },      // Position au sol
    dimensions: { width: 3000, height: 2500 }
  },
  {
    id: 'fenetre-1',
    position: { x: 25000, z: 1500 },   // Position en hauteur
    dimensions: { width: 1200, height: 1000 }
  }
];

// Convertir en obstacles avec marge de sécurité
const obstacles = openingsToObstacles(ouvertures, 100); // 100mm de marge

// Créer la surface
const surface = {
  id: 'facade-avant',
  type: 'rectangular',
  bounds: {
    x: 0,
    z: 0,
    width: 50000,   // Longueur du bâtiment
    height: 10000   // Hauteur de la façade
  },
  obstacles
};

// Calculer le calepinage avancé
const result = calculateAdvancedLayout(
  [surface],
  element,
  constraints,
  options
);

console.log(`${result.totalElements} panneaux`);
console.log(`${result.zones.length} zones calepinables`);
console.log(`${obstacles.length} obstacles évités`);

// Accéder aux positions de chaque panneau
result.zones.forEach((zone, i) => {
  console.log(`Zone ${i}: ${zone.elements?.length || 0} panneaux`);
  zone.elements?.forEach(el => {
    console.log(`  Panneau à (${el.x}, ${el.z})`);
  });
});
```

### 3. Pignon avec pente

```typescript
import { createGableSurface } from './advancedLayoutEngine';

// Créer un pignon triangulaire
const pignon = createGableSurface(
  'pignon-gauche',
  'left',
  10000,  // Largeur du bâtiment
  3000,   // Hauteur du mur
  5000    // Hauteur au faîtage
);

// Ajouter des ouvertures (fenêtres dans le pignon)
pignon.obstacles = [{
  id: 'fenetre-pignon',
  type: 'opening',
  bounds: {
    x: 4000,
    z: 2000,
    width: 1200,
    height: 800
  },
  margin: 100
}];

// Calculer le calepinage
const result = calculateAdvancedLayout(
  [pignon],
  element,
  constraints,
  options
);

// Le moteur découpe automatiquement le pignon en bandes horizontales
// et évite les ouvertures
console.log(`Pignon: ${result.totalElements} panneaux`);
console.log(`Découpé en ${result.zones.length} bandes`);
```

### 4. Multiple surfaces (bardage complet)

```typescript
// Façade avant avec porte
const facadeAvant = {
  id: 'facade-avant',
  type: 'rectangular',
  bounds: { x: 0, z: 0, width: 50000, height: 3000 },
  obstacles: openingsToObstacles([porte1, fenetre1])
};

// Façade arrière avec fenêtres
const facadeArriere = {
  id: 'facade-arriere',
  type: 'rectangular',
  bounds: { x: 0, z: 0, width: 50000, height: 3000 },
  obstacles: openingsToObstacles([fenetre2, fenetre3])
};

// Pignons gauche et droit
const pignonGauche = createGableSurface('pignon-g', 'left', 10000, 3000, 5000);
const pignonDroit = createGableSurface('pignon-d', 'right', 10000, 3000, 5000);

// Calculer le bardage complet
const result = calculateAdvancedLayout(
  [facadeAvant, facadeArriere, pignonGauche, pignonDroit],
  bardageElement,
  constraints,
  options
);

console.log(`Bardage total: ${result.totalElements} éléments`);
console.log(`Surface couverte: ${result.totalArea.toFixed(1)} m²`);
console.log(`Taux de couverture: ${result.coverageRatio.toFixed(1)}%`);
```

## Algorithmes

### Découpage en zones (Guillotine Cut)

Quand un obstacle est détecté, le rectangle est découpé en 4 zones :

```
┌─────────────────────┐
│      ZONE HAUTE     │  ← Rectangle au-dessus
├──┬────────────┬─────┤
│G │            │  D  │  ← Rectangles gauche/droit
│  │  OBSTACLE  │  R  │
│  │            │  O  │
├──┴────────────┴─────┤
│     ZONE BASSE      │  ← Rectangle en-dessous
└─────────────────────┘
```

Les zones trop petites (< 100mm) sont éliminées.

### Calepinage de pignon

Le pignon est découpé en bandes horizontales de hauteur fixe (1000mm).
La largeur de chaque bande est calculée selon la pente :

```
      ▲ Faîtage
     /|\
    / | \  Bande 3 (1000mm de haut, largeur décroissante)
   /  |  \
  /   |   \ Bande 2 (1000mm de haut, largeur moyenne)
 /    |    \
/_____|_____\ Bande 1 (1000mm de haut, pleine largeur)
```

Chaque bande est ensuite calepinée indépendamment.

## Intégration dans l'UI

Le composant `SolarArrayEditor` utilise automatiquement le calepinage avancé quand des ouvertures sont détectées :

```typescript
<SolarArrayEditor
  structureId="main"
  config={solarConfig}
  onChange={handleChange}
  buildingLength={50000}
  buildingWidth={10000}
  openings={[
    { id: 'porte-1', position: { x: 10000, z: 0 }, dimensions: { width: 3000, height: 2500 } }
  ]}
/>
```

L'interface affiche automatiquement :
- ✅ Nombre de zones calepinables
- ✅ Nombre d'obstacles évités
- ✅ Taux de couverture global
- ✅ Nombre total de panneaux

## Rendu 3D

Le viewer 3D `BuildingPreview3D` utilise les positions précalculées :

```typescript
// Les positions sont déjà dans le référentiel global
solarArray.layout.elementPositions.forEach(position => {
  // Créer un mesh pour chaque panneau à la position exacte
  const panelMesh = createPanelMesh(position.x, position.z);
  scene.add(panelMesh);
});
```

## Extension future

Le système est extensible pour :
- **Toitures multi-versants** : découpage en plusieurs surfaces
- **Couverture avec chatières** : obstacles ponctuels
- **Bardage avec angles** : surfaces non rectangulaires
- **Zones techniques** : exclusions (transformateurs, ventilation)
- **Optimisation solaire** : prise en compte de l'orientation et des ombres

## Performance

- **Complexité** : O(n × m) où n = nombre d'obstacles, m = nombre de surfaces
- **Optimisations** :
  - Tri des obstacles par position
  - Élimination précoce des zones trop petites
  - Calcul incrémental (pas de recalcul global)
- **Limite** : Testé jusqu'à 50 obstacles sur surface 100m × 20m

## Tests recommandés

1. ✅ Surface vide (aucun obstacle)
2. ✅ 1 porte au centre
3. ✅ Multiple fenêtres alignées
4. ✅ Obstacles dispersés
5. ✅ Pignon simple (triangle)
6. ✅ Pignon avec fenêtre
7. ✅ Surfaces multiples combinées
