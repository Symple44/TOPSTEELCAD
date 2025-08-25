'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PivotElement } from '../types/viewer';
import { Loader2, Home, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { ViewerEngine } from './core/ViewerEngine';
import { ViewCube } from './ui/ViewCube';

/**
 * MinimalViewer - Version épurée avec seulement la 3D et les contrôles essentiels
 * Basé sur la configuration du mode minimal
 */
interface MinimalViewerProps {
  elements?: PivotElement[];
  theme?: 'light' | 'dark';
  onReady?: () => void;
}

export const MinimalViewer: React.FC<MinimalViewerProps> = ({
  elements = [],
  theme = 'dark',
  onReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ViewerEngine | null>(null);
  const cameraControllerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elementsAddedRef = useRef(false);

  // Initialisation du viewer minimal
  useEffect(() => {
    if (canvasRef.current && containerRef.current && !engineRef.current) {
      const initEngine = async () => {
        try {
          engineRef.current = new ViewerEngine();
          
          await engineRef.current.initialize({
            canvas: canvasRef.current!,
            antialias: true,
            shadows: false,
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f8f8',
            maxFPS: 60
          });

          const scene = engineRef.current.getScene();
          if (scene) {
            // Éclairage simple
            const ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight('#ffffff', 0.5);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);
            
            // Grille simple
            const gridHelper = new THREE.GridHelper(10000, 100, '#444444', '#222222');
            scene.add(gridHelper);
            
            // Axes
            const axesHelper = new THREE.AxesHelper(1000);
            scene.add(axesHelper);
          }

          // Position caméra
          const camera = engineRef.current.getCamera();
          if (camera) {
            camera.position.set(3000, 3000, 3000);
            camera.lookAt(0, 0, 0);
          }
          
          // Récupérer le CameraController pour le ViewCube
          cameraControllerRef.current = engineRef.current.getCameraController();

          setIsEngineReady(true);
          onReady?.();
          setIsLoading(false);
        } catch (err) {
          setError('Erreur lors de l\'initialisation');
          setIsLoading(false);
        }
      };

      initEngine();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // Chargement des éléments
  useEffect(() => {
    if (engineRef.current && !elementsAddedRef.current && elements.length > 0) {
      elementsAddedRef.current = true;
      elements.forEach(element => {
        engineRef.current?.addElement(element);
      });
    }
  }, [elements]);

  // Gestion du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        engineRef.current.handleResize(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Méthodes de contrôle
  const fitToView = () => {
    if (!engineRef.current || elements.length === 0) return;
    
    const camera = engineRef.current.getCamera();
    const scene = engineRef.current.getScene();
    
    if (camera && scene) {
      const box = new THREE.Box3();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.elementId) {
          box.expandByObject(child);
        }
      });
      
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.y, size.z) * 2;
        
        camera.position.set(
          center.x + distance,
          center.y + distance,
          center.z + distance
        );
        camera.lookAt(center);
      }
    }
  };

  const zoomIn = () => {
    const camera = engineRef.current?.getCamera();
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      camera.zoom *= 1.2;
      camera.updateProjectionMatrix();
    }
  };

  const zoomOut = () => {
    const camera = engineRef.current?.getCamera();
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      camera.zoom /= 1.2;
      camera.updateProjectionMatrix();
    }
  };

  const showAll = () => {
    const scene = engineRef.current?.getScene();
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = true;
        }
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f0f0f0'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      {/* Contrôles minimaux en haut */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(10px)'
      }}>
        <button
          onClick={fitToView}
          title="Vue d'ensemble (F)"
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Home size={20} />
        </button>
        
        <button
          onClick={zoomIn}
          title="Zoom + (+)"
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ZoomIn size={20} />
        </button>
        
        <button
          onClick={zoomOut}
          title="Zoom - (-)"
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ZoomOut size={20} />
        </button>
        
        <button
          onClick={showAll}
          title="Tout afficher (H)"
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Eye size={20} />
        </button>
      </div>
      
      {/* VIEWCUBE - Cube de navigation 3D */}
      {isEngineReady && cameraControllerRef.current && (
        <ViewCube
          cameraController={cameraControllerRef.current}
          theme={theme}
          size={90}
          position="top-right"
          onViewChange={(view) => {
            console.log(`🎯 ViewCube: Changement de vue vers ${view}`);
          }}
          enableDrag={true}
          enableDoubleClick={true}
          animationDuration={400}
        />
      )}

      {/* Chargement */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Loader2 
            size={48} 
            style={{
              animation: 'spin 1s linear infinite',
              color: '#0ea5e9'
            }}
          />
          <span style={{ color: '#fff' }}>Initialisation de la scène 3D...</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem'
        }}>
          {error}
        </div>
      )}

      {/* Logo minimal */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        TopSteelCAD Minimal
      </div>
    </div>
  );
};

export default MinimalViewer;