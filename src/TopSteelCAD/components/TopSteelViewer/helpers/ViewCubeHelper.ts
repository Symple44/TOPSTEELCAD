import * as THREE from 'three';

export class ViewCubeHelper {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private cube: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;
  private size: number = 120;
  private distance: number = 5;
  
  private onViewChangeCallback?: (direction: string) => void;
  
  constructor(parentRenderer: THREE.WebGLRenderer, container: HTMLElement) {
    this.renderer = parentRenderer;
    this.container = container;
    
    // Créer une scène séparée pour le ViewCube
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent
    
    // Caméra orthographique pour le cube
    const aspect = 1;
    const frustumSize = 4;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    this.camera.position.set(3, 3, 3);
    this.camera.lookAt(0, 0, 0);
    
    // Raycaster pour la détection des clics
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Créer le cube
    this.cube = this.createViewCube();
    this.scene.add(this.cube);
    
    // Ajouter l'éclairage
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
    
    // Ajouter les event listeners
    this.setupEventListeners();
  }
  
  private createViewCube(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    // Créer les matériaux pour chaque face
    const materials = [
      this.createFaceMaterial('RIGHT', '#FF6B6B'),  // +X
      this.createFaceMaterial('LEFT', '#4ECDC4'),   // -X
      this.createFaceMaterial('TOP', '#45B7D1'),    // +Y
      this.createFaceMaterial('BOTTOM', '#96CEB4'), // -Y
      this.createFaceMaterial('FRONT', '#FFEAA7'),  // +Z
      this.createFaceMaterial('BACK', '#DDA0DD')    // -Z
    ];
    
    const cube = new THREE.Mesh(geometry, materials);
    
    // Ajouter les arêtes
    const edges = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ 
      color: 0x333333,
      linewidth: 2
    });
    const edgesMesh = new THREE.LineSegments(edges, edgesMaterial);
    cube.add(edgesMesh);
    
    // Ajouter les labels comme sprites
    this.addCornerLabels(cube);
    
    return cube;
  }
  
  private createFaceMaterial(text: string, color: string): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Fond avec gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, this.darkenColor(color, 20));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Bordure
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 252);
    
    // Texte
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.9
    });
  }
  
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }
  
  private addCornerLabels(cube: THREE.Mesh): void {
    // Ajouter des labels aux coins pour une navigation plus précise
    const positions = [
      { pos: [1.2, 1.2, 1.2], text: 'FTR' },
      { pos: [-1.2, 1.2, 1.2], text: 'FTL' },
      { pos: [1.2, -1.2, 1.2], text: 'FBR' },
      { pos: [-1.2, -1.2, 1.2], text: 'FBL' },
      { pos: [1.2, 1.2, -1.2], text: 'BTR' },
      { pos: [-1.2, 1.2, -1.2], text: 'BTL' },
      { pos: [1.2, -1.2, -1.2], text: 'BBR' },
      { pos: [-1.2, -1.2, -1.2], text: 'BBL' }
    ];
    
    positions.forEach(({ pos, text }) => {
      const sprite = this.createTextSprite(text, 10);
      sprite.position.set(...pos as [number, number, number]);
      cube.add(sprite);
    });
  }
  
  private createTextSprite(text: string, fontSize: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.7
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1);
    
    return sprite;
  }
  
  private setupEventListeners(): void {
    // Gestion du clic
    this.container.addEventListener('click', (event) => this.onMouseClick(event));
    
    // Gestion du survol
    this.container.addEventListener('mousemove', (event) => this.onMouseMove(event));
  }
  
  private onMouseClick(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    
    // Vérifier si le clic est dans la zone du ViewCube
    if (event.clientX - rect.left > rect.width - this.size - 20 &&
        event.clientY - rect.top < this.size + 20) {
      
      // Calculer la position de la souris relative au ViewCube
      const x = ((event.clientX - rect.left - (rect.width - this.size - 20)) / this.size) * 2 - 1;
      const y = -((event.clientY - rect.top - 20) / this.size) * 2 + 1;
      
      this.mouse.set(x, y);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const intersects = this.raycaster.intersectObject(this.cube);
      
      if (intersects.length > 0) {
        const face = intersects[0].face;
        if (face) {
          const normal = face.normal.clone();
          normal.transformDirection(this.cube.matrixWorld);
          
          // Déterminer la direction basée sur la normale
          let direction = '';
          if (Math.abs(normal.x) > 0.5) direction = normal.x > 0 ? 'right' : 'left';
          else if (Math.abs(normal.y) > 0.5) direction = normal.y > 0 ? 'top' : 'bottom';
          else if (Math.abs(normal.z) > 0.5) direction = normal.z > 0 ? 'front' : 'back';
          
          if (direction && this.onViewChangeCallback) {
            this.onViewChangeCallback(direction);
          }
        }
      }
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    
    // Changer le curseur si on survole le ViewCube
    if (event.clientX - rect.left > rect.width - this.size - 20 &&
        event.clientY - rect.top < this.size + 20) {
      this.container.style.cursor = 'pointer';
    } else {
      this.container.style.cursor = 'default';
    }
  }
  
  public update(mainCamera: THREE.Camera): void {
    // Synchroniser l'orientation du cube avec la caméra principale
    const quaternion = mainCamera.quaternion.clone();
    quaternion.invert();
    this.cube.quaternion.copy(quaternion);
  }
  
  public render(): void {
    // Sauvegarder le viewport actuel
    const currentViewport = new THREE.Vector4();
    this.renderer.getCurrentViewport(currentViewport);
    
    // Définir le viewport pour le ViewCube (coin supérieur droit)
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const cubeSize = this.size * window.devicePixelRatio;
    const margin = 20 * window.devicePixelRatio;
    
    this.renderer.setViewport(
      width - cubeSize - margin,
      height - cubeSize - margin,
      cubeSize,
      cubeSize
    );
    
    // Désactiver le scissor test temporairement
    this.renderer.setScissorTest(false);
    
    // Rendre le ViewCube
    this.renderer.render(this.scene, this.camera);
    
    // Restaurer le viewport
    this.renderer.setViewport(currentViewport);
  }
  
  public setOnViewChange(callback: (direction: string) => void): void {
    this.onViewChangeCallback = callback;
  }
  
  public dispose(): void {
    // Nettoyer les ressources
    this.cube.geometry.dispose();
    if (Array.isArray(this.cube.material)) {
      this.cube.material.forEach(mat => mat.dispose());
    } else {
      this.cube.material.dispose();
    }
  }
}