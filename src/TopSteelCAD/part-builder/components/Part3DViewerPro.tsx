import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { IProfileGenerator } from '../../3DLibrary/geometry-generators/generators/IProfileGenerator';
import { UProfileGenerator } from '../../3DLibrary/geometry-generators/generators/UProfileGenerator';
import { LProfileGenerator } from '../../3DLibrary/geometry-generators/generators/LProfileGenerator';
import { TProfileGenerator } from '../../3DLibrary/geometry-generators/generators/TProfileGenerator';
import { PlateGenerator } from '../../3DLibrary/geometry-generators/generators/PlateGenerator';
import { TubeGenerator } from '../../3DLibrary/geometry-generators/generators/TubeGenerator';
import { ProfileType } from '../../3DLibrary/types';

interface Hole {
  diameter: number;
  distanceFromStart: number;
  x?: number;
  y?: number;
}

interface Part3DViewerProProps {
  profileType: string;
  profileSection: string;
  length: number;
  holes: Hole[];
  width?: number;
  height?: number;
}

export const Part3DViewerPro: React.FC<Part3DViewerProProps> = ({
  profileType,
  profileSection,
  length,
  holes,
  width = 800,
  height = 600
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Créer la scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Créer la caméra
    const camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      10000
    );
    camera.position.set(length * 0.8, length * 0.5, length);
    cameraRef.current = camera;

    // Créer le renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ajouter les contrôles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 5000;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 0.5);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-1, -1, -0.5);
    scene.add(directionalLight2);

    // Grille
    const gridHelper = new THREE.GridHelper(Math.max(length * 1.5, 2000), 20, 0x888888, 0xcccccc);
    gridHelper.position.y = -200;
    scene.add(gridHelper);

    // Axes
    const axesHelper = new THREE.AxesHelper(500);
    scene.add(axesHelper);

    // Animation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    // Supprimer l'ancienne géométrie
    const toRemove: THREE.Object3D[] = [];
    sceneRef.current.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.isProfile) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      sceneRef.current!.remove(obj);
    });

    // Créer la géométrie du profil
    try {
      // Mapper le type de profil
      let mappedType: ProfileType;
      switch (profileType) {
        case 'IPE':
        case 'HEA':
        case 'HEB':
          mappedType = ProfileType.I_PROFILE;
          break;
        case 'UPE':
        case 'UAP':
          mappedType = ProfileType.U_PROFILE;
          break;
        case 'L':
          mappedType = ProfileType.L_PROFILE;
          break;
        case 'RHS':
          mappedType = ProfileType.RECTANGULAR_HOLLOW;
          break;
        case 'CHS':
          mappedType = ProfileType.CIRCULAR_HOLLOW;
          break;
        case 'T':
          mappedType = ProfileType.T_PROFILE;
          break;
        case 'PLATE':
          mappedType = ProfileType.PLATE;
          break;
        default:
          mappedType = ProfileType.I_PROFILE;
      }

      // Créer les dimensions basées sur la section
      const sectionNumber = parseInt(profileSection) || 200;
      const dimensions = {
        length: length,
        height: sectionNumber,
        width: profileType === 'HEA' || profileType === 'HEB' ? sectionNumber : sectionNumber * 0.5,
        flangeThickness: sectionNumber * 0.06,
        webThickness: sectionNumber * 0.035,
        flangeWidth: profileType === 'HEA' || profileType === 'HEB' ? sectionNumber : sectionNumber * 0.5
      };

      // Sélectionner le bon générateur selon le type
      let geometry: THREE.BufferGeometry;

      switch (mappedType) {
        case ProfileType.I_PROFILE:
          const iGenerator = new IProfileGenerator();
          geometry = iGenerator.generate(dimensions as any, length);
          break;
        case ProfileType.U_PROFILE:
          const uGenerator = new UProfileGenerator();
          geometry = uGenerator.generate(dimensions as any, length);
          break;
        case ProfileType.L_PROFILE:
          const lGenerator = new LProfileGenerator();
          geometry = lGenerator.generate(dimensions as any, length);
          break;
        case ProfileType.T_PROFILE:
          const tGenerator = new TProfileGenerator();
          geometry = tGenerator.generate(dimensions as any, length);
          break;
        case ProfileType.PLATE:
          const plateGenerator = new PlateGenerator();
          geometry = plateGenerator.generate(dimensions as any, length);
          break;
        case ProfileType.CIRCULAR_HOLLOW:
        case ProfileType.RECTANGULAR_HOLLOW:
          const tubeGenerator = new TubeGenerator();
          geometry = tubeGenerator.generate(dimensions as any, length);
          break;
        default:
          // Fallback vers une géométrie simple
          geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, length);
      }

      // Créer le matériau
      const material = new THREE.MeshPhongMaterial({
        color: 0x4a90e2,
        shininess: 100,
        specular: 0x111111,
        side: THREE.DoubleSide
      });

      // Créer le mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isProfile = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Les profils sont générés centrés autour de l'origine (-length/2 à +length/2)
      // On garde cette position naturelle
      sceneRef.current.add(mesh);

      // Ajouter les trous
      // NOTE: La pièce est centrée et s'étend de -length/2 à +length/2
      // On doit convertir distanceFromStart (0 à length) vers cette plage
      if (holes.length > 0) {
        holes.forEach(hole => {
          // Créer la géométrie du trou (cylindre vertical)
          const holeGeometry = new THREE.CylinderGeometry(
            hole.diameter / 2,
            hole.diameter / 2,
            dimensions.height * 1.5,
            32
          );

          // Matériau pour représenter le trou (semi-transparent rouge)
          const holeMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
          });

          const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);
          holeMesh.userData.isProfile = true;

          // Convertir la position du trou depuis le début de la pièce
          // La pièce va de -length/2 à +length/2
          // Un trou à 0mm doit être à -length/2
          // Un trou à 500mm doit être à -length/2 + 500
          holeMesh.position.set(
            hole.x || 0,
            hole.y || 0,
            -length / 2 + hole.distanceFromStart
          );

          // Le trou doit percer verticalement (le long de Y)
          // Pas de rotation nécessaire, le cylindre est déjà vertical par défaut

          sceneRef.current.add(holeMesh);

          // Ajouter un anneau pour marquer visuellement le trou
          const ringGeometry = new THREE.TorusGeometry(
            hole.diameter / 2 + 2,
            2,
            8,
            32
          );
          const ringMaterial = new THREE.MeshPhongMaterial({
            color: 0x0066ff,
            emissive: 0x0022ff,
            emissiveIntensity: 0.2
          });
          const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
          ringMesh.userData.isProfile = true;
          ringMesh.position.set(
            hole.x || 0,
            (hole.y || 0) + dimensions.height / 2 + 1,
            -length / 2 + hole.distanceFromStart
          );
          // L'anneau doit être horizontal (dans le plan XZ)

          sceneRef.current.add(ringMesh);
        });
      }

      // Ajuster la caméra pour voir toute la pièce
      const center = new THREE.Vector3(0, 0, 0); // Centre de la pièce
      const maxDim = Math.max(dimensions.width, dimensions.height, length);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

      cameraRef.current.position.set(
        cameraDistance * 0.8,
        cameraDistance * 0.5,
        cameraDistance * 0.8
      );
      cameraRef.current.lookAt(center);
      controlsRef.current.target = center;
      controlsRef.current.update();

    } catch (error) {
      console.error('Erreur lors de la création de la géométrie:', error);
    }

  }, [profileType, profileSection, length, holes]);

  return (
    <div
      ref={mountRef}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Contrôles de vue */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        zIndex: 10
      }}>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 1000) * 1.5;
              cameraRef.current.position.set(distance, 0, 0);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
        >
          Face
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 1000) * 1.5;
              cameraRef.current.position.set(0, distance, 0);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
        >
          Dessus
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 1000) * 1.5;
              cameraRef.current.position.set(
                distance * 0.7,
                distance * 0.5,
                distance * 0.7
              );
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
        >
          3D
        </button>
      </div>

      {/* Info panel */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        padding: '10px 15px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#333'
      }}>
        <div>{profileType} {profileSection} - {length}mm</div>
        {holes.length > 0 && (
          <div style={{ marginTop: '5px', color: '#666' }}>
            {holes.length} trou{holes.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};