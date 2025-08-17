import * as THREE from 'three';
import { BaseTool, ToolConfig } from './BaseTool';

/**
 * IsolateTool - Outil pour isoler des éléments sélectionnés
 * 
 * Fonctionnalités:
 * - Isole les éléments sélectionnés en masquant les autres
 * - Garde une trace des éléments masqués pour restauration
 * - Support du mode toggle (réafficher tout)
 */
export class IsolateTool extends BaseTool {
  public name = 'isolate';
  public icon = '🎯';
  
  private isolatedElements: Set<string> = new Set();
  private hiddenElements: Map<string, boolean> = new Map();
  private isIsolated: boolean = false;
  
  constructor(config: ToolConfig) {
    super(config);
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Écoute les changements de sélection
    this.eventBus.on('selection:changed', (data: { ids: string[] }) => {
      if (this.isActive && data.ids.length > 0) {
        this.updateIsolation(data.ids);
      }
    });
  }
  
  protected onActivate(): void {
    // Obtient la sélection actuelle depuis l'EventBus
    this.eventBus.emit('tool:request:selection');
  }
  
  protected onDeactivate(): void {
    // Restaure la visibilité si nécessaire
    if (this.isIsolated) {
      this.exitIsolation();
    }
  }
  
  protected onDispose(): void {
    this.exitIsolation();
    this.isolatedElements.clear();
    this.hiddenElements.clear();
  }
  
  /**
   * Isole les éléments spécifiés
   */
  public isolate(elementIds: string[]): void {
    if (elementIds.length === 0) {
      this.eventBus.emit('tool:isolate:error', { 
        message: 'Aucun élément sélectionné à isoler' 
      });
      return;
    }
    
    // Si déjà en mode isolation, sort d'abord
    if (this.isIsolated) {
      this.exitIsolation();
    }
    
    // Enregistre les éléments à isoler
    this.isolatedElements = new Set(elementIds);
    
    // Parcourt la scène pour masquer les autres éléments
    this.scene.traverse((object) => {
      if (object.userData?.elementId) {
        const id = object.userData.elementId;
        
        if (!this.isolatedElements.has(id)) {
          // Sauvegarde l'état de visibilité actuel
          this.hiddenElements.set(id, object.visible);
          // Masque l'élément
          object.visible = false;
        }
      }
    });
    
    this.isIsolated = true;
    
    this.eventBus.emit('tool:isolate:applied', {
      isolated: Array.from(this.isolatedElements),
      hidden: Array.from(this.hiddenElements.keys())
    });
  }
  
  /**
   * Met à jour l'isolation avec de nouveaux éléments
   */
  public updateIsolation(elementIds: string[]): void {
    this.isolate(elementIds);
  }
  
  /**
   * Sort du mode isolation
   */
  public exitIsolation(): void {
    if (!this.isIsolated) return;
    
    // Restaure la visibilité originale
    this.hiddenElements.forEach((wasVisible, elementId) => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === elementId) {
          object.visible = wasVisible;
        }
      });
    });
    
    this.hiddenElements.clear();
    this.isolatedElements.clear();
    this.isIsolated = false;
    
    this.eventBus.emit('tool:isolate:exited');
  }
  
  /**
   * Bascule le mode isolation
   */
  public toggleIsolation(elementIds?: string[]): void {
    if (this.isIsolated) {
      this.exitIsolation();
    } else if (elementIds && elementIds.length > 0) {
      this.isolate(elementIds);
    }
  }
  
  /**
   * Obtient l'état actuel de l'isolation
   */
  public getIsolationState(): {
    isIsolated: boolean;
    isolatedElements: string[];
    hiddenElements: string[];
  } {
    return {
      isIsolated: this.isIsolated,
      isolatedElements: Array.from(this.isolatedElements),
      hiddenElements: Array.from(this.hiddenElements.keys())
    };
  }
  
  /**
   * Ajoute des éléments à l'isolation existante
   */
  public addToIsolation(elementIds: string[]): void {
    if (!this.isIsolated) {
      this.isolate(elementIds);
      return;
    }
    
    elementIds.forEach(id => {
      this.isolatedElements.add(id);
      
      // Rend visible l'élément s'il était masqué
      this.scene.traverse((object) => {
        if (object.userData?.elementId === id) {
          object.visible = true;
          this.hiddenElements.delete(id);
        }
      });
    });
    
    this.eventBus.emit('tool:isolate:updated', {
      isolated: Array.from(this.isolatedElements)
    });
  }
  
  /**
   * Retire des éléments de l'isolation
   */
  public removeFromIsolation(elementIds: string[]): void {
    if (!this.isIsolated) return;
    
    elementIds.forEach(id => {
      this.isolatedElements.delete(id);
      
      // Masque l'élément
      this.scene.traverse((object) => {
        if (object.userData?.elementId === id) {
          this.hiddenElements.set(id, object.visible);
          object.visible = false;
        }
      });
    });
    
    // Si plus aucun élément isolé, sort du mode
    if (this.isolatedElements.size === 0) {
      this.exitIsolation();
    } else {
      this.eventBus.emit('tool:isolate:updated', {
        isolated: Array.from(this.isolatedElements)
      });
    }
  }
}