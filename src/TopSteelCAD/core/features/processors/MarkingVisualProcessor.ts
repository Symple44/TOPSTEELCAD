/**
 * Processeur pour créer les visuels des markings
 * Sépare la logique de rendu visuel du MarkingProcessor qui stocke les données
 */

import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';

export interface MarkingData {
  id?: string;
  text: string;
  position: number[];
  size: number;
  face?: string;
  angle?: number;
  rotation?: number[];
  type?: string;
  centerOffset?: any;
  isMirrored?: boolean;
}

export class MarkingVisualProcessor {
  /**
   * Crée un groupe 3D contenant tous les markings visuels
   */
  static createMarkingVisuals(
    markings: MarkingData[],
    element: PivotElement,
    mesh: THREE.Mesh
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'MarkingVisuals';

    markings.forEach((marking, index) => {
      const visual = this.createSingleMarkingVisual(marking, element, mesh, index);
      if (visual) {
        group.add(visual);
      }
    });

    return group;
  }

  /**
   * Crée un visuel pour un marking unique
   */
  private static createSingleMarkingVisual(
    marking: MarkingData,
    element: PivotElement,
    mesh: THREE.Mesh,
    index: number
  ): THREE.Mesh | null {
    const text = marking.text || 'X';
    const size = marking.size || 10;
    
    // Créer la géométrie du marking
    const textLength = text.length;
    const textWidth = size * textLength * 0.7;
    const textHeight = size;
    const textGeometry = new THREE.PlaneGeometry(textWidth, textHeight);
    
    // Créer la texture avec le texte
    const texture = this.createTextTexture(text, textWidth, textHeight);
    if (!texture) return null;
    
    // Créer le matériau
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false
    });
    
    // Créer le mesh
    const textMesh = new THREE.Mesh(textGeometry, material);
    textMesh.name = `Marking_${index}_${text}`;
    
    // Positionner selon les coordonnées DSTV
    this.positionMarking(textMesh, marking, element, mesh);
    
    console.log(`📝 Created marking visual: "${text}" at position [${textMesh.position.x.toFixed(1)}, ${textMesh.position.y.toFixed(1)}, ${textMesh.position.z.toFixed(1)}]`);
    
    return textMesh;
  }

  /**
   * Positionne le marking selon les coordonnées DSTV et le type d'élément
   */
  private static positionMarking(
    textMesh: THREE.Mesh,
    marking: MarkingData,
    element: PivotElement,
    mesh: THREE.Mesh
  ): void {
    // Les coordonnées DSTV du marking
    const dstvX = marking.position[0] || 0;  // Position le long du profil
    const dstvY = marking.position[1] || 0;  // Position verticale
    const dstvZ = marking.position[2] || 0;  // Position latérale (si présent)
    
    // Dimensions du profil
    const length = element.dimensions?.length || 0;
    const height = element.dimensions?.height || 0;
    const width = element.dimensions?.width || 0;
    const webThickness = element.dimensions?.webThickness || 8.6;
    
    let x = 0, y = 0, z = 0;
    
    // Pour les profils BEAM (I/H)
    if (element.materialType === 'beam') {
      // Interprétation selon la face
      if (marking.face === 'v' || marking.face === 'top_flange') {
        // Sur l'aile supérieure:
        // DSTV X = position le long du profil
        // DSTV Y = position latérale sur l'aile
        z = dstvX - length / 2;  // Position le long du profil
        x = dstvY - width / 2;   // Position latérale sur l'aile
        y = height / 2;          // Sur le dessus de l'aile supérieure
        
        console.log(`   📍 TOP FLANGE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      } 
      else if (marking.face === 'u' || marking.face === 'bottom_flange') {
        // Sur l'aile inférieure:
        // DSTV X = position le long du profil
        // DSTV Y = position latérale sur l'aile
        z = dstvX - length / 2;  // Position le long du profil
        x = dstvY - width / 2;   // Position latérale sur l'aile
        y = -height / 2;         // Sur le dessous de l'aile inférieure
        
        console.log(`   📍 BOTTOM FLANGE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else if (marking.face === 'web' || marking.face === 'o' || !marking.face) {
        // Sur l'âme (par défaut):
        // DSTV X = position le long du profil
        // DSTV Y = position verticale sur l'âme
        z = dstvX - length / 2;        // Position le long du profil
        y = dstvY - height / 2;        // Position verticale centrée
        x = webThickness / 2 + 0.5;   // Légèrement devant l'âme pour visibilité
        
        console.log(`   📍 WEB marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      
      console.log(`   📍 Face: ${marking.face || 'web'}, Dimensions: L=${length}, H=${height}, W=${width}`);
    }
    // Pour les plaques
    else if (element.materialType === 'plate' || element.materialType === 'sheet') {
      const thickness = element.dimensions?.thickness || 15;
      
      // Position sur la plaque
      x = dstvX - length / 2;
      z = dstvY - width / 2;
      y = thickness / 2 + 0.1;  // Sur la surface supérieure
      
      console.log(`   📍 PLATE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    // Pour les tubes
    else if (element.materialType === 'tube') {
      // Position le long du tube
      z = dstvX - length / 2;
      x = 0;
      y = height / 2 + 0.1;  // Sur la surface supérieure
      
      console.log(`   📍 TUBE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    
    // Appliquer la position
    textMesh.position.set(x, y, z);
    
    // Appliquer la rotation selon la face
    this.applyMarkingRotation(textMesh, marking, element);
  }

  /**
   * Applique la rotation correcte au marking selon sa face
   */
  private static applyMarkingRotation(
    textMesh: THREE.Mesh,
    marking: MarkingData,
    element: PivotElement
  ): void {
    const markingAngle = marking.angle || 0;
    
    if (element.materialType === 'beam') {
      if (marking.face === 'v' || marking.face === 'top_flange') {
        // Sur l'aile supérieure - le texte doit être horizontal, visible du dessus
        // Pas de rotation X nécessaire car le plan est déjà dans le bon sens
        if (markingAngle !== 0) {
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (marking.face === 'u' || marking.face === 'bottom_flange') {
        // Sur l'aile inférieure - rotation de 180° pour être visible du dessous
        textMesh.rotation.x = Math.PI;
        if (markingAngle !== 0) {
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (marking.face === 'web' || marking.face === 'o' || !marking.face) {
        // Sur l'âme - rotation pour faire face à X+
        textMesh.rotation.y = Math.PI / 2;
        if (markingAngle !== 0) {
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      }
    } else if (element.materialType === 'plate' || element.materialType === 'sheet') {
      // Sur une plaque - à plat
      textMesh.rotation.x = -Math.PI / 2;
      if (markingAngle !== 0) {
        textMesh.rotation.z = (markingAngle * Math.PI) / 180;
      }
    } else if (element.materialType === 'tube') {
      // Sur un tube - à plat sur le dessus
      textMesh.rotation.x = -Math.PI / 2;
      if (markingAngle !== 0) {
        textMesh.rotation.y = (markingAngle * Math.PI) / 180;
      }
    }
    
    console.log(`   🔄 Rotation applied: X=${(textMesh.rotation.x * 180 / Math.PI).toFixed(1)}°, Y=${(textMesh.rotation.y * 180 / Math.PI).toFixed(1)}°, Z=${(textMesh.rotation.z * 180 / Math.PI).toFixed(1)}°`);
  }

  /**
   * Crée une texture canvas avec le texte du marking
   */
  private static createTextTexture(
    text: string,
    width: number,
    height: number
  ): THREE.CanvasTexture | null {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // Taille du canvas proportionnelle
    const scale = 10;  // Pixels par mm
    canvas.width = Math.max(256, width * scale);
    canvas.height = Math.max(128, height * scale);
    
    // Fond transparent
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configuration du texte
    const fontSize = canvas.height * 0.7;
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Contour noir pour contraste
    context.strokeStyle = '#000000';
    context.lineWidth = 4;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    // Texte jaune (couleur standard de marquage industriel)
    context.fillStyle = '#FFD700';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
}