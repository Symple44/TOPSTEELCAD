/**
 * Gestionnaire d'extensions de bâtiment
 * Building Estimator - TopSteelCAD
 */

import React, { useState } from 'react';
import { BuildingExtension, BuildingType, ExtensionAttachmentType, BuildingDimensions, BuildingParameters } from '../types';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  inputStyle,
  selectStyle,
  buttonStyle,
  cardTitleStyle
} from '../styles/buildingEstimator.styles';

export interface ExtensionsManagerProps {
  extensions: BuildingExtension[];
  buildingLength: number;
  postSpacing: number;
  defaultParameters: BuildingParameters;
  onAdd: (extension: BuildingExtension) => void;
  onUpdate: (id: string, extension: Partial<BuildingExtension>) => void;
  onDelete: (id: string) => void;
}

export const ExtensionsManager: React.FC<ExtensionsManagerProps> = ({
  extensions,
  buildingLength,
  postSpacing,
  defaultParameters,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<BuildingExtension>>({
    type: BuildingType.MONO_PENTE,
    attachmentType: ExtensionAttachmentType.LONG_PAN,
    side: 'front',
    dimensions: {
      length: 5000,
      width: 5000,
      heightWall: 3000,
      slope: 10
    },
    parameters: defaultParameters
  });

  // Calculer nombre de travées
  const numberOfBays = Math.max(1, Math.floor(buildingLength / postSpacing));

  const handleAdd = () => {
    const extension: BuildingExtension = {
      id: `ext-${Date.now()}`,
      name: `Extension ${extensions.length + 1}`,
      type: formData.type || BuildingType.MONO_PENTE,
      attachmentType: formData.attachmentType || ExtensionAttachmentType.LONG_PAN,
      side: formData.side || 'front',
      bayIndex: formData.bayIndex,
      dimensions: formData.dimensions as BuildingDimensions,
      parameters: formData.parameters || defaultParameters
    };

    onAdd(extension);
    setShowForm(false);
  };

  return (
    <div style={formSectionStyle}>
      <h3 style={cardTitleStyle}>➕ Extensions</h3>

      {/* Liste des extensions */}
      {extensions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {extensions.map((ext) => (
            <div key={ext.id} style={{
              padding: '12px',
              marginBottom: '8px',
              background: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{ext.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                    Type: {ext.type} • Attachement: {ext.attachmentType} • Côté: {ext.side}
                    {ext.attachmentType === ExtensionAttachmentType.TRAVEE && ` • Travée #${(ext.bayIndex || 0) + 1}`}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(ext.id)}
                  style={{
                    ...buttonStyle('danger'),
                    padding: '6px 12px',
                    fontSize: '0.85rem'
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton ajouter */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={buttonStyle('secondary')}
        >
          ➕ Ajouter une extension
        </button>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <div style={{
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '16px', color: '#1e293b' }}>
            Nouvelle extension
          </h4>

          <div style={formRowStyle}>
            {/* Type d'extension */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Type d'extension</label>
              <select
                style={selectStyle}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as BuildingType })}
              >
                <option value={BuildingType.MONO_PENTE}>🔻 Monopente</option>
                <option value={BuildingType.BI_PENTE}>🏠 Bipente</option>
                <option value={BuildingType.AUVENT}>⛱️ Auvent</option>
              </select>
            </div>

            {/* Type d'attachement */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Type d'attachement</label>
              <select
                style={selectStyle}
                value={formData.attachmentType}
                onChange={(e) => setFormData({ ...formData, attachmentType: e.target.value as ExtensionAttachmentType })}
              >
                <option value={ExtensionAttachmentType.LONG_PAN}>📏 Long-pan (toute la longueur)</option>
                <option value={ExtensionAttachmentType.TRAVEE}>🔲 Travée spécifique</option>
                <option value={ExtensionAttachmentType.PIGNON_GAUCHE}>◀️ Pignon gauche</option>
                <option value={ExtensionAttachmentType.PIGNON_DROIT}>▶️ Pignon droit</option>
              </select>
            </div>
          </div>

          <div style={formRowStyle}>
            {/* Côté */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Côté d'attachement</label>
              <select
                style={selectStyle}
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value as 'front' | 'back' | 'left' | 'right' })}
              >
                <option value="front">Avant (Z=0)</option>
                <option value="back">Arrière (Z=largeur)</option>
                <option value="left">Gauche (X=0)</option>
                <option value="right">Droite (X=longueur)</option>
              </select>
            </div>

            {/* Travée (si applicable) */}
            {formData.attachmentType === ExtensionAttachmentType.TRAVEE && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>Numéro de travée</label>
                <select
                  style={selectStyle}
                  value={formData.bayIndex || 0}
                  onChange={(e) => setFormData({ ...formData, bayIndex: parseInt(e.target.value) })}
                >
                  {Array.from({ length: numberOfBays }, (_, i) => (
                    <option key={i} value={i}>Travée #{i + 1}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={formRowStyle}>
            {/* Largeur extension */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Largeur extension (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.dimensions?.width || 5000}
                onChange={(e) => setFormData({
                  ...formData,
                  dimensions: { ...formData.dimensions!, width: parseInt(e.target.value) }
                })}
                min={3000}
                max={30000}
                step={500}
              />
            </div>

            {/* Hauteur au mur */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Hauteur au mur (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.dimensions?.heightWall || 3000}
                onChange={(e) => setFormData({
                  ...formData,
                  dimensions: { ...formData.dimensions!, heightWall: parseInt(e.target.value) }
                })}
                min={2500}
                max={10000}
                step={500}
              />
            </div>

            {/* Pente */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Pente (%)</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.dimensions?.slope || 10}
                onChange={(e) => setFormData({
                  ...formData,
                  dimensions: { ...formData.dimensions!, slope: parseInt(e.target.value) }
                })}
                min={3}
                max={50}
                step={1}
              />
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleAdd}
              style={buttonStyle('primary')}
            >
              ✓ Ajouter
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={buttonStyle('secondary')}
            >
              ✗ Annuler
            </button>
          </div>
        </div>
      )}

      {extensions.length === 0 && !showForm && (
        <p style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic', marginTop: '10px' }}>
          Aucune extension ajoutée. Les extensions permettent d'ajouter des bâtiments perpendiculaires (monopente, bipente, auvent).
        </p>
      )}
    </div>
  );
};
