import * as THREE from 'three';
import { BaseTool, ToolConfig } from './BaseTool';

/**
 * SectionTool - Outil pour créer des plans de coupe
 * 
 * Fonctionnalités:
 * - Plans de coupe selon X, Y, Z
 * - Plans de coupe personnalisés
 * - Animation de la position du plan
 * - Affichage du plan de coupe
 */
export class SectionTool extends BaseTool {
  public name = 'section';
  public icon = '✂️';
  
  private clippingPlanes: THREE.Plane[] = [];
  private planeMeshes: THREE.Mesh[] = [];
  private activeAxis: 'X' | 'Y' | 'Z' | 'custom' | null = null;
  private planePosition: number = 0;
  private planeNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private originalMaterials: Map<THREE.Object3D, THREE.Material | THREE.Material[]> = new Map();
  
  constructor(config: ToolConfig) {
    super(config);
  }
  
  protected onActivate(): void {
    // Active les plans de coupe sur le renderer
    const renderer = (this.canvas as any).__renderer;
    if (renderer) {
      renderer.localClippingEnabled = true;
    }
    
    this.eventBus.emit('tool:section:ready');
  }
  
  protected onDeactivate(): void {
    this.clearSection();
  }
  
  protected onDispose(): void {
    this.clearSection();
    this.originalMaterials.clear();
  }
  
  /**
   * Crée un plan de coupe selon un axe
   */
  public createSection(axis: 'X' | 'Y' | 'Z', position: number = 0): void {
    this.clearSection();
    
    // Définit la normale du plan selon l'axe
    switch (axis) {
      case 'X':
        this.planeNormal = new THREE.Vector3(1, 0, 0);
        break;
      case 'Y':
        this.planeNormal = new THREE.Vector3(0, 1, 0);
        break;
      case 'Z':
        this.planeNormal = new THREE.Vector3(0, 0, 1);
        break;
    }
    
    this.activeAxis = axis;
    this.planePosition = position;
    
    // Crée le plan de coupe
    const plane = new THREE.Plane(this.planeNormal, -position);
    this.clippingPlanes = [plane];
    
    // Applique le plan de coupe aux matériaux
    this.applyClippingPlanes();
    
    // Crée la visualisation du plan
    this.createPlaneVisualization(axis, position);
    
    this.eventBus.emit('tool:section:created', { 
      axis, 
      position,
      normal: this.planeNormal.toArray()
    });
  }
  
  /**
   * Crée un plan de coupe personnalisé
   */
  public createCustomSection(normal: THREE.Vector3, position: number): void {
    this.clearSection();
    
    this.planeNormal = normal.normalize();
    this.activeAxis = 'custom';
    this.planePosition = position;
    
    const plane = new THREE.Plane(this.planeNormal, -position);
    this.clippingPlanes = [plane];
    
    this.applyClippingPlanes();
    this.createCustomPlaneVisualization(normal, position);
    
    this.eventBus.emit('tool:section:created', { 
      axis: 'custom',
      position,
      normal: this.planeNormal.toArray()
    });
  }
  
  /**
   * Met à jour la position du plan de coupe
   */
  public updateSectionPosition(position: number): void {
    if (!this.activeAxis || this.clippingPlanes.length === 0) return;
    
    this.planePosition = position;
    this.clippingPlanes[0].constant = -position;
    
    // Met à jour la visualisation
    if (this.planeMeshes.length > 0) {
      const planeMesh = this.planeMeshes[0];
      switch (this.activeAxis) {
        case 'X':
          planeMesh.position.x = position;
          break;
        case 'Y':
          planeMesh.position.y = position;
          break;
        case 'Z':
          planeMesh.position.z = position;
          break;
        case 'custom': {
          const offset = this.planeNormal.clone().multiplyScalar(position);
          planeMesh.position.copy(offset);
          break;
        }
      }
    }
    
    this.eventBus.emit('tool:section:updated', { 
      position,
      axis: this.activeAxis 
    });
  }
  
  /**
   * Anime la position du plan de coupe
   */
  public animateSection(from: number, to: number, duration: number = 2000): void {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Interpolation linéaire
      const currentPosition = from + (to - from) * progress;
      this.updateSectionPosition(currentPosition);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.eventBus.emit('tool:section:animationComplete');
      }
    };
    
    animate();
  }
  
  /**
   * Inverse la direction du plan de coupe
   */
  public flipSection(): void {
    if (this.clippingPlanes.length === 0) return;
    
    this.planeNormal.negate();
    this.clippingPlanes[0].normal = this.planeNormal;
    
    // Met à jour la visualisation
    if (this.planeMeshes.length > 0) {
      const planeMesh = this.planeMeshes[0];
      planeMesh.lookAt(this.planeNormal);
    }
    
    this.eventBus.emit('tool:section:flipped', {
      normal: this.planeNormal.toArray()
    });
  }
  
  /**
   * Efface le plan de coupe
   */
  public clearSection(): void {
    // Retire les plans de coupe des matériaux
    this.originalMaterials.forEach((originalMaterial, object) => {
      if ((object as THREE.Mesh).material) {
        (object as THREE.Mesh).material = originalMaterial;
      }
    });
    this.originalMaterials.clear();
    
    // Retire les visualisations
    this.planeMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry?.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    
    this.planeMeshes = [];
    this.clippingPlanes = [];
    this.activeAxis = null;
    
    this.eventBus.emit('tool:section:cleared');
  }
  
  /**
   * Applique les plans de coupe aux matériaux
   */
  private applyClippingPlanes(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData?.elementId) {
        // Sauvegarde le matériau original
        if (!this.originalMaterials.has(object)) {
          this.originalMaterials.set(object, object.material);
        }
        
        // Clone le matériau et ajoute les plans de coupe
        const material = Array.isArray(object.material) 
          ? object.material.map(m => m.clone())
          : (object.material as THREE.Material).clone();
        
        if (Array.isArray(material)) {
          material.forEach(m => {
            (m as any).clippingPlanes = this.clippingPlanes;
            (m as any).side = THREE.DoubleSide;
          });
        } else {
          (material as any).clippingPlanes = this.clippingPlanes;
          (material as any).side = THREE.DoubleSide;
        }
        
        object.material = material;
      }
    });
  }
  
  /**
   * Crée la visualisation du plan de coupe
   */
  private createPlaneVisualization(axis: 'X' | 'Y' | 'Z', position: number): void {
    // Calcule la taille du plan basée sur la bounding box de la scène
    const box = new THREE.Box3().setFromObject(this.scene);
    const size = box.getSize(new THREE.Vector3());
    
    let planeWidth = 1;
    let planeHeight = 1;
    let rotation = new THREE.Euler();
    
    switch (axis) {
      case 'X':
        planeWidth = size.z * 2;
        planeHeight = size.y * 2;
        rotation = new THREE.Euler(0, Math.PI / 2, 0);
        break;
      case 'Y':
        planeWidth = size.x * 2;
        planeHeight = size.z * 2;
        rotation = new THREE.Euler(Math.PI / 2, 0, 0);
        break;
      case 'Z':
        planeWidth = size.x * 2;
        planeHeight = size.y * 2;
        rotation = new THREE.Euler(0, 0, 0);
        break;
    }
    
    // Crée le mesh du plan
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const planeMesh = new THREE.Mesh(geometry, material);
    planeMesh.rotation.copy(rotation);
    
    // Positionne le plan
    switch (axis) {
      case 'X':
        planeMesh.position.x = position;
        break;
      case 'Y':
        planeMesh.position.y = position;
        break;
      case 'Z':
        planeMesh.position.z = position;
        break;
    }
    
    planeMesh.name = 'SectionPlane';
    planeMesh.userData = { isSectionPlane: true };
    
    this.scene.add(planeMesh);
    this.planeMeshes.push(planeMesh);
  }
  
  /**
   * Crée la visualisation d'un plan personnalisé
   */
  private createCustomPlaneVisualization(normal: THREE.Vector3, position: number): void {
    const box = new THREE.Box3().setFromObject(this.scene);
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    
    const geometry = new THREE.PlaneGeometry(maxSize * 2, maxSize * 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const planeMesh = new THREE.Mesh(geometry, material);
    
    // Oriente le plan selon la normale
    planeMesh.lookAt(normal);
    
    // Positionne le plan
    const offset = normal.clone().multiplyScalar(position);
    planeMesh.position.copy(offset);
    
    planeMesh.name = 'CustomSectionPlane';
    planeMesh.userData = { isSectionPlane: true };
    
    this.scene.add(planeMesh);
    this.planeMeshes.push(planeMesh);
  }
  
  /**
   * Obtient l'état actuel de la section
   */
  public getSectionState(): {
    active: boolean;
    axis: 'X' | 'Y' | 'Z' | 'custom' | null;
    position: number;
    normal: number[];
  } {
    return {
      active: this.clippingPlanes.length > 0,
      axis: this.activeAxis,
      position: this.planePosition,
      normal: this.planeNormal.toArray()
    };
  }
}