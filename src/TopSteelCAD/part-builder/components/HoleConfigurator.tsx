import React, { useState, useEffect } from 'react';

interface Hole {
  id: string;
  diameter: number;
  x: number;
  y: number;
  z: number;
  face: 'âme' | 'aile_sup' | 'aile_inf';
  reference: 'absolu' | 'relatif_debut' | 'relatif_fin' | 'centre';
}

interface HoleConfiguratorProps {
  profileType: string;
  profileSize: string;
  length: number;
  height: number;
  width: number;
  holes: Hole[];
  onUpdate: (holes: Hole[]) => void;
  onClose: () => void;
}

export const HoleConfigurator: React.FC<HoleConfiguratorProps> = ({
  profileType,
  profileSize,
  length,
  height,
  width,
  holes,
  onUpdate,
  onClose
}) => {
  const [selectedHole, setSelectedHole] = useState<Hole | null>(null);
  const [previewMode, setPreviewMode] = useState<'2D' | '3D'>('2D');

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '1200px',
    height: '80vh',
    backgroundColor: '#1e293b',
    border: '2px solid #475569',
    borderRadius: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999
  };

  const headerStyle: React.CSSProperties = {
    padding: '1rem',
    borderBottom: '2px solid #475569',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  };

  const sidebarStyle: React.CSSProperties = {
    width: '350px',
    padding: '1rem',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #475569',
    overflowY: 'auto'
  };

  const viewerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f172a'
  };

  const addHole = () => {
    const newHole: Hole = {
      id: Date.now().toString(),
      diameter: 20,
      x: length / 2,
      y: 0,
      z: height / 2,
      face: 'âme',
      reference: 'absolu'
    };
    onUpdate([...holes, newHole]);
    setSelectedHole(newHole);
  };

  const updateHole = (id: string, field: keyof Hole, value: any) => {
    onUpdate(holes.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const deleteHole = (id: string) => {
    onUpdate(holes.filter(h => h.id !== id));
    if (selectedHole?.id === id) setSelectedHole(null);
  };

  const duplicateHole = (hole: Hole) => {
    const newHole = {
      ...hole,
      id: Date.now().toString(),
      x: hole.x + 50
    };
    onUpdate([...holes, newHole]);
  };

  const createPattern = () => {
    if (!selectedHole) return;

    const pattern = prompt('Nombre de trous dans le motif ?', '3');
    const spacing = prompt('Espacement entre trous (mm) ?', '100');

    if (pattern && spacing) {
      const count = parseInt(pattern);
      const space = parseFloat(spacing);
      const newHoles: Hole[] = [];

      for (let i = 1; i < count; i++) {
        newHoles.push({
          ...selectedHole,
          id: (Date.now() + i).toString(),
          x: selectedHole.x + (i * space)
        });
      }

      onUpdate([...holes, ...newHoles]);
    }
  };

  const exportHoles = () => {
    const csv = [
      'ID,Diamètre,X,Y,Z,Face,Référence',
      ...holes.map(h => `${h.id},${h.diameter},${h.x},${h.y},${h.z},${h.face},${h.reference}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trous_${profileType}_${profileSize}.csv`;
    a.click();
  };

  const importHoles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const text = event.target.result;
        const lines = text.split('\n').slice(1); // Skip header
        const newHoles = lines.filter((l: string) => l.trim()).map((line: string) => {
          const [id, diameter, x, y, z, face, reference] = line.split(',');
          return {
            id: Date.now().toString() + Math.random(),
            diameter: parseFloat(diameter),
            x: parseFloat(x),
            y: parseFloat(y),
            z: parseFloat(z),
            face: face as any,
            reference: reference as any
          };
        });
        onUpdate([...holes, ...newHoles]);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Rendu 2D simplifié du profilé avec les trous
  const render2DView = () => {
    const scale = 400 / length; // Échelle pour que le profilé tienne dans 400px
    const profileHeight = height * scale;
    const profileLength = length * scale;

    return (
      <svg width="100%" height="300" viewBox={`0 0 450 350`} style={{ backgroundColor: '#1e293b' }}>
        {/* Grille de fond */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Vue de côté du profilé */}
        <g transform="translate(25, 50)">
          {/* Profilé */}
          <rect
            x={0}
            y={0}
            width={profileLength}
            height={profileHeight}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />

          {/* Ligne centrale */}
          <line
            x1={0}
            y1={profileHeight / 2}
            x2={profileLength}
            y2={profileHeight / 2}
            stroke="#475569"
            strokeDasharray="5,5"
          />

          {/* Trous */}
          {holes.filter(h => h.face === 'âme').map(hole => (
            <g key={hole.id}>
              <circle
                cx={hole.x * scale}
                cy={profileHeight / 2 + hole.z * scale}
                r={(hole.diameter / 2) * scale}
                fill={selectedHole?.id === hole.id ? '#3b82f6' : 'none'}
                stroke={selectedHole?.id === hole.id ? '#60a5fa' : '#ef4444'}
                strokeWidth="2"
                onClick={() => setSelectedHole(hole)}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={hole.x * scale}
                y={profileHeight / 2 + hole.z * scale - (hole.diameter / 2 * scale) - 5}
                fill="#e2e8f0"
                fontSize="10"
                textAnchor="middle"
              >
                Ø{hole.diameter}
              </text>
            </g>
          ))}

          {/* Dimensions */}
          <text x={profileLength / 2} y={-10} fill="#94a3b8" fontSize="12" textAnchor="middle">
            {profileType} {profileSize} - L={length}mm
          </text>
          <text x={-15} y={profileHeight / 2} fill="#94a3b8" fontSize="10" textAnchor="middle">
            H={height}
          </text>
        </g>

        {/* Vue de face */}
        <g transform="translate(25, 220)">
          <rect
            x={0}
            y={0}
            width={width * scale}
            height={profileHeight}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />

          {/* Ailes */}
          <line x1={0} y1={10 * scale} x2={width * scale} y2={10 * scale} stroke="#475569" />
          <line x1={0} y1={profileHeight - 10 * scale} x2={width * scale} y2={profileHeight - 10 * scale} stroke="#475569" />

          <text x={width * scale / 2} y={-5} fill="#94a3b8" fontSize="10" textAnchor="middle">
            Vue de face
          </text>
        </g>

        {/* Légende */}
        <g transform="translate(300, 220)">
          <text x={0} y={0} fill="#e2e8f0" fontSize="12" fontWeight="bold">Coordonnées:</text>
          {selectedHole && (
            <>
              <text x={0} y={20} fill="#94a3b8" fontSize="10">X: {selectedHole.x} mm</text>
              <text x={0} y={35} fill="#94a3b8" fontSize="10">Y: {selectedHole.y} mm</text>
              <text x={0} y={50} fill="#94a3b8" fontSize="10">Z: {selectedHole.z} mm</text>
              <text x={0} y={65} fill="#94a3b8" fontSize="10">Ø: {selectedHole.diameter} mm</text>
              <text x={0} y={80} fill="#94a3b8" fontSize="10">Face: {selectedHole.face}</text>
            </>
          )}
        </g>
      </svg>
    );
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, color: '#e2e8f0' }}>
            🔧 Configurateur de perçages - {profileType} {profileSize}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            ✕ Fermer
          </button>
        </div>

        <div style={contentStyle}>
          {/* Sidebar avec liste des trous */}
          <div style={sidebarStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={addHole}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem'
                }}
              >
                ➕ Ajouter un trou
              </button>
              <button
                onClick={createPattern}
                disabled={!selectedHole}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: selectedHole ? '#3b82f6' : '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: selectedHole ? 'pointer' : 'not-allowed',
                  marginBottom: '0.5rem'
                }}
              >
                📐 Créer motif
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={importHoles}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  📁 Import
                </button>
                <button
                  onClick={exportHoles}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#06b6d4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  💾 Export
                </button>
              </div>
            </div>

            <h3 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>
              Liste des trous ({holes.length})
            </h3>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {holes.map((hole, index) => (
                <div
                  key={hole.id}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: selectedHole?.id === hole.id ? '#334155' : '#1e293b',
                    border: `1px solid ${selectedHole?.id === hole.id ? '#3b82f6' : '#475569'}`,
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedHole(hole)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                      Trou #{index + 1}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateHole(hole);
                        }}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHole(hole.id);
                        }}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {selectedHole?.id === hole.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Diamètre (mm)</label>
                        <input
                          type="number"
                          value={hole.diameter}
                          onChange={(e) => updateHole(hole.id, 'diameter', parseFloat(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '0.25rem',
                            backgroundColor: '#0f172a',
                            color: '#e2e8f0',
                            border: '1px solid #475569',
                            borderRadius: '0.25rem'
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>X (mm)</label>
                          <input
                            type="number"
                            value={hole.x}
                            onChange={(e) => updateHole(hole.id, 'x', parseFloat(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              backgroundColor: '#0f172a',
                              color: '#e2e8f0',
                              border: '1px solid #475569',
                              borderRadius: '0.25rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Y (mm)</label>
                          <input
                            type="number"
                            value={hole.y}
                            onChange={(e) => updateHole(hole.id, 'y', parseFloat(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              backgroundColor: '#0f172a',
                              color: '#e2e8f0',
                              border: '1px solid #475569',
                              borderRadius: '0.25rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Z (mm)</label>
                          <input
                            type="number"
                            value={hole.z}
                            onChange={(e) => updateHole(hole.id, 'z', parseFloat(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              backgroundColor: '#0f172a',
                              color: '#e2e8f0',
                              border: '1px solid #475569',
                              borderRadius: '0.25rem'
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Face</label>
                        <select
                          value={hole.face}
                          onChange={(e) => updateHole(hole.id, 'face', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.25rem',
                            backgroundColor: '#0f172a',
                            color: '#e2e8f0',
                            border: '1px solid #475569',
                            borderRadius: '0.25rem'
                          }}
                        >
                          <option value="âme">Âme</option>
                          <option value="aile_sup">Aile supérieure</option>
                          <option value="aile_inf">Aile inférieure</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Référence</label>
                        <select
                          value={hole.reference}
                          onChange={(e) => updateHole(hole.id, 'reference', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.25rem',
                            backgroundColor: '#0f172a',
                            color: '#e2e8f0',
                            border: '1px solid #475569',
                            borderRadius: '0.25rem'
                          }}
                        >
                          <option value="absolu">Absolu</option>
                          <option value="relatif_debut">Relatif début</option>
                          <option value="relatif_fin">Relatif fin</option>
                          <option value="centre">Centre</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedHole?.id !== hole.id && (
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      Ø{hole.diameter} - X:{hole.x} Y:{hole.y} Z:{hole.z}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Viewer */}
          <div style={viewerStyle}>
            <div style={{ padding: '0.75rem', borderBottom: '1px solid #475569', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPreviewMode('2D')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: previewMode === '2D' ? '#3b82f6' : '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Vue 2D
              </button>
              <button
                onClick={() => setPreviewMode('3D')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: previewMode === '3D' ? '#3b82f6' : '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Vue 3D (À venir)
              </button>
            </div>

            <div style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewMode === '2D' && render2DView()}
              {previewMode === '3D' && (
                <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                  <p>Vue 3D en cours de développement</p>
                  <p>Utilisez la vue 2D pour visualiser les perçages</p>
                </div>
              )}
            </div>

            {/* Informations */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderTop: '1px solid #475569',
              fontSize: '0.875rem',
              color: '#94a3b8'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total: {holes.length} trous</span>
                <span>Profilé: {profileType} {profileSize} - {length}mm</span>
                <span>Dimensions: H={height}mm x L={width}mm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HoleConfigurator;