/**
 * Barres rondes pleines selon EN 10060
 * Barres rondes laminées à chaud en acier de construction
 */

import { ProfileType, SteelProfile } from '../../types/profile.types';

export const ROUND_BAR_PROFILES: SteelProfile[] = [
  // Petites barres rondes
  {
    id: 'ROUND8',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 8',
    dimensions: {
      diameter: 8,
      outerDiameter: 8,
      height: 8,
      width: 8
    },
    weight: 0.39,
    area: 0.50,
    perimeter: 25.1,
    inertia: {
      Iyy: 0.20,
      Izz: 0.20,
      It: 0.40,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.10,
      Welz: 0.10
    },
    radiusOfGyration: {
      iy: 2.0,
      iz: 2.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND10',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 10',
    dimensions: {
      diameter: 10,
      outerDiameter: 10,
      height: 10,
      width: 10
    },
    weight: 0.62,
    area: 0.79,
    perimeter: 31.4,
    inertia: {
      Iyy: 0.49,
      Izz: 0.49,
      It: 0.98,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.20,
      Welz: 0.20
    },
    radiusOfGyration: {
      iy: 2.5,
      iz: 2.5
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND12',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 12',
    dimensions: {
      diameter: 12,
      outerDiameter: 12,
      height: 12,
      width: 12
    },
    weight: 0.89,
    area: 1.13,
    perimeter: 37.7,
    inertia: {
      Iyy: 1.02,
      Izz: 1.02,
      It: 2.04,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.34,
      Welz: 0.34
    },
    radiusOfGyration: {
      iy: 3.0,
      iz: 3.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  
  // Barres rondes moyennes
  {
    id: 'ROUND16',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 16',
    dimensions: {
      diameter: 16,
      outerDiameter: 16,
      height: 16,
      width: 16
    },
    weight: 1.58,
    area: 2.01,
    perimeter: 50.3,
    inertia: {
      Iyy: 3.22,
      Izz: 3.22,
      It: 6.44,
      Iw: 0
    },
    elasticModulus: {
      Wely: 0.80,
      Welz: 0.80
    },
    radiusOfGyration: {
      iy: 4.0,
      iz: 4.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND20',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 20',
    dimensions: {
      diameter: 20,
      outerDiameter: 20,
      height: 20,
      width: 20
    },
    weight: 2.47,
    area: 3.14,
    perimeter: 62.8,
    inertia: {
      Iyy: 7.85,
      Izz: 7.85,
      It: 15.7,
      Iw: 0
    },
    elasticModulus: {
      Wely: 1.57,
      Welz: 1.57
    },
    radiusOfGyration: {
      iy: 5.0,
      iz: 5.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND25',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 25',
    dimensions: {
      diameter: 25,
      outerDiameter: 25,
      height: 25,
      width: 25
    },
    weight: 3.85,
    area: 4.91,
    perimeter: 78.5,
    inertia: {
      Iyy: 19.2,
      Izz: 19.2,
      It: 38.4,
      Iw: 0
    },
    elasticModulus: {
      Wely: 3.07,
      Welz: 3.07
    },
    radiusOfGyration: {
      iy: 6.25,
      iz: 6.25
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND30',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 30',
    dimensions: {
      diameter: 30,
      outerDiameter: 30,
      height: 30,
      width: 30
    },
    weight: 5.55,
    area: 7.07,
    perimeter: 94.2,
    inertia: {
      Iyy: 39.8,
      Izz: 39.8,
      It: 79.5,
      Iw: 0
    },
    elasticModulus: {
      Wely: 5.30,
      Welz: 5.30
    },
    radiusOfGyration: {
      iy: 7.5,
      iz: 7.5
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  
  // Grosses barres rondes
  {
    id: 'ROUND40',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 40',
    dimensions: {
      diameter: 40,
      outerDiameter: 40,
      height: 40,
      width: 40
    },
    weight: 9.87,
    area: 12.6,
    perimeter: 125.7,
    inertia: {
      Iyy: 125,
      Izz: 125,
      It: 251,
      Iw: 0
    },
    elasticModulus: {
      Wely: 12.6,
      Welz: 12.6
    },
    radiusOfGyration: {
      iy: 10.0,
      iz: 10.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND50',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 50',
    dimensions: {
      diameter: 50,
      outerDiameter: 50,
      height: 50,
      width: 50
    },
    weight: 15.4,
    area: 19.6,
    perimeter: 157.1,
    inertia: {
      Iyy: 307,
      Izz: 307,
      It: 614,
      Iw: 0
    },
    elasticModulus: {
      Wely: 24.5,
      Welz: 24.5
    },
    radiusOfGyration: {
      iy: 12.5,
      iz: 12.5
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND60',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 60',
    dimensions: {
      diameter: 60,
      outerDiameter: 60,
      height: 60,
      width: 60
    },
    weight: 22.2,
    area: 28.3,
    perimeter: 188.5,
    inertia: {
      Iyy: 636,
      Izz: 636,
      It: 1272,
      Iw: 0
    },
    elasticModulus: {
      Wely: 42.4,
      Welz: 42.4
    },
    radiusOfGyration: {
      iy: 15.0,
      iz: 15.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND70',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 70',
    dimensions: {
      diameter: 70,
      outerDiameter: 70,
      height: 70,
      width: 70
    },
    weight: 30.2,
    area: 38.5,
    perimeter: 219.9,
    inertia: {
      Iyy: 1178,
      Izz: 1178,
      It: 2356,
      Iw: 0
    },
    elasticModulus: {
      Wely: 67.3,
      Welz: 67.3
    },
    radiusOfGyration: {
      iy: 17.5,
      iz: 17.5
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND80',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 80',
    dimensions: {
      diameter: 80,
      outerDiameter: 80,
      height: 80,
      width: 80
    },
    weight: 39.5,
    area: 50.3,
    perimeter: 251.3,
    inertia: {
      Iyy: 2011,
      Izz: 2011,
      It: 4021,
      Iw: 0
    },
    elasticModulus: {
      Wely: 100,
      Welz: 100
    },
    radiusOfGyration: {
      iy: 20.0,
      iz: 20.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  },
  {
    id: 'ROUND100',
    type: ProfileType.ROUND_BAR,
    designation: 'Ø 100',
    dimensions: {
      diameter: 100,
      outerDiameter: 100,
      height: 100,
      width: 100
    },
    weight: 61.7,
    area: 78.5,
    perimeter: 314.2,
    inertia: {
      Iyy: 4909,
      Izz: 4909,
      It: 9817,
      Iw: 0
    },
    elasticModulus: {
      Wely: 196,
      Welz: 196
    },
    radiusOfGyration: {
      iy: 25.0,
      iz: 25.0
    },
    source: 'EN 10060',
    category: 'Laminé à chaud'
  }
];

export default ROUND_BAR_PROFILES;