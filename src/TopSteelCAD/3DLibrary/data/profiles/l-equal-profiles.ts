import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Cornières à ailes égales selon EN 10056-1
 * Gamme complète de L20x20 à L200x200
 */
export const L_EQUAL_PROFILES: SteelProfile[] = [
  // L 20 x 20 x 3
  {
    id: 'L20X20X3',
    type: ProfileType.L,
    designation: 'L 20×20×3',
    dimensions: {
      height: 20,
      width: 20,
      webThickness: 3,
      flangeThickness: 3,
      rootRadius: 3.5,
      toeRadius: 1.75
    },
    weight: 0.885,
    area: 1.13,
    perimeter: 77,
    inertia: {
      Iyy: 0.396,
      Izz: 0.396,
      It: 0.60,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.280,
      Welz: 0.280
    },
    plasticModulus: {
      Wply: 0.45,
      Wplz: 0.45
    },
    radiusOfGyration: {
      iy: 0.59,
      iz: 0.59
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 25 x 25 x 3
  {
    id: 'L25X25X3',
    type: ProfileType.L,
    designation: 'L 25×25×3',
    dimensions: {
      height: 25,
      width: 25,
      webThickness: 3,
      flangeThickness: 3,
      rootRadius: 3.5,
      toeRadius: 1.75
    },
    weight: 1.12,
    area: 1.43,
    perimeter: 97,
    inertia: {
      Iyy: 0.797,
      Izz: 0.797,
      It: 0.76,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.452,
      Welz: 0.452
    },
    plasticModulus: {
      Wply: 0.69,
      Wplz: 0.69
    },
    radiusOfGyration: {
      iy: 0.75,
      iz: 0.75
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 25 x 25 x 4
  {
    id: 'L25X25X4',
    type: ProfileType.L,
    designation: 'L 25×25×4',
    dimensions: {
      height: 25,
      width: 25,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 3.5,
      toeRadius: 1.75
    },
    weight: 1.45,
    area: 1.85,
    perimeter: 94,
    inertia: {
      Iyy: 0.984,
      Izz: 0.984,
      It: 1.02,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.561,
      Welz: 0.561
    },
    plasticModulus: {
      Wply: 0.85,
      Wplz: 0.85
    },
    radiusOfGyration: {
      iy: 0.73,
      iz: 0.73
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 30 x 30 x 3
  {
    id: 'L30X30X3',
    type: ProfileType.L,
    designation: 'L 30×30×3',
    dimensions: {
      height: 30,
      width: 30,
      webThickness: 3,
      flangeThickness: 3,
      rootRadius: 5,
      toeRadius: 2.5
    },
    weight: 1.36,
    area: 1.74,
    perimeter: 117,
    inertia: {
      Iyy: 1.39,
      Izz: 1.39,
      It: 0.92,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.660,
      Welz: 0.660
    },
    plasticModulus: {
      Wply: 0.98,
      Wplz: 0.98
    },
    radiusOfGyration: {
      iy: 0.89,
      iz: 0.89
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 30 x 30 x 4
  {
    id: 'L30X30X4',
    type: ProfileType.L,
    designation: 'L 30×30×4',
    dimensions: {
      height: 30,
      width: 30,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 5,
      toeRadius: 2.5
    },
    weight: 1.78,
    area: 2.27,
    perimeter: 114,
    inertia: {
      Iyy: 1.74,
      Izz: 1.74,
      It: 1.23,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.829,
      Welz: 0.829
    },
    plasticModulus: {
      Wply: 1.22,
      Wplz: 1.22
    },
    radiusOfGyration: {
      iy: 0.88,
      iz: 0.88
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 35 x 35 x 4
  {
    id: 'L35X35X4',
    type: ProfileType.L,
    designation: 'L 35×35×4',
    dimensions: {
      height: 35,
      width: 35,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 5,
      toeRadius: 2.5
    },
    weight: 2.09,
    area: 2.67,
    perimeter: 134,
    inertia: {
      Iyy: 2.55,
      Izz: 2.55,
      It: 1.42,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.04,
      Welz: 1.04
    },
    plasticModulus: {
      Wply: 1.51,
      Wplz: 1.51
    },
    radiusOfGyration: {
      iy: 0.98,
      iz: 0.98
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 40 x 40 x 4
  {
    id: 'L40X40X4',
    type: ProfileType.L,
    designation: 'L 40×40×4',
    dimensions: {
      height: 40,
      width: 40,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 6,
      toeRadius: 3
    },
    weight: 2.42,
    area: 3.08,
    perimeter: 154,
    inertia: {
      Iyy: 3.55,
      Izz: 3.55,
      It: 1.65,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.27,
      Welz: 1.27
    },
    plasticModulus: {
      Wply: 1.82,
      Wplz: 1.82
    },
    radiusOfGyration: {
      iy: 1.07,
      iz: 1.07
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 40 x 40 x 5
  {
    id: 'L40X40X5',
    type: ProfileType.L,
    designation: 'L 40×40×5',
    dimensions: {
      height: 40,
      width: 40,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 6,
      toeRadius: 3
    },
    weight: 2.97,
    area: 3.79,
    perimeter: 150,
    inertia: {
      Iyy: 4.28,
      Izz: 4.28,
      It: 2.10,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.54,
      Welz: 1.54
    },
    plasticModulus: {
      Wply: 2.19,
      Wplz: 2.19
    },
    radiusOfGyration: {
      iy: 1.06,
      iz: 1.06
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 45 x 45 x 4.5
  {
    id: 'L45X45X4_5',
    type: ProfileType.L,
    designation: 'L 45×45×4.5',
    dimensions: {
      height: 45,
      width: 45,
      webThickness: 4.5,
      flangeThickness: 4.5,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 3.06,
    area: 3.90,
    perimeter: 177,
    inertia: {
      Iyy: 5.13,
      Izz: 5.13,
      It: 2.06,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.63,
      Welz: 1.63
    },
    plasticModulus: {
      Wply: 2.29,
      Wplz: 2.29
    },
    radiusOfGyration: {
      iy: 1.15,
      iz: 1.15
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 50 x 50 x 5
  {
    id: 'L50X50X5',
    type: ProfileType.L,
    designation: 'L 50×50×5',
    dimensions: {
      height: 50,
      width: 50,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 3.77,
    area: 4.80,
    perimeter: 190,
    inertia: {
      Iyy: 7.11,
      Izz: 7.11,
      It: 2.56,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.03,
      Welz: 2.03
    },
    plasticModulus: {
      Wply: 2.84,
      Wplz: 2.84
    },
    radiusOfGyration: {
      iy: 1.22,
      iz: 1.22
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 50 x 50 x 6
  {
    id: 'L50X50X6',
    type: ProfileType.L,
    designation: 'L 50×50×6',
    dimensions: {
      height: 50,
      width: 50,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 4.47,
    area: 5.69,
    perimeter: 188,
    inertia: {
      Iyy: 8.33,
      Izz: 8.33,
      It: 3.16,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.38,
      Welz: 2.38
    },
    plasticModulus: {
      Wply: 3.32,
      Wplz: 3.32
    },
    radiusOfGyration: {
      iy: 1.21,
      iz: 1.21
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 60 x 60 x 5
  {
    id: 'L60X60X5',
    type: ProfileType.L,
    designation: 'L 60×60×5',
    dimensions: {
      height: 60,
      width: 60,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 4.57,
    area: 5.82,
    perimeter: 230,
    inertia: {
      Iyy: 12.8,
      Izz: 12.8,
      It: 3.10,
      Iw: 0
    },
    elasticModulus: {
      Wely: 3.05,
      Welz: 3.05
    },
    plasticModulus: {
      Wply: 4.21,
      Wplz: 4.21
    },
    radiusOfGyration: {
      iy: 1.48,
      iz: 1.48
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 60 x 60 x 6
  {
    id: 'L60X60X6',
    type: ProfileType.L,
    designation: 'L 60×60×6',
    dimensions: {
      height: 60,
      width: 60,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 5.42,
    area: 6.91,
    perimeter: 228,
    inertia: {
      Iyy: 15.0,
      Izz: 15.0,
      It: 3.83,
      Iw: 0
    },
    elasticModulus: {
      Wely: 3.58,
      Welz: 3.58
    },
    plasticModulus: {
      Wply: 4.93,
      Wplz: 4.93
    },
    radiusOfGyration: {
      iy: 1.47,
      iz: 1.47
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 60 x 60 x 8
  {
    id: 'L60X60X8',
    type: ProfileType.L,
    designation: 'L 60×60×8',
    dimensions: {
      height: 60,
      width: 60,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 7.09,
    area: 9.03,
    perimeter: 224,
    inertia: {
      Iyy: 19.0,
      Izz: 19.0,
      It: 5.34,
      Iw: 0
    },
    elasticModulus: {
      Wely: 4.54,
      Welz: 4.54
    },
    plasticModulus: {
      Wply: 6.19,
      Wplz: 6.19
    },
    radiusOfGyration: {
      iy: 1.45,
      iz: 1.45
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 70 x 70 x 6
  {
    id: 'L70X70X6',
    type: ProfileType.L,
    designation: 'L 70×70×6',
    dimensions: {
      height: 70,
      width: 70,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 6.38,
    area: 8.13,
    perimeter: 268,
    inertia: {
      Iyy: 22.8,
      Izz: 22.8,
      It: 4.50,
      Iw: 0
    },
    elasticModulus: {
      Wely: 4.64,
      Welz: 4.64
    },
    plasticModulus: {
      Wply: 6.32,
      Wplz: 6.32
    },
    radiusOfGyration: {
      iy: 1.68,
      iz: 1.68
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 70 x 70 x 7
  {
    id: 'L70X70X7',
    type: ProfileType.L,
    designation: 'L 70×70×7',
    dimensions: {
      height: 70,
      width: 70,
      webThickness: 7,
      flangeThickness: 7,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 7.38,
    area: 9.40,
    perimeter: 266,
    inertia: {
      Iyy: 26.2,
      Izz: 26.2,
      It: 5.34,
      Iw: 0
    },
    elasticModulus: {
      Wely: 5.34,
      Welz: 5.34
    },
    plasticModulus: {
      Wply: 7.24,
      Wplz: 7.24
    },
    radiusOfGyration: {
      iy: 1.67,
      iz: 1.67
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 80 x 6
  {
    id: 'L80X80X6',
    type: ProfileType.L,
    designation: 'L 80×80×6',
    dimensions: {
      height: 80,
      width: 80,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 7.34,
    area: 9.35,
    perimeter: 308,
    inertia: {
      Iyy: 35.5,
      Izz: 35.5,
      It: 5.18,
      Iw: 0
    },
    elasticModulus: {
      Wely: 6.34,
      Welz: 6.34
    },
    plasticModulus: {
      Wply: 8.56,
      Wplz: 8.56
    },
    radiusOfGyration: {
      iy: 1.95,
      iz: 1.95
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 80 x 8
  {
    id: 'L80X80X8',
    type: ProfileType.L,
    designation: 'L 80×80×8',
    dimensions: {
      height: 80,
      width: 80,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 9.63,
    area: 12.3,
    perimeter: 304,
    inertia: {
      Iyy: 45.9,
      Izz: 45.9,
      It: 7.21,
      Iw: 0
    },
    elasticModulus: {
      Wely: 8.20,
      Welz: 8.20
    },
    plasticModulus: {
      Wply: 11.0,
      Wplz: 11.0
    },
    radiusOfGyration: {
      iy: 1.93,
      iz: 1.93
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 80 x 10
  {
    id: 'L80X80X10',
    type: ProfileType.L,
    designation: 'L 80×80×10',
    dimensions: {
      height: 80,
      width: 80,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 11.9,
    area: 15.1,
    perimeter: 300,
    inertia: {
      Iyy: 55.9,
      Izz: 55.9,
      It: 9.31,
      Iw: 0
    },
    elasticModulus: {
      Wely: 10.0,
      Welz: 10.0
    },
    plasticModulus: {
      Wply: 13.3,
      Wplz: 13.3
    },
    radiusOfGyration: {
      iy: 1.92,
      iz: 1.92
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 90 x 90 x 7
  {
    id: 'L90X90X7',
    type: ProfileType.L,
    designation: 'L 90×90×7',
    dimensions: {
      height: 90,
      width: 90,
      webThickness: 7,
      flangeThickness: 7,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 9.61,
    area: 12.2,
    perimeter: 346,
    inertia: {
      Iyy: 55.8,
      Izz: 55.8,
      It: 6.82,
      Iw: 0
    },
    elasticModulus: {
      Wely: 8.85,
      Welz: 8.85
    },
    plasticModulus: {
      Wply: 11.8,
      Wplz: 11.8
    },
    radiusOfGyration: {
      iy: 2.14,
      iz: 2.14
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 90 x 90 x 8
  {
    id: 'L90X90X8',
    type: ProfileType.L,
    designation: 'L 90×90×8',
    dimensions: {
      height: 90,
      width: 90,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 10.9,
    area: 13.9,
    perimeter: 344,
    inertia: {
      Iyy: 63.4,
      Izz: 63.4,
      It: 7.89,
      Iw: 0
    },
    elasticModulus: {
      Wely: 10.1,
      Welz: 10.1
    },
    plasticModulus: {
      Wply: 13.4,
      Wplz: 13.4
    },
    radiusOfGyration: {
      iy: 2.13,
      iz: 2.13
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 90 x 90 x 9
  {
    id: 'L90X90X9',
    type: ProfileType.L,
    designation: 'L 90×90×9',
    dimensions: {
      height: 90,
      width: 90,
      webThickness: 9,
      flangeThickness: 9,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 12.2,
    area: 15.6,
    perimeter: 342,
    inertia: {
      Iyy: 70.6,
      Izz: 70.6,
      It: 8.98,
      Iw: 0
    },
    elasticModulus: {
      Wely: 11.3,
      Welz: 11.3
    },
    plasticModulus: {
      Wply: 14.9,
      Wplz: 14.9
    },
    radiusOfGyration: {
      iy: 2.13,
      iz: 2.13
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 90 x 90 x 10
  {
    id: 'L90X90X10',
    type: ProfileType.L,
    designation: 'L 90×90×10',
    dimensions: {
      height: 90,
      width: 90,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 13.4,
    area: 17.1,
    perimeter: 340,
    inertia: {
      Iyy: 77.7,
      Izz: 77.7,
      It: 10.1,
      Iw: 0
    },
    elasticModulus: {
      Wely: 12.4,
      Welz: 12.4
    },
    plasticModulus: {
      Wply: 16.4,
      Wplz: 16.4
    },
    radiusOfGyration: {
      iy: 2.13,
      iz: 2.13
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 100 x 8
  {
    id: 'L100X100X8',
    type: ProfileType.L,
    designation: 'L 100×100×8',
    dimensions: {
      height: 100,
      width: 100,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 12.2,
    area: 15.5,
    perimeter: 384,
    inertia: {
      Iyy: 89.0,
      Izz: 89.0,
      It: 8.68,
      Iw: 0
    },
    elasticModulus: {
      Wely: 12.7,
      Welz: 12.7
    },
    plasticModulus: {
      Wply: 16.7,
      Wplz: 16.7
    },
    radiusOfGyration: {
      iy: 2.39,
      iz: 2.39
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 100 x 10
  {
    id: 'L100X100X10',
    type: ProfileType.L,
    designation: 'L 100×100×10',
    dimensions: {
      height: 100,
      width: 100,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 15.0,
    area: 19.2,
    perimeter: 380,
    inertia: {
      Iyy: 109,
      Izz: 109,
      It: 11.1,
      Iw: 0
    },
    elasticModulus: {
      Wely: 15.5,
      Welz: 15.5
    },
    plasticModulus: {
      Wply: 20.4,
      Wplz: 20.4
    },
    radiusOfGyration: {
      iy: 2.38,
      iz: 2.38
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 100 x 12
  {
    id: 'L100X100X12',
    type: ProfileType.L,
    designation: 'L 100×100×12',
    dimensions: {
      height: 100,
      width: 100,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 17.8,
    area: 22.7,
    perimeter: 376,
    inertia: {
      Iyy: 127,
      Izz: 127,
      It: 13.8,
      Iw: 0
    },
    elasticModulus: {
      Wely: 18.1,
      Welz: 18.1
    },
    plasticModulus: {
      Wply: 23.7,
      Wplz: 23.7
    },
    radiusOfGyration: {
      iy: 2.37,
      iz: 2.37
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 120 x 120 x 8
  {
    id: 'L120X120X8',
    type: ProfileType.L,
    designation: 'L 120×120×8',
    dimensions: {
      height: 120,
      width: 120,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 14.7,
    area: 18.8,
    perimeter: 464,
    inertia: {
      Iyy: 165,
      Izz: 165,
      It: 10.5,
      Iw: 0
    },
    elasticModulus: {
      Wely: 19.6,
      Welz: 19.6
    },
    plasticModulus: {
      Wply: 25.6,
      Wplz: 25.6
    },
    radiusOfGyration: {
      iy: 2.96,
      iz: 2.96
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 120 x 120 x 10
  {
    id: 'L120X120X10',
    type: ProfileType.L,
    designation: 'L 120×120×10',
    dimensions: {
      height: 120,
      width: 120,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 18.2,
    area: 23.2,
    perimeter: 460,
    inertia: {
      Iyy: 202,
      Izz: 202,
      It: 13.4,
      Iw: 0
    },
    elasticModulus: {
      Wely: 24.0,
      Welz: 24.0
    },
    plasticModulus: {
      Wply: 31.3,
      Wplz: 31.3
    },
    radiusOfGyration: {
      iy: 2.95,
      iz: 2.95
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 120 x 120 x 12
  {
    id: 'L120X120X12',
    type: ProfileType.L,
    designation: 'L 120×120×12',
    dimensions: {
      height: 120,
      width: 120,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 21.6,
    area: 27.5,
    perimeter: 456,
    inertia: {
      Iyy: 236,
      Izz: 236,
      It: 16.7,
      Iw: 0
    },
    elasticModulus: {
      Wely: 28.1,
      Welz: 28.1
    },
    plasticModulus: {
      Wply: 36.5,
      Wplz: 36.5
    },
    radiusOfGyration: {
      iy: 2.93,
      iz: 2.93
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 130 x 130 x 12
  {
    id: 'L130X130X12',
    type: ProfileType.L,
    designation: 'L 130×130×12',
    dimensions: {
      height: 130,
      width: 130,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 23.6,
    area: 30.0,
    perimeter: 496,
    inertia: {
      Iyy: 309,
      Izz: 309,
      It: 18.1,
      Iw: 0
    },
    elasticModulus: {
      Wely: 34.0,
      Welz: 34.0
    },
    plasticModulus: {
      Wply: 44.1,
      Wplz: 44.1
    },
    radiusOfGyration: {
      iy: 3.21,
      iz: 3.21
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 150 x 10
  {
    id: 'L150X150X10',
    type: ProfileType.L,
    designation: 'L 150×150×10',
    dimensions: {
      height: 150,
      width: 150,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 22.9,
    area: 29.2,
    perimeter: 580,
    inertia: {
      Iyy: 392,
      Izz: 392,
      It: 16.5,
      Iw: 0
    },
    elasticModulus: {
      Wely: 37.3,
      Welz: 37.3
    },
    plasticModulus: {
      Wply: 48.3,
      Wplz: 48.3
    },
    radiusOfGyration: {
      iy: 3.67,
      iz: 3.67
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 150 x 12
  {
    id: 'L150X150X12',
    type: ProfileType.L,
    designation: 'L 150×150×12',
    dimensions: {
      height: 150,
      width: 150,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 27.3,
    area: 34.8,
    perimeter: 576,
    inertia: {
      Iyy: 463,
      Izz: 463,
      It: 20.5,
      Iw: 0
    },
    elasticModulus: {
      Wely: 44.1,
      Welz: 44.1
    },
    plasticModulus: {
      Wply: 56.9,
      Wplz: 56.9
    },
    radiusOfGyration: {
      iy: 3.65,
      iz: 3.65
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 150 x 15
  {
    id: 'L150X150X15',
    type: ProfileType.L,
    designation: 'L 150×150×15',
    dimensions: {
      height: 150,
      width: 150,
      webThickness: 15,
      flangeThickness: 15,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 33.8,
    area: 43.0,
    perimeter: 570,
    inertia: {
      Iyy: 562,
      Izz: 562,
      It: 26.4,
      Iw: 0
    },
    elasticModulus: {
      Wely: 53.5,
      Welz: 53.5
    },
    plasticModulus: {
      Wply: 68.6,
      Wplz: 68.6
    },
    radiusOfGyration: {
      iy: 3.61,
      iz: 3.61
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 200 x 200 x 16
  {
    id: 'L200X200X16',
    type: ProfileType.L,
    designation: 'L 200×200×16',
    dimensions: {
      height: 200,
      width: 200,
      webThickness: 16,
      flangeThickness: 16,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 48.5,
    area: 61.9,
    perimeter: 768,
    inertia: {
      Iyy: 1187,
      Izz: 1187,
      It: 37.5,
      Iw: 0
    },
    elasticModulus: {
      Wely: 84.7,
      Welz: 84.7
    },
    plasticModulus: {
      Wply: 108,
      Wplz: 108
    },
    radiusOfGyration: {
      iy: 4.38,
      iz: 4.38
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 200 x 200 x 18
  {
    id: 'L200X200X18',
    type: ProfileType.L,
    designation: 'L 200×200×18',
    dimensions: {
      height: 200,
      width: 200,
      webThickness: 18,
      flangeThickness: 18,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 54.2,
    area: 69.1,
    perimeter: 764,
    inertia: {
      Iyy: 1311,
      Izz: 1311,
      It: 43.2,
      Iw: 0
    },
    elasticModulus: {
      Wely: 93.6,
      Welz: 93.6
    },
    plasticModulus: {
      Wply: 119,
      Wplz: 119
    },
    radiusOfGyration: {
      iy: 4.35,
      iz: 4.35
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 200 x 200 x 20
  {
    id: 'L200X200X20',
    type: ProfileType.L,
    designation: 'L 200×200×20',
    dimensions: {
      height: 200,
      width: 200,
      webThickness: 20,
      flangeThickness: 20,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 59.9,
    area: 76.3,
    perimeter: 760,
    inertia: {
      Iyy: 1433,
      Izz: 1433,
      It: 49.3,
      Iw: 0
    },
    elasticModulus: {
      Wely: 102,
      Welz: 102
    },
    plasticModulus: {
      Wply: 130,
      Wplz: 130
    },
    radiusOfGyration: {
      iy: 4.33,
      iz: 4.33
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  }
];