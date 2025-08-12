/**
 * Thème clair prédéfini pour TopSteelCAD
 */

import { ThemeConfig } from '../types';

export const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Thème Clair',
  description: 'Thème clair moderne avec des couleurs douces et une bonne lisibilité',
  isDark: false,
  contrast: 'normal',
  colorScheme: 'light',
  
  colors: {
    // Couleurs primaires - Bleu professionnel
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryActive: '#1D4ED8',
    secondary: '#8B5CF6',
    secondaryHover: '#7C3AED',
    accent: '#10B981',
    accentHover: '#059669',
    
    // Arrière-plans
    background: {
      canvas: '#FFFFFF',
      panel: '#F9FAFB',
      toolbar: '#FFFFFF',
      statusBar: '#F3F4F6',
      modal: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Texte
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
      inverse: '#FFFFFF',
      link: '#3B82F6',
      linkHover: '#2563EB',
    },
    
    // Bordures
    border: {
      default: '#E5E7EB',
      subtle: '#F3F4F6',
      strong: '#D1D5DB',
      focus: '#3B82F6',
    },
    
    // États
    state: {
      hover: '#F3F4F6',
      active: '#E0E7FF',
      selected: '#DBEAFE',
      error: '#EF4444',
      errorBg: '#FEE2E2',
      warning: '#F59E0B',
      warningBg: '#FED7AA',
      success: '#10B981',
      successBg: '#D1FAE5',
      info: '#3B82F6',
      infoBg: '#DBEAFE',
    },
    
    // 3D Scene
    scene: {
      background: '#F8FAFC',
      fog: '#E2E8F0',
      grid: {
        main: '#E5E7EB',
        secondary: '#9CA3AF',
        axes: {
          x: '#EF4444',
          y: '#10B981',
          z: '#3B82F6',
        },
      },
      selection: {
        outline: '#3B82F6',
        highlight: '#60A5FA',
        hover: '#93C5FD',
      },
      lighting: {
        ambient: 0.6,
        directional: 1.0,
        shadow: 0.5,
      },
      materials: {
        default: '#94A3B8',
        metal: '#64748B',
        glass: '#CBD5E1',
        plastic: '#E2E8F0',
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
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