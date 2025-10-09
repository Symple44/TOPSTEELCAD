/**
 * Éditeur d'acrotères par structure
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import { AcrotereConfig } from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface AcrotereEditorProps {
  structureId: string;
  config?: AcrotereConfig;
  onChange: (config: AcrotereConfig | undefined) => void;
}

const PLACEMENT_LABELS: Record<string, string> = {
  contour: 'Contour complet',
  specific: 'Faces spécifiques'
};

const SIDE_LABELS: Record<string, string> = {
  front: 'Long-pan avant',
  back: 'Long-pan arrière',
  left: 'Pignon gauche',
  right: 'Pignon droit'
};

export const AcrotereEditor: React.FC<AcrotereEditorProps> = ({
  structureId,
  config,
  onChange
}) => {
  const [formData, setFormData] = useState<AcrotereConfig>({
    enabled: config?.enabled ?? false,
    height: config?.height ?? 800,
    placement: config?.placement ?? 'contour',
    sides: config?.sides ?? []
  });

  // Mettre à jour le formulaire quand la config externe change
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Notifier le parent des changements
  const updateConfig = (updates: Partial<AcrotereConfig>) => {
    const newConfig = { ...formData, ...updates };
    setFormData(newConfig);
    onChange(newConfig.enabled ? newConfig : undefined);
  };

  const toggleEnabled = () => {
    const newEnabled = !formData.enabled;
    updateConfig({ enabled: newEnabled });
  };

  const toggleSide = (side: string) => {
    const newSides = formData.sides?.includes(side)
      ? formData.sides.filter(s => s !== side)
      : [...(formData.sides || []), side];
    updateConfig({ sides: newSides });
  };

  const handlePlacementChange = (placement: 'contour' | 'specific') => {
    if (placement === 'contour') {
      // En mode contour, pas besoin de sides
      updateConfig({ placement, sides: [] });
    } else {
      // En mode specific, initialiser avec toutes les faces
      updateConfig({ placement, sides: ['front', 'back', 'left', 'right'] });
    }
  };

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Acrotères</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={toggleEnabled}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600', color: formData.enabled ? '#dc2626' : '#94a3b8' }}>
            {formData.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </label>
      </div>

      {formData.enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Hauteur */}
          <div>
            <label style={labelStyle}>Hauteur de l'acrotère (mm)</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => updateConfig({ height: Number(e.target.value) })}
              style={inputStyle}
              min={500}
              max={1500}
              step={50}
            />
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
              Hauteur ajoutée au-dessus du point le plus haut du toit
            </div>
          </div>

          {/* Type de placement */}
          <div>
            <label style={labelStyle}>Placement</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
                <label
                  key={value}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: formData.placement === value ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    background: formData.placement === value ? '#fef2f2' : '#fff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="placement"
                    value={value}
                    checked={formData.placement === value}
                    onChange={() => handlePlacementChange(value as 'contour' | 'specific')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: formData.placement === value ? '600' : '400' }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Faces spécifiques (si placement = 'specific') */}
          {formData.placement === 'specific' && (
            <div>
              <label style={labelStyle}>Faces équipées</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.entries(SIDE_LABELS).map(([side, label]) => (
                  <label
                    key={side}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      border: formData.sides?.includes(side) ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: formData.sides?.includes(side) ? '#fef2f2' : '#fff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.sides?.includes(side) ?? false}
                      onChange={() => toggleSide(side)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: formData.sides?.includes(side) ? '600' : '400' }}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Aperçu visuel */}
          <div style={{
            padding: '15px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', color: '#991b1b' }}>
              📊 Résumé de la configuration
            </div>
            <div style={{ fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.6' }}>
              <div>• Hauteur : {formData.height}mm</div>
              <div>• Placement : {PLACEMENT_LABELS[formData.placement || 'contour']}</div>
              {formData.placement === 'specific' && (
                <div>• Faces : {formData.sides?.map(s => SIDE_LABELS[s]).join(', ') || 'Aucune'}</div>
              )}
              {formData.placement === 'contour' && (
                <div>• Appliqué sur toutes les faces du contour</div>
              )}
            </div>
          </div>

          {/* Info technique */}
          <div style={{
            padding: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#78350f'
          }}>
            <strong>ℹ️ Note :</strong> L'acrotère est toujours droit (sommet horizontal) et non suivant la pente du toit.
          </div>
        </div>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#94a3b8',
          border: '2px dashed #cbd5e1',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>📐</p>
          <p style={{ margin: 0 }}>Acrotères désactivés pour cette structure</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Activez pour configurer</p>
        </div>
      )}
    </div>
  );
};
