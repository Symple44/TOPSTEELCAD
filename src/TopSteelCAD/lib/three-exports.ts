/**
 * Fichier centralisé pour tous les imports Three.js
 * Cela permet de gérer les dépendances 3D en un seul endroit
 */

// ========================================
// Core Three.js
// ========================================
import * as THREE from 'three';
export { THREE };
export {
  // Core
  Scene,
  Object3D,
  Group,
  WebGLRenderer,
  
  // Cameras
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
  
  // Geometries
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  ShapeGeometry,
  Shape,
  Path,
  TubeGeometry,
  LatheGeometry,
  EdgesGeometry,
  
  // Materials
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  LineBasicMaterial,
  LineDashedMaterial,
  PointsMaterial,
  ShaderMaterial,
  
  // Meshes & Objects
  Mesh,
  Line,
  LineSegments,
  Points,
  InstancedMesh,
  LOD,
  Sprite,
  
  // Lights
  Light,
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  HemisphereLight,
  
  // Loaders & Textures
  TextureLoader,
  CubeTextureLoader,
  Texture,
  CanvasTexture,
  DataTexture,
  
  // Math
  Vector2,
  Vector3,
  Vector4,
  Quaternion,
  Matrix3,
  Matrix4,
  Euler,
  Box3,
  Sphere,
  Ray,
  Plane,
  Frustum,
  Color,
  
  // Helpers
  AxesHelper,
  GridHelper,
  BoxHelper,
  DirectionalLightHelper,
  SpotLightHelper,
  PointLightHelper,
  HemisphereLightHelper,
  CameraHelper,
  
  // Render Targets
  WebGLRenderTarget,
  
  // Utils
  Clock,
  Raycaster,
  EventDispatcher,
  Layers,
  Fog,
  FogExp2,
  
  // Constants - Sides
  FrontSide,
  BackSide,
  DoubleSide,
  
  // Constants - Blending
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  CustomBlending,
  
  // Constants - Equations
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
  
  // Constants - Blend Factors
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor,
  
  // Constants - Color Spaces (vérifiés dans Three.js r158+)
  SRGBColorSpace,
  LinearSRGBColorSpace,
  
  // Constants - Depth Testing
  NeverDepth,
  AlwaysDepth,
  LessDepth,
  LessEqualDepth,
  EqualDepth,
  GreaterEqualDepth,
  GreaterDepth,
  NotEqualDepth,
  
  // Constants - Operations
  MultiplyOperation,
  MixOperation,
  AddOperation,
  
  // Constants - Tone Mapping
  NoToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  ACESFilmicToneMapping,
  
  // Constants - Shadow Maps
  PCFShadowMap,
  PCFSoftShadowMap,
  VSMShadowMap,
  
  // Constants - Shading (removed in recent Three.js versions)
  // FlatShading,
  // SmoothShading,
  
  // Constants - Texture Filters
  NearestFilter,
  NearestMipmapNearestFilter,
  NearestMipmapLinearFilter,
  LinearFilter,
  LinearMipmapNearestFilter,
  LinearMipmapLinearFilter,
  
  // Constants - Texture Wrapping
  ClampToEdgeWrapping,
  RepeatWrapping,
  MirroredRepeatWrapping
} from 'three';

// ========================================
// Three.js Examples - Loaders
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// export { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
// export { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// export { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
// export { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
// export { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
// export { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
// export { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';

// ========================================
// Three.js Examples - Exporters
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
// export { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
// export { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
// export { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter';

// ========================================
// Three.js Examples - Controls
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// export { TransformControls } from 'three/examples/jsm/controls/TransformControls';
// export { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
// export { FlyControls } from 'three/examples/jsm/controls/FlyControls';
// export { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls';
// export { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
// export { DragControls } from 'three/examples/jsm/controls/DragControls';

// ========================================
// Three.js Examples - Post-processing
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// export { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// export { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
// export { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
// export { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
// export { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
// export { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
// export { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass';
// export { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass';
// export { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';

// ========================================
// Three.js Examples - Shaders
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
// export { SMAAShader } from 'three/examples/jsm/shaders/SMAAShader';
// export { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
// export { LuminosityHighPassShader } from 'three/examples/jsm/shaders/LuminosityHighPassShader';
// export { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader';
// export { SobelOperatorShader } from 'three/examples/jsm/shaders/SobelOperatorShader';
// export { FreiChenShader } from 'three/examples/jsm/shaders/FreiChenShader';

// ========================================
// Three.js Examples - Renderers
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
// export { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';
// export { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer';

// ========================================
// Three.js Examples - Utils
// ========================================
// Note: Three.js examples modules need separate installation
// Commented out to avoid build errors
// export { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';
// export { SceneUtils } from 'three/examples/jsm/utils/SceneUtils';
// export { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';

// ========================================
// Three.js Examples - Geometries (Commentés - non disponibles dans toutes les versions)
// ========================================
// export { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry';
// export { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';
// export { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry';
// export { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
// export { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry';

// ========================================
// Three.js Examples - Lines (Commentés - non disponibles dans toutes les versions)
// ========================================
// export { Line2 } from 'three/examples/jsm/lines/Line2';
// export { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
// export { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
// export { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
// export { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';

// ========================================
// Three BVH CSG (Boolean Operations)
// ========================================
export {
  Evaluator,
  Brush,
  SUBTRACTION,
  ADDITION,
  INTERSECTION,
  DIFFERENCE
} from 'three-bvh-csg';

// ========================================
// Three-stdlib (Alternative imports)
// ========================================
// Note: Préférer les imports directs de three/examples/jsm
// three-stdlib est utilisé uniquement pour la compatibilité

// ========================================
// Type exports
// ========================================
export type {
  Intersection,
  Face,
  Event as ThreeEvent,
  LoadingManager,
  Loader,
  WebGLRendererParameters
  // WebGLRenderTargetOptions // Renommé en RenderTargetOptions dans certaines versions
} from 'three';

// ========================================
// Utility functions
// ========================================

/**
 * Dispose d'un objet Three.js et de ses enfants
 */
export function disposeObject(object: any): void {
  object.traverse((child: any) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((m: any) => m.dispose());
      } else {
        material.dispose();
      }
    }
  });
  
  object.parent?.remove(object);
}

/**
 * Clone un matériau avec de nouvelles propriétés
 */
export function cloneMaterial(
  material: any,
  props?: any
): any {
  const cloned = material.clone();
  if (props) {
    Object.assign(cloned, props);
  }
  return cloned;
}

/**
 * Crée un matériau métallique standard
 */
export function createMetalMaterial(options: {
  color?: string | number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
}): any {
  // THREE is already imported at the top of the file
  return new THREE.MeshStandardMaterial({
    color: options.color || 0x8b9dc3,
    roughness: options.roughness ?? 0.4,
    metalness: options.metalness ?? 0.9,
    envMapIntensity: options.envMapIntensity ?? 1
  });
}

/**
 * Calcule la boîte englobante d'un groupe d'objets
 */
export function computeBoundingBox(objects: THREE.Object3D[]): THREE.Box3 {
  // THREE is already imported at the top of the file
  const box = new THREE.Box3();
  objects.forEach(obj => {
    box.expandByObject(obj);
  });
  return box;
}