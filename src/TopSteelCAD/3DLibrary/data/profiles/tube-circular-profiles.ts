import { SteelProfile, ProfileType } from '../../types/profile.types';

export const TUBE_CIRCULAR_PROFILES: SteelProfile[] = [
  // Tubes circulaires selon EN 10219-2
  {
    id: 'TC-21.3x2.0',
    designation: 'TC 21.3x2.0',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 21.3,
      thickness: 2.0,
      innerDiameter: 17.3
    },
    weight: 0.92,
    area: 1.17,
    properties: {
      momentOfInertiaY: 0.87,
      momentOfInertiaZ: 0.87,
      radiusOfGyrationY: 0.86,
      radiusOfGyrationZ: 0.86,
      elasticModulusY: 0.82,
      elasticModulusZ: 0.82,
      plasticModulusY: 1.16,
      plasticModulusZ: 1.16
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-26.9x2.0',
    designation: 'TC 26.9x2.0',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 26.9,
      thickness: 2.0,
      innerDiameter: 22.9
    },
    weight: 1.19,
    area: 1.52,
    properties: {
      momentOfInertiaY: 1.89,
      momentOfInertiaZ: 1.89,
      radiusOfGyrationY: 1.11,
      radiusOfGyrationZ: 1.11,
      elasticModulusY: 1.41,
      elasticModulusZ: 1.41,
      plasticModulusY: 1.97,
      plasticModulusZ: 1.97
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-33.7x2.6',
    designation: 'TC 33.7x2.6',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 33.7,
      thickness: 2.6,
      innerDiameter: 28.5
    },
    weight: 1.95,
    area: 2.48,
    properties: {
      momentOfInertiaY: 4.92,
      momentOfInertiaZ: 4.92,
      radiusOfGyrationY: 1.41,
      radiusOfGyrationZ: 1.41,
      elasticModulusY: 2.92,
      elasticModulusZ: 2.92,
      plasticModulusY: 4.06,
      plasticModulusZ: 4.06
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-42.4x2.6',
    designation: 'TC 42.4x2.6',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 42.4,
      thickness: 2.6,
      innerDiameter: 37.2
    },
    weight: 2.49,
    area: 3.17,
    properties: {
      momentOfInertiaY: 10.3,
      momentOfInertiaZ: 10.3,
      radiusOfGyrationY: 1.80,
      radiusOfGyrationZ: 1.80,
      elasticModulusY: 4.86,
      elasticModulusZ: 4.86,
      plasticModulusY: 6.72,
      plasticModulusZ: 6.72
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-48.3x2.9',
    designation: 'TC 48.3x2.9',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 48.3,
      thickness: 2.9,
      innerDiameter: 42.5
    },
    weight: 3.18,
    area: 4.05,
    properties: {
      momentOfInertiaY: 17.2,
      momentOfInertiaZ: 17.2,
      radiusOfGyrationY: 2.06,
      radiusOfGyrationZ: 2.06,
      elasticModulusY: 7.12,
      elasticModulusZ: 7.12,
      plasticModulusY: 9.82,
      plasticModulusZ: 9.82
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-60.3x2.9',
    designation: 'TC 60.3x2.9',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 60.3,
      thickness: 2.9,
      innerDiameter: 54.5
    },
    weight: 4.01,
    area: 5.11,
    properties: {
      momentOfInertiaY: 34.6,
      momentOfInertiaZ: 34.6,
      radiusOfGyrationY: 2.60,
      radiusOfGyrationZ: 2.60,
      elasticModulusY: 11.5,
      elasticModulusZ: 11.5,
      plasticModulusY: 15.8,
      plasticModulusZ: 15.8
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-76.1x2.9',
    designation: 'TC 76.1x2.9',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 76.1,
      thickness: 2.9,
      innerDiameter: 70.3
    },
    weight: 5.10,
    area: 6.50,
    properties: {
      momentOfInertiaY: 71.3,
      momentOfInertiaZ: 71.3,
      radiusOfGyrationY: 3.31,
      radiusOfGyrationZ: 3.31,
      elasticModulusY: 18.7,
      elasticModulusZ: 18.7,
      plasticModulusY: 25.6,
      plasticModulusZ: 25.6
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-88.9x3.2',
    designation: 'TC 88.9x3.2',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 88.9,
      thickness: 3.2,
      innerDiameter: 82.5
    },
    weight: 6.58,
    area: 8.38,
    properties: {
      momentOfInertiaY: 123,
      momentOfInertiaZ: 123,
      radiusOfGyrationY: 3.83,
      radiusOfGyrationZ: 3.83,
      elasticModulusY: 27.7,
      elasticModulusZ: 27.7,
      plasticModulusY: 37.9,
      plasticModulusZ: 37.9
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-101.6x3.6',
    designation: 'TC 101.6x3.6',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 101.6,
      thickness: 3.6,
      innerDiameter: 94.4
    },
    weight: 8.49,
    area: 10.8,
    properties: {
      momentOfInertiaY: 206,
      momentOfInertiaZ: 206,
      radiusOfGyrationY: 4.37,
      radiusOfGyrationZ: 4.37,
      elasticModulusY: 40.6,
      elasticModulusZ: 40.6,
      plasticModulusY: 55.5,
      plasticModulusZ: 55.5
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-114.3x3.6',
    designation: 'TC 114.3x3.6',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 114.3,
      thickness: 3.6,
      innerDiameter: 107.1
    },
    weight: 9.60,
    area: 12.2,
    properties: {
      momentOfInertiaY: 296,
      momentOfInertiaZ: 296,
      radiusOfGyrationY: 4.93,
      radiusOfGyrationZ: 4.93,
      elasticModulusY: 51.8,
      elasticModulusZ: 51.8,
      plasticModulusY: 70.7,
      plasticModulusZ: 70.7
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-139.7x4.0',
    designation: 'TC 139.7x4.0',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 139.7,
      thickness: 4.0,
      innerDiameter: 131.7
    },
    weight: 13.1,
    area: 16.7,
    properties: {
      momentOfInertiaY: 562,
      momentOfInertiaZ: 562,
      radiusOfGyrationY: 5.80,
      radiusOfGyrationZ: 5.80,
      elasticModulusY: 80.5,
      elasticModulusZ: 80.5,
      plasticModulusY: 109,
      plasticModulusZ: 109
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-168.3x4.5',
    designation: 'TC 168.3x4.5',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 168.3,
      thickness: 4.5,
      innerDiameter: 159.3
    },
    weight: 17.8,
    area: 22.7,
    properties: {
      momentOfInertiaY: 1050,
      momentOfInertiaZ: 1050,
      radiusOfGyrationY: 6.80,
      radiusOfGyrationZ: 6.80,
      elasticModulusY: 125,
      elasticModulusZ: 125,
      plasticModulusY: 169,
      plasticModulusZ: 169
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-193.7x5.0',
    designation: 'TC 193.7x5.0',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 193.7,
      thickness: 5.0,
      innerDiameter: 183.7
    },
    weight: 22.8,
    area: 29.0,
    properties: {
      momentOfInertiaY: 1780,
      momentOfInertiaZ: 1780,
      radiusOfGyrationY: 7.83,
      radiusOfGyrationZ: 7.83,
      elasticModulusY: 184,
      elasticModulusZ: 184,
      plasticModulusY: 248,
      plasticModulusZ: 248
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-219.1x5.9',
    designation: 'TC 219.1x5.9',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 219.1,
      thickness: 5.9,
      innerDiameter: 207.3
    },
    weight: 30.5,
    area: 38.8,
    properties: {
      momentOfInertiaY: 2950,
      momentOfInertiaZ: 2950,
      radiusOfGyrationY: 8.72,
      radiusOfGyrationZ: 8.72,
      elasticModulusY: 269,
      elasticModulusZ: 269,
      plasticModulusY: 363,
      plasticModulusZ: 363
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-273.0x6.3',
    designation: 'TC 273.0x6.3',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 273.0,
      thickness: 6.3,
      innerDiameter: 260.4
    },
    weight: 40.6,
    area: 51.8,
    properties: {
      momentOfInertiaY: 6190,
      momentOfInertiaZ: 6190,
      radiusOfGyrationY: 10.9,
      radiusOfGyrationZ: 10.9,
      elasticModulusY: 453,
      elasticModulusZ: 453,
      plasticModulusY: 610,
      plasticModulusZ: 610
    },
    source: 'EN 10219-2'
  },
  {
    id: 'TC-323.9x7.1',
    designation: 'TC 323.9x7.1',
    type: ProfileType.TUBE_CIRCULAR,
    dimensions: {
      outerDiameter: 323.9,
      thickness: 7.1,
      innerDiameter: 309.7
    },
    weight: 54.5,
    area: 69.4,
    properties: {
      momentOfInertiaY: 11100,
      momentOfInertiaZ: 11100,
      radiusOfGyrationY: 12.6,
      radiusOfGyrationZ: 12.6,
      elasticModulusY: 685,
      elasticModulusZ: 685,
      plasticModulusY: 922,
      plasticModulusZ: 922
    },
    source: 'EN 10219-2'
  }
];