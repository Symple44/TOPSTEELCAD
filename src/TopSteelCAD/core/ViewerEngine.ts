import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { RenderingPipeline } from './RenderingPipeline';
import { EventBus } from './EventBus';
import { CameraController } from '../cameras/CameraController';
import { SelectionManager } from '../selection/SelectionManager';
import { ControlsManager } from '../controls/ControlsManager';
import { PivotElement } from '@/types/viewer';

/**
 * Configuration du viewer
 */
export interface ViewerConfig {
  canvas: HTMLCanvasElement;
  backgroundColor?: string;
  antialias?: boolean;
  shadows?: boolean;
  pixelRatio?: number;
  maxFPS?: number;
  debug?: boolean;
  logarithmicDepthBuffer?: boolean;
  precision?: 'lowp' | 'mediump' | 'highp';
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

/**
 * État du viewer
 */
export interface ViewerState {
  isInitialized: boolean;
  isRendering: boolean;
  isPaused: boolean;
  frameCount: number;
  lastFrameTime: number;
  fps: number;
  elements: Map<string, PivotElement>;
  selectedIds: Set<string>;
  hoveredId: string | null;
}

/**
 * ViewerEngine - Moteur principal du viewer 3D
 * 
 * Singleton qui orchestre tous les composants du viewer
 */
export class ViewerEngine {
  private static instance: ViewerEngine;
  
  // Core components
  private renderer!: THREE.WebGLRenderer;
  private sceneManager!: SceneManager;
  private renderingPipeline!: RenderingPipeline;
  private cameraController!: CameraController;
  
  // Callback pour l'animation personnalisée
  public onBeforeRender?: () => void;
  private selectionManager!: SelectionManager;
  private controlsManager!: ControlsManager;
  private eventBus: EventBus;
  
  // Configuration
  private config!: ViewerConfig;
  
  // État
  private state: ViewerState = {
    isInitialized: false,
    isRendering: false,
    isPaused: false,
    frameCount: 0,
    lastFrameTime: 0,
    fps: 0,
    elements: new Map(),
    selectedIds: new Set(),
    hoveredId: null
  };
  
  // Animation
  private animationId: number | null = null;
  private clock = new THREE.Clock();
  
  // Constructeur public pour permettre l'instanciation directe
  constructor(canvas?: HTMLCanvasElement, config?: Partial<ViewerConfig>) {
    this.eventBus = EventBus.getInstance();
    this.setupEventListeners();
    
    // Si canvas et config sont fournis, initialiser directement
    if (canvas && config) {
      const fullConfig: ViewerConfig = {
        canvas,
        ...config
      };
      this.initialize(fullConfig);
    }
  }
  
  /**
   * Obtient l'instance unique du ViewerEngine
   */
  static getInstance(): ViewerEngine {
    if (!ViewerEngine.instance) {
      ViewerEngine.instance = new ViewerEngine();
    }
    return ViewerEngine.instance;
  }
  
  /**
   * Initialise le viewer
   */
  async initialize(config: ViewerConfig): Promise<void> {
    if (this.state.isInitialized) {
      return;
    }
    
    this.config = config;
    
    try {
      // Créer le renderer WebGL
      this.initializeRenderer();
      
      // Initialiser les composants core
      this.sceneManager = new SceneManager(this.eventBus);
      this.renderingPipeline = new RenderingPipeline(this.renderer, this.sceneManager.getScene());
      this.cameraController = new CameraController(config.canvas, this.eventBus);
      this.selectionManager = new SelectionManager(this.eventBus);
      this.controlsManager = new ControlsManager(this.cameraController.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera, config.canvas, this.eventBus);
      
      
      // Connecter les composants
      this.cameraController.attachControls(this.controlsManager.getOrbitControls());
      
      
      // Initialiser la scène
      this.sceneManager.initialize();
      
      // Configuration de base
      if (config.backgroundColor) {
        this.sceneManager.setBackgroundColor(config.backgroundColor);
      }
      
      // Marquer comme initialisé
      this.state.isInitialized = true;
      
      // Émettre l'événement d'initialisation
      this.eventBus.emit('engine:initialized', {
        engine: this,
        config: this.config
      });
      
      // Démarrer le rendu
      this.startRendering();
      
    } catch (error) {
      console.error('Failed to initialize ViewerEngine:', error);
      this.eventBus.emit('engine:error', { error });
      throw error;
    }
  }
  
  /**
   * Initialise le renderer WebGL
   */
  private initializeRenderer(): void {
    const { 
      canvas, 
      antialias = true, 
      shadows = false, 
      pixelRatio,
      logarithmicDepthBuffer = true,
      precision = 'highp',
      powerPreference = 'high-performance'
    } = this.config;
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      alpha: false,
      powerPreference,
      preserveDrawingBuffer: false,
      logarithmicDepthBuffer, // Anti Z-fighting pour CAD
      precision // Haute précision pour géométries techniques
    });
    
    // Configuration du renderer pour CAD
    this.renderer.setPixelRatio(pixelRatio || Math.min(window.devicePixelRatio, 2)); // Limiter pour performance
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = shadows;
    if (shadows) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Configuration couleur pour CAD technique
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.LinearToneMapping; // Plus neutre pour CAD
    this.renderer.toneMappingExposure = 1.0;
    
    // Couleur de clear bleutée prononcée
    this.renderer.setClearColor('#e6f2ff', 1);
    
    // Gestion du resize - stocker la référence pour pouvoir la nettoyer
    this.handleResize();
    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
  }
  
  private resizeHandler?: () => void;
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de sélection
    this.eventBus.on('selection:changed', (data: { ids: string[] }) => {
      this.state.selectedIds = new Set(data.ids);
    });
    
    // Événements de hover
    this.eventBus.on('hover:changed', (data: { id: string | null }) => {
      this.state.hoveredId = data.id;
    });
    
    // Événements d'éléments
    this.eventBus.on('element:added', (element: PivotElement) => {
      this.addElement(element);
    });
    
    this.eventBus.on('element:removed', (id: string) => {
      this.removeElement(id);
    });
    
    // Événements de contrôle
    this.eventBus.on('rendering:pause', () => {
      this.pauseRendering();
    });
    
    this.eventBus.on('rendering:resume', () => {
      this.resumeRendering();
    });
  }
  
  /**
   * Démarre le rendu
   */
  private startRendering(): void {
    if (this.state.isRendering) return;
    
    this.state.isRendering = true;
    this.state.isPaused = false;
    this.clock.start();
    
    this.animate();
    
    this.eventBus.emit('rendering:started');
  }
  
  /**
   * Méthode publique pour démarrer le rendu
   */
  public start(): void {
    this.startRendering();
  }
  
  /**
   * Méthode publique pour arrêter le rendu
   */
  public stop(): void {
    this.stopRendering();
  }
  
  /**
   * Boucle d'animation
   */
  private animate = (): void => {
    if (!this.state.isRendering || this.state.isPaused) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    // Calculer le delta time
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // Calculer les FPS
    this.updateFPS();
    
    // Mettre à jour les composants
    this.update(deltaTime, elapsedTime);
    
    // Rendre la scène
    this.render();
    
    // Incrémenter le compteur de frames
    this.state.frameCount++;
    
  };
  
  /**
   * Met à jour tous les composants
   */
  private update(deltaTime: number, elapsedTime: number): void {
    // Exécuter le callback personnalisé si défini
    if (this.onBeforeRender) {
      this.onBeforeRender();
    }
    
    // Mettre à jour les contrôles
    this.controlsManager.update(deltaTime);
    
    // Mettre à jour la scène
    this.sceneManager.update(deltaTime, elapsedTime);
    
    // Mettre à jour les animations
    // TODO: AnimationManager.update(deltaTime);
    
    // Émettre l'événement de mise à jour
    this.eventBus.emit('engine:update', {
      deltaTime,
      elapsedTime,
      frameCount: this.state.frameCount
    });
  }
  
  /**
   * Effectue le rendu
   */
  private render(): void {
    if (!this.renderer || !this.sceneManager || !this.cameraController) {
      return;
    }
    
    
    // Utiliser le pipeline de rendu
    this.renderingPipeline.render(
      this.cameraController.camera,
      this.state.selectedIds,
      this.state.hoveredId
    );
    
    // Émettre l'événement de rendu
    this.eventBus.emit('engine:render', {
      frameCount: this.state.frameCount,
      fps: this.state.fps
    });
  }
  
  /**
   * Calcule les FPS
   */
  private updateFPS(): void {
    const currentTime = performance.now();
    
    if (currentTime >= this.state.lastFrameTime + 1000) {
      this.state.fps = Math.round((this.state.frameCount * 1000) / (currentTime - this.state.lastFrameTime));
      this.state.lastFrameTime = currentTime;
      this.state.frameCount = 0;
      
      // Émettre les stats de performance
      this.eventBus.emit('performance:stats', {
        fps: this.state.fps,
        memory: (performance as unknown).memory ? (performance as unknown).memory.usedJSHeapSize / 1048576 : 0
      });
    }
  }
  
  /**
   * Gère le redimensionnement
   */
  handleResize(width?: number, height?: number): void {
    if (!this.config.canvas || !this.renderer) return;
    
    // Utiliser les dimensions fournies ou celles du canvas
    const w = width || this.config.canvas.clientWidth;
    const h = height || this.config.canvas.clientHeight;
    
    const actualWidth = w;
    const actualHeight = h;
    
    
    // Mettre à jour le renderer
    this.renderer.setSize(actualWidth, actualHeight);
    
    // Mettre à jour la caméra
    if (this.cameraController) {
      const camera = this.cameraController.camera;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = actualWidth / actualHeight;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        const aspect = actualWidth / actualHeight;
        const frustumSize = 2000;
        camera.left = -frustumSize * aspect;
        camera.right = frustumSize * aspect;
        camera.top = frustumSize;
        camera.bottom = -frustumSize;
        camera.updateProjectionMatrix();
      }
    }
    
    // Émettre l'événement de resize
    this.eventBus.emit('viewport:resized', { width: actualWidth, height: actualHeight });
  }
  
  // === API Publique ===
  
  /**
   * Ajoute un élément à la scène
   */
  addElement(element: PivotElement): void {
    this.state.elements.set(element.id, element);
    this.sceneManager.addElement(element);
    
    this.eventBus.emit('scene:elementAdded', { element });
  }
  
  /**
   * Retire un élément de la scène
   */
  removeElement(id: string): void {
    if (this.state.elements.has(id)) {
      const element = this.state.elements.get(id)!;
      this.state.elements.delete(id);
      this.sceneManager.removeElement(id);
      
      this.eventBus.emit('scene:elementRemoved', { id, element });
    }
  }
  
  /**
   * Charge plusieurs éléments
   */
  loadElements(elements: PivotElement[]): void {
    elements.forEach(element => this.addElement(element));
    
    // Ajuster la vue pour cadrer tous les éléments
    if (elements.length > 0) {
      this.cameraController.fitToElements(elements);
    }
  }
  
  /**
   * Efface tous les éléments
   */
  clearElements(): void {
    this.state.elements.forEach((_, id) => this.removeElement(id));
  }
  
  /**
   * Sélectionne un ou plusieurs éléments
   */
  selectElements(ids: string[], exclusive: boolean = true): void {
    this.selectionManager.select(ids, exclusive);
  }
  
  /**
   * Désélectionne tous les éléments
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }
  
  /**
   * Met en pause le rendu
   */
  pauseRendering(): void {
    this.state.isPaused = true;
    this.eventBus.emit('rendering:paused');
  }
  
  /**
   * Reprend le rendu
   */
  resumeRendering(): void {
    if (!this.state.isRendering) {
      this.startRendering();
    } else {
      this.state.isPaused = false;
      this.animate();
      this.eventBus.emit('rendering:resumed');
    }
  }
  
  /**
   * Arrête le rendu
   */
  stopRendering(): void {
    this.state.isRendering = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.clock.stop();
    this.eventBus.emit('rendering:stopped');
  }
  
  /**
   * Change la couleur de fond
   */
  setBackgroundColor(color: string): void {
    if (this.sceneManager) {
      this.sceneManager.setBackgroundColor(color);
    }
    if (this.renderer) {
      this.renderer.setClearColor(color, 1);
    }
  }

  /**
   * Prend une capture d'écran
   */
  takeScreenshot(format: 'png' | 'jpeg' = 'png', quality: number = 0.95): string {
    this.render(); // S'assurer que le rendu est à jour
    return this.renderer.domElement.toDataURL(`image/${format}`, quality);
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    // Arrêter le rendu
    this.stopRendering();
    
    // Nettoyer les composants
    this.sceneManager?.dispose();
    this.renderingPipeline?.dispose();
    this.cameraController?.dispose();
    this.selectionManager?.dispose();
    this.controlsManager?.dispose();
    
    // Nettoyer le renderer
    this.renderer?.dispose();
    
    // Retirer les event listeners
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    
    // Nettoyer l'état
    this.state.elements.clear();
    this.state.selectedIds.clear();
    
    // Marquer comme non initialisé
    this.state.isInitialized = false;
    
    // Émettre l'événement de nettoyage
    this.eventBus.emit('engine:disposed');
  }
  
  // === Getters ===
  
  get isInitialized(): boolean {
    return this.state.isInitialized;
  }
  
  get scene(): THREE.Scene | null {
    return this.sceneManager?.getScene() || null;
  }
  
  get camera(): THREE.Camera | null {
    return this.cameraController?.camera || null;
  }
  
  getScene(): THREE.Scene | null {
    return this.sceneManager?.getScene() || null;
  }
  
  getCamera(): THREE.Camera | null {
    return this.cameraController?.camera || null;
  }
  
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer || null;
  }
  
  getControlsManager(): ControlsManager | null {
    return this.controlsManager || null;
  }
  
  getCameraController(): CameraController | null {
    return this.cameraController || null;
  }
  
  get elements(): Map<string, PivotElement> {
    return this.state.elements;
  }
  
  get selectedIds(): Set<string> {
    return this.state.selectedIds;
  }
  
  get fps(): number {
    return this.state.fps;
  }
  
  get stats(): ViewerState {
    return { ...this.state };
  }
}

// Export de l'instance globale
export const viewerEngine = ViewerEngine.getInstance();