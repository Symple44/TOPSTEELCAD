import * as THREE from 'three';
import { ViewerEngine, ViewerConfig } from './ViewerEngine';

/**
 * Wrapper pour ViewerEngine qui accepte un container HTML
 */
export class ViewerEngineWrapper {
  private engine: ViewerEngine;
  private canvas: HTMLCanvasElement;
  
  constructor(container: HTMLElement, config?: any) {
    // Créer un canvas dans le container
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);
    
    // Configuration complète pour ViewerEngine
    const fullConfig: ViewerConfig = {
      canvas: this.canvas,
      backgroundColor: config?.backgroundColor || '#1a1a1a',
      antialias: config?.performance?.antialias ?? true,
      shadows: config?.performance?.shadows ?? true,
      pixelRatio: config?.performance?.pixelRatio || window.devicePixelRatio,
      maxFPS: config?.performance?.maxFPS || 60,
      debug: config?.debug || false
    };
    
    // Créer l'instance de ViewerEngine
    this.engine = new ViewerEngine(this.canvas, fullConfig);
    
    // Ajouter les éléments de base pour le ViewerEngine
    this.setupBasicScene();
  }
  
  /**
   * Configure la scène de base (fond, lumières, grille)
   */
  private setupBasicScene(): void {
    const scene = (this.engine as any).sceneManager.getScene();
    
    // Fond dégradé
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Grille
    const gridHelper = new THREE.GridHelper(10000, 100, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Axes
    const axesHelper = new THREE.AxesHelper(5000);
    scene.add(axesHelper);
  }
  
  /**
   * Accès au SceneManager pour ajouter des éléments
   */
  get sceneManager() {
    // Accéder à la propriété publique sceneManager
    return (this.engine as any).sceneManager;
  }
  
  /**
   * Démarre le rendu
   */
  start() {
    this.engine.start();
  }
  
  /**
   * Arrête le rendu
   */
  stop() {
    this.engine.stop();
  }
  
  /**
   * Nettoie les ressources
   */
  dispose() {
    this.engine.dispose();
    this.canvas.remove();
  }
}