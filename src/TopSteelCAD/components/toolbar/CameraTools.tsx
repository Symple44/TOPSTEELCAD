'use client';

import React from 'react';
import { Expand } from 'lucide-react';

interface CameraToolsProps {
  theme: 'light' | 'dark';
  isOrthographic: boolean;
  onToggleProjection: () => void;
}

export const CameraTools: React.FC<CameraToolsProps> = ({
  theme,
  isOrthographic,
  onToggleProjection
}) => {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      <button
        onClick={onToggleProjection}
        title={`Projection ${isOrthographic ? 'Perspective' : 'Orthographique'} (O)`}
        style={{
          padding: '0.625rem',
          backgroundColor: isOrthographic ? (theme === 'dark' ? '#3b82f6' : '#dbeafe') : 'transparent',
          color: isOrthographic ? '#ffffff' : (theme === 'dark' ? '#cbd5e1' : '#475569'),
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (!isOrthographic) {
            e.currentTarget.style.backgroundColor = theme === 'dark' ? '#334155' : '#f1f5f9';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOrthographic) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Expand size={20} />
      </button>
    </div>
  );
};