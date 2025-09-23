/**
 * Interfaces centrales pour le système d'export unifié
 */

import { PivotElement } from '../../../../types/viewer';
import { PartElement } from '../../../part-builder/types/partBuilder.types';

/**
 * Formats d'export supportés
 */
export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  DSTV = 'DSTV',
  IFC = 'IFC',
  STEP = 'STEP',
  OBJ = 'OBJ',
  GLTF = 'GLTF',
  STL = 'STL',
  DXF = 'DXF',
  DWG = 'DWG'
}

/**
 * Types de données d'entrée supportés
 */
export type ExportInputData =
  | PivotElement[]
  | PartElement[]
  | any; // Pour supporter d'autres formats legacy

/**
 * Options d'export unifiées
 */
export interface UnifiedExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMeasurements?: boolean;
  includeMetadata?: boolean;
  includeFeatures?: boolean;
  compression?: boolean;
  units?: 'mm' | 'inch' | 'meter';
  encoding?: 'utf8' | 'ascii' | 'utf16';
  // Options spécifiques par format
  formatOptions?: Record<string, any>;
}

/**
 * Résultat d'export standard
 */
export interface ExportResult {
  success: boolean;
  data?: Blob | string | ArrayBuffer;
  filename?: string;
  mimeType?: string;
  error?: Error;
  metadata?: {
    format: ExportFormat;
    fileSize: number;
    elementsCount: number;
    exportDate: Date;
    processingTime: number;
    warnings?: string[];
  };
}

/**
 * Capacités d'un format d'export
 */
export interface FormatCapabilities {
  supportsGeometry: boolean;
  supportsFeatures: boolean;
  supportsMaterials: boolean;
  supportsMetadata: boolean;
  supportsMultipleElements: boolean;
  supportsHierarchy: boolean;
  supports3D: boolean;
  maxFileSize?: number;
  supportedFeatures?: string[];
}

/**
 * Données standardisées pour l'export
 */
export interface StandardizedExportData {
  elements: PivotElement[];
  metadata: {
    projectName?: string;
    author?: string;
    company?: string;
    createdDate: Date;
    modifiedDate?: Date;
    version?: string;
    units: 'mm' | 'inch' | 'meter';
  };
  options: UnifiedExportOptions;
}

/**
 * Interface pour les adapters de format
 */
export interface IFormatAdapter {
  readonly format: ExportFormat;
  readonly capabilities: FormatCapabilities;
  readonly mimeType: string;
  readonly fileExtension: string;

  /**
   * Transforme les données standardisées vers le format cible
   */
  transform(data: StandardizedExportData): Promise<ExportResult>;

  /**
   * Valide que les données peuvent être exportées dans ce format
   */
  validate(data: StandardizedExportData): ValidationResult;

  /**
   * Estime la taille du fichier de sortie
   */
  estimateFileSize?(data: StandardizedExportData): number;
}

/**
 * Interface pour les transformers de données
 */
export interface IDataTransformer<T = any> {
  /**
   * Identifiant unique du transformer
   */
  readonly name: string;

  /**
   * Transforme les données d'entrée vers le format standardisé
   */
  transform(input: T, options?: any): StandardizedExportData;

  /**
   * Vérifie si ce transformer supporte le type de données
   */
  supports(data: any): boolean;
}

/**
 * Résultat de validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Interface pour les processeurs de sortie
 */
export interface IOutputProcessor {
  /**
   * Process the output before download
   */
  process(data: any, options?: any): Promise<Blob | ArrayBuffer>;

  /**
   * Trigger download in browser
   */
  download(blob: Blob, filename: string): void;
}

/**
 * Configuration du système d'export
 */
export interface ExportSystemConfig {
  defaultFormat: ExportFormat;
  defaultUnits: 'mm' | 'inch' | 'meter';
  enableCompression: boolean;
  enableValidation: boolean;
  maxFileSize: number;
  adapters: Map<ExportFormat, IFormatAdapter>;
  transformers: Map<string, IDataTransformer>;
}