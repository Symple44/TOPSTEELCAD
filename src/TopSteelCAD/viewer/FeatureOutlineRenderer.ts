/**
 * FeatureOutlineRenderer - Rendu des contours visuels pour les features
 * Crée des anneaux et indicateurs visuels autour des trous et autres features
 */
import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';

export class FeatureOutlineRenderer {
  private outlineGroups: Map<string, THREE.Group> = new Map();
  
  /**
   * Crée les contours visuels pour les features d'un élément
   */
  createFeatureOutlines(element: PivotElement, mesh: THREE.Mesh): THREE.Group {
    const group = new THREE.Group();
    group.name = `FeatureOutlines_${element.id}`;
    
    // Récupérer les informations sur les trous depuis la géométrie
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const holes = geometry.userData.holes || [];
    const yOffset = geometry.userData.yOffset || 0; // Récupérer le décalage Y
    
    console.log(`🔍 Creating outlines for ${holes.length} holes in ${element.name} (yOffset=${yOffset})`);
    
    // Créer des contours pour chaque trou
    holes.forEach((hole: any, index: number) => {
      console.log(`  - Hole ${index}: Ø${hole.diameter}mm at [${hole.position}], type=${hole.type}, face=${hole.face}`);
      const outline = this.createHoleOutline(hole, index, yOffset);
      if (outline) {
        group.add(outline);
      }
    });
    
    // Stocker la référence
    this.outlineGroups.set(element.id, group);
    
    return group;
  }
  
  /**
   * Crée un contour visuel pour un trou
   */
  private createHoleOutline(hole: any, index: number, yOffset: number = 0): THREE.Object3D | null {
    const diameter = hole.diameter || 10;
    const position = hole.position || [0, 0, 0];
    const rotation = hole.rotation || [0, 0, 0];
    
    // Créer un groupe pour le contour
    const outlineGroup = new THREE.Group();
    outlineGroup.name = `HoleOutline_${index}`;
    
    // Créer un contour en ligne (LineLoop) au lieu d'un anneau plein
    const radius = diameter / 2 + 2; // Légèrement plus grand que le trou
    const segments = 32;
    const points = [];
    
    // Créer les points du cercle dans le bon plan selon la face
    if (hole.face === 'top' || hole.face === 'bottom' || 
        hole.face === 'bottom_flange' || hole.face === 'top_flange') {
      // Surface horizontale - créer le cercle dans le plan XZ (horizontal)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,  // X
          0,                          // Y (hauteur constante)
          Math.sin(angle) * radius    // Z
        ));
      }
    } else {
      // Surface verticale (âme) - créer le cercle dans le plan XY (vertical)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,  // X
          Math.sin(angle) * radius,  // Y
          0                           // Z (profondeur constante)
        ));
      }
    }
    
    // Créer la géométrie de ligne
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Matériau de ligne lumineux
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,  // Vert fluo
      linewidth: 3,     // Épaisseur de ligne (note: peut ne pas fonctionner sur tous les renderers)
      transparent: true,
      opacity: 1.0
    });
    
    // Créer le contour en ligne
    const ringMesh = new THREE.LineLoop(lineGeometry, lineMaterial);
    
    // Positionner l'anneau
    // Pour les plaques, ajuster la position Y pour être sur la surface
    let adjustedY = position[1] + yOffset; // Appliquer le décalage Y
    if (hole.face === 'top') {
      // Sur la face supérieure de la plaque
      adjustedY = (hole.thickness || 10) / 2 + yOffset; // Moitié de l'épaisseur + décalage
    } else if (hole.face === 'bottom') {
      // Sur la face inférieure de la plaque
      adjustedY = -(hole.thickness || 10) / 2 + yOffset;
    }
    
    ringMesh.position.set(position[0], adjustedY, position[2]);
    
    // Pas de rotation nécessaire car les cercles sont créés directement dans le bon plan
    // - Surfaces horizontales : cercle créé dans le plan XZ
    // - Surfaces verticales : cercle créé dans le plan XY
    // Les contours sont maintenant correctement orientés dès leur création
    
    // Debug pour comprendre les rotations
    console.log(`    Ring for face ${hole.face}: rotation applied [${ringMesh.rotation.x.toFixed(3)}, ${ringMesh.rotation.y.toFixed(3)}, ${ringMesh.rotation.z.toFixed(3)}]`);
    
    outlineGroup.add(ringMesh);
    
    // Ajouter un indicateur de centre (petite sphère)
    const centerGeometry = new THREE.SphereGeometry(1, 8, 8);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00  // Jaune
    });
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMesh.position.set(position[0], position[1] + yOffset, position[2]);
    
    outlineGroup.add(centerMesh);
    
    // Pour les trous oblongs, créer une forme oblongue au lieu d'un cercle
    if (hole.type === 'slotted' && hole.slottedLength) {
      const slottedOutline = this.createSlottedHoleOutline(hole);
      if (slottedOutline) {
        // Remplacer l'anneau circulaire par la forme oblongue
        outlineGroup.remove(ringMesh);
        lineGeometry.dispose();
        // Appliquer le décalage Y à la forme oblongue
        slottedOutline.position.y += yOffset;
        outlineGroup.add(slottedOutline);
      }
    }
    
    return outlineGroup;
  }
  
  /**
   * Crée un contour pour les trous oblongs
   */
  private createSlottedHoleOutline(hole: any): THREE.Group | null {
    const group = new THREE.Group();
    const diameter = hole.diameter || 10;
    const elongation = hole.slottedLength || 0;
    const position = hole.position || [0, 0, 0];
    const rotation = hole.rotation || [0, 0, 0];
    
    // Matériau magenta pour les trous oblongs
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,  // Magenta pour les trous oblongs
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    // Créer la forme oblongue avec Shape
    const shape = new THREE.Shape();
    const radius = diameter / 2 + 0.5; // Légèrement plus grand que le trou
    const halfLength = elongation / 2;
    
    // Dessiner la forme oblongue (capsule)
    shape.moveTo(-halfLength, -radius);
    shape.lineTo(halfLength, -radius);
    shape.absarc(halfLength, 0, radius, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-halfLength, radius);
    shape.absarc(-halfLength, 0, radius, Math.PI / 2, Math.PI * 3 / 2, false);
    
    // Créer le contour avec un trou au centre
    const holeShape = new THREE.Shape();
    const innerRadius = diameter / 2 - 0.5;
    const innerHalfLength = elongation / 2;
    
    holeShape.moveTo(-innerHalfLength, -innerRadius);
    holeShape.lineTo(innerHalfLength, -innerRadius);
    holeShape.absarc(innerHalfLength, 0, innerRadius, -Math.PI / 2, Math.PI / 2, false);
    holeShape.lineTo(-innerHalfLength, innerRadius);
    holeShape.absarc(-innerHalfLength, 0, innerRadius, Math.PI / 2, Math.PI * 3 / 2, false);
    
    shape.holes = [holeShape];
    
    // Créer la géométrie
    const geometry = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Positionner et orienter
    mesh.position.set(position[0], position[1], position[2]);
    
    // Orienter la forme oblongue selon la face
    if (hole.face === 'top' || hole.face === 'bottom' || 
        hole.face === 'bottom_flange' || hole.face === 'top_flange') {
      // Surface horizontale - la forme doit être dans le plan XZ
      mesh.rotation.x = -Math.PI / 2; // Rotation pour passer du plan XY au plan XZ
      // Appliquer l'angle de rotation du trou oblong si spécifié
      if (hole.slottedAngle) {
        mesh.rotation.y += THREE.MathUtils.degToRad(hole.slottedAngle);
      }
    } else if (hole.face === 'web') {
      // Surface verticale - la forme est déjà dans le bon plan (XY)
      // Appliquer seulement l'angle de rotation si spécifié
      if (hole.slottedAngle) {
        mesh.rotation.z += THREE.MathUtils.degToRad(hole.slottedAngle);
      }
    }
    
    console.log(`    Slotted hole on face ${hole.face}: rotation [${rotation[0]}, ${rotation[1]}, ${rotation[2]}], angle=${hole.slottedAngle}°`);
    
    group.add(mesh);
    
    console.log(`    Slotted hole outline: Ø${diameter}mm, elongation=${elongation}mm, angle=${hole.slottedAngle}°`);
    
    return group;
  }
  
  /**
   * Met à jour la visibilité des contours
   */
  setOutlinesVisible(elementId: string, visible: boolean): void {
    const group = this.outlineGroups.get(elementId);
    if (group) {
      group.visible = visible;
    }
  }
  
  /**
   * Change la couleur des contours pour un élément
   */
  setOutlineColor(elementId: string, color: number): void {
    const group = this.outlineGroups.get(elementId);
    if (!group) return;
    
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(color);
        material.emissive.setHex(color);
      }
    });
  }
  
  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    this.outlineGroups.forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      group.clear();
    });
    this.outlineGroups.clear();
  }
}