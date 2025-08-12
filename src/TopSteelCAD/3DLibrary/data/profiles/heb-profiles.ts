import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Profilés HEB (normales) selon EN 10365
 * Gamme complète de HEB 100 à HEB 1000
 */
export const HEB_PROFILES: SteelProfile[] = [
  // HEB 100
  {
    id: 'HEB100',
    type: ProfileType.HEB,
    designation: 'HEB 100',
    dimensions: {
      height: 100,
      width: 100,
      webThickness: 6,
      flangeThickness: 10,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 20.4,
    area: 26.0,
    perimeter: 567,
    inertia: {
      Iyy: 450,
      Izz: 167,
      It: 9.04,
      Iw: 4490
    },
    elasticModulus: {
      Wely: 89.9,
      Welz: 33.5
    },
    plasticModulus: {
      Wply: 104,
      Wplz: 51.4
    },
    radiusOfGyration: {
      iy: 4.16,
      iz: 2.53
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 120
  {
    id: 'HEB120',
    type: ProfileType.HEB,
    designation: 'HEB 120',
    dimensions: {
      height: 120,
      width: 120,
      webThickness: 6.5,
      flangeThickness: 11,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 26.7,
    area: 34.0,
    perimeter: 686,
    inertia: {
      Iyy: 864,
      Izz: 317,
      It: 13.8,
      Iw: 11900
    },
    elasticModulus: {
      Wely: 144,
      Welz: 52.9
    },
    plasticModulus: {
      Wply: 165,
      Wplz: 81.3
    },
    radiusOfGyration: {
      iy: 5.04,
      iz: 3.06
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 140
  {
    id: 'HEB140',
    type: ProfileType.HEB,
    designation: 'HEB 140',
    dimensions: {
      height: 140,
      width: 140,
      webThickness: 7,
      flangeThickness: 12,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 33.7,
    area: 42.9,
    perimeter: 804,
    inertia: {
      Iyy: 1509,
      Izz: 550,
      It: 20.1,
      Iw: 28200
    },
    elasticModulus: {
      Wely: 216,
      Welz: 78.5
    },
    plasticModulus: {
      Wply: 245,
      Wplz: 120
    },
    radiusOfGyration: {
      iy: 5.93,
      iz: 3.58
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 160
  {
    id: 'HEB160',
    type: ProfileType.HEB,
    designation: 'HEB 160',
    dimensions: {
      height: 160,
      width: 160,
      webThickness: 8,
      flangeThickness: 13,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 42.6,
    area: 54.3,
    perimeter: 920,
    inertia: {
      Iyy: 2492,
      Izz: 889,
      It: 31.2,
      Iw: 65000
    },
    elasticModulus: {
      Wely: 311,
      Welz: 111
    },
    plasticModulus: {
      Wply: 354,
      Wplz: 170
    },
    radiusOfGyration: {
      iy: 6.78,
      iz: 4.05
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 180
  {
    id: 'HEB180',
    type: ProfileType.HEB,
    designation: 'HEB 180',
    dimensions: {
      height: 180,
      width: 180,
      webThickness: 8.5,
      flangeThickness: 14,
      rootRadius: 15,
      toeRadius: 7.5
    },
    weight: 51.2,
    area: 65.3,
    perimeter: 1040,
    inertia: {
      Iyy: 3831,
      Izz: 1363,
      It: 42.2,
      Iw: 130900
    },
    elasticModulus: {
      Wely: 426,
      Welz: 151
    },
    plasticModulus: {
      Wply: 481,
      Wplz: 231
    },
    radiusOfGyration: {
      iy: 7.66,
      iz: 4.57
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 200
  {
    id: 'HEB200',
    type: ProfileType.HEB,
    designation: 'HEB 200',
    dimensions: {
      height: 200,
      width: 200,
      webThickness: 9,
      flangeThickness: 15,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 61.3,
    area: 78.1,
    perimeter: 1150,
    inertia: {
      Iyy: 5696,
      Izz: 2003,
      It: 59.3,
      Iw: 257000
    },
    elasticModulus: {
      Wely: 570,
      Welz: 200
    },
    plasticModulus: {
      Wply: 642,
      Wplz: 306
    },
    radiusOfGyration: {
      iy: 8.54,
      iz: 5.07
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 220
  {
    id: 'HEB220',
    type: ProfileType.HEB,
    designation: 'HEB 220',
    dimensions: {
      height: 220,
      width: 220,
      webThickness: 9.5,
      flangeThickness: 16,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 71.5,
    area: 91.0,
    perimeter: 1270,
    inertia: {
      Iyy: 8091,
      Izz: 2843,
      It: 76.6,
      Iw: 476000
    },
    elasticModulus: {
      Wely: 736,
      Welz: 258
    },
    plasticModulus: {
      Wply: 827,
      Wplz: 395
    },
    radiusOfGyration: {
      iy: 9.43,
      iz: 5.59
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 240
  {
    id: 'HEB240',
    type: ProfileType.HEB,
    designation: 'HEB 240',
    dimensions: {
      height: 240,
      width: 240,
      webThickness: 10,
      flangeThickness: 17,
      rootRadius: 21,
      toeRadius: 10.5
    },
    weight: 83.2,
    area: 106,
    perimeter: 1380,
    inertia: {
      Iyy: 11260,
      Izz: 3923,
      It: 103,
      Iw: 839000
    },
    elasticModulus: {
      Wely: 938,
      Welz: 327
    },
    plasticModulus: {
      Wply: 1053,
      Wplz: 500
    },
    radiusOfGyration: {
      iy: 10.3,
      iz: 6.08
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 260
  {
    id: 'HEB260',
    type: ProfileType.HEB,
    designation: 'HEB 260',
    dimensions: {
      height: 260,
      width: 260,
      webThickness: 10,
      flangeThickness: 17.5,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 93.0,
    area: 118,
    perimeter: 1500,
    inertia: {
      Iyy: 14920,
      Izz: 5135,
      It: 124,
      Iw: 1380000
    },
    elasticModulus: {
      Wely: 1148,
      Welz: 395
    },
    plasticModulus: {
      Wply: 1283,
      Wplz: 603
    },
    radiusOfGyration: {
      iy: 11.2,
      iz: 6.58
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 280
  {
    id: 'HEB280',
    type: ProfileType.HEB,
    designation: 'HEB 280',
    dimensions: {
      height: 280,
      width: 280,
      webThickness: 10.5,
      flangeThickness: 18,
      rootRadius: 24,
      toeRadius: 12
    },
    weight: 103,
    area: 131,
    perimeter: 1620,
    inertia: {
      Iyy: 19270,
      Izz: 6595,
      It: 144,
      Iw: 2190000
    },
    elasticModulus: {
      Wely: 1376,
      Welz: 471
    },
    plasticModulus: {
      Wply: 1534,
      Wplz: 718
    },
    radiusOfGyration: {
      iy: 12.1,
      iz: 7.09
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 300
  {
    id: 'HEB300',
    type: ProfileType.HEB,
    designation: 'HEB 300',
    dimensions: {
      height: 300,
      width: 300,
      webThickness: 11,
      flangeThickness: 19,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 117,
    area: 149,
    perimeter: 1746,
    inertia: {
      Iyy: 25170,
      Izz: 8563,
      It: 185,
      Iw: 3668000
    },
    elasticModulus: {
      Wely: 1678,
      Welz: 571
    },
    plasticModulus: {
      Wply: 1869,
      Wplz: 870
    },
    radiusOfGyration: {
      iy: 13.0,
      iz: 7.58
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 320
  {
    id: 'HEB320',
    type: ProfileType.HEB,
    designation: 'HEB 320',
    dimensions: {
      height: 320,
      width: 300,
      webThickness: 11.5,
      flangeThickness: 20.5,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 127,
    area: 161,
    perimeter: 1830,
    inertia: {
      Iyy: 30820,
      Izz: 9239,
      It: 225,
      Iw: 4860000
    },
    elasticModulus: {
      Wely: 1926,
      Welz: 616
    },
    plasticModulus: {
      Wply: 2149,
      Wplz: 939
    },
    radiusOfGyration: {
      iy: 13.8,
      iz: 7.57
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 340
  {
    id: 'HEB340',
    type: ProfileType.HEB,
    designation: 'HEB 340',
    dimensions: {
      height: 340,
      width: 300,
      webThickness: 12,
      flangeThickness: 21.5,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 134,
    area: 171,
    perimeter: 1910,
    inertia: {
      Iyy: 36660,
      Izz: 9690,
      It: 257,
      Iw: 6150000
    },
    elasticModulus: {
      Wely: 2156,
      Welz: 646
    },
    plasticModulus: {
      Wply: 2408,
      Wplz: 985
    },
    radiusOfGyration: {
      iy: 14.6,
      iz: 7.53
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 360
  {
    id: 'HEB360',
    type: ProfileType.HEB,
    designation: 'HEB 360',
    dimensions: {
      height: 360,
      width: 300,
      webThickness: 12.5,
      flangeThickness: 22.5,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 142,
    area: 181,
    perimeter: 1990,
    inertia: {
      Iyy: 43190,
      Izz: 10140,
      It: 290,
      Iw: 7690000
    },
    elasticModulus: {
      Wely: 2400,
      Welz: 676
    },
    plasticModulus: {
      Wply: 2683,
      Wplz: 1032
    },
    radiusOfGyration: {
      iy: 15.5,
      iz: 7.49
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 400
  {
    id: 'HEB400',
    type: ProfileType.HEB,
    designation: 'HEB 400',
    dimensions: {
      height: 400,
      width: 300,
      webThickness: 13.5,
      flangeThickness: 24,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 155,
    area: 198,
    perimeter: 2150,
    inertia: {
      Iyy: 57680,
      Izz: 10820,
      It: 356,
      Iw: 11640000
    },
    elasticModulus: {
      Wely: 2884,
      Welz: 721
    },
    plasticModulus: {
      Wply: 3232,
      Wplz: 1104
    },
    radiusOfGyration: {
      iy: 17.1,
      iz: 7.40
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 450
  {
    id: 'HEB450',
    type: ProfileType.HEB,
    designation: 'HEB 450',
    dimensions: {
      height: 450,
      width: 300,
      webThickness: 14,
      flangeThickness: 26,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 171,
    area: 218,
    perimeter: 2350,
    inertia: {
      Iyy: 79890,
      Izz: 11720,
      It: 440,
      Iw: 18530000
    },
    elasticModulus: {
      Wely: 3551,
      Welz: 781
    },
    plasticModulus: {
      Wply: 3982,
      Wplz: 1198
    },
    radiusOfGyration: {
      iy: 19.1,
      iz: 7.33
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 500
  {
    id: 'HEB500',
    type: ProfileType.HEB,
    designation: 'HEB 500',
    dimensions: {
      height: 500,
      width: 300,
      webThickness: 14.5,
      flangeThickness: 28,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 187,
    area: 238,
    perimeter: 2550,
    inertia: {
      Iyy: 107200,
      Izz: 12620,
      It: 528,
      Iw: 28360000
    },
    elasticModulus: {
      Wely: 4287,
      Welz: 842
    },
    plasticModulus: {
      Wply: 4815,
      Wplz: 1292
    },
    radiusOfGyration: {
      iy: 21.2,
      iz: 7.27
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 550
  {
    id: 'HEB550',
    type: ProfileType.HEB,
    designation: 'HEB 550',
    dimensions: {
      height: 550,
      width: 300,
      webThickness: 15,
      flangeThickness: 29,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 199,
    area: 254,
    perimeter: 2720,
    inertia: {
      Iyy: 136700,
      Izz: 13080,
      It: 596,
      Iw: 39380000
    },
    elasticModulus: {
      Wely: 4971,
      Welz: 872
    },
    plasticModulus: {
      Wply: 5591,
      Wplz: 1340
    },
    radiusOfGyration: {
      iy: 23.2,
      iz: 7.17
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 600
  {
    id: 'HEB600',
    type: ProfileType.HEB,
    designation: 'HEB 600',
    dimensions: {
      height: 600,
      width: 300,
      webThickness: 15.5,
      flangeThickness: 30,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 212,
    area: 270,
    perimeter: 2890,
    inertia: {
      Iyy: 171000,
      Izz: 13530,
      It: 667,
      Iw: 53330000
    },
    elasticModulus: {
      Wely: 5701,
      Welz: 902
    },
    plasticModulus: {
      Wply: 6425,
      Wplz: 1389
    },
    radiusOfGyration: {
      iy: 25.2,
      iz: 7.08
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 650
  {
    id: 'HEB650',
    type: ProfileType.HEB,
    designation: 'HEB 650',
    dimensions: {
      height: 650,
      width: 300,
      webThickness: 16,
      flangeThickness: 31,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 225,
    area: 286,
    perimeter: 3060,
    inertia: {
      Iyy: 210600,
      Izz: 13980,
      It: 747,
      Iw: 70850000
    },
    elasticModulus: {
      Wely: 6480,
      Welz: 932
    },
    plasticModulus: {
      Wply: 7320,
      Wplz: 1440
    },
    radiusOfGyration: {
      iy: 27.1,
      iz: 6.99
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 700
  {
    id: 'HEB700',
    type: ProfileType.HEB,
    designation: 'HEB 700',
    dimensions: {
      height: 700,
      width: 300,
      webThickness: 17,
      flangeThickness: 32,
      rootRadius: 27,
      toeRadius: 13.5
    },
    weight: 241,
    area: 306,
    perimeter: 3230,
    inertia: {
      Iyy: 256900,
      Izz: 14440,
      It: 857,
      Iw: 92750000
    },
    elasticModulus: {
      Wely: 7340,
      Welz: 963
    },
    plasticModulus: {
      Wply: 8327,
      Wplz: 1490
    },
    radiusOfGyration: {
      iy: 28.9,
      iz: 6.87
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 800
  {
    id: 'HEB800',
    type: ProfileType.HEB,
    designation: 'HEB 800',
    dimensions: {
      height: 800,
      width: 300,
      webThickness: 17.5,
      flangeThickness: 33,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 262,
    area: 334,
    perimeter: 3550,
    inertia: {
      Iyy: 359100,
      Izz: 14900,
      It: 1013,
      Iw: 146700000
    },
    elasticModulus: {
      Wely: 8977,
      Welz: 993
    },
    plasticModulus: {
      Wply: 10230,
      Wplz: 1540
    },
    radiusOfGyration: {
      iy: 32.8,
      iz: 6.68
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 900
  {
    id: 'HEB900',
    type: ProfileType.HEB,
    designation: 'HEB 900',
    dimensions: {
      height: 900,
      width: 300,
      webThickness: 18.5,
      flangeThickness: 35,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 291,
    area: 371,
    perimeter: 3910,
    inertia: {
      Iyy: 494100,
      Izz: 15820,
      It: 1254,
      Iw: 222900000
    },
    elasticModulus: {
      Wely: 10980,
      Welz: 1055
    },
    plasticModulus: {
      Wply: 12580,
      Wplz: 1640
    },
    radiusOfGyration: {
      iy: 36.5,
      iz: 6.53
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  },

  // HEB 1000
  {
    id: 'HEB1000',
    type: ProfileType.HEB,
    designation: 'HEB 1000',
    dimensions: {
      height: 1000,
      width: 300,
      webThickness: 19,
      flangeThickness: 36,
      rootRadius: 30,
      toeRadius: 15
    },
    weight: 314,
    area: 400,
    perimeter: 4270,
    inertia: {
      Iyy: 644700,
      Izz: 16280,
      It: 1395,
      Iw: 327100000
    },
    elasticModulus: {
      Wely: 12890,
      Welz: 1085
    },
    plasticModulus: {
      Wply: 14860,
      Wplz: 1690
    },
    radiusOfGyration: {
      iy: 40.1,
      iz: 6.38
    },
    source: 'EN 10365',
    category: 'HOT_ROLLED'
  }
];