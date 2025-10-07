/**
 * Éditeur de mode personnalisé pour les entraxes
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { CustomBay, CustomPortal, BuildingParameters } from '../types';
import {
  formSectionStyle,
  labelStyle,
  inputStyle,
  buttonStyle,
  cardTitleStyle
} from '../styles/buildingEstimator.styles';

interface CustomSpacingEditorProps {
  buildingLength: number;
  parameters: BuildingParameters;
  onParametersChange: (params: Partial<BuildingParameters>) => void;
}

export const CustomSpacingEditor: React.FC<CustomSpacingEditorProps> = ({
  buildingLength,
  parameters,
  onParametersChange
}) => {
  const isCustomMode = parameters.customSpacingMode || false;
  const customBays = parameters.customBays || [];

  // Calculer le nombre de travées avec l'entraxe standard
  const standardBayCount = Math.ceil(buildingLength / parameters.postSpacing);

  // Initialiser le mode personnalisé
  const initializeCustomMode = () => {
    const bays: CustomBay[] = [];

    // Créer les travées
    for (let i = 0; i < standardBayCount; i++) {
      bays.push({
        bayIndex: i,
        spacing: parameters.postSpacing
      });
    }

    onParametersChange({
      customSpacingMode: true,
      customBays: bays
    });
  };

  // Désactiver le mode personnalisé
  const disableCustomMode = () => {
    onParametersChange({
      customSpacingMode: false,
      customBays: []
    });
  };

  // Mettre à jour une travée
  const updateBay = (bayIndex: number, spacing: number) => {
    const updatedBays = [...customBays];
    const bay = updatedBays.find(b => b.bayIndex === bayIndex);
    if (bay) {
      bay.spacing = spacing;
      onParametersChange({ customBays: updatedBays });
    }
  };

  // Calculer la longueur totale
  const calculateTotalLength = (): number => {
    return customBays.reduce((total, bay) => total + bay.spacing, 0);
  };

  // Ajouter une travée
  const addBay = () => {
    const newBay: CustomBay = {
      bayIndex: customBays.length,
      spacing: parameters.postSpacing
    };
    onParametersChange({
      customBays: [...customBays, newBay]
    });
  };

  // Supprimer la dernière travée
  const removeBay = () => {
    if (customBays.length > 1) {
      onParametersChange({
        customBays: customBays.slice(0, -1)
      });
    }
  };

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={cardTitleStyle}>⚙️ Mode Personnalisé des Entraxes</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isCustomMode}
            onChange={(e) => {
              if (e.target.checked) {
                initializeCustomMode();
              } else {
                disableCustomMode();
              }
            }}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
            Activer le mode personnalisé
          </span>
        </label>
      </div>

      {!isCustomMode && (
        <div style={{
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '6px',
          color: '#64748b',
          fontSize: '0.9rem',
          border: '1px dashed #cbd5e1'
        }}>
          <strong>Mode Standard :</strong> Toutes les travées ont un entraxe uniforme de {parameters.postSpacing}mm.
          <br />
          <strong>Nombre de travées :</strong> {standardBayCount}
          <br />
          <br />
          💡 <em>Activez le mode personnalisé pour ajuster individuellement l'entraxe de chaque travée.</em>
        </div>
      )}

      {isCustomMode && (
        <>
          <div style={{
            padding: '12px',
            background: '#eff6ff',
            borderRadius: '6px',
            color: '#1e40af',
            fontSize: '0.85rem',
            marginBottom: '20px',
            border: '1px solid #bfdbfe'
          }}>
            <strong>Mode personnalisé activé</strong>
            <br />
            <strong>Longueur totale :</strong> {calculateTotalLength().toFixed(0)}mm
            {Math.abs(calculateTotalLength() - buildingLength) > 10 && (
              <span style={{ color: '#dc2626', fontWeight: '600' }}>
                {' '}⚠️ Différence de {Math.abs(calculateTotalLength() - buildingLength).toFixed(0)}mm
              </span>
            )}
            <br />
            <strong>Travées :</strong> {customBays.length}
          </div>

          {/* Section TRAVÉES */}
          <div style={{
            marginBottom: '30px',
            padding: '16px',
            background: '#fefefe',
            border: '2px solid #3b82f6',
            borderRadius: '8px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '1rem',
              fontWeight: '700',
              color: '#1e40af'
            }}>
              📏 Travées (Entraxes horizontaux)
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {customBays.map((bay, index) => (
                <div
                  key={bay.bayIndex}
                  style={{
                    padding: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#3b82f6',
                    marginBottom: '6px'
                  }}>
                    Travée {index + 1}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    marginBottom: '6px'
                  }}>
                    P{index} → P{index + 1}
                  </div>
                  <input
                    type="number"
                    style={{
                      ...inputStyle,
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                    value={bay.spacing}
                    onChange={(e) => updateBay(bay.bayIndex, parseInt(e.target.value) || 0)}
                    min={1000}
                    max={12000}
                    step={100}
                  />
                  <div style={{
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    marginTop: '3px'
                  }}>
                    Entraxe (mm)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={addBay}
              style={{
                ...buttonStyle('secondary'),
                fontSize: '0.85rem'
              }}
            >
              ➕ Ajouter une travée
            </button>

            {customBays.length > 1 && (
              <button
                onClick={removeBay}
                style={{
                  ...buttonStyle('danger'),
                  fontSize: '0.85rem'
                }}
              >
                🗑️ Supprimer la dernière travée
              </button>
            )}

            <button
              onClick={initializeCustomMode}
              style={{
                ...buttonStyle('secondary'),
                fontSize: '0.85rem'
              }}
            >
              🔄 Réinitialiser
            </button>
          </div>
        </>
      )}
    </div>
  );
};
