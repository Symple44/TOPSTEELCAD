import React, { useEffect, useRef, useState } from 'react';
import { ViewCubeRenderer } from './ViewCubeRenderer';
import { ViewCubeInteraction } from './ViewCubeInteraction';
import { CameraController } from '../cameras/CameraController';
import { ViewDirection } from '../3DLibrary/types/camera.types';

interface ViewCubeProps {
  size?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark';
  className?: string;
  cameraController?: CameraController;
  onViewChange?: (view: ViewDirection | string) => void;
  enableDrag?: boolean;
  enableDoubleClick?: boolean;
  animationDuration?: number;
}

/**
 * ViewCube - Composant de navigation 3D moderne avec interaction complète
 */
export const ViewCube: React.FC<ViewCubeProps> = ({
  size = 160,  // Taille par défaut augmentée
  position = 'top-right',
  theme = 'dark',
  className = '',
  cameraController,
  onViewChange,
  enableDrag = true,
  enableDoubleClick = true,
  animationDuration = 500
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ViewCubeRenderer | null>(null);
  const interactionRef = useRef<ViewCubeInteraction | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !cameraController) {
      return;
    }

    // Initialize renderer
    rendererRef.current = new ViewCubeRenderer(containerRef.current, size);
    rendererRef.current.setTheme(theme);

    // Initialize interaction handler
    interactionRef.current = new ViewCubeInteraction(
      rendererRef.current,
      cameraController,
      containerRef.current,
      {
        animationDuration,
        enableDrag,
        enableDoubleClick,
        onViewChange: (view) => {
          onViewChange?.(view);
        }
      }
    );

    setIsInitialized(true);

    // Cleanup
    return () => {
      interactionRef.current?.dispose();
      rendererRef.current?.dispose();
      setIsInitialized(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraController]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (rendererRef.current && size) {
      rendererRef.current.resize(size);
    }
  }, [size]);

  // Sync with main camera on each render frame
  useEffect(() => {
    if (!isInitialized || !cameraController || !interactionRef.current) {
      return;
    }

    const syncCamera = () => {
      const camera = cameraController.getActiveCamera();
      if (camera && interactionRef.current) {
        interactionRef.current.syncWithCamera(camera);
      }
    };

    // Sync on animation frame for smooth updates
    let animationId: number;
    const animate = () => {
      syncCamera();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInitialized, cameraController]);

  // Fallback for when cameraController is not provided
  if (!cameraController) {
    return (
      <div 
        className={`viewcube ${className}`}
        style={{
          width: size,
          height: size,
          position: 'absolute',
          ...getPositionStyles(position),
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${theme === 'dark' ? '#333' : '#ccc'}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme === 'dark' ? '#666' : '#999',
          fontSize: '12px',
          userSelect: 'none'
        }}
      >
        ViewCube (No Camera)
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`viewcube ${className}`}
      style={{
        width: size,
        height: size,
        position: 'absolute',
        ...getPositionStyles(position),
        backgroundColor: theme === 'dark' ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: theme === 'dark' 
          ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
          : '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
        cursor: 'grab',
        transition: 'box-shadow 0.2s ease',
        zIndex: 1000  // S'assurer que le ViewCube reste au-dessus
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 6px 16px rgba(0, 0, 0, 0.4), 0 3px 6px rgba(0, 0, 0, 0.3)'
          : '0 6px 16px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
          : '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)';
      }}
    />
  );
};

function getPositionStyles(position: string) {
  switch (position) {
    case 'top-left':
      return { top: '1rem', left: '1rem' };
    case 'top-right':
      return { top: '1rem', right: '1rem' };
    case 'bottom-left':
      return { bottom: '1rem', left: '1rem' };
    case 'bottom-right':
      return { bottom: '1rem', right: '1rem' };
    default:
      return { top: '1rem', right: '1rem' };
  }
}

export default ViewCube;