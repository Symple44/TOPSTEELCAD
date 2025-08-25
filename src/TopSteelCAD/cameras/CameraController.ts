import * as THREE from 'three';
import { CameraPreset, ViewDirection, CameraConfig } from '../3DLibrary/types/camera.types';
import { PivotElement } from '@/types/viewer';
import { EventBus } from '../core/EventBus';

/**
 * CameraController - Gestionnaire centralisé des caméras
 * 
 * Responsabilités:
 * - Création et gestion des caméras (perspective/orthographique)
 * - Application des presets de vue (Face, Top, etc.)
 * - Animations de transition entre vues
 * - Calcul automatique du zoom optimal
 */
export class CameraController {
  private perspectiveCamera!: THREE.PerspectiveCamera;
  private orthographicCamera!: THREE.OrthographicCamera;
  private activeCamera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private controls: any; // OrbitControls
  private eventBus: EventBus;
  private canvas: HTMLCanvasElement;
  
  // Configuration
  private config: CameraConfig = {
    fov: 35, // FOV réduit pour vue plus serrée (défaut était 45)
    near: 0.1,  // Plus proche pour les petites pièces
    far: 100000, // Plus loin pour les grandes structures
    defaultPosition: new THREE.Vector3(2000, 2000, 2000),
    animationDuration: 500,
    zoomMargin: 1.5, // Marge plus grande pour mieux voir la pièce
    minZoom: 0.1,   // Zoom minimum (très proche)
    maxZoom: 100,   // Zoom maximum (très loin)
  };
  
  // État
  private isOrthographic: boolean = false;
  private currentView: ViewDirection = 'iso';
  private animationFrame: number | null = null;
  
  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.initializeCameras();
    this.setupEventListeners();
  }
  
  /**
   * Initialise les deux types de caméras
   */
  private initializeCameras(): void {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    
    // Caméra perspective
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      this.config.fov,
      aspect,
      this.config.near,
      this.config.far
    );
    this.perspectiveCamera.position.copy(this.config.defaultPosition);
    
    // Caméra orthographique
    const frustumSize = 2000;
    this.orthographicCamera = new THREE.OrthographicCamera(
      -frustumSize * aspect,
      frustumSize * aspect,
      frustumSize,
      -frustumSize,
      this.config.near,
      this.config.far
    );
    this.orthographicCamera.position.copy(this.config.defaultPosition);
    
    // Caméra active par défaut
    this.activeCamera = this.perspectiveCamera;
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Redimensionnement
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Événements du viewer
    this.eventBus.on('viewer:elementSelected', this.handleElementSelected.bind(this));
    this.eventBus.on('viewer:viewChangeRequested', this.handleViewChange.bind(this));
  }
  
  /**
   * Bascule entre perspective et orthographique
   */
  public toggleProjection(): void {
    this.isOrthographic = !this.isOrthographic;
    
    const newCamera = this.isOrthographic 
      ? this.orthographicCamera 
      : this.perspectiveCamera;
    
    // Copier la position et l'orientation
    newCamera.position.copy(this.activeCamera.position);
    newCamera.quaternion.copy(this.activeCamera.quaternion);
    
    // Si orthographique, ajuster le zoom
    if (this.isOrthographic && this.controls) {
      this.updateOrthographicZoom();
    }
    
    this.activeCamera = newCamera;
    
    // Mettre à jour les contrôles
    if (this.controls) {
      this.controls.object = this.activeCamera;
      this.controls.update();
    }
    
    // Émettre l'événement
    this.eventBus.emit('camera:projectionChanged', {
      isOrthographic: this.isOrthographic
    });
  }
  
  /**
   * Change la vue vers un preset
   */
  public setView(
    direction: ViewDirection,
    elementsOrDuration?: PivotElement[] | number,
    selectedIdOrElements?: string | null | PivotElement[],
    animatedOrSelectedId?: boolean | string | null,
    animatedParam?: boolean
  ): void {
    // Handle overloaded parameters
    let elements: PivotElement[] | undefined;
    let selectedId: string | null | undefined;
    let animated: boolean = true;
    let duration: number | undefined;
    
    // Overload 1: setView(direction, duration)
    if (typeof elementsOrDuration === 'number') {
      duration = elementsOrDuration;
      elements = undefined;
      selectedId = null;
      animated = true;
    }
    // Overload 2: setView(direction, elements, selectedId, animated)
    else {
      elements = elementsOrDuration;
      if (Array.isArray(selectedIdOrElements)) {
        // setView(direction, undefined, elements)
        elements = selectedIdOrElements;
        selectedId = null;
      } else {
        selectedId = selectedIdOrElements as string | null;
      }
      if (typeof animatedOrSelectedId === 'boolean') {
        animated = animatedOrSelectedId;
      } else if (typeof animatedOrSelectedId === 'string') {
        selectedId = animatedOrSelectedId;
        animated = animatedParam ?? true;
      }
    }
    
    const target = this.controls?.target || new THREE.Vector3();
    const distance = this.calculateOptimalDistance(elements, selectedId);
    
    // Calculer la nouvelle position et orientation
    const preset = this.getPresetForDirection(direction, target, distance);
    
    if (animated) {
      this.animateToPreset(preset, elements, selectedId, direction, duration);
    } else {
      this.applyPreset(preset, elements, selectedId, direction);
    }
    
    this.currentView = direction;
    
    // Émettre l'événement
    this.eventBus.emit('camera:viewChanged', { view: direction });
  }
  
  /**
   * Obtient le preset pour une direction donnée
   */
  private getPresetForDirection(
    direction: ViewDirection,
    target: THREE.Vector3,
    distance: number
  ): CameraPreset {
    const presets: Record<ViewDirection, CameraPreset> = {
      front: {
        position: new THREE.Vector3(target.x, target.y, target.z + distance),
        target: target.clone(),
        up: new THREE.Vector3(0, 1, 0),
      },
      back: {
        position: new THREE.Vector3(target.x, target.y, target.z - distance),
        target: target.clone(),
        up: new THREE.Vector3(0, 1, 0),
      },
      left: {
        position: new THREE.Vector3(target.x - distance, target.y, target.z),
        target: target.clone(),
        up: new THREE.Vector3(0, 1, 0),
      },
      right: {
        position: new THREE.Vector3(target.x + distance, target.y, target.z),
        target: target.clone(),
        up: new THREE.Vector3(0, 1, 0),
      },
      top: {
        position: new THREE.Vector3(target.x, target.y + distance, target.z),
        target: target.clone(),
        up: new THREE.Vector3(1, 0, 0),
      },
      bottom: {
        position: new THREE.Vector3(target.x, target.y - distance, target.z),
        target: target.clone(),
        up: new THREE.Vector3(-1, 0, 0),
      },
      iso: {
        position: new THREE.Vector3(
          target.x + distance * 0.7,
          target.y + distance * 0.7,
          target.z + distance * 0.7
        ),
        target: target.clone(),
        up: new THREE.Vector3(0, 1, 0),
      },
    };
    
    return presets[direction];
  }
  
  /**
   * Applique un preset immédiatement
   */
  private applyPreset(
    preset: CameraPreset,
    elements?: PivotElement[],
    selectedId?: string | null,
    direction?: ViewDirection
  ): void {
    this.activeCamera.position.copy(preset.position);
    this.activeCamera.up.copy(preset.up);
    this.activeCamera.lookAt(preset.target);
    
    if (this.controls) {
      this.controls.target.copy(preset.target);
      this.controls.update();
    }
    
    // Ajuster le zoom pour orthographique
    if (this.isOrthographic) {
      this.updateOrthographicZoom(elements, selectedId, direction);
    }
  }
  
  /**
   * Anime la transition vers un preset
   */
  private animateToPreset(
    preset: CameraPreset,
    elements?: PivotElement[],
    selectedId?: string | null,
    direction?: ViewDirection,
    customDuration?: number
  ): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    const startPosition = this.activeCamera.position.clone();
    const startTarget = this.controls?.target.clone() || new THREE.Vector3();
    const startUp = this.activeCamera.up.clone();
    
    const startTime = Date.now();
    const duration = customDuration ?? this.config.animationDuration;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (smooth in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Interpoler la position
      this.activeCamera.position.lerpVectors(
        startPosition,
        preset.position,
        eased
      );
      
      // Interpoler le up vector
      this.activeCamera.up.lerpVectors(
        startUp,
        preset.up,
        eased
      );
      
      // Interpoler le target
      if (this.controls) {
        this.controls.target.lerpVectors(
          startTarget,
          preset.target,
          eased
        );
        this.activeCamera.lookAt(this.controls.target);
        this.controls.update();
      }
      
      // Ajuster le zoom progressivement pour orthographique
      if (this.isOrthographic && progress === 1) {
        this.updateOrthographicZoom(elements, selectedId, direction);
      }
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        this.eventBus.emit('camera:animationCompleted');
      }
    };
    
    animate();
  }
  
  /**
   * Met à jour le zoom de la caméra orthographique
   */
  private updateOrthographicZoom(
    elements?: PivotElement[],
    selectedId?: string | null,
    direction?: ViewDirection
  ): void {
    if (!this.orthographicCamera) return;
    
    const targetSize = this.calculateTargetSize(elements, selectedId);
    let viewWidth = targetSize.width;
    let viewHeight = targetSize.height;
    
    // Adapter selon la direction de vue
    if (direction) {
      switch(direction) {
        case 'front':
        case 'back':
          viewWidth = targetSize.depth;
          viewHeight = targetSize.height;
          break;
        case 'left':
        case 'right':
          viewWidth = targetSize.width;
          viewHeight = targetSize.height;
          break;
        case 'top':
        case 'bottom':
          viewWidth = targetSize.depth;
          viewHeight = targetSize.width;
          break;
        default:
          viewWidth = Math.max(targetSize.depth, targetSize.width);
          viewHeight = Math.max(targetSize.height, targetSize.width);
      }
    }
    
    // Ajouter la marge
    viewWidth *= this.config.zoomMargin;
    viewHeight *= this.config.zoomMargin;
    
    // Calculer le zoom
    // const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const defaultHeight = Math.abs(this.orthographicCamera.top - this.orthographicCamera.bottom);
    const defaultWidth = Math.abs(this.orthographicCamera.right - this.orthographicCamera.left);
    
    const zoomForHeight = defaultHeight / viewHeight;
    const zoomForWidth = defaultWidth / viewWidth;
    
    this.orthographicCamera.zoom = Math.min(zoomForHeight, zoomForWidth) * 0.8;
    this.orthographicCamera.updateProjectionMatrix();
  }
  
  /**
   * Calcule la taille cible pour le zoom
   */
  private calculateTargetSize(
    elements?: PivotElement[],
    selectedId?: string | null
  ): { width: number; height: number; depth: number } {
    if (!elements || elements.length === 0) {
      return { width: 1000, height: 1000, depth: 1000 };
    }
    
    if (selectedId) {
      const element = elements.find(e => e.id === selectedId);
      if (element) {
        return {
          width: element.dimensions.width || element.dimensions.flangeWidth || 100,
          height: element.dimensions.height || 100,
          depth: element.dimensions.length || 1000,
        };
      }
    }
    
    // Calculer la boîte englobante
    const box = new THREE.Box3();
    elements.forEach(element => {
      const pos = new THREE.Vector3(...element.position);
      const halfSize = new THREE.Vector3(
        (element.dimensions.length || 1000) / 2,
        (element.dimensions.height || 100) / 2,
        (element.dimensions.width || 100) / 2
      );
      box.expandByPoint(pos.clone().add(halfSize));
      box.expandByPoint(pos.clone().sub(halfSize));
    });
    
    const size = box.getSize(new THREE.Vector3());
    return {
      width: size.z,
      height: size.y,
      depth: size.x,
    };
  }
  
  /**
   * Calcule la distance optimale pour la vue
   */
  private calculateOptimalDistance(
    elements?: PivotElement[],
    selectedId?: string | null
  ): number {
    const targetSize = this.calculateTargetSize(elements, selectedId);
    const maxDim = Math.max(targetSize.width, targetSize.height, targetSize.depth);
    
    if (this.isOrthographic) {
      return maxDim * 2;
    } else {
      const fov = this.perspectiveCamera.fov * (Math.PI / 180);
      return Math.abs(maxDim / Math.tan(fov / 2)) * 1.5;
    }
  }
  
  /**
   * Ajuste la vue pour cadrer tous les éléments
   */
  public fitToElements(elements: PivotElement[], animated: boolean = true): void {
    if (elements.length === 0) return;
    
    // Mettre à jour les limites pour tous les éléments
    this.updateControlsLimits(elements);
    
    const box = new THREE.Box3();
    elements.forEach(element => {
      const pos = new THREE.Vector3(...element.position);
      const halfSize = new THREE.Vector3(
        (element.dimensions.length || 1000) / 2,
        (element.dimensions.height || 100) / 2,
        (element.dimensions.width || 100) / 2
      );
      box.expandByPoint(pos.clone().add(halfSize));
      box.expandByPoint(pos.clone().sub(halfSize));
    });
    
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const distance = this.isOrthographic
      ? maxDim * 1.5
      : Math.abs(maxDim / 2 / Math.tan((this.perspectiveCamera.fov * Math.PI / 180) / 2)) * 1.5;
    
    const preset: CameraPreset = {
      position: new THREE.Vector3(
        center.x + distance,
        center.y + distance,
        center.z + distance
      ),
      target: center,
      up: new THREE.Vector3(0, 1, 0),
    };
    
    if (animated) {
      this.animateToPreset(preset, elements);
    } else {
      this.applyPreset(preset, elements);
    }
  }
  
  /**
   * Zoom to fit sur l'élément sélectionné ou tous les éléments
   */
  public zoomToFit(selectedId?: string | null, elements?: PivotElement[], animated: boolean = true): void {
    if (!elements || elements.length === 0) return;
    
    const box = new THREE.Box3();
    
    if (selectedId) {
      // Zoom sur l'élément sélectionné
      const element = elements.find(e => e.id === selectedId);
      if (element) {
        const pos = new THREE.Vector3(...element.position);
        const halfSize = new THREE.Vector3(
          (element.dimensions.length || 100) / 2,
          (element.dimensions.height || element.dimensions.thickness || 10) / 2,
          (element.dimensions.width || 100) / 2
        );
        box.setFromCenterAndSize(pos, halfSize.multiplyScalar(2));
        
        // Mettre à jour les limites pour cet élément
        this.updateControlsLimits(elements, selectedId);
      }
    } else {
      // Zoom sur tous les éléments
      elements.forEach(element => {
        const pos = new THREE.Vector3(...element.position);
        const halfSize = new THREE.Vector3(
          (element.dimensions.length || 100) / 2,
          (element.dimensions.height || element.dimensions.thickness || 10) / 2,
          (element.dimensions.width || 100) / 2
        );
        box.expandByPoint(pos.clone().add(halfSize));
        box.expandByPoint(pos.clone().sub(halfSize));
      });
      
      // Mettre à jour les limites pour tous les éléments
      this.updateControlsLimits(elements);
    }
    
    if (box.isEmpty()) return;
    
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calculer la distance optimale avec un peu plus de marge
    const distance = this.isOrthographic
      ? maxDim * 2
      : Math.abs(maxDim / Math.tan((this.perspectiveCamera.fov * Math.PI / 180) / 2)) * 2.5;
    
    // Garder la direction actuelle de la caméra
    const currentDirection = this.activeCamera.position.clone().sub(
      this.controls ? this.controls.target : new THREE.Vector3()
    ).normalize();
    
    const newPosition = center.clone().add(currentDirection.multiplyScalar(distance));
    
    if (animated && this.controls) {
      // Animation fluide
      const startTarget = this.controls.target.clone();
      const startPosition = this.activeCamera.position.clone();
      const duration = 600;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        this.controls.target.lerpVectors(startTarget, center, eased);
        this.activeCamera.position.lerpVectors(startPosition, newPosition, eased);
        this.activeCamera.lookAt(this.controls.target);
        this.controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    } else if (this.controls) {
      // Application immédiate
      this.controls.target.copy(center);
      this.activeCamera.position.copy(newPosition);
      this.activeCamera.lookAt(center);
      this.controls.update();
    }
  }
  
  /**
   * Gère le redimensionnement
   */
  private handleResize(): void {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    
    // Mettre à jour la caméra perspective
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();
    
    // Mettre à jour la caméra orthographique
    const frustumSize = 2000;
    this.orthographicCamera.left = -frustumSize * aspect;
    this.orthographicCamera.right = frustumSize * aspect;
    this.orthographicCamera.top = frustumSize;
    this.orthographicCamera.bottom = -frustumSize;
    this.orthographicCamera.updateProjectionMatrix();
  }
  
  /**
   * Gère la sélection d'un élément
   */
  private handleElementSelected(data: { elementId: string | null; elements: PivotElement[] }): void {
    if (data.elementId) {
      const element = data.elements.find(e => e.id === data.elementId);
      if (element) {
        // Mettre à jour les limites des contrôles pour l'élément sélectionné
        this.updateControlsLimits(data.elements, data.elementId);
        
        // Créer une boîte englobante pour l'élément
        const box = new THREE.Box3();
        const pos = new THREE.Vector3(...element.position);
        const halfSize = new THREE.Vector3(
          (element.dimensions.length || 100) / 2,
          (element.dimensions.height || element.dimensions.thickness || 10) / 2,
          (element.dimensions.width || 100) / 2
        );
        box.setFromCenterAndSize(pos, halfSize.multiplyScalar(2));
        
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Calculer la distance optimale pour voir l'élément
        const optimalDistance = maxDim * 2.5; // Distance pour bien voir la pièce
        
        if (this.controls) {
          // Animation fluide vers le nouvel élément
          const startTarget = this.controls.target.clone();
          const startPosition = this.activeCamera.position.clone();
          
          // Calculer la nouvelle position en gardant la même direction relative
          const direction = startPosition.clone().sub(startTarget).normalize();
          const newPosition = center.clone().add(direction.multiplyScalar(optimalDistance));
          
          // Animer la transition
          const duration = 800;
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing smooth
            const eased = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpoler target et position
            this.controls.target.lerpVectors(startTarget, center, eased);
            this.activeCamera.position.lerpVectors(startPosition, newPosition, eased);
            this.activeCamera.lookAt(this.controls.target);
            this.controls.update();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              // Ajuster le zoom final si orthographique
              if (this.isOrthographic) {
                this.updateOrthographicZoom(data.elements, data.elementId, this.currentView);
              }
            }
          };
          
          animate();
        }
      }
    } else {
      // Aucune sélection : réinitialiser les limites pour tous les éléments
      this.updateControlsLimits(data.elements);
    }
  }
  
  /**
   * Gère les demandes de changement de vue
   */
  private handleViewChange(data: { view: ViewDirection; elements?: PivotElement[]; selectedId?: string | null }): void {
    this.setView(data.view, data.elements, data.selectedId);
  }
  
  // Getters publics
  public get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.activeCamera;
  }
  
  public get isPerspective(): boolean {
    return !this.isOrthographic;
  }
  
  public get view(): ViewDirection {
    return this.currentView;
  }
  
  /**
   * Attache les contrôles orbit
   */
  public attachControls(controls: any): void {
    this.controls = controls;
    this.controls.object = this.activeCamera;
    
    // Configurer les limites de zoom adaptatives
    this.updateControlsLimits();
    
    this.controls.update();
  }
  
  /**
   * Met à jour les limites des contrôles en fonction du contexte
   */
  private updateControlsLimits(elements?: PivotElement[], selectedId?: string | null): void {
    if (!this.controls) return;
    
    // Calculer la taille de la cible
    const targetSize = this.calculateTargetSize(elements, selectedId);
    const maxDim = Math.max(targetSize.width, targetSize.height, targetSize.depth);
    const minDim = Math.min(targetSize.width, targetSize.height, targetSize.depth);
    
    // Adapter les limites de distance pour OrbitControls
    // Distance minimale : permettre de s'approcher très près pour les détails
    this.controls.minDistance = minDim * 0.1; // 10% de la plus petite dimension
    
    // Distance maximale : permettre de voir toute la structure avec de la marge
    this.controls.maxDistance = maxDim * 10; // 10x la plus grande dimension
    
    // Limites de zoom pour la caméra orthographique
    if (this.isOrthographic && this.orthographicCamera) {
      this.controls.minZoom = 0.01; // Permet de zoomer très proche
      this.controls.maxZoom = 100;  // Permet de dézoomer très loin
    }
    
    console.log(`📐 Updated camera limits: minDist=${this.controls.minDistance}, maxDist=${this.controls.maxDistance}`);
  }
  
  /**
   * Bascule vers la caméra orthographique
   */
  public switchToOrthographic(): void {
    if (!this.isOrthographic) {
      // Préserver la position et l'orientation actuelles
      const currentPosition = this.activeCamera.position.clone();
      const currentTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3(0, 0, 0);
      
      // Calculer la distance pour ajuster le zoom orthographique
      const distance = currentPosition.distanceTo(currentTarget);
      const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      
      // Ajuster la taille du frustum basé sur la distance
      const frustumSize = distance * 0.5; // Ajustez ce facteur selon les besoins
      
      this.orthographicCamera.left = -frustumSize * aspect;
      this.orthographicCamera.right = frustumSize * aspect;
      this.orthographicCamera.top = frustumSize;
      this.orthographicCamera.bottom = -frustumSize;
      this.orthographicCamera.updateProjectionMatrix();
      
      // Transférer position et orientation
      this.orthographicCamera.position.copy(currentPosition);
      this.orthographicCamera.lookAt(currentTarget);
      
      // Changer la caméra active
      this.activeCamera = this.orthographicCamera;
      this.isOrthographic = true;
      
      // Mettre à jour les contrôles
      if (this.controls) {
        this.controls.object = this.activeCamera;
        this.controls.target.copy(currentTarget);
        this.controls.update();
      }
      
      this.eventBus.emit('camera:projectionChanged', { 
        type: 'orthographic',
        camera: this.activeCamera 
      });
    }
  }
  
  /**
   * Bascule vers la caméra perspective
   */
  public switchToPerspective(): void {
    if (this.isOrthographic) {
      // Préserver la position et l'orientation actuelles
      const currentPosition = this.activeCamera.position.clone();
      const currentTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3(0, 0, 0);
      
      // Transférer position et orientation
      this.perspectiveCamera.position.copy(currentPosition);
      this.perspectiveCamera.lookAt(currentTarget);
      
      // Changer la caméra active
      this.activeCamera = this.perspectiveCamera;
      this.isOrthographic = false;
      
      // Mettre à jour les contrôles
      if (this.controls) {
        this.controls.object = this.activeCamera;
        this.controls.target.copy(currentTarget);
        this.controls.update();
      }
      
      this.eventBus.emit('camera:projectionChanged', { 
        type: 'perspective',
        camera: this.activeCamera 
      });
    }
  }
  
  /**
   * Anime la caméra vers une position et une cible spécifiques
   */
  public animateToPosition(
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration: number = 500
  ): void {
    if (!this.controls) return;

    const startPosition = this.activeCamera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Interpolate position and target
      this.activeCamera.position.lerpVectors(startPosition, position, eased);
      this.controls.target.lerpVectors(startTarget, target, eased);
      this.activeCamera.lookAt(this.controls.target);
      this.controls.update();
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        // Update orthographic zoom if needed
        if (this.isOrthographic) {
          this.updateOrthographicZoom();
        }
      }
    };
    
    // Cancel any existing animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    animate();
  }

  /**
   * Retourne la caméra active
   */
  public getActiveCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.activeCamera;
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
    // Note: EventBus.off attend un ID de subscription, pas un handler
    // Pour l'instant on clear tous les listeners de ces événements
    this.eventBus.removeAllListeners('viewer:elementSelected');
    this.eventBus.removeAllListeners('viewer:viewChangeRequested');
  }
}