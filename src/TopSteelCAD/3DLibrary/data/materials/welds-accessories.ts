import { UnifiedElement, MaterialCategory, WeldType, SteelGrade, SurfaceFinish } from '../../types/material-types';
import { SPECIALIZED_ACCESSORIES_DATABASE } from './specialized-accessories';

/**
 * Base de données des soudures et accessoires de construction métallique
 * Conforme aux normes EN 1011, AWS D1.1, EN ISO 5817
 */

// Dimensions standard de soudures d'angle (mm)
const FILLET_WELD_SIZES = [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20];

// Longueurs standard d'éléments (mm)
const STANDARD_LENGTHS = [50, 100, 150, 200, 300, 500, 1000, 1500, 2000, 3000, 6000];

// Fonction utilitaire pour créer des soudures
function createWeldSeries(
  baseId: string,
  weldType: WeldType,
  sizes: number[],
  lengths: number[],
  electrode: string,
  standard: string
): UnifiedElement[] {
  return sizes.flatMap(size => 
    lengths.map(length => ({
      id: `${baseId}_${size}x${length}`,
      name: `${getWeldName(weldType)} a=${size}mm L=${length}mm`,
      description: `${getWeldDescription(weldType)} gorge ${size}mm longueur ${length}mm`,
      category: MaterialCategory.WELDS,
      type: weldType,
      dimensions: {
        length: length,
        thickness: size, // Gorge de soudure
        width: size * Math.sqrt(2), // Largeur visible pour soudure d'angle
        height: size
      },
      material: {
        designation: electrode,
        grade: SteelGrade.S355, // Grade de base
        finish: SurfaceFinish.RAW,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: standard
      },
      weight: calculateWeldWeight(weldType, size, length),
      volume: calculateWeldVolume(weldType, size, length),
      visual: {
        color: getWeldColor(weldType),
        metalness: 0.9,
        roughness: 0.8, // Surface rugueuse de soudure
        opacity: 1.0
      },
      searchTags: ['soudure', weldType, `a${size}`, electrode, 'acier'],
      source: standard
    }))
  );
}

// Fonctions utilitaires pour soudures
function getWeldName(type: WeldType): string {
  switch (type) {
    case WeldType.FILLET_WELD: return 'Soudure d\'angle';
    case WeldType.BUTT_WELD: return 'Soudure bout à bout';
    case WeldType.GROOVE_WELD: return 'Soudure chanfrein';
    case WeldType.PLUG_WELD: return 'Soudure bouchon';
    case WeldType.SEAM_WELD: return 'Soudure continue';
    case WeldType.SPOT_WELD: return 'Soudure par points';
    case WeldType.INTERMITTENT_WELD: return 'Soudure discontinue';
    default: return 'Soudure';
  }
}

function getWeldDescription(type: WeldType): string {
  switch (type) {
    case WeldType.FILLET_WELD: return 'Soudure d\'angle à pleine pénétration';
    case WeldType.BUTT_WELD: return 'Soudure bout à bout pénétration complète';
    case WeldType.GROOVE_WELD: return 'Soudure sur chanfrein préparé';
    case WeldType.PLUG_WELD: return 'Soudure bouchon dans perçage';
    case WeldType.SEAM_WELD: return 'Soudure continue sur toute longueur';
    case WeldType.SPOT_WELD: return 'Soudure par résistance ponctuelle';
    default: return 'Soudure standard';
  }
}

function calculateWeldWeight(type: WeldType, size: number, length: number): number {
  const density = 7850; // kg/m³
  const volume = calculateWeldVolume(type, size, length);
  return volume * density / 1000; // Conversion en kg
}

function calculateWeldVolume(type: WeldType, size: number, length: number): number {
  // Volume en mm³
  switch (type) {
    case WeldType.FILLET_WELD:
      // Section triangulaire : (a²/2) * L
      return (size * size / 2) * length;
    case WeldType.BUTT_WELD:
      // Section rectangulaire : épaisseur * largeur * longueur
      return size * (size * 2) * length;
    case WeldType.GROOVE_WELD:
      // Section trapézoïdale approximée
      return (size * size * 1.5) * length;
    case WeldType.PLUG_WELD:
      // Volume cylindrique
      return Math.PI * Math.pow(size / 2, 2) * size;
    case WeldType.SEAM_WELD:
      // Soudure continue fine
      return (size * size / 4) * length;
    case WeldType.SPOT_WELD:
      // Points de diamètre size
      return Math.PI * Math.pow(size / 2, 2) * (size / 2);
    default:
      return (size * size / 2) * length;
  }
}

function getWeldColor(type: WeldType): string {
  // Couleur acier brûlé/oxydé après soudage
  switch (type) {
    case WeldType.SPOT_WELD: return '#8B4513'; // Brun foncé
    case WeldType.SEAM_WELD: return '#696969'; // Gris foncé
    default: return '#2F4F4F'; // Gris-vert foncé
  }
}

// Base de données des soudures et accessoires
export const WELDS_ACCESSORIES_DATABASE: UnifiedElement[] = [
  // ==================== SOUDURES D'ANGLE ====================
  
  // Soudures d'angle standard E70xx
  ...createWeldSeries(
    'FILLET_WELD_E70',
    WeldType.FILLET_WELD,
    FILLET_WELD_SIZES,
    STANDARD_LENGTHS.filter(l => l >= 50 && l <= 3000),
    'E7018 (E70xx)',
    'AWS D1.1 / EN ISO 5817'
  ),
  
  // ==================== SOUDURES BOUT À BOUT ====================
  
  // Soudures bout à bout pénétration complète
  ...[6, 8, 10, 12, 15, 20, 25].flatMap(thickness =>
    [100, 200, 500, 1000, 2000].map(length => ({
      id: `BUTT_WELD_${thickness}x${length}`,
      name: `Soudure bout à bout ép. ${thickness}mm L=${length}mm`,
      description: `Soudure bout à bout pénétration complète épaisseur ${thickness}mm`,
      category: MaterialCategory.WELDS,
      type: WeldType.BUTT_WELD,
      dimensions: {
        length: length,
        thickness: thickness,
        width: thickness * 1.2, // Surépaisseur
        height: thickness
      },
      material: {
        designation: 'E7018 (E70xx)',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.RAW,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: 'AWS D1.1 / EN ISO 5817'
      },
      weight: calculateWeldWeight(WeldType.BUTT_WELD, thickness, length),
      volume: calculateWeldVolume(WeldType.BUTT_WELD, thickness, length),
      visual: {
        color: '#2F4F4F',
        metalness: 0.9,
        roughness: 0.7,
        opacity: 1.0
      },
      searchTags: ['soudure', 'bout à bout', 'pénétration', `ép${thickness}`, 'E7018'],
      source: 'AWS D1.1 / EN ISO 5817'
    }))
  ),
  
  // ==================== SOUDURES BOUCHON ====================
  
  // Soudures bouchon standard
  ...[8, 10, 12, 16, 20].map(diameter => ({
    id: `PLUG_WELD_${diameter}`,
    name: `Soudure bouchon Ø${diameter}mm`,
    description: `Soudure bouchon dans perçage Ø${diameter}mm`,
    category: MaterialCategory.WELDS,
    type: WeldType.PLUG_WELD,
    dimensions: {
      diameter: diameter,
      thickness: diameter / 2, // Profondeur de pénétration
      width: diameter,
      height: diameter / 2
    },
    material: {
      designation: 'E7018',
      grade: SteelGrade.S355,
      finish: SurfaceFinish.RAW,
      yieldStrength: 355,
      tensileStrength: 510,
      standard: 'AWS D1.1'
    },
    weight: calculateWeldWeight(WeldType.PLUG_WELD, diameter, 1),
    volume: calculateWeldVolume(WeldType.PLUG_WELD, diameter, 1),
    visual: {
      color: '#8B4513',
      metalness: 0.8,
      roughness: 0.9,
      opacity: 1.0
    },
    searchTags: ['soudure', 'bouchon', 'plug', `Ø${diameter}`, 'perçage'],
    source: 'AWS D1.1'
  })),
  
  // ==================== ACCESSOIRES ET ÉLÉMENTS DIVERS ====================
  
  // Plats percés pour assemblages
  ...[40, 50, 60, 80, 100, 120].flatMap(width =>
    [6, 8, 10, 12].map(thickness => ({
      id: `FLAT_BAR_${width}x${thickness}_500mm`,
      name: `Plat ${width}x${thickness} L=500mm`,
      description: `Plat acier S235 ${width}x${thickness}mm longueur 500mm`,
      category: MaterialCategory.ACCESSORIES,
      type: 'FLAT_BAR' as any, // Type personnalisé
      dimensions: {
        length: 500,
        width: width,
        thickness: thickness
      },
      material: {
        designation: 'S235',
        grade: SteelGrade.S235,
        finish: SurfaceFinish.RAW,
        yieldStrength: 235,
        tensileStrength: 360,
        standard: 'EN 10025-2'
      },
      weight: (500 / 1000) * (width / 1000) * (thickness / 1000) * 7850,
      area: (500 * width) / 1000000, // m²
      volume: (500 * width * thickness) / 1000000000, // m³
      visual: {
        color: '#6B7280',
        metalness: 0.7,
        roughness: 0.6,
        opacity: 1.0
      },
      standardLengths: [250, 500, 1000, 2000, 3000, 6000],
      searchTags: ['plat', 'barre', `${width}x${thickness}`, 'S235', 'assemblage'],
      source: 'EN 10025-2'
    }))
  ),
  
  // Goussets triangulaires standards
  ...[100, 150, 200, 250, 300].map(size => ({
    id: `GUSSET_TRIANGLE_${size}x${size}x10`,
    name: `Gousset triangulaire ${size}x${size}x10`,
    description: `Gousset triangulaire ${size}x${size}mm épaisseur 10mm`,
    category: MaterialCategory.ACCESSORIES,
    type: 'GUSSET_PLATE' as any,
    dimensions: {
      length: size,
      width: size,
      thickness: 10,
      height: size / Math.sqrt(2) // Diagonale
    },
    material: {
      designation: 'S355',
      grade: SteelGrade.S355,
      finish: SurfaceFinish.RAW,
      yieldStrength: 355,
      tensileStrength: 510,
      standard: 'EN 10025-2'
    },
    weight: (size * size * 0.5 * 10 / 1000) * 7850 / 1000000, // Poids triangle
    area: (size * size * 0.5) / 1000000, // Surface triangle
    visual: {
      color: '#4B5563',
      metalness: 0.7,
      roughness: 0.6,
      opacity: 1.0
    },
    searchTags: ['gousset', 'triangulaire', 'renfort', `${size}x${size}`, 'assemblage'],
    source: 'EN 10025-2'
  })),
  
  // Raidisseurs standard
  ...[80, 100, 120, 150, 200].flatMap(height =>
    [6, 8, 10, 12].map(thickness => ({
      id: `STIFFENER_${height}x${thickness}_200mm`,
      name: `Raidisseur ${height}x${thickness} L=200mm`,
      description: `Raidisseur vertical ${height}x${thickness}mm longueur 200mm`,
      category: MaterialCategory.ACCESSORIES,
      type: 'STIFFENER' as any,
      dimensions: {
        length: 200,
        width: thickness,
        height: height,
        thickness: thickness
      },
      material: {
        designation: 'S355',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.RAW,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: 'EN 10025-2'
      },
      weight: (200 / 1000) * (height / 1000) * (thickness / 1000) * 7850,
      volume: (200 * height * thickness) / 1000000000,
      visual: {
        color: '#374151',
        metalness: 0.7,
        roughness: 0.6,
        opacity: 1.0
      },
      searchTags: ['raidisseur', 'stiffener', 'renfort', `${height}x${thickness}`, 'stabilité'],
      source: 'EN 10025-2'
    }))
  ),
  
  // Platines d'assemblage circulaires
  ...[150, 200, 250, 300, 400].flatMap(diameter =>
    [10, 12, 15, 20, 25].map(thickness => ({
      id: `CIRCULAR_PLATE_${diameter}x${thickness}`,
      name: `Platine circulaire Ø${diameter}x${thickness}`,
      description: `Platine d'assemblage circulaire Ø${diameter}mm épaisseur ${thickness}mm`,
      category: MaterialCategory.ACCESSORIES,
      type: 'CIRCULAR_PLATE' as any,
      dimensions: {
        diameter: diameter,
        thickness: thickness,
        width: diameter,
        height: diameter
      },
      material: {
        designation: 'S355',
        grade: SteelGrade.S355,
        finish: SurfaceFinish.RAW,
        yieldStrength: 355,
        tensileStrength: 510,
        standard: 'EN 10025-2'
      },
      weight: Math.PI * Math.pow(diameter / 2000, 2) * (thickness / 1000) * 7850,
      area: Math.PI * Math.pow(diameter / 2000, 2),
      volume: Math.PI * Math.pow(diameter / 2000, 2) * (thickness / 1000),
      visual: {
        color: '#1F2937',
        metalness: 0.7,
        roughness: 0.5,
        opacity: 1.0
      },
      searchTags: ['platine', 'circulaire', 'assemblage', `Ø${diameter}`, `ép${thickness}`],
      source: 'EN 10025-2'
    }))
  ),
  
  // Cales d'ajustement
  ...[1, 2, 3, 5, 8, 10].flatMap(thickness =>
    [[50, 50], [100, 50], [100, 100], [150, 100]].map(([length, width]) => ({
      id: `SHIM_${length}x${width}x${thickness}`,
      name: `Cale ${length}x${width}x${thickness}`,
      description: `Cale d'ajustement ${length}x${width}x${thickness}mm acier`,
      category: MaterialCategory.ACCESSORIES,
      type: 'SHIM' as any,
      dimensions: {
        length: length,
        width: width,
        thickness: thickness
      },
      material: {
        designation: 'S235',
        grade: SteelGrade.S235,
        finish: SurfaceFinish.RAW,
        yieldStrength: 235,
        tensileStrength: 360,
        standard: 'EN 10025-2'
      },
      weight: (length / 1000) * (width / 1000) * (thickness / 1000) * 7850,
      volume: (length * width * thickness) / 1000000000,
      visual: {
        color: '#9CA3AF',
        metalness: 0.6,
        roughness: 0.7,
        opacity: 1.0
      },
      searchTags: ['cale', 'ajustement', 'réglage', `${length}x${width}x${thickness}`],
      source: 'EN 10025-2'
    }))
  ),
  
  // ==================== ACCESSOIRES SPÉCIALISÉS ====================
  
  // Ajouter tous les accessoires spécialisés (ancrages, levage, etc.)
  ...SPECIALIZED_ACCESSORIES_DATABASE
];

// Export des utilitaires
export { 
  FILLET_WELD_SIZES, 
  createWeldSeries, 
  calculateWeldWeight, 
  calculateWeldVolume 
};