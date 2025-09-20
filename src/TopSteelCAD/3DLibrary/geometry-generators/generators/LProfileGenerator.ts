/**
 * Générateur de géométries pour les cornières (L égales et inégales)
 */

import { Shape, ExtrudeGeometry, BufferGeometry } from '../../../lib/three-exports';
import * as THREE from 'three';
import { ProfileType } from '../../types/profile.types';
import type { ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class LProfileGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.L_EQUAL,
      ProfileType.L_UNEQUAL
    ]);
  }

  getName(): string {
    return 'LProfileGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const {
      height,
      width,
      thickness,
      webThickness,
      flangeThickness,
      leg1Length,
      leg2Length,
      rootRadius = 0,
      toeRadius = 0
    } = dimensions;

    // Validation - support des deux formats
    // Pour les cornières, webThickness = flangeThickness = thickness
    const actualHeight = height || leg1Length || 0;
    const actualWidth = width || leg2Length || actualHeight; // Cornière égale si pas de leg2Length
    const actualThickness = thickness || webThickness || flangeThickness || 0;
    
    if (!actualHeight || !actualThickness) {
      throw new Error(`Dimensions manquantes pour cornière: ${JSON.stringify(dimensions)}`);
    }

    if (length <= 0) {
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Créer le profil 2D
    const profile = this.createLProfile({
      height: actualHeight,
      width: actualWidth,
      thickness: actualThickness,
      rootRadius,
      toeRadius
    });

    // Extruder pour créer la 3D
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 8
    };

    const geometry = new ExtrudeGeometry(profile, extrudeSettings);

    // Centrer la géométrie
    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Crée directement la géométrie 3D d'une cornière dans l'orientation DSTV
   */
  private createLProfileGeometry3D(params: {
    length: number;
    height: number;
    width: number;
    thickness: number;
  }): BufferGeometry {
    const { length, height, width, thickness } = params;
    
    // Créer le profil dans le plan YZ
    const shape = new Shape();
    
    // Dessiner la cornière (origine au coin intérieur)
    // Aile verticale le long de Y, aile horizontale le long de Z
    shape.moveTo(0, 0);
    shape.lineTo(0, height);
    shape.lineTo(thickness, height);
    shape.lineTo(thickness, thickness);
    shape.lineTo(width, thickness);
    shape.lineTo(width, 0);
    shape.lineTo(0, 0);
    shape.closePath();
    
    // Créer un chemin d'extrusion le long de X
    const extrudePath = new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length, 0, 0)
    );
    
    // Extruder le long de X
    const extrudeSettings = {
      extrudePath: extrudePath,
      bevelEnabled: false,
      steps: 1
    };
    
    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    
    // La géométrie est maintenant dans l'orientation correcte DSTV
    return geometry;
  }

  /**
   * Crée le profil 2D d'une cornière dans le plan YZ (ancienne méthode conservée)
   */
  private createLProfileYZ(params: {
    height: number;
    width: number;
    thickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, thickness } = params;
    
    const shape = new Shape();
    
    const h = height;
    const w = width;
    const t = thickness;
    
    // Dessiner la cornière dans le plan YZ
    // L'origine est au coin intérieur de la cornière
    // Aile verticale le long de Y, aile horizontale le long de Z
    
    // Commencer au coin extérieur bas gauche
    shape.moveTo(0, 0);
    
    // Monter le long de l'aile verticale (extérieur)
    shape.lineTo(0, h);
    
    // Aller vers la droite pour l'épaisseur de l'aile verticale
    shape.lineTo(t, h);
    
    // Descendre jusqu'au raccord avec l'aile horizontale
    shape.lineTo(t, t);
    
    // Aller vers la droite le long de l'aile horizontale (intérieur)
    shape.lineTo(w, t);
    
    // Descendre pour l'épaisseur de l'aile horizontale
    shape.lineTo(w, 0);
    
    // Revenir au point de départ
    shape.lineTo(0, 0);
    shape.closePath();
    
    return shape;
  }

  /**
   * Crée le profil 2D d'une cornière
   */
  private createLProfile(params: {
    height: number;
    width: number;
    thickness: number;
    rootRadius: number;
    toeRadius: number;
  }): Shape {
    const { height, width, thickness } = params;
    
    const shape = new Shape();
    
    // Dessiner le L simple sans rayons pour commencer
    // Origine au coin intérieur du L
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);      // Base horizontale
    shape.lineTo(width, thickness); // Épaisseur horizontale
    shape.lineTo(thickness, thickness); // Coin intérieur
    shape.lineTo(thickness, height);    // Montée verticale
    shape.lineTo(0, height);            // Haut
    shape.lineTo(0, 0);                 // Retour au début
    shape.closePath();
    
    return shape;
  }
}