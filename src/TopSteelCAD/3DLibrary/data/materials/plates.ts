import { UnifiedElement, MaterialCategory, PlateType, SteelGrade, SurfaceFinish } from '../../types/material-types';

/**
 * Base de données complète des plaques et tôles métalliques
 * Conforme aux normes EN 10025, EN 10088, EN 515
 */

// Épaisseurs standard pour plaques acier (mm)
const STANDARD_STEEL_THICKNESSES = [
  3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100
];

// Épaisseurs standard pour plaques inox (mm)  
const STANDARD_INOX_THICKNESSES = [
  1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30
];

// Épaisseurs standard pour tôles larmées (mm)
const CHECKERED_THICKNESSES = [3, 4, 5, 6, 8, 10];

// Fonction utilitaire pour créer des plaques standard
function createPlateVariants(
  baseId: string,
  plateType: PlateType,
  grade: SteelGrade,
  finish: SurfaceFinish,
  thicknesses: number[],
  densityKgM3: number = 7850,
  standardName: string = 'EN 10025'
): UnifiedElement[] {
  return thicknesses.map(thickness => ({
    id: `${baseId}_${thickness}mm`,
    name: `Plaque ${grade} ép. ${thickness}mm`,
    description: `Plaque ${grade} épaisseur ${thickness}mm - ${standardName}`,
    category: MaterialCategory.PLATES,
    type: plateType,
    dimensions: {
      length: 6000,      // Longueur standard 6m
      width: 2000,       // Largeur standard 2m
      thickness: thickness
    },
    material: {
      designation: grade,
      grade: grade,
      finish: finish,
      density: densityKgM3,
      standard: standardName,
      ...(grade === SteelGrade.S235 && {
        yieldStrength: 235,
        tensileStrength: 360,
        elongation: 26
      }),
      ...(grade === SteelGrade.S275 && {
        yieldStrength: 275,
        tensileStrength: 430,
        elongation: 23
      }),
      ...(grade === SteelGrade.S355 && {
        yieldStrength: 355,
        tensileStrength: 510,
        elongation: 22
      }),
      ...(grade === SteelGrade.INOX_304 && {
        yieldStrength: 210,
        tensileStrength: 520,
        elongation: 45,
        density: 7900
      }),
      ...(grade === SteelGrade.INOX_316 && {
        yieldStrength: 220,
        tensileStrength: 520,
        elongation: 40,
        density: 8000
      }),
      ...(grade === SteelGrade.ALUMINUM_5754 && {
        yieldStrength: 80,
        tensileStrength: 190,
        elongation: 22,
        density: 2700
      })
    },
    weight: (6.0 * 2.0 * thickness / 1000) * densityKgM3 / 1000, // kg pour plaque 6x2m
    area: 12.0, // m² pour plaque 6x2m
    volume: (thickness / 1000) * 12.0, // m³
    visual: {
      color: getPlateColor(plateType, grade, finish),
      metalness: getMetalness(grade),
      roughness: getRoughness(finish),
      opacity: 1.0
    },
    standardLengths: [6000, 8000, 10000, 12000],
    searchTags: [`plaque`, `tôle`, grade, finish, plateType],
    source: standardName
  }));
}

// Fonctions utilitaires pour les propriétés visuelles
function getPlateColor(plateType: PlateType, grade: SteelGrade, finish: SurfaceFinish): string {
  if (finish === SurfaceFinish.GALVANIZED) return '#E8E8E8';
  if (finish === SurfaceFinish.PAINTED) return '#1E40AF';
  if (grade.includes('INOX')) return '#F8F9FA';
  if (grade.includes('ALUMINUM')) return '#E5E7EB';
  if (plateType === PlateType.CHECKERED_PLATE) return '#4B5563';
  return '#6B7280'; // Acier brut
}

function getMetalness(grade: SteelGrade): number {
  if (grade.includes('INOX')) return 0.9;
  if (grade.includes('ALUMINUM')) return 0.8;
  return 0.7;
}

function getRoughness(finish: SurfaceFinish): number {
  switch (finish) {
    case SurfaceFinish.RAW: return 0.8;
    case SurfaceFinish.GALVANIZED: return 0.3;
    case SurfaceFinish.PAINTED: return 0.6;
    case SurfaceFinish.STAINLESS: return 0.2;
    default: return 0.5;
  }
}

// Base de données des plaques
export const PLATES_DATABASE: UnifiedElement[] = [
  // ==================== PLAQUES ACIER STANDARD ====================
  
  // Plaques S235 brutes
  ...createPlateVariants(
    'STEEL_S235_RAW',
    PlateType.STEEL_PLATE,
    SteelGrade.S235,
    SurfaceFinish.RAW,
    STANDARD_STEEL_THICKNESSES,
    7850,
    'EN 10025-2'
  ),
  
  // Plaques S275 brutes
  ...createPlateVariants(
    'STEEL_S275_RAW', 
    PlateType.STEEL_PLATE,
    SteelGrade.S275,
    SurfaceFinish.RAW,
    STANDARD_STEEL_THICKNESSES,
    7850,
    'EN 10025-2'
  ),
  
  // Plaques S355 brutes
  ...createPlateVariants(
    'STEEL_S355_RAW',
    PlateType.STEEL_PLATE, 
    SteelGrade.S355,
    SurfaceFinish.RAW,
    STANDARD_STEEL_THICKNESSES,
    7850,
    'EN 10025-2'
  ),
  
  // ==================== PLAQUES GALVANISÉES ====================
  
  // Plaques S235 galvanisées
  ...createPlateVariants(
    'STEEL_S235_GALV',
    PlateType.GALVANIZED_SHEET,
    SteelGrade.S235,
    SurfaceFinish.GALVANIZED,
    [3, 4, 5, 6, 8, 10, 12, 15, 20],
    7850,
    'EN 10025-2 + EN ISO 1461'
  ),
  
  // ==================== PLAQUES INOXYDABLES ====================
  
  // Plaques INOX 304
  ...createPlateVariants(
    'INOX_304',
    PlateType.STAINLESS_PLATE,
    SteelGrade.INOX_304,
    SurfaceFinish.STAINLESS,
    STANDARD_INOX_THICKNESSES,
    7900,
    'EN 10088-2'
  ),
  
  // Plaques INOX 316
  ...createPlateVariants(
    'INOX_316',
    PlateType.STAINLESS_PLATE,
    SteelGrade.INOX_316,
    SurfaceFinish.STAINLESS,
    STANDARD_INOX_THICKNESSES,
    8000,
    'EN 10088-2'
  ),
  
  // ==================== PLAQUES ALUMINIUM ====================
  
  // Plaques Aluminium 5754
  ...createPlateVariants(
    'ALU_5754',
    PlateType.ALUMINUM_PLATE,
    SteelGrade.ALUMINUM_5754,
    SurfaceFinish.RAW,
    [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30],
    2700,
    'EN 515'
  ),
  
  // ==================== TÔLES SPÉCIALISÉES ====================
  
  // Tôles larmées S235
  ...CHECKERED_THICKNESSES.map(thickness => ({
    id: `CHECKERED_S235_${thickness}mm`,
    name: `Tôle larmée S235 ép. ${thickness}mm`,
    description: `Tôle larmée antidérapante S235 épaisseur ${thickness}mm`,
    category: MaterialCategory.PLATES,
    type: PlateType.CHECKERED_PLATE,
    dimensions: {
      length: 3000,
      width: 1500,
      thickness: thickness
    },
    material: {
      designation: 'S235 Larmée',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.RAW,
      yieldStrength: 235,
      tensileStrength: 360,
      elongation: 26,
      density: 7850,
      standard: 'EN 10025-2'
    },
    weight: (3.0 * 1.5 * thickness / 1000) * 7850 / 1000, // kg
    area: 4.5, // m²
    volume: (thickness / 1000) * 4.5,
    visual: {
      color: '#4B5563',
      metalness: 0.6,
      roughness: 0.9, // Surface rugueuse
      opacity: 1.0,
      textureMap: 'checkered'
    },
    standardLengths: [3000, 4000, 6000],
    searchTags: ['tôle', 'larmée', 'antidérapante', 'striée', 'S235'],
    source: 'EN 10025-2'
  })),
  
  // Tôles perforées
  ...[3, 4, 5, 6].map(thickness => ({
    id: `PERFORATED_S235_${thickness}mm`,
    name: `Tôle perforée S235 ép. ${thickness}mm`,
    description: `Tôle perforée S235 épaisseur ${thickness}mm - Perforation Ø5 maille 8x8`,
    category: MaterialCategory.PLATES,
    type: PlateType.PERFORATED_PLATE,
    dimensions: {
      length: 2000,
      width: 1000,
      thickness: thickness
    },
    material: {
      designation: 'S235 Perforée',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.RAW,
      yieldStrength: 235,
      tensileStrength: 360,
      elongation: 26,
      density: 7850,
      standard: 'EN 10025-2'
    },
    weight: (2.0 * 1.0 * thickness / 1000) * 7850 / 1000 * 0.6, // kg (40% moins pour perforations)
    area: 2.0,
    volume: (thickness / 1000) * 2.0 * 0.6,
    visual: {
      color: '#6B7280',
      metalness: 0.7,
      roughness: 0.6,
      opacity: 0.8 // Partiellement transparent pour perforations
    },
    standardLengths: [2000, 3000],
    searchTags: ['tôle', 'perforée', 'ajourée', 'S235'],
    source: 'EN 10025-2'
  })),
  
  // Métal déployé
  ...[2, 3, 4].map(thickness => ({
    id: `EXPANDED_METAL_${thickness}mm`,
    name: `Métal déployé ép. ${thickness}mm`,
    description: `Métal déployé épaisseur ${thickness}mm - Maille 20x10mm`,
    category: MaterialCategory.PLATES,
    type: PlateType.EXPANDED_METAL,
    dimensions: {
      length: 2000,
      width: 1000,
      thickness: thickness
    },
    material: {
      designation: 'S235 Déployé',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.RAW,
      yieldStrength: 235,
      tensileStrength: 360,
      elongation: 26,
      density: 7850,
      standard: 'EN 10025-2'
    },
    weight: (2.0 * 1.0 * thickness / 1000) * 7850 / 1000 * 0.5, // kg (50% moins pour déployé)
    area: 2.0,
    volume: (thickness / 1000) * 2.0 * 0.5,
    visual: {
      color: '#52525B',
      metalness: 0.7,
      roughness: 0.7,
      opacity: 0.7
    },
    standardLengths: [2000, 2500],
    searchTags: ['métal', 'déployé', 'étiré', 'ajouré', 'grille'],
    source: 'EN 10025-2'
  })),
  
  // ==================== BACS ACIER ====================
  
  // Bacs de couverture
  {
    id: 'ROOF_SHEET_0_75mm',
    name: 'Bac acier couverture 40/183 ép. 0.75mm',
    description: 'Bac acier de couverture nervuré 40/183 épaisseur 0.75mm galvanisé',
    category: MaterialCategory.PLATES,
    type: PlateType.ROOF_SHEET,
    dimensions: {
      length: 6000,
      width: 1083, // Largeur utile
      thickness: 0.75
    },
    material: {
      designation: 'Bac 40/183 Galva',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.GALVANIZED,
      yieldStrength: 235,
      tensileStrength: 360,
      density: 7850,
      standard: 'EN 14782'
    },
    weight: (6.0 * 1.083 * 0.75 / 1000) * 7850 / 1000 + 0.3, // kg + nervures
    area: 6.498, // m²
    visual: {
      color: '#E8E8E8',
      metalness: 0.3,
      roughness: 0.4,
      opacity: 1.0
    },
    standardLengths: [2000, 3000, 4000, 5000, 6000, 7000, 8000, 10000, 12000],
    searchTags: ['bac', 'acier', 'couverture', 'toiture', 'nervuré', 'galvanisé'],
    source: 'EN 14782'
  },
  
  // Bacs de bardage
  {
    id: 'WALL_SHEET_0_63mm',
    name: 'Bac acier bardage 35/207 ép. 0.63mm',
    description: 'Bac acier de bardage nervuré 35/207 épaisseur 0.63mm galvanisé',
    category: MaterialCategory.PLATES,
    type: PlateType.WALL_SHEET,
    dimensions: {
      length: 6000,
      width: 1035, // Largeur utile
      thickness: 0.63
    },
    material: {
      designation: 'Bac 35/207 Galva',
      grade: SteelGrade.S235,
      finish: SurfaceFinish.GALVANIZED,
      yieldStrength: 235,
      tensileStrength: 360,
      density: 7850,
      standard: 'EN 14782'
    },
    weight: (6.0 * 1.035 * 0.63 / 1000) * 7850 / 1000 + 0.2, // kg + nervures
    area: 6.21, // m²
    visual: {
      color: '#E8E8E8',
      metalness: 0.3,
      roughness: 0.4,
      opacity: 1.0
    },
    standardLengths: [2000, 3000, 4000, 5000, 6000, 8000, 10000],
    searchTags: ['bac', 'acier', 'bardage', 'façade', 'nervuré', 'galvanisé'],
    source: 'EN 14782'
  }
];

// Export des utilitaires
export { STANDARD_STEEL_THICKNESSES, STANDARD_INOX_THICKNESSES, CHECKERED_THICKNESSES };