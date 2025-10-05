# Modèle de Données - Profils Personnalisés (Custom Profiles)

## Vue d'ensemble

Ce document définit le modèle de données complet pour la fonctionnalité de profils personnalisés dans TopSteelCAD. Il permet aux utilisateurs de créer, stocker et manipuler des sections 2D personnalisées qui ne font pas partie des catalogues standards.

**Fichier principal:** `src/TopSteelCAD/3DLibrary/types/custom-profile.types.ts`

---

## 1. Interface CustomProfile - Définition Principale

### Structure Complète

```typescript
interface CustomProfile {
  // Identification
  id: string;                    // UUID v4
  name: string;                  // "Profile en T inversé"
  description?: string;          // Description détaillée
  designation: string;           // "CUSTOM-T-001"

  // Géométrie 2D
  shape: Shape2D;               // Forme complète avec trous

  // Propriétés calculées
  properties: CalculatedGeometryProperties;
  weight?: number;              // kg/m

  // Dimensions de référence
  referenceDimensions?: {
    height?: number;            // mm
    width?: number;             // mm
    thickness?: number;         // mm
  };

  // Métadonnées
  metadata: CustomProfileMetadata;

  // Paramètres d'extrusion
  extrusionSettings?: ExtrusionSettings;

  // Matériau par défaut
  defaultMaterial?: MaterialDefinition;

  // Validation
  validation?: ValidationState;

  // Compatibilité
  profileType: ProfileType.CUSTOM;

  // Options avancées
  advanced?: AdvancedOptions;
}
```

### Propriétés Détaillées

#### 1.1 Identification
- **id**: Identifiant unique (UUID v4) - généré automatiquement
- **name**: Nom descriptif choisi par l'utilisateur
- **designation**: Code normalisé ou personnalisé (ex: "CUSTOM-T-001", "MON-PROFILE-001")
- **description**: Texte libre pour documenter l'usage et les caractéristiques

#### 1.2 Métadonnées
```typescript
interface CustomProfileMetadata {
  author?: string;              // Nom du créateur
  organization?: string;        // Entreprise/organisation
  createdAt: string;           // ISO 8601 date
  updatedAt: string;           // ISO 8601 date
  version: string;             // Semver: "1.0.0"
  notes?: string;              // Commentaires libres
  tags?: string[];             // ["composite", "soudé", "spécial"]
  category?: string;           // "Poutres composites", "Profiles spéciaux"
}
```

---

## 2. Structure de la Forme 2D

### 2.1 Hiérarchie des Formes

```
Shape2D
├── outerContour: Contour2D (contour extérieur, obligatoire)
│   ├── id: string
│   ├── segments: GeometrySegment[]
│   ├── closed: boolean
│   ├── area?: number (cm²)
│   └── perimeter?: number (mm)
│
├── holes?: Contour2D[] (trous intérieurs, optionnel)
│   └── [même structure que outerContour]
│
└── boundingBox?: BoundingBox (calculé automatiquement)
    ├── minX: number
    ├── maxX: number
    ├── minY: number
    └── maxY: number
```

### 2.2 Types de Segments

#### Ligne Droite
```typescript
interface LineSegment {
  type: SegmentType.LINE;
  start: Point2D;     // { x: number, y: number }
  end: Point2D;
}
```

#### Arc Circulaire
```typescript
interface ArcSegment {
  type: SegmentType.ARC;
  center: Point2D;
  radius: number;              // mm
  startAngle: number;          // radians
  endAngle: number;            // radians
  counterClockwise?: boolean;  // sens de rotation
}
```

#### Courbe de Bézier Quadratique
```typescript
interface BezierQuadraticSegment {
  type: SegmentType.BEZIER_QUADRATIC;
  start: Point2D;
  control: Point2D;    // Point de contrôle
  end: Point2D;
}
```

#### Courbe de Bézier Cubique
```typescript
interface BezierCubicSegment {
  type: SegmentType.BEZIER_CUBIC;
  start: Point2D;
  control1: Point2D;   // Premier point de contrôle
  control2: Point2D;   // Deuxième point de contrôle
  end: Point2D;
}
```

#### Arc Elliptique
```typescript
interface EllipseSegment {
  type: SegmentType.ELLIPSE;
  center: Point2D;
  radiusX: number;             // mm
  radiusY: number;             // mm
  rotation: number;            // radians
  startAngle: number;          // radians
  endAngle: number;            // radians
  counterClockwise?: boolean;
}
```

### 2.3 Validation de Forme Fermée

Un contour est considéré **fermé** si:
1. Le dernier segment se termine au point de départ du premier segment (tolérance: 0.01mm)
2. Ou si `closePath()` a été appelé explicitement

**Validation automatique:**
```typescript
function validateClosedContour(contour: Contour2D): boolean {
  if (contour.segments.length === 0) return false;

  const firstPoint = getStartPoint(contour.segments[0]);
  const lastPoint = getEndPoint(contour.segments[contour.segments.length - 1]);

  const distance = Math.sqrt(
    Math.pow(lastPoint.x - firstPoint.x, 2) +
    Math.pow(lastPoint.y - firstPoint.y, 2)
  );

  return distance < 0.01; // Tolérance 0.01mm
}
```

---

## 3. Propriétés Physiques Calculées

### 3.1 Propriétés Géométriques

```typescript
interface CalculatedGeometryProperties {
  // Propriétés de base (OBLIGATOIRES)
  area: number;              // cm² - Aire nette (contour - trous)
  perimeter: number;         // mm - Périmètre total
  centroid: Point2D;         // mm - Centre de gravité

  // Propriétés d'inertie (OPTIONNELLES)
  inertia?: {
    Ixx: number;             // cm⁴ - Moment d'inertie selon X
    Iyy: number;             // cm⁴ - Moment d'inertie selon Y
    Ixy: number;             // cm⁴ - Produit d'inertie
  };

  // Rayons de giration (OPTIONNELS)
  radiusOfGyration?: {
    rx: number;              // cm - Rayon de giration selon X
    ry: number;              // cm - Rayon de giration selon Y
  };

  // Modules élastiques (OPTIONNELS)
  elasticModulus?: {
    Wx: number;              // cm³ - Module élastique selon X
    Wy: number;              // cm³ - Module élastique selon Y
  };
}
```

### 3.2 Calcul de l'Aire

**Méthode**: Formule de Shoelace (Surveyor's formula) pour polygones

```typescript
function calculateArea(contour: Contour2D): number {
  // Convertir tous les segments en points discrets
  const points = discretizeContour(contour);

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2; // mm²
}

// Aire nette = aire extérieure - somme des aires des trous
function calculateNetArea(shape: Shape2D): number {
  let netArea = calculateArea(shape.outerContour);

  if (shape.holes) {
    for (const hole of shape.holes) {
      netArea -= calculateArea(hole);
    }
  }

  return netArea / 100; // Conversion mm² → cm²
}
```

### 3.3 Calcul du Centre de Gravité

```typescript
function calculateCentroid(contour: Contour2D): Point2D {
  const points = discretizeContour(contour);
  const area = calculateArea(contour);

  let cx = 0, cy = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }

  const factor = 1 / (6 * area);
  return { x: cx * factor, y: cy * factor };
}
```

### 3.4 Calcul du Poids Linéique

```typescript
// Formule: Poids (kg/m) = Aire (cm²) × Densité (kg/dm³) / 100
function calculateWeight(area: number, density: number): number {
  return (area * density) / 100;
}

// Exemple: Profil avec aire de 50 cm², acier S355 (densité 7.85 kg/dm³)
const weight = calculateWeight(50, 7.85); // = 3.925 kg/m
```

---

## 4. Intégration avec ProfileType Existant

### 4.1 Ajout du Type CUSTOM

**Modification dans `profile.types.ts`:**

```typescript
export enum ProfileType {
  // Types existants...
  IPE = 'IPE',
  HEA = 'HEA',
  // ...

  // Nouveau type pour profils personnalisés
  CUSTOM = 'CUSTOM'
}
```

### 4.2 Distinction des Profils Standards

**Méthode 1: Vérification du type**
```typescript
function isCustomProfile(profile: SteelProfile | CustomProfile): profile is CustomProfile {
  return profile.type === ProfileType.CUSTOM || 'shape' in profile;
}
```

**Méthode 2: Propriété d'origine**
```typescript
interface SteelProfile {
  // ...
  origin?: 'database' | 'generated' | 'imported' | 'custom';
}

// Profils custom auront: origin = 'custom'
```

### 4.3 Compatibilité avec ProfileDatabase

**Option 1: Stockage séparé (RECOMMANDÉ)**

```typescript
class CustomProfileDatabase {
  private customProfiles: Map<string, CustomProfile>;

  async registerProfile(profile: CustomProfile): Promise<void> {
    this.customProfiles.set(profile.id, profile);
  }

  async findById(id: string): Promise<CustomProfile | undefined> {
    return this.customProfiles.get(id);
  }
}

// Utilisation combinée
class UnifiedProfileDatabase {
  private standardDB: ProfileDatabase;
  private customDB: CustomProfileDatabase;

  async findProfile(id: string): Promise<SteelProfile | CustomProfile | undefined> {
    // Chercher d'abord dans les profils standards
    let profile = await this.standardDB.findById(id);
    if (profile) return profile;

    // Puis dans les profils custom
    return await this.customDB.findById(id);
  }
}
```

**Option 2: Stockage unifié** (plus complexe)

```typescript
// ProfileDatabase accepte aussi CustomProfile
async registerProfile(profile: SteelProfile | CustomProfile): Promise<void> {
  if (isCustomProfile(profile)) {
    // Traitement spécifique pour custom
    this.customProfiles.set(profile.id, profile);
  } else {
    // Traitement standard
    const typeProfiles = this.profiles.get(profile.type) || [];
    typeProfiles.push(profile);
  }
}
```

---

## 5. Stockage LocalStorage

### 5.1 Structure de Stockage

```typescript
interface CustomProfileStorage {
  schemaVersion: string;        // "1.0.0"
  lastUpdated: string;          // ISO 8601
  profiles: CustomProfile[];    // Liste de tous les profils custom
  libraries?: CustomProfileLibrary[];  // Bibliothèques
}

const CUSTOM_PROFILES_STORAGE_KEY = 'topsteelcad:custom-profiles';
```

### 5.2 Opérations CRUD

```typescript
class CustomProfileStorageService {

  // CREATE
  async saveProfile(profile: CustomProfile): Promise<void> {
    const storage = this.loadStorage();

    // Vérifier si existe déjà
    const index = storage.profiles.findIndex(p => p.id === profile.id);

    if (index >= 0) {
      // Mise à jour
      storage.profiles[index] = profile;
    } else {
      // Nouveau profil
      storage.profiles.push(profile);
    }

    storage.lastUpdated = new Date().toISOString();
    this.persistStorage(storage);
  }

  // READ
  async loadProfile(id: string): Promise<CustomProfile | null> {
    const storage = this.loadStorage();
    return storage.profiles.find(p => p.id === id) || null;
  }

  // LIST
  async listProfiles(): Promise<CustomProfile[]> {
    const storage = this.loadStorage();
    return storage.profiles;
  }

  // DELETE
  async deleteProfile(id: string): Promise<boolean> {
    const storage = this.loadStorage();
    const initialLength = storage.profiles.length;

    storage.profiles = storage.profiles.filter(p => p.id !== id);

    if (storage.profiles.length < initialLength) {
      storage.lastUpdated = new Date().toISOString();
      this.persistStorage(storage);
      return true;
    }

    return false;
  }

  // HELPERS
  private loadStorage(): CustomProfileStorage {
    const data = localStorage.getItem(CUSTOM_PROFILES_STORAGE_KEY);

    if (!data) {
      return {
        schemaVersion: '1.0.0',
        lastUpdated: new Date().toISOString(),
        profiles: [],
        libraries: []
      };
    }

    return JSON.parse(data);
  }

  private persistStorage(storage: CustomProfileStorage): void {
    localStorage.setItem(
      CUSTOM_PROFILES_STORAGE_KEY,
      JSON.stringify(storage)
    );
  }
}
```

### 5.3 Format JSON pour Import/Export

```typescript
interface CustomProfileExportFormat {
  formatVersion: string;       // "1.0.0"
  exportedAt: string;          // ISO 8601
  type: 'single' | 'library';  // Type d'export
  profile?: CustomProfile;     // Si type = 'single'
  library?: CustomProfileLibrary;  // Si type = 'library'
}

// Exemple d'export
function exportProfile(profile: CustomProfile): string {
  const exportData: CustomProfileExportFormat = {
    formatVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    type: 'single',
    profile: profile
  };

  return JSON.stringify(exportData, null, 2);
}

// Exemple d'import
function importProfile(jsonString: string): CustomProfile {
  const data: CustomProfileExportFormat = JSON.parse(jsonString);

  if (data.type !== 'single' || !data.profile) {
    throw new Error('Format d\'import invalide');
  }

  // Validation
  validateCustomProfile(data.profile);

  return data.profile;
}
```

---

## 6. Conversion vers THREE.js

### 6.1 Conversion Shape2D → THREE.Shape

```typescript
import { Shape, Vector2 } from 'three';

function convertToThreeShape(shape2D: Shape2D): Shape {
  const threeShape = new Shape();

  // Convertir le contour extérieur
  convertContourToThreeShape(shape2D.outerContour, threeShape);

  // Ajouter les trous
  if (shape2D.holes && shape2D.holes.length > 0) {
    for (const hole of shape2D.holes) {
      const holePath = new Shape();
      convertContourToThreeShape(hole, holePath);
      threeShape.holes.push(holePath);
    }
  }

  return threeShape;
}

function convertContourToThreeShape(contour: Contour2D, shape: Shape): void {
  if (contour.segments.length === 0) return;

  // Commencer au premier point
  const firstPoint = getStartPoint(contour.segments[0]);
  shape.moveTo(firstPoint.x, firstPoint.y);

  // Parcourir tous les segments
  for (const segment of contour.segments) {
    switch (segment.type) {
      case SegmentType.LINE:
        shape.lineTo(segment.end.x, segment.end.y);
        break;

      case SegmentType.ARC:
        shape.absarc(
          segment.center.x,
          segment.center.y,
          segment.radius,
          segment.startAngle,
          segment.endAngle,
          segment.counterClockwise
        );
        break;

      case SegmentType.BEZIER_QUADRATIC:
        shape.quadraticCurveTo(
          segment.control.x,
          segment.control.y,
          segment.end.x,
          segment.end.y
        );
        break;

      case SegmentType.BEZIER_CUBIC:
        shape.bezierCurveTo(
          segment.control1.x,
          segment.control1.y,
          segment.control2.x,
          segment.control2.y,
          segment.end.x,
          segment.end.y
        );
        break;

      case SegmentType.ELLIPSE:
        shape.absellipse(
          segment.center.x,
          segment.center.y,
          segment.radiusX,
          segment.radiusY,
          segment.startAngle,
          segment.endAngle,
          segment.counterClockwise,
          segment.rotation
        );
        break;
    }
  }

  // Fermer le contour si nécessaire
  if (contour.closed) {
    shape.closePath();
  }
}
```

### 6.2 Extrusion vers BufferGeometry

```typescript
import { ExtrudeGeometry, BufferGeometry } from 'three';

function extrudeCustomProfile(
  customProfile: CustomProfile,
  length: number
): BufferGeometry {

  // Convertir en THREE.Shape
  const threeShape = convertToThreeShape(customProfile.shape);

  // Paramètres d'extrusion
  const settings = customProfile.extrusionSettings || {};

  const extrudeSettings = {
    depth: length,
    bevelEnabled: settings.bevelEnabled || false,
    bevelSize: settings.bevelSize || 0,
    bevelSegments: settings.bevelSegments || 1,
    curveSegments: settings.curveSegments || 12,
    steps: 1
  };

  // Créer la géométrie
  const geometry = new ExtrudeGeometry(threeShape, extrudeSettings);

  // Calculer les normales et bounding box
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
```

### 6.3 Générateur de Profils Personnalisés

```typescript
class CustomProfileGenerator extends BaseProfileGenerator {
  constructor() {
    super([ProfileType.CUSTOM]);
  }

  getName(): string {
    return 'CustomProfileGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    // dimensions devrait contenir une référence au CustomProfile
    const customProfile = (dimensions as any).customProfile as CustomProfile;

    if (!customProfile || !customProfile.shape) {
      throw new Error('CustomProfile invalide ou manquant');
    }

    return extrudeCustomProfile(customProfile, length);
  }

  // Méthode alternative prenant directement le CustomProfile
  generateFromCustomProfile(profile: CustomProfile, length: number): BufferGeometry {
    return extrudeCustomProfile(profile, length);
  }
}
```

---

## 7. Exemples de Profils JSON

### 7.1 Exemple Simple: Profil en T

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Profil en T personnalisé",
  "designation": "CUSTOM-T-001",
  "description": "Profil en T pour poutre composite, âme 200mm × 10mm, semelle 150mm × 15mm",
  "profileType": "CUSTOM",

  "shape": {
    "outerContour": {
      "id": "contour-main",
      "closed": true,
      "segments": [
        {
          "type": "LINE",
          "start": { "x": -75, "y": 0 },
          "end": { "x": 75, "y": 0 }
        },
        {
          "type": "LINE",
          "start": { "x": 75, "y": 0 },
          "end": { "x": 75, "y": 15 }
        },
        {
          "type": "LINE",
          "start": { "x": 75, "y": 15 },
          "end": { "x": 5, "y": 15 }
        },
        {
          "type": "LINE",
          "start": { "x": 5, "y": 15 },
          "end": { "x": 5, "y": 200 }
        },
        {
          "type": "LINE",
          "start": { "x": 5, "y": 200 },
          "end": { "x": -5, "y": 200 }
        },
        {
          "type": "LINE",
          "start": { "x": -5, "y": 200 },
          "end": { "x": -5, "y": 15 }
        },
        {
          "type": "LINE",
          "start": { "x": -5, "y": 15 },
          "end": { "x": -75, "y": 15 }
        },
        {
          "type": "LINE",
          "start": { "x": -75, "y": 15 },
          "end": { "x": -75, "y": 0 }
        }
      ],
      "area": 32.25,
      "perimeter": 750
    },
    "holes": [],
    "boundingBox": {
      "minX": -75,
      "maxX": 75,
      "minY": 0,
      "maxY": 200
    }
  },

  "properties": {
    "area": 32.25,
    "perimeter": 750,
    "centroid": { "x": 0, "y": 57.36 },
    "inertia": {
      "Ixx": 12500,
      "Iyy": 2800,
      "Ixy": 0
    }
  },

  "weight": 25.3,

  "referenceDimensions": {
    "height": 200,
    "width": 150,
    "thickness": 10
  },

  "metadata": {
    "author": "Jean Dupont",
    "organization": "Acier Concept SA",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "version": "1.0.0",
    "tags": ["composite", "poutre", "soudé"],
    "category": "Poutres composites",
    "notes": "Profil en T pour usage en composite acier-béton"
  },

  "defaultMaterial": {
    "grade": "S355",
    "density": 7.85,
    "yieldStrength": 355,
    "tensileStrength": 510
  },

  "extrusionSettings": {
    "defaultLength": 6000,
    "bevelEnabled": false,
    "curveSegments": 8
  },

  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "lastValidated": "2025-01-15T10:30:00Z"
  },

  "advanced": {
    "editable": true,
    "public": false
  }
}
```

### 7.2 Exemple Avancé: Profil avec Trou et Courbes

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Profil composite à trou elliptique",
  "designation": "CUSTOM-COMP-002",
  "description": "Profil rectangulaire avec trou elliptique central et coins arrondis",
  "profileType": "CUSTOM",

  "shape": {
    "outerContour": {
      "id": "contour-rect-arrondi",
      "closed": true,
      "segments": [
        {
          "type": "LINE",
          "start": { "x": -90, "y": 10 },
          "end": { "x": -90, "y": 140 }
        },
        {
          "type": "ARC",
          "center": { "x": -80, "y": 140 },
          "radius": 10,
          "startAngle": 3.14159,
          "endAngle": 1.5708,
          "counterClockwise": true
        },
        {
          "type": "LINE",
          "start": { "x": -80, "y": 150 },
          "end": { "x": 80, "y": 150 }
        },
        {
          "type": "ARC",
          "center": { "x": 80, "y": 140 },
          "radius": 10,
          "startAngle": 1.5708,
          "endAngle": 0,
          "counterClockwise": true
        },
        {
          "type": "LINE",
          "start": { "x": 90, "y": 140 },
          "end": { "x": 90, "y": 10 }
        },
        {
          "type": "ARC",
          "center": { "x": 80, "y": 10 },
          "radius": 10,
          "startAngle": 0,
          "endAngle": -1.5708,
          "counterClockwise": true
        },
        {
          "type": "LINE",
          "start": { "x": 80, "y": 0 },
          "end": { "x": -80, "y": 0 }
        },
        {
          "type": "ARC",
          "center": { "x": -80, "y": 10 },
          "radius": 10,
          "startAngle": -1.5708,
          "endAngle": 3.14159,
          "counterClockwise": true
        }
      ],
      "area": 270,
      "perimeter": 560
    },

    "holes": [
      {
        "id": "hole-ellipse",
        "closed": true,
        "segments": [
          {
            "type": "ELLIPSE",
            "center": { "x": 0, "y": 75 },
            "radiusX": 40,
            "radiusY": 25,
            "rotation": 0,
            "startAngle": 0,
            "endAngle": 6.28318,
            "counterClockwise": false
          }
        ],
        "area": 31.4,
        "perimeter": 204
      }
    ],

    "boundingBox": {
      "minX": -90,
      "maxX": 90,
      "minY": 0,
      "maxY": 150
    }
  },

  "properties": {
    "area": 238.6,
    "perimeter": 764,
    "centroid": { "x": 0, "y": 75 }
  },

  "weight": 18.73,

  "metadata": {
    "author": "Marie Martin",
    "organization": "Structures Innovantes",
    "createdAt": "2025-02-01T14:20:00Z",
    "updatedAt": "2025-02-01T14:20:00Z",
    "version": "1.0.0",
    "tags": ["allégé", "trou", "composite"],
    "category": "Profils allégés"
  },

  "defaultMaterial": {
    "grade": "S275",
    "density": 7.85
  },

  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": ["Le trou réduit la section de 11.6%"],
    "lastValidated": "2025-02-01T14:20:00Z"
  }
}
```

### 7.3 Exemple de Bibliothèque

```json
{
  "id": "lib-poutrelles-speciales",
  "name": "Bibliothèque de Poutrelles Spéciales",
  "description": "Collection de profils personnalisés pour structures spéciales",
  "version": "1.2.0",

  "profiles": [
    {
      "id": "...",
      "name": "Profil en T personnalisé",
      "...": "..."
    },
    {
      "id": "...",
      "name": "Profil composite à trou elliptique",
      "...": "..."
    }
  ],

  "metadata": {
    "author": "Bureau d'études XYZ",
    "organization": "Constructions Métalliques SA",
    "createdAt": "2024-06-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z",
    "tags": ["entreprise", "standard", "composite"]
  }
}
```

---

## 8. Plan de Migration vers Base de Données

### 8.1 Champs Additionnels Nécessaires

```typescript
interface DatabaseMigrationFields {
  // Identification BDD
  dbId?: number;                 // Auto-incrémenté (PRIMARY KEY)
  ownerId?: string;              // ID utilisateur propriétaire (FOREIGN KEY)

  // Permissions et partage
  permissions?: {
    public: boolean;             // Profil public ou privé
    sharedWith?: string[];       // IDs utilisateurs avec accès
    allowFork?: boolean;         // Permettre duplication
  };

  // Statistiques d'utilisation
  usage?: {
    viewCount?: number;          // Nombre de vues
    useCount?: number;           // Nombre d'utilisations
    forkCount?: number;          // Nombre de duplications
    lastUsed?: string;           // Date dernière utilisation
  };

  // Synchronisation cloud
  sync?: {
    syncedAt?: string;           // Date dernière synchro
    syncStatus?: 'synced' | 'pending' | 'conflict';
    remoteId?: string;           // ID dans le cloud
  };
}
```

### 8.2 Schéma de Table SQL

```sql
-- Table principale des profils personnalisés
CREATE TABLE custom_profiles (
  -- Identification
  db_id SERIAL PRIMARY KEY,
  id UUID UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  -- Propriétaire
  owner_id UUID NOT NULL REFERENCES users(id),

  -- Géométrie (stockée en JSONB pour flexibilité)
  shape_data JSONB NOT NULL,

  -- Propriétés calculées
  area DECIMAL(10, 2),
  perimeter DECIMAL(10, 2),
  weight DECIMAL(10, 3),
  properties JSONB,

  -- Métadonnées
  author VARCHAR(255),
  organization VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version VARCHAR(20) DEFAULT '1.0.0',
  tags TEXT[],
  category VARCHAR(100),
  notes TEXT,

  -- Permissions
  is_public BOOLEAN DEFAULT FALSE,
  shared_with UUID[],
  allow_fork BOOLEAN DEFAULT TRUE,

  -- Statistiques
  view_count INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- Synchronisation
  synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'synced',
  remote_id VARCHAR(255),

  -- Données complètes (backup JSON)
  full_data JSONB NOT NULL,

  -- Index
  CONSTRAINT check_sync_status CHECK (sync_status IN ('synced', 'pending', 'conflict'))
);

-- Index pour optimisation
CREATE INDEX idx_custom_profiles_owner ON custom_profiles(owner_id);
CREATE INDEX idx_custom_profiles_designation ON custom_profiles(designation);
CREATE INDEX idx_custom_profiles_tags ON custom_profiles USING GIN(tags);
CREATE INDEX idx_custom_profiles_public ON custom_profiles(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_custom_profiles_category ON custom_profiles(category);

-- Table des bibliothèques
CREATE TABLE custom_profile_libraries (
  db_id SERIAL PRIMARY KEY,
  id UUID UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0.0',
  owner_id UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[],

  -- Données complètes
  full_data JSONB NOT NULL
);

-- Table de liaison bibliothèques-profils
CREATE TABLE library_profiles (
  library_id UUID REFERENCES custom_profile_libraries(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES custom_profiles(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,

  PRIMARY KEY (library_id, profile_id)
);

-- Table d'historique des versions
CREATE TABLE profile_versions (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES custom_profiles(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author VARCHAR(255),
  change_log TEXT,
  snapshot_data JSONB NOT NULL,

  UNIQUE(profile_id, version)
);
```

### 8.3 Migration LocalStorage → Database

```typescript
class ProfileMigrationService {

  /**
   * Migre tous les profils de LocalStorage vers la base de données
   */
  async migrateAllProfiles(userId: string): Promise<void> {
    // 1. Charger depuis LocalStorage
    const storage = this.loadFromLocalStorage();

    // 2. Pour chaque profil
    for (const profile of storage.profiles) {
      try {
        // 3. Ajouter les champs BDD
        const profileWithDB: CustomProfileWithDB = {
          ...profile,
          db: {
            ownerId: userId,
            permissions: {
              public: false,
              allowFork: true
            },
            usage: {
              viewCount: 0,
              useCount: 0,
              forkCount: 0
            },
            sync: {
              syncStatus: 'pending'
            }
          }
        };

        // 4. Insérer dans la BDD
        await this.insertProfileToDB(profileWithDB);

        console.log(`✓ Migré: ${profile.name}`);
      } catch (error) {
        console.error(`✗ Échec migration: ${profile.name}`, error);
      }
    }

    // 5. Sauvegarder une copie de backup
    this.createBackup(storage);

    // 6. Optionnel: vider LocalStorage après confirmation
    // localStorage.removeItem(CUSTOM_PROFILES_STORAGE_KEY);
  }

  private async insertProfileToDB(profile: CustomProfileWithDB): Promise<void> {
    const query = `
      INSERT INTO custom_profiles (
        id, name, designation, description,
        owner_id, shape_data, area, perimeter, weight,
        properties, author, organization, version,
        tags, category, notes, is_public, allow_fork,
        full_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
    `;

    const values = [
      profile.id,
      profile.name,
      profile.designation,
      profile.description || null,
      profile.db?.ownerId,
      JSON.stringify(profile.shape),
      profile.properties.area,
      profile.properties.perimeter,
      profile.weight,
      JSON.stringify(profile.properties),
      profile.metadata.author,
      profile.metadata.organization,
      profile.metadata.version,
      profile.metadata.tags || [],
      profile.metadata.category,
      profile.metadata.notes,
      profile.db?.permissions?.public || false,
      profile.db?.permissions?.allowFork || true,
      JSON.stringify(profile)
    ];

    await this.dbClient.query(query, values);
  }
}
```

---

## 9. Schéma de Données Visuel (Diagramme Textuel)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CustomProfile                             │
├─────────────────────────────────────────────────────────────────┤
│ • id: string (UUID)                                             │
│ • name: string                                                  │
│ • designation: string                                           │
│ • description?: string                                          │
│ • profileType: ProfileType.CUSTOM                              │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ shape: Shape2D                                           │   │
│ │ ┌─────────────────────────────────────────────────┐     │   │
│ │ │ outerContour: Contour2D                          │     │   │
│ │ │ • id: string                                     │     │   │
│ │ │ • segments: GeometrySegment[]                    │     │   │
│ │ │   ├─ LINE { start, end }                         │     │   │
│ │ │   ├─ ARC { center, radius, angles }              │     │   │
│ │ │   ├─ BEZIER_QUADRATIC { start, control, end }    │     │   │
│ │ │   ├─ BEZIER_CUBIC { start, ctrl1, ctrl2, end }   │     │   │
│ │ │   └─ ELLIPSE { center, radii, rotation }         │     │   │
│ │ │ • closed: boolean                                │     │   │
│ │ │ • area?: number                                  │     │   │
│ │ │ • perimeter?: number                             │     │   │
│ │ └─────────────────────────────────────────────────┘     │   │
│ │                                                          │   │
│ │ holes?: Contour2D[] (même structure)                    │   │
│ │                                                          │   │
│ │ boundingBox?: { minX, maxX, minY, maxY }               │   │
│ └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ properties: CalculatedGeometryProperties             │   │
│ │ • area: number (cm²)                                  │   │
│ │ • perimeter: number (mm)                              │   │
│ │ • centroid: Point2D                                   │   │
│ │ • inertia?: { Ixx, Iyy, Ixy }                         │   │
│ │ • radiusOfGyration?: { rx, ry }                       │   │
│ │ • elasticModulus?: { Wx, Wy }                         │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ • weight?: number (kg/m)                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ metadata: CustomProfileMetadata                       │   │
│ │ • author?: string                                      │   │
│ │ • organization?: string                                │   │
│ │ • createdAt: string (ISO 8601)                        │   │
│ │ • updatedAt: string (ISO 8601)                        │   │
│ │ • version: string (semver)                            │   │
│ │ • tags?: string[]                                      │   │
│ │ • category?: string                                    │   │
│ │ • notes?: string                                       │   │
│ └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ referenceDimensions?: { height, width, thickness }            │
│ extrusionSettings?: { defaultLength, bevel, curveSegments }   │
│ defaultMaterial?: { grade, density, strength }                │
│ validation?: { isValid, errors, warnings }                    │
│ advanced?: { editable, public, thumbnail, customData }        │
└─────────────────────────────────────────────────────────────────┘

                             │
                             │ Stockage
                             ▼

┌─────────────────────────────────────────────────────────────────┐
│                 CustomProfileStorage                             │
│                    (LocalStorage)                                │
├─────────────────────────────────────────────────────────────────┤
│ • schemaVersion: "1.0.0"                                        │
│ • lastUpdated: string (ISO 8601)                               │
│ • profiles: CustomProfile[]                                     │
│ • libraries?: CustomProfileLibrary[]                            │
└─────────────────────────────────────────────────────────────────┘

                             │
                             │ Export/Import
                             ▼

┌─────────────────────────────────────────────────────────────────┐
│              CustomProfileExportFormat                           │
│                      (JSON File)                                 │
├─────────────────────────────────────────────────────────────────┤
│ • formatVersion: "1.0.0"                                        │
│ • exportedAt: string                                            │
│ • type: "single" | "library"                                    │
│ • profile?: CustomProfile                                       │
│ • library?: CustomProfileLibrary                                │
└─────────────────────────────────────────────────────────────────┘

                             │
                             │ Conversion
                             ▼

┌─────────────────────────────────────────────────────────────────┐
│                      THREE.js Objects                            │
├─────────────────────────────────────────────────────────────────┤
│ Shape2D → THREE.Shape                                           │
│   └─ + extrusion → THREE.ExtrudeGeometry                        │
│                      → THREE.BufferGeometry                      │
│                         → THREE.Mesh                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Récapitulatif

### Points Clés du Modèle

1. **Flexibilité Maximale**: Support de tous types de formes 2D (lignes, arcs, courbes de Bézier, ellipses)

2. **Validation Stricte**: Vérification automatique de fermeture, calcul d'aire, détection d'auto-intersections

3. **Propriétés Calculées**: Aire, périmètre, centre de gravité, moments d'inertie (si possibles)

4. **Métadonnées Complètes**: Versioning, auteur, tags, catégories pour organisation

5. **Stockage LocalStorage**: Format JSON complet pour persistance locale

6. **Import/Export**: Format standardisé pour partage de profils et bibliothèques

7. **Intégration Three.js**: Conversion directe Shape2D → THREE.Shape → ExtrudeGeometry

8. **Migration BDD**: Schéma SQL prêt pour migration vers PostgreSQL

### Fichiers Créés

- `src/TopSteelCAD/3DLibrary/types/custom-profile.types.ts` - Types TypeScript complets
- `CUSTOM_PROFILES_DESIGN.md` - Documentation complète (ce fichier)

### Prochaines Étapes Recommandées

1. **Implémentation des services**:
   - `CustomProfileStorageService` pour gestion LocalStorage
   - `CustomProfileCalculator` pour calculs géométriques
   - `CustomProfileValidator` pour validation
   - `CustomProfileConverter` pour conversion THREE.js

2. **Intégration dans ProfileDatabase**:
   - Ajout du type `CUSTOM` dans `ProfileType`
   - Modification de `ProfileDatabase` pour supporter les profils custom

3. **Interface utilisateur**:
   - Éditeur graphique de profils 2D
   - Gestionnaire de bibliothèques
   - Import/Export de profils

4. **Tests unitaires**:
   - Validation de formes
   - Calculs géométriques
   - Conversion THREE.js

---

**Version**: 1.0.0
**Date**: 2025-01-05
**Auteur**: TopSteelCAD Development Team
