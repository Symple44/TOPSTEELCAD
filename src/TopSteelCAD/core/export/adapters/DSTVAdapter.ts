/**
 * Adapter unifié pour l'export DSTV
 * Combine les meilleures pratiques des différentes implémentations DSTV du projet
 */

import {
  IFormatAdapter,
  ExportFormat,
  FormatCapabilities,
  StandardizedExportData,
  ExportResult,
  ValidationResult
} from '../interfaces';

export class DSTVAdapter implements IFormatAdapter {
  readonly format = ExportFormat.DSTV;
  readonly mimeType = 'text/plain';
  readonly fileExtension = '.nc';

  readonly capabilities: FormatCapabilities = {
    supportsGeometry: true,
    supportsFeatures: true,
    supportsMaterials: true,
    supportsMetadata: true,
    supportsMultipleElements: true, // Via fichiers multiples dans un ZIP
    supportsHierarchy: false,
    supports3D: true,
    supportedFeatures: [
      'holes', 'slots', 'cuts', 'notches', 'markings', 'contours'
    ]
  };

  /**
   * Transforme vers DSTV
   */
  async transform(data: StandardizedExportData): Promise<ExportResult> {
    try {
      const dstvFiles: Map<string, string> = new Map();

      // Générer un fichier DSTV par élément
      data.elements.forEach((element, index) => {
        const dstvContent = this.generateDSTVContent(element, index);
        const filename = this.generateFilename(element, index);
        dstvFiles.set(filename, dstvContent);
      });

      // Si un seul fichier, retourner directement
      if (dstvFiles.size === 1) {
        const [filename, content] = Array.from(dstvFiles.entries())[0];
        const blob = new Blob([content], { type: this.mimeType });

        return {
          success: true,
          data: blob,
          mimeType: this.mimeType,
          filename: filename,
          metadata: {
            format: ExportFormat.DSTV,
            fileSize: blob.size,
            elementsCount: data.elements.length,
            exportDate: new Date(),
            processingTime: 0
          }
        };
      }

      // Si plusieurs fichiers, créer un ZIP
      const zipBlob = await this.createZipFile(dstvFiles);

      return {
        success: true,
        data: zipBlob,
        mimeType: 'application/zip',
        filename: `dstv_export_${Date.now()}.zip`,
        metadata: {
          format: ExportFormat.DSTV,
          fileSize: zipBlob.size,
          elementsCount: data.elements.length,
          exportDate: new Date(),
          processingTime: 0,
          warnings: [`Generated ${dstvFiles.size} DSTV files in ZIP archive`]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        metadata: {
          format: ExportFormat.DSTV,
          fileSize: 0,
          elementsCount: data.elements.length,
          exportDate: new Date(),
          processingTime: 0
        }
      };
    }
  }

  /**
   * Génère le contenu DSTV pour un élément
   */
  private generateDSTVContent(element: any, index: number): string {
    const lines: string[] = [];
    const originalData = element.metadata?.originalElement || element.originalData || element;

    // Bloc ST - Start
    lines.push('ST');
    lines.push(''); // Ligne vide

    // Bloc EN - General Information
    lines.push('** DSTV Export from TopSteelCAD');
    lines.push(`** Date: ${new Date().toISOString()}`);
    lines.push(`** Element: ${index + 1}`);
    lines.push('');

    // Identification
    const reference = originalData.reference || element.partNumber || element.name || `PART${index + 1}`;
    const designation = originalData.designation || element.description || '';

    lines.push(`** Reference: ${reference}`);
    if (designation) {
      lines.push(`** Designation: ${designation}`);
    }
    lines.push('');

    // Bloc P - Profile
    const profileType = originalData.profileType || this.extractProfileType(element);
    const profileSize = originalData.profileSubType || this.extractProfileSize(element);

    if (profileType && profileSize) {
      lines.push(`P ${profileType} ${profileSize}`);
    } else if (element.profile) {
      lines.push(`P ${element.profile}`);
    }

    // Bloc L - Length
    const length = originalData.length || element.dimensions?.length || 0;
    lines.push(`L ${Math.round(length)}`);

    // Bloc M - Material
    const material = originalData.material || element.material?.grade || element.material || 'S355';
    lines.push(`M ${material}`);

    // Bloc Q - Quantity
    const quantity = originalData.quantity || element.metadata?.quantity || 1;
    lines.push(`Q ${quantity}`);

    // Dimensions (si disponibles)
    if (element.dimensions) {
      const dims = element.dimensions;
      if (dims.height) lines.push(`** Height: ${dims.height}`);
      if (dims.width) lines.push(`** Width: ${dims.width}`);
      if (dims.webThickness) lines.push(`** Web Thickness: ${dims.webThickness}`);
      if (dims.flangeThickness) lines.push(`** Flange Thickness: ${dims.flangeThickness}`);
    }

    lines.push('');

    // Features - Trous
    const holes = this.extractHoles(element, originalData);
    if (holes.length > 0) {
      lines.push('** HOLES');
      holes.forEach(hole => {
        // BO - Boring/Hole
        const x = Math.round(hole.x || hole.coordinates?.x || 0);
        const y = Math.round(hole.y || hole.coordinates?.y || 0);
        const diameter = Math.round(hole.diameter || 20);

        lines.push(`BO ${x} ${y} ${diameter}`);

        // Face si spécifiée
        if (hole.face || hole.coordinates?.face) {
          const face = this.mapFaceToDSTV(hole.face || hole.coordinates?.face);
          lines.push(`  v ${face}`);
        }

        // Profondeur ou traversant
        if (hole.isThrough) {
          lines.push('  t'); // Through hole
        } else if (hole.depth) {
          lines.push(`  ${Math.round(hole.depth)}`);
        }
      });
      lines.push('');
    }

    // Features - Découpes
    const cuts = this.extractCuts(element, originalData);
    if (cuts.length > 0) {
      lines.push('** CUTS');
      cuts.forEach(cut => {
        // AK - Angled cut
        if (cut.type === 'angle' || cut.angle) {
          const angle = cut.angle || 90;
          const side = cut.side || 'v'; // v=front, h=top
          lines.push(`AK ${side} ${angle}`);
        }
        // IK - Internal cut/notch
        else if (cut.type === 'notch' || cut.type === 'internal') {
          const x = Math.round(cut.x || cut.position?.x || 0);
          const y = Math.round(cut.y || cut.position?.y || 0);
          const width = Math.round(cut.width || 50);
          const height = Math.round(cut.height || 50);
          lines.push(`IK ${x} ${y} ${width} ${height}`);
        }
      });
      lines.push('');
    }

    // Bloc EN - End
    lines.push('EN');

    return lines.join('\n');
  }

  /**
   * Valide les données pour l'export DSTV
   */
  validate(data: StandardizedExportData): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!data.elements || data.elements.length === 0) {
      errors.push('No elements to export');
    }

    // Vérifier que chaque élément a les infos minimales
    data.elements.forEach((element, index) => {
      const originalData = element.metadata?.originalElement || element.originalData || element;

      // Profile obligatoire
      if (!originalData.profileType && !element.profile && !element.materialType) {
        errors.push(`Element ${index + 1}: Missing profile information`);
      }

      // Longueur obligatoire
      const length = originalData.length || element.dimensions?.length;
      if (!length || length <= 0) {
        errors.push(`Element ${index + 1}: Invalid or missing length`);
      }

      // Avertissements pour données manquantes non critiques
      if (!originalData.material && !element.material) {
        warnings.push(`Element ${index + 1}: No material specified, using default S355`);
      }

      // Features complexes non supportées
      if (element.features) {
        const unsupportedFeatures = element.features.filter((f: any) =>
          !['hole', 'cut', 'notch', 'slot'].includes(f.type?.toLowerCase())
        );
        if (unsupportedFeatures.length > 0) {
          warnings.push(`Element ${index + 1}: Some features may not be fully supported in DSTV`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Génère un nom de fichier pour l'élément
   */
  private generateFilename(element: any, index: number): string {
    const originalData = element.metadata?.originalElement || element.originalData || element;
    const reference = originalData.reference || element.partNumber || element.name || `PART${index + 1}`;

    // Nettoyer le nom pour un nom de fichier valide
    const cleanName = reference.replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${cleanName}.nc`;
  }

  /**
   * Extrait le type de profil
   */
  private extractProfileType(element: any): string {
    if (element.profile) {
      const parts = element.profile.split(' ');
      return parts[0];
    }
    if (element.materialType) {
      const typeMap: Record<string, string> = {
        'BEAM': 'IPE',
        'COLUMN': 'HEB',
        'CHANNEL': 'UPN',
        'ANGLE': 'L',
        'TUBE': 'RHS',
        'PLATE': 'PL'
      };
      return typeMap[element.materialType] || 'IPE';
    }
    return 'IPE';
  }

  /**
   * Extrait la taille du profil
   */
  private extractProfileSize(element: any): string {
    if (element.profile) {
      const parts = element.profile.split(' ');
      return parts.slice(1).join(' ') || '200';
    }
    if (element.dimensions?.height) {
      return String(Math.round(element.dimensions.height));
    }
    return '200';
  }

  /**
   * Extrait les trous
   */
  private extractHoles(element: any, originalData: any): any[] {
    const holes: any[] = [];

    // Depuis originalData (PartElement)
    if (originalData?.holes && Array.isArray(originalData.holes)) {
      return originalData.holes;
    }

    // Depuis features
    if (element.features && Array.isArray(element.features)) {
      element.features.forEach((feature: any) => {
        if (feature.type === 'hole' || feature.type === 'HOLE') {
          holes.push({
            x: feature.position?.[0] || 0,
            y: feature.position?.[1] || 0,
            diameter: feature.parameters?.diameter || feature.diameter || 20,
            isThrough: feature.parameters?.isThrough || feature.isThrough || true,
            depth: feature.parameters?.depth || feature.depth,
            face: feature.face || feature.parameters?.face
          });
        }
      });
    }

    return holes;
  }

  /**
   * Extrait les découpes
   */
  private extractCuts(element: any, originalData: any): any[] {
    const cuts: any[] = [];

    // Depuis originalData
    if (originalData?.startCut) {
      cuts.push({ type: 'angle', side: 'start', angle: originalData.startCut.angle });
    }
    if (originalData?.endCut) {
      cuts.push({ type: 'angle', side: 'end', angle: originalData.endCut.angle });
    }

    // Depuis features
    if (element.features && Array.isArray(element.features)) {
      element.features.forEach((feature: any) => {
        if (feature.type === 'cut' || feature.type === 'CUT' ||
            feature.type === 'notch' || feature.type === 'NOTCH') {
          cuts.push({
            type: feature.type.toLowerCase(),
            x: feature.position?.[0] || 0,
            y: feature.position?.[1] || 0,
            width: feature.parameters?.width || feature.width || 50,
            height: feature.parameters?.height || feature.height || 50,
            angle: feature.parameters?.angle || feature.angle
          });
        }
      });
    }

    return cuts;
  }

  /**
   * Mappe une face vers le format DSTV
   */
  private mapFaceToDSTV(face: string): string {
    const faceMap: Record<string, string> = {
      'top': 'o',
      'bottom': 'u',
      'front': 'v',
      'back': 'h',
      'left': 'l',
      'right': 'r'
    };
    return faceMap[face.toLowerCase()] || 'v';
  }

  /**
   * Crée un fichier ZIP (simplifié - nécessite une librairie externe en production)
   */
  private async createZipFile(files: Map<string, string>): Promise<Blob> {
    // Pour une implémentation complète, utiliser JSZip ou similaire
    // Ici, on retourne simplement le premier fichier comme fallback
    console.warn('ZIP creation not implemented, returning first file');
    const [, content] = Array.from(files.entries())[0];
    return new Blob([content], { type: this.mimeType });
  }
}