/**
 * Hook pour gérer le responsive design
 * Building Estimator - TopSteelCAD
 */

import { useState, useEffect } from 'react';

/**
 * Types de breakpoints
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Définition des breakpoints (en pixels)
 */
const BREAKPOINTS = {
  xs: 0,     // Mobile portrait
  sm: 640,   // Mobile landscape
  md: 768,   // Tablette
  lg: 1024,  // Desktop
  xl: 1280   // Large desktop
};

/**
 * Hook useResponsive
 * Détecte la taille de l'écran et retourne le breakpoint actuel
 */
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);

      // Déterminer le breakpoint actuel
      if (newWidth < BREAKPOINTS.sm) {
        setBreakpoint('xs');
      } else if (newWidth < BREAKPOINTS.md) {
        setBreakpoint('sm');
      } else if (newWidth < BREAKPOINTS.lg) {
        setBreakpoint('md');
      } else if (newWidth < BREAKPOINTS.xl) {
        setBreakpoint('lg');
      } else {
        setBreakpoint('xl');
      }
    };

    // Initialiser
    handleResize();

    // Écouter les changements de taille
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    width,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl',
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl'
  };
};
