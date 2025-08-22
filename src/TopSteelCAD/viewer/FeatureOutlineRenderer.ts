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
    
    
    // Créer des contours pour chaque trou
    holes.forEach((hole: any, index: number) => {
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
   * @param yOffset - Le décalage Y appliqué au mesh pour le positionner au-dessus du quadrillage
   */
  private createHoleOutline(hole: any, index: number, yOffset: number = 0): THREE.Object3D | null {
    const diameter = hole.diameter || 10;
    // Utiliser la position originale DSTV si disponible, sinon la position transformée
    const originalPos = hole.originalPosition || hole.position || [0, 0, 0];
    const position = hole.position || [0, 0, 0];
    const rotation = hole.rotation || [0, 0, 0]; // Récupérer la rotation du trou
    const depth = hole.depth || hole.thickness || 10; // Profondeur du trou (utiliser thickness si depth n'existe pas)
    const face = hole.face || 'web';
    
    console.log(`🔵 Creating hole outline ${index}:`, {
      position,
      originalPosition: originalPos,
      rotation,
      diameter,
      depth,
      face,
      yOffset
    });
    
    // Créer un groupe pour le contour
    const outlineGroup = new THREE.Group();
    outlineGroup.name = `HoleOutline_${index}`;
    
    // Créer un contour en ligne (LineLoop) au lieu d'un anneau plein
    const radius = diameter / 2 + 2; // Légèrement plus grand que le trou
    const segments = 32;
    
    // Créer DEUX cercles : un à l'entrée et un à la sortie du trou
    const colors = [0x00ff00, 0xff0000]; // Vert pour l'entrée, rouge pour la sortie
    
    // Pour les cornières avec trous sur l'aile verticale (rotation [0, 0, -π/2])
    // Les trous percent selon X (à travers l'épaisseur de l'aile)
    let positions: THREE.Vector3[];
    
    if (Math.abs(rotation[2] + Math.PI/2) < 0.01) {
      // Trou orienté selon X (aile verticale de la cornière)
      // IMPORTANT: Appliquer le yOffset pour aligner avec le mesh repositionné
      const halfThickness = depth / 2;
      
      positions = [
        new THREE.Vector3(
          position[0] - halfThickness, // X: décalé pour l'entrée
          position[1] + yOffset, // Y: position du trou + offset du mesh
          position[2]  // Z: EXACTEMENT la même que le trou
        ), // Entrée
        new THREE.Vector3(
          position[0] + halfThickness, // X: décalé pour la sortie
          position[1] + yOffset, // Y: position du trou + offset du mesh
          position[2]  // Z: EXACTEMENT la même que le trou
        ) // Sortie
      ];
    } else if (Math.abs(rotation[0] - Math.PI/2) < 0.01) {
      // Trou orienté selon Z (âme de profil en I)
      positions = [
        new THREE.Vector3(position[0], position[1] + yOffset, position[2]), // Entrée
        new THREE.Vector3(
          position[0],
          position[1] + yOffset, 
          position[2] + depth
        ) // Sortie
      ];
    } else {
      // Trou vertical par défaut (selon Y)
      positions = [
        new THREE.Vector3(position[0], position[1] + yOffset, position[2]), // Entrée
        new THREE.Vector3(
          position[0],
          position[1] + depth + yOffset, 
          position[2]
        ) // Sortie
      ];
    }
    
    positions.forEach((pos, idx) => {
      const points = [];
      
      // Créer les points du cercle dans le plan XZ (perpendiculaire à Y par défaut)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,    // X
          0,                           // Y 
          Math.sin(angle) * radius     // Z
        ));
      }
      
      // Créer la géométrie de ligne
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Matériau de ligne lumineux
      const lineMaterial = new THREE.LineBasicMaterial({
        color: colors[idx],  // Vert ou rouge selon entrée/sortie
        linewidth: 3,        // Épaisseur de ligne
        transparent: true,
        opacity: 0.8
      });
      
      // Créer le contour en ligne
      const ringMesh = new THREE.LineLoop(lineGeometry, lineMaterial);
      
      // Positionner l'anneau à l'extrémité correspondante
      ringMesh.position.copy(pos);
      
      // Appliquer la rotation du trou à l'outline
      if (rotation && (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0)) {
        ringMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
      
      console.log(`  -> Ring ${idx + 1} at: [${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}]`);
      
      outlineGroup.add(ringMesh);
    });
    
    // Ajouter une ligne reliant les deux cercles pour visualiser l'axe du trou
    const axisPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, depth, 0)
    ];
    const axisGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,  // Jaune pour l'axe
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    });
    const axisLine = new THREE.Line(axisGeometry, axisMaterial);
    axisLine.position.set(position[0], position[1] + yOffset, position[2]);
    if (rotation && (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0)) {
      axisLine.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
    outlineGroup.add(axisLine);
    
    // Pour les trous oblongs, créer une forme oblongue au lieu d'un cercle
    if (hole.type === 'slotted' && hole.slottedLength) {
      const slottedOutline = this.createSlottedHoleOutline(hole);
      if (slottedOutline) {
        // Remplacer les anneaux circulaires par la forme oblongue
        // Note: Les anneaux ont déjà été ajoutés dans outlineGroup
        // On nettoie tout et on ajoute la forme oblongue
        outlineGroup.clear();
        // Appliquer le décalage Y à la forme oblongue
        slottedOutline.position.y += yOffset;
        outlineGroup.add(slottedOutline);
        outlineGroup.add(axisLine); // Ré-ajouter l'axe
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
    // Removed unused rotation variable - using hole.slottedAngle instead
    
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
    
    group.add(mesh);
    
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