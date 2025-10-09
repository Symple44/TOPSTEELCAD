/**
 * Composant Dialog de confirmation
 * Building Estimator - TopSteelCAD
 */

import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  danger = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: danger ? '#fee2e2' : '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}
          >
            {danger ? '⚠️' : 'ℹ️'}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1e293b'
            }}
          >
            {title}
          </h3>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            color: '#475569',
            whiteSpace: 'pre-line'
          }}
        >
          {message}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: '600',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#fff',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              background: danger ? '#dc2626' : '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = danger ? '#b91c1c' : '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = danger ? '#dc2626' : '#2563eb';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
