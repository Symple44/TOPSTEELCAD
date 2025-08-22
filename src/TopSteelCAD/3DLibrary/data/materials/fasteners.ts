import { UnifiedElement, MaterialCategory, FastenerType, SteelGrade, SurfaceFinish, BoltStrengthClass } from '../../types/material-types';

/**
 * Base de données complète de la boulonnerie et fixations
 * Conforme aux normes ISO 4762, ISO 7380, DIN 912, DIN 7991, etc.
 */

// Diamètres métriques standard (mm)
const METRIC_DIAMETERS = [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 36, 42, 48];

// Longueurs standard pour boulons (mm)
const BOLT_LENGTHS = [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 240, 260, 280, 300];

// Fonction utilitaire pour créer des séries de boulons
function createBoltSeries(
  baseId: string,
  fastenerType: FastenerType,
  diameters: number[],
  lengths: number[],
  strengthClass: BoltStrengthClass,
  finish: SurfaceFinish,
  standard: string
): UnifiedElement[] {
  const elements: UnifiedElement[] = [];
  
  diameters.forEach(diameter => {
    lengths.forEach(length => {
      // Filtrage des combinaisons invalides
      if (length < diameter * 2) return; // Longueur minimum
      if (diameter >= 24 && length < 30) return; // Gros diamètres
      
      elements.push({
        id: `${baseId}_M${diameter}x${length}`,
        name: `${getBoltName(fastenerType)} M${diameter}x${length}`,
        description: `${getBoltDescription(fastenerType)} M${diameter}x${length} classe ${strengthClass}`,
        category: MaterialCategory.FASTENERS,
        type: fastenerType,
        dimensions: {
          diameter: diameter,
          length: length,
          threadPitch: getThreadPitch(diameter),
          headDiameter: getHeadDiameter(fastenerType, diameter),
          headHeight: getHeadHeight(fastenerType, diameter),
          driveSize: getDriveSize(fastenerType, diameter),
          socketSize: getSocketSize(fastenerType, diameter)
        },
        material: {
          designation: strengthClass,
          grade: getBoltGrade(strengthClass),
          finish: finish,
          standard: standard,
          ...getBoltProperties(strengthClass)
        },
        weight: calculateBoltWeight(fastenerType, diameter, length),
        visual: {
          color: getBoltColor(finish),
          metalness: 0.8,
          roughness: getRoughness(finish),
          opacity: 1.0
        },
        partNumber: `${baseId}_M${diameter}x${length}_${strengthClass}_${finish}`,
        searchTags: ['boulon', 'vis', 'fixation', `M${diameter}`, strengthClass, finish],
        source: standard
      });
    });
  });
  
  return elements;
}

// Fonctions utilitaires pour dimensions
function getThreadPitch(diameter: number): number {
  const pitches: Record<number, number> = {
    3: 0.5, 4: 0.7, 5: 0.8, 6: 1.0, 8: 1.25, 10: 1.5,
    12: 1.75, 14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5,
    22: 2.5, 24: 3.0, 27: 3.0, 30: 3.5, 36: 4.0, 42: 4.5, 48: 5.0
  };
  return pitches[diameter] || 1.0;
}

function getHeadDiameter(type: FastenerType, diameter: number): number {
  switch (type) {
    case FastenerType.HEX_BOLT:
      return diameter * 1.8; // Approximation tête hex
    case FastenerType.SOCKET_HEAD_BOLT:
      return diameter * 1.5; // Tête cylindrique
    case FastenerType.COUNTERSUNK_BOLT:
      return diameter * 2.0; // Tête fraisée
    default:
      return diameter * 1.6;
  }
}

function getHeadHeight(type: FastenerType, diameter: number): number {
  switch (type) {
    case FastenerType.HEX_BOLT:
      return diameter * 0.7;
    case FastenerType.SOCKET_HEAD_BOLT:
      return diameter;
    case FastenerType.COUNTERSUNK_BOLT:
      return diameter * 0.35;
    default:
      return diameter * 0.6;
  }
}

function getDriveSize(type: FastenerType, diameter: number): number {
  // Taille de clé pour têtes hex
  const hexSizes: Record<number, number> = {
    3: 5.5, 4: 7, 5: 8, 6: 10, 8: 13, 10: 17, 12: 19,
    14: 22, 16: 24, 18: 27, 20: 30, 22: 32, 24: 36
  };
  return hexSizes[diameter] || diameter * 1.5;
}

function getSocketSize(type: FastenerType, diameter: number): number {
  // Taille empreinte allen
  const allenSizes: Record<number, number> = {
    3: 2, 4: 3, 5: 4, 6: 5, 8: 6, 10: 8, 12: 10,
    14: 12, 16: 14, 18: 14, 20: 17, 22: 17, 24: 19
  };
  return allenSizes[diameter] || Math.ceil(diameter * 0.75);
}

// Fonctions utilitaires pour noms et descriptions
function getBoltName(type: FastenerType): string {
  switch (type) {
    case FastenerType.HEX_BOLT: return 'Boulon tête hexagonale';
    case FastenerType.SOCKET_HEAD_BOLT: return 'Vis à tête cylindrique';
    case FastenerType.COUNTERSUNK_BOLT: return 'Vis à tête fraisée';
    case FastenerType.HEX_SCREW: return 'Vis à tête hexagonale';
    default: return 'Fixation';
  }
}

function getBoltDescription(type: FastenerType): string {
  switch (type) {
    case FastenerType.HEX_BOLT: return 'Boulon à tête hexagonale DIN 933';
    case FastenerType.SOCKET_HEAD_BOLT: return 'Vis à tête cylindrique six pans creux DIN 912';
    case FastenerType.COUNTERSUNK_BOLT: return 'Vis à tête fraisée six pans creux DIN 7991';
    default: return 'Fixation standard';
  }
}

// Propriétés matériau selon classe de résistance
function getBoltGrade(strengthClass: BoltStrengthClass): SteelGrade {
  if (strengthClass.includes('A2') || strengthClass.includes('A4')) {
    return strengthClass.includes('A4') ? SteelGrade.INOX_316 : SteelGrade.INOX_304;
  }
  return SteelGrade.S355; // Classe de base pour acier haute résistance
}

function getBoltProperties(strengthClass: BoltStrengthClass) {
  const properties: Record<string, { yieldStrength: number; tensileStrength: number; density?: number }> = {
    '4.6': { yieldStrength: 240, tensileStrength: 400 },
    '5.6': { yieldStrength: 300, tensileStrength: 500 },
    '6.8': { yieldStrength: 480, tensileStrength: 600 },
    '8.8': { yieldStrength: 640, tensileStrength: 800 },
    '10.9': { yieldStrength: 900, tensileStrength: 1000 },
    '12.9': { yieldStrength: 1080, tensileStrength: 1200 },
    'A2-70': { yieldStrength: 450, tensileStrength: 700, density: 7900 },
    'A4-80': { yieldStrength: 600, tensileStrength: 800, density: 8000 }
  };
  return properties[strengthClass] || { yieldStrength: 400, tensileStrength: 600 };
}

// Calcul du poids approximatif
function calculateBoltWeight(type: FastenerType, diameter: number, length: number): number {
  const density = 7850; // kg/m³ pour acier
  const headVolume = Math.PI * Math.pow(getHeadDiameter(type, diameter) / 2000, 2) * (getHeadHeight(type, diameter) / 1000);
  const shaftVolume = Math.PI * Math.pow(diameter / 2000, 2) * (length / 1000);
  return (headVolume + shaftVolume) * density;
}

// Couleur selon finition
function getBoltColor(finish: SurfaceFinish): string {
  switch (finish) {
    case SurfaceFinish.GALVANIZED: return '#E8E8E8';
    case SurfaceFinish.ZINC_PLATED: return '#F4F4F4';
    case SurfaceFinish.STAINLESS: return '#F8F9FA';
    case SurfaceFinish.RAW: return '#4A5568';
    default: return '#6B7280';
  }
}

function getRoughness(finish: SurfaceFinish): number {
  switch (finish) {
    case SurfaceFinish.STAINLESS: return 0.2;
    case SurfaceFinish.GALVANIZED: return 0.4;
    case SurfaceFinish.ZINC_PLATED: return 0.3;
    default: return 0.6;
  }
}

// Base de données de la boulonnerie
export const FASTENERS_DATABASE: UnifiedElement[] = [
  // ==================== BOULONS À TÊTE HEXAGONALE ====================
  
  // Boulons hex classe 8.8 zingués
  ...createBoltSeries(
    'HEX_BOLT_8_8_ZP',
    FastenerType.HEX_BOLT,
    [6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
    BOLT_LENGTHS.filter(l => l >= 16 && l <= 200),
    BoltStrengthClass.CLASS_8_8,
    SurfaceFinish.ZINC_PLATED,
    'DIN 933 / ISO 4017'
  ),
  
  // Boulons hex classe 10.9 bruts
  ...createBoltSeries(
    'HEX_BOLT_10_9_RAW',
    FastenerType.HEX_BOLT,
    [8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30],
    BOLT_LENGTHS.filter(l => l >= 20 && l <= 300),
    BoltStrengthClass.CLASS_10_9,
    SurfaceFinish.RAW,
    'DIN 933 / ISO 4017'
  ),
  
  // ==================== VIS À TÊTE CYLINDRIQUE ====================
  
  // Vis CHC classe 12.9 brutes
  ...createBoltSeries(
    'CHC_12_9_RAW',
    FastenerType.SOCKET_HEAD_BOLT,
    [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24],
    BOLT_LENGTHS.filter(l => l >= 8 && l <= 150),
    BoltStrengthClass.CLASS_12_9,
    SurfaceFinish.RAW,
    'DIN 912 / ISO 4762'
  ),
  
  // Vis CHC inox A4-80
  ...createBoltSeries(
    'CHC_A4_INOX',
    FastenerType.SOCKET_HEAD_BOLT,
    [3, 4, 5, 6, 8, 10, 12, 14, 16, 20],
    BOLT_LENGTHS.filter(l => l >= 6 && l <= 100),
    BoltStrengthClass.INOX_A4_80,
    SurfaceFinish.STAINLESS,
    'DIN 912 / ISO 4762'
  ),
  
  // ==================== VIS À TÊTE FRAISÉE ====================
  
  // Vis TFHC classe 8.8 zinguées
  ...createBoltSeries(
    'TFHC_8_8_ZP',
    FastenerType.COUNTERSUNK_BOLT,
    [3, 4, 5, 6, 8, 10, 12, 16],
    BOLT_LENGTHS.filter(l => l >= 6 && l <= 80),
    BoltStrengthClass.CLASS_8_8,
    SurfaceFinish.ZINC_PLATED,
    'DIN 7991 / ISO 10642'
  ),
  
  // ==================== ÉCROUS ====================
  
  // Écrous hexagonaux classe 8 zingués
  ...METRIC_DIAMETERS.filter(d => d >= 3 && d <= 30).map(diameter => ({
    id: `HEX_NUT_8_M${diameter}`,
    name: `Écrou hexagonal M${diameter}`,
    description: `Écrou hexagonal M${diameter} classe 8 zingué`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.HEX_NUT,
    dimensions: {
      diameter: diameter,
      threadPitch: getThreadPitch(diameter),
      width: getDriveSize(FastenerType.HEX_NUT, diameter), // Clé
      height: diameter * 0.8 // Hauteur écrou
    },
    material: {
      designation: 'Classe 8',
      grade: SteelGrade.S355,
      finish: SurfaceFinish.ZINC_PLATED,
      yieldStrength: 640,
      tensileStrength: 800,
      standard: 'DIN 934 / ISO 4032'
    },
    weight: Math.PI * Math.pow(diameter * 0.9 / 2000, 2) * (diameter * 0.8 / 1000) * 7850,
    visual: {
      color: '#F4F4F4',
      metalness: 0.7,
      roughness: 0.4,
      opacity: 1.0
    },
    partNumber: `HEX_NUT_8_M${diameter}_ZP`,
    searchTags: ['écrou', 'hexagonal', `M${diameter}`, 'classe 8', 'zingué'],
    source: 'DIN 934 / ISO 4032'
  })),
  
  // Écrous de blocage inox A2
  ...METRIC_DIAMETERS.filter(d => d >= 4 && d <= 20).map(diameter => ({
    id: `LOCK_NUT_A2_M${diameter}`,
    name: `Écrou frein M${diameter} inox A2`,
    description: `Écrou de blocage M${diameter} inox A2 avec insert nylon`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.LOCK_NUT,
    dimensions: {
      diameter: diameter,
      threadPitch: getThreadPitch(diameter),
      width: getDriveSize(FastenerType.HEX_NUT, diameter),
      height: diameter * 0.9 // Hauteur augmentée
    },
    material: {
      designation: 'A2 Lock',
      grade: SteelGrade.INOX_304,
      finish: SurfaceFinish.STAINLESS,
      yieldStrength: 450,
      tensileStrength: 700,
      standard: 'DIN 985'
    },
    weight: Math.PI * Math.pow(diameter * 0.9 / 2000, 2) * (diameter * 0.9 / 1000) * 7900,
    visual: {
      color: '#F8F9FA',
      metalness: 0.9,
      roughness: 0.2,
      opacity: 1.0
    },
    partNumber: `LOCK_NUT_A2_M${diameter}`,
    searchTags: ['écrou', 'frein', 'blocage', 'nylstop', `M${diameter}`, 'inox', 'A2'],
    source: 'DIN 985'
  })),
  
  // ==================== RONDELLES ====================
  
  // Rondelles plates zinguées
  ...METRIC_DIAMETERS.filter(d => d >= 3 && d <= 30).map(diameter => ({
    id: `PLAIN_WASHER_M${diameter}`,
    name: `Rondelle plate M${diameter}`,
    description: `Rondelle plate M${diameter} zinguée forme A`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.PLAIN_WASHER,
    dimensions: {
      diameter: diameter,
      width: diameter * 2.2, // Diamètre extérieur
      thickness: diameter <= 10 ? 1 : diameter <= 20 ? 2 : 3
    },
    material: {
      designation: 'Acier zingué',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.ZINC_PLATED,
      standard: 'DIN 125 / ISO 7089'
    },
    weight: Math.PI * (Math.pow(diameter * 2.2 / 2000, 2) - Math.pow(diameter * 1.1 / 2000, 2)) * 
           ((diameter <= 10 ? 1 : diameter <= 20 ? 2 : 3) / 1000) * 7850,
    visual: {
      color: '#F4F4F4',
      metalness: 0.6,
      roughness: 0.4,
      opacity: 1.0
    },
    partNumber: `PLAIN_WASHER_M${diameter}_ZP`,
    searchTags: ['rondelle', 'plate', `M${diameter}`, 'zingué'],
    source: 'DIN 125 / ISO 7089'
  })),
  
  // Rondelles grower zinguées  
  ...METRIC_DIAMETERS.filter(d => d >= 3 && d <= 24).map(diameter => ({
    id: `SPRING_WASHER_M${diameter}`,
    name: `Rondelle grower M${diameter}`,
    description: `Rondelle ressort grower M${diameter} zinguée`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.SPRING_WASHER,
    dimensions: {
      diameter: diameter,
      width: diameter * 2.0, // Diamètre extérieur
      thickness: diameter * 0.15 // Épaisseur du ressort
    },
    material: {
      designation: 'Acier ressort zingué',
      grade: SteelGrade.S355,
      finish: SurfaceFinish.ZINC_PLATED,
      standard: 'DIN 127 / ISO 7980'
    },
    weight: Math.PI * (Math.pow(diameter * 2.0 / 2000, 2) - Math.pow(diameter * 1.1 / 2000, 2)) * 
           (diameter * 0.15 / 1000) * 7850,
    visual: {
      color: '#E8E8E8',
      metalness: 0.7,
      roughness: 0.5,
      opacity: 1.0
    },
    partNumber: `SPRING_WASHER_M${diameter}_ZP`,
    searchTags: ['rondelle', 'grower', 'ressort', `M${diameter}`, 'zingué'],
    source: 'DIN 127 / ISO 7980'
  })),
  
  // ==================== TIGES FILETÉES ====================
  
  // Tiges filetées classe 4.6 zinguées
  ...[6, 8, 10, 12, 14, 16, 18, 20, 24, 27, 30].map(diameter => ({
    id: `THREADED_ROD_M${diameter}_1000mm`,
    name: `Tige filetée M${diameter} L=1000mm`,
    description: `Tige filetée M${diameter} longueur 1000mm classe 4.6 zinguée`,
    category: MaterialCategory.FASTENERS,
    type: FastenerType.THREADED_ROD,
    dimensions: {
      diameter: diameter,
      length: 1000,
      threadPitch: getThreadPitch(diameter)
    },
    material: {
      designation: 'Classe 4.6',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.ZINC_PLATED,
      yieldStrength: 240,
      tensileStrength: 400,
      standard: 'DIN 975 / ISO 4762'
    },
    weight: Math.PI * Math.pow(diameter / 2000, 2) * (1000 / 1000) * 7850,
    visual: {
      color: '#F4F4F4',
      metalness: 0.6,
      roughness: 0.6,
      opacity: 1.0
    },
    standardLengths: [250, 500, 1000, 2000, 3000],
    partNumber: `THREADED_ROD_M${diameter}_1000_4.6_ZP`,
    searchTags: ['tige', 'filetée', `M${diameter}`, 'classe 4.6', 'zingué'],
    source: 'DIN 975'
  })),
  
  // ==================== FIXATIONS SPÉCIALISÉES ====================
  
  // Boulons d'ancrage M12
  {
    id: 'ANCHOR_BOLT_M12x100',
    name: 'Boulon d\'ancrage M12x100',
    description: 'Boulon d\'ancrage chimique M12x100 acier zingué',
    category: MaterialCategory.FASTENERS,
    type: FastenerType.ANCHOR_BOLT,
    dimensions: {
      diameter: 12,
      length: 100,
      threadPitch: 1.75,
      headDiameter: 19,
      headHeight: 8
    },
    material: {
      designation: 'Classe 8.8',
      grade: SteelGrade.S355,
      finish: SurfaceFinish.ZINC_PLATED,
      yieldStrength: 640,
      tensileStrength: 800,
      standard: 'Option 1 ETA'
    },
    weight: 0.085, // kg
    visual: {
      color: '#F4F4F4',
      metalness: 0.7,
      roughness: 0.4,
      opacity: 1.0
    },
    partNumber: 'ANCHOR_M12x100_8.8_ZP',
    searchTags: ['ancrage', 'chimique', 'M12', 'béton'],
    source: 'ETA-07/0025'
  },
  
  // Boulons en U M10
  {
    id: 'U_BOLT_M10x60x120',
    name: 'Boulon en U M10 - 60x120',
    description: 'Boulon en U M10 entraxe 60mm hauteur 120mm galvanisé',
    category: MaterialCategory.FASTENERS,
    type: FastenerType.U_BOLT,
    dimensions: {
      diameter: 10,
      length: 120,
      width: 60,
      threadPitch: 1.5
    },
    material: {
      designation: 'Classe 4.6 Galva',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.GALVANIZED,
      yieldStrength: 240,
      tensileStrength: 400,
      standard: 'DIN 3570'
    },
    weight: 0.12, // kg
    visual: {
      color: '#E8E8E8',
      metalness: 0.5,
      roughness: 0.4,
      opacity: 1.0
    },
    partNumber: 'U_BOLT_M10_60x120_GALV',
    searchTags: ['boulon', 'U', 'M10', 'galvanisé', 'étrier'],
    source: 'DIN 3570'
  }
];

// Export des utilitaires
export { 
  METRIC_DIAMETERS, 
  BOLT_LENGTHS, 
  createBoltSeries, 
  calculateBoltWeight 
};