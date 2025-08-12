import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Profilés UPN (en U normaux) selon EN 10365
 * Gamme complète de UPN 50 à UPN 400
 */
export const UPN_PROFILES: SteelProfile[] = [
  // UPN 50
  {
    id: 'UPN50',
    type: ProfileType.UPN,
    designation: 'UPN 50',
    dimensions: {
      height: 50,
      width: 38,
      webThickness: 5,
      flangeThickness: 7,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 5.59,
    area: 7.12,
    perimeter: 241,
    inertia: {
      Iyy: 57.4,
      Izz: 17.1,
      It: 2.27,
      Iw: 600
    },
    elasticModulus: {
      Wely: 22.9,
      Welz: 9.0
    },
    plasticModulus: {
      Wply: 27.1,
      Wplz: 13.8
    },
    radiusOfGyration: {
      iy: 2.84,
      iz: 1.55
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 65
  {
    id: 'UPN65',
    type: ProfileType.UPN,
    designation: 'UPN 65',
    dimensions: {
      height: 65,
      width: 42,
      webThickness: 5.5,
      flangeThickness: 7.5,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 7.09,
    area: 9.03,
    perimeter: 292,
    inertia: {
      Iyy: 113,
      Izz: 26.2,
      It: 3.35,
      Iw: 1340
    },
    elasticModulus: {
      Wely: 34.8,
      Welz: 12.5
    },
    plasticModulus: {
      Wply: 40.7,
      Wplz: 19.0
    },
    radiusOfGyration: {
      iy: 3.54,
      iz: 1.70
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 80
  {
    id: 'UPN80',
    type: ProfileType.UPN,
    designation: 'UPN 80',
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
      Iyy: 195,
      Izz: 36.8,
      It: 4.71,
      Iw: 2470
    },
    elasticModulus: {
      Wely: 48.8,
      Welz: 16.4
    },
    plasticModulus: {
      Wply: 56.4,
      Wplz: 24.9
    },
    radiusOfGyration: {
      iy: 4.21,
      iz: 1.83
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 100
  {
    id: 'UPN100',
    type: ProfileType.UPN,
    designation: 'UPN 100',
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
      Iyy: 365,
      Izz: 57.9,
      It: 6.83,
      Iw: 5130
    },
    elasticModulus: {
      Wely: 73.0,
      Welz: 23.2
    },
    plasticModulus: {
      Wply: 83.4,
      Wplz: 35.3
    },
    radiusOfGyration: {
      iy: 5.20,
      iz: 2.07
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 120
  {
    id: 'UPN120',
    type: ProfileType.UPN,
    designation: 'UPN 120',
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
      Iyy: 612,
      Izz: 86.4,
      It: 10.2,
      Iw: 9750
    },
    elasticModulus: {
      Wely: 102,
      Welz: 31.4
    },
    plasticModulus: {
      Wply: 115,
      Wplz: 47.6
    },
    radiusOfGyration: {
      iy: 6.00,
      iz: 2.26
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 140
  {
    id: 'UPN140',
    type: ProfileType.UPN,
    designation: 'UPN 140',
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
      Iyy: 1005,
      Izz: 123,
      It: 13.8,
      Iw: 17800
    },
    elasticModulus: {
      Wely: 144,
      Welz: 41.0
    },
    plasticModulus: {
      Wply: 162,
      Wplz: 62.2
    },
    radiusOfGyration: {
      iy: 7.02,
      iz: 2.46
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 160
  {
    id: 'UPN160',
    type: ProfileType.UPN,
    designation: 'UPN 160',
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
      Iyy: 1569,
      Izz: 172,
      It: 18.3,
      Iw: 31400
    },
    elasticModulus: {
      Wely: 196,
      Welz: 53.0
    },
    plasticModulus: {
      Wply: 219,
      Wplz: 80.3
    },
    radiusOfGyration: {
      iy: 8.08,
      iz: 2.68
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 180
  {
    id: 'UPN180',
    type: ProfileType.UPN,
    designation: 'UPN 180',
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
      Iyy: 2275,
      Izz: 234,
      It: 23.8,
      Iw: 52100
    },
    elasticModulus: {
      Wely: 253,
      Welz: 66.9
    },
    plasticModulus: {
      Wply: 282,
      Wplz: 101
    },
    radiusOfGyration: {
      iy: 9.00,
      iz: 2.89
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 200
  {
    id: 'UPN200',
    type: ProfileType.UPN,
    designation: 'UPN 200',
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
      Iyy: 3141,
      Izz: 309,
      It: 30.4,
      Iw: 81200
    },
    elasticModulus: {
      Wely: 314,
      Welz: 82.4
    },
    plasticModulus: {
      Wply: 349,
      Wplz: 124
    },
    radiusOfGyration: {
      iy: 9.87,
      iz: 3.10
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 220
  {
    id: 'UPN220',
    type: ProfileType.UPN,
    designation: 'UPN 220',
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
      Iyy: 4225,
      Izz: 408,
      It: 40.5,
      Iw: 125000
    },
    elasticModulus: {
      Wely: 384,
      Welz: 102
    },
    plasticModulus: {
      Wply: 425,
      Wplz: 154
    },
    radiusOfGyration: {
      iy: 10.6,
      iz: 3.30
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 240
  {
    id: 'UPN240',
    type: ProfileType.UPN,
    designation: 'UPN 240',
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
      Iyy: 5549,
      Izz: 520,
      It: 50.2,
      Iw: 184000
    },
    elasticModulus: {
      Wely: 463,
      Welz: 122
    },
    plasticModulus: {
      Wply: 511,
      Wplz: 184
    },
    radiusOfGyration: {
      iy: 11.5,
      iz: 3.51
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 260
  {
    id: 'UPN260',
    type: ProfileType.UPN,
    designation: 'UPN 260',
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
      Iyy: 7173,
      Izz: 664,
      It: 64.5,
      Iw: 264000
    },
    elasticModulus: {
      Wely: 552,
      Welz: 148
    },
    plasticModulus: {
      Wply: 608,
      Wplz: 222
    },
    radiusOfGyration: {
      iy: 12.2,
      iz: 3.71
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 280
  {
    id: 'UPN280',
    type: ProfileType.UPN,
    designation: 'UPN 280',
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
      Iyy: 9228,
      Izz: 813,
      It: 78.7,
      Iw: 366000
    },
    elasticModulus: {
      Wely: 659,
      Welz: 171
    },
    plasticModulus: {
      Wply: 724,
      Wplz: 257
    },
    radiusOfGyration: {
      iy: 13.2,
      iz: 3.91
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 300
  {
    id: 'UPN300',
    type: ProfileType.UPN,
    designation: 'UPN 300',
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
      Iyy: 11621,
      Izz: 1000,
      It: 98.2,
      Iw: 500000
    },
    elasticModulus: {
      Wely: 775,
      Welz: 200
    },
    plasticModulus: {
      Wply: 851,
      Wplz: 300
    },
    radiusOfGyration: {
      iy: 14.1,
      iz: 4.13
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 320
  {
    id: 'UPN320',
    type: ProfileType.UPN,
    designation: 'UPN 320',
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
      Iyy: 15160,
      Izz: 1194,
      It: 162,
      Iw: 695000
    },
    elasticModulus: {
      Wely: 948,
      Welz: 239
    },
    plasticModulus: {
      Wply: 1051,
      Wplz: 359
    },
    radiusOfGyration: {
      iy: 14.1,
      iz: 3.97
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 350
  {
    id: 'UPN350',
    type: ProfileType.UPN,
    designation: 'UPN 350',
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
      Iyy: 19060,
      Izz: 1194,
      It: 140,
      Iw: 863000
    },
    elasticModulus: {
      Wely: 1089,
      Welz: 239
    },
    plasticModulus: {
      Wply: 1217,
      Wplz: 359
    },
    radiusOfGyration: {
      iy: 15.7,
      iz: 3.93
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 380
  {
    id: 'UPN380',
    type: ProfileType.UPN,
    designation: 'UPN 380',
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
      Iyy: 23250,
      Izz: 1267,
      It: 147,
      Iw: 1060000
    },
    elasticModulus: {
      Wely: 1224,
      Welz: 248
    },
    plasticModulus: {
      Wply: 1369,
      Wplz: 373
    },
    radiusOfGyration: {
      iy: 17.0,
      iz: 3.97
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // UPN 400
  {
    id: 'UPN400',
    type: ProfileType.UPN,
    designation: 'UPN 400',
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
      Iyy: 29210,
      Izz: 1677,
      It: 195,
      Iw: 1440000
    },
    elasticModulus: {
      Wely: 1461,
      Welz: 305
    },
    plasticModulus: {
      Wply: 1633,
      Wplz: 459
    },
    radiusOfGyration: {
      iy: 17.9,
      iz: 4.28
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  }
];