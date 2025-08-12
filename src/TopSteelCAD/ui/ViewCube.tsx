import React from 'react';

interface ViewCubeProps {
  size?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * ViewCube - Composant de navigation 3D (Version simplifiée)
 */
export const ViewCube: React.FC<ViewCubeProps> = ({
  size = 120,
  position = 'top-right',
  theme = 'dark',
  className = ''
}) => {
  // Version placeholder temporaire
  return (
    <div 
      className={`viewcube ${className}`}
      style={{
        width: size,
        height: size,
        position: 'absolute',
        ...getPositionStyles(position),
        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
        border: `1px solid ${theme === 'dark' ? '#333' : '#ccc'}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme === 'dark' ? '#666' : '#999',
        fontSize: '12px',
        userSelect: 'none'
      }}
    >
      ViewCube
    </div>
  );
};

function getPositionStyles(position: string) {
  switch (position) {
    case 'top-left':
      return { top: '1rem', left: '1rem' };
    case 'top-right':
      return { top: '1rem', right: '1rem' };
    case 'bottom-left':
      return { bottom: '1rem', left: '1rem' };
    case 'bottom-right':
      return { bottom: '1rem', right: '1rem' };
    default:
      return { top: '1rem', right: '1rem' };
  }
}

export default ViewCube;