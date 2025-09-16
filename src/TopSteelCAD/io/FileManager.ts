/**
 * FileManager - Gestionnaire de fichiers pour TopSteelCAD
 * 
 * Gère l'import/export de fichiers dans différents formats industriels
 */

import { PivotElement, PivotScene, FileParser } from '@/types/viewer';
// import { DSTVPlugin } from '../plugins/dstv/DSTVPlugin';
import { EventBus } from '../core/EventBus';

/**
 * Formats de fichiers supportés
 */
export enum FileFormat {
  // Formats industriels
  DSTV = 'dstv',     // Format allemand pour structures métalliques
  IFC = 'ifc',       // Industry Foundation Classes
  STEP = 'step',     // Standard for Exchange of Product model data
  DWG = 'dwg',       // AutoCAD Drawing
  DXF = 'dxf',       // Drawing Exchange Format
  
  // Formats 3D génériques
  OBJ = 'obj',       // Wavefront OBJ
  STL = 'stl',       // Stereolithography
  GLTF = 'gltf',     // GL Transmission Format
  GLB = 'glb',       // Binary GLTF
  FBX = 'fbx',       // Autodesk FBX
  
  // Formats internes
  JSON = 'json',     // Format JSON TopSteel
  PIVOT = 'pivot'    // Format Pivot natif
}

/**
 * Options d'import
 */
export interface ImportOptions {
  format?: FileFormat;
  unit?: 'mm' | 'inch' | 'm';
  coordinateSystem?: 'right' | 'left';
  mergeIdentical?: boolean;
  generateIds?: boolean;
  validateGeometry?: boolean;
}

/**
 * Options d'export
 */
export interface ExportOptions {
  format: FileFormat;
  unit?: 'mm' | 'inch' | 'm';
  precision?: number;
  includeMetadata?: boolean;
  includeHierarchy?: boolean;
  compressed?: boolean;
}

/**
 * Résultat d'import
 */
export interface ImportResult {
  success: boolean;
  scene?: PivotScene;
  elements?: PivotElement[];
  errors: string[];
  warnings: string[];
  statistics: {
    totalElements: number;
    importedElements: number;
    failedElements: number;
    processingTime: number;
  };
}

/**
 * Résultat d'export
 */
export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename?: string;
  errors: string[];
  statistics: {
    totalElements: number;
    exportedElements: number;
    fileSize: number;
    processingTime: number;
  };
}

/**
 * Gestionnaire de fichiers principal
 */
export class FileManager {
  private parsers: Map<FileFormat, FileParser> = new Map();
  private eventBus: EventBus;
  
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || EventBus.getInstance();
    this.registerDefaultParsers();
  }
  
  /**
   * Enregistre les parseurs par défaut
   */
  private registerDefaultParsers(): void {
    // DSTV Plugin avec support des contours et architecture modulaire
    // TODO: DSTVPlugin needs to implement FileParser interface
    // this.parsers.set(FileFormat.DSTV, new DSTVPlugin());
    
    // TODO: Ajouter les autres parseurs
    // this.parsers.set(FileFormat.IFC, new IFCParser());
    // this.parsers.set(FileFormat.STEP, new STEPParser());
    // this.parsers.set(FileFormat.DXF, new DXFParser());
  }
  
  /**
   * Enregistre un parseur personnalisé
   */
  registerParser(format: FileFormat, parser: FileParser): void {
    this.parsers.set(format, parser);
    this.eventBus.emit('filemanager:parser-registered', { format });
  }
  
  /**
   * Importe un fichier
   */
  async importFile(file: File, options: ImportOptions = {}): Promise<ImportResult> {
    const startTime = performance.now();
    
    try {
      // Déterminer le format
      const format = options.format || this.detectFormat(file.name);
      if (!format) {
        return {
          success: false,
          errors: [`Format de fichier non reconnu: ${file.name}`],
          warnings: [],
          statistics: {
            totalElements: 0,
            importedElements: 0,
            failedElements: 0,
            processingTime: performance.now() - startTime
          }
        };
      }
      
      // Obtenir le parseur
      const parser = this.parsers.get(format);
      if (!parser) {
        return {
          success: false,
          errors: [`Pas de parseur disponible pour le format: ${format}`],
          warnings: [],
          statistics: {
            totalElements: 0,
            importedElements: 0,
            failedElements: 0,
            processingTime: performance.now() - startTime
          }
        };
      }
      
      // Lire le fichier
      const content = await this.readFile(file);
      
      // Valider le fichier
      if (!parser.validate(content)) {
        return {
          success: false,
          errors: [`Le fichier n'est pas un fichier ${format} valide`],
          warnings: [],
          statistics: {
            totalElements: 0,
            importedElements: 0,
            failedElements: 0,
            processingTime: performance.now() - startTime
          }
        };
      }
      
      // Parser le fichier
      this.eventBus.emit('filemanager:import-start', { file: file.name, format });
      const scene = await parser.parse(content);
      
      // Post-traitement
      if (options.generateIds) {
        this.regenerateIds(scene);
      }
      
      if (options.mergeIdentical) {
        this.mergeIdenticalElements(scene);
      }
      
      if (options.validateGeometry) {
        this.validateGeometry(scene);
      }
      
      // Convertir en array d'éléments
      const elements = Array.from(scene.elements.values());
      
      this.eventBus.emit('filemanager:import-complete', { 
        file: file.name, 
        format,
        elementCount: elements.length 
      });
      
      return {
        success: true,
        scene,
        elements,
        errors: [],
        warnings: [],
        statistics: {
          totalElements: elements.length,
          importedElements: elements.length,
          failedElements: 0,
          processingTime: performance.now() - startTime
        }
      };
      
    } catch (error) {
      this.eventBus.emit('filemanager:import-error', { error });
      
      return {
        success: false,
        errors: [`Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
        warnings: [],
        statistics: {
          totalElements: 0,
          importedElements: 0,
          failedElements: 0,
          processingTime: performance.now() - startTime
        }
      };
    }
  }
  
  /**
   * Exporte des éléments
   */
  async exportElements(elements: PivotElement[], options: ExportOptions): Promise<ExportResult> {
    const startTime = performance.now();
    
    try {
      this.eventBus.emit('filemanager:export-start', { 
        format: options.format,
        elementCount: elements.length 
      });
      
      let data: string | Blob;
      let filename: string;
      
      switch (options.format) {
        case FileFormat.JSON:
        case FileFormat.PIVOT:
          data = this.exportToJSON(elements, options);
          filename = `export-${Date.now()}.json`;
          break;
          
        case FileFormat.DSTV:
          data = this.exportToDSTV(elements, options);
          filename = `export-${Date.now()}.nc`;
          break;
          
        case FileFormat.DXF:
          data = this.exportToDXF(elements, options);
          filename = `export-${Date.now()}.dxf`;
          break;
          
        default:
          throw new Error(`Format d'export non supporté: ${options.format}`);
      }
      
      // Créer le blob
      const blob = typeof data === 'string' 
        ? new Blob([data], { type: this.getMimeType(options.format) })
        : data;
      
      this.eventBus.emit('filemanager:export-complete', { 
        format: options.format,
        fileSize: blob.size 
      });
      
      return {
        success: true,
        data: blob,
        filename,
        errors: [],
        statistics: {
          totalElements: elements.length,
          exportedElements: elements.length,
          fileSize: blob.size,
          processingTime: performance.now() - startTime
        }
      };
      
    } catch (error) {
      this.eventBus.emit('filemanager:export-error', { error });
      
      return {
        success: false,
        errors: [`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
        statistics: {
          totalElements: elements.length,
          exportedElements: 0,
          fileSize: 0,
          processingTime: performance.now() - startTime
        }
      };
    }
  }
  
  /**
   * Télécharge un fichier exporté
   */
  downloadFile(result: ExportResult): void {
    if (!result.success || !result.data || !result.filename) {
      console.error('Impossible de télécharger: résultat d\'export invalide');
      return;
    }
    
    const blob = typeof result.data === 'string' 
      ? new Blob([result.data], { type: 'text/plain' })
      : result.data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.eventBus.emit('filemanager:download-complete', { filename: result.filename });
  }
  
  /**
   * Lit un fichier et retourne son contenu
   */
  private async readFile(file: File): Promise<ArrayBuffer | string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result) {
          // Si c'est un fichier texte, le convertir en string
          if (file.type.includes('text') || this.isTextFormat(file.name)) {
            resolve(typeof result === 'string' ? result : new TextDecoder().decode(result as ArrayBuffer));
          } else {
            resolve(result as ArrayBuffer);
          }
        } else {
          reject(new Error('Impossible de lire le fichier'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      
      // Lire comme ArrayBuffer pour la compatibilité
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Détecte le format d'un fichier basé sur son extension
   */
  private detectFormat(filename: string): FileFormat | null {
    const ext = filename.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'nc':
      case 'nc1':
      case 'dstv':
        return FileFormat.DSTV;
      case 'ifc':
        return FileFormat.IFC;
      case 'step':
      case 'stp':
        return FileFormat.STEP;
      case 'dwg':
        return FileFormat.DWG;
      case 'dxf':
        return FileFormat.DXF;
      case 'obj':
        return FileFormat.OBJ;
      case 'stl':
        return FileFormat.STL;
      case 'gltf':
        return FileFormat.GLTF;
      case 'glb':
        return FileFormat.GLB;
      case 'fbx':
        return FileFormat.FBX;
      case 'json':
        return FileFormat.JSON;
      case 'pivot':
        return FileFormat.PIVOT;
      default:
        return null;
    }
  }
  
  /**
   * Vérifie si un format est textuel
   */
  private isTextFormat(filename: string): boolean {
    const textFormats = ['.nc', '.nc1', '.dstv', '.ifc', '.step', '.stp', '.dxf', '.obj', '.gltf', '.json', '.pivot'];
    return textFormats.some(ext => filename.toLowerCase().endsWith(ext));
  }
  
  /**
   * Obtient le type MIME pour un format
   */
  private getMimeType(format: FileFormat): string {
    switch (format) {
      case FileFormat.JSON:
      case FileFormat.PIVOT:
        return 'application/json';
      case FileFormat.DSTV:
        return 'text/plain';
      case FileFormat.DXF:
        return 'application/dxf';
      case FileFormat.IFC:
        return 'application/x-step';
      case FileFormat.GLTF:
        return 'model/gltf+json';
      case FileFormat.GLB:
        return 'model/gltf-binary';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * Régénère les IDs des éléments
   */
  private regenerateIds(scene: PivotScene): void {
    const newElements = new Map<string, PivotElement>();
    let index = 0;
    
    scene.elements.forEach(element => {
      const newId = `element-${++index}`;
      element.id = newId;
      newElements.set(newId, element);
    });
    
    scene.elements = newElements;
    scene.rootElementIds = Array.from(newElements.keys());
  }
  
  /**
   * Fusionne les éléments identiques
   */
  private mergeIdenticalElements(scene: PivotScene): void {
    const elementGroups = new Map<string, PivotElement[]>();
    const mergedElements = new Map<string, PivotElement>();
    
    // Grouper les éléments par signature unique
    scene.elements.forEach(element => {
      const signature = this.getElementSignature(element);
      
      if (!elementGroups.has(signature)) {
        elementGroups.set(signature, []);
      }
      elementGroups.get(signature)!.push(element);
    });
    
    // Fusionner les groupes d'éléments identiques
    elementGroups.forEach((elements, signature) => {
      if (elements.length > 1) {
        // Garder le premier élément comme référence
        const mergedElement = { ...elements[0] };
        
        // Ajouter les informations de fusion
        mergedElement.metadata = {
          ...mergedElement.metadata,
          mergedCount: elements.length,
          originalIds: elements.map(el => el.id),
          mergeDate: new Date().toISOString()
        };
        
        // Mettre à jour le nom pour indiquer la fusion
        mergedElement.name = `${mergedElement.name} (x${elements.length})`;
        
        mergedElements.set(mergedElement.id, mergedElement);
        
        // Émettre un événement de fusion
        this.eventBus.emit('filemanager:elements-merged', {
          originalCount: elements.length,
          mergedElement,
          signature
        });
      } else {
        // Garder l'élément unique tel quel
        mergedElements.set(elements[0].id, elements[0]);
      }
    });
    
    // Remplacer les éléments dans la scène
    scene.elements = mergedElements;
    
    console.log(`🔄 Fusion terminée: ${scene.elements.size} éléments (depuis ${elementGroups.size} groupes)`);
  }
  
  /**
   * Génère une signature unique pour un élément
   */
  private getElementSignature(element: PivotElement): string {
    const parts = [
      element.materialType,
      (element.material as any)?.designation || 'unknown',
      Math.round(element.dimensions.length),
      Math.round(element.dimensions.width || 0),
      Math.round(element.dimensions.height || 0),
      (element as any).profile || 'none'
    ];
    
    // Ajouter les features si présentes
    if ((element as any).features && Array.isArray((element as any).features)) {
      const features = (element as any).features;
      const featureSignature = features
        .map((f: any) => `${f.type}-${Math.round(f.position?.x || 0)}-${Math.round(f.position?.y || 0)}`)
        .sort()
        .join('|');
      parts.push(featureSignature);
    }
    
    return parts.join('-');
  }
  
  /**
   * Valide la géométrie des éléments
   */
  private validateGeometry(scene: PivotScene): void {
    scene.elements.forEach(element => {
      // Vérifier les dimensions
      if (element.dimensions.length <= 0) {
        element.dimensions.length = 1000; // Valeur par défaut
      }
      if (element.dimensions.width <= 0) {
        element.dimensions.width = 100;
      }
      if (element.dimensions.thickness <= 0) {
        element.dimensions.thickness = 10;
      }
      
      // Vérifier les positions
      if (!Array.isArray(element.position) || element.position.length !== 3) {
        element.position = [0, 0, 0];
      }
      
      // Vérifier les rotations
      if (!Array.isArray(element.rotation) || element.rotation.length !== 3) {
        element.rotation = [0, 0, 0];
      }
      
      // Vérifier l'échelle
      if (!Array.isArray(element.scale) || element.scale.length !== 3) {
        element.scale = [1, 1, 1];
      }
    });
  }
  
  /**
   * Exporte vers JSON
   */
  private exportToJSON(elements: PivotElement[], options: ExportOptions): string {
    const data = {
      version: '2.0.0',
      format: 'TopSteelCAD',
      exportDate: new Date().toISOString(),
      unit: options.unit || 'mm',
      elements: options.includeMetadata ? elements : elements.map(e => ({
        ...e,
        metadata: undefined,
        originalData: undefined
      }))
    };
    
    return options.compressed 
      ? JSON.stringify(data)
      : JSON.stringify(data, null, 2);
  }
  
  /**
   * Exporte vers DSTV
   */
  private exportToDSTV(elements: PivotElement[], options: ExportOptions): string {
    let dstv = '';
    
    // En-tête DSTV
    dstv += `ST TopSteelCAD Export ${new Date().toISOString()}\n`;
    dstv += `PU ${options.unit || 'mm'}\n`;
    
    // Exporter chaque élément
    elements.forEach((element, index) => {
      // Profil
      dstv += `AK ${element.name || `PROFILE${index}`} `;
      dstv += `${element.dimensions.length} `;
      dstv += `${element.dimensions.height || element.dimensions.width} `;
      dstv += `${element.dimensions.width} `;
      dstv += `${element.dimensions.thickness}\n`;
      
      // Position
      if (element.position[0] !== 0 || element.position[1] !== 0 || element.position[2] !== 0) {
        dstv += `KO Position: ${element.position.join(' ')}\n`;
      }
      
      // Features
      if (element.metadata?.features) {
        element.metadata.features.forEach((feature: any) => {
          if (feature.type === 'hole') {
            dstv += `BO ${feature.diameter} ${feature.position.join(' ')}\n`;
          } else if (feature.type === 'slot') {
            dstv += `SI ${feature.length} ${feature.width} ${feature.position.join(' ')}\n`;
          }
        });
      }
    });
    
    // Fin
    dstv += 'EN\n';
    
    return dstv;
  }
  
  /**
   * Exporte vers DXF
   */
  private exportToDXF(elements: PivotElement[], _options: ExportOptions): string {
    // Format DXF simplifié
    let dxf = '0\nSECTION\n2\nHEADER\n';
    dxf += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000
    dxf += '9\n$INSUNITS\n70\n4\n'; // Millimètres
    dxf += '0\nENDSEC\n';
    
    // Entités
    dxf += '0\nSECTION\n2\nENTITIES\n';
    
    elements.forEach((element) => {
      // Représenter chaque élément comme une boîte 3D simplifiée
      const [x, y, z] = element.position;
      const { length, width, height } = element.dimensions;
      
      // Face avant
      dxf += '0\n3DFACE\n';
      dxf += `10\n${x - width/2}\n20\n${y - (height || 0)/2}\n30\n${z - length/2}\n`;
      dxf += `11\n${x + width/2}\n21\n${y - (height || 0)/2}\n31\n${z - length/2}\n`;
      dxf += `12\n${x + width/2}\n22\n${y + (height || 0)/2}\n32\n${z - length/2}\n`;
      dxf += `13\n${x - width/2}\n23\n${y + (height || 0)/2}\n33\n${z - length/2}\n`;
    });
    
    dxf += '0\nENDSEC\n';
    dxf += '0\nEOF\n';
    
    return dxf;
  }
}

// Export par défaut
export default FileManager;