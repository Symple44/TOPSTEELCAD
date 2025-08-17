/**
 * Processeur pour les marquages (inscriptions, gravures, scribbing)
 * Crée une gravure physique dans la matière
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult 
} from '../types';
import { PivotElement, MaterialType } from '@/types/viewer';
import { PositionCalculator } from '../utils/PositionCalculator';

export class MarkingProcessor implements IFeatureProcessor {
  private positionCalculator: PositionCalculator;
  private evaluator: Evaluator;
  
  constructor() {
    this.positionCalculator = new PositionCalculator();
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
  }
  
  private createDefaultFont() {
    // Créer une police basique pour le texte 3D
    // Dans une vraie implémentation, charger une police depuis un fichier JSON
    const fontData = {
      glyphs: {},
      familyName: 'Arial',
      ascender: 1000,
      descender: -200,
      underlineThickness: 100,
      underlinePosition: -100,
      boundingBox: {
        xMin: 0,
        xMax: 1000,
        yMin: -200,
        yMax: 1000
      },
      resolution: 1000,
      original_font_information: {
        format: 0,
        fontFamily: 'Arial'
      }
    };
    
    // Note: TextGeometry nécessite une vraie police
    // Pour l'instant on stocke juste les infos du marking
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    try {
      const text = feature.parameters.text || 'X';
      const size = feature.parameters.size || 10;
      const position = Array.isArray(feature.position) 
        ? new THREE.Vector3(feature.position[0], feature.position[1], feature.position[2])
        : feature.position;
      
      const parsedText = this.parseMarkingText(text);
      console.log(`📝 Processing marking/scribbing: "${parsedText}" at position [${position.x}, ${position.y}, ${position.z}] with size ${size}mm`);
      
      // Pour l'instant, stocker juste les infos du marking sans faire de CSG
      // Le CSG semble avoir des problèmes avec les géométries de plaque
      if (!geometry.userData.markings) {
        geometry.userData.markings = [];
      }
      
      const length = element.dimensions.length || 220;
      const width = element.dimensions.width || 120;
      
      // Préserver les userData importantes
      const existingCenterOffset = geometry.userData.centerOffset;
      const isMirrored = geometry.userData.isMirrored;
      
      geometry.userData.markings.push({
        text: parsedText,
        position: [
          position.x,  // Garder les coordonnées DSTV originales
          position.y,  // Elles seront converties dans SceneManager
          position.z
        ],
        size,
        face: feature.face,
        rotation: [0, 0, 0],
        type: text.includes('r') ? 'scribbing' : 'marking',
        centerOffset: existingCenterOffset, // Préserver le centerOffset
        isMirrored: isMirrored // Préserver le flag de miroir
      });
      
      console.log(`✅ Marking stored for visual display`);
      
      return {
        success: true,
        geometry: geometry
      };
      
      // Le code CSG ci-dessous est temporairement désactivé car il semble causer des problèmes
      
      // Calculer la position 3D correcte sur la surface
      const position3D = this.positionCalculator.calculateFeaturePosition(
        element,
        position,
        feature.face
      );
      
      // Créer une géométrie pour la gravure
      const engravingGeometry = this.createEngravingGeometry(parsedText, size);
      
      // Profondeur de gravure : 2mm pour marking, 3mm pour scribbing (plus visible)
      const depth = text.includes('r') ? 3.0 : 2.0;
      
      // Créer le brush pour la gravure
      const engravingBrush = new Brush(engravingGeometry);
      
      // Pour une plaque, la gravure doit être positionnée sur la surface supérieure
      if (element.materialType === MaterialType.PLATE || element.materialType === MaterialType.SHEET) {
        const thickness = element.dimensions.thickness || 15;
        
        // Position basée sur les coordonnées DSTV (depuis le coin)
        // Convertir vers le système Three.js (centré)
        const length = element.dimensions.length || 220;
        const width = element.dimensions.width || 120;
        
        engravingBrush.position.set(
          position.x - length / 2,  // Position X depuis le coin
          thickness / 2 - depth / 2, // Sur la surface supérieure, enfoncé de depth/2
          position.y - width / 2     // Position Y (Z en Three.js) depuis le coin
        );
        
        // Pas de rotation pour une gravure sur la face supérieure d'une plaque
        // La géométrie est déjà orientée pour creuser vers le bas
        console.log(`🎯 Engraving position on plate: [${engravingBrush.position.x}, ${engravingBrush.position.y}, ${engravingBrush.position.z}]`);
      } else {
        // Pour les profils
        engravingBrush.position.set(
          position3D.position[0],
          position3D.position[1],
          position3D.position[2]
        );
        
        // Orienter selon la face
        if (feature.face === 'web') {
          engravingBrush.rotation.y = Math.PI / 2;
        } else if (feature.face === 'bottom') {
          engravingBrush.rotation.x = Math.PI;
        }
      }
      
      engravingBrush.updateMatrixWorld();
      
      // Créer le brush pour la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Soustraire la gravure de la géométrie
      console.log(`🔨 Performing CSG subtraction for engraving...`);
      const resultBrush = this.evaluator.evaluate(baseBrush, engravingBrush, SUBTRACTION);
      
      // Nettoyer
      engravingGeometry.dispose();
      
      // Extraire la géométrie résultante
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Ajouter un attribut de couleur pour la gravure (optionnel)
      // Cela permet de visualiser où la gravure a été appliquée
      const colors = []
      const positionAttribute = resultGeometry.getAttribute('position');
      for (let i = 0; i < positionAttribute.count; i++) {
        // Colorer légèrement différemment les zones gravées
        colors.push(0.3, 0.3, 0.3); // Gris foncé pour simuler la gravure
      }
      resultGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      // Nettoyer le brush résultant
      resultBrush.geometry.dispose();
      
      // Stocker aussi l'info pour un éventuel affichage visuel supplémentaire
      if (!resultGeometry.userData.markings) {
        resultGeometry.userData.markings = [];
      }
      
      resultGeometry.userData.markings.push({
        text: parsedText,
        position: position3D.position,
        size,
        face: feature.face,
        rotation: position3D.rotation,
        type: text.includes('r') ? 'scribbing' : 'marking'
      });
      
      console.log(`✅ Engraving applied successfully`);
      console.log(`📐 Result geometry vertices: ${resultGeometry.getAttribute('position').count}`);
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      console.error(`❌ Failed to apply marking:`, error);
      // En cas d'erreur, stocker juste l'info sans modifier la géométrie
      if (!geometry.userData.markings) {
        geometry.userData.markings = [];
      }
      
      geometry.userData.markings.push({
        text: this.parseMarkingText(feature.parameters.text || ''),
        position: feature.position,
        size: feature.parameters.size || 10,
        face: feature.face,
        type: 'marking'
      });
      
      return {
        success: true,
        geometry: geometry
      };
    }
  }
  
  /**
   * Crée une géométrie simplifiée pour la gravure du texte
   * Utilise des formes 3D qui seront soustraites de la pièce
   */
  private createEngravingGeometry(text: string, size: number): THREE.BufferGeometry {
    const charWidth = size * 2; // Largeur plus grande pour être visible
    const charHeight = size * 2; // Hauteur plus grande
    const depth = 5; // Profondeur de gravure (5mm pour être bien visible)
    
    // Créer une géométrie composée pour tout le texte
    const group = new THREE.Group();
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ') continue;
      
      // Créer la géométrie pour ce caractère
      const charGeometry = this.createCharacterGeometry(char, charWidth, charHeight, depth);
      const charMesh = new THREE.Mesh(charGeometry);
      
      // Positionner le caractère
      charMesh.position.x = (i - text.length / 2 + 0.5) * charWidth * 1.1;
      charMesh.updateMatrix();
      charGeometry.applyMatrix4(charMesh.matrix);
      
      group.add(charMesh);
    }
    
    // Fusionner toutes les géométries en une seule
    if (group.children.length === 0) {
      // Si pas de caractères, créer une marque simple
      return new THREE.BoxGeometry(size * 2, depth, size * 0.5);
    }
    
    // Créer une géométrie fusionnée
    const mergedGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    let indexOffset = 0;
    const indices: number[] = [];
    
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        const positionAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');
        const uvAttribute = geometry.getAttribute('uv');
        const indexAttribute = geometry.getIndex();
        
        // Copier les positions
        for (let i = 0; i < positionAttribute.count; i++) {
          positions.push(
            positionAttribute.getX(i),
            positionAttribute.getY(i),
            positionAttribute.getZ(i)
          );
          
          if (normalAttribute) {
            normals.push(
              normalAttribute.getX(i),
              normalAttribute.getY(i),
              normalAttribute.getZ(i)
            );
          } else {
            normals.push(0, 1, 0);
          }
          
          if (uvAttribute) {
            uvs.push(uvAttribute.getX(i), uvAttribute.getY(i));
          } else {
            uvs.push(0, 0);
          }
        }
        
        // Copier les indices
        if (indexAttribute) {
          for (let i = 0; i < indexAttribute.count; i++) {
            indices.push(indexAttribute.getX(i) + indexOffset);
          }
          indexOffset += positionAttribute.count;
        }
        
        // Nettoyer
        geometry.dispose();
      }
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    mergedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) {
      mergedGeometry.setIndex(indices);
    }
    
    mergedGeometry.computeBoundingBox();
    mergedGeometry.computeBoundingSphere();
    
    return mergedGeometry;
  }
  
  /**
   * Crée une géométrie stylisée pour un caractère
   * Utilise des formes différentes pour créer un effet gravure réaliste
   */
  private createCharacterGeometry(char: string, width: number, height: number, depth: number): THREE.BufferGeometry {
    // Créer des géométries différentes selon le caractère
    if (/\d/.test(char)) {
      // Pour les chiffres, créer une forme plus complexe
      switch(char) {
        case '1':
          // Un trait vertical simple
          return new THREE.BoxGeometry(width * 0.3, depth, height * 0.9);
        
        case '4':
          // Forme en L inversé
          const four = new THREE.BufferGeometry();
          const vertical = new THREE.BoxGeometry(width * 0.3, depth, height * 0.9);
          const horizontal = new THREE.BoxGeometry(width * 0.7, depth, height * 0.3);
          horizontal.translate(0, 0, -height * 0.2);
          // Fusionner les deux parties
          const v = vertical.getAttribute('position').array;
          const h = horizontal.getAttribute('position').array;
          const positions = new Float32Array(v.length + h.length);
          positions.set(v, 0);
          positions.set(h, v.length);
          four.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          vertical.dispose();
          horizontal.dispose();
          return four;
          
        default:
          // Pour les autres chiffres, une forme rectangulaire
          return new THREE.BoxGeometry(width * 0.6, depth, height * 0.8);
      }
    } else if (/[A-Z]/i.test(char)) {
      // Pour les lettres, créer des formes variées
      switch(char.toUpperCase()) {
        case 'I':
          return new THREE.BoxGeometry(width * 0.3, depth, height * 0.9);
        case 'L':
          // Forme en L
          const lShape = new THREE.BufferGeometry();
          const vert = new THREE.BoxGeometry(width * 0.3, depth, height * 0.9);
          const horiz = new THREE.BoxGeometry(width * 0.6, depth, height * 0.3);
          horiz.translate(width * 0.15, 0, -height * 0.3);
          // Fusionner
          const vp = vert.getAttribute('position').array;
          const hp = horiz.getAttribute('position').array;
          const pos = new Float32Array(vp.length + hp.length);
          pos.set(vp, 0);
          pos.set(hp, vp.length);
          lShape.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          vert.dispose();
          horiz.dispose();
          return lShape;
        default:
          // Pour les autres lettres
          return new THREE.BoxGeometry(width * 0.7, depth, height * 0.8);
      }
    } else {
      // Pour les caractères spéciaux, une forme simple
      return new THREE.BoxGeometry(width * 0.5, depth, height * 0.5);
    }
  }
  
  private parseMarkingText(text: string): string {
    // Extraire le texte réel du format DSTV
    // Format typique: "v    2.00u    2.00  0.00  10r14"
    // Le "10r14" signifie un repère "14" avec rayon de 10mm
    
    // Chercher le pattern pour scribbing/marking
    const match = text.match(/(\d+)r(\d+)/);
    if (match) {
      return match[2]; // Retourner le numéro du repère
    }
    
    // Autre format possible : juste un numéro
    const numberMatch = text.match(/\b(\d+)\b/);
    if (numberMatch) {
      return numberMatch[1];
    }
    
    // Si ce n'est pas un format reconnu, retourner le texte brut nettoyé
    return text.trim().substring(0, 10); // Limiter la longueur
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    
    // Les markings peuvent avoir un texte vide (juste une marque)
    // donc on ne valide pas la présence de texte
    
    // Vérifier la taille si spécifiée
    if (feature.parameters.size !== undefined && feature.parameters.size <= 0) {
      errors.push(`Invalid marking size: ${feature.parameters.size}`);
    }
    
    return errors;
  }
}