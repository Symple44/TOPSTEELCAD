/**
 * Gestionnaire d'extensions avec système d'onglets
 * Building Estimator - TopSteelCAD
 */

import React, { useState } from 'react';
import { BuildingExtension, BuildingType, ExtensionAttachmentType, BuildingDimensions, BuildingParameters } from '../types';
import { ExtensionPositionSelector } from './ExtensionPositionSelector';
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

export interface ExtensionsManagerTabsProps {
  extensions: BuildingExtension[];
  buildingLength: number;
  buildingWidth: number;
  postSpacing: number;
  defaultParameters: BuildingParameters;
  onAdd: (extension: BuildingExtension) => void;
  onUpdate: (id: string, extension: Partial<BuildingExtension>) => void;
  onDelete: (id: string) => void;
  onPreviewChange?: (extension: Partial<BuildingExtension> | null) => void; // Pour preview temps réel
}

export const ExtensionsManagerTabs: React.FC<ExtensionsManagerTabsProps> = ({
  extensions,
  buildingLength,
  buildingWidth,
  postSpacing,
  defaultParameters,
  onAdd,
  onUpdate,
  onDelete,
  onPreviewChange
}) => {
  const [activeTab, setActiveTab] = useState<number>(extensions.length > 0 ? 0 : -1);
  const [isAdding, setIsAdding] = useState(false);

  // État pour la nouvelle extension
  const [newExtension, setNewExtension] = useState<Partial<BuildingExtension>>({
    type: BuildingType.MONO_PENTE,
    attachmentType: ExtensionAttachmentType.LONG_PAN,
    side: 'front',
    bayIndex: 0,
    parentId: undefined, // Attaché au bâtiment principal par défaut
    dimensions: {
      length: buildingLength,
      width: 5000,
      heightWall: 3000,
      slope: 10
    },
    parameters: defaultParameters,
    reversedSlope: false,
    followParentDimensions: true
  });

  // Prévisualisation en temps réel de l'extension en cours de création
  React.useEffect(() => {
    if (onPreviewChange) {
      if (isAdding) {
        onPreviewChange(newExtension);
      } else {
        onPreviewChange(null);
      }
    }
  }, [isAdding, newExtension, onPreviewChange]);

  const handleAddExtension = () => {
    const extension: BuildingExtension = {
      id: `ext-${Date.now()}`,
      name: `Extension ${extensions.length + 1}`,
      type: newExtension.type || BuildingType.MONO_PENTE,
      attachmentType: newExtension.attachmentType || ExtensionAttachmentType.LONG_PAN,
      side: newExtension.side || 'front',
      bayIndex: newExtension.bayIndex,
      parentId: newExtension.parentId, // ID du parent (undefined = bâtiment principal)
      dimensions: newExtension.dimensions as BuildingDimensions,
      parameters: newExtension.parameters || defaultParameters,
      reversedSlope: newExtension.reversedSlope || false,
      followParentDimensions: newExtension.followParentDimensions !== false // true par défaut
    };

    onAdd(extension);
    setActiveTab(extensions.length); // Activer le nouvel onglet
    setIsAdding(false);

    // Réinitialiser le formulaire
    setNewExtension({
      type: BuildingType.MONO_PENTE,
      attachmentType: ExtensionAttachmentType.LONG_PAN,
      side: 'front',
      bayIndex: 0,
      parentId: undefined,
      dimensions: {
        length: buildingLength,
        width: 5000,
        heightWall: 3000,
        slope: 10
      },
      parameters: defaultParameters,
      reversedSlope: false,
      followParentDimensions: true
    });
  };

  const renderExtensionForm = (
    extension: Partial<BuildingExtension> | BuildingExtension,
    isNew: boolean = false
  ) => {
    const updateField = (field: string, value: any) => {
      if (isNew) {
        setNewExtension({ ...newExtension, [field]: value });
      } else {
        onUpdate((extension as BuildingExtension).id, { [field]: value });
      }
    };

    const updateDimension = (field: string, value: number) => {
      if (isNew) {
        setNewExtension({
          ...newExtension,
          dimensions: { ...newExtension.dimensions!, [field]: value }
        });
      } else {
        onUpdate((extension as BuildingExtension).id, {
          dimensions: { ...(extension as BuildingExtension).dimensions, [field]: value }
        });
      }
    };

    // Déterminer le nom du parent
    const parentName = extension.parentId
      ? (extensions.find(e => e.id === extension.parentId)?.name || 'Extension parent')
      : 'Bâtiment principal';

    return (
      <div>
        {/* Configuration de l'extension */}
        <div style={formSectionStyle}>
          <h4 style={{ ...cardTitleStyle, fontSize: '1rem', marginTop: 0 }}>⚙️ Configuration</h4>

          <div style={formRowStyle}>
            {/* Sélection du parent */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Attacher à</label>
              <select
                style={selectStyle}
                value={extension.parentId || ''}
                onChange={(e) => updateField('parentId', e.target.value || undefined)}
              >
                <option value="">🏢 Bâtiment principal</option>
                {extensions.filter(ext => ext.id !== (extension as BuildingExtension).id).map((ext) => (
                  <option key={ext.id} value={ext.id}>
                    ➕ {ext.name} ({ext.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Type d'extension */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Type d'extension</label>
              <select
                style={selectStyle}
                value={extension.type}
                onChange={(e) => updateField('type', e.target.value as BuildingType)}
              >
                <option value={BuildingType.MONO_PENTE}>🔻 Monopente</option>
                <option value={BuildingType.BI_PENTE}>🏠 Bipente</option>
                <option value={BuildingType.AUVENT}>⛱️ Auvent</option>
              </select>
            </div>

            {/* Largeur extension */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Largeur extension (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={extension.dimensions?.width || 5000}
                onChange={(e) => updateDimension('width', parseInt(e.target.value))}
                min={3000}
                max={30000}
                step={500}
              />
            </div>
          </div>

          <div style={formRowStyle}>
            {/* Hauteur au mur */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Hauteur au mur (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={extension.dimensions?.heightWall || 3000}
                onChange={(e) => updateDimension('heightWall', parseInt(e.target.value))}
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
                value={extension.dimensions?.slope || 10}
                onChange={(e) => updateDimension('slope', parseInt(e.target.value))}
                min={3}
                max={50}
                step={1}
              />
            </div>
          </div>

          {/* Sens de la pente */}
          {(extension.type === BuildingType.MONO_PENTE || extension.type === BuildingType.AUVENT) && (
            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={extension.reversedSlope || false}
                    onChange={(e) => updateField('reversedSlope', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Inverser la pente (bas côté extérieur)
                </label>
              </div>
            </div>
          )}

          {/* Suivre dimensions parent (Extensions attachées) */}
          {(extension.attachmentType === ExtensionAttachmentType.LONG_PAN ||
            extension.attachmentType === ExtensionAttachmentType.TRAVEE ||
            extension.attachmentType === ExtensionAttachmentType.PIGNON_GAUCHE ||
            extension.attachmentType === ExtensionAttachmentType.PIGNON_DROIT) && (
            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={extension.followParentDimensions !== false}
                    onChange={(e) => updateField('followParentDimensions', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Suivre automatiquement les dimensions du parent
                </label>
                <small style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', marginLeft: '26px' }}>
                  {extension.attachmentType === ExtensionAttachmentType.PIGNON_GAUCHE || extension.attachmentType === ExtensionAttachmentType.PIGNON_DROIT
                    ? "Si activé, l'extension s'adaptera automatiquement aux modifications de largeur du parent"
                    : "Si activé, l'extension s'adaptera automatiquement aux modifications de longueur/entraxe du parent"}
                </small>
              </div>
            </div>
          )}
        </div>

        {/* Sélecteur de position visuel */}
        <ExtensionPositionSelector
          buildingLength={buildingLength}
          buildingWidth={buildingWidth}
          postSpacing={postSpacing}
          selectedSide={extension.side || 'front'}
          selectedAttachmentType={extension.attachmentType || ExtensionAttachmentType.LONG_PAN}
          selectedBayIndex={extension.bayIndex}
          parentName={parentName}
          onSideChange={(side) => updateField('side', side)}
          onAttachmentTypeChange={(type) => updateField('attachmentType', type)}
          onBayIndexChange={(index) => updateField('bayIndex', index)}
        />

        {/* Boutons d'action */}
        {isNew ? (
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={handleAddExtension}
              style={buttonStyle('primary')}
            >
              ✓ Ajouter l'extension
            </button>
            <button
              onClick={() => setIsAdding(false)}
              style={buttonStyle('secondary')}
            >
              ✗ Annuler
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => onDelete((extension as BuildingExtension).id)}
              style={buttonStyle('danger')}
            >
              🗑️ Supprimer cette extension
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={formSectionStyle}>
      <h3 style={cardTitleStyle}>➕ Extensions du Bâtiment</h3>

      {/* Onglets */}
      {extensions.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '2px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {extensions.map((ext, index) => {
            // Déterminer la profondeur et l'icône
            let depth = 0;
            let parentName = '🏢';
            let currentParentId = ext.parentId;

            while (currentParentId) {
              depth++;
              const parent = extensions.find(e => e.id === currentParentId);
              if (parent) {
                parentName = parent.name || `Extension ${extensions.indexOf(parent) + 1}`;
                currentParentId = parent.parentId;
              } else {
                break;
              }
            }

            // Icône selon la profondeur
            const depthIcon = depth === 0 ? '🏗️' : depth === 1 ? '➕' : depth === 2 ? '⊕' : '⊞';
            const indent = '  '.repeat(depth);

            return (
              <button
                key={ext.id}
                onClick={() => {
                  setActiveTab(index);
                  setIsAdding(false);
                }}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: activeTab === index ? '3px solid #3b82f6' : '3px solid transparent',
                  background: activeTab === index ? '#eff6ff' : 'transparent',
                  color: activeTab === index ? '#1e40af' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: activeTab === index ? '600' : '400',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                title={ext.parentId ? `Attachée à: ${parentName}` : 'Attachée au bâtiment principal'}
              >
                {indent}{depthIcon} {ext.name || `Extension ${index + 1}`}
              </button>
            );
          })}
          {isAdding && (
            <button
              onClick={() => setActiveTab(-1)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: '3px solid #10b981',
                background: '#f0fdf4',
                color: '#059669',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              ➕ Nouvelle extension
            </button>
          )}
        </div>
      )}

      {/* Contenu de l'onglet actif */}
      {extensions.length === 0 && !isAdding ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '2px dashed #cbd5e1'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏗️</div>
          <p style={{ fontSize: '1rem', color: '#475569', marginBottom: '20px' }}>
            Aucune extension ajoutée
          </p>
          <button
            onClick={() => setIsAdding(true)}
            style={buttonStyle('primary')}
          >
            ➕ Ajouter la première extension
          </button>
        </div>
      ) : isAdding ? (
        renderExtensionForm(newExtension, true)
      ) : (
        <>
          {activeTab >= 0 && activeTab < extensions.length && renderExtensionForm(extensions[activeTab])}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                ...buttonStyle('secondary'),
                marginTop: '20px',
                width: '100%'
              }}
            >
              ➕ Ajouter une nouvelle extension
            </button>
          )}
        </>
      )}
    </div>
  );
};
