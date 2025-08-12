/**
 * Profilés HP selon AISC
 * Profilés pieux en acier (Bearing pile profiles)
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const HP_PROFILES: SteelProfile[] = [
  // Série HP8
  {
    id: 'HP8x36',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 8x36',
    dimensions: {
      height: 203,
      width: 203,
      webThickness: 9.4,
      flangeThickness: 9.4,
      rootRadius: 11
    },
    weight: 53.6,
    area: 68.3,
    perimeter: 812,
    inertia: {
      Iyy: 1190,
      Izz: 1190,
      It: 19.4,
      Iw: 0
    },
    elasticModulus: {
      Wely: 117,
      Welz: 117
    },
    radiusOfGyration: {
      iy: 4.17,
      iz: 4.17
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série HP10
  {
    id: 'HP10x42',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 10x42',
    dimensions: {
      height: 254,
      width: 254,
      webThickness: 9.9,
      flangeThickness: 9.9,
      rootRadius: 14
    },
    weight: 62.5,
    area: 79.6,
    perimeter: 1016,
    inertia: {
      Iyy: 2140,
      Izz: 2140,
      It: 35.6,
      Iw: 0
    },
    elasticModulus: {
      Wely: 168,
      Welz: 168
    },
    radiusOfGyration: {
      iy: 5.18,
      iz: 5.18
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP10x57',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 10x57',
    dimensions: {
      height: 254,
      width: 279,
      webThickness: 11.2,
      flangeThickness: 11.2,
      rootRadius: 14
    },
    weight: 84.8,
    area: 108,
    perimeter: 1066,
    inertia: {
      Iyy: 2460,
      Izz: 2980,
      It: 45.2,
      Iw: 0
    },
    elasticModulus: {
      Wely: 194,
      Welz: 214
    },
    radiusOfGyration: {
      iy: 4.77,
      iz: 5.26
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série HP12
  {
    id: 'HP12x53',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 12x53',
    dimensions: {
      height: 305,
      width: 305,
      webThickness: 11.2,
      flangeThickness: 11.2,
      rootRadius: 16
    },
    weight: 78.8,
    area: 100,
    perimeter: 1220,
    inertia: {
      Iyy: 3940,
      Izz: 3940,
      It: 71.8,
      Iw: 0
    },
    elasticModulus: {
      Wely: 258,
      Welz: 258
    },
    radiusOfGyration: {
      iy: 6.27,
      iz: 6.27
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP12x63',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 12x63',
    dimensions: {
      height: 305,
      width: 305,
      webThickness: 13.1,
      flangeThickness: 13.1,
      rootRadius: 16
    },
    weight: 93.7,
    area: 119,
    perimeter: 1220,
    inertia: {
      Iyy: 4530,
      Izz: 4530,
      It: 98.4,
      Iw: 0
    },
    elasticModulus: {
      Wely: 297,
      Welz: 297
    },
    radiusOfGyration: {
      iy: 6.17,
      iz: 6.17
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP12x74',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 12x74',
    dimensions: {
      height: 305,
      width: 308,
      webThickness: 15.1,
      flangeThickness: 15.1,
      rootRadius: 16
    },
    weight: 110,
    area: 140,
    perimeter: 1226,
    inertia: {
      Iyy: 5200,
      Izz: 5280,
      It: 137,
      Iw: 0
    },
    elasticModulus: {
      Wely: 341,
      Welz: 343
    },
    radiusOfGyration: {
      iy: 6.10,
      iz: 6.14
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série HP14
  {
    id: 'HP14x73',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 14x73',
    dimensions: {
      height: 356,
      width: 356,
      webThickness: 12.7,
      flangeThickness: 12.7,
      rootRadius: 19
    },
    weight: 108,
    area: 138,
    perimeter: 1424,
    inertia: {
      Iyy: 7290,
      Izz: 7290,
      It: 148,
      Iw: 0
    },
    elasticModulus: {
      Wely: 409,
      Welz: 409
    },
    radiusOfGyration: {
      iy: 7.26,
      iz: 7.26
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP14x89',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 14x89',
    dimensions: {
      height: 356,
      width: 358,
      webThickness: 15.2,
      flangeThickness: 15.2,
      rootRadius: 19
    },
    weight: 132,
    area: 168,
    perimeter: 1428,
    inertia: {
      Iyy: 8540,
      Izz: 8650,
      It: 218,
      Iw: 0
    },
    elasticModulus: {
      Wely: 479,
      Welz: 483
    },
    radiusOfGyration: {
      iy: 7.13,
      iz: 7.17
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP14x102',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 14x102',
    dimensions: {
      height: 356,
      width: 360,
      webThickness: 17.3,
      flangeThickness: 17.3,
      rootRadius: 19
    },
    weight: 152,
    area: 194,
    perimeter: 1432,
    inertia: {
      Iyy: 9630,
      Izz: 9790,
      It: 288,
      Iw: 0
    },
    elasticModulus: {
      Wely: 541,
      Welz: 544
    },
    radiusOfGyration: {
      iy: 7.04,
      iz: 7.10
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },

  // Série HP16
  {
    id: 'HP16x88',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 16x88',
    dimensions: {
      height: 406,
      width: 406,
      webThickness: 13.1,
      flangeThickness: 13.1,
      rootRadius: 22
    },
    weight: 131,
    area: 167,
    perimeter: 1624,
    inertia: {
      Iyy: 12100,
      Izz: 12100,
      It: 242,
      Iw: 0
    },
    elasticModulus: {
      Wely: 596,
      Welz: 596
    },
    radiusOfGyration: {
      iy: 8.51,
      iz: 8.51
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP16x101',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 16x101',
    dimensions: {
      height: 406,
      width: 408,
      webThickness: 14.9,
      flangeThickness: 14.9,
      rootRadius: 22
    },
    weight: 150,
    area: 191,
    perimeter: 1628,
    inertia: {
      Iyy: 13600,
      Izz: 13800,
      It: 312,
      Iw: 0
    },
    elasticModulus: {
      Wely: 670,
      Welz: 676
    },
    radiusOfGyration: {
      iy: 8.44,
      iz: 8.51
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  },
  {
    id: 'HP16x141',
    type: ProfileType.HP_SHAPE,
    designation: 'HP 16x141',
    dimensions: {
      height: 406,
      width: 412,
      webThickness: 19.6,
      flangeThickness: 19.6,
      rootRadius: 22
    },
    weight: 210,
    area: 268,
    perimeter: 1636,
    inertia: {
      Iyy: 17300,
      Izz: 17800,
      It: 557,
      Iw: 0
    },
    elasticModulus: {
      Wely: 852,
      Welz: 864
    },
    radiusOfGyration: {
      iy: 8.04,
      iz: 8.14
    },
    source: 'AISC 360',
    category: 'Laminé à chaud'
  }
];

export default HP_PROFILES;