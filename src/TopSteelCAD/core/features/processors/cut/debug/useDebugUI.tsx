/**
 * useDebugUI.tsx - Hook pour intégrer facilement l'UI de debug
 * Fournit une interface simple pour afficher/masquer le debug
 */

import React, { useState, useCallback } from 'react';
import { configManager, Environment } from '../config/ProductionConfig';

/**
 * Hook pour gérer l'UI de debug
 */
export function useDebugUI() {
  const [debugVisible, setDebugVisible] = useState(() => {
    // Afficher automatiquement en développement
    const config = configManager.getConfig();
    return config.environment === Environment.DEVELOPMENT && 
           config.features.enableDebugUI;
  });

  const [debugPosition, setDebugPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');

  // Basculer la visibilité
  const toggleDebug = useCallback(() => {
    setDebugVisible(prev => !prev);
  }, []);

  // Afficher le debug
  const showDebug = useCallback(() => {
    setDebugVisible(true);
  }, []);

  // Masquer le debug
  const hideDebug = useCallback(() => {
    setDebugVisible(false);
  }, []);

  // Changer la position
  const changePosition = useCallback((position: typeof debugPosition) => {
    setDebugPosition(position);
  }, []);

  // Raccourcis clavier
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D pour toggle debug
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDebug();
      }
      
      // Ctrl+Shift+P pour changer la position
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setDebugPosition(prev => {
          const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
          const currentIndex = positions.indexOf(prev);
          return positions[(currentIndex + 1) % positions.length];
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebug]);

  return {
    debugVisible,
    debugPosition,
    toggleDebug,
    showDebug,
    hideDebug,
    changePosition,
    setDebugVisible,
    setDebugPosition
  };
}

/**
 * Component wrapper pour l'UI de debug avec lazy loading
 */
export const LazyDebugUI = React.lazy(() => 
  import('./DebugUI').then(module => ({ default: module.DebugUI }))
);

/**
 * Component pour intégrer l'UI de debug avec gestion d'état
 */
interface DebugUIWrapperProps {
  defaultVisible?: boolean;
  defaultPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  children?: React.ReactNode;
}

export const DebugUIWrapper: React.FC<DebugUIWrapperProps> = ({
  defaultVisible = false,
  defaultPosition = 'bottom-right',
  children
}) => {
  const {
    debugVisible,
    debugPosition,
    toggleDebug
  } = useDebugUI();

  return (
    <>
      {children}
      
      {/* Bouton flottant pour activer le debug */}
      {!debugVisible && (
        <button
          onClick={toggleDebug}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(33, 150, 243, 0.8)',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Toggle Debug UI (Ctrl+Shift+D)"
        >
          🔧
        </button>
      )}
      
      {/* UI de debug avec lazy loading */}
      <React.Suspense fallback={null}>
        <LazyDebugUI
          visible={debugVisible}
          position={debugPosition}
        />
      </React.Suspense>
    </>
  );
};

/**
 * Hook pour accéder aux métriques de monitoring directement
 */
export function useMonitoringMetrics(updateInterval: number = 2000) {
  const [metrics, setMetrics] = useState<any>(null);

  React.useEffect(() => {
    // Fonction de mise à jour des métriques
    const updateMetrics = () => {
      if ((window as any).__topsteelcad_monitoring) {
        const monitoring = (window as any).__topsteelcad_monitoring;
        setMetrics({
          performance: monitoring.monitor.getAggregatedStats(),
          cache: monitoring.cache.getStats(),
          config: monitoring.config.getConfig()
        });
      }
    };

    // Mise à jour initiale
    updateMetrics();

    // Mise à jour périodique
    const interval = setInterval(updateMetrics, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return metrics;
}

/**
 * HOC pour ajouter le debug à un composant
 */
export function withDebugUI<P extends object>(
  Component: React.ComponentType<P>,
  debugProps?: {
    defaultVisible?: boolean;
    defaultPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  }
) {
  return React.forwardRef<any, P>((props, ref) => {
    return (
      <DebugUIWrapper {...debugProps}>
        <Component {...(props as P)} ref={ref} />
      </DebugUIWrapper>
    );
  });
}

/**
 * Utilitaire pour logger des métriques custom
 */
export function logMetric(operation: string, metadata?: any) {
  if ((window as any).__topsteelcad_monitoring) {
    const monitor = (window as any).__topsteelcad_monitoring.monitor;
    const id = monitor.startOperation(operation, metadata);
    
    return {
      end: (success: boolean = true, error?: string) => {
        monitor.endOperation(id, success, error);
      }
    };
  }
  
  return {
    end: () => {} // No-op si monitoring non disponible
  };
}

/**
 * Exemple d'utilisation dans un composant
 * 
 * ```tsx
 * import { DebugUIWrapper, useDebugUI, logMetric } from './debug/useDebugUI';
 * 
 * function MyComponent() {
 *   const { toggleDebug } = useDebugUI();
 *   
 *   const handleOperation = () => {
 *     const metric = logMetric('myOperation', { data: 'test' });
 *     try {
 *       // Faire quelque chose
 *       metric.end(true);
 *     } catch (error) {
 *       metric.end(false, error.message);
 *     }
 *   };
 *   
 *   return (
 *     <DebugUIWrapper>
 *       <div>
 *         <button onClick={toggleDebug}>Toggle Debug</button>
 *         <button onClick={handleOperation}>Run Operation</button>
 *       </div>
 *     </DebugUIWrapper>
 *   );
 * }
 * ```
 */