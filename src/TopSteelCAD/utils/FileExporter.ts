import { PivotElement } from '@/types/viewer';
import { JSONExporter, DSTVExporter, CSVExporter } from './exporters';

/**
 * Types de formats d'export supportés
 */
export type ExportFormat = 'json' | 'dstv' | 'obj' | 'gltf' | 'csv';

/**
 * Options d'export
 */
export interface ExportOptions {
  format: ExportFormat;
  fileName?: string;
  includeMetadata?: boolean;
  includeFeatures?: boolean;
  precision?: number;
  selectedOnly?: boolean;
}

/**
 * Résultat d'un export
 */
export interface ExportResult {
  success: boolean;
  fileName?: string;
  data?: string | Blob;
  error?: string;
  metadata?: {
    format: ExportFormat;
    elementsCount: number;
    fileSize: number;
    exportDate: Date;
  };
}

/**
 * FileExporter - Gestionnaire d'export de scènes CAO
 * 
 * Architecture modulaire avec un exportateur spécialisé par format :
 * - JSON : Format natif TopSteelCAD avec toutes les données
 * - DSTV : Standard allemand pour structures acier (NC1 files)
 * - CSV : Données tabulaires pour analyse et BOM
 * - OBJ : Géométries 3D (à venir)
 * - GLTF : Modèles 3D complets (à venir)
 */
export class FileExporter {

  /**
   * Export principal - dispatch vers le bon exportateur
   */
  static async exportScene(
    elements: PivotElement[], 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log('📥 FileExporter.exportScene appelé avec:', {
        elementsCount: elements?.length,
        format: options.format,
        options
      });
      
      // Les éléments sont déjà filtrés par ProfessionalViewer si nécessaire
      // On utilise directement les éléments passés
      const elementsToExport = elements;

      if (!elementsToExport || elementsToExport.length === 0) {
        console.error('❌ FileExporter: Aucun élément à exporter');
        return {
          success: false,
          error: 'Aucun élément à exporter'
        };
      }

      console.log(`✅ FileExporter: ${elementsToExport.length} éléments à exporter en format ${options.format}`);
      
      // Générer le nom de fichier par défaut
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFileName = `TopSteelCAD_${timestamp}`;
      
      let fileName = options.fileName || defaultFileName;
      
      // S'assurer que l'extension est correcte
      const extension = this.getFileExtension(options.format);
      if (!fileName.endsWith(extension)) {
        fileName = `${fileName}${extension}`;
      }

      // Dispatcher vers le bon exportateur
      let result: ExportResult;
      
      switch (options.format) {
        case 'json':
          result = await JSONExporter.export(elementsToExport, fileName, options);
          break;
          
        case 'dstv':
          result = await DSTVExporter.export(elementsToExport, fileName, options);
          break;
          
        case 'csv':
          result = await CSVExporter.export(elementsToExport, fileName, options);
          break;
          
        case 'obj':
          result = await this.exportOBJ(elementsToExport, fileName, options);
          break;
          
        case 'gltf':
          result = await this.exportGLTF(elementsToExport, fileName, options);
          break;
          
        default:
          return {
            success: false,
            error: `Format d'export non supporté: ${options.format}`
          };
      }

      // Déclencher le téléchargement si succès
      if (result.success && result.data instanceof Blob) {
        this.downloadBlob(result.data, result.fileName || fileName);
      }

      return result;
      
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: `Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Export OBJ (géométries 3D) - À développer
   */
  private static async exportOBJ(
    _elements: PivotElement[], 
    _fileName: string, 
    _options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      error: 'Export OBJ en cours de développement. Utilisez le format JSON ou DSTV.'
    };
  }

  /**
   * Export GLTF (modèles 3D complets) - À développer
   */
  private static async exportGLTF(
    _elements: PivotElement[], 
    _fileName: string, 
    _options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      error: 'Export GLTF en cours de développement. Utilisez le format JSON ou DSTV.'
    };
  }

  /**
   * Retourne l'extension de fichier appropriée selon le format
   */
  private static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'json': return '.json';
      case 'dstv': return '.zip'; // ZIP contenant les fichiers NC1
      case 'csv': return '.csv';
      case 'obj': return '.obj';
      case 'gltf': return '.gltf';
      default: return '.dat';
    }
  }

  /**
   * Déclenche le téléchargement d'un blob
   */
  private static downloadBlob(blob: Blob, fileName: string) {
    // Vérifier si on est dans un environnement de test
    if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
      console.log('📥 Mode test détecté - téléchargement simulé pour:', fileName);
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Nettoyage
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Utilitaire : export rapide avec options par défaut
   */
  static async quickExport(
    elements: PivotElement[], 
    format: ExportFormat = 'json'
  ): Promise<ExportResult> {
    return this.exportScene(elements, {
      format,
      includeMetadata: true,
      includeFeatures: true,
      precision: 2
    });
  }

  /**
   * Utilitaire : export de la sélection uniquement
   */
  static async exportSelection(
    elements: PivotElement[], 
    format: ExportFormat = 'json'
  ): Promise<ExportResult> {
    return this.exportScene(elements, {
      format,
      selectedOnly: true,
      includeMetadata: true,
      includeFeatures: true,
      precision: 2
    });
  }
}