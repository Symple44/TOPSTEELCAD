import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * Modes de sélection
 */
export enum SelectionMode {
  SINGLE = 'single',      // Un seul élément à la fois
  MULTIPLE = 'multiple',  // Plusieurs éléments
  BOX = 'box',           // Sélection par boîte
  LASSO = 'lasso'        // Sélection au lasso
}

/**
 * Configuration de la sélection
 */
export interface SelectionConfig {
  mode: SelectionMode;
  highlightColor: string;
  highlightOpacity: number;
  enableHover: boolean;
  hoverColor: string;
}

/**
 * SelectionManager - Gestionnaire de la sélection d'éléments
 * 
 * Responsabilités:
 * - Gestion de la sélection simple et multiple
 * - Gestion du survol (hover)
 * - Sélection par boîte et lasso
 * - Mise en évidence visuelle
 */
export class SelectionManager {
  private eventBus: EventBus;
  private selectedIds: Set<string> = new Set();
  private hoveredId: string | null = null;
  private lastSelectedId: string | null = null;
  
  // Configuration
  private config: SelectionConfig = {
    mode: SelectionMode.MULTIPLE,
    highlightColor: '#ff6600',
    highlightOpacity: 0.3,
    enableHover: true,
    hoverColor: '#ffaa00'
  };
  
  // Matériaux de sélection
  private selectionMaterial: THREE.Material;
  private hoverMaterial: THREE.Material;
  private originalMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();
  
  // Sélection par boîte
  private isBoxSelecting = false;
  private boxStartPoint: THREE.Vector2 | null = null;
  private boxEndPoint: THREE.Vector2 | null = null;
  private selectionBox: THREE.Box3 | null = null;
  
  constructor(eventBus: EventBus, config?: Partial<SelectionConfig>) {
    this.eventBus = eventBus;
    
    // Appliquer la configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Créer les matériaux de sélection
    this.selectionMaterial = this.createSelectionMaterial(this.config.highlightColor);
    this.hoverMaterial = this.createSelectionMaterial(this.config.hoverColor);
    
    this.setupEventListeners();
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de sélection
    this.eventBus.on('input:click', (data: { elementId: string | null; event: MouseEvent }) => {
      if (data.elementId) {
        this.handleElementClick(data.elementId, data.event);
      } else {
        this.clearSelection();
      }
    });
    
    // Événements de survol
    this.eventBus.on('input:hover', (data: { elementId: string | null }) => {
      this.setHoveredElement(data.elementId);
    });
    
    // Événements de sélection par boîte
    this.eventBus.on('selection:startBox', (data: { point: THREE.Vector2 }) => {
      this.startBoxSelection(data.point);
    });
    
    this.eventBus.on('selection:updateBox', (data: { point: THREE.Vector2 }) => {
      this.updateBoxSelection(data.point);
    });
    
    this.eventBus.on('selection:endBox', () => {
      this.endBoxSelection();
    });
    
    // Configuration
    this.eventBus.on('selection:mode', (mode: SelectionMode) => {
      this.setSelectionMode(mode);
    });
  }
  
  /**
   * Crée un matériau de sélection
   */
  private createSelectionMaterial(color: string): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: this.config.highlightOpacity,
      side: THREE.DoubleSide
    });
  }
  
  /**
   * Gère le clic sur un élément
   */
  private handleElementClick(elementId: string, event: MouseEvent): void {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    switch (this.config.mode) {
      case SelectionMode.SINGLE:
        this.selectSingle(elementId);
        break;
        
      case SelectionMode.MULTIPLE:
        if (isCtrlPressed) {
          this.toggleSelection(elementId);
        } else if (isShiftPressed && this.lastSelectedId) {
          this.selectRange(this.lastSelectedId, elementId);
        } else {
          this.selectSingle(elementId);
        }
        break;
    }
    
    this.lastSelectedId = elementId;
  }
  
  /**
   * Sélectionne un seul élément
   */
  private selectSingle(elementId: string): void {
    // Désélectionner tout
    this.clearSelection();
    
    // Sélectionner le nouvel élément
    this.selectedIds.add(elementId);
    this.highlightElement(elementId, true);
    
    // Émettre l'événement
    this.emitSelectionChanged();
  }
  
  /**
   * Bascule la sélection d'un élément
   */
  private toggleSelection(elementId: string): void {
    if (this.selectedIds.has(elementId)) {
      this.selectedIds.delete(elementId);
      this.highlightElement(elementId, false);
    } else {
      this.selectedIds.add(elementId);
      this.highlightElement(elementId, true);
    }
    
    this.emitSelectionChanged();
  }
  
  /**
   * Sélectionne une plage d'éléments
   */
  private selectRange(fromId: string, toId: string): void {
    // TODO: Implémenter la sélection par plage
    // Nécessite une liste ordonnée des éléments
    console.warn('Range selection not yet implemented');
    this.selectSingle(toId);
  }
  
  /**
   * Met en évidence un élément
   */
  private highlightElement(elementId: string, highlight: boolean): void {
    this.eventBus.emit('scene:highlightElement', {
      id: elementId,
      highlight,
      color: this.config.highlightColor
    });
  }
  
  /**
   * Définit l'élément survolé
   */
  private setHoveredElement(elementId: string | null): void {
    // Retirer le survol précédent
    if (this.hoveredId && this.hoveredId !== elementId) {
      this.eventBus.emit('scene:hoverElement', {
        id: this.hoveredId,
        hover: false
      });
    }
    
    // Appliquer le nouveau survol
    if (elementId && !this.selectedIds.has(elementId)) {
      this.eventBus.emit('scene:hoverElement', {
        id: elementId,
        hover: true,
        color: this.config.hoverColor
      });
    }
    
    this.hoveredId = elementId;
    
    // Émettre l'événement
    this.eventBus.emit('hover:changed', { id: elementId });
  }
  
  /**
   * Démarre la sélection par boîte
   */
  private startBoxSelection(point: THREE.Vector2): void {
    if (this.config.mode !== SelectionMode.BOX) return;
    
    this.isBoxSelecting = true;
    this.boxStartPoint = point.clone();
    this.boxEndPoint = point.clone();
    
    this.eventBus.emit('selection:boxStarted', { startPoint: point });
  }
  
  /**
   * Met à jour la sélection par boîte
   */
  private updateBoxSelection(point: THREE.Vector2): void {
    if (!this.isBoxSelecting || !this.boxStartPoint) return;
    
    this.boxEndPoint = point.clone();
    
    // Créer la boîte de sélection
    const min = new THREE.Vector3(
      Math.min(this.boxStartPoint.x, this.boxEndPoint.x),
      Math.min(this.boxStartPoint.y, this.boxEndPoint.y),
      -1000
    );
    
    const max = new THREE.Vector3(
      Math.max(this.boxStartPoint.x, this.boxEndPoint.x),
      Math.max(this.boxStartPoint.y, this.boxEndPoint.y),
      1000
    );
    
    this.selectionBox = new THREE.Box3(min, max);
    
    // Mettre à jour l'affichage de la boîte
    this.eventBus.emit('selection:boxUpdated', {
      startPoint: this.boxStartPoint,
      endPoint: this.boxEndPoint,
      box: this.selectionBox
    });
  }
  
  /**
   * Termine la sélection par boîte
   */
  private endBoxSelection(): void {
    if (!this.isBoxSelecting || !this.selectionBox) return;
    
    // Sélectionner les éléments dans la boîte
    this.eventBus.emit('selection:getElementsInBox', {
      box: this.selectionBox,
      callback: (elementIds: string[]) => {
        this.clearSelection();
        elementIds.forEach(id => {
          this.selectedIds.add(id);
          this.highlightElement(id, true);
        });
        this.emitSelectionChanged();
      }
    });
    
    // Réinitialiser
    this.isBoxSelecting = false;
    this.boxStartPoint = null;
    this.boxEndPoint = null;
    this.selectionBox = null;
    
    this.eventBus.emit('selection:boxEnded');
  }
  
  /**
   * Émet l'événement de changement de sélection
   */
  private emitSelectionChanged(): void {
    const ids = Array.from(this.selectedIds);
    
    this.eventBus.emit('selection:changed', { ids });
    
    // Émettre aussi les détails si nécessaire
    if (ids.length === 1) {
      this.eventBus.emit('selection:single', { id: ids[0] });
    } else if (ids.length > 1) {
      this.eventBus.emit('selection:multiple', { ids });
    } else {
      this.eventBus.emit('selection:none');
    }
  }
  
  // === API Publique ===
  
  /**
   * Sélectionne des éléments
   */
  select(ids: string[], exclusive: boolean = true): void {
    if (exclusive) {
      this.clearSelection();
    }
    
    ids.forEach(id => {
      this.selectedIds.add(id);
      this.highlightElement(id, true);
    });
    
    if (ids.length > 0) {
      this.lastSelectedId = ids[ids.length - 1];
    }
    
    this.emitSelectionChanged();
  }
  
  /**
   * Désélectionne des éléments
   */
  deselect(ids: string[]): void {
    ids.forEach(id => {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
        this.highlightElement(id, false);
      }
    });
    
    this.emitSelectionChanged();
  }
  
  /**
   * Efface toute la sélection
   */
  clearSelection(): void {
    this.selectedIds.forEach(id => {
      this.highlightElement(id, false);
    });
    
    this.selectedIds.clear();
    this.lastSelectedId = null;
    
    this.emitSelectionChanged();
  }
  
  /**
   * Sélectionne tout
   */
  selectAll(elementIds: string[]): void {
    this.select(elementIds, true);
  }
  
  /**
   * Inverse la sélection
   */
  invertSelection(allElementIds: string[]): void {
    const newSelection = allElementIds.filter(id => !this.selectedIds.has(id));
    this.select(newSelection, true);
  }
  
  /**
   * Définit le mode de sélection
   */
  setSelectionMode(mode: SelectionMode): void {
    this.config.mode = mode;
    
    // Annuler toute sélection en cours
    if (this.isBoxSelecting) {
      this.endBoxSelection();
    }
    
    this.eventBus.emit('selection:modeChanged', mode);
  }
  
  /**
   * Active/désactive le survol
   */
  setHoverEnabled(enabled: boolean): void {
    this.config.enableHover = enabled;
    
    if (!enabled && this.hoveredId) {
      this.setHoveredElement(null);
    }
  }
  
  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<SelectionConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recréer les matériaux si nécessaire
    if (config.highlightColor) {
      this.selectionMaterial = this.createSelectionMaterial(config.highlightColor);
    }
    
    if (config.hoverColor) {
      this.hoverMaterial = this.createSelectionMaterial(config.hoverColor);
    }
  }
  
  /**
   * Obtient les éléments sélectionnés
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }
  
  /**
   * Obtient l'élément survolé
   */
  getHoveredId(): string | null {
    return this.hoveredId;
  }
  
  /**
   * Vérifie si un élément est sélectionné
   */
  isSelected(elementId: string): boolean {
    return this.selectedIds.has(elementId);
  }
  
  /**
   * Obtient le nombre d'éléments sélectionnés
   */
  getSelectionCount(): number {
    return this.selectedIds.size;
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.clearSelection();
    this.selectedIds.clear();
    this.hoveredId = null;
    this.originalMaterials.clear();
    
    if (this.selectionMaterial instanceof THREE.Material) {
      this.selectionMaterial.dispose();
    }
    
    if (this.hoverMaterial instanceof THREE.Material) {
      this.hoverMaterial.dispose();
    }
    
    this.eventBus.emit('selection:disposed');
  }
}