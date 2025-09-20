import { PartTemplate, PartType, ProfileType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const templates: PartTemplate[] = [
  // Beam Templates
  {
    id: 'standard-ipe-beam',
    name: 'Standard IPE Beam',
    description: 'IPE beam with standard holes for connections',
    category: 'Beams',
    baseDefinition: {
      type: PartType.PROFILE,
      profileDefinition: {
        type: ProfileType.IPE,
        designation: 'IPE 300',
        dimensions: { height: 300, width: 150, webThickness: 7.1, flangeThickness: 10.7, length: 6000 } as any,
        length: 6000
      },
      material: {
        grade: 'S355',
        density: 7850,
        yieldStrength: 355,
        tensileStrength: 510,
        elasticModulus: 210000
      },
      features: []
    },
    parameters: [
      {
        id: 'length',
        name: 'Beam Length',
        type: 'number',
        defaultValue: 6000,
        constraints: { min: 1000, max: 12000 }
      },
      {
        id: 'endPlateHoles',
        name: 'End Plate Holes',
        type: 'select',
        defaultValue: '4',
        constraints: { options: ['4', '6', '8'] }
      }
    ],
    constraints: []
  },
  {
    id: 'column-base-plate',
    name: 'Column Base Plate',
    description: 'Base plate for column connection with anchor bolt holes',
    category: 'Plates',
    baseDefinition: {
      type: PartType.PLATE,
      plateDefinition: {
        thickness: 20,
        material: 'S355',
        contour: [
          { x: -200, y: -200 },
          { x: 200, y: -200 },
          { x: 200, y: 200 },
          { x: -200, y: 200 }
        ],
        holes: []
      },
      material: {
        grade: 'S355',
        density: 7850,
        yieldStrength: 355,
        tensileStrength: 510
      },
      features: []
    },
    parameters: [
      {
        id: 'width',
        name: 'Plate Width',
        type: 'number',
        defaultValue: 400,
        constraints: { min: 200, max: 800 }
      },
      {
        id: 'height',
        name: 'Plate Height',
        type: 'number',
        defaultValue: 400,
        constraints: { min: 200, max: 800 }
      },
      {
        id: 'thickness',
        name: 'Plate Thickness',
        type: 'number',
        defaultValue: 20,
        constraints: { min: 10, max: 50 }
      },
      {
        id: 'boltDiameter',
        name: 'Bolt Diameter',
        type: 'select',
        defaultValue: '24',
        constraints: { options: ['16', '20', '24', '30'] }
      }
    ],
    constraints: []
  },
  {
    id: 'end-plate-connection',
    name: 'End Plate Connection',
    description: 'End plate for beam-to-column connections',
    category: 'Connections',
    baseDefinition: {
      type: PartType.PLATE,
      plateDefinition: {
        thickness: 15,
        material: 'S355',
        contour: [
          { x: -75, y: -150 },
          { x: 75, y: -150 },
          { x: 75, y: 150 },
          { x: -75, y: 150 }
        ],
        holes: []
      },
      material: {
        grade: 'S355',
        density: 7850
      },
      features: []
    },
    parameters: [
      {
        id: 'plateHeight',
        name: 'Plate Height',
        type: 'number',
        defaultValue: 300,
        constraints: { min: 200, max: 500 }
      },
      {
        id: 'plateWidth',
        name: 'Plate Width',
        type: 'number',
        defaultValue: 150,
        constraints: { min: 100, max: 300 }
      }
    ],
    constraints: []
  },
  {
    id: 'angle-bracket',
    name: 'Angle Bracket',
    description: 'L-shaped bracket for structural connections',
    category: 'Connections',
    baseDefinition: {
      type: PartType.PLATE,
      plateDefinition: {
        thickness: 10,
        material: 'S275',
        contour: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 100 },
          { x: 0, y: 100 }
        ],
        holes: []
      },
      material: {
        grade: 'S275',
        density: 7850
      },
      features: []
    },
    parameters: [
      {
        id: 'leg1Length',
        name: 'Leg 1 Length',
        type: 'number',
        defaultValue: 100,
        constraints: { min: 50, max: 200 }
      },
      {
        id: 'leg2Length',
        name: 'Leg 2 Length',
        type: 'number',
        defaultValue: 100,
        constraints: { min: 50, max: 200 }
      },
      {
        id: 'thickness',
        name: 'Thickness',
        type: 'number',
        defaultValue: 10,
        constraints: { min: 5, max: 20 }
      }
    ],
    constraints: []
  },
  {
    id: 'gusset-plate',
    name: 'Gusset Plate',
    description: 'Triangular plate for bracing connections',
    category: 'Plates',
    baseDefinition: {
      type: PartType.PLATE,
      plateDefinition: {
        thickness: 12,
        material: 'S355',
        contour: [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
          { x: 0, y: 300 }
        ],
        holes: []
      },
      material: {
        grade: 'S355',
        density: 7850
      },
      features: []
    },
    parameters: [
      {
        id: 'baseLength',
        name: 'Base Length',
        type: 'number',
        defaultValue: 300,
        constraints: { min: 150, max: 600 }
      },
      {
        id: 'height',
        name: 'Height',
        type: 'number',
        defaultValue: 300,
        constraints: { min: 150, max: 600 }
      },
      {
        id: 'thickness',
        name: 'Thickness',
        type: 'number',
        defaultValue: 12,
        constraints: { min: 6, max: 25 }
      }
    ],
    constraints: []
  },
  {
    id: 'circular-tube-segment',
    name: 'Circular Tube Segment',
    description: 'Circular hollow section with standard length',
    category: 'Beams',
    baseDefinition: {
      type: PartType.PROFILE,
      profileDefinition: {
        type: ProfileType.TUBE_CIRCULAR,
        designation: 'CHS 219.1x8',
        dimensions: { diameter: 219.1, thickness: 8, length: 3000 } as any,
        length: 3000
      },
      material: {
        grade: 'S355',
        density: 7850
      },
      features: []
    },
    parameters: [
      {
        id: 'length',
        name: 'Length',
        type: 'number',
        defaultValue: 3000,
        constraints: { min: 500, max: 6000 }
      },
      {
        id: 'endCut',
        name: 'End Cut Angle',
        type: 'number',
        defaultValue: 90,
        constraints: { min: 45, max: 90 }
      }
    ],
    constraints: []
  },
  {
    id: 'stiffener-plate',
    name: 'Stiffener Plate',
    description: 'Web stiffener plate for beam reinforcement',
    category: 'Plates',
    baseDefinition: {
      type: PartType.PLATE,
      plateDefinition: {
        thickness: 8,
        material: 'S355',
        contour: [
          { x: -50, y: -100 },
          { x: 50, y: -100 },
          { x: 50, y: 100 },
          { x: -50, y: 100 }
        ],
        holes: []
      },
      material: {
        grade: 'S355',
        density: 7850
      },
      features: []
    },
    parameters: [
      {
        id: 'width',
        name: 'Width',
        type: 'number',
        defaultValue: 100,
        constraints: { min: 50, max: 200 }
      },
      {
        id: 'height',
        name: 'Height',
        type: 'number',
        defaultValue: 200,
        constraints: { min: 100, max: 400 }
      },
      {
        id: 'notchSize',
        name: 'Notch Size',
        type: 'number',
        defaultValue: 10,
        constraints: { min: 5, max: 20 }
      }
    ],
    constraints: []
  },
  {
    id: 'channel-strut',
    name: 'Channel Strut',
    description: 'U-channel profile for support structures',
    category: 'Beams',
    baseDefinition: {
      type: PartType.PROFILE,
      profileDefinition: {
        type: ProfileType.UPN,
        designation: 'UPN 200',
        dimensions: { height: 200, width: 75, webThickness: 8.5, flangeThickness: 11.5, length: 3000 } as any,
        length: 3000
      },
      material: {
        grade: 'S275',
        density: 7850
      },
      features: []
    },
    parameters: [
      {
        id: 'length',
        name: 'Length',
        type: 'number',
        defaultValue: 3000,
        constraints: { min: 500, max: 6000 }
      },
      {
        id: 'slotSpacing',
        name: 'Slot Spacing',
        type: 'number',
        defaultValue: 200,
        constraints: { min: 100, max: 400 }
      }
    ],
    constraints: []
  }
];

export function getPartTemplates(): PartTemplate[] {
  return templates;
}

export function getTemplateById(id: string): PartTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): PartTemplate[] {
  return templates.filter(t => t.category === category);
}

export function applyTemplate(template: PartTemplate, parameters: Record<string, any>): any {
  const partDefinition = JSON.parse(JSON.stringify(template.baseDefinition));

  // Apply parameter values
  template.parameters.forEach(param => {
    const value = parameters[param.id] || param.defaultValue;

    switch (param.id) {
      case 'length':
        if (partDefinition.profileDefinition) {
          partDefinition.profileDefinition.length = value;
        }
        break;
      case 'width':
      case 'plateWidth':
        if (partDefinition.plateDefinition) {
          const bounds = partDefinition.plateDefinition.contour;
          const scale = value / (Math.max(...bounds.map((p: any) => p.x)) - Math.min(...bounds.map((p: any) => p.x)));
          partDefinition.plateDefinition.contour = bounds.map((p: any) => ({
            ...p,
            x: p.x * scale
          }));
        }
        break;
      case 'height':
      case 'plateHeight':
        if (partDefinition.plateDefinition) {
          const bounds = partDefinition.plateDefinition.contour;
          const scale = value / (Math.max(...bounds.map((p: any) => p.y)) - Math.min(...bounds.map((p: any) => p.y)));
          partDefinition.plateDefinition.contour = bounds.map((p: any) => ({
            ...p,
            y: p.y * scale
          }));
        }
        break;
      case 'thickness':
        if (partDefinition.plateDefinition) {
          partDefinition.plateDefinition.thickness = value;
        }
        break;
    }
  });

  partDefinition.id = uuidv4();
  partDefinition.name = `${template.name} - ${new Date().toLocaleDateString()}`;

  return partDefinition;
}