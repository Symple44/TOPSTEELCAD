# 📚 3DLibrary - Architecture Strategy/Factory Pattern

## 🏗️ Architecture Centralisée

La **3DLibrary** implémente une architecture **Strategy/Factory Pattern** pour la génération de géométries 3D à partir de données de profils métalliques industriels.

## 📁 Structure

```
3DLibrary/
├── data/                         📊 DONNÉES NORMALISÉES
│   ├── profiles/                 → 23 types de profils (500+ éléments)
│   │   ├── ipe-profiles.ts       # IPE 80 à 600 (dimensions EN)
│   │   ├── hea-profiles.ts       # HEA 100 à 1000 (dimensions EN)
│   │   ├── heb-profiles.ts       # HEB 100 à 1000 (dimensions EN)
│   │   ├── upn-profiles.ts       # UPN 50 à 400 (dimensions EN)
│   │   ├── tube-circular-profiles.ts    # Tubes ronds
│   │   ├── l-equal-profiles.ts   # Cornières égales
│   │   └── ...                   # 17+ autres types
│   └── materials/                → Matériaux complémentaires
│       ├── plates.ts             # Plaques et tôles EN 10025
│       ├── fasteners.ts          # Boulonnerie ISO/DIN
│       └── welds-accessories.ts  # Soudures et accessoires
│
├── geometry-generators/          🔨 STRATEGY/FACTORY PATTERN
│   ├── interfaces/
│   │   └── ProfileGeometryGenerator.ts   # Interface commune
│   ├── generators/               → Générateurs spécialisés
│   │   ├── IProfileGenerator.ts  # IPE, HEA, HEB, HEM
│   │   ├── UProfileGenerator.ts  # UPN, UAP
│   │   ├── LProfileGenerator.ts  # Cornières L
│   │   └── TubeGenerator.ts      # Tous les tubes
│   └── GeometryGeneratorFactory.ts      # Factory principale
│
├── database/                     🗄️ BASES DE DONNÉES SINGLETON
│   ├── ProfileDatabase.ts        # Base principale avec lazy loading
│   ├── UnifiedMaterialsDatabase.ts # Base unifiée tous matériaux
│   ├── ProfileCache.ts           # Cache LRU intelligent
│   └── ProfileSearch.ts          # Moteur de recherche indexé
│
├── integration/                  🔗 PONT DONNÉES ↔ GÉOMÉTRIE
│   └── DatabaseGeometryBridge.ts # Orchestre data + factory
│
├── services/                     ⚙️ SERVICES MÉTIERS
│   ├── ProfileCalculator.ts      # Calculs mécaniques
│   └── ProfileValidator.ts       # Validation et vérifications
│
├── helpers/                      🛠️ UTILITAIRES
│   └── MaterialFactory.ts        # Création matériaux Three.js
│
├── types/                        📝 TYPES TYPESCRIPT
│   ├── profile.types.ts          # Types profils et propriétés
│   ├── material-types.ts         # Types matériaux
│   ├── enums.ts                  # Énumérations ProfileType
│   └── camera.types.ts           # Types caméra (consolidé)
│
├── examples/                     📖 EXEMPLES D'USAGE
│   ├── real-data-examples.ts     # Utilisation avec vraies données
│   └── profile-usage.ts          # Guide d'utilisation complet
│
├── index.ts                      🎯 POINT D'ENTRÉE
└── README.md                     📚 Cette documentation
```

## 🎯 Principe Strategy/Factory

### 1. **Strategy Pattern** - Générateurs Spécialisés

```typescript
// Interface commune pour tous les générateurs
interface ProfileGeometryGenerator {
  canGenerate(profileType: ProfileType): boolean;
  generate(dimensions: ProfileDimensions, length: number): BufferGeometry;
  getSupportedTypes(): ProfileType[];
  getName(): string;
}

// Implémentations spécialisées
class IProfileGenerator implements ProfileGeometryGenerator {
  canGenerate(type: ProfileType): boolean {
    return [ProfileType.IPE, ProfileType.HEA, ProfileType.HEB].includes(type);
  }
  
  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    // Logique spécifique aux profils I/H
    return createIShapeGeometry(dimensions, length);
  }
}
```

### 2. **Factory Pattern** - Orchestration Centralisée

```typescript
class GeometryGeneratorFactory {
  private generators: ProfileGeometryGenerator[] = [];
  private generatorCache: Map<ProfileType, ProfileGeometryGenerator> = new Map();
  
  constructor() {
    // Auto-registration des générateurs
    this.registerGenerator(new IProfileGenerator());
    this.registerGenerator(new UProfileGenerator());
    this.registerGenerator(new LProfileGenerator());
    this.registerGenerator(new TubeGenerator());
  }
  
  generate(profile: SteelProfile, length: number): GeometryGenerationResult {
    const generator = this.findGenerator(profile.type);
    const startTime = performance.now();
    
    const geometry = generator.generate(profile.dimensions, length);
    const generationTime = performance.now() - startTime;
    
    return {
      geometry,
      profile,
      metadata: {
        generationTime,
        vertexCount: geometry.attributes.position.count,
        generator: generator.getName()
      }
    };
  }
}
```

### 3. **Bridge Pattern** - Connexion Data ↔ 3D

```typescript
class DatabaseGeometryBridge {
  private geometryFactory: GeometryGeneratorFactory;
  private profileDb: ProfileDatabase;
  private materialDb: UnifiedMaterialsDatabase;
  
  async generateFromDesignation(designation: string, length: number = 6000) {
    // 1. Récupérer les données réelles
    const element = this.materialDb.getByDesignation(designation);
    
    // 2. Générer la géométrie via la factory
    const result = this.geometryFactory.generate(element, length);
    
    // 3. Créer le matériau Three.js
    const material = MaterialFactory.createStandardMaterial(element.properties);
    
    // 4. Assembler le résultat complet
    return {
      geometry: result.geometry,
      material,
      mesh: new Mesh(result.geometry, material),
      profile: element,
      metadata: result.metadata
    };
  }
}
```

## 💡 Utilisation

### Usage Simple

```typescript
import { initialize3DLibrary, createFromDatabase } from './3DLibrary';

// Initialiser (lazy loading automatique)
await initialize3DLibrary();

// Créer des éléments avec vraies données
const ipe300 = await createFromDatabase('IPE 300', 6000);
const hea200 = await createFromDatabase('HEA 200', 4000);
const upn120 = await createFromDatabase('UPN 120', 3000);

console.log(`IPE 300: ${ipe300.metadata.generationTime}ms`);
console.log(`Poids: ${ipe300.profile.weight * 6}kg pour 6m`);
```

### Usage Avancé

```typescript
import { 
  ProfileDatabase, 
  GeometryGeneratorFactory, 
  DatabaseGeometryBridge 
} from './3DLibrary';

// Accès direct à la base de données
const db = ProfileDatabase.getInstance();
const allIPE = await db.getProfilesByType(ProfileType.IPE);
const heavyProfiles = await db.searchProfiles({ minWeight: 100 });

// Utilisation directe de la factory
const factory = new GeometryGeneratorFactory();
const stats = factory.getStatistics();
console.log(`${stats.supportedTypes.length} types supportés`);

// Bridge personnalisé
const bridge = new DatabaseGeometryBridge();
const result = await bridge.generateFromDesignation('HEB 300', 8000);
```

## 🚀 Avantages de l'Architecture

### **Extensibilité** 🔧
```typescript
// Ajouter un nouveau type de profil = 1 nouvelle classe !
class ZProfileGenerator implements ProfileGeometryGenerator {
  canGenerate(type: ProfileType): boolean {
    return type === ProfileType.Z;
  }
  
  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    // Logique spécifique aux profils Z
    return createZShapeGeometry(dimensions, length);
  }
}

// Auto-détection et intégration
factory.registerGenerator(new ZProfileGenerator());
```

### **Performance** ⚡
- **Cache LRU** : Géométries fréquentes en mémoire
- **Lazy Loading** : Profils chargés à la demande
- **Strategy O(1)** : Temps constant pour trouver le générateur
- **Singleton** : Une seule instance des données

### **Maintenabilité** 🛠️
- **Séparation claire** : Data ≠ Logique ≠ Rendu
- **Tests unitaires** : Un test par générateur
- **Type Safety** : TypeScript strict
- **Documentation** : Code auto-documenté

## 📊 Données Supportées

### Profils Métalliques (23 types)
- **Poutres I/H** : IPE, HEA, HEB, HEM (200+ profils)
- **Profilés U** : UPN, UAP (50+ profils)
- **Cornières** : L égales et inégales (100+ profils)
- **Tubes** : Ronds, carrés, rectangulaires (150+ profils)
- **Autres** : T, Oméga, Sigma, barres, plats...

### Propriétés Complètes
- **Dimensions** : Hauteur, largeur, épaisseurs, rayons
- **Propriétés mécaniques** : Aire, inertie, modules élastiques
- **Poids** : kg/m selon densité acier
- **Standards** : EN, DIN, ISO selon le type

---

## 🎉 Résultat

**Architecture Strategy/Factory Pattern production-ready** permettant :
- ✅ Génération rapide de géométries 3D précises
- ✅ Extension facile pour nouveaux profils
- ✅ Performance optimisée avec cache intelligent
- ✅ Code maintenable et testable

*Bibliothèque 3D centralisée avec patterns professionnels* 🏗️