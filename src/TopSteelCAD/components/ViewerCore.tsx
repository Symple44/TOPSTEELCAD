import React, { useRef, useEffect, useState } from 'react';
import { PivotElement } from '@/types/viewer';

/**
 * Props du ViewerCore
 */
interface ViewerCoreProps {
  elements?: PivotElement[];
  selectedElementId?: string | null;
  highlightedElementId?: string | null;
  onElementSelect?: (id: string | null) => void;
  onElementHover?: (id: string | null) => void;
  onViewerReady?: (camera: any, controls: any) => void;
  width?: string | number;
  height?: string | number;
  className?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  config?: {
    backgroundColor?: string;
    showGrid?: boolean;
    gridColor?: string;
    sectionColor?: string;
    enableShadows?: boolean;
    antialias?: boolean;
    [key: string]: any; // Permettre des propriétés supplémentaires
  };
}

/**
 * ViewerCore - Composant de base du viewer 3D (Version simplifiée)
 * 
 * Version minimale pour assurer la compilation
 */
export const ViewerCore: React.FC<ViewerCoreProps> = ({
  elements = [],
  selectedElementId: _selectedElementId = null,
  highlightedElementId: _highlightedElementId = null,
  onElementSelect: _onElementSelect,
  onElementHover: _onElementHover,
  onViewerReady: _onViewerReady,
  width = '100%',
  height = '100%',
  className = '',
  onReady,
  onError,
  config: _config = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialisation simulée
    try {
      console.log('🎨 ViewerCore: Initialisation...');
      
      // Simulation d'initialisation
      setTimeout(() => {
        setIsInitialized(true);
        console.log('✅ ViewerCore: Prêt');
        onReady?.();
      }, 100);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ ViewerCore: Erreur d\'initialisation', err);
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [onReady, onError]);

  // Chargement des éléments
  useEffect(() => {
    if (isInitialized && elements.length > 0) {
      console.log(`📦 ViewerCore: Chargement de ${elements.length} éléments`);
      // TODO: Implémenter le chargement réel des éléments
    }
  }, [isInitialized, elements]);

  return (
    <div 
      ref={containerRef}
      className={`viewer-core ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontFamily: 'monospace',
        fontSize: '14px'
      }}
    >
      {error ? (
        <div style={{ color: '#ff4444' }}>
          Erreur: {error}
        </div>
      ) : !isInitialized ? (
        <div>Initialisation...</div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div>ViewerCore 3D</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            {elements.length} élément(s) chargé(s)
          </div>
        </div>
      )}
    </div>
  );
};

// Export par défaut pour compatibilité
export default ViewerCore;