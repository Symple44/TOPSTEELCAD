import * as THREE from 'three';
import { BaseTool, ToolConfig } from './BaseTool';

/**
 * VisibilityTool - Outil pour gérer la visibilité des éléments
 * 
 * Fonctionnalités:
 * - Masquer/Afficher des éléments sélectionnés
 * - Masquer/Afficher par type d'élément
 * - Inverser la visibilité
 * - Tout afficher/masquer
 */
export class VisibilityTool extends BaseTool {
  public name = 'visibility';
  public icon = '👁️';
  
  private hiddenElements: Map<string, {
    wasVisible: boolean;
    hiddenBy: 'user' | 'type' | 'all';
  }> = new Map();
  
  constructor(config: ToolConfig) {
    super(config);
  }
  
  protected onActivate(): void {
    this.canvas.style.cursor = 'pointer';
  }
  
  protected onDeactivate(): void {
    this.canvas.style.cursor = 'default';
  }
  
  protected onDispose(): void {
    this.showAll();
    this.hiddenElements.clear();
  }
  
  /**
   * Masque les éléments spécifiés
   */
  public hide(elementIds: string[]): void {
    if (elementIds.length === 0) {
      this.eventBus.emit('tool:visibility:error', { 
        message: 'Aucun élément sélectionné à masquer' 
      });
      return;
    }
    
    const hidden: string[] = [];
    
    elementIds.forEach(id => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === id && object.visible) {
          // Sauvegarde l'état avant masquage
          if (!this.hiddenElements.has(id)) {
            this.hiddenElements.set(id, {
              wasVisible: object.visible,
              hiddenBy: 'user'
            });
          }
          
          object.visible = false;
          hidden.push(id);
        }
      });
    });
    
    this.eventBus.emit('tool:visibility:hidden', { 
      elements: hidden,
      total: this.hiddenElements.size 
    });
  }
  
  /**
   * Affiche les éléments spécifiés
   */
  public show(elementIds: string[]): void {
    const shown: string[] = [];
    
    elementIds.forEach(id => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === id && !object.visible) {
          object.visible = true;
          this.hiddenElements.delete(id);
          shown.push(id);
        }
      });
    });
    
    this.eventBus.emit('tool:visibility:shown', { 
      elements: shown,
      remaining: this.hiddenElements.size 
    });
  }
  
  /**
   * Bascule la visibilité des éléments
   */
  public toggle(elementIds: string[]): void {
    const hidden: string[] = [];
    const shown: string[] = [];
    
    elementIds.forEach(id => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === id) {
          if (object.visible) {
            // Masquer
            if (!this.hiddenElements.has(id)) {
              this.hiddenElements.set(id, {
                wasVisible: true,
                hiddenBy: 'user'
              });
            }
            object.visible = false;
            hidden.push(id);
          } else {
            // Afficher
            object.visible = true;
            this.hiddenElements.delete(id);
            shown.push(id);
          }
        }
      });
    });
    
    this.eventBus.emit('tool:visibility:toggled', { 
      hidden,
      shown,
      total: this.hiddenElements.size 
    });
  }
  
  /**
   * Masque tous les éléments d'un type donné
   */
  public hideByType(type: string): void {
    const hidden: string[] = [];
    
    this.scene.traverse((object) => {
      if (object.userData?.elementType === type && object.visible) {
        const id = object.userData.elementId;
        if (id) {
          if (!this.hiddenElements.has(id)) {
            this.hiddenElements.set(id, {
              wasVisible: true,
              hiddenBy: 'type'
            });
          }
          object.visible = false;
          hidden.push(id);
        }
      }
    });
    
    this.eventBus.emit('tool:visibility:hiddenByType', { 
      type,
      elements: hidden,
      total: this.hiddenElements.size 
    });
  }
  
  /**
   * Affiche tous les éléments d'un type donné
   */
  public showByType(type: string): void {
    const shown: string[] = [];
    
    this.scene.traverse((object) => {
      if (object.userData?.elementType === type && !object.visible) {
        const id = object.userData.elementId;
        if (id && this.hiddenElements.has(id)) {
          object.visible = true;
          this.hiddenElements.delete(id);
          shown.push(id);
        }
      }
    });
    
    this.eventBus.emit('tool:visibility:shownByType', { 
      type,
      elements: shown,
      remaining: this.hiddenElements.size 
    });
  }
  
  /**
   * Masque tous les éléments
   */
  public hideAll(): void {
    const hidden: string[] = [];
    
    this.scene.traverse((object) => {
      if (object.userData?.elementId && object.visible) {
        const id = object.userData.elementId;
        if (!this.hiddenElements.has(id)) {
          this.hiddenElements.set(id, {
            wasVisible: true,
            hiddenBy: 'all'
          });
        }
        object.visible = false;
        hidden.push(id);
      }
    });
    
    this.eventBus.emit('tool:visibility:allHidden', { 
      count: hidden.length 
    });
  }
  
  /**
   * Affiche tous les éléments masqués
   */
  public showAll(): void {
    let count = 0;
    
    this.hiddenElements.forEach((state, elementId) => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === elementId) {
          object.visible = state.wasVisible;
          count++;
        }
      });
    });
    
    this.hiddenElements.clear();
    
    this.eventBus.emit('tool:visibility:allShown', { 
      count 
    });
  }
  
  /**
   * Inverse la visibilité de tous les éléments
   */
  public invertVisibility(): void {
    const hidden: string[] = [];
    const shown: string[] = [];
    
    this.scene.traverse((object) => {
      if (object.userData?.elementId) {
        const id = object.userData.elementId;
        
        if (object.visible) {
          // Masquer
          if (!this.hiddenElements.has(id)) {
            this.hiddenElements.set(id, {
              wasVisible: true,
              hiddenBy: 'user'
            });
          }
          object.visible = false;
          hidden.push(id);
        } else {
          // Afficher
          object.visible = true;
          this.hiddenElements.delete(id);
          shown.push(id);
        }
      }
    });
    
    this.eventBus.emit('tool:visibility:inverted', { 
      hidden,
      shown 
    });
  }
  
  /**
   * Obtient l'état de visibilité actuel
   */
  public getVisibilityState(): {
    hiddenCount: number;
    hiddenElements: Array<{
      id: string;
      hiddenBy: 'user' | 'type' | 'all';
    }>;
  } {
    return {
      hiddenCount: this.hiddenElements.size,
      hiddenElements: Array.from(this.hiddenElements.entries()).map(([id, state]) => ({
        id,
        hiddenBy: state.hiddenBy
      }))
    };
  }
  
  /**
   * Restaure l'état de visibilité précédent
   */
  public restoreVisibility(): void {
    this.hiddenElements.forEach((state, elementId) => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === elementId) {
          object.visible = state.wasVisible;
        }
      });
    });
    
    const count = this.hiddenElements.size;
    this.hiddenElements.clear();
    
    this.eventBus.emit('tool:visibility:restored', { count });
  }
}