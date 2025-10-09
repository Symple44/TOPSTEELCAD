/**
 * Composant de synthèse de bâtiment
 * Affiche les métriques clés : poids, surfaces
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { BuildingDimensions, BuildingParameters, BuildingType, BuildingExtension } from '../types';
import { calculateBuildingSummary } from '../utils/buildingSummary';
import { getMainBuildingColor, getExtensionColor } from '../utils/extensionColors';

export interface BuildingSummaryProps {
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  buildingType: BuildingType;
  extensions?: BuildingExtension[];
}

/**
 * Composant de synthèse
 */
export const BuildingSummary: React.FC<BuildingSummaryProps> = ({
  dimensions,
  parameters,
  buildingType,
  extensions = []
}) => {
  const summary = calculateBuildingSummary(dimensions, parameters, buildingType);

  return (
    <div style={{
      padding: '12px 16px',
      background: '#fff',
      fontSize: '0.85rem',
      color: '#475569'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: '600', color: '#1e293b' }}>
        📊 Synthèse
      </div>
      <div>• Poids total: <strong>{summary.totalWeight.toLocaleString()} kg</strong></div>
      <div>• Surface couverture: <strong>{summary.roofingArea} m²</strong></div>
      <div>• Surface bardage: <strong>{summary.claddingArea} m²</strong></div>
      <div>• Surface au sol: <strong>{summary.floorArea} m²</strong></div>

      {extensions.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '8px', fontWeight: '600', color: '#1e293b' }}>
            🎨 Légende
          </div>
          {/* Bâtiment principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              background: getMainBuildingColor().border,
              borderRadius: '2px',
              display: 'inline-block'
            }}></span>
            <span style={{ fontSize: '0.8rem' }}>Bâtiment principal</span>
          </div>
          {/* Extensions dynamiques */}
          {extensions.map((ext, index) => {
            const color = getExtensionColor(ext, extensions);
            return (
              <div key={ext.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: index < extensions.length - 1 ? '4px' : '0' }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  background: color.border,
                  borderRadius: '2px',
                  display: 'inline-block'
                }}></span>
                <span style={{ fontSize: '0.8rem' }}>{ext.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
