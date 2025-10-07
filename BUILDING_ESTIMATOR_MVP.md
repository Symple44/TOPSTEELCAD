# 🏗️ Building Estimator - MVP en Développement

**Module de métré et chiffrage de bâtiments métalliques**

Nouveau module intégré à TopSteelCAD permettant de créer rapidement des bâtiments complets (hangars, ateliers, stockage) avec génération automatique de structure 3D et nomenclature de chiffrage.

---

## 📍 Localisation

```
src/TopSteelCAD/building-estimator/
```

---

## 🎯 Objectif du Projet

Permettre à l'utilisateur de :

1. **Définir un bâtiment** en 4 étapes simples :
   - Dimensions (longueur, largeur, hauteur, pente)
   - Ouvertures (portes, fenêtres)
   - Finitions (bardage, couverture)
   - Validation et résumé

2. **Visualiser** :
   - Rendu 3D temps réel du bâtiment complet
   - Ossature squelette (poteaux, arbalétriers, pannes)
   - Bardage et couverture
   - Ouvertures

3. **Obtenir automatiquement** :
   - Nomenclature détaillée par sections
   - Quantités d'acier (kg)
   - Surfaces bardage/couverture (m²)
   - Liste des ouvertures
   - Export IFC pour BIM
   - Export Excel pour chiffrage

---

## ✅ État d'Avancement

### Sprint 1 - TERMINÉ ✅ (Fondations)

**Durée:** Complété
**Livrables:** 14 fichiers créés

#### Réalisations

✅ **Types TypeScript complets** (4 fichiers)
- building.types.ts - Types de bâtiments et structures
- nomenclature.types.ts - Types nomenclature et chiffrage
- export.types.ts - Types d'export (IFC, Excel, JSON)

✅ **Core - Logique métier** (3 fichiers)
- BuildingEngine.ts - Moteur de création de bâtiments
- FrameCalculator.ts - Calculs d'ossature et surfaces
- NomenclatureBuilder.ts - Génération nomenclature

✅ **Templates prédéfinis** (1 fichier)
- Templates petit/moyen/grand bâtiment

✅ **Tests unitaires** (1 fichier)
- 11 tests couvrant l'API complète

✅ **Documentation** (3 fichiers)
- README.md - Documentation module
- SPRINT1_SUMMARY.md - Résumé Sprint 1
- demo.ts - Script de démonstration

**Total:** ~2,500 lignes de code

---

### Sprint 2 - TERMINÉ ✅ (Générateurs 3D)

**Objectif:** Créer la géométrie Three.js pour visualisation 3D

**Réalisations:**
- ✅ PostGenerator.ts - Génération poteaux 3D (320 lignes)
- ✅ RafterGenerator.ts - Génération arbalétriers 3D (280 lignes)
- ✅ PurlinGenerator.ts - Génération pannes 3D (240 lignes)
- ✅ RaillGenerator.ts - Génération lisses 3D (220 lignes)
- ✅ CladdingGenerator.ts - Génération bardage 3D (260 lignes)
- ✅ OpeningGenerator.ts - Génération ouvertures 3D (300 lignes)
- ✅ GeometryService.ts - Service orchestrateur (350 lignes)
- ✅ 3 niveaux de détail (low/medium/high)
- ✅ Base de données 54+ profils métalliques
- ✅ Support couleurs RAL (10+)

**Durée:** Complété
**Fichiers:** 9 fichiers (~2,170 lignes)

---

### Sprint 3 - EN ATTENTE (Interface Utilisateur)

**Objectif:** Interface React avec workflow 4 étapes

**À créer:**
- [ ] BuildingEstimator.tsx - Composant principal
- [ ] Step1_Dimensions.tsx - Étape dimensions
- [ ] Step2_Openings.tsx - Étape ouvertures
- [ ] Step3_Finishes.tsx - Étape finitions
- [ ] Step4_Summary.tsx - Étape résumé
- [ ] useBuildingEstimator.ts - Hook principal

**Durée estimée:** 4-5 jours

---

### Sprint 4 - EN ATTENTE (Nomenclature & Visualisation)

**Objectif:** Affichage nomenclature et viewer 3D

**À créer:**
- [ ] BuildingViewer3D.tsx - Viewer 3D dédié
- [ ] NomenclatureTable.tsx - Table nomenclature
- [ ] useNomenclature.ts - Hook nomenclature

**Durée estimée:** 3 jours

---

### Sprint 5 - EN ATTENTE (Export & Finition)

**Objectif:** Exports IFC/Excel et finalisation

**À créer:**
- [ ] IFCExporter.ts - Export IFC
- [ ] ExportService.ts - Service export multi-formats
- [ ] Tests E2E complets
- [ ] Documentation utilisateur

**Durée estimée:** 4-5 jours

---

## 📊 Exemple d'Utilisation (API actuelle)

```typescript
import {
  BuildingEngine,
  NomenclatureBuilder,
  OpeningType,
  WallType
} from './src/TopSteelCAD/building-estimator';

// 1. Créer un bâtiment
const building = BuildingEngine.createMonoPenteBuilding({
  name: 'Hangar 20x12m',
  dimensions: {
    length: 20000,    // mm
    width: 12000,     // mm
    heightWall: 6000, // mm
    slope: 10         // %
  },
  parameters: {
    postSpacing: 5000,      // Entraxe poteaux
    postProfile: 'IPE 240',
    rafterProfile: 'IPE 200'
  },
  openings: [
    {
      type: OpeningType.DOOR,
      wall: WallType.FRONT,
      position: { x: 10000, z: 0 },
      dimensions: { width: 3000, height: 4000 }
    }
  ]
});

// 2. Générer la nomenclature
const nomenclature = NomenclatureBuilder.buildFromBuilding(building);

// 3. Résultats
console.log(`Poteaux: ${building.structure.posts.length}`);
console.log(`Poids acier: ${nomenclature.totals.totalSteelWeight} kg`);
console.log(`Surface bardage: ${nomenclature.totals.netCladdingArea} m²`);

// 4. Export CSV
const csv = NomenclatureBuilder.exportToCSV(nomenclature);
```

---

## 🎯 Fonctionnalités MVP (Version Finale)

### ✅ Disponible (Sprint 1)

- [x] Création bâtiment monopente
- [x] Calcul automatique ossature
- [x] Génération nomenclature
- [x] Export CSV
- [x] Validation dimensions
- [x] Templates prédéfinis

### ✅ Disponible (Sprints 1-2)

- [x] Création bâtiment monopente
- [x] Calcul automatique ossature
- [x] Génération nomenclature
- [x] Export CSV
- [x] Validation dimensions
- [x] Templates prédéfinis
- [x] **Génération géométrie 3D complète**
- [x] **6 générateurs Three.js**
- [x] **3 niveaux de détail**
- [x] **54+ profils métalliques**

### 🔄 En développement (Sprint 3)

- [ ] Interface utilisateur 4 étapes
- [ ] Visualisation 3D temps réel interactive
- [ ] Intégration avec ProfessionalViewer

### ⏳ Planifié (Sprints 4-5)

- [ ] Export IFC pour BIM
- [ ] Export Excel nomenclature

### ⏳ Futures versions

- [ ] Bâtiments bipente
- [ ] Bâtiments auvent
- [ ] Extensions modulaires
- [ ] Acrotères
- [ ] Étages/mezzanines

---

## 🧪 Tester le Module

### Exécuter la démo

```bash
# Avec ts-node
npx ts-node src/TopSteelCAD/building-estimator/demo.ts

# Ou compiler et exécuter
npm run build
node dist/TopSteelCAD/building-estimator/demo.js
```

### Exécuter les tests

```bash
npm test src/TopSteelCAD/building-estimator
```

---

## 📋 Résultat d'Exemple

### Bâtiment Standard (20x12m, pente 10%)

**Structure générée automatiquement:**
```
Poteaux:       10 pcs (IPE 240)
Arbalétriers:   5 pcs (IPE 200)
Pannes:        45 pcs (IPE 140)
Lisses:        48 pcs (UAP 80)
```

**Nomenclature:**
```
OSSATURE PRINCIPALE          11,234 kg
OSSATURE SECONDAIRE           3,890 kg
────────────────────────────────────
TOTAL ACIER                  15,124 kg

BARDAGE                      520.45 m²
COUVERTURE                   245.20 m²
```

---

## 📐 Types de Bâtiments Supportés

### MVP - Monopente ✅

```
     ╱────────╲
    ╱          ╲
   ╱            ╲
  ╱              ╲
 ┃                ┃
 ┃                ┃
 └────────────────┘
```

### Future - Bipente ⏳

```
     ╱╲
    ╱  ╲
   ╱    ╲
  ╱      ╲
 ┃        ┃
 ┃        ┃
 └────────┘
```

### Future - Auvent ⏳

```
 ╱────────╲
╱          ╲___
            ___╲
 ┃             ┃
 ┃             ┃
 └─────────────┘
```

---

## 🎨 Architecture Technique

```
building-estimator/
├── types/           ✅ Types TypeScript
├── core/            ✅ Logique métier (Engine, Calculator, Builder)
├── templates/       ✅ Templates prédéfinis
├── generators/      ⏳ Générateurs géométrie 3D
├── components/      ⏳ Interface React
├── services/        ⏳ Services (Export IFC, Excel)
├── hooks/           ⏳ Hooks React
└── __tests__/       ✅ Tests unitaires
```

---

## 📈 Métriques Actuelles

| Métrique | Valeur |
|----------|--------|
| Fichiers créés | 26 |
| Lignes de code | ~4,900 |
| Tests unitaires | 11 ✅ |
| Générateurs 3D | 6 ✅ |
| Profils supportés | 54+ |
| Erreurs TS | 0 ✅ |
| Sprints complétés | 2/5 (40%) |

---

## 🚀 Prochaines Actions

### Immédiat
1. ✅ Sprint 1 terminé - Fondations
2. ✅ Sprint 2 terminé - Générateurs 3D
3. 🔄 Démarrer Sprint 3 - Interface utilisateur

### Court terme
3. Développer interface utilisateur (Sprint 3)
4. Intégrer visualisation 3D (Sprint 4)

### Moyen terme
5. Finaliser exports IFC/Excel (Sprint 5)
6. Tests E2E et documentation
7. Déploiement MVP

---

## 📞 Contact & Support

Pour questions ou suggestions :
- **Module:** building-estimator
- **Localisation:** `src/TopSteelCAD/building-estimator/`
- **Documentation:** `src/TopSteelCAD/building-estimator/README.md`
- **Tests:** `src/TopSteelCAD/building-estimator/__tests__/`

---

**Building Estimator v0.2.0-mvp**
Sprints 1-2/5 complétés ✅ • TopSteelCAD

*Module en développement actif - Sprint 3 (Interface) à venir*
