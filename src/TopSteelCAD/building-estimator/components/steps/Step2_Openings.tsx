/**
 * Étape 2 : Configuration des ouvertures
 * Building Estimator - TopSteelCAD
 */

import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Step2OpeningsProps } from '../types';
import { OpeningType, WallType } from '../../types';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  inputStyle,
  selectStyle,
  buttonGroupStyle,
  buttonStyle,
  cardTitleStyle,
  tableStyle,
  thStyle,
  tdStyle,
  iconButtonStyle,
  emptyStateStyle
} from '../../styles/buildingEstimator.styles';

export const Step2_Openings: React.FC<Step2OpeningsProps> = ({
  openings,
  buildingDimensions,
  onAddOpening,
  onUpdateOpening,
  onDeleteOpening,
  onNext,
  onPrevious
}) => {
  const [newOpening, setNewOpening] = useState({
    type: OpeningType.DOOR,
    wall: WallType.FRONT,
    posX: 5000,
    posZ: 0,
    width: 3000,
    height: 4000
  });

  const handleAdd = () => {
    onAddOpening({
      id: uuid(),
      type: newOpening.type,
      wall: newOpening.wall,
      position: { x: newOpening.posX, z: newOpening.posZ },
      dimensions: { width: newOpening.width, height: newOpening.height },
      reference: `${newOpening.type === OpeningType.DOOR ? 'P' : 'F'}${openings.length + 1}`
    });
  };

  return (
    <div>
      {/* Formulaire d'ajout */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>➕ Ajouter une Ouverture</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Type</label>
            <select
              style={selectStyle}
              value={newOpening.type}
              onChange={(e) => setNewOpening({ ...newOpening, type: e.target.value as OpeningType })}
            >
              <option value={OpeningType.DOOR}>Porte</option>
              <option value={OpeningType.WINDOW}>Fenêtre</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Mur</label>
            <select
              style={selectStyle}
              value={newOpening.wall}
              onChange={(e) => setNewOpening({ ...newOpening, wall: e.target.value as WallType })}
            >
              <option value={WallType.FRONT}>Façade avant</option>
              <option value={WallType.BACK}>Façade arrière</option>
              <option value={WallType.LEFT}>Pignon gauche</option>
              <option value={WallType.RIGHT}>Pignon droit</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Position X (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={newOpening.posX}
              onChange={(e) => setNewOpening({ ...newOpening, posX: parseInt(e.target.value) })}
              min={0}
              max={buildingDimensions.length}
              step={100}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Position Z (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={newOpening.posZ}
              onChange={(e) => setNewOpening({ ...newOpening, posZ: parseInt(e.target.value) })}
              min={0}
              max={buildingDimensions.heightWall}
              step={100}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Largeur (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={newOpening.width}
              onChange={(e) => setNewOpening({ ...newOpening, width: parseInt(e.target.value) })}
              min={500}
              max={10000}
              step={100}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Hauteur (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={newOpening.height}
              onChange={(e) => setNewOpening({ ...newOpening, height: parseInt(e.target.value) })}
              min={500}
              max={10000}
              step={100}
            />
          </div>
        </div>

        <button style={buttonStyle('primary')} onClick={handleAdd}>
          ➕ Ajouter
        </button>
      </div>

      {/* Liste des ouvertures */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>📋 Ouvertures Définies ({openings.length})</h3>

        {openings.length === 0 ? (
          <div style={emptyStateStyle}>
            <p>Aucune ouverture définie</p>
            <p style={{ fontSize: '12px' }}>Ajoutez des portes ou fenêtres ci-dessus</p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Réf</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Mur</th>
                <th style={thStyle}>Position</th>
                <th style={thStyle}>Dimensions</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {openings.map((opening) => (
                <tr key={opening.id}>
                  <td style={tdStyle}>{opening.reference}</td>
                  <td style={tdStyle}>{opening.type === OpeningType.DOOR ? 'Porte' : 'Fenêtre'}</td>
                  <td style={tdStyle}>{opening.wall}</td>
                  <td style={tdStyle}>
                    X: {opening.position.x}mm, Z: {opening.position.z}mm
                  </td>
                  <td style={tdStyle}>
                    {opening.dimensions.width}×{opening.dimensions.height}mm
                  </td>
                  <td style={tdStyle}>
                    <button
                      style={{ ...iconButtonStyle, color: '#ef4444' }}
                      onClick={() => onDeleteOpening(opening.id)}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Navigation */}
      <div style={buttonGroupStyle}>
        <button style={buttonStyle('secondary')} onClick={onPrevious}>
          ← Retour
        </button>
        <button style={buttonStyle('primary')} onClick={onNext}>
          Suivant : Finitions →
        </button>
      </div>
    </div>
  );
};
