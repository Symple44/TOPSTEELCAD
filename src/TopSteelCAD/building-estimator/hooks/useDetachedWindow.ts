/**
 * Hook pour gérer une fenêtre détachée (pop-out window)
 * Permet d'ouvrir un composant React dans une fenêtre séparée du navigateur
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

interface DetachedWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export const useDetachedWindow = (options: DetachedWindowOptions = {}) => {
  const {
    title = 'Fenêtre détachée',
    width = 1000,
    height = 800,
    left = 100,
    top = 100
  } = options;

  const windowRef = useRef<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openWindow = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus();
      return;
    }

    // Créer une nouvelle fenêtre
    const newWindow = window.open(
      '',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!newWindow) {
      console.error('Impossible d\'ouvrir la fenêtre détachée');
      return;
    }

    windowRef.current = newWindow;

    // Copier les styles de la fenêtre parent
    const stylesheets = Array.from(document.styleSheets);
    stylesheets.forEach((stylesheet) => {
      try {
        if (stylesheet.href) {
          const link = newWindow.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = stylesheet.href;
          newWindow.document.head.appendChild(link);
        } else if (stylesheet.cssRules) {
          const style = newWindow.document.createElement('style');
          Array.from(stylesheet.cssRules).forEach((rule) => {
            style.appendChild(newWindow.document.createTextNode(rule.cssText));
          });
          newWindow.document.head.appendChild(style);
        }
      } catch (e) {
        console.warn('Impossible de copier la feuille de style:', e);
      }
    });

    // Ajouter un style de base
    const baseStyle = newWindow.document.createElement('style');
    baseStyle.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow: hidden;
      }
      #detached-root {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      }
    `;
    newWindow.document.head.appendChild(baseStyle);

    // Définir le titre
    newWindow.document.title = title;

    // Créer le conteneur root
    const container = newWindow.document.createElement('div');
    container.id = 'detached-root';
    newWindow.document.body.appendChild(container);

    containerRef.current = container;

    // Créer le root React
    rootRef.current = createRoot(container);

    // Gérer la fermeture de la fenêtre
    newWindow.addEventListener('beforeunload', () => {
      closeWindow();
    });

    setIsOpen(true);
  }, [width, height, left, top, title]);

  const closeWindow = useCallback(() => {
    if (rootRef.current) {
      rootRef.current.unmount();
      rootRef.current = null;
    }

    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
    }

    windowRef.current = null;
    containerRef.current = null;
    setIsOpen(false);
  }, []);

  const renderInWindow = useCallback((content: React.ReactElement) => {
    if (rootRef.current && containerRef.current) {
      rootRef.current.render(content);
    }
  }, []);

  // Nettoyer lors du démontage du composant
  useEffect(() => {
    return () => {
      closeWindow();
    };
  }, [closeWindow]);

  return {
    isOpen,
    openWindow,
    closeWindow,
    renderInWindow,
    windowRef: windowRef.current
  };
};
