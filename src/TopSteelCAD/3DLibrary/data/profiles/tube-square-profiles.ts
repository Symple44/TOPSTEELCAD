import { SteelProfile, ProfileType } from '../../types/profile.types';

export const TUBE_SQUARE_PROFILES: SteelProfile[] = [
  // Tubes carrés selon EN 10219-2
  {
    id: 'TS-20x20x2',
    designation: 'TS 20x20x2',
    type: ProfileType.SHS,
    dimensions: {
      height: 20,
      width: 20,
      thickness: 2,
      outerRadius: 4,
      innerRadius: 2
    },
    weight: 1.05,
    area: 1.34,
    properties: {
      momentOfInertiaY: 0.728,
      momentOfInertiaZ: 0.728,
      radiusOfGyrationY: 0.737,
      radiusOfGyrationZ: 0.737,
      elasticModulusY: 0.728,
      elasticModulusZ: 0.728,
      plasticModulusY: 0.967,
      plasticModulusZ: 0.967
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-25x25x2',
    designation: 'TS 25x25x2',
    type: ProfileType.SHS,
    dimensions: {
      height: 25,
      width: 25,
      thickness: 2,
      outerRadius: 4,
      innerRadius: 2
    },
    weight: 1.36,
    area: 1.74,
    properties: {
      momentOfInertiaY: 1.58,
      momentOfInertiaZ: 1.58,
      radiusOfGyrationY: 0.953,
      radiusOfGyrationZ: 0.953,
      elasticModulusY: 1.26,
      elasticModulusZ: 1.26,
      plasticModulusY: 1.65,
      plasticModulusZ: 1.65
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-30x30x2.5',
    designation: 'TS 30x30x2.5',
    type: ProfileType.SHS,
    dimensions: {
      height: 30,
      width: 30,
      thickness: 2.5,
      outerRadius: 5,
      innerRadius: 2.5
    },
    weight: 2.04,
    area: 2.60,
    properties: {
      momentOfInertiaY: 3.43,
      momentOfInertiaZ: 3.43,
      radiusOfGyrationY: 1.15,
      radiusOfGyrationZ: 1.15,
      elasticModulusY: 2.29,
      elasticModulusZ: 2.29,
      plasticModulusY: 2.96,
      plasticModulusZ: 2.96
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-40x40x3',
    designation: 'TS 40x40x3',
    type: ProfileType.SHS,
    dimensions: {
      height: 40,
      width: 40,
      thickness: 3,
      outerRadius: 6,
      innerRadius: 3
    },
    weight: 3.41,
    area: 4.34,
    properties: {
      momentOfInertiaY: 10.3,
      momentOfInertiaZ: 10.3,
      radiusOfGyrationY: 1.54,
      radiusOfGyrationZ: 1.54,
      elasticModulusY: 5.15,
      elasticModulusZ: 5.15,
      plasticModulusY: 6.56,
      plasticModulusZ: 6.56
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-50x50x3',
    designation: 'TS 50x50x3',
    type: ProfileType.SHS,
    dimensions: {
      height: 50,
      width: 50,
      thickness: 3,
      outerRadius: 6,
      innerRadius: 3
    },
    weight: 4.35,
    area: 5.54,
    properties: {
      momentOfInertiaY: 21.3,
      momentOfInertiaZ: 21.3,
      radiusOfGyrationY: 1.96,
      radiusOfGyrationZ: 1.96,
      elasticModulusY: 8.52,
      elasticModulusZ: 8.52,
      plasticModulusY: 10.8,
      plasticModulusZ: 10.8
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-60x60x4',
    designation: 'TS 60x60x4',
    type: ProfileType.SHS,
    dimensions: {
      height: 60,
      width: 60,
      thickness: 4,
      outerRadius: 8,
      innerRadius: 4
    },
    weight: 6.71,
    area: 8.54,
    properties: {
      momentOfInertiaY: 47.7,
      momentOfInertiaZ: 47.7,
      radiusOfGyrationY: 2.36,
      radiusOfGyrationZ: 2.36,
      elasticModulusY: 15.9,
      elasticModulusZ: 15.9,
      plasticModulusY: 20.0,
      plasticModulusZ: 20.0
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-70x70x4',
    designation: 'TS 70x70x4',
    type: ProfileType.SHS,
    dimensions: {
      height: 70,
      width: 70,
      thickness: 4,
      outerRadius: 8,
      innerRadius: 4
    },
    weight: 7.95,
    area: 10.1,
    properties: {
      momentOfInertiaY: 77.8,
      momentOfInertiaZ: 77.8,
      radiusOfGyrationY: 2.78,
      radiusOfGyrationZ: 2.78,
      elasticModulusY: 22.2,
      elasticModulusZ: 22.2,
      plasticModulusY: 27.9,
      plasticModulusZ: 27.9
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-80x80x5',
    designation: 'TS 80x80x5',
    type: ProfileType.SHS,
    dimensions: {
      height: 80,
      width: 80,
      thickness: 5,
      outerRadius: 10,
      innerRadius: 5
    },
    weight: 11.0,
    area: 14.0,
    properties: {
      momentOfInertiaY: 142,
      momentOfInertiaZ: 142,
      radiusOfGyrationY: 3.18,
      radiusOfGyrationZ: 3.18,
      elasticModulusY: 35.5,
      elasticModulusZ: 35.5,
      plasticModulusY: 44.3,
      plasticModulusZ: 44.3
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-90x90x5',
    designation: 'TS 90x90x5',
    type: ProfileType.SHS,
    dimensions: {
      height: 90,
      width: 90,
      thickness: 5,
      outerRadius: 10,
      innerRadius: 5
    },
    weight: 12.5,
    area: 16.0,
    properties: {
      momentOfInertiaY: 207,
      momentOfInertiaZ: 207,
      radiusOfGyrationY: 3.60,
      radiusOfGyrationZ: 3.60,
      elasticModulusY: 46.0,
      elasticModulusZ: 46.0,
      plasticModulusY: 57.2,
      plasticModulusZ: 57.2
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-100x100x6',
    designation: 'TS 100x100x6',
    type: ProfileType.SHS,
    dimensions: {
      height: 100,
      width: 100,
      thickness: 6,
      outerRadius: 12,
      innerRadius: 6
    },
    weight: 16.3,
    area: 20.8,
    properties: {
      momentOfInertiaY: 338,
      momentOfInertiaZ: 338,
      radiusOfGyrationY: 4.03,
      radiusOfGyrationZ: 4.03,
      elasticModulusY: 67.6,
      elasticModulusZ: 67.6,
      plasticModulusY: 83.7,
      plasticModulusZ: 83.7
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-120x120x6',
    designation: 'TS 120x120x6',
    type: ProfileType.SHS,
    dimensions: {
      height: 120,
      width: 120,
      thickness: 6,
      outerRadius: 12,
      innerRadius: 6
    },
    weight: 20.1,
    area: 25.6,
    properties: {
      momentOfInertiaY: 608,
      momentOfInertiaZ: 608,
      radiusOfGyrationY: 4.87,
      radiusOfGyrationZ: 4.87,
      elasticModulusY: 101,
      elasticModulusZ: 101,
      plasticModulusY: 125,
      plasticModulusZ: 125
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-140x140x8',
    designation: 'TS 140x140x8',
    type: ProfileType.SHS,
    dimensions: {
      height: 140,
      width: 140,
      thickness: 8,
      outerRadius: 16,
      innerRadius: 8
    },
    weight: 30.4,
    area: 38.7,
    properties: {
      momentOfInertiaY: 1200,
      momentOfInertiaZ: 1200,
      radiusOfGyrationY: 5.57,
      radiusOfGyrationZ: 5.57,
      elasticModulusY: 171,
      elasticModulusZ: 171,
      plasticModulusY: 211,
      plasticModulusZ: 211
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-150x150x8',
    designation: 'TS 150x150x8',
    type: ProfileType.SHS,
    dimensions: {
      height: 150,
      width: 150,
      thickness: 8,
      outerRadius: 16,
      innerRadius: 8
    },
    weight: 32.9,
    area: 41.9,
    properties: {
      momentOfInertiaY: 1500,
      momentOfInertiaZ: 1500,
      radiusOfGyrationY: 5.99,
      radiusOfGyrationZ: 5.99,
      elasticModulusY: 200,
      elasticModulusZ: 200,
      plasticModulusY: 247,
      plasticModulusZ: 247
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-160x160x10',
    designation: 'TS 160x160x10',
    type: ProfileType.SHS,
    dimensions: {
      height: 160,
      width: 160,
      thickness: 10,
      outerRadius: 20,
      innerRadius: 10
    },
    weight: 43.3,
    area: 55.1,
    properties: {
      momentOfInertiaY: 2190,
      momentOfInertiaZ: 2190,
      radiusOfGyrationY: 6.30,
      radiusOfGyrationZ: 6.30,
      elasticModulusY: 274,
      elasticModulusZ: 274,
      plasticModulusY: 338,
      plasticModulusZ: 338
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-180x180x10',
    designation: 'TS 180x180x10',
    type: ProfileType.SHS,
    dimensions: {
      height: 180,
      width: 180,
      thickness: 10,
      outerRadius: 20,
      innerRadius: 10
    },
    weight: 49.3,
    area: 62.8,
    properties: {
      momentOfInertiaY: 3180,
      momentOfInertiaZ: 3180,
      radiusOfGyrationY: 7.12,
      radiusOfGyrationZ: 7.12,
      elasticModulusY: 353,
      elasticModulusZ: 353,
      plasticModulusY: 435,
      plasticModulusZ: 435
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TS-200x200x12',
    designation: 'TS 200x200x12',
    type: ProfileType.SHS,
    dimensions: {
      height: 200,
      width: 200,
      thickness: 12,
      outerRadius: 24,
      innerRadius: 12
    },
    weight: 64.4,
    area: 82.1,
    properties: {
      momentOfInertiaY: 5140,
      momentOfInertiaZ: 5140,
      radiusOfGyrationY: 7.91,
      radiusOfGyrationZ: 7.91,
      elasticModulusY: 514,
      elasticModulusZ: 514,
      plasticModulusY: 633,
      plasticModulusZ: 633
    },
    source: 'EN 10219-2'
  }
];