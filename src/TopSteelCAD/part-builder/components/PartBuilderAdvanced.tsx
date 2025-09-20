import React, { useState, useEffect, useRef } from 'react';
import { HoleConfiguratorSimple } from './HoleConfiguratorSimple';
import { Part3DViewer } from './Part3DViewer';

// Types locaux
interface CutDefinition {
  angle: number;
  direction: 'X' | 'Y' | 'Z';
}

interface HoleDefinition {
  diameter: number;
  x: number;
  y: number;
  face: string;
}

interface GrugeageDefinition {
  type: 'rectangulaire' | 'circulaire';
  largeur: number;
  profondeur: number;
  position: 'debut' | 'fin';
}

interface PartRow {
  id: string;
  name: string;
  type: string;
  profileType: string;  // IPE, HEA, HEB, etc.
  profileSize: string;  // 200, 300, etc.
  length: number;
  material: string;
  quantity: number;
  startCut?: CutDefinition;
  endCut?: CutDefinition;
  holes: HoleDefinition[];
  grugeages: GrugeageDefinition[];
  remarks?: string;
  // Dimensions automatiques depuis la biblio
  height?: number;
  width?: number;
  webThickness?: number;
  flangeThickness?: number;
  weight?: number; // kg/m
}

interface PartBuilderAdvancedProps {
  mode?: 'create' | 'edit';
  onComplete?: (parts: PartRow[]) => void;
  onCancel?: () => void;
}

// Simulation de la bibliothèque de profilés
const PROFILE_LIBRARY = {
  IPE: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400', '450', '500', '550', '600'],
  HEA: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600'],
  HEB: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600'],
  HEM: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600'],
  UPN: ['50', '65', '80', '100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '350', '380', '400'],
  UAP: ['80', '100', '130', '150', '175', '200', '220', '250', '300'],
  'TUBE_RECT': ['40x20', '50x30', '60x40', '80x40', '80x60', '100x50', '100x60', '120x60', '120x80', '140x80', '150x100', '200x100'],
  'TUBE_CARRE': ['20x20', '25x25', '30x30', '40x40', '50x50', '60x60', '70x70', '80x80', '90x90', '100x100', '120x120', '140x140'],
  'TUBE_ROND': ['21.3', '26.9', '33.7', '42.4', '48.3', '60.3', '76.1', '88.9', '114.3', '139.7', '168.3', '219.1']
};

// Données de profilés simplifiées (normalement depuis la DB)
const getProfileDimensions = (type: string, size: string) => {
  const profiles: any = {
    'IPE-200': { height: 200, width: 100, webThickness: 5.6, flangeThickness: 8.5, weight: 22.4 },
    'IPE-300': { height: 300, width: 150, webThickness: 7.1, flangeThickness: 10.7, weight: 42.2 },
    'HEA-200': { height: 190, width: 200, webThickness: 6.5, flangeThickness: 10, weight: 42.3 },
    'HEB-200': { height: 200, width: 200, webThickness: 9, flangeThickness: 15, weight: 61.3 },
    'HEB-300': { height: 300, width: 300, webThickness: 11, flangeThickness: 19, weight: 117 },
    'UPN-200': { height: 200, width: 75, webThickness: 8.5, flangeThickness: 11.5, weight: 25.3 }
  };
  return profiles[`${type}-${size}`] || {};
};

export const PartBuilderAdvanced: React.FC<PartBuilderAdvancedProps> = ({
  mode = 'create',
  onComplete,
  onCancel
}) => {
  const [parts, setParts] = useState<PartRow[]>([
    {
      id: '1',
      name: 'Poutre principale',
      type: 'PROFILE',
      profileType: 'IPE',
      profileSize: '300',
      length: 6000,
      material: 'S355',
      quantity: 1,
      holes: [],
      grugeages: [],
      remarks: '',
      ...getProfileDimensions('IPE', '300')
    }
  ]);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null);
  const [showHoleConfigurator, setShowHoleConfigurator] = useState<string | null>(null);
  const [show3DViewer, setShow3DViewer] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Styles
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    padding: '1rem 1.5rem',
    background: 'linear-gradient(to right, #1e293b, #334155)',
    borderBottom: '2px solid #475569',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const toolbarStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  // Mise à jour automatique des dimensions lors du changement de profil
  const updateProfileDimensions = (id: string, type: string, size: string) => {
    const dimensions = getProfileDimensions(type, size);
    setParts(prevParts => prevParts.map(p =>
      p.id === id ? { ...p, profileType: type, profileSize: size, ...dimensions } : p
    ));
  };

  // Recalculer le poids total à chaque changement
  useEffect(() => {
    // Force re-render pour mettre à jour le poids affiché
    const total = calculateTotalWeight();
  }, [parts]);

  const addRow = () => {
    const newId = (Math.max(...parts.map(p => parseInt(p.id))) + 1).toString();
    setParts([...parts, {
      id: newId,
      name: `Pièce ${newId}`,
      type: 'PROFILE',
      profileType: 'IPE',
      profileSize: '200',
      length: 3000,
      material: 'S355',
      quantity: 1,
      holes: [],
      grugeages: [],
      remarks: '',
      ...getProfileDimensions('IPE', '200')
    }]);
  };

  const addHole = (partId: string) => {
    setParts(parts.map(p =>
      p.id === partId
        ? {
            ...p,
            holes: [...p.holes, { diameter: 20, x: 100, y: 0, face: 'web' }]
          }
        : p
    ));
  };

  const addGrugeage = (partId: string, position: 'debut' | 'fin') => {
    setParts(parts.map(p =>
      p.id === partId
        ? {
            ...p,
            grugeages: [...p.grugeages, { type: 'rectangulaire', largeur: 50, profondeur: 30, position }]
          }
        : p
    ));
  };

  const setCut = (partId: string, position: 'start' | 'end', angle: number) => {
    setParts(parts.map(p =>
      p.id === partId
        ? {
            ...p,
            [position === 'start' ? 'startCut' : 'endCut']: angle > 0 ? { angle, direction: 'Y' } : undefined
          }
        : p
    ));
  };

  const deleteSelected = () => {
    setParts(parts.filter(p => !selectedRows.has(p.id)));
    setSelectedRows(new Set());
  };

  const duplicateSelected = () => {
    const maxId = Math.max(...parts.map(p => parseInt(p.id)));
    const toDuplicate = parts.filter(p => selectedRows.has(p.id));
    const newParts = toDuplicate.map((p, index) => ({
      ...p,
      id: (maxId + index + 1).toString(),
      name: p.name + ' (copie)'
    }));
    setParts([...parts, ...newParts]);
  };

  const exportToCSV = () => {
    const headers = 'Nom,Type,Profil,Taille,Longueur,Matériau,Quantité,Coupe début,Coupe fin,Nb trous,Nb grugeages,Poids unitaire,Poids total,Remarques';
    const rows = parts.map(p => {
      const unitWeight = (p.weight || 0) * p.length / 1000; // kg
      const totalWeight = unitWeight * p.quantity;
      return `${p.name},${p.type},${p.profileType},${p.profileSize},${p.length},${p.material},${p.quantity},${p.startCut?.angle || ''},${p.endCut?.angle || ''},${p.holes.length},${p.grugeages.length},${unitWeight.toFixed(2)},${totalWeight.toFixed(2)},${p.remarks || ''}`;
    });
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parts_list_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1); // Skip header

      const newParts = dataLines.map((line, index) => {
        const [name, type, profileType, profileSize, length, material, quantity] = line.split(',');
        const dimensions = getProfileDimensions(profileType, profileSize);

        return {
          id: (parts.length + index + 1).toString(),
          name: name || `Pièce ${parts.length + index + 1}`,
          type: type || 'PROFILE',
          profileType: profileType || 'IPE',
          profileSize: profileSize || '200',
          length: parseFloat(length) || 3000,
          material: material || 'S355',
          quantity: parseInt(quantity) || 1,
          holes: [],
          grugeages: [],
          remarks: '',
          ...dimensions
        };
      });

      setParts([...parts, ...newParts]);
    };
    reader.readAsText(file);
  };

  const calculateTotalWeight = () => {
    return parts.reduce((total, p) => {
      const unitWeight = (p.weight || 0) * p.length / 1000; // kg
      return total + (unitWeight * p.quantity);
    }, 0);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🏗️ Part Builder Avancé - Gestion complète des pièces
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onComplete?.(parts)} style={{ ...buttonStyle, backgroundColor: '#10b981' }}>
            ✅ Valider ({parts.length} pièces)
          </button>
          <button onClick={onCancel} style={{ ...buttonStyle, backgroundColor: '#ef4444' }}>
            ✕ Annuler
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        <button onClick={addRow} style={{ ...buttonStyle, backgroundColor: '#10b981' }}>
          ➕ Nouvelle ligne
        </button>
        <button
          onClick={duplicateSelected}
          disabled={selectedRows.size === 0}
          style={{
            ...buttonStyle,
            backgroundColor: selectedRows.size === 0 ? '#64748b' : '#f59e0b',
            cursor: selectedRows.size === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          📋 Dupliquer ({selectedRows.size})
        </button>
        <button
          onClick={deleteSelected}
          disabled={selectedRows.size === 0}
          style={{
            ...buttonStyle,
            backgroundColor: selectedRows.size === 0 ? '#64748b' : '#ef4444',
            cursor: selectedRows.size === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          🗑️ Supprimer ({selectedRows.size})
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonStyle, backgroundColor: '#8b5cf6' }}>
            📁 Importer CSV
          </button>
          <button onClick={exportToCSV} style={{ ...buttonStyle, backgroundColor: '#06b6d4' }}>
            💾 Exporter CSV
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={importFromCSV}
          style={{ display: 'none' }}
        />
      </div>

      {/* Info bar */}
      <div style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        fontSize: '0.875rem',
        color: '#94a3b8',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>💡 Double-cliquez sur une cellule pour éditer. Les dimensions sont automatiques selon le profilé choisi.</span>
        <span>Poids total estimé: <strong>{calculateTotalWeight().toFixed(2)} kg</strong></span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>
                <input
                  type="checkbox"
                  checked={selectedRows.size === parts.length && parts.length > 0}
                  onChange={() => {
                    if (selectedRows.size === parts.length) {
                      setSelectedRows(new Set());
                    } else {
                      setSelectedRows(new Set(parts.map(p => p.id)));
                    }
                  }}
                />
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>#</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Nom</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Type profilé</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Taille</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Long. (mm)</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Matériau</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Qté</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Coupe début</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Coupe fin</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Trous</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Grugeages</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Poids (kg/m)</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Viewer 3D</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, index) => (<>
              <tr
                key={part.id}
                style={{
                  backgroundColor: selectedRows.has(part.id) ? '#334155' : (index % 2 === 0 ? '#0f172a' : '#1e293b'),
                  transition: 'background-color 0.2s'
                }}
              >
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(part.id)}
                    onChange={() => {
                      const newSelection = new Set(selectedRows);
                      if (newSelection.has(part.id)) {
                        newSelection.delete(part.id);
                      } else {
                        newSelection.add(part.id);
                      }
                      setSelectedRows(newSelection);
                    }}
                  />
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>{index + 1}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => setParts(parts.map(p => p.id === part.id ? { ...p, name: e.target.value } : p))}
                    style={{
                      width: '100%',
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  />
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <select
                    value={part.profileType}
                    onChange={(e) => updateProfileDimensions(part.id, e.target.value, part.profileSize)}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  >
                    {Object.keys(PROFILE_LIBRARY).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <select
                    value={part.profileSize}
                    onChange={(e) => updateProfileDimensions(part.id, part.profileType, e.target.value)}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  >
                    {PROFILE_LIBRARY[part.profileType as keyof typeof PROFILE_LIBRARY]?.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <input
                    type="number"
                    value={part.length}
                    onChange={(e) => setParts(parts.map(p => p.id === part.id ? { ...p, length: parseFloat(e.target.value) || 0 } : p))}
                    style={{
                      width: '80px',
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  />
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <select
                    value={part.material}
                    onChange={(e) => setParts(parts.map(p => p.id === part.id ? { ...p, material: e.target.value } : p))}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  >
                    <option value="S235">S235</option>
                    <option value="S275">S275</option>
                    <option value="S355">S355</option>
                    <option value="S420">S420</option>
                    <option value="S460">S460</option>
                  </select>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <input
                    type="number"
                    value={part.quantity}
                    min="1"
                    onChange={(e) => setParts(parts.map(p => p.id === part.id ? { ...p, quantity: parseInt(e.target.value) || 1 } : p))}
                    style={{
                      width: '50px',
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  />
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <input
                    type="number"
                    value={part.startCut?.angle || ''}
                    placeholder="90°"
                    onChange={(e) => setCut(part.id, 'start', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '60px',
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  />
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <input
                    type="number"
                    value={part.endCut?.angle || ''}
                    placeholder="90°"
                    onChange={(e) => setCut(part.id, 'end', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '60px',
                      padding: '0.25rem',
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      borderRadius: '0.25rem'
                    }}
                  />
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{part.holes.length}</span>
                    <button
                      onClick={() => setShowHoleConfigurator(part.id)}
                      style={{
                        padding: '0.125rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      ⚙️
                    </button>
                  </div>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{part.grugeages.length}</span>
                    <button
                      onClick={() => addGrugeage(part.id, 'debut')}
                      style={{
                        padding: '0.125rem 0.25rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  {part.weight?.toFixed(2) || '-'}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <button
                    onClick={() => setShow3DViewer(show3DViewer === part.id ? null : part.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: show3DViewer === part.id ? '#10b981' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {show3DViewer === part.id ? '🔆 Masquer' : '🎬 Voir 3D'}
                  </button>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #334155' }}>
                  <button
                    onClick={() => {
                      const unitWeight = (part.weight || 0) * part.length / 1000;
                      const totalWeight = unitWeight * part.quantity;
                      alert(`
                        📊 Détails de ${part.name}:

                        Profilé: ${part.profileType} ${part.profileSize}
                        Dimensions: H=${part.height}mm x L=${part.width}mm
                        Âme: ${part.webThickness}mm, Ailes: ${part.flangeThickness}mm

                        Longueur: ${part.length}mm
                        Poids unitaire: ${unitWeight.toFixed(2)}kg
                        Poids total: ${totalWeight.toFixed(2)}kg

                        Features:
                        - Trous: ${part.holes.length}
                        - Grugeages: ${part.grugeages.length}
                        - Coupe début: ${part.startCut?.angle || 90}°
                        - Coupe fin: ${part.endCut?.angle || 90}°
                      `);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#64748b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Détails
                  </button>
                </td>
              </tr>
              {show3DViewer === part.id && (
                <tr key={`viewer-${part.id}`}>
                  <td colSpan={15} style={{
                    padding: '1rem',
                    backgroundColor: '#0a0a0a',
                    borderBottom: '2px solid #334155'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '2rem'
                    }}>
                      <Part3DViewer
                        profileType={part.profileType}
                        profileSize={part.profileSize}
                        length={part.length}
                        holes={part.holes}
                        grugeages={part.grugeages}
                        startCut={part.startCut}
                        endCut={part.endCut}
                        dimensions={{
                          height: part.height,
                          width: part.width,
                          webThickness: part.webThickness,
                          flangeThickness: part.flangeThickness
                        }}
                      />
                      <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        <h4 style={{ marginBottom: '0.5rem', color: '#e2e8f0' }}>🎬 Visualisation 3D</h4>
                        <p>🌐 Survoler pour rotation automatique</p>
                        <p>🔄 Clic + glisser pour orbiter</p>
                        <p>🔍 Molette pour zoomer</p>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                          Profilé: {part.profileType} {part.profileSize} - L={part.length}mm
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1rem 1.5rem',
        backgroundColor: '#1e293b',
        borderTop: '2px solid #475569',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>{parts.length}</strong> pièces |
          <strong> {parts.reduce((sum, p) => sum + p.quantity, 0)}</strong> unités totales |
          Poids total: <strong>{calculateTotalWeight().toFixed(2)} kg</strong>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Les dimensions et poids sont automatiquement récupérés depuis la bibliothèque de profilés
        </div>
      </div>

      {/* Hole Configurator Modal */}
      {showHoleConfigurator && (
        <HoleConfiguratorSimple
          profileType={parts.find(p => p.id === showHoleConfigurator)?.profileType || 'IPE'}
          profileSize={parts.find(p => p.id === showHoleConfigurator)?.profileSize || '200'}
          profileLength={parts.find(p => p.id === showHoleConfigurator)?.length || 3000}
          onSave={(holes) => {
            setParts(parts.map(p =>
              p.id === showHoleConfigurator
                ? { ...p, holes: holes as HoleDefinition[] }
                : p
            ));
            setShowHoleConfigurator(null);
          }}
          onClose={() => setShowHoleConfigurator(null)}
        />
      )}
    </div>
  );
};

export default PartBuilderAdvanced;