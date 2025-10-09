/**
 * Éditeur d'accessoires par structure
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import { AccessoryType, AccessoryItem, AccessoriesConfig } from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface AccessoriesEditorProps {
  structureId: string;
  config?: AccessoriesConfig;
  onChange: (config: AccessoriesConfig | undefined) => void;
}

const ACCESSORY_TYPE_LABELS: Record<AccessoryType, { label: string; icon: string }> = {
  [AccessoryType.GUTTERS]: { label: 'Gouttières', icon: '💧' },
  [AccessoryType.DOWNSPOUTS]: { label: 'Descentes EP', icon: '⬇️' },
  [AccessoryType.FLASHINGS]: { label: 'Bavettes et bandes de rives', icon: '📏' },
  [AccessoryType.RIDGE_CAPS]: { label: 'Faîtages', icon: '⛰️' },
  [AccessoryType.VENTILATION]: { label: 'Ventilations naturelles', icon: '🌬️' },
  [AccessoryType.SMOKE_VENTS]: { label: 'Exutoires de fumée', icon: '🔥' },
  [AccessoryType.LIGHTNING_PROTECTION]: { label: 'Paratonnerre', icon: '⚡' },
  [AccessoryType.FALL_PROTECTION]: { label: 'Ligne de vie', icon: '🪢' },
  [AccessoryType.ACCESS_LADDER]: { label: 'Échelle d\'accès', icon: '🪜' },
  [AccessoryType.WALKWAYS]: { label: 'Passerelles de circulation', icon: '🚶' },
  [AccessoryType.INSULATION_STOPS]: { label: 'Arrêts de neige', icon: '❄️' },
  [AccessoryType.BIRD_PROTECTION]: { label: 'Protection oiseaux', icon: '🦅' }
};

const SIDE_LABELS: Record<string, string> = {
  front: 'Long-pan avant',
  back: 'Long-pan arrière',
  left: 'Pignon gauche',
  right: 'Pignon droit'
};

export const AccessoriesEditor: React.FC<AccessoriesEditorProps> = ({
  structureId,
  config,
  onChange
}) => {
  const [formData, setFormData] = useState<AccessoriesConfig>({
    enabled: config?.enabled ?? false,
    items: config?.items ?? []
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<AccessoryItem>>({
    type: AccessoryType.GUTTERS,
    enabled: true,
    quantity: 1,
    sides: []
  });

  // Mettre à jour le formulaire quand la config externe change
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Notifier le parent des changements
  const updateConfig = (updates: Partial<AccessoriesConfig>) => {
    const newConfig = { ...formData, ...updates };
    setFormData(newConfig);
    onChange(newConfig.enabled ? newConfig : undefined);
  };

  const toggleEnabled = () => {
    const newEnabled = !formData.enabled;
    updateConfig({ enabled: newEnabled });
  };

  const addAccessory = () => {
    const accessory: AccessoryItem = {
      id: `accessory-${Date.now()}`,
      type: newItem.type as AccessoryType,
      enabled: newItem.enabled ?? true,
      quantity: newItem.quantity,
      length: newItem.length,
      color: newItem.color,
      material: newItem.material,
      position: newItem.position,
      sides: newItem.sides,
      notes: newItem.notes
    };

    updateConfig({
      items: [...formData.items, accessory]
    });

    // Réinitialiser le formulaire
    setNewItem({
      type: AccessoryType.GUTTERS,
      enabled: true,
      quantity: 1,
      sides: []
    });
    setShowAddForm(false);
  };

  const updateAccessory = (id: string, updates: Partial<AccessoryItem>) => {
    updateConfig({
      items: formData.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const removeAccessory = (id: string) => {
    updateConfig({
      items: formData.items.filter(item => item.id !== id)
    });
  };

  const toggleAccessory = (id: string) => {
    updateConfig({
      items: formData.items.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    });
  };

  const toggleSide = (sides: string[] | undefined, side: string) => {
    const currentSides = sides || [];
    return currentSides.includes(side)
      ? currentSides.filter(s => s !== side)
      : [...currentSides, side];
  };

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Accessoires et Équipements</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={toggleEnabled}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600', color: formData.enabled ? '#10b981' : '#94a3b8' }}>
            {formData.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </label>
      </div>

      {formData.enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Liste des accessoires existants */}
          {formData.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {formData.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '15px',
                    border: `2px solid ${item.enabled ? '#10b981' : '#cbd5e1'}`,
                    background: item.enabled ? '#f0fdf4' : '#f8fafc',
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
                        {ACCESSORY_TYPE_LABELS[item.type].icon}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {ACCESSORY_TYPE_LABELS[item.type].label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => toggleAccessory(item.id)}
                        style={{
                          padding: '6px 12px',
                          background: item.enabled ? '#f59e0b' : '#10b981',
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
                        onClick={() => removeAccessory(item.id)}
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
                    {item.quantity && <span>Quantité: {item.quantity} • </span>}
                    {item.length && <span>Longueur: {item.length}mm • </span>}
                    {item.material && <span>Matériau: {item.material} • </span>}
                    {item.position && <span>Position: {item.position}</span>}
                  </div>

                  {/* Formulaire d'édition */}
                  {editingId === item.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={labelStyle}>Quantité</label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateAccessory(item.id, { quantity: Number(e.target.value) })}
                            style={inputStyle}
                            min={1}
                            step={1}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Longueur totale (mm)</label>
                          <input
                            type="number"
                            value={item.length || ''}
                            onChange={(e) => updateAccessory(item.id, { length: Number(e.target.value) })}
                            style={inputStyle}
                            min={0}
                            step={100}
                            placeholder="Optionnel"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={labelStyle}>Couleur</label>
                          <input
                            type="text"
                            value={item.color || ''}
                            onChange={(e) => updateAccessory(item.id, { color: e.target.value })}
                            style={inputStyle}
                            placeholder="Ex: RAL7016"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Matériau</label>
                          <input
                            type="text"
                            value={item.material || ''}
                            onChange={(e) => updateAccessory(item.id, { material: e.target.value })}
                            style={inputStyle}
                            placeholder="Ex: Acier galvanisé"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>Position / Localisation</label>
                        <input
                          type="text"
                          value={item.position || ''}
                          onChange={(e) => updateAccessory(item.id, { position: e.target.value })}
                          style={inputStyle}
                          placeholder="Ex: En toiture, façade principale"
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Faces concernées</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {Object.entries(SIDE_LABELS).map(([side, label]) => (
                            <label
                              key={side}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                border: item.sides?.includes(side) ? '2px solid #10b981' : '1px solid #cbd5e1',
                                background: item.sides?.includes(side) ? '#f0fdf4' : '#fff',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={item.sides?.includes(side) ?? false}
                                onChange={() => updateAccessory(item.id, { sides: toggleSide(item.sides, side) })}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>Notes</label>
                        <textarea
                          value={item.notes || ''}
                          onChange={(e) => updateAccessory(item.id, { notes: e.target.value })}
                          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                          placeholder="Notes supplémentaires..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bouton ajouter */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              ➕ Ajouter un accessoire
            </button>
          ) : (
            <div style={{
              padding: '20px',
              background: '#f0fdf4',
              border: '2px solid #10b981',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#059669' }}>Nouvel accessoire</h4>
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

              {/* Type d'accessoire */}
              <div>
                <label style={labelStyle}>Type d'accessoire</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {Object.entries(ACCESSORY_TYPE_LABELS).map(([type, { label, icon }]) => (
                    <button
                      key={type}
                      onClick={() => setNewItem({ ...newItem, type: type as AccessoryType })}
                      style={{
                        padding: '10px',
                        border: newItem.type === type ? '2px solid #10b981' : '1px solid #cbd5e1',
                        background: newItem.type === type ? '#ecfdf5' : '#fff',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>Quantité</label>
                  <input
                    type="number"
                    value={newItem.quantity || 1}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    style={inputStyle}
                    min={1}
                    step={1}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Longueur totale (mm)</label>
                  <input
                    type="number"
                    value={newItem.length || ''}
                    onChange={(e) => setNewItem({ ...newItem, length: Number(e.target.value) })}
                    style={inputStyle}
                    min={0}
                    step={100}
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <button
                onClick={addAccessory}
                style={{
                  padding: '12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✓ Ajouter cet accessoire
              </button>
            </div>
          )}

          {/* Message si aucun accessoire */}
          {formData.items.length === 0 && !showAddForm && (
            <div style={{
              padding: '30px',
              textAlign: 'center',
              color: '#94a3b8',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0 }}>Aucun accessoire configuré</p>
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
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>🛠️</p>
          <p style={{ margin: 0 }}>Accessoires désactivés pour cette structure</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Activez pour configurer</p>
        </div>
      )}
    </div>
  );
};
