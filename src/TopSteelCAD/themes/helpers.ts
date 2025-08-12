/**
 * Helpers pour appliquer les thèmes aux composants
 */

import { ThemeConfig, ComponentVariant, ComponentSize } from './types';
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