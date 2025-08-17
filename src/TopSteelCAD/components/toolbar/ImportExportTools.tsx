'use client';

import React, { useRef, useState } from 'react';
import { Upload, Download, Trash2 } from 'lucide-react';
import { ExportModal } from './ExportModal';

interface ImportExportToolsProps {
  theme: 'light' | 'dark';
  selectedCount: number;
  totalCount: number;
  onImport: (file: File) => void;
  onExport: (format: 'json' | 'dstv' | 'obj' | 'gltf' | 'csv', options: any) => void;
  onClearScene?: () => void;
}

export const ImportExportTools: React.FC<ImportExportToolsProps> = ({
  theme,
  selectedCount,
  totalCount,
  onImport,
  onExport,
  onClearScene
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset input pour permettre le même fichier
      event.target.value = '';
    }
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleExportConfirm = (format: 'json' | 'dstv' | 'obj' | 'gltf' | 'csv', options: any) => {
    onExport(format, options);
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {/* Input caché pour les fichiers */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dstv,.dwg,.ifc,.json,.obj,.gltf,.glb"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {/* Bouton Import */}
      <button
        onClick={handleImportClick}
        title="Importer un fichier (Ctrl+O)"
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Upload size={20} />
      </button>
      
      {/* Bouton Export */}
      <button
        onClick={handleExportClick}
        title="Exporter la scène (Ctrl+E)"
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Download size={20} />
      </button>
      
      {/* Bouton Vider la scène */}
      {onClearScene && totalCount > 0 && (
        <button
          onClick={() => {
            if (confirm(`Voulez-vous vraiment vider la scène ? ${totalCount} élément(s) seront supprimés.`)) {
              onClearScene();
            }
          }}
          title="Vider la scène"
          style={{
            ...buttonStyle,
            color: theme === 'dark' ? '#f87171' : '#dc2626'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'dark' ? '#7f1d1d' : '#fee2e2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Trash2 size={20} />
        </button>
      )}

      {/* Modal d'export */}
      <ExportModal
        theme={theme}
        selectedCount={selectedCount}
        totalCount={totalCount}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
      />
    </div>
  );
};