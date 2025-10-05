/**
 * Profilés Omega selon EN 10162
 * Profilés formés à froid en Omega pour structures spécifiques
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const OMEGA_PROFILES: SteelProfile[] = [
  // Série Omega 80
  {
    id: 'OMEGA80x40x1.5',
    type: ProfileType.OMEGA,
    designation: 'Ω 80x40x1.5',
    dimensions: {
      height: 80,
      width: 40,
      thickness: 1.5,
      lipLength: 8
    },
    weight: 1.48,
    area: 1.88,
    perimeter: 256,
    inertia: {
      Iyy: 28.5,
      Izz: 8.92,
      It: 0.08,
      Iw: 890
    },
    elasticModulus: {
      Wely: 7.13,
      Welz: 2.97
    },
    radiusOfGyration: {
      iy: 3.89,
      iz: 2.18
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'OMEGA80x40x2',
    type: ProfileType.OMEGA,
    designation: 'Ω 80x40x2',
    dimensions: {
      height: 80,
      width: 40,
      thickness: 2,
      lipLength: 8
    },
    weight: 1.94,
    area: 2.47,
    perimeter: 256,
    inertia: {
      Iyy: 36.4,
      Izz: 11.4,
      It: 0.13,
      Iw: 1140
    },
    elasticModulus: {
      Wely: 9.10,
      Welz: 3.80
    },
    radiusOfGyration: {
      iy: 3.84,
      iz: 2.15
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Omega 100
  {
    id: 'OMEGA100x50x1.5',
    type: ProfileType.OMEGA,
    designation: 'Ω 100x50x1.5',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 1.5,
      lipLength: 10
    },
    weight: 1.87,
    area: 2.38,
    perimeter: 320,
    inertia: {
      Iyy: 55.4,
      Izz: 15.6,
      It: 0.10,
      Iw: 1560
    },
    elasticModulus: {
      Wely: 11.1,
      Welz: 4.16
    },
    radiusOfGyration: {
      iy: 4.82,
      iz: 2.56
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'OMEGA100x50x2',
    type: ProfileType.OMEGA,
    designation: 'Ω 100x50x2',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 2,
      lipLength: 10
    },
    weight: 2.46,
    area: 3.13,
    perimeter: 320,
    inertia: {
      Iyy: 70.8,
      Izz: 19.9,
      It: 0.16,
      Iw: 1990
    },
    elasticModulus: {
      Wely: 14.2,
      Welz: 5.31
    },
    radiusOfGyration: {
      iy: 4.75,
      iz: 2.52
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Omega 120
  {
    id: 'OMEGA120x60x2',
    type: ProfileType.OMEGA,
    designation: 'Ω 120x60x2',
    dimensions: {
      height: 120,
      width: 60,
      thickness: 2,
      lipLength: 12
    },
    weight: 3.02,
    area: 3.85,
    perimeter: 384,
    inertia: {
      Iyy: 122,
      Izz: 32.1,
      It: 0.19,
      Iw: 3210
    },
    elasticModulus: {
      Wely: 20.3,
      Welz: 7.13
    },
    radiusOfGyration: {
      iy: 5.63,
      iz: 2.89
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'OMEGA120x60x2.5',
    type: ProfileType.OMEGA,
    designation: 'Ω 120x60x2.5',
    dimensions: {
      height: 120,
      width: 60,
      thickness: 2.5,
      lipLength: 12
    },
    weight: 3.72,
    area: 4.74,
    perimeter: 384,
    inertia: {
      Iyy: 147,
      Izz: 38.7,
      It: 0.29,
      Iw: 3870
    },
    elasticModulus: {
      Wely: 24.5,
      Welz: 8.60
    },
    radiusOfGyration: {
      iy: 5.57,
      iz: 2.86
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Omega 140
  {
    id: 'OMEGA140x70x2.5',
    type: ProfileType.OMEGA,
    designation: 'Ω 140x70x2.5',
    dimensions: {
      height: 140,
      width: 70,
      thickness: 2.5,
      lipLength: 15
    },
    weight: 4.35,
    area: 5.54,
    perimeter: 450,
    inertia: {
      Iyy: 218,
      Izz: 53.9,
      It: 0.34,
      Iw: 5930
    },
    elasticModulus: {
      Wely: 31.1,
      Welz: 11.3
    },
    radiusOfGyration: {
      iy: 6.27,
      iz: 3.12
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'OMEGA140x70x3',
    type: ProfileType.OMEGA,
    designation: 'Ω 140x70x3',
    dimensions: {
      height: 140,
      width: 70,
      thickness: 3,
      lipLength: 15
    },
    weight: 5.15,
    area: 6.56,
    perimeter: 450,
    inertia: {
      Iyy: 254,
      Izz: 62.8,
      It: 0.49,
      Iw: 6910
    },
    elasticModulus: {
      Wely: 36.3,
      Welz: 13.2
    },
    radiusOfGyration: {
      iy: 6.22,
      iz: 3.09
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Omega 160
  {
    id: 'OMEGA160x80x3',
    type: ProfileType.OMEGA,
    designation: 'Ω 160x80x3',
    dimensions: {
      height: 160,
      width: 80,
      thickness: 3,
      lipLength: 18
    },
    weight: 5.89,
    area: 7.50,
    perimeter: 518,
    inertia: {
      Iyy: 370,
      Izz: 84.5,
      It: 0.56,
      Iw: 9630
    },
    elasticModulus: {
      Wely: 46.3,
      Welz: 16.3
    },
    radiusOfGyration: {
      iy: 7.02,
      iz: 3.36
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'OMEGA160x80x4',
    type: ProfileType.OMEGA,
    designation: 'Ω 160x80x4',
    dimensions: {
      height: 160,
      width: 80,
      thickness: 4,
      lipLength: 18
    },
    weight: 7.71,
    area: 9.82,
    perimeter: 518,
    inertia: {
      Iyy: 470,
      Izz: 107,
      It: 0.98,
      Iw: 12200
    },
    elasticModulus: {
      Wely: 58.8,
      Welz: 20.6
    },
    radiusOfGyration: {
      iy: 6.92,
      iz: 3.30
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Omega 200
  {
    id: 'OMEGA200x100x3',
    type: ProfileType.OMEGA,
    designation: 'Ω 200x100x3',
    dimensions: {
      height: 200,
      width: 100,
      thickness: 3,
      lipLength: 20
    },
    weight: 7.52,
    area: 9.58,
    perimeter: 640,
    inertia: {
      Iyy: 719,
      Izz: 157,
      It: 0.71,
      Iw: 18900
    },
    elasticModulus: {
      Wely: 71.9,
      Welz: 24.2
    },
    radiusOfGyration: {
      iy: 8.66,
      iz: 4.05
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'OMEGA200x100x4',
    type: ProfileType.OMEGA,
    designation: 'Ω 200x100x4',
    dimensions: {
      height: 200,
      width: 100,
      thickness: 4,
      lipLength: 20
    },
    weight: 9.89,
    area: 12.6,
    perimeter: 640,
    inertia: {
      Iyy: 919,
      Izz: 200,
      It: 1.24,
      Iw: 24000
    },
    elasticModulus: {
      Wely: 91.9,
      Welz: 30.8
    },
    radiusOfGyration: {
      iy: 8.54,
      iz: 3.98
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  }
];

export default OMEGA_PROFILES;