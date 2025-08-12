import * as THREE from 'three';
import { EventBus } from './EventBus';
import { PivotElement } from '@/types/viewer';
import { GeometryConverter } from '../viewer/GeometryConverter';
import { VisualFeatureRenderer } from '../viewer/VisualFeatureRenderer';

/**
 * Configuration de la scène
 */
export interface SceneConfig {
  backgroundColor?: string;
  fog?: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
  ambientLight?: {
    color: string;
    intensity: number;
  };
  directionalLight?: {
    color: string;
    intensity: number;
    position: [number, number, number];
    castShadow: boolean;
  };
  grid?: {
    enabled: boolean;
    size: number;
    divisions: number;
    color1: string;
    color2: string;
  };
}

/**
 * SceneManager - Gestionnaire de la scène 3D
 * 
 * Responsabilités:
 * - Gestion de la scène Three.js
 * - Gestion des éléments 3D
 * - Gestion de l'éclairage
 * - Gestion de l'environnement (grille, fog, etc.)
 */
export class SceneManager {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  
  // Groupes d'objets
  private elementsGroup: THREE.Group;
  private helpersGroup: THREE.Group;
  private lightsGroup: THREE.Group;
  
  // Éléments de la scène
  private elementMeshes: Map<string, THREE.Object3D>;
  private grid: THREE.GridHelper | null = null;
  
  // Renderers
  private geometryConverter: GeometryConverter;
  private visualFeatureRenderer: VisualFeatureRenderer;
  
  // Configuration
  private config: SceneConfig = {
    backgroundColor: '#2563eb',  // Bleu vif pour vérifier que le rendu fonctionne
    ambientLight: {
      color: '#ffffff',
      intensity: 0.8
    },
    directionalLight: {
      color: '#ffffff',
      intensity: 1.5,
      position: [5000, 10000, 5000],
      castShadow: true
    },
    grid: {
      enabled: true,
      size: 20000,
      divisions: 200,
      color1: '#ffffff',
      color2: '#cccccc'
    }
  };
  
  constructor(eventBus: EventBus, config?: Partial<SceneConfig>) {
    this.eventBus = eventBus;
    this.scene = new THREE.Scene();
    this.scene.name = 'MainScene';
    
    // Appliquer la configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Créer les groupes
    this.elementsGroup = new THREE.Group();
    this.elementsGroup.name = 'Elements';
    this.scene.add(this.elementsGroup);
    
    this.helpersGroup = new THREE.Group();
    this.helpersGroup.name = 'Helpers';
    this.scene.add(this.helpersGroup);
    
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = 'Lights';
    this.scene.add(this.lightsGroup);
    
    // Initialiser les maps
    this.elementMeshes = new Map();
    
    // Initialiser les renderers
    this.geometryConverter = new GeometryConverter();
    this.visualFeatureRenderer = new VisualFeatureRenderer();
    
    this.setupEventListeners();
  }
  
  /**
   * Initialise la scène
   */
  initialize(): void {
    // Configurer la couleur de fond
    this.setBackgroundColor(this.config.backgroundColor!);
    
    // Ajouter l'éclairage
    this.setupLighting();
    
    // Grille désactivée - gérée par le système adaptatif dans TopSteelCAD.tsx
    // if (this.config.grid?.enabled) {
    //   this.addGrid();
    // }
    
    // Configurer le fog si nécessaire
    if (this.config.fog?.enabled) {
      this.setupFog();
    }
    
    // Émettre l'événement d'initialisation
    this.eventBus.emit('scene:initialized', { scene: this.scene });
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de visibilité
    this.eventBus.on('element:visibility', (data: { id: string; visible: boolean }) => {
      this.setElementVisibility(data.id, data.visible);
    });
    
    // Événements de grille
    this.eventBus.on('grid:toggle', (data: { enabled: boolean }) => {
      this.toggleGrid(data.enabled);
    });
    
    // Événements d'éclairage
    this.eventBus.on('lighting:update', (data: Partial<SceneConfig>) => {
      this.updateLighting(data);
    });
  }
  
  /**
   * Configure l'éclairage de la scène
   */
  private setupLighting(): void {
    // Lumière ambiante
    if (this.config.ambientLight) {
      const ambientLight = new THREE.AmbientLight(
        this.config.ambientLight.color,
        this.config.ambientLight.intensity
      );
      ambientLight.name = 'AmbientLight';
      this.lightsGroup.add(ambientLight);
    }
    
    // Lumière directionnelle principale
    if (this.config.directionalLight) {
      const directionalLight = new THREE.DirectionalLight(
        this.config.directionalLight.color,
        this.config.directionalLight.intensity
      );
      directionalLight.name = 'MainDirectionalLight';
      directionalLight.position.set(...this.config.directionalLight.position);
      directionalLight.castShadow = this.config.directionalLight.castShadow;
      
      // Configuration des ombres
      if (directionalLight.castShadow) {
        directionalLight.shadow.camera.left = -5000;
        directionalLight.shadow.camera.right = 5000;
        directionalLight.shadow.camera.top = 5000;
        directionalLight.shadow.camera.bottom = -5000;
        directionalLight.shadow.camera.near = 100;
        directionalLight.shadow.camera.far = 10000;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.bias = -0.0005;
      }
      
      this.lightsGroup.add(directionalLight);
    }
    
    // Lumière hémisphérique pour un éclairage plus naturel
    const hemisphereLight = new THREE.HemisphereLight('#87ceeb', '#1e3a5f', 0.6);
    hemisphereLight.name = 'HemisphereLight';
    this.lightsGroup.add(hemisphereLight);
  }
  
  /**
   * Ajoute la grille à la scène
   */
  private addGrid(): void {
    if (this.grid) {
      this.helpersGroup.remove(this.grid);
      this.grid.dispose();
    }
    
    const { size, divisions, color1, color2 } = this.config.grid!;
    
    this.grid = new THREE.GridHelper(size, divisions, color1, color2);
    this.grid.name = 'Grid';
    this.grid.position.y = -200; // Légèrement en dessous pour éviter le z-fighting
    this.helpersGroup.add(this.grid);
  }
  
  /**
   * Configure le fog
   */
  private setupFog(): void {
    if (this.config.fog?.enabled) {
      this.scene.fog = new THREE.Fog(
        this.config.fog.color,
        this.config.fog.near,
        this.config.fog.far
      );
    } else {
      this.scene.fog = null;
    }
  }
  
  /**
   * Ajoute un élément à la scène
   */
  addElement(element: PivotElement): void {
    
    // Retirer l'ancien mesh s'il existe
    if (this.elementMeshes.has(element.id)) {
      this.removeElement(element.id);
    }
    
    // Créer le groupe pour l'élément
    const elementGroup = new THREE.Group();
    elementGroup.name = element.name || `Element_${element.id}`;
    elementGroup.userData = { element };
    
    // Créer la géométrie principale
    const geometry = this.geometryConverter.createGeometry(element);
    const material = this.geometryConverter.createMaterial(element);
    
    if (!geometry) {
      console.error(`❌ Impossible de créer la géométrie pour ${element.name}`);
      return;
    }
    
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'MainGeometry';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { elementId: element.id, element };
    
    // Appliquer la transformation
    mesh.position.set(...element.position);
    mesh.rotation.set(...(element.rotation || [0, 0, 0]));
    mesh.scale.set(...(element.scale || [1, 1, 1]));
    
    elementGroup.add(mesh);
    
    // Ajouter les features visuelles
    const visualFeatures = this.visualFeatureRenderer.createVisualFeatures(element);
    if (visualFeatures.children.length > 0) {
      visualFeatures.name = 'VisualFeatures';
      elementGroup.add(visualFeatures);
    }
    
    // Ajouter à la scène
    this.elementsGroup.add(elementGroup);
    this.elementMeshes.set(element.id, elementGroup);
    
    // Émettre l'événement
    this.eventBus.emit('scene:elementAdded', {
      id: element.id,
      object3D: elementGroup
    });
  }
  
  /**
   * Retire un élément de la scène
   */
  removeElement(id: string): void {
    const object = this.elementMeshes.get(id);
    
    if (object) {
      // Nettoyer les ressources
      this.disposeObject3D(object);
      
      // Retirer de la scène
      this.elementsGroup.remove(object);
      this.elementMeshes.delete(id);
      
      // Émettre l'événement
      this.eventBus.emit('scene:elementRemoved', { id });
    }
  }
  
  /**
   * Met à jour un élément
   */
  updateElement(element: PivotElement): void {
    const object = this.elementMeshes.get(element.id);
    
    if (object) {
      // Mettre à jour la transformation
      object.position.set(...element.position);
      object.rotation.set(...(element.rotation || [0, 0, 0]));
      object.scale.set(...(element.scale || [1, 1, 1]));
      
      // Mettre à jour les userData
      object.userData.element = element;
      
      // Émettre l'événement
      this.eventBus.emit('scene:elementUpdated', {
        id: element.id,
        element,
        object3D: object
      });
    }
  }
  
  /**
   * Définit la visibilité d'un élément
   */
  setElementVisibility(id: string, visible: boolean): void {
    const object = this.elementMeshes.get(id);
    
    if (object) {
      object.visible = visible;
      this.eventBus.emit('scene:visibilityChanged', { id, visible });
    }
  }
  
  /**
   * Active/désactive la grille
   */
  toggleGrid(enabled: boolean): void {
    if (this.grid) {
      this.grid.visible = enabled;
    }
    this.config.grid!.enabled = enabled;
  }
  
  /**
   * Met à jour l'éclairage
   */
  updateLighting(config: Partial<SceneConfig>): void {
    // Mettre à jour la configuration
    this.config = { ...this.config, ...config };
    
    // Recréer l'éclairage
    this.lightsGroup.clear();
    this.setupLighting();
  }
  
  /**
   * Définit la couleur de fond
   */
  setBackgroundColor(color: string): void {
    this.scene.background = new THREE.Color(color);
    this.config.backgroundColor = color;
  }
  
  /**
   * Met à jour la scène (appelé à chaque frame)
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Animer les éléments si nécessaire
    this.elementMeshes.forEach((object, id) => {
      // Animation personnalisée par élément
      if (object.userData.element?.metadata?.animated) {
        // Rotation simple pour l'exemple
        object.rotation.y += deltaTime * 0.5;
      }
    });
    
    // Émettre l'événement de mise à jour
    this.eventBus.emit('scene:updated', { deltaTime, elapsedTime });
  }
  
  /**
   * Calcule la boîte englobante de tous les éléments
   */
  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    
    this.elementMeshes.forEach(object => {
      const objectBox = new THREE.Box3().setFromObject(object);
      box.union(objectBox);
    });
    
    return box;
  }
  
  /**
   * Obtient un élément par son ID
   */
  getElement(id: string): THREE.Object3D | null {
    return this.elementMeshes.get(id) || null;
  }
  
  /**
   * Obtient tous les éléments
   */
  getAllElements(): Map<string, THREE.Object3D> {
    return new Map(this.elementMeshes);
  }
  
  /**
   * Effectue un raycast sur la scène
   */
  raycast(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const objects: THREE.Object3D[] = [];
    
    // Collecter tous les meshes
    this.elementMeshes.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          objects.push(child);
        }
      });
    });
    
    return raycaster.intersectObjects(objects, false);
  }
  
  /**
   * Nettoie un Object3D et ses enfants
   */
  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Retirer les enfants
    while (object.children.length > 0) {
      object.remove(object.children[0]);
    }
  }
  
  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    // Nettoyer tous les éléments
    this.elementMeshes.forEach((object, id) => {
      this.removeElement(id);
    });
    
    // Nettoyer la grille
    if (this.grid) {
      this.grid.dispose();
      this.grid = null;
    }
    
    // Nettoyer les groupes
    this.scene.remove(this.elementsGroup);
    this.scene.remove(this.helpersGroup);
    this.scene.remove(this.lightsGroup);
    
    // Nettoyer les renderers
    this.geometryConverter.clearCache();
    this.visualFeatureRenderer.dispose();
    
    // Émettre l'événement de nettoyage
    this.eventBus.emit('scene:disposed');
  }
  
  // === Getters ===
  
  getScene(): THREE.Scene {
    return this.scene;
  }
  
  getConfig(): SceneConfig {
    return { ...this.config };
  }
  
  getElementCount(): number {
    return this.elementMeshes.size;
  }
}