/**
 * Éditeur de configuration de panneaux solaires
 * Pour structures type Ombrière Photovoltaïque
 * Building Estimator - TopSteelCAD
 */

import React, { useEffect, useState } from 'react';
import { SolarArrayConfig, COMMON_SOLAR_PANELS } from '../types/ombriere.types';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  inputStyle,
  selectStyle,
  cardTitleStyle
} from '../styles/buildingEstimator.styles';
import {
  calculateOptimalLayout,
  calculateElementPositions,
  LayoutElement,
  LayoutConstraints,
  LayoutOptions
} from '../utils/genericLayoutEngine';
import {
  calculateAdvancedLayout,
  LayoutSurface,
  openingsToObstacles,
  AdvancedLayoutResult
} from '../utils/advancedLayoutEngine';

interface SolarArrayEditorProps {
  structureId: string;
  config?: SolarArrayConfig;
  onChange: (config: SolarArrayConfig) => void;
  buildingLength: number;  // Longueur totale du bâtiment (mm)
  buildingWidth: number;   // Largeur totale du bâtiment (mm)
  openings?: Array<{       // Ouvertures existantes sur cette structure
    id: string;
    position: { x: number; z: number };
    dimensions: { width: number; height: number };
  }>;
}

export const SolarArrayEditor: React.FC<SolarArrayEditorProps> = ({
  structureId,
  config,
  onChange,
  buildingLength,
  buildingWidth,
  openings = []
}) => {
  // Configuration par défaut
  const defaultConfig: SolarArrayConfig = {
    panel: COMMON_SOLAR_PANELS['longi-540w'],
    orientation: 'landscape',
    rows: 4,
    columns: 20,
    rowSpacing: 100,
    columnSpacing: 50,
    tilt: 15,
    azimuth: 180,
    antiReflectiveCoating: true,
    hailResistance: true,
    autoLayout: true  // Activer le calepinage automatique par défaut
  };

  const currentConfig = config || defaultConfig;
  const [autoLayout, setAutoLayout] = useState(currentConfig.autoLayout ?? true);

  // Recalculer le calepinage automatiquement quand les paramètres changent
  useEffect(() => {
    if (!autoLayout) return;

    // Définir l'élément à placer
    const element: LayoutElement = {
      width: currentConfig.panel.width,
      height: currentConfig.panel.height,
      weight: currentConfig.panel.weight,
      reference: currentConfig.panel.model
    };

    // Définir les contraintes (marges de sécurité pour ombrière)
    const constraints: LayoutConstraints = {
      minRowSpacing: 50,              // Espacement minimal entre rangées
      minColumnSpacing: 30,            // Espacement minimal entre colonnes
      recommendedRowSpacing: 100,      // Espacement recommandé entre rangées
      recommendedColumnSpacing: 50,    // Espacement recommandé entre colonnes
      edgeMarginLongitudinal: 500,     // Marge avant/arrière (500mm)
      edgeMarginTransverse: 300,       // Marge gauche/droite (300mm)
      allowLandscape: true,
      allowPortrait: true
    };

    // Options de calcul
    const options: LayoutOptions = {
      orientation: currentConfig.orientation || 'auto',
      optimizeFor: 'quantity',  // Maximiser le nombre de panneaux
      useRecommendedSpacing: true,
      alignmentMode: 'center'
    };

    // Si des ouvertures existent, utiliser le calepinage avancé
    if (openings.length > 0) {
      // Convertir les ouvertures en obstacles
      const obstacles = openingsToObstacles(openings, 100); // 100mm de marge autour des ouvertures

      // Créer la surface rectangulaire avec obstacles
      const surface: LayoutSurface = {
        id: structureId,
        type: 'rectangular',
        bounds: {
          x: 0,
          z: 0,
          width: buildingLength,
          height: buildingWidth
        },
        obstacles
      };

      // Calculer le calepinage avancé (multi-zones)
      const advancedResult = calculateAdvancedLayout(
        [surface],
        element,
        constraints,
        options
      );

      // Extraire toutes les positions des éléments de toutes les zones
      const allElementPositions = advancedResult.zones.flatMap(zone => zone.elements || []);

      // Convertir en format compatible
      const firstZone = advancedResult.zones[0];
      const layout = firstZone?.layout || {
        rows: 0,
        columns: 0,
        orientation: 'landscape' as const,
        rowSpacing: 100,
        columnSpacing: 50,
        totalElements: advancedResult.totalElements,
        totalPower: 0,
        coverageRatio: advancedResult.coverageRatio,
        usedLength: 0,
        usedWidth: 0,
        marginFront: 500,
        marginBack: 500,
        marginLeft: 300,
        marginRight: 300,
        score: 0
      };

      // Mettre à jour la configuration avec les résultats du calepinage avancé
      onChange({
        ...currentConfig,
        orientation: layout.orientation,
        rows: Math.ceil(Math.sqrt(advancedResult.totalElements)), // Approximation
        columns: Math.ceil(Math.sqrt(advancedResult.totalElements)),
        rowSpacing: layout.rowSpacing,
        columnSpacing: layout.columnSpacing,
        autoLayout: true,
        layout: {
          ...layout,
          elementPositions: allElementPositions,
          totalElements: advancedResult.totalElements,
          coverageRatio: advancedResult.coverageRatio,
          advancedResult // Stocker le résultat complet pour utilisation dans le viewer 3D
        } as any
      });
    } else {
      // Pas d'ouvertures : utiliser le calepinage simple
      const layout = calculateOptimalLayout(
        buildingLength,
        buildingWidth,
        element,
        constraints,
        options
      );

      // Mettre à jour la configuration avec les résultats
      onChange({
        ...currentConfig,
        orientation: layout.orientation,
        rows: layout.rows,
        columns: layout.columns,
        rowSpacing: layout.rowSpacing,
        columnSpacing: layout.columnSpacing,
        autoLayout: true,
        layout: {
          ...layout,
          elementPositions: calculateElementPositions(layout, element)
        }
      });
    }
  }, [
    buildingLength,
    buildingWidth,
    currentConfig.panel,
    currentConfig.orientation,
    autoLayout,
    openings
  ]);

  // Calculer métriques
  const totalPanels = currentConfig.rows * currentConfig.columns;
  const totalPowerKwc = (totalPanels * currentConfig.panel.power) / 1000;
  const panelAreaM2 = (currentConfig.panel.width * currentConfig.panel.height) / 1e6;
  const totalAreaM2 = totalPanels * panelAreaM2;

  // Estimation production annuelle (simplifiée)
  const estimatedProduction = totalPowerKwc * 1100; // ~1100 kWh/kWc/an en France moyenne

  const handlePanelChange = (panelKey: string) => {
    const panel = COMMON_SOLAR_PANELS[panelKey];
    if (panel) {
      onChange({ ...currentConfig, panel });
    }
  };

  const handleFieldChange = (field: keyof SolarArrayConfig, value: any) => {
    onChange({ ...currentConfig, [field]: value });
  };

  const handleAutoLayoutToggle = (enabled: boolean) => {
    setAutoLayout(enabled);
    onChange({ ...currentConfig, autoLayout: enabled });
  };

  return (
    <div style={formSectionStyle}>
      <h3 style={cardTitleStyle}>☀️ Panneaux Solaires Photovoltaïques</h3>

      {/* Toggle Calepinage Automatique */}
      <div style={{
        padding: '12px 16px',
        background: '#eff6ff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <input
          type="checkbox"
          id="autoLayout"
          checked={autoLayout}
          onChange={(e) => handleAutoLayoutToggle(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer'
          }}
        />
        <label htmlFor="autoLayout" style={{
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#1e40af',
          cursor: 'pointer',
          flex: 1
        }}>
          🤖 Calepinage automatique intelligent
        </label>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {autoLayout ? 'Activé' : 'Désactivé'}
        </span>
      </div>

      {autoLayout && currentConfig.layout && (
        <div style={{
          padding: '12px 16px',
          background: '#f0fdf4',
          border: '2px solid #10b981',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
            ✅ Calepinage optimal calculé
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            fontSize: '0.8rem',
            color: '#047857'
          }}>
            <div>
              <strong>Configuration:</strong> {currentConfig.layout.rows} rangées × {currentConfig.layout.columns} colonnes
            </div>
            <div>
              <strong>Orientation:</strong> {currentConfig.layout.orientation === 'landscape' ? 'Paysage' : 'Portrait'}
            </div>
            <div>
              <strong>Couverture:</strong> {currentConfig.layout.coverageRatio.toFixed(1)}%
            </div>
            <div>
              <strong>Espacements:</strong> {currentConfig.layout.rowSpacing.toFixed(0)}mm × {currentConfig.layout.columnSpacing.toFixed(0)}mm
            </div>
            {(currentConfig.layout as any).advancedResult && (
              <>
                <div>
                  <strong>Zones:</strong> {(currentConfig.layout as any).advancedResult.zones.length}
                </div>
                <div>
                  <strong>Obstacles évités:</strong> {openings.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Métriques en un coup d'œil */}
      <div style={{
        padding: '12px 16px',
        background: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>PANNEAUX</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#b45309' }}>{totalPanels}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>PUISSANCE</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#b45309' }}>{totalPowerKwc.toFixed(1)} kWc</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>PRODUCTION/AN</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#b45309' }}>{(estimatedProduction / 1000).toFixed(0)} MWh</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>SURFACE</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#b45309' }}>{totalAreaM2.toFixed(0)} m²</div>
          </div>
        </div>
      </div>

      {/* Sélection du panneau */}
      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Modèle de panneau</label>
          <select
            style={selectStyle}
            value={Object.keys(COMMON_SOLAR_PANELS).find(
              key => COMMON_SOLAR_PANELS[key].model === currentConfig.panel.model
            ) || 'longi-540w'}
            onChange={(e) => handlePanelChange(e.target.value)}
          >
            <option value="longi-540w">
              LONGi 540W - Monocristallin (21.1% rendement)
            </option>
            <option value="ja-solar-550w">
              JA Solar 550W - Monocristallin (21.5% rendement)
            </option>
            <option value="trina-600w">
              Trina 600W - Bifacial (22.0% rendement)
            </option>
          </select>
          <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
            {currentConfig.panel.width}mm × {currentConfig.panel.height}mm - {currentConfig.panel.power}Wc - {currentConfig.panel.weight}kg
          </small>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Orientation des panneaux</label>
          <select
            style={selectStyle}
            value={currentConfig.orientation}
            onChange={(e) => handleFieldChange('orientation', e.target.value as 'landscape' | 'portrait')}
          >
            <option value="landscape">Paysage (horizontal)</option>
            <option value="portrait">Portrait (vertical)</option>
          </select>
        </div>
      </div>

      {/* Disposition */}
      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Nombre de rangées</label>
          <input
            type="number"
            style={{
              ...inputStyle,
              ...(autoLayout ? {
                background: '#f1f5f9',
                cursor: 'not-allowed',
                color: '#64748b'
              } : {})
            }}
            value={currentConfig.rows}
            onChange={(e) => handleFieldChange('rows', parseInt(e.target.value))}
            min={1}
            max={20}
            step={1}
            disabled={autoLayout}
            title={autoLayout ? 'Calculé automatiquement' : ''}
          />
          {autoLayout && (
            <small style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Calculé automatiquement
            </small>
          )}
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Panneaux par rangée</label>
          <input
            type="number"
            style={{
              ...inputStyle,
              ...(autoLayout ? {
                background: '#f1f5f9',
                cursor: 'not-allowed',
                color: '#64748b'
              } : {})
            }}
            value={currentConfig.columns}
            onChange={(e) => handleFieldChange('columns', parseInt(e.target.value))}
            min={1}
            max={100}
            step={1}
            disabled={autoLayout}
            title={autoLayout ? 'Calculé automatiquement' : ''}
          />
          {autoLayout && (
            <small style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Calculé automatiquement
            </small>
          )}
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Espacement entre rangées (mm)</label>
          <input
            type="number"
            style={{
              ...inputStyle,
              ...(autoLayout ? {
                background: '#f1f5f9',
                cursor: 'not-allowed',
                color: '#64748b'
              } : {})
            }}
            value={currentConfig.rowSpacing}
            onChange={(e) => handleFieldChange('rowSpacing', parseInt(e.target.value))}
            min={0}
            max={500}
            step={10}
            disabled={autoLayout}
            title={autoLayout ? 'Calculé automatiquement' : ''}
          />
          {autoLayout && (
            <small style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Calculé automatiquement
            </small>
          )}
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Espacement entre panneaux (mm)</label>
          <input
            type="number"
            style={{
              ...inputStyle,
              ...(autoLayout ? {
                background: '#f1f5f9',
                cursor: 'not-allowed',
                color: '#64748b'
              } : {})
            }}
            value={currentConfig.columnSpacing}
            onChange={(e) => handleFieldChange('columnSpacing', parseInt(e.target.value))}
            min={0}
            max={200}
            step={10}
            disabled={autoLayout}
            title={autoLayout ? 'Calculé automatiquement' : ''}
          />
          {autoLayout && (
            <small style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Calculé automatiquement
            </small>
          )}
        </div>
      </div>

      {/* Inclinaison et orientation */}
      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Inclinaison (degrés)</label>
          <input
            type="number"
            style={inputStyle}
            value={currentConfig.tilt}
            onChange={(e) => handleFieldChange('tilt', parseInt(e.target.value))}
            min={0}
            max={30}
            step={1}
          />
          <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
            Optimal: 15-20° en France
          </small>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Azimuth (degrés)</label>
          <input
            type="number"
            style={inputStyle}
            value={currentConfig.azimuth}
            onChange={(e) => handleFieldChange('azimuth', parseInt(e.target.value))}
            min={0}
            max={360}
            step={15}
          />
          <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
            0°=Nord, 90°=Est, 180°=Sud (optimal), 270°=Ouest
          </small>
        </div>
      </div>

      {/* Options */}
      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={currentConfig.antiReflectiveCoating}
              onChange={(e) => handleFieldChange('antiReflectiveCoating', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Revêtement anti-reflet
          </label>
          <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block', marginLeft: '26px' }}>
            Améliore le rendement de 2-3%
          </small>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={currentConfig.hailResistance}
              onChange={(e) => handleFieldChange('hailResistance', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Résistance grêle renforcée
          </label>
          <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block', marginLeft: '26px' }}>
            Certifié IEC 61215
          </small>
        </div>
      </div>

      {/* Informations techniques */}
      <div style={{
        padding: '12px 16px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
          📊 Informations techniques
        </div>
        <div style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: '1.6' }}>
          <div><strong>Type de cellule:</strong> {currentConfig.panel.cellType}</div>
          <div><strong>Nombre de cellules:</strong> {currentConfig.panel.numberOfCells}</div>
          <div><strong>Tension nominale:</strong> {currentConfig.panel.voltage}V</div>
          <div><strong>Courant nominal:</strong> {currentConfig.panel.current}A</div>
          <div><strong>Rendement:</strong> {currentConfig.panel.efficiency}%</div>
          <div><strong>Poids total panneaux:</strong> {(totalPanels * currentConfig.panel.weight).toFixed(0)} kg</div>
        </div>
      </div>
    </div>
  );
};
