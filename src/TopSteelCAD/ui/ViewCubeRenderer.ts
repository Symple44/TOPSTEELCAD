import * as THREE from 'three';
import { ViewDirection } from '../3DLibrary/types/camera.types';

export interface CubeFace {
  id: ViewDirection | string;
  label: string;
  normal: THREE.Vector3;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  color: string;
  hoverColor: string;
  mesh?: THREE.Mesh;
}

export interface CubeEdge {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh?: THREE.Mesh;
}

export interface CubeCorner {
  id: string;
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
}

export class ViewCubeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private cubeGroup: THREE.Group;
  private faces: CubeFace[] = [];
  private edges: CubeEdge[] = [];
  private corners: CubeCorner[] = [];
  private hoveredObject: THREE.Object3D | null = null;
  private selectedFace: CubeFace | null = null;
  private theme: 'light' | 'dark' = 'light';
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(private container: HTMLElement, private size: number = 120) {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    
    // Setup orthographic camera for consistent cube view
    const aspect = 1;
    const frustumSize = 2.5;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    this.camera.position.set(3, 2, 3);
    this.camera.lookAt(0, 0, 0);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(size, size);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    
    this.container.appendChild(this.renderer.domElement);
    
    // Create cube group
    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);
    
    // Setup lighting
    this.setupLighting();
    
    // Create cube geometry
    this.createCube();
    
    // Start render loop
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);  // Plus lumineux
    this.scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, -5, -5);
    this.scene.add(directionalLight2);
    
    // Ajout d'une lumière de rim pour un meilleur contour
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 0, -10);
    this.scene.add(rimLight);
  }

  private createCube(): void {
    const cubeSize = 1;
    const faceSize = 0.98;  // Faces plus grandes, moins d'espace entre elles
    const edgeSize = 0.05;  // Bords beaucoup plus fins
    const cornerSize = 0.1;  // Coins plus petits
    
    // Define faces with their orientations
    const faceData: Omit<CubeFace, 'mesh'>[] = [
      {
        id: 'front',
        label: 'FRONT',
        normal: new THREE.Vector3(0, 0, 1),
        position: new THREE.Vector3(0, 0, cubeSize / 2),
        rotation: new THREE.Euler(0, 0, 0),
        color: '#e0f2fe',  // Bleu plus soutenu pour meilleur contraste
        hoverColor: '#7dd3fc'
      },
      {
        id: 'back',
        label: 'BACK',
        normal: new THREE.Vector3(0, 0, -1),
        position: new THREE.Vector3(0, 0, -cubeSize / 2),
        rotation: new THREE.Euler(0, Math.PI, 0),
        color: '#e0f2fe',  // Bleu plus soutenu pour meilleur contraste
        hoverColor: '#7dd3fc'
      },
      {
        id: 'right',
        label: 'RIGHT',
        normal: new THREE.Vector3(1, 0, 0),
        position: new THREE.Vector3(cubeSize / 2, 0, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        color: '#dcfce7',  // Vert plus soutenu pour meilleur contraste
        hoverColor: '#86efac'
      },
      {
        id: 'left',
        label: 'LEFT',
        normal: new THREE.Vector3(-1, 0, 0),
        position: new THREE.Vector3(-cubeSize / 2, 0, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        color: '#dcfce7',  // Vert plus soutenu pour meilleur contraste
        hoverColor: '#86efac'
      },
      {
        id: 'top',
        label: 'TOP',
        normal: new THREE.Vector3(0, 1, 0),
        position: new THREE.Vector3(0, cubeSize / 2, 0),
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
        color: '#fed7aa',  // Orange plus soutenu pour meilleur contraste
        hoverColor: '#fdba74'
      },
      {
        id: 'bottom',
        label: 'BOTTOM',
        normal: new THREE.Vector3(0, -1, 0),
        position: new THREE.Vector3(0, -cubeSize / 2, 0),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
        color: '#fed7aa',  // Orange plus soutenu pour meilleur contraste
        hoverColor: '#fdba74'
      }
    ];
    
    // Create face meshes
    const faceGeometry = new THREE.PlaneGeometry(faceSize, faceSize);
    faceData.forEach(face => {
      // Créer un matériau avec bordure
      const material = new THREE.MeshPhongMaterial({
        color: face.color,
        transparent: true,
        opacity: 0.85,  // Légèrement transparent pour effet moderne
        side: THREE.DoubleSide,
        specular: 0x444444,  // Reflet plus visible
        shininess: 20,
        emissive: face.color,  // Légère émission pour effet lumineux
        emissiveIntensity: 0.1
      });
      
      const mesh = new THREE.Mesh(faceGeometry, material);
      mesh.position.copy(face.position);
      mesh.rotation.copy(face.rotation);
      mesh.userData = { type: 'face', data: face };
      
      // Add text label
      this.addTextLabel(mesh, face.label);
      
      this.cubeGroup.add(mesh);
      this.faces.push({ ...face, mesh });
    });
    
    // Create edges
    const edgeGeometry = new THREE.BoxGeometry(cubeSize * 1.02, edgeSize, edgeSize);  // Bords moins longs
    const edgeMaterial = new THREE.MeshPhongMaterial({
      color: '#b0bec5',  // Couleur plus claire
      transparent: true,
      opacity: 0.5  // Plus transparent
    });
    
    // Horizontal edges
    const horizontalEdges = [
      { id: 'top-front', position: new THREE.Vector3(0, cubeSize / 2, cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'top-back', position: new THREE.Vector3(0, cubeSize / 2, -cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'bottom-front', position: new THREE.Vector3(0, -cubeSize / 2, cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'bottom-back', position: new THREE.Vector3(0, -cubeSize / 2, -cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) }
    ];
    
    // Vertical edges
    const verticalEdgeGeometry = new THREE.BoxGeometry(edgeSize, cubeSize * 1.02, edgeSize);
    const verticalEdges = [
      { id: 'left-front', position: new THREE.Vector3(-cubeSize / 2, 0, cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'left-back', position: new THREE.Vector3(-cubeSize / 2, 0, -cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'right-front', position: new THREE.Vector3(cubeSize / 2, 0, cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'right-back', position: new THREE.Vector3(cubeSize / 2, 0, -cubeSize / 2), rotation: new THREE.Euler(0, 0, 0) }
    ];
    
    // Depth edges
    const depthEdgeGeometry = new THREE.BoxGeometry(edgeSize, edgeSize, cubeSize * 1.02);
    const depthEdges = [
      { id: 'top-left', position: new THREE.Vector3(-cubeSize / 2, cubeSize / 2, 0), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'top-right', position: new THREE.Vector3(cubeSize / 2, cubeSize / 2, 0), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'bottom-left', position: new THREE.Vector3(-cubeSize / 2, -cubeSize / 2, 0), rotation: new THREE.Euler(0, 0, 0) },
      { id: 'bottom-right', position: new THREE.Vector3(cubeSize / 2, -cubeSize / 2, 0), rotation: new THREE.Euler(0, 0, 0) }
    ];
    
    // Add all edges
    horizontalEdges.forEach(edge => {
      const mesh = new THREE.Mesh(edgeGeometry, edgeMaterial.clone());
      mesh.position.copy(edge.position);
      mesh.rotation.copy(edge.rotation);
      mesh.userData = { type: 'edge', data: edge };
      this.cubeGroup.add(mesh);
      this.edges.push({ ...edge, mesh });
    });
    
    verticalEdges.forEach(edge => {
      const mesh = new THREE.Mesh(verticalEdgeGeometry, edgeMaterial.clone());
      mesh.position.copy(edge.position);
      mesh.rotation.copy(edge.rotation);
      mesh.userData = { type: 'edge', data: edge };
      this.cubeGroup.add(mesh);
      this.edges.push({ ...edge, mesh });
    });
    
    depthEdges.forEach(edge => {
      const mesh = new THREE.Mesh(depthEdgeGeometry, edgeMaterial.clone());
      mesh.position.copy(edge.position);
      mesh.rotation.copy(edge.rotation);
      mesh.userData = { type: 'edge', data: edge };
      this.cubeGroup.add(mesh);
      this.edges.push({ ...edge, mesh });
    });
    
    // Create corners
    const cornerGeometry = new THREE.SphereGeometry(cornerSize, 12, 12);  // Plus de segments pour plus lisse
    const cornerMaterial = new THREE.MeshPhongMaterial({
      color: '#90a4ae',  // Couleur plus claire
      transparent: true,
      opacity: 0.4,  // Beaucoup plus transparent
      specular: 0x444444,
      shininess: 30
    });
    
    const cornerPositions = [
      { id: 'top-front-left', position: new THREE.Vector3(-cubeSize / 2, cubeSize / 2, cubeSize / 2) },
      { id: 'top-front-right', position: new THREE.Vector3(cubeSize / 2, cubeSize / 2, cubeSize / 2) },
      { id: 'top-back-left', position: new THREE.Vector3(-cubeSize / 2, cubeSize / 2, -cubeSize / 2) },
      { id: 'top-back-right', position: new THREE.Vector3(cubeSize / 2, cubeSize / 2, -cubeSize / 2) },
      { id: 'bottom-front-left', position: new THREE.Vector3(-cubeSize / 2, -cubeSize / 2, cubeSize / 2) },
      { id: 'bottom-front-right', position: new THREE.Vector3(cubeSize / 2, -cubeSize / 2, cubeSize / 2) },
      { id: 'bottom-back-left', position: new THREE.Vector3(-cubeSize / 2, -cubeSize / 2, -cubeSize / 2) },
      { id: 'bottom-back-right', position: new THREE.Vector3(cubeSize / 2, -cubeSize / 2, -cubeSize / 2) }
    ];
    
    cornerPositions.forEach(corner => {
      const mesh = new THREE.Mesh(cornerGeometry, cornerMaterial.clone());
      mesh.position.copy(corner.position);
      mesh.userData = { type: 'corner', data: corner };
      this.cubeGroup.add(mesh);
      this.corners.push({ ...corner, mesh });
    });
  }

  private addTextLabel(mesh: THREE.Mesh, text: string): void {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 1024;  // Haute résolution pour texte très net
    canvas.height = 1024;
    
    // Clear canvas with transparency
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configuration pour meilleur contraste
    const isOrangeFace = mesh.userData.data.color === '#fed7aa';  // Face orange/top/bottom
    const isGreenFace = mesh.userData.data.color === '#dcfce7';  // Face verte/left/right
    const isBlueFace = mesh.userData.data.color === '#e0f2fe';   // Face bleue/front/back
    
    // Couleur de texte avec fort contraste selon la face
    let textColor = '#000000';  // Noir par défaut pour fort contraste
    if (this.theme === 'dark') {
      textColor = '#ffffff';  // Blanc en mode sombre
    } else {
      // En mode clair, adapter selon la couleur de la face
      if (isOrangeFace) textColor = '#7c2d12';  // Brun foncé sur orange
      else if (isGreenFace) textColor = '#14532d';  // Vert foncé sur vert clair
      else if (isBlueFace) textColor = '#075985';  // Bleu foncé sur bleu clair
    }
    
    // Ombre pour meilleur contraste
    context.shadowColor = this.theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    context.shadowBlur = 8;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Police très grande et bold
    context.fillStyle = textColor;
    context.font = 'bold 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial';  // Plus grand
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Dessiner le texte deux fois pour plus de contraste
    context.fillText(text, 512, 512);
    context.shadowBlur = 0;  // Deuxième passage sans ombre
    context.fillText(text, 512, 512);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create sprite
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 1,  // Complètement opaque pour maximum de lisibilité
      depthTest: false,  // Toujours visible devant la face
      sizeAttenuation: false  // Taille constante peu importe la distance
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.85, 0.85, 1);  // Encore plus grand pour le texte
    sprite.position.z = 0.03;  // Plus en avant pour éviter tout z-fighting
    
    mesh.add(sprite);
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    // Update text colors
    this.cubeGroup.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        // Recreate text with new theme
        const parent = child.parent as THREE.Mesh;
        if (parent && parent.userData.type === 'face') {
          parent.remove(child);
          this.addTextLabel(parent, parent.userData.data.label);
        }
      }
    });
  }

  public handleMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, false);
    
    // Reset previous hover
    if (this.hoveredObject) {
      const material = (this.hoveredObject as THREE.Mesh).material as THREE.MeshPhongMaterial;
      if (this.hoveredObject.userData.type === 'face') {
        material.color.set(this.hoveredObject.userData.data.color);
        material.opacity = 0.85;
        material.emissiveIntensity = 0.1;
      } else {
        material.opacity = this.hoveredObject.userData.type === 'edge' ? 0.5 : 0.4;
      }
      this.hoveredObject = null;
    }
    
    // Apply hover effect
    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.hoveredObject = object;
      const material = (object as THREE.Mesh).material as THREE.MeshPhongMaterial;
      
      if (object.userData.type === 'face') {
        material.color.set(object.userData.data.hoverColor);
        material.opacity = 1;
        material.emissiveIntensity = 0.3;  // Plus lumineux au survol
        document.body.style.cursor = 'pointer';
      } else if (object.userData.type === 'edge' || object.userData.type === 'corner') {
        material.opacity = object.userData.type === 'edge' ? 0.8 : 0.7;
        document.body.style.cursor = 'pointer';
      }
    } else {
      document.body.style.cursor = 'default';
    }
  }

  public handleMouseClick(event: MouseEvent): THREE.Object3D | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, false);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      return object;
    }
    
    return null;
  }

  public rotateCube(deltaX: number, deltaY: number): void {
    this.cubeGroup.rotation.y += deltaX * 0.01;
    this.cubeGroup.rotation.x += deltaY * 0.01;
  }

  public syncWithMainCamera(quaternion: THREE.Quaternion): void {
    // Sync the cube rotation with main camera orientation
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    this.cubeGroup.rotation.copy(euler);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.scene.clear();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public resize(size: number): void {
    this.size = size;
    this.renderer.setSize(size, size);
    const frustumSize = 2.5;
    this.camera.left = -frustumSize / 2;
    this.camera.right = frustumSize / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
  }
}