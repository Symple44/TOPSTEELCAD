/**
 * Stubs pour les passes de post-processing
 * Version minimale pour éviter les erreurs de compilation
 */
import * as THREE from 'three';

export class Pass {
  enabled: boolean = true;
  needsSwap: boolean = true;
  clear: boolean = false;
  renderToScreen: boolean = false;

  setSize(width: number, height: number): void {}
  render(renderer: any, writeBuffer: any, readBuffer: any, deltaTime?: number, maskActive?: boolean): void {}
  dispose(): void {}
}

export class EffectComposer {
  renderer: THREE.WebGLRenderer;
  renderTarget1: THREE.WebGLRenderTarget;
  renderTarget2: THREE.WebGLRenderTarget;
  writeBuffer: THREE.WebGLRenderTarget;
  readBuffer: THREE.WebGLRenderTarget;
  passes: Pass[] = [];

  constructor(renderer: THREE.WebGLRenderer, renderTarget?: THREE.WebGLRenderTarget) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    this.renderTarget1 = renderTarget || new THREE.WebGLRenderTarget(size.x, size.y);
    this.renderTarget2 = this.renderTarget1.clone();
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  }

  addPass(pass: Pass): void {
    this.passes.push(pass);
  }

  removePass(pass: Pass): void {
    const index = this.passes.indexOf(pass);
    if (index !== -1) {
      this.passes.splice(index, 1);
    }
  }

  render(deltaTime?: number): void {
    // Stub implementation - just render directly
    if (this.renderer) {
      // Base rendering handled by ViewerEngine
    }
  }

  setSize(width: number, height: number): void {
    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);
    this.passes.forEach(pass => pass.setSize(width, height));
  }

  dispose(): void {
    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.passes.forEach(pass => pass.dispose());
  }
}

export class RenderPass extends Pass {
  scene: THREE.Scene;
  camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
  }
}

export class OutlinePass extends Pass {
  selectedObjects: THREE.Object3D[] = [];
  visibleEdgeColor: THREE.Color;
  hiddenEdgeColor: THREE.Color;
  edgeThickness: number = 1;
  edgeStrength: number = 3;
  pulsePeriod: number = 0;
  usePatternTexture: boolean = false;
  renderCamera: THREE.Camera;
  resolution: THREE.Vector2;

  constructor(resolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.visibleEdgeColor = new THREE.Color(0xffffff);
    this.hiddenEdgeColor = new THREE.Color(0x190a05);
    this.renderCamera = camera;
    this.resolution = resolution.clone();
  }
  
  setSize(width: number, height: number): void {
    this.resolution.set(width, height);
  }
}

export class SMAAPass extends Pass {
  constructor(width: number, height: number) {
    super();
  }
}

export class UnrealBloomPass extends Pass {
  strength: number = 1.5;
  radius: number = 0.4;
  threshold: number = 0.85;

  constructor(resolution: THREE.Vector2, strength?: number, radius?: number, threshold?: number) {
    super();
    if (strength !== undefined) this.strength = strength;
    if (radius !== undefined) this.radius = radius;
    if (threshold !== undefined) this.threshold = threshold;
  }
}

export class ShaderPass extends Pass {
  uniforms: any;
  material: THREE.ShaderMaterial;
  fsQuad: any;

  constructor(shader: any) {
    super();
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms || {});
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader || '',
      fragmentShader: shader.fragmentShader || ''
    });
  }
}

export const FXAAShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'resolution': { value: new THREE.Vector2(1 / 1024, 1 / 512) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(tDiffuse, vUv);
    }
  `
};