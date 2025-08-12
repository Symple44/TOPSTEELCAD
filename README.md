# TopSteelCAD - Modern 3D CAD Viewer for Steel Structures

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/topsteel/topsteelcad)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?logo=three.js&logoColor=white)](https://threejs.org/)

## 📦 Overview

TopSteelCAD is a professional-grade 3D viewer for steel structures, featuring advanced measurement tools, intelligent snap-to-point system, and comprehensive element information display. Built with React and Three.js for maximum performance and user experience.

## ✨ Key Features

### 🎯 Smart Measurement System
- **Intelligent Snap Points**: Automatic detection of corners, edges, centers, and faces
- **Precision Measurement**: Snap-to-point for accurate distance measurements
- **Visual Feedback**: Elegant indicators for snap points and measurements
- **Keyboard Activation**: Quick access with M key

### 🎮 Advanced 3D Engine
- **High-Performance WebGL Rendering** with optimized Three.js
- **23+ Steel Profile Types**: IPE, HEA, HEB, UPN, tubes, angles, and more
- **Accurate Geometries**: Real mechanical properties and dimensions
- **Strategy/Factory Architecture**: Maximum extensibility and performance
- **Smart Caching**: Intelligent geometry caching and optimizations

### 📊 Industrial Database
- **ProfileDatabase**: 500+ profiles with standardized dimensions
- **UnifiedMaterialsDatabase**: Plates, fasteners, welds, accessories
- **Mechanical Properties**: Inertia, elastic modulus, weight calculations
- **European Standards**: EN, DIN, ISO compliant

### 🖼️ User Interface
- **Interactive Selection**: Multi-selection with Ctrl+Click, Select All with Ctrl+A
- **Element Information**: Detailed display of selected element properties
- **Theme System**: Light/Dark themes with smooth transitions
- **Adaptive Grid**: Automatic sizing based on model bounds
- **Fluid Navigation**: Smooth OrbitControls with optimized zoom limits

## 🚀 Quick Start

### Installation

```bash
npm install topsteelcad
```

### Basic Usage - Simplified Viewer (Recommended)

```tsx
import { SimplifiedViewer } from 'topsteelcad';

function App() {
  const elements = [
    // Your steel structure elements
  ];

  return (
    <SimplifiedViewer
      elements={elements}
      theme="light"
      onElementSelect={(ids) => console.log('Selected:', ids)}
    />
  );
}
```

### Advanced Usage - Full Control

```tsx
import TopSteelCAD, { initialize3DLibrary, PivotElement, MaterialType } from 'topsteelcad';

function MyApp() {
  const [elements, setElements] = React.useState<PivotElement[]>([]);

  React.useEffect(() => {
    initialize3DLibrary().then(() => {
      const ipe300: PivotElement = {
        id: 'beam-1',
        name: 'IPE 300',
        materialType: MaterialType.BEAM,
        dimensions: {
          length: 6000,
          width: 150,
          height: 300,
          thickness: 7.1
        },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        material: {
          grade: 'S235',
          density: 7850,
          color: '#6b7280'
        },
        visible: true
      };
      
      setElements([ipe300]);
    });
  }, []);

  return (
    <TopSteelCAD
      elements={elements}
      onElementSelect={(ids) => console.log('Selected:', ids)}
      theme="dark"
    />
  );
}
```

### Database Integration

```tsx
import { createFromDatabase } from 'topsteelcad';

async function loadProfiles() {
  // Load profiles from the integrated database
  const ipe300 = await createFromDatabase('IPE 300', 6000);
  const hea200 = await createFromDatabase('HEA 200', 4000);
  
  return [ipe300.element, hea200.element];
}
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **M** | Activate measurement tool |
| **Escape** | Cancel current operation / Deselect all |
| **Delete** | Remove selected measurements |
| **Ctrl+A** | Select all elements |
| **Ctrl+Click** | Multi-selection |
| **F** | Focus on selection |

## 🎮 Mouse Controls

| Action | Control |
|--------|---------|
| **Rotate** | Left click + drag |
| **Zoom** | Mouse wheel |
| **Pan** | Right click + drag or Shift + left click |
| **Select** | Left click on element |
| **Multi-select** | Ctrl + left click |

## 🏗️ Architecture

### Component Structure

```
TopSteelCAD/
├── SimplifiedViewer.tsx        # Standard simplified view (recommended)
├── TopSteelCAD.tsx            # Main component with full capabilities
├── core/                      # Core engine modules
│   ├── ViewerEngine.ts        # Main 3D engine
│   ├── SceneManager.ts        # Scene management
│   ├── RenderingPipeline.ts   # Advanced rendering pipeline
│   ├── EventBus.ts           # Event system
│   └── features/             # DSTV feature processors
├── tools/                    # Interactive tools
│   ├── SnapMeasurementTool.ts # Smart measurement with snap
│   └── MeasurementTool.ts     # Basic measurement
├── 3DLibrary/               # Geometry generation (Strategy/Factory)
│   ├── geometry-generators/  # Profile generators
│   ├── database/            # Profile & material databases
│   └── integration/         # Database-3D bridge
├── selection/               # Selection management
│   └── SelectionManager.ts
├── cameras/                 # Camera controls
│   └── CameraController.ts
└── ui/                      # UI components
    ├── ViewCube.tsx
    └── AxesHelper.tsx
```

## 📊 Supported Elements

### Profile Types
- **I-Profiles**: IPE, HEA, HEB, HEM
- **U-Profiles**: UPN, UAP, C-profiles
- **L-Profiles**: Equal and unequal angles
- **T-Profiles**: T-sections
- **Tubes**: Circular, rectangular, square
- **Plates**: Flat plates with thickness
- **Bars**: Round, square, flat
- **Special**: Omega, Sigma, Z profiles

### Material Properties

```typescript
interface Material {
  grade: string;      // 'S235', 'S355', etc.
  density: number;    // kg/m³
  color: string;      // Hex color
  metallic?: number;  // 0-1 metalness
  roughness?: number; // 0-1 roughness
}
```

## 🎨 Themes

### Light Theme
- Blue-tinted background (#e6f2ff)
- Dark grid lines for contrast
- Optimized for bright environments

### Dark Theme
- Deep black background (#0a0a0a)
- Light grid lines
- Optimized for low-light environments

## 📖 API Reference

### SimplifiedViewer Props

| Prop | Type | Description |
|------|------|-------------|
| `elements` | `PivotElement[]` | Array of steel elements |
| `theme` | `'light' \| 'dark'` | Theme mode |
| `onElementSelect` | `(ids: string[]) => void` | Selection callback |
| `onElementChange` | `(element: PivotElement) => void` | Element change callback |
| `onThemeChange` | `(theme: 'light' \| 'dark') => void` | Theme change callback |
| `className` | `string` | Additional CSS classes |

### TopSteelCAD Props

Same as SimplifiedViewer, with additional configuration options for advanced use cases.

## 🧪 Development

### Setup

```bash
# Clone repository
git clone https://github.com/topsteel/topsteelcad.git
cd topsteelcad

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
```

## 📈 Performance

- **Optimized Rendering**: Frustum culling, LOD system
- **Smart Caching**: LRU cache for geometries
- **Efficient Selection**: Spatial indexing for fast picking
- **Lazy Loading**: On-demand component loading
- **WebGL Acceleration**: Hardware-accelerated rendering

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) - 3D rendering engine
- [React](https://reactjs.org/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

---

**TopSteelCAD** - Professional 3D CAD Viewer for Steel Structures
Built with ❤️ using React, Three.js, and TypeScript