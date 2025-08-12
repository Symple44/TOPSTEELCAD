import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SimplifiedViewer, initialize3DLibrary, createFromDatabase } from './TopSteelCAD';
import { PivotElement, MaterialType } from './types/viewer';

// Données de test simples
const createTestElements = (): PivotElement[] => {
  const elements: PivotElement[] = [
    {
      id: 'test-beam-1',
      name: 'IPE 300 - Poutre principale',
      materialType: MaterialType.BEAM,
      dimensions: {
        length: 6000,
        width: 150,
        height: 300,
        thickness: 7.1,
        flangeWidth: 150,
        flangeThickness: 10.7,
        webThickness: 7.1,
        webHeight: 279
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        grade: 'S235',
        density: 7850,
        color: '#6b7280', // Gray 500 - Acier CAD mat
        opacity: 1.0,
        metallic: 0.2, // Très faible métallicité pour CAD
        roughness: 0.8, // Surface mate industrielle
        reflectivity: 0.1 // Minimal pour éviter reflets
      },
      metadata: {
        profile: 'IPE 300',
        weight: 42.2
      },
      visible: true,
      createdAt: new Date()
    },
    {
      id: 'test-beam-2',
      name: 'HEA 200 - Poutre transversale',
      materialType: MaterialType.BEAM,
      dimensions: {
        length: 4000,
        width: 200,
        height: 190,
        thickness: 6.5,
        flangeWidth: 200,
        flangeThickness: 10,
        webThickness: 6.5,
        webHeight: 170
      },
      position: [0, 0, 2000],
      rotation: [0, Math.PI / 2, 0],
      scale: [1, 1, 1],
      material: {
        grade: 'S355',
        density: 7850,
        color: '#4b5563', // Gray 600 - Nuance S355 mate
        opacity: 1.0,
        metallic: 0.25, // Légèrement plus métallique que S235
        roughness: 0.75, // Surface mate technique
        reflectivity: 0.15 // Minimal pour éviter reflets
      },
      metadata: {
        profile: 'HEA 200',
        weight: 42.3
      },
      visible: true,
      createdAt: new Date()
    },
    {
      id: 'test-plate-1',
      name: 'Plaque de connexion',
      materialType: MaterialType.PLATE,
      dimensions: {
        length: 400,
        width: 300,
        height: 0,
        thickness: 15
      },
      position: [0, 150, 2000],
      rotation: [Math.PI / 2, 0, 0],
      scale: [1, 1, 1],
      material: {
        grade: 'S235',
        density: 7850,
        color: '#9ca3af', // Gray 400 - Plaque technique mate
        opacity: 1.0,
        metallic: 0.15, // Très faible pour plaque CAD
        roughness: 0.85, // Surface mate usinée
        reflectivity: 0.05 // Quasi-nul pour éviter reflets
      },
      metadata: {
        thickness: 15,
        weight: 14.1
      },
      visible: true,
      createdAt: new Date()
    }
  ];

  return elements;
};

// Composant de démonstration
const DemoApp: React.FC = () => {
  const [elements, setElements] = React.useState<PivotElement[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Gestionnaire de changement de thème
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  React.useEffect(() => {
    const initDemo = async () => {
      try {
        // Initialiser la 3DLibrary
        await initialize3DLibrary();
        
        // Créer les éléments de test
        const testElements = createTestElements();
        setElements(testElements);
        
        // Simuler un temps de chargement pour l'UX
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        setIsLoading(false);
      }
    };

    initDemo();
  }, []);

  const handleElementSelect = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleElementChange = (element: PivotElement) => {
    setElements(prev => prev.map(el => el.id === element.id ? element : el));
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: '#fff'
      }}>
        <div style={{ fontSize: '2rem' }}>🔄</div>
        <div>Chargement de TopSteelCAD...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      position: 'relative',
      backgroundColor: theme === 'dark' ? '#0a0a0a' : '#e6f2ff',
      transition: 'background-color 0.3s ease'
    }}>
      <SimplifiedViewer
        elements={elements}
        onElementSelect={handleElementSelect}
        onElementChange={handleElementChange}
        onThemeChange={handleThemeChange}
        theme={theme}
        className="demo-viewer"
      />
    </div>
  );
};

// Montage de l'application
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<DemoApp />);
} else {
  console.error('Element root non trouvé');
}