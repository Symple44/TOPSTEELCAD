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
    _mesh: THREE.Mesh
  ): void {
    // IMPORTANT: Les coordonnées sont DÉJÀ converties par DSTVCoordinateAdapter
    // Les positions sont déjà dans le système Standard Three.js
    const convertedX = marking.position[0] || 0;  // Position X déjà convertie
    const convertedY = marking.position[1] || 0;  // Position Y déjà convertie (centrée pour profils I)
    const convertedZ = marking.position[2] || 0;  // Position Z déjà convertie
    
    // Dimensions du profil
    const length = element.dimensions?.length || 0;
    const height = element.dimensions?.height || 0;
    const width = element.dimensions?.width || 0;
    const webThickness = element.dimensions?.webThickness || 8.6;
    const flangeThickness = element.dimensions?.flangeThickness || 14.2;
    
    let x = 0, y = 0, z = 0;
    
    // Log pour débogage
    console.log(`   📐 Element type detection - materialType: ${element.materialType}, type: ${element.type}, dims.profileType: ${(element.dimensions as any)?.profileType}`);
    console.log(`   📐 Converted positions: X=${convertedX}, Y=${convertedY}, Z=${convertedZ}`);
    
    // Pour les profils BEAM (I/H)
    if (element.materialType === 'beam') {
      // Les coordonnées sont déjà converties : Z est le long du profil, X latéral, Y vertical
      z = convertedZ;  // Position le long du profil (déjà convertie de DSTV X)
      
      // Normaliser la face
      const normalizedFace = marking.face === 'v' ? 'web' : 
                           marking.face === 'o' ? 'top_flange' : 
                           marking.face === 'u' ? 'bottom_flange' : 
                           marking.face || 'web';
      
      if (normalizedFace === 'web') {
        // Sur l'âme (face verticale centrale du profil I)
        // Ajuster la position X pour être sur la surface de l'âme
        const offset = 1.0; // Décalage pour garantir la visibilité
        
        // Vérifier si la position X est valide, sinon la corriger
        if (Math.abs(convertedX) < webThickness / 2) {
          // Position dans l'épaisseur de l'âme, la décaler sur la face externe
          x = (convertedX >= 0 ? webThickness / 2 : -webThickness / 2) + offset;
        } else {
          x = convertedX + (convertedX >= 0 ? offset : -offset);
        }
        
        y = convertedY;  // Position Y déjà convertie et centrée
        
        console.log(`   📍 WEB marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else if (normalizedFace === 'top_flange') {
        // Sur l'aile supérieure
        x = convertedX;  // Position latérale déjà convertie
        
        // Garantir que le texte est visible sur la surface supérieure
        const surfaceY = height / 2 - flangeThickness / 2;  // Centre de l'aile supérieure
        const offset = flangeThickness / 2 + 1.0;  // Au-dessus de la surface
        y = surfaceY + offset;
        
        console.log(`   📍 TOP FLANGE marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      } 
      else if (normalizedFace === 'bottom_flange') {
        // Sur l'aile inférieure
        x = convertedX;  // Position latérale déjà convertie
        
        // Garantir que le texte est visible sur la surface inférieure
        const surfaceY = -height / 2 + flangeThickness / 2;  // Centre de l'aile inférieure
        const offset = flangeThickness / 2 + 1.0;  // En-dessous de la surface
        y = surfaceY - offset;
        
        console.log(`   📍 BOTTOM FLANGE marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else {
        // Face non reconnue, placer sur l'âme par défaut
        const offset = webThickness / 2 + 1.0;
        x = offset;
        y = convertedY;
        z = convertedZ;
        console.log(`   📍 DEFAULT marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      
      console.log(`   📍 Face: ${normalizedFace}, Dimensions: L=${length}, H=${height}, W=${width}`);
    }
    // Pour les plaques
    else if (element.materialType === 'plate' || element.materialType === 'sheet') {
      const thickness = element.dimensions?.thickness || 15;
      
      // Les coordonnées sont déjà converties correctement
      x = convertedX;
      z = convertedZ;
      
      // Garantir que le texte est visible sur la surface supérieure
      const offset = 1.0;  // Décalage au-dessus de la surface
      y = thickness / 2 + offset;
      
      console.log(`   📍 PLATE marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    // Pour les tubes rectangulaires
    else if (element.materialType === 'tube') {
      // Les coordonnées sont déjà converties
      z = convertedZ;  // Position le long du tube
      
      // Normaliser la face
      const normalizedFace = marking.face === 'v' ? 'top' :
                           marking.face === 'u' ? 'bottom' :
                           marking.face === 'o' ? 'front' :
                           marking.face || 'side';
      
      const wallThickness = element.dimensions?.wallThickness || 5;
      const offset = wallThickness + 1.0;  // Décalage pour visibilité
      
      if (normalizedFace === 'top') {
        // Sur la face supérieure du tube
        x = convertedX;
        // Garantir la visibilité sur le dessus
        y = height / 2 + offset;
        
        console.log(`   📍 TUBE TOP marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else if (normalizedFace === 'bottom') {
        // Sur la face inférieure du tube
        x = convertedX;
        // Garantir la visibilité en dessous
        y = -height / 2 - offset;
        
        console.log(`   📍 TUBE BOTTOM marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
      else {
        // Sur la face latérale (défaut)
        // Garantir la visibilité sur le côté
        x = width / 2 + offset;
        y = convertedY;
        
        console.log(`   📍 TUBE SIDE marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
      }
    }
    // Pour les cornières (profils L)
    else if (element.materialType === 'angle' || (element as any).profileType === 'L_PROFILE' || 
             (element.dimensions as any)?.profileType === 'L_PROFILE' || element.type === 'L_PROFILE') {
      // Les coordonnées sont déjà converties
      z = convertedZ;  // Position le long de la cornière
      
      const legThickness = element.dimensions?.legThickness || 10;
      const offset = legThickness / 2 + 1.0;  // Décalage pour visibilité
      
      // Normaliser la face
      const normalizedFace = marking.face === 'v' ? 'vertical' :
                           marking.face === 'h' ? 'horizontal' :
                           marking.face || 'vertical';
      
      if (normalizedFace === 'vertical') {
        // Face extérieure de l'aile verticale
        // Garantir la visibilité sur la face externe
        x = -offset;  // Décalage négatif pour être à l'extérieur
        y = convertedY;
      } else if (normalizedFace === 'horizontal') {
        // Face supérieure de l'aile horizontale
        x = convertedX;
        y = offset;  // Au-dessus de l'aile horizontale
      } else {
        // Par défaut sur l'aile verticale
        x = -offset;
        y = convertedY;
      }
      
      console.log(`   📍 L-PROFILE marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    // Pour tous les autres types de profils non gérés spécifiquement
    else {
      // Utiliser les coordonnées converties directement
      z = convertedZ;
      x = convertedX;
      y = convertedY;
      
      // Ajouter un petit décalage pour garantir la visibilité
      const defaultOffset = 1.0;
      if (Math.abs(y) < defaultOffset) {
        y = defaultOffset;  // Décaler vers le haut si trop proche du centre
      }
      
      console.log(`   📍 DEFAULT marking: Converted[${convertedX}, ${convertedY}, ${convertedZ}] -> Three.js[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
    }
    
    // Appliquer les offsets de centrage si présents
    if (marking.centerOffset) {
      console.log(`   🔄 Applying centerOffset:`, marking.centerOffset);
      // Les offsets sont appliqués dans le plan XY avant positionnement
      x -= marking.centerOffset.x || 0;
      y -= marking.centerOffset.y || 0;
    }
    
    // Appliquer la position finale
    textMesh.position.set(x, y, z);
    
    // Appliquer la rotation selon la face
    this.applyMarkingRotation(textMesh, marking, element);
    
    // Ajuster l'alignement du texte pour qu'il commence au point DSTV
    // Plutôt que d'être centré sur ce point
    const textWidth = (marking.size || 10) * (marking.text?.length || 1) * 0.35;
    
    // Décaler le mesh de la moitié de sa largeur selon sa rotation
    // pour que le texte commence au point DSTV au lieu d'être centré
    if (Math.abs(textMesh.rotation.y - Math.PI / 2) < 0.1) {
      // Texte aligné le long de Z, décaler en Z
      textMesh.position.z += textWidth;
    } else {
      // Texte aligné le long de X, décaler en X
      textMesh.position.x += textWidth;
    }
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
      rotation: marking.rotation,
      angle: marking.angle
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
    
    // Normaliser la face pour un traitement uniforme
    const normalizedFace = marking.face === 'v' ? 'web' : 
                         marking.face === 'o' ? 'top_flange' : 
                         marking.face === 'u' ? 'bottom_flange' : 
                         marking.face || 'web';
    
    if (element.materialType === 'beam') {
      if (normalizedFace === 'web') {
        // Sur l'âme - rotation pour faire face à X+
        textMesh.rotation.y = Math.PI / 2;
        if (markingAngle !== 0) {
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (normalizedFace === 'top_flange') {
        // Sur l'aile supérieure - le texte doit être aligné le long de la poutre
        // Rotation de 90° autour de Y pour aligner avec l'axe Z (longueur de la poutre)
        textMesh.rotation.y = Math.PI / 2;
        textMesh.rotation.x = -Math.PI / 2;  // Plaquer sur la surface horizontale
        // Rotation additionnelle si spécifiée dans le marquage
        if (markingAngle !== 0) {
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (normalizedFace === 'bottom_flange') {
        // Sur l'aile inférieure - aligné le long de la poutre et retourné
        // Rotation de 90° autour de Y pour aligner avec l'axe Z
        textMesh.rotation.y = Math.PI / 2;
        textMesh.rotation.x = Math.PI / 2;  // Plaquer sur la surface horizontale, visible du dessous
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
      // Normaliser la face
      const tubeFace = marking.face === 'v' ? 'top' :
                      marking.face === 'u' ? 'bottom' :
                      marking.face || 'side';
      
      if (tubeFace === 'top') {
        // Sur la face supérieure du tube - texte plaqué sur la surface
        // Rotation Y pour aligner le texte avec l'axe Z (longueur du tube)
        textMesh.rotation.y = Math.PI / 2;
        // Rotation X pour plaquer le texte horizontalement sur le dessus
        textMesh.rotation.x = -Math.PI / 2;
        if (markingAngle !== 0) {
          // Rotation additionnelle spécifiée dans le DSTV
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
        }
      } else if (tubeFace === 'bottom') {
        // Sur la face inférieure du tube - texte plaqué sur la surface
        // Rotation Y pour aligner le texte avec l'axe Z (longueur du tube)
        textMesh.rotation.y = Math.PI / 2;
        // Rotation X pour plaquer le texte horizontalement sous le tube
        textMesh.rotation.x = Math.PI / 2;
        if (markingAngle !== 0) {
          // Rotation additionnelle spécifiée dans le DSTV
          textMesh.rotation.z = (markingAngle * Math.PI) / 180;
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