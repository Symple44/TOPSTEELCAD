/**
 * Composant wrapper pour le viewer 3D dans une fenêtre détachée
 */

import React, { useEffect, useState, memo } from 'react';
import { BuildingPreview3D } from './BuildingPreview3D';
import { BuildingSummary } from './BuildingSummary';
import { BuildingType, BuildingDimensions, BuildingParameters, BuildingOpening, BuildingExtension, SolarArrayConfig } from '../types';

interface DetachedViewer3DProps {
  buildingType: BuildingType;
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  extensions: BuildingExtension[];
  openings: BuildingOpening[];
  solarArray?: SolarArrayConfig;
  onClose?: () => void;
}

const DetachedViewer3DComponent: React.FC<DetachedViewer3DProps> = ({
  buildingType,
  dimensions,
  parameters,
  extensions,
  openings,
  solarArray,
  onClose
}) => {
  // État pour les dimensions de la fenêtre
  const [windowSize, setWindowSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Gérer le redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Gérer les raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Fermer avec Échap
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculer les dimensions du viewer 3D
  // Header: ~90px, Footer: ~50px, Padding: 40px (20px top + 20px bottom), Gap: 20px
  const headerHeight = 90;
  const footerHeight = 50;
  const contentPadding = 40;
  const viewerHeight = windowSize.height - headerHeight - footerHeight - contentPadding;
  const viewerWidth = windowSize.width - 300 - 60; // 300px sidebar + 60px padding/gap

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: '#fff',
        borderBottom: '2px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            📐 Aperçu 3D - Fenêtre détachée
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.85rem',
            color: '#64748b'
          }}>
            Vous pouvez déplacer cette fenêtre sur un autre écran
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            ✕ Fermer
          </button>
        )}
      </div>

      {/* Contenu principal */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '20px',
        padding: '20px',
        overflow: 'hidden'
      }}>
        {/* Viewer 3D */}
        <div style={{
          background: '#fff',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <BuildingPreview3D
            buildingType={buildingType}
            dimensions={dimensions}
            parameters={parameters}
            extensions={extensions}
            openings={openings}
            solarArray={solarArray}
            width={viewerWidth}
            height={viewerHeight}
          />
        </div>

        {/* Panneau latéral avec résumé */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {/* Informations */}
          <div style={{
            background: '#fff',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              📊 Résumé du bâtiment
            </h3>
            <BuildingSummary
              dimensions={dimensions}
              parameters={parameters}
              buildingType={buildingType}
              extensions={extensions}
              solarArray={solarArray}
            />
          </div>

          {/* Contrôles de vue */}
          <div style={{
            background: '#fff',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              🎮 Contrôles
            </h3>
            <div style={{
              fontSize: '0.85rem',
              color: '#64748b',
              lineHeight: '1.6'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Rotation :</strong> Clic gauche + glisser
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Zoom :</strong> Molette de la souris
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Pan :</strong> Clic droit + glisser
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Fermer :</strong> Touche <kbd style={{
                  padding: '2px 6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>Échap</kbd>
              </p>
            </div>
          </div>

          {/* Informations sur la fenêtre */}
          <div style={{
            background: '#eff6ff',
            border: '2px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px',
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.8rem',
              color: '#1e40af',
              lineHeight: '1.5'
            }}>
              💡 <strong>Astuce :</strong> Vous pouvez redimensionner cette fenêtre et la déplacer sur un autre écran pour travailler plus confortablement.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        background: '#fff',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b'
      }}>
        TopSteelCAD - Building Estimator © {new Date().getFullYear()}
      </div>
    </div>
  );
};

// Mémoriser le composant pour éviter les re-renders inutiles
// Ne re-render que si les props ont vraiment changé
export const DetachedViewer3D = memo(DetachedViewer3DComponent, (prevProps, nextProps) => {
  // Comparaison personnalisée pour optimiser les performances
  return (
    prevProps.buildingType === nextProps.buildingType &&
    JSON.stringify(prevProps.dimensions) === JSON.stringify(nextProps.dimensions) &&
    JSON.stringify(prevProps.parameters) === JSON.stringify(nextProps.parameters) &&
    JSON.stringify(prevProps.extensions) === JSON.stringify(nextProps.extensions) &&
    JSON.stringify(prevProps.openings) === JSON.stringify(nextProps.openings) &&
    JSON.stringify(prevProps.solarArray) === JSON.stringify(nextProps.solarArray)
  );
});
