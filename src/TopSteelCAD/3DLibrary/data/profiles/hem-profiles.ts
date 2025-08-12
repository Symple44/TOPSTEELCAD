import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Profilés HEM (renforcés) selon EN 10365
 * Gamme complète de HEM 100 à HEM 1000
 */
export const HEM_PROFILES: SteelProfile[] = [
  // HEM 100
  {
    id: 'HEM100',
    type: ProfileType.HEM,
    designation: 'HEM 100',
    dimensions: {
      height: 120,
      width: 106,
      webThickness: 12,
      flangeThickness: 20,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 42.0,
    area: 53.2,
    perimeter: 560,
    inertia: {
      Iyy: 1144,
      Izz: 334,
      It: 37.7,
      Iw: 13900
    },
    elasticModulus: {
      Wely: 191,
      Welz: 62.9
    },
    plasticModulus: {
      Wply: 222,
      Wplz: 97.0
    },
    radiusOfGyration: {
      iy: 4.63,
      iz: 2.51
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 120
  {
    id: 'HEM120',
    type: ProfileType.HEM,
    designation: 'HEM 120',
    dimensions: {
      height: 140,
      width: 126,
      webThickness: 12.5,
      flangeThickness: 21,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 51.2,
    area: 65.2,
    perimeter: 673,
    inertia: {
      Iyy: 1985,
      Izz: 644,
      It: 52.0,
      Iw: 34100
    },
    elasticModulus: {
      Wely: 284,
      Welz: 102
    },
    plasticModulus: {
      Wply: 326,
      Wplz: 157
    },
    radiusOfGyration: {
      iy: 5.51,
      iz: 3.14
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 140
  {
    id: 'HEM140',
    type: ProfileType.HEM,
    designation: 'HEM 140',
    dimensions: {
      height: 160,
      width: 146,
      webThickness: 13,
      flangeThickness: 22,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 63.2,
    area: 80.6,
    perimeter: 786,
    inertia: {
      Iyy: 3291,
      Izz: 1080,
      It: 71.9,
      Iw: 78400
    },
    elasticModulus: {
      Wely: 411,
      Welz: 148
    },
    plasticModulus: {
      Wply: 470,
      Wplz: 226
    },
    radiusOfGyration: {
      iy: 6.38,
      iz: 3.66
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 160
  {
    id: 'HEM160',
    type: ProfileType.HEM,
    designation: 'HEM 160',
    dimensions: {
      height: 180,
      width: 166,
      webThickness: 14,
      flangeThickness: 23,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 76.2,
    area: 97.1,
    perimeter: 899,
    inertia: {
      Iyy: 5135,
      Izz: 1673,
      It: 98.9,
      Iw: 160000
    },
    elasticModulus: {
      Wely: 571,
      Welz: 202
    },
    plasticModulus: {
      Wply: 652,
      Wplz: 306
    },
    radiusOfGyration: {
      iy: 7.27,
      iz: 4.15
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 180
  {
    id: 'HEM180',
    type: ProfileType.HEM,
    designation: 'HEM 180',
    dimensions: {
      height: 200,
      width: 186,
      webThickness: 14.5,
      flangeThickness: 24,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 89.5,
    area: 114,
    perimeter: 1012,
    inertia: {
      Iyy: 7483,
      Izz: 2563,
      It: 125,
      Iw: 291000
    },
    elasticModulus: {
      Wely: 748,
      Welz: 276
    },
    plasticModulus: {
      Wply: 856,
      Wplz: 417
    },
    radiusOfGyration: {
      iy: 8.10,
      iz: 4.74
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 200
  {
    id: 'HEM200',
    type: ProfileType.HEM,
    designation: 'HEM 200',
    dimensions: {
      height: 220,
      width: 206,
      webThickness: 15,
      flangeThickness: 25,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 103,
    area: 131,
    perimeter: 1125,
    inertia: {
      Iyy: 10640,
      Izz: 3763,
      It: 161,
      Iw: 518000
    },
    elasticModulus: {
      Wely: 967,
      Welz: 365
    },
    plasticModulus: {
      Wply: 1103,
      Wplz: 552
    },
    radiusOfGyration: {
      iy: 9.01,
      iz: 5.36
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 220
  {
    id: 'HEM220',
    type: ProfileType.HEM,
    designation: 'HEM 220',
    dimensions: {
      height: 240,
      width: 226,
      webThickness: 15.5,
      flangeThickness: 26,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 117,
    area: 149,
    perimeter: 1238,
    inertia: {
      Iyy: 14920,
      Izz: 5410,
      It: 202,
      Iw: 881000
    },
    elasticModulus: {
      Wely: 1243,
      Welz: 479
    },
    plasticModulus: {
      Wply: 1418,
      Wplz: 724
    },
    radiusOfGyration: {
      iy: 10.0,
      iz: 6.02
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 240
  {
    id: 'HEM240',
    type: ProfileType.HEM,
    designation: 'HEM 240',
    dimensions: {
      height: 270,
      width: 248,
      webThickness: 18,
      flangeThickness: 32,
      rootRadius: 21,
      toeRadius: 10.5
    },
    weight: 173,
    area: 220,
    perimeter: 1332,
    inertia: {
      Iyy: 24290,
      Izz: 7763,
      It: 381,
      Iw: 1890000
    },
    elasticModulus: {
      Wely: 1799,
      Welz: 626
    },
    plasticModulus: {
      Wply: 2061,
      Wplz: 958
    },
    radiusOfGyration: {
      iy: 10.5,
      iz: 5.94
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 260
  {
    id: 'HEM260',
    type: ProfileType.HEM,
    designation: 'HEM 260',
    dimensions: {
      height: 290,
      width: 268,
      webThickness: 18,
      flangeThickness: 32.5,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 189,
    area: 240,
    perimeter: 1452,
    inertia: {
      Iyy: 30670,
      Izz: 10450,
      It: 426,
      Iw: 2920000
    },
    elasticModulus: {
      Wely: 2115,
      Welz: 780
    },
    plasticModulus: {
      Wply: 2423,
      Wplz: 1194
    },
    radiusOfGyration: {
      iy: 11.3,
      iz: 6.60
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 280
  {
    id: 'HEM280',
    type: ProfileType.HEM,
    designation: 'HEM 280',
    dimensions: {
      height: 310,
      width: 288,
      webThickness: 18.5,
      flangeThickness: 33,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 204,
    area: 260,
    perimeter: 1572,
    inertia: {
      Iyy: 37540,
      Izz: 13670,
      It: 471,
      Iw: 4270000
    },
    elasticModulus: {
      Wely: 2422,
      Welz: 949
    },
    plasticModulus: {
      Wply: 2774,
      Wplz: 1452
    },
    radiusOfGyration: {
      iy: 12.0,
      iz: 7.25
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 300
  {
    id: 'HEM300',
    type: ProfileType.HEM,
    designation: 'HEM 300',
    dimensions: {
      height: 340,
      width: 310,
      webThickness: 21,
      flangeThickness: 39,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 303,
    area: 385,
    perimeter: 1676,
    inertia: {
      Iyy: 56690,
      Izz: 18260,
      It: 796,
      Iw: 7840000
    },
    elasticModulus: {
      Wely: 3335,
      Welz: 1178
    },
    plasticModulus: {
      Wply: 3830,
      Wplz: 1814
    },
    radiusOfGyration: {
      iy: 12.1,
      iz: 6.88
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 320
  {
    id: 'HEM320',
    type: ProfileType.HEM,
    designation: 'HEM 320',
    dimensions: {
      height: 359,
      width: 309,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 312,
    area: 397,
    perimeter: 1756,
    inertia: {
      Iyy: 66870,
      Izz: 18400,
      It: 841,
      Iw: 10000000
    },
    elasticModulus: {
      Wely: 3726,
      Welz: 1191
    },
    plasticModulus: {
      Wply: 4284,
      Wplz: 1834
    },
    radiusOfGyration: {
      iy: 13.0,
      iz: 6.81
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 340
  {
    id: 'HEM340',
    type: ProfileType.HEM,
    designation: 'HEM 340',
    dimensions: {
      height: 377,
      width: 309,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 317,
    area: 404,
    perimeter: 1836,
    inertia: {
      Iyy: 76370,
      Izz: 18400,
      It: 841,
      Iw: 11800000
    },
    elasticModulus: {
      Wely: 4054,
      Welz: 1191
    },
    plasticModulus: {
      Wply: 4668,
      Wplz: 1834
    },
    radiusOfGyration: {
      iy: 13.7,
      iz: 6.75
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 360
  {
    id: 'HEM360',
    type: ProfileType.HEM,
    designation: 'HEM 360',
    dimensions: {
      height: 395,
      width: 308,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 322,
    area: 410,
    perimeter: 1916,
    inertia: {
      Iyy: 86270,
      Izz: 18260,
      It: 841,
      Iw: 13800000
    },
    elasticModulus: {
      Wely: 4368,
      Welz: 1185
    },
    plasticModulus: {
      Wply: 5040,
      Wplz: 1827
    },
    radiusOfGyration: {
      iy: 14.5,
      iz: 6.67
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 400
  {
    id: 'HEM400',
    type: ProfileType.HEM,
    designation: 'HEM 400',
    dimensions: {
      height: 432,
      width: 307,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 333,
    area: 424,
    perimeter: 2076,
    inertia: {
      Iyy: 108100,
      Izz: 18040,
      It: 841,
      Iw: 18400000
    },
    elasticModulus: {
      Wely: 5005,
      Welz: 1175
    },
    plasticModulus: {
      Wply: 5785,
      Wplz: 1811
    },
    radiusOfGyration: {
      iy: 16.0,
      iz: 6.52
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 450
  {
    id: 'HEM450',
    type: ProfileType.HEM,
    designation: 'HEM 450',
    dimensions: {
      height: 478,
      width: 307,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 349,
    area: 444,
    perimeter: 2256,
    inertia: {
      Iyy: 144600,
      Izz: 18040,
      It: 841,
      Iw: 26200000
    },
    elasticModulus: {
      Wely: 6050,
      Welz: 1175
    },
    plasticModulus: {
      Wply: 7013,
      Wplz: 1811
    },
    radiusOfGyration: {
      iy: 18.1,
      iz: 6.37
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 500
  {
    id: 'HEM500',
    type: ProfileType.HEM,
    designation: 'HEM 500',
    dimensions: {
      height: 524,
      width: 306,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 365,
    area: 465,
    perimeter: 2436,
    inertia: {
      Iyy: 187700,
      Izz: 17820,
      It: 841,
      Iw: 36600000
    },
    elasticModulus: {
      Wely: 7164,
      Welz: 1164
    },
    plasticModulus: {
      Wply: 8318,
      Wplz: 1794
    },
    radiusOfGyration: {
      iy: 20.1,
      iz: 6.19
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 550
  {
    id: 'HEM550',
    type: ProfileType.HEM,
    designation: 'HEM 550',
    dimensions: {
      height: 572,
      width: 306,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 382,
    area: 487,
    perimeter: 2616,
    inertia: {
      Iyy: 238900,
      Izz: 17820,
      It: 841,
      Iw: 50200000
    },
    elasticModulus: {
      Wely: 8344,
      Welz: 1164
    },
    plasticModulus: {
      Wply: 9723,
      Wplz: 1794
    },
    radiusOfGyration: {
      iy: 22.2,
      iz: 6.05
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 600
  {
    id: 'HEM600',
    type: ProfileType.HEM,
    designation: 'HEM 600',
    dimensions: {
      height: 620,
      width: 305,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 399,
    area: 508,
    perimeter: 2796,
    inertia: {
      Iyy: 298800,
      Izz: 17600,
      It: 841,
      Iw: 67400000
    },
    elasticModulus: {
      Wely: 9639,
      Welz: 1154
    },
    plasticModulus: {
      Wply: 11260,
      Wplz: 1779
    },
    radiusOfGyration: {
      iy: 24.2,
      iz: 5.88
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 650
  {
    id: 'HEM650',
    type: ProfileType.HEM,
    designation: 'HEM 650',
    dimensions: {
      height: 668,
      width: 305,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 416,
    area: 530,
    perimeter: 2976,
    inertia: {
      Iyy: 367900,
      Izz: 17600,
      It: 841,
      Iw: 88400000
    },
    elasticModulus: {
      Wely: 11020,
      Welz: 1154
    },
    plasticModulus: {
      Wply: 12900,
      Wplz: 1779
    },
    radiusOfGyration: {
      iy: 26.3,
      iz: 5.76
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 700
  {
    id: 'HEM700',
    type: ProfileType.HEM,
    designation: 'HEM 700',
    dimensions: {
      height: 716,
      width: 304,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 432,
    area: 551,
    perimeter: 3156,
    inertia: {
      Iyy: 446800,
      Izz: 17380,
      It: 841,
      Iw: 113000000
    },
    elasticModulus: {
      Wely: 12480,
      Welz: 1143
    },
    plasticModulus: {
      Wply: 14650,
      Wplz: 1763
    },
    radiusOfGyration: {
      iy: 28.5,
      iz: 5.62
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 800
  {
    id: 'HEM800',
    type: ProfileType.HEM,
    designation: 'HEM 800',
    dimensions: {
      height: 814,
      width: 303,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 449,
    area: 572,
    perimeter: 3516,
    inertia: {
      Iyy: 626700,
      Izz: 17000,
      It: 841,
      Iw: 170000000
    },
    elasticModulus: {
      Wely: 15400,
      Welz: 1122
    },
    plasticModulus: {
      Wply: 18200,
      Wplz: 1732
    },
    radiusOfGyration: {
      iy: 33.1,
      iz: 5.45
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 900
  {
    id: 'HEM900',
    type: ProfileType.HEM,
    designation: 'HEM 900',
    dimensions: {
      height: 910,
      width: 302,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 466,
    area: 593,
    perimeter: 3876,
    inertia: {
      Iyy: 839100,
      Izz: 16610,
      It: 841,
      Iw: 248000000
    },
    elasticModulus: {
      Wely: 18450,
      Welz: 1100
    },
    plasticModulus: {
      Wply: 21880,
      Wplz: 1700
    },
    radiusOfGyration: {
      iy: 37.6,
      iz: 5.29
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEM 1000
  {
    id: 'HEM1000',
    type: ProfileType.HEM,
    designation: 'HEM 1000',
    dimensions: {
      height: 1008,
      width: 302,
      webThickness: 21,
      flangeThickness: 40,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 484,
    area: 616,
    perimeter: 4236,
    inertia: {
      Iyy: 1095000,
      Izz: 16610,
      It: 841,
      Iw: 351000000
    },
    elasticModulus: {
      Wely: 21720,
      Welz: 1100
    },
    plasticModulus: {
      Wply: 25870,
      Wplz: 1700
    },
    radiusOfGyration: {
      iy: 42.2,
      iz: 5.19
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  }
];