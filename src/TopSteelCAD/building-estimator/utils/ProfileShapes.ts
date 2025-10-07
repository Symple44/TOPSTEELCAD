/**
 * Génération de shapes 2D pour les profils métalliques
 * Building Estimator - TopSteelCAD
 */

import * as THREE from 'three';

/**
 * Dimensions simplifiées des profils (hauteur, largeur, épaisseur âme, épaisseur semelle)
 */
const PROFILE_DATA: Record<string, [number, number, number, number]> = {
  // IPE
  'IPE 80': [80, 46, 3.8, 5.2],
  'IPE 100': [100, 55, 4.1, 5.7],
  'IPE 120': [120, 64, 4.4, 6.3],
  'IPE 140': [140, 73, 4.7, 6.9],
  'IPE 160': [160, 82, 5.0, 7.4],
  'IPE 180': [180, 91, 5.3, 8.0],
  'IPE 200': [200, 100, 5.6, 8.5],
  'IPE 220': [220, 110, 5.9, 9.2],
  'IPE 240': [240, 120, 6.2, 9.8],
  'IPE 270': [270, 135, 6.6, 10.2],
  'IPE 300': [300, 150, 7.1, 10.7],
  'IPE 330': [330, 160, 7.5, 11.5],
  'IPE 360': [360, 170, 8.0, 12.7],
  'IPE 400': [400, 180, 8.6, 13.5],
  'IPE 450': [450, 190, 9.4, 14.6],
  'IPE 500': [500, 200, 10.2, 16.0],
  'IPE 550': [550, 210, 11.1, 17.2],
  'IPE 600': [600, 220, 12.0, 19.0],

  // HEA
  'HEA 100': [96, 100, 5.0, 8.0],
  'HEA 120': [114, 120, 5.0, 8.0],
  'HEA 140': [133, 140, 5.5, 8.5],
  'HEA 160': [152, 160, 6.0, 9.0],
  'HEA 180': [171, 180, 6.0, 9.5],
  'HEA 200': [190, 200, 6.5, 10.0],
  'HEA 220': [210, 220, 7.0, 11.0],
  'HEA 240': [230, 240, 7.5, 12.0],
  'HEA 260': [250, 260, 7.5, 12.5],
  'HEA 280': [270, 280, 8.0, 13.0],
  'HEA 300': [290, 300, 8.5, 14.0],

  // HEB
  'HEB 100': [100, 100, 6.0, 10.0],
  'HEB 120': [120, 120, 6.5, 11.0],
  'HEB 140': [140, 140, 7.0, 12.0],
  'HEB 160': [160, 160, 8.0, 13.0],
  'HEB 180': [180, 180, 8.5, 14.0],
  'HEB 200': [200, 200, 9.0, 15.0],
  'HEB 220': [220, 220, 9.5, 16.0],
  'HEB 240': [240, 240, 10.0, 17.0],
  'HEB 260': [260, 260, 10.0, 17.5],
  'HEB 280': [280, 280, 10.5, 18.0],
  'HEB 300': [300, 300, 11.0, 19.0],

  // UAP
  'UAP 65': [65, 42, 5.5, 7.5],
  'UAP 80': [80, 50, 6.0, 8.0],
  'UAP 100': [100, 55, 6.0, 8.5],
  'UAP 120': [120, 60, 7.0, 9.0],
  'UAP 150': [150, 75, 7.0, 10.0],

  // UPN
  'UPN 80': [80, 45, 6.0, 8.0],
  'UPN 100': [100, 50, 6.0, 8.5],
  'UPN 120': [120, 55, 7.0, 9.0],
  'UPN 140': [140, 60, 7.0, 10.0],
  'UPN 160': [160, 65, 7.5, 10.5],
  'UPN 180': [180, 70, 8.0, 11.0],
  'UPN 200': [200, 75, 8.5, 11.5],
};

/**
 * Crée une shape 2D pour un profil I (IPE, HEA, HEB)
 */
export function createIProfileShape(
  height: number,
  width: number,
  webThickness: number,
  flangeThickness: number
): THREE.Shape {
  const shape = new THREE.Shape();

  const h = height;
  const w = width;
  const tw = webThickness;
  const tf = flangeThickness;

  // Centrer le profil sur l'origine
  const x0 = -w / 2;
  const y0 = -h / 2;

  // Tracer le contour (sens horaire pour face)
  // Semelle inférieure
  shape.moveTo(x0, y0);
  shape.lineTo(x0 + w, y0);
  shape.lineTo(x0 + w, y0 + tf);

  // Côté droit de l'âme
  const webLeft = x0 + (w - tw) / 2;
  const webRight = x0 + (w + tw) / 2;
  shape.lineTo(webRight, y0 + tf);
  shape.lineTo(webRight, y0 + h - tf);

  // Semelle supérieure
  shape.lineTo(x0 + w, y0 + h - tf);
  shape.lineTo(x0 + w, y0 + h);
  shape.lineTo(x0, y0 + h);
  shape.lineTo(x0, y0 + h - tf);

  // Côté gauche de l'âme
  shape.lineTo(webLeft, y0 + h - tf);
  shape.lineTo(webLeft, y0 + tf);
  shape.lineTo(x0, y0 + tf);
  shape.lineTo(x0, y0);

  return shape;
}

/**
 * Crée une shape 2D pour un profil U (UAP, UPN)
 */
export function createUProfileShape(
  height: number,
  width: number,
  webThickness: number,
  flangeThickness: number
): THREE.Shape {
  const shape = new THREE.Shape();

  const h = height;
  const w = width;
  const tw = webThickness;
  const tf = flangeThickness;

  // Centrer le profil sur l'origine
  const x0 = -w / 2;
  const y0 = -h / 2;

  // Tracer le contour (forme U)
  // Semelle gauche
  shape.moveTo(x0, y0);
  shape.lineTo(x0 + tf, y0);
  shape.lineTo(x0 + tf, y0 + h - tw);

  // Base du U
  shape.lineTo(x0 + w - tf, y0 + h - tw);

  // Semelle droite
  shape.lineTo(x0 + w - tf, y0);
  shape.lineTo(x0 + w, y0);
  shape.lineTo(x0 + w, y0 + h);

  // Haut du U
  shape.lineTo(x0, y0 + h);
  shape.lineTo(x0, y0);

  return shape;
}

/**
 * Crée une shape 2D pour un profil à partir de son nom
 */
export function createProfileShape(profileName: string): THREE.Shape {
  const data = PROFILE_DATA[profileName];

  if (!data) {
    // Profil par défaut (rectangle simple)
    return new THREE.Shape()
      .moveTo(-50, -100)
      .lineTo(50, -100)
      .lineTo(50, 100)
      .lineTo(-50, 100)
      .lineTo(-50, -100);
  }

  const [height, width, webThickness, flangeThickness] = data;

  // Déterminer le type de profil
  if (profileName.startsWith('IPE') || profileName.startsWith('HEA') || profileName.startsWith('HEB')) {
    return createIProfileShape(height, width, webThickness, flangeThickness);
  } else if (profileName.startsWith('UAP') || profileName.startsWith('UPN')) {
    return createUProfileShape(height, width, webThickness, flangeThickness);
  } else {
    // Par défaut: profil I
    return createIProfileShape(height, width, webThickness, flangeThickness);
  }
}

/**
 * Crée un mesh 3D pour un élément structurel
 */
export function createProfileMesh(
  profileName: string,
  length: number,
  color: number = 0x2563eb,
  opacity: number = 0.8
): THREE.Mesh {
  const shape = createProfileShape(profileName);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: length,
    bevelEnabled: false,
    steps: 1
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.6,
    roughness: 0.4,
    transparent: opacity < 1,
    opacity: opacity,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  console.log(`[createProfileMesh] Profil=${profileName}, length=${length}, color=${color.toString(16)}`);

  // Après rotation de -π/2 autour de X, le mesh ira de Y=0 à Y=length
  // Mais l'extrusion commence à Z=0, donc pas besoin d'ajustement

  return mesh;
}

/**
 * Obtient les dimensions d'un profil
 */
export function getProfileDimensions(profileName: string): { height: number; width: number } | null {
  const data = PROFILE_DATA[profileName];
  if (!data) return null;

  return {
    height: data[0],
    width: data[1]
  };
}
