/**
 * Styles pour Building Estimator
 * Building Estimator - TopSteelCAD
 */

import { CSSProperties } from 'react';

// Couleurs
const COLORS = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#64748b',
  success: '#10b981',
  danger: '#ef4444',
  background: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textLight: '#64748b',
  white: '#ffffff'
};

// Container principal
export const containerStyle: CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '20px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: COLORS.white,
  minHeight: '100vh'
};

// Header
export const headerStyle: CSSProperties = {
  marginBottom: '30px',
  borderBottom: `2px solid ${COLORS.border}`,
  paddingBottom: '20px'
};

export const titleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: '600',
  color: COLORS.text,
  margin: 0
};

export const subtitleStyle: CSSProperties = {
  fontSize: '16px',
  color: COLORS.textLight,
  margin: '8px 0 0 0'
};

// Stepper
export const stepperStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '40px',
  padding: '0 20px'
};

export const stepStyle = (isActive: boolean, isCompleted: boolean): CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  cursor: isCompleted ? 'pointer' : 'default'
});

export const stepNumberStyle = (isActive: boolean, isCompleted: boolean): CSSProperties => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: isActive || isCompleted ? COLORS.primary : COLORS.secondary,
  color: COLORS.white,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  marginBottom: '8px',
  fontSize: '18px'
});

export const stepLabelStyle = (isActive: boolean): CSSProperties => ({
  fontSize: '14px',
  color: isActive ? COLORS.primary : COLORS.textLight,
  fontWeight: isActive ? '600' : '400',
  textAlign: 'center'
});

// Form
export const formSectionStyle: CSSProperties = {
  background: COLORS.white,
  borderRadius: '8px',
  padding: '30px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: '20px'
};

export const formRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginBottom: '20px'
};

export const formGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

export const labelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: COLORS.text
};

export const inputStyle: CSSProperties = {
  padding: '10px 12px',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s'
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  background: COLORS.white
};

export const errorStyle: CSSProperties = {
  color: COLORS.danger,
  fontSize: '12px',
  marginTop: '4px'
};

// Buttons
export const buttonGroupStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  marginTop: '30px'
};

export const buttonStyle = (variant: 'primary' | 'secondary' | 'danger' = 'primary'): CSSProperties => {
  const colors = {
    primary: { bg: COLORS.primary, hover: COLORS.primaryHover, text: COLORS.white },
    secondary: { bg: COLORS.secondary, hover: '#475569', text: COLORS.white },
    danger: { bg: COLORS.danger, hover: '#dc2626', text: COLORS.white }
  };

  const color = colors[variant];

  return {
    padding: '10px 20px',
    background: color.bg,
    color: color.text,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };
};

// Table
export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '20px'
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  background: COLORS.background,
  borderBottom: `2px solid ${COLORS.border}`,
  fontSize: '14px',
  fontWeight: '600',
  color: COLORS.text
};

export const tdStyle: CSSProperties = {
  padding: '12px',
  borderBottom: `1px solid ${COLORS.border}`,
  fontSize: '14px',
  color: COLORS.text
};

// Cards
export const cardStyle: CSSProperties = {
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px'
};

export const cardTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: COLORS.text,
  marginBottom: '12px'
};

// Viewer 3D container
export const viewer3DStyle: CSSProperties = {
  width: '100%',
  height: '500px',
  background: '#1a1a1a',
  borderRadius: '8px',
  overflow: 'hidden',
  marginBottom: '20px'
};

// Badge
export const badgeStyle = (color: 'primary' | 'success' | 'secondary' = 'primary'): CSSProperties => {
  const colors = {
    primary: COLORS.primary,
    success: COLORS.success,
    secondary: COLORS.secondary
  };

  return {
    display: 'inline-block',
    padding: '4px 12px',
    background: colors[color],
    color: COLORS.white,
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  };
};

// Empty state
export const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  color: COLORS.textLight
};

// Grid
export const gridStyle = (columns: number = 2): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap: '20px',
  marginBottom: '20px'
});

// Icon button
export const iconButtonStyle: CSSProperties = {
  padding: '8px',
  background: 'transparent',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  color: COLORS.text,
  transition: 'all 0.2s'
};

// Responsive
export const responsiveGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px'
};
