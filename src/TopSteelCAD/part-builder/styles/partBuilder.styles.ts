import { CSSProperties } from 'react';

// Constantes de design
const COLORS = {
  primary: '#007bff',
  success: '#28a745',
  secondary: '#6c757d',
  danger: '#dc3545',
  info: '#17a2b8',
  white: '#ffffff',
  background: '#f5f6fa',
  border: '#dee2e6',
  text: {
    primary: '#212529',
    secondary: '#6c757d'
  }
} as const;

const SPACING = {
  xs: '5px',
  sm: '10px',
  md: '15px',
  lg: '20px',
  xl: '30px'
} as const;

// Styles de base réutilisables
export const containerStyle: CSSProperties = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: COLORS.background
};

export const headerStyle: CSSProperties = {
  padding: SPACING.lg,
  backgroundColor: COLORS.white,
  borderBottom: `1px solid ${COLORS.border}`,
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

export const toolbarStyle: CSSProperties = {
  padding: `${SPACING.md} ${SPACING.lg}`,
  backgroundColor: COLORS.white,
  borderBottom: `1px solid ${COLORS.border}`,
  display: 'flex',
  gap: SPACING.sm,
  flexWrap: 'wrap',
  alignItems: 'center'
};

export const getContentStyle = (displayMode: string): CSSProperties => ({
  flex: 1,
  overflow: 'auto',
  padding: displayMode === 'LIST' ? '0' : SPACING.lg
});

export const footerStyle: CSSProperties = {
  padding: `${SPACING.md} ${SPACING.lg}`,
  backgroundColor: COLORS.white,
  borderTop: `1px solid ${COLORS.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

// Styles des boutons
export const buttonStyle: CSSProperties = {
  padding: '8px 16px',
  backgroundColor: COLORS.primary,
  color: COLORS.white,
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  gap: SPACING.xs,
  transition: 'all 0.2s'
};

export const getButtonVariant = (variant: 'primary' | 'success' | 'secondary' | 'info' | 'danger'): CSSProperties => ({
  ...buttonStyle,
  backgroundColor: COLORS[variant]
});

export const getToggleButtonStyle = (active: boolean): CSSProperties => ({
  ...buttonStyle,
  backgroundColor: active ? COLORS.primary : COLORS.secondary
});

export const smallButtonStyle: CSSProperties = {
  ...buttonStyle,
  fontSize: '12px',
  padding: '6px 12px'
};

// Styles des cartes
export const getCardStyle = (isSelected: boolean): CSSProperties => ({
  padding: SPACING.lg,
  backgroundColor: COLORS.white,
  borderRadius: '8px',
  border: isSelected ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
  cursor: 'pointer',
  transition: 'all 0.2s'
  // Note: hover effect should be applied via CSS classes or onMouseEnter/onMouseLeave
});

export const cardGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: SPACING.lg
};

// Styles des modales
export const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000
};

export const modalContentStyle: CSSProperties = {
  backgroundColor: COLORS.white,
  borderRadius: '8px',
  padding: SPACING.lg,
  width: '90%',
  maxWidth: '1000px',
  height: '80vh'
};

export const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: SPACING.lg
};

export const closeButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  padding: SPACING.xs,
  color: COLORS.text.secondary,
  transition: 'color 0.2s'
  // Note: hover effect should be applied via CSS classes or onMouseEnter/onMouseLeave
};

// Styles des formulaires
export const selectStyle: CSSProperties = {
  padding: '8px',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '4px',
  backgroundColor: COLORS.white,
  cursor: 'pointer',
  fontSize: '14px'
};

// Styles pour la toolbar
export const toolbarGroupStyle: CSSProperties = {
  display: 'flex',
  gap: SPACING.xs
};

export const toolbarGroupAutoStyle: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  gap: SPACING.xs
};

// Style pour les inputs cachés
export const hiddenInputStyle: CSSProperties = {
  display: 'none'
};

export const inputStyle: CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '4px',
  fontSize: '14px',
  width: '100%'
};

// Styles de texte
export const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '24px',
  fontWeight: '600',
  color: COLORS.text.primary
};

export const subtitleStyle: CSSProperties = {
  margin: '5px 0 0 0',
  color: COLORS.text.secondary,
  fontSize: '14px'
};

export const labelStyle: CSSProperties = {
  fontSize: '14px',
  color: COLORS.text.secondary,
  marginBottom: SPACING.xs
};

// Styles pour les cartes d'éléments
export const cardTitleStyle: CSSProperties = {
  margin: '0 0 10px 0',
  fontSize: '16px',
  fontWeight: '500'
};

export const cardDetailsStyle: CSSProperties = {
  fontSize: '14px',
  color: COLORS.text.secondary
};

export const cardButtonGroupStyle: CSSProperties = {
  marginTop: SPACING.md,
  display: 'flex',
  gap: SPACING.sm
};

// Styles pour les statistiques du footer
export const footerStatsStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 'normal'
};

export const footerVersionStyle: CSSProperties = {
  fontSize: '12px',
  color: COLORS.text.secondary
};

// Styles pour le modal 3D
export const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontWeight: '500'
};

// Classes CSS pour les hover states (à utiliser avec CSS modules ou styled-components)
export const hoverClasses = {
  card: 'part-builder-card',
  button: 'part-builder-button',
  closeButton: 'part-builder-close-button'
};

// Icônes (centralisées pour faciliter le changement)
export const ICONS = {
  building: '🏗️',
  add: '➕',
  list: '📋',
  grid: '📐',
  import: '📁',
  export: '📤',
  close: '×'
} as const;