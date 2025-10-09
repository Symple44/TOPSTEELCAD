/**
 * Éditeur d'ouvertures (portes, fenêtres, exutoires, etc.)
 * Building Estimator - TopSteelCAD
 */

import React, { useState } from 'react';
import {
  BuildingOpening,
  OpeningType,
  OpeningPosition,
  OpeningDimensions,
  OpeningFraming
} from '../types';
import { buttonStyle, inputStyle, labelStyle, formSectionStyle } from '../styles/buildingEstimator.styles';

export interface OpeningEditorProps {
  structureId: string;
  onAdd: (opening: BuildingOpening) => void;
  onUpdate: (opening: BuildingOpening) => void;
  onDelete: (openingId: string) => void;
  openings: BuildingOpening[];
  maxBays?: number; // Nombre de travées disponibles
}

// Données de configuration par type d'ouverture
const OPENING_PRESETS: Record<OpeningType, {
  label: string;
  icon: string;
  category: 'vertical' | 'roof';
  defaultDimensions: OpeningDimensions;
  defaultFraming: OpeningFraming;
  positions: OpeningPosition[];
}> = {
  [OpeningType.PEDESTRIAN_DOOR]: {
    label: 'Porte piétonne',
    icon: '🚪',
    category: 'vertical',
    defaultDimensions: { width: 1000, height: 2100 },
    defaultFraming: { verticalPosts: true, lintel: true, sill: true, cheveture: false },
    positions: [OpeningPosition.LONG_PAN_FRONT, OpeningPosition.LONG_PAN_BACK, OpeningPosition.GABLE_LEFT, OpeningPosition.GABLE_RIGHT]
  },
  [OpeningType.SECTIONAL_DOOR]: {
    label: 'Porte sectionnelle',
    icon: '🏢',
    category: 'vertical',
    defaultDimensions: { width: 4000, height: 4000 },
    defaultFraming: { verticalPosts: true, lintel: true, sill: false, cheveture: false },
    positions: [OpeningPosition.LONG_PAN_FRONT, OpeningPosition.LONG_PAN_BACK, OpeningPosition.GABLE_LEFT, OpeningPosition.GABLE_RIGHT]
  },
  [OpeningType.ROLLER_SHUTTER]: {
    label: 'Rideau métallique',
    icon: '🎚️',
    category: 'vertical',
    defaultDimensions: { width: 3000, height: 3000 },
    defaultFraming: { verticalPosts: true, lintel: true, sill: false, cheveture: false },
    positions: [OpeningPosition.LONG_PAN_FRONT, OpeningPosition.LONG_PAN_BACK, OpeningPosition.GABLE_LEFT, OpeningPosition.GABLE_RIGHT]
  },
  [OpeningType.WINDOW]: {
    label: 'Fenêtre',
    icon: '🪟',
    category: 'vertical',
    defaultDimensions: { width: 1200, height: 1200 },
    defaultFraming: { verticalPosts: true, lintel: true, sill: true, cheveture: false },
    positions: [OpeningPosition.LONG_PAN_FRONT, OpeningPosition.LONG_PAN_BACK, OpeningPosition.GABLE_LEFT, OpeningPosition.GABLE_RIGHT]
  },
  [OpeningType.GLAZED_BAY]: {
    label: 'Baie vitrée',
    icon: '🖼️',
    category: 'vertical',
    defaultDimensions: { width: 2400, height: 2200 },
    defaultFraming: { verticalPosts: true, lintel: true, sill: true, cheveture: false },
    positions: [OpeningPosition.LONG_PAN_FRONT, OpeningPosition.LONG_PAN_BACK, OpeningPosition.GABLE_LEFT, OpeningPosition.GABLE_RIGHT]
  },
  [OpeningType.SMOKE_VENT]: {
    label: 'Exutoire de fumée',
    icon: '💨',
    category: 'roof',
    defaultDimensions: { width: 2000, height: 2000 },
    defaultFraming: { verticalPosts: false, lintel: false, sill: false, cheveture: true },
    positions: [OpeningPosition.ROOF]
  },
  [OpeningType.ROOF_WINDOW]: {
    label: 'Fenêtre de toit',
    icon: '🔲',
    category: 'roof',
    defaultDimensions: { width: 800, height: 1200 },
    defaultFraming: { verticalPosts: false, lintel: false, sill: false, cheveture: true },
    positions: [OpeningPosition.ROOF]
  },
  [OpeningType.SKYLIGHT]: {
    label: 'Lanterneau',
    icon: '☀️',
    category: 'roof',
    defaultDimensions: { width: 3000, height: 3000 },
    defaultFraming: { verticalPosts: false, lintel: false, sill: false, cheveture: true },
    positions: [OpeningPosition.ROOF]
  }
};

const POSITION_LABELS: Record<OpeningPosition, string> = {
  [OpeningPosition.LONG_PAN_FRONT]: 'Long-pan avant',
  [OpeningPosition.LONG_PAN_BACK]: 'Long-pan arrière',
  [OpeningPosition.GABLE_LEFT]: 'Pignon gauche',
  [OpeningPosition.GABLE_RIGHT]: 'Pignon droit',
  [OpeningPosition.ROOF]: 'Toiture'
};

export const OpeningEditor: React.FC<OpeningEditorProps> = ({
  structureId,
  onAdd,
  onUpdate,
  onDelete,
  openings,
  maxBays = 10
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // État du formulaire
  const [formData, setFormData] = useState<{
    type: OpeningType;
    position: OpeningPosition;
    name: string;
    dimensions: OpeningDimensions;
    framing: OpeningFraming;
    bayIndex?: number;
    offsetX?: number;
    offsetY: number;
    offsetZ?: number;
  }>({
    type: OpeningType.PEDESTRIAN_DOOR,
    position: OpeningPosition.LONG_PAN_FRONT,
    name: '',
    dimensions: OPENING_PRESETS[OpeningType.PEDESTRIAN_DOOR].defaultDimensions,
    framing: OPENING_PRESETS[OpeningType.PEDESTRIAN_DOOR].defaultFraming,
    offsetY: 0
  });

  // Handler: changement de type d'ouverture
  const handleTypeChange = (type: OpeningType) => {
    const preset = OPENING_PRESETS[type];
    setFormData({
      ...formData,
      type,
      dimensions: preset.defaultDimensions,
      framing: preset.defaultFraming,
      position: preset.positions[0], // Première position valide
      name: `${preset.label} ${openings.length + 1}`
    });
  };

  // Handler: démarrer l'ajout d'une nouvelle ouverture
  const startAdding = () => {
    const preset = OPENING_PRESETS[OpeningType.PEDESTRIAN_DOOR];
    setFormData({
      type: OpeningType.PEDESTRIAN_DOOR,
      position: OpeningPosition.LONG_PAN_FRONT,
      name: `${preset.label} ${openings.length + 1}`,
      dimensions: preset.defaultDimensions,
      framing: preset.defaultFraming,
      offsetY: 0
    });
    setIsAdding(true);
    setEditingId(null);
  };

  // Handler: annuler l'édition
  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  // Handler: sauvegarder l'ouverture
  const saveOpening = () => {
    const opening: BuildingOpening = {
      id: editingId || `opening-${Date.now()}`,
      name: formData.name,
      type: formData.type,
      position: formData.position,
      structureId: structureId === 'main' ? undefined : structureId,
      dimensions: formData.dimensions,
      framing: formData.framing,
      offsetY: formData.offsetY,
      bayIndex: formData.bayIndex,
      offsetX: formData.offsetX,
      offsetZ: formData.offsetZ
    };

    if (editingId) {
      onUpdate(opening);
    } else {
      onAdd(opening);
    }

    setIsAdding(false);
    setEditingId(null);
  };

  // Handler: éditer une ouverture existante
  const startEditing = (opening: BuildingOpening) => {
    setFormData({
      type: opening.type,
      position: opening.position,
      name: opening.name,
      dimensions: opening.dimensions,
      framing: opening.framing,
      bayIndex: opening.bayIndex,
      offsetX: opening.offsetX,
      offsetY: opening.offsetY,
      offsetZ: opening.offsetZ
    });
    setEditingId(opening.id);
    setIsAdding(false);
  };

  const preset = OPENING_PRESETS[formData.type];
  const isVertical = preset.category === 'vertical';

  return (
    <div style={formSectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Ouvertures</h3>
        <button onClick={startAdding} style={buttonStyle('primary')} disabled={isAdding || editingId !== null}>
          ➕ Ajouter une ouverture
        </button>
      </div>

      {/* Formulaire d'ajout/édition */}
      {(isAdding || editingId) && (
        <div style={{
          padding: '20px',
          background: '#f8fafc',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: 0 }}>{editingId ? 'Modifier l\'ouverture' : 'Nouvelle ouverture'}</h4>

          {/* Sélection du type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Type d'ouverture</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
              {Object.entries(OPENING_PRESETS).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type as OpeningType)}
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
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{config.icon}</span>
                  <span style={{ fontWeight: formData.type === type ? '600' : '400' }}>{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nom */}
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Nom de l'ouverture</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              placeholder="Ex: Porte principale"
            />
          </div>

          {/* Position */}
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Position</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value as OpeningPosition })}
              style={inputStyle}
            >
              {preset.positions.map(pos => (
                <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
              ))}
            </select>
          </div>

          {/* Positionnement précis */}
          {isVertical && (formData.position === OpeningPosition.LONG_PAN_FRONT || formData.position === OpeningPosition.LONG_PAN_BACK) && (
            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>Travée (optionnel)</label>
              <select
                value={formData.bayIndex ?? ''}
                onChange={(e) => setFormData({ ...formData, bayIndex: e.target.value ? Number(e.target.value) : undefined })}
                style={inputStyle}
              >
                <option value="">Aucune (position libre)</option>
                {Array.from({ length: maxBays }, (_, i) => (
                  <option key={i} value={i}>Travée {i + 1}</option>
                ))}
              </select>
            </div>
          )}

          {isVertical && (formData.position === OpeningPosition.GABLE_LEFT || formData.position === OpeningPosition.GABLE_RIGHT) && (
            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>Position sur pignon (mm)</label>
              <input
                type="number"
                value={formData.offsetZ ?? 0}
                onChange={(e) => setFormData({ ...formData, offsetZ: Number(e.target.value) })}
                style={inputStyle}
                step={100}
              />
            </div>
          )}

          {!isVertical && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Travée (optionnel)</label>
                <select
                  value={formData.bayIndex ?? ''}
                  onChange={(e) => setFormData({ ...formData, bayIndex: e.target.value ? Number(e.target.value) : undefined })}
                  style={inputStyle}
                >
                  <option value="">Centre du toit</option>
                  {Array.from({ length: maxBays }, (_, i) => (
                    <option key={i} value={i}>Travée {i + 1}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Position largeur (mm)</label>
                <input
                  type="number"
                  value={formData.offsetZ ?? 0}
                  onChange={(e) => setFormData({ ...formData, offsetZ: Number(e.target.value) })}
                  style={inputStyle}
                  step={100}
                />
              </div>
            </>
          )}

          {/* Dimensions */}
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Dimensions (mm)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.85rem' }}>Largeur</label>
                <input
                  type="number"
                  value={formData.dimensions.width}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, width: Number(e.target.value) }
                  })}
                  style={inputStyle}
                  step={100}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.85rem' }}>Hauteur</label>
                <input
                  type="number"
                  value={formData.dimensions.height}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, height: Number(e.target.value) }
                  })}
                  style={inputStyle}
                  step={100}
                />
              </div>
            </div>
          </div>

          {/* Hauteur au sol (pour ouvertures verticales) */}
          {isVertical && (
            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>Hauteur au sol (mm)</label>
              <input
                type="number"
                value={formData.offsetY}
                onChange={(e) => setFormData({ ...formData, offsetY: Number(e.target.value) })}
                style={inputStyle}
                step={100}
              />
            </div>
          )}

          {/* Ossature secondaire */}
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Ossature secondaire</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isVertical && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.framing.verticalPosts}
                      onChange={(e) => setFormData({
                        ...formData,
                        framing: { ...formData.framing, verticalPosts: e.target.checked }
                      })}
                    />
                    <span>Potelets verticaux</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.framing.lintel}
                      onChange={(e) => setFormData({
                        ...formData,
                        framing: { ...formData.framing, lintel: e.target.checked }
                      })}
                    />
                    <span>Linteau</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.framing.sill}
                      onChange={(e) => setFormData({
                        ...formData,
                        framing: { ...formData.framing, sill: e.target.checked }
                      })}
                    />
                    <span>Seuil/Appui</span>
                  </label>
                </>
              )}
              {!isVertical && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.framing.cheveture}
                    onChange={(e) => setFormData({
                      ...formData,
                      framing: { ...formData.framing, cheveture: e.target.checked }
                    })}
                  />
                  <span>Chevêtre (pannes de bordure)</span>
                </label>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={saveOpening} style={buttonStyle('primary')}>
              {editingId ? '✓ Mettre à jour' : '✓ Ajouter'}
            </button>
            <button onClick={cancelEdit} style={buttonStyle('secondary')}>
              ✕ Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des ouvertures */}
      {openings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4>Ouvertures configurées ({openings.length})</h4>
          {openings.map((opening) => {
            const config = OPENING_PRESETS[opening.type];
            return (
              <div
                key={opening.id}
                style={{
                  padding: '15px',
                  background: editingId === opening.id ? '#eff6ff' : '#fff',
                  border: editingId === opening.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
                    <strong>{opening.name}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {config.label} · {POSITION_LABELS[opening.position]} · {opening.dimensions.width}×{opening.dimensions.height}mm
                    {opening.bayIndex !== undefined && ` · Travée ${opening.bayIndex + 1}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => startEditing(opening)}
                    style={{
                      ...buttonStyle('secondary'),
                      padding: '8px 16px',
                      fontSize: '0.9rem'
                    }}
                    disabled={isAdding || (editingId !== null && editingId !== opening.id)}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer "${opening.name}" ?`)) {
                        onDelete(opening.id);
                      }
                    }}
                    style={{
                      ...buttonStyle('secondary'),
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      color: '#dc2626',
                      borderColor: '#dc2626'
                    }}
                    disabled={isAdding || editingId !== null}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openings.length === 0 && !isAdding && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#94a3b8',
          border: '2px dashed #cbd5e1',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>🚪</p>
          <p style={{ margin: 0 }}>Aucune ouverture configurée</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Cliquez sur "Ajouter une ouverture" pour commencer</p>
        </div>
      )}
    </div>
  );
};
