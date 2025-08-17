'use client';

import React from 'react';
import { Ruler } from 'lucide-react';

interface MeasurementToolsProps {
  theme: 'light' | 'dark';
  measurementMode: boolean;
  onToggleMeasurement: () => void;
}

export const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  theme,
  measurementMode,
  onToggleMeasurement
}) => {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      <button
        onClick={onToggleMeasurement}
        title="Mesurer (M)"
        style={{
          padding: '0.625rem',
          backgroundColor: measurementMode ? (theme === 'dark' ? '#3b82f6' : '#dbeafe') : 'transparent',
          color: measurementMode ? '#ffffff' : (theme === 'dark' ? '#cbd5e1' : '#475569'),
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <Ruler size={20} />
      </button>
    </div>
  );
};