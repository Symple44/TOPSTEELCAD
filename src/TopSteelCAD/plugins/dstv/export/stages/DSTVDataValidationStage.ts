/**
 * Stage de validation des données pour l'export DSTV
 * Vérifie la conformité des données avant transformation
 */

import { BaseStage } from './BaseExportStage';
import { DSTVPluginConfig } from '../../DSTVPlugin';
import { DSTVExportData } from '../DSTVExportPipeline';

export class DSTVDataValidationStage extends BaseStage {
  private config: DSTVPluginConfig;

  constructor(config: DSTVPluginConfig) {
    super({
      name: 'DSTV Data Validation',
      description: 'Validates input data for DSTV export'
    });
    this.config = config;
  }

  async process(context: any): Promise<any> {
    const data = context.input as DSTVExportData;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation du profil
    this.validateProfile(data, errors, warnings);
    
    // Validation du matériau
    this.validateMaterial(data, errors, warnings);
    
    // Validation des features
    this.validateFeatures(data, errors, warnings);
    
    // En mode strict, les warnings deviennent des erreurs
    if (this.config.strictMode && warnings.length > 0) {
      errors.push(...warnings);
      warnings.length = 0;
    }

    // Si des erreurs critiques, arrêter le pipeline
    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }

    // Ajouter les warnings au contexte
    if (warnings.length > 0) {
      context.metadata.validationWarnings = warnings;
    }

    // Ajouter les données validées au contexte
    context.metadata.validatedData = data;
    context.output = data;

    return context;
  }

  private validateProfile(data: DSTVExportData, errors: string[], warnings: string[]) {
    if (!data.geometry?.profile) {
      errors.push('Profile information is required');
      return;
    }

    const profile = data.geometry.profile;
    
    // Validation du type de profil
    if (!profile.type) {
      errors.push('Profile type is required');
    } else {
      // Vérifier si le type est supporté
      const supportedTypes = ['IPE', 'IPN', 'HEA', 'HEB', 'HEM', 'UPN', 'UPE', 'L', 'T', 'RHS', 'CHS', 'FLAT'];
      const profilePrefix = profile.type.replace(/[0-9]+/, '');
      if (!supportedTypes.includes(profilePrefix)) {
        warnings.push(`Profile type '${profile.type}' may not be standard DSTV`);
      }
    }

    // Validation des dimensions
    if (!profile.dimensions) {
      errors.push('Profile dimensions are required');
      return;
    }

    const dims = profile.dimensions;
    if (!dims.length || dims.length <= 0) {
      errors.push('Profile length must be positive');
    } else if (dims.length > 15000) {
      warnings.push(`Profile length ${dims.length}mm exceeds typical max (15000mm)`);
    }

    if (dims.height && dims.height <= 0) {
      errors.push('Profile height must be positive');
    }
    if (dims.width && dims.width <= 0) {
      errors.push('Profile width must be positive');
    }
    if (dims.webThickness && dims.webThickness <= 0) {
      errors.push('Web thickness must be positive');
    }
    if (dims.flangeThickness && dims.flangeThickness <= 0) {
      errors.push('Flange thickness must be positive');
    }
  }

  private validateMaterial(data: DSTVExportData, errors: string[], warnings: string[]) {
    if (!data.geometry?.material) {
      errors.push('Material specification is required');
      return;
    }

    const material = data.geometry.material;
    
    // Vérifier le format du matériau (ex: S235, S355JR, S355J2, etc.)
    // Pattern mis à jour pour accepter les suffixes avec chiffres
    const materialPattern = /^[A-Z][0-9]{3}([A-Z]{0,2}[0-9]?)?$/;
    if (!materialPattern.test(material)) {
      warnings.push(`Material '${material}' may not follow standard nomenclature`);
    }

    // Matériaux standard DSTV
    const standardMaterials = [
      'S235', 'S235JR', 'S235J0', 'S235J2',
      'S275', 'S275JR', 'S275J0', 'S275J2',
      'S355', 'S355JR', 'S355J0', 'S355J2', 'S355K2',
      'S420', 'S450', 'S460'
    ];
    
    if (!standardMaterials.includes(material)) {
      warnings.push(`Material '${material}' is not in standard DSTV material list`);
    }
  }

  private validateFeatures(data: DSTVExportData, errors: string[], warnings: string[]) {
    if (!data.features) {
      // Les features sont optionnelles
      return;
    }

    // Validation des trous
    if (data.features.holes) {
      for (let i = 0; i < data.features.holes.length; i++) {
        const hole = data.features.holes[i];
        
        if (hole.diameter <= 0) {
          errors.push(`Hole ${i + 1}: diameter must be positive`);
        } else if (hole.diameter < 5) {
          warnings.push(`Hole ${i + 1}: diameter ${hole.diameter}mm is very small`);
        } else if (hole.diameter > 100) {
          warnings.push(`Hole ${i + 1}: diameter ${hole.diameter}mm is unusually large`);
        }

        if (!this.isValidFace(hole.face)) {
          errors.push(`Hole ${i + 1}: invalid face '${hole.face}'`);
        }

        // Vérifier les coordonnées
        if (hole.x < 0) {
          errors.push(`Hole ${i + 1}: X coordinate cannot be negative`);
        }
        if (hole.x > (data.geometry?.profile?.dimensions?.length || 0)) {
          warnings.push(`Hole ${i + 1}: X coordinate exceeds profile length`);
        }
      }
    }

    // Validation des contours
    if (data.features.contours) {
      for (let i = 0; i < data.features.contours.length; i++) {
        const contour = data.features.contours[i];
        
        if (!['AK', 'IK'].includes(contour.type)) {
          errors.push(`Contour ${i + 1}: type must be 'AK' or 'IK'`);
        }

        if (!contour.points || contour.points.length < 2) {
          errors.push(`Contour ${i + 1}: must have at least 2 points`);
        }

        if (!this.isValidFace(contour.face)) {
          errors.push(`Contour ${i + 1}: invalid face '${contour.face}'`);
        }

        // Vérifier la fermeture si nécessaire
        if (this.config.validateContourClosure && contour.closed && contour.points.length > 2) {
          const first = contour.points[0];
          const last = contour.points[contour.points.length - 1];
          const gap = Math.sqrt(
            Math.pow(last.x - first.x, 2) + 
            Math.pow(last.y - first.y, 2)
          );
          
          if (gap > 0.01) {
            errors.push(`Contour ${i + 1}: not properly closed (gap: ${gap.toFixed(3)}mm)`);
          }
        }
      }
    }

    // Validation des marquages
    if (data.features.markings) {
      for (let i = 0; i < data.features.markings.length; i++) {
        const marking = data.features.markings[i];
        
        if (!marking.text || marking.text.length === 0) {
          errors.push(`Marking ${i + 1}: text is required`);
        } else if (marking.text.length > 80) {
          warnings.push(`Marking ${i + 1}: text exceeds 80 characters`);
        }

        if (marking.height <= 0) {
          errors.push(`Marking ${i + 1}: height must be positive`);
        } else if (marking.height < 3) {
          warnings.push(`Marking ${i + 1}: height ${marking.height}mm may be too small`);
        }

        if (!this.isValidFace(marking.face)) {
          errors.push(`Marking ${i + 1}: invalid face '${marking.face}'`);
        }

        if (marking.angle !== undefined) {
          if (marking.angle < -180 || marking.angle > 180) {
            errors.push(`Marking ${i + 1}: angle must be between -180 and 180 degrees`);
          }
        }
      }
    }
  }

  private isValidFace(face: string): boolean {
    const validFaces = [
      'v', 'u', 'o', 's', 'h',
      'top_flange', 'bottom_flange', 'web',
      'top', 'bottom', 'left', 'right'
    ];
    return validFaces.includes(face?.toLowerCase());
  }
}