import { vi } from 'vitest';

// Mock Three.js modules if needed
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z })),
  Quaternion: vi.fn().mockImplementation((x = 0, y = 0, z = 0, w = 1) => ({ x, y, z, w })),
  Color: vi.fn().mockImplementation((r = 1, g = 1, b = 1) => ({ r, g, b })),
  Material: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  WebGLRenderer: vi.fn(),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  BoxGeometry: vi.fn(),
  BufferGeometry: vi.fn(),
  Mesh: vi.fn(),
  Group: vi.fn(),
  Object3D: vi.fn(),
  Raycaster: vi.fn(),
  ArrowHelper: vi.fn(),
  LineBasicMaterial: vi.fn(),
  LineSegments: vi.fn(),
  BufferAttribute: vi.fn(),
  Float32BufferAttribute: vi.fn(),
  DoubleSide: 2,
  FrontSide: 0,
  BackSide: 1,
}));

// Global test timeout
vi.setConfig({ testTimeout: 10000 });