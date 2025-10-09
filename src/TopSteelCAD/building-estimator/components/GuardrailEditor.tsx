/**
 * Éditeur de garde-corps par structure
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import { GuardrailType, GuardrailConfig } from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface GuardrailEditorProps {
  structureId: string;
  config?: GuardrailConfig;
  onChange: (config: GuardrailConfig | undefined) => void;
}

const GUARDRAIL_TYPE_LABELS: Record<GuardrailType, string> = {
  [GuardrailType.HORIZONTAL_RAILS]: 'Lisses horizontales',
  [GuardrailType.VERTICAL_BARS]: 'Barreaux verticaux',
  [GuardrailType.CABLE]: 'Câbles',
  [GuardrailType.MESH_PANEL]: 'Panneaux grillagés',
  [GuardrailType.SOLID_PANEL]: 'Panneaux pleins',
  [GuardrailType.PERFORATED_PANEL]: 'Panneaux perforés',
  [GuardrailType.GLASS]: 'Verre',
  [GuardrailType.MIXED_RAILS_BARS]: 'Mixte (lisses + barreaux)',
  [GuardrailType.MIXED_RAILS_MESH]: 'Mixte (lisses + grillage)'
};

const SIDE_LABELS: Record<string, string> = {
  front: 'Long-pan avant',
  back: 'Long-pan arrière',
  left: 'Pignon gauche',
  right: 'Pignon droit'
};

export const GuardrailEditor: React.FC<GuardrailEditorProps> = ({
  structureId,
  config,
  onChange
}) => {
  const [formData, setFormData] = useState<GuardrailConfig>({
    enabled: config?.enabled ?? false,
    type: config?.type ?? GuardrailType.HORIZONTAL_RAILS,
    height: config?.height ?? 1100,
    postSpacing: config?.postSpacing ?? 1500,
    sides: config?.sides ?? [],
    color: config?.color ?? '#059669',
    withToeboard: config?.withToeboard ?? true,
    toeboardHeight: config?.toeboardHeight ?? 150,
    numberOfRails: config?.numberOfRails ?? 3,
    barSpacing: config?.barSpacing ?? 100,
    cableCount: config?.cableCount ?? 5,
    mixedLowerFillHeight: config?.mixedLowerFillHeight ?? 600
  });

  // Mettre à jour le formulaire quand la config externe change
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Notifier le parent des changements
  const updateConfig = (updates: Partial<GuardrailConfig>) => {
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

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Garde-corps</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={toggleEnabled}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600', color: formData.enabled ? '#059669' : '#94a3b8' }}>
            {formData.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </label>
      </div>

      {formData.enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Type de garde-corps */}
          <div>
            <label style={labelStyle}>Type de garde-corps</label>
            <select
              value={formData.type}
              onChange={(e) => updateConfig({ type: e.target.value as GuardrailType })}
              style={inputStyle}
            >
              {Object.entries(GUARDRAIL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Faces */}
          <div>
            <label style={labelStyle}>Faces à équiper</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {Object.entries(SIDE_LABELS).map(([side, label]) => (
                <label
                  key={side}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: formData.sides?.includes(side) ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: formData.sides?.includes(side) ? '#f0fdf4' : '#fff',
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

          {/* Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Hauteur (mm)</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => updateConfig({ height: Number(e.target.value) })}
                style={inputStyle}
                min={1000}
                max={1500}
                step={50}
              />
            </div>
            <div>
              <label style={labelStyle}>Entraxe poteaux (mm)</label>
              <input
                type="number"
                value={formData.postSpacing}
                onChange={(e) => updateConfig({ postSpacing: Number(e.target.value) })}
                style={inputStyle}
                min={1000}
                max={3000}
                step={100}
              />
            </div>
          </div>

          {/* Plinthe */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={formData.withToeboard ?? false}
                onChange={(e) => updateConfig({ withToeboard: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600' }}>Plinthe</span>
            </label>
            {formData.withToeboard && (
              <div style={{ marginLeft: '30px' }}>
                <label style={labelStyle}>Hauteur plinthe (mm)</label>
                <input
                  type="number"
                  value={formData.toeboardHeight}
                  onChange={(e) => updateConfig({ toeboardHeight: Number(e.target.value) })}
                  style={inputStyle}
                  min={100}
                  max={300}
                  step={10}
                />
              </div>
            )}
          </div>

          {/* Options selon le type */}
          {formData.type === GuardrailType.HORIZONTAL_RAILS && (
            <div>
              <label style={labelStyle}>Nombre de lisses</label>
              <input
                type="number"
                value={formData.numberOfRails}
                onChange={(e) => updateConfig({ numberOfRails: Number(e.target.value) })}
                style={inputStyle}
                min={2}
                max={5}
                step={1}
              />
            </div>
          )}

          {formData.type === GuardrailType.VERTICAL_BARS && (
            <div>
              <label style={labelStyle}>Espacement barreaux (mm)</label>
              <input
                type="number"
                value={formData.barSpacing}
                onChange={(e) => updateConfig({ barSpacing: Number(e.target.value) })}
                style={inputStyle}
                min={80}
                max={150}
                step={10}
              />
            </div>
          )}

          {formData.type === GuardrailType.CABLE && (
            <div>
              <label style={labelStyle}>Nombre de câbles</label>
              <input
                type="number"
                value={formData.cableCount}
                onChange={(e) => updateConfig({ cableCount: Number(e.target.value) })}
                style={inputStyle}
                min={3}
                max={8}
                step={1}
              />
            </div>
          )}

          {(formData.type === GuardrailType.MIXED_RAILS_BARS || formData.type === GuardrailType.MIXED_RAILS_MESH) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Hauteur remplissage bas (mm)</label>
                <input
                  type="number"
                  value={formData.mixedLowerFillHeight}
                  onChange={(e) => updateConfig({ mixedLowerFillHeight: Number(e.target.value) })}
                  style={inputStyle}
                  min={400}
                  max={800}
                  step={50}
                />
              </div>
              <div>
                <label style={labelStyle}>Nombre de lisses hautes</label>
                <input
                  type="number"
                  value={formData.numberOfRails}
                  onChange={(e) => updateConfig({ numberOfRails: Number(e.target.value) })}
                  style={inputStyle}
                  min={1}
                  max={3}
                  step={1}
                />
              </div>
              {formData.type === GuardrailType.MIXED_RAILS_BARS && (
                <div>
                  <label style={labelStyle}>Espacement barreaux (mm)</label>
                  <input
                    type="number"
                    value={formData.barSpacing}
                    onChange={(e) => updateConfig({ barSpacing: Number(e.target.value) })}
                    style={inputStyle}
                    min={80}
                    max={150}
                    step={10}
                  />
                </div>
              )}
            </div>
          )}

          {/* Couleur */}
          <div>
            <label style={labelStyle}>Couleur</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="#059669"
              />
            </div>
          </div>

          {/* Aperçu visuel */}
          <div style={{
            padding: '15px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', color: '#64748b' }}>
              📊 Résumé de la configuration
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
              <div>• Type : {GUARDRAIL_TYPE_LABELS[formData.type]}</div>
              <div>• Hauteur : {formData.height}mm</div>
              <div>• Poteaux tous les {formData.postSpacing}mm</div>
              <div>• Faces : {formData.sides?.map(s => SIDE_LABELS[s]).join(', ') || 'Aucune'}</div>
              {formData.withToeboard && <div>• Plinthe : {formData.toeboardHeight}mm</div>}
            </div>
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
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>🚧</p>
          <p style={{ margin: 0 }}>Garde-corps désactivé pour cette structure</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Activez pour configurer</p>
        </div>
      )}
    </div>
  );
};
