import { PivotElement } from '@/types/viewer';
import { ExportOptions, ExportResult } from '../FileExporter';

/**
 * CSVExporter - Export au format CSV pour analyse tabulaire
 */
export class CSVExporter {
  /**
   * Exporte les éléments au format CSV
   */
  static async export(
    elements: PivotElement[],
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const csvContent = this.generateCSV(elements, options);
    
    // Ajouter le BOM UTF-8 pour Excel
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });

    return {
      success: true,
      fileName,
      data: blob,
      metadata: {
        format: 'csv',
        elementsCount: elements.length,
        fileSize: blob.size,
        exportDate: new Date()
      }
    };
  }

  /**
   * Génère le contenu CSV
   */
  private static generateCSV(elements: PivotElement[], options: ExportOptions): string {
    // En-têtes détaillés
    const headers = [
      'ID',
      'Repère',
      'Type de profil',
      'Nuance',
      'Longueur (mm)',
      'Largeur (mm)',
      'Hauteur (mm)',
      'Épaisseur (mm)',
      'Position X (mm)',
      'Position Y (mm)',
      'Position Z (mm)',
      'Rotation X (°)',
      'Rotation Y (°)',
      'Rotation Z (°)',
      'Volume (m³)',
      'Poids (kg)',
      'Surface (m²)'
    ];

    // Ajouter les colonnes de features si demandé
    if (options.includeFeatures) {
      headers.push(
        'Nb. Trous',
        'Nb. Découpes',
        'Nb. Encoches',
        'Nb. Grugeages'
      );
    }

    // Ajouter les colonnes de métadonnées si demandé
    if (options.includeMetadata) {
      headers.push(
        'Date création',
        'Date modification',
        'Format source',
        'Remarques'
      );
    }

    // Construire le CSV avec séparateur point-virgule (standard européen)
    let csv = headers.join(';') + '\n';

    elements.forEach(element => {
      const row = this.generateRow(element, options);
      csv += row.join(';') + '\n';
    });

    return csv;
  }

  /**
   * Génère une ligne CSV pour un élément
   */
  private static generateRow(element: PivotElement, options: ExportOptions): unknown[] {
    const { length, width, height, thickness } = element.dimensions;
    
    // Calculs géométriques
    const volume = this.calculateVolume(element);
    const weight = this.calculateWeight(element, volume);
    const surface = this.calculateSurface(element);
    
    // Données de base
    const row = [
      element.id,
      `"${element.name}"`,
      element.materialType,
      element.material?.grade || 'S355',
      Math.round(length),
      Math.round(width),
      Math.round(height || 0),
      Math.round(thickness),
      element.position[0].toFixed(2),
      element.position[1].toFixed(2),
      element.position[2].toFixed(2),
      this.radToDeg(element.rotation[0]).toFixed(2),
      this.radToDeg(element.rotation[1]).toFixed(2),
      this.radToDeg(element.rotation[2]).toFixed(2),
      volume.toFixed(6),
      weight.toFixed(2),
      surface.toFixed(3)
    ];

    // Ajouter les features si demandé
    if (options.includeFeatures) {
      const features = element.metadata?.features || [];
      const holes = features.filter((f: any) => f.type === 'hole').length;
      const cuts = features.filter((f: any) => f.type === 'cut').length;
      const notches = features.filter((f: any) => f.type === 'notch').length;
      const copes = features.filter((f: any) => f.type === 'cope').length;
      
      row.push(holes, cuts, notches, copes);
    }

    // Ajouter les métadonnées si demandé
    if (options.includeMetadata) {
      row.push(
        element.createdAt ? new Date(element.createdAt).toLocaleDateString() : '',
        element.updatedAt ? new Date(element.updatedAt).toLocaleDateString() : '',
        element.sourceFormat || '',
        element.metadata?.remarks || ''
      );
    }

    return row;
  }

  /**
   * Calcule le volume d'un élément en m³
   */
  private static calculateVolume(element: PivotElement): number {
    const { length, width, height, thickness } = element.dimensions;
    const type = element.materialType.toUpperCase();
    
    // Conversion mm -> m
    const l = length / 1000;
    const w = width / 1000;
    const h = (height || 0) / 1000;
    const t = thickness / 1000;
    
    // Calcul selon le type de profil
    if (type.includes('PLAT') || type.includes('FL')) {
      // Plat : L x l x e
      return l * w * t;
    } else if (type.includes('RHS') || type.includes('TUBE')) {
      // Tube rectangulaire
      const areaExt = w * h;
      const areaInt = (w - 2*t) * (h - 2*t);
      return l * (areaExt - areaInt);
    } else if (type.includes('CHS')) {
      // Tube rond
      const rExt = w / 2;
      const rInt = rExt - t;
      return l * Math.PI * (rExt*rExt - rInt*rInt);
    } else if (type.includes('SHS')) {
      // Tube carré
      const areaExt = w * w;
      const areaInt = (w - 2*t) * (w - 2*t);
      return l * (areaExt - areaInt);
    } else if (type.startsWith('IPE') || type.startsWith('HE')) {
      // Profils I/H - approximation
      const areaWeb = (h - 2*t) * t * 0.6; // Âme
      const areaFlanges = 2 * w * t; // Ailes
      return l * (areaWeb + areaFlanges);
    } else if (type.startsWith('UPN') || type.startsWith('UAP')) {
      // Profils U - approximation
      const areaWeb = h * t * 0.7;
      const areaFlanges = 2 * w * t * 0.8;
      return l * (areaWeb + areaFlanges);
    } else if (type.startsWith('L')) {
      // Cornières - approximation
      return l * t * (w + h - t);
    } else {
      // Approximation générale
      return l * w * h * 0.1;
    }
  }

  /**
   * Calcule le poids en kg (densité acier = 7850 kg/m³)
   */
  private static calculateWeight(element: PivotElement, volume: number): number {
    const density = element.material?.density || 7850;
    return volume * density;
  }

  /**
   * Calcule la surface peinte en m²
   */
  private static calculateSurface(element: PivotElement): number {
    const { length, width, height } = element.dimensions;
    const type = element.materialType.toUpperCase();
    
    // Conversion mm -> m
    const l = length / 1000;
    const w = width / 1000;
    const h = (height || 0) / 1000;
    
    // Calcul du périmètre selon le type
    let perimeter = 0;
    
    if (type.includes('PLAT') || type.includes('FL')) {
      perimeter = 2 * (w + h);
    } else if (type.includes('RHS') || type.includes('TUBE')) {
      perimeter = 2 * (w + h);
    } else if (type.includes('CHS')) {
      perimeter = Math.PI * w;
    } else if (type.includes('SHS')) {
      perimeter = 4 * w;
    } else if (type.startsWith('IPE') || type.startsWith('HE')) {
      // Approximation pour profils I/H
      perimeter = 2 * w + 2 * h;
    } else if (type.startsWith('UPN') || type.startsWith('UAP')) {
      // Approximation pour profils U
      perimeter = 2 * w + h;
    } else if (type.startsWith('L')) {
      // Cornières
      perimeter = 2 * (w + h);
    } else {
      // Approximation générale
      perimeter = 2 * (w + h);
    }
    
    return perimeter * l;
  }

  /**
   * Convertit les radians en degrés
   */
  private static radToDeg(rad: number): number {
    return rad * 180 / Math.PI;
  }
}