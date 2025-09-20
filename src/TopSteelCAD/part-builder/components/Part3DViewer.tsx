import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

interface Part3DViewerProps {
  profileType: string;
  profileSize: string;
  length: number;
  holes?: Array<{ diameter: number; x: number; y: number; face: string }>;
  grugeages?: Array<{ type: string; largeur: number; profondeur: number; position: string }>;
  startCut?: { angle: number; direction: string };
  endCut?: { angle: number; direction: string };
  dimensions?: {
    height?: number;
    width?: number;
    webThickness?: number;
    flangeThickness?: number;
  };
}

export const Part3DViewer: React.FC<Part3DViewerProps> = ({
  profileType,
  profileSize,
  length,
  holes = [],
  grugeages = [],
  startCut,
  endCut,
  dimensions = {}
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Configuration de la scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Configuration de la caméra
    const camera = new THREE.PerspectiveCamera(
      50,
      300 / 200, // Aspect ratio fixe pour mini viewer
      0.1,
      10000
    );
    camera.position.set(length * 0.8, length * 0.5, length * 0.8);

    // Configuration du renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(300, 200);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Contrôles orbitaux
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grille
    const gridHelper = new THREE.GridHelper(length * 1.5, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Création de la géométrie du profilé
    const createProfile = () => {
      const group = new THREE.Group();

      const { height = 200, width = 100, webThickness = 7, flangeThickness = 10 } = dimensions;

      // Matériau
      const material = new THREE.MeshPhongMaterial({
        color: 0x4a90e2,
        metalness: 0.3,
        roughness: 0.7
      });

      // Créer le profilé selon le type
      if (profileType.startsWith('IPE') || profileType.startsWith('HE')) {
        // Âme (web)
        const webGeometry = new THREE.BoxGeometry(webThickness, height - 2 * flangeThickness, length);
        const web = new THREE.Mesh(webGeometry, material);
        web.castShadow = true;
        web.receiveShadow = true;
        group.add(web);

        // Aile supérieure
        const topFlangeGeometry = new THREE.BoxGeometry(width, flangeThickness, length);
        const topFlange = new THREE.Mesh(topFlangeGeometry, material);
        topFlange.position.y = (height - flangeThickness) / 2;
        topFlange.castShadow = true;
        topFlange.receiveShadow = true;
        group.add(topFlange);

        // Aile inférieure
        const bottomFlange = new THREE.Mesh(topFlangeGeometry, material);
        bottomFlange.position.y = -(height - flangeThickness) / 2;
        bottomFlange.castShadow = true;
        bottomFlange.receiveShadow = true;
        group.add(bottomFlange);
      } else if (profileType === 'UPN') {
        // Profilé en U
        const webGeometry = new THREE.BoxGeometry(webThickness, height, length);
        const web = new THREE.Mesh(webGeometry, material);
        web.position.x = -width / 2 + webThickness / 2;
        group.add(web);

        const flangeGeometry = new THREE.BoxGeometry(width, flangeThickness, length);
        const topFlange = new THREE.Mesh(flangeGeometry, material);
        topFlange.position.y = (height - flangeThickness) / 2;
        group.add(topFlange);

        const bottomFlange = new THREE.Mesh(flangeGeometry, material);
        bottomFlange.position.y = -(height - flangeThickness) / 2;
        group.add(bottomFlange);
      } else if (profileType.includes('TUBE')) {
        // Tube rectangulaire ou carré
        const outerGeometry = new THREE.BoxGeometry(width, height, length);
        const innerWidth = width - 2 * webThickness;
        const innerHeight = height - 2 * webThickness;
        const innerGeometry = new THREE.BoxGeometry(innerWidth, innerHeight, length + 1);

        const outerMesh = new THREE.Mesh(outerGeometry, material);
        const innerMesh = new THREE.Mesh(innerGeometry, material);

        // Utiliser CSG pour créer le tube creux (simulé ici)
        group.add(outerMesh);
      } else {
        // Profilé générique (plaque)
        const geometry = new THREE.BoxGeometry(width, webThickness, length);
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      }

      // Ajouter les trous
      holes.forEach(hole => {
        const holeGeometry = new THREE.CylinderGeometry(hole.diameter / 2, hole.diameter / 2, webThickness * 2);
        const holeMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
        const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);

        holeMesh.position.set(hole.x - width/2, hole.y, length/2 - hole.x);
        holeMesh.rotation.z = Math.PI / 2;
        group.add(holeMesh);
      });

      // Ajouter les grugeages
      grugeages.forEach(grugeage => {
        const cutGeometry = new THREE.BoxGeometry(grugeage.largeur, grugeage.profondeur, 50);
        const cutMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, opacity: 0.5, transparent: true });
        const cutMesh = new THREE.Mesh(cutGeometry, cutMaterial);

        const zPos = grugeage.position === 'debut' ? length/2 - 25 : -length/2 + 25;
        cutMesh.position.set(0, height/2 - grugeage.profondeur/2, zPos);
        group.add(cutMesh);
      });

      return group;
    };

    const profile = createProfile();
    scene.add(profile);

    // Animation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (isHovered) {
        profile.rotation.y += 0.005;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Nettoyage
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [profileType, profileSize, length, holes, grugeages, startCut, endCut, dimensions, isHovered]);

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '300px',
        height: '200px',
        backgroundColor: '#1a1a1a',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        cursor: 'grab',
        boxShadow: isHovered ? '0 0 20px rgba(74, 144, 226, 0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.3s ease'
      }}
    />
  );
};

export default Part3DViewer;