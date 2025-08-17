'use client';

import React from 'react';
import { Home, Camera } from 'lucide-react';

interface NavigationToolsProps {
  theme: 'light' | 'dark';
  onHome: () => void;
  onScreenshot: () => void;
}

export const NavigationTools: React.FC<NavigationToolsProps> = ({
  theme,
  onHome,
  onScreenshot
}) => {
  const buttonStyle = {
    padding: '0.625rem',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#cbd5e1' : '#475569',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#334155' : '#f1f5f9';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      <button
        onClick={onHome}
        title="Vue d'ensemble (Home)"
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Home size={20} />
      </button>
      
      <button
        onClick={onScreenshot}
        title="Capture d'écran (S)"
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Camera size={20} />
      </button>
    </div>
  );
};