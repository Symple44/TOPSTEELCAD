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
  // Feature selection is now always enabled
  featureHighlightColor: string;
  featureHighlightOpacity: number;
}

/**
 * Sélection de feature
 */
export interface FeatureSelection {
  elementId: string;
  featureId: string;
  featureType?: string;
  position?: THREE.Vector3;
  boundingBox?: THREE.Box3;
}

/**
 * Type de sélection
 */
export enum SelectionType {
  ELEMENT = 'element',
  FEATURE = 'feature'
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
  private selectedFeatures: Map<string, Set<string>> = new Map();
  private hoveredId: string | null = null;
  private hoveredFeature: FeatureSelection | null = null;
  private lastSelectedId: string | null = null;
  private lastSelectedFeature: FeatureSelection | null = null;
  private selectionType: SelectionType = SelectionType.ELEMENT;
  
  // Configuration
  private config: SelectionConfig = {
    mode: SelectionMode.MULTIPLE,
    highlightColor: '#ff6600',
    highlightOpacity: 0.3,
    enableHover: true,
    hoverColor: '#ffaa00',
    // Feature selection is always enabled
    featureHighlightColor: '#00ff66',
    featureHighlightOpacity: 0.5
  };
  
  // Matériaux de sélection
  private selectionMaterial: THREE.Material;
  private hoverMaterial: THREE.Material;
  private featureSelectionMaterial: THREE.Material;
  private featureHoverMaterial: THREE.Material;
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
    this.featureSelectionMaterial = this.createSelectionMaterial(
      this.config.featureHighlightColor, 
      this.config.featureHighlightOpacity
    );
    this.featureHoverMaterial = this.createSelectionMaterial(
      this.config.featureHighlightColor, 
      this.config.featureHighlightOpacity * 0.5
    );
    
    this.setupEventListeners();
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de sélection d'éléments
    this.eventBus.on('input:click', (data: { elementId: string | null; featureId?: string; event: MouseEvent }) => {
      if (data.featureId) {
        this.handleFeatureClick(data.elementId!, data.featureId, data.event);
      } else if (data.elementId) {
        this.handleElementClick(data.elementId, data.event);
      } else {
        this.clearSelection();
      }
    });
    
    // Événements de sélection de features
    this.eventBus.on('feature:click', (data: { elementId: string; featureId: string; event: MouseEvent }) => {
      // Feature selection is always enabled
      this.handleFeatureClick(data.elementId, data.featureId, data.event);
    });
    
    // Événements de survol
    this.eventBus.on('input:hover', (data: { elementId: string | null; featureId?: string }) => {
      if (data.featureId) {
        this.setHoveredFeature(data.elementId!, data.featureId);
      } else {
        this.setHoveredElement(data.elementId);
      }
    });
    
    // Événements de survol de features
    this.eventBus.on('feature:hover', (data: { elementId: string; featureId: string | null }) => {
      if (data.featureId) {
        this.setHoveredFeature(data.elementId, data.featureId);
      } else {
        this.setHoveredFeature(null, null);
      }
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
  private createSelectionMaterial(color: string, opacity?: number): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: opacity || this.config.highlightOpacity,
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
   * Gère le clic sur une feature
   */
  private handleFeatureClick(elementId: string, featureId: string, event: MouseEvent): void {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    this.selectionType = SelectionType.FEATURE;
    
    switch (this.config.mode) {
      case SelectionMode.SINGLE:
        this.selectSingleFeature(elementId, featureId);
        break;
        
      case SelectionMode.MULTIPLE:
        if (isCtrlPressed) {
          this.toggleFeatureSelection(elementId, featureId);
        } else if (isShiftPressed && this.lastSelectedFeature) {
          // Range selection for features (if applicable)
          this.selectSingleFeature(elementId, featureId);
        } else {
          this.selectSingleFeature(elementId, featureId);
        }
        break;
    }
    
    this.lastSelectedFeature = { elementId, featureId };
  }
  
  /**
   * Sélectionne une seule feature
   */
  private selectSingleFeature(elementId: string, featureId: string): void {
    // Désélectionner toutes les features
    this.clearFeatureSelection();
    
    // Sélectionner la nouvelle feature
    if (!this.selectedFeatures.has(elementId)) {
      this.selectedFeatures.set(elementId, new Set());
    }
    this.selectedFeatures.get(elementId)!.add(featureId);
    
    // Highlight the feature
    this.highlightFeature(elementId, featureId, true);
    
    // Émettre l'événement
    this.emitFeatureSelectionChanged();
  }
  
  /**
   * Bascule la sélection d'une feature
   */
  private toggleFeatureSelection(elementId: string, featureId: string): void {
    const elementFeatures = this.selectedFeatures.get(elementId);
    
    if (elementFeatures?.has(featureId)) {
      elementFeatures.delete(featureId);
      if (elementFeatures.size === 0) {
        this.selectedFeatures.delete(elementId);
      }
      this.highlightFeature(elementId, featureId, false);
    } else {
      if (!this.selectedFeatures.has(elementId)) {
        this.selectedFeatures.set(elementId, new Set());
      }
      this.selectedFeatures.get(elementId)!.add(featureId);
      this.highlightFeature(elementId, featureId, true);
    }
    
    this.emitFeatureSelectionChanged();
  }
  
  /**
   * Met en évidence une feature
   */
  private highlightFeature(elementId: string, featureId: string, highlight: boolean): void {
    this.eventBus.emit('scene:highlightFeature', {
      elementId,
      featureId,
      highlight,
      color: this.config.featureHighlightColor,
      opacity: this.config.featureHighlightOpacity
    });
  }
  
  /**
   * Définit la feature survolée
   */
  private setHoveredFeature(elementId: string | null, featureId: string | null): void {
    // Retirer le survol précédent
    if (this.hoveredFeature) {
      this.eventBus.emit('scene:hoverFeature', {
        elementId: this.hoveredFeature.elementId,
        featureId: this.hoveredFeature.featureId,
        hover: false
      });
    }
    
    // Appliquer le nouveau survol
    if (elementId && featureId) {
      const isSelected = this.selectedFeatures.get(elementId)?.has(featureId) || false;
      
      if (!isSelected) {
        this.eventBus.emit('scene:hoverFeature', {
          elementId,
          featureId,
          hover: true,
          color: this.config.featureHighlightColor,
          opacity: this.config.featureHighlightOpacity * 0.5
        });
        
        this.hoveredFeature = { elementId, featureId };
      } else {
        this.hoveredFeature = null;
      }
    } else {
      this.hoveredFeature = null;
    }
    
    // Émettre l'événement
    this.eventBus.emit('feature:hover:changed', this.hoveredFeature);
  }
  
  /**
   * Émet l'événement de changement de sélection de features
   */
  private emitFeatureSelectionChanged(): void {
    const features: FeatureSelection[] = [];
    
    this.selectedFeatures.forEach((featureIds, elementId) => {
      featureIds.forEach(featureId => {
        features.push({ elementId, featureId });
      });
    });
    
    this.eventBus.emit('feature:selection:changed', { features });
    
    // Émettre aussi les détails si nécessaire
    if (features.length === 1) {
      this.eventBus.emit('feature:selection:single', features[0]);
    } else if (features.length > 1) {
      this.eventBus.emit('feature:selection:multiple', { features });
    } else {
      this.eventBus.emit('feature:selection:none');
    }
  }
  
  /**
   * Émet l'événement de changement de sélection
   */
  private emitSelectionChanged(): void {
    const ids = Array.from(this.selectedIds);
    
    this.eventBus.emit('selection:changed', { ids, type: this.selectionType });
    
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
    // Clear element selection
    this.selectedIds.forEach(id => {
      this.highlightElement(id, false);
    });
    
    this.selectedIds.clear();
    this.lastSelectedId = null;
    
    // Clear feature selection
    this.clearFeatureSelection();
    
    this.emitSelectionChanged();
  }
  
  /**
   * Efface la sélection des features
   */
  clearFeatureSelection(): void {
    this.selectedFeatures.forEach((featureIds, elementId) => {
      featureIds.forEach(featureId => {
        this.highlightFeature(elementId, featureId, false);
      });
    });
    
    this.selectedFeatures.clear();
    this.lastSelectedFeature = null;
    
    this.emitFeatureSelectionChanged();
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
   * Sélectionne des features
   */
  selectFeatures(features: FeatureSelection[], exclusive: boolean = true): void {
    if (exclusive) {
      this.clearFeatureSelection();
    }
    
    this.selectionType = SelectionType.FEATURE;
    
    features.forEach(({ elementId, featureId }) => {
      if (!this.selectedFeatures.has(elementId)) {
        this.selectedFeatures.set(elementId, new Set());
      }
      this.selectedFeatures.get(elementId)!.add(featureId);
      this.highlightFeature(elementId, featureId, true);
    });
    
    if (features.length > 0) {
      this.lastSelectedFeature = features[features.length - 1];
    }
    
    this.emitFeatureSelectionChanged();
  }
  
  /**
   * Désélectionne des features
   */
  deselectFeatures(features: FeatureSelection[]): void {
    features.forEach(({ elementId, featureId }) => {
      const elementFeatures = this.selectedFeatures.get(elementId);
      if (elementFeatures?.has(featureId)) {
        elementFeatures.delete(featureId);
        if (elementFeatures.size === 0) {
          this.selectedFeatures.delete(elementId);
        }
        this.highlightFeature(elementId, featureId, false);
      }
    });
    
    this.emitFeatureSelectionChanged();
  }
  
  /**
   * Obtient les features sélectionnées
   */
  getSelectedFeatures(): FeatureSelection[] {
    const features: FeatureSelection[] = [];
    
    this.selectedFeatures.forEach((featureIds, elementId) => {
      featureIds.forEach(featureId => {
        features.push({ elementId, featureId });
      });
    });
    
    return features;
  }
  
  /**
   * Vérifie si une feature est sélectionnée
   */
  isFeatureSelected(elementId: string, featureId: string): boolean {
    return this.selectedFeatures.get(elementId)?.has(featureId) || false;
  }
  
  /**
   * Obtient le nombre de features sélectionnées
   */
  getFeatureSelectionCount(): number {
    let count = 0;
    this.selectedFeatures.forEach(features => {
      count += features.size;
    });
    return count;
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
  
  // Feature selection is now always enabled - method removed
  
  /**
   * Obtient le type de sélection actuel
   */
  getSelectionType(): SelectionType {
    return this.selectionType;
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.clearSelection();
    this.selectedIds.clear();
    this.selectedFeatures.clear();
    this.hoveredId = null;
    this.hoveredFeature = null;
    this.originalMaterials.clear();
    
    if (this.selectionMaterial instanceof THREE.Material) {
      this.selectionMaterial.dispose();
    }
    
    if (this.hoverMaterial instanceof THREE.Material) {
      this.hoverMaterial.dispose();
    }
    
    if (this.featureSelectionMaterial instanceof THREE.Material) {
      this.featureSelectionMaterial.dispose();
    }
    
    if (this.featureHoverMaterial instanceof THREE.Material) {
      this.featureHoverMaterial.dispose();
    }
    
    this.eventBus.emit('selection:disposed');
  }
}