# Convertisseurs Part Builder

Ce dossier contient les convertisseurs pour transformer les données entre différents formats.

## `partToPivot.ts`

Convertit les `PartElement` du Part Builder en `PivotElement` du viewer 3D.

### Fonctions principales

#### `convertPartElementToPivotElement(partElement: PartElement): PivotElement`

Convertit un seul élément. Gère :
- Conversion des types de matériau
- Normalisation des dimensions
- Conversion des trous en features sélectionnables
- Stockage dans `metadata.features` pour FeatureApplicator
- Propriétés matériau et calculs de volume

#### `convertPartElementsToPivotElements(partElements: PartElement[]): PivotElement[]`

Convertit un tableau d'éléments.

#### `updatePivotElementFromPartElement(existingPivotElement: PivotElement, updatedPartElement: PartElement): PivotElement`

Met à jour un PivotElement existant en préservant certaines propriétés (position, rotation, états de sélection).

### Structure des données converties

```typescript
// PartElement -> PivotElement
{
  // Identification
  id: partElement.id,
  name: "IPE200",

  // Géométrie (format tableau [x,y,z])
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],

  // Features sélectionnables ET dans metadata
  features: SelectableFeature[], // Pour la sélection
  metadata: {
    features: FeatureData[] // Pour FeatureApplicator
  }
}
```

### Exemple d'utilisation

```typescript
import { convertPartElementToPivotElement } from './converters/partToPivot';

// Dans PartBuilder.tsx
const pivotElement = convertPartElementToPivotElement(selectedElement3D);

// Pour le viewer 3D
<ProfessionalViewer elements={[pivotElement]} />

// Pour l'export
const pivotElements = state.elements.map(convertPartElementToPivotElement);
exportParts(pivotElements, format);
```

### Avantages

1. **Type Safety**: Conversion typée avec gestion d'erreurs
2. **Compatibilité**: Fonctionne avec FeatureApplicator existant
3. **Maintenabilité**: Code propre et testable
4. **Performance**: Évite les conversions manuelles répétées
5. **Traçabilité**: Préserve les données originales