import { PartDefinition, PartExportOptions } from '../types';
import { Feature } from '../../types';
import * as THREE from 'three';

export class PartExporter {
  public async export(
    partDefinition: PartDefinition,
    options: PartExportOptions
  ): Promise<string> {
    switch (options.format) {
      case 'dstv':
        return this.exportToDSTV(partDefinition, options);
      case 'json':
        return this.exportToJSON(partDefinition, options);
      case 'dxf':
        return this.exportToDXF(partDefinition, options);
      case 'step':
        return this.exportToSTEP(partDefinition, options);
      case 'ifc':
        return this.exportToIFC(partDefinition, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private exportToDSTV(partDefinition: PartDefinition, options: PartExportOptions): string {
    const lines: string[] = [];

    // Header block
    lines.push('ST');
    lines.push(`Designation: ${partDefinition.name}`);
    lines.push(`Material: ${partDefinition.material.grade}`);

    if (partDefinition.type === 'PROFILE' && partDefinition.profileDefinition) {
      const profile = partDefinition.profileDefinition;
      lines.push(`Profile: ${profile.type} ${profile.designation}`);
      lines.push(`Length: ${this.formatNumber(profile.length, options.precision)}`);

      // Process features
      if (options.includeFeatures && partDefinition.features) {
        partDefinition.features.forEach(feature => {
          lines.push(...this.featureToDSTV(feature, options));
        });
      }
    } else if (partDefinition.type === 'PLATE' && partDefinition.plateDefinition) {
      const plate = partDefinition.plateDefinition;
      lines.push(`PL${this.formatNumber(plate.thickness, options.precision)}`);

      // Export contour as AK block
      lines.push('AK');
      plate.contour.forEach(point => {
        lines.push(`v ${this.formatNumber(point.x, options.precision)} ${this.formatNumber(point.y, options.precision)}`);
      });

      // Export holes
      if (options.includeFeatures) {
        plate.holes.forEach(hole => {
          lines.push(...this.featureToDSTV(hole, options));
        });
      }
    }

    // Footer
    lines.push('EN');

    return lines.join('\n');
  }

  private featureToDSTV(feature: Feature, options: PartExportOptions): string[] {
    const lines: string[] = [];

    switch (feature.type) {
      case 'HOLE':
      case 'DRILL':
        lines.push('BO');
        const pos = this.convertCoordinates(feature.position, options.units);
        lines.push(`x ${this.formatNumber(pos.x, options.precision)}`);
        lines.push(`y ${this.formatNumber(pos.y, options.precision)}`);
        lines.push(`d ${this.formatNumber(feature.parameters.diameter, options.precision)}`);
        if (feature.face) {
          lines.push(`f ${this.mapFaceToDSTV(feature.face)}`);
        }
        break;

      case 'SLOT':
        lines.push('LO');
        const slotPos = this.convertCoordinates(feature.position, options.units);
        lines.push(`x ${this.formatNumber(slotPos.x, options.precision)}`);
        lines.push(`y ${this.formatNumber(slotPos.y, options.precision)}`);
        lines.push(`l ${this.formatNumber(feature.parameters.length, options.precision)}`);
        lines.push(`w ${this.formatNumber(feature.parameters.width, options.precision)}`);
        break;

      case 'MARKING':
      case 'TEXT':
        lines.push('SI');
        lines.push(`t ${feature.parameters.text || ''}`);
        const markPos = this.convertCoordinates(feature.position, options.units);
        lines.push(`x ${this.formatNumber(markPos.x, options.precision)}`);
        lines.push(`y ${this.formatNumber(markPos.y, options.precision)}`);
        break;
    }

    return lines;
  }

  private exportToJSON(partDefinition: PartDefinition, options: PartExportOptions): string {
    const exportData: any = {
      type: partDefinition.type,
      name: partDefinition.name,
      id: partDefinition.id
    };

    if (options.includeMetadata) {
      exportData.metadata = partDefinition.metadata;
      exportData.material = partDefinition.material;
    }

    if (partDefinition.type === 'PROFILE' && partDefinition.profileDefinition) {
      exportData.profile = {
        ...partDefinition.profileDefinition,
        dimensions: this.convertDimensions(partDefinition.profileDefinition.dimensions, options.units)
      };
    } else if (partDefinition.type === 'PLATE' && partDefinition.plateDefinition) {
      exportData.plate = {
        ...partDefinition.plateDefinition,
        thickness: this.convertLength(partDefinition.plateDefinition.thickness, options.units),
        contour: partDefinition.plateDefinition.contour.map(point => ({
          x: this.convertLength(point.x, options.units),
          y: this.convertLength(point.y, options.units),
          radius: point.radius ? this.convertLength(point.radius, options.units) : undefined
        }))
      };
    }

    if (options.includeFeatures) {
      exportData.features = partDefinition.features.map(feature => ({
        ...feature,
        position: this.convertCoordinates(feature.position, options.units),
        parameters: this.convertFeatureParameters(feature.parameters, options.units)
      }));
    }

    return JSON.stringify(exportData, null, 2);
  }

  private exportToDXF(partDefinition: PartDefinition, options: PartExportOptions): string {
    const lines: string[] = [];

    // DXF Header
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('HEADER');
    lines.push('9');
    lines.push('$ACADVER');
    lines.push('1');
    lines.push('AC1015');
    lines.push('0');
    lines.push('ENDSEC');

    // Entities section
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('ENTITIES');

    if (partDefinition.type === 'PLATE' && partDefinition.plateDefinition) {
      // Export plate contour as LWPOLYLINE
      const plate = partDefinition.plateDefinition;
      lines.push('0');
      lines.push('LWPOLYLINE');
      lines.push('8');
      lines.push('0'); // Layer
      lines.push('90');
      lines.push(plate.contour.length.toString());
      lines.push('70');
      lines.push('1'); // Closed polyline

      plate.contour.forEach(point => {
        lines.push('10');
        lines.push(this.formatNumber(point.x, options.precision));
        lines.push('20');
        lines.push(this.formatNumber(point.y, options.precision));
      });

      // Export holes as circles
      if (options.includeFeatures) {
        plate.holes.forEach(hole => {
          if (hole.type === 'HOLE' || hole.type === 'DRILL') {
            lines.push('0');
            lines.push('CIRCLE');
            lines.push('8');
            lines.push('0'); // Layer
            lines.push('10');
            lines.push(this.formatNumber(hole.position.x, options.precision));
            lines.push('20');
            lines.push(this.formatNumber(hole.position.y, options.precision));
            lines.push('30');
            lines.push('0');
            lines.push('40');
            lines.push(this.formatNumber(hole.parameters.diameter / 2, options.precision));
          }
        });
      }
    }

    lines.push('0');
    lines.push('ENDSEC');
    lines.push('0');
    lines.push('EOF');

    return lines.join('\n');
  }

  private exportToSTEP(partDefinition: PartDefinition, options: PartExportOptions): string {
    // Simplified STEP export
    const lines: string[] = [];

    lines.push('ISO-10303-21;');
    lines.push('HEADER;');
    lines.push(`FILE_DESCRIPTION(('${partDefinition.name}'),'2;1');`);
    lines.push(`FILE_NAME('${partDefinition.id}.stp','${new Date().toISOString()}',(''),(''),'','','');`);
    lines.push('FILE_SCHEMA(("AP203"));');
    lines.push('ENDSEC;');
    lines.push('DATA;');

    // Add basic entities
    let entityId = 1;

    if (partDefinition.type === 'PROFILE' && partDefinition.profileDefinition) {
      // Export profile as basic shape
      lines.push(`#${entityId++} = PRODUCT('${partDefinition.name}','${partDefinition.name}','',(#${entityId}));`);
      lines.push(`#${entityId++} = PRODUCT_CONTEXT('',#${entityId},'mechanical');`);
    }

    lines.push('ENDSEC;');
    lines.push('END-ISO-10303-21;');

    return lines.join('\n');
  }

  private exportToIFC(partDefinition: PartDefinition, options: PartExportOptions): string {
    // Simplified IFC export
    const lines: string[] = [];

    lines.push('ISO-10303-21;');
    lines.push('HEADER;');
    lines.push(`FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');`);
    lines.push(`FILE_NAME('${partDefinition.id}.ifc','${new Date().toISOString()}',(''),(''),'','','');`);
    lines.push('FILE_SCHEMA(("IFC2X3"));');
    lines.push('ENDSEC;');
    lines.push('DATA;');

    // Add IFC entities
    let entityId = 1;

    if (partDefinition.type === 'PROFILE' && partDefinition.profileDefinition) {
      const profile = partDefinition.profileDefinition;
      lines.push(`#${entityId++} = IFCBEAM('${partDefinition.id}',$,'${partDefinition.name}',$,$,$,$,$);`);

      // Add profile definition
      lines.push(`#${entityId++} = IFCISHAPEPROFILEDEF(.AREA.,'${profile.designation}',$,`);
      lines.push(`  ${profile.dimensions.width},${profile.dimensions.height},`);
      lines.push(`  ${profile.dimensions.webThickness || 10},${profile.dimensions.flangeThickness || 10},$);`);
    }

    lines.push('ENDSEC;');
    lines.push('END-ISO-10303-21;');

    return lines.join('\n');
  }

  private convertCoordinates(position: THREE.Vector3, targetUnits: 'mm' | 'inch'): THREE.Vector3 {
    if (targetUnits === 'inch') {
      return new THREE.Vector3(
        position.x / 25.4,
        position.y / 25.4,
        position.z / 25.4
      );
    }
    return position.clone();
  }

  private convertLength(value: number, targetUnits: 'mm' | 'inch'): number {
    return targetUnits === 'inch' ? value / 25.4 : value;
  }

  private convertDimensions(dimensions: any, targetUnits: 'mm' | 'inch'): any {
    const converted: any = {};
    for (const key in dimensions) {
      if (typeof dimensions[key] === 'number') {
        converted[key] = this.convertLength(dimensions[key], targetUnits);
      } else {
        converted[key] = dimensions[key];
      }
    }
    return converted;
  }

  private convertFeatureParameters(parameters: any, targetUnits: 'mm' | 'inch'): any {
    const converted: any = {};
    const lengthKeys = ['diameter', 'width', 'height', 'length', 'depth', 'radius'];

    for (const key in parameters) {
      if (lengthKeys.includes(key) && typeof parameters[key] === 'number') {
        converted[key] = this.convertLength(parameters[key], targetUnits);
      } else {
        converted[key] = parameters[key];
      }
    }
    return converted;
  }

  private formatNumber(value: number, precision: number): string {
    return value.toFixed(precision);
  }

  private mapFaceToDSTV(face: any): string {
    const faceMap: Record<string, string> = {
      'WEB': 'v',
      'TOP_FLANGE': 'o',
      'BOTTOM_FLANGE': 'u',
      'FRONT': 'h',
      'BACK': 'hi'
    };
    return faceMap[face] || 'v';
  }

  public async exportToFile(
    partDefinition: PartDefinition,
    options: PartExportOptions,
    fileName: string
  ): Promise<void> {
    const content = await this.export(partDefinition, options);

    // Create blob and download link
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public getExportFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      'dstv': 'nc',
      'json': 'json',
      'dxf': 'dxf',
      'step': 'stp',
      'ifc': 'ifc'
    };
    return extensions[format] || 'txt';
  }

  public getSupportedFormats(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'dstv', label: 'DSTV', description: 'Standard format for steel fabrication' },
      { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
      { value: 'dxf', label: 'DXF', description: 'AutoCAD Drawing Exchange Format' },
      { value: 'step', label: 'STEP', description: 'Standard for Exchange of Product Data' },
      { value: 'ifc', label: 'IFC', description: 'Industry Foundation Classes' }
    ];
  }
}