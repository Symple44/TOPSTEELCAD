import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Profilés HEA (légères) selon EN 10365
 * Gamme complète de HEA 100 à HEA 1000
 */
export const HEA_PROFILES: SteelProfile[] = [
  // HEA 100
  {
    id: 'HEA100',
    type: ProfileType.HEA,
    designation: 'HEA 100',
    dimensions: {
      height: 96,
      width: 100,
      webThickness: 5,
      flangeThickness: 8,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 16.7,
    area: 21.2,
    perimeter: 561,
    inertia: {
      Iyy: 349,
      Izz: 134,
      It: 5.24,
      Iw: 3490
    },
    elasticModulus: {
      Wely: 72.8,
      Welz: 26.8
    },
    plasticModulus: {
      Wply: 83.0,
      Wplz: 41.1
    },
    radiusOfGyration: {
      iy: 4.06,
      iz: 2.51
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 120
  {
    id: 'HEA120',
    type: ProfileType.HEA,
    designation: 'HEA 120',
    dimensions: {
      height: 114,
      width: 120,
      webThickness: 5,
      flangeThickness: 8,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 19.9,
    area: 25.3,
    perimeter: 677,
    inertia: {
      Iyy: 606,
      Izz: 231,
      It: 5.99,
      Iw: 8890
    },
    elasticModulus: {
      Wely: 106,
      Welz: 38.5
    },
    plasticModulus: {
      Wply: 120,
      Wplz: 58.9
    },
    radiusOfGyration: {
      iy: 4.89,
      iz: 3.02
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 140
  {
    id: 'HEA140',
    type: ProfileType.HEA,
    designation: 'HEA 140',
    dimensions: {
      height: 133,
      width: 140,
      webThickness: 5.5,
      flangeThickness: 8.5,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 24.7,
    area: 31.4,
    perimeter: 796,
    inertia: {
      Iyy: 1033,
      Izz: 389,
      It: 8.13,
      Iw: 20600
    },
    elasticModulus: {
      Wely: 155,
      Welz: 55.6
    },
    plasticModulus: {
      Wply: 173,
      Wplz: 84.9
    },
    radiusOfGyration: {
      iy: 5.73,
      iz: 3.52
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 160
  {
    id: 'HEA160',
    type: ProfileType.HEA,
    designation: 'HEA 160',
    dimensions: {
      height: 152,
      width: 160,
      webThickness: 6,
      flangeThickness: 9,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 30.4,
    area: 38.8,
    perimeter: 911,
    inertia: {
      Iyy: 1673,
      Izz: 616,
      It: 12.2,
      Iw: 45100
    },
    elasticModulus: {
      Wely: 220,
      Welz: 76.9
    },
    plasticModulus: {
      Wply: 245,
      Wplz: 118
    },
    radiusOfGyration: {
      iy: 6.57,
      iz: 3.98
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 180
  {
    id: 'HEA180',
    type: ProfileType.HEA,
    designation: 'HEA 180',
    dimensions: {
      height: 171,
      width: 180,
      webThickness: 6,
      flangeThickness: 9.5,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 35.5,
    area: 45.3,
    perimeter: 1030,
    inertia: {
      Iyy: 2510,
      Izz: 925,
      It: 14.8,
      Iw: 88700
    },
    elasticModulus: {
      Wely: 294,
      Welz: 103
    },
    plasticModulus: {
      Wply: 324,
      Wplz: 157
    },
    radiusOfGyration: {
      iy: 7.45,
      iz: 4.52
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 200
  {
    id: 'HEA200',
    type: ProfileType.HEA,
    designation: 'HEA 200',
    dimensions: {
      height: 190,
      width: 200,
      webThickness: 6.5,
      flangeThickness: 10,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 42.3,
    area: 53.8,
    perimeter: 1134,
    inertia: {
      Iyy: 3692,
      Izz: 1336,
      It: 20.1,
      Iw: 173000
    },
    elasticModulus: {
      Wely: 389,
      Welz: 134
    },
    plasticModulus: {
      Wply: 430,
      Wplz: 204
    },
    radiusOfGyration: {
      iy: 8.28,
      iz: 4.98
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 220
  {
    id: 'HEA220',
    type: ProfileType.HEA,
    designation: 'HEA 220',
    dimensions: {
      height: 210,
      width: 220,
      webThickness: 7,
      flangeThickness: 11,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 50.5,
    area: 64.3,
    perimeter: 1254,
    inertia: {
      Iyy: 5410,
      Izz: 1955,
      It: 28.3,
      Iw: 330000
    },
    elasticModulus: {
      Wely: 515,
      Welz: 178
    },
    plasticModulus: {
      Wply: 568,
      Wplz: 271
    },
    radiusOfGyration: {
      iy: 9.17,
      iz: 5.51
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 240
  {
    id: 'HEA240',
    type: ProfileType.HEA,
    designation: 'HEA 240',
    dimensions: {
      height: 230,
      width: 240,
      webThickness: 7.5,
      flangeThickness: 12,
      rootRadius: 21,
      toeRadius: 10.5
    },
    weight: 60.3,
    area: 76.8,
    perimeter: 1377,
    inertia: {
      Iyy: 7763,
      Izz: 2769,
      It: 41.5,
      Iw: 610000
    },
    elasticModulus: {
      Wely: 675,
      Welz: 231
    },
    plasticModulus: {
      Wply: 744,
      Wplz: 352
    },
    radiusOfGyration: {
      iy: 10.1,
      iz: 6.00
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 260
  {
    id: 'HEA260',
    type: ProfileType.HEA,
    designation: 'HEA 260',
    dimensions: {
      height: 250,
      width: 260,
      webThickness: 7.5,
      flangeThickness: 12.5,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 68.2,
    area: 86.8,
    perimeter: 1492,
    inertia: {
      Iyy: 10450,
      Izz: 3668,
      It: 52.3,
      Iw: 1040000
    },
    elasticModulus: {
      Wely: 836,
      Welz: 282
    },
    plasticModulus: {
      Wply: 920,
      Wplz: 430
    },
    radiusOfGyration: {
      iy: 11.0,
      iz: 6.50
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 280
  {
    id: 'HEA280',
    type: ProfileType.HEA,
    designation: 'HEA 280',
    dimensions: {
      height: 270,
      width: 280,
      webThickness: 8,
      flangeThickness: 13,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 76.4,
    area: 97.3,
    perimeter: 1610,
    inertia: {
      Iyy: 13670,
      Izz: 4763,
      It: 63.0,
      Iw: 1680000
    },
    elasticModulus: {
      Wely: 1013,
      Welz: 340
    },
    plasticModulus: {
      Wply: 1112,
      Wplz: 518
    },
    radiusOfGyration: {
      iy: 11.9,
      iz: 7.00
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 300
  {
    id: 'HEA300',
    type: ProfileType.HEA,
    designation: 'HEA 300',
    dimensions: {
      height: 290,
      width: 300,
      webThickness: 8.5,
      flangeThickness: 14,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 88.3,
    area: 112.5,
    perimeter: 1746,
    inertia: {
      Iyy: 18260,
      Izz: 6310,
      It: 85.2,
      Iw: 2800000
    },
    elasticModulus: {
      Wely: 1260,
      Welz: 421
    },
    plasticModulus: {
      Wply: 1383,
      Wplz: 641
    },
    radiusOfGyration: {
      iy: 12.7,
      iz: 7.49
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 320
  {
    id: 'HEA320',
    type: ProfileType.HEA,
    designation: 'HEA 320',
    dimensions: {
      height: 310,
      width: 300,
      webThickness: 9,
      flangeThickness: 15.5,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 97.6,
    area: 124.4,
    perimeter: 1826,
    inertia: {
      Iyy: 22930,
      Izz: 6985,
      It: 108,
      Iw: 3820000
    },
    elasticModulus: {
      Wely: 1479,
      Welz: 466
    },
    plasticModulus: {
      Wply: 1628,
      Wplz: 709
    },
    radiusOfGyration: {
      iy: 13.6,
      iz: 7.49
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 340
  {
    id: 'HEA340',
    type: ProfileType.HEA,
    designation: 'HEA 340',
    dimensions: {
      height: 330,
      width: 300,
      webThickness: 9.5,
      flangeThickness: 16.5,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 105,
    area: 133.5,
    perimeter: 1906,
    inertia: {
      Iyy: 27690,
      Izz: 7436,
      It: 127,
      Iw: 4900000
    },
    elasticModulus: {
      Wely: 1678,
      Welz: 496
    },
    plasticModulus: {
      Wply: 1850,
      Wplz: 755
    },
    radiusOfGyration: {
      iy: 14.4,
      iz: 7.46
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 360
  {
    id: 'HEA360',
    type: ProfileType.HEA,
    designation: 'HEA 360',
    dimensions: {
      height: 350,
      width: 300,
      webThickness: 10,
      flangeThickness: 17.5,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 112,
    area: 142.8,
    perimeter: 1986,
    inertia: {
      Iyy: 33090,
      Izz: 7887,
      It: 150,
      Iw: 6190000
    },
    elasticModulus: {
      Wely: 1891,
      Welz: 526
    },
    plasticModulus: {
      Wply: 2088,
      Wplz: 801
    },
    radiusOfGyration: {
      iy: 15.2,
      iz: 7.43
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 400
  {
    id: 'HEA400',
    type: ProfileType.HEA,
    designation: 'HEA 400',
    dimensions: {
      height: 390,
      width: 300,
      webThickness: 11,
      flangeThickness: 19,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 125,
    area: 159,
    perimeter: 2146,
    inertia: {
      Iyy: 45070,
      Izz: 8563,
      It: 190,
      Iw: 9470000
    },
    elasticModulus: {
      Wely: 2311,
      Welz: 571
    },
    plasticModulus: {
      Wply: 2562,
      Wplz: 872
    },
    radiusOfGyration: {
      iy: 16.8,
      iz: 7.34
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 450
  {
    id: 'HEA450',
    type: ProfileType.HEA,
    designation: 'HEA 450',
    dimensions: {
      height: 440,
      width: 300,
      webThickness: 11.5,
      flangeThickness: 21,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 140,
    area: 178,
    perimeter: 2346,
    inertia: {
      Iyy: 63720,
      Izz: 9465,
      It: 243,
      Iw: 15100000
    },
    elasticModulus: {
      Wely: 2896,
      Welz: 631
    },
    plasticModulus: {
      Wply: 3216,
      Wplz: 965
    },
    radiusOfGyration: {
      iy: 18.9,
      iz: 7.29
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 500
  {
    id: 'HEA500',
    type: ProfileType.HEA,
    designation: 'HEA 500',
    dimensions: {
      height: 490,
      width: 300,
      webThickness: 12,
      flangeThickness: 23,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 155,
    area: 197.5,
    perimeter: 2546,
    inertia: {
      Iyy: 86970,
      Izz: 10370,
      It: 299,
      Iw: 23100000
    },
    elasticModulus: {
      Wely: 3550,
      Welz: 691
    },
    plasticModulus: {
      Wply: 3949,
      Wplz: 1060
    },
    radiusOfGyration: {
      iy: 21.0,
      iz: 7.24
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 550
  {
    id: 'HEA550',
    type: ProfileType.HEA,
    designation: 'HEA 550',
    dimensions: {
      height: 540,
      width: 300,
      webThickness: 12.5,
      flangeThickness: 24,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 166,
    area: 211.8,
    perimeter: 2716,
    inertia: {
      Iyy: 111900,
      Izz: 10820,
      It: 348,
      Iw: 32200000
    },
    elasticModulus: {
      Wely: 4146,
      Welz: 721
    },
    plasticModulus: {
      Wply: 4622,
      Wplz: 1110
    },
    radiusOfGyration: {
      iy: 23.0,
      iz: 7.15
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 600
  {
    id: 'HEA600',
    type: ProfileType.HEA,
    designation: 'HEA 600',
    dimensions: {
      height: 590,
      width: 300,
      webThickness: 13,
      flangeThickness: 25,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 178,
    area: 226,
    perimeter: 2886,
    inertia: {
      Iyy: 141200,
      Izz: 11270,
      It: 395,
      Iw: 43900000
    },
    elasticModulus: {
      Wely: 4787,
      Welz: 751
    },
    plasticModulus: {
      Wply: 5350,
      Wplz: 1160
    },
    radiusOfGyration: {
      iy: 25.0,
      iz: 7.05
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 650
  {
    id: 'HEA650',
    type: ProfileType.HEA,
    designation: 'HEA 650',
    dimensions: {
      height: 640,
      width: 300,
      webThickness: 13.5,
      flangeThickness: 26,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 190,
    area: 241.6,
    perimeter: 3056,
    inertia: {
      Iyy: 175200,
      Izz: 11720,
      It: 448,
      Iw: 58400000
    },
    elasticModulus: {
      Wely: 5474,
      Welz: 781
    },
    plasticModulus: {
      Wply: 6136,
      Wplz: 1210
    },
    radiusOfGyration: {
      iy: 26.9,
      iz: 6.97
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 700
  {
    id: 'HEA700',
    type: ProfileType.HEA,
    designation: 'HEA 700',
    dimensions: {
      height: 690,
      width: 300,
      webThickness: 14.5,
      flangeThickness: 27,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 204,
    area: 260.5,
    perimeter: 3226,
    inertia: {
      Iyy: 215300,
      Izz: 12180,
      It: 514,
      Iw: 76700000
    },
    elasticModulus: {
      Wely: 6241,
      Welz: 812
    },
    plasticModulus: {
      Wply: 7033,
      Wplz: 1260
    },
    radiusOfGyration: {
      iy: 28.7,
      iz: 6.84
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 800
  {
    id: 'HEA800',
    type: ProfileType.HEA,
    designation: 'HEA 800',
    dimensions: {
      height: 790,
      width: 300,
      webThickness: 15,
      flangeThickness: 28,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 224,
    area: 285.8,
    perimeter: 3546,
    inertia: {
      Iyy: 303400,
      Izz: 12640,
      It: 598,
      Iw: 123000000
    },
    elasticModulus: {
      Wely: 7682,
      Welz: 843
    },
    plasticModulus: {
      Wply: 8695,
      Wplz: 1310
    },
    radiusOfGyration: {
      iy: 32.6,
      iz: 6.65
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 900
  {
    id: 'HEA900',
    type: ProfileType.HEA,
    designation: 'HEA 900',
    dimensions: {
      height: 890,
      width: 300,
      webThickness: 16,
      flangeThickness: 30,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 252,
    area: 320.5,
    perimeter: 3906,
    inertia: {
      Iyy: 422100,
      Izz: 13550,
      It: 756,
      Iw: 188000000
    },
    elasticModulus: {
      Wely: 9485,
      Welz: 903
    },
    plasticModulus: {
      Wply: 10810,
      Wplz: 1410
    },
    radiusOfGyration: {
      iy: 36.3,
      iz: 6.50
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEA 1000
  {
    id: 'HEA1000',
    type: ProfileType.HEA,
    designation: 'HEA 1000',
    dimensions: {
      height: 990,
      width: 300,
      webThickness: 16.5,
      flangeThickness: 31,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 272,
    area: 346.8,
    perimeter: 4266,
    inertia: {
      Iyy: 553800,
      Izz: 14000,
      It: 851,
      Iw: 278000000
    },
    elasticModulus: {
      Wely: 11190,
      Welz: 933
    },
    plasticModulus: {
      Wply: 12840,
      Wplz: 1460
    },
    radiusOfGyration: {
      iy: 40.0,
      iz: 6.35
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  }
];