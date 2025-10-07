# Guide d'Extension - Building Estimator

## 🎯 Objectif

Ce guide explique comment étendre le module Building Estimator pour supporter de nouveaux types de bâtiments (Bipente, Auvent, etc.).

---

## 📋 État Actuel

**Types disponibles dans `BuildingType` enum:**
- ✅ `MONO_PENTE` - Bâtiment à simple pente (100% fonctionnel)
- ⏳ `BI_PENTE` - Bâtiment à double pente (prévu)
- ⏳ `AUVENT` - Structure ouverte (prévu)

---

## 🚀 Étapes pour Ajouter un Nouveau Type de Bâtiment

### 1. Définir les Types Spécifiques

**Fichier:** `types/building.types.ts`

```typescript
/**
 * Dimensions spécifiques au bâtiment bipente
 */
export interface BiPenteDimensions extends BuildingDimensions {
  ridgeHeight?: number;      // Hauteur au faîtage
  leftSlope: number;         // Pente côté gauche (%)
  rightSlope: number;        // Pente côté droit (%)
}

/**
 * Bâtiment bipente (toit à double pente)
 */
export interface BiPenteBuilding extends BaseBuilding {
  type: BuildingType.BI_PENTE;
  dimensions: BiPenteDimensions;
  structure: BiPenteStructure;
}

/**
 * Structure pour bâtiment bipente
 */
export interface BiPenteStructure {
  posts: Post[];              // Poteaux
  rafters: Rafter[];          // Arbalétriers (gauche + droite)
  ridgeBeam: Beam;            // Poutre faîtière
  purlins: Purlin[];          // Pannes
  rails: Rail[];              // Lisses
  bracing?: Bracing[];        // Contreventement
}
```

### 2. Créer le Moteur de Calcul

**Fichier:** `core/BiPenteCalculator.ts`

```typescript
import { BiPenteDimensions, BiPenteStructure } from '../types';

export class BiPenteCalculator {
  /**
   * Calcule l'ossature d'un bâtiment bipente
   */
  static calculateBiPenteFrame(
    dimensions: BiPenteDimensions,
    parameters: BuildingParameters,
    openings: Opening[]
  ): BiPenteCalculations {
    // 1. Calculer hauteur au faîtage
    const ridgeHeight = this.calculateRidgeHeight(dimensions);

    // 2. Calculer nombre de poteaux
    const postCount = this.calculatePostCount(dimensions.length, parameters.postSpacing);

    // 3. Calculer longueurs des arbalétriers (gauche + droite)
    const leftRafterLength = this.calculateRafterLength(
      dimensions.width / 2,
      dimensions.leftSlope
    );
    const rightRafterLength = this.calculateRafterLength(
      dimensions.width / 2,
      dimensions.rightSlope
    );

    // 4. Calculer nombre de pannes (par versant)
    const leftPurlinCount = this.calculatePurlinCount(
      leftRafterLength,
      parameters.purlinSpacing
    );
    const rightPurlinCount = this.calculatePurlinCount(
      rightRafterLength,
      parameters.purlinSpacing
    );

    // 5. Calculer surfaces de toiture
    const leftRoofArea = this.calculateRoofArea(
      dimensions.length,
      leftRafterLength
    );
    const rightRoofArea = this.calculateRoofArea(
      dimensions.length,
      rightRafterLength
    );

    return {
      ridgeHeight,
      postCount,
      rafterCount: postCount * 2, // 2 arbalétriers par portique
      leftRafterLength,
      rightRafterLength,
      leftPurlinCount,
      rightPurlinCount,
      totalRoofingArea: leftRoofArea + rightRoofArea,
      // ...
    };
  }

  /**
   * Calcule la hauteur au faîtage
   */
  private static calculateRidgeHeight(dimensions: BiPenteDimensions): number {
    if (dimensions.ridgeHeight) return dimensions.ridgeHeight;

    // Calculer depuis la pente maximale
    const maxSlope = Math.max(dimensions.leftSlope, dimensions.rightSlope);
    const rise = (dimensions.width / 2) * (maxSlope / 100);

    return dimensions.heightWall + rise;
  }

  /**
   * Calcule la longueur d'un arbalétrier
   */
  private static calculateRafterLength(span: number, slope: number): number {
    const rise = span * (slope / 100);
    return Math.sqrt(span * span + rise * rise);
  }
}
```

### 3. Créer le Générateur de Structure

**Fichier:** `core/BiPenteEngine.ts`

```typescript
import { BiPenteBuilding, BiPenteDimensions } from '../types';
import { BiPenteCalculator } from './BiPenteCalculator';
import { PostGenerator } from '../generators/PostGenerator';
import { RafterGenerator } from '../generators/RafterGenerator';

export class BiPenteEngine {
  /**
   * Crée un bâtiment bipente complet
   */
  static createBiPenteBuilding(config: {
    name: string;
    dimensions: BiPenteDimensions;
    parameters: BuildingParameters;
    openings?: Opening[];
    finishes?: Finishes;
  }): BiPenteBuilding {
    // 1. Calculer l'ossature
    const calculations = BiPenteCalculator.calculateBiPenteFrame(
      config.dimensions,
      config.parameters,
      config.openings || []
    );

    // 2. Générer les poteaux
    const posts = PostGenerator.generatePosts({
      length: config.dimensions.length,
      width: config.dimensions.width,
      height: config.dimensions.heightWall,
      spacing: config.parameters.postSpacing,
      profile: config.parameters.postProfile
    });

    // 3. Générer les arbalétriers (gauche + droite)
    const rafters = this.generateBiPenteRafters(
      config.dimensions,
      config.parameters,
      calculations
    );

    // 4. Générer la poutre faîtière
    const ridgeBeam = this.generateRidgeBeam(
      config.dimensions,
      config.parameters
    );

    // 5. Générer les pannes
    const purlins = this.generateBiPentePurlins(
      config.dimensions,
      config.parameters,
      calculations
    );

    // 6. Assembler le bâtiment
    return {
      id: `bipente-${Date.now()}`,
      type: BuildingType.BI_PENTE,
      name: config.name,
      dimensions: config.dimensions,
      parameters: config.parameters,
      structure: {
        posts,
        rafters,
        ridgeBeam,
        purlins,
        rails: []
      },
      openings: config.openings || [],
      finishes: config.finishes || this.getDefaultFinishes(),
      metadata: {
        createdAt: new Date(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Génère les arbalétriers pour bipente
   */
  private static generateBiPenteRafters(
    dimensions: BiPenteDimensions,
    parameters: BuildingParameters,
    calculations: BiPenteCalculations
  ): Rafter[] {
    const rafters: Rafter[] = [];

    // Pour chaque portique...
    for (let i = 0; i < calculations.postCount; i++) {
      const x = i * parameters.postSpacing;

      // Arbalétrier gauche
      rafters.push({
        id: `rafter-left-${i}`,
        type: StructuralElementType.RAFTER,
        profile: parameters.rafterProfile,
        length: calculations.leftRafterLength,
        position: { x, y: dimensions.heightWall, z: 0 },
        angle: Math.atan(dimensions.leftSlope / 100) * (180 / Math.PI),
        side: 'left'
      });

      // Arbalétrier droit
      rafters.push({
        id: `rafter-right-${i}`,
        type: StructuralElementType.RAFTER,
        profile: parameters.rafterProfile,
        length: calculations.rightRafterLength,
        position: { x, y: dimensions.heightWall, z: dimensions.width },
        angle: Math.atan(dimensions.rightSlope / 100) * (180 / Math.PI),
        side: 'right'
      });
    }

    return rafters;
  }
}
```

### 4. Intégrer dans BuildingEngine

**Fichier:** `core/BuildingEngine.ts`

```typescript
import { BiPenteEngine } from './BiPenteEngine';

export class BuildingEngine {
  /**
   * Crée un bâtiment selon le type
   */
  static createBuilding(config: BuildingConfig): Building {
    switch (config.type) {
      case BuildingType.MONO_PENTE:
        return this.createMonoPenteBuilding(config);

      case BuildingType.BI_PENTE:
        return BiPenteEngine.createBiPenteBuilding(config);

      case BuildingType.AUVENT:
        return AuventEngine.createAuventBuilding(config);

      default:
        throw new Error(`Type de bâtiment non supporté: ${config.type}`);
    }
  }
}
```

### 5. Créer les Générateurs 3D

**Fichier:** `generators/BiPenteRafterGenerator.ts`

```typescript
import * as THREE from 'three';
import { BiPenteBuilding } from '../types';

export class BiPenteRafterGenerator {
  /**
   * Génère les arbalétriers en 3D pour bipente
   */
  static generate(
    building: BiPenteBuilding,
    options: GeneratorOptions
  ): THREE.Group {
    const group = new THREE.Group();

    building.structure.rafters.forEach((rafter) => {
      const mesh = this.createRafterMesh(rafter, options);
      group.add(mesh);
    });

    return group;
  }

  private static createRafterMesh(
    rafter: Rafter,
    options: GeneratorOptions
  ): THREE.Mesh {
    // Créer géométrie du profil
    const profileShape = ProfileLibrary.getProfileShape(rafter.profile);
    const geometry = new THREE.ExtrudeGeometry(profileShape, {
      depth: rafter.length,
      bevelEnabled: false
    });

    // Positionner et orienter
    const mesh = new THREE.Mesh(geometry, this.getMaterial(options));
    mesh.position.set(rafter.position.x, rafter.position.y, rafter.position.z);
    mesh.rotation.set(
      0,
      rafter.side === 'left' ? -rafter.angle * (Math.PI / 180) : rafter.angle * (Math.PI / 180),
      0
    );

    return mesh;
  }
}
```

### 6. Adapter l'Interface Utilisateur

**Fichier:** `components/steps/Step1_Dimensions.tsx`

Ajouter des champs conditionnels selon le type:

```typescript
{buildingType === BuildingType.BI_PENTE && (
  <div style={formRowStyle}>
    <div style={formGroupStyle}>
      <label style={labelStyle}>Pente côté gauche (%)</label>
      <input
        type="number"
        value={(dimensions as BiPenteDimensions).leftSlope}
        onChange={(e) => onDimensionsChange({
          leftSlope: parseInt(e.target.value)
        })}
        min={3}
        max={50}
      />
    </div>

    <div style={formGroupStyle}>
      <label style={labelStyle}>Pente côté droit (%)</label>
      <input
        type="number"
        value={(dimensions as BiPenteDimensions).rightSlope}
        onChange={(e) => onDimensionsChange({
          rightSlope: parseInt(e.target.value)
        })}
        min={3}
        max={50}
      />
    </div>
  </div>
)}
```

### 7. Mettre à Jour la Nomenclature

**Fichier:** `core/NomenclatureBuilder.ts`

```typescript
static buildFromBuilding(building: Building): Nomenclature {
  switch (building.type) {
    case BuildingType.MONO_PENTE:
      return this.buildMonoPenteNomenclature(building);

    case BuildingType.BI_PENTE:
      return this.buildBiPenteNomenclature(building);

    // ...
  }
}

private static buildBiPenteNomenclature(
  building: BiPenteBuilding
): Nomenclature {
  // Adapter le calcul des quantités pour bipente
  // - 2 versants de toiture
  // - Poutre faîtière
  // - Arbalétriers différents gauche/droite
  // ...
}
```

---

## 📊 Checklist Complète

### Pour chaque nouveau type de bâtiment:

- [ ] **Types**
  - [ ] Créer interface `*Dimensions` extends `BuildingDimensions`
  - [ ] Créer interface `*Building` extends `BaseBuilding`
  - [ ] Créer interface `*Structure`
  - [ ] Ajouter valeur dans enum `BuildingType`

- [ ] **Calculs**
  - [ ] Créer classe `*Calculator`
  - [ ] Implémenter calculs d'ossature
  - [ ] Implémenter calculs de surfaces
  - [ ] Ajouter tests unitaires

- [ ] **Génération**
  - [ ] Créer classe `*Engine`
  - [ ] Générer structure complète
  - [ ] Valider paramètres
  - [ ] Intégrer dans `BuildingEngine`

- [ ] **Générateurs 3D**
  - [ ] Adapter `PostGenerator` si nécessaire
  - [ ] Créer `*RafterGenerator` spécifique
  - [ ] Créer `*PurlinGenerator` spécifique
  - [ ] Mettre à jour `GeometryService`

- [ ] **Nomenclature**
  - [ ] Adapter `NomenclatureBuilder`
  - [ ] Calculer quantités spécifiques
  - [ ] Générer sections détaillées

- [ ] **Interface**
  - [ ] Ajouter option dans sélecteur
  - [ ] Créer champs spécifiques
  - [ ] Ajouter validation
  - [ ] Mettre à jour textes d'aide

- [ ] **Export IFC**
  - [ ] Adapter `IFCExporter` pour nouveau type
  - [ ] Mapper entités spécifiques
  - [ ] Tester compatibilité

- [ ] **Documentation**
  - [ ] Mettre à jour README.md
  - [ ] Créer exemples d'utilisation
  - [ ] Documenter limitations

---

## 🎨 Exemple Complet: Auvent

Voici un exemple simplifié pour un bâtiment de type auvent (structure ouverte):

```typescript
// 1. Types
export interface AuventDimensions extends BuildingDimensions {
  backHeight: number;        // Hauteur arrière
  hasBackWall: boolean;      // Mur arrière ou non
  hasSideWalls: boolean;     // Murs latéraux ou non
}

// 2. Calculator
export class AuventCalculator {
  static calculateAuventFrame(dimensions: AuventDimensions): AuventCalculations {
    // Pas de mur avant
    // Pente simple
    // Possibilité de murs latéraux
    // ...
  }
}

// 3. Engine
export class AuventEngine {
  static createAuventBuilding(config): AuventBuilding {
    // Génération similaire à monopente
    // mais sans bardage avant
    // et structure réduite
    // ...
  }
}

// 4. Interface
{buildingType === BuildingType.AUVENT && (
  <>
    <FormField
      label="Hauteur arrière (mm)"
      value={dimensions.backHeight}
      onChange={(v) => onDimensionsChange({ backHeight: v })}
    />
    <FormField
      type="checkbox"
      label="Inclure mur arrière"
      checked={dimensions.hasBackWall}
      onChange={(v) => onDimensionsChange({ hasBackWall: v })}
    />
  </>
)}
```

---

## 🔧 Conseils d'Implémentation

### Réutilisation de Code

- Extraire la logique commune dans des classes utilitaires
- Utiliser l'héritage pour les calculateurs
- Mutualiser les générateurs 3D de base

### Tests

```typescript
describe('BiPenteCalculator', () => {
  it('devrait calculer correctement la hauteur au faîtage', () => {
    const dims: BiPenteDimensions = {
      length: 20000,
      width: 12000,
      heightWall: 6000,
      leftSlope: 15,
      rightSlope: 15
    };

    const result = BiPenteCalculator.calculateRidgeHeight(dims);
    expect(result).toBe(6900); // 6000 + (6000 * 0.15)
  });
});
```

### Performance

- Utiliser des générateurs pour les grandes structures
- Optimiser LOD pour la 3D
- Mettre en cache les calculs coûteux

---

## 📚 Ressources

- [Documentation IFC](https://standards.buildingsmart.org/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Eurocodes structurels](https://eurocodes.jrc.ec.europa.eu/)

---

**Building Estimator Extension Guide** • TopSteelCAD • Octobre 2025
