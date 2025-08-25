import * as THREE from 'three';
import { ViewDirection } from '../3DLibrary/types/camera.types';
import { CameraController } from '../cameras/CameraController';
import { ViewCubeRenderer } from './ViewCubeRenderer';

export interface ViewCubeInteractionOptions {
  animationDuration?: number;
  enableDrag?: boolean;
  enableDoubleClick?: boolean;
  onViewChange?: (view: ViewDirection | string) => void;
}

export class ViewCubeInteraction {
  private renderer: ViewCubeRenderer;
  private cameraController: CameraController;
  private container: HTMLElement;
  private isDragging = false;
  private lastMousePosition = { x: 0, y: 0 };
  private options: Required<ViewCubeInteractionOptions>;
  
  constructor(
    renderer: ViewCubeRenderer,
    cameraController: CameraController,
    container: HTMLElement,
    options: ViewCubeInteractionOptions = {}
  ) {
    this.renderer = renderer;
    this.cameraController = cameraController;
    this.container = container;
    
    this.options = {
      animationDuration: options.animationDuration ?? 500,
      enableDrag: options.enableDrag ?? true,
      enableDoubleClick: options.enableDoubleClick ?? true,
      onViewChange: options.onViewChange ?? (() => {})
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse events
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.container.addEventListener('click', this.handleClick.bind(this));
    
    if (this.options.enableDoubleClick) {
      this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }
    
    // Touch events for mobile support
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Prevent context menu
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button === 0 && this.options.enableDrag) {
      this.isDragging = true;
      this.lastMousePosition = { x: event.clientX, y: event.clientY };
      this.container.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.lastMousePosition.x;
      const deltaY = event.clientY - this.lastMousePosition.y;
      
      this.renderer.rotateCube(deltaX, deltaY);
      
      this.lastMousePosition = { x: event.clientX, y: event.clientY };
    } else {
      this.renderer.handleMouseMove(event);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.style.cursor = 'default';
    }
  }

  private handleMouseLeave(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.style.cursor = 'default';
    }
  }

  private handleClick(event: MouseEvent): void {
    // Don't process click if we were dragging
    if (this.isDragging) {
      return;
    }
    
    const clickedObject = this.renderer.handleMouseClick(event);
    
    if (clickedObject) {
      const userData = clickedObject.userData;
      
      if (userData.type === 'face') {
        this.handleFaceClick(userData.data.id);
      } else if (userData.type === 'edge') {
        this.handleEdgeClick(userData.data.id);
      } else if (userData.type === 'corner') {
        this.handleCornerClick(userData.data.id);
      }
    }
  }

  private handleDoubleClick(event: MouseEvent): void {
    // Reset to home view on double click
    this.cameraController.setView('iso', this.options.animationDuration);
    this.options.onViewChange('iso');
  }

  private handleFaceClick(faceId: string): void {
    // Map face IDs to ViewDirection
    const viewMap: Record<string, ViewDirection> = {
      'front': 'front',
      'back': 'back',
      'left': 'left',
      'right': 'right',
      'top': 'top',
      'bottom': 'bottom'
    };
    
    const view = viewMap[faceId];
    if (view) {
      this.cameraController.setView(view, this.options.animationDuration);
      this.options.onViewChange(view);
    }
  }

  private handleEdgeClick(edgeId: string): void {
    // Handle edge clicks for intermediate views
    const edgeViewMap: Record<string, { position: THREE.Vector3, target: THREE.Vector3 }> = {
      'top-front': { 
        position: new THREE.Vector3(0, 5, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'top-back': { 
        position: new THREE.Vector3(0, 5, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-front': { 
        position: new THREE.Vector3(0, -5, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-back': { 
        position: new THREE.Vector3(0, -5, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'left-front': { 
        position: new THREE.Vector3(-5, 0, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'left-back': { 
        position: new THREE.Vector3(-5, 0, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'right-front': { 
        position: new THREE.Vector3(5, 0, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'right-back': { 
        position: new THREE.Vector3(5, 0, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'top-left': { 
        position: new THREE.Vector3(-5, 5, 0), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'top-right': { 
        position: new THREE.Vector3(5, 5, 0), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-left': { 
        position: new THREE.Vector3(-5, -5, 0), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-right': { 
        position: new THREE.Vector3(5, -5, 0), 
        target: new THREE.Vector3(0, 0, 0) 
      }
    };
    
    const edgeView = edgeViewMap[edgeId];
    if (edgeView) {
      this.cameraController.animateToPosition(
        edgeView.position,
        edgeView.target,
        this.options.animationDuration
      );
      this.options.onViewChange(edgeId);
    }
  }

  private handleCornerClick(cornerId: string): void {
    // Handle corner clicks for isometric views
    const cornerViewMap: Record<string, { position: THREE.Vector3, target: THREE.Vector3 }> = {
      'top-front-left': { 
        position: new THREE.Vector3(-5, 5, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'top-front-right': { 
        position: new THREE.Vector3(5, 5, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'top-back-left': { 
        position: new THREE.Vector3(-5, 5, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'top-back-right': { 
        position: new THREE.Vector3(5, 5, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-front-left': { 
        position: new THREE.Vector3(-5, -5, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-front-right': { 
        position: new THREE.Vector3(5, -5, 5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-back-left': { 
        position: new THREE.Vector3(-5, -5, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      },
      'bottom-back-right': { 
        position: new THREE.Vector3(5, -5, -5), 
        target: new THREE.Vector3(0, 0, 0) 
      }
    };
    
    const cornerView = cornerViewMap[cornerId];
    if (cornerView) {
      this.cameraController.animateToPosition(
        cornerView.position,
        cornerView.target,
        this.options.animationDuration
      );
      this.options.onViewChange(cornerId);
    }
  }

  // Touch event handlers
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1 && this.options.enableDrag) {
      this.isDragging = true;
      this.lastMousePosition = { 
        x: event.touches[0].clientX, 
        y: event.touches[0].clientY 
      };
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (this.isDragging && event.touches.length === 1) {
      const deltaX = event.touches[0].clientX - this.lastMousePosition.x;
      const deltaY = event.touches[0].clientY - this.lastMousePosition.y;
      
      this.renderer.rotateCube(deltaX, deltaY);
      
      this.lastMousePosition = { 
        x: event.touches[0].clientX, 
        y: event.touches[0].clientY 
      };
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isDragging = false;
    }
  }

  public syncWithCamera(camera: THREE.Camera): void {
    // Sync ViewCube orientation with main camera
    this.renderer.syncWithMainCamera(camera.quaternion);
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.renderer.setTheme(theme);
  }

  public dispose(): void {
    // Remove all event listeners
    this.container.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.container.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.container.removeEventListener('click', this.handleClick.bind(this));
    this.container.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}