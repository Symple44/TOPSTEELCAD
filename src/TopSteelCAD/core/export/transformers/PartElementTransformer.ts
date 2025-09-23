/**
 * Transformer pour les données PartElement
 */

import { IDataTransformer, StandardizedExportData, UnifiedExportOptions } from '../interfaces';
import { PartElement } from '../../../part-builder/types/partBuilder.types';
import { convertPartElementToPivotElement } from '../../../part-builder/converters/partToPivot';

export class PartElementTransformer implements IDataTransformer<PartElement[]> {
  readonly name = 'PartElementTransformer';

  /**
   * Vérifie si les données sont des PartElements
   */
  supports(data: any): boolean {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true;

    // Vérifier le premier élément
    const first = data[0];
    return !!(
      first &&
      typeof first === 'object' &&
      'reference' in first &&
      'designation' in first &&
      'profileType' in first &&
      'profileSubType' in first &&
      'length' in first
    );
  }

  /**
   * Transforme les PartElements vers le format standardisé
   */
  transform(
    input: PartElement[],
    options?: UnifiedExportOptions
  ): StandardizedExportData {
    // Convertir les PartElements en PivotElements
    const pivotElements = input.map(convertPartElementToPivotElement);

    return {
      elements: pivotElements,
      metadata: {
        projectName: 'PartBuilder Export',
        createdDate: new Date(),
        modifiedDate: new Date(),
        version: '1.0.0',
        units: options?.units || 'mm'
      },
      options: options || {
        format: 'JSON' as any,
        units: 'mm'
      }
    };
  }
}