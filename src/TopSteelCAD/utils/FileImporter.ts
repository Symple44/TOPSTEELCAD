import { PivotElement, MaterialType } from '@/types/viewer';

/**
 * Types de fichiers supportés pour l'import
 */
export type SupportedFileType = 'json' | 'dstv' | 'dwg' | 'ifc' | 'obj' | 'gltf' | 'unknown';

/**
 * Résultat d'un import de fichier
 */
export interface ImportResult {
  success: boolean;
  elements?: PivotElement[];
  error?: string;
  warnings?: string[];
  metadata?: {
    fileName: string;
    fileSize: number;
    format: SupportedFileType;
    elementsCount: number;
    importDate: Date;
  };
}

/**
 * FileImporter - Gestionnaire d'import de fichiers CAO
 * 
 * Supporte les formats principaux :
 * - JSON : Format natif TopSteelCAD
 * - DSTV : Standard allemand pour structures acier
 * - OBJ : Géométries 3D simples
 * - GLTF : Modèles 3D avec matériaux
 */
export class FileImporter {
  
  /**
   * Détermine le type de fichier basé sur l'extension
   */
  static getFileType(file: File): SupportedFileType {
    const extension = file.name.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'json':
        return 'json';
      // Formats DSTV/NC standards
      case 'nc':
      case 'nc1':
      case 'nc2':
      case 'nc3':
      case 'nc4':
      case 'nc5':
      case 'nc6':
      case 'nc7':
      case 'nc8':
      case 'nc9':
        return 'dstv';
      case 'dwg':
        return 'dwg';
      case 'ifc':
        return 'ifc';
      case 'obj':
        return 'obj';
      case 'gltf':
      case 'glb':
        return 'gltf';
      default:
        return 'unknown';
    }
  }

  /**
   * Import principal - dispatch vers le bon parser
   */
  static async importFile(file: File): Promise<ImportResult> {
    const fileType = this.getFileType(file);
    
    try {
      switch (fileType) {
        case 'json':
          return await this.importJSON(file);
        case 'dstv':
          return await this.importDSTV(file);
        case 'obj':
          return await this.importOBJ(file);
        case 'gltf':
          return await this.importGLTF(file);
        default:
          return {
            success: false,
            error: `Format de fichier non supporté: ${file.name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Import JSON (format natif)
   */
  private static async importJSON(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Valider la structure
          if (!Array.isArray(data.elements)) {
            resolve({
              success: false,
              error: 'Format JSON invalide: propriété "elements" manquante ou incorrecte'
            });
            return;
          }
          
          // Convertir et valider les éléments
          const elements = data.elements.map((el: any, index: number) => {
            return {
              id: el.id || `imported-${Date.now()}-${index}`,
              name: el.name || `Élément ${index + 1}`,
              materialType: el.materialType || MaterialType.BEAM,
              dimensions: el.dimensions || { length: 1000, width: 100, height: 100, thickness: 10 },
              position: el.position || [0, 0, 0],
              rotation: el.rotation || [0, 0, 0],
              material: el.material || { name: 'S355', density: 7850, elasticModulus: 210000 },
              features: el.features || [],
              metadata: el.metadata || {},
              sourceFormat: 'json' as const,
              visible: true,
              createdAt: new Date(),
              ...el
            } as PivotElement;
          });
          
          resolve({
            success: true,
            elements,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              format: 'json',
              elementsCount: elements.length,
              importDate: new Date()
            }
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Erreur de parsing JSON: ${error instanceof Error ? error.message : 'Format invalide'}`
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Erreur de lecture du fichier'
        });
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Import DSTV (format acier allemand)
   * Utilise le nouveau système DSTV modulaire via DSTVImportAdapter
   */
  private static async importDSTV(file: File): Promise<ImportResult> {
    try {
      // Utiliser le nouveau système modulaire
      const { DSTVImportAdapter } = await import('../plugins/dstv/DSTVImportAdapter');
      const result = await DSTVImportAdapter.importFile(file);
      
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'import DSTV:', error);
      return {
        success: false,
        error: `Erreur lors de l'import DSTV: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Import OBJ (géométries 3D)
   */
  private static async importOBJ(_file: File): Promise<ImportResult> {
    // Parser OBJ basique - à développer selon les besoins
    return {
      success: false,
      error: 'Import OBJ non implémenté - développement en cours'
    };
  }

  /**
   * Import GLTF (modèles 3D complets)
   */
  private static async importGLTF(_file: File): Promise<ImportResult> {
    // Parser GLTF - à développer selon les besoins
    return {
      success: false,
      error: 'Import GLTF non implémenté - développement en cours'
    };
  }
}