/**
 * CSGHoleAdapter - Adaptateur pour intégrer les trous DSTV avec le processeur CSG
 *
 * Ce module fait le pont entre:
 * - Le nouveau système de transformation DSTV (DSTVTransformer)
 * - Le processeur de trous CSG existant (HoleProcessor)
 * - La visualisation 3D (Viewer3D)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { DSTVTransformer, DSTVCoordinate, DSTVFace, ProfileDimensions } from '../dstv/DSTVTransformer';
import { DSTVCoordinateConverter } from '../dstv/DSTVCoordinateConverter';

export interface CSGHole {
  id: string;
  coordinate: DSTVCoordinate;
  diameter: number;
  isThrough: boolean;
  depth?: number;
}

export interface CSGProcessingOptions {
  evaluator?: Evaluator;
  segmentCount?: number;
  marginFactor?: number;
}

export class CSGHoleAdapter {
  private transformer: DSTVTransformer;
  private converter: DSTVCoordinateConverter;
  private evaluator: Evaluator;
  private options: Required<CSGProcessingOptions>;
  private dimensions: ProfileDimensions;

  constructor(transformer: DSTVTransformer, options?: CSGProcessingOptions) {
    this.transformer = transformer;
    this.converter = new DSTVCoordinateConverter(false); // Mode debug désactivé par défaut
    // Accéder directement à la propriété dimensions du transformer
    this.dimensions = transformer.dimensions;
    this.options = {
      evaluator: options?.evaluator || new Evaluator(),
      segmentCount: options?.segmentCount || 32,
      marginFactor: options?.marginFactor || 1.1
    };

    this.evaluator = this.options.evaluator;
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
  }

  /**
   * Applique les trous à une géométrie en utilisant CSG
   */
  applyHoles(
    geometry: THREE.BufferGeometry,
    holes: CSGHole[]
  ): THREE.BufferGeometry {
    if (holes.length === 0) {
      return geometry;
    }

    console.log(`🔧 CSGHoleAdapter: Processing ${holes.length} holes`);

    // Créer le brush de base
    let baseBrush = new Brush(geometry);
    baseBrush.updateMatrixWorld();

    // Traiter chaque trou
    for (const hole of holes) {
      try {
        // Utiliser le convertisseur unifié pour transformer les coordonnées DSTV
        const standardPosition = this.converter.convertToStandard(
          hole.coordinate,
          this.dimensions,
          'hole'
        );

        const position3D = standardPosition.position;
        const rotation = this.converter.getHoleRotation(hole.coordinate.face);

        // Déterminer la profondeur du trou
        const holeDepth = this.calculateHoleDepth(hole, hole.coordinate.face);

        // Créer la géométrie du trou
        const holeGeometry = this.createHoleGeometry(
          hole.diameter,
          holeDepth,
          hole.coordinate.face
        );

        // Créer et positionner le brush du trou
        const holeBrush = new Brush(holeGeometry);
        holeBrush.position.copy(position3D);
        holeBrush.rotation.copy(rotation);
        holeBrush.updateMatrixWorld();

        console.log(`  - Hole ${hole.id}: Ø${hole.diameter}mm at face ${hole.coordinate.face}`);
        console.log(`    Position: (${position3D.x.toFixed(1)}, ${position3D.y.toFixed(1)}, ${position3D.z.toFixed(1)})`);
        console.log(`    Depth: ${holeDepth}mm (${hole.isThrough ? 'through' : 'blind'})`);

        // Effectuer la soustraction CSG
        const resultBrush = this.evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);

        // Nettoyer l'ancienne géométrie
        if (baseBrush !== resultBrush) {
          baseBrush.geometry.dispose();
        }
        holeGeometry.dispose();

        baseBrush = resultBrush;

      } catch (error) {
        console.error(`Failed to process hole ${hole.id}:`, error);
      }
    }

    // Extraire et optimiser la géométrie finale
    const resultGeometry = baseBrush.geometry.clone();
    resultGeometry.computeVertexNormals();
    resultGeometry.computeBoundingBox();
    resultGeometry.computeBoundingSphere();

    // Transférer les userData
    if (geometry.userData) {
      resultGeometry.userData = { ...geometry.userData };
    }

    // Ajouter les informations des trous
    resultGeometry.userData.holes = holes.map(hole => {
      const standardPos = this.converter.convertToStandard(
        hole.coordinate,
        this.dimensions,
        'hole'
      );
      return {
        id: hole.id,
        face: hole.coordinate.face,
        dstvCoordinate: hole.coordinate,
        position: [standardPos.position.x, standardPos.position.y, standardPos.position.z],
        diameter: hole.diameter,
        isThrough: hole.isThrough,
        depth: hole.depth
      };
    });

    // Nettoyer
    baseBrush.geometry.dispose();

    console.log(`✅ CSG processing complete: ${holes.length} holes applied`);
    return resultGeometry;
  }

  /**
   * Crée la géométrie d'un trou
   */
  private createHoleGeometry(
    diameter: number,
    depth: number,
    face: DSTVFace
  ): THREE.BufferGeometry {
    const radius = diameter / 2;

    // Créer un cylindre pour le trou
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      depth,
      this.options.segmentCount,
      1,
      false
    );

    // Le cylindre est créé vertical (le long de Y)
    // Pas besoin de rotation ici car elle sera appliquée via holeBrush.rotation

    return geometry;
  }

  /**
   * Calcule la profondeur du trou en fonction de la face et du type
   */
  private calculateHoleDepth(hole: CSGHole, face: DSTVFace): number {
    if (hole.isThrough) {
      // Pour un trou traversant, utiliser l'épaisseur de la zone multipliée par un facteur
      let thickness = 100; // Valeur par défaut

      switch (face) {
        case DSTVFace.TOP:
        case DSTVFace.BOTTOM:
          // Épaisseur de la semelle
          thickness = this.dimensions.flangeThickness || 20;
          break;

        case DSTVFace.LEFT:
        case DSTVFace.RIGHT:
          // Épaisseur de l'âme
          thickness = this.dimensions.webThickness || 10;
          break;

        case DSTVFace.FRONT:
        case DSTVFace.BACK:
          // Largeur du profil pour les faces avant/arrière
          thickness = this.dimensions.width || 100;
          break;
      }

      // Multiplier par un facteur pour garantir la traversée complète
      return thickness * 2;
    } else {
      // Trou borgne : utiliser la profondeur spécifiée
      return hole.depth || 20;
    }
  }

  /**
   * Valide un trou avant traitement
   */
  validateHole(hole: CSGHole): string[] {
    const errors: string[] = [];

    // Vérifier le diamètre
    if (!hole.diameter || hole.diameter <= 0) {
      errors.push(`Invalid hole diameter: ${hole.diameter}`);
    }

    // Vérifier les coordonnées
    if (!this.transformer.validateCoordinate(hole.coordinate)) {
      errors.push(`Invalid DSTV coordinate for hole ${hole.id}`);
    }

    // Vérifier la profondeur pour les trous borgnes
    if (!hole.isThrough && (!hole.depth || hole.depth <= 0)) {
      errors.push(`Invalid depth for blind hole: ${hole.depth}`);
    }

    return errors;
  }

  /**
   * Traite un batch de trous en une seule opération
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    holes: CSGHole[]
  ): {
    success: boolean;
    geometry?: THREE.BufferGeometry;
    errors?: string[];
  } {
    // Valider tous les trous
    const allErrors: string[] = [];
    for (const hole of holes) {
      const errors = this.validateHole(hole);
      if (errors.length > 0) {
        allErrors.push(`Hole ${hole.id}: ${errors.join('; ')}`);
      }
    }

    if (allErrors.length > 0) {
      return {
        success: false,
        errors: allErrors
      };
    }

    try {
      const resultGeometry = this.applyHoles(geometry, holes);
      return {
        success: true,
        geometry: resultGeometry
      };
    } catch (error) {
      return {
        success: false,
        errors: [`CSG processing failed: ${error}`]
      };
    }
  }

  /**
   * Crée un aperçu visuel des trous (sans CSG, juste pour visualisation)
   */
  createHolePreview(holes: CSGHole[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HolePreview';

    for (const hole of holes) {
      // Position 3D du trou
      const position = this.transformer.transform(hole.coordinate);
      const rotation = this.transformer.getHoleRotation(hole.coordinate.face);
      const depth = this.calculateHoleDepth(hole, hole.coordinate.face);

      // Créer un cylindre semi-transparent
      const geometry = new THREE.CylinderGeometry(
        hole.diameter / 2,
        hole.diameter / 2,
        depth,
        this.options.segmentCount
      );

      const material = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      mesh.name = `HolePreview_${hole.id}`;
      mesh.userData = {
        holeId: hole.id,
        coordinate: hole.coordinate,
        diameter: hole.diameter,
        isThrough: hole.isThrough
      };

      group.add(mesh);
    }

    return group;
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé explicitement
  }
}

export default CSGHoleAdapter;