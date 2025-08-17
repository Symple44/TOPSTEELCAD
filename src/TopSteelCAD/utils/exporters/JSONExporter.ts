import { PivotElement } from '../../../types/viewer';
import { ExportOptions, ExportResult } from '../FileExporter';

/**
 * JSONExporter - Export au format natif TopSteelCAD
 */
export class JSONExporter {
  /**
   * Exporte les éléments au format JSON
   */
  static async export(
    elements: PivotElement[],
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportData = {
      metadata: {
        version: '2.0',
        generator: 'TopSteelCAD',
        created: new Date().toISOString(),
        elementsCount: elements.length,
        ...(options.includeMetadata && {
          exportOptions: options,
          bounds: this.calculateBounds(elements)
        })
      },
      elements: elements.map(el => ({
        id: el.id,
        name: el.name,
        materialType: el.materialType,
        dimensions: el.dimensions,
        position: el.position,
        rotation: el.rotation,
        material: el.material,
        ...(options.includeFeatures && { features: el.features }),
        ...(options.includeMetadata && {
          metadata: el.metadata,
          sourceFormat: el.sourceFormat,
          createdAt: el.createdAt,
          updatedAt: el.updatedAt
        })
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    return {
      success: true,
      fileName,
      data: blob,
      metadata: {
        format: 'json',
        elementsCount: elements.length,
        fileSize: blob.size,
        exportDate: new Date()
      }
    };
  }

  /**
   * Calcule les limites de la scène
   */
  private static calculateBounds(elements: PivotElement[]) {
    if (elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    elements.forEach(element => {
      const [x, y, z] = element.position;
      const { length, width, height } = element.dimensions;

      minX = Math.min(minX, x - length / 2);
      minY = Math.min(minY, y - height / 2);
      minZ = Math.min(minZ, z - width / 2);

      maxX = Math.max(maxX, x + length / 2);
      maxY = Math.max(maxY, y + height / 2);
      maxZ = Math.max(maxZ, z + width / 2);
    });

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      size: [maxX - minX, maxY - minY, maxZ - minZ]
    };
  }
}