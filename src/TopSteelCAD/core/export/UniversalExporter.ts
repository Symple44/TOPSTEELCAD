/**
 * UniversalExporter - Système d'export centralisé pour TopSteelCAD
 *
 * Point d'entrée unique pour tous les exports du projet.
 * Gère la transformation des données, la sélection du bon adapter,
 * et le traitement de sortie.
 */

import {
  ExportFormat,
  ExportInputData,
  UnifiedExportOptions,
  ExportResult,
  StandardizedExportData,
  IFormatAdapter,
  IDataTransformer,
  IOutputProcessor,
  ExportSystemConfig
} from './interfaces';

import { PivotElementTransformer } from './transformers/PivotElementTransformer';
import { PartElementTransformer } from './transformers/PartElementTransformer';

// Adapters seront importés ici
import { JSONAdapter } from './adapters/JSONAdapter';
import { CSVAdapter } from './adapters/CSVAdapter';
import { DSTVAdapter } from './adapters/DSTVAdapter';
// import { IFCAdapter } from './adapters/IFCAdapter';
// import { STEPAdapter } from './adapters/STEPAdapter';

import { BlobProcessor } from './processors/BlobProcessor';

/**
 * Classe principale du système d'export unifié
 */
export class UniversalExporter {
  private static instance: UniversalExporter;
  private config: ExportSystemConfig;
  private adapters: Map<ExportFormat, IFormatAdapter>;
  private transformers: Map<string, IDataTransformer>;
  private outputProcessor: IOutputProcessor;

  private constructor() {
    this.adapters = new Map();
    this.transformers = new Map();
    this.outputProcessor = new BlobProcessor();

    // Configuration par défaut
    this.config = {
      defaultFormat: ExportFormat.JSON,
      defaultUnits: 'mm',
      enableCompression: false,
      enableValidation: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      adapters: this.adapters,
      transformers: this.transformers
    };

    this.registerDefaultComponents();
  }

  /**
   * Singleton pattern pour une instance unique
   */
  public static getInstance(): UniversalExporter {
    if (!UniversalExporter.instance) {
      UniversalExporter.instance = new UniversalExporter();
    }
    return UniversalExporter.instance;
  }

  /**
   * Enregistre les composants par défaut
   */
  private registerDefaultComponents(): void {
    // Enregistrer les transformers
    this.registerTransformer(new PivotElementTransformer());
    this.registerTransformer(new PartElementTransformer());

    // Enregistrer les adapters
    this.registerAdapter(new JSONAdapter());
    this.registerAdapter(new CSVAdapter());
    this.registerAdapter(new DSTVAdapter());
    // this.registerAdapter(new IFCAdapter());
    // this.registerAdapter(new STEPAdapter());
  }

  /**
   * Enregistre un adapter de format
   */
  public registerAdapter(adapter: IFormatAdapter): void {
    this.adapters.set(adapter.format, adapter);
    console.log(`✅ Registered adapter for format: ${adapter.format}`);
  }

  /**
   * Enregistre un transformer de données
   */
  public registerTransformer(transformer: IDataTransformer): void {
    this.transformers.set(transformer.name, transformer);
    console.log(`✅ Registered transformer: ${transformer.name}`);
  }

  /**
   * Méthode principale d'export
   */
  public async export(
    data: ExportInputData,
    options: UnifiedExportOptions
  ): Promise<ExportResult> {
    const startTime = performance.now();

    try {
      console.log(`🚀 Starting export to ${options.format}...`);

      // 1. Standardiser les données
      const standardizedData = await this.standardizeData(data, options);

      // 2. Valider si nécessaire
      if (this.config.enableValidation) {
        const validation = await this.validateExport(standardizedData, options.format);
        if (!validation.valid) {
          return {
            success: false,
            error: new Error(`Validation failed: ${validation.errors?.join(', ')}`),
            metadata: {
              format: options.format,
              fileSize: 0,
              elementsCount: standardizedData.elements.length,
              exportDate: new Date(),
              processingTime: performance.now() - startTime,
              warnings: validation.warnings
            }
          };
        }
      }

      // 3. Sélectionner l'adapter approprié
      const adapter = this.getAdapter(options.format);
      if (!adapter) {
        throw new Error(`No adapter found for format: ${options.format}`);
      }

      // 4. Transformer les données
      const result = await adapter.transform(standardizedData);

      // 5. Ajouter les métadonnées de timing
      if (result.metadata) {
        result.metadata.processingTime = performance.now() - startTime;
      }

      // 6. Déclencher le téléchargement si demandé
      if (result.success && result.data && options.filename) {
        await this.downloadFile(result, options.filename);
      }

      console.log(`✅ Export completed in ${(performance.now() - startTime).toFixed(2)}ms`);
      return result;

    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error as Error,
        metadata: {
          format: options.format,
          fileSize: 0,
          elementsCount: Array.isArray(data) ? data.length : 0,
          exportDate: new Date(),
          processingTime: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Standardise les données d'entrée
   */
  private async standardizeData(
    data: ExportInputData,
    options: UnifiedExportOptions
  ): Promise<StandardizedExportData> {
    // Trouver un transformer qui supporte ce type de données
    for (const transformer of this.transformers.values()) {
      if (transformer.supports(data)) {
        return transformer.transform(data, options);
      }
    }

    // Si aucun transformer spécifique, utiliser le transformer par défaut
    console.warn('⚠️ No specific transformer found, using default');
    return {
      elements: Array.isArray(data) ? data : [data],
      metadata: {
        createdDate: new Date(),
        units: options.units || 'mm'
      },
      options
    };
  }

  /**
   * Valide les données pour un format donné
   */
  private async validateExport(
    data: StandardizedExportData,
    format: ExportFormat
  ): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    const adapter = this.getAdapter(format);
    if (!adapter) {
      return {
        valid: false,
        errors: [`No adapter found for format: ${format}`]
      };
    }

    return adapter.validate(data);
  }

  /**
   * Récupère un adapter par format
   */
  private getAdapter(format: ExportFormat): IFormatAdapter | undefined {
    return this.adapters.get(format);
  }

  /**
   * Télécharge le fichier exporté
   */
  private async downloadFile(result: ExportResult, filename: string): Promise<void> {
    if (!result.data) return;

    let blob: Blob;
    if (result.data instanceof Blob) {
      blob = result.data;
    } else if (typeof result.data === 'string') {
      blob = new Blob([result.data], { type: result.mimeType || 'text/plain' });
    } else {
      blob = new Blob([result.data], { type: result.mimeType || 'application/octet-stream' });
    }

    this.outputProcessor.download(blob, filename);
  }

  /**
   * Méthode statique pour export rapide
   */
  public static async exportData(
    data: ExportInputData,
    format: ExportFormat,
    filename?: string
  ): Promise<ExportResult> {
    const exporter = UniversalExporter.getInstance();
    return exporter.export(data, {
      format,
      filename: filename || `export_${Date.now()}.${format.toLowerCase()}`
    });
  }

  /**
   * Récupère les formats supportés
   */
  public getSupportedFormats(): ExportFormat[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Récupère les capacités d'un format
   */
  public getFormatCapabilities(format: ExportFormat) {
    const adapter = this.getAdapter(format);
    return adapter?.capabilities;
  }

  /**
   * Configure le système d'export
   */
  public configure(config: Partial<ExportSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Réinitialise le système
   */
  public reset(): void {
    this.adapters.clear();
    this.transformers.clear();
    this.registerDefaultComponents();
  }
}

// Export de l'instance singleton pour faciliter l'utilisation
export const universalExporter = UniversalExporter.getInstance();

// Export des méthodes utilitaires
export const exportData = UniversalExporter.exportData;