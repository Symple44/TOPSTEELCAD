/**
 * Viewer3D - Composant React principal pour la visualisation 3D
 * Utilise l'architecture modulaire pour gérer l'affichage 3D
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// Core
import SceneManager from '../core/Scene/SceneManager';

// DSTV
import DSTVTransformer, { DSTVFace, ProfileDimensions } from '../dstv/DSTVTransformer';

// Geometry
import HoleGenerator, { HoleDefinition } from '../geometry/features/HoleGenerator';

// Integration
import CSGHoleAdapter, { CSGHole } from '../integration/CSGHoleAdapter';

// Types existants de TOPSTEELCAD
import { IProfileGenerator } from '../../3DLibrary/geometry-generators/generators/IProfileGenerator';
import { UProfileGenerator } from '../../3DLibrary/geometry-generators/generators/UProfileGenerator';
import { LProfileGenerator } from '../../3DLibrary/geometry-generators/generators/LProfileGenerator';
import { TubeGenerator } from '../../3DLibrary/geometry-generators/generators/TubeGenerator';
import { PlateGenerator } from '../../3DLibrary/geometry-generators/generators/PlateGenerator';

export interface Viewer3DProps {
  // Profil
  profileType: string;
  profileSection: string;
  length: number;
  dimensions?: ProfileDimensions;

  // Trous
  holes?: Array<{
    id?: string;
    label?: string;
    diameter: number;
    coordinates: {
      face: string;
      x: number;
      y: number;
      z?: number;
    };
    isThrough?: boolean;
    depth?: number;
  }>;

  // Options d'affichage
  showGrid?: boolean;
  showAxes?: boolean;
  showLabels?: boolean;

  // Dimensions du viewer
  width?: number | string;
  height?: number | string;

  // Callbacks
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const Viewer3D: React.FC<Viewer3DProps> = ({
  profileType,
  profileSection,
  length,
  dimensions,
  holes = [],
  showGrid = true,
  showAxes = true,
  showLabels = true,
  width = '100%',
  height = '500px',
  onLoad,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initScene = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Créer le gestionnaire de scène
        const sceneManager = new SceneManager(containerRef.current!, {
          showGrid,
          showAxes,
          backgroundColor: 0x1a1a1a,
          fogColor: 0x1a1a1a,
          fogNear: 500,
          fogFar: 5000
        });

        sceneManagerRef.current = sceneManager;

        // Calculer les dimensions du profil
        const profileDimensions: ProfileDimensions = dimensions || {
          length,
          height: parseInt(profileSection) || 200,
          width: profileType.startsWith('HE')
            ? parseInt(profileSection) || 200
            : (parseInt(profileSection) || 200) * 0.5,
          webThickness: (parseInt(profileSection) || 200) * 0.035,
          flangeThickness: (parseInt(profileSection) || 200) * 0.06,
          profileType
        };

        // Créer le profil
        const profileMesh = await createProfile(
          profileType,
          profileSection,
          profileDimensions
        );

        if (profileMesh) {
          // Créer le transformateur DSTV
          const dstvTransformer = new DSTVTransformer(profileDimensions);

          // Appliquer les trous avec CSG si nécessaire
          let finalMesh = profileMesh;

          if (holes.length > 0) {
            // Option 1: Utiliser CSG pour enlever la matière (production)
            const csgAdapter = new CSGHoleAdapter(dstvTransformer);

            // Convertir les trous au format CSGHole
            const csgHoles: CSGHole[] = holes.map((hole, index) => ({
              id: hole.id || `hole-${index}`,
              coordinate: {
                face: hole.coordinates.face as DSTVFace,
                x: hole.coordinates.x,
                y: hole.coordinates.y,
                z: hole.coordinates.z
              },
              diameter: hole.diameter,
              isThrough: hole.isThrough !== false,
              depth: hole.depth
            }));

            // Appliquer les trous à la géométrie
            const processedGeometry = csgAdapter.applyHoles(
              profileMesh.geometry,
              csgHoles
            );

            // Créer un nouveau mesh avec la géométrie modifiée
            finalMesh = new THREE.Mesh(processedGeometry, profileMesh.material);
            finalMesh.name = profileMesh.name;
            finalMesh.castShadow = profileMesh.castShadow;
            finalMesh.receiveShadow = profileMesh.receiveShadow;

            // Nettoyer l'ancien mesh
            profileMesh.geometry.dispose();

            // Option 2: Afficher aussi les trous visuellement (pour debug/preview)
            if (showLabels) {
              const holeGenerator = new HoleGenerator(dstvTransformer, {
                showLabels,
                holeOpacity: 0.4,
                labelSize: 8
              });

              // Convertir les trous au format HoleDefinition
              const holeDefinitions: HoleDefinition[] = holes.map((hole, index) => ({
                id: hole.id || `hole-${index}`,
                label: hole.label,
                diameter: hole.diameter,
                coordinate: {
                  face: hole.coordinates.face as DSTVFace,
                  x: hole.coordinates.x,
                  y: hole.coordinates.y,
                  z: hole.coordinates.z
                },
                isThrough: hole.isThrough !== false,
                depth: hole.depth
              }));

              const holesGroup = holeGenerator.generateHoles(holeDefinitions);
              sceneManager.addHoles(holesGroup);
            }
          }

          // Ajouter le profil final à la scène
          sceneManager.addProfile(finalMesh);

          // Centrer la caméra sur le profil final
          sceneManager.focusOnObject(finalMesh, 1.8);

          // Démarrer l'animation
          sceneManager.animate();

          if (mounted) {
            setIsLoading(false);
            if (onLoad) onLoad();
          }
        }
      } catch (err) {
        console.error('Erreur lors de l\'initialisation de la scène:', err);
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
      if (sceneManagerRef.current) {
        sceneManagerRef.current.onResize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
    };
  }, [profileType, profileSection, length, dimensions, holes, showGrid, showAxes, showLabels]);

  /**
   * Crée le mesh du profil en utilisant les générateurs existants
   */
  async function createProfile(
    type: string,
    section: string,
    dims: ProfileDimensions
  ): Promise<THREE.Mesh> {
    let geometry: THREE.BufferGeometry;

    // Sélectionner le bon générateur
    switch (type) {
      case 'IPE':
      case 'HEA':
      case 'HEB':
      case 'HEM': {
        const generator = new IProfileGenerator();
        geometry = generator.generate(dims as any, dims.length);
        break;
      }

      case 'UPN':
      case 'UAP': {
        const generator = new UProfileGenerator();
        geometry = generator.generate(dims as any, dims.length);
        break;
      }

      case 'L': {
        const generator = new LProfileGenerator();
        geometry = generator.generate(dims as any, dims.length);
        break;
      }

      case 'TUBES_RECT':
      case 'TUBES_CARRE':
      case 'TUBES_ROND': {
        const generator = new TubeGenerator();
        geometry = generator.generate(dims as any, dims.length);
        break;
      }

      default: {
        const generator = new PlateGenerator();
        geometry = generator.generate(dims as any, dims.length);
        break;
      }
    }

    // Créer le matériau métallique
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8899aa,
      metalness: 0.85,
      roughness: 0.25,
      clearcoat: 0.1,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${type}_${section}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: '#1a1a1a'
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          <div>Chargement du modèle 3D...</div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            {profileType} {profileSection} - L={length}mm
          </div>
        </div>
      )}

      {error && (
        <div style={{
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
        }}>
          <div>⚠️ Erreur de chargement</div>
          <div style={{ marginTop: '10px', fontSize: '12px' }}>{error}</div>
        </div>
      )}

      {/* Overlay d'informations */}
      {!isLoading && !error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'white',
          fontSize: '12px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <div>{profileType} {profileSection}</div>
          <div>L: {length}mm</div>
          {holes.length > 0 && <div>Trous: {holes.length}</div>}
        </div>
      )}

      {/* Contrôles */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        display: 'flex',
        gap: '5px'
      }}>
        <button
          onClick={() => {
            if (sceneManagerRef.current) {
              sceneManagerRef.current.toggleGrid(!showGrid);
            }
          }}
          style={{
            padding: '5px 10px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: '1px solid #444',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {showGrid ? '🔳' : '⬜'} Grille
        </button>

        <button
          onClick={() => {
            if (sceneManagerRef.current) {
              sceneManagerRef.current.setShadows(true);
            }
          }}
          style={{
            padding: '5px 10px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: '1px solid #444',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          💡 Ombres
        </button>
      </div>
    </div>
  );
};

export default Viewer3D;