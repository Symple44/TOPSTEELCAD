/**
 * Utilitaires pour le calepinage automatique des panneaux solaires
 * Building Estimator - TopSteelCAD
 */

import {
  SolarPanelSpec,
  SolarArrayConfig,
  MountingSystemConfig,
  PanelLayoutResult
} from '../types/ombriere.types';

/**
 * Calcule le calepinage optimal des panneaux solaires
 * sur une surface donnée avec un système d'intégration spécifique
 */
export function calculateOptimalPanelLayout(
  availableLength: number,      // Longueur disponible (mm)
  availableWidth: number,        // Largeur disponible (mm)
  panel: SolarPanelSpec,
  mountingSystem: MountingSystemConfig,
  config: {
    orientation?: 'landscape' | 'portrait' | 'auto';
    optimizeFor?: 'quantity' | 'coverage' | 'balanced';
    useRecommendedSpacing?: boolean;  // Utiliser espacements recommandés ou minimaux
    customRowSpacing?: number;
    customColumnSpacing?: number;
    customEdgeMarginLongitudinal?: number;
    customEdgeMarginTransverse?: number;
  } = {}
): PanelLayoutResult {
  const {
    orientation = 'auto',
    optimizeFor = 'quantity',
    useRecommendedSpacing = true,
    customRowSpacing,
    customColumnSpacing,
    customEdgeMarginLongitudinal,
    customEdgeMarginTransverse
  } = config;

  // Marges à utiliser
  const marginLong = customEdgeMarginLongitudinal ?? mountingSystem.edgeMarginLongitudinal;
  const marginTrans = customEdgeMarginTransverse ?? mountingSystem.edgeMarginTransverse;

  // Espacements à utiliser
  const rowSpacing = customRowSpacing ?? (
    useRecommendedSpacing
      ? mountingSystem.recommendedRowSpacing
      : mountingSystem.minRowSpacing
  );
  const columnSpacing = customColumnSpacing ?? (
    useRecommendedSpacing
      ? mountingSystem.recommendedColumnSpacing
      : mountingSystem.minColumnSpacing
  );

  // Surface disponible après marges
  const usableLength = availableLength - 2 * marginLong;
  const usableWidth = availableWidth - 2 * marginTrans;

  // Essayer les deux orientations si auto
  const orientationsToTry: ('landscape' | 'portrait')[] = [];
  if (orientation === 'auto') {
    if (mountingSystem.supportsLandscape) orientationsToTry.push('landscape');
    if (mountingSystem.supportsPortrait) orientationsToTry.push('portrait');
  } else {
    orientationsToTry.push(orientation);
  }

  let bestLayout: PanelLayoutResult | null = null;
  let bestScore = -1;

  for (const orient of orientationsToTry) {
    // Dimensions du panneau selon l'orientation
    const panelLength = orient === 'landscape' ? panel.width : panel.height;
    const panelWidth = orient === 'landscape' ? panel.height : panel.width;

    // Calculer le nombre de panneaux dans chaque direction
    // Direction longitudinale (le long de la longueur)
    const columnsMax = Math.floor(
      (usableLength + columnSpacing) / (panelLength + columnSpacing)
    );

    // Direction transversale (le long de la largeur)
    const rowsMax = Math.floor(
      (usableWidth + rowSpacing) / (panelWidth + rowSpacing)
    );

    if (columnsMax <= 0 || rowsMax <= 0) continue;

    const totalPanels = columnsMax * rowsMax;
    const totalPower = totalPanels * panel.power;

    // Dimensions réellement utilisées
    const usedLength = columnsMax * panelLength + (columnsMax - 1) * columnSpacing;
    const usedWidth = rowsMax * panelWidth + (rowsMax - 1) * rowSpacing;

    // Marges restantes
    const marginFront = marginLong;
    const marginBack = availableLength - marginLong - usedLength;
    const marginLeft = marginTrans;
    const marginRight = availableWidth - marginTrans - usedWidth;

    // Taux de couverture (surface panneaux / surface totale disponible)
    const panelArea = totalPanels * (panel.width * panel.height) / 1000000; // m²
    const totalArea = (availableLength * availableWidth) / 1000000; // m²
    const coverageRatio = (panelArea / totalArea) * 100;

    // Calculer le score selon le critère d'optimisation
    let score = 0;
    switch (optimizeFor) {
      case 'quantity':
        score = totalPanels;
        break;
      case 'coverage':
        score = coverageRatio;
        break;
      case 'balanced':
        // Compromis: nombre de panneaux avec bonus pour bon taux de couverture
        score = totalPanels * (1 + coverageRatio / 200);
        break;
    }

    if (score > bestScore) {
      bestScore = score;
      bestLayout = {
        rows: rowsMax,
        columns: columnsMax,
        orientation: orient,
        rowSpacing,
        columnSpacing,
        totalPanels,
        totalPower,
        coverageRatio,
        usedLength,
        usedWidth,
        marginFront,
        marginBack,
        marginLeft,
        marginRight
      };
    }
  }

  if (!bestLayout) {
    // Aucune solution trouvée, retourner une config vide
    return {
      rows: 0,
      columns: 0,
      orientation: 'landscape',
      rowSpacing,
      columnSpacing,
      totalPanels: 0,
      totalPower: 0,
      coverageRatio: 0,
      usedLength: 0,
      usedWidth: 0,
      marginFront: marginLong,
      marginBack: marginLong,
      marginLeft: marginTrans,
      marginRight: marginTrans
    };
  }

  return bestLayout;
}

/**
 * Applique le calepinage automatique à une configuration SolarArrayConfig
 * et retourne la configuration complétée
 */
export function applySolarArrayLayout(
  config: SolarArrayConfig,
  availableLength: number,
  availableWidth: number
): SolarArrayConfig {
  // Si pas de système d'intégration ou pas d'auto-layout, retourner tel quel
  if (!config.mountingSystem || !config.autoLayout) {
    return config;
  }

  // Calculer le layout optimal
  const layout = calculateOptimalPanelLayout(
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

  // Retourner la config complétée
  return {
    ...config,
    orientation: layout.orientation,
    rows: layout.rows,
    columns: layout.columns,
    rowSpacing: layout.rowSpacing,
    columnSpacing: layout.columnSpacing,
    layout,
    totalPanels: layout.totalPanels,
    totalPower: layout.totalPower,
    totalArea: (layout.totalPanels * config.panel.width * config.panel.height) / 1000000
  };
}
