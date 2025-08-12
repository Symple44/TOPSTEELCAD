'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ViewerStore } from '../types';

interface ViewerContextValue {
  store: ViewerStore;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

interface ViewerProviderProps {
  store: ViewerStore;
  children: ReactNode;
}

/**
 * Provider pour partager le store du viewer dans l'arbre de composants
 */
export const ViewerProvider: React.FC<ViewerProviderProps> = ({ store, children }) => {
  return (
    <ViewerContext.Provider value={{ store }}>
      {children}
    </ViewerContext.Provider>
  );
};

/**
 * Hook pour accéder au contexte du viewer
 */
export const useViewerContext = () => {
  const context = useContext(ViewerContext);
  
  if (!context) {
    throw new Error('useViewerContext must be used within a ViewerProvider');
  }
  
  return context;
};