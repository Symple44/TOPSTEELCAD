import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * Point de snap avec sa position et son type
 */
export interface SnapPoint {
  position: THREE.Vector3;
  type: string;
  object?: THREE.Object3D;
}

/**
 * Configuration de l'outil de mesure avec snap
 */
export interface SnapMeasurementConfig {
  snapDistance: number; // Distance en pixels pour le snap
  pointSize: number;    // Taille des points de mesure
  lineWidth: number;    // Épaisseur des lignes
  textSize: number;     // Taille du texte
}

/**
 * SnapMeasurementTool - Outil de mesure avec système de snap intelligent
 * 
 * Responsabilités:
 * - Détection des points d'accrochage (angles, arêtes, centres, faces)
 * - Création des mesures visuelles avec snap
 * - Gestion des interactions de mesure intelligentes
 */
export class SnapMeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private canvas: HTMLCanvasElement;
  private eventBus: EventBus;
  
  // Configuration
  private config: SnapMeasurementConfig = {
    snapDistance: 50, // Réduit pour plus de précision
    pointSize: 15, // Beaucoup plus petit et élégant
    lineWidth: 2,
    textSize: 300
  };
  
  // État
  private isActive = false;
  private measurementPoints: THREE.Vector3[] = [];
  private snapPoint: SnapPoint | null = null;
  private snapIndicator: THREE.Mesh | null = null;
  
  // Raycaster pour les intersections
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  
  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    canvas: HTMLCanvasElement, 
    eventBus: EventBus,
    config?: Partial<SnapMeasurementConfig>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.eventBus = eventBus;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  /**
   * Active/désactive l'outil de mesure
   */
  setActive(active: boolean): void {
    this.isActive = active;
    
    if (active) {
      this.canvas.style.cursor = 'crosshair';
      this.eventBus.emit('snap-measurement:activated');
    } else {
      this.canvas.style.cursor = 'default';
      this.reset();
      this.hideSnapIndicator();
      this.eventBus.emit('snap-measurement:deactivated');
    }
  }
  
  /**
   * Remet à zéro les points de mesure en cours
   */
  reset(): void {
    this.measurementPoints = [];
    this.snapPoint = null;
  }
  
  /**
   * Traite le mouvement de la souris pour détecter les snap points
   */
  handleMouseMove(event: MouseEvent): void {
    if (!this.isActive) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.detectSnapPoints();
  }
  
  /**
   * Traite le clic pour ajouter un point de mesure
   */
  handleClick(event: MouseEvent): boolean {
    if (!this.isActive) return false;
    
    // Utiliser le snap point s'il existe, sinon intersection normale
    let point: THREE.Vector3;
    
    if (this.snapPoint) {
      point = this.snapPoint.position.clone();
      this.eventBus.emit('snap-measurement:snapUsed', { 
        point, 
        type: this.snapPoint.type 
      });
    } else {
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length === 0) return false;
      point = intersects[0].point;
    }
    
    this.addMeasurementPoint(point);
    return true; // Événement consommé
  }
  
  /**
   * Détecte les points d'accrochage proches du curseur
   */
  private detectSnapPoints(): void {
    let bestSnap: SnapPoint & { distance: number } | null = null;
    
    // Chercher les intersections avec les objets
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Debug : afficher les intersections trouvées
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const object = intersect.object;
      
      if (object instanceof THREE.Mesh && object.userData.elementId) {
        // Points candidats pour le snap
        const snapCandidates = this.getSnapCandidatesForObject(object);
        
        // Trouver le snap point le plus proche
        snapCandidates.forEach(candidate => {
          const screenPos = candidate.position.clone().project(this.camera);
          const screenX = (screenPos.x * 0.5 + 0.5) * this.canvas.clientWidth;
          const screenY = (screenPos.y * -0.5 + 0.5) * this.canvas.clientHeight;
          
          const currentX = (this.pointer.x * 0.5 + 0.5) * this.canvas.clientWidth;
          const currentY = (this.pointer.y * -0.5 + 0.5) * this.canvas.clientHeight;
          
          const pixelDistance = Math.sqrt(
            Math.pow(screenX - currentX, 2) + Math.pow(screenY - currentY, 2)
          );
          
          if (pixelDistance < this.config.snapDistance) {
            if (!bestSnap || pixelDistance < bestSnap.distance) {
              bestSnap = {
                ...candidate,
                distance: pixelDistance
              };
            }
          }
        });
      }
    }
    
    // Mettre à jour le snap point
    if (bestSnap) {
      this.snapPoint = bestSnap;
      this.showSnapIndicator(bestSnap.position, bestSnap.type);
      this.eventBus.emit('snap-measurement:snapDetected', bestSnap);
    } else {
      this.snapPoint = null;
      this.hideSnapIndicator();
      this.eventBus.emit('snap-measurement:snapCleared');
    }
  }
  
  /**
   * Génère les points d'accrochage pour un objet
   */
  private getSnapCandidatesForObject(object: THREE.Mesh): SnapPoint[] {
    const candidates: SnapPoint[] = [];
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    
    // Centre de l'objet
    candidates.push({ 
      position: center, 
      type: 'Centre', 
      object 
    });
    
    // 8 coins de la bounding box
    const corners = [
      { pos: new THREE.Vector3(box.min.x, box.min.y, box.min.z), name: 'Angle Inf-Gauche-Avant' },
      { pos: new THREE.Vector3(box.max.x, box.min.y, box.min.z), name: 'Angle Inf-Droite-Avant' },
      { pos: new THREE.Vector3(box.min.x, box.max.y, box.min.z), name: 'Angle Sup-Gauche-Avant' },
      { pos: new THREE.Vector3(box.max.x, box.max.y, box.min.z), name: 'Angle Sup-Droite-Avant' },
      { pos: new THREE.Vector3(box.min.x, box.min.y, box.max.z), name: 'Angle Inf-Gauche-Arrière' },
      { pos: new THREE.Vector3(box.max.x, box.min.y, box.max.z), name: 'Angle Inf-Droite-Arrière' },
      { pos: new THREE.Vector3(box.min.x, box.max.y, box.max.z), name: 'Angle Sup-Gauche-Arrière' },
      { pos: new THREE.Vector3(box.max.x, box.max.y, box.max.z), name: 'Angle Sup-Droite-Arrière' },
    ];
    
    corners.forEach(corner => {
      candidates.push({ 
        position: corner.pos, 
        type: corner.name, 
        object 
      });
    });
    
    // Centres des faces
    const faces = [
      { pos: new THREE.Vector3(center.x, box.min.y, center.z), name: 'Face Inférieure' },
      { pos: new THREE.Vector3(center.x, box.max.y, center.z), name: 'Face Supérieure' },
      { pos: new THREE.Vector3(box.min.x, center.y, center.z), name: 'Face Gauche' },
      { pos: new THREE.Vector3(box.max.x, center.y, center.z), name: 'Face Droite' },
      { pos: new THREE.Vector3(center.x, center.y, box.min.z), name: 'Face Avant' },
      { pos: new THREE.Vector3(center.x, center.y, box.max.z), name: 'Face Arrière' },
    ];
    
    faces.forEach(face => {
      candidates.push({ 
        position: face.pos, 
        type: face.name, 
        object 
      });
    });
    
    // Centres des arêtes principales (12 arêtes)
    const edges = [
      // Arêtes verticales
      { pos: new THREE.Vector3(box.min.x, center.y, box.min.z), name: 'Arête Gauche-Avant' },
      { pos: new THREE.Vector3(box.max.x, center.y, box.min.z), name: 'Arête Droite-Avant' },
      { pos: new THREE.Vector3(box.min.x, center.y, box.max.z), name: 'Arête Gauche-Arrière' },
      { pos: new THREE.Vector3(box.max.x, center.y, box.max.z), name: 'Arête Droite-Arrière' },
      
      // Arêtes horizontales (bas)
      { pos: new THREE.Vector3(center.x, box.min.y, box.min.z), name: 'Arête Bas-Avant' },
      { pos: new THREE.Vector3(center.x, box.min.y, box.max.z), name: 'Arête Bas-Arrière' },
      { pos: new THREE.Vector3(box.min.x, box.min.y, center.z), name: 'Arête Bas-Gauche' },
      { pos: new THREE.Vector3(box.max.x, box.min.y, center.z), name: 'Arête Bas-Droite' },
      
      // Arêtes horizontales (haut)
      { pos: new THREE.Vector3(center.x, box.max.y, box.min.z), name: 'Arête Haut-Avant' },
      { pos: new THREE.Vector3(center.x, box.max.y, box.max.z), name: 'Arête Haut-Arrière' },
      { pos: new THREE.Vector3(box.min.x, box.max.y, center.z), name: 'Arête Haut-Gauche' },
      { pos: new THREE.Vector3(box.max.x, box.max.y, center.z), name: 'Arête Haut-Droite' },
    ];
    
    edges.forEach(edge => {
      candidates.push({ 
        position: edge.pos, 
        type: edge.name, 
        object 
      });
    });
    
    return candidates;
  }
  
  /**
   * Affiche l'indicateur de snap
   */
  private showSnapIndicator(position: THREE.Vector3, type: string): void {
    this.hideSnapIndicator();
    
    // Créer un indicateur minimaliste et élégant
    const indicatorGroup = new THREE.Group();
    
    // Point central précis (petit point blanc)
    const centerGeometry = new THREE.SphereGeometry(this.config.pointSize * 0.3, 8, 6);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 1.0,
      depthTest: false, // Toujours visible
      depthWrite: false
    });
    const centerPoint = new THREE.Mesh(centerGeometry, centerMaterial);
    centerPoint.position.copy(position);
    centerPoint.renderOrder = 999; // Rendu en dernier
    
    // Croix fine pour marquer précisément le point
    const crossMaterial = new THREE.LineBasicMaterial({
      color: '#00ff00',
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
      depthTest: false,
      depthWrite: false
    });
    
    // Lignes de la croix
    const crossSize = this.config.pointSize;
    const crossPoints = [
      // Ligne horizontale
      [new THREE.Vector3(-crossSize, 0, 0), new THREE.Vector3(crossSize, 0, 0)],
      // Ligne verticale
      [new THREE.Vector3(0, -crossSize, 0), new THREE.Vector3(0, crossSize, 0)]
    ];
    
    crossPoints.forEach(points => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, crossMaterial);
      line.position.copy(position);
      line.lookAt(this.camera.position); // Orienter vers la caméra
      indicatorGroup.add(line);
    });
    
    // Cercle externe subtil
    const curve = new THREE.EllipseCurve(
      0, 0,                           // Centre
      this.config.pointSize * 1.2,     // Rayon X
      this.config.pointSize * 1.2,     // Rayon Y
      0, 2 * Math.PI,                  // Angle de début et fin
      false,                            // Sens horaire
      0                                 // Rotation
    );
    
    const circlePoints = curve.getPoints(32);
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circleMaterial = new THREE.LineBasicMaterial({
      color: '#00ff00',
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
      depthTest: false,
      depthWrite: false
    });
    
    const circle = new THREE.Line(circleGeometry, circleMaterial);
    circle.position.copy(position);
    circle.lookAt(this.camera.position);
    indicatorGroup.add(circle);
    
    // Ajouter le point central
    indicatorGroup.add(centerPoint);
    
    indicatorGroup.name = 'SnapIndicator';
    indicatorGroup.userData = { isSnapIndicator: true };
    
    this.snapIndicator = indicatorGroup;
    this.scene.add(this.snapIndicator);
  }
  
  /**
   * Cache l'indicateur de snap
   */
  private hideSnapIndicator(): void {
    if (this.snapIndicator) {
      this.scene.remove(this.snapIndicator);
      
      // Nettoyer les ressources du groupe
      if (this.snapIndicator instanceof THREE.Group) {
        this.snapIndicator.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        this.snapIndicator.clear();
      } else if (this.snapIndicator instanceof THREE.Mesh) {
        // Fallback pour l'ancienne version
        this.snapIndicator.geometry?.dispose();
        if (this.snapIndicator.material instanceof THREE.Material) {
          this.snapIndicator.material.dispose();
        }
      }
      
      this.snapIndicator = null;
    }
  }
  
  /**
   * Ajoute un point de mesure
   */
  private addMeasurementPoint(position: THREE.Vector3): void {
    const newPoints = [...this.measurementPoints, position];
    this.measurementPoints = newPoints;
    
    // Créer le point visible
    this.createMeasurementPoint(position, newPoints.length);
    
    // Si on a 2 points, créer la mesure
    if (newPoints.length === 2) {
      const distance = newPoints[0].distanceTo(newPoints[1]);
      this.createMeasurementLine(newPoints[0], newPoints[1], distance);
      
      
      // Émettre l'événement de mesure créée
      this.eventBus.emit('snap-measurement:created', {
        points: newPoints,
        distance,
        id: `measurement_${Date.now()}`
      });
      
      // Réinitialiser pour une nouvelle mesure
      this.reset();
    }
    
    
    // Émettre l'événement de point ajouté
    this.eventBus.emit('snap-measurement:pointAdded', {
      point: position,
      index: newPoints.length,
      total: newPoints.length
    });
  }
  
  /**
   * Crée un point visible pour la mesure
   */
  private createMeasurementPoint(position: THREE.Vector3, index: number): void {
    // Groupe pour le point de mesure
    const pointGroup = new THREE.Group();
    
    // Point central petit et élégant
    const geometry = new THREE.SphereGeometry(this.config.pointSize * 0.4, 12, 8);
    const material = new THREE.MeshBasicMaterial({
      color: index === 1 ? '#22c55e' : '#3b82f6', // Vert pour le 1er, bleu pour le 2ème
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    pointGroup.add(sphere);
    
    // Anneau externe pour visibilité
    const ringCurve = new THREE.EllipseCurve(
      0, 0,
      this.config.pointSize * 0.8,
      this.config.pointSize * 0.8,
      0, 2 * Math.PI,
      false,
      0
    );
    
    const ringPoints = ringCurve.getPoints(24);
    const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMaterial = new THREE.LineBasicMaterial({
      color: index === 1 ? '#22c55e' : '#3b82f6',
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false
    });
    
    const ring = new THREE.Line(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.lookAt(this.camera.position);
    pointGroup.add(ring);
    
    pointGroup.name = `MeasurementPoint_${index}_${Date.now()}`;
    pointGroup.userData = { isMeasurement: true, pointIndex: index };
    
    this.scene.add(pointGroup);
  }
  
  /**
   * Crée une ligne de mesure avec texte
   */
  private createMeasurementLine(start: THREE.Vector3, end: THREE.Vector3, distance: number): void {
    // Ligne de mesure avec style pointillé
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([start, end]);
    
    const material = new THREE.LineDashedMaterial({
      color: '#60a5fa', // Bleu plus clair
      linewidth: this.config.lineWidth,
      scale: 1,
      dashSize: 50,
      gapSize: 20,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
      depthWrite: false
    });
    
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Nécessaire pour les lignes pointillées
    line.name = `MeasurementLine_${Date.now()}`;
    line.userData = { isMeasurement: true };
    
    this.scene.add(line);
    
    // Texte avec la distance
    const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
    this.createMeasurementText(midPoint, `${distance.toFixed(1)}mm`);
  }
  
  /**
   * Crée un texte de mesure
   */
  private createMeasurementText(position: THREE.Vector3, text: string): void {
    // Créer le canvas pour le texte
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Dessiner le texte
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#3b82f6';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    context.fillStyle = '#000000';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Créer la texture et le mesh
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });
    
    const geometry = new THREE.PlaneGeometry(this.config.textSize, this.config.textSize * 0.25);
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.copy(position);
    textMesh.position.y += this.config.pointSize * 4; // Décaler vers le haut
    textMesh.name = `MeasurementText_${Date.now()}`;
    textMesh.userData = { isMeasurement: true };
    
    // Orientation vers la caméra
    textMesh.lookAt(this.camera.position);
    
    this.scene.add(textMesh);
  }
  
  /**
   * Supprime toutes les mesures de la scène
   */
  clearAllMeasurements(): void {
    const toRemove: THREE.Object3D[] = [];
    
    this.scene.traverse((child) => {
      if (child.userData.isMeasurement) {
        toRemove.push(child);
      }
    });
    
    toRemove.forEach(obj => {
      this.scene.remove(obj);
      
      // Nettoyer les ressources
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      } else if (obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
    
    this.eventBus.emit('snap-measurement:allCleared', { count: toRemove.length });
  }
  
  // Getters
  get active(): boolean { 
    return this.isActive; 
  }
  
  get currentSnapPoint(): SnapPoint | null { 
    return this.snapPoint; 
  }
  
  get pointsCount(): number { 
    return this.measurementPoints.length; 
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.hideSnapIndicator();
    this.clearAllMeasurements();
    this.reset();
  }
}