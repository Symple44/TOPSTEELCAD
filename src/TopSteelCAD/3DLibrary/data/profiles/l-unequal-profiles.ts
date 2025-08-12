import { SteelProfile, ProfileType } from '../../types/profile.types';

/**
 * Cornières à ailes inégales selon EN 10056-1
 * Gamme complète de L30x20 à L200x100
 */
export const L_UNEQUAL_PROFILES: SteelProfile[] = [
  // L 30 x 20 x 3
  {
    id: 'L30X20X3',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 30×20×3',
    dimensions: {
      height: 30,
      width: 20,
      webThickness: 3,
      flangeThickness: 3,
      rootRadius: 5,
      toeRadius: 2.5
    },
    weight: 1.12,
    area: 1.43,
    perimeter: 97,
    inertia: {
      Iyy: 1.17,
      Izz: 0.569,
      It: 0.76,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.557,
      Welz: 0.427
    },
    plasticModulus: {
      Wply: 0.82,
      Wplz: 0.64
    },
    radiusOfGyration: {
      iy: 0.90,
      iz: 0.63
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 40 x 25 x 4
  {
    id: 'L40X25X4',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 40×25×4',
    dimensions: {
      height: 40,
      width: 25,
      webThickness: 4,
      flangeThickness: 4,
      rootRadius: 6,
      toeRadius: 3
    },
    weight: 1.93,
    area: 2.46,
    perimeter: 123,
    inertia: {
      Iyy: 2.42,
      Izz: 1.14,
      It: 1.30,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.863,
      Welz: 0.684
    },
    plasticModulus: {
      Wply: 1.25,
      Wplz: 1.02
    },
    radiusOfGyration: {
      iy: 0.99,
      iz: 0.68
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 45 x 30 x 4.5
  {
    id: 'L45X30X4_5',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 45×30×4.5',
    dimensions: {
      height: 45,
      width: 30,
      webThickness: 4.5,
      flangeThickness: 4.5,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 2.56,
    area: 3.26,
    perimeter: 143,
    inertia: {
      Iyy: 3.79,
      Izz: 2.09,
      It: 1.73,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.20,
      Welz: 1.05
    },
    plasticModulus: {
      Wply: 1.72,
      Wplz: 1.56
    },
    radiusOfGyration: {
      iy: 1.08,
      iz: 0.80
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 50 x 30 x 5
  {
    id: 'L50X30X5',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 50×30×5',
    dimensions: {
      height: 50,
      width: 30,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 7,
      toeRadius: 3.5
    },
    weight: 3.06,
    area: 3.90,
    perimeter: 150,
    inertia: {
      Iyy: 5.43,
      Izz: 2.59,
      It: 2.08,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.55,
      Welz: 1.30
    },
    plasticModulus: {
      Wply: 2.21,
      Wplz: 1.93
    },
    radiusOfGyration: {
      iy: 1.18,
      iz: 0.81
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 60 x 30 x 5
  {
    id: 'L60X30X5',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 60×30×5',
    dimensions: {
      height: 60,
      width: 30,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 3.38,
    area: 4.31,
    perimeter: 170,
    inertia: {
      Iyy: 8.49,
      Izz: 2.59,
      It: 2.30,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.02,
      Welz: 1.30
    },
    plasticModulus: {
      Wply: 2.86,
      Wplz: 1.93
    },
    radiusOfGyration: {
      iy: 1.40,
      iz: 0.78
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 60 x 40 x 5
  {
    id: 'L60X40X5',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 60×40×5',
    dimensions: {
      height: 60,
      width: 40,
      webThickness: 5,
      flangeThickness: 5,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 3.77,
    area: 4.80,
    perimeter: 190,
    inertia: {
      Iyy: 8.49,
      Izz: 4.47,
      It: 2.56,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.02,
      Welz: 1.68
    },
    plasticModulus: {
      Wply: 2.86,
      Wplz: 2.50
    },
    radiusOfGyration: {
      iy: 1.33,
      iz: 0.96
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 60 x 40 x 6
  {
    id: 'L60X40X6',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 60×40×6',
    dimensions: {
      height: 60,
      width: 40,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 8,
      toeRadius: 4
    },
    weight: 4.47,
    area: 5.69,
    perimeter: 188,
    inertia: {
      Iyy: 9.98,
      Izz: 5.24,
      It: 3.16,
      Iw: 0
    },
    elasticModulus: {
      Wely: 2.37,
      Welz: 1.97
    },
    plasticModulus: {
      Wply: 3.35,
      Wplz: 2.93
    },
    radiusOfGyration: {
      iy: 1.32,
      iz: 0.96
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 70 x 45 x 6
  {
    id: 'L70X45X6',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 70×45×6',
    dimensions: {
      height: 70,
      width: 45,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 5.25,
    area: 6.69,
    perimeter: 218,
    inertia: {
      Iyy: 16.2,
      Izz: 7.84,
      It: 3.71,
      Iw: 0
    },
    elasticModulus: {
      Wely: 3.30,
      Welz: 2.62
    },
    plasticModulus: {
      Wply: 4.65,
      Wplz: 3.90
    },
    radiusOfGyration: {
      iy: 1.56,
      iz: 1.08
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 75 x 50 x 6
  {
    id: 'L75X50X6',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 75×50×6',
    dimensions: {
      height: 75,
      width: 50,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 5.74,
    area: 7.31,
    perimeter: 238,
    inertia: {
      Iyy: 21.3,
      Izz: 10.8,
      It: 4.05,
      Iw: 0
    },
    elasticModulus: {
      Wely: 4.05,
      Welz: 3.24
    },
    plasticModulus: {
      Wply: 5.70,
      Wplz: 4.82
    },
    radiusOfGyration: {
      iy: 1.71,
      iz: 1.22
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 75 x 50 x 8
  {
    id: 'L75X50X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 75×50×8',
    dimensions: {
      height: 75,
      width: 50,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 9,
      toeRadius: 4.5
    },
    weight: 7.39,
    area: 9.41,
    perimeter: 234,
    inertia: {
      Iyy: 26.6,
      Izz: 13.4,
      It: 5.64,
      Iw: 0
    },
    elasticModulus: {
      Wely: 5.06,
      Welz: 4.02
    },
    plasticModulus: {
      Wply: 7.10,
      Wplz: 5.98
    },
    radiusOfGyration: {
      iy: 1.68,
      iz: 1.19
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 40 x 6
  {
    id: 'L80X40X6',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 80×40×6',
    dimensions: {
      height: 80,
      width: 40,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 5.42,
    area: 6.91,
    perimeter: 228,
    inertia: {
      Iyy: 22.5,
      Izz: 5.24,
      It: 3.83,
      Iw: 0
    },
    elasticModulus: {
      Wely: 4.01,
      Welz: 1.97
    },
    plasticModulus: {
      Wply: 5.65,
      Wplz: 2.93
    },
    radiusOfGyration: {
      iy: 1.80,
      iz: 0.87
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 40 x 8
  {
    id: 'L80X40X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 80×40×8',
    dimensions: {
      height: 80,
      width: 40,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 7.09,
    area: 9.03,
    perimeter: 224,
    inertia: {
      Iyy: 28.7,
      Izz: 6.59,
      It: 5.34,
      Iw: 0
    },
    elasticModulus: {
      Wely: 5.13,
      Welz: 2.47
    },
    plasticModulus: {
      Wply: 7.22,
      Wplz: 3.68
    },
    radiusOfGyration: {
      iy: 1.78,
      iz: 0.85
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 60 x 7
  {
    id: 'L80X60X7',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 80×60×7',
    dimensions: {
      height: 80,
      width: 60,
      webThickness: 7,
      flangeThickness: 7,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 7.38,
    area: 9.40,
    perimeter: 266,
    inertia: {
      Iyy: 30.8,
      Izz: 18.5,
      It: 5.34,
      Iw: 0
    },
    elasticModulus: {
      Wely: 5.49,
      Welz: 4.62
    },
    plasticModulus: {
      Wply: 7.74,
      Wplz: 6.88
    },
    radiusOfGyration: {
      iy: 1.81,
      iz: 1.40
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 80 x 60 x 8
  {
    id: 'L80X60X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 80×60×8',
    dimensions: {
      height: 80,
      width: 60,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 10,
      toeRadius: 5
    },
    weight: 8.34,
    area: 10.6,
    perimeter: 264,
    inertia: {
      Iyy: 34.7,
      Izz: 20.9,
      It: 6.21,
      Iw: 0
    },
    elasticModulus: {
      Wely: 6.19,
      Welz: 5.23
    },
    plasticModulus: {
      Wply: 8.73,
      Wplz: 7.80
    },
    radiusOfGyration: {
      iy: 1.81,
      iz: 1.40
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 90 x 60 x 7
  {
    id: 'L90X60X7',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 90×60×7',
    dimensions: {
      height: 90,
      width: 60,
      webThickness: 7,
      flangeThickness: 7,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 8.00,
    area: 10.2,
    perimeter: 286,
    inertia: {
      Iyy: 43.9,
      Izz: 18.5,
      It: 5.81,
      Iw: 0
    },
    elasticModulus: {
      Wely: 6.97,
      Welz: 4.62
    },
    plasticModulus: {
      Wply: 9.82,
      Wplz: 6.88
    },
    radiusOfGyration: {
      iy: 2.08,
      iz: 1.35
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 90 x 60 x 8
  {
    id: 'L90X60X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 90×60×8',
    dimensions: {
      height: 90,
      width: 60,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 11,
      toeRadius: 5.5
    },
    weight: 9.05,
    area: 11.5,
    perimeter: 284,
    inertia: {
      Iyy: 49.6,
      Izz: 20.9,
      It: 6.77,
      Iw: 0
    },
    elasticModulus: {
      Wely: 7.87,
      Welz: 5.23
    },
    plasticModulus: {
      Wply: 11.1,
      Wplz: 7.80
    },
    radiusOfGyration: {
      iy: 2.08,
      iz: 1.35
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 50 x 6
  {
    id: 'L100X50X6',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×50×6',
    dimensions: {
      height: 100,
      width: 50,
      webThickness: 6,
      flangeThickness: 6,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 6.85,
    area: 8.73,
    perimeter: 288,
    inertia: {
      Iyy: 44.3,
      Izz: 10.8,
      It: 4.84,
      Iw: 0
    },
    elasticModulus: {
      Wely: 6.32,
      Welz: 3.24
    },
    plasticModulus: {
      Wply: 8.90,
      Wplz: 4.82
    },
    radiusOfGyration: {
      iy: 2.25,
      iz: 1.11
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 50 x 8
  {
    id: 'L100X50X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×50×8',
    dimensions: {
      height: 100,
      width: 50,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 8.97,
    area: 11.4,
    perimeter: 284,
    inertia: {
      Iyy: 56.6,
      Izz: 13.4,
      It: 6.75,
      Iw: 0
    },
    elasticModulus: {
      Wely: 8.08,
      Welz: 4.02
    },
    plasticModulus: {
      Wply: 11.4,
      Wplz: 5.98
    },
    radiusOfGyration: {
      iy: 2.23,
      iz: 1.08
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 50 x 10
  {
    id: 'L100X50X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×50×10',
    dimensions: {
      height: 100,
      width: 50,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 11.0,
    area: 14.0,
    perimeter: 280,
    inertia: {
      Iyy: 68.3,
      Izz: 15.9,
      It: 8.72,
      Iw: 0
    },
    elasticModulus: {
      Wely: 9.75,
      Welz: 4.77
    },
    plasticModulus: {
      Wply: 13.7,
      Wplz: 7.10
    },
    radiusOfGyration: {
      iy: 2.21,
      iz: 1.07
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 65 x 7
  {
    id: 'L100X65X7',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×65×7',
    dimensions: {
      height: 100,
      width: 65,
      webThickness: 7,
      flangeThickness: 7,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 8.77,
    area: 11.2,
    perimeter: 318,
    inertia: {
      Iyy: 44.3,
      Izz: 22.5,
      It: 6.40,
      Iw: 0
    },
    elasticModulus: {
      Wely: 6.32,
      Welz: 5.19
    },
    plasticModulus: {
      Wply: 8.90,
      Wplz: 7.74
    },
    radiusOfGyration: {
      iy: 1.99,
      iz: 1.42
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 65 x 8
  {
    id: 'L100X65X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×65×8',
    dimensions: {
      height: 100,
      width: 65,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 9.94,
    area: 12.7,
    perimeter: 316,
    inertia: {
      Iyy: 50.1,
      Izz: 25.4,
      It: 7.45,
      Iw: 0
    },
    elasticModulus: {
      Wely: 7.15,
      Welz: 5.86
    },
    plasticModulus: {
      Wply: 10.1,
      Wplz: 8.75
    },
    radiusOfGyration: {
      iy: 1.98,
      iz: 1.41
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 65 x 10
  {
    id: 'L100X65X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×65×10',
    dimensions: {
      height: 100,
      width: 65,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 12.2,
    area: 15.5,
    perimeter: 312,
    inertia: {
      Iyy: 60.4,
      Izz: 30.4,
      It: 9.63,
      Iw: 0
    },
    elasticModulus: {
      Wely: 8.62,
      Welz: 7.01
    },
    plasticModulus: {
      Wply: 12.1,
      Wplz: 10.5
    },
    radiusOfGyration: {
      iy: 1.97,
      iz: 1.40
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 75 x 8
  {
    id: 'L100X75X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×75×8',
    dimensions: {
      height: 100,
      width: 75,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 10.6,
    area: 13.5,
    perimeter: 334,
    inertia: {
      Iyy: 50.1,
      Izz: 33.7,
      It: 7.93,
      Iw: 0
    },
    elasticModulus: {
      Wely: 7.15,
      Welz: 6.74
    },
    plasticModulus: {
      Wply: 10.1,
      Wplz: 10.0
    },
    radiusOfGyration: {
      iy: 1.93,
      iz: 1.58
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 100 x 75 x 10
  {
    id: 'L100X75X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 100×75×10',
    dimensions: {
      height: 100,
      width: 75,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 12,
      toeRadius: 6
    },
    weight: 13.0,
    area: 16.5,
    perimeter: 330,
    inertia: {
      Iyy: 60.4,
      Izz: 40.4,
      It: 10.3,
      Iw: 0
    },
    elasticModulus: {
      Wely: 8.62,
      Welz: 8.08
    },
    plasticModulus: {
      Wply: 12.1,
      Wplz: 12.0
    },
    radiusOfGyration: {
      iy: 1.91,
      iz: 1.56
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 120 x 80 x 8
  {
    id: 'L120X80X8',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 120×80×8',
    dimensions: {
      height: 120,
      width: 80,
      webThickness: 8,
      flangeThickness: 8,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 12.3,
    area: 15.7,
    perimeter: 384,
    inertia: {
      Iyy: 85.4,
      Izz: 39.5,
      It: 9.23,
      Iw: 0
    },
    elasticModulus: {
      Wely: 10.2,
      Welz: 7.41
    },
    plasticModulus: {
      Wply: 14.4,
      Wplz: 11.0
    },
    radiusOfGyration: {
      iy: 2.33,
      iz: 1.59
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 120 x 80 x 10
  {
    id: 'L120X80X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 120×80×10',
    dimensions: {
      height: 120,
      width: 80,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 15.1,
    area: 19.2,
    perimeter: 380,
    inertia: {
      Iyy: 103,
      Izz: 47.4,
      It: 11.9,
      Iw: 0
    },
    elasticModulus: {
      Wely: 12.3,
      Welz: 8.88
    },
    plasticModulus: {
      Wply: 17.3,
      Wplz: 13.2
    },
    radiusOfGyration: {
      iy: 2.32,
      iz: 1.57
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 120 x 80 x 12
  {
    id: 'L120X80X12',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 120×80×12',
    dimensions: {
      height: 120,
      width: 80,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 13,
      toeRadius: 6.5
    },
    weight: 17.8,
    area: 22.7,
    perimeter: 376,
    inertia: {
      Iyy: 120,
      Izz: 54.9,
      It: 14.8,
      Iw: 0
    },
    elasticModulus: {
      Wely: 14.3,
      Welz: 10.3
    },
    plasticModulus: {
      Wply: 20.1,
      Wplz: 15.4
    },
    radiusOfGyration: {
      iy: 2.30,
      iz: 1.55
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 75 x 9
  {
    id: 'L150X75X9',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 150×75×9',
    dimensions: {
      height: 150,
      width: 75,
      webThickness: 9,
      flangeThickness: 9,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 15.3,
    area: 19.5,
    perimeter: 432,
    inertia: {
      Iyy: 194,
      Izz: 40.4,
      It: 11.5,
      Iw: 0
    },
    elasticModulus: {
      Wely: 18.4,
      Welz: 8.08
    },
    plasticModulus: {
      Wply: 25.9,
      Wplz: 12.0
    },
    radiusOfGyration: {
      iy: 3.15,
      iz: 1.44
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 75 x 10
  {
    id: 'L150X75X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 150×75×10',
    dimensions: {
      height: 150,
      width: 75,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 16.8,
    area: 21.4,
    perimeter: 430,
    inertia: {
      Iyy: 212,
      Izz: 43.8,
      It: 12.9,
      Iw: 0
    },
    elasticModulus: {
      Wely: 20.1,
      Welz: 8.76
    },
    plasticModulus: {
      Wply: 28.4,
      Wplz: 13.0
    },
    radiusOfGyration: {
      iy: 3.14,
      iz: 1.43
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 75 x 12
  {
    id: 'L150X75X12',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 150×75×12',
    dimensions: {
      height: 150,
      width: 75,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 19.8,
    area: 25.2,
    perimeter: 426,
    inertia: {
      Iyy: 247,
      Izz: 50.4,
      It: 15.9,
      Iw: 0
    },
    elasticModulus: {
      Wely: 23.4,
      Welz: 10.1
    },
    plasticModulus: {
      Wply: 33.1,
      Wplz: 15.0
    },
    radiusOfGyration: {
      iy: 3.13,
      iz: 1.41
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 90 x 10
  {
    id: 'L150X90X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 150×90×10',
    dimensions: {
      height: 150,
      width: 90,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 18.2,
    area: 23.2,
    perimeter: 460,
    inertia: {
      Iyy: 212,
      Izz: 70.2,
      It: 13.7,
      Iw: 0
    },
    elasticModulus: {
      Wely: 20.1,
      Welz: 11.7
    },
    plasticModulus: {
      Wply: 28.4,
      Wplz: 17.4
    },
    radiusOfGyration: {
      iy: 3.02,
      iz: 1.74
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 90 x 12
  {
    id: 'L150X90X12',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 150×90×12',
    dimensions: {
      height: 150,
      width: 90,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 21.6,
    area: 27.5,
    perimeter: 456,
    inertia: {
      Iyy: 247,
      Izz: 81.0,
      It: 16.9,
      Iw: 0
    },
    elasticModulus: {
      Wely: 23.4,
      Welz: 13.5
    },
    plasticModulus: {
      Wply: 33.1,
      Wplz: 20.1
    },
    radiusOfGyration: {
      iy: 3.00,
      iz: 1.72
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 150 x 90 x 15
  {
    id: 'L150X90X15',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 150×90×15',
    dimensions: {
      height: 150,
      width: 90,
      webThickness: 15,
      flangeThickness: 15,
      rootRadius: 16,
      toeRadius: 8
    },
    weight: 26.6,
    area: 33.8,
    perimeter: 450,
    inertia: {
      Iyy: 294,
      Izz: 95.7,
      It: 21.9,
      Iw: 0
    },
    elasticModulus: {
      Wely: 27.9,
      Welz: 15.9
    },
    plasticModulus: {
      Wply: 39.4,
      Wplz: 23.7
    },
    radiusOfGyration: {
      iy: 2.95,
      iz: 1.68
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 200 x 100 x 10
  {
    id: 'L200X100X10',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 200×100×10',
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 10,
      flangeThickness: 10,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 22.9,
    area: 29.2,
    perimeter: 580,
    inertia: {
      Iyy: 493,
      Izz: 134,
      It: 17.2,
      Iw: 0
    },
    elasticModulus: {
      Wely: 35.2,
      Welz: 20.1
    },
    plasticModulus: {
      Wply: 49.6,
      Wplz: 30.0
    },
    radiusOfGyration: {
      iy: 4.11,
      iz: 2.14
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 200 x 100 x 12
  {
    id: 'L200X100X12',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 200×100×12',
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 12,
      flangeThickness: 12,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 27.3,
    area: 34.8,
    perimeter: 576,
    inertia: {
      Iyy: 579,
      Izz: 155,
      It: 21.3,
      Iw: 0
    },
    elasticModulus: {
      Wely: 41.3,
      Welz: 23.2
    },
    plasticModulus: {
      Wply: 58.2,
      Wplz: 34.7
    },
    radiusOfGyration: {
      iy: 4.08,
      iz: 2.11
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  },

  // L 200 x 100 x 15
  {
    id: 'L200X100X15',
    type: ProfileType.L_UNEQUAL,
    designation: 'L 200×100×15',
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 15,
      flangeThickness: 15,
      rootRadius: 18,
      toeRadius: 9
    },
    weight: 33.8,
    area: 43.0,
    perimeter: 570,
    inertia: {
      Iyy: 693,
      Izz: 183,
      It: 27.7,
      Iw: 0
    },
    elasticModulus: {
      Wely: 49.5,
      Welz: 27.4
    },
    plasticModulus: {
      Wply: 69.8,
      Wplz: 40.9
    },
    radiusOfGyration: {
      iy: 4.01,
      iz: 2.06
    },
    source: 'EN 10056-1',
    category: 'HOT_ROLLED'
  }
];