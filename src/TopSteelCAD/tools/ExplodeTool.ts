import * as THREE from 'three';
import { BaseTool, ToolConfig } from './BaseTool';

/**
 * ExplodeTool - Outil pour créer des vues éclatées
 * 
 * Fonctionnalités:
 * - Vue éclatée automatique basée sur la hiérarchie
 * - Contrôle de l'intensité de l'explosion
 * - Animation de l'explosion
 * - Explosion par groupe/type
 */
export class ExplodeTool extends BaseTool {
  public name = 'explode';
  public icon = '💥';
  
  private originalPositions: Map<string, THREE.Vector3> = new Map();
  private explodeFactor: number = 0;
  private isExploded: boolean = false;
  private explodeCenter: THREE.Vector3 = new THREE.Vector3();
  private animationId: number | null = null;
  
  constructor(config: ToolConfig) {
    super(config);
  }
  
  protected onActivate(): void {
    this.calculateExplodeCenter();
    this.eventBus.emit('tool:explode:ready');
  }
  
  protected onDeactivate(): void {
    if (this.isExploded) {
      this.reset();
    }
  }
  
  protected onDispose(): void {
    this.reset();
    this.originalPositions.clear();
  }
  
  /**
   * Calcule le centre de l'explosion
   */
  private calculateExplodeCenter(): void {
    const box = new THREE.Box3();
    let count = 0;
    
    this.scene.traverse((object) => {
      if (object.userData?.elementId && object instanceof THREE.Mesh) {
        box.expandByObject(object);
        count++;
      }
    });
    
    if (count > 0) {
      box.getCenter(this.explodeCenter);
    }
  }
  
  /**
   * Explose la vue avec un facteur donné
   */
  public explode(factor: number = 2.0): void {
    if (factor === 0) {
      this.reset();
      return;
    }
    
    // Sauvegarde les positions originales si ce n'est pas déjà fait
    if (!this.isExploded) {
      this.saveOriginalPositions();
    }
    
    this.explodeFactor = factor;
    this.isExploded = true;
    
    // Applique l'explosion
    this.applyExplosion(factor);
    
    this.eventBus.emit('tool:explode:applied', { 
      factor,
      center: this.explodeCenter.toArray()
    });
  }
  
  /**
   * Sauvegarde les positions originales
   */
  private saveOriginalPositions(): void {
    this.scene.traverse((object) => {
      if (object.userData?.elementId) {
        this.originalPositions.set(
          object.userData.elementId,
          object.position.clone()
        );
      }
    });
  }
  
  /**
   * Applique l'explosion
   */
  private applyExplosion(factor: number): void {
    // Groupe les éléments par type pour une explosion intelligente
    const groups = this.groupElementsByType();
    
    groups.forEach((elements, type) => {
      elements.forEach(object => {
        const originalPos = this.originalPositions.get(object.userData.elementId);
        if (!originalPos) return;
        
        // Calcule la direction d'explosion
        const direction = new THREE.Vector3()
          .subVectors(originalPos, this.explodeCenter)
          .normalize();
        
        // Applique un facteur différent selon le type
        let typeFactor = factor;
        switch (type) {
          case 'PLATE':
            typeFactor *= 1.5; // Les plaques s'éloignent plus
            break;
          case 'ANGLE':
          case 'BRACING':
            typeFactor *= 1.2; // Les contreventements un peu plus
            break;
          case 'BEAM':
          default:
            typeFactor *= 1.0; // Les poutres restent la référence
            break;
        }
        
        // Calcule la nouvelle position
        const offset = direction.multiplyScalar(typeFactor * 100); // 100mm par unité de facteur
        const newPosition = originalPos.clone().add(offset);
        
        object.position.copy(newPosition);
      });
    });
  }
  
  /**
   * Groupe les éléments par type
   */
  private groupElementsByType(): Map<string, THREE.Object3D[]> {
    const groups = new Map<string, THREE.Object3D[]>();
    
    this.scene.traverse((object) => {
      if (object.userData?.elementId && object.userData?.elementType) {
        const type = object.userData.elementType;
        if (!groups.has(type)) {
          groups.set(type, []);
        }
        groups.get(type)!.push(object);
      }
    });
    
    return groups;
  }
  
  /**
   * Anime l'explosion
   */
  public animateExplosion(targetFactor: number, duration: number = 2000): void {
    // Annule l'animation précédente si elle existe
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Sauvegarde les positions si nécessaire
    if (!this.isExploded && targetFactor > 0) {
      this.saveOriginalPositions();
      this.isExploded = true;
    }
    
    const startFactor = this.explodeFactor;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Interpolation avec easing
      const easeProgress = this.easeInOutCubic(progress);
      const currentFactor = startFactor + (targetFactor - startFactor) * easeProgress;
      
      this.explode(currentFactor);
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.animationId = null;
        this.eventBus.emit('tool:explode:animationComplete', {
          factor: targetFactor
        });
      }
    };
    
    animate();
  }
  
  /**
   * Fonction d'easing cubique
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Réinitialise les positions
   */
  public reset(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.originalPositions.forEach((position, elementId) => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === elementId) {
          object.position.copy(position);
        }
      });
    });
    
    this.explodeFactor = 0;
    this.isExploded = false;
    
    this.eventBus.emit('tool:explode:reset');
  }
  
  /**
   * Met à jour le facteur d'explosion
   */
  public updateFactor(factor: number): void {
    this.explode(factor);
  }
  
  /**
   * Explose uniquement les éléments sélectionnés
   */
  public explodeSelection(elementIds: string[], factor: number = 2.0): void {
    if (!this.isExploded) {
      this.saveOriginalPositions();
      this.isExploded = true;
    }
    
    elementIds.forEach(id => {
      this.scene.traverse((object) => {
        if (object.userData?.elementId === id) {
          const originalPos = this.originalPositions.get(id);
          if (!originalPos) return;
          
          const direction = new THREE.Vector3()
            .subVectors(originalPos, this.explodeCenter)
            .normalize();
          
          const offset = direction.multiplyScalar(factor * 100);
          const newPosition = originalPos.clone().add(offset);
          
          object.position.copy(newPosition);
        }
      });
    });
    
    this.eventBus.emit('tool:explode:selectionApplied', {
      elements: elementIds,
      factor
    });
  }
  
  /**
   * Obtient l'état actuel de l'explosion
   */
  public getExplodeState(): {
    isExploded: boolean;
    factor: number;
    center: number[];
    elementCount: number;
  } {
    return {
      isExploded: this.isExploded,
      factor: this.explodeFactor,
      center: this.explodeCenter.toArray(),
      elementCount: this.originalPositions.size
    };
  }
  
  /**
   * Définit un nouveau centre d'explosion
   */
  public setExplodeCenter(center: THREE.Vector3): void {
    this.explodeCenter.copy(center);
    
    // Réapplique l'explosion si elle est active
    if (this.isExploded) {
      this.applyExplosion(this.explodeFactor);
    }
    
    this.eventBus.emit('tool:explode:centerChanged', {
      center: center.toArray()
    });
  }
}