/**
 * Profilés S selon AISC  
 * Profilés en I américains standard (Standard beams)
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const S_PROFILES: SteelProfile[] = [
  // Série S3
  {
    id: 'S3x5.7',
    type: ProfileType.S_SHAPE,
    designation: 'S 3x5.7',
    dimensions: {
      height: 76,
      width: 60,
      webThickness: 3.4,
      flangeThickness: 6.4,
      rootRadius: 4
    },
    weight: 8.5,
    area: 10.8,
    perimeter: 208,
    inertia: {
      Iyy: 15.1,
      Izz: 5.94,
      It: 0.09,
      Iw: 89
    },
    elasticModulus: {
      Wely: 3.97,
      Welz: 1.98
    },
    radiusOfGyration: {
      iy: 1.18,
      iz: 0.74
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S3x7.5',
    type: ProfileType.S_SHAPE,
    designation: 'S 3x7.5',
    dimensions: {
      height: 76,
      width: 66,
      webThickness: 4.9,
      flangeThickness: 7.9,
      rootRadius: 5
    },
    weight: 11.2,
    area: 14.3,
    perimeter: 216,
    inertia: {
      Iyy: 16.8,
      Izz: 8.46,
      It: 0.16,
      Iw: 134
    },
    elasticModulus: {
      Wely: 4.42,
      Welz: 2.56
    },
    radiusOfGyration: {
      iy: 1.08,
      iz: 0.77
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série S4
  {
    id: 'S4x7.7',
    type: ProfileType.S_SHAPE,
    designation: 'S 4x7.7',
    dimensions: {
      height: 102,
      width: 66,
      webThickness: 3.8,
      flangeThickness: 7.4,
      rootRadius: 5
    },
    weight: 11.4,
    area: 14.5,
    perimeter: 244,
    inertia: {
      Iyy: 35.1,
      Izz: 8.51,
      It: 0.14,
      Iw: 173
    },
    elasticModulus: {
      Wely: 6.89,
      Welz: 2.58
    },
    radiusOfGyration: {
      iy: 1.56,
      iz: 0.77
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S4x9.5',
    type: ProfileType.S_SHAPE,
    designation: 'S 4x9.5',
    dimensions: {
      height: 102,
      width: 71,
      webThickness: 4.8,
      flangeThickness: 8.6,
      rootRadius: 5
    },
    weight: 14.1,
    area: 18.0,
    perimeter: 254,
    inertia: {
      Iyy: 39.2,
      Izz: 11.5,
      It: 0.21,
      Iw: 245
    },
    elasticModulus: {
      Wely: 7.69,
      Welz: 3.24
    },
    radiusOfGyration: {
      iy: 1.48,
      iz: 0.80
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série S5
  {
    id: 'S5x10',
    type: ProfileType.S_SHAPE,
    designation: 'S 5x10',
    dimensions: {
      height: 127,
      width: 75,
      webThickness: 4.3,
      flangeThickness: 8.1,
      rootRadius: 6
    },
    weight: 14.9,
    area: 19.0,
    perimeter: 294,
    inertia: {
      Iyy: 75.3,
      Izz: 14.9,
      It: 0.20,
      Iw: 379
    },
    elasticModulus: {
      Wely: 11.9,
      Welz: 3.97
    },
    radiusOfGyration: {
      iy: 1.99,
      iz: 0.89
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S5x14.75',
    type: ProfileType.S_SHAPE,
    designation: 'S 5x14.75',
    dimensions: {
      height: 127,
      width: 83,
      webThickness: 6.4,
      flangeThickness: 10.4,
      rootRadius: 6
    },
    weight: 21.9,
    area: 27.9,
    perimeter: 310,
    inertia: {
      Iyy: 87.5,
      Izz: 22.8,
      It: 0.37,
      Iw: 633
    },
    elasticModulus: {
      Wely: 13.8,
      Welz: 5.50
    },
    radiusOfGyration: {
      iy: 1.77,
      iz: 0.90
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série S6
  {
    id: 'S6x12.5',
    type: ProfileType.S_SHAPE,
    designation: 'S 6x12.5',
    dimensions: {
      height: 152,
      width: 81,
      webThickness: 4.6,
      flangeThickness: 9.1,
      rootRadius: 7
    },
    weight: 18.6,
    area: 23.7,
    perimeter: 334,
    inertia: {
      Iyy: 146,
      Izz: 20.3,
      It: 0.28,
      Iw: 618
    },
    elasticModulus: {
      Wely: 19.2,
      Welz: 5.01
    },
    radiusOfGyration: {
      iy: 2.48,
      iz: 0.93
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S6x17.25',
    type: ProfileType.S_SHAPE,
    designation: 'S 6x17.25',
    dimensions: {
      height: 152,
      width: 91,
      webThickness: 6.4,
      flangeThickness: 11.4,
      rootRadius: 8
    },
    weight: 25.7,
    area: 32.7,
    perimeter: 354,
    inertia: {
      Iyy: 166,
      Izz: 33.2,
      It: 0.50,
      Iw: 1070
    },
    elasticModulus: {
      Wely: 21.8,
      Welz: 7.30
    },
    radiusOfGyration: {
      iy: 2.25,
      iz: 1.01
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série S8
  {
    id: 'S8x18.4',
    type: ProfileType.S_SHAPE,
    designation: 'S 8x18.4',
    dimensions: {
      height: 203,
      width: 91,
      webThickness: 5.5,
      flangeThickness: 10.9,
      rootRadius: 9
    },
    weight: 27.4,
    area: 34.9,
    perimeter: 408,
    inertia: {
      Iyy: 394,
      Izz: 34.2,
      It: 0.51,
      Iw: 1390
    },
    elasticModulus: {
      Wely: 38.8,
      Welz: 7.51
    },
    radiusOfGyration: {
      iy: 3.36,
      iz: 0.99
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S8x23',
    type: ProfileType.S_SHAPE,
    designation: 'S 8x23',
    dimensions: {
      height: 203,
      width: 98,
      webThickness: 6.4,
      flangeThickness: 12.7,
      rootRadius: 10
    },
    weight: 34.2,
    area: 43.5,
    perimeter: 422,
    inertia: {
      Iyy: 446,
      Izz: 46.2,
      It: 0.72,
      Iw: 1890
    },
    elasticModulus: {
      Wely: 43.9,
      Welz: 9.42
    },
    radiusOfGyration: {
      iy: 3.20,
      iz: 1.03
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série S10
  {
    id: 'S10x25.4',
    type: ProfileType.S_SHAPE,
    designation: 'S 10x25.4',
    dimensions: {
      height: 254,
      width: 102,
      webThickness: 6.1,
      flangeThickness: 12.2,
      rootRadius: 11
    },
    weight: 37.8,
    area: 48.1,
    perimeter: 472,
    inertia: {
      Iyy: 787,
      Izz: 50.8,
      It: 0.75,
      Iw: 2590
    },
    elasticModulus: {
      Wely: 62.0,
      Welz: 9.95
    },
    radiusOfGyration: {
      iy: 4.05,
      iz: 1.03
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S10x35',
    type: ProfileType.S_SHAPE,
    designation: 'S 10x35',
    dimensions: {
      height: 254,
      width: 114,
      webThickness: 8.6,
      flangeThickness: 16.0,
      rootRadius: 12
    },
    weight: 52.1,
    area: 66.4,
    perimeter: 496,
    inertia: {
      Iyy: 914,
      Izz: 85.1,
      It: 1.46,
      Iw: 4860
    },
    elasticModulus: {
      Wely: 72.0,
      Welz: 14.9
    },
    radiusOfGyration: {
      iy: 3.71,
      iz: 1.13
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série S12
  {
    id: 'S12x31.8',
    type: ProfileType.S_SHAPE,
    designation: 'S 12x31.8',
    dimensions: {
      height: 305,
      width: 109,
      webThickness: 6.9,
      flangeThickness: 14.2,
      rootRadius: 13
    },
    weight: 47.3,
    area: 60.3,
    perimeter: 536,
    inertia: {
      Iyy: 1410,
      Izz: 70.3,
      It: 1.05,
      Iw: 4570
    },
    elasticModulus: {
      Wely: 92.5,
      Welz: 12.9
    },
    radiusOfGyration: {
      iy: 4.83,
      iz: 1.08
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'S12x50',
    type: ProfileType.S_SHAPE,
    designation: 'S 12x50',
    dimensions: {
      height: 305,
      width: 127,
      webThickness: 10.7,
      flangeThickness: 19.6,
      rootRadius: 14
    },
    weight: 74.4,
    area: 94.8,
    perimeter: 570,
    inertia: {
      Iyy: 1730,
      Izz: 154,
      It: 2.63,
      Iw: 9930
    },
    elasticModulus: {
      Wely: 113,
      Welz: 24.3
    },
    radiusOfGyration: {
      iy: 4.27,
      iz: 1.28
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  }
];

export default S_PROFILES;