/**
 * Profilés W selon AISC
 * Profilés en I américains standard
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const W_PROFILES: SteelProfile[] = [
  // Série W4
  {
    id: 'W4x13',
    type: ProfileType.W_SHAPE,
    designation: 'W 4x13',
    dimensions: {
      height: 106,
      width: 103,
      webThickness: 6.1,
      flangeThickness: 8.9,
      rootRadius: 8
    },
    weight: 19.3,
    area: 24.5,
    perimeter: 418,
    inertia: {
      Iyy: 111,
      Izz: 36.8,
      It: 0.21,
      Iw: 920
    },
    elasticModulus: {
      Wely: 21.0,
      Welz: 7.14
    },
    radiusOfGyration: {
      iy: 2.13,
      iz: 1.22
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série W6
  {
    id: 'W6x15',
    type: ProfileType.W_SHAPE,
    designation: 'W 6x15',
    dimensions: {
      height: 152,
      width: 152,
      webThickness: 5.8,
      flangeThickness: 8.4,
      rootRadius: 11
    },
    weight: 22.3,
    area: 28.4,
    perimeter: 456,
    inertia: {
      Iyy: 291,
      Izz: 75.1,
      It: 0.35,
      Iw: 2850
    },
    elasticModulus: {
      Wely: 38.3,
      Welz: 9.87
    },
    radiusOfGyration: {
      iy: 3.20,
      iz: 1.63
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'W6x20',
    type: ProfileType.W_SHAPE,
    designation: 'W 6x20',
    dimensions: {
      height: 157,
      width: 152,
      webThickness: 6.4,
      flangeThickness: 10.2,
      rootRadius: 11
    },
    weight: 29.8,
    area: 37.9,
    perimeter: 462,
    inertia: {
      Iyy: 412,
      Izz: 92.2,
      It: 0.50,
      Iw: 3420
    },
    elasticModulus: {
      Wely: 52.4,
      Welz: 12.1
    },
    radiusOfGyration: {
      iy: 3.30,
      iz: 1.56
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série W8
  {
    id: 'W8x18',
    type: ProfileType.W_SHAPE,
    designation: 'W 8x18',
    dimensions: {
      height: 203,
      width: 133,
      webThickness: 5.6,
      flangeThickness: 8.4,
      rootRadius: 11
    },
    weight: 26.8,
    area: 34.1,
    perimeter: 472,
    inertia: {
      Iyy: 692,
      Izz: 61.9,
      It: 0.35,
      Iw: 3110
    },
    elasticModulus: {
      Wely: 68.1,
      Welz: 9.30
    },
    radiusOfGyration: {
      iy: 4.51,
      iz: 1.35
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'W8x31',
    type: ProfileType.W_SHAPE,
    designation: 'W 8x31',
    dimensions: {
      height: 203,
      width: 203,
      webThickness: 7.2,
      flangeThickness: 11.2,
      rootRadius: 14
    },
    weight: 46.1,
    area: 58.7,
    perimeter: 520,
    inertia: {
      Iyy: 851,
      Izz: 373,
      It: 1.05,
      Iw: 14800
    },
    elasticModulus: {
      Wely: 83.8,
      Welz: 36.8
    },
    radiusOfGyration: {
      iy: 3.81,
      iz: 2.52
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série W10
  {
    id: 'W10x22',
    type: ProfileType.W_SHAPE,
    designation: 'W 10x22',
    dimensions: {
      height: 254,
      width: 146,
      webThickness: 5.8,
      flangeThickness: 8.9,
      rootRadius: 14
    },
    weight: 32.7,
    area: 41.6,
    perimeter: 546,
    inertia: {
      Iyy: 1390,
      Izz: 104,
      It: 0.49,
      Iw: 6560
    },
    elasticModulus: {
      Wely: 109,
      Welz: 14.2
    },
    radiusOfGyration: {
      iy: 5.78,
      iz: 1.58
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'W10x49',
    type: ProfileType.W_SHAPE,
    designation: 'W 10x49',
    dimensions: {
      height: 254,
      width: 254,
      webThickness: 8.9,
      flangeThickness: 14.2,
      rootRadius: 16
    },
    weight: 72.8,
    area: 92.9,
    perimeter: 632,
    inertia: {
      Iyy: 1970,
      Izz: 931,
      It: 2.54,
      Iw: 46700
    },
    elasticModulus: {
      Wely: 155,
      Welz: 73.3
    },
    radiusOfGyration: {
      iy: 4.61,
      iz: 3.16
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série W12
  {
    id: 'W12x26',
    type: ProfileType.W_SHAPE,
    designation: 'W 12x26',
    dimensions: {
      height: 305,
      width: 165,
      webThickness: 6.4,
      flangeThickness: 9.4,
      rootRadius: 16
    },
    weight: 38.7,
    area: 49.3,
    perimeter: 642,
    inertia: {
      Iyy: 2540,
      Izz: 177,
      It: 0.70,
      Iw: 13500
    },
    elasticModulus: {
      Wely: 167,
      Welz: 21.5
    },
    radiusOfGyration: {
      iy: 7.18,
      iz: 1.90
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'W12x65',
    type: ProfileType.W_SHAPE,
    designation: 'W 12x65',
    dimensions: {
      height: 305,
      width: 305,
      webThickness: 10.7,
      flangeThickness: 15.4,
      rootRadius: 19
    },
    weight: 96.6,
    area: 123,
    perimeter: 750,
    inertia: {
      Iyy: 3530,
      Izz: 1750,
      It: 4.44,
      Iw: 106000
    },
    elasticModulus: {
      Wely: 231,
      Welz: 115
    },
    radiusOfGyration: {
      iy: 5.36,
      iz: 3.77
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série W14
  {
    id: 'W14x30',
    type: ProfileType.W_SHAPE,
    designation: 'W 14x30',
    dimensions: {
      height: 356,
      width: 172,
      webThickness: 6.9,
      flangeThickness: 10.2,
      rootRadius: 19
    },
    weight: 44.6,
    area: 56.8,
    perimeter: 720,
    inertia: {
      Iyy: 4270,
      Izz: 246,
      It: 0.95,
      Iw: 21100
    },
    elasticModulus: {
      Wely: 240,
      Welz: 28.6
    },
    radiusOfGyration: {
      iy: 8.68,
      iz: 2.08
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'W14x82',
    type: ProfileType.W_SHAPE,
    designation: 'W 14x82',
    dimensions: {
      height: 356,
      width: 356,
      webThickness: 12.7,
      flangeThickness: 18.3,
      rootRadius: 22
    },
    weight: 122,
    area: 155,
    perimeter: 858,
    inertia: {
      Iyy: 6340,
      Izz: 3180,
      It: 8.90,
      Iw: 225000
    },
    elasticModulus: {
      Wely: 356,
      Welz: 178
    },
    radiusOfGyration: {
      iy: 6.39,
      iz: 4.53
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  }
];

export default W_PROFILES;