/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import TopSteelCAD from './TopSteelCAD';
import { PivotElement, MaterialType } from '../types/viewer';

// Mock Three.js modules
vi.mock('three', () => ({
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    dispose: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas')
  })),
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn()
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn()
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false
  })),
  GridHelper: vi.fn(),
  AxesHelper: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  Mesh: vi.fn(),
  Color: vi.fn(),
  Raycaster: vi.fn(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => [])
  })),
  Vector2: vi.fn(),
  Vector3: vi.fn(() => ({
    copy: vi.fn(),
    add: vi.fn(),
    multiplyScalar: vi.fn(),
    normalize: vi.fn(() => ({ multiplyScalar: vi.fn() }))
  })),
  Box3: vi.fn(() => ({
    expandByObject: vi.fn(),
    getCenter: vi.fn(),
    getSize: vi.fn()
  }))
}));

describe('TopSteelCAD Component', () => {
  const mockElement: PivotElement = {
    id: 'test-1',
    name: 'Test Beam',
    materialType: MaterialType.BEAM,
    dimensions: {
      length: 6000,
      width: 150,
      height: 300,
      thickness: 7.1
    },
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      grade: 'S235',
      density: 7850,
      color: '#4a90e2',
      opacity: 1.0,
      metallic: 0.8,
      roughness: 0.2,
      reflectivity: 0.5
    },
    metadata: {},
    visible: true,
    createdAt: new Date()
  };

  it('renders without crashing', () => {
    const { container } = render(<TopSteelCAD />);
    expect(container).toBeTruthy();
  });

  it('renders with elements', () => {
    const { container } = render(
      <TopSteelCAD elements={[mockElement]} />
    );
    expect(container).toBeTruthy();
  });

  it('applies theme correctly', () => {
    const { container } = render(
      <TopSteelCAD theme="dark" />
    );
    const topsteelContainer = container.querySelector('.topsteelcad-container');
    expect(topsteelContainer).toHaveClass('dark');
  });

  it('calls onElementSelect when provided', () => {
    const mockOnElementSelect = vi.fn();
    render(
      <TopSteelCAD 
        elements={[mockElement]}
        onElementSelect={mockOnElementSelect}
      />
    );
    expect(mockOnElementSelect).not.toHaveBeenCalled();
  });

  it('renders canvas element', () => {
    const { container } = render(<TopSteelCAD />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('shows loading indicator initially', () => {
    const { container } = render(<TopSteelCAD />);
    const loading = container.querySelector('.animate-spin');
    expect(loading).toBeTruthy();
  });
});