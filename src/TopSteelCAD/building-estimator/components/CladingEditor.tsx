/**
 * Éditeur de bardage par structure
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import { CladingType, CladingConfig, SteelProfileType, CladingOrientation } from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface CladingEditorProps {
  structureId: string;
  config?: CladingConfig;
  onChange: (config: CladingConfig | undefined) => void;
}

const CLADING_TYPE_LABELS: Record<CladingType, { label: string; icon: string }> = {
  [CladingType.BAC_ACIER]: { label: 'Bac acier simple peau', icon: '🏗️' },
  [CladingType.PANNEAU_SANDWICH]: { label: 'Panneau sandwich isolant', icon: '🥪' },
  [CladingType.BARDAGE_BOIS]: { label: 'Bardage bois', icon: '🪵' },
  [CladingType.BARDAGE_COMPOSITE]: { label: 'Bardage composite', icon: '🎨' },
  [CladingType.BARDAGE_FIBROCIMENT]: { label: 'Fibro-ciment', icon: '🧱' },
  [CladingType.BARDAGE_METALLIQUE]: { label: 'Cassettes métalliques', icon: '✨' },
  [CladingType.NONE]: { label: 'Aucun bardage', icon: '❌' }
};

const SIDE_LABELS: Record<string, string> = {
  front: 'Long-pan avant',
  back: 'Long-pan arrière',
  left: 'Pignon gauche',
  right: 'Pignon droit'
};

const STEEL_PROFILE_LABELS: Record<SteelProfileType, string> = {
  [SteelProfileType.T20]: 'T20 - Trapèze 20mm',
  [SteelProfileType.T35]: 'T35 - Trapèze 35mm',
  [SteelProfileType.T40]: 'T40 - Trapèze 40mm',
  [SteelProfileType.T45]: 'T45 - Trapèze 45mm',
  [SteelProfileType.T60]: 'T60 - Trapèze 60mm',
  [SteelProfileType.T100]: 'T100 - Trapèze 100mm',
  [SteelProfileType.T150]: 'T150 - Trapèze 150mm',
  [SteelProfileType.ONDULE]: 'Tôle ondulée'
};

export const CladingEditor: React.FC<CladingEditorProps> = ({
  structureId,
  config,
  onChange
}) => {
  const [formData, setFormData] = useState<CladingConfig>({
    enabled: config?.enabled ?? false,
    type: config?.type ?? CladingType.BAC_ACIER,
    sides: config?.sides ?? ['front', 'back', 'left', 'right'],
    profile: config?.profile ?? SteelProfileType.T40,
    thickness: config?.thickness ?? 80,
    insulation: config?.insulation ?? 60,
    orientation: config?.orientation ?? CladingOrientation.VERTICAL,
    color: config?.color ?? '#64748b',
    finish: config?.finish ?? 'mat',
    withVapourBarrier: config?.withVapourBarrier ?? true,
    withWindBarrier: config?.withWindBarrier ?? true
  });

  // Mettre à jour le formulaire quand la config externe change
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Notifier le parent des changements
  const updateConfig = (updates: Partial<CladingConfig>) => {
    const newConfig = { ...formData, ...updates };
    setFormData(newConfig);
    onChange(newConfig.enabled && newConfig.type !== CladingType.NONE ? newConfig : undefined);
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

  const requiresProfile = formData.type === CladingType.BAC_ACIER;
  const requiresThickness = formData.type === CladingType.PANNEAU_SANDWICH;
  const hasOrientation = formData.type === CladingType.BARDAGE_BOIS ||
                         formData.type === CladingType.BARDAGE_COMPOSITE ||
                         formData.type === CladingType.BARDAGE_FIBROCIMENT ||
                         formData.type === CladingType.BARDAGE_METALLIQUE;

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Bardage</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={toggleEnabled}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600', color: formData.enabled ? '#3b82f6' : '#94a3b8' }}>
            {formData.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </label>
      </div>

      {formData.enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Type de bardage */}
          <div>
            <label style={labelStyle}>Type de bardage</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {Object.entries(CLADING_TYPE_LABELS).map(([type, { label, icon }]) => (
                <button
                  key={type}
                  onClick={() => updateConfig({ type: type as CladingType })}
                  style={{
                    padding: '12px',
                    border: formData.type === type ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                    background: formData.type === type ? '#eff6ff' : '#fff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{icon}</span>
                  <span style={{ fontWeight: formData.type === type ? '600' : '400', fontSize: '0.85rem' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {formData.type !== CladingType.NONE && (
            <>
              {/* Faces à équiper */}
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
                        border: formData.sides?.includes(side) ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        background: formData.sides?.includes(side) ? '#eff6ff' : '#fff',
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

              {/* Profil (pour bac acier) */}
              {requiresProfile && (
                <div>
                  <label style={labelStyle}>Profil de bac acier</label>
                  <select
                    value={formData.profile}
                    onChange={(e) => updateConfig({ profile: e.target.value as SteelProfileType })}
                    style={inputStyle}
                  >
                    {Object.entries(STEEL_PROFILE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Épaisseur (pour panneaux sandwich) */}
              {requiresThickness && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={labelStyle}>Épaisseur totale (mm)</label>
                    <input
                      type="number"
                      value={formData.thickness}
                      onChange={(e) => updateConfig({ thickness: Number(e.target.value) })}
                      style={inputStyle}
                      min={40}
                      max={200}
                      step={10}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Isolation (mm)</label>
                    <input
                      type="number"
                      value={formData.insulation}
                      onChange={(e) => updateConfig({ insulation: Number(e.target.value) })}
                      style={inputStyle}
                      min={20}
                      max={180}
                      step={10}
                    />
                  </div>
                </div>
              )}

              {/* Orientation (pour bardage lames) */}
              {hasOrientation && (
                <div>
                  <label style={labelStyle}>Sens de pose</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: formData.orientation === CladingOrientation.VERTICAL ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        background: formData.orientation === CladingOrientation.VERTICAL ? '#eff6ff' : '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="orientation"
                        value={CladingOrientation.VERTICAL}
                        checked={formData.orientation === CladingOrientation.VERTICAL}
                        onChange={() => updateConfig({ orientation: CladingOrientation.VERTICAL })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: formData.orientation === CladingOrientation.VERTICAL ? '600' : '400' }}>
                        ⬆️ Vertical
                      </span>
                    </label>
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: formData.orientation === CladingOrientation.HORIZONTAL ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        background: formData.orientation === CladingOrientation.HORIZONTAL ? '#eff6ff' : '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="orientation"
                        value={CladingOrientation.HORIZONTAL}
                        checked={formData.orientation === CladingOrientation.HORIZONTAL}
                        onChange={() => updateConfig({ orientation: CladingOrientation.HORIZONTAL })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: formData.orientation === CladingOrientation.HORIZONTAL ? '600' : '400' }}>
                        ↔️ Horizontal
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Couleur et finition */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
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
                      placeholder="#64748b ou RAL7015"
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Finition</label>
                  <select
                    value={formData.finish}
                    onChange={(e) => updateConfig({ finish: e.target.value as 'mat' | 'brillant' | 'satine' })}
                    style={inputStyle}
                  >
                    <option value="mat">Mat</option>
                    <option value="satine">Satiné</option>
                    <option value="brillant">Brillant</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div>
                <label style={{ ...labelStyle, marginBottom: '10px', display: 'block' }}>Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.withVapourBarrier ?? false}
                      onChange={(e) => updateConfig({ withVapourBarrier: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Pare-vapeur</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.withWindBarrier ?? false}
                      onChange={(e) => updateConfig({ withWindBarrier: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Pare-pluie</span>
                  </label>
                </div>
              </div>

              {/* Résumé */}
              <div style={{
                padding: '15px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', color: '#1e40af' }}>
                  📊 Résumé de la configuration
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.6' }}>
                  <div>• Type : {CLADING_TYPE_LABELS[formData.type].label}</div>
                  {requiresProfile && <div>• Profil : {STEEL_PROFILE_LABELS[formData.profile!]}</div>}
                  {requiresThickness && <div>• Épaisseur : {formData.thickness}mm (isolation {formData.insulation}mm)</div>}
                  {hasOrientation && <div>• Pose : {formData.orientation === CladingOrientation.VERTICAL ? 'Verticale' : 'Horizontale'}</div>}
                  <div>• Faces : {formData.sides?.map(s => SIDE_LABELS[s]).join(', ') || 'Aucune'}</div>
                  <div>• Finition : {formData.finish}</div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#94a3b8',
          border: '2px dashed #cbd5e1',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>🏗️</p>
          <p style={{ margin: 0 }}>Bardage désactivé pour cette structure</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Activez pour configurer</p>
        </div>
      )}
    </div>
  );
};
