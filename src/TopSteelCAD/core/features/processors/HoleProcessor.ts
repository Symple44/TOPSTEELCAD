/**
 * Processeur pour les trous (perçages)
 */

import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { 
  Feature, 
  IFeatureProcessor, 
  ProcessorResult,
  ProfileFace,
  CoordinateSystem 
} from '../types';
import { PivotElement, MaterialType } from '@/types/viewer';
import { PositionService } from '../../services/PositionService';
import { StandardFace } from '../../coordinates/types';

export class HoleProcessor implements IFeatureProcessor {
  private evaluator: Evaluator;
  private positionService: PositionService;
  
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal', 'uv'];
    this.positionService = PositionService.getInstance();
  }
  
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    try {
      console.log(`🔨 HoleProcessor: Processing hole for element ${element.id}`);
      console.log(`  - Feature:`, feature);
      console.log(`  - Element dimensions:`, element.dimensions);
      
      // Valider la feature
      const errors = this.validateFeature(feature, element);
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join('; ')
        };
      }
      
      // Calculer la position et l'orientation correctes
      // Convertir la position en Vector3 si nécessaire
      const featurePos = Array.isArray(feature.position) 
        ? new THREE.Vector3(feature.position[0], feature.position[1], feature.position[2])
        : feature.position;
      
      // Les coordonnées sont déjà converties au format standard dans DSTVNormalizationStage
      // Plus besoin d'ajustement spécifique DSTV ici
      console.log(`  - Using standard position: (${featurePos.x}, ${featurePos.y}, ${featurePos.z})`);
      console.log(`  - Face: ${feature.face || feature.parameters?.face || 'default'}`)
      
      const position3D = this.positionService.calculateFeaturePosition(
        element,
        featurePos,
        feature.face,
        feature.coordinateSystem || CoordinateSystem.STANDARD  // Utiliser le système de coordonnées de la feature
      );
      console.log(`  - Calculated 3D position:`, position3D);
      console.log(`    → Position Vector3:`, position3D.position.x, position3D.position.y, position3D.position.z);
      console.log(`    → Rotation Euler:`, position3D.rotation.x, position3D.rotation.y, position3D.rotation.z);
      
      // IMPORTANT: Utiliser la profondeur de la feature, pas celle du positionService
      // Si depth=0, c'est un trou traversant
      const holeDepth = feature.parameters.depth || 0;
      
      // Calculer l'épaisseur de la zone à percer selon la face
      let zoneThickness = 10; // Valeur par défaut
      if (feature.face === ProfileFace.WEB || (feature.face as any) === 'web' || (feature.face as any) === 'v') {
        // Pour l'âme, utiliser l'épaisseur de l'âme (webThickness)
        zoneThickness = element.dimensions?.webThickness || element.dimensions?.thickness || 10;
        console.log(`  - Web face detected, webThickness: ${element.dimensions?.webThickness}mm, using: ${zoneThickness}mm`);
      } else if (feature.face === ProfileFace.TOP_FLANGE || feature.face === ProfileFace.BOTTOM_FLANGE ||
                 (feature.face as any) === 'top_flange' || (feature.face as any) === 'bottom_flange' || 
                 (feature.face as any) === 'o' || (feature.face as any) === 'u') {
        // Pour les semelles, utiliser l'épaisseur de la semelle (flangeThickness)
        zoneThickness = element.dimensions?.flangeThickness || element.dimensions?.thickness || 15;
        console.log(`  - Flange face detected, flangeThickness: ${element.dimensions?.flangeThickness}mm, using: ${zoneThickness}mm`);
      }
      
      console.log(`  - Hole depth from feature: ${holeDepth}mm (0 = through hole)`);
      
      // Créer la géométrie du trou selon son type
      const holeType = feature.parameters.holeType || 'round';
      let holeGeometry: THREE.BufferGeometry;
      
      if (holeType === 'slotted') {
        holeGeometry = this.createSlottedHoleGeometry(
          feature.parameters.diameter!,
          feature.parameters.slottedLength || 0,
          feature.parameters.slottedAngle || 0,
          holeDepth  // Utiliser la profondeur de la feature
        );
        console.log(`  - Created slotted hole: diameter=${feature.parameters.diameter}, length=${feature.parameters.slottedLength}, angle=${feature.parameters.slottedAngle}°`);
      } else if (holeType === 'rectangular') {
        holeGeometry = this.createRectangularHoleGeometry(
          feature.parameters.width || feature.parameters.diameter!,
          feature.parameters.height || feature.parameters.diameter!,
          holeDepth  // Utiliser la profondeur de la feature
        );
        console.log(`  - Created rectangular hole: ${feature.parameters.width}x${feature.parameters.height}`);
      } else {
        holeGeometry = this.createHoleGeometry(
          feature.parameters.diameter!,
          holeDepth,  // Utiliser la profondeur de la feature
          feature.face,
          zoneThickness  // Passer l'épaisseur de la zone pour les trous traversants
        );
        console.log(`  - Created round hole: diameter=${feature.parameters.diameter}`);
      }
      
      // Positionner et orienter le trou
      const holeBrush = new Brush(holeGeometry);
      
      // Appliquer la position
      // IMPORTANT: Pour les trous traversants, ajuster la position selon la rotation
      // pour que le cylindre parte de la face et traverse le matériau
      let adjustedPosition = position3D.position.clone();
      
      // Calculer la profondeur réelle pour les ajustements
      const actualDepth = (holeDepth <= 0.1) 
        ? zoneThickness * 2  // Doubler l'épaisseur de la zone pour garantir la traversée
        : holeDepth * 1.5;
      console.log(`  🔍 Hole depth calculation: feature.depth=${holeDepth}, zoneThickness=${zoneThickness}, actualDepth=${actualDepth}, isThrough=${holeDepth <= 0.1}`);
      
      // Pour les trous traversants, ne pas ajuster la position
      // Le cylindre est créé avec 2x l'épaisseur de la zone et sera centré sur la position
      // Cela garantit qu'il traverse complètement la zone concernée
      if (holeDepth <= 0.1) {
        console.log(`  - Through hole detected (depth=${holeDepth}), using centered position with ${actualDepth}mm depth`);
        console.log(`  - Position: X=${adjustedPosition.x}, Y=${adjustedPosition.y}, Z=${adjustedPosition.z}`);
        console.log(`  - Rotation: X=${position3D.rotation.x}, Y=${position3D.rotation.y}, Z=${position3D.rotation.z}`);
      }
      
      holeBrush.position.copy(adjustedPosition);
      
      // Appliquer la rotation pour que le trou soit perpendiculaire à la surface
      holeBrush.rotation.set(
        position3D.rotation.x,
        position3D.rotation.y,
        position3D.rotation.z
      );
      
      holeBrush.updateMatrixWorld();
      console.log(`  - Hole brush position:`, holeBrush.position);
      console.log(`  - Hole brush rotation:`, holeBrush.rotation);
      
      // Créer le brush pour la géométrie de base
      const baseBrush = new Brush(geometry);
      baseBrush.updateMatrixWorld();
      
      // Effectuer la soustraction CSG
      console.log(`  - Performing CSG subtraction...`);
      const resultBrush = this.evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);
      
      // Nettoyer les géométries temporaires
      holeGeometry.dispose();
      
      // Extraire et optimiser la géométrie résultante
      const resultGeometry = resultBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Transférer tous les userData existants
      if (!resultGeometry.userData) {
        resultGeometry.userData = {};
      }
      if (geometry.userData) {
        Object.assign(resultGeometry.userData, geometry.userData);
      }
      
      // Transférer les informations des trous existants
      if (geometry.userData?.holes) {
        resultGeometry.userData.holes = [...geometry.userData.holes];
      } else {
        resultGeometry.userData.holes = [];
      }
      
      // Ajouter les informations du nouveau trou
      // Garder la position DSTV originale ET la position 3D transformée
      const originalPosition = Array.isArray(feature.position) 
        ? feature.position 
        : [feature.position.x, feature.position.y, feature.position.z || 0];
      
      // Utiliser la profondeur de la feature, pas celle de position3D
      const featureDepth = feature.parameters.depth || 0;
      const holeDataDepth = (featureDepth <= 0.1) ? 1000 : featureDepth;
      
      // Utiliser la position du brush qui est la position réelle du trou dans la géométrie centrée
      resultGeometry.userData.holes.push({
        id: feature.id,  // Ajouter l'ID de la feature DSTV
        position: [holeBrush.position.x, holeBrush.position.y, holeBrush.position.z],  // Position réelle du trou
        originalPosition: originalPosition,  // Position DSTV originale
        diameter: feature.parameters.diameter,
        type: feature.parameters.holeType || 'round',
        face: position3D.face,
        rotation: position3D.rotation,
        depth: holeDataDepth,  // Utiliser la profondeur correcte
        slottedLength: feature.parameters.slottedLength
      });
      
      // Vérifier que la géométrie a bien été modifiée
      const originalVertexCount = geometry.attributes.position?.count || 0;
      const resultVertexCount = resultGeometry.attributes.position?.count || 0;
      console.log(`  - Original vertex count: ${originalVertexCount}`);
      console.log(`  - Result vertex count: ${resultVertexCount}`);
      console.log(`  - Vertices ${resultVertexCount > originalVertexCount ? 'ADDED' : resultVertexCount < originalVertexCount ? 'REMOVED' : 'UNCHANGED'}: ${Math.abs(resultVertexCount - originalVertexCount)}`);
      
      // Nettoyer le brush résultant
      resultBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process hole: ${error}`
      };
    }
  }
  
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters;
    
    // Vérifier le diamètre
    if (!params.diameter || params.diameter <= 0) {
      errors.push(`Invalid hole diameter: ${params.diameter}`);
    }
    
    // Vérifier la profondeur si spécifiée
    // Note: depth = 0 ou undefined signifie un trou traversant (valide)
    if (params.depth !== undefined && params.depth < 0) {
      errors.push(`Invalid hole depth: ${params.depth} (negative value)`);
    }
    
    // Vérifier que le diamètre n'est pas plus grand que l'élément
    const minDimension = Math.min(
      element.dimensions.width || 100,
      element.dimensions.height || 100
    );
    
    if (params.diameter && params.diameter > minDimension) {
      errors.push(`Hole diameter (${params.diameter}) exceeds element dimensions`);
    }
    
    // Vérifier la position - convertir en Vector3 si nécessaire
    const pos = feature.position instanceof THREE.Vector3 
      ? feature.position 
      : new THREE.Vector3(feature.position[0], feature.position[1], feature.position[2]);
    const face = feature.face;
    if (!this.isPositionValid(pos, element, face)) {
      console.log(`Position validation failed: pos=${pos.x},${pos.y},${pos.z}, face=${face}, dims=${element.dimensions.length}x${element.dimensions.width}x${element.dimensions.height}`);
      errors.push(`Hole position out of bounds`);
    }
    
    return errors;
  }
  
  private createHoleGeometry(diameter: number, depth: number, face?: ProfileFace | undefined, zoneThickness?: number): THREE.BufferGeometry {
    // Créer un cylindre pour le trou
    // Si depth = 0 ou très petit, c'est un trou traversant -> utiliser l'épaisseur de la zone
    // Pour un trou traversant, ajouter une marge pour garantir la traversée complète
    const actualDepth = (depth <= 0.1) 
      ? (zoneThickness || 10) * 2  // Doubler l'épaisseur pour garantir la traversée
      : depth * 1.5; // Pour les trous non traversants, utiliser la profondeur spécifiée
    const radius = diameter / 2;
    
    // Augmenter le nombre de segments pour des trous plus ronds
    // Plus de segments = trous plus circulaires et meilleur rendu
    const segments = Math.max(32, Math.min(64, Math.round(diameter)));
    
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      actualDepth,
      segments,
      1,  // height segments
      false  // open ended
    );
    
    console.log(`  🔩 Round hole geometry: diameter=${diameter}mm, segments=${segments}, depth=${actualDepth}mm, face=${face}`);
    
    // NE PAS appliquer de rotation ici - elle sera appliquée via holeBrush.rotation
    // La rotation sera gérée par position3D.rotation dans le process()
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de trou oblong (slot)
   */
  private createSlottedHoleGeometry(diameter: number, slottedLength: number, angle: number, depth: number): THREE.BufferGeometry {
    const actualDepth = depth * 1.1;
    const radius = diameter / 2;
    
    console.log(`  🔧 Creating slotted hole geometry: diameter=${diameter}mm, elongation=${slottedLength}mm, angle=${angle}°, depth=${actualDepth}mm`);
    
    // Créer une forme 2D de capsule (trou oblong)
    const shape = new THREE.Shape();
    
    // Distance entre les centres des deux demi-cercles
    const halfLength = slottedLength / 2;
    
    // Tracer le contour de la capsule avec plus de précision
    // Commencer en bas à gauche
    shape.moveTo(-halfLength, -radius);
    
    // Ligne du bas (gauche vers droite)
    shape.lineTo(halfLength, -radius);
    
    // Demi-cercle droit - plus de segments pour un contour plus lisse
    const segments = 16; // Plus de segments pour des courbes lisses
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (Math.PI * i / segments);
      const x = halfLength + radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    
    // Ligne du haut (droite vers gauche)
    shape.lineTo(-halfLength, radius);
    
    // Demi-cercle gauche
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI / 2 + (Math.PI * i / segments);
      const x = -halfLength + radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      shape.lineTo(x, y);
    }
    
    // Fermer la forme
    shape.closePath();
    
    // Extruder la forme pour créer le volume 3D
    const extrudeSettings = {
      depth: actualDepth,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Rotation pour orienter correctement (le trou doit être vertical)
    // L'extrusion se fait selon Z, on veut qu'elle se fasse selon Y
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationX(Math.PI / 2);
    geometry.applyMatrix4(rotMatrix);
    
    // Centrer la géométrie
    geometry.center();
    
    // Appliquer la rotation selon l'angle spécifié (rotation dans le plan XZ)
    if (angle !== 0) {
      const angleMatrix = new THREE.Matrix4();
      angleMatrix.makeRotationY(THREE.MathUtils.degToRad(angle));
      geometry.applyMatrix4(angleMatrix);
    }
    
    console.log(`  ✅ Slotted hole geometry created: total length=${diameter + slottedLength}mm`);
    
    return geometry;
  }
  
  /**
   * Crée une géométrie de trou rectangulaire
   */
  private createRectangularHoleGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
    const actualDepth = depth * 1.1;
    
    // Créer une forme rectangulaire
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    shape.moveTo(-halfWidth, -halfHeight);
    shape.lineTo(halfWidth, -halfHeight);
    shape.lineTo(halfWidth, halfHeight);
    shape.lineTo(-halfWidth, halfHeight);
    shape.closePath();
    
    // Extruder la forme
    const extrudeSettings = {
      depth: actualDepth,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Centrer la géométrie
    geometry.center();
    
    return geometry;
  }
  
  private isPositionValid(position: THREE.Vector3, element: PivotElement, face?: ProfileFace | undefined): boolean {
    const dims = element.dimensions;
    const materialType = element.materialType;
    
    // Dimensions de base
    const length = dims.length || 1000;
    const width = dims.width || 100;
    const height = dims.height || 100;
    const thickness = dims.thickness || 10;
    
    // Permettre une petite marge pour les trous sur les bords
    const margin = 10;
    
    // IMPORTANT: Nouveau système de coordonnées pour DSTV
    // Le profil I est créé dans le plan XY et extrudé le long de Z
    // - X = largeur du profil
    // - Y = hauteur du profil  
    // - Z = longueur du profil (extrusion)
    
    // Pour les profils en I (BEAM) avec trous dans l'âme
    if (materialType === MaterialType.BEAM && face === ProfileFace.WEB) {
      // Pour l'âme : 
      // Z = position le long de la poutre (0 à length maintenant!)
      // Y = hauteur sur l'âme
      // X = doit être proche de 0 (centre de l'âme)
      return (
        Math.abs(position.x) <= thickness/2 + margin &&  // Au centre de l'âme
        position.y >= -height/2 - margin && position.y <= height/2 + margin &&  // Dans la hauteur
        position.z >= -margin && position.z <= length + margin   // Le long du profil - CORRIGÉ: 0 à length
      );
    }
    
    // Pour les profils en I (BEAM) - semelle supérieure
    if (materialType === MaterialType.BEAM && face === ProfileFace.TOP) {
      // Semelle supérieure
      // Z = position le long de la poutre
      // X = position latérale sur la semelle
      // Y = doit être proche de height/2
      return (
        position.x >= -width/2 - margin && position.x <= width/2 + margin &&  // Dans la largeur de la semelle
        Math.abs(position.y - height/2) <= thickness + margin &&  // Proche du haut
        position.z >= -margin && position.z <= length + margin   // Le long du profil - CORRIGÉ: 0 à length
      );
    }
    
    // Pour les profils en I (BEAM) avec trous dans les ailes
    if (materialType === MaterialType.BEAM && (face === ProfileFace.BOTTOM || face === ProfileFace.TOP)) {
      // Pour les ailes : X = position le long de la poutre, Y = position latérale sur l'aile
      return (
        position.x >= -margin && position.x <= length + margin &&
        position.y >= -margin && position.y <= width + margin &&  // Y comparé à la largeur de l'aile
        Math.abs(position.z) <= height/2 + margin
      );
    }
    
    // Pour les plaques (PLATE)
    if (materialType === MaterialType.PLATE) {
      return (
        position.x >= -margin && position.x <= length + margin &&
        position.y >= -margin && position.y <= width + margin &&
        Math.abs(position.z) <= thickness + margin
      );
    }
    
    // Pour les faces FRONT/BACK (face avant/arrière du profil)
    // Ces faces sont perpendiculaires à l'axe Z (longueur)
    if (face === ProfileFace.FRONT || face === ProfileFace.BACK) {
      // Sur la face avant/arrière, les coordonnées X,Y définissent la position sur la face
      // Pour L-profiles: origine au coin, donc X et Y peuvent être positifs jusqu'à width/height
      // Pour I-profiles: origine centrée, donc X et Y sont dans [-width/2, width/2] et [-height/2, height/2]
      
      // Détection du type de profil basée sur les dimensions
      // Les L-profiles ont généralement width ≈ height (profils équilatéraux)
      const isLProfile = Math.abs(width - height) < 10; // Tolérance de 10mm pour L-profiles équilatéraux
      
      if (isLProfile) {
        // L-profile: origine au coin, coordonnées positives
        return (
          position.x >= -margin && position.x <= width + margin &&
          position.y >= -margin && position.y <= height + margin &&
          position.z >= -margin && position.z <= length + margin
        );
      } else {
        // I-profile ou autre: origine centrée
        return (
          position.x >= -width/2 - margin && position.x <= width/2 + margin &&
          position.y >= -height/2 - margin && position.y <= height/2 + margin &&
          position.z >= -margin && position.z <= length + margin
        );
      }
    }
    
    // Validation par défaut avec le nouveau système de coordonnées
    // Z = longueur (0 à length), Y = hauteur, X = largeur
    return (
      position.x >= -width/2 - margin && position.x <= width/2 + margin &&
      position.y >= -height/2 - margin && position.y <= height/2 + margin &&
      position.z >= -margin && position.z <= length + margin  // CORRIGÉ: 0 à length
    );
  }
  
  /**
   * [DEPRECATED] Marque les bords des trous pour une coloration visible
   * Remplacé par un système de contours visuels
   */
  private markHoleEdges_DEPRECATED(geometry: THREE.BufferGeometry, holePosition: number[], holeDiameter: number): void {
    // Créer un attribut de couleur si nécessaire
    const positions = geometry.attributes.position;
    const count = positions.count;
    
    // Créer ou récupérer l'attribut de couleur
    const colors = geometry.attributes.color;
    let colorArray: Float32Array;
    
    if (!colors) {
      colorArray = new Float32Array(count * 3);
      // Initialiser avec la couleur métallique par défaut
      const defaultColor = new THREE.Color(0x8b9dc3);
      for (let i = 0; i < count; i++) {
        colorArray[i * 3] = defaultColor.r;
        colorArray[i * 3 + 1] = defaultColor.g;
        colorArray[i * 3 + 2] = defaultColor.b;
      }
    } else {
      colorArray = colors.array as Float32Array;
    }
    
    // Position du trou en Vector3
    const holePos = new THREE.Vector3(holePosition[0], holePosition[1], holePosition[2]);
    const radius = holeDiameter / 2;
    const edgeWidth = 2; // Largeur de la zone colorée en mm
    
    // Couleur rouge vif pour les bords des trous
    const holeEdgeColor = new THREE.Color(0xff3333); // Rouge brillant
    
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Calculer la distance au centre du trou dans le plan XZ
      const dx = x - holePos.x;
      const dz = z - holePos.z;
      const distanceInPlane = Math.sqrt(dx * dx + dz * dz);
      
      // Si le vertex est sur le bord du trou (anneau autour du trou)
      if (distanceInPlane >= radius - edgeWidth && distanceInPlane <= radius + edgeWidth) {
        // Vérifier aussi la proximité en Y (hauteur)
        const dy = Math.abs(y - holePos.y);
        if (dy < 20) { // Dans une zone de 20mm autour du niveau du trou
          // Appliquer la couleur rouge vif
          colorArray[i * 3] = holeEdgeColor.r;
          colorArray[i * 3 + 1] = holeEdgeColor.g;
          colorArray[i * 3 + 2] = holeEdgeColor.b;
        }
      }
    }
    
    // Ajouter ou mettre à jour l'attribut de couleur
    if (!colors) {
      geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    } else {
      colors.needsUpdate = true;
    }
    
    // Marquer la géométrie comme ayant des couleurs de vertex
    geometry.userData.hasVertexColors = true;
    
    console.log(`  🎨 Marked hole edges with red highlights (Ø${holeDiameter}mm at ${holePosition})`);
  }

  /**
   * Optimisation: créer plusieurs trous en une seule opération
   */
  processBatch(
    geometry: THREE.BufferGeometry,
    holes: Feature[],
    element: PivotElement
  ): ProcessorResult {
    try {
      // Valider tous les trous
      const allErrors: string[] = [];
      for (const hole of holes) {
        const errors = this.validateFeature(hole, element);
        if (errors.length > 0) {
          allErrors.push(`Hole ${hole.id}: ${errors.join('; ')}`);
        }
      }
      
      if (allErrors.length > 0) {
        return {
          success: false,
          error: allErrors.join('\n')
        };
      }
      
      // Créer le brush de base une seule fois
      let currentBrush = new Brush(geometry);
      currentBrush.updateMatrixWorld();
      
      // Appliquer tous les trous
      for (const hole of holes) {
        const position3D = this.positionService.calculateFeaturePosition(
          element,
          hole.position,
          hole.face
        );
        
        const holeGeometry = this.createHoleGeometry(
          hole.parameters.diameter!,
          position3D.depth,
          hole.face
        );
        
        const holeBrush = new Brush(holeGeometry);
        holeBrush.position.set(
          position3D.position.x,
          position3D.position.y,
          position3D.position.z
        );
        holeBrush.rotation.set(
          position3D.rotation.x,
          position3D.rotation.y,
          position3D.rotation.z
        );
        holeBrush.updateMatrixWorld();
        
        // Soustraire le trou
        const resultBrush = this.evaluator.evaluate(currentBrush, holeBrush, SUBTRACTION);
        
        // Nettoyer l'ancien brush
        if (currentBrush.geometry !== geometry) {
          currentBrush.geometry.dispose();
        }
        
        holeGeometry.dispose();
        currentBrush = resultBrush;
      }
      
      // Extraire la géométrie finale
      const resultGeometry = currentBrush.geometry.clone();
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      currentBrush.geometry.dispose();
      
      return {
        success: true,
        geometry: resultGeometry
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to process batch holes: ${error}`
      };
    }
  }
  
  dispose(): void {
    // L'evaluator n'a pas besoin d'être disposé
  }
}