import { SteelProfile, ProfileType } from '../../types/profile.types';

export const TUBE_RECTANGULAR_PROFILES: SteelProfile[] = [
  // Tubes rectangulaires selon EN 10219-2
  {
    id: 'TR-40x20x2',
    designation: 'TR 40x20x2',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 40,
      width: 20,
      thickness: 2,
      outerRadius: 4,
      innerRadius: 2
    },
    weight: 1.68,
    area: 2.14,
    properties: {
      momentOfInertiaY: 4.04,
      momentOfInertiaZ: 1.41,
      radiusOfGyrationY: 1.37,
      radiusOfGyrationZ: 0.811,
      elasticModulusY: 2.02,
      elasticModulusZ: 1.41,
      plasticModulusY: 2.63,
      plasticModulusZ: 1.89
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-50x30x3',
    designation: 'TR 50x30x3',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 50,
      width: 30,
      thickness: 3,
      outerRadius: 6,
      innerRadius: 3
    },
    weight: 3.41,
    area: 4.34,
    properties: {
      momentOfInertiaY: 13.0,
      momentOfInertiaZ: 5.75,
      radiusOfGyrationY: 1.73,
      radiusOfGyrationZ: 1.15,
      elasticModulusY: 5.20,
      elasticModulusZ: 3.83,
      plasticModulusY: 6.64,
      plasticModulusZ: 4.93
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-60x40x3',
    designation: 'TR 60x40x3',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 60,
      width: 40,
      thickness: 3,
      outerRadius: 6,
      innerRadius: 3
    },
    weight: 4.35,
    area: 5.54,
    properties: {
      momentOfInertiaY: 24.2,
      momentOfInertiaZ: 12.4,
      radiusOfGyrationY: 2.09,
      radiusOfGyrationZ: 1.50,
      elasticModulusY: 8.07,
      elasticModulusZ: 6.20,
      plasticModulusY: 10.2,
      plasticModulusZ: 7.87
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-80x40x4',
    designation: 'TR 80x40x4',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 80,
      width: 40,
      thickness: 4,
      outerRadius: 8,
      innerRadius: 4
    },
    weight: 6.71,
    area: 8.54,
    properties: {
      momentOfInertiaY: 61.3,
      momentOfInertiaZ: 19.7,
      radiusOfGyrationY: 2.68,
      radiusOfGyrationZ: 1.52,
      elasticModulusY: 15.3,
      elasticModulusZ: 9.85,
      plasticModulusY: 19.2,
      plasticModulusZ: 12.6
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-100x50x4',
    designation: 'TR 100x50x4',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 100,
      width: 50,
      thickness: 4,
      outerRadius: 8,
      innerRadius: 4
    },
    weight: 8.62,
    area: 11.0,
    properties: {
      momentOfInertiaY: 130,
      momentOfInertiaZ: 40.7,
      radiusOfGyrationY: 3.44,
      radiusOfGyrationZ: 1.92,
      elasticModulusY: 26.0,
      elasticModulusZ: 16.3,
      plasticModulusY: 32.3,
      plasticModulusZ: 20.6
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-120x60x5',
    designation: 'TR 120x60x5',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 120,
      width: 60,
      thickness: 5,
      outerRadius: 10,
      innerRadius: 5
    },
    weight: 12.8,
    area: 16.3,
    properties: {
      momentOfInertiaY: 293,
      momentOfInertiaZ: 89.7,
      radiusOfGyrationY: 4.24,
      radiusOfGyrationZ: 2.35,
      elasticModulusY: 48.8,
      elasticModulusZ: 29.9,
      plasticModulusY: 60.3,
      plasticModulusZ: 37.4
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-120x80x6',
    designation: 'TR 120x80x6',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 120,
      width: 80,
      thickness: 6,
      outerRadius: 12,
      innerRadius: 6
    },
    weight: 17.8,
    area: 22.7,
    properties: {
      momentOfInertiaY: 445,
      momentOfInertiaZ: 216,
      radiusOfGyrationY: 4.43,
      radiusOfGyrationZ: 3.09,
      elasticModulusY: 74.2,
      elasticModulusZ: 54.0,
      plasticModulusY: 91.2,
      plasticModulusZ: 66.6
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-140x80x6',
    designation: 'TR 140x80x6',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 140,
      width: 80,
      thickness: 6,
      outerRadius: 12,
      innerRadius: 6
    },
    weight: 19.7,
    area: 25.1,
    properties: {
      momentOfInertiaY: 622,
      momentOfInertiaZ: 242,
      radiusOfGyrationY: 4.98,
      radiusOfGyrationZ: 3.10,
      elasticModulusY: 88.9,
      elasticModulusZ: 60.5,
      plasticModulusY: 109,
      plasticModulusZ: 74.7
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-150x100x6',
    designation: 'TR 150x100x6',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 150,
      width: 100,
      thickness: 6,
      outerRadius: 12,
      innerRadius: 6
    },
    weight: 22.3,
    area: 28.4,
    properties: {
      momentOfInertiaY: 869,
      momentOfInertiaZ: 424,
      radiusOfGyrationY: 5.53,
      radiusOfGyrationZ: 3.86,
      elasticModulusY: 116,
      elasticModulusZ: 84.8,
      plasticModulusY: 142,
      plasticModulusZ: 104
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-160x80x8',
    designation: 'TR 160x80x8',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 160,
      width: 80,
      thickness: 8,
      outerRadius: 16,
      innerRadius: 8
    },
    weight: 27.6,
    area: 35.1,
    properties: {
      momentOfInertiaY: 1060,
      momentOfInertiaZ: 336,
      radiusOfGyrationY: 5.50,
      radiusOfGyrationZ: 3.09,
      elasticModulusY: 133,
      elasticModulusZ: 84.0,
      plasticModulusY: 163,
      plasticModulusZ: 104
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-180x100x8',
    designation: 'TR 180x100x8',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 180,
      width: 100,
      thickness: 8,
      outerRadius: 16,
      innerRadius: 8
    },
    weight: 32.0,
    area: 40.8,
    properties: {
      momentOfInertiaY: 1590,
      momentOfInertiaZ: 593,
      radiusOfGyrationY: 6.24,
      radiusOfGyrationZ: 3.81,
      elasticModulusY: 177,
      elasticModulusZ: 119,
      plasticModulusY: 217,
      plasticModulusZ: 147
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-200x100x10',
    designation: 'TR 200x100x10',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 200,
      width: 100,
      thickness: 10,
      outerRadius: 20,
      innerRadius: 10
    },
    weight: 42.3,
    area: 53.9,
    properties: {
      momentOfInertiaY: 2540,
      momentOfInertiaZ: 775,
      radiusOfGyrationY: 6.86,
      radiusOfGyrationZ: 3.79,
      elasticModulusY: 254,
      elasticModulusZ: 155,
      plasticModulusY: 312,
      plasticModulusZ: 192
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-200x120x10',
    designation: 'TR 200x120x10',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 200,
      width: 120,
      thickness: 10,
      outerRadius: 20,
      innerRadius: 10
    },
    weight: 46.3,
    area: 59.0,
    properties: {
      momentOfInertiaY: 2870,
      momentOfInertiaZ: 1150,
      radiusOfGyrationY: 6.97,
      radiusOfGyrationZ: 4.41,
      elasticModulusY: 287,
      elasticModulusZ: 192,
      plasticModulusY: 353,
      plasticModulusZ: 237
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-250x150x10',
    designation: 'TR 250x150x10',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 250,
      width: 150,
      thickness: 10,
      outerRadius: 20,
      innerRadius: 10
    },
    weight: 59.3,
    area: 75.5,
    properties: {
      momentOfInertiaY: 5860,
      momentOfInertiaZ: 2370,
      radiusOfGyrationY: 8.81,
      radiusOfGyrationZ: 5.60,
      elasticModulusY: 469,
      elasticModulusZ: 316,
      plasticModulusY: 576,
      plasticModulusZ: 389
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TR-300x200x12',
    designation: 'TR 300x200x12',
    type: ProfileType.TUBE_RECTANGULAR,
    dimensions: {
      height: 300,
      width: 200,
      thickness: 12,
      outerRadius: 24,
      innerRadius: 12
    },
    weight: 89.6,
    area: 114,
    properties: {
      momentOfInertiaY: 12700,
      momentOfInertiaZ: 6140,
      radiusOfGyrationY: 10.6,
      radiusOfGyrationZ: 7.34,
      elasticModulusY: 847,
      elasticModulusZ: 614,
      plasticModulusY: 1040,
      plasticModulusZ: 756
    },
    source: 'EN 10219-2'
  }
];