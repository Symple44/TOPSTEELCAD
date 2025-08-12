import { useState, useCallback, useEffect } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  context?: any;
}

interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  clearError: () => void;
  handleError: (error: any, context?: any) => void;
  isRecoverable: boolean;
}

/**
 * Hook de gestion d'erreurs robuste pour le viewer
 * - Capture et catégorise les erreurs
 * - Fournit des messages utilisateur clairs
 * - Permet la récupération automatique
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isRecoverable, setIsRecoverable] = useState(true);
  
  // Mapper les erreurs techniques en messages utilisateur
  const getErrorMessage = useCallback((error: any): string => {
    if (typeof error === 'string') return error;
    
    if (error?.code) {
      switch (error.code) {
        case 'LOAD_FAILED':
          return 'Impossible de charger le fichier. Vérifiez le format.';
        case 'PARSE_ERROR':
          return 'Format de fichier non reconnu ou corrompu.';
        case 'MEMORY_EXCEEDED':
          return 'Fichier trop volumineux pour être chargé.';
        case 'NETWORK_ERROR':
          return 'Erreur de connexion. Vérifiez votre réseau.';
        case 'PERMISSION_DENIED':
          return 'Accès refusé. Vérifiez vos permissions.';
        case 'WEBGL_NOT_SUPPORTED':
          return 'WebGL non supporté par votre navigateur.';
        default:
          return error.message || 'Une erreur inattendue s\'est produite.';
      }
    }
    
    if (error?.message) {
      // Nettoyer les messages d'erreur techniques
      if (error.message.includes('WebGL')) {
        return 'Problème de rendu 3D détecté. Essayez de rafraîchir la page.';
      }
      if (error.message.includes('memory') || error.message.includes('Memory')) {
        return 'Mémoire insuffisante. Fermez d\'autres applications.';
      }
      if (error.message.includes('network') || error.message.includes('Network')) {
        return 'Problème de connexion réseau.';
      }
      
      return error.message;
    }
    
    return 'Une erreur inattendue s\'est produite.';
  }, []);
  
  // Déterminer la sévérité de l'erreur
  const getErrorSeverity = useCallback((error: any): ErrorInfo['severity'] => {
    if (!error) return 'info';
    
    if (error.code) {
      switch (error.code) {
        case 'WEBGL_NOT_SUPPORTED':
        case 'MEMORY_EXCEEDED':
          return 'critical';
        case 'LOAD_FAILED':
        case 'PARSE_ERROR':
          return 'error';
        case 'NETWORK_ERROR':
        case 'PERMISSION_DENIED':
          return 'warning';
        default:
          return 'error';
      }
    }
    
    // Analyser le message pour déterminer la sévérité
    const message = error.message || error.toString();
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('error') || message.includes('failed')) {
      return 'error';
    }
    if (message.includes('warning') || message.includes('attention')) {
      return 'warning';
    }
    
    return 'error';
  }, []);
  
  // Gestionnaire principal d'erreurs
  const handleError = useCallback((error: any, context?: any) => {
    console.error('Viewer error:', error, context);
    
    const severity = getErrorSeverity(error);
    const errorInfo: ErrorInfo = {
      message: getErrorMessage(error),
      code: error?.code,
      severity,
      timestamp: new Date(),
      context
    };
    
    setError(errorInfo);
    setIsRecoverable(severity !== 'critical');
    
    // Auto-clear pour les avertissements après 5 secondes
    if (severity === 'warning' || severity === 'info') {
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  }, [getErrorMessage, getErrorSeverity]);
  
  // Effacer l'erreur
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Capture globale des erreurs non gérées
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      handleError({
        message: event.message,
        code: 'UNHANDLED_ERROR'
      }, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError({
        message: event.reason?.message || event.reason,
        code: 'UNHANDLED_PROMISE_REJECTION'
      });
    };
    
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);
  
  return {
    error,
    clearError,
    handleError,
    isRecoverable
  };
};