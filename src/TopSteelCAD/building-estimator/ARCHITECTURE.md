# Architecture du Building Estimator

## 🏗️ Vue d'ensemble

Le Building Estimator est organisé en **4 étapes** distinctes, permettant une saisie progressive et structurée des données du bâtiment.

## 📐 Étapes de configuration

### **Étape 1 : Dimensions** (`BuildingConfigStep.DIMENSIONS`)
Configuration de la structure de base avec **navigation par structure** :
- **Vue par structure** : Bâtiment principal et extensions accessibles via StructureTabs
- Affichage des dimensions principales (longueur, largeur, hauteur, faîtage)
- Affichage des paramètres (entraxes)
- **Aperçu 3D** : Visualisation de la structure active avec mise en évidence
- **Layout cohérent** : Même structure 2 colonnes que les autres étapes

### **Étape 2 : Équipements** (`BuildingConfigStep.EQUIPMENT`)
Ajout des équipements et sécurité :
- **Ouvertures** : portes, fenêtres, exutoires, etc.
- **Garde-corps** : configuration par structure
- **Acrotères** : configuration par structure

### **Étape 3 : Enveloppe** (`BuildingConfigStep.ENVELOPE`)
Configuration de l'enveloppe par structure :
- **Bardage** : 7 types (bac acier, panneau sandwich, bois, composite, fibro-ciment, métallique)
- **Couverture** : 7 types (bac acier, panneau sandwich, tuiles, ardoises, membrane, béton)
- Configuration couleur, finition, isolation, options

### **Étape 4 : Finitions** (`BuildingConfigStep.FINISHING`)
Finitions et options par structure :
- **Peinture** : 6 types (galvanisation, thermolaquage, peinture liquide/poudre, métallisation)
- **Accessoires** : 12 types (gouttières, descentes EP, faîtages, lignes de vie, etc.)
- **Options** : 12 types en 3 catégories (techniques, services, documentation)

---

## 📚 Exemple complet

Un exemple d'utilisation complet est disponible dans `examples/BuildingEstimatorExample.tsx`. Cet exemple montre :

- **Intégration du workflow complet** : Navigation entre les 4 étapes avec gestion de l'état
- **Structure cohérente pour TOUTES les étapes** :
  - **StructureTabs** : Présent dans les 4 étapes pour basculer entre bâtiment principal et extensions
  - **Layout 2 colonnes** : Configuration à gauche, aperçu 3D à droite (toutes les étapes)
  - **Structure active affichée** : Indication claire de la structure en cours de configuration
- **BuildingPreview3D avec toutes les fonctionnalités** :
  - Affichage des ouvertures (portes, fenêtres, exutoires) avec ossature secondaire
  - Affichage des garde-corps configurés par structure
  - Affichage des acrotères configurés par structure
  - Mise en évidence de la structure active (`highlightStructureId`)
  - Rendu des extensions
- **Gestion de la progression** : Validation d'étape et déblocage des étapes suivantes
- **Gestion d'état complète** :
  - Ouvertures dynamiques avec CRUD
  - Configuration de garde-corps par structure
  - Configuration d'acrotères par structure
  - Configuration de bardage par structure
  - Configuration de couverture par structure
  - Configuration de peinture par structure
  - Configuration d'accessoires par structure
  - Configuration d'options par structure
  - Filtrage automatique par structure active

**Structure de l'exemple :**
```tsx
// États
const [openingsList, setOpeningsList] = useState<BuildingOpening[]>([]);
const [equipmentByStructure, setEquipmentByStructure] = useState<{
  [structureId: string]: {
    guardrail?: GuardrailConfig;
    acrotere?: AcrotereConfig;
  }
}>({});
const [envelopeByStructure, setEnvelopeByStructure] = useState<{
  [structureId: string]: {
    clading?: CladingConfig;
    roofing?: RoofingConfig;
  }
}>({});
const [finishingByStructure, setFinishingByStructure] = useState<{
  [structureId: string]: {
    painting?: PaintingConfig;
    accessories?: AccessoriesConfig;
    options?: OptionsConfig;
  }
}>({});

// Étape 2 : Équipements
<OpeningEditor ... />
<GuardrailEditor ... />
<AcrotereEditor ... />

// Étape 3 : Enveloppe
<CladingEditor ... />
<RoofingEditor ... />

// Étape 4 : Finitions
<PaintingEditor ... />
<AccessoriesEditor ... />
<OptionsEditor ... />

// Aperçu 3D avec configuration active
<BuildingPreview3D
  ...
  openings={openingsList}
  parameters={{
    ...parameters,
    guardrail: equipmentByStructure[activeStructureId]?.guardrail,
    acrotere: equipmentByStructure[activeStructureId]?.acrotere
  }}
/>
```

**Lancer l'exemple :**
```bash
# Ajouter l'import dans votre fichier de test
import { BuildingEstimatorExample } from './examples/BuildingEstimatorExample';
```

---

## 🧩 Composants réutilisables

### **1. `StructureTabs`**

Permet de naviguer entre les différentes structures (bâtiment principal + extensions).

**Props :**
```typescript
interface StructureTabsProps {
  structures: Structure[];          // Liste des structures
  activeStructureId: string;         // ID structure active
  onStructureChange: (id: string) => void;
  children: React.ReactNode;         // Contenu de l'onglet actif
}

interface Structure {
  id: string;
  name: string;
  type: 'main' | 'extension';
  icon?: string;
  parentId?: string;  // Pour hiérarchie
}
```

**Exemple d'utilisation :**
```tsx
const structures: Structure[] = [
  { id: 'main', name: 'Bâtiment principal', type: 'main' },
  { id: 'ext-1', name: 'Extension 1', type: 'extension', parentId: undefined },
  { id: 'ext-2', name: 'Extension 2', type: 'extension', parentId: 'ext-1' }
];

<StructureTabs
  structures={structures}
  activeStructureId={activeId}
  onStructureChange={setActiveId}
>
  {/* Contenu pour la structure active */}
  <YourContentComponent structureId={activeId} />
</StructureTabs>
```

---

### **2. `StepNavigation`**

Navigation entre les étapes de configuration avec indicateur de progression.

**Props :**
```typescript
interface StepNavigationProps {
  currentStep: BuildingConfigStep;
  onStepChange: (step: BuildingConfigStep) => void;
  completedSteps?: BuildingConfigStep[];
}
```

**Exemple d'utilisation :**
```tsx
<StepNavigation
  currentStep={currentStep}
  onStepChange={setCurrentStep}
  completedSteps={[BuildingConfigStep.DIMENSIONS]}
/>
```

**Caractéristiques :**
- Indicateur visuel de progression
- Étapes complétées marquées avec ✓
- Navigation impossible vers étapes non accessibles
- Boutons Précédent/Suivant automatiques

---

### **3. `BuildingPreview3D`** (amélioré)

Aperçu 3D réutilisable avec support des ouvertures et mise en évidence.

**Props :**
```typescript
interface BuildingPreview3DProps {
  buildingType: BuildingType;
  dimensions: BuildingDimensions;
  parameters?: BuildingParameters;
  extensions?: BuildingExtension[];
  openings?: BuildingOpening[];        // NOUVEAU
  highlightStructureId?: string;       // NOUVEAU
  width?: number;
  height?: number;
}
```

**Exemple d'utilisation :**
```tsx
<BuildingPreview3D
  buildingType={BuildingType.MONO_PENTE}
  dimensions={dimensions}
  parameters={parameters}
  extensions={extensions}
  openings={openings}
  highlightStructureId="ext-1"  // Mettre en évidence l'extension 1
  width={600}
  height={400}
/>
```

**Rendu des ouvertures :**
- **Ouvertures verticales** : Cadre orange, remplissage bleu translucide, ossature secondaire verte (potelets, linteaux, seuils)
- **Ouvertures en toiture** : Cadre orange, remplissage jaune translucide, chevêtre vert
- **Labels** : Nom de l'ouverture affiché sur un panneau pour identification

---

### **4. `OpeningEditor`** (nouveau)

Éditeur interactif pour gérer les ouvertures (ajout, modification, suppression).

**Props :**
```typescript
interface OpeningEditorProps {
  structureId: string;                           // ID de la structure active
  onAdd: (opening: BuildingOpening) => void;     // Callback ajout
  onUpdate: (opening: BuildingOpening) => void;  // Callback modification
  onDelete: (openingId: string) => void;         // Callback suppression
  openings: BuildingOpening[];                   // Liste des ouvertures
  maxBays?: number;                              // Nombre de travées disponibles
}
```

**Exemple d'utilisation :**
```tsx
const [openings, setOpenings] = useState<BuildingOpening[]>([]);

const handleAdd = (opening: BuildingOpening) => {
  setOpenings([...openings, opening]);
};

const handleUpdate = (opening: BuildingOpening) => {
  setOpenings(openings.map(o => o.id === opening.id ? opening : o));
};

const handleDelete = (openingId: string) => {
  setOpenings(openings.filter(o => o.id !== openingId));
};

<OpeningEditor
  structureId={activeStructureId}
  onAdd={handleAdd}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
  openings={openings.filter(o => (o.structureId || 'main') === activeStructureId)}
  maxBays={6}
/>
```

**Caractéristiques :**
- **Sélection visuelle du type** : Grille avec icônes pour 8 types d'ouvertures
- **Configuration des dimensions** : Largeur, hauteur, hauteur au sol
- **Positionnement intelligent** :
  - Long-pan : Choix de la travée (optionnel)
  - Pignon : Position en largeur (mm)
  - Toiture : Travée + position largeur
- **Ossature secondaire** : Potelets, linteaux, seuils, chevêtre (checkboxes)
- **Préréglages par type** : Dimensions et ossature par défaut selon le type
- **Liste des ouvertures** : Affichage, édition et suppression
- **État vide** : Placeholder avec appel à l'action

---

### **5. `GuardrailEditor`** (nouveau)

Éditeur interactif pour configurer les garde-corps par structure.

**Props :**
```typescript
interface GuardrailEditorProps {
  structureId: string;                               // ID de la structure
  config?: GuardrailConfig;                          // Configuration actuelle
  onChange: (config: GuardrailConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [guardrailConfig, setGuardrailConfig] = useState<GuardrailConfig | undefined>();

<GuardrailEditor
  structureId="main"
  config={guardrailConfig}
  onChange={setGuardrailConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer les garde-corps
- **9 types de garde-corps** : Lisses horizontales, barreaux verticaux, câbles, panneaux (grillagés, pleins, perforés), verre, mixtes
- **Sélection des faces** : Long-pan avant/arrière, pignons gauche/droit
- **Configuration dimensions** : Hauteur (1000-1500mm), entraxe des poteaux
- **Plinthe optionnelle** : Activation et configuration de la hauteur
- **Options par type** :
  - Lisses : Nombre de lisses (2-5)
  - Barreaux : Espacement (80-150mm)
  - Câbles : Nombre de câbles (3-8)
  - Mixte : Hauteur remplissage bas + lisses hautes
- **Sélecteur de couleur** : Choix visuel avec preview
- **Résumé visuel** : Aperçu de la configuration

---

### **6. `AcrotereEditor`** (nouveau)

Éditeur interactif pour configurer les acrotères par structure.

**Props :**
```typescript
interface AcrotereEditorProps {
  structureId: string;                               // ID de la structure
  config?: AcrotereConfig;                           // Configuration actuelle
  onChange: (config: AcrotereConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [acrotereConfig, setAcrotereConfig] = useState<AcrotereConfig | undefined>();

<AcrotereEditor
  structureId="main"
  config={acrotereConfig}
  onChange={setAcrotereConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer les acrotères
- **Hauteur configurable** : 500-1500mm au-dessus du point le plus haut du toit
- **2 modes de placement** :
  - **Contour complet** : Appliqué sur toutes les faces
  - **Faces spécifiques** : Choix des faces (long-pan avant/arrière, pignons)
- **Résumé visuel** : Aperçu de la configuration
- **Note technique** : Rappel que l'acrotère est toujours droit (sommet horizontal)

---

### **7. `CladingEditor`** (nouveau)

Éditeur interactif pour configurer le bardage par structure.

**Props :**
```typescript
interface CladingEditorProps {
  structureId: string;                               // ID de la structure
  config?: CladingConfig;                            // Configuration actuelle
  onChange: (config: CladingConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [cladingConfig, setCladingConfig] = useState<CladingConfig | undefined>();

<CladingEditor
  structureId="main"
  config={cladingConfig}
  onChange={setCladingConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer le bardage
- **7 types de bardage** :
  - Bac acier simple peau (avec choix du profil T20-T150)
  - Panneau sandwich isolant (épaisseur totale et isolation)
  - Bardage bois (orientation verticale/horizontale)
  - Bardage composite
  - Bardage fibro-ciment
  - Cassettes métalliques
  - Aucun bardage
- **Sélection des faces** : Long-pan avant/arrière, pignons gauche/droit
- **Configuration selon le type** :
  - Bac acier : Choix du profil (T20, T35, T40, T45, T60, T100, T150, Ondulé)
  - Panneau sandwich : Épaisseur totale (40-200mm) et isolation (20-180mm)
  - Bardage lames : Sens de pose (vertical/horizontal)
- **Couleur et finition** : Sélecteur de couleur + choix finition (mat, satiné, brillant)
- **Options** : Pare-vapeur, pare-pluie
- **Résumé visuel** : Aperçu de la configuration

---

### **8. `RoofingEditor`** (nouveau)

Éditeur interactif pour configurer la couverture par structure.

**Props :**
```typescript
interface RoofingEditorProps {
  structureId: string;                               // ID de la structure
  config?: RoofingConfig;                            // Configuration actuelle
  onChange: (config: RoofingConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [roofingConfig, setRoofingConfig] = useState<RoofingConfig | undefined>();

<RoofingEditor
  structureId="main"
  config={roofingConfig}
  onChange={setRoofingConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer la couverture
- **7 types de couverture** :
  - Bac acier simple peau (avec choix du profil T20-T150)
  - Panneau sandwich isolant (épaisseur totale et isolation)
  - Tuiles (modèle et recouvrement)
  - Ardoises (modèle et recouvrement)
  - Membrane d'étanchéité (toit plat)
  - Dalle béton (toit plat)
  - Aucune couverture
- **Configuration selon le type** :
  - Bac acier : Choix du profil (T20, T35, T40, T45, T60, T100, T150, Ondulé)
  - Panneau sandwich : Épaisseur totale (60-250mm) et isolation (40-230mm)
  - Tuiles/Ardoises : Modèle et recouvrement (80-200mm)
- **Pente minimale** : Configuration de la pente pour évacuation des eaux (0-50%)
- **Couleur et finition** : Sélecteur de couleur + choix finition (mat, satiné, brillant)
- **Options** : Pare-vapeur, étanchéité supplémentaire
- **Résumé visuel** : Aperçu de la configuration

---

### **9. `PaintingEditor`** (nouveau)

Éditeur interactif pour configurer la peinture et le traitement de surface par structure.

**Props :**
```typescript
interface PaintingEditorProps {
  structureId: string;                               // ID de la structure
  config?: PaintingConfig;                           // Configuration actuelle
  onChange: (config: PaintingConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [paintingConfig, setPaintingConfig] = useState<PaintingConfig | undefined>();

<PaintingEditor
  structureId="main"
  config={paintingConfig}
  onChange={setPaintingConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer la peinture
- **6 types de peinture/protection** :
  - Aucune peinture
  - Galvanisation à chaud (protection anticorrosion)
  - Thermolaquage (peinture poudre polymérisée)
  - Peinture liquide
  - Peinture poudre
  - Métallisation
- **Traitement de surface préalable** : Sablage, grenaillage, passivation, phosphatation, anodisation
- **Configuration couleur** :
  - Sélecteur de couleur visuel
  - Code RAL
  - Finition (mat, satiné, brillant, texturé)
- **Épaisseur et couches** : Épaisseur en microns (40-300μm), nombre de couches (1-5)
- **Application sélective** :
  - Structure porteuse
  - Ossature secondaire
  - Enveloppe (bardage/couverture)
  - Équipements (garde-corps, acrotères)
- **Couches supplémentaires** : Sous-couche (primer), couche de finition (top coat)
- **Info technique** : Notes sur galvanisation et thermolaquage
- **Résumé visuel** : Aperçu complet de la configuration

---

### **10. `AccessoriesEditor`** (nouveau)

Éditeur interactif pour gérer les accessoires et équipements complémentaires par structure.

**Props :**
```typescript
interface AccessoriesEditorProps {
  structureId: string;                               // ID de la structure
  config?: AccessoriesConfig;                        // Configuration actuelle
  onChange: (config: AccessoriesConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [accessoriesConfig, setAccessoriesConfig] = useState<AccessoriesConfig | undefined>();

<AccessoriesEditor
  structureId="main"
  config={accessoriesConfig}
  onChange={setAccessoriesConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer les accessoires
- **12 types d'accessoires** :
  - Gouttières
  - Descentes EP (eaux pluviales)
  - Bavettes et bandes de rives
  - Faîtages
  - Ventilations naturelles
  - Exutoires de fumée
  - Paratonnerre
  - Ligne de vie (protection antichute)
  - Échelle d'accès
  - Passerelles de circulation
  - Arrêts de neige
  - Protection oiseaux
- **Gestion de liste CRUD** : Ajout, édition, suppression, activation/désactivation d'accessoires
- **Configuration par accessoire** :
  - Quantité
  - Longueur totale (mm)
  - Couleur
  - Matériau
  - Position/Localisation
  - Faces concernées (long-pan avant/arrière, pignons)
  - Notes complémentaires
- **Interface visuelle** : Cartes dépliables avec formulaires d'édition intégrés
- **État vide** : Message d'invitation à ajouter des accessoires

---

### **11. `OptionsEditor`** (nouveau)

Éditeur interactif pour gérer les options diverses (techniques, services, documentation) par structure.

**Props :**
```typescript
interface OptionsEditorProps {
  structureId: string;                               // ID de la structure
  config?: OptionsConfig;                            // Configuration actuelle
  onChange: (config: OptionsConfig | undefined) => void;  // Callback changement
}
```

**Exemple d'utilisation :**
```tsx
const [optionsConfig, setOptionsConfig] = useState<OptionsConfig | undefined>();

<OptionsEditor
  structureId="main"
  config={optionsConfig}
  onChange={setOptionsConfig}
/>
```

**Caractéristiques :**
- **Activation/Désactivation** : Toggle simple pour activer les options
- **12 types d'options en 3 catégories** :
  - **Options techniques** :
    - Rupteur de ponts thermiques
    - Isolation acoustique renforcée
    - Protection incendie
    - Renforcement sismique
    - Contreventement renforcé
    - Contrôle de condensation
  - **Services** :
    - Garantie étendue
    - Contrat de maintenance
  - **Documentation** :
    - Modèle BIM fourni
    - Plans d'exécution
    - Notes de calcul
    - Notice de montage
- **Gestion de liste CRUD** : Ajout, édition, suppression, activation/désactivation d'options
- **Configuration par option** :
  - Niveau (standard, renforcé, maximum)
  - Durée (en mois, pour garanties/maintenance)
  - Format (pour documentation : PDF, DWG, IFC)
  - Notes complémentaires
- **Organisation par catégorie** : Affichage groupé avec codes couleur
- **Sélection par catégorie** : Filtre visuel lors de l'ajout d'options
- **Interface visuelle** : Cartes dépliables avec formulaires d'édition intégrés

---

## 📦 Types de données pour les ouvertures

### **`BuildingOpening`**

```typescript
interface BuildingOpening {
  id: string;
  name: string;
  type: OpeningType;                  // Type d'ouverture
  position: OpeningPosition;          // Position (long-pan, pignon, toit)

  structureId?: string;               // ID structure (undefined = principal)

  // Positionnement précis
  bayIndex?: number;                  // Travée
  offsetX?: number;                   // Décalage horizontal (mm)
  offsetY: number;                    // Hauteur (mm)
  offsetZ?: number;                   // Position largeur (mm)

  dimensions: OpeningDimensions;
  framing: OpeningFraming;            // Ossature secondaire
  properties?: {...};                 // Propriétés spécifiques
}
```

### **Types d'ouvertures** (`OpeningType`)

**Ouvertures verticales :**
- `PEDESTRIAN_DOOR` - Porte piétonne
- `SECTIONAL_DOOR` - Porte sectionnelle
- `ROLLER_SHUTTER` - Rideau métallique
- `WINDOW` - Fenêtre
- `GLAZED_BAY` - Baie vitrée

**Ouvertures en couverture :**
- `SMOKE_VENT` - Exutoire de fumée
- `ROOF_WINDOW` - Fenêtre de toit
- `SKYLIGHT` - Lanterneau

### **Positions** (`OpeningPosition`)

- `LONG_PAN_FRONT` / `LONG_PAN_BACK`
- `GABLE_LEFT` / `GABLE_RIGHT`
- `ROOF`

---

## 🎯 État d'avancement

### ✅ Phase 1 : Architecture réutilisable (Complétée)
- ✅ Types et enums pour le système d'étapes
- ✅ `StructureTabs` - Navigation entre structures
- ✅ `StepNavigation` - Navigation entre étapes
- ✅ Améliorations `BuildingPreview3D` (props openings et highlightStructureId)
- ✅ Documentation complète dans ARCHITECTURE.md

### ✅ Phase 2 : Système d'ouvertures (Complétée)
- ✅ Rendu 3D des ouvertures verticales (portes, fenêtres)
- ✅ Rendu 3D de l'ossature secondaire (potelets, linteaux, seuils)
- ✅ Rendu 3D des ouvertures en toiture (exutoires, lanterneaux, chevêtres)
- ✅ Composant `OpeningEditor` avec UI complète
- ✅ Intégration dans l'exemple `BuildingEstimatorExample`

### ✅ Phase 3 : Migration équipements (Complétée)

**1. Migration garde-corps**
- ✅ Migrer de la configuration globale vers par structure
- ✅ Créer composant `GuardrailEditor` avec UI complète
- ✅ Support de 9 types de garde-corps
- ✅ Configuration par face (long-pan, pignons)
- ✅ Intégrer dans l'étape Équipements
- ✅ Gestion d'état par structure dans l'exemple

**2. Migration acrotères**
- ✅ Migrer de la configuration globale vers par structure
- ✅ Créer composant `AcrotereEditor` avec UI complète
- ✅ Support de 2 modes de placement (contour, faces spécifiques)
- ✅ Intégrer dans l'étape Équipements
- ✅ Gestion d'état par structure dans l'exemple

**Note :** La compatibilité avec l'ancien système global est maintenue dans `BuildingPreview3D` qui accepte les configurations dans `BuildingParameters`.

### ✅ Phase 4 : Système d'enveloppe (Complétée)

**1. Système de bardage**
- ✅ Créer types pour bardage (`CladingType`, `CladingConfig`, etc.)
- ✅ Composant `CladingEditor` avec UI complète
- ✅ Support de 7 types de bardage (bac acier, panneau sandwich, bois, composite, fibro-ciment, cassettes métalliques)
- ✅ Configuration par face (long-pan, pignons)
- ✅ Options techniques (profils, épaisseur, isolation, orientation)
- ✅ Intégrer dans l'étape Enveloppe

**2. Système de couverture**
- ✅ Créer types pour couverture (`RoofingType`, `RoofingConfig`, etc.)
- ✅ Composant `RoofingEditor` avec UI complète
- ✅ Support de 7 types de couverture (bac acier, panneau sandwich, tuiles, ardoises, membrane, béton)
- ✅ Options techniques (profils, épaisseur, isolation, pente)
- ✅ Intégrer dans l'étape Enveloppe

### ✅ Phase 5 : Système de finitions (Complétée)

**1. Système de peinture et traitement**
- ✅ Créer types pour peinture (`PaintingType`, `SurfaceTreatmentType`, `PaintingConfig`, etc.)
- ✅ Composant `PaintingEditor` avec UI complète
- ✅ Support de 6 types de peinture (galvanisation, thermolaquage, peinture liquide/poudre, métallisation)
- ✅ Support de 5 traitements de surface (sablage, grenaillage, passivation, phosphatation, anodisation)
- ✅ Configuration couleur, RAL, finition, épaisseur, nombre de couches
- ✅ Application sélective (structure, ossature secondaire, enveloppe, équipements)
- ✅ Intégrer dans l'étape Finitions

**2. Système d'accessoires**
- ✅ Créer types pour accessoires (`AccessoryType`, `AccessoryItem`, `AccessoriesConfig`)
- ✅ Composant `AccessoriesEditor` avec UI complète et gestion CRUD
- ✅ Support de 12 types d'accessoires (gouttières, descentes EP, faîtages, paratonnerre, ligne de vie, etc.)
- ✅ Configuration détaillée (quantité, longueur, couleur, matériau, position, faces, notes)
- ✅ Interface de liste avec édition intégrée
- ✅ Intégrer dans l'étape Finitions

**3. Système d'options diverses**
- ✅ Créer types pour options (`OptionType`, `OptionItem`, `OptionsConfig`)
- ✅ Composant `OptionsEditor` avec UI complète et gestion CRUD
- ✅ Support de 12 types d'options en 3 catégories :
  - Options techniques (6) : rupteur thermique, isolation acoustique, protection incendie, sismique, contreventement, condensation
  - Services (2) : garantie étendue, contrat maintenance
  - Documentation (4) : modèle BIM, plans exécution, notes calcul, notice montage
- ✅ Configuration par option (niveau, durée, format, notes)
- ✅ Organisation par catégorie avec codes couleur
- ✅ Intégrer dans l'étape Finitions

**Note :** Toutes les étapes du workflow sont maintenant complètes. Le système offre une configuration complète du bâtiment de la structure jusqu'aux finitions.

---

## 💡 Bonnes pratiques

### **Séparation des préoccupations**

Chaque étape gère un aspect spécifique :
- **Dimensions** → Structure physique
- **Équipements** → Éléments ajoutés
- **Enveloppe** → Revêtements
- **Finitions** → Options

### **Réutilisabilité**

Les composants `StructureTabs` et `StepNavigation` peuvent être réutilisés dans d'autres modules si nécessaire.

### **État centralisé**

Recommandation : utiliser un état centralisé avec :
```typescript
interface BuildingConfig {
  step: BuildingConfigStep;

  // Étape 1
  mainBuilding: {...};
  extensions: [...];

  // Étape 2
  openings: [...];
  equipmentByStructure: {
    [structureId: string]: {
      guardrails?: GuardrailConfig;
      acroteres?: AcrotereConfig;
    }
  };

  // Étapes futures
  envelope?: {...};
  finishing?: {...};
}
```

---

## 🔧 Extensibilité

### Ajouter une nouvelle étape

1. Ajouter l'étape dans `BuildingConfigStep` enum
2. Ajouter dans `STEPS` array de `StepNavigation.tsx`
3. Créer le composant de contenu pour cette étape
4. Mettre à jour la logique de navigation

### Ajouter un nouveau type d'ouverture

1. **Ajouter dans `OpeningType` enum** (dans `types/building.types.ts`)
   ```typescript
   export enum OpeningType {
     // ... types existants
     MY_NEW_TYPE = 'my_new_type'
   }
   ```

2. **Ajouter le préréglage dans `OpeningEditor.tsx`**
   ```typescript
   const OPENING_PRESETS: Record<OpeningType, {...}> = {
     // ... presets existants
     [OpeningType.MY_NEW_TYPE]: {
       label: 'Mon nouveau type',
       icon: '🆕',
       category: 'vertical' | 'roof',
       defaultDimensions: { width: 1000, height: 2000 },
       defaultFraming: { verticalPosts: true, ... },
       positions: [OpeningPosition.LONG_PAN_FRONT, ...]
     }
   };
   ```

3. **(Optionnel) Personnaliser le rendu 3D** dans `BuildingPreview3D.tsx`
   - Par défaut, utilise le rendu standard vertical ou toit
   - Ajouter des spécificités visuelles si nécessaire

4. **(Optionnel) Ajouter propriétés spécifiques** dans `BuildingOpening.properties`

---

## 📝 Notes techniques

### Ossature secondaire

L'ossature secondaire est générée automatiquement selon le type d'ouverture :

- **Portes/Fenêtres verticales** : 2 potelets + linteau + seuil optionnel
- **Exutoires/Lanterneaux** : Chevêtre (4 pannes de bordure)
- **Grandes ouvertures** : Renforts supplémentaires

### Contraintes de positionnement

- Long-pan : Ouverture dans une travée, pas sur un portique
- Pignon : Peut nécessiter potelet supplémentaire
- Couverture : Entre 2 pannes, étanchéité critique

### Performance 3D

- Utiliser `highlightStructureId` pour focus visuel
- Optimiser le nombre de segments (LOD)
- Cache des géométries réutilisables
