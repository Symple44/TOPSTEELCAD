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
    // IMPORTANT: Les coordonnées sont DÉJÀ converties par DSTVCoordinateAdapter
    // Ne PAS refaire de conversion DSTV → Standard ici !
    const dstvX = marking.position[0] || 0;  // Position X (déjà convertie)
    const dstvY = marking.position[1] || 0;  // Position Y (déjà convertie, centrée pour profils I)
    const dstvZ = marking.position[2] || 0;  // Position Z (déjà convertie)
    
    // Dimensions du profil
    const length = element.dimensions?.length || 0;
    const height = element.dimensions?.height || 0;
    const width = element.dimensions?.width || 0;
    const webThickness = element.dimensions?.webThickness || 8.6;
    
    let x = 0, y = 0, z = 0;
    
    // Log pour débogage
    console.log(`   📐 Element type detection - materialType: ${element.materialType}, type: ${element.type}, dims.profileType: ${(element.dimensions as any)?.profileType}`);
    
    // Pour les profils BEAM (I/H)
    if (element.materialType === 'beam') {
      // Interprétation selon la face
      if (marking.face === 'web' || marking.face === 'v') {
        // Sur l'âme (face verticale centrale du profil I)
        // Le texte doit être centré sur l'âme
        z = dstvX;  // Position le long du profil
        x = webThickness / 2 + 0.1;  // Sur la face extérieure de l'âme
        // La conversion DSTV → Standard a déjà été faite par DSTVCoordinateAdapter
        // Utiliser directement la position Y convertie
        y = dstvY;  // Position Y déjà convertie
        
        console.log(`   📍 WEB marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else if (marking.face === 'o' || marking.face === 'top_flange') {
        // Sur l'aile supérieure:
        // DSTV X = position le long du profil (depuis le début)
        // DSTV Y = position latérale sur l'aile (0 = centre de l'âme)
        z = dstvX;  // Position directe le long du profil en Z (point de départ du texte)
        
        // Position latérale : DSTV Y est depuis le centre
        // Pour être sur l'aile, on ajoute l'épaisseur de l'âme/2 si Y est proche de 0
        if (Math.abs(dstvY) < webThickness / 2) {
          // Si Y est dans l'âme, on le place juste sur l'aile
          x = (dstvY >= 0 ? webThickness / 2 : -webThickness / 2) + dstvY;
        } else {
          // Sinon on utilise directement la coordonnée Y
          x = dstvY;
        }
        
        y = height / 2 + 0.1;  // Sur le dessus de l'aile supérieure (légèrement au-dessus)
        
        console.log(`   📍 TOP FLANGE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      } 
      else if (marking.face === 'u' || marking.face === 'bottom_flange') {
        // Sur l'aile inférieure:
        // DSTV X = position le long du profil (depuis le début)
        // DSTV Y = position latérale sur l'aile (0 = centre de l'âme)
        z = dstvX;  // Position directe le long du profil en Z (point de départ du texte)
        
        // Position latérale : même logique que l'aile supérieure
        if (Math.abs(dstvY) < webThickness / 2) {
          x = (dstvY >= 0 ? webThickness / 2 : -webThickness / 2) + dstvY;
        } else {
          x = dstvY;
        }
        
        y = -height / 2 - 0.1;  // Sur le dessous de l'aile inférieure (légèrement en dessous)
        
        console.log(`   📍 BOTTOM FLANGE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else {
        // Face non reconnue, utiliser les valeurs par défaut
        z = dstvX;
        x = 0;
        y = dstvY;
        console.log(`   📍 DEFAULT marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      
      console.log(`   📍 Face: ${marking.face || 'web'}, Dimensions: L=${length}, H=${height}, W=${width}`);
    }
    // Pour les plaques
    else if (element.materialType === 'plate' || element.materialType === 'sheet') {
      const thickness = element.dimensions?.thickness || 15;
      
      // Position sur la plaque (DSTV utilise le système direct)
      x = dstvX;
      z = dstvY;
      y = thickness / 2 + 0.1;  // Sur la surface supérieure
      
      console.log(`   📍 PLATE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    // Pour les tubes rectangulaires
    else if (element.materialType === 'tube') {
      // Pour les tubes rectangulaires, interpréter selon la face
      if (marking.face === 'v' || marking.face === 'top_flange' || marking.face === 'top') {
        // Sur la face supérieure du tube
        z = dstvX;  // Position le long du tube (depuis le début)
        x = dstvY;  // Position directe en X
        y = height + 0.1;  // Sur le dessus du tube (tube va de 0 à height)
        
        console.log(`   📍 TUBE TOP marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else if (marking.face === 'u' || marking.face === 'bottom_flange' || marking.face === 'bottom') {
        // Sur la face inférieure du tube
        z = dstvX;  // Position le long du tube
        x = dstvY;  // Position directe en X
        y = -0.1;  // Sous le tube (le bas du tube est à Y=0)
        
        console.log(`   📍 TUBE BOTTOM marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else {
        // Sur la face latérale (défaut)
        z = dstvX;  // Position le long du tube
        // Pour un tube positionné avec le bas à Y=0, dstvY est directement la position Y
        y = dstvY;  // Position directe en Y (depuis le bas du tube à Y=0)
        x = width / 2 + 0.1;  // Sur le côté droit du tube
        
        console.log(`   📍 TUBE SIDE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
    }
    // Pour les cornières (profils L)
    else if (element.materialType === 'angle' || (element as any).profileType === 'L_PROFILE' || 
             (element.dimensions as any)?.profileType === 'L_PROFILE' || element.type === 'L_PROFILE') {
      // Les cornières sont maintenant extrudées le long de Z comme les autres profils
      // Profil L dans le plan XY, extrusion le long de Z
      
      z = dstvX;  // Position le long de la cornière
      
      if (marking.face === 'web' || marking.face === 'v') {
        // Face extérieure de l'aile verticale (X=0 pour le profil L)
        // Le texte doit être collé à la surface
        x = 0;        // Directement sur la face à X=0
        y = dstvY;    // Position Y depuis le DSTV
      } else if (marking.face === 'h' || marking.face === 'front') {
        // Face avant de l'aile horizontale  
        x = dstvY;    // Position sur l'aile horizontale
        y = 0.1;      // Légèrement au-dessus de l'aile horizontale
      } else {
        // Par défaut sur l'aile verticale
        x = 0.1;
        y = dstvY;
      }
      
      console.log(`   📍 L-PROFILE marking: DSTV[${dstvX}, ${dstvY}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    // Pour tous les autres types de profils non gérés spécifiquement
    else {
      // Utiliser les coordonnées depuis marking.position
      z = dstvX;  // Position le long du profil
      x = dstvY;  // Position latérale
      y = 0.1;    // Légèrement devant la surface
      
      console.log(`   📍 DEFAULT marking: DSTV[${dstvX}, ${dstvY}, ${dstvZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    
    // Appliquer la position (point de départ DSTV = coin inférieur gauche)
    textMesh.position.set(x, y, z);
    
    // Appliquer la rotation selon la face
    this.applyMarkingRotation(textMesh, marking, element);
    
    // Décaler le texte pour que le point DSTV soit le début du texte, pas le centre
    // Le décalage dépend de la rotation appliquée
    const textWidth = (marking.size || 10) * (marking.text?.length || 1) * 0.7;
    
    // Le point DSTV est le point de départ du texte, pas son centre
    // Pas de décalage nécessaire - le texte commence à la position DSTV
  }

  /**
   * Applique la rotation correcte au marking selon sa face
   */
  private static applyMarkingRotation(
    textMesh: THREE.Mesh,
    marking: MarkingData,
    element: PivotElement
  ): void {
    console.log(`   🔄 Checking marking rotation:`, {
      hasRotation: !!marking.rotation,
      isArray: Array.isArray(marking.rotation),
      rotation: marking.rotation
    });
    
    // Si une rotation est fournie explicitement, l'utiliser directement
    if (marking.rotation && Array.isArray(marking.rotation) && 
        (marking.rotation[0] !== 0 || marking.rotation[1] !== 0 || marking.rotation[2] !== 0)) {
      textMesh.rotation.x = marking.rotation[0];
      textMesh.rotation.y = marking.rotation[1];
      textMesh.rotation.z = marking.rotation[2];
      console.log(`   🔄 Using provided rotation: X=${(marking.rotation[0] * 180 / Math.PI).toFixed(1)}°, Y=${(marking.rotation[1] * 180 / Math.PI).toFixed(1)}°, Z=${(marking.rotation[2] * 180 / Math.PI).toFixed(1)}°`);
      return;
    }
    
    const markingAngle = marking.angle || 0;
    
    if (element.materialType === 'beam') {
      if (marking.face === 'v' || marking.face === 'top_flange') {
        // Sur l'aile supérieure - le texte doit être aligné le long de la poutre
        // Rotation de 90° autour de Y pour aligner avec l'axe Z (longueur de la poutre)
        textMesh.rotation.y = Math.PI / 2;
        // Rotation additionnelle si spécifiée dans le marquage
        if (markingAngle !== 0) {
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (marking.face === 'u' || marking.face === 'bottom_flange') {
        // Sur l'aile inférieure - aligné le long de la poutre et retourné
        // Rotation de 90° autour de Y pour aligner avec l'axe Z
        textMesh.rotation.y = Math.PI / 2;
        // Rotation de 180° autour de X pour être visible du dessous
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
      // Sur un tube rectangulaire
      if (marking.face === 'v' || marking.face === 'top_flange') {
        // Sur la face supérieure du tube - texte plaqué sur la surface
        // Rotation Y pour aligner le texte avec l'axe Z (longueur du tube)
        textMesh.rotation.y = Math.PI / 2;
        // Rotation X pour plaquer le texte horizontalement sur le dessus
        textMesh.rotation.x = -Math.PI / 2;
        if (markingAngle !== 0) {
          // Rotation additionnelle spécifiée dans le DSTV
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (marking.face === 'u' || marking.face === 'bottom_flange') {
        // Sur la face inférieure du tube - texte plaqué sur la surface
        // Rotation Y pour aligner le texte avec l'axe Z (longueur du tube)
        textMesh.rotation.y = Math.PI / 2;
        // Rotation X pour plaquer le texte horizontalement sous le tube
        textMesh.rotation.x = -Math.PI / 2;
        // Rotation Z de 180° pour retourner le texte (visible du dessous)
        textMesh.rotation.z = Math.PI;
        if (markingAngle !== 0) {
          // Rotation additionnelle spécifiée dans le DSTV
          textMesh.rotation.z += (markingAngle * Math.PI) / 180;
        }
      } else {
        // Sur les faces verticales (côtés) - texte plaqué contre la face
        // Rotation Y pour faire face au côté et aligner avec l'axe Z
        textMesh.rotation.y = Math.PI / 2;
        if (markingAngle !== 0) {
          // Rotation additionnelle pour l'angle spécifié
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
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