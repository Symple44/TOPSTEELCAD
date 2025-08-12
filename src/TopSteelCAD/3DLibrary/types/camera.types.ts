import * as THREE from 'three';

/**
 * Direction de vue prédéfinie
 */
export type ViewDirection = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso';

/**
 * Configuration de la caméra
 */
export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  defaultPosition: THREE.Vector3;
  animationDuration: number;
  zoomMargin: number;
}

/**
 * Preset de caméra pour une vue
 */
export interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  zoom?: number;
  fov?: number;
}

/**
 * État de la caméra
 */
export interface CameraState {
  isOrthographic: boolean;
  currentView: ViewDirection;
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
}

/**
 * Options d'animation de caméra
 */
export interface CameraAnimationOptions {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

/**
 * Événements de caméra
 */
export interface CameraEvents {
  'camera:projectionChanged': { isOrthographic: boolean };
  'camera:viewChanged': { view: ViewDirection };
  'camera:animationStarted': { from: CameraState; to: CameraState };
  'camera:animationCompleted': void;
  'camera:zoomChanged': { zoom: number };
}