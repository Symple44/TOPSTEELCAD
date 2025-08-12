/**
 * Thème sombre prédéfini pour TopSteelCAD
 */

import { ThemeConfig } from '../types';

export const darkTheme: ThemeConfig = {
  id: 'dark',
  name: 'Thème Sombre',
  description: 'Thème sombre moderne avec un contraste élevé pour réduire la fatigue oculaire',
  isDark: true,
  contrast: 'normal',
  colorScheme: 'dark',
  
  colors: {
    // Couleurs primaires - Bleu lumineux
    primary: '#60A5FA',
    primaryHover: '#93C5FD',
    primaryActive: '#3B82F6',
    secondary: '#A78BFA',
    secondaryHover: '#C4B5FD',
    accent: '#34D399',
    accentHover: '#6EE7B7',
    
    // Arrière-plans
    background: {
      canvas: '#0F172A',
      panel: '#1E293B',
      toolbar: '#1E293B',
      statusBar: '#1E293B',
      modal: '#1E293B',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    
    // Texte
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
      disabled: '#64748B',
      inverse: '#0F172A',
      link: '#60A5FA',
      linkHover: '#93C5FD',
    },
    
    // Bordures
    border: {
      default: '#334155',
      subtle: '#1E293B',
      strong: '#475569',
      focus: '#60A5FA',
    },
    
    // États
    state: {
      hover: '#334155',
      active: '#1E3A8A',
      selected: '#1E40AF',
      error: '#F87171',
      errorBg: '#7F1D1D',
      warning: '#FBBF24',
      warningBg: '#78350F',
      success: '#34D399',
      successBg: '#14532D',
      info: '#60A5FA',
      infoBg: '#1E3A8A',
    },
    
    // 3D Scene
    scene: {
      background: '#0F172A',
      fog: '#1E293B',
      grid: {
        main: '#334155',
        secondary: '#64748B',
        axes: {
          x: '#F87171',
          y: '#34D399',
          z: '#60A5FA',
        },
      },
      selection: {
        outline: '#60A5FA',
        highlight: '#3B82F6',
        hover: '#2563EB',
      },
      lighting: {
        ambient: 0.3,
        directional: 0.7,
        shadow: 0.3,
      },
      materials: {
        default: '#475569',
        metal: '#334155',
        glass: '#1E293B',
        plastic: '#334155',
      },
    },
  },
  
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },
  
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  },
  
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    notification: 1500,
  },
};