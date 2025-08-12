/**
 * Profils plats selon EN 10058
 * Produits plats laminés à chaud en acier de construction
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const FLAT_PROFILES: SteelProfile[] = [
  // Plats courants - épaisseur 3mm
  {
    id: 'FLAT20x3',
    type: ProfileType.FLAT,
    designation: 'Plat 20x3',
    dimensions: {
      width: 20,
      thickness: 3,
      height: 3
    },
    weight: 0.47,
    area: 0.60,
    perimeter: 46,
    inertia: {
      Iyy: 0.20,
      Izz: 0.01,
      It: 0.01,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.20,
      Welz: 0.01
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT25x3',
    type: ProfileType.FLAT,
    designation: 'Plat 25x3',
    dimensions: {
      width: 25,
      thickness: 3,
      height: 3
    },
    weight: 0.59,
    area: 0.75,
    perimeter: 56,
    inertia: {
      Iyy: 0.39,
      Izz: 0.02,
      It: 0.02,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.31,
      Welz: 0.01
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT30x3',
    type: ProfileType.FLAT,
    designation: 'Plat 30x3',
    dimensions: {
      width: 30,
      thickness: 3,
      height: 3
    },
    weight: 0.71,
    area: 0.90,
    perimeter: 66,
    inertia: {
      Iyy: 0.68,
      Izz: 0.02,
      It: 0.02,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.45,
      Welz: 0.02
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  
  // Plats courants - épaisseur 5mm
  {
    id: 'FLAT40x5',
    type: ProfileType.FLAT,
    designation: 'Plat 40x5',
    dimensions: {
      width: 40,
      thickness: 5,
      height: 5
    },
    weight: 1.57,
    area: 2.00,
    perimeter: 90,
    inertia: {
      Iyy: 2.67,
      Izz: 0.08,
      It: 0.08,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.33,
      Welz: 0.03
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT50x5',
    type: ProfileType.FLAT,
    designation: 'Plat 50x5',
    dimensions: {
      width: 50,
      thickness: 5,
      height: 5
    },
    weight: 1.96,
    area: 2.50,
    perimeter: 110,
    inertia: {
      Iyy: 5.21,
      Izz: 0.10,
      It: 0.10,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.08,
      Welz: 0.04
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT60x5',
    type: ProfileType.FLAT,
    designation: 'Plat 60x5',
    dimensions: {
      width: 60,
      thickness: 5,
      height: 5
    },
    weight: 2.36,
    area: 3.00,
    perimeter: 130,
    inertia: {
      Iyy: 9.00,
      Izz: 0.13,
      It: 0.13,
      Iw: 0
    },
    elasticModulus: {
      Wely: 3.00,
      Welz: 0.05
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  
  // Plats moyens - épaisseur 8mm
  {
    id: 'FLAT80x8',
    type: ProfileType.FLAT,
    designation: 'Plat 80x8',
    dimensions: {
      width: 80,
      thickness: 8,
      height: 8
    },
    weight: 5.02,
    area: 6.40,
    perimeter: 176,
    inertia: {
      Iyy: 34.1,
      Izz: 0.27,
      It: 0.27,
      Iw: 0
    },
    elasticModulus: {
      Wely: 8.53,
      Welz: 0.07
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT100x8',
    type: ProfileType.FLAT,
    designation: 'Plat 100x8',
    dimensions: {
      width: 100,
      thickness: 8,
      height: 8
    },
    weight: 6.28,
    area: 8.00,
    perimeter: 216,
    inertia: {
      Iyy: 66.7,
      Izz: 0.34,
      It: 0.34,
      Iw: 0
    },
    elasticModulus: {
      Wely: 13.3,
      Welz: 0.09
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT120x8',
    type: ProfileType.FLAT,
    designation: 'Plat 120x8',
    dimensions: {
      width: 120,
      thickness: 8,
      height: 8
    },
    weight: 7.54,
    area: 9.60,
    perimeter: 256,
    inertia: {
      Iyy: 115,
      Izz: 0.41,
      It: 0.41,
      Iw: 0
    },
    elasticModulus: {
      Wely: 19.2,
      Welz: 0.10
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  
  // Plats épais - épaisseur 10mm et plus
  {
    id: 'FLAT150x10',
    type: ProfileType.FLAT,
    designation: 'Plat 150x10',
    dimensions: {
      width: 150,
      thickness: 10,
      height: 10
    },
    weight: 11.8,
    area: 15.0,
    perimeter: 320,
    inertia: {
      Iyy: 281,
      Izz: 1.25,
      It: 1.25,
      Iw: 0
    },
    elasticModulus: {
      Wely: 37.5,
      Welz: 0.25
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT200x12',
    type: ProfileType.FLAT,
    designation: 'Plat 200x12',
    dimensions: {
      width: 200,
      thickness: 12,
      height: 12
    },
    weight: 18.8,
    area: 24.0,
    perimeter: 424,
    inertia: {
      Iyy: 800,
      Izz: 2.88,
      It: 2.88,
      Iw: 0
    },
    elasticModulus: {
      Wely: 80.0,
      Welz: 0.48
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT250x15',
    type: ProfileType.FLAT,
    designation: 'Plat 250x15',
    dimensions: {
      width: 250,
      thickness: 15,
      height: 15
    },
    weight: 29.4,
    area: 37.5,
    perimeter: 530,
    inertia: {
      Iyy: 1953,
      Izz: 7.03,
      It: 7.03,
      Iw: 0
    },
    elasticModulus: {
      Wely: 156,
      Welz: 0.94
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  },
  {
    id: 'FLAT300x20',
    type: ProfileType.FLAT,
    designation: 'Plat 300x20',
    dimensions: {
      width: 300,
      thickness: 20,
      height: 20
    },
    weight: 47.1,
    area: 60.0,
    perimeter: 640,
    inertia: {
      Iyy: 4500,
      Izz: 20.0,
      It: 20.0,
      Iw: 0
    },
    elasticModulus: {
      Wely: 300,
      Welz: 2.00
    },
    source: 'EN 10058',
    category: 'Laminé à chaud'
  }
];

export default FLAT_PROFILES;