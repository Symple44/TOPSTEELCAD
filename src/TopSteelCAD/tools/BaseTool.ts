import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * Interface de base pour tous les outils
 */
export interface Tool {
  name: string;
  icon: string;
  isActive: boolean;
  
  activate(): void;
  deactivate(): void;
  dispose(): void;
}

/**
 * Configuration de base pour les outils
 */
export interface ToolConfig {
  scene: THREE.Scene;
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  eventBus: EventBus;
}

/**
 * Classe de base abstraite pour tous les outils
 */
export abstract class BaseTool implements Tool {
  public abstract name: string;
  public abstract icon: string;
  public isActive: boolean = false;
  
  protected scene: THREE.Scene;
  protected camera: THREE.Camera;
  protected canvas: HTMLCanvasElement;
  protected eventBus: EventBus;
  
  constructor(config: ToolConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.canvas = config.canvas;
    this.eventBus = config.eventBus;
  }
  
  /**
   * Active l'outil
   */
  public activate(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.onActivate();
    this.eventBus.emit(`tool:${this.name}:activated`);
  }
  
  /**
   * Désactive l'outil
   */
  public deactivate(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.onDeactivate();
    this.eventBus.emit(`tool:${this.name}:deactivated`);
  }
  
  /**
   * Nettoie les ressources de l'outil
   */
  public dispose(): void {
    this.deactivate();
    this.onDispose();
  }
  
  /**
   * Méthodes à implémenter par les classes dérivées
   */
  protected abstract onActivate(): void;
  protected abstract onDeactivate(): void;
  protected abstract onDispose(): void;
  
  /**
   * Méthodes utilitaires communes
   */
  protected getMousePosition(event: MouseEvent): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
  
  protected raycast(mousePos: THREE.Vector2): THREE.Intersection[] {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePos, this.camera);
    return raycaster.intersectObjects(this.scene.children, true);
  }
}

/**
 * Gestionnaire d'outils
 */
export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private activeTool: Tool | null = null;
  private eventBus: EventBus;
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }
  
  /**
   * Enregistre un nouvel outil
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.eventBus.emit('tool:registered', { name: tool.name });
  }
  
  /**
   * Active un outil par son nom
   */
  activateTool(name: string): void {
    const tool = this.tools.get(name);
    if (!tool) {
      console.warn(`Tool '${name}' not found`);
      return;
    }
    
    // Désactive l'outil actuel
    if (this.activeTool && this.activeTool !== tool) {
      this.activeTool.deactivate();
    }
    
    // Active le nouvel outil
    tool.activate();
    this.activeTool = tool;
  }
  
  /**
   * Désactive l'outil actuel
   */
  deactivateCurrentTool(): void {
    if (this.activeTool) {
      this.activeTool.deactivate();
      this.activeTool = null;
    }
  }
  
  /**
   * Obtient un outil par son nom
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Obtient l'outil actif
   */
  getActiveTool(): Tool | null {
    return this.activeTool;
  }
  
  /**
   * Obtient tous les outils enregistrés
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Nettoie tous les outils
   */
  dispose(): void {
    this.tools.forEach(tool => tool.dispose());
    this.tools.clear();
    this.activeTool = null;
  }
}