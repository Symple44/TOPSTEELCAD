/**
 * VisualFeatureRenderer - Rendu des features visuelles (trous, soudures, etc.)
 */
import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';

export class VisualFeatureRenderer {
  private featureGroups: Map<string, THREE.Group> = new Map();
  
  /**
   * Crée les features visuelles pour un élément
   */
  createVisualFeatures(element: PivotElement): THREE.Group {
    const group = new THREE.Group();
    group.name = `Features_${element.id}`;
    
    // Créer des représentations visuelles pour les trous
    if (element.metadata?.features) {
      const holes = element.metadata.features.filter((f: any) => f.type === 'hole');
      holes.forEach((hole: any) => {
        const holeVisual = this.createHoleVisual(hole, element);
        if (holeVisual) {
          group.add(holeVisual);
        }
      });
    }
    
    // Stocker la référence
    this.featureGroups.set(element.id, group);
    
    return group;
  }
  
  /**
   * Crée une représentation visuelle d'un trou
   */
  private createHoleVisual(hole: any, element: PivotElement): THREE.Object3D | null {
    const diameter = hole.diameter || 10;
    const depth = hole.depth || 100;
    const position = hole.position || [0, 0, 0];
    
    // Matériau noir pour simuler un trou
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0.95,  // Plus opaque pour être plus visible
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true
    });
    
    // Créer la géométrie selon le type de trou
    if (hole.holeType === 'slotted' && hole.slottedLength) {
      // Créer un trou oblong avec deux cylindres et un box
      const group = new THREE.Group();
      group.name = `SlottedHole_${hole.id || Math.random()}`;
      const radius = diameter / 2;
      const elongation = hole.slottedLength;
      
      // Pour trous oblongs dans les ailes, les cylindres doivent être orientés selon l'épaisseur de l'aile
      const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, depth * 1.2, 16);
      
      // Cylindre gauche
      const mesh1 = new THREE.Mesh(cylinderGeometry.clone(), material.clone());
      mesh1.position.x = -elongation / 2;
      group.add(mesh1);
      
      // Cylindre droit
      const mesh2 = new THREE.Mesh(cylinderGeometry.clone(), material.clone());
      mesh2.position.x = elongation / 2;
      group.add(mesh2);
      
      // Box centrale
      const box = new THREE.BoxGeometry(elongation, depth * 1.2, diameter);
      const meshBox = new THREE.Mesh(box, material.clone());
      group.add(meshBox);
      
      // Positionner et orienter le groupe selon la face
      this.positionAndOrientHole(group, hole, element, position);
      
      return group;
    }
    
    // Trou rond classique
    const geometry = new THREE.CylinderGeometry(
      diameter / 2,
      diameter / 2,
      depth * 1.2, // Un peu plus long pour être bien visible
      16
    );
    
    const holeMesh = new THREE.Mesh(geometry, material);
    holeMesh.name = `Hole_${hole.id || Math.random()}`;
    
    // Positionner et orienter le trou selon la face
    this.positionAndOrientHole(holeMesh, hole, element, position);
    
    return holeMesh;
  }
  
  /**
   * Positionne et oriente un objet de trou sur la face appropriée
   * Aligné sur l'orientation corrigée de la poutre IPE (X=length, Y=height, Z=flangeWidth)
   */
  private positionAndOrientHole(
    object: THREE.Object3D,
    hole: any,
    element: PivotElement,
    position: number[]
  ): void {
    const dims = element.dimensions;
    const length = dims.length || 1000;
    const height = dims.height || 100;
    const width = dims.width || 100;
    const flangeThickness = element.metadata?.flangeThickness || 15;
    
    // Position basée sur la face - utiliser le même système que PositionCalculator
    if (hole.face === 'bottom' || hole.face === 'u') {
      // Trou dans l'aile inférieure
      // DSTV : position[0] = X le long de la poutre, position[1] = Y latéral sur l'aile
      // Géométrie corrigée : X=length, Y=height, Z=flangeWidth
      const xPos = position[0] - length / 2;           // Position le long de la poutre (centrée)
      const yPos = -(height / 2) + (flangeThickness / 2); // Centre de l'aile inférieure
      const zPos = position[1] - width / 2;            // Position latérale (centrée)
      
      object.position.set(xPos, yPos, zPos);
      // Les cylindres Three.js ont leur hauteur selon Y par défaut
      // Pour les ailes horizontales, on veut que le cylindre traverse verticalement (selon Y)
      // Donc pas de rotation nécessaire - le cylindre est déjà dans la bonne orientation
      object.rotation.set(0, 0, 0);
      console.log(`🕳️ Bottom flange visual hole: DSTV(${position[0]}, ${position[1]}) -> Three.js(${xPos}, ${yPos}, ${zPos}), no rotation (vertical cylinder)`);
      
    } else if (hole.face === 'top' || hole.face === 'v') {
      // Trou dans l'aile supérieure
      const xPos = position[0] - length / 2;           
      const yPos = (height / 2) - (flangeThickness / 2);
      const zPos = position[1] - width / 2;
      
      object.position.set(xPos, yPos, zPos);
      // Même orientation que pour l'aile inférieure - cylindre vertical
      object.rotation.set(0, 0, 0);
      console.log(`🕳️ Top flange visual hole: DSTV(${position[0]}, ${position[1]}) -> Three.js(${xPos}, ${yPos}, ${zPos}), no rotation (vertical cylinder)`);
      
    } else if (hole.face === 'web' || hole.face === 'o') {
      // Trou dans l'âme
      const xPos = position[0] - length / 2;  // Position le long de la poutre
      const yPos = position[1];               // Hauteur sur l'âme
      const zPos = 0;                         // Centré sur l'âme
      
      object.position.set(xPos, yPos, zPos);
      // Pour l'âme verticale, rotation pour que le cylindre traverse horizontalement l'épaisseur (selon Z)
      object.rotation.x = Math.PI / 2; // Rotation pour orienter le cylindre horizontalement
      console.log(`🕳️ Web visual hole: DSTV(${position[0]}, ${position[1]}) -> Three.js(${xPos}, ${yPos}, ${zPos}), rot.x=90° (horizontal cylinder)`);
    }
  }
  
  /**
   * Met à jour les features d'un élément
   */
  updateFeatures(elementId: string, features: any[]): void {
    const group = this.featureGroups.get(elementId);
    if (!group) return;
    
    // Nettoyer les anciennes features
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    
    // Ajouter les nouvelles features si nécessaire
    // (Sera implémenté avec le système de features complet)
  }
  
  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    this.featureGroups.forEach(group => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      }
    });
    this.featureGroups.clear();
  }
}