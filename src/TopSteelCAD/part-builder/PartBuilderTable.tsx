import React, { useState, useRef } from 'react';
import { Vector3 } from './utils/Vector3';

interface Hole {
  diameter: number;
  position: Vector3;
  pattern?: string;
}

interface Notch {
  type: 'RECTANGULAR' | 'CIRCULAR' | 'V_SHAPE' | 'U_SHAPE';
  width: number;
  height: number;
  depth: number;
  position: Vector3;
}

interface PartRow {
  id: string;
  name: string;
  profileType: string;
  profileSize: string;
  length: number;
  material: string;
  quantity: number;
  holes: Hole[];
  notches: Notch[];
  weight?: number;
  notes?: string;
}

const PROFILE_TYPES = ['IPE', 'HEA', 'HEB', 'UPE', 'UAP', 'L', 'RHS', 'CHS', 'T', 'PLATE'];
const PROFILE_SIZES = {
  IPE: ['100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400', '450', '500'],
  HEA: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300'],
  HEB: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300'],
  UPE: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300'],
  UAP: ['80', '100', '130', '150', '175', '200', '220', '250', '300'],
  L: ['20x20x3', '30x30x3', '40x40x4', '50x50x5', '60x60x6', '70x70x7', '80x80x8', '90x90x9', '100x100x10'],
  RHS: ['40x20x2', '50x30x3', '60x40x3', '80x40x3', '100x50x4', '120x60x4', '140x80x5', '150x100x5'],
  CHS: ['21.3x2', '26.9x2', '33.7x2.6', '42.4x2.6', '48.3x2.9', '60.3x2.9', '76.1x2.9', '88.9x3.2'],
  T: ['30x30x3', '40x40x4', '50x50x5', '60x60x6', '70x70x7', '80x80x8'],
  PLATE: ['5', '6', '8', '10', '12', '15', '20', '25', '30', '40', '50']
};

const MATERIALS = ['S235', 'S275', 'S355', 'S420', 'S460'];

export const PartBuilderTable: React.FC = () => {
  const [parts, setParts] = useState<PartRow[]>([
    {
      id: '1',
      name: 'Poutre principale',
      profileType: 'IPE',
      profileSize: '200',
      length: 6000,
      material: 'S355',
      quantity: 1,
      holes: [],
      notches: [],
      notes: ''
    }
  ]);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addRow = () => {
    const newId = Date.now().toString();
    setParts([...parts, {
      id: newId,
      name: `Pièce ${parts.length + 1}`,
      profileType: 'IPE',
      profileSize: '200',
      length: 3000,
      material: 'S355',
      quantity: 1,
      holes: [],
      notches: [],
      notes: ''
    }]);
  };

  const deleteSelected = () => {
    setParts(parts.filter(p => !selectedRows.has(p.id)));
    setSelectedRows(new Set());
  };

  const duplicateSelected = () => {
    const toDuplicate = parts.filter(p => selectedRows.has(p.id));
    const newParts = toDuplicate.map(p => ({
      ...p,
      id: Date.now().toString() + Math.random(),
      name: p.name + ' (copie)'
    }));
    setParts([...parts, ...newParts]);
    setSelectedRows(new Set());
  };

  const updatePart = (id: string, field: keyof PartRow, value: any) => {
    setParts(parts.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Type', 'Taille', 'Longueur', 'Matériau', 'Quantité', 'Trous', 'Encoches', 'Notes'];
    const rows = parts.map(p => [
      p.name,
      p.profileType,
      p.profileSize,
      p.length,
      p.material,
      p.quantity,
      p.holes.length,
      p.notches.length,
      p.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      const newParts = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          return {
            id: (Date.now() + index).toString(),
            name: values[0] || `Pièce ${parts.length + index + 1}`,
            profileType: values[1] || 'IPE',
            profileSize: values[2] || '200',
            length: parseInt(values[3]) || 3000,
            material: values[4] || 'S355',
            quantity: parseInt(values[5]) || 1,
            holes: [],
            notches: [],
            notes: values[8] || ''
          };
        });

      setParts([...parts, ...newParts]);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const addHole = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const diameter = parseFloat(prompt('Diamètre du trou (mm):', '20') || '20');
    const x = parseFloat(prompt('Position X (mm):', '100') || '100');
    const pattern = prompt('Pattern (SINGLE, LINE, GRID):', 'SINGLE') || 'SINGLE';

    const newHole: Hole = {
      diameter,
      position: new Vector3(x, 0, 0),
      pattern
    };

    updatePart(partId, 'holes', [...part.holes, newHole]);
  };

  const addNotch = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const type = (prompt('Type (RECTANGULAR, CIRCULAR, V_SHAPE, U_SHAPE):', 'RECTANGULAR') || 'RECTANGULAR') as Notch['type'];
    const width = parseFloat(prompt('Largeur (mm):', '50') || '50');
    const height = parseFloat(prompt('Hauteur (mm):', '30') || '30');
    const depth = parseFloat(prompt('Profondeur (mm):', '10') || '10');

    const newNotch: Notch = {
      type,
      width,
      height,
      depth,
      position: new Vector3(0, 0, 0)
    };

    updatePart(partId, 'notches', [...part.notches, newNotch]);
  };

  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    },
    toolbar: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap' as const
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    buttonSecondary: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    buttonDanger: {
      padding: '8px 16px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    th: {
      backgroundColor: '#f8f9fa',
      padding: '12px',
      textAlign: 'left' as const,
      borderBottom: '2px solid #dee2e6',
      fontSize: '14px',
      fontWeight: '600' as const
    },
    td: {
      padding: '10px 12px',
      borderBottom: '1px solid #dee2e6',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px'
    },
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '12px',
      fontSize: '12px',
      marginRight: '4px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>🏗️ Part Builder - Gestion des pièces</h2>
        <div>
          Total: {parts.length} pièces |
          Quantité totale: {parts.reduce((sum, p) => sum + p.quantity, 0)} unités
        </div>
      </div>

      <div style={styles.toolbar}>
        <button onClick={addRow} style={{ ...styles.button, backgroundColor: '#28a745' }}>
          ➕ Nouvelle ligne
        </button>
        <button
          onClick={duplicateSelected}
          disabled={selectedRows.size === 0}
          style={styles.buttonSecondary}
        >
          📋 Dupliquer ({selectedRows.size})
        </button>
        <button
          onClick={deleteSelected}
          disabled={selectedRows.size === 0}
          style={styles.buttonDanger}
        >
          🗑️ Supprimer ({selectedRows.size})
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={() => fileInputRef.current?.click()} style={styles.buttonSecondary}>
            📁 Importer CSV
          </button>
          <button onClick={exportToCSV} style={styles.button}>
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

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
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
              <th style={styles.th}>#</th>
              <th style={styles.th}>Nom</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Taille</th>
              <th style={styles.th}>Longueur (mm)</th>
              <th style={styles.th}>Matériau</th>
              <th style={styles.th}>Qté</th>
              <th style={styles.th}>Trous</th>
              <th style={styles.th}>Encoches</th>
              <th style={styles.th}>Notes</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, index) => (
              <tr key={part.id} style={{ backgroundColor: selectedRows.has(part.id) ? '#f0f8ff' : 'white' }}>
                <td style={styles.td}>
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
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                    style={styles.input}
                  />
                </td>
                <td style={styles.td}>
                  <select
                    value={part.profileType}
                    onChange={(e) => updatePart(part.id, 'profileType', e.target.value)}
                    style={styles.select}
                  >
                    {PROFILE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>
                  <select
                    value={part.profileSize}
                    onChange={(e) => updatePart(part.id, 'profileSize', e.target.value)}
                    style={styles.select}
                  >
                    {PROFILE_SIZES[part.profileType as keyof typeof PROFILE_SIZES]?.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    value={part.length}
                    onChange={(e) => updatePart(part.id, 'length', parseInt(e.target.value) || 0)}
                    style={{ ...styles.input, width: '80px' }}
                  />
                </td>
                <td style={styles.td}>
                  <select
                    value={part.material}
                    onChange={(e) => updatePart(part.id, 'material', e.target.value)}
                    style={styles.select}
                  >
                    {MATERIALS.map(mat => (
                      <option key={mat} value={mat}>{mat}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    value={part.quantity}
                    min="1"
                    onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                    style={{ ...styles.input, width: '50px' }}
                  />
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={styles.badge}>{part.holes.length}</span>
                    <button
                      onClick={() => addHole(part.id)}
                      style={{ ...styles.button, padding: '2px 8px', fontSize: '12px' }}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ ...styles.badge, backgroundColor: '#ffc107' }}>{part.notches.length}</span>
                    <button
                      onClick={() => addNotch(part.id)}
                      style={{ ...styles.button, padding: '2px 8px', fontSize: '12px', backgroundColor: '#ffc107' }}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td style={styles.td}>
                  <input
                    type="text"
                    value={part.notes || ''}
                    onChange={(e) => updatePart(part.id, 'notes', e.target.value)}
                    placeholder="Notes..."
                    style={styles.input}
                  />
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => {
                      const details = `
📊 ${part.name}
Type: ${part.profileType} ${part.profileSize}
Longueur: ${part.length}mm
Matériau: ${part.material}
Quantité: ${part.quantity}
Trous: ${part.holes.length}
Encoches: ${part.notches.length}
${part.notes ? `Notes: ${part.notes}` : ''}
                      `;
                      alert(details);
                    }}
                    style={{ ...styles.button, padding: '4px 8px', fontSize: '12px' }}
                  >
                    ℹ️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '14px', color: '#666' }}>
        💡 <strong>Conseils:</strong> Double-cliquez pour éditer | Utilisez Tab pour naviguer |
        Importez un CSV pour charger plusieurs pièces |
        Cliquez sur + pour ajouter des trous ou encoches
      </div>
    </div>
  );
};

export default PartBuilderTable;