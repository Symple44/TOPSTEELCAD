/**
 * Profilés Sigma selon EN 10162
 * Profilés formés à froid en Sigma pour bardages et couvertures
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const SIGMA_PROFILES: SteelProfile[] = [
  // Série Sigma 100
  {
    id: 'SIGMA100x50x1.5',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 100x50x1.5',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 1.5,
      lipLength: 10
    },
    weight: 1.82,
    area: 2.32,
    perimeter: 320,
    inertia: {
      Iyy: 45.2,
      Izz: 12.8,
      It: 0.11,
      Iw: 1280
    },
    elasticModulus: {
      Wely: 9.04,
      Welz: 3.41
    },
    radiusOfGyration: {
      iy: 4.42,
      iz: 2.35
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'SIGMA100x50x2',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 100x50x2',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 2,
      lipLength: 10
    },
    weight: 2.38,
    area: 3.03,
    perimeter: 320,
    inertia: {
      Iyy: 57.8,
      Izz: 16.4,
      It: 0.18,
      Iw: 1640
    },
    elasticModulus: {
      Wely: 11.6,
      Welz: 4.37
    },
    radiusOfGyration: {
      iy: 4.37,
      iz: 2.33
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Sigma 120
  {
    id: 'SIGMA120x60x1.5',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 120x60x1.5',
    dimensions: {
      height: 120,
      width: 60,
      thickness: 1.5,
      lipLength: 12
    },
    weight: 2.23,
    area: 2.84,
    perimeter: 384,
    inertia: {
      Iyy: 78.5,
      Izz: 21.4,
      It: 0.13,
      Iw: 2280
    },
    elasticModulus: {
      Wely: 13.1,
      Welz: 5.35
    },
    radiusOfGyration: {
      iy: 5.26,
      iz: 2.75
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'SIGMA120x60x2',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 120x60x2',
    dimensions: {
      height: 120,
      width: 60,
      thickness: 2,
      lipLength: 12
    },
    weight: 2.92,
    area: 3.72,
    perimeter: 384,
    inertia: {
      Iyy: 100,
      Izz: 27.4,
      It: 0.22,
      Iw: 2920
    },
    elasticModulus: {
      Wely: 16.7,
      Welz: 6.85
    },
    radiusOfGyration: {
      iy: 5.19,
      iz: 2.72
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Sigma 140
  {
    id: 'SIGMA140x70x2',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 140x70x2',
    dimensions: {
      height: 140,
      width: 70,
      thickness: 2,
      lipLength: 15
    },
    weight: 3.42,
    area: 4.36,
    perimeter: 450,
    inertia: {
      Iyy: 154,
      Izz: 42.1,
      It: 0.26,
      Iw: 4630
    },
    elasticModulus: {
      Wely: 22.0,
      Welz: 9.02
    },
    radiusOfGyration: {
      iy: 5.94,
      iz: 3.11
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'SIGMA140x70x2.5',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 140x70x2.5',
    dimensions: {
      height: 140,
      width: 70,
      thickness: 2.5,
      lipLength: 15
    },
    weight: 4.22,
    area: 5.38,
    perimeter: 450,
    inertia: {
      Iyy: 187,
      Izz: 51.0,
      It: 0.40,
      Iw: 5610
    },
    elasticModulus: {
      Wely: 26.7,
      Welz: 10.9
    },
    radiusOfGyration: {
      iy: 5.89,
      iz: 3.08
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Sigma 160
  {
    id: 'SIGMA160x80x2.5',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 160x80x2.5',
    dimensions: {
      height: 160,
      width: 80,
      thickness: 2.5,
      lipLength: 18
    },
    weight: 4.92,
    area: 6.27,
    perimeter: 518,
    inertia: {
      Iyy: 279,
      Izz: 71.8,
      It: 0.46,
      Iw: 8190
    },
    elasticModulus: {
      Wely: 34.9,
      Welz: 13.8
    },
    radiusOfGyration: {
      iy: 6.68,
      iz: 3.38
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'SIGMA160x80x3',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 160x80x3',
    dimensions: {
      height: 160,
      width: 80,
      thickness: 3,
      lipLength: 18
    },
    weight: 5.85,
    area: 7.45,
    perimeter: 518,
    inertia: {
      Iyy: 326,
      Izz: 83.7,
      It: 0.66,
      Iw: 9550
    },
    elasticModulus: {
      Wely: 40.8,
      Welz: 16.1
    },
    radiusOfGyration: {
      iy: 6.61,
      iz: 3.35
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Sigma 200
  {
    id: 'SIGMA200x100x3',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 200x100x3',
    dimensions: {
      height: 200,
      width: 100,
      thickness: 3,
      lipLength: 20
    },
    weight: 7.45,
    area: 9.49,
    perimeter: 640,
    inertia: {
      Iyy: 639,
      Izz: 156,
      It: 0.84,
      Iw: 18800
    },
    elasticModulus: {
      Wely: 63.9,
      Welz: 24.0
    },
    radiusOfGyration: {
      iy: 8.21,
      iz: 4.05
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'SIGMA200x100x4',
    type: ProfileType.SIGMA_PROFILE,
    designation: 'Σ 200x100x4',
    dimensions: {
      height: 200,
      width: 100,
      thickness: 4,
      lipLength: 20
    },
    weight: 9.80,
    area: 12.5,
    perimeter: 640,
    inertia: {
      Iyy: 820,
      Izz: 199,
      It: 1.47,
      Iw: 24000
    },
    elasticModulus: {
      Wely: 82.0,
      Welz: 30.6
    },
    radiusOfGyration: {
      iy: 8.10,
      iz: 3.99
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  }
];

export default SIGMA_PROFILES;