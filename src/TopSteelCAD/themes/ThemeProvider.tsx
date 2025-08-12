/**
 * Provider de thème pour TopSteelCAD
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeConfig, ThemeContextValue } from './types';
import { lightTheme, darkTheme } from './presets';

// Contexte du thème
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Hook pour utiliser le thème
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeConfig | 'light' | 'dark';
  storageKey?: string;
  enableSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  storageKey = 'topsteel-theme',
  enableSystem = true,
}) => {
  // État du thème
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    // Thème par défaut
    if (typeof defaultTheme === 'string') {
      return defaultTheme === 'dark' ? darkTheme : lightTheme;
    }
    return defaultTheme;
  });

  const [isSystemTheme, setIsSystemTheme] = useState(false);

  // Fonction pour obtenir le thème système
  const getSystemTheme = useCallback((): ThemeConfig => {
    if (typeof window === 'undefined') return lightTheme;
    
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? darkTheme : lightTheme;
  }, []);

  // Fonction pour charger le thème sauvegardé
  const loadSavedTheme = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Si système est activé
        if (parsed.isSystem && enableSystem) {
          setIsSystemTheme(true);
          setCurrentTheme(getSystemTheme());
        } 
        // Si thème custom
        else if (parsed.theme) {
          setIsSystemTheme(false);
          
          // Si c'est un ID de thème prédéfini
          if (parsed.theme === 'light') {
            setCurrentTheme(lightTheme);
          } else if (parsed.theme === 'dark') {
            setCurrentTheme(darkTheme);
          } else {
            // Thème custom complet
            setCurrentTheme(parsed.theme);
          }
        }
      } else if (enableSystem) {
        // Par défaut, utiliser le thème système si disponible
        setIsSystemTheme(true);
        setCurrentTheme(getSystemTheme());
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }, [storageKey, enableSystem, getSystemTheme]);

  // Fonction pour sauvegarder le thème
  const saveTheme = useCallback((theme: ThemeConfig, isSystem: boolean) => {
    if (typeof window === 'undefined') return;
    
    try {
      const toSave = {
        isSystem,
        theme: isSystem ? null : (theme.id === 'custom' ? theme : theme.id),
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [storageKey]);

  // Fonction pour changer le thème
  const setTheme = useCallback((theme: ThemeConfig | 'light' | 'dark') => {
    let newTheme: ThemeConfig;
    
    if (typeof theme === 'string') {
      newTheme = theme === 'dark' ? darkTheme : lightTheme;
    } else {
      newTheme = theme;
    }
    
    setCurrentTheme(newTheme);
    setIsSystemTheme(false);
    saveTheme(newTheme, false);
    
    // Appliquer les classes CSS au document
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme.isDark ? 'dark' : 'light');
      document.documentElement.style.colorScheme = newTheme.colorScheme;
    }
  }, [saveTheme]);

  // Fonction pour basculer le thème
  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme.isDark ? lightTheme : darkTheme;
    setTheme(newTheme);
  }, [currentTheme, setTheme]);

  // Fonction pour activer/désactiver le thème système
  const setSystemTheme = useCallback((useSystem: boolean) => {
    setIsSystemTheme(useSystem);
    
    if (useSystem) {
      const systemTheme = getSystemTheme();
      setCurrentTheme(systemTheme);
      saveTheme(systemTheme, true);
      
      // Appliquer les classes CSS
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(systemTheme.isDark ? 'dark' : 'light');
        document.documentElement.style.colorScheme = systemTheme.colorScheme;
      }
    } else {
      saveTheme(currentTheme, false);
    }
  }, [currentTheme, getSystemTheme, saveTheme]);

  // Charger le thème au montage
  useEffect(() => {
    loadSavedTheme();
  }, [loadSavedTheme]);

  // Écouter les changements de thème système
  useEffect(() => {
    if (!enableSystem || !isSystemTheme) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (isSystemTheme) {
        const systemTheme = getSystemTheme();
        setCurrentTheme(systemTheme);
        
        // Appliquer les classes CSS
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(systemTheme.isDark ? 'dark' : 'light');
        document.documentElement.style.colorScheme = systemTheme.colorScheme;
      }
    };
    
    // Supporter les anciens navigateurs
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [enableSystem, isSystemTheme, getSystemTheme]);

  // Appliquer le thème initial au document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(currentTheme.isDark ? 'dark' : 'light');
      document.documentElement.style.colorScheme = currentTheme.colorScheme;
    }
  }, [currentTheme]);

  // Valeur du contexte
  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme: currentTheme,
    setTheme,
    toggleTheme,
    isSystemTheme,
    setSystemTheme,
  }), [currentTheme, setTheme, toggleTheme, isSystemTheme, setSystemTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// HOC pour wrapper un composant avec le thème
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: ThemeConfig }>
): React.FC<P> {
  return function ThemedComponent(props: P) {
    const { theme } = useTheme();
    return <Component {...props} theme={theme} />;
  };
}

// Export du contexte pour des cas d'usage avancés
export { ThemeContext };