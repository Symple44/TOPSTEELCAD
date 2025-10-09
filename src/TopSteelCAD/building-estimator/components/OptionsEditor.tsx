/**
 * Éditeur d'options diverses par structure
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import { OptionType, OptionItem, OptionsConfig } from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface OptionsEditorProps {
  structureId: string;
  config?: OptionsConfig;
  onChange: (config: OptionsConfig | undefined) => void;
}

const OPTION_TYPE_LABELS: Record<OptionType, { label: string; icon: string; category: 'technique' | 'service' | 'documentation' }> = {
  [OptionType.THERMAL_BRIDGE_BREAK]: { label: 'Rupteur de ponts thermiques', icon: '🔥', category: 'technique' },
  [OptionType.ACOUSTIC_INSULATION]: { label: 'Isolation acoustique renforcée', icon: '🔇', category: 'technique' },
  [OptionType.FIRE_PROTECTION]: { label: 'Protection incendie', icon: '🧯', category: 'technique' },
  [OptionType.SEISMIC_REINFORCEMENT]: { label: 'Renforcement sismique', icon: '🌍', category: 'technique' },
  [OptionType.WIND_BRACING]: { label: 'Contreventement renforcé', icon: '💨', category: 'technique' },
  [OptionType.CONDENSATION_CONTROL]: { label: 'Contrôle de condensation', icon: '💧', category: 'technique' },
  [OptionType.EXTENDED_WARRANTY]: { label: 'Garantie étendue', icon: '✅', category: 'service' },
  [OptionType.MAINTENANCE_CONTRACT]: { label: 'Contrat de maintenance', icon: '🔧', category: 'service' },
  [OptionType.BIM_MODEL]: { label: 'Modèle BIM fourni', icon: '🏗️', category: 'documentation' },
  [OptionType.EXECUTION_DRAWINGS]: { label: 'Plans d\'exécution', icon: '📐', category: 'documentation' },
  [OptionType.STRUCTURAL_CALCULATIONS]: { label: 'Notes de calcul', icon: '📊', category: 'documentation' },
  [OptionType.ASSEMBLY_INSTRUCTIONS]: { label: 'Notice de montage', icon: '📖', category: 'documentation' }
};

const CATEGORY_LABELS = {
  technique: 'Options techniques',
  service: 'Services',
  documentation: 'Documentation'
};

const CATEGORY_COLORS = {
  technique: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  service: { bg: '#f0fdf4', border: '#10b981', text: '#065f46' },
  documentation: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
};

export const OptionsEditor: React.FC<OptionsEditorProps> = ({
  structureId,
  config,
  onChange
}) => {
  const [formData, setFormData] = useState<OptionsConfig>({
    enabled: config?.enabled ?? false,
    items: config?.items ?? []
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'technique' | 'service' | 'documentation'>('technique');
  const [newItem, setNewItem] = useState<Partial<OptionItem>>({
    type: OptionType.THERMAL_BRIDGE_BREAK,
    enabled: true,
    level: 'standard'
  });

  // Mettre à jour le formulaire quand la config externe change
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Notifier le parent des changements
  const updateConfig = (updates: Partial<OptionsConfig>) => {
    const newConfig = { ...formData, ...updates };
    setFormData(newConfig);
    onChange(newConfig.enabled ? newConfig : undefined);
  };

  const toggleEnabled = () => {
    const newEnabled = !formData.enabled;
    updateConfig({ enabled: newEnabled });
  };

  const addOption = () => {
    const option: OptionItem = {
      id: `option-${Date.now()}`,
      type: newItem.type as OptionType,
      enabled: newItem.enabled ?? true,
      level: newItem.level,
      duration: newItem.duration,
      format: newItem.format,
      notes: newItem.notes
    };

    updateConfig({
      items: [...formData.items, option]
    });

    // Réinitialiser le formulaire
    setNewItem({
      type: OptionType.THERMAL_BRIDGE_BREAK,
      enabled: true,
      level: 'standard'
    });
    setShowAddForm(false);
  };

  const updateOption = (id: string, updates: Partial<OptionItem>) => {
    updateConfig({
      items: formData.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const removeOption = (id: string) => {
    updateConfig({
      items: formData.items.filter(item => item.id !== id)
    });
  };

  const toggleOption = (id: string) => {
    updateConfig({
      items: formData.items.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    });
  };

  // Grouper les options par catégorie
  const groupedItems = formData.items.reduce((acc, item) => {
    const category = OPTION_TYPE_LABELS[item.type].category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, OptionItem[]>);

  // Filtrer les types disponibles par catégorie
  const availableTypesByCategory = Object.entries(OPTION_TYPE_LABELS)
    .filter(([_, data]) => data.category === selectedCategory)
    .reduce((acc, [type, data]) => {
      acc[type as OptionType] = data;
      return acc;
    }, {} as Record<OptionType, { label: string; icon: string; category: string }>);

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Options Diverses</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={toggleEnabled}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600', color: formData.enabled ? '#8b5cf6' : '#94a3b8' }}>
            {formData.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </label>
      </div>

      {formData.enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Liste des options par catégorie */}
          {Object.entries(CATEGORY_LABELS).map(([category, categoryLabel]) => {
            const items = groupedItems[category] || [];
            if (items.length === 0) return null;

            const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];

            return (
              <div key={category}>
                <h4 style={{ marginBottom: '10px', color: colors.text }}>{categoryLabel}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '15px',
                        border: `2px solid ${item.enabled ? colors.border : '#cbd5e1'}`,
                        background: item.enabled ? colors.bg : '#f8fafc',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {/* En-tête avec type et actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.5rem' }}>
                            {OPTION_TYPE_LABELS[item.type].icon}
                          </span>
                          <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                            {OPTION_TYPE_LABELS[item.type].label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => toggleOption(item.id)}
                            style={{
                              padding: '6px 12px',
                              background: item.enabled ? '#f59e0b' : colors.border,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            {item.enabled ? '⏸ Désactiver' : '▶ Activer'}
                          </button>
                          <button
                            onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            {editingId === item.id ? '✓ Fermer' : '✏️ Éditer'}
                          </button>
                          <button
                            onClick={() => removeOption(item.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Résumé rapide */}
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {item.level && <span>Niveau: {item.level} • </span>}
                        {item.duration && <span>Durée: {item.duration} mois • </span>}
                        {item.format && <span>Format: {item.format}</span>}
                      </div>

                      {/* Formulaire d'édition */}
                      {editingId === item.id && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                              <label style={labelStyle}>Niveau</label>
                              <select
                                value={item.level || 'standard'}
                                onChange={(e) => updateOption(item.id, { level: e.target.value })}
                                style={inputStyle}
                              >
                                <option value="standard">Standard</option>
                                <option value="renforce">Renforcé</option>
                                <option value="maximum">Maximum</option>
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Durée (mois)</label>
                              <input
                                type="number"
                                value={item.duration || ''}
                                onChange={(e) => updateOption(item.id, { duration: Number(e.target.value) })}
                                style={inputStyle}
                                min={1}
                                step={1}
                                placeholder="Pour garantie/maintenance"
                              />
                            </div>
                          </div>

                          <div>
                            <label style={labelStyle}>Format (pour documentation)</label>
                            <input
                              type="text"
                              value={item.format || ''}
                              onChange={(e) => updateOption(item.id, { format: e.target.value })}
                              style={inputStyle}
                              placeholder="Ex: PDF, DWG, IFC"
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Notes</label>
                            <textarea
                              value={item.notes || ''}
                              onChange={(e) => updateOption(item.id, { notes: e.target.value })}
                              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                              placeholder="Notes supplémentaires..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Bouton ajouter */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '12px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              ➕ Ajouter une option
            </button>
          ) : (
            <div style={{
              padding: '20px',
              background: '#f5f3ff',
              border: '2px solid #8b5cf6',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#6d28d9' }}>Nouvelle option</h4>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '6px 12px',
                    background: '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕ Annuler
                </button>
              </div>

              {/* Sélecteur de catégorie */}
              <div>
                <label style={labelStyle}>Catégorie</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category as 'technique' | 'service' | 'documentation');
                        // Réinitialiser le type au premier de la catégorie
                        const firstType = Object.keys(availableTypesByCategory)[0] as OptionType;
                        setNewItem({ ...newItem, type: firstType });
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: selectedCategory === category ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                        background: selectedCategory === category ? '#f5f3ff' : '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: selectedCategory === category ? '600' : '400'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type d'option selon catégorie */}
              <div>
                <label style={labelStyle}>Type d'option</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                  {Object.entries(availableTypesByCategory).map(([type, { label, icon }]) => (
                    <button
                      key={type}
                      onClick={() => setNewItem({ ...newItem, type: type as OptionType })}
                      style={{
                        padding: '10px',
                        border: newItem.type === type ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                        background: newItem.type === type ? '#f5f3ff' : '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                      <span style={{ fontWeight: newItem.type === type ? '600' : '400', fontSize: '0.75rem', textAlign: 'center' }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration de base */}
              <div>
                <label style={labelStyle}>Niveau</label>
                <select
                  value={newItem.level || 'standard'}
                  onChange={(e) => setNewItem({ ...newItem, level: e.target.value })}
                  style={inputStyle}
                >
                  <option value="standard">Standard</option>
                  <option value="renforce">Renforcé</option>
                  <option value="maximum">Maximum</option>
                </select>
              </div>

              <button
                onClick={addOption}
                style={{
                  padding: '12px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✓ Ajouter cette option
              </button>
            </div>
          )}

          {/* Message si aucune option */}
          {formData.items.length === 0 && !showAddForm && (
            <div style={{
              padding: '30px',
              textAlign: 'center',
              color: '#94a3b8',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0 }}>Aucune option configurée</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Cliquez sur "Ajouter" pour commencer</p>
            </div>
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
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>⚙️</p>
          <p style={{ margin: 0 }}>Options désactivées pour cette structure</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Activez pour configurer</p>
        </div>
      )}
    </div>
  );
};
