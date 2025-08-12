import React from 'react';

interface AxesHelperProps {
  size?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark';
  showLabels?: boolean;
  className?: string;
}

/**
 * AxesHelper - Indicateur d'axes 3D (Version simplifiée)
 */
export const AxesHelper: React.FC<AxesHelperProps> = ({
  size = 80,
  position = 'bottom-left',
  theme = 'dark',
  showLabels = true,
  className = ''
}) => {
  // Version placeholder temporaire
  return (
    <div 
      className={`axes-helper ${className}`}
      style={{
        width: size,
        height: size,
        position: 'absolute',
        ...getPositionStyles(position),
        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
        border: `1px solid ${theme === 'dark' ? '#333' : '#ccc'}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        userSelect: 'none'
      }}
    >
      {showLabels && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ff0000' }}>X</div>
          <div style={{ color: '#00ff00' }}>Y</div>
          <div style={{ color: '#0000ff' }}>Z</div>
        </div>
      )}
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
      return { bottom: '1rem', left: '1rem' };
  }
}

export default AxesHelper;