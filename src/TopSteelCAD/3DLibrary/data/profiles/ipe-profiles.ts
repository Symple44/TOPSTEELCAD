import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Profilés IPE selon EN 10365
 * Gamme complète de IPE 80 à IPE 600
 */
export const IPE_PROFILES: SteelProfile[] = [
  // IPE 80
  {
    id: 'IPE80',
    type: ProfileType.IPE,
    designation: 'IPE 80',
    dimensions: {
      height: 80,
      width: 46,
      webThickness: 3.8,
      flangeThickness: 5.2,
      rootRadius: 5,
      toeRadius: 2.5
    },
    weight: 6.0,
    area: 7.64,
    perimeter: 328,
    inertia: {
      Iyy: 80.1,
      Izz: 8.49,
      It: 0.70,
      Iw: 117.9
    },
    elasticModulus: {
      Wely: 20.0,
      Welz: 3.69
    },
    plasticModulus: {
      Wply: 23.2,
      Wplz: 5.82
    },
    radiusOfGyration: {
      iy: 3.24,
      iz: 1.05
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },
  
  // IPE 100
  {
    id: 'IPE100',
    type: ProfileType.IPE,
    designation: 'IPE 100',
    dimensions: {
      height: 100,
      width: 55,
      webThickness: 4.1,
      flangeThickness: 5.7,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 8.1,
    area: 10.3,
    perimeter: 400,
    inertia: {
      Iyy: 171,
      Izz: 15.9,
      It: 1.20,
      Iw: 346
    },
    elasticModulus: {
      Wely: 34.2,
      Welz: 5.79
    },
    plasticModulus: {
      Wply: 39.4,
      Wplz: 9.15
    },
    radiusOfGyration: {
      iy: 4.07,
      iz: 1.24
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 120
  {
    id: 'IPE120',
    type: ProfileType.IPE,
    designation: 'IPE 120',
    dimensions: {
      height: 120,
      width: 64,
      webThickness: 4.4,
      flangeThickness: 6.3,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 10.4,
    area: 13.2,
    perimeter: 475,
    inertia: {
      Iyy: 318,
      Izz: 27.7,
      It: 1.74,
      Iw: 890
    },
    elasticModulus: {
      Wely: 53.0,
      Welz: 8.65
    },
    plasticModulus: {
      Wply: 60.7,
      Wplz: 13.6
    },
    radiusOfGyration: {
      iy: 4.90,
      iz: 1.45
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 140
  {
    id: 'IPE140',
    type: ProfileType.IPE,
    designation: 'IPE 140',
    dimensions: {
      height: 140,
      width: 73,
      webThickness: 4.7,
      flangeThickness: 6.9,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 12.9,
    area: 16.4,
    perimeter: 551,
    inertia: {
      Iyy: 541,
      Izz: 44.9,
      It: 2.45,
      Iw: 1980
    },
    elasticModulus: {
      Wely: 77.3,
      Welz: 12.3
    },
    plasticModulus: {
      Wply: 88.3,
      Wplz: 19.2
    },
    radiusOfGyration: {
      iy: 5.74,
      iz: 1.65
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 160
  {
    id: 'IPE160',
    type: ProfileType.IPE,
    designation: 'IPE 160',
    dimensions: {
      height: 160,
      width: 82,
      webThickness: 5,
      flangeThickness: 7.4,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 15.8,
    area: 20.1,
    perimeter: 623,
    inertia: {
      Iyy: 869,
      Izz: 68.3,
      It: 3.60,
      Iw: 3960
    },
    elasticModulus: {
      Wely: 109,
      Welz: 16.7
    },
    plasticModulus: {
      Wply: 124,
      Wplz: 26.1
    },
    radiusOfGyration: {
      iy: 6.58,
      iz: 1.84
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 180
  {
    id: 'IPE180',
    type: ProfileType.IPE,
    designation: 'IPE 180',
    dimensions: {
      height: 180,
      width: 91,
      webThickness: 5.3,
      flangeThickness: 8,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 18.8,
    area: 23.9,
    perimeter: 698,
    inertia: {
      Iyy: 1317,
      Izz: 101,
      It: 4.79,
      Iw: 7430
    },
    elasticModulus: {
      Wely: 146,
      Welz: 22.2
    },
    plasticModulus: {
      Wply: 166,
      Wplz: 34.6
    },
    radiusOfGyration: {
      iy: 7.42,
      iz: 2.05
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 200
  {
    id: 'IPE200',
    type: ProfileType.IPE,
    designation: 'IPE 200',
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 5.6,
      flangeThickness: 8.5,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 22.4,
    area: 28.5,
    perimeter: 768,
    inertia: {
      Iyy: 1943,
      Izz: 142,
      It: 6.98,
      Iw: 13000
    },
    elasticModulus: {
      Wely: 194,
      Welz: 28.5
    },
    plasticModulus: {
      Wply: 221,
      Wplz: 44.6
    },
    radiusOfGyration: {
      iy: 8.26,
      iz: 2.24
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 220
  {
    id: 'IPE220',
    type: ProfileType.IPE,
    designation: 'IPE 220',
    dimensions: {
      height: 220,
      width: 110,
      webThickness: 5.9,
      flangeThickness: 9.2,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 26.2,
    area: 33.4,
    perimeter: 848,
    inertia: {
      Iyy: 2772,
      Izz: 205,
      It: 9.07,
      Iw: 22700
    },
    elasticModulus: {
      Wely: 252,
      Welz: 37.3
    },
    plasticModulus: {
      Wply: 285,
      Wplz: 58.1
    },
    radiusOfGyration: {
      iy: 9.11,
      iz: 2.48
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 240
  {
    id: 'IPE240',
    type: ProfileType.IPE,
    designation: 'IPE 240',
    dimensions: {
      height: 240,
      width: 120,
      webThickness: 6.2,
      flangeThickness: 9.8,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 30.7,
    area: 39.1,
    perimeter: 922,
    inertia: {
      Iyy: 3892,
      Izz: 284,
      It: 12.9,
      Iw: 37400
    },
    elasticModulus: {
      Wely: 324,
      Welz: 47.3
    },
    plasticModulus: {
      Wply: 367,
      Wplz: 73.9
    },
    radiusOfGyration: {
      iy: 9.97,
      iz: 2.69
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 270
  {
    id: 'IPE270',
    type: ProfileType.IPE,
    designation: 'IPE 270',
    dimensions: {
      height: 270,
      width: 135,
      webThickness: 6.6,
      flangeThickness: 10.2,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 36.1,
    area: 45.9,
    perimeter: 1041,
    inertia: {
      Iyy: 5790,
      Izz: 420,
      It: 15.9,
      Iw: 70600
    },
    elasticModulus: {
      Wely: 429,
      Welz: 62.2
    },
    plasticModulus: {
      Wply: 484,
      Wplz: 97.0
    },
    radiusOfGyration: {
      iy: 11.2,
      iz: 3.02
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 300
  {
    id: 'IPE300',
    type: ProfileType.IPE,
    designation: 'IPE 300',
    dimensions: {
      height: 300,
      width: 150,
      webThickness: 7.1,
      flangeThickness: 10.7,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 42.2,
    area: 53.8,
    perimeter: 1167,
    inertia: {
      Iyy: 8356,
      Izz: 603.8,
      It: 20.1,
      Iw: 125900
    },
    elasticModulus: {
      Wely: 557,
      Welz: 80.5
    },
    plasticModulus: {
      Wply: 628,
      Wplz: 125
    },
    radiusOfGyration: {
      iy: 12.5,
      iz: 3.35
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 330
  {
    id: 'IPE330',
    type: ProfileType.IPE,
    designation: 'IPE 330',
    dimensions: {
      height: 330,
      width: 160,
      webThickness: 7.5,
      flangeThickness: 11.5,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 49.1,
    area: 62.6,
    perimeter: 1261,
    inertia: {
      Iyy: 11770,
      Izz: 788,
      It: 28.1,
      Iw: 199100
    },
    elasticModulus: {
      Wely: 713,
      Welz: 98.5
    },
    plasticModulus: {
      Wply: 804,
      Wplz: 153
    },
    radiusOfGyration: {
      iy: 13.7,
      iz: 3.55
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 360
  {
    id: 'IPE360',
    type: ProfileType.IPE,
    designation: 'IPE 360',
    dimensions: {
      height: 360,
      width: 170,
      webThickness: 8,
      flangeThickness: 12.7,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 57.1,
    area: 72.7,
    perimeter: 1373,
    inertia: {
      Iyy: 16270,
      Izz: 1043,
      It: 37.3,
      Iw: 314000
    },
    elasticModulus: {
      Wely: 904,
      Welz: 123
    },
    plasticModulus: {
      Wply: 1019,
      Wplz: 191
    },
    radiusOfGyration: {
      iy: 15.0,
      iz: 3.79
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 400
  {
    id: 'IPE400',
    type: ProfileType.IPE,
    designation: 'IPE 400',
    dimensions: {
      height: 400,
      width: 180,
      webThickness: 8.6,
      flangeThickness: 13.5,
      rootRadius: 21,
      toeRadius: 10.5
    },
    weight: 66.3,
    area: 84.5,
    perimeter: 1467,
    inertia: {
      Iyy: 23130,
      Izz: 1318,
      It: 51.1,
      Iw: 490000
    },
    elasticModulus: {
      Wely: 1156,
      Welz: 146
    },
    plasticModulus: {
      Wply: 1307,
      Wplz: 229
    },
    radiusOfGyration: {
      iy: 16.5,
      iz: 3.95
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 450
  {
    id: 'IPE450',
    type: ProfileType.IPE,
    designation: 'IPE 450',
    dimensions: {
      height: 450,
      width: 190,
      webThickness: 9.4,
      flangeThickness: 14.6,
      rootRadius: 21,
      toeRadius: 10.5
    },
    weight: 77.6,
    area: 98.8,
    perimeter: 1605,
    inertia: {
      Iyy: 33740,
      Izz: 1676,
      It: 66.9,
      Iw: 791000
    },
    elasticModulus: {
      Wely: 1500,
      Welz: 176
    },
    plasticModulus: {
      Wply: 1702,
      Wplz: 276
    },
    radiusOfGyration: {
      iy: 18.5,
      iz: 4.12
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 500
  {
    id: 'IPE500',
    type: ProfileType.IPE,
    designation: 'IPE 500',
    dimensions: {
      height: 500,
      width: 200,
      webThickness: 10.2,
      flangeThickness: 16,
      rootRadius: 21,
      toeRadius: 10.5
    },
    weight: 90.7,
    area: 116,
    perimeter: 1744,
    inertia: {
      Iyy: 48200,
      Izz: 2142,
      It: 89.3,
      Iw: 1249000
    },
    elasticModulus: {
      Wely: 1928,
      Welz: 214
    },
    plasticModulus: {
      Wply: 2194,
      Wplz: 336
    },
    radiusOfGyration: {
      iy: 20.4,
      iz: 4.31
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 550
  {
    id: 'IPE550',
    type: ProfileType.IPE,
    designation: 'IPE 550',
    dimensions: {
      height: 550,
      width: 210,
      webThickness: 11.1,
      flangeThickness: 17.2,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 106,
    area: 134,
    perimeter: 1877,
    inertia: {
      Iyy: 67120,
      Izz: 2668,
      It: 123,
      Iw: 1884000
    },
    elasticModulus: {
      Wely: 2441,
      Welz: 254
    },
    plasticModulus: {
      Wply: 2787,
      Wplz: 401
    },
    radiusOfGyration: {
      iy: 22.3,
      iz: 4.45
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // IPE 600
  {
    id: 'IPE600',
    type: ProfileType.IPE,
    designation: 'IPE 600',
    dimensions: {
      height: 600,
      width: 220,
      webThickness: 12,
      flangeThickness: 19,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 122,
    area: 156,
    perimeter: 2018,
    inertia: {
      Iyy: 92080,
      Izz: 3387,
      It: 165,
      Iw: 2846000
    },
    elasticModulus: {
      Wely: 3069,
      Welz: 308
    },
    plasticModulus: {
      Wply: 3512,
      Wplz: 486
    },
    radiusOfGyration: {
      iy: 24.3,
      iz: 4.66
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  }
];