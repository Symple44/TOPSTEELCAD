/**
 * Transformer pour les données PivotElement
 */

import { IDataTransformer, StandardizedExportData, UnifiedExportOptions } from '../interfaces';
import { PivotElement } from '../../../../types/viewer';

export class PivotElementTransformer implements IDataTransformer<PivotElement[]> {
  readonly name = 'PivotElementTransformer';

  /**
   * Vérifie si les données sont des PivotElements
   */
  supports(data: any): boolean {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true; // Array vide est accepté

    // Vérifier le premier élément
    const first = data[0];
    return !!(
      first &&
      typeof first === 'object' &&
      'id' in first &&
      'materialType' in first &&
      'dimensions' in first &&
      ('position' in first || 'rotation' in first)
    );
  }

  /**
   * Transforme les PivotElements vers le format standardisé
   */
  transform(
    input: PivotElement[],
    options?: UnifiedExportOptions
  ): StandardizedExportData {
    // Les PivotElements sont déjà dans le bon format
    return {
      elements: input,
      metadata: {
        projectName: 'TopSteelCAD Export',
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