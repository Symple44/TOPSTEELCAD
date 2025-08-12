import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { TransformControls } from 'three-stdlib';
import { EventBus } from '../core/EventBus';

/**
 * Modes de contrôle
 */
export enum ControlMode {
  ORBIT = 'orbit',           // Navigation orbitale
  TRANSFORM = 'transform',   // Transformation d'objets
  FLY = 'fly',              // Vol libre
  FIRST_PERSON = 'firstPerson' // Vue première personne
}

/**
 * Modes de transformation
 */
export enum TransformMode {
  TRANSLATE = 'translate',
  ROTATE = 'rotate',
  SCALE = 'scale'
}

/**
 * Configuration des contrôles
 */
export interface ControlsConfig {
  mode: ControlMode;
  enableDamping: boolean;
  dampingFactor: number;
  enableZoom: boolean;
  zoomSpeed: number;
  enableRotate: boolean;
  rotateSpeed: number;
  enablePan: boolean;
  panSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  enableKeys: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

/**
 * ControlsManager - Gestionnaire des contrôles de navigation
 * 
 * Responsabilités:
 * - Gestion des contrôles de caméra (OrbitControls)
 * - Gestion des contrôles de transformation
 * - Gestion des interactions souris/clavier
 * - Modes de navigation alternatifs
 */
export class ControlsManager {
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private domElement: HTMLElement;
  private eventBus: EventBus;
  
  // Contrôles
  private orbitControls!: OrbitControls;
  private transformControls: TransformControls | null = null;
  private currentMode: ControlMode = ControlMode.ORBIT;
  
  // Configuration
  private config: ControlsConfig = {
    mode: ControlMode.ORBIT,
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    zoomSpeed: 1.0,
    enableRotate: true,
    rotateSpeed: 1.0,
    enablePan: true,
    panSpeed: 1.0,
    minDistance: 500,  // Empêcher zoom trop proche (50cm minimum)
    maxDistance: 15000, // Limiter zoom arrière (15m maximum)
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    enableKeys: true,
    autoRotate: false,
    autoRotateSpeed: 2.0
  };
  
  // État
  private isTransforming = false;
  private transformTarget: THREE.Object3D | null = null;
  
  // Interaction
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  
  constructor(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, domElement: HTMLElement, eventBus: EventBus, config?: Partial<ControlsConfig>) {
    this.camera = camera;
    this.domElement = domElement;
    this.eventBus = eventBus;
    
    // Appliquer la configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initialize();
    this.setupEventListeners();
  }
  
  /**
   * Initialise les contrôles
   */
  private initialize(): void {
    // Créer les OrbitControls
    this.initializeOrbitControls();
    
    // Créer les TransformControls si nécessaire
    if (this.config.mode === ControlMode.TRANSFORM) {
      this.initializeTransformControls();
    }
  }
  
  /**
   * Initialise les OrbitControls
   */
  private initializeOrbitControls(): void {
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    
    // Configuration de base
    this.orbitControls.enableDamping = this.config.enableDamping;
    this.orbitControls.dampingFactor = this.config.dampingFactor;
    this.orbitControls.enableZoom = this.config.enableZoom;
    this.orbitControls.zoomSpeed = this.config.zoomSpeed;
    this.orbitControls.enableRotate = this.config.enableRotate;
    this.orbitControls.rotateSpeed = this.config.rotateSpeed;
    this.orbitControls.enablePan = this.config.enablePan;
    this.orbitControls.panSpeed = this.config.panSpeed;
    
    // Limites
    this.orbitControls.minDistance = this.config.minDistance;
    this.orbitControls.maxDistance = this.config.maxDistance;
    this.orbitControls.minPolarAngle = this.config.minPolarAngle;
    this.orbitControls.maxPolarAngle = this.config.maxPolarAngle;
    
    // Auto-rotation
    this.orbitControls.autoRotate = this.config.autoRotate;
    this.orbitControls.autoRotateSpeed = this.config.autoRotateSpeed;
    
    // Touches
    this.orbitControls.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown'
    };
    
    // Boutons souris
    this.orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // Écouteurs
    this.orbitControls.addEventListener('change', () => {
      this.onControlsChange();
    });
    
    this.orbitControls.addEventListener('start', () => {
      this.onControlsStart();
    });
    
    this.orbitControls.addEventListener('end', () => {
      this.onControlsEnd();
    });
  }
  
  /**
   * Initialise les TransformControls
   */
  private initializeTransformControls(): void {
    this.transformControls = new TransformControls(this.camera, this.domElement);
    
    // Configuration
    (this.transformControls as any).size = 1;
    (this.transformControls as any).space = 'local';
    
    // Écouteurs - TransformControls utilise des événements non typés
    (this.transformControls as any).addEventListener('change', () => {
      this.onTransformChange();
    });
    
    (this.transformControls as any).addEventListener('dragging-changed', (event: any) => {
      // Désactiver OrbitControls pendant la transformation
      this.orbitControls.enabled = !event.value;
      this.isTransforming = event.value;
    });
    
    (this.transformControls as any).addEventListener('objectChange', () => {
      if (this.transformTarget) {
        this.eventBus.emit('transform:objectChanged', {
          object: this.transformTarget,
          position: this.transformTarget.position.toArray(),
          rotation: this.transformTarget.rotation.toArray(),
          scale: this.transformTarget.scale.toArray()
        });
      }
    });
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de contrôle
    this.eventBus.on('controls:mode', (mode: ControlMode) => {
      this.setControlMode(mode);
    });
    
    this.eventBus.on('controls:reset', () => {
      this.resetControls();
    });
    
    // Événements de transformation
    this.eventBus.on('transform:attach', (object: THREE.Object3D) => {
      this.attachTransformControls(object);
    });
    
    this.eventBus.on('transform:detach', () => {
      this.detachTransformControls();
    });
    
    this.eventBus.on('transform:mode', (mode: TransformMode) => {
      this.setTransformMode(mode);
    });
    
    // Événements de navigation
    this.eventBus.on('controls:zoom', (factor: number) => {
      this.zoom(factor);
    });
    
    this.eventBus.on('controls:rotate', (angle: { x: number; y: number }) => {
      this.rotate(angle.x, angle.y);
    });
    
    this.eventBus.on('controls:pan', (delta: { x: number; y: number }) => {
      this.pan(delta.x, delta.y);
    });
    
    // Événements souris
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));
    
    // Événements clavier
    this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
    this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Événements tactiles
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  /**
   * Gère le changement des contrôles
   */
  private onControlsChange(): void {
    this.eventBus.emit('controls:changed', {
      target: this.orbitControls.target.toArray(),
      position: this.camera.position.toArray(),
      zoom: this.camera instanceof THREE.OrthographicCamera ? this.camera.zoom : 1
    });
  }
  
  /**
   * Gère le début de l'interaction
   */
  private onControlsStart(): void {
    this.eventBus.emit('controls:start');
  }
  
  /**
   * Gère la fin de l'interaction
   */
  private onControlsEnd(): void {
    this.eventBus.emit('controls:end');
  }
  
  /**
   * Gère le changement de transformation
   */
  private onTransformChange(): void {
    if (this.transformTarget) {
      this.eventBus.emit('transform:changed', {
        object: this.transformTarget
      });
    }
  }
  
  /**
   * Gère le mouvement de la souris
   */
  private onPointerMove(event: PointerEvent): void {
    // Calculer la position normalisée
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Émettre l'événement
    this.eventBus.emit('pointer:move', {
      pointer: this.pointer,
      event
    });
  }
  
  /**
   * Gère le clic souris
   */
  private onPointerDown(event: PointerEvent): void {
    this.eventBus.emit('pointer:down', {
      pointer: this.pointer,
      button: event.button,
      event
    });
  }
  
  /**
   * Gère le relâchement souris
   */
  private onPointerUp(event: PointerEvent): void {
    this.eventBus.emit('pointer:up', {
      pointer: this.pointer,
      button: event.button,
      event
    });
  }
  
  /**
   * Gère la molette de la souris
   */
  private onWheel(event: WheelEvent): void {
    this.eventBus.emit('wheel', {
      deltaY: event.deltaY,
      event
    });
  }
  
  /**
   * Gère l'appui sur une touche
   */
  private onKeyDown(event: KeyboardEvent): void {
    this.eventBus.emit('key:down', {
      key: event.key,
      code: event.code,
      event
    });
    
    // Raccourcis pour les modes de transformation
    if (this.transformControls) {
      switch (event.key.toLowerCase()) {
        case 'g':
          this.setTransformMode(TransformMode.TRANSLATE);
          break;
        case 'r':
          this.setTransformMode(TransformMode.ROTATE);
          break;
        case 's':
          this.setTransformMode(TransformMode.SCALE);
          break;
        case 'escape':
          this.detachTransformControls();
          break;
      }
    }
  }
  
  /**
   * Gère le relâchement d'une touche
   */
  private onKeyUp(event: KeyboardEvent): void {
    this.eventBus.emit('key:up', {
      key: event.key,
      code: event.code,
      event
    });
  }
  
  /**
   * Gère le début du toucher
   */
  private onTouchStart(event: TouchEvent): void {
    this.eventBus.emit('touch:start', { event });
  }
  
  /**
   * Gère le mouvement tactile
   */
  private onTouchMove(event: TouchEvent): void {
    this.eventBus.emit('touch:move', { event });
  }
  
  /**
   * Gère la fin du toucher
   */
  private onTouchEnd(event: TouchEvent): void {
    this.eventBus.emit('touch:end', { event });
  }
  
  // === API Publique ===
  
  /**
   * Met à jour les contrôles
   */
  update(deltaTime: number): void {
    if (this.orbitControls.enabled) {
      this.orbitControls.update();
    }
  }
  
  /**
   * Définit le mode de contrôle
   */
  setControlMode(mode: ControlMode): void {
    this.currentMode = mode;
    
    switch (mode) {
      case ControlMode.ORBIT:
        this.orbitControls.enabled = true;
        if (this.transformControls) {
          this.detachTransformControls();
        }
        break;
        
      case ControlMode.TRANSFORM:
        if (!this.transformControls) {
          this.initializeTransformControls();
        }
        break;
        
      // TODO: Implémenter les autres modes
      case ControlMode.FLY:
      case ControlMode.FIRST_PERSON:
        console.warn(`Control mode ${mode} not yet implemented`);
        break;
    }
    
    this.eventBus.emit('controls:modeChanged', mode);
  }
  
  /**
   * Attache les contrôles de transformation à un objet
   */
  attachTransformControls(object: THREE.Object3D): void {
    if (!this.transformControls) {
      this.initializeTransformControls();
    }
    
    if (this.transformControls) {
      this.transformControls.attach(object);
      this.transformTarget = object;
      
      // Ajouter à la scène si nécessaire
      this.eventBus.emit('scene:addHelper', this.transformControls);
    }
  }
  
  /**
   * Détache les contrôles de transformation
   */
  detachTransformControls(): void {
    if (this.transformControls) {
      this.transformControls.detach();
      this.transformTarget = null;
      
      // Retirer de la scène
      this.eventBus.emit('scene:removeHelper', this.transformControls);
    }
  }
  
  /**
   * Définit le mode de transformation
   */
  setTransformMode(mode: TransformMode): void {
    if (this.transformControls) {
      (this.transformControls as any).mode = mode;
      this.eventBus.emit('transform:modeChanged', mode);
    }
  }
  
  /**
   * Réinitialise les contrôles
   */
  resetControls(): void {
    this.orbitControls.reset();
    this.eventBus.emit('controls:reset');
  }
  
  /**
   * Zoom
   */
  zoom(factor: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const distance = this.camera.position.distanceTo(this.orbitControls.target);
      const newDistance = distance * factor;
      
      const direction = new THREE.Vector3()
        .subVectors(this.camera.position, this.orbitControls.target)
        .normalize();
      
      this.camera.position.copy(
        this.orbitControls.target.clone().add(direction.multiplyScalar(newDistance))
      );
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.zoom /= factor;
      this.camera.updateProjectionMatrix();
    }
  }
  
  /**
   * Rotation
   */
  rotate(deltaX: number, deltaY: number): void {
    // Utiliser les méthodes internes d'OrbitControls
    const element = this.domElement;
    const rect = element.getBoundingClientRect();
    
    // Simuler un mouvement de souris pour la rotation
    const event = {
      clientX: rect.left + rect.width / 2 + deltaX,
      clientY: rect.top + rect.height / 2 + deltaY
    };
    
    // TODO: Implémenter une rotation programmatique propre
  }
  
  /**
   * Pan
   */
  pan(deltaX: number, deltaY: number): void {
    // TODO: Implémenter le pan programmatique
  }
  
  /**
   * Active/désactive les contrôles
   */
  setEnabled(enabled: boolean): void {
    this.orbitControls.enabled = enabled;
    
    if (this.transformControls) {
      (this.transformControls as any).enabled = enabled;
    }
  }
  
  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<ControlsConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Appliquer à OrbitControls
    if (config.enableDamping !== undefined) {
      this.orbitControls.enableDamping = config.enableDamping;
    }
    if (config.dampingFactor !== undefined) {
      this.orbitControls.dampingFactor = config.dampingFactor;
    }
    if (config.enableZoom !== undefined) {
      this.orbitControls.enableZoom = config.enableZoom;
    }
    if (config.zoomSpeed !== undefined) {
      this.orbitControls.zoomSpeed = config.zoomSpeed;
    }
    if (config.enableRotate !== undefined) {
      this.orbitControls.enableRotate = config.enableRotate;
    }
    if (config.rotateSpeed !== undefined) {
      this.orbitControls.rotateSpeed = config.rotateSpeed;
    }
    if (config.enablePan !== undefined) {
      this.orbitControls.enablePan = config.enablePan;
    }
    if (config.panSpeed !== undefined) {
      this.orbitControls.panSpeed = config.panSpeed;
    }
    if (config.minDistance !== undefined) {
      this.orbitControls.minDistance = config.minDistance;
    }
    if (config.maxDistance !== undefined) {
      this.orbitControls.maxDistance = config.maxDistance;
    }
    if (config.autoRotate !== undefined) {
      this.orbitControls.autoRotate = config.autoRotate;
    }
    if (config.autoRotateSpeed !== undefined) {
      this.orbitControls.autoRotateSpeed = config.autoRotateSpeed;
    }
  }

  /**
   * Met à jour les limites de zoom selon la taille du contenu
   */
  updateZoomLimits(contentSize: number): void {
    // Calculer les distances min/max selon la taille du contenu
    const minDistance = Math.max(contentSize * 0.05, 200);    // 5% ou minimum 20cm
    const maxDistance = Math.min(contentSize * 1.5, 25000);   // 150% ou maximum 25m
    
    // Mettre à jour la configuration
    this.config.minDistance = minDistance;
    this.config.maxDistance = maxDistance;
    
    // Appliquer aux contrôles
    this.orbitControls.minDistance = minDistance;
    this.orbitControls.maxDistance = maxDistance;
    
    console.log(`🔍 Limites zoom: ${minDistance.toFixed(0)}mm ↔ ${maxDistance.toFixed(0)}mm`);
  }
  
  /**
   * Obtient les OrbitControls
   */
  getOrbitControls(): OrbitControls {
    return this.orbitControls;
  }
  
  /**
   * Obtient les TransformControls
   */
  getTransformControls(): TransformControls | null {
    return this.transformControls;
  }
  
  /**
   * Obtient le mode actuel
   */
  getCurrentMode(): ControlMode {
    return this.currentMode;
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.orbitControls.dispose();
    
    if (this.transformControls) {
      this.transformControls.dispose();
    }
    
    // Retirer les écouteurs
    this.domElement.removeEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.removeEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    this.domElement.removeEventListener('keydown', this.onKeyDown.bind(this));
    this.domElement.removeEventListener('keyup', this.onKeyUp.bind(this));
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this));
    
    this.eventBus.emit('controls:disposed');
  }
}