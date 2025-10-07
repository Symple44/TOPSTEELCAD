/**
 * BuildingViewer3D - Viewer 3D pour les bâtiments générés
 * Building Estimator - TopSteelCAD
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { MonoPenteBuilding } from '../types';
import { GeometryService, LevelOfDetail } from '../services/GeometryService';

export interface BuildingViewer3DProps {
  /** Bâtiment à afficher */
  building: MonoPenteBuilding;

  /** Niveau de détail */
  levelOfDetail?: LevelOfDetail;

  /** Options d'affichage */
  showGrid?: boolean;
  showAxes?: boolean;
  showStructure?: boolean;
  showCladding?: boolean;
  showRoofing?: boolean;
  showOpenings?: boolean;

  /** Dimensions du viewer */
  width?: number | string;
  height?: number | string;

  /** Callbacks */
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Composant viewer 3D
 */
export const BuildingViewer3D: React.FC<BuildingViewer3DProps> = ({
  building,
  levelOfDetail = 'medium',
  showGrid = true,
  showAxes = true,
  showStructure = true,
  showCladding = true,
  showRoofing = true,
  showOpenings = true,
  width = '100%',
  height = '500px',
  onLoad,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLOD, setCurrentLOD] = useState<LevelOfDetail>(levelOfDetail);

  /**
   * Initialise la scène Three.js
   */
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initScene = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Créer la scène
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        scene.fog = new THREE.Fog(0x1a1a2e, 1000, 50000);
        sceneRef.current = scene;

        // Créer la caméra
        const camera = new THREE.PerspectiveCamera(50, width / height, 1, 100000);

        // Positionner la caméra selon la taille du bâtiment
        const buildingLength = building.dimensions.length;
        const buildingWidth = building.dimensions.width;
        const buildingHeight = building.dimensions.heightWall;
        const maxDim = Math.max(buildingLength, buildingWidth, buildingHeight);

        camera.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 0.8);
        camera.lookAt(buildingLength / 2, buildingHeight / 2, 0);
        cameraRef.current = camera;

        // Créer le renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Créer les contrôles
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = maxDim * 0.2;
        controls.maxDistance = maxDim * 3;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(buildingLength / 2, buildingHeight / 2, 0);
        controls.update();
        controlsRef.current = controls;

        // Ajouter la grille
        if (showGrid) {
          const gridSize = Math.max(buildingLength, buildingWidth) * 2;
          const gridHelper = new THREE.GridHelper(gridSize, 50, 0x404040, 0x303030);
          gridHelper.position.y = 0;
          scene.add(gridHelper);
        }

        // Ajouter les axes
        if (showAxes) {
          const axesHelper = new THREE.AxesHelper(maxDim * 0.3);
          scene.add(axesHelper);
        }

        // Éclairage
        setupLighting(scene, buildingLength, buildingWidth, buildingHeight);

        // Générer le bâtiment 3D
        const buildingResult = GeometryService.generateBuilding3D(building, {
          levelOfDetail: currentLOD,
          generateStructure: showStructure,
          generateCladding: showCladding,
          generateRoofing: showRoofing,
          generateOpenings: showOpenings
        });

        // Ajouter la scène générée
        scene.add(buildingResult.scene);

        // Animation
        const animate = () => {
          if (!mounted) return;
          animationIdRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        if (mounted) {
          setIsLoading(false);
          if (onLoad) onLoad();
        }
      } catch (err) {
        console.error('Erreur lors de l\'initialisation du viewer 3D:', err);
        if (mounted) {
          const error = err as Error;
          setError(error.message);
          if (onError) onError(error);
        }
      }
    };

    initScene();

    // Gestion du redimensionnement
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [building, currentLOD, showGrid, showAxes, showStructure, showCladding, showRoofing, showOpenings, onLoad, onError]);

  /**
   * Change le niveau de détail
   */
  const handleChangeLOD = (lod: LevelOfDetail) => {
    setCurrentLOD(lod);
  };

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: '#1a1a2e',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '14px',
            textAlign: 'center'
          }}
        >
          <div>⏳ Génération du modèle 3D...</div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            {building.name}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff5555',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderRadius: '5px',
            maxWidth: '80%'
          }}
        >
          <div>⚠️ Erreur de chargement</div>
          <div style={{ marginTop: '10px', fontSize: '12px' }}>{error}</div>
        </div>
      )}

      {/* Info overlay */}
      {!isLoading && !error && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              color: 'white',
              fontSize: '12px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '10px 14px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              lineHeight: '1.6'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>{building.name}</div>
            <div>
              {(building.dimensions.length / 1000).toFixed(1)}m × {(building.dimensions.width / 1000).toFixed(1)}m × {(building.dimensions.heightWall / 1000).toFixed(1)}m
            </div>
            <div>Pente: {building.dimensions.slope}%</div>
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#aaa' }}>
              LOD: {currentLOD}
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '6px',
                padding: '6px',
                fontSize: '11px',
                color: 'white'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '6px', paddingLeft: '6px' }}>
                Niveau de détail
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => handleChangeLOD('low')}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: currentLOD === 'low' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Bas
                </button>
                <button
                  onClick={() => handleChangeLOD('medium')}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: currentLOD === 'medium' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Moyen
                </button>
                <button
                  onClick={() => handleChangeLOD('high')}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: currentLOD === 'high' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Haut
                </button>
              </div>
            </div>
          </div>

          {/* Help */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '10px',
              fontFamily: 'monospace'
            }}
          >
            🖱️ Clic gauche: rotation | Molette: zoom | Clic droit: panoramique
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Configure l'éclairage de la scène
 */
function setupLighting(
  scene: THREE.Scene,
  buildingLength: number,
  buildingWidth: number,
  buildingHeight: number
): void {
  // Lumière ambiante
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Lumière directionnelle principale (soleil)
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(buildingLength * 0.5, buildingHeight * 2, buildingWidth * 0.5);
  mainLight.castShadow = true;

  // Configuration des ombres
  const maxDim = Math.max(buildingLength, buildingWidth);
  mainLight.shadow.camera.left = -maxDim;
  mainLight.shadow.camera.right = maxDim;
  mainLight.shadow.camera.top = maxDim;
  mainLight.shadow.camera.bottom = -maxDim;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = maxDim * 4;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.bias = -0.0001;

  scene.add(mainLight);

  // Lumière d'appoint
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-buildingLength * 0.3, buildingHeight, -buildingWidth * 0.3);
  scene.add(fillLight);

  // Lumière hémisphérique (ciel/sol)
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.4);
  scene.add(hemiLight);
}

export default BuildingViewer3D;
