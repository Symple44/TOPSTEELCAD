/**
 * Profilés C selon EN 10162
 * Profilés formés à froid en C pour ossatures
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const C_PROFILES: SteelProfile[] = [
  // Série C100
  {
    id: 'C100x50x2',
    type: ProfileType.C,
    designation: 'C 100x50x2',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 2
    },
    weight: 2.35,
    area: 2.99,
    perimeter: 300,
    inertia: {
      Iyy: 71.1,
      Izz: 19.5,
      It: 0.20,
      Iw: 1950
    },
    elasticModulus: {
      Wely: 14.2,
      Welz: 5.20
    },
    radiusOfGyration: {
      iy: 4.87,
      iz: 2.55
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C100x50x2.5',
    type: ProfileType.C,
    designation: 'C 100x50x2.5',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 2.5
    },
    weight: 2.90,
    area: 3.69,
    perimeter: 300,
    inertia: {
      Iyy: 86.2,
      Izz: 23.7,
      It: 0.31,
      Iw: 2370
    },
    elasticModulus: {
      Wely: 17.2,
      Welz: 6.32
    },
    radiusOfGyration: {
      iy: 4.83,
      iz: 2.53
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C100x50x3',
    type: ProfileType.C,
    designation: 'C 100x50x3',
    dimensions: {
      height: 100,
      width: 50,
      thickness: 3
    },
    weight: 3.44,
    area: 4.38,
    perimeter: 300,
    inertia: {
      Iyy: 100,
      Izz: 27.6,
      It: 0.44,
      Iw: 2760
    },
    elasticModulus: {
      Wely: 20.0,
      Welz: 7.36
    },
    radiusOfGyration: {
      iy: 4.78,
      iz: 2.51
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série C120
  {
    id: 'C120x55x2',
    type: ProfileType.C,
    designation: 'C 120x55x2',
    dimensions: {
      height: 120,
      width: 55,
      thickness: 2
    },
    weight: 2.75,
    area: 3.50,
    perimeter: 350,
    inertia: {
      Iyy: 128,
      Izz: 28.7,
      It: 0.23,
      Iw: 3160
    },
    elasticModulus: {
      Wely: 21.3,
      Welz: 6.98
    },
    radiusOfGyration: {
      iy: 6.05,
      iz: 2.87
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C120x55x2.5',
    type: ProfileType.C,
    designation: 'C 120x55x2.5',
    dimensions: {
      height: 120,
      width: 55,
      thickness: 2.5
    },
    weight: 3.40,
    area: 4.33,
    perimeter: 350,
    inertia: {
      Iyy: 155,
      Izz: 34.8,
      It: 0.36,
      Iw: 3830
    },
    elasticModulus: {
      Wely: 25.8,
      Welz: 8.47
    },
    radiusOfGyration: {
      iy: 5.99,
      iz: 2.84
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C120x55x3',
    type: ProfileType.C,
    designation: 'C 120x55x3',
    dimensions: {
      height: 120,
      width: 55,
      thickness: 3
    },
    weight: 4.04,
    area: 5.14,
    perimeter: 350,
    inertia: {
      Iyy: 180,
      Izz: 40.5,
      It: 0.51,
      Iw: 4460
    },
    elasticModulus: {
      Wely: 30.0,
      Welz: 9.86
    },
    radiusOfGyration: {
      iy: 5.92,
      iz: 2.81
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série C140
  {
    id: 'C140x60x2.5',
    type: ProfileType.C,
    designation: 'C 140x60x2.5',
    dimensions: {
      height: 140,
      width: 60,
      thickness: 2.5
    },
    weight: 3.90,
    area: 4.97,
    perimeter: 400,
    inertia: {
      Iyy: 230,
      Izz: 47.9,
      It: 0.41,
      Iw: 5750
    },
    elasticModulus: {
      Wely: 32.9,
      Welz: 10.7
    },
    radiusOfGyration: {
      iy: 6.81,
      iz: 3.10
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C140x60x3',
    type: ProfileType.C,
    designation: 'C 140x60x3',
    dimensions: {
      height: 140,
      width: 60,
      thickness: 3
    },
    weight: 4.64,
    area: 5.91,
    perimeter: 400,
    inertia: {
      Iyy: 267,
      Izz: 55.6,
      It: 0.59,
      Iw: 6680
    },
    elasticModulus: {
      Wely: 38.1,
      Welz: 12.4
    },
    radiusOfGyration: {
      iy: 6.73,
      iz: 3.07
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C140x60x4',
    type: ProfileType.C,
    designation: 'C 140x60x4',
    dimensions: {
      height: 140,
      width: 60,
      thickness: 4
    },
    weight: 6.08,
    area: 7.74,
    perimeter: 400,
    inertia: {
      Iyy: 337,
      Izz: 70.1,
      It: 1.03,
      Iw: 8420
    },
    elasticModulus: {
      Wely: 48.1,
      Welz: 15.6
    },
    radiusOfGyration: {
      iy: 6.59,
      iz: 3.01
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série C160
  {
    id: 'C160x65x3',
    type: ProfileType.C,
    designation: 'C 160x65x3',
    dimensions: {
      height: 160,
      width: 65,
      thickness: 3
    },
    weight: 5.24,
    area: 6.68,
    perimeter: 450,
    inertia: {
      Iyy: 380,
      Izz: 71.2,
      It: 0.67,
      Iw: 9230
    },
    elasticModulus: {
      Wely: 47.5,
      Welz: 14.6
    },
    radiusOfGyration: {
      iy: 7.55,
      iz: 3.27
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C160x65x4',
    type: ProfileType.C,
    designation: 'C 160x65x4',
    dimensions: {
      height: 160,
      width: 65,
      thickness: 4
    },
    weight: 6.88,
    area: 8.76,
    perimeter: 450,
    inertia: {
      Iyy: 480,
      Izz: 89.6,
      It: 1.17,
      Iw: 11600
    },
    elasticModulus: {
      Wely: 60.0,
      Welz: 18.4
    },
    radiusOfGyration: {
      iy: 7.40,
      iz: 3.20
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série C180
  {
    id: 'C180x70x3',
    type: ProfileType.C,
    designation: 'C 180x70x3',
    dimensions: {
      height: 180,
      width: 70,
      thickness: 3
    },
    weight: 5.84,
    area: 7.44,
    perimeter: 500,
    inertia: {
      Iyy: 518,
      Izz: 87.6,
      It: 0.74,
      Iw: 12200
    },
    elasticModulus: {
      Wely: 57.6,
      Welz: 16.7
    },
    radiusOfGyration: {
      iy: 8.35,
      iz: 3.43
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C180x70x4',
    type: ProfileType.C,
    designation: 'C 180x70x4',
    dimensions: {
      height: 180,
      width: 70,
      thickness: 4
    },
    weight: 7.68,
    area: 9.78,
    perimeter: 500,
    inertia: {
      Iyy: 654,
      Izz: 110,
      It: 1.30,
      Iw: 15400
    },
    elasticModulus: {
      Wely: 72.7,
      Welz: 21.0
    },
    radiusOfGyration: {
      iy: 8.18,
      iz: 3.35
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série C200
  {
    id: 'C200x75x3',
    type: ProfileType.C,
    designation: 'C 200x75x3',
    dimensions: {
      height: 200,
      width: 75,
      thickness: 3
    },
    weight: 6.44,
    area: 8.20,
    perimeter: 550,
    inertia: {
      Iyy: 689,
      Izz: 106,
      It: 0.82,
      Iw: 15900
    },
    elasticModulus: {
      Wely: 68.9,
      Welz: 18.9
    },
    radiusOfGyration: {
      iy: 9.16,
      iz: 3.59
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'C200x75x4',
    type: ProfileType.C,
    designation: 'C 200x75x4',
    dimensions: {
      height: 200,
      width: 75,
      thickness: 4
    },
    weight: 8.48,
    area: 10.8,
    perimeter: 550,
    inertia: {
      Iyy: 870,
      Izz: 133,
      It: 1.44,
      Iw: 20000
    },
    elasticModulus: {
      Wely: 87.0,
      Welz: 23.8
    },
    radiusOfGyration: {
      iy: 8.97,
      iz: 3.51
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  }
];

export default C_PROFILES;