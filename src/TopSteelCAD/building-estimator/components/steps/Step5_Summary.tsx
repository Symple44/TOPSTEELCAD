/**
 * Étape 5 : Résumé et nomenclature
 * Building Estimator - TopSteelCAD
 */

import React, { useState } from 'react';
import { Step5SummaryProps } from '../types';
import { NomenclatureSection, Unit } from '../../types';
import { BuildingViewer3D } from '../BuildingViewer3D';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  buttonGroupStyle,
  buttonStyle,
  buttonGroupStyleResponsive,
  buttonStyleResponsive,
  cardTitleStyle,
  tableStyle,
  thStyle,
  tdStyle,
  gridStyle,
  badgeStyle,
  viewer3DStyle
} from '../../styles/buildingEstimator.styles';

export const Step5_Summary: React.FC<Step5SummaryProps> = ({
  building,
  nomenclature,
  onExport,
  onPrevious,
  onReset
}) => {
  const [showViewer3D, setShowViewer3D] = useState(true);
  const [viewerError, setViewerError] = useState<Error | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Détecter le redimensionnement
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!building || !nomenclature) {
    return (
      <div style={formSectionStyle}>
        <p style={{ textAlign: 'center', color: '#64748b' }}>
          Aucun bâtiment généré. Veuillez compléter les étapes précédentes.
        </p>
      </div>
    );
  }

  const renderSection = (section: NomenclatureSection) => {
    if (section.items.length === 0) return null;

    return (
      <div style={formSectionStyle} key={section.category}>
        <h3 style={cardTitleStyle}>{section.title}</h3>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Réf</th>
              <th style={thStyle}>Désignation</th>
              <th style={thStyle}>Profil</th>
              <th style={thStyle}>Qté</th>
              <th style={thStyle}>Unité</th>
              <th style={thStyle}>Long. unit. (mm)</th>
              <th style={thStyle}>Long. totale (m)</th>
              <th style={thStyle}>Poids unit. (kg)</th>
              <th style={thStyle}>Poids total (kg)</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, index) => (
              <tr key={index}>
                <td style={tdStyle}>{item.ref}</td>
                <td style={tdStyle}>{item.designation}</td>
                <td style={tdStyle}>{item.profile || '-'}</td>
                <td style={tdStyle}>{item.quantity}</td>
                <td style={tdStyle}>{item.unit}</td>
                <td style={tdStyle}>
                  {item.unitLength ? item.unitLength.toFixed(0) : '-'}
                </td>
                <td style={tdStyle}>
                  {item.totalLength ? (item.totalLength / 1000).toFixed(2) : '-'}
                </td>
                <td style={tdStyle}>
                  {item.unitWeight ? item.unitWeight.toFixed(2) : '-'}
                </td>
                <td style={tdStyle}>
                  {item.totalWeight ? item.totalWeight.toFixed(2) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          {section.subtotals && (
            <tfoot>
              <tr style={{ fontWeight: '600', background: '#f8fafc' }}>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'right' }}>
                  Sous-total:
                </td>
                <td style={tdStyle}>
                  {section.subtotals.totalWeight?.toFixed(2) || '-'} kg
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const totals = nomenclature.totals;

  return (
    <div>
      {/* Informations générales */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>📋 Informations du Bâtiment</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Nom du projet</label>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{building.name}</div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Type</label>
            <div style={{ fontSize: '16px' }}>Monopente</div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Dimensions</label>
            <div style={{ fontSize: '14px' }}>
              {(building.dimensions.length / 1000).toFixed(1)}m × {(building.dimensions.width / 1000).toFixed(1)}m × {(building.dimensions.heightWall / 1000).toFixed(1)}m
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Pente</label>
            <div style={{ fontSize: '14px' }}>{building.dimensions.slope}%</div>
          </div>
        </div>
      </div>

      {/* Totaux principaux */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>📊 Totaux</h3>

        <div style={gridStyle(4)}>
          <div
            style={{
              padding: '20px',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              Acier Total
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2563eb' }}>
              {totals.totalSteelWeight.toFixed(0)} kg
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Structure: {totals.mainFrameWeight.toFixed(0)} kg<br />
              Secondaire: {totals.secondaryFrameWeight.toFixed(0)} kg
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              Bardage
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
              {totals.totalCladdingArea.toFixed(1)} m²
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Net: {totals.netCladdingArea.toFixed(1)} m²
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fde68a'
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              Couverture
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
              {totals.totalRoofingArea.toFixed(1)} m²
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Net: {totals.netRoofingArea.toFixed(1)} m²
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              background: '#fce7f3',
              borderRadius: '8px',
              border: '1px solid #fbcfe8'
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              Ouvertures
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ec4899' }}>
              {totals.doorCount + totals.windowCount}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Portes: {totals.doorCount}<br />
              Fenêtres: {totals.windowCount}
            </div>
          </div>
        </div>
      </div>

      {/* Visualisation 3D */}
      <div style={formSectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={cardTitleStyle}>🎨 Visualisation 3D</h3>
          <button
            onClick={() => setShowViewer3D(!showViewer3D)}
            style={{
              padding: '6px 12px',
              background: showViewer3D ? '#10b981' : '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {showViewer3D ? '👁️ Masquer' : '👁️ Afficher'}
          </button>
        </div>

        {showViewer3D && (
          viewerError ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: '#ef4444',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca'
              }}
            >
              <div style={{ marginBottom: '8px' }}>⚠️ Erreur de visualisation 3D</div>
              <div style={{ fontSize: '12px' }}>{viewerError.message}</div>
              <button
                onClick={() => {
                  setViewerError(null);
                  setShowViewer3D(false);
                  setTimeout(() => setShowViewer3D(true), 100);
                }}
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🔄 Réessayer
              </button>
            </div>
          ) : (
            <BuildingViewer3D
              building={building}
              levelOfDetail="medium"
              showGrid={true}
              showAxes={true}
              showStructure={true}
              showCladding={true}
              showRoofing={true}
              showOpenings={true}
              width="100%"
              height="500px"
              onLoad={() => console.log('Viewer 3D chargé')}
              onError={(error) => setViewerError(error)}
            />
          )
        )}
      </div>

      {/* Nomenclature détaillée */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          📑 Nomenclature Détaillée
        </h2>

        {renderSection(nomenclature.sections.mainFrame)}
        {renderSection(nomenclature.sections.secondaryFrame)}
        {renderSection(nomenclature.sections.cladding)}
        {renderSection(nomenclature.sections.roofing)}
        {renderSection(nomenclature.sections.openings)}
        {nomenclature.sections.accessories && renderSection(nomenclature.sections.accessories)}
      </div>

      {/* Export */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>💾 Export</h3>

        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', flexWrap: 'wrap' }}>
          <button
            style={buttonStyleResponsive('primary', isMobile)}
            onClick={() => onExport('csv')}
            title="Exporter la nomenclature en CSV (compatible Excel)"
          >
            {isMobile ? '📊 CSV' : '📊 Export CSV'}
          </button>

          <button
            style={buttonStyleResponsive('primary', isMobile)}
            onClick={() => onExport('html')}
            title="Exporter la nomenclature en HTML"
          >
            {isMobile ? '🖨️ HTML' : '🖨️ Export HTML'}
          </button>

          <button
            style={buttonStyleResponsive('primary', isMobile)}
            onClick={() => onExport('json')}
            title="Exporter le bâtiment en JSON (données complètes)"
          >
            {isMobile ? '📄 JSON' : '📄 Export JSON'}
          </button>

          <button
            style={buttonStyleResponsive('primary', isMobile)}
            onClick={() => onExport('ifc')}
            title="Exporter le bâtiment en IFC (format BIM)"
          >
            {isMobile ? '🏗️ IFC' : '🏗️ Export IFC'}
          </button>
        </div>

        <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
          💡 Astuce : L'export HTML peut être ouvert dans un navigateur et imprimé en PDF
        </div>
      </div>

      {/* Navigation */}
      <div style={buttonGroupStyleResponsive(isMobile)}>
        <button style={buttonStyleResponsive('secondary', isMobile)} onClick={onPrevious}>
          ← Retour
        </button>
        <button style={buttonStyleResponsive('danger', isMobile)} onClick={onReset}>
          {isMobile ? '🔄 Nouveau' : '🔄 Nouveau Bâtiment'}
        </button>
      </div>
    </div>
  );
};
