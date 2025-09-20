import React, { useState, useEffect } from 'react';

// Types
interface HoleTemplate {
  id: string;
  name: string;
  icon: string;
  boltSize: 'M16' | 'M20' | 'M24' | 'M27' | 'M30';
  pattern: 'end-plate' | 'splice' | 'base-plate' | 'stiffener' | 'single';
  config: {
    face: 'âme' | 'aile_sup' | 'aile_inf';
    rows: number;
    cols: number;
    spacing: number;
    edgeDistance: number;
    position: 'début' | 'centre' | 'fin';
  };
}

interface SimplifiedHole {
  diameter: number;
  x: number;
  y: number;
  face: string;
}

interface HoleConfiguratorSimpleProps {
  profileType: string;
  profileSize: string;
  profileLength: number;
  onSave: (holes: SimplifiedHole[]) => void;
  onClose: () => void;
}

// Données de boulons standards
const BOLT_SPECS = {
  M16: { diameter: 18, edgeDistance: 35, spacing: 70 },
  M20: { diameter: 22, edgeDistance: 40, spacing: 80 },
  M24: { diameter: 26, edgeDistance: 45, spacing: 100 },
  M27: { diameter: 30, edgeDistance: 50, spacing: 100 },
  M30: { diameter: 33, edgeDistance: 55, spacing: 120 }
};

// Templates prédéfinis
const TEMPLATES: HoleTemplate[] = [
  {
    id: 'end-4-m20',
    name: 'Platine 4 boulons',
    icon: '⬜',
    boltSize: 'M20',
    pattern: 'end-plate',
    config: {
      face: 'âme',
      rows: 2,
      cols: 2,
      spacing: 80,
      edgeDistance: 40,
      position: 'fin'
    }
  },
  {
    id: 'end-6-m20',
    name: 'Platine 6 boulons',
    icon: '⬚',
    boltSize: 'M20',
    pattern: 'end-plate',
    config: {
      face: 'âme',
      rows: 3,
      cols: 2,
      spacing: 80,
      edgeDistance: 40,
      position: 'fin'
    }
  },
  {
    id: 'end-8-m24',
    name: 'Platine 8 boulons',
    icon: '⊞',
    boltSize: 'M24',
    pattern: 'end-plate',
    config: {
      face: 'âme',
      rows: 4,
      cols: 2,
      spacing: 100,
      edgeDistance: 45,
      position: 'fin'
    }
  },
  {
    id: 'splice-web',
    name: 'Éclissage âme',
    icon: '|||',
    boltSize: 'M20',
    pattern: 'splice',
    config: {
      face: 'âme',
      rows: 2,
      cols: 3,
      spacing: 80,
      edgeDistance: 40,
      position: 'centre'
    }
  },
  {
    id: 'splice-flange',
    name: 'Éclissage ailes',
    icon: '═',
    boltSize: 'M24',
    pattern: 'splice',
    config: {
      face: 'aile_sup',
      rows: 2,
      cols: 4,
      spacing: 100,
      edgeDistance: 45,
      position: 'centre'
    }
  },
  {
    id: 'stiffener',
    name: 'Raidisseur',
    icon: '│',
    boltSize: 'M16',
    pattern: 'stiffener',
    config: {
      face: 'âme',
      rows: 3,
      cols: 1,
      spacing: 70,
      edgeDistance: 35,
      position: 'centre'
    }
  },
  {
    id: 'base-4-m24',
    name: 'Pied de poteau 4B',
    icon: '▣',
    boltSize: 'M24',
    pattern: 'base-plate',
    config: {
      face: 'aile_inf',
      rows: 2,
      cols: 2,
      spacing: 150,
      edgeDistance: 50,
      position: 'début'
    }
  },
  {
    id: 'single-m20',
    name: 'Trou unique',
    icon: '●',
    boltSize: 'M20',
    pattern: 'single',
    config: {
      face: 'âme',
      rows: 1,
      cols: 1,
      spacing: 0,
      edgeDistance: 40,
      position: 'centre'
    }
  }
];

export const HoleConfiguratorSimple: React.FC<HoleConfiguratorSimpleProps> = ({
  profileType,
  profileSize,
  profileLength,
  onSave,
  onClose
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<HoleTemplate | null>(null);
  const [position, setPosition] = useState<'début' | 'centre' | 'fin'>('fin');
  const [boltSize, setBoltSize] = useState<keyof typeof BOLT_SPECS>('M20');
  const [generatedHoles, setGeneratedHoles] = useState<SimplifiedHole[]>([]);

  // Générer les trous basés sur le template
  const generateHoles = (template: HoleTemplate, customPosition?: string, customBolt?: string) => {
    const bolt = BOLT_SPECS[customBolt as keyof typeof BOLT_SPECS || template.boltSize];
    const config = template.config;
    const holes: SimplifiedHole[] = [];

    // Calculer la position de départ basée sur la position
    let startX = 0;
    const patternWidth = (config.cols - 1) * config.spacing;
    const patternHeight = (config.rows - 1) * config.spacing;

    const finalPosition = customPosition || config.position;
    switch (finalPosition) {
      case 'début':
        startX = 100; // 100mm du début
        break;
      case 'centre':
        startX = profileLength / 2 - patternWidth / 2;
        break;
      case 'fin':
        startX = profileLength - 100 - patternWidth;
        break;
    }

    // Générer la grille de trous
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        holes.push({
          diameter: bolt.diameter,
          x: startX + col * config.spacing,
          y: -patternHeight / 2 + row * config.spacing,
          face: config.face
        });
      }
    }

    return holes;
  };

  // Mettre à jour les trous quand le template change
  useEffect(() => {
    if (selectedTemplate) {
      const holes = generateHoles(selectedTemplate, position, boltSize);
      setGeneratedHoles(holes);
    }
  }, [selectedTemplate, position, boltSize]);

  const handleConfirm = () => {
    onSave(generatedHoles);
  };

  // Styles
  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    borderRadius: '1rem',
    padding: '2rem',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'auto',
    color: '#e2e8f0'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '1rem'
  };

  const templateGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  };

  const templateCardStyle = (isSelected: boolean): React.CSSProperties => ({
    backgroundColor: isSelected ? '#3b82f6' : '#2d2d2d',
    border: isSelected ? '2px solid #60a5fa' : '2px solid #404040',
    borderRadius: '0.5rem',
    padding: '1rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    transform: isSelected ? 'scale(1.05)' : 'scale(1)'
  });

  const quickSettingsStyle: React.CSSProperties = {
    backgroundColor: '#2d2d2d',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    marginBottom: '2rem',
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap'
  };

  const previewStyle: React.CSSProperties = {
    backgroundColor: '#0a0a0a',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    marginBottom: '2rem',
    minHeight: '200px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  return (
    <div style={modalStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            🔧 Configuration rapide des trous - {profileType} {profileSize}
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Sélectionnez un modèle et ajustez si nécessaire
          </p>
        </div>

        {/* Étape 1: Galerie de templates */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>
            1. Choisir un type de connexion
          </h3>
          <div style={templateGridStyle}>
            {TEMPLATES.map(template => (
              <div
                key={template.id}
                style={templateCardStyle(selectedTemplate?.id === template.id)}
                onClick={() => setSelectedTemplate(template)}
                onMouseEnter={(e) => {
                  if (selectedTemplate?.id !== template.id) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#404040';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTemplate?.id !== template.id) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#2d2d2d';
                  }
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {template.icon}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                  {template.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {template.boltSize} - {template.config.rows}×{template.config.cols}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Étape 2: Réglages rapides */}
        {selectedTemplate && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>
              2. Ajuster les paramètres
            </h3>
            <div style={quickSettingsStyle}>
              {/* Sélecteur de position */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Position
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['début', 'centre', 'fin'] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      style={{
                        ...buttonStyle,
                        backgroundColor: position === pos ? '#3b82f6' : '#404040',
                        color: 'white',
                        fontSize: '0.875rem',
                        padding: '0.5rem 1rem'
                      }}
                    >
                      {pos === 'début' ? '← Début' : pos === 'centre' ? '• Centre' : 'Fin →'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélecteur de taille de boulon */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Taille de boulon
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {Object.keys(BOLT_SPECS).map(size => (
                    <button
                      key={size}
                      onClick={() => setBoltSize(size as keyof typeof BOLT_SPECS)}
                      style={{
                        ...buttonStyle,
                        backgroundColor: boltSize === size ? '#3b82f6' : '#404040',
                        color: 'white',
                        fontSize: '0.875rem',
                        padding: '0.5rem 0.75rem'
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info rapide */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: '#94a3b8'
              }}>
                <div>Diamètre trou: Ø{BOLT_SPECS[boltSize].diameter}mm</div>
                <div>Distance bord: {BOLT_SPECS[boltSize].edgeDistance}mm</div>
                <div>Espacement: {BOLT_SPECS[boltSize].spacing}mm</div>
              </div>
            </div>
          </div>
        )}

        {/* Étape 3: Aperçu visuel */}
        {selectedTemplate && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>
              3. Aperçu et validation
            </h3>
            <div style={previewStyle}>
              <svg viewBox={`0 0 ${Math.min(profileLength, 800)} 300`} style={{ width: '100%', maxWidth: '600px' }}>
                {/* Profil simplifié */}
                <rect
                  x="0"
                  y="100"
                  width={Math.min(profileLength, 800)}
                  height="100"
                  fill="none"
                  stroke="#404040"
                  strokeWidth="2"
                />
                <text x={Math.min(profileLength, 800) / 2} y="90" textAnchor="middle" fill="#94a3b8" fontSize="12">
                  {profileType} {profileSize} - L={profileLength}mm
                </text>

                {/* Trous générés */}
                {generatedHoles.map((hole, index) => {
                  const scaledX = (hole.x / profileLength) * Math.min(profileLength, 800);
                  const scaledY = 150 + hole.y;

                  return (
                    <g key={index}>
                      <circle
                        cx={scaledX}
                        cy={scaledY}
                        r={hole.diameter / 4}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                      <circle
                        cx={scaledX}
                        cy={scaledY}
                        r="2"
                        fill="#3b82f6"
                      />
                    </g>
                  );
                })}

                {/* Dimensions */}
                {generatedHoles.length > 0 && (
                  <>
                    <line
                      x1={(generatedHoles[0].x / profileLength) * Math.min(profileLength, 800)}
                      y1="220"
                      x2={(generatedHoles[generatedHoles.length - 1].x / profileLength) * Math.min(profileLength, 800)}
                      y2="220"
                      stroke="#60a5fa"
                      strokeWidth="1"
                      markerEnd="url(#arrowhead)"
                      markerStart="url(#arrowhead)"
                    />
                    <text
                      x={(generatedHoles[0].x + generatedHoles[generatedHoles.length - 1].x) / 2 / profileLength * Math.min(profileLength, 800)}
                      y="235"
                      textAnchor="middle"
                      fill="#60a5fa"
                      fontSize="10"
                    >
                      {Math.abs(generatedHoles[generatedHoles.length - 1].x - generatedHoles[0].x)}mm
                    </text>
                  </>
                )}

                {/* Marqueurs de flèche */}
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
                  </marker>
                </defs>
              </svg>
            </div>

            {/* Résumé */}
            <div style={{
              backgroundColor: '#2d2d2d',
              borderRadius: '0.375rem',
              padding: '1rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              <strong style={{ color: '#60a5fa' }}>Résumé:</strong>
              <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Template:</span> {selectedTemplate.name}
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Boulons:</span> {boltSize} (Ø{BOLT_SPECS[boltSize].diameter}mm)
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Nombre:</span> {generatedHoles.length} trous
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Face:</span> {selectedTemplate.config.face}
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Position:</span> {position}
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Espacement:</span> {BOLT_SPECS[boltSize].spacing}mm
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              ...buttonStyle,
              backgroundColor: '#6b7280',
              color: 'white'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTemplate}
            style={{
              ...buttonStyle,
              backgroundColor: selectedTemplate ? '#10b981' : '#404040',
              color: 'white',
              cursor: selectedTemplate ? 'pointer' : 'not-allowed'
            }}
          >
            ✅ Confirmer ({generatedHoles.length} trous)
          </button>
        </div>
      </div>
    </div>
  );
};

export default HoleConfiguratorSimple;