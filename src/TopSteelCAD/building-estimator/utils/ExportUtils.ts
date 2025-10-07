/**
 * Utilitaires pour l'export de nomenclature
 * Building Estimator - TopSteelCAD
 */

import { Nomenclature, NomenclatureSection, MonoPenteBuilding, IFCExportOptions } from '../types';
import { IFCExporter } from '../services/IFCExporter';

/**
 * Exporte la nomenclature en CSV amélioré avec encodage UTF-8
 */
export function exportToCSVEnhanced(nomenclature: Nomenclature): string {
  // BOM pour UTF-8
  let csv = '\uFEFF';

  // En-tête
  csv += '═══════════════════════════════════════════════════════════════\n';
  csv += `NOMENCLATURE BATIMENT - ${nomenclature.buildingName}\n`;
  csv += '═══════════════════════════════════════════════════════════════\n';
  csv += `Généré le: ${nomenclature.generatedAt.toLocaleString('fr-FR')}\n`;
  csv += `Version: ${nomenclature.version}\n\n`;

  // Pour chaque section
  for (const section of Object.values(nomenclature.sections)) {
    if (!section || section.items.length === 0) continue;

    csv += `\n${'─'.repeat(63)}\n`;
    csv += `${section.title.toUpperCase()}\n`;
    csv += `${'─'.repeat(63)}\n`;
    csv += 'Réf;Désignation;Profil;Qté;Unité;Long. unit. (mm);Long. tot. (m);Poids unit. (kg);Poids tot. (kg)\n';

    for (const item of section.items) {
      csv += `${item.ref};`;
      csv += `${item.designation};`;
      csv += `${item.profile || '-'};`;
      csv += `${item.quantity};`;
      csv += `${item.unit};`;
      csv += `${item.unitLength ? item.unitLength.toFixed(0) : '-'};`;
      csv += `${item.totalLength ? (item.totalLength / 1000).toFixed(2) : '-'};`;
      csv += `${item.unitWeight ? item.unitWeight.toFixed(2) : '-'};`;
      csv += `${item.totalWeight ? item.totalWeight.toFixed(2) : '-'}\n`;
    }

    // Sous-totaux de section
    if (section.subtotals) {
      csv += `${'─'.repeat(63)}\n`;
      csv += `SOUS-TOTAL;;;;;;;;${section.subtotals.totalWeight?.toFixed(2) || '-'}\n`;
    }
  }

  // Totaux généraux
  csv += `\n\n${'═'.repeat(63)}\n`;
  csv += 'TOTAUX GENERAUX\n';
  csv += `${'═'.repeat(63)}\n`;
  csv += `Poids acier total;${nomenclature.totals.totalSteelWeight.toFixed(0)} kg\n`;
  csv += `  - Ossature principale;${nomenclature.totals.mainFrameWeight.toFixed(0)} kg\n`;
  csv += `  - Ossature secondaire;${nomenclature.totals.secondaryFrameWeight.toFixed(0)} kg\n\n`;
  csv += `Surface bardage totale;${nomenclature.totals.totalCladdingArea.toFixed(2)} m²\n`;
  csv += `Surface bardage nette;${nomenclature.totals.netCladdingArea.toFixed(2)} m²\n\n`;
  csv += `Surface couverture totale;${nomenclature.totals.totalRoofingArea.toFixed(2)} m²\n`;
  csv += `Surface couverture nette;${nomenclature.totals.netRoofingArea.toFixed(2)} m²\n\n`;
  csv += `Ouvertures;${nomenclature.totals.doorCount + nomenclature.totals.windowCount} total\n`;
  csv += `  - Portes;${nomenclature.totals.doorCount}\n`;
  csv += `  - Fenêtres;${nomenclature.totals.windowCount}\n`;

  return csv;
}

/**
 * Exporte la nomenclature en HTML formaté pour impression
 */
export function exportToHTML(nomenclature: Nomenclature): string {
  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nomenclature - ${nomenclature.buildingName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #2563eb;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .meta {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .section-title {
      background: #2563eb;
      color: white;
      padding: 10px 15px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #0f172a;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .subtotal {
      background: #fef3c7 !important;
      font-weight: 600;
    }
    .totals {
      margin-top: 40px;
      padding: 25px;
      background: #f0f9ff;
      border: 2px solid #2563eb;
      border-radius: 8px;
    }
    .totals h2 {
      color: #2563eb;
      margin-bottom: 20px;
      font-size: 20px;
    }
    .total-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .total-item {
      padding: 15px;
      background: white;
      border-radius: 6px;
      border-left: 4px solid #2563eb;
    }
    .total-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 5px;
    }
    .total-value {
      font-size: 24px;
      font-weight: 600;
      color: #2563eb;
    }
    .total-detail {
      font-size: 11px;
      color: #64748b;
      margin-top: 5px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Nomenclature du Bâtiment</h1>
      <div class="meta">
        <strong>${nomenclature.buildingName}</strong><br>
        Généré le ${nomenclature.generatedAt.toLocaleDateString('fr-FR')} à ${nomenclature.generatedAt.toLocaleTimeString('fr-FR')}<br>
        Version ${nomenclature.version}
      </div>
    </div>
`;

  // Sections
  for (const section of Object.values(nomenclature.sections)) {
    if (!section || section.items.length === 0) continue;

    html += `
    <div class="section">
      <div class="section-title">${section.title}</div>
      <table>
        <thead>
          <tr>
            <th>Réf</th>
            <th>Désignation</th>
            <th>Profil</th>
            <th style="text-align: center">Qté</th>
            <th>Unité</th>
            <th style="text-align: right">Long. unit. (mm)</th>
            <th style="text-align: right">Long. tot. (m)</th>
            <th style="text-align: right">Poids unit. (kg)</th>
            <th style="text-align: right">Poids tot. (kg)</th>
          </tr>
        </thead>
        <tbody>
`;

    for (const item of section.items) {
      html += `
          <tr>
            <td>${item.ref}</td>
            <td>${item.designation}</td>
            <td>${item.profile || '-'}</td>
            <td style="text-align: center">${item.quantity}</td>
            <td>${item.unit}</td>
            <td style="text-align: right">${item.unitLength ? item.unitLength.toFixed(0) : '-'}</td>
            <td style="text-align: right">${item.totalLength ? (item.totalLength / 1000).toFixed(2) : '-'}</td>
            <td style="text-align: right">${item.unitWeight ? item.unitWeight.toFixed(2) : '-'}</td>
            <td style="text-align: right">${item.totalWeight ? item.totalWeight.toFixed(2) : '-'}</td>
          </tr>
`;
    }

    if (section.subtotals) {
      html += `
          <tr class="subtotal">
            <td colspan="8" style="text-align: right"><strong>Sous-total</strong></td>
            <td style="text-align: right"><strong>${section.subtotals.totalWeight?.toFixed(2) || '-'} kg</strong></td>
          </tr>
`;
    }

    html += `
        </tbody>
      </table>
    </div>
`;
  }

  // Totaux
  const totals = nomenclature.totals;
  html += `
    <div class="totals">
      <h2>📊 Totaux Généraux</h2>
      <div class="total-grid">
        <div class="total-item">
          <div class="total-label">Acier Total</div>
          <div class="total-value">${totals.totalSteelWeight.toFixed(0)} kg</div>
          <div class="total-detail">
            Structure: ${totals.mainFrameWeight.toFixed(0)} kg •
            Secondaire: ${totals.secondaryFrameWeight.toFixed(0)} kg
          </div>
        </div>
        <div class="total-item">
          <div class="total-label">Bardage</div>
          <div class="total-value">${totals.totalCladdingArea.toFixed(1)} m²</div>
          <div class="total-detail">Net: ${totals.netCladdingArea.toFixed(1)} m²</div>
        </div>
        <div class="total-item">
          <div class="total-label">Couverture</div>
          <div class="total-value">${totals.totalRoofingArea.toFixed(1)} m²</div>
          <div class="total-detail">Net: ${totals.netRoofingArea.toFixed(1)} m²</div>
        </div>
        <div class="total-item">
          <div class="total-label">Ouvertures</div>
          <div class="total-value">${totals.doorCount + totals.windowCount}</div>
          <div class="total-detail">
            Portes: ${totals.doorCount} • Fenêtres: ${totals.windowCount}
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Option pour imprimer automatiquement
    // window.print();
  </script>
</body>
</html>
`;

  return html;
}

/**
 * Télécharge un fichier côté client
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Télécharge la nomenclature en CSV
 */
export function downloadNomenclatureCSV(nomenclature: Nomenclature): void {
  const csv = exportToCSVEnhanced(nomenclature);
  const filename = `${nomenclature.buildingName.replace(/\s+/g, '_')}_nomenclature_${new Date().getTime()}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Télécharge la nomenclature en HTML
 */
export function downloadNomenclatureHTML(nomenclature: Nomenclature): void {
  const html = exportToHTML(nomenclature);
  const filename = `${nomenclature.buildingName.replace(/\s+/g, '_')}_nomenclature_${new Date().getTime()}.html`;
  downloadFile(html, filename, 'text/html');
}

/**
 * Télécharge le bâtiment en JSON
 */
export function downloadBuildingJSON(building: any, buildingName: string): void {
  const json = JSON.stringify(building, null, 2);
  const filename = `${buildingName.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
  downloadFile(json, filename, 'application/json');
}

/**
 * Télécharge le bâtiment en IFC
 */
export function downloadBuildingIFC(building: MonoPenteBuilding, options?: IFCExportOptions): void {
  const result = IFCExporter.exportBuilding(building, options);

  if (result.success && result.ifcContent) {
    const filename = result.fileName || `${building.name.replace(/\s+/g, '_')}_${new Date().getTime()}.ifc`;
    downloadFile(result.ifcContent, filename, 'application/x-step');
  } else {
    console.error('IFC Export failed:', result.errors);
    alert(`Erreur lors de l'export IFC:\n${result.errors?.join('\n')}`);
  }
}

/**
 * Ouvre la nomenclature HTML dans un nouvel onglet pour impression
 */
export function printNomenclature(nomenclature: Nomenclature): void {
  const html = exportToHTML(nomenclature);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // printWindow.print(); // Décommenter pour impression automatique
  }
}
