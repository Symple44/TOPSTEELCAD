/**
 * Composant de synthèse de bâtiment
 * Affiche les métriques clés : poids, surfaces
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { BuildingDimensions, BuildingParameters, BuildingType, BuildingExtension } from '../types';
import { SolarArrayConfig } from '../types/ombriere.types';
import { calculateBuildingSummary } from '../utils/buildingSummary';
import { getMainBuildingColor, getExtensionColor } from '../utils/extensionColors';

export interface BuildingSummaryProps {
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  buildingType: BuildingType;
  extensions?: BuildingExtension[];
  solarArray?: SolarArrayConfig;
}

/**
 * Composant de synthèse
 */
const BuildingSummaryComponent: React.FC<BuildingSummaryProps> = ({
  dimensions,
  parameters,
  buildingType,
  extensions = [],
  solarArray
}) => {
  const summary = calculateBuildingSummary(dimensions, parameters, buildingType);

  // Calculer les métriques solaires pour les ombrières
  const solarMetrics = React.useMemo(() => {
    if (buildingType !== BuildingType.OMBRIERE || !solarArray) {
      return null;
    }

    // Récupérer les informations du panneau
    const panel = solarArray.panel;

    if (!panel) {
      return null;
    }

    // Le panneau a les propriétés width et height (ou length)
    const panelWidth = panel.width || 1134; // mm (longueur du panneau)
    const panelHeight = panel.height || panel.length || 2278; // mm (largeur du panneau)
    const panelPower = panel.power || panel.peakPower || 400; // W

    return calculateMetrics({ width: panelWidth, height: panelHeight, power: panelPower });

    function calculateMetrics(panelSpec: { width: number; height: number; power: number }) {
      // Calculer le nombre de panneaux à partir des dimensions du bâtiment
      const buildingLength = dimensions.length || 20000; // mm
      const buildingWidth = dimensions.width || 12000; // mm

      // Dimensions du panneau selon orientation
      const orientation = solarArray.orientation || 'landscape';
      const panelWidthOriented = orientation === 'landscape' ? panelSpec.width : panelSpec.height; // mm
      const panelHeightOriented = orientation === 'landscape' ? panelSpec.height : panelSpec.width; // mm

      // Marges et espacements (valeurs par défaut)
      const edgeMarginLong = solarArray.customEdgeMarginLongitudinal || 200; // mm
      const edgeMarginTrans = solarArray.customEdgeMarginTransverse || 200; // mm
      const rowSpacing = solarArray.rowSpacing || 30; // mm
      const columnSpacing = solarArray.columnSpacing || 30; // mm

      // Calcul du nombre de panneaux
      const availableLength = buildingLength - 2 * edgeMarginLong;
      const availableWidth = buildingWidth - 2 * edgeMarginTrans;

      const columns = Math.floor((availableLength + columnSpacing) / (panelWidthOriented + columnSpacing));
      const rows = Math.floor((availableWidth + rowSpacing) / (panelHeightOriented + rowSpacing));
      const panelCount = columns * rows;

      // Ne pas afficher si aucun panneau
      if (panelCount === 0 || isNaN(panelCount)) {
        return null;
      }

      // Puissance totale
      const panelPower = panelSpec.power || 400; // W
      const totalPowerKW = (panelCount * panelPower) / 1000; // kWc

      // Production annuelle estimée (kWh/kWc/an selon localisation)
      // Valeur par défaut France: ~1100 kWh/kWc/an
      const productionFactor = 1100;
      const annualProductionKWh = totalPowerKW * productionFactor;

      // Surface totale des panneaux
      const panelAreaM2 = (panelSpec.width * panelSpec.height) / 1_000_000; // m²
      const totalAreaM2 = panelCount * panelAreaM2;

      const metrics = {
        panelCount,
        totalPowerKW: totalPowerKW.toFixed(2),
        annualProductionKWh: Math.round(annualProductionKWh),
        totalAreaM2: totalAreaM2.toFixed(2)
      };

      return metrics;
    }
  }, [buildingType, solarArray, dimensions]);

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

      {/* Métriques solaires pour les ombrières */}
      {solarMetrics && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '8px', fontWeight: '600', color: '#1e293b' }}>
            ☀️ Production Solaire
          </div>
          <div>• Nombre de panneaux: <strong>{solarMetrics.panelCount}</strong></div>
          <div>• Puissance installée: <strong>{solarMetrics.totalPowerKW} kWc</strong></div>
          <div>• Production annuelle: <strong>{solarMetrics.annualProductionKWh.toLocaleString()} kWh/an</strong></div>
          <div>• Surface panneaux: <strong>{solarMetrics.totalAreaM2} m²</strong></div>
        </div>
      )}

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

// Mémoriser le composant pour éviter les re-renders inutiles
// Comparaison personnalisée pour optimiser les performances
export const BuildingSummary = React.memo(BuildingSummaryComponent, (prevProps, nextProps) => {
  // Comparer buildingType
  if (prevProps.buildingType !== nextProps.buildingType) {
    return false;
  }

  // Comparer dimensions (objet)
  if (JSON.stringify(prevProps.dimensions) !== JSON.stringify(nextProps.dimensions)) {
    return false;
  }

  // Comparer parameters (objet)
  if (JSON.stringify(prevProps.parameters) !== JSON.stringify(nextProps.parameters)) {
    return false;
  }

  // Comparer extensions (array)
  if (JSON.stringify(prevProps.extensions) !== JSON.stringify(nextProps.extensions)) {
    return false;
  }

  // Comparer solarArray (objet optionnel)
  if (JSON.stringify(prevProps.solarArray) !== JSON.stringify(nextProps.solarArray)) {
    return false;
  }

  // Toutes les props sont identiques, pas de re-render
  return true;
});
