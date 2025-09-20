import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { ProfileType, Hole, Notch } from '../types';

interface Part3DPreviewProps {
  profileType: ProfileType;
  profileSection: string;
  length: number;
  holes: Array<Hole & { distanceFromStart: number }>;
  notches: Array<Notch & { distanceFromStart: number }>;
  width?: number;
  height?: number;
}

export const Part3DPreview: React.FC<Part3DPreviewProps> = ({
  profileType,
  profileSection,
  length,
  holes,
  notches,
  width = 800,
  height = 600
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const profileMeshRef = useRef<THREE.Mesh | null>(null);

  // Obtenir les dimensions du profil
  const getProfileDimensions = (type: ProfileType, section: string) => {
    // Dimensions simplifiées basées sur le type et la section
    const sectionNumber = parseInt(section) || 200;

    switch (type) {
      case 'IPE':
        return {
          height: sectionNumber,
          flangeWidth: sectionNumber * 0.5,
          flangeThickness: sectionNumber * 0.05,
          webThickness: sectionNumber * 0.025
        };
      case 'HEA':
      case 'HEB':
        return {
          height: sectionNumber,
          flangeWidth: sectionNumber,
          flangeThickness: sectionNumber * 0.06,
          webThickness: sectionNumber * 0.04
        };
      case 'UPE':
      case 'UAP':
        return {
          height: sectionNumber,
          flangeWidth: sectionNumber * 0.4,
          flangeThickness: sectionNumber * 0.05,
          webThickness: sectionNumber * 0.03
        };
      case 'RHS':
        return {
          height: sectionNumber,
          width: sectionNumber * 0.75,
          thickness: sectionNumber * 0.04
        };
      case 'CHS':
        return {
          diameter: sectionNumber,
          thickness: sectionNumber * 0.04
        };
      default:
        return {
          height: sectionNumber,
          width: sectionNumber
        };
    }
  };

  // Créer la géométrie du profil
  const createProfileGeometry = (type: ProfileType, dimensions: any, length: number): THREE.BufferGeometry => {
    switch (type) {
      case 'IPE':
      case 'HEA':
      case 'HEB': {
        // Créer un profil I avec CSG
        const group = new THREE.Group();

        // Aile supérieure
        const topFlange = new THREE.BoxGeometry(
          dimensions.flangeWidth,
          dimensions.flangeThickness,
          length
        );

        // Aile inférieure
        const bottomFlange = new THREE.BoxGeometry(
          dimensions.flangeWidth,
          dimensions.flangeThickness,
          length
        );

        // Âme
        const web = new THREE.BoxGeometry(
          dimensions.webThickness,
          dimensions.height - 2 * dimensions.flangeThickness,
          length
        );

        // Fusionner les géométries
        const mergedGeometry = new THREE.BufferGeometry();
        const geometries = [
          topFlange.translate(0, (dimensions.height - dimensions.flangeThickness) / 2, 0),
          bottomFlange.translate(0, -(dimensions.height - dimensions.flangeThickness) / 2, 0),
          web
        ];

        // Simple merge des géométries
        const positions: number[] = [];
        const normals: number[] = [];

        geometries.forEach(geom => {
          const pos = geom.attributes.position.array;
          const norm = geom.attributes.normal.array;
          positions.push(...Array.from(pos));
          normals.push(...Array.from(norm));
        });

        mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

        return mergedGeometry;
      }

      case 'RHS': {
        // Profil rectangulaire creux
        const outer = new THREE.BoxGeometry(dimensions.width, dimensions.height, length);
        const inner = new THREE.BoxGeometry(
          dimensions.width - 2 * dimensions.thickness,
          dimensions.height - 2 * dimensions.thickness,
          length + 1
        );
        // Pour l'instant, retourner juste l'extérieur
        return outer;
      }

      case 'CHS': {
        // Profil circulaire creux
        return new THREE.CylinderGeometry(
          dimensions.diameter / 2,
          dimensions.diameter / 2,
          length,
          32
        );
      }

      default:
        // Profil générique (plaque)
        return new THREE.BoxGeometry(dimensions.width || 100, dimensions.height || 10, length);
    }
  };

  // Ajouter les trous à la géométrie
  const addHoles = (mesh: THREE.Mesh, holes: Array<Hole & { distanceFromStart: number }>) => {
    // Pour chaque trou, créer une sphère indicatrice
    holes.forEach(hole => {
      const holeMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        transparent: true,
        opacity: 0.7
      });

      const holeGeometry = new THREE.SphereGeometry(hole.diameter / 2, 16, 16);
      const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);

      // Positionner le trou
      holeMesh.position.set(
        hole.position.x,
        hole.position.y,
        hole.position.z - length / 2 + hole.distanceFromStart
      );

      if (sceneRef.current) {
        sceneRef.current.add(holeMesh);
      }
    });
  };

  // Ajouter les encoches
  const addNotches = (mesh: THREE.Mesh, notches: Array<Notch & { distanceFromStart: number }>) => {
    notches.forEach(notch => {
      const notchMaterial = new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.7
      });

      const notchGeometry = new THREE.BoxGeometry(
        notch.width,
        notch.height,
        notch.depth
      );
      const notchMesh = new THREE.Mesh(notchGeometry, notchMaterial);

      // Positionner l'encoche
      notchMesh.position.set(
        notch.position.x,
        notch.position.y,
        notch.position.z - length / 2 + notch.distanceFromStart
      );

      if (sceneRef.current) {
        sceneRef.current.add(notchMesh);
      }
    });
  };

  // Initialiser la scène 3D
  useEffect(() => {
    if (!mountRef.current) return;

    // Scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b);
    sceneRef.current = scene;

    // Caméra
    const camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      1,
      10000
    );
    camera.position.set(length * 0.8, length * 0.6, length * 1.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Contrôles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(length, length, length);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = length * 3;
    directionalLight.shadow.camera.left = -length;
    directionalLight.shadow.camera.right = length;
    directionalLight.shadow.camera.top = length;
    directionalLight.shadow.camera.bottom = -length;
    scene.add(directionalLight);

    // Grille
    const gridHelper = new THREE.GridHelper(length * 2, 20, 0x444444, 0x222222);
    gridHelper.position.y = -200;
    scene.add(gridHelper);

    // Axes
    const axesHelper = new THREE.AxesHelper(length / 2);
    scene.add(axesHelper);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [width, height, length]);

  // Mettre à jour le profil
  useEffect(() => {
    if (!sceneRef.current) return;

    // Supprimer l'ancien profil
    if (profileMeshRef.current) {
      sceneRef.current.remove(profileMeshRef.current);
      profileMeshRef.current.geometry.dispose();
      if (Array.isArray(profileMeshRef.current.material)) {
        profileMeshRef.current.material.forEach(m => m.dispose());
      } else {
        profileMeshRef.current.material.dispose();
      }
    }

    // Supprimer les anciens trous et encoches
    const toRemove: THREE.Object3D[] = [];
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== profileMeshRef.current) {
        const material = child.material as THREE.MeshBasicMaterial;
        if (material.color.getHex() === 0x0000ff || material.color.getHex() === 0xff9900) {
          toRemove.push(child);
        }
      }
    });
    toRemove.forEach(child => sceneRef.current!.remove(child));

    // Créer le nouveau profil
    const dimensions = getProfileDimensions(profileType, profileSection);
    const geometry = createProfileGeometry(profileType, dimensions, length);

    const material = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      shininess: 70,
      specular: 0x222222
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Rotation pour les profils cylindriques
    if (profileType === 'CHS') {
      mesh.rotation.z = Math.PI / 2;
    }

    sceneRef.current.add(mesh);
    profileMeshRef.current = mesh;

    // Ajouter les trous et encoches
    addHoles(mesh, holes);
    addNotches(mesh, notches);

    // Ajuster la caméra
    if (cameraRef.current && controlsRef.current) {
      const distance = Math.max(length, 500) * 1.5;
      cameraRef.current.position.set(distance * 0.8, distance * 0.6, distance * 1.2);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }

  }, [profileType, profileSection, length, holes, notches]);

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden">
      <div ref={mountRef} style={{ width, height }} />

      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 p-3 rounded-lg">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-slate-300">Profil {profileType} {profileSection}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full opacity-70" />
            <span className="text-slate-300">Trous ({holes.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full opacity-70" />
            <span className="text-slate-300">Encoches ({notches.length})</span>
          </div>
        </div>
      </div>

      {/* Contrôles de vue */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 500) * 1.5;
              cameraRef.current.position.set(distance, 0, 0);
              controlsRef.current.update();
            }
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
        >
          Vue Face
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 500) * 1.5;
              cameraRef.current.position.set(0, distance, 0);
              controlsRef.current.update();
            }
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
        >
          Vue Dessus
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 500) * 1.5;
              cameraRef.current.position.set(0, 0, distance);
              controlsRef.current.update();
            }
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
        >
          Vue Côté
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const distance = Math.max(length, 500) * 1.5;
              cameraRef.current.position.set(distance * 0.8, distance * 0.6, distance * 1.2);
              controlsRef.current.update();
            }
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
        >
          Vue Iso
        </button>
      </div>
    </div>
  );
};