/**
 * three.ts - Mock commun pour THREE.js dans les tests des handlers
 * Centralise tous les mocks THREE.js pour éviter la duplication
 */

import { vi } from 'vitest';

// Mock des géométries THREE.js
export const mockBufferGeometry = (): any => ({
  dispose: vi.fn(),
  applyMatrix4: vi.fn(),
  attributes: {},
  boundingBox: null,
  boundingSphere: null,
  clone: vi.fn((): any => mockBufferGeometry()),
  computeBoundingBox: vi.fn(),
  computeBoundingSphere: vi.fn(),
});

export const mockExtrudeGeometry = () => ({
  ...mockBufferGeometry(),
  parameters: {
    shapes: [],
    options: {},
  },
});

export const mockBoxGeometry = () => ({
  ...mockBufferGeometry(),
  parameters: {
    width: 1,
    height: 1,
    depth: 1,
  },
});

export const mockShape = () => ({
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  absarc: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  getPoints: vi.fn(() => []),
  holes: [],
});

export const mockMatrix4 = () => ({
  makeTranslation: vi.fn(),
  makeRotationX: vi.fn(),
  makeRotationY: vi.fn(),
  makeRotationZ: vi.fn(),
  makeRotationFromEuler: vi.fn(),
  makeScale: vi.fn(),
  multiply: vi.fn(),
  multiplyMatrices: vi.fn(),
  identity: vi.fn(),
  copy: vi.fn(),
  elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
});

export const mockEuler = () => ({
  x: 0,
  y: 0,
  z: 0,
  order: 'XYZ',
  set: vi.fn(),
  copy: vi.fn(),
  setFromQuaternion: vi.fn(),
  setFromRotationMatrix: vi.fn(),
});

export const mockVector3 = (): any => ({
  x: 0,
  y: 0,
  z: 0,
  set: vi.fn(),
  copy: vi.fn(),
  add: vi.fn(),
  sub: vi.fn(),
  multiply: vi.fn(),
  multiplyScalar: vi.fn(),
  normalize: vi.fn(),
  length: vi.fn(() => 0),
  distanceTo: vi.fn(() => 0),
  clone: vi.fn((): any => mockVector3()),
});

// Mock principal pour THREE.js
export const mockTHREE = {
  BufferGeometry: vi.fn(mockBufferGeometry),
  ExtrudeGeometry: vi.fn(mockExtrudeGeometry),
  BoxGeometry: vi.fn(mockBoxGeometry),
  Shape: vi.fn(mockShape),
  Matrix4: vi.fn(mockMatrix4),
  Euler: vi.fn(mockEuler),
  Vector3: vi.fn(mockVector3),
  
  // Constantes THREE.js couramment utilisées
  DoubleSide: 2,
  FrontSide: 0,
  BackSide: 1,
  
  // Enums THREE.js
  ExtrudeGeometryOptions: {},
};