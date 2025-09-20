import React, { useState } from 'react';
import { ProfileCrossSection, HolePatternVisual } from './ProfileVisuals';
import { Vector3 } from '../utils/Vector3';

interface Hole {
  id: string;
  diameter: number;
  position: Vector3;
  face: string;
  pattern?: {
    type: string;
    count?: number;
    rows?: number;
    columns?: number;
    spacing?: number;
  };
  depth?: number;
  isThrough: boolean;
}

interface HoleEditorVisualProps {
  profileType: string;
  profileSize: string;
  profileLength: number;
  holes: Hole[];
  onAddHole: (hole: Omit<Hole, 'id'>) => void;
  onUpdateHole: (id: string, updates: Partial<Hole>) => void;
  onDeleteHole: (id: string) => void;
  onClose: () => void;
}

export const HoleEditorVisual: React.FC<HoleEditorVisualProps> = ({
  profileType,
  profileSize,
  profileLength,
  holes,
  onAddHole,
  onUpdateHole,
  onDeleteHole,
  onClose
}) => {
  const [selectedFace, setSelectedFace] = useState('TOP_FLANGE');
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [newHoleConfig, setNewHoleConfig] = useState({
    diameter: 20,
    pattern: 'SINGLE',
    count: 1,
    rows: 2,
    columns: 2,
    spacing: 50,
    depth: 'through',
    position: { x: profileLength / 2, y: 0, z: 0 }
  });

  const faces = {
    'IPE': ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB'],
    'HEA': ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB'],
    'HEB': ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB'],
    'UPE': ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB'],
    'L': ['LEG_1', 'LEG_2'],
    'RHS': ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'],
    'CHS': ['SURFACE'],
    'PLATE': ['TOP', 'BOTTOM']
  };

  const availableFaces = faces[profileType as keyof typeof faces] || ['TOP', 'BOTTOM'];

  const handleAddHole = () => {
    const hole: Omit<Hole, 'id'> = {
      diameter: newHoleConfig.diameter,
      position: new Vector3(newHoleConfig.position.x, newHoleConfig.position.y, newHoleConfig.position.z),
      face: selectedFace,
      pattern: {
        type: newHoleConfig.pattern,
        count: newHoleConfig.count,
        rows: newHoleConfig.rows,
        columns: newHoleConfig.columns,
        spacing: newHoleConfig.spacing
      },
      depth: newHoleConfig.depth === 'through' ? undefined : parseInt(newHoleConfig.depth),
      isThrough: newHoleConfig.depth === 'through'
    };
    onAddHole(hole);
  };

  const styles = {
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '1200px',
      height: '90vh',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden'
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    body: {
      flex: 1,
      display: 'flex',
      overflow: 'hidden'
    },
    leftPanel: {
      width: '350px',
      padding: '20px',
      borderRight: '1px solid #e2e8f0',
      overflowY: 'auto' as const
    },
    centerPanel: {
      flex: 1,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      backgroundColor: '#f8fafc'
    },
    rightPanel: {
      width: '300px',
      padding: '20px',
      borderLeft: '1px solid #e2e8f0',
      overflowY: 'auto' as const
    },
    section: {
      marginBottom: '25px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600' as const,
      color: '#475569'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500' as const,
      transition: 'all 0.2s'
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    buttonSecondary: {
      backgroundColor: 'white',
      color: '#475569',
      border: '1px solid #e2e8f0'
    },
    buttonDanger: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    faceButton: {
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500' as const,
      textAlign: 'center' as const,
      transition: 'all 0.2s',
      marginBottom: '8px'
    },
    faceButtonActive: {
      border: '2px solid #3b82f6',
      backgroundColor: '#eff6ff',
      color: '#3b82f6'
    },
    patternCard: {
      padding: '10px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center' as const
    },
    patternCardActive: {
      border: '2px solid #3b82f6',
      backgroundColor: '#eff6ff'
    },
    holeItem: {
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      marginBottom: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    holeItemSelected: {
      border: '2px solid #3b82f6',
      backgroundColor: '#eff6ff'
    },
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600' as const,
      backgroundColor: '#3b82f6',
      color: 'white',
      marginLeft: '8px'
    }
  };

  const patterns = [
    { type: 'SINGLE', label: 'Unique', icon: '•' },
    { type: 'LINE', label: 'Ligne', icon: '• • •' },
    { type: 'GRID', label: 'Grille', icon: '⚏' },
    { type: 'CIRCULAR', label: 'Circulaire', icon: '⭕' },
    { type: 'STAGGERED', label: 'Quinconce', icon: '⚎' }
  ];

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            🔩 Éditeur de trous - {profileType} {profileSize}
          </h2>
          <button
            onClick={onClose}
            style={{ ...styles.button, ...styles.buttonSecondary }}
          >
            ✕ Fermer
          </button>
        </div>

        <div style={styles.body}>
          {/* Panneau gauche - Configuration */}
          <div style={styles.leftPanel}>
            <div style={styles.section}>
              <label style={styles.label}>Face de travail</label>
              {availableFaces.map(face => (
                <button
                  key={face}
                  onClick={() => setSelectedFace(face)}
                  style={{
                    ...styles.faceButton,
                    ...(selectedFace === face ? styles.faceButtonActive : {})
                  }}
                >
                  {face.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Diamètre (mm)</label>
              <input
                type="number"
                value={newHoleConfig.diameter}
                onChange={(e) => setNewHoleConfig({ ...newHoleConfig, diameter: parseInt(e.target.value) || 20 })}
                style={styles.input}
                min="1"
                max="100"
              />
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Profondeur</label>
              <select
                value={newHoleConfig.depth}
                onChange={(e) => setNewHoleConfig({ ...newHoleConfig, depth: e.target.value })}
                style={styles.select}
              >
                <option value="through">Traversant</option>
                <option value="10">10 mm</option>
                <option value="20">20 mm</option>
                <option value="30">30 mm</option>
                <option value="50">50 mm</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Pattern</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {patterns.map(pattern => (
                  <div
                    key={pattern.type}
                    onClick={() => setNewHoleConfig({ ...newHoleConfig, pattern: pattern.type })}
                    style={{
                      ...styles.patternCard,
                      ...(newHoleConfig.pattern === pattern.type ? styles.patternCardActive : {})
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{pattern.icon}</div>
                    <div style={{ fontSize: '12px' }}>{pattern.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {newHoleConfig.pattern === 'LINE' && (
              <div style={styles.section}>
                <label style={styles.label}>Nombre de trous</label>
                <input
                  type="number"
                  value={newHoleConfig.count}
                  onChange={(e) => setNewHoleConfig({ ...newHoleConfig, count: parseInt(e.target.value) || 1 })}
                  style={styles.input}
                  min="2"
                  max="20"
                />
                <label style={{ ...styles.label, marginTop: '10px' }}>Espacement (mm)</label>
                <input
                  type="number"
                  value={newHoleConfig.spacing}
                  onChange={(e) => setNewHoleConfig({ ...newHoleConfig, spacing: parseInt(e.target.value) || 50 })}
                  style={styles.input}
                  min="10"
                />
              </div>
            )}

            {newHoleConfig.pattern === 'GRID' && (
              <div style={styles.section}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Lignes</label>
                    <input
                      type="number"
                      value={newHoleConfig.rows}
                      onChange={(e) => setNewHoleConfig({ ...newHoleConfig, rows: parseInt(e.target.value) || 2 })}
                      style={styles.input}
                      min="2"
                      max="10"
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Colonnes</label>
                    <input
                      type="number"
                      value={newHoleConfig.columns}
                      onChange={(e) => setNewHoleConfig({ ...newHoleConfig, columns: parseInt(e.target.value) || 2 })}
                      style={styles.input}
                      min="2"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={styles.section}>
              <label style={styles.label}>Position X (mm)</label>
              <input
                type="range"
                min="50"
                max={profileLength - 50}
                value={newHoleConfig.position.x}
                onChange={(e) => setNewHoleConfig({
                  ...newHoleConfig,
                  position: { ...newHoleConfig.position, x: parseInt(e.target.value) }
                })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                <span>50</span>
                <span>{newHoleConfig.position.x} mm</span>
                <span>{profileLength - 50}</span>
              </div>
            </div>

            <button
              onClick={handleAddHole}
              style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}
            >
              ➕ Ajouter le trou
            </button>
          </div>

          {/* Panneau central - Visualisation */}
          <div style={styles.centerPanel}>
            <h3 style={{ marginTop: 0 }}>Vue en coupe - Face: {selectedFace}</h3>
            <ProfileCrossSection
              profileType={profileType}
              width={300}
              height={300}
              holes={holes.filter(h => h.face === selectedFace).map(h => ({
                x: 100 + (h.position.x / profileLength * 100 - 50),
                y: 100,
                diameter: h.diameter,
                face: h.face
              }))}
              selectedFace={selectedFace}
            />

            <div style={{ marginTop: '20px' }}>
              <h4>Aperçu du pattern</h4>
              <HolePatternVisual
                pattern={newHoleConfig.pattern}
                count={newHoleConfig.count}
                rows={newHoleConfig.rows}
                columns={newHoleConfig.columns}
              />
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>Informations</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Profil:</span> {profileType} {profileSize}
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Longueur:</span> {profileLength} mm
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Face active:</span> {selectedFace}
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Total trous:</span> {holes.length}
                </div>
              </div>
            </div>
          </div>

          {/* Panneau droit - Liste des trous */}
          <div style={styles.rightPanel}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
              Trous existants ({holes.length})
            </h3>

            {holes.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                Aucun trou défini
              </div>
            ) : (
              <div>
                {holes.map((hole, index) => (
                  <div
                    key={hole.id}
                    onClick={() => setSelectedHoleId(hole.id)}
                    style={{
                      ...styles.holeItem,
                      ...(selectedHoleId === hole.id ? styles.holeItemSelected : {})
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          Trou #{index + 1}
                          <span style={styles.badge}>Ø{hole.diameter}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                          Face: {hole.face}<br />
                          Position: X={hole.position.x.toFixed(0)} mm<br />
                          {hole.isThrough ? 'Traversant' : `Profondeur: ${hole.depth}mm`}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHole(hole.id);
                        }}
                        style={{
                          ...styles.button,
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#ef4444',
                          color: 'white'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>💡 Conseils</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#64748b' }}>
                <li>Sélectionnez une face pour y ajouter des trous</li>
                <li>Utilisez les patterns pour créer plusieurs trous rapidement</li>
                <li>Ajustez la position avec le curseur</li>
                <li>Cliquez sur un trou existant pour le modifier</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoleEditorVisual;