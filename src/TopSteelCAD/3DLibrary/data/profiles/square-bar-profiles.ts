/**
 * Barres carrées pleines selon EN 10059
 * Barres carrées laminées à chaud en acier de construction
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const SQUARE_BAR_PROFILES: SteelProfile[] = [
  // Petites barres carrées
  {
    id: 'SQUARE8',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 8x8',
    dimensions: {
      width: 8,
      height: 8,
      thickness: 8
    },
    weight: 0.50,
    area: 0.64,
    perimeter: 32,
    inertia: {
      Iyy: 0.27,
      Izz: 0.27,
      It: 0.43,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.14,
      Welz: 0.14
    },
    radiusOfGyration: {
      iy: 2.31,
      iz: 2.31
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE10',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 10x10',
    dimensions: {
      width: 10,
      height: 10,
      thickness: 10
    },
    weight: 0.79,
    area: 1.00,
    perimeter: 40,
    inertia: {
      Iyy: 0.83,
      Izz: 0.83,
      It: 1.33,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.33,
      Welz: 0.33
    },
    radiusOfGyration: {
      iy: 2.89,
      iz: 2.89
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE12',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 12x12',
    dimensions: {
      width: 12,
      height: 12,
      thickness: 12
    },
    weight: 1.13,
    area: 1.44,
    perimeter: 48,
    inertia: {
      Iyy: 1.73,
      Izz: 1.73,
      It: 2.77,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.58,
      Welz: 0.58
    },
    radiusOfGyration: {
      iy: 3.46,
      iz: 3.46
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE15',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 15x15',
    dimensions: {
      width: 15,
      height: 15,
      thickness: 15
    },
    weight: 1.77,
    area: 2.25,
    perimeter: 60,
    inertia: {
      Iyy: 4.22,
      Izz: 4.22,
      It: 6.75,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.13,
      Welz: 1.13
    },
    radiusOfGyration: {
      iy: 4.33,
      iz: 4.33
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  
  // Barres carrées moyennes
  {
    id: 'SQUARE20',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 20x20',
    dimensions: {
      width: 20,
      height: 20,
      thickness: 20
    },
    weight: 3.14,
    area: 4.00,
    perimeter: 80,
    inertia: {
      Iyy: 13.3,
      Izz: 13.3,
      It: 21.3,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.67,
      Welz: 2.67
    },
    radiusOfGyration: {
      iy: 5.77,
      iz: 5.77
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE25',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 25x25',
    dimensions: {
      width: 25,
      height: 25,
      thickness: 25
    },
    weight: 4.91,
    area: 6.25,
    perimeter: 100,
    inertia: {
      Iyy: 32.6,
      Izz: 32.6,
      It: 52.1,
      Iw: 0
    },
    elasticModulus: {
      Wely: 5.21,
      Welz: 5.21
    },
    radiusOfGyration: {
      iy: 7.22,
      iz: 7.22
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE30',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 30x30',
    dimensions: {
      width: 30,
      height: 30,
      thickness: 30
    },
    weight: 7.07,
    area: 9.00,
    perimeter: 120,
    inertia: {
      Iyy: 67.5,
      Izz: 67.5,
      It: 108,
      Iw: 0
    },
    elasticModulus: {
      Wely: 9.00,
      Welz: 9.00
    },
    radiusOfGyration: {
      iy: 8.66,
      iz: 8.66
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  
  // Grosses barres carrées
  {
    id: 'SQUARE40',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 40x40',
    dimensions: {
      width: 40,
      height: 40,
      thickness: 40
    },
    weight: 12.6,
    area: 16.0,
    perimeter: 160,
    inertia: {
      Iyy: 213,
      Izz: 213,
      It: 341,
      Iw: 0
    },
    elasticModulus: {
      Wely: 21.3,
      Welz: 21.3
    },
    radiusOfGyration: {
      iy: 11.5,
      iz: 11.5
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE50',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 50x50',
    dimensions: {
      width: 50,
      height: 50,
      thickness: 50
    },
    weight: 19.6,
    area: 25.0,
    perimeter: 200,
    inertia: {
      Iyy: 521,
      Izz: 521,
      It: 833,
      Iw: 0
    },
    elasticModulus: {
      Wely: 41.7,
      Welz: 41.7
    },
    radiusOfGyration: {
      iy: 14.4,
      iz: 14.4
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE60',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 60x60',
    dimensions: {
      width: 60,
      height: 60,
      thickness: 60
    },
    weight: 28.3,
    area: 36.0,
    perimeter: 240,
    inertia: {
      Iyy: 1080,
      Izz: 1080,
      It: 1728,
      Iw: 0
    },
    elasticModulus: {
      Wely: 72.0,
      Welz: 72.0
    },
    radiusOfGyration: {
      iy: 17.3,
      iz: 17.3
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE70',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 70x70',
    dimensions: {
      width: 70,
      height: 70,
      thickness: 70
    },
    weight: 38.5,
    area: 49.0,
    perimeter: 280,
    inertia: {
      Iyy: 2000,
      Izz: 2000,
      It: 3200,
      Iw: 0
    },
    elasticModulus: {
      Wely: 114,
      Welz: 114
    },
    radiusOfGyration: {
      iy: 20.2,
      iz: 20.2
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE80',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 80x80',
    dimensions: {
      width: 80,
      height: 80,
      thickness: 80
    },
    weight: 50.3,
    area: 64.0,
    perimeter: 320,
    inertia: {
      Iyy: 3413,
      Izz: 3413,
      It: 5461,
      Iw: 0
    },
    elasticModulus: {
      Wely: 171,
      Welz: 171
    },
    radiusOfGyration: {
      iy: 23.1,
      iz: 23.1
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  },
  {
    id: 'SQUARE100',
    type: ProfileType.SQUARE_BAR,
    designation: '□ 100x100',
    dimensions: {
      width: 100,
      height: 100,
      thickness: 100
    },
    weight: 78.5,
    area: 100,
    perimeter: 400,
    inertia: {
      Iyy: 8333,
      Izz: 8333,
      It: 13333,
      Iw: 0
    },
    elasticModulus: {
      Wely: 333,
      Welz: 333
    },
    radiusOfGyration: {
      iy: 28.9,
      iz: 28.9
    },
    source: 'EN 10059',
    category: 'Laminé à chaud'
  }
];

export default SQUARE_BAR_PROFILES;