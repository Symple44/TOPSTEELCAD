import * as THREE from 'three';
import { 
  EffectComposer,
  RenderPass,
  OutlinePass,
  SMAAPass,
  UnrealBloomPass,
  ShaderPass,
  FXAAShader
} from '../lib/post-processing-stubs';
import { EventBus } from './EventBus';

/**
 * Configuration du pipeline de rendu
 */
export interface RenderingConfig {
  // Post-processing
  enablePostProcessing?: boolean;
  enableOutline?: boolean;
  enableBloom?: boolean;
  enableAntialiasing?: boolean;
  enableSSAO?: boolean;
  
  // Outline
  outlineColor?: string;
  outlineThickness?: number;
  outlineStrength?: number;
  
  // Bloom
  bloomIntensity?: number;
  bloomThreshold?: number;
  bloomRadius?: number;
  
  // Qualité
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  
  // Performance
  enableLOD?: boolean;
  enableInstancing?: boolean;
  enableFrustumCulling?: boolean;
  maxDrawCalls?: number;
}

/**
 * Statistiques de rendu
 */
export interface RenderStats {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
  renderTime: number;
}

/**
 * RenderingPipeline - Gestionnaire du pipeline de rendu avancé
 * 
 * Responsabilités:
 * - Configuration du pipeline de post-processing
 * - Gestion des effets visuels (outline, bloom, SSAO)
 * - Optimisation du rendu (LOD, instancing, culling)
 * - Monitoring des performances
 */
export class RenderingPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private composer: EffectComposer | null = null;
  private eventBus: EventBus;
  
  // Passes de post-processing
  private renderPass: RenderPass | null = null;
  private outlinePass: OutlinePass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private smaaPass: SMAAPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  
  // Configuration
  private config: RenderingConfig = {
    enablePostProcessing: false,  // Désactivé temporairement pour debug
    enableOutline: false,
    enableBloom: false,
    enableAntialiasing: false,
    enableSSAO: false,
    
    outlineColor: '#ff6600',
    outlineThickness: 2,
    outlineStrength: 100,
    
    bloomIntensity: 0.5,
    bloomThreshold: 0.8,
    bloomRadius: 0.5,
    
    quality: 'high',
    
    enableLOD: true,
    enableInstancing: true,
    enableFrustumCulling: true,
    maxDrawCalls: 1000
  };
  
  // Statistiques
  private stats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    renderTime: 0
  };
  
  // Sélection et survol
  private selectedObjects: THREE.Object3D[] = [];
  private hoveredObject: THREE.Object3D | null = null;
  
  // Performance
  private lastRenderTime = 0;
  
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, config?: Partial<RenderingConfig>) {
    this.renderer = renderer;
    this.scene = scene;
    this.eventBus = EventBus.getInstance();
    
    // Appliquer la configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.setupEventListeners();
    
    // Initialiser le pipeline si le post-processing est activé
    if (this.config.enablePostProcessing) {
      this.initializePostProcessing();
    }
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de configuration
    this.eventBus.on('rendering:config', (config: Partial<RenderingConfig>) => {
      this.updateConfig(config);
    });
    
    // Événements de qualité
    this.eventBus.on('rendering:quality', (quality: 'low' | 'medium' | 'high' | 'ultra') => {
      this.setQuality(quality);
    });
  }
  
  /**
   * Initialise le post-processing
   */
  private initializePostProcessing(): void {
    const { width, height } = this.renderer.getSize(new THREE.Vector2());
    
    // Créer le composer
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(width, height);
    
    // Créer une caméra temporaire pour éviter les erreurs
    // Elle sera remplacée lors du premier render
    const tempCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    tempCamera.position.set(10, 10, 10);
    tempCamera.lookAt(0, 0, 0);
    
    // Ajouter le render pass de base
    this.renderPass = new RenderPass(this.scene, tempCamera);
    this.composer.addPass(this.renderPass);
    
    // Ajouter l'outline pass si activé
    if (this.config.enableOutline) {
      this.initializeOutlinePass(width, height, tempCamera);
    }
    
    // Ajouter le bloom pass si activé
    if (this.config.enableBloom) {
      this.initializeBloomPass(width, height);
    }
    
    // Ajouter l'antialiasing
    if (this.config.enableAntialiasing) {
      this.initializeAntialiasing(width, height);
    }
  }
  
  /**
   * Initialise l'outline pass
   */
  private initializeOutlinePass(width: number, height: number, camera?: THREE.Camera): void {
    const resolution = new THREE.Vector2(width, height);
    
    // Utiliser la caméra fournie ou créer une temporaire
    const outlineCamera = camera || new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    this.outlinePass = new OutlinePass(resolution, this.scene, outlineCamera);
    this.outlinePass.edgeThickness = this.config.outlineThickness!;
    this.outlinePass.edgeStrength = this.config.outlineStrength!;
    this.outlinePass.visibleEdgeColor.set(this.config.outlineColor!);
    this.outlinePass.hiddenEdgeColor.set(this.config.outlineColor!);
    
    // Configuration avancée
    this.outlinePass.pulsePeriod = 2; // Période de pulsation en secondes
    this.outlinePass.usePatternTexture = false; // Pas de texture de motif
    
    this.composer!.addPass(this.outlinePass);
  }
  
  /**
   * Initialise le bloom pass
   */
  private initializeBloomPass(width: number, height: number): void {
    const resolution = new THREE.Vector2(width, height);
    
    this.bloomPass = new UnrealBloomPass(
      resolution,
      this.config.bloomIntensity!,
      this.config.bloomRadius!,
      this.config.bloomThreshold!
    );
    
    this.composer!.addPass(this.bloomPass);
  }
  
  /**
   * Initialise l'antialiasing
   */
  private initializeAntialiasing(width: number, height: number): void {
    // Préférer SMAA pour de meilleures performances
    if (this.config.quality === 'high' || this.config.quality === 'ultra') {
      this.smaaPass = new SMAAPass(width, height);
      this.composer!.addPass(this.smaaPass);
    } else {
      // Utiliser FXAA pour les qualités inférieures
      this.fxaaPass = new ShaderPass(FXAAShader);
      const pixelRatio = this.renderer.getPixelRatio();
      this.fxaaPass.uniforms['resolution'].value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
      this.composer!.addPass(this.fxaaPass);
    }
  }
  
  /**
   * Effectue le rendu de la scène
   */
  render(camera: THREE.Camera, selectedIds: Set<string>, hoveredId: string | null): void {
    const startTime = performance.now();
    
    // DEBUG: Vérifier les propriétés du renderer et de la scène
    if ((RenderingPipeline as unknown).debugCount === undefined) {
      (RenderingPipeline as unknown).debugCount = 0;
    }
    
    // Mettre à jour la caméra dans les passes
    if (this.renderPass) {
      this.renderPass.camera = camera;
    }
    if (this.outlinePass) {
      this.outlinePass.renderCamera = camera;
    }
    
    // Mettre à jour les objets sélectionnés pour l'outline
    this.updateOutlineSelection(selectedIds, hoveredId);
    
    // Effectuer le rendu
    if (this.composer && this.config.enablePostProcessing) {
      this.composer.render();
    } else {
      // Rendu direct sans post-processing
      this.renderer.clear();
      this.renderer.render(this.scene, camera);
      
    }
    
    // Mettre à jour les statistiques
    this.updateStats(performance.now() - startTime);
  }
  
  /**
   * Met à jour les objets sélectionnés pour l'outline
   */
  private updateOutlineSelection(selectedIds: Set<string>, hoveredId: string | null): void {
    if (!this.outlinePass || !this.config.enableOutline) return;
    
    const newSelectedObjects: THREE.Object3D[] = [];
    
    // Parcourir la scène pour trouver les objets sélectionnés
    this.scene.traverse((object) => {
      if (object.userData?.elementId) {
        const id = object.userData.elementId;
        
        // Ajouter les objets sélectionnés
        if (selectedIds.has(id)) {
          newSelectedObjects.push(object);
        }
        
        // Gérer l'objet survolé (couleur différente)
        if (hoveredId === id && hoveredId !== null) {
          // Utiliser une couleur différente pour le survol
          this.outlinePass!.visibleEdgeColor.set('#ffaa00');
          this.hoveredObject = object;
        }
      }
    });
    
    // Mettre à jour l'outline pass
    this.outlinePass.selectedObjects = newSelectedObjects;
    this.selectedObjects = newSelectedObjects;
    
    // Réinitialiser la couleur si pas de survol
    if (!hoveredId && this.hoveredObject) {
      this.outlinePass.visibleEdgeColor.set(this.config.outlineColor!);
      this.hoveredObject = null;
    }
  }
  
  /**
   * Met à jour les statistiques de rendu
   */
  private updateStats(renderTime: number): void {
    const info = this.renderer.info;
    
    this.stats = {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length || 0,
      renderTime
    };
    
    // Émettre les statistiques toutes les secondes
    const now = performance.now();
    if (now - this.lastRenderTime > 1000) {
      this.eventBus.emit('rendering:stats', this.stats);
      this.lastRenderTime = now;
    }
  }
  
  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<RenderingConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    // Réinitialiser le post-processing si nécessaire
    if (oldConfig.enablePostProcessing !== this.config.enablePostProcessing) {
      if (this.config.enablePostProcessing) {
        this.initializePostProcessing();
      } else {
        this.disposePostProcessing();
      }
    }
    
    // Mettre à jour les passes existantes
    if (this.outlinePass) {
      this.outlinePass.edgeThickness = this.config.outlineThickness!;
      this.outlinePass.edgeStrength = this.config.outlineStrength!;
      this.outlinePass.visibleEdgeColor.set(this.config.outlineColor!);
    }
    
    if (this.bloomPass) {
      (this.bloomPass as unknown).intensity = this.config.bloomIntensity!;
      (this.bloomPass as unknown).radius = this.config.bloomRadius!;
      (this.bloomPass as unknown).threshold = this.config.bloomThreshold!;
    }
  }
  
  /**
   * Définit le niveau de qualité
   */
  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.config.quality = quality;
    
    // Ajuster les paramètres en fonction de la qualité
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.config.enableBloom = false;
        this.config.enableSSAO = false;
        this.config.enableAntialiasing = false;
        break;
        
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.config.enableBloom = false;
        this.config.enableSSAO = false;
        this.config.enableAntialiasing = true;
        break;
        
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.config.enableBloom = true;
        this.config.enableSSAO = false;
        this.config.enableAntialiasing = true;
        break;
        
      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.config.enableBloom = true;
        this.config.enableSSAO = true;
        this.config.enableAntialiasing = true;
        break;
    }
    
    // Réinitialiser le post-processing avec les nouveaux paramètres
    if (this.config.enablePostProcessing) {
      this.disposePostProcessing();
      this.initializePostProcessing();
    }
    
    this.eventBus.emit('rendering:qualityChanged', quality);
  }
  
  /**
   * Gère le redimensionnement
   */
  resize(width: number, height: number): void {
    // Mettre à jour le composer
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    
    // Mettre à jour les passes
    if (this.outlinePass) {
      this.outlinePass.resolution.set(width, height);
    }
    
    if (this.smaaPass) {
      this.smaaPass.setSize(width, height);
    }
    
    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      this.fxaaPass.uniforms['resolution'].value.set(
        1 / (width * pixelRatio),
        1 / (height * pixelRatio)
      );
    }
  }
  
  /**
   * Active/désactive un effet
   */
  toggleEffect(effect: 'outline' | 'bloom' | 'antialiasing', enabled: boolean): void {
    switch (effect) {
      case 'outline':
        if (this.outlinePass) {
          this.outlinePass.enabled = enabled;
        }
        this.config.enableOutline = enabled;
        break;
        
      case 'bloom':
        if (this.bloomPass) {
          this.bloomPass.enabled = enabled;
        }
        this.config.enableBloom = enabled;
        break;
        
      case 'antialiasing':
        if (this.smaaPass) {
          this.smaaPass.enabled = enabled;
        }
        if (this.fxaaPass) {
          this.fxaaPass.enabled = enabled;
        }
        this.config.enableAntialiasing = enabled;
        break;
    }
    
    this.eventBus.emit('rendering:effectToggled', { effect, enabled });
  }
  
  /**
   * Nettoie le post-processing
   */
  private disposePostProcessing(): void {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    
    this.renderPass = null;
    this.outlinePass = null;
    this.bloomPass = null;
    this.smaaPass = null;
    this.fxaaPass = null;
  }
  
  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    this.disposePostProcessing();
    this.selectedObjects = [];
    this.hoveredObject = null;
    
    this.eventBus.emit('rendering:disposed');
  }
  
  // === Getters ===
  
  getStats(): RenderStats {
    return { ...this.stats };
  }
  
  getConfig(): RenderingConfig {
    return { ...this.config };
  }
  
  isPostProcessingEnabled(): boolean {
    return this.config.enablePostProcessing || false;
  }
}