# 🏗️ TopSteelCAD - Viewer 3D Professionnel

Un viewer 3D haute performance pour la visualisation et manipulation de structures métalliques, avec **architecture Strategy/Factory Pattern** et base de données complète de profils industriels.

## 🚀 Features Principales

### Moteur 3D Avancé
- **Rendu WebGL haute performance** avec Three.js optimisé
- **23+ types de profils métalliques** (IPE, HEA, HEB, UPN, tubes...)  
- **Géométries précises** avec propriétés mécaniques réelles
- **Architecture Strategy/Factory** pour extensibilité maximale
- **Cache intelligent** et optimisations de performance

### Base de Données Industrielle
- **ProfileDatabase** : 500+ profils avec dimensions normalisées
- **UnifiedMaterialsDatabase** : Plaques, boulonnerie, soudures
- **Propriétés mécaniques** : Inertie, modules élastiques, poids
- **Standards européens** : EN, DIN, ISO

### Interface Utilisateur
- **3 modes de visualisation** : Minimal, Standard, Professionnel
- **Système de thèmes** : Clair/Sombre avec personnalisation
- **Plugins extensibles** : Architecture modulaire
- **Outils de mesure** intégrés
- **Export multi-formats** : DSTV, IFC, STEP

## 📦 Installation

```bash
npm install
```

## 🔧 Usage

### Utilisation Simple

```tsx
import TopSteelCAD, { initialize3DLibrary, createFromDatabase } from '@/TopSteelCAD';

async function MyApp() {
  // 1. Initialiser la base de données
  await initialize3DLibrary();
  
  // 2. Créer des éléments depuis la base
  const ipe300 = await createFromDatabase('IPE 300', 6000);
  const hea200 = await createFromDatabase('HEA 200', 4000);
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <TopSteelCAD
        initialElements={[ipe300.element, hea200.element]}
        mode="standard"
        theme="dark"
        onElementSelect={(ids) => console.log('Sélectionné:', ids)}
      />
    </div>
  );
}
```

### Utilisation Avancée avec Hooks

```tsx
import { useViewer, ThemeProvider } from '@/TopSteelCAD';

function AdvancedViewer() {
  const {
    api,
    mode,
    theme,
    tools,
    panels,
    toggleTheme,
    setModePreset
  } = useViewer({
    defaultMode: 'professional',
    plugins: [MeasurementPlugin]
  });
  
  return (
    <ThemeProvider>
      <div className="viewer-container">
        <button onClick={toggleTheme}>
          Basculer Thème
        </button>
        <button onClick={() => setModePreset('minimal')}>
          Mode Minimal
        </button>
        <TopSteelViewer api={api} mode={mode} theme={theme} />
      </div>
    </ThemeProvider>
  );
}
```

## 🏗️ Architecture Strategy/Factory

### Structure Modulaire

```
TopSteelCAD/
├── 3DLibrary/                    ⭐ ARCHITECTURE CENTRALE
│   ├── data/                     📊 Profils + matériaux (23 types)
│   ├── geometry-generators/      🔨 Strategy/Factory Pattern
│   │   ├── interfaces/
│   │   │   └── ProfileGeometryGenerator.ts
│   │   ├── generators/
│   │   │   ├── IProfileGenerator.ts      # IPE, HEA, HEB...
│   │   │   ├── UProfileGenerator.ts      # UPN, UAP
│   │   │   ├── LProfileGenerator.ts      # Cornières
│   │   │   └── TubeGenerator.ts          # Tous tubes
│   │   └── GeometryGeneratorFactory.ts   # Factory principale
│   ├── database/                 🗄️ Bases de données
│   ├── integration/              🔗 DatabaseGeometryBridge
│   └── types/                    📝 Types TypeScript
│
├── core/                         🎮 Moteur de rendu
│   ├── ViewerEngine.ts           ⚡ Moteur principal
│   ├── features/                 🎛️ 15+ processeurs DSTV
│   └── RenderingPipeline.ts      🎨 Post-processing
│
├── components/                   🖼️ Interface React
├── plugins/                      🔌 Système extensible
├── themes/                       🎨 Thèmes personnalisables
├── modes/                        ⚙️ Modes de visualisation
└── parsers/                      📄 DSTV, IFC, STEP
```

### Pattern Strategy/Factory

```typescript
// 1. Interface commune
interface ProfileGeometryGenerator {
  canGenerate(profileType: ProfileType): boolean;
  generate(dimensions: ProfileDimensions, length: number): BufferGeometry;
}

// 2. Factory centralisée
class GeometryGeneratorFactory {
  private generators: ProfileGeometryGenerator[] = [];
  
  generate(profile: SteelProfile, length: number): GeometryGenerationResult {
    const generator = this.findGenerator(profile.type);
    return generator.generate(profile.dimensions, length);
  }
}

// 3. Usage simple
const factory = new GeometryGeneratorFactory();
const ipe300Geometry = factory.generate(ipeProfile, 6000);
```

## 🎯 API Reference

### Base de Données

```typescript
// ProfileDatabase - Singleton avec lazy loading
const db = ProfileDatabase.getInstance();
const ipeProfiles = await db.getProfilesByType(ProfileType.IPE);
const ipe300 = await db.getProfile('IPE 300');

// Recherche avancée
const lightProfiles = await db.searchProfiles({
  maxWeight: 50,
  minHeight: 200
});
```

### Génération de Géométries

```typescript
// DatabaseGeometryBridge - Pont vers 3D
const bridge = new DatabaseGeometryBridge();
const result = await bridge.generateFromDesignation('IPE 300', 6000);

console.log(`Généré en ${result.metadata.generationTime}ms`);
console.log(`${result.metadata.vertexCount} vertices`);
console.log(`Poids: ${result.metadata.weight} kg`);
```

### Système de Plugins

```typescript
import { PluginManager, MeasurementPlugin } from '@/TopSteelCAD';

const pluginManager = new PluginManager(viewerAPI);
await pluginManager.loadPlugin(MeasurementPlugin);
await pluginManager.activatePlugin('measurement-plugin');
```

## 🎨 Personnalisation

### Thèmes Personnalisés

```typescript
import { createTheme } from '@/TopSteelCAD';

const customTheme = createTheme('dark', {
  colors: {
    primary: '#ff6b35',
    secondary: '#4ecdc4',
    background: {
      canvas: '#0a0a0a',
      panel: '#1a1a1a'
    }
  }
});
```

### Modes Personnalisés

```typescript
const customMode: ViewerModeConfig = {
  id: 'engineering',
  name: 'Mode Ingénierie',
  features: [
    { id: 'measurements', enabled: true },
    { id: 'annotations', enabled: true },
    { id: 'calculations', enabled: true }
  ],
  tools: ['measure', 'annotate', 'calculate']
};
```

## 📊 Performance

- **Lazy Loading** : Chargement à la demande des profils
- **Cache LRU** : Géométries mises en cache intelligemment  
- **Strategy Pattern** : 0(1) pour trouver le bon générateur
- **Factory Pattern** : Génération optimisée et centralisée
- **Singleton Databases** : Une seule instance des données

## 🧪 Tests

```bash
npm run test           # Tests unitaires
npm run test:coverage  # Couverture des tests
npm run lint          # Vérification du code
```

## 📄 Documentation

- **ARCHITECTURE-FINALE.md** - Architecture détaillée Strategy/Factory
- **3DLibrary/README.md** - Documentation de la bibliothèque 3D
- **core/features/README.md** - Système de features DSTV

## 📄 License

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

---

**Architecture Strategy/Factory Pattern • 23+ Types de Profils • Performance Optimisée**

Built with ❤️ using React, Three.js, et TypeScript