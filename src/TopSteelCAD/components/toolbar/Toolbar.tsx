'use client';

import React from 'react';
import { NavigationTools } from './NavigationTools';
import { MeasurementTools } from './MeasurementTools';
import { CameraTools } from './CameraTools';
import { VisibilityTools } from './VisibilityTools';
import { ImportExportTools } from './ImportExportTools';

interface ToolbarProps {
  theme: 'light' | 'dark';
  measurementMode: boolean;
  isOrthographic: boolean;
  isolateMode: boolean;
  selectedIds: string[];
  totalElements: number;
  onHome: () => void;
  onScreenshot: () => void;
  onToggleMeasurement: () => void;
  onToggleProjection: () => void;
  onIsolate: () => void;
  onShowAll: () => void;
  onImport: (file: File) => void;
  onExport: (format: 'json' | 'dstv' | 'obj' | 'gltf' | 'csv', options?: any) => void;
  onClearScene?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  theme,
  measurementMode,
  isOrthographic,
  isolateMode,
  selectedIds,
  totalElements,
  onHome,
  onScreenshot,
  onToggleMeasurement,
  onToggleProjection,
  onIsolate,
  onShowAll,
  onImport,
  onExport,
  onClearScene
}) => {
  const separatorStyle = {
    width: '1px',
    backgroundColor: theme === 'dark' ? '#475569' : '#e2e8f0'
  };

  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: '0.75rem',
      padding: '0.5rem 1rem',
      boxShadow: theme === 'dark' 
        ? '0 10px 25px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)' 
        : '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
      zIndex: 1000
    }}>
      {/* Groupe Navigation */}
      <NavigationTools
        theme={theme}
        onHome={onHome}
        onScreenshot={onScreenshot}
      />

      <div style={separatorStyle} />

      {/* Groupe Outils */}
      <MeasurementTools
        theme={theme}
        measurementMode={measurementMode}
        onToggleMeasurement={onToggleMeasurement}
      />

      <div style={separatorStyle} />

      {/* Groupe Caméra */}
      <CameraTools
        theme={theme}
        isOrthographic={isOrthographic}
        onToggleProjection={onToggleProjection}
      />

      <div style={separatorStyle} />

      {/* Groupe Visibilité */}
      <VisibilityTools
        theme={theme}
        isolateMode={isolateMode}
        selectedIds={selectedIds}
        onIsolate={onIsolate}
        onShowAll={onShowAll}
      />

      <div style={separatorStyle} />

      {/* Groupe Import/Export */}
      <ImportExportTools
        theme={theme}
        selectedCount={selectedIds.length}
        totalCount={totalElements}
        onImport={onImport}
        onExport={onExport}
        onClearScene={onClearScene}
      />
    </div>
  );
};