import { UnifiedElement, MaterialCategory, FastenerType, SteelGrade, SurfaceFinish } from '../../types/material-types';

/**
 * Base de données des accessoires spécialisés de construction métallique
 * Ancrages, levage, éléments de charpente, scellements
 * Conforme aux normes EN 1993, EN 1992, ETA (European Technical Assessment)
 */

// Diamètres standard pour ancrages (mm)
const ANCHOR_DIAMETERS = [12, 16, 20, 24, 27, 30, 36, 42, 48];

// Longueurs standard pour tiges d'ancrage (mm)
const ANCHOR_LENGTHS = [150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500];

// Capacités de levage standard (tonnes)
const LIFTING_CAPACITIES = [0.5, 1, 1.5, 2, 3, 5, 8, 10, 15, 20, 25, 30];

// Fonction utilitaire pour créer des séries d'ancrages
function createAnchorSeries(
  baseId: string,
  fastenerType: FastenerType,
  diameters: number[],
  lengths: number[],
  grade: SteelGrade,
  finish: SurfaceFinish,
  standard: string
): UnifiedElement[] {
  return diameters.flatMap(diameter =>
    lengths.map(length => ({
      id: `${baseId}_${diameter}x${length}`,
      name: `${getAnchorName(fastenerType)} Ø${diameter}x${length}mm`,
      description: `${getAnchorDescription(fastenerType)} diamètre ${diameter}mm longueur ${length}mm`,
      category: MaterialCategory.FASTENERS,
      type: fastenerType,
      dimensions: {
        diameter: diameter,
        length: length,
        threadPitch: getThreadPitch(diameter),
        headDiameter: getAnchorHeadDiameter(fastenerType, diameter),
        headHeight: getAnchorHeadHeight(fastenerType, diameter)
      },
      material: {
        designation: grade,
        grade: grade,
        finish: finish,
        yieldStrength: getYieldStrength(grade),
        tensileStrength: getTensileStrength(grade),
        standard: standard
      },
      weight: calculateAnchorWeight(fastenerType, diameter, length),
      visual: {
        color: getAnchorColor(finish),
        metalness: 0.8,
        roughness: getRoughness(finish),
        opacity: 1.0
      },
      partNumber: `${baseId}_${diameter}x${length}_${grade}_${finish}`,
      searchTags: ['ancrage', 'scellement', `Ø${diameter}`, grade, fastenerType],
      source: standard
    }))
  );
}

// Fonctions utilitaires pour ancrages
function getAnchorName(type: FastenerType): string {
  switch (type) {
    case FastenerType.ANCHOR_ROD: return 'Tige d\'ancrage';
    case FastenerType.L_ANCHOR: return 'Crosse d\'ancrage';
    case FastenerType.J_ANCHOR: return 'Ancrage en J';
    case FastenerType.HOOK_ANCHOR: return 'Crochet d\'ancrage';
    case FastenerType.WEDGE_ANCHOR: return 'Cheville à expansion';
    case FastenerType.CHEMICAL_ANCHOR: return 'Scellement chimique';
    default: return 'Ancrage';
  }
}

function getAnchorDescription(type: FastenerType): string {
  switch (type) {
    case FastenerType.ANCHOR_ROD: return 'Tige d\'ancrage droite filetée';
    case FastenerType.L_ANCHOR: return 'Crosse d\'ancrage coudée 90°';
    case FastenerType.J_ANCHOR: return 'Ancrage courbe en forme de J';
    case FastenerType.HOOK_ANCHOR: return 'Crochet d\'ancrage avec retour';
    case FastenerType.WEDGE_ANCHOR: return 'Cheville à expansion mécanique';
    case FastenerType.CHEMICAL_ANCHOR: return 'Goujon pour scellement chimique';
    default: return 'Élément d\'ancrage';
  }
}

function getAnchorHeadDiameter(type: FastenerType, diameter: number): number {
  switch (type) {
    case FastenerType.ANCHOR_ROD: return diameter * 1.8; // Écrou hex standard
    case FastenerType.L_ANCHOR: return diameter * 1.5; // Partie coudée
    case FastenerType.J_ANCHOR: return diameter * 1.2; // Courbure J
    case FastenerType.HOOK_ANCHOR: return diameter * 2.0; // Crochet élargi
    case FastenerType.WEDGE_ANCHOR: return diameter * 1.6; // Tête expansion
    case FastenerType.CHEMICAL_ANCHOR: return diameter * 1.8; // Écrou
    default: return diameter * 1.5;
  }
}

function getAnchorHeadHeight(type: FastenerType, diameter: number): number {
  switch (type) {
    case FastenerType.ANCHOR_ROD: return diameter * 0.8; // Écrou
    case FastenerType.L_ANCHOR: return diameter * 5; // Longueur retour
    case FastenerType.J_ANCHOR: return diameter * 4; // Hauteur J
    case FastenerType.HOOK_ANCHOR: return diameter * 3; // Hauteur crochet
    case FastenerType.WEDGE_ANCHOR: return diameter * 1.2; // Hauteur expansion
    case FastenerType.CHEMICAL_ANCHOR: return diameter * 0.8; // Écrou
    default: return diameter;
  }
}

function calculateAnchorWeight(type: FastenerType, diameter: number, length: number): number {
  const density = 7850; // kg/m³
  const baseVolume = Math.PI * Math.pow(diameter / 2000, 2) * (length / 1000);
  
  let multiplier = 1;
  switch (type) {
    case FastenerType.L_ANCHOR: multiplier = 1.3; break; // Coude supplémentaire
    case FastenerType.J_ANCHOR: multiplier = 1.2; break; // Courbure
    case FastenerType.HOOK_ANCHOR: multiplier = 1.4; break; // Crochet + retour
    case FastenerType.WEDGE_ANCHOR: multiplier = 1.1; break; // Mécanisme expansion
  }
  
  return baseVolume * density * multiplier;
}

// Fonctions utilitaires générales
function getThreadPitch(diameter: number): number {
  const pitches: Record<number, number> = {
    12: 1.75, 16: 2.0, 20: 2.5, 24: 3.0, 27: 3.0, 30: 3.5, 36: 4.0, 42: 4.5, 48: 5.0
  };
  return pitches[diameter] || 2.0;
}

function getYieldStrength(grade: SteelGrade): number {
  const strengths: Record<string, number> = {
    'S235': 235, 'S275': 275, 'S355': 355, 'S420': 420, 'S460': 460,
    'INOX_316': 220
  };
  return strengths[grade] || 355;
}

function getTensileStrength(grade: SteelGrade): number {
  const strengths: Record<string, number> = {
    'S235': 360, 'S275': 430, 'S355': 510, 'S420': 520, 'S460': 540,
    'INOX_316': 520
  };
  return strengths[grade] || 510;
}

function getAnchorColor(finish: SurfaceFinish): string {
  switch (finish) {
    case SurfaceFinish.GALVANIZED: return '#E8E8E8';
    case SurfaceFinish.STAINLESS: return '#F8F9FA';
    case SurfaceFinish.RAW: return '#4A5568';
    default: return '#6B7280';
  }
}

function getRoughness(finish: SurfaceFinish): number {
  switch (finish) {
    case SurfaceFinish.STAINLESS: return 0.2;
    case SurfaceFinish.GALVANIZED: return 0.4;
    default: return 0.6;
  }
}

// Base de données des accessoires spécialisés
export const SPECIALIZED_ACCESSORIES_DATABASE: UnifiedElement[] = [
  // ==================== TIGES D'ANCRAGE ====================
  
  // Tiges d'ancrage droites S355 galvanisées
  ...createAnchorSeries(
    'ANCHOR_ROD_S355_GALV',
    FastenerType.ANCHOR_ROD,
    ANCHOR_DIAMETERS,
    ANCHOR_LENGTHS,
    SteelGrade.S355,
    SurfaceFinish.GALVANIZED,
    'EN 1993-1-8'
  ),
  
  // Tiges d'ancrage inox 316
  ...createAnchorSeries(
    'ANCHOR_ROD_INOX316',
    FastenerType.ANCHOR_ROD,
    [12, 16, 20, 24, 30],
    [200, 300, 400, 500, 750],
    SteelGrade.INOX_316,
    SurfaceFinish.STAINLESS,
    'EN 1993-1-8'
  ),
  
  // ==================== CROSSES D'ANCRAGE ====================
  
  // Crosses d'ancrage L S355 galvanisées
  ...createAnchorSeries(
    'L_ANCHOR_S355_GALV',
    FastenerType.L_ANCHOR,
    [16, 20, 24, 27, 30, 36],
    [250, 300, 400, 500, 600, 750],
    SteelGrade.S355,
    SurfaceFinish.GALVANIZED,
    'EN 1993-1-8'
  ),
  
  // ==================== ANCRAGES EN J ====================
  
  // Ancrages en J S355 galvanisés
  ...createAnchorSeries(
    'J_ANCHOR_S355_GALV',
    FastenerType.J_ANCHOR,
    [12, 16, 20, 24, 27, 30],
    [200, 250, 300, 400, 500],
    SteelGrade.S355,
    SurfaceFinish.GALVANIZED,
    'EN 1993-1-8'
  ),
  
  // ==================== CROCHETS D'ANCRAGE ====================
  
  // Crochets d'ancrage avec retour S355
  ...createAnchorSeries(
    'HOOK_ANCHOR_S355_GALV',
    FastenerType.HOOK_ANCHOR,
    [16, 20, 24, 30],
    [300, 400, 500, 600],
    SteelGrade.S355,
    SurfaceFinish.GALVANIZED,
    'EN 1993-1-8'
  ),
  
  // ==================== CHEVILLES À EXPANSION ====================
  
  // Chevilles à expansion mécaniques
  ...[8, 10, 12, 16, 20, 24].flatMap(diameter =>
    [60, 80, 100, 120, 150, 200].map(length => ({
      id: `WEDGE_ANCHOR_${diameter}x${length}`,
      name: `Cheville expansion Ø${diameter}x${length}mm`,
      description: `Cheville à expansion mécanique Ø${diameter}mm longueur ${length}mm`,
      category: MaterialCategory.FASTENERS,
      type: FastenerType.WEDGE_ANCHOR,
      dimensions: {
        diameter: diameter,
        length: length,
        headDiameter: diameter * 1.8,
        headHeight: diameter * 0.7
      },
      material: {
        designation: 'Acier zingué',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.ZINC_PLATED,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: 'ETA-11/0040'
      },
      weight: calculateAnchorWeight(FastenerType.WEDGE_ANCHOR, diameter, length),
      visual: {
        color: '#F4F4F4',
        metalness: 0.7,
        roughness: 0.4,
        opacity: 1.0
      },
      partNumber: `WEDGE_${diameter}x${length}_ZP`,
      searchTags: ['cheville', 'expansion', 'mécanique', `Ø${diameter}`, 'béton'],
      source: 'ETA-11/0040'
    }))
  ),
  
  // ==================== SCELLEMENTS CHIMIQUES ====================
  
  // Goujons pour scellement chimique
  ...[8, 10, 12, 16, 20, 24, 30].flatMap(diameter =>
    [80, 100, 125, 160, 200, 250, 300].map(length => ({
      id: `CHEMICAL_ANCHOR_${diameter}x${length}`,
      name: `Goujon scellement chimique M${diameter}x${length}`,
      description: `Goujon fileté pour scellement chimique M${diameter}x${length}mm`,
      category: MaterialCategory.FASTENERS,
      type: FastenerType.CHEMICAL_ANCHOR,
      dimensions: {
        diameter: diameter,
        length: length,
        threadPitch: getThreadPitch(diameter),
        headDiameter: diameter * 1.8,
        headHeight: diameter * 0.8
      },
      material: {
        designation: 'Classe 8.8',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.ZINC_PLATED,
        yieldStrength: 640,
        tensileStrength: 800,
        standard: 'ETA-02/0001'
      },
      weight: Math.PI * Math.pow(diameter / 2000, 2) * (length / 1000) * 7850,
      visual: {
        color: '#F4F4F4',
        metalness: 0.8,
        roughness: 0.4,
        opacity: 1.0
      },
      partNumber: `CHEM_M${diameter}x${length}_8.8`,
      searchTags: ['scellement', 'chimique', 'goujon', `M${diameter}`, 'béton'],
      source: 'ETA-02/0001'
    }))
  ),
  
  // ==================== ANNEAUX DE LEVAGE ====================
  
  // Anneaux de levage standards
  ...LIFTING_CAPACITIES.map(capacity => {
    const diameter = capacity <= 1 ? 10 : capacity <= 3 ? 16 : capacity <= 8 ? 20 : capacity <= 15 ? 24 : 30;
    const ringDiameter = diameter * 3;
    
    return {
      id: `LIFTING_EYE_${capacity}T`,
      name: `Anneau de levage ${capacity}T`,
      description: `Anneau de levage capacité ${capacity} tonnes filetage M${diameter}`,
      category: MaterialCategory.FASTENERS,
      type: FastenerType.LIFTING_EYE,
      dimensions: {
        diameter: diameter,
        width: ringDiameter,
        height: ringDiameter * 1.2,
        threadPitch: getThreadPitch(diameter)
      },
      material: {
        designation: 'Classe 8 traitée',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.GALVANIZED,
        yieldStrength: 640,
        tensileStrength: 800,
        standard: 'EN 13155'
      },
      weight: (Math.PI * Math.pow(diameter / 2000, 2) * 0.05 + 
              Math.PI * Math.pow(ringDiameter / 2000, 2) * 0.01) * 7850,
      visual: {
        color: '#E8E8E8',
        metalness: 0.8,
        roughness: 0.3,
        opacity: 1.0
      },
      partNumber: `LIFT_EYE_${capacity}T_M${diameter}`,
      searchTags: ['anneau', 'levage', 'manutention', `${capacity}T`, 'M' + diameter],
      source: 'EN 13155',
      metadata: {
        liftingCapacity: capacity * 1000, // kg
        workingLoadLimit: capacity,
        safetyFactor: 4
      }
    };
  }),
  
  // ==================== MANILLES ====================
  
  // Manilles droites galvanisées
  ...[0.5, 1, 2, 3, 5, 8, 10, 15, 20].map(capacity => {
    const diameter = capacity <= 1 ? 6 : capacity <= 3 ? 8 : capacity <= 8 ? 10 : capacity <= 15 ? 13 : 16;
    const width = diameter * 2;
    const length = diameter * 4;
    
    return {
      id: `SHACKLE_${capacity}T`,
      name: `Manille droite ${capacity}T`,
      description: `Manille droite galvanisée capacité ${capacity} tonnes axe Ø${diameter}mm`,
      category: MaterialCategory.FASTENERS,
      type: FastenerType.SHACKLE,
      dimensions: {
        diameter: diameter,
        width: width,
        length: length,
        thickness: diameter * 0.8
      },
      material: {
        designation: 'Acier forgé galva',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.GALVANIZED,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: 'EN 13889'
      },
      weight: (Math.PI * Math.pow(diameter / 2000, 2) * (length / 1000) * 2 + 
              (width / 1000) * (length / 1000) * (diameter * 0.8 / 1000)) * 7850,
      visual: {
        color: '#E8E8E8',
        metalness: 0.7,
        roughness: 0.4,
        opacity: 1.0
      },
      partNumber: `SHACKLE_${capacity}T_${diameter}mm`,
      searchTags: ['manille', 'levage', 'élingue', `${capacity}T`, 'galvanisé'],
      source: 'EN 13889',
      metadata: {
        liftingCapacity: capacity * 1000,
        workingLoadLimit: capacity,
        safetyFactor: 4
      }
    };
  }),
  
  // ==================== RIDOIRS ====================
  
  // Ridoirs à œil galvanisés
  ...[3, 5, 8, 10, 12, 16, 20, 24].map(diameter => ({
    id: `TURNBUCKLE_M${diameter}`,
    name: `Ridoir à œil M${diameter}`,
    description: `Ridoir à œil galvanisé filetage M${diameter} course 100mm`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.TURNBUCKLE,
    dimensions: {
      diameter: diameter,
      length: 200 + diameter * 5, // Longueur variable selon diamètre
      width: diameter * 2.5,
      threadPitch: getThreadPitch(diameter)
    },
    material: {
      designation: 'Acier galvanisé',
      grade: SteelGrade.S275,
      finish: SurfaceFinish.GALVANIZED,
      yieldStrength: 275,
      tensileStrength: 430,
      standard: 'EN 1999-1-4'
    },
    weight: Math.PI * Math.pow(diameter / 2000, 2) * ((200 + diameter * 5) / 1000) * 7850 * 1.5,
    visual: {
      color: '#E8E8E8',
      metalness: 0.7,
      roughness: 0.4,
      opacity: 1.0
    },
    partNumber: `TURNBUCKLE_M${diameter}_GALV`,
    searchTags: ['ridoir', 'tendeur', 'réglage', `M${diameter}`, 'galvanisé'],
    source: 'EN 1999-1-4'
  })),
  
  // ==================== SERRE-CÂBLES ====================
  
  // Serre-câbles galvanisés
  ...[3, 4, 5, 6, 8, 10, 12, 16, 20].map(cableSize => ({
    id: `WIRE_ROPE_CLIP_${cableSize}mm`,
    name: `Serre-câble ${cableSize}mm`,
    description: `Serre-câble galvanisé pour câble Ø${cableSize}mm`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.WIRE_ROPE_CLIP,
    dimensions: {
      diameter: cableSize,
      length: cableSize * 6,
      width: cableSize * 3,
      height: cableSize * 2
    },
    material: {
      designation: 'Fonte malléable galva',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.GALVANIZED,
      standard: 'EN 13411-5'
    },
    weight: Math.pow(cableSize / 1000, 3) * 7850 * 20, // Approximation
    visual: {
      color: '#E8E8E8',
      metalness: 0.6,
      roughness: 0.5,
      opacity: 1.0
    },
    partNumber: `CLIP_${cableSize}mm_GALV`,
    searchTags: ['serre-câble', 'étrier', 'câblage', `${cableSize}mm`, 'galvanisé'],
    source: 'EN 13411-5'
  })),
  
  // ==================== PLAQUES D'APPUI ====================
  
  // Plaques d'appui en élastomère
  ...[100, 150, 200, 250, 300, 400].flatMap(size =>
    [10, 15, 20, 25, 30].map(thickness => ({
      id: `BEARING_PAD_${size}x${size}x${thickness}`,
      name: `Plaque d'appui ${size}x${size}x${thickness}`,
      description: `Plaque d'appui élastomère ${size}x${size}x${thickness}mm durée 60 Shore A`,
      category: MaterialCategory.ACCESSORIES,
      type: FastenerType.BEARING_PAD,
      dimensions: {
        length: size,
        width: size,
        thickness: thickness
      },
      material: {
        designation: 'Élastomère 60 ShA',
        grade: SteelGrade.S235, // Grade fictif pour cohérence
        finish: SurfaceFinish.RAW,
        standard: 'EN 1337-3'
      },
      weight: (size / 1000) * (size / 1000) * (thickness / 1000) * 1200, // Densité élastomère
      area: (size * size) / 1000000,
      volume: (size * size * thickness) / 1000000000,
      visual: {
        color: '#2D3748',
        metalness: 0.1,
        roughness: 0.9,
        opacity: 1.0
      },
      partNumber: `BEAR_PAD_${size}x${thickness}`,
      searchTags: ['plaque', 'appui', 'élastomère', 'néoprène', `${size}x${thickness}`],
      source: 'EN 1337-3'
    }))
  ),
  
  // ==================== JOINTS DE DILATATION ====================
  
  // Joints de dilatation pour charpente
  ...[50, 75, 100, 125, 150, 200].map(movement => ({
    id: `EXPANSION_JOINT_${movement}mm`,
    name: `Joint de dilatation ${movement}mm`,
    description: `Joint de dilatation course ±${movement}mm pour charpente métallique`,
    category: MaterialCategory.ACCESSORIES,
    type: FastenerType.EXPANSION_JOINT,
    dimensions: {
      length: 300,
      width: 200,
      height: 100,
      thickness: movement // Course de dilatation
    },
    material: {
      designation: 'Acier inox + élastomère',
      grade: SteelGrade.INOX_316,
      finish: SurfaceFinish.STAINLESS,
      standard: 'EN 1337-4'
    },
    weight: 2.5 + (movement / 50), // Poids approximatif
    visual: {
      color: '#F8F9FA',
      metalness: 0.8,
      roughness: 0.3,
      opacity: 1.0
    },
    partNumber: `EXP_JOINT_${movement}mm`,
    searchTags: ['joint', 'dilatation', 'expansion', `±${movement}mm`, 'charpente'],
    source: 'EN 1337-4',
    metadata: {
      movementRange: movement,
      temperature: [-40, 80]
    }
  })),
  
  // ==================== GARGOUILLES D'ÉVACUATION ====================
  
  // Gargouilles en fonte galvanisée
  ...[80, 100, 125, 150, 200].map(diameter => ({
    id: `DRAINAGE_SCUPPER_${diameter}mm`,
    name: `Gargouille évacuation Ø${diameter}mm`,
    description: `Gargouille d'évacuation fonte galvanisée Ø${diameter}mm`,
    category: MaterialCategory.ACCESSORIES,
    type: FastenerType.DRAINAGE_SCUPPER,
    dimensions: {
      diameter: diameter,
      length: 200,
      width: diameter * 1.5,
      height: diameter * 0.8
    },
    material: {
      designation: 'Fonte galvanisée',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.GALVANIZED,
      standard: 'EN 12056-3'
    },
    weight: Math.PI * Math.pow(diameter / 2000, 2) * 0.2 * 7200, // Fonte
    visual: {
      color: '#E8E8E8',
      metalness: 0.5,
      roughness: 0.6,
      opacity: 1.0
    },
    partNumber: `SCUPPER_${diameter}mm_GALV`,
    searchTags: ['gargouille', 'évacuation', 'drainage', `Ø${diameter}`, 'toiture'],
    source: 'EN 12056-3'
  })),
  
  // ==================== CÂBLES DE SÉCURITÉ ====================
  
  // Câbles de sécurité inox
  ...[4, 5, 6, 8, 10].flatMap(diameter =>
    [5, 10, 15, 20, 25, 30, 50].map(length => ({
      id: `SAFETY_CABLE_${diameter}x${length}m`,
      name: `Câble sécurité Ø${diameter}mm L=${length}m`,
      description: `Câble de sécurité inox 316 Ø${diameter}mm longueur ${length}m`,
      category: MaterialCategory.ACCESSORIES,
      type: FastenerType.SAFETY_CABLE,
      dimensions: {
        diameter: diameter,
        length: length * 1000 // Conversion en mm
      },
      material: {
        designation: 'Inox 316 7x19',
        grade: SteelGrade.INOX_316,
        finish: SurfaceFinish.STAINLESS,
        tensileStrength: 1570,
        standard: 'EN 12385-4'
      },
      weight: Math.PI * Math.pow(diameter / 2000, 2) * length * 8000, // Densité câble
      visual: {
        color: '#F8F9FA',
        metalness: 0.9,
        roughness: 0.4,
        opacity: 1.0
      },
      partNumber: `SAFETY_${diameter}x${length}m_INOX`,
      searchTags: ['câble', 'sécurité', 'inox', `Ø${diameter}`, `${length}m`],
      source: 'EN 12385-4',
      metadata: {
        construction: '7x19',
        breakingLoad: Math.PI * Math.pow(diameter, 2) * 1570 / 4 / 1000 // kN
      }
    }))
  )
];

// Export des utilitaires
export { 
  ANCHOR_DIAMETERS, 
  ANCHOR_LENGTHS, 
  LIFTING_CAPACITIES,
  createAnchorSeries 
};