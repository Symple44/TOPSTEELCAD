/**
 * Adapter pour l'export CSV
 */

import {
  IFormatAdapter,
  ExportFormat,
  FormatCapabilities,
  StandardizedExportData,
  ExportResult,
  ValidationResult
} from '../interfaces';

export class CSVAdapter implements IFormatAdapter {
  readonly format = ExportFormat.CSV;
  readonly mimeType = 'text/csv';
  readonly fileExtension = '.csv';

  readonly capabilities: FormatCapabilities = {
    supportsGeometry: false, // CSV est tabulaire, pas de géométrie complexe
    supportsFeatures: true, // Peut lister les features
    supportsMaterials: true,
    supportsMetadata: true,
    supportsMultipleElements: true,
    supportsHierarchy: false, // Format plat
    supports3D: false,
    supportedFeatures: ['holes', 'cuts'] // Features basiques
  };

  /**
   * Transforme vers CSV
   */
  async transform(data: StandardizedExportData): Promise<ExportResult> {
    try {
      const csvLines: string[] = [];

      // Headers
      const headers = [
        'ID',
        'Reference',
        'Designation',
        'Profile Type',
        'Profile',
        'Length (mm)',
        'Material',
        'Quantity',
        'Weight (kg)',
        'Holes Count',
        'Cuts Count',
        'Position X',
        'Position Y',
        'Position Z',
        'Rotation X',
        'Rotation Y',
        'Rotation Z',
        'Status',
        'Notes'
      ];

      csvLines.push(headers.join(','));

      // Data rows
      data.elements.forEach(element => {
        const originalData = element.metadata?.originalElement || element.originalData;
        const partData = originalData || element;

        const row = [
          this.escapeCSV(partData.id || element.id),
          this.escapeCSV(partData.reference || element.partNumber || element.name || ''),
          this.escapeCSV(partData.designation || element.description || ''),
          this.escapeCSV(partData.profileType || element.materialType || ''),
          this.escapeCSV(partData.profile || `${partData.profileType || ''} ${partData.profileSubType || ''}`.trim()),
          partData.length || element.dimensions?.length || 0,
          this.escapeCSV(partData.material || element.material?.grade || element.material || 'S355'),
          partData.quantity || element.metadata?.quantity || 1,
          this.formatNumber(partData.weight || element.weight || 0),
          this.countFeatures(element, 'hole'),
          this.countFeatures(element, 'cut'),
          this.formatNumber(element.position?.[0] || 0),
          this.formatNumber(element.position?.[1] || 0),
          this.formatNumber(element.position?.[2] || 0),
          this.formatNumber(element.rotation?.[0] || 0),
          this.formatNumber(element.rotation?.[1] || 0),
          this.formatNumber(element.rotation?.[2] || 0),
          this.escapeCSV(partData.status || 'active'),
          this.escapeCSV(partData.notes || '')
        ];

        csvLines.push(row.join(','));
      });

      // Add summary
      csvLines.push('');
      csvLines.push('SUMMARY');
      csvLines.push(`Total Elements,${data.elements.length}`);
      csvLines.push(`Export Date,${new Date().toISOString()}`);
      csvLines.push(`Units,${data.metadata.units}`);

      const csvContent = csvLines.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: this.mimeType + ';charset=utf-8' });

      return {
        success: true,
        data: blob,
        mimeType: this.mimeType,
        metadata: {
          format: ExportFormat.CSV,
          fileSize: blob.size,
          elementsCount: data.elements.length,
          exportDate: new Date(),
          processingTime: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        metadata: {
          format: ExportFormat.CSV,
          fileSize: 0,
          elementsCount: data.elements.length,
          exportDate: new Date(),
          processingTime: 0
        }
      };
    }
  }

  /**
   * Valide les données pour l'export CSV
   */
  validate(data: StandardizedExportData): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!data.elements || data.elements.length === 0) {
      warnings.push('No elements to export');
    }

    // CSV a des limitations sur les données complexes
    if (data.elements.some(el => el.features && el.features.length > 100)) {
      warnings.push('Some elements have many features which will be summarized in CSV');
    }

    // Vérifier les caractères spéciaux qui peuvent poser problème
    const hasSpecialChars = data.elements.some(el => {
      const text = JSON.stringify(el);
      return text.includes('\n') || text.includes('\r');
    });

    if (hasSpecialChars) {
      warnings.push('Some data contains line breaks which may affect CSV formatting');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Estime la taille du fichier CSV
   */
  estimateFileSize(data: StandardizedExportData): number {
    // Environ 200 caractères par ligne
    return data.elements.length * 200;
  }

  /**
   * Échappe les valeurs CSV
   */
  private escapeCSV(value: any): string {
    if (value == null) return '';

    const str = String(value);

    // Si contient virgule, guillemet ou saut de ligne, entourer de guillemets
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Formate un nombre
   */
  private formatNumber(value: number): string {
    if (isNaN(value)) return '0';
    return value.toFixed(2);
  }

  /**
   * Compte les features d'un type donné
   */
  private countFeatures(element: any, type: string): number {
    if (!element.features) return 0;

    if (Array.isArray(element.features)) {
      return element.features.filter((f: any) =>
        f.type?.toLowerCase().includes(type.toLowerCase())
      ).length;
    }

    // Si features est un objet avec holes, cuts, etc.
    if (type === 'hole' && element.features.holes) {
      return element.features.holes.length;
    }
    if (type === 'cut' && element.features.cuts) {
      return element.features.cuts.length;
    }

    return 0;
  }
}