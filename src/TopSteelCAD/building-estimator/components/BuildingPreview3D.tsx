/**
 * Preview 3D simple du bâtiment
 * Building Estimator - TopSteelCAD
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BuildingType, BuildingDimensions, BuildingParameters, BuildingExtension, ExtensionAttachmentType } from '../types';
import { createProfileMesh } from '../utils/ProfileShapes';

interface BuildingPreview3DProps {
  buildingType: BuildingType;
  dimensions: BuildingDimensions | any;
  parameters?: BuildingParameters;
  extensions?: BuildingExtension[];
  width?: number;
  height?: number;
}

/**
 * Créer un marqueur au sol moderne avec texte pour les labels de portiques
 */
function createGroundMarker(text: string, color: number, size: number = 500, isDark: boolean = false): THREE.Group {
  const markerGroup = new THREE.Group();

  // Créer le canvas pour le texte
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context not available');

  canvas.width = 1024;
  canvas.height = 1024;

  const centerX = 512;
  const centerY = 512;
  const radius = 480;

  // Dégradé radial pour le fond
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  if (isDark) {
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.95)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    gradient.addColorStop(1, 'rgba(248, 250, 252, 0.95)');
  }

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  // Bordure extérieure colorée (double)
  const colorHex = `#${color.toString(16).padStart(6, '0')}`;

  // Bordure externe
  context.strokeStyle = colorHex;
  context.lineWidth = 20;
  context.beginPath();
  context.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
  context.stroke();

  // Bordure interne (plus fine)
  context.strokeStyle = colorHex;
  context.lineWidth = 8;
  context.globalAlpha = 0.5;
  context.beginPath();
  context.arc(centerX, centerY, radius - 60, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1.0;

  // Texte principal (grand)
  context.font = 'bold 350px "Segoe UI", Arial, sans-serif';
  context.fillStyle = colorHex;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, centerX, centerY);

  // Ombre portée pour le texte (pour meilleure lisibilité)
  context.save();
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)';
  context.font = 'bold 350px "Segoe UI", Arial, sans-serif';
  context.fillText(text, centerX + 8, centerY + 8);
  context.restore();

  // Créer la texture et le matériau
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  // Disque au sol
  const circleGeometry = new THREE.CircleGeometry(size / 2, 64);
  const circleMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.rotation.x = -Math.PI / 2; // Poser à plat au sol
  circle.position.y = 3; // Légèrement au-dessus du sol pour éviter le z-fighting

  markerGroup.add(circle);
  return markerGroup;
}

/**
 * Fonction réutilisable pour construire un bâtiment complet (principal ou extension)
 */
function createBuildingStructure(
  buildingType: BuildingType,
  dimensions: BuildingDimensions | any,
  parameters: BuildingParameters | undefined,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  color: number = 0x1e40af, // Bleu par défaut
  reversedSlope: boolean = false, // Inverser la pente
  isDarkTheme: boolean = false // Thème sombre pour les marqueurs
): THREE.Group {
  const buildingGroup = new THREE.Group();
  buildingGroup.position.set(position.x, position.y, position.z);

  // Matériaux
  const wireMaterial = new THREE.LineBasicMaterial({
    color,
    linewidth: 2,
    depthWrite: true,
    depthTest: true
  });
  const faceMaterial = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.15,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });

  // Base du bâtiment (sol)
  const baseGeometry = new THREE.BufferGeometry();
  const baseVertices = new Float32Array([
    0, 0, 0,
    dimensions.length, 0, 0,
    dimensions.length, 0, dimensions.width,
    0, 0, dimensions.width,
    0, 0, 0
  ]);
  baseGeometry.setAttribute('position', new THREE.BufferAttribute(baseVertices, 3));
  buildingGroup.add(new THREE.Line(baseGeometry, wireMaterial));

  if (!parameters) return buildingGroup;

  // Calculer les positions des portiques selon le mode (standard ou personnalisé)
  const portalPositions: Array<{ x: number; frontYOffset: number; backYOffset: number }> = [];

  if (parameters.customSpacingMode && parameters.customBays && parameters.customBays.length > 0 && parameters.customPortals) {
    // Mode personnalisé: utiliser les travées et portiques définis
    let currentX = 0;

    // Pour chaque travée, calculer la position X et récupérer les yOffsets des 2 poteaux
    for (let i = 0; i < parameters.customBays.length; i++) {
      const bay = parameters.customBays[i];
      const portal = parameters.customPortals[i];

      // Ajouter le portique de départ de la travée
      if (i === 0) {
        portalPositions.push({
          x: currentX,
          frontYOffset: portal?.frontPostYOffset || 0,
          backYOffset: portal?.backPostYOffset || 0
        });
      }

      // Calculer la position du portique de fin
      currentX += bay.spacing;
      const nextPortal = parameters.customPortals[i + 1];
      portalPositions.push({
        x: currentX,
        frontYOffset: nextPortal?.frontPostYOffset || 0,
        backYOffset: nextPortal?.backPostYOffset || 0
      });
    }

    console.log(`[createBuildingStructure] Mode PERSONNALISÉ - ${portalPositions.length} portiques, ${parameters.customBays.length} travées`);
  } else {
    // Mode standard: entraxe uniforme
    const postSpacing = parameters.postSpacing || 5000;
    const numberOfBays = Math.max(1, Math.ceil(dimensions.length / postSpacing));

    for (let i = 0; i <= numberOfBays; i++) {
      const xPos = Math.min(i * postSpacing, dimensions.length);
      portalPositions.push({ x: xPos, frontYOffset: 0, backYOffset: 0 });
    }

    console.log(`[createBuildingStructure] Mode STANDARD - ${portalPositions.length} portiques, ${numberOfBays} travées, entraxe=${postSpacing}mm`);
  }

  // Calculer hauteurs selon type de bâtiment
  let frontPostHeight = dimensions.heightWall;
  let backPostHeight = dimensions.heightWall;
  let ridgeHeight = dimensions.heightWall; // Pour bipente

  if (buildingType === BuildingType.MONO_PENTE) {
    const rise = (dimensions.width * dimensions.slope) / 100;
    if (reversedSlope) {
      // Pente inversée: haut à l'avant (côté bâtiment), bas à l'arrière (côté extérieur)
      frontPostHeight = dimensions.heightWall + rise; // Côté haut
      backPostHeight = dimensions.heightWall;         // Côté bas
    } else {
      // Pente normale: bas à l'avant, haut à l'arrière
      frontPostHeight = dimensions.heightWall;       // Côté bas
      backPostHeight = dimensions.heightWall + rise; // Côté haut
    }
  } else if (buildingType === BuildingType.AUVENT) {
    const backHeight = dimensions.backHeight || dimensions.heightWall;
    const rise = backHeight - dimensions.heightWall;
    if (reversedSlope) {
      // Pente inversée
      frontPostHeight = dimensions.heightWall;         // Côté bas
      backPostHeight = dimensions.heightWall + rise;   // Côté haut
    } else {
      // Pente normale
      frontPostHeight = dimensions.heightWall + rise; // Côté haut (avant, ouvert)
      backPostHeight = dimensions.heightWall;         // Côté bas (arrière)
    }
  } else if (buildingType === BuildingType.BI_PENTE) {
    const rise = (dimensions.width / 2 * dimensions.slope) / 100;
    frontPostHeight = dimensions.heightWall;      // Poteaux aux deux extrémités
    backPostHeight = dimensions.heightWall;       // Poteaux aux deux extrémités
    ridgeHeight = dimensions.heightWall + rise;   // Hauteur au faîtage (pas de poteau)
  } else if (buildingType === BuildingType.BI_PENTE_ASYM) {
    // Bipente asymétrique: hauteurs de poteaux différentes
    const leftWallHeight = dimensions.leftWallHeight || dimensions.heightWall;
    const rightWallHeight = dimensions.rightWallHeight || dimensions.heightWall;
    const leftSlope = dimensions.leftSlope || dimensions.slope || 10;
    const rightSlope = dimensions.rightSlope || dimensions.slope || 10;
    const ridgeOffsetPercent = dimensions.ridgeOffset || 50; // Position du faîtage en % de la largeur

    frontPostHeight = leftWallHeight;      // Poteau gauche
    backPostHeight = rightWallHeight;      // Poteau droit

    // Calculer la position du faîtage en mm
    const ridgePosition = (dimensions.width * ridgeOffsetPercent) / 100;

    // Calculer la hauteur au faîtage selon les deux pentes
    const leftRise = (ridgePosition * leftSlope) / 100;
    const rightRise = ((dimensions.width - ridgePosition) * rightSlope) / 100;
    ridgeHeight = Math.max(leftWallHeight + leftRise, rightWallHeight + rightRise);
  } else if (buildingType === BuildingType.PLANCHER) {
    // Plancher: structure plane, tous les poteaux à la même hauteur
    frontPostHeight = dimensions.heightWall;
    backPostHeight = dimensions.heightWall;
    ridgeHeight = dimensions.heightWall; // Pas de pente
  }

  // Créer les portiques selon les positions calculées
  console.log(`[createBuildingStructure] Type=${buildingType}, Création de ${portalPositions.length} portiques`);

  for (let i = 0; i < portalPositions.length; i++) {
    const { x: xPos, frontYOffset, backYOffset } = portalPositions[i];

    // Pour l'auvent : seulement poteaux à l'avant (côté bas), pas à l'arrière (côté haut)
    // Pour le bipente : poteaux aux deux extrémités (pas au milieu/faîtage)
    if (buildingType === BuildingType.AUVENT) {
      // Auvent : seulement poteaux à l'avant (côté ouvert = haut)
      // Ajuster la longueur du poteau pour qu'il arrive à la hauteur nominale
      const adjustedFrontHeight = frontPostHeight - frontYOffset;
      console.log(`  [Portique ${i}] AUVENT - Création frontPost à (${xPos}, ${frontYOffset}, 0) longueur=${adjustedFrontHeight}`);
      const frontPost = createProfileMesh(parameters.postProfile, adjustedFrontHeight, color, 0.7);
      frontPost.rotation.x = -Math.PI / 2;
      frontPost.position.set(xPos, frontYOffset, 0);
      buildingGroup.add(frontPost);
    } else if (buildingType === BuildingType.BI_PENTE || buildingType === BuildingType.BI_PENTE_ASYM) {
      // Bipente (symétrique ou asymétrique) : poteaux des deux côtés
      const adjustedFrontHeight = frontPostHeight - frontYOffset;
      const adjustedBackHeight = backPostHeight - backYOffset;

      console.log(`  [Portique ${i}] BIPENTE - Création frontPost à (${xPos}, ${frontYOffset}, 0) longueur=${adjustedFrontHeight}`);
      const frontPost = createProfileMesh(parameters.postProfile, adjustedFrontHeight, color, 0.7);
      frontPost.rotation.x = -Math.PI / 2;
      frontPost.position.set(xPos, frontYOffset, 0);
      buildingGroup.add(frontPost);

      console.log(`  [Portique ${i}] BIPENTE - Création backPost à (${xPos}, ${backYOffset}, ${dimensions.width}) longueur=${adjustedBackHeight}`);
      const backPost = createProfileMesh(parameters.postProfile, adjustedBackHeight, color, 0.7);
      backPost.rotation.x = -Math.PI / 2;
      backPost.position.set(xPos, backYOffset, dimensions.width);
      buildingGroup.add(backPost);
    } else if (buildingType === BuildingType.PLANCHER) {
      // Plancher : poteaux aux deux extrémités + poteaux intermédiaires
      const adjustedFrontHeight = frontPostHeight - frontYOffset;
      const adjustedBackHeight = backPostHeight - backYOffset;

      // Poteau avant
      console.log(`  [Portique ${i}] PLANCHER - frontPost à (${xPos}, ${frontYOffset}, 0) longueur=${adjustedFrontHeight}`);
      const frontPost = createProfileMesh(parameters.postProfile, adjustedFrontHeight, color, 0.7);
      frontPost.rotation.x = -Math.PI / 2;
      frontPost.position.set(xPos, frontYOffset, 0);
      buildingGroup.add(frontPost);

      // Poteau arrière
      console.log(`  [Portique ${i}] PLANCHER - backPost à (${xPos}, ${backYOffset}, ${dimensions.width}) longueur=${adjustedBackHeight}`);
      const backPost = createProfileMesh(parameters.postProfile, adjustedBackHeight, color, 0.7);
      backPost.rotation.x = -Math.PI / 2;
      backPost.position.set(xPos, backYOffset, dimensions.width);
      buildingGroup.add(backPost);

      // Poteaux intermédiaires
      const intermediatePostsCount = parameters?.intermediatePostsCount || 0;
      if (intermediatePostsCount > 0) {
        const spacing = dimensions.width / (intermediatePostsCount + 1);
        for (let j = 1; j <= intermediatePostsCount; j++) {
          const zPos = j * spacing;
          console.log(`  [Portique ${i}] PLANCHER - intermediatePost ${j} à (${xPos}, 0, ${zPos}) longueur=${adjustedFrontHeight}`);
          const intermediatePost = createProfileMesh(parameters.postProfile, adjustedFrontHeight, color, 0.7);
          intermediatePost.rotation.x = -Math.PI / 2;
          intermediatePost.position.set(xPos, 0, zPos);
          buildingGroup.add(intermediatePost);
        }
      }
    } else {
      // Monopente : poteaux des deux côtés, hauteurs différentes
      // Ajuster la longueur pour que le sommet arrive à la hauteur nominale
      const adjustedFrontHeight = frontPostHeight - frontYOffset;
      const adjustedBackHeight = backPostHeight - backYOffset;

      console.log(`  [Portique ${i}] MONOPENTE - frontPost à (${xPos}, ${frontYOffset}, 0) longueur=${adjustedFrontHeight}`);
      const frontPost = createProfileMesh(parameters.postProfile, adjustedFrontHeight, color, 0.7);

      // Rotation -π/2 pour que Z→Y (vers le haut), positionné à Y=frontYOffset
      frontPost.rotation.x = -Math.PI / 2;
      frontPost.position.set(xPos, frontYOffset, 0);
      buildingGroup.add(frontPost);

      console.log(`  [Portique ${i}] MONOPENTE - backPost à (${xPos}, ${backYOffset}, ${dimensions.width}) longueur=${adjustedBackHeight}`);
      const backPost = createProfileMesh(parameters.postProfile, adjustedBackHeight, color, 0.7);
      backPost.rotation.x = -Math.PI / 2;
      backPost.position.set(xPos, backYOffset, dimensions.width);
      buildingGroup.add(backPost);
    }

    // Arbalétriers selon type
    if (buildingType === BuildingType.MONO_PENTE) {
      // Un seul arbalétrier du bas vers le haut
      const rafterLength = Math.sqrt(
        Math.pow(dimensions.width, 2) +
        Math.pow(backPostHeight - frontPostHeight, 2)
      );
      const rafterAngle = Math.atan2(backPostHeight - frontPostHeight, dimensions.width);

      console.log(`    [Arbalétrier ${i}] MONOPENTE - length=${rafterLength.toFixed(0)}, angle=${(rafterAngle * 180 / Math.PI).toFixed(1)}°`);

      const rafter = createProfileMesh(parameters.rafterProfile, rafterLength, color, 0.7);

      // Rotation X uniquement pour incliner dans le plan YZ (largeur du bâtiment)
      // Angle inversé pour monter dans le bon sens
      rafter.rotation.set(-rafterAngle, 0, 0);

      // Position: hauteur de départ (sommet du poteau avant)
      rafter.position.set(xPos, frontPostHeight, 0);

      console.log(`    -> Position: (${xPos}, ${frontPostHeight}, 0), Rotation finale: (${rafter.rotation.x}, ${rafter.rotation.y}, ${rafter.rotation.z})`);

      buildingGroup.add(rafter);

    } else if (buildingType === BuildingType.BI_PENTE || buildingType === BuildingType.BI_PENTE_ASYM) {
      // Calculer la position du faîtage
      let ridgeZ: number;
      if (buildingType === BuildingType.BI_PENTE_ASYM) {
        const ridgeOffsetPercent = dimensions.ridgeOffset || 50;
        ridgeZ = (dimensions.width * ridgeOffsetPercent) / 100;
      } else {
        ridgeZ = dimensions.width / 2; // Centré pour bipente symétrique
      }

      // Arbalétrier avant (bas vers faîtage)
      const frontRafterLength = Math.sqrt(
        Math.pow(ridgeZ, 2) + Math.pow(ridgeHeight - frontPostHeight, 2)
      );
      const frontRafterAngle = Math.atan2(ridgeHeight - frontPostHeight, ridgeZ);

      console.log(`    [Arbalétrier ${i}] BIPENTE-AVANT - length=${frontRafterLength.toFixed(0)}, angle=${(frontRafterAngle * 180 / Math.PI).toFixed(1)}°`);

      const frontRafter = createProfileMesh(parameters.rafterProfile, frontRafterLength, color, 0.7);
      frontRafter.rotation.set(-frontRafterAngle, 0, 0);
      frontRafter.position.set(xPos, frontPostHeight, 0);

      console.log(`    -> Position: (${xPos}, ${frontPostHeight}, 0)`);

      buildingGroup.add(frontRafter);

      // Arbalétrier arrière (faîtage vers bas)
      const backSpan = dimensions.width - ridgeZ;
      const backRafterLength = Math.sqrt(
        Math.pow(backSpan, 2) + Math.pow(ridgeHeight - backPostHeight, 2)
      );
      const backRafterAngle = Math.atan2(ridgeHeight - backPostHeight, backSpan);

      console.log(`    [Arbalétrier ${i}] BIPENTE-ARRIERE - length=${backRafterLength.toFixed(0)}, angle=${(-backRafterAngle * 180 / Math.PI).toFixed(1)}°`);

      const backRafter = createProfileMesh(parameters.rafterProfile, backRafterLength, color, 0.7);
      backRafter.rotation.set(backRafterAngle, 0, 0);
      backRafter.position.set(xPos, ridgeHeight, ridgeZ);

      console.log(`    -> Position: (${xPos}, ${ridgeHeight}, ${ridgeZ})`);

      buildingGroup.add(backRafter);

    } else if (buildingType === BuildingType.PLANCHER) {
      // Plancher: poutres horizontales (pas d'arbalétriers inclinés)
      const rafterLength = dimensions.width;

      console.log(`    [Poutre ${i}] PLANCHER - length=${rafterLength}`);

      const rafter = createProfileMesh(parameters.rafterProfile, rafterLength, color, 0.7);
      rafter.rotation.set(0, 0, 0); // Horizontal
      rafter.position.set(xPos, frontPostHeight, 0);

      buildingGroup.add(rafter);

    } else if (buildingType === BuildingType.AUVENT) {
      const rafterLength = Math.sqrt(
        Math.pow(dimensions.width, 2) +
        Math.pow(frontPostHeight - backPostHeight, 2)
      );
      const rafterAngle = Math.atan2(backPostHeight - frontPostHeight, dimensions.width);
      const rafter = createProfileMesh(parameters.rafterProfile, rafterLength, color, 0.7);
      rafter.rotation.set(-rafterAngle, 0, 0);
      rafter.position.set(xPos, frontPostHeight, 0);
      buildingGroup.add(rafter);
    }
  }

  // Quadrillage au sol et labels des portiques
  const gridColor = color === 0x1e40af ? 0x3b82f6 : color; // Couleur du quadrillage (légèrement plus claire)
  const markerColor = color === 0x1e40af ? 0x1e40af : color;

  for (let i = 0; i < portalPositions.length; i++) {
    const { x: xPos } = portalPositions[i];

    // Ligne au sol uniquement (de Z=0 à Z=width)
    const gridLineGeometry = new THREE.BufferGeometry();
    const gridLineVertices = new Float32Array([
      xPos, 0, 0,
      xPos, 0, dimensions.width
    ]);
    gridLineGeometry.setAttribute('position', new THREE.BufferAttribute(gridLineVertices, 3));
    const gridLineMaterial = new THREE.LineBasicMaterial({
      color: gridColor,
      opacity: 0.5,
      transparent: true,
      linewidth: 2,
      depthWrite: false
    });
    buildingGroup.add(new THREE.Line(gridLineGeometry, gridLineMaterial));

    // Disque au sol avec numéro du portique
    const marker = createGroundMarker(`P${i}`, markerColor, 500, isDarkTheme);
    marker.position.set(xPos, 0, -700); // Au sol, devant le bâtiment
    buildingGroup.add(marker);
  }

  // Pannes (si configurées)
  const purlinSpacing = parameters.purlinSpacing || 1500;
  const numPurlins = Math.floor(dimensions.width / purlinSpacing);

  // Fonction pour calculer la hauteur d'une panne à une position Z donnée
  const calculatePurlinHeight = (zPos: number, baseYOffset: number = 0): number => {
    let baseHeight: number;

    if (buildingType === BuildingType.BI_PENTE) {
      // Bipente: deux pentes avec faîtage au milieu
      const midZ = dimensions.width / 2;
      const rise = (dimensions.width / 2 * dimensions.slope) / 100;
      const ridgeHeight = dimensions.heightWall + rise;

      if (zPos < midZ) {
        // Versant avant: monte vers le faîtage
        baseHeight = dimensions.heightWall + (zPos / midZ) * rise;
      } else {
        // Versant arrière: descend du faîtage
        baseHeight = ridgeHeight - ((zPos - midZ) / midZ) * rise;
      }
    } else if (buildingType === BuildingType.BI_PENTE_ASYM) {
      // Bipente asymétrique: deux pentes avec faîtage décentré et hauteurs différentes
      const leftWallHeight = dimensions.leftWallHeight || dimensions.heightWall;
      const rightWallHeight = dimensions.rightWallHeight || dimensions.heightWall;
      const leftSlope = dimensions.leftSlope || dimensions.slope || 10;
      const rightSlope = dimensions.rightSlope || dimensions.slope || 10;
      const ridgeOffsetPercent = dimensions.ridgeOffset || 50;
      const ridgeZ = (dimensions.width * ridgeOffsetPercent) / 100;

      if (zPos < ridgeZ) {
        // Versant avant (gauche): monte vers le faîtage
        baseHeight = leftWallHeight + (zPos * leftSlope) / 100;
      } else {
        // Versant arrière (droit): descend du faîtage
        baseHeight = rightWallHeight + ((dimensions.width - zPos) * rightSlope) / 100;
      }
    } else {
      // Monopente ou Auvent: pente linéaire
      baseHeight = frontPostHeight + (zPos / dimensions.width) * (backPostHeight - frontPostHeight);
    }

    return baseHeight + baseYOffset;
  };

  for (let i = 1; i < numPurlins; i++) {
    const zPos = i * purlinSpacing;

    // Créer des segments de pannes entre chaque portique
    for (let p = 0; p < portalPositions.length - 1; p++) {
      const startPortal = portalPositions[p];
      const endPortal = portalPositions[p + 1];

      // Calculer la hauteur à chaque extrémité en tenant compte des yOffsets des portiques
      // Pour simplifier, on prend la moyenne des yOffsets front/back pour chaque portique
      const startYOffset = (startPortal.frontYOffset + startPortal.backYOffset) / 2;
      const endYOffset = (endPortal.frontYOffset + endPortal.backYOffset) / 2;

      const startHeight = calculatePurlinHeight(zPos, startYOffset);
      const endHeight = calculatePurlinHeight(zPos, endYOffset);

      const purlinGeometry = new THREE.BufferGeometry();
      const purlinVerts = new Float32Array([
        startPortal.x, startHeight, zPos,
        endPortal.x, endHeight, zPos
      ]);
      purlinGeometry.setAttribute('position', new THREE.BufferAttribute(purlinVerts, 3));
      buildingGroup.add(new THREE.Line(purlinGeometry, wireMaterial));
    }
  }

  // Couverture (faces transparentes)
  if (buildingType === BuildingType.MONO_PENTE) {
    const roofGeometry = new THREE.BufferGeometry();
    const roofVertices = new Float32Array([
      0, frontPostHeight, 0,
      dimensions.length, frontPostHeight, 0,
      dimensions.length, backPostHeight, dimensions.width,
      0, backPostHeight, dimensions.width
    ]);
    roofGeometry.setAttribute('position', new THREE.BufferAttribute(roofVertices, 3));
    roofGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    roofGeometry.computeVertexNormals();
    buildingGroup.add(new THREE.Mesh(roofGeometry, faceMaterial));

  } else if (buildingType === BuildingType.BI_PENTE || buildingType === BuildingType.BI_PENTE_ASYM) {
    // Calculer la position du faîtage
    let ridgeZ: number;
    if (buildingType === BuildingType.BI_PENTE_ASYM) {
      const ridgeOffsetPercent = dimensions.ridgeOffset || 50;
      ridgeZ = (dimensions.width * ridgeOffsetPercent) / 100;
    } else {
      ridgeZ = dimensions.width / 2; // Centré pour bipente symétrique
    }

    // Créer des segments de couverture entre chaque portique
    for (let p = 0; p < portalPositions.length - 1; p++) {
      const startPortal = portalPositions[p];
      const endPortal = portalPositions[p + 1];

      // Calculer les hauteurs aux 4 coins du segment
      const startFrontYOffset = startPortal.frontYOffset;
      const startBackYOffset = startPortal.backYOffset;
      const endFrontYOffset = endPortal.frontYOffset;
      const endBackYOffset = endPortal.backYOffset;

      const startFrontHeight = frontPostHeight + startFrontYOffset;
      const startBackHeight = backPostHeight + startBackYOffset;
      const endFrontHeight = frontPostHeight + endFrontYOffset;
      const endBackHeight = backPostHeight + endBackYOffset;

      // Calculer la hauteur au faîtage pour chaque extrémité du segment
      // La hauteur au faîtage doit suivre la pente définie
      const startRidgeHeight = ridgeHeight + ((startFrontYOffset + startBackYOffset) / 2);
      const endRidgeHeight = ridgeHeight + ((endFrontYOffset + endBackYOffset) / 2);

      // Versant avant (du bas vers le faîtage)
      const frontRoofGeometry = new THREE.BufferGeometry();
      const frontRoofVertices = new Float32Array([
        startPortal.x, startFrontHeight, 0,
        endPortal.x, endFrontHeight, 0,
        endPortal.x, endRidgeHeight, ridgeZ,
        startPortal.x, startRidgeHeight, ridgeZ
      ]);
      frontRoofGeometry.setAttribute('position', new THREE.BufferAttribute(frontRoofVertices, 3));
      frontRoofGeometry.setIndex([0, 1, 2, 0, 2, 3]);
      frontRoofGeometry.computeVertexNormals();
      buildingGroup.add(new THREE.Mesh(frontRoofGeometry, faceMaterial));

      // Versant arrière (du faîtage vers le bas)
      const backRoofGeometry = new THREE.BufferGeometry();
      const backRoofVertices = new Float32Array([
        startPortal.x, startRidgeHeight, ridgeZ,
        endPortal.x, endRidgeHeight, ridgeZ,
        endPortal.x, endBackHeight, dimensions.width,
        startPortal.x, startBackHeight, dimensions.width
      ]);
      backRoofGeometry.setAttribute('position', new THREE.BufferAttribute(backRoofVertices, 3));
      backRoofGeometry.setIndex([0, 1, 2, 0, 2, 3]);
      backRoofGeometry.computeVertexNormals();
      buildingGroup.add(new THREE.Mesh(backRoofGeometry, faceMaterial));
    }

  } else if (buildingType === BuildingType.AUVENT) {
    const roofGeometry = new THREE.BufferGeometry();
    const roofVertices = new Float32Array([
      0, frontPostHeight, 0,
      dimensions.length, frontPostHeight, 0,
      dimensions.length, backPostHeight, dimensions.width,
      0, backPostHeight, dimensions.width
    ]);
    roofGeometry.setAttribute('position', new THREE.BufferAttribute(roofVertices, 3));
    roofGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    roofGeometry.computeVertexNormals();
    buildingGroup.add(new THREE.Mesh(roofGeometry, faceMaterial));
  } else if (buildingType === BuildingType.PLANCHER) {
    // Plancher: face plane horizontale
    const roofGeometry = new THREE.BufferGeometry();
    const roofVertices = new Float32Array([
      0, frontPostHeight, 0,
      dimensions.length, frontPostHeight, 0,
      dimensions.length, frontPostHeight, dimensions.width,
      0, frontPostHeight, dimensions.width
    ]);
    roofGeometry.setAttribute('position', new THREE.BufferAttribute(roofVertices, 3));
    roofGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    roofGeometry.computeVertexNormals();
    buildingGroup.add(new THREE.Mesh(roofGeometry, faceMaterial));
  }

  // Acrotères (si activés)
  if (parameters?.acrotere?.enabled && (buildingType === BuildingType.MONO_PENTE || buildingType === BuildingType.BI_PENTE || buildingType === BuildingType.BI_PENTE_ASYM)) {
    const acrotereHeight = parameters.acrotere.height || 800;
    const acrotereMaterial = new THREE.LineBasicMaterial({ color: 0xdc2626, linewidth: 3 }); // Rouge
    const placement = parameters.acrotere.placement || 'contour';

    if (placement === 'contour') {
      // Contour complet : toutes les faces extérieures
      // Face avant (Z=0)
      const frontAcrotere = new THREE.BufferGeometry();
      const frontVerts = new Float32Array([
        0, frontPostHeight, 0,
        0, frontPostHeight + acrotereHeight, 0,
        dimensions.length, frontPostHeight, 0,
        dimensions.length, frontPostHeight + acrotereHeight, 0
      ]);
      frontAcrotere.setAttribute('position', new THREE.BufferAttribute(frontVerts, 3));
      frontAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
      buildingGroup.add(new THREE.LineSegments(frontAcrotere, acrotereMaterial));

      // Face arrière (Z=width)
      const backAcrotere = new THREE.BufferGeometry();
      const backVerts = new Float32Array([
        0, backPostHeight, dimensions.width,
        0, backPostHeight + acrotereHeight, dimensions.width,
        dimensions.length, backPostHeight, dimensions.width,
        dimensions.length, backPostHeight + acrotereHeight, dimensions.width
      ]);
      backAcrotere.setAttribute('position', new THREE.BufferAttribute(backVerts, 3));
      backAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
      buildingGroup.add(new THREE.LineSegments(backAcrotere, acrotereMaterial));

      // Face gauche (X=0)
      const leftAcrotere = new THREE.BufferGeometry();
      const leftVerts = new Float32Array([
        0, frontPostHeight, 0,
        0, frontPostHeight + acrotereHeight, 0,
        0, backPostHeight, dimensions.width,
        0, backPostHeight + acrotereHeight, dimensions.width
      ]);
      leftAcrotere.setAttribute('position', new THREE.BufferAttribute(leftVerts, 3));
      leftAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
      buildingGroup.add(new THREE.LineSegments(leftAcrotere, acrotereMaterial));

      // Face droite (X=length)
      const rightAcrotere = new THREE.BufferGeometry();
      const rightVerts = new Float32Array([
        dimensions.length, frontPostHeight, 0,
        dimensions.length, frontPostHeight + acrotereHeight, 0,
        dimensions.length, backPostHeight, dimensions.width,
        dimensions.length, backPostHeight + acrotereHeight, dimensions.width
      ]);
      rightAcrotere.setAttribute('position', new THREE.BufferAttribute(rightVerts, 3));
      rightAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
      buildingGroup.add(new THREE.LineSegments(rightAcrotere, acrotereMaterial));

    } else if (placement === 'specific' && parameters.acrotere.sides) {
      // Faces spécifiques
      const sides = parameters.acrotere.sides;

      if (sides.includes('front')) {
        const frontAcrotere = new THREE.BufferGeometry();
        const frontVerts = new Float32Array([
          0, frontPostHeight, 0,
          0, frontPostHeight + acrotereHeight, 0,
          dimensions.length, frontPostHeight, 0,
          dimensions.length, frontPostHeight + acrotereHeight, 0
        ]);
        frontAcrotere.setAttribute('position', new THREE.BufferAttribute(frontVerts, 3));
        frontAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
        buildingGroup.add(new THREE.LineSegments(frontAcrotere, acrotereMaterial));
      }

      if (sides.includes('back')) {
        const backAcrotere = new THREE.BufferGeometry();
        const backVerts = new Float32Array([
          0, backPostHeight, dimensions.width,
          0, backPostHeight + acrotereHeight, dimensions.width,
          dimensions.length, backPostHeight, dimensions.width,
          dimensions.length, backPostHeight + acrotereHeight, dimensions.width
        ]);
        backAcrotere.setAttribute('position', new THREE.BufferAttribute(backVerts, 3));
        backAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
        buildingGroup.add(new THREE.LineSegments(backAcrotere, acrotereMaterial));
      }

      if (sides.includes('left')) {
        const leftAcrotere = new THREE.BufferGeometry();
        const leftVerts = new Float32Array([
          0, frontPostHeight, 0,
          0, frontPostHeight + acrotereHeight, 0,
          0, backPostHeight, dimensions.width,
          0, backPostHeight + acrotereHeight, dimensions.width
        ]);
        leftAcrotere.setAttribute('position', new THREE.BufferAttribute(leftVerts, 3));
        leftAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
        buildingGroup.add(new THREE.LineSegments(leftAcrotere, acrotereMaterial));
      }

      if (sides.includes('right')) {
        const rightAcrotere = new THREE.BufferGeometry();
        const rightVerts = new Float32Array([
          dimensions.length, frontPostHeight, 0,
          dimensions.length, frontPostHeight + acrotereHeight, 0,
          dimensions.length, backPostHeight, dimensions.width,
          dimensions.length, backPostHeight + acrotereHeight, dimensions.width
        ]);
        rightAcrotere.setAttribute('position', new THREE.BufferAttribute(rightVerts, 3));
        rightAcrotere.setIndex([0, 1, 1, 3, 3, 2, 2, 0]);
        buildingGroup.add(new THREE.LineSegments(rightAcrotere, acrotereMaterial));
      }
    }
  }

  // Garde-corps (si activés)
  if (parameters?.guardrail?.enabled && parameters.guardrail.sides && parameters.guardrail.sides.length > 0) {
    const guardrailHeight = parameters.guardrail.height || 1100;
    const guardrailPostSpacing = parameters.guardrail.postSpacing || 1500;
    const numberOfRails = parameters.guardrail.numberOfRails || 3;
    const guardrailMaterial = new THREE.LineBasicMaterial({ color: 0x059669, linewidth: 2 }); // Vert

    parameters.guardrail.sides.forEach((side) => {
      if (side === 'front') {
        // Garde-corps avant (Z=0)
        const numPosts = Math.ceil(dimensions.length / guardrailPostSpacing) + 1;
        for (let i = 0; i < numPosts; i++) {
          const xPos = Math.min(i * guardrailPostSpacing, dimensions.length);
          // Poteau vertical
          const postGeometry = new THREE.BufferGeometry();
          const postVerts = new Float32Array([
            xPos, frontPostHeight, 0,
            xPos, frontPostHeight + guardrailHeight, 0
          ]);
          postGeometry.setAttribute('position', new THREE.BufferAttribute(postVerts, 3));
          buildingGroup.add(new THREE.Line(postGeometry, guardrailMaterial));
        }
        // Lisses horizontales
        for (let r = 1; r <= numberOfRails; r++) {
          const railHeight = frontPostHeight + (r * guardrailHeight / (numberOfRails + 1));
          const railGeometry = new THREE.BufferGeometry();
          const railVerts = new Float32Array([
            0, railHeight, 0,
            dimensions.length, railHeight, 0
          ]);
          railGeometry.setAttribute('position', new THREE.BufferAttribute(railVerts, 3));
          buildingGroup.add(new THREE.Line(railGeometry, guardrailMaterial));
        }
      }

      if (side === 'back') {
        // Garde-corps arrière (Z=width)
        const numPosts = Math.ceil(dimensions.length / guardrailPostSpacing) + 1;
        for (let i = 0; i < numPosts; i++) {
          const xPos = Math.min(i * guardrailPostSpacing, dimensions.length);
          // Poteau vertical
          const postGeometry = new THREE.BufferGeometry();
          const postVerts = new Float32Array([
            xPos, backPostHeight, dimensions.width,
            xPos, backPostHeight + guardrailHeight, dimensions.width
          ]);
          postGeometry.setAttribute('position', new THREE.BufferAttribute(postVerts, 3));
          buildingGroup.add(new THREE.Line(postGeometry, guardrailMaterial));
        }
        // Lisses horizontales
        for (let r = 1; r <= numberOfRails; r++) {
          const railHeight = backPostHeight + (r * guardrailHeight / (numberOfRails + 1));
          const railGeometry = new THREE.BufferGeometry();
          const railVerts = new Float32Array([
            0, railHeight, dimensions.width,
            dimensions.length, railHeight, dimensions.width
          ]);
          railGeometry.setAttribute('position', new THREE.BufferAttribute(railVerts, 3));
          buildingGroup.add(new THREE.Line(railGeometry, guardrailMaterial));
        }
      }

      if (side === 'left') {
        // Garde-corps gauche (X=0)
        const numPosts = Math.ceil(dimensions.width / guardrailPostSpacing) + 1;
        for (let i = 0; i < numPosts; i++) {
          const zPos = Math.min(i * guardrailPostSpacing, dimensions.width);
          const baseHeight = frontPostHeight + (zPos / dimensions.width) * (backPostHeight - frontPostHeight);
          // Poteau vertical
          const postGeometry = new THREE.BufferGeometry();
          const postVerts = new Float32Array([
            0, baseHeight, zPos,
            0, baseHeight + guardrailHeight, zPos
          ]);
          postGeometry.setAttribute('position', new THREE.BufferAttribute(postVerts, 3));
          buildingGroup.add(new THREE.Line(postGeometry, guardrailMaterial));
        }
        // Lisses horizontales (suivent la pente)
        for (let r = 1; r <= numberOfRails; r++) {
          const railOffset = r * guardrailHeight / (numberOfRails + 1);
          const railGeometry = new THREE.BufferGeometry();
          const railVerts = new Float32Array([
            0, frontPostHeight + railOffset, 0,
            0, backPostHeight + railOffset, dimensions.width
          ]);
          railGeometry.setAttribute('position', new THREE.BufferAttribute(railVerts, 3));
          buildingGroup.add(new THREE.Line(railGeometry, guardrailMaterial));
        }
      }

      if (side === 'right') {
        // Garde-corps droit (X=length)
        const numPosts = Math.ceil(dimensions.width / guardrailPostSpacing) + 1;
        for (let i = 0; i < numPosts; i++) {
          const zPos = Math.min(i * guardrailPostSpacing, dimensions.width);
          const baseHeight = frontPostHeight + (zPos / dimensions.width) * (backPostHeight - frontPostHeight);
          // Poteau vertical
          const postGeometry = new THREE.BufferGeometry();
          const postVerts = new Float32Array([
            dimensions.length, baseHeight, zPos,
            dimensions.length, baseHeight + guardrailHeight, zPos
          ]);
          postGeometry.setAttribute('position', new THREE.BufferAttribute(postVerts, 3));
          buildingGroup.add(new THREE.Line(postGeometry, guardrailMaterial));
        }
        // Lisses horizontales (suivent la pente)
        for (let r = 1; r <= numberOfRails; r++) {
          const railOffset = r * guardrailHeight / (numberOfRails + 1);
          const railGeometry = new THREE.BufferGeometry();
          const railVerts = new Float32Array([
            dimensions.length, frontPostHeight + railOffset, 0,
            dimensions.length, backPostHeight + railOffset, dimensions.width
          ]);
          railGeometry.setAttribute('position', new THREE.BufferAttribute(railVerts, 3));
          buildingGroup.add(new THREE.Line(railGeometry, guardrailMaterial));
        }
      }
    });
  }

  return buildingGroup;
}

export const BuildingPreview3D: React.FC<BuildingPreview3DProps> = ({
  buildingType,
  dimensions,
  parameters,
  extensions = [],
  width = 400,
  height = 300
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingMeshRef = useRef<THREE.Group | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialiser la scène 3D (une seule fois)
  useEffect(() => {
    if (!containerRef.current) return;

    // Scène
    const scene = new THREE.Scene();
    const bgColor = theme === 'dark' ? 0x1f2937 : 0xe6f2ff; // Bleu clair moderne pour light
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    // Caméra
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 100000);
    camera.position.set(
      dimensions.length * 1.5,
      dimensions.heightWall * 1.5,
      dimensions.width * 1.5
    );
    cameraRef.current = camera;

    // Renderer avec paramètres optimisés
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      logarithmicDepthBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false; // Désactiver les ombres pour de meilleures performances
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Contrôles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(dimensions.length / 2, dimensions.heightWall / 2, dimensions.width / 2);
    controlsRef.current = controls;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === 'dark' ? 0.6 : 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, theme === 'dark' ? 0.5 : 0.7);
    directionalLight.position.set(
      dimensions.length,
      dimensions.heightWall * 2,
      dimensions.width
    );
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grille de sol
    const gridColorMain = theme === 'dark' ? 0x4b5563 : 0x94a3b8;
    const gridColorCenter = theme === 'dark' ? 0x374151 : 0xd1d5db;
    const gridHelper = new THREE.GridHelper(
      Math.max(dimensions.length, dimensions.width) * 2,
      20,
      gridColorMain,
      gridColorCenter
    );
    // Améliorer le rendu de la grille
    const gridMaterial = gridHelper.material as THREE.LineBasicMaterial;
    gridMaterial.depthWrite = false;
    gridMaterial.depthTest = true;
    gridMaterial.opacity = theme === 'dark' ? 0.3 : 0.4;
    gridMaterial.transparent = true;
    scene.add(gridHelper);

    // Plan de sol
    const groundGeometry = new THREE.PlaneGeometry(
      Math.max(dimensions.length, dimensions.width) * 3,
      Math.max(dimensions.length, dimensions.width) * 3
    );
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: theme === 'dark' ? 0x1f2937 : 0xcce7ff,
      transparent: true,
      opacity: theme === 'dark' ? 0.02 : 0.3,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.name = 'Ground'; // Nommer pour le retrouver lors du changement de thème
    scene.add(ground);

    // Axes
    const axesHelper = new THREE.AxesHelper(5000);
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height]); // Retirer theme des dépendances

  // Mettre à jour le thème sans recréer la scène
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const bgColor = theme === 'dark' ? 0x1f2937 : 0xe6f2ff;
    scene.background = new THREE.Color(bgColor);

    // Mettre à jour la grille
    scene.traverse((child) => {
      if (child instanceof THREE.GridHelper) {
        const gridMaterial = child.material as THREE.LineBasicMaterial;
        gridMaterial.opacity = theme === 'dark' ? 0.3 : 0.4;
        gridMaterial.needsUpdate = true;
      }
      // Mettre à jour le plan de sol
      if (child instanceof THREE.Mesh && child.name === 'Ground') {
        const groundMaterial = child.material as THREE.MeshBasicMaterial;
        groundMaterial.color = new THREE.Color(theme === 'dark' ? 0x1f2937 : 0xcce7ff);
        groundMaterial.opacity = theme === 'dark' ? 0.02 : 0.3;
        groundMaterial.needsUpdate = true;
      }
    });

    // Le bâtiment sera reconstruit par le useEffect qui dépend de theme
  }, [theme]);

  // Mettre à jour le bâtiment quand les dimensions changent
  useEffect(() => {
    if (!sceneRef.current) return;

    console.log('[BuildingPreview3D] Reconstruction du bâtiment', {
      buildingType,
      dimensions,
      nbExtensions: extensions.length,
      extensionIds: extensions.map(e => e.id)
    });

    // Supprimer l'ancien bâtiment ET toutes les extensions
    if (buildingMeshRef.current) {
      sceneRef.current.remove(buildingMeshRef.current);

      // Nettoyer la mémoire (dispose geometry et materials)
      buildingMeshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });

      buildingMeshRef.current = null;
    }

    // Créer le groupe principal qui contiendra bâtiment + extensions
    const mainGroup = new THREE.Group();

    // 1. Créer le bâtiment principal (bleu)
    console.log('[BuildingPreview3D] ===== CRÉATION DU BÂTIMENT PRINCIPAL =====');
    const buildingGroup = createBuildingStructure(
      buildingType,
      dimensions,
      parameters,
      { x: 0, y: 0, z: 0 },
      0x1e40af, // Bleu
      false, // reversedSlope
      theme === 'dark' // isDarkTheme
    );
    mainGroup.add(buildingGroup);
    console.log('[BuildingPreview3D] ===== FIN CRÉATION BÂTIMENT PRINCIPAL =====');

    // 2. Créer les extensions (avec support des extensions imbriquées)
    const mainPostSpacing = parameters?.postSpacing || 5000;

    // Map pour stocker les infos de chaque extension (pour les enfants)
    interface ExtensionInfo {
      position: { x: number; y: number; z: number };
      dimensions: BuildingDimensions | any;
      postSpacing: number;
      depth: number; // Profondeur dans l'arbre (0 = direct du bâtiment principal)
      parameters?: BuildingParameters; // Paramètres du parent (pour mode personnalisé)
    }
    const extensionInfoMap = new Map<string, ExtensionInfo>();

    // Helper : Trouver les infos du parent
    const getParentInfo = (parentId: string | undefined): ExtensionInfo => {
      if (!parentId) {
        // Bâtiment principal
        return {
          position: { x: 0, y: 0, z: 0 },
          dimensions: dimensions,
          postSpacing: mainPostSpacing,
          depth: 0,
          parameters: parameters
        };
      }

      const parentInfo = extensionInfoMap.get(parentId);
      if (parentInfo) {
        return parentInfo;
      }

      // Parent pas encore calculé, retourner le bâtiment principal par défaut
      console.warn(`[getParentInfo] Parent ${parentId} non trouvé, utilisation du bâtiment principal`);
      return {
        position: { x: 0, y: 0, z: 0 },
        dimensions: dimensions,
        postSpacing: mainPostSpacing,
        depth: 0,
        parameters: parameters
      };
    };

    // Trier les extensions pour traiter les parents avant les enfants (tri topologique)
    const sortedExtensions: BuildingExtension[] = [];
    const remaining = [...extensions];
    const processed = new Set<string>();

    // Ajouter le "bâtiment principal" comme déjà traité
    processed.add('main');

    // Boucle jusqu'à ce que toutes les extensions soient triées
    while (remaining.length > 0) {
      const beforeLength = remaining.length;

      // Trouver les extensions dont le parent est déjà traité
      for (let i = remaining.length - 1; i >= 0; i--) {
        const ext = remaining[i];
        const parentId = ext.parentId || 'main';

        if (processed.has(parentId)) {
          // Ce parent est déjà traité, on peut ajouter cette extension
          sortedExtensions.push(ext);
          processed.add(ext.id);
          remaining.splice(i, 1);
        }
      }

      // Si aucune extension n'a pu être ajoutée, il y a un cycle ou un parent manquant
      if (remaining.length === beforeLength) {
        console.warn('[BuildingPreview3D] Extensions avec parent manquant détectées, ajout forcé:', remaining);
        // Ajouter les extensions restantes (avec parents manquants)
        remaining.forEach(ext => {
          sortedExtensions.push(ext);
          processed.add(ext.id);
        });
        break;
      }
    }

    // Traiter chaque extension
    sortedExtensions.forEach((ext) => {
      // Obtenir les infos du parent
      const parentInfo = getParentInfo(ext.parentId);

      // Calculer position d'attachement relative au parent
      let extPosX = 0;
      let extPosZ = 0;

      // Couleur selon la profondeur : preview = vert, depth 0 = orange, depth 1 = violet, depth 2+ = rose
      const isPreview = ext.id === 'preview';
      let extColor: number;
      if (isPreview) {
        extColor = 0x22c55e; // Vert pour preview
      } else if (parentInfo.depth === 0) {
        extColor = 0xf59e0b; // Orange pour extension directe
      } else if (parentInfo.depth === 1) {
        extColor = 0xa855f7; // Violet pour extension de 2e niveau
      } else {
        extColor = 0xec4899; // Rose pour extension de 3e niveau+
      }

      console.log(`[Extension] Création ${isPreview ? 'PREVIEW' : 'validée'}`, {
        id: ext.id,
        type: ext.type,
        attachmentType: ext.attachmentType,
        side: ext.side,
        parentId: ext.parentId || 'main',
        depth: parentInfo.depth + 1,
        dimensions: ext.dimensions,
        color: extColor.toString(16)
      });

      // Dimensions de l'extension
      let extDimensions: BuildingDimensions | any = {
        length: 0,
        width: ext.dimensions.width,
        heightWall: ext.dimensions.heightWall,
        slope: ext.dimensions.slope
      };

      // Déterminer position et dimensions selon type d'attachement (RELATIF AU PARENT)
      if (ext.attachmentType === ExtensionAttachmentType.LONG_PAN) {
        // Long-Pan : suit la longueur complète du parent et respecte ses entraxes
        extDimensions.length = parentInfo.dimensions.length; // Même longueur que le parent

        if (ext.side === 'front') {
          extPosX = parentInfo.position.x;
          extPosZ = parentInfo.position.z - ext.dimensions.width;  // Extension devant le parent
        } else if (ext.side === 'back') {
          extPosX = parentInfo.position.x;
          extPosZ = parentInfo.position.z + parentInfo.dimensions.width; // Extension derrière le parent
        } else if (ext.side === 'left') {
          extPosX = parentInfo.position.x - ext.dimensions.width;
          extPosZ = parentInfo.position.z;
        } else if (ext.side === 'right') {
          extPosX = parentInfo.position.x + parentInfo.dimensions.length;
          extPosZ = parentInfo.position.z;
        }

        // IMPORTANT : Hériter de l'entraxe du parent
        const extParameters = {
          ...ext.parameters,
          postSpacing: parentInfo.postSpacing
        };

        const extensionGroup = createBuildingStructure(
          ext.type,
          extDimensions,
          extParameters,
          { x: extPosX, y: 0, z: extPosZ },
          extColor,
          ext.reversedSlope || false,
          theme === 'dark'
        );
        mainGroup.add(extensionGroup);

        // Stocker les infos de cette extension pour ses enfants potentiels
        if (!isPreview) {
          extensionInfoMap.set(ext.id, {
            position: { x: extPosX, y: 0, z: extPosZ },
            dimensions: extDimensions,
            postSpacing: parentInfo.postSpacing,
            depth: parentInfo.depth + 1,
            parameters: extParameters
          });
        }

      } else if (ext.attachmentType === ExtensionAttachmentType.TRAVEE && ext.bayIndex !== undefined) {
        // Travée : extension sur une travée spécifique du parent

        // Calculer la position X et la longueur selon le mode (standard ou personnalisé)
        let xPos: number;
        let bayLength: number;

        if (parentInfo.parameters?.customSpacingMode && parentInfo.parameters?.customBays && parentInfo.parameters.customBays.length > 0) {
          // Mode personnalisé : calculer la position en additionnant les travées précédentes
          let cumulativeX = parentInfo.position.x;
          for (let i = 0; i < ext.bayIndex && i < parentInfo.parameters.customBays.length; i++) {
            cumulativeX += parentInfo.parameters.customBays[i].spacing;
          }
          xPos = cumulativeX;

          // La longueur de l'extension = longueur de la travée spécifique
          if (ext.bayIndex < parentInfo.parameters.customBays.length) {
            bayLength = parentInfo.parameters.customBays[ext.bayIndex].spacing;
          } else {
            // Fallback si bayIndex invalide
            bayLength = parentInfo.postSpacing;
          }
        } else {
          // Mode standard : entraxe uniforme
          bayLength = parentInfo.postSpacing;
          xPos = parentInfo.position.x + (ext.bayIndex * parentInfo.postSpacing);
        }

        extDimensions.length = bayLength;

        if (ext.side === 'front') {
          extPosX = xPos;
          extPosZ = parentInfo.position.z - ext.dimensions.width;
        } else if (ext.side === 'back') {
          extPosX = xPos;
          extPosZ = parentInfo.position.z + parentInfo.dimensions.width;
        }

        // Hériter de l'entraxe du parent
        const extParameters = {
          ...ext.parameters,
          postSpacing: parentInfo.postSpacing
        };

        const extensionGroup = createBuildingStructure(
          ext.type,
          extDimensions,
          extParameters,
          { x: extPosX, y: 0, z: extPosZ },
          extColor,
          ext.reversedSlope || false,
          theme === 'dark'
        );
        mainGroup.add(extensionGroup);

        // Stocker les infos
        if (!isPreview) {
          extensionInfoMap.set(ext.id, {
            position: { x: extPosX, y: 0, z: extPosZ },
            dimensions: extDimensions,
            postSpacing: bayLength,
            depth: parentInfo.depth + 1,
            parameters: extParameters
          });
        }

      } else if (ext.attachmentType === ExtensionAttachmentType.PIGNON_GAUCHE) {
        // Pignon Gauche : extension perpendiculaire au pignon gauche du parent
        extDimensions.length = ext.dimensions.width; // Profondeur de l'extension (direction X)
        extDimensions.width = parentInfo.dimensions.width; // Sur toute la largeur du parent (direction Z)
        extPosX = parentInfo.position.x - extDimensions.length; // Extension vers la gauche du parent
        extPosZ = parentInfo.position.z;

        // Hériter de l'entraxe du parent
        const extParameters = {
          ...ext.parameters,
          postSpacing: parentInfo.postSpacing
        };

        const extensionGroup = createBuildingStructure(
          ext.type,
          extDimensions,
          extParameters,
          { x: extPosX, y: 0, z: extPosZ },
          extColor,
          ext.reversedSlope || false,
          theme === 'dark'
        );
        mainGroup.add(extensionGroup);

        // Stocker les infos
        if (!isPreview) {
          extensionInfoMap.set(ext.id, {
            position: { x: extPosX, y: 0, z: extPosZ },
            dimensions: extDimensions,
            postSpacing: parentInfo.postSpacing,
            depth: parentInfo.depth + 1,
            parameters: extParameters
          });
        }

      } else if (ext.attachmentType === ExtensionAttachmentType.PIGNON_DROIT) {
        // Pignon Droit : extension perpendiculaire au pignon droit du parent
        extDimensions.length = ext.dimensions.width; // Profondeur de l'extension (direction X)
        extDimensions.width = parentInfo.dimensions.width; // Sur toute la largeur du parent (direction Z)
        extPosX = parentInfo.position.x + parentInfo.dimensions.length; // Extension vers la droite du parent
        extPosZ = parentInfo.position.z;

        // Hériter de l'entraxe du parent
        const extParameters = {
          ...ext.parameters,
          postSpacing: parentInfo.postSpacing
        };

        const extensionGroup = createBuildingStructure(
          ext.type,
          extDimensions,
          extParameters,
          { x: extPosX, y: 0, z: extPosZ },
          extColor,
          ext.reversedSlope || false,
          theme === 'dark'
        );
        mainGroup.add(extensionGroup);

        // Stocker les infos
        if (!isPreview) {
          extensionInfoMap.set(ext.id, {
            position: { x: extPosX, y: 0, z: extPosZ },
            dimensions: extDimensions,
            postSpacing: parentInfo.postSpacing,
            depth: parentInfo.depth + 1,
            parameters: extParameters
          });
        }
      }
    });

    // Ajouter le groupe principal à la scène
    sceneRef.current.add(mainGroup);
    buildingMeshRef.current = mainGroup;

    // 3. Recentrer la caméra
    if (cameraRef.current && controlsRef.current) {
      const center = new THREE.Vector3(
        dimensions.length / 2,
        dimensions.heightWall / 2,
        dimensions.width / 2
      );
      controlsRef.current.target.copy(center);
      cameraRef.current.position.set(
        dimensions.length * 1.5,
        dimensions.heightWall * 1.5,
        dimensions.width * 1.5
      );
    }

  }, [buildingType, dimensions, parameters, extensions, theme]);

  return (
    <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1px solid ${theme === 'dark' ? '#334155' : '#cbd5e1'}`,
          boxShadow: theme === 'dark' ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
        }}
      />

      {/* Bouton de bascule thème */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          padding: '0.5rem',
          backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          color: theme === 'dark' ? '#e2e8f0' : '#334155',
          border: `1px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`,
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1.2rem',
          backdropFilter: 'blur(8px)',
          boxShadow: theme === 'dark'
            ? '0 2px 4px rgba(0, 0, 0, 0.3)'
            : '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.5rem',
          height: '2.5rem'
        }}
        title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
};
