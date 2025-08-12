import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Profilés UAP (en U à ailes parallèles) selon EN 10365
 * Gamme complète de UAP 80 à UAP 400
 */
export const UAP_PROFILES: SteelProfile[] = [
  // UAP 80
  {
    id: 'UAP80',
    type: ProfileType.UAP,
    designation: 'UAP 80',
    dimensions: {
      height: 80,
      width: 45,
      webThickness: 6,
      flangeThickness: 8,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 8.64,
    area: 11.0,
    perimeter: 343,
    inertia: {
      Iyy: 206,
      Izz: 49.3,
      It: 4.97,
      Iw: 2720
    },
    elasticModulus: {
      Wely: 51.5,
      Welz: 21.9
    },
    plasticModulus: {
      Wply: 59.7,
      Wplz: 33.2
    },
    radiusOfGyration: {
      iy: 4.33,
      iz: 2.12
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 100
  {
    id: 'UAP100',
    type: ProfileType.UAP,
    designation: 'UAP 100',
    dimensions: {
      height: 100,
      width: 50,
      webThickness: 6,
      flangeThickness: 8.5,
      rootRadius: 8.5,
      toeRadius: 4.25
    },
    weight: 10.6,
    area: 13.5,
    perimeter: 407,
    inertia: {
      Iyy: 385,
      Izz: 77.8,
      It: 7.12,
      Iw: 5630
    },
    elasticModulus: {
      Wely: 77.0,
      Welz: 31.1
    },
    plasticModulus: {
      Wply: 88.1,
      Wplz: 47.1
    },
    radiusOfGyration: {
      iy: 5.34,
      iz: 2.40
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 120
  {
    id: 'UAP120',
    type: ProfileType.UAP,
    designation: 'UAP 120',
    dimensions: {
      height: 120,
      width: 55,
      webThickness: 7,
      flangeThickness: 9,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 13.4,
    area: 17.0,
    perimeter: 471,
    inertia: {
      Iyy: 645,
      Izz: 116,
      It: 10.7,
      Iw: 10700
    },
    elasticModulus: {
      Wely: 108,
      Welz: 42.2
    },
    plasticModulus: {
      Wply: 122,
      Wplz: 63.8
    },
    radiusOfGyration: {
      iy: 6.16,
      iz: 2.61
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 140
  {
    id: 'UAP140',
    type: ProfileType.UAP,
    designation: 'UAP 140',
    dimensions: {
      height: 140,
      width: 60,
      webThickness: 7,
      flangeThickness: 10,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 16.0,
    area: 20.4,
    perimeter: 535,
    inertia: {
      Iyy: 1060,
      Izz: 165,
      It: 14.4,
      Iw: 19500
    },
    elasticModulus: {
      Wely: 151,
      Welz: 55.0
    },
    plasticModulus: {
      Wply: 172,
      Wplz: 83.3
    },
    radiusOfGyration: {
      iy: 7.21,
      iz: 2.84
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 160
  {
    id: 'UAP160',
    type: ProfileType.UAP,
    designation: 'UAP 160',
    dimensions: {
      height: 160,
      width: 65,
      webThickness: 7.5,
      flangeThickness: 10.5,
      rootRadius: 10.5,
      toeRadius: 5.25
    },
    weight: 18.8,
    area: 24.0,
    perimeter: 599,
    inertia: {
      Iyy: 1660,
      Izz: 232,
      It: 19.2,
      Iw: 34400
    },
    elasticModulus: {
      Wely: 207,
      Welz: 71.4
    },
    plasticModulus: {
      Wply: 232,
      Wplz: 108
    },
    radiusOfGyration: {
      iy: 8.31,
      iz: 3.11
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 180
  {
    id: 'UAP180',
    type: ProfileType.UAP,
    designation: 'UAP 180',
    dimensions: {
      height: 180,
      width: 70,
      webThickness: 8,
      flangeThickness: 11,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 22.0,
    area: 28.0,
    perimeter: 663,
    inertia: {
      Iyy: 2400,
      Izz: 314,
      It: 24.9,
      Iw: 57200
    },
    elasticModulus: {
      Wely: 267,
      Welz: 89.7
    },
    plasticModulus: {
      Wply: 298,
      Wplz: 135
    },
    radiusOfGyration: {
      iy: 9.26,
      iz: 3.35
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 200
  {
    id: 'UAP200',
    type: ProfileType.UAP,
    designation: 'UAP 200',
    dimensions: {
      height: 200,
      width: 75,
      webThickness: 8.5,
      flangeThickness: 11.5,
      rootRadius: 11.5,
      toeRadius: 5.75
    },
    weight: 25.3,
    area: 32.2,
    perimeter: 727,
    inertia: {
      Iyy: 3310,
      Izz: 416,
      It: 31.8,
      Iw: 89100
    },
    elasticModulus: {
      Wely: 331,
      Welz: 111
    },
    plasticModulus: {
      Wply: 369,
      Wplz: 167
    },
    radiusOfGyration: {
      iy: 10.1,
      iz: 3.59
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 220
  {
    id: 'UAP220',
    type: ProfileType.UAP,
    designation: 'UAP 220',
    dimensions: {
      height: 220,
      width: 80,
      webThickness: 9,
      flangeThickness: 12.5,
      rootRadius: 12.5,
      toeRadius: 6.25
    },
    weight: 29.4,
    area: 37.4,
    perimeter: 791,
    inertia: {
      Iyy: 4450,
      Izz: 549,
      It: 42.4,
      Iw: 137000
    },
    elasticModulus: {
      Wely: 405,
      Welz: 137
    },
    plasticModulus: {
      Wply: 449,
      Wplz: 206
    },
    radiusOfGyration: {
      iy: 10.9,
      iz: 3.83
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 240
  {
    id: 'UAP240',
    type: ProfileType.UAP,
    designation: 'UAP 240',
    dimensions: {
      height: 240,
      width: 85,
      webThickness: 9.5,
      flangeThickness: 13,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 33.2,
    area: 42.3,
    perimeter: 855,
    inertia: {
      Iyy: 5850,
      Izz: 700,
      It: 52.5,
      Iw: 202000
    },
    elasticModulus: {
      Wely: 488,
      Welz: 165
    },
    plasticModulus: {
      Wply: 540,
      Wplz: 247
    },
    radiusOfGyration: {
      iy: 11.7,
      iz: 4.06
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 260
  {
    id: 'UAP260',
    type: ProfileType.UAP,
    designation: 'UAP 260',
    dimensions: {
      height: 260,
      width: 90,
      webThickness: 10,
      flangeThickness: 14,
      rootRadius: 14,
      toeRadius: 7
    },
    weight: 37.9,
    area: 48.3,
    perimeter: 919,
    inertia: {
      Iyy: 7560,
      Izz: 894,
      It: 67.6,
      Iw: 290000
    },
    elasticModulus: {
      Wely: 582,
      Welz: 199
    },
    plasticModulus: {
      Wply: 643,
      Wplz: 298
    },
    radiusOfGyration: {
      iy: 12.5,
      iz: 4.30
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 280
  {
    id: 'UAP280',
    type: ProfileType.UAP,
    designation: 'UAP 280',
    dimensions: {
      height: 280,
      width: 95,
      webThickness: 10,
      flangeThickness: 15,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 41.8,
    area: 53.2,
    perimeter: 983,
    inertia: {
      Iyy: 9720,
      Izz: 1094,
      It: 82.5,
      Iw: 402000
    },
    elasticModulus: {
      Wely: 695,
      Welz: 230
    },
    plasticModulus: {
      Wply: 766,
      Wplz: 345
    },
    radiusOfGyration: {
      iy: 13.5,
      iz: 4.54
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 300
  {
    id: 'UAP300',
    type: ProfileType.UAP,
    designation: 'UAP 300',
    dimensions: {
      height: 300,
      width: 100,
      webThickness: 10,
      flangeThickness: 16,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 46.2,
    area: 58.8,
    perimeter: 1047,
    inertia: {
      Iyy: 12250,
      Izz: 1347,
      It: 103,
      Iw: 550000
    },
    elasticModulus: {
      Wely: 817,
      Welz: 269
    },
    plasticModulus: {
      Wply: 900,
      Wplz: 404
    },
    radiusOfGyration: {
      iy: 14.4,
      iz: 4.78
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 320
  {
    id: 'UAP320',
    type: ProfileType.UAP,
    designation: 'UAP 320',
    dimensions: {
      height: 320,
      width: 100,
      webThickness: 14,
      flangeThickness: 17.5,
      rootRadius: 17.5,
      toeRadius: 8.75
    },
    weight: 59.5,
    area: 75.8,
    perimeter: 1099,
    inertia: {
      Iyy: 15980,
      Izz: 1610,
      It: 170,
      Iw: 764000
    },
    elasticModulus: {
      Wely: 999,
      Welz: 322
    },
    plasticModulus: {
      Wply: 1111,
      Wplz: 483
    },
    radiusOfGyration: {
      iy: 14.5,
      iz: 4.61
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 350
  {
    id: 'UAP350',
    type: ProfileType.UAP,
    designation: 'UAP 350',
    dimensions: {
      height: 350,
      width: 100,
      webThickness: 14,
      flangeThickness: 16,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 60.6,
    area: 77.2,
    perimeter: 1163,
    inertia: {
      Iyy: 20100,
      Izz: 1610,
      It: 147,
      Iw: 948000
    },
    elasticModulus: {
      Wely: 1149,
      Welz: 322
    },
    plasticModulus: {
      Wply: 1285,
      Wplz: 483
    },
    radiusOfGyration: {
      iy: 16.1,
      iz: 4.56
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 380
  {
    id: 'UAP380',
    type: ProfileType.UAP,
    designation: 'UAP 380',
    dimensions: {
      height: 380,
      width: 102,
      webThickness: 13.5,
      flangeThickness: 16,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 63.1,
    area: 80.4,
    perimeter: 1227,
    inertia: {
      Iyy: 24500,
      Izz: 1707,
      It: 154,
      Iw: 1164000
    },
    elasticModulus: {
      Wely: 1289,
      Welz: 335
    },
    plasticModulus: {
      Wply: 1447,
      Wplz: 502
    },
    radiusOfGyration: {
      iy: 17.5,
      iz: 4.61
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UAP 400
  {
    id: 'UAP400',
    type: ProfileType.UAP,
    designation: 'UAP 400',
    dimensions: {
      height: 400,
      width: 110,
      webThickness: 14,
      flangeThickness: 18,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 71.8,
    area: 91.5,
    perimeter: 1299,
    inertia: {
      Iyy: 30800,
      Izz: 2257,
      It: 204,
      Iw: 1583000
    },
    elasticModulus: {
      Wely: 1540,
      Welz: 410
    },
    plasticModulus: {
      Wply: 1728,
      Wplz: 618
    },
    radiusOfGyration: {
      iy: 18.4,
      iz: 4.97
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  }
];