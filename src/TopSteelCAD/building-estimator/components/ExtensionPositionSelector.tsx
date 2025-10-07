/**
 * Sélecteur visuel de position pour les extensions
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { ExtensionAttachmentType } from '../types';

interface ExtensionPositionSelectorProps {
  buildingLength: number;
  buildingWidth: number;
  postSpacing: number;
  selectedSide: 'front' | 'back' | 'left' | 'right';
  selectedAttachmentType: ExtensionAttachmentType;
  selectedBayIndex?: number;
  parentName?: string; // Nom du parent (bâtiment ou extension)
  onSideChange: (side: 'front' | 'back' | 'left' | 'right') => void;
  onAttachmentTypeChange: (type: ExtensionAttachmentType) => void;
  onBayIndexChange: (index: number) => void;
}

export const ExtensionPositionSelector: React.FC<ExtensionPositionSelectorProps> = ({
  buildingLength,
  buildingWidth,
  postSpacing,
  selectedSide,
  selectedAttachmentType,
  selectedBayIndex,
  parentName = 'Bâtiment principal',
  onSideChange,
  onAttachmentTypeChange,
  onBayIndexChange
}) => {
  const numberOfBays = Math.max(1, Math.floor(buildingLength / postSpacing));

  // Échelle pour la visualisation (pixels)
  const scale = 400 / Math.max(buildingLength, buildingWidth);
  const visWidth = buildingLength * scale;
  const visHeight = buildingWidth * scale;
  const margin = 70;

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Type d'attachement */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          📍 Type d'attachement
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <button
            onClick={() => onAttachmentTypeChange(ExtensionAttachmentType.LONG_PAN)}
            style={{
              padding: '12px',
              border: selectedAttachmentType === ExtensionAttachmentType.LONG_PAN ? '2px solid #3b82f6' : '2px solid #e2e8f0',
              borderRadius: '8px',
              background: selectedAttachmentType === ExtensionAttachmentType.LONG_PAN ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>📏 Long-pan</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sur toute la longueur</div>
          </button>

          <button
            onClick={() => onAttachmentTypeChange(ExtensionAttachmentType.TRAVEE)}
            style={{
              padding: '12px',
              border: selectedAttachmentType === ExtensionAttachmentType.TRAVEE ? '2px solid #3b82f6' : '2px solid #e2e8f0',
              borderRadius: '8px',
              background: selectedAttachmentType === ExtensionAttachmentType.TRAVEE ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>🔲 Travée</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sur une travée spécifique</div>
          </button>

          <button
            onClick={() => onAttachmentTypeChange(ExtensionAttachmentType.PIGNON_GAUCHE)}
            style={{
              padding: '12px',
              border: selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE ? '2px solid #3b82f6' : '2px solid #e2e8f0',
              borderRadius: '8px',
              background: selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>◀️ Pignon gauche</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Perpendiculaire gauche</div>
          </button>

          <button
            onClick={() => onAttachmentTypeChange(ExtensionAttachmentType.PIGNON_DROIT)}
            style={{
              padding: '12px',
              border: selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT ? '2px solid #3b82f6' : '2px solid #e2e8f0',
              borderRadius: '8px',
              background: selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT ? '#eff6ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>▶️ Pignon droit</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Perpendiculaire droite</div>
          </button>
        </div>
      </div>

      {/* Sélection travée si TRAVEE */}
      {selectedAttachmentType === ExtensionAttachmentType.TRAVEE && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            🔢 Sélectionner la travée
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(numberOfBays, 4)}, 1fr)`, gap: '8px' }}>
            {Array.from({ length: numberOfBays }, (_, i) => (
              <button
                key={i}
                onClick={() => onBayIndexChange(i)}
                style={{
                  padding: '10px',
                  border: selectedBayIndex === i ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                  borderRadius: '6px',
                  background: selectedBayIndex === i ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: selectedBayIndex === i ? '600' : '400'
                }}
              >
                #{i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vue du dessus interactive - Seulement pour LONG_PAN et TRAVEE */}
      {(selectedAttachmentType === ExtensionAttachmentType.LONG_PAN ||
        selectedAttachmentType === ExtensionAttachmentType.TRAVEE) && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            🗺️ Vue du dessus - Sélectionner le côté
          </label>
          <div style={{
            position: 'relative',
            width: visWidth + margin * 2,
            height: visHeight + margin * 2,
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '8px',
            padding: margin,
            border: '2px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
          {/* Bâtiment principal */}
          <div style={{
            position: 'absolute',
            left: margin,
            top: margin,
            width: visWidth,
            height: visHeight,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: '3px solid #1e40af',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}>
            {/* Label bâtiment */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#ffffff',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              letterSpacing: '0.5px',
              textAlign: 'center'
            }}>
              {parentName.toUpperCase()}
            </div>

            {/* Travées si applicable */}
            {selectedAttachmentType === ExtensionAttachmentType.TRAVEE && (
              <>
                {Array.from({ length: numberOfBays }, (_, i) => {
                  const bayWidth = visWidth / numberOfBays;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: i * bayWidth,
                        top: 0,
                        width: bayWidth,
                        height: '100%',
                        border: selectedBayIndex === i ? '3px solid #fbbf24' : '2px dashed rgba(255,255,255,0.5)',
                        background: selectedBayIndex === i ? 'rgba(251, 191, 36, 0.3)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        color: selectedBayIndex === i ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        fontWeight: '700',
                        pointerEvents: 'none',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                      }}
                    >
                      T{i + 1}
                    </div>
                  );
                })}
              </>
            )}

            {/* Dimensions sur le visuel */}
            {/* Longueur (horizontal) */}
            <div style={{
              position: 'absolute',
              bottom: -18,
              left: 0,
              width: '100%',
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#64748b'
            }}>
              {(buildingLength / 1000).toFixed(1)}m
            </div>

            {/* Largeur (vertical) */}
            <div style={{
              position: 'absolute',
              right: -28,
              top: '50%',
              transform: 'translateY(-50%) rotate(90deg)',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#64748b',
              whiteSpace: 'nowrap'
            }}>
              {(buildingWidth / 1000).toFixed(1)}m
            </div>
          </div>

          {/* Boutons de côté - UNIQUEMENT FRONT ET BACK pour Long-Pan et Travée */}
          {/* Avant (Front) - Haut */}
          <button
            onClick={() => onSideChange('front')}
            style={{
              position: 'absolute',
              left: margin,
              top: 10,
              width: visWidth,
              height: 35,
              background: selectedSide === 'front' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f1f5f9',
              color: selectedSide === 'front' ? 'white' : '#475569',
              border: selectedSide === 'front' ? '2px solid #047857' : '2px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '700',
              transition: 'all 0.2s',
              boxShadow: selectedSide === 'front' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            ↑ AVANT
          </button>

          {/* Arrière (Back) - Bas */}
          <button
            onClick={() => onSideChange('back')}
            style={{
              position: 'absolute',
              left: margin,
              top: margin + visHeight + 25,
              width: visWidth,
              height: 35,
              background: selectedSide === 'back' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f1f5f9',
              color: selectedSide === 'back' ? 'white' : '#475569',
              border: selectedSide === 'back' ? '2px solid #047857' : '2px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '700',
              transition: 'all 0.2s',
              boxShadow: selectedSide === 'back' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            ↓ ARRIÈRE
          </button>

          {/* Pignons affichés mais non cliquables - pour indication visuelle */}
          <div style={{
            position: 'absolute',
            left: margin - 60,
            top: margin,
            width: 35,
            height: visHeight,
            background: '#e2e8f0',
            color: '#94a3b8',
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.5
          }}>
            PIGNON G.
          </div>

          <div style={{
            position: 'absolute',
            left: margin + visWidth + 25,
            top: margin,
            width: 35,
            height: visHeight,
            background: '#e2e8f0',
            color: '#94a3b8',
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            writingMode: 'vertical-rl',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.5
          }}>
            PIGNON D.
          </div>
        </div>
      </div>
      )}

      {/* Vue pour les pignons - Seulement pour PIGNON_GAUCHE et PIGNON_DROIT */}
      {(selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE ||
        selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT) && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            🗺️ Vue du dessus - Pignons
          </label>
          <div style={{
            position: 'relative',
            width: visWidth + margin * 2,
            height: visHeight + margin * 2,
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '8px',
            padding: margin,
            border: '2px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {/* Bâtiment principal */}
            <div style={{
              position: 'absolute',
              left: margin,
              top: margin,
              width: visWidth,
              height: visHeight,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: '3px solid #1e40af',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}>
              {/* Label bâtiment */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                {parentName.toUpperCase()}
              </div>

              {/* Dimensions */}
              <div style={{
                position: 'absolute',
                bottom: -18,
                left: 0,
                width: '100%',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#64748b'
              }}>
                {(buildingLength / 1000).toFixed(1)}m
              </div>

              <div style={{
                position: 'absolute',
                right: -28,
                top: '50%',
                transform: 'translateY(-50%) rotate(90deg)',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#64748b',
                whiteSpace: 'nowrap'
              }}>
                {(buildingWidth / 1000).toFixed(1)}m
              </div>
            </div>

            {/* Pignon Gauche */}
            <div style={{
              position: 'absolute',
              left: margin - 60,
              top: margin,
              width: 35,
              height: visHeight,
              background: selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#f1f5f9',
              color: selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE ? 'white' : '#475569',
              border: selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE
                ? '2px solid #047857'
                : '2px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '700',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              boxShadow: selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE
                ? '0 2px 8px rgba(16, 185, 129, 0.4)'
                : '0 1px 3px rgba(0,0,0,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ← PIGNON GAUCHE
            </div>

            {/* Pignon Droit */}
            <div style={{
              position: 'absolute',
              left: margin + visWidth + 25,
              top: margin,
              width: 35,
              height: visHeight,
              background: selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#f1f5f9',
              color: selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT ? 'white' : '#475569',
              border: selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT
                ? '2px solid #047857'
                : '2px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '700',
              writingMode: 'vertical-rl',
              boxShadow: selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT
                ? '0 2px 8px rgba(16, 185, 129, 0.4)'
                : '0 1px 3px rgba(0,0,0,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              → PIGNON DROIT
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          fontSize: '0.95rem',
          color: '#1e3a8a',
          textAlign: 'center',
          fontWeight: '600',
          boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)'
        }}>
          {selectedAttachmentType === ExtensionAttachmentType.LONG_PAN && (
            <>Extension sur <strong>toute la longueur</strong> du côté <strong>{selectedSide === 'front' ? 'AVANT' : 'ARRIÈRE'}</strong></>
          )}
          {selectedAttachmentType === ExtensionAttachmentType.TRAVEE && (
            <>Extension sur la <strong>travée #{(selectedBayIndex || 0) + 1}</strong> du côté <strong>{selectedSide === 'front' ? 'AVANT' : 'ARRIÈRE'}</strong></>
          )}
          {selectedAttachmentType === ExtensionAttachmentType.PIGNON_GAUCHE && (
            <>Extension perpendiculaire sur le <strong>pignon GAUCHE</strong></>
          )}
          {selectedAttachmentType === ExtensionAttachmentType.PIGNON_DROIT && (
            <>Extension perpendiculaire sur le <strong>pignon DROIT</strong></>
          )}
        </div>
    </div>
  );
};
