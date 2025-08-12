/**
 * Types pour le système de thèmes unifié TopSteelCAD
 */

export interface ThemeColors {
  // Couleurs primaires
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  accentHover: string;
  
  // Arrière-plans
  background: {
    canvas: string;
    panel: string;
    toolbar: string;
    statusBar: string;
    modal: string;
    overlay: string;
  };
  
  // Texte
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
    link: string;
    linkHover: string;
  };
  
  // Bordures
  border: {
    default: string;
    subtle: string;
    strong: string;
    focus: string;
  };
  
  // États
  state: {
    hover: string;
    active: string;
    selected: string;
    error: string;
    errorBg: string;
    warning: string;
    warningBg: string;
    success: string;
    successBg: string;
    info: string;
    infoBg: string;
  };
  
  // 3D Scene
  scene: {
    background: string;
    fog: string;
    grid: {
      main: string;
      secondary: string;
      axes: {
        x: string;
        y: string;
        z: string;
      };
    };
    selection: {
      outline: string;
      highlight: string;
      hover: string;
    };
    lighting: {
      ambient: number;
      directional: number;
      shadow: number;
    };
    materials: {
      default: string;
      metal: string;
      glass: string;
      plastic: string;
    };
  };
}

export interface ThemeTypography {
  fontFamily: {
    sans: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface ThemeSpacing {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeShadows {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

export interface ThemeTransitions {
  fast: string;
  normal: string;
  slow: string;
  easing: {
    linear: string;
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface ThemeBreakpoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeZIndex {
  base: number;
  dropdown: number;
  sticky: number;
  modal: number;
  popover: number;
  tooltip: number;
  notification: number;
}

export interface ThemeConfig {
  id: 'light' | 'dark' | 'custom';
  name: string;
  description?: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  transitions: ThemeTransitions;
  breakpoints: ThemeBreakpoints;
  zIndex: ThemeZIndex;
  
  // Configuration additionnelle
  isDark: boolean;
  contrast: 'normal' | 'high';
  colorScheme: 'light' | 'dark';
}

// Type pour le contexte du thème
export interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig | 'light' | 'dark') => void;
  toggleTheme: () => void;
  isSystemTheme: boolean;
  setSystemTheme: (useSystem: boolean) => void;
}

// Type pour les variantes de composants
export type ComponentVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Type pour les props de composants thémés
export interface ThemedComponentProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  className?: string;
  style?: React.CSSProperties;
}