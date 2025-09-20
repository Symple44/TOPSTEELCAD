import { Vector3 } from './Vector3';

// Types from parent
interface Hole {
  id: string;
  diameter: number;
  position: Vector3;
  face: string;
  depth?: number;
  isThrough: boolean;
}

interface Notch {
  id: string;
  type: string;
  position: Vector3;
  width: number;
  height: number;
  depth: number;
  face: string;
}

interface Part {
  id: string;
  name: string;
  profileType: string;
  profileSize: string;
  length: number;
  material: string;
  quantity: number;
  holes: Hole[];
  notches: Notch[];
  startCut?: { angle: number; direction: string };
  endCut?: { angle: number; direction: string };
  weight?: number;
  notes?: string;
}

// Export vers DSTV (format NC pour machines de découpe)
export const exportToDSTV = (parts: Part[]): string => {
  let dstvContent = '';

  parts.forEach(part => {
    // En-tête DSTV
    dstvContent += `ST\n`;
    dstvContent += `${part.name}\n`;
    dstvContent += `P ${part.profileType} ${part.profileSize}\n`;
    dstvContent += `L ${part.length}\n`;
    dstvContent += `M ${part.material}\n`;
    dstvContent += `Q ${part.quantity}\n`;

    // Trous
    part.holes.forEach((hole, index) => {
      const face = hole.face === 'TOP_FLANGE' ? 'v' : hole.face === 'BOTTOM_FLANGE' ? 'u' : 'w';
      dstvContent += `BO ${face} ${hole.position.z} ${hole.position.x} ${hole.diameter}\n`;
    });

    // Encoches
    part.notches.forEach((notch) => {
      const face = notch.face === 'TOP_FLANGE' ? 'v' : notch.face === 'BOTTOM_FLANGE' ? 'u' : 'w';
      if (notch.type === 'RECTANGULAR') {
        dstvContent += `AK ${face} ${notch.position.z} ${notch.position.x} ${notch.width} ${notch.height} ${notch.depth}\n`;
      } else if (notch.type === 'CIRCULAR') {
        dstvContent += `IK ${face} ${notch.position.z} ${notch.position.x} ${notch.width / 2}\n`;
      }
    });

    // Coupes d'extrémité
    if (part.startCut) {
      dstvContent += `KA ${part.startCut.angle} ${part.startCut.direction}\n`;
    }
    if (part.endCut) {
      dstvContent += `KE ${part.endCut.angle} ${part.endCut.direction}\n`;
    }

    dstvContent += `EN\n\n`;
  });

  return dstvContent;
};

// Export vers IFC (format BIM)
export const exportToIFC = (parts: Part[]): string => {
  const timestamp = new Date().toISOString();
  let ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('TopSteelCAD Part Export'), '2;1');
FILE_NAME('parts.ifc', '${timestamp}', ('TopSteelCAD'), (''), 'IFC4', '', '');
FILE_SCHEMA(('IFC4'));
ENDSEC;

DATA;
`;

  let entityId = 1;

  // Organisation et projet
  ifcContent += `#${entityId++}=IFCORGANIZATION($, 'TopSteelCAD', '', $, $);\n`;
  ifcContent += `#${entityId++}=IFCAPPLICATION(#1, '1.0', 'TopSteelCAD Part Builder', 'TSC');\n`;
  ifcContent += `#${entityId++}=IFCPERSON($, $, 'User', $, $, $, $, $);\n`;
  ifcContent += `#${entityId++}=IFCPERSONANDORGANIZATION(#3, #1, $);\n`;

  // Contexte géométrique
  const contextId = entityId++;
  ifcContent += `#${contextId}=IFCGEOMETRICREPRESENTATIONCONTEXT($, 'Model', 3, 1.E-05, #${entityId}, $);\n`;
  ifcContent += `#${entityId++}=IFCAXIS2PLACEMENT3D(#${entityId}, $, $);\n`;
  ifcContent += `#${entityId++}=IFCCARTESIANPOINT((0., 0., 0.));\n`;

  // Export des pièces
  parts.forEach(part => {
    const beamId = entityId++;
    const profileId = entityId++;
    const materialId = entityId++;

    // Matériau
    ifcContent += `#${materialId}=IFCMATERIAL('${part.material}');\n`;

    // Profile
    let profileDef = '';
    if (part.profileType === 'IPE' || part.profileType === 'HEA' || part.profileType === 'HEB') {
      profileDef = `IFCISHAPEPROFILEDEF`;
    } else if (part.profileType === 'RHS') {
      profileDef = `IFCRECTANGLEHOLLOWPROFILEDEF`;
    } else if (part.profileType === 'CHS') {
      profileDef = `IFCCIRCLEHOLLOWPROFILEDEF`;
    } else if (part.profileType === 'L') {
      profileDef = `IFCLSHAPEPROFILEDEF`;
    } else {
      profileDef = `IFCRECTANGLEPROFILEDEF`;
    }

    ifcContent += `#${profileId}=${profileDef}(.AREA., '${part.profileType} ${part.profileSize}', $, 0., 0.);\n`;

    // Beam/Column
    const elementType = part.profileType === 'COLUMN' ? 'IFCCOLUMN' : 'IFCBEAM';
    ifcContent += `#${beamId}=${elementType}('${part.id}', $, '${part.name}', '', $, $, $, $);\n`;

    // Association matériau
    ifcContent += `#${entityId++}=IFCRELASSOCIATESMATERIAL('${entityId}', $, $, $, (#${beamId}), #${materialId});\n`;

    // Trous (simplifiés comme propriétés)
    if (part.holes.length > 0) {
      const propSetId = entityId++;
      ifcContent += `#${propSetId}=IFCPROPERTYSET('${entityId}', $, 'Holes', '', (\n`;
      part.holes.forEach((hole, i) => {
        ifcContent += `#${entityId++}=IFCPROPERTYSINGLEVALUE('Hole_${i + 1}', '', IFCLENGTHMEASURE(${hole.diameter}), $)${i < part.holes.length - 1 ? ',' : ''}\n`;
      });
      ifcContent += `));\n`;
      ifcContent += `#${entityId++}=IFCRELDEFINESBYPROPERTIES('${entityId}', $, $, $, (#${beamId}), #${propSetId});\n`;
    }
  });

  ifcContent += `ENDSEC;
END-ISO-10303-21;`;

  return ifcContent;
};

// Export vers STEP (format CAO neutre)
export const exportToSTEP = (parts: Part[]): string => {
  const timestamp = new Date().toISOString();
  let stepContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('TopSteelCAD Part Export'), '1');
FILE_NAME('parts.step', '${timestamp}', ('TopSteelCAD'), (''), 'AP214', '', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;

DATA;
`;

  let entityId = 1;

  // Unités et contexte
  stepContent += `#${entityId++}=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));\n`;
  stepContent += `#${entityId++}=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));\n`;
  stepContent += `#${entityId++}=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());\n`;

  // Système de coordonnées
  const originId = entityId++;
  const axisId = entityId++;
  const planeId = entityId++;

  stepContent += `#${originId}=CARTESIAN_POINT('Origin', (0., 0., 0.));\n`;
  stepContent += `#${axisId}=DIRECTION('Z_Axis', (0., 0., 1.));\n`;
  stepContent += `#${planeId}=DIRECTION('X_Axis', (1., 0., 0.));\n`;

  parts.forEach(part => {
    // Point de départ de la pièce
    const startPointId = entityId++;
    stepContent += `#${startPointId}=CARTESIAN_POINT('${part.name}_start', (0., 0., 0.));\n`;

    // Point de fin de la pièce
    const endPointId = entityId++;
    stepContent += `#${endPointId}=CARTESIAN_POINT('${part.name}_end', (0., 0., ${part.length}));\n`;

    // Ligne représentant la pièce (simplifiée)
    const lineId = entityId++;
    stepContent += `#${lineId}=LINE('${part.name}_line', #${startPointId}, #${entityId++});\n`;
    stepContent += `#${entityId - 1}=VECTOR('${part.name}_vector', #${entityId++}, ${part.length});\n`;
    stepContent += `#${entityId - 1}=DIRECTION('${part.name}_direction', (0., 0., 1.));\n`;

    // Représentation des trous comme des cylindres
    part.holes.forEach((hole, index) => {
      const holeCenterId = entityId++;
      stepContent += `#${holeCenterId}=CARTESIAN_POINT('${part.name}_hole_${index}', (${hole.position.x}, ${hole.position.y}, ${hole.position.z}));\n`;

      const cylinderId = entityId++;
      stepContent += `#${cylinderId}=CYLINDRICAL_SURFACE('${part.name}_hole_surface_${index}', #${entityId++}, ${hole.diameter / 2});\n`;
      stepContent += `#${entityId - 1}=AXIS2_PLACEMENT_3D('', #${holeCenterId}, #${axisId}, #${planeId});\n`;
    });

    // Annotation pour le matériau et autres propriétés
    const annotationId = entityId++;
    stepContent += `#${annotationId}=DRAUGHTING_PRE_DEFINED_TEXT_FONT('Material: ${part.material}, Profile: ${part.profileType} ${part.profileSize}');\n`;
  });

  stepContent += `ENDSEC;
END-ISO-10303-21;`;

  return stepContent;
};

// Export vers JSON (format structuré)
export const exportToJSON = (parts: Part[]): string => {
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    source: 'TopSteelCAD Part Builder',
    parts: parts.map(part => ({
      ...part,
      holes: part.holes.map(hole => ({
        ...hole,
        position: {
          x: hole.position.x,
          y: hole.position.y,
          z: hole.position.z
        }
      })),
      notches: part.notches.map(notch => ({
        ...notch,
        position: {
          x: notch.position.x,
          y: notch.position.y,
          z: notch.position.z
        }
      }))
    }))
  };

  return JSON.stringify(exportData, null, 2);
};

// Export vers CSV avancé
export const exportToCSVAdvanced = (parts: Part[]): string => {
  let csv = 'ID,Nom,Type Profil,Section,Longueur (mm),Matériau,Quantité,Nb Trous,Nb Encoches,Coupe Début,Coupe Fin,Poids (kg),Notes\n';

  parts.forEach(part => {
    const row = [
      part.id,
      `"${part.name}"`,
      part.profileType,
      part.profileSize,
      part.length,
      part.material,
      part.quantity,
      part.holes.length,
      part.notches.length,
      part.startCut ? `${part.startCut.angle}°/${part.startCut.direction}` : '-',
      part.endCut ? `${part.endCut.angle}°/${part.endCut.direction}` : '-',
      part.weight || '-',
      `"${part.notes || ''}"`
    ];
    csv += row.join(',') + '\n';
  });

  // Ajouter une section détaillée pour les trous
  csv += '\n\nDétail des trous\n';
  csv += 'Pièce ID,Trou ID,Diamètre (mm),Position X,Position Y,Position Z,Face,Traversant\n';

  parts.forEach(part => {
    part.holes.forEach(hole => {
      const holeRow = [
        part.id,
        hole.id,
        hole.diameter,
        hole.position.x,
        hole.position.y,
        hole.position.z,
        hole.face,
        hole.isThrough ? 'Oui' : 'Non'
      ];
      csv += holeRow.join(',') + '\n';
    });
  });

  // Ajouter une section détaillée pour les encoches
  csv += '\n\nDétail des encoches\n';
  csv += 'Pièce ID,Encoche ID,Type,Largeur (mm),Hauteur (mm),Profondeur (mm),Position X,Position Y,Position Z,Face\n';

  parts.forEach(part => {
    part.notches.forEach(notch => {
      const notchRow = [
        part.id,
        notch.id,
        notch.type,
        notch.width,
        notch.height,
        notch.depth,
        notch.position.x,
        notch.position.y,
        notch.position.z,
        notch.face
      ];
      csv += notchRow.join(',') + '\n';
    });
  });

  return csv;
};

// Fonction utilitaire pour télécharger un fichier
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export helper avec format automatique
export const exportParts = (parts: Part[], format: 'DSTV' | 'IFC' | 'STEP' | 'JSON' | 'CSV') => {
  let content = '';
  let filename = '';
  let mimeType = '';

  switch (format) {
    case 'DSTV':
      content = exportToDSTV(parts);
      filename = `parts_${Date.now()}.nc`;
      mimeType = 'text/plain';
      break;
    case 'IFC':
      content = exportToIFC(parts);
      filename = `parts_${Date.now()}.ifc`;
      mimeType = 'application/x-step';
      break;
    case 'STEP':
      content = exportToSTEP(parts);
      filename = `parts_${Date.now()}.step`;
      mimeType = 'application/x-step';
      break;
    case 'JSON':
      content = exportToJSON(parts);
      filename = `parts_${Date.now()}.json`;
      mimeType = 'application/json';
      break;
    case 'CSV':
      content = exportToCSVAdvanced(parts);
      filename = `parts_${Date.now()}.csv`;
      mimeType = 'text/csv';
      break;
  }

  downloadFile(content, filename, mimeType);
};