/**
 * Profilés Z selon EN 10162
 * Profilés formés à froid en Z pour structures secondaires
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const Z_PROFILES: SteelProfile[] = [
  // Série Z100
  {
    id: 'Z100x50x15x2',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 100x50x15x2',
    dimensions: {
      height: 100,
      width: 50,
      lipLength: 15,
      thickness: 2
    },
    weight: 2.59,
    area: 3.30,
    perimeter: 330,
    inertia: {
      Iyy: 71.9,
      Izz: 23.8,
      It: 0.22,
      Iw: 2240
    },
    elasticModulus: {
      Wely: 14.4,
      Welz: 6.35
    },
    radiusOfGyration: {
      iy: 4.67,
      iz: 2.68
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'Z100x50x15x2.5',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 100x50x15x2.5',
    dimensions: {
      height: 100,
      width: 50,
      lipLength: 15,
      thickness: 2.5
    },
    weight: 3.19,
    area: 4.07,
    perimeter: 330,
    inertia: {
      Iyy: 87.5,
      Izz: 28.9,
      It: 0.34,
      Iw: 2720
    },
    elasticModulus: {
      Wely: 17.5,
      Welz: 7.72
    },
    radiusOfGyration: {
      iy: 4.64,
      iz: 2.66
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Z120
  {
    id: 'Z120x55x15x2',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 120x55x15x2',
    dimensions: {
      height: 120,
      width: 55,
      lipLength: 15,
      thickness: 2
    },
    weight: 3.06,
    area: 3.90,
    perimeter: 380,
    inertia: {
      Iyy: 130,
      Izz: 35.2,
      It: 0.26,
      Iw: 3900
    },
    elasticModulus: {
      Wely: 21.7,
      Welz: 8.56
    },
    radiusOfGyration: {
      iy: 5.77,
      iz: 3.00
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'Z120x55x15x2.5',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 120x55x15x2.5',
    dimensions: {
      height: 120,
      width: 55,
      lipLength: 15,
      thickness: 2.5
    },
    weight: 3.79,
    area: 4.83,
    perimeter: 380,
    inertia: {
      Iyy: 158,
      Izz: 42.8,
      It: 0.40,
      Iw: 4730
    },
    elasticModulus: {
      Wely: 26.3,
      Welz: 10.4
    },
    radiusOfGyration: {
      iy: 5.72,
      iz: 2.98
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Z140
  {
    id: 'Z140x60x15x2.5',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 140x60x15x2.5',
    dimensions: {
      height: 140,
      width: 60,
      lipLength: 15,
      thickness: 2.5
    },
    weight: 4.39,
    area: 5.59,
    perimeter: 430,
    inertia: {
      Iyy: 235,
      Izz: 58.9,
      It: 0.46,
      Iw: 6800
    },
    elasticModulus: {
      Wely: 33.6,
      Welz: 13.1
    },
    radiusOfGyration: {
      iy: 6.49,
      iz: 3.24
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'Z140x60x15x3',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 140x60x15x3',
    dimensions: {
      height: 140,
      width: 60,
      lipLength: 15,
      thickness: 3
    },
    weight: 5.22,
    area: 6.65,
    perimeter: 430,
    inertia: {
      Iyy: 276,
      Izz: 69.2,
      It: 0.66,
      Iw: 8000
    },
    elasticModulus: {
      Wely: 39.4,
      Welz: 15.4
    },
    radiusOfGyration: {
      iy: 6.44,
      iz: 3.22
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Z160
  {
    id: 'Z160x65x20x2.5',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 160x65x20x2.5',
    dimensions: {
      height: 160,
      width: 65,
      lipLength: 20,
      thickness: 2.5
    },
    weight: 5.12,
    area: 6.52,
    perimeter: 490,
    inertia: {
      Iyy: 350,
      Izz: 83.5,
      It: 0.54,
      Iw: 12400
    },
    elasticModulus: {
      Wely: 43.8,
      Welz: 17.2
    },
    radiusOfGyration: {
      iy: 7.33,
      iz: 3.58
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'Z160x65x20x3',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 160x65x20x3',
    dimensions: {
      height: 160,
      width: 65,
      lipLength: 20,
      thickness: 3
    },
    weight: 6.09,
    area: 7.76,
    perimeter: 490,
    inertia: {
      Iyy: 410,
      Izz: 97.9,
      It: 0.77,
      Iw: 14600
    },
    elasticModulus: {
      Wely: 51.3,
      Welz: 20.2
    },
    radiusOfGyration: {
      iy: 7.27,
      iz: 3.55
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Z180
  {
    id: 'Z180x70x20x3',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 180x70x20x3',
    dimensions: {
      height: 180,
      width: 70,
      lipLength: 20,
      thickness: 3
    },
    weight: 6.89,
    area: 8.78,
    perimeter: 540,
    inertia: {
      Iyy: 583,
      Izz: 127,
      It: 0.87,
      Iw: 19800
    },
    elasticModulus: {
      Wely: 64.8,
      Welz: 24.3
    },
    radiusOfGyration: {
      iy: 8.15,
      iz: 3.81
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'Z180x70x20x4',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 180x70x20x4',
    dimensions: {
      height: 180,
      width: 70,
      lipLength: 20,
      thickness: 4
    },
    weight: 9.05,
    area: 11.5,
    perimeter: 540,
    inertia: {
      Iyy: 747,
      Izz: 161,
      It: 1.53,
      Iw: 25300
    },
    elasticModulus: {
      Wely: 83.0,
      Welz: 30.9
    },
    radiusOfGyration: {
      iy: 8.05,
      iz: 3.74
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  
  // Série Z200
  {
    id: 'Z200x75x20x3',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 200x75x20x3',
    dimensions: {
      height: 200,
      width: 75,
      lipLength: 20,
      thickness: 3
    },
    weight: 7.69,
    area: 9.80,
    perimeter: 590,
    inertia: {
      Iyy: 782,
      Izz: 157,
      It: 0.98,
      Iw: 26100
    },
    elasticModulus: {
      Wely: 78.2,
      Welz: 29.5
    },
    radiusOfGyration: {
      iy: 8.93,
      iz: 4.00
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  },
  {
    id: 'Z200x75x20x4',
    type: ProfileType.Z_PROFILE,
    designation: 'Z 200x75x20x4',
    dimensions: {
      height: 200,
      width: 75,
      lipLength: 20,
      thickness: 4
    },
    weight: 10.1,
    area: 12.9,
    perimeter: 590,
    inertia: {
      Iyy: 1001,
      Izz: 199,
      It: 1.72,
      Iw: 33400
    },
    elasticModulus: {
      Wely: 100,
      Welz: 37.5
    },
    radiusOfGyration: {
      iy: 8.82,
      iz: 3.93
    },
    source: 'EN 10162',
    category: 'Formé à froid'
  }
];

export default Z_PROFILES;