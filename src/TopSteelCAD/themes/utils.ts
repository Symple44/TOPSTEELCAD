/**
 * Utilitaires pour le système de thèmes
 */

import { ThemeConfig, ThemeColors } from './types';
import { lightTheme, darkTheme } from './presets';

/**
 * Crée un nouveau thème en étendant un thème de base
 */
export function createTheme(
  base: 'light' | 'dark' | ThemeConfig,
  overrides: Partial<ThemeConfig>
): ThemeConfig {
  const baseTheme = typeof base === 'string' 
    ? (base === 'dark' ? darkTheme : lightTheme)
    : base;
  
  return mergeThemes(baseTheme, overrides);
}

/**
 * Fusionne deux configurations de thème
 */
export function mergeThemes(
  base: ThemeConfig,
  overrides: Partial<ThemeConfig>
): ThemeConfig {
  return {
    ...base,
    ...overrides,
    colors: {
      ...base.colors,
      ...(overrides.colors || {}),
      background: {
        ...base.colors.background,
        ...(overrides.colors?.background || {}),
      },
      text: {
        ...base.colors.text,
        ...(overrides.colors?.text || {}),
      },
      border: {
        ...base.colors.border,
        ...(overrides.colors?.border || {}),
      },
      state: {
        ...base.colors.state,
        ...(overrides.colors?.state || {}),
      },
      scene: {
        ...base.colors.scene,
        ...(overrides.colors?.scene || {}),
        grid: {
          ...base.colors.scene.grid,
          ...(overrides.colors?.scene?.grid || {}),
          axes: {
            ...base.colors.scene.grid.axes,
            ...(overrides.colors?.scene?.grid?.axes || {}),
          },
        },
        selection: {
          ...base.colors.scene.selection,
          ...(overrides.colors?.scene?.selection || {}),
        },
        lighting: {
          ...base.colors.scene.lighting,
          ...(overrides.colors?.scene?.lighting || {}),
        },
        materials: {
          ...base.colors.scene.materials,
          ...(overrides.colors?.scene?.materials || {}),
        },
      },
    },
    typography: {
      ...base.typography,
      ...(overrides.typography || {}),
      fontFamily: {
        ...base.typography.fontFamily,
        ...(overrides.typography?.fontFamily || {}),
      },
      fontSize: {
        ...base.typography.fontSize,
        ...(overrides.typography?.fontSize || {}),
      },
      fontWeight: {
        ...base.typography.fontWeight,
        ...(overrides.typography?.fontWeight || {}),
      },
      lineHeight: {
        ...base.typography.lineHeight,
        ...(overrides.typography?.lineHeight || {}),
      },
    },
    spacing: {
      ...base.spacing,
      ...(overrides.spacing || {}),
    },
    borderRadius: {
      ...base.borderRadius,
      ...(overrides.borderRadius || {}),
    },
    shadows: {
      ...base.shadows,
      ...(overrides.shadows || {}),
    },
    transitions: {
      ...base.transitions,
      ...(overrides.transitions || {}),
      easing: {
        ...base.transitions.easing,
        ...(overrides.transitions?.easing || {}),
      },
    },
    breakpoints: {
      ...base.breakpoints,
      ...(overrides.breakpoints || {}),
    },
    zIndex: {
      ...base.zIndex,
      ...(overrides.zIndex || {}),
    },
  };
}

/**
 * Génère une palette de couleurs à partir d'une couleur de base
 */
export function generatePalette(baseColor: string): {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
} {
  // Convertir en HSL pour manipulation
  const hsl = hexToHSL(baseColor);
  
  return {
    50: hslToHex({ ...hsl, l: 95 }),
    100: hslToHex({ ...hsl, l: 90 }),
    200: hslToHex({ ...hsl, l: 80 }),
    300: hslToHex({ ...hsl, l: 70 }),
    400: hslToHex({ ...hsl, l: 60 }),
    500: baseColor, // Couleur de base
    600: hslToHex({ ...hsl, l: 40 }),
    700: hslToHex({ ...hsl, l: 30 }),
    800: hslToHex({ ...hsl, l: 20 }),
    900: hslToHex({ ...hsl, l: 10 }),
  };
}

/**
 * Convertit une couleur hex en HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Enlever le # si présent
  hex = hex.replace('#', '');
  
  // Convertir en RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convertit HSL en hex
 */
function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Vérifie si une couleur est claire ou sombre
 */
export function isLightColor(color: string): boolean {
  // Enlever le # si présent
  color = color.replace('#', '');
  
  // Convertir en RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculer la luminosité perçue
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128;
}

/**
 * Obtient une couleur de contraste pour le texte
 */
export function getContrastColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

/**
 * Applique une opacité à une couleur hex
 */
export function applyOpacity(color: string, opacity: number): string {
  // Enlever le # si présent
  color = color.replace('#', '');
  
  // Convertir en RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Mélange deux couleurs
 */
export function mixColors(color1: string, color2: string, ratio = 0.5): string {
  // Enlever les # si présents
  color1 = color1.replace('#', '');
  color2 = color2.replace('#', '');
  
  // Convertir en RGB
  const r1 = parseInt(color1.substring(0, 2), 16);
  const g1 = parseInt(color1.substring(2, 4), 16);
  const b1 = parseInt(color1.substring(4, 6), 16);
  
  const r2 = parseInt(color2.substring(0, 2), 16);
  const g2 = parseInt(color2.substring(2, 4), 16);
  const b2 = parseInt(color2.substring(4, 6), 16);
  
  // Mélanger
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  // Convertir en hex
  const toHex = (x: number) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Génère des variations de couleur
 */
export function generateColorVariations(baseColor: string): {
  lighter: string;
  light: string;
  base: string;
  dark: string;
  darker: string;
} {
  const hsl = hexToHSL(baseColor);
  
  return {
    lighter: hslToHex({ ...hsl, l: Math.min(100, hsl.l + 20) }),
    light: hslToHex({ ...hsl, l: Math.min(100, hsl.l + 10) }),
    base: baseColor,
    dark: hslToHex({ ...hsl, l: Math.max(0, hsl.l - 10) }),
    darker: hslToHex({ ...hsl, l: Math.max(0, hsl.l - 20) }),
  };
}