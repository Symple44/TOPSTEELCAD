import {
  PartDefinition,
  ValidationError,
  PartBuilderConfig,
  ProfileDefinition,
  PlateDefinition
} from '../types';
import { Feature } from '../../types';

export class PartValidator {
  private config: PartBuilderConfig;

  constructor(config: PartBuilderConfig) {
    this.config = config;
  }

  public validate(partDefinition: Partial<PartDefinition>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate basic properties
    if (!partDefinition.type) {
      errors.push({
        field: 'type',
        message: 'Part type is required',
        severity: 'error'
      });
    }

    if (!partDefinition.name || partDefinition.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Part name is required',
        severity: 'error'
      });
    }

    // Validate material
    if (!partDefinition.material) {
      errors.push({
        field: 'material',
        message: 'Material definition is required',
        severity: 'error'
      });
    } else {
      errors.push(...this.validateMaterial(partDefinition.material));
    }

    // Validate based on part type
    if (partDefinition.type === 'PROFILE' && partDefinition.profileDefinition) {
      errors.push(...this.validateProfile(partDefinition.profileDefinition));
    } else if (partDefinition.type === 'PLATE' && partDefinition.plateDefinition) {
      errors.push(...this.validatePlate(partDefinition.plateDefinition));
    }

    // Validate features
    if (partDefinition.features && partDefinition.features.length > 0) {
      errors.push(...this.validateFeatures(partDefinition.features));

      if (partDefinition.features.length > this.config.maxFeatures) {
        errors.push({
          field: 'features',
          message: `Number of features (${partDefinition.features.length}) exceeds maximum allowed (${this.config.maxFeatures})`,
          severity: 'warning'
        });
      }
    }

    return errors;
  }

  private validateMaterial(material: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!material.grade) {
      errors.push({
        field: 'material.grade',
        message: 'Material grade is required',
        severity: 'error'
      });
    }

    if (!material.density || material.density <= 0) {
      errors.push({
        field: 'material.density',
        message: 'Material density must be greater than 0',
        severity: 'error'
      });
    }

    if (material.yieldStrength && material.yieldStrength <= 0) {
      errors.push({
        field: 'material.yieldStrength',
        message: 'Yield strength must be greater than 0',
        severity: 'warning'
      });
    }

    return errors;
  }

  private validateProfile(profile: ProfileDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!profile.type) {
      errors.push({
        field: 'profileDefinition.type',
        message: 'Profile type is required',
        severity: 'error'
      });
    }

    if (!profile.designation) {
      errors.push({
        field: 'profileDefinition.designation',
        message: 'Profile designation is required',
        severity: 'error'
      });
    }

    if (!profile.length || profile.length <= 0) {
      errors.push({
        field: 'profileDefinition.length',
        message: 'Profile length must be greater than 0',
        severity: 'error'
      });
    }

    // Validate cuts
    if (profile.startCut) {
      errors.push(...this.validateCut(profile.startCut, 'start'));
    }

    if (profile.endCut) {
      errors.push(...this.validateCut(profile.endCut, 'end'));
    }

    // Validate notches
    if (profile.startNotch) {
      errors.push(...this.validateNotch(profile.startNotch, 'start'));
    }

    if (profile.endNotch) {
      errors.push(...this.validateNotch(profile.endNotch, 'end'));
    }

    return errors;
  }

  private validateCut(cut: any, position: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (cut.angle === undefined || cut.angle < -90 || cut.angle > 90) {
      errors.push({
        field: `profileDefinition.${position}Cut.angle`,
        message: `${position} cut angle must be between -90 and 90 degrees`,
        severity: 'error'
      });
    }

    if (!cut.plane || !['XY', 'XZ', 'YZ'].includes(cut.plane)) {
      errors.push({
        field: `profileDefinition.${position}Cut.plane`,
        message: `${position} cut plane must be XY, XZ, or YZ`,
        severity: 'error'
      });
    }

    return errors;
  }

  private validateNotch(notch: any, position: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!notch.type || !['rectangular', 'circular', 'custom'].includes(notch.type)) {
      errors.push({
        field: `profileDefinition.${position}Notch.type`,
        message: `${position} notch type must be rectangular, circular, or custom`,
        severity: 'error'
      });
    }

    if (!notch.width || notch.width <= 0) {
      errors.push({
        field: `profileDefinition.${position}Notch.width`,
        message: `${position} notch width must be greater than 0`,
        severity: 'error'
      });
    }

    if (!notch.depth || notch.depth <= 0) {
      errors.push({
        field: `profileDefinition.${position}Notch.depth`,
        message: `${position} notch depth must be greater than 0`,
        severity: 'error'
      });
    }

    return errors;
  }

  private validatePlate(plate: PlateDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!plate.thickness || plate.thickness <= 0) {
      errors.push({
        field: 'plateDefinition.thickness',
        message: 'Plate thickness must be greater than 0',
        severity: 'error'
      });
    }

    if (!plate.contour || plate.contour.length < 3) {
      errors.push({
        field: 'plateDefinition.contour',
        message: 'Plate contour must have at least 3 points',
        severity: 'error'
      });
    } else {
      // Validate contour points
      plate.contour.forEach((point, index) => {
        if (point.x === undefined || point.y === undefined) {
          errors.push({
            field: `plateDefinition.contour[${index}]`,
            message: `Contour point ${index + 1} must have x and y coordinates`,
            severity: 'error'
          });
        }

        if (point.radius !== undefined && point.radius < 0) {
          errors.push({
            field: `plateDefinition.contour[${index}].radius`,
            message: `Contour point ${index + 1} radius must be non-negative`,
            severity: 'warning'
          });
        }
      });

      // Check for self-intersections
      if (this.hasContourSelfIntersection(plate.contour)) {
        errors.push({
          field: 'plateDefinition.contour',
          message: 'Plate contour has self-intersections',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  private validateFeatures(features: Feature[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const featureIds = new Set<string>();

    features.forEach((feature, index) => {
      // Check for duplicate IDs
      if (featureIds.has(feature.id)) {
        errors.push({
          field: `features[${index}].id`,
          message: `Duplicate feature ID: ${feature.id}`,
          severity: 'error'
        });
      }
      featureIds.add(feature.id);

      // Validate feature type
      if (!feature.type) {
        errors.push({
          field: `features[${index}].type`,
          message: `Feature ${index + 1} type is required`,
          severity: 'error'
        });
      }

      // Validate position
      if (!feature.position) {
        errors.push({
          field: `features[${index}].position`,
          message: `Feature ${index + 1} position is required`,
          severity: 'error'
        });
      }

      // Validate feature-specific parameters
      errors.push(...this.validateFeatureParameters(feature, index));
    });

    return errors;
  }

  private validateFeatureParameters(feature: Feature, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const params = feature.parameters;

    if (!params) {
      errors.push({
        field: `features[${index}].parameters`,
        message: `Feature ${index + 1} parameters are required`,
        severity: 'error'
      });
      return errors;
    }

    // Validate based on feature type
    switch (feature.type) {
      case 'HOLE':
      case 'DRILL':
        if (!params.diameter || params.diameter <= 0) {
          errors.push({
            field: `features[${index}].parameters.diameter`,
            message: `Hole diameter must be greater than 0`,
            severity: 'error'
          });
        }
        if (params.depth !== undefined && params.depth <= 0) {
          errors.push({
            field: `features[${index}].parameters.depth`,
            message: `Hole depth must be greater than 0`,
            severity: 'error'
          });
        }
        break;

      case 'SLOT':
        if (!params.width || params.width <= 0) {
          errors.push({
            field: `features[${index}].parameters.width`,
            message: `Slot width must be greater than 0`,
            severity: 'error'
          });
        }
        if (!params.length || params.length <= 0) {
          errors.push({
            field: `features[${index}].parameters.length`,
            message: `Slot length must be greater than 0`,
            severity: 'error'
          });
        }
        break;

      case 'CHAMFER':
      case 'BEVEL':
        if (!params.angle || params.angle <= 0 || params.angle >= 90) {
          errors.push({
            field: `features[${index}].parameters.angle`,
            message: `Chamfer/bevel angle must be between 0 and 90 degrees`,
            severity: 'error'
          });
        }
        break;
    }

    return errors;
  }

  private hasContourSelfIntersection(contour: any[]): boolean {
    // Simple self-intersection check
    // In production, this would use a proper geometric algorithm
    for (let i = 0; i < contour.length - 1; i++) {
      for (let j = i + 2; j < contour.length - 1; j++) {
        if (this.segmentsIntersect(
          contour[i], contour[i + 1],
          contour[j], contour[j + 1]
        )) {
          return true;
        }
      }
    }
    return false;
  }

  private segmentsIntersect(p1: any, p2: any, p3: any, p4: any): boolean {
    // Simple line segment intersection check
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);

    if (Math.abs(d) < 0.0001) {
      return false; // Parallel lines
    }

    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  public validateFeaturePosition(
    feature: Feature,
    partDefinition: Partial<PartDefinition>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if feature position is within part bounds
    // This would require computing the actual part bounds
    // For now, return empty array

    return errors;
  }
}