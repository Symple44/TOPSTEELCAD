/**
 * Étape 3 : Configuration des finitions
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { Step3FinishesProps } from '../types';
import { CladdingType, RoofingType } from '../../types';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  inputStyle,
  selectStyle,
  buttonGroupStyle,
  buttonStyle,
  cardTitleStyle
} from '../../styles/buildingEstimator.styles';

export const Step3_Finishes: React.FC<Step3FinishesProps> = ({
  finishes,
  onFinishesChange,
  onNext,
  onPrevious
}) => {
  return (
    <div>
      {/* Bardage */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>🏠 Bardage</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Type de bardage</label>
            <select
              style={selectStyle}
              value={finishes.cladding.type}
              onChange={(e) =>
                onFinishesChange({
                  cladding: { ...finishes.cladding, type: e.target.value as CladdingType }
                })
              }
            >
              <option value={CladdingType.SANDWICH_80MM}>Panneau sandwich 80mm</option>
              <option value={CladdingType.SANDWICH_100MM}>Panneau sandwich 100mm</option>
              <option value={CladdingType.SANDWICH_120MM}>Panneau sandwich 120mm</option>
              <option value={CladdingType.STEEL_PANEL_SINGLE}>Bac acier simple peau</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Couleur RAL</label>
            <select
              style={selectStyle}
              value={finishes.cladding.color}
              onChange={(e) =>
                onFinishesChange({
                  cladding: { ...finishes.cladding, color: e.target.value }
                })
              }
            >
              <option value="RAL 9002">RAL 9002 - Blanc gris</option>
              <option value="RAL 9006">RAL 9006 - Aluminium</option>
              <option value="RAL 7016">RAL 7016 - Gris anthracite</option>
              <option value="RAL 7035">RAL 7035 - Gris clair</option>
              <option value="RAL 5012">RAL 5012 - Bleu clair</option>
              <option value="RAL 6011">RAL 6011 - Vert réséda</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Épaisseur (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={finishes.cladding.thickness}
              onChange={(e) =>
                onFinishesChange({
                  cladding: { ...finishes.cladding, thickness: parseInt(e.target.value) }
                })
              }
              min={40}
              max={200}
              step={10}
            />
          </div>
        </div>
      </div>

      {/* Couverture */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>🏠 Couverture</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Type de couverture</label>
            <select
              style={selectStyle}
              value={finishes.roofing.type}
              onChange={(e) =>
                onFinishesChange({
                  roofing: { ...finishes.roofing, type: e.target.value as RoofingType }
                })
              }
            >
              <option value={RoofingType.STEEL_PANEL_075MM}>Bac acier 0.75mm</option>
              <option value={RoofingType.STEEL_PANEL_100MM}>Bac acier 1.00mm</option>
              <option value={RoofingType.SANDWICH_80MM}>Panneau sandwich 80mm</option>
              <option value={RoofingType.SANDWICH_100MM}>Panneau sandwich 100mm</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Couleur RAL</label>
            <select
              style={selectStyle}
              value={finishes.roofing.color}
              onChange={(e) =>
                onFinishesChange({
                  roofing: { ...finishes.roofing, color: e.target.value }
                })
              }
            >
              <option value="RAL 7016">RAL 7016 - Gris anthracite</option>
              <option value="RAL 8012">RAL 8012 - Rouge brun</option>
              <option value="RAL 3009">RAL 3009 - Rouge oxyde</option>
              <option value="RAL 6005">RAL 6005 - Vert mousse</option>
              <option value="RAL 9006">RAL 9006 - Aluminium</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Épaisseur (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={finishes.roofing.thickness}
              onChange={(e) =>
                onFinishesChange({
                  roofing: { ...finishes.roofing, thickness: parseInt(e.target.value) }
                })
              }
              min={40}
              max={200}
              step={10}
            />
          </div>
        </div>
      </div>

      {/* Habillage */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>🎨 Habillage</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Couleur accessoires</label>
            <select
              style={selectStyle}
              value={finishes.trim?.color}
              onChange={(e) =>
                onFinishesChange({
                  trim: { color: e.target.value }
                })
              }
            >
              <option value="RAL 9006">RAL 9006 - Aluminium</option>
              <option value="RAL 9002">RAL 9002 - Blanc gris</option>
              <option value="RAL 7016">RAL 7016 - Gris anthracite</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={buttonGroupStyle}>
        <button style={buttonStyle('secondary')} onClick={onPrevious}>
          ← Retour
        </button>
        <button style={buttonStyle('primary')} onClick={onNext}>
          Générer le bâtiment →
        </button>
      </div>
    </div>
  );
};
