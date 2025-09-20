import React, { useState, useRef } from 'react';
import { Vector3 } from './utils/Vector3';
import { ProfileVisuals, PartIsometric } from './components/ProfileVisuals';
import { HoleEditorVisual } from './components/HoleEditorVisual';
import { Part3DPreview } from './components/Part3DPreview';
import { exportParts } from './utils/exporters';

// Types
interface HolePattern {
  type: 'SINGLE' | 'LINE' | 'GRID' | 'CIRCULAR' | 'STAGGERED';
  count?: number;
  rows?: number;
  columns?: number;
  spacing?: number;
  rowSpacing?: number;
  columnSpacing?: number;
  radius?: number;
  startAngle?: number;
}

interface Hole {
  id: string;
  diameter: number;
  position: Vector3;
  face: string;
  pattern?: HolePattern;
  depth?: number;
  isThrough: boolean;
}

interface Notch {
  id: string;
  type: 'RECTANGULAR' | 'CIRCULAR' | 'V_SHAPE' | 'U_SHAPE' | 'CUSTOM';
  position: Vector3;
  width: number;
  height: number;
  depth: number;
  face: string;
  radius?: number;
  angle?: number;
}

interface Part {
  id: string;
  name: string;
  profileType: string;
  profileSize: string;
  length: number;
  material: string;
  quantity: number;
  holes: Hole[];
  notches: Notch[];
  startCut?: { angle: number; direction: string };
  endCut?: { angle: number; direction: string };
  weight?: number;
  price?: number;
  status?: 'draft' | 'validated' | 'production' | 'completed';
  notes?: string;
  color?: string;
}

// Configuration des profils
const PROFILE_CONFIG = {
  IPE: {
    sizes: ['100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400', '450', '500'],
    icon: '⯀',
    color: '#3b82f6'
  },
  HEA: {
    sizes: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400'],
    icon: '⯁',
    color: '#10b981'
  },
  HEB: {
    sizes: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400'],
    icon: '⯁',
    color: '#06b6d4'
  },
  UPE: {
    sizes: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300'],
    icon: '⊔',
    color: '#8b5cf6'
  },
  L: {
    sizes: ['20x20x3', '30x30x3', '40x40x4', '50x50x5', '60x60x6', '70x70x7', '80x80x8', '90x90x9', '100x100x10'],
    icon: '∟',
    color: '#f59e0b'
  },
  RHS: {
    sizes: ['40x20x2', '50x30x3', '60x40x3', '80x40x3', '100x50x4', '120x60x4', '140x80x5', '150x100x5'],
    icon: '▭',
    color: '#ef4444'
  },
  CHS: {
    sizes: ['21.3x2', '26.9x2', '33.7x2.6', '42.4x2.6', '48.3x2.9', '60.3x2.9', '76.1x2.9', '88.9x3.2'],
    icon: '○',
    color: '#ec4899'
  },
  PLATE: {
    sizes: ['5', '6', '8', '10', '12', '15', '20', '25', '30', '40', '50'],
    icon: '▬',
    color: '#64748b'
  }
};

const MATERIALS = ['S235', 'S275', 'S355', 'S420', 'S460'];

const PATTERN_PRESETS = [
  { label: 'Single', icon: '•', pattern: { type: 'SINGLE' as const } },
  { label: '2×1', icon: '••', pattern: { type: 'LINE' as const, count: 2, spacing: 50 } },
  { label: '3×1', icon: '•••', pattern: { type: 'LINE' as const, count: 3, spacing: 50 } },
  { label: '2×2', icon: '⚀⚀', pattern: { type: 'GRID' as const, rows: 2, columns: 2, rowSpacing: 50, columnSpacing: 50 } },
  { label: '3×2', icon: '⚂⚂', pattern: { type: 'GRID' as const, rows: 3, columns: 2, rowSpacing: 50, columnSpacing: 50 } },
  { label: '3×3', icon: '⚃⚃', pattern: { type: 'GRID' as const, rows: 3, columns: 3, rowSpacing: 50, columnSpacing: 50 } },
  { label: '6×1', icon: '⚄⚄', pattern: { type: 'LINE' as const, count: 6, spacing: 50 } },
  { label: '6×2', icon: '⚅⚅', pattern: { type: 'GRID' as const, rows: 6, columns: 2, rowSpacing: 50, columnSpacing: 50 } },
  { label: 'Circle 4', icon: '⊕', pattern: { type: 'CIRCULAR' as const, count: 4, radius: 100 } },
  { label: 'Circle 6', icon: '⬢', pattern: { type: 'CIRCULAR' as const, count: 6, radius: 100 } },
];

export const PartBuilderPro: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([
    {
      id: '1',
      name: 'Poutre principale A1',
      profileType: 'IPE',
      profileSize: '300',
      length: 6000,
      material: 'S355',
      quantity: 2,
      holes: [],
      notches: [],
      status: 'draft',
      color: '#3b82f6',
      notes: ''
    }
  ]);

  const [selectedPart, setSelectedPart] = useState<Part | null>(parts[0]);
  const [activeView, setActiveView] = useState<'list' | 'detail' | '3d'>('detail');
  const [showHoleEditor, setShowHoleEditor] = useState(false);
  const [showNotchEditor, setShowNotchEditor] = useState(false);
  const [selectedFace, setSelectedFace] = useState('TOP');
  const [selectedProfileType, setSelectedProfileType] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonctions de gestion des pièces
  const addPart = () => {
    const newPart: Part = {
      id: Date.now().toString(),
      name: `Pièce ${parts.length + 1}`,
      profileType: 'IPE',
      profileSize: '200',
      length: 3000,
      material: 'S355',
      quantity: 1,
      holes: [],
      notches: [],
      status: 'draft',
      color: '#3b82f6',
      notes: ''
    };
    setParts([...parts, newPart]);
    setSelectedPart(newPart);
  };

  const updatePart = (id: string, updates: Partial<Part>) => {
    setParts(parts.map(p => p.id === id ? { ...p, ...updates } : p));
    if (selectedPart?.id === id) {
      setSelectedPart({ ...selectedPart, ...updates });
    }
  };

  const deletePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
    if (selectedPart?.id === id) {
      setSelectedPart(null);
    }
  };

  const duplicatePart = (part: Part) => {
    const newPart = {
      ...part,
      id: Date.now().toString(),
      name: `${part.name} (copie)`,
      status: 'draft' as const,
      holes: [...part.holes]
    };
    setParts([...parts, newPart]);
  };

  const addHoleToCurrentPart = (hole: Omit<Hole, 'id'>) => {
    if (!selectedPart) return;
    const newHole: Hole = {
      ...hole,
      id: Date.now().toString()
    };
    updatePart(selectedPart.id, {
      holes: [...selectedPart.holes, newHole]
    });
  };

  const updateHole = (holeId: string, updates: Partial<Hole>) => {
    if (!selectedPart) return;
    updatePart(selectedPart.id, {
      holes: selectedPart.holes.map(h => h.id === holeId ? { ...h, ...updates } : h)
    });
  };

  const deleteHole = (holeId: string) => {
    if (!selectedPart) return;
    updatePart(selectedPart.id, {
      holes: selectedPart.holes.filter(h => h.id !== holeId)
    });
  };

  // Export functions
  const handleExport = (format: 'DSTV' | 'IFC' | 'STEP' | 'JSON' | 'CSV') => {
    if (parts.length === 0) {
      alert('Aucune pièce à exporter');
      return;
    }
    exportParts(parts, format);
  };

  // Export CSV legacy (garde pour compatibilité)
  const exportToCSV = () => {
    handleExport('CSV');
  };

  const styles = {
    container: {
      height: '100vh',
      display: 'flex',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc'
    },
    sidebar: {
      width: '320px',
      backgroundColor: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden'
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden'
    },
    header: {
      padding: '20px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    toolbar: {
      padding: '15px 20px',
      backgroundColor: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const
    },
    content: {
      flex: 1,
      padding: '20px',
      overflow: 'auto'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500' as const,
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    },
    buttonSecondary: {
      padding: '10px 20px',
      backgroundColor: 'white',
      color: '#475569',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500' as const,
      transition: 'all 0.2s'
    },
    partItem: {
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '8px',
      marginBottom: '10px',
      border: '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    partItemSelected: {
      border: '2px solid #3b82f6',
      backgroundColor: '#eff6ff'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600' as const,
      marginLeft: '8px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '14px',
      fontWeight: '500' as const,
      color: '#475569'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px'
    },
    faceSelector: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      marginTop: '10px'
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
      transition: 'all 0.2s'
    },
    faceButtonActive: {
      border: '2px solid #3b82f6',
      backgroundColor: '#eff6ff',
      color: '#3b82f6'
    },
    patternGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '8px',
      marginTop: '10px'
    },
    patternButton: {
      padding: '10px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '12px',
      textAlign: 'center' as const,
      transition: 'all 0.2s'
    },
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
      padding: '30px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft': return '#94a3b8';
      case 'validated': return '#3b82f6';
      case 'production': return '#f59e0b';
      case 'completed': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const faces = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'FRONT', 'BACK'];

  return (
    <div style={styles.container}>
      {/* Sidebar - Liste des pièces */}
      <div style={styles.sidebar}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
            Pièces ({parts.length})
          </h3>
          <button onClick={addPart} style={{ ...styles.button, width: '100%' }}>
            ➕ Nouvelle pièce
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
          {parts.map(part => (
            <div
              key={part.id}
              style={{
                ...styles.partItem,
                ...(selectedPart?.id === part.id ? styles.partItemSelected : {})
              }}
              onClick={() => setSelectedPart(part)}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px', marginRight: '10px', color: PROFILE_CONFIG[part.profileType as keyof typeof PROFILE_CONFIG]?.color }}>
                  {PROFILE_CONFIG[part.profileType as keyof typeof PROFILE_CONFIG]?.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{part.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {part.profileType} {part.profileSize} • {part.length}mm • ×{part.quantity}
                  </div>
                </div>
                <span style={{ ...styles.badge, backgroundColor: getStatusColor(part.status), color: 'white' }}>
                  {part.status || 'draft'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#64748b' }}>
                <span>🔩 {part.holes.length} trous</span>
                <span>✂️ {part.notches.length} encoches</span>
                <span>📦 {part.material}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ ...styles.buttonSecondary, width: '100%' }}
            >
              💾 Exporter ▼
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                zIndex: 10
              }}>
                <button
                  onClick={() => { handleExport('CSV'); setShowExportMenu(false); }}
                  style={{ ...styles.buttonSecondary, width: '100%', borderRadius: '8px 8px 0 0', border: 'none', borderBottom: '1px solid #e2e8f0' }}
                >
                  📊 CSV (Excel)
                </button>
                <button
                  onClick={() => { handleExport('JSON'); setShowExportMenu(false); }}
                  style={{ ...styles.buttonSecondary, width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid #e2e8f0' }}
                >
                  📄 JSON
                </button>
                <button
                  onClick={() => { handleExport('DSTV'); setShowExportMenu(false); }}
                  style={{ ...styles.buttonSecondary, width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid #e2e8f0' }}
                >
                  🏭 DSTV (NC)
                </button>
                <button
                  onClick={() => { handleExport('IFC'); setShowExportMenu(false); }}
                  style={{ ...styles.buttonSecondary, width: '100%', borderRadius: 0, border: 'none', borderBottom: '1px solid #e2e8f0' }}
                >
                  🏗️ IFC (BIM)
                </button>
                <button
                  onClick={() => { handleExport('STEP'); setShowExportMenu(false); }}
                  style={{ ...styles.buttonSecondary, width: '100%', borderRadius: '0 0 8px 8px', border: 'none' }}
                >
                  ⚙️ STEP (CAO)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            Part Builder Professional
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveView('list')}
              style={{
                ...styles.buttonSecondary,
                ...(activeView === 'list' ? { backgroundColor: '#eff6ff', color: '#3b82f6', borderColor: '#3b82f6' } : {})
              }}
            >
              📋 Liste
            </button>
            <button
              onClick={() => setActiveView('detail')}
              style={{
                ...styles.buttonSecondary,
                ...(activeView === 'detail' ? { backgroundColor: '#eff6ff', color: '#3b82f6', borderColor: '#3b82f6' } : {})
              }}
            >
              ✏️ Détails
            </button>
            <button
              onClick={() => setActiveView('3d')}
              style={{
                ...styles.buttonSecondary,
                ...(activeView === '3d' ? { backgroundColor: '#eff6ff', color: '#3b82f6', borderColor: '#3b82f6' } : {})
              }}
            >
              🎬 3D
            </button>
          </div>
        </div>

        {selectedPart && (
          <>
            <div style={styles.toolbar}>
              <button onClick={() => duplicatePart(selectedPart)} style={styles.buttonSecondary}>
                📋 Dupliquer
              </button>
              <button onClick={() => deletePart(selectedPart.id)} style={{ ...styles.buttonSecondary, color: '#ef4444', borderColor: '#fecaca' }}>
                🗑️ Supprimer
              </button>
              <button onClick={() => setShowHoleEditor(true)} style={styles.button}>
                🔩 Ajouter trous
              </button>
              <button onClick={() => setShowNotchEditor(true)} style={styles.button}>
                ✂️ Ajouter encoches
              </button>
            </div>

            <div style={styles.content}>
              {activeView === 'detail' && (
                <>
                  <div style={styles.card}>
                    <h3 style={{ marginTop: 0 }}>Informations générales</h3>
                    <div style={styles.grid}>
                      <div>
                        <label style={styles.label}>Nom de la pièce</label>
                        <input
                          type="text"
                          value={selectedPart.name}
                          onChange={(e) => updatePart(selectedPart.id, { name: e.target.value })}
                          style={styles.input}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Status</label>
                        <select
                          value={selectedPart.status || 'draft'}
                          onChange={(e) => updatePart(selectedPart.id, { status: e.target.value as Part['status'] })}
                          style={styles.select}
                        >
                          <option value="draft">Brouillon</option>
                          <option value="validated">Validé</option>
                          <option value="production">Production</option>
                          <option value="completed">Terminé</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={styles.card}>
                    <h3 style={{ marginTop: 0 }}>Configuration du profil</h3>

                    {/* Sélection visuelle du type de profil */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={styles.label}>Type de profil</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {Object.entries(PROFILE_CONFIG).map(([type, config]) => (
                          <div
                            key={type}
                            onClick={() => {
                              updatePart(selectedPart.id, {
                                profileType: type,
                                profileSize: config.sizes[0]
                              });
                            }}
                            style={{
                              padding: '15px',
                              border: `2px solid ${selectedPart.profileType === type ? config.color : '#e2e8f0'}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              backgroundColor: selectedPart.profileType === type ? `${config.color}10` : 'white',
                              transition: 'all 0.2s'
                            }}
                          >
                            <ProfileVisuals type={type} selected={selectedPart.profileType === type} />
                            <div style={{
                              marginTop: '8px',
                              fontSize: '12px',
                              fontWeight: selectedPart.profileType === type ? '600' : '400',
                              color: selectedPart.profileType === type ? config.color : '#475569'
                            }}>
                              {type}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={styles.grid}>
                      <div>
                        <label style={styles.label}>Section / Taille</label>
                        <select
                          value={selectedPart.profileSize}
                          onChange={(e) => updatePart(selectedPart.id, { profileSize: e.target.value })}
                          style={styles.select}
                        >
                          {PROFILE_CONFIG[selectedPart.profileType as keyof typeof PROFILE_CONFIG]?.sizes.map(size => (
                            <option key={size} value={size}>
                              {selectedPart.profileType} {size}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Longueur (mm)</label>
                        <input
                          type="number"
                          value={selectedPart.length}
                          onChange={(e) => updatePart(selectedPart.id, { length: parseInt(e.target.value) || 0 })}
                          style={styles.input}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Matériau</label>
                        <select
                          value={selectedPart.material}
                          onChange={(e) => updatePart(selectedPart.id, { material: e.target.value })}
                          style={styles.select}
                        >
                          {MATERIALS.map(mat => (
                            <option key={mat} value={mat}>{mat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Quantité</label>
                        <input
                          type="number"
                          value={selectedPart.quantity}
                          min="1"
                          onChange={(e) => updatePart(selectedPart.id, { quantity: parseInt(e.target.value) || 1 })}
                          style={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.card}>
                    <h3 style={{ marginTop: 0 }}>Features</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔩</div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{selectedPart.holes.length}</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Trous</div>
                      </div>
                      <div style={{ padding: '20px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>✂️</div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{selectedPart.notches.length}</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Encoches</div>
                      </div>
                      <div style={{ padding: '20px', backgroundColor: '#dcfce7', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📐</div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>
                          {(selectedPart.startCut ? 1 : 0) + (selectedPart.endCut ? 1 : 0)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Coupes</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeView === '3d' && selectedPart && (
                <div style={styles.card}>
                  <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Visualisation 3D</h3>
                  <Part3DPreview
                    profileType={selectedPart.profileType as any}
                    profileSection={selectedPart.profileSize}
                    length={selectedPart.length}
                    holes={selectedPart.holes.map(h => ({
                      ...h,
                      distanceFromStart: h.position.z
                    }))}
                    notches={selectedPart.notches.map(n => ({
                      ...n,
                      distanceFromStart: n.position.z
                    }))}
                    width={800}
                    height={500}
                  />
                </div>
              )}

              {activeView === 'list' && (
                <div style={styles.card}>
                  <h3 style={{ marginTop: 0 }}>Vue d'ensemble des pièces</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Nom</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Profil</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Dimensions</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Matériau</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Qté</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Features</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(part => (
                        <tr
                          key={part.id}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: selectedPart?.id === part.id ? '#f8fafc' : 'white',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedPart(part)}
                        >
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '500' }}>{part.name}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '20px', marginRight: '8px' }}>
                              {PROFILE_CONFIG[part.profileType as keyof typeof PROFILE_CONFIG]?.icon}
                            </span>
                            {part.profileType} {part.profileSize}
                          </td>
                          <td style={{ padding: '12px' }}>{part.length}mm</td>
                          <td style={{ padding: '12px' }}>{part.material}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{part.quantity}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ marginRight: '10px' }}>🔩 {part.holes.length}</span>
                            <span>✂️ {part.notches.length}</span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              ...styles.badge,
                              backgroundColor: getStatusColor(part.status),
                              color: 'white'
                            }}>
                              {part.status || 'draft'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Éditeur de trous visuel */}
      {showHoleEditor && selectedPart && (
        <HoleEditorVisual
          profileType={selectedPart.profileType}
          profileSize={selectedPart.profileSize}
          profileLength={selectedPart.length}
          holes={selectedPart.holes}
          onAddHole={addHoleToCurrentPart}
          onUpdateHole={updateHole}
          onDeleteHole={deleteHole}
          onClose={() => setShowHoleEditor(false)}
        />
      )}

      {/* Modal Editeur d'encoches */}
      {showNotchEditor && (
        <div style={styles.modal} onClick={() => setShowNotchEditor(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Configuration des encoches</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Type d'encoche</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {['RECTANGULAR', 'CIRCULAR', 'V_SHAPE', 'U_SHAPE'].map(type => (
                  <button
                    key={type}
                    style={styles.faceButton}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.grid}>
              <div>
                <label style={styles.label}>Largeur (mm)</label>
                <input type="number" defaultValue="50" style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Hauteur (mm)</label>
                <input type="number" defaultValue="30" style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Profondeur (mm)</label>
                <input type="number" defaultValue="10" style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Position</label>
                <select style={styles.select}>
                  <option>Début</option>
                  <option>Milieu</option>
                  <option>Fin</option>
                  <option>Personnalisé</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button
                onClick={() => {
                  // Ajouter l'encoche
                  if (selectedPart) {
                    const newNotch: Notch = {
                      id: Date.now().toString(),
                      type: 'RECTANGULAR',
                      position: new Vector3(0, 0, 0),
                      width: 50,
                      height: 30,
                      depth: 10,
                      face: selectedFace
                    };
                    updatePart(selectedPart.id, {
                      notches: [...selectedPart.notches, newNotch]
                    });
                  }
                  setShowNotchEditor(false);
                }}
                style={styles.button}
              >
                ✅ Ajouter
              </button>
              <button onClick={() => setShowNotchEditor(false)} style={styles.buttonSecondary}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          // Import CSV logic
        }}
      />
    </div>
  );
};

export default PartBuilderPro;