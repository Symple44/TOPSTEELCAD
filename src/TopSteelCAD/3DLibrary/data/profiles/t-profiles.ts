/**
 * Profilés en T (TEE) selon EN 10055
 * Fers T à ailes égales et coins arrondis
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const T_PROFILES: SteelProfile[] = [
  // Série T 20-40
  {
    id: 'T20x20x3',
    type: ProfileType.TEE,
    designation: 'T 20x20x3',
    dimensions: {
      height: 20,
      width: 20,
      webThickness: 3,
      flangeThickness: 3,
      rootRadius: 3
    },
    weight: 0.89,
    area: 1.13,
    perimeter: 74,
    inertia: {
      Iyy: 0.69,
      Izz: 1.15,
      It: 0.21,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.69,
      Welz: 0.58
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T25x25x3',
    type: ProfileType.TEE,
    designation: 'T 25x25x3',
    dimensions: {
      height: 25,
      width: 25,
      webThickness: 3,
      flangeThickness: 3,
      rootRadius: 3.5
    },
    weight: 1.12,
    area: 1.43,
    perimeter: 94,
    inertia: {
      Iyy: 1.33,
      Izz: 2.21,
      It: 0.26,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.07,
      Welz: 0.88
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T30x30x4',
    type: ProfileType.TEE,
    designation: 'T 30x30x4',
    dimensions: {
      height: 30,
      width: 30,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 4
    },
    weight: 1.78,
    area: 2.27,
    perimeter: 112,
    inertia: {
      Iyy: 2.84,
      Izz: 4.73,
      It: 0.54,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.89,
      Welz: 1.58
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T40x40x4',
    type: ProfileType.TEE,
    designation: 'T 40x40x4',
    dimensions: {
      height: 40,
      width: 40,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 4
    },
    weight: 2.42,
    area: 3.08,
    perimeter: 152,
    inertia: {
      Iyy: 6.73,
      Izz: 11.2,
      It: 0.73,
      Iw: 0
    },
    elasticModulus: {
      Wely: 3.37,
      Welz: 2.80
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  
  // Série T 50-100
  {
    id: 'T50x50x5',
    type: ProfileType.TEE,
    designation: 'T 50x50x5',
    dimensions: {
      height: 50,
      width: 50,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 5
    },
    weight: 3.77,
    area: 4.80,
    perimeter: 190,
    inertia: {
      Iyy: 15.1,
      Izz: 25.1,
      It: 1.44,
      Iw: 0
    },
    elasticModulus: {
      Wely: 6.04,
      Welz: 5.02
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T60x60x6',
    type: ProfileType.TEE,
    designation: 'T 60x60x6',
    dimensions: {
      height: 60,
      width: 60,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 6
    },
    weight: 5.42,
    area: 6.91,
    perimeter: 228,
    inertia: {
      Iyy: 29.0,
      Izz: 48.3,
      It: 2.59,
      Iw: 0
    },
    elasticModulus: {
      Wely: 9.67,
      Welz: 8.05
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T70x70x7',
    type: ProfileType.TEE,
    designation: 'T 70x70x7',
    dimensions: {
      height: 70,
      width: 70,
      webThickness: 7,
      flangeThickness: 7,
      rootRadius: 7
    },
    weight: 7.38,
    area: 9.40,
    perimeter: 266,
    inertia: {
      Iyy: 48.8,
      Izz: 81.3,
      It: 4.31,
      Iw: 0
    },
    elasticModulus: {
      Wely: 13.9,
      Welz: 11.6
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T80x80x8',
    type: ProfileType.TEE,
    designation: 'T 80x80x8',
    dimensions: {
      height: 80,
      width: 80,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 8
    },
    weight: 9.63,
    area: 12.3,
    perimeter: 304,
    inertia: {
      Iyy: 76.8,
      Izz: 128,
      It: 6.85,
      Iw: 0
    },
    elasticModulus: {
      Wely: 19.2,
      Welz: 16.0
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  },
  {
    id: 'T100x100x10',
    type: ProfileType.TEE,
    designation: 'T 100x100x10',
    dimensions: {
      height: 100,
      width: 100,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 10
    },
    weight: 15.0,
    area: 19.1,
    perimeter: 380,
    inertia: {
      Iyy: 184,
      Izz: 307,
      It: 13.6,
      Iw: 0
    },
    elasticModulus: {
      Wely: 36.8,
      Welz: 30.7
    },
    source: 'EN 10055',
    category: 'Laminé à chaud'
  }
];

export default T_PROFILES;