import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { CSS2DObject } from 'three-stdlib';

/**
 * Types de mesures disponibles
 */
export enum MeasurementType {
  DISTANCE = 'distance',
  ANGLE = 'angle',
  AREA = 'area',
  RADIUS = 'radius',
  ARC = 'arc',
  PERPENDICULAR = 'perpendicular',
  PARALLEL = 'parallel'
}

/**
 * Données d'une mesure
 */
export interface Measurement {
  id: string;
  type: MeasurementType;
  points: THREE.Vector3[];
  value: number;
  unit: string;
  label: string;
  visible: boolean;
  color: string;
  lineObject?: THREE.Line;
  labelObject?: CSS2DObject;
}

/**
 * Configuration de l'outil de mesure
 */
export interface MeasurementConfig {
  defaultColor: string;
  highlightColor: string;
  textColor: string;
  fontSize: number;
  lineWidth: number;
  showLabels: boolean;
  snapToGrid: boolean;
  snapDistance: number;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  precision: number;
}

/**
 * MeasurementTool - Outil de mesure pour le viewer 3D
 * 
 * Responsabilités:
 * - Mesures de distance, angle, surface
 * - Affichage des annotations
 * - Gestion des unités
 * - Snap to grid/vertex
 */
export class MeasurementTool {
  private eventBus: EventBus;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private measurements: Map<string, Measurement>;
  private activeMeasurement: Measurement | null = null;
  private isActive: boolean = false;
  private currentType: MeasurementType = MeasurementType.DISTANCE;
  
  // Configuration
  private config: MeasurementConfig = {
    defaultColor: '#00ff00',
    highlightColor: '#ffff00',
    textColor: '#ffffff',
    fontSize: 14,
    lineWidth: 2,
    showLabels: true,
    snapToGrid: false,
    snapDistance: 10,
    units: 'mm',
    precision: 1
  };
  
  // Objets 3D pour l'affichage
  private measurementGroup: THREE.Group;
  private previewLine: THREE.Line | null = null;
  private snapIndicator: THREE.Mesh | null = null;
  
  // Points temporaires
  private tempPoints: THREE.Vector3[] = [];
  private hoveredPoint: THREE.Vector3 | null = null;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, config?: Partial<MeasurementConfig>) {
    this.scene = scene;
    this.camera = camera;
    this.eventBus = EventBus.getInstance();
    this.measurements = new Map();
    
    // Appliquer la configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Créer le groupe pour les mesures
    this.measurementGroup = new THREE.Group();
    this.measurementGroup.name = 'Measurements';
    this.scene.add(this.measurementGroup);
    
    this.setupEventListeners();
    this.createSnapIndicator();
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Activation/désactivation
    this.eventBus.on('measure:toggle', (data: { enabled: boolean }) => {
      this.setActive(data.enabled);
    });
    
    // Changement de type
    this.eventBus.on('measure:type', (type: MeasurementType) => {
      this.setMeasurementType(type);
    });
    
    // Interactions souris
    this.eventBus.on('pointer:down', (data: any) => {
      if (this.isActive && data.button === 0) {
        this.handleClick(data.pointer);
      }
    });
    
    this.eventBus.on('pointer:move', (data: any) => {
      if (this.isActive) {
        this.handleMouseMove(data.pointer);
      }
    });
    
    // Annulation
    this.eventBus.on('key:down', (data: any) => {
      if (this.isActive && data.key === 'Escape') {
        this.cancelCurrentMeasurement();
      }
    });
    
    // Suppression
    this.eventBus.on('measure:delete', (id: string) => {
      this.deleteMeasurement(id);
    });
    
    // Clear all
    this.eventBus.on('measure:clear', () => {
      this.clearAllMeasurements();
    });
  }
  
  /**
   * Crée l'indicateur de snap
   */
  private createSnapIndicator(): void {
    const geometry = new THREE.SphereGeometry(5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8
    });
    
    this.snapIndicator = new THREE.Mesh(geometry, material);
    this.snapIndicator.visible = false;
    this.scene.add(this.snapIndicator);
  }
  
  /**
   * Active/désactive l'outil
   */
  setActive(active: boolean): void {
    this.isActive = active;
    
    if (!active) {
      this.cancelCurrentMeasurement();
    }
    
    this.eventBus.emit('measure:activeChanged', { active });
  }
  
  /**
   * Définit le type de mesure
   */
  setMeasurementType(type: MeasurementType): void {
    this.currentType = type;
    this.cancelCurrentMeasurement();
    this.eventBus.emit('measure:typeChanged', { type });
  }
  
  /**
   * Gère le clic souris
   */
  private handleClick(pointer: THREE.Vector2): void {
    const point = this.getWorldPoint(pointer);
    if (!point) return;
    
    // Snap si activé
    const snappedPoint = this.config.snapToGrid ? 
      this.snapToNearestPoint(point) : point;
    
    this.tempPoints.push(snappedPoint);
    
    // Vérifier si la mesure est complète
    if (this.isMeasurementComplete()) {
      this.completeMeasurement();
    } else {
      this.updatePreview();
    }
  }
  
  /**
   * Gère le mouvement de la souris
   */
  private handleMouseMove(pointer: THREE.Vector2): void {
    const point = this.getWorldPoint(pointer);
    if (!point) return;
    
    // Snap si activé
    const snappedPoint = this.config.snapToGrid ? 
      this.snapToNearestPoint(point) : point;
    
    this.hoveredPoint = snappedPoint;
    
    // Mettre à jour l'indicateur de snap
    if (this.snapIndicator && this.config.snapToGrid) {
      this.snapIndicator.position.copy(snappedPoint);
      this.snapIndicator.visible = true;
    }
    
    // Mettre à jour la preview
    if (this.tempPoints.length > 0) {
      this.updatePreview();
    }
  }
  
  /**
   * Obtient le point 3D depuis la position de la souris
   */
  private getWorldPoint(pointer: THREE.Vector2): THREE.Vector3 | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    
    // Chercher l'intersection avec les objets
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      // Filtrer les objets de mesure
      const validIntersect = intersects.find(i => 
        !i.object.userData.isMeasurement &&
        i.object.name !== 'Measurements'
      );
      
      if (validIntersect) {
        return validIntersect.point;
      }
    }
    
    // Si pas d'intersection, projeter sur un plan
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, point);
    
    return point;
  }
  
  /**
   * Snap au point le plus proche
   */
  private snapToNearestPoint(point: THREE.Vector3): THREE.Vector3 {
    // Snap to grid
    if (this.config.snapToGrid) {
      const grid = this.config.snapDistance;
      return new THREE.Vector3(
        Math.round(point.x / grid) * grid,
        Math.round(point.y / grid) * grid,
        Math.round(point.z / grid) * grid
      );
    }
    
    return point;
  }
  
  /**
   * Vérifie si la mesure est complète
   */
  private isMeasurementComplete(): boolean {
    switch (this.currentType) {
      case MeasurementType.DISTANCE:
        return this.tempPoints.length === 2;
      case MeasurementType.ANGLE:
        return this.tempPoints.length === 3;
      case MeasurementType.AREA:
        return this.tempPoints.length >= 3 && this.isPolygonClosed();
      case MeasurementType.RADIUS:
        return this.tempPoints.length === 2;
      default:
        return false;
    }
  }
  
  /**
   * Vérifie si le polygone est fermé
   */
  private isPolygonClosed(): boolean {
    if (this.tempPoints.length < 3) return false;
    
    const first = this.tempPoints[0];
    const last = this.hoveredPoint || this.tempPoints[this.tempPoints.length - 1];
    
    return first.distanceTo(last) < this.config.snapDistance;
  }
  
  /**
   * Met à jour la preview
   */
  private updatePreview(): void {
    // Supprimer l'ancienne preview
    if (this.previewLine) {
      this.measurementGroup.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
    }
    
    // Créer la nouvelle preview
    const points = [...this.tempPoints];
    if (this.hoveredPoint) {
      points.push(this.hoveredPoint);
    }
    
    if (points.length >= 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: this.config.highlightColor,
        linewidth: this.config.lineWidth,
        opacity: 0.6,
        transparent: true
      });
      
      this.previewLine = new THREE.Line(geometry, material);
      this.previewLine.userData.isMeasurement = true;
      this.measurementGroup.add(this.previewLine);
    }
  }
  
  /**
   * Complète la mesure
   */
  private completeMeasurement(): void {
    const value = this.calculateValue();
    const label = this.formatValue(value);
    
    const measurement: Measurement = {
      id: `measure-${Date.now()}`,
      type: this.currentType,
      points: [...this.tempPoints],
      value,
      unit: this.config.units,
      label,
      visible: true,
      color: this.config.defaultColor
    };
    
    // Créer les objets 3D
    this.createMeasurementObjects(measurement);
    
    // Ajouter à la liste
    this.measurements.set(measurement.id, measurement);
    
    // Émettre l'événement
    this.eventBus.emit('measure:created', measurement);
    
    // Réinitialiser
    this.tempPoints = [];
    this.updatePreview();
  }
  
  /**
   * Calcule la valeur de la mesure
   */
  private calculateValue(): number {
    switch (this.currentType) {
      case MeasurementType.DISTANCE:
        return this.calculateDistance();
      case MeasurementType.ANGLE:
        return this.calculateAngle();
      case MeasurementType.AREA:
        return this.calculateArea();
      case MeasurementType.RADIUS:
        return this.calculateRadius();
      default:
        return 0;
    }
  }
  
  /**
   * Calcule la distance
   */
  private calculateDistance(): number {
    if (this.tempPoints.length < 2) return 0;
    return this.tempPoints[0].distanceTo(this.tempPoints[1]);
  }
  
  /**
   * Calcule l'angle
   */
  private calculateAngle(): number {
    if (this.tempPoints.length < 3) return 0;
    
    const [p1, p2, p3] = this.tempPoints;
    const v1 = new THREE.Vector3().subVectors(p1, p2).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, p2).normalize();
    
    const angle = Math.acos(v1.dot(v2));
    return angle * (180 / Math.PI); // Convertir en degrés
  }
  
  /**
   * Calcule l'aire
   */
  private calculateArea(): number {
    if (this.tempPoints.length < 3) return 0;
    
    // Algorithme de Shoelace pour l'aire d'un polygone
    let area = 0;
    const n = this.tempPoints.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += this.tempPoints[i].x * this.tempPoints[j].z;
      area -= this.tempPoints[j].x * this.tempPoints[i].z;
    }
    
    return Math.abs(area / 2);
  }
  
  /**
   * Calcule le rayon
   */
  private calculateRadius(): number {
    if (this.tempPoints.length < 2) return 0;
    return this.tempPoints[0].distanceTo(this.tempPoints[1]);
  }
  
  /**
   * Formate la valeur pour l'affichage
   */
  private formatValue(value: number): string {
    const converted = this.convertUnits(value);
    const formatted = converted.toFixed(this.config.precision);
    
    switch (this.currentType) {
      case MeasurementType.DISTANCE:
      case MeasurementType.RADIUS:
        return `${formatted} ${this.config.units}`;
      case MeasurementType.ANGLE:
        return `${formatted}°`;
      case MeasurementType.AREA:
        return `${formatted} ${this.config.units}²`;
      default:
        return formatted;
    }
  }
  
  /**
   * Convertit les unités
   */
  private convertUnits(value: number): number {
    // Les valeurs sont en mm par défaut
    switch (this.config.units) {
      case 'mm':
        return value;
      case 'cm':
        return value / 10;
      case 'm':
        return value / 1000;
      case 'in':
        return value / 25.4;
      case 'ft':
        return value / 304.8;
      default:
        return value;
    }
  }
  
  /**
   * Crée les objets 3D pour une mesure
   */
  private createMeasurementObjects(measurement: Measurement): void {
    // Créer la ligne
    const geometry = new THREE.BufferGeometry().setFromPoints(measurement.points);
    const material = new THREE.LineBasicMaterial({
      color: measurement.color,
      linewidth: this.config.lineWidth
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData.isMeasurement = true;
    line.userData.measurementId = measurement.id;
    
    measurement.lineObject = line;
    this.measurementGroup.add(line);
    
    // Créer le label
    if (this.config.showLabels) {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'measurement-label';
      labelDiv.textContent = measurement.label;
      labelDiv.style.color = this.config.textColor;
      labelDiv.style.fontSize = `${this.config.fontSize}px`;
      labelDiv.style.background = 'rgba(0, 0, 0, 0.7)';
      labelDiv.style.padding = '2px 6px';
      labelDiv.style.borderRadius = '3px';
      labelDiv.style.pointerEvents = 'none';
      
      const labelObject = new CSS2DObject(labelDiv);
      
      // Positionner au centre
      const center = this.getMeasurementCenter(measurement);
      labelObject.position.copy(center);
      
      measurement.labelObject = labelObject;
      this.measurementGroup.add(labelObject);
    }
  }
  
  /**
   * Obtient le centre d'une mesure
   */
  private getMeasurementCenter(measurement: Measurement): THREE.Vector3 {
    const center = new THREE.Vector3();
    
    measurement.points.forEach(point => {
      center.add(point);
    });
    
    center.divideScalar(measurement.points.length);
    return center;
  }
  
  /**
   * Annule la mesure en cours
   */
  cancelCurrentMeasurement(): void {
    this.tempPoints = [];
    this.hoveredPoint = null;
    
    if (this.previewLine) {
      this.measurementGroup.remove(this.previewLine);
      this.previewLine = null;
    }
    
    if (this.snapIndicator) {
      this.snapIndicator.visible = false;
    }
  }
  
  /**
   * Supprime une mesure
   */
  deleteMeasurement(id: string): void {
    const measurement = this.measurements.get(id);
    
    if (measurement) {
      // Supprimer les objets 3D
      if (measurement.lineObject) {
        this.measurementGroup.remove(measurement.lineObject);
        measurement.lineObject.geometry.dispose();
        (measurement.lineObject.material as THREE.Material).dispose();
      }
      
      if (measurement.labelObject) {
        this.measurementGroup.remove(measurement.labelObject);
      }
      
      // Supprimer de la liste
      this.measurements.delete(id);
      
      // Émettre l'événement
      this.eventBus.emit('measure:deleted', { id });
    }
  }
  
  /**
   * Efface toutes les mesures
   */
  clearAllMeasurements(): void {
    this.measurements.forEach((_, id) => {
      this.deleteMeasurement(id);
    });
  }
  
  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<MeasurementConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Mettre à jour les mesures existantes si nécessaire
    this.measurements.forEach(measurement => {
      if (measurement.labelObject) {
        const div = measurement.labelObject.element as HTMLDivElement;
        div.style.fontSize = `${this.config.fontSize}px`;
        div.style.color = this.config.textColor;
      }
    });
  }
  
  /**
   * Obtient toutes les mesures
   */
  getMeasurements(): Measurement[] {
    return Array.from(this.measurements.values());
  }
  
  /**
   * Cache/affiche une mesure
   */
  toggleMeasurementVisibility(id: string): void {
    const measurement = this.measurements.get(id);
    
    if (measurement) {
      measurement.visible = !measurement.visible;
      
      if (measurement.lineObject) {
        measurement.lineObject.visible = measurement.visible;
      }
      
      if (measurement.labelObject) {
        measurement.labelObject.visible = measurement.visible;
      }
      
      this.eventBus.emit('measure:visibilityChanged', {
        id,
        visible: measurement.visible
      });
    }
  }
  
  /**
   * Export les mesures
   */
  exportMeasurements(): string {
    const data = this.getMeasurements().map(m => ({
      type: m.type,
      value: m.value,
      unit: m.unit,
      label: m.label,
      points: m.points.map(p => ({
        x: p.x,
        y: p.y,
        z: p.z
      }))
    }));
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.clearAllMeasurements();
    
    if (this.snapIndicator) {
      this.scene.remove(this.snapIndicator);
      this.snapIndicator.geometry.dispose();
      (this.snapIndicator.material as THREE.Material).dispose();
    }
    
    this.scene.remove(this.measurementGroup);
    
    this.eventBus.emit('measure:disposed');
  }
}