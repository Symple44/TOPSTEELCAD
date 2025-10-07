/**
 * Types pour l'export de bâtiments
 * Building Estimator - TopSteelCAD
 */

/**
 * Format d'export disponibles
 */
export enum ExportFormat {
  IFC = 'ifc',           // Industry Foundation Classes (prioritaire)
  JSON = 'json',         // Format JSON
  EXCEL = 'excel',       // Nomenclature Excel
  PDF = 'pdf',           // Plans + Nomenclature (Future)
  DXF = 'dxf',           // AutoCAD (Future)
  STEP = 'step'          // STEP (Future)
}

/**
 * Options d'export Excel
 */
export interface ExcelExportOptions {
  // Onglets à inclure
  includeNomenclature?: boolean;
  includeSummary?: boolean;
  includeDetailedList?: boolean;

  // Format
  includeHeaders?: boolean;
  includeFooters?: boolean;
  includeFormulas?: boolean;

  // Style
  useColors?: boolean;
  useBorders?: boolean;
  autoSize?: boolean;
}

/**
 * Options d'export JSON
 */
export interface JSONExportOptions {
  // Format
  pretty?: boolean;              // Formatage indenté
  indent?: number;               // Nombre d'espaces

  // Contenu
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeCalculations?: boolean;

  // Compression
  compress?: boolean;
}

/**
 * Options d'export PDF (Future)
 */
export interface PDFExportOptions {
  // Contenu
  includeNomenclature?: boolean;
  include3DViews?: boolean;
  includeDimensions?: boolean;

  // Format
  pageSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';

  // Style
  includeHeader?: boolean;
  includeFooter?: boolean;
  logo?: string;
}

/**
 * Options d'export génériques
 */
export interface ExportOptions {
  format: ExportFormat;
  fileName?: string;
  filePath?: string;

  // Options spécifiques par format
  excelOptions?: ExcelExportOptions;
  jsonOptions?: JSONExportOptions;
  pdfOptions?: PDFExportOptions;
}

/**
 * Résultat d'export
 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  fileName: string;
  filePath?: string;
  fileSize?: number;
  data?: Blob | string | ArrayBuffer;
  mimeType?: string;
  exportedAt: Date;
  duration?: number;        // Durée de l'export (ms)
  error?: string;
  warnings?: string[];
}

/**
 * Progression de l'export
 */
export interface ExportProgress {
  phase: 'preparing' | 'processing' | 'writing' | 'finalizing' | 'complete';
  progress: number;         // 0-100
  message?: string;
  currentItem?: string;
  totalItems?: number;
  processedItems?: number;
}

/**
 * Options de validation avant export
 */
export interface ExportValidationOptions {
  checkGeometry?: boolean;
  checkProperties?: boolean;
  checkReferences?: boolean;
  strict?: boolean;
}

/**
 * Résultat de validation
 */
export interface ExportValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    element?: string;
  }>;
}
