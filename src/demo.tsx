import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { MinimalViewer } from './TopSteelCAD/MinimalViewer';
import { StandardViewer } from './TopSteelCAD/StandardViewer';
import { ProfessionalViewer } from './TopSteelCAD/ProfessionalViewer';
import { PartBuilder } from './TopSteelCAD/part-builder';
import { ProfileCreatorApp } from './TopSteelCAD/custom-profile-creator/ProfileCreatorApp';
import { PivotElement, MaterialType } from './types/viewer';

// Initialiser le logger
import './TopSteelCAD/utils/logger';

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
        color: '#3b82f6',
        opacity: 1.0,
        metallic: 0.2,
        roughness: 0.8,
        reflectivity: 0.1
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
        color: '#10b981',
        opacity: 1.0,
        metallic: 0.25,
        roughness: 0.75,
        reflectivity: 0.15
      },
      metadata: {
        profile: 'HEA 200',
        weight: 42.3
      },
      visible: true,
      createdAt: new Date()
    },
    {
      id: 'test-column-1',
      name: 'HEB 300 - Colonne',
      materialType: MaterialType.COLUMN,
      dimensions: {
        length: 3500,
        width: 300,
        height: 300,
        thickness: 11,
        flangeWidth: 300,
        flangeThickness: 19,
        webThickness: 11,
        webHeight: 262
      },
      position: [-2000, 0, 0],
      rotation: [Math.PI / 2, 0, 0],
      scale: [1, 1, 1],
      material: {
        grade: 'S355',
        density: 7850,
        color: '#f59e0b',
        opacity: 1.0,
        metallic: 0.3,
        roughness: 0.7,
        reflectivity: 0.2
      },
      metadata: {
        profile: 'HEB 300',
        weight: 117
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
        color: '#6b7280',
        opacity: 1.0,
        metallic: 0.15,
        roughness: 0.85,
        reflectivity: 0.05
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

// Types de modes disponibles
type ViewerMode = 'minimal' | 'standard' | 'professional' | 'part-builder' | 'profile-creator';

// Composant de démonstration
const DemoApp: React.FC = () => {
  const [mode, setMode] = useState<ViewerMode>('standard');
  const [elements, setElements] = useState<PivotElement[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [viewerKey, setViewerKey] = useState(0); // Clé pour forcer le re-render
  const [isLoadingElements, setIsLoadingElements] = useState(false); // État de chargement du bouton

  // Simplifier complètement - pas de chargement asynchrone pour l'instant
  useEffect(() => {
    console.log('Demo montée, pas de chargement asynchrone');
  }, []);


  const handleElementSelect = (ids: string[]) => {
    console.log('Elements sélectionnés:', ids);
  };

  const handleElementChange = (element: PivotElement) => {
    setElements(prev => prev.map(el => el.id === element.id ? element : el));
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const handleLoadTestElements = async () => {
    setIsLoadingElements(true);
    
    // Simuler un délai pour l'animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (elements.length > 0) {
      // Animation de suppression
      setElements([]);
    } else {
      // Animation de chargement
      const testElements = createTestElements();
      setElements(testElements);
    }
    
    // Forcer le re-render du viewer en incrémentant la clé
    setViewerKey(prev => prev + 1);
    
    setTimeout(() => {
      setIsLoadingElements(false);
    }, 500);
  };

  return (
    <div style={{ 
      height: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header avec sélecteur de mode */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏗️</span>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#f1f5f9'
            }}>
              TopSteelCAD Viewer Demo
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Mode:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ViewerMode)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: '1px solid #475569',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="minimal">🔹 Mode Minimal</option>
                <option value="standard">🔷 Mode Standard</option>
                <option value="professional">🔶 Mode Professionnel</option>
                <option value="part-builder">🏗️ Part Builder</option>
                <option value="profile-creator">✏️ Créateur de Profils (Nouveau!)</option>
              </select>
            </div>
            
            <button
              onClick={handleLoadTestElements}
              disabled={isLoadingElements || mode === 'part-builder' || mode === 'profile-creator'}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isLoadingElements 
                  ? '#6b7280' 
                  : elements.length > 0 ? '#dc2626' : '#0ea5e9',
                color: '#f1f5f9',
                border: '1px solid ' + (isLoadingElements 
                  ? '#9ca3af' 
                  : elements.length > 0 ? '#ef4444' : '#38bdf8'),
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: isLoadingElements ? 'wait' : 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                transform: isLoadingElements ? 'scale(0.95)' : 'scale(1)',
                opacity: isLoadingElements ? 0.8 : 1,
                position: 'relative',
                overflow: 'hidden',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!isLoadingElements) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.backgroundColor = elements.length > 0 ? '#b91c1c' : '#0284c7';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoadingElements) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = elements.length > 0 ? '#dc2626' : '#0ea5e9';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {/* Effet de loading avec animation */}
              {isLoadingElements && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'shimmer 1s infinite'
                }} />
              )}
              
              {/* Icône animée */}
              <span style={{
                display: 'inline-block',
                animation: isLoadingElements ? 'spin 1s linear infinite' : 'none',
                transition: 'transform 0.3s ease'
              }}>
                {isLoadingElements 
                  ? '⏳' 
                  : elements.length > 0 ? '🗑️' : '⚡'}
              </span>
              
              {/* Texte */}
              <span style={{
                transition: 'opacity 0.3s ease',
                opacity: isLoadingElements ? 0.7 : 1
              }}>
                {isLoadingElements 
                  ? 'Traitement...' 
                  : elements.length > 0 ? 'Vider la scène' : 'Charger pièces de test'}
              </span>
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '1rem'
        }}>
          {mode === 'standard' && (
            <button
              onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#475569',
                color: '#f1f5f9',
                border: '1px solid #64748b',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          )}
          <span style={{ 
            padding: '0.25rem 0.75rem',
            backgroundColor: '#0ea5e9',
            color: '#fff',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            v2.0.0
          </span>
        </div>
      </div>

      {/* Zone du viewer */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f8fafc'
      }}>
        {mode === 'minimal' && (
          <MinimalViewer
            key={`minimal-${viewerKey}`}
            elements={elements}
            theme={theme}
          />
        )}
        
        {mode === 'standard' && (
          <StandardViewer
            key={`standard-${viewerKey}`}
            elements={elements}
            onElementSelect={handleElementSelect}
            onElementChange={handleElementChange}
            onThemeChange={handleThemeChange}
            theme={theme}
            className="demo-viewer"
          />
        )}
        
        {mode === 'professional' && (
          <ProfessionalViewer
            key={`professional-${viewerKey}`}
            elements={elements}
            onElementSelect={handleElementSelect}
            onElementChange={handleElementChange}
            theme={theme}
          />
        )}

        {mode === 'part-builder' && (
          <PartBuilder />
        )}

        {mode === 'profile-creator' && (
          <ProfileCreatorApp />
        )}
      </div>

      {/* Info bar */}
      <div style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#1e293b',
        borderTop: '1px solid #334155',
        color: '#64748b',
        fontSize: '0.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          Mode actuel: <strong style={{ color: '#94a3b8' }}>{mode}</strong>
        </div>
        <div>
          {mode === 'minimal' && '🔹 Interface épurée avec seulement les outils essentiels'}
          {mode === 'standard' && '🔷 Interface équilibrée avec navigation et outils de base'}
          {mode === 'professional' && '🔶 Interface complète avec tous les outils CAO avancés'}
          {mode === 'part-builder' && '🏗️ Module de création de pièces métalliques de A à Z'}
          {mode === 'profile-creator' && '✏️ Créez vos propres profils personnalisés avec un éditeur 2D intuitif'}
        </div>
      </div>
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