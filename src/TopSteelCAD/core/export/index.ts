/**
 * Point d'entrée principal du système d'export unifié
 */

import { ExportFormat } from './interfaces/index';

// Export du système principal
export { UniversalExporter, universalExporter, exportData } from './UniversalExporter';

// Export des interfaces
export {
  ExportFormat
} from './interfaces/index';

export type {
  ExportInputData,
  UnifiedExportOptions,
  ExportResult,
  StandardizedExportData,
  FormatCapabilities,
  ValidationResult,
  IFormatAdapter,
  IDataTransformer,
  IOutputProcessor,
  ExportSystemConfig
} from './interfaces/index';

// Export des adapters
export { JSONAdapter } from './adapters/JSONAdapter';
export { CSVAdapter } from './adapters/CSVAdapter';
export { DSTVAdapter } from './adapters/DSTVAdapter';

// Export des transformers
export { PivotElementTransformer } from './transformers/PivotElementTransformer';
export { PartElementTransformer } from './transformers/PartElementTransformer';

// Export des processeurs
export { BlobProcessor } from './processors/BlobProcessor';

/**
 * Fonction utilitaire pour export rapide
 */
export async function quickExport(
  data: any,
  format = ExportFormat.JSON,
  filename?: string
) {
  const { universalExporter } = await import('./UniversalExporter');
  return universalExporter.export(data, {
    format,
    filename: filename || `export_${Date.now()}.${format.toLowerCase()}`
  });
}

/**
 * Fonction pour obtenir les formats disponibles
 */
export function getAvailableFormats() {
  return Object.values(ExportFormat);
}

/**
 * Fonction pour obtenir l'extension de fichier d'un format
 */
export function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    [ExportFormat.JSON]: '.json',
    [ExportFormat.CSV]: '.csv',
    [ExportFormat.DSTV]: '.nc',
    [ExportFormat.IFC]: '.ifc',
    [ExportFormat.STEP]: '.step',
    [ExportFormat.OBJ]: '.obj',
    [ExportFormat.GLTF]: '.gltf',
    [ExportFormat.STL]: '.stl',
    [ExportFormat.DXF]: '.dxf',
    [ExportFormat.DWG]: '.dwg'
  };
  return extensions[format] || '.dat';
}

/**
 * Fonction pour obtenir le type MIME d'un format
 */
export function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    [ExportFormat.JSON]: 'application/json',
    [ExportFormat.CSV]: 'text/csv',
    [ExportFormat.DSTV]: 'text/plain',
    [ExportFormat.IFC]: 'application/x-step',
    [ExportFormat.STEP]: 'application/x-step',
    [ExportFormat.OBJ]: 'model/obj',
    [ExportFormat.GLTF]: 'model/gltf+json',
    [ExportFormat.STL]: 'model/stl',
    [ExportFormat.DXF]: 'application/dxf',
    [ExportFormat.DWG]: 'application/acad'
  };
  return mimeTypes[format] || 'application/octet-stream';
}