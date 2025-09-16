import { vi } from 'vitest';

// Create comprehensive Three.js mocks
const createMockVector3 = (x = 0, y = 0, z = 0): any => {
  const mock: any = {
    x, y, z,
    constructor: { name: 'Vector3' },
    set: vi.fn().mockImplementation(function(this: any, newX: number, newY: number, newZ: number) {
      this.x = newX;
      this.y = newY;
      this.z = newZ;
      return this;
    }),
    copy: vi.fn().mockImplementation(function(this: any, v: any) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }),
    clone: vi.fn().mockImplementation(function(this: any) {
      return createMockVector3(this.x, this.y, this.z);
    }),
    add: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    divide: vi.fn().mockReturnThis(),
    divideScalar: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    length: vi.fn().mockReturnValue(Math.sqrt(x * x + y * y + z * z)),
    lengthSq: vi.fn().mockReturnValue(x * x + y * y + z * z),
    dot: vi.fn().mockReturnValue(0),
    cross: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(0),
    setFromMatrixPosition: vi.fn().mockReturnThis(),
    applyMatrix4: vi.fn().mockReturnThis(),
    applyQuaternion: vi.fn().mockReturnThis()
  };
  return mock;
};

const createMockBox3 = () => ({
  min: createMockVector3(-Infinity, -Infinity, -Infinity),
  max: createMockVector3(Infinity, Infinity, Infinity),
  setFromBufferAttribute: vi.fn().mockReturnThis(),
  setFromObject: vi.fn().mockReturnThis(),
  expandByObject: vi.fn().mockReturnThis(),
  expandByPoint: vi.fn().mockReturnThis(),
  getSize: vi.fn().mockImplementation((target = createMockVector3()) => {
    target.x = 1000;
    target.y = 200;
    target.z = 100;
    return target;
  }),
  getCenter: vi.fn().mockImplementation((target = createMockVector3()) => {
    target.x = 0;
    target.y = 0;
    target.z = 0;
    return target;
  }),
  isEmpty: vi.fn().mockReturnValue(false),
  containsPoint: vi.fn().mockReturnValue(true),
  containsBox: vi.fn().mockReturnValue(true),
  intersectsBox: vi.fn().mockReturnValue(true)
});

const createMockEuler = (x = 0, y = 0, z = 0, order = 'XYZ') => ({
  x, y, z, order,
  constructor: { name: 'Euler' },
  set: vi.fn().mockReturnThis(),
  copy: vi.fn().mockReturnThis(),
  clone: vi.fn().mockReturnValue({ x, y, z, order }),
  setFromQuaternion: vi.fn().mockReturnThis(),
  setFromRotationMatrix: vi.fn().mockReturnThis()
});

const createMockBufferAttribute = (array: any = [], itemSize = 1): any => ({
  array,
  itemSize,
  count: array.length / itemSize,
  normalized: false,
  usage: 35044, // StaticDrawUsage
  set: vi.fn().mockReturnThis(),
  copy: vi.fn().mockReturnThis(),
  clone: vi.fn().mockImplementation(() => createMockBufferAttribute(array, itemSize)),
  getX: vi.fn().mockReturnValue(0),
  getY: vi.fn().mockReturnValue(0),
  getZ: vi.fn().mockReturnValue(0),
  setX: vi.fn().mockReturnThis(),
  setY: vi.fn().mockReturnThis(),
  setZ: vi.fn().mockReturnThis(),
  setXYZ: vi.fn().mockReturnThis(),
  needsUpdate: false
});

const createMockBufferGeometry = (): any => ({
  attributes: {
    position: createMockBufferAttribute(Array.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])), 3),
    normal: createMockBufferAttribute(Array.from(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])), 3),
    uv: createMockBufferAttribute(Array.from(new Float32Array([0, 0, 1, 0, 0, 1])), 2)
  },
  index: null,
  boundingBox: null,
  boundingSphere: null,
  dispose: vi.fn(),
  disposed: false,
  copy: vi.fn().mockReturnThis(),
  clone: vi.fn().mockImplementation(() => createMockBufferGeometry()),
  setAttribute: vi.fn().mockReturnThis(),
  deleteAttribute: vi.fn().mockReturnThis(),
  getAttribute: vi.fn().mockImplementation((_name) => createMockBufferAttribute()),
  setIndex: vi.fn().mockReturnThis(),
  computeBoundingBox: vi.fn().mockImplementation(function(this: any) {
    this.boundingBox = createMockBox3();
  }),
  computeBoundingSphere: vi.fn(),
  computeVertexNormals: vi.fn(),
  normalizeNormals: vi.fn(),
  merge: vi.fn().mockReturnThis(),
  rotateX: vi.fn().mockReturnThis(),
  rotateY: vi.fn().mockReturnThis(),
  rotateZ: vi.fn().mockReturnThis(),
  translate: vi.fn().mockReturnThis(),
  scale: vi.fn().mockReturnThis(),
  lookAt: vi.fn().mockReturnThis(),
  center: vi.fn().mockReturnThis(),
  setFromPoints: vi.fn().mockReturnThis(),
  toJSON: vi.fn().mockReturnValue({}),
  fromJSON: vi.fn().mockReturnThis()
});

const createMockObject3D = (): any => ({
  position: createMockVector3(),
  rotation: createMockEuler(),
  scale: createMockVector3(1, 1, 1),
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
  matrix: { elements: new Array(16).fill(0) },
  matrixWorld: { elements: new Array(16).fill(0) },
  visible: true,
  parent: null,
  children: [],
  userData: {},
  add: vi.fn().mockImplementation(function(this: any, object: any) {
    this.children.push(object);
    object.parent = this;
    return this;
  }),
  remove: vi.fn().mockImplementation(function(this: any, object: any) {
    const index = this.children.indexOf(object);
    if (index !== -1) {
      this.children.splice(index, 1);
      object.parent = null;
    }
    return this;
  }),
  traverse: vi.fn().mockImplementation(function(this: any, callback: any) {
    callback(this);
    this.children.forEach((child: any) => {
      if (child.traverse) child.traverse(callback);
    });
  }),
  copy: vi.fn().mockReturnThis(),
  clone: vi.fn().mockImplementation(() => createMockObject3D()),
  lookAt: vi.fn(),
  updateMatrix: vi.fn(),
  updateMatrixWorld: vi.fn(),
  getWorldPosition: vi.fn().mockReturnValue(createMockVector3()),
  getWorldQuaternion: vi.fn(),
  getWorldScale: vi.fn().mockReturnValue(createMockVector3()),
  localToWorld: vi.fn().mockReturnValue(createMockVector3()),
  worldToLocal: vi.fn().mockReturnValue(createMockVector3()),
  rotateOnAxis: vi.fn().mockReturnThis(),
  rotateOnWorldAxis: vi.fn().mockReturnThis(),
  translateOnAxis: vi.fn().mockReturnThis(),
  translateX: vi.fn().mockReturnThis(),
  translateY: vi.fn().mockReturnThis(),
  translateZ: vi.fn().mockReturnThis()
});

const createMockMesh = (geometry = null, material = null) => ({
  ...createMockObject3D(),
  type: 'Mesh',
  geometry: geometry || createMockBufferGeometry(),
  material: material || { color: { r: 1, g: 1, b: 1 } },
  morphTargetInfluences: [],
  morphTargetDictionary: {},
  raycast: vi.fn(),
  updateMorphTargets: vi.fn()
});

// Mock File API for browser environments
class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  _bits: any[];
  
  constructor(bits: any[], name: string, options: any = {}) {
    this.name = name;
    this.size = bits.reduce((acc: number, bit: any) => acc + (typeof bit === 'string' ? bit.length : bit.byteLength), 0);
    this.type = options.type || '';
    this.lastModified = Date.now();
    this._bits = bits;
  }

  async arrayBuffer() {
    const text = this._bits.join('');
    return new TextEncoder().encode(text).buffer;
  }

  async text() {
    return this._bits.join('');
  }

  slice(_start = 0, _end: number = this.size, contentType = '') {
    return new MockFile(['sliced content'], this.name, { type: contentType });
  }

  stream() {
    const bits = this._bits;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(bits.join('')));
        controller.close();
      }
    });
  }
}

// Make File available globally
(global as any).File = MockFile as any;

// Mock URL.createObjectURL and URL.revokeObjectURL for tests
if (typeof URL.createObjectURL === 'undefined') {
  (URL as any).createObjectURL = vi.fn((_blob: Blob) => {
    return `blob:mock-url-${Math.random().toString(36).substr(2, 9)}`;
  });
}

if (typeof URL.revokeObjectURL === 'undefined') {
  (URL as any).revokeObjectURL = vi.fn();
}

// Mock Blob.text() if not available
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = async function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  };
}

// Mock Blob.arrayBuffer() if not available
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Create mock classes that support instanceof
class Vector3Mock {
  constructor(x = 0, y = 0, z = 0) {
    return createMockVector3(x, y, z);
  }
}

class EulerMock {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    return createMockEuler(x, y, z, order);
  }
}

class Box3Mock {
  constructor() {
    return createMockBox3();
  }
}

// Mock Three.js modules with comprehensive implementations
vi.mock('three', () => ({
  // Core constructors
  Vector3: Vector3Mock,
  Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Vector4: vi.fn().mockImplementation((x = 0, y = 0, z = 0, w = 1) => ({ x, y, z, w })),
  Quaternion: vi.fn().mockImplementation((x = 0, y = 0, z = 0, w = 1) => ({ 
    x, y, z, w,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnValue({ x, y, z, w })
  })),
  Euler: EulerMock,
  Matrix4: vi.fn().mockImplementation(() => ({
    elements: new Array(16).fill(0),
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    identity: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    multiplyMatrices: vi.fn().mockReturnThis()
  })),
  Color: vi.fn().mockImplementation((r = 1, g = 1, b = 1) => ({ r, g, b })),
  Box3: Box3Mock,
  
  // Geometries
  BufferGeometry: vi.fn().mockImplementation(() => createMockBufferGeometry()),
  BoxGeometry: vi.fn().mockImplementation((width = 1, height = 1, depth = 1) => {
    const geometry = createMockBufferGeometry();
    geometry.parameters = { width, height, depth };
    return geometry;
  }),
  CylinderGeometry: vi.fn().mockImplementation((radiusTop = 1, radiusBottom = 1, height = 1) => {
    const geometry = createMockBufferGeometry();
    geometry.parameters = { radiusTop, radiusBottom, height };
    return geometry;
  }),
  SphereGeometry: vi.fn().mockImplementation(() => createMockBufferGeometry()),
  PlaneGeometry: vi.fn().mockImplementation(() => createMockBufferGeometry()),
  ExtrudeGeometry: vi.fn().mockImplementation(() => createMockBufferGeometry()),
  
  // Shapes
  Shape: vi.fn().mockImplementation(() => ({
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    quadraticCurveTo: vi.fn().mockReturnThis(),
    bezierCurveTo: vi.fn().mockReturnThis(),
    arc: vi.fn().mockReturnThis(),
    closePath: vi.fn().mockReturnThis(),
    holes: []
  })),
  
  // Buffer attributes
  BufferAttribute: vi.fn().mockImplementation((array, itemSize, _normalized = false) => 
    createMockBufferAttribute(array, itemSize)
  ),
  Float32BufferAttribute: vi.fn().mockImplementation((array, itemSize, _normalized = false) =>
    createMockBufferAttribute(array, itemSize)
  ),
  
  // Materials
  Material: vi.fn().mockImplementation(() => ({
    type: 'Material',
    dispose: vi.fn(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnValue({ type: 'Material' })
  })),
  MeshStandardMaterial: vi.fn().mockImplementation((parameters: any = {}) => ({
    type: 'MeshStandardMaterial',
    color: parameters.color || { r: 1, g: 1, b: 1 },
    metalness: parameters.metalness || 0.5,
    roughness: parameters.roughness || 0.5,
    dispose: vi.fn(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis()
  })),
  MeshBasicMaterial: vi.fn().mockImplementation(() => ({
    type: 'MeshBasicMaterial',
    dispose: vi.fn()
  })),
  LineBasicMaterial: vi.fn().mockImplementation(() => ({
    type: 'LineBasicMaterial',
    dispose: vi.fn()
  })),
  
  // Objects
  Object3D: vi.fn().mockImplementation(() => createMockObject3D()),
  Group: vi.fn().mockImplementation(() => ({
    ...createMockObject3D(),
    type: 'Group'
  })),
  Mesh: vi.fn().mockImplementation((geometry, material) => createMockMesh(geometry, material)),
  LineSegments: vi.fn().mockImplementation(() => ({
    ...createMockObject3D(),
    type: 'LineSegments'
  })),
  
  // Core classes
  Scene: vi.fn().mockImplementation(() => ({
    ...createMockObject3D(),
    type: 'Scene',
    background: null,
    fog: null
  })),
  PerspectiveCamera: vi.fn().mockImplementation((fov = 50, aspect = 1, near = 0.1, far = 2000) => ({
    ...createMockObject3D(),
    type: 'PerspectiveCamera',
    fov, aspect, near, far,
    projectionMatrix: { elements: new Array(16).fill(0) },
    updateProjectionMatrix: vi.fn()
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    domElement: document.createElement('canvas'),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    shadowMap: { enabled: false, type: 0 }
  })),
  
  // Utilities
  Raycaster: vi.fn().mockImplementation(() => ({
    ray: { origin: createMockVector3(), direction: createMockVector3() },
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn().mockReturnValue([])
  })),
  ArrowHelper: vi.fn().mockImplementation(() => createMockObject3D()),
  
  // Constants
  DoubleSide: 2,
  FrontSide: 0,
  BackSide: 1,
  NoBlending: 0,
  NormalBlending: 1,
  AdditiveBlending: 2,
  SubtractiveBlending: 3,
  MultiplyBlending: 4,
  
  // Default export (THREE namespace)
  default: {
    Vector3: vi.fn().mockImplementation((x, y, z) => createMockVector3(x, y, z)),
    Box3: vi.fn().mockImplementation(() => createMockBox3()),
    BufferGeometry: vi.fn().mockImplementation(() => createMockBufferGeometry()),
    BoxGeometry: vi.fn().mockImplementation(() => createMockBufferGeometry()),
    Mesh: vi.fn().mockImplementation((geometry, material) => createMockMesh(geometry, material))
  }
}));

// Mock WebGL context to prevent WebGL-related errors
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockImplementation((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        canvas: {},
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getParameter: vi.fn().mockReturnValue('WebGL Mock'),
        getExtension: vi.fn().mockReturnValue({}),
        createShader: vi.fn().mockReturnValue({}),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn().mockReturnValue({}),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn().mockReturnValue({}),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        getAttribLocation: vi.fn().mockReturnValue(0),
        getUniformLocation: vi.fn().mockReturnValue({}),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        uniform1f: vi.fn(),
        uniform1i: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        viewport: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        clearDepth: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        depthFunc: vi.fn(),
        blendFunc: vi.fn()
      };
    }
    return null;
  })
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });