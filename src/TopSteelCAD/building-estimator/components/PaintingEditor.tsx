/**
 * Éditeur de peinture et traitement de surface par structure
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import {
  PaintingType,
  SurfaceTreatmentType,
  PaintFinish,
  PaintingConfig,
  PaintingApplication
} from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface PaintingEditorProps {
  structureId: string;
  config?: PaintingConfig;
  onChange: (config: PaintingConfig | undefined) => void;
}

const PAINTING_TYPE_LABELS: Record<PaintingType, { label: string; icon: string }> = {
  [PaintingType.NONE]: { label: 'Aucune peinture', icon: '❌' },
  [PaintingType.GALVANISATION]: { label: 'Galvanisation à chaud', icon: '⚡' },
  [PaintingType.THERMOLAQUAGE]: { label: 'Thermolaquage', icon: '🎨' },
  [PaintingType.PEINTURE_LIQUIDE]: { label: 'Peinture liquide', icon: '🖌️' },
  [PaintingType.PEINTURE_POUDRE]: { label: 'Peinture poudre', icon: '💨' },
  [PaintingType.METALLISATION]: { label: 'Métallisation', icon: '✨' }
};

const SURFACE_TREATMENT_LABELS: Record<SurfaceTreatmentType, string> = {
  [SurfaceTreatmentType.NONE]: 'Aucun traitement',
  [SurfaceTreatmentType.SABLAGE]: 'Sablage',
  [SurfaceTreatmentType.GRENAILLAGE]: 'Grenaillage',
  [SurfaceTreatmentType.PASSIVATION]: 'Passivation',
  [SurfaceTreatmentType.PHOSPHATATION]: 'Phosphatation',
  [SurfaceTreatmentType.ANODISATION]: 'Anodisation'
};

const FINISH_LABELS: Record<PaintFinish, string> = {
  [PaintFinish.MAT]: 'Mat',
  [PaintFinish.SATINE]: 'Satiné',
  [PaintFinish.BRILLANT]: 'Brillant',
  [PaintFinish.TEXTURE]: 'Texturé'
};

const APPLICATION_LABELS: Record<keyof PaintingApplication, string> = {
  structure: 'Structure porteuse',
  secondaryFraming: 'Ossature secondaire',
  envelope: 'Enveloppe (bardage/couverture)',
  equipment: 'Équipements (garde-corps, acrotères)'
};

export const PaintingEditor: React.FC<PaintingEditorProps> = ({
  structureId,
  config,
  onChange
}) => {
  const [formData, setFormData] = useState<PaintingConfig>({
    enabled: config?.enabled ?? false,
    paintingType: config?.paintingType ?? PaintingType.NONE,
    surfaceTreatment: config?.surfaceTreatment ?? SurfaceTreatmentType.NONE,
    color: config?.color ?? '#64748b',
    ralCode: config?.ralCode,
    finish: config?.finish ?? PaintFinish.MAT,
    thickness: config?.thickness ?? 80,
    coats: config?.coats ?? 2,
    application: config?.application ?? {
      structure: true,
      secondaryFraming: true,
      envelope: false,
      equipment: false
    },
    withPrimer: config?.withPrimer ?? true,
    withTopCoat: config?.withTopCoat ?? true
  });

  // Mettre à jour le formulaire quand la config externe change
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Notifier le parent des changements
  const updateConfig = (updates: Partial<PaintingConfig>) => {
    const newConfig = { ...formData, ...updates };
    setFormData(newConfig);
    onChange(newConfig.enabled && newConfig.paintingType !== PaintingType.NONE ? newConfig : undefined);
  };

  const toggleEnabled = () => {
    const newEnabled = !formData.enabled;
    updateConfig({ enabled: newEnabled });
  };

  const toggleApplication = (key: keyof PaintingApplication) => {
    updateConfig({
      application: {
        ...formData.application,
        [key]: !formData.application?.[key]
      }
    });
  };

  const requiresColor = formData.paintingType !== PaintingType.NONE &&
                        formData.paintingType !== PaintingType.GALVANISATION &&
                        formData.paintingType !== PaintingType.METALLISATION;

  const requiresThickness = formData.paintingType === PaintingType.THERMOLAQUAGE ||
                           formData.paintingType === PaintingType.PEINTURE_POUDRE ||
                           formData.paintingType === PaintingType.PEINTURE_LIQUIDE;

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Peinture et Traitement de Surface</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={toggleEnabled}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600', color: formData.enabled ? '#f59e0b' : '#94a3b8' }}>
            {formData.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </label>
      </div>

      {formData.enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Type de peinture */}
          <div>
            <label style={labelStyle}>Type de peinture / protection</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {Object.entries(PAINTING_TYPE_LABELS).map(([type, { label, icon }]) => (
                <button
                  key={type}
                  onClick={() => updateConfig({ paintingType: type as PaintingType })}
                  style={{
                    padding: '12px',
                    border: formData.paintingType === type ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                    background: formData.paintingType === type ? '#fffbeb' : '#fff',
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
                  <span style={{ fontWeight: formData.paintingType === type ? '600' : '400', fontSize: '0.85rem' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {formData.paintingType !== PaintingType.NONE && (
            <>
              {/* Traitement de surface préalable */}
              <div>
                <label style={labelStyle}>Traitement de surface préalable</label>
                <select
                  value={formData.surfaceTreatment}
                  onChange={(e) => updateConfig({ surfaceTreatment: e.target.value as SurfaceTreatmentType })}
                  style={inputStyle}
                >
                  {Object.entries(SURFACE_TREATMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                  Traitement appliqué avant la peinture pour améliorer l'adhérence
                </div>
              </div>

              {/* Couleur et code RAL */}
              {requiresColor && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
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
                        placeholder="#64748b"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Code RAL</label>
                    <input
                      type="text"
                      value={formData.ralCode || ''}
                      onChange={(e) => updateConfig({ ralCode: e.target.value })}
                      style={inputStyle}
                      placeholder="Ex: RAL7015"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Finition</label>
                    <select
                      value={formData.finish}
                      onChange={(e) => updateConfig({ finish: e.target.value as PaintFinish })}
                      style={inputStyle}
                    >
                      {Object.entries(FINISH_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Épaisseur et nombre de couches */}
              {requiresThickness && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={labelStyle}>Épaisseur (microns)</label>
                    <input
                      type="number"
                      value={formData.thickness}
                      onChange={(e) => updateConfig({ thickness: Number(e.target.value) })}
                      style={inputStyle}
                      min={40}
                      max={300}
                      step={10}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                      Épaisseur du film sec (recommandé : 60-120 μm)
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Nombre de couches</label>
                    <input
                      type="number"
                      value={formData.coats}
                      onChange={(e) => updateConfig({ coats: Number(e.target.value) })}
                      style={inputStyle}
                      min={1}
                      max={5}
                      step={1}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                      Nombre de passes pour atteindre l'épaisseur
                    </div>
                  </div>
                </div>
              )}

              {/* Application sur éléments */}
              <div>
                <label style={{ ...labelStyle, marginBottom: '10px', display: 'block' }}>
                  Application sur les éléments
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {Object.entries(APPLICATION_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: formData.application?.[key as keyof PaintingApplication] ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                        background: formData.application?.[key as keyof PaintingApplication] ? '#fffbeb' : '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.application?.[key as keyof PaintingApplication] ?? false}
                        onChange={() => toggleApplication(key as keyof PaintingApplication)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: formData.application?.[key as keyof PaintingApplication] ? '600' : '400', fontSize: '0.9rem' }}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options couches supplémentaires */}
              {requiresThickness && (
                <div>
                  <label style={{ ...labelStyle, marginBottom: '10px', display: 'block' }}>
                    Couches supplémentaires
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.withPrimer ?? false}
                        onChange={(e) => updateConfig({ withPrimer: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Sous-couche (primer)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.withTopCoat ?? false}
                        onChange={(e) => updateConfig({ withTopCoat: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Couche de finition (top coat)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Résumé */}
              <div style={{
                padding: '15px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', color: '#92400e' }}>
                  📊 Résumé de la configuration
                </div>
                <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: '1.6' }}>
                  <div>• Type : {PAINTING_TYPE_LABELS[formData.paintingType].label}</div>
                  {formData.surfaceTreatment !== SurfaceTreatmentType.NONE && (
                    <div>• Traitement préalable : {SURFACE_TREATMENT_LABELS[formData.surfaceTreatment!]}</div>
                  )}
                  {requiresColor && (
                    <>
                      <div>• Couleur : {formData.color}{formData.ralCode ? ` (${formData.ralCode})` : ''}</div>
                      <div>• Finition : {FINISH_LABELS[formData.finish!]}</div>
                    </>
                  )}
                  {requiresThickness && (
                    <>
                      <div>• Épaisseur : {formData.thickness}μm en {formData.coats} couche(s)</div>
                      {formData.withPrimer && <div>• Avec sous-couche</div>}
                      {formData.withTopCoat && <div>• Avec couche de finition</div>}
                    </>
                  )}
                  <div>• Application : {
                    Object.entries(formData.application || {})
                      .filter(([_, enabled]) => enabled)
                      .map(([key]) => APPLICATION_LABELS[key as keyof PaintingApplication])
                      .join(', ') || 'Aucune'
                  }</div>
                </div>
              </div>

              {/* Info technique selon le type */}
              {formData.paintingType === PaintingType.GALVANISATION && (
                <div style={{
                  padding: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#15803d'
                }}>
                  <strong>ℹ️ Galvanisation :</strong> Protection anticorrosion par immersion dans un bain de zinc fondu.
                  Durée de vie estimée : 50+ ans. Épaisseur typique : 70-85μm.
                </div>
              )}

              {formData.paintingType === PaintingType.THERMOLAQUAGE && (
                <div style={{
                  padding: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#15803d'
                }}>
                  <strong>ℹ️ Thermolaquage :</strong> Peinture poudre polymérisée au four (180-200°C).
                  Excellente résistance aux UV et aux intempéries. Pas de solvants.
                </div>
              )}
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
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>🎨</p>
          <p style={{ margin: 0 }}>Peinture et traitement désactivés pour cette structure</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Activez pour configurer</p>
        </div>
      )}
    </div>
  );
};
