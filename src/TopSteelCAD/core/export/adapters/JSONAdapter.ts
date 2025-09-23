/**
 * Adapter pour l'export JSON
 */

import {
  IFormatAdapter,
  ExportFormat,
  FormatCapabilities,
  StandardizedExportData,
  ExportResult,
  ValidationResult
} from '../interfaces';

export class JSONAdapter implements IFormatAdapter {
  readonly format = ExportFormat.JSON;
  readonly mimeType = 'application/json';
  readonly fileExtension = '.json';

  readonly capabilities: FormatCapabilities = {
    supportsGeometry: true,
    supportsFeatures: true,
    supportsMaterials: true,
    supportsMetadata: true,
    supportsMultipleElements: true,
    supportsHierarchy: true,
    supports3D: true,
    supportedFeatures: ['all'] // Supporte tout
  };

  /**
   * Transforme vers JSON
   */
  async transform(data: StandardizedExportData): Promise<ExportResult> {
    try {
      const jsonData = {
        version: '1.0.0',
        format: 'TopSteelCAD JSON Export',
        exportDate: new Date().toISOString(),
        metadata: data.metadata,
        elements: data.elements.map(element => {
          // Garder les données originales si disponibles
          if (element.metadata?.originalElement) {
            return element.metadata.originalElement;
          }
          return element;
        }),
        statistics: {
          totalElements: data.elements.length,
          totalHoles: data.elements.reduce((acc, el) =>
            acc + (el.features?.filter(f => typeof f.type === 'string' && f.type.toUpperCase() === 'HOLE').length || 0), 0
          ),
          totalCuts: data.elements.reduce((acc, el) =>
            acc + (el.features?.filter(f => typeof f.type === 'string' && f.type.toUpperCase() === 'CUT').length || 0), 0
          ),
          materials: this.extractMaterials(data.elements),
          profiles: this.extractProfiles(data.elements)
        }
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: this.mimeType });

      return {
        success: true,
        data: blob,
        mimeType: this.mimeType,
        metadata: {
          format: ExportFormat.JSON,
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
          format: ExportFormat.JSON,
          fileSize: 0,
          elementsCount: data.elements.length,
          exportDate: new Date(),
          processingTime: 0
        }
      };
    }
  }

  /**
   * Valide les données pour l'export JSON
   */
  validate(data: StandardizedExportData): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // JSON peut exporter presque tout, mais on vérifie les bases
    if (!data.elements || data.elements.length === 0) {
      warnings.push('No elements to export');
    }

    // Vérifier la taille estimée
    const estimatedSize = this.estimateFileSize(data);
    if (estimatedSize > 50 * 1024 * 1024) { // 50MB
      warnings.push(`Large file size estimated: ${Math.round(estimatedSize / 1024 / 1024)}MB`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Estime la taille du fichier JSON
   */
  estimateFileSize(data: StandardizedExportData): number {
    // Estimation approximative basée sur la stringification d'un échantillon
    const sample = data.elements.slice(0, 10);
    const sampleSize = JSON.stringify(sample).length;
    const avgElementSize = sampleSize / Math.min(10, data.elements.length);
    return avgElementSize * data.elements.length;
  }

  /**
   * Extrait la liste unique des matériaux
   */
  private extractMaterials(elements: any[]): string[] {
    const materials = new Set<string>();
    elements.forEach(el => {
      if (el.material) {
        if (typeof el.material === 'string') {
          materials.add(el.material);
        } else if (el.material.grade) {
          materials.add(el.material.grade);
        }
      }
    });
    return Array.from(materials);
  }

  /**
   * Extrait la liste unique des profils
   */
  private extractProfiles(elements: any[]): string[] {
    const profiles = new Set<string>();
    elements.forEach(el => {
      if (el.profile) {
        profiles.add(el.profile);
      } else if (el.profileType && el.profileSubType) {
        profiles.add(`${el.profileType} ${el.profileSubType}`);
      }
    });
    return Array.from(profiles);
  }
}