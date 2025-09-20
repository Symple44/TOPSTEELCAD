/**
 * Générateur de géométries pour tous les tubes (rectangulaires, carrés, circulaires)
 */

// Import direct de Three.js pour éviter les mocks
import * as THREE from 'three';
import { BufferGeometry } from '../../../lib/three-exports';
import { ProfileType } from '../../types/profile.types';
import type { ProfileDimensions } from '../../types/profile.types';
import { BaseProfileGenerator } from '../interfaces/ProfileGeometryGenerator';

export class TubeGenerator extends BaseProfileGenerator {
  
  constructor() {
    super([
      ProfileType.TUBE_RECTANGULAR,
      ProfileType.TUBE_SQUARE,
      ProfileType.TUBE_CIRCULAR,
      ProfileType.TUBE_RECT, // Alias for TUBE_RECTANGULAR
      ProfileType.TUBE_ROUND // Alias for TUBE_CIRCULAR
    ]);
  }

  getName(): string {
    return 'TubeGenerator';
  }

  generate(dimensions: ProfileDimensions, length: number): BufferGeometry {
    console.log('🔧 TubeGenerator.generate called with:', { dimensions, length });
    
    const { thickness } = dimensions;

    // Validation commune
    if (!thickness || thickness <= 0) {
      console.error('❌ TubeGenerator: Invalid thickness:', thickness);
      throw new Error(`Épaisseur manquante ou invalide pour tube: ${thickness}`);
    }

    if (length <= 0) {
      console.error('❌ TubeGenerator: Invalid length:', length);
      throw new Error(`Longueur invalide: ${length}`);
    }

    // Déterminer le type de profil pour générer la bonne géométrie
    const profileType = this.determineProfileType(dimensions);
    console.log('🎯 TubeGenerator: Determined profile type:', profileType);

    let geometry: BufferGeometry;
    
    switch (profileType) {
      case ProfileType.TUBE_CIRCULAR:
      case ProfileType.TUBE_ROUND: // Alias
        console.log('🔄 TubeGenerator: Generating circular tube');
        geometry = this.generateCircularTube(dimensions, length);
        break;
        
      case ProfileType.TUBE_RECTANGULAR:
      case ProfileType.TUBE_SQUARE:
      case ProfileType.TUBE_RECT: // Alias
        console.log('🔄 TubeGenerator: Generating rectangular tube');
        geometry = this.generateRectangularTube(dimensions, length);
        break;
        
      default:
        console.error('❌ TubeGenerator: Unsupported profile type:', profileType);
        throw new Error(`Type de tube non supporté: ${profileType}`);
    }
    
    console.log('✅ TubeGenerator: Generated geometry with:', {
      vertices: geometry?.attributes?.position?.count || 0,
      faces: geometry?.index?.count ? geometry.index.count / 3 : 0,
      hasPosition: !!geometry?.attributes?.position,
      hasIndex: !!geometry?.index,
      geometryType: geometry?.constructor?.name || 'unknown'
    });
    
    return geometry;
  }

  /**
   * Détermine le type de profil à partir des dimensions
   */
  private determineProfileType(dimensions: ProfileDimensions): ProfileType {
    if (dimensions.diameter || dimensions.outerDiameter) {
      return ProfileType.TUBE_CIRCULAR;
    }
    
    if (dimensions.height === dimensions.width) {
      return ProfileType.TUBE_SQUARE;
    }
    
    return ProfileType.TUBE_RECTANGULAR;
  }

  /**
   * Génère un tube circulaire (CHS) avec profile Shape et ExtrudeGeometry
   */
  private generateCircularTube(dimensions: ProfileDimensions, length: number): BufferGeometry {
    const outerDiameter = dimensions.outerDiameter || dimensions.diameter;
    const thickness = dimensions.thickness;

    if (!outerDiameter) {
      throw new Error('Diamètre externe manquant pour tube circulaire');
    }

    const outerRadius = outerDiameter / 2;
    const innerRadius = outerRadius - (thickness || 0);

    if (innerRadius <= 0 || !thickness) {
      throw new Error(`Épaisseur invalide (${thickness}) pour diamètre ${outerDiameter}`);
    }

    // Créer le profil 2D circulaire avec trou
    const profile = this.createCircularTubeProfile(outerRadius, innerRadius);

    // Extruder
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32
    };

    const geometry = new THREE.ExtrudeGeometry(profile, extrudeSettings);

    // Rotation pour avoir la longueur selon Z
    geometry.rotateX(Math.PI / 2);

    this.centerGeometry(geometry, length);

    return geometry;
  }

  /**
   * Crée le profil 2D d'un tube circulaire
   */
  private createCircularTubeProfile(outerRadius: number, innerRadius: number): THREE.Shape {
    // Cercle extérieur
    const outerShape = new THREE.Shape();
    outerShape.moveTo(outerRadius, 0);
    outerShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    
    // Cercle intérieur (trou)
    const innerShape = new THREE.Shape();
    innerShape.moveTo(innerRadius, 0);
    innerShape.absarc(0, 0, innerRadius, 0, Math.PI * 2, false);
    
    // Ajouter le trou
    outerShape.holes.push(innerShape);
    
    return outerShape;
  }

  /**
   * Génère un tube rectangulaire ou carré (RHS/SHS)
   */
  private generateRectangularTube(dimensions: ProfileDimensions, length: number): BufferGeometry {
    console.log('🏗️ TubeGenerator.generateRectangularTube called with:', { dimensions, length });
    
    const { height, width, thickness, outerRadius = 0 } = dimensions;
    console.log('📏 Tube dimensions extracted:', { height, width, thickness, outerRadius });

    if (!height || !width) {
      console.error('❌ TubeGenerator: Missing dimensions:', { height, width });
      throw new Error('Hauteur et largeur manquantes pour tube rectangulaire');
    }

    // Créer le profil 2D
    console.log('🎨 Creating rectangular tube profile...');
    const profile = this.createRectangularTubeProfile({
      height,
      width,
      thickness: thickness || 5, // Valeur par défaut si undefined
      outerRadius
    });
    console.log('✅ Profile created:', profile);

    // Extruder
    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: outerRadius > 0 ? 8 : 1
    };
    console.log('⚙️ Extrude settings:', extrudeSettings);

    console.log('🔨 Creating ExtrudeGeometry...');
    console.log('🔍 Profile validation before ExtrudeGeometry:');
    console.log('  - Profile type:', profile?.constructor?.name || 'unknown');
    console.log('  - Profile holes:', profile?.holes?.length || 0);
    console.log('  - Profile is Shape:', profile instanceof THREE.Shape);
    
    const geometry = new THREE.ExtrudeGeometry(profile, extrudeSettings);
    
    console.log('📊 Raw ExtrudeGeometry created:', {
      vertices: geometry?.attributes?.position?.count || 0,
      faces: geometry?.index?.count ? geometry.index.count / 3 : 0,
      hasPosition: !!geometry?.attributes?.position,
      hasIndex: !!geometry?.index,
      type: geometry?.constructor?.name || 'unknown'
    });
    
    // Log détaillé des attributs
    if (geometry.attributes?.position) {
      console.log('📍 Position details:', {
        itemSize: geometry.attributes.position.itemSize,
        count: geometry.attributes.position.count,
        arrayType: geometry.attributes.position.array?.constructor?.name || 'unknown'
      });
      
      // Afficher quelques vertices pour debug si count > 3
      if (geometry.attributes.position.count > 3) {
        console.log('🔍 First few vertices:');
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < Math.min(6, positions.length / 3); i++) {
          const x = positions[i * 3];
          const y = positions[i * 3 + 1]; 
          const z = positions[i * 3 + 2];
          console.log(`  Vertex ${i}: (${x?.toFixed(2) || 'N/A'}, ${y?.toFixed(2) || 'N/A'}, ${z?.toFixed(2) || 'N/A'})`);
        }
      } else {
        console.warn('⚠️ Only 3 vertices detected - this is the problem!');
      }
    } else {
      console.error('❌ No position attribute found in geometry!');
    }

    // GARDONS L'ORIENTATION ORIGINALE SUR L'AXE Z
    // ExtrudeGeometry extrude le long de l'axe Z par défaut - c'est ce qu'on veut
    console.log('📍 Keeping geometry on Z-axis (original orientation)');
    
    // Centrer la géométrie si nécessaire
    this.centerGeometry(geometry, length);
    console.log('📊 Centered geometry:', {
      vertices: geometry?.attributes?.position?.count || 0,
      faces: geometry?.index?.count ? geometry.index.count / 3 : 0
    });

    return geometry;
  }

  /**
   * Crée le profil 2D d'un tube rectangulaire
   */
  private createRectangularTubeProfile(params: {
    height: number;
    width: number;
    thickness: number;
    outerRadius: number;
  }): THREE.Shape {
    console.log('🎨 createRectangularTubeProfile called with:', params);
    
    const { height, width, thickness, outerRadius } = params;
    
    const h = height;
    const w = width;
    const t = thickness;
    const r = outerRadius;
    
    console.log('📐 Profile parameters:', { h, w, t, r });
    
    // Contour extérieur
    console.log('🔲 Creating outer shape...');
    const outerShape = new THREE.Shape();
    console.log('🔍 Outer shape created:', {
      type: outerShape?.constructor?.name || 'unknown',
      isShape: outerShape instanceof THREE.Shape,
      hasMoveTo: typeof outerShape?.moveTo === 'function',
      hasLineTo: typeof outerShape?.lineTo === 'function'
    });
    
    if (r > 0) {
      // Avec rayons arrondis
      outerShape.moveTo(-w/2 + r, -h/2);
      outerShape.lineTo(w/2 - r, -h/2);
      outerShape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
      outerShape.lineTo(w/2, h/2 - r);
      outerShape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
      outerShape.lineTo(-w/2 + r, h/2);
      outerShape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
      outerShape.lineTo(-w/2, -h/2 + r);
      outerShape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
    } else {
      // Sans rayons
      outerShape.moveTo(-w/2, -h/2);
      outerShape.lineTo(w/2, -h/2);
      outerShape.lineTo(w/2, h/2);
      outerShape.lineTo(-w/2, h/2);
      outerShape.lineTo(-w/2, -h/2);
    }
    
    // Contour intérieur (trou)
    const innerShape = new THREE.Shape();
    const innerW = w - 2 * t;
    const innerH = h - 2 * t;
    const innerR = Math.max(0, r - t);
    
    if (innerW > 0 && innerH > 0) {
      if (innerR > 0) {
        // Avec rayons arrondis intérieurs
        innerShape.moveTo(-innerW/2 + innerR, -innerH/2);
        innerShape.lineTo(innerW/2 - innerR, -innerH/2);
        innerShape.quadraticCurveTo(innerW/2, -innerH/2, innerW/2, -innerH/2 + innerR);
        innerShape.lineTo(innerW/2, innerH/2 - innerR);
        innerShape.quadraticCurveTo(innerW/2, innerH/2, innerW/2 - innerR, innerH/2);
        innerShape.lineTo(-innerW/2 + innerR, innerH/2);
        innerShape.quadraticCurveTo(-innerW/2, innerH/2, -innerW/2, innerH/2 - innerR);
        innerShape.lineTo(-innerW/2, -innerH/2 + innerR);
        innerShape.quadraticCurveTo(-innerW/2, -innerH/2, -innerW/2 + innerR, -innerH/2);
      } else {
        // Sans rayons intérieurs
        innerShape.moveTo(-innerW/2, -innerH/2);
        innerShape.lineTo(innerW/2, -innerH/2);
        innerShape.lineTo(innerW/2, innerH/2);
        innerShape.lineTo(-innerW/2, innerH/2);
        innerShape.lineTo(-innerW/2, -innerH/2);
      }
      
      // Ajouter le trou au profil
      console.log('🕳️ Adding inner hole to outer shape');
      outerShape.holes.push(innerShape);
    }
    
    console.log('✅ Rectangular tube profile completed:', {
      hasShape: !!outerShape,
      holes: outerShape.holes.length
    });
    
    return outerShape;
  }
}