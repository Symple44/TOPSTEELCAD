import * as THREE from 'three';
import { EventBus } from './EventBus';
import { PivotElement } from '@/types/viewer';
import { GeometryConverter } from '../viewer/GeometryConverter';
import { VisualFeatureRenderer } from '../viewer/VisualFeatureRenderer';
import { FeatureOutlineRenderer } from '../viewer/FeatureOutlineRenderer';

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
  private featureOutlineRenderer: FeatureOutlineRenderer;
  
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
    this.featureOutlineRenderer = new FeatureOutlineRenderer();
    
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
    this.grid.position.y = 0; // Quadrillage au niveau 0
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
    
    // Utiliser convertElement qui applique les features
    const object3d = this.geometryConverter.convertElement(element);
    
    if (!object3d) {
      console.error(`❌ Impossible de créer le mesh pour ${element.name}`);
      return;
    }
    
    // Vérifier que c'est bien un Mesh
    let mesh: THREE.Mesh;
    if (object3d instanceof THREE.Mesh) {
      mesh = object3d;
    } else {
      console.error(`❌ L'objet créé n'est pas un Mesh pour ${element.name}`);
      return;
    }
    
    mesh.name = 'MainGeometry';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.elementId = element.id;
    
    // Appliquer la transformation
    // Calculer la hauteur minimale de la géométrie pour la positionner au-dessus du quadrillage
    mesh.geometry.computeBoundingBox();
    const boundingBox = mesh.geometry.boundingBox;
    let yOffset = 0;
    
    if (boundingBox) {
      // La base de l'élément doit être au niveau y=0 (quadrillage)
      // Si minY est négatif, on doit remonter l'élément
      const minY = boundingBox.min.y;
      if (minY < 0) {
        yOffset = -minY; // Remonter pour que le bas soit à y=0
      }
    }
    
    // Stocker le décalage Y dans les userData pour les features
    mesh.userData.yOffset = yOffset;
    mesh.geometry.userData.yOffset = yOffset;
    
    mesh.position.set(
      element.position[0],
      element.position[1] + yOffset,
      element.position[2]
    );
    mesh.rotation.set(...(element.rotation || [0, 0, 0]));
    mesh.scale.set(...(element.scale || [1, 1, 1]));
    
    elementGroup.add(mesh);
    
    // Ajouter les contours visuels pour les features (trous, etc.)
    const featureOutlines = this.featureOutlineRenderer.createFeatureOutlines(element, mesh);
    if (featureOutlines.children.length > 0) {
      featureOutlines.name = 'FeatureOutlines';
      elementGroup.add(featureOutlines);
      console.log(`✨ Added ${featureOutlines.children.length} feature outlines for ${element.name}`);
    }
    
    // Ajouter les markings comme décalcomanies visuelles sur la surface
    // En complément du CSG pour une meilleure visibilité
    if (mesh.geometry?.userData?.markings) {
      console.log(`📝 Markings have been engraved into the geometry via CSG:`, mesh.geometry.userData.markings);
      const markingsGroup = this.createVisibleMarkings(mesh.geometry.userData.markings, element, mesh);
      if (markingsGroup.children.length > 0) {
        markingsGroup.name = 'VisibleMarkings';
        elementGroup.add(markingsGroup);
      }
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
   * Crée des markings visibles sur la surface (en complément du CSG)
   */
  private createVisibleMarkings(markings: any[], element: PivotElement, mesh: THREE.Mesh): THREE.Group {
    const group = new THREE.Group();
    
    markings.forEach((marking, index) => {
      const text = marking.text || 'X';
      const size = marking.size || 20;
      
      // Créer une géométrie 3D plus grande pour le texte
      const scaleFactor = 3; // Augmenter la taille pour la visibilité
      const textGeometry = new THREE.PlaneGeometry(size * scaleFactor, size * scaleFactor * 0.6);
      
      // Créer un canvas pour le texte
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.width = 512;
      canvas.height = 256;
      
      // Fond transparent
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Texte gravé style industriel
      context.font = `bold ${canvas.height * 0.7}px Arial Black`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Contour noir pour visibilité
      context.strokeStyle = '#000000';
      context.lineWidth = 4;
      context.strokeText(text, canvas.width / 2, canvas.height / 2);
      
      // Texte jaune/doré (couleur de marquage industriel)
      context.fillStyle = '#FFD700';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      
      const textMesh = new THREE.Mesh(textGeometry, material);
      textMesh.name = `Marking_${index}_${text}`;
      
      // Positionner sur la surface
      if (marking.position) {
        const thickness = element.dimensions.thickness || 15;
        const length = element.dimensions.length || 220;
        const width = element.dimensions.width || 120;
        
        // Les positions dans marking.position sont déjà les coordonnées DSTV originales
        // DSTV utilise le coin inférieur gauche comme origine (0,0)
        // Three.js utilise le centre comme origine
        
        // Pour les formes complexes avec contour, appliquer le même système de coordonnées
        let x, z;
        
        // Récupérer les metadata de la géométrie
        const centerOffset = marking.centerOffset || mesh.geometry?.userData?.centerOffset;
        const isMirrored = marking.isMirrored || mesh.geometry?.userData?.isMirrored;
        
        if (element.metadata?.contour && centerOffset) {
          // La géométrie est centrée et potentiellement inversée
          console.log(`   ✅ Using centerOffset: x=${centerOffset.x?.toFixed(1)}, y=${centerOffset.y?.toFixed(1)}`);
          
          // Appliquer le centrage
          x = marking.position[0] - centerOffset.x;
          z = marking.position[1] - centerOffset.y;
          
          // Si la géométrie est inversée (miroir), inverser aussi la position X du marking
          if (isMirrored) {
            console.log(`   🔄 Applying mirror transformation`);
            x = -x;
          }
        } else if (element.metadata?.contour) {
          // Pour les formes avec contour centrées (ancienne méthode)
          console.log(`   ⚠️ Using centered coordinates, calculating offset`);
          
          // Trouver les bornes du contour
          const contourPoints = element.metadata.contour;
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          
          contourPoints.forEach((point: [number, number]) => {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
          });
          
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          console.log(`   Calculated center: x=${centerX.toFixed(1)}, y=${centerY.toFixed(1)}`);
          
          x = marking.position[0] - centerX;
          z = marking.position[1] - centerY;
        } else {
          // Pour les formes rectangulaires simples
          const offsetX = marking.position[0] + 15;
          const offsetY = marking.position[1] + 15;
          x = offsetX - length / 2;
          z = offsetY - width / 2;
        }
        
        const y = thickness / 2 + 0.1; // Sur la surface supérieure
        
        textMesh.position.set(x, y, z);
        textMesh.rotation.x = -Math.PI / 2; // Rotation pour être lisible du dessus
        
        console.log(`📍 Marking positioned at: [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
        console.log(`   From DSTV coords: [${marking.position[0]}, ${marking.position[1]}]`);
        console.log(`   Plate dimensions: ${length}x${width}x${thickness}mm`);
        if (element.metadata?.contour) {
          console.log(`   Contour points: ${element.metadata.contour.length}`);
        }
      }
      
      group.add(textMesh);
      console.log(`🎯 Created visible marking: "${text}" at position ${marking.position}`);
    });
    
    return group;
  }
  
  /**
   * Crée des gravures réalistes sur la surface pour les markings/scribbings (ancienne méthode)
   */
  private createMarkingSprites(markings: any[], element: PivotElement): THREE.Group {
    const group = new THREE.Group();
    
    markings.forEach((marking, index) => {
      const text = marking.text || 'X';
      
      // Créer un plan pour la gravure (decal) - taille plus grande pour être visible
      const markingSize = marking.size || 20;
      const decalGeometry = new THREE.PlaneGeometry(markingSize * 4, markingSize * 2);
      
      // Créer un canvas pour le texte gravé
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // Canvas haute résolution pour une gravure nette
      canvas.width = 512;
      canvas.height = 256;
      
      // Fond transparent
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Style de gravure réaliste avec meilleur contraste
      if (marking.type === 'scribbing') {
        // Scribbing : trait profond blanc/jaune visible sur métal
        // Fond légèrement sombre pour simuler la gravure
        context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texte blanc/jaune pour contraste
        context.strokeStyle = '#FFFF00';
        context.lineWidth = 4;
        context.font = `bold ${canvas.height * 0.7}px "Arial Black"`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Contour noir pour lisibilité
        context.strokeStyle = '#000000';
        context.lineWidth = 6;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        
        // Texte jaune vif
        context.fillStyle = '#FFFF00';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Contour jaune plus fin
        context.strokeStyle = '#FFD700';
        context.lineWidth = 2;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
      } else {
        // Marking : gravure blanche/noire contrastée
        // Fond semi-transparent
        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = `bold ${canvas.height * 0.6}px "Arial"`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Contour noir épais
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        
        // Texte blanc
        context.fillStyle = '#FFFFFF';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
      }
      
      // Créer la texture
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      // Matériau opaque pour une meilleure visibilité
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0, // Complètement opaque
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        alphaTest: 0.01
      });
      
      const decal = new THREE.Mesh(decalGeometry, material);
      decal.name = `Marking_${index}`;
      
      // Positionner le decal sur la surface
      if (marking.position) {
        // Pour une plaque, l'épaisseur est sur Y
        // La surface supérieure est à thickness/2
        const surfaceY = element.dimensions.thickness ? element.dimensions.thickness / 2 + 0.5 : marking.position[1] + 0.5;
        
        decal.position.set(
          marking.position[0],
          surfaceY, // Sur la surface supérieure
          marking.position[2]
        );
        
        console.log(`📍 Decal position: x=${marking.position[0]}, y=${surfaceY}, z=${marking.position[2]}`);
      }
      
      // Orienter selon la face
      if (marking.rotation) {
        decal.rotation.set(
          marking.rotation[0],
          marking.rotation[1],
          marking.rotation[2]
        );
      } else if (marking.face === 'top') {
        // Pour une plaque horizontale, rotation pour que le texte soit lisible du dessus
        decal.rotation.x = -Math.PI / 2;
      }
      
      group.add(decal);
      
      console.log(`🔤 Created ${marking.type} engraving: "${text}" at position ${marking.position}`);
    });
    
    return group;
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
    this.featureOutlineRenderer.dispose();
    
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