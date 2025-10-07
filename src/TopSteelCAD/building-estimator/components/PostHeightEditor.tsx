/**
 * Éditeur des hauteurs de poteaux (pieds de poteaux)
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { CustomPortal, BuildingParameters } from '../types';
import {
  formSectionStyle,
  labelStyle,
  inputStyle,
  buttonStyle,
  cardTitleStyle
} from '../styles/buildingEstimator.styles';

interface PostHeightEditorProps {
  buildingLength: number;
  parameters: BuildingParameters;
  onParametersChange: (params: Partial<BuildingParameters>) => void;
}

export const PostHeightEditor: React.FC<PostHeightEditorProps> = ({
  buildingLength,
  parameters,
  onParametersChange
}) => {
  const [isActive, setIsActive] = React.useState(false);
  const customPortals = parameters.customPortals || [];

  // Calculer le nombre de portiques selon le mode
  const getPortalCount = (): number => {
    if (parameters.customSpacingMode && parameters.customBays && parameters.customBays.length > 0) {
      // Mode personnalisé : nombre de travées + 1
      return parameters.customBays.length + 1;
    } else {
      // Mode standard
      const postSpacing = parameters.postSpacing || 5000;
      const bayCount = Math.ceil(buildingLength / postSpacing);
      return bayCount + 1;
    }
  };

  const portalCount = getPortalCount();

  // Initialiser les portiques si nécessaire
  React.useEffect(() => {
    if (customPortals.length !== portalCount) {
      const portals: CustomPortal[] = [];
      for (let i = 0; i < portalCount; i++) {
        const existingPortal = customPortals.find(p => p.portalIndex === i);
        portals.push(existingPortal || {
          portalIndex: i,
          frontPostYOffset: 0,
          backPostYOffset: 0
        });
      }
      onParametersChange({ customPortals: portals });
    }
  }, [portalCount, customPortals.length]);

  // Mettre à jour un portique
  const updatePortal = (portalIndex: number, field: 'frontPostYOffset' | 'backPostYOffset', value: string) => {
    const updatedPortals = [...customPortals];
    const portal = updatedPortals.find(p => p.portalIndex === portalIndex);
    if (portal) {
      const numValue = parseFloat(value);
      portal[field] = isNaN(numValue) ? 0 : numValue;
      onParametersChange({ customPortals: updatedPortals });
    }
  };

  // Réinitialiser toutes les hauteurs
  const resetHeights = () => {
    const portals: CustomPortal[] = [];
    for (let i = 0; i < portalCount; i++) {
      portals.push({
        portalIndex: i,
        frontPostYOffset: 0,
        backPostYOffset: 0
      });
    }
    onParametersChange({ customPortals: portals });
  };

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={cardTitleStyle}>⬆️ Ajustement des Hauteurs de Poteaux</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
            Activer l'ajustement des hauteurs
          </span>
        </label>
      </div>

      {!isActive && (
        <div style={{
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '6px',
          color: '#64748b',
          fontSize: '0.9rem',
          border: '1px dashed #cbd5e1'
        }}>
          <strong>Mode Standard :</strong> Tous les poteaux ont la même hauteur de départ (niveau du sol).
          <br />
          <strong>Nombre de portiques :</strong> {portalCount} ({portalCount * 2} poteaux)
          <br />
          <br />
          💡 <em>Activez cette option pour ajuster individuellement la hauteur de départ de chaque poteau (pieds de poteaux).</em>
        </div>
      )}

      {isActive && (
        <>
          <div style={{
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '6px',
            color: '#166534',
            fontSize: '0.85rem',
            marginBottom: '20px',
            border: '1px solid #bbf7d0'
          }}>
            <strong>Nombre de portiques :</strong> {portalCount} ({portalCount * 2} poteaux)
            <br />
            💡 <em>Ajustez individuellement la hauteur de départ de chaque poteau (pieds de poteaux)</em>
          </div>

      {/* Section PORTIQUES */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: '#fefefe',
        border: '2px solid #10b981',
        borderRadius: '8px'
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '1rem',
          fontWeight: '700',
          color: '#059669'
        }}>
          📍 Portiques (Décalages verticaux)
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          {customPortals.map((portal, index) => (
            <div
              key={portal.portalIndex}
              style={{
                padding: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px'
              }}
            >
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                color: '#10b981',
                marginBottom: '10px'
              }}>
                Portique {index}
              </div>

              {/* Poteau avant */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{
                  ...labelStyle,
                  fontSize: '0.75rem',
                  marginBottom: '4px',
                  display: 'block'
                }}>
                  🔵 Poteau Avant
                </label>
                <input
                  type="number"
                  style={{
                    ...inputStyle,
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  value={portal.frontPostYOffset}
                  onChange={(e) => updatePortal(portal.portalIndex, 'frontPostYOffset', e.target.value)}
                  min={-1000}
                  max={1000}
                  step={10}
                  placeholder="0"
                />
                <div style={{
                  fontSize: '0.65rem',
                  color: '#94a3b8',
                  marginTop: '2px'
                }}>
                  {portal.frontPostYOffset < 0 && '⬇️ En creux'}
                  {portal.frontPostYOffset > 0 && '⬆️ En relief'}
                  {portal.frontPostYOffset === 0 && '➡️ Niveau'}
                </div>
              </div>

              {/* Poteau arrière */}
              <div>
                <label style={{
                  ...labelStyle,
                  fontSize: '0.75rem',
                  marginBottom: '4px',
                  display: 'block'
                }}>
                  🔴 Poteau Arrière
                </label>
                <input
                  type="number"
                  style={{
                    ...inputStyle,
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  value={portal.backPostYOffset}
                  onChange={(e) => updatePortal(portal.portalIndex, 'backPostYOffset', e.target.value)}
                  min={-1000}
                  max={1000}
                  step={10}
                  placeholder="0"
                />
                <div style={{
                  fontSize: '0.65rem',
                  color: '#94a3b8',
                  marginTop: '2px'
                }}>
                  {portal.backPostYOffset < 0 && '⬇️ En creux'}
                  {portal.backPostYOffset > 0 && '⬆️ En relief'}
                  {portal.backPostYOffset === 0 && '➡️ Niveau'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

          {/* Bouton de réinitialisation */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={resetHeights}
              style={{
                ...buttonStyle('secondary'),
                fontSize: '0.85rem'
              }}
            >
              🔄 Réinitialiser toutes les hauteurs
            </button>
          </div>
        </>
      )}
    </div>
  );
};
