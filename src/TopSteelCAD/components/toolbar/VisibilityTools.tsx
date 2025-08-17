'use client';

import React from 'react';
import { Box, Eye } from 'lucide-react';

interface VisibilityToolsProps {
  theme: 'light' | 'dark';
  isolateMode: boolean;
  selectedIds: string[];
  onIsolate: () => void;
  onShowAll: () => void;
}

export const VisibilityTools: React.FC<VisibilityToolsProps> = ({
  theme,
  isolateMode,
  selectedIds,
  onIsolate,
  onShowAll
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#334155' : '#f1f5f9';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      <button
        onClick={onIsolate}
        title="Isoler sélection (I)"
        disabled={selectedIds.length === 0}
        style={{
          padding: '0.625rem',
          backgroundColor: isolateMode ? (theme === 'dark' ? '#3b82f6' : '#dbeafe') : 'transparent',
          color: isolateMode ? '#ffffff' : (theme === 'dark' ? '#cbd5e1' : '#475569'),
          border: 'none',
          borderRadius: '0.375rem',
          cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
          opacity: selectedIds.length === 0 ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
      >
        <Box size={20} />
      </button>
      
      <button
        onClick={onShowAll}
        title="Tout afficher"
        style={{
          padding: '0.625rem',
          backgroundColor: 'transparent',
          color: theme === 'dark' ? '#cbd5e1' : '#475569',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Eye size={20} />
      </button>
    </div>
  );
};