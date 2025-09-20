# Part Builder Module - TopSteelCAD

Module complet pour la création de pièces métalliques de A à Z dans TopSteelCAD.

## Fonctionnalités

### 1. Création de Profils
- **Bibliothèque de profils** : Accès complet à la base de données de profils européens et américains
- **Modification de longueur** : Ajustement dynamique de la longueur
- **Angles de coupe** : Définition individuelle des angles aux extrémités
- **Notches** : Configuration des notches aux extrémités (rectangulaire, circulaire, personnalisé)
- **Positionnement des trous** : Système d'aide au positionnement avec suggestions intelligentes

### 2. Création de Plaques
- **Contour personnalisé** : Édition point par point avec DataTable
- **Formes prédéfinies** : Rectangle, carré, cercle, hexagone, forme en L, forme en T
- **Snap to grid** : Alignement automatique sur grille configurable
- **Gestion des trous** : Ajout et édition de trous avec positionnement assisté

### 3. Système de Features
- **Types supportés** : Trous, perçages, slots, notches, chanfreins, marquages
- **Patterns** : Génération automatique de patterns (linéaire, circulaire, grille)
- **Validation** : Vérification des conflits et des limites
- **Assistant de positionnement** : Suggestions intelligentes basées sur les standards

### 4. Workflow Guidé
- **Navigation par étapes** :
  1. Sélection du type de pièce
  2. Configuration de base
  3. Ajout de features
  4. Positionnement
  5. Validation
  6. Finalisation
- **Validation en temps réel**
- **Undo/Redo**
- **Preview 3D en direct**

### 5. Templates Prédéfinies
- **Templates disponibles** :
  - Poutres IPE standards
  - Plaques de base pour colonnes
  - Plaques de connexion
  - Équerres
  - Goussets
  - Raidisseurs
- **Paramètres configurables** par template
- **Création rapide** à partir de templates

### 6. Export Multi-Format
- **DSTV** : Format standard pour la fabrication
- **JSON** : Format structuré pour l'intégration
- **DXF** : Compatible AutoCAD
- **STEP** : Échange de données produit
- **IFC** : Industry Foundation Classes

## Architecture

```
part-builder/
├── types/                  # Types TypeScript
├── services/              # Services métier
│   └── PartBuilderService.ts
├── utils/                 # Utilitaires
│   ├── PartValidator.ts
│   ├── PartExporter.ts
│   ├── PositioningAssistant.ts
│   └── PlateGeometryGenerator.ts
├── components/            # Composants React
│   ├── PartBuilder.tsx
│   ├── ProfileEditor.tsx
│   ├── PlateEditor.tsx
│   ├── FeatureEditor.tsx
│   ├── MaterialEditor.tsx
│   └── TemplateSelector.tsx
├── stores/                # État Zustand
│   └── PartBuilderStore.ts
├── templates/             # Templates prédéfinies
└── __tests__/            # Tests unitaires
```

## Utilisation

### Intégration dans TopSteelCAD

```typescript
import { PartBuilder, integratePartBuilder } from './part-builder';

// Intégrer le module
integratePartBuilder(topSteelCADInstance);

// Utiliser le composant
<PartBuilder
  mode="create"
  onComplete={(part) => console.log('Part created:', part)}
/>
```

### Utilisation du Service

```typescript
import { PartBuilderService } from './part-builder';

const service = PartBuilderService.getInstance();

// Créer une session
const sessionId = service.createSession('create');

// Mettre à jour la définition
service.updatePartDefinition(sessionId, {
  type: PartType.PROFILE,
  profileDefinition: {
    type: ProfileType.IPE,
    designation: 'IPE 300',
    length: 6000
  }
});

// Générer la géométrie
const part = await service.generatePartGeometry(partDefinition);
```

### Utilisation des Templates

```typescript
import { getPartTemplates, applyTemplate } from './part-builder';

// Obtenir toutes les templates
const templates = getPartTemplates();

// Appliquer une template
const partDefinition = applyTemplate(template, {
  length: 6000,
  thickness: 20
});
```

## DataTable Integration

Le module utilise le composant DataTable de TopSteel pour :
- **Sélection de profils** : Navigation et filtrage dans la bibliothèque
- **Points de contour** : Édition des coordonnées des plaques
- **Liste de features** : Gestion des features ajoutées
- **Suggestions** : Affichage des suggestions de positionnement

## Tests

```bash
npm test src/TopSteelCAD/part-builder
```

## Points Forts

1. **Interface intuitive** : Workflow guidé étape par étape
2. **Flexibilité** : Support complet des profils et plaques
3. **Intelligence** : Suggestions et aide au positionnement
4. **Intégration** : Compatible avec le DataTable existant
5. **Extensibilité** : Architecture modulaire et extensible
6. **Performance** : Génération de géométrie optimisée
7. **Validation** : Vérification en temps réel

## Améliorations Futures

- Support de formes de plaques plus complexes
- Importation de contours DXF
- Bibliothèque de connexions standards
- Calculs de résistance intégrés
- Export vers plus de formats CAO
- Synchronisation cloud des templates

## Dépendances

- React
- Three.js
- Zustand
- DataTable (TopSteel UI)
- ProfileDatabase (TopSteelCAD)
- FeatureSystem (TopSteelCAD)

## License

Propriétaire - TopSteelCAD