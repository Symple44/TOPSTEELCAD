/**
 * SceneManager - Gestion centralisée de la scène Three.js
 * Responsable de la création et gestion de tous les éléments de la scène
 */

import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

export interface SceneConfig {
  backgroundColor?: number;
  fogColor?: number;
  fogNear?: number;
  fogFar?: number;
  showGrid?: boolean;
  gridSize?: number;
  showAxes?: boolean;
  axesSize?: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private config: SceneConfig;

  // Groupes pour organiser les objets
  private profileGroup: THREE.Group;
  private holesGroup: THREE.Group;
  private labelsGroup: THREE.Group;
  private helpersGroup: THREE.Group;

  constructor(container: HTMLElement, config?: SceneConfig) {
    this.container = container;
    this.config = {
      backgroundColor: 0x222222,
      fogColor: 0x222222,
      fogNear: 500,
      fogFar: 2000,
      showGrid: true,
      gridSize: 1000,
      showAxes: true,
      axesSize: 300,
      ...config
    };

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    // Initialiser les groupes
    this.profileGroup = this.createGroup('Profile');
    this.holesGroup = this.createGroup('Holes');
    this.labelsGroup = this.createGroup('Labels');
    this.helpersGroup = this.createGroup('Helpers');

    this.setupHelpers();
    this.setupLighting();
  }

  /**
   * Crée la scène Three.js
   */
  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.config.backgroundColor!);

    if (this.config.fogColor) {
      scene.fog = new THREE.Fog(
        this.config.fogColor,
        this.config.fogNear!,
        this.config.fogFar!
      );
    }

    return scene;
  }

  /**
   * Crée la caméra
   */
  private createCamera(): THREE.PerspectiveCamera {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    camera.position.set(1000, 800, 1000);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  /**
   * Crée le renderer
   */
  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    this.container.appendChild(renderer.domElement);

    return renderer;
  }

  /**
   * Crée les contrôles de caméra
   */
  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0, 0);
    controls.update();

    return controls;
  }

  /**
   * Crée un groupe Three.js
   */
  private createGroup(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    this.scene.add(group);
    return group;
  }

  /**
   * Configure les helpers (grille, axes)
   */
  private setupHelpers(): void {
    if (this.config.showGrid) {
      const gridHelper = new THREE.GridHelper(
        this.config.gridSize!,
        50,
        0x444444,
        0x222222
      );
      gridHelper.position.y = -100;
      this.helpersGroup.add(gridHelper);
    }

    if (this.config.showAxes) {
      const axesHelper = new THREE.AxesHelper(this.config.axesSize);
      this.helpersGroup.add(axesHelper);
    }
  }

  /**
   * Configure l'éclairage de la scène
   */
  private setupLighting(): void {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Lumière directionnelle principale
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(500, 1000, 500);
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 3000;
    mainLight.shadow.camera.left = -1500;
    mainLight.shadow.camera.right = 1500;
    mainLight.shadow.camera.top = 1500;
    mainLight.shadow.camera.bottom = -1500;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.bias = -0.0005;
    this.scene.add(mainLight);

    // Lumière secondaire
    const secondaryLight = new THREE.DirectionalLight(0x8ab4ff, 0.3);
    secondaryLight.position.set(-500, 500, -500);
    this.scene.add(secondaryLight);

    // Lumière hémisphérique
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    hemiLight.position.set(0, 200, 0);
    this.scene.add(hemiLight);
  }

  /**
   * Ajoute un objet au groupe de profil
   */
  addProfile(object: THREE.Object3D): void {
    this.profileGroup.add(object);
  }

  /**
   * Ajoute des trous au groupe de trous
   */
  addHoles(object: THREE.Object3D): void {
    this.holesGroup.add(object);
  }

  /**
   * Ajoute des labels au groupe de labels
   */
  addLabels(object: THREE.Object3D): void {
    this.labelsGroup.add(object);
  }

  /**
   * Efface un groupe spécifique
   */
  clearGroup(groupName: 'profile' | 'holes' | 'labels' | 'helpers'): void {
    let group: THREE.Group;

    switch (groupName) {
      case 'profile':
        group = this.profileGroup;
        break;
      case 'holes':
        group = this.holesGroup;
        break;
      case 'labels':
        group = this.labelsGroup;
        break;
      case 'helpers':
        group = this.helpersGroup;
        break;
    }

    // Nettoyer les ressources
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    group.clear();
  }

  /**
   * Met à jour la caméra pour cadrer un objet
   */
  focusOnObject(object: THREE.Object3D, padding: number = 1.5): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * padding;

    this.camera.position.set(
      center.x + cameraDistance * 0.5,
      center.y + cameraDistance * 0.3,
      center.z + cameraDistance * 0.5
    );

    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Boucle de rendu
   */
  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Animation continue
   */
  animate(callback?: () => void): void {
    const animateLoop = () => {
      requestAnimationFrame(animateLoop);
      if (callback) callback();
      this.render();
    };
    animateLoop();
  }

  /**
   * Gère le redimensionnement
   */
  onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Active/désactive les ombres
   */
  setShadows(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
  }

  /**
   * Active/désactive la grille
   */
  toggleGrid(show: boolean): void {
    this.helpersGroup.visible = show;
  }

  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    this.clearGroup('profile');
    this.clearGroup('holes');
    this.clearGroup('labels');
    this.clearGroup('helpers');

    this.controls.dispose();
    this.renderer.dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // Getters
  getScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.PerspectiveCamera { return this.camera; }
  getRenderer(): THREE.WebGLRenderer { return this.renderer; }
  getControls(): OrbitControls { return this.controls; }
}

export default SceneManager;