'use client';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, FileText, Database, FileImage, Layers } from 'lucide-react';

interface ExportModalProps {
  theme: 'light' | 'dark';
  selectedCount: number;
  totalCount: number;
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'dstv' | 'obj' | 'gltf' | 'csv', options: ExportOptions) => void;
}

interface ExportOptions {
  selectedOnly: boolean;
  includeMetadata: boolean;
  includeFeatures: boolean;
  precision: number;
}

const formatConfigs = {
  json: {
    name: 'JSON',
    description: 'Format natif TopSteelCAD avec toutes les données',
    icon: FileText,
    extension: '.json',
    recommended: true
  },
  dstv: {
    name: 'DSTV',
    description: 'Standard allemand (ZIP avec 1 fichier NC par pièce)',
    icon: Database,
    extension: '.zip',
    recommended: true
  },
  csv: {
    name: 'CSV',
    description: 'Données tabulaires pour analyse',
    icon: Layers,
    extension: '.csv',
    recommended: false
  },
  obj: {
    name: 'OBJ',
    description: 'Géométries 3D (en développement)',
    icon: FileImage,
    extension: '.obj',
    recommended: false,
    disabled: true
  },
  gltf: {
    name: 'GLTF',
    description: 'Modèles 3D complets (en développement)',
    icon: FileImage,
    extension: '.gltf',
    recommended: false,
    disabled: true
  }
};

export const ExportModal: React.FC<ExportModalProps> = ({
  theme,
  selectedCount,
  totalCount,
  isOpen,
  onClose,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<keyof typeof formatConfigs>('json');
  const [options, setOptions] = useState<ExportOptions>({
    selectedOnly: selectedCount > 0,
    includeMetadata: true,
    includeFeatures: true,
    precision: 2
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // Gestion de l'animation d'ouverture
  React.useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Animation terminée après 300ms
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedFormat, options);
    onClose();
  };

  const modalStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isAnimating ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.3s ease',
    zIndex: 10000, // Augmenté pour être au-dessus de tout
    padding: '2rem'
  };

  const contentStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    width: '32rem',
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
    opacity: isAnimating ? 0 : 1,
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    position: 'relative' as const,
    // Scrollbar custom
    scrollbarWidth: 'thin' as const,
    scrollbarColor: theme === 'dark' ? '#4b5563 #1f2937' : '#d1d5db #ffffff'
  };

  const elementsToExport = options.selectedOnly ? selectedCount : totalCount;

  return ReactDOM.createPortal(
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            color: theme === 'dark' ? '#f9fafb' : '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Download size={20} />
            Exporter la scène
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sélection du format */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            margin: '0 0 0.75rem 0',
            fontSize: '1rem',
            fontWeight: '500',
            color: theme === 'dark' ? '#f9fafb' : '#111827'
          }}>
            Format d'export
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(formatConfigs).map(([format, config]) => {
              const Icon = config.icon;
              const isSelected = selectedFormat === format;
              const isDisabled = (config as any).disabled;
              
              return (
                <button
                  key={format}
                  onClick={() => !isDisabled && setSelectedFormat(format as keyof typeof formatConfigs)}
                  disabled={isDisabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: isSelected 
                      ? (theme === 'dark' ? '#3b82f6' : '#dbeafe')
                      : 'transparent',
                    color: isSelected 
                      ? '#ffffff' 
                      : isDisabled
                        ? (theme === 'dark' ? '#6b7280' : '#9ca3af')
                        : (theme === 'dark' ? '#f9fafb' : '#111827'),
                    border: `1px solid ${isSelected 
                      ? (theme === 'dark' ? '#3b82f6' : '#3b82f6')
                      : (theme === 'dark' ? '#374151' : '#e5e7eb')}`,
                    borderRadius: '0.5rem',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    textAlign: 'left' as const
                  }}
                >
                  <Icon size={18} />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{ fontWeight: '500' }}>{config.name}</span>
                      <span style={{ 
                        fontSize: '0.75rem',
                        opacity: 0.7
                      }}>{config.extension}</span>
                      {config.recommended && (
                        <span style={{
                          fontSize: '0.625rem',
                          backgroundColor: theme === 'dark' ? '#059669' : '#d1fae5',
                          color: theme === 'dark' ? '#ffffff' : '#059669',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontWeight: '500'
                        }}>
                          Recommandé
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.8,
                      lineHeight: '1.2'
                    }}>
                      {config.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options d'export */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            margin: '0 0 0.75rem 0',
            fontSize: '1rem',
            fontWeight: '500',
            color: theme === 'dark' ? '#f9fafb' : '#111827'
          }}>
            Options
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Éléments à exporter */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: selectedCount > 0 ? 'pointer' : 'default',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                <input
                  type="checkbox"
                  checked={options.selectedOnly && selectedCount > 0}
                  disabled={selectedCount === 0}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    selectedOnly: e.target.checked 
                  }))}
                  style={{ cursor: selectedCount > 0 ? 'pointer' : 'default' }}
                />
                <span>
                  Exporter uniquement les éléments sélectionnés 
                  ({selectedCount} sur {totalCount})
                </span>
              </label>
            </div>

            {/* Métadonnées */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                <input
                  type="checkbox"
                  checked={options.includeMetadata}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    includeMetadata: e.target.checked 
                  }))}
                />
                <span>Inclure les métadonnées</span>
              </label>
            </div>

            {/* Features */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}>
                <input
                  type="checkbox"
                  checked={options.includeFeatures}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    includeFeatures: e.target.checked 
                  }))}
                />
                <span>Inclure les usinages (trous, découpes, etc.)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Résumé */}
        <div style={{
          backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            fontSize: '0.875rem',
            color: theme === 'dark' ? '#d1d5db' : '#4b5563',
            marginBottom: '0.25rem'
          }}>
            Export : {elementsToExport} éléments → {formatConfigs[selectedFormat].name}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280'
          }}>
            {formatConfigs[selectedFormat].description}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Download size={16} />
            Exporter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};