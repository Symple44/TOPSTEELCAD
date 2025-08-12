# TopSteelCAD - Usage Examples

## Table of Contents
- [Basic Setup](#basic-setup)
- [SimplifiedViewer (Recommended)](#simplifiedviewer-recommended)
- [Advanced TopSteelCAD Component](#advanced-topsteelcad-component)
- [Database Integration](#database-integration)
- [Measurement Tool](#measurement-tool)
- [Theme Customization](#theme-customization)
- [Event Handling](#event-handling)
- [Keyboard & Mouse Controls](#keyboard--mouse-controls)

## Basic Setup

### Installation

```bash
npm install topsteelcad
```

## SimplifiedViewer (Recommended)

The SimplifiedViewer is the standard, production-ready component with all essential features pre-configured.

### Basic Example

```tsx
import React from 'react';
import { SimplifiedViewer } from 'topsteelcad';
import type { PivotElement } from 'topsteelcad/types';

function App() {
  const elements: PivotElement[] = [
    {
      id: 'beam-1',
      name: 'Main Beam IPE 300',
      materialType: 'BEAM',
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
        color: '#6b7280'
      },
      visible: true
    }
  ];

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SimplifiedViewer
        elements={elements}
        theme="light"
        onElementSelect={(ids) => console.log('Selected:', ids)}
      />
    </div>
  );
}
```

## Advanced TopSteelCAD Component

For full control and customization, use the main TopSteelCAD component.

### Complete Setup with Multiple Elements

```tsx
import React, { useEffect, useState } from 'react';
import TopSteelCAD, { 
  initialize3DLibrary,
  PivotElement,
  MaterialType 
} from 'topsteelcad';

function AdvancedViewer() {
  const [elements, setElements] = useState<PivotElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    async function init() {
      await initialize3DLibrary();
      
      const beam: PivotElement = {
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

      const plate: PivotElement = {
        id: 'plate-1',
        name: 'Connection Plate',
        materialType: MaterialType.PLATE,
        dimensions: {
          length: 400,
          width: 300,
          thickness: 15
        },
        position: [0, 150, 2000],
        rotation: [Math.PI / 2, 0, 0],
        material: {
          grade: 'S235',
          color: '#9ca3af'
        },
        visible: true
      };

      setElements([beam, plate]);
    }

    init();
  }, []);

  return (
    <TopSteelCAD
      elements={elements}
      theme={theme}
      onThemeChange={setTheme}
      onElementSelect={setSelectedIds}
      onElementChange={(element) => {
        setElements(prev => 
          prev.map(el => el.id === element.id ? element : el)
        );
      }}
    />
  );
}
```

## Database Integration

Load profiles directly from the integrated database with real mechanical properties.

```tsx
import { createFromDatabase } from 'topsteelcad';

async function loadStandardProfiles() {
  // Load standard profiles with accurate dimensions
  const profiles = await Promise.all([
    createFromDatabase('IPE 300', 6000),
    createFromDatabase('HEA 200', 4000),
    createFromDatabase('UPN 200', 3000),
    createFromDatabase('L 100x100x10', 2000)
  ]);

  // Position elements in 3D space
  profiles[0].element.position = [0, 0, 0];
  profiles[1].element.position = [0, 0, 2000];
  profiles[2].element.position = [3000, 0, 0];
  profiles[3].element.position = [0, 200, 1000];

  return profiles.map(p => p.element);
}
```

## Measurement Tool

The integrated measurement tool provides snap-to-point functionality for precise measurements.

### Features
- **Smart Snap Points**: Automatically detects corners, edges, centers, and faces
- **Visual Indicators**: Elegant snap point visualization
- **Precision**: Accurate distance measurements in millimeters
- **Keyboard Activation**: Press 'M' to activate

### Usage

```tsx
function MeasurementExample() {
  return (
    <div>
      <SimplifiedViewer elements={elements} />
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <p>Press 'M' to activate measurement tool</p>
        <p>Click two points to measure distance</p>
        <p>Press 'Delete' to clear measurements</p>
      </div>
    </div>
  );
}
```

## Theme Customization

### Dynamic Theme Switching

```tsx
function ThemedViewer() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <div style={{ height: '100vh' }}>
      <button 
        onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
      
      <SimplifiedViewer
        elements={elements}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
}
```

### Theme Specifications
- **Light Theme**: Blue-tinted background (#e6f2ff), dark grid lines
- **Dark Theme**: Deep black background (#0a0a0a), light grid lines

## Event Handling

### Selection Events with Element Information

```tsx
function SelectionHandler() {
  const [selectedInfo, setSelectedInfo] = useState<any>(null);

  const handleSelection = (ids: string[]) => {
    if (ids.length === 1) {
      const element = elements.find(e => e.id === ids[0]);
      if (element) {
        const isPlate = element.materialType === 'PLATE';
        setSelectedInfo({
          name: element.name,
          type: element.materialType,
          length: `${element.dimensions.length}mm`,
          width: `${element.dimensions.width}mm`,
          ...(isPlate 
            ? { thickness: `${element.dimensions.thickness}mm` }
            : { height: `${element.dimensions.height}mm` }
          ),
          material: element.material?.grade || 'N/A'
        });
      }
    } else {
      setSelectedInfo({ count: `${ids.length} elements selected` });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <SimplifiedViewer
          elements={elements}
          onElementSelect={handleSelection}
        />
      </div>
      
      {selectedInfo && (
        <div style={{ 
          width: '300px', 
          padding: '20px',
          backgroundColor: '#f3f4f6'
        }}>
          <h3>Selection Info</h3>
          <pre>{JSON.stringify(selectedInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Keyboard & Mouse Controls

### Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| **M** | Measurement Tool | Activate snap-to-point measurement |
| **Escape** | Cancel/Deselect | Cancel operation or deselect all |
| **Delete** | Clear Measurements | Remove all measurements |
| **Ctrl+A** | Select All | Select all visible elements |
| **F** | Focus | Focus camera on selected elements |

### Mouse Controls

| Action | Control | Description |
|--------|---------|-------------|
| **Rotate View** | Left Click + Drag | Orbit around the model |
| **Zoom** | Mouse Wheel | Zoom in/out with adaptive limits |
| **Pan** | Right Click + Drag | Move the view laterally |
| **Select** | Left Click | Select single element |
| **Multi-Select** | Ctrl + Left Click | Add/remove from selection |

### Measurement Tool Controls

| Action | Control | Description |
|--------|---------|-------------|
| **Activate** | M Key | Enter measurement mode |
| **Place Point** | Left Click | Place measurement point (with snap) |
| **Cancel** | Escape | Exit measurement mode |
| **Clear All** | Delete | Remove all measurements |

## Complete Application Example

```tsx
import React, { useState, useEffect } from 'react';
import { 
  SimplifiedViewer,
  createFromDatabase,
  PivotElement 
} from 'topsteelcad';

function SteelStructureApp() {
  const [elements, setElements] = useState<PivotElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStructure() {
      try {
        const structure = await Promise.all([
          createFromDatabase('IPE 300', 6000),
          createFromDatabase('HEA 200', 4000)
        ]);

        structure[0].element.position = [0, 0, 0];
        structure[1].element.position = [0, 0, 2000];
        structure[1].element.rotation = [0, Math.PI / 2, 0];

        setElements(structure.map(s => s.element));
      } finally {
        setLoading(false);
      }
    }

    loadStructure();
  }, []);

  if (loading) {
    return <div>Loading structure...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Bar */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f3f4f6',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
          Theme: {theme}
        </button>
        <span>Selected: {selectedIds.length} elements</span>
        <span>| M: Measure | Ctrl+A: Select All | Esc: Deselect</span>
      </div>

      {/* 3D Viewer */}
      <div style={{ flex: 1 }}>
        <SimplifiedViewer
          elements={elements}
          theme={theme}
          onElementSelect={setSelectedIds}
          onThemeChange={setTheme}
        />
      </div>

      {/* Status Bar */}
      {selectedIds.length === 1 && (
        <div style={{ 
          padding: '10px',
          backgroundColor: '#1f2937',
          color: 'white'
        }}>
          {(() => {
            const element = elements.find(e => e.id === selectedIds[0]);
            if (!element) return null;
            
            return (
              <>
                <strong>{element.name}</strong>
                {' | '}
                Type: {element.materialType}
                {' | '}
                Length: {element.dimensions.length}mm
                {element.materialType === 'PLATE' 
                  ? ` | Thickness: ${element.dimensions.thickness}mm`
                  : ` | Height: ${element.dimensions.height}mm`
                }
                {element.material?.grade && ` | Grade: ${element.material.grade}`}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default SteelStructureApp;
```

## Tips and Best Practices

1. **Performance**: For large models (>1000 elements), consider implementing level-of-detail (LOD)
2. **Measurements**: Always use snap points for accurate measurements
3. **Selection**: Use Ctrl+A for quick bulk operations
4. **Themes**: Light theme for presentations, dark for extended work
5. **Grid**: Automatically positioned below the lowest element for better reference

## Architecture Notes

TopSteelCAD is a **controlled component**:
- Theme is managed by the parent component
- Selection is notified via callbacks
- No hidden internal state
- Full control over element data

```tsx
// ✅ Good - Controlled theme with callback
<SimplifiedViewer 
  theme={appTheme} 
  onThemeChange={setAppTheme} 
/>

// ❌ Bad - Theme without synchronization
<SimplifiedViewer theme="dark" />  // No callback
```