/**
 * Éditeur de calepinage des panneaux solaires
 * Building Estimator - TopSteelCAD
 */

import React, { useState, useEffect } from 'react';
import {
  SolarPanelSpec,
  SolarArrayConfig,
  MountingSystemConfig,
  MountingSystemType,
  COMMON_SOLAR_PANELS,
  MOUNTING_SYSTEMS,
  PanelLayoutResult
} from '../types/ombriere.types';
import { calculateOptimalPanelLayout } from '../utils/solarPanelLayout';

export interface SolarPanelLayoutEditorProps {
  availableLength: number;    // Longueur disponible (mm)
  availableWidth: number;     // Largeur disponible (mm)
  config: SolarArrayConfig;
  onChange: (config: SolarArrayConfig) => void;
}

export const SolarPanelLayoutEditor: React.FC<SolarPanelLayoutEditorProps> = ({
  availableLength,
  availableWidth,
  config,
  onChange
}) => {
  const [selectedMountingSystem, setSelectedMountingSystem] = useState<string>('double-rail-standard');
  const [layoutResult, setLayoutResult] = useState<PanelLayoutResult | null>(null);
  const [autoLayout, setAutoLayout] = useState(config.autoLayout ?? true);

  // Recalculer le layout quand les paramètres changent
  useEffect(() => {
    if (!autoLayout || !config.mountingSystem) return;

    const result = calculateOptimalPanelLayout(
      availableLength,
      availableWidth,
      config.panel,
      config.mountingSystem,
      {
        orientation: config.orientation || 'auto',
        optimizeFor: config.optimizeFor || 'quantity',
        useRecommendedSpacing: true,
        customRowSpacing: config.rowSpacing,
        customColumnSpacing: config.columnSpacing,
        customEdgeMarginLongitudinal: config.customEdgeMarginLongitudinal,
        customEdgeMarginTransverse: config.customEdgeMarginTransverse
      }
    );

    setLayoutResult(result);

    // Mettre à jour la config
    onChange({
      ...config,
      orientation: result.orientation,
      rows: result.rows,
      columns: result.columns,
      rowSpacing: result.rowSpacing,
      columnSpacing: result.columnSpacing,
      layout: result,
      totalPanels: result.totalPanels,
      totalPower: result.totalPower,
      totalArea: (result.totalPanels * config.panel.width * config.panel.height) / 1000000
    });
  }, [
    availableLength,
    availableWidth,
    config.panel,
    config.mountingSystem,
    config.orientation,
    config.optimizeFor,
    config.rowSpacing,
    config.columnSpacing,
    autoLayout
  ]);

  const handleMountingSystemChange = (systemKey: string) => {
    setSelectedMountingSystem(systemKey);
    const system = MOUNTING_SYSTEMS[systemKey];
    onChange({
      ...config,
      mountingSystem: system
    });
  };

  const handleAutoLayoutToggle = (enabled: boolean) => {
    setAutoLayout(enabled);
    onChange({
      ...config,
      autoLayout: enabled
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Calepinage des panneaux solaires</h3>

      {/* Choix du système d'intégration */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Système d'intégration
        </label>
        <select
          value={selectedMountingSystem}
          onChange={(e) => handleMountingSystemChange(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="single-rail-standard">Rail simple - Standard</option>
          <option value="double-rail-standard">Double rail - Standard</option>
          <option value="double-rail-heavy">Double rail - Renforcé</option>
          <option value="triple-rail-snow">Triple rail - Zone neigeuse</option>
          <option value="direct-clamp-minimal">Fixation directe - Minimal</option>
          <option value="beam-system-optimized">Système poutrelles - Optimisé</option>
        </select>

        {config.mountingSystem && (
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <p>• Espacement rangées : {config.mountingSystem.recommendedRowSpacing}mm (min: {config.mountingSystem.minRowSpacing}mm)</p>
            <p>• Espacement colonnes : {config.mountingSystem.recommendedColumnSpacing}mm (min: {config.mountingSystem.minColumnSpacing}mm)</p>
            <p>• Marges : {config.mountingSystem.edgeMarginLongitudinal}mm × {config.mountingSystem.edgeMarginTransverse}mm</p>
            <p>• Poids max : {config.mountingSystem.maxPanelWeight}kg</p>
          </div>
        )}
      </div>

      {/* Activation calepinage automatique */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoLayout"
          checked={autoLayout}
          onChange={(e) => handleAutoLayoutToggle(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="autoLayout" className="text-sm font-medium">
          Calepinage automatique
        </label>
      </div>

      {autoLayout && (
        <>
          {/* Critère d'optimisation */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Optimiser pour
            </label>
            <select
              value={config.optimizeFor || 'quantity'}
              onChange={(e) => onChange({
                ...config,
                optimizeFor: e.target.value as 'quantity' | 'coverage' | 'balanced'
              })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="quantity">Maximum de panneaux</option>
              <option value="coverage">Meilleur taux de couverture</option>
              <option value="balanced">Équilibré</option>
            </select>
          </div>

          {/* Résultats du calepinage */}
          {layoutResult && layoutResult.totalPanels > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
              <h4 className="font-semibold text-blue-900">Résultat du calepinage</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Configuration</p>
                  <p className="font-medium">{layoutResult.rows} rangées × {layoutResult.columns} colonnes</p>
                  <p className="font-medium">Orientation : {layoutResult.orientation === 'landscape' ? 'Paysage' : 'Portrait'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Production</p>
                  <p className="font-medium">{layoutResult.totalPanels} panneaux</p>
                  <p className="font-medium">{(layoutResult.totalPower / 1000).toFixed(1)} kWc</p>
                </div>
                <div>
                  <p className="text-gray-600">Surface utilisée</p>
                  <p className="font-medium">{(layoutResult.usedLength / 1000).toFixed(2)}m × {(layoutResult.usedWidth / 1000).toFixed(2)}m</p>
                  <p className="font-medium">Couverture : {layoutResult.coverageRatio.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Marges restantes</p>
                  <p className="text-xs">Avant: {layoutResult.marginFront}mm / Arrière: {layoutResult.marginBack}mm</p>
                  <p className="text-xs">Gauche: {layoutResult.marginLeft}mm / Droite: {layoutResult.marginRight}mm</p>
                </div>
              </div>
            </div>
          )}

          {layoutResult && layoutResult.totalPanels === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-900 text-sm">
                ⚠️ Aucune configuration possible avec les paramètres actuels.
                La surface disponible est trop petite ou les marges trop importantes.
              </p>
            </div>
          )}
        </>
      )}

      {/* Configuration manuelle si auto-layout désactivé */}
      {!autoLayout && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre de rangées
              </label>
              <input
                type="number"
                min="1"
                value={config.rows || 1}
                onChange={(e) => onChange({ ...config, rows: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Colonnes par rangée
              </label>
              <input
                type="number"
                min="1"
                value={config.columns || 1}
                onChange={(e) => onChange({ ...config, columns: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Espacement rangées (mm)
              </label>
              <input
                type="number"
                min="0"
                value={config.rowSpacing || 100}
                onChange={(e) => onChange({ ...config, rowSpacing: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Espacement colonnes (mm)
              </label>
              <input
                type="number"
                min="0"
                value={config.columnSpacing || 50}
                onChange={(e) => onChange({ ...config, columnSpacing: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
