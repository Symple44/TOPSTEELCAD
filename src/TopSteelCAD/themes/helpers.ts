/**
 * Helpers pour appliquer les thèmes aux composants
 */

import { ThemeConfig, ComponentVariant, ComponentSize, ThemeColors } from './types';
import { CSSProperties } from 'react';

/**
 * Obtient les styles CSS pour un composant thémé
 */
export function getThemedStyles(
  theme: ThemeConfig,
  component: string,
  variant?: ComponentVariant,
  size?: ComponentSize,
  customStyles?: CSSProperties
): CSSProperties {
  const baseStyles = getBaseStyles(theme, component);
  const variantStyles = variant ? getVariantStyles(theme, component, variant) : {};
  const sizeStyles = size ? getSizeStyles(theme, component, size) : {};
  
  return {
    ...baseStyles,
    ...variantStyles,
    ...sizeStyles,
    ...customStyles,
  };
}

/**
 * Styles de base par composant
 */
function getBaseStyles(theme: ThemeConfig, component: string): CSSProperties {
  const styles: Record<string, CSSProperties> = {
    button: {
      fontFamily: theme.typography.fontFamily.sans,
      fontWeight: theme.typography.fontWeight.medium,
      borderRadius: theme.borderRadius.md,
      transition: `all ${theme.transitions.fast} ${theme.transitions.easing.easeInOut}`,
      cursor: 'pointer',
      outline: 'none',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[2],
    },
    
    input: {
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.base,
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border.default}`,
      backgroundColor: theme.colors.background.panel,
      color: theme.colors.text.primary,
      transition: `all ${theme.transitions.fast} ${theme.transitions.easing.easeInOut}`,
      outline: 'none',
      width: '100%',
    },
    
    panel: {
      backgroundColor: theme.colors.background.panel,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.md,
      border: `1px solid ${theme.colors.border.default}`,
      overflow: 'hidden',
    },
    
    card: {
      backgroundColor: theme.colors.background.panel,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.base,
      border: `1px solid ${theme.colors.border.subtle}`,
      padding: theme.spacing[4],
    },
    
    modal: {
      backgroundColor: theme.colors.background.modal,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadows['2xl'],
      border: `1px solid ${theme.colors.border.default}`,
      maxWidth: '90vw',
      maxHeight: '90vh',
    },
    
    toolbar: {
      backgroundColor: theme.colors.background.toolbar,
      borderBottom: `1px solid ${theme.colors.border.default}`,
      padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    
    statusbar: {
      backgroundColor: theme.colors.background.statusBar,
      borderTop: `1px solid ${theme.colors.border.default}`,
      padding: `${theme.spacing[1]} ${theme.spacing[4]}`,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    tooltip: {
      backgroundColor: theme.isDark 
        ? theme.colors.background.panel 
        : theme.colors.text.primary,
      color: theme.isDark 
        ? theme.colors.text.primary 
        : theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.sm,
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      borderRadius: theme.borderRadius.md,
      boxShadow: theme.shadows.lg,
      zIndex: theme.zIndex.tooltip,
    },
    
    dropdown: {
      backgroundColor: theme.colors.background.panel,
      border: `1px solid ${theme.colors.border.default}`,
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.xl,
      zIndex: theme.zIndex.dropdown,
      overflow: 'hidden',
    },
  };
  
  return styles[component] || {};
}

/**
 * Styles par variante
 */
function getVariantStyles(
  theme: ThemeConfig,
  component: string,
  variant: ComponentVariant
): CSSProperties {
  if (component === 'button') {
    const variants: Record<ComponentVariant, CSSProperties> = {
      primary: {
        backgroundColor: theme.colors.primary,
        color: theme.colors.text.inverse,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
        color: theme.colors.text.inverse,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.colors.text.primary,
      },
      danger: {
        backgroundColor: theme.colors.state.error,
        color: theme.colors.text.inverse,
      },
      success: {
        backgroundColor: theme.colors.state.success,
        color: theme.colors.text.inverse,
      },
      warning: {
        backgroundColor: theme.colors.state.warning,
        color: theme.colors.text.primary,
      },
    };
    
    return variants[variant] || {};
  }
  
  return {};
}

/**
 * Styles par taille
 */
function getSizeStyles(
  theme: ThemeConfig,
  component: string,
  size: ComponentSize
): CSSProperties {
  if (component === 'button') {
    const sizes: Record<ComponentSize, CSSProperties> = {
      xs: {
        fontSize: theme.typography.fontSize.xs,
        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
        height: '24px',
      },
      sm: {
        fontSize: theme.typography.fontSize.sm,
        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
        height: '32px',
      },
      md: {
        fontSize: theme.typography.fontSize.base,
        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
        height: '40px',
      },
      lg: {
        fontSize: theme.typography.fontSize.lg,
        padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
        height: '48px',
      },
      xl: {
        fontSize: theme.typography.fontSize.xl,
        padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
        height: '56px',
      },
    };
    
    return sizes[size] || {};
  }
  
  if (component === 'input') {
    const sizes: Record<ComponentSize, CSSProperties> = {
      xs: {
        fontSize: theme.typography.fontSize.xs,
        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
        height: '24px',
      },
      sm: {
        fontSize: theme.typography.fontSize.sm,
        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
        height: '32px',
      },
      md: {
        fontSize: theme.typography.fontSize.base,
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        height: '40px',
      },
      lg: {
        fontSize: theme.typography.fontSize.lg,
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
        height: '48px',
      },
      xl: {
        fontSize: theme.typography.fontSize.xl,
        padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
        height: '56px',
      },
    };
    
    return sizes[size] || {};
  }
  
  return {};
}

/**
 * Applique le thème à un élément HTML
 */
export function applyTheme(element: HTMLElement, theme: ThemeConfig): void {
  // Appliquer les variables CSS
  const root = element.style;
  
  // Couleurs
  root.setProperty('--color-primary', theme.colors.primary);
  root.setProperty('--color-secondary', theme.colors.secondary);
  root.setProperty('--color-accent', theme.colors.accent);
  
  // Arrière-plans
  root.setProperty('--bg-canvas', theme.colors.background.canvas);
  root.setProperty('--bg-panel', theme.colors.background.panel);
  root.setProperty('--bg-toolbar', theme.colors.background.toolbar);
  root.setProperty('--bg-statusbar', theme.colors.background.statusBar);
  
  // Texte
  root.setProperty('--text-primary', theme.colors.text.primary);
  root.setProperty('--text-secondary', theme.colors.text.secondary);
  root.setProperty('--text-disabled', theme.colors.text.disabled);
  
  // Bordures
  root.setProperty('--border-default', theme.colors.border.default);
  root.setProperty('--border-subtle', theme.colors.border.subtle);
  root.setProperty('--border-strong', theme.colors.border.strong);
  
  // États
  root.setProperty('--state-hover', theme.colors.state.hover);
  root.setProperty('--state-active', theme.colors.state.active);
  root.setProperty('--state-selected', theme.colors.state.selected);
  
  // Typographie
  root.setProperty('--font-sans', theme.typography.fontFamily.sans);
  root.setProperty('--font-mono', theme.typography.fontFamily.mono);
  
  // Espacements
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.setProperty(`--spacing-${key}`, value);
  });
  
  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.setProperty(`--radius-${key}`, value);
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.setProperty(`--shadow-${key}`, value);
  });
}

/**
 * Génère une classe CSS à partir du thème
 */
/**
 * Crée un nouveau thème avec les couleurs spécifiées
 */
export function createTheme(id: string, name: string, colors: Partial<ThemeColors>): ThemeConfig {
  // Fusionner avec les couleurs par défaut
  const defaultColors: ThemeColors = {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryActive: '#1d4ed8',
    secondary: '#8b5cf6',
    secondaryHover: '#7c3aed',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    background: {
      canvas: '#1a1a1a',
      panel: '#262626',
      toolbar: '#171717',
      statusBar: '#0a0a0a',
      modal: '#1f1f1f',
      overlay: 'rgba(0, 0, 0, 0.7)'
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
      disabled: '#6b7280',
      inverse: '#111827',
      link: '#3b82f6',
      linkHover: '#2563eb'
    },
    border: {
      default: '#404040',
      subtle: '#262626',
      strong: '#525252',
      focus: '#3b82f6'
    },
    state: {
      hover: 'rgba(255, 255, 255, 0.05)',
      active: 'rgba(255, 255, 255, 0.1)',
      selected: 'rgba(59, 130, 246, 0.2)',
      error: '#ef4444',
      errorBg: 'rgba(239, 68, 68, 0.1)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.1)',
      success: '#10b981',
      successBg: 'rgba(16, 185, 129, 0.1)',
      info: '#3b82f6',
      infoBg: 'rgba(59, 130, 246, 0.1)'
    },
    scene: {
      background: '#1a1a1a',
      fog: '#0a0a0a',
      grid: {
        main: '#404040',
        secondary: '#262626',
        axes: {
          x: '#ef4444',
          y: '#10b981',
          z: '#3b82f6'
        }
      },
      selection: {
        outline: '#3b82f6',
        highlight: 'rgba(59, 130, 246, 0.3)',
        hover: 'rgba(59, 130, 246, 0.1)'
      },
      lighting: {
        ambient: 0.4,
        directional: 0.6,
        shadow: 0.5
      },
      materials: {
        default: '#808080',
        metal: '#c0c0c0',
        glass: 'rgba(200, 200, 255, 0.3)',
        plastic: '#606060'
      }
    }
  };
  
  const mergedColors = {
    ...defaultColors,
    ...colors,
    background: { ...defaultColors.background, ...(colors.background || {}) },
    text: { ...defaultColors.text, ...(colors.text || {}) },
    border: { ...defaultColors.border, ...(colors.border || {}) },
    state: { ...defaultColors.state, ...(colors.state || {}) },
    scene: { 
      ...defaultColors.scene,
      ...(colors.scene || {}),
      grid: { ...defaultColors.scene.grid, ...((colors.scene?.grid) || {}) },
      selection: { ...defaultColors.scene.selection, ...((colors.scene?.selection) || {}) },
      lighting: { ...defaultColors.scene.lighting, ...((colors.scene?.lighting) || {}) },
      materials: { ...defaultColors.scene.materials, ...((colors.scene?.materials) || {}) }
    }
  };
  
  return {
    id: id as 'light' | 'dark' | 'custom',
    name,
    colors: mergedColors,
    typography: {
      fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75'
      }
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
      32: '8rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      base: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px'
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      base: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
    },
    transitions: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      easing: {
        linear: 'linear',
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out'
      }
    },
    zIndex: {
      base: 0,
      dropdown: 1000,
      sticky: 1020,
      modal: 1030,
      popover: 1040,
      tooltip: 1050,
      notification: 1060
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    isDark: id === 'dark',
    contrast: 'normal' as const,
    colorScheme: id === 'dark' ? 'dark' as const : 'light' as const
  };
}

export function generateThemeClass(theme: ThemeConfig): string {
  const className = `theme-${theme.id}`;
  
  // Créer une feuille de style si elle n'existe pas
  let styleSheet = document.getElementById(`theme-styles-${theme.id}`);
  
  if (!styleSheet) {
    styleSheet = document.createElement('style');
    styleSheet.id = `theme-styles-${theme.id}`;
    document.head.appendChild(styleSheet);
  }
  
  // Générer le CSS
  const css = `
    .${className} {
      /* Couleurs */
      --color-primary: ${theme.colors.primary};
      --color-secondary: ${theme.colors.secondary};
      --color-accent: ${theme.colors.accent};
      
      /* Arrière-plans */
      --bg-canvas: ${theme.colors.background.canvas};
      --bg-panel: ${theme.colors.background.panel};
      --bg-toolbar: ${theme.colors.background.toolbar};
      --bg-statusbar: ${theme.colors.background.statusBar};
      
      /* Texte */
      --text-primary: ${theme.colors.text.primary};
      --text-secondary: ${theme.colors.text.secondary};
      --text-disabled: ${theme.colors.text.disabled};
      
      /* Bordures */
      --border-default: ${theme.colors.border.default};
      --border-subtle: ${theme.colors.border.subtle};
      --border-strong: ${theme.colors.border.strong};
      
      /* Typographie */
      --font-sans: ${theme.typography.fontFamily.sans};
      --font-mono: ${theme.typography.fontFamily.mono};
    }
  `;
  
  styleSheet.textContent = css;
  
  return className;
}