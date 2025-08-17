import * as THREE from 'three';

/**
 * SimpleMeasurementTool - Outil de mesure avec système de snap
 */
export class SimpleMeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private canvas: HTMLCanvasElement;
  private isActive: boolean = false;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  // Points de mesure
  private measurementPoints: THREE.Vector3[] = [];
  private measurementLines: THREE.Line[] = [];
  private measurementLabels: HTMLDivElement[] = [];
  private pointMarkers: THREE.Mesh[] = [];
  
  // Système de snap
  private snapIndicator: THREE.Mesh | null = null;
  private currentSnapPoint: THREE.Vector3 | null = null;
  private edgeHelpers: THREE.LineSegments[] = [];
  private vertexHelpers: THREE.Points[] = [];
  
  // Groupe pour les mesures
  private measurementGroup: THREE.Group;
  private snapGroup: THREE.Group;
  
  // Animation loop pour les labels
  private animationId: number | null = null;
  
  // Configuration
  private snapDistance: number = 50; // Distance de snap en pixels
  private snapTypes = {
    vertex: true,
    edge: true,
    center: true,
    midpoint: true
  };
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Créer les groupes
    this.measurementGroup = new THREE.Group();
    this.measurementGroup.name = 'measurements';
    this.scene.add(this.measurementGroup);
    
    this.snapGroup = new THREE.Group();
    this.snapGroup.name = 'snapHelpers';
    this.scene.add(this.snapGroup);
    
    // Créer l'indicateur de snap
    this.createSnapIndicator();
    
    // Démarrer la mise à jour continue des labels
    this.startLabelUpdateLoop();
  }
  
  /**
   * Crée l'indicateur visuel de snap
   */
  private createSnapIndicator() {
    const geometry = new THREE.SphereGeometry(8, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      depthWrite: false
    });
    this.snapIndicator = new THREE.Mesh(geometry, material);
    this.snapIndicator.visible = false;
    this.snapIndicator.renderOrder = 1000;
    this.snapGroup.add(this.snapIndicator);
    
    // Ajouter un anneau autour pour plus de visibilité
    const ringGeometry = new THREE.RingGeometry(10, 15, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.renderOrder = 999;
    this.snapIndicator.add(ring);
  }
  
  /**
   * Active/désactive l'outil de mesure
   */
  setActive(active: boolean) {
    this.isActive = active;
    
    if (active) {
      this.showSnapHelpers();
      // Forcer la visibilité immédiate des helpers
      this.snapGroup.visible = true;
    } else {
      this.hideSnapHelpers();
      this.clearCurrentMeasurement();
      if (this.snapIndicator) {
        this.snapIndicator.visible = false;
      }
      this.snapGroup.visible = false;
    }
  }
  
  /**
   * Affiche les aides visuelles de snap
   */
  private showSnapHelpers() {
    // Nettoyer les anciens helpers
    this.clearSnapHelpers();
    
    // Parcourir tous les meshes de la scène
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.elementId) {
        const geometry = child.geometry;
        
        // Créer les helpers pour les arêtes
        if (this.snapTypes.edge) {
          const edges = new THREE.EdgesGeometry(geometry);
          const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            depthTest: false,
            depthWrite: false
          });
          const edgeHelper = new THREE.LineSegments(edges, edgeMaterial);
          edgeHelper.position.copy(child.position);
          edgeHelper.rotation.copy(child.rotation);
          edgeHelper.scale.copy(child.scale);
          edgeHelper.renderOrder = 500;
          this.edgeHelpers.push(edgeHelper);
          this.snapGroup.add(edgeHelper);
        }
        
        // Créer les helpers pour les sommets
        if (this.snapTypes.vertex) {
          const vertices = this.extractVertices(geometry, child);
          const pointsGeometry = new THREE.BufferGeometry();
          pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          
          const pointsMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 5,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
            depthWrite: false
          });
          
          const vertexHelper = new THREE.Points(pointsGeometry, pointsMaterial);
          vertexHelper.renderOrder = 501;
          this.vertexHelpers.push(vertexHelper);
          this.snapGroup.add(vertexHelper);
        }
      }
    });
  }
  
  /**
   * Cache les aides visuelles de snap
   */
  private hideSnapHelpers() {
    this.clearSnapHelpers();
  }
  
  /**
   * Nettoie les helpers de snap
   */
  private clearSnapHelpers() {
    this.edgeHelpers.forEach(helper => {
      this.snapGroup.remove(helper);
    });
    this.edgeHelpers = [];
    
    this.vertexHelpers.forEach(helper => {
      this.snapGroup.remove(helper);
    });
    this.vertexHelpers = [];
  }
  
  /**
   * Extrait les sommets uniques d'une géométrie
   */
  private extractVertices(geometry: THREE.BufferGeometry, mesh: THREE.Mesh): number[] {
    const vertices: number[] = [];
    const positions = geometry.attributes.position;
    const vertexSet = new Set<string>();
    
    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      
      // Transformer en coordonnées monde
      vertex.applyMatrix4(mesh.matrixWorld);
      
      // Créer une clé unique pour éviter les doublons
      const key = `${vertex.x.toFixed(2)}_${vertex.y.toFixed(2)}_${vertex.z.toFixed(2)}`;
      
      if (!vertexSet.has(key)) {
        vertexSet.add(key);
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }
    
    return vertices;
  }
  
  /**
   * Gère le mouvement de la souris pour le snap
   */
  handleMouseMove(event: MouseEvent): void {
    if (!this.isActive) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Trouver le point de snap le plus proche
    const snapPoint = this.findNearestSnapPoint(event);
    
    if (snapPoint) {
      this.currentSnapPoint = snapPoint;
      if (this.snapIndicator) {
        this.snapIndicator.position.copy(snapPoint);
        this.snapIndicator.visible = true;
        
        // Faire pulser l'indicateur
        const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
        this.snapIndicator.scale.setScalar(scale);
      }
    } else {
      this.currentSnapPoint = null;
      if (this.snapIndicator) {
        this.snapIndicator.visible = false;
      }
    }
    
    // Si on a déjà un point, afficher une ligne temporaire
    if (this.measurementPoints.length === 1 && this.currentSnapPoint) {
      this.updateTemporaryLine(this.measurementPoints[0], this.currentSnapPoint);
    }
  }
  
  /**
   * Trouve le point de snap le plus proche
   */
  private findNearestSnapPoint(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreen = new THREE.Vector2(event.clientX, event.clientY);
    
    let nearestPoint: THREE.Vector3 | null = null;
    let minDistance = this.snapDistance;
    
    // Chercher les sommets
    if (this.snapTypes.vertex) {
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.elementId) {
          const geometry = child.geometry;
          const positions = geometry.attributes.position;
          
          for (let i = 0; i < positions.count; i++) {
            const vertex = new THREE.Vector3(
              positions.getX(i),
              positions.getY(i),
              positions.getZ(i)
            );
            
            // Transformer en coordonnées monde
            vertex.applyMatrix4(child.matrixWorld);
            
            // Projeter en coordonnées écran
            const screenPos = this.worldToScreen(vertex);
            const distance = mouseScreen.distanceTo(screenPos);
            
            if (distance < minDistance) {
              minDistance = distance;
              nearestPoint = vertex.clone();
            }
          }
        }
      });
    }
    
    // Si pas de sommet trouvé, chercher sur les arêtes
    if (!nearestPoint && this.snapTypes.edge) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const meshes: THREE.Mesh[] = [];
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.elementId) {
          meshes.push(child);
        }
      });
      
      const intersects = this.raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        nearestPoint = intersects[0].point.clone();
      }
    }
    
    return nearestPoint;
  }
  
  /**
   * Convertit une position 3D en coordonnées écran
   */
  private worldToScreen(position: THREE.Vector3): THREE.Vector2 {
    const vector = position.clone();
    vector.project(this.camera);
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;
    
    return new THREE.Vector2(x, y);
  }
  
  /**
   * Met à jour la ligne temporaire pendant la mesure
   */
  private updateTemporaryLine(start: THREE.Vector3, end: THREE.Vector3) {
    // Supprimer l'ancienne ligne temporaire
    const tempLine = this.measurementGroup.getObjectByName('tempLine');
    if (tempLine) {
      this.measurementGroup.remove(tempLine);
    }
    
    // Créer une nouvelle ligne
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({ 
      color: 0xffff00,
      linewidth: 2,
      dashSize: 10,
      gapSize: 5,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.name = 'tempLine';
    line.renderOrder = 997;
    line.computeLineDistances();
    
    this.measurementGroup.add(line);
  }
  
  /**
   * Gère le clic pour ajouter un point de mesure
   */
  handleClick(event: MouseEvent): boolean {
    if (!this.isActive) return false;
    
    // Utiliser le point de snap actuel s'il existe
    if (this.currentSnapPoint) {
      this.addMeasurementPoint(this.currentSnapPoint.clone());
      
      // Si on a 2 points, créer la mesure
      if (this.measurementPoints.length === 2) {
        this.createMeasurement();
        this.measurementPoints = [];
        
        // Supprimer la ligne temporaire
        const tempLine = this.measurementGroup.getObjectByName('tempLine');
        if (tempLine) {
          this.measurementGroup.remove(tempLine);
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Ajoute un point de mesure
   */
  private addMeasurementPoint(point: THREE.Vector3) {
    this.measurementPoints.push(point);
    
    // Créer un marqueur visuel pour le point
    const markerGeometry = new THREE.SphereGeometry(6, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      depthTest: false,
      depthWrite: false
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(point);
    marker.renderOrder = 999;
    
    // Ajouter un contour
    const outlineGeometry = new THREE.SphereGeometry(8, 16, 16);
    const outlineMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthTest: false,
      depthWrite: false
    });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    marker.add(outline);
    
    this.pointMarkers.push(marker);
    this.measurementGroup.add(marker);
  }
  
  /**
   * Crée une mesure complète avec label
   */
  private createMeasurement() {
    if (this.measurementPoints.length !== 2) return;
    
    const p1 = this.measurementPoints[0];
    const p2 = this.measurementPoints[1];
    const distance = p1.distanceTo(p2);
    
    // Créer la ligne finale
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00,
      linewidth: 3,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 998;
    
    this.measurementLines.push(line);
    this.measurementGroup.add(line);
    
    // Créer un label HTML pour afficher la distance
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    label.style.color = '#00ff00';
    label.style.padding = '6px 12px';
    label.style.borderRadius = '6px';
    label.style.fontSize = '16px';
    label.style.fontWeight = 'bold';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '1000';
    label.style.border = '2px solid #00ff00';
    label.style.fontFamily = 'monospace';
    label.textContent = `${distance.toFixed(1)} mm`;
    
    document.body.appendChild(label);
    this.measurementLabels.push(label);
    
    // Mettre à jour la position du label
    this.updateLabelPosition(label, p1, p2);
    
    // Animation d'apparition
    label.style.opacity = '0';
    label.style.transform = 'translate(-50%, -50%) scale(0.8)';
    setTimeout(() => {
      label.style.transition = 'all 0.3s ease';
      label.style.opacity = '1';
      label.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
    
    console.log(`📏 Mesure: ${distance.toFixed(1)} mm`);
  }
  
  /**
   * Met à jour la position d'un label de mesure
   */
  private updateLabelPosition(label: HTMLDivElement, p1: THREE.Vector3, p2: THREE.Vector3) {
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    
    // Projeter le point 3D en coordonnées écran
    const vector = midPoint.clone();
    vector.project(this.camera);
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;
    
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.transform = 'translate(-50%, -50%)';
  }
  
  /**
   * Efface la mesure en cours
   */
  private clearCurrentMeasurement() {
    this.measurementPoints = [];
    
    // Nettoyer les marqueurs temporaires
    this.pointMarkers.forEach(marker => {
      this.measurementGroup.remove(marker);
    });
    this.pointMarkers = [];
    
    // Supprimer la ligne temporaire
    const tempLine = this.measurementGroup.getObjectByName('tempLine');
    if (tempLine) {
      this.measurementGroup.remove(tempLine);
    }
  }
  
  /**
   * Efface toutes les mesures
   */
  clearAllMeasurements() {
    // Nettoyer les objets 3D
    this.measurementGroup.clear();
    
    // Nettoyer les labels HTML
    this.measurementLabels.forEach(label => {
      if (label.parentNode) {
        label.parentNode.removeChild(label);
      }
    });
    this.measurementLabels = [];
    
    // Réinitialiser les tableaux
    this.measurementLines = [];
    this.pointMarkers = [];
    this.measurementPoints = [];
  }
  
  /**
   * Démarre la boucle de mise à jour des labels
   */
  private startLabelUpdateLoop() {
    const updateLoop = () => {
      this.updateLabels();
      this.animationId = requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }

  /**
   * Met à jour les positions des labels (appelé lors du rendu)
   */
  updateLabels() {
    // Mettre à jour les positions des labels lors du mouvement de la caméra
    for (let i = 0; i < this.measurementLines.length; i++) {
      const line = this.measurementLines[i];
      const label = this.measurementLabels[i];
      
      if (line && label) {
        const positions = (line.geometry as THREE.BufferGeometry).attributes.position;
        const p1 = new THREE.Vector3(
          positions.getX(0),
          positions.getY(0),
          positions.getZ(0)
        );
        const p2 = new THREE.Vector3(
          positions.getX(1),
          positions.getY(1),
          positions.getZ(1)
        );
        
        this.updateLabelPosition(label, p1, p2);
      }
    }
  }
  
  /**
   * Nettoie l'outil
   */
  dispose() {
    // Arrêter la boucle d'animation
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.clearAllMeasurements();
    this.clearSnapHelpers();
    
    if (this.measurementGroup.parent) {
      this.measurementGroup.parent.remove(this.measurementGroup);
    }
    
    if (this.snapGroup.parent) {
      this.snapGroup.parent.remove(this.snapGroup);
    }
  }
}